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
      CREATE INDEX IF NOT EXISTS "IDX_house_disclosures_house_id" ON "house_disclosures"("house_id");
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

  await pool.end();
}

