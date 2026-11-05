// ============================================================================
// MÀN HÌNH QUYẾT ĐỊNH & THỰC THI HOÀN TIỀN KHIẾU NẠI (REFUNDS VIEW - UC-27)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Quản trị Tài chính & Hệ thống Admin
// Mục đích (Yêu cầu #7):
// 1. Làm đơn giản hóa và chuẩn hóa màn hình Hoàn tiền & Khiếu nại của Admin:
//    - Xóa bỏ hoàn toàn dữ liệu mẫu `INITIAL_DISPUTES`, con số gắn cứng `"95.000.000 ₫ Quỹ dự phòng"`,
//      và các hình ảnh xe máy giả từ Unsplash.
// 2. Truy xuất 100% danh sách hồ sơ khiếu nại & hoàn tiền từ Database qua `financeApi.getRefunds()`.
// 3. Các tab lọc trạng thái (`ALL`, `ESCALATED_TO_ADMIN`, `OPEN`, `UNDER_REVIEW`, `RESOLVED_REFUND`, `REJECTED`)
//    và ô tìm kiếm hoạt động thực tế trên dữ liệu Database thông qua hook `useMemo`.
// 4. Tự động tính toán 3 thẻ KPI trực tiếp từ các bản ghi trong Database:
//    - KPI 1: Khiếu nại chờ xử lý (`OPEN` + `UNDER_REVIEW` + `ESCALATED_TO_ADMIN`).
//    - KPI 2: Đã duyệt hoàn tiền (`RESOLVED_REFUND` - số lượng & tổng `refundAmount`).
//    - KPI 3: Đã từ chối hoàn tiền (`REJECTED` - số lượng).
// 5. Bảng Phán quyết của Admin bên phải (Admin Decision Panel):
//    - Hiển thị Mã khiếu nại (Dispute ID), Mã đơn cứu hộ (Rescue Request ID), Tên & SĐT Khách hàng,
//      Tên Gara bị khiếu nại, Loại khiếu nại (Dispute Type), Lý do & Mô tả của khách,
//      Biên bản xác minh của Staff (`staffResolutionNotes`), Số tiền yêu cầu hoàn (`requestedRefundAmount`).
//    - Admin chọn Quyết định (`APPROVE_REFUND` hoặc `REJECT_REFUND`), nhập `refundAmount`,
//      chọn Nguồn trích hoàn tiền (`GARAGE_WALLET` hoặc `PLATFORM_RESERVE`), nhập `resolutionNotes`,
//      và gửi quyết định qua `financeApi.processRefund(...)`.
// ============================================================================

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { DisputeBackendResponse, financeApi } from '../../services/financeApi';

/**
 * Giao diện Props truyền vào RefundsView.
 */
interface RefundsViewProps {
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

/**
 * Kiểu dữ liệu các Tab lọc trạng thái hồ sơ khiếu nại & hoàn tiền.
 */
type RefundStatusTab =
  | 'ALL'
  | 'ESCALATED_TO_ADMIN'
  | 'OPEN'
  | 'UNDER_REVIEW'
  | 'RESOLVED_REFUND'
  | 'REJECTED';

/**
 * Chuẩn hóa trạng thái khiếu nại từ Backend về tập trạng thái chuẩn trên giao diện:
 * - 'ESCALATED_TO_ADMIN' (tương ứng ESCALATED_TO_ADMIN hoặc ADMIN_APPROVAL)
 * - 'OPEN'
 * - 'UNDER_REVIEW' (tương ứng UNDER_REVIEW hoặc STAFF_REVIEW)
 * - 'RESOLVED_REFUND' (tương ứng RESOLVED_REFUND hoặc REFUNDED)
 * - 'REJECTED'
 */
function normalizeDisputeStatus(
  status?: string
): 'ESCALATED_TO_ADMIN' | 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED_REFUND' | 'REJECTED' {
  const raw = String(status || 'OPEN').toUpperCase();
  if (raw === 'ESCALATED_TO_ADMIN' || raw === 'ADMIN_APPROVAL') return 'ESCALATED_TO_ADMIN';
  if (raw === 'UNDER_REVIEW' || raw === 'STAFF_REVIEW') return 'UNDER_REVIEW';
  if (raw === 'RESOLVED_REFUND' || raw === 'REFUNDED') return 'RESOLVED_REFUND';
  if (raw === 'REJECTED') return 'REJECTED';
  return 'OPEN';
}

