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
  mockClaimStripeEvent,
  mockClaimStaleStripeEvent,
  mockRefreshStripeEventClaim,
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
  mockApplyUserStripeSubscriptionState,
  mockUpdateUserMaxHousesAllowed,
  mockSubscriptionsRetrieve,
  mockPricesList,
  mockUpsertPendingSeatSync,
  mockDeletePendingSeatSync,
  mockSendEmail,
} = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockEventsRetrieve: vi.fn(),
  mockClaimStripeEvent: vi.fn().mockResolvedValue("claimed"),
  mockClaimStaleStripeEvent: vi.fn().mockResolvedValue(true),
  mockRefreshStripeEventClaim: vi.fn().mockResolvedValue(true),
  mockMarkStripeEventCommitted: vi.fn().mockResolvedValue(true),
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
  mockApplyUserStripeSubscriptionState: vi.fn().mockResolvedValue(undefined),
  mockUpdateUserMaxHousesAllowed: vi.fn().mockResolvedValue(undefined),
  mockSubscriptionsRetrieve: vi.fn().mockResolvedValue({
    id: "sub_test_checkout_01",
    customer: "cus_test_checkout_01",
    status: "active",
    items: { data: [{ price: { id: "price_test_monthly_01" } }] },
  }),
  mockPricesList: vi.fn().mockResolvedValue({ data: [] }),
  mockUpsertPendingSeatSync: vi.fn().mockResolvedValue(undefined),
  mockDeletePendingSeatSync: vi.fn().mockResolvedValue(undefined),
  mockSendEmail: vi.fn().mockResolvedValue(true),
}));

mockApplyUserStripeSubscriptionState.mockImplementation(
  async (
    userId: string,
    subscriptionId: string,
    priceId: string,
    status: string,
    eventAt?: Date,
  ) => {
    await mockUpdateUserStripeSubscription(userId, subscriptionId, priceId, eventAt);
    await mockUpdateUserSubscriptionStatus2(userId, status, eventAt);
  },
);

// ---------------------------------------------------------------------------
// Module mocks — hoisted before all imports by Vitest
// ---------------------------------------------------------------------------

// Stripe: use a regular constructor function (not arrow) so `new Stripe(...)` works.
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: mockConstructEvent };
    this.events = { retrieve: mockEventsRetrieve };
    this.subscriptions = { retrieve: mockSubscriptionsRetrieve };
    this.prices = {
      list: mockPricesList,
      create: vi.fn().mockResolvedValue({ id: "price_test_seat" }),
    };
    this.products = {
      create: vi.fn().mockResolvedValue({ id: "prod_test_seat" }),
      update: vi.fn().mockResolvedValue(undefined),
    };
    this.subscriptionItems = {
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      del: vi.fn().mockResolvedValue({}),
    };
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
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getRecentStripeProcessedEventIds: mockGetRecentStripeProcessedEventIds,
      claimStripeEvent: mockClaimStripeEvent,
      claimStaleStripeEvent: mockClaimStaleStripeEvent,
      refreshStripeEventClaim: mockRefreshStripeEventClaim,
      markStripeEventCommitted: mockMarkStripeEventCommitted,
      deleteStripeEventPending: mockDeleteStripeEventPending,
      recordProcessedStripeEvent: mockRecordProcessedStripeEvent,
      markStripeEventSideEffectsComplete: mockMarkStripeEventSideEffectsComplete,
      getIncompleteStripeProcessedEvents: mockGetIncompleteStripeProcessedEvents,
      pruneOldStripeProcessedEvents: mockPruneOldStripeProcessedEvents,
      getUserByStripeCustomerId: mockGetUserByStripeCustomerId2,
      updateUserSubscriptionStatus: mockUpdateUserSubscriptionStatus2,
      getUser: mockGetUser,
      updateUserStripeSubscription: mockUpdateUserStripeSubscription,
      upsertUser: mockUpsertUser,
      applyUserStripeSubscriptionState: mockApplyUserStripeSubscriptionState,
      updateUserMaxHousesAllowed: mockUpdateUserMaxHousesAllowed,
      upsertPendingSeatSync: mockUpsertPendingSeatSync,
      deletePendingSeatSync: mockDeletePendingSeatSync,
    }),
  };
});

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
  sendEmail: mockSendEmail,
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
// pool.query must return a Promise (not undefined) because pg-rate-limit-store.ts
// calls pool.query(INIT_SQL).catch(...) at module init time.
vi.mock("../db", () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn().mockResolvedValue({
      query: vi.fn().mockResolvedValue({ rows: [] }),
      release: vi.fn(),
    }),
    end: vi.fn(),
  },
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
  startStripeEventLease,
  resetSeatPriceCache,
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

