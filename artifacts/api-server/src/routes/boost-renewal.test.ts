/**
 * Integration tests for POST /api/contractors/boost/:boostId/renew
 *
 * Covers:
 *   1. 404 when the boostId does not exist for the requesting contractor
 *   2. 400 when stripePaymentIntentId is missing from the request body
 *   3. 402 when the payment intent has not yet succeeded
 *   4. 402 when the payment intent belongs to a different contractor
 *   5. 402 when Stripe cannot find the payment intent
 *   6. 200 with the renewed boost when payment is confirmed and the contractor owns the boost
 *   7. Cross-contractor ownership check (contractor A cannot renew contractor B's boost)
 *   8. 409 when the payment intent was already used, including a concurrent-insert race
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared mocks visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  mockGetContractorBoosts,
  mockCreateContractorBoost,
  mockPaymentIntentsRetrieve,
  mockCheckoutSessionsCreate,
  mockConstructEvent,
  mockGetUser,
  mockClaimStripeEvent,
  mockMarkStripeEventCommitted,
  mockSearchContractors,
  mockGetActiveBoosts,
  CONTRACTOR_A_ID,
  CONTRACTOR_B_ID,
  BOOST_A_ID,
  VALID_PI_ID,
} = vi.hoisted(() => {
  return {
    mockGetContractorBoosts: vi.fn(),
    mockCreateContractorBoost: vi.fn(),
    mockPaymentIntentsRetrieve: vi.fn(),
    mockCheckoutSessionsCreate: vi.fn(),
    mockConstructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }),
    mockGetUser: vi.fn(),
    mockClaimStripeEvent: vi.fn().mockResolvedValue("claimed"),
    mockMarkStripeEventCommitted: vi.fn().mockResolvedValue(true),
    mockSearchContractors: vi.fn(),
    mockGetActiveBoosts: vi.fn(),
    CONTRACTOR_A_ID: "contractor-a-001",
    CONTRACTOR_B_ID: "contractor-b-002",
    BOOST_A_ID: "boost-a-001",
    VALID_PI_ID: "pi_test_renewal_abc123",
  };
});

const CONTRACTOR_A_SESSION = {
  isAuthenticated: true,
  user: {
    id: "contractor-a-001",
    email: "contractor-a@test.com",
    role: "contractor",
    status: "active",
    firstName: "Alice",
    lastName: "Contractor",
  },
};

const CONTRACTOR_B_SESSION = {
  isAuthenticated: true,
  user: {
    id: "contractor-b-002",
    email: "contractor-b@test.com",
    role: "contractor",
    status: "active",
    firstName: "Bob",
    lastName: "Contractor",
  },
};

const HOMEOWNER_SESSION = {
  isAuthenticated: true,
  user: {
    id: "homeowner-001",
    email: "homeowner@test.com",
    role: "homeowner",
    status: "active",
  },
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,

    setupAuth: vi.fn().mockResolvedValue(undefined),

    // Inject contractor sessions via x-test-user header:
    //   "contractor-a" → CONTRACTOR_A_SESSION
    //   "contractor-b" → CONTRACTOR_B_SESSION
    //   anything else  → CONTRACTOR_A_SESSION (default)
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      const who = req.headers?.["x-test-user"] ?? "contractor-a";
      if (who === "contractor-b") {
        req.session = CONTRACTOR_B_SESSION;
      } else if (who === "homeowner") {
        req.session = HOMEOWNER_SESSION;
      } else {
        req.session = CONTRACTOR_A_SESSION;
      }
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
  sessionManager: {
    createSession: vi.fn(),
    validateSession: vi.fn(),
    invalidateSession: vi.fn(),
    trackRequest: vi.fn(),
  },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = {
      constructEvent: mockConstructEvent,
    };
    this.subscriptionItems = {
      createUsageRecord: vi.fn().mockResolvedValue(undefined),
    };
    this.subscriptions = {
      retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }),
    };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({
        id: "acct_test",
        charges_enabled: true,
        payouts_enabled: true,
        country: "US",
      }),
    };
    this.paymentIntents = {
      retrieve: mockPaymentIntentsRetrieve,
    };
    this.checkout = {
      sessions: {
        create: mockCheckoutSessionsCreate,
      },
    };
  }
  return { default: MockStripe };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getContractorBoosts: mockGetContractorBoosts,
      createContractorBoost: mockCreateContractorBoost,
      searchContractors: mockSearchContractors,
      getActiveBoosts: mockGetActiveBoosts,
      getUser: mockGetUser,
      claimStripeEvent: mockClaimStripeEvent,
      markStripeEventCommitted: mockMarkStripeEventCommitted,
    }),
  };
});

describe("GET /api/contractors/boost — contractor boost list", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetContractorBoosts.mockReset();
    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => vi.clearAllMocks());

  it("returns only the contractor's boosts sorted active-first and newest-first within status", async () => {
    const olderActive = { ...ACTIVE_BOOST_FIXTURE, id: "active-old", createdAt: new Date("2026-06-01") };
    const newerActive = { ...ACTIVE_BOOST_FIXTURE, id: "active-new", createdAt: new Date("2026-08-01") };
    const expired = {
      ...EXPIRED_BOOST_FIXTURE,
      id: "expired",
      status: "expired",
      isActive: false,
      createdAt: new Date("2026-09-01"),
    };
    mockGetContractorBoosts.mockResolvedValue([expired, olderActive, newerActive]);

    const res = await request(app)
      .get("/api/contractors/boost")
      .set("x-test-user", "contractor-a");

    expect(res.status).toBe(200);
    expect(res.body.map((boost: any) => boost.id)).toEqual(["active-new", "active-old", "expired"]);
    expect(mockGetContractorBoosts).toHaveBeenCalledWith(CONTRACTOR_A_ID);
  });

  it("returns 403 for non-contractors", async () => {
    const res = await request(app)
      .get("/api/contractors/boost")
      .set("x-test-user", "homeowner");

    expect(res.status).toBe(403);
    expect(mockGetContractorBoosts).not.toHaveBeenCalled();
  });
});

describe("POST /api/contractors/boost/:boostId/create-renewal-checkout", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetContractorBoosts.mockReset();
    mockCheckoutSessionsCreate.mockReset();
    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => vi.clearAllMocks());

  it("returns 404 when the contractor does not own the boost", async () => {
    mockGetContractorBoosts.mockResolvedValue([]);
    const res = await request(app)
      .post("/api/contractors/boost/missing/create-renewal-checkout")
      .set("x-test-user", "contractor-a");
    expect(res.status).toBe(404);
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 400 when the boost is still active", async () => {
    mockGetContractorBoosts.mockResolvedValue([ACTIVE_BOOST_FIXTURE]);
    const res = await request(app)
      .post(`/api/contractors/boost/${ACTIVE_BOOST_FIXTURE.id}/create-renewal-checkout`)
      .set("x-test-user", "contractor-a");
    expect(res.status).toBe(400);
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("returns 503 when Stripe is unavailable", async () => {
    const originalKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;
    vi.resetModules();
    const { registerRoutes: registerRoutesWithoutStripe } = await import("./routes");
    const noStripeApp = express();
    noStripeApp.use(expressJson());
    await registerRoutesWithoutStripe(noStripeApp);

    const res = await request(noStripeApp)
      .post(`/api/contractors/boost/${EXPIRED_BOOST_FIXTURE.id}/create-renewal-checkout`)
      .set("x-test-user", "contractor-a");
    expect(res.status).toBe(503);

    if (originalKey === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = originalKey;
    vi.resetModules();
  });

  it("returns an embedded checkout client secret for an expired boost", async () => {
    mockGetContractorBoosts.mockResolvedValue([EXPIRED_BOOST_FIXTURE]);
    mockCheckoutSessionsCreate.mockResolvedValue({ client_secret: "cs_test_boost_renewal" });

    const res = await request(app)
      .post(`/api/contractors/boost/${EXPIRED_BOOST_FIXTURE.id}/create-renewal-checkout`)
      .set("x-test-user", "contractor-a")
      .set("origin", "https://app.test");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ clientSecret: "cs_test_boost_renewal" });
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        ui_mode: "embedded",
        mode: "payment",
        return_url: expect.stringContaining("session_id={CHECKOUT_SESSION_ID}"),
        metadata: {
          type: "boost_renewal",
          boostId: EXPIRED_BOOST_FIXTURE.id,
          contractorId: CONTRACTOR_A_ID,
        },
        line_items: [
          expect.objectContaining({
            price_data: expect.objectContaining({ unit_amount: 4900, currency: "usd" }),
          }),
        ],
      }),
    );
  });
});

describe("Stripe checkout.session.completed — boost renewal", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockConstructEvent.mockReset();
    mockGetUser.mockReset();
    mockGetContractorBoosts.mockReset();
    mockCreateContractorBoost.mockReset();
    app = express();
    await registerRoutes(app);
  });

  afterEach(() => vi.clearAllMocks());

  it("creates a new active 30-day boost with the checkout payment intent", async () => {
    const paymentIntentId = "pi_checkout_renewal_001";
    mockConstructEvent.mockReturnValue({
      id: "evt_boost_renewal",
      type: "checkout.session.completed",
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: "cs_boost_renewal",
          mode: "payment",
          payment_status: "paid",
          amount_total: 4900,
          currency: "usd",
          payment_intent: paymentIntentId,
          metadata: {
            type: "boost_renewal",
            boostId: EXPIRED_BOOST_FIXTURE.id,
            contractorId: CONTRACTOR_A_ID,
          },
        },
      },
    });
    mockGetUser.mockResolvedValue({ id: CONTRACTOR_A_ID, role: "contractor", status: "active" });
    mockGetContractorBoosts.mockResolvedValue([EXPIRED_BOOST_FIXTURE]);
    mockCreateContractorBoost.mockResolvedValue({ id: "renewed-via-webhook" });
    const before = Date.now();

    const res = await request(app)
      .post("/api/webhooks/stripe")
      .set("stripe-signature", "test-signature")
      .set("content-type", "application/json")
      .send("{}");

    expect(res.status).toBe(200);
    const created = mockCreateContractorBoost.mock.calls[0][0];
    expect(created).toMatchObject({
      contractorId: CONTRACTOR_A_ID,
      serviceCategory: EXPIRED_BOOST_FIXTURE.serviceCategory,
      status: "active",
      isActive: true,
      amount: "49",
      stripePaymentIntentId: paymentIntentId,
    });
    expect(new Date(created.startDate).getTime()).toBeGreaterThanOrEqual(before);
    expect(new Date(created.endDate).getTime() - new Date(created.startDate).getTime()).toBe(30 * 86_400_000);
  });
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// Imports — placed AFTER vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import { json as expressJson } from "express";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A boost owned by contractor A — endDate is in the past (expired) */
const BOOST_A_FIXTURE = {
  id: BOOST_A_ID,
  contractorId: CONTRACTOR_A_ID,
  serviceCategory: "plumbing",
  businessAddress: "123 Main St, Springfield, IL 62701",
  businessLatitude: "39.7817",
  businessLongitude: "-89.6501",
  boostRadius: 25,
  startDate: "2026-06-01",
  endDate: "2026-07-01",
  amount: "49.99",
  status: "active",
  isActive: true,
  stripePaymentIntentId: "pi_test_abc123",
  createdAt: new Date("2026-06-01T00:00:00Z"),
  updatedAt: new Date("2026-06-01T00:00:00Z"),
};

