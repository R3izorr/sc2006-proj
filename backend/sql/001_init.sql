-- Enable gen_random_uuid for UUID defaults
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Snapshots metadata
CREATE TABLE IF NOT EXISTS snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by TEXT,
    note TEXT,
    is_current BOOLEAN NOT NULL DEFAULT false
);

-- Only one row can be current at any time
CREATE UNIQUE INDEX IF NOT EXISTS unique_current_snapshot
    ON snapshots ((CASE WHEN is_current THEN 1 ELSE NULL END));

-- Subzone rows for each snapshot
CREATE TABLE IF NOT EXISTS subzones (
    snapshot_id UUID NOT NULL REFERENCES snapshots(id) ON DELETE CASCADE,
    subzone_id TEXT NOT NULL,
    planning_area TEXT,
    population INTEGER,
    pop_0_25 INTEGER,
    pop_25_65 INTEGER,
    pop_65plus INTEGER,
    hawker INTEGER,
    mrt INTEGER,
    bus INTEGER,
    h_score DOUBLE PRECISION,
    h_rank INTEGER,
    geom_geojson JSONB,
    PRIMARY KEY (snapshot_id, subzone_id)
);

CREATE INDEX IF NOT EXISTS subzones_snapshot_idx ON subzones(snapshot_id);
CREATE INDEX IF NOT EXISTS subzones_planning_area_idx ON subzones(planning_area);
CREATE INDEX IF NOT EXISTS subzones_rank_idx ON subzones(h_rank);

-- Optional component columns used by the app (match ORM names exactly)
ALTER TABLE IF EXISTS subzones ADD COLUMN IF NOT EXISTS "Dem" DOUBLE PRECISION;
ALTER TABLE IF EXISTS subzones ADD COLUMN IF NOT EXISTS "Sup" DOUBLE PRECISION;
ALTER TABLE IF EXISTS subzones ADD COLUMN IF NOT EXISTS "Acc" DOUBLE PRECISION;

-- Users and auth (for admin + login flows)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin','user')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at TIMESTAMPTZ
);


