import { ViewGuide } from '../ViewGuide';
import React, { useEffect, useState } from 'react';
import { DisputeCase, ScreenId } from '../../types';
import { DisputeBackendResponse, financeApi } from '../../services/financeApi';

interface DisputeFraudViewProps {
  disputes: DisputeCase[];
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

export const DisputeFraudView: React.FC<DisputeFraudViewProps> = ({
  disputes,
  onSelectScreen,
  onShowToast
}) => {
  const [caseList, setCaseList] = useState<(DisputeCase & { backendId?: number })[]>(disputes);
  const [selectedCase, setSelectedCase] = useState<(DisputeCase & { backendId?: number }) | null>(disputes[0] || null);
  const [proposedAmount, setProposedAmount] = useState<number>(disputes[0]?.requestedRefund || 0);
  const [staffNote, setStaffNote] = useState<string>(disputes[0]?.inspectorNote || '');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const mapBackendToDisputeCase = (d: DisputeBackendResponse): DisputeCase & { backendId: number } => {
    const diff = d.requestedRefundAmount || 0;
    const orig = d.originalAmount || diff;
    return {
      backendId: d.id,
      id: d.disputeCode,
      rescueCode: d.rescueCode,
      payosCode: d.payosOrderCode ? `POS-${d.payosOrderCode}` : 'POS-ONLINE',
      customerName: d.customerName,
      customerPhone: d.customerPhone || '0908 123 456',
      garageName: d.garageName || 'Gara đối tác',
      garageId: d.garageId ? `GAR-${d.garageId}` : 'GAR-01',
      type: d.disputeType === 'OVERCHARGE' ? 'OVERCHARGE' : d.disputeType === 'DAMAGE' ? 'DAMAGE' : d.disputeType === 'FAKE_RESCUE' ? 'FAKE_RESCUE' : 'POOR_QUALITY',
      severity: 'L3_CRITICAL',
      originalPrice: orig,
      requestedRefund: d.proposedRefundAmount ?? d.requestedRefundAmount,
      time: d.createdAt ? new Date(d.createdAt).toLocaleString('vi-VN') : 'Vừa xong',
      status: d.status,
      inspectorName: d.staffReviewerName || 'Chuyên viên CSKH (Staff)',
      inspectorId: d.staffReviewerId ? `STAFF-${d.staffReviewerId}` : 'STAFF-01',
      inspectorNote: d.staffFindingNote || d.customerReason,
      evidenceReceiptUrl: d.evidenceImageUrls?.split(',')[0] || 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=600&auto=format&fit=crop&q=80',
      evidenceTariffUrl: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=600&auto=format&fit=crop&q=80',
      audioDuration: '02:15',
      diffItems: [
        {
          name: d.disputeType === 'OVERCHARGE' ? 'Chênh lệch thu vượt báo giá' : 'Hạng mục khiếu nại dịch vụ',
          desc: d.customerReason,
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
      .getStaffDisputes()
      .then((backendData) => {
        if (!mounted || !backendData || backendData.length === 0) return;
        const mapped = backendData.map(mapBackendToDisputeCase);
        setCaseList(mapped);
        setSelectedCase(mapped[0]);
        setProposedAmount(mapped[0].requestedRefund);
        setStaffNote(mapped[0].inspectorNote);
      })
      .catch(() => {
        // Fallback to mock disputes when offline
      });
    return () => {
      mounted = false;
    };
  }, []);

  const handleSelectCase = (c: DisputeCase & { backendId?: number }) => {
    setSelectedCase(c);
    setProposedAmount(c.requestedRefund);
    setStaffNote(c.inspectorNote || '');
  };

  const handleResolveDispute = async (
    caseId: string,
    resolution: 'PROPOSE_ADMIN_REFUND' | 'REJECT_COMPLAINT'
  ) => {
    if (!selectedCase) return;
    setIsSubmitting(true);

    const decision = resolution === 'PROPOSE_ADMIN_REFUND' ? 'ADMIN_APPROVAL' : 'REJECTED';
    const noteToSend =
      staffNote.trim() ||
      (decision === 'ADMIN_APPROVAL'
        ? `Staff xác nhận có vi phạm, đề xuất Admin hoàn ${proposedAmount.toLocaleString('vi-VN')} đ cho khách.`
        : `Staff đã kiểm tra chứng từ hợp lệ, bác bỏ khiếu nại ${caseId}.`);

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
          'Đã Chuyển Hồ Sơ Lên Admin (UC-23)',
          `Biên bản xác minh đơn ${caseId} với mức đề xuất hoàn ${proposedAmount.toLocaleString('vi-VN')} đ đã chuyển sang hàng đợi Admin phê duyệt (UC-27).`
        );
      } else {
        onShowToast(
          'Đã Bác Bỏ Khiếu Nại (UC-23)',
          `Đã bác bỏ khiếu nại đơn ${caseId} và lưu trữ biên bản đối soát.`
        );
      }
    } catch (err: any) {
      onShowToast('Lỗi Xử Lý Khiếu Nại', err?.message || 'Không thể lưu biên bản xác minh');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
            Xử lý khiếu nại dịch vụ (UC-23 - Staff)
          </h1>
          <ViewGuide>
            <p className="font-body-md text-body-md text-secondary">
              Staff tiếp nhận khiếu nại từ khách hàng, kiểm tra bằng chứng hóa đơn / báo giá, ghi nhận biên bản xác minh và đề xuất mức hoàn tiền lên Admin phê duyệt.
            </p>
          </ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => onSelectScreen('refunds')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Chuyển Sang Admin Duyệt Hoàn Tiền (UC-27)</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Khiếu Nại Chờ Xác Minh</span>
          <div className="text-2xl font-bold text-red-600 font-data-mono mt-1">{caseList.length} ca</div>
          <span className="text-label-xs text-red-700">Hạn xử lý SLA: &lt; 24 giờ</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Chờ Admin Phê Duyệt</span>
          <div className="text-2xl font-bold text-amber-600 font-data-mono mt-1">
            {caseList.filter((c) => c.status === 'ADMIN_APPROVAL').length} ca
          </div>
          <span className="text-label-xs text-secondary">Đã có biên bản của Staff</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Đã Hoàn Tiền (REFUNDED)</span>
          <div className="text-2xl font-bold text-primary font-data-mono mt-1">
            {caseList.filter((c) => c.status === 'REFUNDED').length} ca
          </div>
          <span className="text-label-xs text-secondary">Đã cấn trừ ví Gara</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Quỹ Bảo Hiểm Đền Bù</span>
          <div className="text-2xl font-bold text-emerald-600 font-data-mono mt-1">242.645.000 đ</div>
          <span className="text-label-xs text-emerald-700 font-semibold">Sẵn sàng bảo vệ khách</span>
        </div>
      </div>

      {/* Main Grid: Left Cases List & Right Arbitration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* Left Column: List of Disputes */}
        <div className="lg:col-span-5 space-y-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Danh sách hồ sơ khiếu nại
            </h2>
            <span className="text-label-sm text-secondary font-data-mono">Tổng {caseList.length} ca</span>
          </div>

          <div className="space-y-space-sm">
            {caseList.map((caseItem) => (
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
                  <div className="flex items-center gap-2">
                    <span className="font-data-mono font-bold text-primary text-body-sm">{caseItem.id}</span>
                    <span className="text-label-xs bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">
                      {caseItem.type}
                    </span>
                    <span className="text-label-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">
                      {caseItem.status}
                    </span>
                  </div>
                  <span className="text-label-xs text-secondary font-data-mono">{caseItem.time}</span>
                </div>

                <div className="space-y-1 text-body-sm">
                  <div className="font-bold text-on-surface">{caseItem.customerName} vs {caseItem.garageName}</div>
                  <div className="text-label-xs text-secondary">
                    Mã cứu hộ: <span className="font-data-mono text-primary">{caseItem.rescueCode}</span> • PayOS:{' '}
                    <span className="font-data-mono">{caseItem.payosCode}</span>
                  </div>
                  <div className="text-body-xs text-on-surface-variant line-clamp-2 mt-1">
                    {caseItem.inspectorNote}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-2 border-t border-surface-container text-label-xs">
                  <span className="text-secondary">Yêu cầu / Đề xuất hoàn:</span>
                  <span className="font-data-mono font-bold text-red-600">
                    {caseItem.requestedRefund.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              </div>
            ))}
          </div>
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
                      Hồ Sơ Xác Minh {selectedCase.id}
                    </span>
                    <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 font-bold text-label-xs rounded">
                      {selectedCase.status}
                    </span>
                  </div>
                  <div className="text-body-sm text-secondary mt-0.5">
                    Khởi tạo: {selectedCase.time} • Cứu hộ mã: {selectedCase.rescueCode}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-label-xs text-secondary">Mức khách yêu cầu bồi hoàn:</div>
                  <div className="font-data-mono font-bold text-xl text-red-600">
                    {selectedCase.requestedRefund.toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* Both Parties Profile */}
              <div className="grid grid-cols-2 gap-space-md p-space-md bg-surface-container-low rounded-lg text-body-sm">
                <div>
                  <div className="font-label-sm uppercase font-bold text-secondary mb-1">Bên Khiếu Nại (Khách Hàng)</div>
                  <div className="font-bold text-on-surface">{selectedCase.customerName}</div>
                  <div className="font-data-mono text-secondary">{selectedCase.customerPhone}</div>
                </div>
                <div>
                  <div className="font-label-sm uppercase font-bold text-secondary mb-1">Bên Bị Khiếu Nại (Gara)</div>
                  <div className="font-bold text-on-surface">{selectedCase.garageName}</div>
                  <div className="text-label-xs text-secondary">Mã đơn vị: {selectedCase.garageId}</div>
                </div>
              </div>

              {/* Discrepancy Breakdown Table */}
              <div>
                <h3 className="font-label-sm uppercase font-bold text-secondary mb-2">
                  Đối chiếu chi phí
                </h3>
                <div className="border border-surface-container rounded-lg overflow-hidden">
                  <table className="w-full text-left text-body-sm">
                    <thead className="bg-surface-container-low text-label-xs uppercase text-secondary font-bold">
                      <tr>
                        <th className="py-2.5 px-3">Hạng Mục</th>
                        <th className="py-2.5 px-3 text-right">Giá Chuẩn Sàn</th>
                        <th className="py-2.5 px-3 text-right">Gara Đã Thu</th>
                        <th className="py-2.5 px-3 text-right">Chênh Lệch</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-container">
                      {selectedCase.diffItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/40">
                          <td className="py-2 px-3">
                            <div className="font-semibold text-on-surface">{item.name}</div>
                            <div className="text-label-xs text-secondary">{item.desc}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-data-mono">
                            {item.priceV1 ? `${item.priceV1.toLocaleString('vi-VN')} đ` : '0 đ'}
                          </td>
                          <td className="py-2 px-3 text-right font-data-mono font-bold text-on-surface">
                            {item.priceV2.toLocaleString('vi-VN')} đ
                          </td>
                          <td className="py-2 px-3 text-right font-data-mono font-bold text-red-600">
                            +{item.diff.toLocaleString('vi-VN')} đ
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Staff Investigation & Proposal Form (UC-23) */}
              <div className="p-space-md rounded-lg bg-surface-container-low border border-surface-container space-y-space-sm">
                <h3 className="font-label-sm uppercase font-bold text-primary">
                  Biên Bản Xác Minh & Đề Xuất Hoàn Tiền Của Staff (UC-23)
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
                  <div>
                    <label className="block text-label-xs font-semibold text-secondary mb-1">
                      Mức tiền đề xuất Admin hoàn trả (VNĐ):
                    </label>
                    <input
                      type="number"
                      value={proposedAmount}
                      onChange={(e) => setProposedAmount(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded border border-surface-container bg-surface text-on-surface font-data-mono font-bold"
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
                    value={staffNote}
                    onChange={(e) => setStaffNote(e.target.value)}
                    placeholder="Nhập kết quả kiểm tra hóa đơn, xác minh với Gara và lý do đề xuất hoàn tiền..."
                    className="w-full px-3 py-2 rounded border border-surface-container bg-surface text-on-surface text-body-sm"
                  />
                </div>
              </div>

              {/* Evidence Inspection: Photos and Audio */}
              <div className="space-y-space-sm">
                <h3 className="font-label-sm uppercase font-bold text-secondary">
                  Bằng chứng đính kèm
                </h3>
                <div className="grid grid-cols-2 gap-space-md">
                  <div className="border border-surface-container rounded-lg p-3 bg-surface">
                    <div className="text-label-xs font-bold text-secondary mb-2">Hình ảnh hóa đơn / màn hình thu phí:</div>
                    <img
                      src={selectedCase.evidenceReceiptUrl}
                      alt="Evidence Receipt"
                      className="w-full h-36 object-cover rounded border border-surface-container"
                    />
                  </div>

                  <div className="border border-surface-container rounded-lg p-3 bg-surface space-y-2">
                    <div className="text-label-xs font-bold text-secondary">Ghi âm cuộc gọi điều phối ({selectedCase.audioDuration}):</div>
                    <div className="p-3 bg-surface-container-low rounded flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-[24px]">graphic_eq</span>
                        <span className="text-body-xs font-medium">AUDIO_DISPATCH_RECORDING.mp3</span>
                      </div>
                      <button
                        onClick={() => onShowToast('Phát Ghi Âm', `Đang phát đoạn ghi âm cuộc gọi ${selectedCase.audioDuration}`)}
                        className="px-2 py-1 bg-primary text-on-primary rounded text-label-xs font-bold"
                      >
                        Nghe
                      </button>
                    </div>
                    <p className="text-label-xs text-secondary italic">
                      "{selectedCase.inspectorNote}"
                    </p>
                  </div>
                </div>
              </div>

              {/* Adjudication Verdict Actions */}
              <div className="pt-space-md border-t border-surface-container flex flex-wrap items-center justify-between gap-space-sm">
                <button
                  disabled={isSubmitting || selectedCase.status === 'REFUNDED'}
                  onClick={() => handleResolveDispute(selectedCase.id, 'REJECT_COMPLAINT')}
                  className="px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all disabled:opacity-50"
                >
                  Bác Bỏ Khiếu Nại (Hợp Lệ)
                </button>

                <div className="flex items-center gap-space-sm">
                  <button
                    disabled={isSubmitting || selectedCase.status === 'REFUNDED'}
                    onClick={() => handleResolveDispute(selectedCase.id, 'PROPOSE_ADMIN_REFUND')}
                    className="px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-bold hover:bg-primary/90 transition-all shadow-xs disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Lập Biên Bản & Đề Xuất Admin Hoàn Tiền'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-secondary bg-surface-container-lowest rounded-xl border border-surface-container">
              Chọn hồ sơ bên trái để tiến hành thẩm tra đối soát.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