/** An expired boost: endDate well in the past */
const EXPIRED_BOOST_FIXTURE = {
  id: "boost-expired-001",
  contractorId: CONTRACTOR_A_ID,
  serviceCategory: "plumbing",
  businessAddress: "123 Main St, Springfield, IL 62701",
  businessLatitude: "39.7817",
  businessLongitude: "-89.6501",
  boostRadius: 25,
  startDate: "2026-01-01",
  endDate: "2026-01-31",
  amount: "49.99",
  status: "active",
  isActive: true,
  stripePaymentIntentId: "pi_test_expired",
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

/** A still-active boost: endDate far in the future */
const ACTIVE_BOOST_FIXTURE = {
  id: "boost-active-001",
  contractorId: CONTRACTOR_A_ID,
  serviceCategory: "plumbing",
  businessAddress: "123 Main St, Springfield, IL 62701",
  businessLatitude: "39.7817",
  businessLongitude: "-89.6501",
  boostRadius: 25,
  startDate: "2026-07-14",
  endDate: "2027-01-01",
  amount: "49.99",
  status: "active",
  isActive: true,
  stripePaymentIntentId: "pi_test_active",
  createdAt: new Date("2026-07-14T00:00:00Z"),
  updatedAt: new Date("2026-07-14T00:00:00Z"),
};

/** A succeeded payment intent owned by contractor A */
const SUCCEEDED_PI = {
  id: VALID_PI_ID,
  status: "succeeded",
  amount: 4900,
  amount_received: 4900,
  currency: "usd",
  metadata: {
    contractorId: CONTRACTOR_A_ID,
    type: "boost_renewal",
    boostId: BOOST_A_ID,
  },
};

/** What storage.createContractorBoost resolves to */
const RENEWED_BOOST_FIXTURE = {
  id: "boost-a-002",
  contractorId: CONTRACTOR_A_ID,
  serviceCategory: "plumbing",
  businessAddress: "123 Main St, Springfield, IL 62701",
  businessLatitude: "39.7817",
  businessLongitude: "-89.6501",
  boostRadius: 25,
  startDate: "2026-07-01",
  endDate: "2026-07-31",
  amount: "49.99",
  status: "active",
  isActive: true,
  stripePaymentIntentId: VALID_PI_ID,
  createdAt: new Date("2026-07-01T00:00:00Z"),
  updatedAt: new Date("2026-07-01T00:00:00Z"),
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/contractors/boost/:boostId/renew — payment gate + ownership", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetContractorBoosts.mockReset();
    mockCreateContractorBoost.mockReset();
    mockPaymentIntentsRetrieve.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_boost_renewal_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_boost_renewal_placeholder";

    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Payment gate tests ───────────────────────────────────────────────────

  it("returns 400 when stripePaymentIntentId is missing from the request body", async () => {
    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30 });

    expect(res.status).toBe(400);
    expect(mockPaymentIntentsRetrieve).not.toHaveBeenCalled();
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("returns 402 when the payment intent has not yet succeeded (status: requires_payment_method)", async () => {
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: VALID_PI_ID,
      status: "requires_payment_method",
      metadata: { contractorId: CONTRACTOR_A_ID, type: "contractor_boost" },
    });

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/payment required/i);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("returns 402 when the payment intent has not yet succeeded (status: processing)", async () => {
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: VALID_PI_ID,
      status: "processing",
      metadata: { contractorId: CONTRACTOR_A_ID, type: "contractor_boost" },
    });

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/payment required/i);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("returns 402 when the payment intent belongs to a different contractor", async () => {
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: VALID_PI_ID,
      status: "succeeded",
      amount: 4900,
      amount_received: 4900,
      currency: "usd",
      metadata: {
        contractorId: CONTRACTOR_B_ID,
        type: "boost_renewal",
        boostId: BOOST_A_ID,
      },
    });
    mockGetContractorBoosts.mockResolvedValue([BOOST_A_FIXTURE]);

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/payment required/i);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("returns 402 when Stripe throws (payment intent not found or invalid)", async () => {
    mockPaymentIntentsRetrieve.mockRejectedValue(new Error("No such payment_intent: 'pi_bad'"));

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: "pi_bad_id" });

    expect(res.status).toBe(402);
    expect(res.body.message).toMatch(/payment required/i);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("returns 409 when the payment intent is already recorded on an existing boost", async () => {
    mockPaymentIntentsRetrieve.mockResolvedValue(SUCCEEDED_PI);
    mockGetContractorBoosts.mockResolvedValue([
      BOOST_A_FIXTURE,
      { ...RENEWED_BOOST_FIXTURE, stripePaymentIntentId: VALID_PI_ID },
    ]);

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already been used/i);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("returns 409 when a concurrent renewal already claimed the payment intent", async () => {
    mockPaymentIntentsRetrieve.mockResolvedValue(SUCCEEDED_PI);
    mockGetContractorBoosts.mockResolvedValue([BOOST_A_FIXTURE]);
    mockCreateContractorBoost.mockRejectedValue(
      Object.assign(new Error("duplicate key value violates unique constraint"), {
        code: "23505",
        constraint: "contractor_boosts_stripe_pi_id_unique",
      }),
    );

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already been used/i);
    expect(mockCreateContractorBoost).toHaveBeenCalledTimes(1);
  });

  // ── Ownership tests (payment present) ────────────────────────────────────

  it("returns 404 when the boostId does not exist for the requesting contractor", async () => {
    // Payment intent is valid — but contractor A has no boosts
    mockPaymentIntentsRetrieve.mockResolvedValue(SUCCEEDED_PI);
    mockGetContractorBoosts.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/contractors/boost/nonexistent-boost-id/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("returns 200 with the renewed boost when payment is confirmed and the contractor owns the boost", async () => {
    mockPaymentIntentsRetrieve.mockResolvedValue(SUCCEEDED_PI);
    mockGetContractorBoosts.mockResolvedValue([BOOST_A_FIXTURE]);
    mockCreateContractorBoost.mockResolvedValue(RENEWED_BOOST_FIXTURE);

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: RENEWED_BOOST_FIXTURE.id,
      contractorId: CONTRACTOR_A_ID,
      serviceCategory: "plumbing",
      status: "active",
      isActive: true,
    });

    // Confirm payment intent was verified
    expect(mockPaymentIntentsRetrieve).toHaveBeenCalledWith(VALID_PI_ID);

    // Confirm storage was called with the correct contractorId and stripePaymentIntentId
    expect(mockGetContractorBoosts).toHaveBeenCalledWith(CONTRACTOR_A_ID);
    expect(mockCreateContractorBoost).toHaveBeenCalledWith(
      expect.objectContaining({
        contractorId: CONTRACTOR_A_ID,
        serviceCategory: "plumbing",
        status: "active",
        isActive: true,
        stripePaymentIntentId: VALID_PI_ID,
      }),
    );
  });

  it("returns 404 when contractor B tries to renew contractor A's boost (cross-contractor access denied)", async () => {
    // contractor B provides a valid payment intent for themselves
    mockPaymentIntentsRetrieve.mockResolvedValue({
      id: VALID_PI_ID,
      status: "succeeded",
      amount: 4900,
      amount_received: 4900,
      currency: "usd",
      metadata: {
        contractorId: CONTRACTOR_B_ID,
        type: "boost_renewal",
        boostId: BOOST_A_ID,
      },
    });
    // contractor B has no boosts of their own
    mockGetContractorBoosts.mockResolvedValue([]);

    const res = await request(app)
      .post(`/api/contractors/boost/${BOOST_A_ID}/renew`)
      .set("x-test-user", "contractor-b")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/not found/i);

    // Confirm storage was queried using contractor B's ID, not contractor A's
    expect(mockGetContractorBoosts).toHaveBeenCalledWith(CONTRACTOR_B_ID);
    // createContractorBoost must never be called — no boost was found
    expect(mockCreateContractorBoost).not.toHaveBeenCalled();
  });

  it("uses 'now' as renewal start when the existing boost is expired", async () => {
    // EXPIRED_BOOST_FIXTURE has endDate "2026-01-31" — well in the past
    mockPaymentIntentsRetrieve.mockResolvedValue({
      ...SUCCEEDED_PI,
      metadata: {
        ...SUCCEEDED_PI.metadata,
        boostId: EXPIRED_BOOST_FIXTURE.id,
      },
    });
    mockGetContractorBoosts.mockResolvedValue([EXPIRED_BOOST_FIXTURE]);
    mockCreateContractorBoost.mockResolvedValue({
      ...EXPIRED_BOOST_FIXTURE,
      id: "boost-renewed-from-expired",
      startDate: new Date().toISOString().split("T")[0],
      endDate: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 30);
        return d.toISOString().split("T")[0];
      })(),
    });

    const before = new Date();

    const res = await request(app)
      .post(`/api/contractors/boost/${EXPIRED_BOOST_FIXTURE.id}/renew`)
      .set("x-test-user", "contractor-a")
      .send({ durationDays: 30, stripePaymentIntentId: VALID_PI_ID });

    const after = new Date();

    expect(res.status).toBe(200);

    // Inspect the startDate that was passed to createContractorBoost
    const callArg = mockCreateContractorBoost.mock.calls[0][0];
    const renewalStart = new Date(callArg.startDate);

    // The renewal start must be >= before (i.e. not the past endDate 2026-01-31)
    expect(renewalStart.getTime()).toBeGreaterThanOrEqual(
      new Date(before.toISOString().split("T")[0]).getTime(),
    );

    // The renewal start must be <= after (i.e. not some future date)
    expect(renewalStart.getTime()).toBeLessThanOrEqual(
      new Date(after.toISOString().split("T")[0]).getTime() + 86_400_000,
    );

    // Sanity: the expired endDate (2026-01-31) must NOT be used as start
    expect(callArg.startDate).not.toBe(EXPIRED_BOOST_FIXTURE.endDate);

    // The renewed end must be roughly durationDays after start
    const renewalEnd = new Date(callArg.endDate);
    const diffDays = Math.round(
      (renewalEnd.getTime() - renewalStart.getTime()) / 86_400_000,
    );
    expect(diffDays).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// GET /api/contractors/boost/check — expired-boost exclusion
