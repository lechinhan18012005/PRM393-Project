import { ViewGuide } from '../ViewGuide';
import React, { useState, useEffect, useCallback } from 'react';
import { ScreenId } from '../../types';
import { rescueApi, RescueOrderWebResponse } from '../../services/rescueApi';

interface LiveDispatchDashboardViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

interface LiveOrder {
  id: string;
  customerName: string;
  phone: string;
  location: string;
  district: string;
  vehicle: string;
  waterDepth: string;
  status: 'PENDING_DISPATCH' | 'EN_ROUTE' | 'REPAIRING' | 'RESOLVED';
  urgency: 'HIGH' | 'MEDIUM' | 'NORMAL';
  assignedTech?: string;
  techPhone?: string;
  garageName?: string;
  timeRequested: string;
  estimatedArrivalMin?: number;
  issue: string;
  rawOrder?: RescueOrderWebResponse;
}

const INITIAL_MOCK_ORDERS: LiveOrder[] = [
  {
    id: 'ORD-7721',
    customerName: 'Hoàng Minh Tuấn',
    phone: '0908.192.481',
    location: '148 Mễ Cốc, Phường 15',
    district: 'Quận 8',
    vehicle: 'Honda SH 150i (2022)',
    waterDepth: '45 cm (Ngập pô & lốc máy)',
    status: 'PENDING_DISPATCH',
    urgency: 'HIGH',
    timeRequested: '3 phút trước',
    issue: 'Chết máy giữa dòng, nước tràn bầu lọc gió và bugi'
  },
  {
    id: 'ORD-7720',
    customerName: 'Võ Thanh Tùng',
    phone: '0913.829.102',
    location: 'Ngã tư Nguyễn Hữu Cảnh - D1',
    district: 'Bình Thạnh',
    vehicle: 'Yamaha Grande',
    waterDepth: '35 cm',
    status: 'EN_ROUTE',
    urgency: 'HIGH',
    assignedTech: 'Lê Văn Tuấn (KTV-08)',
    techPhone: '0938.110.294',
    garageName: 'Gara Tân Cảng Motor',
    timeRequested: '11 phút trước',
    estimatedArrivalMin: 4,
    issue: 'Không nổ được máy, đèn FI nhấp nháy báo lỗi hệ thống xăng'
  },
  {
    id: 'ORD-7719',
    customerName: 'Nguyễn Thị Bích Trâm',
    phone: '0982.716.299',
    location: 'Đường Huỳnh Tấn Phát (gần cầu Phú Xuân)',
    district: 'Quận 7',
    vehicle: 'Honda Air Blade 125',
    waterDepth: '50 cm (Ngập ngập yên xe)',
    status: 'REPAIRING',
    urgency: 'HIGH',
    assignedTech: 'Nguyễn Đăng Khoa (KTV-14)',
    techPhone: '0909.284.182',
    garageName: 'Đội Cứu Hộ Thủy Triều Q7',
    timeRequested: '22 phút trước',
    issue: 'Cần súc bình xăng, thay bugi và xả nhớt máy ngậm nước'
  },
  {
    id: 'ORD-7718',
    customerName: 'Phạm Đức Duy',
    phone: '0937.112.593',
    location: 'Đường số 7, KDC Tên Lửa',
    district: 'Bình Tân',
    vehicle: 'Honda Wave Alpha',
    waterDepth: '25 cm',
    status: 'PENDING_DISPATCH',
    urgency: 'MEDIUM',
    timeRequested: '14 phút trước',
    issue: 'Ướt bugi máy số, đạp không nổ, đã đẩy xe lên vỉa hè'
  },
  {
    id: 'ORD-7717',
    customerName: 'Trịnh Lan Hương',
    phone: '0944.829.110',
    location: 'Trần Não giao Lương Định Của',
    district: 'TP. Thủ Đức',
    vehicle: 'Vespa Sprint 150',
    waterDepth: '30 cm',
    status: 'RESOLVED',
    urgency: 'NORMAL',
    assignedTech: 'Võ Hoài Nam (KTV-03)',
    techPhone: '0912.839.201',
    garageName: 'Gara An Phú Q2',
    timeRequested: '38 phút trước',
    issue: 'Đã súc nước buồng đốt, thay bugi mới, nổ máy bàn giao khách'
  }
];

