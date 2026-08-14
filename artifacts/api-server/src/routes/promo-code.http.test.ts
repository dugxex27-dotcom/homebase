/**
 * HTTP-level tests: promo code feature
 *
 * Covers:
 *  - POST /api/onboarding/promo — all validation paths (no session, valid, invalid,
 *    exhausted, expired, role-restricted, already applied)
 *  - POST /api/create-subscription-checkout — promo trial extension
 *    (promoFreeMonths → trial_period_days, cleared after checkout session creation)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted — fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  HOMEOWNER_ID,
  mockGetUser,
  mockUpsertUser,
  mockDbSelect,
  mockDbUpdate,
  mockDbUpdateSet,
  mockDbUpdateWhere,
  mockStripeCheckoutCreate,
  mockStripeCustomersCreate,
} = vi.hoisted(() => {
  const mockDbUpdateWhere = vi.fn().mockResolvedValue([]);
  const mockDbUpdateSet = vi.fn().mockReturnValue({ where: mockDbUpdateWhere });
  const mockStripeCheckoutCreate = vi.fn();
  const mockStripeCustomersCreate = vi.fn();

  return {
    HOMEOWNER_ID: "promo-test-homeowner-001",
    mockGetUser: vi.fn(),
    mockUpsertUser: vi.fn(),
    mockDbSelect: vi.fn(),
    mockDbUpdate: vi.fn().mockReturnValue({ set: mockDbUpdateSet }),
    mockDbUpdateSet,
    mockDbUpdateWhere,
    mockStripeCheckoutCreate,
    mockStripeCustomersCreate,
  };
});

// ── Sessions ──────────────────────────────────────────────────────────────────

const HOMEOWNER_SESSION = {
  isAuthenticated: true,
  user: {
    id: HOMEOWNER_ID,
    email: "promo-test@homebase.com",
    role: "homeowner",
    status: "active",
  },
};

// ── User fixture (no promo applied yet) ───────────────────────────────────────

const USER_FIXTURE: Record<string, any> = {
  id: HOMEOWNER_ID,
  email: "promo-test@homebase.com",
  role: "homeowner",
  status: "active",
  stripeCustomerId: "cus_test_promo001",
  promoCodeApplied: null,
  promoFreeMonths: null,
};

// ── Promo fixture ─────────────────────────────────────────────────────────────

const PROMO_FIXTURE = {
  id: "promo-id-001",
  code: "LAUNCH6",
  label: "Launch promo",
  freeMonths: 6,
  maxUses: 2,
  usesRemaining: 2,
  roleRestriction: null,
  expiresAt: null,
  active: true,
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
      if (req.headers?.["x-test-user"] === "homeowner") {
        req.session = HOMEOWNER_SESSION;
        return next();
      }
      return _res.status(401).json({ message: "Unauthorized" });
    }),
    requirePropertyOwner: vi.fn((req: any, res: any, next: any) => {
      if (!req.session?.isAuthenticated) return res.status(401).json({ message: "Unauthorized" });
      next();
    }),
    requireActiveAccount: vi.fn((_req: any, _res: any, next: any) => next()),
    requireActiveAccountFresh: vi.fn((_req: any, _res: any, next: any) => next()),
    evictStatusCache: vi.fn(),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));

vi.mock("ws", () => ({
  WebSocketServer: class { on() {} clients = new Set(); },
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
  ObjectStorageService: class {
    upload = vi.fn(); uploadFile = vi.fn().mockResolvedValue(undefined);
    download = vi.fn(); delete = vi.fn(); getSignedUrl = vi.fn();
    getUploadUrl = vi.fn(); deleteObject = vi.fn(); getObject = vi.fn();
    putObject = vi.fn(); listObjects = vi.fn();
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
vi.mock("openai", () => ({
  default: class { chat = { completions: { create: vi.fn() } }; },
}));

vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = {
      constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }),
    };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = {
      retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }),
    };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({
        id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US",
      }),
    };
    this.checkout = { sessions: { create: mockStripeCheckoutCreate } };
    this.customers = { create: mockStripeCustomersCreate, list: vi.fn().mockResolvedValue({ data: [] }) };
    this.balanceTransactions = { create: vi.fn().mockResolvedValue({ id: "txn_stub" }) };
    this.paymentIntents = { retrieve: vi.fn().mockResolvedValue({ id: "pi_stub", status: "succeeded" }) };
  }
  return { default: MockStripe };
});

vi.mock("../security-audit", () => ({
  AuditEventTypes: {},
  AuditEventCategories: {},
  AuditSeverity: {},
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    logAuth: vi.fn().mockResolvedValue(undefined),
    logLogin: vi.fn().mockResolvedValue(undefined),
    logLogout: vi.fn().mockResolvedValue(undefined),
    logSecurity: vi.fn().mockResolvedValue(undefined),
    logRequest: vi.fn().mockResolvedValue(undefined),
    logPasswordChange: vi.fn().mockResolvedValue(undefined),
    logAdminAction: vi.fn().mockResolvedValue(undefined),
  },
  sessionManager: {
    createSession: vi.fn(), validateSession: vi.fn(),
    invalidateSession: vi.fn(), trackRequest: vi.fn(),
  },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      upsertUser: mockUpsertUser,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), end: vi.fn() },
  db: {
    select: mockDbSelect,
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: mockDbUpdateSet,
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

async function buildApp() {
  const app = express();
  app.use(express.json());

  // Inject req.session for routes that read it directly (without isAuthenticated middleware)
  app.use((req: any, _res: any, next: any) => {
    if (req.headers?.["x-test-user"] === "homeowner" && !req.session) {
      req.session = HOMEOWNER_SESSION;
    }
    next();
  });

  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers to set up db.select for sequential calls
// ---------------------------------------------------------------------------

/** db.select() #1 returns `rows` from the chain (.from().where().limit()) */
function selectOnce(rows: any[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
        // also handle no-limit variants
        orderBy: vi.fn().mockResolvedValue(rows),
      }),
      orderBy: vi.fn().mockResolvedValue(rows),
    }),
  });
}

