/**
 * HTTP-level integration tests: DELETE /api/maintenance-logs/:id
 * verified-record guard.
 *
 * Regression coverage for the guarantee that a maintenance log whose
 * taskCompletionId has been set — whether by the invoice-confirm flow or by
 * the manual POST /api/maintenance-logs/complete-task flow — cannot be
 * deleted.  Deleting such a log would retroactively remove a scored
 * task-completion from the homeowner's health score, enabling gaming.
 *
 * The guard lives in routes.ts at the DELETE /api/maintenance-logs/:id
 * handler and checks existingLog.taskCompletionId before allowing the
 * delete to proceed.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  OWNER_ID,
  LOG_ID,
  TC_ID,
  mockGetMaintenanceLog,
  mockDeleteMaintenanceLog,
  mockGetHouse,
  mockGetUser,
  mockDbInsert,
  mockDbSelect,
} = vi.hoisted(() => ({
  OWNER_ID: "demo-homeowner-owner-001",
  LOG_ID: "log-001",
  TC_ID: "tc-001",
  mockGetMaintenanceLog: vi.fn(),
  mockDeleteMaintenanceLog: vi.fn(),
  mockGetHouse: vi.fn(),
  mockGetUser: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbSelect: vi.fn(),
}));

const OWNER_SESSION = {
  isAuthenticated: true,
  user: {
    id: OWNER_ID,
    email: "owner@homebase.com",
    role: "homeowner",
    status: "active",
  },
};

// ---------------------------------------------------------------------------
// Module mocks — hoisted before all imports by Vitest
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      const who = req.headers?.["x-test-user"];
      if (who === "owner") {
        req.session = OWNER_SESSION;
        return next();
      }
      return _res.status(401).json({ message: "Unauthorized" });
    }),
    requirePropertyOwner: vi.fn((req: any, res: any, next: any) => {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const role = req.session.user.role;
      if (role !== "homeowner" && role !== "contractor") {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    }),
    evictStatusCache: vi.fn(),
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

vi.mock("../storage", () => ({
  storage: {
    getUser: mockGetUser,
    getHouse: mockGetHouse,
    getMaintenanceLog: mockGetMaintenanceLog,
    deleteMaintenanceLog: mockDeleteMaintenanceLog,
    checkAndAwardAchievements: vi.fn().mockResolvedValue([]),
    getSubscriptionPlanByTier: vi.fn().mockResolvedValue(null),
    getUserByStripeCustomerId: vi.fn().mockResolvedValue(null),
    getAffiliateReferralByUserId: vi.fn().mockResolvedValue(null),
    updateUserSubscriptionStatus: vi.fn().mockResolvedValue(undefined),
    createSubscriptionCycleEvent: vi.fn().mockResolvedValue(null),
    getContractorCompanyByStripeAccountId: vi.fn().mockResolvedValue(null),
    updateCompanySubscriptionStatus: vi.fn().mockResolvedValue(undefined),
    getCompanyById: vi.fn().mockResolvedValue(null),
    updateCompanyStripeSubscription: vi.fn().mockResolvedValue(undefined),
    upsertSubscriptionPlan: vi.fn().mockResolvedValue(undefined),
    hasProcessedStripeEvent: vi.fn().mockResolvedValue(false),
    recordProcessedStripeEvent: vi.fn().mockResolvedValue(undefined),
    pruneOldStripeProcessedEvents: vi.fn().mockResolvedValue(undefined),
    getRecentStripeProcessedEventIds: vi.fn().mockResolvedValue(new Map()),
  },
}));

vi.mock("../db", () => ({
  pool: { query: vi.fn(), end: vi.fn() },
  db: {
    insert: mockDbInsert,
    select: mockDbSelect,
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** User fixture — demo prefix satisfies requireHomeownerSubscription. */
const USER_FIXTURE = {
  id: OWNER_ID,
  email: "owner@homebase.com",
  role: "homeowner",
  status: "active",
  subscriptionStatus: "active",
};

/**
 * A maintenance log with taskCompletionId set, representing a log that has
 * been counted in the home health score (manually completed via complete-task).
 */
