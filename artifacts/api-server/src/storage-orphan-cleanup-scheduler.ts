import { db } from './db';
import { homeDocuments, handoffDocuments, companies, contractors } from '@workspace/db';
import { logger } from './lib/logger';
import { ObjectStorageService } from './objectStorage';

const HOME_DOCS_PREFIX = 'home-documents/';
const HANDOFF_DOCS_PREFIX = 'handoff-documents/';

// Contractor images are stored under two inconsistent prefixes depending on the
// upload route that was used.  One route writes to "public/contractor-images/…"
// while another writes to "contractor-images/…" but stores the public URL as
// "/public/contractor-images/…".  We sweep both to avoid leaving orphans behind
// from either code path.
const CONTRACTOR_IMAGES_PUBLIC_PREFIX = 'public/contractor-images/logos/';
const CONTRACTOR_IMAGES_BARE_PREFIX = 'contractor-images/logos/';
const CONTRACTOR_PHOTOS_PUBLIC_PREFIX = 'public/contractor-images/photos/';
const CONTRACTOR_PHOTOS_BARE_PREFIX = 'contractor-images/photos/';

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // Run every 6 hours

// Grace period before an unreferenced file is considered orphaned.
// Defaults to 24 hours; override with STORAGE_ORPHAN_GRACE_PERIOD_HOURS.
function getGracePeriodMs(): number {
  const hours = Number(process.env.STORAGE_ORPHAN_GRACE_PERIOD_HOURS ?? 24);
  return (Number.isFinite(hours) && hours > 0 ? hours : 24) * 60 * 60 * 1000;
}

// Normalise a stored path/URL to a bare object name matching the form returned
// by listFiles().  URLs with a leading slash are stripped; others pass through.
function normalise(path: string | null | undefined): string | null {
  if (!path) return null;
  return path.startsWith('/') ? path.slice(1) : path;
}

// ─── Per-prefix referenced-name builders ─────────────────────────────────────

async function buildReferencedHomeDocNames(): Promise<Set<string>> {
  const rows = await db.select({ storageKey: homeDocuments.storageKey }).from(homeDocuments);
  const referenced = new Set<string>();
  for (const row of rows) {
    const key = normalise(row.storageKey);
    if (key) referenced.add(key);
  }
  return referenced;
}

async function buildReferencedHandoffDocNames(): Promise<Set<string>> {
  const rows = await db.select({ storageKey: handoffDocuments.storageKey }).from(handoffDocuments);
  const referenced = new Set<string>();
  for (const row of rows) {
    const key = normalise(row.storageKey);
    if (key) referenced.add(key);
  }
  return referenced;
}

// Build a set of referenced contractor image object names that covers both
// storage prefix conventions:
//   • "public/contractor-images/logos/<uuid>.ext"  (secure company-logo route)
//   • "contractor-images/logos/<uuid>.ext"          (contractor-logo route)
//   • "public/contractor-images/photos/<uuid>.ext"  (public project-photo route)
//   • "contractor-images/photos/<uuid>.ext"          (bare project-photo route)
//
// The DB always stores the URL in its public form ("/public/contractor-images/…"),
// so for the bare-prefix sweeps we additionally add a stripped variant without
// the leading "public/" segment.
async function buildReferencedContractorImageNames(): Promise<Set<string>> {
  const [companyRows, contractorRows] = await Promise.all([
    db.select({
      businessLogo: companies.businessLogo,
      projectPhotos: companies.projectPhotos,
    }).from(companies),
    db.select({
      businessLogo: contractors.businessLogo,
      projectPhotos: contractors.projectPhotos,
    }).from(contractors),
  ]);

  const referenced = new Set<string>();

  function addBothForms(rawUrl: string | null | undefined): void {
    const normalised = normalise(rawUrl);
    if (!normalised) return;
    // Add the URL as stored (e.g. "public/contractor-images/logos/uuid.ext")
    referenced.add(normalised);
    // Also add the bare form without the leading "public/" segment so that
    // objects written via the route that omits the "public/" prefix are matched.
    const bare = normalised.startsWith('public/') ? normalised.slice('public/'.length) : null;
    if (bare) referenced.add(bare);
  }

  for (const row of [...companyRows, ...contractorRows]) {
    addBothForms(row.businessLogo);
    for (const photo of row.projectPhotos ?? []) {
      addBothForms(photo);
    }
  }

  return referenced;
}

