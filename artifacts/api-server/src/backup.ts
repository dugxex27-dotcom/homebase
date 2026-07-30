/**
 * backup.ts — database backup with dynamic table discovery, Replit Object
 * Storage upload, and 14-day retention.
 *
 * Usage:
 *   tsx src/backup.ts              — create a backup (local + upload)
 *   tsx src/backup.ts list         — list local backup files
 *   tsx src/backup.ts list-storage — list backups in Replit Object Storage
 *
 * Required env vars:
 *   PRIVATE_OBJECT_DIR   — used to resolve the bucket (already set for file uploads)
 *   DATABASE_URL         — already required for the API server
 *
 * Optional:
 *   BACKUP_SECRET — if set, a POST /api/backup endpoint checks this in the
 *                   Authorization header (Bearer <secret>) before running a backup.
 */

import { is, getTableName } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { pool } from './db';
import * as schemaExports from '@workspace/db';
import { objectStorageClient } from './objectStorage';
import * as fs from 'fs';
import * as path from 'path';

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKUP_DIR     = path.join(process.cwd(), 'backups');
const BACKUP_PREFIX  = 'backups/';
const RETENTION_DAYS = 14;

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BackupMeta {
  timestamp: string;       // ISO-8601
  schemaVersion: number;   // number of tables discovered (schema drift indicator)
  tableCount: number;      // tables actually captured
  totalRows: number;
  dbHost: string | undefined;
}

export interface BackupFile {
  meta: BackupMeta;
  tables: Record<string, unknown[]>;
}

// ─── Dynamic table discovery ──────────────────────────────────────────────────

/**
 * Return every pgTable exported from @workspace/db, sorted alphabetically by
 * SQL table name.  No hardcoded list — adding a table to the Drizzle schema
 * automatically includes it in future backups.
 */
export function discoverTables(): Array<{
  exportName: string;
  tableName: string;
  table: PgTable<any>;
}> {
  return Object.entries(schemaExports)
    .filter(([, value]) => is(value, PgTable))
    .map(([exportName, value]) => ({
      exportName,
      tableName: getTableName(value as PgTable<any>),
      table: value as PgTable<any>,
    }))
    .sort((a, b) => a.tableName.localeCompare(b.tableName));
}

// ─── Object Storage helpers ───────────────────────────────────────────────────

/**
 * Resolve the bucket from PRIVATE_OBJECT_DIR.
 * PRIVATE_OBJECT_DIR is a path like "/bucket-name/private" — the bucket name
 * is always the first segment after the leading slash.
 */
function getBackupBucket() {
  const dir = process.env.PRIVATE_OBJECT_DIR;
  if (!dir) {
    throw new Error('PRIVATE_OBJECT_DIR is not set — cannot upload backup');
  }
  const normalized = dir.startsWith('/') ? dir : `/${dir}`;
  const bucketName = normalized.split('/')[1];
  if (!bucketName) {
    throw new Error(`Cannot parse bucket name from PRIVATE_OBJECT_DIR="${dir}"`);
  }
  return objectStorageClient.bucket(bucketName);
}

/**
 * Upload a local backup file to Replit Object Storage under the backups/ prefix,
 * then prune backups older than RETENTION_DAYS.
 */
async function uploadToObjectStorage(localPath: string, objectKey: string): Promise<void> {
  const bucket = getBackupBucket();
  const file = bucket.file(objectKey);
  const body = fs.readFileSync(localPath);

  await file.save(body, {
    contentType: 'application/json',
    metadata: {
      backupTimestamp: new Date().toISOString(),
      sizeBytes:       String(body.length),
    },
  });

  const sizeKb = Math.round(body.length / 1024);
  console.log(`[backup] ✓ Uploaded to Replit Object Storage`);
  console.log(`[backup]   key  : ${objectKey}`);
  console.log(`[backup]   size : ${sizeKb} KB`);

  await pruneOldBackups(bucket);
}

/**
 * List all backups/ objects in the bucket and delete any that are older than
 * RETENTION_DAYS.  Runs after every successful upload.
 */
async function pruneOldBackups(bucket: ReturnType<typeof objectStorageClient.bucket>): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const [files] = await bucket.getFiles({ prefix: BACKUP_PREFIX });

  const toDelete = files.filter(f => {
    const created = new Date(f.metadata.timeCreated as string);
    return created < cutoff;
  });

  if (!toDelete.length) {
    console.log(`[backup] Retention: no backups older than ${RETENTION_DAYS} days — nothing pruned.`);
    return;
  }

  for (const f of toDelete) {
    await f.delete();
    console.log(`[backup]   ✗ pruned ${f.name}`);
  }
  console.log(`[backup] Retention: pruned ${toDelete.length} backup(s) older than ${RETENTION_DAYS} days.`);
}