const SCORED_LOG_FIXTURE = {
  id: LOG_ID,
  homeownerId: OWNER_ID,
  taskCompletionId: TC_ID,
  taskTitle: "Replace HVAC filter",
  serviceDate: "2026-05-10",
  completionMethod: "diy",
  notes: null,
};

/**
 * A plain manually-entered log with no taskCompletionId (not yet scored or
 * excluded from scoring due to duplicate window).
 */
const UNSCORED_LOG_FIXTURE = {
  id: LOG_ID,
  homeownerId: OWNER_ID,
  taskCompletionId: null,
  taskTitle: "Cleaned gutters",
  serviceDate: "2026-06-01",
  completionMethod: "diy",
  notes: null,
};

function buildInsertMock() {
  const mockInsertValues = vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([{ id: TC_ID }]),
  });
  mockDbInsert.mockReturnValue({ values: mockInsertValues });
  return { mockInsertValues };
}

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// DELETE /api/maintenance-logs/:id — verified-record guard
// ---------------------------------------------------------------------------

describe("DELETE /api/maintenance-logs/:id — verified-record guard", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 with VERIFIED_RECORD code for a manually-completed log that has taskCompletionId", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    // Log was created via POST /api/maintenance-logs/complete-task and had
    // taskCompletionId stamped onto it by the server after scoring.
    mockGetMaintenanceLog.mockResolvedValue(SCORED_LOG_FIXTURE);

    const res = await request(app)
      .delete(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("VERIFIED_RECORD");
    // Message must be homeowner-legible and explain the permanent lock
    expect(res.body.message).toMatch(/cannot be deleted/i);
    expect(res.body.message).toMatch(/home/i);
    // deleteMaintenanceLog must never be called — the guard must short-circuit
    expect(mockDeleteMaintenanceLog).not.toHaveBeenCalled();
  });

  it("returns 403 with VERIFIED_RECORD code for an invoice-confirmed log that has taskCompletionId", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    // Log was created by the invoice-confirm flow; same taskCompletionId column.
    const invoiceSourcedLog = {
      ...SCORED_LOG_FIXTURE,
      completionMethod: "professional",
      taskTitle: "HVAC service",
      serviceDate: "2026-04-20",
    };
    mockGetMaintenanceLog.mockResolvedValue(invoiceSourcedLog);

    const res = await request(app)
      .delete(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("VERIFIED_RECORD");
    expect(mockDeleteMaintenanceLog).not.toHaveBeenCalled();
  });

  it("allows deletion of a log with no taskCompletionId (not yet scored)", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetMaintenanceLog.mockResolvedValue(UNSCORED_LOG_FIXTURE);
    mockDeleteMaintenanceLog.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(204);
    expect(mockDeleteMaintenanceLog).toHaveBeenCalledWith(LOG_ID);
  });

  it("allows deletion of a duplicate-scoring log where taskCompletionId was never written (null — no score impact)", async () => {
    // When the complete-task route detects a duplicate in the scoring window
    // (isDuplicateScoring=true) it skips inserting a taskCompletion row and
    // does NOT stamp taskCompletionId on the log.  Such a log has no score
    // impact and CAN be deleted.
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    const duplicateLog = { ...UNSCORED_LOG_FIXTURE, taskCompletionId: null };
    mockGetMaintenanceLog.mockResolvedValue(duplicateLog);
    mockDeleteMaintenanceLog.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner");

    // No taskCompletionId → guard passes → 204
    expect(res.status).toBe(204);
    expect(mockDeleteMaintenanceLog).toHaveBeenCalledWith(LOG_ID);
  });

  it("returns 401 when the request is not authenticated", async () => {
    buildInsertMock();
    const app = await buildApp();

    const res = await request(app)
      .delete(`/api/maintenance-logs/${LOG_ID}`);

    expect(res.status).toBe(401);
    expect(mockDeleteMaintenanceLog).not.toHaveBeenCalled();
  });

  it("returns 404 when the log does not belong to the authenticated user", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    // Log owned by a different user
    mockGetMaintenanceLog.mockResolvedValue({
      ...SCORED_LOG_FIXTURE,
      homeownerId: "other-user-999",
    });

    const res = await request(app)
      .delete(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(404);
    expect(mockDeleteMaintenanceLog).not.toHaveBeenCalled();
  });
});
