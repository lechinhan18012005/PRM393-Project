// ============================================================================
// MÀN HÌNH TIẾP NHẬN, XÁC MINH KHIẾU NẠI & ĐỀ XUẤT HOÀN TIỀN (DISPUTE FRAUD VIEW)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Xử lý Khiếu nại & Tài chính
// Mục đích:
// 1. Dành cho Nhân viên Vận hành & CSKH (STAFF) tiếp nhận các hồ sơ khiếu nại của khách hàng
//    đối với Gara đối tác (Thu vượt giá, Làm hỏng xe, Gian lận cuốc cứu hộ, Kém chất lượng).
// 2. Tự động đồng bộ danh sách khiếu nại từ Database qua API inanceApi.getStaffDisputes().
// 3. Cho phép Staff thẩm tra bằng chứng ảnh hiện trường, so sánh biểu phí, nhập mức bồi hoàn đề xuất
//    và gửi biên bản lên Admin phê duyệt hoặc bác bỏ nếu chứng từ Gara hợp lệ.
// 4. Hỗ trợ xem phóng to ảnh bằng chứng (Lightbox Modal) và phân loại theo tab trạng thái.
// ============================================================================

import { ViewGuide } from '../ViewGuide';
import React, { useEffect, useState } from 'react';
import { DisputeCase, ScreenId } from '../../types';
import { DisputeBackendResponse, financeApi } from '../../services/financeApi';

interface DisputeFraudViewProps {
  disputes?: DisputeCase[];
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
}

type TabType = 'STAFF_REVIEW' | 'ADMIN_APPROVAL' | 'RESOLVED' | 'ALL';

