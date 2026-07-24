import { db } from './db';
import { maintenanceLogs, fraudReviewQueue } from '@workspace/db';
import { eq, and, gte, sql, inArray } from 'drizzle-orm';
import { logger } from './lib/logger';
import { isDemoId } from './storage';

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Daily
const DAILY_COMPLETION_THRESHOLD = 10; // Flag if >10 tasks completed in one calendar day

async function runFraudPatternCheck() {
  const now = new Date();
  const hour = now.getHours();
  if (hour !== 2) return; // Run at 2 AM only

  logger.info('[FRAUD-SCHEDULER] Starting nightly fraud pattern check...');

  try {
    // ── 1. Excessive daily completions check ──────────────────────────────────
    // Find any homeowner who completed more than DAILY_COMPLETION_THRESHOLD
    // maintenance tasks in a single calendar day within the past 7 days.
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const excessiveRows = await db.execute<{
      homeowner_id: string;
      completion_day: string;
      completion_count: number;
    }>(sql`
      SELECT
        homeowner_id,
        date_trunc('day', created_at)::text AS completion_day,
        COUNT(*) AS completion_count
      FROM maintenance_logs
      WHERE created_at >= ${sevenDaysAgo}
      GROUP BY homeowner_id, date_trunc('day', created_at)
      HAVING COUNT(*) > ${DAILY_COMPLETION_THRESHOLD}
    `);

    for (const row of excessiveRows.rows) {
      if (isDemoId(row.homeowner_id)) continue;

      // Avoid inserting duplicate flags for the same homeowner + day
      const existing = await db.execute<{ count: number }>(sql`
        SELECT COUNT(*) AS count FROM fraud_review_queue
        WHERE homeowner_id = ${row.homeowner_id}
          AND flag_type = 'excessive_daily_completions'
          AND (details->>'completion_day') = ${row.completion_day}
          AND reviewed = false
      `);

      if ((existing.rows[0]?.count ?? 0) > 0) continue;

      await db.insert(fraudReviewQueue).values({
        homeownerId: row.homeowner_id,
        flagType: 'excessive_daily_completions',
        details: {
          completion_day: row.completion_day,
          completion_count: Number(row.completion_count),
          threshold: DAILY_COMPLETION_THRESHOLD,
        },
      });

      logger.warn(
        { homeownerId: row.homeowner_id, day: row.completion_day, count: row.completion_count },
        '[FRAUD-SCHEDULER] Flagged excessive daily completions',
      );
    }

    // ── 2. Duplicate photo hash check ─────────────────────────────────────────
    // Find homeowners whose before_photo_hashes or after_photo_hashes arrays
    // contain a hash that appears in more than one maintenance log.
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const dupHashRows = await db.execute<{
      homeowner_id: string;
      dup_hash: string;
      log_count: number;
    }>(sql`
      WITH flattened AS (
        SELECT homeowner_id, unnest(before_photo_hashes) AS hash FROM maintenance_logs
          WHERE created_at >= ${thirtyDaysAgo} AND array_length(before_photo_hashes, 1) > 0
        UNION ALL
        SELECT homeowner_id, unnest(after_photo_hashes) AS hash FROM maintenance_logs
          WHERE created_at >= ${thirtyDaysAgo} AND array_length(after_photo_hashes, 1) > 0
      )
      SELECT homeowner_id, hash AS dup_hash, COUNT(DISTINCT ctid) AS log_count
      FROM (
        SELECT homeowner_id, hash,
          ROW_NUMBER() OVER (PARTITION BY homeowner_id, hash ORDER BY hash) AS rn
        FROM flattened
      ) sub
      GROUP BY homeowner_id, hash
      HAVING COUNT(*) > 1
    `);

    for (const row of dupHashRows.rows) {
      if (isDemoId(row.homeowner_id)) continue;

      const existing = await db.execute<{ count: number }>(sql`
        SELECT COUNT(*) AS count FROM fraud_review_queue
        WHERE homeowner_id = ${row.homeowner_id}
          AND flag_type = 'duplicate_photos'
          AND (details->>'dup_hash') = ${row.dup_hash}
          AND reviewed = false
      `);

      if ((existing.rows[0]?.count ?? 0) > 0) continue;

      await db.insert(fraudReviewQueue).values({
        homeownerId: row.homeowner_id,
        flagType: 'duplicate_photos',
        details: {
          dup_hash: row.dup_hash,
          log_count: Number(row.log_count),
          window_days: 30,
        },
      });

      logger.warn(
        { homeownerId: row.homeowner_id, hash: row.dup_hash, count: row.log_count },
        '[FRAUD-SCHEDULER] Flagged duplicate photo hash',
      );
    }

    logger.info('[FRAUD-SCHEDULER] Nightly fraud pattern check complete.');
  } catch (error) {
    logger.error({ err: error }, '[FRAUD-SCHEDULER] Error running fraud pattern check');
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startFraudScheduler() {
  if (schedulerInterval) {
    logger.info('[FRAUD-SCHEDULER] Scheduler already running');
    return;
  }
  logger.info('[FRAUD-SCHEDULER] Starting fraud pattern scheduler');
  runFraudPatternCheck();
  schedulerInterval = setInterval(runFraudPatternCheck, CHECK_INTERVAL_MS);
}

export function stopFraudScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[FRAUD-SCHEDULER] Scheduler stopped');
  }
}

export const fraudScheduler = {
  start: startFraudScheduler,
  stop: stopFraudScheduler,
  checkNow: runFraudPatternCheck,
};
