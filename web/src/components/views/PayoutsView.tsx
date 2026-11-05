// ============================================================================
// MÀN HÌNH QUẢN LÝ & PHÊ DUYỆT YÊU CẦU RÚT TIỀN VÍ GARA (PAYOUTS VIEW - UC-26)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích (Yêu cầu #6):
// 1. Làm đơn giản hóa và chuẩn hóa quy trình Admin phê duyệt rút tiền (giải ngân) cho Gara:
//    - Xóa bỏ hoàn toàn dữ liệu mẫu `INITIAL_PAYOUTS`, thanh hạn mức giả Napas 247 (`2.5 Tỷ / 5.0 Tỷ`),
//      ô nhập mã PIN/OTP giả (`••••••`), các nút giả `"Duyệt hàng loạt"` & `"Xuất file UNC"`,
//      và địa chỉ/mã số GPKD gắn cứng (`456 Lê Văn Việt...`, `GPKD: 0314598231`).
// 2. Truy xuất 100% danh sách yêu cầu rút tiền thực tế từ Database qua `financeApi.getPayouts()`.
// 3. Các tab lọc trạng thái (`ALL`, `PENDING`, `PROCESSING`, `COMPLETED`, `REJECTED`) và ô tìm kiếm
//    hoạt động thực tế trên dữ liệu Database thông qua hook `useMemo`.
// 4. Tự động tính toán 3 thẻ KPI trực tiếp từ các bản ghi trong Database:
//    - KPI 1: Yêu cầu chờ duyệt (`PENDING` + `PROCESSING` - số lượng & tổng số tiền).
//    - KPI 2: Đã giải ngân thành công (`COMPLETED` / `TRANSFERRED` - số lượng & tổng số tiền).
//    - KPI 3: Đã từ chối & hoàn ví (`REJECTED` - số lượng & tổng số tiền).
// 5. Khung Thẩm định & Phê duyệt bên phải (Admin Action Panel):
//    - Hiển thị Tên Gara (`garageName`), Mã lệnh rút (`#PO-...`), Số tiền yêu cầu rút (`amount`),
//      Ngân hàng thụ hưởng (`bankName`), Số tài khoản (`bankAccount`), Chủ tài khoản (`accountHolderName`),
//      Thời gian tạo (`createdAt`) và Thời gian xử lý (`processedAt`).
//    - Khi trạng thái đang là `PENDING` hoặc `PROCESSING`: Admin nhập Ghi chú thẩm định (`adminNotes`)
//      và Mã tham chiếu giao dịch ngân hàng (`transactionReference`), sau đó nhấn:
//      + "Xác nhận đã chuyển khoản (Duyệt)" (`approve: true`)
//      + hoặc "Từ chối & Hoàn tiền lại ví Gara" (`approve: false`)
//      gọi trực tiếp `financeApi.processPayout(id, { approve, adminNotes, transactionReference })`.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { financeApi, PayoutRequestBackend } from '../../services/financeApi';

/**
 * Giao diện Props truyền vào PayoutsView.
 */
