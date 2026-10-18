import { ViewGuide } from '../ViewGuide';
import React, { useState } from 'react';
import { PayoutItem } from '../../types';

interface PayoutsViewProps {
  payouts: PayoutItem[];
  onShowToast: (title: string, msg: string) => void;
}

export const PayoutsView: React.FC<PayoutsViewProps> = ({ payouts, onShowToast }) => {
  const [selectedPayoutId, setSelectedPayoutId] = useState<string>(payouts[0]?.id || 'PO-2024-8891');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('#PO-2024-8891');
  const [bankFilter, setBankFilter] = useState<string>('');
  const [amountFilter, setAmountFilter] = useState<string>('high');
  const [otpCode, setOtpCode] = useState<string>('••••••');
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);

  const selectedPayout = payouts.find((p) => p.id === selectedPayoutId) || payouts[0];

  const filteredPayouts = payouts.filter((p) => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        p.id.toLowerCase().includes(q) ||
        p.garageName.toLowerCase().includes(q) ||
        p.repName.toLowerCase().includes(q) ||
        p.bankAccount.includes(q);
      if (!match) return false;
    }
    if (bankFilter && p.bankCode !== bankFilter) return false;
    return true;
  });

  const handleDisburse = () => {
    setIsDisbursing(true);
    setTimeout(() => {
      setIsDisbursing(false);
      onShowToast(
        'Giải Ngân PayOS Thành Công!',
        `Lệnh chuyển khoản Napas247 trị giá ${selectedPayout.requestedAmount.toLocaleString('vi-VN')} ₫ đã gửi tới ${selectedPayout.accountHolder} (${selectedPayout.bankName}). Mã UNC: TXN-NAPAS-8819209.`
      );
    }, 1200);
  };

  const handleReject = () => {
    onShowToast('Đã Từ Chối Lệnh', `Đã từ chối lệnh rút tiền ${selectedPayout.id}. Số dư bảo lưu tại ví gara.`);
  };

  const handleBatchApprove = () => {
    onShowToast(
      'Phê Duyệt Hàng Loạt Thành Công!',
      'Đã duyệt tự động 5 lệnh rút tiền hợp lệ (tổng cộng 34.100.000 ₫) qua cổng PayOS Napas247.'
    );
  };

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Top Tactical Notification Banner */}
      <div className="flex items-center justify-between px-space-md py-space-xs bg-surface-container-high rounded text-on-surface border border-surface-container">
        <div className="flex items-center gap-space-sm font-label-md text-label-md">
          <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-ping"></span>
          <span className="font-data-mono text-data-mono uppercase text-primary font-bold">
            PAYOS NAPAS 24/7 GATEWAY: READY
          </span>
          <span className="text-secondary">• Cổng đối soát tự động đồng bộ lần cuối lúc 14:42:08</span>
        </div>
        <div className="flex items-center gap-space-md text-secondary font-label-sm text-label-sm">
          <span>Độ trễ giải ngân: <strong className="text-on-surface font-data-mono text-data-mono">1.2s</strong></span>
          <span>Hạn mức ca trực: <strong className="text-tertiary font-data-mono text-data-mono">500.000.000 ₫</strong></span>
        </div>
      </div>

      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-lg bg-surface-container-lowest p-space-lg rounded shadow-sm border border-surface-container">
        <div className="flex flex-col gap-space-xs">
          <nav className="flex items-center gap-space-xs font-label-sm text-label-sm text-secondary uppercase font-semibold">
            <span>TÀI CHÍNH & KẾ TOÁN</span>
            <span>/</span>
            <span className="text-primary font-bold">QUẢN LÝ GIẢI NGÂN</span>
          </nav>
          <div className="flex items-center gap-space-md flex-wrap">
            <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">Yêu cầu rút tiền</h1>
            <span className="px-space-sm py-0.5 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
              7 LỆNH CHỜ DUYỆT
            </span>
          </div>
          <ViewGuide><p className="font-body-md text-body-md text-secondary">
            Thẩm định đối chiếu số dư ký quỹ bảo hành, hồ sơ pháp lý eKYC và kích hoạt lệnh chuyển khoản tự động Napas247.
          </p></ViewGuide>
        </div>

        {/* Quick Metric Cards & Fast Actions */}
        <div className="flex flex-wrap items-center gap-space-md">
          <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-sm rounded">
            <div className="p-space-sm rounded bg-primary-container text-on-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">hourglass_top</span>
            </div>
            <div className="flex flex-col">
              <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Đang chờ xử lý</span>
              <div className="flex items-baseline gap-1">
                <span className="font-headline-md text-headline-md text-primary font-bold">7</span>
                <span className="font-label-sm text-label-sm text-secondary">lệnh</span>
                <span className="font-data-mono text-data-mono font-bold text-on-surface ml-1">(42.800.000 ₫)</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-md bg-surface-container-low px-space-md py-space-sm rounded min-w-[240px]">
            <div className="p-space-sm rounded bg-tertiary text-on-tertiary flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
            </div>
            <div className="flex flex-col w-full">
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Hạn mức PayOS/Napas</span>
                <span className="font-label-sm text-label-sm text-tertiary font-bold">50%</span>
              </div>
              <div className="font-data-mono text-data-mono text-on-surface font-semibold text-[11px] mb-1">
                2.500.000.000 ₫ / 5.000.000.000 ₫
              </div>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-tertiary rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-space-xs">
            <button
              onClick={() => onShowToast('Xuất File UNC', 'Đã tải xuống file đối soát kế toán Payouts_Napas_UNC.xlsx')}
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded bg-surface-container-low hover:bg-surface-container text-on-surface font-label-md text-label-md transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">table_chart</span>
              <span>Xuất File UNC Excel</span>
            </button>
            <button
              onClick={handleBatchApprove}
              className="flex items-center gap-space-xs px-space-md py-2.5 rounded bg-primary text-on-primary font-headline-sm text-headline-sm hover:bg-primary-container shadow-sm transition-all cursor-pointer font-bold"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Phê Duyệt Hàng Loạt (5 Hợp Lệ)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <div className="flex items-center gap-space-xs bg-surface-container-low p-1 rounded">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-space-xs px-space-md py-2 rounded font-headline-sm text-headline-sm transition-colors cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-surface-container-lowest text-primary shadow-sm font-bold'
                : 'text-secondary hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">pending_actions</span>
            <span>Chờ Phê Duyệt</span>
            <span className="px-1.5 py-0.2 rounded-full bg-primary text-on-primary font-data-mono text-data-mono text-[10px]">7</span>
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-space-xs px-space-md py-2 rounded text-secondary hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer ${
              activeTab === 'completed' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">check_circle</span>
            <span>Đã Giải Ngân Chuyển Khoản</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant font-data-mono text-data-mono text-[10px]">1.248</span>
          </button>
          <button
            onClick={() => setActiveTab('rejected')}
            className={`flex items-center gap-space-xs px-space-md py-2 rounded text-secondary hover:text-on-surface font-label-md text-label-md transition-colors cursor-pointer ${
              activeTab === 'rejected' ? 'bg-surface-container-lowest text-primary shadow-sm font-bold' : ''
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            <span>Từ Chối / Cần Bổ Sung</span>
            <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-on-surface-variant font-data-mono text-data-mono text-[10px]">14</span>
          </button>
        </div>

        <div className="flex items-center gap-space-md text-secondary font-label-sm text-label-sm">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-tertiary"></span> Ngân hàng kết nối: 48/48 Napas</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary"></span> Tự động khóa rủi ro khi số dư khả dụng âm</span>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-space-md p-space-md bg-surface-container-lowest rounded shadow-sm items-center border border-surface-container">
        <div className="md:col-span-4 relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
          <input
            className="w-full h-9 pl-9 pr-3 rounded bg-surface-container-low text-body-md font-body-md text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary border-0"
            placeholder="Tìm tên gara, STK, chủ tài khoản, mã #PO-..."
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="md:col-span-3">
          <select
            value={bankFilter}
            onChange={(e) => setBankFilter(e.target.value)}
            className="w-full h-9 px-3 rounded bg-surface-container-low text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer border-0"
          >
            <option value="">Tất cả ngân hàng nhận (MB, VCB, TCB...)</option>
            <option value="MB">MB Bank (Ngân hàng Quân Đội)</option>
            <option value="VCB">Vietcombank</option>
            <option value="TCB">Techcombank</option>
            <option value="ACB">ACB - Á Châu</option>
            <option value="BIDV">BIDV</option>
          </select>
        </div>

        <div className="md:col-span-3">
          <select
            value={amountFilter}
            onChange={(e) => setAmountFilter(e.target.value)}
            className="w-full h-9 px-3 rounded bg-surface-container-low text-body-md font-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer border-0"
          >
            <option value="all">Khoảng tiền rút: Tất cả</option>
            <option value="high">Khoản lớn (&gt; 5.000.000 ₫)</option>
            <option value="mid">1.000.000 ₫ - 5.000.000 ₫</option>
            <option value="low">&lt; 1.000.000 ₫</option>
          </select>
        </div>

        <div className="md:col-span-2 flex items-center justify-end gap-space-xs">
          <button
            onClick={() => {
              setSearchQuery('');
              setBankFilter('');
            }}
            className="h-9 px-space-md rounded bg-surface-container-low hover:bg-surface-container text-secondary hover:text-on-surface font-label-md text-label-md flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            <span>Đặt lại</span>
          </button>
        </div>
      </div>

      {/* Main Split Layout: Table (7 cols) + Right Audit Panel (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
        {/* Left Master Table */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded shadow-sm overflow-hidden border border-surface-container">
            <div className="px-space-md py-space-sm bg-surface-container-low flex items-center justify-between border-b border-surface-container">
              <div className="flex items-center gap-space-sm">
                <span className="font-headline-sm text-headline-sm text-on-surface uppercase font-bold">HÀNG CHỜ DUYỆT GIẢI NGÂN</span>
                <span className="font-data-mono text-data-mono text-label-sm text-secondary">
                  (HIỂN THỊ {filteredPayouts.length}/7 YÊU CẦU)
                </span>
              </div>
              <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm">
                <span className="material-symbols-outlined text-[16px]">sync</span>
                <span>Tự động cập nhật sau 25s</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container font-label-md text-label-md text-secondary uppercase tracking-wider">
                    <th className="p-space-sm w-8 text-center">
                      <input className="rounded text-primary focus:ring-0" type="checkbox" defaultChecked />
                    </th>
                    <th className="p-space-sm">MÃ LỆNH / THỜI GIAN</th>
                    <th className="p-space-sm">GARA & ĐẠI DIỆN</th>
                    <th className="p-space-sm">NGÂN HÀNG & EKYC</th>
                    <th className="p-space-sm text-right">RÚT / SỐ DƯ VÍ</th>
                    <th className="p-space-sm text-center">RỦI RO</th>
                    <th className="p-space-sm text-center">HÀNH ĐỘNG</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm text-on-surface divide-y divide-surface-container-low">
                  {filteredPayouts.map((p) => {
                    const isSelected = p.id === selectedPayoutId;
                    const isBlocked = p.riskStatus === 'DISPUTED';

                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSelectedPayoutId(p.id)}
                        className={`transition-colors cursor-pointer ${
                          isBlocked ? 'bg-error-container/20' : isSelected ? 'bg-surface-container-low' : 'hover:bg-surface-container-low/60'
                        }`}
                      >
                        <td className="p-space-sm text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            className="rounded text-primary focus:ring-0"
                            type="checkbox"
                            disabled={isBlocked}
                            defaultChecked={!isBlocked}
                          />
                        </td>
                        <td className="p-space-sm">
                          <div className="flex flex-col">
                            <span className={`font-data-mono text-data-mono font-bold ${isBlocked ? 'text-error' : 'text-primary'}`}>
                              #{p.id}
                            </span>
                            <span className="text-secondary font-data-mono text-[11px]">{p.time}</span>
                          </div>
                        </td>
                        <td className="p-space-sm">
                          <div className="flex flex-col">
                            <span className="font-headline-sm text-headline-sm text-on-surface leading-snug font-semibold">{p.garageName}</span>
                            <span className="text-secondary text-[11px]">ĐD: {p.repName}</span>
                          </div>
                        </td>
                        <td className="p-space-sm">
                          <div className="flex flex-col gap-0.5">
                            <div className="flex items-center gap-1 font-headline-sm text-headline-sm">
                              <span className="px-1 py-0.5 rounded bg-surface-container font-label-sm text-label-sm font-bold text-on-surface">
                                {p.bankCode}
                              </span>
                              <span className="font-data-mono text-data-mono font-bold">{p.bankAccount}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-secondary text-[10px] uppercase font-bold">{p.accountHolder}</span>
                              {p.ekycVerified ? (
                                <span className="px-1 py-0.2 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold text-[9px] flex items-center">
                                  <span className="material-symbols-outlined text-[11px] mr-0.5">verified</span> Khớp 100%
                                </span>
                              ) : (
                                <span className="px-1 py-0.2 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold text-[9px] flex items-center">
                                  <span className="material-symbols-outlined text-[11px] mr-0.5">warning</span> Lệch Tên Chủ
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-space-sm text-right">
                          <div className="flex flex-col items-end">
                            <span className="font-data-mono text-data-mono font-bold text-primary text-[14px]">
                              {p.requestedAmount.toLocaleString('vi-VN')} ₫
                            </span>
                            <span className="text-secondary font-data-mono text-[11px]">
                              Dư: {p.walletBalance.toLocaleString('vi-VN')} ₫
                            </span>
                            <span className="text-[10px] text-tertiary font-medium">Phí Napas: 0 ₫</span>
                          </div>
                        </td>
                        <td className="p-space-sm text-center">
                          {isBlocked ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-error mr-1"></span>
                              1 Tranh Chấp
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary font-label-sm text-label-sm font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-tertiary mr-1"></span>
                              An Toàn
                            </span>
                          )}
                        </td>
                        <td className="p-space-sm text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {!isBlocked ? (
                              <button
                                onClick={handleDisburse}
                                className="p-1 rounded bg-primary text-on-primary hover:bg-primary-container transition-colors cursor-pointer"
                                title="Duyệt tức thì Napas247"
                              >
                                <span className="material-symbols-outlined text-[16px]">send_money</span>
                              </button>
                            ) : (
                              <button
                                className="p-1 rounded bg-secondary-fixed text-on-secondary-fixed opacity-50 cursor-not-allowed"
                                title="Bị chặn do tranh chấp"
                              >
                                <span className="material-symbols-outlined text-[16px]">lock</span>
                              </button>
                            )}
                            <button
                              onClick={handleReject}
                              className="p-1 rounded bg-error-container text-on-error-container hover:bg-error hover:text-on-error transition-colors cursor-pointer"
                              title="Từ chối yêu cầu"
                            >
                              <span className="material-symbols-outlined text-[16px]">close</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-surface-container">
              <div className="flex items-center gap-space-sm font-body-sm text-body-sm text-secondary">
                <span>Đã chọn <strong className="text-primary font-bold">1</strong> trong số <strong>7</strong> lệnh</span>
                <span>• Tổng tiền chọn: <strong className="font-data-mono text-data-mono text-on-surface font-bold">15.000.000 ₫</strong></span>
              </div>
              <div className="flex items-center gap-space-xs font-label-md text-label-md text-secondary">
                <button className="px-2 py-1 rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50" disabled>
                  Trước
                </button>
                <span className="px-2 py-1 rounded bg-primary text-on-primary font-data-mono text-data-mono">1</span>
                <button className="px-2 py-1 rounded bg-surface-container-lowest text-on-surface hover:bg-surface-container transition-colors disabled:opacity-50" disabled>
                  Sau
                </button>
              </div>
            </div>
          </div>

          {/* Compliance Notice */}
          <div className="p-space-md rounded bg-surface-container-low text-on-surface flex items-start gap-space-md shadow-sm border border-surface-container">
            <div className="p-space-xs rounded bg-tertiary text-on-tertiary mt-0.5">
              <span className="material-symbols-outlined text-[18px]">verified_user</span>
            </div>
            <div className="flex flex-col gap-1">
              <h4 className="font-headline-sm text-headline-sm font-semibold">Quy chuẩn Bảo lãnh & Trừ Quỹ Ký Quỹ</h4>
              <p className="font-body-sm text-body-sm text-secondary">
                Hệ thống tự động phong tỏa tối thiểu <strong>5.000.000 ₫</strong> với mọi gara đang mở tuyến cứu hộ trong mùa mưa lũ để đảm bảo chế độ bảo hành 48 giờ đối với xe máy ngập nước sau khi bàn giao khách hàng. Lệnh rút tiền vượt quá số dư khả dụng sẽ bị hệ thống tự động khóa.
              </p>
            </div>
          </div>
        </div>

        {/* Right Detail Audit Panel */}
        {selectedPayout && (
          <div className="lg:col-span-5 flex flex-col gap-space-md sticky top-20">
            <div className="bg-surface-container-lowest rounded shadow-md overflow-hidden border border-surface-container">
              {/* Header */}
              <div className="bg-surface-container-high p-space-md flex items-center justify-between border-b border-surface-container">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-primary text-on-primary flex items-center justify-center font-bold">
                    <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">HỒ SƠ THẨM ĐỊNH RÚT TIỀN</span>
                    <span className="font-data-mono text-data-mono text-headline-sm text-primary font-bold">#{selectedPayout.id}</span>
                  </div>
                </div>
                <span className="px-space-sm py-1 rounded bg-surface-container-lowest text-primary font-label-sm text-label-sm font-bold flex items-center gap-1 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                  CHỜ PHÊ DUYỆT
                </span>
              </div>

              {/* Garage Identity */}
              <div className="p-space-md bg-surface-container-low flex flex-col gap-space-sm border-b border-surface-container">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">{selectedPayout.garageName}</h3>
                    <p className="text-secondary text-body-sm font-body-sm">Số 42 Ung Văn Khiêm, P.25, Q.Bình Thạnh, TP.HCM</p>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold">
                    Đối tác Cấp 1
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-space-xs font-label-sm text-label-sm mt-1">
                  <div className="p-space-xs rounded bg-surface-container-lowest flex items-center gap-1.5 text-on-surface">
                    <span className="material-symbols-outlined text-tertiary text-[16px]">fingerprint</span>
                    <span>eKYC: Đã duyệt CCCD chip</span>
                  </div>
                  <div className="p-space-xs rounded bg-surface-container-lowest flex items-center gap-1.5 text-on-surface">
                    <span className="material-symbols-outlined text-tertiary text-[16px]">domain_verification</span>
                    <span>GPKD: 0314892819-001</span>
                  </div>
                </div>
              </div>

              {/* Balance Breakdown */}
              <div className="p-space-md flex flex-col gap-space-sm border-b border-surface-container">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">PHÂN TÍCH SỐ DƯ TÀI CHÍNH</span>
                  <span className="font-data-mono text-data-mono text-[11px] text-tertiary">Mã ví: W-KD-8821</span>
                </div>
                <div className="p-space-md rounded bg-surface-container-low flex flex-col gap-space-xs">
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="text-secondary">Tổng thu nhập cuốc tích lũy:</span>
                    <span className="font-data-mono text-data-mono text-on-surface font-semibold">
                      {selectedPayout.walletBalance.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-body-sm font-body-sm">
                    <span className="text-secondary flex items-center gap-1">
                      Ký quỹ bảo hành cứu hộ xe ngập:
                      <span className="material-symbols-outlined text-secondary text-[14px]">help</span>
                    </span>
                    <span className="font-data-mono text-data-mono text-error font-semibold">
                      -{selectedPayout.holdbackAmount.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="h-0.5 bg-surface-container-highest my-1"></div>
                  <div className="flex justify-between items-center">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Số dư khả dụng hợp lệ:</span>
                    <span className="font-data-mono text-data-mono font-headline-md text-headline-md text-tertiary font-bold">
                      {selectedPayout.availableBalance.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="p-space-sm rounded bg-primary-fixed/30 flex items-center justify-between mt-space-xs">
                    <span className="font-headline-sm text-headline-sm text-primary font-bold">SỐ TIỀN ĐỀ NGHỊ RÚT:</span>
                    <span className="font-data-mono text-data-mono font-headline-xl text-headline-xl text-primary font-bold">
                      {selectedPayout.requestedAmount.toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  <div className="flex justify-between items-center font-label-sm text-label-sm text-secondary pt-1">
                    <span>Số dư còn lại sau khi rút:</span>
                    <span className="font-data-mono text-data-mono text-on-surface font-bold">
                      {(selectedPayout.availableBalance - selectedPayout.requestedAmount).toLocaleString('vi-VN')} ₫ (Đảm bảo an toàn)
                    </span>
                  </div>
                </div>
              </div>

              {/* Beneficiary Specs */}
              <div className="px-space-md py-space-sm flex flex-col gap-space-sm border-b border-surface-container">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-bold">TÀI KHOẢN NGÂN HÀNG THỤ HƯỞNG (NAPAS 24/7)</span>
                <div className="p-space-md rounded bg-surface-container-lowest shadow-sm flex flex-col gap-space-xs border border-surface-container">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-space-sm">
                      <div className="w-10 h-10 rounded bg-tertiary text-on-tertiary flex items-center justify-center font-bold font-data-mono">
                        {selectedPayout.bankCode}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">{selectedPayout.bankName}</span>
                        <span className="text-secondary font-label-sm text-label-sm">Chi nhánh Gia Định, TP. Hồ Chí Minh</span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">lock</span> Napas247 Fast
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-space-md mt-space-sm pt-space-sm bg-surface-container-low p-space-sm rounded">
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Số tài khoản</span>
                      <span className="font-data-mono text-data-mono font-headline-md text-headline-md text-on-surface font-bold">
                        {selectedPayout.bankAccount}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Tên chủ tài khoản</span>
                      <span className="font-headline-sm text-headline-sm text-primary font-bold uppercase">
                        {selectedPayout.accountHolder}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-body-sm font-body-sm pt-space-xs text-secondary">
                    <span className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-tertiary text-[16px]">verified</span>
                      Khớp thông tin người đại diện GPKD
                    </span>
                    <span className="text-tertiary font-semibold">Phí giao dịch: 0 ₫</span>
                  </div>
                </div>
              </div>

              {/* Authorization Controls */}
              <div className="p-space-md bg-surface-container flex flex-col gap-space-md">
                <div className="flex items-start gap-space-sm p-space-sm rounded bg-surface-container-lowest border border-surface-container">
                  <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">security</span>
                  <div className="flex flex-col">
                    <span className="font-label-md text-label-md text-on-surface font-bold">Xác Thực Chuẩn Ngân Hàng PayOS API</span>
                    <p className="font-body-sm text-body-sm text-secondary">
                      Lệnh giải ngân sau khi duyệt sẽ thực hiện lệnh UNC tự động đến cổng chuyển mạch Napas247. Tiền về tài khoản gara trong 30 giây.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-space-sm">
                  <div className="flex items-center gap-space-sm">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[16px]">pin</span>
                      <input
                        className="w-full h-9 pl-8 pr-3 rounded bg-surface-container-lowest text-body-sm font-body-sm text-on-surface placeholder-secondary focus:outline-none focus:ring-1 focus:ring-primary border border-surface-container"
                        placeholder="Nhập mã PIN duyệt tài chính hoặc OTP"
                        type="password"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                      />
                    </div>
                    <button
                      onClick={() => onShowToast('Mã OTP Mới', 'Đã gửi mã OTP SMS 6 số về số điện thoại Admin.')}
                      className="h-9 px-space-md rounded bg-surface-container-lowest hover:bg-surface-container-high text-on-surface font-label-md text-label-md transition-colors cursor-pointer border border-surface-container"
                    >
                      Gửi lại OTP
                    </button>
                  </div>

                  <div className="flex items-center gap-space-sm pt-space-xs">
                    <button
                      onClick={handleDisburse}
                      disabled={isDisbursing}
                      className="flex-1 py-3 px-space-md rounded bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow-sm transition-all cursor-pointer font-bold disabled:opacity-75"
                    >
                      <span className={`material-symbols-outlined text-[20px] ${isDisbursing ? 'animate-spin' : ''}`}>
                        {isDisbursing ? 'refresh' : 'payments'}
                      </span>
                      <span>{isDisbursing ? 'Đang phát lệnh...' : 'Xác Nhận Giải Ngân Tức Thì PayOS'}</span>
                    </button>
                    <button
                      onClick={handleReject}
                      className="py-3 px-space-md rounded bg-surface-container-lowest hover:bg-error-container text-error hover:text-on-error-container font-headline-sm text-headline-sm flex items-center justify-center transition-colors cursor-pointer border border-surface-container"
                      title="Từ chối yêu cầu và yêu cầu bổ sung"
                    >
                      <span className="material-symbols-outlined text-[20px]">block</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
