import { storage } from './storage';
import { logger } from './lib/logger';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Run every hour

export async function runBoostExpiryCleanup(): Promise<{ expired: number }> {
  logger.info('[BOOST-EXPIRY] Starting stale boost expiry run');

  try {
    const { expired } = await storage.expireStaleBoosts();
    if (expired > 0) {
      logger.info({ expired }, '[BOOST-EXPIRY] Marked expired boosts inactive');
    } else {
      logger.info('[BOOST-EXPIRY] No stale boosts found');
    }
    return { expired };
  } catch (err) {
    logger.error({ err }, '[BOOST-EXPIRY] Run failed');
    throw err;
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

function startBoostExpiryScheduler(): void {
  if (schedulerInterval) {
    logger.info('[BOOST-EXPIRY] Scheduler already running');
    return;
  }

  logger.info(
    { intervalHours: CHECK_INTERVAL_MS / (60 * 60 * 1000) },
    '[BOOST-EXPIRY] Starting boost expiry scheduler',
  );

  // Run immediately on startup to clean up any boosts that expired while
  // the server was down, then repeat on the configured interval.
  runBoostExpiryCleanup().catch((err) =>
    logger.error({ err }, '[BOOST-EXPIRY] Initial run failed'),
  );

  schedulerInterval = setInterval(() => {
    runBoostExpiryCleanup().catch((err) =>
      logger.error({ err }, '[BOOST-EXPIRY] Scheduled run failed'),
    );
  }, CHECK_INTERVAL_MS);
}

function stopBoostExpiryScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[BOOST-EXPIRY] Scheduler stopped');
  }
}

export const boostExpiryScheduler = {
  start: startBoostExpiryScheduler,
  stop: stopBoostExpiryScheduler,
  runNow: runBoostExpiryCleanup,
};