export const DisputeFraudView: React.FC<DisputeFraudViewProps> = ({
  disputes = [],
  onSelectScreen,
  onShowToast
}) => {
  const [caseList, setCaseList] = useState<(DisputeCase & { backendId?: number })[]>(disputes);
  const [selectedCase, setSelectedCase] = useState<(DisputeCase & { backendId?: number }) | null>(disputes[0] || null);
  const [proposedAmount, setProposedAmount] = useState<number>(disputes[0]?.requestedRefund || 0);
  const [staffNote, setStaffNote] = useState<string>(disputes[0]?.inspectorNote || '');
  const [resolutionError, setResolutionError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('STAFF_REVIEW');

  /**
   * Chuyển đổi đối tượng DisputeBackendResponse từ Database thành cấu trúc DisputeCase cho giao diện.
   */
  const mapBackendToDisputeCase = (d: DisputeBackendResponse): DisputeCase & { backendId: number } => {
    const diff = d.proposedRefundAmount ?? d.requestedRefundAmount ?? 0;
    const orig = d.originalAmount || diff;
    const rawUrls = d.evidenceImageUrls
      ? d.evidenceImageUrls.split(',').map((s) => s.trim()).filter(Boolean)
      : [];

    const formatDisputeTypeName = (type: string) => {
      switch (type) {
        case 'OVERCHARGE':
          return 'Thu vượt giá';
        case 'DAMAGE':
          return 'Hư hỏng xe';
        case 'FAKE_RESCUE':
          return 'Gian lận cứu hộ';
        default:
          return 'Kém chất lượng';
      }
    };

    return {
      backendId: d.id,
      id: d.disputeCode || `DISP-${d.id}`,
      rescueCode: d.rescueCode || 'RESCUE-01',
      payosCode: d.payosOrderCode ? `POS-${d.payosOrderCode}` : 'Chưa có mã PayOS',
      customerName: d.customerName || 'Khách hàng',
      customerPhone: d.customerPhone || 'Chưa cung cấp',
      garageName: d.garageName || 'Chưa xác định',
      garageId: d.garageId ? `GAR-${d.garageId}` : 'N/A',
      garageWalletBalance: d.garageWalletBalance ?? 0,
      type: formatDisputeTypeName(d.disputeType),
      severity: d.disputeType === 'FAKE_RESCUE' || d.disputeType === 'DAMAGE' ? 'L3_CRITICAL' : 'L2_HIGH',
      originalPrice: orig,
      requestedRefund: diff,
      customerReason: d.customerReason || 'Khách hàng yêu cầu hỗ trợ bồi hoàn dịch vụ cứu hộ.',
      time: d.createdAt ? new Date(d.createdAt).toLocaleString('vi-VN') : 'Vừa xong',
      status: (d.status as any) || 'STAFF_REVIEW',
      inspectorName: d.staffReviewerName || 'Chưa phân công',
      inspectorId: d.staffReviewerId ? `STAFF-${d.staffReviewerId}` : 'Chưa gán',
      inspectorNote: d.staffFindingNote || '',
      adminResolutionNote: d.adminResolutionNote,
      evidenceReceiptUrl: rawUrls[0] || '',
      evidenceUrls: rawUrls,
      refundReferenceCode: d.refundReferenceCode,
      audioDuration: '',
      diffItems: [
        {
          name:
            d.disputeType === 'OVERCHARGE'
              ? 'Chênh lệch thu vượt biểu phí chuẩn sàn'
              : d.disputeType === 'DAMAGE'
              ? 'Tổn hại phụ tùng xe trong quá trình cứu hộ'
              : d.disputeType === 'FAKE_RESCUE'
              ? 'Chi phí cuốc cứu hộ gian lận / không thực hiện'
              : 'Chi phí bồi hoàn dịch vụ kém chất lượng',
          desc: d.customerReason || 'Khách yêu cầu bồi hoàn',
          priceV1: Math.max(0, orig - diff),
          priceV2: orig,
          diff
        }
      ]
    };
  };

  /**
   * Nạp danh sách hồ sơ khiếu nại thực tế từ Database thông qua API inanceApi.getStaffDisputes().
   */
  const loadData = () => {
    setIsLoading(true);
    financeApi
      .getStaffDisputes()
      .then((backendData) => {
        if (backendData && backendData.length > 0) {
          const mapped = backendData.map(mapBackendToDisputeCase);
          setCaseList(mapped);
          const matching = mapped.filter((c) => {
            if (activeTab === 'STAFF_REVIEW') return c.status === 'STAFF_REVIEW';
            if (activeTab === 'ADMIN_APPROVAL') return c.status === 'ADMIN_APPROVAL';
            if (activeTab === 'RESOLVED') return c.status === 'REFUNDED' || c.status === 'REJECTED';
            return true;
          });
          const target = matching[0] || mapped[0];
          setSelectedCase(target);
          setProposedAmount(target.requestedRefund);
          setStaffNote(target.inspectorNote);
        } else if (disputes && disputes.length > 0) {
          setCaseList(disputes);
          const matching = disputes.filter((c) => {
            if (activeTab === 'STAFF_REVIEW') return c.status === 'STAFF_REVIEW';
            if (activeTab === 'ADMIN_APPROVAL') return c.status === 'ADMIN_APPROVAL';
            if (activeTab === 'RESOLVED') return c.status === 'REFUNDED' || c.status === 'REJECTED';
            return true;
          });
          const target = matching[0] || disputes[0];
          setSelectedCase(target);
          setProposedAmount(target.requestedRefund);
          setStaffNote(target.inspectorNote);
        } else {
          setSelectedCase(null);
        }
      })
      .catch((err) => {
        console.error('Lỗi tải danh sách khiếu nại:', err);
        if (disputes && disputes.length > 0) {
          setCaseList(disputes);
          setSelectedCase(disputes[0]);
        }
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCase = (c: DisputeCase & { backendId?: number }) => {
    setResolutionError('');
    setSelectedCase(c);
    setProposedAmount(c.requestedRefund);
    setStaffNote(c.inspectorNote || '');
  };

  const handleTabChange = (tab: TabType) => {
    setResolutionError('');
    setActiveTab(tab);
    const filtered = caseList.filter((c) => {
      if (tab === 'STAFF_REVIEW') return c.status === 'STAFF_REVIEW';
      if (tab === 'ADMIN_APPROVAL') return c.status === 'ADMIN_APPROVAL';
      if (tab === 'RESOLVED') return c.status === 'REFUNDED' || c.status === 'REJECTED';
      return true;
    });
    if (filtered.length > 0) {
      setSelectedCase(filtered[0]);
      setProposedAmount(filtered[0].requestedRefund);
      setStaffNote(filtered[0].inspectorNote);
    } else {
      setSelectedCase(null);
    }
  };

  const handleResolveDispute = async (
    caseId: string,
    resolution: 'PROPOSE_ADMIN_REFUND' | 'REJECT_COMPLAINT'
  ) => {
    if (!selectedCase || isSubmitting) return;
    setResolutionError('');

    const decision = resolution === 'PROPOSE_ADMIN_REFUND' ? 'ADMIN_APPROVAL' : 'REJECTED';

    if (decision === 'ADMIN_APPROVAL') {
      if (!Number.isFinite(proposedAmount) || proposedAmount <= 0) {
        setResolutionError('Mức tiền đề xuất hoàn trả phải là số hữu hạn lớn hơn 0 đ.');
        return;
      }
      if (proposedAmount > selectedCase.originalPrice) {
        setResolutionError(`Mức đề xuất hoàn không được vượt quá tổng tiền gốc (${selectedCase.originalPrice.toLocaleString('vi-VN')} đ).`);
        return;
      }
      if (!staffNote.trim()) {
        setResolutionError('Vui lòng nhập kết luận điều tra hiện trường của Staff trước khi chuyển Admin.');
        return;
      }
    } else {
      if (!staffNote.trim()) {
        setResolutionError('Vui lòng nhập lý do bác bỏ khiếu nại để lưu hồ sơ.');
        return;
      }
    }

    setIsSubmitting(true);
    const noteToSend = staffNote.trim();

    try {
      if (selectedCase.backendId) {
        const updated = await financeApi.reviewDisputeByStaff(
          selectedCase.backendId,
          decision,
          proposedAmount,
          noteToSend
        );
        const mappedUpdated = mapBackendToDisputeCase(updated);
        setCaseList((prev) => prev.map((item) => (item.id === selectedCase.id ? mappedUpdated : item)));
        setSelectedCase(mappedUpdated);
      } else {
        const nextStatus = decision === 'ADMIN_APPROVAL' ? 'ADMIN_APPROVAL' : 'REJECTED';
        const updatedLocal = {
          ...selectedCase,
          status: nextStatus as DisputeCase['status'],
          requestedRefund: decision === 'ADMIN_APPROVAL' ? proposedAmount : 0,
          inspectorNote: noteToSend
        };
        setCaseList((prev) => prev.map((item) => (item.id === selectedCase.id ? updatedLocal : item)));
        setSelectedCase(updatedLocal);
      }

      if (decision === 'ADMIN_APPROVAL') {
        onShowToast(
          'Đã Chuyển Hồ Sơ Lên Admin',
          `Biên bản xác minh đơn ${caseId} với mức đề xuất hoàn ${proposedAmount.toLocaleString('vi-VN')} đ đã chuyển sang hàng đợi Admin phê duyệt.`
        );
      } else {
        onShowToast(
          'Đã Bác Bỏ Khiếu Nại',
          `Đã bác bỏ khiếu nại đơn ${caseId} và lưu trữ biên bản đối soát thành công.`
        );
      }
    } catch (err: any) {
      const message = err?.message || 'Không thể lưu biên bản xác minh';
      setResolutionError(message);
      onShowToast('Lỗi Xử Lý Khiếu Nại', message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered cases by tab
  const filteredCases = caseList.filter((c) => {
    if (activeTab === 'STAFF_REVIEW') return c.status === 'STAFF_REVIEW';
    if (activeTab === 'ADMIN_APPROVAL') return c.status === 'ADMIN_APPROVAL';
    if (activeTab === 'RESOLVED') return c.status === 'REFUNDED' || c.status === 'REJECTED';
    return true;
  });

  // Calculate real-time dynamic metrics from actual caseList
  const countStaffReview = caseList.filter((c) => c.status === 'STAFF_REVIEW').length;
  const countAdminApproval = caseList.filter((c) => c.status === 'ADMIN_APPROVAL').length;
  const countRefunded = caseList.filter((c) => c.status === 'REFUNDED').length;
  const totalPendingRefundAmount = caseList
    .filter((c) => c.status === 'STAFF_REVIEW' || c.status === 'ADMIN_APPROVAL')
    .reduce((sum, c) => sum + (c.requestedRefund || 0), 0);

  return (
    <div className="space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]">gavel</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
              Xử lý khiếu nại dịch vụ (Staff)
            </h1>
          </div>
          <ViewGuide>
            <p className="font-body-md text-body-md text-secondary mt-1">
              Tiếp nhận phản ánh từ khách hàng, xác minh bằng chứng hiện trường, lập biên bản đối soát và đề xuất hoàn tiền lên Admin phê duyệt.
            </p>
          </ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container-low text-on-surface rounded font-label-md font-semibold hover:bg-surface-container transition-all cursor-pointer"
            title="Tải lại dữ liệu từ máy chủ"
          >
            <span className={`material-symbols-outlined text-[18px] ${isLoading ? 'animate-spin' : ''}`}>sync</span>
            <span>Làm Mới</span>
          </button>
          <button
            onClick={() => onSelectScreen('refunds')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Sang Màn Hình Admin Phê Duyệt</span>
          </button>
        </div>
      </div>

      {/* Metric Cards - 100% Calculated dynamically from live backend data */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Khiếu Nại Chờ Xác Minh</span>
          <div className="text-2xl font-bold text-red-600 font-data-mono mt-1">{countStaffReview} ca</div>
          <span className="text-label-xs text-red-700">Trạng thái: STAFF_REVIEW</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Chờ Admin Phê Duyệt</span>
          <div className="text-2xl font-bold text-amber-600 font-data-mono mt-1">{countAdminApproval} ca</div>
          <span className="text-label-xs text-amber-700 font-semibold">Đã lập biên bản đề xuất</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Đã Hoàn Tiền Thành Công</span>
          <div className="text-2xl font-bold text-primary font-data-mono mt-1">{countRefunded} ca</div>
          <span className="text-label-xs text-secondary">Đã cấn trừ ví Gara</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Tổng Tiền Chờ Bồi Hoàn</span>
          <div className="text-2xl font-bold text-emerald-600 font-data-mono mt-1">
            {totalPendingRefundAmount.toLocaleString('vi-VN')} đ
          </div>
          <span className="text-label-xs text-emerald-700 font-semibold">Đang xử lý thẩm định</span>
        </div>
      </div>

      {/* Status Tabs Navigation */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-surface-container-low border border-surface-container">
        <button
          onClick={() => handleTabChange('STAFF_REVIEW')}
          className={`flex items-center gap-2 px-space-md py-1.5 rounded-lg font-label-md font-bold transition-all cursor-pointer ${
            activeTab === 'STAFF_REVIEW'
              ? 'bg-surface-container-lowest text-red-600 shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
          <span>Cần Xác Minh</span>
          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-data-mono text-label-xs">
            {countStaffReview}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('ADMIN_APPROVAL')}
          className={`flex items-center gap-2 px-space-md py-1.5 rounded-lg font-label-md font-bold transition-all cursor-pointer ${
            activeTab === 'ADMIN_APPROVAL'
              ? 'bg-surface-container-lowest text-amber-600 shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">hourglass_top</span>
          <span>Đã Chuyển Admin</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-data-mono text-label-xs">
            {countAdminApproval}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('RESOLVED')}
          className={`flex items-center gap-2 px-space-md py-1.5 rounded-lg font-label-md font-bold transition-all cursor-pointer ${
            activeTab === 'RESOLVED'
              ? 'bg-surface-container-lowest text-emerald-600 shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          <span>Đã Giải Quyết</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-data-mono text-label-xs">
            {caseList.filter((c) => c.status === 'REFUNDED' || c.status === 'REJECTED').length}
          </span>
        </button>

        <button
          onClick={() => handleTabChange('ALL')}
          className={`flex items-center gap-2 px-space-md py-1.5 rounded-lg font-label-md font-bold transition-all cursor-pointer ${
            activeTab === 'ALL'
              ? 'bg-surface-container-lowest text-primary shadow-xs'
              : 'text-secondary hover:text-on-surface'
          }`}
        >
          <span>Tất Cả Hồ Sơ</span>
          <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-secondary font-data-mono text-label-xs">
            {caseList.length}
          </span>
        </button>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 bg-surface-container-lowest rounded-xl border border-surface-container">
          <span className="material-symbols-outlined text-[40px] text-primary animate-spin mb-3">progress_activity</span>
          <span className="font-label-lg text-on-surface font-semibold">Đang tải hồ sơ khiếu nại từ hệ thống...</span>
          <span className="text-body-sm text-secondary mt-1">Đang đồng bộ dữ liệu thời gian thực</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
          {/* Left Column: List of Disputes */}
          <div className="lg:col-span-5 space-y-space-md">
            <div className="flex items-center justify-between">
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Hồ sơ khiếu nại ({filteredCases.length})
              </h2>
              <span className="text-label-sm text-secondary font-data-mono">
                {activeTab === 'STAFF_REVIEW' ? 'Ưu tiên xử lý SLA' : 'Danh sách hồ sơ'}
              </span>
            </div>

            {filteredCases.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-xl border border-surface-container space-y-2">
                <span className="material-symbols-outlined text-[36px] text-outline">inbox</span>
                <p className="font-label-md font-bold text-on-surface">Không có hồ sơ nào trong mục này</p>
                <p className="text-body-xs text-secondary">
                  Tất cả các khiếu nại thuộc bộ lọc này đã được giải quyết hoặc chưa phát sinh.
                </p>
              </div>
            ) : (
              <div className="space-y-space-sm max-h-[750px] overflow-y-auto pr-1">
                {filteredCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    onClick={() => handleSelectCase(caseItem)}
                    className={`p-space-md rounded-xl border transition-all cursor-pointer bg-surface-container-lowest hover:shadow-sm ${
                      selectedCase?.id === caseItem.id
                        ? 'border-primary ring-1 ring-primary bg-primary-container/10'
                        : 'border-surface-container'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-data-mono font-bold text-primary text-body-sm">{caseItem.id}</span>
                        <span className="text-[11px] bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                          {caseItem.type}
                        </span>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            caseItem.status === 'STAFF_REVIEW'
                              ? 'bg-amber-100 text-amber-800'
                              : caseItem.status === 'ADMIN_APPROVAL'
                              ? 'bg-blue-100 text-blue-800'
                              : caseItem.status === 'REFUNDED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {caseItem.status}
                        </span>
                      </div>
                      <span className="text-label-xs text-secondary font-data-mono">{caseItem.time}</span>
                    </div>

                    <div className="space-y-1 text-body-sm">
                      <div className="font-bold text-on-surface">
                        {caseItem.customerName} <span className="text-secondary font-normal">khiếu nại</span> {caseItem.garageName}
                      </div>
                      <div className="text-label-xs text-secondary">
                        Mã đơn: <span className="font-data-mono text-primary font-semibold">{caseItem.rescueCode}</span> • PayOS:{' '}
                        <span className="font-data-mono">{caseItem.payosCode}</span>
                      </div>
                      <div className="text-body-xs text-on-surface-variant line-clamp-2 mt-1 bg-surface-container-low p-2 rounded">
                        <span className="font-semibold text-secondary">Khách phản ánh:</span> "{caseItem.customerReason || caseItem.inspectorNote || 'Không có mô tả chi tiết'}"
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-container text-label-xs">
                      <span className="text-secondary">Đề xuất / Yêu cầu hoàn:</span>
                      <span className="font-data-mono font-bold text-red-600 text-body-sm">
                        {caseItem.requestedRefund.toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Deep Arbitration Console */}
          <div className="lg:col-span-7">
            {selectedCase ? (
              <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs space-y-space-lg">
                {/* Case Header */}
                <div className="flex items-center justify-between border-b border-surface-container pb-space-md">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-headline-sm text-headline-sm font-bold text-on-surface">
                        Hồ Sơ Xác Minh #{selectedCase.id}
                      </span>
                      <span
                        className={`px-2.5 py-0.5 font-bold text-label-xs rounded ${
                          selectedCase.status === 'STAFF_REVIEW'
                            ? 'bg-amber-100 text-amber-800'
                            : selectedCase.status === 'ADMIN_APPROVAL'
                            ? 'bg-blue-100 text-blue-800'
                            : selectedCase.status === 'REFUNDED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {selectedCase.status}
                      </span>
                    </div>
                    <div className="text-body-sm text-secondary mt-0.5">
                      Khởi tạo: {selectedCase.time} • Mã cuốc cứu hộ: <span className="font-data-mono font-semibold text-primary">{selectedCase.rescueCode}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-label-xs text-secondary">Mức khách yêu cầu bồi hoàn:</div>
                    <div className="font-data-mono font-bold text-xl text-red-600">
                      {selectedCase.requestedRefund.toLocaleString('vi-VN')} đ
                    </div>
                  </div>
                </div>

                {/* Status Notice Banner if Already Actioned */}
                {selectedCase.status === 'ADMIN_APPROVAL' && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-body-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[20px] text-amber-700">hourglass_top</span>
                      <span>
                        Hồ sơ đã được lập biên bản và chuyển Admin phê duyệt hoàn tiền. Bạn có thể sang màn hình Admin để theo dõi.
                      </span>
                    </div>
                    <button
                      onClick={() => onSelectScreen('refunds')}
                      className="px-2.5 py-1 bg-amber-600 text-white rounded text-label-xs font-bold hover:bg-amber-700 cursor-pointer shrink-0 ml-2"
                    >
                      Sang Admin
                    </button>
                  </div>
                )}

                {selectedCase.status === 'REFUNDED' && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-body-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-emerald-700">check_circle</span>
                    <span>
                      Khiếu nại này đã được Admin phê duyệt hoàn tiền thành công. Mã tham chiếu hoàn tất:{' '}
                      <strong className="font-data-mono">{selectedCase.refundReferenceCode || 'PAYOS-REV-DONE'}</strong>.
                    </span>
                  </div>
                )}

                {selectedCase.status === 'REJECTED' && (
                  <div className="p-3 rounded-lg bg-slate-100 border border-slate-300 text-slate-800 text-body-sm flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px] text-slate-600">cancel</span>
                    <span>Khiếu nại đã bị bác bỏ do chứng từ của Gara hợp lệ. Biên bản đã được lưu trữ.</span>
                  </div>
                )}

                {/* Both Parties Profile */}
                <div className="grid grid-cols-2 gap-space-md p-space-md bg-surface-container-low rounded-lg text-body-sm">
                  <div>
                    <div className="font-label-sm uppercase font-bold text-secondary mb-1">Bên Khiếu Nại (Khách Hàng)</div>
                    <div className="font-bold text-on-surface">{selectedCase.customerName}</div>
                    <div className="font-data-mono text-secondary text-body-xs mt-0.5">SĐT: {selectedCase.customerPhone}</div>
                  </div>
                  <div>
                    <div className="font-label-sm uppercase font-bold text-secondary mb-1">Bên Bị Khiếu Nại (Gara)</div>
                    <div className="font-bold text-on-surface">{selectedCase.garageName}</div>
                    <div className="text-body-xs text-secondary mt-0.5">
                      Mã đơn vị: <span className="font-data-mono font-semibold">{selectedCase.garageId}</span>
                      {selectedCase.garageWalletBalance !== undefined && (
                        <span> • Số dư ví: <strong className="font-data-mono text-primary">{selectedCase.garageWalletBalance.toLocaleString('vi-VN')} đ</strong></span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Discrepancy Breakdown Table */}
                <div>
                  <h3 className="font-label-sm uppercase font-bold text-secondary mb-2">
                    Đối chiếu chi phí dịch vụ
                  </h3>
                  <div className="border border-surface-container rounded-lg overflow-hidden">
                    <table className="w-full text-left text-body-sm">
                      <thead className="bg-surface-container-low text-label-xs uppercase text-secondary font-bold">
                        <tr>
                          <th className="py-2.5 px-3">Hạng Mục Khiếu Nại</th>
                          <th className="py-2.5 px-3 text-right">Chi Phí Chuẩn Sàn</th>
                          <th className="py-2.5 px-3 text-right">Gara Đã Thu</th>
                          <th className="py-2.5 px-3 text-right">Chênh Lệch Yêu Cầu Hoàn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container">
                        {selectedCase.diffItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-surface-container-low/40">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-on-surface">{item.name}</div>
                              <div className="text-label-xs text-secondary line-clamp-1">{item.desc}</div>
                            </td>
                            <td className="py-2.5 px-3 text-right font-data-mono">
                              {item.priceV1 ? `${item.priceV1.toLocaleString('vi-VN')} đ` : '0 đ'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-data-mono font-bold text-on-surface">
                              {item.priceV2.toLocaleString('vi-VN')} đ
                            </td>
                            <td className="py-2.5 px-3 text-right font-data-mono font-bold text-red-600">
                              +{item.diff.toLocaleString('vi-VN')} đ
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Customer Reason & Rescue Order Context */}
                <div className="space-y-space-xs">
                  <h3 className="font-label-sm uppercase font-bold text-secondary">
                    Nội dung phản ánh của khách hàng & Thông tin giao dịch
                  </h3>
                  <div className="p-space-md rounded-lg bg-surface-container-low border border-surface-container space-y-2 text-body-sm">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-tertiary text-[20px] shrink-0 mt-0.5">format_quote</span>
                      <p className="text-on-surface italic font-medium">
                        "{selectedCase.customerReason || selectedCase.inspectorNote || 'Không có mô tả chi tiết từ khách hàng.'}"
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-label-xs text-secondary pt-2 border-t border-surface-container/60">
                      <span>Mã PayOS: <strong className="font-data-mono text-on-surface">{selectedCase.payosCode}</strong></span>
                      <span>Tổng tiền gốc: <strong className="font-data-mono text-on-surface">{selectedCase.originalPrice.toLocaleString('vi-VN')} đ</strong></span>
                      <span>Thời điểm ghi nhận: <strong className="font-data-mono text-on-surface">{selectedCase.time}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Evidence Photos Inspection */}
                <div className="space-y-space-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-label-sm uppercase font-bold text-secondary">
                      Bằng chứng ảnh hiện trường & Hóa đơn ({selectedCase.evidenceUrls?.length || 0} ảnh)
                    </h3>
                    {selectedCase.evidenceUrls && selectedCase.evidenceUrls.length > 0 && (
                      <span className="text-label-xs text-secondary italic">
                        Nhấp vào ảnh để phóng to
                      </span>
                    )}
                  </div>

                  {selectedCase.evidenceUrls && selectedCase.evidenceUrls.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-space-sm">
                      {selectedCase.evidenceUrls.map((url, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPreviewImage(url)}
                          className="group relative cursor-pointer overflow-hidden rounded-lg border border-surface-container aspect-video bg-black/5"
                        >
                          <img
                            src={url}
                            alt={`Bằng chứng ${idx + 1}`}
                            className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-label-xs font-bold gap-1">
                            <span className="material-symbols-outlined text-[16px]">zoom_in</span>
                            <span>Phóng to</span>
                          </div>
                          <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded font-data-mono">
                            Ảnh {idx + 1}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 border border-dashed border-surface-container rounded-lg text-center text-secondary bg-surface">
                      <span className="material-symbols-outlined text-[32px] text-outline mb-1">image_not_supported</span>
                      <p className="text-body-sm font-medium">Khách hàng không đính kèm ảnh bằng chứng trực quan cho đơn này.</p>
                      <p className="text-label-xs text-secondary mt-0.5">Thẩm tra dựa trên lịch sử giao dịch và đối soát với bên cung cấp dịch vụ.</p>
                    </div>
                  )}
                </div>

                {/* Staff Investigation & Proposal Form */}
                <div className="p-space-md rounded-lg bg-surface-container-low border border-surface-container space-y-space-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-label-sm uppercase font-bold text-primary flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[18px]">verified</span>
                      Biên Bản Xác Minh & Đề Xuất Hoàn Tiền Của Nhân Viên
                    </h3>
                    {selectedCase.inspectorName && selectedCase.inspectorName !== 'Chưa phân công' && (
                      <span className="text-label-xs text-secondary">
                        Người thẩm định: <strong>{selectedCase.inspectorName}</strong>
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                    <div>
                      <label className="block text-label-xs font-semibold text-secondary mb-1">
                        Mức tiền đề xuất Admin hoàn trả (VNĐ):
                      </label>
                      <input
                        type="number"
                        disabled={selectedCase.status !== 'STAFF_REVIEW'}
                        value={proposedAmount}
                        onChange={(e) => setProposedAmount(Number(e.target.value))}
                        className="w-full px-3 py-2 rounded border border-surface-container bg-surface text-on-surface font-data-mono font-bold disabled:bg-surface-container-high disabled:cursor-not-allowed"
                      />
                    </div>
                    <div>
                      <label className="block text-label-xs font-semibold text-secondary mb-1">
                        Tổng tiền đơn gốc đã thanh toán:
                      </label>
                      <div className="px-3 py-2 rounded bg-surface-container text-on-surface font-data-mono font-semibold">
                        {selectedCase.originalPrice.toLocaleString('vi-VN')} đ
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-label-xs font-semibold text-secondary mb-1">
                      Kết luận điều tra hiện trường của Staff:
                    </label>
                    <textarea
                      rows={3}
                      disabled={selectedCase.status !== 'STAFF_REVIEW'}
                      value={staffNote}
                      onChange={(e) => setStaffNote(e.target.value)}
                      placeholder="Nhập kết quả kiểm tra hóa đơn, đối chiếu với Gara và lý do đề xuất hoàn tiền..."
                      className="w-full px-3 py-2 rounded border border-surface-container bg-surface text-on-surface text-body-sm disabled:bg-surface-container-high disabled:cursor-not-allowed"
                    />
                  </div>

                  {selectedCase.adminResolutionNote && (
                    <div className="p-2.5 rounded bg-surface-container text-body-xs text-on-surface border border-surface-container">
                      <span className="font-semibold text-primary block mb-0.5">Ý kiến phản hồi từ Admin:</span>
                      <p className="italic">"{selectedCase.adminResolutionNote}"</p>
                    </div>
                  )}
                </div>

                {resolutionError && <div role="alert" className="p-3 rounded border border-red-200 bg-red-50 text-red-700 text-sm">{resolutionError}</div>}

                {/* Adjudication Verdict Actions */}
                <div className="pt-space-md border-t border-surface-container flex flex-wrap items-center justify-between gap-space-sm">
                  <button
                    disabled={isSubmitting || selectedCase.status !== 'STAFF_REVIEW'}
                    onClick={() => handleResolveDispute(selectedCase.id, 'REJECT_COMPLAINT')}
                    className="px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                  >
                    Bác Bỏ Khiếu Nại (Chứng Từ Gara Hợp Lệ)
                  </button>

                  <div className="flex items-center gap-space-sm">
                    <button
                      disabled={isSubmitting || selectedCase.status !== 'STAFF_REVIEW'}
                      onClick={() => handleResolveDispute(selectedCase.id, 'PROPOSE_ADMIN_REFUND')}
                      className="px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-bold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isSubmitting
                        ? 'Đang gửi...'
                        : selectedCase.status === 'STAFF_REVIEW'
                        ? 'Lập Biên Bản & Đề Xuất Admin Hoàn Tiền'
                        : 'Hồ Sơ Đã Được Xử Lý'}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-secondary bg-surface-container-lowest rounded-xl border border-surface-container">
                <span className="material-symbols-outlined text-[48px] text-outline mb-2">touch_app</span>
                <p className="font-headline-sm font-semibold text-on-surface">Chưa chọn hồ sơ khiếu nại</p>
                <p className="text-body-sm text-secondary mt-1">
                  Vui lòng chọn một hồ sơ ở danh sách bên trái để tiến hành thẩm tra đối soát.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
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
            <div className="p-2 text-right">
              <a
                href={previewImage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-label-sm text-primary hover:underline font-semibold inline-flex items-center gap-1"
              >
                <span>Mở trong tab mới</span>
                <span className="material-symbols-outlined text-[14px]">open_in_new</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