interface PayoutsViewProps {
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

/**
 * Kiểu dữ liệu các Tab lọc trạng thái yêu cầu rút tiền.
 */
type PayoutTabFilter = 'ALL' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';

/**
 * Chuẩn hóa trạng thái của yêu cầu rút tiền từ Backend:
 * - 'PENDING': Chờ duyệt
 * - 'PROCESSING': Đang xử lý (tương ứng PROCESSING hoặc APPROVED)
 * - 'COMPLETED': Đã giải ngân hoàn tất (tương ứng COMPLETED hoặc TRANSFERRED)
 * - 'REJECTED': Đã từ chối & hoàn lại ví Gara
 */
function normalizePayoutStatus(
  status?: string
): 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'REJECTED' {
  const raw = String(status || 'PENDING').toUpperCase();
  if (raw === 'COMPLETED' || raw === 'TRANSFERRED') return 'COMPLETED';
  if (raw === 'PROCESSING' || raw === 'APPROVED') return 'PROCESSING';
  if (raw === 'REJECTED') return 'REJECTED';
  return 'PENDING';
}

/**
 * Trích xuất các trường dữ liệu chuẩn hóa từ đối tượng `PayoutRequestBackend`.
 */
function extractPayoutFields(p: PayoutRequestBackend) {
  const code = p.requestCode || `PO-${p.id}`;
  const amount = Number(p.amount ?? p.requestedAmount ?? 0);
  const bankAccount = p.bankAccount || p.accountNumber || '—';
  const bankName = p.bankName || p.bankCode || 'Ngân hàng nội địa';
  const accountHolderName = p.accountHolderName || '—';
  const normalizedStatus = normalizePayoutStatus(p.status);
  const adminNotes = p.adminNotes ?? p.adminNote ?? '';

  return {
    code,
    amount,
    bankAccount,
    bankName,
    accountHolderName,
    normalizedStatus,
    adminNotes
  };
}

export const PayoutsView: React.FC<PayoutsViewProps> = ({ onShowToast }) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Danh sách toàn bộ yêu cầu rút tiền lấy từ Database
  const [payoutList, setPayoutList] = useState<PayoutRequestBackend[]>([]);

  // ID của bản ghi yêu cầu rút tiền đang được chọn để xử lý ở khung bên phải
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // State quản lý Tab lọc trạng thái và Từ khóa tìm kiếm
  const [statusFilter, setStatusFilter] = useState<PayoutTabFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State cho biểu mẫu xử lý của Admin trên khung bên phải
  const [adminNotesInput, setAdminNotesInput] = useState<string>('');
  const [txReferenceInput, setTxReferenceInput] = useState<string>('');

  // Trạng thái đang tải dữ liệu và đang gửi quyết định phê duyệt/từ chối
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU YÊU CẦU RÚT TIỀN TỪ DATABASE
  // ==========================================================================

  /**
   * Hàm bất đồng bộ gọi `financeApi.getPayouts()` để lấy toàn bộ yêu cầu rút tiền từ Database.
   */
  const loadPayoutsFromDb = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await financeApi.getPayouts();
      const list = Array.isArray(data) ? data : [];
      setPayoutList(list);

