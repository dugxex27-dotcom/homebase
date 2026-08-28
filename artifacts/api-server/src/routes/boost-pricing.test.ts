/**
 * Server-side boost pricing enforcement tests.
 *
 * Verifies that:
 *   1. POST /api/contractors/boost ignores any client-supplied `amount` and
 *      stores BOOST_PRICE_DOLLARS instead.
 *   2. POST /api/contractors/boost/:id/renew stores BOOST_PRICE_DOLLARS on the
 *      newly created boost record, not the original boost's stored amount.
 *   3. POST /api/contractors/boost/:id/create-renewal-checkout creates a Stripe
 *      session with unit_amount === BOOST_PRICE_DOLLARS * 100 (i.e. BOOST_PRICE_CENTS),
 *      regardless of what amount is stored on the boost record.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted fixtures — must be defined before vi.mock factory closures run
// ---------------------------------------------------------------------------

const {
  mockGetContractorBoosts,
  mockCreateContractorBoost,
  mockPaymentIntentsRetrieve,
  mockCheckoutSessionsCreate,
  mockSearchContractors,
  mockGetActiveBoosts,
  mockGetUser,
  CONTRACTOR_ID,
  BOOST_ID,
  VALID_PI_ID,
} = vi.hoisted(() => ({
  mockGetContractorBoosts: vi.fn(),
  mockCreateContractorBoost: vi.fn(),
  mockPaymentIntentsRetrieve: vi.fn(),
  mockCheckoutSessionsCreate: vi.fn(),
  mockSearchContractors: vi.fn(),
  mockGetActiveBoosts: vi.fn(),
  mockGetUser: vi.fn(),
  CONTRACTOR_ID: "contractor-pricing-001",
  BOOST_ID: "boost-pricing-001",
  VALID_PI_ID: "pi_test_pricing_abc",
}));

const CONTRACTOR_SESSION = {
  isAuthenticated: true,
  user: { id: "contractor-pricing-001", email: "c@test.com", role: "contractor", status: "active" },
};

/**
 * A boost that was created with a suspiciously low amount — simulates a boost
 * record persisted before the server-side pricing fix, or one where the client
 * managed to smuggle a low amount.
 */
const CHEAP_BOOST = {
  id: BOOST_ID,
  contractorId: CONTRACTOR_ID,
  serviceCategory: "plumbing",
  businessAddress: "1 Test St",
  businessLatitude: "39.78",
  businessLongitude: "-89.65",
  boostRadius: 10,
  startDate: "2026-01-01",
  endDate: "2026-01-31",  // expired — eligible for renewal
  amount: "0.01",         // attacker-supplied low amount
  status: "active",
  isActive: true,
  stripePaymentIntentId: "pi_old",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      req.session = CONTRACTOR_SESSION;
      next();
    }),
    requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireActiveAccountFresh: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    requireCompanyRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireCompanyRoleAny: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireDivisionAccess: vi.fn((_req: any, _res: any, next: any) => next()),
    requireBulkImport: vi.fn((_req: any, _res: any, next: any) => next()),
    requireApiAccess: vi.fn((_req: any, _res: any, next: any) => next()),
    requireSameCompany: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireResourceOwnership: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    validateHouseOwnership: vi.fn().mockResolvedValue(true),
    validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
    validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
    validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
    suspendedUserIds: new Set<string>(),
    invalidateUserSessions: vi.fn(),
    evictStatusCache: vi.fn(),
    refreshUserSessionRole: vi.fn(),
    invalidateActiveStatusCache: vi.fn(),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));
