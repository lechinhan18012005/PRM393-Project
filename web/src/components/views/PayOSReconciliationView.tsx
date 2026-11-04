// ============================================================================
// MÀN HÌNH ĐỐI SOÁT GIAO DỊCH THANH TOÁN PAYOS & VIETQR (PAYOS RECONCILIATION VIEW - UC-25)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích (Yêu cầu #5):
// 1. Làm đơn giản hóa và chuẩn hóa màn hình Đối soát giao dịch:
//    - Loại bỏ hoàn toàn dữ liệu giả lập `INITIAL_PAYOS_TRANSACTIONS`, các con số cứng (`1.345.200.000 ₫`,
//      `1,420 đơn`, `99.85%`), hộp hiển thị Raw JSON Payload phức tạp, nút giả "Xuất hóa đơn VAT",
//      và các đường dẫn ảnh Unsplash giả lập.
// 2. Truy xuất 100% dữ liệu giao dịch thực tế từ Cơ sở dữ liệu qua `financeApi.getTransactions()`.
// 3. Tự động tính toán 4 thẻ chỉ số KPI trực tiếp từ danh sách giao dịch trong Database bằng `useMemo`:
//    - KPI 1: Tổng doanh thu từ các giao dịch thành công (`PAID`).
//    - KPI 2: Tổng phí chiết khấu nền tảng thu được (`platformCommission` của các đơn `PAID`).
//    - KPI 3: Tổng số tiền thực nhận về ví Gara (`garageNetAmount` của các đơn `PAID`).
//    - KPI 4: Thống kê số lượng giao dịch theo từng trạng thái (`PAID` / `PENDING` / `REFUNDED` / `FAILED`).
// 4. Hỗ trợ Tìm kiếm đa tiêu chí (Mã GD, Mã đơn cứu hộ, Mã PayOS OrderCode, Tên Gara),
//    Lọc theo Trạng thái (`ALL`, `PAID`, `PENDING`, `REFUNDED`, `FAILED`),
//    Lọc theo Phương thức thanh toán (`ALL`, `PAYOS`, `VIETQR`, `CASH`) và Phân trang đầy đủ.
// 5. Bảng chi tiết giao dịch bên phải hiển thị rõ ràng, mạch lạc khi Admin chọn một dòng giao dịch:
//    Mã giao dịch, Mã đơn cứu hộ (`rescueRequestId`), Gara thụ hưởng (`garageName`), Phương thức (`paymentMethod`),
//    Trạng thái (`paymentStatus`), Bảng phân tách dòng tiền (Tổng thu khách `totalAmount` -> Trừ phí sàn
//    `platformCommission` (`commissionRate`%) -> Gara thực nhận `garageNetAmount`), Mã tham chiếu PayOS
//    (`payosOrderCode`), Trạng thái xác thực Webhook (`webhookReceived`), Thời gian tạo & thanh toán.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { financeApi, PaymentTransactionBackend } from '../../services/financeApi';

/**
 * Giao diện Props truyền vào PayOSReconciliationView.
 */
interface PayOSReconciliationViewProps {
  onSelectScreen?: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

/**
 * Chuẩn hóa trạng thái thanh toán trả về từ Backend về 4 nhóm chuẩn:
 * - 'PAID' (tương ứng cả PAID và SUCCESS trong DB)
 * - 'PENDING'
 * - 'REFUNDED'
 * - 'FAILED'
 */
function normalizeTxStatus(tx: PaymentTransactionBackend): 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED' {
  const raw = String(tx.paymentStatus || tx.status || 'PENDING').toUpperCase();
  if (raw === 'PAID' || raw === 'SUCCESS') return 'PAID';
  if (raw === 'REFUNDED') return 'REFUNDED';
  if (raw === 'FAILED' || raw === 'CANCELLED') return 'FAILED';
  return 'PENDING';
}

/**
 * Chuẩn hóa các trường số học và định danh của giao dịch để tương thích với cả 2 quy ước đặt tên DTO Backend.
 */
