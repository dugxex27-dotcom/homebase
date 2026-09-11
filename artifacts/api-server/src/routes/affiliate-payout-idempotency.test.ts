/**
 * Integration tests: agent affiliate payout double-pay guard
 *
 * Task #883 — a duplicate/replayed `invoice.paid` webhook delivery (Stripe
 * retry, or a distinct event that reports the same underlying referral
 * advancement) must not:
 *   1. Advance the same affiliate referral's consecutiveMonthsPaid twice, or
 *   2. Launch a second real `stripe.transfers.create` payout for the same
 *      affiliate_payouts row.
 *
 * The two deliveries below use DIFFERENT Stripe event IDs (as a genuine
 * duplicate/misfired event or a recovery replay would) so the outer
 * per-eventId dedup (processedWebhookEventIds / claimStripeEvent) does not
 * shield the inner affiliate/payout logic — this test exercises exactly the
 * atomic guards added inside `processStripeEventSideEffects` itself
 * (`advanceAffiliateReferralPayment` + `claimAffiliatePayoutForTransfer` +
 * the Stripe idempotency key on `transfers.create`).
 *
 * Storage's affiliate-referral / affiliate-payout methods are backed by a
 * small stateful fake (not simple resolved-value stubs) that reproduces the
 * real conditional-UPDATE semantics implemented in storage.ts, so the test
 * genuinely proves the race is closed rather than just asserting call counts
 * against unconditional mocks.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared mocks visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  mockConstructEvent,
  mockSubscriptionsRetrieve,
  mockClaimStripeEvent,
  mockMarkStripeEventCommitted,
  mockGetUserByStripeCustomerId,
  mockCreateSubscriptionCycleEvent,
  mockUpdateUserSubscriptionStatus,
  mockGetAgentProfile,
  mockTransfersCreate,
  AGENT_ID,
  USER_ID,
  REFERRAL_ID,
  resetAffiliateState,
  seedPayoutState,
  getAffiliateState,
  mockGetAffiliateReferralByUserId,
  mockAdvanceAffiliateReferralPayment,
  mockUpdateAffiliateReferral,
  mockGetAffiliatePayouts,
  mockGetAffiliateReferral,
  mockGetUser,
  mockCreateAffiliatePayout,
  mockClaimAffiliatePayoutForTransfer,
  mockClaimAffiliatePayoutForRetry,
  mockGetAffiliatePayout,
  mockUpdateAffiliatePayout,
  mockSendAgentPayoutPaidEmail,
} = vi.hoisted(() => {
  const AGENT_ID = "agent-001";
  const USER_ID = "user-referred-001";
  const REFERRAL_ID = "referral-001";

  // Stateful affiliate referral / payout fakes — mirror the real conditional
  // UPDATE ... WHERE status = expectedStatus semantics from storage.ts so the
  // test proves the guard, not just that a mock resolved.
  let referralState: any;
  let payoutState: any = null;
  let payoutSeq = 0;

  function resetAffiliateState(overrides: Record<string, any> = {}) {
    referralState = {
      id: REFERRAL_ID,
      agentId: AGENT_ID,
      referredUserId: USER_ID,
      referredUserRole: "homeowner",
      consecutiveMonthsPaid: 3,
      status: "month_3",
      firstPaymentDate: new Date("2026-05-26T00:00:00Z"),
      lastPaymentDate: new Date("2026-07-26T00:00:00Z"),
      ...overrides,
    };
    payoutState = null;
    payoutSeq = 0;
  }
  resetAffiliateState();

  function getAffiliateState() {
    return { referralState, payoutState };
  }

  function seedPayoutState(overrides: Record<string, any> = {}) {
    payoutState = {
      id: "payout-retry-001",
      affiliateReferralId: REFERRAL_ID,
      agentId: AGENT_ID,
      amount: "15.00",
      status: "failed",
      errorMessage: "Previous transfer failed",
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };
    return { ...payoutState };
  }

  const mockGetAffiliateReferralByUserId = vi.fn(async (userId: string) => {
    if (!referralState || referralState.referredUserId !== userId) return undefined;
    return { ...referralState };
  });

  const mockAdvanceAffiliateReferralPayment = vi.fn(
    async (id: string, expectedStatus: string, updates: Record<string, any>) => {
      if (!referralState || referralState.id !== id || referralState.status !== expectedStatus) {
        return undefined;
      }
      referralState = { ...referralState, ...updates };
      return { ...referralState };
    },
  );

  const mockUpdateAffiliateReferral = vi.fn(async (id: string, updates: Record<string, any>) => {
    if (!referralState || referralState.id !== id) return undefined;
    referralState = { ...referralState, ...updates };
    return { ...referralState };
  });

  const mockGetAffiliatePayouts = vi.fn(async (_agentId: string) => (payoutState ? [{ ...payoutState }] : []));

  const mockCreateAffiliatePayout = vi.fn(async (data: Record<string, any>) => {
    if (payoutState) {
      // Mirror the real DB's UNIQUE constraint on affiliateReferralId.
      const err: any = new Error(
        'duplicate key value violates unique constraint "affiliate_payouts_affiliate_referral_id_unique"',
      );
      err.code = "23505";
      throw err;
    }
    payoutSeq += 1;
    payoutState = { id: `payout-${payoutSeq}`, createdAt: new Date(), updatedAt: new Date(), ...data };
    return { ...payoutState };
  });

  const mockClaimAffiliatePayoutForTransfer = vi.fn(async (id: string) => {
    if (!payoutState || payoutState.id !== id) return undefined;
    if (payoutState.status === "paid" || payoutState.status === "processing") return undefined;
    payoutState = { ...payoutState, status: "processing", errorMessage: null };
    return { ...payoutState };
  });

  const mockClaimAffiliatePayoutForRetry = vi.fn(async (id: string) => {
    if (!payoutState || payoutState.id !== id) return undefined;
    if (payoutState.status !== "failed" && payoutState.status !== "pending") return undefined;
    payoutState = { ...payoutState, status: "processing", errorMessage: null };
    return { ...payoutState };
  });

  const mockUpdateAffiliatePayout = vi.fn(async (id: string, updates: Record<string, any>) => {
    if (!payoutState || payoutState.id !== id) return undefined;
    payoutState = { ...payoutState, ...updates };
    return { ...payoutState };
  });

  return {
    mockConstructEvent: vi.fn(),
    mockSubscriptionsRetrieve: vi.fn(),
    mockClaimStripeEvent: vi.fn().mockResolvedValue("claimed"),
    mockMarkStripeEventCommitted: vi.fn().mockResolvedValue(true),
    mockGetUserByStripeCustomerId: vi.fn(),
    mockCreateSubscriptionCycleEvent: vi.fn().mockResolvedValue(undefined),
    mockUpdateUserSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
    mockGetAgentProfile: vi.fn(),
    mockTransfersCreate: vi.fn(),
    AGENT_ID,
    USER_ID,
    REFERRAL_ID,
    resetAffiliateState,
    seedPayoutState,
    getAffiliateState,
    mockGetAffiliateReferralByUserId,
    mockAdvanceAffiliateReferralPayment,
    mockUpdateAffiliateReferral,
    mockGetAffiliatePayouts,
    mockGetAffiliateReferral: vi.fn(),
    mockGetUser: vi.fn(),
    mockCreateAffiliatePayout,
    mockClaimAffiliatePayoutForTransfer,
    mockClaimAffiliatePayoutForRetry,
    mockGetAffiliatePayout: vi.fn(async (id: string) =>
      payoutState?.id === id ? { ...payoutState } : undefined),
    mockUpdateAffiliatePayout,
    mockSendAgentPayoutPaidEmail: vi.fn().mockResolvedValue(true),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: mockConstructEvent };
    this.events = { retrieve: vi.fn() };
    this.subscriptions = { retrieve: mockSubscriptionsRetrieve };
    this.transfers = { create: mockTransfersCreate };
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

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      claimStripeEvent: mockClaimStripeEvent,
      markStripeEventCommitted: mockMarkStripeEventCommitted,
      getUserByStripeCustomerId: mockGetUserByStripeCustomerId,
      createSubscriptionCycleEvent: mockCreateSubscriptionCycleEvent,
      updateUserSubscriptionStatus: mockUpdateUserSubscriptionStatus,
      getAffiliateReferralByUserId: mockGetAffiliateReferralByUserId,
      advanceAffiliateReferralPayment: mockAdvanceAffiliateReferralPayment,
      updateAffiliateReferral: mockUpdateAffiliateReferral,
      getAffiliatePayouts: mockGetAffiliatePayouts,
      getAffiliateReferral: mockGetAffiliateReferral,
      getUser: mockGetUser,
      createAffiliatePayout: mockCreateAffiliatePayout,
      claimAffiliatePayoutForTransfer: mockClaimAffiliatePayoutForTransfer,
      claimAffiliatePayoutForRetry: mockClaimAffiliatePayoutForRetry,
      getAffiliatePayout: mockGetAffiliatePayout,
      updateAffiliatePayout: mockUpdateAffiliatePayout,
      getAgentProfile: mockGetAgentProfile,
    }),
  };
});

vi.mock("../replitAuth", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
  requireCompanyRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireCompanyRoleAny: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireDivisionAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireBulkImport: vi.fn((_req: any, _res: any, next: any) => next()),
  requireApiAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireSameCompany: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  suspendedUserIds: new Set<string>(),
  invalidateUserSessions: vi.fn(),
  evictStatusCache: vi.fn(),
  refreshUserSessionRole: vi.fn(),
  requireActiveAccountFresh: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  invalidateActiveStatusCache: vi.fn(),
  isOAuthUserSuspended: vi.fn().mockResolvedValue(false),
  validateHouseOwnership: vi.fn().mockResolvedValue(true),
  validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
  validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
  validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
  requireResourceOwnership: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));

vi.mock("ws", () => ({
  WebSocketServer: class MockWss {
    on() {}
    clients = new Set();
  },
  WebSocket: { OPEN: 1 },
}));

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
vi.mock("../email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  sendAgentPayoutPaidEmail: mockSendAgentPayoutPaidEmail,
  sendAffiliatePayoutProcessedEmail: vi.fn().mockResolvedValue(true),
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../sms-service", () => ({
  smsService: { send: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../apple-iap", () => ({
  verifyAndActivateAppleTransaction: vi.fn().mockResolvedValue(undefined),
  handleAppleServerNotification: vi.fn().mockResolvedValue(undefined),
  AppleIapError: class AppleIapError extends Error {},
}));
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
vi.mock("../geocoding-service", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
  calculateDistance: vi.fn().mockReturnValue(0),
}));
vi.mock("../invoice-analysis-service", () => ({
  extractInvoiceData: vi.fn().mockResolvedValue(null),
  verifyDIYPhotos: vi.fn().mockResolvedValue(null),
}));
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  },
}));
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
// Imports — placed AFTER vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import type Stripe from "stripe";
import { processedWebhookEventIds, inFlightWebhookEventIds, registerRoutes } from "./routes";

const REFERRED_USER = {
  id: USER_ID,
  email: "referred-homeowner@test.com",
  firstName: "Jamie",
  lastName: "Homeowner",
  stripeCustomerId: "cus_test_referred_001",
};

const AGENT_PROFILE_WITH_STRIPE_CONNECT = {
  id: "agent-profile-001",
  userId: AGENT_ID,
  stripeConnectAccountId: "acct_agent_connect_001",
  stripeOnboardingComplete: true,
};

function makeInvoicePaidEvent(eventId: string, invoiceId: string): Stripe.Event {
  return {
    id: eventId,
    object: "event",
    type: "invoice.paid",
    data: {
      object: {
        id: invoiceId,
        object: "invoice",
        customer: REFERRED_USER.stripeCustomerId,
        subscription: "sub_test_referred_001",
        period_start: Math.floor(new Date("2026-07-26T00:00:00Z").getTime() / 1000),
        period_end: Math.floor(new Date("2026-08-26T00:00:00Z").getTime() / 1000),
        amount_paid: 500,
      },
    },
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
let sessionRole = "agent";

describe("Agent affiliate payout — duplicate webhook delivery cannot double-pay", () => {
  let app: express.Express;

  beforeEach(async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_integration_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_integration_placeholder";

    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();

    resetAffiliateState();
    sessionRole = "agent";

    mockClaimStripeEvent.mockReset().mockResolvedValue("claimed");
    mockMarkStripeEventCommitted.mockReset().mockResolvedValue(true);
    mockGetUserByStripeCustomerId.mockReset().mockResolvedValue(REFERRED_USER);
    mockSubscriptionsRetrieve.mockReset().mockResolvedValue({
      id: "sub_test_referred_001",
      customer: REFERRED_USER.stripeCustomerId,
      status: "active",
      items: { data: [{ price: { id: "price_test_referred_monthly" } }] },
    });
    mockGetAgentProfile.mockReset().mockResolvedValue(AGENT_PROFILE_WITH_STRIPE_CONNECT);
    mockTransfersCreate.mockReset().mockImplementation(async () => ({ id: `tr_${Math.random().toString(36).slice(2)}` }));

    mockGetAffiliateReferralByUserId.mockClear();
    mockAdvanceAffiliateReferralPayment.mockClear();
    mockUpdateAffiliateReferral.mockClear();
    mockGetAffiliatePayouts.mockClear();
    mockGetAffiliateReferral.mockReset();
    mockGetUser.mockReset();
    mockCreateAffiliatePayout.mockClear();
    mockClaimAffiliatePayoutForTransfer.mockClear();
    mockClaimAffiliatePayoutForRetry.mockClear();
    mockGetAffiliatePayout.mockClear();
    mockUpdateAffiliatePayout.mockClear();
    mockSendAgentPayoutPaidEmail.mockClear();

    app = express();
    app.use((req: any, _res, next) => {
      req.session = { user: { id: AGENT_ID, role: sessionRole } };
      next();
    });
    await registerRoutes(app);
  });

  afterEach(() => {
    processedWebhookEventIds.clear();
    inFlightWebhookEventIds.clear();
    vi.clearAllMocks();
  });

  it("a single legitimate delivery pays the agent exactly once on the 4th consecutive month", async () => {
    mockConstructEvent.mockReturnValue(makeInvoicePaidEvent("evt_single_delivery_001", "in_single_001"));

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(makeInvoicePaidEvent("evt_single_delivery_001", "in_single_001")));

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ received: true });

    const { payoutState, referralState } = getAffiliateState();
    expect(mockTransfersCreate).toHaveBeenCalledOnce();
    expect(mockTransfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 1500, currency: "usd" }),
      expect.objectContaining({ idempotencyKey: expect.stringContaining(payoutState.id) }),
    );
    expect(mockCreateAffiliatePayout).toHaveBeenCalledOnce();
    expect(payoutState).toMatchObject({
      status: "paid",
      agentId: AGENT_ID,
      emailStatus: "pending",
      emailAttemptCount: 0,
      emailNextAttemptAt: expect.any(Date),
    });
    expect(referralState).toMatchObject({ status: "paid", consecutiveMonthsPaid: 4 });
    expect(mockSendAgentPayoutPaidEmail).not.toHaveBeenCalled();
  });

  it("allows only one of two concurrent admin payout retries to call Stripe", async () => {
    sessionRole = "admin";
    const payout = seedPayoutState();
    let releaseTransfer!: () => void;
    const transferStarted = new Promise<void>((resolve) => {
      mockTransfersCreate.mockImplementationOnce(async () => {
        resolve();
        await new Promise<void>((release) => {
          releaseTransfer = release;
        });
        return { id: "tr_retry_once" };
      });
    });

    const firstRetry = request(app)
      .post(`/api/admin/affiliate-payouts/${payout.id}/retry`)
      .then((response) => response);
    await transferStarted;
    const secondRetry = await request(app)
      .post(`/api/admin/affiliate-payouts/${payout.id}/retry`);
    releaseTransfer();
    const firstResponse = await firstRetry;

    expect(firstResponse.status).toBe(200);
    expect(secondRetry.status).toBe(409);
    expect(mockClaimAffiliatePayoutForRetry).toHaveBeenCalledTimes(2);
    expect(mockTransfersCreate).toHaveBeenCalledOnce();
    expect(mockTransfersCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1500,
        metadata: expect.objectContaining({ payoutId: payout.id }),
      }),
      { idempotencyKey: `affiliate-payout-${payout.id}` },
    );
    expect(getAffiliateState().payoutState).toMatchObject({
      status: "paid",
      stripeTransferId: "tr_retry_once",
    });
  });

  it("exports only paid and pending payouts as a spreadsheet-safe CSV", async () => {
    mockGetAffiliatePayouts.mockResolvedValueOnce([
      {
        id: "payout-paid",
        affiliateReferralId: "ref-paid",
        agentId: AGENT_ID,
        amount: "15",
        status: "paid",
        paidAt: new Date("2026-08-15T18:00:00Z"),
        createdAt: new Date("2026-08-10T10:00:00Z"),
      },
      {
        id: "payout-pending",
        affiliateReferralId: "ref-pending",
        agentId: AGENT_ID,
        amount: "20.5",
        status: "pending",
        paidAt: null,
        createdAt: new Date("2026-08-12T10:00:00Z"),
      },
      {
        id: "payout-failed",
        affiliateReferralId: "ref-failed",
        agentId: AGENT_ID,
        amount: "99",
        status: "failed",
        paidAt: null,
        createdAt: new Date("2026-08-11T10:00:00Z"),
      },
      {
        id: "payout-processing",
        affiliateReferralId: "ref-processing",
        agentId: AGENT_ID,
        amount: "30",
        status: "processing",
        paidAt: null,
        createdAt: new Date("2026-08-09T10:00:00Z"),
      },
    ] as any);
    mockGetAffiliateReferral.mockImplementation(async (id: string) => ({
      id,
      referredUserId: `user-${id}`,
    }));
    mockGetUser.mockImplementation(async (id: string) => id === "user-ref-paid"
      ? { firstName: "=HYPERLINK(\"https://example.test\")", lastName: "Smith, Jr." }
      : { firstName: "Pending", lastName: "Person" });

    const res = await request(app).get("/api/agent/payouts/export");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/^text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/^attachment; filename="payout-history-\d{4}-\d{2}-\d{2}\.csv"$/);
    expect(res.text).toContain("Date,Referral Name,Amount,Status");
    expect(res.text).toContain("2026-08-15");
    expect(res.text).toContain("15.00,Paid");
    expect(res.text).toContain("2026-08-12,Pending Person,20.50,Pending");
    expect(res.text).toContain(`\"'=HYPERLINK(\"\"https://example.test\"\") Smith, Jr.\"`);
    expect(res.text).not.toContain("99.00");
    expect(res.text).not.toContain("30.00");
    expect(mockGetAffiliatePayouts).toHaveBeenCalledWith(AGENT_ID);
    expect(mockGetAffiliateReferral).toHaveBeenCalledTimes(2);
  });

  it("two duplicate deliveries (different event IDs, same underlying referral state) result in exactly ONE payout and ONE real transfer", async () => {
    // Two distinct Stripe event IDs — e.g. a misfired duplicate delivery, or a
    // recovery replay that re-observed the same pre-advance referral state —
    // both racing to process the same 4th-consecutive-month payment.
    const eventA = makeInvoicePaidEvent("evt_duplicate_A", "in_duplicate_A");
    const eventB = makeInvoicePaidEvent("evt_duplicate_B", "in_duplicate_B");

    mockConstructEvent
      .mockImplementationOnce(() => eventA)
      .mockImplementationOnce(() => eventB);

    // Real HTTP round-trips through supertest don't reliably interleave at
    // the exact microtask granularity a same-process race needs, so force
    // the race deterministically: hold both deliveries at the same point
    // (right after the user lookup, just before the affiliate read/write)
    // until BOTH have arrived there, then release them together so their
    // subsequent storage calls genuinely interleave — reproducing what two
    // truly concurrent webhook workers reading the same stale referral row
    // would experience.
    let arrivedCount = 0;
    let releaseBoth: (() => void) | undefined;
    const bothArrived = new Promise<void>((resolve) => {
      releaseBoth = resolve;
    });
    mockGetUserByStripeCustomerId.mockImplementation(async () => {
      arrivedCount += 1;
      if (arrivedCount >= 2) releaseBoth?.();
      await bothArrived;
      return REFERRED_USER;
    });

    const [resA, resB] = await Promise.all([
      request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/octet-stream")
        .set("stripe-signature", FAKE_SIG)
        .send(makeWebhookBody(eventA)),
      request(app)
        .post("/api/webhooks/stripe")
        .set("Content-Type", "application/octet-stream")
        .set("stripe-signature", FAKE_SIG)
        .send(makeWebhookBody(eventB)),
    ]);

    // Both HTTP requests succeed — the outer webhook layer has no idea these
    // are "duplicates" since they carry different event IDs. The protection
    // must come from the inner affiliate/payout guards.
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);

    // The referral must have advanced by exactly one month (not two), and
    // only one of the two deliveries could have won the conditional update.
    expect(mockAdvanceAffiliateReferralPayment).toHaveBeenCalledTimes(2);
    const advanceResults = await Promise.all(mockAdvanceAffiliateReferralPayment.mock.results.map((r) => r.value));
    const wonAdvance = advanceResults.filter((r) => r !== undefined);
    expect(wonAdvance).toHaveLength(1);

    // Exactly one payout row was created for this referral — the loser must
    // not have created a second row (unique-constraint fake would throw, and
    // is caught) nor claimed/re-processed an existing one twice.
    expect(mockCreateAffiliatePayout).toHaveBeenCalledTimes(1);

    // The critical assertion: only ONE real Stripe transfer was ever attempted.
    expect(mockTransfersCreate).toHaveBeenCalledOnce();
    expect(mockSendAgentPayoutPaidEmail).not.toHaveBeenCalled();

    // Final state: exactly one $15 payout, marked paid, referral fully advanced
    // to 4 consecutive months and 'paid' — not double-counted to 5/6/etc.
    const { payoutState, referralState } = getAffiliateState();
    expect(payoutState).toMatchObject({
      status: "paid",
      amount: "15.00",
      agentId: AGENT_ID,
      emailStatus: "pending",
      emailAttemptCount: 0,
      emailNextAttemptAt: expect.any(Date),
    });
    expect(referralState).toMatchObject({ status: "paid", consecutiveMonthsPaid: 4 });

    // Idempotency key defense-in-depth: the single transfer call used a key
    // derived from the payout id, so even a Stripe-level network retry of
    // this exact call could not create a second real transfer.
    expect(mockTransfersCreate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ idempotencyKey: `affiliate-payout-${payoutState.id}` }),
    );
  });

  it("does not process a referral that is already fully paid off (status='paid') even on a fresh event", async () => {
    resetAffiliateState({ status: "paid", consecutiveMonthsPaid: 6 });
    mockConstructEvent.mockReturnValue(makeInvoicePaidEvent("evt_already_paid_001", "in_already_paid_001"));

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("Content-Type", "application/octet-stream")
      .set("stripe-signature", FAKE_SIG)
      .send(makeWebhookBody(makeInvoicePaidEvent("evt_already_paid_001", "in_already_paid_001")));

    expect(res.status).toBe(200);
    expect(mockAdvanceAffiliateReferralPayment).not.toHaveBeenCalled();
    expect(mockTransfersCreate).not.toHaveBeenCalled();
  });
});
