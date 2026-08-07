/**
 * Monthly Referral Accrual Scheduler
 *
 * Polls daily. Each run identifies every active affiliate_referrals row whose
 * referred user is a currently-paying subscriber and for which no
 * referral_credit_ledger entry yet exists for the current calendar month
 * (accrual_period = 'YYYY-MM'), then inserts one pending credit row per
 * qualifying referral.
 *
 * Idempotency: the rcl_unique_referral_period UNIQUE constraint on
 * (referral_id, accrual_period) is the safety net against concurrent runs,
 * but the scheduler queries for what is missing FIRST and only inserts what
 * is needed — the constraint is a last-resort guard, not the primary logic.
 *
 * Applying pending credits to an actual Stripe/IAP bill is Phase 3 and is
 * NOT done here.
 */

import { db } from './db';
import { affiliateReferrals, users, referralCreditLedger } from '@workspace/db';
import { eq, ne, and, inArray } from 'drizzle-orm';
import { logger } from './lib/logger';

// ── Constants ────────────────────────────────────────────────────────────────

const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // Once per day
const STARTUP_DELAY_MS  =  5 * 60 * 1000;       // Wait 5 min after server start
const LOG_TAG = '[REFERRAL-ACCRUAL]';
const CREDIT_AMOUNT_CENTS = 100; // $1.00 flat per active referral per month

/** Mirrors the ACTIVE_STATUSES constant used throughout routes.ts. */
const ACTIVE_STATUSES = [
  'active',
  'contractor_business',
  'contractor_enterprise',
] as const;

// ── Period helper ─────────────────────────────────────────────────────────────

/** Returns the current calendar month as 'YYYY-MM'. */
function currentAccrualPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ── Result type ───────────────────────────────────────────────────────────────

export interface ReferralAccrualResult {
  accrualPeriod:          string;
  checked:                number; // total referral rows considered
  credited:               number; // credits successfully inserted this run
  skippedAlreadyCredited: number; // active referrals already credited for this period
  skippedNotActive:       number; // referred user's subscription is not active
  skippedVoided:          number; // referral.status === 'voided'
  errors:                 number; // insert failures (logged individually; run continues)
}

// ── Core logic ────────────────────────────────────────────────────────────────

export async function runReferralAccrual(): Promise<ReferralAccrualResult> {
  const accrualPeriod = currentAccrualPeriod();
  logger.info({ accrualPeriod }, `${LOG_TAG} Starting accrual run`);

  // ── Query 1: all referrals joined to their referred user's subscription status
  // Fetching everything in one pass lets us classify counts in memory without
  // additional round-trips.
  const allReferrals = await db
    .select({
      referralId:         affiliateReferrals.id,
      agentId:            affiliateReferrals.agentId,
      referralStatus:     affiliateReferrals.status,
      subscriptionStatus: users.subscriptionStatus,
    })
    .from(affiliateReferrals)
    .innerJoin(users, eq(users.id, affiliateReferrals.referredUserId));

  // Classify in memory
  const voided    = allReferrals.filter(r => r.referralStatus === 'voided');
  const nonVoided = allReferrals.filter(r => r.referralStatus !== 'voided');

  const active = nonVoided.filter(r =>
    (ACTIVE_STATUSES as readonly string[]).includes(r.subscriptionStatus ?? ''),
  );
  const skippedNotActive = nonVoided.length - active.length;

  logger.info(
    {
      accrualPeriod,
      total:           allReferrals.length,
      voided:          voided.length,
      nonVoidedActive: active.length,
      nonVoidedInactive: skippedNotActive,
    },
    `${LOG_TAG} Referral snapshot`,
  );

  // ── Query 2: which active referrals already have a credit for this period?
  // Query for what is missing FIRST; the unique constraint is only the safety net.
  let toCredit    = active;
  let skippedAlreadyCredited = 0;

  if (active.length > 0) {
    const activeIds = active.map(r => r.referralId);

    const alreadyCreditedRows = await db
      .select({ referralId: referralCreditLedger.referralId })
      .from(referralCreditLedger)
      .where(and(
        inArray(referralCreditLedger.referralId, activeIds),
        eq(referralCreditLedger.accrualPeriod, accrualPeriod),
      ));

    const alreadyCreditedSet = new Set(alreadyCreditedRows.map(r => r.referralId));
    toCredit               = active.filter(r => !alreadyCreditedSet.has(r.referralId));
    skippedAlreadyCredited = active.length - toCredit.length;

    logger.info(
      { accrualPeriod, alreadyCredited: skippedAlreadyCredited, toInsert: toCredit.length },
      `${LOG_TAG} Credit gap identified`,
    );
  }

  // ── Insert one credit row per qualifying referral ─────────────────────────
  let credited = 0;
  let errors   = 0;

  for (const referral of toCredit) {
    try {
      await db.insert(referralCreditLedger).values({
        userId:       referral.agentId,
        referralId:   referral.referralId,
        amountCents:  CREDIT_AMOUNT_CENTS,
        accrualPeriod,
        status:       'pending',
        appliedVia:   null,
      });
      credited++;
      logger.info(
        { referralId: referral.referralId, agentId: referral.agentId, accrualPeriod, amountCents: CREDIT_AMOUNT_CENTS },
        `${LOG_TAG} Credit issued`,
      );
    } catch (err: any) {
      errors++;
      // Log and continue — one failed insert must not abort the rest.
      logger.warn(
        { err: err.message, referralId: referral.referralId, accrualPeriod },
        `${LOG_TAG} Insert failed — skipping this referral`,
      );
    }
  }

  const result: ReferralAccrualResult = {
    accrualPeriod,
    checked:                allReferrals.length,
    credited,
    skippedAlreadyCredited,
    skippedNotActive,
    skippedVoided:          voided.length,
    errors,
  };

  logger.info(result, `${LOG_TAG} Run complete`);
  return result;
}

// ── Scheduler lifecycle ───────────────────────────────────────────────────────

let schedulerInterval: NodeJS.Timeout | null = null;

function startReferralAccrualScheduler(): void {
  if (schedulerInterval) {
    logger.info(`${LOG_TAG} Scheduler already running`);
    return;
  }

  logger.info(
    { intervalHours: CHECK_INTERVAL_MS / (60 * 60 * 1000), startupDelayMin: STARTUP_DELAY_MS / 60_000 },
    `${LOG_TAG} Starting scheduler`,
  );

  // Delay the first run so the server is fully warmed up and Stripe webhooks
  // from startup don't race with the accrual insert.
  const startupTimer = setTimeout(() => {
    runReferralAccrual().catch((err) =>
      logger.error({ err }, `${LOG_TAG} Initial run failed`),
    );
  }, STARTUP_DELAY_MS);
  startupTimer.unref();

  schedulerInterval = setInterval(() => {
    runReferralAccrual().catch((err) =>
      logger.error({ err }, `${LOG_TAG} Scheduled run failed`),
    );
  }, CHECK_INTERVAL_MS);
}

function stopReferralAccrualScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info(`${LOG_TAG} Scheduler stopped`);
  }
}

export const referralAccrualScheduler = {
  start:  startReferralAccrualScheduler,
  stop:   stopReferralAccrualScheduler,
  runNow: runReferralAccrual,
};
