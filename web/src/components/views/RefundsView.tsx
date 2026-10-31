import { ViewGuide } from '../ViewGuide';
import React, { useEffect, useState } from 'react';
import { DisputeCase } from '../../types';
import { DisputeBackendResponse, financeApi } from '../../services/financeApi';

interface RefundsViewProps {
  disputes: DisputeCase[];
  onShowToast: (title: string, msg: string) => void;
}

export const RefundsView: React.FC<RefundsViewProps> = ({ disputes, onShowToast }) => {
  const [caseList, setCaseList] = useState<(DisputeCase & { backendId?: number; garageWalletBalance?: number })[]>(disputes);
  const [selectedCaseId, setSelectedCaseId] = useState<string>(disputes[0]?.id || 'REF-9021');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected'>('pending');
  const [refundSource, setRefundSource] = useState<'garage_wallet' | 'platform_fund'>('garage_wallet');
  const [approvedRefundAmount, setApprovedRefundAmount] = useState<number>(disputes[0]?.requestedRefund || 150000);
  const [adminNote, setAdminNote] = useState<string>('');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  const mapBackendToDisputeCase = (
    d: DisputeBackendResponse
  ): DisputeCase & { backendId: number; garageWalletBalance: number } => {
    const diff = d.proposedRefundAmount ?? d.requestedRefundAmount ?? 0;
    const orig = d.originalAmount || diff;
    return {
      backendId: d.id,
      garageWalletBalance: d.garageWalletBalance ?? 4820000,
      id: d.disputeCode,
      rescueCode: d.rescueCode,
      payosCode: d.payosOrderCode ? `POS-${d.payosOrderCode}` : 'POS-ONLINE',
      customerName: d.customerName,
      customerPhone: d.customerPhone || '0908 123 456',
      garageName: d.garageName || 'Gara đối tác',
      garageId: d.garageId ? `GAR-${d.garageId}` : 'GAR-01',
      type:
        d.disputeType === 'OVERCHARGE'
          ? 'OVERCHARGE'
          : d.disputeType === 'DAMAGE'
          ? 'DAMAGE'
          : d.disputeType === 'FAKE_RESCUE'
          ? 'FAKE_RESCUE'
          : 'POOR_QUALITY',
      severity: 'L3_CRITICAL',
      originalPrice: orig,
      requestedRefund: d.approvedRefundAmount ?? d.proposedRefundAmount ?? d.requestedRefundAmount,
      time: d.createdAt ? new Date(d.createdAt).toLocaleString('vi-VN') : 'Vừa xong',
      status: d.status,
      inspectorName: d.staffReviewerName || 'Chuyên viên CSKH (Staff)',
      inspectorId: d.staffReviewerId ? `STAFF-${d.staffReviewerId}` : 'STAFF-01',
      inspectorNote: d.staffFindingNote || d.customerReason,
      evidenceReceiptUrl:
        d.evidenceImageUrls?.split(',')[0] ||
        'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
      evidenceTariffUrl:
        'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
      audioDuration: '02:15',
      diffItems: [
        {
          name: 'Chênh lệch đề xuất hoàn trả',
          desc: d.staffFindingNote || d.customerReason,
          priceV1: Math.max(0, orig - diff),
          priceV2: orig,
          diff
        }
      ]
    };
  };

  useEffect(() => {
    let mounted = true;
    financeApi
      .getAdminRefundCases()
      .then((backendData) => {
        if (!mounted || !backendData || backendData.length === 0) return;
        const mapped = backendData.map(mapBackendToDisputeCase);
        setCaseList(mapped);
        setSelectedCaseId(mapped[0].id);
        setApprovedRefundAmount(mapped[0].requestedRefund);
      })
      .catch(() => {
        // Fallback to mock disputes when offline
      });
    return () => {
      mounted = false;
    };
  }, []);

  const selectedCase = caseList.find((d) => d.id === selectedCaseId) || caseList[0];

  const handleSelectCase = (c: DisputeCase & { backendId?: number; garageWalletBalance?: number }) => {
    setSelectedCaseId(c.id);
    setApprovedRefundAmount(c.requestedRefund);
    setAdminNote('');
  };

  const handleExecuteRefund = async () => {
    if (!selectedCase) return;
    setIsRefunding(true);
    try {
      const apiSource = refundSource === 'garage_wallet' ? 'GARAGE_WALLET' : 'PLATFORM_FUND';
      if (selectedCase.backendId) {
        const updated = await financeApi.processRefundByAdmin(
          selectedCase.backendId,
          'REFUNDED',
          approvedRefundAmount,
          apiSource,
          adminNote || 'Admin phê duyệt hoàn tiền cho khách hàng và khấu trừ ví Gara'
        );
        const mapped = mapBackendToDisputeCase(updated);
        setCaseList((prev) => prev.map((item) => (item.id === selectedCase.id ? mapped : item)));
      } else {
        setCaseList((prev) =>
          prev.map((item) =>
            item.id === selectedCase.id
              ? { ...item, status: 'REFUNDED', requestedRefund: approvedRefundAmount }
              : item
          )
        );
      }

      onShowToast(
        'Hoàn Tiền Thành Công (UC-27)!',
        `Đã thực thi hoàn ${approvedRefundAmount.toLocaleString('vi-VN')} ₫ cho khách hàng ${selectedCase.customerName}. Nguồn tiền: ${
          refundSource === 'garage_wallet' ? 'Khấu trừ Ví số dư Gara' : 'Quỹ Bảo Hiểm Dự Phòng'
        }.`
      );
    } catch (err: any) {
      onShowToast('Lỗi Thực Thi Hoàn Tiền', err?.message || 'Không thể hoàn tiền');
    } finally {
      setIsRefunding(false);
    }
  };

  const handleAskStaff = async () => {
    if (!selectedCase) return;
    try {
      if (selectedCase.backendId) {
        const updated = await financeApi.processRefundByAdmin(
          selectedCase.backendId,
          'STAFF_REVIEW',
          undefined,
          undefined,
          adminNote || 'Admin yêu cầu Staff xác minh lại chứng từ hiện trường'
        );
        const mapped = mapBackendToDisputeCase(updated);
        setCaseList((prev) => prev.map((item) => (item.id === selectedCase.id ? mapped : item)));
      }
      onShowToast(
        'Đã Chuyển Lại Cho Staff',
        `Đã gửi yêu cầu điều phối viên hiện trường tái thẩm tra vụ việc ${selectedCase.id}.`
      );
    } catch (err: any) {
      onShowToast('Lỗi Chuyển Yêu Cầu', err?.message || 'Không thể chuyển lại cho Staff');
    }
  };

  const handleDismiss = async () => {
    if (!selectedCase) return;
    try {
      if (selectedCase.backendId) {
        const updated = await financeApi.processRefundByAdmin(
          selectedCase.backendId,
          'REJECTED',
          0,
          undefined,
          adminNote || 'Admin bác bỏ yêu cầu hoàn tiền sau khi thẩm định'
        );
        const mapped = mapBackendToDisputeCase(updated);
        setCaseList((prev) => prev.map((item) => (item.id === selectedCase.id ? mapped : item)));
      } else {
        setCaseList((prev) =>
          prev.map((item) => (item.id === selectedCase.id ? { ...item, status: 'REJECTED' } : item))
        );
      }
      onShowToast(
        'Bác Bỏ Khiếu Nại (UC-27)',
        `Đã bác bỏ yêu cầu hoàn tiền hồ sơ ${selectedCase.id}. Lưu trữ chứng từ hoàn tất.`
      );
    } catch (err: any) {
      onShowToast('Lỗi Bác Bỏ Khiếu Nại', err?.message || 'Không thể bác bỏ hồ sơ');
    }
  };

  const garageBalance = selectedCase?.garageWalletBalance ?? 4820000;

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Command Banner / Control Header */}
      <div className="w-full bg-surface-container-lowest shadow-sm rounded-xl p-space-lg mb-space-md border border-surface-container">
        <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-sm">
          <div className="flex items-center gap-space-xs font-data-mono text-label-sm text-secondary uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-tertiary">account_balance_wallet</span>
            <span>TÀI CHÍNH & KẾ TOÁN</span>
            <span>&gt;</span>
            <span className="text-primary font-bold">XỬ LÝ HOÀN TIỀN & KHIẾU NẠI (UC-27)</span>
          </div>
          <div className="flex items-center gap-space-sm">
            <button
              onClick={() => onShowToast('Chính Sách Hoàn Tiền', 'Đang mở quy chuẩn chính sách bồi thường thiên tai & lỗi thợ v2.4')}
              className="flex items-center gap-space-xs px-space-md py-1.5 rounded bg-surface-container-low text-on-surface hover:bg-surface-container-high transition-colors font-label-md text-label-md cursor-pointer"
            >
              <span className="material-symbols-outlined text-[16px] text-tertiary">gavel</span>
              <span>Chính sách hoàn tiền hệ thống</span>
            </button>
            <span className="px-space-sm py-1 rounded bg-surface-container-high text-on-surface-variant font-data-mono text-label-sm font-semibold">
              SLA THẨM ĐỊNH: &lt; 2H00
            </span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
              Quyết định & Thực thi Hoàn tiền (UC-27 - Admin)
            </h1>
            <ViewGuide>
              <p className="font-body-md text-body-md text-secondary mt-0.5">
                Cơ chế trọng tài tài chính độc lập: Xem xét biên bản xác minh từ Staff (UC-23), phê duyệt hoàn tiền 100% hoặc một phần, tự động cấn trừ ví số dư của Gara và ghi nhận bút toán sổ cái.
              </p>
            </ViewGuide>
          </div>
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-md px-space-lg py-2.5 rounded-lg bg-surface-container-low shadow-sm">
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Đang chờ Admin duyệt</div>
                <div className="font-headline-md text-headline-md text-primary font-bold">
                  {caseList.filter((c) => c.status !== 'REFUNDED' && c.status !== 'REJECTED').length}{' '}
                  <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">hồ sơ khiếu nại</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-space-md px-space-lg py-2.5 rounded-lg bg-surface-container-low shadow-sm">
              <div className="w-9 h-9 rounded-full bg-secondary-fixed flex items-center justify-center text-tertiary">
                <span className="material-symbols-outlined text-[20px]">verified_user</span>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Quỹ bảo hiểm dự phòng sẵn sàng</div>
                <div className="font-headline-md text-headline-md text-on-surface font-data-mono font-bold">
                  95.000.000 <span className="text-label-md font-body-md text-secondary">₫</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Status Tabs Strip */}
        <div className="mt-space-lg pt-space-md flex flex-wrap items-center justify-between gap-space-md border-t border-surface-container">
          <div className="flex items-center gap-space-xs p-1 rounded-lg bg-surface-container-low">
            <button
              onClick={() => setActiveTab('pending')}
              className={`flex items-center gap-space-xs px-space-lg py-2 rounded font-label-lg text-label-lg transition-colors cursor-pointer ${
                activeTab === 'pending'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="h-2 w-2 rounded-full bg-primary animate-pulse"></span>
              <span>Chờ Quyết Định Hoàn Tiền</span>
              <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-primary font-data-mono text-label-sm">
                {caseList.filter((c) => c.status !== 'REFUNDED' && c.status !== 'REJECTED').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`flex items-center gap-space-xs px-space-lg py-2 rounded font-label-lg text-label-lg transition-colors cursor-pointer ${
                activeTab === 'completed'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              <span>Đã Hoàn Tiền Thành Công</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-secondary font-data-mono text-label-sm">
                {caseList.filter((c) => c.status === 'REFUNDED').length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('rejected')}
              className={`flex items-center gap-space-xs px-space-lg py-2 rounded font-label-lg text-label-lg transition-colors cursor-pointer ${
                activeTab === 'rejected'
                  ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                  : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">cancel</span>
              <span>Đã Bác Bỏ Yêu Cầu</span>
              <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-secondary font-data-mono text-label-sm">
                {caseList.filter((c) => c.status === 'REJECTED').length}
              </span>
            </button>
          </div>
          <div className="flex items-center gap-space-sm text-secondary font-data-mono text-label-sm">
            <span className="material-symbols-outlined text-[16px] text-tertiary">sync</span>
            <span>PAYOS REVERSAL GATEWAY: SẴN SÀNG</span>
          </div>
        </div>
      </div>

      {/* Dual Workspace: 60/40 Split */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-space-lg items-start">
        {/* LEFT COLUMN: Case Queue */}
        <div className="xl:col-span-7 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-md shadow-sm flex items-center justify-between gap-space-md border border-surface-container">
            <div className="flex items-center gap-space-sm">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Danh Sách Hồ Sơ Khiếu Nại & Hoàn Tiền</span>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-error-container text-on-error-container uppercase font-bold">
                {caseList.length} Hồ Sơ
              </span>
            </div>
            <div className="flex items-center gap-space-xs font-label-md text-label-md text-secondary">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span>Sắp xếp: Mới nhất trước</span>
            </div>
          </div>

          {caseList.map((caseItem) => (
            <div
              key={caseItem.id}
              onClick={() => handleSelectCase(caseItem)}
              className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm cursor-pointer relative overflow-hidden transition-all border ${
                selectedCase?.id === caseItem.id
                  ? 'border-primary bg-gradient-to-r from-primary-fixed/30 to-surface-container-lowest'
                  : 'border-surface-container hover:shadow-md'
              }`}
            >
              {selectedCase?.id === caseItem.id && (
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
              )}
              <div className="flex items-start justify-between gap-space-md mb-space-sm">
                <div className="flex items-center gap-space-sm">
                  <span className="font-data-mono text-label-lg font-bold text-primary">#{caseItem.id}</span>
                  <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-error-container text-on-error-container flex items-center gap-1 font-bold">
                    {caseItem.type}
                  </span>
                  <span className="font-data-mono text-body-sm text-secondary">{caseItem.time}</span>
                </div>
                <div className="flex items-center gap-1 font-label-sm text-label-sm bg-surface-container px-2 py-1 rounded text-on-surface font-semibold">
                  <span className="material-symbols-outlined text-[14px] text-tertiary">verified</span>
                  <span>{caseItem.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mb-space-md bg-surface-container-low p-space-md rounded-lg">
                <div>
                  <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Khách hàng & Liên hệ</div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">{caseItem.customerName}</div>
                  <div className="font-data-mono text-body-sm text-tertiary">{caseItem.customerPhone}</div>
                </div>
                <div>
                  <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Gara bị khiếu nại</div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">{caseItem.garageName}</div>
                  <div className="font-body-sm text-body-sm text-secondary">Garage ID: {caseItem.garageId}</div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-space-sm py-space-xs text-body-sm">
                <div className="flex items-center gap-space-xs font-data-mono">
                  <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">Mã cứu hộ: {caseItem.rescueCode}</span>
                  <span className="px-2 py-0.5 rounded bg-surface-container text-secondary">PayOS: {caseItem.payosCode}</span>
                </div>
                <div className="flex items-center gap-space-lg text-right">
                  <div>
                    <span className="text-secondary text-body-sm">Tổng thu gốc: </span>
                    <span className="font-data-mono text-headline-sm font-semibold text-on-surface">
                      {caseItem.originalPrice.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div>
                    <span className="text-primary text-body-sm font-semibold">Đề xuất hoàn: </span>
                    <span className="font-data-mono text-headline-lg font-bold text-primary">
                      {caseItem.requestedRefund.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-space-md p-space-md rounded bg-surface-container text-body-md text-on-surface flex items-start gap-space-sm">
                <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0 mt-0.5">assignment_turned_in</span>
                <div className="flex-1">
                  <span className="font-label-md text-label-md uppercase text-tertiary block font-bold">
                    Biên bản xác minh của Staff ({caseItem.inspectorName}):
                  </span>
                  <p className="font-body-sm text-body-sm text-on-surface-variant italic mt-0.5">
                    "{caseItem.inspectorNote}"
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* RIGHT COLUMN: Arbitration Desk & PayOS Reversal Workspace */}
        <div className="xl:col-span-5 flex flex-col gap-space-md">
          {selectedCase && (
            <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container">
              {/* Header */}
              <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container">
                <div className="flex items-center gap-space-xs">
                  <div className="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-data-mono font-bold text-label-sm">
                    AD
                  </div>
                  <div>
                    <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Bảng Thẩm Định Trọng Tài (UC-27)</div>
                    <div className="font-data-mono text-label-sm text-secondary">HỒ SƠ: #{selectedCase.id} • TRẠNG THÁI: {selectedCase.status}</div>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                  {selectedCase.status}
                </span>
              </div>

              {/* 1. Evidence Verification */}
              <div className="mb-space-lg">
                <div className="flex items-center justify-between mb-space-xs">
                  <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">
                    1. Đối Chiếu Bằng Chứng Hiện Trường & Hóa Đơn
                  </span>
                  <span className="font-data-mono text-label-sm text-tertiary">Chứng từ đính kèm</span>
                </div>
                <div className="grid grid-cols-2 gap-space-sm">
                  <div className="rounded-lg overflow-hidden bg-surface-container-low shadow-sm">
                    <div className="relative h-36">
                      <img
                        className="w-full h-full object-cover"
                        alt="Receipt"
                        src={selectedCase.evidenceReceiptUrl}
                      />
                    </div>
                    <div className="p-2 text-body-sm text-secondary line-clamp-2">
                      {selectedCase.inspectorNote}
                    </div>
                  </div>

                  <div className="rounded-lg overflow-hidden bg-surface-container-low shadow-sm p-3 flex flex-col justify-between">
                    <div>
                      <span className="text-label-xs font-bold text-secondary uppercase block">Số tiền duyệt hoàn (VNĐ)</span>
                      <input
                        type="number"
                        value={approvedRefundAmount}
                        onChange={(e) => setApprovedRefundAmount(Number(e.target.value))}
                        className="mt-1 w-full px-2.5 py-1.5 rounded border border-surface-container bg-surface font-data-mono font-bold text-primary"
                      />
                    </div>
                    <div className="mt-2">
                      <span className="text-label-xs font-bold text-secondary uppercase block">Ghi chú phán quyết của Admin</span>
                      <input
                        type="text"
                        value={adminNote}
                        onChange={(e) => setAdminNote(e.target.value)}
                        placeholder="Ghi chú quyết định hoàn tiền..."
                        className="mt-1 w-full px-2.5 py-1.5 rounded border border-surface-container bg-surface text-body-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Source Selector */}
              <div className="mb-space-lg">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold block mb-space-sm">
                  2. Lựa Chọn Nguồn Cấn Trừ Hoàn Tiền (Source of Refund)
                </span>
                <div className="space-y-space-sm">
                  <label className="flex items-start gap-space-md p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer border border-transparent has-[:checked]:border-primary">
                    <input
                      checked={refundSource === 'garage_wallet'}
                      onChange={() => setRefundSource('garage_wallet')}
                      className="mt-1 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      name="refund_source"
                      type="radio"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Cấn trừ Ví Số Dư của Gara</span>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container-high text-primary font-bold">KHUYẾN NGHỊ</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                        Tự động khấu trừ {approvedRefundAmount.toLocaleString('vi-VN')} ₫ từ ví số dư của {selectedCase.garageName} và ghi nhận bút toán DISPUTE_REFUND_DEDUCT.
                      </p>
                      <div className="mt-2 flex items-center gap-space-md font-data-mono text-label-sm text-on-surface-variant">
                        <span>Ví hiện tại: <strong className="text-tertiary">{garageBalance.toLocaleString('vi-VN')} ₫</strong></span>
                        <span>•</span>
                        <span>Sau hoàn: <strong>{(garageBalance - approvedRefundAmount).toLocaleString('vi-VN')} ₫</strong></span>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start gap-space-md p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-colors cursor-pointer border border-transparent has-[:checked]:border-primary">
                    <input
                      checked={refundSource === 'platform_fund'}
                      onChange={() => setRefundSource('platform_fund')}
                      className="mt-1 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      name="refund_source"
                      type="radio"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Quỹ Bảo Hiểm Dự Phòng Nền Tảng</span>
                        <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container text-secondary">GOODWILL FUND</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-secondary mt-0.5">
                        Chỉ áp dụng trong tình huống bất khả kháng, thiên tai cực đoan hoặc gara ngừng hợp tác.
                      </p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Settlement Summary */}
              <div className="mb-space-lg p-space-md rounded-lg bg-surface-container border border-surface-container">
                <div className="flex items-center justify-between mb-1 text-body-md text-secondary">
                  <span>Tổng tiền đơn gốc đã thanh toán:</span>
                  <span className="font-data-mono font-medium text-on-surface">
                    {selectedCase.originalPrice.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex items-center justify-between mb-1 text-body-md text-secondary">
                  <span>Chi phí dịch vụ chuẩn được giữ lại:</span>
                  <span className="font-data-mono font-medium text-on-surface">
                    {Math.max(0, selectedCase.originalPrice - approvedRefundAmount).toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex items-center justify-between pt-space-xs text-headline-sm border-t border-surface-container-high">
                  <span className="font-bold text-on-surface">Số tiền thực hoàn trả khách:</span>
                  <span className="font-data-mono text-headline-lg font-bold text-primary">
                    {approvedRefundAmount.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-space-xs">
                <button
                  onClick={handleExecuteRefund}
                  disabled={isRefunding || selectedCase.status === 'REFUNDED'}
                  className="w-full py-3 px-space-lg rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow-sm active:scale-[0.99] cursor-pointer font-bold disabled:opacity-75"
                >
                  <span className={`material-symbols-outlined text-[20px] ${isRefunding ? 'animate-spin' : ''}`}>
                    {isRefunding ? 'sync' : 'send_money'}
                  </span>
                  <span>
                    {selectedCase.status === 'REFUNDED'
                      ? 'Đã Hoàn Tiền Hoàn Tất'
                      : isRefunding
                      ? 'Đang thực thi hoàn tiền...'
                      : `Xác Nhận Hoàn Tiền ${approvedRefundAmount.toLocaleString('vi-VN')} ₫`}
                  </span>
                </button>

                <div className="grid grid-cols-2 gap-space-xs mt-1">
                  <button
                    onClick={handleAskStaff}
                    disabled={selectedCase.status === 'REFUNDED'}
                    className="py-2 px-space-sm rounded bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-colors font-label-md text-label-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px] text-secondary">sync_problem</span>
                    <span>Yêu cầu Staff xác minh lại</span>
                  </button>
                  <button
                    onClick={handleDismiss}
                    disabled={selectedCase.status === 'REFUNDED'}
                    className="py-2 px-space-sm rounded bg-surface-container-low hover:bg-error-container text-on-error-container transition-colors font-label-md text-label-md flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[16px] text-error">close</span>
                    <span>Bác Bỏ Khiếu Nại</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
