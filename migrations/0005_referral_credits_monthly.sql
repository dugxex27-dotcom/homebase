-- Migration: Referral credits monthly model + referral_free_months table
-- Converts the referral_credits table from a one-time-per-pair model to a monthly recurring model.

-- 1. Add billing_month column to referral_credits
ALTER TABLE "referral_credits" ADD COLUMN IF NOT EXISTS "billing_month" varchar(7);
--> statement-breakpoint

-- 2. Drop old columns no longer needed in the new model
ALTER TABLE "referral_credits"
  DROP COLUMN IF EXISTS "applied_to_invoice_id",
  DROP COLUMN IF EXISTS "applied_amount",
  DROP COLUMN IF EXISTS "billing_period_start",
  DROP COLUMN IF EXISTS "billing_period_end",
  DROP COLUMN IF EXISTS "expires_at";
--> statement-breakpoint

-- 3. Drop old unique constraint (pair only, no month)
DROP INDEX IF EXISTS "UX_referral_pair";
--> statement-breakpoint

-- 4. Create new unique index: one credit per referral pair per billing month
--    Partial index (WHERE billing_month IS NOT NULL) so legacy rows without a month are excluded.
CREATE UNIQUE INDEX IF NOT EXISTS "UX_referral_pair_month"
  ON "referral_credits" ("referrer_user_id", "referred_user_id", "billing_month")
  WHERE "billing_month" IS NOT NULL;
--> statement-breakpoint

-- 5. Create referral_free_months table
CREATE TABLE IF NOT EXISTS "referral_free_months" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "credits_consumed" integer NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'pending',
  "earned_at" timestamp NOT NULL DEFAULT now(),
  "applied_at" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now()
);
--> statement-breakpoint

-- 6. Indexes for referral_free_months
CREATE INDEX IF NOT EXISTS "IDX_free_months_user_status"
  ON "referral_free_months" ("user_id", "status");
--> statement-breakpoint

-- 7. Index for referral_credits by referrer + status (for fast credit balance lookup)
CREATE INDEX IF NOT EXISTS "IDX_referral_referrer_status"
  ON "referral_credits" ("referrer_user_id", "status");
