import { ViewGuide } from '../ViewGuide';
import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { financeApi, ServiceRatingBackendResponse } from '../../services/financeApi';

interface SLAMonitoringViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

interface GarageSLA {
  id: string;
  name: string;
  district: string;
  owner: string;
  phone: string;
  completedRescues: number;
  avgResponseMin: number;
  acceptanceRate: number;
  cancellationRate: number;
  csat: number;
  violations: number;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'SUSPENDED';
}

const FALLBACK_RATINGS: ServiceRatingBackendResponse[] = [
  {
    id: 1,
    rescueOrderId: 8821,
    rescueCode: '#RC-8821',
    customerName: 'Võ Minh Khôi',
    garageName: 'Gara An Phú (Q.8)',
    mechanicName: 'Lê Tuấn Hưng',
    stars: 5,
    tags: 'Đến nhanh < 15p,Nhiệt tình lội nước,Đúng giá niêm yết',
    comment: 'Anh thợ hỗ trợ rất nhiệt tình giữa đêm mưa ngập, giá minh bạch đúng trên app!',
    createdAt: '2026-04-16T20:15:00'
  },
  {
    id: 2,
    rescueOrderId: 8819,
    rescueCode: '#RC-8819',
    customerName: 'Trần Thu Hà',
    garageName: 'Đội Cứu Hộ Bình Tân',
    mechanicName: 'Nguyễn Văn Định',
    stars: 5,
    tags: 'Tay nghề cao,Cứu hộ an toàn',
    comment: 'Xe chết máy ngập bugi được xử lý tại chỗ chỉ 20 phút là nổ máy lại.',
    createdAt: '2026-04-16T19:40:00'
  },
  {
    id: 3,
    rescueOrderId: 8790,
    rescueCode: '#RC-8790',
    customerName: 'Phạm Văn Hùng',
    garageName: 'Cơ Sở Sửa Xe Thành Lợi',
    mechanicName: 'Trần Văn Lợi',
    stars: 3,
    tags: 'Cứu hộ an toàn',
    comment: 'Thợ đến hơi trễ khoảng 25 phút do kẹt xe ngập nước.',
    createdAt: '2026-04-16T18:10:00'
  }
];

