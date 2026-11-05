// ============================================================================
// MÀN HÌNH TIẾP NHẬN, XÁC MINH KHIẾU NẠI & ĐỀ XUẤT HOÀN TIỀN (DISPUTE FRAUD VIEW - UC-23 STAFF)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Xử lý Khiếu nại & Tài chính (UC-23 & UC-27)
// Mục đích:
// 1. Dành cho Nhân viên Vận hành & Chăm sóc khách hàng (STAFF) tiếp nhận các hồ sơ khiếu nại
//    của khách hàng đối với Gara đối tác (ví dụ: Thu vượt báo giá OVERCHARGE, Chất lượng kém POOR_QUALITY,
//    Làm hư hỏng phương tiện DAMAGE, Báo cáo sai hiện trường FAKE_RESCUE).
// 2. Truy xuất 100% danh sách hồ sơ khiếu nại thực tế từ Cơ sở dữ liệu qua `financeApi.getStaffDisputes()`.
//    Loại bỏ hoàn toàn dữ liệu giả lập (mockData) truyền từ props và các hình ảnh Unsplash gắn cứng.
// 3. Cho phép Staff kiểm tra thông tin hai bên (Khách hàng & Gara), nhập mức tiền đề xuất hoàn trả
//    (`proposedRefundAmount`) và ghi chú biên bản xác minh (`staffFindingNote`), sau đó:
//    - Chuyển hồ sơ lên Admin phê duyệt hoàn tiền (`decision = 'ADMIN_APPROVAL'`)
//    - Hoặc bác bỏ khiếu nại nếu Gara thu đúng quy định (`decision = 'REJECTED'`).
// ============================================================================

import { ViewGuide } from '../ViewGuide';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScreenId } from '../../types';
import { DisputeBackendResponse, financeApi } from '../../services/financeApi';

/**
 * Giao diện Props truyền vào DisputeFraudView.
 * Tham số `disputes` là tùy chọn để tương thích ngược, nhưng component luôn lấy dữ liệu thật từ Database.
 */
interface DisputeFraudViewProps {
  disputes?: unknown[];
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

export const DisputeFraudView: React.FC<DisputeFraudViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  // ==========================================================================
  // KHAI BÁO CÁC BIẾN TRẠNG THÁI (REACT STATE)
  // ==========================================================================

  // Danh sách toàn bộ hồ sơ khiếu nại lấy trực tiếp từ Database qua API /staff/disputes
  const [caseList, setCaseList] = useState<DisputeBackendResponse[]>([]);

  // ID của hồ sơ đang được Staff chọn để lập biên bản xác minh ở cột bên phải
  const [selectedId, setSelectedId] = useState<number | null>(null);

  // State cho biểu mẫu lập biên bản xác minh của Staff (UC-23)
  const [proposedAmount, setProposedAmount] = useState<number>(0);
  const [staffNote, setStaffNote] = useState<string>('');

  // State cho thanh tìm kiếm và bộ lọc trạng thái hồ sơ
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Trạng thái đang tải dữ liệu và đang gửi biên bản xác minh
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // ==========================================================================
  // HÀM TẢI DỮ LIỆU KHIẾU NẠI TỪ DATABASE
  // ==========================================================================

  /**
   * Gọi API `financeApi.getStaffDisputes()` để nạp danh sách hồ sơ khiếu nại thực tế từ Database.
   */
  const loadStaffDisputes = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    try {
      const data = await financeApi.getStaffDisputes();
      const list = Array.isArray(data) ? data : [];
      setCaseList(list);

      if (list.length > 0) {
        setSelectedId((prev) => (prev && list.some((c) => c.id === prev) ? prev : list[0].id));
      } else {
        setSelectedId(null);
      }
    } catch (err) {
      setErrorMsg((err as Error).message || 'Không thể tải danh sách hồ sơ khiếu nại từ Database.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Tự động tải danh sách khiếu nại khi mở màn hình.
   */
  useEffect(() => {
    void loadStaffDisputes();
  }, [loadStaffDisputes]);

  // ==========================================================================
  // TÍNH TOÁN CHỈ SỐ THỐNG KÊ VÀ LỌC HỒ SƠ BẰNG HOOK useMemo
  // ==========================================================================

  /**
   * Tính toán các thẻ chỉ số KPI trực tiếp từ danh sách `caseList` trong Database.
   */
  const metrics = useMemo(() => {
    const total = caseList.length;
    const staffReviewCount = caseList.filter(
      (c) => c.status === 'STAFF_REVIEW' || c.status === 'OPEN' || c.status === 'UNDER_REVIEW'
    ).length;
    const escalatedCount = caseList.filter(
      (c) => c.status === 'ADMIN_APPROVAL' || c.status === 'ESCALATED_TO_ADMIN'
    ).length;
    const resolvedCount = caseList.filter(
      (c) => c.status === 'REFUNDED' || c.status === 'RESOLVED_REFUND'
    ).length;

    return { total, staffReviewCount, escalatedCount, resolvedCount };
  }, [caseList]);

  /**
   * Lọc danh sách hồ sơ khiếu nại theo trạng thái và từ khóa tìm kiếm.
   */
  const filteredCases = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    return caseList.filter((c) => {
      if (statusFilter !== 'ALL' && c.status !== statusFilter) {
        return false;
      }
      if (!q) return true;

      const code = (c.disputeCode || `DISP-${c.id}`).toLowerCase();
      const rescueCode = (c.rescueCode || `#RESCUE-${c.rescueOrderId ?? ''}`).toLowerCase();
      const customer = (c.customerName || '').toLowerCase();
      const garage = (c.garageName || '').toLowerCase();

      return (
        code.includes(q) ||
        rescueCode.includes(q) ||
        customer.includes(q) ||
        garage.includes(q)
      );
    });
  }, [caseList, statusFilter, searchQuery]);