      if (list.length > 0) {
        setSelectedId((prev) => (prev && list.some((item) => item.id === prev) ? prev : list[0].id));
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không thể tải danh sách yêu cầu rút tiền từ Database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Tự động tải danh sách yêu cầu rút tiền khi mở màn hình.
   */
  useEffect(() => {
    void loadPayoutsFromDb();
  }, [loadPayoutsFromDb]);

  // ==========================================================================
  // TÍNH TOÁN 3 THẺ CHỈ SỐ KPI VÀ LỌC DANH SÁCH BẰNG HOOK useMemo
  // ==========================================================================

  /**
   * Tính toán 3 thẻ KPI trực tiếp từ danh sách `payoutList` trong Database:
   * 1. Yêu cầu chờ duyệt (`PENDING` + `PROCESSING`): số lượng & tổng tiền.
   * 2. Đã giải ngân thành công (`COMPLETED`): số lượng & tổng tiền.
   * 3. Đã từ chối hoàn ví (`REJECTED`): số lượng & tổng tiền.
   */
  const kpiSummary = useMemo(() => {
    let pendingCount = 0;
    let pendingAmount = 0;
    let completedCount = 0;
    let completedAmount = 0;
    let rejectedCount = 0;
    let rejectedAmount = 0;

    payoutList.forEach((p) => {
      const f = extractPayoutFields(p);
      if (f.normalizedStatus === 'PENDING' || f.normalizedStatus === 'PROCESSING') {
        pendingCount += 1;
        pendingAmount += f.amount;
      } else if (f.normalizedStatus === 'COMPLETED') {
        completedCount += 1;
        completedAmount += f.amount;
      } else if (f.normalizedStatus === 'REJECTED') {
        rejectedCount += 1;
        rejectedAmount += f.amount;
      }
    });

    return {
      pendingCount,
      pendingAmount,
      completedCount,
      completedAmount,
      rejectedCount,
      rejectedAmount
    };
  }, [payoutList]);

  /**
   * Lọc danh sách yêu cầu rút tiền theo Tab trạng thái (`statusFilter`) và ô tìm kiếm (`searchQuery`).
   */
  const filteredPayouts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return payoutList.filter((p) => {
      const f = extractPayoutFields(p);

      // Lọc theo Tab trạng thái
      if (statusFilter !== 'ALL' && f.normalizedStatus !== statusFilter) {
        return false;
      }

      // Lọc theo từ khóa tìm kiếm (Mã lệnh, Tên Gara, Số tài khoản, Chủ tài khoản)
      if (!q) return true;

      return (
        f.code.toLowerCase().includes(q) ||
        String(p.id).includes(q) ||
        (p.garageName || '').toLowerCase().includes(q) ||
        f.bankAccount.toLowerCase().includes(q) ||
        f.accountHolderName.toLowerCase().includes(q) ||
        f.bankName.toLowerCase().includes(q)
      );
    });
  }, [payoutList, statusFilter, searchQuery]);

  // Bản ghi yêu cầu rút tiền đang được chọn để hiển thị ở khung bên phải
  const selectedPayout = useMemo(() => {
    return (
      filteredPayouts.find((p) => p.id === selectedId) ||
      payoutList.find((p) => p.id === selectedId) ||
      filteredPayouts[0] ||
      null
    );
  }, [filteredPayouts, payoutList, selectedId]);

  /**
   * Khi Admin chuyển sang chọn một yêu cầu rút tiền khác, đồng bộ lại ô ghi chú và mã tham chiếu.
   */
  useEffect(() => {
    if (selectedPayout) {
      const f = extractPayoutFields(selectedPayout);
      setAdminNotesInput(f.adminNotes || '');
      setTxReferenceInput(selectedPayout.transactionReference || '');
    } else {
      setAdminNotesInput('');
      setTxReferenceInput('');
    }
  }, [selectedPayout]);

  // ==========================================================================
  // XỬ LÝ PHÊ DUYỆT ĐÃ CHUYỂN KHOẢN HOẶC TỪ CHỐI & HOÀN TIỀN LẠI VÍ GARA
  // ==========================================================================

  /**
   * Hàm gửi quyết định xử lý yêu cầu rút tiền của Admin xuống Database:
   * - `approve === true`: Xác nhận đã chuyển khoản giải ngân cho Gara.
   * - `approve === false`: Từ chối yêu cầu rút tiền và hoàn trả lại số dư vào ví Gara.
   */
  const handleProcessPayout = async (approve: boolean) => {
    if (!selectedPayout) return;
    const f = extractPayoutFields(selectedPayout);

    setIsSubmitting(true);
    try {
      const defaultNote = approve
        ? `Admin xác nhận đã chuyển khoản giải ngân ${f.amount.toLocaleString('vi-VN')} ₫ cho ${selectedPayout.garageName}`
        : `Admin từ chối yêu cầu rút tiền và hoàn trả ${f.amount.toLocaleString('vi-VN')} ₫ về lại ví Gara`;

      const updated = await financeApi.processPayout(selectedPayout.id, {
        approve,
        adminNotes: adminNotesInput.trim() || defaultNote,
        transactionReference: txReferenceInput.trim() || undefined
      });

      // Cập nhật trực tiếp bản ghi trong state `payoutList`
      setPayoutList((prev) =>
        prev.map((item) => (item.id === selectedPayout.id ? { ...item, ...updated } : item))
      );

      onShowToast(
        approve ? 'Đã duyệt giải ngân thành công' : 'Đã từ chối & hoàn ví Gara',
        approve
          ? `Đã xác nhận chuyển khoản ${f.amount.toLocaleString('vi-VN')} ₫ tới ${f.accountHolderName} (${f.bankName}).`
          : `Đã từ chối lệnh rút #${f.code} và hoàn tiền về ví cho ${selectedPayout.garageName}.`,
        approve ? 'success' : 'info'
      );
    } catch (err) {
      onShowToast(
        'Lỗi xử lý yêu cầu rút tiền',
        (err as Error).message || 'Không thể cập nhật trạng thái yêu cầu rút tiền.',
        'error'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ==========================================================================
  // HIỂN THỊ GIAO DIỆN NGƯỜI DÙNG (JSX RENDERING)
  // ==========================================================================

  return (
    <div className="flex flex-col w-full space-y-6">
      {/* Header màn hình Rút tiền */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Quản Lý Yêu Cầu Rút Tiền Ví Gara
          </h1>
          <p className="text-sm text-secondary mt-1">
            Kiểm tra thông tin tài khoản ngân hàng thụ hưởng của Gara đối tác, xác nhận đã chuyển khoản giải ngân hoặc từ chối để hoàn tiền lại vào ví Gara.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* 3 Thẻ chỉ số KPI tính trực tiếp từ các bản ghi trong Database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Yêu cầu chờ duyệt */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            1. Yêu cầu chờ duyệt
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1.5">
            {kpiSummary.pendingCount} lệnh ({kpiSummary.pendingAmount.toLocaleString('vi-VN')} ₫)
          </div>
          <div className="text-xs text-secondary mt-1">
            Đang chờ Admin chuyển khoản giải ngân
          </div>
        </div>

        {/* KPI 2: Đã giải ngân thành công */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            2. Đã giải ngân thành công
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1.5">
            {kpiSummary.completedCount} lệnh ({kpiSummary.completedAmount.toLocaleString('vi-VN')} ₫)
          </div>
          <div className="text-xs text-secondary mt-1">
            Đã hoàn tất chuyển khoản về ngân hàng Gara
          </div>
        </div>

        {/* KPI 3: Đã từ chối hoàn ví */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            3. Đã từ chối &amp; hoàn ví
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1.5">
            {kpiSummary.rejectedCount} lệnh ({kpiSummary.rejectedAmount.toLocaleString('vi-VN')} ₫)
          </div>
          <div className="text-xs text-secondary mt-1">
            Đã hoàn trả tiền về lại số dư ví Gara
          </div>
        </div>
      </div>

      {/* Thanh công cụ: Các Tab lọc trạng thái & Ô tìm kiếm */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-surface-container">
          {(
            [
              { id: 'ALL', label: `Tất cả (${payoutList.length})` },
              { id: 'PENDING', label: 'Chờ duyệt' },
              { id: 'PROCESSING', label: 'Đang xử lý' },
              { id: 'COMPLETED', label: 'Đã giải ngân' },
              { id: 'REJECTED', label: 'Đã từ chối' }
            ] as { id: PayoutTabFilter; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full lg:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo Tên Gara, Số TK, Chủ TK, Mã #PO..."
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Bố cục 2 cột: Bảng danh sách yêu cầu rút tiền (7 cột) + Khung phê duyệt của Admin (5 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái (7 cột): Bảng danh sách yêu cầu rút tiền */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Mã lệnh / Ngày tạo</th>
                  <th className="py-3 px-4">Gara yêu cầu</th>
                  <th className="py-3 px-4">Ngân hàng thụ hưởng</th>
                  <th className="py-3 px-4 text-right">Số tiền rút</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-sm">
                {filteredPayouts.map((p) => {
                  const f = extractPayoutFields(p);
                  const isSelected = selectedPayout?.id === p.id;

                  return (
                    <tr
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 font-medium'
                          : 'hover:bg-surface-container-low/50'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        <div className="font-bold text-primary">#{f.code}</div>
                        <div className="text-secondary">
                          {p.createdAt ? new Date(p.createdAt).toLocaleString('vi-VN') : '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">{p.garageName}</div>
                        <div className="text-xs text-secondary">Garage ID: #{p.garageId}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">{f.bankName}</div>
                        <div className="font-mono text-xs text-secondary">
                          {f.bankAccount} • {f.accountHolderName}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-primary whitespace-nowrap">
                        {f.amount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            f.normalizedStatus === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : f.normalizedStatus === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {f.normalizedStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}

                {filteredPayouts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-secondary">
                      {isLoading
                        ? 'Đang tải danh sách yêu cầu rút tiền...'
                        : 'Không có yêu cầu rút tiền nào khớp với điều kiện lọc.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột phải (5 cột): Bảng Thẩm định & Phê duyệt Rút tiền của Admin */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <h2 className="text-base font-bold text-on-surface">
              Chi Tiết &amp; Phê Duyệt Rút Tiền
            </h2>
            {selectedPayout && (
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-primary/10 text-primary">
                #{extractPayoutFields(selectedPayout).code}
              </span>
            )}
          </div>

          {selectedPayout ? (
            (() => {
              const f = extractPayoutFields(selectedPayout);
              const isActionable =
                f.normalizedStatus === 'PENDING' || f.normalizedStatus === 'PROCESSING';

              return (
                <div className="space-y-4 text-sm">
                  {/* Thông tin Gara & Ngân hàng thụ hưởng */}
                  <div className="p-4 rounded-lg bg-surface-container-low space-y-2.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">Tên Gara đối tác:</span>
                      <strong className="text-on-surface text-sm">{selectedPayout.garageName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Mã yêu cầu rút tiền:</span>
                      <strong className="font-mono text-primary">#{f.code}</strong>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-secondary">Số tiền đề nghị rút:</span>
                      <strong className="font-mono text-lg text-primary">
                        {f.amount.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                    <div className="border-t border-surface-container pt-2 flex justify-between">
                      <span className="text-secondary">Ngân hàng thụ hưởng:</span>
                      <strong className="text-on-surface">{f.bankName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Số tài khoản nhận:</span>
                      <strong className="font-mono text-on-surface">{f.bankAccount}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Chủ tài khoản:</span>
                      <strong className="text-on-surface uppercase">{f.accountHolderName}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Thời gian tạo lệnh:</span>
                      <span className="font-mono text-on-surface">
                        {selectedPayout.createdAt
                          ? new Date(selectedPayout.createdAt).toLocaleString('vi-VN')
                          : '—'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Thời gian xử lý:</span>
                      <span className="font-mono text-on-surface">
                        {selectedPayout.processedAt
                          ? new Date(selectedPayout.processedAt).toLocaleString('vi-VN')
                          : 'Chưa xử lý'}
                      </span>
                    </div>
                  </div>

                  {/* Khu vực nhập ghi chú & nút Phê duyệt / Từ chối */}
                  {isActionable ? (
                    <div className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold uppercase text-secondary mb-1">
                          Mã tham chiếu giao dịch ngân hàng
                        </label>
                        <input
                          type="text"
                          value={txReferenceInput}
                          onChange={(e) => setTxReferenceInput(e.target.value)}
                          placeholder="Ví dụ: FT261105882910..."
                          className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low font-mono text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase text-secondary mb-1">
                          Ghi chú của Admin (Admin Notes)
                        </label>
                        <textarea
                          rows={2}
                          value={adminNotesInput}
                          onChange={(e) => setAdminNotesInput(e.target.value)}
                          placeholder="Nhập ghi chú xác nhận chuyển khoản hoặc lý do từ chối..."
                          className="w-full p-2.5 rounded-lg border border-surface-container bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleProcessPayout(true)}
                          className="w-full py-2.5 px-4 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-60"
                        >
                          {isSubmitting
                            ? 'Đang xử lý...'
                            : 'Xác nhận đã chuyển khoản (Duyệt)'}
                        </button>

                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => void handleProcessPayout(false)}
                          className="w-full py-2 px-4 rounded-lg bg-red-50 text-red-700 border border-red-200 font-bold text-xs hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-60"
                        >
                          Từ chối &amp; Hoàn tiền lại ví Gara
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-surface-container text-xs space-y-1">
                      <div className="font-bold text-on-surface">
                        Trạng thái lệnh: {f.normalizedStatus}
                      </div>
                      {selectedPayout.transactionReference && (
                        <div className="font-mono text-secondary">
                          Mã tham chiếu NH: {selectedPayout.transactionReference}
                        </div>
                      )}
                      {f.adminNotes && (
                        <div className="text-secondary">Ghi chú Admin: {f.adminNotes}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="py-8 text-center text-sm text-secondary">
              Chọn một yêu cầu rút tiền ở bảng bên trái để xem chi tiết và phê duyệt.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
