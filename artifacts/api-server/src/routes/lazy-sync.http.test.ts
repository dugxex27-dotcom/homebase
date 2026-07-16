/**
 * Integration tests for the lazy background subscription sync in GET /api/user.
 *
 * Covers:
 *   1. A user with stripeCustomerId + inactive status triggers a background Stripe
 *      sync on the first /api/user call.
 *   2. A second /api/user call within the 5-minute cooldown does NOT trigger
 *      another Stripe subscriptions.list() call.
 *   3. Apple IAP users (subscriptionSource = 'apple') are skipped entirely.
 *   4. After a successful sync the DB is updated (updateUserStripeSubscription +
 *      updateUserSubscriptionStatus + upsertUser called).
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared mocks visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockUpdateUserStripeSubscription,
  mockUpdateUserSubscriptionStatus,
  mockUpsertUser,
  mockSubscriptionsList,
  USER_ID,
  STRIPE_CUSTOMER_ID,
  SUB_ID,
  PRICE_ID,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockUpdateUserStripeSubscription: vi.fn(),
  mockUpdateUserSubscriptionStatus: vi.fn(),
  mockUpsertUser: vi.fn(),
  mockSubscriptionsList: vi.fn(),
  USER_ID: "homeowner-lazy-001",
  STRIPE_CUSTOMER_ID: "cus_lazy_test_abc",
  SUB_ID: "sub_lazy_test_abc",
  PRICE_ID: "price_lazy_500",
}));

// ---------------------------------------------------------------------------
// Module mocks — must appear before any imports from the mocked modules
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
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
  sendCheckoutFailureEmail: vi.fn().mockResolvedValue(undefined),
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
      constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }),
    };
    this.subscriptionItems = {
      createUsageRecord: vi.fn().mockResolvedValue(undefined),
    };
    this.subscriptions = {
      retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }),
      list: mockSubscriptionsList,
    };
    this.checkout = {
      sessions: {
        retrieve: vi.fn().mockResolvedValue({ id: "cs_stub", customer: STRIPE_CUSTOMER_ID }),
      },
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
      retrieve: vi.fn().mockResolvedValue({ id: "pi_stub", status: "succeeded" }),
    };
  }
  return { default: MockStripe };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      updateUserStripeSubscription: mockUpdateUserStripeSubscription,
      updateUserSubscriptionStatus: mockUpdateUserSubscriptionStatus,
      upsertUser: mockUpsertUser,
    }),
  };
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
import { registerRoutes, lastBackgroundSyncAttempt } from "./routes";
import { json as expressJson } from "express";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SESSION = {
  isAuthenticated: true,
  user: {
    id: USER_ID,
    email: "homeowner@test.com",
    role: "homeowner",
    status: "active",
    firstName: "Home",
    lastName: "Owner",
  },
};

const BASE_USER = {
  id: USER_ID,
  email: "homeowner@test.com",
  role: "homeowner" as const,
  status: "active",
  firstName: "Home",
  lastName: "Owner",
  stripeCustomerId: STRIPE_CUSTOMER_ID,
  subscriptionStatus: null as string | null,
  subscriptionSource: null as string | null,
  maxHousesAllowed: 2,
};

const ACTIVE_SUBSCRIPTION = {
  id: SUB_ID,
  status: "active",
  items: {
    data: [
      {
        price: {
          id: PRICE_ID,
          unit_amount: 500,
        },
      },
    ],
  },
};

/** Wait for fire-and-forget async work to settle (microtasks + I/O callbacks). */
function drainAsync() {
  return new Promise<void>((resolve) => setImmediate(resolve));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/user — lazy background subscription sync", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetUser.mockReset();
    mockUpdateUserStripeSubscription.mockReset();
    mockUpdateUserSubscriptionStatus.mockReset();
    mockUpsertUser.mockReset();
    mockSubscriptionsList.mockReset();

    mockUpdateUserStripeSubscription.mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus.mockResolvedValue(undefined);
    mockUpsertUser.mockResolvedValue(undefined);

    // Clear the cooldown map so each test starts fresh.
    lastBackgroundSyncAttempt.clear();

    process.env.STRIPE_SECRET_KEY = "sk_test_lazy_sync_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_lazy_sync_placeholder";

    app = express();
    app.use(expressJson());

    // Inject a pre-populated session and req.log (normally added by pino-http)
    // so the route's session check and fire-and-forget logging both work.
    app.use((req: any, _res: any, next: any) => {
      req.session = { ...SESSION };
      req.log = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
      next();
    });

    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200 with user data when the user is found", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockSubscriptionsList.mockResolvedValue({ data: [] });

    const res = await request(app).get("/api/user");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(USER_ID);
  });

  it("fires a background Stripe sync when user has a stripeCustomerId and inactive status", async () => {
    mockGetUser
      .mockResolvedValueOnce(BASE_USER)
      .mockResolvedValue({ ...BASE_USER, subscriptionStatus: "active" });

    mockSubscriptionsList.mockResolvedValue({ data: [ACTIVE_SUBSCRIPTION] });

    await request(app).get("/api/user");
    await drainAsync();

    expect(mockSubscriptionsList).toHaveBeenCalledWith(
      expect.objectContaining({ customer: STRIPE_CUSTOMER_ID, status: "active", limit: 1 }),
    );
  });

  it("writes the subscription to the DB when a live active subscription is found", async () => {
    mockGetUser
      .mockResolvedValueOnce(BASE_USER)
      .mockResolvedValue({ ...BASE_USER, subscriptionStatus: "active" });

    mockSubscriptionsList.mockResolvedValue({ data: [ACTIVE_SUBSCRIPTION] });

    await request(app).get("/api/user");
    await drainAsync();

    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledWith(USER_ID, SUB_ID, PRICE_ID);
    expect(mockUpdateUserSubscriptionStatus).toHaveBeenCalledWith(USER_ID, "active");
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "active" }),
    );
  });

  it("does NOT trigger a second Stripe call within the 5-minute cooldown window", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockSubscriptionsList.mockResolvedValue({ data: [] });

    // First call — should trigger sync
    await request(app).get("/api/user");
    await drainAsync();
    const firstCallCount = mockSubscriptionsList.mock.calls.length;

    // Second call within the cooldown — should be skipped
    await request(app).get("/api/user");
    await drainAsync();

    expect(mockSubscriptionsList.mock.calls.length).toBe(firstCallCount);
  });

  it("DOES trigger a sync again after the cooldown timestamp is manually expired", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockSubscriptionsList.mockResolvedValue({ data: [] });

    // First call
    await request(app).get("/api/user");
    await drainAsync();
    const firstCallCount = mockSubscriptionsList.mock.calls.length;

    // Expire the cooldown by backdating the stored timestamp
    lastBackgroundSyncAttempt.set(USER_ID, Date.now() - 6 * 60 * 1000);

    // Second call — cooldown has passed so sync should fire again
    await request(app).get("/api/user");
    await drainAsync();

    expect(mockSubscriptionsList.mock.calls.length).toBeGreaterThan(firstCallCount);
  });

  it("fires a background sync when subscriptionStatus is explicitly 'inactive' (not just null)", async () => {
    const inactiveUser = { ...BASE_USER, subscriptionStatus: "inactive" };
    mockGetUser
      .mockResolvedValueOnce(inactiveUser)
      .mockResolvedValue({ ...inactiveUser, subscriptionStatus: "active" });

    mockSubscriptionsList.mockResolvedValue({ data: [ACTIVE_SUBSCRIPTION] });

    await request(app).get("/api/user");
    await drainAsync();

    expect(mockSubscriptionsList).toHaveBeenCalledWith(
      expect.objectContaining({ customer: STRIPE_CUSTOMER_ID, status: "active", limit: 1 }),
    );
    expect(mockUpdateUserSubscriptionStatus).toHaveBeenCalledWith(USER_ID, "active");
  });

  it("skips the sync for Apple IAP users (subscriptionSource = 'apple')", async () => {
    const appleUser = { ...BASE_USER, subscriptionSource: "apple", subscriptionStatus: null };
    mockGetUser.mockResolvedValue(appleUser);

    await request(app).get("/api/user");
    await drainAsync();

    expect(mockSubscriptionsList).not.toHaveBeenCalled();
  });

  it("skips the sync when the user has no stripeCustomerId", async () => {
    const noStripeUser = { ...BASE_USER, stripeCustomerId: null };
    mockGetUser.mockResolvedValue(noStripeUser);

    await request(app).get("/api/user");
    await drainAsync();

    expect(mockSubscriptionsList).not.toHaveBeenCalled();
  });

  it("skips the sync when the user already has an active subscription status", async () => {
    const activeUser = { ...BASE_USER, subscriptionStatus: "active" };
    mockGetUser.mockResolvedValue(activeUser);

    await request(app).get("/api/user");
    await drainAsync();

    expect(mockSubscriptionsList).not.toHaveBeenCalled();
  });

  it("does not crash the /api/user response if the Stripe call fails", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockSubscriptionsList.mockRejectedValue(new Error("Stripe network error"));

    const res = await request(app).get("/api/user");
    await drainAsync();

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(USER_ID);
  });
});