  // Hồ sơ đang được chọn để hiển thị chi tiết bên phải
  const selectedCase = useMemo(() => {
    return (
      filteredCases.find((c) => c.id === selectedId) ||
      caseList.find((c) => c.id === selectedId) ||
      filteredCases[0] ||
      null
    );
  }, [filteredCases, caseList, selectedId]);

  /**
   * Đồng bộ giá trị mặc định của ô nhập tiền đề xuất hoàn và ghi chú khi Staff chọn hồ sơ khác.
   */
  useEffect(() => {
    if (selectedCase) {
      setProposedAmount(
        Number(selectedCase.proposedRefundAmount ?? selectedCase.requestedRefundAmount ?? 0)
      );
      setStaffNote(
        selectedCase.staffFindingNote || selectedCase.staffResolutionNotes || ''
      );
    } else {
      setProposedAmount(0);
      setStaffNote('');
    }
  }, [selectedCase]);

  // ==========================================================================
  // XỬ LÝ LẬP BIÊN BẢN XÁC MINH & CHUYỂN LÊN ADMIN HOẶC BÁC BỎ (UC-23)
  // ==========================================================================

  /**
   * Hàm gửi kết quả thẩm tra của Staff lên Backend qua `financeApi.reviewDisputeByStaff(...)`.
   */
  const handleResolveDispute = async (
    resolution: 'PROPOSE_ADMIN_REFUND' | 'REJECT_COMPLAINT'
  ) => {
    if (!selectedCase) return;
    setIsSubmitting(true);

    const decision = resolution === 'PROPOSE_ADMIN_REFUND' ? 'ADMIN_APPROVAL' : 'REJECTED';
    const caseCode = selectedCase.disputeCode || `DISP-${selectedCase.id}`;
    const noteToSend =
      staffNote.trim() ||
      (decision === 'ADMIN_APPROVAL'
        ? `Staff đã xác minh chứng từ, đề xuất Admin duyệt hoàn ${proposedAmount.toLocaleString('vi-VN')} ₫ cho khách hàng.`
        : `Staff đã kiểm tra chứng từ hợp lệ, bác bỏ khiếu nại #${caseCode}.`);

    try {
      const updated = await financeApi.reviewDisputeByStaff(
        selectedCase.id,
        decision,
        decision === 'ADMIN_APPROVAL' ? proposedAmount : 0,
        noteToSend
      );

      // Cập nhật trực tiếp bản ghi trong state `caseList`
      setCaseList((prev) =>
        prev.map((item) => (item.id === selectedCase.id ? { ...item, ...updated } : item))
      );

      onShowToast(
        decision === 'ADMIN_APPROVAL'
          ? 'Đã chuyển hồ sơ lên Admin'
          : 'Đã bác bỏ khiếu nại',
        decision === 'ADMIN_APPROVAL'
          ? `Biên bản xác minh #${caseCode} (Đề xuất hoàn ${proposedAmount.toLocaleString('vi-VN')} ₫) đã chuyển sang hàng đợi Admin phê duyệt.`
          : `Đã bác bỏ khiếu nại #${caseCode} và lưu biên bản vào Database.`,
        decision === 'ADMIN_APPROVAL' ? 'success' : 'info'
      );
    } catch (err) {
      onShowToast(
        'Lỗi lưu biên bản xác minh',
        (err as Error).message || 'Không thể cập nhật biên bản khiếu nại.',
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-surface-container pb-4">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">
            Xử Lý Khiếu Nại Dịch Vụ &amp; Lập Biên Bản Xác Minh (Staff)
          </h1>
          <ViewGuide>
            <p className="text-sm text-secondary mt-1">
              Staff tiếp nhận khiếu nại từ khách hàng, đối chiếu giá dịch vụ và bằng chứng hiện trường, lập biên bản xác minh và đề xuất mức hoàn tiền lên Admin phê duyệt.
            </p>
          </ViewGuide>
        </div>

        <button
          type="button"
          disabled={isLoading}
          onClick={() => void loadStaffDisputes()}
          className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-sm font-semibold hover:bg-surface-container-high transition-all cursor-pointer"
        >
          {isLoading ? 'Đang tải...' : 'Làm mới từ Database'}
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          {errorMsg}
        </div>
      )}

      {/* 4 Thẻ chỉ số KPI từ Database */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Tổng số hồ sơ (DB)</span>
          <div className="text-2xl font-bold text-on-surface font-mono mt-1">
            {metrics.total} ca
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Chờ Staff xác minh</span>
          <div className="text-2xl font-bold text-red-600 font-mono mt-1">
            {metrics.staffReviewCount} ca
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Đã trình Admin duyệt</span>
          <div className="text-2xl font-bold text-amber-600 font-mono mt-1">
            {metrics.escalatedCount} ca
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-xs uppercase font-bold text-secondary">Đã hoàn tiền hoàn tất</span>
          <div className="text-2xl font-bold text-emerald-700 font-mono mt-1">
            {metrics.resolvedCount} ca
          </div>
        </div>
      </div>

      {/* Thanh tìm kiếm & lọc trạng thái */}
      <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container flex flex-col sm:flex-row items-center justify-between gap-3">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo mã khiếu nại, mã cứu hộ, tên khách hàng, tên Gara..."
          className="w-full sm:w-96 h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm text-on-surface"
        />

        <select
          aria-label="Lọc trạng thái khiếu nại"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 rounded-lg border border-surface-container bg-surface-container-low text-sm font-semibold text-on-surface"
        >
          <option value="ALL">Tất cả trạng thái ({caseList.length})</option>
          <option value="STAFF_REVIEW">Chờ Staff xác minh (STAFF_REVIEW)</option>
          <option value="ADMIN_APPROVAL">Chờ Admin duyệt (ADMIN_APPROVAL)</option>
          <option value="REFUNDED">Đã hoàn tiền (REFUNDED)</option>
          <option value="REJECTED">Đã bác bỏ (REJECTED)</option>
        </select>
      </div>

      {/* Lưới 2 cột: Danh sách hồ sơ bên trái (5 cột) & Khung lập biên bản bên phải (7 cột) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Cột trái: Danh sách hồ sơ khiếu nại */}
        <div className="lg:col-span-5 space-y-3">
          {filteredCases.map((caseItem) => {
            const code = caseItem.disputeCode || `DISP-${caseItem.id}`;
            const rescueCode =
              caseItem.rescueCode || `#RESCUE-${caseItem.rescueOrderId ?? ''}`;
            const isSelected = selectedCase?.id === caseItem.id;

            return (
              <div
                key={caseItem.id}
                onClick={() => setSelectedId(caseItem.id)}
                className={`p-4 rounded-xl border transition-all cursor-pointer bg-surface-container-lowest ${
                  isSelected
                    ? 'border-primary ring-1 ring-primary bg-primary/5'
                    : 'border-surface-container hover:bg-surface-container-low/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary text-sm">#{code}</span>
                    <span className="text-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                      {caseItem.disputeType}
                    </span>
                  </div>
                  <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                    {caseItem.status}
                  </span>
                </div>

                <div className="text-sm font-bold text-on-surface">
                  {caseItem.customerName} — {caseItem.garageName || `Garage #${caseItem.garageId}`}
                </div>
                <div className="text-xs text-secondary font-mono mt-0.5">
                  Đơn cứu hộ: {rescueCode} •{' '}
                  {caseItem.createdAt
                    ? new Date(caseItem.createdAt).toLocaleString('vi-VN')
                    : ''}
                </div>
                <p className="text-xs text-secondary line-clamp-2 mt-1">
                  {caseItem.customerReason || caseItem.reason}
                </p>

                <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-surface-container text-xs">
                  <span className="text-secondary">Yêu cầu / Đề xuất hoàn:</span>
                  <span className="font-mono font-bold text-red-600">
                    {Number(
                      caseItem.proposedRefundAmount ?? caseItem.requestedRefundAmount ?? 0
                    ).toLocaleString('vi-VN')}{' '}
                    ₫
                  </span>
                </div>
              </div>
            );
          })}

          {filteredCases.length === 0 && (
            <div className="p-8 text-center text-sm text-secondary bg-surface-container-lowest rounded-xl border border-surface-container">
              {isLoading
                ? 'Đang tải danh sách khiếu nại từ Database...'
                : 'Không có hồ sơ khiếu nại nào khớp với điều kiện lọc.'}
            </div>
          )}
        </div>

        {/* Cột phải: Bảng điều tra & lập biên bản của Staff */}
        <div className="lg:col-span-7">
          {selectedCase ? (
            <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-surface-container pb-4">
                <div>
                  <h2 className="text-lg font-bold text-on-surface">
                    Hồ Sơ Xác Minh #{selectedCase.disputeCode || `DISP-${selectedCase.id}`}
                  </h2>
                  <div className="text-xs text-secondary mt-0.5">
                    Mã đơn cứu hộ:{' '}
                    <strong className="font-mono text-primary">
                      {selectedCase.rescueCode || `#RESCUE-${selectedCase.rescueOrderId}`}
                    </strong>{' '}
                    • Trạng thái: <strong>{selectedCase.status}</strong>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs text-secondary">Khách yêu cầu bồi hoàn:</div>
                  <div className="font-mono font-bold text-xl text-red-600">
                    {Number(selectedCase.requestedRefundAmount ?? 0).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>

              {/* Thông tin hai bên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-surface-container-low rounded-lg text-sm">
                <div>
                  <div className="text-xs uppercase font-bold text-secondary mb-1">
                    Khách hàng khiếu nại
                  </div>
                  <div className="font-bold text-on-surface">{selectedCase.customerName}</div>
                  <div className="font-mono text-xs text-secondary">
                    {selectedCase.customerPhone || '—'}
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase font-bold text-secondary mb-1">
                    Gara bị khiếu nại
                  </div>
                  <div className="font-bold text-on-surface">
                    {selectedCase.garageName || `Garage #${selectedCase.garageId}`}
                  </div>
                  <div className="text-xs text-secondary font-mono">
                    Tổng thu đơn gốc:{' '}
                    {Number(selectedCase.originalAmount ?? 0).toLocaleString('vi-VN')} ₫
                  </div>
                </div>
              </div>

              {/* Nội dung phản ánh của khách hàng */}
              <div className="p-4 rounded-lg bg-surface-container text-sm space-y-1">
                <div className="text-xs font-bold uppercase text-secondary">
                  Lý do khiếu nại từ khách hàng:
                </div>
                <p className="text-on-surface">
                  {selectedCase.customerReason || selectedCase.reason || '—'}
                </p>
              </div>

              {/* Biểu mẫu lập biên bản xác minh của Staff */}
              <div className="p-4 rounded-lg bg-surface-container-low border border-surface-container space-y-4">
                <h3 className="text-xs uppercase font-bold text-primary">
                  Biên Bản Xác Minh &amp; Đề Xuất Hoàn Tiền Của Staff
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Mức tiền đề xuất Admin hoàn trả cho khách (VNĐ):
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={proposedAmount}
                    onChange={(e) => setProposedAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-lg border border-surface-container bg-surface text-on-surface font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-secondary mb-1">
                    Kết luận điều tra hiện trường của Staff:
                  </label>
                  <textarea
                    rows={3}
                    value={staffNote}
                    onChange={(e) => setStaffNote(e.target.value)}
                    placeholder="Nhập kết quả kiểm tra hóa đơn, xác minh với Gara và lý do đề xuất hoàn tiền..."
                    className="w-full p-3 rounded-lg border border-surface-container bg-surface text-on-surface text-sm"
                  />
                </div>
              </div>

              {/* Nút hành động */}
              <div className="pt-3 border-t border-surface-container flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  disabled={isSubmitting || selectedCase.status === 'REFUNDED'}
                  onClick={() => void handleResolveDispute('REJECT_COMPLAINT')}
                  className="px-4 py-2 rounded-lg bg-surface-container text-on-surface text-xs font-bold hover:bg-surface-container-high transition-all cursor-pointer disabled:opacity-50"
                >
                  Bác Bỏ Khiếu Nại (Hợp Lệ)
                </button>

                <button
                  type="button"
                  disabled={isSubmitting || selectedCase.status === 'REFUNDED'}
                  onClick={() => void handleResolveDispute('PROPOSE_ADMIN_REFUND')}
                  className="px-5 py-2.5 rounded-lg bg-primary text-on-primary text-sm font-bold hover:bg-primary-container transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting
                    ? 'Đang gửi biên bản...'
                    : 'Lập Biên Bản & Chuyển Admin Duyệt Hoàn Tiền'}
                </button>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-secondary bg-surface-container-lowest rounded-xl border border-surface-container">
              Chọn một hồ sơ khiếu nại bên trái để tiến hành lập biên bản xác minh.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
