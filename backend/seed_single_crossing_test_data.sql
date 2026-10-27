-- PostgreSQL / DATABASE TEST: chạy toàn bộ script, backend phải tạo schema trước.
-- Namespace riêng: sc_test_customer, sc_test_mech1, sc_test_mech2,
-- sc_test_owner, sc_test_staff, sc_test_admin. Tài khoản MỚI: Password@123.
-- Không đổi mật khẩu/role/is_active của tài khoản đã có; trùng identity thì rollback.
-- Không đổi bất cứ cột nào của thợ BUSY hoặc có đơn active. Bỏ qua thợ bị khóa.
-- Tọa độ seed Q.7 chỉ phục vụ test, không thay cho GPS thiết bị thật.
-- GPS mặc định hết hạn sau 5 phút; chạy lại chỉ làm mới fixture nhàn rỗi.
-- TIMESTAMP giả định backend chạy giờ Việt Nam.
BEGIN;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';
DO $seed$
BEGIN
PERFORM pg_advisory_xact_lock(393, 20261025);

-- ==========================================================================================
-- MOTORBIKE FLOOD RESCUE PLATFORM (PRM393) - LUỒNG 3: CHỞ XE VƯỢT NGẬP ĐƠN LẺ
-- SCRIPT SEED DỮ LIỆU KIỂM THỬ ĐẦY ĐỦ (PostgreSQL / DBeaver / pgAdmin)
-- ==========================================================================================
-- Mật khẩu chung cho tất cả các tài khoản: Password@123
-- Hash BCrypt: $2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6
-- ==========================================================================================

-- ------------------------------------------------------------------------------------------
-- 1. TẠO CÁC TÀI KHOẢN NGƯỜI DÙNG (USERS)
-- ------------------------------------------------------------------------------------------
-- A. Khách hàng (Customer) - Dùng trên Mobile App để gửi SOS
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'sc_test_customer',
    'sc_test.customer@example.invalid',
    NULL,
    '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
    'Hoàng Văn Khách (Chủ xe SH)',
    'https://ui-avatars.com/api/?name=Hoang+Khach&background=2563EB&color=fff',
    'CUSTOMER',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- B. Thợ cứu hộ chính (Field Mechanic 1 - Q.7) - Dùng trên Mobile App để nhận đơn điều phối
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'sc_test_mech1',
    'sc_test.mech1@example.invalid',
    NULL,
    '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
    'Phạm Thợ Cứu Hộ (Đội Cơ Động Q7)',
    'https://ui-avatars.com/api/?name=Pham+Mechanic&background=DC2626&color=fff',
    'FIELD_MECHANIC',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- C. Thợ cứu hộ phụ (Field Mechanic 2 - Q.7) - Thợ dự phòng nhận offer tuần tự
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'sc_test_mech2',
    'sc_test.mech2@example.invalid',
    NULL,
    '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
    'Nguyễn Văn Cường (KTV Dự Phòng Q7)',
    'https://ui-avatars.com/api/?name=Nguyen+Cuong&background=0284C7&color=fff',
    'FIELD_MECHANIC',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- D. Chủ Gara (Garage Owner) - Dùng trên Web Portal để theo dõi các chuyến chở xe
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'sc_test_owner',
    'sc_test.owner@example.invalid',
    NULL,
    '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
    'Lê Văn Gara (Chủ Gara Toàn Thắng)',
    'https://ui-avatars.com/api/?name=Le+Gara&background=EA580C&color=fff',
    'GARAGE_OWNER',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- E. Nhân viên điều phối (Staff) - Dùng trên Web Portal để giám sát Live Dispatch
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'sc_test_staff',
    'sc_test.staff@example.invalid',
    NULL,
    '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
    'Trần Điều Hành (Operations Staff)',
    'https://ui-avatars.com/api/?name=Tran+Staff&background=16A34A&color=fff',
    'STAFF',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;

-- F. Quản trị viên hệ thống (Admin)
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'sc_test_admin',
    'sc_test.admin@example.invalid',
    NULL,
    '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
    'Nguyễn Quản Trị (Financial Admin)',
    'https://ui-avatars.com/api/?name=Nguyen+Admin&background=0D8ABC&color=fff',
    'ADMIN',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO NOTHING;