describe("Stripe event lease finalization", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("waits for an in-progress heartbeat and commits with its refreshed lease timestamp", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-25T14:05:00.000Z"));
    const eventId = "evt_lease_heartbeat_commit_race";
    const initialClaimedAt = new Date();
    let resolveRefresh!: (value: boolean) => void;
    const refreshPromise = new Promise<boolean>((resolve) => {
      resolveRefresh = resolve;
    });
    mockRefreshStripeEventClaim.mockReset().mockReturnValueOnce(refreshPromise);
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);

    const lease = startStripeEventLease(eventId, initialClaimedAt);
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(mockRefreshStripeEventClaim).toHaveBeenCalledWith(
      eventId,
      initialClaimedAt,
      expect.any(Date),
    );
    const refreshedAt = mockRefreshStripeEventClaim.mock.calls[0][2] as Date;

    const commit = lease.commit();
    expect(mockMarkStripeEventCommitted).not.toHaveBeenCalled();

    resolveRefresh(true);
    await commit;

    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(eventId, refreshedAt);
    lease.stop();
  });
});

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
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
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

    // The atomic claim and commit must each run exactly once.
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
    expect(mockClaimStripeEvent).toHaveBeenCalledWith(EVENT_ID, expect.any(Date));
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_ID, expect.any(Date));

    // ── Second POST — Stripe retry with the same event ID ───────────────────
    const second = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);

    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ received: true, duplicate: true });

    // The in-memory cache must have blocked the second call before any DB access
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce(); // still one total
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
    mockClaimStripeEvent.mockClear();

    // Second retry — cache is warm, DB must NOT be consulted
    const retry = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);

    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ received: true, duplicate: true });
    expect(mockClaimStripeEvent).not.toHaveBeenCalled();
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

    // Both events must have been atomically claimed once.
    expect(mockClaimStripeEvent).toHaveBeenCalledTimes(2);
    expect(mockClaimStripeEvent).toHaveBeenCalledWith(EVENT_A, expect.any(Date));
    expect(mockClaimStripeEvent).toHaveBeenCalledWith(EVENT_B, expect.any(Date));
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledTimes(2);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_A, expect.any(Date));
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_B, expect.any(Date));

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
    expect(mockClaimStripeEvent).toHaveBeenCalledTimes(2);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledTimes(2);
  });

  it("returns duplicate:true via the DB fallback when cache is cold but DB already has the event", async () => {
    // Simulate a server-restart scenario: in-memory cache is empty (cold) but
    // the DB already recorded this event from a previous server instance.
    mockClaimStripeEvent.mockResolvedValueOnce("committed");

    const body = makeWebhookBody(makeStripeEvent(EVENT_ID));
    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true, duplicate: true });

    // The database reported this event was already committed.
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).not.toHaveBeenCalled();
  });

  it("does not acknowledge or cache an event when its conditional commit loses the lease", async () => {
    mockMarkStripeEventCommitted.mockResolvedValueOnce(false);

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(makeStripeEvent(EVENT_ID)));

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("lease was lost");
    expect(mockClaimStripeEvent).toHaveBeenCalledWith(EVENT_ID, expect.any(Date));
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_ID, expect.any(Date));
    expect(processedWebhookEventIds.has(EVENT_ID)).toBe(false);
    expect(inFlightWebhookEventIds.has(EVENT_ID)).toBe(false);
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
    // claimStripeEvent/markStripeEventCommitted must have been called exactly once each.
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
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
    expect(mockClaimStripeEvent).toHaveBeenCalledWith(EVENT_ID, expect.any(Date));
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(EVENT_ID, expect.any(Date));
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
    mockClaimStaleStripeEvent.mockReset().mockResolvedValue(true);
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
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(eventId, expect.any(Date));
    expect(results).toEqual([{ eventId, processedAt, outcome: "recovered" }]);
  });

  it("skips an incomplete event already leased by another recovery worker", async () => {
    const eventId = "evt_incomplete_leased_elsewhere_01";
    const processedAt = new Date(Date.now() - 20 * 60 * 1000);
    mockGetIncompleteStripeProcessedEvents.mockResolvedValueOnce([{ eventId, processedAt }]);
    mockClaimStaleStripeEvent.mockResolvedValueOnce(false);

    const results = await recoverIncompleteStripeEvents(15);

    expect(results).toEqual([]);
    expect(mockEventsRetrieve).not.toHaveBeenCalled();
    expect(mockMarkStripeEventCommitted).not.toHaveBeenCalled();
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
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(recoveredId, expect.any(Date));
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
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);
    mockGetUser.mockReset().mockResolvedValue(null);
    mockUpdateUserStripeSubscription.mockReset().mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus2.mockReset().mockResolvedValue(undefined);
    mockUpsertUser.mockReset().mockResolvedValue(undefined);
    mockUpdateUserMaxHousesAllowed.mockReset().mockResolvedValue(undefined);
    mockGetUserByStripeCustomerId2.mockReset().mockResolvedValue(null);
    mockSubscriptionsRetrieve.mockReset().mockResolvedValue({
      id: "sub_test_checkout_01",
      customer: "cus_test_checkout_01",
      status: "active",
      items: { data: [{ price: { id: "price_test_monthly_01" } }] },
    });

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
    // Initial checkout lookup plus a serialized re-read inside the
    // cross-instance subscription-state lock.
    expect(mockGetUser).toHaveBeenCalledTimes(2);
    expect(mockGetUser).toHaveBeenCalledWith("user_test_checkout_01");
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
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
    expect(mockGetUser).toHaveBeenCalledTimes(2);
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
  });

  it("a separate API process receives retryable pending state and cannot duplicate checkout side effects", async () => {
    const EVENT_ID = "evt_checkout_cross_process_claim_001";
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

    let resolveFirstClaim!: (result: "claimed") => void;
    const firstClaim = new Promise<"claimed">((resolve) => {
      resolveFirstClaim = resolve;
    });
    // The first process owns the durable claim. A second process sees the
    // same database row as active pending and must ask Stripe to retry.
    mockClaimStripeEvent
      .mockImplementationOnce(() => firstClaim)
      .mockResolvedValueOnce("pending");

    const firstRequest = new Promise<request.Response>((resolve, reject) => {
      request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/octet-stream")
        .set("stripe-signature", FAKE_SIG)
        .send(makeWebhookBody(event))
        .end((error, response) => error ? reject(error) : resolve(response));
    });

    await vi.waitFor(() => {
      expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
    });

    // Process-local sets are not shared between API instances. Clearing the
    // set models a second process while both requests retain the same durable
    // claim mock.
    inFlightWebhookEventIds.clear();
    const secondResponse = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(secondResponse.status).toBe(500);
    expect(secondResponse.body).toMatchObject({ retry: true });
    expect(mockGetUser).not.toHaveBeenCalled();

    resolveFirstClaim("claimed");
    const firstResponse = await firstRequest;

    expect(firstResponse.status).toBe(200);
    expect(mockGetUser).toHaveBeenCalledTimes(2);
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
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
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith("user_test_sub_01", "active", expect.any(Date));
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
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
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// Crash-mid-write / server-restart simulation
//
// Scenario: claimStripeEvent() is called BEFORE the checkout side
// effects run (see routes.ts comment above the call site) specifically so
// that a crash/outage between the DB write and the side effects leaves the
// event durably marked "pending" rather than leaving side effects
// unprotected. This test instead covers the mirror case explicitly called
// out in the task: the process crashes/restarts while
// claimStripeEvent() itself is failing to complete (e.g. the DB
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
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
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

  it("first delivery crashes while claiming; after a cold restart the committed claim prevents duplicate side effects", async () => {
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
    // checkout side effects, since claimStripeEvent() is called
    // ahead of the switch statement.
    mockClaimStripeEvent.mockRejectedValueOnce(new Error("simulated crash mid-write"));

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
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
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
    // NOT land, so Stripe's retry must re-attempt the atomic claim
    // and this time succeed, running side effects exactly once.
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");

    const retry = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(retry.status).toBe(200);
    expect(retry.body).toMatchObject({ received: true });
    expect(retry.body.duplicate).toBeUndefined();

    // Side effects now fire exactly once (never doubled across the crash + retry).
    expect(mockGetUser).toHaveBeenCalledTimes(2);
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockClaimStripeEvent).toHaveBeenCalledOnce();
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();

    // ── A second Stripe retry after the successful write must be a no-op ────
    // This exercises the literal DB-fallback path named in the task: cache
    // is cold again (fresh process), but the DB now has the record, so
    // claimStripeEvent must short-circuit before any side effects run.
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    mockClaimStripeEvent.mockResolvedValueOnce("committed");

    const secondRetryAfterRestart = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(secondRetryAfterRestart.status).toBe(200);
    expect(secondRetryAfterRestart.body).toMatchObject({ received: true, duplicate: true });

    // Still exactly one total call each — no duplication introduced by the
    // extra retry hitting the DB fallback path.
    expect(mockGetUser).toHaveBeenCalledTimes(2);
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockClaimStripeEvent).toHaveBeenCalledTimes(2);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// 3DS / incomplete subscription lifecycle tests
//
// Stripe 3DS flow: when a card requires 3D Secure authentication the
// subscription begins in 'incomplete' status.  Two outcomes are possible:
//
//   SUCCESS: The customer completes 3DS → Stripe fires
//     `customer.subscription.updated` with status 'active'.  The user must be
//     upgraded (updateUserSubscriptionStatus called with 'active').
//
//   REJECTION: The customer abandons 3DS or the card is declined → Stripe
//     fires `customer.subscription.updated` with status 'incomplete_expired'
//     (or `customer.subscription.deleted`).  The user must NOT receive an
//     'active' entitlement — status must be set to 'cancelled'.
//
// These tests confirm both legs of that state machine at the webhook layer,
// complementing the sync-subscription tests that cover the checkout-time
// 'incomplete' → 'active' mapping.
// ---------------------------------------------------------------------------

function makeSubscriptionUpdatedEventWithStatus(
  eventId: string,
  status: string,
  previousStatus: string = "incomplete",
): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_test_3ds_01",
        object: "subscription",
        customer: "cus_test_3ds_01",
        status,
        items: {
          data: [
            {
              price: {
                id: "price_test_monthly_3ds",
                recurring: { usage_type: "licensed" },
              },
            },
          ],
        },
      },
      previous_attributes: { status: previousStatus },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

function makeSubscriptionDeletedEvent(eventId: string): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: "sub_test_3ds_deleted",
        object: "subscription",
        customer: "cus_test_3ds_01",
        status: "canceled",
        items: { data: [] },
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

function makeInvoicePaymentFailedEvent(eventId: string): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "invoice.payment_failed",
    data: {
      object: {
        id: "in_test_failed_01",
        object: "invoice",
        customer: "cus_test_3ds_01",
        subscription: "sub_test_3ds_01",
        amount_due: 500,
        period_start: Math.floor(Date.now() / 1000) - 3600,
        period_end: Math.floor(Date.now() / 1000),
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: Math.floor(Date.now() / 1000),
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

describe("Stripe webhook — incomplete subscription 3DS lifecycle (upgrade and rejection paths)", () => {
  const FAKE_USER = {
    id: "user_test_3ds_01",
    role: "homeowner",
    companyId: null,
    email: "homeowner-3ds@test.com",
    stripeCustomerId: "cus_test_3ds_01",
    stripeSubscriptionId: null,
    subscriptionStatus: "incomplete",
  };

  let app: express.Express;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();

    mockGetRecentStripeProcessedEventIds.mockReset().mockResolvedValue(new Map());
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);
    mockGetUser.mockReset().mockResolvedValue(null);
    mockUpdateUserStripeSubscription.mockReset().mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus2.mockReset().mockResolvedValue(undefined);
    mockUpsertUser.mockReset().mockResolvedValue(undefined);
    mockGetUserByStripeCustomerId2.mockReset().mockResolvedValue(FAKE_USER);

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    vi.clearAllMocks();
  });

  // ── SUCCESS PATH ──────────────────────────────────────────────────────────

  it("incomplete→active: customer.subscription.updated with status='active' upgrades the user to 'active'", async () => {
    const EVENT_ID = "evt_3ds_success_incomplete_to_active_001";
    const event = makeSubscriptionUpdatedEventWithStatus(EVENT_ID, "active");
    mockConstructEvent.mockReset().mockReturnValue(event);

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
    expect(res.body.duplicate).toBeUndefined();

    // The user must be looked up by Stripe customer ID
    expect(mockGetUserByStripeCustomerId2).toHaveBeenCalledWith("cus_test_3ds_01");

    // The subscription record must be written
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledWith(
      FAKE_USER.id,
      "sub_test_3ds_01",
      "price_test_monthly_3ds",
      expect.any(Date),
    );

    // The user must be upgraded to 'active' — not left in 'incomplete'
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      FAKE_USER.id,
      "active",
      expect.any(Date),
    );
  });

  it("incomplete→active: the upgrade is idempotent — a second delivery of the same event does not double-write", async () => {
    const EVENT_ID = "evt_3ds_success_idempotent_002";
    const event = makeSubscriptionUpdatedEventWithStatus(EVENT_ID, "active");
    mockConstructEvent.mockReset().mockReturnValue(event);

    const body = makeWebhookBody(event);

    const first = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);
    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBeUndefined();

    const second = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(body);
    expect(second.status).toBe(200);
    expect(second.body).toMatchObject({ received: true, duplicate: true });

    // Storage writes must have happened exactly once despite two deliveries
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      FAKE_USER.id,
      "active",
      expect.any(Date),
    );
  });

  // ── REJECTION PATHS ───────────────────────────────────────────────────────

  it("incomplete_expired: customer.subscription.updated with status='incomplete_expired' does NOT grant active entitlement", async () => {
    const EVENT_ID = "evt_3ds_rejected_incomplete_expired_001";
    const event = makeSubscriptionUpdatedEventWithStatus(
      EVENT_ID,
      "incomplete_expired",
    );
    mockConstructEvent.mockReset().mockReturnValue(event);

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });

    expect(mockGetUserByStripeCustomerId2).toHaveBeenCalledWith("cus_test_3ds_01");

    // Status must be 'cancelled', not 'active' — the incomplete sub was rejected
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      FAKE_USER.id,
      "cancelled",
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalledWith(
      FAKE_USER.id,
      "active",
      expect.any(Date),
    );
  });

  it("subscription deleted: customer.subscription.deleted sets status to 'cancelled', not 'active'", async () => {
    const EVENT_ID = "evt_3ds_rejected_sub_deleted_001";
    const event = makeSubscriptionDeletedEvent(EVENT_ID);
    // The deleted handler looks up by customerId too
    mockGetUserByStripeCustomerId2.mockResolvedValue(FAKE_USER);
    mockConstructEvent.mockReset().mockReturnValue(event);

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });

    // User must be marked cancelled — never upgraded to active
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      FAKE_USER.id,
      "cancelled",
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalledWith(
      FAKE_USER.id,
      "active",
      expect.any(Date),
    );
  });

  it("invoice.payment_failed: rejected payment on an incomplete sub sets status to 'past_due', not 'active'", async () => {
    const EVENT_ID = "evt_3ds_invoice_payment_failed_001";
    const event = makeInvoicePaymentFailedEvent(EVENT_ID);
    // payment_failed handler uses getUserByStripeCustomerId, same mock
    mockGetUserByStripeCustomerId2.mockResolvedValue(FAKE_USER);
    mockConstructEvent.mockReset().mockReturnValue(event);

    // createSubscriptionCycleEvent is called by the payment_failed handler;
    // stub it via storage mock (it falls through to the default no-op)
    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });

    // payment_failed must mark user 'past_due' — never 'active'
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      FAKE_USER.id,
      "past_due",
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalledWith(
      FAKE_USER.id,
      "active",
      expect.any(Date),
    );
  });

  it("trialing→past_due: a failed first payment after trial expiry does not grant active entitlement", async () => {
    const EVENT_ID = "evt_trial_ended_payment_failed_001";
    const event = makeSubscriptionUpdatedEventWithStatus(
      EVENT_ID,
      "past_due",
      "trialing",
    );
    mockGetUserByStripeCustomerId2.mockResolvedValue({
      ...FAKE_USER,
      subscriptionStatus: "trialing",
    });
    mockConstructEvent.mockReset().mockReturnValue(event);

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      FAKE_USER.id,
      "past_due",
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalledWith(
      FAKE_USER.id,
      "active",
      expect.any(Date),
    );
  });

  it("trialing→canceled: a trial canceled by the user is stored as cancelled and never active", async () => {
    const EVENT_ID = "evt_trial_canceled_by_user_001";
    const event = makeSubscriptionUpdatedEventWithStatus(
      EVENT_ID,
      "canceled",
      "trialing",
    );
    mockGetUserByStripeCustomerId2.mockResolvedValue({
      ...FAKE_USER,
      subscriptionStatus: "trialing",
    });
    mockConstructEvent.mockReset().mockReturnValue(event);

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      FAKE_USER.id,
      "cancelled",
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalledWith(
      FAKE_USER.id,
      "active",
      expect.any(Date),
    );
  });
});

