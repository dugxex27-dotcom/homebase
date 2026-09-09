import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

export function shouldRunStartupMigrations(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment.NODE_ENV !== "production" && environment.REPLIT_DEPLOYMENT !== "1";
}

export async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  console.log('Starting database migration...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations completed successfully!');
  } catch (error: any) {
    // Log migration errors but do not crash the server.
    // This can happen when some tables were created via db push before the
    // migration system was introduced, leaving the journal out of sync.
    console.warn('Migration warning (non-fatal):', error?.message || error);
  }

  // Ensure house_disclosures table exists (created via raw SQL to avoid drizzle-kit push issues)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "house_disclosures" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "house_id" varchar NOT NULL,
        "homeowner_id" varchar NOT NULL,
        "form_type" text NOT NULL DEFAULT 'pcds',
        "state_code" text NOT NULL DEFAULT 'UNKNOWN',
        "answers" jsonb DEFAULT '{}',
        "updated_at" timestamp DEFAULT now(),
        "created_at" timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_house_disclosures_homeowner_id" ON "house_disclosures"("homeowner_id");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] house_disclosures table setup warning (non-fatal):', err?.message ?? err);
  }
  // Add unique constraint on house_id so only one disclosure exists per property
  try {
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UDX_house_disclosures_house_id"
        ON "house_disclosures"("house_id");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] house_disclosures unique index warning (non-fatal):', err?.message ?? err);
  }
  // Add FK constraints to match Drizzle schema declarations (idempotent via DO block)
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'house_disclosures_house_id_fkey'
        ) THEN
          ALTER TABLE "house_disclosures"
            ADD CONSTRAINT "house_disclosures_house_id_fkey"
            FOREIGN KEY ("house_id") REFERENCES "houses"("id") ON DELETE CASCADE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'house_disclosures_homeowner_id_fkey'
        ) THEN
          ALTER TABLE "house_disclosures"
            ADD CONSTRAINT "house_disclosures_homeowner_id_fkey"
            FOREIGN KEY ("homeowner_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] house_disclosures FK constraints warning (non-fatal):', err?.message ?? err);
  }

  // Ensure insurance_email_logs table exists (created via raw SQL to avoid drizzle-kit push issues)
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "insurance_email_logs" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "homeowner_id" varchar NOT NULL,
        "adjuster_email" text NOT NULL,
        "claim_area" text NOT NULL,
        "sent_at" timestamp NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_insurance_email_logs_homeowner_id" ON "insurance_email_logs"("homeowner_id");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] insurance_email_logs table setup warning (non-fatal):', err?.message ?? err);
  }
  // Add FK constraint on homeowner_id (idempotent via DO block)
  try {
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'insurance_email_logs_homeowner_id_fkey'
        ) THEN
          ALTER TABLE "insurance_email_logs"
            ADD CONSTRAINT "insurance_email_logs_homeowner_id_fkey"
            FOREIGN KEY ("homeowner_id") REFERENCES "users"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] insurance_email_logs FK constraint warning (non-fatal):', err?.message ?? err);
  }

  // Allow homeowners to give saved insurance claim packages memorable names.
  try {
    await pool.query(`
      ALTER TABLE "insurance_claim_packages"
        ADD COLUMN IF NOT EXISTS "label" text;
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] insurance_claim_packages label column warning (non-fatal):', err?.message ?? err);
  }

  // Ensure quiz_results table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "quiz_results" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar REFERENCES "users"("id") ON DELETE SET NULL,
        "score" integer NOT NULL,
        "tier" text NOT NULL,
        "completed_at" timestamp NOT NULL,
        "created_at" timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_quiz_results_user_id" ON "quiz_results"("user_id");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] quiz_results table setup warning (non-fatal):', err?.message ?? err);
  }

  // Ensure home_area column exists in maintenance_logs (added after initial schema push)
  try {
    await pool.query(`
      ALTER TABLE "maintenance_logs" ADD COLUMN IF NOT EXISTS "home_area" text;
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] maintenance_logs home_area column warning (non-fatal):', err?.message ?? err);
  }

  // Ensure onboarding_progress table exists
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "onboarding_progress" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" varchar NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
        "current_step" integer NOT NULL DEFAULT 2,
        "completed_steps" integer[] NOT NULL DEFAULT ARRAY[]::integer[],
        "skipped_steps" integer[] NOT NULL DEFAULT ARRAY[]::integer[],
        "referral_code_applied" varchar,
        "started_at" timestamp DEFAULT now(),
        "completed_at" timestamp,
        "created_at" timestamp DEFAULT now(),
        "updated_at" timestamp DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_onboarding_progress_user_id" ON "onboarding_progress"("user_id");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] onboarding_progress table setup warning (non-fatal):', err?.message ?? err);
  }

  // Ensure pending_seat_syncs table exists (crash-safe seat-update checkpointing)
  // One row per company; written before the Stripe API call and deleted on success.
  // Any row present at startup means the previous process crashed mid-update.
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "pending_seat_syncs" (
        "company_id" varchar PRIMARY KEY,
        "created_at" timestamptz NOT NULL DEFAULT now()
      );
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] pending_seat_syncs table setup warning (non-fatal):', err?.message ?? err);
  }

  // Ensure stripe_processed_events table exists (Stripe webhook idempotency dedup)
  // Rows transition: pending → committed (success) or pending → failed (crash/cleanup).
  // The daily scheduler prunes rows older than 96 h (Stripe's max retry window + buffer).
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "stripe_processed_events" (
        "stripe_event_id" varchar PRIMARY KEY,
        "status" text NOT NULL DEFAULT 'pending',
        "processed_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS "IDX_stripe_processed_events_status_at"
        ON "stripe_processed_events" ("status", "processed_at");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] stripe_processed_events table setup warning (non-fatal):', err?.message ?? err);
  }

  // Fleet-wide Stripe webhook outage and alert-cooldown state.
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "stripe_webhook_monitoring_state" (
        "id" integer PRIMARY KEY CHECK ("id" = 1),
        "consecutive_5xx_failures" integer NOT NULL DEFAULT 0,
        "last_failure_at" timestamptz,
        "last_successful_response_at" timestamptz,
        "last_failure_alert_at" timestamptz,
        "last_failure_alert_token" text,
        "stale_pending_count" integer NOT NULL DEFAULT 0,
        "last_stale_pending_event_ids" text[] NOT NULL DEFAULT '{}',
        "last_stale_alert_at" timestamptz,
        "last_stale_alert_token" text,
        "monitoring_check_error" text
      );
      ALTER TABLE "stripe_webhook_monitoring_state"
        ADD COLUMN IF NOT EXISTS "last_failure_alert_token" text,
        ADD COLUMN IF NOT EXISTS "last_stale_alert_token" text;
      INSERT INTO "stripe_webhook_monitoring_state" ("id")
      VALUES (1) ON CONFLICT ("id") DO NOTHING;
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] stripe_webhook_monitoring_state table setup warning (non-fatal):', err?.message ?? err);
  }

  // Add house_id to home_handoff_packages — links a package to the specific
  // existing house record it represents (set by agent at creation/send time).
  // ON DELETE SET NULL: package survives if the house row is ever removed.
  try {
    await pool.query(`
      ALTER TABLE "home_handoff_packages"
        ADD COLUMN IF NOT EXISTS "house_id" varchar
        REFERENCES "houses"("id") ON DELETE SET NULL;

      CREATE INDEX IF NOT EXISTS "IDX_handoff_packages_house_id"
        ON "home_handoff_packages"("house_id");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] home_handoff_packages.house_id column warning (non-fatal):', err?.message ?? err);
  }

  // Add house_ever_linked to home_handoff_packages.
  // One-way flag: set to true when house_id is first assigned; never cleared.
  // Distinguishes "package never linked to a house" (legacy AI path) from
  // "house was linked and later deleted" (claim route returns 410 Gone).
  try {
    await pool.query(`
      ALTER TABLE "home_handoff_packages"
        ADD COLUMN IF NOT EXISTS "house_ever_linked" boolean NOT NULL DEFAULT false;

      UPDATE "home_handoff_packages"
        SET "house_ever_linked" = true
        WHERE "house_id" IS NOT NULL;
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] home_handoff_packages.house_ever_linked column warning (non-fatal):', err?.message ?? err);
  }

  // Create handoff_transfers — immutable audit log; one row per ownership transfer attempt.
  // No explicit ON DELETE on FKs (defaults to RESTRICT) so audit rows cannot be silently
  // removed by deleting the referenced package, house, or user.
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS "handoff_transfers" (
        "id"                    varchar   PRIMARY KEY DEFAULT gen_random_uuid(),
        "package_id"            varchar   NOT NULL REFERENCES "home_handoff_packages"("id"),
        "house_id"              varchar   NOT NULL REFERENCES "houses"("id"),
        "previous_homeowner_id" varchar   NOT NULL REFERENCES "users"("id"),
        "new_homeowner_id"      varchar   NOT NULL REFERENCES "users"("id"),
        "tables_updated"        jsonb,
        "status"                text      NOT NULL,
        "error_detail"          text,
        "created_at"            timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS "IDX_handoff_transfers_package_id"
        ON "handoff_transfers"("package_id");
      CREATE INDEX IF NOT EXISTS "IDX_handoff_transfers_house_id"
        ON "handoff_transfers"("house_id");
      CREATE INDEX IF NOT EXISTS "IDX_handoff_transfers_status"
        ON "handoff_transfers"("status");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] handoff_transfers table warning (non-fatal):', err?.message ?? err);
  }

  // Supports active-boost lookups and the hourly 30-day retention cleanup.
  try {
    await pool.query(`
      CREATE INDEX IF NOT EXISTS "IDX_contractor_boosts_status_end_date"
        ON "contractor_boosts" ("status", "end_date");
    `);
  } catch (err: any) {
    console.warn('[MIGRATE] contractor_boosts retention index warning (non-fatal):', err?.message ?? err);
  }

  await pool.end();
}