function extractTxFields(tx: PaymentTransactionBackend) {
  const totalAmount = Number(tx.totalAmount ?? tx.amount ?? 0);
  const commissionRate = Number(tx.commissionRate ?? 0);
  const platformCommission = Number(tx.platformCommission ?? tx.platformFee ?? 0);
  const garageNetAmount = Number(
    tx.garageNetAmount ?? tx.netGarageAmount ?? Math.max(0, totalAmount - platformCommission)
  );
  const rescueRequestId = tx.rescueRequestId ?? tx.rescueOrderId ?? 0;
  const rescueCode = tx.rescueCode || (rescueRequestId ? `#RESCUE-${rescueRequestId}` : '—');
  const paymentStatus = normalizeTxStatus(tx);
  const paymentMethod = String(tx.paymentMethod || 'PAYOS').toUpperCase();
  const webhookReceived = Boolean(tx.webhookReceived ?? tx.checksumValid ?? tx.reconciled);

  return {
    totalAmount,
    commissionRate,
    platformCommission,
    garageNetAmount,
    rescueRequestId,
    rescueCode,
    paymentStatus,
    paymentMethod,
    webhookReceived
  };
}

export const PayOSReconciliationView: React.FC<PayOSReconciliationViewProps> = ({
  onShowToast
}) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Danh sách toàn bộ giao dịch tải trực tiếp từ Database
  const [transactions, setTransactions] = useState<PaymentTransactionBackend[]>([]);

  // ID của giao dịch đang được chọn để hiển thị trên khung Chi tiết giao dịch bên phải
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);

  // Trạng thái đang tải dữ liệu hoặc đang thực thi đối soát tự động
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Các state phục vụ Tìm kiếm (Search) và Bộ lọc (Filter)
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED'>('ALL');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'PAYOS' | 'VIETQR' | 'CASH'>('ALL');

  // Các state phục vụ Phân trang (Pagination)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU GIAO DỊCH TỪ DATABASE
  // ==========================================================================

  /**
   * Hàm gọi API `financeApi.getTransactions()` để nạp toàn bộ danh sách giao dịch từ Database.
   */
  const loadTransactions = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await financeApi.getTransactions();
      const list = Array.isArray(data) ? data : [];
      setTransactions(list);
      // Nếu chưa chọn giao dịch nào và danh sách có phần tử, tự động chọn giao dịch đầu tiên
      if (list.length > 0) {
        setSelectedTxId((prev) => (prev && list.some((t) => t.id === prev) ? prev : list[0].id));
      } else {
        setSelectedTxId(null);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không thể tải danh sách giao dịch từ Database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Tự động tải danh sách giao dịch khi mở màn hình.
   */
  useEffect(() => {
    void loadTransactions();
  }, [loadTransactions]);

  // ==========================================================================
  // TÍNH TOÁN 4 THẺ KPI TÀI CHÍNH TỪ DỮ LIỆU THỰC TẾ TRONG DATABASE
  // ==========================================================================

  /**
   * Tính toán 4 chỉ số KPI trực tiếp từ danh sách `transactions` trong Database:
   * 1. Tổng doanh thu giao dịch thành công (`PAID`)
   * 2. Tổng phí chiết khấu nền tảng thu được (`platformCommission` của đơn `PAID`)
   * 3. Tổng thực nhận về ví Gara (`garageNetAmount` của đơn `PAID`)
   * 4. Số lượng giao dịch theo từng trạng thái (`PAID`, `PENDING`, `REFUNDED`, `FAILED`)
   */
  const kpiStats = useMemo(() => {
    let paidRevenue = 0;
    let totalPlatformCommission = 0;
    let totalGarageNet = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let refundedCount = 0;
    let failedCount = 0;

    transactions.forEach((tx) => {
      const f = extractTxFields(tx);
      if (f.paymentStatus === 'PAID') {
        paidCount += 1;
        paidRevenue += f.totalAmount;
        totalPlatformCommission += f.platformCommission;
        totalGarageNet += f.garageNetAmount;
      } else if (f.paymentStatus === 'PENDING') {
        pendingCount += 1;
      } else if (f.paymentStatus === 'REFUNDED') {
        refundedCount += 1;
      } else if (f.paymentStatus === 'FAILED') {
        failedCount += 1;
      }
    });

    return {
      paidRevenue,
      totalPlatformCommission,
      totalGarageNet,
      paidCount,
      pendingCount,
      refundedCount,
      failedCount,
      totalCount: transactions.length
    };
  }, [transactions]);

  // ==========================================================================
  // LỌC GIAO DỊCH THEO TỪ KHÓA, TRẠNG THÁI, PHƯƠNG THỨC & PHÂN TRANG
  // ==========================================================================

  /**
   * Lọc danh sách giao dịch theo:
   * - `statusFilter` ('ALL' | 'PAID' | 'PENDING' | 'REFUNDED' | 'FAILED')
   * - `methodFilter` ('ALL' | 'PAYOS' | 'VIETQR' | 'CASH')
   * - `searchTerm` (mã GD, mã đơn cứu hộ, mã PayOS OrderCode, tên Gara, tên khách hàng)
   */
  const filteredTransactions = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();

    return transactions.filter((tx) => {
      const f = extractTxFields(tx);

      // 1. Lọc theo trạng thái thanh toán
      if (statusFilter !== 'ALL' && f.paymentStatus !== statusFilter) {
        return false;
      }

      // 2. Lọc theo phương thức thanh toán
      if (methodFilter !== 'ALL') {
        if (methodFilter === 'CASH' && f.paymentMethod !== 'CASH') return false;
        if (methodFilter === 'PAYOS' && !f.paymentMethod.includes('PAYOS')) return false;
        if (methodFilter === 'VIETQR' && !f.paymentMethod.includes('VIETQR') && !f.paymentMethod.includes('PAYOS')) {
          return false;
        }
      }

      // 3. Lọc theo từ khóa tìm kiếm
      if (!q) return true;

      const matchId = String(tx.id).toLowerCase().includes(q);
      const matchRescueId = String(f.rescueRequestId).toLowerCase().includes(q);
      const matchRescueCode = f.rescueCode.toLowerCase().includes(q);
      const matchOrderCode = String(tx.payosOrderCode ?? '').toLowerCase().includes(q);
      const matchGarage = (tx.garageName || '').toLowerCase().includes(q);
      const matchCustomer = (tx.customerName || '').toLowerCase().includes(q);

      return (
        matchId ||
        matchRescueId ||
        matchRescueCode ||
        matchOrderCode ||
        matchGarage ||
        matchCustomer
      );
    });
  }, [transactions, statusFilter, methodFilter, searchTerm]);

  // Đặt lại về trang 1 khi thay đổi điều kiện lọc
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, methodFilter, pageSize]);

  // Tính toán phân trang
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredTransactions.length);

  const paginatedTransactions = useMemo(() => {
    return filteredTransactions.slice(startIndex, endIndex);
  }, [filteredTransactions, startIndex, endIndex]);

  // Giao dịch đang được chọn để hiển thị ở bảng Chi tiết bên phải
  const selectedTx = useMemo(() => {
    return (
      filteredTransactions.find((t) => t.id === selectedTxId) ||
      transactions.find((t) => t.id === selectedTxId) ||
      filteredTransactions[0] ||
      null
    );
  }, [filteredTransactions, transactions, selectedTxId]);

  // ==========================================================================
  // XỬ LÝ ĐỐI SOÁT TỰ ĐỘNG VỚI BACKEND
  // ==========================================================================

  /**
   * Gọi API `financeApi.reconcileAllTransactions()` để thực hiện đối soát tự động các giao dịch PayOS.
   */
  const handleReconcileNow = async () => {
    setIsReconciling(true);
    try {
      const updated = await financeApi.reconcileAllTransactions();
      if (Array.isArray(updated)) {
        setTransactions(updated);
      } else {
        await loadTransactions();
      }
      onShowToast(
        'Đối soát thành công',
        'Đã đồng bộ và xác thực đối soát các giao dịch thanh toán từ Database.',
        'success'
      );
    } catch (err) {
      onShowToast(
        'Lỗi đối soát',
        (err as Error).message || 'Không thể thực hiện đối soát tự động.',
        'error'
      );
    } finally {
      setIsReconciling(false);
    }
  };

  // ==========================================================================
  // HIỂN THỊ GIAO DIỆN NGƯỜI DÙNG (JSX RENDERING)
  // ==========================================================================

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header màn hình Đối soát PayOS */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Đối Soát Giao Dịch Thanh Toán PayOS &amp; VietQR
          </h1>
          <p className="text-sm text-secondary mt-1">
            Giám sát dòng tiền thu hộ từ khách hàng, khấu trừ phí chiết khấu nền tảng và cộng tiền thực nhận vào ví Gara đối tác (100% dữ liệu từ Database).
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start lg:self-auto">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => void loadTransactions()}
            className="px-4 py-2 rounded-lg bg-surface-container-low hover:bg-surface-container border border-surface-container text-sm font-semibold text-on-surface transition-colors cursor-pointer"
          >
            {isLoading ? 'Đang tải...' : 'Làm mới dữ liệu'}
          </button>
          <button
            type="button"
            disabled={isReconciling || isLoading}
            onClick={() => void handleReconcileNow()}
            className="px-4 py-2 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-60"
          >
            {isReconciling ? 'Đang đối soát...' : 'Đối soát tự động'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* 4 Thẻ chỉ số KPI tính toán trực tiếp từ danh sách giao dịch trong Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Tổng doanh thu giao dịch thành công (PAID) */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            1. Tổng doanh thu đơn thành công (PAID)
          </div>
          <div className="text-2xl font-bold font-mono text-on-surface mt-1.5">
            {kpiStats.paidRevenue.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-emerald-700 font-semibold mt-1">
            Từ {kpiStats.paidCount} giao dịch đã thanh toán
          </div>
        </div>

        {/* KPI 2: Tổng phí chiết khấu nền tảng thu được */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            2. Tổng phí chiết khấu nền tảng thu được
          </div>
          <div className="text-2xl font-bold font-mono text-primary mt-1.5">
            {kpiStats.totalPlatformCommission.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            Doanh thu hoa hồng sàn trên các đơn PAID
          </div>
        </div>

        {/* KPI 3: Tổng thực nhận về ví Gara */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            3. Tổng thực nhận về ví Gara
          </div>
          <div className="text-2xl font-bold font-mono text-tertiary mt-1.5">
            {kpiStats.totalGarageNet.toLocaleString('vi-VN')} ₫
          </div>
          <div className="text-xs text-secondary mt-1">
            Đã cộng tự động vào số dư ví các Gara
          </div>
        </div>

        {/* KPI 4: Số lượng giao dịch theo trạng thái */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            4. Số lượng giao dịch theo trạng thái
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs font-mono">
            <span className="text-emerald-700 font-bold">PAID: {kpiStats.paidCount}</span>
            <span className="text-amber-700 font-bold">PENDING: {kpiStats.pendingCount}</span>
            <span className="text-blue-700 font-bold">REFUNDED: {kpiStats.refundedCount}</span>
            <span className="text-red-700 font-bold">FAILED: {kpiStats.failedCount}</span>
          </div>
        </div>
      </div>

      {/* Thanh công cụ Tìm kiếm & Bộ lọc Trạng thái / Phương thức thanh toán */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
        {/* Ô tìm kiếm */}
        <div className="md:col-span-5">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo Mã GD, Mã đơn cứu hộ, PayOS OrderCode, Tên Gara..."
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Lọc theo Trạng thái giao dịch */}
        <div className="md:col-span-3">
          <select
            aria-label="Lọc trạng thái giao dịch"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface font-semibold"
          >
            <option value="ALL">Trạng thái: Tất cả ({transactions.length})</option>
            <option value="PAID">Thành công (PAID)</option>
            <option value="PENDING">Đang chờ (PENDING)</option>
            <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
            <option value="FAILED">Thất bại (FAILED)</option>
          </select>
        </div>

        {/* Lọc theo Phương thức thanh toán */}
        <div className="md:col-span-2">
          <select
            aria-label="Lọc phương thức thanh toán"
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as typeof methodFilter)}
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface font-semibold"
          >
            <option value="ALL">Phương thức: Tất cả</option>
            <option value="PAYOS">PayOS</option>
            <option value="VIETQR">VietQR</option>
            <option value="CASH">Tiền mặt (CASH)</option>
          </select>
        </div>

        {/* Chọn số dòng mỗi trang */}
        <div className="md:col-span-2">
          <select
            aria-label="Số dòng mỗi trang"
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface font-semibold"
          >
            <option value={5}>5 dòng/trang</option>
            <option value={10}>10 dòng/trang</option>
            <option value={20}>20 dòng/trang</option>
          </select>
        </div>
      </div>

      {/* Bố cục 2 cột: Bảng danh sách giao dịch (8 cột) & Bảng chi tiết giao dịch (4 cột) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Cột trái (8 cột): Bảng danh sách giao dịch từ Database */}
        <div className="xl:col-span-8 bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase tracking-wider">
                  <th className="py-3 px-3">Mã GD / PayOS Code</th>
                  <th className="py-3 px-3">Mã đơn cứu hộ</th>
                  <th className="py-3 px-3">Gara thụ hưởng</th>
                  <th className="py-3 px-3 text-center">Phương thức</th>
                  <th className="py-3 px-3 text-right">Tổng thu khách</th>
                  <th className="py-3 px-3 text-right">Phí chiết khấu</th>
                  <th className="py-3 px-3 text-right">Gara thực nhận</th>
                  <th className="py-3 px-3 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-sm">
                {paginatedTransactions.map((tx) => {
                  const f = extractTxFields(tx);
                  const isSelected = selectedTx?.id === tx.id;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => setSelectedTxId(tx.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 font-medium'
                          : 'hover:bg-surface-container-low/50'
                      }`}
                    >
                      <td className="py-3 px-3 font-mono text-xs">
                        <div className="font-bold text-primary">#TX-{tx.id}</div>
                        <div className="text-secondary">
                          PayOS: {tx.payosOrderCode || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-xs">
                        <div className="font-bold text-on-surface">{f.rescueCode}</div>
                        <div className="text-secondary">ID đơn: #{f.rescueRequestId}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-on-surface">{tx.garageName}</div>
                        {tx.customerName && (
                          <div className="text-xs text-secondary">Khách: {tx.customerName}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-xs font-semibold">
                        {f.paymentMethod}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-on-surface whitespace-nowrap">
                        {f.totalAmount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-primary whitespace-nowrap">
                        -{f.platformCommission.toLocaleString('vi-VN')} ₫
                        <span className="block text-[10px] text-secondary">
                          ({f.commissionRate}%)
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-tertiary whitespace-nowrap">
                        {f.garageNetAmount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            f.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.paymentStatus === 'REFUNDED'
                              ? 'bg-blue-100 text-blue-800'
                              : f.paymentStatus === 'FAILED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {f.paymentStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {paginatedTransactions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-sm text-secondary">
                      {isLoading
                        ? 'Đang tải danh sách giao dịch từ Database...'
                        : 'Không có giao dịch nào phù hợp với điều kiện tìm kiếm.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Thanh phân trang */}
          <div className="px-4 py-3 bg-surface-container-low border-t border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-secondary">
            <div>
              Hiển thị{' '}
              <strong className="text-on-surface">
                {filteredTransactions.length === 0 ? 0 : startIndex + 1}
              </strong>{' '}
              - <strong className="text-on-surface">{endIndex}</strong> trên tổng số{' '}
              <strong className="text-on-surface">{filteredTransactions.length}</strong> giao dịch
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded bg-surface-container-lowest border border-surface-container text-on-surface font-semibold disabled:opacity-40 cursor-pointer"
              >
                Trước
              </button>
              <span className="px-3 py-1 rounded bg-primary text-on-primary font-mono font-bold">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded bg-surface-container-lowest border border-surface-container text-on-surface font-semibold disabled:opacity-40 cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        </div>

        {/* Cột phải (4 cột): Khung Chi tiết Giao dịch đơn giản, rõ ràng */}
        <div className="xl:col-span-4 bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <h2 className="text-base font-bold text-on-surface">Chi Tiết Đối Soát Giao Dịch</h2>
            {selectedTx && (
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-primary/10 text-primary">
                #TX-{selectedTx.id}
              </span>
            )}
          </div>

          {selectedTx ? (
            (() => {
              const f = extractTxFields(selectedTx);
              return (
                <div className="space-y-4 text-sm">
                  {/* Thông tin định danh giao dịch */}
                  <div className="p-3.5 rounded-lg bg-surface-container-low space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">Mã giao dịch (DB ID):</span>
                      <strong className="font-mono text-on-surface">#TX-{selectedTx.id}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Mã đơn cứu hộ:</span>
                      <strong className="font-mono text-primary">
                        {f.rescueCode} (#{f.rescueRequestId})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Gara thụ hưởng:</span>
                      <strong className="text-on-surface">{selectedTx.garageName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Phương thức thanh toán:</span>
                      <strong className="font-mono text-on-surface">{f.paymentMethod}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Trạng thái thanh toán:</span>
                      <strong className="font-mono text-emerald-700">{f.paymentStatus}</strong>
                    </div>
                  </div>

                  {/* Bảng phân tách tài chính (Financial Breakdown) */}
                  <div className="p-4 rounded-lg bg-surface-container border border-surface-container-high space-y-2.5">
                    <div className="text-xs font-bold uppercase text-secondary">
                      Phân tách dòng tiền giao dịch
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-secondary">Tổng thu khách hàng:</span>
                      <strong className="font-mono text-on-surface">
                        {f.totalAmount.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-secondary">
                        Trừ phí chiết khấu sàn ({f.commissionRate}%):
                      </span>
                      <strong className="font-mono text-primary">
                        -{f.platformCommission.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                    <div className="border-t border-surface-container-high pt-2 flex justify-between items-center">
                      <span className="font-bold text-on-surface">Gara thực nhận về ví:</span>
                      <strong className="font-mono text-lg text-tertiary">
                        {f.garageNetAmount.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                  </div>

                  {/* Thông tin tham chiếu PayOS & Webhook */}
                  <div className="p-3.5 rounded-lg bg-surface-container-low space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">Mã tham chiếu PayOS:</span>
                      <strong className="font-mono text-on-surface">
                        {selectedTx.payosOrderCode || '—'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Xác thực Webhook PayOS:</span>
                      <strong
                        className={
                          f.webhookReceived ? 'text-emerald-700 font-bold' : 'text-amber-700'
                        }
                      >
                        {f.webhookReceived ? 'Đã xác thực (Hợp lệ)' : 'Chưa nhận Webhook'}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Thời gian tạo giao dịch:</span>
                      <span className="font-mono text-on-surface">
                        {selectedTx.createdAt
                          ? new Date(selectedTx.createdAt).toLocaleString('vi-VN')
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Thời gian thanh toán:</span>
                      <span className="font-mono text-on-surface">
                        {selectedTx.paidAt
                          ? new Date(selectedTx.paidAt).toLocaleString('vi-VN')
                          : '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="py-8 text-center text-sm text-secondary">
              Chọn một dòng giao dịch ở bảng bên trái để xem chi tiết phân tách tài chính.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
