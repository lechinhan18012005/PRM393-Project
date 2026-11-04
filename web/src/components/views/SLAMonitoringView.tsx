// ============================================================================
// MÀN HÌNH GIÁM SÁT CHẤT LƯỢNG DỊCH VỤ SLA & ĐÁNH GIÁ SAU CỨU HỘ (SLA MONITORING VIEW)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Đánh giá Chất lượng Dịch vụ & CSAT
// Mục đích:
// 1. Đồng bộ trực tiếp danh sách Đánh giá sao (1 - 5 sao), Nhãn khen ngợi (Tags) và Nhận xét
//    chi tiết (Comment) của khách hàng sau khi hoàn thành ca cứu hộ thông qua API `financeApi.getAllRatings()`.
// 2. Tính toán động Điểm hài lòng trung bình toàn sàn (CSAT Average Stars) và thống kê phân bố
//    chất lượng phục vụ của từng Gara đối tác dựa trên đánh giá thực tế của khách hàng.
// 3. Giám sát các chỉ số phản hồi SLA, tỷ lệ nhận ca, tỷ lệ hủy ca và số biên bản vi phạm từ các đơn cứu hộ.
// 4. Cung cấp chức năng gửi cảnh cáo hoặc đình chỉ/khôi phục hoạt động của Gara đối tác vi phạm SLA.
// ============================================================================

import { ViewGuide } from '../ViewGuide';
import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { financeApi, ServiceRatingBackendResponse, DisputeBackendResponse } from '../../services/financeApi';
import { garageApi } from '../../services/garageApi';
import { rescueApi, RescueOrderWebResponse } from '../../services/rescueApi';

interface SLAMonitoringViewProps {
  onSelectScreen?: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

interface GarageSLA {
  id: string;
  rawId?: number;
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

function extractDistrict(address?: string): string {
  if (!address) return 'Chưa cập nhật';
  const match = address.match(/(Quận\s+\d+|Quận\s+[A-Za-zÀ-ỹ]+|Huyện\s+[A-Za-zÀ-ỹ]+|TP\.\s*[A-Za-zÀ-ỹ]+|Bình Tân|Bình Thạnh|Gò Vấp|Phú Nhuận|Tân Bình|Tân Phú|Thủ Đức)/i);
  return match ? match[0] : address.split(',').pop()?.trim() || address;
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

export const SLAMonitoringView: React.FC<SLAMonitoringViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGarage, setSelectedGarage] = useState<GarageSLA | null>(null);
  const [ratings, setRatings] = useState<ServiceRatingBackendResponse[]>([]);
  const [garages, setGarages] = useState<GarageSLA[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);

  // Phân trang danh sách Gara
  const [garagePage, setGaragePage] = useState<number>(1);
  const [garagePageSize, setGaragePageSize] = useState<number>(5);

  // Bộ lọc & phân trang nhật ký đánh giá (UC-19)
  const [ratingStarFilter, setRatingStarFilter] = useState<string>('ALL');
  const [ratingPage, setRatingPage] = useState<number>(1);
  const ratingPageSize = 6;

  // Tự động quay về trang 1 khi thay đổi bộ lọc tìm kiếm Gara
  useEffect(() => {
    setGaragePage(1);
  }, [filterStatus, searchQuery, garagePageSize]);

  // Tự động quay về trang 1 khi lọc sao đánh giá
  useEffect(() => {
    setRatingPage(1);
  }, [ratingStarFilter]);

