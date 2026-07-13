/**
 * HTTP-level integration tests: PATCH /api/invoice-analyses/:id/confirm
 * anti-inflation date enforcement and GET /api/houses/:id/health-score
 * 12-month scoring window.
 *
 * Regression coverage for the guarantee that bulk-importing old receipts and
 * confirming them today does NOT inflate the health score.  The confirm route
 * must stamp taskCompletion.year/month from the invoice's serviceDate rather
 * than from the wall-clock confirmation date.  Because old invoices get an old
 * year/month, the health-score endpoint's 12-month filter automatically
 * excludes them.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  OWNER_ID,
  HOUSE_ID,
  ANALYSIS_ID,
  LOG_ID,
  TC_ID,
  mockGetUser,
  mockGetHouse,
  mockCreateMaintenanceLog,
  mockCheckAchievements,
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
} = vi.hoisted(() => ({
  OWNER_ID: "demo-homeowner-owner-001",
  HOUSE_ID: "house-001",
  ANALYSIS_ID: "analysis-001",
  LOG_ID: "log-001",
  TC_ID: "tc-001",
  mockGetUser: vi.fn(),
  mockGetHouse: vi.fn(),
  mockCreateMaintenanceLog: vi.fn(),
  mockCheckAchievements: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
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

const { mockGetMaintenanceLog, mockUpdateMaintenanceLog } = vi.hoisted(() => ({
  mockGetMaintenanceLog: vi.fn(),
  mockUpdateMaintenanceLog: vi.fn(),
}));

vi.mock("../storage", () => ({
  storage: {
    getUser: mockGetUser,
    getHouse: mockGetHouse,
    getMaintenanceLog: mockGetMaintenanceLog,
    updateMaintenanceLog: mockUpdateMaintenanceLog,
    createMaintenanceLog: mockCreateMaintenanceLog,
    checkAndAwardAchievements: mockCheckAchievements,
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

/** User fixture — demo prefix satisfies requireHomeownerSubscription. */
const USER_FIXTURE = {
  id: OWNER_ID,
  email: "owner@homebase.com",
  role: "homeowner",
  status: "active",
  subscriptionStatus: "active",
};

/**
 * A pending professional invoice analysis with an old serviceDate.
 * completionMethod is "professional" so DIY verification is skipped.
 */
const OLD_ANALYSIS_FIXTURE = {
  id: ANALYSIS_ID,
  homeownerId: OWNER_ID,
  houseId: HOUSE_ID,
  status: "pending",
  completionMethod: "professional",
  serviceDescription: "HVAC service",
  serviceDate: "2020-03-15",
  totalAmount: "250.00",
  contractorName: "Bob's HVAC",
  contractorCompany: null,
  homeArea: "hvac",
  serviceType: "maintenance",
  invoiceUrls: [],
  receiptUrls: [],
  beforePhotoUrls: [],
  afterPhotoUrls: [],
  diyVerified: false,
  aiNotes: null,
};

/**
 * Build a generic db.insert mock that supports both the plan-seeding pattern
 * (onConflictDoNothing) and the taskCompletions pattern (returning).
 * Returns a shared `values` spy so callers can inspect what was inserted.
 */
function buildInsertMock() {
  const mockInsertValues = vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([{ id: TC_ID }]),
  });
  mockDbInsert.mockReturnValue({ values: mockInsertValues });
  return { mockInsertValues };
}

/**
 * Return the values() call whose payload contains taskCompletion-specific
 * fields (year and month).  This filters out plan-seeding inserts which do
 * not carry those fields, allowing assertions to target the right call
 * regardless of how many inserts registerRoutes() performs at startup.
 */
function findTaskCompletionInsert(mockInsertValues: ReturnType<typeof vi.fn>) {
  const call = mockInsertValues.mock.calls.find(
    ([vals]: [Record<string, unknown>]) =>
      vals !== null && typeof vals === "object" && "year" in vals && "month" in vals,
  );
  return call ? (call[0] as Record<string, unknown>) : undefined;
}

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// PATCH /api/invoice-analyses/:id/confirm — anti-inflation date enforcement
// ---------------------------------------------------------------------------