export const LiveDispatchDashboardView: React.FC<LiveDispatchDashboardViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchFilter, setSearchFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<LiveOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [backendOrders, setBackendOrders] = useState<RescueOrderWebResponse[]>([]);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const availableMechanics = [
    { id: 'M-01', name: 'Lê Văn Tuấn', garage: 'Gara An Phú (Q.8)', phone: '0938.110.294', location: 'Cầu Chữ Y', status: 'Rảnh' },
    { id: 'M-02', name: 'Trần Quốc Bảo', garage: 'Đội Xe Máy Q.7', phone: '0903.992.118', location: 'Lâm Văn Bền', status: 'Rảnh' },
    { id: 'M-03', name: 'Nguyễn Đức Minh', garage: 'Cứu Hộ Bình Tân', phone: '0988.421.902', location: 'Kinh Dương Vương', status: 'Rảnh' },
  ];

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const data = await rescueApi.getStaffOrders();
      setBackendOrders(data || []);
      setLastRefreshed(new Date());
    } catch {
      // Backend not reached or unauthenticated, fallback smoothly
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Map backend Single Crossing orders to display structure
  const mappedRealOrders: LiveOrder[] = backendOrders.map((bo) => {
    const isPending = bo.status === 'REQUESTED' || bo.status === 'DISPATCH_FAILED';
    const isEnRoute = bo.status === 'DISPATCHED' || bo.status === 'ARRIVED';
    const isInProgress = bo.status === 'IN_PROGRESS';
    const isResolved = bo.status === 'COMPLETED' || bo.status === 'PAYMENT_PENDING';

    const status: LiveOrder['status'] = isPending
      ? 'PENDING_DISPATCH'
      : isEnRoute
      ? 'EN_ROUTE'
      : isInProgress
      ? 'REPAIRING'
      : 'RESOLVED';

    const district =
      bo.pickupAddress.includes('Quận 7') ? 'Quận 7' :
      bo.pickupAddress.includes('Quận 8') ? 'Quận 8' :
      bo.pickupAddress.includes('Bình Thạnh') ? 'Bình Thạnh' :
      bo.pickupAddress.includes('Bình Tân') ? 'Bình Tân' :
      bo.pickupAddress.includes('Thủ Đức') ? 'TP. Thủ Đức' : 'TP.HCM';

    return {
      id: bo.orderCode,
      customerName: bo.customerName || `Khách hàng #${bo.customerId}`,
      phone: bo.customerPhone || '090-XXX-XXXX',
      location: bo.pickupAddress,
      district,
      vehicle: `${bo.vehicleModel} (${bo.vehiclePlate})`,
      waterDepth: bo.waterLevel || 'Ngập sâu',
      status,
      urgency: 'HIGH',
      assignedTech: bo.mechanicName ? `${bo.mechanicName} (KTV-${bo.mechanicStaffId ?? 'N/A'})` : undefined,
      techPhone: bo.mechanicPhone || undefined,
      garageName: bo.garageName,
      timeRequested: bo.requestedAt ? new Date(bo.requestedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
      estimatedArrivalMin: bo.status === 'DISPATCHED' ? 8 : undefined,
      issue: `Chở xe vượt ngập đơn lẻ · Trạng thái: ${bo.status} · Mốc: ${bo.transportStage}`,
      rawOrder: bo
    };
  });

  // Merge real orders at the top, then mock orders
  const allOrders = [...mappedRealOrders, ...INITIAL_MOCK_ORDERS];

  const handleDispatchOrder = (orderId: string, techName: string, garageName: string) => {
    onShowToast('Điều Phối Thành Công', `Đã điều động kỹ thuật viên ${techName} (${garageName}) cho đơn ${orderId}`);
  };

  const filteredOrders = allOrders.filter((o) => {
    if (selectedDistrict !== 'ALL' && o.district !== selectedDistrict) return false;
    if (selectedStatus !== 'ALL' && o.status !== selectedStatus) return false;
    if (searchFilter) {
      const q = searchFilter.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.includes(q) ||
        o.vehicle.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-space-xl">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">Điều phối cứu hộ</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-label-sm font-bold bg-red-100 text-red-700 animate-pulse">
              <span className="h-2 w-2 rounded-full bg-red-600"></span>
              Trực tiếp
            </span>
            {backendOrders.length > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-label-xs font-bold bg-green-100 text-green-800">
                <span className="material-symbols-outlined text-[14px]">cloud_done</span>
                {backendOrders.length} đơn Single Crossing từ API
              </span>
            )}
          </div>
          <ViewGuide>
            <p className="font-body-md text-body-md text-secondary">
              Giám sát đơn kêu cứu realtime, phân bổ trạm gara gần nhất và theo dõi lộ trình kỹ thuật viên di chuyển vùng ngập.
            </p>
          </ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={() => fetchOrders()}
            disabled={loading}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
            title="Làm mới dữ liệu từ server"
          >
            <span className={`material-symbols-outlined text-[18px] ${loading ? 'animate-spin' : ''}`}>sync</span>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>
          <button
            onClick={() => onSelectScreen('moderation')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">flood</span>
            <span>Bản đồ ngập</span>
          </button>
          <button
            onClick={() => onShowToast('Cảnh Báo Khẩn', 'Đã phát tín hiệu cảnh báo đỉnh triều cường 1.72m tới toàn bộ tài xế')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-red-600 text-white rounded font-label-md font-semibold hover:bg-red-700 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">emergency</span>
            <span>Phát Loa Báo Động</span>
          </button>
        </div>
      </div>

      {/* 5 Real-Time KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Chờ Điều Phối</span>
          <div className="text-2xl font-bold text-red-600 font-data-mono mt-1">
            {allOrders.filter((o) => o.status === 'PENDING_DISPATCH').length} đơn
          </div>
          <span className="text-label-xs text-red-700">Yêu cầu phản hồi &lt; 45s</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">KTV Đang Di Chuyển</span>
          <div className="text-2xl font-bold text-amber-600 font-data-mono mt-1">
            {allOrders.filter((o) => o.status === 'EN_ROUTE').length} ca
          </div>
          <span className="text-label-xs text-secondary">Dẫn đường GPS tới điểm đón</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Đang Chở Xe / Sửa Chữa</span>
          <div className="text-2xl font-bold text-blue-600 font-data-mono mt-1">
            {allOrders.filter((o) => o.status === 'REPAIRING').length} xe
          </div>
          <span className="text-label-xs text-secondary">Vận chuyển qua ngập an toàn</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">KTV Sẵn Sàng (Available)</span>
          <div className="text-2xl font-bold text-emerald-600 font-data-mono mt-1">
            {availableMechanics.length} thợ
          </div>
          <span className="text-label-xs text-emerald-700">Có xe chuyên chở qua ngập</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Hoàn Thành / Chờ TT</span>
          <div className="text-2xl font-bold text-on-surface font-data-mono mt-1">
            {allOrders.filter((o) => o.status === 'RESOLVED').length} ca
          </div>
          <span className="text-label-xs text-tertiary">Đã nghiệm thu ảnh thật</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl border border-surface-container">
        <div className="flex items-center gap-space-sm flex-wrap w-full md:w-auto">
          <div className="flex items-center gap-1 text-label-sm font-semibold text-secondary mr-2">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            <span>Bộ lọc:</span>
          </div>

          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="px-3 py-1.5 bg-surface-container-low border border-surface-container rounded font-body-sm text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">Tất cả khu vực TP.HCM</option>
            <option value="Quận 8">Quận 8 (Mễ Cốc, Bến Phú Định)</option>
            <option value="Quận 7">Quận 7 (Trần Xuân Soạn, Huỳnh Tấn Phát)</option>
            <option value="Bình Thạnh">Bình Thạnh (Nguyễn Hữu Cảnh)</option>
            <option value="Bình Tân">Bình Tân (Kinh Dương Vương, Tên Lửa)</option>
            <option value="TP. Thủ Đức">TP. Thủ Đức (Thảo Điền, Lương Định Của)</option>
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
          </select>
        </div>

        <div className="w-full md:w-72">
          <input
            type="text"
            placeholder="Tìm theo mã đơn, khách, xe..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full px-3 py-1.5 bg-surface-container-low border border-surface-container rounded font-body-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Grid: Live Orders Feed & Quick Dispatch Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Left Column: Live Orders Feed */}
        <div className="lg:col-span-8 space-y-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Ca cứu hộ ({filteredOrders.length})
            </h2>
            <span className="text-label-sm text-secondary">
              Cập nhật lúc: {lastRefreshed.toLocaleTimeString('vi-VN')}
            </span>
          </div>

          <div className="space-y-space-sm">
            {filteredOrders.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedOrder(order)}
                className={`p-space-lg rounded-xl border transition-all cursor-pointer bg-surface-container-lowest hover:shadow-md ${
                  selectedOrder?.id === order.id
                    ? 'border-primary ring-1 ring-primary'
                    : order.status === 'PENDING_DISPATCH'
                    ? 'border-red-300 bg-red-50/20'
                    : 'border-surface-container'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-surface-container pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-data-mono font-bold text-primary">{order.id}</span>
                    {order.rawOrder && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                        SINGLE_CROSSING
                      </span>
                    )}
                    <span className="text-secondary">•</span>
                    <span className="font-semibold text-on-surface">{order.customerName}</span>
                    <span className="text-label-xs bg-surface-container px-2 py-0.5 rounded text-secondary font-data-mono">
                      {order.phone}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-label-xs text-secondary font-data-mono">{order.timeRequested}</span>
                    {order.status === 'PENDING_DISPATCH' && (
                      <span className="px-2.5 py-0.5 rounded text-label-xs font-bold bg-red-100 text-red-700">
                        Chờ điều phối
                      </span>
                    )}
                    {order.status === 'EN_ROUTE' && (
                      <span className="px-2.5 py-0.5 rounded text-label-xs font-bold bg-amber-100 text-amber-800">
                        Đang tới ({order.estimatedArrivalMin ?? 5} phút)
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
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-body-sm">
                  <div>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <span className="material-symbols-outlined text-[16px] text-red-500">location_on</span>
                      <span className="font-medium text-on-surface">{order.location}</span>
                    </div>
                    {order.rawOrder && (
                      <div className="flex items-center gap-1.5 text-secondary mt-1 text-label-xs">
                        <span className="material-symbols-outlined text-[16px] text-green-600">wb_sunny</span>
                        <span>Điểm trả khô: <strong>{order.rawOrder.dropoffAddress}</strong></span>
                      </div>
                    )}
                    <div className="text-label-xs text-secondary pl-5 font-semibold mt-0.5">
                      Khu vực: {order.district} • Độ ngập: <span className="text-red-700">{order.waterDepth}</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5 text-secondary">
                      <span className="material-symbols-outlined text-[16px] text-primary">two_wheeler</span>
                      <span className="font-medium text-on-surface">{order.vehicle}</span>
                    </div>
                    <div className="text-label-xs text-secondary pl-5">{order.issue}</div>
                    {order.rawOrder && (
                      <div className="text-label-xs text-primary font-bold pl-5 mt-1">
                        Tổng cước: {Number(order.rawOrder.totalAmount).toLocaleString('vi-VN')} ₫
                        <span className="text-secondary font-normal ml-1">
                          (Dịch vụ: {Number(order.rawOrder.serviceBasePrice).toLocaleString('vi-VN')} ₫ + Phí sàn: {Number(order.rawOrder.bookingFee).toLocaleString('vi-VN')} ₫)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {order.assignedTech && (
                  <div className="mt-3 pt-2 border-t border-surface-container flex items-center justify-between text-body-xs bg-surface-container-low px-3 py-1.5 rounded">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[16px] text-tertiary">engineering</span>
                      <span className="font-medium text-on-surface">KTV: {order.assignedTech}</span>
                      <span className="text-secondary">({order.garageName})</span>
                    </div>
                    <span className="font-data-mono text-secondary">{order.techPhone}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Dispatch Action & Inspector Panel */}
        <div className="lg:col-span-4 space-y-space-md">
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs sticky top-20">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">send_and_archive</span>
              Thông Tin Chi Tiết Ca Cứu Hộ
            </h3>

            {selectedOrder ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-surface-container-low border border-surface-container space-y-1.5 text-body-sm">
                  <div className="flex justify-between font-bold text-on-surface">
                    <span className="font-data-mono text-primary">{selectedOrder.id}</span>
                    <span className="text-red-600">{selectedOrder.waterDepth}</span>
                  </div>
                  <div className="text-secondary">{selectedOrder.customerName} - {selectedOrder.phone}</div>
                  <div className="text-on-surface font-medium">
                    <span className="text-secondary text-label-xs">Đón: </span>
                    {selectedOrder.location}
                  </div>
                  {selectedOrder.rawOrder && (
                    <div className="text-on-surface font-medium text-green-800">
                      <span className="text-secondary text-label-xs">Trả: </span>
                      {selectedOrder.rawOrder.dropoffAddress}
                    </div>
                  )}
                  <div className="text-label-xs text-primary font-semibold">{selectedOrder.vehicle}</div>
                </div>

                {/* Single Crossing Specific Information */}
                {selectedOrder.rawOrder && (
                  <div className="p-3 bg-blue-50/50 rounded-lg border border-blue-200 text-body-xs space-y-1.5">
                    <div className="font-bold text-blue-900 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">info</span>
                      Chi tiết luồng Chở xe đơn lẻ (Luồng 3)
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Trạng thái hệ thống:</span>
                      <span className="font-bold text-blue-800">{selectedOrder.rawOrder.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Mốc vận chuyển:</span>
                      <span className="font-semibold text-on-surface">{selectedOrder.rawOrder.transportStage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Gara phụ trách:</span>
                      <span className="font-semibold text-on-surface">{selectedOrder.rawOrder.garageName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">KTV thực hiện:</span>
                      <span className="font-semibold text-on-surface">
                        {selectedOrder.rawOrder.mechanicName || 'Chưa nhận đơn'}
                      </span>
                    </div>
                    <div className="border-t border-blue-200 pt-1.5 mt-1.5 flex justify-between font-bold text-body-sm">
                      <span>Tổng tiền thu:</span>
                      <span className="text-primary">{Number(selectedOrder.rawOrder.totalAmount).toLocaleString('vi-VN')} ₫</span>
                    </div>

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
                )}

                {selectedOrder.status === 'PENDING_DISPATCH' ? (
                  <div>
                    <div className="font-label-sm uppercase font-bold text-secondary mb-2">
                      Chọn Kỹ Thuật Viên Cơ Động Gần Nhất:
                    </div>
                    <div className="space-y-2">
                      {availableMechanics.map((tech) => (
                        <div
                          key={tech.id}
                          className="p-2.5 rounded border border-surface-container bg-surface flex items-center justify-between hover:border-primary transition-all"
                        >
                          <div>
                            <div className="font-semibold text-body-sm text-on-surface">{tech.name}</div>
                            <div className="text-label-xs text-secondary">{tech.garage} • Vị trí: {tech.location}</div>
                          </div>
                          <button
                            onClick={() => handleDispatchOrder(selectedOrder.id, tech.name, tech.garage)}
                            className="px-3 py-1 bg-primary text-on-primary rounded text-label-xs font-bold hover:bg-primary/90 transition-all shadow-xs"
                          >
                            Điều Phối
                          </button>
                        </div>
                      ))}
                    </div>
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
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-secondary space-y-2">
                <span className="material-symbols-outlined text-4xl text-outline-variant">touch_app</span>
                <p className="text-body-sm">Nhấp vào một ca cứu hộ bên trái để xem chi tiết và hành trình chở xe.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