// ─── Single-prefix sweep ──────────────────────────────────────────────────────

interface SweepResult {
  scanned: number;
  deleted: number;
  skipped: number;
  errors: number;
}

async function sweepPrefix(
  tag: string,
  prefix: string,
  buildReferenced: () => Promise<Set<string>>,
  service: ObjectStorageService,
  cutoff: Date,
): Promise<SweepResult> {
  let files: Array<{ name: string; timeCreated: Date }>;

  try {
    files = await service.listFiles(prefix);
  } catch (err) {
    logger.error({ err }, `[STORAGE-ORPHAN-CLEANUP] [${tag}] Failed to list files — skipping prefix`);
    return { scanned: 0, deleted: 0, skipped: 0, errors: 1 };
  }

  logger.info({ count: files.length }, `[STORAGE-ORPHAN-CLEANUP] [${tag}] Files found in storage`);

  let referenced: Set<string>;
  try {
    referenced = await buildReferenced();
  } catch (err) {
    logger.error(
      { err },
      `[STORAGE-ORPHAN-CLEANUP] [${tag}] Failed to query DB for referenced URLs — skipping prefix`,
    );
    return { scanned: files.length, deleted: 0, skipped: 0, errors: 1 };
  }

  logger.info(
    { referencedCount: referenced.size },
    `[STORAGE-ORPHAN-CLEANUP] [${tag}] Referenced file count loaded from DB`,
  );

  let deleted = 0;
  let skipped = 0;
  let errors = 0;

  for (const file of files) {
    if (referenced.has(file.name)) {
      skipped++;
      continue;
    }

    // Still within the grace period — leave in-progress uploads alone.
    if (file.timeCreated >= cutoff) {
      skipped++;
      continue;
    }

    try {
      await service.deleteFile(file.name);
      deleted++;
      logger.info({ objectName: file.name }, `[STORAGE-ORPHAN-CLEANUP] [${tag}] Deleted orphaned file`);
    } catch (err) {
      errors++;
      logger.warn({ err, objectName: file.name }, `[STORAGE-ORPHAN-CLEANUP] [${tag}] Failed to delete file`);
    }
  }

  logger.info(
    { scanned: files.length, deleted, skipped, errors },
    `[STORAGE-ORPHAN-CLEANUP] [${tag}] Prefix sweep complete`,
  );

  return { scanned: files.length, deleted, skipped, errors };
}

// Accumulate two SweepResult objects into one for combined totals.
function addResults(a: SweepResult, b: SweepResult): SweepResult {
  return {
    scanned: a.scanned + b.scanned,
    deleted: a.deleted + b.deleted,
    skipped: a.skipped + b.skipped,
    errors: a.errors + b.errors,
  };
}

// ─── Public run function ──────────────────────────────────────────────────────

export interface StorageOrphanCleanupResult {
  homeDocs: SweepResult;
  handoffDocs: SweepResult;
  contractorImages: SweepResult;
}

