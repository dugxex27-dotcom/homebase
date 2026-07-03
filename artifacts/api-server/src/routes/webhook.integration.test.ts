/**
 * Integration test: Stripe webhook double-trigger / idempotency guard
 *
 * Sends two identical signed Stripe payloads to the real
 * /api/webhooks/stripe route via supertest and asserts:
 *   1. First POST  → 200 { received: true }                    (processed, storage called once)
 *   2. Second POST → 200 { received: true, duplicate: true }   (short-circuited, no extra storage calls)
 *
 * All heavy dependencies (Stripe, DB, auth, push, etc.) are module-mocked so
 * the test is self-contained and fast.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — create shared mock functions that are available inside
// vi.mock() factory closures (which are hoisted before imports).
// ---------------------------------------------------------------------------

const {
  mockConstructEvent,
  mockEventsRetrieve,
  mockHasProcessedStripeEvent,
  mockMarkStripeEventPending,
  mockMarkStripeEventCommitted,
  mockDeleteStripeEventPending,
  mockRecordProcessedStripeEvent,
  mockMarkStripeEventSideEffectsComplete,
  mockGetIncompleteStripeProcessedEvents,
  mockPruneOldStripeProcessedEvents,
  mockGetRecentStripeProcessedEventIds,
  mockGetUser,
  mockUpdateUserStripeSubscription,
  mockUpdateUserSubscriptionStatus2,
  mockUpsertUser,
  mockGetUserByStripeCustomerId2,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockEventsRetrieve: vi.fn(),
  mockHasProcessedStripeEvent: vi.fn().mockResolvedValue(false),
  mockMarkStripeEventPending: vi.fn().mockResolvedValue(undefined),
  mockMarkStripeEventCommitted: vi.fn().mockResolvedValue(undefined),
  mockDeleteStripeEventPending: vi.fn().mockResolvedValue(undefined),
  mockRecordProcessedStripeEvent: vi.fn().mockResolvedValue(undefined),
  mockMarkStripeEventSideEffectsComplete: vi.fn().mockResolvedValue(undefined),
  mockGetIncompleteStripeProcessedEvents: vi.fn().mockResolvedValue([]),
  mockPruneOldStripeProcessedEvents: vi.fn().mockResolvedValue(undefined),
  mockGetRecentStripeProcessedEventIds: vi
    .fn()
    .mockResolvedValue(new Map<string, number>()),
  mockGetUser: vi.fn().mockResolvedValue(null),
  mockUpdateUserStripeSubscription: vi.fn().mockResolvedValue(undefined),
  mockUpdateUserSubscriptionStatus2: vi.fn().mockResolvedValue(undefined),
  mockUpsertUser: vi.fn().mockResolvedValue(undefined),
  mockGetUserByStripeCustomerId2: vi.fn().mockResolvedValue(null),
}));

// ---------------------------------------------------------------------------
// Module mocks — hoisted before all imports by Vitest
// ---------------------------------------------------------------------------

// Stripe: use a regular constructor function (not arrow) so `new Stripe(...)` works.
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: mockConstructEvent };
    this.events = { retrieve: mockEventsRetrieve };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({
        id: "acct_test",
        charges_enabled: true,
        payouts_enabled: true,
        country: "US",
      }),
    };
  }
  return { default: MockStripe };
});

// Storage: expose named mock fns so tests can assert call counts easily.
vi.mock("../storage", () => ({
  storage: {
    getRecentStripeProcessedEventIds: mockGetRecentStripeProcessedEventIds,
    hasProcessedStripeEvent: mockHasProcessedStripeEvent,
    markStripeEventPending: mockMarkStripeEventPending,
    markStripeEventCommitted: mockMarkStripeEventCommitted,
    deleteStripeEventPending: mockDeleteStripeEventPending,
    recordProcessedStripeEvent: mockRecordProcessedStripeEvent,
    markStripeEventSideEffectsComplete: mockMarkStripeEventSideEffectsComplete,
    getIncompleteStripeProcessedEvents: mockGetIncompleteStripeProcessedEvents,
    pruneOldStripeProcessedEvents: mockPruneOldStripeProcessedEvents,
    // Stubs for storage methods called during registerRoutes startup:
    getSubscriptionPlanByTier: vi.fn().mockResolvedValue(null),
    getUserByStripeCustomerId: mockGetUserByStripeCustomerId2,
    getAffiliateReferralByUserId: vi.fn().mockResolvedValue(null),
    updateUserSubscriptionStatus: mockUpdateUserSubscriptionStatus2,
    createSubscriptionCycleEvent: vi.fn().mockResolvedValue(null),
    getContractorCompanyByStripeAccountId: vi.fn().mockResolvedValue(null),
    updateCompanySubscriptionStatus: vi.fn().mockResolvedValue(undefined),
    getCompanyById: vi.fn().mockResolvedValue(null),
    updateCompanyStripeSubscription: vi.fn().mockResolvedValue(undefined),
    upsertSubscriptionPlan: vi.fn().mockResolvedValue(undefined),
    // Side-effect methods exercised by specific event-type tests:
    getUser: mockGetUser,
    updateUserStripeSubscription: mockUpdateUserStripeSubscription,
    upsertUser: mockUpsertUser,
  },
}));

// Auth modules: no-op so Express boots without real session / OIDC setup.
vi.mock("../replitAuth", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
  requireCompanyRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireCompanyRoleAny: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  requireDivisionAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireBulkImport: vi.fn((_req: any, _res: any, next: any) => next()),
  requireApiAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireNotSuspended: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  requireSameCompany: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  suspendedUserIds: new Set<string>(),
  invalidateUserSessions: vi.fn(),
  refreshUserSessionRole: vi.fn(),
  requireActiveAccountFresh: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  invalidateActiveStatusCache: vi.fn(),
  isOAuthUserSuspended: vi.fn().mockResolvedValue(false),
  validateHouseOwnership: vi.fn().mockResolvedValue(true),
  validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
  validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
  validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
  requireResourceOwnership: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
}));

vi.mock("../googleAuth", () => ({
  setupGoogleAuth: vi.fn(),
}));

// WebSocket server: stub so http.Server creation succeeds.
vi.mock("ws", () => ({
  WebSocketServer: class MockWss {
    on() {}
    clients = new Set();
  },
  WebSocket: { OPEN: 1 },
}));

// Push / notification services
vi.mock("../push-routes", () => ({ default: vi.fn() }));
vi.mock("../push-service", () => ({
  pushService: { sendToUser: vi.fn(), sendToMany: vi.fn() },
}));
vi.mock("../notification-orchestrator", () => ({
  notificationOrchestrator: {
    notify: vi.fn(),
    sendMaintenanceReminder: vi.fn(),
    sendWeatherAlert: vi.fn(),
  },
}));

// Email / SMS
vi.mock("../email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../sms-service", () => ({
  smsService: { send: vi.fn().mockResolvedValue(undefined) },
}));

// Apple IAP
vi.mock("../apple-iap", () => ({
  verifyAndActivateAppleTransaction: vi.fn().mockResolvedValue(undefined),
  handleAppleServerNotification: vi.fn().mockResolvedValue(undefined),
  AppleIapError: class AppleIapError extends Error {},
}));

// Object storage: class mock so `new ObjectStorageService()` works.
vi.mock("../objectStorage", () => ({
  ObjectStorageService: class MockObjectStorageService {
    upload = vi.fn();
    download = vi.fn();
    delete = vi.fn();
    getSignedUrl = vi.fn();
    getUploadUrl = vi.fn();
    deleteObject = vi.fn();
    getObject = vi.fn();
    putObject = vi.fn();
    listObjects = vi.fn();
  },
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
}));

// Database connection — stub so no real PG connection is attempted.
vi.mock("../db", () => ({
  pool: { query: vi.fn(), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined) }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// Geocoding
vi.mock("../geocoding-service", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
  calculateDistance: vi.fn().mockReturnValue(0),
}));

// Invoice analysis
vi.mock("../invoice-analysis-service", () => ({
  extractInvoiceData: vi.fn().mockResolvedValue(null),
  verifyDIYPhotos: vi.fn().mockResolvedValue(null),
}));

// OpenAI
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  },
}));

// Security audit — stub singletons so no DB calls on construction.
vi.mock("../security-audit", () => ({
  AuditEventTypes: {},
  AuditEventCategories: {},
  AuditSeverity: {},
  auditLogger: {
    log: vi.fn(),
    logAuth: vi.fn(),
    logSecurity: vi.fn(),
    logRequest: vi.fn(),
  },
  sessionManager: {
    createSession: vi.fn(),
    validateSession: vi.fn(),
    invalidateSession: vi.fn(),
    trackRequest: vi.fn(),
  },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

// ---------------------------------------------------------------------------
// Test imports — placed AFTER vi.mock() blocks so mocks are active
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import type Stripe from "stripe";
import {
  processedWebhookEventIds,
  inFlightWebhookEventIds,
  registerRoutes,
  recoverIncompleteStripeEvents,
} from "./routes";

// ---------------------------------------------------------------------------
// Shared test fixture builders
// ---------------------------------------------------------------------------

function makeStripeEvent(eventId: string): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "test.unknown_event_type", // falls through to `default` case → no storage side-effects
    data: { object: {} },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

function makeWebhookBody(event: Stripe.Event): Buffer {
  return Buffer.from(JSON.stringify(event));
}

const FAKE_SIG = "t=1234567890,v1=fakesignature";

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("Stripe webhook idempotency — end-to-end route integration", () => {
  const EVENT_ID = "evt_integration_test_double_trigger_001";
  let app: express.Express;

  beforeEach(async () => {
    // Set env vars required by the webhook handler
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    // Clear the in-memory dedup caches so each test starts fresh
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();

    // Reset storage spies
    mockGetRecentStripeProcessedEventIds.mockReset().mockResolvedValue(new Map());
    mockHasProcessedStripeEvent.mockReset().mockResolvedValue(false);
    mockMarkStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(undefined);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);

    // Configure constructEvent to return our canned event (sig verification bypassed)
    mockConstructEvent.mockReset().mockReturnValue(makeStripeEvent(EVENT_ID));

    // Boot a fresh Express app with all routes registered
    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    vi.clearAllMocks();
  });

  it("first delivery is processed and second delivery returns duplicate:true with no extra storage calls", async () => {
    const body = makeWebhookBody(makeStripeEvent(EVENT_ID));

    // ── First POST ──────────────────────────────────────────────────────────
    const first = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ received: true });
    // Must NOT have the duplicate flag on first delivery
    expect(first.body.duplicate).toBeUndefined();

    // DB cold-check must have run and the two-phase write must fire exactly once
    expect(mockHasProcessedStripeEvent).toHaveBeenCalledOnce();
    expect(mockHasProcessedStripeEvent).toHaveBeenCalledWith(EVENT_ID);
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).toHaveBeenCalledWith(EVENT_ID);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_ID);

    // ── Second POST — Stripe retry with the same event ID ───────────────────
    const second = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);

    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ received: true, duplicate: true });

    // The in-memory cache must have blocked the second call before any DB access
    expect(mockHasProcessedStripeEvent).toHaveBeenCalledOnce(); // still one total
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce(); // still one total
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce(); // still one total
  });

  it("cache is populated after first delivery so subsequent retries skip the DB entirely", async () => {
    const body = makeWebhookBody(makeStripeEvent(EVENT_ID));

    // First delivery
    const first = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBeUndefined();

    // The in-memory cache must be populated now
    expect(processedWebhookEventIds.has(EVENT_ID)).toBe(true);

    // Reset the DB spy so we can verify it isn't touched again
    mockHasProcessedStripeEvent.mockClear();

    // Second retry — cache is warm, DB must NOT be consulted
    const retry = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);

    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ received: true, duplicate: true });
    expect(mockHasProcessedStripeEvent).not.toHaveBeenCalled();
  });

  it("distinct event IDs are each processed once with no cross-event false positives", async () => {
    const EVENT_A = "evt_integration_idempotency_A";
    const EVENT_B = "evt_integration_idempotency_B";

    // Event A — first delivery
    mockConstructEvent.mockReturnValueOnce(makeStripeEvent(EVENT_A));
    const resA = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(makeStripeEvent(EVENT_A)));
    expect(resA.status).toBe(200);
    expect(resA.body.duplicate).toBeUndefined();

    // Event B — first delivery (different ID, must be processed fresh)
    mockConstructEvent.mockReturnValueOnce(makeStripeEvent(EVENT_B));
    const resB = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(makeStripeEvent(EVENT_B)));
    expect(resB.status).toBe(200);
    expect(resB.body.duplicate).toBeUndefined();

    // Both events must have been recorded exactly once each (two-phase: pending then committed)
    expect(mockMarkStripeEventPending).toHaveBeenCalledTimes(2);
    expect(mockMarkStripeEventPending).toHaveBeenCalledWith(EVENT_A);
    expect(mockMarkStripeEventPending).toHaveBeenCalledWith(EVENT_B);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledTimes(2);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_A);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_B);

    // Replaying event A is now blocked by the in-memory cache
    mockConstructEvent.mockReturnValueOnce(makeStripeEvent(EVENT_A));
    const resARetry = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(makeStripeEvent(EVENT_A)));
    expect(resARetry.status).toBe(200);
    expect(resARetry.body).toMatchObject({ received: true, duplicate: true });

    // No extra storage calls from the replay
    expect(mockMarkStripeEventPending).toHaveBeenCalledTimes(2);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledTimes(2);
  });

  it("returns duplicate:true via the DB fallback when cache is cold but DB already has the event", async () => {
    // Simulate a server-restart scenario: in-memory cache is empty (cold) but
    // the DB already recorded this event from a previous server instance.
    mockHasProcessedStripeEvent.mockResolvedValueOnce(true);

    const body = makeWebhookBody(makeStripeEvent(EVENT_ID));
    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true, duplicate: true });

    // DB was consulted but no new record was written (already processed)
    expect(mockHasProcessedStripeEvent).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).not.toHaveBeenCalled();
    expect(mockMarkStripeEventCommitted).not.toHaveBeenCalled();
  });

  it("concurrent duplicate deliveries: only one request is processed even when both arrive simultaneously", async () => {
    // This test exercises the race window between the in-memory cache miss /
    // DB check and the DB write.  Two identical deliveries are fired at the
    // same time via Promise.all so they interleave at every await point.
    // The inFlightWebhookEventIds set is the synchronous guard that prevents
    // both from proceeding past the DB check into the event-handling switch.
    //
    // Both caches start cold (cleared in beforeEach), so both requests will
    // pass the in-memory cache check and both will await the DB check mock.
    // The first one to resume claims the inFlightWebhookEventIds slot; the
    // second finds it occupied and returns duplicate:true.  At the end,
    // markStripeEventPending/markStripeEventCommitted must have been called exactly once each.
    const body = makeWebhookBody(makeStripeEvent(EVENT_ID));

    const [res1, res2] = await Promise.all([
      request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/octet-stream")
        .set("stripe-signature", FAKE_SIG)
        .send(body),
      request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/octet-stream")
        .set("stripe-signature", FAKE_SIG)
        .send(body),
    ]);

    // Both requests must complete successfully
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);

    const bodies = [res1.body, res2.body];

    // Exactly one must be the authoritative (non-duplicate) response
    const processedResponses = bodies.filter((b) => b.duplicate === undefined);
    const duplicateResponses = bodies.filter((b) => b.duplicate === true);

    expect(processedResponses).toHaveLength(1);
    expect(processedResponses[0]).toMatchObject({ received: true });
    expect(duplicateResponses).toHaveLength(1);
    expect(duplicateResponses[0]).toMatchObject({ received: true, duplicate: true });

    // The DB write must have happened exactly once — the DB `INSERT … ON CONFLICT
    // DO NOTHING` is the last line of defence and must not be called twice.
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).toHaveBeenCalledWith(EVENT_ID);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_ID);
  });
});

// ---------------------------------------------------------------------------
// recoverIncompleteStripeEvents — background recovery of Stripe events whose
// side effects were claimed (row inserted) but never marked complete, e.g.
// because the process crashed mid-handler.
// ---------------------------------------------------------------------------

describe("recoverIncompleteStripeEvents — incomplete side-effect recovery", () => {
  let app: express.Express;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();

    mockGetIncompleteStripeProcessedEvents.mockReset().mockResolvedValue([]);
    mockMarkStripeEventSideEffectsComplete.mockReset().mockResolvedValue(undefined);
    mockEventsRetrieve.mockReset();

    // registerRoutes wires processStripeEventSideEffectsRef, which the
    // recovery function needs in order to re-run side effects.
    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty array and does not call Stripe when there are no incomplete events", async () => {
    mockGetIncompleteStripeProcessedEvents.mockResolvedValueOnce([]);

    const results = await recoverIncompleteStripeEvents(15);

    expect(results).toEqual([]);
    expect(mockEventsRetrieve).not.toHaveBeenCalled();
    expect(mockMarkStripeEventSideEffectsComplete).not.toHaveBeenCalled();
  });

  it("re-fetches an incomplete event from Stripe, re-runs side effects, and marks it complete", async () => {
    const eventId = "evt_incomplete_recovered_01";
    const processedAt = new Date(Date.now() - 20 * 60 * 1000);
    mockGetIncompleteStripeProcessedEvents.mockResolvedValueOnce([
      { eventId, processedAt },
    ]);
    mockEventsRetrieve.mockResolvedValueOnce(makeStripeEvent(eventId));

    const results = await recoverIncompleteStripeEvents(15);

    expect(mockEventsRetrieve).toHaveBeenCalledWith(eventId);
    expect(mockMarkStripeEventSideEffectsComplete).toHaveBeenCalledWith(eventId);
    expect(results).toEqual([{ eventId, processedAt, outcome: "recovered" }]);
  });

  it("marks an event as not_found_in_stripe when Stripe no longer has the event (past retention)", async () => {
    const eventId = "evt_incomplete_missing_01";
    const processedAt = new Date(Date.now() - 20 * 60 * 1000);
    mockGetIncompleteStripeProcessedEvents.mockResolvedValueOnce([
      { eventId, processedAt },
    ]);
    const notFoundError = Object.assign(new Error("No such event"), {
      code: "resource_missing",
    });
    mockEventsRetrieve.mockRejectedValueOnce(notFoundError);

    const results = await recoverIncompleteStripeEvents(15);

    expect(mockMarkStripeEventSideEffectsComplete).not.toHaveBeenCalled();
    expect(results).toEqual([
      { eventId, processedAt, outcome: "not_found_in_stripe", error: "No such event" },
    ]);
  });

  it("marks an event as failed (and leaves it incomplete) when re-running side effects throws", async () => {
    const eventId = "evt_incomplete_failed_01";
    const processedAt = new Date(Date.now() - 20 * 60 * 1000);
    mockGetIncompleteStripeProcessedEvents.mockResolvedValueOnce([
      { eventId, processedAt },
    ]);
    mockEventsRetrieve.mockRejectedValueOnce(new Error("Stripe API timeout"));

    const results = await recoverIncompleteStripeEvents(15);

    expect(mockMarkStripeEventSideEffectsComplete).not.toHaveBeenCalled();
    expect(results).toEqual([
      { eventId, processedAt, outcome: "failed", error: "Stripe API timeout" },
    ]);
  });

  it("processes multiple incomplete events independently, one failure does not block the others", async () => {
    const recoveredId = "evt_multi_recovered";
    const failedId = "evt_multi_failed";
    const processedAt = new Date(Date.now() - 30 * 60 * 1000);
    mockGetIncompleteStripeProcessedEvents.mockResolvedValueOnce([
      { eventId: recoveredId, processedAt },
      { eventId: failedId, processedAt },
    ]);
    mockEventsRetrieve
      .mockResolvedValueOnce(makeStripeEvent(recoveredId))
      .mockRejectedValueOnce(new Error("boom"));

    const results = await recoverIncompleteStripeEvents(15);

    expect(results).toEqual([
      { eventId: recoveredId, processedAt, outcome: "recovered" },
      { eventId: failedId, processedAt, outcome: "failed", error: "boom" },
    ]);
    expect(mockMarkStripeEventSideEffectsComplete).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventSideEffectsComplete).toHaveBeenCalledWith(recoveredId);
  });
});

// ---------------------------------------------------------------------------
// Event-type specific idempotency tests
// Verify that checkout.session.completed and customer.subscription.updated
// side-effect storage calls (updateUserStripeSubscription,
// updateUserSubscriptionStatus, getUser, etc.) are NOT triggered on the
// second delivery of the same event.
// ---------------------------------------------------------------------------

function makeCheckoutSessionCompletedEvent(eventId: string): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test_checkout_01",
        object: "checkout.session",
        mode: "subscription",
        subscription: "sub_test_checkout_01",
        amount_total: 500,
        metadata: {
          userId: "user_test_checkout_01",
          plan: "homeowner",
        },
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

function makeSubscriptionUpdatedEvent(eventId: string): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_test_updated_01",
        object: "subscription",
        customer: "cus_test_subscription_01",
        status: "active",
        items: {
          data: [
            {
              price: {
                id: "price_test_monthly_01",
                recurring: { usage_type: "licensed" },
              },
            },
          ],
        },
      },
      previous_attributes: {},
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

describe("Stripe webhook idempotency — event-type specific (checkout.session.completed, customer.subscription.updated)", () => {
  let app: express.Express;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();

    mockGetRecentStripeProcessedEventIds.mockReset().mockResolvedValue(new Map());
    mockHasProcessedStripeEvent.mockReset().mockResolvedValue(false);
    mockMarkStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(undefined);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);
    mockGetUser.mockReset().mockResolvedValue(null);
    mockUpdateUserStripeSubscription.mockReset().mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus2.mockReset().mockResolvedValue(undefined);
    mockUpsertUser.mockReset().mockResolvedValue(undefined);
    mockGetUserByStripeCustomerId2.mockReset().mockResolvedValue(null);

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    vi.clearAllMocks();
  });

  it("checkout.session.completed: second delivery is short-circuited with no side effects", async () => {
    const EVENT_ID = "evt_checkout_idempotency_test_001";
    const event = makeCheckoutSessionCompletedEvent(EVENT_ID);

    // Make getUser return a real user so the subscription side-effects fire on
    // the first delivery (proves the code path was actually exercised).
    const fakeUser = {
      id: "user_test_checkout_01",
      role: "agent", // agent role avoids maxHouses / contractor-tier branches
      companyId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
    };
    mockGetUser.mockResolvedValue(fakeUser);
    mockConstructEvent.mockReset().mockReturnValue(event);

    // ── First delivery ───────────────────────────────────────────────────────
    const first = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ received: true });
    expect(first.body.duplicate).toBeUndefined();

    // Side-effect calls must have fired exactly once
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockGetUser).toHaveBeenCalledWith("user_test_checkout_01");
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();

    // ── Second delivery (Stripe retry) ───────────────────────────────────────
    mockConstructEvent.mockReturnValue(event);
    const second = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ received: true, duplicate: true });

    // No additional side-effect calls — counts must remain at 1
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
  });

  it("customer.subscription.updated: second delivery is short-circuited with no side effects", async () => {
    const EVENT_ID = "evt_sub_updated_idempotency_test_001";
    const event = makeSubscriptionUpdatedEvent(EVENT_ID);

    // Return a user without companyId so the metered-seat branch is skipped,
    // keeping this test focused on the core subscription update side-effects.
    const fakeUser = {
      id: "user_test_sub_01",
      role: "homeowner",
      companyId: null,
      stripeCustomerId: "cus_test_subscription_01",
      stripeSubscriptionId: null,
      subscriptionStatus: null,
    };
    mockGetUserByStripeCustomerId2.mockResolvedValue(fakeUser);
    mockConstructEvent.mockReset().mockReturnValue(event);

    // ── First delivery ───────────────────────────────────────────────────────
    const first = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(first.status).toBe(200);
    expect(first.body).toMatchObject({ received: true });
    expect(first.body.duplicate).toBeUndefined();

    // Side-effect calls must have fired exactly once
    expect(mockGetUserByStripeCustomerId2).toHaveBeenCalledOnce();
    expect(mockGetUserByStripeCustomerId2).toHaveBeenCalledWith("cus_test_subscription_01");
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledWith(
      "user_test_sub_01",
      "sub_test_updated_01",
      "price_test_monthly_01",
    );
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith("user_test_sub_01", "active");
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();

    // ── Second delivery (Stripe retry) ───────────────────────────────────────
    mockConstructEvent.mockReturnValue(event);
    const second = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ received: true, duplicate: true });

    // No additional side-effect calls — counts must remain at 1
    expect(mockGetUserByStripeCustomerId2).toHaveBeenCalledOnce();
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Crash-mid-write / server-restart simulation
//
// Scenario: markStripeEventPending() is called BEFORE the checkout side
// effects run (see routes.ts comment above the call site) specifically so
// that a crash/outage between the DB write and the side effects leaves the
// event durably marked "pending" rather than leaving side effects
// unprotected. This test instead covers the mirror case explicitly called
// out in the task: the process crashes/restarts while
// markStripeEventPending() itself is failing to complete (e.g. the DB
// write throws), so the in-memory cache is never warmed for that delivery.
// On "restart" the in-memory caches are cold (cleared, as they would be on a
// fresh process) and Stripe's retry arrives again. The DB row from the
// first, failed attempt is the last line of defence: hasProcessedStripeEvent
// must reflect whatever the DB actually persisted, and side effects
// (updateUserStripeSubscription / updateUserSubscriptionStatus) must fire at
// most once total across both deliveries.
// ---------------------------------------------------------------------------

describe("Stripe webhook idempotency — crash mid-write then restart (checkout.session.completed)", () => {
  let app: express.Express;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();

    mockGetRecentStripeProcessedEventIds.mockReset().mockResolvedValue(new Map());
    mockHasProcessedStripeEvent.mockReset().mockResolvedValue(false);
    mockMarkStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(undefined);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);
    mockGetUser.mockReset().mockResolvedValue(null);
    mockUpdateUserStripeSubscription.mockReset().mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus2.mockReset().mockResolvedValue(undefined);
    mockUpsertUser.mockReset().mockResolvedValue(undefined);
    mockGetUserByStripeCustomerId2.mockReset().mockResolvedValue(null);

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    vi.clearAllMocks();
  });

  it("first delivery crashes mid-write (markStripeEventPending throws); after a cold restart the DB fallback prevents duplicate side effects", async () => {
    const EVENT_ID = "evt_checkout_crash_restart_test_001";
    const event = makeCheckoutSessionCompletedEvent(EVENT_ID);

    const fakeUser = {
      id: "user_test_checkout_01",
      role: "agent",
      companyId: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      subscriptionStatus: null,
    };
    mockGetUser.mockResolvedValue(fakeUser);
    mockConstructEvent.mockReset().mockReturnValue(event);

    // Simulate an outage/crash: the very first attempt to durably record the
    // event throws (e.g. the process is killed mid-write, or the DB write
    // itself fails). The handler must abort BEFORE running any of the
    // checkout side effects, since markStripeEventPending() is called
    // ahead of the switch statement.
    mockMarkStripeEventPending.mockRejectedValueOnce(new Error("simulated crash mid-write"));

    const crashed = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    // The handler's catch block returns 500 so Stripe will retry.
    expect(crashed.status).toBe(500);

    // Side effects must NOT have run — the crash happened before the switch.
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockUpdateUserStripeSubscription).not.toHaveBeenCalled();
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).not.toHaveBeenCalled();

    // The in-flight slot must be released on error so the retry isn't
    // permanently blocked by the concurrency guard.
    expect(inFlightWebhookEventIds.has(EVENT_ID)).toBe(false);
    // The in-memory "processed" cache must NOT have been warmed, since the
    // durable write never succeeded.
    expect(processedWebhookEventIds.has(EVENT_ID)).toBe(false);

    // ── Simulate a server restart ─────────────────────────────────────────
    // In-memory caches are cold on a fresh process. We model the fact that
    // the crashed write may or may not have partially landed in the DB by
    // asserting the safe (worst-case-for-idempotency) outcome: the write did
    // NOT land, so Stripe's retry must re-attempt markStripeEventPending
    // and this time succeed, running side effects exactly once.
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    mockHasProcessedStripeEvent.mockResolvedValue(false);
    mockMarkStripeEventPending.mockReset().mockResolvedValue(undefined);

    const retry = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ received: true });
    expect(retry.body.duplicate).toBeUndefined();

    // Side effects now fire exactly once (never doubled across the crash + retry).
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();

    // ── A second Stripe retry after the successful write must be a no-op ────
    // This exercises the literal DB-fallback path named in the task: cache
    // is cold again (fresh process), but the DB now has the record, so
    // hasProcessedStripeEvent must short-circuit before any side effects run.
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    mockHasProcessedStripeEvent.mockResolvedValueOnce(true);

    const secondRetryAfterRestart = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(secondRetryAfterRestart.status).toBe(200);
    expect(secondRetryAfterRestart.body).toMatchObject({ received: true, duplicate: true });

    // Still exactly one total call each — no duplication introduced by the
    // extra retry hitting the DB fallback path.
    expect(mockGetUser).toHaveBeenCalledOnce();
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventPending).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
  });
});