describe("PATCH /api/invoice-analyses/:id/confirm — anti-inflation date enforcement", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stamps taskCompletion year/month from the invoice serviceDate, not from today", async () => {
    // Set up db.insert BEFORE buildApp so plan-seeding calls succeed.
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: LOG_ID });
    mockCheckAchievements.mockResolvedValue([]);

    // db.select — two sequential calls:
    //   1. fetch analysis by id
    //   2. duplicate service-type check (empty → no duplicate, so insert proceeds)
    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([OLD_ANALYSIS_FIXTURE]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

    // db.update — two sequential calls:
    //   1. invoiceAnalyses: set({status, ...}).where(...).returning()
    //   2. maintenanceLogs: set({taskCompletionId}).where(...)
    const mockUpdateSet = vi.fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID, status: "confirmed" }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    // Confirm an invoice whose serviceDate is 2020-03-15 (well outside 12 months)
    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({ serviceDate: "2020-03-15" });

    expect(res.status).toBe(200);

    // Locate the taskCompletions insert among all db.insert() calls.
    const insertedValues = findTaskCompletionInsert(mockInsertValues);
    expect(insertedValues).toBeDefined();

    // year/month must come from the invoice serviceDate (2020-03-15),
    // NOT from today's wall-clock date.
    expect(insertedValues!.year).toBe(2020);
    expect(insertedValues!.month).toBe(3);

    // completedAt must still be today so the audit trail is accurate.
    const completedAt = insertedValues!.completedAt as Date;
    expect(completedAt).toBeInstanceOf(Date);
    const now = new Date();
    expect(Math.abs(completedAt.getTime() - now.getTime())).toBeLessThan(5000);
  });

  it("uses analysis.serviceDate when body omits serviceDate field", async () => {
    // Set up db.insert BEFORE buildApp so plan-seeding calls succeed.
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: LOG_ID });
    mockCheckAchievements.mockResolvedValue([]);

    // Analysis has serviceDate = 2019-11-05
    const analysisFixture = { ...OLD_ANALYSIS_FIXTURE, serviceDate: "2019-11-05" };
    // First select: fetch analysis. Second select: duplicate check (empty → no duplicate).
    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([analysisFixture]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

    const mockUpdateSet = vi.fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID, status: "confirmed" }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    // Confirm without sending serviceDate in body — must fall back to analysis.serviceDate
    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({ serviceDescription: "Updated description" });

    expect(res.status).toBe(200);

    const insertedValues = findTaskCompletionInsert(mockInsertValues);
    expect(insertedValues).toBeDefined();

    // year/month must derive from analysis.serviceDate = 2019-11-05 → year 2019, month 11
    expect(insertedValues!.year).toBe(2019);
    expect(insertedValues!.month).toBe(11);
  });

  it("ignores a body serviceDate more recent than analysis.serviceDate (backdating attack)", async () => {
    // Set up db.insert BEFORE buildApp so plan-seeding calls succeed.
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: LOG_ID });
    mockCheckAchievements.mockResolvedValue([]);

    // Analysis has an old serviceDate (2020-03-15) — well outside the 12-month window.
    // First select: fetch analysis. Second select: duplicate check (empty → no duplicate).
    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([OLD_ANALYSIS_FIXTURE]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

    const mockUpdateSet = vi.fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID, status: "confirmed" }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    // Attacker sends a recent serviceDate in the body hoping to move taskCompletion
    // into the 12-month scoring window. The server must ignore this and use
    // analysis.serviceDate ("2020-03-15") instead.
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 1);
    const recentDateStr = recentDate.toISOString().split("T")[0]; // last month

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({ serviceDate: recentDateStr });

    expect(res.status).toBe(200);

    // The taskCompletion must have been inserted with the OLD analysis date,
    // not the attacker-supplied recent date.
    const insertedValues = findTaskCompletionInsert(mockInsertValues);
    expect(insertedValues).toBeDefined();

    // year/month must come from analysis.serviceDate = 2020-03-15, never from the body.
    expect(insertedValues!.year).toBe(2020);
    expect(insertedValues!.month).toBe(3);

    // Confirm the submitted recent date did NOT end up as year/month
    const submittedYear = recentDate.getFullYear();
    const submittedMonth = recentDate.getMonth() + 1;
    expect(insertedValues!.year).not.toBe(submittedYear);
    expect(insertedValues!.month).not.toBe(submittedMonth);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/invoice-analyses/:id/confirm — DIY completion path
