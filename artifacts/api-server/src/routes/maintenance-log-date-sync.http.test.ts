/**
 * HTTP-level integration tests: PATCH /api/maintenance-logs/:id anti-gaming
 * date-lock and GET /api/houses/:id/health-score 12-month scoring window.
 *
 * Regression coverage for the exploit where editing a maintenance log's
 * serviceDate on an invoice-sourced log could shift its linked taskCompletion
 * into a different (more favourable) scoring window.
 *
 * The current policy (updated from re-sync to block):
 *   - serviceDate changes are BLOCKED (403) when the log has a linked
 *     taskCompletion (directly via taskCompletionId or via invoiceAnalyses).
 *   - Non-date field edits on confirmed invoice logs are still allowed.
 *   - Manually-entered logs with no invoice link can still change serviceDate.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  OWNER_ID,
  HOUSE_ID,
  LOG_ID,
  TC_ID,
  mockGetMaintenanceLog,
  mockUpdateMaintenanceLog,
  mockGetHouse,
  mockGetUser,
  mockDbUpdate,
  mockDbSelect,
} = vi.hoisted(() => ({
  OWNER_ID: "demo-homeowner-owner-001",
  HOUSE_ID: "house-001",
  LOG_ID: "log-001",
  TC_ID: "tc-001",
  mockGetMaintenanceLog: vi.fn(),
  mockUpdateMaintenanceLog: vi.fn(),
  mockGetHouse: vi.fn(),
  mockGetUser: vi.fn(),
  mockDbUpdate: vi.fn(),
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
    getMaintenanceLog: mockGetMaintenanceLog,
    updateMaintenanceLog: mockUpdateMaintenanceLog,
    getHouse: mockGetHouse,
    getUser: mockGetUser,
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
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: mockDbSelect,
    update: mockDbUpdate,
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// Imports — placed AFTER vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A minimal house fixture owned by OWNER_ID with no mechanical docs (bonus=0). */
const HOUSE_FIXTURE = {
  id: HOUSE_ID,
  homeownerId: OWNER_ID,
  roofInstalledYear: null,
  hvacInstalledYear: null,
  waterHeaterInstalledYear: null,
  homeSystems: null,
};

/** The user fixture that satisfies requireHomeownerSubscription (demo prefix). */
const USER_FIXTURE = {
  id: OWNER_ID,
  email: "owner@homebase.com",
  role: "homeowner",
  status: "active",
  subscriptionStatus: "active",
};

// ---------------------------------------------------------------------------
// PATCH /api/maintenance-logs/:id — anti-gaming date lock
// ---------------------------------------------------------------------------

describe("PATCH /api/maintenance-logs/:id — anti-gaming date lock", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("blocks serviceDate changes on a log with a direct taskCompletionId (returns 403, no write)", async () => {
    const app = await buildApp();

    // Existing log: owned by OWNER_ID, has a direct taskCompletionId.
    // Attempting to change serviceDate must be rejected before any write.
    mockGetMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2025-06-15",
      taskCompletionId: TC_ID,
      description: "HVAC service",
    });
    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockDbUpdate.mockReturnValue({ set: mockSet });

    const res = await request(app)
      .patch(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner")
      .send({ serviceDate: "2020-03-10" });

    // Guard fires before the write — the route must return 403.
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot be changed/);

    // updateMaintenanceLog must NOT have been called (guard is pre-write).
    expect(mockUpdateMaintenanceLog).not.toHaveBeenCalled();
    // taskCompletions must NOT have been updated.
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("does NOT touch taskCompletions when serviceDate is unchanged", async () => {
    const app = await buildApp();

    mockGetMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2025-06-15",
      taskCompletionId: TC_ID,
      description: "HVAC service",
    });
    mockUpdateMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2025-06-15",
      taskCompletionId: TC_ID,
      description: "Replaced filter",
    });
    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockDbUpdate.mockReturnValue({ set: mockSet });

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    // Send a description change only — serviceDate is omitted.
    const res = await request(app)
      .patch(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner")
      .send({ description: "Replaced filter" });

    expect(res.status).toBe(200);
    // No taskCompletion update should have been triggered.
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("blocks serviceDate changes via invoiceAnalyses fallback when log has no direct taskCompletionId (returns 403, no write)", async () => {
    const app = await buildApp();

    // Log has no direct taskCompletionId but is invoice-sourced via invoiceAnalyses.
    mockGetMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2025-06-15",
      taskCompletionId: null, // no direct link — must query invoiceAnalyses
      description: "Boiler check",
    });
    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const mockWhere = vi.fn().mockResolvedValue(undefined);
    const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
    mockDbUpdate.mockReturnValue({ set: mockSet });

    // Simulate invoiceAnalyses returning a linked taskCompletionId.
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ taskCompletionId: TC_ID }]),
        }),
      }),
    });

    const res = await request(app)
      .patch(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner")
      .send({ serviceDate: "2021-11-20" });

    // Fallback lookup finds a linked taskCompletion — guard blocks the edit.
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot be changed/);

    // No write must have occurred.
    expect(mockUpdateMaintenanceLog).not.toHaveBeenCalled();
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// GET /api/houses/:id/health-score — 12-month scoring window
// ---------------------------------------------------------------------------

