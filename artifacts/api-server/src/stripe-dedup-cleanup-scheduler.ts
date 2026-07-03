import { logger } from "./lib/logger";
import { storage } from "./storage";

// Must stay ≥ 72 h — Stripe's maximum event-retry window.  A shorter TTL
// would allow a late Stripe retry to pass the duplicate check and be
// processed a second time.  96 h gives a comfortable safety margin.
const TTL_HOURS = 96;
const INTERVAL_MS = 24 * 60 * 60 * 1000;

// Alert threshold: warn if more than this many rows remain after pruning.
// With a 96-hour TTL, normal traffic produces at most a few hundred rows.
// Exceeding 1 000 rows signals that pruning has been silently failing or
// that webhook volume has spiked unexpectedly.
export const STRIPE_DEDUP_ROW_WARN_THRESHOLD = 1_000;

async function pruneStripeDedupTable(): Promise<void> {
  logger.info("[STRIPE-DEDUP] Running daily cleanup of stripe_processed_events...");
  try {
    // First, promote any lingering stale 'pending' rows (server crashed before processAction
    // ran, and no later retry ever superseded them) to a terminal 'failed' status. This keeps
    // the table easy to reason about and ensures a legitimate retry is never permanently
    // blocked by a row that outlived the staleness window but was never cleaned up.
    const { updated } = await storage.failStaleStripePendingEvents();
    if (updated > 0) {
      logger.info(
        { updated },
        `[STRIPE-DEDUP] Marked ${updated} stale pending event(s) as failed`
      );
    }

    const { deleted, remaining } = await storage.pruneOldStripeProcessedEvents(TTL_HOURS);
    logger.info(
      { deleted, remaining },
      `[STRIPE-DEDUP] Cleanup complete — removed ${deleted} events older than ${TTL_HOURS}h; ${remaining} rows remain`
    );
    if (remaining > STRIPE_DEDUP_ROW_WARN_THRESHOLD) {
      logger.warn(
        { remaining, threshold: STRIPE_DEDUP_ROW_WARN_THRESHOLD },
        "[STRIPE-DEDUP] stripe_processed_events row count exceeds warning threshold after prune — pruning may be failing or webhook volume has spiked unexpectedly"
      );
    }
  } catch (err) {
    logger.error({ err }, "[STRIPE-DEDUP] Failed to prune stripe_processed_events");
  }
}

export const stripeDedupCleanupScheduler = {
  start() {
    logger.info("[STRIPE-DEDUP] Stripe dedup cleanup scheduler started (24-hour interval)");

    setTimeout(() => {
      pruneStripeDedupTable().catch((err) =>
        logger.error({ err }, "[STRIPE-DEDUP] Initial prune failed")
      );
    }, 60 * 1000);

    setInterval(() => {
      pruneStripeDedupTable().catch((err) =>
        logger.error({ err }, "[STRIPE-DEDUP] Scheduled prune failed")
      );
    }, INTERVAL_MS);
  },
};
