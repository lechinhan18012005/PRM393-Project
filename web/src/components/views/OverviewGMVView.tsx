import React, { useState } from 'react';
import { ScreenId } from '../../types';

interface OverviewGMVViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

export const OverviewGMVView: React.FC<OverviewGMVViewProps> = ({ onSelectScreen, onShowToast }) => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [periodFilter, setPeriodFilter] = useState<'today' | '7d' | 'storm' | 'custom'>('storm');
  const [feedRows, setFeedRows] = useState([
    {
      code: '#RC-98421',
      payosId: 'POS-8831092',
      type: 'Vượt ngập ghép',
      typeIcon: 'local_shipping',
      badgeColor: 'bg-primary-fixed text-on-primary-fixed',
      customer: 'Nguyễn Hoài Nam',
      vehicle: 'Honda SH 150i • 59-G2 891.22',
      garage: 'Gara Khang Điền Q.Bình Thạnh',
      tech: 'Tài xế: Đỗ Văn Tuấn (KTV-08)',
      amount: '180.000 ₫',
      fee: '+21.600 ₫',
      time: '14 giây trước',
      status: 'PayOS Đã Khớp'
    },
    {
      code: '#RC-98419',
      payosId: 'POS-8831085',
      type: 'Hút nước & Thay dầu',
      typeIcon: 'build',
      badgeColor: 'bg-secondary-container text-on-secondary-container',
      customer: 'Lê Thị Mai Thảo',
      vehicle: 'Yamaha Grande • 59-P1 455.10',
      garage: 'Trung Tâm Xe Máy Nam Sài Gòn',
      tech: 'Trạm cơ động số 03',
      amount: '340.000 ₫',
      fee: '+40.800 ₫',
      time: '42 giây trước',
      status: 'PayOS Đã Khớp'
    },
    {
      code: '#RC-98418',
      payosId: 'POS-8831079',
      type: 'Kéo xe ngập đơn lẻ',
      typeIcon: 'two_wheeler',
      badgeColor: 'bg-tertiary-fixed text-on-tertiary-fixed',
      customer: 'Trần Vũ Luân',
      vehicle: 'Honda Winner X • 60-B3 772.90',
      garage: 'Gara Hoàng Minh Q2',
      tech: 'KTV: Lê Quốc Bảo (Xe cứu hộ 02)',
      amount: '220.000 ₫',
      fee: '+26.400 ₫',
      time: '1 phút trước',
      status: 'PayOS Đã Khớp'
    },
    {
      code: '#RC-98415',
      payosId: 'POS-8831061',
      type: 'Vượt ngập ghép',
      typeIcon: 'local_shipping',
      badgeColor: 'bg-primary-fixed text-on-primary-fixed',
      customer: 'Phạm Hương Trà',
      vehicle: 'Vespa Primavera • 59-E1 304.55',
      garage: 'Đội Cơ Động Thanh Đa',
      tech: 'Tài xế: Bùi Hữu Phước',
      amount: '180.000 ₫',
      fee: '+21.600 ₫',
      time: '2 phút trước',
      status: 'PayOS Đã Khớp'
    },
    {
      code: '#RC-98412',
      payosId: 'MANUAL-CASH',
      type: 'Tiền mặt trực tiếp',
      typeIcon: 'payments',
      badgeColor: 'bg-surface-container-high text-on-surface',
      customer: 'Đặng Hoàng Quân',
      vehicle: 'Honda Wave Alpha • 51-X2 119.84',
      garage: 'Gara Sửa Xe 24/7 Thảo Điền',
      tech: 'KTV: Võ Tiến Dũng',
      amount: '120.000 ₫',
      fee: '+14.400 ₫ (Ghi nợ)',
      time: '3 phút trước',
      status: 'Thu Tiền Mặt'
    }
  ]);

  const handlePayosSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      onShowToast(
        'Đồng Bộ PayOS Thành Công!',
        'Đã cập nhật 1,420 giao dịch và kết nối 14 điểm ngập thời gian thực.'
      );
    }, 1200);
  };

  const handleRefreshFeed = () => {
    onShowToast('Cập Nhật Luồng', 'Đang nạp 5 đơn cứu hộ mới nhất vừa hoàn thành qua PayOS...');
  };

  return (
    <div className="flex flex-col w-full space-y-space-md">
      {/* Breadcrumb & Tactical Utility Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 mb-2">
        <div className="flex flex-col">
          <div className="flex items-center gap-space-sm">
            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold">
              Tổng quan tài chính
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-container-high text-on-surface font-data-mono text-data-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container animate-pulse"></span>
              Đang cập nhật
            </span>
          </div>
        </div>

        {/* Quick Filters and Action CTA */}
        <div className="flex flex-wrap items-center gap-space-xs">
          <div className="flex items-center bg-surface-container-low p-0.5 rounded text-on-surface font-label-md text-label-md">
            <button
              onClick={() => setPeriodFilter('today')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                periodFilter === 'today' ? 'bg-surface-container-lowest text-primary-container font-bold shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
            >
              Hôm nay
            </button>
            <button
              onClick={() => setPeriodFilter('7d')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                periodFilter === '7d' ? 'bg-surface-container-lowest text-primary-container font-bold shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
            >
              7 ngày qua
            </button>
            <button
              onClick={() => setPeriodFilter('storm')}
              className={`px-2.5 py-1 rounded transition-colors cursor-pointer ${
                periodFilter === 'storm' ? 'bg-surface-container-lowest text-primary-container font-bold shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
            >
              Đợt ngập #3
            </button>
            <button
              onClick={() => setPeriodFilter('custom')}
              className={`px-2 py-1 rounded transition-colors flex items-center gap-1 cursor-pointer ${
                periodFilter === 'custom' ? 'bg-surface-container-lowest text-primary-container font-bold shadow-sm' : 'text-secondary hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">calendar_month</span>
              Tùy chọn
            </button>
          </div>
          <div className="h-6 w-px bg-surface-container-high hidden sm:block"></div>
          <button
            onClick={() => onShowToast('Xuất Tệp Kế Toán', 'Đã xuất bảng sao kê dòng tiền GMV định dạng PDF/Excel.')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-label-lg text-label-lg rounded shadow-sm transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[16px] text-tertiary">download</span>
            <span>Xuất báo cáo</span>
          </button>
          <button
            onClick={handlePayosSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary font-label-lg text-label-lg rounded shadow-sm transition-all active:scale-95 cursor-pointer disabled:opacity-80"
          >
            <span className={`material-symbols-outlined text-[16px] ${isSyncing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng bộ PayOS'}</span>
          </button>
        </div>
      </div>

      <div className="overview-alert"><span className="material-symbols-outlined">flood</span><strong>Ngập nặng tại Thủ Thiêm & Bình Thạnh</strong><details><summary>Chi tiết cảnh báo</summary><p>Triều cường 1,72 m · 17:30–19:45. Dự kiến 1.200 đơn/giờ. PayOS: 38 ms · SLA 99,99%. Hạn mức ký quỹ: 5 tỷ ₫.</p></details></div>

      {/* 5 High-Density Financial KPI Metric Cards */}
      <div className="overview-kpis">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between border border-surface-container">
          <div className="flex items-start justify-between">
            <span className="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Tổng giao dịch</span>
            <span className="p-1.5 rounded bg-surface-container-low text-primary-container">
              <span className="material-symbols-outlined text-[18px]">currency_exchange</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold" title="1.482.500.000 ₫" aria-label="1.482.500.000 ₫">
              1,48 tỷ <span className="font-label-lg text-label-lg font-normal text-secondary">₫</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-body-sm text-body-sm text-primary">
              <span className="material-symbols-outlined text-[15px] font-bold">trending_up</span>
              <span className="font-semibold">+28.4%</span>
              <span className="text-secondary text-label-sm font-label-sm">so với kỳ trước</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-primary h-full w-[84%]"></div>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between border border-surface-container">
          <div className="flex items-start justify-between">
            <span className="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Thu qua PayOS</span>
            <span className="p-1.5 rounded bg-tertiary-fixed text-on-tertiary-fixed">
              <span className="material-symbols-outlined text-[18px]">qr_code_scanner</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="font-headline-lg text-headline-lg text-tertiary tracking-tight font-bold" title="1.345.200.000 ₫" aria-label="1.345.200.000 ₫">
              1,35 tỷ <span className="font-label-lg text-label-lg font-normal text-secondary">₫</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-body-sm text-body-sm text-tertiary">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              <span className="font-semibold">90.7%</span>
              <span className="text-secondary text-label-sm font-label-sm">giao dịch QR</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-tertiary-container h-full w-[91%]"></div>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between border border-surface-container">
          <div className="flex items-start justify-between">
            <span className="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Phí nền tảng</span>
            <span className="p-1.5 rounded bg-surface-container text-on-surface">
              <span className="material-symbols-outlined text-[18px]">percent</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold" title="178.650.000 ₫" aria-label="178.650.000 ₫">
              178,65 tr <span className="font-label-lg text-label-lg font-normal text-secondary">₫</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-body-sm text-body-sm text-secondary">
              <span className="material-symbols-outlined text-[15px]">pie_chart</span>
              <span className="font-semibold text-on-surface">12.05%</span>
              <span className="text-secondary text-label-sm font-label-sm">tỷ lệ phí</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-secondary h-full w-[65%]"></div>
          </div>
        </div>

        {/* KPI 4 */}
        <div
          onClick={() => onSelectScreen('payouts')}
          className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between border border-surface-container cursor-pointer hover:border-error transition-colors"
        >
          <div className="flex items-start justify-between">
            <span className="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Chờ rút tiền</span>
            <span className="p-1.5 rounded bg-error-container text-on-error-container">
              <span className="material-symbols-outlined text-[18px]">pending_actions</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="font-headline-lg text-headline-lg text-error tracking-tight font-bold" title="42.800.000 ₫" aria-label="42.800.000 ₫">
              42,8 tr <span className="font-label-lg text-label-lg font-normal text-secondary">₫</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-body-sm text-body-sm text-error">
              <span className="material-symbols-outlined text-[15px]">storefront</span>
              <span className="font-semibold">7 Gara</span>
              <span className="text-secondary text-label-sm font-label-sm">chờ giải ngân</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-error h-full w-[45%]"></div>
          </div>
        </div>

        {/* KPI 5 */}
        <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm flex flex-col justify-between border border-surface-container">
          <div className="flex items-start justify-between">
            <span className="font-label-md text-label-md text-secondary uppercase tracking-wider font-semibold">Quỹ dự phòng</span>
            <span className="p-1.5 rounded bg-secondary-container text-on-secondary-container">
              <span className="material-symbols-outlined text-[18px]">shield</span>
            </span>
          </div>
          <div className="my-space-sm">
            <div className="font-headline-lg text-headline-lg text-on-surface tracking-tight font-bold" title="95.000.000 ₫" aria-label="95.000.000 ₫">
              95 tr <span className="font-label-lg text-label-lg font-normal text-secondary">₫</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 font-body-sm text-body-sm text-tertiary">
              <span className="material-symbols-outlined text-[15px]">check_circle</span>
              <span className="font-semibold">100%</span>
              <span className="text-secondary text-label-sm font-label-sm">bảo chứng</span>
            </div>
          </div>
          <div className="w-full bg-surface-container-low h-1 rounded-full overflow-hidden mt-1">
            <div className="bg-tertiary h-full w-[100%]"></div>
          </div>
        </div>
      </div>

      {/* Operational Field Context / Image Mosaics */}
      <details className="overview-secondary"><summary>Hoạt động hiện trường & hạ tầng thanh toán</summary>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
        <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center gap-space-md border border-surface-container">
          <img
            className="w-20 h-20 rounded object-cover shrink-0"
            alt="Ung Van Khiem Point"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCJkUyqj1CpxbaA2oxSTBSk9frWHR1S9qyf9BPzwFXbI5d0bp-9RzM2RTqIuEXsYBgRN6MDujzYHDBGTpAPBmnySk0ITnsS5kfsz9OzxUdXyrD0SPCLUKhkwxgag80sF5grcortsPyIwJUqhQRFj9p1bMxaJYSOCWTp1lzP2ciueNPG34k8dxg6dBq_pvWkrjBGmYSWE8iit2XCeuIsJbfiOBP4FLGuZcZ8GGAbBvr9NTc4NpmjsxsS"
          />
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-secondary">Điểm trung chuyển #04</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Tuyến Ung Văn Khiêm</span>
            <span className="font-body-sm text-body-sm text-secondary">86 lượt chở xe đã thanh toán qua PayOS</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center gap-space-md border border-surface-container">
          <img
            className="w-20 h-20 rounded object-cover shrink-0"
            alt="Garage Q7"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuC8_kLWs7OnNcnuCQnvo3p-csyvFnBRI-U49OZpCtSB98Gj54huVaJz-H8Bz9q2tralTej9Sz58yKVn_JOJx11VJmRH5hBUh_vQkWaf893jhykzBC6y4UgWnONHkizTzlO1tRdfxFUEmzz8SSxnonDX-D75zoOQL7zVgKL49Ewc4XZLzTi-gjC_thlcHkh3Qw7ZH1WliCaOGtKktSmc7Ut2Kaj2XtUEnkBSZxpP0jsI-Fw5jomPxd6r"
          />
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-secondary">Xử lý thủy kích khẩn cấp</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">Gara Phúc Long Quận 7</span>
            <span className="font-body-sm text-body-sm text-secondary">34 hóa đơn hoàn tất • Tiền về ví gara 100%</span>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg p-space-sm shadow-sm flex items-center gap-space-md border border-surface-container">
          <img
            className="w-20 h-20 rounded object-cover shrink-0"
            alt="PayOS operations"
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJFVWG0myaysfVqY77lzjlfTDlW7qxCo_IsmL9Mf0duGmNeUMl8DqrwR0XOpfqIlivR2vHBgI6SmxsDofQh4lG3qzWiWLf0iTQjzqTUueJ0PzLkqJXHSCkQQcJHalvcy4UQuywWTvFPH1Cu211N4Qx8mrnblfOgePtcIIZ_ZttJRjbuVP7kRQpnC5gZvwlDAOrzc5ruPKiZbIfZFFeONkmUaqZ918J-oS0DaFx84vwubYXzIQ0Ueu2"
          />
          <div className="flex flex-col">
            <span className="font-label-sm text-label-sm uppercase text-secondary">Hạ tầng thanh toán</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">PayOS Webhook Stream</span>
            <span className="font-body-sm text-body-sm text-tertiary">Tự động quyết toán 1.2s mỗi giao dịch</span>
          </div>
        </div>
      </div>

      </details>

      {/* Charts & Analytics Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left Column: Trend Area Chart */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col justify-between border border-surface-container">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-space-md gap-space-sm">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Dòng tiền theo giờ</h2>
                <span className="px-2 py-0.5 rounded bg-primary-fixed text-on-primary-fixed font-label-sm text-label-sm font-bold">
                  Giờ cao điểm
                </span>
              </div>
              <p className="font-body-sm text-body-sm text-secondary">
                Giá trị giao dịch và phí nền tảng · 06:00–24:00
              </p>
            </div>
            <div className="flex items-center gap-space-md font-label-sm text-label-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-primary-container"></span>
                <span className="text-on-surface font-medium">Giao dịch</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-tertiary-container"></span>
                <span className="text-on-surface font-medium">Phí nền tảng</span>
              </div>
            </div>
          </div>

          {/* High-Density Inline SVG Area Chart */}
          <div className="w-full h-64 relative mt-2 flex flex-col justify-end">
            <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 720 220">
              <defs>
                <linearGradient id="gmvGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#cc4900" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#cc4900" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="feeGradient" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#007bb9" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#007bb9" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              {/* Horizontal Grid Lines */}
              <line stroke="#eff4ff" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="720" y1="20" y2="20" />
              <line stroke="#eff4ff" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="720" y1="70" y2="70" />
              <line stroke="#eff4ff" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="720" y1="120" y2="120" />
              <line stroke="#eff4ff" strokeDasharray="4 4" strokeWidth="1.5" x1="0" x2="720" y1="170" y2="170" />
              <line stroke="#cbdbf5" strokeWidth="1" x1="0" x2="720" y1="210" y2="210" />

              {/* GMV Rescue Volume Area & Path */}
              <path
                d="M 0 195 Q 60 190 120 175 T 240 150 T 360 110 T 480 30 T 540 25 T 600 85 T 660 145 T 720 180 L 720 210 L 0 210 Z"
                fill="url(#gmvGradient)"
              />
              <path
                d="M 0 195 Q 60 190 120 175 T 240 150 T 360 110 T 480 30 T 540 25 T 600 85 T 660 145 T 720 180"
                fill="none"
                stroke="#cc4900"
                strokeLinecap="round"
                strokeWidth="3"
              />

              {/* Platform Fee Area & Path */}
              <path
                d="M 0 206 Q 60 204 120 200 T 240 195 T 360 185 T 480 150 T 540 145 T 600 170 T 660 190 T 720 200 L 720 210 L 0 210 Z"
                fill="url(#feeGradient)"
              />
              <path
                d="M 0 206 Q 60 204 120 200 T 240 195 T 360 185 T 480 150 T 540 145 T 600 170 T 660 190 T 720 200"
                fill="none"
                stroke="#007bb9"
                strokeLinecap="round"
                strokeWidth="2.5"
              />

              {/* Peak Alert Marker (17h30 Tide) */}
              <circle cx="510" cy="27" fill="#cc4900" r="4.5" />
              <circle className="animate-ping" cx="510" cy="27" fill="#cc4900" opacity="0.25" r="9" />
            </svg>

            {/* Peak Callout Overlay */}
            <div className="absolute left-[65%] top-[12%] -translate-x-1/2 bg-surface-container-lowest p-2 rounded shadow-md pointer-events-none text-left border border-surface-container">
              <div className="font-label-sm text-label-sm text-primary uppercase font-bold">Đỉnh Ngập 17:45</div>
              <div className="font-data-mono text-data-mono font-bold text-on-surface">312.450.000 ₫ / giờ</div>
              <div className="font-body-sm text-body-sm text-secondary">Phí sàn: 37.600.000 ₫</div>
            </div>
          </div>

          {/* X-Axis Labels */}
          <div className="flex items-center justify-between text-secondary font-data-mono text-data-mono pt-2">
            <span>06:00</span>
            <span>09:00</span>
            <span>12:00</span>
            <span>15:00</span>
            <span className="text-primary font-bold">18:00 (Đỉnh Triều)</span>
            <span>21:00</span>
            <span>24:00</span>
          </div>

          <div className="grid grid-cols-3 gap-space-sm pt-space-md mt-space-md bg-surface-container-low p-space-sm rounded">
            <div>
              <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Khung giờ cao điểm</div>
              <div className="font-headline-sm text-headline-sm text-on-surface font-bold">17:00 - 20:30</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">GMV trung bình / đơn</div>
              <div className="font-headline-sm text-headline-sm text-on-surface font-bold">185.000 ₫</div>
            </div>
            <div>
              <div className="font-label-sm text-label-sm text-secondary uppercase font-semibold">Thời gian xác thực PayOS</div>
              <div className="font-headline-sm text-headline-sm text-tertiary font-bold">0.82 giây</div>
            </div>
          </div>
        </div>

        {/* Right Column: Breakdown by Service & Gateway Distribution */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-space-lg rounded-lg shadow-sm flex flex-col justify-between space-y-space-md border border-surface-container">
          <div>
            <div className="flex items-center justify-between">
              <h2 className="font-headline-md text-headline-md text-on-surface font-semibold">Cơ cấu dịch vụ</h2>
              <span className="material-symbols-outlined text-secondary text-[20px]">donut_large</span>
            </div>
            <p className="font-body-sm text-body-sm text-secondary mt-0.5">Tỷ trọng giá trị giao dịch</p>
          </div>

          <div className="space-y-space-sm">
            {/* Service 1 */}
            <div className="p-space-sm rounded bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-primary"></span>
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold">Chở xe vượt ngập ghép</span>
                </div>
                <span className="font-data-mono text-data-mono font-bold text-on-surface">
                  682M ₫ <span className="text-primary font-bold">(46%)</span>
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full w-[46%]"></div>
              </div>
              <span className="font-label-sm text-label-sm text-secondary mt-1 block">Xe tải sàn thấp chở 8-12 xe/chuyến</span>
            </div>

            {/* Service 2 */}
            <div className="p-space-sm rounded bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-tertiary-container"></span>
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold">Cứu hộ kéo xe đơn lẻ</span>
                </div>
                <span className="font-data-mono text-data-mono font-bold text-on-surface">
                  474M ₫ <span className="text-tertiary font-bold">(32%)</span>
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-tertiary-container h-full w-[32%]"></div>
              </div>
              <span className="font-label-sm text-label-sm text-secondary mt-1 block">Kéo khẩn cấp xe chết máy tại chỗ</span>
            </div>

            {/* Service 3 */}
            <div className="p-space-sm rounded bg-surface-container-low hover:bg-surface-container transition-colors">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-secondary"></span>
                  <span className="font-label-lg text-label-lg text-on-surface font-semibold">Sửa & phục hồi tại gara</span>
                </div>
                <span className="font-data-mono text-data-mono font-bold text-on-surface">
                  326M ₫ <span className="text-secondary font-bold">(22%)</span>
                </span>
              </div>
              <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                <div className="bg-secondary h-full w-[22%]"></div>
              </div>
              <span className="font-label-sm text-label-sm text-secondary mt-1 block">Xử lý thủy kích, thay dầu láp & lọc gió</span>
            </div>
          </div>

          {/* Payment Split */}
          <div className="bg-surface-container-low p-space-md rounded">
            <span className="font-label-sm text-label-sm uppercase text-secondary tracking-wider block mb-2 font-bold">
              Kênh thanh toán
            </span>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary text-[18px]">qr_code</span>
                <span className="font-body-sm text-body-sm text-on-surface font-semibold">PayOS · VietQR</span>
              </div>
              <span className="font-data-mono text-data-mono font-bold text-tertiary">91% (1.345M ₫)</span>
            </div>
            <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden flex">
              <div className="bg-tertiary-container h-full w-[91%]"></div>
              <div className="bg-outline h-full w-[9%]"></div>
            </div>
            <div className="flex items-center justify-between mt-2 text-secondary font-body-sm text-body-sm">
              <span>Tiền mặt trực tiếp cho Kỹ thuật viên:</span>
              <span className="font-data-mono text-data-mono font-bold text-on-surface">9% (137M ₫)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-Time Live Ticker / Completed Transactions Stream */}
      <div className="bg-surface-container-lowest rounded-lg shadow-sm overflow-hidden border border-surface-container">
        <div className="p-space-md flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-low/60 border-b border-surface-container">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-tertiary"></span>
            </span>
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Giao dịch gần đây
            </h3>
          </div>
          <div className="flex items-center gap-space-sm text-secondary font-label-md text-label-md">
            <span>Tự động làm mới: <span className="font-data-mono text-on-surface font-semibold">Mỗi 3s</span></span>
            <button
              onClick={handleRefreshFeed}
              className="p-1 hover:bg-surface-container rounded text-secondary hover:text-on-surface transition-colors cursor-pointer"
              title="Tải lại ngay"
            >
              <span className="material-symbols-outlined text-[16px]">refresh</span>
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left font-body-md text-body-md">
            <thead className="bg-surface-container-low font-label-md text-label-md uppercase text-secondary">
              <tr>
                <th className="px-space-md py-2.5 font-semibold">Mã Đơn / PayOS ID</th>
                <th className="px-space-md py-2.5 font-semibold">Loại Dịch Vụ</th>
                <th className="px-space-md py-2.5 font-semibold">Khách Hàng & Phương Tiện</th>
                <th className="px-space-md py-2.5 font-semibold">Gara / Đội Cứu Hộ</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Tổng Tiền (VND)</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Phí Sàn (12%)</th>
                <th className="px-space-md py-2.5 font-semibold text-center">Thời Gian</th>
                <th className="px-space-md py-2.5 font-semibold text-right">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low">
              {feedRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-space-md py-2.5 whitespace-nowrap">
                    <div className="font-data-mono text-data-mono font-bold text-on-surface">{row.code}</div>
                    <div className="font-label-sm text-label-sm text-secondary">{row.payosId}</div>
                  </td>
                  <td className="px-space-md py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-label-sm text-label-sm font-semibold ${row.badgeColor}`}>
                      <span className="material-symbols-outlined text-[12px]">{row.typeIcon}</span>
                      {row.type}
                    </span>
                  </td>
                  <td className="px-space-md py-2.5 whitespace-nowrap">
                    <div className="font-body-md text-body-md text-on-surface font-medium">{row.customer}</div>
                    <div className="font-label-sm text-label-sm text-secondary">{row.vehicle}</div>
                  </td>
                  <td className="px-space-md py-2.5 whitespace-nowrap">
                    <div className="text-on-surface font-medium">{row.garage}</div>
                    <div className="font-label-sm text-label-sm text-secondary">{row.tech}</div>
                  </td>
                  <td className="px-space-md py-2.5 whitespace-nowrap text-right font-data-mono text-data-mono font-bold text-on-surface">
                    {row.amount}
                  </td>
                  <td className="px-space-md py-2.5 whitespace-nowrap text-right font-data-mono text-data-mono text-primary font-semibold">
                    {row.fee}
                  </td>
                  <td className="px-space-md py-2.5 whitespace-nowrap text-center font-data-mono text-data-mono text-secondary">
                    {row.time}
                  </td>
                  <td className="px-space-md py-2.5 whitespace-nowrap text-right">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-tertiary-container"></span>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer Pagination */}
        <div className="p-space-md bg-surface-container-low flex flex-col sm:flex-row items-center justify-between gap-space-sm text-secondary font-body-sm text-body-sm border-t border-surface-container">
          <div className="flex items-center gap-2">
            <span>Hiển thị 5 / 1.420 giao dịch hoàn thành trong ngày</span>
            <span className="h-3 w-px bg-surface-container"></span>
            <span className="text-on-surface font-semibold">Tổng GMV ca trực: 218.400.000 ₫</span>
          </div>
          <div className="flex items-center gap-1">
            <button className="px-2.5 py-1 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded shadow-sm disabled:opacity-50" disabled>
              Trước
            </button>
            <button className="px-2.5 py-1 bg-primary text-on-primary font-bold rounded shadow-sm">1</button>
            <button className="px-2.5 py-1 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded shadow-sm">2</button>
            <button className="px-2.5 py-1 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded shadow-sm">3</button>
            <span className="px-1 text-secondary">...</span>
            <button className="px-2.5 py-1 bg-surface-container-lowest hover:bg-surface-container text-on-surface rounded shadow-sm">Sau</button>
          </div>
        </div>
      </div>
    </div>
  );
};
