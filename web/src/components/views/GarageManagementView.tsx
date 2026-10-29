import React, { useEffect, useState, useMemo, useRef } from 'react';
import { Branch, Mechanic, Invitation, managementApi, request } from '../../services/managementApi';
import {
  Building2,
  Users,
  UserCheck,
  Plus,
  Search,
  MapPin,
  Phone,
  Truck,
  Edit3,
  Power,
  Copy,
  Check,
  Navigation,
  AlertTriangle,
  Star,
  X,
  RefreshCw,
  ExternalLink,
  Shield,
  Waves,
  Save,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel, GarageDrawer, GarageError } from '../garage/GarageUI';

interface GarageManagementViewProps {
  onShowToast?: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone: 'primary' | 'danger' | 'warning';
  action: () => Promise<void>;
}

interface AddressSuggestion {
  id: string | number;
  label: string;
  sublabel?: string;
  lat: number;
  lng: number;
}

/**
 * Tra cứu địa chỉ và tọa độ GPS qua dịch vụ Geocoding mở (Photon / OpenStreetMap)
 * Hỗ trợ CORS trực tiếp từ trình duyệt, không bị chặn ERR_CONNECTION_REFUSED
 */
async function searchAddressGeocoding(queryText: string): Promise<AddressSuggestion[]> {
  const q = queryText.trim();
  if (q.length < 2) return [];

  // Tầng 1: Tra cứu qua Photon Komoot (OpenStreetMap Geocoding Engine có CORS mở)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=10.7769&lon=106.7009&limit=5`;
    const res = await fetch(photonUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.features) && data.features.length > 0) {
        return data.features.map((f: any, idx: number) => {
          const p = f.properties || {};
          const coords = f.geometry?.coordinates || [106.7, 10.7];
          const lng = Number(Number(coords[0]).toFixed(6));
          const lat = Number(Number(coords[1]).toFixed(6));

          const nameParts: string[] = [];
          if (p.housenumber && p.street) nameParts.push(`${p.housenumber} ${p.street}`);
          else if (p.name) nameParts.push(p.name);
          else if (p.street) nameParts.push(p.street);

          const contextParts: string[] = [];
          if (p.locality) contextParts.push(p.locality);
          if (p.district) contextParts.push(p.district.includes('Quận') || p.district.includes('Huyện') ? p.district : `Quận/Huyện ${p.district}`);
          if (p.city) contextParts.push(p.city);
          if (p.state && p.state !== p.city) contextParts.push(p.state);

          const mainTitle = nameParts.length > 0 ? nameParts.join(', ') : (p.name || q);
          const fullAddress = [mainTitle, ...contextParts].filter(Boolean).join(', ');

          return {
            id: p.osm_id || idx,
            label: fullAddress,
            sublabel: contextParts.join(', '),
            lat,
            lng
          };
        });
      }
    }
  } catch {
    // Bỏ qua lỗi để thử fallback
  }

  // Tầng 2: Fallback sang Open-Meteo Geocoding API nếu Photon không phản hồi
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const meteoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=vi&format=json`;
    const res = await fetch(meteoUrl, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.results) && data.results.length > 0) {
        return data.results.map((r: any) => ({
          id: r.id,
          label: [r.name, r.admin1, r.country].filter(Boolean).join(', '),
          sublabel: [r.admin2, r.admin1, r.country].filter(Boolean).join(', '),
          lat: Number(Number(r.latitude).toFixed(6)),
          lng: Number(Number(r.longitude).toFixed(6))
        }));
      }
    }
  } catch {
    // Không làm gián đoạn UI
  }

  return [];
}

export function GarageManagementView({ onShowToast }: GarageManagementViewProps) {
  const [drawer, setDrawer] = useState<'branch' | 'invite' | null>(null);
  const [tab, setTab] = useState<'branches' | 'team'>('branches');
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'closed'>('all');
  const [teamStatusFilter, setTeamStatusFilter] = useState<'all' | 'available' | 'busy' | 'offline' | 'disabled'>('all');

  const [branches, setBranches] = useState<Branch[]>([]);
  const [mechanics, setMechanics] = useState<Mechanic[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);

  // Form thêm / sửa chi nhánh
  const [formBranchName, setFormBranchName] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formLat, setFormLat] = useState<number | string>('');
  const [formLng, setFormLng] = useState<number | string>('');
  const [formPhone, setFormPhone] = useState('');
  const [formVehicles, setFormVehicles] = useState('');
  const [gettingLocation, setGettingLocation] = useState(false);

  // Tự động gợi ý địa chỉ & Geocoding bên thứ 3
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddress, setIsSearchingAddress] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFromSuggestion, setSelectedFromSuggestion] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Modal xác nhận thao tác nhạy cảm
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Xác nhận',
    tone: 'primary',
    action: async () => {}
  });

  // Local Toast notification
  const [localToast, setLocalToast] = useState<{ title: string; msg: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);

  const notify = (title: string, msg: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (onShowToast) {
      onShowToast(title, msg, type);
    } else {
      setLocalToast({ title, msg, type });
      setTimeout(() => setLocalToast(null), 4000);
    }
  };

  async function load() {
    setError('');
    try {
      const [b, m] = await Promise.all([managementApi.branches(), managementApi.mechanics()]);
      setBranches(b || []);
      setMechanics(m || []);
    } catch (e) {
      const msg = (e as Error).message || 'Không thể tải dữ liệu chi nhánh và đội thợ';
      setError(msg);
      notify('Lỗi tải dữ liệu', msg, 'error');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function mutate(path: string, method: string, body: unknown, successMsg?: string) {
    setBusy(true);
    setError('');
    try {
      await request(path, method, body);
      await load();
      if (successMsg) {
        notify('Thành công', successMsg, 'success');
      }
      return true;
    } catch (e) {
      const msg = (e as Error).message || 'Thao tác không thành công';
      setError(msg);
      notify('Lỗi thao tác', msg, 'error');
      return false;
    } finally {
      setBusy(false);
    }
  }

  // Khởi tạo form khi mở drawer sửa chi nhánh
  useEffect(() => {
    if (editing) {
      setFormBranchName(editing.branchName || '');
      setFormAddress(editing.address || '');
      setFormLat(editing.latitude ?? '');
      setFormLng(editing.longitude ?? '');
      setFormPhone(editing.phoneNumber || '');
      setFormVehicles(editing.rescueVehicles || '');
    } else {
      setFormBranchName('');
      setFormAddress('');
      setFormLat('');
      setFormLng('');
      setFormPhone('');
      setFormVehicles('1 Xe tải cứu hộ + 2 Xe máy chuyên dụng');
    }
    setAddressSuggestions([]);
    setShowSuggestions(false);
    setSelectedFromSuggestion(false);
  }, [editing, drawer]);

  // Click outside listener để đóng dropdown gợi ý địa chỉ
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tự động gọi API Geocoding khi người dùng gõ địa chỉ (Debounce 400ms)
  useEffect(() => {
    if (drawer !== 'branch') return;
    if (selectedFromSuggestion) {
      setSelectedFromSuggestion(false);
      return;
    }

    const trimmed = formAddress.trim();
    if (trimmed.length < 2) {
      setAddressSuggestions([]);
      setIsSearchingAddress(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingAddress(true);
      try {
        const results = await searchAddressGeocoding(trimmed);
        setAddressSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddress(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formAddress, drawer]);

  // Khi người dùng bấm chọn 1 địa chỉ gợi ý từ Dropdown
  const handleSelectAddressSuggestion = (item: AddressSuggestion) => {
    setSelectedFromSuggestion(true);
    setFormAddress(item.label);

    // Tự động điền vĩ độ và kinh độ GPS
    setFormLat(item.lat);
    setFormLng(item.lng);

    setShowSuggestions(false);
    setAddressSuggestions([]);

    notify('Đã lấy tọa độ GPS', `Tọa độ: ${item.lat}, ${item.lng} đã được điền tự động!`, 'success');

    // Nếu tên chi nhánh đang trống, tự động gợi ý tên chi nhánh theo tên đường
    if (!formBranchName.trim()) {
      const parts = item.label.split(',');
      const shortRoad = parts[0]?.trim() || '';
      if (shortRoad) {
        setFormBranchName(`Chi nhánh ${shortRoad}`);
      }
    }
  };

  // Lấy vị trí GPS hiện tại của trình duyệt
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      notify('Không hỗ trợ', 'Trình duyệt của bạn không hỗ trợ định vị GPS.', 'warning');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormLat(Number(position.coords.latitude.toFixed(6)));
        setFormLng(Number(position.coords.longitude.toFixed(6)));
        setGettingLocation(false);
        notify('Đã lấy vị trí GPS', 'Tọa độ thực tế đã được điền tự động vào biểu mẫu.', 'success');
      },
      (err) => {
        setGettingLocation(false);
        notify('Lỗi định vị', 'Không thể lấy tọa độ GPS: ' + err.message, 'warning');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Thiết lập tọa độ mẫu khu vực TP.HCM
  const handleSetPresetLocation = (lat: number, lng: number, areaName: string) => {
    setFormLat(lat);
    setFormLng(lng);
    notify('Đã chọn tọa độ mẫu', `Đã áp dụng tọa độ khu vực ${areaName}`, 'info');
  };

  async function handleSaveBranchSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!formBranchName.trim() || !formAddress.trim()) {
      notify('Thiếu thông tin', 'Vui lòng nhập tên chi nhánh và địa chỉ.', 'warning');
      return;
    }

    const latNum = Number(formLat);
    const lngNum = Number(formLng);
    if (isNaN(latNum) || isNaN(lngNum) || latNum < -90 || latNum > 90 || lngNum < -180 || lngNum > 180) {
      notify('Tọa độ không hợp lệ', 'Vui lòng nhập vĩ độ (-90 đến 90) và kinh độ (-180 đến 180) hợp lệ.', 'warning');
      return;
    }

    const payload = {
      branchName: formBranchName.trim(),
      address: formAddress.trim(),
      latitude: latNum,
      longitude: lngNum,
      phoneNumber: formPhone.trim(),
      rescueVehicles: formVehicles.trim()
    };

    const isEditing = Boolean(editing);
    const ok = await mutate(
      isEditing ? `/garages/branches/${editing!.id}` : '/garages/branches',
      isEditing ? 'PUT' : 'POST',
      payload,
      isEditing ? `Đã cập nhật chi nhánh ${payload.branchName}` : `Đã thêm mới chi nhánh ${payload.branchName}`
    );

    if (ok) {
      setEditing(null);
      setDrawer(null);
    }
  }

  // Đổi trạng thái hoạt động của chi nhánh kèm xác nhận
  const handleToggleBranchStatusConfirm = (branch: Branch) => {
    const isCurrentlyOpen = branch.operatingStatus === 'OPEN';
    const nextStatus = isCurrentlyOpen ? 'CLOSED_MAINTENANCE' : 'OPEN';
    const actionLabel = isCurrentlyOpen ? 'Tạm đóng cửa / Bảo trì' : 'Mở cửa đón khách';

    setConfirmModal({
      isOpen: true,
      title: `${actionLabel}: ${branch.branchName}`,
      message: isCurrentlyOpen
        ? `Chi nhánh này sẽ tạm ngừng tiếp nhận đơn cứu hộ ngập lụt từ người dân trong khu vực. Bạn có chắc muốn tạm đóng cửa?`
        : `Chi nhánh sẽ sẵn sàng trực chiến và hiển thị trên bản đồ cứu hộ ngập lụt. Kích hoạt mở cửa ngay?`,
      confirmLabel: actionLabel,
      tone: isCurrentlyOpen ? 'warning' : 'primary',
      action: async () => {
        await mutate(
          `/garages/branches/${branch.id}/status?status=${nextStatus}`,
          'PATCH',
          undefined,
          `Đã chuyển trạng thái chi nhánh sang ${isCurrentlyOpen ? 'Đóng cửa / Bảo trì' : 'Đang mở cửa'}`
        );
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Mời thợ cứu hộ mới
  async function handleInviteSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const email = String(data.get('email') || '').trim();
    const branchId = Number(data.get('branchId'));

    if (!email || !branchId) {
      notify('Thiếu thông tin', 'Vui lòng nhập email và chọn chi nhánh cho thợ.', 'warning');
      return;
    }

    setBusy(true);
    setError('');
    setInvitation(null);
    setCopiedCode(false);

    try {
      const inv = await managementApi.invite(false, email, branchId);
      setInvitation(inv);
      notify('Đã tạo mã mời', `Mã kích hoạt cho thợ ${email} đã sẵn sàng.`, 'success');
    } catch (e) {
      const msg = (e as Error).message || 'Không thể tạo mã mời thợ';
      setError(msg);
      notify('Lỗi tạo lời mời', msg, 'error');
    } finally {
      setBusy(false);
    }
  }

  // Sao chép mã mời vào Clipboard
  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => {
      setCopiedCode(true);
      notify('Đã sao chép mã', `Mã ${code} đã được lưu vào bộ nhớ tạm.`, 'info');
      setTimeout(() => setCopiedCode(false), 3000);
    });
  };

  // Lưu phân bổ chi nhánh & ca làm cho thợ
  async function handleAllocateMechanic(mechanic: Mechanic, branchId: number, shiftName: string) {
    if (!branchId) {
      notify('Yêu cầu chi nhánh', 'Vui lòng chọn chi nhánh làm việc cho thợ.', 'warning');
      return;
    }
    await mutate(
      `/garages/mechanics/${mechanic.id}/allocate`,
      'PATCH',
      { branchId, shiftName },
      `Đã cập nhật ca làm và chi nhánh cho thợ ${mechanic.fullName}`
    );
  }

  // Bật/Tắt quyền làm việc của thợ kèm xác nhận
  const handleToggleMechanicActiveConfirm = (mechanic: Mechanic) => {
    const nextActive = !mechanic.active;
    const actionLabel = nextActive ? 'Mở lại quyền làm việc' : 'Khóa quyền làm việc';

    setConfirmModal({
      isOpen: true,
      title: `${actionLabel}: ${mechanic.fullName}`,
      message: nextActive
        ? `Thợ ${mechanic.fullName} (${mechanic.email}) sẽ được phép đăng nhập ứng dụng Mobile và nhận cuốc cứu hộ.`
        : `Thợ ${mechanic.fullName} (${mechanic.email}) sẽ bị ngừng cấp quyền nhận đơn cứu hộ ngay lập tức. Bạn có chắc muốn khóa quyền làm việc?`,
      confirmLabel: actionLabel,
      tone: nextActive ? 'primary' : 'danger',
      action: async () => {
        await mutate(
          `/garages/mechanics/${mechanic.id}/status`,
          'PATCH',
          { active: nextActive },
          nextActive
            ? `Đã mở lại quyền làm việc cho thợ ${mechanic.fullName}`
            : `Đã khóa quyền làm việc của thợ ${mechanic.fullName}`
        );
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Lọc chi nhánh
  const filteredBranches = useMemo(() => {
    return branches.filter((b) => {
      if (statusFilter === 'open' && b.operatingStatus !== 'OPEN') return false;
      if (statusFilter === 'closed' && b.operatingStatus !== 'CLOSED_MAINTENANCE') return false;
      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchName = b.branchName.toLowerCase().includes(q);
        const matchAddr = b.address.toLowerCase().includes(q);
        const matchPhone = b.phoneNumber?.includes(q);
        const matchVehicles = b.rescueVehicles?.toLowerCase().includes(q);
        if (!matchName && !matchAddr && !matchPhone && !matchVehicles) return false;
      }
      return true;
    });
  }, [branches, statusFilter, query]);

  // Lọc đội thợ
  const filteredMechanics = useMemo(() => {
    return mechanics.filter((m) => {
      if (teamStatusFilter === 'available' && (!m.active || m.workingStatus !== 'AVAILABLE')) return false;
      if (teamStatusFilter === 'busy' && (!m.active || m.workingStatus !== 'BUSY')) return false;
      if (teamStatusFilter === 'offline' && (!m.active || m.workingStatus !== 'AVAILABLE' || m.workingStatus !== 'BUSY')) return false;
      if (teamStatusFilter === 'disabled' && m.active) return false;

      if (query.trim()) {
        const q = query.toLowerCase().trim();
        const matchName = m.fullName.toLowerCase().includes(q);
        const matchEmail = m.email.toLowerCase().includes(q);
        const matchPhone = m.phone?.includes(q);
        const matchSpeciality = m.speciality?.toLowerCase().includes(q);
        const matchBranch = m.branchName?.toLowerCase().includes(q);
        if (!matchName && !matchEmail && !matchPhone && !matchSpeciality && !matchBranch) return false;
      }
      return true;
    });
  }, [mechanics, teamStatusFilter, query]);

  // Thống kê nhanh
  const openBranchesCount = useMemo(() => branches.filter((b) => b.operatingStatus === 'OPEN').length, [branches]);
  const availableMechanicsCount = useMemo(() => mechanics.filter((m) => m.active && m.workingStatus === 'AVAILABLE').length, [mechanics]);

  return (
    <section className="garage-portal w-full flex flex-col gap-5 p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Toast thông báo nổi bộ nếu không có prop ngoài */}
      {localToast && (
        <div
          role="status"
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg border flex items-center gap-3 animate-fade-in text-sm font-medium ${
            localToast.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : localToast.type === 'error'
                ? 'bg-red-50 border-red-300 text-red-900'
                : localToast.type === 'warning'
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-blue-50 border-blue-300 text-blue-900'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">
            {localToast.type === 'success' ? 'check_circle' : localToast.type === 'error' ? 'error' : 'info'}
          </span>
          <div>
            <strong className="block font-bold">{localToast.title}</strong>
            <span>{localToast.msg}</span>
          </div>
          <button onClick={() => setLocalToast(null)} className="ml-2 text-current opacity-70 hover:opacity-100 cursor-pointer">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Header Điều hành */}
      <GarageHeading
        title="Chi nhánh & Đội ngũ cứu hộ"
        description="Quản lý các cơ sở trực chiến thực địa, mời thợ cứu hộ chuyên môn và phân ca trực bão ngập lụt."
        action={
          <div className="flex items-center gap-2 flex-wrap">
            <button
              className="garage-button px-3 py-2 rounded-lg border border-surface-container bg-white hover:bg-surface-container-low text-on-surface font-label-md flex items-center gap-1.5 transition cursor-pointer shadow-xs disabled:opacity-50"
              onClick={() => {
                setInvitation(null);
                setDrawer('invite');
              }}
              disabled={!branches.length}
              title={!branches.length ? 'Hãy thêm ít nhất một chi nhánh trước khi mời thợ' : 'Tạo mã mời cho thợ'}
            >
              <Users size={16} className="text-primary" />
              <span>Mời thợ cứu hộ</span>
            </button>
            <button
              style={{
                backgroundColor: '#d65322',
                color: '#ffffff',
                borderColor: '#d65322'
              }}
              className="px-4 py-2 rounded-lg font-label-md font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-90"
              onClick={() => {
                setEditing(null);
                setDrawer('branch');
              }}
            >
              <Plus size={16} />
              <span>Thêm chi nhánh</span>
            </button>
            <button
              onClick={() => void load()}
              disabled={busy}
              className="p-2 rounded-lg border border-surface-container bg-white hover:bg-surface-container-low text-secondary transition cursor-pointer"
              title="Tải lại dữ liệu từ máy chủ"
            >
              <RefreshCw size={16} className={busy ? 'animate-spin text-primary' : ''} />
            </button>
          </div>
        }
      />

      {/* Lỗi hiển thị nếu có */}
      <GarageError message={error} retry={() => void load()} />

      {/* Stat Cards Tổng quan */}
      <div className="garage-stat-grid three grid grid-cols-1 md:grid-cols-3 gap-4">
        <GarageStat
          label="Chi nhánh trực chiến"
          value={openBranchesCount}
          detail={`${branches.length} cơ sở trong toàn mạng lưới`}
          icon={<Building2 size={18} />}
          accent="orange"
        />
        <GarageStat
          label="Đội ngũ thợ cứu hộ"
          value={mechanics.length}
          detail={`${mechanics.filter((m) => m.active).length} tài khoản đang được cấp quyền`}
          icon={<Users size={18} />}
          accent="blue"
        />
        <GarageStat
          label="Sẵn sàng nhận đơn ngay"
          value={availableMechanicsCount}
          detail="Thợ đang Online, sẵn sàng điều phối cứu hộ"
          icon={<UserCheck size={18} />}
          accent="teal"
        />
      </div>

      {/* Toolbar Tìm kiếm & Chuyển Tab */}
      <div className="garage-toolbar flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest p-3 rounded-xl border border-surface-container shadow-xs">
        {/* Tab Selector */}
        <div className="garage-tabs flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
          <button
            className={`px-3 py-1.5 rounded-md font-label-md font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'branches'
                ? 'bg-white text-on-surface shadow-xs text-primary'
                : 'text-secondary hover:text-on-surface'
            }`}
            onClick={() => setTab('branches')}
          >
            <Building2 size={16} />
            <span>Chi nhánh</span>
            <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded-full text-xs font-mono font-bold">
              {branches.length}
            </span>
          </button>
          <button
            className={`px-3 py-1.5 rounded-md font-label-md font-bold flex items-center gap-1.5 transition cursor-pointer ${
              tab === 'team'
                ? 'bg-white text-on-surface shadow-xs text-primary'
                : 'text-secondary hover:text-on-surface'
            }`}
            onClick={() => setTab('team')}
          >
            <Users size={16} />
            <span>Đội thợ</span>
            <span className="px-1.5 py-0.2 bg-primary/10 text-primary rounded-full text-xs font-mono font-bold">
              {mechanics.length}
            </span>
          </button>
        </div>

        {/* Search & Sub-Filter Bar */}
        <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              aria-label="Tìm kiếm chi nhánh hoặc thợ"
              className="w-full h-9 pl-9 pr-8 text-body-sm bg-surface-container-low rounded-lg border-0 text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/40"
              placeholder={tab === 'branches' ? 'Tìm tên, địa chỉ chi nhánh...' : 'Tìm tên thợ, email, SĐT, chuyên môn...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Sub-Filters */}
          {tab === 'branches' ? (
            <select
              aria-label="Lọc trạng thái chi nhánh"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-9 px-2 text-xs bg-surface-container-low border border-surface-container rounded-lg text-on-surface font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả ({branches.length})</option>
              <option value="open">Đang mở ({branches.filter((b) => b.operatingStatus === 'OPEN').length})</option>
              <option value="closed">Bảo trì ({branches.filter((b) => b.operatingStatus === 'CLOSED_MAINTENANCE').length})</option>
            </select>
          ) : (
            <select
              aria-label="Lọc trạng thái đội thợ"
              value={teamStatusFilter}
              onChange={(e) => setTeamStatusFilter(e.target.value as any)}
              className="h-9 px-2 text-xs bg-surface-container-low border border-surface-container rounded-lg text-on-surface font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả ({mechanics.length})</option>
              <option value="available">Sẵn sàng ({availableMechanicsCount})</option>
              <option value="busy">Đang bận ({mechanics.filter((m) => m.active && m.workingStatus === 'BUSY').length})</option>
              <option value="offline">Nghỉ trực ({mechanics.filter((m) => m.active && m.workingStatus !== 'AVAILABLE' && m.workingStatus !== 'BUSY').length})</option>
              <option value="disabled">Đã khóa ({mechanics.filter((m) => !m.active).length})</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: MẠNG LƯỚI CHI NHÁNH */}
      {tab === 'branches' && (
        <GaragePanel
          title="Mạng lưới chi nhánh & Cứ điểm trực chiến"
          description="Địa chỉ thực địa, phương tiện cứu hộ lội nước và bán kính phục vụ khi xảy ra ngập lụt."
        >
          {filteredBranches.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
              {filteredBranches.map((branch) => {
                const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${branch.latitude},${branch.longitude}`;
                const isOpen = branch.operatingStatus === 'OPEN';

                return (
                  <article
                    key={branch.id}
                    className="bg-white rounded-xl border border-surface-container shadow-xs p-5 flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div>
                      {/* Branch Card Header */}
                      <div className="flex items-start justify-between pb-3 border-b border-surface-container/60 gap-2">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center font-bold shrink-0">
                            <Building2 size={20} />
                          </div>
                          <div>
                            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                              {branch.branchName}
                            </h3>
                            <span className="font-data-mono text-xs text-secondary">
                              Mã trạm: BR-{branch.id}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`font-data-mono text-label-sm px-2.5 py-1 rounded-full font-bold flex items-center gap-1 shrink-0 ${
                            isOpen
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-amber-100 text-amber-900 border border-amber-300'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-600 animate-pulse' : 'bg-amber-600'}`}></span>
                          {isOpen ? 'ĐANG MỞ CỬA' : 'TẠM ĐÓNG / BẢO TRÌ'}
                        </span>
                      </div>

                      {/* Thông tin chi tiết */}
                      <div className="mt-3 space-y-2 text-sm text-secondary">
                        <p className="flex items-start gap-2 text-on-surface font-medium">
                          <MapPin size={16} className="text-primary shrink-0 mt-0.5" />
                          <span>{branch.address}</span>
                        </p>

                        {branch.phoneNumber && (
                          <p className="flex items-center gap-2">
                            <Phone size={16} className="text-secondary shrink-0" />
                            <span>Hotline chi nhánh: <strong className="text-primary font-mono">{branch.phoneNumber}</strong></span>
                          </p>
                        )}

                        {branch.rescueVehicles && (
                          <div className="bg-primary/5 text-primary p-2.5 rounded-lg font-label-sm text-label-sm font-semibold flex items-center gap-2 border border-primary/10">
                            <Truck size={18} className="shrink-0" />
                            <span>Trang bị: {branch.rescueVehicles}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Tọa độ & Action Buttons */}
                    <div className="mt-4 pt-3 border-t border-surface-container/60 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-secondary">
                          {branch.latitude?.toFixed(4)}, {branch.longitude?.toFixed(4)}
                        </span>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-1 rounded-md bg-surface-container-low hover:bg-surface-container-high text-primary font-bold text-xs flex items-center gap-1 transition"
                          title="Mở tọa độ thực tế trên Google Maps"
                        >
                          <ExternalLink size={12} />
                          Google Maps
                        </a>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          disabled={busy}
                          onClick={() => {
                            setEditing(branch);
                            setDrawer('branch');
                          }}
                          className="px-3 py-1.5 rounded-lg border border-surface-container hover:bg-surface-container-low text-on-surface font-label-md font-semibold flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit3 size={14} />
                          Sửa
                        </button>

                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleBranchStatusConfirm(branch)}
                          style={{
                            backgroundColor: isOpen ? '#fef3c7' : '#059669',
                            color: isOpen ? '#92400e' : '#ffffff',
                            borderColor: isOpen ? '#fcd34d' : '#059669'
                          }}
                          className="px-3 py-1.5 rounded-lg font-label-md font-bold flex items-center gap-1 transition cursor-pointer shadow-xs hover:opacity-90"
                        >
                          <Power size={14} />
                          <span>{isOpen ? 'Đóng cửa' : 'Mở cửa'}</span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-secondary">
              <span className="material-symbols-outlined text-[48px] text-secondary/40 mb-2">storefront</span>
              <p className="font-headline-sm font-bold text-on-surface">
                {query ? 'Không tìm thấy chi nhánh phù hợp với từ khóa' : 'Gara của bạn chưa có chi nhánh nào'}
              </p>
              <p className="text-sm mt-1 max-w-md mx-auto">
                {query
                  ? 'Thử xóa bộ lọc tìm kiếm hoặc tìm với tên/địa chỉ khác.'
                  : 'Hãy bấm nút "Thêm chi nhánh" ở góc trên để tạo điểm phục vụ đầu tiên trước khi mời đội thợ.'}
              </p>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-bold text-xs cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </GaragePanel>
      )}

      {/* TAB 2: ĐỘI NGŨ THỢ CỨU HỘ */}
      {tab === 'team' && (
        <GaragePanel
          title="Phân công đội thợ & Trực chiến"
          description="Quản lý thông tin liên lạc, chuyên môn vượt ngập, ca trực và cấp quyền làm việc cho từng thành viên."
        >
          {filteredMechanics.length > 0 ? (
            <div className="divide-y divide-surface-container/60">
              {filteredMechanics.map((mechanic) => {
                const isAvailable = mechanic.active && mechanic.workingStatus === 'AVAILABLE';
                const isBusy = mechanic.active && mechanic.workingStatus === 'BUSY';

                return (
                  <div
                    key={mechanic.id}
                    className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-surface-container-lowest/50 transition"
                  >
                    {/* Thợ Profile Info */}
                    <div className="flex items-start gap-3 min-w-[280px]">
                      <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg shrink-0 shadow-xs">
                        {mechanic.fullName?.charAt(0) || 'T'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-headline-sm font-bold text-on-surface text-base">
                            {mechanic.fullName}
                          </h4>
                          {/* Trạng thái làm việc */}
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-bold font-data-mono flex items-center gap-1 ${
                              !mechanic.active
                                ? 'bg-red-100 text-red-800 border border-red-300'
                                : isAvailable
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : isBusy
                                    ? 'bg-rose-100 text-rose-800 border border-rose-300'
                                    : 'bg-surface-container-high text-secondary'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                !mechanic.active
                                  ? 'bg-red-600'
                                  : isAvailable
                                    ? 'bg-emerald-600 animate-pulse'
                                    : isBusy
                                      ? 'bg-rose-600 animate-ping'
                                      : 'bg-secondary'
                              }`}
                            ></span>
                            {!mechanic.active
                              ? 'ĐÃ KHÓA'
                              : isAvailable
                                ? 'SẴN SÀNG'
                                : isBusy
                                  ? 'ĐANG ĐI CA'
                                  : 'NGHỈ TRỰC'}
                          </span>
                        </div>

                        {/* Email & Phone từ API */}
                        <p className="text-xs text-secondary mt-1 flex items-center gap-3 flex-wrap">
                          <span>{mechanic.email}</span>
                          {mechanic.phone && (
                            <span className="font-mono font-bold text-primary flex items-center gap-1">
                              <Phone size={12} />
                              {mechanic.phone}
                            </span>
                          )}
                        </p>

                        {/* Kỹ năng & Khả năng lội nước */}
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-semibold flex items-center gap-1">
                            <Shield size={12} />
                            {mechanic.speciality || 'Cứu hộ thủy kích & sấy bugi'}
                          </span>
                          {mechanic.hasCrossingCapability && (
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-semibold flex items-center gap-1">
                              <Waves size={12} />
                              Lội nước sâu
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-xs font-semibold flex items-center gap-1">
                            <Star size={12} className="text-amber-500 fill-amber-500" />
                            {mechanic.ratingAvg ? `${mechanic.ratingAvg.toFixed(1)}/5.0` : '5.0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Form Phân bổ Chi nhánh & Ca trực */}
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const data = new FormData(e.currentTarget);
                        void handleAllocateMechanic(
                          mechanic,
                          Number(data.get('branchId')),
                          String(data.get('shiftName') || '').trim()
                        );
                      }}
                      className="flex flex-col sm:flex-row sm:items-center gap-2 flex-wrap lg:justify-end"
                    >
                      <div className="flex items-center gap-2">
                        {/* Dropdown Chi nhánh */}
                        <select
                          name="branchId"
                          required
                          aria-label={`Chi nhánh phân công của ${mechanic.fullName}`}
                          defaultValue={mechanic.branchId ?? ''}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-surface-container rounded-lg text-on-surface font-medium focus:outline-none focus:ring-1 focus:ring-primary min-w-[180px] cursor-pointer"
                        >
                          <option value="">-- Chọn chi nhánh --</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.branchName}
                            </option>
                          ))}
                        </select>

                        {/* Ca làm việc */}
                        <input
                          name="shiftName"
                          aria-label={`Ca làm việc của ${mechanic.fullName}`}
                          placeholder="Ca làm (VD: Ca trực đêm)"
                          defaultValue={mechanic.shiftName ?? ''}
                          className="h-9 px-3 text-xs bg-surface-container-low border border-surface-container rounded-lg text-on-surface focus:outline-none focus:ring-1 focus:ring-primary w-32"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Nút lưu phân công */}
                        <button
                          type="submit"
                          disabled={busy}
                          style={{
                            backgroundColor: '#fff7ed',
                            color: '#c2410c',
                            borderColor: '#fed7aa'
                          }}
                          className="h-9 px-3 rounded-lg font-label-md font-bold flex items-center gap-1 transition cursor-pointer text-xs border hover:opacity-90"
                          title="Lưu chi nhánh và ca làm mới"
                        >
                          <Save size={14} />
                          <span>Lưu ca</span>
                        </button>

                        {/* Nút Khóa / Mở quyền thợ */}
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => handleToggleMechanicActiveConfirm(mechanic)}
                          style={{
                            backgroundColor: mechanic.active ? '#fef2f2' : '#ecfdf5',
                            color: mechanic.active ? '#b91c1c' : '#047857',
                            borderColor: mechanic.active ? '#fecaca' : '#a7f3d0'
                          }}
                          className="h-9 px-3 rounded-lg font-label-md font-bold flex items-center gap-1 transition cursor-pointer text-xs border hover:opacity-90"
                        >
                          {mechanic.active ? <Power size={13} /> : <CheckCircle2 size={13} />}
                          <span>{mechanic.active ? 'Khóa quyền' : 'Mở lại'}</span>
                        </button>
                      </div>
                    </form>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-8 text-center text-secondary">
              <span className="material-symbols-outlined text-[48px] text-secondary/40 mb-2">engineering</span>
              <p className="font-headline-sm font-bold text-on-surface">
                {query ? 'Không tìm thấy thợ cứu hộ phù hợp' : 'Chưa có thợ nào được kích hoạt trong đội ngũ'}
              </p>
              <p className="text-sm mt-1 max-w-md mx-auto">
                {query
                  ? 'Thử thay đổi từ khóa tìm kiếm hoặc lọc theo trạng thái khác.'
                  : 'Hãy bấm nút "Mời thợ cứu hộ" ở trên để gửi mã kích hoạt tài khoản cho nhân viên thợ.'}
              </p>
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-bold text-xs cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
          )}
        </GaragePanel>
      )}

      {/* DRAWER 1: THÊM / CHỈNH SỬA CHI NHÁNH */}
      {drawer === 'branch' && (
        <GarageDrawer
          title={editing ? `Chỉnh sửa: ${editing.branchName}` : 'Thêm chi nhánh trực chiến mới'}
          description="Gõ địa chỉ để hệ thống tự động tìm vị trí và lấy về vĩ độ, kinh độ GPS chuẩn xác."
          onClose={() => {
            if (!busy) setDrawer(null);
          }}
        >
          <GarageError message={error} />
          <form onSubmit={handleSaveBranchSubmit} className="space-y-4 p-4">
            {/* Nhóm 1: Tên & Hotline */}
            <div className="space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Building2 size={14} className="text-primary" />
                1. Thông tin cơ sở
              </h4>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Tên chi nhánh / Trạm trực: <span className="text-error">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: Chi nhánh Quận 7 - Trạm Cứu Hộ Nam Sài Gòn"
                  value={formBranchName}
                  onChange={(e) => setFormBranchName(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-surface-container-low border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Hotline chi nhánh:
                </label>
                <input
                  type="tel"
                  placeholder="VD: 0903123456"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-surface-container-low border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Nhóm 2: Địa chỉ & Tự Động Geocoding GPS qua Bên thứ 3 */}
            <div className="space-y-3 pt-2 border-t border-surface-container/60">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1.5">
                  <MapPin size={14} className="text-primary" />
                  2. Địa chỉ & Tọa độ GPS cứu hộ
                </h4>
                <span className="text-[11px] text-primary font-bold flex items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                  <Sparkles size={12} />
                  Tự động gợi ý & lấy tọa độ
                </span>
              </div>

              {/* Ô nhập Địa chỉ có Autocomplete Dropdown */}
              <div className="relative" ref={suggestionsRef}>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Địa chỉ chi tiết: <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="Gõ tên đường, số nhà, phường quận (VD: 123 Nguyễn Hữu Thọ Q7)..."
                    value={formAddress}
                    onChange={(e) => {
                      setFormAddress(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => {
                      if (addressSuggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="w-full h-10 pl-3 pr-9 text-sm bg-surface-container-low border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  {isSearchingAddress ? (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary">
                      <RefreshCw size={16} className="animate-spin" />
                    </div>
                  ) : formAddress ? (
                    <button
                      type="button"
                      onClick={() => {
                        setFormAddress('');
                        setAddressSuggestions([]);
                        setShowSuggestions(false);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  ) : null}
                </div>

                {/* Dropdown Gợi Ý Địa Điểm Thông Minh (Photon / OSM) */}
                {showSuggestions && (addressSuggestions.length > 0 || isSearchingAddress) && (
                  <div className="absolute z-50 left-0 right-0 top-full mt-1.5 bg-white border border-surface-container rounded-xl shadow-2xl overflow-hidden animate-fade-in max-h-64 overflow-y-auto">
                    <div className="p-2 bg-surface-container-low/70 border-b border-surface-container/60 text-[11px] font-bold text-secondary flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <MapPin size={13} className="text-primary" />
                        Gợi ý địa chỉ & Tọa độ thực tế
                      </span>
                      <span className="text-primary font-semibold">Bấm để tự điền tọa độ</span>
                    </div>

                    {isSearchingAddress && addressSuggestions.length === 0 ? (
                      <div className="p-4 text-center text-secondary text-xs flex items-center justify-center gap-2">
                        <RefreshCw size={14} className="animate-spin text-primary" />
                        <span>Đang tra cứu địa điểm và tọa độ GPS...</span>
                      </div>
                    ) : (
                      <div className="divide-y divide-surface-container/40">
                        {addressSuggestions.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleSelectAddressSuggestion(item)}
                            className="w-full p-3 text-left hover:bg-primary/5 transition flex items-start gap-2.5 cursor-pointer group"
                          >
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary group-hover:text-white transition">
                              <MapPin size={14} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-on-surface group-hover:text-primary transition line-clamp-2">
                                {item.label}
                              </p>
                              <span className="text-[11px] font-mono text-secondary mt-0.5 block">
                                Tọa độ GPS: {item.lat}, {item.lng}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tọa độ GPS Tự Động & Hỗ trợ Geolocation */}
              <div className="bg-surface-container-low p-3 rounded-lg border border-surface-container/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-on-surface">Tọa độ GPS điểm trực chiến</span>
                    {formLat && formLng && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        ĐÃ CÓ TỌA ĐỘ
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {formLat && formLng && (
                      <a
                        href={`https://www.google.com/maps?q=${formLat},${formLng}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2 py-1 bg-surface-container-high hover:bg-surface-container-highest text-primary rounded-md text-xs font-semibold flex items-center gap-1 transition"
                      >
                        <ExternalLink size={12} />
                        Xem Maps
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={gettingLocation}
                      onClick={handleGetCurrentLocation}
                      className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Navigation size={12} className={gettingLocation ? 'animate-spin' : ''} />
                      <span>{gettingLocation ? 'Đang định vị...' : 'Lấy vị trí GPS của tôi'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-secondary mb-0.5">Vĩ độ (Latitude):</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Tự động điền khi chọn địa chỉ"
                      value={formLat}
                      onChange={(e) => setFormLat(e.target.value)}
                      className="w-full h-9 px-2 text-xs font-mono bg-white border border-surface-container rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-secondary mb-0.5">Kinh độ (Longitude):</label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="Tự động điền khi chọn địa chỉ"
                      value={formLng}
                      onChange={(e) => setFormLng(e.target.value)}
                      className="w-full h-9 px-2 text-xs font-mono bg-white border border-surface-container rounded focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Gợi ý nhanh tọa độ TP.HCM */}
                <div className="pt-1 flex items-center gap-1 flex-wrap text-[11px] text-secondary">
                  <span>Gợi ý nhanh:</span>
                  <button
                    type="button"
                    onClick={() => handleSetPresetLocation(10.7769, 106.7009, 'Quận 1')}
                    className="px-1.5 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest cursor-pointer"
                  >
                    Q1 (Bến Thành)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetLocation(10.7324, 106.7218, 'Quận 7')}
                    className="px-1.5 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest cursor-pointer"
                  >
                    Q7 (Phú Mỹ Hưng)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetLocation(10.8016, 106.7113, 'Bình Thạnh')}
                    className="px-1.5 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest cursor-pointer"
                  >
                    Bình Thạnh
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPresetLocation(10.8505, 106.7719, 'TP. Thủ Đức')}
                    className="px-1.5 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest cursor-pointer"
                  >
                    Thủ Đức
                  </button>
                </div>
              </div>
            </div>

            {/* Nhóm 3: Phương tiện cứu hộ */}
            <div className="space-y-3 pt-2 border-t border-surface-container/60">
              <h4 className="font-bold text-xs uppercase tracking-wider text-secondary flex items-center gap-1.5">
                <Truck size={14} className="text-primary" />
                3. Phương tiện cứu hộ ngập lụt
              </h4>
              <div>
                <label className="block text-xs font-bold text-on-surface mb-1">
                  Đội xe cứu hộ tại chi nhánh:
                </label>
                <input
                  type="text"
                  placeholder="VD: 1 Xe tải cẩu kéo + 2 Xe máy chuyên dụng lội nước"
                  value={formVehicles}
                  onChange={(e) => setFormVehicles(e.target.value)}
                  className="w-full h-10 px-3 text-sm bg-surface-container-low border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            {/* Submit & Cancel Buttons */}
            <div className="pt-4 flex items-center justify-end gap-2 border-t border-surface-container/60">
              <button
                type="button"
                disabled={busy}
                onClick={() => setDrawer(null)}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  borderColor: '#cbd5e1'
                }}
                className="px-4 py-2 rounded-lg border hover:bg-slate-50 font-label-md font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={busy}
                style={{
                  backgroundColor: '#d65322',
                  color: '#ffffff',
                  borderColor: '#d65322'
                }}
                className="px-5 py-2 rounded-lg font-label-md font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
              >
                {busy ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
                <span>{editing ? 'Lưu thay đổi' : 'Tạo chi nhánh mới'}</span>
              </button>
            </div>
          </form>
        </GarageDrawer>
      )}

      {/* DRAWER 2: MỜI THỢ CỨU HỘ VÀO ĐỘI NGŨ */}
      {drawer === 'invite' && (
        <GarageDrawer
          title="Mời thợ cứu hộ mới"
          description="Gửi mã kích hoạt riêng biệt để thợ kích hoạt tài khoản trên ứng dụng Mobile Cứu Hộ."
          onClose={() => {
            if (!busy) setDrawer(null);
          }}
        >
          <GarageError message={error} />
          <form onSubmit={handleInviteSubmit} className="space-y-4 p-4">
            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Email tài khoản của thợ: <span className="text-error">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="VD: thocuuho.nguyenvana@gmail.com"
                className="w-full h-10 px-3 text-sm bg-surface-container-low border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <span className="text-[11px] text-secondary mt-1 block">
                Thợ sẽ dùng email này kết hợp mã mời để kích hoạt tài khoản.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface mb-1">
                Phân bổ chi nhánh trực thuộc: <span className="text-error">*</span>
              </label>
              <select
                required
                name="branchId"
                className="w-full h-10 px-3 text-sm bg-surface-container-low border border-surface-container rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
              >
                <option value="">-- Chọn chi nhánh làm việc --</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.branchName} ({b.operatingStatus === 'OPEN' ? 'Đang mở' : 'Bảo trì'})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={busy || !branches.length}
              style={{
                backgroundColor: '#d65322',
                color: '#ffffff',
                borderColor: '#d65322'
              }}
              className="w-full py-2.5 rounded-lg font-label-md font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <RefreshCw size={16} className="animate-spin" /> : <Users size={16} />}
              <span>Tạo mã kích hoạt cho thợ</span>
            </button>
          </form>

          {/* Hộp thoại hiển thị mã kích hoạt sau khi tạo */}
          {invitation && (
            <div className="m-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-3 animate-fade-in shadow-xs">
              <div className="flex items-center gap-2 text-emerald-800 font-bold">
                <CheckCircle2 size={18} />
                <span>Mã kích hoạt đã sẵn sàng</span>
              </div>

              <p className="text-xs text-emerald-900 leading-relaxed">
                Gửi mã này cho thợ <strong>{invitation.email}</strong>. Mã có hiệu lực trong 48 giờ (hết hạn vào {new Date(invitation.expiresAt).toLocaleString('vi-VN')}).
              </p>

              {/* Code display with 1-click Copy */}
              <div className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-emerald-300">
                <code className="flex-1 font-mono font-bold text-base text-primary select-all tracking-wider">
                  {invitation.code}
                </code>
                <button
                  type="button"
                  onClick={() => handleCopyCode(invitation.code)}
                  style={{
                    backgroundColor: '#d65322',
                    color: '#ffffff',
                    borderColor: '#d65322'
                  }}
                  className="px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer transition shadow-xs hover:opacity-90"
                >
                  {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedCode ? 'Đã sao chép' : 'Sao chép'}</span>
                </button>
              </div>

              <p className="text-[11px] text-emerald-800">
                Thợ mở ứng dụng Mobile hoặc vào trang <code>/activate</code> trên Web, nhập mã trên để hoàn tất đăng ký mật khẩu.
              </p>
            </div>
          )}
        </GarageDrawer>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white max-w-md w-full p-6 rounded-2xl shadow-2xl border border-surface-container animate-scale-in">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  confirmModal.tone === 'danger'
                    ? 'bg-red-100 text-red-700'
                    : confirmModal.tone === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-primary-container text-on-primary-container'
                }`}
              >
                <AlertTriangle size={20} />
              </div>
              <div>
                <h3 className="font-headline-sm font-bold text-on-surface text-base">
                  {confirmModal.title}
                </h3>
                <p className="text-sm text-secondary mt-1 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-surface-container/60">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                style={{
                  backgroundColor: '#ffffff',
                  color: '#1e293b',
                  borderColor: '#cbd5e1'
                }}
                className="px-4 py-2 rounded-lg border hover:bg-slate-50 font-label-md font-semibold transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void confirmModal.action()}
                style={{
                  backgroundColor:
                    confirmModal.tone === 'danger'
                      ? '#dc2626'
                      : confirmModal.tone === 'warning'
                        ? '#d97706'
                        : '#d65322',
                  color: '#ffffff',
                  borderColor:
                    confirmModal.tone === 'danger'
                      ? '#dc2626'
                      : confirmModal.tone === 'warning'
                        ? '#d97706'
                        : '#d65322'
                }}
                className="px-5 py-2 rounded-lg font-label-md font-bold transition cursor-pointer shadow-xs hover:opacity-90 disabled:opacity-50"
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