// ─── Main backup routine ──────────────────────────────────────────────────────

export async function createBackup(): Promise<string> {
  console.log('[backup] Starting database backup...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const tables = discoverTables();
  console.log(`[backup] Discovered ${tables.length} tables from Drizzle schema`);

  const nowIso  = new Date().toISOString();
  const timestamp = nowIso.replace(/[:.]/g, '-');

  const backupFile: BackupFile = {
    meta: {
      timestamp:     nowIso,
      schemaVersion: tables.length,
      tableCount:    0,
      totalRows:     0,
      dbHost:        process.env.PGHOST,
    },
    tables: {},
  };

  let skipped   = 0;
  let totalRows = 0;

  // Use raw SQL (not drizzle's ORM select) so backup stores actual SQL column
  // names (snake_case) — keeps column names consistent with information_schema
  // and avoids drizzle's camelCase JS aliases breaking restore.ts comparisons.
  const client = await pool.connect();
  try {
    for (const { tableName } of tables) {
      try {
        const result = await client.query(`SELECT * FROM "${tableName}"`);
        backupFile.tables[tableName] = result.rows;
        totalRows += result.rows.length;
        console.log(`  ✓ ${tableName}: ${result.rows.length} rows`);
      } catch (err: any) {
        console.warn(`  ⚠ ${tableName}: skipped — ${err.message}`);
        skipped++;
      }
    }
  } finally {
    client.release();
  }

  backupFile.meta.tableCount = Object.keys(backupFile.tables).length;
  backupFile.meta.totalRows  = totalRows;

  const filename  = `backup-${timestamp}.json`;
  const localPath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(localPath, JSON.stringify(backupFile));

  const sizeKb = Math.round(fs.statSync(localPath).size / 1024);
  console.log(`\n[backup] ✓ Local backup written: ${localPath}  (${sizeKb} KB)`);
  console.log(`[backup] Tables: ${backupFile.meta.tableCount} captured, ${skipped} skipped`);
  console.log(`[backup] Total rows: ${totalRows.toLocaleString()}`);

  // Upload to Replit Object Storage (key: backups/<filename>)
  await uploadToObjectStorage(localPath, `${BACKUP_PREFIX}${filename}`);

  return localPath;
}

// ─── List commands ────────────────────────────────────────────────────────────

async function listLocalBackups() {
  if (!fs.existsSync(BACKUP_DIR)) { console.log('No local backups found.'); return; }
  const files = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
    .sort().reverse();
  if (!files.length) { console.log('No local backups found.'); return; }
  console.log('Local backups:');
  for (const f of files) {
    const sizeKb = Math.round(fs.statSync(path.join(BACKUP_DIR, f)).size / 1024);
    console.log(`  ${f}  (${sizeKb} KB)`);
  }
}

async function listStorageBackups() {
  const bucket = getBackupBucket();
  const [files] = await bucket.getFiles({ prefix: BACKUP_PREFIX });

  if (!files.length) { console.log('No backups in Replit Object Storage.'); return; }

  console.log(`Replit Object Storage backups (prefix: ${BACKUP_PREFIX}):`);
  const sorted = [...files].sort((a, b) => {
    const ta = new Date(a.metadata.timeCreated as string).getTime();
    const tb = new Date(b.metadata.timeCreated as string).getTime();
    return tb - ta; // newest first
  });
  for (const f of sorted) {
    const sizeKb   = Math.round(Number(f.metadata.size) / 1024);
    const created  = new Date(f.metadata.timeCreated as string).toISOString();
    const metadata = f.metadata.metadata as Record<string, string> | undefined;
    const ts       = metadata?.backupTimestamp ?? created;
    console.log(`  ${f.name}  (${sizeKb} KB)  ${ts}`);
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const command = process.argv[2];

if (command === 'list') {
  listLocalBackups()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
} else if (command === 'list-storage') {
  listStorageBackups()
    .then(() => process.exit(0))
    .catch(err => { console.error(err); process.exit(1); });
} else {
  createBackup()
    .then(() => pool.end())
    .catch(err => { console.error('[backup] FATAL:', err); pool.end(); process.exit(1); });
}
