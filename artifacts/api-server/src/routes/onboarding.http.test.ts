/**
 * HTTP-level integration tests for POST /api/onboarding/referral.
 *
 * Key behaviours verified:
 *   1. Unauthenticated requests are rejected with 401.
 *   2. A user cannot apply their own referral code (400).
 *   3. An unknown referral code is rejected (400).
 *   4. A valid referral code from another user is accepted (200).
 *   5. A valid referral code from a company is accepted (200).
 *
 * The tests spin up a minimal Express app with only the onboarding routes
 * registered so there is no interference from the rest of the monolith.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted fixtures
// ---------------------------------------------------------------------------

const {
  USER_ID,
  OTHER_USER_ID,
  OWN_CODE,
  OTHER_CODE,
  COMPANY_CODE,
  mockGetUser,
  mockGetUserByReferralCode,
  mockGetCompanyByReferralCode,
} = vi.hoisted(() => ({
  USER_ID: "homeowner-abc-001",
  OTHER_USER_ID: "homeowner-xyz-002",
  OWN_CODE: "MYCODE123",
  OTHER_CODE: "FRIEND456",
  COMPANY_CODE: "CORP789",
  mockGetUser: vi.fn(),
  mockGetUserByReferralCode: vi.fn(),
  mockGetCompanyByReferralCode: vi.fn(),
}));

const OWNER_SESSION = {
  isAuthenticated: true,
  user: { id: USER_ID, email: "owner@test.com", role: "homeowner", status: "active" },
};

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, res: any, next: any) => {
      if (req.headers?.["x-test-user"] === "owner") {
        req.session = OWNER_SESSION;
        return next();
      }
      return res.status(401).json({ message: "Unauthorized" });
    }),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    evictStatusCache: vi.fn(),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));

vi.mock("ws", () => ({
  WebSocketServer: class {
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
  ObjectStorageService: class {
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
        id: "acct_test",
        charges_enabled: true,
        payouts_enabled: true,
        country: "US",
      }),
    };
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
    createSession: vi.fn(),
    validateSession: vi.fn(),
    invalidateSession: vi.fn(),
    trackRequest: vi.fn(),
  },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      getUserByReferralCode: mockGetUserByReferralCode,
      getCompanyByReferralCode: mockGetCompanyByReferralCode,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn(), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerOnboardingRoutes } from "./onboardingRoutes";

function buildApp() {
  const app = express();
  app.use(express.json());
  registerOnboardingRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// POST /api/onboarding/referral
// ---------------------------------------------------------------------------

describe("POST /api/onboarding/referral — self-referral and validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request is unauthenticated", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/onboarding/referral")
      .send({ code: OTHER_CODE });

    expect(res.status).toBe(401);
  });

  it("returns 400 when the user submits their own referral code", async () => {
    mockGetUser.mockResolvedValue({
      id: USER_ID,
      email: "owner@test.com",
      referralCode: OWN_CODE,
      referredBy: null,
    });

    const app = buildApp();

    const res = await request(app)
      .post("/api/onboarding/referral")
      .set("x-test-user", "owner")
      .send({ code: OWN_CODE });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/own referral code/i);
    expect(mockGetUserByReferralCode).not.toHaveBeenCalled();
  });

  it("returns 400 when the code does not match any user or company", async () => {
    mockGetUser.mockResolvedValue({
      id: USER_ID,
      email: "owner@test.com",
      referralCode: OWN_CODE,
      referredBy: null,
    });
    mockGetUserByReferralCode.mockResolvedValue(null);
    mockGetCompanyByReferralCode.mockResolvedValue(null);

    const app = buildApp();

    const res = await request(app)
      .post("/api/onboarding/referral")
      .set("x-test-user", "owner")
      .send({ code: "BOGUS999" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid referral code/i);
  });

  it("returns 200 and the referrer name when a valid user code is applied", async () => {
    mockGetUser.mockResolvedValue({
      id: USER_ID,
      email: "owner@test.com",
      referralCode: OWN_CODE,
      referredBy: null,
    });
    mockGetUserByReferralCode.mockResolvedValue({
      id: OTHER_USER_ID,
      referralCode: OTHER_CODE,
      firstName: "Jane",
      lastName: "Smith",
      email: "jane@test.com",
    });

    const app = buildApp();

    const res = await request(app)
      .post("/api/onboarding/referral")
      .set("x-test-user", "owner")
      .send({ code: OTHER_CODE });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.referrerName).toBe("Jane Smith");
  });

  it("returns 200 with company name when a valid company code is applied", async () => {
    mockGetUser.mockResolvedValue({
      id: USER_ID,
      email: "owner@test.com",
      referralCode: OWN_CODE,
      referredBy: null,
    });
    mockGetUserByReferralCode.mockResolvedValue(null);
    mockGetCompanyByReferralCode.mockResolvedValue({
      id: "company-001",
      referralCode: COMPANY_CODE,
      name: "Acme Contractors",
    });

    const app = buildApp();

    const res = await request(app)
      .post("/api/onboarding/referral")
      .set("x-test-user", "owner")
      .send({ code: COMPANY_CODE });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.referrerName).toBe("Acme Contractors");
  });

  it("returns 400 when the request body is missing the code field", async () => {
    const app = buildApp();

    const res = await request(app)
      .post("/api/onboarding/referral")
      .set("x-test-user", "owner")
      .send({});

    expect(res.status).toBe(400);
  });
});
