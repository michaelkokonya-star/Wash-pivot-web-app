-- =============================================================================
-- WashPivot Hub – PostgreSQL Schema
-- =============================================================================
-- Run this file once against your PostgreSQL database to create all tables.
-- The migration script (scripts/migrate-firebase-to-postgres.ts) also calls
-- initDb() which executes this DDL automatically on first startup.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Companies
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS companies (
  id               TEXT        PRIMARY KEY,
  name             TEXT        NOT NULL,
  subscription_tier TEXT       NOT NULL DEFAULT 'free',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id          TEXT        PRIMARY KEY,
  email       TEXT        NOT NULL UNIQUE,
  name        TEXT        NOT NULL DEFAULT '',
  role        TEXT        NOT NULL DEFAULT 'user',
  company_id  TEXT        REFERENCES companies(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name        TEXT        NOT NULL,
  description TEXT        NOT NULL DEFAULT '',
  category    TEXT        NOT NULL DEFAULT 'General',
  price       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  company_id  TEXT        REFERENCES companies(id) ON DELETE SET NULL,
  created_by  TEXT        REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_company_id  ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_created_at  ON products(created_at DESC);

-- ---------------------------------------------------------------------------
-- Product Photos
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS product_photos (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  product_id  TEXT        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  data        TEXT        NOT NULL,   -- base64-encoded image bytes
  mime_type   TEXT        NOT NULL DEFAULT 'image/jpeg',
  uploaded_by TEXT        REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_product_photos_product_id ON product_photos(product_id);

-- ---------------------------------------------------------------------------
-- Inventory
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  company_id      TEXT        REFERENCES companies(id) ON DELETE CASCADE,
  name            TEXT        NOT NULL,
  qty             NUMERIC     NOT NULL DEFAULT 0,
  category        TEXT        NOT NULL DEFAULT 'General',
  min_threshold   NUMERIC     NOT NULL DEFAULT 0,
  unit_cost       NUMERIC(12, 2) NOT NULL DEFAULT 0,
  unit            TEXT        NOT NULL DEFAULT 'pcs',
  opening_stock   NUMERIC     NOT NULL DEFAULT 0,
  requisitioned   NUMERIC     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_company_id ON inventory(company_id);

-- ---------------------------------------------------------------------------
-- Requisitions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS requisitions (
  id          TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  company_id  TEXT        REFERENCES companies(id) ON DELETE CASCADE,
  user_id     TEXT        REFERENCES users(id) ON DELETE SET NULL,
  date        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status      TEXT        NOT NULL DEFAULT 'pending',
  items       JSONB       NOT NULL DEFAULT '[]',
  reason      TEXT        NOT NULL DEFAULT '',
  requester   TEXT        NOT NULL DEFAULT '',
  tool        TEXT        NOT NULL DEFAULT '',
  qty         NUMERIC     NOT NULL DEFAULT 0,
  type        TEXT        NOT NULL DEFAULT 'internal',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_requisitions_company_id ON requisitions(company_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_user_id    ON requisitions(user_id);
CREATE INDEX IF NOT EXISTS idx_requisitions_status     ON requisitions(status);

-- ---------------------------------------------------------------------------
-- Waybills
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS waybills (
  id              TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  company_id      TEXT        REFERENCES companies(id) ON DELETE CASCADE,
  date            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status          TEXT        NOT NULL DEFAULT 'pending',
  items           JSONB       NOT NULL DEFAULT '[]',
  sender          TEXT        NOT NULL DEFAULT '',
  receiver        TEXT        NOT NULL DEFAULT '',
  destination     TEXT        NOT NULL DEFAULT '',
  tracking_number TEXT        NOT NULL DEFAULT '',
  status_history  JSONB       NOT NULL DEFAULT '[]',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waybills_company_id      ON waybills(company_id);
CREATE INDEX IF NOT EXISTS idx_waybills_tracking_number ON waybills(tracking_number);
CREATE INDEX IF NOT EXISTS idx_waybills_status          ON waybills(status);

-- ---------------------------------------------------------------------------
-- Audit Logs
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id            TEXT        PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id       TEXT        REFERENCES users(id) ON DELETE SET NULL,
  company_id    TEXT        REFERENCES companies(id) ON DELETE SET NULL,
  action        TEXT        NOT NULL,
  resource_type TEXT        NOT NULL DEFAULT '',
  resource_id   TEXT        NOT NULL DEFAULT '',
  details       TEXT        NOT NULL DEFAULT '',
  old_values    JSONB,
  new_values    JSONB,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id       ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id    ON audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type ON audit_logs(resource_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp     ON audit_logs(timestamp DESC);
