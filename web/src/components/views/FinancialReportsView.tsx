// ============================================================================
// MÀN HÌNH BÁO CÁO KẾT QUẢ KINH DOANH & THỐNG KÊ DOANH THU THEO GARA (FINANCIAL REPORTS VIEW)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích (Yêu cầu #8):
// 1. Loại bỏ triệt để toàn bộ số liệu giả lập năm 2023 (`4.852.900.000 ₫`, chi phí máy chủ Mapbox GIS giả,
//    lương nhân viên CSKH giả, biểu đồ tỷ trọng dịch vụ giả).
// 2. Truy xuất đồng thời dữ liệu thực tế từ 5 API kết nối trực tiếp Cơ sở dữ liệu (Database):
//    `Promise.all([financeApi.getStats(), financeApi.getTransactions(), financeApi.getPayouts(), financeApi.getRefunds(), financeApi.getGarageCommissions()])`.
// 3. Tự động tổng hợp Báo cáo Kết quả Kinh doanh (P&L Summary) 100% từ dữ liệu thực trong DB:
//    - Mục 1: Tổng doanh thu giao dịch (GMV - Gross Merchandise Value) từ các giao dịch thành công (`PAID`).
//    - Mục 2: Doanh thu chiết khấu nền tảng (Platform Commission) thu được từ các đơn cứu hộ.
//    - Mục 3: Tổng tiền hoàn trả khách hàng (Refunds) từ các hồ sơ khiếu nại đã duyệt hoàn tiền.
//    - Mục 4: Thực thu ròng của Gara (Garage Net Revenue) sau khi trừ phí chiết khấu sàn.
//    - Mục 5: Tổng số tiền đã giải ngân về ngân hàng Gara & Tổng số dư hiện đang lưu giữ trong ví Gara.
// 4. Hiển thị Bảng phân tích doanh thu & dòng tiền chi tiết theo từng Gara đối tác (tính toán từ giao dịch thực
//    và cấu hình chiết khấu của từng Gara trong DB): Tên Gara, Tỷ lệ chiết khấu, Số đơn thành công, Tổng GMV,
//    Phí chiết khấu nền tảng, Gara thực nhận, Số dư ví hiện tại.
// 5. Cung cấp nút "Xuất CSV báo cáo tài chính" tạo và tải xuống tệp `.csv` chuẩn mã hóa UTF-8 có BOM (`\uFEFF`)
//    chứa toàn bộ số liệu báo cáo thực tế từ Database để mở trực tiếp bằng Microsoft Excel không bị lỗi font tiếng Việt.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import {
  DisputeBackendResponse,
  financeApi,
  GarageCommissionDto,
  PaymentTransactionBackend,
  PayoutRequestBackend,
  PlatformRevenueStats
} from '../../services/financeApi';

/**
 * Giao diện Props truyền vào FinancialReportsView.
 */
interface FinancialReportsViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

/**
 * Giao diện mô tả một dòng tổng hợp doanh thu và dòng tiền theo từng Gara đối tác.
 */
interface GarageFinancialRow {
  garageId: number;
  garageName: string;
  commissionRate: number;
  paidOrdersCount: number;
  totalGmv: number;
  platformCommission: number;
  garageNetRevenue: number;
  walletBalance: number;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Số liệu thống kê tổng quan trả về từ API /finance/stats
  const [stats, setStats] = useState<PlatformRevenueStats | null>(null);
  // Danh sách toàn bộ giao dịch thanh toán từ DB
  const [transactions, setTransactions] = useState<PaymentTransactionBackend[]>([]);
  // Danh sách toàn bộ yêu cầu rút tiền từ DB
  const [payouts, setPayouts] = useState<PayoutRequestBackend[]>([]);
  // Danh sách toàn bộ hồ sơ hoàn tiền / khiếu nại từ DB
  const [refunds, setRefunds] = useState<DisputeBackendResponse[]>([]);
  // Danh sách toàn bộ Gara đối tác kèm tỷ lệ chiết khấu & số dư ví từ DB
  const [garages, setGarages] = useState<GarageCommissionDto[]>([]);

