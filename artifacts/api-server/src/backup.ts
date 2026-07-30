/**
 * backup.ts — database backup with dynamic table discovery, R2 upload, and retention.
 *
 * Usage:
 *   tsx src/backup.ts            — create a new backup
 *   tsx src/backup.ts list       — list local backup files
 *   tsx src/backup.ts list-r2    — list backups in R2 bucket
 *
 * Required env vars for R2 upload (optional — backup works locally without them):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME
 *
 * Retention: old backups (>14 days) are pruned from R2 after each successful upload.
 */

import { is, getTableName } from 'drizzle-orm';
import { PgTable } from 'drizzle-orm/pg-core';
import { db, pool } from './db';
import * as schemaExports from '@workspace/db';
import * as fs from 'fs';
import * as path from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

interface BackupMeta {
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

// ─── Constants ───────────────────────────────────────────────────────────────

const BACKUP_DIR = path.join(process.cwd(), 'backups');
const RETENTION_DAYS = 14;

// ─── Dynamic table discovery ─────────────────────────────────────────────────

/**
 * Return every pgTable exported from @workspace/db, sorted alphabetically by
 * SQL table name.  No hardcoded list — adding a table to the schema automatically
 * includes it in future backups.
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

// ─── R2 helpers ──────────────────────────────────────────────────────────────

function r2Config() {
  const id  = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const sec = process.env.R2_SECRET_ACCESS_KEY;
  const bkt = process.env.R2_BUCKET_NAME;
  if (!id || !key || !sec || !bkt) return null;
  return { accountId: id, accessKeyId: key, secretAccessKey: sec, bucket: bkt };
}

async function uploadToR2(localPath: string, objectKey: string): Promise<void> {
  const cfg = r2Config();
  if (!cfg) {
    console.log('[backup] R2 secrets not configured — skipping upload.');
    return;
  }

  // Lazy-import the AWS SDK so the script still runs without it installed
  const { S3Client, PutObjectCommand, ListObjectsV2Command, DeleteObjectsCommand } =
    await import('@aws-sdk/client-s3');

  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });

  const body = fs.readFileSync(localPath);
  await s3.send(new PutObjectCommand({
    Bucket: cfg.bucket,
    Key: objectKey,
    Body: body,
    ContentType: 'application/json',
    Metadata: {
      'backup-timestamp': new Date().toISOString(),
      'size-bytes': String(body.length),
    },
  }));

  console.log(`[backup] ✓ Uploaded to R2: s3://${cfg.bucket}/${objectKey}  (${Math.round(body.length / 1024)} KB)`);

  // Apply retention: delete objects older than RETENTION_DAYS
  await pruneR2Backups(s3, cfg.bucket);
}

async function pruneR2Backups(
  s3: any,
  bucket: string,
): Promise<void> {
  const { ListObjectsV2Command, DeleteObjectsCommand } = await import('@aws-sdk/client-s3');

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const listed = await s3.send(new ListObjectsV2Command({ Bucket: bucket, Prefix: 'backup-' }));
  const objects: Array<{ Key: string }> = listed.Contents ?? [];

  const toDelete = objects.filter((obj: any) => {
    const lastMod: Date | undefined = obj.LastModified;
    return lastMod && lastMod < cutoff;
  });

  if (!toDelete.length) {
    console.log(`[backup] Retention: no backups older than ${RETENTION_DAYS} days to prune.`);
    return;
  }

  await s3.send(new DeleteObjectsCommand({
    Bucket: bucket,
    Delete: { Objects: toDelete.map((o: any) => ({ Key: o.Key })) },
  }));

  console.log(`[backup] Retention: pruned ${toDelete.length} backup(s) older than ${RETENTION_DAYS} days.`);
  toDelete.forEach((o: any) => console.log(`  ✗ deleted ${o.Key}`));
}

// ─── Main backup routine ──────────────────────────────────────────────────────

export async function createBackup(): Promise<string> {
  console.log('[backup] Starting database backup...');

  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const tables = discoverTables();
  console.log(`[backup] Discovered ${tables.length} tables from Drizzle schema`);

  const nowIso = new Date().toISOString();
  const timestamp = nowIso.replace(/[:.]/g, '-');

  const backupFile: BackupFile = {
    meta: {
      timestamp: nowIso,
      schemaVersion: tables.length,
      tableCount: 0,
      totalRows: 0,
      dbHost: process.env.PGHOST,
    },
    tables: {},
  };

  let skipped = 0;
  let totalRows = 0;

  // Use raw SQL (not drizzle's ORM select) so backup stores actual SQL column
  // names (snake_case) rather than drizzle's JavaScript aliases (camelCase).
  // This ensures restore.ts can match columns against information_schema.columns.
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
  backupFile.meta.totalRows = totalRows;

  const filename = `backup-${timestamp}.json`;
  const localPath = path.join(BACKUP_DIR, filename);
  fs.writeFileSync(localPath, JSON.stringify(backupFile));

  const sizeKb = Math.round(fs.statSync(localPath).size / 1024);
  console.log(`\n[backup] ✓ Local backup written: ${localPath}  (${sizeKb} KB)`);
  console.log(`[backup] Tables: ${backupFile.meta.tableCount} captured, ${skipped} skipped`);
  console.log(`[backup] Total rows: ${totalRows.toLocaleString()}`);

  // Upload to R2 (no-op if secrets not configured)
  await uploadToR2(localPath, filename);

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

async function listR2Backups() {
  const cfg = r2Config();
  if (!cfg) { console.error('R2 secrets not configured.'); process.exit(1); }
  const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
  });
  const resp = await s3.send(new ListObjectsV2Command({ Bucket: cfg.bucket }));
  const objects = resp.Contents ?? [];
  if (!objects.length) { console.log('No backups in R2.'); return; }
  console.log('R2 backups:');
  for (const obj of objects.sort((a: any, b: any) => b.LastModified - a.LastModified)) {
    const sizeKb = Math.round((obj as any).Size / 1024);
    console.log(`  ${(obj as any).Key}  (${sizeKb} KB)  ${(obj as any).LastModified?.toISOString()}`);
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const command = process.argv[2];

if (command === 'list') {
  listLocalBackups().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
} else if (command === 'list-r2') {
  listR2Backups().then(() => process.exit(0)).catch(err => { console.error(err); process.exit(1); });
} else {
  createBackup()
    .then(() => pool.end())
    .catch(err => { console.error('[backup] FATAL:', err); pool.end(); process.exit(1); });
}