export const SLAMonitoringView: React.FC<SLAMonitoringViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGarage, setSelectedGarage] = useState<GarageSLA | null>(null);
  const [ratings, setRatings] = useState<ServiceRatingBackendResponse[]>(FALLBACK_RATINGS);
  const [isLoadingRatings, setIsLoadingRatings] = useState<boolean>(false);

  const loadRatings = async () => {
    setIsLoadingRatings(true);
    try {
      const data = await financeApi.getAllRatings();
      if (data && data.length > 0) {
        setRatings(data);
      }
    } catch {
      // Fallback to sample ratings if offline
    } finally {
      setIsLoadingRatings(false);
    }
  };

  useEffect(() => {
    loadRatings();
  }, []);

  const [garages, setGarages] = useState<GarageSLA[]>([
    {
      id: 'G-101',
      name: 'Gara An Phú (Q.8)',
      district: 'Quận 8',
      owner: 'Lê Tuấn Hưng',
      phone: '0903.118.291',
      completedRescues: 412,
      avgResponseMin: 1.4,
      acceptanceRate: 98.8,
      cancellationRate: 0.8,
      csat: 4.95,
      violations: 0,
      status: 'EXCELLENT'
    },
    {
      id: 'G-102',
      name: 'Đội Cứu Hộ Bình Tân',
      district: 'Bình Tân',
      owner: 'Nguyễn Văn Định',
      phone: '0918.420.771',
      completedRescues: 340,
      avgResponseMin: 1.8,
      acceptanceRate: 97.2,
      cancellationRate: 1.2,
      csat: 4.88,
      violations: 0,
      status: 'EXCELLENT'
    },
    {
      id: 'G-103',
      name: 'Gara Tân Hưng (Q.7)',
      district: 'Quận 7',
      owner: 'Vũ Đức Hiệp',
      phone: '0977.821.004',
      completedRescues: 295,
      avgResponseMin: 2.1,
      acceptanceRate: 95.0,
      cancellationRate: 2.5,
      csat: 4.82,
      violations: 1,
      status: 'GOOD'
    },
    {
      id: 'G-104',
      name: 'Cơ Sở Sửa Xe Thành Lợi',
      district: 'Quận 8',
      owner: 'Trần Văn Lợi',
      phone: '0934.120.948',
      completedRescues: 180,
      avgResponseMin: 3.6,
      acceptanceRate: 88.5,
      cancellationRate: 6.2,
      csat: 4.31,
      violations: 3,
      status: 'WARNING'
    },
    {
      id: 'G-105',
      name: 'Trạm Xe Gò Vấp - Phạm Văn Đồng',
      district: 'Gò Vấp',
      owner: 'Bùi Quốc Cường',
      phone: '0912.839.201',
      completedRescues: 210,
      avgResponseMin: 2.0,
      acceptanceRate: 94.8,
      cancellationRate: 1.9,
      csat: 4.79,
      violations: 0,
      status: 'GOOD'
    },
    {
      id: 'G-106',
      name: 'Gara Cứu Hộ Xuyên Màn Đêm',
      district: 'Bình Thạnh',
      owner: 'Hoàng Văn Sỹ',
      phone: '0981.332.901',
      completedRescues: 92,
      avgResponseMin: 4.8,
      acceptanceRate: 79.0,
      cancellationRate: 9.8,
      csat: 3.92,
      violations: 4,
      status: 'SUSPENDED'
    }
  ]);

  const handleIssueWarning = (garage: GarageSLA) => {
    onShowToast('Cảnh Cáo SLA', `Đã gửi văn bản cảnh cáo vi phạm chất lượng phục vụ tới ${garage.name}`);
  };

  const handleToggleSuspend = (garage: GarageSLA) => {
    const isNowSuspended = garage.status !== 'SUSPENDED';
    setGarages((prev) =>
      prev.map((g) =>
        g.id === garage.id
          ? { ...g, status: isNowSuspended ? 'SUSPENDED' : 'WARNING' }
          : g
      )
    );
    if (selectedGarage?.id === garage.id) {
      setSelectedGarage({
        ...selectedGarage,
        status: isNowSuspended ? 'SUSPENDED' : 'WARNING'
      });
    }
    onShowToast(
      isNowSuspended ? 'Đã Đình Chỉ Tạm Thời' : 'Đã Khôi Phục Hoạt Động',
      `${garage.name} đã được ${isNowSuspended ? 'đình chỉ điều phối 48 giờ' : 'mở lại luồng nhận đơn'}`
    );
  };

  const filteredGarages = garages.filter((g) => {
    if (filterStatus !== 'ALL' && g.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        g.name.toLowerCase().includes(q) ||
        g.owner.toLowerCase().includes(q) ||
        g.district.toLowerCase().includes(q) ||
        g.phone.includes(q)
      );
    }
    return true;
  });

  const avgStars =
    ratings.length > 0
      ? (ratings.reduce((acc, r) => acc + r.stars, 0) / ratings.length).toFixed(2)
      : '4.86';

  return (
    <div className="space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">Chất lượng dịch vụ &amp; Đánh giá sau cứu hộ (UC-19)</h1>
          <ViewGuide><p className="font-body-md text-body-md text-secondary">
            Kiểm soát thời gian phản hồi ca ngập, đồng bộ đánh giá sao &amp; nhận xét khách hàng (UC-19), và duy trì chỉ số CSAT &gt; 4.8 sao toàn hệ thống.
          </p></ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={loadRatings}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            <span>{isLoadingRatings ? 'Đang tải...' : 'Làm mới đánh giá'}</span>
          </button>
          <button
            onClick={() => onSelectScreen('verification')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Hồ sơ mới</span>
          </button>
          <button
            onClick={() => onShowToast('Xuất Báo Cáo SLA', 'Đã tải bảng xếp hạng SLA mạng lưới Gara')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Xuất Báo Cáo Tuân Thủ</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Scorecards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Thời Gian Phản Hồi TB</span>
          <div className="text-2xl font-bold text-primary font-data-mono mt-1">1.8 phút</div>
          <div className="text-label-xs text-emerald-700 font-semibold mt-1">Chuẩn SLA: &lt; 3.0 phút</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Tỷ Lệ Nhận Cuốc</span>
          <div className="text-2xl font-bold text-emerald-600 font-data-mono mt-1">96.4%</div>
          <div className="text-label-xs text-secondary mt-1">Chỉ tiêu sàn: &gt; 92.0%</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Tỷ Lệ Hủy Cuốc</span>
          <div className="text-2xl font-bold text-amber-600 font-data-mono mt-1">1.6%</div>
          <div className="text-label-xs text-secondary mt-1">Ngưỡng cảnh báo: &gt; 5.0%</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Điểm CSAT Toàn Sàn</span>
          <div className="text-2xl font-bold text-blue-600 font-data-mono mt-1">{avgStars} / 5.0 ⭐</div>
          <div className="text-label-xs text-secondary mt-1">Đồng bộ {ratings.length} đánh giá mới nhất</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Vi Phạm Giá / Thắt Cổ Chai</span>
          <div className="text-2xl font-bold text-red-600 font-data-mono mt-1">3 vụ</div>
          <div className="text-label-xs text-red-700 font-semibold mt-1">Đã khấu trừ &amp; khoá ví</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-space-md bg-surface-container-lowest p-space-md rounded-xl border border-surface-container">
        <div className="flex items-center gap-space-xs flex-wrap">
          <span className="text-label-sm font-bold text-secondary mr-2">Trạng thái:</span>
          {['ALL', 'EXCELLENT', 'GOOD', 'WARNING', 'SUSPENDED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1 rounded text-label-sm font-semibold transition-all ${
                filterStatus === st
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'bg-surface-container-low text-secondary hover:text-on-surface'
              }`}
            >
              {st === 'ALL' && 'Tất cả gara'}
              {st === 'EXCELLENT' && 'Xuất sắc (Top Gara)'}
              {st === 'GOOD' && 'Đạt tiêu chuẩn'}
              {st === 'WARNING' && 'Cảnh báo vi phạm'}
              {st === 'SUSPENDED' && 'Đang bị đình chỉ'}
            </button>
          ))}
        </div>

        <div className="w-full md:w-64">
          <input
            type="text"
            placeholder="Tìm tên gara, chủ trạm, SĐT..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-1.5 bg-surface-container-low border border-surface-container rounded font-body-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {/* Main Table: Garage Ranking & Compliance */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container font-label-sm text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Gara &amp; Khu Vực</th>
                <th className="py-3 px-4">Đại Diện</th>
                <th className="py-3 px-4 text-center">Ca Đã Cứu Hộ</th>
                <th className="py-3 px-4 text-center">Phản Hồi SLA</th>
                <th className="py-3 px-4 text-center">Nhận / Hủy</th>
                <th className="py-3 px-4 text-center">CSAT</th>
                <th className="py-3 px-4 text-center">Vi Phạm</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-body-sm">
              {filteredGarages.map((garage) => (
                <tr
                  key={garage.id}
                  className={`hover:bg-surface-container-low/50 transition-colors cursor-pointer ${
                    selectedGarage?.id === garage.id ? 'bg-primary-container/20' : ''
                  }`}
                  onClick={() => setSelectedGarage(garage)}
                >
                  <td className="py-3 px-4">
                    <div className="font-bold text-on-surface">{garage.name}</div>
                    <div className="text-label-xs text-secondary">{garage.district} • ID: {garage.id}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-medium text-on-surface">{garage.owner}</div>
                    <div className="text-label-xs text-secondary font-data-mono">{garage.phone}</div>
                  </td>

                  <td className="py-3 px-4 text-center font-data-mono font-bold text-on-surface">
                    {garage.completedRescues}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`font-data-mono font-bold ${
                        garage.avgResponseMin <= 2.5 ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {garage.avgResponseMin} phút
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center font-data-mono">
                    <span className="text-emerald-700 font-bold">{garage.acceptanceRate}%</span>
                    <span className="text-secondary mx-1">/</span>
                    <span className={garage.cancellationRate > 5 ? 'text-red-600 font-bold' : 'text-secondary'}>
                      {garage.cancellationRate}%
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-blue-700 flex items-center justify-center gap-1 font-data-mono">
                      <span>{garage.csat}</span>
                      <span className="text-amber-500 text-xs">⭐</span>
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center font-data-mono">
                    {garage.violations > 0 ? (
                      <span className="px-2 py-0.5 rounded text-label-xs font-bold bg-red-100 text-red-700">
                        {garage.violations} vụ
                      </span>
                    ) : (
                      <span className="text-emerald-700 font-semibold">0</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    {garage.status === 'EXCELLENT' && (
                      <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-emerald-100 text-emerald-800">
                        Top Đối Tác
                      </span>
                    )}
                    {garage.status === 'GOOD' && (
                      <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-blue-100 text-blue-800">
                        Đạt Chuẩn
                      </span>
                    )}
                    {garage.status === 'WARNING' && (
                      <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-amber-100 text-amber-800">
                        Cảnh Báo
                      </span>
                    )}
                    {garage.status === 'SUSPENDED' && (
                      <span className="px-2 py-0.5 rounded-full text-label-xs font-bold bg-red-100 text-red-800">
                        Đã Đình Chỉ
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleIssueWarning(garage)}
                        className="p-1 rounded text-secondary hover:text-amber-700 hover:bg-surface-container"
                        title="Gửi cảnh cáo"
                      >
                        <span className="material-symbols-outlined text-[18px]">warning</span>
                      </button>
                      <button
                        onClick={() => handleToggleSuspend(garage)}
                        className={`p-1 rounded ${
                          garage.status === 'SUSPENDED'
                            ? 'text-emerald-700 hover:bg-emerald-50'
                            : 'text-red-600 hover:bg-red-50'
                        }`}
                        title={garage.status === 'SUSPENDED' ? 'Khôi phục nhận đơn' : 'Đình chỉ tạm thời'}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {garage.status === 'SUSPENDED' ? 'lock_open' : 'block'}
                        </span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* UC-19: Customer Ratings & Reviews Stream */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs">
        <div className="flex items-center justify-between mb-space-md">
          <div>
            <span className="text-label-xs font-bold uppercase text-primary tracking-wider">Luồng 9 • UC-19</span>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Nhật Ký Đánh Giá &amp; Nhận Xét Sau Dịch Vụ Mới Nhất
            </h3>
          </div>
          <span className="text-label-sm font-semibold text-secondary">
            Tổng số: {ratings.length} đánh giá
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {ratings.slice(0, 6).map((r) => (
            <div
              key={r.id}
              className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-data-mono text-label-xs font-bold text-primary">
                    {r.rescueCode || `#RC-${r.rescueOrderId}`}
                  </span>
                  <span className="font-data-mono font-bold text-amber-600 text-body-sm">
                    {'⭐'.repeat(Math.max(1, Math.min(5, r.stars)))} ({r.stars}/5)
                  </span>
                </div>
                <div className="font-bold text-on-surface mt-1">{r.customerName}</div>
                <div className="text-label-xs text-secondary">
                  Gara: <span className="font-semibold text-on-surface">{r.garageName || 'Đối tác cứu hộ'}</span>
                  {r.mechanicName ? ` • Thợ: ${r.mechanicName}` : ''}
                </div>
                {r.tags && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.tags.split(',').map((t, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-primary/10 text-primary"
                      >
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}
                {r.comment && (
                  <p className="text-body-sm text-on-surface mt-2 italic">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
              </div>
              <div className="text-label-xs text-secondary mt-3 pt-2 border-t border-surface-container font-data-mono">
                {r.createdAt}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Drawer / Modal when selecting garage */}
      {selectedGarage && (
        <div className="p-space-lg bg-surface-container-lowest rounded-xl border border-primary/30 shadow-md">
          <div className="flex items-center justify-between border-b border-surface-container pb-space-sm mb-space-md">
            <div>
              <span className="text-label-xs font-bold uppercase text-primary tracking-wider">Hồ Sơ Giám Sát SLA Chi Tiết</span>
              <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{selectedGarage.name}</h3>
            </div>
            <button
              onClick={() => setSelectedGarage(null)}
              className="p-1 rounded text-secondary hover:text-on-surface hover:bg-surface-container"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-space-md text-body-sm">
            <div className="p-3 bg-surface-container-low rounded">
              <span className="text-secondary text-label-xs">Chủ cơ sở &amp; Liên hệ</span>
              <div className="font-bold text-on-surface mt-0.5">{selectedGarage.owner}</div>
              <div className="font-data-mono text-secondary">{selectedGarage.phone}</div>
            </div>

            <div className="p-3 bg-surface-container-low rounded">
              <span className="text-secondary text-label-xs">Chỉ số tiếp cận</span>
              <div className="font-bold text-on-surface mt-0.5">{selectedGarage.avgResponseMin} phút / cuốc</div>
              <div className="text-emerald-700 text-label-xs font-semibold">Tỷ lệ nhận: {selectedGarage.acceptanceRate}%</div>
            </div>

            <div className="p-3 bg-surface-container-low rounded">
              <span className="text-secondary text-label-xs">Mức độ hài lòng CSAT</span>
              <div className="font-bold text-blue-700 mt-0.5">{selectedGarage.csat} / 5.0 ⭐</div>
              <div className="text-secondary text-label-xs">{selectedGarage.completedRescues} ca cứu hộ</div>
            </div>

            <div className="p-3 bg-surface-container-low rounded">
              <span className="text-secondary text-label-xs">Trạng thái vận hành</span>
              <div className="font-bold mt-0.5">
                {selectedGarage.status === 'SUSPENDED' ? (
                  <span className="text-red-700">Đang bị đình chỉ</span>
                ) : (
                  <span className="text-emerald-700">Đang nhận đơn bình thường</span>
                )}
              </div>
              <div className="text-label-xs text-secondary">{selectedGarage.violations} biên bản vi phạm</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
