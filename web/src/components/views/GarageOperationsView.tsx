import React, { useEffect, useState, useCallback } from 'react';
import { DEMO_MODE } from '../../context/AuthContext';
import { Wallet, Truck, Receipt, CheckCircle, Clock } from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel, GarageEmpty } from '../garage/GarageUI';
import { rescueApi, RescueOrderWebResponse } from '../../services/rescueApi';

const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function GarageOperationsView({ mode }: { mode: 'finance' | 'transport' }) {
  const [garageOrders, setGarageOrders] = useState<RescueOrderWebResponse[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (mode !== 'transport') return;
    try {
      setLoadingOrders(true);
      const data = await rescueApi.getGarageOrders();
      setGarageOrders(data || []);
    } catch {
      // Backend not connected or unauthenticated, ignore
    } finally {
      setLoadingOrders(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (!DEMO_MODE && mode === 'finance') {
    return (
      <section className="garage-portal">
        <GarageHeading
          title="Doanh thu & ví gara"
          description="Theo dõi doanh thu, đối soát và dòng tiền của gara."
        />
        <GarageEmpty
          title="Chưa kết nối dữ liệu doanh thu & ví"
          description="Chức năng doanh thu, đối soát và rút tiền chưa khả dụng trên hệ thống thật (thuộc phạm vi tích hợp tương lai của Luồng 5)."
        />
      </section>
    );
  }

  return (
    <section className="garage-portal">
      <GarageHeading
        title={mode === 'finance' ? 'Doanh thu & ví gara' : 'Điều phối chuyến chở xe vượt ngập'}
        description={
          mode === 'finance'
            ? 'Theo dõi doanh thu, đối soát và dòng tiền của gara.'
            : 'Quản lý các chuyến chở xe máy qua ngập đơn lẻ (SINGLE_CROSSING) của gara.'
        }
      />

      {mode === 'finance' ? (
        <>
          <div className="garage-note">DỮ LIỆU MẪU · Chưa kết nối giao dịch hoặc ví tài chính thật.</div>
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
        </>
      ) : (
        <>
          {garageOrders.length > 0 ? (
            <>
              <div className="garage-stat-grid three">
                <GarageStat
                  label="Tổng đơn chở xe gara"
                  value={String(garageOrders.length)}
                  detail="Đơn SINGLE_CROSSING từ API thật"
                  icon={<Truck size={18} />}
                  accent="teal"
                />
                <GarageStat
                  label="Đang thực hiện"
                  value={String(
                    garageOrders.filter((o) => ['DISPATCHED', 'ARRIVED', 'IN_PROGRESS'].includes(o.status)).length
                  )}
                  detail="Thợ đang di chuyển hoặc chở xe"
                  icon={<Clock size={18} />}
                />
                <GarageStat
                  label="Doanh thu dịch vụ niêm yết"
                  value={money(
                    garageOrders
                      .filter((o) => ['COMPLETED', 'PAYMENT_PENDING'].includes(o.status))
                      .reduce((sum, o) => sum + Number(o.serviceBasePrice || 0), 0)
                  )}
                  detail="Không gồm phí sàn 30k"
                  icon={<CheckCircle size={18} />}
                  accent="blue"
                />
              </div>

              <GaragePanel
                title="Danh sách chuyến chở xe đơn lẻ của gara"
                description="Dữ liệu thời gian thực được đồng bộ từ Backend PRM393 (Luồng 3)"
              >
                <div className="garage-table-wrap">
                  <table className="garage-table">
                    <thead>
                      <tr>
                        <th>Mã đơn</th>
                        <th>Khách hàng</th>
                        <th>Điểm đón → Điểm trả an toàn</th>
                        <th>Phương tiện</th>
                        <th>Kỹ thuật viên</th>
                        <th>Tiến độ chở xe</th>
                        <th>Trạng thái</th>
                        <th>Cước gara</th>
                        <th>Nghiệm thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {garageOrders.map((order) => (
                        <tr key={order.id}>
                          <td>
                            <strong>{order.orderCode}</strong>
                            <br />
                            <small className="garage-muted">
                              {order.requestedAt ? new Date(order.requestedAt).toLocaleTimeString('vi-VN') : ''}
                            </small>
                          </td>
                          <td>
                            {order.customerName}
                            <br />
                            <small className="garage-muted">{order.customerPhone}</small>
                          </td>
                          <td>
                            <div style={{ maxWidth: 220, fontSize: 12 }}>
                              <span style={{ color: '#d97706' }}>Đón: {order.pickupAddress}</span>
                              <br />
                              <span style={{ color: '#16a34a' }}>Trả: {order.dropoffAddress}</span>
                            </div>
                          </td>
                          <td>
                            {order.vehicleModel}
                            <br />
                            <small className="garage-muted">{order.vehiclePlate}</small>
                          </td>
                          <td>
                            {order.mechanicName ? (
                              <>
                                <strong>{order.mechanicName}</strong>
                                <br />
                                <small className="garage-muted">{order.mechanicPhone}</small>
                              </>
                            ) : (
                              <span style={{ color: '#9ca3af' }}>Đang điều phối</span>
                            )}
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 'bold',
                                backgroundColor:
                                  order.transportStage === 'HANDOVER_COMPLETED' ? '#dcfce7' : '#e0f2fe',
                                color:
                                  order.transportStage === 'HANDOVER_COMPLETED' ? '#166534' : '#0369a1'
                              }}
                            >
                              {order.transportStage}
                            </span>
                          </td>
                          <td>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 'bold',
                                backgroundColor:
                                  order.status === 'COMPLETED'
                                    ? '#dcfce7'
                                    : order.status === 'PAYMENT_PENDING'
                                    ? '#fef3c7'
                                    : order.status === 'IN_PROGRESS'
                                    ? '#e0e7ff'
                                    : '#f3f4f6',
                                color:
                                  order.status === 'COMPLETED'
                                    ? '#166534'
                                    : order.status === 'PAYMENT_PENDING'
                                    ? '#92400e'
                                    : order.status === 'IN_PROGRESS'
                                    ? '#3730a3'
                                    : '#374151'
                              }}
                            >
                              {order.status}
                            </span>
                          </td>
                          <td>
                            <strong>{money(Number(order.serviceBasePrice))}</strong>
                            <br />
                            <small className="garage-muted">+ {money(Number(order.bookingFee))} phí sàn</small>
                          </td>
                          <td>
                            {order.completionPhotoUrl ? (
                              <a
                                href={order.completionPhotoUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: '#2563eb', fontSize: 12, textDecoration: 'underline' }}
                              >
                                Xem ảnh
                              </a>
                            ) : (
                              <span style={{ color: '#9ca3af', fontSize: 12 }}>Chưa có</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </GaragePanel>
            </>
          ) : (
            <>
              <div className="garage-note">
                {loadingOrders
                  ? 'Đang kiểm tra chuyến chở xe từ API...'
                  : 'DỮ LIỆU MẪU · Chưa có đơn chở xe SINGLE_CROSSING nào được tạo cho gara này.'}
              </div>
              <div className="garage-stat-grid three">
                <GarageStat
                  label="Chuyến hoạt động mẫu"
                  value="02"
                  detail="Chuyến minh họa đang thực hiện"
                  icon={<Truck size={18} />}
                />
                <GarageStat
                  label="Xe được chở mẫu"
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
        </>
      )}
    </section>
  );
}