/** Set up two sequential db.select calls: first for users, then for promoCodes */
function setupSelectUserThenPromo(
  userRows: any[],
  promoRows: any[],
) {
  selectOnce(userRows);
  selectOnce(promoRows);
}

// ---------------------------------------------------------------------------
// POST /api/onboarding/promo
// ---------------------------------------------------------------------------

describe("POST /api/onboarding/promo", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = await buildApp();
    mockUpsertUser.mockResolvedValue(undefined);
    mockDbUpdateWhere.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when there is no session", async () => {
    const res = await request(app)
      .post("/api/onboarding/promo")
      .send({ code: "LAUNCH6" });

    expect(res.status).toBe(401);
  });

  it("returns 400 when no code is provided in the body", async () => {
    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/code is required/i);
  });

  it("returns 400 when the code is not found in the database", async () => {
    // User found, but promo not found
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE }],
      [], // no promo
    );

    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "BOGUS99" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid promo code/i);
  });

  it("returns 409 when user already has a promo code applied", async () => {
    selectOnce([{ ...USER_FIXTURE, promoCodeApplied: "OLDCODE" }]);
    // promo select is never reached

    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "LAUNCH6" });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already been applied/i);
  });

  it("returns 400 when the promo code has no uses remaining (exhausted)", async () => {
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE }],
      [{ ...PROMO_FIXTURE, usesRemaining: 0 }],
    );

    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "LAUNCH6" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/fully redeemed/i);
  });

  it("returns 400 when the promo code has expired", async () => {
    const yesterday = new Date(Date.now() - 86_400_000);
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE }],
      [{ ...PROMO_FIXTURE, expiresAt: yesterday }],
    );

    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "LAUNCH6" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
  });

  it("returns 400 when the promo code is restricted to a different role", async () => {
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE, role: "homeowner" }],
      [{ ...PROMO_FIXTURE, roleRestriction: "contractor" }],
    );

    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "LAUNCH6" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not valid for your account type/i);
  });

  it("returns 200 with freeMonths when a valid code is applied", async () => {
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE }],
      [{ ...PROMO_FIXTURE }],
    );

    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "launch6" }); // lowercase — should be normalized

    expect(res.status).toBe(200);
    expect(res.body.freeMonths).toBe(6);
    expect(res.body.code).toBe("LAUNCH6");
  });

  it("decrements usesRemaining in the DB when a valid code is applied", async () => {
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE }],
      [{ ...PROMO_FIXTURE, usesRemaining: 2 }],
    );

    await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "LAUNCH6" });

    // db.update(...).set({ usesRemaining: 1, ... }) should have been called
    expect(mockDbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ usesRemaining: 1 }),
    );
    expect(mockDbUpdateWhere).toHaveBeenCalled();
  });

  it("saves promoCodeApplied and promoFreeMonths on the user via storage.upsertUser", async () => {
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE }],
      [{ ...PROMO_FIXTURE }],
    );

    await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "LAUNCH6" });

    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({
        promoCodeApplied: "LAUNCH6",
        promoFreeMonths: 6,
      }),
    );
  });

  it("works when usesRemaining is null (unlimited code)", async () => {
    setupSelectUserThenPromo(
      [{ ...USER_FIXTURE }],
      [{ ...PROMO_FIXTURE, usesRemaining: null, maxUses: null }],
    );

    const res = await request(app)
      .post("/api/onboarding/promo")
      .set("x-test-user", "homeowner")
      .send({ code: "LAUNCH6" });

    expect(res.status).toBe(200);
    // usesRemaining stays null (null - 1 guard in route)
    expect(mockDbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ usesRemaining: null }),
    );
  });
});