// ---------------------------------------------------------------------------
// Subscription event-ordering guard — out-of-order / stale redelivery
//
// Stripe does not guarantee webhook delivery order. A delayed or re-queued
// `customer.subscription.updated`, `customer.subscription.deleted`,
// `invoice.payment_failed`, or `invoice.paid` event carrying an OLDER
// `event.created` timestamp
// can arrive after a newer event for the same user has already been applied.
// Without a guard, blindly applying the older event's data would silently
// clobber the newer, correct state. These tests drive two full webhook
// deliveries through the real route handler (distinct event IDs, so the
// exact-duplicate dedup cache does not intervene) and assert the ordering
// guard — not the dedup cache — is what protects the state.
// ---------------------------------------------------------------------------

function makeSubscriptionUpdatedEventWithCreated(
  eventId: string,
  status: string,
  createdSeconds: number,
  subscriptionId: string,
  customerId: string,
): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
        customer: customerId,
        status,
        items: {
          data: [
            {
              price: {
                id: "price_test_ordering_monthly",
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
    created: createdSeconds,
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

function makeSubscriptionDeletedEventWithCreated(
  eventId: string,
  createdSeconds: number,
  subscriptionId: string,
  customerId: string,
): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "customer.subscription.deleted",
    data: {
      object: {
        id: subscriptionId,
        object: "subscription",
        customer: customerId,
        status: "canceled",
        items: { data: [] },
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: createdSeconds,
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

function makeInvoicePaymentFailedEventWithCreated(
  eventId: string,
  createdSeconds: number,
  subscriptionId: string,
  customerId: string,
): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "invoice.payment_failed",
    data: {
      object: {
        id: "in_test_ordering_failed",
        object: "invoice",
        customer: customerId,
        subscription: subscriptionId,
        amount_due: 500,
        period_start: createdSeconds - 3600,
        period_end: createdSeconds,
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: createdSeconds,
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

function makeInvoicePaidEventWithCreated(
  eventId: string,
  createdSeconds: number,
  subscriptionId: string,
  customerId: string,
): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "invoice.paid",
    data: {
      object: {
        id: `in_test_ordering_paid_${eventId}`,
        object: "invoice",
        customer: customerId,
        subscription: subscriptionId,
        amount_paid: 2000,
        period_start: createdSeconds - 3600,
        period_end: createdSeconds,
      },
    },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: createdSeconds,
    api_version: "2025-08-27.basil",
  } as unknown as Stripe.Event;
}

type InvoiceSubscriptionPayloadShape =
  | "current"
  | "legacy-subscription"
  | "legacy-subscription-id"
  | "missing";

function makeInvoicePaidEventWithSubscriptionShape(
  eventId: string,
  subscriptionId: string,
  customerId: string,
  shape: InvoiceSubscriptionPayloadShape,
): Stripe.Event {
  const invoice: Record<string, unknown> = {
    id: `in_test_subscription_shape_${eventId}`,
    object: "invoice",
    customer: customerId,
    amount_paid: 500,
    period_start: Math.floor(Date.now() / 1000) - 3600,
    period_end: Math.floor(Date.now() / 1000),
  };

  if (shape === "current") {
    invoice.parent = {
      type: "subscription_details",
      subscription_details: { subscription: subscriptionId },
    };
  } else if (shape === "legacy-subscription") {
    invoice.subscription = subscriptionId;
  } else if (shape === "legacy-subscription-id") {
    invoice.subscriptionId = subscriptionId;
  }

  return {
    id: eventId,
    object: "event",
    type: "invoice.paid",
    data: { object: invoice },
    livemode: false,
    pending_webhooks: 0,
    request: null,
    created: Math.floor(Date.now() / 1000),
    api_version: "2026-04-22.dahlia",
  } as unknown as Stripe.Event;
}

describe("Stripe webhook — invoice subscription payload compatibility", () => {
  let app: express.Express;

  const USER_ID = "user_test_invoice_shape_01";
  const CUSTOMER_ID = "cus_test_invoice_shape_01";
  const SUBSCRIPTION_ID = "sub_test_invoice_shape_01";
  const fakeUser = {
    id: USER_ID,
    role: "homeowner",
    companyId: null,
    email: "invoice-shape@test.com",
    stripeCustomerId: CUSTOMER_ID,
    stripeSubscriptionId: null,
    subscriptionStatus: "trialing",
    stripeSubscriptionEventAt: null,
  };

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    mockGetRecentStripeProcessedEventIds.mockReset().mockResolvedValue(new Map());
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);
    mockGetUserByStripeCustomerId2.mockReset().mockResolvedValue(fakeUser);
    mockGetUser.mockReset().mockResolvedValue(fakeUser);
    mockSubscriptionsRetrieve.mockReset().mockImplementation(async (subscriptionId: string) => ({
      id: subscriptionId,
      customer: CUSTOMER_ID,
      status: "active",
      items: { data: [{ price: { id: "price_test_invoice_shape" } }] },
    }));
    mockApplyUserStripeSubscriptionState.mockClear();

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    vi.restoreAllMocks();
  });

  it.each([
    ["current parent.subscription_details.subscription", "current"],
    ["legacy subscription", "legacy-subscription"],
    ["legacy subscriptionId", "legacy-subscription-id"],
  ] as const)("invoice.paid resolves the %s payload shape", async (_label, shape) => {
    const event = makeInvoicePaidEventWithSubscriptionShape(
      `evt_invoice_shape_${shape}`,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
      shape,
    );
    mockConstructEvent.mockReset().mockReturnValueOnce(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ received: true });
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith(SUBSCRIPTION_ID);
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(
      event.id,
      expect.any(Date),
    );
  });

  it("invoice.paid without any subscription shape warns and commits without crashing", async () => {
    const event = makeInvoicePaidEventWithSubscriptionShape(
      "evt_invoice_shape_missing",
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
      "missing",
    );
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockConstructEvent.mockReset().mockReturnValueOnce(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ received: true });
    expect(mockSubscriptionsRetrieve).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("paid without a subscription; skipping subscription activation"),
    );
    expect(mockMarkStripeEventCommitted).toHaveBeenCalledWith(
      event.id,
      expect.any(Date),
    );
  });
});

