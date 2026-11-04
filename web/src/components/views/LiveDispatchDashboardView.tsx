import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ViewGuide } from '../ViewGuide';
import { ScreenId } from '../../types';
import { rescueApi, RescueOrderWebResponse } from '../../services/rescueApi';
import { garageApi, GarageMechanicBackend } from '../../services/garageApi';

interface LiveDispatchDashboardViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

export interface LiveOrder {
  id: string;
  rawId: number;
  customerName: string;
  phone: string;
  location: string;
  pickupLat?: number;
  pickupLng?: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  district: string;
  vehicle: string;
  waterDepth: string;
  status: 'PENDING_DISPATCH' | 'EN_ROUTE' | 'REPAIRING' | 'RESOLVED' | 'CANCELLED';
  rawStatus: string;
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
  assignedTech?: string;
  assignedTechId?: number;
  techPhone?: string;
  techAvatar?: string;
  techSpeciality?: string;
  garageId?: number;
  garageName?: string;
  timeRequested: string;
  estimatedArrivalMin?: number;
  issue: string;
  rawOrder: RescueOrderWebResponse;
}

// Tính khoảng cách Haversine giữa 2 tọa độ (km)
function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Bán kính Trái Đất (km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Chuẩn hóa và nhận diện Quận từ chuỗi địa chỉ
function extractDistrict(address: string): string {
  if (!address) return 'Chưa xác định';
  const match = address.match(/(quận\s*\d+|q\.\s*\d+|q\s*\d+|thủ đức|bình thạnh|gò vấp|phú nhuận|tân bình|tân phú|bình tân|nhà bè|hóc môn|bình chánh|củ chi|cần giờ|quận\s*[a-zà-ỹ]+)/i);
  if (match) {
    const raw = match[0].trim();
    return raw.replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
  }
  return 'Khu vực khác';
}

// Phân cấp mức độ khẩn cấp dựa trên mực nước hoặc từ khóa
function evaluateUrgency(waterLevel?: string, notes?: string): 'HIGH' | 'MEDIUM' | 'NORMAL' {
  const text = `${waterLevel || ''} ${notes || ''}`.toLowerCase();
  if (
    text.includes('40') ||
    text.includes('45') ||
    text.includes('50') ||
    text.includes('60') ||
    text.includes('70') ||
    text.includes('80') ||
    text.includes('ngập yên') ||
    text.includes('lốc máy') ||
    text.includes('ngập sâu') ||
    text.includes('chết máy') ||
    text.includes('cuốn trôi')
  ) {
    return 'HIGH';
  }
  if (text.includes('25') || text.includes('30') || text.includes('35') || text.includes('nước tràn')) {
    return 'MEDIUM';
  }
  return 'NORMAL';
}

export const LiveDispatchDashboardView: React.FC<LiveDispatchDashboardViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [backendOrders, setBackendOrders] = useState<RescueOrderWebResponse[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Phân trang danh sách ca cứu hộ (Orders List)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  // Kỹ thuật viên thật lấy từ API theo Gara của đơn được chọn
  const [garageMechanics, setGarageMechanics] = useState<GarageMechanicBackend[]>([]);
  const [loadingMechanics, setLoadingMechanics] = useState(false);
  const [dispatchingTechId, setDispatchingTechId] = useState<number | null>(null);
  const [retryingDispatch, setRetryingDispatch] = useState(false);

  // Phân trang và lọc danh sách KTV trong Inspector
  const [techOnlyActive, setTechOnlyActive] = useState(false);
  const [techCurrentPage, setTechCurrentPage] = useState(1);
  const techPageSize = 4;

  // Modal hủy đơn khẩn cấp
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await rescueApi.getStaffOrders();
      setBackendOrders(data || []);
      setLastRefreshed(new Date());
    } catch (err: any) {
      setFetchError(err?.message || 'Không thể kết nối đến máy chủ quản lý điều phối.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Map đơn thật từ backend
  const mappedOrders: LiveOrder[] = useMemo(() => {
    return backendOrders.map((bo) => {
      const isPending = bo.status === 'REQUESTED' || bo.status === 'DISPATCH_FAILED';
      const isEnRoute = bo.status === 'DISPATCHED' || bo.status === 'ARRIVED';
      const isInProgress = bo.status === 'IN_PROGRESS';
      const isCancelled = bo.status === 'CANCELLED';
      const isResolved = bo.status === 'COMPLETED' || bo.status === 'PAYMENT_PENDING';

      const status: LiveOrder['status'] = isCancelled
        ? 'CANCELLED'
        : isPending
        ? 'PENDING_DISPATCH'
        : isEnRoute
        ? 'EN_ROUTE'
        : isInProgress
        ? 'REPAIRING'
        : 'RESOLVED';

      const district = extractDistrict(bo.pickupAddress);
      const urgency = evaluateUrgency(bo.waterLevel, bo.customerNotes);

      // Tính thời gian đến dựa trên GPS thực tế nếu có
      let estimatedArrivalMin: number | undefined;
      if (
        (bo.status === 'DISPATCHED' || bo.status === 'ARRIVED') &&
        bo.mechanicCurrentLatitude &&
        bo.mechanicCurrentLongitude &&
        bo.pickupLatitude &&
        bo.pickupLongitude
      ) {
        const distKm = calculateHaversineDistance(
          bo.mechanicCurrentLatitude,
          bo.mechanicCurrentLongitude,
          bo.pickupLatitude,
          bo.pickupLongitude
        );
        estimatedArrivalMin = Math.max(2, Math.round((distKm / 20) * 60));
      } else if (bo.status === 'DISPATCHED') {
        estimatedArrivalMin = 8;
      }

      const issueText = bo.customerNotes
        ? bo.customerNotes
        : bo.serviceName
        ? `${bo.serviceName} (${bo.orderType || 'Cứu hộ'})`
        : `Chở xe qua vùng ngập · Mốc: ${bo.transportStage || 'Tiếp nhận'}`;

      return {
        id: bo.orderCode,
        rawId: bo.id,
        customerName: bo.customerName || `Khách hàng #${bo.customerId}`,
        phone: bo.customerPhone || 'Chưa cung cấp',
        location: bo.pickupAddress,
        pickupLat: bo.pickupLatitude,
        pickupLng: bo.pickupLongitude,
        dropoffAddress: bo.dropoffAddress,
        dropoffLat: bo.dropoffLatitude,
        dropoffLng: bo.dropoffLongitude,
        district,
        vehicle: `${bo.vehicleModel || 'Xe máy'} (${bo.vehiclePlate || 'Biển số chưa rõ'})`,
        waterDepth: bo.waterLevel || 'Ngập lụt',
        status,
        rawStatus: bo.status,
        urgency,
        assignedTech: bo.mechanicName ? `${bo.mechanicName} (KTV-${bo.mechanicStaffId ?? 'N/A'})` : undefined,
        assignedTechId: bo.mechanicStaffId ?? undefined,
        techPhone: bo.mechanicPhone || undefined,
        techAvatar: bo.mechanicAvatar || undefined,
        techSpeciality: bo.mechanicSpeciality || undefined,
        garageId: bo.garageId,
        garageName: bo.garageName,
        timeRequested: bo.requestedAt
          ? new Date(bo.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
          : 'Vừa xong',
        estimatedArrivalMin,
        issue: issueText,
        rawOrder: bo
      };
    });
  }, [backendOrders]);

  // Đơn được chọn
  const selectedOrder = useMemo(() => {
    if (!selectedOrderId && mappedOrders.length > 0) {
      return mappedOrders[0];
    }
    return mappedOrders.find((o) => o.id === selectedOrderId) || null;
  }, [mappedOrders, selectedOrderId]);

  // Load danh sách thợ thật từ Gara của đơn hàng được chọn
  useEffect(() => {
    if (selectedOrder && selectedOrder.garageId) {
      setLoadingMechanics(true);
      garageApi
        .getGarageMechanics(selectedOrder.garageId)
        .then((techs) => {
          setGarageMechanics(techs || []);
          setTechCurrentPage(1);
        })
        .catch(() => {
          setGarageMechanics([]);
        })
        .finally(() => {
          setLoadingMechanics(false);
        });
    } else {
      setGarageMechanics([]);
    }
  }, [selectedOrder?.garageId, selectedOrder?.id]);

  // Danh sách các quận động từ dữ liệu thực tế
  const dynamicDistricts = useMemo(() => {
    const set = new Set<string>();
    mappedOrders.forEach((o) => {
      if (o.district && o.district !== 'Chưa xác định') {
        set.add(o.district);
      }
    });
    return Array.from(set).sort();
  }, [mappedOrders]);

  // Lọc danh sách đơn
  const filteredOrders = useMemo(() => {
    return mappedOrders.filter((o) => {
      if (selectedDistrict !== 'ALL' && o.district !== selectedDistrict) return false;
      if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;
      if (searchFilter) {
        const q = searchFilter.toLowerCase();
        return (
          o.id.toLowerCase().includes(q) ||
          o.customerName.toLowerCase().includes(q) ||
          o.phone.includes(q) ||
          o.vehicle.toLowerCase().includes(q) ||
          o.location.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [mappedOrders, selectedDistrict, selectedStatus, searchFilter]);

  // Tự động reset về trang 1 khi đổi bộ lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedDistrict, selectedStatus, searchFilter]);

  // Tính toán phân trang cho danh sách ca cứu hộ
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Tạo mảng số trang hiển thị
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  }, [currentPage, totalPages]);

  // Lọc và phân trang cho danh sách KTV trong Inspector
  const filteredTechs = useMemo(() => {
    if (techOnlyActive) {
      return garageMechanics.filter((m) => m.workingStatus === 'ACTIVE');
    }
    return garageMechanics;
  }, [garageMechanics, techOnlyActive]);

  const totalTechPages = Math.max(1, Math.ceil(filteredTechs.length / techPageSize));
  const paginatedTechs = useMemo(() => {
    const start = (techCurrentPage - 1) * techPageSize;
    return filteredTechs.slice(start, start + techPageSize);
  }, [filteredTechs, techCurrentPage, techPageSize]);

  // Gọi API Điều phối KTV thật
  const handleAssignMechanic = async (orderId: number, mechanicStaffId: number, techName: string) => {
    try {
      setDispatchingTechId(mechanicStaffId);
      await rescueApi.assignMechanic(orderId, mechanicStaffId);
      onShowToast('Điều Phối Thành Công', `Đã điều động kỹ thuật viên ${techName} cho đơn #${orderId}`);
      await fetchOrders();
      if (selectedOrder?.garageId) {
        const techs = await garageApi.getGarageMechanics(selectedOrder.garageId);
        setGarageMechanics(techs || []);
      }
    } catch (err: any) {
      onShowToast('Lỗi Điều Phối', err?.message || 'Không thể điều phối kỹ thuật viên này. Vui lòng thử lại.');
    } finally {
      setDispatchingTechId(null);
    }
  };

  // Kích hoạt tìm lại KTV tự động
  const handleRetryDispatch = async (orderId: number) => {
    try {
      setRetryingDispatch(true);
      await rescueApi.retryDispatch(orderId);
      onShowToast('Đã Gửi Lệnh', `Hệ thống đang mở rộng tìm kiếm kỹ thuật viên cho đơn #${orderId}`);
      await fetchOrders();
    } catch (err: any) {
      onShowToast('Thất Bại', err?.message || 'Không thể kích hoạt tìm lại KTV.');
    } finally {
      setRetryingDispatch(false);
    }
  };

  // Hủy ca cứu hộ khẩn cấp
  const handleConfirmCancelOrder = async () => {
    if (!selectedOrder) return;
    try {
      setIsCancelling(true);
      await rescueApi.cancelStaffOrder(selectedOrder.rawId, cancelReason || 'Nhân viên trực ban hủy theo yêu cầu');
      onShowToast('Đã Hủy Ca Cứu Hộ', `Ca cứu hộ ${selectedOrder.id} đã được đánh dấu hủy.`);
      setShowCancelModal(false);
      setCancelReason('');
      await fetchOrders();
    } catch (err: any) {
      onShowToast('Lỗi Hủy Ca', err?.message || 'Không thể hủy ca cứu hộ lúc này.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Sao chép văn bản
  const handleCopy = (text: string, label: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      onShowToast('Đã Sao Chép', `Đã chép ${label} vào bộ nhớ tạm: ${text}`);
    }
  };

  // Tổng số thợ rảnh từ Gara được chọn
  const availableTechsCount = useMemo(() => {
    return garageMechanics.filter((m) => m.workingStatus === 'ACTIVE').length;
  }, [garageMechanics]);

  return (
    <div className="space-y-space-xl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Điều phối cứu hộ</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-bold bg-red-100 text-red-700 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-600"></span>
              Trực tiếp
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-xs font-semibold bg-blue-100 text-blue-800">
              <span className="material-symbols-outlined text-[14px]">bolt</span>
              {backendOrders.length} ca trên hệ thống
            </span>
          </div>
          <ViewGuide>
            <p className="font-body-md text-body-md text-secondary">
              Giám sát đơn kêu cứu thời gian thực, điều phối kỹ thuật viên của Gara và can thiệp xử lý nhanh các ca ngập sâu.
            </p>
          </ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all shadow-xs"
            title="Làm mới dữ liệu từ server"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            onClick={() => onSelectScreen('moderation')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">flood</span>
            <span>Bản đồ ngập</span>
          </button>
        </div>
      </div>

      {/* Error Alert Banner nếu fetch thất bại */}
      {fetchError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-red-800 text-body-sm shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-red-600 text-[22px]">error</span>
            <div>
              <strong>Lỗi kết nối máy chủ:</strong> {fetchError}
            </div>
          </div>
          <button
            onClick={() => fetchOrders()}
            className="px-3 py-1 bg-red-600 text-white rounded font-label-xs font-bold hover:bg-red-700 transition-all"
          >
            Thử lại ngay
          </button>
        </div>
      )}

      {/* 5 Real-Time KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Chờ Điều Phối</span>
          <div className="text-2xl font-bold text-red-600 font-data-mono mt-1">
            {mappedOrders.filter((o) => o.status === 'PENDING_DISPATCH').length} đơn
          </div>
          <span className="text-label-xs text-red-700">Yêu cầu can thiệp &lt; 45s</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">KTV Đang Di Chuyển</span>
          <div className="text-2xl font-bold text-amber-600 font-data-mono mt-1">
            {mappedOrders.filter((o) => o.status === 'EN_ROUTE').length} ca
          </div>
          <span className="text-label-xs text-secondary">Đang dẫn đường tới điểm đón</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Đang Chở Xe / Xử Lý</span>
          <div className="text-2xl font-bold text-blue-600 font-data-mono mt-1">
            {mappedOrders.filter((o) => o.status === 'REPAIRING').length} xe
          </div>
          <span className="text-label-xs text-secondary">Vận chuyển qua vùng ngập</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">KTV Sẵn Sàng (Trạm chọn)</span>
          <div className="text-2xl font-bold text-emerald-600 font-data-mono mt-1">
            {selectedOrder ? `${availableTechsCount} thợ` : '—'}
          </div>
          <span className="text-label-xs text-emerald-700 truncate block">
            {selectedOrder?.garageName || 'Chọn đơn để xem thợ'}
          </span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Hoàn Thành / Chờ TT</span>
          <div className="text-2xl font-bold text-on-surface font-data-mono mt-1">
            {mappedOrders.filter((o) => o.status === 'RESOLVED').length} ca
          </div>
          <span className="text-label-xs text-tertiary">Đã có ảnh nghiệm thu bàn giao</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl border border-surface-container">
        <div className="flex items-center gap-space-sm flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1 text-label-sm font-semibold text-secondary mr-1">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            <span>Bộ lọc:</span>
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-surface-container rounded font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Tất cả khu vực ({dynamicDistricts.length} quận có đơn)</option>
            {dynamicDistricts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-surface-container rounded font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING_DISPATCH">Chờ điều phối khẩn cấp</option>
            <option value="EN_ROUTE">KTV đang di chuyển</option>
            <option value="REPAIRING">Đang chở xe / xử lý</option>
            <option value="RESOLVED">Đã hoàn thành / Chờ thanh toán</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>

          {(selectedDistrict !== 'ALL' || selectedStatus !== 'ALL' || searchFilter) && (
            <button
              onClick={() => {
                setSelectedDistrict('ALL');
                setSelectedStatus('ALL');
                setSearchFilter('');
              }}
              className="text-label-xs text-primary font-semibold hover:underline px-2 py-1"
            >
              Đặt lại
            </button>
          )}
        </div>

        <div className="w-full md:w-80">
          <input
            type="text"
            placeholder="Tìm theo mã đơn, tên khách, SĐT, biển số, địa chỉ..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-surface-container-low border border-surface-container rounded font-body-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Grid: Live Orders Feed & Quick Dispatch Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Left Column: Live Orders Feed */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Ca cứu hộ ({filteredOrders.length})
            </h2>
            <span className="text-label-sm text-secondary">
              Cập nhật lúc: {lastRefreshed.toLocaleTimeString('vi-VN')}
            </span>
          </div>

          {/* Skeleton loading ban đầu */}
          {loading && backendOrders.length === 0 && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="p-4 rounded-xl border border-surface-container bg-surface-container-lowest animate-pulse space-y-3">
                  <div className="h-5 bg-surface-container-high rounded w-1/3"></div>
                  <div className="h-4 bg-surface-container rounded w-3/4"></div>
                  <div className="h-4 bg-surface-container rounded w-1/2"></div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State khi không có ca nào */}
          {!loading && filteredOrders.length === 0 && (
            <div className="p-12 text-center rounded-xl border border-dashed border-surface-container bg-surface-container-lowest space-y-3">
              <span className="material-symbols-outlined text-5xl text-outline-variant">check_circle</span>
              <h3 className="font-headline-sm font-bold text-on-surface">Không có ca cứu hộ nào phù hợp</h3>
              <p className="text-body-sm text-secondary max-w-md mx-auto">
                {backendOrders.length === 0
                  ? 'Hiện tại không có yêu cầu cứu hộ nào phát sinh trên hệ thống. Dữ liệu sẽ tự động đồng bộ khi khách hàng tạo cuốc mới.'
                  : 'Không có ca cứu hộ nào khớp với bộ lọc khu vực hoặc từ khóa tìm kiếm của bạn.'}
              </p>
              {(selectedDistrict !== 'ALL' || selectedStatus !== 'ALL' || searchFilter) && (
                <button
                  onClick={() => {
                    setSelectedDistrict('ALL');
                    setSelectedStatus('ALL');
                    setSearchFilter('');
                  }}
                  className="px-4 py-2 bg-primary text-on-primary rounded font-label-md font-semibold hover:bg-primary/90 transition-all"
                >
                  Xóa toàn bộ bộ lọc
                </button>
              )}
            </div>
          )}

          {/* Danh sách ca cứu hộ (đã phân trang) */}
          <div className="space-y-space-sm">
            {paginatedOrders.map((order) => {
              const isSelected = selectedOrder?.id === order.id;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`p-space-lg rounded-xl border transition-all cursor-pointer bg-surface-container-lowest hover:shadow-md ${
                    isSelected
                      ? 'border-primary ring-1 ring-primary'
                      : order.status === 'PENDING_DISPATCH'
                      ? 'border-red-300 bg-red-50/20'
                      : 'border-surface-container'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-2 mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-data-mono font-bold text-primary">{order.id}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        {order.rawOrder.orderType || 'SINGLE_CROSSING'}
                      </span>
                      <span className="text-secondary">•</span>
                      <span className="font-semibold text-on-surface">{order.customerName}</span>
                      <span className="text-label-xs bg-surface-container px-2 py-0.5 rounded text-secondary font-data-mono">
                        {order.phone}
                      </span>
                      <a
                        href={`tel:${order.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        title="Gọi trực tiếp cho khách"
                        className="p-1 hover:bg-surface-container rounded text-primary flex items-center"
                      >
                        <span className="material-symbols-outlined text-[16px]">call</span>
                      </a>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-label-xs text-secondary font-data-mono">{order.timeRequested}</span>
                      {order.status === 'PENDING_DISPATCH' && (
                        <span className="px-2.5 py-0.5 rounded text-label-xs font-bold bg-red-100 text-red-700">
                          {order.rawStatus === 'DISPATCH_FAILED' ? 'Điều phối thất bại' : 'Chờ điều phối'}
                        </span>
                      )}
                      {order.status === 'EN_ROUTE' && (
                        <span className="px-2.5 py-0.5 rounded text-label-xs font-bold bg-amber-100 text-amber-800">
                          Đang tới ({order.estimatedArrivalMin ?? 8} phút)
                        </span>
                      )}
                      {order.status === 'REPAIRING' && (
                        <span className="px-2.5 py-0.5 rounded text-label-xs font-bold bg-blue-100 text-blue-800">
                          Đang chở xe qua ngập
                        </span>
                      )}
                      {order.status === 'RESOLVED' && (
                        <span className="px-2.5 py-0.5 rounded text-label-xs font-bold bg-emerald-100 text-emerald-800">
                          Đã nghiệm thu
                        </span>
                      )}
                      {order.status === 'CANCELLED' && (
                        <span className="px-2.5 py-0.5 rounded text-label-xs font-bold bg-gray-100 text-gray-700">
                          Đã hủy
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                    <div>
                      <div className="flex items-start gap-1.5 text-secondary">
                        <span className="material-symbols-outlined text-[16px] text-red-500 mt-0.5">location_on</span>
                        <div>
                          <span className="font-medium text-on-surface">{order.location}</span>
                          {order.pickupLat && order.pickupLng && (
                            <a
                              href={`https://www.google.com/maps/search/?api=1&query=${order.pickupLat},${order.pickupLng}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="ml-2 text-primary text-label-xs inline-flex items-center hover:underline"
                            >
                              <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                              Map
                            </a>
                          )}
                        </div>
                      </div>

                      {order.dropoffAddress && (
                        <div className="flex items-center gap-1.5 text-secondary mt-1 text-label-xs">
                          <span className="material-symbols-outlined text-[16px] text-green-600">wb_sunny</span>
                          <span>
                            Điểm trả khô: <strong>{order.dropoffAddress}</strong>
                          </span>
                        </div>
                      )}

                      <div className="text-label-xs text-secondary pl-5 font-semibold mt-0.5">
                        Khu vực: {order.district} • Độ ngập:{' '}
                        <span className={order.urgency === 'HIGH' ? 'text-red-700 font-bold' : 'text-amber-700'}>
                          {order.waterDepth}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-secondary">
                        <span className="material-symbols-outlined text-[16px] text-primary">two_wheeler</span>
                        <span className="font-medium text-on-surface">{order.vehicle}</span>
                      </div>
                      <div className="text-label-xs text-secondary pl-5 mt-0.5">
                        <strong>Yêu cầu:</strong> {order.issue}
                      </div>
                      <div className="text-label-xs text-primary font-bold pl-5 mt-1">
                        Tổng cước: {Number(order.rawOrder.totalAmount || 0).toLocaleString('vi-VN')} ₫
                        <span className="text-secondary font-normal ml-1">
                          (Gara: {order.garageName || 'N/A'})
                        </span>
                      </div>
                    </div>
                  </div>

                  {order.assignedTech && (
                    <div className="mt-3 pt-2 border-t border-surface-container flex items-center justify-between text-body-xs bg-surface-container-low px-3 py-1.5 rounded">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-tertiary">engineering</span>
                        <span className="font-medium text-on-surface">KTV: {order.assignedTech}</span>
                        <span className="text-secondary">({order.garageName})</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-data-mono text-secondary">{order.techPhone}</span>
                        {order.techPhone && (
                          <a
                            href={`tel:${order.techPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            title="Gọi trực tiếp cho KTV"
                            className="p-1 hover:bg-surface-container-high rounded text-primary flex items-center"
                          >
                            <span className="material-symbols-outlined text-[14px]">call</span>
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination Controls cho danh sách ca cứu hộ */}
          {filteredOrders.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-surface-container-lowest rounded-xl border border-surface-container text-body-sm shadow-xs">
              <div className="flex items-center gap-2 text-secondary text-label-sm">
                <span>Hiển thị</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1 bg-surface-container-low border border-surface-container rounded text-on-surface font-semibold focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                >
                  <option value={5}>5 ca/trang</option>
                  <option value={8}>8 ca/trang</option>
                  <option value={10}>10 ca/trang</option>
                  <option value={20}>20 ca/trang</option>
                </select>
                <span>
                  ({(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, filteredOrders.length)} của {filteredOrders.length} ca)
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed text-on-surface transition-all flex items-center"
                  title="Trang đầu"
                >
                  <span className="material-symbols-outlined text-[18px]">first_page</span>
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed text-on-surface transition-all flex items-center"
                  title="Trang trước"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 px-1">
                  {pageNumbers.map((p, idx) =>
                    typeof p === 'number' ? (
                      <button
                        key={idx}
                        onClick={() => setCurrentPage(p)}
                        className={`w-7 h-7 rounded text-label-xs font-bold transition-all flex items-center justify-center ${
                          currentPage === p
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                        }`}
                      >
                        {p}
                      </button>
                    ) : (
                      <span key={idx} className="px-1 text-secondary text-label-xs">
                        {p}
                      </span>
                    )
                  )}
                </div>

                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed text-on-surface transition-all flex items-center"
                  title="Trang sau"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded hover:bg-surface-container disabled:opacity-30 disabled:cursor-not-allowed text-on-surface transition-all flex items-center"
                  title="Trang cuối"
                >
                  <span className="material-symbols-outlined text-[18px]">last_page</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dispatch Action & Inspector Panel */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-space-md">
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs sticky top-20">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">send_and_archive</span>
              Thông Tin Chi Tiết Ca Cứu Hộ
            </h3>

            {selectedOrder ? (
              <div className="space-y-4">
                {/* Thẻ tóm tắt thông tin đơn */}
                <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container space-y-2 text-body-sm">
                  <div className="flex justify-between items-center font-bold text-on-surface">
                    <div className="flex items-center gap-1.5">
                      <span className="font-data-mono text-primary">{selectedOrder.id}</span>
                      <button
                        onClick={() => handleCopy(selectedOrder.id, 'mã đơn')}
                        className="text-secondary hover:text-on-surface"
                        title="Sao chép mã đơn"
                      >
                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                      </button>
                    </div>
                    <span className="text-red-600 font-semibold">{selectedOrder.waterDepth}</span>
                  </div>

                  <div className="flex items-center justify-between text-secondary">
                    <span>
                      {selectedOrder.customerName} - {selectedOrder.phone}
                    </span>
                    <a
                      href={`tel:${selectedOrder.phone}`}
                      className="px-2 py-0.5 bg-primary/10 text-primary font-bold rounded text-label-xs hover:bg-primary/20 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      Gọi ngay
                    </a>
                  </div>

                  <div className="text-on-surface font-medium">
                    <span className="text-secondary text-label-xs block">Vị trí đón xe:</span>
                    <div className="flex items-start justify-between gap-1">
                      <span>{selectedOrder.location}</span>
                      {selectedOrder.pickupLat && selectedOrder.pickupLng && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.pickupLat},${selectedOrder.pickupLng}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary hover:underline text-label-xs whitespace-nowrap"
                        >
                          Xem Maps
                        </a>
                      )}
                    </div>
                  </div>

                  {selectedOrder.dropoffAddress && (
                    <div className="text-on-surface font-medium text-green-800">
                      <span className="text-secondary text-label-xs block">Vị trí trả xe khô:</span>
                      <div className="flex items-start justify-between gap-1">
                        <span>{selectedOrder.dropoffAddress}</span>
                        {selectedOrder.dropoffLat && selectedOrder.dropoffLng && (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${selectedOrder.dropoffLat},${selectedOrder.dropoffLng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline text-label-xs whitespace-nowrap"
                          >
                            Xem Maps
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="text-label-xs text-primary font-semibold">{selectedOrder.vehicle}</div>
                </div>

                {/* Thông tin chi tiết dịch vụ & Gara */}
                <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 text-body-xs space-y-1.5">
                  <div className="font-bold text-blue-900 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Chi tiết luồng vận hành
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-blue-200 text-blue-900 font-data-mono">
                      {selectedOrder.rawOrder.orderType || 'SINGLE_CROSSING'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-secondary">Trạng thái hệ thống:</span>
                    <span className="font-bold text-blue-800">{selectedOrder.rawOrder.status}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-secondary">Mốc vận chuyển:</span>
                    <span className="font-semibold text-on-surface">
                      {selectedOrder.rawOrder.transportStage || 'Tiếp nhận'}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-secondary">Gara phụ trách:</span>
                    <span className="font-semibold text-on-surface">{selectedOrder.rawOrder.garageName}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-secondary">KTV thực hiện:</span>
                    <span className="font-semibold text-on-surface">
                      {selectedOrder.rawOrder.mechanicName || 'Chưa nhận ca'}
                    </span>
                  </div>

                  <div className="border-t border-blue-200 pt-1.5 mt-1.5 flex justify-between font-bold text-body-sm">
                    <span>Tổng tiền thu:</span>
                    <span className="text-primary">
                      {Number(selectedOrder.rawOrder.totalAmount || 0).toLocaleString('vi-VN')} ₫
                    </span>
                  </div>

                  {/* Ảnh nghiệm thu bàn giao nếu có */}
                  {selectedOrder.rawOrder.completionPhotoUrl && (
                    <div className="mt-2 pt-2 border-t border-blue-200">
                      <span className="font-bold text-secondary block mb-1">Ảnh nghiệm thu hiện trường:</span>
                      <img
                        src={selectedOrder.rawOrder.completionPhotoUrl}
                        alt="Nghiệm thu bàn giao xe"
                        className="w-full h-36 object-cover rounded border border-surface-container"
                      />
                      {selectedOrder.rawOrder.completionNotes && (
                        <p className="mt-1 text-label-xs italic text-secondary">
                          Ghi chú: {selectedOrder.rawOrder.completionNotes}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Khu vực Action: Điều phối KTV từ API thật */}
                {selectedOrder.status === 'PENDING_DISPATCH' ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <div className="font-label-sm uppercase font-bold text-secondary text-xs">
                        KTV Gara ({selectedOrder.garageName}):
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => {
                            setTechOnlyActive(!techOnlyActive);
                            setTechCurrentPage(1);
                          }}
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded transition-all ${
                            techOnlyActive ? 'bg-emerald-100 text-emerald-800' : 'bg-surface-container text-secondary'
                          }`}
                        >
                          {techOnlyActive ? '✓ Đang rảnh' : 'Tất cả thợ'}
                        </button>
                        {selectedOrder.rawStatus === 'DISPATCH_FAILED' && (
                          <button
                            onClick={() => handleRetryDispatch(selectedOrder.rawId)}
                            disabled={retryingDispatch}
                            className="text-label-xs font-bold text-amber-700 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-all flex items-center gap-1"
                          >
                            <span className={`material-symbols-outlined text-[14px] ${retryingDispatch ? 'animate-spin' : ''}`}>
                              refresh
                            </span>
                            Tìm lại KTV
                          </button>
                        )}
                      </div>
                    </div>

                    {loadingMechanics ? (
                      <div className="p-4 text-center text-secondary text-body-sm">
                        <span className="material-symbols-outlined animate-spin text-[20px] align-middle mr-1">sync</span>
                        Đang tải danh sách kỹ thuật viên của trạm...
                      </div>
                    ) : filteredTechs.length === 0 ? (
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-body-sm space-y-1">
                        <p className="font-medium">
                          {techOnlyActive
                            ? 'Không có kỹ thuật viên nào đang rảnh tại trạm này.'
                            : 'Chưa có kỹ thuật viên nào được đăng ký tại gara này.'}
                        </p>
                        <button
                          onClick={() => handleRetryDispatch(selectedOrder.rawId)}
                          disabled={retryingDispatch}
                          className="mt-1 text-label-xs font-bold text-primary underline"
                        >
                          Kích hoạt hệ thống quét lại trạm lân cận
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {paginatedTechs.map((tech) => {
                          const isBusy = tech.workingStatus !== 'ACTIVE';
                          const isDispatching = dispatchingTechId === tech.id;
                          return (
                            <div
                              key={tech.id}
                              className={`p-2.5 rounded border flex items-center justify-between transition-all ${
                                isBusy
                                  ? 'bg-surface-container-low border-surface-container opacity-60'
                                  : 'border-surface-container bg-surface hover:border-primary'
                              }`}
                            >
                              <div>
                                <div className="font-semibold text-body-sm text-on-surface flex items-center gap-1.5">
                                  <span>{tech.fullName}</span>
                                  {tech.ratingAvg ? (
                                    <span className="text-[10px] text-amber-600 font-bold flex items-center">
                                      ★ {tech.ratingAvg.toFixed(1)}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="text-label-xs text-secondary">
                                  SĐT: {tech.phone} • {tech.speciality || 'Chở xe cứu hộ'}
                                </div>
                                {tech.branchName && (
                                  <div className="text-label-xs text-tertiary">Chi nhánh: {tech.branchName}</div>
                                )}
                              </div>

                              <button
                                onClick={() => handleAssignMechanic(selectedOrder.rawId, tech.id, tech.fullName)}
                                disabled={isBusy || isDispatching}
                                className={`px-3 py-1 rounded text-label-xs font-bold transition-all shadow-xs ${
                                  isBusy
                                    ? 'bg-surface-container text-secondary cursor-not-allowed'
                                    : 'bg-primary text-on-primary hover:bg-primary/90'
                                }`}
                              >
                                {isDispatching ? 'Đang gửi...' : isBusy ? 'Đang bận' : 'Điều Phối'}
                              </button>
                            </div>
                          );
                        })}

                        {/* Phân trang mini cho KTV nếu có hơn 1 trang */}
                        {totalTechPages > 1 && (
                          <div className="flex items-center justify-between pt-1 text-label-xs text-secondary border-t border-surface-container">
                            <span>
                              Thợ {(techCurrentPage - 1) * techPageSize + 1} -{' '}
                              {Math.min(techCurrentPage * techPageSize, filteredTechs.length)} / {filteredTechs.length}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setTechCurrentPage((p) => Math.max(1, p - 1))}
                                disabled={techCurrentPage === 1}
                                className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Trước
                              </button>
                              <span>
                                {techCurrentPage}/{totalTechPages}
                              </span>
                              <button
                                onClick={() => setTechCurrentPage((p) => Math.min(totalTechPages, p + 1))}
                                disabled={techCurrentPage === totalTechPages}
                                className="px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-high disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                Sau
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Nút Hủy ca khẩn cấp */}
                    <div className="pt-2 border-t border-surface-container">
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="w-full py-1.5 text-center text-red-600 hover:bg-red-50 rounded text-label-sm font-semibold transition-all border border-red-200"
                      >
                        Hủy ca cứu hộ khẩn cấp
                      </button>
                    </div>
                  </div>
                ) : selectedOrder.status === 'CANCELLED' ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded text-gray-800 text-body-sm">
                    <div className="font-bold flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      Ca cứu hộ đã bị hủy
                    </div>
                    {selectedOrder.rawOrder.cancelReason && (
                      <p className="mt-1 text-label-xs text-secondary">
                        Lý do: {selectedOrder.rawOrder.cancelReason}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded text-emerald-800 text-body-sm">
                      <div className="font-bold flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[18px]">verified</span>
                        Đã giao kỹ thuật viên tiếp nhận
                      </div>
                      <div className="mt-1 text-label-xs">
                        {selectedOrder.assignedTech} • {selectedOrder.garageName}
                      </div>
                      {selectedOrder.techPhone && (
                        <div className="mt-1 flex items-center gap-1 text-label-xs font-data-mono">
                          <span>SĐT KTV: {selectedOrder.techPhone}</span>
                          <a href={`tel:${selectedOrder.techPhone}`} className="text-emerald-900 font-bold underline ml-1">
                            Gọi
                          </a>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => setShowCancelModal(true)}
                      className="w-full py-1 text-center text-red-600 hover:bg-red-50 rounded text-label-xs font-semibold transition-all"
                    >
                      Can thiệp: Hủy ca này
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-secondary space-y-2">
                <span className="material-symbols-outlined text-4xl text-outline-variant">touch_app</span>
                <p className="text-body-sm">Nhấp vào một ca cứu hộ bên trái để xem chi tiết và thực hiện điều phối.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Hủy ca cứu hộ khẩn cấp */}
      {showCancelModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-surface-container-lowest rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-surface-container">
            <div className="flex items-center gap-2 text-red-600">
              <span className="material-symbols-outlined text-2xl">warning</span>
              <h3 className="font-headline-sm font-bold text-on-surface">Xác nhận hủy ca cứu hộ</h3>
            </div>

            <p className="text-body-sm text-secondary">
              Bạn đang yêu cầu hủy khẩn cấp ca cứu hộ <strong className="text-on-surface font-data-mono">{selectedOrder.id}</strong> của khách hàng <strong>{selectedOrder.customerName}</strong>.
            </p>

            <div>
              <label className="block text-label-sm font-bold text-on-surface mb-1">
                Lý do hủy (bắt buộc):
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Ví dụ: Khách hàng tự khắc phục được, đường ngập quá sâu xe chuyên dụng không tiếp cận được..."
                rows={3}
                className="w-full p-2 bg-surface-container-low border border-surface-container rounded text-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="px-4 py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
              >
                Đóng
              </button>
              <button
                onClick={handleConfirmCancelOrder}
                disabled={isCancelling || !cancelReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded font-label-md font-semibold hover:bg-red-700 disabled:opacity-50 transition-all shadow-xs"
              >
                {isCancelling ? 'Đang xử lý...' : 'Xác Nhận Hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
