-- ============================================================================
-- PRM393 - MOTORBIKE FLOOD RESCUE PLATFORM
-- Migration Script: Payment Integration (PayOS & Cash) into Rescue Workflow
-- Target Database: PostgreSQL (Separate isolated test / staging environment)
-- Note: DO NOT run against shared group database without authorization.
-- ============================================================================

BEGIN;

-- 1. Bổ sung các cột tham chiếu thanh toán vào bảng rescue_orders
ALTER TABLE rescue_orders 
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITHOUT TIME ZONE,
    ADD COLUMN IF NOT EXISTS payment_method VARCHAR(30),
    ADD COLUMN IF NOT EXISTS payment_transaction_id BIGINT,
    ADD COLUMN IF NOT EXISTS payment_order_code BIGINT;

-- 2. Bổ sung cột is_simulation vào bảng payment_transactions nếu tồn tại
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS is_simulation BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway_requested BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE payment_transactions ADD COLUMN IF NOT EXISTS gateway_link_id VARCHAR(100);
    END IF;
END $$;

-- 3. Nâng cấp các check constraint enum cho COMPLETED trên rescue_orders và rescue_order_audits
DO $$
DECLARE
    r RECORD;
BEGIN
    -- 3.1 Drop check constraints trên bảng rescue_orders (cột status)
    FOR r IN (
        SELECT con.conname 
        FROM pg_constraint con 
        INNER JOIN pg_class rel ON rel.oid = con.conrelid 
        WHERE rel.relname = 'rescue_orders' AND con.contype = 'c' 
          AND pg_get_constraintdef(con.oid) LIKE '%status%'
    ) LOOP
        EXECUTE 'ALTER TABLE rescue_orders DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;

    -- 3.2 Drop check constraints trên bảng rescue_order_audits (cột from_status và to_status)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rescue_order_audits') THEN
        FOR r IN (
            SELECT con.conname 
            FROM pg_constraint con 
            INNER JOIN pg_class rel ON rel.oid = con.conrelid 
            WHERE rel.relname = 'rescue_order_audits' AND con.contype = 'c' 
              AND (pg_get_constraintdef(con.oid) LIKE '%from_status%' OR pg_get_constraintdef(con.oid) LIKE '%to_status%')
        ) LOOP
            EXECUTE 'ALTER TABLE rescue_order_audits DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        END LOOP;
    END IF;

    -- 3.3 Drop check constraints trên bảng payment_transactions nếu có (cột status)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        FOR r IN (
            SELECT con.conname 
            FROM pg_constraint con 
            INNER JOIN pg_class rel ON rel.oid = con.conrelid 
            WHERE rel.relname = 'payment_transactions' AND con.contype = 'c' 
              AND pg_get_constraintdef(con.oid) LIKE '%status%'
        ) LOOP
            EXECUTE 'ALTER TABLE payment_transactions DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
        END LOOP;
    END IF;
END $$;

-- Re-add check constraints chuẩn hóa bao gồm trạng thái COMPLETED
ALTER TABLE rescue_orders 
    ADD CONSTRAINT chk_rescue_order_status 
    CHECK (status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'DISPATCH_FAILED'));

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'rescue_order_audits') THEN
        ALTER TABLE rescue_order_audits 
            ADD CONSTRAINT chk_rescue_order_audit_from_status 
            CHECK (from_status IS NULL OR from_status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'DISPATCH_FAILED'));

        ALTER TABLE rescue_order_audits 
            ADD CONSTRAINT chk_rescue_order_audit_to_status 
            CHECK (to_status IN ('REQUESTED', 'DISPATCHED', 'ARRIVED', 'IN_PROGRESS', 'PAYMENT_PENDING', 'COMPLETED', 'CANCELLED', 'DISPATCH_FAILED'));
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        ALTER TABLE payment_transactions 
            ADD CONSTRAINT chk_payment_transaction_status 
            CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED', 'EXPIRED', 'DUPLICATE_PAID'));
    END IF;
END $$;

-- 4. Đánh index tối ưu tra cứu cho luồng thanh toán và đối soát
CREATE INDEX IF NOT EXISTS idx_rescue_orders_paid_at ON rescue_orders(paid_at);
CREATE INDEX IF NOT EXISTS idx_rescue_orders_payment_order_code ON rescue_orders(payment_order_code);
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_transactions') THEN
        CREATE INDEX IF NOT EXISTS idx_payment_transactions_rescue_order_status ON payment_transactions(rescue_order_id, status);
    END IF;
END $$;

COMMIT;
