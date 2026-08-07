/**
 * restore.ts — restore a database backup produced by backup.ts.
 *
 * Safety rules (enforced unconditionally):
 *   1. Dry-run by default — prints what WOULD be inserted without touching the DB.
 *   2. Requires --confirm to write anything.
 *   3. Refuses to run against a target that looks like production unless
 *      --force-production is also passed.
 *   4. Dependency-ordered inserts (foreign-key topology from PostgreSQL catalog).
 *   5. Schema drift: missing columns get defaults, removed tables are skipped
 *      with a warning.
 *
 * Usage:
 *   tsx src/restore.ts <backup-file.json>                    (dry-run)
 *   tsx src/restore.ts <backup-file.json> --confirm          (real restore)
 *   tsx src/restore.ts <backup-file.json> --confirm --force-production
 */

import * as fs from 'fs';
import * as path from 'path';
import { Pool } from 'pg';
import type { PoolClient } from 'pg';

// ─── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const backupFilePath = args.find(a => !a.startsWith('--'));
const DRY_RUN         = !args.includes('--confirm');
const FORCE_PROD      = args.includes('--force-production');

if (!backupFilePath) {
  console.error('Usage: tsx src/restore.ts <backup-file.json> [--confirm] [--force-production]');
  process.exit(1);
}

// ─── Production guard ────────────────────────────────────────────────────────

/**
 * Returns true if the target DATABASE_URL / env looks like a production database.
 * Heuristics (any one is sufficient):
 *   - REPLIT_DEPLOYMENT is set (process is running inside a Deployed Repl)
 *   - NODE_ENV === 'production'
 *   - DATABASE_URL host contains 'prod', 'live', or 'gotohomebase'
 *   - PGHOST contains 'prod' or 'live'
 */
function looksLikeProduction(): boolean {
  if (process.env.REPLIT_DEPLOYMENT) return true;
  if (process.env.NODE_ENV === 'production') return true;
  const url = process.env.DATABASE_URL ?? '';
  const host = process.env.PGHOST ?? '';
  const combinedLower = (url + ' ' + host).toLowerCase();
  return /\bprod\b|live|gotohomebase\.com/.test(combinedLower);
}

if (looksLikeProduction() && !FORCE_PROD) {
  console.error(
    '\n⛔  PRODUCTION DATABASE DETECTED\n' +
    '   The target DATABASE_URL / PGHOST looks like a production database.\n' +
    '   Re-run with --force-production if you really mean to restore here.\n' +
    '   This is a destructive operation — existing rows will be deleted.\n',
  );
  process.exit(1);
}

// ─── Dry-run banner ──────────────────────────────────────────────────────────

