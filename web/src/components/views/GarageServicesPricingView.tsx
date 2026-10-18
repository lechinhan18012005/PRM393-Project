import { ViewGuide } from '../ViewGuide';
import React, { useState } from 'react';
import { ScreenId } from '../../types';

interface GarageServicesPricingViewProps {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

interface ServiceItem {
  id: string;
  name: string;
  category: string;
  standardPrice: number;
  minPrice: number;
  maxPrice: number;
  description: string;
  estimatedTimeMin: number;
  isActive: boolean;
  warrantyDays: number;
}

export const GarageServicesPricingView: React.FC<GarageServicesPricingViewProps> = ({
  onSelectScreen,
  onShowToast
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'SRV-01',
      name: 'Hút nước bugi & nổ máy tại chỗ (Xe số / Xe ga)',
      category: 'TẠI CHỖ',
      standardPrice: 150000,
      minPrice: 120000,
      maxPrice: 200000,
      description: 'Tháo bugi, xả nước trong buồng đốt xylanh, sấy khô chụp bugi và kích nổ máy',
      estimatedTimeMin: 15,
      isActive: true,
      warrantyDays: 3
    },
    {
      id: 'SRV-02',
      name: 'Xả bình xăng con & thổi sạch bầu lọc gió ẩm',
      category: 'TẠI CHỖ',
      standardPrice: 180000,
      minPrice: 150000,
      maxPrice: 220000,
      description: 'Tháo đáy chế hòa khí xả hết nước đọng, vệ sinh tấm mút lọc gió ngập nước',
      estimatedTimeMin: 20,
      isActive: true,
      warrantyDays: 3
    },
    {
      id: 'SRV-03',
      name: 'Kích nổ bình ắc quy / Câu bình điện xe tay ga',
      category: 'TẠI CHỖ',
      standardPrice: 100000,
      minPrice: 80000,
      maxPrice: 130000,
      description: 'Dùng bộ kích điện Lithium di động hỗ trợ xe hết bình do đề liên tục khi ngập',
      estimatedTimeMin: 10,
      isActive: true,
      warrantyDays: 1
    },
    {
      id: 'SRV-04',
      name: 'Súc lốc máy 3 lần + Thay nhớt chuyên dụng',
      category: 'CHUYÊN SÂU',
      standardPrice: 420000,
      minPrice: 380000,
      maxPrice: 550000,
      description: 'Xả nhớt tạo bơ sữa, dùng dầu súc rửa chuyên dụng 2-3 lượt rồi châm nhớt xe mới 100%',
      estimatedTimeMin: 35,
      isActive: true,
      warrantyDays: 7
    },
    {
      id: 'SRV-05',
      name: 'Vệ sinh bộ nồi truyền động xe ga ngập nước',
      category: 'CHUYÊN SÂU',
      standardPrice: 280000,
      minPrice: 250000,
      maxPrice: 350000,
      description: 'Mở lốc nồi, vệ sinh dây curoa, bi nồi, chuông và bố ba càng tránh trượt bánh giật cục',
      estimatedTimeMin: 30,
      isActive: true,
      warrantyDays: 14
    },
    {
      id: 'SRV-06',
      name: 'Kiểm tra & Sấy khô ECU / IC / Cảm biến EFI',
      category: 'CHUYÊN SÂU',
      standardPrice: 350000,
      minPrice: 300000,
      maxPrice: 480000,
      description: 'Đo xung cảm biến O2, TPS, sấy khô giắc nối điện chống chạm chập nổ cầu chì',
      estimatedTimeMin: 40,
      isActive: true,
      warrantyDays: 30
    },
    {
      id: 'SRV-07',
      name: 'Xe bán tải cẩu nâng xe ngập về trạm (< 5km)',
      category: 'VẬN CHUYỂN',
      standardPrice: 250000,
      minPrice: 220000,
      maxPrice: 300000,
      description: 'Xe bán tải thùng sàn nâng đưa xe an toàn qua đoạn nước ngập sâu trên 50cm',
      estimatedTimeMin: 25,
      isActive: true,
      warrantyDays: 0
    }
  ]);

  const handleToggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: !s.isActive } : s))
    );
    const target = services.find((s) => s.id === id);
    onShowToast('Cập Nhật Dịch Vụ', `Đã ${target?.isActive ? 'tạm tắt' : 'kích hoạt'} dịch vụ ${target?.name}`);
  };

  const filteredServices = services.filter((s) => {
    if (selectedCategory !== 'ALL' && s.category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md border-b border-surface-container pb-space-md">
        <div>

          <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold mt-1">Dịch vụ & bảng giá</h1>
          <ViewGuide><p className="font-body-md text-body-md text-secondary">
            Mức giá minh bạch bảo vệ khách hàng, tránh khiếu nại tranh chấp và đảm bảo tiêu chuẩn chất lượng.
          </p></ViewGuide>
        </div>

        <div className="flex items-center gap-space-sm">
          <button
            onClick={() => onSelectScreen('owner-dashboard')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-surface-container text-on-surface rounded font-label-md font-semibold hover:bg-surface-container-high transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Về Dashboard Gara</span>
          </button>
          <button
            onClick={() => onShowToast('Lưu Bảng Giá', 'Đã đồng bộ biểu giá niêm yết lên hệ thống điều phối toàn sàn')}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary text-on-primary rounded font-label-md font-semibold hover:bg-primary/90 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">save</span>
            <span>Lưu & Đồng Bộ Bảng Giá</span>
          </button>
        </div>
      </div>

      {/* Flood & Night Surcharge Advisory Notice */}
      <div className="p-space-lg rounded-xl bg-amber-50 border border-amber-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
        <div className="flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl mt-0.5">policy</span>
          <div>
            <div className="font-bold text-amber-900 text-body-md">Quy Định Phụ Thu Mùa Nước Ngập & Đêm Khuya</div>
            <p className="text-body-sm text-amber-800 mt-0.5">
              Phụ thu ca đêm (22:00 - 05:00): +30.000 đ/ca • Phụ thu ngập sâu &gt; 40cm: Sàn tài trợ trực tiếp 50.000 đ/ca qua ví Gara.
              Nghiêm cấm kỹ thuật viên tự ý đòi thêm tiền mặt ngoài ứng dụng.
            </p>
          </div>
        </div>

        <span className="px-3 py-1 bg-amber-200 text-amber-900 font-bold text-label-xs rounded-full whitespace-nowrap">
          ĐANG ÁP DỤNG MÙA TRIỀU CƯỜNG
        </span>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 border-b border-surface-container pb-2">
        {['ALL', 'TẠI CHỖ', 'CHUYÊN SÂU', 'VẬN CHUYỂN'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-lg font-label-md font-semibold transition-all ${
              selectedCategory === cat
                ? 'bg-primary text-on-primary shadow-xs'
                : 'text-secondary hover:text-on-surface hover:bg-surface-container-low'
            }`}
          >
            {cat === 'ALL' && 'Tất Cả Dịch Vụ'}
            {cat === 'TẠI CHỖ' && 'Cứu Hộ Tại Chỗ (Bugi / Xăng / Bình)'}
            {cat === 'CHUYÊN SÂU' && 'Phục Hồi Ngập Nước (Nhớt / Nồi / IC)'}
            {cat === 'VẬN CHUYỂN' && 'Xe Bán Tải Cẩu Nâng'}
          </button>
        ))}
      </div>

      {/* Services List Table */}
      <div className="bg-surface-container-lowest rounded-xl border border-surface-container overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-surface-container font-label-sm text-secondary uppercase tracking-wider">
                <th className="py-3 px-4">Mã & Tên Dịch Vụ</th>
                <th className="py-3 px-4">Nhóm</th>
                <th className="py-3 px-4 text-right">Giá Chuẩn Niêm Yết</th>
                <th className="py-3 px-4 text-center">Khung Cho Phép (Min - Max)</th>
                <th className="py-3 px-4 text-center">Thời Gian Xử Lý</th>
                <th className="py-3 px-4 text-center">Bảo Hành</th>
                <th className="py-3 px-4 text-center">Trạng Thái</th>
                <th className="py-3 px-4 text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container text-body-sm">
              {filteredServices.map((srv) => (
                <tr key={srv.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-3 px-4 max-w-xs">
                    <div className="font-bold text-on-surface">{srv.name}</div>
                    <div className="text-label-xs text-secondary line-clamp-1">{srv.description}</div>
                  </td>

                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded text-label-xs font-semibold bg-surface-container text-on-surface">
                      {srv.category}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right font-data-mono font-bold text-primary">
                    {srv.standardPrice.toLocaleString('vi-VN')} đ
                  </td>

                  <td className="py-3 px-4 text-center font-data-mono text-label-xs text-secondary">
                    {srv.minPrice.toLocaleString('vi-VN')} - {srv.maxPrice.toLocaleString('vi-VN')} đ
                  </td>

                  <td className="py-3 px-4 text-center font-data-mono">
                    ~{srv.estimatedTimeMin} phút
                  </td>

                  <td className="py-3 px-4 text-center">
                    {srv.warrantyDays > 0 ? (
                      <span className="text-emerald-700 font-bold">{srv.warrantyDays} ngày</span>
                    ) : (
                      <span className="text-secondary">-</span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-label-xs font-bold ${
                        srv.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {srv.isActive ? 'Đang Nhận' : 'Tạm Dừng'}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggleService(srv.id)}
                      className={`px-2.5 py-1 rounded text-label-xs font-bold transition-all ${
                        srv.isActive
                          ? 'bg-surface-container text-red-600 hover:bg-red-50'
                          : 'bg-primary text-on-primary hover:bg-primary/90'
                      }`}
                    >
                      {srv.isActive ? 'Tắt' : 'Bật'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