describe("GET /api/houses/:id/health-score — 12-month scoring window", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("counts a completion whose year/month falls within the last 12 months", async () => {
    const app = await buildApp();

    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });

    // Build a completion date that is definitely within the last 12 months.
    const now = new Date();
    const recentYear = now.getFullYear();
    const recentMonth = now.getMonth() + 1; // current month is always in window

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: TC_ID,
            houseId: HOUSE_ID,
            homeownerId: OWNER_ID,
            year: recentYear,
            month: recentMonth,
          },
        ]),
      }),
    });

    const res = await request(app)
      .get(`/api/houses/${HOUSE_ID}/health-score`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(200);
    // 1 completion × 4 pts + 0 mechanical bonus = 4
    expect(res.body.score).toBe(4);
    expect(res.body.scoringCount).toBe(1);
    expect(res.body.historicalCount).toBe(0);
  });

  it("excludes a completion whose year/month is more than 12 months ago", async () => {
    const app = await buildApp();

    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });

    // A completion from 2020-03 is well outside any conceivable 12-month window.
    // This simulates what happens after PATCH moves a log's date to 2020 —
    // the synced taskCompletion (year=2020, month=3) must not contribute to
    // the health score even though it still exists in the database.
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          {
            id: TC_ID,
            houseId: HOUSE_ID,
            homeownerId: OWNER_ID,
            year: 2020,
            month: 3,
          },
        ]),
      }),
    });

    const res = await request(app)
      .get(`/api/houses/${HOUSE_ID}/health-score`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(200);
    // The 2020-03 completion is outside the 12-month window → score = 0.
    expect(res.body.score).toBe(0);
    expect(res.body.scoringCount).toBe(0);
    // It should still appear in the historical count.
    expect(res.body.historicalCount).toBe(1);
  });

  it("correctly partitions completions straddling the 12-month boundary", async () => {
    const app = await buildApp();

    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });

    // Build one completion that is in-window and one that is out-of-window.
    const now = new Date();
    const recentYear = now.getFullYear();
    const recentMonth = now.getMonth() + 1;

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          // In-window: current month
          { id: "tc-in", houseId: HOUSE_ID, homeownerId: OWNER_ID, year: recentYear, month: recentMonth },
          // Out-of-window: 2020
          { id: "tc-out", houseId: HOUSE_ID, homeownerId: OWNER_ID, year: 2020, month: 1 },
        ]),
      }),
    });

    const res = await request(app)
      .get(`/api/houses/${HOUSE_ID}/health-score`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(200);
    // Only the in-window completion scores points.
    expect(res.body.scoringCount).toBe(1);
    expect(res.body.historicalCount).toBe(1);
    expect(res.body.score).toBe(4); // 1 × 4 pts, no mechanical bonus
  });
});
