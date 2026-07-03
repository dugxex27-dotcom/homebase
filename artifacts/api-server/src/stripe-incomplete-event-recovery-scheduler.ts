import { logger } from "./lib/logger";
import { recoverIncompleteStripeEvents } from "./routes/routes";

// How stale an incomplete event must be before we attempt recovery. Kept
// short (relative to the 96h dedup TTL) so a crashed webhook handler doesn't
// leave subscription activation / referral credits stuck for long, while
// still giving an in-flight request a reasonable window to finish normally.
const OLDER_THAN_MINUTES = 15;
const INTERVAL_MS = 10 * 60 * 1000; // run every 10 minutes

async function runRecoveryScan(): Promise<void> {
  try {
    const results = await recoverIncompleteStripeEvents(OLDER_THAN_MINUTES);
    if (results.length === 0) {
      return;
    }

    const recovered = results.filter((r) => r.outcome === "recovered").length;
    const failed = results.filter((r) => r.outcome === "failed").length;
    const missing = results.filter((r) => r.outcome === "not_found_in_stripe").length;

    logger.warn(
      { total: results.length, recovered, failed, missing },
      "[STRIPE-RECOVERY] Incomplete Stripe webhook event recovery scan finished",
    );

    if (failed > 0 || missing > 0) {
      logger.error(
        { failed, missing, results: results.filter((r) => r.outcome !== "recovered") },
        "[STRIPE-RECOVERY] Some incomplete Stripe events could not be auto-recovered — operator attention required",
      );
    }
  } catch (err) {
    logger.error({ err }, "[STRIPE-RECOVERY] Recovery scan failed");
  }
}

export const stripeIncompleteEventRecoveryScheduler = {
  start() {
    logger.info(
      { intervalMinutes: INTERVAL_MS / 60_000, olderThanMinutes: OLDER_THAN_MINUTES },
      "[STRIPE-RECOVERY] Incomplete Stripe event recovery scheduler started",
    );

    setTimeout(() => {
      runRecoveryScan();
    }, 60 * 1000);

    setInterval(() => {
      runRecoveryScan();
    }, INTERVAL_MS);
  },
};