/**
 * Trích xuất các trường dữ liệu chuẩn hóa từ đối tượng `DisputeBackendResponse`.
 */
function extractDisputeFields(d: DisputeBackendResponse) {
  const disputeCode = d.disputeCode || `DISP-${d.id}`;
  const rescueRequestId = d.rescueRequestId ?? d.rescueOrderId ?? 0;
  const rescueCode = d.rescueCode || (rescueRequestId ? `#RESCUE-${rescueRequestId}` : '—');
  const requestedRefundAmount = Number(
    d.proposedRefundAmount ?? d.requestedRefundAmount ?? 0
  );
  const finalRefundAmount = Number(
    d.refundAmount ?? d.approvedRefundAmount ?? requestedRefundAmount
  );
  const customerReason = d.reason || d.customerReason || 'Khách hàng gửi yêu cầu khiếu nại dịch vụ';
  const description = d.description || '';
  const staffResolutionNotes =
    d.staffResolutionNotes || d.staffFindingNote || 'Chưa có ghi chú xác minh từ Staff';
  const resolutionNotes = d.resolutionNotes || d.adminResolutionNote || '';
  const rawUrls = d.evidenceImageUrls
    ? d.evidenceImageUrls.split(',').map((s) => s.trim()).filter(Boolean)
    : [];
  const normalizedStatus = normalizeDisputeStatus(d.status);

  return {
    disputeCode,
    rescueRequestId,
    rescueCode,
    requestedRefundAmount,
    finalRefundAmount,
    customerReason,
    description,
    staffResolutionNotes,
    resolutionNotes,
    evidenceUrls: rawUrls,
    normalizedStatus
  };
}

