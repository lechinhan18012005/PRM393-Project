-- =====================================================================================
-- DATABASE MIGRATION SCRIPT: VALIDATION & SECURITY HARDENING
-- Project: Motorbike Flood Rescue Platform
-- Author: Senior Backend & Application Security Engineer
-- Date: 2026-10-31
-- Target: PostgreSQL 14+ / Compatible with JPA Entities
-- =====================================================================================

-- =====================================================================================
-- 1. ACCOUNT INVITATIONS SECURITY ENHANCEMENTS
-- =====================================================================================

-- Add revoked flag and timestamp to account_invitation for secure token lifecycle management
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_invitation' AND column_name = 'revoked'
    ) THEN
        ALTER TABLE account_invitation ADD COLUMN revoked BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'account_invitation' AND column_name = 'revoked_at'
    ) THEN
        ALTER TABLE account_invitation ADD COLUMN revoked_at TIMESTAMP NULL;
    END IF;
END $$;

-- Index for fast lookup of pending active invitations by garage and email
CREATE INDEX IF NOT EXISTS idx_account_invitation_garage_email_status 
    ON account_invitation (garage_id, email, used, revoked);

-- Index for activation lookup by token_hash
CREATE INDEX IF NOT EXISTS idx_account_invitation_token_hash 
    ON account_invitation (token_hash);


-- =====================================================================================
-- 2. GARAGE BRANCHES CONSTRAINTS & INTEGRITY
-- =====================================================================================

-- Unique constraint: garage cannot have duplicate branch names
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uk_garage_branch_name'
    ) THEN
        ALTER TABLE garage_branches 
            ADD CONSTRAINT uk_garage_branch_name UNIQUE (garage_id, branch_name);
    END IF;
END $$;

-- GPS Coordinate Bounds Constraints (-90 to 90 for latitude, -180 to 180 for longitude)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_branch_latitude'
    ) THEN
        ALTER TABLE garage_branches 
            ADD CONSTRAINT chk_branch_latitude CHECK (latitude >= -90.0 AND latitude <= 90.0);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_branch_longitude'
    ) THEN
        ALTER TABLE garage_branches 
            ADD CONSTRAINT chk_branch_longitude CHECK (longitude >= -180.0 AND longitude <= 180.0);
    END IF;
END $$;

-- Index for active branch lookups by garage
CREATE INDEX IF NOT EXISTS idx_garage_branches_garage_status 
    ON garage_branches (garage_id, is_active, operating_status);


-- =====================================================================================
-- 3. GARAGE SERVICES & PRICING CONSTRAINTS
-- =====================================================================================

-- Price logic constraint: 0 < min_price <= standard_price <= max_price <= 50,000,000
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_garage_service_prices'
    ) THEN
        ALTER TABLE garage_services 
            ADD CONSTRAINT chk_garage_service_prices 
            CHECK (min_price > 0 AND standard_price >= min_price AND max_price >= standard_price AND max_price <= 50000000.00);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_garage_service_duration'
    ) THEN
        ALTER TABLE garage_services 
            ADD CONSTRAINT chk_garage_service_duration 
            CHECK (estimated_time_min >= 1 AND estimated_time_min <= 1440);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_garage_service_warranty'
    ) THEN
        ALTER TABLE garage_services 
            ADD CONSTRAINT chk_garage_service_warranty 
            CHECK (warranty_days >= 0 AND warranty_days <= 365);
    END IF;
END $$;

-- Index for fast service search and active service lookup
CREATE INDEX IF NOT EXISTS idx_garage_services_garage_active 
    ON garage_services (garage_id, active);


-- =====================================================================================
-- 4. MECHANIC STAFFS CONSTRAINTS & INDEXES
-- =====================================================================================

-- Foreign key lookup indexes
CREATE INDEX IF NOT EXISTS idx_mechanic_staffs_branch_id 
    ON mechanic_staffs (branch_id);

CREATE INDEX IF NOT EXISTS idx_mechanic_staffs_garage_working 
    ON mechanic_staffs (garage_id, working_status);

-- Rating average range constraint: 0.0 to 5.0
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_mechanic_rating_range'
    ) THEN
        ALTER TABLE mechanic_staffs 
            ADD CONSTRAINT chk_mechanic_rating_range 
            CHECK (rating_avg >= 0.0 AND rating_avg <= 5.0);
    END IF;
END $$;


-- =====================================================================================
-- ROLLBACK SCRIPT (Execute if rolling back this migration)
-- =====================================================================================
/*
ALTER TABLE mechanic_staffs DROP CONSTRAINT IF EXISTS chk_mechanic_rating_range;
DROP INDEX IF EXISTS idx_mechanic_staffs_garage_working;
DROP INDEX IF EXISTS idx_mechanic_staffs_branch_id;

DROP INDEX IF EXISTS idx_garage_services_garage_active;
ALTER TABLE garage_services DROP CONSTRAINT IF EXISTS chk_garage_service_warranty;
ALTER TABLE garage_services DROP CONSTRAINT IF EXISTS chk_garage_service_duration;
ALTER TABLE garage_services DROP CONSTRAINT IF EXISTS chk_garage_service_prices;

DROP INDEX IF EXISTS idx_garage_branches_garage_status;
ALTER TABLE garage_branches DROP CONSTRAINT IF EXISTS chk_branch_longitude;
ALTER TABLE garage_branches DROP CONSTRAINT IF EXISTS chk_branch_latitude;
ALTER TABLE garage_branches DROP CONSTRAINT IF EXISTS uk_garage_branch_name;

DROP INDEX IF EXISTS idx_account_invitation_token_hash;
DROP INDEX IF EXISTS idx_account_invitation_garage_email_status;
ALTER TABLE account_invitation DROP COLUMN IF EXISTS revoked_at;
ALTER TABLE account_invitation DROP COLUMN IF EXISTS revoked;
*/
