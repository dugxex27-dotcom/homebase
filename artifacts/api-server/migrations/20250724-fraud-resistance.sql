-- Migration: fraud-resistance guardrails
-- Applied via executeSql (idempotent — safe to re-run; all statements use IF NOT EXISTS or DO blocks)

-- 1. maintenance_logs: fraud-resistance columns
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS verification_tier TEXT NOT NULL DEFAULT 'self_reported';
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS location_flag BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS timestamp_flag BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS duplicate_photo_flag BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS device_timestamp TIMESTAMP WITH TIME ZONE;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS gps_lat TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS gps_lng TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS property_lat TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS property_lng TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS before_photo_hashes TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS after_photo_hashes TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS fraud_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS fraud_reviewed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS contractor_business_name TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS contractor_license_number TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS contractor_job_date TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS invoice_ref TEXT;
ALTER TABLE maintenance_logs ADD COLUMN IF NOT EXISTS contractor_account_id TEXT;

-- Index for verification tier lookups
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_verification_tier ON maintenance_logs (verification_tier);

-- 2. task_completions: verification tier
ALTER TABLE task_completions ADD COLUMN IF NOT EXISTS verification_tier TEXT NOT NULL DEFAULT 'self_reported';

-- 3. referral_credits: fingerprint dedup columns
ALTER TABLE referral_credits ADD COLUMN IF NOT EXISTS payment_method_fingerprint TEXT;
ALTER TABLE referral_credits ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

-- 4. fraud_review_queue table
CREATE TABLE IF NOT EXISTS fraud_review_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  homeowner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flag_type TEXT NOT NULL,
  details JSONB,
  severity TEXT NOT NULL DEFAULT 'medium',
  reviewed BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_by TEXT,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_reviewed ON fraud_review_queue (reviewed);
CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_homeowner ON fraud_review_queue (homeowner_id);
CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_severity ON fraud_review_queue (severity);
