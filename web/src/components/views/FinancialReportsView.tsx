import React, { useState } from 'react';
import { ScreenId } from '../../types';

interface FinancialReportsViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

export const FinancialReportsView: React.FC<FinancialReportsViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  const [selectedPeriod, setSelectedPeriod] = useState<'day' | 'week' | 'month' | 'quarter'>('month');
  const [selectedQuarter, setSelectedQuarter] = useState('Q4/2023');

  const financialSummary = {
    totalGMV: 4852900000,
    netRevenue: 606612500, // 12.5% avg
    payoutToGarages: 4124965000,
    paymentGatewayFee: 58234800, // 1.2% PayOS
    insuranceReserveFund: 242645000, // 5%
    refundDeductions: 20442700,
    grossProfit: 527935000,
    operatingExpenses: 184500000,
    netProfit: 343435000
  };

  const monthlyBreakdown = [
    { month: 'T07/2023', gmv: 980000000, fee: 122500000, rescues: 2450, growth: '+12%' },
    { month: 'T08/2023', gmv: 1120000000, fee: 140000000, rescues: 2810, growth: '+14%' },
    { month: 'T09/2023', gmv: 1450000000, fee: 181250000, rescues: 3620, growth: '+29%' },
    { month: 'T10/2023', gmv: 2180000000, fee: 272500000, rescues: 5450, growth: '+50%' },
    { month: 'T11/2023 (Hiện tại)', gmv: 1242900000, fee: 155362500, rescues: 3108, growth: '+38%' },
  ];

  const categoryShare = [
    { name: 'Hút nước bugi & nổ máy tại chỗ', share: 44, value: 2135000000, count: 6100, color: 'bg-primary' },
    { name: 'Kéo xe ngập nặng về trạm chuyên sâu', share: 28, value: 1358000000, count: 1810, color: 'bg-tertiary-container' },
    { name: 'Thay dầu nhớt & súc bình xăng', share: 18, value: 873500000, count: 2420, color: 'bg-secondary' },
    { name: 'Sửa điện, IC, cảm biến phun xăng EFI', share: 10, value: 486400000, count: 850, color: 'bg-amber-500' }
  ];

  return (
    <div className="p-margin-desktop space-y-space-xl">
      {/* Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <div className="flex items-center gap-space-xs font-label-md text-label-md text-secondary">
            <span className="hover:text-primary cursor-pointer" onClick={() => onSelectScreen('overview')}>
              MODULE A: ADMIN TÀI CHÍNH
            </span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-semibold">BÁO CÁO TÀI CHÍNH & P&L SÀN</span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">
            Báo Cáo Doanh Thu, Chiết Khấu & Lợi Nhuận Thuần
          </h1>
          <p className="font-body-md text-body-md text-secondary">
            Đối soát tổng hợp GMV toàn hệ thống, khấu trừ cổng PayOS NAPAS 24/7 và quỹ bảo hiểm cứu hộ.
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <div className="flex items-center bg-surface-container-low p-1 rounded-lg border border-surface-container">
            <button
              onClick={() => setSelectedPeriod('day')}
              className={`px-3 py-1 rounded text-label-sm font-semibold transition-all ${
                selectedPeriod === 'day' ? 'bg-surface text-primary shadow-xs' : 'text-secondary'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setSelectedPeriod('week')}
              className={`px-3 py-1 rounded text-label-sm font-semibold transition-all ${
                selectedPeriod === 'week' ? 'bg-surface text-primary shadow-xs' : 'text-secondary'
              }`}
            >
              Tuần
            </button>
            <button
              onClick={() => setSelectedPeriod('month')}
              className={`px-3 py-1 rounded text-label-sm font-semibold transition-all ${
                selectedPeriod === 'month' ? 'bg-surface text-primary shadow-xs' : 'text-secondary'
              }`}
            >
              Tháng 11/2023
            </button>
            <button
              onClick={() => setSelectedPeriod('quarter')}
              className={`px-3 py-1 rounded text-label-sm font-semibold transition-all ${
                selectedPeriod === 'quarter' ? 'bg-surface text-primary shadow-xs' : 'text-secondary'
              }`}
            >
              {selectedQuarter}
            </button>
          </div>

          <button
            onClick={() => onShowToast('Xuất Báo Cáo', 'Đã tải tệp RescueOps_PnL_Report_2023.xlsx thành công')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            <span>Xuất Excel / PDF</span>
          </button>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-lg">
        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Tổng GMV Cứu Hộ</span>
            <span className="material-symbols-outlined text-primary text-[20px]">currency_exchange</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {financialSummary.totalGMV.toLocaleString('vi-VN')} đ
          </div>
          <div className="flex items-center gap-2 mt-2 text-label-sm">
            <span className="text-tertiary font-bold flex items-center">
              <span className="material-symbols-outlined text-[14px]">trending_up</span> +34.8%
            </span>
            <span className="text-secondary">so với tháng trước</span>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Doanh Thu Phí Sàn (Net)</span>
            <span className="material-symbols-outlined text-tertiary-container text-[20px]">monetization_on</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-tertiary-container">
            {financialSummary.netRevenue.toLocaleString('vi-VN')} đ
          </div>
          <div className="flex items-center gap-2 mt-2 text-label-sm">
            <span className="text-secondary">Tỷ lệ chiết khấu hiệu dụng:</span>
            <span className="font-bold text-on-surface">12.5%</span>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Đã Thanh Toán Gara</span>
            <span className="material-symbols-outlined text-emerald-600 text-[20px]">account_balance_wallet</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface">
            {financialSummary.payoutToGarages.toLocaleString('vi-VN')} đ
          </div>
          <div className="flex items-center gap-2 mt-2 text-label-sm">
            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-semibold">
              98.4% lệnh rút thành công
            </span>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Lợi Nhuận Thuần (EBIT)</span>
            <span className="material-symbols-outlined text-blue-600 text-[20px]">query_stats</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-blue-700">
            {financialSummary.netProfit.toLocaleString('vi-VN')} đ
          </div>
          <div className="flex items-center gap-2 mt-2 text-label-sm">
            <span className="text-blue-700 font-bold">Biên LN: 56.6%</span>
            <span className="text-secondary">trên doanh thu sàn</span>
          </div>
        </div>
      </div>

      {/* Main Analysis: P&L Statement & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl">
        {/* P&L Statement breakdown */}
        <div className="lg:col-span-7 bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs">
          <div className="flex items-center justify-between mb-space-md border-b border-surface-container pb-space-sm">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Bảng Báo Cáo Kết Quả Hoạt Động (P&L Breakdown)
              </h2>
              <span className="font-body-sm text-body-sm text-secondary">
                Dữ liệu đồng bộ trực tiếp từ cổng PayOS NAPAS 24/7 & hệ thống lệnh cứu hộ
              </span>
            </div>
            <span className="px-2.5 py-1 bg-surface-container text-on-surface font-data-mono text-label-sm rounded font-semibold">
              ĐƠN VỊ: VNĐ
            </span>
          </div>

          <div className="space-y-3 font-body-sm">
            <div className="flex items-center justify-between py-2 border-b border-surface-container-low font-bold text-on-surface">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-primary">arrow_forward</span>
                1. TỔNG GIÁ TRỊ GIAO DỊCH (GMV)
              </span>
              <span className="font-data-mono">{financialSummary.totalGMV.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between py-1.5 pl-6 text-secondary">
              <span>- Thanh toán hộ Gara liên kết (85%)</span>
              <span className="font-data-mono text-red-600">-{financialSummary.payoutToGarages.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between py-1.5 pl-6 text-secondary">
              <span>- Hoàn tiền tranh chấp & bồi hoàn</span>
              <span className="font-data-mono text-red-600">-{financialSummary.refundDeductions.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between py-2 bg-surface-container-low px-3 rounded font-bold text-primary">
              <span>2. DOANH THU THUẦN NỀN TẢNG (NET REVENUE)</span>
              <span className="font-data-mono">{financialSummary.netRevenue.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between py-1.5 pl-6 text-secondary">
              <span>- Phí xử lý cổng PayOS & VietQR (1.2%)</span>
              <span className="font-data-mono text-red-600">-{financialSummary.paymentGatewayFee.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between py-1.5 pl-6 text-secondary">
              <span>- Trích lập Quỹ Bảo Hiểm & Dự Phòng Rủi Ro (5%)</span>
              <span className="font-data-mono text-red-600">-{financialSummary.insuranceReserveFund.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between py-2 bg-surface-container-low px-3 rounded font-bold text-tertiary-container">
              <span>3. LỢI NHUẬN GỘP (GROSS PROFIT)</span>
              <span className="font-data-mono">{financialSummary.grossProfit.toLocaleString('vi-VN')} đ</span>
            </div>

            <div className="flex items-center justify-between py-1.5 pl-6 text-secondary">
              <span>- Chi phí vận hành hạ tầng máy chủ & GIS Map</span>
              <span className="font-data-mono text-red-600">-64.500.000 đ</span>
            </div>

            <div className="flex items-center justify-between py-1.5 pl-6 text-secondary">
              <span>- Chi phí điều phối viên & kiểm duyệt hồ sơ</span>
              <span className="font-data-mono text-red-600">-120.000.000 đ</span>
            </div>

            <div className="flex items-center justify-between py-3 bg-emerald-50 border border-emerald-200 px-4 rounded-lg font-bold text-emerald-800 text-body-md">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">check_circle</span>
                4. LỢI NHUẬN THUẦN TRƯỚC THUẾ (EBIT)
              </span>
              <span className="font-data-mono text-headline-sm">{financialSummary.netProfit.toLocaleString('vi-VN')} đ</span>
            </div>
          </div>
        </div>

        {/* Category Share & Monthly Bar */}
        <div className="lg:col-span-5 space-y-space-lg">
          <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">
              Phân Bổ Doanh Thu Theo Dịch Vụ
            </h3>
            <p className="font-body-sm text-body-sm text-secondary mb-4">
              Dịch vụ cơ động xử lý bugi tại chỗ chiếm tỷ trọng cao nhất trong mùa triều cường
            </p>

            <div className="space-y-4">
              {categoryShare.map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex items-center justify-between text-body-sm">
                    <span className="font-medium text-on-surface truncate max-w-[220px]">{cat.name}</span>
                    <span className="font-data-mono font-bold">{cat.share}% ({cat.count.toLocaleString()} ca)</span>
                  </div>
                  <div className="w-full bg-surface-container h-2.5 rounded-full overflow-hidden">
                    <div className={`h-full ${cat.color}`} style={{ width: `${cat.share}%` }}></div>
                  </div>
                  <div className="flex justify-between text-label-xs text-secondary">
                    <span>Doanh số GMV:</span>
                    <span className="font-data-mono">{cat.value.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-xl border border-surface-container p-space-lg shadow-xs">
            <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface mb-1">
              Tăng Trưởng Qua Các Tháng Ngập
            </h3>
            <p className="font-body-sm text-body-sm text-secondary mb-3">
              Xu hướng tăng vọt vào tháng 10 & 11 khi triều cường Mễ Cốc, Trần Xuân Soạn đạt đỉnh
            </p>

            <div className="space-y-2.5">
              {monthlyBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded bg-surface-container-low text-body-sm">
                  <div>
                    <span className="font-semibold text-on-surface">{item.month}</span>
                    <div className="text-label-xs text-secondary">{item.rescues.toLocaleString()} ca cứu hộ</div>
                  </div>
                  <div className="text-right">
                    <div className="font-data-mono font-bold text-on-surface">{(item.gmv / 1000000).toFixed(0)} Triệu đ</div>
                    <span className="text-label-xs text-tertiary font-bold">{item.growth}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
