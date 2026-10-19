import React, { useEffect, useState } from 'react';
import { ScreenId } from '../../types';
import { ServiceItemBackend } from '../../services/garageApi';
import { request } from '../../services/managementApi';
interface Props {
  onSelectScreen: (screen: ScreenId) => void;
  onShowToast: (title: string, msg: string) => void;
}
export function GarageServicesPricingView(_props: Props) {
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
      form.reset();
    }
  }
  return (
    <section className="management-page p-6 space-y-5">
      <h1 className="text-2xl font-bold">Dịch vụ & bảng giá</h1>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <div className="grid md:grid-cols-2 gap-4">
        {services.map((service) => (
          <article key={service.id} className="border rounded p-4 space-y-2">
            <h2 className="font-bold">{service.serviceName}</h2>
            <p>
              {service.standardPrice.toLocaleString('vi-VN')} đ / {service.unit} ·{' '}
              {service.active ? 'Đang cung cấp' : 'Tạm tắt'}
            </p>
            <p>{service.description}</p>
            <div className="flex gap-4">
              <button disabled={busy} onClick={() => setEditing(service)}>
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
      {services.length === 0 && <p>Chưa có dịch vụ.</p>}
      <form key={editing?.id ?? 'new'} onSubmit={save} className="border rounded p-4 grid md:grid-cols-2 gap-3">
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
          <button type="button" onClick={() => setEditing(null)}>
            Hủy
          </button>
        )}
      </form>
    </section>
  );
}
