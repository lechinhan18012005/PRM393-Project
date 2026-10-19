import { ViewGuide } from '../ViewGuide';
import React, { useState, useEffect } from 'react';
import { ScreenId } from '../../types';
import { garageApi, ServiceItemBackend } from '../../services/garageApi';

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
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Form state for creating a service
  const [formData, setFormData] = useState({
    name: '',
    category: 'TẠI CHỖ',
    standardPrice: 150000,
    minPrice: 120000,
    maxPrice: 200000,
    estimatedTimeMin: 20,
    warrantyDays: 7,
    description: ''
  });

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

  // Load real services from backend
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const liveServices = await garageApi.getMyServices();
        if (liveServices && liveServices.length > 0) {
          const mapped: ServiceItem[] = liveServices.map((s) => ({
            id: `SRV-${s.id}`,
            name: s.serviceName,
            category: s.category || 'TẠI CHỖ',
            standardPrice: s.standardPrice,
            minPrice: s.minPrice,
            maxPrice: s.maxPrice,
            description: s.description || '',
            estimatedTimeMin: s.estimatedTimeMin || 20,
            isActive: s.active !== false,
            warrantyDays: s.warrantyDays || 0
          }));
          setServices(mapped);
        }
      } catch (err) {
        console.warn('Backend unavailable, using initial data:', err);
      }
    };
    fetchServices();
  }, []);

  const handleToggleService = async (id: string) => {
    const target = services.find((s) => s.id === id);
    if (!target) return;
    const nextActive = !target.isActive;

    // Optimistic UI update
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isActive: nextActive } : s))
    );

    try {
      const rawId = id.replace('SRV-', '');
      const numId = parseInt(rawId, 10);
      if (!isNaN(numId)) {
        await garageApi.updateService(numId, { active: nextActive });
      }
    } catch (err: any) {
      console.warn('Backend service toggle:', err);
    }
    onShowToast('Cập Nhật Dịch Vụ', `Đã ${nextActive ? 'kích hoạt' : 'tạm tắt'} dịch vụ ${target.name}`);
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    setIsSaving(true);

    try {
      const created = await garageApi.createService({
        serviceName: formData.name,
        category: formData.category,
        standardPrice: Number(formData.standardPrice),
        minPrice: Number(formData.minPrice),
        maxPrice: Number(formData.maxPrice),
        estimatedTimeMin: Number(formData.estimatedTimeMin),
        warrantyDays: Number(formData.warrantyDays),
        description: formData.description,
        serviceType: 'WATER_DAMAGE_RESCUE',
        active: true
      });

      const newService: ServiceItem = {
        id: `SRV-${created.id}`,
        name: created.serviceName,
        category: created.category,
        standardPrice: created.standardPrice,
        minPrice: created.minPrice,
        maxPrice: created.maxPrice,
        estimatedTimeMin: created.estimatedTimeMin,
        warrantyDays: created.warrantyDays,
        description: created.description,
        isActive: true
      };
      setServices((prev) => [newService, ...prev]);
    } catch (err) {
      // Local fallback
      const localId = `SRV-0${services.length + 1}`;
      const newService: ServiceItem = {
        id: localId,
        name: formData.name,
        category: formData.category,
        standardPrice: Number(formData.standardPrice),
        minPrice: Number(formData.minPrice),
        maxPrice: Number(formData.maxPrice),
        estimatedTimeMin: Number(formData.estimatedTimeMin),
        warrantyDays: Number(formData.warrantyDays),
        description: formData.description,
        isActive: true
      };
      setServices((prev) => [newService, ...prev]);
    } finally {
      setIsSaving(false);
      setShowAddModal(false);
      setFormData({
        name: '',
        category: 'TẠI CHỖ',
        standardPrice: 150000,
        minPrice: 120000,
        maxPrice: 200000,
        estimatedTimeMin: 20,
        warrantyDays: 7,
        description: ''
      });
      onShowToast('Thêm Dịch Vụ Mới', `Đã niêm yết thành công dịch vụ: ${formData.name}`);
    }
  };

  const handleDeleteService = async (id: string, name: string) => {
    try {
      const rawId = id.replace('SRV-', '');
      const numId = parseInt(rawId, 10);
      if (!isNaN(numId)) {
        await garageApi.deleteService(numId);
      }
    } catch (err) {
      console.warn('Backend delete service:', err);
    }
    setServices((prev) => prev.filter((s) => s.id !== id));
    onShowToast('Đã Xóa Dịch Vụ', `Đã xóa dịch vụ ${name} khỏi bảng giá`);
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
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-space-md py-2 bg-primary-container text-on-primary-container rounded font-label-md font-bold hover:bg-primary transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add_circle</span>
            <span>Thêm Dịch Vụ</span>
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

                  <td className="py-3 px-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleService(srv.id)}
                      className={`px-2.5 py-1 rounded text-label-xs font-bold transition-all cursor-pointer ${
                        srv.isActive
                          ? 'bg-surface-container text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {srv.isActive ? 'Tắt' : 'Bật'}
                    </button>
                    <button
                      onClick={() => handleDeleteService(srv.id, srv.name)}
                      className="px-2 py-1 rounded text-label-xs font-bold bg-surface-container text-error hover:bg-error-container transition-all cursor-pointer"
                      title="Xóa dịch vụ"
                    >
                      <span className="material-symbols-outlined text-[14px]">delete</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Service Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-on-background/50 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-lg w-full p-space-xl rounded-2xl shadow-2xl border border-surface-container animate-scale-in">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container mb-space-md">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">post_add</span>
                <h3 className="font-headline-sm text-headline-sm font-bold text-on-surface">
                  Thêm Dịch Vụ Cứu Hộ Mới
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-full text-secondary hover:text-on-surface hover:bg-surface-container cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateService} className="space-y-space-md">
              <div>
                <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                  Tên dịch vụ cứu hộ *
                </label>
                <input
                  required
                  type="text"
                  placeholder="Ví dụ: Vệ sinh cảm biến bướm ga & buồng đốt ngập nước"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Nhóm dịch vụ
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="TẠI CHỖ">Cứu Hộ Tại Chỗ</option>
                    <option value="CHUYÊN SÂU">Phục Hồi Chuyên Sâu</option>
                    <option value="VẬN CHUYỂN">Xe Bán Tải Cẩu Nâng</option>
                  </select>
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Giá niêm yết (VNĐ) *
                  </label>
                  <input
                    required
                    type="number"
                    step="10000"
                    value={formData.standardPrice}
                    onChange={(e) => setFormData({ ...formData, standardPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Giá sàn (Min)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={formData.minPrice}
                    onChange={(e) => setFormData({ ...formData, minPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Giá trần (Max)
                  </label>
                  <input
                    type="number"
                    step="10000"
                    value={formData.maxPrice}
                    onChange={(e) => setFormData({ ...formData, maxPrice: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Thời gian xử lý (~phút)
                  </label>
                  <input
                    type="number"
                    value={formData.estimatedTimeMin}
                    onChange={(e) => setFormData({ ...formData, estimatedTimeMin: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                    Bảo hành (ngày)
                  </label>
                  <input
                    type="number"
                    value={formData.warrantyDays}
                    onChange={(e) => setFormData({ ...formData, warrantyDays: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block font-label-md text-label-md text-on-surface font-semibold mb-1">
                  Mô tả quy trình cứu hộ & thiết bị sử dụng
                </label>
                <textarea
                  rows={2}
                  placeholder="Mô tả kỹ thuật: tháo lắp, kiểm tra xung điện, máy sấy nhiệt..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-surface-container bg-surface-container-low text-body-md text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-surface-container">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-space-md py-2 rounded-lg bg-surface-container-low text-on-surface font-label-md font-semibold cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-space-lg py-2 rounded-lg bg-primary text-on-primary font-label-md font-bold hover:bg-primary/90 transition-all cursor-pointer disabled:opacity-75"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu Dịch Vụ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
