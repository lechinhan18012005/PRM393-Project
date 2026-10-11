import React, { useState } from 'react';

interface CommissionSettingsViewProps {
  onShowToast: (title: string, msg: string) => void;
}

export const CommissionSettingsView: React.FC<CommissionSettingsViewProps> = ({ onShowToast }) => {
  const [globalRate, setGlobalRate] = useState<number>(12.5);
  const [rateSingle, setRateSingle] = useState<number>(12.5);
  const [rateBatch, setRateBatch] = useState<number>(10.0);
  const [rateRepair, setRateRepair] = useState<number>(15.0);
  const [rateSurge, setRateSurge] = useState<number>(8.0);

  const [subsidyRate, setSubsidyRate] = useState<number>(15);
  const [baseFee, setBaseFee] = useState<string>('25.000');
  const [perKmFee, setPerKmFee] = useState<string>('10.000');

  // Simulation calculator
  const [simOrderAmount, setSimOrderAmount] = useState<number>(350000);

  // Math for simulation
  const subsidyAmount = Math.round((simOrderAmount * subsidyRate) / 100);
  const customerPays = simOrderAmount - subsidyAmount;
  const platformFee = Math.round((simOrderAmount * globalRate) / 100);
  const garageFinal = simOrderAmount - platformFee;
  const garagePercent = (100 - globalRate).toFixed(1);

  const handleGlobalRateChange = (val: number) => {
    setGlobalRate(val);
    setRateSingle(val);
  };

  const handleSave = () => {
    onShowToast(
      'Lưu Cấu Hình Thành Công!',
      `Tỷ lệ hoa hồng ${globalRate}% và mức trợ cấp ${subsidyRate}% đã được đồng bộ hóa tới toàn bộ 48 Gara và trạm điều phối.`
    );
  };

  const handleReset = () => {
    setGlobalRate(12.5);
    setRateSingle(12.5);
    setRateBatch(10.0);
    setRateRepair(15.0);
    setRateSurge(8.0);
    setSubsidyRate(15);
    setBaseFee('25.000');
    setPerKmFee('10.000');
    setSimOrderAmount(350000);
    onShowToast('Đã Khôi Phục', 'Toàn bộ tham số đã được đặt về giá trị mặc định của SLA Engine.');
  };

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Command Header */}
      <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col xl:flex-row xl:items-center xl:justify-between gap-space-md border border-surface-container">
        <div className="flex flex-col space-y-space-xs">
          <div className="flex items-center gap-space-xs text-secondary font-label-sm text-label-sm tracking-wider uppercase">
            <span>TÀI CHÍNH & KẾ TOÁN</span>
            <span className="material-symbols-outlined text-[12px]">chevron_right</span>
            <span className="text-primary font-bold">THIẾT LẬP HOA HỒNG & PHÍ SÀN</span>
          </div>
          <div className="flex flex-wrap items-center gap-space-sm pt-0.5">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Cấu Hình Tỷ Lệ Chiết Khấu, Phí Dịch Vụ & Trợ Cấp Cứu Hộ
            </h1>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container-low text-tertiary font-data-mono text-data-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
              <span>Phiên bản áp dụng: v2.4 (Kích hoạt từ 01/10/2024)</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm uppercase font-semibold">
              SLA Engine 08-REV
            </span>
          </div>
        </div>

        {/* Action Bar */}
        <div className="flex items-center gap-space-sm self-start xl:self-auto">
          <button
            onClick={handleReset}
            className="px-space-md py-2 rounded bg-surface-container text-on-surface hover:bg-surface-container-high font-label-lg text-label-lg transition-colors flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
            Khôi phục mặc định
          </button>
          <button
            onClick={handleSave}
            className="px-space-lg py-2 rounded bg-primary text-on-primary hover:bg-primary-container font-headline-sm text-headline-sm transition-all flex items-center gap-2 shadow-sm active:scale-95 cursor-pointer font-bold"
          >
            <span className="material-symbols-outlined text-[18px]">verified_user</span>
            Lưu & Kích Hoạt Cấu Hình
          </button>
        </div>
      </div>

      {/* Grid: 7 Cols Left + 5 Cols Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* LEFT COLUMN: CONFIGURATION ENGINE (7 COLS) */}
        <div className="lg:col-span-7 flex flex-col space-y-space-md">
          {/* SECTION 1: PLATFORM COMMISSION RATE */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-md border border-surface-container">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Tỷ Lệ Hoa Hồng Nền Tảng (Platform Commission Rate)
                </h2>
              </div>
              <span className="font-data-mono text-data-mono text-secondary">MOD_CODE: COM-PLT-2024</span>
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Khấu trừ trực tiếp trên ví Escrow của đơn vị Gara cứu hộ sau khi dịch vụ hoàn tất. Đã bảo hộ rủi ro bão lũ đô thị và hạ tầng GPS trực tuyến.
            </p>

            {/* Master Global Commission Slider */}
            <div className="bg-surface-container-low p-space-md rounded flex flex-col space-y-space-xs">
              <div className="flex justify-between items-center">
                <label className="font-label-lg text-label-lg text-on-surface flex items-center gap-1.5 font-semibold">
                  <span>Mức trích sàn chuẩn trung bình</span>
                  <span className="material-symbols-outlined text-secondary text-[14px]">info</span>
                </label>
                <div className="flex items-center gap-1 bg-surface-container-lowest px-2 py-1 rounded shadow-sm">
                  <span className="font-data-mono text-headline-sm text-primary font-bold">{globalRate.toFixed(1)}</span>
                  <span className="font-data-mono text-data-mono text-secondary">%</span>
                </div>
              </div>
              <input
                className="w-full accent-primary h-1.5 bg-surface-variant rounded-lg cursor-pointer"
                max="25"
                min="5"
                step="0.5"
                type="range"
                value={globalRate}
                onChange={(e) => handleGlobalRateChange(parseFloat(e.target.value))}
              />
              <div className="flex justify-between text-secondary font-data-mono text-label-sm">
                <span>5.0% (Trợ giá tối đa)</span>
                <span>15.0% (Định chuẩn)</span>
                <span>25.0% (Trần kiểm soát)</span>
              </div>
            </div>

            {/* Breakdown by Sub-services */}
            <div className="flex flex-col space-y-space-sm pt-1">
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
                Phân Bổ Theo Danh Mục Tác Nghiệp Khẩn Cấp
              </span>

              {/* Item 1 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-sm rounded bg-surface-container hover:bg-surface-container-high transition-colors gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">two_wheeler</span>
                  </div>
                  <div>
                    <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Cứu hộ kéo xe máy ngập đơn lẻ</div>
                    <div className="font-body-sm text-body-sm text-secondary">Đơn kéo cứu hộ 1:1, điều xe kích nổ trực tiếp</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="relative w-24">
                    <input
                      className="w-full h-8 pl-3 pr-7 bg-surface-container-lowest text-on-surface font-data-mono text-data-mono rounded text-right focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border-0 font-bold"
                      step="0.5"
                      type="number"
                      value={rateSingle}
                      onChange={(e) => setRateSingle(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary font-data-mono text-data-mono">%</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-tertiary" title="Cân bằng động"></span>
                </div>
              </div>

              {/* Item 2 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-sm rounded bg-surface-container hover:bg-surface-container-high transition-colors gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center text-tertiary shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">local_shipping</span>
                  </div>
                  <div>
                    <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Xe tải / Ba gác chở vượt ngập ghép đoàn</div>
                    <div className="font-body-sm text-body-sm text-secondary">Vận chuyển gom nhiều xe từ vùng ngập sâu về Gara</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="relative w-24">
                    <input
                      className="w-full h-8 pl-3 pr-7 bg-surface-container-lowest text-on-surface font-data-mono text-data-mono rounded text-right focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border-0 font-bold"
                      step="0.5"
                      type="number"
                      value={rateBatch}
                      onChange={(e) => setRateBatch(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary font-data-mono text-data-mono">%</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-tertiary" title="Ưu đãi gom đơn"></span>
                </div>
              </div>

              {/* Item 3 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-sm rounded bg-surface-container hover:bg-surface-container-high transition-colors gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center text-secondary shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">build</span>
                  </div>
                  <div>
                    <div className="font-headline-sm text-headline-sm text-on-surface font-semibold">Sửa chữa, hút nước & thay nhớt tại Gara</div>
                    <div className="font-body-sm text-body-sm text-secondary">Súc rửa khoang máy, lọc gió, xử lý thủy kích cố định</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="relative w-24">
                    <input
                      className="w-full h-8 pl-3 pr-7 bg-surface-container-lowest text-on-surface font-data-mono text-data-mono rounded text-right focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border-0 font-bold"
                      step="0.5"
                      type="number"
                      value={rateRepair}
                      onChange={(e) => setRateRepair(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary font-data-mono text-data-mono">%</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-secondary" title="Dịch vụ xưởng"></span>
                </div>
              </div>

              {/* Item 4 */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-space-sm rounded bg-error-container text-on-error-container transition-colors gap-space-xs">
                <div className="flex items-center gap-space-sm">
                  <div className="w-8 h-8 rounded bg-surface-container-lowest flex items-center justify-center text-error shadow-sm">
                    <span className="material-symbols-outlined text-[18px] animate-pulse">thunderstorm</span>
                  </div>
                  <div>
                    <div className="font-headline-sm text-headline-sm text-on-error-container flex items-center gap-1.5 font-bold">
                      <span>Cứu hộ khẩn đêm / Triều cường đỉnh (Surge Hours)</span>
                      <span className="px-1.5 py-0.2 rounded bg-error text-on-error font-label-sm text-label-sm uppercase font-bold">Ưu đãi kích cầu</span>
                    </div>
                    <div className="font-body-sm text-body-sm text-on-error-container opacity-90">
                      Giảm phí thu sàn để khuyến khích Gara và thợ sẵn sàng tác chiến ngập đêm
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <div className="relative w-24">
                    <input
                      className="w-full h-8 pl-3 pr-7 bg-surface-container-lowest text-on-surface font-data-mono text-data-mono font-bold rounded text-right focus:outline-none focus:ring-1 focus:ring-error shadow-sm border-0"
                      step="0.5"
                      type="number"
                      value={rateSurge}
                      onChange={(e) => setRateSurge(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary font-data-mono text-data-mono">%</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-error" title="Cơ chế khẩn cấp"></span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: BATCH TRANSPORT DISCOUNT & SUBSIDY */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-md border border-surface-container">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Chia Sẻ Chi Phí Vượt Ngập Ghép & Trợ Cấp Bão Lũ
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container text-tertiary font-label-sm text-label-sm uppercase font-bold">
                Thuật toán Dynamic Dispatch
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
              {/* Dynamic Formula Explainer */}
              <div className="bg-surface-container-low p-space-md rounded flex flex-col justify-between space-y-space-sm">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
                  Cơ Chế Định Giá Cước Động
                </span>
                <div className="p-2.5 bg-surface-container-lowest rounded shadow-sm font-data-mono text-data-mono text-on-surface flex flex-col gap-1">
                  <div className="text-tertiary font-bold">FARE = BASE_FEE + (DIST_KM * RATE_KM) * K_FLOOD</div>
                  <div className="text-secondary text-[11px]">// K_FLOOD: Hệ số ngập sâu theo vệ tinh / Cảm biến mực nước</div>
                </div>
                <div className="flex items-center justify-between text-body-sm text-secondary">
                  <span>Trạng thái định tuyến:</span>
                  <span className="text-tertiary font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping"></span> Real-time Connected
                  </span>
                </div>
              </div>

              {/* Subsidy Box */}
              <div className="bg-surface-container-low p-space-md rounded flex flex-col justify-between space-y-space-sm">
                <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <span className="font-label-lg text-label-lg text-on-surface font-bold">Trợ Cấp Nền Tảng (Platform Subsidy)</span>
                    <span className="font-body-sm text-body-sm text-secondary">Trích từ Quỹ Ứng Phó Thiên Tai Đô Thị</span>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[20px]">volunteer_activism</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-body-md text-body-md text-on-surface-variant font-medium">Tỷ lệ trợ cấp trực tiếp:</span>
                  <div className="relative w-28">
                    <input
                      className="w-full h-8 pl-3 pr-7 bg-surface-container-lowest text-on-surface font-data-mono text-headline-sm font-bold rounded text-right focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border-0"
                      step="1"
                      type="number"
                      value={subsidyRate}
                      onChange={(e) => setSubsidyRate(parseFloat(e.target.value) || 0)}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-secondary font-data-mono text-data-mono">%</span>
                  </div>
                </div>
                <div className="font-body-sm text-body-sm text-secondary">
                  Giảm trực tiếp vào hoá đơn cho cư dân tại tâm điểm ngập úng.
                </div>
              </div>
            </div>

            {/* Tiered Batch Discount Scale */}
            <div className="flex flex-col space-y-space-xs pt-1">
              <div className="flex items-center justify-between">
                <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
                  Hạn Mức Giảm Giá Ghép Đội Xe (Batch Tier Discounts)
                </span>
                <span className="font-label-sm text-label-sm text-secondary">Áp dụng cho xe thùng & xà lan cứu hộ</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm">
                <div className="bg-surface-container p-space-sm rounded flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-label-md text-label-md text-secondary font-semibold">Ghép 2 - 3 xe</span>
                    <span className="material-symbols-outlined text-tertiary text-[16px]">groups</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-data-mono text-headline-md text-tertiary font-bold">20.0</span>
                    <span className="font-data-mono text-data-mono text-secondary">%</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-secondary">Giảm tổng cước kéo</span>
                </div>

                <div className="bg-surface-container p-space-sm rounded flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-label-md text-label-md text-secondary font-semibold">Ghép 4 - 6 xe</span>
                    <span className="material-symbols-outlined text-primary text-[16px]">group_add</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-data-mono text-headline-md text-primary font-bold">35.0</span>
                    <span className="font-data-mono text-data-mono text-secondary">%</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-secondary">Tiết kiệm chi phí đoàn</span>
                </div>

                <div className="bg-surface-container p-space-sm rounded flex flex-col space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-label-md text-label-md text-secondary font-semibold">Từ 7 xe trở lên</span>
                    <span className="material-symbols-outlined text-primary-container text-[16px]">hub</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="font-data-mono text-headline-md text-primary font-bold">50.0</span>
                    <span className="font-data-mono text-data-mono text-secondary">%</span>
                  </div>
                  <span className="font-body-sm text-body-sm text-secondary">Tối ưu chuyến chuyên dụng</span>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: BASE FEE & FLOOD MULTIPLIER K */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-md border border-surface-container">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Cấu Hình Phí Khởi Tạo & Hệ Số Ngập Sâu (K)
                </h2>
              </div>
              <span className="font-data-mono text-data-mono text-secondary">DISPATCH_STD_GEO</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-md">
              <div className="p-space-md rounded bg-surface-container-low flex flex-col space-y-space-xs">
                <label className="font-label-lg text-label-lg text-on-surface font-semibold">
                  Phí khởi tạo cơ sở (Bán kính &lt; 3km)
                </label>
                <div className="relative">
                  <input
                    className="w-full h-9 pl-3 pr-8 bg-surface-container-lowest font-data-mono text-headline-sm font-bold text-on-surface rounded focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border-0"
                    type="text"
                    value={baseFee}
                    onChange={(e) => setBaseFee(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-data-mono text-data-mono text-secondary font-bold">₫</span>
                </div>
                <span className="font-body-sm text-body-sm text-secondary">Chi phí xuất bến tối thiểu cho kỹ thuật viên</span>
              </div>

              <div className="p-space-md rounded bg-surface-container-low flex flex-col space-y-space-xs">
                <label className="font-label-lg text-label-lg text-on-surface font-semibold">
                  Đơn giá cự ly tiếp theo (Từ km thứ 3+)
                </label>
                <div className="relative">
                  <input
                    className="w-full h-9 pl-3 pr-14 bg-surface-container-lowest font-data-mono text-headline-sm font-bold text-on-surface rounded focus:outline-none focus:ring-1 focus:ring-primary shadow-sm border-0"
                    type="text"
                    value={perKmFee}
                    onChange={(e) => setPerKmFee(e.target.value)}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 font-data-mono text-data-mono text-secondary font-bold">₫/km</span>
                </div>
                <span className="font-body-sm text-body-sm text-secondary">Cập nhật theo bản đồ đo lường giao thông ngập úng</span>
              </div>
            </div>

            {/* Flood Level Coefficients K */}
            <div className="flex flex-col space-y-space-sm pt-1">
              <span className="font-label-sm text-label-sm text-secondary uppercase font-bold tracking-wider">
                Hệ Số Ngập K (Áp dụng nhân hệ số rủi ro nước ngập)
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm">
                <div className="p-space-sm rounded bg-surface-container flex flex-col justify-between space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-label-sm text-label-sm uppercase font-bold">
                      Mức 1: Nửa bánh
                    </span>
                    <span className="font-data-mono text-headline-sm text-on-surface font-bold">1.2x</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary">Ngập &lt; 25cm. Xe còn khả năng dắt nhẹ, không tràn pô.</p>
                  <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                    <div className="bg-secondary h-full w-[40%]"></div>
                  </div>
                </div>

                <div className="p-space-sm rounded bg-surface-container flex flex-col justify-between space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm uppercase font-bold">
                      Mức 2: Lút yên xe
                    </span>
                    <span className="font-data-mono text-headline-sm text-primary font-bold">1.5x</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary">Ngập 25cm - 60cm. Cần xe cẩu/xe sàn cao, tháo bình ắc quy.</p>
                  <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                    <div className="bg-primary h-full w-[70%]"></div>
                  </div>
                </div>

                <div className="p-space-sm rounded bg-surface-container flex flex-col justify-between space-y-space-xs">
                  <div className="flex items-center justify-between">
                    <span className="px-1.5 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm uppercase font-bold">
                      Mức 3: Nước xiết
                    </span>
                    <span className="font-data-mono text-headline-sm text-error font-bold">2.0x</span>
                  </div>
                  <p className="font-body-sm text-body-sm text-secondary">Ngập sâu &gt; 60cm, dòng chảy mạnh. Yêu cầu thắt đai an toàn.</p>
                  <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                    <div className="bg-error h-full w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIMULATION CALCULATOR & AUDIT TRAIL (5 COLS) */}
        <div className="lg:col-span-5 flex flex-col space-y-space-md">
          {/* SIMULATOR */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-md border border-surface-container">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-primary text-[20px]">calculate</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Mô Phỏng Tác Động Đơn Hàng</h2>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container-low text-secondary font-label-sm text-label-sm font-bold uppercase">
                LIVE SIMULATOR
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary">
              Kiểm tra trực quan dòng tiền và chia tách lợi nhuận trước khi công bố cấu hình vào hệ thống điều phối toàn thành phố.
            </p>

            {/* Slider */}
            <div className="bg-surface-container-low p-space-md rounded flex flex-col space-y-space-xs">
              <div className="flex justify-between items-center">
                <span className="font-label-md text-label-md text-secondary uppercase font-semibold">Đơn Cứu Hộ Lút Yên Xe Điển Hình</span>
                <span className="font-data-mono text-headline-md text-on-surface font-bold">
                  {simOrderAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <input
                className="w-full accent-primary h-1.5 bg-surface-variant rounded-lg cursor-pointer"
                max="1500000"
                min="100000"
                step="25000"
                type="range"
                value={simOrderAmount}
                onChange={(e) => setSimOrderAmount(parseFloat(e.target.value))}
              />
              <div className="flex justify-between text-secondary font-data-mono text-label-sm">
                <span>100.000 ₫</span>
                <span>750.000 ₫</span>
                <span>1.500.000 ₫</span>
              </div>
            </div>

            {/* Split Visualization Bar */}
            <div className="flex flex-col space-y-space-xs">
              <div className="flex justify-between font-label-sm text-label-sm text-secondary uppercase font-semibold">
                <span>Cơ Cấu Tách Dòng Tiền (Split Ledger)</span>
                <span className="font-data-mono">{garagePercent}% Gara / {globalRate.toFixed(1)}% Sàn</span>
              </div>
              <div className="w-full h-3 rounded overflow-hidden flex bg-surface-container">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${garagePercent}%` }}
                  title="Thực nhận Gara"
                ></div>
                <div
                  className="h-full bg-secondary transition-all duration-300"
                  style={{ width: `${globalRate}%` }}
                  title="Phí Sàn Thu"
                ></div>
              </div>
            </div>

            {/* Ledger Rows */}
            <div className="bg-surface-container p-space-md rounded flex flex-col space-y-space-xs">
              <div className="flex justify-between items-center py-1">
                <span className="font-body-md text-body-md text-secondary">Giá cước đơn hàng gốc</span>
                <span className="font-data-mono text-data-mono text-on-surface font-semibold">
                  {simOrderAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-body-md text-body-md text-error flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">remove_circle_outline</span>
                  <span>Trợ cấp sàn hỗ trợ người dân (-{subsidyRate}%)</span>
                </span>
                <span className="font-data-mono text-data-mono text-error font-semibold">
                  -{subsidyAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-headline-sm text-headline-sm text-on-surface font-bold">Khách trả thực tế (Customer Pays)</span>
                <span className="font-data-mono text-headline-sm text-tertiary font-bold">
                  {customerPays.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              <div className="h-px bg-surface-container-highest my-1"></div>

              <div className="flex justify-between items-center py-1">
                <span className="font-body-md text-body-md text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">percent</span>
                  <span>Phí dịch vụ sàn khấu trừ</span>
                </span>
                <span className="font-data-mono text-data-mono text-primary font-bold">
                  {platformFee.toLocaleString('vi-VN')} ₫
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="font-body-md text-body-md text-secondary flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px]">price_check</span>
                  <span>Sàn bù hoàn lại tiền trợ cấp cho Gara</span>
                </span>
                <span className="font-data-mono text-data-mono text-on-surface font-semibold">
                  +{subsidyAmount.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              <div className="p-space-sm rounded bg-surface-container-lowest shadow-sm flex justify-between items-center mt-2 border border-surface-container">
                <div>
                  <span className="font-headline-sm text-headline-sm text-primary font-bold block">GARA THỰC NHẬN VỀ VÍ</span>
                  <span className="font-body-sm text-body-sm text-secondary">Đã đối soát cấn trừ tự động</span>
                </div>
                <span className="font-data-mono text-headline-lg text-primary font-bold">
                  {garageFinal.toLocaleString('vi-VN')} ₫
                </span>
              </div>
            </div>

            {/* Highlight Cards */}
            <div className="grid grid-cols-2 gap-space-sm pt-1">
              <div className="bg-surface-container-low p-space-sm rounded">
                <span className="font-label-sm text-label-sm text-secondary uppercase block font-semibold">Tỷ suất bảo toàn Gara</span>
                <span className="font-data-mono text-headline-sm text-on-surface font-bold">94.2%</span>
                <span className="font-body-sm text-body-sm text-secondary block mt-0.5">Sức chịu tải tài chính cao</span>
              </div>
              <div className="bg-surface-container-low p-space-sm rounded">
                <span className="font-label-sm text-label-sm text-secondary uppercase block font-semibold">Thời gian quyết toán</span>
                <span className="font-data-mono text-headline-sm text-tertiary font-bold">T + 0</span>
                <span className="font-body-sm text-body-sm text-secondary block mt-0.5">Tích hợp cổng PayOS</span>
              </div>
            </div>
          </div>

          {/* AUDIT TRAIL HISTORY */}
          <div className="bg-surface-container-lowest p-space-lg rounded shadow-sm flex flex-col space-y-space-md border border-surface-container">
            <div className="flex items-center justify-between pb-space-xs border-b border-surface-container">
              <div className="flex items-center gap-space-xs">
                <span className="material-symbols-outlined text-secondary text-[20px]">history_edu</span>
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">
                  Nhật Ký Lịch Sử Thay Đổi (Audit Trail)
                </h2>
              </div>
              <span className="font-data-mono text-data-mono text-secondary">4 BẢN GHI GẦN NHẤT</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low font-label-md text-label-md text-secondary uppercase">
                    <th className="py-2 px-space-sm">Thời gian</th>
                    <th className="py-2 px-space-sm">Người thực hiện</th>
                    <th className="py-2 px-space-sm">Nội dung thay đổi</th>
                    <th className="py-2 px-space-sm">Lý do duyệt</th>
                    <th className="py-2 px-space-sm text-right">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-container font-body-sm text-body-sm">
                  <tr className="hover:bg-surface-container transition-colors">
                    <td className="py-2.5 px-space-sm font-data-mono text-[11px] text-secondary">
                      01/10/24<br />08:30:15
                    </td>
                    <td className="py-2.5 px-space-sm font-label-lg text-label-lg text-on-surface whitespace-nowrap">
                      Trần Minh Trí
                      <span className="block font-label-sm text-label-sm text-primary font-bold">ADMIN CẤP CAO</span>
                    </td>
                    <td className="py-2.5 px-space-sm">
                      <div className="font-semibold text-on-surface">Phí Vượt Ngập ghép 12% → 10%</div>
                      <div className="text-secondary text-[11px]">Kích hoạt trợ cấp bão số 4</div>
                    </td>
                    <td className="py-2.5 px-space-sm text-secondary">
                      Công điện khẩn ngập úng quận 7 & Nhà Bè
                    </td>
                    <td className="py-2.5 px-space-sm text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm uppercase font-bold">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary"></span> Đang hiệu lực
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container transition-colors">
                    <td className="py-2.5 px-space-sm font-data-mono text-[11px] text-secondary">
                      15/09/24<br />14:12:00
                    </td>
                    <td className="py-2.5 px-space-sm font-label-lg text-label-lg text-on-surface whitespace-nowrap">
                      Lê Hoàng Nam
                      <span className="block font-label-sm text-label-sm text-secondary">STAFF KIỂM SOÁT</span>
                    </td>
                    <td className="py-2.5 px-space-sm">
                      <div className="font-semibold text-on-surface">Tăng trợ cấp đỉnh triều cường</div>
                      <div className="text-secondary text-[11px]">Mức trợ cấp nâng từ 10% → 15%</div>
                    </td>
                    <td className="py-2.5 px-space-sm text-secondary">
                      Hỗ trợ phương tiện bị kẹt đường Nguyễn Hữu Cảnh
                    </td>
                    <td className="py-2.5 px-space-sm text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-secondary font-label-sm text-label-sm uppercase">
                        Lưu trữ
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container transition-colors">
                    <td className="py-2.5 px-space-sm font-data-mono text-[11px] text-secondary">
                      28/08/24<br />09:45:22
                    </td>
                    <td className="py-2.5 px-space-sm font-label-lg text-label-lg text-on-surface whitespace-nowrap">
                      Trần Minh Trí
                      <span className="block font-label-sm text-label-sm text-primary font-bold">ADMIN CẤP CAO</span>
                    </td>
                    <td className="py-2.5 px-space-sm">
                      <div className="font-semibold text-on-surface">Cập nhật Hệ số K Ngập cấp 3</div>
                      <div className="text-secondary text-[11px]">Điều chỉnh 1.8x → 2.0x</div>
                    </td>
                    <td className="py-2.5 px-space-sm text-secondary">
                      Bảo vệ an toàn kỹ thuật viên cứu hộ ca đêm
                    </td>
                    <td className="py-2.5 px-space-sm text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-secondary font-label-sm text-label-sm uppercase">
                        Lưu trữ
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-surface-container transition-colors">
                    <td className="py-2.5 px-space-sm font-data-mono text-[11px] text-secondary">
                      01/08/24<br />00:00:01
                    </td>
                    <td className="py-2.5 px-space-sm font-label-lg text-label-lg text-on-surface whitespace-nowrap">
                      HỆ THỐNG
                      <span className="block font-label-sm text-label-sm text-secondary">AUTO DISPATCH</span>
                    </td>
                    <td className="py-2.5 px-space-sm">
                      <div className="font-semibold text-on-surface">Khởi tạo Bộ thông số v2.0</div>
                      <div className="text-secondary text-[11px]">Chốt phiên bản mở rộng mùa mưa</div>
                    </td>
                    <td className="py-2.5 px-space-sm text-secondary">
                      Triển khai đồng bộ toàn hệ sinh thái
                    </td>
                    <td className="py-2.5 px-space-sm text-right whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container text-secondary font-label-sm text-label-sm uppercase">
                        Lưu trữ
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-space-xs text-secondary font-body-sm text-body-sm border-t border-surface-container">
              <span>Chu kỳ kiểm toán tự động: 24 giờ / lần</span>
              <button
                onClick={() => onShowToast('Xuất Tệp Kiểm Toán', 'Đã tải xuống file audit_commission_log.csv')}
                className="text-primary hover:text-primary-container font-label-sm text-label-sm uppercase font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Tải toàn bộ log kiểm toán (.CSV)</span>
                <span className="material-symbols-outlined text-[14px]">download</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
