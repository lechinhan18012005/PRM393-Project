-- PostgreSQL / DATABASE TEST - LUONG 4
-- Chay toan bo file trong pgAdmin hoac DBeaver sau khi backend da tao schema.
-- Fixture dung namespace flow4_107894_* rieng, khong sua tai khoan/gara cua thanh vien khac.
-- Mat khau chung cho cac tai khoan moi: Password@123
-- Toa do chi nhanh va tho: (10.7894, 106.6269)
-- Chay lai file de lam moi GPS/heartbeat truoc khi test dieu phoi.

BEGIN;
SET LOCAL TIME ZONE 'Asia/Ho_Chi_Minh';

DO $$
DECLARE
    v_now TIMESTAMP := clock_timestamp()::TIMESTAMP;
    v_owner_id BIGINT;
    v_mechanic_user_id BIGINT;
    v_garage_id BIGINT;
    v_branch_id BIGINT;
    v_mechanic_id BIGINT;
BEGIN
    PERFORM pg_advisory_xact_lock(107894, 1066269);

    INSERT INTO users
        (username, email, phone, password, full_name, avatar_url, role,
         is_active, created_at, updated_at)
    VALUES
        ('flow4_107894_owner', 'flow4.107894.owner@example.invalid', NULL,
         '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
         'Chu gara TEST Luong 4 107894', NULL, 'GARAGE_OWNER', TRUE, v_now, v_now),
        ('flow4_107894_mechanic', 'flow4.107894.mechanic@example.invalid', NULL,
         '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
         'Tho TEST Luong 4 107894', NULL, 'FIELD_MECHANIC', TRUE, v_now, v_now),
        ('flow4_107894_customer', 'flow4.107894.customer@example.invalid', NULL,
         '$2a$10$pljAr2yTmUY5BF9HINL4KOdlZnkDg95hTYcZ45hQJaVsSZlPP8bn6',
         'Khach TEST Luong 4 107894', NULL, 'CUSTOMER', TRUE, v_now, v_now)
    ON CONFLICT (username) DO NOTHING;

    IF (SELECT COUNT(*) FROM users
        WHERE (username = 'flow4_107894_owner'
               AND email = 'flow4.107894.owner@example.invalid' AND role::TEXT = 'GARAGE_OWNER')
           OR (username = 'flow4_107894_mechanic'
               AND email = 'flow4.107894.mechanic@example.invalid' AND role::TEXT = 'FIELD_MECHANIC')
           OR (username = 'flow4_107894_customer'
               AND email = 'flow4.107894.customer@example.invalid' AND role::TEXT = 'CUSTOMER')) <> 3 THEN
        RAISE EXCEPTION 'Namespace flow4_107894_* da bi dung voi email/role khac.';
    END IF;

    SELECT id INTO STRICT v_owner_id
    FROM users WHERE username = 'flow4_107894_owner';

    SELECT id INTO STRICT v_mechanic_user_id
    FROM users WHERE username = 'flow4_107894_mechanic';

    SELECT id INTO v_garage_id
    FROM garages WHERE owner_user_id = v_owner_id
    ORDER BY id LIMIT 1;

    IF v_garage_id IS NULL THEN
        INSERT INTO garages
            (owner_user_id, garage_name, phone, status, wallet_balance,
             nd13_consent, id_card_purged, created_at, updated_at)
        VALUES
            (v_owner_id, 'Gara TEST Luong 4 Hoc Mon', '0900007894',
             'APPROVED', 0, FALSE, FALSE, v_now, v_now)
        RETURNING id INTO v_garage_id;
    ELSE
        UPDATE garages
        SET status = 'APPROVED', updated_at = v_now
        WHERE id = v_garage_id;
    END IF;

    SELECT id INTO v_branch_id
    FROM garage_branches
    WHERE garage_id = v_garage_id
      AND branch_name = 'Chi nhanh TEST Luong 4 107894'
    ORDER BY id LIMIT 1;

    IF v_branch_id IS NULL THEN
        INSERT INTO garage_branches
            (garage_id, branch_name, address, latitude, longitude, phone_number,
             rescue_vehicles, operating_status, created_at, updated_at)
        VALUES
            (v_garage_id, 'Chi nhanh TEST Luong 4 107894',
             'Diem TEST tai toa do (10.7894, 106.6269)',
             10.7894, 106.6269, '0900007894',
             'Xe may sua chua luu dong va xe keo TEST', 'OPEN', v_now, v_now)
        RETURNING id INTO v_branch_id;
    ELSE
        UPDATE garage_branches
        SET address = 'Diem TEST tai toa do (10.7894, 106.6269)',
            latitude = 10.7894,
            longitude = 106.6269,
            operating_status = 'OPEN',
            updated_at = v_now
        WHERE id = v_branch_id;
    END IF;

    INSERT INTO garage_service_catalog
        (garage_id, service_name, category, service_type, standard_price,
         min_price, max_price, unit, estimated_time_min, description,
         is_active, warranty_days, created_at, updated_at)
    SELECT v_garage_id, 'Sua xe ngap tai cho TEST 107894', 'SUA TAI CHO',
           'REPAIR_ONSITE', 80000, 70000, 200000, 'luot', 20,
           'Kiem tra bugi, loc gio, dau nhot va xu ly xe ngap tai cho.',
           TRUE, 7, v_now, v_now
    WHERE NOT EXISTS (
        SELECT 1 FROM garage_service_catalog
        WHERE garage_id = v_garage_id
          AND service_name = 'Sua xe ngap tai cho TEST 107894'
    );

    INSERT INTO garage_service_catalog
        (garage_id, service_name, category, service_type, standard_price,
         min_price, max_price, unit, estimated_time_min, description,
         is_active, warranty_days, created_at, updated_at)
    SELECT v_garage_id, 'Keo xe ve gara TEST 107894', 'KEO XE',
           'TOWING', 150000, 120000, 300000, 'luot', 30,
           'Keo xe khong the sua tai cho ve chi nhanh gara de xu ly.',
           TRUE, 3, v_now, v_now
    WHERE NOT EXISTS (
        SELECT 1 FROM garage_service_catalog
        WHERE garage_id = v_garage_id
          AND service_name = 'Keo xe ve gara TEST 107894'
    );

    INSERT INTO garage_service_catalog
        (garage_id, service_name, category, service_type, standard_price,
         min_price, max_price, unit, estimated_time_min, description,
         is_active, warranty_days, created_at, updated_at)
    SELECT v_garage_id, 'Cho xe vuot ngap TEST 107894', 'CHO XE VUOT NGAP',
           'CROSSING', 120000, 100000, 150000, 'luot', 15,
           'Dich vu TEST cho xe va nguoi qua diem ngap, ho tro chuyen rieng va gom chuyen.',
           TRUE, 0, v_now, v_now
    WHERE NOT EXISTS (
        SELECT 1 FROM garage_service_catalog
        WHERE garage_id = v_garage_id
          AND service_name = 'Cho xe vuot ngap TEST 107894'
    );

    UPDATE garage_service_catalog
    SET is_active = TRUE, updated_at = v_now
    WHERE garage_id = v_garage_id
      AND service_type IN ('REPAIR_ONSITE', 'TOWING', 'CROSSING');

    SELECT id INTO v_mechanic_id
    FROM mechanic_staffs WHERE user_id = v_mechanic_user_id;

    IF v_mechanic_id IS NOT NULL AND (
        EXISTS (
            SELECT 1 FROM mechanic_staffs
            WHERE id = v_mechanic_id AND working_status = 'BUSY'
        ) OR EXISTS (
            SELECT 1 FROM rescue_orders
            WHERE mechanic_staff_id = v_mechanic_id
              AND status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS')
        )
    ) THEN
        RAISE EXCEPTION 'Tho flow4_107894_mechanic dang BUSY hoac co don active; khong ghi de.';
    END IF;

    IF v_mechanic_id IS NULL THEN
        INSERT INTO mechanic_staffs
            (user_id, garage_id, branch_id, current_latitude, current_longitude,
             working_status, shift_name, rating_avg, speciality,
             has_crossing_capability, last_heartbeat_at, last_gps_updated_at,
             created_at, updated_at)
        VALUES
            (v_mechanic_user_id, v_garage_id, v_branch_id, 10.7894, 106.6269,
             'AVAILABLE', 'Ca TEST Luong 4', 5.0,
             'Sua xe ngap, keo xe va cho xe vuot ngap', TRUE,
             v_now, v_now, v_now, v_now)
        RETURNING id INTO v_mechanic_id;
    ELSE
        UPDATE mechanic_staffs
        SET garage_id = v_garage_id,
            branch_id = v_branch_id,
            current_latitude = 10.7894,
            current_longitude = 106.6269,
            working_status = 'AVAILABLE',
            speciality = 'Sua xe ngap, keo xe va cho xe vuot ngap',
            has_crossing_capability = TRUE,
            last_heartbeat_at = v_now,
            last_gps_updated_at = v_now,
            updated_at = v_now
        WHERE id = v_mechanic_id;
    END IF;
END;
$$;

COMMIT;

-- Ket qua mong doi: 3 dich vu active, tho AVAILABLE, co nang luc cho xe va GPS con han 5 phut.
SELECT
    g.id AS garage_id,
    g.garage_name,
    g.status AS garage_status,
    b.id AS branch_id,
    b.address,
    b.latitude,
    b.longitude,
    sc.service_type,
    sc.service_name,
    sc.standard_price,
    u.username AS mechanic_username,
    ms.working_status,
    ms.has_crossing_capability,
    ms.current_latitude,
    ms.current_longitude,
    ms.last_gps_updated_at,
    ms.last_gps_updated_at + INTERVAL '5 minutes' AS gps_valid_until_default
FROM garages g
JOIN users owner_account ON owner_account.id = g.owner_user_id
JOIN garage_branches b ON b.garage_id = g.id
JOIN garage_service_catalog sc ON sc.garage_id = g.id
JOIN mechanic_staffs ms ON ms.branch_id = b.id
JOIN users u ON u.id = ms.user_id
WHERE owner_account.username = 'flow4_107894_owner'
  AND sc.service_type IN ('REPAIR_ONSITE', 'TOWING', 'CROSSING')
ORDER BY sc.service_type;
