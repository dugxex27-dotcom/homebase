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
  } finally {
    await pool.end();
  }
}

