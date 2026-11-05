import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { managementApi, request } from '../../services/managementApi';
import { ServiceRatingBackendResponse } from '../../services/financeApi';
import { GarageHeading, GaragePanel, GarageError, GarageEmpty } from '../garage/GarageUI';

export function GarageRatingsView() {
  const [ratings, setRatings] = useState<ServiceRatingBackendResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stars, setStars] = useState('all');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    async function load() {
      try {
        const garage = await managementApi.garage();
        const data = await request<ServiceRatingBackendResponse[]>(`/ratings/garage/${garage.id}`);
        if (!cancelled) setRatings(data);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Không thể tải đánh giá.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [revision]);

  const filtered = ratings.filter(r => stars === 'all' || r.stars === Number(stars))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const average = ratings.length ? (ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length).toFixed(1) : '—';

  return <div className="garage-portal">
    <GarageHeading title="Đánh giá của khách hàng" description="Xem nhận xét và chất lượng phục vụ của gara."
      action={<button className="garage-button" disabled={loading} onClick={() => setRevision(v => v + 1)}>Làm mới</button>} />
    <GarageError message={error} retry={() => setRevision(v => v + 1)} />
    {loading ? <p role="status" className="garage-muted">Đang tải đánh giá...</p> : !error && <GaragePanel
      title={`${average} / 5 sao · ${ratings.length} đánh giá`}
      action={<label>Lọc theo sao <select aria-label="Lọc theo số sao" value={stars} onChange={e => setStars(e.target.value)}>
        <option value="all">Tất cả</option>{[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} sao</option>)}
      </select></label>}>
      {filtered.length ? <div className="garage-table-wrap"><table className="garage-table">
        <thead><tr><th>Thời gian</th><th>Đơn cứu hộ</th><th>Khách hàng</th><th>Thợ phục vụ</th><th>Đánh giá</th><th>Nhận xét</th></tr></thead>
        <tbody>{filtered.map(r => <tr key={r.id}>
          <td>{new Date(r.createdAt).toLocaleString('vi-VN')}</td><td>{r.rescueCode || `#${r.rescueOrderId}`}</td>
          <td>{r.customerName}</td><td>{r.mechanicName || '—'}</td>
          <td><span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Star size={15} fill="#f59e0b" color="#f59e0b" />{r.stars}/5</span></td>
          <td><div style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{r.comment || 'Không có nhận xét'}</div>{r.tags && <small>{r.tags}</small>}</td>
        </tr>)}</tbody>
      </table></div> : <GarageEmpty title="Chưa có đánh giá phù hợp" description="Đánh giá của khách sau khi hoàn tất dịch vụ sẽ xuất hiện tại đây." />}
    </GaragePanel>}
  </div>;
}
