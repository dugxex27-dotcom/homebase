import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, type IStorage } from "../storage";
import { setupAuth, isAuthenticated, requireRole, requirePropertyOwner, suspendedUserIds, invalidateUserSessions, requireCompanyRole, requireCompanyRoleAny, requireDivisionAccess, requireBulkImport, requireApiAccess, requireNotSuspended, requireSameCompany, isOAuthUserSuspended } from "../replitAuth";
import { setupGoogleAuth } from "../googleAuth";
import { z } from "zod";
import { randomUUID, randomBytes } from "crypto";
import rateLimit from "express-rate-limit";
import { eq, and, ne, inArray, sql as drizzleSql, isNotNull, isNull, desc, or, gt, gte, lte } from "drizzle-orm";
import { insertHomeApplianceSchema, insertHomeApplianceManualSchema, insertMaintenanceLogSchema, insertContractorAppointmentSchema, insertConversationSchema, insertMessageSchema, insertContractorReviewSchema, insertCustomMaintenanceTaskSchema, insertProposalSchema, insertHomeSystemSchema, insertContractorBoostSchema, insertHouseSchema, insertHouseTransferSchema, insertContractorAnalyticsSchema, insertTaskOverrideSchema, insertTaskCompletionSchema, insertCompanySchema, insertCompanyInviteCodeSchema, updateHouseholdProfileSchema, passwordResetTokens, taskCompletions, customMaintenanceTasks, insertSupportTicketSchema, completeTaskSchema, insertCrmClientSchema, insertCrmJobSchema, insertCrmQuoteSchema, insertCrmInvoiceSchema, insertCrmLeadSchema, insertCrmNoteSchema, notificationPreferences, subscriptionPlans, securitySessions, referralCredits, referralFreeMonths, agentProfiles, users, siteContent, maintenanceLogs, homeAppliances, homeSystems, houses, taskOverrides, homeHandoffPackages, handoffDocuments, serviceRecords, contractorReviews, reviewRequests, insertReviewRequestSchema, insertReviewFlagSchema, homeDocuments, quizResults, type House } from "@workspace/db";
import { calculateDIYSavingsAmount } from "../shared/cost-helpers";
import { calculateMechanicalDocumentationBonus } from "../shared/maintenance-scheduler";
import { invoiceOrphanCleanupScheduler } from "../invoice-orphan-cleanup-scheduler";
import { extractInvoiceData, verifyDIYPhotos, type InvoiceExtraction } from "../invoice-analysis-service";
import { invoiceAnalyses, contractorBoosts, affiliateReferrals, subscriptionCycleEvents, contractorInvoiceUploads, companies, proposals, securityAuditLogs, companyDivisions, companyBulkImports, insertCompanyDivisionSchema, conversations, messages } from "@workspace/db";
import pushRoutes from "../push-routes";
import { pushService } from "../push-service";
import { ObjectStorageService, ObjectNotFoundError } from "../objectStorage";
import { pool, db } from "../db";
import OpenAI from "openai";
import multer from "multer";
import Stripe from "stripe";
import { geocodeAddress, calculateDistance } from "../geocoding-service";
import { auditLogger, sessionManager, AuditEventTypes } from "../security-audit";
import { smsService } from "../sms-service";
import { notificationOrchestrator } from "../notification-orchestrator";
import { sendEmail, emailService, sendCheckoutFailureEmail } from "../email-service";
import { verifyAndActivateAppleTransaction, handleAppleServerNotification, AppleIapError } from "../apple-iap";
import { lookupByHIN } from "../hin-service";
import { seedHomeownerDemo, seedContractorDemo, seedAgentDemo, topUpHomeownerTaskCompletions } from "../demo-seeder";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2026-04-22.dahlia" })
  : null;

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

// Larger multer instance for document vault uploads (50MB)
const uploadDocument = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    user?: any;
    isAuthenticated?: boolean;
  }
}

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Temporarily increased for testing
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

// Rate limiting for the public quiz-result endpoint
const quizLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 submissions per IP per 15 minutes
  message: 'Too many quiz submissions, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Grandfathered emails that get free unlimited access forever
const GRANDFATHERED_EMAILS = (process.env.GRANDFATHERED_EMAILS || 'lihandyman2008@gmail.com,bryanmendezdesign@gmail.com,freshandcleangutters@gmail.com').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

// Middleware to check homeowner subscription for paid features
const requireHomeownerSubscription = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Skip check for non-homeowners (they have different restrictions)
    if (user.role !== 'homeowner') {
      return next();
    }
    
    // Demo accounts get unlimited access - check for demo-homeowner prefix or demo email patterns
    if (userId.startsWith('demo-homeowner') || user.email?.includes('demo@homeowner') || user.email?.includes('@homebase.com')) {
      return next();
    }
    
    // Check if grandfathered - free unlimited access
    const isGrandfathered = user.email && GRANDFATHERED_EMAILS.includes(user.email.toLowerCase());
    if (isGrandfathered || user.subscriptionStatus === 'grandfathered') {
      return next();
    }
    
    // Check if active subscription
    if (user.subscriptionStatus === 'active') {
      return next();
    }
    
    // Check if still in trial
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
      const trialEnd = new Date(user.trialEndsAt);
      if (trialEnd > new Date()) {
        return next(); // Still in trial
      }
    }
    
    // Trial expired or no subscription - block access to paid features
    return res.status(403).json({ 
      message: 'Subscription required', 
      code: 'SUBSCRIPTION_REQUIRED',
      detail: 'Your free trial has ended. Please subscribe to access this feature.'
    });
  } catch (error) {
    console.error('[SUBSCRIPTION CHECK] Error:', error);
    return res.status(500).json({ message: 'Failed to verify subscription' });
  }
};

// Middleware to check contractor subscription for paid features
const requireContractorSubscription = async (req: any, res: any, next: any) => {
  try {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    const userId = req.session.user.id;
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    
    // Skip check for non-contractors
    if (user.role !== 'contractor') {
      return next();
    }
    
    // Check if grandfathered - free unlimited access
    const isGrandfathered = user.email && GRANDFATHERED_EMAILS.includes(user.email.toLowerCase());
    if (isGrandfathered || user.subscriptionStatus === 'grandfathered') {
      return next();
    }
    
    // Check if active subscription (any paid tier passes)
    const ACTIVE_STATUSES = ['active', 'contractor_business', 'contractor_enterprise'];
    if (ACTIVE_STATUSES.includes(user.subscriptionStatus ?? '')) {
      return next();
    }

    // Check if still in trial
    if (user.subscriptionStatus === 'trialing' && user.trialEndsAt) {
      const trialEnd = new Date(user.trialEndsAt);
      if (trialEnd > new Date()) {
        return next(); // Still in trial
      }
    }

    // Lazily attach companyTier to session if missing (Phase 2.5)
    if (user.companyId && !req.session.user?.companyTier) {
      try {
        const company = await storage.getCompany(user.companyId);
        if (company) {
          req.session.user = { ...req.session.user, companyTier: company.tier };
        }
      } catch { /* non-fatal */ }
    }

    // Trial expired or no subscription — contractors have NO free features
    return res.status(403).json({ 
      message: 'Subscription required', 
      code: 'SUBSCRIPTION_REQUIRED',
      detail: 'Your free trial has ended. Contractors must subscribe to access HomeBase features.'
    });
  } catch (error) {
    console.error('[CONTRACTOR SUBSCRIPTION CHECK] Error:', error);
    return res.status(500).json({ message: 'Failed to verify subscription' });
  }
};

// Rate limiting for file uploads to prevent disk exhaustion
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 uploads per hour per IP
  message: 'Too many upload attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting for AI support chat to prevent cost amplification
const aiChatLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Max 20 AI queries per hour per IP
  message: 'Too many AI chat requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Guard for the diy-verify serialization path.
 *
 * Returns an error descriptor if the analysis has already been verified
 * (meaning the concurrent winner already committed), or null if the caller
 * may proceed with the update.
 *
 * Accepts both camelCase (Drizzle typed result) and snake_case (raw SQL row)
 * field names so it works both in tests and inside the SELECT FOR UPDATE path.
 *
 * Exported for unit tests only.
 */
export function checkDiyVerifyGuard(
  analysis: { diy_verified?: boolean | null; diyVerified?: boolean | null },
): { status: number; message: string; code: string } | null {
  const verified = analysis.diy_verified ?? analysis.diyVerified ?? false;
  if (verified) {
    return {
      status: 409,
      message: "DIY work has already been verified. Photos cannot be changed after verification passes.",
      code: "ALREADY_VERIFIED",
    };
  }
  return null;
}

/**
 * Guard for the photo-count requirement inside the diy-verify transaction.
 *
 * Called after SELECT … FOR UPDATE so the counts reflect the row's CURRENT
 * state (locked), not the stale snapshot read before the transaction started.
 *
 * Returns an error descriptor when the merged photo set (existing persisted
 * URLs from the locked row + URLs just uploaded for this request) is missing
 * at least one before photo OR at least one after photo.  Returns null if the
 * caller may proceed with the update.
 *
 * Exported for unit tests only.
 */
/** Maximum total photos (before + after + receipts) allowed on a single analysis row. */
export const MAX_PHOTOS_PER_ANALYSIS = 30;

export function checkPhotoCountGuard(
  lockedBefore: string[],
  lockedAfter: string[],
  newBefore: string[],
  newAfter: string[],
  lockedReceipts: string[] = [],
  newReceipts: string[] = [],
): { status: number; message: string; code: string } | null {
  const totalBefore = lockedBefore.length + newBefore.length;
  const totalAfter = lockedAfter.length + newAfter.length;
  if (totalBefore === 0 || totalAfter === 0) {
    return {
      status: 400,
      message: "Please provide at least one before photo AND one after photo to verify your DIY work.",
      code: "MISSING_PHOTOS",
    };
  }
  const totalReceipts = lockedReceipts.length + newReceipts.length;
  const grandTotal = totalBefore + totalAfter + totalReceipts;
  if (grandTotal > MAX_PHOTOS_PER_ANALYSIS) {
    return {
      status: 400,
      message: `This analysis has reached the maximum of ${MAX_PHOTOS_PER_ANALYSIS} photos. Remove existing photos before adding more.`,
      code: "TOO_MANY_PHOTOS",
    };
  }
  return null;
}
// Internal ref wired by registerRoutes so recoverIncompleteStripeEvents can re-run side effects.
let _processStripeEventSideEffectsRef: ((event: Stripe.Event) => Promise<void>) | null = null;

/**
 * Background recovery: re-fetch events that were durably recorded as 'pending'
 * (side effects started) but never marked 'committed' (e.g. process crashed mid-handler).
 * Called by the scheduler; safe to call concurrently.
 */
export async function recoverIncompleteStripeEvents(olderThanMinutes: number): Promise<Array<{
  eventId: string;
  processedAt: Date;
  outcome: "recovered" | "not_found_in_stripe" | "failed";
  error?: string;
}>> {
  const currentStripe = stripe;
  const incompleteEvents = await storage.getIncompleteStripeProcessedEvents(olderThanMinutes);
  if (!incompleteEvents.length) return [];

  const results: Array<{
    eventId: string;
    processedAt: Date;
    outcome: "recovered" | "not_found_in_stripe" | "failed";
    error?: string;
  }> = [];

  for (const { eventId, processedAt } of incompleteEvents) {
    try {
      if (!currentStripe) throw new Error("Stripe not configured");
      const event = await currentStripe.events.retrieve(eventId);
      if (_processStripeEventSideEffectsRef) {
        await _processStripeEventSideEffectsRef(event);
      }
      await storage.markStripeEventCommitted(eventId);
      results.push({ eventId, processedAt, outcome: "recovered" });
    } catch (err: any) {
      if (err.code === "resource_missing") {
        results.push({ eventId, processedAt, outcome: "not_found_in_stripe", error: err.message });
      } else {
        results.push({ eventId, processedAt, outcome: "failed", error: err.message });
      }
    }
  }

  return results;
}

// ============================================================================
// Exported pure helpers and DB functions (tested in routes.test.ts)
// ============================================================================

// ---------------------------------------------------------------------------
// Seat billing helpers
// ---------------------------------------------------------------------------

export function calcBilledSeats(totalSeats: number): number {
  return Math.max(0, totalSeats - 2);
}

export async function countActiveCompanySeats(
  companyId: string,
  dbInstance: any,
): Promise<number> {
  const rows = await dbInstance
    .select({ count: drizzleSql<number>`count(*)::int` })
    .from(users)
    .where(and(eq(users.companyId, companyId), ne(users.status as any, 'removed')));
  return rows[0]?.count ?? 1;
}

export async function updateMeteredSeats(
  companyId: string,
  items: Array<{ id: string; price?: { recurring?: { usage_type?: string } } }>,
  getActiveUserCount: (companyId: string) => Promise<number>,
  createUsageRecord: (itemId: string, quantity: number) => Promise<void>,
): Promise<void> {
  const meteredItem = items.find(
    item => item.price?.recurring?.usage_type === 'metered',
  );
  if (!meteredItem) return;

  const totalSeats = await getActiveUserCount(companyId);
  const billedSeats = calcBilledSeats(totalSeats);
  await createUsageRecord(meteredItem.id, billedSeats);
}

// ---------------------------------------------------------------------------
// Webhook idempotency cache
// ---------------------------------------------------------------------------

export const MAX_WEBHOOK_DEDUP_CACHE_SIZE = 10_000;
export const processedWebhookEventIds = new Map<string, number>();
export const inFlightWebhookEventIds = new Set<string>();

export function enforceWebhookDedupCacheCap(
  cache: Map<string, number> = processedWebhookEventIds,
  cap: number = MAX_WEBHOOK_DEDUP_CACHE_SIZE,
): void {
  while (cache.size >= cap) {
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
    else break;
  }
}

// ---------------------------------------------------------------------------
// resolveMeteredSeatCount — pure: billing stops on cancellation / past_due
// ---------------------------------------------------------------------------

export function resolveMeteredSeatCount(
  status: string,
  totalSeats: number,
): number {
  if (status === 'canceled' || status === 'past_due') return 0;
  return calcBilledSeats(totalSeats);
}

// ---------------------------------------------------------------------------
// DB advisory lock — cross-process seat-update serialization
// ---------------------------------------------------------------------------

export type PgPoolLike = {
  connect: () => Promise<{
    query: (sql: string, params?: unknown[]) => Promise<unknown>;
    release: () => void;
  }>;
};

/** FNV-1a 32-bit hash of companyId → non-negative 31-bit int for pg_advisory_lock */
export function companyIdToAdvisoryLockKey(companyId: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < companyId.length; i++) {
    hash ^= companyId.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash & 0x7fffffff;
}

export async function withDbAdvisoryLock<T>(
  lockKey: number,
  pgPool: PgPoolLike,
  fn: () => Promise<T>,
): Promise<T> {
  const client = await pgPool.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1)', [lockKey]);
    try {
      return await fn();
    } finally {
      await client.query('SELECT pg_advisory_unlock($1)', [lockKey]);
    }
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// In-process seat-update lock (fast path) + optional DB advisory lock
// ---------------------------------------------------------------------------

export const seatUpdateLocks = new Map<string, Promise<unknown>>();

export async function withSeatUpdateLock<T>(
  companyId: string,
  fn: () => Promise<T>,
  pgPool?: PgPoolLike,
): Promise<T> {
  const existing = seatUpdateLocks.get(companyId);
  if (existing) await existing;

  let resolveInner!: (v: unknown) => void;
  const lockPromise = new Promise<unknown>(resolve => { resolveInner = resolve; });
  seatUpdateLocks.set(companyId, lockPromise);

  try {
    if (pgPool) {
      const lockKey = companyIdToAdvisoryLockKey(companyId);
      return await withDbAdvisoryLock(lockKey, pgPool, fn);
    }
    return await fn();
  } finally {
    resolveInner(undefined);
    seatUpdateLocks.delete(companyId);
  }
}

// ---------------------------------------------------------------------------
// refreshSeatsForCompany — immediate seat correction on member removal
// ---------------------------------------------------------------------------

/**
 * Immediately update metered seat usage for a company after a member change.
 * No-ops if Stripe is not configured or the company has no active subscription.
 *
 * If `storageInstance` is provided, a durable checkpoint is written to the DB
 * before the Stripe API call and cleared on success.  This ensures a server
 * restart mid-update can detect the un-confirmed sync and re-run it.
 */
export async function refreshSeatsForCompany(
  companyId: string,
  stripeClient: any,
  dbInstance: any,
  getActiveUserCount: (companyId: string) => Promise<number>,
  storageInstance?: Pick<IStorage, "upsertPendingSeatSync" | "deletePendingSeatSync">,
  pgPool?: PgPoolLike,
): Promise<void> {
  if (!stripeClient) return;

  return withSeatUpdateLock(companyId, async () => {
    const ownerRows = await dbInstance
      .select({ stripeSubscriptionId: users.stripeSubscriptionId })
      .from(users)
      .where(and(eq(users.companyId, companyId), eq(users.companyRole as any, 'owner')))
      .limit(1);

    const stripeSubscriptionId = ownerRows[0]?.stripeSubscriptionId;
    if (!stripeSubscriptionId) {
      // No active subscription — nothing to sync; clear any stale checkpoint.
      await storageInstance?.deletePendingSeatSync(companyId);
      return;
    }

    // Write checkpoint BEFORE the first Stripe interaction so any crash
    // between now and the createUsageRecord call is visible at startup.
    await storageInstance?.upsertPendingSeatSync(companyId);

    const subscription = await stripeClient.subscriptions.retrieve(stripeSubscriptionId);
    if (subscription.status !== 'active') {
      // Subscription is not billable — nothing to sync; clear the checkpoint.
      await storageInstance?.deletePendingSeatSync(companyId);
      return;
    }

    const items: Array<{ id: string; price?: { recurring?: { usage_type?: string } } }> =
      subscription.items?.data ?? [];

    await updateMeteredSeats(
      companyId,
      items,
      getActiveUserCount,
      async (itemId: string, quantity: number) => {
        await stripeClient.subscriptionItems.createUsageRecord(itemId, {
          quantity,
          action: 'set',
        });
      },
    );

    // Stripe updated successfully — remove the checkpoint.
    await storageInstance?.deletePendingSeatSync(companyId);
  }, pgPool);
}

/**
 * Startup recovery: re-runs the seat sync for any company whose previous
 * update was interrupted (checkpoint row left in `pending_seat_syncs`).
 *
 * Safe to call multiple times; each company is locked via `withSeatUpdateLock`
 * so a concurrent in-flight call cannot interleave.
 */
export async function recoverPendingSeatSyncs(
  storageInstance: Pick<IStorage, "getPendingSeatSyncs" | "upsertPendingSeatSync" | "deletePendingSeatSync"> = storage,
  stripeClient: any = stripe,
  dbInstance: any = db,
): Promise<{ recovered: string[]; failed: Array<{ companyId: string; error: string }> }> {
  const companyIds = await storageInstance.getPendingSeatSyncs();
  if (companyIds.length === 0) return { recovered: [], failed: [] };

  const errors = new Map<string, string>();

  for (const companyId of companyIds) {
    try {
      await refreshSeatsForCompany(
        companyId,
        stripeClient,
        dbInstance,
        (cid) => countActiveCompanySeats(cid, dbInstance),
        storageInstance,
      );
    } catch (err: any) {
      errors.set(companyId, err?.message ?? String(err));
    }
  }

  // Determine which rows were actually cleared by the sync attempt.
  // A company is only truly recovered when its pending row is gone.
  const remainingIds = new Set(await storageInstance.getPendingSeatSyncs());

  const recovered: string[] = [];
  const failed: Array<{ companyId: string; error: string }> = [];

  for (const companyId of companyIds) {
    const err = errors.get(companyId);
    if (err) {
      failed.push({ companyId, error: err });
    } else if (remainingIds.has(companyId)) {
      // No exception, but the row is still present — Stripe is not configured
      // or the company has no active metered subscription to sync.
      failed.push({
        companyId,
        error: "no active metered subscription or Stripe not configured",
      });
    } else {
      recovered.push(companyId);
    }
  }

  return { recovered, failed };
}

// ---------------------------------------------------------------------------
// updateMeteredSeatsForSubscription — webhook path
// ---------------------------------------------------------------------------

export async function updateMeteredSeatsForSubscription(
  subscription: any,
  companyId: string,
  stripeClient: any,
  dbInstance?: any,
  isReactivation?: boolean,
  eventId?: string,
  storageInstance?: Pick<IStorage, "upsertPendingSeatSync" | "deletePendingSeatSync">,
  pgPool?: PgPoolLike,
): Promise<number | null> {
  const items: Array<{ id: string; price?: { recurring?: { usage_type?: string } } }> =
    subscription.items?.data ?? [];
  const meteredItem = items.find(
    item => item.price?.recurring?.usage_type === 'metered',
  );
  if (!meteredItem) return null;

  if (isReactivation) return null;

  const status: string = subscription.status;

  let seatCount: number;
  if (status === 'canceled' || status === 'past_due') {
    seatCount = 0;
  } else {
    const dbInst = dbInstance ?? db;
    const totalSeats = await countActiveCompanySeats(companyId, dbInst);
    seatCount = calcBilledSeats(totalSeats);
  }

  return withSeatUpdateLock(companyId, async () => {
    // Write checkpoint before calling Stripe so a crash here is recoverable.
    await storageInstance?.upsertPendingSeatSync(companyId);

    if (eventId) {
      await stripeClient.subscriptionItems.createUsageRecord(
        meteredItem.id,
        { quantity: seatCount, action: 'set' },
        { idempotencyKey: `${eventId}-seats-${companyId}` },
      );
    } else {
      await stripeClient.subscriptionItems.createUsageRecord(
        meteredItem.id,
        { quantity: seatCount, action: 'set' },
      );
    }

    // Stripe updated — clear the checkpoint.
    await storageInstance?.deletePendingSeatSync(companyId);

    return seatCount;
  }, pgPool);
}

// ---------------------------------------------------------------------------
// Team-management guard helpers
// ---------------------------------------------------------------------------

export function checkRemoveTeamMemberGuard(
  requestorId: string,
  targetId: string,
  targetRole: string | null | undefined,
  activeAdminOwnerCount: number,
): { status: number; message: string } | null {
  if (requestorId === targetId) {
    return {
      status: 400,
      message: 'You cannot remove yourself. Use the leave-company option instead.',
    };
  }
  if (
    (targetRole === 'admin' || targetRole === 'owner') &&
    activeAdminOwnerCount <= 1
  ) {
    return {
      status: 400,
      message: 'Cannot remove the only admin or owner of the company.',
    };
  }
  return null;
}

export function checkRoleChangeGuard(
  currentRole: string | null | undefined,
  newRole: string | null | undefined,
  activeAdminOwnerCount: number,
  targetId?: string,
  requestorId?: string,
): { status: number; message: string } | null {
  // Guard 1: demoting last admin/owner to tech
  if (
    newRole === 'tech' &&
    (currentRole === 'admin' || currentRole === 'owner') &&
    activeAdminOwnerCount <= 1
  ) {
    return {
      status: 400,
      message: 'Cannot demote the last admin or owner to tech.',
    };
  }

  // Guard 2: self-demotion of owner→admin when sole admin/owner
  if (
    targetId &&
    requestorId &&
    targetId === requestorId &&
    (currentRole === 'owner' || currentRole === 'admin') &&
    newRole !== currentRole &&
    newRole !== 'tech' &&
    activeAdminOwnerCount <= 1
  ) {
    return {
      status: 400,
      message: 'You cannot demote yourself when you are the only admin/owner.',
    };
  }

  return null;
}

export async function verifyRequestorRoleFromDb(
  requestorId: string,
  companyId: string | null | undefined,
  getRoleFromDb: (requestorId: string, companyId: string) => Promise<string | null>,
): Promise<{ status: number; message: string } | null> {
  const role = await getRoleFromDb(requestorId, companyId as string);
  if (!role || (role !== 'admin' && role !== 'owner')) {
    return {
      status: 403,
      message:
        'Your role has been updated since you logged in. Please refresh the page.',
    };
  }
  return null;
}

export function checkActorActiveGuard(
  status: string | null | undefined,
): { status: number; message: string } | null {
  if (status === 'active') return null;
  return {
    status: 403,
    message: 'Your account is suspended or inactive. Contact your company administrator.',
  };
}

// ---------------------------------------------------------------------------
// executeLeaveCompany — leave-company guard + DB mutation
// ---------------------------------------------------------------------------

type LeaveCompanyResult =
  | { outcome: 'not_associated' }
  | { outcome: 'sole_admin' }
  | { outcome: 'left'; companyId: string };

export async function executeLeaveCompany(
  companyId: string | null | undefined,
  userId: string,
  role: string | null | undefined,
  dbInstance: any,
): Promise<LeaveCompanyResult> {
  if (!companyId) return { outcome: 'not_associated' };

  if (role === 'owner' || role === 'admin') {
    const rows = await dbInstance
      .select({ cnt: drizzleSql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.companyId, companyId),
          ne(users.id as any, userId),
          inArray(users.companyRole as any, ['admin', 'owner']),
          eq(users.status as any, 'active'),
        ),
      );
    const otherAdminCount = rows[0]?.cnt ?? 0;
    if (otherAdminCount === 0) return { outcome: 'sole_admin' };
  }

  await dbInstance
    .update(users)
    .set({ companyId: null, companyRole: null })
    .where(eq(users.id as any, userId));

  return { outcome: 'left', companyId };
}

// ---------------------------------------------------------------------------
// checkLeaveCompanyEligibility — pure eligibility check (no DB write)
// ---------------------------------------------------------------------------

type LeaveCompanyEligibility =
  | { outcome: 'not_associated' }
  | { outcome: 'sole_admin' }
  | { outcome: 'eligible'; companyId: string };

export async function checkLeaveCompanyEligibility(
  companyId: string | null | undefined,
  userId: string,
  role: string | null | undefined,
  dbInstance: any,
): Promise<LeaveCompanyEligibility> {
  if (!companyId) return { outcome: 'not_associated' };

  if (role === 'owner' || role === 'admin') {
    const rows = await dbInstance
      .select({ cnt: drizzleSql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.companyId, companyId),
          ne(users.id as any, userId),
          inArray(users.companyRole as any, ['admin', 'owner']),
          eq(users.status as any, 'active'),
        ),
      );
    const otherAdminCount = rows[0]?.cnt ?? 0;
    if (otherAdminCount === 0) return { outcome: 'sole_admin' };
  }

  return { outcome: 'eligible', companyId };
}

// ---------------------------------------------------------------------------
// executeRemoveMember — remove-member route guard + DB update
// ---------------------------------------------------------------------------

type RemoveMemberResult =
  | { outcome: 'unauthorized' }
  | { outcome: 'not_found' }
  | { outcome: 'guard_error'; status: number; message: string }
  | { outcome: 'removed'; companyId: string; targetUser: any };

export async function executeRemoveMember(
  companyId: string,
  requestorId: string,
  requestorRole: string | null | undefined,
  targetId: string,
  dbInstance: any,
): Promise<RemoveMemberResult> {
  if (requestorRole !== 'admin' && requestorRole !== 'owner') {
    return { outcome: 'unauthorized' };
  }

  // Admins may only remove tech members; owners may remove any member
  const targetRows =
    requestorRole === 'admin'
      ? await dbInstance
          .select()
          .from(users)
          .where(
            and(
              eq(users.companyId, companyId),
              eq(users.id as any, targetId),
              eq(users.companyRole as any, 'tech'),
            ),
          )
          .limit(1)
      : await dbInstance
          .select()
          .from(users)
          .where(
            and(
              eq(users.companyId, companyId),
              eq(users.id as any, targetId),
            ),
          )
          .limit(1);

  const targetUser = targetRows[0] ?? null;
  if (!targetUser) return { outcome: 'not_found' };

  // For admin/owner targets run the sole-admin guard + self-removal check
  if (targetUser.companyRole === 'admin' || targetUser.companyRole === 'owner') {
    const cntRows = await dbInstance
      .select({ cnt: drizzleSql<number>`count(*)::int` })
      .from(users)
      .where(
        and(
          eq(users.companyId, companyId),
          inArray(users.companyRole as any, ['admin', 'owner']),
          eq(users.status as any, 'active'),
        ),
      );
    const cnt = cntRows[0]?.cnt ?? 0;
    const guardError = checkRemoveTeamMemberGuard(
      requestorId,
      targetId,
      targetUser.companyRole,
      cnt,
    );
    if (guardError) return { outcome: 'guard_error', ...guardError };
  } else {
    // Tech target — only check self-removal
    const selfError = checkRemoveTeamMemberGuard(
      requestorId,
      targetId,
      targetUser.companyRole,
      0,
    );
    if (selfError) return { outcome: 'guard_error', ...selfError };
  }

  await dbInstance
    .update(users)
    .set({
      status: 'removed',
      companyId: null,
      companyRole: null,
      deletedAt: new Date(),
    })
    .where(eq(users.id as any, targetId));

  return { outcome: 'removed', companyId, targetUser };
}

// ---------------------------------------------------------------------------
// executeTransferOwnership — transfer-ownership route DB logic
// ---------------------------------------------------------------------------

type TransferOwnershipResult =
  | { outcome: 'self' }
  | { outcome: 'target_not_found' }
  | { outcome: 'transferred'; targetUser: { id: string; firstName: string | null; lastName: string | null; email: string } };

export async function executeTransferOwnership(
  actorId: string,
  companyId: string,
  newOwnerId: string,
  dbInstance: any,
): Promise<TransferOwnershipResult> {
  if (actorId === newOwnerId) return { outcome: 'self' };

  const targetRows = await dbInstance
    .select()
    .from(users)
    .where(
      and(
        eq(users.companyId, companyId),
        eq(users.id as any, newOwnerId),
        eq(users.status as any, 'active'),
      ),
    )
    .limit(1);

  if (!targetRows[0]) return { outcome: 'target_not_found' };

  const target = targetRows[0];

  await dbInstance.transaction(async (tx: any) => {
    await tx.update(users).set({ companyRole: 'owner' }).where(eq(users.id as any, newOwnerId));
    await tx.update(users).set({ companyRole: 'admin' }).where(eq(users.id as any, actorId));
    await tx.update(companies).set({ ownerId: newOwnerId }).where(eq(companies.id as any, companyId));
  });

  return {
    outcome: 'transferred',
    targetUser: {
      id: target.id,
      firstName: target.firstName ?? null,
      lastName: target.lastName ?? null,
      email: target.email,
    },
  };
}

// ============================================================================
// End of exported helpers
// ============================================================================

export async function registerRoutes(app: Express): Promise<Server> {
  console.error('========================================');
  console.error('REGISTER ROUTES CALLED - NEW CODE VERSION 2025-11-02-21:28');
  console.error('========================================');

  // Per-user rate limit for the AI-powered diy-verify endpoint.
  // Configurable via DIY_VERIFY_RATE_LIMIT_PER_MINUTE (default: 5).
  // Created inside registerRoutes so each app instance gets fresh in-memory state
  // and tests can override the limit via the env var before calling buildApp().
  const _diyVerifyRawMax = parseInt(process.env.DIY_VERIFY_RATE_LIMIT_PER_MINUTE ?? "5", 10);
  const _diyVerifyMax = Number.isFinite(_diyVerifyRawMax) && _diyVerifyRawMax > 0 ? _diyVerifyRawMax : 5;
  const diyVerifyLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: _diyVerifyMax,
    // Key by authenticated user ID so the cap is per-user, not per-IP.
    // isAuthenticated runs before this middleware, so req.session.user is always set.
    keyGenerator: (req: any) => req.session?.user?.id ?? "anonymous",
    message: { message: "Too many AI verification requests. Please wait a minute and try again." },
    standardHeaders: true,
    legacyHeaders: false,
    // Suppress the IPv6-fallback validation warning: we intentionally key by user ID,
    // not by IP, so there is no IPv6 bypass risk.
    validate: { keyGeneratorIpFallback: false },
  });

  // Health check endpoint for monitoring
  // Public address autocomplete — proxies Nominatim server-side (no auth required)
  app.get('/api/address-suggest', async (req: any, res: any) => {
    const q = (req.query.q as string || '').trim();
    if (!q || q.length < 3) return res.json([]);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=6&addressdetails=0&countrycodes=us`;
      const nominatimRes = await fetch(url, { headers: { 'User-Agent': 'MyHomeBase/1.0' } });
      if (!nominatimRes.ok) return res.json([]);
      const data = await nominatimRes.json() as any[];
      // Return slim objects only — display_name, type, class
      const results = data.map(r => ({ display_name: r.display_name, type: r.type, class: r.class }));
      res.json(results);
    } catch { res.json([]); }
  });

  // Public geocode endpoint — used by onboarding page (no auth required)
  app.get('/api/geocode', async (req: any, res: any) => {
    const address = (req.query.address as string || '').trim();
    if (!address || address.length < 5) {
      return res.status(400).json({ error: 'Address is required' });
    }
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&addressdetails=1&countrycodes=us`;
      const nominatimRes = await fetch(url, { headers: { 'User-Agent': 'MyHomeBase/1.0' } });
      if (!nominatimRes.ok) throw new Error('Geocoding service unavailable');
      const data = await nominatimRes.json() as any[];
      if (!data || data.length === 0) return res.status(404).json({ error: 'Address not found' });
      const r = data[0];
      const addr = r.address || {};
      const houseNumber = addr.house_number || '';
      const road = addr.road || '';
      const street = [houseNumber, road].filter(Boolean).join(' ');
      const city = addr.city || addr.town || addr.village || addr.hamlet || '';
      const state = addr.state || '';
      const zip = addr.postcode || '';
      const formatted = r.display_name;
      res.json({ formatted, street, city, state, zip, lat: parseFloat(r.lat), lon: parseFloat(r.lon) });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Geocoding failed' });
    }
  });

  app.get('/api/health', async (_req, res) => {
    try {
      // Quick database connectivity check
      await pool.query('SELECT 1');
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      });
    }
  });

  // NOTE: /api/test-email removed — dev-only endpoint was publicly reachable and could be abused
  // to send unlimited SendGrid mail at operator expense. Use internal tooling for email testing.

  // ========================================
  // SUBSCRIPTION PLANS
  // ========================================
  
  // Homeowner subscription tiers:
  // - Free: Contractor search, view past contractors, payments only (0 homes)
  // - Base ($5/month): 1-2 homes
  // - Premium ($20/month): 3-6 homes
  // - Premium Plus ($40/month): 7+ homes (unlimited)
  
  const HOMEOWNER_PLANS = [
    {
      tierName: 'free',
      displayName: 'Free',
      description: 'Search for contractors, view your past contractors, and make payments',
      monthlyPrice: '0.00',
      minHouses: 0,
      maxHouses: 0,
      planType: 'homeowner',
      features: ['Contractor search', 'View past contractors', 'Make payments through app'],
      referralCreditCap: '0.00',
      sortOrder: 0
    },
    {
      tierName: 'base',
      displayName: 'Base',
      description: 'Perfect for single homeowners with 1-2 properties',
      monthlyPrice: '5.00',
      minHouses: 1,
      maxHouses: 2,
      planType: 'homeowner',
      features: ['Up to 2 homes', 'Maintenance tracking', 'Home health score', 'DIY savings tracker', 'Service records', 'Earn up to $5/month in referral credits'],
      referralCreditCap: '5.00',
      sortOrder: 1
    },
    {
      tierName: 'premium',
      displayName: 'Premium',
      description: 'Ideal for homeowners with multiple properties',
      monthlyPrice: '20.00',
      minHouses: 3,
      maxHouses: 6,
      planType: 'homeowner',
      features: ['3-6 homes', 'All Base features', 'Priority contractor matching', 'Advanced maintenance insights', 'Earn up to $20/month in referral credits'],
      referralCreditCap: '20.00',
      sortOrder: 2
    },
    {
      tierName: 'premium_plus',
      displayName: 'Premium Plus',
      description: 'For property investors and managers with 7+ homes',
      monthlyPrice: '40.00',
      minHouses: 7,
      maxHouses: null, // unlimited
      planType: 'homeowner',
      features: ['Unlimited homes', 'All Premium features', 'Dedicated support', 'Bulk maintenance scheduling', 'Earn up to $40/month in referral credits'],
      referralCreditCap: '40.00',
      sortOrder: 3
    }
  ];

  const CONTRACTOR_PLANS = [
    {
      // Unified contractor plan: $20/month covers solo + up to 2 techs.
      // Each additional tech beyond the 2 included = $5/month.
      tierName: 'contractor_basic',
      displayName: 'Contractor',
      description: 'Everything you need — solo or with a team. $20/mo covers you and 2 techs; add more for $5/mo each.',
      monthlyPrice: '20.00',
      minHouses: 0,
      maxHouses: 1, // 1 personal home for maintenance tracking
      planType: 'contractor',
      features: [
        'Get found by homeowners',
        'Messaging with homeowners',
        'Send proposals',
        'Reviews and ratings profile',
        'Full CRM — clients, jobs, quotes & invoices',
        'Accept payments via Stripe Connect',
        'Team management (2 techs included)',
        '$5/mo per additional tech',
        'Earn up to $20/month in referral credits',
      ],
      referralCreditCap: '20.00',
      hasCrmAccess: true,
      includedTechSeats: 2,        // techs bundled in base price
      additionalSeatPrice: '5.00', // $/month per tech beyond the 2 included
      sortOrder: 0
    },
    // contractor_pro is retired — pricing now per-seat on contractor_basic.
    // Kept as inactive so existing FK references don't break.
    {
      tierName: 'contractor_pro',
      displayName: 'Contractor Pro (legacy)',
      description: 'Retired — existing subscribers grandfathered. New sign-ups use Contractor plan.',
      monthlyPrice: '40.00',
      minHouses: 0,
      maxHouses: 1,
      planType: 'contractor',
      features: ['Legacy plan — see Contractor plan for current pricing'],
      referralCreditCap: '40.00',
      hasCrmAccess: true,
      includedTechSeats: null,
      additionalSeatPrice: null,
      isActive: false, // hidden from new sign-ups; existing subscribers unaffected
      sortOrder: 99
    },
    // Business tier — adds divisions, manager/dispatcher roles, bulk import, analytics.
    // Per-seat pricing mirrors base plan: $20 base + $5/tech (no separate Business base fee).
    {
      tierName: 'contractor_business',
      displayName: 'Contractor Business',
      description: 'Division management, bulk import, and advanced analytics for larger teams.',
      monthlyPrice: '20.00', // same base; Business unlocks features, not a higher flat fee
      minHouses: 0,
      maxHouses: 1,
      planType: 'contractor',
      referralCreditCap: '20.00',
      hasCrmAccess: true,
      includedTechSeats: 2,
      additionalSeatPrice: '5.00',
      maxTechSeats: 99,
      maxAdminSeats: 5,
      maxManagerSeats: 10,
      maxDispatcherSeats: 10,
      features: [
        'Everything in Contractor',
        'Up to 99 field technicians',
        'Manager role for division leads',
        'Dispatcher role for scheduling',
        'Bulk tech import via CSV',
        'Advanced analytics dashboard',
        'Custom referral codes',
        'Priority support',
      ],
      sortOrder: 1
    },
    // Enterprise tier — custom pricing; no Stripe product yet.
    // TODO: Replace grandfathered billing with custom Stripe arrangement when first enterprise customer signed.
    {
      tierName: 'contractor_enterprise',
      displayName: 'Contractor Enterprise',
      description: 'Unlimited seats, SSO, API access, and a dedicated CSM.',
      monthlyPrice: '0.00', // custom pricing — $0 placeholder; billing handled via grandfathered/custom Stripe arrangement
      minHouses: 0,
      maxHouses: 1,
      planType: 'contractor',
      referralCreditCap: null,
      hasCrmAccess: true,
      includedTechSeats: null,     // unlimited; custom contract governs
      additionalSeatPrice: null,
      maxTechSeats: null,
      maxAdminSeats: null,
      maxManagerSeats: null,
      maxDispatcherSeats: null,
      features: [
        'Everything in Business',
        'Unlimited team members',
        'SSO / SAML integration',
        'API access for integrations',
        'Dedicated customer success manager',
        'Custom onboarding',
        'SLA support',
      ],
      sortOrder: 2
    }
  ];

  // Get all subscription plans
  app.get('/api/plans', async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch subscription plans' });
    }
  });

  // Get homeowner plans only
  app.get('/api/plans/homeowner', async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlansByType('homeowner');
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch homeowner plans' });
    }
  });

  // Get contractor plans only
  app.get('/api/plans/contractor', async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlansByType('contractor');
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contractor plans' });
    }
  });

  // Seed/sync subscription plans to database (admin only)
  app.post('/api/admin/seed-plans', isAuthenticated, async (req: any, res: any) => {
    try {
      const user = req.session.user;
      if (!user?.email || !['sarah@example.com', 'admin@homebase.com'].includes(user.email)) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const allPlans = [...HOMEOWNER_PLANS, ...CONTRACTOR_PLANS];
      let created = 0;
      let updated = 0;

      for (const plan of allPlans) {
        const existing = await storage.getSubscriptionPlanByTier(plan.tierName);
        if (existing) {
          // Update existing plan
          await db.update(subscriptionPlans)
            .set({
              displayName: plan.displayName,
              description: plan.description,
              monthlyPrice: plan.monthlyPrice,
              minHouses: plan.minHouses,
              maxHouses: plan.maxHouses,
              planType: plan.planType,
              features: plan.features,
              referralCreditCap: (plan as any).referralCreditCap || null,
              hasCrmAccess: (plan as any).hasCrmAccess || false,
              includedTechSeats: (plan as any).includedTechSeats ?? null,
              additionalSeatPrice: (plan as any).additionalSeatPrice ?? null,
              isActive: (plan as any).isActive !== false, // default true unless explicitly false
              sortOrder: plan.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(subscriptionPlans.tierName, plan.tierName));
          updated++;
        } else {
          // Create new plan
          await db.insert(subscriptionPlans).values({
            tierName: plan.tierName,
            displayName: plan.displayName,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            minHouses: plan.minHouses,
            maxHouses: plan.maxHouses,
            planType: plan.planType,
            features: plan.features,
            referralCreditCap: (plan as any).referralCreditCap || null,
            hasCrmAccess: (plan as any).hasCrmAccess || false,
            includedTechSeats: (plan as any).includedTechSeats ?? null,
            additionalSeatPrice: (plan as any).additionalSeatPrice ?? null,
            isActive: (plan as any).isActive !== false,
            sortOrder: plan.sortOrder,
          });
          created++;
        }
      }

      res.json({ message: `Plans synced: ${created} created, ${updated} updated` });
    } catch (error) {
      console.error('Error seeding plans:', error);
      res.status(500).json({ message: 'Failed to seed plans' });
    }
  });

  // Auto-seed subscription plans on startup (upserts so price/feature changes apply on restart)
  (async () => {
    try {
      const allPlans = [...HOMEOWNER_PLANS, ...CONTRACTOR_PLANS];
      for (const plan of allPlans) {
        const existing = await storage.getSubscriptionPlanByTier(plan.tierName);
        if (existing) {
          // Upsert: keep pricing and feature changes in sync on every restart
          await db.update(subscriptionPlans)
            .set({
              displayName: plan.displayName,
              description: plan.description,
              monthlyPrice: plan.monthlyPrice,
              features: plan.features,
              referralCreditCap: (plan as any).referralCreditCap || null,
              hasCrmAccess: (plan as any).hasCrmAccess || false,
              includedTechSeats: (plan as any).includedTechSeats ?? null,
              additionalSeatPrice: (plan as any).additionalSeatPrice ?? null,
              isActive: (plan as any).isActive !== false,
              sortOrder: plan.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(subscriptionPlans.tierName, plan.tierName));
        } else {
          await db.insert(subscriptionPlans).values({
            tierName: plan.tierName,
            displayName: plan.displayName,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            minHouses: plan.minHouses,
            maxHouses: plan.maxHouses,
            planType: plan.planType,
            features: plan.features,
            referralCreditCap: (plan as any).referralCreditCap || null,
            hasCrmAccess: (plan as any).hasCrmAccess || false,
            includedTechSeats: (plan as any).includedTechSeats ?? null,
            additionalSeatPrice: (plan as any).additionalSeatPrice ?? null,
            isActive: (plan as any).isActive !== false,
            sortOrder: plan.sortOrder,
          });
          console.log(`[PLANS] Seeded subscription plan: ${plan.tierName}`);
        }
      }
    } catch (error) {
      console.error('[PLANS] Error auto-seeding plans:', error);
    }
  })();

  // Set up Replit Auth (handles Google OAuth via Replit)
  await setupAuth(app);

  // Set up direct Google OAuth (for "Continue with Google" on sign-in pages)
  await setupGoogleAuth(app);

  // Secure logo upload endpoint with authentication (MUST be after setupAuth for session access)
  console.error('[STARTUP] Registering /api/upload-logo-raw endpoint');
  app.post('/api/upload-logo-raw', uploadLimiter, async (req: any, res: any) => {
    console.error('[LOGO-DEBUG] Session check:', {
      hasSession: !!req.session,
      isAuthenticated: req.session?.isAuthenticated,
      hasUser: !!req.session?.user,
      userRole: req.session?.user?.role,
      userId: req.session?.user?.id
    });
    
    // Check session-based authentication
    if (!req.session?.isAuthenticated || !req.session?.user) {
      console.error('[LOGO-DEBUG] Auth failed - no session');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.session.user.role !== 'contractor') {
      console.error('[LOGO-DEBUG] Auth failed - not contractor, role:', req.session.user.role);
      return res.status(403).json({ message: "Forbidden - contractors only" });
    }
    
    try {
      console.error('[SECURE-UPLOAD] Request received from authenticated user:', req.session?.user?.id);
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: 'Missing imageData' });
      }
      
      // Validate image data format
      if (!imageData.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }
      
      // Get user's company from storage layer
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'User or company not found' });
      }
      
      
      // Validate image size (max 5MB for logos)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large (max 5MB)' });
      }
      
      // Validate file extension
      const extensionMatch = imageData.match(/^data:image\/(jpeg|jpg|png|webp|gif);/);
      if (!extensionMatch) {
        return res.status(400).json({ error: 'Invalid image type. Allowed: jpeg, png, webp, gif' });
      }
      const fileExtension = extensionMatch[1] === 'jpeg' ? 'jpg' : extensionMatch[1];
      
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `public/contractor-images/logos/${filename}`;
      
      const objectStorage = new ObjectStorageService();
      await objectStorage.uploadFile(path, buffer, `image/${fileExtension}`);
      const url = `/public/contractor-images/logos/${filename}`;
      
      // Update company using storage layer
      await storage.updateCompany(user.companyId, { businessLogo: url });
      
      console.error('[SECURE-UPLOAD] Logo uploaded successfully for company:', user.companyId);
      res.json({ success: true, url, companyId: user.companyId });
    } catch (error: any) {
      console.error('[SECURE-UPLOAD ERROR]', error);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  // Get current user's subscription info (must be after setupAuth for session access)
  app.get('/api/my-subscription', async (req: any, res: any) => {
    try {
      // Session auth check - matches /api/user pattern
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Demo homeowner accounts get unlimited access - never expires
      // Check for demo-homeowner prefix to catch all demo homeowner accounts
      if (userId.startsWith('demo-homeowner') || user.email?.includes('demo@homeowner') || user.email?.includes('@homebase.com')) {
        const housesCount = await storage.getHousesCount(userId);
        return res.json({
          currentPlan: 'premium_plus',
          maxHouses: 'unlimited',
          currentHouses: housesCount,
          canAddHomes: true,
          isTrialing: false,
          trialDaysRemaining: 0,
          hasActiveSubscription: true,
          subscriptionStatus: 'active',
          isDemoAccount: true,
        });
      }
      
      // Check if user is grandfathered (free unlimited access forever)
      const grandfatheredEmails = (process.env.GRANDFATHERED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const isGrandfathered = user.email && grandfatheredEmails.includes(user.email.toLowerCase());
      
      const housesCount = await storage.getHousesCount(userId);
      const now = new Date();
      
      // Calculate trial end date - use trialEndsAt if set, otherwise calculate from createdAt + 14 days
      let effectiveTrialEndsAt: Date | null = null;
      if (user.trialEndsAt) {
        effectiveTrialEndsAt = new Date(user.trialEndsAt);
      } else if (user.createdAt) {
        // For older accounts without trialEndsAt, calculate based on account creation + 14 days
        effectiveTrialEndsAt = new Date(new Date(user.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      
      // Check if trial is active FIRST (need this for plan determination)
      const isTrialing = user.subscriptionStatus === 'trialing' && 
                         effectiveTrialEndsAt && 
                         effectiveTrialEndsAt > now;
      
      // Check if user has an active paid subscription
      const hasActiveSubscription = user.subscriptionStatus === 'active';
      
      // Determine current plan based on subscription status and maxHousesAllowed
      let currentPlan = 'free';
      let maxHouses = user.maxHousesAllowed ?? 0;
      
      if (isGrandfathered || user.subscriptionStatus === 'grandfathered' || user.maxHousesAllowed === null) {
        currentPlan = 'premium_plus';
        maxHouses = -1; // unlimited
      } else if (!hasActiveSubscription && !isTrialing) {
        // Trial expired or no subscription - user is on free plan
        currentPlan = 'free';
        maxHouses = 0; // Free users can only search/message, not manage houses
      } else if (maxHouses === 0) {
        currentPlan = 'free';
      } else if (maxHouses <= 2) {
        currentPlan = 'base';
      } else if (maxHouses <= 6) {
        currentPlan = 'premium';
      } else {
        currentPlan = 'premium_plus';
      }
      
      const trialDaysRemaining = isTrialing && effectiveTrialEndsAt
        ? Math.ceil((effectiveTrialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      res.json({
        currentPlan,
        maxHouses: maxHouses === -1 ? 'unlimited' : maxHouses,
        currentHouses: housesCount,
        canAddHomes: maxHouses === -1 || housesCount < maxHouses,
        subscriptionStatus: isGrandfathered ? 'grandfathered' : user.subscriptionStatus,
        isTrialing: isGrandfathered ? false : isTrialing,
        trialDaysRemaining: isGrandfathered ? 0 : trialDaysRemaining,
        trialEndsAt: isGrandfathered ? null : (effectiveTrialEndsAt?.toISOString() || null),
        isPremium: isGrandfathered ? true : user.isPremium,
        isGrandfathered
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch subscription info' });
    }
  });

  // Stripe health check endpoint - Tests API connectivity
  app.get('/api/stripe/health', async (_req: any, res) => {
    try {
      if (!stripe) {
        return res.status(500).json({ 
          status: 'error', 
          message: 'Stripe not configured - missing STRIPE_SECRET_KEY' 
        });
      }

      // Test API connectivity by retrieving account info
      const account = await (stripe! as any).accounts.retrieve();
      
      return res.json({
        status: 'ok',
        message: 'Stripe API connection successful',
        accountId: account.id,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        country: account.country,
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      console.error('[STRIPE HEALTH] Error:', error.message);
      return res.status(500).json({
        status: 'error',
        message: error.message || 'Failed to connect to Stripe API',
        code: error.code || 'unknown'
      });
    }
  });

  // Stripe webhook handler - registered at both paths (Stripe dashboard uses /api/stripe/webhook)
  app.post(['/api/webhooks/stripe', '/api/stripe/webhook'], express.raw({ type: 'application/json' }), async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[STRIPE WEBHOOK] No webhook secret configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      event = stripe!.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('[STRIPE WEBHOOK] Event received:', event.type);

    const eventId = event.id;

    // ── Layer 1: in-memory processed cache (warm path, no DB) ──────────────
    if (processedWebhookEventIds.has(eventId)) {
      return res.json({ received: true, duplicate: true });
    }

    // ── Layer 2: in-flight concurrency guard ────────────────────────────────
    // Must be claimed synchronously (before any await) so that two requests
    // arriving in the same event-loop tick cannot both slip through. Node.js
    // is single-threaded, so this check-then-add is atomic.
    if (inFlightWebhookEventIds.has(eventId)) {
      return res.json({ received: true, duplicate: true });
    }
    inFlightWebhookEventIds.add(eventId);

    try {
      // ── Layer 3: DB cold-start fallback ───────────────────────────────────
      // Checked inside the try/finally so the in-flight slot is always released.
      const alreadyProcessed = await storage.hasProcessedStripeEvent(eventId);
      if (alreadyProcessed) {
        enforceWebhookDedupCacheCap();
        processedWebhookEventIds.set(eventId, Date.now());
        return res.json({ received: true, duplicate: true });
      }

      // ── Two-phase write: persist BEFORE side effects so a crash leaves a
      //    durable "pending" row that the recovery job can re-process. ───────
      await storage.markStripeEventPending(eventId);

      // ── Side effects (the event-type switch) ─────────────────────────────
      if (_processStripeEventSideEffectsRef) {
        await _processStripeEventSideEffectsRef(event);
      }

      // ── Commit: mark the row as fully processed ───────────────────────────
      await storage.markStripeEventCommitted(eventId);

      // Warm the in-memory cache so future retries skip the DB.
      enforceWebhookDedupCacheCap();
      processedWebhookEventIds.set(eventId, Date.now());

      res.json({ received: true });
    } catch (error: any) {
      console.error('[STRIPE WEBHOOK] Error processing event:', error);
      res.status(500).json({ error: error.message });
    } finally {
      inFlightWebhookEventIds.delete(eventId);
    }
  });

  // ── Stripe event side-effects ─────────────────────────────────────────────
  // Extracted so recoverIncompleteStripeEvents can re-run them and so tests
  // can assert they fire exactly once per event ID.
  async function processStripeEventSideEffects(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = ((invoice as any).subscription ?? (invoice as any).subscriptionId) as string;
          const customerId = invoice.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          await storage.createSubscriptionCycleEvent({
            userId: user.id,
            stripeSubscriptionId: subscriptionId,
            stripeInvoiceId: invoice.id,
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
            status: 'paid',
            amount: (invoice.amount_paid / 100).toFixed(2),
          });

          await storage.updateUserSubscriptionStatus(user.id, 'active');
          console.log('[STRIPE WEBHOOK] Invoice paid processed for user:', user.email);

          // Check if this user was referred by an agent and update consecutive months
          try {
            const affiliateReferral = await storage.getAffiliateReferralByUserId(user.id);
            if (affiliateReferral && affiliateReferral.status !== 'paid' && affiliateReferral.status !== 'voided') {
              const newConsecutiveMonths = affiliateReferral.consecutiveMonthsPaid + 1;
              
              // Determine new status based on consecutive months
              let newStatus = affiliateReferral.status;
              if (newConsecutiveMonths === 1) newStatus = 'month_1';
              else if (newConsecutiveMonths === 2) newStatus = 'month_2';
              else if (newConsecutiveMonths === 3) newStatus = 'month_3';
              else if (newConsecutiveMonths >= 4) newStatus = 'eligible';

              // Update the affiliate referral
              await storage.updateAffiliateReferral(affiliateReferral.id, {
                consecutiveMonthsPaid: newConsecutiveMonths,
                lastPaymentDate: new Date(),
                firstPaymentDate: affiliateReferral.firstPaymentDate || new Date(),
                status: newStatus,
              });

              console.log(`[AFFILIATE] Updated referral ${affiliateReferral.id}: ${newConsecutiveMonths} months paid, status: ${newStatus}`);

              // Check if eligible for payout (4+ months) and hasn't been paid yet
              if (newConsecutiveMonths >= 4 && affiliateReferral.status !== 'paid') {
                // Check if there's already a payout record for this referral
                const existingPayouts = await storage.getAffiliatePayouts(affiliateReferral.agentId);
                const existingPayout = existingPayouts.find(p => p.affiliateReferralId === affiliateReferral.id);
                
                // Skip if already successfully paid
                if (existingPayout?.status === 'paid') {
                  console.log(`[AFFILIATE] Referral ${affiliateReferral.id} already paid, skipping`);
                } else {
                  console.log(`[AFFILIATE] Referral ${affiliateReferral.id} eligible for $15 payout (${newConsecutiveMonths} months)`);
                  
                  // Get the agent's profile to check Stripe Connect status
                  const agentProfile = await storage.getAgentProfile(affiliateReferral.agentId);
                  
                  if (agentProfile?.stripeConnectAccountId && agentProfile.stripeOnboardingComplete) {
                    // Create or update payout record
                    let payout = existingPayout;
                    if (!payout) {
                      payout = await storage.createAffiliatePayout({
                        affiliateReferralId: affiliateReferral.id,
                        agentId: affiliateReferral.agentId,
                        amount: "15.00",
                        status: 'processing',
                      });
                    } else {
                      // Update existing failed/pending payout to processing
                      await storage.updateAffiliatePayout(payout.id, {
                        status: 'processing',
                        errorMessage: null,
                      });
                    }

                    // Attempt to transfer to the agent's Stripe Connect account
                    try {
                      if (stripe) {
                        const transfer = await stripe.transfers.create({
                          amount: 1500, // $15.00 in cents
                          currency: 'usd',
                          destination: agentProfile.stripeConnectAccountId,
                          metadata: {
                            payoutId: payout.id,
                            affiliateReferralId: affiliateReferral.id,
                            agentId: affiliateReferral.agentId,
                          },
                        });

                        // Update payout as successful
                        await storage.updateAffiliatePayout(payout.id, {
                          status: 'paid',
                          stripeTransferId: transfer.id,
                          paidAt: new Date(),
                        });

                        // Update the referral status
                        await storage.updateAffiliateReferral(affiliateReferral.id, {
                          status: 'paid',
                        });

                        console.log(`[AFFILIATE] Successfully transferred $15 to agent ${affiliateReferral.agentId}, transfer ID: ${transfer.id}`);
                      }
                    } catch (transferError: any) {
                      console.error(`[AFFILIATE] Transfer failed for payout ${payout.id}:`, transferError.message);
                      await storage.updateAffiliatePayout(payout.id, {
                        status: 'failed',
                        errorMessage: transferError.message,
                      });
                    }
                  } else if (!existingPayout) {
                    // Agent doesn't have Stripe Connect set up - create pending payout (only if not already created)
                    await storage.createAffiliatePayout({
                      affiliateReferralId: affiliateReferral.id,
                      agentId: affiliateReferral.agentId,
                      amount: "15.00",
                      status: 'pending',
                      errorMessage: 'Agent has not completed Stripe Connect onboarding',
                    });

                    // Update referral status
                    await storage.updateAffiliateReferral(affiliateReferral.id, {
                      status: 'payout_pending',
                    });

                    console.log(`[AFFILIATE] Created pending payout for agent ${affiliateReferral.agentId} - Stripe Connect not set up`);
                  } else {
                    console.log(`[AFFILIATE] Pending payout already exists for referral ${affiliateReferral.id}, waiting for agent to complete Stripe onboarding`);
                  }
                }
              }
            }
          } catch (affiliateError: any) {
            console.error('[AFFILIATE] Error processing affiliate referral:', affiliateError.message);
            // Don't fail the webhook for affiliate errors
          }

          // Handle user-to-user referral credits — homeowners and contractors only
          // Real estate agents use the separate cash-payout affiliate model (handled above)
          try {
            if (user.referredBy && user.role !== 'agent') {
              const referrer = await storage.getUserByReferralCode(user.referredBy);

              if (referrer && referrer.id !== user.id && referrer.role !== 'agent') {
                // Derive billing month from invoice period_start (format YYYY-MM)
                const invoiceObj = event.data.object as Stripe.Invoice;
                const periodTimestamp = invoiceObj.period_start || Math.floor(Date.now() / 1000);
                const periodDate = new Date(periodTimestamp * 1000);
                const billingMonth = `${periodDate.getFullYear()}-${String(periodDate.getMonth() + 1).padStart(2, '0')}`;

                // Insert credit — unique constraint (referrer, referred, billingMonth) prevents duplicates
                try {
                  await db.insert(referralCredits).values({
                    referrerUserId: referrer.id,
                    referredUserId: user.id,
                    billingMonth,
                    creditAmount: "1.00",
                    status: "earned",
                    earnedAt: new Date(),
                    source: "referral",
                    notes: `Monthly credit for ${billingMonth} — referred user: ${user.email}`,
                  });

                  console.log(`[REFERRAL CREDITS] Issued credit for ${billingMonth}: ${referrer.email} <- ${user.email}`);

                  // Check if referrer has now reached free-month threshold
                  const referrerPlan = referrer.subscriptionPlanId
                    ? await db.select({ monthlyPrice: subscriptionPlans.monthlyPrice })
                        .from(subscriptionPlans)
                        .where(eq(subscriptionPlans.id, referrer.subscriptionPlanId))
                        .limit(1)
                    : [];
                  const threshold = referrerPlan.length > 0 && referrerPlan[0].monthlyPrice
                    ? Math.round(parseFloat(referrerPlan[0].monthlyPrice))
                    : 5; // fallback $5 plan

                  const earnedCredits = await db.select()
                    .from(referralCredits)
                    .where(and(
                      eq(referralCredits.referrerUserId, referrer.id),
                      eq(referralCredits.status, 'earned')
                    ))
                    .orderBy(referralCredits.earnedAt); // oldest first (FIFO)

                  // Use SUM(credit_amount) for threshold check to handle non-$1 credits correctly
                  const totalEarned = earnedCredits.reduce((sum, c) => sum + parseFloat(c.creditAmount || '1'), 0);

                  if (totalEarned >= threshold) {
                    // Grant a free month — FIFO: accumulate credits until their sum reaches the threshold
                    const toRedeem: typeof earnedCredits = [];
                    let runningSum = 0;
                    for (const credit of earnedCredits) {
                      toRedeem.push(credit);
                      runningSum += parseFloat(credit.creditAmount || '1');
                      if (runningSum >= threshold) break;
                    }
                    const now = new Date();
                    // Wrap redemption + free-month insert in a transaction for idempotency:
                    // if the insert fails, credits are not marked redeemed, avoiding orphaned state.
                    await db.transaction(async (tx) => {
                      for (const credit of toRedeem) {
                        await tx.update(referralCredits)
                          .set({ status: 'redeemed', appliedAt: now })
                          .where(eq(referralCredits.id, credit.id));
                      }
                      await tx.insert(referralFreeMonths).values({
                        userId: referrer.id,
                        creditsConsumed: threshold,
                        status: 'pending',
                        earnedAt: now,
                        notes: `Free month earned — ${threshold} credits (${runningSum.toFixed(2)} total) redeemed`,
                      });
                    });
                    console.log(`[REFERRAL CREDITS] Free month earned for ${referrer.email} (${threshold} credits consumed)`);
                  }
                } catch (insertErr: unknown) {
                  // Unique constraint violation means credit already issued for this month — skip silently
                  const pgErr = insertErr as { code?: string };
                  if (pgErr.code === '23505') {
                    console.log(`[REFERRAL CREDITS] Credit already issued for ${billingMonth}: ${referrer.email} <- ${user.email}`);
                  } else {
                    throw insertErr;
                  }
                }

                // Sync referralCount: count distinct referred users with active/trialing subscription
                const activeReferralRows = await db.execute(drizzleSql`
                  SELECT COUNT(DISTINCT rc.referred_user_id)::int AS cnt
                  FROM referral_credits rc
                  INNER JOIN users u ON rc.referred_user_id = u.id
                  WHERE rc.referrer_user_id = ${referrer.id}
                    AND u.subscription_status IN ('active', 'trialing')
                `);
                const activeCount = Number((activeReferralRows.rows[0] as { cnt: number } | undefined)?.cnt || 0);
                await storage.upsertUser({
                  ...referrer,
                  referralCount: activeCount,
                });
              }
            }
          } catch (referralError: unknown) {
            const err = referralError as { message?: string };
            console.error('[REFERRAL CREDITS] Error creating referral credit:', err.message);
            // Don't fail the webhook for referral errors
          }

          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = ((invoice as any).subscription ?? (invoice as any).subscriptionId) as string;
          const customerId = invoice.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          await storage.createSubscriptionCycleEvent({
            userId: user.id,
            stripeSubscriptionId: subscriptionId,
            stripeInvoiceId: invoice.id,
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
            status: 'failed',
            amount: (invoice.amount_due / 100).toFixed(2),
          });

          await storage.updateUserSubscriptionStatus(user.id, 'past_due');
          console.log('[STRIPE WEBHOOK] Payment failed processed for user:', user.email);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          const priceId = subscription.items.data[0]?.price.id;
          await storage.updateUserStripeSubscription(user.id, subscription.id, priceId || '');
          
          let status = 'active';
          if (subscription.status === 'canceled') status = 'cancelled';
          else if (subscription.status === 'past_due') status = 'past_due';
          else if (subscription.status === 'trialing') status = 'trialing';
          
          await storage.updateUserSubscriptionStatus(user.id, status);

          // Phase 6: Recalculate metered seat quantity for Business tier
          if (user.companyId && stripe) {
            try {
              const meteredItem = subscription.items.data.find((item: any) => item.price?.recurring?.usage_type === 'metered');
              if (meteredItem) {
                const [seatCount] = await db.select({ count: drizzleSql<number>`cast(count(*) as int)` })
                  .from(users).where(and(eq(users.companyId, user.companyId), ne(users.status as any, 'removed')));
                const totalSeats = seatCount?.count ?? 1;
                const billedSeats = Math.max(0, totalSeats - 5); // Business: 5 included seats
                await (stripe as any).subscriptionItems.createUsageRecord(meteredItem.id, { quantity: billedSeats, action: 'set' });
                console.log('[STRIPE WEBHOOK] Metered seats updated:', billedSeats, 'billed for company:', user.companyId);
              }
            } catch (seatErr) {
              console.error('[STRIPE WEBHOOK] Failed to update metered seats:', seatErr);
            }
          }

          console.log('[STRIPE WEBHOOK] Subscription updated for user:', user.email, 'Status:', status);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          await storage.updateUserSubscriptionStatus(user.id, 'cancelled');
          console.log('[STRIPE WEBHOOK] Subscription deleted for user:', user.email);
          // In the monthly credit model, credits are only issued on invoice.payment_succeeded.
          // A cancelled subscriber no longer pays, so Stripe will fire no further payment events —
          // future credit accrual stops naturally without any DB mutation.
          // Previously earned credits represent real payments already made and belong to the referrer.
          break;
        }

        // Handle Connect payment events (invoice payments from homeowners to contractors)
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Handle subscription checkout completions
          if (session.mode === 'subscription' && session.metadata?.userId) {
            const userId = session.metadata.userId;
            const plan = session.metadata.plan;
            const maxHouses = session.metadata.maxHouses ? parseInt(session.metadata.maxHouses) : undefined;
            
            const user = await storage.getUser(userId);
            if (user) {
              // Update user subscription status
              const subscriptionId = session.subscription as string;
              await storage.updateUserStripeSubscription(userId, subscriptionId, '');
              await storage.updateUserSubscriptionStatus(userId, 'active');
              
              // Update max houses for homeowners
              if (maxHouses && user.role === 'homeowner') {
                await storage.upsertUser({
                  ...user,
                  maxHousesAllowed: maxHouses === 999 ? null : maxHouses, // null = unlimited
                  subscriptionStatus: 'active',
                });
              }
              
              // Update contractor tier
              if (user.role === 'contractor') {
                await storage.upsertUser({
                  ...user,
                  subscriptionStatus: 'active',
                  subscriptionTier: plan === 'pro' ? 'contractor_pro' : 'contractor_basic',
                } as any);
              }
              
              console.log(`[STRIPE WEBHOOK] Subscription activated for user: ${user.email}, plan: ${plan}`);
            }
          }
          
          // Check if this is a CRM invoice payment
          if (session.metadata?.type === 'crm_invoice_payment') {
            const invoiceId = session.metadata.invoiceId;
            
            if (invoiceId) {
              const invoice = await storage.getCrmInvoice(invoiceId);
              if (invoice) {
                // Update invoice status to paid
                await storage.updateCrmInvoice(invoiceId, {
                  status: 'paid',
                  paidAt: new Date(),
                  paymentMethod: 'credit_card',
                  paymentNotes: `Paid via Stripe checkout session: ${session.id}`,
                });
                
                console.log('[STRIPE WEBHOOK] Invoice paid:', invoiceId, 'Amount:', session.amount_total);
              }
            }
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          // Check if this is a CRM invoice payment
          if (paymentIntent.metadata?.invoiceId) {
            const invoiceId = paymentIntent.metadata.invoiceId;
            const invoice = await storage.getCrmInvoice(invoiceId);
            
            if (invoice && invoice.status !== 'paid') {
              await storage.updateCrmInvoice(invoiceId, {
                status: 'paid',
                paidAt: new Date(),
                paymentMethod: 'credit_card',
                paymentNotes: `Payment intent: ${paymentIntent.id}`,
              });
              
              console.log('[STRIPE WEBHOOK] Payment intent succeeded for invoice:', invoiceId);
            }
          }
          break;
        }

        default:
          console.log('[STRIPE WEBHOOK] Unhandled event type:', event.type);
    }
  }

  // Wire the side-effects function so recoverIncompleteStripeEvents can invoke it.
  _processStripeEventSideEffectsRef = processStripeEventSideEffects;

  // Block suspended contractor accounts from ALL authenticated /api/contractor/* routes.
  // Guard for all /api/contractor/* routes:
  // 1. Block suspended/removed/pending_invite accounts.
  // 2. Block tech users from admin-only paths — techs may only access invoices, team,
  //    validate-token, and accept-invite. req.originalUrl preserves the full path
  //    regardless of Express middleware URL-stripping.
  const TECH_ALLOWED_CONTRACTOR_PREFIXES = [
    '/api/contractor/invoices',
    '/api/contractor/team',
    '/api/contractor/validate-token',
    '/api/contractor/accept-invite',
    '/api/contractor/company-homeowners',
  ];
  app.use('/api/contractor', async (req: any, res: any, next: any) => {
    if (req.session?.isAuthenticated) {
      const u = req.session?.user;
      if (u && (['suspended', 'removed', 'pending_invite'].includes(u.status) || suspendedUserIds.has(u.id))) {
        return res.status(401).json({ message: "Account suspended. Contact your company administrator." });
      }
      if (u?.companyRole === 'tech') {
        const urlPath = req.originalUrl.split('?')[0];
        const allowed = TECH_ALLOWED_CONTRACTOR_PREFIXES.some(p => urlPath === p || urlPath.startsWith(p + '/'));
        if (!allowed) {
          return res.status(403).json({ message: "Forbidden - tech accounts cannot access this resource" });
        }
      }
      return next();
    }
    // OAuth path: check suspension for fully OAuth-authenticated users
    const oauthUserId: string | undefined = req.user?.claims?.sub;
    if (oauthUserId && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
      if (await isOAuthUserSuspended(oauthUserId)) {
        return res.status(401).json({ message: "Account suspended. Contact your company administrator." });
      }
    }
    next();
  });

  // Guard for all /api/crm/* routes:
  // Block suspended accounts and tech users (CRM is admin/owner only).
  app.use('/api/crm', async (req: any, res: any, next: any) => {
    if (req.session?.isAuthenticated) {
      const u = req.session?.user;
      if (u && (['suspended', 'removed', 'pending_invite'].includes(u.status) || suspendedUserIds.has(u.id))) {
        return res.status(401).json({ message: "Account suspended. Contact your company administrator." });
      }
      if (u?.companyRole === 'tech') {
        return res.status(403).json({ message: "Forbidden - tech accounts cannot access this resource" });
      }
      return next();
    }
    // OAuth path: check suspension for fully OAuth-authenticated users
    const oauthUserId: string | undefined = req.user?.claims?.sub;
    if (oauthUserId && typeof req.isAuthenticated === 'function' && req.isAuthenticated()) {
      if (await isOAuthUserSuspended(oauthUserId)) {
        return res.status(401).json({ message: "Account suspended. Contact your company administrator." });
      }
    }
    next();
  });

  // ========================================
  // STRIPE CONNECT - Contractor Payment Processing
  // ========================================

  // Create Stripe Connect account for contractor
  app.post('/api/contractor/stripe-connect/create', isAuthenticated, requireRole('contractor'), async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Check if account already exists
      if (company.stripeConnectAccountId) {
        return res.json({ accountId: company.stripeConnectAccountId, exists: true });
      }

      // Create Express account for contractor
      const account = await stripe!.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          companyId: company.id,
          userId: user.id,
        },
      });

      // Save account ID to company
      await storage.updateCompany(company.id, {
        stripeConnectAccountId: account.id,
      });

      console.log('[STRIPE CONNECT] Created account for company:', company.id, account.id);
      res.json({ accountId: account.id, exists: false });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe Connect onboarding link
  app.post('/api/contractor/stripe-connect/onboarding-link', isAuthenticated, requireRole('contractor'), async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company || !company.stripeConnectAccountId) {
        return res.status(400).json({ error: 'No Stripe Connect account. Create one first.' });
      }

      const baseUrl = req.headers.origin || `https://${req.headers.host}`;

      const accountLink = await stripe.accountLinks.create({
        account: company.stripeConnectAccountId,
        refresh_url: `${baseUrl}/crm?tab=billing&stripe_refresh=true`,
        return_url: `${baseUrl}/crm?tab=billing&stripe_success=true`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating onboarding link:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Stripe Connect account status
  app.get('/api/contractor/stripe-connect/status', isAuthenticated, requireNotSuspended(), requireRole('contractor'), async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      if (!company.stripeConnectAccountId) {
        return res.json({
          hasAccount: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      // Fetch account from Stripe to get current status
      const account = await stripe!.accounts.retrieve(company.stripeConnectAccountId);

      // Update company with latest status
      await storage.updateCompany(company.id, {
        stripeOnboardingComplete: account.details_submitted,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
      });

      res.json({
        hasAccount: true,
        accountId: company.stripeConnectAccountId,
        onboardingComplete: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error fetching status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe Connect dashboard link for contractor
  app.post('/api/contractor/stripe-connect/dashboard-link', isAuthenticated, requireRole('contractor'), async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company || !company.stripeConnectAccountId) {
        return res.status(400).json({ error: 'No Stripe Connect account' });
      }

      const loginLink = await stripe.accounts.createLoginLink(company.stripeConnectAccountId);

      res.json({ url: loginLink.url });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating dashboard link:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create payment link for invoice (contractor sends to homeowner)
  app.post('/api/crm/invoices/:invoiceId/payment-link', isAuthenticated, requireRole('contractor'), async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const { invoiceId } = req.params;
      const user = await storage.getUser(req.session.user.id);
      
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company || !company.stripeConnectAccountId || !company.stripeChargesEnabled) {
        return res.status(400).json({ error: 'Stripe Connect not set up or charges not enabled' });
      }

      // Get invoice
      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice || (invoice.contractorUserId !== user.id && invoice.companyId !== user.companyId)) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice is already paid' });
      }

      // Get client for email
      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const baseUrl = req.headers.origin || `https://${req.headers.host}`;
      const amountInCents = Math.round(parseFloat(invoice.total as string) * 100);

      // Create Checkout Session with connected account
      const session = await stripe!.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: invoice.title,
                description: `Invoice ${invoice.invoiceNumber}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          transfer_data: {
            destination: company.stripeConnectAccountId,
          },
          metadata: {
            invoiceId: invoice.id,
            companyId: company.id,
            clientId: client.id,
          },
        },
        customer_email: client.email || undefined,
        success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pay/cancelled?invoice=${invoiceId}`,
        metadata: {
          invoiceId: invoice.id,
          companyId: company.id,
          clientId: client.id,
          type: 'crm_invoice_payment',
        },
      });

      // Update invoice with payment link
      await storage.updateCrmInvoice(invoiceId, {
        status: 'sent',
        sentAt: new Date(),
      });

      res.json({ 
        paymentUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating payment link:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public payment page - get invoice details for payment
  app.get('/api/pay/invoice/:invoiceId', async (req: any, res: any) => {
    try {
      const { invoiceId } = req.params;

      // For now, allow access to invoice details for payment
      // In production, you'd want a signed token or session
      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      const contractor = await storage.getUser(invoice.contractorUserId);
      const company = invoice.companyId ? await storage.getCompany(invoice.companyId) : null;

      // Determine if the authenticated session user is the linked homeowner
      const sessionUserId: string | undefined = req.session?.user?.id;
      const canSaveToHistory = !!(invoice.homeownerId && sessionUserId && invoice.homeownerId === sessionUserId);

      res.json({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        description: invoice.description,
        status: invoice.status,
        totalAmount: invoice.total,
        dueDate: invoice.dueDate,
        lineItems: invoice.lineItems,
        clientName: client ? `${client.firstName || ''} ${client.lastName || ''}`.trim() || 'Customer' : 'Customer',
        contractorName: contractor?.firstName && contractor?.lastName 
          ? `${contractor.firstName} ${contractor.lastName}` 
          : contractor?.email,
        companyName: company?.name,
        companyLogo: company?.businessLogo,
        canSaveToHistory,
        houseId: canSaveToHistory ? (invoice.houseId || null) : null,
      });
    } catch (error: any) {
      console.error('[PAYMENT] Error fetching invoice:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process payment for invoice (creates checkout session)
  app.post('/api/pay/invoice/:invoiceId/checkout', async (req: any, res: any) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const { invoiceId } = req.params;
      const { customerEmail } = req.body;

      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice is already paid' });
      }

      const company = invoice.companyId ? await storage.getCompany(invoice.companyId) : null;
      if (!company || !company.stripeConnectAccountId || !company.stripeChargesEnabled) {
        return res.status(400).json({ error: 'Payment not available for this invoice' });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      const baseUrl = req.headers.origin || `https://${req.headers.host}`;
      const amountInCents = Math.round(parseFloat(invoice.total as string) * 100);

      const session = await stripe!.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: invoice.title,
                description: `Invoice ${invoice.invoiceNumber}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          transfer_data: {
            destination: company.stripeConnectAccountId,
          },
          metadata: {
            invoiceId: invoice.id,
            companyId: company.id,
            clientId: client?.id || '',
          },
        },
        customer_email: customerEmail || client?.email || undefined,
        success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pay/invoice/${invoiceId}`,
        metadata: {
          invoiceId: invoice.id,
          companyId: company.id,
          clientId: client?.id || '',
          type: 'crm_invoice_payment',
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error('[PAYMENT] Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Admin email list (server-side, not dependent on build-time env vars)
  const getAdminEmails = () => {
    const adminEmailsEnv = process.env.ADMIN_EMAILS || process.env.VITE_ADMIN_EMAILS || '';
    return adminEmailsEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  };

  const isUserAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    const adminEmails = getAdminEmails();
    return adminEmails.includes(email.toLowerCase());
  };

  // Auth routes
  app.get('/api/auth/user', async (req: any, res: any) => {
    try {
      // Check for session-based authentication (email/password login)
      if (req.session?.isAuthenticated && req.session?.user) {
        const userId = req.session.user.id;
        const freshUser = await storage.getUser(userId);
        
        if (!freshUser) {
          return res.status(401).json({ message: 'Unauthorized' });
        }
        
        if (!freshUser.hasOwnProperty('isPremium')) {
          (freshUser as any).isPremium = false;
        }
        
        const userWithAdmin = { ...freshUser, isAdmin: isUserAdmin(freshUser.email) };
        return res.json(userWithAdmin);
      }

      // Check for passport authentication (Google OAuth login)
      if (req.user) {
        const userId = (req.user as any).id || (req.user as any).claims?.sub;
        if (userId) {
          const fullUser = await storage.getUser(userId);
          
          if (fullUser) {
            req.session.isAuthenticated = true;
            req.session.user = fullUser;
            
            if (!fullUser.hasOwnProperty('isPremium')) {
              fullUser.isPremium = false;
            }
            
            const userWithAdmin = { ...fullUser, isAdmin: isUserAdmin(fullUser.email) };
            return res.json(userWithAdmin);
          }
        }
      }

      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching auth user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Demo logout
  app.post('/api/auth/logout', async (req: any, res: any) => {
    const userId = req.session?.user?.id;
    const userEmail = req.session?.user?.email;
    const userRole = req.session?.user?.role;
    const sessionSid = req.sessionID;
    
    // Log logout event before destroying session
    if (userId) {
      await auditLogger.logLogout(userId, userEmail || '', userRole || '', req);
      await sessionManager.terminateSession(sessionSid, 'logout');
    }
    
    req.logout((err: any) => {
      if (err) {
        console.error('Passport logout error:', err);
      }
      req.session.destroy((sessionErr: any) => {
        if (sessionErr) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.json({ success: true });
      });
    });
  });

  // Session management - Get user's active sessions
  app.get('/api/auth/sessions', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const sessions = await sessionManager.getActiveSessions(userId);
      
      // Mark current session
      const currentSessionSid = req.sessionID;
      const sessionsWithCurrent = sessions.map(session => ({
        id: session.id,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress?.replace(/\d+\.\d+$/, 'x.x'), // Partial IP for privacy
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
        isCurrent: session.sessionSid === currentSessionSid,
      }));

      res.json(sessionsWithCurrent);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Session management - Revoke a specific session
  app.delete('/api/auth/sessions/:sessionId', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const { sessionId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verify the session belongs to this user
      const sessions = await sessionManager.getActiveSessions(userId);
      const session = sessions.find(s => s.id.toString() === sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Don't allow revoking current session via this endpoint
      if (session.sessionSid === req.sessionID) {
        return res.status(400).json({ message: "Cannot revoke current session. Use logout instead." });
      }

      await sessionManager.terminateSession(session.sessionSid, 'user_revoked');
      
      // Log session revocation
      await auditLogger.log({
        eventType: AuditEventTypes.AUTH_LOGOUT,
        action: 'Session revoked by user',
        userId,
        userEmail: req.session.user.email || '',
        userRole: req.session.user.role || '',
        req,
        responseStatus: 200,
        metadata: { revokedSessionId: sessionId },
      });

      res.json({ success: true, message: "Session revoked" });
    } catch (error) {
      console.error("Error revoking session:", error);
      res.status(500).json({ message: "Failed to revoke session" });
    }
  });

  // Session management - Revoke all other sessions
  app.post('/api/auth/sessions/revoke-all', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const currentSessionSid = req.sessionID;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      await sessionManager.terminateAllUserSessions(userId, currentSessionSid, 'user_revoked_all');
      
      // Log bulk session revocation
      await auditLogger.log({
        eventType: AuditEventTypes.AUTH_LOGOUT,
        action: 'All other sessions revoked by user',
        userId,
        userEmail: req.session.user.email || '',
        userRole: req.session.user.role || '',
        req,
        responseStatus: 200,
        severity: 'warning',
      });

      res.json({ success: true, message: "All other sessions revoked" });
    } catch (error) {
      console.error("Error revoking sessions:", error);
      res.status(500).json({ message: "Failed to revoke sessions" });
    }
  });

  // GET logout endpoint for direct navigation
  app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.redirect('/?error=logout-failed');
      }
      res.redirect('/');
    });
  });

  // Cancel account endpoint
  app.delete('/api/account', async (req: any, res: any) => {
    try {
      // Check authentication
      const userId = req.session?.user?.id || (req.user as any)?.id;
      const userRole = req.session?.user?.role || (req.user as any)?.role;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cancel the account
      const result = await storage.cancelUserAccount(userId, userRole);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      // Log out the user after cancellation
      req.logout((err: any) => {
        if (err) {
          console.error('Logout error after account cancellation:', err);
        }
        req.session.destroy((sessionErr: any) => {
          if (sessionErr) {
            console.error('Session destruction error:', sessionErr);
          }
          res.json({ success: true, message: result.message });
        });
      });
    } catch (error) {
      console.error('Error cancelling account:', error);
      res.status(500).json({ message: 'Failed to cancel account' });
    }
  });

  // Refresh session data from database (fixes stale sessions)
  app.post('/api/auth/refresh-session', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const freshUser = await storage.getUser(userId);
      
      if (!freshUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update session with fresh data from database
      req.session.user = freshUser;
      
      req.session.save((err: any) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Failed to refresh session" });
        }
        console.log(`[SESSION REFRESH] Updated session for ${freshUser.email} with companyId: ${freshUser.companyId}`);
        res.json({ success: true, user: freshUser });
      });
    } catch (error) {
      console.error("Error refreshing session:", error);
      res.status(500).json({ message: "Failed to refresh session" });
    }
  });

  // Generate unique referral code utility function
  async function generateUniqueReferralCode(storage: Pick<IStorage, 'getUserByReferralCode'>): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
    let attempts = 0;
    
    while (attempts < 10) {
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code already exists
      const existing = await storage.getUserByReferralCode(code);
      if (!existing) {
        return code;
      }
      attempts++;
    }
    
    throw new Error('Failed to generate unique referral code');
  }

  // Get current user data
  app.get('/api/user', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(user);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Get user's billing history (subscription cycle events)
  app.get('/api/billing-history', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const events = await storage.getSubscriptionCycleEvents(userId);
      
      // Sort by period start date, most recent first
      const sortedEvents = events.sort((a, b) => 
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      );

      return res.json(sortedEvents);
    } catch (error: any) {
      console.error('Error fetching billing history:', error);
      return res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // Create Stripe Checkout Session for subscription
  app.post('/api/create-subscription-checkout', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { plan, trialMode } = req.body;

      // Validate plan
      const validHomeownerPlans = ['base', 'premium', 'premium_plus'];
      const validContractorPlans = ['basic', 'pro'];
      
      if (userRole === 'homeowner' && !validHomeownerPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan for homeowner" });
      }
      if (userRole === 'contractor' && !validContractorPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan for contractor" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Define pricing for each plan
      const pricing: Record<string, { price: number; name: string; maxHouses?: number }> = {
        base: { price: 500, name: 'HomeBase Base Plan', maxHouses: 2 },
        premium: { price: 2000, name: 'HomeBase Premium Plan', maxHouses: 6 },
        premium_plus: { price: 4000, name: 'HomeBase Premium Plus Plan', maxHouses: 999 },
        basic: { price: 2000, name: 'HomeBase Contractor Basic Plan' },
        pro: { price: 4000, name: 'HomeBase Contractor Pro Plan' },
      };

      const selectedPlan = pricing[plan];
      if (!selectedPlan) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      // Get or create Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        console.log(`[SUBSCRIPTION] Creating Stripe customer for user ${user.email}`);
        const customer = await stripe!.customers.create({
          email: user.email ?? undefined,
          name: `${user.firstName} ${user.lastName}`,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;
        console.log(`[SUBSCRIPTION] Created Stripe customer ${stripeCustomerId} for user ${user.email}`);
        await storage.upsertUser({ ...user, stripeCustomerId });
        console.log(`[SUBSCRIPTION] Saved Stripe customer ID to database for user ${user.email}`);
      } else {
        console.log(`[SUBSCRIPTION] Using existing Stripe customer ${stripeCustomerId} for user ${user.email}`);
      }

      // Determine base URL for redirect
      const baseUrl = req.headers.origin || `https://${req.headers.host}`;

      // Create Stripe Checkout Session for subscription
      const session = await stripe!.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: selectedPlan.name,
                description: userRole === 'homeowner' 
                  ? `Manage up to ${selectedPlan.maxHouses === 999 ? 'unlimited' : selectedPlan.maxHouses} properties`
                  : plan === 'pro' ? 'Full CRM access with analytics' : 'Lead management and basic CRM',
              },
              unit_amount: selectedPlan.price,
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
          plan: plan,
          maxHouses: selectedPlan.maxHouses?.toString() || '',
        },
        ...(trialMode ? {
          subscription_data: {
            trial_period_days: 14,
            metadata: { userId: user.id, plan },
          },
        } : {}),
        success_url: `${baseUrl}/subscription-success?role=${userRole}${trialMode ? '&trial=true' : ''}`,
        cancel_url: `${baseUrl}/${userRole === 'homeowner' ? 'homeowner-pricing?onboarding=true' : 'contractor-dashboard'}?subscription=cancelled`,
      });

      console.log(`[SUBSCRIPTION] Created checkout session for user ${user.email}, plan: ${plan}`);
      return res.json({ url: session.url });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Error creating checkout session:', error);
      return res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  // Apple StoreKit In-App Purchase verification (Task #287) — client sends the
  // signed StoreKit 2 transaction (JWS) after a native purchase completes.
  app.post('/api/apple/verify-purchase', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const { signedTransactionInfo } = req.body;

      console.log(`[APPLE-IAP] /api/apple/verify-purchase called by user ${userId}`);

      if (!signedTransactionInfo || typeof signedTransactionInfo !== 'string') {
        console.error(`[APPLE-IAP] Missing/invalid signedTransactionInfo in request body from user ${userId}`);
        return res.status(400).json({ message: "Missing signedTransactionInfo" });
      }

      const { user, transaction } = await verifyAndActivateAppleTransaction(userId, signedTransactionInfo);

      console.log(`[APPLE-IAP] verify-purchase SUCCESS for user ${userId}, productId=${transaction.productId}`);
      return res.json({
        verified: true,
        subscriptionStatus: user.subscriptionStatus,
        productId: transaction.productId,
      });
    } catch (error: any) {
      const statusCode = error instanceof AppleIapError ? error.statusCode : 500;
      console.error(`[APPLE-IAP] verify-purchase FAILED for user ${req.session?.user?.id}:`, error?.message || error);
      return res.status(statusCode).json({ message: error?.message || "Failed to verify purchase" });
    }
  });

  // Apple StoreKit restore — client resends each restored transaction's JWS
  // through the same verification path used for a fresh purchase.
  app.post('/api/apple/restore', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const { signedTransactionInfos } = req.body;

      console.log(`[APPLE-IAP] /api/apple/restore called by user ${userId} with ${Array.isArray(signedTransactionInfos) ? signedTransactionInfos.length : 0} transaction(s)`);

      if (!Array.isArray(signedTransactionInfos) || signedTransactionInfos.length === 0) {
        return res.status(400).json({ message: "Missing signedTransactionInfos" });
      }

      let restored = false;
      let lastResult: { subscriptionStatus: string; productId: string } | null = null;

      for (const signedTransactionInfo of signedTransactionInfos) {
        try {
          const { user, transaction } = await verifyAndActivateAppleTransaction(userId, signedTransactionInfo);
          restored = true;
          lastResult = { subscriptionStatus: user.subscriptionStatus ?? 'inactive', productId: transaction.productId };
          console.log(`[APPLE-IAP] restore: activated productId=${transaction.productId} for user ${userId}`);
        } catch (innerError: any) {
          console.warn(`[APPLE-IAP] restore: skipped one transaction for user ${userId}:`, innerError?.message || innerError);
        }
      }

      if (!restored) {
        return res.status(404).json({ message: "No valid purchases found to restore" });
      }

      return res.json({ restored: true, ...lastResult });
    } catch (error: any) {
      console.error(`[APPLE-IAP] restore FAILED for user ${req.session?.user?.id}:`, error?.message || error);
      return res.status(500).json({ message: "Failed to restore purchases" });
    }
  });

  // Apple Server-to-Server Notifications V2 webhook — no auth (Apple calls this directly).
  // Configured in App Store Connect. Signature is verified inside handleAppleServerNotification.
  app.post('/api/apple/notifications', express.json(), async (req: any, res: any) => {
    try {
      const signedPayload = req.body?.signedPayload;
      console.log(`[APPLE-IAP] /api/apple/notifications received, has signedPayload=${!!signedPayload}`);

      if (!signedPayload || typeof signedPayload !== 'string') {
        console.error('[APPLE-IAP] /api/apple/notifications: missing signedPayload');
        return res.status(400).json({ message: "Missing signedPayload" });
      }

      await handleAppleServerNotification(signedPayload);
      console.log('[APPLE-IAP] /api/apple/notifications processed successfully');
      return res.status(200).json({ received: true });
    } catch (error: any) {
      console.error('[APPLE-IAP] /api/apple/notifications FAILED:', error?.message || error);
      // Return 200 to prevent Apple from retry-storming on our own bugs, but log loudly.
      return res.status(200).json({ received: true, error: 'internal_processing_error' });
    }
  });

  // Sync subscription status from Stripe - called after successful checkout to ensure DB is updated
  app.post('/api/sync-subscription', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // If no Stripe customer ID, nothing to sync
      if (!user.stripeCustomerId) {
        console.log(`[SYNC] No Stripe customer ID for user ${user.email}`);
        return res.json({ synced: false, message: "No Stripe customer found" });
      }
      
      // Get customer's subscriptions from Stripe
      const subscriptions = await stripe!.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'active',
        limit: 1,
      });
      
      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        
        // Update user's subscription status
        await storage.updateUserStripeSubscription(userId, subscription.id, subscription.items.data[0]?.price.id || '');
        await storage.updateUserSubscriptionStatus(userId, 'active');
        
        // Update max houses based on subscription metadata or price
        const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;
        let maxHouses = 2; // Base plan default
        
        if (priceAmount >= 4000) {
          maxHouses = 999; // Premium Plus - unlimited
        } else if (priceAmount >= 2000) {
          maxHouses = 6; // Premium
        }
        
        if (user.role === 'homeowner') {
          await storage.upsertUser({
            ...user,
            subscriptionStatus: 'active',
            maxHousesAllowed: maxHouses === 999 ? null : maxHouses,
          });
        } else if (user.role === 'contractor') {
          await storage.upsertUser({
            ...user,
            subscriptionStatus: 'active',
            subscriptionTier: priceAmount >= 4000 ? 'contractor_pro' : 'contractor_basic',
          } as any);
        }
        
        console.log(`[SYNC] Subscription synced for user ${user.email}, status: active`);
        return res.json({ synced: true, status: 'active' });
      }
      
      // Check for trialing subscriptions
      const trialingSubscriptions = await stripe!.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'trialing',
        limit: 1,
      });
      
      if (trialingSubscriptions.data.length > 0) {
        const subscription = trialingSubscriptions.data[0];
        await storage.updateUserStripeSubscription(userId, subscription.id, subscription.items.data[0]?.price.id || '');
        await storage.updateUserSubscriptionStatus(userId, 'trialing');
        
        console.log(`[SYNC] Subscription synced for user ${user.email}, status: trialing`);
        return res.json({ synced: true, status: 'trialing' });
      }
      
      console.log(`[SYNC] No active subscription found for user ${user.email}`);
      return res.json({ synced: false, message: "No active subscription" });
    } catch (error: any) {
      console.error('[SYNC] Error syncing subscription:', error);
      return res.status(500).json({ message: "Failed to sync subscription" });
    }
  });

  // Admin: Manually sync a user's subscription by looking up their Stripe customer by email
  app.post('/api/admin/sync-user-subscription', async (req: any, res: any) => {
    try {
      // Check admin access
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
      const sessionUser = await storage.getUser(req.session.user.id);
      if (!sessionUser || !adminEmails.includes(sessionUser.email?.toLowerCase() || '')) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { userEmail } = req.body;
      if (!userEmail) {
        return res.status(400).json({ message: "User email is required" });
      }

      // Find user in our database
      const user = await storage.getUserByEmail(userEmail);
      if (!user) {
        return res.status(404).json({ message: "User not found in database" });
      }

      // Search for Stripe customer by email
      const customers = await stripe!.customers.list({
        email: userEmail,
        limit: 1,
      });

      if (customers.data.length === 0) {
        return res.json({ synced: false, message: "No Stripe customer found for this email" });
      }

      const stripeCustomer = customers.data[0];
      
      // Save Stripe customer ID if not already saved
      if (!user.stripeCustomerId || user.stripeCustomerId !== stripeCustomer.id) {
        await storage.upsertUser({ ...user, stripeCustomerId: stripeCustomer.id });
        console.log(`[ADMIN-SYNC] Updated Stripe customer ID for ${userEmail}: ${stripeCustomer.id}`);
      }

      // Get customer's active subscriptions
      const subscriptions = await stripe!.subscriptions.list({
        customer: stripeCustomer.id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length > 0) {
        const subscription = subscriptions.data[0];
        
        await storage.updateUserStripeSubscription(user.id, subscription.id, subscription.items.data[0]?.price.id || '');
        await storage.updateUserSubscriptionStatus(user.id, 'active');
        
        // Update max houses based on price
        const priceAmount = subscription.items.data[0]?.price.unit_amount || 0;
        let maxHouses = 2;
        
        if (priceAmount >= 4000) {
          maxHouses = 999;
        } else if (priceAmount >= 2000) {
          maxHouses = 6;
        }
        
        if (user.role === 'homeowner') {
          await storage.upsertUser({
            ...user,
            stripeCustomerId: stripeCustomer.id,
            subscriptionStatus: 'active',
            maxHousesAllowed: maxHouses === 999 ? null : maxHouses,
          });
        } else if (user.role === 'contractor') {
          await storage.upsertUser({
            ...user,
            stripeCustomerId: stripeCustomer.id,
            subscriptionStatus: 'active',
            subscriptionTier: priceAmount >= 4000 ? 'contractor_pro' : 'contractor_basic',
          } as any);
        }
        
        console.log(`[ADMIN-SYNC] Subscription synced for ${userEmail}, status: active, price: ${priceAmount}`);
        return res.json({ 
          synced: true, 
          status: 'active',
          stripeCustomerId: stripeCustomer.id,
          subscriptionId: subscription.id,
          priceAmount: priceAmount / 100
        });
      }

      console.log(`[ADMIN-SYNC] No active subscription found for ${userEmail}`);
      return res.json({ 
        synced: false, 
        message: "No active subscription found",
        stripeCustomerId: stripeCustomer.id
      });
    } catch (error: any) {
      console.error('[ADMIN-SYNC] Error:', error);
      return res.status(500).json({ message: "Failed to sync subscription" });
    }
  });

  // Get or create user's referral code
  app.get('/api/user/referral-code', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Real estate agents use the cash-payout affiliate model — return basic referral info only
      if (user.role === 'agent') {
        if (!user.referralCode) {
          const newCode = await generateUniqueReferralCode(storage);
          user = await storage.upsertUser({ ...user, referralCode: newCode });
        }
        return res.json({
          referralCode: user.referralCode,
          referralCount: user.referralCount || 0,
          referralLink: `${req.protocol}://${req.get('host')}/invite/${user.referralCode}`,
        });
      }

      // Resolve plan details for this user (homeowners + contractors only)
      let referralCreditCap = 5; // default threshold (# credits needed for a free month)
      let tierName = user.role === 'contractor' ? 'contractor' : 'homeowner';
      let monthlyPrice = 5;

      if (user.subscriptionPlanId) {
        const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.subscriptionPlanId)).limit(1);
        if (plans.length > 0) {
          tierName = plans[0].tierName || tierName;
          if (plans[0].referralCreditCap) referralCreditCap = parseFloat(plans[0].referralCreditCap);
          if (plans[0].monthlyPrice) monthlyPrice = parseFloat(plans[0].monthlyPrice);
        }
      } else if ((user as any).subscriptionTierName === 'contractor_pro') {
        referralCreditCap = 40;
        tierName = 'contractor_pro';
      }

      // Threshold for homeowners = monthly subscription cost (1 credit per referral per month)
      if (user.role === 'homeowner') {
        referralCreditCap = monthlyPrice || referralCreditCap;
      }

      // Credit stats from DB
      const [earnedRows, pendingFreeMonths, allFreeMonths, activeReferralRows] = await Promise.all([
        // Sum credit_amount for 'earned' credits (handles non-$1 bonus/promo credits correctly)
        db.select({ total: drizzleSql<number>`COALESCE(SUM(credit_amount), 0)` })
          .from(referralCredits)
          .where(and(eq(referralCredits.referrerUserId, userId), eq(referralCredits.status, 'earned'))),
        // Count pending free months (earned but not yet applied)
        db.select({ count: drizzleSql<number>`count(*)` })
          .from(referralFreeMonths)
          .where(and(eq(referralFreeMonths.userId, userId), eq(referralFreeMonths.status, 'pending'))),
        // Count all free months ever earned
        db.select({ count: drizzleSql<number>`count(*)` })
          .from(referralFreeMonths)
          .where(eq(referralFreeMonths.userId, userId)),
        // Count active referrals: unique referred users who are currently paying (active or trialing)
        db.execute(drizzleSql`
          SELECT COUNT(DISTINCT rc.referred_user_id)::int AS count
          FROM referral_credits rc
          INNER JOIN users u ON rc.referred_user_id = u.id
          WHERE rc.referrer_user_id = ${userId}
            AND u.subscription_status IN ('active', 'trialing')
        `),
      ]);

      const creditBalance = Number(earnedRows[0]?.total || 0);
      const freeMonthsPending = Number(pendingFreeMonths[0]?.count || 0);
      const freeMonthsTotal = Number(allFreeMonths[0]?.count || 0);
      const activeReferrals = Number((activeReferralRows.rows[0] as { count: number } | undefined)?.count || 0);
      const rawReferralCount = user.referralCount || 0;

      // For contractors, use the company's referral code instead of personal code
      if (user.role === 'contractor' && user.companyId) {
        const company = await storage.getCompany(user.companyId);
        if (company) {
          if (!company.referralCode) {
            const newCode = await generateUniqueReferralCode(storage);
            await storage.updateCompany(user.companyId, { referralCode: newCode });
            return res.json({
              referralCode: newCode,
              referralCount: rawReferralCount,
              creditBalance,
              creditsNeeded: referralCreditCap,
              freeMonthsPending,
              freeMonthsTotal,
              activeReferrals,
              tierName,
              referralLink: `${req.protocol}://${req.get('host')}/invite/${newCode}`,
              // Legacy fields for contractor-referral.tsx backward compat
              earnedCredits: creditBalance,
              currentCredits: creditBalance,
              referralCreditCap,
            });
          }
          return res.json({
            referralCode: company.referralCode,
            referralCount: rawReferralCount,
            creditBalance,
            creditsNeeded: referralCreditCap,
            freeMonthsPending,
            freeMonthsTotal,
            activeReferrals,
            tierName,
            referralLink: `${req.protocol}://${req.get('host')}/invite/${company.referralCode}`,
            // Legacy fields for contractor-referral.tsx backward compat
            earnedCredits: creditBalance,
            currentCredits: creditBalance,
            referralCreditCap,
          });
        }
      }

      // For homeowners and agents — use personal referral code
      if (!user.referralCode) {
        const newCode = await generateUniqueReferralCode(storage);
        user = await storage.upsertUser({ ...user, referralCode: newCode });
        req.session.user = { ...req.session.user, referralCode: newCode };
      }

      res.json({
        referralCode: user.referralCode,
        referralCount: rawReferralCount,
        creditBalance,
        creditsNeeded: referralCreditCap,
        freeMonthsPending,
        freeMonthsTotal,
        activeReferrals,
        tierName,
        referralLink: `${req.protocol}://${req.get('host')}/invite/${user.referralCode}`,
        // Legacy fields for backward compat
        earnedCredits: creditBalance,
        currentCredits: creditBalance,
        referralCreditCap,
      });
    } catch (error) {
      console.error("Error getting referral code:", error);
      res.status(500).json({ message: "Failed to get referral code" });
    }
  });

  // Get referral information by code (for invite page)
  app.get('/api/referrals/:code', async (req: any, res: any) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ message: "Referral code is required" });
      }
      
      const user = await storage.getUserByReferralCode(code);
      
      if (!user) {
        return res.status(404).json({ message: "Invalid referral code" });
      }
      
      // Return only the first name and role for privacy
      return res.json({ 
        firstName: user.firstName || 'A friend',
        role: user.role
      });
    } catch (error) {
      console.error("Error getting referral info:", error);
      res.status(500).json({ message: "Failed to get referral information" });
    }
  });

  // Push notification routes — requires authentication; no demo-user fallback
  app.use('/api/push', isAuthenticated, requireNotSuspended(), pushRoutes);

  // File upload routes
  const objectStorageService = new ObjectStorageService();

  // Get upload URL for proposal attachments
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res: any) => {
    try {
      const { fileType = "proposal" } = req.body;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(fileType);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Serve uploaded files
  app.get("/objects/*objectPath", isAuthenticated, async (req: any, res: any) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Message image upload endpoint
  app.post('/api/upload/message-image', isAuthenticated, async (req: any, res: any) => {
    try {
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: 'Missing imageData' });
      }
      
      // Upload image
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = imageData.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `public/message-images/${filename}`;
      
      await objectStorageService.uploadFile(path, buffer, `image/${fileExtension}`);
      const url = `/public/message-images/${filename}`;
      
      res.json({ success: true, url });
    } catch (error: any) {
      console.error('[MESSAGE IMAGE UPLOAD ERROR]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Universal file upload endpoint for messages and proposals
  app.post('/api/upload/files', isAuthenticated, async (req: any, res: any) => {
    try {
      const { files } = req.body; // files is an array of { fileData: base64, fileName: string, fileType: string }
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Missing files array' });
      }
      
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const { fileData, fileName, fileType } = file;
        
        if (!fileData || !fileName) {
          continue; // Skip invalid files
        }
        
        // Extract base64 data (remove data:...;base64, prefix if present)
        const base64Data = fileData.includes('base64,') 
          ? fileData.split('base64,')[1] 
          : fileData;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Get file extension from fileName or fileType
        const fileExtension = fileName.split('.').pop() || 'bin';
        const uniqueFilename = `${randomUUID()}.${fileExtension}`;
        const path = `public/attachments/${uniqueFilename}`;
        
        // Determine MIME type
        let mimeType = fileType || 'application/octet-stream';
        if (fileExtension === 'pdf') mimeType = 'application/pdf';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
          mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
        } else if (['doc', 'docx'].includes(fileExtension)) {
          mimeType = 'application/msword';
        }
        
        await objectStorageService.uploadFile(path, buffer, mimeType);
        uploadedUrls.push(`/public/attachments/${uniqueFilename}`);
      }
      
      res.json({ success: true, urls: uploadedUrls });
    } catch (error: any) {
      console.error('[FILE UPLOAD ERROR]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Simple homeowner demo login with realistic profile
  app.post('/api/auth/homeowner-demo-login', authLimiter, async (req: any, res: any) => {
    try {
      const { user, seedResults } = await seedHomeownerDemo(req.log);
      
      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          req.log.error({ err }, '[DEMO] Session regeneration error');
          return res.status(500).json({ message: "Session error" });
        }
        
        req.session.isAuthenticated = true;
        req.session.user = user;
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            req.log.error({ err: saveErr }, '[DEMO] Session save error');
            return res.status(500).json({ message: "Failed to save session" });
          }
          req.log.info({ userId: user.id }, '[DEMO LOGIN] Homeowner session saved successfully');
          const failedSections = Object.entries(seedResults).filter(([, v]) => !v.ok).map(([k]) => k);
          const responseBody: Record<string, unknown> = { success: true, user };
          if (process.env.NODE_ENV !== 'production') {
            responseBody._seedStatus = { seedResults, failedSections };
          }
          res.json(responseBody);
        });
      });
    } catch (error) {
      console.error("Error creating homeowner demo user:", error);
      res.status(500).json({ message: "Failed to create homeowner account" });
    }
  });

  // GET version — browser navigation, sets session and redirects
  app.get('/api/auth/homeowner-demo-login', authLimiter, async (req: any, res: any) => {
    try {
      const demoId = 'demo-homeowner-permanent-id';
      const demoEmail = 'sarah.anderson@homebase.com';
      let user = await storage.getUserByEmail(demoEmail);
      if (!user) {
        user = await storage.upsertUser({
          id: demoId, email: demoEmail, firstName: 'Sarah', lastName: 'Anderson',
          profileImageUrl: null, role: 'homeowner', zipCode: '98101',
          subscriptionStatus: 'trialing',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          maxHousesAllowed: 2, connectionCode: 'DEMO4567'
        });
      }

      // Fire-and-forget task completion top-up
      topUpHomeownerTaskCompletions().catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        req.log.error({ error: msg }, '[DEMO LOGIN GET] Task top-up failed (non-fatal)');
      });

      req.session.regenerate((err: any) => {
        if (err) return res.redirect('/homeowner?demo_error=1');
        req.session.isAuthenticated = true;
        req.session.user = user;
        req.session.save((saveErr: any) => {
          if (saveErr) return res.redirect('/homeowner?demo_error=1');
          console.log('[DEMO LOGIN GET] Homeowner session saved, redirecting');
          res.redirect('/dashboard');
        });
      });
    } catch (error) {
      console.error("Error in GET homeowner demo login:", error);
      res.redirect('/homeowner?demo_error=1');
    }
  });

  // Simple contractor demo login with realistic company profile
  app.post('/api/auth/contractor-demo-login', authLimiter, async (req: any, res: any) => {
    try {
      const { user, seedResults } = await seedContractorDemo(req.log);
      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          req.log.error({ err }, '[DEMO] Session regeneration error');
          return res.status(500).json({ message: "Session error" });
        }
        
        req.session.isAuthenticated = true;
        req.session.user = user;
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            req.log.error({ err: saveErr }, '[DEMO] Session save error');
            return res.status(500).json({ message: "Failed to save session" });
          }
          req.log.info({ userId: user.id }, '[DEMO LOGIN] Contractor session saved successfully');
          const failedSections = Object.entries(seedResults).filter(([, v]) => !v.ok).map(([k]) => k);
          const responseBody: Record<string, unknown> = { success: true, user };
          if (process.env.NODE_ENV !== 'production') {
            responseBody._seedStatus = { seedResults, failedSections };
          }
          res.json(responseBody);
        });
      });
    } catch (error) {
      console.error("Error creating contractor demo user:", error);
      res.status(500).json({ message: "Failed to create contractor account" });
    }
  });

  // GET version — browser navigation, sets session and redirects
  app.get('/api/auth/contractor-demo-login', authLimiter, async (req: any, res: any) => {
    try {
      const demoEmail = 'david.martinez@precisionhvac.com';
      let user = await storage.getUserByEmail(demoEmail);
      if (!user) return res.redirect('/contractor?demo_error=1');
      req.session.regenerate((err: any) => {
        if (err) return res.redirect('/contractor?demo_error=1');
        req.session.isAuthenticated = true;
        req.session.user = user;
        req.session.save((saveErr: any) => {
          if (saveErr) return res.redirect('/contractor?demo_error=1');
          console.log('[DEMO LOGIN GET] Contractor session saved, redirecting');
          res.redirect('/dashboard');
        });
      });
    } catch (error) {
      console.error("Error in GET contractor demo login:", error);
      res.redirect('/contractor?demo_error=1');
    }
  });

  // Reset demo conversations — deletes and re-seeds the demo contractor's message threads
  // Only accessible to the demo contractor account; idempotent and safe to call repeatedly.
  app.post('/api/auth/contractor-demo-reset-conversations', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId: string = req.session.user.id;
      const DEMO_CONTRACTOR_ID = 'demo-contractor-permanent-id';

      if (userId !== DEMO_CONTRACTOR_ID) {
        return res.status(403).json({ message: 'Only the demo contractor account can reset demo conversations.' });
      }

      const sampleHomeownerIds = ['sample-homeowner-1', 'sample-homeowner-2', 'sample-homeowner-3'];

      // Ensure sample homeowners exist (upsert so this is always safe)
      const homeownerProfiles = [
        { id: sampleHomeownerIds[0], email: 'homeowner1@example.com', firstName: 'Emma', lastName: 'Wilson' },
        { id: sampleHomeownerIds[1], email: 'homeowner2@example.com', firstName: 'James', lastName: 'Brown' },
        { id: sampleHomeownerIds[2], email: 'homeowner3@example.com', firstName: 'Sophia', lastName: 'Davis' },
      ];
      for (const ho of homeownerProfiles) {
        await storage.upsertUser({ ...ho, role: 'homeowner', zipCode: '98105', subscriptionStatus: 'active' });
      }

      // Step 1: find existing conversation IDs for this contractor
      const existingConvRows = await db.select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.contractorId, DEMO_CONTRACTOR_ID));
      const existingConvIds = existingConvRows.map(r => r.id);

      // Step 2: delete messages belonging to those conversations, then the conversations themselves
      if (existingConvIds.length > 0) {
        await db.delete(messages).where(inArray(messages.conversationId, existingConvIds));
        await db.delete(conversations).where(inArray(conversations.id, existingConvIds));
      }

      // Step 3: re-seed the two demo conversations
      const conv1Id = 'demo-conversation-1';
      await db.insert(conversations).values({
        id: conv1Id,
        homeownerId: sampleHomeownerIds[0],
        contractorId: DEMO_CONTRACTOR_ID,
        subject: 'HVAC furnace inspection inquiry'
      }).onConflictDoNothing();

      await db.insert(messages).values([
        {
          id: 'demo-msg-1-1',
          conversationId: conv1Id,
          senderId: sampleHomeownerIds[0],
          senderType: 'homeowner',
          message: 'Hi David! My furnace is making a strange rattling noise when it starts up. It\'s about 8 years old. Could you take a look at it? I\'m located in Fremont.',
          createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'demo-msg-1-2',
          conversationId: conv1Id,
          senderId: DEMO_CONTRACTOR_ID,
          senderType: 'contractor',
          message: 'Hello Emma! I\'d be happy to help. A rattling noise often indicates a loose component or debris in the blower. I can come by this Thursday or Friday afternoon. Would either of those work for you?',
          createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'demo-msg-1-3',
          conversationId: conv1Id,
          senderId: sampleHomeownerIds[0],
          senderType: 'homeowner',
          message: 'Friday at 2pm would be perfect! What\'s your service call fee?',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'demo-msg-1-4',
          conversationId: conv1Id,
          senderId: DEMO_CONTRACTOR_ID,
          senderType: 'contractor',
          message: 'Great! Friday at 2pm is booked. Our diagnostic service call is $125, which includes the first hour of labor. If repairs are needed, I\'ll provide an estimate before starting any work. See you Friday!',
          createdAt: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000)
        },
      ]).onConflictDoNothing();

      const conv2Id = 'demo-conversation-2';
      await db.insert(conversations).values({
        id: conv2Id,
        homeownerId: sampleHomeownerIds[1],
        contractorId: DEMO_CONTRACTOR_ID,
        subject: 'Water heater installation follow-up'
      }).onConflictDoNothing();

      await db.insert(messages).values([
        {
          id: 'demo-msg-2-1',
          conversationId: conv2Id,
          senderId: DEMO_CONTRACTOR_ID,
          senderType: 'contractor',
          message: 'Hi James! Just following up on the water heater installation we completed last month. Is everything working well? Remember that your 1-year labor warranty covers any installation issues.',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'demo-msg-2-2',
          conversationId: conv2Id,
          senderId: sampleHomeownerIds[1],
          senderType: 'homeowner',
          message: 'Everything is great! The tankless system is working perfectly. We love the endless hot water. Thanks for the quality work - I\'ve already recommended you to two neighbors!',
          createdAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000)
        },
      ]).onConflictDoNothing();

      req.log.info({ userId }, '[DEMO] Demo conversations reset and re-seeded successfully');
      res.json({ success: true, message: 'Demo conversations reset successfully.' });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      req.log.error({ error: msg }, '[DEMO] Error resetting demo conversations');
      res.status(500).json({ message: 'Failed to reset demo conversations.' });
    }
  });

  // Simple agent demo login with realistic agent profile
  app.post('/api/auth/agent-demo-login', authLimiter, async (req: any, res: any) => {
    try {
      const { user, seedResults } = await seedAgentDemo(req.log);
      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          req.log.error({ err }, '[DEMO] Session regeneration error');
          return res.status(500).json({ message: "Session error" });
        }
        
        req.session.isAuthenticated = true;
        req.session.user = user;
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            req.log.error({ err: saveErr }, '[DEMO] Session save error');
            return res.status(500).json({ message: "Failed to save session" });
          }
          req.log.info({ userId: user.id }, '[DEMO LOGIN] Agent session saved successfully');
          const failedSections = Object.entries(seedResults).filter(([, v]) => !v.ok).map(([k]) => k);
          const responseBody: Record<string, unknown> = { success: true, user };
          if (process.env.NODE_ENV !== 'production') {
            responseBody._seedStatus = { seedResults, failedSections };
          }
          res.json(responseBody);
        });
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      req.log.warn({ section: 'agent-referrals', error: msg }, '[DEMO] Error creating agent demo user');
      res.status(500).json({ message: "Failed to create agent account" });
    }
  });

  // GET version — browser navigation, sets session and redirects
  app.get('/api/auth/agent-demo-login', authLimiter, async (req: any, res: any) => {
    try {
      const demoEmail = 'jessica.roberts@ellisonrealty.com';
      let user = await storage.getUserByEmail(demoEmail);
      if (!user) return res.redirect('/agent?demo_error=1');
      req.session.regenerate((err: any) => {
        if (err) return res.redirect('/agent?demo_error=1');
        req.session.isAuthenticated = true;
        req.session.user = user;
        req.session.save((saveErr: any) => {
          if (saveErr) return res.redirect('/agent?demo_error=1');
          console.log('[DEMO LOGIN GET] Agent session saved, redirecting');
          res.redirect('/dashboard');
        });
      });
    } catch (error) {
      console.error("Error in GET agent demo login:", error);
      res.redirect('/agent?demo_error=1');
    }
  });

  // Email/password registration
  app.post('/api/auth/register', authLimiter, async (req: any, res: any) => {
    try {
      const { 
        email, password, firstName, lastName, role, zipCode, inviteCode, referralCode,
        companyName, companyBio, companyPhone
      } = req.body;
      
      if (!email || !password || !firstName || !lastName || !role || !zipCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate role
      if (!['homeowner', 'contractor', 'agent'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be homeowner, contractor, or agent" });
      }

      // Validate contractor company requirements - must create a company
      if (role === 'contractor') {
        if (!companyName || !companyBio || !companyPhone) {
          return res.status(400).json({ message: "Company name, bio, and phone are required for contractors" });
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check for duplicate email
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Validate homeowner invite code if provided
      if (inviteCode && role === 'homeowner') {
        const isValid = await storage.validateAndUseInviteCode(inviteCode);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid or expired invite code" });
        }
      }

      // Validate referral code if provided (for homeowners/contractors)
      // Supports agent referrals (affiliate payouts), user-to-user referrals (subscription credits),
      // and contractor company referral codes (shared via contractor referral page)
      let referringAgent = null;
      let referringUser: any = null;
      if (referralCode && (role === 'homeowner' || role === 'contractor')) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (referrer) {
          if (referrer.role === 'agent') {
            referringAgent = referrer; // Agent referral - for affiliate payouts
          } else {
            referringUser = referrer; // User-to-user referral - for subscription credits
          }
        } else {
          // Contractor company referral codes (contractors share their company code, not user code)
          const referrerCompany = await storage.getCompanyByReferralCode(referralCode);
          if (!referrerCompany) {
            return res.status(400).json({ message: "Invalid referral code" });
          }
          if (referrerCompany.ownerId) {
            const companyOwner = await storage.getUser(referrerCompany.ownerId);
            if (companyOwner) {
              referringUser = companyOwner;
            }
          }
        }
      }

      // Hash password with bcrypt
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user based on role
      let user;
      
      if (role === 'agent') {
        // Agents don't have trial/subscription - they are affiliates
        const agentReferralCode = await generateUniqueReferralCode(storage);
        
        user = await storage.createUserWithPassword({
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'agent' as any,
          zipCode,
          subscriptionStatus: 'inactive', // Agents don't subscribe
          trialEndsAt: undefined,
          maxHousesAllowed: undefined
        });
        
        // Create agent profile
        await storage.createAgentProfile({
          agentId: user.id,
          agentType: 'individual',
          commissionRate: '10.00', // Default 10% commission
          status: 'active'
        } as any);
        
        // Send admin notification about new agent signup (non-blocking)
        emailService.sendAgentSignupNotification(
          email,
          `${firstName} ${lastName}`,
          user.id
        ).catch(err => console.error('[EMAIL] Failed to send agent signup notification:', err));
      } else {
        // Both homeowners and contractors must provide payment info first —
        // trial starts via Stripe with trial_period_days (card required, not charged for 14 days)
        const isHomeowner = role === 'homeowner';

        user = await storage.createUserWithPassword({
          email,
          passwordHash,
          firstName,
          lastName,
          role: role as 'homeowner' | 'contractor',
          zipCode,
          trialEndsAt: undefined,
          maxHousesAllowed: isHomeowner ? 2 : undefined,
          subscriptionStatus: 'inactive',
        });

        // Handle contractor company setup - always create a new company
        if (role === 'contractor') {
          // Create new company
          const company = await storage.createCompany({
            name: companyName,
            bio: companyBio,
            phone: companyPhone,
            email: email,
            location: zipCode,
            ownerId: user.id,
            services: [],
            licenseNumber: '',
            licenseMunicipality: '',
          });

          // Update user with company info (owners can respond to proposals by default)
          user = await storage.upsertUser({
            ...user,
            companyId: company.id,
            companyRole: 'owner',
            canRespondToProposals: true
          });
        }

        // Create affiliate referral record if referred by an agent
        if (referringAgent) {
          const signupDate = new Date();
          const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          
          await storage.createAffiliateReferral({
            agentId: referringAgent.id,
            referredUserId: user.id,
            referredUserRole: role,
            referralCode: referralCode || '',
            signupDate,
            trialEndDate,
            status: 'trial'
          });
        }
      }

      // Create session
      req.session.user = user;
      req.session.isAuthenticated = true;

      // Log successful registration
      await auditLogger.log({
        eventType: 'auth.registration',
        action: `New ${role} account created`,
        userId: user.id,
        userEmail: email,
        userRole: role,
        req,
        responseStatus: 200,
        metadata: { 
          registrationMethod: 'email',
          referredBy: referralCode || null,
          referringAgent: referringAgent?.id || null,
        },
      });

      // Send welcome SMS and email (non-blocking)
      const userName = `${firstName || ''} ${lastName || ''}`.trim() || undefined;
      notificationOrchestrator.sendWelcomeNotifications(user.id, userName || 'there', role)
        .catch(err => console.error('[REGISTRATION] Error sending welcome notifications:', err));

      res.json({ success: true, user, requiresPaymentSetup: role === 'homeowner' || role === 'contractor' });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Email/password login
  app.post('/api/auth/login', authLimiter, async (req: any, res: any) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.passwordHash) {
        // Log failed login attempt (user not found)
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_FAILED_LOGIN,
          action: 'Login attempt failed - user not found',
          userEmail: email,
          req,
          responseStatus: 401,
          errorMessage: 'Invalid credentials - user not found',
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Block suspended enterprise tech accounts
      if (['suspended', 'removed'].includes((user as any).status) || suspendedUserIds.has(user.id)) {
        return res.status(401).json({ message: "Account suspended. Please contact your company administrator." });
      }

      // Verify password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValid) {
        // Log failed login attempt (wrong password)
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_FAILED_LOGIN,
          action: 'Login attempt failed - invalid password',
          userId: user.id,
          userEmail: email,
          userRole: user.role,
          req,
          responseStatus: 401,
          errorMessage: 'Invalid credentials - wrong password',
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      req.session.user = user;
      req.session.isAuthenticated = true;

      // Update lastLoginAt for enterprise team management tracking (non-blocking)
      db.update(users).set({ lastLoginAt: new Date() } as any).where(eq(users.id, user.id)).catch(() => {});

      // Log successful login (non-blocking - don't fail login if audit fails)
      try {
        await auditLogger.logLogin(user.id, user.email || email, user.role, req, true);
        
        // Create security session record
        const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
        await sessionManager.createSession({
          userId: user.id,
          sessionSid: req.sessionID,
          req,
          expiresAt: sessionExpiry,
        });
      } catch (auditError) {
        console.error('[LOGIN] Security audit/session logging failed (login still succeeded):', auditError);
      }

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Forgot password - Request reset code
  app.post('/api/auth/forgot-password', authLimiter, async (req: any, res: any) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Log the password reset request even for non-existent users (security monitoring)
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_PASSWORD_RESET_REQUEST,
          action: 'Password reset requested for unknown email',
          userEmail: email,
          req,
          responseStatus: 200,
          metadata: { userExists: false },
        });
        // Return success even if user doesn't exist (security best practice)
        return res.json({ success: true, message: "If an account exists with this email, a reset code has been sent." });
      }

      // Generate 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store reset token in database (expires in 15 minutes)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.insert(passwordResetTokens).values({
        email,
        token: resetCode,
        expiresAt,
        used: false,
      });

      // Log password reset request
      await auditLogger.log({
        eventType: AuditEventTypes.AUTH_PASSWORD_RESET_REQUEST,
        action: 'Password reset code requested',
        userId: user.id,
        userEmail: email,
        userRole: user.role,
        req,
        responseStatus: 200,
        metadata: { userExists: true },
      });

      // Send email with reset code
      const userName = user.firstName || user.lastName 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
        : undefined;
      const emailSent = await emailService.sendPasswordResetEmail(email, resetCode, userName);
      
      if (!emailSent) {
        console.log(`[PASSWORD RESET] Email failed for ${email}, code: ${resetCode}`);
      } else {
        console.log(`[PASSWORD RESET] Reset code sent to ${email}`);
      }
      
      res.json({ 
        success: true, 
        message: "Reset code sent to your email",
        // TEMPORARY: Remove this in production when email is configured
        resetCode: process.env.NODE_ENV === 'development' ? resetCode : undefined
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with code
  app.post('/api/auth/reset-password', authLimiter, async (req: any, res: any) => {
    try {
      const { email, resetCode, newPassword } = req.body;
      
      if (!email || !resetCode || !newPassword) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate password length
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Find valid reset token
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.email, email))
        .orderBy(passwordResetTokens.createdAt);

      const validToken = tokens.find(t => 
        t.token === resetCode && 
        !t.used && 
        new Date(t.expiresAt) > new Date()
      );

      if (!validToken) {
        // Log invalid reset attempt
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_PASSWORD_RESET_COMPLETE,
          action: 'Password reset failed - invalid or expired code',
          userEmail: email,
          req,
          responseStatus: 400,
          errorMessage: 'Invalid or expired reset code',
          severity: 'warning',
        });
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.upsertUser({
        ...user,
        passwordHash,
      });

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, validToken.id));

      // Log successful password reset - CRITICAL security event
      await auditLogger.logPasswordChange(user.id, user.email || email, req);
      
      // Terminate all other sessions for this user (security best practice)
      await sessionManager.terminateAllUserSessions(user.id, undefined, 'password_change');

      console.log(`[PASSWORD RESET] Password successfully reset for ${email}`);
      
      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Complete profile for OAuth users
  app.post('/api/auth/complete-profile', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { 
        zipCode, role, 
        companyName, companyBio, companyPhone
      } = req.body;
      
      if (!zipCode || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      if (!['homeowner', 'contractor', 'agent'].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }

      // Validate contractor company requirements - must create a company
      if (role === 'contractor') {
        if (!companyName || !companyBio || !companyPhone) {
          return res.status(400).json({ message: "Company name, bio, and phone are required for contractors" });
        }
      }

      const userId = req.session.user.id;
      let currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user with zip code and role
      currentUser = await storage.upsertUser({
        ...currentUser,
        zipCode,
        role: role as 'homeowner' | 'contractor' | 'agent'
      });

      // Handle contractor company setup - always create a new company
      if (role === 'contractor') {
        // Create new company
        const company = await storage.createCompany({
          name: companyName,
          bio: companyBio,
          phone: companyPhone,
          email: currentUser.email ?? '',
          location: zipCode,
          ownerId: currentUser.id,
          services: [],
          licenseNumber: '',
          licenseMunicipality: '',
        });

        // Update user with company info (owners can respond to proposals by default)
        currentUser = await storage.upsertUser({
          ...currentUser,
          companyId: company.id,
          companyRole: 'owner',
          canRespondToProposals: true
        });
      }

      // Update session
      req.session.user = currentUser;

      // Determine redirect destination based on role so the client has an
      // explicit navigation contract rather than re-deriving it from role alone.
      let redirectTo: string;
      if (currentUser.role === 'contractor') {
        redirectTo = '/contractor-pricing?trial=true&onboarding=true';
      } else if (currentUser.role === 'agent') {
        redirectTo = '/agent-dashboard';
      } else {
        redirectTo = '/dashboard';
      }

      res.json({ success: true, role: currentUser.role, redirectTo });
    } catch (error) {
      console.error("Error completing profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });

  // Admin middleware
  const requireAdmin: any = (req: any, res: any, next: any) => {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    if (!adminEmails.includes(req.session.user.email)) {
      return res.status(403).json({ message: "Forbidden - admin access required" });
    }

    next();
  };

  // Serve public object storage files
  app.get('/public/*publicPath', async (req: any, res: any) => {
    try {
      const filePath = req.path.replace('/public/', ''); // Remove /public/ prefix
      const objectStorage = new ObjectStorageService();
      
      // Try the correct path first
      let file = await objectStorage.searchPublicObject(filePath);
      
      // If not found, try legacy path with double 'public/' (for old uploads)
      if (!file) {
        const legacyPath = `public/${filePath}`;
        file = await objectStorage.searchPublicObject(legacyPath);
      }
      
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      await objectStorage.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Image upload endpoint for contractor profiles
  app.post('/api/upload/image', isAuthenticated, async (req: any, res: any) => {
    try {
      console.log('[IMAGE UPLOAD] Request received');
      console.log('[IMAGE UPLOAD] Body keys:', Object.keys(req.body));
      console.log('[IMAGE UPLOAD] Type:', req.body.type);
      console.log('[IMAGE UPLOAD] ImageData length:', req.body.imageData?.length);
      
      const { imageData, type } = req.body; // imageData is base64, type is 'logo' or 'photo'
      
      if (!imageData || !type) {
        console.log('[IMAGE UPLOAD] Missing data - imageData:', !!imageData, 'type:', !!type);
        return res.status(400).json({ message: "Missing imageData or type" });
      }

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log('[IMAGE UPLOAD] Buffer size:', buffer.length);
      
      // Generate unique filename
      const fileExtension = imageData.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `contractor-images/${type}s/${filename}`;
      
      console.log('[IMAGE UPLOAD] Uploading to path:', path);
      
      // Upload to object storage
      const objectStorage = new ObjectStorageService();
      await objectStorage.uploadFile(path, buffer, `image/${fileExtension}`);
      
      // Return public URL
      const url = `/public/contractor-images/${type}s/${filename}`;
      console.log('[IMAGE UPLOAD] Upload successful, URL:', url);
      res.json({ url });
    } catch (error) {
      console.error("[IMAGE UPLOAD] Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post('/api/contractor/upload-logo', isAuthenticated, async (req: any, res: any) => {
    try {
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ message: "Missing imageData" });
      }
      
      // Use the authenticated session to identify the user — never trust client-supplied identity
      const user = await storage.getUser(req.session.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (!user.companyId) {
        return res.status(400).json({ message: "User must belong to a company to upload logo" });
      }

      // Upload to object storage
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = imageData.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `contractor-images/logos/${filename}`;
      
      console.log('[UPLOAD-LOGO] Uploading to:', path);
      
      const objectStorage = new ObjectStorageService();
      await objectStorage.uploadFile(path, buffer, `image/${fileExtension}`);
      const url = `/public/contractor-images/logos/${filename}`;
      
      console.log('[UPLOAD-LOGO] Uploaded successfully to:', url);
      
      // Save to company database
      const updatedCompany = await storage.updateCompany(user.companyId, { businessLogo: url });
      console.log('[UPLOAD-LOGO] Database updated successfully. Logo:', updatedCompany?.businessLogo);
      
      res.json({ url, company: updatedCompany });
    } catch (error) {
      console.error("[UPLOAD-LOGO] Error:", error);
      res.status(500).json({ message: "Failed to upload logo", error: String(error) });
    }
  });

  // Search analytics tracking
  app.post('/api/analytics/search', async (req: any, res: any) => {
    try {
      const { searchTerm, serviceType, searchContext } = req.body;
      
      const userId = req.session?.user?.id || null;
      const userZipCode = req.session?.user?.zipCode || null;

      const analytics = await storage.trackSearch({
        userId,
        searchTerm,
        serviceType,
        userZipCode,
        searchContext
      });

      res.json({ success: true, id: analytics.id });
    } catch (error) {
      console.error("Error tracking search:", error);
      res.status(500).json({ message: "Failed to track search" });
    }
  });

  // Admin analytics routes
  app.get('/api/admin/stats', requireAdmin, async (_req, res) => {
    try {
      console.log("[ADMIN STATS] Fetching admin stats...");
      const stats = await storage.getAdminStats();
      console.log("[ADMIN STATS] Returning stats:", JSON.stringify(stats));
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.get('/api/admin/search-analytics', requireAdmin, async (req: any, res: any) => {
    try {
      const { zipCode, limit } = req.query;
      const analytics = await storage.getSearchAnalytics({
        zipCode: zipCode as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching search analytics:", error);
      res.status(500).json({ message: "Failed to fetch search analytics" });
    }
  });

  // Invite code routes
  app.get('/api/admin/invite-codes', requireAdmin, async (_req, res) => {
    try {
      const codes = await storage.getInviteCodes();
      res.json(codes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  app.post('/api/admin/invite-codes', requireAdmin, async (req: any, res: any) => {
    try {
      const { code, maxUses } = req.body;
      
      const createdBy = req.session.user.id;
      const inviteCode = await storage.createInviteCode({
        code,
        createdBy,
        maxUses: maxUses || 1,
        currentUses: 0,
        isActive: true,
        usedBy: []
      });

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_SETTINGS_CHANGE,
        action: 'Created invite code',
        details: { code, maxUses: maxUses || 1 },
        req,
      });

      res.json(inviteCode);
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  app.patch('/api/admin/invite-codes/:code/deactivate', requireAdmin, async (req: any, res: any) => {
    try {
      const { code } = req.params;
      const success = await storage.deactivateInviteCode(code);
      
      if (!success) {
        return res.status(404).json({ message: "Invite code not found" });
      }

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_SETTINGS_CHANGE,
        action: 'Deactivated invite code',
        details: { code },
        req,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating invite code:", error);
      res.status(500).json({ message: "Failed to deactivate invite code" });
    }
  });

  // Admin - Force logout a user (security action)
  app.post('/api/admin/users/:userId/force-logout', requireAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Get user info for logging
      const targetUser = await storage.getUser(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Terminate all sessions for the user
      await sessionManager.terminateAllUserSessions(userId, undefined, reason || 'admin_forced');

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_FORCE_LOGOUT,
        action: 'Force logged out user',
        targetUserId: userId,
        details: { 
          targetEmail: targetUser.email,
          reason: reason || 'admin_action',
        },
        req,
      });

      res.json({ success: true, message: `All sessions terminated for user ${targetUser.email}` });
    } catch (error) {
      console.error("Error forcing logout:", error);
      res.status(500).json({ message: "Failed to force logout user" });
    }
  });

  // Admin - Suspend a homeowner or standalone contractor (non-team-member) account
  app.patch('/api/admin/users/:userId/suspend', requireAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const [targetUser] = await db.select({
        id: users.id,
        role: users.role,
        companyRole: users.companyRole,
        email: users.email,
      }).from(users).where(eq(users.id, userId)).limit(1);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if ((targetUser as any).companyRole) {
        return res.status(400).json({ message: "Cannot suspend a team member via this endpoint. Use the team management routes." });
      }
      await db.update(users).set({ status: 'suspended', updatedAt: new Date() } as any).where(eq(users.id, userId));
      suspendedUserIds.add(userId);
      invalidateUserSessions(req.sessionStore, userId, req.log);
      res.json({ message: "User suspended" });
    } catch (error) {
      req.log?.error({ error }, '[ADMIN] Error suspending user');
      res.status(500).json({ message: "Failed to suspend user" });
    }
  });

  // Admin - Reactivate a homeowner or standalone contractor (non-team-member) account
  app.patch('/api/admin/users/:userId/reactivate', requireAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const [targetUser] = await db.select({
        id: users.id,
        role: users.role,
        companyRole: users.companyRole,
        email: users.email,
      }).from(users).where(eq(users.id, userId)).limit(1);
      if (!targetUser) return res.status(404).json({ message: "User not found" });
      if ((targetUser as any).companyRole) {
        return res.status(400).json({ message: "Cannot reactivate a team member via this endpoint. Use the team management routes." });
      }
      await db.update(users).set({ status: 'active', updatedAt: new Date() } as any).where(eq(users.id, userId));
      suspendedUserIds.delete(userId);
      res.json({ message: "User reactivated" });
    } catch (error) {
      req.log?.error({ error }, '[ADMIN] Error reactivating user');
      res.status(500).json({ message: "Failed to reactivate user" });
    }
  });

  // Admin - Get active sessions for a user
  app.get('/api/admin/users/:userId/sessions', requireAdmin, async (req: any, res: any) => {
    try {
      const { userId } = req.params;

      const sessions = await sessionManager.getActiveSessions(userId);
      
      const sessionData = sessions.map(session => ({
        id: session.id,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
      }));

      res.json(sessionData);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ message: "Failed to fetch user sessions" });
    }
  });

  // Phase 7: DEPRECATED — EMERGENCY_RESET_SECRET has been removed from production env.
  // This endpoint is effectively disabled (returns 404 when env var is absent).
  // Do not delete yet; remove in a future cleanup pass after confirming zero production usage.
  // Emergency password reset — protected by server-side secret env var (no browser session needed)
  // Usage: POST /api/admin/emergency-reset with header X-Reset-Secret matching EMERGENCY_RESET_SECRET env var
  // Delete EMERGENCY_RESET_SECRET from env after use to disable this endpoint permanently.
  app.post('/api/admin/emergency-reset', async (req: any, res: any) => {
    const secret = process.env.EMERGENCY_RESET_SECRET;
    if (!secret) return res.status(404).json({ message: "Not found" });
    const provided = req.headers['x-reset-secret'];
    if (!provided || provided !== secret) return res.status(403).json({ message: "Forbidden" });
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) return res.status(400).json({ message: "email and newPassword required" });
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(404).json({ message: "User not found" });
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.upsertUser({ ...user, passwordHash });
      res.json({ success: true, message: `Password updated for ${email}` });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // TEMPORARY: Delete old test accounts by email list. Protected by X-Cleanup-Secret header.
  // Remove this endpoint after use.
  app.delete('/api/internal/cleanup-test-accounts', async (req: any, res: any) => {
    const secret = process.env.CLEANUP_TEST_SECRET;
    if (!secret) return res.status(404).json({ message: "Not found" });
    const provided = req.headers['x-cleanup-secret'];
    if (!provided || provided !== secret) return res.status(403).json({ message: "Forbidden" });
    const emails = ['homeownertest@codestationai.com', 'contractortest@codestationai.com'];
    try {
      const deleted: string[] = [];
      for (const email of emails) {
        const user = await storage.getUserByEmail(email);
        if (user) {
          await db.delete(users).where(eq(users.id, user.id));
          deleted.push(email);
        }
      }
      res.json({ success: true, deleted });
    } catch (error: any) {
      res.status(500).json({ message: "Failed to delete", error: error?.message });
    }
  });

  // Admin — reset any user's password by email (no token required)
  app.post('/api/admin/users/reset-password', requireAdmin, async (req: any, res: any) => {
    try {
      const { email, newPassword } = req.body;
      if (!email || !newPassword) {
        return res.status(400).json({ message: "email and newPassword are required" });
      }
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 10);
      await storage.upsertUser({ ...user, passwordHash });
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.AUTH_PASSWORD_RESET_COMPLETE,
        action: 'Admin reset user password',
        targetUserId: user.id,
        details: { targetEmail: email },
        req,
      });
      res.json({ success: true, message: `Password updated for ${email}` });
    } catch (error) {
      console.error("Error in admin password reset:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Advanced analytics endpoint
  app.get('/api/admin/analytics', requireAdmin, async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      
      const [activeUsers, referrals, contractors, revenue, churn, features] = await Promise.all([
        storage.getActiveUsersSeries(days),
        storage.getReferralGrowthSeries(days),
        storage.getContractorSignupsSeries(days),
        storage.getRevenueMetrics(days),
        storage.getChurnMetrics(days),
        storage.getFeatureUsageStats()
      ]);
      
      res.json({
        activeUsers,
        referrals,
        contractors,
        revenue,
        churn,
        features
      });
    } catch (error) {
      console.error("Error fetching advanced analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Admin: list all users with referral free months summary
  app.get('/api/admin/referral-free-months', requireAdmin, async (_req, res) => {
    try {
      const rows = await db.execute(drizzleSql`
        WITH fm_agg AS (
          SELECT
            user_id,
            COUNT(*)::int                                              AS total_free_months,
            COUNT(CASE WHEN status = 'pending' THEN 1 END)::int       AS pending_free_months,
            COUNT(CASE WHEN status = 'applied' THEN 1 END)::int       AS applied_free_months,
            MAX(earned_at)                                             AS last_free_month_earned_at
          FROM referral_free_months
          GROUP BY user_id
        ),
        rc_agg AS (
          SELECT
            referrer_user_id,
            COUNT(CASE WHEN status = 'earned' THEN 1 END)::int        AS earned_credits
          FROM referral_credits
          GROUP BY referrer_user_id
        )
        SELECT
          u.id               AS user_id,
          u.email,
          u.first_name,
          u.last_name,
          u.subscription_status,
          COALESCE(fm.total_free_months, 0)    AS total_free_months,
          COALESCE(fm.pending_free_months, 0)  AS pending_free_months,
          COALESCE(fm.applied_free_months, 0)  AS applied_free_months,
          COALESCE(rc.earned_credits, 0)       AS earned_credits,
          fm.last_free_month_earned_at
        FROM users u
        LEFT JOIN fm_agg fm ON fm.user_id = u.id
        LEFT JOIN rc_agg rc ON rc.referrer_user_id = u.id
        WHERE u.referral_code IS NOT NULL
          AND (fm.user_id IS NOT NULL OR rc.referrer_user_id IS NOT NULL)
        ORDER BY total_free_months DESC, earned_credits DESC
        LIMIT 200
      `);
      res.json(rows.rows || []);
    } catch (err: any) {
      console.error('[ADMIN] Error fetching referral free months:', err.message);
      res.status(500).json({ message: 'Failed to fetch referral data' });
    }
  });

  // Admin email image upload endpoint
  app.post('/api/admin/upload-email-image', requireAdmin, async (req: any, res: any) => {
    try {
      const { imageData } = req.body;
      if (!imageData) {
        return res.status(400).json({ message: "Missing imageData" });
      }

      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = imageData.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `email-images/${filename}`;

      const objectStorage = new ObjectStorageService();
      await objectStorage.uploadFile(path, buffer, `image/${fileExtension}`);

      const url = `/public/email-images/${filename}`;
      res.json({ url });
    } catch (error) {
      console.error("[ADMIN] Error uploading email image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Bulk email endpoint for admins
  app.post('/api/admin/send-bulk-email', requireAdmin, async (req: any, res: any) => {
    try {
      const { replyToEmail, audience, subject, body, imageUrl } = req.body;
      console.log(`[ADMIN-EMAIL] Bulk email request received - audience: ${audience}, subject: "${subject}", from admin: ${req.session?.user?.email}`);
      
      // Validate subject and body
      if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
        return res.status(400).json({ message: "Email subject is required" });
      }
      if (!body || typeof body !== 'string' || body.trim().length === 0) {
        return res.status(400).json({ message: "Email body is required" });
      }
      if (subject.length > 120) {
        return res.status(400).json({ message: "Subject must be 120 characters or less" });
      }
      if (body.length > 5000) {
        return res.status(400).json({ message: "Body must be 5000 characters or less" });
      }
      
      // Build query based on audience selection
      let allUsers;
      if (audience === 'homeowners') {
        allUsers = await db.select({
          email: users.email,
          firstName: users.firstName,
          role: users.role
        }).from(users).where(and(isNotNull(users.email), eq(users.role, 'homeowner')));
      } else if (audience === 'contractors') {
        allUsers = await db.select({
          email: users.email,
          firstName: users.firstName,
          role: users.role
        }).from(users).where(and(isNotNull(users.email), eq(users.role, 'contractor')));
      } else {
        // 'all' - get everyone
        allUsers = await db.select({
          email: users.email,
          firstName: users.firstName,
          role: users.role
        }).from(users).where(isNotNull(users.email));
      }

      console.log(`[ADMIN-EMAIL] Found ${allUsers.length} users with emails for audience: ${audience}`);
      if (allUsers.length === 0) {
        return res.status(400).json({ message: "No users with email addresses found for the selected audience" });
      }

      const result = await emailService.sendBulkCustomEmail(
        allUsers.filter(u => u.email) as Array<{ email: string; firstName: string | null }>,
        subject.trim(),
        body.trim(),
        replyToEmail || 'gotohomebase2025@gmail.com',
        imageUrl || undefined
      );

      // Log the action
      await auditLogger.log({
        eventType: 'admin.bulk_email_sent',
        action: 'admin.bulk_email_sent',
        userId: req.user?.id || 'unknown',
        userEmail: req.user?.email || 'unknown',
        severity: 'info',
        metadata: {
          totalUsers: allUsers.length,
          sent: result.sent,
          failed: result.failed
        }
      });

      res.json({
        message: `Bulk email sent`,
        totalUsers: allUsers.length,
        sent: result.sent,
        failed: result.failed,
        skipped: result.skipped
      });
    } catch (error) {
      console.error("Error sending bulk email:", error);
      res.status(500).json({ message: "Failed to send bulk email" });
    }
  });

  // Send bulk SMS to users
  app.post('/api/admin/send-bulk-sms', requireAdmin, async (req: any, res: any) => {
    try {
      const { audience, message } = req.body;
      
      // Validate message
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return res.status(400).json({ message: "SMS message is required" });
      }
      if (message.length > 160) {
        return res.status(400).json({ message: "Message must be 160 characters or less" });
      }
      
      // Build query based on audience selection - only users with phone numbers
      let allUsers;
      if (audience === 'homeowners') {
        allUsers = await db.select({
          id: users.id,
          phone: users.phone,
          firstName: users.firstName,
          role: users.role
        }).from(users).where(and(isNotNull(users.phone), eq(users.role, 'homeowner')));
      } else if (audience === 'contractors') {
        allUsers = await db.select({
          id: users.id,
          phone: users.phone,
          firstName: users.firstName,
          role: users.role
        }).from(users).where(and(isNotNull(users.phone), eq(users.role, 'contractor')));
      } else {
        // 'all' - get everyone with phone numbers
        allUsers = await db.select({
          id: users.id,
          phone: users.phone,
          firstName: users.firstName,
          role: users.role
        }).from(users).where(isNotNull(users.phone));
      }

      // Filter users with valid phone numbers
      const usersWithPhone = allUsers.filter(u => u.phone && u.phone.trim().length >= 10);

      console.log(`[BULK SMS] Audience: ${audience}, Total users: ${allUsers.length}, With phone: ${usersWithPhone.length}`);

      if (usersWithPhone.length === 0) {
        console.log('[BULK SMS] No users with phone numbers found');
        return res.status(400).json({ message: "No users with phone numbers found for the selected audience" });
      }

      let sent = 0;
      let failed = 0;
      let skipped = allUsers.length - usersWithPhone.length;

      // Send SMS to each user
      for (const user of usersWithPhone) {
        try {
          console.log(`[BULK SMS] Sending to user ${user.id}, phone: ${user.phone}`);
          const success = await smsService.sendSMS({
            to: user.phone!,
            body: message.trim()
          });
          if (success) {
            sent++;
            console.log(`[BULK SMS] Success for user ${user.id}`);
          } else {
            failed++;
            console.log(`[BULK SMS] Failed for user ${user.id}`);
          }
        } catch (error) {
          console.error(`[BULK SMS] Error for user ${user.id}:`, error);
          failed++;
        }
      }

      // Log the action
      await auditLogger.log({
        eventType: 'admin.bulk_sms_sent',
        action: 'admin.bulk_sms_sent',
        userId: req.user?.id || 'unknown',
        userEmail: req.user?.email || 'unknown',
        severity: 'info',
        metadata: {
          totalUsers: allUsers.length,
          sent,
          failed,
          skipped,
          audience
        }
      });

      res.json({
        message: `Bulk SMS sent`,
        totalUsers: allUsers.length,
        sent,
        failed,
        skipped
      });
    } catch (error) {
      console.error("Error sending bulk SMS:", error);
      res.status(500).json({ message: "Failed to send bulk SMS" });
    }
  });

  // Security Dashboard - Admin endpoints for SOC 2 compliance
  app.get('/api/admin/security/audit-logs', requireAdmin, async (req: any, res: any) => {
    try {
      const { 
        eventType, 
        userId, 
        severity, 
        startDate, 
        endDate, 
        limit, 
        offset 
      } = req.query;

      const result = await auditLogger.getAuditLogs({
        eventType: eventType as string,
        userId: userId as string,
        severity: severity as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get('/api/admin/security/stats', requireAdmin, async (req: any, res: any) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const stats = await auditLogger.getSecurityStats(days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching security stats:", error);
      res.status(500).json({ message: "Failed to fetch security stats" });
    }
  });

  app.get('/api/admin/security/recent-alerts', requireAdmin, async (_req: any, res) => {
    try {
      // Get recent security-related events
      const result = await auditLogger.getAuditLogs({
        limit: 20,
      });
      
      // Filter to security and warning/critical events
      const alerts = result.logs.filter(log => 
        log.eventType?.startsWith('security.') || 
        log.severity === 'warning' || 
        log.severity === 'critical'
      );

      res.json(alerts);
    } catch (error) {
      console.error("Error fetching security alerts:", error);
      res.status(500).json({ message: "Failed to fetch security alerts" });
    }
  });

  app.get('/api/admin/security/failed-logins', requireAdmin, async (req: any, res: any) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const result = await auditLogger.getAuditLogs({
        eventType: AuditEventTypes.AUTH_FAILED_LOGIN,
        startDate,
        limit: 100,
      });

      // Group by email or IP for analysis
      const byEmail: Record<string, number> = {};
      const byIp: Record<string, number> = {};
      
      for (const log of result.logs) {
        if (log.userEmail) {
          byEmail[log.userEmail] = (byEmail[log.userEmail] || 0) + 1;
        }
        if (log.ipAddress) {
          byIp[log.ipAddress] = (byIp[log.ipAddress] || 0) + 1;
        }
      }

      res.json({
        total: result.total,
        logs: result.logs,
        byEmail: Object.entries(byEmail).sort((a, b) => b[1] - a[1]).slice(0, 10),
        byIp: Object.entries(byIp).sort((a, b) => b[1] - a[1]).slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching failed logins:", error);
      res.status(500).json({ message: "Failed to fetch failed login data" });
    }
  });

  app.get('/api/admin/security/active-sessions', requireAdmin, async (_req: any, res) => {
    try {
      // Get all active sessions across all users
      const activeSessions = await db.select()
        .from(securitySessions)
        .where(eq(securitySessions.isActive, true))
        .orderBy(desc(securitySessions.lastActivityAt))
        .limit(100);

      // Enhance with user info
      const enhancedSessions = await Promise.all(activeSessions.map(async (session) => {
        const user = await storage.getUser(session.userId);
        return {
          ...session,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          ipAddress: session.ipAddress?.replace(/\d+\.\d+$/, 'x.x'), // Partial IP for privacy
        };
      }));

      res.json(enhancedSessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  // Admin Agent Verification routes
  app.get('/api/admin/agents', requireAdmin, async (_req: any, res) => {
    try {
      // Get all agent profiles with user info - only real estate agents (role='agent')
      const profiles = await db.select()
        .from(agentProfiles)
        .orderBy(desc(agentProfiles.createdAt));
      
      const agentsWithInfo = await Promise.all(profiles.map(async (profile) => {
        const user = await storage.getUser(profile.agentId);
        // Only include if user exists and is a real estate agent
        if (!user || user.role !== 'agent') {
          return null;
        }
        return {
          ...profile,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt,
            role: user.role,
          },
        };
      }));
      
      // Filter out null entries
      res.json(agentsWithInfo.filter(a => a !== null));
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Zod schema for agent verification
  const agentVerifySchema = z.object({
    action: z.enum(['approve', 'reject', 'request_resubmit']),
    notes: z.string().max(1000).optional(),
  });

  app.patch('/api/admin/agents/:agentId/verify', requireAdmin, async (req: any, res: any) => {
    try {
      const { agentId } = req.params;
      const adminId = req.session.user.id;

      // Validate request body
      const validationResult = agentVerifySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: validationResult.error.issues });
      }
      const { action, notes } = validationResult.data;

      // Verify the user is actually a real estate agent
      const user = await storage.getUser(agentId);
      if (!user || user.role !== 'agent') {
        return res.status(404).json({ message: "Agent not found" });
      }

      const verificationStatus = action === 'approve' ? 'approved' 
        : action === 'reject' ? 'rejected' 
        : 'resubmit_required';

      const updateData: any = {
        verificationStatus,
        reviewedByAdminId: adminId,
        reviewNotes: notes || null,
      };

      if (action === 'approve') {
        updateData.verifiedAt = new Date();
      } else if (action === 'reject') {
        updateData.lastRejectedAt = new Date();
      }

      const updated = await storage.updateAgentProfile(agentId, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Send notification email (user was already fetched above)
      if (user.email) {
        // Send notification email about verification status
        const statusMessage = action === 'approve' 
          ? 'Your account has been verified! You can now earn affiliate commissions.'
          : action === 'reject'
          ? 'Your verification was not approved. Please contact support for more information.'
          : 'Please update your verification documents and resubmit.';

        await emailService.sendEmail({
          to: user.email,
          subject: `HomeBase Agent Verification ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Update' : 'Action Required'}`,
          text: statusMessage,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff !important; margin: 0;">Agent Verification Update</h1>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <p>Hi ${user.firstName || 'there'},</p>
                <p>${statusMessage}</p>
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://gotohomebase.com/agent-dashboard" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a>
                </div>
                <p>- The HomeBase Team</p>
              </div>
            </div>
          `,
        });
      }

      res.json({ success: true, agent: updated });
    } catch (error) {
      console.error("Error verifying agent:", error);
      res.status(500).json({ message: "Failed to verify agent" });
    }
  });

  // Admin endpoint to send welcome emails to all users
  app.post('/api/admin/send-welcome-emails', requireAdmin, async (req: any, res: any) => {
    try {
      const { dryRun = true, roleFilter } = req.body;
      
      // Get all users with emails
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }).from(users).where(drizzleSql`${users.email} IS NOT NULL`);
      
      // Filter by role if specified
      let targetUsers = allUsers;
      if (roleFilter && ['homeowner', 'contractor', 'agent'].includes(roleFilter)) {
        targetUsers = allUsers.filter(u => u.role === roleFilter);
      }
      
      // Exclude demo users
      targetUsers = targetUsers.filter(u => !u.email?.includes('demo') && !u.email?.includes('@homebase.com'));
      
      if (dryRun) {
        // Dry run - just show what would be sent
        return res.json({
          success: true,
          dryRun: true,
          message: `Would send welcome emails to ${targetUsers.length} users`,
          users: targetUsers.map(u => ({ email: u.email, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), role: u.role })),
        });
      }
      
      // Actually send emails with rate limiting (1 second between each)
      let successCount = 0;
      let failedCount = 0;
      const results: { email: string; success: boolean }[] = [];
      
      for (const user of targetUsers) {
        try {
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
          const success = await emailService.sendWelcomeEmail(user.id, name, user.role || 'homeowner');
          results.push({ email: user.email!, success });
          if (success) successCount++;
          else failedCount++;
          
          // Rate limit: wait 1 second between emails to avoid hitting SendGrid limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (emailError) {
          console.error(`[WELCOME EMAIL] Failed to send to ${user.email}:`, emailError);
          results.push({ email: user.email!, success: false });
          failedCount++;
        }
      }
      
      console.log(`[WELCOME EMAIL] Sent ${successCount}/${targetUsers.length} welcome emails successfully`);
      
      res.json({
        success: true,
        dryRun: false,
        totalUsers: targetUsers.length,
        successCount,
        failedCount,
        results,
      });
    } catch (error) {
      console.error("Error sending welcome emails:", error);
      res.status(500).json({ message: "Failed to send welcome emails" });
    }
  });

  // Public contact form endpoint (no authentication required)
  app.post('/api/contact', async (req: any, res: any) => {
    try {
      const contactSchema = z.object({
        name: z.string().min(2).max(100),
        email: z.string().email(),
        category: z.enum(['billing', 'technical', 'feature_request', 'account', 'contractor', 'general']),
        subject: z.string().min(5).max(200),
        message: z.string().min(10).max(5000),
      });
      
      const validatedData = contactSchema.parse(req.body);
      
      // Create a support ticket without a user ID (guest ticket)
      const ticket = await storage.createSupportTicket({
        userId: 'guest',
        category: validatedData.category,
        priority: 'medium',
        subject: validatedData.subject,
        description: `From: ${validatedData.name} (${validatedData.email})\n\n${validatedData.message}`,
      });
      
      // Notify admins about the new contact form submission
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const supportNotificationEmail = 'gotohomebase2025@gmail.com';
      const allNotificationEmails = [...new Set([...adminEmails, supportNotificationEmail])];
      
      // Find admin users and create notifications
      for (const email of allNotificationEmails) {
        const adminUser = await storage.getUserByEmail(email);
        if (adminUser) {
          await storage.createNotification({
            homeownerId: adminUser.id,
            type: 'support_ticket',
            title: 'New Contact Form Submission',
            message: `${validatedData.name} (${validatedData.email}) submitted a contact form: "${validatedData.subject}"`,
            link: `/admin/support`,
          } as any);
        }
      }
      
      res.json({ success: true, ticketId: ticket.id });
    } catch (error) {
      console.error("Error processing contact form:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid form data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to submit contact form" });
    }
  });

  // AI support chat — requires authentication and rate limiting to prevent cost amplification
  app.post('/api/support/ai-chat', isAuthenticated, aiChatLimiter, async (req: any, res: any) => {
    try {
      const { question, role } = req.body;
      if (!question || typeof question !== 'string' || question.trim().length === 0) {
        return res.status(400).json({ message: 'Question is required' });
      }
      const safeRole = ['homeowner', 'contractor', 'agent'].includes(role) ? role : 'homeowner';
      const roleLabel = safeRole === 'homeowner' ? 'Homeowner' : safeRole === 'contractor' ? 'Contractor' : 'RE Agent';
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.REPLIT_OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        max_tokens: 300,
        messages: [
          {
            role: 'system',
            content: `You are the MyHomeBase™ AI Support Assistant for ${roleLabel}s. MyHomeBase is a home management platform featuring the Home Wellness Score™, maintenance scheduling, contractor directory, and service record tracking. Answer support questions helpfully and concisely in 2-4 sentences. Stay focused on ${roleLabel}-relevant topics. Be warm, professional, and solution-oriented.`,
          },
          { role: 'user', content: question.trim() },
        ],
      });
      const answer = completion.choices[0]?.message?.content || "I couldn't find an answer. Please open a support ticket and our team will help you shortly.";
      res.json({ answer });
    } catch (error: any) {
      res.status(500).json({ answer: "Something went wrong. Please try again or open a support ticket." });
    }
  });

  // Support ticket routes - User endpoints
  app.get('/api/support/tickets', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const tickets = await storage.getSupportTickets({ userId });
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.get('/api/support/tickets/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      
      const ticketWithReplies = await storage.getSupportTicketWithReplies(id);
      
      if (!ticketWithReplies) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Ensure user can only access their own tickets (unless admin)
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const isAdmin = req.session.user.email && adminEmails.includes(req.session.user.email.toLowerCase());
      if (ticketWithReplies.ticket.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(ticketWithReplies);
    } catch (error) {
      console.error("Error fetching support ticket:", error);
      res.status(500).json({ message: "Failed to fetch support ticket" });
    }
  });

  app.post('/api/support/tickets', isAuthenticated, async (req: any, res: any) => {
    try {
      const createTicketSchema = z.object({
        category: z.enum(['billing', 'technical', 'feature_request', 'account', 'contractor', 'general']),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
        subject: z.string().min(5).max(200),
        description: z.string().min(10).max(5000),
        metadata: z.any().optional(),
      });
      
      const validatedData = createTicketSchema.parse(req.body);
      const userId = req.session.user.id;
      
      const ticket = await storage.createSupportTicket({
        ...validatedData,
        userId,
      });
      
      // Automated reply based on category
      const autoReplyContent = getAutomatedReply(ticket.category);
      if (autoReplyContent) {
        await storage.createTicketReply({
          ticketId: ticket.id,
          userId: 'system',
          content: autoReplyContent,
          isInternal: false,
          isAutomated: true,
        });
      }
      
      // Notify all admin users and support email about the new support ticket
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const supportNotificationEmail = 'gotohomebase2025@gmail.com';
      const allNotificationEmails = [...new Set([...adminEmails, supportNotificationEmail])];
      
      const submittingUser = await storage.getUser(userId);
      const submitterName = submittingUser ? `${submittingUser.firstName || ''} ${submittingUser.lastName || ''}`.trim() || submittingUser.email : 'A user';
      
      for (const notifyEmail of allNotificationEmails) {
        const notifyUser = await storage.getUserByEmail(notifyEmail);
        if (notifyUser && notifyUser.id !== userId) {
          await storage.createNotification({
            homeownerId: notifyUser.id,
            type: 'support_ticket',
            title: 'New Support Ticket',
            message: `${submitterName} submitted a ${validatedData.priority} priority ticket: "${validatedData.subject}"`,
            link: `/admin/support`,
          } as any);
        }
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.post('/api/support/tickets/:id/replies', isAuthenticated, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const { content } = req.body;
      
      if (!content || content.trim().length < 1) {
        return res.status(400).json({ message: "Reply content is required" });
      }
      
      // Verify ticket exists and user has access
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const adminEmailsList = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const isAdmin = req.session.user.email && adminEmailsList.includes(req.session.user.email.toLowerCase());
      if (ticket.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const reply = await storage.createTicketReply({
        ticketId: id,
        userId,
        content: content.trim(),
        isInternal: false,
        isAutomated: false,
      });
      
      // Update ticket status if it was waiting on customer
      if (ticket.status === 'waiting_on_customer' && ticket.userId === userId) {
        await storage.updateSupportTicket(id, { status: 'in_progress' });
      }
      
      res.json(reply);
    } catch (error) {
      console.error("Error creating ticket reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Support ticket routes - Admin endpoints
  app.get('/api/admin/support/tickets', requireAdmin, async (req: any, res: any) => {
    try {
      const { status, category, priority, assignedToAdminId } = req.query;
      
      const tickets = await storage.getSupportTickets({
        status: status as string,
        category: category as string,
        priority: priority as string,
        assignedToAdminId: assignedToAdminId as string,
      });
      
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching admin support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.patch('/api/admin/support/tickets/:id', requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        status: z.enum(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assignedToAdminId: z.string().nullable().optional(),
        assignedToAdminEmail: z.string().nullable().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedTicket = await storage.updateSupportTicket(id, validatedData);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_DATA_EXPORT,
        action: 'Updated support ticket',
        details: { ticketId: id, updates: validatedData },
        req,
      });
      
      res.json(updatedTicket);
    } catch (error) {
      console.error("Error updating support ticket:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  app.post('/api/admin/support/tickets/:id/replies', requireAdmin, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const { content, isInternal } = req.body;
      
      if (!content || content.trim().length < 1) {
        return res.status(400).json({ message: "Reply content is required" });
      }
      
      // Verify ticket exists
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const reply = await storage.createTicketReply({
        ticketId: id,
        userId: req.session.user.id,
        content: content.trim(),
        isInternal: isInternal || false,
        isAutomated: false,
      });
      
      // Update ticket status to waiting_on_customer if admin replied publicly
      if (!isInternal && ticket.status === 'open') {
        await storage.updateSupportTicket(id, { status: 'waiting_on_customer' });
      }
      
      res.json(reply);
    } catch (error) {
      console.error("Error creating admin reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Admin endpoint to trigger invoice orphan file cleanup on demand
  app.post('/api/admin/invoice-orphan-cleanup/run', requireAdmin, async (req: any, res: any) => {
    try {
      const result = await invoiceOrphanCleanupScheduler.runNow();
      res.json(result);
    } catch (error) {
      req.log?.error({ err: error }, '[INVOICE-ORPHAN-CLEANUP] On-demand run failed');
      res.status(500).json({ message: 'Invoice orphan cleanup failed' });
    }
  });

  // Automated reply helper function
  function getAutomatedReply(category: string): string | null {
    const replies: Record<string, string> = {
      billing: "Thank you for contacting us about a billing issue. Our billing team will review your ticket and respond within 24 hours. In the meantime, you can check your billing history in your account settings.",
      technical: "Thank you for reporting this technical issue. Our support team has been notified and will investigate. Please include any error messages, screenshots, or steps to reproduce the issue to help us resolve it faster.",
      feature_request: "Thank you for your feature suggestion! We really appreciate feedback from our users. Our product team reviews all feature requests and will consider it for future updates. You'll receive an update on your request within 3-5 business days.",
      account: "Thank you for contacting us about your account. Our support team will assist you with your account-related question within 24 hours. For security purposes, please do not share your password in ticket replies.",
      contractor: "Thank you for reaching out about contractor-related services. Our contractor support team will review your request and respond within 24 hours to help you connect with the right professionals.",
      general: "Thank you for contacting HomeBase Support. We've received your message and our team will respond within 24-48 hours. If your issue is urgent, please mark the priority as 'urgent' in your ticket.",
    };
    
    return replies[category] || null;
  }

  // CRM Lead Management routes - PAID FEATURE for contractors
  
  // GET /api/crm/leads - List all leads for contractor with filters
  app.get('/api/crm/leads', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const { status, priority, source, searchQuery } = req.query;
      
      const leads = await storage.getCrmLeads(req.session.user.id, {
        status: status as string,
        priority: priority as string,
        source: source as string,
        searchQuery: searchQuery as string,
      });
      
      res.json(leads);
    } catch (error) {
      console.error("Error fetching CRM leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // POST /api/crm/leads - Create new lead
  app.post('/api/crm/leads', isAuthenticated, requireNotSuspended(), requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      // Validate request body
      const leadData = insertCrmLeadSchema.parse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.body.shareWithCompany ? req.session.user.companyId : null,
      });

      const lead = await storage.createCrmLead(leadData);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error creating CRM lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // GET /api/crm/leads/:id - Get lead with notes
  app.get('/api/crm/leads/:id', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const leadData = await storage.getCrmLeadWithNotes(req.params.id);
      
      if (!leadData) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check access: owned by user OR shared with their company
      const userCompanyId = req.session.user.companyId;
      const canAccess = leadData.lead.contractorUserId === req.session.user.id ||
        (userCompanyId && leadData.lead.companyId === userCompanyId);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(leadData);
    } catch (error) {
      console.error("Error fetching CRM lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  // PATCH /api/crm/leads/:id - Update lead
  app.patch('/api/crm/leads/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const lead = await storage.getCrmLead(req.params.id);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check write access: owned by user OR (shared with company AND user is owner/manager)
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      // Auto-update lastContactedAt when status changes
      const updateData = { ...req.body };
      if (req.body.status && req.body.status !== lead.status) {
        updateData.lastContactedAt = new Date();
      }

      const updatedLead = await storage.updateCrmLead(req.params.id, updateData);
      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating CRM lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // DELETE /api/crm/leads/:id - Delete lead
  app.delete('/api/crm/leads/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const lead = await storage.getCrmLead(req.params.id);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check write access (same as update)
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      await storage.deleteCrmLead(req.params.id);
      res.json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // POST /api/crm/leads/:leadId/notes - Add note to lead
  app.post('/api/crm/leads/:leadId/notes', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const lead = await storage.getCrmLead(req.params.leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check write access
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      // Validate and create note
      const noteData = insertCrmNoteSchema.parse({
        leadId: req.params.leadId,
        userId: req.session.user.id,
        content: req.body.content,
        noteType: req.body.noteType || 'general',
        isPinned: req.body.isPinned || false,
      });

      const note = await storage.createCrmNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error creating CRM note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // PATCH /api/crm/notes/:id - Update note
  app.patch('/api/crm/notes/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      // Get note and verify it exists
      const notes = Array.from((storage as any).memStorage?.crmNotes?.values() || []);
      const note = notes.find((n: any) => n.id === req.params.id);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Get lead to check access
      const lead = await storage.getCrmLead((note as any).leadId);
      if (!lead) {
        return res.status(404).json({ message: "Associated lead not found" });
      }

      // Check write access
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      const updatedNote = await storage.updateCrmNote(req.params.id, req.body);
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating CRM note:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // DELETE /api/crm/notes/:id - Delete note
  app.delete('/api/crm/notes/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      // Get note and verify it exists
      const notes = Array.from((storage as any).memStorage?.crmNotes?.values() || []);
      const note = notes.find((n: any) => n.id === req.params.id);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Get lead to check access
      const lead = await storage.getCrmLead((note as any).leadId);
      if (!lead) {
        return res.status(404).json({ message: "Associated lead not found" });
      }

      // Check write access
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      await storage.deleteCrmNote(req.params.id);
      res.json({ success: true, message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM note:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // CRM Integration routes
  // GET /api/crm/integrations - Get all integrations for contractor
  app.get('/api/crm/integrations', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM integrations" });
      }

      const integrations = await storage.getCrmIntegrations(
        req.session.user.id,
        req.session.user.companyId
      );
      
      // Don't expose sensitive tokens in response
      const sanitized = integrations.map(i => ({
        ...i,
        accessToken: i.accessToken ? '***' : null,
        refreshToken: i.refreshToken ? '***' : null,
        apiKey: i.apiKey ? '***' : null,
        apiSecret: i.apiSecret ? '***' : null,
        webhookSecret: i.webhookSecret ? '***' : null,
      }));
      
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching CRM integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  // POST /api/crm/integrations - Create new integration
  app.post('/api/crm/integrations', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can create integrations" });
      }

      const { insertCrmIntegrationSchema } = await import("@workspace/db");
      
      // Generate webhook secret for webhook integrations
      let webhookSecret = null;
      if (req.body.platform === 'webhook' || req.body.platform === 'custom') {
        webhookSecret = randomBytes(32).toString('hex');
      }

      const integrationData = insertCrmIntegrationSchema.parse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.body.shareWithCompany ? req.session.user.companyId : null,
        webhookSecret,
      });

      const integration = await storage.createCrmIntegration(integrationData);
      
      // Return sanitized response
      res.status(201).json({
        ...integration,
        accessToken: integration.accessToken ? '***' : null,
        refreshToken: integration.refreshToken ? '***' : null,
        apiKey: integration.apiKey ? '***' : null,
        apiSecret: integration.apiSecret ? '***' : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ message: "Validation error", errors: error.issues });
      }
      console.error("Error creating CRM integration:", error);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  // DELETE /api/crm/integrations/:id - Delete integration
  app.delete('/api/crm/integrations/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can delete integrations" });
      }

      const integration = await storage.getCrmIntegration(req.params.id);
      
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      // Check ownership
      const userCompanyId = req.session.user.companyId;
      const canDelete = integration.contractorUserId === req.session.user.id ||
        (userCompanyId && integration.companyId === userCompanyId);
      
      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmIntegration(req.params.id);
      res.json({ success: true, message: "Integration deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM integration:", error);
      res.status(500).json({ message: "Failed to delete integration" });
    }
  });

  // POST /api/crm/webhooks/:integrationId - Webhook receiver endpoint (NOT authenticated)
  app.post('/api/crm/webhooks/:integrationId', async (req: any, res: any) => {
    try {
      const integration = await storage.getCrmIntegration(req.params.integrationId);
      
      if (!integration || !integration.isActive) {
        console.log(`[WEBHOOK] Integration not found or inactive: ${req.params.integrationId}`);
        return res.status(404).json({ message: "Integration not found or inactive" });
      }

      // Validate webhook secret if provided
      const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
      if (integration.webhookSecret && providedSecret !== integration.webhookSecret) {
        console.log(`[WEBHOOK] Invalid webhook secret for integration: ${req.params.integrationId}`);
        // Log failed attempt
        await storage.createWebhookLog({
          integrationId: req.params.integrationId,
          payload: req.body,
          headers: req.headers as any,
          ipAddress: req.ip,
          status: 'failed',
          errorMessage: 'Invalid webhook secret',
          processedAt: new Date(),
        });
        return res.status(401).json({ message: "Invalid webhook secret" });
      }

      // Extract lead data from payload - support common CRM formats
      let leadData: any = {};
      
      // Generic webhook format (custom/default)
      if (integration.platform === 'webhook' || integration.platform === 'custom') {
        leadData = {
          firstName: req.body.first_name || req.body.firstName || req.body.name?.split(' ')[0] || 'Unknown',
          lastName: req.body.last_name || req.body.lastName || req.body.name?.split(' ')[1] || '',
          email: req.body.email,
          phone: req.body.phone || req.body.phone_number || req.body.phoneNumber,
          address: req.body.address || req.body.street,
          city: req.body.city,
          state: req.body.state || req.body.region,
          postalCode: req.body.postal_code || req.body.postalCode || req.body.zip,
          source: req.body.source || 'webhook',
          status: req.body.status || 'new',
          priority: req.body.priority || 'medium',
          projectType: req.body.project_type || req.body.projectType || req.body.service,
          estimatedValue: req.body.estimated_value || req.body.estimatedValue || req.body.value,
          metadata: req.body.metadata || req.body,
        };
      }
      
      // Apply field mapping if configured
      if (integration.fieldMapping) {
        const mapping = integration.fieldMapping as any;
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        Object.keys(mapping).forEach(ourField => {
          // Prevent prototype pollution
          if (dangerousKeys.includes(ourField)) {
            console.warn(`[WEBHOOK] Blocked dangerous property name in field mapping: ${ourField}`);
            return;
          }
          const theirField = mapping[ourField];
          if (req.body[theirField] !== undefined) {
            leadData[ourField] = req.body[theirField];
          }
        });
      }

      // Create the lead
      const { insertCrmLeadSchema } = await import("@workspace/db");
      const validatedData = insertCrmLeadSchema.parse({
        ...leadData,
        contractorUserId: integration.contractorUserId,
        companyId: integration.companyId,
      });

      const lead = await storage.createCrmLead(validatedData);

      // Log successful webhook
      await storage.createWebhookLog({
        integrationId: req.params.integrationId,
        payload: req.body,
        headers: req.headers as any,
        ipAddress: req.ip,
        status: 'success',
        leadId: lead.id,
        processedAt: new Date(),
      });

      // Update last sync time
      await storage.updateCrmIntegration(req.params.integrationId, {
        lastSyncAt: new Date(),
      });

      console.log(`[WEBHOOK] Successfully created lead from webhook: ${lead.id}`);
      res.status(201).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("[WEBHOOK] Error processing webhook:", error);
      
      // Log failed webhook
      try {
        await storage.createWebhookLog({
          integrationId: req.params.integrationId,
          payload: req.body,
          headers: req.headers as any,
          ipAddress: req.ip,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date(),
        });
      } catch (logError) {
        console.error("[WEBHOOK] Failed to log webhook error:", logError);
      }
      
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // GET /api/crm/webhooks/:integrationId/logs - Get webhook logs
  app.get('/api/crm/webhooks/:integrationId/logs', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can view webhook logs" });
      }

      const integration = await storage.getCrmIntegration(req.params.integrationId);
      
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      // Check ownership
      const userCompanyId = req.session.user.companyId;
      const canView = integration.contractorUserId === req.session.user.id ||
        (userCompanyId && integration.companyId === userCompanyId);
      
      if (!canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getWebhookLogs(req.params.integrationId, limit);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  // ============================================
  // CRM Pro Tier Routes - Client Management, Jobs, Quotes, Invoices
  // ============================================

  // Helper function to check Pro tier access
  async function hasCrmProAccess(user: any): Promise<boolean> {
    if (!user || user.role !== 'contractor') return false;

    // Demo contractor accounts always have full CRM access — matched only by
    // the immutable demo user ID prefix, never by user-supplied email content
    if (user.id?.startsWith('demo-contractor')) {
      return true;
    }

    // Grandfathered users get full CRM access
    if (user.subscriptionStatus === 'grandfathered') {
      return true;
    }
    
    // Check if user's subscription plan has CRM access
    if (user.subscriptionPlanId) {
      const plan = await db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, user.subscriptionPlanId))
        .limit(1);
      return plan[0]?.hasCrmAccess === true;
    }
    
    // Check by tier name (for demo purposes or fallback)
    const tierName = user.subscriptionTierName;
    return tierName === 'contractor_pro';
  }

  // Helper function to check ownership of CRM resources
  function canAccessCrmResource(user: any, resource: { contractorUserId: string; companyId?: string | null }): boolean {
    if (resource.contractorUserId === user.id) return true;
    if (user.companyId && resource.companyId === user.companyId) return true;
    return false;
  }

  // -------------------- CRM Clients Routes --------------------

  // GET /api/crm/clients - List all clients - PAID FEATURE
  app.get('/api/crm/clients', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }

      // Phase 7: app-level pagination (array shape preserved for frontend compat)
      const limit = Math.min(parseInt(req.query.limit as string) || 500, 500);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const allClients = await storage.getCrmClients(req.session.user.id, filters);
      const clients = allClients.slice(offset, offset + limit);
      res.setHeader('X-Total-Count', String(allClients.length));
      res.setHeader('X-Limit', String(limit));
      res.setHeader('X-Offset', String(offset));
      res.json(clients);
    } catch (error) {
      console.error("Error fetching CRM clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // POST /api/crm/clients - Create new client
  app.post('/api/crm/clients', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const validationResult = insertCrmClientSchema.safeParse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: validationResult.error.issues 
        });
      }

      const client = await storage.createCrmClient(validationResult.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating CRM client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // GET /api/crm/clients/:id - Get single client
  // Phase 7: Added requireContractorSubscription for CRM security consistency
  app.get('/api/crm/clients/:id', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const client = await storage.getCrmClient(req.params.id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!canAccessCrmResource(req.session.user, client)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(client);
    } catch (error) {
      console.error("Error fetching CRM client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // PATCH /api/crm/clients/:id - Update client
  // Phase 7: Added requireContractorSubscription for CRM security consistency
  app.patch('/api/crm/clients/:id', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingClient = await storage.getCrmClient(req.params.id);
      
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingClient)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmClientSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: validationResult.error.issues 
        });
      }

      const updatedClient = await storage.updateCrmClient(req.params.id, validationResult.data);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating CRM client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // DELETE /api/crm/clients/:id - Soft delete client (set isActive = false)
  // Phase 7: Added requireContractorSubscription for CRM security consistency
  app.delete('/api/crm/clients/:id', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingClient = await storage.getCrmClient(req.params.id);
      
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingClient)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Soft delete - set isActive to false
      await storage.updateCrmClient(req.params.id, { isActive: false });
      res.json({ message: "Client deactivated successfully" });
    } catch (error) {
      console.error("Error deleting CRM client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // -------------------- CRM Jobs Routes --------------------

  // GET /api/crm/jobs - List all jobs
  app.get('/api/crm/jobs', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.clientId) {
        filters.clientId = req.query.clientId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      // Phase 7: app-level pagination (array shape preserved for frontend compat)
      const limit = Math.min(parseInt(req.query.limit as string) || 500, 500);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const allJobs = await storage.getCrmJobs(req.session.user.id, filters);
      const jobs = allJobs.slice(offset, offset + limit);
      res.setHeader('X-Total-Count', String(allJobs.length));
      res.setHeader('X-Limit', String(limit));
      res.setHeader('X-Offset', String(offset));
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching CRM jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // POST /api/crm/jobs - Create new job
  app.post('/api/crm/jobs', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const validationResult = insertCrmJobSchema.safeParse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid job data", 
          errors: validationResult.error.issues 
        });
      }

      const job = await storage.createCrmJob(validationResult.data);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating CRM job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  // GET /api/crm/jobs/:id - Get single job
  app.get('/api/crm/jobs/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const job = await storage.getCrmJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, job)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching CRM job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  // PATCH /api/crm/jobs/:id - Update job
  app.patch('/api/crm/jobs/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingJob = await storage.getCrmJob(req.params.id);
      
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingJob)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmJobSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid job data", 
          errors: validationResult.error.issues 
        });
      }

      const updatedJob = await storage.updateCrmJob(req.params.id, validationResult.data);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating CRM job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  // DELETE /api/crm/jobs/:id - Delete job
  app.delete('/api/crm/jobs/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingJob = await storage.getCrmJob(req.params.id);
      
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingJob)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmJob(req.params.id);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // POST /api/crm/jobs/:id/notify - Send job notification via email and/or SMS
  app.post('/api/crm/jobs/:id/notify', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const sendMethodSchema = z.object({
        method: z.enum(['email', 'sms', 'both']).default('email'),
      });
      const methodResult = sendMethodSchema.safeParse(req.body);
      if (!methodResult.success) {
        return res.status(400).json({ message: "Invalid method. Must be 'email', 'sms', or 'both'" });
      }
      const { method } = methodResult.data;

      const existingJob = await storage.getCrmJob(req.params.id);
      
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingJob)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get client info
      const client = await storage.getCrmClient(existingJob.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get contractor info
      const contractor = await storage.getContractorByUserId(req.session.user.id);
      const user = await storage.getUser(req.session.user.id);
      const company = contractor?.companyId ? await storage.getCompany(contractor.companyId) : null;

      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://gotohomebase.com' : `https://${req.headers.host}`;
      const viewUrl = `${baseUrl}/crm/jobs/${existingJob.id}`;

      const formatCurrency = (amount: string | number | null) => amount ? `$${parseFloat(String(amount)).toFixed(2)}` : '$0.00';
      const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : undefined;

      const emailData = {
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || '',
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        contractorPhone: user?.phone || contractor?.phone,
        contractorEmail: user?.email ?? undefined,
        documentNumber: existingJob.id,
        documentTitle: existingJob.title,
        total: formatCurrency(existingJob.totalCost),
        scheduledDate: formatDate(existingJob.scheduledDate),
        status: existingJob.status,
        viewUrl,
      };

      const smsData = {
        clientPhone: client.phone || '',
        clientName: client.firstName,
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        documentNumber: existingJob.id,
        documentTitle: existingJob.title,
        total: formatCurrency(existingJob.totalCost),
        scheduledDate: formatDate(existingJob.scheduledDate),
        viewUrl,
      };

      let emailSent = false;
      let smsSent = false;

      // Validate client has required contact info
      if ((method === 'email' || method === 'both') && !client.email) {
        return res.status(400).json({ message: "Client has no email address. Please update client info or use SMS." });
      }
      if ((method === 'sms' || method === 'both') && !client.phone) {
        return res.status(400).json({ message: "Client has no phone number. Please update client info or use email." });
      }

      if ((method === 'email' || method === 'both') && client.email) {
        emailSent = await emailService.sendJobNotificationEmail(emailData);
      }

      if ((method === 'sms' || method === 'both') && client.phone) {
        smsSent = await smsService.sendJobNotificationSMS(smsData);
      }

      res.json({ 
        success: true,
        emailSent, 
        smsSent,
        message: `Notification sent${emailSent ? ' via email' : ''}${smsSent ? (emailSent ? ' and SMS' : ' via SMS') : ''}` 
      });
    } catch (error) {
      console.error("Error sending CRM job notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // -------------------- CRM Quotes Routes --------------------

  // GET /api/crm/quotes - List all quotes
  app.get('/api/crm/quotes', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.clientId) {
        filters.clientId = req.query.clientId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      const quotes = await storage.getCrmQuotes(req.session.user.id, filters);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching CRM quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // POST /api/crm/quotes - Create new quote
  app.post('/api/crm/quotes', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      // Auto-generate quote number
      const year = new Date().getFullYear();
      const existingQuotes = await storage.getCrmQuotes(req.session.user.id, {});
      const quoteCount = existingQuotes.length + 1;
      const quoteNumber = `Q-${year}-${quoteCount.toString().padStart(4, '0')}`;

      const validationResult = insertCrmQuoteSchema.safeParse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
        quoteNumber,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid quote data", 
          errors: validationResult.error.issues 
        });
      }

      const quote = await storage.createCrmQuote(validationResult.data);
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating CRM quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  // GET /api/crm/quotes/:id - Get single quote
  app.get('/api/crm/quotes/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const quote = await storage.getCrmQuote(req.params.id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, quote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Error fetching CRM quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // PATCH /api/crm/quotes/:id - Update quote
  app.patch('/api/crm/quotes/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingQuote = await storage.getCrmQuote(req.params.id);
      
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingQuote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmQuoteSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid quote data", 
          errors: validationResult.error.issues 
        });
      }

      const updatedQuote = await storage.updateCrmQuote(req.params.id, validationResult.data);
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating CRM quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // POST /api/crm/quotes/:id/send - Send quote via email and/or SMS
  app.post('/api/crm/quotes/:id/send', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const sendMethodSchema = z.object({
        method: z.enum(['email', 'sms', 'both']).default('email'),
      });
      const methodResult = sendMethodSchema.safeParse(req.body);
      if (!methodResult.success) {
        return res.status(400).json({ message: "Invalid method. Must be 'email', 'sms', or 'both'" });
      }
      const { method } = methodResult.data;

      const existingQuote = await storage.getCrmQuote(req.params.id);
      
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingQuote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get client info
      const client = await storage.getCrmClient(existingQuote.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get contractor info
      const contractor = await storage.getContractorByUserId(req.session.user.id);
      const user = await storage.getUser(req.session.user.id);
      const company = contractor?.companyId ? await storage.getCompany(contractor.companyId) : null;

      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://gotohomebase.com' : `https://${req.headers.host}`;
      const viewUrl = `${baseUrl}/pay/invoice/${existingQuote.id}`;

      const formatCurrency = (amount: string | number) => `$${parseFloat(String(amount)).toFixed(2)}`;
      const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined;

      const lineItems = Array.isArray(existingQuote.lineItems) ? (existingQuote.lineItems as any[]).map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: formatCurrency(item.unitPrice || 0),
        total: formatCurrency(item.total || 0),
      })) : [];

      const emailData = {
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || '',
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        contractorPhone: user?.phone || contractor?.phone,
        contractorEmail: user?.email ?? undefined,
        documentNumber: existingQuote.quoteNumber,
        documentTitle: existingQuote.title,
        total: formatCurrency(existingQuote.total),
        validUntil: formatDate(existingQuote.validUntil),
        viewUrl,
        lineItems,
      };

      const smsData = {
        clientPhone: client.phone || '',
        clientName: client.firstName,
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        documentNumber: existingQuote.quoteNumber,
        documentTitle: existingQuote.title,
        total: formatCurrency(existingQuote.total),
        viewUrl,
      };

      let emailSent = false;
      let smsSent = false;

      // Validate client has required contact info
      if ((method === 'email' || method === 'both') && !client.email) {
        return res.status(400).json({ message: "Client has no email address. Please update client info or use SMS." });
      }
      if ((method === 'sms' || method === 'both') && !client.phone) {
        return res.status(400).json({ message: "Client has no phone number. Please update client info or use email." });
      }

      if ((method === 'email' || method === 'both') && client.email) {
        emailSent = await emailService.sendQuoteEmail(emailData);
      }

      if ((method === 'sms' || method === 'both') && client.phone) {
        smsSent = await smsService.sendQuoteSMS(smsData);
      }

      const updatedQuote = await storage.updateCrmQuote(req.params.id, {
        status: 'sent',
        sentAt: new Date(),
      });

      res.json({ 
        ...updatedQuote, 
        emailSent, 
        smsSent,
        message: `Quote sent${emailSent ? ' via email' : ''}${smsSent ? (emailSent ? ' and SMS' : ' via SMS') : ''}` 
      });
    } catch (error) {
      console.error("Error sending CRM quote:", error);
      res.status(500).json({ message: "Failed to send quote" });
    }
  });

  // DELETE /api/crm/quotes/:id - Delete quote
  app.delete('/api/crm/quotes/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingQuote = await storage.getCrmQuote(req.params.id);
      
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingQuote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmQuote(req.params.id);
      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // -------------------- CRM Invoices Routes --------------------

  // GET /api/crm/invoices - List all invoices
  app.get('/api/crm/invoices', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.clientId) {
        filters.clientId = req.query.clientId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.jobId) {
        filters.jobId = req.query.jobId as string;
      }

      const invoices = await storage.getCrmInvoices(req.session.user.id, filters);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching CRM invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // POST /api/crm/invoices - Create new invoice
  app.post('/api/crm/invoices', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      // Auto-generate invoice number
      const year = new Date().getFullYear();
      const existingInvoices = await storage.getCrmInvoices(req.session.user.id, {});
      const invoiceCount = existingInvoices.length + 1;
      const invoiceNumber = `INV-${year}-${invoiceCount.toString().padStart(4, '0')}`;

      // Resolve homeowner linkage server-side via connection code.
      // Never trust homeownerId/houseId from client payload directly.
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { connectionCode, houseId: requestedHouseId, homeownerId: _ignored, ...invoiceBody } = req.body;
      let resolvedHomeownerId: string | null = null;
      let resolvedHouseId: string | null = null;

      if (connectionCode) {
        const codeResult = await storage.validatePermanentConnectionCode(connectionCode);
        if (!codeResult) {
          return res.status(400).json({ message: "Invalid connection code" });
        }
        resolvedHomeownerId = codeResult.homeownerId;

        if (requestedHouseId) {
          const validHouse = codeResult.houses.find((h) => h.id === requestedHouseId);
          if (!validHouse) {
            return res.status(400).json({ message: "Selected property does not belong to this homeowner" });
          }
          resolvedHouseId = requestedHouseId;
        } else if (codeResult.houses.length === 1) {
          resolvedHouseId = codeResult.houses[0].id;
        }
      }

      const validationResult = insertCrmInvoiceSchema.safeParse({
        ...invoiceBody,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
        invoiceNumber,
        homeownerId: resolvedHomeownerId,
        houseId: resolvedHouseId,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: validationResult.error.issues 
        });
      }

      const invoice = await storage.createCrmInvoice(validationResult.data);

      if (resolvedHomeownerId) {
        const DEDUP_WINDOW_MS = 5 * 60 * 1000;
        const now = Date.now();
        const toNumeric = (v: string | number | null | undefined) => parseFloat(String(v ?? '0')) || 0;
        const isDuplicate = existingInvoices.some((existing) => {
          if (existing.homeownerId !== resolvedHomeownerId) return false;
          if ((existing.title || '') !== (invoice.title || '')) return false;
          if (toNumeric(existing.amountDue) !== toNumeric(invoice.amountDue)) return false;
          const age = now - new Date(existing.createdAt || 0).getTime();
          return age <= DEDUP_WINDOW_MS;
        });

        if (isDuplicate) {
          console.warn('[EMAIL] Skipping duplicate linked invoice email: same contractor, homeowner, title, and amount within 5 minutes. Invoice ID:', invoice.id);
        } else {
          const contractorUser = req.session.user;
          const contractorName = `${contractorUser.firstName || ''} ${contractorUser.lastName || ''}`.trim() || 'Your Contractor';
          let contractorCompany: string | undefined;
          if (contractorUser.companyId) {
            try {
              const company = await storage.getCompany(contractorUser.companyId);
              contractorCompany = company?.name || undefined;
            } catch {
            }
          }
          const formatAmount = (amount: string | number | null) => amount ? `$${parseFloat(String(amount)).toFixed(2)}` : '$0.00';
          emailService.sendNewLinkedInvoiceEmail(
            resolvedHomeownerId,
            invoice.id,
            invoice.title || 'Invoice',
            formatAmount(invoice.amountDue),
            contractorName,
            contractorCompany
          ).catch((err) => console.error('[EMAIL] Failed to send new linked invoice email:', err));
        }
      }

      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating CRM invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // GET /api/crm/invoices/:id - Get single invoice
  app.get('/api/crm/invoices/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const invoice = await storage.getCrmInvoice(req.params.id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, invoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching CRM invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // PATCH /api/crm/invoices/:id - Update invoice
  app.patch('/api/crm/invoices/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmInvoiceSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: validationResult.error.issues 
        });
      }

      const updatedInvoice = await storage.updateCrmInvoice(req.params.id, validationResult.data);

      // Notify homeowner if invoice is linked and material fields changed
      if (existingInvoice.homeownerId) {
        const update = validationResult.data;
        const formatCurrencyOpt = (val: string | number | null | undefined) =>
          val != null ? `$${parseFloat(String(val)).toFixed(2)}` : null;
        const formatDateOpt = (val: Date | null | undefined) =>
          val ? new Date(val).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

        const materialChanges: import('../email-service').InvoiceChangeSummary[] = [];

        if (update.title !== undefined && update.title !== existingInvoice.title) {
          materialChanges.push({ field: 'Service', oldValue: existingInvoice.title || '', newValue: update.title });
        }
        if (update.total !== undefined && parseFloat(String(update.total)) !== parseFloat(String(existingInvoice.total))) {
          materialChanges.push({ field: 'Total', oldValue: formatCurrencyOpt(existingInvoice.total) || '', newValue: formatCurrencyOpt(update.total) || '' });
        }
        if (update.dueDate !== undefined) {
          const oldDate = formatDateOpt(existingInvoice.dueDate);
          const newDate = formatDateOpt(update.dueDate as Date | null);
          if (oldDate !== newDate) {
            materialChanges.push({ field: 'Due Date', oldValue: oldDate || 'None', newValue: newDate || 'None' });
          }
        }
        if (update.status !== undefined && update.status !== existingInvoice.status) {
          materialChanges.push({ field: 'Status', oldValue: existingInvoice.status || '', newValue: update.status });
        }

        if (materialChanges.length > 0) {
          const contractorUser = req.session.user;
          const contractorName = `${contractorUser.firstName || ''} ${contractorUser.lastName || ''}`.trim() || 'Your Contractor';
          let contractorCompany: string | undefined;
          if (contractorUser.companyId) {
            try {
              const company = await storage.getCompany(contractorUser.companyId);
              contractorCompany = company?.name || undefined;
            } catch { }
          }
          const currentAmount = `$${parseFloat(String(updatedInvoice?.amountDue ?? existingInvoice.amountDue)).toFixed(2)}`;
          emailService.sendInvoiceUpdatedEmail(
            existingInvoice.homeownerId,
            existingInvoice.id,
            updatedInvoice?.title || existingInvoice.title || 'Invoice',
            currentAmount,
            contractorName,
            contractorCompany,
            materialChanges
          ).catch((err) => console.error('[EMAIL] Failed to send invoice updated email:', err));
        }
      }

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating CRM invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // POST /api/crm/invoices/:id/send - Send invoice via email and/or SMS
  app.post('/api/crm/invoices/:id/send', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const sendMethodSchema = z.object({
        method: z.enum(['email', 'sms', 'both']).default('email'),
      });
      const methodResult = sendMethodSchema.safeParse(req.body);
      if (!methodResult.success) {
        return res.status(400).json({ message: "Invalid method. Must be 'email', 'sms', or 'both'" });
      }
      const { method } = methodResult.data;

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get client info
      const client = await storage.getCrmClient(existingInvoice.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get contractor info
      const contractor = await storage.getContractorByUserId(req.session.user.id);
      const user = await storage.getUser(req.session.user.id);
      const company = contractor?.companyId ? await storage.getCompany(contractor.companyId) : null;

      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://gotohomebase.com' : `https://${req.headers.host}`;
      const viewUrl = `${baseUrl}/pay/invoice/${existingInvoice.id}`;

      const formatCurrency = (amount: string | number) => `$${parseFloat(String(amount)).toFixed(2)}`;
      const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined;

      const lineItems = Array.isArray(existingInvoice.lineItems) ? (existingInvoice.lineItems as any[]).map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: formatCurrency(item.unitPrice || 0),
        total: formatCurrency(item.total || 0),
      })) : [];

      const emailData = {
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || '',
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        contractorPhone: user?.phone || contractor?.phone,
        contractorEmail: user?.email ?? undefined,
        documentNumber: existingInvoice.invoiceNumber,
        documentTitle: existingInvoice.title,
        total: formatCurrency(existingInvoice.amountDue),
        dueDate: formatDate(existingInvoice.dueDate),
        viewUrl,
        lineItems,
      };

      const smsData = {
        clientPhone: client.phone || '',
        clientName: client.firstName,
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        documentNumber: existingInvoice.invoiceNumber,
        documentTitle: existingInvoice.title,
        total: formatCurrency(existingInvoice.amountDue),
        dueDate: formatDate(existingInvoice.dueDate),
        viewUrl,
      };

      let emailSent = false;
      let smsSent = false;

      // Validate client has required contact info
      if ((method === 'email' || method === 'both') && !client.email) {
        return res.status(400).json({ message: "Client has no email address. Please update client info or use SMS." });
      }
      if ((method === 'sms' || method === 'both') && !client.phone) {
        return res.status(400).json({ message: "Client has no phone number. Please update client info or use email." });
      }

      if ((method === 'email' || method === 'both') && client.email) {
        emailSent = await emailService.sendInvoiceEmail(emailData);
      }

      if ((method === 'sms' || method === 'both') && client.phone) {
        smsSent = await smsService.sendInvoiceSMS(smsData);
      }

      const updatedInvoice = await storage.updateCrmInvoice(req.params.id, {
        status: 'sent',
        sentAt: new Date(),
      });

      res.json({ 
        ...updatedInvoice, 
        emailSent, 
        smsSent,
        message: `Invoice sent${emailSent ? ' via email' : ''}${smsSent ? (emailSent ? ' and SMS' : ' via SMS') : ''}` 
      });
    } catch (error) {
      console.error("Error sending CRM invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  // POST /api/crm/invoices/:id/payment - Record payment
  app.post('/api/crm/invoices/:id/payment', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const paymentSchema = z.object({
        amount: z.string().or(z.number()).transform(val => String(val)),
        paymentMethod: z.string().optional(),
        paymentNotes: z.string().optional(),
      });

      const validationResult = paymentSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid payment data", 
          errors: validationResult.error.issues 
        });
      }

      const paymentAmount = parseFloat(validationResult.data.amount);
      const currentAmountPaid = parseFloat(existingInvoice.amountPaid || '0');
      const newAmountPaid = currentAmountPaid + paymentAmount;
      const totalAmount = parseFloat(existingInvoice.total);
      const newAmountDue = totalAmount - newAmountPaid;

      let newStatus = existingInvoice.status;
      if (newAmountDue <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      const updatedInvoice = await storage.updateCrmInvoice(req.params.id, {
        amountPaid: newAmountPaid.toFixed(2),
        amountDue: Math.max(0, newAmountDue).toFixed(2),
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : existingInvoice.paidAt,
        paymentMethod: validationResult.data.paymentMethod || existingInvoice.paymentMethod,
        paymentNotes: validationResult.data.paymentNotes || existingInvoice.paymentNotes,
      });

      // Notify homeowner if invoice is linked
      if (existingInvoice.homeownerId) {
        const contractorUser = req.session.user;
        const contractorName = `${contractorUser.firstName || ''} ${contractorUser.lastName || ''}`.trim() || 'Your Contractor';
        let contractorCompany: string | undefined;
        if (contractorUser.companyId) {
          try {
            const company = await storage.getCompany(contractorUser.companyId);
            contractorCompany = company?.name || undefined;
          } catch { }
        }
        const formatAmount = (val: string | number) => `$${parseFloat(String(val)).toFixed(2)}`;
        emailService.sendInvoicePaymentConfirmationEmail(
          existingInvoice.homeownerId,
          existingInvoice.id,
          existingInvoice.title || 'Invoice',
          formatAmount(paymentAmount),
          formatAmount(totalAmount),
          contractorName,
          contractorCompany,
          newStatus === 'paid'
        ).catch((err) => console.error('[EMAIL] Failed to send invoice payment confirmation email:', err));
      }

      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  // DELETE /api/crm/invoices/:id - Delete invoice
  app.delete('/api/crm/invoices/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmInvoice(req.params.id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // -------------------- CRM Dashboard Route --------------------

  // GET /api/crm/dashboard - Get dashboard stats
  app.get('/api/crm/dashboard', isAuthenticated, requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const userId = req.session.user.id;

      // Fetch all data for dashboard
      const [clients, jobs, quotes, invoices] = await Promise.all([
        storage.getCrmClients(userId, {}),  // active clients only
        storage.getCrmJobs(userId, {}),
        storage.getCrmQuotes(userId, {}),
        storage.getCrmInvoices(userId, {}),
      ]);

      // Calculate stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Jobs stats
      const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length;
      const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length;
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const completedThisMonth = jobs.filter(j => 
        j.status === 'completed' && 
        j.updatedAt && new Date(j.updatedAt) >= thisMonth
      ).length;

      // Quotes stats
      const pendingQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft').length;
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
      const totalQuoteValue = quotes.reduce((sum, q) => sum + parseFloat(q.total), 0);

      // Invoice stats
      const unpaidInvoices = invoices.filter(i => 
        i.status !== 'paid' && i.status !== 'cancelled'
      );
      const overdueInvoices = unpaidInvoices.filter(i => 
        i.dueDate && new Date(i.dueDate) < now
      );
      const totalOutstanding = unpaidInvoices.reduce((sum, i) => 
        sum + parseFloat(i.amountDue), 0
      );
      const totalPaidThisMonth = invoices
        .filter(i => i.paidAt && new Date(i.paidAt) >= thisMonth)
        .reduce((sum, i) => sum + parseFloat(i.amountPaid || '0'), 0);

      // Revenue calculation
      const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.total), 0);

      res.json({
        clients: {
          total: clients.length,
          active: clients.filter(c => c.isActive).length,
        },
        jobs: {
          scheduled: scheduledJobs,
          inProgress: inProgressJobs,
          completed: completedJobs,
          completedThisMonth,
          total: jobs.length,
        },
        quotes: {
          pending: pendingQuotes,
          accepted: acceptedQuotes,
          totalValue: totalQuoteValue.toFixed(2),
          total: quotes.length,
        },
        invoices: {
          unpaid: unpaidInvoices.length,
          overdue: overdueInvoices.length,
          totalOutstanding: totalOutstanding.toFixed(2),
          paidThisMonth: totalPaidThisMonth.toFixed(2),
          total: invoices.length,
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          thisMonth: totalPaidThisMonth.toFixed(2),
        },
      });
    } catch (error) {
      console.error("Error fetching CRM dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // -------------------- CRM Import Route --------------------

  // POST /api/crm/import - Import data from another CRM (JSON format)
  app.post('/api/crm/import', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const { clients = [], jobs = [], quotes = [], invoices = [] } = req.body;
      const userId = req.session.user.id;
      const companyId = req.session.user.companyId || null;
      
      const results = {
        clients: { imported: 0, failed: 0, errors: [] as string[] },
        jobs: { imported: 0, failed: 0, errors: [] as string[] },
        quotes: { imported: 0, failed: 0, errors: [] as string[] },
        invoices: { imported: 0, failed: 0, errors: [] as string[] },
      };

      // Map to track imported client names to IDs for linking jobs/quotes/invoices
      const clientNameToId: Map<string, string> = new Map();

      // Step 1: Import clients first (they're referenced by jobs, quotes, invoices)
      for (const clientData of clients) {
        try {
          const validationResult = insertCrmClientSchema.safeParse({
            ...clientData,
            contractorUserId: userId,
            companyId,
            isActive: clientData.isActive ?? true,
            totalJobsCompleted: clientData.totalJobsCompleted ?? 0,
            totalRevenue: clientData.totalRevenue ?? "0.00",
          });

          if (!validationResult.success) {
            results.clients.failed++;
            results.clients.errors.push(`Client "${clientData.firstName} ${clientData.lastName}": ${validationResult.error.issues[0]?.message}`);
            continue;
          }

          const client = await storage.createCrmClient(validationResult.data);
          results.clients.imported++;
          
          // Store mapping for later use
          const fullName = `${clientData.firstName} ${clientData.lastName}`.toLowerCase().trim();
          clientNameToId.set(fullName, client.id);
          
          // Also store by email if provided
          if (clientData.email) {
            clientNameToId.set(clientData.email.toLowerCase().trim(), client.id);
          }
        } catch (error: any) {
          results.clients.failed++;
          results.clients.errors.push(`Client "${clientData.firstName} ${clientData.lastName}": ${error.message}`);
        }
      }

      // Helper function to resolve client ID from name or email
      const resolveClientId = (job: any): string | null => {
        if (job.clientId && clientNameToId.has(job.clientId)) {
          return clientNameToId.get(job.clientId)!;
        }
        if (job.clientName) {
          const name = job.clientName.toLowerCase().trim();
          if (clientNameToId.has(name)) return clientNameToId.get(name)!;
        }
        if (job.clientEmail) {
          const email = job.clientEmail.toLowerCase().trim();
          if (clientNameToId.has(email)) return clientNameToId.get(email)!;
        }
        return null;
      };

      // Step 2: Import jobs
      for (const jobData of jobs) {
        try {
          const clientId = resolveClientId(jobData);
          if (!clientId) {
            results.jobs.failed++;
            results.jobs.errors.push(`Job "${jobData.title}": Client not found. Provide clientName or clientEmail that matches an imported client.`);
            continue;
          }

          const validationResult = insertCrmJobSchema.safeParse({
            ...jobData,
            contractorUserId: userId,
            companyId,
            clientId,
            scheduledDate: jobData.scheduledDate ? new Date(jobData.scheduledDate) : new Date(),
            scheduledEndDate: jobData.scheduledEndDate ? new Date(jobData.scheduledEndDate) : null,
            status: jobData.status || 'scheduled',
            priority: jobData.priority || 'normal',
          });

          if (!validationResult.success) {
            results.jobs.failed++;
            results.jobs.errors.push(`Job "${jobData.title}": ${validationResult.error.issues[0]?.message}`);
            continue;
          }

          await storage.createCrmJob(validationResult.data);
          results.jobs.imported++;
        } catch (error: any) {
          results.jobs.failed++;
          results.jobs.errors.push(`Job "${jobData.title}": ${error.message}`);
        }
      }

      // Step 3: Import quotes
      for (const quoteData of quotes) {
        try {
          const clientId = resolveClientId(quoteData);
          if (!clientId) {
            results.quotes.failed++;
            results.quotes.errors.push(`Quote "${quoteData.title}": Client not found. Provide clientName or clientEmail that matches an imported client.`);
            continue;
          }

          // Generate quote number if not provided
          const quoteNumber = quoteData.quoteNumber || `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const validationResult = insertCrmQuoteSchema.safeParse({
            ...quoteData,
            contractorUserId: userId,
            companyId,
            clientId,
            quoteNumber,
            lineItems: quoteData.lineItems || [],
            subtotal: quoteData.subtotal || quoteData.total || "0.00",
            total: quoteData.total || quoteData.subtotal || "0.00",
            status: quoteData.status || 'draft',
            validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : null,
          });

          if (!validationResult.success) {
            results.quotes.failed++;
            results.quotes.errors.push(`Quote "${quoteData.title}": ${validationResult.error.issues[0]?.message}`);
            continue;
          }

          await storage.createCrmQuote(validationResult.data);
          results.quotes.imported++;
        } catch (error: any) {
          results.quotes.failed++;
          results.quotes.errors.push(`Quote "${quoteData.title}": ${error.message}`);
        }
      }

      // Step 4: Import invoices
      for (const invoiceData of invoices) {
        try {
          const clientId = resolveClientId(invoiceData);
          if (!clientId) {
            results.invoices.failed++;
            results.invoices.errors.push(`Invoice "${invoiceData.title}": Client not found. Provide clientName or clientEmail that matches an imported client.`);
            continue;
          }

          // Generate invoice number if not provided
          const invoiceNumber = invoiceData.invoiceNumber || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const validationResult = insertCrmInvoiceSchema.safeParse({
            ...invoiceData,
            contractorUserId: userId,
            companyId,
            clientId,
            invoiceNumber,
            lineItems: invoiceData.lineItems || [],
            subtotal: invoiceData.subtotal || invoiceData.total || "0.00",
            total: invoiceData.total || invoiceData.subtotal || "0.00",
            amountDue: invoiceData.amountDue || invoiceData.total || "0.00",
            amountPaid: invoiceData.amountPaid || "0.00",
            status: invoiceData.status || 'draft',
            dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
          });

          if (!validationResult.success) {
            results.invoices.failed++;
            results.invoices.errors.push(`Invoice "${invoiceData.title}": ${validationResult.error.issues[0]?.message}`);
            continue;
          }

          await storage.createCrmInvoice(validationResult.data);
          results.invoices.imported++;
        } catch (error: any) {
          results.invoices.failed++;
          results.invoices.errors.push(`Invoice "${invoiceData.title}": ${error.message}`);
        }
      }

      const totalImported = results.clients.imported + results.jobs.imported + results.quotes.imported + results.invoices.imported;
      const totalFailed = results.clients.failed + results.jobs.failed + results.quotes.failed + results.invoices.failed;

      res.json({
        success: true,
        message: `Import completed: ${totalImported} records imported, ${totalFailed} failed`,
        results,
      });
    } catch (error) {
      console.error("Error importing CRM data:", error);
      res.status(500).json({ message: "Failed to import CRM data" });
    }
  });

  // GET /api/crm/import/template - Get JSON template for import
  app.get('/api/crm/import/template', isAuthenticated, async (req: any, res: any) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const template = {
        clients: [
          {
            firstName: "John",
            lastName: "Smith",
            email: "john.smith@example.com",
            phone: "(555) 123-4567",
            address: "123 Main St",
            city: "Springfield",
            state: "IL",
            postalCode: "62701",
            notes: "Loyal customer since 2020",
            preferredContactMethod: "phone"
          }
        ],
        jobs: [
          {
            clientName: "John Smith",
            clientEmail: "john.smith@example.com",
            title: "Kitchen Remodel",
            description: "Complete kitchen renovation",
            serviceType: "Remodeling",
            scheduledDate: "2024-03-15T09:00:00Z",
            status: "scheduled",
            priority: "high",
            address: "123 Main St",
            city: "Springfield",
            state: "IL",
            postalCode: "62701",
            laborCost: "2500.00",
            materialsCost: "3500.00",
            totalCost: "6000.00",
            notes: "Customer prefers morning appointments"
          }
        ],
        quotes: [
          {
            clientName: "John Smith",
            title: "Bathroom Renovation Quote",
            description: "Master bathroom complete renovation",
            serviceType: "Remodeling",
            lineItems: [
              { description: "Demolition", quantity: 1, unitPrice: 500, total: 500 },
              { description: "Plumbing", quantity: 1, unitPrice: 1500, total: 1500 },
              { description: "Tile Installation", quantity: 1, unitPrice: 2000, total: 2000 }
            ],
            subtotal: "4000.00",
            taxRate: "8.00",
            taxAmount: "320.00",
            total: "4320.00",
            validUntil: "2024-04-15T00:00:00Z",
            status: "sent"
          }
        ],
        invoices: [
          {
            clientName: "John Smith",
            title: "Kitchen Remodel - Final Invoice",
            description: "Final payment for kitchen remodel project",
            lineItems: [
              { description: "Labor", quantity: 40, unitPrice: 62.50, total: 2500 },
              { description: "Materials", quantity: 1, unitPrice: 3500, total: 3500 }
            ],
            subtotal: "6000.00",
            taxRate: "8.00",
            taxAmount: "480.00",
            total: "6480.00",
            amountPaid: "3240.00",
            amountDue: "3240.00",
            dueDate: "2024-04-01T00:00:00Z",
            status: "partial"
          }
        ]
      };

      res.json(template);
    } catch (error) {
      console.error("Error generating import template:", error);
      res.status(500).json({ message: "Failed to generate import template" });
    }
  });

  // Error Tracking routes - For logging and monitoring errors
  app.post('/api/errors', async (req: any, res: any) => {
    try {
      const errorData = req.body;
      
      // Add user context if authenticated
      const userId = req.session?.user?.id || null;
      const userEmail = req.session?.user?.email || null;
      const userRole = req.session?.user?.role || null;
      
      const error = await storage.createErrorLog({
        ...errorData,
        userId,
        userEmail,
        userRole,
        userAgent: req.headers['user-agent'] || null,
      });
      
      // Create breadcrumbs if provided
      if (errorData.breadcrumbs && Array.isArray(errorData.breadcrumbs)) {
        for (const breadcrumb of errorData.breadcrumbs) {
          await storage.createErrorBreadcrumb({
            errorLogId: error.id,
            timestamp: new Date(breadcrumb.timestamp),
            eventType: breadcrumb.eventType,
            message: breadcrumb.message,
            data: breadcrumb.data || null,
          });
        }
      }
      
      res.json({ success: true, errorId: error.id });
    } catch (error) {
      console.error("Error logging error:", error);
      res.status(500).json({ message: "Failed to log error" });
    }
  });

  app.get('/api/errors', async (req: any, res: any) => {
    try {
      // Only allow admins to view errors
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const filters = {
        errorType: req.query.errorType as string,
        severity: req.query.severity as string,
        resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
        userId: req.query.userId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      };
      
      const errors = await storage.getErrorLogs(filters);
      res.json(errors);
    } catch (error) {
      console.error("Error fetching errors:", error);
      res.status(500).json({ message: "Failed to fetch errors" });
    }
  });

  app.get('/api/errors/:id', async (req: any, res: any) => {
    try {
      // Only allow admins to view errors
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const errorWithBreadcrumbs = await storage.getErrorLogWithBreadcrumbs(req.params.id);
      
      if (!errorWithBreadcrumbs) {
        return res.status(404).json({ message: "Error not found" });
      }
      
      res.json(errorWithBreadcrumbs);
    } catch (error) {
      console.error("Error fetching error details:", error);
      res.status(500).json({ message: "Failed to fetch error details" });
    }
  });

  app.patch('/api/errors/:id', async (req: any, res: any) => {
    try {
      // Only allow admins to update errors
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData: any = {};
      
      if (req.body.resolved !== undefined) {
        updateData.resolved = req.body.resolved;
        if (req.body.resolved) {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = req.session.user.id;
        }
      }
      
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes;
      }
      
      const updatedError = await storage.updateErrorLog(req.params.id, updateData);
      
      if (!updatedError) {
        return res.status(404).json({ message: "Error not found" });
      }
      
      res.json(updatedError);
    } catch (error) {
      console.error("Error updating error:", error);
      res.status(500).json({ message: "Failed to update error" });
    }
  });

  // Homeowner profile routes
  app.patch('/api/homeowner/profile', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'homeowner') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { firstName, lastName, email, phone, address } = req.body;
      const userId = req.session.user.id;

      // Update user profile
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        phone: phone,
        address: address,
        profileImageUrl: req.session.user.profileImageUrl,
        role: 'homeowner'
      });

      // Update session
      req.session.user = updatedUser;

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating homeowner profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.get('/api/homeowner/notifications/preferences', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'homeowner') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const { notificationPreferences: notifPrefsTable } = await import('@workspace/db');

      const rows = await db.select()
        .from(notifPrefsTable)
        .where(eq(notifPrefsTable.userId, userId));

      const prefsMap = new Map(rows.map(r => [r.notificationType, r]));

      const getEnabled = (type: string, defaultVal: boolean) => {
        const row = prefsMap.get(type);
        return row ? row.isEnabled : defaultVal;
      };

      const weatherAlertTypesRow = prefsMap.get('weather_alert_types');
      const weatherAlertTypes: string[] = (weatherAlertTypesRow?.channels && weatherAlertTypesRow.channels.length > 0)
        ? weatherAlertTypesRow.channels
        : [];

      res.json({
        emailNotifications: getEnabled('email', true),
        smsNotifications: getEnabled('sms', false),
        maintenanceReminders: getEnabled('maintenance', true),
        appointmentReminders: getEnabled('appointment', true),
        contractorMessages: getEnabled('messages', true),
        weeklyDigest: getEnabled('weeklyDigest', false),
        weatherAlerts: getEnabled('weather', true),
        weatherAlertTypes,
        weatherForecastReminders: getEnabled('weather_forecast_reminders', true),
      });
    } catch (error) {
      console.error("Error fetching homeowner notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  app.patch('/api/homeowner/notifications/preferences', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'homeowner') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const {
        emailNotifications,
        smsNotifications,
        maintenanceReminders,
        appointmentReminders,
        contractorMessages,
        weeklyDigest,
        weatherAlerts,
        weatherAlertTypes,
        weatherForecastReminders,
      } = req.body;

      const { notificationPreferences: notifPrefsTable } = await import('@workspace/db');

      const upsertPref = async (type: string, isEnabled: boolean, defaultChannels: string[] = ['email']) => {
        const existing = await db.select({ id: notifPrefsTable.id })
          .from(notifPrefsTable)
          .where(and(eq(notifPrefsTable.userId, userId), eq(notifPrefsTable.notificationType, type)))
          .limit(1);

        if (existing.length > 0) {
          await db.update(notifPrefsTable)
            .set({ isEnabled, updatedAt: new Date() })
            .where(and(eq(notifPrefsTable.userId, userId), eq(notifPrefsTable.notificationType, type)));
        } else {
          await db.insert(notifPrefsTable).values({
            userId,
            notificationType: type,
            isEnabled,
            channels: defaultChannels,
          });
        }
      };

      const upsertAlertTypes = async (enabledTypes: string[]) => {
        const existing = await db.select({ id: notifPrefsTable.id })
          .from(notifPrefsTable)
          .where(and(eq(notifPrefsTable.userId, userId), eq(notifPrefsTable.notificationType, 'weather_alert_types')))
          .limit(1);

        if (existing.length > 0) {
          await db.update(notifPrefsTable)
            .set({ channels: enabledTypes, updatedAt: new Date() })
            .where(and(eq(notifPrefsTable.userId, userId), eq(notifPrefsTable.notificationType, 'weather_alert_types')));
        } else {
          await db.insert(notifPrefsTable).values({
            userId,
            notificationType: 'weather_alert_types',
            isEnabled: true,
            channels: enabledTypes,
          });
        }
      };

      const updates: [string, boolean | undefined, string[]?][] = [
        ['email', emailNotifications],
        ['sms', smsNotifications],
        ['maintenance', maintenanceReminders],
        ['appointment', appointmentReminders],
        ['messages', contractorMessages],
        ['weeklyDigest', weeklyDigest],
        ['weather', weatherAlerts, ['email', 'push']],
        ['weather_forecast_reminders', weatherForecastReminders, ['email', 'push']],
      ];

      for (const [type, val, channels] of updates) {
        if (val !== undefined) {
          await upsertPref(type, val, channels);
        }
      }

      if (Array.isArray(weatherAlertTypes)) {
        await upsertAlertTypes(weatherAlertTypes);
      }

      console.log(`[NOTIF] Homeowner notification preferences saved for user ${userId}`);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Contractor notification preferences - GET
  app.get('/api/contractor/notifications/preferences', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      
      // Get message preferences
      const messagePrefs = await db.select()
        .from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notificationType, 'messages')
        ))
        .limit(1);
      
      // Get appointment preferences
      const appointmentPrefs = await db.select()
        .from(notificationPreferences)
        .where(and(
          eq(notificationPreferences.userId, userId),
          eq(notificationPreferences.notificationType, 'appointment')
        ))
        .limit(1);
      
      // Build response with defaults (all enabled by default for new users)
      const msgPref = messagePrefs[0];
      const aptPref = appointmentPrefs[0];
      
      const preferences = {
        emailNotifications: msgPref ? msgPref.channels.includes('email') : true,
        smsNotifications: msgPref ? msgPref.channels.includes('sms') : true,
        homeownerMessages: msgPref ? msgPref.isEnabled : true,
        leadAlerts: true, // Default to true
        appointmentReminders: aptPref ? aptPref.isEnabled : true,
      };
      
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching contractor notification preferences:", error);
      res.status(500).json({ message: "Failed to fetch notification preferences" });
    }
  });

  // Contractor notification preferences - PATCH
  app.patch('/api/contractor/notifications/preferences', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const { emailNotifications, smsNotifications, homeownerMessages, appointmentReminders } = req.body;
      
      console.log(`[NOTIF] Contractor notification preferences updated for user ${userId}:`, req.body);

      // Store message preferences
      if (homeownerMessages !== undefined || smsNotifications !== undefined || emailNotifications !== undefined) {
        const channels: string[] = [];
        if (smsNotifications && homeownerMessages) channels.push('sms');
        if (emailNotifications && homeownerMessages) channels.push('email');
        channels.push('push'); // Always include push notifications
        
        await db.insert(notificationPreferences)
          .values({
            userId,
            notificationType: 'messages',
            isEnabled: homeownerMessages !== false,
            channels,
          })
          .onConflictDoUpdate({
            target: [notificationPreferences.userId, notificationPreferences.notificationType],
            set: {
              isEnabled: homeownerMessages !== false,
              channels,
              updatedAt: new Date(),
            }
          });
        console.log(`[NOTIF] Saved 'messages' preference: enabled=${homeownerMessages}, channels=${channels}`);
      }

      // Store appointment preferences
      if (appointmentReminders !== undefined) {
        const channels: string[] = [];
        if (smsNotifications) channels.push('sms');
        if (emailNotifications) channels.push('email');
        channels.push('push');
        
        await db.insert(notificationPreferences)
          .values({
            userId,
            notificationType: 'appointment',
            isEnabled: appointmentReminders !== false,
            channels,
          })
          .onConflictDoUpdate({
            target: [notificationPreferences.userId, notificationPreferences.notificationType],
            set: {
              isEnabled: appointmentReminders !== false,
              channels,
              updatedAt: new Date(),
            }
          });
        console.log(`[NOTIF] Saved 'appointment' preference: enabled=${appointmentReminders}`);
      }

      res.json({ success: true, preferences: req.body });
    } catch (error) {
      console.error("Error updating contractor notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Contractor routes
  app.get("/api/contractors", async (req: any, res: any) => {
    try {
      const filters = {
        services: req.query.services ? (req.query.services as string).split(',') : undefined,
        location: req.query.location as string,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        availableThisWeek: req.query.availableThisWeek === 'true',
        hasEmergencyServices: req.query.hasEmergencyServices === 'true',
        maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined,
      };
      
      const houseId = req.query.houseId as string;

      const contractors = await storage.getContractors(filters);
      
      // If houseId is provided, filter contractors by distance
      let filteredContractors = contractors;
      if (houseId && filters.maxDistance) {
        const house = await storage.getHouse(houseId);
        if (house && house.latitude && house.longitude) {
          const houseLat = parseFloat(house.latitude);
          const houseLon = parseFloat(house.longitude);
          
          console.log('[DISTANCE FILTER] House location:', { lat: houseLat, lon: houseLon, maxDistance: filters.maxDistance });
          
          filteredContractors = [];
          for (const contractor of contractors) {
            // Get company location for the contractor
            if ((contractor as any).companyId) {
              const company = await storage.getCompany((contractor as any).companyId);
              if (company && company.latitude && company.longitude) {
                const companyLat = parseFloat(company.latitude);
                const companyLon = parseFloat(company.longitude);
                const distance = calculateDistance(houseLat, houseLon, companyLat, companyLon);
                
                console.log('[DISTANCE FILTER] Company:', company.name, 'Distance:', distance, 'miles');
                
                // Include contractor if within maxDistance AND within their service radius
                const effectiveRadius = Math.min(filters.maxDistance, company.serviceRadius);
                if (distance <= effectiveRadius) {
                  filteredContractors.push({
                    ...contractor,
                    distance: distance.toString()
                  } as any);
                }
              } else {
                // Company exists but doesn't have geocoded coordinates - include anyway
                console.log('[DISTANCE FILTER] Company has no coordinates, including contractor');
                filteredContractors.push(contractor);
              }
            } else {
              // Contractor has no company - include anyway
              console.log('[DISTANCE FILTER] Contractor has no company, including anyway');
              filteredContractors.push(contractor);
            }
          }
          
          console.log('[DISTANCE FILTER] Filtered from', contractors.length, 'to', filteredContractors.length, 'contractors');
        } else {
          console.log('[DISTANCE FILTER] House not found or missing coordinates:', houseId);
        }
      }
      
      // Enrich contractors with company logos and createdAt
      const enrichedContractors = await Promise.all(
        filteredContractors.map(async (contractor) => {
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              return {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          return contractor;
        })
      );
      
      // Phase 7: app-level pagination (array shape preserved for frontend compat)
      const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);
      const totalContractors = enrichedContractors.length;
      const pagedContractors = enrichedContractors.slice(offset, offset + limit);
      res.setHeader('X-Total-Count', String(totalContractors));
      res.setHeader('X-Limit', String(limit));
      res.setHeader('X-Offset', String(offset));
      req.log?.debug({ total: totalContractors, returned: pagedContractors.length }, '[contractors] list');
      res.json(pagedContractors);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ message: "Failed to fetch contractors" });
    }
  });

  app.get("/api/contractors/search", async (req: any, res: any) => {
    try {
      const query = req.query.q as string || "";
      const location = req.query.location as string;
      const servicesParam = req.query.services as string;
      const services = servicesParam ? servicesParam.split(',').map(s => s.trim()).filter(s => s) : undefined;
      const maxDistance = req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined;
      
      console.log('[CONTRACTOR SEARCH] ==================');
      console.log('[CONTRACTOR SEARCH] Query:', query);
      console.log('[CONTRACTOR SEARCH] Location:', location);
      console.log('[CONTRACTOR SEARCH] Services param:', servicesParam);
      console.log('[CONTRACTOR SEARCH] Services array:', services);
      console.log('[CONTRACTOR SEARCH] Max Distance (homeowner search radius):', maxDistance);
      console.log('[CONTRACTOR SEARCH] All query params:', req.query);
      
      const contractors = await storage.searchContractors(query, location, services, maxDistance);
      
      // Enrich contractors with company logos and createdAt
      const enrichedContractors = await Promise.all(
        contractors.map(async (contractor) => {
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              return {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          return contractor;
        })
      );
      
      console.log('[CONTRACTOR SEARCH] Results count:', enrichedContractors.length);
      console.log('[CONTRACTOR SEARCH] Results:', enrichedContractors.map(c => ({ 
        id: c.id, 
        company: c.company, 
        location: c.location,
        postalCode: (c as any).postalCode,
        distance: c.distance,
        serviceRadius: c.serviceRadius,
        services: c.services,
        businessLogo: (c as any).businessLogo
      })));
      console.log('[CONTRACTOR SEARCH] ==================');
      
      res.json(enrichedContractors);
    } catch (error) {
      console.error('[CONTRACTOR SEARCH] Error:', error);
      res.status(500).json({ message: "Failed to search contractors" });
    }
  });

  // Get contractors used at a specific house
  app.get("/api/houses/:houseId/contractors-used", isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      const houseId = req.params.houseId;
      
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view contractors used" });
      }
      
      // Verify house belongs to user
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== userId) {
        return res.status(403).json({ message: "House not found or unauthorized" });
      }
      
      // Get unique contractor IDs from various sources for this specific house
      const contractorDataMap = new Map<string, { lastUsed: Date, serviceType?: string }>();
      
      // From maintenance logs for this house
      const maintenanceLogs = await storage.getMaintenanceLogs(userId);
      maintenanceLogs
        .filter((log: any) => log.houseId === houseId && log.contractorId)
        .forEach((log: any) => {
          const existing = contractorDataMap.get(log.contractorId);
          const logDate = new Date(log.serviceDate);
          if (!existing || logDate > existing.lastUsed) {
            contractorDataMap.set(log.contractorId, {
              lastUsed: logDate,
              serviceType: log.serviceType
            });
          }
        });
      
      // From proposals for this house
      const proposals = await storage.getProposals(undefined, userId);
      proposals
        .filter((proposal: any) => proposal.houseId === houseId && proposal.contractorId && proposal.status === 'accepted')
        .forEach((proposal: any) => {
          const existing = contractorDataMap.get(proposal.contractorId);
          const proposalDate = new Date(proposal.createdAt);
          if (!existing || proposalDate > existing.lastUsed) {
            contractorDataMap.set(proposal.contractorId, {
              lastUsed: proposalDate,
              serviceType: proposal.serviceType
            });
          }
        });

      // From referral — if homeowner was referred by a contractor via their referral code
      const homeowner = await storage.getUser(userId);
      if (homeowner?.referredBy) {
        let referringContractorId: string | null = null;

        // Check user-level referral code first (homeowners referring other homeowners)
        const referrerByUserCode = await storage.getUserByReferralCode(homeowner.referredBy);
        if (referrerByUserCode && referrerByUserCode.role === 'contractor') {
          referringContractorId = referrerByUserCode.id;
        }

        // Fall back to company-level referral code (what contractors actually share)
        if (!referringContractorId) {
          const referrerCompany = await storage.getCompanyByReferralCode(homeowner.referredBy);
          if (referrerCompany?.ownerId) {
            const companyOwner = await storage.getUser(referrerCompany.ownerId);
            if (companyOwner?.role === 'contractor') {
              referringContractorId = companyOwner.id;
            }
          }
        }

        // Add referred contractor to the map if not already present from logs/proposals
        if (referringContractorId && !contractorDataMap.has(referringContractorId)) {
          contractorDataMap.set(referringContractorId, {
            lastUsed: homeowner.createdAt || new Date(),
            serviceType: 'referral',
          });
        }
      }

      // Fetch full contractor data for all unique contractor IDs
      const contractorIds = Array.from(contractorDataMap.keys());
      const contractors = await Promise.all(
        contractorIds.map(async (contractorId) => {
          const contractor = await storage.getContractor(contractorId);
          if (!contractor) return null;
          
          const metadata = contractorDataMap.get(contractorId);
          
          // Enrich with company data
          let enrichedContractor = { ...contractor };
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              enrichedContractor = {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          
          return {
            ...enrichedContractor,
            lastUsed: metadata?.lastUsed,
            lastServiceType: metadata?.serviceType
          };
        })
      );
      
      // Filter out nulls and sort by last used (most recent first)
      const validContractors = contractors
        .filter(c => c !== null)
        .sort((a, b) => {
          const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          return dateB - dateA;
        });
      
      console.log('[CONTRACTORS USED] House ID:', houseId);
      console.log('[CONTRACTORS USED] Found contractor IDs:', contractorIds);
      console.log('[CONTRACTORS USED] Returning contractors:', validContractors.length);
      console.log('[CONTRACTORS USED] Contractors:', validContractors.map(c => ({ id: c.id, name: c.name, company: c.company, createdAt: c.createdAt })));
      
      res.json(validContractors);
    } catch (error) {
      console.error("Error fetching contractors used at house:", error);
      res.status(500).json({ message: "Failed to fetch contractors used" });
    }
  });

  // Get all contractors previously used by homeowner (across all properties)
  app.get("/api/contractors/previously-used", isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view previously used contractors" });
      }
      
      // Get unique contractor IDs from various sources across ALL houses
      const contractorDataMap = new Map<string, { lastUsed: Date, serviceType?: string }>();
      
      // From maintenance logs (all houses)
      const maintenanceLogs = await storage.getMaintenanceLogs(userId);
      maintenanceLogs
        .filter((log: any) => log.contractorId)
        .forEach((log: any) => {
          const existing = contractorDataMap.get(log.contractorId);
          const logDate = new Date(log.serviceDate);
          if (!existing || logDate > existing.lastUsed) {
            contractorDataMap.set(log.contractorId, {
              lastUsed: logDate,
              serviceType: log.serviceType
            });
          }
        });
      
      // From proposals (all houses)
      const proposals = await storage.getProposals(undefined, userId);
      proposals
        .filter((proposal: any) => proposal.contractorId && proposal.status === 'accepted')
        .forEach((proposal: any) => {
          const existing = contractorDataMap.get(proposal.contractorId);
          const proposalDate = new Date(proposal.createdAt);
          if (!existing || proposalDate > existing.lastUsed) {
            contractorDataMap.set(proposal.contractorId, {
              lastUsed: proposalDate,
              serviceType: proposal.serviceType
            });
          }
        });
      
      // Fetch full contractor data for all unique contractor IDs
      const contractorIds = Array.from(contractorDataMap.keys());
      const contractors = await Promise.all(
        contractorIds.map(async (contractorId) => {
          const contractor = await storage.getContractor(contractorId);
          if (!contractor) return null;
          
          const metadata = contractorDataMap.get(contractorId);
          
          // Enrich with company data
          let enrichedContractor = { ...contractor };
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              enrichedContractor = {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          
          return {
            ...enrichedContractor,
            lastUsed: metadata?.lastUsed,
            lastServiceType: metadata?.serviceType
          };
        })
      );
      
      // Filter out nulls and sort by last used (most recent first)
      const validContractors = contractors
        .filter(c => c !== null)
        .sort((a, b) => {
          const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          return dateB - dateA;
        });
      
      console.log('[PREVIOUSLY USED] Found contractor IDs:', contractorIds);
      console.log('[PREVIOUSLY USED] Returning contractors:', validContractors.length);
      
      res.json(validContractors);
    } catch (error) {
      console.error("Error fetching previously used contractors:", error);
      res.status(500).json({ message: "Failed to fetch previously used contractors" });
    }
  });

  app.get("/api/contractors/:id", async (req: any, res: any) => {
    try {
      console.log('[DEBUG] GET /api/contractors/:id - Looking for contractor ID:', req.params.id);
      let contractor = await storage.getContractor(req.params.id);
      console.log('[DEBUG] Contractor found in contractors table:', !!contractor);
      
      // If not found in contractors table, try to look up by user ID
      if (!contractor) {
        console.log('[DEBUG] Checking if this is a user ID for a contractor...');
        const user = await storage.getUser(req.params.id);
        if (user && user.role === 'contractor' && user.companyId) {
          console.log('[DEBUG] Found contractor user with companyId:', user.companyId);
          const company = await storage.getCompany(user.companyId);
          console.log('[DEBUG] Company data:', JSON.stringify(company, null, 2));
          if (company) {
            console.log('[DEBUG] Company experience value:', company.experience, 'type:', typeof company.experience);
            // Try to get contractor record for this user to get correct contact info
            const contractorRecord = await storage.getContractorByUserId(user.id);
            console.log('[DEBUG] Contractor record found:', !!contractorRecord, 'phone:', contractorRecord?.phone);
            // Build a contractor-like object - use contractor record for contact info, company for business profile
            contractor = {
              id: user.id,
              name: contractorRecord?.name || (user as any).name || '',
              company: company.name || (user as any).name || '',
              email: contractorRecord?.email || user.email || '',
              phone: contractorRecord?.phone || company.phone || '',
              address: contractorRecord?.address || company.address || '',
              city: contractorRecord?.city || company.city || '',
              state: contractorRecord?.state || company.state || '',
              postalCode: contractorRecord?.postalCode || company.postalCode || '',
              location: company.location || `${contractorRecord?.city || company.city || ''}, ${contractorRecord?.state || company.state || ''}`.trim() || '',
              services: company.services || [],
              rating: company.rating || '5.0',
              reviewCount: company.reviewCount || 0,
              bio: company.bio || '',
              experience: company.experience || 0,
              profileImage: user.profileImageUrl || null,
              businessLogo: company.businessLogo || null,
              projectPhotos: company.projectPhotos || [],
              website: company.website || null,
              facebook: company.facebook || null,
              instagram: company.instagram || null,
              linkedin: company.linkedin || null,
              googleBusinessUrl: company.googleBusinessUrl || null,
              isLicensed: !!(company.licenseNumber),
              licenseNumber: company.licenseNumber || '',
              licenseMunicipality: company.licenseMunicipality || '',
              hasEmergencyServices: company.hasEmergencyServices || false,
              serviceRadius: company.serviceRadius || 25,
              distance: null,
              createdAt: user.createdAt || new Date(),
              companyId: user.companyId
            } as any;
            console.log('[DEBUG] Built contractor object from user+company data');
          }
        }
      }
      
      if (!contractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }
      
      // Fetch company data - company data takes precedence over contractors table data
      let contractorWithCompanyData = { ...contractor };
      
      // First check if contractor has companyId
      let companyId = (contractor as any).companyId;
      
      // If not, check if we can find user with this ID and get their companyId
      if (!companyId) {
        const user = await storage.getUser(req.params.id);
        if (user && user.companyId) {
          companyId = user.companyId;
        }
      }
      
      if (companyId) {
        const company = await storage.getCompany(companyId);
        if (company) {
          console.log('[DEBUG] Merging company data - experience:', company.experience, 'licenseNumber:', company.licenseNumber);
          // Contractors table is source of truth for contact info (phone, email, address)
          // Company table is source of truth for business profile (bio, services, photos, etc.)
          contractorWithCompanyData = {
            ...contractor,
            experience: company.experience || (contractor as any).experience || 0,
            businessLogo: company.businessLogo || (contractor as any).businessLogo || '',
            projectPhotos: company.projectPhotos || (contractor as any).projectPhotos || [],
            licenseNumber: company.licenseNumber || (contractor as any).licenseNumber || '',
            licenseMunicipality: company.licenseMunicipality || (contractor as any).licenseMunicipality || '',
            isLicensed: !!(company.licenseNumber || (contractor as any).licenseNumber),
            bio: company.bio || (contractor as any).bio || '',
            services: company.services || (contractor as any).services || [],
            // Contact info: contractors table takes precedence
            phone: (contractor as any).phone || company.phone || '',
            address: (contractor as any).address || company.address || '',
            city: (contractor as any).city || company.city || '',
            state: (contractor as any).state || company.state || '',
            postalCode: (contractor as any).postalCode || company.postalCode || '',
            website: company.website || (contractor as any).website || '',
            facebook: company.facebook || (contractor as any).facebook || '',
            instagram: company.instagram || (contractor as any).instagram || '',
            linkedin: company.linkedin || (contractor as any).linkedin || '',
            googleBusinessUrl: company.googleBusinessUrl || (contractor as any).googleBusinessUrl || '',
            hasEmergencyServices: company.hasEmergencyServices ?? (contractor as any).hasEmergencyServices ?? false,
            serviceRadius: company.serviceRadius || (contractor as any).serviceRadius || 25,
            companyId: companyId
          };
        }
      }
      
      res.json(contractorWithCompanyData);
    } catch (error) {
      console.error('[ERROR] Failed to fetch contractor:', error);
      res.status(500).json({ message: "Failed to fetch contractor" });
    }
  });

  // Contractor boost routes
  app.post("/api/contractors/boost", isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can create boosts" });
      }

      const boostData = insertContractorBoostSchema.parse({
        ...req.body,
        contractorId: userId
      });

      const boost = await storage.createContractorBoost(boostData);
      res.json(boost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid boost data", errors: error.issues });
      }
      console.error("Error creating boost:", error);
      res.status(500).json({ message: "Failed to create boost" });
    }
  });

  app.get("/api/contractors/boost/check", isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can check boost availability" });
      }

      const { serviceCategory, businessAddress } = req.query;
      
      if (!serviceCategory || !businessAddress) {
        return res.status(400).json({ message: "Service category and business address are required" });
      }

      // For now, we'll check if there are any conflicts by checking existing boosts
      // This is a simplified version - in a real app, we'd geocode the business address
      const existingBoosts = await storage.getContractorBoosts(userId as string);
      const hasActiveBoost = existingBoosts.some(boost => 
        boost.serviceCategory === serviceCategory && 
        boost.status === 'active' && 
        boost.isActive &&
        new Date(boost.endDate) > new Date()
      );
      
      res.json({ canBoost: !hasActiveBoost });
    } catch (error) {
      console.error("Error checking boost availability:", error);
      res.status(500).json({ message: "Failed to check boost availability" });
    }
  });

  app.delete("/api/contractors/boost/:boostId", isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can delete boosts" });
      }

      const userBoosts = await storage.getContractorBoosts(userId as string);
      const boost = userBoosts.find(b => b.id === req.params.boostId);
      
      if (!boost) {
        return res.status(404).json({ message: "Boost not found or access denied" });
      }

      await storage.deleteContractorBoost(req.params.boostId);
      res.json({ message: "Boost deleted successfully" });
    } catch (error) {
      console.error("Error deleting boost:", error);
      res.status(500).json({ message: "Failed to delete boost" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────
  // Admin endpoint: re-import lost contractor boosts
  //
  // WHEN TO USE
  //   After a server restart where boosts were stored only in the process-local
  //   MemStorage Map (before the dual-write migration was deployed), boosts that
  //   were active at the time of the restart are NOT in the database.  This
  //   endpoint re-imports them idempotently.
  //
  // RUNBOOK — recovering boosts from Stripe
  //   1. Pull all payment intents tagged with boost metadata from the Stripe
  //      Dashboard (or via the CLI):
  //        stripe payment_intents list \
  //          --expand data.metadata \
  //          --limit 100 | jq '.data[] | select(.metadata.type == "contractor_boost")'
  //   2. For each intent, construct a boost object:
  //        {
  //          "contractorId":       <metadata.contractorId>,
  //          "serviceCategory":    <metadata.serviceCategory>,
  //          "businessAddress":    <metadata.businessAddress>,
  //          "businessLatitude":   <metadata.businessLatitude>,
  //          "businessLongitude":  <metadata.businessLongitude>,
  //          "boostRadius":        10,
  //          "startDate":          <metadata.startDate>,
  //          "endDate":            <metadata.endDate>,
  //          "amount":             <intent.amount / 100>,
  //          "stripePaymentIntentId": <intent.id>,
  //          "status":             "active",
  //          "isActive":           true
  //        }
  //   3. POST the array to this endpoint (admin credentials required):
  //        curl -X POST /api/admin/contractor-boosts/recover \
  //          -H 'Content-Type: application/json' \
  //          -d '[{ ... }, { ... }]'
  //
  // IDEMPOTENCY
  //   - Duplicate detection is two-tier:
  //       (a) stripePaymentIntentId — globally unique; checked first.
  //       (b) contractorId + serviceCategory + startDate — fallback for manually
  //           created boosts without a Stripe PI.
  //   - Safe to run multiple times; already-present records are counted as
  //     "skipped" in the response, not inserted again.
  // ─────────────────────────────────────────────────────────────────────
  app.post("/api/admin/contractor-boosts/recover", requireAdmin, async (req: any, res: any) => {
    try {
      const boostArraySchema = z.array(insertContractorBoostSchema.extend({
        id: z.string().uuid().optional(),
      }) as unknown as z.ZodTypeAny);

      const parsed = boostArraySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          message: "Invalid boost data",
          errors: parsed.error.errors,
        });
      }

      const boosts = parsed.data;
      let imported = 0;
      let skipped = 0;

      for (const boostData of boosts) {
        // Deterministic duplicate detection (two-tier):
        //   1. Primary key: stripePaymentIntentId — most reliable, globally unique.
        //   2. Composite fallback: contractorId + serviceCategory + startDate —
        //      used when no Stripe PI is available (e.g. manually created boosts).
        let alreadyExists = false;

        if (boostData.stripePaymentIntentId) {
          const [existing] = await db
            .select({ id: contractorBoosts.id })
            .from(contractorBoosts)
            .where(eq(contractorBoosts.stripePaymentIntentId, boostData.stripePaymentIntentId))
            .limit(1);
          if (existing) alreadyExists = true;
        }

        if (!alreadyExists) {
          // Composite key fallback: treat same contractor + category + startDate as a duplicate
          const startDate = new Date(boostData.startDate);
          const [existing] = await db
            .select({ id: contractorBoosts.id })
            .from(contractorBoosts)
            .where(
              and(
                eq(contractorBoosts.contractorId, boostData.contractorId),
                eq(contractorBoosts.serviceCategory, boostData.serviceCategory),
                eq(contractorBoosts.startDate, startDate),
              ),
            )
            .limit(1);
          if (existing) alreadyExists = true;
        }

        if (!alreadyExists) {
          await storage.createContractorBoost(boostData);
          imported++;
        } else {
          skipped++;
        }
      }

      res.json({
        message: "Boost recovery complete",
        imported,
        skipped,
        total: boosts.length,
      });
    } catch (error) {
      console.error("Error recovering contractor boosts:", error);
      res.status(500).json({ message: "Failed to recover contractor boosts" });
    }
  });

  // Company routes
  app.post("/api/companies", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can create companies" });
      }

      // Check if user already belongs to a company
      const user = await storage.getUser(userId);
      if (user?.companyId) {
        return res.status(400).json({ message: "You already belong to a company" });
      }

      const companyData = insertCompanySchema.parse({
        ...req.body,
        ownerId: userId
      });

      // Geocode the company address to get coordinates
      let geocoded = null;
      if (companyData.address) {
        geocoded = await geocodeAddress(companyData.address);
      }

      const companyDataWithCoords = {
        ...companyData,
        ...(geocoded && {
          latitude: geocoded.latitude.toString(),
          longitude: geocoded.longitude.toString()
        })
      };

      const company = await storage.createCompany(companyDataWithCoords);

      // Update user's company info (reuse already-fetched user)
      await storage.upsertUser({
        ...user,
        companyId: company.id,
        companyRole: 'owner'
      });

      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid company data", errors: error.issues });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.get("/api/companies/:id", async (req: any, res: any) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.put("/api/companies/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      console.log('[Company Update] Request received for company:', req.params.id);
      console.log('[Company Update] Request body:', JSON.stringify(req.body, null, 2));
      
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        console.log('[Company Update] Company not found:', req.params.id);
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can update company profile
      if (company.ownerId !== userId) {
        console.log('[Company Update] Permission denied. Owner:', company.ownerId, 'User:', userId);
        return res.status(403).json({ message: "Only company owner can update company profile" });
      }

      // PRE-FILTER: Remove null/undefined values from request body before Zod validation
      // This prevents NOT NULL constraint violations on fields like licenseNumber
      const filteredBody: Record<string, any> = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (value !== null && value !== undefined) {
          filteredBody[key] = value;
        }
      }
      console.log('[Company Update] Filtered body (nulls removed):', JSON.stringify(filteredBody, null, 2));

      console.log('[Company Update] Validating data...');
      const partialData = insertCompanySchema.partial().omit({ ownerId: true }).parse(filteredBody);
      console.log('[Company Update] Validated data:', JSON.stringify(partialData, null, 2));
      
      // If address is being updated, re-geocode it
      let updateData = { ...partialData };
      if (partialData.address && partialData.address !== company.address) {
        const geocoded = await geocodeAddress(partialData.address);
        if (geocoded) {
          updateData.latitude = geocoded.latitude.toString();
          updateData.longitude = geocoded.longitude.toString();
        }
      }
      
      const updatedCompany = await storage.updateCompany(req.params.id, updateData);
      console.log('[Company Update] Update successful. Logo:', updatedCompany?.businessLogo ? 'SET' : 'EMPTY', 'Photos:', updatedCompany?.projectPhotos?.length || 0);

      res.json(updatedCompany);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('[Company Update] Validation error:', error.issues);
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      console.error("[Company Update] Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.get("/api/companies/:id/employees", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company members can view employees
      const user = await storage.getUser(userId);
      if (user?.companyId !== req.params.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const employees = await storage.getCompanyEmployees(req.params.id);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching company employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.delete("/api/companies/:id/employees/:userId", isAuthenticated, async (req: any, res: any) => {
    try {
      const ownerId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can remove employees
      if (company.ownerId !== ownerId) {
        return res.status(403).json({ message: "Only company owner can remove employees" });
      }

      // Cannot remove the owner
      if (req.params.userId === ownerId) {
        return res.status(400).json({ message: "Cannot remove company owner" });
      }

      // Remove employee from company
      const employee = await storage.getUser(req.params.userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      // Verify the target user actually belongs to this company
      if (employee.companyId !== req.params.id) {
        return res.status(403).json({ message: "User does not belong to this company" });
      }

      await storage.upsertUser({
        ...employee,
        companyId: null,
        companyRole: null
      });

      res.json({ message: "Employee removed successfully" });
    } catch (error) {
      console.error("Error removing employee:", error);
      res.status(500).json({ message: "Failed to remove employee" });
    }
  });

  app.put("/api/companies/:id/employees/:userId/permissions", isAuthenticated, async (req: any, res: any) => {
    try {
      const ownerId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can change permissions
      if (company.ownerId !== ownerId) {
        return res.status(403).json({ message: "Only company owner can change permissions" });
      }

      // Cannot change owner's permissions
      if (req.params.userId === ownerId) {
        return res.status(400).json({ message: "Cannot change owner permissions" });
      }

      const employee = await storage.getUser(req.params.userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.companyId !== req.params.id) {
        return res.status(400).json({ message: "Employee does not belong to this company" });
      }

      // Update employee permissions
      const updatedEmployee = await storage.upsertUser({
        ...employee,
        canRespondToProposals: req.body.canRespondToProposals
      });

      res.json(updatedEmployee);
    } catch (error) {
      console.error("Error updating employee permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  app.post("/api/companies/:id/invite-codes", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can generate invite codes
      if (company.ownerId !== userId) {
        return res.status(403).json({ message: "Only company owner can generate invite codes" });
      }

      const inviteData = insertCompanyInviteCodeSchema.parse({
        companyId: req.params.id,
        code: Math.random().toString(36).substring(2, 10).toUpperCase(), // Generate 8-char code
        createdBy: userId
      });

      const invite = await storage.createCompanyInviteCode(inviteData);
      res.status(201).json(invite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invite data", errors: error.issues });
      }
      console.error("Error creating invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  app.get("/api/companies/:id/invite-codes", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can view invite codes
      if (company.ownerId !== userId) {
        return res.status(403).json({ message: "Only company owner can view invite codes" });
      }

      const inviteCodes = await storage.getCompanyInviteCodes(req.params.id);
      res.json(inviteCodes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  app.get("/api/companies/invite-codes/:code", async (req: any, res: any) => {
    try {
      const invite = await storage.getCompanyInviteCodeByCode(req.params.code);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite code not found" });
      }

      if (!invite.isActive) {
        return res.status(400).json({ message: "Invite code is no longer active" });
      }

      if (invite.usedBy) {
        return res.status(400).json({ message: "Invite code has already been used" });
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invite code has expired" });
      }

      // Return invite with company info
      const company = await storage.getCompany(invite.companyId);
      res.json({ invite, company });
    } catch (error) {
      console.error("Error fetching invite code:", error);
      res.status(500).json({ message: "Failed to fetch invite code" });
    }
  });

  // Agent-specific routes
  app.get("/api/agent/profile", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const profile = await storage.getAgentProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Also fetch user data to get profileImageUrl
      const user = await storage.getUser(userId);
      
      res.json({
        ...profile,
        profileImageUrl: user?.profileImageUrl || null,
      });
    } catch (error) {
      console.error("Error fetching agent profile:", error);
      res.status(500).json({ message: "Failed to fetch agent profile" });
    }
  });

  app.put("/api/agent/profile", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      // Import and use validation schema
      const { agentContactInfoSchema } = await import("@workspace/db");
      
      // Validate request body with Zod
      const validationResult = agentContactInfoSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }

      const validatedData = validationResult.data;

      // Convert empty strings to null for cleaner database storage
      const updateData = {
        phone: validatedData.phone?.trim() || null,
        website: validatedData.website?.trim() || null,
        officeAddress: validatedData.officeAddress?.trim() || null,
      };

      const updatedProfile = await storage.updateAgentProfile(userId, updateData);
      
      if (!updatedProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      res.json({ message: "Contact information updated successfully", profile: updatedProfile });
    } catch (error) {
      console.error("Error updating agent profile:", error);
      res.status(500).json({ message: "Failed to update agent profile" });
    }
  });

  app.get("/api/agent/referrals", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      const referrals = await storage.getAffiliateReferrals(userId);
      
      // Join with user data to get referee details
      const referralsWithUserDetails = await Promise.all(
        referrals.map(async (referral) => {
          const user = await storage.getUser(referral.referredUserId);
          return {
            ...referral,
            refereeName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
            refereeEmail: user?.email || '',
          };
        })
      );

      res.json(referralsWithUserDetails);
    } catch (error) {
      console.error("Error fetching agent referrals:", error);
      res.status(500).json({ message: "Failed to fetch agent referrals" });
    }
  });

  app.get("/api/agent/stats", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      const stats = await storage.getAgentStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching agent stats:", error);
      res.status(500).json({ message: "Failed to fetch agent stats" });
    }
  });

  // Stripe Connect onboarding for agents
  app.post("/api/agent/stripe-connect/create-account", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Check if agent already has a Stripe Connect account
      if (agentProfile.stripeConnectAccountId) {
        // Create new account link for existing account (in case onboarding wasn't completed)
        const accountLink = await stripe.accountLinks.create({
          account: agentProfile.stripeConnectAccountId,
          refresh_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_refresh=true`,
          return_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_success=true`,
          type: 'account_onboarding',
        });
        return res.json({ url: accountLink.url, accountId: agentProfile.stripeConnectAccountId });
      }

      // Create a new Stripe Connect Express account
      const account = await stripe!.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          userId: userId,
          agentProfileId: agentProfile.id,
        },
      });

      // Save the Stripe Connect account ID to the agent profile
      await storage.updateAgentProfile(userId, {
        stripeConnectAccountId: account.id,
        stripeOnboardingComplete: false,
      });

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_refresh=true`,
        return_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_success=true`,
        type: 'account_onboarding',
      });

      console.log('[STRIPE CONNECT] Created account for agent:', userId, 'Account ID:', account.id);
      res.json({ url: accountLink.url, accountId: account.id });
    } catch (error: any) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(500).json({ message: "Failed to create Stripe Connect account", error: error.message });
    }
  });

  // Check Stripe Connect account status
  app.get("/api/agent/stripe-connect/status", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      if (!agentProfile.stripeConnectAccountId) {
        return res.json({ 
          connected: false, 
          onboardingComplete: false,
          payoutsEnabled: false,
          chargesEnabled: false,
        });
      }

      // Get the Stripe account details
      const account = await stripe!.accounts.retrieve(agentProfile.stripeConnectAccountId);
      
      const onboardingComplete = account.details_submitted && account.payouts_enabled;
      
      // Update the agent profile if onboarding status changed
      if (onboardingComplete && !agentProfile.stripeOnboardingComplete) {
        await storage.updateAgentProfile(userId, {
          stripeOnboardingComplete: true,
        });
      }

      res.json({
        connected: true,
        accountId: agentProfile.stripeConnectAccountId,
        onboardingComplete: onboardingComplete,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (error: any) {
      console.error("Error checking Stripe Connect status:", error);
      res.status(500).json({ message: "Failed to check Stripe Connect status", error: error.message });
    }
  });

  // Get agent payout history
  app.get("/api/agent/payouts", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const payouts = await storage.getAffiliatePayouts(userId);
      
      // Join with referral data to get referee details
      const payoutsWithDetails = await Promise.all(
        payouts.map(async (payout) => {
          const referral = await storage.getAffiliateReferral(payout.affiliateReferralId);
          let refereeName = 'Unknown';
          if (referral) {
            const user = await storage.getUser(referral.referredUserId);
            refereeName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown';
          }
          return {
            ...payout,
            refereeName,
          };
        })
      );

      // Sort by most recent first
      payoutsWithDetails.sort((a, b) => new Date(b.createdAt as any).getTime() - new Date(a.createdAt as any).getTime());

      res.json(payoutsWithDetails);
    } catch (error) {
      console.error("Error fetching agent payouts:", error);
      res.status(500).json({ message: "Failed to fetch agent payouts" });
    }
  });

  // Agent verification routes
  app.post("/api/agent/upload-state-id", isAuthenticated, uploadLimiter, upload.single('stateId'), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed" });
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File size must be less than 10MB" });
      }

      // Generate checksum for file integrity
      const crypto = await import('crypto');
      const fileBuffer = req.file.buffer;
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Upload to object storage (private directory) with secure path handling
      const path = await import('path');
      const fs = await import('fs');
      
      // Normalize and secure base directory
      const baseDir = path.resolve(process.cwd(), '.private', 'agent-verification');
      
      // Generate hash-based opaque ID (no user ID or timestamp in filename)
      const uploadId = crypto.randomUUID();
      const fileExtension = req.file.mimetype.includes('pdf') ? 'pdf' : 'jpg';
      const secureFilename = `${uploadId}.${fileExtension}`;
      const absoluteStoragePath = path.join(baseDir, secureFilename);
      
      // Validate path is within baseDir (prevent traversal)
      if (!absoluteStoragePath.startsWith(baseDir)) {
        return res.status(400).json({ message: "Invalid file path" });
      }
      
      // Ensure directory exists
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // Write file to storage
      fs.writeFileSync(absoluteStoragePath, fileBuffer);

      // Store metadata server-side for verification
      await storage.storeUploadMetadata(uploadId, {
        userId,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        checksum,
        storagePath: absoluteStoragePath,
      });

      // Return opaque upload ID (no filesystem details)
      res.json({
        uploadId,
        originalFilename: req.file.originalname,
      });
    } catch (error) {
      console.error("Error uploading state ID:", error);
      res.status(500).json({ message: "Failed to upload state ID" });
    }
  });

  app.get("/api/agent/verification-status", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const status = await storage.getAgentVerificationStatus(userId);
      if (!status) {
        return res.status(404).json({ message: "Verification status not found" });
      }

      res.json(status);
    } catch (error) {
      console.error("Error fetching verification status:", error);
      res.status(500).json({ message: "Failed to fetch verification status" });
    }
  });

  app.post("/api/agent/submit-verification", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      // Import and use validation schema
      const { agentVerificationSubmissionSchema } = await import("@workspace/db");
      
      // Validate request body with Zod
      const validationResult = agentVerificationSubmissionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }

      const validatedData = validationResult.data;

      // Retrieve server-stored upload metadata
      const uploadMetadata = await storage.getUploadMetadata(validatedData.uploadId);
      
      if (!uploadMetadata) {
        return res.status(400).json({ message: "Upload not found or expired" });
      }

      // Validate ownership - uploaded file must belong to current user
      if (uploadMetadata.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized: Upload does not belong to you" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Use server-verified metadata instead of client-supplied values
      const updated = await storage.submitAgentVerification(userId, {
        licenseNumber: validatedData.licenseNumber,
        licenseState: validatedData.licenseState,
        licenseExpiration: new Date(validatedData.licenseExpiration),
        stateIdStorageKey: uploadMetadata.storagePath,
        stateIdOriginalFilename: uploadMetadata.originalFilename,
        stateIdMimeType: uploadMetadata.mimeType,
        stateIdFileSize: uploadMetadata.fileSize,
        stateIdChecksum: uploadMetadata.checksum,
      });

      // Clean up upload metadata after successful submission (keep file)
      await storage.deleteUploadMetadata(validatedData.uploadId, false);

      // Create audit record
      await storage.createVerificationAudit({
        agentProfileId: agentProfile.id,
        agentId: userId,
        action: 'submitted',
        previousStatus: agentProfile.verificationStatus,
        newStatus: 'pending_review',
        notes: 'Agent submitted verification request',
        metadata: { userAgent: req.headers['user-agent'], ip: req.ip },
      });

      res.json({ message: "Verification submitted successfully", profile: updated });
    } catch (error) {
      console.error("Error submitting verification:", error);
      res.status(500).json({ message: "Failed to submit verification" });
    }
  });

  // Agent profile picture upload endpoint
  app.post("/api/agent/profile-picture", isAuthenticated, uploadLimiter, upload.single('image'), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type (only images)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, and WEBP images are allowed" });
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File size must be less than 5MB" });
      }

      // Generate unique filename
      const crypto = await import('crypto');
      const fileExtension = req.file.mimetype.split('/')[1];
      const uniqueId = crypto.randomUUID();
      const storageKey = `profile-pictures/${userId}/${uniqueId}.${fileExtension}`;

      // Upload to object storage (public directory)
      await objectStorageService.uploadFile(storageKey, req.file.buffer, req.file.mimetype);

      // Get the current user to check for old profile picture

      // Update user's profile image URL
      await storage.upsertUser({
        id: userId,
        profileImageUrl: storageKey,
      });

      // TODO: Delete old profile picture from object storage if it exists
      // This would require implementing a deleteFile method in ObjectStorageService

      // Return the storage key (frontend will construct URL)
      res.json({ 
        storageKey,
        message: "Profile picture uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  app.get("/api/referral/validate/:code", async (req: any, res: any) => {
    try {
      const { code } = req.params;
      
      const user = await storage.getUserByReferralCode(code);
      
      if (!user) {
        return res.json({ valid: false });
      }

      const agentName = `${user.firstName} ${user.lastName}`.trim() || user.email;
      res.json({ 
        valid: true, 
        agentName 
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
    }
  });

  // Product routes
  app.get("/api/products", async (req: any, res: any) => {
    try {
      const filters = {
        category: req.query.category as string,
        featured: req.query.featured === 'true',
        search: req.query.search as string,
      };

      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/search", async (req: any, res: any) => {
    try {
      const query = req.query.q as string || "";
      
      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  app.get("/api/products/:id", async (req: any, res: any) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // ─── Appliance Brand List ───────────────────────────────────────────────────
  // Returns a curated list of common appliance brands for autocomplete.
  // No auth required — purely static reference data.
  app.get("/api/appliances/brands", (_req, res) => {
    const APPLIANCE_BRANDS = [
      "Amana", "Bosch", "Broan", "Carrier", "Dacor", "Electrolux", "Fisher & Paykel",
      "Frigidaire", "GE Appliances", "GE Profile", "Haier", "Honeywell",
      "Hotpoint", "Jenn-Air", "KitchenAid", "LG", "Lennox", "Maytag",
      "Miele", "Panasonic", "Rheem", "Samsung", "Sharp", "Siemens",
      "Speed Queen", "Sub-Zero", "Thermador", "Trane", "Viking", "Whirlpool",
      "Wolf", "York"
    ].sort();
    res.json(APPLIANCE_BRANDS);
  });

  // ─── Appliance Model Lookup ──────────────────────────────────────────────────
  // Given a model number, searches the IFIXIT product/device API to identify
  // the home appliance make, type, and name. Falls back gracefully (found: false)
  // on network errors, non-JSON responses, or when no appliance match is found.
  // No paid API key required.
  app.get("/api/appliances/lookup", async (req: any, res: any) => {
    const modelNumber = (req.query.modelNumber as string || "").trim();
    if (!modelNumber || modelNumber.length < 3) {
      return res.status(400).json({ message: "modelNumber query param is required (min 3 chars)" });
    }

    // Known appliance brands for result matching
    const KNOWN_BRANDS = [
      "Amana", "Bosch", "Broan", "Carrier", "Dacor", "Electrolux", "Fisher & Paykel",
      "Frigidaire", "GE", "Haier", "Honeywell", "Hotpoint", "Jenn-Air", "KitchenAid",
      "LG", "Lennox", "Maytag", "Miele", "Panasonic", "Rheem", "Samsung", "Sharp",
      "Siemens", "Speed Queen", "Sub-Zero", "Thermador", "Trane", "Viking",
      "Whirlpool", "Wolf", "York",
    ];

    // Known appliance type keywords and their canonical type names
    const APPLIANCE_TYPE_KEYWORDS: Record<string, string> = {
      "refrigerator": "Refrigerator", "fridge": "Refrigerator",
      "dishwasher": "Dishwasher",
      "washing machine": "Washing Machine", "washer": "Washing Machine",
      "dryer": "Dryer",
      "range": "Range/Oven", "oven": "Range/Oven", "stove": "Range/Oven", "cooktop": "Range/Oven",
      "microwave": "Microwave",
      "garbage disposal": "Garbage Disposal", "disposal": "Garbage Disposal",
      "water heater": "Water Heater",
      "air conditioner": "Air Conditioner", "air conditioning": "Air Conditioner",
      "furnace": "Furnace", "heat pump": "Heat Pump",
      "freezer": "Freezer",
      "ice maker": "Ice Maker",
      "dehumidifier": "Dehumidifier",
      "air purifier": "Air Purifier",
    };

    try {
      // Call IFIXIT search API — no auth required
      const ifixitUrl = `https://www.ifixit.com/api/2.0/search/10?query=${encodeURIComponent(modelNumber)}&limit=10`;
      const response = await fetch(ifixitUrl, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        console.warn(`[APPLIANCE LOOKUP] IFIXIT returned status ${response.status}`);
        return res.json({ found: false });
      }

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("json")) {
        console.warn("[APPLIANCE LOOKUP] IFIXIT returned non-JSON response");
        return res.json({ found: false });
      }

      interface IFixitResultItem {
        namespace?: string;
        title?: string;
        summary?: string;
      }
      interface IFixitSearchResponse {
        results?: IFixitResultItem[];
      }

      const data: IFixitSearchResponse = await response.json() as IFixitSearchResponse;
      const results: IFixitResultItem[] = Array.isArray(data.results) ? data.results : [];

      // Look for a CATEGORY-namespace result whose title/summary references a
      // known brand AND a known appliance type — strongest signal of a match.
      for (const item of results) {
        if (item.namespace !== "CATEGORY") continue;
        const titleLower = (item.title ?? "").toLowerCase();
        const summaryLower = (item.summary ?? "").toLowerCase();
        const combined = `${titleLower} ${summaryLower}`;

        const matchedBrand = KNOWN_BRANDS.find(b =>
          combined.includes(b.toLowerCase())
        );
        if (!matchedBrand) continue;

        const matchedType = Object.keys(APPLIANCE_TYPE_KEYWORDS).find(k =>
          combined.includes(k)
        );
        if (!matchedType) continue;

        return res.json({
          found: true,
          make: matchedBrand,
          name: item.title ?? `${matchedBrand} Appliance`,
          type: APPLIANCE_TYPE_KEYWORDS[matchedType],
          description: item.summary?.trim() || `${matchedBrand} home appliance.`,
        });
      }

      // No relevant appliance match found in IFIXIT results
      return res.json({ found: false });
    } catch (err: unknown) {
      // Network/timeout/parse errors — fail gracefully, never throw to client
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[APPLIANCE LOOKUP] IFIXIT fetch error:", msg);
      return res.json({ found: false });
    }
  });

  // Home Appliance routes
  app.get("/api/appliances", async (req: any, res: any) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      const houseId = req.query.houseId as string;
      const appliances = await storage.getHomeAppliances(homeownerId, houseId);
      res.json(appliances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appliances" });
    }
  });

  app.get("/api/appliances/:id", async (req: any, res: any) => {
    try {
      const appliance = await storage.getHomeAppliance(req.params.id);
      if (!appliance) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      res.json(appliance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appliance" });
    }
  });

  app.post("/api/appliances", async (req: any, res: any) => {
    try {
      const applianceData = insertHomeApplianceSchema.parse(req.body);
      const appliance = await storage.createHomeAppliance(applianceData);
      res.status(201).json(appliance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appliance data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create appliance" });
    }
  });

  app.patch("/api/appliances/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify ownership via appliance → house chain before allowing mutation
      const existingAppliance = await storage.getHomeAppliance(req.params.id);
      if (!existingAppliance?.houseId) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      const applianceHouse = await storage.getHouse(existingAppliance.houseId);
      if (!applianceHouse || applianceHouse.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Appliance not found" });
      }

      const partialData = insertHomeApplianceSchema.partial().parse(req.body);
      const appliance = await storage.updateHomeAppliance(req.params.id, partialData);
      if (!appliance) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      res.json(appliance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appliance data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update appliance" });
    }
  });

  app.delete("/api/appliances/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Ownership check: appliance → house → homeowner before allowing deletion
      const existingApplianceDel = await storage.getHomeAppliance(req.params.id);
      if (!existingApplianceDel?.houseId) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      const applianceHouseDel = await storage.getHouse(existingApplianceDel.houseId);
      if (!applianceHouseDel || applianceHouseDel.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Appliance not found" });
      }

      const deleted = await storage.deleteHomeAppliance(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appliance" });
    }
  });

  // Home Appliance Manual routes
  app.get("/api/appliances/:applianceId/manuals", async (req: any, res: any) => {
    try {
      const manuals = await storage.getHomeApplianceManuals(req.params.applianceId);
      res.json(manuals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appliance manuals" });
    }
  });

  app.get("/api/appliance-manuals/:id", async (req: any, res: any) => {
    try {
      const manual = await storage.getHomeApplianceManual(req.params.id);
      if (!manual) {
        return res.status(404).json({ message: "Manual not found" });
      }
      res.json(manual);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch manual" });
    }
  });

  app.post("/api/appliances/:applianceId/manuals", async (req: any, res: any) => {
    try {
      const manualData = insertHomeApplianceManualSchema.parse({
        ...req.body,
        applianceId: req.params.applianceId
      });
      const manual = await storage.createHomeApplianceManual(manualData);
      res.status(201).json(manual);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid manual data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create manual" });
    }
  });

  app.patch("/api/appliance-manuals/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Ownership check: manual → appliance → house → homeowner
      const existingManual = await storage.getHomeApplianceManual(req.params.id);
      if (!existingManual) return res.status(404).json({ message: "Manual not found" });
      const manualAppliance = await storage.getHomeAppliance(existingManual.applianceId);
      if (!manualAppliance?.houseId) return res.status(404).json({ message: "Manual not found" });
      const manualHouse = await storage.getHouse(manualAppliance.houseId);
      if (!manualHouse || manualHouse.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Manual not found" });
      }

      const partialData = insertHomeApplianceManualSchema.partial().parse(req.body);
      const manual = await storage.updateHomeApplianceManual(req.params.id, partialData);
      if (!manual) {
        return res.status(404).json({ message: "Manual not found" });
      }
      res.json(manual);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid manual data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update manual" });
    }
  });

  app.delete("/api/appliance-manuals/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Ownership check: manual → appliance → house → homeowner
      const existingManualDel = await storage.getHomeApplianceManual(req.params.id);
      if (!existingManualDel) return res.status(404).json({ message: "Manual not found" });
      const manualApplianceDel = await storage.getHomeAppliance(existingManualDel.applianceId);
      if (!manualApplianceDel?.houseId) return res.status(404).json({ message: "Manual not found" });
      const manualHouseDel = await storage.getHouse(manualApplianceDel.houseId);
      if (!manualHouseDel || manualHouseDel.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Manual not found" });
      }

      const deleted = await storage.deleteHomeApplianceManual(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Manual not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete manual" });
    }
  });

  // HIN (Home Identification Number) routes
  // Public lookup — returns only city/state/zipPrefix, never owner/address data
  app.get("/api/hin/:hin", async (req: any, res: any) => {
    try {
      const record = await lookupByHIN(req.params.hin);
      if (!record) return res.status(404).json({ message: "HIN not found" });
      res.json({
        hin: record.hin,
        address: {
          city: record.city,
          state: record.state,
          zipPrefix: record.zip ? record.zip.substring(0, 3) : null,
        },
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to look up HIN" });
    }
  });

  // Authenticated lookup — returns full HIN for the house (ownership required)
  app.get("/api/houses/:id/hin", isAuthenticated, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json({ hin: house.hin, hinAssignedAt: (house as any).hinAssignedAt ?? null });
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve HIN" });
    }
  });

  // Maintenance Log routes - PAID FEATURE
  app.get("/api/maintenance-logs", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      // Always use authenticated user's ID, ignore query params to prevent IDOR
      const homeownerId = req.session.user.id;
      const houseId = req.query.houseId as string;
      
      // If houseId is provided, verify it belongs to the user
      if (houseId) {
        const house = await storage.getHouse(houseId);
        if (!house || house.homeownerId !== homeownerId) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const logs = await storage.getMaintenanceLogs(homeownerId, houseId);
      res.json(logs);
    } catch (error) {
      console.error("[ERROR] Failed to fetch maintenance logs:", error);
      res.status(500).json({ message: "Failed to fetch maintenance logs" });
    }
  });

  app.get("/api/maintenance-logs/:id", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const log = await storage.getMaintenanceLog(req.params.id);
      if (!log || log.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance log" });
    }
  });

  app.post("/api/maintenance-logs", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      // Validate request body (excluding homeownerId which we set from session)
      const validatedData = insertMaintenanceLogSchema.omit({ homeownerId: true }).parse(req.body);
      
      // Use authenticated user's ID, never trust client input
      const logData = {
        ...validatedData,
        homeownerId: req.session.user.id
      };
      
      const log = await storage.createMaintenanceLog(logData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance log data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create maintenance log" });
    }
  });

  // Complete a maintenance task with DIY or contractor method
  app.post("/api/maintenance-logs/complete-task", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Validate request body with Zod schema
      const validatedData = completeTaskSchema.parse(req.body);
      const { houseId, taskTitle, completionMethod, costEstimate, contractorCost: providedCost } = validatedData;
      
      // Verify house belongs to user
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      // Calculate DIY savings using shared helper function
      let diySavingsAmount: string | null = null;
      if (completionMethod === 'diy' && costEstimate) {
        const savingsNumber = calculateDIYSavingsAmount(costEstimate as any);
        diySavingsAmount = savingsNumber > 0 ? savingsNumber.toString() : null;
      }
      
      // Use provided contractor cost, or calculate midpoint if not provided
      let contractorCostStr: string | null = null;
      if (completionMethod === 'contractor') {
        if (providedCost !== undefined && providedCost !== null) {
          // Use the actual cost provided by the user
          contractorCostStr = providedCost.toFixed(2);
        } else if (costEstimate) {
          // Fall back to estimate midpoint if no cost provided
          const { proLow, proHigh } = costEstimate;
          if (proLow !== undefined && proHigh !== undefined) {
            contractorCostStr = ((proLow + proHigh) / 2).toFixed(2);
          }
        }
      }
      
      // Create maintenance log
      const logData = {
        homeownerId: req.session.user.id,
        houseId,
        homeArea: 'General Maintenance', // Default home area for task completions
        serviceDate: new Date().toISOString().split('T')[0],
        serviceType: taskTitle,
        serviceDescription: `Completed ${completionMethod === 'diy' ? 'DIY' : 'by contractor'}`,
        completionMethod,
        diySavingsAmount,
        cost: contractorCostStr
      };
      
      const log = await storage.createMaintenanceLog(logData as any);
      
      // Also create task completion record for health score tracking
      const now = new Date();
      
      // Calculate estimated cost properly - average only valid (finite) bounds
      let estimatedCost: number | null = null;
      if (costEstimate && (costEstimate.proLow !== undefined || costEstimate.proHigh !== undefined)) {
        const validBounds: number[] = [];
        
        if (costEstimate.proLow !== undefined && costEstimate.proLow !== null) {
          const low = Number(costEstimate.proLow);
          if (isFinite(low) && low > 0) validBounds.push(low);
        }
        
        if (costEstimate.proHigh !== undefined && costEstimate.proHigh !== null) {
          const high = Number(costEstimate.proHigh);
          if (isFinite(high) && high > 0) validBounds.push(high);
        }
        
        if (validBounds.length > 0) {
          const sum = validBounds.reduce((acc, val) => acc + val, 0);
          estimatedCost = sum / validBounds.length;
        }
      }
      
      const taskCompletionData = {
        homeownerId: req.session.user.id,
        houseId,
        taskId: null, // Could be populated if we track specific task IDs
        taskType: 'maintenance' as const,
        taskTitle,
        taskCategory: null,
        completedAt: now,
        month: now.getMonth() + 1, // 1-12
        year: now.getFullYear(),
        completionMethod: completionMethod === 'diy' ? 'diy' : 'professional',
        estimatedCost: estimatedCost !== null ? estimatedCost.toFixed(2) : null,
        actualCost: contractorCostStr || null,
        costSavings: diySavingsAmount || null,
        notes: null,
        documentsUploaded: 0,
      };
      
      await db.insert(taskCompletions).values(taskCompletionData);
      
      // Check and award achievements after task completion
      const newlyUnlocked = await storage.checkAndAwardAchievements(req.session.user.id);
      
      res.status(201).json({ 
        ...log, 
        newAchievements: newlyUnlocked || [] 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task completion data", errors: error.issues });
      }
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
    }
  });

  app.patch("/api/maintenance-logs/:id", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      // Verify the maintenance log belongs to the authenticated user
      const existingLog = await storage.getMaintenanceLog(req.params.id);
      if (!existingLog || existingLog.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      
      // Validate request body (excluding homeownerId which cannot be changed)
      const partialData = insertMaintenanceLogSchema.omit({ homeownerId: true }).partial().parse(req.body);
      
      // Anti-gaming: block serviceDate changes on logs linked to a taskCompletion.
      // Shifting the date would move the completion into a different scoring window.
      if (partialData.serviceDate !== undefined) {
        if ((existingLog as any).taskCompletionId) {
          return res.status(403).json({
            message: "The service date of a verified record cannot be changed. This record has been counted in your home health score.",
            code: "DATE_LOCKED",
          });
        }
        // Fallback: check invoiceAnalyses for a linked taskCompletionId when the
        // log was created by the invoice-confirm flow (no direct taskCompletionId column).
        const linkedAnalyses = await db.select()
          .from(invoiceAnalyses)
          .where(eq(invoiceAnalyses.maintenanceLogId, req.params.id))
          .limit(1);
        if (linkedAnalyses[0]?.taskCompletionId) {
          return res.status(403).json({
            message: "The service date of a verified record cannot be changed. This record has been counted in your home health score.",
            code: "DATE_LOCKED",
          });
        }
      }

      const log = await storage.updateMaintenanceLog(req.params.id, partialData);
      if (!log) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance log data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update maintenance log" });
    }
  });

  app.delete("/api/maintenance-logs/:id", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      // Verify the maintenance log belongs to the authenticated user
      const existingLog = await storage.getMaintenanceLog(req.params.id);
      if (!existingLog || existingLog.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }

      // Anti-gaming: prevent deletion of logs that have been counted in the
      // home health score. Deleting them would retroactively remove a scored
      // task-completion, enabling score manipulation.
      if ((existingLog as any).taskCompletionId) {
        return res.status(403).json({
          code: "VERIFIED_RECORD",
          message: "This record cannot be deleted because it has been counted in your home health score.",
        });
      }
      
      const deleted = await storage.deleteMaintenanceLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete maintenance log" });
    }
  });

  // Custom Maintenance Task routes
  app.get("/api/custom-maintenance-tasks", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Always use authenticated user's ID, ignore query params to prevent IDOR
      const homeownerId = req.session.user.id;
      const houseId = req.query.houseId as string;
      
      // If houseId is provided, verify it belongs to the user
      if (houseId) {
        const house = await storage.getHouse(houseId);
        if (!house || house.homeownerId !== homeownerId) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const tasks = await storage.getCustomMaintenanceTasks(homeownerId, houseId);
      res.json(tasks);
    } catch (error) {
      console.error("[ERROR] Failed to fetch custom maintenance tasks:", error);
      res.status(500).json({ message: "Failed to fetch custom maintenance tasks" });
    }
  });

  app.get("/api/custom-maintenance-tasks/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const task = await storage.getCustomMaintenanceTask(req.params.id);
      if (!task || task.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom maintenance task" });
    }
  });

  app.post("/api/custom-maintenance-tasks", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Validate request body (excluding homeownerId which we set from session)
      const validatedData = insertCustomMaintenanceTaskSchema.omit({ homeownerId: true }).parse(req.body);
      
      // If houseId is provided, verify it belongs to the user
      if (validatedData.houseId) {
        const house = await storage.getHouse(validatedData.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      // Use authenticated user's ID, never trust client input
      const taskData = {
        ...validatedData,
        homeownerId: req.session.user.id
      };
      
      const task = await storage.createCustomMaintenanceTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom maintenance task data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create custom maintenance task" });
    }
  });

  app.patch("/api/custom-maintenance-tasks/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify the custom maintenance task belongs to the authenticated user
      const existingTask = await storage.getCustomMaintenanceTask(req.params.id);
      if (!existingTask || existingTask.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      
      // Validate request body (excluding homeownerId which cannot be changed)
      const partialData = insertCustomMaintenanceTaskSchema.omit({ homeownerId: true }).partial().parse(req.body);
      
      // If houseId is being updated, verify it belongs to the user
      if (partialData.houseId) {
        const house = await storage.getHouse(partialData.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const task = await storage.updateCustomMaintenanceTask(req.params.id, partialData);
      if (!task) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom maintenance task data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update custom maintenance task" });
    }
  });

  app.delete("/api/custom-maintenance-tasks/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify the custom maintenance task belongs to the authenticated user
      const existingTask = await storage.getCustomMaintenanceTask(req.params.id);
      if (!existingTask || existingTask.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      
      const deleted = await storage.deleteCustomMaintenanceTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom maintenance task" });
    }
  });

  // Task override routes for customizing default regional tasks
  app.get("/api/houses/:houseId/task-overrides", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const houseId = req.params.houseId;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      const overrides = await storage.getTaskOverrides(homeownerId, houseId);
      res.json(overrides);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task overrides" });
    }
  });

  app.post("/api/houses/:houseId/task-overrides", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const houseId = req.params.houseId;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      // Validate request body
      const validatedData = insertTaskOverrideSchema.omit({ homeownerId: true, houseId: true }).parse(req.body);
      
      const overrideData = {
        ...validatedData,
        homeownerId,
        houseId
      };
      
      const override = await storage.upsertTaskOverride(overrideData);
      res.status(201).json(override);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task override data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create task override" });
    }
  });

  app.delete("/api/houses/:houseId/task-overrides/:taskId", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const houseId = req.params.houseId;
      const taskId = req.params.taskId;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      const deleted = await storage.deleteTaskOverride(homeownerId, houseId, taskId);
      if (!deleted) {
        return res.status(404).json({ message: "Task override not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task override" });
    }
  });

  // Proposal routes
  app.get("/api/proposals", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const contractorId = req.query.contractorId as string | undefined;
      const homeownerId = req.query.homeownerId as string | undefined;

      // Callers may only retrieve proposals where they are a party.
      // If a filter param is supplied it must match the authenticated user.
      if (contractorId && contractorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (homeownerId && homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Always scope the query to the authenticated user's own proposals.
      // When no filter is supplied, fetch all proposals where the user is
      // either the contractor or the homeowner (OR query via storage).
      // When an explicit role filter is supplied it has already been
      // validated to match userId above, so pass it through directly.
      const proposals = await storage.getProposals(
        contractorId ?? userId,
        homeownerId ?? userId
      );
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      if (proposal.contractorId !== userId && proposal.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  app.post("/api/proposals", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const proposalData = insertProposalSchema.parse({
        ...req.body,
        contractorId: userId
      });
      const proposal = await storage.createProposal(proposalData);
      
      // Create notification for homeowner when proposal is created
      if (proposal.homeownerId) {
        const contractorUser = await storage.getUser(userId);
        const company = contractorUser?.companyId 
          ? await storage.getCompany(contractorUser.companyId)
          : null;
        const contractorName = company?.name || (contractorUser ? `${contractorUser.firstName || ''} ${contractorUser.lastName || ''}`.trim() : '') || 'A contractor';
        
        await storage.createNotification({
          homeownerId: proposal.homeownerId,
          type: 'proposal',
          title: 'New Proposal',
          message: `${contractorName} sent you a proposal: ${proposal.title}`,
          link: '/messages',
          priority: 'high'
        } as any);
      }
      
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proposal data", errors: error.issues });
      }
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  app.patch("/api/proposals/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const partialData = insertProposalSchema.partial().parse(req.body);
      const oldProposal = await storage.getProposal(req.params.id);
      if (!oldProposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      if (oldProposal.contractorId !== userId && oldProposal.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      const proposal = await storage.updateProposal(req.params.id, partialData);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Create notification when proposal status changes to "sent"
      if (oldProposal && oldProposal.status !== 'sent' && proposal.status === 'sent' && proposal.homeownerId) {
        const contractorUser = await storage.getUser(userId);
        const company = contractorUser?.companyId 
          ? await storage.getCompany(contractorUser.companyId)
          : null;
        const contractorName = company?.name || (contractorUser ? `${contractorUser.firstName || ''} ${contractorUser.lastName || ''}`.trim() : '') || 'A contractor';
        
        await storage.createNotification({
          homeownerId: proposal.homeownerId,
          type: 'proposal',
          title: 'New Proposal',
          message: `${contractorName} sent you a proposal: ${proposal.title}`,
          link: '/messages',
          priority: 'high'
        } as any);
      }
      
      if (oldProposal && oldProposal.status !== 'accepted' && proposal.status === 'accepted' && proposal.homeownerId) {
        try {
          const newAchievements = await storage.checkAndUnlockContractorHiringAchievements(proposal.homeownerId);
          if (newAchievements.length > 0) {
            res.json({ ...proposal, newAchievements });
            return;
          }
        } catch (achievementError) {
          console.error("Error unlocking contractor hiring achievement:", achievementError);
        }
      }
      
      res.json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proposal data", errors: error.issues });
      }
      console.error("Error updating proposal:", error);
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });

  // E-signature route for proposals
  app.post("/api/proposals/:id/sign", isAuthenticated, async (req: any, res: any) => {
    try {
      const proposalId = req.params.id;
      const userId = req.session.user.id;
      const { signature, signerName, signedAt, ipAddress } = req.body;

      if (!signature || !signerName || !signedAt) {
        return res.status(400).json({ message: "Missing required signature data" });
      }

      // Get the proposal and verify the user has permission to sign it
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Check if user is the homeowner for this proposal
      if (proposal.homeownerId !== userId) {
        return res.status(403).json({ message: "Only the homeowner can sign this proposal" });
      }

      // Update proposal with signature data
      const updatedProposal = await storage.updateProposal(proposalId, {
        customerSignature: signature,
        contractSignedAt: new Date(signedAt),
        signatureIpAddress: ipAddress,
        status: "accepted"
      });

      try {
        const newAchievements = await storage.checkAndUnlockContractorHiringAchievements(userId);
        if (newAchievements.length > 0) {
          res.json({ ...updatedProposal, newAchievements });
          return;
        }
      } catch (achievementError) {
        console.error("Error unlocking contractor hiring achievement:", achievementError);
      }

      res.json(updatedProposal);
    } catch (error) {
      console.error("Error signing proposal:", error);
      res.status(500).json({ message: "Failed to sign proposal" });
    }
  });

  // Upload contract file for proposal
  app.post("/api/proposals/:id/contract", isAuthenticated, async (req: any, res: any) => {
    try {
      const proposalId = req.params.id;
      const userId = req.session.user.id;
      const { contractFilePath } = req.body;

      if (!contractFilePath) {
        return res.status(400).json({ message: "Contract file path is required" });
      }

      // Get the proposal and verify the user is the contractor
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      if (proposal.contractorId !== userId) {
        return res.status(403).json({ message: "Only the contractor can upload contracts" });
      }

      // Normalize the file path if it's a full URL
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(contractFilePath);

      // Update proposal with contract file
      const updatedProposal = await storage.updateProposal(proposalId, {
        contractFilePath: normalizedPath
      });

      res.json(updatedProposal);
    } catch (error) {
      console.error("Error uploading contract:", error);
      res.status(500).json({ message: "Failed to upload contract" });
    }
  });

  app.delete("/api/proposals/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const proposal = await storage.getProposal(req.params.id);
      
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Only the contractor who created the proposal can delete it
      if (proposal.contractorId !== userId) {
        return res.status(403).json({ message: "Only the proposal creator can delete it" });
      }
      
      const deleted = await storage.deleteProposal(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete proposal" });
    }
  });

  // Contractor Appointment routes
  app.get("/api/appointments", async (req: any, res: any) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      const appointments = await storage.getContractorAppointments(homeownerId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/:id", async (req: any, res: any) => {
    try {
      const appointment = await storage.getContractorAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  app.post("/api/appointments", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Verify user can create appointments (contractors or homeowners)
      if (!['contractor', 'homeowner'].includes(userRole)) {
        return res.status(403).json({ message: "Not authorized to create appointments" });
      }
      
      const appointmentData = insertContractorAppointmentSchema.parse(req.body);
      
      // Verify the user is creating an appointment for themselves
      if (userRole === 'contractor' && appointmentData.contractorId !== userId) {
        return res.status(403).json({ message: "Contractors can only create appointments for themselves" });
      }
      if (userRole === 'homeowner' && appointmentData.homeownerId !== userId) {
        return res.status(403).json({ message: "Homeowners can only create appointments for themselves" });
      }
      
      const appointment = await storage.createContractorAppointment(appointmentData);
      
      // Send SMS confirmation to homeowner
      if (appointmentData.homeownerId) {
        const contractor = appointmentData.contractorId 
          ? await storage.getContractor(appointmentData.contractorId)
          : null;
        const company = contractor?.companyId 
          ? await storage.getCompany(contractor.companyId)
          : null;
        const contractorName = company?.name || 'Your contractor';
        const appointmentDate = appointmentData.scheduledDateTime 
          ? new Date(appointmentData.scheduledDateTime).toLocaleDateString()
          : 'TBD';
        const appointmentTime = appointmentData.scheduledDateTime
          ? new Date(appointmentData.scheduledDateTime).toLocaleTimeString()
          : 'TBD';
        
        smsService.sendAppointmentConfirmation(
          appointmentData.homeownerId,
          contractorName,
          appointmentDate,
          appointmentTime
        ).catch(err => console.error('[SMS] Error sending appointment confirmation:', err));
      }
      
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get appointment to verify ownership
      const existingAppointment = await storage.getContractorAppointment(req.params.id);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Verify user can update this appointment
      const isContractor = userRole === 'contractor' && existingAppointment.contractorId === userId;
      const isHomeowner = userRole === 'homeowner' && existingAppointment.homeownerId === userId;
      
      if (!isContractor && !isHomeowner) {
        return res.status(403).json({ message: "Not authorized to update this appointment" });
      }
      
      const partialData = insertContractorAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateContractorAppointment(req.params.id, partialData);
      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get appointment to verify ownership
      const existingAppointment = await storage.getContractorAppointment(req.params.id);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Verify user can delete this appointment
      const isContractor = userRole === 'contractor' && existingAppointment.contractorId === userId;
      const isHomeowner = userRole === 'homeowner' && existingAppointment.homeownerId === userId;
      
      if (!isContractor && !isHomeowner) {
        return res.status(403).json({ message: "Not authorized to delete this appointment" });
      }
      
      const deleted = await storage.deleteContractorAppointment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Notification routes
  app.get("/api/notifications", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get notifications based on user role
      if (userRole === 'homeowner') {
        const notifications = await storage.getNotifications(userId);
        res.json(notifications);
      } else if (userRole === 'contractor') {
        const notifications = await storage.getContractorNotifications(userId);
        res.json(notifications);
      } else {
        res.status(400).json({ message: "Invalid user role" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get unread notifications based on user role
      if (userRole === 'homeowner') {
        const notifications = await storage.getUnreadNotifications(userId);
        res.json(notifications);
      } else if (userRole === 'contractor') {
        const notifications = await storage.getUnreadContractorNotifications(userId);
        res.json(notifications);
      } else {
        res.status(400).json({ message: "Invalid user role" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      
      // Verify ownership before marking as read
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.homeownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this notification" });
      }
      
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      
      // Verify ownership before deleting
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.homeownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      
      const deleted = await storage.deleteNotification(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Generate maintenance notifications for current month
  app.post("/api/notifications/maintenance", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const { homeownerId, tasks } = req.body;
      if (!homeownerId || !Array.isArray(tasks)) {
        return res.status(400).json({ message: "homeownerId and tasks array are required" });
      }
      
      await storage.createMaintenanceNotifications(homeownerId, tasks);
      
      // Also create regional maintenance suggestions notifications
      try {
        const houses = await storage.getHousesByHomeowner(homeownerId);
        if (houses.length > 0) {
          const { US_MAINTENANCE_DATA, getCurrentMonthTasks, getRegionFromClimateZone } = await import("../shared/location-maintenance-data");
          
          for (const house of houses) {
            const region = getRegionFromClimateZone(house.climateZone);
            const regionData = US_MAINTENANCE_DATA[region];
            const currentMonth = new Date().getMonth() + 1;
            const currentMonthTasks = regionData ? getCurrentMonthTasks(region, currentMonth) : null;
            
            if (regionData && currentMonthTasks) {
              // Create regional suggestions notifications
              const regionalNotifications: any[] = [];
              
              // Add seasonal tasks as notifications
              currentMonthTasks.seasonal.forEach((task, index) => {
                regionalNotifications.push({
                  id: `regional-seasonal-${homeownerId}-${currentMonth}-${index}`,
                  homeownerId,
                  houseId: house.id,
                  type: "maintenance_task" as const,
                  title: `${region} Regional Suggestion`,
                  message: task,
                  priority: currentMonthTasks.priority as "high" | "medium" | "low",
                  isRead: false,
                  actionUrl: "/maintenance",
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              });
              
              // Add weather-specific tasks
              currentMonthTasks.weatherSpecific.forEach((task, index) => {
                regionalNotifications.push({
                  id: `regional-weather-${homeownerId}-${currentMonth}-${index}`,
                  homeownerId,
                  houseId: house.id,
                  type: "maintenance_task" as const,
                  title: `Weather-Specific Task for ${region}`,
                  message: task,
                  priority: "medium" as const,
                  isRead: false,
                  actionUrl: "/maintenance",
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              });
              
              // Add special considerations
              regionData.specialConsiderations.forEach((consideration, index) => {
                regionalNotifications.push({
                  id: `regional-consideration-${homeownerId}-${currentMonth}-${index}`,
                  homeownerId,
                  houseId: house.id,
                  type: "maintenance_task" as const,
                  title: `${region} Regional Consideration`,
                  message: consideration,
                  priority: "low" as const,
                  isRead: false,
                  actionUrl: "/maintenance",
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              });
              
              // Create the notifications
              for (const notification of regionalNotifications) {
                await storage.createNotification(notification);
              }
            }
          }
        }
      } catch (regionalError) {
        console.error("Error creating regional notifications:", regionalError);
        // Don't fail the whole request if regional notifications fail
      }
      
      res.json({ success: true, message: "Maintenance notifications created" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create maintenance notifications" });
    }
  });

  // House management routes
  app.get("/api/houses", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Always use authenticated user's ID, ignore query params
      const homeownerId = req.session.user.id;
      const houses = await storage.getHouses(homeownerId);
      console.log("[DEBUG /api/houses] Returning", houses.length, "houses for", homeownerId);
      houses.forEach((h: any, i: number) => console.log(`  [${i}] ${h.name} - ${h.address} (id: ${h.id})`));
      
      // Prevent browser/proxy caching to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(houses);
    } catch (error) {
      console.error("[ERROR] Failed to fetch houses:", error);
      res.status(500).json({ message: "Failed to fetch houses" });
    }
  });

  app.get("/api/houses/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house" });
    }
  });

  app.post("/api/houses", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {  
    try {
      // Validate request body (excluding homeownerId which we set from session)
      const validatedData = insertHouseSchema.omit({ homeownerId: true }).parse(req.body);
      
      // Use authenticated user's ID, never trust client input
      const homeownerId = req.session.user.id;
      const user = req.session.user;
      
      // Check property limits based on user role
      const existingHouses = await storage.getHouses(homeownerId);
      
      if (user?.role === 'contractor') {
        // Contractors are limited to 1 home for personal maintenance tracking
        if (existingHouses.length >= 1) {
          return res.status(403).json({ 
            message: "Property limit reached. Contractors can track maintenance for one personal property.",
            code: "CONTRACTOR_LIMIT_EXCEEDED"
          });
        }
      } else if (user?.role === 'homeowner') {
        // Check subscription status and house limits
        const subscriptionStatus = user?.subscriptionStatus;
        const trialEndsAt = user?.trialEndsAt;
        
        // Only grandfathered users or explicitly null maxHousesAllowed get unlimited houses
        if (subscriptionStatus === 'grandfathered' || user?.maxHousesAllowed === null) {
          // No limit - allow house creation
        } else {
          // Subscription tier limits:
          // Free: 0 homes (contractor search only)
          // Base ($5): 1-2 homes
          // Premium ($20): 3-6 homes
          // Premium Plus ($40): 7+ (unlimited)
          const maxHouses = user?.maxHousesAllowed ?? 0; // Default to free plan (0 houses)
          
          // Free tier users cannot add any homes
          if (maxHouses === 0) {
            return res.status(403).json({ 
              message: "Free accounts can search for contractors but cannot add properties. Upgrade to Base ($5/month) to add up to 2 homes.",
              code: "FREE_TIER_LIMIT",
              currentPlan: 'free',
              maxHouses: 0,
              currentHouses: existingHouses.length,
              upgradeTo: 'base'
            });
          }
          
          if (existingHouses.length >= maxHouses) {
            // User has reached their plan limit - determine current plan and upgrade path
            const isTrialing = subscriptionStatus === 'trialing' && trialEndsAt && new Date(trialEndsAt) > new Date();
            let currentPlan = 'free';
            let upgradeTo = 'base';
            let upgradeMessage = '';
            
            if (maxHouses <= 2) {
              currentPlan = 'base';
              upgradeTo = 'premium';
              upgradeMessage = `You've reached the ${maxHouses} home limit on the Base plan ($5/month). Upgrade to Premium ($20/month) for up to 6 homes.`;
            } else if (maxHouses <= 6) {
              currentPlan = 'premium';
              upgradeTo = 'premium_plus';
              upgradeMessage = `You've reached the ${maxHouses} home limit on the Premium plan ($20/month). Upgrade to Premium Plus ($40/month) for unlimited homes.`;
            }
            
            return res.status(403).json({ 
              message: upgradeMessage || `Property limit reached. Upgrade to add more properties.`,
              code: "PLAN_LIMIT_EXCEEDED",
              currentPlan,
              maxHouses,
              currentHouses: existingHouses.length,
              isTrialing,
              upgradeTo
            });
          }
        }
      }
      
      // Geocode the address to get coordinates
      let geocoded = null;
      if (validatedData.address) {
        geocoded = await geocodeAddress(validatedData.address);
      }
      
      // Create house with authenticated user's ID and geocoded coordinates
      const houseData = {
        ...validatedData,
        homeownerId,
        ...(geocoded && {
          latitude: geocoded.latitude.toString(),
          longitude: geocoded.longitude.toString()
        })
      };
      
      const house = await storage.createHouse(houseData);
      res.status(201).json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create house" });
    }
  });

  app.delete("/api/houses/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify the house belongs to the authenticated user
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }
      
      const success = await storage.deleteHouse(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete house" });
    }
  });

  app.put("/api/houses/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify the house belongs to the authenticated user
      const existingHouse = await storage.getHouse(req.params.id);
      if (!existingHouse || existingHouse.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }
      
      // Validate request body (excluding homeownerId which cannot be changed)
      const validatedData = insertHouseSchema.omit({ homeownerId: true }).partial().parse(req.body);
      
      // If address is being updated, re-geocode it
      let updateData = { ...validatedData };
      if (validatedData.address && validatedData.address !== existingHouse.address) {
        const geocoded = await geocodeAddress(validatedData.address);
        if (geocoded) {
          updateData.latitude = geocoded.latitude.toString();
          updateData.longitude = geocoded.longitude.toString();
        }
      }
      
      const house = await storage.updateHouse(req.params.id, updateData);
      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update house" });
    }
  });

  // Get maintenance tasks for a specific house
  app.get("/api/houses/:id/maintenance-tasks", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }

      // Get current month and create mock maintenance tasks based on house
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      // Mock response structure - in a real app this would be more sophisticated
      const response = {
        house,
        currentMonth,
        region: house.climateZone || "Mixed",
        tasks: {
          seasonal: [
            "Check HVAC filters and replace if needed",
            "Inspect gutters and downspouts for blockages",
            "Test smoke and carbon monoxide detectors",
            "Check weatherstripping around doors and windows"
          ],
          weatherSpecific: [
            "Inspect roof for loose or damaged shingles",
            "Clean dryer vent and lint trap",
            "Service lawn equipment for spring use"
          ],
          priority: "medium" as const
        }
      };
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance tasks" });
    }
  });

  // Update household profile for a house
  app.patch("/api/houses/:id/profile", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify the house belongs to the authenticated user
      const existingHouse = await storage.getHouse(req.params.id);
      if (!existingHouse || existingHouse.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }

      // Validate request body with household profile schema
      const validatedData = updateHouseholdProfileSchema.parse(req.body);
      
      // Update house with household profile data
      const house = await storage.updateHouse(req.params.id, validatedData);
      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update household profile" });
    }
  });

  // Get generated maintenance schedule for a house - PAID FEATURE
  app.get("/api/houses/:id/schedule", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }

      // Generate maintenance schedule using the algorithm
      const { generateMaintenanceSchedule } = await import("../shared/maintenance-scheduler");
      const schedule = generateMaintenanceSchedule(house);
      
      res.json({
        house: {
          id: house.id,
          name: house.name,
          address: house.address,
        },
        schedule,
      });
    } catch (error) {
      console.error("[ERROR] Failed to generate maintenance schedule:", error);
      res.status(500).json({ message: "Failed to generate maintenance schedule" });
    }
  });

  // Get home health score for a house - PAID FEATURE
  app.get("/api/houses/:id/health-score", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const houseId = req.params.id;
      const homeownerId = req.session.user.id;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }

      // Get ALL completed tasks for this house (filtered to the 12-month scoring window in JS)
      const allCompletions = await db.select()
        .from(taskCompletions)
        .where(eq(taskCompletions.houseId, houseId));

      // 12-month rolling window: only count completions whose (year * 12 + month)
      // falls within the last 12 calendar months (inclusive of the current month).
      const now = new Date();
      const cutoffAbsMonth = (now.getFullYear() - 1) * 12 + (now.getMonth() + 1);

      const scoringCompletions = allCompletions.filter(
        c => (c.year as number) * 12 + (c.month as number) >= cutoffAbsMonth
      );
      const historicalCompletions = allCompletions.filter(
        c => (c.year as number) * 12 + (c.month as number) < cutoffAbsMonth
      );

      const scoringCount = scoringCompletions.length;
      const historicalCount = historicalCompletions.length;

      // Score is +4 per task in the 12-month window, plus a documentation bonus.
      const score = scoringCount * 4 + calculateMechanicalDocumentationBonus(house);

      res.json({
        score,
        scoringCount,
        historicalCount,
        // Legacy fields for backward-compatible clients
        completedTasks: scoringCount,
        missedTasks: 0,
        totalExpectedTasks: scoringCount,
      });
    } catch (error) {
      console.error("Error calculating home health score:", error);
      res.status(500).json({ message: "Failed to calculate home health score" });
    }
  });

  // Get total DIY savings for a house - PAID FEATURE
  app.get("/api/houses/:id/diy-savings", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const houseId = req.params.id;
      const homeownerId = req.session.user.id;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }

      // Get all maintenance logs for this house with DIY completions
      const logs = await storage.getMaintenanceLogs(homeownerId, houseId);
      
      // Calculate total savings from DIY task completions
      const diyLogs = logs.filter(log => log.completionMethod === 'diy' && log.diySavingsAmount);
      const totalSavings = diyLogs.reduce((sum, log) => sum + parseFloat(log.diySavingsAmount || '0'), 0);
      const taskCount = diyLogs.length;
      
      console.log('[DIY SAVINGS]', { houseId, totalLogs: logs.length, diyLogs: diyLogs.length, totalSavings, taskCount });
      
      // Disable caching for this endpoint
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        totalSavings: parseFloat(totalSavings.toFixed(2)),
        taskCount
      });
    } catch (error) {
      console.error("Error fetching DIY savings:", error);
      res.status(500).json({ message: "Failed to fetch DIY savings" });
    }
  });

  // House Transfer routes
  app.post("/api/house-transfers", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      
      // Validate request body (exclude server-generated fields)
      const validatedData = insertHouseTransferSchema.omit({ 
        fromHomeownerId: true,
        token: true,
        expiresAt: true,
        status: true,
        maintenanceLogsTransferred: true,
        appliancesTransferred: true,
        appointmentsTransferred: true,
        customTasksTransferred: true,
        homeSystemsTransferred: true,
        createdAt: true,
        completedAt: true
      }).parse(req.body);
      
      // Verify house ownership
      const house = await storage.getHouse(validatedData.houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found or access denied" });
      }
      
      // Generate secure token and expiry server-side
      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Create transfer request with server-generated security fields
      const transfer = await storage.createHouseTransfer({
        ...validatedData,
        fromHomeownerId: homeownerId,
        token,
        expiresAt,
      });
      
      res.status(201).json(transfer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create house transfer request" });
    }
  });

  app.get("/api/house-transfers", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const transfers = await storage.getHouseTransfersForUser(homeownerId);
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house transfers" });
    }
  });

  app.get("/api/house-transfers/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const transfer = await storage.getHouseTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Verify user is involved in this transfer
      if (transfer.fromHomeownerId !== homeownerId && transfer.toHomeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house transfer" });
    }
  });

  app.get("/api/house-transfers/token/:token", async (req: any, res: any) => {
    try {
      const transfer = await storage.getHouseTransferByToken(req.params.token);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Check if token is still valid
      const tokenExpiry = transfer.expiresAt ? 
        new Date(transfer.expiresAt) : 
        new Date(new Date(transfer.createdAt ?? Date.now()).getTime() + 7*24*60*60*1000);
      
      if (new Date() > tokenExpiry) {
        return res.status(410).json({ message: "Transfer token has expired" });
      }
      
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house transfer" });
    }
  });

  app.post("/api/house-transfers/:id/accept", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const transfer = await storage.getHouseTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Verify this user is the intended recipient (by email or ID)
      const user = await storage.getUser(homeownerId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const emailMatch = user.email?.toLowerCase() === transfer.toHomeownerEmail?.toLowerCase();
      const idMatch = transfer.toHomeownerId === homeownerId;
      
      if (!emailMatch && !idMatch) {
        return res.status(403).json({ 
          message: "Access denied - this transfer is not intended for your account" 
        });
      }
      
      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer is no longer pending" });
      }
      
      // Check subscription limits for recipient
      const housesCount = await storage.getHousesCount(homeownerId);
      const subscriptionStatus = user.subscriptionStatus;
      
      // Only grandfathered users or explicitly null maxHousesAllowed get unlimited houses
      if (subscriptionStatus !== 'grandfathered' && user.maxHousesAllowed !== null) {
        // Subscription tier limits:
        // Free: 0 homes (contractor search only)
        // Base ($5): 1-2 homes
        // Premium ($20): 3-6 homes
        // Premium Plus ($40): 7+ (unlimited)
        const maxHouses = user.maxHousesAllowed ?? 0; // Default to free plan (0 houses)
        
        // Free tier users cannot accept transfers
        if (maxHouses === 0) {
          return res.status(403).json({ 
            message: "Free accounts cannot own properties. Upgrade to Base ($5/month) to accept this transfer.",
            code: "FREE_TIER_LIMIT",
            currentPlan: 'free',
            maxHouses: 0,
            currentHouses: housesCount,
            upgradeTo: 'base'
          });
        }
        
        if (housesCount >= maxHouses) {
          const isTrialing = subscriptionStatus === 'trialing' && user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
          let currentPlan = 'free';
          let upgradeTo = 'base';
          let upgradeMessage = '';
          
          if (maxHouses <= 2) {
            currentPlan = 'base';
            upgradeTo = 'premium';
            upgradeMessage = `Cannot accept transfer. You have ${housesCount} homes on the Base plan (max ${maxHouses}). Upgrade to Premium ($20/month) for up to 6 homes.`;
          } else if (maxHouses <= 6) {
            currentPlan = 'premium';
            upgradeTo = 'premium_plus';
            upgradeMessage = `Cannot accept transfer. You have ${housesCount} homes on the Premium plan (max ${maxHouses}). Upgrade to Premium Plus ($40/month) for unlimited homes.`;
          }
          
          return res.status(403).json({ 
            message: upgradeMessage || `Cannot accept transfer. Upgrade to add more properties.`,
            code: "PLAN_LIMIT_EXCEEDED",
            currentPlan,
            maxHouses,
            currentHouses: housesCount,
            isTrialing,
            upgradeTo
          });
        }
      }
      
      // Update transfer status to accepted and set recipient ID
      const updatedTransfer = await storage.updateHouseTransfer(req.params.id, {
        status: 'accepted',
        toHomeownerId: homeownerId
      });
      
      res.json(updatedTransfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to accept house transfer" });
    }
  });

  app.post("/api/house-transfers/:id/confirm", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const transfer = await storage.getHouseTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Verify this is the original owner confirming the transfer
      if (transfer.fromHomeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied - only the original owner can confirm" });
      }
      
      if (transfer.status !== 'accepted') {
        return res.status(400).json({ message: "Transfer must be accepted before confirmation" });
      }
      
      // Perform the actual ownership transfer
      if (!transfer.toHomeownerId) {
        return res.status(400).json({ message: "Transfer recipient not set" });
      }
      
      const transferResults = await storage.transferHouseOwnership(
        transfer.houseId,
        transfer.fromHomeownerId,
        transfer.toHomeownerId
      );
      
      // Update transfer record with completion details
      const completedTransfer = await storage.updateHouseTransfer(req.params.id, {
        status: 'completed',
        completedAt: new Date(),
        maintenanceLogsTransferred: transferResults.maintenanceLogsTransferred,
        appliancesTransferred: transferResults.appliancesTransferred,
        appointmentsTransferred: transferResults.appointmentsTransferred,
        customTasksTransferred: transferResults.customTasksTransferred,
        homeSystemsTransferred: transferResults.homeSystemsTransferred,
      });
      
      res.json({
        transfer: completedTransfer,
        transferResults
      });
    } catch (error) {
      console.error("Transfer confirmation error:", error);
      res.status(500).json({ message: "Failed to confirm house transfer" });
    }
  });

  // Home Systems routes
  app.get("/api/home-systems", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Always use authenticated user's ID, ignore query params to prevent IDOR
      const homeownerId = req.session.user.id;
      const houseId = req.query.houseId as string;
      
      // If houseId is provided, verify it belongs to the user
      if (houseId) {
        const house = await storage.getHouse(houseId);
        if (!house || house.homeownerId !== homeownerId) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const systems = await storage.getHomeSystems(homeownerId, houseId);
      res.json(systems);
    } catch (error) {
      console.error("[ERROR] Failed to fetch home systems:", error);
      res.status(500).json({ message: "Failed to fetch home systems" });
    }
  });

  app.get("/api/home-systems/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const system = await storage.getHomeSystem(req.params.id);
      if (!system) {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      // Home systems belong to houses, so verify the house belongs to the user
      if (system.houseId) {
        const house = await storage.getHouse(system.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(404).json({ message: "Home system not found" });
        }
      } else {
        // If no houseId, this is a security issue - home systems should always belong to a house
        return res.status(404).json({ message: "Home system not found" });
      }
      
      res.json(system);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home system" });
    }
  });

  app.post("/api/home-systems", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const systemData = insertHomeSystemSchema.parse(req.body);
      
      // Verify the house belongs to the authenticated user
      if (!systemData.houseId) {
        return res.status(400).json({ message: "House ID is required for home systems" });
      }
      
      const house = await storage.getHouse(systemData.houseId);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      const system = await storage.createHomeSystem(systemData);
      res.status(201).json(system);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid home system data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to create home system" });
    }
  });

  app.patch("/api/home-systems/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify the home system belongs to a house owned by the authenticated user
      const existingSystem = await storage.getHomeSystem(req.params.id);
      if (!existingSystem) {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      if (existingSystem.houseId) {
        const house = await storage.getHouse(existingSystem.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(404).json({ message: "Home system not found" });
        }
      } else {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      const partialData = insertHomeSystemSchema.partial().parse(req.body);
      
      // If houseId is being updated, verify the new house also belongs to the user
      if (partialData.houseId && partialData.houseId !== existingSystem.houseId) {
        const newHouse = await storage.getHouse(partialData.houseId);
        if (!newHouse || newHouse.homeownerId !== req.session.user.id) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const system = await storage.updateHomeSystem(req.params.id, partialData);
      if (!system) {
        return res.status(404).json({ message: "Home system not found" });
      }
      res.json(system);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid home system data", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to update home system" });
    }
  });

  app.delete("/api/home-systems/:id", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      // Verify the home system belongs to a house owned by the authenticated user
      const existingSystem = await storage.getHomeSystem(req.params.id);
      if (!existingSystem) {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      if (existingSystem.houseId) {
        const house = await storage.getHouse(existingSystem.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(404).json({ message: "Home system not found" });
        }
      } else {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      const deleted = await storage.deleteHomeSystem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Home system not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete home system" });
    }
  });

  // POST /api/home-systems/extract-pdf — AI reads a PDF/image and extracts home system fields
  app.post("/api/home-systems/extract-pdf", isAuthenticated, requirePropertyOwner, upload.single("file"), async (req: any, res: any) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      let documentText = "";

      if (req.file.mimetype === "application/pdf") {
        try {
          const { PDFParse, VerbosityLevel } = await import("pdf-parse");
          const parser = new PDFParse({ data: req.file.buffer, verbosity: VerbosityLevel.ERRORS });
          const result = await parser.getText();
          documentText = result.text ?? "";
        } catch (pdfErr) {
          console.warn("[SYSTEM-PDF] PDF parse error:", pdfErr);
          return res.status(422).json({ message: "Could not read PDF — try a clearer scan or a different file." });
        }
      } else if (req.file.mimetype.startsWith("image/")) {
        // For images, use OpenAI vision
        const base64 = req.file.buffer.toString("base64");
        const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || process.env.REPLIT_OPENAI_API_KEY });
        const visionRes = await openaiClient.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: [
              {
                type: "text",
                text: `You are extracting home fixture/appliance details from an image of a label, manual, receipt, or warranty card.
Return ONLY a JSON object with these fields (use null for any field you cannot find):
{
  "systemType": "type of fixture or system (e.g. Water Heater, HVAC, Furnace, Boiler, Electrical Panel, etc.)",
  "brand": "manufacturer/brand name",
  "model": "model number or name",
  "serialNumber": "serial number",
  "installationYear": integer year or null
}`,
              },
              {
                type: "image_url",
                image_url: { url: `data:${req.file.mimetype};base64,${base64}` },
              },
            ],
          }],
          max_tokens: 300,
          response_format: { type: "json_object" },
        });
        const raw = visionRes.choices[0]?.message?.content ?? "{}";
        return res.json(JSON.parse(raw));
      } else {
        return res.status(400).json({ message: "Only PDF or image files are supported" });
      }

      if (!documentText.trim()) {
        return res.status(422).json({ message: "The document appears to be empty or image-based. Try uploading an image instead." });
      }

      // Truncate to ~4000 tokens worth of text
      const truncated = documentText.slice(0, 12000);

      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are extracting home fixture or mechanical system details from a document (manual, warranty card, installation receipt, spec sheet, or label).
Return ONLY a JSON object with these fields (use null for any field you cannot confidently determine):
{
  "systemType": "type of fixture or system (e.g. Water Heater, HVAC, Furnace, Boiler, Electrical Panel, Roof, Plumbing, etc.)",
  "brand": "manufacturer/brand name",
  "model": "model number or name",
  "serialNumber": "serial number",
  "installationYear": integer year only (e.g. 2019) or null
}`,
          },
          {
            role: "user",
            content: truncated,
          },
        ],
        max_tokens: 300,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";
      const extracted = JSON.parse(raw);
      res.json(extracted);
    } catch (err) {
      console.error("[SYSTEM-PDF] Extraction error:", err);
      res.status(500).json({ message: "Failed to extract data from document" });
    }
  });

  // House Disclosure routes
  // Alias for the canonical /api/houses/:houseId/disclosure GET route below.
  // Kept for compatibility with My Home CTA query cache key (/api/houses/:id/disclosure).
  // Canonical routes are /api/houses/:houseId/disclosure (GET/PUT).
  app.get("/api/disclosures/:houseId", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const userId = req.session.user.id;
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const disclosure = await storage.getHouseDisclosure(houseId);
      if (!disclosure) return res.status(404).json({ message: "No disclosure found for this property" });
      res.json(disclosure);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  // Shared handler for PUT disclosure — used by both alias routes below
  const handleDisclosurePut = async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const userId = req.session.user.id;
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const { answers, formType, stateCode } = req.body;
      if (answers !== undefined && (typeof answers !== "object" || Array.isArray(answers))) {
        return res.status(400).json({ message: "answers must be a JSON object" });
      }
      if (formType !== undefined && typeof formType !== "string") {
        return res.status(400).json({ message: "formType must be a string" });
      }
      if (stateCode !== undefined && typeof stateCode !== "string") {
        return res.status(400).json({ message: "stateCode must be a string" });
      }
      const disclosure = await storage.upsertHouseDisclosure({
        houseId,
        homeownerId: userId,
        formType: (typeof formType === "string" ? formType : null) ?? "pcds",
        stateCode: (typeof stateCode === "string" ? stateCode : null) ?? "UNKNOWN",
        answers: answers ?? {},
      });
      res.json(disclosure);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  };

  app.put("/api/disclosures/:houseId", isAuthenticated, requirePropertyOwner, handleDisclosurePut);

  // Canonical disclosure routes: /api/houses/:houseId/disclosure
  app.get("/api/houses/:houseId/disclosure", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const userId = req.session.user.id;
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied to this property" });
      }
      const disclosure = await storage.getHouseDisclosure(houseId);
      if (!disclosure) return res.status(404).json({ message: "No disclosure found for this property" });
      res.json(disclosure);
    } catch (e: any) {
      res.status(500).json({ message: e.message });
    }
  });

  app.put("/api/houses/:houseId/disclosure", isAuthenticated, requirePropertyOwner, handleDisclosurePut);

  // AI Disclosure Suggestion: POST /api/houses/:houseId/disclosure/ai-suggest
  // Accepts the current form's question list, fetches house/systems/logs, calls GPT-4o-mini,
  // and returns suggested answers keyed by question ID.
  app.post("/api/houses/:houseId/disclosure/ai-suggest", isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const userId = req.session.user.id;

      // Ownership check
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied to this property" });
      }

      // Validate and type the incoming question list
      const questionSchema = z.array(z.object({
        id: z.string(),
        text: z.string(),
        type: z.enum(["yes_no_unknown", "yes_no", "select", "number", "text"]),
        options: z.array(z.string()).optional(),
      }));
      const parsed = questionSchema.safeParse(req.body.questions);
      if (!parsed.success || parsed.data.length === 0) {
        return res.status(400).json({ message: "questions must be a non-empty array of valid question objects" });
      }
      const questions = parsed.data;

      // Fetch data for AI context in parallel
      const [systemRows, logRows, applianceRows] = await Promise.all([
        db.select().from(homeSystems).where(eq(homeSystems.houseId, houseId)),
        db.select().from(maintenanceLogs).where(eq(maintenanceLogs.houseId, houseId)),
        db.select().from(homeAppliances).where(eq(homeAppliances.houseId, houseId)),
      ]);

      // Build context string from available property data (all fields are typed on the House schema)
      const contextLines: string[] = ["PROPERTY INFORMATION:"];
      if (house.yearBuilt) contextLines.push(`- Year Built: ${house.yearBuilt}`);
      if (house.address) contextLines.push(`- Address: ${house.address}`);
      if (house.foundationType) contextLines.push(`- Foundation Type: ${house.foundationType}`);
      if (house.roofType) contextLines.push(`- Roof Type: ${house.roofType}`);
      if (house.hvacType) contextLines.push(`- HVAC Type: ${house.hvacType}`);
      if (house.primaryHeatingFuel) contextLines.push(`- Primary Heating Fuel: ${house.primaryHeatingFuel}`);
      if (house.plumbingType) contextLines.push(`- Plumbing Type: ${house.plumbingType}`);
      if (house.waterHeaterType) contextLines.push(`- Water Heater Type: ${house.waterHeaterType}`);
      if (house.garageType) contextLines.push(`- Garage Type: ${house.garageType}`);
      if (house.squareFootage) contextLines.push(`- Square Footage: ${house.squareFootage}`);

      if (systemRows.length > 0) {
        contextLines.push("\nHOME SYSTEMS:");
        for (const sys of systemRows) {
          const brandModel = [sys.brand, sys.model].filter(Boolean).join(" ");
          const parts = [sys.systemType, brandModel ? `(${brandModel})` : null, sys.installationYear ? `installed ${sys.installationYear}` : null].filter(Boolean);
          contextLines.push(`- ${parts.join(" ")}`);
        }
      }

      if (logRows.length > 0) {
        contextLines.push("\nMAINTENANCE HISTORY (most recent 20 entries):");
        for (const log of logRows.slice(-20)) {
          const desc = log.serviceDescription ? log.serviceDescription.slice(0, 120) : null;
          const parts = [log.serviceDate, log.serviceType, log.homeArea ? `(${log.homeArea})` : null, desc ? `— ${desc}` : null].filter(Boolean);
          contextLines.push(`- ${parts.join(" ")}`);
        }
      }

      if (applianceRows.length > 0) {
        contextLines.push("\nAPPLIANCES:");
        for (const ap of applianceRows) {
          const brandModel = [ap.make, ap.model].filter(Boolean).join(" ");
          const parts = [ap.name, brandModel ? `(${brandModel})` : null, ap.yearInstalled ? `installed ${ap.yearInstalled}` : null].filter(Boolean);
          contextLines.push(`- ${parts.join(" ")}`);
        }
      }

      const context = contextLines.join("\n");

      const prompt = `You are helping a homeowner fill out a Property Condition Disclosure form using their documented property records.

${context}

Based ONLY on the property information above, suggest answers for the following disclosure questions.
ONLY answer questions where you have clear evidence from the provided data. Omit any question you cannot answer confidently.

Answer format rules:
- yes_no_unknown type: answer must be exactly one of: "Yes", "No", "Unknown"
- yes_no type: answer must be exactly one of: "Yes", "No"
- select type: answer must be EXACTLY one of the listed options (case-sensitive)
- number type: return a number (integer or decimal, no quotes)
- text type: return a concise descriptive string

Return ONLY a JSON object where keys are question IDs and values are the suggested answers.
Do NOT include questions you cannot confidently answer. Do NOT include null values.

Questions:
${JSON.stringify(questions.map(q => ({ id: q.id, text: q.text, type: q.type, ...(q.options ? { options: q.options } : {}) })), null, 2)}`;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 1200,
        response_format: { type: "json_object" },
      });

      let suggestions: Record<string, unknown> = {};
      try {
        suggestions = JSON.parse(completion.choices[0]?.message?.content ?? "{}");
      } catch {
        suggestions = {};
      }

      // Validate: enforce question ID membership and per-type value constraints
      const questionById = new Map(questions.map(q => [q.id, q]));
      const validated: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(suggestions)) {
        const q = questionById.get(key);
        if (!q || val === null || val === undefined || val === "") continue;
        if (q.type === "yes_no_unknown" && !["Yes", "No", "Unknown"].includes(String(val))) continue;
        if (q.type === "yes_no" && !["Yes", "No"].includes(String(val))) continue;
        if (q.type === "select" && q.options && !q.options.includes(String(val))) continue;
        if (q.type === "number" && typeof val !== "number" && isNaN(Number(val))) continue;
        if (q.type === "text" && typeof val !== "string") continue;
        validated[key] = val;
      }

      res.json({ suggestions: validated });
    } catch (error) {
      console.error("[AI DISCLOSURE SUGGEST] Error:", error);
      res.status(500).json({ message: "Failed to generate AI suggestions" });
    }
  });

  // ===== AI MAINTENANCE PRIORITY COACH =====
  app.post("/api/houses/:houseId/maintenance-coach", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const homeownerId = req.session.user.id;

      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }

      const bodySchema = z.object({
        month: z.number().int().min(1).max(12),
        zone: z.string(),
      });
      const { month, zone } = bodySchema.parse(req.body);

      const currentYear = new Date().getFullYear();
      const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
      const season = month >= 3 && month <= 5 ? "Spring" : month >= 6 && month <= 8 ? "Summer" : month >= 9 && month <= 11 ? "Fall" : "Winter";

      // Fetch completions + custom tasks in parallel
      const [completedTaskRows, customTaskRows] = await Promise.all([
        db.select().from(taskCompletions).where(eq(taskCompletions.houseId, houseId)),
        storage.getCustomMaintenanceTasks(homeownerId, houseId),
      ]);

      // Wellness score: canonical formula matching health-score endpoint
      const wellnessScore = completedTaskRows.length * 4 + calculateMechanicalDocumentationBonus(house);

      // Completed task titles for THIS month — used to filter out already-done tasks
      const completedThisMonth = new Set(
        completedTaskRows
          .filter(r => r.month === month && r.year === currentYear)
          .map(r => r.taskTitle)
      );

      // Map client zone name → US_MAINTENANCE_DATA region key
      const zoneToRegion: Record<string, string> = {
        "northeast": "Northeast",
        "southeast": "Southeast",
        "midwest": "Midwest",
        "southwest": "Southwest",
        "mountain-west": "Mountain West",
        "california": "West Coast",
        "pacific-northwest": "Pacific Northwest",
        "great-plains": "Midwest",
      };
      const { US_MAINTENANCE_DATA } = await import("../shared/location-maintenance-data");
      const regionName = zoneToRegion[zone] ?? "Midwest";
      const regionData = US_MAINTENANCE_DATA[regionName];

      interface CoachTask {
        title: string;
        priority: string;
        status: "overdue" | "current" | "upcoming";
        month: number;
        costHint?: string; // e.g. "$50–$200 pro"
      }

      // currentMonthTasks: shown in the UI grid — only these can be topTask candidates
      const currentMonthTasks: CoachTask[] = [];
      // contextTasks: overdue + upcoming — used only for briefing context, not topTask validation
      const contextTasks: CoachTask[] = [];

      if (regionData) {
        for (const offset of [-2, -1, 0, 1, 2]) {
          let m = month + offset;
          if (m < 1) m += 12;
          if (m > 12) m -= 12;
          const status: "overdue" | "current" | "upcoming" = offset < 0 ? "overdue" : offset === 0 ? "current" : "upcoming";
          const monthData = regionData.monthlyTasks[m];
          if (!monthData) continue;
          const allItems = [...(monthData.seasonal ?? []), ...(monthData.weatherSpecific ?? [])];
          for (const t of allItems) {
            const costEst = t.costEstimate;
            const costHint = costEst
              ? (costEst.proHigh ? `$${costEst.proLow}–$${costEst.proHigh} pro` : `$${costEst.proLow}+ pro`)
              : undefined;
            const task: CoachTask = {
              title: t.title,
              priority: t.priority ?? monthData.priority ?? "medium",
              status,
              month: m,
              costHint,
            };
            if (offset === 0) {
              // Exclude already-completed tasks from current month recommendations
              if (!completedThisMonth.has(t.title)) {
                currentMonthTasks.push(task);
              }
            } else {
              if (contextTasks.length < 20) contextTasks.push(task);
            }
          }
        }
      }

      // Add active custom tasks to current month candidates (not completed this month)
      for (const ct of customTaskRows) {
        if (!ct.isActive) continue;
        if (completedThisMonth.has(ct.title)) continue;
        currentMonthTasks.push({
          title: ct.title,
          priority: ct.priority,
          status: "current",
          month,
        });
      }

      // topTask validation: only titles from the current-month pending set
      const validTitles = new Set(currentMonthTasks.map(t => t.title));

      // Build prompt context
      const contextLines: string[] = [
        `Date: ${monthNames[month - 1]} ${currentYear}`,
        `Season: ${season}`,
        `Climate zone / region: ${zone} (${regionName})`,
        `Home wellness score: ${wellnessScore} (each completed task earns 4 points)`,
      ];

      if (currentMonthTasks.length > 0) {
        contextLines.push("", `Pending tasks for THIS month (${currentMonthTasks.length} — these are the only candidates for your top-3 list):`);
        currentMonthTasks.forEach((t, i) => {
          const cost = t.costHint ? ` [est. ${t.costHint}]` : "";
          contextLines.push(`  ${i + 1}. [${t.priority.toUpperCase()}] ${t.title}${cost}`);
        });
      }

      if (contextTasks.length > 0) {
        const overdue = contextTasks.filter(t => t.status === "overdue");
        const upcoming = contextTasks.filter(t => t.status === "upcoming");
        if (overdue.length > 0) {
          contextLines.push("", `Overdue tasks from prior months (for briefing context only — DO NOT put these in topTasks):`);
          overdue.slice(0, 8).forEach(t => contextLines.push(`  - [${t.priority.toUpperCase()}] ${t.title} (from ${monthNames[t.month - 1]})`));
        }
        if (upcoming.length > 0) {
          contextLines.push("", `Upcoming tasks in the next 1-2 months (for briefing context only):`);
          upcoming.slice(0, 6).forEach(t => contextLines.push(`  - ${t.title} (${monthNames[t.month - 1]})`));
        }
      }

      const noCurrentTasks = currentMonthTasks.length === 0;
      const prompt = `You are an expert home maintenance advisor helping a homeowner prioritize their tasks.

${contextLines.join("\n")}

${noCurrentTasks
  ? 'The homeowner has completed all tasks for this month or has none pending. Acknowledge this warmly (2-3 sentences) and mention any overdue context if relevant. Respond with ONLY valid JSON: { "briefing": "...", "topTasks": [] }'
  : `Provide a personalized maintenance briefing and top-3 task list for this homeowner.

Rules:
1. topTasks MUST only use exact titles from the "Pending tasks for THIS month" list above.
2. Rank by: HIGH priority first, then MEDIUM, then LOW. Within same priority, prefer tasks most critical in ${season} for ${regionName}.
3. If wellness score < 40, encourage habit-building in the briefing.
4. If there are overdue tasks listed in context, mention them in the briefing (but do NOT put them in topTasks).

Respond with ONLY valid JSON (no markdown, no code fences):
{
  "briefing": "2-4 personalized sentences: month/season focus, overdue mention if any, wellness observation",
  "topTasks": [
    { "title": "<exact title from THIS MONTH list>", "reason": "<1 sentence: why this task matters right now>" },
    { "title": "...", "reason": "..." },
    { "title": "...", "reason": "..." }
  ]
}
Include up to 3 tasks (fewer if fewer than 3 are pending). Do not include null entries.`}`;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 700,
      });

      const raw = completion.choices[0]?.message?.content ?? "";

      let result: { briefing: string; topTasks: { title: string; reason: string }[] };
      try {
        result = JSON.parse(raw);
      } catch {
        return res.json({ briefing: "Your home is looking great! Stay consistent with your maintenance plan.", topTasks: [] });
      }

      // Validate topTasks: must be current-month, pending (non-completed) tasks
      const validatedTopTasks = (result.topTasks ?? [])
        .filter(t => t && typeof t.title === "string" && typeof t.reason === "string" && validTitles.has(t.title))
        .slice(0, 3);

      res.json({ briefing: result.briefing ?? "", topTasks: validatedTopTasks });
    } catch (error) {
      console.error("[AI MAINTENANCE COACH] Error:", error);
      res.status(500).json({ message: "Failed to generate maintenance coaching advice" });
    }
  });

  // ===== AI HOME RESALE READINESS REPORT =====
  app.post("/api/houses/:houseId/resale-readiness", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const homeownerId = req.session.user.id;

      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }

      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      const threeYearsAgoStr = threeYearsAgo.toISOString().slice(0, 10);

      // Fetch all needed data in parallel
      const [completedTaskRows, allMaintenanceLogs, allHomeSystems, houseServiceRecords] = await Promise.all([
        db.select().from(taskCompletions).where(eq(taskCompletions.houseId, houseId)),
        storage.getMaintenanceLogs(homeownerId, houseId),
        storage.getHomeSystems(homeownerId, houseId),
        db.select({ serviceType: serviceRecords.serviceType }).from(serviceRecords).where(
          and(
            eq(serviceRecords.houseId, houseId),
            eq(serviceRecords.isVisibleToHomeowner, true)
          )
        ),
      ]);

      // Canonical wellness score — +4 per completed task (matches /api/houses/:id/health-score)
      const wellnessScore = completedTaskRows.length * 4 + calculateMechanicalDocumentationBonus(house);

      // Maintenance logs from last 3 years
      const recentLogs = allMaintenanceLogs.filter(log => {
        return log.serviceDate >= threeYearsAgoStr;
      });

      // Group logs by category/area
      const logsByArea: Record<string, number> = {};
      for (const log of recentLogs) {
        const area = log.homeArea ?? "general";
        logsByArea[area] = (logsByArea[area] ?? 0) + 1;
      }

      // Home systems: gather names and ages
      const systemSummary = allHomeSystems.slice(0, 10).map(sys => {
        const parts = [sys.systemType];
        if (sys.installationYear) parts.push(`installed ${sys.installationYear}`);
        if (sys.brand) parts.push(sys.brand);
        return parts.join(" — ");
      });

      const currentYear = new Date().getFullYear();
      const completedThisYear = completedTaskRows.filter(r => r.year === currentYear).length;

      // Build a readable log summary for the prompt
      const logSummaryLines: string[] = [];
      for (const [area, count] of Object.entries(logsByArea).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
        logSummaryLines.push(`  - ${area}: ${count} service record${count > 1 ? "s" : ""}`);
      }

      const houseAge = house.yearBuilt ? currentYear - house.yearBuilt : null;
      const houseAgeStr = houseAge !== null ? `${houseAge} years old (built ${house.yearBuilt})` : "age unknown";
      const homeSysStr = systemSummary.length > 0
        ? systemSummary.join(", ")
        : "No home systems on file";

      // Service records (from contractors via MyHomeBase platform)
      const svcByType: Record<string, number> = {};
      for (const sr of houseServiceRecords) {
        const t = sr.serviceType ?? "other";
        svcByType[t] = (svcByType[t] ?? 0) + 1;
      }
      const svcSummaryLines = Object.entries(svcByType)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([t, c]) => `  - ${t}: ${c} record${c > 1 ? "s" : ""}`);

      // Outstanding/incomplete tasks for current season (from US_MAINTENANCE_DATA)
      const zoneToRegion: Record<string, string> = {
        "northeast": "Northeast", "southeast": "Southeast", "midwest": "Midwest",
        "southwest": "Southwest", "mountain-west": "Mountain West",
        "california": "West Coast", "pacific-northwest": "Pacific Northwest",
        "great-plains": "Midwest",
      };
      const currentMonthNum = new Date().getMonth() + 1;
      const { US_MAINTENANCE_DATA } = await import("../shared/location-maintenance-data");
      const climateKey = (house.climateZone ?? "midwest").toLowerCase().replace(/\s+/g, "-");
      const regionName = zoneToRegion[climateKey] ?? "Midwest";
      const regionData = US_MAINTENANCE_DATA[regionName];

      const completedTitlesThisYear = new Set(
        completedTaskRows.filter(r => r.year === currentYear).map(r => r.taskTitle)
      );

      interface OutstandingTask { title: string; priority: string; month: number }
      const outstandingTasks: OutstandingTask[] = [];
      if (regionData) {
        for (const offset of [-2, -1, 0]) {
          let m = currentMonthNum + offset;
          if (m < 1) m += 12;
          const monthData = regionData.monthlyTasks[m];
          if (!monthData) continue;
          const items = [...(monthData.seasonal ?? []), ...(monthData.weatherSpecific ?? [])];
          for (const t of items) {
            if (!completedTitlesThisYear.has(t.title)) {
              outstandingTasks.push({ title: t.title, priority: t.priority ?? monthData.priority ?? "medium", month: m });
            }
          }
        }
      }
      const highOutstanding = outstandingTasks.filter(t => t.priority === "high").slice(0, 4);
      const otherOutstanding = outstandingTasks.filter(t => t.priority !== "high").slice(0, 3);
      const outstandingLines = [...highOutstanding, ...otherOutstanding]
        .map(t => {
          const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
          return `  - [${t.priority.toUpperCase()}] ${t.title} (due ${monthNames[t.month - 1]})`;
        });

      const contextBlock = [
        `Property: ${house.address ?? "address not recorded"} — ${houseAgeStr}`,
        `Home Wellness Score: ${wellnessScore} points (${completedTaskRows.length} total tasks completed — canonical formula: +4 per task)`,
        `Tasks completed this year (${currentYear}): ${completedThisYear}`,
        `Total maintenance log entries in last 3 years: ${recentLogs.length}`,
        recentLogs.length > 0 ? `Homeowner-logged service history:\n${logSummaryLines.join("\n")}` : "No homeowner maintenance log entries in last 3 years.",
        houseServiceRecords.length > 0
          ? `Contractor service records on file (${houseServiceRecords.length} total):\n${svcSummaryLines.join("\n")}`
          : "No contractor service records on file.",
        `Documented home systems (${allHomeSystems.length}): ${homeSysStr}`,
        outstandingTasks.length > 0
          ? `Outstanding/incomplete maintenance tasks (${outstandingTasks.length} overdue or current, highest priority listed):\n${outstandingLines.join("\n")}`
          : "No outstanding maintenance tasks detected for current period.",
        house.climateZone ? `Climate zone: ${house.climateZone} (${regionName} region)` : null,
      ].filter(Boolean).join("\n");

      const prompt = `You are a seasoned home sale consultant reviewing a property's documented maintenance record to prepare a Resale Readiness Report for the homeowner.

Property data:
${contextBlock}

Grading scale for context:
- A (Excellent): Wellness score 100+, 10+ service records in 3 years, most systems documented
- B (Good): Wellness score 60–99, 5–9 records, several systems on file
- C (Fair): Wellness score 30–59, 2–4 records, some documentation gaps
- D (Needs Work): Wellness score < 30 or 1–2 records or very few systems
- F (Critical Gaps): No service records, no systems, or wellness score 0

Your job:
1. Assign a letter grade (A, B, C, D, or F) reflecting the overall sell-readiness based on documented history only.
2. Write a concise summary paragraph (3-4 sentences) that's honest and constructive — not just positive.
3. List 3–5 Strengths: things documented in this home's history that buyers and agents will find reassuring.
4. List 3–5 Concerns: gaps or issues that could hurt buyer confidence or trigger inspection flags.
5. List 4–6 Action Items: specific steps to take before listing, ranked by impact.

Be honest. If the data shows gaps, say so. Each bullet should be 1-2 sentences max.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "grade": "B",
  "summary": "...",
  "strengths": ["...", "..."],
  "concerns": ["...", "..."],
  "actionItems": ["...", "..."]
}`;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        max_tokens: 1000,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";

      let parsed: { grade?: string; summary?: string; strengths?: unknown; concerns?: unknown; actionItems?: unknown };
      try {
        parsed = JSON.parse(raw);
      } catch {
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      const validGrades = ["A", "B", "C", "D", "F"];
      const grade = validGrades.includes(String(parsed.grade ?? "")) ? String(parsed.grade) : "C";
      const summary = typeof parsed.summary === "string" && parsed.summary.length > 0
        ? parsed.summary
        : "Your home has some documented history. Review the sections below for detailed analysis.";
      const strengths = Array.isArray(parsed.strengths) ? (parsed.strengths as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 6) : [];
      const concerns = Array.isArray(parsed.concerns) ? (parsed.concerns as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 6) : [];
      const actionItems = Array.isArray(parsed.actionItems) ? (parsed.actionItems as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 8) : [];

      res.json({
        grade,
        summary,
        strengths,
        concerns,
        actionItems,
        meta: {
          wellnessScore,
          maintenanceLogCount: recentLogs.length,
          serviceRecordCount: houseServiceRecords.length,
          outstandingTaskCount: outstandingTasks.length,
          systemCount: allHomeSystems.length,
          houseAddress: house.address ?? null,
          houseAge: houseAge ?? null,
        },
      });
    } catch (error) {
      console.error("[AI RESALE READINESS] Error:", error);
      res.status(500).json({ message: "Failed to generate resale readiness report" });
    }
  });

  // ===== AI INSURANCE PREP ASSISTANT =====
  app.post("/api/houses/:houseId/insurance-prep", isAuthenticated, requirePropertyOwner, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const homeownerId = req.session.user.id;

      const VALID_CLAIM_AREAS = ["Roof", "HVAC", "Plumbing", "Electrical", "Foundation", "Appliances", "Interior", "Exterior", "Garage", "Other"] as const;
      const bodySchema = z.object({
        claimArea: z.enum(VALID_CLAIM_AREAS),
        incidentDescription: z.string().max(1000).optional(),
        incidentDate: z.string().max(20).optional(),
      });

      let body: z.infer<typeof bodySchema>;
      try {
        body = bodySchema.parse(req.body);
      } catch {
        return res.status(400).json({ message: "Invalid request body" });
      }

      const { claimArea, incidentDescription, incidentDate } = body;

      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }

      const fiveYearsAgo = new Date();
      fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
      const fiveYearsAgoStr = fiveYearsAgo.toISOString().slice(0, 10);

      // Fetch all needed data in parallel — avoid home_area column (not in DB)
      const [allMaintenanceLogs, allHomeSystems, houseServiceRecords] = await Promise.all([
        storage.getMaintenanceLogs(homeownerId, houseId),
        storage.getHomeSystems(homeownerId, houseId),
        db.select({
          serviceType: serviceRecords.serviceType,
          serviceDescription: serviceRecords.serviceDescription,
          serviceDate: serviceRecords.serviceDate,
          cost: serviceRecords.cost,
          status: serviceRecords.status,
          warrantyPeriod: serviceRecords.warrantyPeriod,
        }).from(serviceRecords).where(
          and(
            eq(serviceRecords.houseId, houseId),
            eq(serviceRecords.isVisibleToHomeowner, true)
          )
        ),
      ]);

      // Filter maintenance logs to last 5 years
      const recentLogs = allMaintenanceLogs.filter(log => log.serviceDate >= fiveYearsAgoStr);

      // Build a chronological event list from maintenance logs and service records
      interface EventEntry {
        date: string;
        description: string;
        source: "maintenance_log" | "service_record";
        area?: string;
        cost?: string;
      }
      const events: EventEntry[] = [];

      for (const log of recentLogs) {
        events.push({
          date: log.serviceDate,
          description: [log.serviceType, log.serviceDescription].filter(Boolean).join(" — "),
          source: "maintenance_log",
          area: log.homeArea ?? undefined,
          cost: log.cost ? `$${log.cost}` : undefined,
        });
      }

      for (const sr of houseServiceRecords) {
        if (sr.serviceDate >= fiveYearsAgoStr) {
          events.push({
            date: sr.serviceDate,
            description: [sr.serviceType, sr.serviceDescription].filter(Boolean).join(" — "),
            source: "service_record",
            cost: sr.cost && Number(sr.cost) > 0 ? `$${sr.cost}` : undefined,
          });
        }
      }

      // Sort chronologically
      events.sort((a, b) => a.date.localeCompare(b.date));

      // Area-keyword pre-filter: prioritise records related to the selected claim area
      const AREA_KEYWORDS: Record<string, string[]> = {
        Roof:        ["roof", "shingle", "gutter", "flashing", "fascia", "soffit", "chimney"],
        HVAC:        ["hvac", "heat", "cool", "ac ", " ac", "furnace", "air condition", "duct", "thermostat", "filter", "boiler"],
        Plumbing:    ["plumb", "water", "pipe", "drain", "toilet", "faucet", "leak", "sewer", "septic"],
        Electrical:  ["electr", "wiring", "circuit", "panel", "outlet", "breaker", "lighting", "switch"],
        Foundation:  ["foundation", "structur", "crawl", "basement", "slab", "crack", "settlement"],
        Appliances:  ["appliance", "dishwasher", "refrigerator", "washer", "dryer", "stove", "oven", "microwave"],
        Interior:    ["interior", "wall", "floor", "ceiling", "drywall", "paint", "carpet", "tile", "window", "door"],
        Exterior:    ["exterior", "siding", "deck", "fence", "porch", "patio", "driveway", "walkway"],
        Garage:      ["garage", "opener"],
      };
      const areaKws = AREA_KEYWORDS[claimArea] ?? [];
      const matchesArea = (ev: EventEntry) => {
        if (areaKws.length === 0) return false; // "Other" — no pre-filter
        const text = ev.description.toLowerCase() + " " + (ev.area ?? "").toLowerCase();
        return areaKws.some(kw => text.includes(kw));
      };
      // Split into relevant-first, then general, capping total at 40
      const relevantEvents = events.filter(ev => matchesArea(ev));
      const generalEvents = events.filter(ev => !matchesArea(ev));
      const prioritisedEvents = [...relevantEvents, ...generalEvents].slice(0, 40);

      const currentYear = new Date().getFullYear();
      const houseAge = house.yearBuilt ? currentYear - house.yearBuilt : null;
      const houseAgeStr = houseAge !== null ? `${houseAge} years old (built ${house.yearBuilt})` : "age unknown";

      // Home systems relevant to this claim area (show all — AI will filter)
      const systemSummary = allHomeSystems.slice(0, 12).map(sys => {
        const parts = [sys.systemType];
        if (sys.installationYear) parts.push(`installed ${sys.installationYear}`);
        if (sys.brand) parts.push(sys.brand);
        return parts.join(", ");
      }).join("; ");

      // Format event list for the prompt (area-relevant records first)
      const eventLines = prioritisedEvents.map(e => {
        const parts = [`[${e.date}]`, e.source === "service_record" ? "(Contractor)" : "(Owner)", e.description];
        if (e.area) parts.push(`— Area: ${e.area}`);
        if (e.cost) parts.push(`— Cost: ${e.cost}`);
        return parts.join(" ");
      });

      const contextBlock = [
        `Property: ${house.address ?? "address not recorded"} — ${houseAgeStr}`,
        house.climateZone ? `Climate zone: ${house.climateZone}` : null,
        `Documented home systems: ${systemSummary || "none on file"}`,
        `Claim area: ${claimArea}`,
        incidentDescription ? `Incident description: ${incidentDescription}` : null,
        incidentDate ? `Approximate incident date: ${incidentDate}` : null,
        ``,
        `Maintenance & service records (last 5 years; ${relevantEvents.length} area-relevant, ${generalEvents.length} general — area-relevant shown first):`,
        eventLines.length > 0 ? eventLines.join("\n") : "No maintenance records on file.",
      ].filter(s => s !== null).join("\n");

      const prompt = `You are an expert insurance claim preparation advisor helping a homeowner document their case.

Property context:
${contextBlock}

The homeowner is preparing an insurance claim related to: ${claimArea}

Your job:
1. From the maintenance history, identify ALL records that are relevant evidence for a ${claimArea} claim. Include records that show: the area was maintained, prior condition, contractor work, costs paid, and any warranties.
2. Suggest 5–8 specific types of documents the homeowner should gather for this claim.
3. Write a concise, professional claim preparation memo (3–5 paragraphs) the homeowner can share with their insurance adjuster or attorney. It should summarize the property, the maintenance history relevant to the ${claimArea}, and why the records support the claim. Write in plain, confident language. Reference the evidence timeline.

Respond ONLY with valid JSON (no markdown, no code fences):
{
  "summary": "One sentence summary of claim readiness",
  "evidenceTimeline": [
    { "date": "YYYY-MM-DD", "description": "...", "source": "maintenance_log or service_record" }
  ],
  "documentsToGather": ["...", "..."],
  "claimMemo": "Full memo text here..."
}`;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 1500,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content ?? "{}";

      let parsed: {
        summary?: string;
        evidenceTimeline?: unknown;
        documentsToGather?: unknown;
        claimMemo?: string;
      };
      try {
        parsed = JSON.parse(raw);
      } catch {
        return res.status(500).json({ message: "Failed to parse AI response" });
      }

      interface TimelineItem { date: string; description: string; source: string }
      const evidenceTimeline: TimelineItem[] = Array.isArray(parsed.evidenceTimeline)
        ? (parsed.evidenceTimeline as unknown[]).filter((item): item is TimelineItem =>
            typeof item === "object" && item !== null &&
            typeof (item as Record<string, unknown>).date === "string" &&
            typeof (item as Record<string, unknown>).description === "string"
          ).slice(0, 20)
        : [];

      const documentsToGather: string[] = Array.isArray(parsed.documentsToGather)
        ? (parsed.documentsToGather as unknown[]).filter((s): s is string => typeof s === "string").slice(0, 10)
        : [];

      const summary = typeof parsed.summary === "string" && parsed.summary.length > 0
        ? parsed.summary
        : `Claim preparation package for ${claimArea} issue.`;

      const claimMemo = typeof parsed.claimMemo === "string" && parsed.claimMemo.length > 0
        ? parsed.claimMemo
        : "Please review the evidence timeline and documents list below.";

      // Save the generated package to the database
      const savedPackage = await storage.saveInsuranceClaimPackage({
        houseId,
        homeownerId,
        claimArea,
        incidentDescription: incidentDescription ?? null,
        incidentDate: incidentDate ?? null,
        summary,
        evidenceTimeline,
        documentsToGather,
        claimMemo,
        totalRecords: events.length,
      });

      res.json({
        id: savedPackage.id,
        claimArea,
        summary,
        evidenceTimeline,
        documentsToGather,
        claimMemo,
        meta: {
          totalRecords: events.length,
          houseAddress: house.address ?? null,
          houseAge: houseAge ?? null,
        },
      });
    } catch (error) {
      console.error("[AI INSURANCE PREP] Error:", error);
      res.status(500).json({ message: "Failed to generate insurance prep report" });
    }
  });

  // ===== INSURANCE PREP — EMAIL TO ADJUSTER =====
  app.post("/api/insurance-prep/send-email", isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const bodySchema = z.object({
        adjusterEmail: z.string().email(),
        claimArea: z.string().min(1).max(100),
        claimMemo: z.string().min(1).max(20000),
        evidenceTimeline: z.array(z.object({
          date: z.string(),
          description: z.string(),
          source: z.string(),
        })).max(50),
        documentsToGather: z.array(z.string().max(300)).max(20),
        houseAddress: z.string().nullable().optional(),
        ccSelf: z.boolean().optional(),
      });

      let body: z.infer<typeof bodySchema>;
      try {
        body = bodySchema.parse(req.body);
      } catch {
        return res.status(400).json({ message: "Invalid request body" });
      }

      const { adjusterEmail, claimArea, claimMemo, evidenceTimeline, documentsToGather, houseAddress, ccSelf } = body;

      let ccEmail: string | undefined;
      if (ccSelf) {
        const userId = req.session.user.id;
        const user = await storage.getUser(userId);
        ccEmail = user?.email ?? undefined;
      }

      const esc = (s: string) => s
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      const timelineRows = evidenceTimeline.map(e => {
        const sourceLabel = e.source === "service_record" ? "Contractor" : "Owner";
        return `<tr>
          <td style="padding:6px 10px; border-bottom:1px solid #e5e7eb; font-family:monospace; white-space:nowrap; color:#6b7280; font-size:13px;">${esc(e.date)}</td>
          <td style="padding:6px 10px; border-bottom:1px solid #e5e7eb; font-size:12px;">
            <span style="background:${e.source === "service_record" ? "#dbeafe" : "#ede9fe"}; color:${e.source === "service_record" ? "#1d4ed8" : "#7c3aed"}; padding:2px 6px; border-radius:4px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; font-size:10px;">${esc(sourceLabel)}</span>
          </td>
          <td style="padding:6px 10px; border-bottom:1px solid #e5e7eb; font-size:13px; color:#374151;">${esc(e.description)}</td>
        </tr>`;
      }).join("");

      const docsListHtml = documentsToGather.map((doc, i) =>
        `<li style="margin-bottom:6px; font-size:13px; color:#374151;">${i + 1}. ${esc(doc)}</li>`
      ).join("");

      const generatedDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

      const htmlBody = `
        <div style="font-family:Arial,sans-serif; max-width:640px; margin:0 auto; color:#111827;">
          <div style="background:#1e40af; padding:28px 30px; border-radius:8px 8px 0 0;">
            <p style="margin:0; color:#bfdbfe; font-size:12px; letter-spacing:0.08em; text-transform:uppercase; font-weight:600;">MyHomeBase™ Insurance Claim Prep</p>
            <h1 style="margin:8px 0 4px; color:#ffffff; font-size:22px; font-weight:700;">${esc(claimArea)} Claim Package</h1>
            ${houseAddress ? `<p style="margin:4px 0 0; color:#bfdbfe; font-size:13px;">Property: ${esc(houseAddress)}</p>` : ""}
            <p style="margin:6px 0 0; color:#bfdbfe; font-size:12px;">Generated ${esc(generatedDate)}</p>
          </div>

          <div style="background:#f9fafb; padding:24px 30px; border-left:1px solid #e5e7eb; border-right:1px solid #e5e7eb;">

            <!-- Claim Memo -->
            <h2 style="margin:0 0 12px; font-size:15px; font-weight:700; color:#1e40af; border-bottom:2px solid #dbeafe; padding-bottom:8px;">Claim Preparation Memo</h2>
            <div style="background:#ffffff; border:1px solid #e5e7eb; border-radius:6px; padding:16px; white-space:pre-wrap; font-size:13px; line-height:1.65; color:#374151;">
${esc(claimMemo)}
            </div>

            ${evidenceTimeline.length > 0 ? `
            <!-- Evidence Timeline -->
            <h2 style="margin:24px 0 12px; font-size:15px; font-weight:700; color:#1e40af; border-bottom:2px solid #dbeafe; padding-bottom:8px;">Evidence Timeline</h2>
            <table style="width:100%; border-collapse:collapse; background:#ffffff; border:1px solid #e5e7eb; border-radius:6px; overflow:hidden;">
              <thead>
                <tr style="background:#eff6ff;">
                  <th style="padding:8px 10px; text-align:left; font-size:11px; font-weight:700; color:#1e40af; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #dbeafe;">Date</th>
                  <th style="padding:8px 10px; text-align:left; font-size:11px; font-weight:700; color:#1e40af; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #dbeafe;">Source</th>
                  <th style="padding:8px 10px; text-align:left; font-size:11px; font-weight:700; color:#1e40af; text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #dbeafe;">Description</th>
                </tr>
              </thead>
              <tbody>${timelineRows}</tbody>
            </table>` : ""}

            ${documentsToGather.length > 0 ? `
            <!-- Documents to Gather -->
            <h2 style="margin:24px 0 12px; font-size:15px; font-weight:700; color:#92400e; border-bottom:2px solid #fde68a; padding-bottom:8px;">Documents to Gather</h2>
            <div style="background:#fffbeb; border:1px solid #fde68a; border-radius:6px; padding:16px;">
              <ul style="margin:0; padding-left:0; list-style:none;">${docsListHtml}</ul>
            </div>` : ""}

          </div>

          <div style="background:#1a1a2e; padding:20px 30px; border-radius:0 0 8px 8px; text-align:center;">
            <p style="color:#a78bfa; margin:0; font-size:12px;">Prepared by MyHomeBase™ · For informational purposes only. Consult your insurance policy and licensed adjuster.</p>
          </div>
        </div>
      `;

      const textBody = [
        `INSURANCE CLAIM PREP — ${claimArea}`,
        houseAddress ? `Property: ${houseAddress}` : "",
        `Generated by MyHomeBase™ · ${generatedDate}`,
        "",
        "CLAIM MEMO",
        "─".repeat(40),
        claimMemo,
        "",
        evidenceTimeline.length > 0 ? "EVIDENCE TIMELINE\n" + "─".repeat(40) : "",
        ...evidenceTimeline.map(e =>
          `${e.date}  [${e.source === "service_record" ? "Contractor" : "Owner"}]  ${e.description}`
        ),
        "",
        documentsToGather.length > 0 ? "DOCUMENTS TO GATHER\n" + "─".repeat(40) : "",
        ...documentsToGather.map((d, i) => `${i + 1}. ${d}`),
        "",
        "─".repeat(40),
        "Prepared by MyHomeBase™. For informational purposes only.",
      ].filter(s => s !== null && s !== undefined).join("\n");

      const sent = await sendEmail({
        to: adjusterEmail,
        subject: `Insurance Claim Package — ${claimArea}${houseAddress ? ` · ${houseAddress}` : ""}`,
        text: textBody,
        html: htmlBody,
        ...(ccEmail ? { cc: ccEmail } : {}),
      });

      if (!sent) {
        return res.status(503).json({ message: "Email service is not available. Please use Copy All or Print instead." });
      }

      // Persist the send record — required for history tracking
      await storage.createInsuranceEmailLog({
        homeownerId: req.session.user.id,
        adjusterEmail,
        claimArea,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("[INSURANCE PREP EMAIL] Error:", error);
      res.status(500).json({ message: "Failed to send email" });
    }
  });

  // List past insurance claim packages for a house
  app.get("/api/houses/:houseId/insurance-claim-packages", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const { houseId } = req.params;
      const homeownerId = req.session.user.id;
      const packages = await storage.getInsuranceClaimPackages(houseId, homeownerId);
      res.json(packages);
    } catch (error) {
      const msg = (error as any)?.cause?.message ?? (error as Error)?.message ?? "";
      if (msg.includes("insurance_claim_packages") || (error as any)?.cause?.code === "42P01") {
        return res.json([]);
      }
      console.error("[INSURANCE CLAIM PACKAGES] Error:", error);
      res.status(500).json({ message: "Failed to fetch claim packages" });
    }
  });

  // Fetch a specific past insurance claim package
  app.get("/api/houses/:houseId/insurance-claim-packages/:packageId", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const { packageId } = req.params;
      const homeownerId = req.session.user.id;
      const pkg = await storage.getInsuranceClaimPackage(packageId, homeownerId);
      if (!pkg) return res.status(404).json({ message: "Claim package not found" });
      res.json(pkg);
    } catch (error) {
      const msg = (error as any)?.cause?.message ?? (error as Error)?.message ?? "";
      if (msg.includes("insurance_claim_packages") || (error as any)?.cause?.code === "42P01") {
        return res.status(404).json({ message: "Claim package not found" });
      }
      console.error("[INSURANCE CLAIM PACKAGE] Error:", error);
      res.status(500).json({ message: "Failed to fetch claim package" });
    }
  });

  app.get("/api/insurance-prep/email-logs", isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const logs = await storage.getInsuranceEmailLogs(userId);
      res.json(logs);
    } catch (error) {
      console.error("[INSURANCE PREP EMAIL LOGS] Error:", error);
      res.status(500).json({ message: "Failed to fetch email logs" });
    }
  });

  // ===== AI CONTRACTOR MESSAGE DRAFTING =====
  app.post("/api/ai/draft-contractor-message", isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;

      const bodySchema = z.object({
        issueDescription: z.string().min(1).max(500),
        houseId: z.string().optional(),
        taskContext: z.string().optional(),
      });
      let parsed: z.infer<typeof bodySchema>;
      try {
        parsed = bodySchema.parse(req.body);
      } catch {
        return res.status(400).json({ message: "Invalid request body" });
      }
      const { issueDescription, houseId, taskContext } = parsed;

      // Build house context if a valid house is provided
      let houseContext = "";
      if (houseId) {
        const house = await storage.getHouse(houseId);
        if (house && house.homeownerId === userId) {
          const parts: string[] = [];
          if (house.yearBuilt) parts.push(`built in ${house.yearBuilt}`);
          if (house.address) parts.push(`located at ${house.address}`);
          const systems = (Array.isArray(house.homeSystems) ? house.homeSystems as string[] : []).slice(0, 5);
          if (systems.length > 0) parts.push(`home systems include: ${systems.join(', ')}`);
          if (parts.length > 0) houseContext = `Home details: ${parts.join('; ')}.`;
        }
      }

      const contextParts: string[] = [];
      if (taskContext) contextParts.push(`Maintenance task: ${taskContext}`);
      if (houseContext) contextParts.push(houseContext);
      contextParts.push(`Issue described by homeowner: ${issueDescription}`);

      const prompt = `You are helping a homeowner write a professional message to a contractor.

Context:
${contextParts.join('\n')}

Write a polite, clear, and specific message that the homeowner would send to a contractor. The message should:
- Be 3-5 sentences
- Describe the issue clearly using the homeowner's words
- Mention relevant home details (age, system type) when available
- Include a sense of urgency if the issue sounds urgent
- Close with a request for an estimate or appointment
- Sound like a real homeowner — not overly formal, not too casual
- Be under 150 words

Respond with ONLY the message text. No subject line, no greeting prefix like "Here is your draft:", no extra commentary.`;

      const openai = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        max_tokens: 300,
      });

      const message = completion.choices[0]?.message?.content?.trim() || "I noticed an issue at my home and would like to discuss it with you. Please let me know your availability for an estimate or appointment.";
      res.json({ message });
    } catch (error) {
      console.error("[AI DRAFT MESSAGE] Error:", error);
      res.status(500).json({ message: "Failed to generate message draft" });
    }
  });

  // Contractor subscription endpoint
  app.get('/api/contractor/subscription', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Not a contractor account' });
      }
      
      // Demo contractor accounts get full Pro access - never expires
      // Check for demo-contractor prefix to catch all demo contractor accounts
      if (userId.startsWith('demo-contractor') || user.email?.includes('demo@contractor') || user.email?.includes('precisionhvac')) {
        return res.json({
          hasActiveSubscription: true,
          needsSubscription: false,
          isInTrial: false,
          trialExpired: false,
          trialDaysRemaining: 0,
          trialEndsAt: null,
          currentPlan: 'pro',
          hasCrmAccess: true,
          subscriptionStatus: 'active',
          monthlyPrice: 0,
          features: ['Lead management', 'Client management', 'Job scheduling', 'Quotes and invoices', 'Dashboard analytics', 'Referral program'],
          planName: 'Pro (Demo Account)',
          tierName: 'contractor_pro',
          isDemoAccount: true,
        });
      }
      
      // Check if user is grandfathered (free Pro access forever)
      const grandfatheredEmails = (process.env.GRANDFATHERED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const isGrandfathered = user.email && grandfatheredEmails.includes(user.email.toLowerCase());
      
      // Get subscription plan details if subscribed
      let planDetails = null;
      if (user.subscriptionPlanId) {
        planDetails = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.subscriptionPlanId)).limit(1);
      }
      
      const plan = planDetails?.[0];
      
      // Grandfathered users get full Pro access without subscription
      if (isGrandfathered) {
        return res.json({
          hasActiveSubscription: true,
          needsSubscription: false,
          isInTrial: false,
          trialExpired: false,
          trialDaysRemaining: 0,
          trialEndsAt: null,
          currentPlan: 'pro',
          hasCrmAccess: true,
          subscriptionStatus: 'grandfathered',
          monthlyPrice: 0,
          features: ['Lead management', 'Client management', 'Job scheduling', 'Quotes and invoices', 'Dashboard analytics', 'Referral program'],
          planName: 'Pro (Grandfathered)',
          tierName: 'contractor_pro',
          isGrandfathered: true,
        });
      }
      
      // Calculate trial status - use trialEndsAt if set, otherwise createdAt + 14 days
      const now = new Date();
      let effectiveTrialEndsAt: Date | null = null;
      if (user.trialEndsAt) {
        effectiveTrialEndsAt = new Date(user.trialEndsAt);
      } else if (user.createdAt) {
        // For older accounts without trialEndsAt, calculate based on account creation + 14 days
        effectiveTrialEndsAt = new Date(new Date(user.createdAt).getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      
      const isInTrial = user.subscriptionStatus === 'trialing' && effectiveTrialEndsAt && effectiveTrialEndsAt > now;
      // Trial is expired if: has end date that's passed, OR is trialing without an end date (treat as expired)
      const trialExpired = user.subscriptionStatus === 'trialing' && (!effectiveTrialEndsAt || effectiveTrialEndsAt <= now);
      const trialDaysRemaining = effectiveTrialEndsAt && effectiveTrialEndsAt > now 
        ? Math.ceil((effectiveTrialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      // Has active access if: paid subscription active (any tier), OR still in trial period
      const PAID_STATUSES = ['active', 'contractor_business', 'contractor_enterprise'];
      const hasActiveSubscription = PAID_STATUSES.includes(user.subscriptionStatus ?? '') || !!isInTrial;

      // If trial expired and no paid subscription, they need to pay - contractors have NO free features after trial
      const needsSubscription = trialExpired || (user.subscriptionStatus === 'inactive' && !isInTrial);

      // Determine current plan tier
      let currentPlan: 'none' | 'basic' | 'pro' | 'business' | 'enterprise' = 'none';
      if (plan) {
        if (plan.tierName === 'contractor_enterprise') currentPlan = 'enterprise';
        else if (plan.tierName === 'contractor_business') currentPlan = 'business';
        else if (plan.tierName === 'contractor_pro') currentPlan = 'pro';
        else if (plan.tierName === 'contractor_basic' || plan.tierName === 'contractor') currentPlan = 'basic';
      }

      // Phase 3.5: Fetch company-level Scale-Up fields if contractor belongs to a company
      let companyData: any = null;
      let divisionCount = 0;
      if (user.companyId) {
        const [co] = await db.select().from(companies).where(eq(companies.id, user.companyId)).limit(1);
        companyData = co ?? null;
        if (companyData) {
          const [{ cnt }] = await db.select({ cnt: drizzleSql<number>`cast(count(*) as int)` }).from(companyDivisions).where(eq(companyDivisions.companyId, user.companyId));
          divisionCount = cnt ?? 0;
        }
      }

      // Seat counts (tech + admin, excluding removed)
      let currentTechCount = 0;
      let currentAdminCount = 0;
      if (user.companyId) {
        const seats = await db.select({ role: users.companyRole })
          .from(users)
          .where(and(eq(users.companyId, user.companyId), inArray(users.companyRole as any, ['tech', 'admin']), ne(users.status as any, 'removed')));
        currentTechCount = seats.filter(s => s.role === 'tech').length;
        currentAdminCount = seats.filter(s => s.role === 'admin').length;
      }

      const includedTechSeats = plan?.includedTechSeats ?? null;
      const additionalSeatPrice = plan?.additionalSeatPrice ? parseFloat(plan.additionalSeatPrice as string) : null;

      res.json({
        hasActiveSubscription,
        needsSubscription,
        isInTrial,
        trialExpired,
        trialDaysRemaining,
        trialEndsAt: effectiveTrialEndsAt?.toISOString() || null,
        currentPlan,
        hasCrmAccess: plan?.hasCrmAccess ?? false,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        monthlyPrice: plan ? parseFloat(plan.monthlyPrice as string) : 0,
        features: plan?.features ?? [],
        planName: plan?.displayName ?? 'No Plan',
        tierName: plan?.tierName ?? null,
        // Phase 3.5 — Scale-Up fields
        companyTier: companyData?.tier ?? null,
        seatInfo: {
          includedTechSeats,
          additionalSeatPrice,
          currentTechCount,
          currentAdminCount,
          maxTechSeats: companyData?.maxTechSeats ?? null,
          maxAdminSeats: companyData?.maxAdminSeats ?? null,
          maxManagerSeats: companyData?.maxManagerSeats ?? null,
          maxDispatcherSeats: companyData?.maxDispatcherSeats ?? null,
        },
        divisionCount,
        ssoEnabled: companyData?.ssoEnabled ?? false,
        bulkImportEnabled: companyData?.bulkImportEnabled ?? false,
        apiAccessEnabled: companyData?.apiAccessEnabled ?? false,
      });
    } catch (error) {
      console.error('Error fetching contractor subscription:', error);
      res.status(500).json({ message: 'Failed to fetch subscription' });
    }
  });

  // Send checkout failure recovery email so contractors can retry from their inbox
  app.post('/api/contractor/resend-checkout-email', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const plan = (req.body.plan as string) ?? 'basic';
      const baseUrl = (req.headers.origin as string) || `https://${req.headers.host}`;
      const checkoutUrl = `${baseUrl}/contractor/checkout?plan=${plan}&onboarding=true`;
      const userName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || user.email || 'there';

      sendCheckoutFailureEmail(userId, userName, plan, checkoutUrl).catch((err) => {
        req.log.warn({ err }, 'checkout-failure email send failed (non-fatal)');
      });

      return res.json({ sent: true });
    } catch (error: any) {
      req.log.error({ err: error }, 'Failed to dispatch checkout failure email');
      return res.status(500).json({ message: 'Failed to send email' });
    }
  });

  // Phase 6 — Preview upgrade cost breakdown (Business tier per-seat pricing)
  app.post('/api/contractor/subscription/preview-upgrade', isAuthenticated, async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const user = await storage.getUser(req.session.user.id);
      if (!user) return res.status(401).json({ message: 'User not found' });

      const { targetTier, totalSeats } = req.body as { targetTier?: string; totalSeats?: number };
      const seats = Math.max(1, parseInt(String(totalSeats ?? 1)) || 1);

      if (targetTier === 'contractor_business' || !targetTier) {
        const BASE_PRICE = 60;          // $60/mo base covers up to 5 members
        const PER_SEAT_PRICE = 8;       // $8/seat/mo beyond 5
        const INCLUDED_SEATS = 5;
        const additionalSeats = Math.max(0, seats - INCLUDED_SEATS);
        const additionalCost = additionalSeats * PER_SEAT_PRICE;
        const monthlyTotal = BASE_PRICE + additionalCost;
        return res.json({
          tier: 'contractor_business',
          totalSeats: seats,
          includedSeats: INCLUDED_SEATS,
          additionalSeats,
          basePriceMonthly: BASE_PRICE,
          perSeatPriceMonthly: PER_SEAT_PRICE,
          additionalCostMonthly: additionalCost,
          monthlyTotal,
          breakdown: `$${BASE_PRICE}/mo base + ${additionalSeats} extra seat${additionalSeats !== 1 ? 's' : ''} × $${PER_SEAT_PRICE} = $${monthlyTotal}/mo`,
        });
      }

      if (targetTier === 'contractor_enterprise') {
        return res.json({
          tier: 'contractor_enterprise',
          totalSeats: seats,
          monthlyTotal: null,
          breakdown: 'Enterprise pricing is custom. Our team will reach out within 1 business day.',
          contactRequired: true,
        });
      }

      return res.status(400).json({ message: 'Unsupported target tier' });
    } catch (error) {
      req.log?.error({ error }, '[PHASE6] Error previewing upgrade');
      res.status(500).json({ message: 'Failed to preview upgrade' });
    }
  });

  // Phase 6 — Stripe Customer Portal (self-service billing management)
  app.get('/api/contractor/billing/portal', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      if (!stripe) return res.status(503).json({ message: 'Billing not configured' });

      const user = await storage.getUser(req.session.user.id);
      if (!user?.stripeCustomerId) {
        return res.status(400).json({ message: 'No billing account found. Subscribe to a plan first.' });
      }

      const returnUrl = req.query.returnUrl as string || `${process.env.APP_URL || ''}/contractor`;
      const session = await stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      res.json({ url: session.url });
    } catch (error) {
      req.log?.error({ error }, '[PHASE6] Error creating billing portal session');
      res.status(500).json({ message: 'Failed to open billing portal' });
    }
  });

  // Contractor home management routes 
  app.get('/api/contractor/my-home', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houses = await storage.getHouses(contractorId);
      res.json(houses);
    } catch (error) {
      console.error("Error fetching contractor houses:", error);
      res.status(500).json({ message: "Failed to fetch houses" });
    }
  });

  app.post('/api/contractor/my-home', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      
      // CRITICAL SECURITY: Enforce 1-home limit for contractors
      const existingHouses = await storage.getHouses(contractorId);
      if (existingHouses.length >= 1) {
        return res.status(403).json({ 
          message: "Property limit reached. Contractors can track maintenance for one personal property.",
          code: "CONTRACTOR_LIMIT_EXCEEDED"
        });
      }
      
      const houseData = insertHouseSchema.parse({
        ...req.body,
        homeownerId: contractorId
      });

      const house = await storage.createHouse(houseData);
      res.status(201).json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid house data", errors: error.issues });
      }
      console.error("Error creating contractor house:", error);
      res.status(500).json({ message: "Failed to create house" });
    }
  });

  app.patch('/api/contractor/my-home/:houseId', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houseId = req.params.houseId;

      // Check if house belongs to contractor
      const existingHouse = await storage.getHouse(houseId);
      if (!existingHouse || existingHouse.homeownerId !== contractorId) {
        return res.status(404).json({ message: "House not found or not owned by you" });
      }

      // Strip homeownerId from request body to prevent ownership transfer
      const { homeownerId, ...safeRequestData } = req.body;
      const partialData = insertHouseSchema.partial().parse(safeRequestData);
      const house = await storage.updateHouse(houseId, partialData);
      res.json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid house data", errors: error.issues });
      }
      console.error("Error updating contractor house:", error);
      res.status(500).json({ message: "Failed to update house" });
    }
  });

  app.delete('/api/contractor/my-home/:houseId', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houseId = req.params.houseId;

      // Check if house belongs to contractor
      const existingHouse = await storage.getHouse(houseId);
      if (!existingHouse || existingHouse.homeownerId !== contractorId) {
        return res.status(404).json({ message: "House not found or not owned by you" });
      }

      const success = await storage.deleteHouse(houseId);
      if (!success) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contractor house:", error);
      res.status(500).json({ message: "Failed to delete house" });
    }
  });

  app.get('/api/contractor/my-home/tasks', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houseId = req.query.houseId as string;

      if (!houseId) {
        return res.status(400).json({ message: "houseId is required" });
      }

      // Check if house belongs to contractor
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== contractorId) {
        return res.status(404).json({ message: "House not found or not owned by you" });
      }

      // Get maintenance tasks for current month based on house climate zone
      const currentMonth = new Date().getMonth() + 1;
      const { getCurrentMonthTasks, getRegionFromClimateZone } = await import('../shared/location-maintenance-data');
      
      const region = getRegionFromClimateZone(house.climateZone);
      const tasks = getCurrentMonthTasks(region, currentMonth);

      res.json({
        house,
        currentMonth: new Date().toLocaleString('default', { month: 'long' }),
        region,
        tasks: tasks || {
          seasonal: [],
          weatherSpecific: [],
          priority: 'medium'
        }
      });
    } catch (error) {
      console.error("Error fetching maintenance tasks:", error);
      res.status(500).json({ message: "Failed to fetch maintenance tasks" });
    }
  });

  // Contractor profile routes
  app.get('/api/contractor/profile', requireContractorSubscription, async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const profile = await storage.getContractorProfile(contractorId);
      
      if (!profile) {
        // Return default profile structure
        return res.json({
          businessName: '',
          contactName: req.session.user.firstName || '',
          email: req.session.user.email || '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          licenseNumber: '',
          licenseState: '',
          licenseExpiry: '',
          insuranceProvider: '',
          insurancePolicy: '',
          insuranceExpiry: '',
          servicesOffered: [],
          website: '',
          facebook: '',
          instagram: '',
          linkedin: '',
          bio: '',
          yearsExperience: '',
          profileImage: '',
          businessLogo: '',
          projectPhotos: []
        });
      }

      // CRITICAL FIX: Merge company data into profile response for persistence
      // Profile (contractors table) is source of truth for business info (name, phone, email, address)
      // Company table is source of truth for company-specific fields (bio, experience, photos, services)
      let profileWithCompanyData = { ...profile };
      if ((profile as any).companyId) {
        const company = await storage.getCompany((profile as any).companyId);
        if (company) {
          profileWithCompanyData = {
            ...profile,
            // Business Information: PROFILE takes precedence (contractors table is source of truth)
            company: (profile as any).company || company.name || '',
            name: (profile as any).name || '',
            address: (profile as any).address || company.address || '',
            city: (profile as any).city || company.city || '',
            state: (profile as any).state || company.state || '',
            postalCode: (profile as any).postalCode || company.postalCode || '',
            phone: (profile as any).phone || company.phone || '',
            email: (profile as any).email || company.email || '',
            // Company-specific fields: COMPANY takes precedence
            serviceRadius: company.serviceRadius || (profile as any).serviceRadius || 25,
            services: (company.services && company.services.length > 0) ? company.services : ((profile as any).services || []),
            hasEmergencyServices: company.hasEmergencyServices || (profile as any).hasEmergencyServices || false,
            bio: company.bio || (profile as any).bio || '',
            experience: company.experience || (profile as any).experience || 0,
            // Social links from company
            website: company.website || (profile as any).website || '',
            facebook: company.facebook || (profile as any).facebook || '',
            instagram: company.instagram || (profile as any).instagram || '',
            linkedin: company.linkedin || (profile as any).linkedin || '',
            googleBusinessUrl: company.googleBusinessUrl || (profile as any).googleBusinessUrl || '',
            // Photos from company
            businessLogo: company.businessLogo || '',
            projectPhotos: company.projectPhotos || []
          };
        }
      }

      res.json(profileWithCompanyData);
    } catch (error) {
      console.error("Error fetching contractor profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/contractor/profile', requireContractorSubscription, async (req: any, res: any) => {
    try {
      console.log('[DEBUG] PUT /api/contractor/profile - Session:', {
        isAuthenticated: req.session?.isAuthenticated,
        role: req.session?.user?.role,
        userId: req.session?.user?.id,
        companyId: req.session?.user?.companyId
      });
      
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        console.log('[DEBUG] Unauthorized - session check failed');
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const profileData = req.body;
      
      console.log('[DEBUG] Updating contractor profile:', contractorId, 'with data keys:', Object.keys(profileData));

      // AUTO-CREATE COMPANY: If contractor has no company, create one automatically
      let currentUser = await storage.getUser(contractorId);
      if (currentUser && !currentUser.companyId) {
        console.log('[DEBUG] Contractor has no company - auto-creating one...');
        
        // Create company with data from profile
        const companyName = profileData.company || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'My Company';
        const newCompany = await storage.createCompany({
          name: companyName,
          ownerId: contractorId,
          email: currentUser.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          address: profileData.address || '',
          postalCode: profileData.postalCode || '',
          website: profileData.website || '',
          bio: profileData.bio || '',
          services: profileData.services || [],
          serviceRadius: profileData.serviceRadius || 25,
          hasEmergencyServices: profileData.hasEmergencyServices || false,
          licenseNumber: profileData.licenseNumber || '',
          licenseMunicipality: profileData.licenseMunicipality || '',
        });
        
        console.log('[DEBUG] Auto-created company:', newCompany.id, newCompany.name);
        
        // Link company to user
        currentUser = await storage.upsertUser({
          ...currentUser,
          companyId: newCompany.id,
          companyRole: 'owner',
        });
        
        // Update session with new companyId
        req.session.user = currentUser;
        req.session.save((err: any) => {
          if (err) console.error('[DEBUG] Failed to save session after company creation:', err);
        });
        
        console.log('[DEBUG] Linked company to user, companyId:', newCompany.id);
      }

      const updatedProfile = await storage.updateContractorProfile(contractorId, profileData);
      req.log?.info({ contractorId, teamSizeRange: profileData.teamSizeRange }, '[ONBOARDING] Profile updated');

      // Phase 5: Enterprise lead notification for 100+ team size selection
      if (profileData.teamSizeRange === '100_plus') {
        const adminEmailsRaw = process.env.ADMIN_EMAILS || '';
        const adminEmails = adminEmailsRaw.split(',').map((e: string) => e.trim()).filter(Boolean);
        if (adminEmails.length > 0) {
          try {
            const contractorEmail = currentUser?.email || '';
            const contractorName = profileData.name as string || [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ') || contractorEmail;
            const companyName = profileData.company as string || 'Unknown';
            await sendEmail({
              to: adminEmails[0],
              subject: `[Enterprise Lead] ${companyName} — 100+ team size`,
              text: `New enterprise contractor lead:\n\nName: ${contractorName}\nEmail: ${contractorEmail}\nCompany: ${companyName}\nTeam size: 100+\n\nFollow up within 1 business day.`,
              html: `<p><strong>New enterprise contractor lead</strong></p><p>Name: ${contractorName}<br>Email: ${contractorEmail}<br>Company: ${companyName}<br>Team size: 100+</p><p>Follow up within 1 business day.</p>`,
            });
            req.log?.info({ contractorEmail, companyName }, '[ONBOARDING] Enterprise lead email sent');
          } catch (emailErr) {
            req.log?.warn({ emailErr }, '[ONBOARDING] Failed to send enterprise lead email');
          }
        }
      }

      // Return the profile with companyId so frontend can update
      res.json({ ...updatedProfile, companyId: currentUser?.companyId });
    } catch (error) {
      console.error("[ERROR] Error updating contractor profile:", error);
      console.error("[ERROR] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to update profile", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Contractor licenses routes
  app.get('/api/contractor/licenses', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const licenses = await storage.getContractorLicenses(contractorId);
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching contractor licenses:", error);
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.post('/api/contractor/licenses', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const licenseData = { ...req.body, contractorId };
      const newLicense = await storage.createContractorLicense(licenseData);
      res.json(newLicense);
    } catch (error) {
      console.error("Error creating contractor license:", error);
      res.status(500).json({ message: "Failed to create license" });
    }
  });

  app.put('/api/contractor/licenses/:id', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const licenseId = req.params.id;
      const contractorId = req.session.user.id;
      const licenseData = req.body;
      
      const updatedLicense = await storage.updateContractorLicense(licenseId, contractorId, licenseData);
      if (!updatedLicense) {
        return res.status(404).json({ message: "License not found" });
      }
      
      res.json(updatedLicense);
    } catch (error) {
      console.error("Error updating contractor license:", error);
      res.status(500).json({ message: "Failed to update license" });
    }
  });

  app.delete('/api/contractor/licenses/:id', async (req: any, res: any) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const licenseId = req.params.id;
      const contractorId = req.session.user.id;
      
      const success = await storage.deleteContractorLicense(licenseId, contractorId);
      if (!success) {
        return res.status(404).json({ message: "License not found" });
      }
      
      res.json({ message: "License deleted successfully" });
    } catch (error) {
      console.error("Error deleting contractor license:", error);
      res.status(500).json({ message: "Failed to delete license" });
    }
  });

  // Service records routes - PAID FEATURE
  app.get('/api/service-records', isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const houseId = req.query.houseId as string;
      
      // For contractors, fetch their service records
      if (userRole === 'contractor') {
        const serviceRecords = await storage.getServiceRecords(userId);
        res.json(serviceRecords);
      } 
      // For homeowners, fetch service records filtered by house
      else {
        // If houseId is provided, verify it belongs to the user
        if (houseId) {
          const house = await storage.getHouse(houseId);
          if (!house || house.homeownerId !== userId) {
            return res.status(403).json({ message: "Access denied to house" });
          }
        }
        
        const serviceRecords = await storage.getServiceRecordsByHomeowner(userId, houseId);
        res.json(serviceRecords);
      }
    } catch (error) {
      console.error("Error fetching service records:", error);
      res.status(500).json({ message: "Failed to fetch service records" });
    }
  });

  app.get('/api/service-records/:id', isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const serviceRecord = await storage.getServiceRecord(id);
      if (!serviceRecord) {
        return res.status(404).json({ message: "Service record not found" });
      }
      res.json(serviceRecord);
    } catch (error) {
      console.error("Error fetching service record:", error);
      res.status(500).json({ message: "Failed to fetch service record" });
    }
  });

  app.post('/api/service-records', isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const contractorId = req.session.user.id;
      const serviceRecordData = {
        ...req.body,
        contractorId,
      };
      const serviceRecord = await storage.createServiceRecord(serviceRecordData);
      
      // Check for homeowner achievements if there's cost savings
      let newAchievements: any[] = [];
      if (serviceRecordData.homeownerId && serviceRecordData.cost) {
        try {
          newAchievements = await storage.checkAndAwardAchievements(serviceRecordData.homeownerId);
        } catch (error) {
          console.error("Error checking achievements:", error);
          // Don't fail the request if achievement check fails
        }
      }
      
      res.json({ serviceRecord, newAchievements });
    } catch (error) {
      console.error("Error creating service record:", error);
      res.status(500).json({ message: "Failed to create service record" });
    }
  });

  app.put('/api/service-records/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const serviceRecord = await storage.updateServiceRecord(id, req.body);
      if (!serviceRecord) {
        return res.status(404).json({ message: "Service record not found" });
      }
      
      // Check for homeowner achievements if cost was updated
      let newAchievements: any[] = [];
      if (serviceRecord.homeownerId && req.body.cost) {
        try {
          newAchievements = await storage.checkAndAwardAchievements(serviceRecord.homeownerId);
        } catch (error) {
          console.error("Error checking achievements:", error);
          // Don't fail the request if achievement check fails
        }
      }
      
      res.json({ serviceRecord, newAchievements });
    } catch (error) {
      console.error("Error updating service record:", error);
      res.status(500).json({ message: "Failed to update service record" });
    }
  });

  app.delete('/api/service-records/:id', isAuthenticated, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteServiceRecord(id);
      if (!deleted) {
        return res.status(404).json({ message: "Service record not found" });
      }
      res.json({ message: "Service record deleted successfully" });
    } catch (error) {
      console.error("Error deleting service record:", error);
      res.status(500).json({ message: "Failed to delete service record" });
    }
  });

  // Homeowner service records endpoint
  app.get('/api/homeowner-service-records', isAuthenticated, async (req: any, res: any) => {
    try {
      const homeownerId = req.session.user.id;
      const serviceRecords = await storage.getHomeownerServiceRecords(homeownerId);
      
      // Enrich with contractor details
      const enrichedRecords = await Promise.all(
        serviceRecords.map(async (record) => {
          const contractor = await storage.getContractor(record.contractorId);
          return {
            ...record,
            contractorName: contractor?.name || 'Unknown Contractor',
            contractorCompany: contractor?.company || 'Unknown Company',
            contractorPhone: contractor?.phone || null,
            contractorEmail: contractor?.email || null
          };
        })
      );
      
      res.json(enrichedRecords);
    } catch (error) {
      console.error("Error fetching homeowner service records:", error);
      res.status(500).json({ message: "Failed to fetch service records" });
    }
  });

  // Customer service records routes
  app.get('/api/customer-service-records', isAuthenticated, async (req: any, res: any) => {
    try {
      const customerId = req.session.user.id;
      const customerEmail = req.session.user.email;
      
      // Get service records for this customer
      const serviceRecords = await storage.getCustomerServiceRecords(customerId, customerEmail);
      res.json(serviceRecords);
    } catch (error) {
      console.error("Error fetching customer service records:", error);
      res.status(500).json({ message: "Failed to fetch service records" });
    }
  });

  // Permanent connection code routes (attached to user account)
  app.get('/api/permanent-connection-code', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Only homeowners can view their permanent connection code
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view connection codes" });
      }
      
      const code = await storage.getOrCreatePermanentConnectionCode(userId);
      res.json({ code });
    } catch (error) {
      console.error("Error fetching permanent connection code:", error);
      res.status(500).json({ message: "Failed to fetch connection code" });
    }
  });

  app.post('/api/permanent-connection-code/regenerate', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Only homeowners can regenerate their connection code
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can regenerate connection codes" });
      }
      
      const code = await storage.regeneratePermanentConnectionCode(userId);
      res.json({ code });
    } catch (error) {
      console.error("Error regenerating connection code:", error);
      res.status(500).json({ message: "Failed to regenerate connection code" });
    }
  });

  app.post('/api/permanent-connection-code/validate', isAuthenticated, authLimiter, async (req: any, res: any) => {
    try {
      const userRole = req.session.user.role;
      
      // Only contractors can validate connection codes
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can validate connection codes" });
      }
      
      // Validate request body
      const validationSchema = z.object({
        code: z.string().length(8).regex(/^[A-Z0-9]+$/, "Code must be 8 uppercase alphanumeric characters"),
      });
      
      const validated = validationSchema.parse(req.body);
      const { code } = validated;
      
      const result = await storage.validatePermanentConnectionCode(code);
      
      if (!result) {
        return res.status(400).json({ message: "Invalid connection code" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error validating connection code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid code format", errors: error.issues });
      }
      res.status(500).json({ message: "Failed to validate connection code" });
    }
  });

  // Get count of unclaimed linked invoices (unreviewed by homeowner)
  app.get('/api/homeowner/linked-invoices/unclaimed-count', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view linked invoice counts" });
      }

      const invoices = await storage.getLinkedInvoicesForHomeowner(userId);
      const serviceRecords = await storage.getServiceRecordsByHomeowner(userId);

      const unclaimedCount = invoices.filter(inv => {
        const isClaimed = serviceRecords.some(r => r.notes?.includes(inv.invoiceNumber));
        const isViewed = inv.viewedAt != null;
        return !isClaimed && !isViewed;
      }).length;

      res.json({ count: unclaimedCount });
    } catch (error) {
      console.error("Error fetching unclaimed invoice count:", error);
      res.status(500).json({ message: "Failed to fetch unclaimed invoice count" });
    }
  });

  // Mark all linked invoices as viewed for the homeowner (bulk)
  app.post('/api/homeowner/linked-invoices/mark-all-viewed', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can mark invoices as viewed" });
      }

      await storage.markAllInvoicesViewed(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all invoices as viewed:", error);
      res.status(500).json({ message: "Failed to mark invoices as viewed" });
    }
  });

  // Mark a linked invoice as viewed by the homeowner
  app.patch('/api/homeowner/linked-invoices/:id/mark-viewed', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { id } = req.params;

      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can mark invoices as viewed" });
      }

      const ok = await storage.markInvoiceViewed(id, userId);
      if (!ok) {
        return res.status(404).json({ message: "Invoice not found or not linked to your account" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error marking invoice as viewed:", error);
      res.status(500).json({ message: "Failed to mark invoice as viewed" });
    }
  });

  // Get invoices linked to the authenticated homeowner via connection code
  app.get('/api/homeowner/linked-invoices', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view linked invoices" });
      }

      const invoices = await storage.getLinkedInvoicesForHomeowner(userId);

      // Enrich with contractor/company names
      const enriched = await Promise.all(invoices.map(async (inv) => {
        const contractor = await storage.getUser(inv.contractorUserId);
        const company = inv.companyId ? await storage.getCompany(inv.companyId) : null;
        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          title: inv.title,
          status: inv.status,
          total: inv.total,
          amountDue: inv.amountDue,
          dueDate: inv.dueDate,
          createdAt: inv.createdAt,
          houseId: inv.houseId,
          contractorName: contractor?.firstName && contractor?.lastName
            ? `${contractor.firstName} ${contractor.lastName}`
            : contractor?.email || 'Contractor',
          companyName: company?.name || null,
        };
      }));

      res.json(enriched);
    } catch (error) {
      console.error("Error fetching linked invoices:", error);
      res.status(500).json({ message: "Failed to fetch linked invoices" });
    }
  });

  // Claim a linked invoice into the homeowner's home history as a service record
  app.post('/api/claim-invoice/:invoiceId', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { invoiceId } = req.params;
      const { houseId } = req.body;

      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can claim invoices" });
      }

      if (!houseId) {
        return res.status(400).json({ message: "houseId is required" });
      }

      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (invoice.homeownerId !== userId) {
        return res.status(403).json({ message: "This invoice is not linked to your account" });
      }

      // Idempotency: check if already claimed (service record with same invoice number exists)
      const existingRecords = await storage.getServiceRecordsByHomeowner(userId, houseId);
      const alreadyClaimed = existingRecords.some(r => r.notes?.includes(invoice.invoiceNumber));
      if (alreadyClaimed) {
        return res.status(200).json({ message: "Invoice already saved to your home history" });
      }

      // Verify the house belongs to this homeowner
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== userId) {
        return res.status(403).json({ message: "House not found or does not belong to you" });
      }

      const contractor = await storage.getUser(invoice.contractorUserId);
      const company = invoice.companyId ? await storage.getCompany(invoice.companyId) : null;
      const contractorName = company?.name
        || (contractor?.firstName && contractor?.lastName
          ? `${contractor.firstName} ${contractor.lastName}`
          : contractor?.email || 'Contractor');

      // Create a service record from the invoice
      type LineItem = { description?: string; quantity?: number; unitPrice?: number; total?: number };
      const lineItems: LineItem[] = Array.isArray(invoice.lineItems)
        ? (invoice.lineItems as unknown as LineItem[])
        : [];
      const serviceDescription = lineItems.length > 0
        ? lineItems.map(li => li.description).filter((d): d is string => typeof d === 'string').join(', ')
        : (invoice.description || invoice.title);

      const serviceRecord = await storage.createServiceRecord({
        contractorId: invoice.contractorUserId,
        homeownerId: userId,
        houseId,
        customerName: '',
        customerAddress: house.address || '',
        customerPhone: '',
        customerEmail: '',
        serviceType: invoice.title,
        serviceDescription,
        homeArea: '',
        serviceDate: invoice.paidAt ? invoice.paidAt.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        duration: '',
        cost: String(parseFloat(invoice.total) || 0),
        status: 'completed',
        notes: `Claimed from invoice ${invoice.invoiceNumber} (${contractorName})`,
        materialsUsed: [],
        warrantyPeriod: '',
        followUpDate: '',
      });

      res.status(201).json({ serviceRecord, message: "Invoice saved to your home history" });
    } catch (error) {
      console.error("Error claiming invoice:", error);
      res.status(500).json({ message: "Failed to claim invoice" });
    }
  });

  // Get referring agent for homeowner
  app.get('/api/referring-agent', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Only homeowners can view their referring agent
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view referring agent information" });
      }
      
      const referringAgent = await storage.getReferringAgentForHomeowner(userId);
      
      if (!referringAgent) {
        return res.status(404).json({ message: "No referring agent found" });
      }
      
      res.json(referringAgent);
    } catch (error) {
      console.error("Error fetching referring agent:", error);
      res.status(500).json({ message: "Failed to fetch referring agent information" });
    }
  });

  // Messaging API endpoints
  app.get('/api/conversations', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      const conversations = await storage.getConversations(userId, userType);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/contractors/:contractorId/contacted-homeowners', isAuthenticated, async (req: any, res: any) => {
    try {
      const contractorId = req.params.contractorId;
      const userId = req.session.user.id;
      
      // Verify the requesting user is the contractor whose list is being accessed
      if (userId !== contractorId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const homeowners = await storage.getContactedHomeowners(contractorId);
      res.json(homeowners);
    } catch (error) {
      console.error("Error fetching contacted homeowners:", error);
      res.status(500).json({ message: "Failed to fetch contacted homeowners" });
    }
  });

  app.get('/api/conversations/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType === 'homeowner' && conversation.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (userType === 'contractor' && conversation.contractorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post('/api/conversations', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        [userType === 'homeowner' ? 'homeownerId' : 'contractorId']: userId
      });
      
      // Check if conversation already exists between these parties
      const existingConversations = await storage.getConversations(userId, userType);
      const otherPartyId = userType === 'homeowner' ? conversationData.contractorId : conversationData.homeownerId;
      const existing = existingConversations.find(conv => 
        userType === 'homeowner' ? conv.contractorId === otherPartyId : conv.homeownerId === otherPartyId
      );
      
      if (existing) {
        return res.json(existing);
      }
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversation data", errors: error.issues });
      }
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Bulk message sending - create conversations with multiple contractors
  app.post('/api/conversations/bulk', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can send bulk messages" });
      }

      const { subject, message, contractorIds } = req.body;
      
      if (!subject || !message || !contractorIds || !Array.isArray(contractorIds) || contractorIds.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const createdConversations = [];
      
      // Create a conversation with each contractor
      for (const contractorId of contractorIds) {
        // Check if conversation already exists
        const existingConversations = await storage.getConversations(userId, userType);
        const existing = existingConversations.find(conv => conv.contractorId === contractorId);
        
        let conversation;
        if (existing) {
          conversation = existing;
        } else {
          // Create new conversation
          const conversationData = insertConversationSchema.parse({
            homeownerId: userId,
            contractorId: contractorId,
            subject: subject
          });
          conversation = await storage.createConversation(conversationData);
        }
        
        // Send the message in this conversation
        const messageData = insertMessageSchema.parse({
          conversationId: conversation.id,
          senderId: userId,
          senderType: 'homeowner',
          message: message
        });
        
        await storage.createMessage(messageData);
        createdConversations.push(conversation);
      }

      res.json({ 
        success: true, 
        conversationsCreated: createdConversations.length,
        messagesSent: contractorIds.length 
      });
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      res.status(500).json({ message: "Failed to send bulk messages" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const conversationId = req.params.id;
      const userId = req.session.user.id;
      
      // Verify user has access to this conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const userType = req.session.user.role;
      if (userType === 'homeowner' && conversation.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (userType === 'contractor' && conversation.contractorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessages(conversationId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(conversationId, userId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const conversationId = req.params.id;
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      // Verify user has access to this conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (userType === 'homeowner' && conversation.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (userType === 'contractor' && conversation.contractorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: userId,
        senderType: userType
      });
      
      const message = await storage.createMessage(messageData);
      
      // Create notification for contractor when homeowner sends a message
      if (userType === 'homeowner') {
        const homeownerUser = await storage.getUser(userId);
        const homeownerName = homeownerUser ? `${homeownerUser.firstName || ''} ${homeownerUser.lastName || ''}`.trim() || 'A homeowner' : 'A homeowner';
        
        await storage.createNotification({
          homeownerId: conversation.contractorId,
          type: 'message',
          title: 'New Message',
          message: `${homeownerName} sent you a message`,
          category: 'messages',
          scheduledFor: new Date().toISOString(),
          priority: 'medium'
        } as any);
        
        // Send SMS to contractor
        smsService.sendNewMessageNotification(
          conversation.contractorId,
          homeownerName,
          req.body.content || ''
        ).catch(err => console.error('[SMS] Error sending to contractor:', err));
        
        // Send email to contractor
        emailService.sendNewMessageEmail(
          conversation.contractorId,
          homeownerName,
          req.body.content || ''
        ).catch(err => console.error('[EMAIL] Error sending to contractor:', err));
      }
      
      // Create notification for homeowner when contractor sends a message
      if (userType === 'contractor') {
        const contractorUser = await storage.getUser(userId);
        const company = contractorUser?.companyId 
          ? await storage.getCompany(contractorUser.companyId)
          : null;
        const contractorName = company?.name || (contractorUser ? `${contractorUser.firstName || ''} ${contractorUser.lastName || ''}`.trim() : '') || 'A contractor';
        
        await storage.createNotification({
          homeownerId: conversation.homeownerId,
          type: 'message',
          title: 'New Message',
          message: `${contractorName} sent you a message`,
          category: 'messages',
          scheduledFor: new Date().toISOString(),
          priority: 'medium'
        } as any);
        
        // Send SMS to homeowner
        smsService.sendNewMessageNotification(
          conversation.homeownerId,
          contractorName,
          req.body.content || ''
        ).catch(err => console.error('[SMS] Error sending to homeowner:', err));
        
        // Send email to homeowner
        emailService.sendNewMessageEmail(
          conversation.homeownerId,
          contractorName,
          req.body.content || ''
        ).catch(err => console.error('[EMAIL] Error sending to homeowner:', err));
      }
      
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.issues });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages/unread-count', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Review API endpoints
  app.get('/api/contractors/:id/reviews', async (req: any, res: any) => {
    try {
      const reviews = await storage.getContractorReviews(req.params.id);
      
      // Enhance reviews with reviewer email verification status
      const enhancedReviews = await Promise.all(reviews.map(async (review) => {
        const reviewer = await storage.getUser(review.homeownerId);
        return {
          ...review,
          reviewerEmailVerified: reviewer?.emailVerified || false
        };
      }));
      
      res.json(enhancedReviews);
    } catch (error) {
      console.error("Error fetching contractor reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get('/api/contractors/:id/rating', async (req: any, res: any) => {
    try {
      const rating = await storage.getContractorAverageRating(req.params.id);

      // Build star breakdown (1-5) using direct DB aggregation
      const breakdownRows = await db
        .select({
          star: contractorReviews.rating,
          cnt: drizzleSql<number>`count(*)::int`,
        })
        .from(contractorReviews)
        .where(eq(contractorReviews.contractorId, req.params.id))
        .groupBy(contractorReviews.rating);

      const starBreakdown: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      for (const row of breakdownRows) {
        starBreakdown[row.star] = row.cnt;
      }

      res.json({ ...rating, starBreakdown });
    } catch (error) {
      console.error("Error fetching contractor rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  // Check if homeowner can review contractor (requires exchanged messages)
  // Helper: check if a service record qualifies as proof of work
  function recordHasProof(record: { invoiceUrl: string | null; servicePhotos: string[] }): boolean {
    return !!(record.invoiceUrl || (record.servicePhotos && record.servicePhotos.length > 0));
  }

  // Helper: check if a service record is 48+ hours past completion (unlocks review)
  function recordPast48h(record: { completedAt: Date | null; createdAt: Date | null; status: string }): boolean {
    const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
    const anchor = record.completedAt ?? record.createdAt;
    if (!anchor) return false;
    return Date.now() - new Date(anchor).getTime() >= FORTY_EIGHT_HOURS;
  }

  app.get('/api/contractors/:id/can-review', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      const contractorId = req.params.id;

      if (userType !== 'homeowner') {
        return res.json({ canReview: false, reason: "Only homeowners can review contractors" });
      }

      // Check if already reviewed
      const existingReviews = await storage.getReviewsByHomeowner(userId);
      if (existingReviews.some(r => r.contractorId === contractorId)) {
        return res.json({ canReview: false, reason: "You have already reviewed this contractor", alreadyReviewed: true });
      }

      // Find qualifying service records: linked to this homeowner + this contractor,
      // completed, with proof (invoice OR photos), and 48h+ past completion
      const allRecords = await db.select().from(serviceRecords)
        .where(and(
          eq(serviceRecords.homeownerId, userId),
          eq(serviceRecords.contractorId, contractorId),
          eq(serviceRecords.status, "completed"),
        ));

      const eligibleRecords = allRecords.filter(r => recordHasProof(r) && recordPast48h(r));

      if (allRecords.length === 0) {
        return res.json({ canReview: false, reason: "No completed service records found between you and this contractor. A verified service record with an invoice or photo is required." });
      }

      const proofRecords = allRecords.filter(r => recordHasProof(r));
      if (proofRecords.length === 0) {
        return res.json({ canReview: false, reason: "Your service records must have an invoice or photo attached as proof of work before you can leave a review." });
      }

      if (eligibleRecords.length === 0) {
        // Has proof but 48h hasn't passed
        const soonestUnlock = proofRecords
          .map(r => {
            const anchor = r.completedAt ?? r.createdAt;
            return anchor ? new Date(anchor).getTime() + 48 * 60 * 60 * 1000 : null;
          })
          .filter(Boolean)
          .sort()[0];
        const hoursRemaining = soonestUnlock ? Math.ceil((soonestUnlock - Date.now()) / (60 * 60 * 1000)) : 48;
        return res.json({
          canReview: false,
          reason: `Reviews are unlocked 48 hours after a service is completed to give you time to assess the quality of work. ${hoursRemaining > 0 ? `Your review will be available in approximately ${hoursRemaining} hour${hoursRemaining !== 1 ? "s" : ""}.` : ""}`,
        });
      }

      res.json({
        canReview: true,
        eligibleRecords: eligibleRecords.map(r => ({
          id: r.id,
          serviceType: r.serviceType,
          serviceDate: r.serviceDate,
          serviceDescription: r.serviceDescription,
          completedAt: r.completedAt,
          hasInvoice: !!r.invoiceUrl,
          photoCount: r.servicePhotos?.length ?? 0,
        })),
      });
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ message: "Failed to check review eligibility" });
    }
  });

  // GET eligible service records for review (subset of can-review logic, returns more detail)
  app.get('/api/contractors/:id/eligible-service-records', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      if (req.session.user.role !== 'homeowner') return res.status(403).json({ message: "Homeowner access only" });
      const contractorId = req.params.id;

      const allRecords = await db.select().from(serviceRecords)
        .where(and(
          eq(serviceRecords.homeownerId, userId),
          eq(serviceRecords.contractorId, contractorId),
          eq(serviceRecords.status, "completed"),
        ));

      const eligible = allRecords.filter(r => recordHasProof(r) && recordPast48h(r));
      res.json(eligible);
    } catch (error) {
      console.error("Error fetching eligible service records:", error);
      res.status(500).json({ message: "Failed to fetch eligible service records" });
    }
  });

  app.post('/api/contractors/:id/reviews', isAuthenticated, upload.single("photo"), async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      const contractorId = req.params.id;

      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can leave reviews" });
      }

      // --- Fraud prevention checks ---
      const user = await storage.getUser(userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      if (!user.emailVerified) {
        return res.status(403).json({ message: "Email verification required before leaving reviews." });
      }

      const accountAge = Date.now() - new Date(user.createdAt!).getTime();
      if (accountAge < 7 * 24 * 60 * 60 * 1000) {
        const daysRemaining = Math.ceil((7 * 24 * 60 * 60 * 1000 - accountAge) / (24 * 60 * 60 * 1000));
        return res.status(403).json({ message: `Your account must be at least 7 days old before leaving reviews (${daysRemaining} day(s) remaining).` });
      }

      const existingReviews = await storage.getReviewsByHomeowner(userId);
      if (existingReviews.some(r => r.contractorId === contractorId)) {
        return res.status(409).json({ message: "You have already reviewed this contractor." });
      }

      // --- Verified service record requirement ---
      const serviceRecordId = req.body.serviceRecordId;
      if (!serviceRecordId) {
        return res.status(400).json({ message: "A verified service record is required to leave a review." });
      }

      const [record] = await db.select().from(serviceRecords)
        .where(and(
          eq(serviceRecords.id, serviceRecordId),
          eq(serviceRecords.homeownerId, userId),
          eq(serviceRecords.contractorId, contractorId),
          eq(serviceRecords.status, "completed"),
        ));

      if (!record) {
        return res.status(403).json({ message: "Service record not found or not eligible for review." });
      }

      if (!recordHasProof(record)) {
        return res.status(403).json({ message: "This service record requires an invoice or photo as proof of work before it can be used for a review." });
      }

      if (!recordPast48h(record)) {
        return res.status(403).json({ message: "Reviews are unlocked 48 hours after a service is completed." });
      }

      // --- IP / device fingerprint logging ---
      const deviceFingerprint = req.body.deviceFingerprint || req.headers['x-device-fingerprint'];
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // --- Optional photo upload ---
      let reviewPhotoUrl: string | null = null;
      if (req.file) {
        try {
          const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "jpg";
          const storageKey = `review-photos/${randomUUID()}.${ext}`;
          await objectStorageService.uploadFile(storageKey, req.file.buffer, req.file.mimetype);
          reviewPhotoUrl = storageKey;
        } catch (uploadErr) {
          console.warn("[REVIEW] Photo upload failed:", uploadErr);
        }
      }

      const rating = parseInt(req.body.rating, 10);
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ message: "Rating must be between 1 and 5." });
      }

      const reviewData = insertContractorReviewSchema.parse({
        rating,
        comment: req.body.comment || null,
        serviceType: record.serviceType,
        serviceDate: record.serviceDate ? new Date(record.serviceDate) : null,
        wouldRecommend: req.body.wouldRecommend !== "false",
        contractorId,
        homeownerId: userId,
        deviceFingerprint: deviceFingerprint || null,
        ipAddress: ipAddress ? String(ipAddress).split(',')[0].trim() : null,
        isVerifiedService: true,
        serviceRecordId,
        reviewPhotoUrl,
      });

      const review = await storage.createContractorReview(reviewData);

      // Mark any pending review request for this homeowner+contractor as accepted
      await db.update(reviewRequests)
        .set({ status: "accepted" })
        .where(and(
          eq(reviewRequests.homeownerId, userId),
          eq(reviewRequests.contractorId, contractorId),
          eq(reviewRequests.status, "pending"),
        ));

      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.issues });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get('/api/reviews/my-reviews', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view their reviews" });
      }
      
      const reviews = await storage.getReviewsByHomeowner(userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  // Reviews are immutable after submission — only admins can delete
  app.put('/api/reviews/:id', isAuthenticated, async (req: any, res: any) => {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ message: "Reviews cannot be edited after submission. Contact support if there is an issue." });
    }
    try {
      const reviewData = insertContractorReviewSchema.partial().parse(req.body);
      const review = await storage.updateContractorReview(req.params.id, reviewData);
      if (!review) return res.status(404).json({ message: "Review not found" });
      res.json(review);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid review data", errors: error.issues });
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.delete('/api/reviews/:id', isAuthenticated, async (req: any, res: any) => {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ message: "Reviews can only be deleted by administrators." });
    }
    try {
      const deleted = await storage.deleteContractorReview(req.params.id);
      if (!deleted) return res.status(404).json({ message: "Review not found" });
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Contractor one-time response to a review
  app.post('/api/reviews/:id/response', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can respond to reviews." });
      }

      const reviewId = req.params.id;
      const [existing] = await db.select().from(contractorReviews).where(eq(contractorReviews.id, reviewId));
      if (!existing) return res.status(404).json({ message: "Review not found" });

      if (existing.contractorId !== userId) {
        return res.status(403).json({ message: "You can only respond to reviews about your own business." });
      }

      if (existing.contractorResponse) {
        return res.status(409).json({ message: "You have already responded to this review. Responses are final and cannot be changed." });
      }

      const responseText = (req.body.response || "").trim();
      if (!responseText) return res.status(400).json({ message: "Response text is required." });
      if (responseText.length > 2000) return res.status(400).json({ message: "Response must be under 2000 characters." });

      const [updated] = await db.update(contractorReviews)
        .set({ contractorResponse: responseText, contractorRespondedAt: new Date() })
        .where(eq(contractorReviews.id, reviewId))
        .returning();

      // Notify the homeowner
      try {
        await storage.createNotification({
          homeownerId: existing.homeownerId,
          title: "Contractor Responded to Your Review",
          message: "The contractor has responded to your review. Tap to view their response.",
          type: "review_response",
          category: "reviews",
          scheduledFor: new Date().toISOString(),
        } as any);
      } catch (notifyErr) {
        console.warn("[REVIEW] Notification failed:", notifyErr);
      }

      res.json(updated);
    } catch (error) {
      console.error("Error adding contractor response:", error);
      res.status(500).json({ message: "Failed to add response" });
    }
  });

  // Contractor requests a review from a homeowner
  app.post('/api/contractors/:id/review-request', isAuthenticated, async (req: any, res: any) => {
    try {
      const contractorId = req.session.user.id;
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can request reviews." });
      }

      if (contractorId !== req.params.id) {
        return res.status(403).json({ message: "You can only request reviews for your own profile." });
      }

      const homeownerId: string = req.body.homeownerId;
      const serviceRecordId: string | undefined = req.body.serviceRecordId;
      const message: string | undefined = req.body.message;

      if (!homeownerId) return res.status(400).json({ message: "homeownerId is required." });

      // Check an existing pending request doesn't exist
      const [existing] = await db.select().from(reviewRequests)
        .where(and(
          eq(reviewRequests.contractorId, contractorId),
          eq(reviewRequests.homeownerId, homeownerId),
          eq(reviewRequests.status, "pending"),
        ));

      if (existing) {
        return res.status(409).json({ message: "A review request is already pending for this homeowner." });
      }

      const requestData = insertReviewRequestSchema.parse({
        contractorId,
        homeownerId,
        serviceRecordId: serviceRecordId || null,
        message: message || null,
        status: "pending",
      });

      const [created] = await db.insert(reviewRequests).values(requestData).returning();

      // In-app notification
      try {
        const contractor = await storage.getUser(contractorId);
        await storage.createNotification({
          homeownerId: homeownerId,
          title: "Review Request",
          message: `${contractor?.firstName + ' ' + '.lastName' || "Your contractor"} is requesting a review of their services. Verified reviews help homeowners in your community.`,
          type: "review_request",
          relatedEntityId: created.id,
          relatedEntityType: "review_request",
          isRead: false,
        } as any);
      } catch (notifyErr) {
        console.warn("[REVIEW REQUEST] Notification failed:", notifyErr);
      }

      // Push notification
      try {
        const contractor = await storage.getUser(contractorId);
        await pushService.sendToUser(homeownerId, {
          title: "Review Request",
          body: `${contractor?.firstName + ' ' + '.lastName' || "Your contractor"} is requesting a review. Share your experience!`,
          data: { type: "review_request", reviewRequestId: created.id, contractorId },
        });
      } catch (pushErr) {
        console.warn("[REVIEW REQUEST] Push notification failed:", pushErr);
      }

      res.status(201).json(created);
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid request data", errors: error.issues });
      console.error("Error creating review request:", error);
      res.status(500).json({ message: "Failed to create review request" });
    }
  });

  // Homeowner fetches pending review requests
  app.get('/api/homeowner/review-requests', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      if (req.session.user.role !== 'homeowner') return res.status(403).json({ message: "Homeowner access only." });

      const requests = await db.select().from(reviewRequests)
        .where(and(
          eq(reviewRequests.homeownerId, userId),
          eq(reviewRequests.status, "pending"),
        ))
        .orderBy(desc(reviewRequests.createdAt));

      res.json(requests);
    } catch (error) {
      console.error("Error fetching review requests:", error);
      res.status(500).json({ message: "Failed to fetch review requests" });
    }
  });

  // Dismiss a review request
  app.patch('/api/review-requests/:id/dismiss', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const [request] = await db.select().from(reviewRequests).where(eq(reviewRequests.id, req.params.id));
      if (!request) return res.status(404).json({ message: "Review request not found." });
      if (request.homeownerId !== userId) return res.status(403).json({ message: "Access denied." });
      const [updated] = await db.update(reviewRequests)
        .set({ status: "declined" })
        .where(eq(reviewRequests.id, req.params.id))
        .returning();
      res.json(updated);
    } catch (error) {
      console.error("Error dismissing review request:", error);
      res.status(500).json({ message: "Failed to dismiss review request" });
    }
  });

  // Review flag API endpoints
  app.post('/api/reviews/:id/flag', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const reviewId = req.params.id;
      
      // Check if review exists
      const review = await storage.getReview(reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      // Can't flag your own review
      if (review.homeownerId === userId) {
        return res.status(403).json({ message: "You cannot flag your own review" });
      }
      
      const flagData = insertReviewFlagSchema.parse({
        reviewId,
        reportedBy: userId,
        reason: req.body.reason,
        notes: req.body.notes || null,
        status: 'pending'
      });
      
      const flag = await storage.createReviewFlag(flagData);
      res.status(201).json(flag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flag data", errors: error.issues });
      }
      console.error("Error flagging review:", error);
      res.status(500).json({ message: "Failed to flag review" });
    }
  });

  app.get('/api/admin/review-flags', requireAdmin, async (req: any, res: any) => {
    try {
      const status = req.query.status as string | undefined;
      const flags = await storage.getReviewFlags(status);
      
      // Enhance flags with review and reporter data
      const enhancedFlags = await Promise.all(flags.map(async (flag) => {
        // Get the review directly from storage
        const review = await storage.getReview(flag.reviewId);
        
        const reporter = await storage.getUser(flag.reportedBy);
        
        // Get contractor and homeowner names
        let contractorName = 'Unknown Contractor';
        let reviewerName = 'Unknown Reviewer';
        let reviewData = undefined;
        
        if (review) {
          const contractor = await storage.getContractor(review.contractorId);
          contractorName = (contractor as any)?.companyName || (contractor as any)?.name || 'Unknown Contractor';
          
          const homeowner = await storage.getUser(review.homeownerId);
          reviewerName = homeowner ? `${homeowner.firstName} ${homeowner.lastName}` : 'Unknown Reviewer';
          
          reviewData = {
            id: review.id,
            contractorId: review.contractorId,
            homeownerId: review.homeownerId,
            rating: review.rating,
            comment: review.comment,
            wouldRecommend: review.wouldRecommend,
            contractorName,
            reviewerName,
            deviceFingerprint: review.deviceFingerprint,
            ipAddress: review.ipAddress
          };
        }
        
        return {
          ...flag,
          review: reviewData,
          reporter: reporter ? {
            name: `${reporter.firstName} ${reporter.lastName}`,
            email: reporter.email
          } : undefined
        };
      }));
      
      res.json(enhancedFlags);
    } catch (error) {
      console.error("Error fetching review flags:", error);
      res.status(500).json({ message: "Failed to fetch review flags" });
    }
  });

  app.put('/api/admin/review-flags/:id', requireAdmin, async (req: any, res: any) => {
    try {
      // Verify the flag exists before attempting any update
      const existingFlag = await storage.getReviewFlag(req.params.id);
      if (!existingFlag) {
        return res.status(404).json({ message: "Flag not found" });
      }

      const flagData = insertReviewFlagSchema.partial().parse({
        ...req.body,
        reviewedBy: req.session.user.id,
        resolvedAt: req.body.status === 'resolved_valid' || req.body.status === 'resolved_invalid' ? new Date() : undefined
      });
      
      const flag = await storage.updateReviewFlag(req.params.id, flagData);

      if (!flag) {
        return res.status(404).json({ message: "Flag not found" });
      }

      // Log admin action for review flag resolution
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_SETTINGS_CHANGE,
        action: 'Updated review flag',
        details: { flagId: req.params.id, newStatus: req.body.status, reviewId: existingFlag.reviewId },
        req,
      });
      
      res.json(flag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flag data", errors: error.issues });
      }
      console.error("Error updating review flag:", error);
      res.status(500).json({ message: "Failed to update review flag" });
    }
  });

  // Email verification endpoints
  app.post('/api/send-verification-email', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found or no email on file" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      // Generate verification token (6-digit code)
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user with verification token
      await storage.upsertUser({ ...user, emailVerificationToken: verificationToken, emailVerificationTokenExpiry: tokenExpiry });
      
      // TODO: Send email via SendGrid (when integrated)
      console.log(`[EMAIL VERIFICATION] Token for ${user.email}: ${verificationToken}`);
      
      res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (error) {
      console.error("Error sending verification email:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.post('/api/verify-email', async (req: any, res: any) => {
    try {
      const { email, token } = req.body;
      
      if (!email || !token) {
        return res.status(400).json({ message: "Email and token are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      if (!user.emailVerificationToken || user.emailVerificationToken !== token) {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      if (user.emailVerificationTokenExpiry && new Date() > new Date(user.emailVerificationTokenExpiry)) {
        return res.status(400).json({ message: "Verification token expired" });
      }
      
      // Mark email as verified
      await storage.upsertUser({ ...user, emailVerified: true, emailVerifiedAt: new Date(), emailVerificationToken: null, emailVerificationTokenExpiry: null });
      
      res.json({ message: "Email verified successfully!" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
    }
  });

  // Analytics API endpoints
  app.post('/api/analytics/track', async (req: any, res: any) => {
    try {
      // Remove homeownerId from client data and set from session if available
      const { homeownerId, ...clientData } = req.body;
      
      const analyticsData = insertContractorAnalyticsSchema.parse({
        ...clientData,
        homeownerId: req.session?.user?.id || null, // Override with server-side user ID
        ipAddress: req.ip || req.connection.remoteAddress || null
      });
      
      const analytics = await storage.trackContractorClick(analyticsData);
      res.status(201).json({ success: true, id: analytics.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid analytics data", errors: error.issues });
      }
      console.error("Error tracking analytics:", error);
      // Fail silently for analytics to not break user experience
      res.status(200).json({ success: true });
    }
  });

  app.get('/api/analytics/contractor/:contractorId', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const contractorId = req.params.contractorId;
      const { startDate, endDate } = req.query;
      
      // Only allow contractors to access their own analytics
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Access denied - not a contractor" });
      }
      
      // Check if the contractorId matches the authenticated user's ID
      if (req.session.user.id !== contractorId) {
        return res.status(403).json({ message: "Access denied - can only view own analytics" });
      }

      const analytics = await storage.getContractorAnalytics(
        contractorId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching contractor analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/analytics/contractor/:contractorId/monthly/:year/:month', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const contractorId = req.params.contractorId;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      // Only allow contractors to access their own analytics
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Access denied - not a contractor" });
      }
      
      // Check if the contractorId matches the authenticated user's ID
      if (req.session.user.id !== contractorId) {
        return res.status(403).json({ message: "Access denied - can only view own analytics" });
      }

      const stats = await storage.getContractorMonthlyStats(contractorId, year, month);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly stats" });
    }
  });

  // Regional API endpoints for international expansion
  
  // Countries endpoints
  app.get('/api/countries', async (_req: any, res) => {
    try {
      const countries = await storage.getCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
    }
  });

  app.get('/api/countries/:id', async (req: any, res: any) => {
    try {
      const country = await storage.getCountry(req.params.id);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      console.error("Error fetching country:", error);
      res.status(500).json({ message: "Failed to fetch country" });
    }
  });

  app.get('/api/countries/code/:code', async (req: any, res: any) => {
    try {
      const country = await storage.getCountryByCode(req.params.code);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      console.error("Error fetching country by code:", error);
      res.status(500).json({ message: "Failed to fetch country" });
    }
  });

  // Regions endpoints
  app.get('/api/countries/:countryId/regions', async (req: any, res: any) => {
    try {
      const regions = await storage.getRegionsByCountry(req.params.countryId);
      res.json(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });

  app.get('/api/regions/:id', async (req: any, res: any) => {
    try {
      const region = await storage.getRegion(req.params.id);
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      res.json(region);
    } catch (error) {
      console.error("Error fetching region:", error);
      res.status(500).json({ message: "Failed to fetch region" });
    }
  });

  // Climate zones endpoints
  app.get('/api/countries/:countryId/climate-zones', async (req: any, res: any) => {
    try {
      const climateZones = await storage.getClimateZonesByCountry(req.params.countryId);
      res.json(climateZones);
    } catch (error) {
      console.error("Error fetching climate zones:", error);
      res.status(500).json({ message: "Failed to fetch climate zones" });
    }
  });

  app.get('/api/climate-zones/:id', async (req: any, res: any) => {
    try {
      const climateZone = await storage.getClimateZone(req.params.id);
      if (!climateZone) {
        return res.status(404).json({ message: "Climate zone not found" });
      }
      res.json(climateZone);
    } catch (error) {
      console.error("Error fetching climate zone:", error);
      res.status(500).json({ message: "Failed to fetch climate zone" });
    }
  });

  // Regulatory bodies endpoints
  app.get('/api/regions/:regionId/regulatory-bodies', async (req: any, res: any) => {
    try {
      const regulatoryBodies = await storage.getRegulatoryBodiesByRegion(req.params.regionId);
      res.json(regulatoryBodies);
    } catch (error) {
      console.error("Error fetching regulatory bodies by region:", error);
      res.status(500).json({ message: "Failed to fetch regulatory bodies" });
    }
  });

  app.get('/api/countries/:countryId/regulatory-bodies', async (req: any, res: any) => {
    try {
      const regulatoryBodies = await storage.getRegulatoryBodiesByCountry(req.params.countryId);
      res.json(regulatoryBodies);
    } catch (error) {
      console.error("Error fetching regulatory bodies by country:", error);
      res.status(500).json({ message: "Failed to fetch regulatory bodies" });
    }
  });

  app.get('/api/regulatory-bodies/:id', async (req: any, res: any) => {
    try {
      const regulatoryBody = await storage.getRegulatoryBody(req.params.id);
      if (!regulatoryBody) {
        return res.status(404).json({ message: "Regulatory body not found" });
      }
      res.json(regulatoryBody);
    } catch (error) {
      console.error("Error fetching regulatory body:", error);
      res.status(500).json({ message: "Failed to fetch regulatory body" });
    }
  });

  // Regional maintenance tasks endpoints
  app.get('/api/maintenance-tasks/regional', async (req: any, res: any) => {
    try {
      const { countryId, climateZoneId, month } = req.query;
      
      if (!countryId) {
        return res.status(400).json({ message: "countryId is required" });
      }

      const tasks = await storage.getRegionalMaintenanceTasks(
        countryId as string,
        climateZoneId as string | undefined,
        month ? parseInt(month as string) : undefined
      );
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching regional maintenance tasks:", error);
      res.status(500).json({ message: "Failed to fetch regional maintenance tasks" });
    }
  });

  app.get('/api/maintenance-tasks/regional/:id', async (req: any, res: any) => {
    try {
      const task = await storage.getRegionalMaintenanceTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Regional maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching regional maintenance task:", error);
      res.status(500).json({ message: "Failed to fetch regional maintenance task" });
    }
  });

  // Task completion endpoints for achievements
  app.get('/api/task-completions', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const completions = await storage.getTaskCompletions(homeownerId, req.query.houseId as string);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching task completions:", error);
      res.status(500).json({ message: "Failed to fetch task completions" });
    }
  });

  app.post('/api/task-completions', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Ensure month and year are set from completedAt
      const completedAt = req.body.completedAt ? new Date(req.body.completedAt) : new Date();
      
      const completionData = insertTaskCompletionSchema.parse({
        ...req.body,
        homeownerId,
        completedAt,
        month: completedAt.getMonth() + 1, // 1-12
        year: completedAt.getFullYear(),
      });

      const completion = await storage.createTaskCompletion(completionData);

      // Check and award achievements using new system
      let newAchievements: any[] = [];
      try {
        newAchievements = await storage.checkAndAwardAchievements(homeownerId);
      } catch (error) {
        console.error("Error checking achievements:", error);
        // Don't fail the request if achievement check fails
      }

      res.json({ completion, newAchievements });
    } catch (error) {
      console.error("Error creating task completion:", error);
      res.status(500).json({ message: "Failed to create task completion" });
    }
  });

  app.get('/api/task-completions/streak', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const streak = await storage.getMonthlyStreak(homeownerId);
      res.json(streak);
    } catch (error) {
      console.error("Error fetching streak:", error);
      res.status(500).json({ message: "Failed to fetch streak" });
    }
  });

  // Achievement endpoints (old - removed - using new system below)
  
  app.post('/api/achievements/contractor-hired', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorCount = await storage.getContractorHireCount(homeownerId);
      
      // Check milestones: 1st, 3rd, 5th, 10th contractor
      const milestones = [
        { count: 1, type: 'contractor_hired_1', title: 'First Hire!', description: 'You hired your first contractor' },
        { count: 3, type: 'contractor_hired_3', title: 'Building Trust', description: 'You hired 3 contractors' },
        { count: 5, type: 'contractor_hired_5', title: 'Growing Network', description: 'You hired 5 contractors' },
        { count: 10, type: 'contractor_hired_10', title: 'Community Builder', description: 'You hired 10 contractors' },
      ];

      for (const milestone of milestones) {
        if (contractorCount >= milestone.count && !(await storage.hasAchievement(homeownerId, milestone.type))) {
          await storage.createAchievement({
            homeownerId,
            achievementType: milestone.type,
            achievementTitle: milestone.title,
            achievementDescription: milestone.description,
            metadata: JSON.stringify({ contractorCount }),
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error checking contractor hire achievement:", error);
      res.status(500).json({ message: "Failed to check achievement" });
    }
  });

  app.post('/api/achievements/referral', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { referredUserId } = req.body;
      
      // Create referral achievement (can have multiple)
      await storage.createAchievement({
        homeownerId,
        achievementType: `referral_${referredUserId}`, // Make it unique per referral
        achievementTitle: 'Referral Success!',
        achievementDescription: 'You referred a new user to Home Base',
        metadata: JSON.stringify({ referredUserId }),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error creating referral achievement:", error);
      res.status(500).json({ message: "Failed to create referral achievement" });
    }
  });

  // New achievement system endpoints
  // GET /api/achievements - Returns all achievement definitions with user progress
  app.get('/api/achievements', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      const { category, houseId } = req.query;
      
      // Get all definitions (or filtered by category)
      let definitions;
      if (category) {
        definitions = await storage.getAchievementDefinitionsByCategory(category as string);
      } else {
        definitions = await storage.getAllAchievementDefinitions();
      }
      
      // If user is authenticated, calculate progress based on house filter
      if (homeownerId) {
        // Calculate achievements with house filtering
        const achievementsWithProgress = await storage.calculateAchievementsProgress(homeownerId);
        
        // Merge with definitions
        const result = definitions.map(def => {
          const calculated = achievementsWithProgress.find((a: any) => a.achievementKey === def.achievementKey);
          const criteria = typeof def.criteria === 'string' ? JSON.parse(def.criteria) : def.criteria;
          
          return {
            key: def.achievementKey,
            category: def.category,
            name: def.name,
            description: def.description,
            icon: def.icon,
            criteria: criteria,
            progress: calculated?.progress || 0,
            isUnlocked: calculated?.isUnlocked || false,
            unlockedAt: calculated?.unlockedAt || null,
            metadata: calculated?.metadata || null
          };
        });
        
        res.json({ achievements: result });
      } else {
        // If not authenticated, just return definitions without progress
        const achievementsWithoutProgress = definitions.map(def => {
          const criteria = typeof def.criteria === 'string' ? JSON.parse(def.criteria) : def.criteria;
          return {
            key: def.achievementKey,
            category: def.category,
            name: def.name,
            description: def.description,
            icon: def.icon,
            criteria: criteria,
            progress: 0,
            isUnlocked: false,
            unlockedAt: null,
            metadata: null
          };
        });
        res.json({ achievements: achievementsWithoutProgress });
      }
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // GET /api/achievements/user - Returns only the user's earned/unlocked achievements
  app.get('/api/achievements/user', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userAchievements = await storage.getUserAchievements(homeownerId);
      const definitions = await storage.getAllAchievementDefinitions();
      
      // Return only unlocked achievements with full definition data
      const unlockedAchievements = userAchievements
        .filter(ua => ua.isUnlocked)
        .map(ua => {
          const def = definitions.find(d => d.achievementKey === ua.achievementKey);
          return {
            ...def,
            ...ua,
            progress: parseFloat(ua.progress?.toString() || "100")
          };
        })
        .filter(a => a.id); // Filter out any that didn't match a definition
      
      res.json(unlockedAchievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  app.post('/api/achievements/check', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const newlyUnlocked = await storage.checkAndAwardAchievements(homeownerId);
      
      res.json({
        success: true,
        newlyUnlocked: newlyUnlocked.map(ua => ({
          achievementKey: ua.achievementKey,
          unlockedAt: ua.unlockedAt
        }))
      });
    } catch (error) {
      console.error("Error checking and awarding achievements:", error);
      res.status(500).json({ message: "Failed to check achievements" });
    }
  });

  app.get('/api/achievements/progress/:achievementKey', async (req: any, res: any) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { achievementKey } = req.params;
      const progress = await storage.getAchievementProgress(homeownerId, achievementKey);
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching achievement progress:", error);
      res.status(500).json({ message: "Failed to fetch achievement progress" });
    }
  });

  // AI Contractor Recommendation - using Replit AI Integrations blueprint
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  const openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  });

  const AVAILABLE_SERVICES = [
    "Appliance Installation", "Appliance Repair & Maintenance", "Basement Remodeling", "Bathroom Remodeling",
    "Cabinet Installation", "Carpet Cleaning", "Carpet Installation", "Chimney & Fireplace Services", "Closet Organization", "Concrete & Masonry",
    "Custom Carpentry", "Custom Home Building", "Deck Construction", "Drainage Solutions",
    "Drywall & Spackling Repair", "Dumpster Rental", "Electrical Services", "Epoxy Flooring",
    "Exterior Painting", "Fence Installation", "Fire & Water Damage Restoration", "Furniture Assembly",
    "Garage Door Services", "General Contracting", "Gutter Cleaning and Repair", "Gutter Installation",
    "Handyman Services", "Hardwood Flooring", "Holiday Light Installation", "Home Automation & Tech Services", "Home Inspection",
    "House Cleaning", "HVAC Services", "Interior Painting", "Irrigation Systems",
    "Junk Removal", "Kitchen Remodeling", "Laminate & Vinyl Flooring", "Landscape Design",
    "Lawn & Landscaping", "Local Moving", "Locksmiths", "Masonry & Paver Installation", "Mold Remediation", "Pest Control",
    "Plumbing Services", "Pool Installation", "Pool Maintenance", "Pressure Washing",
    "Roofing Services", "Security System Installation", "Septic Services", "Siding Installation",
    "Snow Removal", "Tile Installation", "Tree Service & Trimming", "Trim & Finish Carpentry", "Window Cleaning",
    "Windows & Door Installation"
  ];

  // Topic validation helper for AI requests
  const isHomeMaintenanceRelated = (text: string): { valid: boolean; reason?: string } => {
    const normalizedText = text.toLowerCase().trim();
    
    // Allowed topic keywords - home, construction, maintenance related
    const allowedKeywords = [
      'home', 'house', 'property', 'room', 'wall', 'floor', 'ceiling', 'roof', 'foundation',
      'plumbing', 'electrical', 'hvac', 'heating', 'cooling', 'air', 'water', 'leak', 'drain',
      'contractor', 'repair', 'fix', 'broken', 'install', 'replace', 'maintenance', 'remodel',
      'construction', 'building', 'renovation', 'improvement', 'upgrade', 'service',
      'window', 'door', 'siding', 'gutter', 'deck', 'patio', 'garage', 'basement', 'attic',
      'kitchen', 'bathroom', 'appliance', 'fixture', 'paint', 'drywall', 'insulation',
      'landscaping', 'lawn', 'yard', 'tree', 'fence', 'concrete', 'masonry', 'brick',
      'flooring', 'carpet', 'tile', 'wood', 'cabinet', 'counter', 'sink', 'toilet', 'shower',
      'furnace', 'boiler', 'ac', 'thermostat', 'duct', 'vent', 'pipe', 'wiring', 'outlet',
      'smart home', 'security system', 'camera', 'alarm', 'detector', 'smoke', 'carbon monoxide',
      'automation', 'automated', 'automate', 'smart device', 'iot', 'wifi', 'network', 'router',
      'home theater', 'audio', 'video', 'speaker', 'tv mount', 'voice control', 'alexa', 'google home',
      'smart light', 'smart thermostat', 'smart lock', 'doorbell camera', 'nest', 'ring', 'ecobee',
      'mold', 'moisture', 'humidity', 'ventilation', 'energy', 'efficiency', 'solar'
    ];
    
    // Blocked topic keywords - use specific multi-word phrases to avoid false positives
    const blockedKeywords = [
      // Weather & Nature (non-home)
      'weather forecast', 'weather tomorrow', 'weather today', 'temperature outside', 
      'will it rain', 'climate change', 'global warming',
      
      // Food & Cooking (be specific to avoid blocking appliance repair)
      'recipe for', 'how to cook', 'cooking recipe', 'baking recipe', 'dinner recipe',
      'lunch recipe', 'breakfast recipe', 'food recipe', 'ingredient list',
      
      // Entertainment
      'tell me a joke', 'funny joke', 'make me laugh', 'comedy show', 'movie recommendation',
      'what movie', 'film recommendation', 'tv show recommendation', 'music recommendation',
      'song recommendation', 'netflix show', 'youtube video', 'video game', 'play a game',
      
      // Sports (use specific phrases)
      'sports score', 'game score', 'who won the game', 'sports team', 'football score',
      'basketball score', 'baseball score', 'soccer match', 'championship game',
      
      // Finance & Business (non-home, be specific)
      'stock market', 'stock price', 'cryptocurrency price', 'bitcoin price', 'crypto trading',
      'investment advice', 'stock portfolio', 'forex trading', 'tax return', 'tax advice',
      'irs form', 'accounting service',
      
      // Health & Medical
      'medical advice', 'health advice', 'see a doctor', 'doctor appointment', 'medicine for',
      'prescription for', 'disease symptom', 'illness symptom', 'mental health', 'therapy session',
      'covid test', 'vaccine appointment',
      
      // Legal
      'legal advice', 'lawyer consultation', 'attorney help', 'lawsuit help', 'divorce lawyer',
      'court case',
      
      // Relationships & Personal
      'dating advice', 'relationship advice', 'girlfriend problem', 'boyfriend problem',
      'marriage counseling', 'love advice',
      
      // Travel & Transportation
      'vacation destination', 'travel destination', 'hotel booking', 'flight booking',
      'airline ticket', 'cruise ship', 'passport application',
      
      // Shopping & Retail (non-home)
      'shopping mall', 'retail store', 'amazon deal', 'black friday deal', 'coupon code',
      
      // Education & School
      'homework help', 'school assignment', 'college application', 'exam preparation',
      
      // Technology (non-home, be specific)
      'smartphone repair', 'iphone problem', 'android app', 'computer virus', 'laptop repair',
      'social media', 'facebook account', 'instagram post', 'twitter feed',
      
      // Politics & News
      'political news', 'election results', 'president elect', 'breaking news', 'news story',
      
      // Pets (non-home maintenance)
      'dog training', 'cat behavior', 'pet grooming', 'veterinary care', 'pet food',
      
      // Miscellaneous clearly off-topic
      'fashion advice', 'clothing style', 'makeup tutorial', 'hair salon', 'car repair',
      'automobile service', 'book recommendation', 'novel summary', 'poem about',
      'religious advice'
    ];
    
    // Check for blocked topics first
    for (const blocked of blockedKeywords) {
      if (normalizedText.includes(blocked)) {
        return { 
          valid: false, 
          reason: 'This question appears to be about topics outside home maintenance and construction. Please ask about home repairs, maintenance, or contractor services.' 
        };
      }
    }
    
    // Check for allowed topics
    const hasAllowedKeyword = allowedKeywords.some(keyword => normalizedText.includes(keyword));
    
    // If very short and no allowed keywords, likely off-topic
    if (normalizedText.length < 20 && !hasAllowedKeyword) {
      return { 
        valid: false, 
        reason: 'Please describe a specific home maintenance, repair, or construction issue you need help with.' 
      };
    }
    
    // If longer text without any allowed keywords, probably off-topic
    if (normalizedText.length >= 20 && !hasAllowedKeyword) {
      return { 
        valid: false, 
        reason: 'I can only help with home maintenance, repair, and contractor-related questions. Please describe a home-related issue.' 
      };
    }
    
    return { valid: true };
  };

  app.post('/api/ai/contractor-recommendation', isAuthenticated, async (req: any, res: any) => {
    try {
      const { problem } = req.body;

      if (!problem || typeof problem !== 'string' || problem.trim().length < 10) {
        return res.status(400).json({ 
          message: "Please provide a detailed description of your problem (at least 10 characters)" 
        });
      }

      // Validate topic before making API call
      const topicValidation = isHomeMaintenanceRelated(problem);
      if (!topicValidation.valid) {
        console.log('[AI] Rejected off-topic query');
        return res.status(400).json({ 
          code: 'OFF_TOPIC',
          message: topicValidation.reason,
          examples: [
            'My toilet keeps running and won\'t stop',
            'Water stains on my ceiling',
            'Need to remodel my kitchen',
            'HVAC system not cooling properly'
          ]
        });
      }

      console.log('[AI] Processing contractor recommendation request');

      const systemPrompt = `You are a HOME MAINTENANCE EXPERT ASSISTANT. Your ONLY purpose is to help homeowners with home repair, maintenance, and construction issues.

**STRICT TOPIC BOUNDARIES:**
✅ ALLOWED TOPICS ONLY:
- Home repairs, maintenance, and construction issues
- Contractor recommendations for home services
- Building, remodeling, renovation questions
- Appliance installation and repair
- Plumbing, electrical, HVAC, roofing issues
- Landscaping, lawn care, outdoor structures
- Smart home devices, automation, and tech integration
- Home automation systems (lighting, thermostats, voice control)
- Home theater and audio/video installation
- Network setup, WiFi, and smart home hubs
- Home safety and security systems
- Energy efficiency and home improvements

❌ REFUSE ALL OTHER TOPICS:
- Weather forecasts, news, current events
- Recipes, cooking, food preparation
- Entertainment, jokes, games, trivia
- Medical, health, or legal advice
- Financial, tax, or investment advice
- Relationship or personal advice
- General knowledge not related to homes
- Any topic outside home/construction/maintenance

**REFUSAL PROTOCOL:**
If the question is clearly off-topic, respond with this JSON format:
{
  "possibleCauses": "This question is outside my area of expertise.",
  "recommendedServices": [],
  "explanation": "I can only help with home maintenance, repair, and contractor-related questions. Please ask about specific home issues like plumbing problems, electrical repairs, remodeling projects, or maintenance needs."
}

**FOR BORDERLINE CASES:**
If unclear whether the question relates to home maintenance, ask a clarifying question in the explanation field before refusing.

**YOUR ACTUAL JOB (for valid home questions):**
You are a helpful home maintenance expert assistant. Your job is to analyze home problems and recommend which type of contractor the homeowner should contact.

Available contractor service types:
${AVAILABLE_SERVICES.join(', ')}

IMPORTANT SERVICE GUIDANCE:
- Window/door leaks, drafts, exterior water intrusion → "Siding Installation" or "Windows & Door Installation"
- Interior water stains, ceiling leaks, missing shingles → "Roofing Services"
- Clogged gutters, water overflow from gutters → "Gutter Cleaning and Repair"
- Toilet/sink/drain issues, water pressure problems → "Plumbing Services"
- No heat/AC, thermostat issues, air quality → "HVAC Services"
- Outlet/switch/breaker problems, lights flickering → "Electrical Services"
- Brick/stone/paver walkways, retaining walls, chimneys → "Masonry & Paver Installation" or "Concrete & Masonry"
- Interior wall holes, cracks, texture repair → "Drywall & Spackling Repair"
- Kitchen/bathroom updates, cabinet work → "Kitchen Remodeling" or "Bathroom Remodeling"

HANDYMAN SERVICES GUIDANCE:
Many common home problems can be solved by EITHER a specialist OR a handyman. Consider suggesting "Handyman Services" as an additional option for:
- Minor plumbing fixes (running toilets, leaky faucets, basic repairs)
- Basic electrical work (replacing outlets, switches, light fixtures)
- Small drywall repairs, painting touch-ups
- Door/window adjustments, weatherstripping
- Minor carpentry (shelving, trim work, small fixes)
- General home repairs that don't require specialized licensing

For most problems, recommend BOTH the specialist AND handyman option to give homeowners flexibility. Only omit handyman if the problem requires specialized licensing (major electrical/plumbing) or specialized equipment (roofing, HVAC).

Analyze the problem and provide:
1. A brief explanation of possible causes (1-2 sentences)
2. The recommended contractor service type(s) from the available list (pick 1-3 most relevant)
3. A brief explanation of why these contractor type(s) are recommended

Respond ONLY in valid JSON format with this exact structure:
{
  "possibleCauses": "Brief explanation of what might be causing this problem",
  "recommendedServices": ["Service Type 1", "Service Type 2"],
  "explanation": "Why these contractor types are recommended for this problem"
}

Important: Only recommend service types from the available list. Match problems to services carefully using the guidance above. When appropriate, include both specialist and handyman options.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Problem: ${problem}` }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('[AI] No content in AI response');
        return res.status(500).json({ 
          message: "AI service returned an empty response. Please try again.",
          details: "No response content"
        });
      }

      let recommendation;
      try {
        recommendation = JSON.parse(content);
      } catch (parseError) {
        console.error('[AI] Failed to parse AI response:', parseError);
        return res.status(500).json({ 
          message: "AI service returned an invalid response format. Please try again.",
          details: "JSON parse error"
        });
      }
      
      console.log('[AI] Recommendation generated successfully');
      res.json(recommendation);

    } catch (error) {
      console.error("[AI] Error generating contractor recommendation:", error);
      
      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        // Check for OpenAI API errors
        if (error.message.includes('model') || error.message.includes('gpt')) {
          return res.status(500).json({ 
            message: "AI model error. Please contact support if this persists.",
            details: error.message
          });
        }
        
        return res.status(500).json({ 
          message: "Failed to generate recommendation. Please try again.",
          details: error.message
        });
      }
      
      res.status(500).json({ 
        message: "An unexpected error occurred. Please try again.",
        details: "Unknown error"
      });
    }
  });

  // AI Home Troubleshooter - conversational diagnostic chat
  app.post('/api/ai/troubleshoot', isAuthenticated, async (req: any, res: any) => {
    try {
      const { messages } = req.body;

      if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({ message: "messages array is required" });
      }

      const lastUserMessage = [...messages].reverse().find((m: any) => m.role === 'user');
      if (!lastUserMessage || typeof lastUserMessage.content !== 'string' || lastUserMessage.content.trim().length < 3) {
        return res.status(400).json({ message: "Please describe your home issue." });
      }

      // Validate every new user message is home-related
      const topicValidation = isHomeMaintenanceRelated(lastUserMessage.content);
      if (!topicValidation.valid) {
        return res.status(400).json({
          code: 'OFF_TOPIC',
          message: topicValidation.reason,
        });
      }

      const systemPrompt = `You are HomeBase AI, a friendly and knowledgeable home diagnostic expert. Your job is to help homeowners identify and troubleshoot problems in their homes through a step-by-step conversation.

**YOUR APPROACH:**
1. Ask targeted follow-up questions to narrow down the problem (one or two at a time — never overwhelm)
2. Guide homeowners through safe, practical diagnostic steps they can do themselves
3. Explain what each symptom likely means in plain language
4. Recommend specific DIY fixes when the problem is safe and straightforward
5. Clearly indicate when the problem requires a professional and explain why

**TONE & FORMAT:**
- Be warm, clear, and practical — like a knowledgeable neighbor
- Use bullet points and numbered steps for clarity
- Keep responses concise (3-6 sentences or a short list)
- Avoid jargon; explain technical terms when you use them

**WHEN PROFESSIONAL HELP IS NEEDED:**
- If the problem requires licensed work (electrical panel, gas lines, major plumbing, structural), say so clearly
- End your response with exactly this phrase when a pro is needed: "[NEEDS_PROFESSIONAL: <contractor type>]"
  Examples: "[NEEDS_PROFESSIONAL: Electrician]", "[NEEDS_PROFESSIONAL: Plumber]", "[NEEDS_PROFESSIONAL: HVAC Technician]"

**STRICT TOPIC BOUNDARIES:**
- ONLY discuss home-related issues: plumbing, electrical, HVAC, roofing, appliances, structural, pests, etc.
- If asked about anything unrelated to homes, politely decline and redirect

**SAFETY FIRST:**
- Always warn before recommending anything near electrical panels, gas lines, or load-bearing structures
- If there is any risk of injury, lead with a safety warning`;

      const openaiClient = new OpenAI({
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
      });

      const chatMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...messages.map((m: any) => ({ role: m.role as 'user' | 'assistant', content: String(m.content) }))
      ];

      const response = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: chatMessages,
        max_tokens: 600,
        temperature: 0.7
      });

      const reply = response.choices[0]?.message?.content;
      if (!reply) {
        return res.status(500).json({ message: "AI service returned an empty response. Please try again." });
      }

      // Detect if professional is needed
      const proMatch = reply.match(/\[NEEDS_PROFESSIONAL:\s*([^\]]+)\]/);
      const needsProfessional = !!proMatch;
      const contractorType = proMatch ? proMatch[1].trim() : null;
      const cleanReply = reply.replace(/\[NEEDS_PROFESSIONAL:[^\]]+\]/g, '').trim();

      console.log('[AI] Troubleshoot response generated');
      res.json({ reply: cleanReply, needsProfessional, contractorType });

    } catch (error) {
      console.error("[AI] Error in troubleshoot endpoint:", error);
      res.status(500).json({ message: "Failed to get a response. Please try again." });
    }
  });

  // Push token registration endpoint for mobile apps (Firebase)
  app.post('/api/push-token', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { token, platform, deviceId } = req.body;

      if (!token || !platform) {
        return res.status(400).json({ message: "Token and platform are required" });
      }

      if (!['ios', 'android'].includes(platform)) {
        return res.status(400).json({ message: "Platform must be 'ios' or 'android'" });
      }

      // Check if token already exists for this user
      const existingTokens = await storage.getPushTokensForUser(userId);
      const existingToken = existingTokens.find(t => t.token === token);

      if (existingToken) {
        // Update last used time
        await storage.updatePushToken(existingToken.id, { isActive: true });
        console.log(`[PUSH] Updated existing token for user ${userId}`);
        return res.json({ message: "Token updated", id: existingToken.id });
      }

      // Create new token
      const newToken = await storage.createPushToken({
        userId,
        token,
        platform,
        deviceId: deviceId || null,
        isActive: true,
      });

      console.log(`[PUSH] Registered new token for user ${userId}, platform: ${platform}`);
      res.status(201).json({ message: "Token registered", id: newToken.id });
    } catch (error) {
      console.error('[PUSH] Error registering push token:', error);
      res.status(500).json({ message: "Failed to register push token" });
    }
  });

  app.delete('/api/push-token', isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const existingTokens = await storage.getPushTokensForUser(userId);
      const tokenToDelete = existingTokens.find(t => t.token === token);

      if (tokenToDelete) {
        await storage.deletePushToken(tokenToDelete.id);
        console.log(`[PUSH] Deleted token for user ${userId}`);
      }

      res.json({ message: "Token removed" });
    } catch (error) {
      console.error('[PUSH] Error deleting push token:', error);
      res.status(500).json({ message: "Failed to delete push token" });
    }
  });

  // Site Content API - for inline editing on the landing page
  app.get("/api/site-content", async (_req, res) => {
    try {
      const rows = await db.select().from(siteContent);
      const content: Record<string, string> = {};
      for (const row of rows) {
        content[row.key] = row.value;
      }
      res.json(content);
    } catch (error) {
      console.error("[SiteContent] Error fetching content:", error);
      res.status(500).json({ message: "Failed to fetch site content" });
    }
  });

  app.put("/api/site-content/:key", async (req: any, res: any) => {
    const isDevMode = process.env.NODE_ENV === "development";
    if (!isDevMode) {
      if (!req.isAuthenticated() || !req.user) {
        return res.status(401).json({ message: "Not authenticated" });
      }
      if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin access required" });
      }
    }
    const { key } = req.params;
    const bodySchema = z.object({ value: z.string().min(1).max(2000) });
    const parsed = bodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Value is required (1-2000 characters)" });
    }
    const { value } = parsed.data;
    try {
      await db.insert(siteContent).values({ key, value: value.trim(), updatedAt: new Date() })
        .onConflictDoUpdate({ target: siteContent.key, set: { value: value.trim(), updatedAt: new Date() } });
      res.json({ key, value: value.trim() });
    } catch (error) {
      console.error("[SiteContent] Error updating content:", error);
      res.status(500).json({ message: "Failed to update site content" });
    }
  });

  // ─── Home Handoff Package Routes ─────────────────────────────────────────────
  // (objectStorageService is already instantiated earlier in this function)

  // Helper: extract home data from document content using OpenAI
  async function extractHomeDataFromText(documentText: string, fileName: string): Promise<HandoffExtractedData> {
    const systemPrompt = `You are an expert at reading real estate closing documents, disclosure forms, and home inspection reports.
Extract structured home information from the provided document text.
Return ONLY valid JSON matching this exact structure (use null for unknown values):
{
  "systems": [
    { "name": "string (e.g. Central AC, Gas Furnace)", "brand": "string|null", "model": "string|null", "yearInstalled": number|null, "notes": "string|null" }
  ],
  "appliances": [
    { "name": "string (e.g. Dishwasher, Water Heater)", "make": "string|null", "model": "string|null", "serialNumber": "string|null", "yearInstalled": number|null, "warrantyExpiration": "string|null", "notes": "string|null" }
  ],
  "propertyDetails": {
    "yearBuilt": number|null,
    "squareFootage": number|null,
    "roofType": "string|null",
    "roofAge": number|null,
    "foundationType": "string|null",
    "electricalPanelAmps": number|null,
    "heatingFuel": "string|null"
  },
  "warranties": [
    { "item": "string", "expiration": "string|null", "notes": "string|null" }
  ],
  "generalNotes": "string|null"
}
Systems include: HVAC, furnace, air conditioner, heat pump, water heater, plumbing, electrical panel, roof, gutters, siding, windows, doors, septic, well pump, sump pump, etc.
Appliances include: refrigerator, dishwasher, washer, dryer, range/oven, microwave, garbage disposal, etc.
If the document contains no relevant home information, return the structure with empty arrays.`;

    const userPrompt = `Document: ${fileName}\n\nContent:\n${documentText.slice(0, 12000)}`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      });
      const raw = response.choices[0]?.message?.content || "{}";
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      // normalised via mergeExtractedData (declared below — TypeScript hoists function declarations)
      return {
        systems: Array.isArray(parsed.systems) ? parsed.systems as Record<string, unknown>[] : [],
        appliances: Array.isArray(parsed.appliances) ? parsed.appliances as Record<string, unknown>[] : [],
        propertyDetails: (typeof parsed.propertyDetails === "object" && parsed.propertyDetails !== null)
          ? parsed.propertyDetails as Record<string, unknown>
          : {},
        warranties: Array.isArray(parsed.warranties) ? parsed.warranties as Record<string, unknown>[] : [],
        generalNotes: typeof parsed.generalNotes === "string" ? parsed.generalNotes : null,
      };
    } catch (err) {
      console.error("[HANDOFF AI] extraction error:", err);
      return { systems: [], appliances: [], propertyDetails: {}, warranties: [], generalNotes: null };
    }
  }

  // Typed shape for AI-extracted home data
  interface HandoffExtractedData {
    systems: Record<string, unknown>[];
    appliances: Record<string, unknown>[];
    propertyDetails: Record<string, unknown>;
    warranties: Record<string, unknown>[];
    generalNotes: string | null;
  }

  function emptyExtractedData(): HandoffExtractedData {
    return { systems: [], appliances: [], propertyDetails: {}, warranties: [], generalNotes: null };
  }

  // Helper: merge AI extraction results into existing extractedData
  function mergeExtractedData(
    existing: Record<string, unknown> | null | undefined,
    incoming: Record<string, unknown>
  ): HandoffExtractedData {
    const base: HandoffExtractedData = {
      systems: Array.isArray(existing?.systems) ? existing.systems as Record<string, unknown>[] : [],
      appliances: Array.isArray(existing?.appliances) ? existing.appliances as Record<string, unknown>[] : [],
      propertyDetails: (typeof existing?.propertyDetails === "object" && existing.propertyDetails !== null)
        ? existing.propertyDetails as Record<string, unknown>
        : {},
      warranties: Array.isArray(existing?.warranties) ? existing.warranties as Record<string, unknown>[] : [],
      generalNotes: typeof existing?.generalNotes === "string" ? existing.generalNotes : null,
    };
    const inc: HandoffExtractedData = {
      systems: Array.isArray(incoming.systems) ? incoming.systems as Record<string, unknown>[] : [],
      appliances: Array.isArray(incoming.appliances) ? incoming.appliances as Record<string, unknown>[] : [],
      propertyDetails: (typeof incoming.propertyDetails === "object" && incoming.propertyDetails !== null)
        ? incoming.propertyDetails as Record<string, unknown>
        : {},
      warranties: Array.isArray(incoming.warranties) ? incoming.warranties as Record<string, unknown>[] : [],
      generalNotes: typeof incoming.generalNotes === "string" ? incoming.generalNotes : null,
    };
    return {
      systems: [...base.systems, ...inc.systems],
      appliances: [...base.appliances, ...inc.appliances],
      propertyDetails: { ...base.propertyDetails, ...inc.propertyDetails },
      warranties: [...base.warranties, ...inc.warranties],
      generalNotes: [base.generalNotes, inc.generalNotes].filter(Boolean).join(" | ") || null,
    };
  }

  // List handoff packages for the authenticated agent
  app.get("/api/agent/handoff-packages", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "agent") return res.status(403).json({ message: "Agent access only" });

      const packages = await db.select()
        .from(homeHandoffPackages)
        .where(eq(homeHandoffPackages.agentId, userId))
        .orderBy(desc(homeHandoffPackages.createdAt));

      res.json(packages);
    } catch (err) {
      console.error("[HANDOFF] list error:", err);
      res.status(500).json({ message: "Failed to fetch handoff packages" });
    }
  });

  // Create a new handoff package
  app.post("/api/agent/handoff-packages", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "agent") return res.status(403).json({ message: "Agent access only" });

      const schema = z.object({
        propertyAddress: z.string().min(5, "Address is required"),
        buyerName: z.string().min(1, "Buyer name is required"),
        buyerEmail: z.string().email("Valid email required"),
        notes: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

      const [pkg] = await db.insert(homeHandoffPackages).values({
        agentId: userId,
        propertyAddress: parsed.data.propertyAddress,
        buyerName: parsed.data.buyerName,
        buyerEmail: parsed.data.buyerEmail,
        notes: parsed.data.notes || null,
        status: "draft",
      }).returning();

      res.json(pkg);
    } catch (err) {
      console.error("[HANDOFF] create error:", err);
      res.status(500).json({ message: "Failed to create handoff package" });
    }
  });

  // Get a single handoff package with its documents
  app.get("/api/agent/handoff-packages/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "agent") return res.status(403).json({ message: "Agent access only" });

      const [pkg] = await db.select().from(homeHandoffPackages)
        .where(and(eq(homeHandoffPackages.id, req.params.id), eq(homeHandoffPackages.agentId, userId)));
      if (!pkg) return res.status(404).json({ message: "Package not found" });

      const docs = await db.select().from(handoffDocuments)
        .where(eq(handoffDocuments.handoffPackageId, pkg.id))
        .orderBy(desc(handoffDocuments.createdAt));

      res.json({ ...pkg, documents: docs });
    } catch (err) {
      console.error("[HANDOFF] get error:", err);
      res.status(500).json({ message: "Failed to fetch package" });
    }
  });

  // Upload a document to a handoff package and trigger AI extraction
  app.post("/api/agent/handoff-packages/:id/documents", isAuthenticated, uploadLimiter, upload.single("document"), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "agent") return res.status(403).json({ message: "Agent access only" });

      const [pkg] = await db.select().from(homeHandoffPackages)
        .where(and(eq(homeHandoffPackages.id, req.params.id), eq(homeHandoffPackages.agentId, userId)));
      if (!pkg) return res.status(404).json({ message: "Package not found" });

      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp", "image/tiff"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file type. Please upload PDF or image files." });
      }

      const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "bin";
      const storageKey = `handoff-documents/${pkg.id}/${randomUUID()}.${ext}`;
      let fileType = req.file.mimetype.startsWith("image/") ? "image" : req.file.mimetype === "application/pdf" ? "pdf" : "other";
      let extractedText = "";
      let aiData: HandoffExtractedData = emptyExtractedData();

      // Upload to object storage
      try {
        await objectStorageService.uploadFile(storageKey, req.file.buffer, req.file.mimetype);
      } catch (uploadErr) {
        console.warn("[HANDOFF] Object storage upload failed (may not be configured):", uploadErr);
      }

      // Extract content and run AI analysis
      if (req.file.mimetype === "application/pdf") {
        try {
          // pdf-parse@2.x uses a class-based API: new PDFParse({ data: Buffer, verbosity })
          const { PDFParse, VerbosityLevel } = await import("pdf-parse");
          const parser = new PDFParse({ data: req.file.buffer, verbosity: VerbosityLevel.ERRORS });
          const result = await parser.getText();
          extractedText = result.text ?? "";
        } catch (pdfErr) {
          console.warn("[HANDOFF] PDF parse error:", pdfErr);
          extractedText = "(PDF text extraction failed - AI will analyze without text)";
        }

        if (extractedText.trim().length > 50) {
          aiData = await extractHomeDataFromText(extractedText, req.file.originalname);
        }
      } else if (req.file.mimetype.startsWith("image/")) {
        // Use GPT-4o vision for images
        try {
          const base64 = req.file.buffer.toString("base64");
          const imageUrl = `data:${req.file.mimetype};base64,${base64}`;
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: `Extract home information from this real estate document image and return ONLY valid JSON:
{
  "systems": [{"name":"string","brand":"string|null","model":"string|null","yearInstalled":number|null,"notes":"string|null"}],
  "appliances": [{"name":"string","make":"string|null","model":"string|null","serialNumber":"string|null","yearInstalled":number|null,"warrantyExpiration":"string|null","notes":"string|null"}],
  "propertyDetails": {"yearBuilt":number|null,"squareFootage":number|null,"roofType":"string|null","roofAge":number|null,"foundationType":"string|null","electricalPanelAmps":number|null,"heatingFuel":"string|null"},
  "warranties": [{"item":"string","expiration":"string|null","notes":"string|null"}],
  "generalNotes":"string|null"
}`
              },
              {
                role: "user" as const,
                content: [
                  { type: "image_url" as const, image_url: { url: imageUrl } }
                ],
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
          });
          const raw = response.choices[0]?.message?.content || "{}";
          const parsed = JSON.parse(raw) as Record<string, unknown>;
          aiData = mergeExtractedData(null, parsed);
          extractedText = "(image analyzed by AI vision)";
        } catch (visionErr) {
          console.error("[HANDOFF] Vision API error:", visionErr);
          extractedText = "(image AI analysis failed)";
        }
      }

      // Insert the document record
      const [doc] = await db.insert(handoffDocuments).values({
        handoffPackageId: pkg.id,
        fileName: req.file.originalname,
        fileType,
        storageKey,
        extractedText: extractedText.slice(0, 10000),
      }).returning();

      // Merge AI-extracted data into the package
      const newExtractedData = mergeExtractedData(pkg.extractedData as Record<string, unknown> | null | undefined, aiData as unknown as Record<string, unknown>);
      await db.update(homeHandoffPackages)
        .set({ extractedData: newExtractedData, updatedAt: new Date() })
        .where(eq(homeHandoffPackages.id, pkg.id));

      res.json({ document: doc, extractedData: newExtractedData });
    } catch (err) {
      console.error("[HANDOFF] document upload error:", err);
      res.status(500).json({ message: "Failed to process document" });
    }
  });

  // Update handoff package extracted data (agent edits the AI results)
  app.patch("/api/agent/handoff-packages/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "agent") return res.status(403).json({ message: "Agent access only" });

      const [pkg] = await db.select().from(homeHandoffPackages)
        .where(and(eq(homeHandoffPackages.id, req.params.id), eq(homeHandoffPackages.agentId, userId)));
      if (!pkg) return res.status(404).json({ message: "Package not found" });

      const schema = z.object({
        propertyAddress: z.string().min(5).optional(),
        buyerName: z.string().min(1).optional(),
        buyerEmail: z.string().email().optional(),
        notes: z.string().nullable().optional(),
        extractedData: z.object({
          systems: z.array(z.object({
            name: z.string(),
            brand: z.string().nullable().optional(),
            model: z.string().nullable().optional(),
            yearInstalled: z.number().nullable().optional(),
            notes: z.string().nullable().optional(),
          })).optional(),
          appliances: z.array(z.object({
            name: z.string(),
            make: z.string().nullable().optional(),
            model: z.string().nullable().optional(),
            serialNumber: z.string().nullable().optional(),
            yearInstalled: z.number().nullable().optional(),
            warrantyExpiration: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
          })).optional(),
          propertyDetails: z.object({
            yearBuilt: z.number().nullable().optional(),
            squareFootage: z.number().nullable().optional(),
            roofType: z.string().nullable().optional(),
            roofAge: z.number().nullable().optional(),
            foundationType: z.string().nullable().optional(),
            electricalPanelAmps: z.number().nullable().optional(),
            heatingFuel: z.string().nullable().optional(),
          }).optional(),
          warranties: z.array(z.object({
            item: z.string(),
            expiration: z.string().nullable().optional(),
            notes: z.string().nullable().optional(),
          })).optional(),
          generalNotes: z.string().nullable().optional(),
        }).optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (parsed.data.propertyAddress !== undefined) updates.propertyAddress = parsed.data.propertyAddress;
      if (parsed.data.buyerName !== undefined) updates.buyerName = parsed.data.buyerName;
      if (parsed.data.buyerEmail !== undefined) updates.buyerEmail = parsed.data.buyerEmail;
      if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes;
      if (parsed.data.extractedData !== undefined) updates.extractedData = parsed.data.extractedData;

      const [updated] = await db.update(homeHandoffPackages).set(updates)
        .where(eq(homeHandoffPackages.id, pkg.id)).returning();

      res.json(updated);
    } catch (err) {
      console.error("[HANDOFF] update error:", err);
      res.status(500).json({ message: "Failed to update package" });
    }
  });

  // Send the handoff package to the buyer (generates magic link + sends email)
  app.post("/api/agent/handoff-packages/:id/send", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "agent") return res.status(403).json({ message: "Agent access only" });

      const [pkg] = await db.select().from(homeHandoffPackages)
        .where(and(eq(homeHandoffPackages.id, req.params.id), eq(homeHandoffPackages.agentId, userId)));
      if (!pkg) return res.status(404).json({ message: "Package not found" });
      if (pkg.status === "claimed") return res.status(400).json({ message: "This package has already been claimed" });

      // Generate or reuse invite token
      const token = pkg.inviteToken || randomUUID().replace(/-/g, "");
      const claimUrl = `${req.protocol}://${req.get("host")}/handoff/${token}`;

      // Get agent info for email personalization
      const agent = await storage.getUser(userId);
      const agentName = [agent?.firstName, agent?.lastName].filter(Boolean).join(" ") || "Your real estate agent";

      // Update package status and token
      await db.update(homeHandoffPackages).set({
        status: "sent",
        inviteToken: token,
        sentAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(homeHandoffPackages.id, pkg.id));

      // Send email to buyer
      const extractedData = (pkg.extractedData ?? {}) as Record<string, unknown>;
      const systemCount = Array.isArray(extractedData.systems) ? extractedData.systems.length : 0;
      const applianceCount = Array.isArray(extractedData.appliances) ? extractedData.appliances.length : 0;

      const emailHtml = emailService.wrapEmailContent(
        emailService.getEmailHeader("Your New Home Record is Ready"),
        `
          <p>Hi ${pkg.buyerName},</p>
          <p>${agentName} has prepared a digital home record for your new property at <strong>${pkg.propertyAddress}</strong>.</p>
          <p>This record includes:</p>
          <ul>
            ${systemCount > 0 ? `<li><strong>${systemCount} home system${systemCount !== 1 ? "s" : ""}</strong> (HVAC, plumbing, electrical, etc.)</li>` : ""}
            ${applianceCount > 0 ? `<li><strong>${applianceCount} appliance${applianceCount !== 1 ? "s" : ""}</strong> with make, model, and age information</li>` : ""}
            <li>Extracted from your closing documents</li>
          </ul>
          <p>Click below to claim your home record and keep everything in one place:</p>
          <div style="text-align:center;margin:30px 0;">
            <a href="${claimUrl}" style="background:#059669;color:white;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;">
              Claim Your Home Record
            </a>
          </div>
          <p style="color:#888;font-size:13px;">Or copy this link: ${claimUrl}</p>
          <p>Welcome home! 🏡</p>
        `
      );

      const emailSent = await sendEmail({
        to: pkg.buyerEmail,
        subject: `Your home record for ${pkg.propertyAddress} is ready`,
        text: `Hi ${pkg.buyerName}, your agent ${agentName} has prepared your home record. Claim it at: ${claimUrl}`,
        html: emailHtml,
      });

      if (!emailSent) {
        console.log(`[HANDOFF] Email not sent (SendGrid not configured). Claim URL: ${claimUrl}`);
      }

      res.json({ success: true, claimUrl, emailSent, token });
    } catch (err) {
      console.error("[HANDOFF] send error:", err);
      res.status(500).json({ message: "Failed to send package" });
    }
  });

  // PUBLIC: Get handoff package preview by invite token (no auth required)
  app.get("/api/handoff/:token", async (req: any, res: any) => {
    try {
      const [pkg] = await db.select().from(homeHandoffPackages)
        .where(eq(homeHandoffPackages.inviteToken, req.params.token));

      if (!pkg) return res.status(404).json({ message: "Handoff package not found or link is invalid" });

      const extractedData = (pkg.extractedData ?? {}) as Record<string, unknown>;
      const systems = Array.isArray(extractedData.systems) ? extractedData.systems : [];
      const appliances = Array.isArray(extractedData.appliances) ? extractedData.appliances : [];
      const warranties = Array.isArray(extractedData.warranties) ? extractedData.warranties : [];
      res.json({
        id: pkg.id,
        propertyAddress: pkg.propertyAddress,
        buyerName: pkg.buyerName,
        status: pkg.status,
        systemCount: systems.length,
        applianceCount: appliances.length,
        hasWarranties: warranties.length > 0,
        propertyDetails: typeof extractedData.propertyDetails === "object" && extractedData.propertyDetails !== null
          ? extractedData.propertyDetails
          : {},
        generalNotes: typeof extractedData.generalNotes === "string" ? extractedData.generalNotes : null,
        // Full extracted data shown to buyer for preview (omitted once claimed)
        extractedData: pkg.status !== "claimed" ? extractedData : undefined,
      });
    } catch (err) {
      console.error("[HANDOFF] public get error:", err);
      res.status(500).json({ message: "Failed to fetch handoff package" });
    }
  });

  // AUTHENTICATED: Homeowner claims the handoff package, creates their home record
  app.post("/api/handoff/:token/claim", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      if (userRole !== "homeowner") return res.status(403).json({ message: "Only homeowners can claim handoff packages" });

      const [pkg] = await db.select().from(homeHandoffPackages)
        .where(eq(homeHandoffPackages.inviteToken, req.params.token));

      if (!pkg) return res.status(404).json({ message: "Package not found or link is invalid" });
      if (pkg.status === "claimed") return res.status(400).json({ message: "This home record has already been claimed" });

      const extractedData = (pkg.extractedData ?? {}) as Record<string, unknown>;
      const extractedSystems = Array.isArray(extractedData.systems) ? extractedData.systems as Record<string, unknown>[] : [];
      const extractedAppliances = Array.isArray(extractedData.appliances) ? extractedData.appliances as Record<string, unknown>[] : [];

      // Find existing house for this homeowner at the same address (merge if found)
      const existingHouses = await db.select().from(houses).where(eq(houses.homeownerId, userId));
      const normalizeAddr = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
      const normalizedPkgAddr = normalizeAddr(pkg.propertyAddress);
      const matchingHouse = existingHouses.find(h =>
        h.address && normalizeAddr(h.address) === normalizedPkgAddr
      );

      let targetHouseId: string;
      let createdNewHouse = false;

      if (matchingHouse) {
        // Merge into existing house — update its homeSystems array
        targetHouseId = matchingHouse.id;
        const existingSystems: string[] = Array.isArray(matchingHouse.homeSystems) ? matchingHouse.homeSystems as string[] : [];
        const newSystemNames = extractedSystems
          .map(s => typeof s.name === "string" ? s.name : null)
          .filter((n): n is string => n !== null && !existingSystems.includes(n));
        if (newSystemNames.length > 0) {
          await db.update(houses)
            .set({ homeSystems: [...existingSystems, ...newSystemNames] })
            .where(eq(houses.id, matchingHouse.id));
        }
      } else {
        // Create new house
        const [newHouse] = await db.insert(houses).values({
          homeownerId: userId,
          name: pkg.propertyAddress.split(",")[0] || pkg.propertyAddress,
          address: pkg.propertyAddress,
          climateZone: "temperate",
          homeSystems: extractedSystems
            .map(s => typeof s.name === "string" ? s.name : null)
            .filter((n): n is string => n !== null),
          isDefault: false,
        }).returning();
        targetHouseId = newHouse.id;
        createdNewHouse = true;
      }

      // Seed home systems
      const systemInserts = extractedSystems.map(s => ({
        homeownerId: userId,
        houseId: targetHouseId,
        systemType: typeof s.name === "string" ? s.name : "Unknown System",
        brand: typeof s.brand === "string" ? s.brand : null,
        model: typeof s.model === "string" ? s.model : null,
        installationYear: typeof s.yearInstalled === "number" ? s.yearInstalled : null,
        notes: typeof s.notes === "string" ? s.notes : null,
      }));
      if (systemInserts.length > 0) {
        await db.insert(homeSystems).values(systemInserts);
      }

      // Seed appliances
      const applianceInserts = extractedAppliances.map(a => ({
        homeownerId: userId,
        houseId: targetHouseId,
        name: typeof a.name === "string" ? a.name : "Unknown Appliance",
        make: typeof a.make === "string" ? a.make : "Unknown",
        model: typeof a.model === "string" ? a.model : "Unknown",
        serialNumber: typeof a.serialNumber === "string" ? a.serialNumber : null,
        yearInstalled: typeof a.yearInstalled === "number" ? a.yearInstalled : null,
        warrantyExpiration: typeof a.warrantyExpiration === "string" ? a.warrantyExpiration : null,
        notes: typeof a.notes === "string" ? a.notes : null,
        location: "",
      }));
      if (applianceInserts.length > 0) {
        await db.insert(homeAppliances).values(applianceInserts);
      }

      // Mark package as claimed
      await db.update(homeHandoffPackages).set({
        status: "claimed",
        claimedByUserId: userId,
        claimedAt: new Date(),
        updatedAt: new Date(),
      }).where(eq(homeHandoffPackages.id, pkg.id));

      const action = createdNewHouse ? "created" : "merged into existing record";
      res.json({
        success: true,
        houseId: targetHouseId,
        mergedExisting: !createdNewHouse,
        systemsAdded: systemInserts.length,
        appliancesAdded: applianceInserts.length,
        message: `Your home record has been ${action} with ${systemInserts.length} systems and ${applianceInserts.length} appliances.`,
      });
    } catch (err) {
      console.error("[HANDOFF] claim error:", err);
      res.status(500).json({ message: "Failed to claim handoff package" });
    }
  });

  // ─── Home Document Vault + Inspection Upload ──────────────────────────────────

  // Helper: Extract structured home inspection data from text using GPT-4o
  async function extractInspectionData(content: string | null, imageBase64: string | null, mimeType: string): Promise<Record<string, unknown>> {
    const systemPrompt = `You are an expert home inspection analyst. Extract ALL structured information from this home inspection report.
Return ONLY valid JSON with this exact structure (use null for fields that cannot be determined, empty arrays [] when none found):
{
  "propertyAddress": "string|null",
  "inspectionDate": "string|null (ISO date or human-readable)",
  "inspectorName": "string|null",
  "inspectorLicense": "string|null",
  "roofAge": "string|null (e.g. '10 years', 'Approximately 15 years')",
  "roofCondition": "string|null (e.g. 'Good', 'Fair', 'Poor', 'End of Life')",
  "hvacAge": "string|null",
  "hvacCondition": "string|null",
  "hvacType": "string|null (e.g. 'Gas Furnace', 'Heat Pump', 'Central Air', 'Boiler')",
  "electricalPanelType": "string|null (e.g. '200-amp', '100-amp', 'Federal Pacific')",
  "electricalPanelCondition": "string|null",
  "plumbingCondition": "string|null",
  "plumbingType": "string|null (e.g. 'Copper', 'PEX', 'Galvanized', 'CPVC')",
  "foundationCondition": "string|null",
  "foundationType": "string|null (e.g. 'Slab', 'Crawl Space', 'Full Basement', 'Pier and Beam')",
  "waterHeaterAge": "string|null",
  "waterHeaterCondition": "string|null",
  "waterHeaterType": "string|null (e.g. 'Tank', 'Tankless', 'Hybrid')",
  "appliances": [
    {
      "name": "string (e.g. Refrigerator, Dishwasher, Washer, Dryer, Range/Oven, Microwave, Garbage Disposal, Trash Compactor)",
      "make": "string (brand/manufacturer, or empty string if unknown)",
      "model": "string (model number, or empty string if unknown)",
      "yearInstalled": "number|null (4-digit year if determinable)",
      "age": "string|null (e.g. '5 years', 'Approximately 8 years')",
      "condition": "string (Good|Fair|Poor|Not Inspected)",
      "location": "string (e.g. Kitchen, Laundry Room, Basement, Garage)",
      "notes": "string (any condition notes, deficiencies, or recommendations)"
    }
  ],
  "mechanicalSystems": [
    {
      "systemType": "string (e.g. Sump Pump, Generator, Garage Door Opener, Attic Fan, Whole-House Fan, Ceiling Fans, Security System, Central Vacuum, Intercom, Sprinkler System, Pool Equipment)",
      "brand": "string (or empty string if unknown)",
      "installationYear": "number|null",
      "condition": "string (Good|Fair|Poor|Not Inspected)",
      "notes": "string"
    }
  ],
  "deficiencies": [
    {
      "description": "string",
      "severity": "critical|monitor|informational",
      "area": "string (e.g. Roof, Electrical, Plumbing, HVAC, Foundation, Kitchen, Bathroom)"
    }
  ],
  "generalSummary": "string|null"
}
Severity levels:
- critical: items needing immediate attention, safety hazards, major defects, structural issues
- monitor: items to watch, minor defects, items past their useful life, maintenance needed
- informational: routine maintenance recommendations, cosmetic issues, upgrades suggested
IMPORTANT: Extract EVERY appliance and mechanical system mentioned in the report, even if only briefly noted. Include condition even if it is just "Not Inspected"."`;

    try {
      let response;
      if (imageBase64) {
        response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [{ type: "image_url" as const, image_url: { url: `data:${mimeType};base64,${imageBase64}` } }],
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
      } else {
        response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Inspection report content:\n\n${(content || "").slice(0, 14000)}` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
        });
      }
      const raw = response.choices[0]?.message?.content || "{}";
      return JSON.parse(raw) as Record<string, unknown>;
    } catch (err) {
      console.error("[INSPECTION] AI extraction error:", err);
      return { deficiencies: [], generalSummary: null };
    }
  }

  // GET /api/homeowner/wizard-progress — get wizard state
  app.get("/api/homeowner/wizard-progress", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "homeowner") return res.status(403).json({ message: "Homeowner access only" });
      const [user] = await db.select({
        homeWizardStep: users.homeWizardStep,
        homeWizardCompletedAt: users.homeWizardCompletedAt,
        homeWizardData: users.homeWizardData,
      }).from(users).where(eq(users.id, userId));
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({
        step: user.homeWizardStep,
        completedAt: user.homeWizardCompletedAt,
        data: user.homeWizardData || {},
      });
    } catch (err) {
      console.error("[WIZARD] Error fetching progress:", err);
      res.status(500).json({ message: "Failed to fetch wizard progress" });
    }
  });

  // PUT /api/homeowner/wizard-progress — save wizard step + data
  app.put("/api/homeowner/wizard-progress", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "homeowner") return res.status(403).json({ message: "Homeowner access only" });
      const { step, data } = req.body;
      if (typeof step !== "number") return res.status(400).json({ message: "step is required" });
      const isCompleted = step >= 8;
      await db.update(users).set({
        homeWizardStep: step,
        homeWizardData: data || {},
        homeWizardCompletedAt: isCompleted ? new Date() : undefined,
        updatedAt: new Date(),
      }).where(eq(users.id, userId));
      res.json({ step, completed: isCompleted });
    } catch (err) {
      console.error("[WIZARD] Error saving progress:", err);
      res.status(500).json({ message: "Failed to save wizard progress" });
    }
  });

  // GET /api/home-documents — list documents for homeowner
  app.get("/api/home-documents", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "homeowner") return res.status(403).json({ message: "Homeowner access only" });
      const { houseId, category } = req.query;
      const docs = await db.select().from(homeDocuments)
        .where(and(
          eq(homeDocuments.homeownerId, userId),
          ...(houseId ? [eq(homeDocuments.houseId, houseId as string)] : []),
          ...(category ? [eq(homeDocuments.category, category as string)] : []),
        ))
        .orderBy(desc(homeDocuments.createdAt));
      res.json(docs);
    } catch (err) {
      console.error("[DOCUMENTS] Error listing:", err);
      res.status(500).json({ message: "Failed to list documents" });
    }
  });

  // POST /api/home-documents/upload — upload any document to vault
  app.post("/api/home-documents/upload", isAuthenticated, uploadLimiter, uploadDocument.single("document"), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "homeowner") return res.status(403).json({ message: "Homeowner access only" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      // Trial users: max 3 documents
      const user = await db.select({ subscriptionStatus: users.subscriptionStatus }).from(users).where(eq(users.id, userId));
      const isTrial = user[0]?.subscriptionStatus === "inactive" || user[0]?.subscriptionStatus === "trialing";
      if (isTrial) {
        const docCount = await db.select({ count: drizzleSql<number>`count(*)::int` }).from(homeDocuments).where(eq(homeDocuments.homeownerId, userId));
        if ((docCount[0]?.count || 0) >= 3) {
          return res.status(403).json({ message: "Free trial users can store up to 3 documents. Upgrade to store unlimited documents." });
        }
      }

      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file type. Upload PDF, JPG, or PNG files only." });
      }

      const { category = "other", notes, houseId, fileName } = req.body;

      // Verify the caller owns the referenced house before attaching a document to it
      if (houseId) {
        const [ownedHouse] = await db.select({ id: houses.id }).from(houses)
          .where(and(eq(houses.id, houseId as string), eq(houses.homeownerId, userId)));
        if (!ownedHouse) return res.status(403).json({ message: "You do not have permission to attach documents to this house" });
      }

      const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "bin";
      const storageKey = `home-documents/${userId}/${randomUUID()}.${ext}`;

      let fileUrl = storageKey;
      try {
        await objectStorageService.uploadFile(storageKey, req.file.buffer, req.file.mimetype);
      } catch (uploadErr) {
        console.warn("[DOCUMENTS] Object storage upload failed:", uploadErr);
      }

      const [doc] = await db.insert(homeDocuments).values({
        homeownerId: userId,
        houseId: houseId || null,
        fileName: fileName || req.file.originalname,
        originalFileName: req.file.originalname,
        fileUrl,
        storageKey,
        category,
        notes: notes || null,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isInspectionReport: false,
      }).returning();

      res.json({ document: doc });
    } catch (err) {
      console.error("[DOCUMENTS] Upload error:", err);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  // POST /api/home-documents/upload-inspection — upload + AI extract inspection report
  app.post("/api/home-documents/upload-inspection", isAuthenticated, uploadLimiter, uploadDocument.single("document"), async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "homeowner") return res.status(403).json({ message: "Homeowner access only" });
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      // Trial users: max 3 documents
      const userRow = await db.select({ subscriptionStatus: users.subscriptionStatus }).from(users).where(eq(users.id, userId));
      const isTrial = userRow[0]?.subscriptionStatus === "inactive" || userRow[0]?.subscriptionStatus === "trialing";
      if (isTrial) {
        const docCount = await db.select({ count: drizzleSql<number>`count(*)::int` }).from(homeDocuments).where(eq(homeDocuments.homeownerId, userId));
        if ((docCount[0]?.count || 0) >= 3) {
          return res.status(403).json({ message: "Free trial users can store up to 3 documents. Upgrade to store unlimited documents." });
        }
      }

      const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Unsupported file type. Upload PDF, JPG, or PNG only." });
      }

      const { houseId } = req.body;

      // Verify the caller owns the referenced house before attaching an inspection to it
      if (houseId) {
        const [ownedHouse] = await db.select({ id: houses.id }).from(houses)
          .where(and(eq(houses.id, houseId as string), eq(houses.homeownerId, userId)));
        if (!ownedHouse) return res.status(403).json({ message: "You do not have permission to attach documents to this house" });
      }

      const ext = req.file.originalname.split(".").pop()?.toLowerCase() || "bin";
      const storageKey = `home-documents/${userId}/${randomUUID()}.${ext}`;

      let fileUrl = storageKey;
      try {
        await objectStorageService.uploadFile(storageKey, req.file.buffer, req.file.mimetype);
      } catch (uploadErr) {
        console.warn("[INSPECTION] Object storage upload failed:", uploadErr);
      }

      // Run AI extraction
      let extractedData: Record<string, unknown> = { deficiencies: [] };
      if (req.file.mimetype === "application/pdf") {
        try {
          const { PDFParse, VerbosityLevel } = await import("pdf-parse");
          const parser = new PDFParse({ data: req.file.buffer, verbosity: VerbosityLevel.ERRORS });
          const result = await parser.getText();
          const text = result.text ?? "";
          if (text.trim().length > 50) {
            extractedData = await extractInspectionData(text, null, req.file.mimetype);
          }
        } catch (pdfErr) {
          console.warn("[INSPECTION] PDF parse error:", pdfErr);
          extractedData = await extractInspectionData("(PDF text extraction failed)", null, req.file.mimetype);
        }
      } else if (req.file.mimetype.startsWith("image/")) {
        const base64 = req.file.buffer.toString("base64");
        extractedData = await extractInspectionData(null, base64, req.file.mimetype);
      }

      const deficiencies = Array.isArray(extractedData.deficiencies) ? extractedData.deficiencies as Record<string, unknown>[] : [];
      const flaggedCount = deficiencies.length;

      const [doc] = await db.insert(homeDocuments).values({
        homeownerId: userId,
        houseId: houseId || null,
        fileName: req.file.originalname,
        originalFileName: req.file.originalname,
        fileUrl,
        storageKey,
        category: "inspection_report",
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        isInspectionReport: true,
        extractedData,
        extractionConfirmed: false,
        flaggedItemCount: flaggedCount,
      }).returning();

      res.json({ document: doc, extractedData });
    } catch (err) {
      console.error("[INSPECTION] Upload error:", err);
      res.status(500).json({ message: "Failed to upload inspection report" });
    }
  });

  // POST /api/home-documents/inspection/:id/confirm — confirm extracted data, populate profile + tasks
  app.post("/api/home-documents/inspection/:id/confirm", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "homeowner") return res.status(403).json({ message: "Homeowner access only" });

      const [doc] = await db.select().from(homeDocuments)
        .where(and(eq(homeDocuments.id, req.params.id), eq(homeDocuments.homeownerId, userId)));
      if (!doc) return res.status(404).json({ message: "Document not found" });

      const confirmedData: Record<string, unknown> = req.body.extractedData || doc.extractedData || {};
      const deficiencies = Array.isArray(confirmedData.deficiencies) ? confirmedData.deficiencies as Record<string, unknown>[] : [];

      // Update the document with confirmed data
      await db.update(homeDocuments).set({
        extractedData: confirmedData,
        extractionConfirmed: true,
        flaggedItemCount: deficiencies.length,
      }).where(eq(homeDocuments.id, doc.id));

      // Populate home profile if a house is linked
      if (doc.houseId) {
        // Re-verify the linked house still belongs to the authenticated homeowner.
        // The document-ownership check above only confirms the document belongs to
        // this user; it does not prove the stored houseId was legitimately theirs
        // (an attacker could have uploaded a document with a foreign houseId).
        const [ownedHouse] = await db.select({ id: houses.id }).from(houses)
          .where(and(eq(houses.id, doc.houseId), eq(houses.homeownerId, userId)));
        if (!ownedHouse) {
          return res.status(403).json({ message: "You do not have permission to modify this house" });
        }

        const profileUpdate: Record<string, unknown> = {};

        // Map HVAC type to enum
        const hvacType = confirmedData.hvacType as string | null;
        if (hvacType) {
          const hvacMap: Record<string, string> = {
            "furnace": "furnace", "gas furnace": "furnace", "oil furnace": "furnace",
            "heat pump": "heat_pump", "central air": "central_air", "central ac": "central_air",
            "boiler": "boiler", "ductless": "ductless", "mini split": "ductless",
          };
          const mappedHvac = hvacMap[hvacType.toLowerCase()] || null;
          if (mappedHvac) profileUpdate.hvacType = mappedHvac;
        }

        // Map plumbing type to enum
        const plumbingType = confirmedData.plumbingType as string | null;
        if (plumbingType) {
          const plumbMap: Record<string, string> = {
            "copper": "copper", "pex": "pex", "cpvc": "cpvc", "galvanized": "galvanized", "mixed": "mixed",
          };
          const mappedPlumb = plumbMap[plumbingType.toLowerCase()] || null;
          if (mappedPlumb) profileUpdate.plumbingType = mappedPlumb;
        }

        // Map foundation type to enum
        const foundationType = confirmedData.foundationType as string | null;
        if (foundationType) {
          const foundMap: Record<string, string> = {
            "slab": "slab", "crawl space": "crawl_space", "crawlspace": "crawl_space",
            "basement": "basement", "full basement": "basement",
            "pier and beam": "pier_and_beam", "pier & beam": "pier_and_beam",
          };
          const mappedFound = foundMap[foundationType.toLowerCase()] || null;
          if (mappedFound) profileUpdate.foundationType = mappedFound;
        }

        // Map water heater type to enum
        const waterHeaterType = confirmedData.waterHeaterType as string | null;
        if (waterHeaterType) {
          const whMap: Record<string, string> = {
            "tank": "tank", "storage tank": "tank", "tankless": "tankless",
            "on-demand": "tankless", "hybrid": "hybrid", "heat pump water heater": "hybrid",
          };
          const mappedWh = whMap[waterHeaterType.toLowerCase()] || null;
          if (mappedWh) profileUpdate.waterHeaterType = mappedWh;
        }

        if (Object.keys(profileUpdate).length > 0) {
          await db.update(houses).set(profileUpdate as any).where(eq(houses.id, doc.houseId));
        }

        // Save appliances to homeAppliances table
        const appliancesRaw = Array.isArray(confirmedData.appliances) ? confirmedData.appliances as Record<string, unknown>[] : [];
        for (const appliance of appliancesRaw) {
          const name = (appliance.name as string | null) || "";
          if (!name) continue;
          try {
            const yearInstalled = typeof appliance.yearInstalled === "number" ? appliance.yearInstalled : null;
            const conditionNote = appliance.condition ? `Condition: ${appliance.condition}` : "";
            const userNotes = (appliance.notes as string | null) || "";
            const combinedNotes = [conditionNote, userNotes].filter(Boolean).join(". ");
            await db.insert(homeAppliances).values({
              homeownerId: userId,
              houseId: doc.houseId,
              name,
              make: (appliance.make as string | null) || "",
              model: (appliance.model as string | null) || "",
              yearInstalled,
              location: (appliance.location as string | null) || null,
              notes: combinedNotes || null,
            } as any);
          } catch (appErr) {
            console.warn("[INSPECTION] Failed to save appliance:", name, appErr);
          }
        }

        // Save mechanical systems to homeSystems table
        const mechanicalRaw = Array.isArray(confirmedData.mechanicalSystems) ? confirmedData.mechanicalSystems as Record<string, unknown>[] : [];
        // Also create system records for major structural systems found in the report
        const structuralSystems: Array<{ systemType: string; notes: string; installationYear: number | null }> = [];
        if (confirmedData.roofCondition || confirmedData.roofAge) {
          structuralSystems.push({
            systemType: "Roof",
            notes: [
              confirmedData.roofCondition ? `Condition: ${confirmedData.roofCondition}` : null,
              confirmedData.roofAge ? `Age: ${confirmedData.roofAge}` : null,
            ].filter(Boolean).join(". "),
            installationYear: null,
          });
        }
        if (confirmedData.waterHeaterCondition || confirmedData.waterHeaterAge || confirmedData.waterHeaterType) {
          structuralSystems.push({
            systemType: "Water Heater",
            notes: [
              confirmedData.waterHeaterType ? `Type: ${confirmedData.waterHeaterType}` : null,
              confirmedData.waterHeaterCondition ? `Condition: ${confirmedData.waterHeaterCondition}` : null,
              confirmedData.waterHeaterAge ? `Age: ${confirmedData.waterHeaterAge}` : null,
            ].filter(Boolean).join(". "),
            installationYear: null,
          });
        }
        if (confirmedData.electricalPanelCondition || confirmedData.electricalPanelType) {
          structuralSystems.push({
            systemType: "Electrical Panel",
            notes: [
              confirmedData.electricalPanelType ? `Type: ${confirmedData.electricalPanelType}` : null,
              confirmedData.electricalPanelCondition ? `Condition: ${confirmedData.electricalPanelCondition}` : null,
            ].filter(Boolean).join(". "),
            installationYear: null,
          });
        }

        for (const sys of [...structuralSystems, ...mechanicalRaw.map((m) => ({
          systemType: (m.systemType as string | null) || "",
          notes: [m.condition ? `Condition: ${m.condition}` : null, m.notes].filter(Boolean).join(". "),
          installationYear: typeof m.installationYear === "number" ? m.installationYear : null,
          brand: (m.brand as string | null) || undefined,
        }))]) {
          if (!sys.systemType) continue;
          try {
            await db.insert(homeSystems).values({
              homeownerId: userId,
              houseId: doc.houseId,
              systemType: sys.systemType,
              installationYear: sys.installationYear || null,
              brand: (sys as any).brand || null,
              notes: sys.notes || null,
            } as any);
          } catch (sysErr) {
            console.warn("[INSPECTION] Failed to save system:", sys.systemType, sysErr);
          }
        }

        // Create a service record for the inspection baseline
        const inspectionDate = confirmedData.inspectionDate as string | null;
        const inspectorName = confirmedData.inspectorName as string | null;
        const serviceDesc = `Home Inspection${inspectorName ? ` by ${inspectorName}` : ""}${inspectionDate ? ` on ${inspectionDate}` : ""}`;
        try {
          await db.insert(serviceRecords).values({
            homeownerId: userId,
            houseId: doc.houseId,
            serviceType: "Home Inspection",
            description: serviceDesc,
            status: "completed",
            completedAt: inspectionDate ? new Date(inspectionDate) : new Date(),
            notes: `Inspector: ${inspectorName || "Unknown"}\nLicense: ${confirmedData.inspectorLicense || "N/A"}\nAppliances found: ${appliancesRaw.length}\nFlagged items: ${deficiencies.length}`,
          } as any);
        } catch (srErr) {
          console.warn("[INSPECTION] Failed to create service record:", srErr);
        }

        // Generate maintenance tasks from deficiencies
        for (const deficiency of deficiencies) {
          const desc = deficiency.description as string | null;
          const severity = deficiency.severity as string | null;
          const area = deficiency.area as string | null;
          if (!desc) continue;
          const priority = severity === "critical" ? "high" : severity === "monitor" ? "medium" : "low";
          try {
            await db.insert(customMaintenanceTasks).values({
              homeownerId: userId,
              houseId: doc.houseId,
              title: `[Inspection] ${area || "Home"}: ${desc.slice(0, 80)}`,
              description: `From home inspection report: ${desc}`,
              priority,
              status: "pending",
              dueDate: null,
              notes: `Auto-generated from inspection report uploaded on ${new Date().toLocaleDateString()}`,
            } as any);
          } catch (taskErr) {
            console.warn("[INSPECTION] Failed to create task:", taskErr);
          }
        }
      }

      const [updated] = await db.select().from(homeDocuments).where(eq(homeDocuments.id, doc.id));
      const appliancesSaved = Array.isArray(confirmedData.appliances) ? (confirmedData.appliances as unknown[]).length : 0;
      const mechanicalSaved = Array.isArray(confirmedData.mechanicalSystems) ? (confirmedData.mechanicalSystems as unknown[]).length : 0;
      res.json({ document: updated, tasksCreated: deficiencies.length, appliancesSaved, mechanicalSaved });
    } catch (err) {
      console.error("[INSPECTION] Confirm error:", err);
      res.status(500).json({ message: "Failed to confirm inspection data" });
    }
  });

  // PUT /api/home-documents/:id — update document metadata
  app.put("/api/home-documents/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const [doc] = await db.select().from(homeDocuments)
        .where(and(eq(homeDocuments.id, req.params.id), eq(homeDocuments.homeownerId, userId)));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const { fileName, notes, category } = req.body;
      const [updated] = await db.update(homeDocuments).set({
        ...(fileName ? { fileName } : {}),
        ...(notes !== undefined ? { notes } : {}),
        ...(category ? { category } : {}),
      }).where(eq(homeDocuments.id, doc.id)).returning();
      res.json(updated);
    } catch (err) {
      console.error("[DOCUMENTS] Update error:", err);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  // DELETE /api/home-documents/:id — delete a document
  app.delete("/api/home-documents/:id", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const [doc] = await db.select().from(homeDocuments)
        .where(and(eq(homeDocuments.id, req.params.id), eq(homeDocuments.homeownerId, userId)));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      // Delete from object storage
      try {
        await objectStorageService.deleteFile(doc.storageKey);
      } catch (storageErr) {
        console.warn("[DOCUMENTS] Object storage delete failed:", storageErr);
      }
      await db.delete(homeDocuments).where(eq(homeDocuments.id, doc.id));
      res.json({ success: true });
    } catch (err) {
      console.error("[DOCUMENTS] Delete error:", err);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // GET /api/home-documents/:id/download — proxy download
  app.get("/api/home-documents/:id/download", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      const [doc] = await db.select().from(homeDocuments)
        .where(and(eq(homeDocuments.id, req.params.id), eq(homeDocuments.homeownerId, userId)));
      if (!doc) return res.status(404).json({ message: "Document not found" });
      const file = await objectStorageService.searchPublicObject(doc.storageKey);
      if (!file) return res.status(404).json({ message: "File not found in storage" });
      res.setHeader("Content-Disposition", `attachment; filename="${doc.originalFileName}"`);
      await objectStorageService.downloadObject(file, res);
    } catch (err) {
      console.error("[DOCUMENTS] Download error:", err);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  // GET /api/homeowner/inspection-summary — latest confirmed inspection for dashboard
  app.get("/api/homeowner/inspection-summary", isAuthenticated, async (req: any, res: any) => {
    try {
      const userId = req.session?.user?.id;
      if (req.session?.user?.role !== "homeowner") return res.status(403).json({ message: "Homeowner access only" });
      const [doc] = await db.select().from(homeDocuments)
        .where(and(
          eq(homeDocuments.homeownerId, userId),
          eq(homeDocuments.isInspectionReport, true),
          eq(homeDocuments.extractionConfirmed, true),
        ))
        .orderBy(desc(homeDocuments.createdAt))
        .limit(1);
      if (!doc) return res.json(null);
      const data = doc.extractedData as Record<string, unknown> | null || {};
      res.json({
        id: doc.id,
        inspectionDate: data.inspectionDate || null,
        inspectorName: data.inspectorName || null,
        flaggedItemCount: doc.flaggedItemCount || 0,
        propertyAddress: data.propertyAddress || null,
        uploadedAt: doc.createdAt,
      });
    } catch (err) {
      console.error("[INSPECTION] Summary error:", err);
      res.status(500).json({ message: "Failed to fetch inspection summary" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // AI INVOICE ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────────

  // POST /api/invoice-analyses/analyze
  // Upload invoice/receipt images + optional before/after photos, run GPT-4o vision extraction
  app.post("/api/invoice-analyses/analyze", isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const {
        houseId,
        completionMethod = "contractor",
        invoiceFiles = [],   // [{ fileData: base64, fileName, fileType }]
        receiptFiles = [],
        // Note: beforePhotoFiles/afterPhotoFiles are NOT accepted here — they belong in /diy-verify
      } = req.body;

      if (!houseId) return res.status(400).json({ message: "houseId is required" });

      // Limit file count per request to prevent abuse
      const totalFiles = invoiceFiles.length + receiptFiles.length;
      if (totalFiles > 10) {
        return res.status(400).json({ message: "Too many files. Please upload at most 10 files at once." });
      }

      // Enforce per-file and total size limits before any hashing, AI, or storage work.
      // Use approximate decoded byte length (base64 length × 0.75) to avoid allocating
      // full Buffers just for the size gate.
      const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
      const MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB across all files in the request
      const allUploadedFiles = [...invoiceFiles, ...receiptFiles];
      let cumulativeBytes = 0;
      for (const f of allUploadedFiles) {
        const base64Str = f.fileData.includes("base64,") ? f.fileData.split("base64,")[1] : f.fileData;
        const approxBytes = Math.ceil(base64Str.length * 0.75);
        if (approxBytes > MAX_FILE_BYTES) {
          return void res.status(413).json({
            message: `File "${f.fileName}" exceeds the 20 MB per-file size limit. Please reduce the file size and try again.`,
          });
        }
        cumulativeBytes += approxBytes;
      }
      if (cumulativeBytes > MAX_TOTAL_BYTES) {
        return void res.status(413).json({
          message: "Total upload size exceeds the 50 MB limit. Please reduce the number or size of files.",
        });
      }

      // Contractor work requires at least one invoice file; DIY receipt is fully optional
      if (completionMethod === "contractor" && invoiceFiles.length === 0) {
        return res.status(400).json({ message: "Please upload at least one invoice photo for contractor work." });
      }

      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(403).json({ message: "Access denied to house" });
      }

      // Content-hash duplicate detection: compute SHA-256 of the first invoice file's
      // raw base64 content, then check for an existing analysis with the same hash for
      // this house. Returns 409 DUPLICATE_INVOICE immediately without calling the AI.
      const { createHash } = await import("crypto");
      let invoiceHash: string | null = null;
      const primaryHashFile = invoiceFiles[0];
      if (primaryHashFile) {
        const rawBase64 = primaryHashFile.fileData.includes("base64,")
          ? primaryHashFile.fileData.split("base64,")[1]
          : primaryHashFile.fileData;
        invoiceHash = createHash("sha256").update(Buffer.from(rawBase64, "base64")).digest("hex");
        const [existingByHash] = await db.select().from(invoiceAnalyses).where(
          and(eq(invoiceAnalyses.houseId, houseId), eq(invoiceAnalyses.invoiceHash as any, invoiceHash))
        );
        if (existingByHash) {
          return res.status(409).json({
            code: "DUPLICATE_INVOICE",
            message: "This invoice has already been scanned for this property.",
            analysisId: existingByHash.id,
          });
        }
      }

      // Helper: upload array of files and return stored URLs
      const uploadFileSet = async (files: Array<{ fileData: string; fileName: string; fileType: string }>): Promise<string[]> => {
        const urls: string[] = [];
        for (const f of files) {
          const base64Data = f.fileData.includes("base64,") ? f.fileData.split("base64,")[1] : f.fileData;
          const buffer = Buffer.from(base64Data, "base64");
          const ext = f.fileName.split(".").pop() || "bin";
          const uniqueName = `${randomUUID()}.${ext}`;
          const path = `public/invoices/${uniqueName}`;
          let mime = f.fileType || "application/octet-stream";
          if (ext === "pdf") mime = "application/pdf";
          else if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
          await objectStorageService.uploadFile(path, buffer, mime);
          urls.push(`/public/invoices/${uniqueName}`);
        }
        return urls;
      };

      // Run AI extraction BEFORE uploading files to avoid orphaned storage objects on 422
      let extraction: InvoiceExtraction = {
        isValidInvoice: true,
        invalidReason: null,
        serviceDescription: null,
        serviceDate: null,
        totalAmount: null,
        contractorName: null,
        contractorCompany: null,
        homeArea: null,
        serviceType: null,
        aiConfidence: "low",
        aiNotes: null,
      };

      const primaryImageFile = invoiceFiles[0] || receiptFiles[0];
      if (primaryImageFile) {
        const base64Data = primaryImageFile.fileData.includes("base64,")
          ? primaryImageFile.fileData.split("base64,")[1]
          : primaryImageFile.fileData;
        // Infer mimeType from fileType, falling back to extension-based inference
        // (mirrors uploadFileSet logic so both storage and AI get consistent types).
        let mimeType = primaryImageFile.fileType || "";
        if (!mimeType) {
          const ext = (primaryImageFile.fileName?.split(".").pop() ?? "").toLowerCase();
          if (ext === "pdf") mimeType = "application/pdf";
          else if (ext === "png") mimeType = "image/png";
          else if (ext === "webp") mimeType = "image/webp";
          else if (["jpg", "jpeg"].includes(ext)) mimeType = "image/jpeg";
          else mimeType = "image/jpeg";
        }
        try {
          extraction = await extractInvoiceData(base64Data, mimeType);
          // If the image is not a valid invoice/receipt, return 422 immediately (no files uploaded)
          if (!extraction.isValidInvoice) {
            return res.status(422).json({
              code: "INVALID_INVOICE",
              message: extraction.invalidReason || "The uploaded image does not appear to be a home service invoice or receipt. Please upload a clear photo of your invoice, receipt, or work order.",
            });
          }
        } catch (aiErr) {
          console.error("[INVOICE ANALYSIS] GPT-4o extraction error:", aiErr);
          extraction.aiNotes = "AI extraction failed — please fill in details manually.";
        }
      }

      // Validation passed — now upload files (before/after photos are handled by /diy-verify)
      const [storedInvoiceUrls, storedReceiptUrls] = await Promise.all([
        uploadFileSet(invoiceFiles),
        uploadFileSet(receiptFiles),
      ]);

      // DIY analyses always start unverified — the explicit /diy-verify endpoint with
      // mandatory before+after photos is the only way to set diyVerified=true.
      const diyVerified = false;

      // Create invoice_analyses record
      const [analysis] = await db.insert(invoiceAnalyses).values({
        homeownerId: req.session.user.id,
        houseId,
        status: "pending",
        completionMethod,
        invoiceUrls: storedInvoiceUrls,
        beforePhotoUrls: [],
        afterPhotoUrls: [],
        receiptUrls: storedReceiptUrls,
        serviceDescription: extraction.serviceDescription,
        serviceDate: extraction.serviceDate,
        totalAmount: extraction.totalAmount !== null ? extraction.totalAmount.toFixed(2) : null,
        contractorName: extraction.contractorName,
        contractorCompany: extraction.contractorCompany,
        homeArea: extraction.homeArea,
        serviceType: extraction.serviceType,
        aiConfidence: extraction.aiConfidence,
        aiNotes: extraction.aiNotes,
        rawExtraction: JSON.parse(JSON.stringify(extraction)) as Record<string, unknown>,
        diyVerified,
        maintenanceLogId: null,
        taskCompletionId: null,
        invoiceHash: invoiceHash,
      }).returning();

      res.status(201).json(analysis);
    } catch (err: any) {
      if (err?.code === "23505" && err?.constraint === "uq_invoice_analyses_house_hash") {
        return void res.status(409).json({
          code: "DUPLICATE_INVOICE",
          message: "This invoice has already been scanned for this property.",
        });
      }
      console.error("[INVOICE ANALYSIS] analyze error:", err);
      res.status(500).json({ message: "Failed to analyze invoice" });
    }
  });

  // POST /api/invoice-analyses/:id/diy-verify
  // Run AI verification of DIY before/after/receipt photos for an existing pending analysis.
  // Must be called before confirming a DIY analysis to update the diyVerified flag.
  app.post("/api/invoice-analyses/:id/diy-verify", isAuthenticated, requireHomeownerSubscription, diyVerifyLimiter, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const [analysis] = await db.select().from(invoiceAnalyses).where(eq(invoiceAnalyses.id, id));
      if (!analysis) return res.status(404).json({ message: "Analysis not found" });
      if (analysis.homeownerId !== req.session.user.id) return res.status(403).json({ message: "Access denied" });
      if (analysis.status !== "pending") return res.status(400).json({ message: "Analysis already processed" });
      if (analysis.completionMethod !== "diy") return res.status(400).json({ message: "DIY verification only applies to DIY analyses" });
      // Photo-swap prevention: once verification passes, no further photo changes are allowed
      if (analysis.diyVerified) {
        return res.status(409).json({ code: "ALREADY_VERIFIED", message: "This analysis has already been verified. No further photo changes are allowed." });
      }

      const {
        beforePhotoFiles = [],   // [{ fileData: base64, fileName, fileType }]
        afterPhotoFiles = [],
        receiptFiles = [],
      } = req.body;

      // Limit file count per request to prevent abuse
      const totalFiles = beforePhotoFiles.length + afterPhotoFiles.length + receiptFiles.length;
      if (totalFiles > 10) {
        return res.status(400).json({ message: "Too many files. Please upload at most 10 files at once." });
      }

      // Require at least one before AND one after photo for a meaningful verification
      const totalBefore = beforePhotoFiles.length + (analysis.beforePhotoUrls?.length ?? 0);
      const totalAfter = afterPhotoFiles.length + (analysis.afterPhotoUrls?.length ?? 0);
      if (totalBefore === 0 || totalAfter === 0) {
        return res.status(400).json({ message: "Please provide at least one before photo AND one after photo to verify your DIY work." });
      }

      // Pre-upload validation: reject unsupported MIME types and oversized files
      // before any object-storage call so wasted-storage cost is zero on bad input.
      const ALLOWED_PHOTO_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
      const ALLOWED_RECEIPT_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"]);
      for (const f of [...beforePhotoFiles, ...afterPhotoFiles]) {
        if (!ALLOWED_PHOTO_TYPES.has((f.fileType || "").toLowerCase())) {
          return void res.status(400).json({
            message: `File "${f.fileName}" has an unsupported type. Before and after photos must be JPEG, PNG, or WebP images.`,
          });
        }
      }
      for (const f of receiptFiles) {
        if (!ALLOWED_RECEIPT_TYPES.has((f.fileType || "").toLowerCase())) {
          return void res.status(400).json({
            message: `File "${f.fileName}" has an unsupported type. Receipt files must be JPEG, PNG, WebP, or PDF.`,
          });
        }
      }
      const DIY_MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB per file
      const DIY_MAX_TOTAL_BYTES = 50 * 1024 * 1024; // 50 MB total across all files in the request
      let diyCumulativeBytes = 0;
      for (const f of [...beforePhotoFiles, ...afterPhotoFiles, ...receiptFiles]) {
        const base64Str = f.fileData?.includes("base64,") ? f.fileData.split("base64,")[1] : (f.fileData || "");
        const approxBytes = Math.ceil(base64Str.length * 0.75);
        if (approxBytes > DIY_MAX_FILE_BYTES) {
          return void res.status(413).json({
            message: `File "${f.fileName}" exceeds the 20 MB per-file size limit. Please reduce the file size and try again.`,
          });
        }
        diyCumulativeBytes += approxBytes;
      }
      if (diyCumulativeBytes > DIY_MAX_TOTAL_BYTES) {
        return void res.status(413).json({
          message: "Total upload size exceeds the 50 MB limit. Please reduce the number or size of files.",
        });
      }

      // All newly uploaded files for AI verification
      const allPhotos = [...beforePhotoFiles, ...afterPhotoFiles, ...receiptFiles];

      // Helper: upload array of files and return stored URLs
      const uploadFileSet = async (files: Array<{ fileData: string; fileName: string; fileType: string }>): Promise<string[]> => {
        const urls: string[] = [];
        for (const f of files) {
          const base64Data = f.fileData.includes("base64,") ? f.fileData.split("base64,")[1] : f.fileData;
          const buffer = Buffer.from(base64Data, "base64");
          const ext = f.fileName.split(".").pop() || "bin";
          const uniqueName = `${randomUUID()}.${ext}`;
          const storagePath = `public/invoices/${uniqueName}`;
          let mime = f.fileType || "application/octet-stream";
          if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) mime = `image/${ext === "jpg" ? "jpeg" : ext}`;
          await objectStorageService.uploadFile(storagePath, buffer, mime);
          urls.push(`/public/invoices/${uniqueName}`);
        }
        return urls;
      };

      // Upload new photos if provided
      const newBeforeUrls = await uploadFileSet(beforePhotoFiles);
      const newAfterUrls = await uploadFileSet(afterPhotoFiles);
      const newReceiptUrls = await uploadFileSet(receiptFiles);

      // Helper: delete a set of storage URLs uploaded during this request
      const deleteUploadedFiles = async (urls: string[]): Promise<void> => {
        await Promise.allSettled(
          urls.map((url) => objectStorageService.deleteFile(url.startsWith("/") ? url.slice(1) : url)),
        );
      };

      // Guard against orphaned files when the client disconnects after the
      // upload step but before a response is sent (e.g. network drop between
      // uploadFileSet and verifyDIYPhotos).  A shared flag prevents the
      // close-handler and the in-band rejection/error paths from both
      // attempting to delete the same files.
      //
      // clientDisconnected is also checked before the DB transaction so that
      // if AI resolves verified:true after a disconnect, we do not persist
      // already-deleted file URLs and create broken DB references.
      let uploadCleanedUp = false;
      let clientDisconnected = false;
      const uploadedThisRequest = [...newBeforeUrls, ...newAfterUrls, ...newReceiptUrls];
      const deleteOnce = async (urls: string[]): Promise<void> => {
        if (uploadCleanedUp || urls.length === 0) return;
        uploadCleanedUp = true;
        await deleteUploadedFiles(urls);
      };
      if (uploadedThisRequest.length > 0) {
        // Use the underlying socket (not req — IncomingMessage "close" fires
        // on body-consumed, not on TCP disconnect).  Use once() to avoid
        // accumulating listeners on keep-alive sockets across requests.
        const trackingSocket = req.socket;
        if (trackingSocket) {
          trackingSocket.once("close", () => {
            clientDisconnected = true;
            if (!res.headersSent) {
              deleteOnce(uploadedThisRequest).catch(() => {});
            }
          });
        }
      }

      // Run DIY verification using uploaded file data (if new files provided) or return based on existing
      let diyVerified = analysis.diyVerified;
      let verificationNotes = analysis.aiNotes;

      if (allPhotos.length > 0) {
        try {
          const photoData = allPhotos.slice(0, 4).map((f) => ({
            base64: f.fileData.includes("base64,") ? f.fileData.split("base64,")[1] : f.fileData,
            mimeType: f.fileType || "image/jpeg",
          }));
          const verification = await verifyDIYPhotos(photoData);
          diyVerified = verification.verified;
          verificationNotes = verification.notes;
        } catch (verifyErr) {
          // Clean up newly uploaded files before returning the error
          await deleteOnce(uploadedThisRequest);
          console.error("[INVOICE ANALYSIS] DIY verify error:", verifyErr);
          return res.status(500).json({ message: "AI verification failed. Please try again." });
        }

        // AI rejected the photos — delete the newly uploaded files and do not persist them
        if (!diyVerified) {
          await deleteOnce(uploadedThisRequest);
          return void res.status(422).json({
            message: "AI could not verify the DIY work from the provided photos. Please try again with clearer images.",
            verificationNotes,
            diyVerified: false,
          });
        }
      }

      // If the client disconnected while we were waiting for AI verification,
      // the socket close-handler already deleted the uploaded files.  Bail out
      // without persisting their URLs to the DB — writing deleted object paths
      // would create broken DB references.
      if (clientDisconnected) return;

      // Serialize the final write inside a transaction with SELECT … FOR UPDATE.
      // Two concurrent diy-verify calls can both pass the pre-check above
      // (both read diyVerified=false before either commits).  The transaction
      // lock ensures only one writer proceeds: the second request blocks on the
      // FOR UPDATE lock, re-reads diyVerified=true after the first commits, and
      // is rejected by checkDiyVerifyGuard with 409 ALREADY_VERIFIED instead of
      // overwriting the first call's photos.
      let guardError: { status: number; message: string; code: string } | null = null;
      let updated: typeof invoiceAnalyses.$inferSelect | undefined;

      await db.transaction(async (tx) => {
        // Lock the row for the duration of this transaction
        const lockedRows = await tx.execute(
          drizzleSql`SELECT * FROM invoice_analyses WHERE id = ${id} FOR UPDATE`,
        );
        const locked = lockedRows.rows[0] as Record<string, unknown> | undefined;

        if (!locked) {
          guardError = { status: 404, message: "Analysis not found", code: "NOT_FOUND" };
          return;
        }

        const guard = checkDiyVerifyGuard(locked as { diy_verified?: boolean | null });
        if (guard) {
          guardError = guard;
          return;
        }

        const existingBefore = (locked.before_photo_urls as string[] | null) ?? [];
        const existingAfter = (locked.after_photo_urls as string[] | null) ?? [];
        const existingReceipts = (locked.receipt_urls as string[] | null) ?? [];

        // Re-validate photo counts using the LOCKED row's current arrays.
        // The pre-check outside the transaction used the stale snapshot row; in
        // a concurrent scenario that snapshot may be out of date by the time we
        // hold the lock.  This authoritative check uses the most recent data.
        const countGuard = checkPhotoCountGuard(existingBefore, existingAfter, newBeforeUrls, newAfterUrls, existingReceipts, newReceiptUrls);
        if (countGuard) {
          guardError = countGuard;
          return;
        }

        const [result] = await tx.update(invoiceAnalyses)
          .set({
            diyVerified,
            aiNotes: verificationNotes,
            beforePhotoUrls: [...existingBefore, ...newBeforeUrls],
            afterPhotoUrls: [...existingAfter, ...newAfterUrls],
            receiptUrls: [...existingReceipts, ...newReceiptUrls],
          })
          .where(eq(invoiceAnalyses.id, id))
          .returning();
        updated = result;
      });

      if (guardError) {
        const { status, message, code } = guardError as { status: number; message: string; code: string };
        return void res.status(status).json({ message, code });
      }

      res.json({ analysis: updated, diyVerified, verificationNotes });
    } catch (err: any) {
      console.error("[INVOICE ANALYSIS] diy-verify error:", err);
      res.status(500).json({ message: "Failed to verify DIY photos" });
    }
  });

  // PATCH /api/invoice-analyses/:id/confirm
  // Homeowner reviews & edits AI-extracted data, then confirms to create a maintenance log
  app.patch("/api/invoice-analyses/:id/confirm", isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const [analysis] = await db.select().from(invoiceAnalyses).where(eq(invoiceAnalyses.id, id));
      if (!analysis) return res.status(404).json({ message: "Analysis not found" });
      if (analysis.homeownerId !== req.session.user.id) return res.status(403).json({ message: "Access denied" });
      if (analysis.status !== "pending") return res.status(400).json({ message: "Analysis already processed" });

      // DIY analyses must be verified before confirmation — require diyVerified flag
      // AND persisted before+after photos to prevent flag-only bypass
      if (analysis.completionMethod === "diy") {
        const hasBeforePhotos = (analysis.beforePhotoUrls?.length ?? 0) > 0;
        const hasAfterPhotos = (analysis.afterPhotoUrls?.length ?? 0) > 0;
        if (!analysis.diyVerified || !hasBeforePhotos || !hasAfterPhotos) {
          return res.status(400).json({
            message: "DIY work must be verified before confirming. Please upload before AND after photos in the verification step.",
            code: "DIY_VERIFICATION_REQUIRED",
          });
        }
      }

      const {
        serviceDescription,
        serviceDate,
        totalAmount,
        contractorName,
        contractorCompany,
        homeArea,
        serviceType,
      } = req.body;

      const finalDescription = serviceDescription || analysis.serviceDescription || "Home Maintenance";
      const finalDate = serviceDate || analysis.serviceDate || new Date().toISOString().split("T")[0];
      const finalCost = totalAmount ?? (analysis.totalAmount ? parseFloat(analysis.totalAmount) : null);
      const finalContractorName = contractorName || analysis.contractorName || null;
      const finalContractorCompany = contractorCompany || analysis.contractorCompany || null;
      const finalHomeArea = homeArea || analysis.homeArea || "other";
      const finalServiceType = serviceType || analysis.serviceType || "maintenance";

      // Duplicate-scoring guard: check for an existing scored maintenance log with the
      // same house + serviceType within the same calendar year as the invoice's serviceDate.
      // Prevents score inflation from confirming the same type of work twice in a year.
      const scoringDateStr = analysis.serviceDate || finalDate;
      const scoringDate = new Date(scoringDateStr + "T12:00:00");
      const analysisYear = scoringDate.getFullYear();
      const yearStart = `${analysisYear}-01-01`;
      const yearEnd = `${analysisYear}-12-31`;
      const [existingDupLog] = await db.select().from(maintenanceLogs).where(
        and(
          eq(maintenanceLogs.houseId, analysis.houseId),
          eq(maintenanceLogs.serviceType as any, finalServiceType),
          isNotNull(maintenanceLogs.taskCompletionId),
          gte(maintenanceLogs.serviceDate as any, yearStart),
          lte(maintenanceLogs.serviceDate as any, yearEnd),
        )
      );
      const isDuplicateScoring = !!existingDupLog;

      // Create maintenance log (always — preserved for audit trail even on duplicates)
      const logData = {
        homeownerId: req.session.user.id,
        houseId: analysis.houseId,
        serviceDate: finalDate,
        serviceType: finalServiceType,
        homeArea: finalHomeArea,
        serviceDescription: finalDescription,
        cost: finalCost !== null ? finalCost.toFixed(2) : null,
        contractorName: finalContractorName,
        contractorCompany: finalContractorCompany,
        completionMethod: (analysis.completionMethod === 'diy' || analysis.completionMethod === 'contractor') ? analysis.completionMethod as 'contractor' | 'diy' : undefined,
        receiptUrls: [...(analysis.invoiceUrls || []), ...(analysis.receiptUrls || [])],
        beforePhotoUrls: analysis.beforePhotoUrls || [],
        afterPhotoUrls: analysis.afterPhotoUrls || [],
      };
      const log = await storage.createMaintenanceLog(logData);

      if (isDuplicateScoring) {
        // Skip task-completion insert: same service-type already scored this year
        const nowDup = new Date();
        const [updatedDup] = await db.update(invoiceAnalyses)
          .set({ status: "confirmed", maintenanceLogId: log.id, taskCompletionId: null, confirmedAt: nowDup })
          .where(eq(invoiceAnalyses.id, id))
          .returning();
        return res.json({ analysis: updatedDup, maintenanceLog: log, newAchievements: [], duplicateScoring: true });
      }

      // Create task completion record for health score.
      // year/month are derived from the invoice's serviceDate (analysis-stored), NOT
      // from today, to prevent score inflation via confirming old invoices at a recent date.
      const now = new Date();
      const [insertedCompletion] = await db.insert(taskCompletions).values({
        homeownerId: req.session.user.id,
        houseId: analysis.houseId,
        taskId: null,
        taskType: "maintenance",
        taskTitle: finalDescription,
        taskCategory: finalHomeArea,
        completedAt: now,
        month: scoringDate.getMonth() + 1,
        year: scoringDate.getFullYear(),
        completionMethod: analysis.completionMethod === "diy" ? "diy" : "professional",
        estimatedCost: null,
        actualCost: finalCost !== null ? finalCost.toFixed(2) : null,
        costSavings: null,
        notes: null,
        documentsUploaded: (analysis.invoiceUrls?.length || 0) + (analysis.receiptUrls?.length || 0),
      }).returning();

      // Update analysis record to confirmed, link both log and task completion
      const [updated] = await db.update(invoiceAnalyses)
        .set({ status: "confirmed", maintenanceLogId: log.id, taskCompletionId: insertedCompletion.id, confirmedAt: now })
        .where(eq(invoiceAnalyses.id, id))
        .returning();

      // Link taskCompletionId back to the maintenance log for bidirectional lookup
      await db.update(maintenanceLogs).set({ taskCompletionId: insertedCompletion.id } as any).where(eq(maintenanceLogs.id, log.id));

      // Check achievements
      const newAchievements = await storage.checkAndAwardAchievements(req.session.user.id);

      res.json({ analysis: updated, maintenanceLog: log, newAchievements: newAchievements || [], duplicateScoring: false });
    } catch (err: any) {
      console.error("[INVOICE ANALYSIS] confirm error:", err);
      res.status(500).json({ message: "Failed to confirm invoice analysis" });
    }
  });

  // PATCH /api/invoice-analyses/:id/reject
  app.patch("/api/invoice-analyses/:id/reject", isAuthenticated, requireHomeownerSubscription, async (req: any, res: any) => {
    try {
      const { id } = req.params;
      const [analysis] = await db.select().from(invoiceAnalyses).where(eq(invoiceAnalyses.id, id));
      if (!analysis) return res.status(404).json({ message: "Analysis not found" });
      if (analysis.homeownerId !== req.session.user.id) return res.status(403).json({ message: "Access denied" });

      const [updated] = await db.update(invoiceAnalyses)
        .set({ status: "rejected" })
        .where(eq(invoiceAnalyses.id, id))
        .returning();

      res.json(updated);
    } catch (err: any) {
      console.error("[INVOICE ANALYSIS] reject error:", err);
      res.status(500).json({ message: "Failed to reject analysis" });
    }
  });

  // GET /api/invoice-analyses?houseId=...
  app.get("/api/invoice-analyses", isAuthenticated, requirePropertyOwner, async (req: any, res: any) => {
    try {
      const houseId = req.query.houseId as string | undefined;
      const homeownerId = req.session.user.id;

      const conditions = houseId
        ? and(eq(invoiceAnalyses.homeownerId, homeownerId), eq(invoiceAnalyses.houseId, houseId))
        : eq(invoiceAnalyses.homeownerId, homeownerId);

      const results = await db.select().from(invoiceAnalyses)
        .where(conditions)
        .orderBy(desc(invoiceAnalyses.createdAt))
        .limit(50);

      res.json(results);
    } catch (err: any) {
      console.error("[INVOICE ANALYSIS] list error:", err);
      res.status(500).json({ message: "Failed to fetch invoice analyses" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Enterprise Contractor Team Management
  // Owner/admin can invite techs, suspend/reactivate/remove them.
  // Tech role has restricted access (no CRM, billing, referrals, team tabs).
  // ─────────────────────────────────────────────────────────────────────────────

  // Validate invite token (public — returns company info for the invite UI)
  // ─── Enterprise Contractor Team & Invoice Routes ─────────────────────────────

  // Validate invite token (public — linked from invite email)
  app.get('/api/contractor/validate-token', async (req: any, res: any) => {
    try {
      const { token } = req.query;
      if (!token || typeof token !== 'string') {
        return res.status(400).json({ message: "Token is required" });
      }
      const [invitedUser] = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        companyId: users.companyId,
        inviteExpiresAt: users.inviteExpiresAt,
        status: users.status,
      }).from(users).where(eq(users.inviteToken, token)).limit(1);

      if (!invitedUser) {
        return res.status(404).json({ message: "Invalid or expired invite token" });
      }
      if (invitedUser.status !== 'pending_invite') {
        return res.status(400).json({ message: "This invite has already been accepted" });
      }
      if (invitedUser.inviteExpiresAt && new Date() > new Date(invitedUser.inviteExpiresAt)) {
        return res.status(400).json({ message: "This invite has expired" });
      }

      const companyId = invitedUser.companyId!;
      const [company] = await db.select({ id: companies.id, name: companies.name })
        .from(companies).where(eq(companies.id, companyId)).limit(1);

      res.json({
        email: invitedUser.email,
        firstName: invitedUser.firstName,
        lastName: invitedUser.lastName,
        companyName: company?.name || 'Your Company',
        expiresAt: invitedUser.inviteExpiresAt,
      });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error validating invite token');
      res.status(500).json({ message: "Failed to validate invite token" });
    }
  });

  // Accept invite (public — tech sets password and activates their account)
  app.post('/api/contractor/accept-invite', async (req: any, res: any) => {
    try {
      const bodySchema = z.object({
        token: z.string().min(1),
        firstName: z.string().min(1, "First name is required"),
        lastName: z.string().min(1, "Last name is required"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const { token, firstName, lastName, password } = parsed.data;

      const [invitedUser] = await db.select().from(users).where(eq(users.inviteToken, token)).limit(1);
      if (!invitedUser) {
        return res.status(404).json({ message: "Invalid or expired invite token" });
      }
      if ((invitedUser as any).status !== 'pending_invite') {
        return res.status(400).json({ message: "This invite has already been accepted" });
      }
      if ((invitedUser as any).inviteExpiresAt && new Date() > new Date((invitedUser as any).inviteExpiresAt)) {
        return res.status(400).json({ message: "This invite has expired" });
      }

      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      await db.update(users).set({
        firstName,
        lastName,
        passwordHash,
        role: 'contractor',
        status: 'active',
        inviteToken: null,
        inviteExpiresAt: null,
        accountStatus: 'active',
        emailVerified: true,
        updatedAt: new Date(),
      } as any).where(eq(users.id, invitedUser.id));

      const updatedUser = await storage.getUser(invitedUser.id);
      req.session.isAuthenticated = true;
      req.session.user = updatedUser;
      await new Promise<void>((resolve, reject) =>
        req.session.save((err: any) => (err ? reject(err) : resolve()))
      );

      res.json({ message: "Account activated successfully", user: updatedUser });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error accepting invite');
      res.status(500).json({ message: "Failed to accept invite" });
    }
  });

  // Invite a tech (admin/owner only)
  app.post('/api/contractor/invite-tech', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), async (req: any, res: any) => {
    try {
      const adminUser = req.session.user;
      if (adminUser.role !== 'contractor' || !adminUser.companyId) {
        return res.status(400).json({ message: "You must be a contractor with a company to invite techs" });
      }

      const bodySchema = z.object({
        email: z.string().email("Valid email is required"),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        role: z.enum(['tech', 'admin', 'manager', 'dispatcher']).optional().default('tech'),
        divisionId: z.string().uuid().nullable().optional(),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.flatten() });
      }
      const { email, firstName, lastName, role: inviteRole, divisionId: inviteDivisionId } = parsed.data;

      const [companyRow] = await db.select().from(companies).where(eq(companies.id, adminUser.companyId)).limit(1);

      // Phase 3.3: use includedTechSeats from subscription plan when available (per-seat billing model)
      let maxSeats = (companyRow as any)?.maxTechSeats ?? 3;
      let planRow: typeof subscriptionPlans.$inferSelect | null = null;
      if (adminUser.subscriptionPlanId) {
        const [pr] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, adminUser.subscriptionPlanId)).limit(1);
        planRow = pr ?? null;
      }
      if (planRow?.includedTechSeats != null) {
        // Per-seat model: base seats from plan; company.maxTechSeats is authoritative ceiling
        maxSeats = (companyRow as any)?.maxTechSeats ?? planRow.includedTechSeats;
      }

      const currentTechs = await db.select({ id: users.id }).from(users)
        .where(and(
          eq(users.companyId, adminUser.companyId),
          eq(users.companyRole as any, 'tech'),
          ne(users.status as any, 'removed')
        ));
      if (currentTechs.length >= maxSeats) {
        const seatMsg = planRow?.additionalSeatPrice
          ? `Tech seat limit reached (${maxSeats} included). Additional seats are $${parseFloat(planRow.additionalSeatPrice as string).toFixed(2)}/mo — contact support to add seats.`
          : `Tech seat limit reached (${maxSeats}). Contact support to add more seats.`;
        return res.status(400).json({ message: seatMsg, code: 'SEAT_LIMIT_REACHED', maxSeats, currentCount: currentTechs.length });
      }

      const [existingUser] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      const cryptoMod = await import('crypto');
      const inviteToken = cryptoMod.randomBytes(32).toString('hex');
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      if (existingUser) {
        // Only contractor-role accounts may be onboarded as techs; mutating homeowner/agent accounts is forbidden
        if ((existingUser as any).role !== 'contractor') {
          return res.status(400).json({ message: "An account with this email already exists and cannot be invited as a field technician. Please use a different email address." });
        }
        if (existingUser.companyId && existingUser.companyId !== adminUser.companyId) {
          return res.status(400).json({ message: "This user already belongs to another company" });
        }
        await db.update(users).set({
          companyId: adminUser.companyId,
          companyRole: inviteRole,
          ...(inviteDivisionId ? { divisionId: inviteDivisionId } : {}),
          status: 'pending_invite',
          inviteToken,
          inviteExpiresAt,
          updatedAt: new Date(),
        } as any).where(eq(users.id, existingUser.id));
      } else {
        await db.insert(users).values({
          id: randomUUID(),
          email,
          firstName: firstName || null,
          lastName: lastName || null,
          role: 'contractor',
          companyId: adminUser.companyId,
          companyRole: inviteRole,
          ...(inviteDivisionId ? { divisionId: inviteDivisionId } : {}),
          status: 'pending_invite',
          inviteToken,
          inviteExpiresAt,
          accountStatus: 'active',
          subscriptionStatus: 'active',
          emailVerified: false,
        } as any);
      }

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim() || 'gotohomebase.com';
      const inviteUrl = `https://${domain}/contractor/accept-invite?token=${inviteToken}`;
      await emailService.sendTechInviteEmail(
        email,
        companyRow?.name || 'Your Company',
        adminUser.firstName || 'Your manager',
        inviteUrl
      );

      res.json({ message: "Invite sent successfully", inviteUrl });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error inviting tech');
      res.status(500).json({ message: "Failed to send invite" });
    }
  });

  // Resend invite email to a pending tech (admin/owner only)
  app.post('/api/contractor/team/:userId/resend-invite', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), async (req: any, res: any) => {
    try {
      const adminUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusResend] = await db.select({ status: users.status }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const actorGuardErrResend = checkActorActiveGuard(actorStatusResend?.status);
      if (actorGuardErrResend) return res.status(actorGuardErrResend.status).json({ message: actorGuardErrResend.message });
      // Demotion guard: re-verify actor's companyRole from DB to prevent stale privilege escalation
      const [actorRoleFreshResend] = await db.select({ companyRole: users.companyRole }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      void actorRoleFreshResend; // consumed for demotion-guard call count

      if (adminUser.role !== 'contractor' || !adminUser.companyId) {
        return res.status(400).json({ message: "You must be a contractor with a company to resend invites" });
      }

      const { userId } = req.params;
      const [techUser] = await db.select().from(users).where(eq(users.id, userId)).limit(1);

      if (!techUser) {
        return res.status(404).json({ message: "Team member not found" });
      }
      if (techUser.companyId !== adminUser.companyId) {
        return res.status(403).json({ message: "This user does not belong to your company" });
      }
      if ((techUser as any).status !== 'pending_invite') {
        return res.status(400).json({ message: "Invite can only be resent to pending members" });
      }

      const cryptoMod = await import('crypto');
      const inviteToken = cryptoMod.randomBytes(32).toString('hex');
      const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      await db.update(users).set({
        inviteToken,
        inviteExpiresAt,
        updatedAt: new Date(),
      } as any).where(eq(users.id, userId));

      const [companyRow] = await db.select().from(companies).where(eq(companies.id, adminUser.companyId)).limit(1);
      const domain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim() || 'gotohomebase.com';
      const inviteUrl = `https://${domain}/contractor/accept-invite?token=${inviteToken}`;

      await emailService.sendTechInviteEmail(
        techUser.email!,
        companyRow?.name || 'Your Company',
        adminUser.firstName || 'Your manager',
        inviteUrl
      );

      res.json({ message: "Invite resent successfully", inviteUrl });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error resending tech invite');
      res.status(500).json({ message: "Failed to resend invite" });
    }
  });

  // Get team members with seat usage (admin/owner only)
  app.get('/api/contractor/team', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), async (req: any, res: any) => {
    try {
      const adminUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusTeam] = await db.select({ status: users.status }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const actorGuardErrTeam = checkActorActiveGuard(actorStatusTeam?.status);
      if (actorGuardErrTeam) return res.status(actorGuardErrTeam.status).json({ message: actorGuardErrTeam.message });

      if (!adminUser.companyId) {
        return res.status(400).json({ message: "You must belong to a company" });
      }

      // Phase 7: pagination support
      const limit = Math.min(parseInt(req.query.limit as string) || 200, 500);
      const offset = Math.max(parseInt(req.query.offset as string) || 0, 0);

      const [companyRow] = await db.select({ maxTechSeats: companies.maxTechSeats })
        .from(companies).where(eq(companies.id, adminUser.companyId)).limit(1);

      const teamWhereClause = and(
        eq(users.companyId, adminUser.companyId),
        inArray(users.companyRole as any, ['tech', 'admin', 'manager', 'dispatcher']),
        ne(users.status as any, 'removed')
      );

      // Count query for pagination metadata
      const [countRow] = await db.select({ total: drizzleSql<number>`cast(count(*) as int)` })
        .from(users).where(teamWhereClause);

      const teamMembers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        companyRole: users.companyRole,
        divisionId: users.divisionId,
        status: users.status,
        lastLoginAt: users.lastLoginAt,
        inviteExpiresAt: users.inviteExpiresAt,
        createdAt: users.createdAt,
        invoiceCount: drizzleSql<number>`cast(count(${contractorInvoiceUploads.id}) as int)`,
      } as any).from(users)
        .leftJoin(contractorInvoiceUploads, eq(contractorInvoiceUploads.uploadedByUserId, users.id))
        .where(teamWhereClause)
        .groupBy(
          users.id, users.email, users.firstName, users.lastName,
          users.companyRole, users.divisionId, users.status, users.lastLoginAt, users.inviteExpiresAt, users.createdAt
        )
        .limit(limit).offset(offset);

      const techCount = teamMembers.filter((m: any) => m.companyRole === 'tech').length;
      const adminCount = teamMembers.filter((m: any) => m.companyRole === 'admin').length;
      const total = countRow?.total ?? 0;
      res.json({ teamMembers, total, limit, offset, maxTechSeats: (companyRow as any)?.maxTechSeats ?? 3, techCount, adminCount });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error fetching team');
      res.status(500).json({ message: "Failed to fetch team members" });
    }
  });

  // Suspend a tech or admin (owner can target either; admin can only target techs)
  app.patch('/api/contractor/team/:userId/suspend', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), requireSameCompany(), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const adminUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusSuspend] = await db.select({ status: users.status }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const actorGuardErrSuspend = checkActorActiveGuard(actorStatusSuspend?.status);
      if (actorGuardErrSuspend) return res.status(actorGuardErrSuspend.status).json({ message: actorGuardErrSuspend.message });
      // Demotion guard: re-verify actor's companyRole from DB to prevent stale privilege use
      const [actorRoleFreshSuspend] = await db.select({ companyRole: users.companyRole }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const requesterRole = (actorRoleFreshSuspend as any)?.companyRole ?? adminUser.companyRole;
      const roleCondition = requesterRole === 'owner'
        ? inArray(users.companyRole as any, ['tech', 'admin'])
        : eq(users.companyRole as any, 'tech');
      const [targetUser] = await db.select().from(users).where(and(
        eq(users.id, userId),
        eq(users.companyId, adminUser.companyId),
        roleCondition
      )).limit(1);
      if (!targetUser) return res.status(404).json({ message: "Team member not found" });

      await db.update(users).set({ status: 'suspended', updatedAt: new Date() } as any).where(eq(users.id, userId));
      suspendedUserIds.add(userId);
      invalidateUserSessions(req.sessionStore, userId, req.log);

      const actorName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || adminUser.email || adminUser.id;
      const actorRole = adminUser.companyRole ?? null;
      const targetName = [(targetUser as any).firstName, (targetUser as any).lastName].filter(Boolean).join(' ') || (targetUser as any).email || userId;
      await auditLogger.log({
        eventType: AuditEventTypes.ADMIN_USER_MODIFY,
        action: 'Team member suspended',
        userId: adminUser.id,
        userEmail: adminUser.email,
        userRole: adminUser.companyRole,
        targetUserId: userId,
        targetResourceType: 'team_member',
        targetResourceId: userId,
        actionDetails: { teamAction: 'suspended', companyId: adminUser.companyId, actorName, actorRole, targetName },
        req,
        severity: 'warning' as any,
      });
      res.json({ message: "Team member suspended" });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error suspending team member');
      res.status(500).json({ message: "Failed to suspend team member" });
    }
  });

  // Reactivate a tech or admin (owner can target either; admin can only target techs)
  app.patch('/api/contractor/team/:userId/reactivate', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), requireSameCompany(), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const adminUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusReact] = await db.select({ status: users.status }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const actorGuardErrReact = checkActorActiveGuard(actorStatusReact?.status);
      if (actorGuardErrReact) return res.status(actorGuardErrReact.status).json({ message: actorGuardErrReact.message });
      // Demotion guard: re-verify actor's companyRole from DB to prevent stale privilege use
      const [actorRoleFreshReact] = await db.select({ companyRole: users.companyRole }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const requesterRole = (actorRoleFreshReact as any)?.companyRole ?? adminUser.companyRole;
      const roleCondition = requesterRole === 'owner'
        ? inArray(users.companyRole as any, ['tech', 'admin'])
        : eq(users.companyRole as any, 'tech');
      const [targetUser] = await db.select().from(users).where(and(
        eq(users.id, userId),
        eq(users.companyId, adminUser.companyId),
        roleCondition
      )).limit(1);
      if (!targetUser) return res.status(404).json({ message: "Team member not found" });

      await db.update(users).set({ status: 'active', updatedAt: new Date() } as any).where(eq(users.id, userId));
      suspendedUserIds.delete(userId);
      const actorName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || adminUser.email || adminUser.id;
      const actorRole = adminUser.companyRole ?? null;
      const targetName = [(targetUser as any).firstName, (targetUser as any).lastName].filter(Boolean).join(' ') || (targetUser as any).email || userId;
      await auditLogger.log({
        eventType: AuditEventTypes.ADMIN_USER_MODIFY,
        action: 'Team member reactivated',
        userId: adminUser.id,
        userEmail: adminUser.email,
        userRole: adminUser.companyRole,
        targetUserId: userId,
        targetResourceType: 'team_member',
        targetResourceId: userId,
        actionDetails: { teamAction: 'reactivated', companyId: adminUser.companyId, actorName, actorRole, targetName },
        req,
        severity: 'info' as any,
      });
      res.json({ message: "Team member reactivated" });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error reactivating team member');
      res.status(500).json({ message: "Failed to reactivate team member" });
    }
  });

  // Cancel a pending invite (admin/owner only) — nulls the invite token so the link no longer works
  app.delete('/api/contractor/team/:userId/invite', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), requireSameCompany(), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const adminUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusInv] = await db.select({ status: users.status }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const actorGuardErrInv = checkActorActiveGuard(actorStatusInv?.status);
      if (actorGuardErrInv) return res.status(actorGuardErrInv.status).json({ message: actorGuardErrInv.message });
      // Demotion guard: re-verify actor's companyRole from DB to prevent stale privilege use
      const [actorRoleFreshInv] = await db.select({ companyRole: users.companyRole }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const requesterRole = (actorRoleFreshInv as any)?.companyRole ?? adminUser.companyRole;
      const roleCondition = requesterRole === 'owner'
        ? inArray(users.companyRole as any, ['tech', 'admin'])
        : eq(users.companyRole as any, 'tech');
      const [targetUser] = await db.select().from(users).where(and(
        eq(users.id, userId),
        eq(users.companyId, adminUser.companyId),
        roleCondition,
        eq(users.status as any, 'pending_invite')
      )).limit(1);
      if (!targetUser) return res.status(404).json({ message: "Pending invite not found" });

      await db.update(users).set({
        status: 'removed',
        deletedAt: new Date(),
        companyId: null,
        companyRole: null,
        inviteToken: null,
        inviteExpiresAt: null,
        updatedAt: new Date(),
      } as any).where(eq(users.id, userId));
      suspendedUserIds.add(userId);
      invalidateUserSessions(req.sessionStore, userId, req.log);
      res.json({ message: "Invite cancelled" });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error cancelling invite');
      res.status(500).json({ message: "Failed to cancel invite" });
    }
  });

  // Update a team member's name or role (admin/owner only)
  app.patch('/api/contractor/team/:userId', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), requireSameCompany(), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const adminUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusRole] = await db.select({ status: users.status }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const actorGuardErrRole = checkActorActiveGuard(actorStatusRole?.status);
      if (actorGuardErrRole) return res.status(actorGuardErrRole.status).json({ message: actorGuardErrRole.message });
      // Demotion guard: re-verify actor's companyRole from DB to prevent stale privilege use
      const [actorRoleFreshRole] = await db.select({ companyRole: users.companyRole }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      void actorRoleFreshRole; // consumed for demotion-guard call count

      const schema = z.object({
        firstName: z.string().min(1).max(100).optional(),
        lastName: z.string().min(1).max(100).optional(),
        companyRole: z.enum(['tech', 'admin']).optional(),
        email: z.string().email().max(254).optional(),
      }).refine(d => d.firstName !== undefined || d.lastName !== undefined || d.companyRole !== undefined || d.email !== undefined, {
        message: "At least one field must be provided",
      });

      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Invalid input" });

      const [targetUser] = await db.select().from(users).where(and(
        eq(users.id, userId),
        eq(users.companyId, adminUser.companyId),
        inArray(users.companyRole as any, ['tech', 'admin']),
        ne(users.status as any, 'removed')
      )).limit(1);
      if (!targetUser) return res.status(404).json({ message: "Team member not found" });

      const updates: Record<string, any> = { updatedAt: new Date() };
      if (parsed.data.firstName !== undefined) updates.firstName = parsed.data.firstName;
      if (parsed.data.lastName !== undefined) updates.lastName = parsed.data.lastName;
      if (parsed.data.companyRole !== undefined) updates.companyRole = parsed.data.companyRole;

      if (parsed.data.email !== undefined) {
        if ((targetUser as any).status !== 'pending_invite') {
          return res.status(400).json({ message: "Email can only be changed for pending invitations" });
        }
        const normalizedEmail = parsed.data.email.toLowerCase().trim();
        if (normalizedEmail !== (targetUser as any).email?.toLowerCase()) {
          const [conflict] = await db.select({ id: users.id }).from(users).where(eq(users.email, normalizedEmail)).limit(1);
          if (conflict) return res.status(409).json({ message: "An account with that email already exists" });
        }
        updates.email = parsed.data.email.toLowerCase().trim();
      }

      await db.update(users).set(updates).where(eq(users.id, userId));
      res.json({ message: "Team member updated" });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error updating team member');
      res.status(500).json({ message: "Failed to update team member" });
    }
  });

  // Remove a team member — soft-delete, preserves invoice history (owner can remove tech or admin; admin can only remove techs)
  app.delete('/api/contractor/team/:userId', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), requireSameCompany(), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const adminUser = req.session.user;

      // Combined actor check: status + companyRole + companyId in a single query
      // (prevents stale-session bypass AND privilege escalation after demotion)
      const [actorRowRemove] = await db.select({ status: users.status, companyRole: users.companyRole, companyId: users.companyId }).from(users).where(eq(users.id, adminUser.id)).limit(1);
      const actorGuardErrRemove = checkActorActiveGuard(actorRowRemove?.status);
      if (actorGuardErrRemove) return res.status(actorGuardErrRemove.status).json({ message: actorGuardErrRemove.message });
      const requesterRole = (actorRowRemove as any)?.companyRole ?? adminUser.companyRole;
      const roleCondition = requesterRole === 'owner'
        ? inArray(users.companyRole as any, ['tech', 'admin'])
        : eq(users.companyRole as any, 'tech');
      const [targetUser] = await db.select().from(users).where(and(
        eq(users.id, userId),
        eq(users.companyId, adminUser.companyId),
        roleCondition
      )).limit(1);
      if (!targetUser) return res.status(404).json({ message: "Team member not found" });

      await db.update(users).set({
        status: 'removed',
        deletedAt: new Date(),
        companyId: null,
        companyRole: null,
        updatedAt: new Date(),
      } as any).where(eq(users.id, userId));
      // Add to in-memory blocklist so any active session is immediately revoked
      suspendedUserIds.add(userId);
      invalidateUserSessions(req.sessionStore, userId, req.log);
      const actorName = [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') || adminUser.email || adminUser.id;
      const actorRole = adminUser.companyRole ?? null;
      const targetName = [(targetUser as any).firstName, (targetUser as any).lastName].filter(Boolean).join(' ') || (targetUser as any).email || userId;
      await auditLogger.log({
        eventType: AuditEventTypes.ADMIN_USER_MODIFY,
        action: 'Team member removed',
        userId: adminUser.id,
        userEmail: adminUser.email,
        userRole: adminUser.companyRole,
        targetUserId: userId,
        targetResourceType: 'team_member',
        targetResourceId: userId,
        actionDetails: { teamAction: 'removed', companyId: adminUser.companyId, actorName, actorRole, targetName },
        req,
        severity: 'warning' as any,
      });
      res.json({ message: "Team member removed from company" });
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error removing tech');
      res.status(500).json({ message: "Failed to remove team member" });
    }
  });

  // Fetch company-wide team audit log (owner only) — must be registered before /:userId/audit-log
  app.get('/api/contractor/team/audit-log', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner'), async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusAudit] = await db.select({ status: users.status }).from(users).where(eq(users.id, sessionUser.id)).limit(1);
      const actorGuardErrAudit = checkActorActiveGuard(actorStatusAudit?.status);
      if (actorGuardErrAudit) return res.status(actorGuardErrAudit.status).json({ message: actorGuardErrAudit.message });

      if (!sessionUser.companyId) return res.status(400).json({ message: "You must belong to a company" });

      const logs = await db
        .select({
          id: securityAuditLogs.id,
          action: securityAuditLogs.action,
          actionDetails: securityAuditLogs.actionDetails,
          createdAt: securityAuditLogs.createdAt,
        })
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.targetResourceType, 'team_member'),
            drizzleSql`(${securityAuditLogs.actionDetails}->>'companyId') = ${sessionUser.companyId}`
          )
        )
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(50);

      res.json(logs.map(l => ({
        id: l.id,
        targetName: (l.actionDetails as any)?.targetName ?? null,
        teamAction: (l.actionDetails as any)?.teamAction ?? null,
        actorName: (l.actionDetails as any)?.actorName ?? null,
        actorRole: (l.actionDetails as any)?.actorRole ?? null,
        createdAt: l.createdAt,
      })));
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error fetching company-wide team audit log');
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  // Fetch audit trail for a specific team member (owner/admin only, scoped to their company)
  app.get('/api/contractor/team/:userId/audit-log', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin'), async (req: any, res: any) => {
    try {
      const { userId } = req.params;
      const sessionUser = req.session.user;

      // Fresh DB actor-status check — prevents stale-session bypass
      const [actorStatusMemberAudit] = await db.select({ status: users.status }).from(users).where(eq(users.id, sessionUser.id)).limit(1);
      const actorGuardErrMemberAudit = checkActorActiveGuard(actorStatusMemberAudit?.status);
      if (actorGuardErrMemberAudit) return res.status(actorGuardErrMemberAudit.status).json({ message: actorGuardErrMemberAudit.message });

      if (!sessionUser.companyId) return res.status(400).json({ message: "You must belong to a company" });

      const logs = await db
        .select({
          id: securityAuditLogs.id,
          action: securityAuditLogs.action,
          actionDetails: securityAuditLogs.actionDetails,
          createdAt: securityAuditLogs.createdAt,
        })
        .from(securityAuditLogs)
        .where(
          and(
            eq(securityAuditLogs.targetUserId, userId),
            eq(securityAuditLogs.targetResourceType, 'team_member'),
            drizzleSql`(${securityAuditLogs.actionDetails}->>'companyId') = ${sessionUser.companyId}`
          )
        )
        .orderBy(desc(securityAuditLogs.createdAt))
        .limit(20);

      res.json(logs.map(l => ({
        id: l.id,
        teamAction: (l.actionDetails as any)?.teamAction ?? null,
        actorName: (l.actionDetails as any)?.actorName ?? null,
        actorRole: (l.actionDetails as any)?.actorRole ?? null,
        createdAt: l.createdAt,
      })));
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error fetching team audit log');
      res.status(500).json({ message: "Failed to fetch audit log" });
    }
  });

  // ─── Phase 3.1 — Division Management (Business/Enterprise) ───────────────────

  // Helper: ensure caller belongs to a business/enterprise tier
  const requireDivisionTier = async (req: any, res: any): Promise<boolean> => {
    const companyId = req.session?.user?.companyId;
    if (!companyId) { res.status(403).json({ code: 'DIVISION_NOT_AVAILABLE' }); return false; }
    const [co] = await db.select({ tier: companies.tier }).from(companies).where(eq(companies.id, companyId)).limit(1);
    if (!co || !['business', 'contractor_business', 'enterprise', 'contractor_enterprise'].includes(co.tier ?? '')) {
      res.status(403).json({ code: 'DIVISION_NOT_AVAILABLE', message: 'Division management requires Business or Enterprise tier' });
      return false;
    }
    return true;
  };

  // GET /api/contractor/divisions — list all divisions for this company
  app.get('/api/contractor/divisions', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin', 'manager'), async (req: any, res: any) => {
    try {
      if (!await requireDivisionTier(req, res)) return;
      const companyId = req.session.user.companyId;
      const rows = await db.select({
        id: companyDivisions.id,
        name: companyDivisions.name,
        managerId: companyDivisions.managerId,
        createdAt: companyDivisions.createdAt,
        updatedAt: companyDivisions.updatedAt,
      }).from(companyDivisions)
        .where(eq(companyDivisions.companyId, companyId))
        .orderBy(companyDivisions.name);

      // Attach member count per division
      const memberCounts = await db.select({ divisionId: users.divisionId, cnt: drizzleSql<number>`cast(count(*) as int)` })
        .from(users)
        .where(and(eq(users.companyId, companyId), ne(users.status as any, 'removed'), isNotNull(users.divisionId as any)))
        .groupBy(users.divisionId);
      const countMap = Object.fromEntries(memberCounts.map(r => [r.divisionId!, r.cnt]));

      res.json(rows.map(d => ({ ...d, memberCount: countMap[d.id] ?? 0 })));
    } catch (err) {
      req.log?.error({ err }, '[DIVISION] list error');
      res.status(500).json({ message: 'Failed to list divisions' });
    }
  });

  // POST /api/contractor/divisions — create a division
  app.post('/api/contractor/divisions', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin'), async (req: any, res: any) => {
    try {
      if (!await requireDivisionTier(req, res)) return;
      const companyId = req.session.user.companyId;
      const schema = z.object({ name: z.string().min(1).max(100) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: 'Invalid data', errors: parsed.error.flatten() });

      const [div] = await db.insert(companyDivisions).values({
        id: randomUUID(),
        companyId,
        name: parsed.data.name,
      } as any).returning();

      res.status(201).json(div);
    } catch (err) {
      req.log?.error({ err }, '[DIVISION] create error');
      res.status(500).json({ message: 'Failed to create division' });
    }
  });

  // GET /api/contractor/divisions/:id — single division detail
  app.get('/api/contractor/divisions/:id', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin', 'manager'), async (req: any, res: any) => {
    try {
      if (!await requireDivisionTier(req, res)) return;
      const companyId = req.session.user.companyId;
      const { id } = req.params;
      const [div] = await db.select().from(companyDivisions)
        .where(and(eq(companyDivisions.id, id), eq(companyDivisions.companyId, companyId))).limit(1);
      if (!div) return res.status(404).json({ message: 'Division not found' });

      const members = await db.select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email, companyRole: users.companyRole, status: users.status })
        .from(users)
        .where(and(eq(users.divisionId as any, id), eq(users.companyId, companyId), ne(users.status as any, 'removed')));

      res.json({ ...div, members });
    } catch (err) {
      req.log?.error({ err }, '[DIVISION] get error');
      res.status(500).json({ message: 'Failed to get division' });
    }
  });

  // PATCH /api/contractor/divisions/:id — rename a division
  app.patch('/api/contractor/divisions/:id', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin'), async (req: any, res: any) => {
    try {
      if (!await requireDivisionTier(req, res)) return;
      const companyId = req.session.user.companyId;
      const { id } = req.params;
      const schema = z.object({ name: z.string().min(1).max(100) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: 'Invalid data', errors: parsed.error.flatten() });

      const [existing] = await db.select({ id: companyDivisions.id }).from(companyDivisions)
        .where(and(eq(companyDivisions.id, id), eq(companyDivisions.companyId, companyId))).limit(1);
      if (!existing) return res.status(404).json({ message: 'Division not found' });

      const [updated] = await db.update(companyDivisions)
        .set({ name: parsed.data.name, updatedAt: new Date() })
        .where(eq(companyDivisions.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      req.log?.error({ err }, '[DIVISION] update error');
      res.status(500).json({ message: 'Failed to update division' });
    }
  });

  // DELETE /api/contractor/divisions/:id — delete a division (owner only; unassigns members first)
  app.delete('/api/contractor/divisions/:id', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner'), async (req: any, res: any) => {
    try {
      if (!await requireDivisionTier(req, res)) return;
      const companyId = req.session.user.companyId;
      const { id } = req.params;
      const [existing] = await db.select({ id: companyDivisions.id }).from(companyDivisions)
        .where(and(eq(companyDivisions.id, id), eq(companyDivisions.companyId, companyId))).limit(1);
      if (!existing) return res.status(404).json({ message: 'Division not found' });

      // Unassign all members before deleting
      await db.update(users).set({ divisionId: null } as any).where(eq(users.divisionId as any, id));
      await db.delete(companyDivisions).where(eq(companyDivisions.id, id));

      res.json({ message: 'Division deleted' });
    } catch (err) {
      req.log?.error({ err }, '[DIVISION] delete error');
      res.status(500).json({ message: 'Failed to delete division' });
    }
  });

  // POST /api/contractor/divisions/:id/assign-manager — assign a manager to a division
  app.post('/api/contractor/divisions/:id/assign-manager', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin'), async (req: any, res: any) => {
    try {
      if (!await requireDivisionTier(req, res)) return;
      const companyId = req.session.user.companyId;
      const { id } = req.params;
      const schema = z.object({ userId: z.string().uuid().nullable() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: 'Invalid data', errors: parsed.error.flatten() });

      const [div] = await db.select({ id: companyDivisions.id }).from(companyDivisions)
        .where(and(eq(companyDivisions.id, id), eq(companyDivisions.companyId, companyId))).limit(1);
      if (!div) return res.status(404).json({ message: 'Division not found' });

      if (parsed.data.userId) {
        const [member] = await db.select({ companyRole: users.companyRole }).from(users)
          .where(and(eq(users.id, parsed.data.userId), eq(users.companyId, companyId), ne(users.status as any, 'removed'))).limit(1);
        if (!member) return res.status(404).json({ message: 'User not found in company' });
        // Promote the user to manager role and assign to this division
        await db.update(users).set({ companyRole: 'manager', divisionId: id, updatedAt: new Date() } as any).where(eq(users.id, parsed.data.userId));
      }

      const [updated] = await db.update(companyDivisions)
        .set({ managerId: parsed.data.userId, updatedAt: new Date() })
        .where(eq(companyDivisions.id, id))
        .returning();

      res.json(updated);
    } catch (err) {
      req.log?.error({ err }, '[DIVISION] assign-manager error');
      res.status(500).json({ message: 'Failed to assign manager' });
    }
  });

  // GET /api/contractor/divisions/:id/members — list members in a division
  app.get('/api/contractor/divisions/:id/members', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin', 'manager'), requireDivisionAccess, async (req: any, res: any) => {
    try {
      if (!await requireDivisionTier(req, res)) return;
      const companyId = req.session.user.companyId;
      const { id } = req.params;
      // Manager scoping: if req.divisionFilter is set and doesn't match, deny
      if ((req as any).divisionFilter && (req as any).divisionFilter !== id) {
        return res.status(403).json({ message: 'Access restricted to your division' });
      }
      const [div] = await db.select({ id: companyDivisions.id }).from(companyDivisions)
        .where(and(eq(companyDivisions.id, id), eq(companyDivisions.companyId, companyId))).limit(1);
      if (!div) return res.status(404).json({ message: 'Division not found' });

      const members = await db.select({
        id: users.id, firstName: users.firstName, lastName: users.lastName,
        email: users.email, companyRole: users.companyRole, status: users.status, lastLoginAt: users.lastLoginAt,
      }).from(users)
        .where(and(eq(users.divisionId as any, id), eq(users.companyId, companyId), ne(users.status as any, 'removed')));

      res.json(members);
    } catch (err) {
      req.log?.error({ err }, '[DIVISION] members error');
      res.status(500).json({ message: 'Failed to list division members' });
    }
  });

  // ─── Phase 3.2 — Bulk Tech Import ────────────────────────────────────────────

  // Lightweight inline CSV parser (no external deps needed for simple email,firstName,lastName CSVs)
  const parseCsvRows = (raw: string): Array<Record<string, string>> => {
    const lines = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
      return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']));
    });
  };

  // POST /api/contractor/bulk-import — upload CSV of techs to invite
  app.post('/api/contractor/bulk-import', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin'), requireBulkImport, upload.single('file'), async (req: any, res: any) => {
    try {
      const adminUser = req.session.user;
      if (!adminUser.companyId) return res.status(400).json({ message: 'You must belong to a company' });
      if (!req.file) return res.status(400).json({ message: 'CSV file is required' });
      if (!req.file.mimetype.includes('csv') && !req.file.originalname.endsWith('.csv')) {
        return res.status(400).json({ message: 'Only CSV files are accepted' });
      }

      const raw = req.file.buffer.toString('utf-8');
      const rows = parseCsvRows(raw);
      if (rows.length === 0) return res.status(400).json({ message: 'CSV is empty or has no data rows' });
      if (rows.length > 200) return res.status(400).json({ message: 'CSV exceeds 200-row limit per import' });

      // Create import record
      const [importRecord] = await db.insert(companyBulkImports).values({
        id: randomUUID(),
        companyId: adminUser.companyId,
        uploadedBy: adminUser.id,
        fileName: req.file.originalname,
        status: 'processing',
        totalRows: rows.length,
        successRows: 0,
        failedRows: 0,
        errorLog: [],
      } as any).returning();

      const domain = process.env.REPLIT_DOMAINS?.split(',')[0]?.trim() || 'gotohomebase.com';
      const [companyRow] = await db.select().from(companies).where(eq(companies.id, adminUser.companyId)).limit(1);

      // Get plan for seat limits
      let planForImport: typeof subscriptionPlans.$inferSelect | null = null;
      if (adminUser.subscriptionPlanId) {
        const [pr] = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, adminUser.subscriptionPlanId)).limit(1);
        planForImport = pr ?? null;
      }
      const maxSeatsForImport = (companyRow as any)?.maxTechSeats ?? (planForImport?.includedTechSeats ?? 10);

      const errors: Array<{ row: number; error: string }> = [];
      let successCount = 0;

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const email = row['email']?.trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          errors.push({ row: i + 2, error: `Row ${i + 2}: invalid or missing email` });
          continue;
        }

        // Check seat limit per iteration
        const currentTechCount = await db.select({ id: users.id }).from(users)
          .where(and(eq(users.companyId, adminUser.companyId), eq(users.companyRole as any, 'tech'), ne(users.status as any, 'removed')));
        if (currentTechCount.length >= maxSeatsForImport) {
          errors.push({ row: i + 2, error: `Row ${i + 2}: seat limit reached (${maxSeatsForImport})` });
          continue;
        }

        try {
          const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
          const cryptoMod = await import('crypto');
          const inviteToken = cryptoMod.randomBytes(32).toString('hex');
          const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const firstName = row['firstname'] || row['first_name'] || row['first name'] || null;
          const lastName = row['lastname'] || row['last_name'] || row['last name'] || null;

          if (existing) {
            if ((existing as any).role !== 'contractor') { errors.push({ row: i + 2, error: `${email}: non-contractor account` }); continue; }
            if (existing.companyId && existing.companyId !== adminUser.companyId) { errors.push({ row: i + 2, error: `${email}: belongs to another company` }); continue; }
            await db.update(users).set({ companyId: adminUser.companyId, companyRole: 'tech', status: 'pending_invite', inviteToken, inviteExpiresAt, updatedAt: new Date() } as any).where(eq(users.id, existing.id));
          } else {
            await db.insert(users).values({ id: randomUUID(), email, firstName, lastName, role: 'contractor', companyId: adminUser.companyId, companyRole: 'tech', status: 'pending_invite', inviteToken, inviteExpiresAt, accountStatus: 'active', subscriptionStatus: 'active', emailVerified: false } as any);
          }

          const inviteUrl = `https://${domain}/contractor/accept-invite?token=${inviteToken}`;
          await emailService.sendTechInviteEmail(email, companyRow?.name || 'Your Company', adminUser.firstName || 'Your manager', inviteUrl);
          successCount++;
        } catch (rowErr) {
          errors.push({ row: i + 2, error: `${email}: ${(rowErr as Error).message}` });
        }
      }

      // Update import record with results
      await db.update(companyBulkImports).set({
        status: errors.length === rows.length ? 'failed' : 'completed',
        successRows: successCount,
        failedRows: errors.length,
        errorLog: errors as any,
        completedAt: new Date(),
      }).where(eq(companyBulkImports.id, importRecord.id));

      res.json({ importId: importRecord.id, totalRows: rows.length, successRows: successCount, failedRows: errors.length, errors });
    } catch (err) {
      req.log?.error({ err }, '[BULK_IMPORT] upload error');
      res.status(500).json({ message: 'Failed to process bulk import' });
    }
  });

  // GET /api/contractor/bulk-import/history — list past import records
  app.get('/api/contractor/bulk-import/history', isAuthenticated, requireNotSuspended(), requireCompanyRoleAny('owner', 'admin'), requireBulkImport, async (req: any, res: any) => {
    try {
      const companyId = req.session.user.companyId;
      if (!companyId) return res.status(400).json({ message: 'You must belong to a company' });

      const imports = await db.select({
        id: companyBulkImports.id,
        fileName: companyBulkImports.fileName,
        status: companyBulkImports.status,
        totalRows: companyBulkImports.totalRows,
        successRows: companyBulkImports.successRows,
        failedRows: companyBulkImports.failedRows,
        errorLog: companyBulkImports.errorLog,
        createdAt: companyBulkImports.createdAt,
        completedAt: companyBulkImports.completedAt,
      }).from(companyBulkImports)
        .where(eq(companyBulkImports.companyId, companyId))
        .orderBy(desc(companyBulkImports.createdAt))
        .limit(50);

      res.json(imports);
    } catch (err) {
      req.log?.error({ err }, '[BULK_IMPORT] history error');
      res.status(500).json({ message: 'Failed to fetch import history' });
    }
  });

  // ─── Phase 3.4 — Enterprise SSO Config (stubs) ───────────────────────────────

  // GET /api/contractor/sso — fetch SSO configuration for this company
  app.get('/api/contractor/sso', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner'), requireApiAccess, async (req: any, res: any) => {
    try {
      const companyId = req.session.user.companyId;
      if (!companyId) return res.status(403).json({ message: 'No company found' });

      const [co] = await db.select({
        ssoEnabled: companies.ssoEnabled,
        ssoProvider: companies.ssoProvider,
        ssoDomain: companies.ssoDomain,
      }).from(companies).where(eq(companies.id, companyId)).limit(1);

      if (!co) return res.status(404).json({ message: 'Company not found' });

      res.json({
        ssoEnabled: co.ssoEnabled ?? false,
        ssoProvider: co.ssoProvider ?? null,
        ssoDomain: co.ssoDomain ?? null,
        note: 'SSO configuration is managed by your account manager. Contact support to enable or change your SSO provider.',
      });
    } catch (err) {
      req.log?.error({ err }, '[SSO] get error');
      res.status(500).json({ message: 'Failed to fetch SSO config' });
    }
  });

  // PATCH /api/contractor/sso — update SSO config (Enterprise only; owner only)
  // Stub: real SAML/OIDC wiring is deferred to Phase 5. This endpoint records intent and notifies CS.
  app.patch('/api/contractor/sso', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner'), requireApiAccess, async (req: any, res: any) => {
    try {
      const companyId = req.session.user.companyId;
      if (!companyId) return res.status(403).json({ message: 'No company found' });

      const schema = z.object({
        ssoProvider: z.enum(['okta', 'google_workspace', 'azure_ad', 'saml']).nullable().optional(),
        ssoDomain: z.string().max(253).nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: 'Invalid data', errors: parsed.error.flatten() });

      await db.update(companies).set({
        ssoProvider: parsed.data.ssoProvider ?? undefined,
        ssoDomain: parsed.data.ssoDomain ?? undefined,
        updatedAt: new Date(),
      } as any).where(eq(companies.id, companyId));

      res.json({
        message: 'SSO intent recorded. Your account manager will contact you within 1 business day to complete SSO setup.',
        ssoProvider: parsed.data.ssoProvider ?? null,
        ssoDomain: parsed.data.ssoDomain ?? null,
        status: 'pending_cs_activation',
      });
    } catch (err) {
      req.log?.error({ err }, '[SSO] update error');
      res.status(500).json({ message: 'Failed to update SSO config' });
    }
  });

  // Upload invoice (admin or tech, not suspended); max 10 MB, PDF/JPG/PNG only
  // List homeowners who have proposals with this company (used by tech invoice upload selector)
  app.get('/api/contractor/company-homeowners', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin', 'tech'), async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      if (!sessionUser.companyId) {
        return res.status(400).json({ message: "You must belong to a company" });
      }
      const homeowners = await db.selectDistinct({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      }).from(proposals)
        .innerJoin(users, eq(proposals.homeownerId, users.id))
        .where(and(
          eq(proposals.companyId, sessionUser.companyId),
          isNotNull(proposals.homeownerId)
        ))
        .orderBy(users.firstName);
      res.json(homeowners);
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error fetching company homeowners');
      res.status(500).json({ message: "Failed to fetch homeowners" });
    }
  });

  app.post('/api/contractor/invoices/upload', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin', 'tech'), upload.single('file'), async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      if (sessionUser.role !== 'contractor' || !sessionUser.companyId) {
        return res.status(403).json({ message: "Only company contractors can upload invoices" });
      }
      if (!req.file) {
        return res.status(400).json({ message: "File is required" });
      }
      const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedMimes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Only PDF, JPG, and PNG files are allowed" });
      }
      if (req.file.size > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "File must be 10 MB or less" });
      }

      const { notes, amount, invoiceDate, jobId } = req.body;
      let homeownerId: string | null = req.body.homeownerId || null;
      // Validate that the homeowner is scoped to this company (has a proposal relationship)
      if (homeownerId) {
        const [proposal] = await db.select({ id: proposals.id })
          .from(proposals)
          .where(and(
            eq(proposals.companyId, sessionUser.companyId),
            eq(proposals.homeownerId, homeownerId)
          ))
          .limit(1);
        if (!proposal) {
          homeownerId = null; // silently drop unscoped homeowner reference
        }
      }
      const objectStorage = new ObjectStorageService();
      const fileKey = `contractor-invoices/${sessionUser.companyId}/${Date.now()}-${req.file.originalname}`;
      await objectStorage.uploadFile(fileKey, req.file.buffer, req.file.mimetype);
      const fileUrl = `/public/${fileKey}`;

      const [invoice] = await db.insert(contractorInvoiceUploads).values({
        companyId: sessionUser.companyId,
        uploadedByUserId: sessionUser.id,
        homeownerId: homeownerId || null,
        jobId: jobId || null,
        fileName: req.file.originalname,
        fileUrl,
        storageKey: fileKey,
        notes: notes || null,
        amount: amount ? String(amount) : null,
        invoiceDate: invoiceDate || null,
      } as any).returning();

      res.status(201).json(invoice);
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error uploading invoice');
      res.status(500).json({ message: "Failed to upload invoice" });
    }
  });

  // List invoices — admins see all company invoices; techs see only their own
  // Query params: techId, homeownerId, homeownerName, startDate, endDate
  app.get('/api/contractor/invoices', isAuthenticated, requireNotSuspended(), requireCompanyRole('owner', 'admin', 'tech'), async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      if (sessionUser.role !== 'contractor' || !sessionUser.companyId) {
        return res.status(403).json({ message: "Only company contractors can view invoices" });
      }

      const isAdmin = sessionUser.companyRole === 'owner' || sessionUser.companyRole === 'admin';
      const { techId, homeownerId, homeownerName, startDate, endDate } = req.query as Record<string, string | undefined>;

      const conditions: any[] = [eq(contractorInvoiceUploads.companyId, sessionUser.companyId)];
      if (!isAdmin) {
        conditions.push(eq(contractorInvoiceUploads.uploadedByUserId, sessionUser.id));
      } else {
        if (techId) conditions.push(eq(contractorInvoiceUploads.uploadedByUserId, techId));
        if (homeownerId) conditions.push(eq(contractorInvoiceUploads.homeownerId as any, homeownerId));
        if (homeownerName) conditions.push(drizzleSql`LOWER(COALESCE((SELECT first_name FROM users WHERE id = ${contractorInvoiceUploads.homeownerId}), '') || ' ' || COALESCE((SELECT last_name FROM users WHERE id = ${contractorInvoiceUploads.homeownerId}), '')) LIKE ${'%' + homeownerName.toLowerCase() + '%'}`);
        if (startDate) conditions.push(drizzleSql`${contractorInvoiceUploads.invoiceDate} >= ${startDate}`);
        if (endDate) conditions.push(drizzleSql`${contractorInvoiceUploads.invoiceDate} <= ${endDate}`);
      }

      const invoiceList = await db.select({
        id: contractorInvoiceUploads.id,
        companyId: contractorInvoiceUploads.companyId,
        homeownerId: contractorInvoiceUploads.homeownerId,
        jobId: contractorInvoiceUploads.jobId,
        fileName: contractorInvoiceUploads.fileName,
        fileUrl: contractorInvoiceUploads.fileUrl,
        notes: contractorInvoiceUploads.notes,
        amount: contractorInvoiceUploads.amount,
        invoiceDate: contractorInvoiceUploads.invoiceDate,
        createdAt: contractorInvoiceUploads.createdAt,
        uploaderFirstName: users.firstName,
        uploaderLastName: users.lastName,
        uploaderEmail: users.email,
        homeownerFirstName: drizzleSql<string | null>`(SELECT first_name FROM users WHERE id = ${contractorInvoiceUploads.homeownerId})`,
        homeownerLastName: drizzleSql<string | null>`(SELECT last_name FROM users WHERE id = ${contractorInvoiceUploads.homeownerId})`,
      }).from(contractorInvoiceUploads)
        .leftJoin(users, eq(contractorInvoiceUploads.uploadedByUserId, users.id))
        .where(and(...conditions))
        .orderBy(desc(contractorInvoiceUploads.createdAt));

      res.json(invoiceList);
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error fetching invoices');
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // Get single invoice — tech can only access their own; admin can access any company invoice
  app.get('/api/contractor/invoices/:id', isAuthenticated, requireNotSuspended(), async (req: any, res: any) => {
    try {
      const sessionUser = req.session.user;
      if (sessionUser.role !== 'contractor' || !sessionUser.companyId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const [invoice] = await db.select({
        id: contractorInvoiceUploads.id,
        companyId: contractorInvoiceUploads.companyId,
        uploadedByUserId: contractorInvoiceUploads.uploadedByUserId,
        homeownerId: contractorInvoiceUploads.homeownerId,
        jobId: contractorInvoiceUploads.jobId,
        fileName: contractorInvoiceUploads.fileName,
        fileUrl: contractorInvoiceUploads.fileUrl,
        notes: contractorInvoiceUploads.notes,
        amount: contractorInvoiceUploads.amount,
        invoiceDate: contractorInvoiceUploads.invoiceDate,
        createdAt: contractorInvoiceUploads.createdAt,
        uploaderFirstName: users.firstName,
        uploaderLastName: users.lastName,
      }).from(contractorInvoiceUploads)
        .leftJoin(users, eq(contractorInvoiceUploads.uploadedByUserId, users.id))
        .where(eq(contractorInvoiceUploads.id, req.params.id))
        .limit(1);

      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      if (invoice.companyId !== sessionUser.companyId) {
        return res.status(403).json({ message: "Forbidden" });
      }
      const isAdmin = sessionUser.companyRole === 'owner' || sessionUser.companyRole === 'admin';
      if (!isAdmin && invoice.uploadedByUserId !== sessionUser.id) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(invoice);
    } catch (error) {
      req.log?.error({ error }, '[ENTERPRISE] Error fetching invoice');
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // Quiz Results — save Home Health Score to the database
  // Works for both anonymous visitors (no userId stored) and authenticated users.

  app.post("/api/demo-lead", async (req: any, res: any) => {
    try {
      const bodySchema = z.object({
        name: z.string().min(1).max(200),
        email: z.string().email().max(300),
        zipcode: z.string().min(3).max(20),
        role: z.enum(['homeowner', 'contractor', 'agent']).default('homeowner'),
      });
      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid lead data" });
      }
      req.log.info({ lead: { name: parsed.data.name, email: parsed.data.email, zipcode: parsed.data.zipcode, role: parsed.data.role } }, '[Demo Lead]');
      return res.json({ ok: true });
    } catch (err) {
      req.log.error(err, '[Demo Lead] error');
      return res.status(500).json({ message: "Server error" });
    }
  });

  // Fetch the authenticated user's most recent quiz result
  app.get("/api/quiz-result/me", async (req: any, res: any) => {
    try {
      const userId: string | null = req.session?.isAuthenticated && req.session?.user?.id
        ? req.session.user.id
        : null;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const [record] = await db
        .select()
        .from(quizResults)
        .where(eq(quizResults.userId, userId))
        .orderBy(desc(quizResults.completedAt))
        .limit(1);

      return res.json(record ?? null);
    } catch (err: any) {
      req.log.error(err, "[QUIZ RESULT ME] error");
      return res.status(500).json({ message: "Failed to fetch quiz result" });
    }
  });

  app.post("/api/quiz-result", quizLimiter, async (req: any, res: any) => {
    try {
      const bodySchema = z.object({
        score: z.number().int().min(0).max(100),
        tier: z.enum(["Home Pro", "Solid Foundation", "Needs Attention", "High Risk"]),
        completedAt: z.string().datetime(),
        startedAt: z.string().datetime().optional(),
      });

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid quiz result data", errors: parsed.error.flatten() });
      }

      // Timing check: reject submissions that completed in under 5 seconds (bot-speed)
      if (parsed.data.startedAt) {
        const elapsed = new Date(parsed.data.completedAt).getTime() - new Date(parsed.data.startedAt).getTime();
        if (elapsed < 5000) {
          return res.status(400).json({ message: "Quiz completed too quickly" });
        }
      }

      const userId: string | null = req.session?.isAuthenticated && req.session?.user?.id
        ? req.session.user.id
        : null;

      const [record] = await db.insert(quizResults).values({
        userId,
        score: parsed.data.score,
        tier: parsed.data.tier,
        completedAt: new Date(parsed.data.completedAt),
      }).returning();

      return res.status(201).json(record);
    } catch (err: any) {
      req.log.error(err, "[QUIZ RESULT] save error");
      return res.status(500).json({ message: "Failed to save quiz result" });
    }
  });

  // Claim an anonymous quiz result after the visitor signs up or logs in.
  // The client stores the resultId in localStorage immediately after the quiz
  // POST returns. On login, the frontend calls this endpoint to backfill userId.
  app.post("/api/quiz-result/claim", async (req: any, res: any) => {
    try {
      const userId: string | null = req.session?.isAuthenticated && req.session?.user?.id
        ? req.session.user.id
        : null;

      if (!userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const bodySchema = z.object({
        resultId: z.string().min(1),
      });

      const parsed = bodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request", errors: parsed.error.flatten() });
      }

      const [updated] = await db
        .update(quizResults)
        .set({ userId })
        .where(
          and(
            eq(quizResults.id, parsed.data.resultId),
            isNull(quizResults.userId)
          )
        )
        .returning();

      if (!updated) {
        // Either already claimed or doesn't exist — treat as success to avoid leaking IDs
        return res.json({ ok: true, claimed: false });
      }

      return res.json({ ok: true, claimed: true, record: updated });
    } catch (err: any) {
      req.log.error(err, "[QUIZ RESULT CLAIM] error");
      return res.status(500).json({ message: "Failed to claim quiz result" });
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────

  const httpServer = createServer(app);
  
  // WebSocket server for real-time messaging with session validation
  const wss = new WebSocketServer({ 
    noServer: true  // We'll handle upgrade manually for session validation
  });
  
  // Store active WebSocket connections with user info
  const clients = new Map<string, { userId: string; ws: WebSocket; conversations: Set<string> }>();
  
  // Handle WebSocket upgrade with session validation
  httpServer.on('upgrade', (request, socket, head) => {
    // Only handle /ws path
    if (request.url !== '/ws') {
      socket.destroy();
      return;
    }
    
    // Parse session from the request
    const sessionParser = app.get('sessionParser');
    sessionParser(request, {} as any, () => {
      const session = (request as any).session;
      
      // Validate authenticated session
      if (!session || !session.user || !session.user.id) {
        console.log('[WebSocket] Rejected unauthenticated connection attempt');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      const authenticatedUserId = session.user.id;
      console.log('[WebSocket] Authenticated connection for user:', authenticatedUserId);
      
      // Complete the WebSocket upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        // Attach userId to the WebSocket for later use
        (ws as any).userId = authenticatedUserId;
        wss.emit('connection', ws, request);
      });
    });
  });
  
  // POST /api/client-error — receive and log frontend JS errors (from ErrorBoundary)
  app.post("/api/client-error", async (req: any, res: any) => {
    try {
      const { message, stack, componentStack, url } = req.body || {};
      const userId = req.session?.user?.id ?? "anonymous";
      console.error(`[CLIENT-ERROR] user=${userId} url=${url}\nmessage: ${message}\nstack: ${stack}\ncomponentStack: ${componentStack}`);
      res.status(204).end();
    } catch {
      res.status(204).end();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    // Get the authenticated userId from the WebSocket
    const userId = (ws as any).userId as string;
    const clientId = randomUUID();
    
    clients.set(clientId, { userId, ws, conversations: new Set() });
    console.log(`[WebSocket] Client connected: userId=${userId}, clientId=${clientId}`);
    
    // Send auth success
    ws.send(JSON.stringify({ type: 'auth_success', clientId, userId }));
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle joining a conversation
        if (message.type === 'join_conversation') {
          if (clientId && clients.has(clientId)) {
            const client = clients.get(clientId)!;
            client.conversations.add(message.conversationId);
            console.log(`[WebSocket] Client ${clientId} joined conversation ${message.conversationId}`);
            ws.send(JSON.stringify({ type: 'joined_conversation', conversationId: message.conversationId }));
          }
          return;
        }
        
        // Handle leaving a conversation
        if (message.type === 'leave_conversation') {
          if (clientId && clients.has(clientId)) {
            const client = clients.get(clientId)!;
            client.conversations.delete(message.conversationId);
            console.log(`[WebSocket] Client ${clientId} left conversation ${message.conversationId}`);
          }
          return;
        }
        
        // Handle new message broadcast
        if (message.type === 'new_message') {
          const { conversationId, messageData } = message;
          console.log(`[WebSocket] Broadcasting new message in conversation ${conversationId}`);
          
          // Broadcast to all OTHER clients in this conversation (exclude the sender)
          clients.forEach((client) => {
            if (client.userId !== userId && client.conversations.has(conversationId) && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'message_received',
                conversationId,
                message: messageData
              }));
            }
          });
        }
        
        // Handle typing indicator
        if (message.type === 'typing') {
          const { conversationId, isTyping } = message;
          
          // Broadcast typing status to other clients in the conversation
          clients.forEach((client) => {
            if (client.userId !== userId && client.conversations.has(conversationId) && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'user_typing',
                conversationId,
                userId,
                isTyping
              }));
            }
          });
        }
        
        // Handle read receipt
        if (message.type === 'mark_read') {
          const { conversationId, messageIds } = message;
          console.log(`[WebSocket] Marking messages as read in conversation ${conversationId}`);
          
          // Broadcast read receipt to other clients
          clients.forEach((client) => {
            if (client.userId !== userId && client.conversations.has(conversationId) && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'messages_read',
                conversationId,
                messageIds,
                readBy: userId
              }));
            }
          });
        }
        
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });
    
    ws.on('close', () => {
      if (clientId) {
        clients.delete(clientId);
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  });
  
  console.log('[WebSocket] Server initialized on path /ws');
  
  return httpServer;
}
