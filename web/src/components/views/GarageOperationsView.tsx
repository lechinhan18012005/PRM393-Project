import React from 'react';
import { DEMO_MODE } from '../../context/AuthContext';
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export function GarageOperationsView({ mode }: { mode: 'finance' | 'transport' }) {
  if (!DEMO_MODE)
    return (
      <section className="management-page p-6 space-y-4">
        <h1 className="text-2xl font-bold">{mode === 'finance' ? 'Doanh thu & ví gara' : 'Chuyến chở xe'}</h1>
        <p>
          Chức năng đã được chuyển từ Mobile sang Web. Chưa có API{' '}
          {mode === 'finance' ? 'doanh thu/rút tiền' : 'điều phối chuyến chở xe'}; hiện chưa thể thực hiện nghiệp vụ
          này.
        </p>
      </section>
    );
  return (
    <section className="management-page p-6 space-y-5">
      <h1 className="text-2xl font-bold">{mode === 'finance' ? 'Doanh thu & ví gara' : 'Chuyến chở xe'}</h1>
      <p className="border border-amber-400 bg-amber-50 p-3 rounded">
        Dữ liệu mẫu. Chức năng này chưa kết nối nghiệp vụ thật.
      </p>
      {mode === 'finance' ? (
        <>
          <h2 className="text-xl">Doanh thu tháng 10/2026</h2>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              ['Thực nhận', money(34785000)],
              ['Đơn hoàn thành', '142'],
              ['Hoa hồng sàn (10%)', money(3865000)]
            ].map(([label, value]) => (
              <article key={label} className="border rounded p-4">
                <p>{label}</p>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <h2 className="text-xl">Theo dịch vụ</h2>
          <ul>
            <li>Sửa chữa tại chỗ: {money(22500000)}</li>
            <li>Vận chuyển về gara: {money(8700000)}</li>
            <li>Dịch vụ khác: {money(3585000)}</li>
          </ul>
          <h2 className="text-xl">Ví & rút tiền</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <article className="border rounded p-4">
              <p>Số dư khả dụng (mẫu)</p>
              <strong>{money(24850000)}</strong>
            </article>
            <article className="border rounded p-4">
              <p>Đang giữ đối soát (2 đơn mẫu)</p>
              <strong>{money(1200000)}</strong>
            </article>
          </div>
          <p>Ngân hàng thụ hưởng mẫu: Vietcombank · tài khoản 0071****2831 · LÊ VĂN GARA.</p>
          <h3 className="font-bold">Lịch sử rút tiền mẫu</h3>
          <ul>
            <li>WD-9912 · 08/10/2026 · {money(10000000)} · Đã giải ngân</li>
            <li>WD-9820 · 28/09/2026 · {money(8500000)} · Đã giải ngân</li>
          </ul>
          <p>Chưa hỗ trợ yêu cầu rút tiền thật.</p>
          <button disabled className="border p-2 opacity-50">
            Rút tiền (chưa khả dụng)
          </button>
        </>
      ) : (
        <>
          <h2 className="text-xl">2 chuyến mẫu đang hoạt động</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                id: 'BATCH-TRIP-01',
                vehicle: 'Xe tải nhẹ 1.25 tấn · 51D-891.22',
                capacity: 'Đã gom 4/6 xe',
                route: 'Dốc Cầu Tân Thuận → Ngã tư Nguyễn Thị Thập',
                status: 'Đang gom khách tại điểm chờ',
                fare: 40000
              },
              {
                id: 'BATCH-TRIP-02',
                vehicle: 'Xe ba gác cứu hộ',
                capacity: 'Đã gom 4/4 xe (đầy chuyến)',
                route: 'Chợ Mễ Cốc → Cầu Số 2 Bến Bình Đông',
                status: 'Đang chở xe qua ngập',
                fare: 35000
              }
            ].map((trip) => (
              <article key={trip.id} className="border rounded p-4 space-y-2">
                <h3 className="font-bold">{trip.id}</h3>
                <p>{trip.vehicle}</p>
                <p>{trip.route}</p>
                <p>{trip.status}</p>
                <p>Sức chứa: {trip.capacity}</p>
                <p>{money(trip.fare)} / xe</p>
                <button disabled className="border p-2 opacity-50">
                  Điều phối (chưa khả dụng)
                </button>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