// ---------------------------------------------------------------------------

describe("GET /api/contractors/boost/check — expired boost is not treated as active", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetContractorBoosts.mockReset();
    mockCreateContractorBoost.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_boost_check_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_boost_check_placeholder";

    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns canBoost: true when the only existing boost for that category is expired", async () => {
    // EXPIRED_BOOST_FIXTURE has endDate in the past; it must not block a new boost
    mockGetContractorBoosts.mockResolvedValue([EXPIRED_BOOST_FIXTURE]);

    const res = await request(app)
      .get("/api/contractors/boost/check")
      .set("x-test-user", "contractor-a")
      .query({ serviceCategory: "plumbing", businessAddress: "123 Main St" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ canBoost: true });
  });

  it("returns canBoost: false when there is an active (non-expired) boost for that category", async () => {
    // ACTIVE_BOOST_FIXTURE has endDate far in the future — must block a new boost
    mockGetContractorBoosts.mockResolvedValue([ACTIVE_BOOST_FIXTURE]);

    const res = await request(app)
      .get("/api/contractors/boost/check")
      .set("x-test-user", "contractor-a")
      .query({ serviceCategory: "plumbing", businessAddress: "123 Main St" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ canBoost: false });
  });

  it("returns canBoost: true when there is an expired boost and a different-category active boost", async () => {
    // Expired plumbing boost + active HVAC boost — should still allow a new plumbing boost
    const expiredPlumbing = { ...EXPIRED_BOOST_FIXTURE };
    const activeHvac = { ...ACTIVE_BOOST_FIXTURE, id: "boost-hvac-001", serviceCategory: "hvac" };
    mockGetContractorBoosts.mockResolvedValue([expiredPlumbing, activeHvac]);

    const res = await request(app)
      .get("/api/contractors/boost/check")
      .set("x-test-user", "contractor-a")
      .query({ serviceCategory: "plumbing", businessAddress: "123 Main St" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ canBoost: true });
  });

  it("returns canBoost: true after expiry cleanup flips status=expired and isActive=false on a stale boost", async () => {
    // Simulate the state AFTER expireStaleBoosts() has run:
    // the boost's status and isActive fields were flipped by the scheduler,
    // so getContractorBoosts now returns the cleaned-up record.
    const postCleanupBoost = {
      ...EXPIRED_BOOST_FIXTURE,
      status: "expired",
      isActive: false,
    };
    mockGetContractorBoosts.mockResolvedValue([postCleanupBoost]);

    const res = await request(app)
      .get("/api/contractors/boost/check")
      .set("x-test-user", "contractor-a")
      .query({ serviceCategory: "plumbing", businessAddress: "123 Main St" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ canBoost: true });

    // The endpoint must have fetched the contractor's boosts
    expect(mockGetContractorBoosts).toHaveBeenCalledWith(CONTRACTOR_A_ID);
  });
});

