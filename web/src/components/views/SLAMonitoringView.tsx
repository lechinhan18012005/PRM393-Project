// ============================================================================
// MÀN HÌNH GIÁM SÁT CHẤT LƯỢNG DỊCH VỤ SLA & ĐÁNH GIÁ SAU CỨU HỘ (SLA MONITORING VIEW - UC-19)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Đánh giá Chất lượng Dịch vụ & CSAT (UC-19)
// Mục đích:
// 1. Đồng bộ trực tiếp danh sách Đánh giá sao (1 - 5 sao), Nhãn khen ngợi (Tags) và Nhận xét
//    chi tiết (Comment) của khách hàng sau khi hoàn thành ca cứu hộ thông qua API `financeApi.getAllRatings()`.
// 2. Tính toán động Điểm hài lòng trung bình toàn sàn (CSAT Average Stars) và thống kê phân bố
//    chất lượng phục vụ của từng Gara đối tác dựa trên đánh giá thực tế của khách hàng.
// 3. Hỗ trợ Tìm kiếm theo tên Gara, khách hàng, thợ sửa chữa hoặc mã đơn cứu hộ, và lọc theo
//    mức điểm sao (Tất cả, 5 sao, 4 sao, Từ 3 sao trở xuống cần lưu ý).
// ============================================================================

import { ViewGuide } from '../ViewGuide';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { financeApi, ServiceRatingBackendResponse } from '../../services/financeApi';

/**
 * Giao diện Props truyền vào SLAMonitoringView.
 */
interface SLAMonitoringViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

/**
 * Giao diện dòng tổng hợp chỉ số hài lòng CSAT theo từng Gara đối tác được tính toán từ danh sách đánh giá.
 */
interface GarageCsatSummary {
  garageName: string;
  totalReviews: number;
  avgStars: number;
  fiveStarCount: number;
  lowStarCount: number;
}

