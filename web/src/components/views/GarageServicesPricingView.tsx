import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { ServiceItemBackend } from '../../services/garageApi';
import { request } from '../../services/managementApi';
import { Plus, Search, Wrench, CheckCircle2, Layers } from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel, GarageDrawer, GarageError } from '../garage/GarageUI';
interface Props {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}
export function GarageServicesPricingView(_props: Props) {
  const [showEditor, setShowEditor] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [services, setServices] = useState<ServiceItemBackend[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ServiceItemBackend | null>(null);
  async function load() {
    try {
      setServices(await request<ServiceItemBackend[]>('/garages/services'));
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
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const body = {
      ...data,
      standardPrice: Number(data.standardPrice),
      minPrice: Number(data.minPrice),
      maxPrice: Number(data.maxPrice),
      estimatedTimeMin: Number(data.estimatedTimeMin),
      warrantyDays: Number(data.warrantyDays),
      active: editing?.active ?? true
    };
    if (body.minPrice > body.standardPrice || body.maxPrice < body.standardPrice) {
      setError('Giá chuẩn phải nằm trong khoảng giá tối thiểu và tối đa');
      return;
    }
    if (
      await change(editing ? `/garages/services/${editing.id}` : '/garages/services', editing ? 'PUT' : 'POST', body)
    ) {
      setEditing(null);
      setShowEditor(false);
      form.reset();
    }
  }
  return (
    <section className="garage-portal">
      <GarageHeading
        title="Dịch vụ & bảng giá"
        description="Niêm yết giá minh bạch và quản lý danh mục dịch vụ của gara."
        action={
          <button
            className="garage-button primary"
            onClick={() => {
              setEditing(null);
              setShowEditor(true);
            }}
          >
            <Plus size={16} />
            Thêm dịch vụ
          </button>
        }
      />
      <GarageError message={error} retry={() => void load()} />
      <div className="garage-stat-grid three">
        <GarageStat
          label="Tổng dịch vụ"
          value={services.length}
          detail="Trong danh mục của gara"
          icon={<Wrench size={18} />}
        />
        <GarageStat
          label="Đang cung cấp"
          value={services.filter((s) => s.active).length}
          detail="Dịch vụ được bật để phục vụ"
          icon={<CheckCircle2 size={18} />}
          accent="teal"
        />
        <GarageStat
          label="Nhóm dịch vụ"
          value={new Set(services.map((s) => s.category)).size}
          detail="Các nhóm trong bảng giá"
          icon={<Layers size={18} />}
          accent="blue"
        />
      </div>
      <GaragePanel title="Danh mục dịch vụ" description="Giá chuẩn, khoảng giá và chính sách bảo hành">
        <div className="garage-toolbar">
          <label className="garage-search">
            <Search size={16} />
            <input
              aria-label="Tìm dịch vụ"
              placeholder="Tìm tên hoặc nhóm dịch vụ..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <select aria-label="Lọc trạng thái dịch vụ" value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="ALL">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang cung cấp</option>
            <option value="INACTIVE">Tạm tắt</option>
          </select>
        </div>
        <div className="garage-service-list">
          {services
            .filter(
              (s) =>
                `${s.serviceName} ${s.category}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) &&
                (filter === 'ALL' || s.active === (filter === 'ACTIVE'))
            )
            .map((service) => (
              <article key={service.id} className="garage-service-row">
                <div className="garage-service-name">
                  <h2>{service.serviceName}</h2>
                  <small>{service.category}</small>
                </div>
                <p>
                  {service.standardPrice.toLocaleString('vi-VN')} đ / {service.unit} ·{' '}
                  {service.active ? 'Đang cung cấp' : 'Tạm tắt'}
                </p>
                <div className="garage-service-meta">
                  <p>{service.description || 'Chưa có mô tả'}</p>
                  <small>
                    {service.estimatedTimeMin} phút · Bảo hành {service.warrantyDays} ngày
                  </small>
                  <small>
                    {service.minPrice.toLocaleString('vi-VN')} – {service.maxPrice.toLocaleString('vi-VN')} đ
                  </small>
                </div>
                <div className="flex gap-4">
                  <button
                    disabled={busy}
                    onClick={() => {
                      setEditing(service);
                      setShowEditor(true);
                    }}
                  >
                    Sửa
                  </button>
                  <button
                    disabled={busy}
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
                    onClick={() => {
                      if (window.confirm(`Xóa dịch vụ ${service.serviceName}?`))
                        void change(`/garages/services/${service.id}`, 'DELETE');
                    }}
                  >
                    Xóa
                  </button>
                </div>
              </article>
            ))}
        </div>
        {services.length === 0 && <p>Chưa có dịch vụ. Thêm dịch vụ đầu tiên để thiết lập bảng giá.</p>}
        {services.length > 0 &&
          !services.some(
            (s) =>
              `${s.serviceName} ${s.category}`.toLocaleLowerCase('vi').includes(query.toLocaleLowerCase('vi')) &&
              (filter === 'ALL' || s.active === (filter === 'ACTIVE'))
          ) && <p>Không có dịch vụ phù hợp với bộ lọc.</p>}
      </GaragePanel>
      {showEditor && (
        <GarageDrawer
          title={editing ? 'Chỉnh sửa dịch vụ' : 'Thêm dịch vụ'}
          description="Thiết lập đơn giá và thời gian thực hiện"
          onClose={() => {
            if (!busy) setShowEditor(false);
          }}
        >
          <GarageError message={error} />
          <form key={editing?.id ?? 'new'} onSubmit={save} className="garage-form">
            <h2 className="md:col-span-2 text-xl">{editing ? 'Sửa dịch vụ' : 'Thêm dịch vụ'}</h2>
            {(
              [
                'serviceName',
                'category',
                'standardPrice',
                'minPrice',
                'maxPrice',
                'unit',
                'estimatedTimeMin',
                'warrantyDays',
                'description'
              ] as const
            ).map((name, i) => (
              <label key={name}>
                {
                  [
                    'Tên dịch vụ',
                    'Nhóm',
                    'Giá chuẩn',
                    'Giá tối thiểu',
                    'Giá tối đa',
                    'Đơn vị',
                    'Thời gian (phút)',
                    'Bảo hành (ngày)',
                    'Mô tả'
                  ][i]
                }
                <input
                  className="w-full border rounded p-2"
                  name={name}
                  type={[2, 3, 4, 6, 7].includes(i) ? 'number' : 'text'}
                  min="0"
                  required={i !== 8}
                  defaultValue={editing?.[name] ?? (i === 5 ? 'lượt' : undefined)}
                />
              </label>
            ))}
            <label>
              Loại dịch vụ
              <select
                name="serviceType"
                className="border p-2 rounded w-full"
                defaultValue={editing?.serviceType ?? 'REPAIR_ONSITE'}
              >
                <option value="REPAIR_ONSITE">Sửa tại chỗ</option>
                <option value="TOWING">Kéo xe</option>
                <option value="CROSSING">Vượt vùng ngập</option>
              </select>
            </label>
            <button disabled={busy}>Lưu dịch vụ</button>
            {editing && (
              <button type="button" onClick={() => setShowEditor(false)}>
                Hủy
              </button>
            )}
          </form>
        </GarageDrawer>
      )}
    </section>
  );
}