vi.mock("ws", () => ({
  WebSocketServer: class { on() {} clients = new Set(); },
  WebSocket: { OPEN: 1 },
}));
vi.mock("../push-routes", () => ({ default: vi.fn() }));
vi.mock("../push-service", () => ({ pushService: { sendToUser: vi.fn(), sendToMany: vi.fn() } }));
vi.mock("../notification-orchestrator", () => ({
  notificationOrchestrator: { notify: vi.fn(), sendMaintenanceReminder: vi.fn(), sendWeatherAlert: vi.fn() },
}));
vi.mock("../email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
  sendCheckoutFailureEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../sms-service", () => ({ smsService: { send: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("../apple-iap", () => ({
  verifyAndActivateAppleTransaction: vi.fn().mockResolvedValue(undefined),
  handleAppleServerNotification: vi.fn().mockResolvedValue(undefined),
  AppleIapError: class extends Error {},
}));
vi.mock("../objectStorage", () => ({
  ObjectStorageService: class {
    upload = vi.fn(); download = vi.fn(); delete = vi.fn();
    getSignedUrl = vi.fn(); getUploadUrl = vi.fn(); deleteObject = vi.fn();
    getObject = vi.fn(); putObject = vi.fn(); listObjects = vi.fn();
  },
  ObjectNotFoundError: class extends Error {},
}));
vi.mock("../geocoding-service", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
  calculateDistance: vi.fn().mockReturnValue(0),
}));
vi.mock("../invoice-analysis-service", () => ({
  extractInvoiceData: vi.fn().mockResolvedValue(null),
  verifyDIYPhotos: vi.fn().mockResolvedValue(null),
}));
vi.mock("openai", () => ({ default: class { chat = { completions: { create: vi.fn() } }; } }));
vi.mock("../security-audit", () => ({
  AuditEventTypes: { ADMIN_USER_MODIFY: "admin.user.modify", SECURITY_SCAN: "security.scan" },
  AuditEventCategories: {},
  AuditSeverity: {},
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    logAuth: vi.fn(),
    logSecurity: vi.fn(),
    logRequest: vi.fn(),
    logLogin: vi.fn().mockResolvedValue(undefined),
    logLogout: vi.fn().mockResolvedValue(undefined),
    logPasswordChange: vi.fn().mockResolvedValue(undefined),
    logAdminAction: vi.fn().mockResolvedValue(undefined),
  },
  sessionManager: { createSession: vi.fn(), validateSession: vi.fn(), invalidateSession: vi.fn(), trackRequest: vi.fn() },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = { retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }) };
    this.paymentIntents = { retrieve: mockPaymentIntentsRetrieve };
    this.checkout = { sessions: { create: mockCheckoutSessionsCreate } };
  }
  return { default: MockStripe };
});
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      getContractorBoosts: mockGetContractorBoosts,
      createContractorBoost: mockCreateContractorBoost,
      searchContractors: mockSearchContractors,
      getActiveBoosts: mockGetActiveBoosts,
    }),
  };
});
vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined), returning: vi.fn().mockResolvedValue([]) }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// Imports (after vi.mock blocks)
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes, BOOST_PRICE_DOLLARS } from "./routes";

let _app: express.Express | null = null;
async function buildApp() {
  if (!_app) {
    _app = express();
    _app.use(express.json());
    process.env.STRIPE_SECRET_KEY = "sk_test_boost_pricing_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_boost_pricing_placeholder";
    await registerRoutes(_app);
  }
  return _app;
}

// ---------------------------------------------------------------------------
// Tests: POST /api/contractors/boost — server-side amount override
// ---------------------------------------------------------------------------

