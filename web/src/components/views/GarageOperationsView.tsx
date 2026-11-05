// ============================================================================
// MÀN HÌNH VẬN HÀNH DOANH THU, VÍ GARA & ĐIỀU PHỐI CHUYẾN CHỞ XE (GARAGE OPERATIONS VIEW)
// Tác giả & Phụ trách: Nguyễn Hoàng Long - Luồng Tài chính Gara (UC-26) & Vận hành Gara
// Mục đích:
// 1. Khi `mode === 'finance'`: Hiển thị giao diện Quản lý Doanh thu & Ví điện tử dành cho Chủ Gara.
// 2. Khi `mode === 'transport'`: Tự động đồng bộ danh sách các đơn cứu hộ chở xe qua ngập đơn lẻ
//    (`SINGLE_CROSSING`) theo thời gian thực (polling mỗi 10 giây) từ API `rescueApi.getGarageOrders()`.
// 3. Tích hợp xem Audit Log (Nhật ký hành trình đơn hàng cứu hộ).
// ============================================================================

import React, { useEffect, useState, useCallback } from 'react';
import { GarageFinanceView } from './GarageFinanceView';
import { Truck, CheckCircle, Clock, History, X } from 'lucide-react';
import { GarageHeading, GarageStat, GaragePanel } from '../garage/GarageUI';
import { rescueApi, RescueOrderWebResponse } from '../../services/rescueApi';
import { attendanceApi, RescueOrderAuditLogDto } from '../../services/attendanceApi';

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

  // State xem Audit Logs của đơn hàng
  const [selectedAuditOrder, setSelectedAuditOrder] = useState<{ id: number; code: string } | null>(null);
  const [auditLogs, setAuditLogs] = useState<RescueOrderAuditLogDto[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);

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

  /**
   * Mở modal tra cứu lịch sử vòng đời đơn hàng
   */
  const handleOpenAudit = async (orderId: number, orderCode: string) => {
    setSelectedAuditOrder({ id: orderId, code: orderCode });
    setLoadingAudit(true);
    try {
      const logs = await attendanceApi.getOrderAuditLogs(orderId);
      setAuditLogs(logs || []);
    } catch (err) {
      console.error('Không thể tải nhật ký đơn hàng', err);
      setAuditLogs([]);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleCloseAudit = () => {
    setSelectedAuditOrder(null);
    setAuditLogs([]);
  };

  if (mode === 'finance') return <GarageFinanceView />;

  return (
    <section className="garage-portal">
      <GarageHeading
        title="Điều phối chuyến chở xe vượt ngập"
        description="Quản lý các chuyến chở xe máy qua ngập đơn lẻ (SINGLE_CROSSING) của gara và giám sát toàn bộ vết kiểm toán (Audit Trail)."
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
                      <th>Nhật ký đơn</th>
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
                        <td>
                          <button
                            type="button"
                            className="garage-btn-secondary"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                              fontSize: 12,
                              padding: '4px 8px',
                              cursor: 'pointer'
                            }}
                            onClick={() => void handleOpenAudit(order.id, order.orderCode)}
                            title="Xem lịch sử thay đổi trạng thái và nhật ký điều phối"
                          >
                            <History size={13} /> Lịch sử
                          </button>
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

      {/* MODAL XEM AUDIT LOGS CỦA ĐƠN HÀNG */}
      {selectedAuditOrder && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 16
          }}
          onClick={handleCloseAudit}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: 12,
              maxWidth: 640,
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottom: '1px solid #e5e7eb', paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>
                  Nhật ký tiến trình: {selectedAuditOrder.code}
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 13, color: '#6b7280' }}>
                  Toàn bộ vết kiểm toán sự kiện tiếp nhận, điều phối, di chuyển và hoàn tất
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseAudit}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            {loadingAudit ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#6b7280' }}>
                Đang tải vết kiểm toán đơn hàng...
              </div>
            ) : auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9ca3af' }}>
                Chưa ghi nhận sự kiện nhật ký nào cho đơn này.
              </div>
            ) : (
              <div style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid #e5e7eb', marginLeft: 8 }}>
                {auditLogs.map((log) => (
                  <div key={log.id} style={{ position: 'relative', marginBottom: 20 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -31,
                        top: 2,
                        width: 14,
                        height: 14,
                        borderRadius: '50%',
                        backgroundColor: '#2563eb',
                        border: '2px solid #ffffff',
                        boxShadow: '0 0 0 2px #93c5fd'
                      }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                        {log.action}
                      </span>
                      <span style={{ fontSize: 12, color: '#64748b' }}>
                        {new Date(log.createdAt).toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div style={{ marginTop: 4, fontSize: 13, color: '#475569' }}>
                      {log.statusFrom && log.statusTo && (
                        <span style={{ display: 'inline-block', marginRight: 8, padding: '2px 6px', background: '#f1f5f9', borderRadius: 4, fontSize: 11, fontWeight: 500 }}>
                          {log.statusFrom} → {log.statusTo}
                        </span>
                      )}
                      <span>Bởi: <strong>{log.actorName || log.actorRole}</strong></span>
                    </div>
                    {log.notes && (
                      <div style={{ marginTop: 6, fontSize: 13, color: '#334155', background: '#f8fafc', padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                        Ghi chú: {log.notes}
                      </div>
                    )}
                    {log.evidencePhotoUrl && (
                      <div style={{ marginTop: 6 }}>
                        <a
                          href={log.evidencePhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: 12, color: '#2563eb', textDecoration: 'underline' }}
                        >
                          Xem ảnh bằng chứng đính kèm
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ marginTop: 20, textAlign: 'right', borderTop: '1px solid #e5e7eb', paddingTop: 12 }}>
              <button
                type="button"
                onClick={handleCloseAudit}
                className="garage-btn-secondary"
                style={{ padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