  // Trạng thái đang tải dữ liệu và thông báo lỗi
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU ĐỒNG THỜI TỪ 5 ENDPOINT DATABASE
  // ==========================================================================

  /**
   * Hàm gọi đồng thời `Promise.all` (kết hợp bắt lỗi an toàn cho từng nhánh) để lấy toàn bộ
   * dữ liệu tài chính thực tế từ Database.
   */
  const loadFinancialReportData = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const [statsData, txData, payoutsData, refundsData, garagesData] = await Promise.all([
        financeApi.getStats().catch(() => null),
        financeApi.getTransactions().catch(() => [] as PaymentTransactionBackend[]),
        financeApi.getPayouts().catch(() => [] as PayoutRequestBackend[]),
        financeApi.getRefunds().catch(() => [] as DisputeBackendResponse[]),
        financeApi.getGarageCommissions().catch(() => [] as GarageCommissionDto[])
      ]);

      setStats(statsData);
      setTransactions(Array.isArray(txData) ? txData : []);
      setPayouts(Array.isArray(payoutsData) ? payoutsData : []);
      setRefunds(Array.isArray(refundsData) ? refundsData : []);
      setGarages(Array.isArray(garagesData) ? garagesData : []);
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không thể tải dữ liệu báo cáo tài chính từ Database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Tự động tải báo cáo ngay khi mở màn hình.
   */
  useEffect(() => {
    void loadFinancialReportData();
  }, [loadFinancialReportData]);

  // ==========================================================================
  // TÍNH TOÁN BÁO CÁO KẾT QUẢ KINH DOANH (P&L SUMMARY) TỪ DỮ LIỆU DB
  // ==========================================================================

