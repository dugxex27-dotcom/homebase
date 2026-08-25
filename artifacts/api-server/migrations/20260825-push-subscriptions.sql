-- Align the legacy Web Push subscription table with the current Drizzle
-- declaration. Existing browser subscriptions remain Web Push records.
--
-- FCM mobile tokens continue to use push_tokens and are intentionally not
-- migrated into this table by this compatibility migration.

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'web-push',
  ADD COLUMN IF NOT EXISTS token text,
  ADD COLUMN IF NOT EXISTS device_info jsonb,
  ADD COLUMN IF NOT EXISTS last_seen_at timestamp;

-- Existing rows predate provider-aware subscriptions. Make their provider
-- explicit before enforcing the schema's NOT NULL contract.
UPDATE public.push_subscriptions
SET provider = 'web-push'
WHERE provider IS NULL;

ALTER TABLE public.push_subscriptions
  ALTER COLUMN provider SET DEFAULT 'web-push',
  ALTER COLUMN provider SET NOT NULL;