// ---------------------------------------------------------------------------
// GET /api/contractors/search — boost ranking excludes expired boosts
// ---------------------------------------------------------------------------

/** Minimal contractor shape returned by storage.searchContractors */
const makeContractor = (id: string, rating: string) => ({
  id,
  name: `Contractor ${id}`,
  company: `Company ${id}`,
  bio: "",
  services: ["plumbing"],
  location: "62701",
  postalCode: "62701",
  serviceRadius: 50,
  rating,
  reviewCount: 0,
  yearsExperience: 0,
  licenseNumber: "",
  insuranceExpiry: null,
  hasEmergencyServices: false,
  businessHours: {},
  email: `${id}@test.com`,
  phone: "",
  businessLogo: "",
  projectPhotos: [],
  distance: undefined,
  companyId: undefined,
  latitude: undefined,
  longitude: undefined,
});

describe("GET /api/contractors/search — expired boost does NOT grant search ranking priority", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetContractorBoosts.mockReset();
    mockCreateContractorBoost.mockReset();
    mockSearchContractors.mockReset();
    mockGetActiveBoosts.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_search_boost_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_search_boost_placeholder";

    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does NOT rank a contractor first when their only boost is expired", async () => {
    // contractorA has a lower rating but an expired boost; contractorB has a higher rating
    const contractorA = makeContractor(CONTRACTOR_A_ID, "3.5");
    const contractorB = makeContractor(CONTRACTOR_B_ID, "4.8");

    // searchContractors returns [A, B] (unranked from storage)
    mockSearchContractors.mockResolvedValue([contractorA, contractorB]);
    // getActiveBoosts returns [] — expired boost is not active
    mockGetActiveBoosts.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/contractors/search")
      .query({ services: "plumbing" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    // Without any active boost, ranking falls back to rating: B (4.8) before A (3.5)
    expect(res.body[0].id).toBe(CONTRACTOR_B_ID);
    expect(res.body[1].id).toBe(CONTRACTOR_A_ID);
  });

  it("ranks a contractor first when they have an active (non-expired) boost", async () => {
    // contractorA has a lower rating but an active boost; contractorB has a higher rating
    const contractorA = makeContractor(CONTRACTOR_A_ID, "3.5");
    const contractorB = makeContractor(CONTRACTOR_B_ID, "4.8");

    // searchContractors returns [A, B] (unranked)
    mockSearchContractors.mockResolvedValue([contractorA, contractorB]);
    // getActiveBoosts returns an active boost for contractorA
    mockGetActiveBoosts.mockResolvedValue([
      { ...ACTIVE_BOOST_FIXTURE, contractorId: CONTRACTOR_A_ID },
    ]);

    const res = await request(app)
      .get("/api/contractors/search")
      .query({ services: "plumbing" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    // contractorA has an active boost → must appear first despite lower rating
    expect(res.body[0].id).toBe(CONTRACTOR_A_ID);
    expect(res.body[1].id).toBe(CONTRACTOR_B_ID);
  });

  it("ranks by rating when no contractor has an active boost (all boosts expired)", async () => {
    const contractorA = makeContractor(CONTRACTOR_A_ID, "4.9");
    const contractorB = makeContractor(CONTRACTOR_B_ID, "3.1");

    mockSearchContractors.mockResolvedValue([contractorB, contractorA]);
    // getActiveBoosts returns [] — no active boosts
    mockGetActiveBoosts.mockResolvedValue([]);

    const res = await request(app)
      .get("/api/contractors/search")
      .query({ services: "plumbing" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    // No boosts → sorted by rating descending: A (4.9) before B (3.1)
    expect(res.body[0].id).toBe(CONTRACTOR_A_ID);
    expect(res.body[1].id).toBe(CONTRACTOR_B_ID);
  });
});
