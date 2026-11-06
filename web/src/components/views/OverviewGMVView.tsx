// ============================================================================
// MÀN HÌNH TỔNG QUAN TÀI CHÍNH & DÒNG TIỀN HỆ THỐNG (OVERVIEW GMV VIEW - UC-25)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích (Yêu cầu #8):
// 1. Loại bỏ hoàn toàn mảng `feedRows` gắn cứng, các hình ảnh hiện trường giả và các con số giả lập
//    (`1,48 tỷ ₫`, `1.420 giao dịch`, `Triều cường 1,72m`).
// 2. Truy xuất đồng thời dữ liệu thực tế từ Cơ sở dữ liệu qua 4 API:
//    `Promise.all([financeApi.getStats(), financeApi.getTransactions(), financeApi.getPayouts(), financeApi.getRefunds()])`.
// 3. Hiển thị 4 Thẻ chỉ số KPI thực tế từ Database:
//    - KPI 1: Tổng doanh thu giao dịch (GMV) & tổng số đơn thanh toán thành công.
//    - KPI 2: Doanh thu phí chiết khấu sàn thu được.
//    - KPI 3: Tổng số dư hiện đang lưu giữ trong ví của các Gara đối tác.
//    - KPI 4: Số lượng & tổng giá trị các yêu cầu rút tiền đang chờ Admin phê duyệt.
// 4. Hiển thị khu vực Cảnh báo nghiệp vụ thực tế từ Database:
//    - Số yêu cầu rút tiền đang chờ duyệt (`PENDING` / `PROCESSING`) -> nhấn để mở trang Rút tiền.
//    - Số hồ sơ khiếu nại chờ phán quyết hoàn tiền (`ESCALATED_TO_ADMIN` / `OPEN` / `UNDER_REVIEW`) -> nhấn để mở trang Hoàn tiền.
// 5. Hiển thị Bảng Giao dịch Thanh toán Gần đây lấy 100% từ `financeApi.getTransactions()` trong Database.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import {
  DisputeBackendResponse,
  financeApi,
  PaymentTransactionBackend,
  PayoutRequestBackend,
  PlatformRevenueStats
} from '../../services/financeApi';

/**
 * Giao diện Props truyền vào OverviewGMVView.
 */