describe("Stripe webhook — subscription event ordering guard (out-of-order / stale redelivery)", () => {
  let app: express.Express;
  let currentUser: {
    id: string;
    role: string;
    companyId: string | null;
    email: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    subscriptionStatus: string;
    stripeSubscriptionEventAt: Date | null;
  };

  const USER_ID = "user_test_ordering_01";
  const CUSTOMER_ID = "cus_test_ordering_01";
  const SUBSCRIPTION_ID = "sub_test_ordering_01";

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();

    mockGetRecentStripeProcessedEventIds.mockReset().mockResolvedValue(new Map());
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);

    currentUser = {
      id: USER_ID,
      role: "homeowner",
      companyId: null,
      email: "ordering@test.com",
      stripeCustomerId: CUSTOMER_ID,
      stripeSubscriptionId: SUBSCRIPTION_ID,
      subscriptionStatus: "active",
      stripeSubscriptionEventAt: null,
    };

    // These mocks act as a tiny in-memory "database row" for currentUser so
    // that a second webhook delivery in the same test observes whatever the
    // first delivery's storage calls actually persisted — the same way the
    // real `users` table would reflect a prior `stripeSubscriptionEventAt`
    // write on the next `getUserByStripeCustomerId` read.
    mockGetUserByStripeCustomerId2.mockReset().mockImplementation(async () => ({ ...currentUser }));
    mockGetUser.mockReset().mockImplementation(async (id: string) =>
      id === USER_ID ? { ...currentUser } : null
    );
    mockUpdateUserStripeSubscription.mockReset().mockImplementation(
      async (_id: string, subId: string, _priceId: string, eventAt?: Date) => {
        currentUser.stripeSubscriptionId = subId;
        if (eventAt) currentUser.stripeSubscriptionEventAt = eventAt;
      },
    );
    mockSubscriptionsRetrieve.mockReset().mockImplementation(async (subscriptionId: string) => ({
      id: subscriptionId,
      customer: CUSTOMER_ID,
      status: "active",
      items: {
        data: [{ price: { id: "price_test_ordering_monthly" } }],
      },
    }));
    mockUpdateUserSubscriptionStatus2.mockReset().mockImplementation(
      async (_id: string, status: string, eventAt?: Date) => {
        currentUser.subscriptionStatus = status;
        if (eventAt) currentUser.stripeSubscriptionEventAt = eventAt;
      },
    );

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    vi.clearAllMocks();
  });

  it("customer.subscription.updated: a stale redelivery arriving after a newer event was applied is ignored, state is not overwritten", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const newerEvent = makeSubscriptionUpdatedEventWithCreated(
      "evt_order_updated_newer_001",
      "past_due",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    // Older event — a different, earlier `event.created`, and a different
    // event ID so the exact-duplicate dedup cache does not short-circuit it.
    const staleEvent = makeSubscriptionUpdatedEventWithCreated(
      "evt_order_updated_stale_001",
      "active",
      nowSeconds - 3600,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );

    // Apply the newer event first — this establishes the baseline timestamp.
    mockConstructEvent.mockReset().mockReturnValueOnce(newerEvent);
    const firstRes = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(newerEvent));
    expect(firstRes.status).toBe(200);
    expect(currentUser.subscriptionStatus).toBe("past_due");
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledOnce();

    mockUpdateUserSubscriptionStatus2.mockClear();
    mockUpdateUserStripeSubscription.mockClear();

    // The stale, delayed event now arrives — must be acknowledged (so Stripe
    // does not keep retrying it) but must NOT touch stored state.
    mockConstructEvent.mockReset().mockReturnValueOnce(staleEvent);
    const secondRes = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(staleEvent));

    expect(secondRes.status).toBe(200);
    expect(secondRes.body).toMatchObject({ received: true });
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    expect(mockUpdateUserStripeSubscription).not.toHaveBeenCalled();
    // Status must remain 'past_due' from the newer event, not reverted to 'active'.
    expect(currentUser.subscriptionStatus).toBe("past_due");
  });

  it("customer.subscription.updated: normal in-order delivery is unaffected by the ordering guard", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const event = makeSubscriptionUpdatedEventWithCreated(
      "evt_order_updated_inorder_001",
      "past_due",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    mockConstructEvent.mockReset().mockReturnValueOnce(event);

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });
    expect(res.body.duplicate).toBeUndefined();
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledWith(
      USER_ID,
      SUBSCRIPTION_ID,
      "price_test_ordering_monthly",
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      USER_ID,
      "past_due",
      expect.any(Date),
    );
    expect(currentUser.subscriptionStatus).toBe("past_due");
  });

  it("customer.subscription.created cannot roll back an updated snapshot from the same Stripe timestamp", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const updatedEvent = makeSubscriptionUpdatedEventWithCreated(
      "evt_order_same_second_updated_001",
      "active",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    const createdEvent = makeSubscriptionUpdatedEventWithCreated(
      "evt_order_same_second_created_001",
      "trialing",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    ) as any;
    createdEvent.type = "customer.subscription.created";

    mockConstructEvent.mockReset().mockReturnValueOnce(updatedEvent);
    await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(updatedEvent));
    expect(currentUser.subscriptionStatus).toBe("active");

    mockUpdateUserSubscriptionStatus2.mockClear();
    mockUpdateUserStripeSubscription.mockClear();
    mockConstructEvent.mockReset().mockReturnValueOnce(createdEvent);
    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(createdEvent));

    expect(response.status).toBe(200);
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    expect(mockUpdateUserStripeSubscription).not.toHaveBeenCalled();
    expect(currentUser.subscriptionStatus).toBe("active");
  });

  it("customer.subscription.deleted: a stale cancellation event does not overwrite a newer status", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const newerEvent = makeSubscriptionUpdatedEventWithCreated(
      "evt_order_deleted_newer_001",
      "active",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    const staleDeletedEvent = makeSubscriptionDeletedEventWithCreated(
      "evt_order_deleted_stale_001",
      nowSeconds - 3600,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );

    mockConstructEvent.mockReset().mockReturnValueOnce(newerEvent);
    await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(newerEvent));
    expect(currentUser.subscriptionStatus).toBe("active");

    mockUpdateUserSubscriptionStatus2.mockClear();

    mockConstructEvent.mockReset().mockReturnValueOnce(staleDeletedEvent);
    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(staleDeletedEvent));

    expect(res.status).toBe(200);
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    // Must remain 'active' — the stale cancellation must not win.
    expect(currentUser.subscriptionStatus).toBe("active");
  });

  it("invoice.payment_failed: a stale payment-failed event does not overwrite a newer status", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const newerEvent = makeSubscriptionUpdatedEventWithCreated(
      "evt_order_invoice_newer_001",
      "active",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    const staleFailedEvent = makeInvoicePaymentFailedEventWithCreated(
      "evt_order_invoice_stale_001",
      nowSeconds - 3600,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );

    mockConstructEvent.mockReset().mockReturnValueOnce(newerEvent);
    await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(newerEvent));
    expect(currentUser.subscriptionStatus).toBe("active");

    mockUpdateUserSubscriptionStatus2.mockClear();

    mockConstructEvent.mockReset().mockReturnValueOnce(staleFailedEvent);
    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(staleFailedEvent));

    expect(res.status).toBe(200);
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    // Must remain 'active' — the stale payment-failure must not mark it past_due.
    expect(currentUser.subscriptionStatus).toBe("active");
  });

  it("invoice.paid: a delayed paid event cannot resurrect a subscription after a newer cancellation", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const newerCancellation = makeSubscriptionDeletedEventWithCreated(
      "evt_order_cancelled_before_paid_001",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    const stalePaidEvent = makeInvoicePaidEventWithCreated(
      "evt_order_paid_stale_after_cancel_001",
      nowSeconds - 3600,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );

    mockConstructEvent.mockReset().mockReturnValueOnce(newerCancellation);
    const cancellationResponse = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(newerCancellation));

    expect(cancellationResponse.status).toBe(200);
    expect(currentUser.subscriptionStatus).toBe("cancelled");
    expect(currentUser.stripeSubscriptionEventAt?.getTime()).toBe(nowSeconds * 1000);

    mockUpdateUserSubscriptionStatus2.mockClear();
    mockApplyUserStripeSubscriptionState.mockClear();
    mockConstructEvent.mockReset().mockReturnValueOnce(stalePaidEvent);

    const paidResponse = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(stalePaidEvent));

    expect(paidResponse.status).toBe(200);
    expect(paidResponse.body).toMatchObject({ received: true });
    expect(mockApplyUserStripeSubscriptionState).not.toHaveBeenCalled();
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    expect(currentUser.subscriptionStatus).toBe("cancelled");
    expect(currentUser.stripeSubscriptionEventAt?.getTime()).toBe(nowSeconds * 1000);
  });

  it("invoice.paid: a delayed paid event cannot clear a newer payment-failure state", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const newerPaymentFailure = makeInvoicePaymentFailedEventWithCreated(
      "evt_order_failed_before_paid_001",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    const stalePaidEvent = makeInvoicePaidEventWithCreated(
      "evt_order_paid_stale_after_failed_001",
      nowSeconds - 3600,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );

    mockConstructEvent.mockReset().mockReturnValueOnce(newerPaymentFailure);
    const failureResponse = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(newerPaymentFailure));

    expect(failureResponse.status).toBe(200);
    expect(currentUser.subscriptionStatus).toBe("past_due");
    expect(currentUser.stripeSubscriptionEventAt?.getTime()).toBe(nowSeconds * 1000);

    mockUpdateUserSubscriptionStatus2.mockClear();
    mockApplyUserStripeSubscriptionState.mockClear();
    mockConstructEvent.mockReset().mockReturnValueOnce(stalePaidEvent);

    const paidResponse = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(stalePaidEvent));

    expect(paidResponse.status).toBe(200);
    expect(paidResponse.body).toMatchObject({ received: true });
    expect(mockApplyUserStripeSubscriptionState).not.toHaveBeenCalled();
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    expect(currentUser.subscriptionStatus).toBe("past_due");
    expect(currentUser.stripeSubscriptionEventAt?.getTime()).toBe(nowSeconds * 1000);
  });

  it("invoice.paid: cancellation wins when Stripe timestamps collide in the same second", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const cancellation = makeSubscriptionDeletedEventWithCreated(
      "evt_order_cancelled_same_second_paid_001",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );
    const paidEvent = makeInvoicePaidEventWithCreated(
      "evt_order_paid_same_second_cancel_001",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );

    mockConstructEvent.mockReset().mockReturnValueOnce(cancellation);
    await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(cancellation));
    expect(currentUser.subscriptionStatus).toBe("cancelled");

    mockApplyUserStripeSubscriptionState.mockClear();
    mockUpdateUserSubscriptionStatus2.mockClear();
    mockConstructEvent.mockReset().mockReturnValueOnce(paidEvent);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(paidEvent));

    expect(response.status).toBe(200);
    expect(mockApplyUserStripeSubscriptionState).not.toHaveBeenCalled();
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalled();
    expect(currentUser.subscriptionStatus).toBe("cancelled");
    expect(currentUser.stripeSubscriptionEventAt?.getTime()).toBe(nowSeconds * 1000);
  });

  it("invoice.paid: a normal in-order payment applies Stripe's active subscription state", async () => {
    const nowSeconds = Math.floor(Date.now() / 1000);
    currentUser.subscriptionStatus = "past_due";
    currentUser.stripeSubscriptionEventAt = new Date((nowSeconds - 3600) * 1000);
    const paidEvent = makeInvoicePaidEventWithCreated(
      "evt_order_paid_in_order_001",
      nowSeconds,
      SUBSCRIPTION_ID,
      CUSTOMER_ID,
    );

    mockConstructEvent.mockReset().mockReturnValueOnce(paidEvent);
    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(paidEvent));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ received: true });
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith(SUBSCRIPTION_ID);
    expect(mockApplyUserStripeSubscriptionState).toHaveBeenCalledWith(
      USER_ID,
      SUBSCRIPTION_ID,
      "price_test_ordering_monthly",
      "active",
      new Date(nowSeconds * 1000),
    );
    expect(currentUser.subscriptionStatus).toBe("active");
    expect(currentUser.stripeSubscriptionEventAt?.getTime()).toBe(nowSeconds * 1000);
  });
});

