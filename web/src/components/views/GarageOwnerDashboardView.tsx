import React, { useState } from 'react';
import { ScreenId } from '../../types';

interface GarageOwnerDashboardViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

export const GarageOwnerDashboardView: React.FC<GarageOwnerDashboardViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  const [activeTab, setActiveTab] = useState<'BRANCHES' | 'TECHNICIANS' | 'EARNINGS'>('BRANCHES');

  const branches = [
    {
      id: 'BR-01',
      name: 'Chi Nhánh 1 - Mễ Cốc Trực Chiến',
      address: '148 Mễ Cốc, Phường 15, Quận 8, TP.HCM',
      status: 'Trực Chiến 24/7 (Đỉnh Triều Cường)',
      techniciansCount: 4,
      trucks: '1 Xe Bán Tải Cẩu Nâng + 2 Xe Máy Cơ Động',
      floodLevel: 'Ngập Cấp 3 (Vùng Trũng Đỏ)',
      activeJobs: 3,
      hotline: '0903.118.291 (Máy lẻ 1)'
    },
    {
      id: 'BR-02',
      name: 'Chi Nhánh 2 - Trạm Kè Phú Định',
      address: '72 Bến Phú Định, Phường 16, Quận 8, TP.HCM',
      status: 'Đang Hoạt Động',
      techniciansCount: 3,
      trucks: '1 Máy Ép Bơm Nước Công Suất Lớn + 2 Xe Cơ Động',
      floodLevel: 'Ngập Cấp 2 (Bờ Kè Kênh Đôi)',
      activeJobs: 1,
      hotline: '0903.118.291 (Máy lẻ 2)'
    },
    {
      id: 'BR-03',
      name: 'Chi Nhánh 3 - Trục Kinh Dương Vương',
      address: '198 Kinh Dương Vương, Phường An Lạc, Bình Tân',
      status: 'Đang Hoạt Động',
      techniciansCount: 3,
      trucks: '2 Xe Cơ Động Chuyên Bugi & Thay Nhớt Lội Nước',
      floodLevel: 'Ngập Cấp 1 (Cống Thoát Tốt)',
      activeJobs: 0,
      hotline: '0903.118.291 (Máy lẻ 3)'
    }
  ];

  const technicians = [
    {
      id: 'KTV-08',
      name: 'Lê Văn Tuấn',
      phone: '0938.110.294',
      branch: 'Chi Nhánh 1 (Mễ Cốc)',
      specialty: 'Xử lý bugi, xả bình xăng con, cứu hộ chết máy ngập nước',
      jobsToday: 8,
      csat: 4.95,
      status: 'BUSY',
      statusText: 'Đang di chuyển cứu hộ đơn ORD-7720 (Nguyễn Hữu Cảnh)'
    },
    {
      id: 'KTV-12',
      name: 'Trần Quốc Bảo',
      phone: '0903.992.118',
      branch: 'Chi Nhánh 1 (Mễ Cốc)',
      specialty: 'Điện xe máy, cảm biến phun xăng EFI, ECU chống chập',
      jobsToday: 6,
      csat: 4.91,
      status: 'AVAILABLE',
      statusText: 'Sẵn sàng tiếp nhận ca cứu hộ mới'
    },
    {
      id: 'KTV-14',
      name: 'Nguyễn Đăng Khoa',
      phone: '0909.284.182',
      branch: 'Chi Nhánh 2 (Phú Định)',
      specialty: 'Vận chuyển xe ngập nước bằng xe cẩu nâng chuyên dụng',
      jobsToday: 7,
      csat: 4.88,
      status: 'BUSY',
      statusText: 'Đang xử lý tại chỗ (Huỳnh Tấn Phát, Q.7)'
    },
    {
      id: 'KTV-03',
      name: 'Võ Hoài Nam',
      phone: '0912.839.201',
      branch: 'Chi Nhánh 3 (Kinh Dương Vương)',
      specialty: 'Thợ trưởng, chẩn đoán tay ga cao cấp Vespa, SH, NVX',
      jobsToday: 9,
      csat: 4.98,
      status: 'AVAILABLE',
      statusText: 'Sẵn sàng tiếp nhận ca cứu hộ mới'
    }
  ];

  return (
    <div className="p-margin-desktop space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>
          <div className="flex items-center gap-space-xs font-label-md text-label-md text-secondary">
            <span className="hover:text-primary cursor-pointer" onClick={() => onSelectScreen('owner-dashboard')}>
              MODULE C: CHỦ GARA ĐỐI TÁC
            </span>
            <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            <span className="text-on-surface font-semibold">TỔNG QUAN HỆ THỐNG GARA AN PHÚ</span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold">
              Gara An Phú (Q.8 & Bình Tân)
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-label-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">verified</span>
              ĐỐI TÁC VÀNG RESCUEOPS
            </span>
          </div>
          <p className="font-body-md text-body-md text-secondary">
            Chủ cơ sở: Lê Tuấn Hưng • Hotline: 0903.118.291 • Mã Gara: GAR-Q8-8821
          </p>
        </div>

        <div className="flex items-center gap-space-sm flex-wrap">
          <button
            onClick={() => onSelectScreen('services')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">price_change</span>
            <span>Bảng Giá Niêm Yết</span>
          </button>
          <button
            onClick={() => onSelectScreen('payouts')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
            <span>Yêu Cầu Rút Tiền Về PayOS</span>
          </button>
        </div>
      </div>

      {/* KPI Cards for Garage Owner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-lg">
        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Doanh Thu Ca Ngập Hôm Nay</span>
            <span className="material-symbols-outlined text-primary text-[20px]">payments</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface font-data-mono">
            18.450.000 đ
          </div>
          <div className="text-label-xs text-secondary mt-1">
            Thực nhận (87.5% sau phí sàn): <span className="font-bold text-emerald-700 font-data-mono">16.143.750 đ</span>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Tổng Ca Cứu Hộ Đã Làm</span>
            <span className="material-symbols-outlined text-tertiary-container text-[20px]">two_wheeler</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-tertiary-container font-data-mono">
            412 ca
          </div>
          <div className="text-label-xs text-secondary mt-1">
            Hôm nay: <span className="font-bold text-on-surface">30 ca cứu hộ tại chỗ</span>
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Đội Ngũ Kỹ Thuật Viên</span>
            <span className="material-symbols-outlined text-blue-600 text-[20px]">engineering</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-blue-700 font-data-mono">
            10 thợ cơ động
          </div>
          <div className="text-label-xs text-emerald-700 font-semibold mt-1">
            100% chứng chỉ nghề & trang bị bình xịt ngập
          </div>
        </div>

        <div className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs">
          <div className="flex items-center justify-between text-secondary mb-2">
            <span className="font-label-md text-label-md uppercase font-bold tracking-wider">Chỉ Số Đánh Giá (CSAT)</span>
            <span className="material-symbols-outlined text-amber-500 text-[20px]">star</span>
          </div>
          <div className="font-headline-lg text-headline-lg font-bold text-on-surface flex items-center gap-1 font-data-mono">
            4.95 <span className="text-amber-500 text-lg">★</span>
          </div>
          <div className="text-label-xs text-emerald-700 font-semibold mt-1">
            SLA phản hồi: 1.4 phút (Top 1 toàn thành phố)
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-surface-container pb-2">
        <button
          onClick={() => setActiveTab('BRANCHES')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md font-semibold transition-all ${
            activeTab === 'BRANCHES'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">store</span>
          <span>Chi Nhánh & Trạm Cứu Hộ ({branches.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('TECHNICIANS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md font-semibold transition-all ${
            activeTab === 'TECHNICIANS'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">badge</span>
          <span>Đội Kỹ Thuật Viên Cơ Động ({technicians.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('EARNINGS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md font-semibold transition-all ${
            activeTab === 'EARNINGS'
              ? 'bg-primary text-on-primary shadow-xs'
              : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">account_balance</span>
          <span>Ví Tiền & Đối Soát PayOS</span>
        </button>
      </div>

      {/* Tab 1: Branches */}
      {activeTab === 'BRANCHES' && (
        <div className="space-y-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Mạng Lưới Chi Nhánh Tiếp Nhận & Phân Tuyến
            </h2>
            <button
              onClick={() => onShowToast('Thêm Chi Nhánh', 'Vui lòng nộp hồ sơ giấy phép kinh doanh để thêm chi nhánh mới')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container text-on-surface rounded text-label-sm font-semibold hover:bg-surface-container-high transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              <span>Đăng Ký Thêm Chi Nhánh</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {branches.map((b) => (
              <div key={b.id} className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-surface-container pb-2">
                  <span className="font-data-mono font-bold text-primary text-label-sm">{b.id}</span>
                  <span className="px-2 py-0.5 rounded text-label-xs font-bold bg-emerald-100 text-emerald-800">
                    {b.status}
                  </span>
                </div>

                <div>
                  <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">{b.name}</h3>
                  <p className="text-body-sm text-secondary mt-1">{b.address}</p>
                </div>

                <div className="space-y-1.5 text-body-sm pt-2 border-t border-surface-container">
                  <div className="flex justify-between">
                    <span className="text-secondary">Mức cảnh báo triều:</span>
                    <span className="font-semibold text-red-600">{b.floodLevel}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Quân số trực chiến:</span>
                    <span className="font-semibold text-on-surface">{b.techniciansCount} thợ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Phương tiện:</span>
                    <span className="font-medium text-on-surface text-right max-w-[180px]">{b.trucks}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-secondary">Hotline chi nhánh:</span>
                    <span className="font-data-mono text-primary font-bold">{b.hotline}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => onShowToast('Điều Phối Trạm', `Đã chuyển đổi ca trực chiến tại ${b.name}`)}
                    className="w-full py-1.5 bg-surface-container text-on-surface rounded font-label-sm font-bold hover:bg-surface-container-high transition-all"
                  >
                    Xem Bản Đồ & Trực Chiến
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 2: Technicians */}
      {activeTab === 'TECHNICIANS' && (
        <div className="space-y-space-md">
          <div className="flex items-center justify-between">
            <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
              Danh Sách Kỹ Thuật Viên Cơ Động
            </h2>
            <button
              onClick={() => onShowToast('Thêm KTV', 'Đã mở mẫu đăng ký eKYC thợ kỹ thuật mới')}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-on-primary rounded text-label-sm font-semibold hover:bg-primary/90 transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[16px]">person_add</span>
              <span>Thêm Kỹ Thuật Viên Mới</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg">
            {technicians.map((t) => (
              <div key={t.id} className="p-space-lg rounded-xl bg-surface-container-lowest border border-surface-container shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                      {t.name.split(' ').pop()?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-on-surface text-body-md">{t.name}</div>
                      <div className="text-label-xs text-secondary font-data-mono">{t.id} • {t.phone}</div>
                    </div>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded text-label-xs font-bold ${
                      t.status === 'AVAILABLE'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {t.status === 'AVAILABLE' ? 'Sẵn sàng' : 'Đang bận ca'}
                  </span>
                </div>

                <div className="p-2.5 bg-surface-container-low rounded text-body-sm space-y-1">
                  <div className="text-label-xs font-bold text-secondary uppercase">Trạm phân bổ: {t.branch}</div>
                  <div className="text-on-surface font-medium">{t.specialty}</div>
                  <div className="text-label-xs text-secondary italic">{t.statusText}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center text-body-sm pt-1">
                  <div className="p-2 bg-surface-container-low/50 rounded">
                    <span className="text-label-xs text-secondary">Số ca hôm nay:</span>
                    <div className="font-bold text-on-surface font-data-mono">{t.jobsToday} ca</div>
                  </div>
                  <div className="p-2 bg-surface-container-low/50 rounded">
                    <span className="text-label-xs text-secondary">Điểm CSAT:</span>
                    <div className="font-bold text-blue-700 font-data-mono flex items-center justify-center gap-1">
                      <span>{t.csat}</span>
                      <span className="text-amber-500 text-xs">⭐</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Earnings & PayOS Wallet */}
      {activeTab === 'EARNINGS' && (
        <div className="p-space-lg bg-surface-container-lowest rounded-xl border border-surface-container shadow-xs space-y-space-md">
          <div className="flex items-center justify-between border-b border-surface-container pb-3">
            <div>
              <h2 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                Ví Doanh Thu & Cổng Thanh Toán PayOS NAPAS 24/7
              </h2>
              <span className="text-body-sm text-secondary">
                Tài khoản thụ hưởng: Vietcombank - 1029482991 (LÊ TUẤN HƯNG) • Đã xác thực eKYC
              </span>
            </div>
            <button
              onClick={() => onSelectScreen('payouts')}
              className="px-4 py-2 bg-primary text-on-primary rounded font-label-md font-bold hover:bg-primary/90 transition-all shadow-xs"
            >
              Rút Tiền Về Ngân Hàng
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
            <div className="p-4 bg-surface-container-low rounded-lg">
              <span className="text-secondary text-label-sm">Số dư khả dụng để rút:</span>
              <div className="text-2xl font-bold font-data-mono text-emerald-700 mt-1">22.400.000 đ</div>
              <span className="text-label-xs text-secondary">Chuyển khoản tức thì qua Napas 24/7</span>
            </div>

            <div className="p-4 bg-surface-container-low rounded-lg">
              <span className="text-secondary text-label-sm">Tiền ký quỹ an toàn (Holdback):</span>
              <div className="text-2xl font-bold font-data-mono text-on-surface mt-1">5.000.000 đ</div>
              <span className="text-label-xs text-secondary">Bảo đảm xử lý khiếu nại khách hàng</span>
            </div>

            <div className="p-4 bg-surface-container-low rounded-lg">
              <span className="text-secondary text-label-sm">Tổng ví gara:</span>
              <div className="text-2xl font-bold font-data-mono text-on-surface mt-1">27.400.000 đ</div>
              <span className="text-label-xs text-secondary">Khớp lệnh 100% mã PayOS Webhook</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
