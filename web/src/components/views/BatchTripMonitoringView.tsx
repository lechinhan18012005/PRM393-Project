import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Truck, Users } from 'lucide-react';
import { BatchTrip } from '../../types';
import { getBatchTripsForStaff } from '../../services/batchTripApi';

const activeStatuses = new Set(['GATHERING', 'READY', 'PICKING_UP', 'MOVING']);

export const BatchTripMonitoringView: React.FC = () => {
  const [trips, setTrips] = useState<BatchTrip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setTrips(await getBatchTripsForStaff());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải chuyến gom');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const active = trips.filter((trip) => activeStatuses.has(trip.status)).length;
  const vehicles = trips
    .filter((trip) => activeStatuses.has(trip.status))
    .reduce((sum, trip) => sum + trip.currentVehicleCount, 0);

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Theo dõi chuyến gom vượt ngập</h1>
          <p className="text-secondary mt-1">Dữ liệu trực tiếp từ các chuyến đang tập kết và vận chuyển.</p>
        </div>
        <button onClick={() => void load()} className="flex items-center gap-2 rounded-lg border px-4 py-2" disabled={loading}>
          <RefreshCw size={17} className={loading ? 'animate-spin' : ''} /> Làm mới
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 flex items-center gap-4">
          <Truck className="text-orange-600" /><div><div className="text-2xl font-bold">{active}</div><div className="text-secondary">Chuyến đang hoạt động</div></div>
        </div>
        <div className="rounded-xl border bg-white p-5 flex items-center gap-4">
          <Users className="text-blue-600" /><div><div className="text-2xl font-bold">{vehicles}</div><div className="text-secondary">Xe đang được phục vụ</div></div>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
      {!loading && !error && trips.length === 0 && <div className="rounded-xl border bg-white p-10 text-center text-secondary">Chưa có chuyến gom nào.</div>}

      <div className="grid gap-4 xl:grid-cols-2">
        {trips.map((trip) => {
          const percent = Math.min(100, (trip.currentVehicleCount / trip.capacity) * 100);
          return (
            <article key={trip.id} className="rounded-xl border bg-white p-5 space-y-3">
              <div className="flex items-center justify-between">
                <strong>#BATCH-{trip.id}</strong>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{trip.status}</span>
              </div>
              <div className="text-sm text-secondary">Điểm gom: {trip.pickupPlace}</div>
              <div className="flex justify-between text-sm"><span>{trip.currentVehicleCount}/{trip.capacity} xe</span><strong>{trip.discountedPricePerVehicle.toLocaleString('vi-VN')} đ/xe</strong></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full bg-orange-500" style={{ width: `${percent}%` }} /></div>
              <div className="text-xs text-secondary">Khởi hành: {new Date(trip.departureTime).toLocaleString('vi-VN')}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
