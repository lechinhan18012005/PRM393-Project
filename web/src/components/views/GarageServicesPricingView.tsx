import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { ServiceItemBackend, PriceCeilingBackend } from '../../services/garageApi';
import { request, ApiError } from '../../services/managementApi';
import { Plus, Search, Wrench, CheckCircle2, Layers, ShieldAlert, Bike, Tag } from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel, GarageDrawer, GarageModal, GarageError } from '../garage/GarageUI';

interface Props {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}

export const STANDARD_CATEGORIES = [
  { code: 'BUG_XUC', label: 'BUG_XUC - Sấy bugi, xả buồng đốt & vệ sinh IC' },
  { code: 'THAY_NHOT', label: 'THAY_NHOT - Thay nhớt máy / nhớt hộp số láp' },
  { code: 'LOC_GIO', label: 'LOC_GIO - Vệ sinh / thay lọc gió ngập nước' },
  { code: 'HE_THONG_DIEN', label: 'HE_THONG_DIEN - Xịt khô & kiểm tra điện / ECU' },
  { code: 'HE_THONG_XANG', label: 'HE_THONG_XANG - Xả cặn bình xăng & kim phun FI' },
  { code: 'KEO_XE', label: 'KEO_XE - Kéo xe về trạm gara cứu hộ' },
  { code: 'VUOT_NGAP', label: 'VUOT_NGAP - Chở người & xe vượt vùng ngập' },
  { code: 'BAO_DUONG_TOAN_DIEN', label: 'BAO_DUONG_TOAN_DIEN - Gói phục hồi xe ngập toàn diện' },
  { code: 'KHAC', label: 'Khác (Tự nhập mã nhóm kỹ thuật...)' }
];

export const STANDARD_UNITS = [
  { value: 'lượt', label: 'lượt (Công kỹ thuật, kiểm tra, sấy khô)' },
  { value: 'bình', label: 'bình (Nhớt máy, dung dịch phụ gia)' },
  { value: 'cái', label: 'cái (Bugi, lọc gió, cầu chì, rơ-le)' },
  { value: 'gói', label: 'gói (Gói dịch vụ trọn gói, combo)' },
  { value: 'km', label: 'km (Cự ly vận chuyển / kéo xe)' },
  { value: 'bộ', label: 'bộ (Bộ ron, phụ tùng thay mới)' },
  { value: 'KHAC', label: 'Khác (Tự nhập đơn vị tính...)' }
];

export interface ServiceFormErrors {
  serviceName?: string;
  category?: string;
  unit?: string;
  standardPrice?: string;
  minPrice?: string;
  maxPrice?: string;
  estimatedTimeMin?: string;
  warrantyDays?: string;
  description?: string;
}

