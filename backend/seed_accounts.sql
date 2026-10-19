-- ==========================================================================================
-- MOTORBIKE FLOOD RESCUE PLATFORM - SCRIPT KHỞI TẠO TÀI KHOẢN (TRUYỀN THỐNG)
-- Hệ quản trị CSDL: PostgreSQL / MySQL
-- ==========================================================================================

-- 1. BẢNG USERS (Nếu chưa được Hibernate tự động tạo)
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    role VARCHAR(30) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================================================
-- 2. DỮ LIỆU TÀI KHOẢN MẪU (SEED ACCOUNTS)
-- Mật khẩu chung: Password@123
-- BCrypt Hash: $2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym
-- (Nếu muốn dùng mật khẩu: 123456 -> BCrypt Hash: $2a$10$py7rCsFJSjobo2sniHF69OBu78SsPB8zyNoLbWefDm5jTxa56aNu.)
-- ==========================================================================================

-- A. ADMIN (Quản trị viên hệ thống)
-- Đăng nhập: username="admin" hoặc phone="0900000001", password="Password@123"
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'admin',
    'admin@floodrescue.vn',
    '0900000001',
    '$2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym',
    'Nguyễn Quản Trị',
    'https://ui-avatars.com/api/?name=Nguyen+Admin&background=0D8ABC&color=fff',
    'ADMIN',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, 
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- B. STAFF (Nhân viên điều phối cứu hộ)
-- Đăng nhập: username="staff" hoặc phone="0900000002", password="Password@123"
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'staff',
    'staff@floodrescue.vn',
    '0900000002',
    '$2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym',
    'Trần Điều Hành',
    'https://ui-avatars.com/api/?name=Tran+Staff&background=16A34A&color=fff',
    'STAFF',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, 
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- C. GARAGE_OWNER (Chủ gara liên kết)
-- Đăng nhập: username="garage_owner" hoặc phone="0900000003", password="Password@123"
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'garage_owner',
    'garage@floodrescue.vn',
    '0900000003',
    '$2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym',
    'Lê Văn Gara',
    'https://ui-avatars.com/api/?name=Le+Gara&background=EA580C&color=fff',
    'GARAGE_OWNER',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, 
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- D. FIELD_MECHANIC (Nhân viên cứu hộ / Kỹ thuật viên thực địa)
-- Đăng nhập: username="field_mechanic" hoặc phone="0900000004", password="Password@123"
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'field_mechanic',
    'mechanic@floodrescue.vn',
    '0900000004',
    '$2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym',
    'Phạm Thợ Cứu Hộ',
    'https://ui-avatars.com/api/?name=Pham+Mechanic&background=DC2626&color=fff',
    'FIELD_MECHANIC',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, 
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- E. CUSTOMER (Khách hàng)
-- Đăng nhập: username="customer" hoặc phone="0900000005", password="Password@123"
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES (
    'customer',
    'customer@floodrescue.vn',
    '0900000005',
    '$2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym',
    'Hoàng Văn Khách',
    'https://ui-avatars.com/api/?name=Hoang+Khach&background=2563EB&color=fff',
    'CUSTOMER',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, 
    role = EXCLUDED.role,
    updated_at = CURRENT_TIMESTAMP;

-- F. THỢ CƠ ĐỘNG PHỤ (Phục vụ phân bổ chi nhánh & trực chiến)
INSERT INTO users (username, email, phone, password, full_name, avatar_url, role, is_active, created_at, updated_at)
VALUES 
('mechanic_02', 'mechanic2@floodrescue.vn', '0900000012', '$2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym', 'Nguyễn Văn Cường', 'https://ui-avatars.com/api/?name=Nguyen+Cuong&background=random', 'FIELD_MECHANIC', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
('mechanic_03', 'mechanic3@floodrescue.vn', '0900000013', '$2a$10$ekuNnyClOT9tMM0t810owOoF4RKXaIl8I.d6QfmpS5jBZcmcPyhym', 'Đặng Hữu Tài', 'https://ui-avatars.com/api/?name=Dang+Tai&background=random', 'FIELD_MECHANIC', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (username) DO NOTHING;

-- ==========================================================================================
-- 3. DỮ LIỆU GARA & CHI NHÁNH CỨU HỘ (UC-04)
-- ==========================================================================================

-- Tạo Gara cho garage_owner
INSERT INTO garages (owner_user_id, garage_name, phone, business_license_url, id_card_url, status, wallet_balance, created_at, updated_at)
SELECT u.id, 'Gara Cứu Hộ Toàn Thắng Sài Gòn', '0900000003', 'https://res.cloudinary.com/demo/image/upload/sample_license.jpg', 'https://res.cloudinary.com/demo/image/upload/sample_cccd.jpg', 'APPROVED', 24850000, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users u
WHERE u.username = 'garage_owner'
ON CONFLICT DO NOTHING;

-- Tạo các chi nhánh cứu hộ
INSERT INTO garage_branches (garage_id, branch_name, address, latitude, longitude, phone_number, rescue_vehicles, operating_status, created_at, updated_at)
SELECT g.id, 'Chi nhánh 1 (Q.7 - Huỳnh Tấn Phát)', '85 Huỳnh Tấn Phát, P. Tân Thuận Đông, Quận 7, TP.HCM', 10.7380, 106.7210, '0903.111.222', '1 Xe tải nhẹ + 2 Xe máy chuyên dụng', 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM garages g JOIN users u ON g.owner_user_id = u.id WHERE u.username = 'garage_owner'
ON CONFLICT DO NOTHING;

INSERT INTO garage_branches (garage_id, branch_name, address, latitude, longitude, phone_number, rescue_vehicles, operating_status, created_at, updated_at)
SELECT g.id, 'Chi nhánh 2 (Q.8 - Phạm Thế Hiển)', '340 Phạm Thế Hiển, Phường 3, Quận 8, TP.HCM', 10.7420, 106.6850, '0903.111.333', '2 Xe máy cứu hộ ngập', 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM garages g JOIN users u ON g.owner_user_id = u.id WHERE u.username = 'garage_owner'
ON CONFLICT DO NOTHING;

INSERT INTO garage_branches (garage_id, branch_name, address, latitude, longitude, phone_number, rescue_vehicles, operating_status, created_at, updated_at)
SELECT g.id, 'Chi nhánh 3 (Bình Thạnh - Ung Văn Khiêm)', '45 Ung Văn Khiêm, Phường 25, Bình Thạnh, TP.HCM', 10.8030, 106.7150, '0903.111.444', '1 Xe bán tải + 3 Xe máy', 'OPEN', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM garages g JOIN users u ON g.owner_user_id = u.id WHERE u.username = 'garage_owner'
ON CONFLICT DO NOTHING;

-- Phân bổ thợ trực chiến vào chi nhánh
INSERT INTO mechanic_staffs (user_id, garage_id, branch_id, working_status, shift_name, rating_avg, speciality, current_latitude, current_longitude, created_at, updated_at)
SELECT u.id, g.id, b.id, 'AVAILABLE', 'Ca trực bão Q7', 5.0, 'Sửa bugi ngập, kích bình, thay nhớt hút chân không', b.latitude, b.longitude, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users u, garages g, garage_branches b
WHERE u.username = 'field_mechanic' AND g.owner_user_id = (SELECT id FROM users WHERE username = 'garage_owner')
  AND b.branch_name LIKE '%Chi nhánh 1%' AND b.garage_id = g.id
ON CONFLICT DO NOTHING;

INSERT INTO mechanic_staffs (user_id, garage_id, branch_id, working_status, shift_name, rating_avg, speciality, current_latitude, current_longitude, created_at, updated_at)
SELECT u.id, g.id, b.id, 'AVAILABLE', 'Ca sáng', 4.9, 'Cứu hộ kéo xe máy ngập sâu', b.latitude, b.longitude, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users u, garages g, garage_branches b
WHERE u.username = 'mechanic_02' AND g.owner_user_id = (SELECT id FROM users WHERE username = 'garage_owner')
  AND b.branch_name LIKE '%Chi nhánh 1%' AND b.garage_id = g.id
ON CONFLICT DO NOTHING;

INSERT INTO mechanic_staffs (user_id, garage_id, branch_id, working_status, shift_name, rating_avg, speciality, current_latitude, current_longitude, created_at, updated_at)
SELECT u.id, g.id, b.id, 'AVAILABLE', 'Ca trực bão Q8', 4.8, 'Xử lý thủy kích xe tay ga', b.latitude, b.longitude, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM users u, garages g, garage_branches b
WHERE u.username = 'mechanic_03' AND g.owner_user_id = (SELECT id FROM users WHERE username = 'garage_owner')
  AND b.branch_name LIKE '%Chi nhánh 2%' AND b.garage_id = g.id
ON CONFLICT DO NOTHING;