-- ------------------------------------------------------------------------------------------
-- Trùng namespace nhưng khác danh tính: rollback toàn bộ, không sửa tài khoản.
IF EXISTS (
    SELECT 1
    FROM (VALUES
        ('sc_test_customer', 'sc_test.customer@example.invalid', 'CUSTOMER'),
        ('sc_test_mech1', 'sc_test.mech1@example.invalid', 'FIELD_MECHANIC'),
        ('sc_test_mech2', 'sc_test.mech2@example.invalid', 'FIELD_MECHANIC'),
        ('sc_test_owner', 'sc_test.owner@example.invalid', 'GARAGE_OWNER'),
        ('sc_test_staff', 'sc_test.staff@example.invalid', 'STAFF'),
        ('sc_test_admin', 'sc_test.admin@example.invalid', 'ADMIN')
    ) AS fixture(username, email, role)
    JOIN users u ON u.username = fixture.username
    WHERE u.email IS DISTINCT FROM fixture.email OR u.role::TEXT IS DISTINCT FROM fixture.role
) THEN
    RAISE EXCEPTION 'Namespace sc_test_* bị trùng email/role. Không thay đổi dữ liệu hiện có.';
END IF;

-- 2. TẠO HỒ SƠ GARA CỨU HỘ (GARAGES)
-- ------------------------------------------------------------------------------------------
INSERT INTO garages (owner_user_id, garage_name, phone, business_license_url, id_card_url, status, wallet_balance, created_at, updated_at)
SELECT
    u.id,
    'Gara TEST SC Toàn Thắng Sài Gòn',
    NULL,
    'https://res.cloudinary.com/demo/image/upload/sample_license.jpg',
    'https://res.cloudinary.com/demo/image/upload/sample_cccd.jpg',
    'APPROVED',
    24850000.00,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'sc_test_owner'
  AND NOT EXISTS (SELECT 1 FROM garages g WHERE g.owner_user_id = u.id);


-- ------------------------------------------------------------------------------------------
-- 3. TẠO CHI NHÁNH CỨU HỘ (GARAGE_BRANCHES)
-- ------------------------------------------------------------------------------------------
-- Chi nhánh 1: Quận 7 - Huỳnh Tấn Phát (Tọa độ: 10.7380, 106.7210)
INSERT INTO garage_branches (garage_id, branch_name, address, latitude, longitude, phone_number, rescue_vehicles, operating_status, created_at, updated_at)
SELECT
    g.id,
    'Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)',
    '85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7, TP.HCM',
    10.7380,
    106.7210,
    '0903.111.222',
    '1 Xe tải chở xe vượt ngập + 2 Xe máy chuyên dụng',
    'OPEN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM garages g
JOIN users u ON g.owner_user_id = u.id
WHERE u.username = 'sc_test_owner'
  AND NOT EXISTS (SELECT 1 FROM garage_branches b WHERE b.garage_id = g.id AND b.branch_name LIKE '%Chi nhánh 1%');

-- Chi nhánh 2: Quận 8 - Phạm Thế Hiển (Tọa độ: 10.7420, 106.6850)
INSERT INTO garage_branches (garage_id, branch_name, address, latitude, longitude, phone_number, rescue_vehicles, operating_status, created_at, updated_at)
SELECT
    g.id,
    'Chi nhánh 2 (Q.8 - Phạm Thế Hiển)',
    '340 Phạm Thế Hiển, Phường 3, Quận 8, TP.HCM',
    10.7420,
    106.6850,
    '0903.111.333',
    '1 Xe chở ngập + 2 Xe cơ động',
    'OPEN',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM garages g
JOIN users u ON g.owner_user_id = u.id
WHERE u.username = 'sc_test_owner'
  AND NOT EXISTS (SELECT 1 FROM garage_branches b WHERE b.garage_id = g.id AND b.branch_name LIKE '%Chi nhánh 2%');


-- ------------------------------------------------------------------------------------------
-- 4. BẢNG GIÁ DỊCH VỤ NIÊM YẾT GARA (GARAGE_SERVICE_CATALOG)
-- ------------------------------------------------------------------------------------------
-- Dịch vụ bắt buộc cho Luồng 3: ServiceType = CROSSING (120.000 ₫)
INSERT INTO garage_service_catalog (
    garage_id, service_name, category, service_type, standard_price, min_price, max_price, unit, estimated_time_min, description, is_active, warranty_days, created_at, updated_at
)
SELECT
    g.id,
    'Chở xe qua ngập (Chuyến riêng)',
    'VƯỢT NGẬP',
    'CROSSING',
    120000.00,
    100000.00,
    150000.00,
    'lượt',
    20,
    'Một thợ kèm xe chuyên chở chở riêng xe máy và khách qua đoạn ngập sâu đến nơi khô ráo an toàn. Giá niêm yết cố định.',
    TRUE,
    3,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM garages g
