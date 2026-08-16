-- DDFC CRM database schema (PostgreSQL)
-- Run once against a fresh database, e.g.:
--   psql "$DATABASE_URL" -f db/schema.sql

CREATE EXTENSION IF NOT EXISTS pgcrypto; -- for gen_random_uuid()

CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('Super Admin','Sales Manager','Relationship Manager','Viewer')),
  status        TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Inactive')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS leads (
  id          TEXT PRIMARY KEY,                 -- e.g. 'DDFC-1001'
  name        TEXT NOT NULL,
  phone       TEXT NOT NULL,
  email       TEXT NOT NULL,
  city        TEXT NOT NULL,
  amount      NUMERIC(14,2) NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'New'
              CHECK (status IN ('New','Contacted','Documents','Approved','Rejected','Disbursed')),
  source      TEXT NOT NULL DEFAULT 'Website'
              CHECK (source IN ('Website','WhatsApp','Referral','Campaign','Manual')),
  owner_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  lead_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS lenders (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  type        TEXT NOT NULL CHECK (type IN ('Bank','NBFC')),
  status      TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active','Pending','Inactive')),
  rate        TEXT,                              -- indicative rate, kept as free text e.g. '9.99%'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- simple key/value store for CRM-wide settings (WhatsApp number/message, etc.)
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       TEXT
);

-- append-only audit trail for status/assignment/document changes (production checklist item)
CREATE TABLE IF NOT EXISTS lead_activity (
  id          BIGSERIAL PRIMARY KEY,
  lead_id     TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  actor_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,      -- e.g. 'status_changed', 'created', 'assigned'
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_owner ON leads(owner_id);
CREATE INDEX IF NOT EXISTS idx_lead_activity_lead ON lead_activity(lead_id);

INSERT INTO settings (key, value) VALUES
  ('whatsapp_number', '919999999999'),
  ('whatsapp_message', 'Hello DDFC, I am interested in a personal loan. Please help me with my eligibility.')
ON CONFLICT (key) DO NOTHING;