describe("POST /api/contractors/boost — server-side price enforcement", () => {
  beforeEach(() => {
    mockGetContractorBoosts.mockResolvedValue([]);
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: VALID_PI_ID,
      status: "succeeded",
      amount: BOOST_PRICE_DOLLARS * 100,
      amount_received: BOOST_PRICE_DOLLARS * 100,
      currency: "usd",
      metadata: { contractorId: CONTRACTOR_ID, type: "contractor_boost" },
    });
  });

  afterEach(() => vi.clearAllMocks());

  it("stores BOOST_PRICE_DOLLARS even when the client sends a lower amount", async () => {
    const app = await buildApp();
    const savedBoost = { ...CHEAP_BOOST, amount: String(BOOST_PRICE_DOLLARS) };
    mockCreateContractorBoost.mockResolvedValue(savedBoost);

    const res = await request(app)
      .post("/api/contractors/boost")
      .send({
        contractorId: CONTRACTOR_ID,         // should be overridden by session
        serviceCategory: "plumbing",
        businessAddress: "1 Test St",
        businessLatitude: "39.78",
        businessLongitude: "-89.65",
        boostRadius: 10,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        amount: "0.01",                       // attacker-supplied cheap amount
        status: "active",
        isActive: true,
        stripePaymentIntentId: VALID_PI_ID,
      });

    expect(res.status).toBe(200);

    // The amount passed to storage must be the server-side price, not 0.01
    const callArg = mockCreateContractorBoost.mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    expect(parseFloat(callArg.amount)).toBe(BOOST_PRICE_DOLLARS);
    expect(parseFloat(callArg.amount)).not.toBe(0.01);
  });

  it("stores BOOST_PRICE_DOLLARS even when the client sends a higher (premium) amount", async () => {
    const app = await buildApp();
    const savedBoost = { ...CHEAP_BOOST, amount: String(BOOST_PRICE_DOLLARS) };
    mockCreateContractorBoost.mockResolvedValue(savedBoost);

    await request(app)
      .post("/api/contractors/boost")
      .send({
        serviceCategory: "plumbing",
        businessAddress: "1 Test St",
        businessLatitude: "39.78",
        businessLongitude: "-89.65",
        boostRadius: 10,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        amount: "999.99",                     // client claims premium price (no effect)
        status: "active",
        isActive: true,
        stripePaymentIntentId: VALID_PI_ID,
      });

    const callArg = mockCreateContractorBoost.mock.calls[0]?.[0];
    expect(parseFloat(callArg.amount)).toBe(BOOST_PRICE_DOLLARS);
  });

  it("stores BOOST_PRICE_DOLLARS when no amount is supplied at all", async () => {
    const app = await buildApp();
    mockCreateContractorBoost.mockResolvedValue({ ...CHEAP_BOOST, amount: String(BOOST_PRICE_DOLLARS) });

    await request(app)
      .post("/api/contractors/boost")
      .send({
        serviceCategory: "plumbing",
        businessAddress: "1 Test St",
        businessLatitude: "39.78",
        businessLongitude: "-89.65",
        boostRadius: 10,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 30 * 86_400_000).toISOString(),
        status: "active",
        isActive: true,
        stripePaymentIntentId: VALID_PI_ID,
        // amount intentionally omitted
      });

    const callArg = mockCreateContractorBoost.mock.calls[0]?.[0];
    expect(parseFloat(callArg.amount)).toBe(BOOST_PRICE_DOLLARS);
  });

  it("rejects boost creation when no payment intent is supplied", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post("/api/contractors/boost")
      .send({
        serviceCategory: "plumbing",
        businessAddress: "1 Test St",
        businessLatitude: "39.78",
        businessLongitude: "-89.65",
        boostRadius: 10,
      });

    expect(res.status).toBe(402);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("rejects a succeeded payment intent owned by another contractor", async () => {
    const app = await buildApp();
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: VALID_PI_ID,
      status: "succeeded",
      amount: BOOST_PRICE_DOLLARS * 100,
      amount_received: BOOST_PRICE_DOLLARS * 100,
      currency: "usd",
      metadata: { contractorId: "other-contractor", type: "contractor_boost" },
    });

    const res = await request(app)
      .post("/api/contractors/boost")
      .send({
        serviceCategory: "plumbing",
        businessAddress: "1 Test St",
        businessLatitude: "39.78",
        businessLongitude: "-89.65",
        boostRadius: 10,
        stripePaymentIntentId: VALID_PI_ID,
      });

    expect(res.status).toBe(402);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("rejects reuse of a payment intent that already activated a boost", async () => {
    const app = await buildApp();
    mockGetContractorBoosts.mockResolvedValue([{ ...CHEAP_BOOST, stripePaymentIntentId: VALID_PI_ID }]);

    const res = await request(app)
      .post("/api/contractors/boost")
      .send({
        serviceCategory: "plumbing",
        businessAddress: "1 Test St",
        businessLatitude: "39.78",
        businessLongitude: "-89.65",
        boostRadius: 10,
        stripePaymentIntentId: VALID_PI_ID,
      });

    expect(res.status).toBe(409);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /api/contractors/boost/:id/renew — server-side price on renewal record
// ---------------------------------------------------------------------------

describe("POST /api/contractors/boost/:id/renew — renewed record uses server-side price", () => {
  afterEach(() => vi.clearAllMocks());

  it("persists BOOST_PRICE_DOLLARS on the renewed boost, not the stored amount", async () => {
    const app = await buildApp();

    // Payment intent is valid and belongs to this contractor
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: VALID_PI_ID,
      status: "succeeded",
      amount: BOOST_PRICE_DOLLARS * 100,
      amount_received: BOOST_PRICE_DOLLARS * 100,
      currency: "usd",
      metadata: {
        contractorId: CONTRACTOR_ID,
        type: "boost_renewal",
        boostId: BOOST_ID,
      },
    });
    mockGetContractorBoosts.mockResolvedValue([CHEAP_BOOST]);
    mockCreateContractorBoost.mockResolvedValue({
      ...CHEAP_BOOST,
      id: "boost-renewed",
      amount: String(BOOST_PRICE_DOLLARS),
      stripePaymentIntentId: VALID_PI_ID,
    });

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_ID}/renew`)
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(200);

    const callArg = mockCreateContractorBoost.mock.calls[0]?.[0];
    expect(callArg).toBeDefined();
    // Must use server-side price, not CHEAP_BOOST.amount ("0.01")
    expect(parseFloat(callArg.amount)).toBe(BOOST_PRICE_DOLLARS);
    expect(parseFloat(callArg.amount)).not.toBe(0.01);
  });
});

// ---------------------------------------------------------------------------
// Tests: POST /api/contractors/boost/:id/create-renewal-checkout — Stripe price
// ---------------------------------------------------------------------------

describe("POST /api/contractors/boost/:id/create-renewal-checkout — checkout uses server-side price", () => {
  afterEach(() => vi.clearAllMocks());

  it("creates the Stripe checkout session with BOOST_PRICE_DOLLARS * 100 cents", async () => {
    const app = await buildApp();

    // Boost has a suspiciously cheap stored amount
    mockGetContractorBoosts.mockResolvedValue([CHEAP_BOOST]);
    mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/test" });

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_ID}/create-renewal-checkout`);

    expect(res.status).toBe(200);
    expect(res.body.url).toBe("https://checkout.stripe.com/test");

    // Inspect the line_items passed to stripe.checkout.sessions.create
    const sessionArg = mockCheckoutSessionsCreate.mock.calls[0]?.[0];
    expect(sessionArg).toBeDefined();
    const lineItem = sessionArg.line_items?.[0];
    expect(lineItem).toBeDefined();
    expect(lineItem.price_data.unit_amount).toBe(BOOST_PRICE_DOLLARS * 100);
    // Must NOT use the cheap stored amount (0.01 → 1 cent)
    expect(lineItem.price_data.unit_amount).not.toBe(1);
  });

  it("does not use boost.amount for the Stripe unit_amount even when boost has a different stored amount", async () => {
    const app = await buildApp();

    // Boost with an inflated stored amount (e.g. legacy record)
    const legacyBoost = { ...CHEAP_BOOST, amount: "99.99" };
    mockGetContractorBoosts.mockResolvedValue([legacyBoost]);
    mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/test2" });

    await request(app)
      .post(`/api/contractors/boost/${BOOST_ID}/create-renewal-checkout`);

    const sessionArg = mockCheckoutSessionsCreate.mock.calls[0]?.[0];
    const lineItem = sessionArg.line_items?.[0];
    // Must be the canonical server-side price, not 9999 cents (99.99)
    expect(lineItem.price_data.unit_amount).toBe(BOOST_PRICE_DOLLARS * 100);
    expect(lineItem.price_data.unit_amount).not.toBe(9999);
  });
});
