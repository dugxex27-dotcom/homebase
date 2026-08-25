-- Align the legacy Stripe webhook dedup table with the current four-state
-- lifecycle used by the webhook handler and Drizzle schema.
--
-- This migration is intentionally shape-aware and idempotent. The original
-- table used event_id + side_effects_complete; the current design uses
-- stripe_event_id + status. Existing rows are preserved if any are present.
DO $$
BEGIN
  IF to_regclass('public.stripe_processed_events') IS NULL THEN
    CREATE TABLE public.stripe_processed_events (
      stripe_event_id varchar PRIMARY KEY,
      status text NOT NULL DEFAULT 'pending',
      processed_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  ELSE
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stripe_processed_events'
        AND column_name = 'event_id'
    ) AND NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stripe_processed_events'
        AND column_name = 'stripe_event_id'
    ) THEN
      ALTER TABLE public.stripe_processed_events
        RENAME COLUMN event_id TO stripe_event_id;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stripe_processed_events'
        AND column_name = 'status'
    ) THEN
      ALTER TABLE public.stripe_processed_events
        ADD COLUMN status text NOT NULL DEFAULT 'pending';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stripe_processed_events'
        AND column_name = 'side_effects_complete'
    ) THEN
      UPDATE public.stripe_processed_events
      SET status = CASE
        WHEN side_effects_complete THEN 'committed'
        ELSE 'pending'
      END;

      ALTER TABLE public.stripe_processed_events
        DROP COLUMN side_effects_complete;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stripe_processed_events'
        AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE public.stripe_processed_events
        ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'stripe_processed_events'
        AND column_name = 'processed_at'
        AND data_type = 'timestamp without time zone'
    ) THEN
      ALTER TABLE public.stripe_processed_events
        ALTER COLUMN processed_at TYPE timestamptz
        USING processed_at AT TIME ZONE 'UTC';
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "IDX_stripe_processed_events_status_at"
  ON public.stripe_processed_events (status, processed_at);

-- The legacy table had a processed_at-only index. Remove it so the deployed
-- shape matches the current Drizzle declaration exactly.
DROP INDEX IF EXISTS "IDX_stripe_processed_events_processed_at";