interface OverviewGMVViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const OverviewGMVView: React.FC<OverviewGMVViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Dữ liệu thống kê tổng hợp từ API /finance/stats
  const [stats, setStats] = useState<PlatformRevenueStats | null>(null);
  // Danh sách giao dịch thanh toán thực tế từ DB
  const [transactions, setTransactions] = useState<PaymentTransactionBackend[]>([]);
  // Danh sách yêu cầu rút tiền từ DB
  const [payouts, setPayouts] = useState<PayoutRequestBackend[]>([]);
  // Danh sách hồ sơ khiếu nại & hoàn tiền từ DB
  const [refunds, setRefunds] = useState<DisputeBackendResponse[]>([]);

  // Trạng thái đang đồng bộ dữ liệu với Database
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU TỔNG QUAN TỪ DATABASE
  // ==========================================================================

  /**
   * Hàm gọi đồng thời 4 API tài chính để nạp dữ liệu thực từ Database.
   */
  const loadOverviewData = useCallback(async (showNotification = false) => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [statsRes, txRes, payoutsRes, refundsRes] = await Promise.all([
        financeApi.getStats().catch(() => null),
        financeApi.getTransactions().catch(() => [] as PaymentTransactionBackend[]),
        financeApi.getPayouts().catch(() => [] as PayoutRequestBackend[]),
        financeApi.getRefunds().catch(() => [] as DisputeBackendResponse[])
      ]);

      setStats(statsRes);
      setTransactions(Array.isArray(txRes) ? txRes : []);
      setPayouts(Array.isArray(payoutsRes) ? payoutsRes : []);
      setRefunds(Array.isArray(refundsRes) ? refundsRes : []);

      if (showNotification) {
        onShowToast(
          'Đồng bộ thành công',
          'Đã cập nhật số liệu tổng quan tài chính mới nhất từ Cơ sở dữ liệu.',
          'success'
        );
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không thể tải dữ liệu tổng quan từ Database.');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast]);

  /**
   * Tự động tải dữ liệu khi mở màn hình Tổng quan.
   */
  useEffect(() => {
    void loadOverviewData(false);
  }, [loadOverviewData]);

  // ==========================================================================
  // TÍNH TOÁN CHỈ SỐ KPI & CẢNH BÁO TỪ DỮ LIỆU THỰC TRONG DB
  // ==========================================================================

  /**
   * Tính toán 4 chỉ số KPI và số lượng hồ sơ chờ xử lý từ dữ liệu thực tế:
   */
  const overviewMetrics = useMemo(() => {
    // Các giao dịch đã thanh toán thành công
    const paidTxs = transactions.filter((tx) => {
      const st = String(tx.paymentStatus || tx.status || '').toUpperCase();
      return st === 'PAID' || st === 'SUCCESS';
    });

    const txGmv = paidTxs.reduce((sum, tx) => sum + Number(tx.totalAmount ?? tx.amount ?? 0), 0);
    const txCommission = paidTxs.reduce(
      (sum, tx) => sum + Number(tx.platformCommission ?? tx.platformFee ?? 0),
      0
    );

    // Các yêu cầu rút tiền đang chờ Admin duyệt
    const pendingPayoutList = payouts.filter((p) => {
      const st = String(p.status || '').toUpperCase();
      return st === 'PENDING' || st === 'PROCESSING';
    });
    const pendingPayoutAmount = pendingPayoutList.reduce(
      (sum, p) => sum + Number(p.amount ?? p.requestedAmount ?? 0),
      0
    );

    // Các hồ sơ khiếu nại chờ xử lý hoàn tiền
    const pendingDisputeList = refunds.filter((d) => {
      const st = String(d.status || '').toUpperCase();
      return (
        st === 'ESCALATED_TO_ADMIN' ||
        st === 'ADMIN_APPROVAL' ||
        st === 'OPEN' ||
        st === 'UNDER_REVIEW' ||
        st === 'STAFF_REVIEW'
      );
    });

    const totalGmv = txGmv > 0 ? txGmv : Number(stats?.totalGrossRevenueGmv ?? 0);
    const totalCommission =
      txCommission > 0 ? txCommission : Number(stats?.totalPlatformFeeEarned ?? 0);
    const totalGarageWalletBalances = Number(stats?.totalGarageWalletBalances ?? 0);

    return {
      totalGmv,
      paidTxCount:
        paidTxs.length > 0 ? paidTxs.length : Number(stats?.totalPaidTransactionCount ?? 0),
      totalCommission,
      activeCommissionRate: Number(stats?.activeCommissionRate ?? 12.5),
      totalGarageWalletBalances,
      pendingPayoutCount:
        pendingPayoutList.length > 0
          ? pendingPayoutList.length
          : Number(stats?.pendingPayoutCount ?? 0),
      pendingPayoutAmount:
        pendingPayoutAmount > 0
          ? pendingPayoutAmount
          : Number(stats?.pendingPayoutTotalAmount ?? 0),
      pendingDisputeCount:
        pendingDisputeList.length > 0
          ? pendingDisputeList.length
          : Number(stats?.openDisputesCount ?? 0),
      pendingPayoutList,
      pendingDisputeList
    };
  }, [stats, transactions, payouts, refunds]);

  // Lấy tối đa 10 giao dịch mới nhất từ Database để hiển thị trên bảng Giao dịch gần đây
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 10);
  }, [transactions]);

  // ==========================================================================
  // HIỂN THỊ GIAO DIỆN NGƯỜI DÙNG (JSX RENDERING)
  // ==========================================================================

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header trang Tổng quan tài chính */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Tổng Quan Tài Chính &amp; Dòng Tiền Hệ Thống
          </h1>
          <p className="text-sm text-secondary mt-1">
            Theo dõi thời gian thực tổng giá trị giao dịch, doanh thu chiết khấu nền tảng, số dư ví Gara và các tác vụ tài chính cần phê duyệt.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            onClick={() => onSelectScreen('reports')}
            className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-sm font-semibold text-on-surface transition-colors cursor-pointer"
          >
            Xem báo cáo P&amp;L chi tiết
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* 4 Thẻ chỉ số KPI chính lấy từ Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Tổng doanh thu giao dịch (GMV) */}
        <div
          onClick={() => onSelectScreen('payos-reconciliation')}
          className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs cursor-pointer hover:border-primary transition-colors"
        >
          <div className="text-xs font-bold uppercase text-secondary">
            1. Tổng doanh thu giao dịch
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface mt-1.5">
            {overviewMetrics.totalGmv.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            {overviewMetrics.paidTxCount} giao dịch thành công
          </div>
        </div>

        {/* KPI 2: Doanh thu chiết khấu sàn */}
        <div
          onClick={() => onSelectScreen('commission-settings')}
          className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs cursor-pointer hover:border-primary transition-colors"
        >
          <div className="text-xs font-bold uppercase text-secondary">
            2. Doanh thu chiết khấu sàn
          </div>
          <div className="text-2xl font-bold font-mono text-primary mt-1.5">
            {overviewMetrics.totalCommission.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            Chiết khấu mặc định hệ thống: {overviewMetrics.activeCommissionRate}%
          </div>
        </div>

        {/* KPI 3: Số dư ví các Gara */}
        <div
          onClick={() => onSelectScreen('reports')}
          className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs cursor-pointer hover:border-primary transition-colors"
        >
          <div className="text-xs font-bold uppercase text-secondary">
            3. Tổng số dư ví các Gara
          </div>
          <div className="text-2xl font-bold font-mono text-tertiary mt-1.5">
            {overviewMetrics.totalGarageWalletBalances.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            Số dư khả dụng đang giữ trong ví đối tác
          </div>
        </div>

        {/* KPI 4: Yêu cầu rút tiền chờ duyệt */}
        <div
          onClick={() => onSelectScreen('payouts')}
          className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs cursor-pointer hover:border-primary transition-colors"
        >
          <div className="text-xs font-bold uppercase text-secondary">
            4. Yêu cầu rút tiền chờ duyệt
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1.5">
            {overviewMetrics.pendingPayoutCount} lệnh (
            {overviewMetrics.pendingPayoutAmount.toLocaleString('vi-VN')} ₫)
          </div>
          <div className="text-xs text-secondary mt-1">
            Nhấn để chuyển tới trang Duyệt rút tiền
          </div>
        </div>
      </div>

      {/* Khu vực Cảnh báo tác vụ cần Admin xử lý (Rút tiền chờ duyệt & Khiếu nại chờ phán quyết) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase text-amber-700">
              Cảnh báo giải ngân
            </div>
            <div className="text-base font-bold text-on-surface mt-0.5">
              {overviewMetrics.pendingPayoutCount} yêu cầu rút tiền đang chờ Admin phê duyệt
            </div>
            <p className="text-xs text-secondary mt-1">
              Tổng số tiền đề nghị rút: {overviewMetrics.pendingPayoutAmount.toLocaleString('vi-VN')} ₫
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectScreen('payouts')}
            className="px-3.5 py-2 rounded-lg bg-amber-100 text-amber-900 text-xs font-bold hover:bg-amber-200 transition-colors shrink-0 cursor-pointer"
          >
            Xử lý rút tiền
          </button>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs flex items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase text-red-700">
              Cảnh báo khiếu nại &amp; hoàn tiền
            </div>
            <div className="text-base font-bold text-on-surface mt-0.5">
              {overviewMetrics.pendingDisputeCount} hồ sơ khiếu nại chờ quyết định hoàn tiền
            </div>
            <p className="text-xs text-secondary mt-1">
              Kiểm tra biên bản xác minh của Staff và thực thi hoàn tiền cho khách hàng.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectScreen('refunds')}
            className="px-3.5 py-2 rounded-lg bg-red-100 text-red-900 text-xs font-bold hover:bg-red-200 transition-colors shrink-0 cursor-pointer"
          >
            Xử lý hoàn tiền
          </button>
        </div>
      </div>

      {/* Bảng Giao dịch gần đây lấy 100% từ Database */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-container flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              Giao Dịch Thanh Toán Gần Đây (Từ Database)
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Hiển thị {recentTransactions.length} trên tổng số {transactions.length} giao dịch lưu trong hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectScreen('payos-reconciliation')}
            className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-xs font-bold text-primary transition-colors cursor-pointer"
          >
            Xem toàn bộ giao dịch
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Mã GD / PayOS Code</th>
                <th className="py-3 px-4">Mã đơn cứu hộ</th>
                <th className="py-3 px-4">Gara đối tác</th>
                <th className="py-3 px-4 text-center">Phương thức</th>
                <th className="py-3 px-4 text-right">Tổng tiền</th>
                <th className="py-3 px-4 text-right">Phí chiết khấu sàn</th>
                <th className="py-3 px-4 text-right">Gara thực nhận</th>
                <th className="py-3 px-4 text-center">Thời gian</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {recentTransactions.map((tx) => {
                const totalAmount = Number(tx.totalAmount ?? tx.amount ?? 0);
                const fee = Number(tx.platformCommission ?? tx.platformFee ?? 0);
                const net = Number(
                  tx.garageNetAmount ?? tx.netGarageAmount ?? Math.max(0, totalAmount - fee)
                );
                const rescueId = tx.rescueRequestId ?? tx.rescueOrderId ?? 0;
                const rescueCode = tx.rescueCode || (rescueId ? `#RESCUE-${rescueId}` : '—');
                const status = String(tx.paymentStatus || tx.status || 'PENDING').toUpperCase();

                return (
                  <tr key={tx.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-4 font-mono text-xs">
                      <div className="font-bold text-primary">#TX-{tx.id}</div>
                      <div className="text-secondary">{tx.payosOrderCode || '—'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-xs font-bold text-on-surface">
                      {rescueCode}
                    </td>
                    <td className="py-3 px-4 font-semibold text-on-surface">{tx.garageName}</td>
                    <td className="py-3 px-4 text-center font-mono text-xs">
                      {tx.paymentMethod}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                      {totalAmount.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-primary whitespace-nowrap">
                      {fee.toLocaleString('vi-VN')} ₫ ({Number(tx.commissionRate ?? 0)}%)
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-tertiary whitespace-nowrap">
                      {net.toLocaleString('vi-VN')} ₫
                    </td>
                    <td className="py-3 px-4 text-center font-mono text-xs text-secondary whitespace-nowrap">
                      {tx.createdAt ? new Date(tx.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                          status === 'PAID' || status === 'SUCCESS'
                            ? 'bg-emerald-100 text-emerald-800'
                            : status === 'REFUNDED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {status === 'SUCCESS' ? 'PAID' : status}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {recentTransactions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-secondary">
                    {isLoading
                      ? 'Đang tải danh sách giao dịch từ Database...'
                      : 'Chưa có giao dịch nào được ghi nhận trong Database.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