export const RefundsView: React.FC<RefundsViewProps> = ({ onShowToast }) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Danh sách toàn bộ hồ sơ khiếu nại & hoàn tiền lấy từ Database
  const [refundCases, setRefundCases] = useState<DisputeBackendResponse[]>([]);

  // ID của hồ sơ đang được chọn để phán quyết ở bảng bên phải
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // State cho Tab lọc trạng thái và Ô tìm kiếm
  const [statusTab, setStatusTab] = useState<RefundStatusTab>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // State cho biểu mẫu Phán quyết Hoàn tiền của Admin (Admin Decision Form)
  const [decision, setDecision] = useState<'APPROVE_REFUND' | 'REJECT_REFUND'>('APPROVE_REFUND');
  const [refundAmountInput, setRefundAmountInput] = useState<number>(0);
  const [refundSource, setRefundSource] = useState<'GARAGE_WALLET' | 'PLATFORM_RESERVE'>(
    'GARAGE_WALLET'
  );
  const [resolutionNotesInput, setResolutionNotesInput] = useState<string>('');

  // Trạng thái đang tải dữ liệu và đang gửi phán quyết
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  // State phục vụ modal phóng to ảnh bằng chứng hiện trường (Lightbox)
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU KHIẾU NẠI & HOÀN TIỀN TỪ DATABASE
  // ==========================================================================

  /**
   * Hàm gọi API `financeApi.getRefunds()` để tải danh sách hồ sơ hoàn tiền thực tế từ Database.
   */
  const loadRefundsFromDb = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await financeApi.getRefunds();
      const list = Array.isArray(data) ? data : [];
      setRefundCases(list);

      if (list.length > 0) {
        setSelectedId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0].id));
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không thể tải danh sách hồ sơ hoàn tiền từ Database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Tự động tải danh sách khi mở màn hình.
   */
  useEffect(() => {
    void loadRefundsFromDb();
  }, [loadRefundsFromDb]);

  // ==========================================================================
  // TÍNH TOÁN 3 THẺ KPI VÀ BỘ LỌC BẰNG HOOK useMemo
  // ==========================================================================

  /**
   * Tính toán 3 thẻ chỉ số KPI trực tiếp từ danh sách `refundCases` trong Database:
   * 1. Khiếu nại chờ xử lý (`OPEN` + `UNDER_REVIEW` + `ESCALATED_TO_ADMIN`)
   * 2. Đã duyệt hoàn tiền (`RESOLVED_REFUND` - số lượng & tổng số tiền hoàn)
   * 3. Đã từ chối hoàn tiền (`REJECTED` - số lượng)
   */
  const kpiStats = useMemo(() => {
    let pendingCount = 0;
    let resolvedRefundCount = 0;
    let totalRefundedAmount = 0;
    let rejectedCount = 0;

    refundCases.forEach((c) => {
      const f = extractDisputeFields(c);
      if (
        f.normalizedStatus === 'OPEN' ||
        f.normalizedStatus === 'UNDER_REVIEW' ||
        f.normalizedStatus === 'ESCALATED_TO_ADMIN'
      ) {
        pendingCount += 1;
      } else if (f.normalizedStatus === 'RESOLVED_REFUND') {
        resolvedRefundCount += 1;
        totalRefundedAmount += f.finalRefundAmount;
      } else if (f.normalizedStatus === 'REJECTED') {
        rejectedCount += 1;
      }
    });

    return {
      pendingCount,
      resolvedRefundCount,
      totalRefundedAmount,
      rejectedCount
    };
  }, [refundCases]);

  /**
   * Lọc danh sách hồ sơ theo Tab trạng thái (`statusTab`) và từ khóa tìm kiếm (`searchQuery`).
   */
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return refundCases.filter((c) => {
      const f = extractDisputeFields(c);

      if (statusTab !== 'ALL' && f.normalizedStatus !== statusTab) {
        return false;
      }

      if (!q) return true;

      return (
        f.disputeCode.toLowerCase().includes(q) ||
        String(c.id).includes(q) ||
        f.rescueCode.toLowerCase().includes(q) ||
        String(f.rescueRequestId).includes(q) ||
        (c.customerName || '').toLowerCase().includes(q) ||
        (c.customerPhone || '').toLowerCase().includes(q) ||
        (c.garageName || '').toLowerCase().includes(q)
      );
    });
  }, [refundCases, statusTab, searchQuery]);

  // Hồ sơ đang được chọn để hiển thị ở khung Phán quyết bên phải
  const selectedCase = useMemo(() => {
    return (
      filteredCases.find((c) => c.id === selectedId) ||
      refundCases.find((c) => c.id === selectedId) ||
      filteredCases[0] ||
      null
    );
  }, [filteredCases, refundCases, selectedId]);

  /**
   * Đồng bộ giá trị mặc định của form phán quyết khi Admin chọn một hồ sơ khác.
   */
  useEffect(() => {
    if (selectedCase) {
      const f = extractDisputeFields(selectedCase);
      setRefundAmountInput(f.requestedRefundAmount);
      setResolutionNotesInput(f.resolutionNotes || '');
      setDecision('APPROVE_REFUND');
      setRefundSource(
        selectedCase.refundSource === 'PLATFORM_FUND' ||
          selectedCase.refundSource === 'PLATFORM_RESERVE'
          ? 'PLATFORM_RESERVE'
          : 'GARAGE_WALLET'
      );
    }
  }, [selectedCase]);

  // ==========================================================================
  // XỬ LÝ GỬI QUYẾT ĐỊNH HOÀN TIỀN CỦA ADMIN (UC-27)
  // ==========================================================================

  /**
   * Gửi phán quyết của Admin (`APPROVE_REFUND` hoặc `REJECT_REFUND`) xuống Database
   * thông qua `financeApi.processRefund(...)`.
   */
  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    const f = extractDisputeFields(selectedCase);
    if (decision === 'APPROVE_REFUND' && (refundAmountInput <= 0 || !Number.isFinite(refundAmountInput))) {
      onShowToast(
        'Số tiền không hợp lệ',
        'Vui lòng nhập số tiền hoàn trả lớn hơn 0 VNĐ khi duyệt hoàn tiền.',
        'error'
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const defaultNotes =
        decision === 'APPROVE_REFUND'
          ? `Admin phê duyệt hoàn tiền ${refundAmountInput.toLocaleString('vi-VN')} ₫ cho khách hàng ${selectedCase.customerName}`
          : `Admin từ chối yêu cầu hoàn tiền cho hồ sơ #${f.disputeCode}`;

      const updated = await financeApi.processRefund(selectedCase.id, {
        decision,
        refundAmount: decision === 'APPROVE_REFUND' ? refundAmountInput : 0,
        refundSource,
        resolutionNotes: resolutionNotesInput.trim() || defaultNotes
      });

      // Cập nhật trực tiếp hồ sơ trong state `refundCases`
      setRefundCases((prev) =>
        prev.map((item) => (item.id === selectedCase.id ? { ...item, ...updated } : item))
      );

      onShowToast(
        decision === 'APPROVE_REFUND' ? 'Đã duyệt hoàn tiền thành công' : 'Đã từ chối hoàn tiền',
        decision === 'APPROVE_REFUND'
          ? `Đã hoàn ${refundAmountInput.toLocaleString('vi-VN')} ₫ cho khách hàng ${selectedCase.customerName} (Nguồn: ${
              refundSource === 'GARAGE_WALLET' ? 'Ví Gara' : 'Quỹ dự phòng nền tảng'
            }).`
          : `Đã bác bỏ yêu cầu hoàn tiền đối với hồ sơ #${f.disputeCode}.`,
        decision === 'APPROVE_REFUND' ? 'success' : 'info'
      );
    } catch (err) {
      onShowToast(
        'Lỗi xử lý hoàn tiền',
        (err as Error).message || 'Không thể lưu quyết định hoàn tiền.',
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
      {/* Header màn hình Hoàn tiền */}
      <div className="bg-surface-container-lowest p-6 rounded-xl shadow-xs border border-surface-container">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Phán Quyết &amp; Thực Thi Hoàn Tiền Khiếu Nại
          </h1>
          <p className="text-sm text-secondary mt-1">
            Xem xét hồ sơ khiếu nại và biên bản xác minh từ nhân viên Staff, quyết định phê duyệt hoàn tiền (trích từ Ví Gara hoặc Quỹ dự phòng) hoặc từ chối hoàn tiền.
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* 3 Thẻ chỉ số KPI tính trực tiếp từ Database */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* KPI 1: Khiếu nại chờ xử lý */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            1. Khiếu nại chờ xử lý
          </div>
          <div className="text-2xl font-bold font-mono text-amber-600 mt-1.5">
            {kpiStats.pendingCount} hồ sơ
          </div>
          <div className="text-xs text-secondary mt-1">
            Bao gồm OPEN, UNDER_REVIEW và ESCALATED_TO_ADMIN
          </div>
        </div>

        {/* KPI 2: Đã duyệt hoàn tiền */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            2. Đã duyệt hoàn tiền
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-700 mt-1.5">
            {kpiStats.resolvedRefundCount} hồ sơ ({kpiStats.totalRefundedAmount.toLocaleString('vi-VN')} ₫)
          </div>
          <div className="text-xs text-secondary mt-1">
            Tổng số tiền đã hoàn trả cho khách hàng
          </div>
        </div>

        {/* KPI 3: Đã từ chối hoàn tiền */}
        <div className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container shadow-xs">
          <div className="text-xs font-bold uppercase text-secondary">
            3. Đã từ chối hoàn tiền
          </div>
          <div className="text-2xl font-bold font-mono text-red-600 mt-1.5">
            {kpiStats.rejectedCount} hồ sơ
          </div>
          <div className="text-xs text-secondary mt-1">
            Khiếu nại không đủ căn cứ hoàn tiền
          </div>
        </div>
      </div>

      {/* Thanh công cụ: Các Tab lọc trạng thái & Ô tìm kiếm */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5 bg-surface-container-low p-1 rounded-lg border border-surface-container">
          {(
            [
              { id: 'ALL', label: `Tất cả (${refundCases.length})` },
              { id: 'ESCALATED_TO_ADMIN', label: 'Chờ Admin duyệt' },
              { id: 'OPEN', label: 'Mới mở' },
              { id: 'UNDER_REVIEW', label: 'Staff đang xem' },
              { id: 'RESOLVED_REFUND', label: 'Đã hoàn tiền' },
              { id: 'REJECTED', label: 'Đã từ chối' }
            ] as { id: RefundStatusTab; label: string }[]
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusTab(tab.id)}
              className={`px-2.5 py-1.5 rounded-md text-xs font-bold transition-colors cursor-pointer ${
                statusTab === tab.id
                  ? 'bg-primary text-on-primary shadow-xs'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="w-full lg:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã khiếu nại, mã đơn, tên khách, tên Gara..."
            className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Bố cục 2 cột: Danh sách hồ sơ bên trái (7 cột) + Bảng phán quyết Admin bên phải (5 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái (7 cột): Bảng danh sách hồ sơ khiếu nại */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-container text-xs font-bold text-secondary uppercase tracking-wider">
                  <th className="py-3 px-4">Mã KN / Đơn cứu hộ</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Gara bị khiếu nại</th>
                  <th className="py-3 px-4">Loại vi phạm</th>
                  <th className="py-3 px-4 text-right">Đề xuất hoàn</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container text-sm">
                {filteredCases.map((c) => {
                  const f = extractDisputeFields(c);
                  const isSelected = selectedCase?.id === c.id;

                  return (
                    <tr
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-primary/10 font-medium'
                          : 'hover:bg-surface-container-low/50'
                      }`}
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        <div className="font-bold text-primary">#{f.disputeCode}</div>
                        <div className="text-secondary">Đơn: {f.rescueCode}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">{c.customerName}</div>
                        <div className="font-mono text-xs text-secondary">
                          {c.customerPhone || '—'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-on-surface">
                          {c.garageName || `Garage #${c.garageId ?? ''}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 font-mono text-xs font-bold">
                          {c.disputeType}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-primary whitespace-nowrap">
                        {f.requestedRefundAmount.toLocaleString('vi-VN')} ₫
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                            f.normalizedStatus === 'RESOLVED_REFUND'
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

                {filteredCases.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-secondary">
                      {isLoading
                        ? 'Đang tải danh sách khiếu nại & hoàn tiền...'
                        : 'Không có hồ sơ khiếu nại nào khớp với bộ lọc hiện tại.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cột phải (5 cột): Bảng Phán quyết Hoàn tiền của Admin (Admin Decision Panel) */}
        <div className="lg:col-span-5 bg-surface-container-lowest p-6 rounded-xl border border-surface-container shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <h2 className="text-base font-bold text-on-surface">
              Bảng Phán Quyết Hoàn Tiền
            </h2>
            {selectedCase && (
              <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded bg-primary/10 text-primary">
                #{extractDisputeFields(selectedCase).disputeCode}
              </span>
            )}
          </div>

          {selectedCase ? (
            (() => {
              const f = extractDisputeFields(selectedCase);
              const isResolved =
                f.normalizedStatus === 'RESOLVED_REFUND' || f.normalizedStatus === 'REJECTED';

              return (
                <div className="space-y-4 text-sm">
                  {/* Chi tiết hồ sơ khiếu nại */}
                  <div className="p-4 rounded-lg bg-surface-container-low space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-secondary">Mã khiếu nại:</span>
                      <strong className="font-mono text-on-surface">
                        #{f.disputeCode} (ID: {selectedCase.id})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Mã đơn cứu hộ:</span>
                      <strong className="font-mono text-primary">
                        {f.rescueCode} (#{f.rescueRequestId})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Khách hàng &amp; SĐT:</span>
                      <strong className="text-on-surface">
                        {selectedCase.customerName} ({selectedCase.customerPhone || '—'})
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Gara bị khiếu nại:</span>
                      <strong className="text-on-surface">
                        {selectedCase.garageName || `Garage #${selectedCase.garageId ?? ''}`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Loại khiếu nại:</span>
                      <strong className="font-mono text-red-700">{selectedCase.disputeType}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-secondary">Số tiền yêu cầu hoàn:</span>
                      <strong className="font-mono text-base text-primary">
                        {f.requestedRefundAmount.toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                  </div>

                  {/* Lý do của khách hàng & Biên bản xác minh của Staff */}
                  <div className="p-3.5 rounded-lg bg-surface-container space-y-2 text-xs">
                    <div>
                      <span className="font-bold uppercase text-secondary block">
                        Lý do &amp; mô tả khiếu nại của khách hàng:
                      </span>
                      <p className="text-on-surface mt-0.5">
                        {f.customerReason}
                        {f.description ? ` — ${f.description}` : ''}
                      </p>
                    </div>
                    <div className="border-t border-surface-container-high pt-2">
                      <span className="font-bold uppercase text-tertiary block">
                        Ghi chú xác minh của Staff:
                      </span>
                      <p className="text-on-surface mt-0.5 italic">{f.staffResolutionNotes}</p>
                    </div>
                  </div>

                  {/* Hình ảnh bằng chứng do khách hàng tải lên */}
                  {f.evidenceUrls.length > 0 && (
                    <div className="p-3.5 rounded-lg bg-surface-container space-y-2 text-xs">
                      <span className="font-bold uppercase text-secondary block">
                        Bằng chứng hiện trường / Hóa đơn ({f.evidenceUrls.length} ảnh):
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {f.evidenceUrls.map((url, idx) => (
                          <img
                            key={idx}
                            src={url}
                            alt={'Bằng chứng ' + (idx + 1)}
                            onClick={() => setPreviewImage(url)}
                            className="w-full h-20 object-cover rounded border border-surface-container-high cursor-pointer hover:opacity-80 transition-opacity"
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Biểu mẫu ra quyết định của Admin */}
                  {!isResolved ? (
                    <form onSubmit={handleSubmitDecision} className="space-y-3 pt-1">
                      <div>
                        <label className="block text-xs font-bold uppercase text-secondary mb-1">
                          Quyết định của Admin
                        </label>
                        <select
                          aria-label="Quyết định hoàn tiền"
                          value={decision}
                          onChange={(e) =>
                            setDecision(e.target.value as 'APPROVE_REFUND' | 'REJECT_REFUND')
                          }
                          className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-xs font-bold text-on-surface"
                        >
                          <option value="APPROVE_REFUND">
                            Duyệt hoàn tiền cho khách
                          </option>
                          <option value="REJECT_REFUND">
                            Từ chối yêu cầu hoàn tiền
                          </option>
                        </select>
                      </div>

                      {decision === 'APPROVE_REFUND' && (
                        <>
                          <div>
                            <label className="block text-xs font-bold uppercase text-secondary mb-1">
                              Số tiền duyệt hoàn (VNĐ)
                            </label>
                            <input
                              type="number"
                              min={0}
                              value={refundAmountInput}
                              onChange={(e) => setRefundAmountInput(Number(e.target.value))}
                              className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low font-mono font-bold text-sm text-primary focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold uppercase text-secondary mb-1">
                              Nguồn trích hoàn tiền
                            </label>
                            <select
                              aria-label="Nguồn trích hoàn tiền"
                              value={refundSource}
                              onChange={(e) =>
                                setRefundSource(
                                  e.target.value as 'GARAGE_WALLET' | 'PLATFORM_RESERVE'
                                )
                              }
                              className="w-full h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-xs font-semibold text-on-surface"
                            >
                              <option value="GARAGE_WALLET">
                                Trích từ Ví số dư của Gara
                              </option>
                              <option value="PLATFORM_RESERVE">
                                Trích từ Quỹ dự phòng nền tảng
                              </option>
                            </select>
                          </div>
                        </>
                      )}

                      <div>
                        <label className="block text-xs font-bold uppercase text-secondary mb-1">
                          Ghi chú phán quyết của Admin
                        </label>
                        <textarea
                          rows={2}
                          value={resolutionNotesInput}
                          onChange={(e) => setResolutionNotesInput(e.target.value)}
                          placeholder="Nhập nội dung phán quyết hoàn tiền..."
                          className="w-full p-2.5 rounded-lg border border-surface-container bg-surface-container-low text-xs text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-2.5 px-4 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-container transition-colors cursor-pointer disabled:opacity-60"
                      >
                        {isSubmitting
                          ? 'Đang thực thi phán quyết...'
                          : decision === 'APPROVE_REFUND'
                          ? `Xác nhận hoàn tiền ${refundAmountInput.toLocaleString('vi-VN')} ₫`
                          : 'Xác nhận từ chối hoàn tiền'}
                      </button>
                    </form>
                  ) : (
                    <div className="p-3.5 rounded-lg bg-surface-container text-xs space-y-1">
                      <div className="font-bold text-on-surface">
                        Hồ sơ đã xử lý ({f.normalizedStatus})
                      </div>
                      {f.normalizedStatus === 'RESOLVED_REFUND' && (
                        <div className="font-mono text-emerald-700 font-bold">
                          Số tiền đã hoàn: {f.finalRefundAmount.toLocaleString('vi-VN')} ₫
                        </div>
                      )}
                      {f.resolutionNotes && (
                        <div className="text-secondary">
                          Phán quyết của Admin: {f.resolutionNotes}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            <div className="py-8 text-center text-sm text-secondary">
              Chọn một hồ sơ khiếu nại bên trái để xem chi tiết và ra quyết định hoàn tiền.
            </div>
          )}
        </div>
      </div>
      {/* Modal phóng to ảnh bằng chứng (Lightbox) */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] bg-surface-container-lowest rounded-xl overflow-hidden shadow-2xl p-2 border border-surface-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-2 border-b border-surface-container">
              <span className="font-label-md font-bold text-on-surface flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[20px] text-primary">zoom_in</span>
                Chi Tiết Bằng Chứng Ảnh Hiện Trường / Hóa Đơn
              </span>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded hover:bg-surface-container text-secondary hover:text-on-surface transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>
            <div className="p-2 flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={previewImage}
                alt="Preview Evidence"
                className="max-h-[70vh] w-auto object-contain rounded"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