export function formatNumberWithDots(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '';
  const clean = String(val).replace(/\D/g, '');
  if (!clean) return '';
  return clean.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseFormattedNumber(val: string | undefined | null): number {
  if (!val) return 0;
  const clean = String(val).replace(/\./g, '').replace(/,/g, '').trim();
  return Number(clean) || 0;
}

export function mapBackendErrorToFields(err: unknown): {
  fieldErrors: ServiceFormErrors;
  generalError?: string;
} {
  const result: ServiceFormErrors = {};
  let generalError: string | undefined;

  if (err instanceof ApiError) {
    // 1. Nếu backend trả về validationErrors (từ Spring Boot Bean Validation)
    if (err.validationErrors && Object.keys(err.validationErrors).length > 0) {
      Object.entries(err.validationErrors).forEach(([field, msg]) => {
        if (
          [
            'serviceName',
            'category',
            'unit',
            'standardPrice',
            'minPrice',
            'maxPrice',
            'estimatedTimeMin',
            'warrantyDays',
            'description'
          ].includes(field)
        ) {
          result[field as keyof ServiceFormErrors] = msg;
        } else {
          generalError = msg;
        }
      });
      return {
        fieldErrors: result,
        generalError: Object.keys(result).length === 0 ? (generalError || 'Dữ liệu không hợp lệ.') : undefined
      };
    }

    // 2. Nếu là BadRequestException từ nghiệp vụ logic
    const msg = err.message || '';
    let matched = false;

    if (msg.includes('đã tồn tại') || msg.toLowerCase().includes('tên dịch vụ')) {
      result.serviceName = msg;
      matched = true;
    }
    if (msg.includes('giá trần') || msg.includes('vượt quá mức giá trần') || msg.includes('trần quy định')) {
      result.standardPrice = msg;
      matched = true;
    }
    if (msg.includes('Giá chuẩn') || msg.includes('standardPrice')) {
      result.standardPrice = msg;
      matched = true;
    }
    if (msg.includes('tối thiểu') || msg.includes('minPrice') || msg.includes('Giá sàn') || msg.includes('sàn')) {
      result.minPrice = msg;
      matched = true;
    }
    if (msg.includes('tối đa') || msg.includes('maxPrice') || msg.includes('50.000.000')) {
      result.maxPrice = msg;
      matched = true;
    }
    if (msg.toLowerCase().includes('mã nhóm') || msg.toLowerCase().includes('category')) {
      result.category = msg;
      matched = true;
    }
    if (msg.toLowerCase().includes('đơn vị') || msg.toLowerCase().includes('unit')) {
      result.unit = msg;
      matched = true;
    }
    if (msg.toLowerCase().includes('thời gian') || msg.toLowerCase().includes('phút')) {
      result.estimatedTimeMin = msg;
      matched = true;
    }
    if (msg.toLowerCase().includes('bảo hành') || msg.toLowerCase().includes('ngày')) {
      result.warrantyDays = msg;
      matched = true;
    }

    if (!matched) {
      generalError = msg;
    }

    return { fieldErrors: result, generalError };
  }

  return {
    fieldErrors: {},
    generalError: err instanceof Error ? err.message : 'Có lỗi xảy ra khi lưu dịch vụ.'
  };
}

export function GarageServicesPricingView(_props: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [vehicleFilter, setVehicleFilter] = useState('ALL');
  const [services, setServices] = useState<ServiceItemBackend[]>([]);
  const [ceilings, setCeilings] = useState<PriceCeilingBackend[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ServiceItemBackend | null>(null);

  // Form states for ceiling helper
  const [formServiceType, setFormServiceType] = useState('REPAIR_ONSITE');
  const [formCategoryType, setFormCategoryType] = useState('LABOR');
  const [formCategory, setFormCategory] = useState('BUG_XUC');
  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>('BUG_XUC');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [selectedUnit, setSelectedUnit] = useState<string>('lượt');
  const [customUnit, setCustomUnit] = useState<string>('');
  const [formattedStandardPrice, setFormattedStandardPrice] = useState<string>('');
  const [formattedMinPrice, setFormattedMinPrice] = useState<string>('');
  const [formattedMaxPrice, setFormattedMaxPrice] = useState<string>('');
  const [fieldErrors, setFieldErrors] = useState<ServiceFormErrors>({});
  const [formError, setFormError] = useState('');

  function clearFieldError(field: keyof ServiceFormErrors) {
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  async function load() {
    try {
      const [serviceList, ceilingList] = await Promise.all([
        request<ServiceItemBackend[]>('/garages/services'),
        request<PriceCeilingBackend[]>('/price-ceilings').catch(() => [])
      ]);
      setServices(serviceList);
      setCeilings(ceilingList);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function change(path: string, method: string, body?: unknown) {
    setBusy(true);
    setError('');
    try {
      await request(path, method, body);
      await load();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  function getMatchingCeiling(serviceType: string, category: string, itemCategoryType: string): number | null {
    if (!ceilings.length) return null;
    const exact = ceilings.find(
      (c) =>
        c.serviceType === serviceType &&
        c.category.toLowerCase() === category.toLowerCase() &&
        c.itemCategoryType === itemCategoryType
    );
    if (exact) return exact.maxAllowedPrice;

    const byType = ceilings.find(
      (c) => c.serviceType === serviceType && c.itemCategoryType === itemCategoryType
    );
    if (byType) return byType.maxAllowedPrice;

    const fallback = ceilings.find((c) => c.serviceType === serviceType);
    return fallback ? fallback.maxAllowedPrice : null;
  }

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const serviceName = String(data.serviceName || '').trim();
    const standardPrice = parseFormattedNumber(formattedStandardPrice);
    const minPrice = formattedMinPrice ? parseFormattedNumber(formattedMinPrice) : Math.round(standardPrice * 0.8);
    const maxPrice = formattedMaxPrice ? parseFormattedNumber(formattedMaxPrice) : Math.round(standardPrice * 1.3);
    const estimatedTimeMin = Number(data.estimatedTimeMin || 0);
    const warrantyDays = Number(data.warrantyDays || 0);
    const description = String(data.description || '').trim();

    const finalCategory = (selectedCategoryCode === 'KHAC' ? customCategory : selectedCategoryCode).trim().toUpperCase();
    const finalUnit = (selectedUnit === 'KHAC' ? customUnit : selectedUnit).trim();

    const errors: ServiceFormErrors = {};

    // 1. Tên dịch vụ
    if (!serviceName) {
      errors.serviceName = 'Tên dịch vụ không được để trống';
    } else if (serviceName.length < 2 || serviceName.length > 150) {
      errors.serviceName = 'Tên dịch vụ phải từ 2 đến 150 ký tự';
    }

    // 2. Mã nhóm kỹ thuật
    if (!finalCategory) {
      errors.category = 'Vui lòng chọn hoặc nhập mã nhóm kỹ thuật';
    } else if (!/^[A-Za-z0-9_]+$/.test(finalCategory)) {
      errors.category = 'Mã nhóm chỉ gồm chữ cái, số và dấu gạch dưới (VD: BUG_XUC)';
    }

    // 3. Đơn vị tính
    if (!finalUnit) {
      errors.unit = 'Vui lòng chọn hoặc nhập đơn vị tính';
    } else if (finalUnit.length > 30) {
      errors.unit = 'Đơn vị tính không quá 30 ký tự';
    }

    // 4. Giá chuẩn
    if (!formattedStandardPrice || !standardPrice || standardPrice < 1000) {
      errors.standardPrice = 'Giá chuẩn không được để trống và tối thiểu là 1.000 đ';
    } else if (standardPrice > 50000000) {
      errors.standardPrice = 'Giá chuẩn không được vượt quá 50.000.000 đ';
    }

    // 5. Giá tối thiểu (sàn)
    if (minPrice < 1000) {
      errors.minPrice = 'Giá sàn tối thiểu là 1.000 đ';
    } else if (minPrice > standardPrice) {
      errors.minPrice = 'Giá sàn không được lớn hơn giá chuẩn';
    }

    // 6. Giá tối đa (trần)
    if (maxPrice < standardPrice) {
      errors.maxPrice = 'Giá trần không được nhỏ hơn giá chuẩn';
    } else if (maxPrice > 50000000) {
      errors.maxPrice = 'Giá trần không được vượt quá 50.000.000 đ';
    }

    // 7. Giá trần Sàn (Price ceiling check)
    const ceilingLimit = getMatchingCeiling(
      String(data.serviceType),
      finalCategory,
      String(data.itemCategoryType)
    );
    if (ceilingLimit) {
      if (standardPrice > ceilingLimit) {
        errors.standardPrice = `Đơn giá vượt quá mức giá trần quy định của sàn (${ceilingLimit.toLocaleString('vi-VN')} đ)`;
      }
      if (maxPrice > ceilingLimit) {
        errors.maxPrice = `Giá trần vượt quá mức trần tối đa của sàn (${ceilingLimit.toLocaleString('vi-VN')} đ)`;
      }
    }

    // 8. Thời gian ước tính
    const rawEstimatedTime = data.estimatedTimeMin;
    if (rawEstimatedTime === undefined || String(rawEstimatedTime).trim() === '') {
      errors.estimatedTimeMin = 'Vui lòng nhập thời gian xử lý ước tính';
    } else if (estimatedTimeMin < 1 || estimatedTimeMin > 1440) {
      errors.estimatedTimeMin = 'Thời gian ước tính từ 1 đến 1440 phút (24h)';
    }

    // 9. Thời hạn bảo hành
    const rawWarrantyDays = data.warrantyDays;
    if (rawWarrantyDays === undefined || String(rawWarrantyDays).trim() === '') {
      errors.warrantyDays = 'Vui lòng nhập thời hạn bảo hành (nhập 0 nếu không bảo hành)';
    } else if (warrantyDays < 0 || warrantyDays > 365) {
      errors.warrantyDays = 'Thời hạn bảo hành từ 0 đến 365 ngày';
    }

    // 10. Mô tả
    if (description.length > 500) {
      errors.description = 'Mô tả không được vượt quá 500 ký tự';
    }

    // Nếu frontend validation phát hiện lỗi: hiển thị trực tiếp dưới từng ô nhập
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError('');
      return;
    }

    setFieldErrors({});
    setFormError('');
    setBusy(true);

    const body = {
      ...data,
      serviceName,
      category: finalCategory,
      unit: finalUnit,
      standardPrice,
      minPrice,
      maxPrice,
      estimatedTimeMin,
      warrantyDays,
      active: editing?.active ?? true
    };

    try {
      await request(
        editing ? `/garages/services/${editing.id}` : '/garages/services',
        editing ? 'PUT' : 'POST',
        body
      );
      await load();
      setEditing(null);
      setShowEditor(false);
      form.reset();
      _props.onShowToast(
        editing ? 'Cập nhật thành công' : 'Thêm mới thành công',
        `Dịch vụ '${serviceName}' đã được cập nhật vào bảng giá gara.`
      );
    } catch (err: unknown) {
      const { fieldErrors: backendErrors, generalError } = mapBackendErrorToFields(err);
      if (Object.keys(backendErrors).length > 0) {
        setFieldErrors(backendErrors);
      }
      if (generalError && Object.keys(backendErrors).length === 0) {
        setFormError(generalError);
      } else {
        setFormError('');
      }
    } finally {
      setBusy(false);
    }
  }

  const currentCeiling = getMatchingCeiling(formServiceType, formCategory, formCategoryType);

  return (
    <section className="garage-portal">
      <GarageHeading
        title="Dịch vụ & Bảng giá Cứu hộ"
        description="Niêm yết giá minh bạch theo quy định sàn, bảo vệ khách hàng và tối ưu điều phối đội thợ."
        action={
          <button
            className="garage-button primary"
            onClick={() => {
              setEditing(null);
              setFormServiceType('REPAIR_ONSITE');
              setFormCategoryType('LABOR');
              setSelectedCategoryCode('BUG_XUC');
              setCustomCategory('');
              setFormCategory('BUG_XUC');
              setSelectedUnit('lượt');
              setCustomUnit('');
              setFormattedStandardPrice('');
              setFormattedMinPrice('');
              setFormattedMaxPrice('');
              setFieldErrors({});
              setFormError('');
              setShowEditor(true);
            }}
          >
            <Plus size={16} />
            Thêm dịch vụ mới
          </button>
        }
      />
      <GarageError message={error} retry={() => void load()} />
      <div className="garage-stat-grid four">
        <GarageStat
          label="Tổng dịch vụ"
          value={services.length}
          detail="Trong danh mục hoạt động"
          icon={<Wrench size={18} />}
        />
        <GarageStat
          label="Đang phục vụ"
          value={services.filter((s) => s.active).length}
          detail="Đã kích hoạt cho thợ báo giá"
          icon={<CheckCircle2 size={18} />}
          accent="teal"
        />
        <GarageStat
          label="Nhóm nghiệp vụ"
          value={new Set(services.map((s) => s.category)).size}
          detail="Các chuyên mục cứu hộ"
          icon={<Layers size={18} />}
          accent="blue"
        />
        <GarageStat
          label="Trần giá bảo vệ"
          value={ceilings.length}
          detail="Quy định giá trần từ Admin"
          icon={<ShieldAlert size={18} />}
          accent="orange"
        />
      </div>

      <GaragePanel
        title="Bảng giá Cứu hộ Niêm yết"
        description="Phân loại chi phí rõ ràng theo công thợ, vật tư linh kiện và tương thích từng dòng xe máy"
      >
        <div className="garage-toolbar flex flex-wrap gap-2">
          <label className="garage-search flex-1 min-w-[200px]">
            <Search size={16} />
            <input
              aria-label="Tìm dịch vụ"
              placeholder="Tìm tên, nhóm dịch vụ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select
            aria-label="Lọc trạng thái dịch vụ"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang phục vụ</option>
            <option value="INACTIVE">Tạm tắt</option>
          </select>
          <select
            aria-label="Lọc theo dòng xe"
            value={vehicleFilter}
            onChange={(e) => setVehicleFilter(e.target.value)}
            className="border p-2 rounded"
          >
            <option value="ALL">Tất cả dòng xe</option>
            <option value="SCOOTER">Xe tay ga</option>
            <option value="MANUAL_CLUTCH">Xe số / Côn tay</option>
            <option value="ELECTRIC">Xe máy điện</option>
          </select>
        </div>

        <div className="garage-service-list">
          {services
            .filter((s) => {
              const matchQuery = `${s.serviceName} ${s.category} ${s.description || ''}`
                .toLocaleLowerCase('vi')
                .includes(query.toLocaleLowerCase('vi'));
              const matchFilter = filter === 'ALL' || s.active === (filter === 'ACTIVE');
              const matchVehicle =
                vehicleFilter === 'ALL' ||
                s.applicableVehicleType === 'ALL' ||
                s.applicableVehicleType === vehicleFilter;
              return matchQuery && matchFilter && matchVehicle;
            })
            .map((service) => (
              <article key={service.id} className="garage-service-row">
                <div className="garage-service-name">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-semibold">{service.serviceName}</h2>
                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      {service.itemCategoryType === 'PART'
                        ? 'Vật tư thay thế'
                        : service.itemCategoryType === 'PACKAGE'
                        ? 'Gói trọn gói'
                        : 'Tiền công kỹ thuật'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {service.applicableVehicleType === 'SCOOTER'
                        ? 'Xe tay ga'
                        : service.applicableVehicleType === 'MANUAL_CLUTCH'
                        ? 'Xe số / côn'
                        : service.applicableVehicleType === 'ELECTRIC'
                        ? 'Xe điện'
                        : 'Mọi dòng xe'}
                    </span>
                  </div>
                  <small className="text-gray-500">
                    Mã nhóm: {service.category} · Phân hệ:{' '}
                    {service.serviceType === 'TOWING'
                      ? 'Kéo xe'
                      : service.serviceType === 'CROSSING'
                      ? 'Vượt ngập'
                      : 'Sửa tại chỗ'}
                  </small>
                </div>
                <p className="font-semibold text-orange-600">
                  {service.standardPrice.toLocaleString('vi-VN')} đ / {service.unit} ·{' '}
                  <span className={service.active ? 'text-emerald-600' : 'text-gray-400'}>
                    {service.active ? 'Đang phục vụ' : 'Tạm tắt'}
                  </span>
                </p>
                <div className="garage-service-meta">
                  <p>{service.description || 'Chưa có mô tả kỹ thuật'}</p>
                  <small className="text-gray-500">
                    Khoảng giá: {service.minPrice.toLocaleString('vi-VN')} –{' '}
                    {service.maxPrice.toLocaleString('vi-VN')} đ · {service.estimatedTimeMin} phút · Bảo
                    hành {service.warrantyDays} ngày
                  </small>
                  {service.adminCeilingSnapshot && (
                    <small className="text-orange-700 bg-orange-50 px-2 py-0.5 rounded inline-block w-fit">
                      Trần giá quy định: {service.adminCeilingSnapshot.toLocaleString('vi-VN')} đ
                    </small>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={busy}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    onClick={() => {
                      setEditing(service);
                      setFormServiceType(service.serviceType || 'REPAIR_ONSITE');
                      setFormCategoryType(service.itemCategoryType || 'LABOR');

                      const isPreCat = STANDARD_CATEGORIES.some((cat) => cat.code === service.category && cat.code !== 'KHAC');
                      if (isPreCat) {
                        setSelectedCategoryCode(service.category);
                        setCustomCategory('');
                        setFormCategory(service.category);
                      } else {
                        setSelectedCategoryCode('KHAC');
                        setCustomCategory(service.category || '');
                        setFormCategory(service.category || '');
                      }

                      const isPreUnit = STANDARD_UNITS.some((u) => u.value === service.unit && u.value !== 'KHAC');
                      if (isPreUnit) {
                        setSelectedUnit(service.unit);
                        setCustomUnit('');
                      } else {
                        setSelectedUnit('KHAC');
                        setCustomUnit(service.unit || '');
                      }

                      setFormattedStandardPrice(formatNumberWithDots(service.standardPrice));
                      setFormattedMinPrice(service.minPrice ? formatNumberWithDots(service.minPrice) : '');
                      setFormattedMaxPrice(service.maxPrice ? formatNumberWithDots(service.maxPrice) : '');
                      setFieldErrors({});
                      setFormError('');

                      setShowEditor(true);
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    disabled={busy}
                    className="px-3 py-1 text-sm border rounded hover:bg-gray-50"
                    onClick={() =>
                      void change(`/garages/services/${service.id}`, 'PUT', {
                        ...service,
                        active: !service.active
                      })
                    }
                  >
                    {service.active ? 'Tạm tắt' : 'Bật'}
                  </button>
                  <button
                    disabled={busy}
                    className="px-3 py-1 text-sm border rounded text-rose-600 hover:bg-rose-50"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Ngừng cung cấp và lưu trữ an toàn dịch vụ '${service.serviceName}'? Toàn bộ lịch sử các báo giá cũ của khách hàng vẫn được bảo toàn tuyệt đối.`
                        )
                      )
                        void change(`/garages/services/${service.id}`, 'DELETE');
                    }}
                  >
                    Lưu trữ
                  </button>
                </div>
              </article>
            ))}
        </div>
        {services.length === 0 && <p className="text-gray-500 py-4">Chưa có dịch vụ nào trong bảng giá.</p>}
      </GaragePanel>

      {showEditor && (
        <GarageModal
          title={editing ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ cứu hộ'}
          description="Thiết lập đơn giá, chi phí vật tư và dòng xe áp dụng"
          onClose={() => {
            if (!busy) {
              setShowEditor(false);
              setFormError('');
              setFieldErrors({});
            }
          }}
        >
          <GarageError message={formError} />
          <form noValidate key={editing?.id ?? 'new'} onSubmit={save} className="garage-form space-y-4">
            <h2 className="text-xl font-bold">{editing ? 'Cập nhật dịch vụ' : 'Thêm mới vào bảng giá'}</h2>

            <label className="block">
              <span className="text-sm font-medium">
                Tên dịch vụ cứu hộ <span className="text-rose-500">*</span>
              </span>
              <input
                className={`w-full border rounded p-2 mt-1 transition-colors ${
                  fieldErrors.serviceName
                    ? 'border-rose-500 bg-rose-50/20 focus:border-rose-500 focus:ring-1 focus:ring-rose-500'
                    : 'border-gray-300'
                }`}
                name="serviceName"
                maxLength={150}
                defaultValue={editing?.serviceName}
                onChange={() => clearFieldError('serviceName')}
                placeholder="VD: Sấy bugi & xả buồng đốt ngập nước"
              />
              {fieldErrors.serviceName && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <span>⚠</span> {fieldErrors.serviceName}
                </p>
              )}
            </label>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium">Loại hình cứu hộ</span>
                <select
                  name="serviceType"
                  className="w-full border p-2 rounded mt-1 border-gray-300"
                  defaultValue={editing?.serviceType ?? 'REPAIR_ONSITE'}
                  onChange={(e) => setFormServiceType(e.target.value)}
                >
                  <option value="REPAIR_ONSITE">Sửa tại chỗ (On-site)</option>
                  <option value="TOWING">Kéo xe về xưởng (Towing)</option>
                  <option value="CROSSING">Chở vượt ngập (Crossing)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-medium">Phân loại chi phí</span>
                <select
                  name="itemCategoryType"
                  className="w-full border p-2 rounded mt-1 border-gray-300"
                  defaultValue={editing?.itemCategoryType ?? 'LABOR'}
                  onChange={(e) => setFormCategoryType(e.target.value)}
                >
                  <option value="LABOR">Tiền công thợ (Labor)</option>
                  <option value="PART">Vật tư / Phụ tùng (Part)</option>
                  <option value="PACKAGE">Gói trọn gói (Package)</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className="text-sm font-medium">Dòng xe áp dụng</span>
                <select
                  name="applicableVehicleType"
                  className="w-full border p-2 rounded mt-1 border-gray-300"
                  defaultValue={editing?.applicableVehicleType ?? 'ALL'}
                >
                  <option value="ALL">Tất cả các dòng xe</option>
                  <option value="SCOOTER">Xe tay ga (Scooter)</option>
                  <option value="MANUAL_CLUTCH">Xe số / Côn tay</option>
                  <option value="ELECTRIC">Xe máy điện</option>
                </select>
              </label>

              <div className="block">
                <span className="text-sm font-medium">
                  Mã nhóm kỹ thuật <span className="text-rose-500">*</span>
                </span>
                <select
                  className={`w-full border p-2 rounded mt-1 ${
                    fieldErrors.category ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                  }`}
                  value={selectedCategoryCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedCategoryCode(val);
                    const cat = val === 'KHAC' ? customCategory : val;
                    setFormCategory(cat);
                    clearFieldError('category');
                  }}
                >
                  {STANDARD_CATEGORIES.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {cat.label}
                    </option>
                  ))}
                </select>
                {selectedCategoryCode === 'KHAC' && (
                  <input
                    className={`w-full border rounded p-2 mt-2 bg-amber-50/50 ${
                      fieldErrors.category ? 'border-rose-500 bg-rose-50/20' : 'border-amber-300'
                    }`}
                    value={customCategory}
                    onChange={(e) => {
                      setCustomCategory(e.target.value);
                      setFormCategory(e.target.value);
                      clearFieldError('category');
                    }}
                    placeholder="Nhập mã nhóm tự định nghĩa (VD: PHUOC_XE, XAM_LOP...)"
                  />
                )}
                {fieldErrors.category && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <span>⚠</span> {fieldErrors.category}
                  </p>
                )}
              </div>
            </div>

            {currentCeiling && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-800 flex items-center gap-2">
                <ShieldAlert size={18} />
                <span>
                  Khung giá trần của sàn: <strong>{currentCeiling.toLocaleString('vi-VN')} đ</strong>.
                  Đơn giá niêm yết không được vượt quá mức này.
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <label className="block">
                <span className="text-sm font-medium">
                  Giá chuẩn (đ) <span className="text-rose-500">*</span>
                </span>
                <input
                  name="standardPrice"
                  type="text"
                  inputMode="numeric"
                  value={formattedStandardPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormattedStandardPrice(raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
                    clearFieldError('standardPrice');
                  }}
                  placeholder="VD: 100.000"
                  className={`w-full border rounded p-2 mt-1 font-semibold text-orange-600 ${
                    fieldErrors.standardPrice ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.standardPrice && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <span>⚠</span> {fieldErrors.standardPrice}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium">Giá tối thiểu (sàn)</span>
                <input
                  name="minPrice"
                  type="text"
                  inputMode="numeric"
                  value={formattedMinPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormattedMinPrice(raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
                    clearFieldError('minPrice');
                  }}
                  className={`w-full border rounded p-2 mt-1 ${
                    fieldErrors.minPrice ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                  }`}
                  placeholder={
                    formattedStandardPrice
                      ? formatNumberWithDots(Math.round(parseFormattedNumber(formattedStandardPrice) * 0.8))
                      : '80% giá chuẩn'
                  }
                />
                {fieldErrors.minPrice && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <span>⚠</span> {fieldErrors.minPrice}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium">Giá tối đa (trần)</span>
                <input
                  name="maxPrice"
                  type="text"
                  inputMode="numeric"
                  value={formattedMaxPrice}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    setFormattedMaxPrice(raw ? raw.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '');
                    clearFieldError('maxPrice');
                  }}
                  className={`w-full border rounded p-2 mt-1 ${
                    fieldErrors.maxPrice ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                  }`}
                  placeholder={
                    formattedStandardPrice
                      ? formatNumberWithDots(Math.round(parseFormattedNumber(formattedStandardPrice) * 1.3))
                      : '130% giá chuẩn'
                  }
                />
                {fieldErrors.maxPrice && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <span>⚠</span> {fieldErrors.maxPrice}
                  </p>
                )}
              </label>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="block">
                <span className="text-sm font-medium">
                  Đơn vị tính <span className="text-rose-500">*</span>
                </span>
                <select
                  className={`w-full border p-2 rounded mt-1 ${
                    fieldErrors.unit ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                  }`}
                  value={selectedUnit}
                  onChange={(e) => {
                    setSelectedUnit(e.target.value);
                    clearFieldError('unit');
                  }}
                >
                  {STANDARD_UNITS.map((u) => (
                    <option key={u.value} value={u.value}>
                      {u.label}
                    </option>
                  ))}
                </select>
                {selectedUnit === 'KHAC' && (
                  <input
                    className={`w-full border rounded p-2 mt-2 bg-amber-50/50 ${
                      fieldErrors.unit ? 'border-rose-500 bg-rose-50/20' : 'border-amber-300'
                    }`}
                    value={customUnit}
                    onChange={(e) => {
                      setCustomUnit(e.target.value);
                      clearFieldError('unit');
                    }}
                    placeholder="Tự nhập đơn vị tính (VD: chuyến, bình 1L, giờ...)"
                  />
                )}
                {fieldErrors.unit && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <span>⚠</span> {fieldErrors.unit}
                  </p>
                )}
              </div>

              <label className="block">
                <span className="text-sm font-medium">
                  Thời gian (phút) <span className="text-rose-500">*</span>
                </span>
                <input
                  name="estimatedTimeMin"
                  type="number"
                  defaultValue={editing?.estimatedTimeMin ?? 15}
                  onChange={() => clearFieldError('estimatedTimeMin')}
                  className={`w-full border rounded p-2 mt-1 ${
                    fieldErrors.estimatedTimeMin ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.estimatedTimeMin && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <span>⚠</span> {fieldErrors.estimatedTimeMin}
                  </p>
                )}
              </label>

              <label className="block">
                <span className="text-sm font-medium">
                  Bảo hành (ngày) <span className="text-rose-500">*</span>
                </span>
                <input
                  name="warrantyDays"
                  type="number"
                  defaultValue={editing?.warrantyDays ?? 3}
                  onChange={() => clearFieldError('warrantyDays')}
                  className={`w-full border rounded p-2 mt-1 ${
                    fieldErrors.warrantyDays ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                  }`}
                />
                {fieldErrors.warrantyDays && (
                  <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                    <span>⚠</span> {fieldErrors.warrantyDays}
                  </p>
                )}
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium">Mô tả quy trình cứu hộ / vật tư</span>
              <textarea
                name="description"
                rows={3}
                maxLength={500}
                defaultValue={editing?.description}
                onChange={() => clearFieldError('description')}
                className={`w-full border rounded p-2 mt-1 ${
                  fieldErrors.description ? 'border-rose-500 bg-rose-50/20' : 'border-gray-300'
                }`}
                placeholder="Nêu chi tiết quy trình xử lý, nhãn hiệu phụ tùng thay mới..."
              />
              {fieldErrors.description && (
                <p className="text-xs text-rose-600 mt-1 flex items-center gap-1 font-medium">
                  <span>⚠</span> {fieldErrors.description}
                </p>
              )}
            </label>

            <div className="flex gap-2 pt-2">
              <button disabled={busy} className="garage-button primary flex-1">
                Lưu dịch vụ
              </button>
              <button
                type="button"
                className="px-4 py-2 border rounded"
                onClick={() => {
                  setShowEditor(false);
                  setFormError('');
                  setFieldErrors({});
                }}
              >
                Hủy
              </button>
            </div>
          </form>
        </GarageModal>
      )}
    </section>
  );
}
