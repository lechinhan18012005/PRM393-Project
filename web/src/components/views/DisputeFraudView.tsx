import { ViewGuide } from '../ViewGuide';
import React, { useState } from 'react';
import { DisputeCase, ScreenId } from '../../types';

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
  const [selectedCase, setSelectedCase] = useState<DisputeCase>(disputes[0] || null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'OVERCHARGE' | 'FAKE_RESCUE' | 'DAMAGE'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const handleResolveDispute = (caseId: string, resolution: 'REFUND_CUSTOMER' | 'REJECT_COMPLAINT' | 'PENALIZE_GARAGE') => {
    let msg = '';
    if (resolution === 'REFUND_CUSTOMER') {
      msg = `Đã quyết định hoàn 100% số tiền ${selectedCase.requestedRefund.toLocaleString('vi-VN')} đ cho khách từ ví gara`;
    } else if (resolution === 'PENALIZE_GARAGE') {
      msg = `Đã phạt gara ${selectedCase.garageName} 500.000 đ và trừ điểm uy tín sàn`;
    } else {
      msg = `Đã bác bỏ khiếu nại đơn ${caseId}. Lưu trữ hồ sơ hoàn tất.`;
    }

    onShowToast('Phán Quyết Tranh Chấp', msg);
  };

  return (
    <div className="space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">Xử lý tranh chấp</h1>
          <ViewGuide><p className="font-body-md text-body-md text-secondary">
            Đối soát bằng chứng hóa đơn, tệp ghi âm hotline, và xử lý vi phạm đội giá mùa nước ngập.
          </p></ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => onSelectScreen('refunds')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Chuyển Sang Kế Toán Hoàn Tiền</span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-space-md">
        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Tranh Chấp Chờ Xử Lý</span>
          <div className="text-2xl font-bold text-red-600 font-data-mono mt-1">{disputes.length} ca</div>
          <span className="text-label-xs text-red-700">Hạn xử lý SLA: &lt; 24 giờ</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Vi Phạm Giá Niêm Yết</span>
          <div className="text-2xl font-bold text-amber-600 font-data-mono mt-1">8 vụ</div>
          <span className="text-label-xs text-secondary">Thu chênh lệch ngoài app</span>
        </div>

        <div className="p-space-md rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <span className="text-label-sm uppercase font-bold text-secondary">Gian Lận Ca Khống</span>
          <div className="text-2xl font-bold text-primary font-data-mono mt-1">2 vụ</div>
          <span className="text-label-xs text-secondary">Đã phát hiện qua GPS & PayOS</span>
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
              Hồ sơ khiếu nại
            </h2>
            <span className="text-label-sm text-secondary font-data-mono">Tổng {disputes.length} ca</span>
          </div>

          <div className="space-y-space-sm">
            {disputes.map((caseItem) => (
              <div
                key={caseItem.id}
                onClick={() => setSelectedCase(caseItem)}
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
                  <span className="text-secondary">Yêu cầu hoàn trả:</span>
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
                      Hồ Sơ Trọng Tài {selectedCase.id}
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
                  <div className="text-label-xs text-secondary">Mức đề xuất bồi hoàn:</div>
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

              {/* Evidence Inspection: Photos and Audio */}
              <div className="space-y-space-sm">
                <h3 className="font-label-sm uppercase font-bold text-secondary">
                  Bằng chứng
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
                      "Khách: Tôi gọi tổng đài bảo 150k sao thợ đến ép lấy 350k mới chịu kích nổ máy..."
                    </p>
                  </div>
                </div>
              </div>

              {/* Adjudication Verdict Actions */}
              <div className="pt-space-md border-t border-surface-container flex flex-wrap items-center justify-between gap-space-sm">
                <button
                  onClick={() => handleResolveDispute(selectedCase.id, 'REJECT_COMPLAINT')}
                  className="px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
                >
                  Bác Bỏ Khiếu Nại (Hợp Lệ)
                </button>

                <div className="flex items-center gap-space-sm">
                  <button
                    onClick={() => handleResolveDispute(selectedCase.id, 'PENALIZE_GARAGE')}
                    className="px-space-md py-2 bg-amber-600 text-white rounded font-label-md font-semibold hover:bg-amber-700 transition-all shadow-xs"
                  >
                    Phạt Gara 500.000 đ
                  </button>
                  <button
                    onClick={() => handleResolveDispute(selectedCase.id, 'REFUND_CUSTOMER')}
                    className="px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-bold hover:bg-primary/90 transition-all shadow-xs"
                  >
                    Chấp Thuận & Hoàn Tiền Khách
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
