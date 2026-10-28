-- ==============================================================================
-- DATABASE MIGRATION: TUÂN THỦ NGHỊ ĐỊNH 13/2023/NĐ-CP VỀ BẢO VỆ DỮ LIỆU CÁ NHÂN
-- ==============================================================================

-- 1. Bổ sung các trường bảo mật & vòng đời dữ liệu vào bảng garages
ALTER TABLE garages
    ADD COLUMN IF NOT EXISTS nd13_consent BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS nd13_consented_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS nd13_consent_ip VARCHAR(50),
    ADD COLUMN IF NOT EXISTS id_card_number_encrypted VARCHAR(500),
    ADD COLUMN IF NOT EXISTS id_card_number_hash VARCHAR(64),
    ADD COLUMN IF NOT EXISTS business_license_storage_key VARCHAR(300),
    ADD COLUMN IF NOT EXISTS id_card_storage_key VARCHAR(300),
    ADD COLUMN IF NOT EXISTS kyc_retention_until TIMESTAMP,
    ADD COLUMN IF NOT EXISTS id_card_purged BOOLEAN NOT NULL DEFAULT FALSE;

-- Chỉ mục tìm kiếm băm số định danh mà không cần giải mã
CREATE INDEX IF NOT EXISTS idx_garages_id_card_hash ON garages(id_card_number_hash);
CREATE INDEX IF NOT EXISTS idx_garages_kyc_retention ON garages(kyc_retention_until) WHERE id_card_purged = FALSE;

-- 2. Tạo bảng nhật ký kiểm toán bất biến (Immutable Audit Log)
CREATE TABLE IF NOT EXISTS kyc_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    operator_id BIGINT NOT NULL,
    operator_username VARCHAR(100) NOT NULL,
    operator_role VARCHAR(50) NOT NULL,
    garage_id BIGINT NOT NULL,
    action VARCHAR(50) NOT NULL,
    resource_accessed VARCHAR(300),
    ip_address VARCHAR(50),
    user_agent VARCHAR(300),
    details VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Chỉ mục truy vấn nhật ký kiểm toán phục vụ thanh tra an toàn thông tin
CREATE INDEX IF NOT EXISTS idx_kyc_audit_garage ON kyc_audit_logs(garage_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_operator ON kyc_audit_logs(operator_id);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_action ON kyc_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_kyc_audit_time ON kyc_audit_logs(created_at);

-- 3. Phân quyền bảng (Security Policy): Chỉ super admin/audit reader được đọc log, không ai được sửa/xóa log
COMMENT ON TABLE kyc_audit_logs IS 'Bảng nhật ký kiểm toán truy cập dữ liệu nhạy cảm theo Điều 26 Nghị định 13/2023/NĐ-CP';
COMMENT ON COLUMN garages.id_card_number_encrypted IS 'Số CCCD được mã hóa At-Rest chuẩn AES-256-GCM';
COMMENT ON COLUMN garages.id_card_storage_key IS 'Đường dẫn Private Bucket lưu ảnh CCCD - Tuyệt đối không để Public Read';
