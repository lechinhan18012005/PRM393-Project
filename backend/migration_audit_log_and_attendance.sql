-- ============================================================================
-- Migration: Audit Log Đơn Hàng & Bảng Chấm Công Ra/Vào của Thợ Cứu Hộ
-- Dự án: PRM393 - Motorbike Flood Rescue Platform
-- Ngày tạo: 06/11/2026
-- ============================================================================

-- 1. Bảng lưu vết thay đổi trạng thái làm việc & Chấm công Thợ cứu hộ
CREATE TABLE IF NOT EXISTS mechanic_status_logs (
    id BIGSERIAL PRIMARY KEY,
    mechanic_staff_id BIGINT NOT NULL REFERENCES mechanic_staffs(id) ON DELETE CASCADE,
    garage_id BIGINT NOT NULL REFERENCES garages(id) ON DELETE CASCADE,
    branch_id BIGINT REFERENCES garage_branches(id) ON DELETE SET NULL,
    
    event_type VARCHAR(30) NOT NULL, 
    -- 'ONLINE', 'PAUSE', 'RESUME', 'OFFLINE', 'AUTO_REAPED', 'BUSY_START', 'BUSY_END'
    
    status_from VARCHAR(30) NULL,      -- OFFLINE, AVAILABLE, BUSY
    status_to VARCHAR(30) NOT NULL,      -- OFFLINE, AVAILABLE, BUSY
    
    pause_reason VARCHAR(100) NULL,     -- 'Nghỉ ăn trưa', 'Đổ xăng', 'Hết ca', ...
    is_manual_override BOOLEAN DEFAULT FALSE,
    is_overtime BOOLEAN DEFAULT FALSE,   -- True nếu ngoài giờ ca trực
    
    latitude DOUBLE PRECISION NULL,
    longitude DOUBLE PRECISION NULL,
    device_battery_pct INTEGER NULL,    -- Mức pin thiết bị nếu có
    
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mech_status_logs_mech_time 
    ON mechanic_status_logs(mechanic_staff_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mech_status_logs_garage_time 
    ON mechanic_status_logs(garage_id, created_at DESC);


-- 2. Bảng lưu vết toàn bộ vòng đời & sự kiện của Đơn Cứu Hộ (Audit Trail)
CREATE TABLE IF NOT EXISTS rescue_order_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES rescue_orders(id) ON DELETE CASCADE,
    order_code VARCHAR(50) NOT NULL,
    mechanic_staff_id BIGINT REFERENCES mechanic_staffs(id) ON DELETE SET NULL,
    
    action VARCHAR(50) NOT NULL,
    -- 'CREATED', 'OFFER_SENT', 'OFFER_ACCEPTED', 'OFFER_REJECTED', 
    -- 'ARRIVED', 'SERVICE_STARTED', 'QUOTATION_SUBMITTED', 'QUOTATION_APPROVED',
    -- 'COMPLETED', 'PAID', 'CANCELLED'
    
    status_from VARCHAR(30) NULL,
    status_to VARCHAR(30) NOT NULL,
    
    actor_id BIGINT REFERENCES users(id),
    actor_role VARCHAR(30) NOT NULL,   -- 'FIELD_MECHANIC', 'CUSTOMER', 'GARAGE_STAFF', 'SYSTEM'
    
    notes VARCHAR(500) NULL,
    latitude DOUBLE PRECISION NULL,
    longitude DOUBLE PRECISION NULL,
    evidence_photo_url VARCHAR(500) NULL,
    
    created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rescue_audit_order 
    ON rescue_order_audit_logs(order_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_rescue_audit_code 
    ON rescue_order_audit_logs(order_code, created_at ASC);