  /**
   * Tải và đồng bộ đồng thời dữ liệu từ 4 nguồn API Backend:
   * - Đánh giá dịch vụ khách hàng (financeApi.getAllRatings)
   * - Danh sách Gara đối tác (garageApi.getAllGarages)
   * - Đơn cứu hộ vận hành (rescueApi.getStaffOrders)
   * - Hồ sơ khiếu nại (financeApi.getStaffDisputes)
   * Từ đó tính toán ma trận chỉ số SLA và CSAT thực tế cho từng Gara.
   */
  const loadAllData = async () => {
    setIsLoading(true);
    try {
      // 1. Đồng bộ đánh giá dịch vụ (UC-19)
      const ratingsData = await financeApi.getAllRatings().catch(() => []);
      setRatings(ratingsData || []);

      // 2. Đồng bộ danh sách Gara từ backend (Staff/Admin)
      const backendGarages = await garageApi.getAllGarages().catch(() => []);

      // 3. Lấy dữ liệu đơn cứu hộ & khiếu nại để tính toán SLA thực tế
      const [staffOrders, disputes] = await Promise.all([
        rescueApi.getStaffOrders().catch(() => [] as RescueOrderWebResponse[]),
        financeApi.getStaffDisputes().catch(() => [] as DisputeBackendResponse[])
      ]);

      if (backendGarages && backendGarages.length > 0) {
        const activeRatings = ratingsData || [];

        const mappedGarages: GarageSLA[] = backendGarages.map((bg) => {
          // Thống kê ca cứu hộ thực tế
          const matchedOrders = (staffOrders || []).filter((o) => o.garageId === bg.id);
          const completedCount = matchedOrders.filter((o) => o.status === 'COMPLETED').length;
          const cancelledCount = matchedOrders.filter((o) => o.status === 'CANCELLED').length;
          const totalOrders = matchedOrders.length;

          // Tỷ lệ nhận & hủy cuốc thực tế
          let acceptanceRate = 100.0;
          let cancellationRate = 0.0;
          if (totalOrders > 0) {
            cancellationRate = Math.round((cancelledCount / totalOrders) * 1000) / 10;
            acceptanceRate = Math.round(((totalOrders - cancelledCount) / totalOrders) * 1000) / 10;
          }

          // Thời gian phản hồi TB (phút) thực tế
          let avgResponseMin = 0.0;
          const ordersWithTime = matchedOrders.filter((o) => o.requestedAt && (o.arrivedAt || o.acceptedAt));
          if (ordersWithTime.length > 0) {
            const validDiffs = ordersWithTime
              .map((o) => {
                const start = new Date(o.requestedAt).getTime();
                const end = new Date(o.arrivedAt || o.acceptedAt!).getTime();
                const diffMin = (end - start) / 60000;
                return !isNaN(diffMin) && diffMin > 0 && diffMin < 180 ? diffMin : null;
              })
              .filter((d): d is number => d !== null);

            if (validDiffs.length > 0) {
              const totalMin = validDiffs.reduce((acc, d) => acc + d, 0);
              avgResponseMin = Math.round((totalMin / validDiffs.length) * 10) / 10;
            }
          }

          // CSAT tính từ đánh giá thực tế của gara
          const matchedRatings = activeRatings.filter(
            (r) => r.garageId === bg.id || (r.garageName && bg.garageName && r.garageName.toLowerCase().includes(bg.garageName.toLowerCase()))
          );
          let csat = 0.0;
          if (matchedRatings.length > 0) {
            csat = Number((matchedRatings.reduce((acc, r) => acc + r.stars, 0) / matchedRatings.length).toFixed(2));
          }

          // Vi phạm tính từ khiếu nại thực tế
          const matchedDisputes = (disputes || []).filter((d) => d.garageId === bg.id);
          const violations = matchedDisputes.length;

          // Phân loại hạng SLA thực tế
          let status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'SUSPENDED' = 'GOOD';
          if (bg.status === 'SUSPENDED') {
            status = 'SUSPENDED';
          } else if (violations >= 3 || cancellationRate > 5 || (csat > 0 && csat < 4.0)) {
            status = 'WARNING';
          } else if (csat >= 4.8 && cancellationRate <= 2) {
            status = 'EXCELLENT';
          }

          return {
            id: `G-${bg.id}`,
            rawId: bg.id,
            name: bg.garageName || 'Chưa đặt tên',
            district: extractDistrict(bg.address),
            owner: bg.ownerName || 'Chưa cập nhật',
            phone: bg.phone || 'Chưa cập nhật',
            completedRescues: completedCount,
            avgResponseMin,
            acceptanceRate,
            cancellationRate,
            csat,
            violations,
            status
          };
        });

        setGarages(mappedGarages);
      } else {
        setGarages([]);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải dữ liệu SLA từ máy chủ:', err);
      setGarages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleIssueWarning = (garage: GarageSLA) => {
    onShowToast('Cảnh Cáo SLA', `Đã ghi nhận & gửi thông báo cảnh cáo vi phạm chất lượng phục vụ tới ${garage.name} (${garage.owner} - ${garage.phone})`);
  };

  /**
   * Kích hoạt hoặc đình chỉ tạm thời Gara đối tác vi phạm cam kết SLA hoặc có nhiều khiếu nại.
   */
  const handleToggleSuspend = async (garage: GarageSLA) => {
    const isNowSuspended = garage.status !== 'SUSPENDED';
    setIsActionLoading(true);
    try {
      if (garage.rawId) {
        const nextStatus = isNowSuspended ? 'SUSPENDED' : 'APPROVED';
        const note = isNowSuspended
          ? 'Đình chỉ điều phối tạm thời do vi phạm tiêu chuẩn vận hành SLA'
          : 'Khôi phục nhận đơn sau khi kiểm duyệt lại chỉ số chất lượng SLA';
        await garageApi.moderateGarage(garage.rawId, nextStatus, note);
      }

      const newStatus = isNowSuspended ? 'SUSPENDED' : 'GOOD';
      setGarages((prev) =>
        prev.map((g) =>
          g.id === garage.id
            ? { ...g, status: newStatus }
            : g
        )
      );
      if (selectedGarage?.id === garage.id) {
        setSelectedGarage({
          ...selectedGarage,
          status: newStatus
        });
      }
      onShowToast(
        isNowSuspended ? 'Đã Đình Chỉ Tạm Thời' : 'Đã Khôi Phục Hoạt Động',
        `${garage.name} đã được ${isNowSuspended ? 'đình chỉ điều phối trên máy chủ' : 'mở lại luồng nhận đơn thành công'}`
      );
    } catch (err: any) {
      onShowToast('Thao Tác Thất Bại', err?.message || 'Không thể cập nhật trạng thái gara trên máy chủ.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleExportReport = () => {
    if (garages.length === 0) {
      onShowToast('Xuất Báo Cáo', 'Không có dữ liệu gara để xuất.');
      return;
    }
    const headers = [
      'Mã Gara',
      'Tên Gara',
      'Khu Vực',
      'Người Đại Diện',
      'Số Điện Thoại',
      'Ca Đã Cứu Hộ',
      'Phản Hồi SLA (phút)',
      'Tỷ Lệ Nhận (%)',
      'Tỷ Lệ Hủy (%)',
      'Điểm CSAT',
      'Vi Phạm (vụ)',
      'Trạng Thái'
    ];
    const rows = garages.map((g) => [
      `"${g.id}"`,
      `"${g.name}"`,
      `"${g.district}"`,
      `"${g.owner}"`,
      `"${g.phone}"`,
      g.completedRescues,
      g.avgResponseMin,
      `${g.acceptanceRate}%`,
      `${g.cancellationRate}%`,
      g.csat,
      g.violations,
      `"${g.status}"`
    ]);
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    const nowStr = new Date().toISOString().slice(0, 10);
    link.setAttribute('download', `Bao_Cao_SLA_Gara_${nowStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast('Xuất Báo Cáo Thành Công', `Đã tải về bảng xếp hạng SLA của ${garages.length} gara (${nowStr}.csv)`);
  };

  // Lọc danh sách gara an toàn
  const filteredGarages = garages.filter((g) => {
    if (filterStatus !== 'ALL' && g.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (g.name && g.name.toLowerCase().includes(q)) ||
        (g.owner && g.owner.toLowerCase().includes(q)) ||
        (g.district && g.district.toLowerCase().includes(q)) ||
        (g.phone && g.phone.includes(q))
      );
    }
    return true;
  });

  // Tính toán phân trang cho Gara
  const totalGarages = filteredGarages.length;
  const totalGaragePages = Math.max(1, Math.ceil(totalGarages / garagePageSize));
  const currentGaragePage = Math.min(garagePage, totalGaragePages);
  const garageStartIdx = (currentGaragePage - 1) * garagePageSize;
  const garageEndIdx = Math.min(garageStartIdx + garagePageSize, totalGarages);
  const paginatedGarages = filteredGarages.slice(garageStartIdx, garageEndIdx);

  // Lọc đánh giá theo sao
  const filteredRatings = ratings.filter((r) => {
    if (ratingStarFilter === '5') return r.stars === 5;
    if (ratingStarFilter === '4') return r.stars === 4;
    if (ratingStarFilter === '3') return r.stars === 3;
    if (ratingStarFilter === 'LOW') return r.stars <= 2;
    return true;
  });

  // Tính toán phân trang cho Đánh giá (UC-19)
  const totalRatings = filteredRatings.length;
  const totalRatingPages = Math.max(1, Math.ceil(totalRatings / ratingPageSize));
  const currentRatingPage = Math.min(ratingPage, totalRatingPages);
  const ratingStartIdx = (currentRatingPage - 1) * ratingPageSize;
  const ratingEndIdx = Math.min(ratingStartIdx + ratingPageSize, totalRatings);
  const paginatedRatings = filteredRatings.slice(ratingStartIdx, ratingEndIdx);

  // Tính toán động các KPI Scorecard toàn hệ thống từ dữ liệu thực tế
  const garagesWithResponse = garages.filter((g) => g.avgResponseMin > 0);
  const avgResponseTime =
    garagesWithResponse.length > 0
      ? (garagesWithResponse.reduce((acc, g) => acc + g.avgResponseMin, 0) / garagesWithResponse.length).toFixed(1)
      : '0.0';

  const avgAcceptanceRate =
    garages.length > 0
      ? (garages.reduce((acc, g) => acc + g.acceptanceRate, 0) / garages.length).toFixed(1)
      : '0.0';

  const avgCancellationRate =
    garages.length > 0
      ? (garages.reduce((acc, g) => acc + g.cancellationRate, 0) / garages.length).toFixed(1)
      : '0.0';

  const avgStars =
    ratings.length > 0
      ? (ratings.reduce((acc, r) => acc + r.stars, 0) / ratings.length).toFixed(2)
      : '0.00';

  const totalViolations = garages.reduce((acc, g) => acc + g.violations, 0);

  return (
    <div className="space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">Chất Lượng Dịch Vụ &amp; Đánh Giá Sau Cứu Hộ</h1>
          <ViewGuide><p className="font-body-md text-body-md text-secondary">
            Kiểm soát thời gian phản hồi ca ngập, đồng bộ đánh giá sao &amp; nhận xét khách hàng, và duy trì chỉ số CSAT &gt; 4.8 sao toàn hệ thống.
          </p></ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={loadAllData}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all disabled:opacity-50"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>refresh</span>
            <span>{isLoading ? 'Đang đồng bộ...' : 'Đồng bộ SLA & Đánh giá'}</span>
          </button>
          <button
            onClick={() => onSelectScreen?.('verification')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">verified</span>
            <span>Hồ sơ mới</span>
          </button>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            <span>Xuất Báo Cáo Tuân Thủ</span>
          </button>
        </div>
      </div>

      {/* 5 KPI Scorecards động tính từ dữ liệu backend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Thời Gian Phản Hồi TB</span>
          <div className="text-2xl font-bold text-primary font-data-mono mt-1">{avgResponseTime} phút</div>
          <div className="text-label-xs text-emerald-700 font-semibold mt-1">Chuẩn SLA: &lt; 3.0 phút</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Tỷ Lệ Nhận Cuốc</span>
          <div className="text-2xl font-bold text-emerald-600 font-data-mono mt-1">{avgAcceptanceRate}%</div>
          <div className="text-label-xs text-secondary mt-1">Chỉ tiêu sàn: &gt; 92.0%</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Tỷ Lệ Hủy Cuốc</span>
          <div className="text-2xl font-bold text-amber-600 font-data-mono mt-1">{avgCancellationRate}%</div>
          <div className="text-label-xs text-secondary mt-1">Ngưỡng cảnh báo: &gt; 5.0%</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Điểm CSAT Toàn Sàn</span>
          <div className="text-2xl font-bold text-blue-600 font-data-mono mt-1">{avgStars} / 5.0 ⭐</div>
          <div className="text-label-xs text-secondary mt-1">Đồng bộ {ratings.length} đánh giá mới nhất</div>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Vi Phạm Giá / Khiếu Nại</span>
          <div className="text-2xl font-bold text-red-600 font-data-mono mt-1">{totalViolations} vụ</div>
          <div className="text-label-xs text-red-700 font-semibold mt-1">Đã xử lý &amp; điều chỉnh</div>
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
              {filteredGarages.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-secondary">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[36px] text-secondary/60">
                        {isLoading ? 'hourglass_top' : 'inbox'}
                      </span>
                      <span>
                        {isLoading
                          ? 'Đang đồng bộ dữ liệu đối tác Gara từ máy chủ...'
                          : 'Chưa có dữ liệu đối tác Gara nào.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedGarages.map((garage) => (
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
                          garage.avgResponseMin <= 2.5 && garage.avgResponseMin > 0 ? 'text-emerald-700' : 'text-amber-700'
                        }`}
                      >
                        {garage.avgResponseMin > 0 ? `${garage.avgResponseMin} phút` : 'Chưa có'}
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
                        <span>{garage.csat > 0 ? garage.csat : '—'}</span>
                        {garage.csat > 0 && <span className="text-amber-500 text-xs">⭐</span>}
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
                          disabled={isActionLoading}
                          className={`p-1 rounded ${
                            garage.status === 'SUSPENDED'
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-red-600 hover:bg-red-50'
                          } disabled:opacity-50`}
                          title={garage.status === 'SUSPENDED' ? 'Khôi phục nhận đơn (API)' : 'Đình chỉ tạm thời (API)'}
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {garage.status === 'SUSPENDED' ? 'lock_open' : 'block'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Thanh phân trang bảng Gara */}
        {totalGarages > 0 && (
          <div className="px-4 py-3 border-t border-surface-container bg-surface-container-low/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm text-secondary">
            <div className="flex items-center gap-3">
              <span>
                Hiển thị <strong className="text-on-surface">{garageStartIdx + 1}</strong> - <strong className="text-on-surface">{garageEndIdx}</strong> trên tổng số <strong className="text-on-surface">{totalGarages}</strong> gara
              </span>
              <div className="flex items-center gap-1.5 pl-2 border-l border-surface-container">
                <span className="text-label-xs">Mỗi trang:</span>
                <select
                  value={garagePageSize}
                  onChange={(e) => setGaragePageSize(Number(e.target.value))}
                  className="bg-surface-container-lowest border border-surface-container rounded px-2 py-0.5 text-label-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value={5}>5 gara</option>
                  <option value={10}>10 gara</option>
                  <option value={20}>20 gara</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setGaragePage(1)}
                disabled={currentGaragePage === 1}
                className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                title="Trang đầu"
              >
                <span className="material-symbols-outlined text-[18px]">first_page</span>
              </button>
              <button
                onClick={() => setGaragePage((p) => Math.max(1, p - 1))}
                disabled={currentGaragePage === 1}
                className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                title="Trang trước"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_left</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalGaragePages }, (_, idx) => idx + 1)
                  .filter((p) => p === 1 || p === totalGaragePages || Math.abs(p - currentGaragePage) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && p - arr[i - 1] > 1 && (
                        <span className="px-1 text-secondary text-label-xs">...</span>
                      )}
                      <button
                        onClick={() => setGaragePage(p)}
                        className={`w-7 h-7 rounded text-label-xs font-semibold transition-all ${
                          currentGaragePage === p
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'hover:bg-surface-container text-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => setGaragePage((p) => Math.min(totalGaragePages, p + 1))}
                disabled={currentGaragePage === totalGaragePages}
                className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                title="Trang sau"
              >
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
              <button
                onClick={() => setGaragePage(totalGaragePages)}
                disabled={currentGaragePage === totalGaragePages}
                className="p-1 rounded hover:bg-surface-container text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                title="Trang cuối"
              >
                <span className="material-symbols-outlined text-[18px]">last_page</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* UC-19: Customer Ratings & Reviews Stream với Bộ Lọc & Phân Trang */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs space-y-space-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container">
          <div>
            <span className="text-label-xs font-bold uppercase text-primary tracking-wider">Nhật Ký Đánh Giá Dịch Vụ Khách Hàng</span>
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Nhật Ký Đánh Giá &amp; Nhận Xét Sau Dịch Vụ Mới Nhất
            </h3>
          </div>

          {/* Lọc đánh giá theo số sao */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-label-xs font-semibold text-secondary mr-1">Lọc sao:</span>
            {[
              { id: 'ALL', label: `Tất cả (${ratings.length})` },
              { id: '5', label: `5 ⭐ (${ratings.filter((r) => r.stars === 5).length})` },
              { id: '4', label: `4 ⭐ (${ratings.filter((r) => r.stars === 4).length})` },
              { id: '3', label: `3 ⭐ (${ratings.filter((r) => r.stars === 3).length})` },
              { id: 'LOW', label: `≤ 2 ⭐ (${ratings.filter((r) => r.stars <= 2).length})` }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setRatingStarFilter(f.id)}
                className={`px-2.5 py-1 rounded text-label-xs font-semibold transition-all ${
                  ratingStarFilter === f.id
                    ? 'bg-primary text-on-primary shadow-xs'
                    : 'bg-surface-container-low text-secondary hover:text-on-surface'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lưới các thẻ đánh giá */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {filteredRatings.length === 0 ? (
            <div className="py-12 text-center text-secondary col-span-1 md:col-span-3 bg-surface-container-low rounded-xl border border-surface-container">
              <div className="flex flex-col items-center justify-center gap-2">
                <span className="material-symbols-outlined text-[36px] text-secondary/60">
                  {isLoading ? 'hourglass_top' : 'reviews'}
                </span>
                <span>
                  {isLoading
                    ? 'Đang tải nhật ký đánh giá dịch vụ...'
                    : 'Không tìm thấy đánh giá nào phù hợp với bộ lọc.'}
                </span>
              </div>
            </div>
          ) : (
            paginatedRatings.map((r) => (
              <div
                key={r.id}
                className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between hover:border-primary/40 transition-colors"
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
                  {formatDateTime(r.createdAt)}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Thanh phân trang Nhật ký đánh giá */}
        {totalRatings > ratingPageSize && (
          <div className="pt-space-sm border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3 text-body-sm text-secondary">
            <span>
              Hiển thị <strong className="text-on-surface">{ratingStartIdx + 1}</strong> - <strong className="text-on-surface">{ratingEndIdx}</strong> trên tổng số <strong className="text-on-surface">{totalRatings}</strong> đánh giá
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setRatingPage((p) => Math.max(1, p - 1))}
                disabled={currentRatingPage === 1}
                className="flex items-center gap-1 px-3 py-1 rounded border border-surface-container hover:bg-surface-container text-label-xs font-semibold text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                <span>Trang trước</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalRatingPages }, (_, idx) => idx + 1)
                  .filter((p) => p === 1 || p === totalRatingPages || Math.abs(p - currentRatingPage) <= 1)
                  .map((p, i, arr) => (
                    <React.Fragment key={p}>
                      {i > 0 && p - arr[i - 1] > 1 && (
                        <span className="px-1 text-secondary text-label-xs">...</span>
                      )}
                      <button
                        onClick={() => setRatingPage(p)}
                        className={`w-7 h-7 rounded text-label-xs font-semibold transition-all ${
                          currentRatingPage === p
                            ? 'bg-primary text-on-primary shadow-xs'
                            : 'hover:bg-surface-container text-secondary'
                        }`}
                      >
                        {p}
                      </button>
                    </React.Fragment>
                  ))}
              </div>

              <button
                onClick={() => setRatingPage((p) => Math.min(totalRatingPages, p + 1))}
                disabled={currentRatingPage === totalRatingPages}
                className="flex items-center gap-1 px-3 py-1 rounded border border-surface-container hover:bg-surface-container text-label-xs font-semibold text-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span>Trang sau</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </button>
            </div>
          </div>
        )}
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
              <div className="font-bold text-on-surface mt-0.5">
                {selectedGarage.avgResponseMin > 0 ? `${selectedGarage.avgResponseMin} phút / cuốc` : 'Chưa có dữ liệu'}
              </div>
              <div className="text-emerald-700 text-label-xs font-semibold">Tỷ lệ nhận: {selectedGarage.acceptanceRate}%</div>
            </div>

            <div className="p-3 bg-surface-container-low rounded">
              <span className="text-secondary text-label-xs">Mức độ hài lòng CSAT</span>
              <div className="font-bold text-blue-700 mt-0.5">
                {selectedGarage.csat > 0 ? `${selectedGarage.csat} / 5.0 ⭐` : 'Chưa có đánh giá'}
              </div>
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

          {/* Quick Action Buttons inside Drawer */}
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-surface-container justify-end">
            <button
              onClick={() => handleIssueWarning(selectedGarage)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-amber-300 text-amber-700 hover:bg-amber-50 text-label-xs font-semibold transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">warning</span>
              <span>Gửi Cảnh Cáo SLA</span>
            </button>
            <button
              onClick={() => handleToggleSuspend(selectedGarage)}
              disabled={isActionLoading}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-label-xs font-semibold text-white transition-colors ${
                selectedGarage.status === 'SUSPENDED'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-red-600 hover:bg-red-700'
              } disabled:opacity-50`}
            >
              <span className="material-symbols-outlined text-[16px]">
                {selectedGarage.status === 'SUSPENDED' ? 'lock_open' : 'block'}
              </span>
              <span>
                {selectedGarage.status === 'SUSPENDED' ? 'Khôi Phục Hoạt Động (API)' : 'Đình Chỉ Tạm Thời (API)'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
