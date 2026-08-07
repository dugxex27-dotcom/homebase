/**
 * Referral Accrual & Credit-Apply Scheduler
 *
 * Phase 1 — Accrue (runReferralAccrual):
 *   Polls daily. Identifies every active affiliate_referrals row whose referred
 *   user is a currently-paying subscriber and for which no referral_credit_ledger
 *   entry yet exists for the current calendar month (accrual_period = 'YYYY-MM'),
 *   then inserts one status='pending' credit row per qualifying referral.
 *
 * Phase 2 — Apply (applyPendingCredits):
 *   Finds all status='pending' ledger rows for Stripe-billed agents and posts a
 *   Stripe customer balance transaction (-amountCents) so the credit reduces the
 *   agent's next invoice automatically. Marks successfully applied rows as
 *   status='applied'. Apple IAP subscribers are left pending (iap_offer path is
 *   future work). Failures are logged per-row and do not abort the run.
 *
 * The daily scheduler runs both phases in sequence. Each phase is also exposed
 * via its own admin endpoint for on-demand triggering.
 *
 * Idempotency: the rcl_unique_referral_period UNIQUE constraint on
 * (referral_id, accrual_period) is the safety net for accrue; apply is
 * idempotent because it only processes status='pending' rows.
 */

import Stripe from 'stripe';
import { db } from './db';
import { affiliateReferrals, users, referralCreditLedger } from '@workspace/db';
import { eq, ne, and, inArray } from 'drizzle-orm';
import { logger } from './lib/logger';

// Module-level Stripe client — same pattern as routes.ts.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2026-04-22.dahlia' })
  : null;

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

export interface ReferralApplyResult {
  processed:         number; // pending ledger rows considered
  applied:           number; // successfully applied to Stripe
  skippedApple:      number; // subscription_source = 'apple' — iap_offer path not yet built
  skippedNoCustomer: number; // agent has no stripe_customer_id
  errors:            number; // Stripe call or DB update failed (row stays pending for next run)
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

// ── Phase 2: apply pending credits to Stripe ─────────────────────────────────

export async function applyPendingCredits(): Promise<ReferralApplyResult> {
  if (!stripe) {
    logger.warn(`${LOG_TAG} STRIPE_SECRET_KEY not configured — skipping apply-pending-credits`);
    return { processed: 0, applied: 0, skippedApple: 0, skippedNoCustomer: 0, errors: 0 };
  }

  logger.info(`${LOG_TAG} Starting apply-pending-credits run`);

  // Fetch all pending ledger rows joined to the agent user for billing info.
  // userId on the ledger is the agent_id (the person earning the referral credit).
  const pending = await db
    .select({
      id:                 referralCreditLedger.id,
      userId:             referralCreditLedger.userId,
      amountCents:        referralCreditLedger.amountCents,
      accrualPeriod:      referralCreditLedger.accrualPeriod,
      stripeCustomerId:   users.stripeCustomerId,
      subscriptionSource: users.subscriptionSource,
    })
    .from(referralCreditLedger)
    .innerJoin(users, eq(users.id, referralCreditLedger.userId))
    .where(eq(referralCreditLedger.status, 'pending'));

  logger.info({ count: pending.length }, `${LOG_TAG} Pending credit rows found`);

  let applied           = 0;
  let skippedApple      = 0;
  let skippedNoCustomer = 0;
  let errors            = 0;

  for (const row of pending) {
    // Apple IAP subscribers — iap_offer apply path is future work.
    if (row.subscriptionSource === 'apple') {
      skippedApple++;
      logger.debug(
        { ledgerId: row.id, accrualPeriod: row.accrualPeriod },
        `${LOG_TAG} Skipped — Apple subscriber (iap_offer path not yet implemented)`,
      );
      continue;
    }

    // Agent has never subscribed via Stripe (no customer record yet).
    if (!row.stripeCustomerId) {
      skippedNoCustomer++;
      logger.debug(
        { ledgerId: row.id, userId: row.userId },
        `${LOG_TAG} Skipped — no Stripe customer ID`,
      );
      continue;
    }

    try {
      // Negative amount = credit. Applies automatically to the customer's next invoice.
      const balanceTx = await stripe.customers.createBalanceTransaction(
        row.stripeCustomerId,
        {
          amount:      -(row.amountCents ?? CREDIT_AMOUNT_CENTS),
          currency:    'usd',
          description: `Referral credit — ${row.accrualPeriod}`,
          metadata: {
            referral_credit_ledger_id: row.id ?? '',
            accrual_period:            row.accrualPeriod ?? '',
          },
        },
      );

      await db
        .update(referralCreditLedger)
        .set({
          status:                     'applied',
          appliedVia:                 'stripe_balance',
          appliedAt:                  new Date(),
          stripeBalanceTransactionId: balanceTx.id,
        })
        .where(eq(referralCreditLedger.id, row.id!));

      applied++;
      logger.info(
        {
          ledgerId:        row.id,
          stripeCustomerId: row.stripeCustomerId,
          balanceTxId:     balanceTx.id,
          amountCents:     row.amountCents,
          accrualPeriod:   row.accrualPeriod,
        },
        `${LOG_TAG} Credit applied to Stripe`,
      );
    } catch (err: any) {
      errors++;
      // Row stays status='pending' — next daily run will retry it.
      logger.warn(
        { err: err.message, ledgerId: row.id, stripeCustomerId: row.stripeCustomerId, accrualPeriod: row.accrualPeriod },
        `${LOG_TAG} Stripe call failed — row stays pending for next run`,
      );
    }
  }

  const result: ReferralApplyResult = { processed: pending.length, applied, skippedApple, skippedNoCustomer, errors };
  logger.info(result, `${LOG_TAG} Apply-pending-credits run complete`);
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
    runReferralAccrual()
      .then(() => applyPendingCredits())
      .catch((err) => logger.error({ err }, `${LOG_TAG} Initial run failed`));
  }, STARTUP_DELAY_MS);
  startupTimer.unref();

  schedulerInterval = setInterval(() => {
    runReferralAccrual()
      .then(() => applyPendingCredits())
      .catch((err) => logger.error({ err }, `${LOG_TAG} Scheduled run failed`));
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
  start:             startReferralAccrualScheduler,
  stop:              stopReferralAccrualScheduler,
  runNow:            runReferralAccrual,
  applyPendingNow:   applyPendingCredits,
};
