/**
 * HTTP-level tests: 12-month HWS scoring window correctness
 *
 * Two core guarantees verified:
 *
 * 1. PATCH /api/invoice-analyses/:id/confirm derives month/year from the
 *    invoice's serviceDate, not today — so old invoices confirmed now
 *    still carry their original timestamp into taskCompletions.
 *
 * 2. GET /api/houses/:id/health-score only counts completions whose
 *    (year * 12 + month) falls within the last 12 months.
 *    - A completion dated today → scoringCount = 1, score > 0.
 *    - A completion dated 13 months ago → scoringCount = 0, score = 0.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mock fns — must be created before vi.mock() factories run
// ---------------------------------------------------------------------------

const {
  mockDbSelectWhere,
  mockDbInsertValues,
  mockDbUpdateWhereReturning,
  mockStorageGetUser,
  mockStorageGetHouse,
  mockStorageCreateLog,
  mockStorageCheckAchievements,
} = vi.hoisted(() => {
  const mockDbInsertValues = vi.fn();
  return {
    mockDbSelectWhere: vi.fn(),
    mockDbInsertValues,
    mockDbUpdateWhereReturning: vi.fn(),
    mockStorageGetUser: vi.fn(),
    mockStorageGetHouse: vi.fn(),
    mockStorageCreateLog: vi.fn(),
    mockStorageCheckAchievements: vi.fn().mockResolvedValue([]),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockDbSelectWhere,
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: mockDbInsertValues,
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: mockDbUpdateWhereReturning,
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockStorageGetUser,
      getHouse: mockStorageGetHouse,
      createMaintenanceLog: mockStorageCreateLog,
      checkAndAwardAchievements: mockStorageCheckAchievements,
    }),
  };
});

vi.mock("../replitAuth", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
    req.session = {
      isAuthenticated: true,
      user: { id: "homeowner-test-001", email: "test@homebase.com", role: "homeowner", status: "active" },
    };
    next();
  }),
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
  refreshUserSessionRole: vi.fn(),
  requireActiveAccountFresh: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  invalidateActiveStatusCache: vi.fn(),
  evictStatusCache: vi.fn(),
  validateHouseOwnership: vi.fn().mockResolvedValue(true),
  validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
  validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
  validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
  requireResourceOwnership: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  isOAuthUserSuspended: vi.fn().mockResolvedValue(false),
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
  emailService: {
    send: vi.fn().mockResolvedValue(undefined),
    sendTechInviteEmail: vi.fn().mockResolvedValue(undefined),
    sendAffiliatePayoutFailureEmail: vi.fn().mockResolvedValue(undefined),
    sendAffiliatePayoutFailureAdminAlert: vi.fn().mockResolvedValue(undefined),
  },
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
    this.webhooks = { constructEvent: vi.fn() };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({
        id: "acct_test",
        charges_enabled: true,
        payouts_enabled: true,
        country: "US",
      }),
    };
    this.subscriptions = {
      retrieve: vi.fn().mockResolvedValue({ status: "active", items: { data: [] } }),
    };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue({}) };
  }
  return { default: MockStripe };
});
vi.mock("../security-audit", () => ({
  AuditEventTypes: { ADMIN_USER_MODIFY: "admin_user_modify" },
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

// ---------------------------------------------------------------------------
// Imports after mocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HOMEOWNER_ID = "homeowner-test-001";
const HOUSE_ID = "house-test-001";
const ANALYSIS_ID = "analysis-test-001";

/** Returns a date string YYYY-MM-DD that is `monthsBack` full months before today. */
function dateMonthsAgo(monthsBack: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  return d.toISOString().split("T")[0];
}

/** Build year * 12 + month for a YYYY-MM-DD date string (same formula as the route). */
function yearMonthKey(dateStr: string): number {
  const d = new Date(dateStr + "T12:00:00");
  return d.getFullYear() * 12 + (d.getMonth() + 1);
}

const stubUser = {
  id: HOMEOWNER_ID,
  email: "test@homebase.com",
  role: "homeowner",
  status: "active",
  subscriptionStatus: "active",
};

const stubHouse = {
  id: HOUSE_ID,
  homeownerId: HOMEOWNER_ID,
  address: "123 Test St",
  // No system installation years → mechanical bonus = 0, keeping score predictable
  roofInstallYear: null,
  hvacInstallYear: null,
  waterHeaterInstallYear: null,
  homeSystems: [],
};

let app: express.Express;

