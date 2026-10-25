-- PostgreSQL: chạy toàn bộ script này trong DBeaver / pgAdmin trên database TEST.
-- Yêu cầu: backend đã chạy để tạo schema mới nhất.
-- Không sửa tài khoản/gara có sẵn của nhóm; chỉ dùng bộ tên gps108462_* riêng.
-- Tài khoản MỚI có mật khẩu Password@123 (BCrypt đã kiểm tra).
-- Không tạo đơn cứu hộ, không ghi thanh toán, không tự hủy đơn hoặc giải phóng thợ BUSY.
-- Tọa độ seed phục vụ điều phối thử; app thợ vẫn lấy GPS thiết bị thật khi tiếp cận.
-- TIMESTAMP trong schema hiện tại dùng giờ local của backend ở Việt Nam.
-- Nếu backend chạy timezone khác, điều chỉnh SET LOCAL TIME ZONE tương ứng.

BEGIN;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';

DO $seed$
DECLARE
    v_owner_id BIGINT;
    v_garage_id BIGINT;
    v_branch_id BIGINT;
    v_mechanic_id BIGINT;
    v_existing_garage_id BIGINT;
    v_now TIMESTAMP := clock_timestamp()::TIMESTAMP;
    r RECORD;
BEGIN
    -- Ngăn hai lần chạy cùng script đồng thời tạo trùng gara/chi nhánh/dịch vụ.
    PERFORM pg_advisory_xact_lock(108462, 1068150);

    INSERT INTO users
        (username, email, phone, password, full_name, role, is_active, created_at, updated_at)
    VALUES
        ('gps108462_owner', 'gps108462.owner@example.invalid', NULL,
         '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
         'Chủ gara TEST GPS 108462', 'GARAGE_OWNER', TRUE, v_now, v_now),
        ('gps108462_mech1', 'gps108462.mech1@example.invalid', NULL,
         '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
         'Thợ TEST GPS 1', 'FIELD_MECHANIC', TRUE, v_now, v_now),
        ('gps108462_mech2', 'gps108462.mech2@example.invalid', NULL,
         '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
         'Thợ TEST GPS 2 dự phòng', 'FIELD_MECHANIC', TRUE, v_now, v_now)
    ON CONFLICT (username) DO NOTHING;

    -- Nếu tên bị tài khoản khác sử dụng, dừng và rollback thay vì đổi quyền/mật khẩu.
    IF (SELECT COUNT(*) FROM users
        WHERE (username = 'gps108462_owner'
               AND email = 'gps108462.owner@example.invalid' AND role = 'GARAGE_OWNER')
           OR (username = 'gps108462_mech1'
               AND email = 'gps108462.mech1@example.invalid' AND role = 'FIELD_MECHANIC')
           OR (username = 'gps108462_mech2'
               AND email = 'gps108462.mech2@example.invalid' AND role = 'FIELD_MECHANIC')) <> 3 THEN
        RAISE EXCEPTION 'Tên tài khoản seed đã được sử dụng với email/role khác. Không thay đổi dữ liệu hiện có.';
    END IF;

    SELECT id INTO STRICT v_owner_id FROM users WHERE username = 'gps108462_owner';
    SELECT id INTO v_garage_id FROM garages WHERE owner_user_id = v_owner_id;

    IF v_garage_id IS NULL THEN
        INSERT INTO garages
            (owner_user_id, garage_name, phone, status, wallet_balance, created_at, updated_at)
        VALUES
            (v_owner_id, 'Gara TEST GPS 10.8462 106.8150', NULL, 'APPROVED', 0, v_now, v_now)
        RETURNING id INTO v_garage_id;
    ELSE
        UPDATE garages SET status = 'APPROVED', updated_at = v_now WHERE id = v_garage_id;
    END IF;

    SELECT id INTO v_branch_id FROM garage_branches
    WHERE garage_id = v_garage_id AND branch_name = 'Chi nhánh TEST GPS 108462';

    IF v_branch_id IS NULL THEN
        INSERT INTO garage_branches
            (garage_id, branch_name, address, latitude, longitude, phone_number,
             rescue_vehicles, operating_status, created_at, updated_at)
        VALUES
            (v_garage_id, 'Chi nhánh TEST GPS 108462',
             'Địa điểm TEST tại tọa độ (10.8462, 106.8150)',
             10.8462, 106.8150, NULL, 'Xe chuyên chở xe máy TEST', 'OPEN', v_now, v_now)
        RETURNING id INTO v_branch_id;
    ELSE
        UPDATE garage_branches
        SET latitude = 10.8462, longitude = 106.8150,
            operating_status = 'OPEN', updated_at = v_now
        WHERE id = v_branch_id;
    END IF;

    -- Giá dịch vụ 120.000 VND. Booking fee lấy từ backend, mặc định 30.000 VND.
    INSERT INTO garage_service_catalog
        (garage_id, service_name, category, service_type, standard_price, min_price,
         max_price, unit, estimated_time_min, description, is_active, warranty_days,
         created_at, updated_at)
    SELECT v_garage_id, 'Chở xe đơn lẻ TEST GPS 108462', 'TEST CROSSING', 'CROSSING',
           120000, 100000, 150000, 'lượt', 15,
           'Dịch vụ TEST chở riêng một xe qua điểm ngập, không ghép chuyến.',
           TRUE, 0, v_now, v_now
    WHERE NOT EXISTS (
        SELECT 1 FROM garage_service_catalog
        WHERE garage_id = v_garage_id AND service_name = 'Chở xe đơn lẻ TEST GPS 108462'
    );

    UPDATE garage_service_catalog
    SET is_active = TRUE, standard_price = 120000, updated_at = v_now
    WHERE garage_id = v_garage_id AND service_name = 'Chở xe đơn lẻ TEST GPS 108462';

    -- Thợ 1 ở đúng điểm đón; thợ 2 cách khoảng 47 m để thử offer dự phòng.
    FOR r IN
        SELECT u.id AS user_id, u.username, u.is_active,
               CASE WHEN u.username = 'gps108462_mech1' THEN 10.8462 ELSE 10.8465 END AS lat,
               CASE WHEN u.username = 'gps108462_mech1' THEN 106.8150 ELSE 106.8153 END AS lng
        FROM users u WHERE u.username IN ('gps108462_mech1', 'gps108462_mech2')
    LOOP
        IF NOT r.is_active THEN
            RAISE NOTICE 'Bỏ qua tài khoản đã bị khóa: %', r.username;
            CONTINUE;
        END IF;

        SELECT id, garage_id INTO v_mechanic_id, v_existing_garage_id
        FROM mechanic_staffs WHERE user_id = r.user_id;

        IF v_mechanic_id IS NOT NULL AND v_existing_garage_id <> v_garage_id THEN
            RAISE EXCEPTION 'Thợ % đang thuộc gara khác. Không tự điều chuyển.', r.username;
        END IF;

        IF v_mechanic_id IS NOT NULL AND (
            EXISTS (SELECT 1 FROM mechanic_staffs WHERE id = v_mechanic_id AND working_status = 'BUSY')
            OR EXISTS (
                SELECT 1 FROM rescue_orders
                WHERE mechanic_staff_id = v_mechanic_id
                  AND status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS')
            )
        ) THEN
            RAISE NOTICE 'Bỏ qua thợ đang BUSY hoặc có cuốc hoạt động: %', r.username;
            CONTINUE;
        END IF;

        IF v_mechanic_id IS NULL THEN
            INSERT INTO mechanic_staffs
                (user_id, garage_id, branch_id, working_status, shift_name, rating_avg,
                 speciality, current_latitude, current_longitude, has_crossing_capability,
                 last_heartbeat_at, last_gps_updated_at, created_at, updated_at)
            VALUES
                (r.user_id, v_garage_id, v_branch_id, 'AVAILABLE', 'Ca TEST GPS', 5.0,
                 'Chở xe máy vượt ngập - TEST', r.lat, r.lng, TRUE,
                 v_now, v_now, v_now, v_now);
        ELSE
            UPDATE mechanic_staffs
            SET branch_id = v_branch_id, working_status = 'AVAILABLE',
                current_latitude = r.lat, current_longitude = r.lng,
                has_crossing_capability = TRUE,
                last_heartbeat_at = v_now, last_gps_updated_at = v_now, updated_at = v_now
            WHERE id = v_mechanic_id;
        END IF;
    END LOOP;
END;
$seed$;

COMMIT;

-- Kiểm tra ID, tọa độ và hạn GPS ngay sau khi chạy.
SELECT g.id AS garage_id, g.garage_name, g.status AS garage_status,
       b.id AS branch_id, b.operating_status, sc.id AS service_item_id,
       sc.standard_price, u.username AS mechanic_username,
       ms.id AS mechanic_staff_id, ms.working_status, ms.has_crossing_capability,
       ms.current_latitude, ms.current_longitude,
       ms.last_gps_updated_at,
       ms.last_gps_updated_at + INTERVAL '5 minutes' AS gps_valid_until_default
FROM garages g
JOIN users owner_account ON owner_account.id = g.owner_user_id
JOIN garage_branches b ON b.garage_id = g.id
JOIN garage_service_catalog sc ON sc.garage_id = g.id
JOIN mechanic_staffs ms ON ms.branch_id = b.id
JOIN users u ON u.id = ms.user_id
WHERE owner_account.username = 'gps108462_owner'
  AND sc.service_name = 'Chở xe đơn lẻ TEST GPS 108462'
ORDER BY u.username;
