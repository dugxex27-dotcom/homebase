import { db } from './db';
import { invoiceAnalyses } from '@workspace/db';
import { logger } from './lib/logger';
import { ObjectStorageService } from './objectStorage';

const INVOICE_PREFIX = 'public/invoices/';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // Run every 6 hours

// Grace period before an unreferenced file is considered orphaned.
// Defaults to 24 hours; override with INVOICE_ORPHAN_GRACE_PERIOD_HOURS.
function getGracePeriodMs(): number {
  const hours = Number(process.env.INVOICE_ORPHAN_GRACE_PERIOD_HOURS ?? 24);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 60 * 60 * 1000;
}

// Build the set of all file paths currently referenced in invoice_analyses.
// Each row can reference files across four URL array columns.  We normalise
// every stored URL to the bare object-name form used by the storage service
// so we can compare against the names returned by listFiles().
//
// URLs are stored with a leading slash: "/public/invoices/<uuid>.<ext>"
// Object names from listFiles() are bare: "public/invoices/<uuid>.<ext>"
async function buildReferencedObjectNames(): Promise<Set<string>> {
  const rows = await db
    .select({
      invoiceUrls: invoiceAnalyses.invoiceUrls,
      beforePhotoUrls: invoiceAnalyses.beforePhotoUrls,
      afterPhotoUrls: invoiceAnalyses.afterPhotoUrls,
      receiptUrls: invoiceAnalyses.receiptUrls,
    })
    .from(invoiceAnalyses);

  const referenced = new Set<string>();

  for (const row of rows) {
    const allUrls = [
      ...(row.invoiceUrls ?? []),
      ...(row.beforePhotoUrls ?? []),
      ...(row.afterPhotoUrls ?? []),
      ...(row.receiptUrls ?? []),
    ];

    for (const url of allUrls) {
      if (!url) continue;
      // Strip the leading slash so it matches the object name from listFiles()
      const normalised = url.startsWith('/') ? url.slice(1) : url;
      referenced.add(normalised);
    }
  }

  return referenced;
}

export async function runInvoiceOrphanCleanup(): Promise<{
  scanned: number;
  deleted: number;
  skipped: number;
  errors: number;
}> {
  const gracePeriodMs = getGracePeriodMs();
  const cutoff = new Date(Date.now() - gracePeriodMs);

  logger.info(
    { gracePeriodHours: gracePeriodMs / (60 * 60 * 1000), cutoff },
    '[INVOICE-ORPHAN-CLEANUP] Starting scan',
  );

  const service = new ObjectStorageService();
  let files: Array<{ name: string; timeCreated: Date }>;

  try {
    files = await service.listFiles(INVOICE_PREFIX);
  } catch (err) {
    logger.error({ err }, '[INVOICE-ORPHAN-CLEANUP] Failed to list files — aborting run');
    return { scanned: 0, deleted: 0, skipped: 0, errors: 1 };
  }

  logger.info({ count: files.length }, '[INVOICE-ORPHAN-CLEANUP] Files found in storage');

  let referenced: Set<string>;
  try {
    referenced = await buildReferencedObjectNames();
  } catch (err) {
    logger.error({ err }, '[INVOICE-ORPHAN-CLEANUP] Failed to query DB for referenced URLs — aborting run');
    return { scanned: files.length, deleted: 0, skipped: 0, errors: 1 };
  }

  logger.info(
    { referencedCount: referenced.size },
    '[INVOICE-ORPHAN-CLEANUP] Referenced file count loaded from DB',
  );

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    if (referenced.has(file.name)) {
      skipped++;
      continue;
    }

    // Still within the grace period — leave it alone so in-progress uploads
    // that haven't been confirmed yet are not prematurely removed.
    if (file.timeCreated >= cutoff) {
      skipped++;
      continue;
    }

    try {
      // deleteFile expects the path without the bucket prefix (just the object name).
      await service.deleteFile(file.name);
      deleted++;
      logger.info({ objectName: file.name }, '[INVOICE-ORPHAN-CLEANUP] Deleted orphaned file');
    } catch (err) {
      errors++;
      logger.warn({ err, objectName: file.name }, '[INVOICE-ORPHAN-CLEANUP] Failed to delete file');
    }
  }

  logger.info(
    { scanned: files.length, deleted, skipped, errors },
    '[INVOICE-ORPHAN-CLEANUP] Run complete',
  );

  return { scanned: files.length, deleted, skipped, errors };
}

let schedulerInterval: NodeJS.Timeout | null = null;

function startInvoiceOrphanCleanupScheduler(): void {
  if (schedulerInterval) {
    logger.info('[INVOICE-ORPHAN-CLEANUP] Scheduler already running');
    return;
  }

  logger.info(
    { intervalHours: CHECK_INTERVAL_MS / (60 * 60 * 1000) },
    '[INVOICE-ORPHAN-CLEANUP] Starting invoice orphan cleanup scheduler',
  );

  // Delay the first run by 5 minutes so transient uploads at startup are not
  // mistakenly swept before they complete their confirm step.
  const STARTUP_DELAY_MS = 5 * 60 * 1000;
  const startupTimer = setTimeout(() => {
    runInvoiceOrphanCleanup().catch((err) =>
      logger.error({ err }, '[INVOICE-ORPHAN-CLEANUP] Initial run failed'),
    );
  }, STARTUP_DELAY_MS);
  startupTimer.unref();

  schedulerInterval = setInterval(() => {
    runInvoiceOrphanCleanup().catch((err) =>
      logger.error({ err }, '[INVOICE-ORPHAN-CLEANUP] Scheduled run failed'),
    );
  }, CHECK_INTERVAL_MS);
}

function stopInvoiceOrphanCleanupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[INVOICE-ORPHAN-CLEANUP] Scheduler stopped');
  }
}

export const invoiceOrphanCleanupScheduler = {
  start: startInvoiceOrphanCleanupScheduler,
  stop: stopInvoiceOrphanCleanupScheduler,
  runNow: runInvoiceOrphanCleanup,
};