// ---------------------------------------------------------------------------

/**
 * A pending DIY analysis that has already passed the /diy-verify step:
 * diyVerified=true, before+after photos persisted, serviceDate="2020-06-20".
 */
const DIY_ANALYSIS_FIXTURE = {
  id: ANALYSIS_ID,
  homeownerId: OWNER_ID,
  houseId: HOUSE_ID,
  status: "pending",
  completionMethod: "diy",
  serviceDescription: "Replaced kitchen faucet myself",
  serviceDate: "2020-06-20",
  totalAmount: "80.00",
  contractorName: null,
  contractorCompany: null,
  homeArea: "plumbing",
  serviceType: "repair",
  invoiceUrls: [],
  receiptUrls: [],
  beforePhotoUrls: ["https://storage.example.com/before.jpg"],
  afterPhotoUrls: ["https://storage.example.com/after.jpg"],
  diyVerified: true,
  aiNotes: "Photos show completed faucet replacement.",
};

describe("PATCH /api/invoice-analyses/:id/confirm — DIY completion path", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("stamps taskCompletion year/month from analysis.serviceDate for a verified DIY analysis", async () => {
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: LOG_ID });
    mockCheckAchievements.mockResolvedValue([]);

    // db.select: 1) fetch analysis, 2) duplicate service-type check (empty → proceed)
    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([DIY_ANALYSIS_FIXTURE]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

    // db.update: 1) mark analysis confirmed, 2) link taskCompletionId on log
    const mockUpdateSet = vi.fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID, status: "confirmed" }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({});

    expect(res.status).toBe(200);

    const insertedValues = findTaskCompletionInsert(mockInsertValues);
    expect(insertedValues).toBeDefined();

    // DIY path must use analysis.serviceDate = 2020-06-20, not today
    expect(insertedValues!.year).toBe(2020);
    expect(insertedValues!.month).toBe(6);

    // completionMethod must be flagged as "diy" in the taskCompletion row
    expect(insertedValues!.completionMethod).toBe("diy");

    // completedAt is wall-clock time (audit trail), not the service date
    const completedAt = insertedValues!.completedAt as Date;
    expect(completedAt).toBeInstanceOf(Date);
    const now = new Date();
    expect(Math.abs(completedAt.getTime() - now.getTime())).toBeLessThan(5000);
  });

  it("ignores a body serviceDate on a DIY confirm request (same anti-inflation guarantee)", async () => {
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: LOG_ID });
    mockCheckAchievements.mockResolvedValue([]);

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([DIY_ANALYSIS_FIXTURE]) }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) }),
      });

    const mockUpdateSet = vi.fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID, status: "confirmed" }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    // Attacker tries to slip a recent serviceDate through the confirm body
    const recentDate = new Date();
    recentDate.setMonth(recentDate.getMonth() - 1);
    const recentDateStr = recentDate.toISOString().split("T")[0];

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({ serviceDate: recentDateStr });

    expect(res.status).toBe(200);

    const insertedValues = findTaskCompletionInsert(mockInsertValues);
    expect(insertedValues).toBeDefined();

    // Must still use analysis.serviceDate = 2020-06-20, ignoring the body date.
    // Year 2020 is sufficient proof: the attack date is recent (2026), so if year
    // is 2020 the server demonstrably used the stored analysis date, not req.body.
    expect(insertedValues!.year).toBe(2020);
    expect(insertedValues!.month).toBe(6);
  });

  it("rejects a DIY confirm when diyVerified is false", async () => {
    buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const unverifiedDiy = { ...DIY_ANALYSIS_FIXTURE, diyVerified: false };

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([unverifiedDiy]) }),
    });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("DIY_VERIFICATION_REQUIRED");
  });

  it("rejects a DIY confirm when before photos are missing", async () => {
    buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const noBeforePhotos = { ...DIY_ANALYSIS_FIXTURE, beforePhotoUrls: [] };

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([noBeforePhotos]) }),
    });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("DIY_VERIFICATION_REQUIRED");
  });
});

// ---------------------------------------------------------------------------
// POST /api/invoice-analyses/:id/diy-verify — serviceDate injection protection
// ---------------------------------------------------------------------------

