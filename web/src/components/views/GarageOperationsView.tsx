// ============================================================================
// MÀN HÌNH VẬN HÀNH DOANH THU, VÍ GARA & ĐIỀU PHỐI CHUYẾN CHỞ XE (GARAGE OPERATIONS VIEW)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Tài chính Gara (UC-26) & Vận hành Gara
// Mục đích:
// 1. Khi `mode === 'finance'`: Hiển thị giao diện Quản lý Doanh thu & Ví điện tử dành cho Chủ Gara.
// 2. Khi `mode === 'transport'`: Tự động đồng bộ danh sách các đơn cứu hộ chở xe qua ngập đơn lẻ
//    (`SINGLE_CROSSING`) theo thời gian thực (polling mỗi 10 giây) từ API `rescueApi.getGarageOrders()`.
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { GarageFinanceView } from './GarageFinanceView';
import { Truck, Receipt, CheckCircle, Clock } from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel } from '../garage/GarageUI';
import { rescueApi, RescueOrderWebResponse } from '../../services/rescueApi';

/**
 * Hàm định dạng số tiền sang chuẩn tiền tệ Việt Nam Đồng (VNĐ).
 */
const money = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

export function GarageOperationsView({ mode }: { mode: 'finance' | 'transport' }) {
  // Danh sách các đơn cứu hộ thuộc Gara hiện tại lấy từ REST API Backend
  const [garageOrders, setGarageOrders] = useState<RescueOrderWebResponse[]>([]);
  // Cờ báo hiệu đang tải danh sách đơn từ máy chủ
  const [loadingOrders, setLoadingOrders] = useState(false);

  /**
   * Hàm gọi API lấy danh sách đơn cứu hộ của Gara khi đang ở chế độ `transport`.
   */
  const fetchOrders = useCallback(async () => {
    if (mode !== 'transport') return;
    try {
      setLoadingOrders(true);
      const data = await rescueApi.getGarageOrders();
      setGarageOrders(data || []);
    } catch {
      // Nếu chưa kết nối hoặc chưa có đơn, giữ mảng hiện tại
    } finally {
      setLoadingOrders(false);
    }
  }, [mode]);

  /**
   * Tự động tải danh sách đơn cứu hộ khi mở màn hình và thiết lập bộ đếm thời gian (polling 10 giây/lần).
   */
  useEffect(() => {
    if (mode !== 'transport') return;
    void fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders, mode]);

  if (mode === 'finance') return <GarageFinanceView />;

  return (
    <section className="garage-portal">
      <GarageHeading
        title="Điều phối chuyến chở xe vượt ngập"
        description="Quản lý các chuyến chở xe máy qua ngập đơn lẻ (SINGLE_CROSSING) của gara."
      />

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
                    garageOrders.filter((o) =>
                      ['DISPATCHED', 'ARRIVED', 'IN_PROGRESS'].includes(o.status)
                    ).length
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
                  detail="Theo giá dịch vụ, chưa trừ chiết khấu nền tảng"
                  icon={<CheckCircle size={18} />}
                  accent="blue"
                />
              </div>

              <GaragePanel
                title="Danh sách chuyến chở xe đơn lẻ của gara"
                description="Dữ liệu thời gian thực được đồng bộ từ hệ thống điều phối cứu hộ"
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
                              {order.requestedAt
                                ? new Date(order.requestedAt).toLocaleTimeString('vi-VN')
                                : ''}
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
                                  order.transportStage === 'HANDOVER_COMPLETED'
                                    ? '#dcfce7'
                                    : '#e0f2fe',
                                color:
                                  order.transportStage === 'HANDOVER_COMPLETED'
                                    ? '#166534'
                                    : '#0369a1'
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
                            <small className="garage-muted">
                              {Number(order.bookingFee) > 0 ? `+ ${money(Number(order.bookingFee))} phí đặt xe (đơn cũ)` : 'Đã bao gồm phí chiết khấu của nền tảng'}
                            </small>
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
            <div className="garage-note">
              {loadingOrders
                ? 'Đang kiểm tra chuyến chở xe từ API...'
                : 'Chưa có đơn chở xe SINGLE_CROSSING nào được tạo cho gara này.'}
            </div>
          )}
      </>
    </section>
  );
}