export async function runStorageOrphanCleanup(): Promise<StorageOrphanCleanupResult> {
  const gracePeriodMs = getGracePeriodMs();
  const cutoff = new Date(Date.now() - gracePeriodMs);

  logger.info(
    { gracePeriodHours: gracePeriodMs / (60 * 60 * 1000), cutoff },
    '[STORAGE-ORPHAN-CLEANUP] Starting scan across all prefixes',
  );

  const service = new ObjectStorageService();

  // Build the contractor image referenced set once and reuse it across all four
  // contractor image prefixes so we only hit the DB once.
  const contractorImagesReferenced = await buildReferencedContractorImageNames().catch((err) => {
    logger.error(
      { err },
      '[STORAGE-ORPHAN-CLEANUP] [CONTRACTOR-IMAGES] Failed to build referenced set — skipping all contractor image prefixes',
    );
    return null;
  });

  // Sweep all prefixes concurrently.
  const [homeDocs, handoffDocs, logosPublic, logosBare, photosPublic, photosBare] =
    await Promise.all([
      sweepPrefix('HOME-DOCS', HOME_DOCS_PREFIX, buildReferencedHomeDocNames, service, cutoff),
      sweepPrefix(
        'HANDOFF-DOCS',
        HANDOFF_DOCS_PREFIX,
        buildReferencedHandoffDocNames,
        service,
        cutoff,
      ),
      contractorImagesReferenced !== null
        ? sweepPrefix(
            'CONTRACTOR-LOGOS-PUBLIC',
            CONTRACTOR_IMAGES_PUBLIC_PREFIX,
            () => Promise.resolve(contractorImagesReferenced),
            service,
            cutoff,
          )
        : Promise.resolve<SweepResult>({ scanned: 0, deleted: 0, skipped: 0, errors: 1 }),
      contractorImagesReferenced !== null
        ? sweepPrefix(
            'CONTRACTOR-LOGOS-BARE',
            CONTRACTOR_IMAGES_BARE_PREFIX,
            () => Promise.resolve(contractorImagesReferenced),
            service,
            cutoff,
          )
        : Promise.resolve<SweepResult>({ scanned: 0, deleted: 0, skipped: 0, errors: 1 }),
      contractorImagesReferenced !== null
        ? sweepPrefix(
            'CONTRACTOR-PHOTOS-PUBLIC',
            CONTRACTOR_PHOTOS_PUBLIC_PREFIX,
            () => Promise.resolve(contractorImagesReferenced),
            service,
            cutoff,
          )
        : Promise.resolve<SweepResult>({ scanned: 0, deleted: 0, skipped: 0, errors: 1 }),
      contractorImagesReferenced !== null
        ? sweepPrefix(
            'CONTRACTOR-PHOTOS-BARE',
            CONTRACTOR_PHOTOS_BARE_PREFIX,
            () => Promise.resolve(contractorImagesReferenced),
            service,
            cutoff,
          )
        : Promise.resolve<SweepResult>({ scanned: 0, deleted: 0, skipped: 0, errors: 1 }),
    ]);

  const contractorImages = addResults(
    addResults(logosPublic, logosBare),
    addResults(photosPublic, photosBare),
  );

  const totals = {
    scanned: homeDocs.scanned + handoffDocs.scanned + contractorImages.scanned,
    deleted: homeDocs.deleted + handoffDocs.deleted + contractorImages.deleted,
    skipped: homeDocs.skipped + handoffDocs.skipped + contractorImages.skipped,
    errors: homeDocs.errors + handoffDocs.errors + contractorImages.errors,
  };

  logger.info(totals, '[STORAGE-ORPHAN-CLEANUP] All prefixes complete');

  return { homeDocs, handoffDocs, contractorImages };
}

// ─── Scheduler ────────────────────────────────────────────────────────────────

let schedulerInterval: NodeJS.Timeout | null = null;

function startStorageOrphanCleanupScheduler(): void {
  if (schedulerInterval) {
    logger.info('[STORAGE-ORPHAN-CLEANUP] Scheduler already running');
    return;
  }

  logger.info(
    { intervalHours: CHECK_INTERVAL_MS / (60 * 60 * 1000) },
    '[STORAGE-ORPHAN-CLEANUP] Starting storage orphan cleanup scheduler',
  );

  // Delay the first run so transient uploads at startup are not prematurely swept.
  const STARTUP_DELAY_MS = 5 * 60 * 1000;
  const startupTimer = setTimeout(() => {
    runStorageOrphanCleanup().catch((err) =>
      logger.error({ err }, '[STORAGE-ORPHAN-CLEANUP] Initial run failed'),
    );
  }, STARTUP_DELAY_MS);
  startupTimer.unref();

  schedulerInterval = setInterval(() => {
    runStorageOrphanCleanup().catch((err) =>
      logger.error({ err }, '[STORAGE-ORPHAN-CLEANUP] Scheduled run failed'),
    );
  }, CHECK_INTERVAL_MS);
}

function stopStorageOrphanCleanupScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[STORAGE-ORPHAN-CLEANUP] Scheduler stopped');
  }
}

export const storageOrphanCleanupScheduler = {
  start: startStorageOrphanCleanupScheduler,
  stop: stopStorageOrphanCleanupScheduler,
  runNow: runStorageOrphanCleanup,
};