  /**
   * Tổng hợp 5 chỉ số cốt lõi của Báo cáo P&L trực tiếp từ dữ liệu thực trong Database:
   * 1. Tổng doanh thu giao dịch (GMV)
   * 2. Doanh thu chiết khấu nền tảng (Platform Commission)
   * 3. Tổng tiền hoàn trả khách hàng (Refunds)
   * 4. Thực thu ròng của Gara (Garage Net Revenue)
   * 5. Tổng đã giải ngân về ngân hàng Gara & Tổng số dư đang giữ trong ví Gara
   */
  const pnlSummary = useMemo(() => {
    // Lọc các giao dịch đã thanh toán thành công (PAID hoặc SUCCESS)
    const paidTxs = transactions.filter((tx) => {
      const st = String(tx.paymentStatus || tx.status || '').toUpperCase();
      return st === 'PAID' || st === 'SUCCESS';
    });

    // Tính tổng GMV, Phí chiết khấu nền tảng và Thực nhận Gara từ danh sách giao dịch thực tế
    const txGmv = paidTxs.reduce((sum, tx) => sum + Number(tx.totalAmount ?? tx.amount ?? 0), 0);
    const txPlatformCommission = paidTxs.reduce(
      (sum, tx) => sum + Number(tx.platformCommission ?? tx.platformFee ?? 0),
      0
    );
    const txGarageNet = paidTxs.reduce(
      (sum, tx) =>
        sum +
        Number(
          tx.garageNetAmount ??
            tx.netGarageAmount ??
            Math.max(
              0,
              Number(tx.totalAmount ?? tx.amount ?? 0) -
                Number(tx.platformCommission ?? tx.platformFee ?? 0)
            )
        ),
      0
    );

    // Tính tổng tiền đã hoàn trả cho khách hàng từ các hồ sơ khiếu nại ở trạng thái RESOLVED_REFUND / REFUNDED
    const resolvedRefunds = refunds.filter((r) => {
      const st = String(r.status || '').toUpperCase();
      return st === 'RESOLVED_REFUND' || st === 'REFUNDED';
    });
    const calculatedRefundAmount = resolvedRefunds.reduce(
      (sum, r) =>
        sum +
        Number(r.refundAmount ?? r.approvedRefundAmount ?? r.requestedRefundAmount ?? 0),
      0
    );

    // Tính tổng số tiền đã giải ngân hoàn tất về ngân hàng của các Gara (COMPLETED / TRANSFERRED)
    const completedPayouts = payouts.filter((p) => {
      const st = String(p.status || '').toUpperCase();
      return st === 'COMPLETED' || st === 'TRANSFERRED';
    });
    const calculatedPayoutAmount = completedPayouts.reduce(
      (sum, p) => sum + Number(p.amount ?? p.requestedAmount ?? 0),
      0
    );

    // Tính tổng số dư hiện đang lưu giữ trong ví của toàn bộ các Gara đối tác
    const calculatedWalletBalances = garages.reduce(
      (sum, g) => sum + Number(g.walletBalance ?? 0),
      0
    );

    // Ưu tiên số liệu tính trực tiếp từ danh sách bản ghi nếu có, hoặc lấy từ đối tượng stats của Backend
    const totalGmv = txGmv > 0 ? txGmv : Number(stats?.totalGrossRevenueGmv ?? 0);
    const platformCommission =
      txPlatformCommission > 0 ? txPlatformCommission : Number(stats?.totalPlatformFeeEarned ?? 0);
    const totalRefunds =
      calculatedRefundAmount > 0
        ? calculatedRefundAmount
        : Number(stats?.totalRefundedAmount ?? 0);
    const garageNetRevenue =
      txGarageNet > 0 ? txGarageNet : Number(stats?.totalNetGarageSettlement ?? 0);
    const totalDisbursedPayouts =
      calculatedPayoutAmount > 0
        ? calculatedPayoutAmount
        : Number(stats?.completedPayoutAmount ?? stats?.transferredPayoutTotalAmount ?? 0);
    const totalGarageWalletBalances =
      calculatedWalletBalances > 0
        ? calculatedWalletBalances
        : Number(stats?.totalGarageWalletBalances ?? 0);

    return {
      paidOrdersCount:
        paidTxs.length > 0 ? paidTxs.length : Number(stats?.totalPaidTransactionCount ?? 0),
      totalGmv,
      platformCommission,
      totalRefunds,
      resolvedRefundsCount:
        resolvedRefunds.length > 0
          ? resolvedRefunds.length
          : Number(stats?.refundedTransactionsCount ?? 0),
      garageNetRevenue,
      totalDisbursedPayouts,
      completedPayoutsCount:
        completedPayouts.length > 0
          ? completedPayouts.length
          : Number(stats?.completedPayoutsCount ?? stats?.transferredPayoutCount ?? 0),
      totalGarageWalletBalances
    };
  }, [stats, transactions, payouts, refunds, garages]);

  // ==========================================================================
  // TÍNH TOÁN BẢNG PHÂN TÍCH CHI TIẾT THEO TỪNG GARA ĐỐI TÁC
  // ==========================================================================