describe("POST /api/invoice-analyses/:id/diy-verify — serviceDate injection protection", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("does not persist a user-supplied serviceDate when updating the analysis", async () => {
    buildInsertMock();

    const app = await buildApp();

    // A pending DIY analysis with existing photos so no new uploads are required
    const pendingDiy = {
      ...DIY_ANALYSIS_FIXTURE,
      diyVerified: false,
      aiNotes: null,
    };

    // db.select: fetch analysis
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([pendingDiy]) }),
    });

    // Capture what set() is called with so we can assert on it
    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ ...pendingDiy, diyVerified: false }]),
      }),
    });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    // Send no new photo files (analysis already has before/after), but include a
    // serviceDate that an attacker hopes will overwrite analysis.serviceDate.
    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [],
        afterPhotoFiles: [],
        receiptFiles: [],
        serviceDate: "2024-01-01",
      });

    expect(res.status).toBe(200);

    // db.update must have been called exactly once (to save diyVerified + photos)
    expect(mockUpdateSet).toHaveBeenCalledTimes(1);

    const setPayload = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>;

    // serviceDate must NOT appear in the update payload — the route must only
    // touch diyVerified, aiNotes, and the photo URL arrays.
    expect(setPayload).not.toHaveProperty("serviceDate");

    // Confirm the expected fields are present and no extra data-integrity fields slipped in
    expect(setPayload).toHaveProperty("diyVerified");
    expect(setPayload).toHaveProperty("beforePhotoUrls");
    expect(setPayload).toHaveProperty("afterPhotoUrls");
    expect(setPayload).toHaveProperty("receiptUrls");
  });
});

// ---------------------------------------------------------------------------
// POST /api/invoice-analyses/:id/diy-verify — photo swap prevention
// ---------------------------------------------------------------------------

describe("POST /api/invoice-analyses/:id/diy-verify — photo swap prevention", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects further photo uploads once diyVerified is already true (409 ALREADY_VERIFIED)", async () => {
    buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    // Analysis that has already passed verification
    const alreadyVerified = {
      ...DIY_ANALYSIS_FIXTURE,
      diyVerified: true,
    };

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([alreadyVerified]) }),
    });

    // Attacker tries to swap in new photos after verification already passed
    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [{ fileData: "data:image/png;base64,abc", fileName: "swap.png", fileType: "image/png" }],
        afterPhotoFiles: [],
        receiptFiles: [],
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ALREADY_VERIFIED");
  });

  it("rejects a diy-verify call with no new photos once diyVerified is already true (409 ALREADY_VERIFIED)", async () => {
    buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const alreadyVerified = {
      ...DIY_ANALYSIS_FIXTURE,
      diyVerified: true,
    };

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([alreadyVerified]) }),
    });

    // Even calling with empty arrays is blocked once verified
    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({ beforePhotoFiles: [], afterPhotoFiles: [], receiptFiles: [] });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("ALREADY_VERIFIED");
  });
});

// ---------------------------------------------------------------------------
// GET /api/houses/:id/health-score — confirmed old invoices do not score
// ---------------------------------------------------------------------------

