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
