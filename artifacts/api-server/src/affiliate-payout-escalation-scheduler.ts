import { and, eq, isNull, lt } from 'drizzle-orm';
import { affiliatePayouts } from '@workspace/db';
import { db } from './db';
import { sendAffiliatePayoutFailureAdminAlert } from './email-service';
import { logger } from './lib/logger';

export const AFFILIATE_PAYOUT_ESCALATION_AGE_MS = 48 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000;
const STARTUP_DELAY_MS = 60 * 1000;

export async function runAffiliatePayoutEscalations(now = new Date()): Promise<{
  found: number;
  sent: number;
  failed: number;
}> {
  const cutoff = new Date(now.getTime() - AFFILIATE_PAYOUT_ESCALATION_AGE_MS);
  const candidates = await db.select().from(affiliatePayouts).where(and(
    eq(affiliatePayouts.status, 'failed'),
    lt(affiliatePayouts.createdAt, cutoff),
    isNull(affiliatePayouts.escalationAlertSentAt),
  ));

  let sent = 0;
  let failed = 0;

  for (const candidate of candidates) {
    const claimedAt = new Date();
    const [claimed] = await db.update(affiliatePayouts)
      .set({ escalationAlertSentAt: claimedAt, updatedAt: claimedAt })
      .where(and(
        eq(affiliatePayouts.id, candidate.id),
        eq(affiliatePayouts.status, 'failed'),
        isNull(affiliatePayouts.escalationAlertSentAt),
      ))
      .returning();

    if (!claimed) continue;

    try {
      const delivered = await sendAffiliatePayoutFailureAdminAlert({
        payoutId: claimed.id,
        agentId: claimed.agentId,
        amount: claimed.amount,
        failedAt: claimed.createdAt ?? cutoff,
        errorMessage: claimed.errorMessage,
      });

      if (delivered) {
        sent++;
        continue;
      }
    } catch (err) {
      logger.error({ err, payoutId: claimed.id }, '[AFFILIATE-PAYOUT-ESCALATION] Email delivery threw');
    }

    failed++;
    await db.update(affiliatePayouts)
      .set({ escalationAlertSentAt: null })
      .where(and(
        eq(affiliatePayouts.id, claimed.id),
        eq(affiliatePayouts.escalationAlertSentAt, claimedAt),
      ));
  }

  logger.info({ found: candidates.length, sent, failed }, '[AFFILIATE-PAYOUT-ESCALATION] Run complete');
  return { found: candidates.length, sent, failed };
}

let schedulerInterval: NodeJS.Timeout | null = null;
let startupTimer: NodeJS.Timeout | null = null;

function start(): void {
  if (schedulerInterval) return;

  logger.info({ intervalHours: 6 }, '[AFFILIATE-PAYOUT-ESCALATION] Starting scheduler');
  startupTimer = setTimeout(() => {
    runAffiliatePayoutEscalations().catch((err) =>
      logger.error({ err }, '[AFFILIATE-PAYOUT-ESCALATION] Initial run failed'),
    );
  }, STARTUP_DELAY_MS);
  startupTimer.unref();

  schedulerInterval = setInterval(() => {
    runAffiliatePayoutEscalations().catch((err) =>
      logger.error({ err }, '[AFFILIATE-PAYOUT-ESCALATION] Scheduled run failed'),
    );
  }, CHECK_INTERVAL_MS);
  schedulerInterval.unref();
}

function stop(): void {
  if (startupTimer) {
    clearTimeout(startupTimer);
    startupTimer = null;
  }
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}

export const affiliatePayoutEscalationScheduler = {
  start,
  stop,
  runNow: runAffiliatePayoutEscalations,
};