  /**
   * Kết hợp danh sách Gara (`garages`) và danh sách giao dịch (`transactions`) từ Database
   * để tạo bảng thống kê doanh thu chi tiết cho từng Gara đối tác.
   */
  const garageBreakdownRows = useMemo<GarageFinancialRow[]>(() => {
    const mapByGarageId = new Map<number, GarageFinancialRow>();

    // Khởi tạo từ danh sách Gara trong Database
    garages.forEach((g) => {
      mapByGarageId.set(g.garageId, {
        garageId: g.garageId,
        garageName: g.garageName,
        commissionRate: Number(g.commissionRate ?? 10),
        paidOrdersCount: 0,
        totalGmv: 0,
        platformCommission: 0,
        garageNetRevenue: 0,
        walletBalance: Number(g.walletBalance ?? 0)
      });
    });

    // Cộng dồn các giao dịch thành công (PAID / SUCCESS) vào từng Gara tương ứng
    transactions.forEach((tx) => {
      const st = String(tx.paymentStatus || tx.status || '').toUpperCase();
      if (st !== 'PAID' && st !== 'SUCCESS') return;

      const gId = Number(tx.garageId ?? 0);
      const amount = Number(tx.totalAmount ?? tx.amount ?? 0);
      const fee = Number(tx.platformCommission ?? tx.platformFee ?? 0);
      const net = Number(tx.garageNetAmount ?? tx.netGarageAmount ?? Math.max(0, amount - fee));

      const existing = mapByGarageId.get(gId);
      if (existing) {
        existing.paidOrdersCount += 1;
        existing.totalGmv += amount;
        existing.platformCommission += fee;
        existing.garageNetRevenue += net;
      } else {
        mapByGarageId.set(gId, {
          garageId: gId,
          garageName: tx.garageName || `Garage #${gId}`,
          commissionRate: Number(tx.commissionRate ?? 10),
          paidOrdersCount: 1,
          totalGmv: amount,
          platformCommission: fee,
          garageNetRevenue: net,
          walletBalance: 0
        });
      }
    });

    return Array.from(mapByGarageId.values()).sort((a, b) => b.totalGmv - a.totalGmv);
  }, [garages, transactions]);

  // ==========================================================================
  // HÀM XUẤT BÁO CÁO TÀI CHÍNH RA FILE CSV (UTF-8 BOM) THỰC TẾ
  // ==========================================================================

