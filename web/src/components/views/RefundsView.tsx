import React, { useState } from 'react';
import { DisputeCase } from '../../types';

interface RefundsViewProps {
  disputes: DisputeCase[];
  onShowToast: (title: string, msg: string) => void;
}

export const RefundsView: React.FC<RefundsViewProps> = ({ disputes, onShowToast }) => {
  const [selectedCaseId, setSelectedCaseId] = useState<string>(disputes[0]?.id || 'REF-9021');
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'rejected'>('pending');
  const [refundSource, setRefundSource] = useState<'garage_wallet' | 'platform_fund'>('garage_wallet');
  const [isRefunding, setIsRefunding] = useState<boolean>(false);

  const selectedCase = disputes.find((d) => d.id === selectedCaseId) || disputes[0];

  const handleExecuteRefund = () => {
    setIsRefunding(true);
    setTimeout(() => {
      setIsRefunding(false);
      onShowToast(
        'Hoàn Tiền PayOS Thành Công!',
        `Đã phát lệnh hoàn ${selectedCase.requestedRefund.toLocaleString('vi-VN')} ₫ qua Vietcombank cho ${selectedCase.customerName}. Nguồn tiền: ${
          refundSource === 'garage_wallet' ? 'Ví số dư Gara' : 'Quỹ Bảo Hiểm Dự Phòng'
        }.`
      );
    }, 1500);
  };

  const handleAskStaff = () => {
    onShowToast('Chuyển Yêu Cầu', `Đã gửi công văn yêu cầu điều phối viên hiện trường tái thẩm tra vụ việc ${selectedCase.id}.`);
  };

  const handleDismiss = () => {
    onShowToast('Bác Bỏ Khiếu Nại', `Đã bác bỏ khiếu nại ${selectedCase.id}. Hồ sơ lưu trữ theo quy chuẩn chứng từ.`);
  };

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Command Banner / Control Header */}
      <div className="w-full bg-surface-container-lowest shadow-sm rounded-xl p-space-lg mb-space-md border border-surface-container">
        <div className="flex flex-wrap items-center justify-between gap-space-md mb-space-sm">
          <div className="flex items-center gap-space-xs font-data-mono text-label-sm text-secondary uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px] text-tertiary">account_balance_wallet</span>
            <span>TÀI CHÍNH & KẾ TOÁN</span>
            <span>&gt;</span>
            <span className="text-primary font-bold">XỬ LÝ HOÀN TIỀN & KHIẾU NẠI</span>
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
              Thẩm Định & Xử Lý Hoàn Tiền Giao Dịch Cứu Hộ
            </h1>
            <p className="font-body-md text-body-md text-secondary mt-0.5">
              Cơ chế trọng tài tài chính độc lập: Xác minh kết luận giám sát hiện trường, cấn trừ ví gara hoặc kích hoạt quỹ bảo trợ khẩn cấp.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-space-md">
            <div className="flex items-center gap-space-md px-space-lg py-2.5 rounded-lg bg-surface-container-low shadow-sm">
              <div className="w-9 h-9 rounded-full bg-primary-fixed flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[20px]">pending_actions</span>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Đang chờ Admin duyệt</div>
                <div className="font-headline-md text-headline-md text-primary font-bold">
                  05 <span className="font-body-sm text-body-sm font-normal text-on-surface-variant">hồ sơ khiếu nại</span>
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
              <span className="px-1.5 py-0.2 rounded-full bg-primary-fixed text-primary font-data-mono text-label-sm">5</span>
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
              <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-secondary font-data-mono text-label-sm">142</span>
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
              <span className="px-1.5 py-0.2 rounded-full bg-surface-container-high text-secondary font-data-mono text-label-sm">28</span>
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
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Danh Sách Chờ Thẩm Định</span>
              <span className="font-label-sm text-label-sm px-2 py-0.5 rounded bg-error-container text-on-error-container uppercase font-bold">
                5 Khẩn Cấp
              </span>
            </div>
            <div className="flex items-center gap-space-xs font-label-md text-label-md text-secondary">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
              <span>Sắp xếp: Mức độ ưu tiên giảm dần</span>
            </div>
          </div>

          {/* Incident Item 1 (ACTIVE SELECTED CASE) */}
          <div
            onClick={() => setSelectedCaseId('REF-9021')}
            className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm cursor-pointer relative overflow-hidden transition-all border ${
              selectedCaseId === 'REF-9021'
                ? 'border-primary bg-gradient-to-r from-primary-fixed/30 to-surface-container-lowest'
                : 'border-surface-container hover:shadow-md'
            }`}
          >
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
            <div className="flex items-start justify-between gap-space-md mb-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="font-data-mono text-label-lg font-bold text-primary">#REF-9021</span>
                <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-error-container text-on-error-container flex items-center gap-1 font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                  L3 • THU VƯỢT KHUNG CHUẨN
                </span>
                <span className="font-data-mono text-body-sm text-secondary">14:28 - 28/10/2024</span>
              </div>
              <div className="flex items-center gap-1 font-label-sm text-label-sm bg-surface-container px-2 py-1 rounded text-on-surface font-semibold">
                <span className="material-symbols-outlined text-[14px] text-tertiary">verified</span>
                <span>Staff Hồ Sơ Đã Ký Duyệt</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mb-space-md bg-surface-container-low p-space-md rounded-lg">
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Khách hàng & Liên hệ</div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Lê Thị Mai Thảo</div>
                <div className="font-data-mono text-body-sm text-tertiary">0908 123 456 • Vietcombank</div>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Gara bị khiếu nại</div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Trung Tâm Cứu Hộ Nam Sài Gòn</div>
                <div className="font-body-sm text-body-sm text-secondary">Chi nhánh Quận 7 • Garage ID: #GAR-088</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-space-sm py-space-xs text-body-sm">
              <div className="flex items-center gap-space-xs font-data-mono">
                <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface">Mã cứu hộ: #RC-98419</span>
                <span className="px-2 py-0.5 rounded bg-surface-container text-secondary">PayOS: POS-8831085</span>
              </div>
              <div className="flex items-center gap-space-lg text-right">
                <div>
                  <span className="text-secondary text-body-sm">Đã thu qua VietQR: </span>
                  <span className="font-data-mono text-headline-sm font-semibold text-on-surface">340.000 ₫</span>
                </div>
                <div>
                  <span className="text-primary text-body-sm font-semibold">Đề xuất hoàn: </span>
                  <span className="font-data-mono text-headline-lg font-bold text-primary">150.000 ₫</span>
                </div>
              </div>
            </div>

            <div className="mt-space-md p-space-md rounded bg-surface-container text-body-md text-on-surface flex items-start gap-space-sm">
              <span className="material-symbols-outlined text-[18px] text-tertiary shrink-0 mt-0.5">assignment_turned_in</span>
              <div className="flex-1">
                <span className="font-label-md text-label-md uppercase text-tertiary block font-bold">
                  Ý kiến kết luận của Điều phối viên Staff (Trần Anh Tuấn - OP#04):
                </span>
                <p className="font-body-sm text-body-sm text-on-surface-variant italic mt-0.5">
                  "Gara tự ý thu thêm 150k tiền súc bình xăng con ngoài bảng giá, đã lập biên bản xác nhận vi phạm qua điện thoại với chủ gara. Đề xuất cấn trừ ví gara hoàn trả phần chênh lệch cho khách."
                </p>
              </div>
            </div>
          </div>

          {/* Incident Item 2 */}
          <div
            onClick={() => setSelectedCaseId('REF-9018')}
            className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all cursor-pointer border ${
              selectedCaseId === 'REF-9018' ? 'border-primary' : 'border-surface-container'
            }`}
          >
            <div className="flex items-start justify-between gap-space-md mb-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="font-data-mono text-label-lg font-bold text-on-surface">#REF-9018</span>
                <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-surface-container-high text-secondary font-semibold">
                  L2 • HỦY DỊCH VỤ SAU KHI TRẢ TIỀN
                </span>
                <span className="font-data-mono text-body-sm text-secondary">13:10 - 28/10/2024</span>
              </div>
              <span className="font-data-mono text-label-sm text-secondary">Chờ Admin quyết định</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mb-space-sm">
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Khách hàng</div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Nguyễn Văn Bình (0912 888 777)</div>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Gara liên quan</div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Xưởng Cứu Hộ Ngập Lụt Phú Nhuận</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <div className="font-data-mono text-body-sm text-secondary">Đơn #RC-98390 • POS-8829911</div>
              <div className="text-right">
                <span className="text-secondary">Đề xuất hoàn toàn phần: </span>
                <span className="font-data-mono text-headline-sm font-bold text-primary">340.000 ₫</span>
              </div>
            </div>
          </div>

          {/* Incident Item 3 */}
          <div
            onClick={() => setSelectedCaseId('REF-9015')}
            className={`bg-surface-container-lowest rounded-xl p-space-lg shadow-sm hover:shadow-md transition-all cursor-pointer border ${
              selectedCaseId === 'REF-9015' ? 'border-primary' : 'border-surface-container'
            }`}
          >
            <div className="flex items-start justify-between gap-space-md mb-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="font-data-mono text-label-lg font-bold text-on-surface">#REF-9015</span>
                <span className="px-2 py-0.5 rounded font-label-sm text-label-sm bg-surface-container-high text-secondary font-semibold">
                  L1 • KÉO XE LÀM TRẦY XƯỚC VỎ XE
                </span>
                <span className="font-data-mono text-body-sm text-secondary">11:45 - 28/10/2024</span>
              </div>
              <span className="font-data-mono text-label-sm text-secondary">Chờ Admin quyết định</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md mb-space-sm">
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Khách hàng</div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Đỗ Hoàng Yến (0977 456 123)</div>
              </div>
              <div>
                <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Gara liên quan</div>
                <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Cứu Hộ Phước Long B - Thủ Đức</div>
              </div>
            </div>
            <div className="flex items-center justify-between text-body-sm">
              <div className="font-data-mono text-body-sm text-secondary">Đơn #RC-98312 • POS-8827552</div>
              <div className="text-right">
                <span className="text-secondary">Bồi thường thiệt hại: </span>
                <span className="font-data-mono text-headline-sm font-bold text-primary">200.000 ₫</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Arbitration Desk & PayOS Reversal Workspace */}
        <div className="xl:col-span-5 flex flex-col gap-space-md">
          <div className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm border border-surface-container">
            {/* Header */}
            <div className="flex items-center justify-between pb-space-md mb-space-md border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <div className="w-7 h-7 rounded bg-primary text-on-primary flex items-center justify-center font-data-mono font-bold text-label-sm">
                  AD
                </div>
                <div>
                  <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Bảng Thẩm Định Trọng Tài</div>
                  <div className="font-data-mono text-label-sm text-secondary">HỒ SƠ: #{selectedCase.id} • LEVEL: ADMIN FIN</div>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-error"></span>
                YÊU CẦU HOÀN TIỀN
              </span>
            </div>

            {/* 1. Evidence Verification */}
            <div className="mb-space-lg">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold">
                  1. Đối Chiếu Bằng Chứng Hiện Trường & Hóa Đơn
                </span>
                <span className="font-data-mono text-label-sm text-tertiary">2 File Đính Kèm</span>
              </div>
              <div className="grid grid-cols-2 gap-space-sm">
                <div className="rounded-lg overflow-hidden bg-surface-container-low shadow-sm">
                  <div className="relative h-40">
                    <img
                      className="w-full h-full object-cover"
                      alt="Receipt"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuACihKrDMKX83Ir9orec02g9MN6J6MAvtmaatHawTqArAsY73X77zvDSZhEgEoSO2-8G9l1iwD5O9KN3XUU1AcWpTZsiOzmSuegbh8LhwjT6n5mGyKozfoXHa1AVEweSlEhTyq9TTHGIlQHIiBs-3IFy1B61ej_4TWhjr89ukjAbA-SEYJGOSkuOoAj9jlOAMg8VjVRbZMMwuiy4ZwM9sWhnJeyXxHbSGM4fOBq4D9Aa95CZ-Hj4stT"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-inverse-surface/85 backdrop-blur-sm p-1.5 flex items-center justify-between text-inverse-on-surface font-data-mono text-label-sm">
                      <span>HĐ VIẾT TAY CỦA THỢ</span>
                      <span className="text-error font-bold">+150.000₫</span>
                    </div>
                  </div>
                  <div className="p-2 text-body-sm text-secondary">
                    Hóa đơn viết tay ghi mục: "Súc BX con + công ép nổ: 150k"
                  </div>
                </div>

                <div className="rounded-lg overflow-hidden bg-surface-container-low shadow-sm">
                  <div className="relative h-40">
                    <img
                      className="w-full h-full object-cover"
                      alt="Tariff"
                      src="https://lh3.googleusercontent.com/aida-public/AB6AXuAJI8kvNensEcXFs7ABZgM5rnNT3fpZDgfwiDd52AezUpAAUa9Z1tb_f3ERkdY0Z_E5aq9OqmMkDSbeSHbhqQ6y983YFihLK9-VlSBM0YdxHlEfy3mARq6ZV1cNwg8lqRwPuw5-tAPTM4_ru4C-kLM1jxFsCcPqO6gMg2Re7OrvADB0bBrijnojyEZKLxdmByxVNIy90uEDTzqpX7XvapvFUjNfnrKAisXxDrh2M3K5Jp5FmvTzUPp6"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-inverse-surface/85 backdrop-blur-sm p-1.5 flex items-center justify-between text-inverse-on-surface font-data-mono text-label-sm">
                      <span>BẢNG GIÁ NIÊM YẾT</span>
                      <span className="text-tertiary-fixed font-bold">TRỌN GÓI 190.000₫</span>
                    </div>
                  </div>
                  <div className="p-2 text-body-sm text-secondary">
                    Quy chuẩn hệ thống: Gói sơ cứu ngập nước đã bao gồm xả xăng/vệ sinh bugi.
                  </div>
                </div>
              </div>

              <div className="mt-space-sm p-space-sm rounded bg-error-container text-on-error-container flex items-center gap-space-xs font-body-sm">
                <span className="material-symbols-outlined text-[16px] shrink-0 text-error">warning</span>
                <span>Phát hiện chênh lệch: <strong>+150.000 ₫</strong> không thuộc danh mục phụ tùng được duyệt bổ sung.</span>
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
                      Tự động khấu trừ 150.000 ₫ từ số dư ký quỹ / doanh thu đang chờ payout của Gara Nam Sài Gòn.
                    </p>
                    <div className="mt-2 flex items-center gap-space-md font-data-mono text-label-sm text-on-surface-variant">
                      <span>Ví khả dụng: <strong className="text-tertiary">4.820.000 ₫</strong></span>
                      <span>•</span>
                      <span>Sau hoàn: <strong>4.670.000 ₫</strong></span>
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
                      Chỉ áp dụng trong tình huống bất khả kháng, thiên tai cực đoan hoặc gara phá sản ngừng hợp tác.
                    </p>
                    <div className="mt-2 font-data-mono text-label-sm text-secondary">
                      Số dư quỹ: <strong>95.000.000 ₫</strong>
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* 3. Reversal Channel */}
            <div className="mb-space-lg p-space-md rounded-lg bg-surface-container-low border border-surface-container">
              <span className="font-label-sm text-label-sm text-secondary uppercase tracking-wider font-bold block mb-space-xs">
                3. Kênh Hoàn Trả Khách Hàng (PayOS Webhook Reversal)
              </span>
              <div className="flex items-center justify-between text-body-sm text-on-surface">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">account_balance</span>
                  <span className="font-medium">Tài khoản VietQR gốc:</span>
                </div>
                <span className="font-data-mono font-bold text-on-surface">VCB • ***7894 ({selectedCase.customerName})</span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-on-surface mt-1">
                <div className="flex items-center gap-space-xs">
                  <span className="material-symbols-outlined text-tertiary text-[18px]">qr_code_scanner</span>
                  <span className="font-medium">Mã giao dịch PayOS gốc:</span>
                </div>
                <span className="font-data-mono text-secondary">{selectedCase.payosCode}</span>
              </div>
              <div className="mt-space-sm pt-space-xs flex items-center justify-between text-label-sm text-secondary font-data-mono border-t border-surface-container">
                <span>PHƯƠNG THỨC: INSTANT REVERSAL</span>
                <span className="text-tertiary font-bold">PHÍ CỔNG: 0 ₫ (PAYOS PARTNER)</span>
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
                  {(selectedCase.originalPrice - selectedCase.requestedRefund).toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex items-center justify-between pt-space-xs text-headline-sm border-t border-surface-container-high">
                <span className="font-bold text-on-surface">Số tiền thực hoàn trả khách:</span>
                <span className="font-data-mono text-headline-lg font-bold text-primary">
                  {selectedCase.requestedRefund.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-space-xs">
              <button
                onClick={handleExecuteRefund}
                disabled={isRefunding}
                className="w-full py-3 px-space-lg rounded bg-primary text-on-primary hover:bg-primary-container transition-all font-headline-sm text-headline-sm flex items-center justify-center gap-space-sm shadow-sm active:scale-[0.99] cursor-pointer font-bold disabled:opacity-75"
              >
                <span className={`material-symbols-outlined text-[20px] ${isRefunding ? 'animate-spin' : ''}`}>
                  {isRefunding ? 'sync' : 'send_money'}
                </span>
                <span>
                  {isRefunding
                    ? 'Đang phát lệnh PayOS Reversal API...'
                    : `Xác Nhận Hoàn Tiền ${selectedCase.requestedRefund.toLocaleString('vi-VN')} ₫ Qua PayOS`}
                </span>
              </button>

              <div className="grid grid-cols-2 gap-space-xs mt-1">
                <button
                  onClick={handleAskStaff}
                  className="py-2 px-space-sm rounded bg-surface-container-low hover:bg-surface-container-high text-on-surface transition-colors font-label-md text-label-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">sync_problem</span>
                  <span>Yêu cầu Staff xác minh lại</span>
                </button>
                <button
                  onClick={handleDismiss}
                  className="py-2 px-space-sm rounded bg-surface-container-low hover:bg-error-container text-on-error-container transition-colors font-label-md text-label-md flex items-center justify-center gap-1 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px] text-error">close</span>
                  <span>Bác Bỏ Khiếu Nại</span>
                </button>
              </div>
            </div>

            <div className="mt-space-md text-center">
              <span className="font-data-mono text-label-sm text-secondary">
                Hành động sẽ được ghi nhận vào Audit Log hệ thống với ID Admin: #ADM-TRIMINH
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