describe("Stripe webhook — contractor billing state reconciliation", () => {
  let app: express.Express;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    resetSeatPriceCache();

    mockGetRecentStripeProcessedEventIds.mockReset().mockResolvedValue(new Map());
    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
    mockDeleteStripeEventPending.mockReset().mockResolvedValue(undefined);
    mockPruneOldStripeProcessedEvents.mockReset().mockResolvedValue(undefined);
    mockGetUser.mockReset().mockResolvedValue(null);
    mockGetUserByStripeCustomerId2.mockReset().mockResolvedValue(null);
    mockUpdateUserStripeSubscription.mockReset().mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus2.mockReset().mockResolvedValue(undefined);
    mockUpsertUser.mockReset().mockResolvedValue(undefined);
    mockSubscriptionsRetrieve.mockReset().mockResolvedValue({
      id: "sub_test_checkout_01",
      customer: "cus_test_checkout_01",
      status: "active",
      items: { data: [{ price: { id: "price_test_monthly_01" } }] },
    });
    mockPricesList.mockReset().mockResolvedValue({ data: [] });
    mockUpsertPendingSeatSync.mockReset().mockResolvedValue(undefined);
    mockDeletePendingSeatSync.mockReset().mockResolvedValue(undefined);
    mockSendEmail.mockReset().mockResolvedValue(true);

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    vi.clearAllMocks();
  });

  it("customer.subscription.created persists the subscription, price, and real trialing status", async () => {
    const event = makeSubscriptionUpdatedEvent("evt_subscription_created_phase3") as any;
    event.type = "customer.subscription.created";
    event.data.object.status = "trialing";
    event.data.object.customer = "cus_phase3_created";
    event.data.object.id = "sub_phase3_created";
    event.data.object.items.data[0].price.id = "price_phase3_basic";

    mockGetUserByStripeCustomerId2.mockResolvedValue({
      id: "contractor_phase3_created",
      email: "contractor-created@example.com",
      role: "contractor",
      companyId: null,
      stripeSubscriptionEventAt: null,
    });
    mockConstructEvent.mockReset().mockReturnValue(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(response.status).toBe(200);
    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledWith(
      "contractor_phase3_created",
      "sub_phase3_created",
      "price_phase3_basic",
      expect.any(Date),
    );
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      "contractor_phase3_created",
      "trialing",
      expect.any(Date),
    );
  });

  it("checkout.session.completed retrieves and stores trialing instead of assuming active", async () => {
    const event = makeCheckoutSessionCompletedEvent("evt_checkout_trialing_phase3");
    mockGetUser.mockResolvedValue({
      id: "user_test_checkout_01",
      email: "checkout-trialing@example.com",
      role: "contractor",
      companyId: null,
      stripeSubscriptionEventAt: null,
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_test_checkout_01",
      customer: "cus_checkout_trialing",
      status: "trialing",
      items: { data: [{ price: { id: "price_phase3_basic" } }] },
    });
    mockConstructEvent.mockReset().mockReturnValue(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(response.status).toBe(200);
    expect(mockSubscriptionsRetrieve).toHaveBeenCalledWith("sub_test_checkout_01");
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      "user_test_checkout_01",
      "trialing",
      undefined,
    );
    expect(mockUpdateUserSubscriptionStatus2).not.toHaveBeenCalledWith(
      "user_test_checkout_01",
      "active",
    );
    // Contractor checkout no longer performs a second broad upsert that could
    // race and overwrite the serialized subscription status.
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("homeowner unlimited checkout preserves the new Stripe state and stores a null house limit", async () => {
    const event = makeCheckoutSessionCompletedEvent("evt_checkout_homeowner_unlimited_phase3") as any;
    event.data.object.metadata.maxHouses = "999";
    event.data.object.metadata.plan = "premium_plus";
    mockGetUser.mockResolvedValue({
      id: "user_test_checkout_01",
      email: "homeowner-renewal@example.com",
      role: "homeowner",
      companyId: null,
      stripeSubscriptionId: "sub_old_homeowner",
      stripePriceId: "price_old_homeowner",
      stripeSubscriptionEventAt: null,
    });
    mockSubscriptionsRetrieve.mockResolvedValue({
      id: "sub_new_homeowner",
      customer: "cus_homeowner_renewal",
      status: "active",
      items: { data: [{ price: { id: "price_new_homeowner" } }] },
    });
    mockConstructEvent.mockReset().mockReturnValue(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(response.status).toBe(200);
    expect(mockApplyUserStripeSubscriptionState).toHaveBeenCalledWith(
      "user_test_checkout_01",
      "sub_new_homeowner",
      "price_new_homeowner",
      "active",
      undefined,
    );
    expect(mockUpdateUserMaxHousesAllowed).toHaveBeenCalledWith(
      "user_test_checkout_01",
      null,
    );
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("queues a pending seat reconciliation when webhook seat sync fails", async () => {
    const event = makeSubscriptionUpdatedEvent("evt_seat_sync_failure_phase3") as any;
    event.data.object.status = "past_due";
    event.data.object.customer = "cus_phase3_seat_failure";

    mockGetUserByStripeCustomerId2.mockResolvedValue({
      id: "contractor_phase3_seat_failure",
      email: "seat-failure@example.com",
      role: "contractor",
      companyId: "company_phase3_seat_failure",
      stripeSubscriptionEventAt: null,
    });
    mockPricesList.mockRejectedValue(new Error("simulated transient Stripe failure"));
    mockConstructEvent.mockReset().mockReturnValue(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(response.status).toBe(200);
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      "contractor_phase3_seat_failure",
      "past_due",
      expect.any(Date),
    );
    expect(mockUpsertPendingSeatSync).toHaveBeenCalledWith("company_phase3_seat_failure");
    expect(mockDeletePendingSeatSync).not.toHaveBeenCalled();
  });

  it("invoice.payment_failed attempts the contractor payment-failure email with actionable content", async () => {
    const event = makeInvoicePaymentFailedEventWithCreated(
      "evt_payment_failed_email_phase3",
      Math.floor(Date.now() / 1000),
      "sub_phase3_payment_failed",
      "cus_phase3_payment_failed",
    );
    mockGetUserByStripeCustomerId2.mockResolvedValue({
      id: "contractor_phase3_payment_failed",
      email: "billing-owner@example.com",
      role: "contractor",
      companyId: "company_phase3_payment_failed",
      stripeSubscriptionEventAt: null,
    });
    mockConstructEvent.mockReset().mockReturnValue(event);

    const response = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(event));

    expect(response.status).toBe(200);
    expect(mockUpdateUserSubscriptionStatus2).toHaveBeenCalledWith(
      "contractor_phase3_payment_failed",
      "past_due",
      expect.any(Date),
    );
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: "billing-owner@example.com",
      subject: expect.stringContaining("payment failed"),
      text: expect.stringContaining("Subscription & Billing"),
      html: expect.stringContaining("update your payment method"),
    }));
  });
});
