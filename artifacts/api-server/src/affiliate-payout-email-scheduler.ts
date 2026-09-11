import { and, eq, isNull, lte, or, sql } from 'drizzle-orm';
import { affiliatePayouts, affiliateReferrals, notificationPreferences, users } from '@workspace/db';
import { db } from './db';
import { sendAffiliatePayoutProcessedEmail } from './email-service';
import { logger } from './lib/logger';
import { randomUUID } from 'crypto';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;
const CLAIM_LEASE_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 60 * 1000;
const MAX_BACKOFF_MS = 6 * 60 * 60 * 1000;

function nextAttempt(attempt: number, now: Date): Date {
  const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1));
  return new Date(now.getTime() + delay);
}

/**
 * Delivers payout confirmations only. Stripe is deliberately not imported or
 * called here: transfers are completed by the payout routes, and this worker
 * owns only the durable email outbox.
 */
export async function runAffiliatePayoutEmailDelivery(now = new Date()): Promise<{
  found: number; sent: number; skipped: number; failed: number;
}> {
  const candidates = await db.select({
    payout: affiliatePayouts,
    referral: affiliateReferrals,
    agent: users,
  }).from(affiliatePayouts)
    .innerJoin(affiliateReferrals, eq(affiliateReferrals.id, affiliatePayouts.affiliateReferralId))
    .innerJoin(users, eq(users.id, affiliatePayouts.agentId))
    .where(and(
      eq(affiliatePayouts.status, 'paid'),
      or(
        and(eq(affiliatePayouts.emailStatus, 'pending'), or(isNull(affiliatePayouts.emailNextAttemptAt), lte(affiliatePayouts.emailNextAttemptAt, now))),
        and(eq(affiliatePayouts.emailStatus, 'processing'), lte(affiliatePayouts.emailClaimLeaseUntil, now)),
      ),
    ))
    .limit(100);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const candidate of candidates) {
    const token = randomUUID();
    const leaseUntil = new Date(now.getTime() + CLAIM_LEASE_MS);
    const [claimed] = await db.update(affiliatePayouts).set({
      emailStatus: 'processing',
      emailClaimToken: token,
      emailClaimLeaseUntil: leaseUntil,
      emailAttemptCount: sql`${affiliatePayouts.emailAttemptCount} + 1`,
      updatedAt: now,
    }).where(and(
      eq(affiliatePayouts.id, candidate.payout.id),
      eq(affiliatePayouts.status, 'paid'),
      or(
        and(eq(affiliatePayouts.emailStatus, 'pending'), or(isNull(affiliatePayouts.emailNextAttemptAt), lte(affiliatePayouts.emailNextAttemptAt, now))),
        and(eq(affiliatePayouts.emailStatus, 'processing'), lte(affiliatePayouts.emailClaimLeaseUntil, now)),
      ),
    )).returning();
    if (!claimed) continue;

    // Opt-out and missing addresses are terminal and explicitly skipped.
    try {
      const [preference] = await db.select().from(notificationPreferences).where(and(
        eq(notificationPreferences.userId, candidate.payout.agentId),
        eq(notificationPreferences.notificationType, 'affiliate_payout'),
      )).limit(1);
      if (!preference?.isEnabled || !preference.channels.includes('email') || !candidate.agent.email) {
        await finish(claimed.id, token, 'skipped', now, candidate.agent.email ? 'Payout email opted out' : 'Agent has no email address');
        skipped++;
        continue;
      }

      // A process crash after the provider accepts this request but before the
      // final UPDATE can cause a lease retry. Provider-side exactly-once
      // delivery cannot be guaranteed here; the stable transfer ID is passed
      // as the existing provider/dedup key to make duplicate confirmations
      // unlikely, while the lease and conditional final UPDATE protect DB
      // ownership.
      const delivered = await sendAffiliatePayoutProcessedEmail({
        agentId: candidate.payout.agentId,
        referredUserId: candidate.referral.referredUserId,
        referredUserRole: candidate.referral.referredUserRole,
        amount: candidate.payout.amount,
        transferId: candidate.payout.stripeTransferId ?? candidate.payout.id,
      });
      if (delivered) {
        await finish(claimed.id, token, 'sent', now, null);
        sent++;
      } else {
        throw new Error('SendGrid did not accept payout confirmation');
      }
    } catch (error: any) {
      const attempt = claimed.emailAttemptCount;
      const terminal = attempt >= MAX_ATTEMPTS;
      const errorText = error?.message || 'Payout confirmation email failed';
      await db.update(affiliatePayouts).set({
        emailStatus: terminal ? 'permanently_failed' : 'pending',
        emailNextAttemptAt: terminal ? null : nextAttempt(attempt, now),
        emailLastError: errorText,
        emailClaimToken: null,
        emailClaimLeaseUntil: null,
        updatedAt: now,
      }).where(and(eq(affiliatePayouts.id, claimed.id), eq(affiliatePayouts.emailClaimToken, token)));
      failed++;
      logger.error({ err: error, payoutId: claimed.id, attempt }, '[AFFILIATE-PAYOUT-EMAIL] Delivery failed');
    }
  }
  return { found: candidates.length, sent, skipped, failed };
}

async function finish(id: string, token: string, status: 'sent' | 'skipped', now: Date, detail: string | null) {
  await db.update(affiliatePayouts).set({
    emailStatus: status,
    emailSentAt: now,
    emailNextAttemptAt: null,
    emailLastError: detail,
    emailClaimToken: null,
    emailClaimLeaseUntil: null,
    updatedAt: now,
  }).where(and(eq(affiliatePayouts.id, id), eq(affiliatePayouts.emailClaimToken, token)));
}

let interval: NodeJS.Timeout | null = null;
function start() {
  if (interval) return;
  interval = setInterval(() => runAffiliatePayoutEmailDelivery().catch((err) =>
    logger.error({ err }, '[AFFILIATE-PAYOUT-EMAIL] Scheduled run failed')), CHECK_INTERVAL_MS);
  interval.unref();
  runAffiliatePayoutEmailDelivery().catch((err) =>
    logger.error({ err }, '[AFFILIATE-PAYOUT-EMAIL] Initial run failed'));
}
function stop() {
  if (interval) clearInterval(interval);
  interval = null;
}

export const affiliatePayoutEmailScheduler = {
  start,
  stop,
  runNow: runAffiliatePayoutEmailDelivery,
};