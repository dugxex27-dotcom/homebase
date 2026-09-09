ALTER TABLE companies
ADD COLUMN IF NOT EXISTS seat_usage_alert_threshold integer NOT NULL DEFAULT 80;

ALTER TABLE companies
DROP CONSTRAINT IF EXISTS companies_seat_usage_alert_threshold_check;

ALTER TABLE companies
ADD CONSTRAINT companies_seat_usage_alert_threshold_check
CHECK (seat_usage_alert_threshold IN (70, 80, 90));