  /**
   * Tạo và tải xuống tệp `.csv` có ký tự BOM (`\uFEFF`) để hiển thị đúng tiếng Việt trong Excel.
   * Nội dung tệp CSV bao gồm cả phần Tổng hợp P&L toàn sàn và Bảng chi tiết theo từng Gara từ Database.
   */
  const handleExportCsv = () => {
    // Hàm escape chuỗi CSV an toàn
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const lines: string[] = [];

    // Phần 1: Báo cáo Kết quả Kinh doanh tổng hợp (P&L Summary)
    lines.push('BAO CAO TAI CHINH TONG HOP HE THONG CUU HO (DU LIEU DATABASE)');
    lines.push(`Thoi gian xuat bao cao,${escapeCsv(new Date().toLocaleString('vi-VN'))}`);
    lines.push('');
    lines.push('CHI TIEU TAI CHINH (P&L),SO LUONG,GIA TRI (VND)');
    lines.push(
      `1. Tong doanh thu giao dich thanh cong (GMV),${pnlSummary.paidOrdersCount} don,${pnlSummary.totalGmv}`
    );
    lines.push(
      `2. Doanh thu chiet khau nen tang (Platform Commission),${pnlSummary.paidOrdersCount} don,${pnlSummary.platformCommission}`
    );
    lines.push(
      `3. Tong tien hoan tra khach hang (Refunds),${pnlSummary.resolvedRefundsCount} ho so,${pnlSummary.totalRefunds}`
    );
    lines.push(
      `4. Thuc thu rong cua Gara (Garage Net Revenue),${pnlSummary.paidOrdersCount} don,${pnlSummary.garageNetRevenue}`
    );
    lines.push(
      `5. Tong da giai ngan ve ngan hang Gara,${pnlSummary.completedPayoutsCount} lenh,${pnlSummary.totalDisbursedPayouts}`
    );
    lines.push(
      `6. Tong so du dang giu trong vi Gara,${garages.length} gara,${pnlSummary.totalGarageWalletBalances}`
    );
    lines.push('');

    // Phần 2: Bảng phân tích chi tiết theo từng Gara đối tác
    lines.push('BANG THONG KE DOANH THU VA CHIET KHAU THEO TUNG GARA DOI TAC');
    lines.push(
      'Ma Gara,Ten Gara,Ty le chiet khau (%),So don thanh cong,Tong GMV (VND),Phi chiet khau san (VND),Gara thuc nhan (VND),So du vi hien tai (VND)'
    );

    garageBreakdownRows.forEach((row) => {
      lines.push(
        [
          `GAR-${row.garageId}`,
          escapeCsv(row.garageName),
          row.commissionRate,
          row.paidOrdersCount,
          row.totalGmv,
          row.platformCommission,
          row.garageNetRevenue,
          row.walletBalance
        ].join(',')
      );
    });

    // Thêm UTF-8 BOM (\uFEFF) ở đầu file để Excel nhận diện bảng mã tiếng Việt chính xác
    const csvContent = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Tai_Chinh_RescueOps_${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onShowToast(
      'Đã xuất báo cáo CSV',
      `Đã tải xuống tệp Bao_Cao_Tai_Chinh_RescueOps_${dateStamp}.csv từ dữ liệu Database.`,
      'success'
    );
  };

  // ==========================================================================
  // HIỂN THỊ GIAO DIỆN NGƯỜI DÙNG (JSX RENDERING)
  // ==========================================================================

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header & Nút Xuất CSV báo cáo tài chính thực tế */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Báo Cáo Tài Chính &amp; Kết Quả Kinh Doanh (Dữ Liệu Thực Từ Database)
          </h1>
          <p className="text-sm text-secondary mt-1">
            Tổng hợp trực tiếp từ các bảng Giao dịch thanh toán, Cấu hình chiết khấu Gara, Yêu cầu rút tiền và Hồ sơ hoàn tiền trong Cơ sở dữ liệu.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void loadFinancialReportData()}
            className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-sm font-semibold text-on-surface transition-colors cursor-pointer"
          >
            {isLoading ? 'Đang đồng bộ DB...' : 'Làm mới số liệu'}
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer"
          >
            Xuất CSV báo cáo tài chính
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* 5 Thẻ chỉ số P&L cốt lõi tính từ Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            1. Tổng doanh thu (GMV)
          </div>
          <div className="text-xl font-bold font-mono text-on-surface mt-1.5">
            {pnlSummary.totalGmv.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            {pnlSummary.paidOrdersCount} đơn thanh toán thành công
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            2. Doanh thu chiết khấu sàn
          </div>
          <div className="text-xl font-bold font-mono text-primary mt-1.5">
            {pnlSummary.platformCommission.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            Phí hoa hồng nền tảng thu được
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            3. Tổng hoàn trả khách (Refunds)
          </div>
          <div className="text-xl font-bold font-mono text-red-600 mt-1.5">
            {pnlSummary.totalRefunds.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            {pnlSummary.resolvedRefundsCount} hồ sơ đã hoàn tiền
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            4. Thực thu ròng của Gara
          </div>
          <div className="text-xl font-bold font-mono text-tertiary mt-1.5">
            {pnlSummary.garageNetRevenue.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            Tổng tiền cộng vào ví các Gara
          </div>
        </div>

        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            5. Giải ngân &amp; Số dư ví Gara
          </div>
          <div className="text-base font-bold font-mono text-emerald-700 mt-1.5">
            Đã rút: {pnlSummary.totalDisbursedPayouts.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs font-mono text-on-surface mt-1">
            Số dư ví: <strong>{pnlSummary.totalGarageWalletBalances.toLocaleString('vi-VN')} ₫</strong>
          </div>
        </div>
      </div>

      {/* Bảng Báo cáo Kết quả Kinh doanh (P&L Statement) từ Database */}
      <div className="bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-surface-container pb-3">
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              Bảng Tổng Hợp Kết Quả Kinh Doanh (P&amp;L Summary)
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Số liệu được tính toán tự động 100% từ các giao dịch thực tế trong cơ sở dữ liệu.
            </p>
          </div>
          <span className="font-mono text-xs px-2.5 py-1 rounded bg-surface-container text-on-surface font-bold">
            ĐƠN VỊ: VNĐ
          </span>
        </div>

        <div className="space-y-2.5 text-sm">
          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-surface-container-low font-bold text-on-surface">
            <span>1. Tổng giá trị giao dịch cứu hộ thành công (GMV - {pnlSummary.paidOrdersCount} đơn)</span>
            <span className="font-mono text-base">{pnlSummary.totalGmv.toLocaleString('vi-VN')} ₫</span>
          </div>

          <div className="flex items-center justify-between py-2 px-3 text-secondary border-b border-surface-container">
            <span>2. Doanh thu phí chiết khấu nền tảng (Platform Commission)</span>
            <span className="font-mono font-bold text-primary">
              +{pnlSummary.platformCommission.toLocaleString('vi-VN')} ₫
            </span>
          </div>

          <div className="flex items-center justify-between py-2 px-3 text-secondary border-b border-surface-container">
            <span>3. Tổng tiền hoàn trả khiếu nại cho khách hàng ({pnlSummary.resolvedRefundsCount} hồ sơ)</span>
            <span className="font-mono font-bold text-red-600">
              -{pnlSummary.totalRefunds.toLocaleString('vi-VN')} ₫
            </span>
          </div>

          <div className="flex items-center justify-between py-2 px-3 text-secondary border-b border-surface-container">
            <span>4. Thực thu ròng phân bổ về ví Gara đối tác (Garage Net Revenue)</span>
            <span className="font-mono font-bold text-tertiary">
              {pnlSummary.garageNetRevenue.toLocaleString('vi-VN')} ₫
            </span>
          </div>

          <div className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-emerald-50 border border-emerald-200 font-bold text-emerald-900">
            <span>
              5. Tổng đã giải ngân về ngân hàng Gara ({pnlSummary.completedPayoutsCount} lệnh) / Tổng số dư còn giữ trong ví Gara
            </span>
            <span className="font-mono">
              {pnlSummary.totalDisbursedPayouts.toLocaleString('vi-VN')} ₫ /{' '}
              {pnlSummary.totalGarageWalletBalances.toLocaleString('vi-VN')} ₫
            </span>
          </div>
        </div>
      </div>

      {/* Bảng Phân tích Doanh thu & Phí chiết khấu theo từng Gara đối tác */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden">
        <div className="p-5 border-b border-surface-container flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-on-surface">
              Bảng Thống Kê Doanh Thu &amp; Chiết Khấu Theo Từng Gara Đối Tác
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Tổng hợp số đơn thành công, tổng GMV, phí chiết khấu nền tảng thu được, số tiền Gara thực nhận và số dư ví hiện tại của từng Gara.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelectScreen('commission-settings')}
            className="px-3 py-1.5 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-xs font-bold text-primary transition-colors cursor-pointer"
          >
            Điều chỉnh chiết khấu Gara
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Tên Gara đối tác</th>
                <th className="py-3 px-4 text-center">Tỷ lệ chiết khấu</th>
                <th className="py-3 px-4 text-center">Số đơn thành công</th>
                <th className="py-3 px-4 text-right">Tổng GMV</th>
                <th className="py-3 px-4 text-right">Phí chiết khấu nền tảng</th>
                <th className="py-3 px-4 text-right">Gara thực nhận</th>
                <th className="py-3 px-4 text-right">Số dư ví hiện tại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-sm">
              {garageBreakdownRows.map((row) => (
                <tr key={row.garageId} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="font-bold text-on-surface">{row.garageName}</div>
                    <div className="font-mono text-xs text-secondary">#GAR-{row.garageId}</div>
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-primary">
                    {row.commissionRate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-4 text-center font-mono font-bold text-on-surface">
                    {row.paidOrdersCount}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                    {row.totalGmv.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-primary whitespace-nowrap">
                    {row.platformCommission.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-tertiary whitespace-nowrap">
                    {row.garageNetRevenue.toLocaleString('vi-VN')} ₫
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {row.walletBalance.toLocaleString('vi-VN')} ₫
                  </td>
                </tr>
              ))}

              {garageBreakdownRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-sm text-secondary">
                    {isLoading
                      ? 'Đang tổng hợp dữ liệu báo cáo từ Database...'
                      : 'Chưa có dữ liệu Gara hoặc giao dịch trong Database.'}
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
