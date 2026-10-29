import { ViewGuide } from '../ViewGuide';
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GarageApplicant } from '../../types';
import { garageApi, GarageBranchBackend, GarageMechanicBackend } from '../../services/garageApi';

interface GarageVerificationViewProps {
  applicants?: GarageApplicant[];
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

type TabType = 'pending' | 'suspended' | 'approved' | 'rejected';
type DocTabType = 'all' | 'id_card' | 'business_license' | 'certificate';
type ActionType = 'APPROVE' | 'REJECT' | 'REQUEST_DOCS' | 'SUSPEND';

interface ActionModalState {
  isOpen: boolean;
  type: ActionType | null;
  title: string;
  note: string;
}

interface ImagePreviewState {
  url: string;
  title: string;
  subtitle?: string;
}

function formatTimeAgo(dateStr?: string): string {
  if (!dateStr) return 'Vừa xong';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} ngày trước`;
  } catch {
    return 'Hôm nay';
  }
}

const GarageVerificationView: React.FC<GarageVerificationViewProps> = ({ onShowToast }) => {
  const [applicantsList, setApplicantsList] = useState<GarageApplicant[]>([]);
  const [selectedApplicantId, setSelectedApplicantId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [docTab, setDocTab] = useState<DocTabType>('all');

  // Chi nhánh & thợ cứu hộ thực tế
  const [branches, setBranches] = useState<GarageBranchBackend[]>([]);
  const [mechanics, setMechanics] = useState<GarageMechanicBackend[]>([]);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [detailError, setDetailError] = useState<string>('');

  // Ghi chú thẩm định nhanh & modal hành động
  const [auditorNote, setAuditorNote] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionModal, setActionModal] = useState<ActionModalState>({
    isOpen: false,
    type: null,
    title: '',
    note: ''
  });

  // Lightbox xem ảnh chi tiết (CCCD & GPKD)
  const [imagePreview, setImagePreview] = useState<ImagePreviewState | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  // Đóng lightbox khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setImagePreview(null);
        setZoomLevel(1);
        setRotation(0);
      }
    };
    if (imagePreview) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [imagePreview]);

  // Tải danh sách Gara từ Backend API
  const fetchBackendGarages = useCallback(async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const liveGarages = await garageApi.getAllGarages();
      if (liveGarages && liveGarages.length > 0) {
        const mapped: GarageApplicant[] = liveGarages.map((item) => {
          let badgeText: string | undefined;
          if (item.status === 'PENDING') badgeText = 'MỚI NỘP';
          else if (item.status === 'APPROVED') badgeText = 'ĐÃ KÍCH HOẠT';
          else if (item.status === 'SUSPENDED') badgeText = 'ĐÃ ĐÌNH CHỈ';
          else if (item.status === 'REJECTED') badgeText = 'ĐÃ TỪ CHỐI';

          // Hiển thị số CCCD thật từ API backend (Decree 13 / GarageResponse)
          const actualIdCard = item.idCardNumber && item.idCardNumber.trim().length > 0
            ? item.idCardNumber
            : 'Chưa cung cấp';

          // Mã định danh / Mã số thuế cá nhân hoặc HKD
          const actualTaxCode = item.idCardNumber && item.idCardNumber.trim().length > 0
            ? `Mã ĐD / HKD: ${item.idCardNumber}`
            : 'Theo Giấy phép ĐKKD';

          return {
            id: `GAR-${item.id}`,
            numericId: item.id,
            name: item.garageName,
            area: item.address
              ? item.address.includes(',')
                ? item.address.split(',').pop()!.trim()
                : item.address
              : 'TP. Hồ Chí Minh',
            ownerName: item.ownerName || 'Chưa cập nhật',
            ownerEmail: item.ownerEmail,
            phone: item.phone || 'Chưa cập nhật',
            branchesCount: item.branchCount || 0,
            mechanicsCount: item.mechanicCount || 0,
            timeAgo: formatTimeAgo(item.createdAt),
            status: item.status,
            badge: badgeText,
            taxCode: actualTaxCode,
            idCardNumber: actualIdCard,
            address: item.address || 'Chưa thiết lập địa chỉ trụ sở',
            ekycMatchRate: item.idCardUrl ? 100 : 0,
            idCardUrl: item.idCardUrl,
            businessLicenseUrl: item.businessLicenseUrl,
            rejectionReason: item.rejectionReason,
            createdAt: item.createdAt,
            branches: [],
            equipment: []
          };
        });

        setApplicantsList(mapped);
        setSelectedApplicantId((curr) => {
          if (curr && mapped.some((m) => m.id === curr)) return curr;
          return mapped[0]?.id || '';
        });
      } else {
        setApplicantsList([]);
        setSelectedApplicantId('');
      }
    } catch (err: any) {
      setLoadError(err.message || 'Không tải được danh sách gara. Vui lòng kiểm tra kết nối API.');
      setApplicantsList([]);
      setSelectedApplicantId('');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackendGarages();
  }, [fetchBackendGarages]);

  // Danh sách lọc theo Tab, Search và Khu vực
  const filteredApplicants = useMemo(() => {
    return applicantsList.filter((a) => {
      if (activeTab === 'pending' && a.status !== 'PENDING') return false;
      if (activeTab === 'approved' && a.status !== 'APPROVED') return false;
      if (activeTab === 'rejected' && a.status !== 'REJECTED') return false;
      if (activeTab === 'suspended' && a.status !== 'SUSPENDED') return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const matchName = a.name.toLowerCase().includes(q);
        const matchOwner = a.ownerName.toLowerCase().includes(q);
        const matchPhone = a.phone.includes(q);
        const matchIdCard = a.idCardNumber.toLowerCase().includes(q);
        if (!matchName && !matchOwner && !matchPhone && !matchIdCard) {
          return false;
        }
      }

      if (areaFilter !== 'all' && !a.area.toLowerCase().includes(areaFilter.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [applicantsList, activeTab, searchTerm, areaFilter]);

  // Tự động đồng bộ chọn hồ sơ đầu tiên khi đổi tab hoặc bộ lọc
  useEffect(() => {
    if (filteredApplicants.length > 0) {
      const exists = filteredApplicants.some((a) => a.id === selectedApplicantId);
      if (!exists) {
        setSelectedApplicantId(filteredApplicants[0].id);
      }
    } else {
      setSelectedApplicantId('');
    }
  }, [filteredApplicants, selectedApplicantId]);

  const selectedApplicant = useMemo(() => {
    return filteredApplicants.find((a) => a.id === selectedApplicantId) || filteredApplicants[0];
  }, [filteredApplicants, selectedApplicantId]);

  // Tải thông tin chi nhánh & đội thợ thực tế của Gara đang chọn
  useEffect(() => {
    let cancelled = false;
    setBranches([]);
    setMechanics([]);
    setDetailError('');
    setDetailLoading(false);

    if (!selectedApplicant) return;

    setAuditorNote(selectedApplicant.rejectionReason || '');
    const rawId = selectedApplicant.numericId;
    if (rawId === undefined) return;

    setDetailLoading(true);
    Promise.all([garageApi.getGarageBranches(rawId), garageApi.getGarageMechanics(rawId)])
      .then(([bList, mList]) => {
        if (!cancelled) {
          setBranches(bList || []);
          setMechanics(mList || []);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setDetailError(err.message || 'Không tải được chi nhánh và đội thợ từ API.');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedApplicant?.id, selectedApplicant?.numericId, selectedApplicant?.rejectionReason]);

  // Xử lý mở Modal thao tác
  const openActionModal = (type: ActionType) => {
    if (!selectedApplicant) return;
    let title = '';
    let defaultNote = '';

    if (type === 'APPROVE') {
      title = `Phê Duyệt & Kích Hoạt Gara: ${selectedApplicant.name}`;
      defaultNote = auditorNote.trim() || 'Hồ sơ pháp lý hợp lệ, đầy đủ điều kiện cứu hộ ngập lụt';
    } else if (type === 'REJECT') {
      title = `Từ Chối Hồ Sơ Gara: ${selectedApplicant.name}`;
      defaultNote = auditorNote.trim() || 'Hồ sơ chưa đạt tiêu chuẩn thẩm định của nền tảng';
    } else if (type === 'REQUEST_DOCS') {
      title = `Yêu Cầu Bổ Sung Hồ Sơ: ${selectedApplicant.name}`;
      defaultNote = auditorNote.trim() || 'Vui lòng bổ sung ảnh chụp CCCD 2 mặt rõ nét và Giấy phép đăng ký kinh doanh có dấu đỏ';
    } else if (type === 'SUSPEND') {
      title = `Tạm Đình Chỉ Hoạt Động: ${selectedApplicant.name}`;
      defaultNote = auditorNote.trim() || 'Tạm dừng tiếp nhận đơn để rà soát quy trình và kiểm định an toàn kỹ thuật';
    }

    setActionModal({
      isOpen: true,
      type,
      title,
      note: defaultNote
    });
  };

  // Xác nhận thực thi thao tác trong Modal
  const handleConfirmAction = async () => {
    if (!selectedApplicant || !actionModal.type || isSubmitting) return;

    const rawId = selectedApplicant.numericId || parseInt(selectedApplicant.id.replace('GAR-', ''), 10);
    if (isNaN(rawId)) {
      onShowToast('Lỗi Dữ Liệu', 'Không tìm thấy mã số Gara hợp lệ.', 'error');
      return;
    }

    const trimmedNote = actionModal.note.trim();

    // Backend Spring Boot yêu cầu ghi chú bắt buộc khi REJECT hoặc SUSPEND
    if ((actionModal.type === 'REJECT' || actionModal.type === 'REQUEST_DOCS' || actionModal.type === 'SUSPEND') && !trimmedNote) {
      onShowToast('Yêu Cầu Ghi Chú', 'Vui lòng nhập lý do cụ thể để gửi thông báo đến chủ gara.', 'warning');
      return;
    }

    setIsSubmitting(true);
    try {
      if (actionModal.type === 'APPROVE') {
        await garageApi.moderateGarage(rawId, 'APPROVED', trimmedNote || 'Hồ sơ pháp lý hợp lệ');
        onShowToast(
          'Kích Hoạt Thành Công!',
          `Đã phê duyệt ${selectedApplicant.name}. Hệ thống đã mở tiếp nhận đơn cứu hộ ngập lụt.`,
          'success'
        );
      } else if (actionModal.type === 'REJECT') {
        await garageApi.moderateGarage(rawId, 'REJECTED', trimmedNote);
        onShowToast(
          'Đã Từ Chối Hồ Sơ',
          `Đã từ chối hồ sơ gara ${selectedApplicant.name}. Lý do: ${trimmedNote}`,
          'warning'
        );
      } else if (actionModal.type === 'REQUEST_DOCS') {
        // Backend dùng status REJECTED kèm lý do yêu cầu bổ sung
        await garageApi.moderateGarage(rawId, 'REJECTED', trimmedNote);
        onShowToast(
          'Yêu Cầu Bổ Sung Hồ Sơ',
          `Đã gửi yêu cầu bổ sung giấy tờ đến chủ gara ${selectedApplicant.ownerName}.`,
          'info'
        );
      } else if (actionModal.type === 'SUSPEND') {
        await garageApi.moderateGarage(rawId, 'SUSPENDED', trimmedNote);
        onShowToast(
          'Đã Đình Chỉ Hoạt Động',
          `Gara ${selectedApplicant.name} đã tạm dừng nhận đơn cứu hộ.`,
          'warning'
        );
      }

      setActionModal({ isOpen: false, type: null, title: '', note: '' });
      await fetchBackendGarages();
    } catch (err: any) {
      onShowToast('Lỗi Thao Tác', err.message || 'Lỗi kết nối máy chủ API', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cập nhật ghi chú trực tiếp
  const handleSaveQuickNote = async () => {
    if (!selectedApplicant || isSubmitting) return;
    const rawId = selectedApplicant.numericId || parseInt(selectedApplicant.id.replace('GAR-', ''), 10);
    if (isNaN(rawId)) return;

    setIsSubmitting(true);
    try {
      await garageApi.moderateGarage(rawId, selectedApplicant.status, auditorNote.trim());
      onShowToast('Cập Nhật Thành Công', 'Đã lưu ghi chú thẩm định viên vào hệ thống.', 'success');
      await fetchBackendGarages();
    } catch (err: any) {
      onShowToast('Lỗi Cập Nhật', err.message || 'Không thể lưu ghi chú', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Xuất báo cáo CSV
  const handleExportAudit = () => {
    if (applicantsList.length === 0) {
      onShowToast('Thông Báo', 'Không có dữ liệu garage để xuất báo cáo.', 'info');
      return;
    }
    const headers = 'Mã Garage,Tên Garage,Chủ Gara,SĐT,Số CCCD,Trạng Thái,Chi Nhánh,Thợ Cơ Động,Ngày Nộp';
    const rows = applicantsList.map(
      (a) =>
        `"${a.id}","${a.name}","${a.ownerName}","${a.phone}","${a.idCardNumber}","${a.status}","${a.branchesCount}","${a.mechanicsCount}","${a.timeAgo}"`
    );
    const csvContent = '\uFEFF' + [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `audit_danh_sach_gara_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onShowToast('Xuất Báo Cáo', 'Đã tải xuống file CSV danh sách garage thẩm định thành công.');
  };

  // Mở Lightbox xem ảnh
  const openImagePreview = (url?: string | null, title?: string, subtitle?: string) => {
    if (!url) {
      onShowToast('Thông Báo', 'Không có tệp ảnh để xem chi tiết.', 'info');
      return;
    }
    setImagePreview({ url, title: title || 'Tài Liệu Đính Kèm', subtitle });
    setZoomLevel(1);
    setRotation(0);
  };

  const availableAreas = useMemo(() => {
    return Array.from(new Set(applicantsList.map((a) => a.area).filter(Boolean)));
  }, [applicantsList]);

  const countsByStatus = useMemo(() => {
    return {
      pending: applicantsList.filter((a) => a.status === 'PENDING').length,
      suspended: applicantsList.filter((a) => a.status === 'SUSPENDED').length,
      approved: applicantsList.filter((a) => a.status === 'APPROVED').length,
      rejected: applicantsList.filter((a) => a.status === 'REJECTED').length
    };
  }, [applicantsList]);

  return (
    <div className="flex flex-col w-full pb-36 relative">
      {/* Thông báo lỗi khi fetch danh sách */}
      {loadError && (
        <div role="alert" className="border border-red-300 bg-red-50 p-4 mb-4 rounded-lg flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-2 text-red-800">
            <span className="material-symbols-outlined text-[20px]">error</span>
            <p className="font-body-sm text-body-sm font-medium">{loadError}</p>
          </div>
          <button
            onClick={() => void fetchBackendGarages()}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-label-sm font-semibold transition cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Command Header & Sub-navigation */}
      <section className="bg-surface-container-lowest p-space-md mb-space-md rounded-xl shadow-sm border border-surface-container">
        <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md pb-space-sm border-b border-surface-container">
          <div className="flex items-center gap-space-md">
            <div className="w-11 h-11 rounded-lg bg-primary-container text-on-primary-container flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[26px]">verified_user</span>
            </div>
            <div>
              <div className="flex items-center gap-space-sm flex-wrap">
                <h1 className="font-headline-lg text-headline-lg text-on-surface uppercase tracking-tight font-bold">
                  Thẩm định hồ sơ gara
                </h1>
                <span className="px-space-sm py-0.5 rounded-full font-label-sm text-label-sm bg-error-container text-on-error-container font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                  SLA: Duyệt trong 30 phút
                </span>
              </div>
              <ViewGuide>
                <p className="font-body-sm text-body-sm text-secondary">
                  Đối chiếu CCCD gắn chip của chủ gara, Giấy phép kinh doanh, chi nhánh thực địa và chứng chỉ thợ cứu hộ.
                </p>
              </ViewGuide>
            </div>
          </div>

          {/* Action Utilities */}
          <div className="flex items-center gap-space-sm flex-wrap">
            <div className="flex items-center bg-surface-container-low px-space-md py-2 rounded-lg border border-surface-container/60">
              <span className="material-symbols-outlined text-secondary text-[18px] mr-1.5">storefront</span>
              <span className="font-data-mono text-data-mono text-secondary">
                Tổng hồ sơ: <strong className="text-on-surface font-bold">{applicantsList.length} gara</strong>
              </span>
            </div>
            <button
              onClick={handleExportAudit}
              className="bg-secondary text-on-secondary hover:bg-on-secondary-fixed-variant px-space-md py-2 rounded-lg font-label-md text-label-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px]">file_download</span>
              <span>Xuất Báo Cáo CSV</span>
            </button>
            <button
              onClick={fetchBackendGarages}
              disabled={isLoading}
              title="Làm mới dữ liệu từ API"
              className="p-2 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-secondary border border-surface-container/60 cursor-pointer transition"
            >
              <span className={`material-symbols-outlined text-[20px] ${isLoading ? 'animate-spin text-primary' : ''}`}>
                refresh
              </span>
            </button>
          </div>
        </div>

        {/* Status Tabs Segment */}
        <div className="flex flex-wrap items-center gap-space-xs pt-space-sm">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'pending'
                ? 'bg-primary-container text-on-primary-container shadow-sm font-bold border border-primary/20'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
            <span>Chờ duyệt ({countsByStatus.pending})</span>
          </button>
          <button
            onClick={() => setActiveTab('suspended')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'suspended'
                ? 'bg-amber-100 text-amber-900 shadow-sm font-bold border border-amber-300'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-amber-600">pause_circle</span>
            <span>Đình chỉ ({countsByStatus.suspended})</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'approved'
                ? 'bg-tertiary/20 text-tertiary shadow-sm font-bold border border-tertiary/30'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-tertiary"></span>
            <span>Đã kích hoạt ({countsByStatus.approved})</span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`px-space-md py-2 rounded-lg font-label-md text-label-md flex items-center gap-space-xs cursor-pointer transition-all ${
              activeTab === 'rejected'
                ? 'bg-error/15 text-error shadow-sm font-bold border border-error/30'
                : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined text-[16px] text-error">cancel</span>
            <span>Đã từ chối ({countsByStatus.rejected})</span>
          </button>
        </div>
      </section>

      {/* Main Two-Pane Verification Grid */}
      <div className="grid grid-cols-12 gap-gutter-desktop items-start">
        {/* LEFT PANE: Garage List Queue */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-space-sm">
          {/* Search & Area Filter Bar */}
          <div className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm flex flex-col gap-space-xs border border-surface-container">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[18px]">
                search
              </span>
              <input
                className="w-full h-9 pl-8 pr-8 text-body-sm font-body-sm bg-surface-container-low rounded-lg border-0 text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/40"
                placeholder="Tìm theo tên gara, SĐT, số CCCD, chủ hộ..."
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-on-surface cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-secondary px-1 flex-wrap gap-1 pt-1">
              <span className="font-label-sm text-label-sm font-bold flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">location_on</span>
                KHU VỰC:
              </span>
              <div className="flex gap-1 flex-wrap">
                <button
                  onClick={() => setAreaFilter('all')}
                  className={`px-2 py-0.5 rounded-full font-data-mono text-label-sm cursor-pointer transition ${
                    areaFilter === 'all'
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                  }`}
                >
                  Tất cả
                </button>
                {availableAreas.map((area) => (
                  <button
                    key={area}
                    onClick={() => setAreaFilter(areaFilter === area ? 'all' : area)}
                    className={`px-2 py-0.5 rounded-full font-data-mono text-label-sm cursor-pointer transition ${
                      areaFilter === area
                        ? 'bg-primary text-on-primary font-bold shadow-xs'
                        : 'bg-surface-container-high text-on-surface hover:bg-surface-container-highest'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Applicant Cards Scroll Container */}
          <div className="flex flex-col gap-space-sm max-h-[calc(100vh-270px)] overflow-y-auto pr-0.5">
            {isLoading ? (
              <div className="p-space-xl text-center text-secondary bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm">
                <span className="material-symbols-outlined text-[36px] animate-spin mb-2 text-primary">
                  progress_activity
                </span>
                <p className="font-body-sm font-medium">Đang tải danh sách hồ sơ gara từ API...</p>
              </div>
            ) : filteredApplicants.length === 0 ? (
              <div className="p-space-xl text-center text-secondary bg-surface-container-lowest rounded-xl border border-surface-container shadow-sm">
                <span className="material-symbols-outlined text-[40px] mb-2 text-secondary/60">folder_open</span>
                <p className="font-body-sm font-semibold text-on-surface">Không tìm thấy hồ sơ gara phù hợp</p>
                <p className="font-label-sm text-label-sm text-secondary mt-1">
                  {searchTerm || areaFilter !== 'all'
                    ? 'Thử thay đổi từ khóa tìm kiếm hoặc bấm Đặt lại bộ lọc.'
                    : 'Chưa có hồ sơ nào trong trạng thái này.'}
                </p>
                {(searchTerm || areaFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setAreaFilter('all');
                    }}
                    className="mt-3 px-3 py-1.5 rounded-lg bg-surface-container-high text-primary font-label-md font-bold hover:bg-surface-container-highest cursor-pointer transition"
                  >
                    Đặt lại bộ lọc
                  </button>
                )}
              </div>
            ) : (
              filteredApplicants.map((applicant) => {
                const isSelected = applicant.id === selectedApplicantId;
                let statusBadgeColor = 'bg-surface-container-high text-on-surface';
                let statusLabel = 'CHỜ THẨM ĐỊNH';

                if (applicant.status === 'APPROVED') {
                  statusBadgeColor = 'bg-tertiary/15 text-tertiary border border-tertiary/30';
                  statusLabel = 'ĐÃ KÍCH HOẠT';
                } else if (applicant.status === 'REJECTED') {
                  statusBadgeColor = 'bg-error/15 text-error border border-error/30';
                  statusLabel = 'ĐÃ TỪ CHỐI';
                } else if (applicant.status === 'SUSPENDED') {
                  statusBadgeColor = 'bg-amber-100 text-amber-900 border border-amber-300';
                  statusLabel = 'ĐÃ ĐÌNH CHỈ';
                }

                return (
                  <div
                    key={applicant.id}
                    onClick={() => setSelectedApplicantId(applicant.id)}
                    className={`bg-surface-container-lowest p-space-md rounded-xl shadow-sm relative overflow-hidden transition-all cursor-pointer border ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/20 shadow-md bg-gradient-to-r from-primary/5 via-surface-container-lowest to-surface-container-lowest'
                        : 'border-surface-container hover:shadow-md hover:border-surface-container-high'
                    }`}
                  >
                    {applicant.badge && (
                      <div
                        className={`absolute top-0 right-0 px-2.5 py-0.5 font-label-sm text-label-sm uppercase rounded-bl-lg font-bold flex items-center gap-1 shadow-xs ${
                          applicant.status === 'PENDING'
                            ? 'bg-primary-container text-on-primary-container'
                            : applicant.status === 'APPROVED'
                              ? 'bg-tertiary text-on-tertiary'
                              : applicant.status === 'SUSPENDED'
                                ? 'bg-amber-600 text-white'
                                : 'bg-error text-on-error'
                        }`}
                      >
                        {applicant.status === 'PENDING' && (
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                        )}
                        <span>{applicant.badge}</span>
                      </div>
                    )}

                    <div className="flex items-start justify-between mt-1">
                      <div>
                        <span className="font-data-mono text-data-mono text-secondary font-bold text-xs">{applicant.id}</span>
                        <h3 className="font-headline-sm text-headline-sm text-on-surface mt-0.5 leading-snug font-bold">
                          {applicant.name}
                        </h3>
                        <p className="font-body-sm text-body-sm text-secondary flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                          {applicant.area}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-space-xs mt-space-sm pt-space-xs bg-surface-container-low p-space-sm rounded-lg border border-surface-container/40">
                      <div>
                        <span className="font-label-sm text-label-sm text-secondary block uppercase">Đại diện</span>
                        <span className="font-label-md text-label-md text-on-surface font-semibold truncate block">
                          {applicant.ownerName}
                        </span>
                      </div>
                      <div>
                        <span className="font-label-sm text-label-sm text-secondary block uppercase">Hotline</span>
                        <span className="font-data-mono text-data-mono text-primary font-bold">{applicant.phone}</span>
                      </div>
                      <div className="mt-1">
                        <span className="font-label-sm text-label-sm text-secondary block uppercase">Chi nhánh</span>
                        <span className="font-label-md text-label-md text-on-surface font-medium">
                          {applicant.branchesCount} Cơ sở
                        </span>
                      </div>
                      <div className="mt-1">
                        <span className="font-label-sm text-label-sm text-secondary block uppercase">Đội thợ</span>
                        <span className="font-label-md text-label-md text-tertiary font-bold">
                          {applicant.mechanicsCount} Thợ cơ động
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-space-sm pt-space-xs text-secondary font-label-sm text-label-sm">
                      <span className="flex items-center gap-1 text-primary font-medium">
                        <span className="material-symbols-outlined text-[15px]">schedule</span>
                        {applicant.timeAgo}
                      </span>
                      <span className={`px-2 py-0.5 rounded font-bold ${statusBadgeColor}`}>{statusLabel}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT PANE: Inspection Dossier Detail View */}
        {selectedApplicant ? (
          <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-space-md">
            {/* Primary Business Identity Strip */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <div className="flex flex-col md:flex-row md:items-center justify-between pb-space-sm gap-space-sm border-b border-surface-container">
                <div>
                  <div className="flex items-center gap-space-xs flex-wrap">
                    <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-semibold">
                      HỒ SƠ THẨM ĐỊNH DOANH NGHIỆP
                    </span>
                    <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-data-mono text-label-sm font-bold">
                      MÃ: {selectedApplicant.id}
                    </span>
                  </div>
                  <h2 className="font-headline-xl text-headline-xl text-on-surface font-bold tracking-tight mt-1">
                    {selectedApplicant.name}
                  </h2>
                </div>
                <div className="flex items-center gap-space-xs flex-wrap">
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md font-bold ${
                      selectedApplicant.idCardUrl
                        ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {selectedApplicant.idCardUrl ? 'fingerprint' : 'warning'}
                    </span>
                    {selectedApplicant.idCardUrl ? 'Đã đính kèm ảnh CCCD' : 'Chưa tải lên CCCD'}
                  </span>
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md font-bold ${
                      selectedApplicant.businessLicenseUrl
                        ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                        : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {selectedApplicant.businessLicenseUrl ? 'verified' : 'warning'}
                    </span>
                    {selectedApplicant.businessLicenseUrl ? 'Đã có Giấy phép ĐKKD' : 'Chưa có GPKD'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm bg-surface-container-low p-space-md rounded-lg mt-space-sm border border-surface-container/40">
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Đại diện pháp luật</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold block">
                    {selectedApplicant.ownerName}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary block mt-0.5">
                    Số CCCD: <strong className="text-on-surface font-mono">{selectedApplicant.idCardNumber}</strong>
                  </span>
                  {selectedApplicant.ownerEmail && (
                    <span className="font-body-sm text-body-sm text-secondary block mt-0.5">
                      Email: {selectedApplicant.ownerEmail}
                    </span>
                  )}
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Trạng thái hồ sơ</span>
                  <span className="font-data-mono text-headline-sm text-on-surface font-bold">
                    {selectedApplicant.status}
                  </span>
                  <span className="font-body-sm text-body-sm text-secondary block mt-0.5 font-medium">
                    {selectedApplicant.status === 'APPROVED'
                      ? 'Đã duyệt & đang nhận điều phối cứu hộ'
                      : selectedApplicant.status === 'PENDING'
                        ? 'Đang chờ thẩm định viên phê duyệt'
                        : selectedApplicant.status === 'SUSPENDED'
                          ? 'Đã đình chỉ hoạt động nhận đơn'
                          : 'Hồ sơ đã bị từ chối'}
                  </span>
                  <span className="font-label-sm text-label-sm text-primary block mt-1 font-semibold">
                    {selectedApplicant.taxCode}
                  </span>
                </div>
                <div>
                  <span className="font-label-sm text-label-sm text-secondary block uppercase">Trụ sở điều hành</span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold block">
                    {selectedApplicant.address}
                  </span>
                  <span className="font-body-sm text-body-sm text-primary block mt-1 font-bold">
                    Hotline: {selectedApplicant.phone}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Verification & Skills Module (Tabs chuyển đổi thực tế) */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm border-b border-surface-container gap-2">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-primary text-[22px]">badge</span>
                  <span className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Văn Bản Pháp Lý & Chứng Chỉ Tay Nghề
                  </span>
                </div>
                <div className="flex items-center gap-1 text-secondary font-label-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary">zoom_in</span>
                  <span>Bấm vào ảnh để soi chi tiết hoặc phóng to</span>
                </div>
              </div>

              {/* Functional Document Tabs */}
              <div className="flex items-center gap-1.5 py-space-sm flex-wrap">
                <button
                  onClick={() => setDocTab('all')}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    docTab === 'all'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">grid_view</span>
                  <span>Tất cả tài liệu</span>
                </button>
                <button
                  onClick={() => setDocTab('id_card')}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    docTab === 'id_card'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      selectedApplicant.idCardUrl ? (docTab === 'id_card' ? 'text-on-primary' : 'text-tertiary') : ''
                    }`}
                  >
                    {selectedApplicant.idCardUrl ? 'check_circle' : 'pending'}
                  </span>
                  <span>CCCD Chủ Gara ({selectedApplicant.ownerName})</span>
                </button>
                <button
                  onClick={() => setDocTab('business_license')}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    docTab === 'business_license'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[16px] ${
                      selectedApplicant.businessLicenseUrl ? (docTab === 'business_license' ? 'text-on-primary' : 'text-tertiary') : ''
                    }`}
                  >
                    {selectedApplicant.businessLicenseUrl ? 'verified' : 'pending'}
                  </span>
                  <span>GPKD Sửa Xe ({selectedApplicant.name})</span>
                </button>
                <button
                  onClick={() => setDocTab('certificate')}
                  className={`px-3 py-1.5 rounded-lg font-label-md text-label-md font-bold flex items-center gap-1.5 cursor-pointer transition ${
                    docTab === 'certificate'
                      ? 'bg-primary text-on-primary shadow-xs'
                      : 'bg-surface-container-low text-secondary hover:bg-surface-container-high'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">engineering</span>
                  <span>Chứng Chỉ & Đội Thợ ({mechanics.length} Nhân sự)</span>
                </button>
              </div>

              {/* Dynamic Document Content Based on Selected Tab */}
              {(docTab === 'all' || docTab === 'id_card' || docTab === 'business_license') && (
                <div className={`grid gap-space-sm bg-surface-container-low p-space-sm rounded-lg border border-surface-container/40 ${
                  docTab === 'all' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'
                }`}>
                  {/* CCCD Document Canvas */}
                  {(docTab === 'all' || docTab === 'id_card') && (
                    <div className="relative bg-surface-container-lowest rounded-lg p-space-sm shadow-xs flex flex-col border border-surface-container">
                      <div className="w-full flex items-center justify-between pb-2 border-b border-surface-container/60 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[18px]">badge</span>
                          <span className="font-label-md text-label-md text-on-surface uppercase font-bold">
                            CCCD Gắn Chip (Chủ Gara)
                          </span>
                        </div>
                        <span
                          className={`font-data-mono text-label-sm px-2 py-0.5 rounded font-bold ${
                            selectedApplicant.idCardUrl
                              ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                              : 'bg-surface-container-high text-secondary'
                          }`}
                        >
                          {selectedApplicant.idCardUrl ? 'ĐÃ NỘP ẢNH' : 'CHƯA TẢI LÊN'}
                        </span>
                      </div>

                      <div
                        onClick={() => openImagePreview(selectedApplicant.idCardUrl, `Căn cước công dân: ${selectedApplicant.ownerName}`, `Mã số: ${selectedApplicant.idCardNumber}`)}
                        className="w-full h-56 overflow-hidden rounded-lg relative bg-surface-container-high flex items-center justify-center cursor-pointer group"
                      >
                        {selectedApplicant.idCardUrl ? (
                          <>
                            <img
                              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                              alt="CCCD"
                              src={selectedApplicant.idCardUrl}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-label-md font-bold">
                              <span className="material-symbols-outlined text-[24px]">zoom_in</span>
                              <span>Bấm để soi chi tiết</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center text-secondary p-4 text-center">
                            <span className="material-symbols-outlined text-[48px] mb-1">id_card</span>
                            <span className="font-label-md text-label-md font-semibold text-on-surface">Chưa nộp ảnh CCCD</span>
                            <span className="font-label-sm text-label-sm text-secondary">Yêu cầu chủ gara bổ sung để xác minh danh tính</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 bg-on-background/85 text-surface-bright backdrop-blur-md p-1.5 rounded-md font-data-mono text-label-sm flex justify-between shadow-xs">
                          <span>CHỦ HỘ: {selectedApplicant.ownerName.toUpperCase()}</span>
                          <span>CCCD: {selectedApplicant.idCardNumber}</span>
                        </div>
                      </div>

                      {selectedApplicant.idCardUrl && (
                        <div className="mt-2 flex items-center justify-between text-secondary font-label-sm pt-1">
                          <span>Số định danh: <strong className="text-on-surface">{selectedApplicant.idCardNumber}</strong></span>
                          <button
                            onClick={() => openImagePreview(selectedApplicant.idCardUrl, `Căn cước công dân: ${selectedApplicant.ownerName}`, `Mã số: ${selectedApplicant.idCardNumber}`)}
                            className="text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">fullscreen</span>
                            Phóng to ảnh
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Business License Document Canvas */}
                  {(docTab === 'all' || docTab === 'business_license') && (
                    <div className="relative bg-surface-container-lowest rounded-lg p-space-sm shadow-xs flex flex-col border border-surface-container">
                      <div className="w-full flex items-center justify-between pb-2 border-b border-surface-container/60 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-primary text-[18px]">verified</span>
                          <span className="font-label-md text-label-md text-on-surface uppercase font-bold">
                            Giấy Phép Kinh Doanh & Con Dấu
                          </span>
                        </div>
                        <span
                          className={`font-data-mono text-label-sm px-2 py-0.5 rounded font-bold ${
                            selectedApplicant.businessLicenseUrl
                              ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                              : 'bg-surface-container-high text-secondary'
                          }`}
                        >
                          {selectedApplicant.businessLicenseUrl ? 'ĐÃ ĐỐI CHIẾU' : 'CHƯA TẢI LÊN'}
                        </span>
                      </div>

                      <div
                        onClick={() => openImagePreview(selectedApplicant.businessLicenseUrl, `Giấy phép kinh doanh: ${selectedApplicant.name}`, `Trụ sở: ${selectedApplicant.address}`)}
                        className="w-full h-56 overflow-hidden rounded-lg relative bg-surface-container-high flex items-center justify-center cursor-pointer group"
                      >
                        {selectedApplicant.businessLicenseUrl ? (
                          <>
                            <img
                              className="w-full h-full object-contain transition-transform duration-200 group-hover:scale-105"
                              alt="GPKD"
                              src={selectedApplicant.businessLicenseUrl}
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white gap-2 font-label-md font-bold">
                              <span className="material-symbols-outlined text-[24px]">zoom_in</span>
                              <span>Bấm để soi con dấu & ngành nghề</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center text-secondary p-4 text-center">
                            <span className="material-symbols-outlined text-[48px] mb-1">description</span>
                            <span className="font-label-md text-label-md font-semibold text-on-surface">Chưa tải lên Giấy phép kinh doanh</span>
                            <span className="font-label-sm text-label-sm text-secondary">Cần có GPKD ngành sửa chữa, bảo dưỡng mô tô - xe máy</span>
                          </div>
                        )}
                        <div className="absolute bottom-2 left-2 right-2 bg-on-background/85 text-surface-bright backdrop-blur-md p-1.5 rounded-md font-data-mono text-label-sm flex justify-between shadow-xs">
                          <span className="truncate max-w-[60%]">GARA: {selectedApplicant.name.toUpperCase()}</span>
                          <span>TRẠNG THÁI: {selectedApplicant.status}</span>
                        </div>
                      </div>

                      {selectedApplicant.businessLicenseUrl && (
                        <div className="mt-2 flex items-center justify-between text-secondary font-label-sm pt-1">
                          <span>Địa chỉ GPKD: <strong className="text-on-surface">{selectedApplicant.address}</strong></span>
                          <button
                            onClick={() => openImagePreview(selectedApplicant.businessLicenseUrl, `Giấy phép kinh doanh: ${selectedApplicant.name}`, `Trụ sở: ${selectedApplicant.address}`)}
                            className="text-primary hover:underline font-bold flex items-center gap-0.5 cursor-pointer"
                          >
                            <span className="material-symbols-outlined text-[14px]">fullscreen</span>
                            Phóng to ảnh
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Tab Chứng chỉ & Đội thợ cứu hộ */}
              {(docTab === 'all' || docTab === 'certificate') && (
                <div className="mt-space-sm bg-surface-container-low p-space-md rounded-lg border border-surface-container/40">
                  <div className="flex items-center justify-between pb-2 border-b border-surface-container/60 mb-space-sm">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-primary text-[20px]">engineering</span>
                      <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                        Hồ Sơ Năng Lực & Đội Thợ Trực Chiến ({mechanics.length} Nhân Sự)
                      </h4>
                    </div>
                    <span className="font-data-mono text-label-sm text-tertiary font-bold">
                      {mechanics.filter((m) => m.workingStatus === 'ONLINE' || m.workingStatus === 'BUSY').length} Thợ đang sẵn sàng
                    </span>
                  </div>

                  {detailLoading ? (
                    <div className="p-space-lg text-center text-secondary">
                      <span className="material-symbols-outlined text-[28px] animate-spin text-primary mb-1">
                        progress_activity
                      </span>
                      <p className="font-body-sm">Đang tải danh sách nhân sự từ hệ thống...</p>
                    </div>
                  ) : mechanics.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm">
                      {mechanics.map((m) => (
                        <div
                          key={m.id}
                          className="bg-surface-container-lowest p-space-sm rounded-lg border border-surface-container shadow-xs flex items-start gap-space-sm"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-label-lg shrink-0 shadow-xs">
                            {m.fullName?.charAt(0) || 'T'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-label-md text-label-md font-bold text-on-surface truncate">
                                {m.fullName}
                              </span>
                              <span
                                className={`font-data-mono text-label-sm px-1.5 py-0.2 rounded font-bold ${
                                  m.workingStatus === 'ONLINE'
                                    ? 'bg-tertiary/15 text-tertiary border border-tertiary/30'
                                    : m.workingStatus === 'BUSY'
                                      ? 'bg-error/15 text-error border border-error/30'
                                      : 'bg-surface-container-high text-secondary'
                                }`}
                              >
                                {m.workingStatus}
                              </span>
                            </div>
                            <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                              SĐT: <strong className="text-on-surface font-mono">{m.phone}</strong> • {m.branchName || 'Trụ sở chính'}
                            </p>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-label-sm font-semibold flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px]">handyman</span>
                                {m.speciality || 'Cứu hộ thủy kích & sấy bugi'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm font-medium flex items-center gap-1">
                                <span className="material-symbols-outlined text-[13px] text-amber-500">star</span>
                                {m.ratingAvg ? `${m.ratingAvg.toFixed(1)}/5.0` : 'Mới tham gia'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-space-lg text-center text-secondary bg-surface-container-lowest rounded-lg border border-surface-container">
                      <span className="material-symbols-outlined text-[32px] text-secondary/60 mb-1">group_off</span>
                      <p className="font-body-sm text-on-surface font-medium">Chưa có thông tin nhân viên thợ cứu hộ đăng ký.</p>
                      <p className="font-label-sm text-secondary mt-0.5">Gara cần bổ sung danh sách thợ cứu hộ trước khi kích hoạt tiếp nhận đơn.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Ghi chú thẩm định gần nhất */}
              {selectedApplicant.rejectionReason && (
                <div className="mt-space-sm p-space-sm bg-surface-container-low rounded-lg border-l-4 border-primary">
                  <div className="flex items-center gap-1.5 text-primary mb-1">
                    <span className="material-symbols-outlined text-[18px]">history_edu</span>
                    <span className="font-label-sm text-label-sm uppercase font-bold">
                      Ghi chú thẩm định gần nhất:
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface font-medium pl-6">
                    {selectedApplicant.rejectionReason}
                  </p>
                </div>
              )}
            </div>

            {/* Multi-Branch Verification Section (Có nút mở Google Maps trực tiếp) */}
            <div className="bg-surface-container-lowest p-space-md rounded-xl shadow-sm border border-surface-container">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-sm border-b border-surface-container mb-space-sm gap-2">
                <div>
                  <div className="flex items-center gap-space-xs">
                    <span className="material-symbols-outlined text-primary text-[22px]">storefront</span>
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      Mạng Lưới Chi Nhánh Thực Địa ({branches.length} Điểm)
                    </h3>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                    Kiểm định tọa độ GPS, năng lực phủ sóng vùng ngập và số lượng xe cứu hộ trực chiến tại cơ sở.
                  </p>
                </div>
                <span className="px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-md text-label-md font-bold self-start sm:self-auto">
                  {branches.length} CHI NHÁNH HOẠT ĐỘNG
                </span>
              </div>

              {detailLoading ? (
                <div className="p-space-lg text-center text-secondary">
                  <span className="material-symbols-outlined text-[28px] animate-spin text-primary mb-1">progress_activity</span>
                  <p className="font-body-sm">Đang tải mạng lưới chi nhánh từ API...</p>
                </div>
              ) : branches.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-sm">
                  {branches.map((b) => {
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${b.latitude},${b.longitude}`;
                    return (
                      <div
                        key={b.id}
                        className="bg-surface-container-low p-space-md rounded-lg flex flex-col justify-between border border-surface-container/60 shadow-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between pb-1.5 border-b border-surface-container/60">
                            <span className="font-label-lg text-label-lg font-bold text-on-surface flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-primary text-[18px]">home_repair_service</span>
                              {b.branchName}
                            </span>
                            <span
                              className={`font-data-mono text-label-sm px-2 py-0.5 rounded-full font-bold ${
                                b.operatingStatus === 'OPEN'
                                  ? 'bg-tertiary text-on-tertiary'
                                  : 'bg-surface-container-high text-secondary'
                              }`}
                            >
                              {b.operatingStatus === 'OPEN' ? 'ĐANG MỞ CỬA' : b.operatingStatus}
                            </span>
                          </div>

                          <p className="font-body-sm text-body-sm font-semibold text-on-surface mt-2 flex items-start gap-1">
                            <span className="material-symbols-outlined text-secondary text-[16px] shrink-0 mt-0.5">location_on</span>
                            <span>{b.address}</span>
                          </p>

                          {b.phoneNumber && (
                            <p className="font-body-sm text-body-sm text-secondary mt-1 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">call</span>
                              Hotline: <strong className="text-primary font-mono">{b.phoneNumber}</strong>
                            </p>
                          )}

                          {b.rescueVehicles && (
                            <div className="mt-2.5 bg-primary/10 text-primary p-2 rounded-md font-label-sm text-label-sm font-semibold flex items-center gap-1.5">
                              <span className="material-symbols-outlined text-[16px]">local_shipping</span>
                              <span>{b.rescueVehicles}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 pt-2 text-secondary font-label-sm text-label-sm flex items-center justify-between border-t border-surface-container/60 flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">
                              {b.latitude?.toFixed(4)}, {b.longitude?.toFixed(4)}
                            </span>
                            <a
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-0.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold flex items-center gap-1 transition shadow-xs"
                            >
                              <span className="material-symbols-outlined text-[14px]">map</span>
                              Google Maps
                            </a>
                          </div>
                          <span className="text-tertiary font-bold flex items-center gap-1">
                            <span className="material-symbols-outlined text-[15px]">engineering</span>
                            {b.mechanicsCount || 0} Thợ trực chiến
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-surface-container-low p-space-lg rounded-lg text-center text-secondary border border-surface-container">
                  <span className="material-symbols-outlined text-[36px] mb-1 text-secondary/60 block">storefront</span>
                  <p className="font-body-sm text-on-surface font-semibold">Chưa có chi nhánh nào được đăng ký.</p>
                  <p className="font-label-sm text-secondary mt-0.5">Hồ sơ này chỉ có thông tin trụ sở chính.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="col-span-12 lg:col-span-7 xl:col-span-8 bg-surface-container-lowest p-space-xl rounded-xl shadow-sm border border-surface-container text-center text-secondary">
            <span className="material-symbols-outlined text-[56px] text-secondary/40 mb-2">fact_check</span>
            <h3 className="font-headline-md text-headline-md text-on-surface font-bold">Chưa chọn hồ sơ gara nào</h3>
            <p className="font-body-sm text-body-sm text-secondary mt-1 max-w-md mx-auto">
              Vui lòng nhấp vào một hồ sơ gara ở danh sách bên trái để đối chiếu văn bản pháp lý, thẩm định chi nhánh và đội thợ.
            </p>
          </div>
        )}
      </div>

      {/* STICKY ACTION BOTTOM TOOLBAR */}
      {selectedApplicant && (
        <aside className="fixed bottom-0 left-0 lg:left-64 right-0 bg-surface-container-lowest/95 backdrop-blur-md shadow-[0_-4px_20px_rgba(0,0,0,0.12)] z-40 px-4 sm:px-8 py-3 border-t border-surface-container transition-all">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 max-w-full">
            {/* Quick Note Input */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-surface-container-high flex items-center justify-center text-on-surface shrink-0 shadow-xs">
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
              </div>
              <div className="flex-1 relative flex items-center gap-2">
                <input
                  className="w-full h-10 pl-3 pr-3 text-body-sm font-body-sm bg-surface-container-low rounded-lg border border-surface-container text-on-surface placeholder-secondary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  placeholder="Ghi chú thẩm định (VD: Đã gọi điện xác minh, cơ sở vật chất đạt chuẩn...)"
                  type="text"
                  value={auditorNote}
                  onChange={(e) => setAuditorNote(e.target.value)}
                />
                <button
                  onClick={handleSaveQuickNote}
                  disabled={isSubmitting}
                  className="px-3 py-2 rounded-lg bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-label-md text-label-md font-bold shrink-0 cursor-pointer transition"
                  title="Lưu ghi chú này vào hệ thống"
                >
                  Lưu Note
                </button>
              </div>
            </div>

            {/* Action Decision Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {selectedApplicant.status === 'PENDING' && (
                <>
                  <button
                    disabled={isSubmitting}
                    onClick={() => openActionModal('REJECT')}
                    className="bg-error text-on-error hover:bg-error/90 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-1.5 transition-colors cursor-pointer font-bold shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    <span>Từ Chối Hồ Sơ</span>
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => openActionModal('REQUEST_DOCS')}
                    className="bg-surface-container-high text-on-surface hover:bg-surface-container-highest px-space-md py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-1.5 transition-colors cursor-pointer font-bold border border-surface-container shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">pending_actions</span>
                    <span>Yêu Cầu Bổ Sung Giấy Tờ</span>
                  </button>

                  <button
                    disabled={isSubmitting}
                    onClick={() => openActionModal('APPROVE')}
                    className="bg-primary text-on-primary hover:bg-primary/90 px-space-lg py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-2 shadow-sm transition-all transform active:scale-95 cursor-pointer font-bold"
                  >
                    <span className="material-symbols-outlined text-[20px]">how_to_reg</span>
                    <span>Phê Duyệt & Kích Hoạt Garage</span>
                  </button>
                </>
              )}

              {selectedApplicant.status === 'APPROVED' && (
                <>
                  <span className="px-3 py-1.5 rounded-full bg-tertiary/15 text-tertiary font-bold text-label-md flex items-center gap-1 border border-tertiary/30">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    <span>Garage đã kích hoạt</span>
                  </span>
                  <button
                    disabled={isSubmitting}
                    onClick={() => openActionModal('SUSPEND')}
                    className="bg-amber-600 text-white hover:bg-amber-700 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-1.5 transition-colors cursor-pointer font-bold shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                    <span>Tạm Dừng Hoạt Động (Suspend)</span>
                  </button>
                </>
              )}

              {selectedApplicant.status === 'REJECTED' && (
                <>
                  <span className="px-3 py-1.5 rounded-full bg-error/15 text-error font-bold text-label-md flex items-center gap-1 border border-error/30">
                    <span className="material-symbols-outlined text-[18px]">cancel</span>
                    <span>Hồ sơ đã bị từ chối</span>
                  </span>
                  <button
                    disabled={isSubmitting}
                    onClick={() => openActionModal('APPROVE')}
                    className="bg-primary text-on-primary hover:bg-primary/90 px-space-lg py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-1.5 cursor-pointer font-bold shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">refresh</span>
                    <span>Xem Xét & Phê Duyệt Lại</span>
                  </button>
                </>
              )}

              {selectedApplicant.status === 'SUSPENDED' && (
                <>
                  <span className="px-3 py-1.5 rounded-full bg-amber-100 text-amber-900 font-bold text-label-md flex items-center gap-1 border border-amber-300">
                    <span className="material-symbols-outlined text-[18px]">warning</span>
                    <span>Đang bị đình chỉ</span>
                  </span>
                  <button
                    disabled={isSubmitting}
                    onClick={() => openActionModal('APPROVE')}
                    className="bg-primary text-on-primary hover:bg-primary/90 px-space-lg py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-1.5 cursor-pointer font-bold shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">bolt</span>
                    <span>Kích Hoạt Lại Hoạt Động</span>
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={() => openActionModal('REJECT')}
                    className="bg-error text-on-error hover:bg-error/90 px-space-md py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-1.5 cursor-pointer font-bold shadow-xs"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                    <span>Từ Chối Hẳn</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </aside>
      )}

      {/* COMPREHENSIVE ACTION CONFIRMATION MODAL */}
      {actionModal.isOpen && selectedApplicant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest max-w-lg w-full p-space-xl rounded-2xl shadow-2xl border border-surface-container transform transition-all">
            {/* Header Modal */}
            <div className="flex items-center gap-space-md mb-space-md">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                  actionModal.type === 'APPROVE'
                    ? 'bg-primary-container text-on-primary-container'
                    : actionModal.type === 'REJECT'
                      ? 'bg-error-container text-on-error-container'
                      : actionModal.type === 'REQUEST_DOCS'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-amber-100 text-amber-900'
                }`}
              >
                <span className="material-symbols-outlined text-[28px]">
                  {actionModal.type === 'APPROVE'
                    ? 'how_to_reg'
                    : actionModal.type === 'REJECT'
                      ? 'gavel'
                      : actionModal.type === 'REQUEST_DOCS'
                        ? 'pending_actions'
                        : 'pause_circle'}
                </span>
              </div>
              <div>
                <h4 className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
                  {actionModal.title}
                </h4>
                <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                  Mã gara: <strong className="text-on-surface font-mono">{selectedApplicant.id}</strong> • Hotline: {selectedApplicant.phone}
                </p>
              </div>
            </div>

            {/* Nội dung cảnh báo & hướng dẫn */}
            <div className="mb-space-md">
              {actionModal.type === 'APPROVE' && (
                <div className="p-3 bg-primary/10 rounded-lg text-on-surface font-body-sm mb-3 border border-primary/20">
                  <p className="font-semibold text-primary mb-1">Quyền lợi sau kích hoạt:</p>
                  <p>
                    Gara <strong>{selectedApplicant.name}</strong> sẽ ngay lập tức được hệ thống cấp quyền tiếp nhận đơn cứu hộ ngập lụt từ người dân trong khu vực và điều phối {mechanics.length} thợ cơ động.
                  </p>
                </div>
              )}

              {actionModal.type === 'REJECT' && (
                <div className="p-3 bg-red-50 rounded-lg text-red-900 font-body-sm mb-3 border border-red-200">
                  <p className="font-semibold text-red-700 mb-1">Cảnh báo từ chối:</p>
                  <p>Hồ sơ sẽ bị chuyển về trạng thái <strong>ĐÃ TỪ CHỐI</strong>. Chủ gara sẽ nhận được thông báo kèm lý do chi tiết dưới đây.</p>
                </div>
              )}

              {actionModal.type === 'REQUEST_DOCS' && (
                <div className="p-3 bg-blue-50 rounded-lg text-blue-900 font-body-sm mb-3 border border-blue-200">
                  <p className="font-semibold text-blue-800 mb-1">Yêu cầu bổ sung hồ sơ:</p>
                  <p>Chủ gara sẽ nhận được hướng dẫn cụ thể về các giấy tờ, thông tin cần cập nhật lại trên ứng dụng.</p>
                </div>
              )}

              {actionModal.type === 'SUSPEND' && (
                <div className="p-3 bg-amber-50 rounded-lg text-amber-900 font-body-sm mb-3 border border-amber-200">
                  <p className="font-semibold text-amber-800 mb-1">Cảnh báo đình chỉ hoạt động:</p>
                  <p>Gara sẽ bị <strong>ngừng nhận tất cả đơn cứu hộ mới</strong> cho đến khi thẩm định viên kích hoạt lại.</p>
                </div>
              )}

              {/* Ô nhập lý do / ghi chú thẩm định */}
              <div>
                <label className="font-label-sm text-label-sm font-bold text-on-surface block mb-1.5 uppercase">
                  Lý do / Ghi chú kiểm duyệt: <span className="text-error">*</span>
                </label>
                <textarea
                  rows={3}
                  className="w-full p-3 text-body-sm bg-surface-container-low rounded-lg border border-surface-container text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 font-body-sm"
                  placeholder="Nhập lý do chi tiết để lưu vào hệ thống và gửi đến chủ gara..."
                  value={actionModal.note}
                  onChange={(e) => setActionModal((prev) => ({ ...prev, note: e.target.value }))}
                />
              </div>

              {/* Mẫu lý do nhanh cho Thẩm định viên */}
              {(actionModal.type === 'REJECT' || actionModal.type === 'REQUEST_DOCS' || actionModal.type === 'SUSPEND') && (
                <div className="mt-2">
                  <span className="font-label-sm text-label-sm text-secondary block mb-1">Mẫu lý do nhanh:</span>
                  <div className="flex flex-wrap gap-1">
                    {actionModal.type === 'REQUEST_DOCS' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActionModal((p) => ({ ...p, note: 'Vui lòng chụp lại ảnh CCCD gắn chip 2 mặt rõ nét, không bị lóa hoặc mất góc.' }))}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs cursor-pointer"
                        >
                          CCCD mờ/mất góc
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionModal((p) => ({ ...p, note: 'Vui lòng bổ sung Giấy phép đăng ký kinh doanh có mộc đỏ hợp lệ.' }))}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs cursor-pointer"
                        >
                          Thiếu GPKD mộc đỏ
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionModal((p) => ({ ...p, note: 'Vui lòng cập nhật số điện thoại hotline và địa chỉ chi nhánh chính xác.' }))}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs cursor-pointer"
                        >
                          Sai địa chỉ/hotline
                        </button>
                      </>
                    )}
                    {actionModal.type === 'REJECT' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActionModal((p) => ({ ...p, note: 'Giấy phép kinh doanh không đúng ngành nghề sửa chữa, bảo dưỡng cứu hộ xe mô tô.' }))}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs cursor-pointer"
                        >
                          Sai ngành nghề GPKD
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionModal((p) => ({ ...p, note: 'Không thể xác thực thông tin chủ cơ sở qua số điện thoại hoặc thực địa.' }))}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs cursor-pointer"
                        >
                          Không xác minh được
                        </button>
                      </>
                    )}
                    {actionModal.type === 'SUSPEND' && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActionModal((p) => ({ ...p, note: 'Tạm dừng để rà soát quy trình an toàn kỹ thuật và trang bị cứu hộ ngập lụt.' }))}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs cursor-pointer"
                        >
                          Rà soát an toàn
                        </button>
                        <button
                          type="button"
                          onClick={() => setActionModal((p) => ({ ...p, note: 'Khu vực xung quanh cơ sở gara đang bị ngập nặng, không đảm bảo tiếp nhận xe.' }))}
                          className="px-2 py-1 rounded bg-surface-container-high hover:bg-surface-container-highest text-secondary text-xs cursor-pointer"
                        >
                          Ngập úng cục bộ
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-space-sm pt-space-xs border-t border-surface-container">
              <button
                disabled={isSubmitting}
                onClick={() => setActionModal({ isOpen: false, type: null, title: '', note: '' })}
                className="px-space-md py-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg cursor-pointer transition"
              >
                Hủy Bỏ
              </button>
              <button
                disabled={isSubmitting}
                onClick={handleConfirmAction}
                className={`px-space-lg py-2.5 rounded-lg font-label-lg text-label-lg flex items-center gap-1.5 cursor-pointer font-bold shadow-xs transition ${
                  actionModal.type === 'APPROVE'
                    ? 'bg-primary text-on-primary hover:bg-primary/90'
                    : actionModal.type === 'REJECT'
                      ? 'bg-error text-on-error hover:bg-error/90'
                      : actionModal.type === 'REQUEST_DOCS'
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-amber-600 text-white hover:bg-amber-700'
                }`}
              >
                <span className={`material-symbols-outlined text-[18px] ${isSubmitting ? 'animate-spin' : ''}`}>
                  {isSubmitting ? 'progress_activity' : 'check'}
                </span>
                <span>{isSubmitting ? 'Đang thực hiện...' : 'Xác Nhận Thao Tác'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX / FULLSCREEN IMAGE PREVIEW MODAL */}
      {imagePreview && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex flex-col justify-between p-4 animate-fade-in">
          {/* Header Lightbox */}
          <div className="flex items-center justify-between text-white pb-3 px-2 border-b border-white/20">
            <div>
              <h3 className="font-headline-md text-headline-md font-bold text-white">{imagePreview.title}</h3>
              {imagePreview.subtitle && (
                <p className="font-body-sm text-body-sm text-white/70 mt-0.5">{imagePreview.subtitle}</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 3))}
                title="Phóng to"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">zoom_in</span>
              </button>
              <button
                onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.5))}
                title="Thu nhỏ"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">zoom_out</span>
              </button>
              <button
                onClick={() => setRotation((r) => (r + 90) % 360)}
                title="Xoay ảnh 90 độ"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">rotate_right</span>
              </button>
              <a
                href={imagePreview.url}
                target="_blank"
                rel="noopener noreferrer"
                title="Mở ảnh trong tab mới"
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">open_in_new</span>
              </a>
              <button
                onClick={() => {
                  setImagePreview(null);
                  setZoomLevel(1);
                  setRotation(0);
                }}
                title="Đóng (Esc)"
                className="p-2 rounded-lg bg-white/20 hover:bg-red-600 text-white transition cursor-pointer ml-2"
              >
                <span className="material-symbols-outlined text-[22px]">close</span>
              </button>
            </div>
          </div>

          {/* Canvas Image Container */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-4">
            <img
              src={imagePreview.url}
              alt={imagePreview.title}
              style={{
                transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
                transition: 'transform 0.15s ease-out'
              }}
              className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          {/* Footer Lightbox */}
          <div className="text-center text-white/60 font-label-sm text-label-sm py-2">
            Độ thu phóng: {Math.round(zoomLevel * 100)}% • Góc xoay: {rotation}° • Nhấn phím <kbd className="px-1.5 py-0.5 bg-white/20 rounded text-white">Esc</kbd> để đóng
          </div>
        </div>
      )}
    </div>
  );
};
export default GarageVerificationView
