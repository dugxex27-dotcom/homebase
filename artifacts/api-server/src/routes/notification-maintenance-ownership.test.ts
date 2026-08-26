/**
 * Integration tests for POST /api/notifications/maintenance
 *
 * Covers the cross-account authorization bug (Task #884): the endpoint
 * accepted an arbitrary `homeownerId` in the request body and generated /
 * regenerated maintenance notifications for it without verifying it matched
 * the authenticated session user. This let any authenticated homeowner act
 * on another homeowner's notifications.
 *
 *   1. 403 when homeownerId in the body does not match the session user's id
 *   2. 200 + notifications created when homeownerId matches the session user
 *   3. No regression: legitimate self-directed calls still create notifications
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared mocks visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  mockCreateMaintenanceNotifications,
  mockGetHousesByHomeowner,
  HOMEOWNER_A_ID,
  HOMEOWNER_B_ID,
} = vi.hoisted(() => ({
  mockCreateMaintenanceNotifications: vi.fn().mockResolvedValue(undefined),
  mockGetHousesByHomeowner: vi.fn().mockResolvedValue([]),
  HOMEOWNER_A_ID: "homeowner-a-001",
  HOMEOWNER_B_ID: "homeowner-b-002",
}));

const HOMEOWNER_A_SESSION = {
  isAuthenticated: true,
  user: {
    id: HOMEOWNER_A_ID,
    email: "homeowner-a@test.com",
    role: "homeowner",
    status: "active",
    firstName: "Alice",
    lastName: "Homeowner",
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

    // Single session for these tests — homeowner A. The bug/fix under test
    // is about the *body* homeownerId, not which session is active.
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      req.session = HOMEOWNER_A_SESSION;
      next();
    }),

    // Real requirePropertyOwner only checks role — exactly the middleware
    // in production, kept real (not stubbed) so the test proves the fix
    // lives in the route handler itself, not the middleware.
    requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireActiveAccountFresh: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
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
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }),
    };
    this.paymentIntents = { retrieve: vi.fn() };
    this.transfers = { create: vi.fn() };
  }
  return { default: MockStripe };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      createMaintenanceNotifications: mockCreateMaintenanceNotifications,
      getHousesByHomeowner: mockGetHousesByHomeowner,
    }),
  };
});

vi.mock("../db", () => ({
  // pool.query must return a Promise (not undefined) because
  // pg-rate-limit-store.ts calls pool.query(INIT_SQL).catch(...) at module
  // init time.
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
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
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
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/notifications/maintenance — homeownerId ownership check", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockCreateMaintenanceNotifications.mockClear();
    mockGetHousesByHomeowner.mockClear().mockResolvedValue([]);

    process.env.STRIPE_SECRET_KEY = "sk_test_notif_ownership_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_notif_ownership_placeholder";

    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 and does NOT create notifications when homeownerId in the body belongs to a different homeowner", async () => {
    const res = await request(app)
      .post("/api/notifications/maintenance")
      .send({ homeownerId: HOMEOWNER_B_ID, tasks: [{ id: "task-1", title: "Check HVAC filter" }] });

    expect(res.status).toBe(403);
    expect(mockCreateMaintenanceNotifications).not.toHaveBeenCalled();
    expect(mockGetHousesByHomeowner).not.toHaveBeenCalled();
  });

  it("succeeds and creates notifications when homeownerId in the body matches the session user's own id", async () => {
    const tasks = [{ id: "task-1", title: "Check HVAC filter" }];

    const res = await request(app)
      .post("/api/notifications/maintenance")
      .send({ homeownerId: HOMEOWNER_A_ID, tasks });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(mockCreateMaintenanceNotifications).toHaveBeenCalledOnce();
    expect(mockCreateMaintenanceNotifications).toHaveBeenCalledWith(HOMEOWNER_A_ID, tasks);
  });

  it("returns 400 (not 403/500) when homeownerId is missing entirely — validation still runs before the ownership check", async () => {
    const res = await request(app)
      .post("/api/notifications/maintenance")
      .send({ tasks: [] });

    expect(res.status).toBe(400);
    expect(mockCreateMaintenanceNotifications).not.toHaveBeenCalled();
  });
});