describe("GET /api/houses/:id/health-score — old confirmed invoices do not inflate score", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("excludes a taskCompletion whose year/month comes from an old invoice serviceDate", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });

    // Simulate the taskCompletion created when a 2020-03-15 invoice is confirmed:
    // year=2020, month=3 — outside any 12-month scoring window.
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
    // Old completion must not contribute to the score
    expect(res.body.score).toBe(0);
    expect(res.body.scoringCount).toBe(0);
    // But it must still appear in the historical count so it isn't silently lost
    expect(res.body.historicalCount).toBe(1);
  });

  it("counts a taskCompletion only when its year/month falls within the last 12 months", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockDbUpdate.mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    });

    // One recent completion (current calendar month) + one from an old confirmed invoice (2020).
    const now = new Date();
    const recentYear = now.getFullYear();
    const recentMonth = now.getMonth() + 1;

    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([
          { id: "tc-recent", houseId: HOUSE_ID, homeownerId: OWNER_ID, year: recentYear, month: recentMonth },
          { id: "tc-old",    houseId: HOUSE_ID, homeownerId: OWNER_ID, year: 2020,       month: 3 },
        ]),
      }),
    });

    const res = await request(app)
      .get(`/api/houses/${HOUSE_ID}/health-score`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(200);
    // Only the recent completion scores; the 2020 completion is historical only
    expect(res.body.scoringCount).toBe(1);
    expect(res.body.historicalCount).toBe(1);
    // 1 scoring completion × 4 pts, no mechanical documentation bonus
    expect(res.body.score).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/maintenance-logs/:id — serviceDate locked on confirmed invoice logs
// ---------------------------------------------------------------------------

describe("PATCH /api/maintenance-logs/:id — serviceDate locked on confirmed invoice logs", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when trying to change serviceDate on a log with a direct taskCompletionId", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    // Existing log was confirmed from an invoice — has a direct taskCompletionId
    mockGetMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2020-03-15",
      taskCompletionId: TC_ID,
    });

    const res = await request(app)
      .patch(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner")
      .send({ serviceDate: "2025-06-01" }); // attempt to shift into scoring window

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot be changed/);
    // updateMaintenanceLog must NOT have been called — guard fires before the write
    expect(mockUpdateMaintenanceLog).not.toHaveBeenCalled();
  });

  it("returns 403 when serviceDate change is attempted on a log linked via invoiceAnalysis", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    // Log has no direct taskCompletionId but is invoice-sourced via invoiceAnalyses table
    mockGetMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2020-03-15",
      taskCompletionId: null,
    });

    // db.select: route queries invoiceAnalyses for a linked taskCompletionId
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
      .send({ serviceDate: "2025-06-01" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/cannot be changed/);
    expect(mockUpdateMaintenanceLog).not.toHaveBeenCalled();
  });

  it("allows serviceDate edits on a manually-entered log with no invoice link", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    // Manually-entered log: no taskCompletionId and no linked invoiceAnalysis
    mockGetMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2020-03-15",
      taskCompletionId: null,
    });

    const updatedLog = { id: LOG_ID, serviceDate: "2025-06-01" };
    mockUpdateMaintenanceLog.mockResolvedValue(updatedLog);

    // db.select: no linked invoiceAnalysis
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    });

    const res = await request(app)
      .patch(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner")
      .send({ serviceDate: "2025-06-01" });

    expect(res.status).toBe(200);
    expect(mockUpdateMaintenanceLog).toHaveBeenCalled();
  });

  it("allows non-date field edits on a confirmed invoice log", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    // Log has a taskCompletionId — but only non-date fields are being changed
    mockGetMaintenanceLog.mockResolvedValue({
      id: LOG_ID,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      serviceDate: "2020-03-15",
      taskCompletionId: TC_ID,
    });

    const updatedLog = { id: LOG_ID, notes: "Updated notes" };
    mockUpdateMaintenanceLog.mockResolvedValue(updatedLog);

    const res = await request(app)
      .patch(`/api/maintenance-logs/${LOG_ID}`)
      .set("x-test-user", "owner")
      .send({ notes: "Updated notes" });

    expect(res.status).toBe(200);
    expect(mockUpdateMaintenanceLog).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/invoice-analyses/:id/confirm — duplicate-analysis protection
//
// Guarantee: uploading and confirming the same invoice twice must not create
// two taskCompletion rows for the same houseId + serviceType within the same
// calendar year as the invoice's serviceDate.  The route queries maintenanceLogs
// for an existing row with the same houseId, case-insensitive serviceType,
// non-null taskCompletionId, and serviceDate within the invoice's own year
// (YYYY-01-01 … YYYY-12-31).  When a match is found the second confirmation
// still creates a maintenance log (for the audit trail) but skips the
// taskCompletion insert and returns { duplicateScoring: true }.
//
// The check is intentionally on serviceType, NOT on serviceDescription, so that
// slightly varied free-text descriptions cannot bypass it.
// ---------------------------------------------------------------------------

describe("PATCH /api/invoice-analyses/:id/confirm — duplicate-analysis protection", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Recent analysis fixture — serviceDate is in the current month so it falls
   * inside the 12-month scoring window and would normally create a taskCompletion.
   */
  function recentAnalysisFixture(id: string, overrides: Record<string, unknown> = {}) {
    const today = new Date();
    const recentDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-10`;
    return {
      id,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      status: "pending",
      completionMethod: "professional",
      serviceDescription: "HVAC annual service",
      serviceDate: recentDate,
      totalAmount: "250.00",
      contractorName: "Bob's HVAC",
      contractorCompany: null,
      homeArea: "hvac",
      serviceType: "maintenance",
      invoiceUrls: [],
      receiptUrls: [],
      beforePhotoUrls: [],
      afterPhotoUrls: [],
      diyVerified: false,
      aiNotes: null,
      ...overrides,
    };
  }

  it("does not create a second taskCompletion when a matching serviceType log already exists (returns duplicateScoring: true)", async () => {
    /**
     * Setup: the homeowner scanned the same invoice twice.
     * - Analysis A was confirmed earlier → a maintenanceLogs row with
     *   taskCompletionId = TC_ID already exists for the same houseId + serviceType.
     * - Analysis B (a second pending analysis with identical content) is now being
     *   confirmed.  The duplicate check must detect the existing scored log and
     *   skip creating another taskCompletion, returning duplicateScoring: true.
     */
    const ANALYSIS_ID_B = "analysis-002";
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-002" });
    mockCheckAchievements.mockResolvedValue([]);

    // db.select:
    //   call 1 — fetch analysis B (pending, same serviceType as the already-confirmed A)
    //   call 2 — duplicate check: returns an existing log row (serviceType matches,
    //            taskCompletionId is not null, serviceDate is within 12 months)
    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([recentAnalysisFixture(ANALYSIS_ID_B)]),
        }),
      })
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: LOG_ID }]),  // existing scored log found
        }),
      });

    // db.update: only one call needed (mark analysis confirmed with taskCompletionId=null)
    const mockUpdateSet = vi.fn().mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID_B, status: "confirmed" }]),
      }),
    });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID_B}/confirm`)
      .set("x-test-user", "owner")
      .send({});

    // Route must succeed — a maintenance log is created for the audit trail
    expect(res.status).toBe(200);

    // duplicateScoring: true signals that the score was NOT bumped
    expect(res.body.duplicateScoring).toBe(true);

    // No taskCompletion must have been inserted — guard prevents score inflation
    const tcInsert = findTaskCompletionInsert(mockInsertValues);
    expect(tcInsert).toBeUndefined();
  });

  it("does not create a second taskCompletion even when serviceDescription differs between the two analyses", async () => {
    /**
     * The duplicate check is on serviceType (a standardised enum-like value),
     * NOT on the free-text serviceDescription.  An attacker who uploads the same
     * invoice twice and edits the description before confirming the second copy
     * must not bypass the guard.
     *
     * Analysis A: serviceDescription="HVAC annual service",  serviceType="maintenance"
     * Analysis B: serviceDescription="HVAC DIFFERENT WORDING", serviceType="maintenance"
     *
     * Both share the same serviceType, so the second confirm must still be blocked
     * from inserting a taskCompletion.
     */
    const ANALYSIS_ID_B = "analysis-003";
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-003" });
    mockCheckAchievements.mockResolvedValue([]);

    // Analysis B has a deliberately different serviceDescription but the same serviceType
    const analysisB = recentAnalysisFixture(ANALYSIS_ID_B, {
      serviceDescription: "HVAC DIFFERENT WORDING",
    });

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([analysisB]),
        }),
      })
      .mockReturnValueOnce({
        // Duplicate check still finds the existing log via serviceType match
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: LOG_ID }]),
        }),
      });

    const mockUpdateSet = vi.fn().mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID_B, status: "confirmed" }]),
      }),
    });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID_B}/confirm`)
      .set("x-test-user", "owner")
      .send({ serviceDescription: "HVAC DIFFERENT WORDING" });

    expect(res.status).toBe(200);
    expect(res.body.duplicateScoring).toBe(true);

    // Even though descriptions differ, no second taskCompletion must be inserted
    const tcInsert = findTaskCompletionInsert(mockInsertValues);
    expect(tcInsert).toBeUndefined();
  });

  it("creates a taskCompletion when no matching serviceType log exists (first confirmation)", async () => {
    /**
     * Baseline / control: the first confirmation of an invoice for a given
     * serviceType must still create a taskCompletion.  This confirms the guard
     * only fires when a duplicate genuinely exists, not on every confirm.
     */
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: LOG_ID });
    mockCheckAchievements.mockResolvedValue([]);

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([recentAnalysisFixture(ANALYSIS_ID)]),
        }),
      })
      .mockReturnValueOnce({
        // Duplicate check: no existing log → allow taskCompletion creation
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

    const mockUpdateSet = vi.fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID, status: "confirmed" }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID}/confirm`)
      .set("x-test-user", "owner")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.duplicateScoring).toBe(false);

    // First confirmation must insert a taskCompletion
    const tcInsert = findTaskCompletionInsert(mockInsertValues);
    expect(tcInsert).toBeDefined();
  });

  it("deduplicates two old invoices from the same calendar year (same-year window, not rolling 12-month)", async () => {
    /**
     * Regression: before the fix, the duplicate check used a rolling 12-month
     * wall-clock cutoff (today − 12 months).  Two old invoices both with
     * serviceDates in 2020 could each produce a taskCompletion because neither
     * fell inside the rolling window — neither would match the other when the
     * second was confirmed.
     *
     * After the fix the window is the invoice's own calendar year (2020-01-01
     * to 2020-12-31).  Confirming the second 2020 invoice must detect the
     * existing 2020 log and return duplicateScoring: true.
     */
    const ANALYSIS_ID_OLD_B = "analysis-old-002";
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-old-002" });
    mockCheckAchievements.mockResolvedValue([]);

    // Analysis B: old invoice from 2020, same serviceType as an already-confirmed 2020 invoice.
    const oldAnalysisB = {
      id: ANALYSIS_ID_OLD_B,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      status: "pending",
      completionMethod: "professional",
      serviceDescription: "Boiler annual maintenance",
      serviceDate: "2020-08-22",  // same calendar year as the first confirmed invoice
      totalAmount: "180.00",
      contractorName: "Ace Heating",
      contractorCompany: null,
      homeArea: "hvac",
      serviceType: "maintenance",  // same serviceType as the already-confirmed log
      invoiceUrls: [],
      receiptUrls: [],
      beforePhotoUrls: [],
      afterPhotoUrls: [],
      diyVerified: false,
      aiNotes: null,
    };

    mockDbSelect
      .mockReturnValueOnce({
        // Fetch analysis B
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([oldAnalysisB]),
        }),
      })
      .mockReturnValueOnce({
        // Duplicate check: finds an existing log whose serviceDate is also in 2020
        // (e.g. "2020-03-15") with a non-null taskCompletionId.
        // Under the old rolling-12-month logic this would NOT have matched because
        // 2020-03-15 is more than 12 months ago.  Under the new year-window logic
        // it DOES match because both dates are in 2020.
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([{ id: "log-old-001" }]),
        }),
      });

    // db.update: one call — mark analysis confirmed with taskCompletionId=null
    const mockUpdateSet = vi.fn().mockReturnValueOnce({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID_OLD_B, status: "confirmed" }]),
      }),
    });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID_OLD_B}/confirm`)
      .set("x-test-user", "owner")
      .send({});

    // Route must succeed — a maintenance log is still created for the audit trail.
    expect(res.status).toBe(200);

    // The year-based window must have caught the duplicate from the same year.
    expect(res.body.duplicateScoring).toBe(true);

    // No second taskCompletion must have been inserted.
    const tcInsert = findTaskCompletionInsert(mockInsertValues);
    expect(tcInsert).toBeUndefined();
  });

  it("does NOT deduplicate two old invoices from different calendar years", async () => {
    /**
     * Correctness boundary: the year-window dedup must NOT fire when the two
     * invoices are from different years (e.g. 2019 vs 2020), even if both are
     * outside the rolling 12-month scoring window.  Each year is an independent
     * service interval.
     */
    const ANALYSIS_ID_2019 = "analysis-2019-001";
    const { mockInsertValues } = buildInsertMock();

    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-2019-001" });
    mockCheckAchievements.mockResolvedValue([]);

    // Analysis to confirm: serviceDate in 2019.
    // The existing confirmed log has serviceDate in 2020 — a different year.
    const analysis2019 = {
      id: ANALYSIS_ID_2019,
      homeownerId: OWNER_ID,
      houseId: HOUSE_ID,
      status: "pending",
      completionMethod: "professional",
      serviceDescription: "Furnace tune-up",
      serviceDate: "2019-11-10",
      totalAmount: "140.00",
      contractorName: "Ace Heating",
      contractorCompany: null,
      homeArea: "hvac",
      serviceType: "maintenance",
      invoiceUrls: [],
      receiptUrls: [],
      beforePhotoUrls: [],
      afterPhotoUrls: [],
      diyVerified: false,
      aiNotes: null,
    };

    mockDbSelect
      .mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([analysis2019]),
        }),
      })
      .mockReturnValueOnce({
        // Duplicate check: no existing log within 2019-01-01…2019-12-31 → allow
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

    const mockUpdateSet = vi.fn()
      .mockReturnValueOnce({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID_2019, status: "confirmed" }]),
        }),
      })
      .mockReturnValueOnce({
        where: vi.fn().mockResolvedValue(undefined),
      });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .patch(`/api/invoice-analyses/${ANALYSIS_ID_2019}/confirm`)
      .set("x-test-user", "owner")
      .send({});

    expect(res.status).toBe(200);

    // Different-year invoices are NOT duplicates of each other.
    expect(res.body.duplicateScoring).toBe(false);

    // A taskCompletion must be created for the 2019 invoice.
    const tcInsert = findTaskCompletionInsert(mockInsertValues);
    expect(tcInsert).toBeDefined();
    expect(tcInsert!.year).toBe(2019);
    expect(tcInsert!.month).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// POST /api/invoice-analyses/analyze — duplicate content-hash detection
//
// Guarantee: uploading the exact same invoice file twice for the same house
// must return 409 DUPLICATE_INVOICE on the second request, before any AI
// call or file upload is attempted.
// ---------------------------------------------------------------------------

describe("POST /api/invoice-analyses/analyze — duplicate content-hash detection", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const FAKE_FILE = {
    fileData: "data:image/jpeg;base64,/9j/4AAQSkZJRgAB",
    fileName: "invoice.jpg",
    fileType: "image/jpeg",
  };

  it("returns 409 DUPLICATE_INVOICE when the same file hash already exists for the house", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);

    // db.select: hash lookup finds an existing analysis
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: ANALYSIS_ID, homeownerId: OWNER_ID, houseId: HOUSE_ID, status: "confirmed" }]),
      }),
    });

    const res = await request(app)
      .post("/api/invoice-analyses/analyze")
      .set("x-test-user", "owner")
      .send({
        houseId: HOUSE_ID,
        completionMethod: "contractor",
        invoiceFiles: [FAKE_FILE],
        receiptFiles: [],
      });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe("DUPLICATE_INVOICE");
    expect(res.body.analysisId).toBe(ANALYSIS_ID);
  });

  it("returns 409 with a clear message so the UI can show 'already confirmed this invoice'", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ id: "dup-analysis", homeownerId: OWNER_ID, houseId: HOUSE_ID, status: "pending" }]),
      }),
    });

    const res = await request(app)
      .post("/api/invoice-analyses/analyze")
      .set("x-test-user", "owner")
      .send({
        houseId: HOUSE_ID,
        completionMethod: "contractor",
        invoiceFiles: [FAKE_FILE],
        receiptFiles: [],
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already been scanned/i);
  });

  it("does not 409 when the same file is submitted for a different house", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const OTHER_HOUSE = { ...HOUSE_FIXTURE, id: "house-other", homeownerId: OWNER_ID };
    mockGetHouse.mockResolvedValue(OTHER_HOUSE);

    // db.select: hash lookup returns empty (different houseId scope)
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([]),
      }),
    });

    // The route proceeds to AI + upload; extractInvoiceData is mocked to throw
    // so the outer catch returns 500, but the important assertion is no 409.
    const res = await request(app)
      .post("/api/invoice-analyses/analyze")
      .set("x-test-user", "owner")
      .send({
        houseId: "house-other",
        completionMethod: "contractor",
        invoiceFiles: [FAKE_FILE],
        receiptFiles: [],
      });

    expect(res.status).not.toBe(409);
  });
});