export const SLAMonitoringView: React.FC<SLAMonitoringViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Danh sách toàn bộ đánh giá sau dịch vụ lấy từ Database qua API GET /api/v1/ratings
  const [ratings, setRatings] = useState<ServiceRatingBackendResponse[]>([]);

  // Cờ báo hiệu đang tải dữ liệu đánh giá từ máy chủ
  const [isLoadingRatings, setIsLoadingRatings] = useState<boolean>(false);

  // State phục vụ Lọc theo số sao và Tìm kiếm theo từ khóa
  const [starFilter, setStarFilter] = useState<'ALL' | '5' | '4' | 'LOW'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU ĐÁNH GIÁ DỊCH VỤ TỪ DATABASE (UC-19)
  // ==========================================================================

  /**
   * Gọi API `financeApi.getAllRatings()` để tải danh sách đánh giá thực tế từ Database.
   */
  const loadRatings = useCallback(async () => {
    setIsLoadingRatings(true);
    try {
      const data = await financeApi.getAllRatings();
      if (Array.isArray(data)) {
        setRatings(data);
      }
    } catch {
      // Giữ danh sách hiện tại nếu kết nối tạm thời gián đoạn
    } finally {
      setIsLoadingRatings(false);
    }
  }, []);

  /**
   * Tự động tải danh sách đánh giá khi mở màn hình.
   */
  useEffect(() => {
    void loadRatings();
  }, [loadRatings]);

  // ==========================================================================
  // TÍNH TOÁN CHỈ SỐ CSAT TOÀN SÀN & BẢNG XẾP HẠNG GARA BẰNG useMemo
  // ==========================================================================

  /**
   * Tính điểm sao trung bình toàn hệ thống (CSAT), số lượng đánh giá 5 sao và số lượng đánh giá thấp (<= 3 sao).
   */
  const csatStats = useMemo(() => {
    const total = ratings.length;
    if (total === 0) {
      return {
        total: 0,
        avgStars: '0.00',
        fiveStars: 0,
        lowStars: 0
      };
    }

    const sumStars = ratings.reduce((acc, r) => acc + Number(r.stars || 0), 0);
    const fiveStars = ratings.filter((r) => Number(r.stars) === 5).length;
    const lowStars = ratings.filter((r) => Number(r.stars) <= 3).length;

    return {
      total,
      avgStars: (sumStars / total).toFixed(2),
      fiveStars,
      lowStars
    };
  }, [ratings]);

  /**
   * Nhóm các đánh giá theo từng Gara đối tác để tính điểm CSAT trung bình của từng Gara.
   */
  const garageSummaries = useMemo<GarageCsatSummary[]>(() => {
    const map = new Map<string, { sum: number; count: number; five: number; low: number }>();

    ratings.forEach((r) => {
      const name = r.garageName || `Garage #${r.garageId ?? 'Đối tác'}`;
      const cur = map.get(name) || { sum: 0, count: 0, five: 0, low: 0 };
      const s = Number(r.stars || 0);
      cur.sum += s;
      cur.count += 1;
      if (s === 5) cur.five += 1;
      if (s <= 3) cur.low += 1;
      map.set(name, cur);
    });

    return Array.from(map.entries())
      .map(([garageName, val]) => ({
        garageName,
        totalReviews: val.count,
        avgStars: Number((val.sum / val.count).toFixed(2)),
        fiveStarCount: val.five,
        lowStarCount: val.low
      }))
      .sort((a, b) => b.avgStars - a.avgStars);
  }, [ratings]);

  /**
   * Lọc danh sách đánh giá theo số sao (`starFilter`) và từ khóa tìm kiếm (`searchQuery`).
   */
  const filteredRatings = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return ratings.filter((r) => {
      const s = Number(r.stars || 0);
      if (starFilter === '5' && s !== 5) return false;
      if (starFilter === '4' && s !== 4) return false;
      if (starFilter === 'LOW' && s > 3) return false;

      if (!q) return true;

      return (
        (r.rescueCode || '').toLowerCase().includes(q) ||
        (r.customerName || '').toLowerCase().includes(q) ||
        (r.garageName || '').toLowerCase().includes(q) ||
        (r.mechanicName || '').toLowerCase().includes(q) ||
        (r.comment || '').toLowerCase().includes(q)
      );
    });
  }, [ratings, starFilter, searchQuery]);

  // ==========================================================================
  // HIỂN THỊ GIAO DIỆN NGƯỜI DÙNG (JSX RENDERING)
  // ==========================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container pb-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface mt-1">
            Chất Lượng Dịch Vụ &amp; Đánh Giá Sau Cứu Hộ
          </h1>
          <ViewGuide>
            <p className="text-sm text-secondary">
              Đồng bộ đánh giá sao, thẻ khen ngợi và nhận xét của khách hàng sau khi hoàn tất dịch vụ cứu hộ từ Cơ sở dữ liệu.
            </p>
          </ViewGuide>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadRatings()}
            className="px-4 py-2 bg-surface-container text-on-surface rounded-lg text-sm font-semibold hover:bg-surface-container-high transition-all cursor-pointer"
          >
            {isLoadingRatings ? 'Đang tải...' : 'Làm mới đánh giá từ DB'}
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectScreen('verification');
              onShowToast('Chuyển màn hình', 'Đã chuyển sang màn hình Duyệt Gara đối tác.');
            }}
            className="px-4 py-2 bg-primary text-on-primary rounded-lg text-sm font-bold hover:bg-primary/90 transition-all cursor-pointer"
          >
            Quản lý Gara đối tác
          </button>
        </div>
      </div>

      {/* 4 Thẻ chỉ số CSAT tính từ Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Điểm CSAT Toàn Sàn</span>
          <div className="text-2xl font-bold text-blue-600 font-mono mt-1">
            {csatStats.avgStars} / 5.0 ⭐
          </div>
          <div className="text-xs text-secondary mt-1">
            Tính trên tổng số {csatStats.total} đánh giá trong DB
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Tổng lượt đánh giá</span>
          <div className="text-2xl font-bold text-on-surface font-mono mt-1">
            {csatStats.total} lượt
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            Đồng bộ trực tiếp từ bảng service_ratings
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Đánh giá 5 sao tuyệt đối</span>
          <div className="text-2xl font-bold text-emerald-600 font-mono mt-1">
            {csatStats.fiveStars} lượt
          </div>
          <div className="text-xs text-secondary mt-1">
            Khách hàng hài lòng tuyệt đối
          </div>
        </div>

        <div className="p-5 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Đánh giá &le; 3 sao cần lưu ý</span>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {csatStats.lowStars} lượt
          </div>
          <div className="text-xs text-secondary mt-1">
            Cần theo dõi chất lượng phục vụ
          </div>
        </div>
      </div>

      {/* Bảng tổng hợp điểm CSAT theo từng Gara đối tác */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container overflow-hidden shadow-xs">
        <div className="p-4 border-b border-surface-container">
          <h2 className="text-base font-bold text-on-surface">
            Bảng Xếp Hạng Điểm Đánh Giá CSAT Theo Gara Đối Tác
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase">
                <th className="py-3 px-4">Tên Gara đối tác</th>
                <th className="py-3 px-4 text-center">Tổng số đánh giá</th>
                <th className="py-3 px-4 text-center">Điểm CSAT trung bình</th>
                <th className="py-3 px-4 text-center">Số lượt 5 sao</th>
                <th className="py-3 px-4 text-center">Số lượt &le; 3 sao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {garageSummaries.map((g) => (
                <tr key={g.garageName} className="hover:bg-surface-container-low/50">
                  <td className="py-3 px-4 font-bold text-on-surface">{g.garageName}</td>
                  <td className="py-3 px-4 text-center font-mono">{g.totalReviews}</td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-blue-700">
                    {g.avgStars.toFixed(2)} ⭐
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-emerald-700 font-bold">
                    {g.fiveStarCount}
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-amber-700 font-bold">
                    {g.lowStarCount}
                  </td>
                </tr>
              ))}
              {garageSummaries.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-secondary">
                    Chưa có dữ liệu đánh giá nào trong Database.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bộ lọc & Danh sách chi tiết từng đánh giá của khách hàng */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              Nhật Ký Đánh Giá &amp; Nhận Xét Sau Dịch Vụ
            </h3>
            <p className="text-xs text-secondary">
              Hiển thị {filteredRatings.length} đánh giá khớp với bộ lọc.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(
              [
                { id: 'ALL', label: 'Tất cả' },
                { id: '5', label: '5 Sao ⭐' },
                { id: '4', label: '4 Sao ⭐' },
                { id: 'LOW', label: '≤ 3 Sao' }
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                type="button"
                onClick={() => setStarFilter(btn.id)}
                className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer ${
                  starFilter === btn.id
                    ? 'bg-primary text-on-primary'
                    : 'bg-surface-container-low text-secondary hover:text-on-surface'
                }`}
              >
                {btn.label}
              </button>
            ))}

            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm khách hàng, Gara, thợ, nội dung..."
              className="h-8 px-3 rounded-lg border border-surface-container bg-surface-container-low text-xs text-on-surface"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {filteredRatings.map((r) => (
            <div
              key={r.id}
              className="p-4 rounded-xl bg-surface-container-low border border-surface-container flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-primary">
                    {r.rescueCode || `#RC-${r.rescueOrderId}`}
                  </span>
                  <span className="font-mono font-bold text-amber-600 text-sm">
                    {'⭐'.repeat(Math.max(1, Math.min(5, r.stars)))} ({r.stars}/5)
                  </span>
                </div>
                <div className="font-bold text-on-surface mt-1">{r.customerName}</div>
                <div className="text-xs text-secondary">
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
                  <p className="text-sm text-on-surface mt-2 italic">
                    &ldquo;{r.comment}&rdquo;
                  </p>
                )}
              </div>
              <div className="text-xs text-secondary mt-3 pt-2 border-t border-surface-container font-mono">
                {r.createdAt ? new Date(r.createdAt).toLocaleString('vi-VN') : '—'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
