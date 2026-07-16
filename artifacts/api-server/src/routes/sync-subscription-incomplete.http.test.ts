/**
 * Integration tests for POST /api/sync-subscription
 *
 * Covers:
 *   1. 'incomplete' subscription via sessionId path — DB is written and response is { synced: true }
 *   2. 'incomplete' is mapped to 'active' in the DB (not stored as 'incomplete')
 *   3. Fallback to customer-list lookup when session retrieval throws
 *   4. Ownership guard — 403 when session belongs to a different customer
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
  mockCheckoutSessionsRetrieve,
  mockSubscriptionsList,
  USER_ID,
  STRIPE_CUSTOMER_ID,
  SUB_ID,
  PRICE_ID,
  SESSION_ID,
} = vi.hoisted(() => {
  return {
    mockGetUser: vi.fn(),
    mockUpdateUserStripeSubscription: vi.fn(),
    mockUpdateUserSubscriptionStatus: vi.fn(),
    mockUpsertUser: vi.fn(),
    mockCheckoutSessionsRetrieve: vi.fn(),
    mockSubscriptionsList: vi.fn(),
    USER_ID: "homeowner-001",
    STRIPE_CUSTOMER_ID: "cus_test_abc123",
    SUB_ID: "sub_test_abc123",
    PRICE_ID: "price_test_500",
    SESSION_ID: "cs_test_session_abc123",
  };
});

// ---------------------------------------------------------------------------
// Session fixture
// ---------------------------------------------------------------------------

const HOMEOWNER_SESSION = {
  isAuthenticated: true,
  user: {
    id: "homeowner-001",
    email: "homeowner@test.com",
    role: "homeowner",
    status: "active",
    firstName: "Home",
    lastName: "Owner",
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

    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      req.session = HOMEOWNER_SESSION;
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
        retrieve: mockCheckoutSessionsRetrieve,
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
import { registerRoutes } from "./routes";
import { json as expressJson } from "express";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_USER = {
  id: USER_ID,
  email: "homeowner@test.com",
  role: "homeowner" as const,
  status: "active",
  firstName: "Home",
  lastName: "Owner",
  stripeCustomerId: STRIPE_CUSTOMER_ID,
  subscriptionStatus: null,
  maxHousesAllowed: 2,
};

const INCOMPLETE_SUBSCRIPTION = {
  id: SUB_ID,
  status: "incomplete",
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

function makeCheckoutSession(overrides: Record<string, any> = {}) {
  return {
    id: SESSION_ID,
    customer: STRIPE_CUSTOMER_ID,
    metadata: { userId: USER_ID },
    subscription: INCOMPLETE_SUBSCRIPTION,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/sync-subscription — incomplete subscription via sessionId", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetUser.mockReset();
    mockUpdateUserStripeSubscription.mockReset();
    mockUpdateUserSubscriptionStatus.mockReset();
    mockUpsertUser.mockReset();
    mockCheckoutSessionsRetrieve.mockReset();
    mockSubscriptionsList.mockReset();

    mockUpdateUserStripeSubscription.mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus.mockResolvedValue(undefined);
    mockUpsertUser.mockResolvedValue(undefined);

    process.env.STRIPE_SECRET_KEY = "sk_test_sync_sub_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_sync_sub_placeholder";

    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { synced: true } when the checkout session has an 'incomplete' subscription", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockCheckoutSessionsRetrieve.mockResolvedValue(makeCheckoutSession());

    const res = await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ synced: true });
  });

  it("writes the subscription to the DB when status is 'incomplete'", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockCheckoutSessionsRetrieve.mockResolvedValue(makeCheckoutSession());

    await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledWith(
      USER_ID,
      SUB_ID,
      PRICE_ID,
    );
    expect(mockUpdateUserSubscriptionStatus).toHaveBeenCalledWith(
      USER_ID,
      "active",
    );
  });

  it("maps 'incomplete' → 'active' in the DB (user is not locked out)", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockCheckoutSessionsRetrieve.mockResolvedValue(makeCheckoutSession());

    const res = await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(res.body.status).toBe("active");
    expect(mockUpdateUserSubscriptionStatus).toHaveBeenCalledWith(USER_ID, "active");
  });

  it("upserts the user record with subscriptionStatus 'active' when subscription is 'incomplete'", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockCheckoutSessionsRetrieve.mockResolvedValue(makeCheckoutSession());

    await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ subscriptionStatus: "active" }),
    );
  });

  it("returns 403 when the session belongs to a different Stripe customer", async () => {
    mockGetUser.mockResolvedValue({ ...BASE_USER, stripeCustomerId: "cus_different" });
    mockCheckoutSessionsRetrieve.mockResolvedValue(
      makeCheckoutSession({ customer: "cus_other_party", metadata: {} }),
    );

    const res = await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(res.status).toBe(403);
    expect(mockUpdateUserStripeSubscription).not.toHaveBeenCalled();
  });
});

describe("POST /api/sync-subscription — session retrieval throws → falls back to customer-list", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetUser.mockReset();
    mockUpdateUserStripeSubscription.mockReset();
    mockUpdateUserSubscriptionStatus.mockReset();
    mockUpsertUser.mockReset();
    mockCheckoutSessionsRetrieve.mockReset();
    mockSubscriptionsList.mockReset();

    mockUpdateUserStripeSubscription.mockResolvedValue(undefined);
    mockUpdateUserSubscriptionStatus.mockResolvedValue(undefined);
    mockUpsertUser.mockResolvedValue(undefined);

    process.env.STRIPE_SECRET_KEY = "sk_test_sync_sub_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_sync_sub_placeholder";

    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("falls through to customer-list lookup when stripe.checkout.sessions.retrieve throws", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockCheckoutSessionsRetrieve.mockRejectedValue(
      new Error("No such checkout.session: 'cs_test_session_abc123'"),
    );
    mockSubscriptionsList
      .mockResolvedValueOnce({ data: [ACTIVE_SUBSCRIPTION] })
      .mockResolvedValueOnce({ data: [] });

    const res = await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ synced: true });
    expect(mockSubscriptionsList).toHaveBeenCalled();
  });

  it("still writes the DB record via the fallback list path", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockCheckoutSessionsRetrieve.mockRejectedValue(
      new Error("Stripe network error"),
    );
    mockSubscriptionsList
      .mockResolvedValueOnce({ data: [ACTIVE_SUBSCRIPTION] })
      .mockResolvedValueOnce({ data: [] });

    await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(mockUpdateUserStripeSubscription).toHaveBeenCalledWith(
      USER_ID,
      SUB_ID,
      PRICE_ID,
    );
    expect(mockUpdateUserSubscriptionStatus).toHaveBeenCalledWith(USER_ID, "active");
  });

  it("returns { synced: false } when both session retrieval throws and no active subscription exists", async () => {
    mockGetUser.mockResolvedValue(BASE_USER);
    mockCheckoutSessionsRetrieve.mockRejectedValue(new Error("Network error"));
    mockSubscriptionsList.mockResolvedValue({ data: [] });

    const res = await request(app)
      .post("/api/sync-subscription")
      .send({ sessionId: SESSION_ID });

    expect(res.status).toBe(200);
    expect(res.body.synced).toBe(false);
    expect(mockUpdateUserStripeSubscription).not.toHaveBeenCalled();
  });
});