JOIN users u ON g.owner_user_id = u.id
WHERE u.username = 'sc_test_owner'
  AND NOT EXISTS (SELECT 1 FROM garage_service_catalog sc WHERE sc.garage_id = g.id AND sc.service_type = 'CROSSING');

-- Dịch vụ sửa chữa tại chỗ (REPAIR_ONSITE)
INSERT INTO garage_service_catalog (
    garage_id, service_name, category, service_type, standard_price, min_price, max_price, unit, estimated_time_min, description, is_active, warranty_days, created_at, updated_at
)
SELECT
    g.id,
    'Sấy bugi & Xả nước buồng đốt',
    'SỬA TẠI CHỖ',
    'REPAIR_ONSITE',
    80000.00,
    70000.00,
    100000.00,
    'lượt',
    15,
    'Khắc phục xe chết máy do ngập nước tại chỗ',
    TRUE,
    7,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM garages g
JOIN users u ON g.owner_user_id = u.id
WHERE u.username = 'sc_test_owner'
  AND NOT EXISTS (SELECT 1 FROM garage_service_catalog sc WHERE sc.garage_id = g.id AND sc.service_type = 'REPAIR_ONSITE');


-- ------------------------------------------------------------------------------------------
-- 5. PHÂN BỔ THỢ CỨU HỘ VÀ TRẠNG THÁI SẴN SÀNG (MECHANIC_STAFFS)
-- ------------------------------------------------------------------------------------------
-- Schema phải được backend tạo trước; seed không thay đổi cấu trúc hoặc default của bảng.

-- Không tự điều chuyển một fixture thợ đã thuộc gara khác.
IF EXISTS (
    SELECT 1 FROM mechanic_staffs ms
    JOIN users u ON u.id = ms.user_id
    JOIN garages g ON g.id = ms.garage_id
    JOIN users owner_account ON owner_account.id = g.owner_user_id
    WHERE u.username IN ('sc_test_mech1', 'sc_test_mech2')
      AND owner_account.username <> 'sc_test_owner'
) THEN
    RAISE EXCEPTION 'Thợ sc_test_* thuộc gara khác; không tự điều chuyển.';
END IF;

-- Thợ 1: Phạm Thợ Cứu Hộ (field_mechanic) -> AVAILABLE, có xe chở, tọa độ gần Huỳnh Tấn Phát Q.7
INSERT INTO mechanic_staffs (
    user_id, garage_id, branch_id, working_status, shift_name, rating_avg, speciality,
    current_latitude, current_longitude, has_crossing_capability, last_heartbeat_at, last_gps_updated_at, created_at, updated_at
)
SELECT
    u.id,
    g.id,
    b.id,
    'AVAILABLE',
    'Ca trực bão Q7',
    5.0,
    'Chở xe máy qua vùng ngập sâu bằng xe nâng chuyên dụng',
    10.7385,
    106.7215,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
JOIN garages g ON g.owner_user_id = (SELECT id FROM users WHERE username = 'sc_test_owner')
JOIN garage_branches b ON b.garage_id = g.id AND b.branch_name LIKE '%Chi nhánh 1%'
WHERE u.username = 'sc_test_mech1' AND u.is_active = TRUE
ON CONFLICT (user_id) DO UPDATE
SET working_status = 'AVAILABLE',
    branch_id = EXCLUDED.branch_id,
    current_latitude = EXCLUDED.current_latitude,
    current_longitude = EXCLUDED.current_longitude,
    has_crossing_capability = TRUE,
    last_heartbeat_at = EXCLUDED.last_heartbeat_at,
    last_gps_updated_at = EXCLUDED.last_gps_updated_at,
    updated_at = EXCLUDED.updated_at
WHERE mechanic_staffs.garage_id = EXCLUDED.garage_id
  AND mechanic_staffs.working_status <> 'BUSY'
  AND NOT EXISTS (
      SELECT 1 FROM rescue_orders ro
      WHERE ro.mechanic_staff_id = mechanic_staffs.id
        AND ro.status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS')
  );

