-- PostgreSQL: chỉ SELECT, không thay đổi dữ liệu.
-- 1. Đơn của gara test và offer đã gửi cho ai.
-- NULL offer + DISPATCH_FAILED: kiểm tra điều kiện thợ.
-- PENDING + đúng username: backend đã gửi, kiểm tra UI thợ và hạn expires_at.
-- EXPIRED: thợ không nhận kịp; worker sẽ/đã thử người tiếp theo.

SELECT ro.id AS order_id, ro.order_code, ro.status AS order_status,
       ro.pickup_latitude, ro.pickup_longitude,
       ro.requested_at,
       o.id AS offer_id, u.username AS offered_to,
       o.status AS offer_status, o.offered_at, o.expires_at, o.responded_at,
       ro.cancel_reason
FROM rescue_orders ro
JOIN garages g ON g.id = ro.garage_id
JOIN users owner_account ON owner_account.id = g.owner_user_id
LEFT JOIN rescue_offers o ON o.rescue_order_id = ro.id
LEFT JOIN mechanic_staffs ms ON ms.id = o.mechanic_staff_id
LEFT JOIN users u ON u.id = ms.user_id
WHERE owner_account.username = 'gps108413_owner'
ORDER BY ro.requested_at DESC, o.offered_at DESC
LIMIT 30;

-- 2. Tình trạng hai thợ test: đủ điều kiện nhận đơn hay không.
-- Ngưỡng 5 phút dưới đây tương ứng cấu hình mặc định hiện tại.
SELECT u.username, u.is_active, ms.id AS mechanic_staff_id,
       ms.working_status, ms.has_crossing_capability,
       g.garage_name, g.status AS garage_status,
       b.branch_name, b.operating_status AS branch_status,
       ms.current_latitude, ms.current_longitude,
       ms.last_heartbeat_at, ms.last_gps_updated_at,
       timezone('Asia/Ho_Chi_Minh', clock_timestamp()) AS now_vietnam,
       COALESCE(ms.last_gps_updated_at, ms.last_heartbeat_at)
           >= timezone('Asia/Ho_Chi_Minh', clock_timestamp()) - INTERVAL '5 minutes'
           AS gps_fresh_default,
       EXISTS (
           SELECT 1 FROM rescue_orders active_order
           WHERE active_order.mechanic_staff_id = ms.id
             AND active_order.status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS')
       ) AS has_active_order
FROM users u
JOIN mechanic_staffs ms ON ms.user_id = u.id
JOIN garages g ON g.id = ms.garage_id
LEFT JOIN garage_branches b ON b.id = ms.branch_id
WHERE u.username IN ('gps108413_mech1', 'gps108413_mech2')
ORDER BY u.username;
