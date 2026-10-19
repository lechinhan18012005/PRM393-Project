import React, { useEffect, useState } from 'react';
import { GarageApplicant } from '../../types';
import { GarageBackendResponse } from '../../services/garageApi';
import { request } from '../../services/managementApi';
interface Props {
  applicants: GarageApplicant[];
  onShowToast: (title: string, msg: string) => void;
}
export function GarageVerificationView(_props: Props) {
  const [garages, setGarages] = useState<GarageBackendResponse[]>([]);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('PENDING');
  const [busy, setBusy] = useState(false);
  async function load() {
    setError('');
    try {
      setGarages(await request<GarageBackendResponse[]>('/staff/garages'));
    } catch (e) {
      setError((e as Error).message);
    }
  }
  useEffect(() => {
    void load();
  }, []);
  async function moderate(e: React.FormEvent<HTMLFormElement>, garage: GarageBackendResponse) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await request(`/staff/garages/${garage.id}/moderate`, 'PATCH', {
        status: data.get('status'),
        note: data.get('note')
      });
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const labels: Record<string, string> = {
    PENDING: 'Chờ duyệt',
    APPROVED: 'Đã duyệt',
    REJECTED: 'Từ chối',
    SUSPENDED: 'Đình chỉ'
  };
  return (
    <section className="management-page p-6 space-y-5">
      <h1 className="text-2xl font-bold">Duyệt hồ sơ gara</h1>
      <div className="flex gap-4">
        <select aria-label="Lọc trạng thái" value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">Tất cả</option>
          {Object.entries(labels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button disabled={busy} onClick={() => void load()}>
          Tải lại
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {garages
        .filter((g) => !filter || g.status === filter)
        .map((garage) => (
          <article key={garage.id} className="border rounded p-5 space-y-3">
            <h2 className="text-xl font-bold">{garage.garageName}</h2>
            <p>
              {garage.ownerName} · {garage.ownerEmail} · {garage.phone}
            </p>
            <p>
              {labels[garage.status]} · {garage.branchCount} chi nhánh · {garage.mechanicCount} thợ
            </p>
            <div className="flex gap-4">
              {[
                ['Giấy phép kinh doanh', garage.businessLicenseUrl],
                ['CCCD', garage.idCardUrl]
              ].map(([label, url]) =>
                url && /^https?:\/\//i.test(url) ? (
                  <a className="underline" href={url} key={label} target="_blank" rel="noopener noreferrer">
                    {label}
                  </a>
                ) : (
                  <span key={label}>{label}: chưa cung cấp</span>
                )
              )}
            </div>
            {garage.rejectionReason && <p>Ghi chú: {garage.rejectionReason}</p>}
            <form onSubmit={(e) => void moderate(e, garage)} className="flex flex-wrap gap-3">
              <select name="status" aria-label={`Quyết định cho ${garage.garageName}`} defaultValue="APPROVED">
                <option value="APPROVED">Phê duyệt</option>
                <option value="REJECTED">Từ chối / cần bổ sung</option>
                <option value="SUSPENDED">Đình chỉ</option>
              </select>
              <input
                required
                name="note"
                aria-label="Lý do quyết định"
                placeholder="Lý do / ghi chú cho chủ gara"
                className="border p-2 rounded"
              />
              <button disabled={busy}>Lưu quyết định</button>
            </form>
          </article>
        ))}
      {garages.filter((g) => !filter || g.status === filter).length === 0 && <p>Không có hồ sơ ở trạng thái này.</p>}
    </section>
  );
}
