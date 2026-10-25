-- PostgreSQL: làm mới GPS cho đúng hai thợ test khi seed đã quá 5 phút.
-- Chỉ dùng trên DB TEST; không tác động thợ BUSY hoặc đơn đang hoạt động.
-- Không hủy đơn. Không thay đổi working_status; nếu đã tắt online thì bật lại trên app.

UPDATE mechanic_staffs ms
SET current_latitude = CASE WHEN u.username = 'gps108462_mech1' THEN 10.8462 ELSE 10.8465 END,
    current_longitude = CASE WHEN u.username = 'gps108462_mech1' THEN 106.8150 ELSE 106.8153 END,
    last_heartbeat_at = timezone('Asia/Ho_Chi_Minh', clock_timestamp()),
    last_gps_updated_at = timezone('Asia/Ho_Chi_Minh', clock_timestamp()),
    updated_at = timezone('Asia/Ho_Chi_Minh', clock_timestamp())
FROM users u
WHERE ms.user_id = u.id
  AND u.username IN ('gps108462_mech1', 'gps108462_mech2')
  AND u.is_active = TRUE
  AND ms.working_status = 'AVAILABLE'
  AND EXISTS (
      SELECT 1 FROM garages g JOIN users owner_account ON owner_account.id = g.owner_user_id
      WHERE g.id = ms.garage_id AND owner_account.username = 'gps108462_owner'
  )
  AND NOT EXISTS (
      SELECT 1 FROM rescue_orders ro
      WHERE ro.mechanic_staff_id = ms.id
        AND ro.status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS')
  )
RETURNING u.username, ms.working_status,
          ms.current_latitude, ms.current_longitude, ms.last_gps_updated_at;