if (DRY_RUN) {
  console.log(
    '\n⚠️  DRY-RUN MODE  (no data will be written)\n' +
    '   Re-run with --confirm to perform the actual restore.\n',
  );
} else {
  console.log('\n🔴  LIVE RESTORE — data will be written to the database.\n');
  if (FORCE_PROD) {
    console.warn('⚠️  --force-production passed: writing to a production-looking database!\n');
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface BackupMeta {
  timestamp: string;
  schemaVersion: number;
  tableCount: number;
  totalRows: number;
  dbHost?: string;
}

interface BackupFile {
  meta: BackupMeta;
  tables: Record<string, unknown[]>;
}

// ─── FK-based dependency sort ─────────────────────────────────────────────────

/**
 * Query PostgreSQL's catalog to build a dependency graph from FK constraints,
 * then return the tables in a safe insert order (parents before children).
 * Tables not in the backup are ignored.
 */
async function sortTablesByDependency(
  pool: Pool,
  tableNames: string[],
): Promise<string[]> {
  // Fetch all FK edges within our table set
  const { rows: edges } = await pool.query<{ child: string; parent: string }>(`
    SELECT DISTINCT
      tc.table_name   AS child,
      ccu.table_name  AS parent
    FROM information_schema.table_constraints tc
    JOIN information_schema.referential_constraints rc
      ON tc.constraint_name = rc.constraint_name
     AND tc.constraint_schema = rc.constraint_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = rc.unique_constraint_name
     AND ccu.constraint_schema = rc.unique_constraint_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
      AND tc.table_name = ANY($1)
      AND ccu.table_name = ANY($1)
      AND tc.table_name <> ccu.table_name
  `, [tableNames]);

  // Build adjacency list: child → [parents]
  const deps = new Map<string, Set<string>>();
  for (const t of tableNames) deps.set(t, new Set());
  for (const { child, parent } of edges) {
    deps.get(child)?.add(parent);
  }

  // Kahn's algorithm (topological sort)
  const inDegree = new Map<string, number>();
  const revDeps = new Map<string, Set<string>>(); // parent → children
  for (const t of tableNames) { inDegree.set(t, 0); revDeps.set(t, new Set()); }
  for (const [child, parents] of deps) {
    for (const p of parents) {
      inDegree.set(child, (inDegree.get(child) ?? 0) + 1);
      revDeps.get(p)?.add(child);
    }
  }

  const queue: string[] = [];
  for (const [t, deg] of inDegree) { if (deg === 0) queue.push(t); }
  queue.sort(); // deterministic within same level

  const sorted: string[] = [];
  while (queue.length) {
    const t = queue.shift()!;
    sorted.push(t);
    const children = [...(revDeps.get(t) ?? [])].sort();
    for (const child of children) {
      const newDeg = (inDegree.get(child) ?? 1) - 1;
      inDegree.set(child, newDeg);
      if (newDeg === 0) queue.push(child);
    }
  }

  // Any table not reached (cycle) goes at the end with a warning
  const missed = tableNames.filter(t => !sorted.includes(t));
  if (missed.length) {
    console.warn(`[restore] Warning: circular FK reference detected for: ${missed.join(', ')} — appending at end`);
    sorted.push(...missed);
  }

  return sorted;
}

// ─── Column introspection ─────────────────────────────────────────────────────

interface ColumnInfo {
  default: string | null;
  /** true when the column type is json or jsonb — values must be JSON-serialised before insert */
  isJson: boolean;
}

/**
 * Return the columns that actually exist in the live table, mapped to their
 * default expression and whether they are a JSON/JSONB type.
 */
async function getLiveColumns(
  pool: Pool,
  tableName: string,
): Promise<Map<string, ColumnInfo>> {
  const { rows } = await pool.query<{
    column_name: string;
    column_default: string | null;
    udt_name: string;
  }>(`
    SELECT column_name, column_default, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = $1
  `, [tableName]);
  return new Map(rows.map(r => [
    r.column_name,
    { default: r.column_default, isJson: r.udt_name === 'json' || r.udt_name === 'jsonb' },
  ]));
}

// ─── Table restore ────────────────────────────────────────────────────────────

async function restoreTable(
  pool: Pool,
  tableName: string,
  rows: unknown[],
  dryRun: boolean,
): Promise<{ inserted: number; skipped: number; warnings: string[] }> {
  const warnings: string[] = [];

  if (!rows.length) {
    console.log(`  • ${tableName}: 0 rows — nothing to insert`);
    return { inserted: 0, skipped: 0, warnings };
  }

  // Check table exists in live schema
  const { rows: tableCheck } = await pool.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [tableName],
  );
  if (!tableCheck.length) {
    const w = `Table "${tableName}" not found in live schema — skipped (schema drift)`;
    warnings.push(w);
    console.warn(`  ⚠ ${tableName}: ${w}`);
    return { inserted: 0, skipped: rows.length, warnings };
  }

  // Get live columns
  const liveColumns = await getLiveColumns(pool, tableName);
  const firstRow = rows[0] as Record<string, unknown>;
  const backupCols = Object.keys(firstRow);

  // Columns in backup but missing from live schema (removed columns → drop from insert)
  const droppedCols = backupCols.filter(c => !liveColumns.has(c));
  if (droppedCols.length) {
    const w = `Columns dropped (not in live schema, will be omitted): ${droppedCols.join(', ')}`;
    warnings.push(w);
    console.warn(`  ⚠ ${tableName}: ${w}`);
  }

  // Columns in live schema but missing from backup (added columns → rely on DB default)
  const addedCols = [...liveColumns.keys()].filter(c => !backupCols.includes(c));
  if (addedCols.length) {
    const withoutDefault = addedCols.filter(c => liveColumns.get(c)?.default === null);
    if (withoutDefault.length) {
      const w = `New columns with no default (rows may fail): ${withoutDefault.join(', ')}`;
      warnings.push(w);
      console.warn(`  ⚠ ${tableName}: ${w}`);
    }
  }

  const insertCols = backupCols.filter(c => liveColumns.has(c));
  if (!insertCols.length) {
    const w = 'No matching columns between backup and live schema — skipped';
    warnings.push(w);
    console.warn(`  ⚠ ${tableName}: ${w}`);
    return { inserted: 0, skipped: rows.length, warnings };
  }

  if (dryRun) {
    console.log(`  • ${tableName}: would insert ${rows.length} rows (dry-run)`);
    return { inserted: 0, skipped: 0, warnings };
  }

  // Truncate table before restoring
  await pool.query(`TRUNCATE TABLE "${tableName}" CASCADE`);

  let inserted = 0;
  const BATCH = 100;

  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = (rows as Record<string, unknown>[]).slice(i, i + BATCH);
    const colList = insertCols.map(c => `"${c}"`).join(', ');
    const values: unknown[] = [];
    const placeholders = batch.map((row, bi) => {
      const rowPlaceholders = insertCols.map((c, ci) => {
        const v = row[c] ?? null;
        // pg serialises JS arrays as PostgreSQL array syntax ({...}), not JSON.
        // Only stringify object/array values for json/jsonb columns — native array
        // columns (text[], etc.) must be passed as-is for pg to handle correctly.
        const info = liveColumns.get(c);
        const serialised = (v !== null && typeof v === 'object' && info?.isJson)
          ? JSON.stringify(v)
          : v;
        values.push(serialised);
        return `$${bi * insertCols.length + ci + 1}`;
      });
      return `(${rowPlaceholders.join(', ')})`;
    }).join(', ');

    await pool.query(
      `INSERT INTO "${tableName}" (${colList}) VALUES ${placeholders} ON CONFLICT DO NOTHING`,
      values,
    );
    inserted += batch.length;
  }

  console.log(`  ✓ ${tableName}: inserted ${inserted} rows`);
  return { inserted, skipped: 0, warnings };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const absPath = path.resolve(backupFilePath!);
  if (!fs.existsSync(absPath)) {
    console.error(`Backup file not found: ${absPath}`);
    process.exit(1);
  }

  console.log(`[restore] Reading backup: ${absPath}`);
  const backupFile: BackupFile = JSON.parse(fs.readFileSync(absPath, 'utf8'));
  const { meta, tables } = backupFile;

  console.log(`[restore] Backup timestamp : ${meta.timestamp}`);
  console.log(`[restore] Tables in backup : ${Object.keys(tables).length}`);
  console.log(`[restore] Total rows       : ${meta.totalRows?.toLocaleString() ?? '(unknown)'}`);
  console.log(`[restore] Backup source    : ${meta.dbHost ?? '(unknown)'}`);
  console.log(`[restore] Target PGHOST    : ${process.env.PGHOST ?? '(unknown)'}\n`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    const tableNames = Object.keys(tables);
    console.log('[restore] Determining FK-ordered insert sequence...');
    const ordered = await sortTablesByDependency(pool, tableNames);
    console.log(`[restore] Insert order: ${ordered.join(' → ')}\n`);

    let totalInserted = 0;
    let totalSkipped  = 0;
    const allWarnings: string[] = [];

    for (const tableName of ordered) {
      const rows = tables[tableName] ?? [];
      const { inserted, skipped, warnings } = await restoreTable(pool, tableName, rows, DRY_RUN);
      totalInserted += inserted;
      totalSkipped  += skipped;
      allWarnings.push(...warnings);
    }

    console.log('\n─────────────────────────────────────────');
    if (DRY_RUN) {
      console.log('DRY-RUN COMPLETE — no data was written.');
      console.log(`Would restore ${tableNames.length} tables.`);
    } else {
      console.log('RESTORE COMPLETE');
      console.log(`  Rows inserted : ${totalInserted.toLocaleString()}`);
      console.log(`  Rows skipped  : ${totalSkipped.toLocaleString()}`);
    }
    if (allWarnings.length) {
      console.log(`\nWarnings (${allWarnings.length}):`);
      allWarnings.forEach(w => console.log(`  ⚠ ${w}`));
    }
    console.log('─────────────────────────────────────────\n');
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('[restore] FATAL:', err);
  process.exit(1);
});
