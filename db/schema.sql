-- =============================================================================
-- WashPivot Hub — PostgreSQL Schema
-- Migrated from Firebase Firestore
-- =============================================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- ENUMS
-- =============================================================================

CREATE TYPE user_role AS ENUM ('user', 'expert', 'admin');

CREATE TYPE product_category AS ENUM ('Solar', 'Water Treatment', 'Sanitation');

CREATE TYPE project_category AS ENUM ('Solar', 'Water Treatment', 'Sanitation');

CREATE TYPE project_status AS ENUM ('pending', 'active', 'completed', 'rejected');

CREATE TYPE order_status AS ENUM ('pending', 'paid', 'failed', 'shipped', 'delivered');

CREATE TYPE payment_method AS ENUM ('card', 'mpesa');

-- =============================================================================
-- USERS
-- Mirrors the Firestore `users` collection.
-- `uid` is the Firebase Auth UID and is used as the foreign key target
-- throughout the schema so that Firebase Auth can continue to be the
-- identity provider during and after the migration.
-- =============================================================================

CREATE TABLE users (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid                 TEXT NOT NULL UNIQUE,           -- Firebase Auth UID
    "displayName"       TEXT NOT NULL,
    email               TEXT NOT NULL UNIQUE,
    role                user_role NOT NULL DEFAULT 'user',
    expertise           TEXT,
    academics           TEXT,
    bio                 TEXT,
    "photoURL"          TEXT,
    "hasSeenWelcome"    BOOLEAN NOT NULL DEFAULT FALSE,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
    "expertJoinedAt"    TIMESTAMPTZ,
    "isApproved"        BOOLEAN NOT NULL DEFAULT FALSE,
    "showContacts"      BOOLEAN NOT NULL DEFAULT TRUE,
    "phoneNumber"       TEXT,
    "subSpecialty"      TEXT,
    "yearsOfExperience" TEXT,
    "keyProjects"       TEXT,
    availability        JSONB,                          -- array of region strings
    phone               TEXT,
    "contactEmail"      TEXT,
    "lastLogin"         TIMESTAMPTZ,
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_uid   ON users (uid);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- =============================================================================
-- PRODUCTS
-- Mirrors the Firestore `products` collection.
-- =============================================================================

CREATE TABLE products (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    description     TEXT NOT NULL,
    price           NUMERIC(12, 2) NOT NULL,
    category        product_category NOT NULL,
    "subCategory"   TEXT,
    "imageUrl"      TEXT,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_products_category    ON products (category);
CREATE INDEX idx_products_subcategory ON products ("subCategory");

-- =============================================================================
-- PROJECTS
-- Mirrors the Firestore `projects` collection.
-- =============================================================================

CREATE TABLE projects (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title            TEXT NOT NULL,
    description      TEXT NOT NULL,
    "ownerUid"       TEXT NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    "ownerName"      TEXT NOT NULL,
    "targetFunding"  NUMERIC(14, 2) NOT NULL DEFAULT 0,
    "currentFunding" NUMERIC(14, 2) NOT NULL DEFAULT 0,
    category         project_category NOT NULL,
    "imageUrl"       TEXT,
    milestones       JSONB,                             -- array of milestone objects
    "isApproved"     BOOLEAN NOT NULL DEFAULT FALSE,
    status           project_status NOT NULL DEFAULT 'pending',
    "createdAt"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_projects_owner_uid  ON projects ("ownerUid");
CREATE INDEX idx_projects_status     ON projects (status);
CREATE INDEX idx_projects_is_approved ON projects ("isApproved");

-- =============================================================================
-- REVIEWS
-- Mirrors the Firestore `reviews` collection.
-- =============================================================================

CREATE TABLE reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL REFERENCES products (id) ON DELETE CASCADE,
    "userId"    TEXT NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    "userName"  TEXT NOT NULL,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment     TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_product_id ON reviews ("productId");
CREATE INDEX idx_reviews_user_id    ON reviews ("userId");

-- =============================================================================
-- ORDERS
-- Mirrors the Firestore `orders` collection.
-- =============================================================================

CREATE TABLE orders (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"        TEXT NOT NULL REFERENCES users (uid) ON DELETE RESTRICT,
    "userEmail"     TEXT NOT NULL,
    items           JSONB NOT NULL,                    -- array of cart item objects
    "totalAmount"   NUMERIC(14, 2) NOT NULL,
    status          order_status NOT NULL DEFAULT 'pending',
    "paymentMethod" payment_method NOT NULL DEFAULT 'card',
    "shippingInfo"  JSONB NOT NULL,                    -- { firstName, lastName, email, address, city, phone }
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "paidAt"        TIMESTAMPTZ
);

CREATE INDEX idx_orders_user_id  ON orders ("userId");
CREATE INDEX idx_orders_status   ON orders (status);
CREATE INDEX idx_orders_created  ON orders ("createdAt" DESC);

-- =============================================================================
-- SERVICE PROVIDERS
-- Mirrors the Firestore `service_providers` collection.
-- =============================================================================

CREATE TABLE service_providers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    category        TEXT NOT NULL,
    "subCategory"   TEXT,
    description     TEXT NOT NULL,
    "imageUrl"      TEXT NOT NULL,
    "contactEmail"  TEXT NOT NULL,
    "contactPhone"  TEXT NOT NULL,
    location        TEXT NOT NULL,
    "isApproved"    BOOLEAN NOT NULL DEFAULT FALSE,
    "createdAt"     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_providers_category    ON service_providers (category);
CREATE INDEX idx_service_providers_is_approved ON service_providers ("isApproved");

-- =============================================================================
-- SOLAR KITS
-- Mirrors the Firestore `solar_kits` collection (saved kit configurations).
-- =============================================================================

CREATE TABLE solar_kits (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId"              TEXT NOT NULL REFERENCES users (uid) ON DELETE CASCADE,
    "kitName"             TEXT NOT NULL,
    "loadRequirements"    JSONB NOT NULL,               -- array of appliance objects
    "totalDailyLoadWh"    NUMERIC(12, 2) NOT NULL DEFAULT 0,
    "totalPeakLoadW"      NUMERIC(12, 2) NOT NULL DEFAULT 0,
    recommendations       JSONB,                        -- { panelW, batteryWh, inverterW, selectedHardware }
    "createdAt"           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_solar_kits_user_id ON solar_kits ("userId");

-- =============================================================================
-- PUBLIC PROFILES
-- Mirrors the Firestore `public_profiles` collection.
-- Only experts have a public profile. The `uid` column is both unique and a
-- foreign key to users.uid so the two records stay in sync.
-- =============================================================================

CREATE TABLE public_profiles (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uid                 TEXT NOT NULL UNIQUE REFERENCES users (uid) ON DELETE CASCADE,
    "displayName"       TEXT NOT NULL,
    role                TEXT NOT NULL DEFAULT 'expert' CHECK (role = 'expert'),
    expertise           TEXT NOT NULL,
    academics           TEXT NOT NULL,
    bio                 TEXT NOT NULL,
    "photoURL"          TEXT,
    "expertJoinedAt"    TEXT NOT NULL,                  -- ISO-8601 string (matches Firestore)
    "isApproved"        BOOLEAN NOT NULL DEFAULT FALSE,
    "showContacts"      BOOLEAN NOT NULL DEFAULT TRUE,
    "phoneNumber"       TEXT,
    "updatedAt"         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "subSpecialty"      TEXT,
    "yearsOfExperience" TEXT,
    "keyProjects"       TEXT,
    availability        JSONB,                          -- array of region strings
    phone               TEXT,
    "contactEmail"      TEXT
);

CREATE INDEX idx_public_profiles_uid         ON public_profiles (uid);
CREATE INDEX idx_public_profiles_is_approved ON public_profiles ("isApproved");

-- =============================================================================
-- HELPER: auto-update updatedAt on users and public_profiles
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_public_profiles_updated_at
    BEFORE UPDATE ON public_profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