// Build the app once — registerRoutes is async and returns an http.Server,
// but express itself is the request handler we test against.
beforeEach(async () => {
  vi.clearAllMocks();
  mockStorageGetUser.mockResolvedValue(stubUser);
  mockStorageGetHouse.mockResolvedValue(stubHouse);
  mockStorageCreateLog.mockResolvedValue({ id: "log-001" });
  mockStorageCheckAchievements.mockResolvedValue([]);

  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

// ---------------------------------------------------------------------------
// confirm route — month/year stamped from serviceDate, not today
// ---------------------------------------------------------------------------

describe("PATCH /api/invoice-analyses/:id/confirm — month/year derived from serviceDate", () => {
  function buildAnalysis(serviceDate: string) {
    return {
      id: ANALYSIS_ID,
      homeownerId: HOMEOWNER_ID,
      houseId: HOUSE_ID,
      status: "pending",
      completionMethod: "professional",
      serviceDate,
      serviceDescription: "HVAC tune-up",
      totalAmount: "250.00",
      contractorName: "Cool Air Inc",
      contractorCompany: "Cool Air",
      homeArea: "hvac",
      serviceType: "maintenance",
      invoiceUrls: [],
      receiptUrls: [],
      beforePhotoUrls: [],
      afterPhotoUrls: [],
      diyVerified: false,
    };
  }

  it("stamps month/year matching TODAY when serviceDate is today", async () => {
    const todayStr = new Date().toISOString().split("T")[0];
    const analysis = buildAnalysis(todayStr);

    // db.select().from(invoiceAnalyses).where() → analysis
    mockDbSelectWhere.mockResolvedValueOnce([analysis]);
    // db.select().from(maintenanceLogs).where() → [] (no duplicate service type in window)
    mockDbSelectWhere.mockResolvedValueOnce([]);

    let capturedValues: any = null;
    mockDbInsertValues.mockImplementation((vals: any) => {
      capturedValues = vals;
      return {
        returning: vi.fn().mockResolvedValue([{ id: "tc-001", ...vals }]),
      };
    });
    mockDbUpdateWhereReturning.mockResolvedValueOnce([{ ...analysis, status: "confirmed" }]);

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .send({ serviceDate: todayStr });

    expect(res.status).toBe(200);
    expect(capturedValues).not.toBeNull();

    const today = new Date();
    expect(capturedValues.year).toBe(today.getFullYear());
    expect(capturedValues.month).toBe(today.getMonth() + 1);
  });

  it("stamps month/year matching 13 MONTHS AGO when serviceDate is 13 months ago", async () => {
    const oldDateStr = dateMonthsAgo(13);
    const analysis = buildAnalysis(oldDateStr);

    // db.select().from(invoiceAnalyses).where() → analysis
    mockDbSelectWhere.mockResolvedValueOnce([analysis]);
    // db.select().from(maintenanceLogs).where() → [] (no duplicate service type in window)
    mockDbSelectWhere.mockResolvedValueOnce([]);

    let capturedValues: any = null;
    mockDbInsertValues.mockImplementation((vals: any) => {
      capturedValues = vals;
      return {
        returning: vi.fn().mockResolvedValue([{ id: "tc-002", ...vals }]),
      };
    });
    mockDbUpdateWhereReturning.mockResolvedValueOnce([{ ...analysis, status: "confirmed" }]);

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .send({ serviceDate: oldDateStr });

    expect(res.status).toBe(200);
    expect(capturedValues).not.toBeNull();

    const expected = new Date(oldDateStr + "T12:00:00");
    expect(capturedValues.year).toBe(expected.getFullYear());
    expect(capturedValues.month).toBe(expected.getMonth() + 1);
  });
});

// ---------------------------------------------------------------------------
// health-score route — 12-month filter excludes old completions
// ---------------------------------------------------------------------------

describe("GET /api/houses/:id/health-score — 12-month scoring window", () => {
  it("counts a completion dated TODAY in scoringCount and raises score by 4", async () => {
    const today = new Date();
    const recentCompletion = {
      id: "tc-recent",
      houseId: HOUSE_ID,
      year: today.getFullYear(),
      month: today.getMonth() + 1,
    };

    // db.select().from(taskCompletions).where() → [recentCompletion]
    mockDbSelectWhere.mockResolvedValueOnce([recentCompletion]);

    const res = await request(app).get(`/api/houses/${HOUSE_ID}/health-score`);

    expect(res.status).toBe(200);
    expect(res.body.scoringCount).toBe(1);
    expect(res.body.score).toBeGreaterThanOrEqual(4); // +4 per task in window
    expect(res.body.historicalCount).toBe(0);
  });

  it("does NOT count a completion dated 13 months ago — scoringCount = 0, score = 0", async () => {
    const oldDate = dateMonthsAgo(13);
    const oldD = new Date(oldDate + "T12:00:00");
    const oldCompletion = {
      id: "tc-old",
      houseId: HOUSE_ID,
      year: oldD.getFullYear(),
      month: oldD.getMonth() + 1,
    };

    mockDbSelectWhere.mockResolvedValueOnce([oldCompletion]);

    const res = await request(app).get(`/api/houses/${HOUSE_ID}/health-score`);

    expect(res.status).toBe(200);
    expect(res.body.scoringCount).toBe(0);
    // No mechanical bonus (no system install years on stubHouse) → score must be 0
    expect(res.body.score).toBe(0);
    expect(res.body.historicalCount).toBe(1);
  });

  it("correctly splits a mix: 1 recent + 1 old → scoringCount = 1, historicalCount = 1", async () => {
    const today = new Date();
    const oldDate = dateMonthsAgo(13);
    const oldD = new Date(oldDate + "T12:00:00");

    const completions = [
      { id: "tc-new", houseId: HOUSE_ID, year: today.getFullYear(), month: today.getMonth() + 1 },
      { id: "tc-old", houseId: HOUSE_ID, year: oldD.getFullYear(), month: oldD.getMonth() + 1 },
    ];

    mockDbSelectWhere.mockResolvedValueOnce(completions);

    const res = await request(app).get(`/api/houses/${HOUSE_ID}/health-score`);

    expect(res.status).toBe(200);
    expect(res.body.scoringCount).toBe(1);
    expect(res.body.historicalCount).toBe(1);
    expect(res.body.score).toBeGreaterThanOrEqual(4);
  });
});