-- Thợ 2: Nguyễn Văn Cường (mechanic_02) -> AVAILABLE, có xe chở, tọa độ gần Q.7
INSERT INTO mechanic_staffs (
    user_id, garage_id, branch_id, working_status, shift_name, rating_avg, speciality,
    current_latitude, current_longitude, has_crossing_capability, last_heartbeat_at, last_gps_updated_at, created_at, updated_at
)
SELECT
    u.id,
    g.id,
    b.id,
    'AVAILABLE',
    'Ca sáng Q7',
    4.9,
    'Xe ba gác sàn thấp chở xe qua ngập',
    10.7392,
    106.7225,
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users u
JOIN garages g ON g.owner_user_id = (SELECT id FROM users WHERE username = 'sc_test_owner')
JOIN garage_branches b ON b.garage_id = g.id AND b.branch_name LIKE '%Chi nhánh 1%'
WHERE u.username = 'sc_test_mech2' AND u.is_active = TRUE
ON CONFLICT (user_id) DO UPDATE
SET working_status = 'AVAILABLE',
    branch_id = EXCLUDED.branch_id,
    current_latitude = EXCLUDED.current_latitude,
    current_longitude = EXCLUDED.current_longitude,
    has_crossing_capability = TRUE,
    last_heartbeat_at = EXCLUDED.last_heartbeat_at,
    last_gps_updated_at = EXCLUDED.last_gps_updated_at,
    updated_at = EXCLUDED.updated_at
WHERE mechanic_staffs.garage_id = EXCLUDED.garage_id
  AND mechanic_staffs.working_status <> 'BUSY'
  AND NOT EXISTS (
      SELECT 1 FROM rescue_orders ro
      WHERE ro.mechanic_staff_id = mechanic_staffs.id
        AND ro.status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS')
  );


-- ------------------------------------------------------------------------------------------
-- 6. TẠO 1 ĐƠN HÀNG MẪU ĐÃ HOÀN THÀNH (ĐỂ XEM NGAY TRÊN WEB & LỊCH SỬ APP)
-- ------------------------------------------------------------------------------------------
INSERT INTO rescue_orders (
    order_code, customer_id, mechanic_staff_id, garage_id, branch_id, service_item_id,
    order_type, status, transport_stage,
    vehicle_id, vehicle_plate, vehicle_model, vehicle_type,
    pickup_address, pickup_latitude, pickup_longitude,
    dropoff_address, dropoff_latitude, dropoff_longitude,
    service_base_price, booking_fee, total_amount, currency,
    water_level, customer_notes,
    completion_photo_url, handover_photo_url, completion_notes,
    requested_at, accepted_at, arrived_at, service_started_at, service_completed_at,
    created_at, updated_at
)
SELECT
    'SC-TEST-20261025-DEMO01',
    (SELECT id FROM users WHERE username = 'sc_test_customer'),
    (SELECT id FROM mechanic_staffs WHERE user_id = (SELECT id FROM users WHERE username = 'sc_test_mech1')),
    g.id,
    b.id,
    sc.id,
    'SINGLE_CROSSING',
    'CANCELLED',
    'HANDED_OVER',
    1,
    '59-B1 892.44',
    'Honda SH 150i',
    'Tay ga cao cấp',
    '85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7, TP.HCM',
    10.7380,
    106.7210,
    'Cầu Phú Mỹ (Khu vực gò cao khô ráo), Quận 7, TP.HCM',
    10.7490,
    106.7290,
    120000.00,
    30000.00,
    150000.00,
    'VND',
    'Nửa bánh · 35 cm',
    'Chở xe vượt ngập đơn lẻ đến nơi khô ráo',
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80',
    'Đã bàn giao xe nguyên vẹn, máy khô ráo cho khách hàng tại chân cầu Phú Mỹ.',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '44 minutes',
    CURRENT_TIMESTAMP - INTERVAL '35 minutes',
    CURRENT_TIMESTAMP - INTERVAL '30 minutes',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes',
    CURRENT_TIMESTAMP - INTERVAL '45 minutes',
    CURRENT_TIMESTAMP - INTERVAL '10 minutes'
FROM garages g
JOIN garage_branches b ON b.garage_id = g.id AND b.branch_name LIKE '%Chi nhánh 1%'
JOIN garage_service_catalog sc ON sc.garage_id = g.id AND sc.service_type = 'CROSSING'
WHERE g.owner_user_id = (SELECT id FROM users WHERE username = 'sc_test_owner')
ON CONFLICT (order_code) DO NOTHING;


-- ------------------------------------------------------------------------------------------

END;
$seed$;
COMMIT;
