import { drizzle } from 'drizzle-orm/neon-serverless';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

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

  await pool.end();
}

