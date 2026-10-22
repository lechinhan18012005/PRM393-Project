import React from 'react';
import { DEMO_MODE } from '../../context/AuthContext';
import { Wallet, Truck, Receipt } from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel, GarageEmpty } from '../garage/GarageUI';
const money = (value: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
export function GarageOperationsView({ mode }: { mode: 'finance' | 'transport' }) {
  if (!DEMO_MODE)
    return (
      <section className="garage-portal">
        <GarageHeading
          title={mode === 'finance' ? 'Doanh thu & ví gara' : 'Điều phối chuyến chở xe'}
          description={
            mode === 'finance'
              ? 'Theo dõi doanh thu, đối soát và dòng tiền của gara.'
              : 'Quản lý phương tiện và hành trình vận chuyển cứu hộ.'
          }
        />
        <GarageEmpty
          title={mode === 'finance' ? 'Chưa kết nối dữ liệu doanh thu & ví' : 'Chưa kết nối dữ liệu chuyến chở xe'}
          description={
            mode === 'finance'
              ? 'Chức năng doanh thu, đối soát và rút tiền chưa khả dụng trên hệ thống thật.'
              : 'Chức năng theo dõi và điều phối chuyến chở xe chưa khả dụng trên hệ thống thật.'
          }
        />
      </section>
    );

    return (
      <section className="garage-portal">
        <GarageHeading
          title={mode === 'finance' ? 'Doanh thu & ví gara' : 'Điều phối chuyến chở xe'}
          description={
            mode === 'finance'
              ? 'Theo dõi doanh thu, đối soát và dòng tiền của gara.'
              : 'Quản lý phương tiện và hành trình vận chuyển cứu hộ.'
          }
        />
        <div className="garage-note">DỮ LIỆU MẪU · Chưa kết nối giao dịch hoặc điều phối thật.</div>
        {mode === 'finance' ? (
          <>
            <div className="garage-stat-grid three">
              <GarageStat
                label="Thực nhận · Tháng 10/2026"
                value={money(34785000)}
                detail="Số liệu minh họa"
                icon={<Receipt size={18} />}
              />
              <GarageStat
                label="Đơn hoàn thành"
                value="142"
                detail="Đơn cứu hộ mẫu trong tháng"
                icon={<Truck size={18} />}
                accent="teal"
              />
              <GarageStat
                label="Hoa hồng sàn (10%)"
                value={money(3865000)}
                detail="Số liệu minh họa"
                icon={<Wallet size={18} />}
                accent="blue"
              />
            </div>
            <div className="garage-columns">
              <GaragePanel title="Cơ cấu doanh thu mẫu" description="Tháng 10/2026 · Theo nhóm dịch vụ">
                <div className="garage-revenue-list">
                  {[
                    ['Sửa chữa tại chỗ', 22500000, 100],
                    ['Vận chuyển về gara', 8700000, 39],
                    ['Dịch vụ khác', 3585000, 16]
                  ].map(([name, value, width]) => (
                    <div key={String(name)}>
                      <div>
                        <span>{name}</span>
                        <strong>{money(Number(value))}</strong>
                      </div>
                      <div className="garage-revenue-track">
                        <i style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </GaragePanel>
              <GaragePanel title="Ví gara · Dữ liệu mẫu">
                <div className="garage-wallet">
                  <small>SỐ DƯ KHẢ DỤNG MẪU</small>
                  <strong>{money(24850000)}</strong>
                  <small>Đang giữ đối soát: {money(1200000)}</small>
                </div>
                <div style={{ padding: 20 }}>
                  <p className="garage-muted">Chưa hỗ trợ rút tiền thật.</p>
                  <button className="garage-button" disabled>
                    Rút tiền — chưa khả dụng
                  </button>
                </div>
              </GaragePanel>
            </div>
            <GaragePanel
              title="Lịch sử rút tiền mẫu"
              description="Các giao dịch bên dưới chỉ phục vụ minh họa giao diện"
            >
              <div className="garage-table-wrap">
                <table className="garage-table">
                  <thead>
                    <tr>
                      <th>Mã giao dịch</th>
                      <th>Ngày tạo</th>
                      <th>Số tiền</th>
                      <th>Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>WD-9912</td>
                      <td>08/10/2026</td>
                      <td>{money(10000000)}</td>
                      <td>Đã giải ngân (mẫu)</td>
                    </tr>
                    <tr>
                      <td>WD-9820</td>
                      <td>28/09/2026</td>
                      <td>{money(8500000)}</td>
                      <td>Đã giải ngân (mẫu)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </GaragePanel>
          </>
        ) : (
          <>
            <div className="garage-stat-grid three">
              <GarageStat
                label="Chuyến hoạt động mẫu"
                value="02"
                detail="Chuyến minh họa đang thực hiện"
                icon={<Truck size={18} />}
              />
              <GarageStat
                label="Xe được ghép chuyến mẫu"
                value="08"
                detail="Tổng số xe trong 2 chuyến mẫu"
                icon={<Truck size={18} />}
                accent="teal"
              />
              <GarageStat
                label="Vùng phục vụ mẫu"
                value="02"
                detail="Quận 7 và Quận 8"
                icon={<Receipt size={18} />}
                accent="blue"
              />
            </div>
            <GaragePanel title="Chuyến vận chuyển mẫu" description="Theo dõi phương tiện, sức chứa và điểm đón">
              <div className="garage-branch-grid">
                {[
                  {
                    id: 'BATCH-TRIP-01',
                    vehicle: 'Xe tải nhẹ 1.25 tấn · 51D-891.22',
                    capacity: '4/6 xe',
                    route: 'Cầu Tân Thuận → Nguyễn Thị Thập',
                    status: 'Đang gom khách tại điểm chờ',
                    fare: 40000
                  },
                  {
                    id: 'BATCH-TRIP-02',
                    vehicle: 'Xe ba gác cứu hộ',
                    capacity: '4/4 xe',
                    route: 'Chợ Mễ Cốc → Cầu Số 2 Bến Bình Đông',
                    status: 'Đang chở xe qua ngập',
                    fare: 35000
                  }
                ].map((trip) => (
                  <article className="garage-branch-card" key={trip.id}>
                    <h3>{trip.id}</h3>
                    <p>{trip.vehicle}</p>
                    <p>{trip.route}</p>
                    <p>{trip.status}</p>
                    <p>
                      Sức chứa: <strong>{trip.capacity}</strong> · {money(trip.fare)} / xe
                    </p>
                    <button className="garage-button" disabled>
                      Điều phối — chưa khả dụng
                    </button>
                  </article>
                ))}
              </div>
            </GaragePanel>
          </>
        )}
      </section>
    );
}