// ---------------------------------------------------------------------------
// POST /api/create-subscription-checkout — promo trial extension
// ---------------------------------------------------------------------------

describe("POST /api/create-subscription-checkout — promo trial_period_days", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = await buildApp();
    mockUpsertUser.mockResolvedValue(undefined);

    // Default Stripe checkout session response
    mockStripeCheckoutCreate.mockResolvedValue({
      id: "cs_test_promo",
      url: "https://checkout.stripe.com/test",
      client_secret: "cs_secret_test",
    });

    // Stripe customer already exists (stripeCustomerId on user)
    mockStripeCustomersCreate.mockResolvedValue({ id: "cus_new_test" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sets trial_period_days to promoFreeMonths × 30 when user has a promo", async () => {
    mockGetUser.mockResolvedValue({
      ...USER_FIXTURE,
      promoFreeMonths: 6,
    });

    const res = await request(app)
      .post("/api/create-subscription-checkout")
      .set("x-test-user", "homeowner")
      .send({ plan: "base", trialMode: false });

    expect(res.status).toBe(200);
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({ trial_period_days: 180 }),
      }),
    );
  });

  it("uses the standard 14-day trial when user has no promo and trialMode=true", async () => {
    mockGetUser.mockResolvedValue({ ...USER_FIXTURE, promoFreeMonths: null });

    const res = await request(app)
      .post("/api/create-subscription-checkout")
      .set("x-test-user", "homeowner")
      .send({ plan: "base", trialMode: true });

    expect(res.status).toBe(200);
    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({ trial_period_days: 14 }),
      }),
    );
  });

  it("omits trial_period_days when user has no promo and trialMode=false", async () => {
    mockGetUser.mockResolvedValue({ ...USER_FIXTURE, promoFreeMonths: null });

    const res = await request(app)
      .post("/api/create-subscription-checkout")
      .set("x-test-user", "homeowner")
      .send({ plan: "base", trialMode: false });

    expect(res.status).toBe(200);
    const callArg = mockStripeCheckoutCreate.mock.calls[0][0];
    expect(callArg.subscription_data).not.toHaveProperty("trial_period_days");
  });

  it("promo overrides the standard 14-day trial when both promoFreeMonths and trialMode are set", async () => {
    mockGetUser.mockResolvedValue({ ...USER_FIXTURE, promoFreeMonths: 3 });

    await request(app)
      .post("/api/create-subscription-checkout")
      .set("x-test-user", "homeowner")
      .send({ plan: "base", trialMode: true });

    expect(mockStripeCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: expect.objectContaining({ trial_period_days: 90 }), // 3 × 30
      }),
    );
  });

  it("clears promoFreeMonths on the user after checkout session is created", async () => {
    mockGetUser.mockResolvedValue({ ...USER_FIXTURE, promoFreeMonths: 6 });

    await request(app)
      .post("/api/create-subscription-checkout")
      .set("x-test-user", "homeowner")
      .send({ plan: "base", trialMode: false });

    // storage.upsertUser should have been called with promoFreeMonths: null
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ promoFreeMonths: null }),
    );
  });

  it("does NOT call upsertUser to clear promo when user has no promoFreeMonths", async () => {
    mockGetUser.mockResolvedValue({ ...USER_FIXTURE, promoFreeMonths: null });

    await request(app)
      .post("/api/create-subscription-checkout")
      .set("x-test-user", "homeowner")
      .send({ plan: "base", trialMode: false });

    // upsertUser may be called to save stripeCustomerId, but NOT with promoFreeMonths: null
    const upsertCalls = mockUpsertUser.mock.calls;
    const promoNullCall = upsertCalls.find(
      ([arg]: [any]) => "promoFreeMonths" in arg && arg.promoFreeMonths === null,
    );
    expect(promoNullCall).toBeUndefined();
  });
});
