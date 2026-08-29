-- Migration: photo-verified maintenance evidence foundation
-- Additive and idempotent. This phase only creates durable fields; it does not
-- classify historical records, call AI, or alter scoring behavior.

-- Maintenance logs retain the audit-facing evidence fields.
ALTER TABLE maintenance_logs
  ADD COLUMN IF NOT EXISTS distance_from_property_miles NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS timestamp_delta_hours NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS verification_reason_codes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_verification_status TEXT,
  ADD COLUMN IF NOT EXISTS ai_verification_response JSONB;

-- Health-score task completions retain the same evidence decision context.
ALTER TABLE task_completions
  ADD COLUMN IF NOT EXISTS distance_from_property_miles NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS timestamp_delta_hours NUMERIC(10, 2),
  ADD COLUMN IF NOT EXISTS verification_reason_codes TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_verification_status TEXT,
  ADD COLUMN IF NOT EXISTS ai_verification_response JSONB;

-- Invoice analyses are the existing durable boundary for DIY AI verification
-- responses; these columns let later phases retain the normalized response.
ALTER TABLE invoice_analyses
  ADD COLUMN IF NOT EXISTS ai_verification_status TEXT,
  ADD COLUMN IF NOT EXISTS ai_verification_response JSONB;

-- Houses already store latitude/longitude. This timestamp makes the persistent
-- coordinate cache explicit without changing or overwriting existing values.
ALTER TABLE houses
  ADD COLUMN IF NOT EXISTS coordinates_cached_at TIMESTAMP WITH TIME ZONE;