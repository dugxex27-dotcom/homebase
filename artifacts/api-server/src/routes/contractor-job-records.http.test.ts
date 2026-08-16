/**
 * HTTP-level tests: contractor job records feature
 *
 * Covers:
 *  - POST /api/crm/jobs/:jobId/send-to-homeowner
 *      · 401 when unauthenticated
 *      · 403 when caller is not a contractor
 *      · 400 when homeownerId is missing from body
 *      · 404 when the job does not exist or belongs to a different contractor
 *      · 201 on successful record creation
 *  - GET  /api/homeowner/pending-job-records
 *      · 403 when caller is not a homeowner
 *      · 200 returns pending records list
 *  - POST /api/homeowner/pending-job-records/:id/accept
 *      · 403 when caller is not a homeowner
 *      · 404 when the record is not found
 *      · 409 idempotency — cannot accept a record that is already processed
 *      · 200 creates a contractor_verified maintenance log
 *  - POST /api/homeowner/pending-job-records/:id/decline
 *      · 403 when caller is not a homeowner
 *      · 404 when the record is not found
 *      · 409 idempotency — cannot decline a record that is already processed
 *      · 200 marks the record as declined
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted — shared fixtures and mock fn refs visible in vi.mock() factories
// ---------------------------------------------------------------------------

const {
  CONTRACTOR_ID,
  HOMEOWNER_ID,
  JOB_ID,
  RECORD_ID,
  HOUSE_ID,
  mockGetCrmJob,
  mockGetUser,
  mockGetCompany,
  mockGetHouse,
  mockCreateMaintenanceLog,
  mockDbSelect,
  mockDbInsertValues,
  mockDbInsertReturning,
  mockDbUpdateSet,
  mockDbUpdateWhere,
} = vi.hoisted(() => {
  const mockDbUpdateWhere = vi.fn().mockResolvedValue([]);
  const mockDbUpdateSet = vi.fn().mockReturnValue({ where: mockDbUpdateWhere });
  const mockDbInsertReturning = vi.fn().mockResolvedValue([]);
  const mockDbInsertValues = vi.fn().mockReturnValue({ returning: mockDbInsertReturning });

  return {
    CONTRACTOR_ID:   "contractor-test-001",
    HOMEOWNER_ID:    "homeowner-test-001",
    JOB_ID:          "job-test-001",
    RECORD_ID:       "record-test-001",
    HOUSE_ID:        "house-test-001",
    mockGetCrmJob:          vi.fn(),
    mockGetUser:            vi.fn(),
    mockGetCompany:         vi.fn(),
    mockGetHouse:           vi.fn(),
    mockCreateMaintenanceLog: vi.fn(),
    mockDbSelect:           vi.fn(),
    mockDbInsertValues,
    mockDbInsertReturning,
    mockDbUpdateSet,
    mockDbUpdateWhere,
  };
});

// ---------------------------------------------------------------------------
// Session fixtures
// ---------------------------------------------------------------------------

const CONTRACTOR_SESSION = {
  isAuthenticated: true,
  user: {
    id: CONTRACTOR_ID,
    email: "contractor@test.com",
    role: "contractor",
    status: "active",
    companyId: null,
  },
};

const HOMEOWNER_SESSION = {
  isAuthenticated: true,
  user: {
    id: HOMEOWNER_ID,
    email: "homeowner@test.com",
    role: "homeowner",
    status: "active",
  },
};

// ---------------------------------------------------------------------------
// Data fixtures
// ---------------------------------------------------------------------------

const JOB_FIXTURE = {
  id: JOB_ID,
  contractorUserId: CONTRACTOR_ID,
  serviceType: "HVAC Maintenance",
  description: "Annual tune-up",
  completionNotes: "Filter replaced",
};

const CONTRACTOR_USER = {
  id: CONTRACTOR_ID,
  email: "contractor@test.com",
  role: "contractor",
  status: "active",
  firstName: "Joe",
  lastName: "Tech",
};

const HOMEOWNER_USER = {
  id: HOMEOWNER_ID,
  email: "homeowner@test.com",
  role: "homeowner",
  status: "active",
  firstName: "Jane",
};

const HOUSE_FIXTURE = {
  id: HOUSE_ID,
  homeownerId: HOMEOWNER_ID,
  address: "123 Main St",
};

const JOB_RECORD_FIXTURE = {
  id: RECORD_ID,
  contractorUserId: CONTRACTOR_ID,
  contractorName: "Joe Tech",
  contractorCompany: null,
  homeownerId: HOMEOWNER_ID,
  houseId: HOUSE_ID,
  jobId: JOB_ID,
  serviceType: "HVAC Maintenance",
  serviceDescription: null,
  completionNotes: "Filter replaced",
  equipmentInfo: [],
  photos: [],
  nextServiceDate: null,
  nextServiceNotes: null,
  status: "pending",
  acceptedAt: null,
  createdAt: new Date("2026-06-01T10:00:00.000Z"),
};

const MAINTENANCE_LOG_FIXTURE = {
  id: "mlog-test-001",
  homeownerId: HOMEOWNER_ID,
  houseId: HOUSE_ID,
  serviceType: "HVAC Maintenance",
  verificationTier: "contractor_verified",
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
      const role = req.headers?.["x-test-user"];
      if (role === "contractor") {
        req.session = CONTRACTOR_SESSION;
        return next();
      }
      if (role === "homeowner") {
        req.session = HOMEOWNER_SESSION;
        return next();
      }
      return res.status(401).json({ message: "Unauthorized" });
    }),
    requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireActiveAccount: vi.fn((_req: any, _res: any, next: any) => next()),
    requireActiveAccountFresh: vi.fn((_req: any, _res: any, next: any) => next()),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    evictStatusCache: vi.fn(),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));

vi.mock("ws", () => ({
  WebSocketServer: class { on() {} clients = new Set(); },
  WebSocket: { OPEN: 1 },
}));

vi.mock("../push-routes",  () => ({ default: vi.fn() }));
vi.mock("../push-service",  () => ({
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
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = { retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }) };
    this.checkout = { sessions: { create: vi.fn() } };
    this.customers = { create: vi.fn(), list: vi.fn().mockResolvedValue({ data: [] }) };
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
      getCrmJob:            mockGetCrmJob,
      getUser:              mockGetUser,
      getCompany:           mockGetCompany,
      getHouse:             mockGetHouse,
      createMaintenanceLog: mockCreateMaintenanceLog,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), end: vi.fn() },
  db: {
    select: mockDbSelect,
    insert: vi.fn().mockReturnValue({ values: mockDbInsertValues }),
    update: vi.fn().mockReturnValue({ set: mockDbUpdateSet }),
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
  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Select mock helpers
//
// Routes use two patterns:
//   a) await db.select().from(T).where(...)              ← accept / decline
//   b) await db.select().from(T).where(...).orderBy(...) ← GET pending list
//
// We satisfy both by returning a thenable from .where() that also carries
// an .orderBy() method.
// ---------------------------------------------------------------------------

/**
 * Queue one db.select() call that resolves `rows`.
 * .where() is directly awaitable AND has .orderBy() chained on it.
 */
function selectOnce(rows: any[]) {
  mockDbSelect.mockReturnValueOnce({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue(
        Object.assign(Promise.resolve(rows), {
          orderBy: vi.fn().mockResolvedValue(rows),
        }),
      ),
    }),
  });
}

// ---------------------------------------------------------------------------
// POST /api/crm/jobs/:jobId/send-to-homeowner
// ---------------------------------------------------------------------------

describe("POST /api/crm/jobs/:jobId/send-to-homeowner", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = await buildApp();
    // Default: contractor user lookup returns expected fixtures
    mockGetUser.mockImplementation((id: string) => {
      if (id === HOMEOWNER_ID) return Promise.resolve(HOMEOWNER_USER);
      if (id === CONTRACTOR_ID) return Promise.resolve(CONTRACTOR_USER);
      return Promise.resolve(null);
    });
    mockGetCrmJob.mockResolvedValue(JOB_FIXTURE);
    mockGetCompany.mockResolvedValue(null);
    mockDbInsertReturning.mockResolvedValue([JOB_RECORD_FIXTURE]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the caller is not authenticated", async () => {
    const res = await request(app)
      .post(`/api/crm/jobs/${JOB_ID}/send-to-homeowner`)
      .send({ homeownerId: HOMEOWNER_ID });

    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not a contractor", async () => {
    const res = await request(app)
      .post(`/api/crm/jobs/${JOB_ID}/send-to-homeowner`)
      .set("x-test-user", "homeowner")
      .send({ homeownerId: HOMEOWNER_ID });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only contractors/i);
  });

  it("returns 400 when homeownerId is missing from the body", async () => {
    const res = await request(app)
      .post(`/api/crm/jobs/${JOB_ID}/send-to-homeowner`)
      .set("x-test-user", "contractor")
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/homeownerId is required/i);
  });

  it("returns 404 when the job does not exist", async () => {
    mockGetCrmJob.mockResolvedValueOnce(null);

    const res = await request(app)
      .post(`/api/crm/jobs/${JOB_ID}/send-to-homeowner`)
      .set("x-test-user", "contractor")
      .send({ homeownerId: HOMEOWNER_ID });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/job not found/i);
  });

  it("returns 404 when the job belongs to a different contractor", async () => {
    mockGetCrmJob.mockResolvedValueOnce({
      ...JOB_FIXTURE,
      contractorUserId: "other-contractor-999",
    });

    const res = await request(app)
      .post(`/api/crm/jobs/${JOB_ID}/send-to-homeowner`)
      .set("x-test-user", "contractor")
      .send({ homeownerId: HOMEOWNER_ID });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/job not found/i);
  });

  it("returns 201 and the created record on success", async () => {
    const res = await request(app)
      .post(`/api/crm/jobs/${JOB_ID}/send-to-homeowner`)
      .set("x-test-user", "contractor")
      .send({ homeownerId: HOMEOWNER_ID, houseId: HOUSE_ID });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: RECORD_ID,
      contractorUserId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "pending",
    });
  });
});

// ---------------------------------------------------------------------------
// GET /api/homeowner/pending-job-records
// ---------------------------------------------------------------------------

describe("GET /api/homeowner/pending-job-records", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the caller is not a homeowner", async () => {
    const res = await request(app)
      .get("/api/homeowner/pending-job-records")
      .set("x-test-user", "contractor");

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only homeowners/i);
  });

  it("returns 200 with pending records for the authenticated homeowner", async () => {
    selectOnce([JOB_RECORD_FIXTURE]);

    const res = await request(app)
      .get("/api/homeowner/pending-job-records")
      .set("x-test-user", "homeowner");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0]).toMatchObject({ id: RECORD_ID, status: "pending" });
  });
});

// ---------------------------------------------------------------------------
// POST /api/homeowner/pending-job-records/:id/accept
// ---------------------------------------------------------------------------

describe("POST /api/homeowner/pending-job-records/:id/accept", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = await buildApp();
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue(MAINTENANCE_LOG_FIXTURE);
    mockDbUpdateWhere.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the caller is not a homeowner", async () => {
    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/accept`)
      .set("x-test-user", "contractor")
      .send({ houseId: HOUSE_ID });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only homeowners/i);
  });

  it("returns 404 when the record does not exist for this homeowner", async () => {
    selectOnce([]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/accept`)
      .set("x-test-user", "homeowner")
      .send({ houseId: HOUSE_ID });

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/record not found/i);
  });

  it("returns 409 when the record has already been accepted (idempotency)", async () => {
    selectOnce([{ ...JOB_RECORD_FIXTURE, status: "accepted" }]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/accept`)
      .set("x-test-user", "homeowner")
      .send({ houseId: HOUSE_ID });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already processed/i);
  });

  it("returns 409 when the record has already been declined (idempotency)", async () => {
    selectOnce([{ ...JOB_RECORD_FIXTURE, status: "declined" }]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/accept`)
      .set("x-test-user", "homeowner")
      .send({ houseId: HOUSE_ID });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already processed/i);
  });

  it("returns 200, creates a contractor_verified maintenance log, and returns the log", async () => {
    selectOnce([JOB_RECORD_FIXTURE]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/accept`)
      .set("x-test-user", "homeowner")
      .send({ houseId: HOUSE_ID });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      message: expect.stringMatching(/accepted/i),
      maintenanceLog: expect.objectContaining({ verificationTier: "contractor_verified" }),
    });

    // createMaintenanceLog must be called with contractor_verified tier
    expect(mockCreateMaintenanceLog).toHaveBeenCalledOnce();
    const logArg = mockCreateMaintenanceLog.mock.calls[0][0];
    expect(logArg.verificationTier).toBe("contractor_verified");
    expect(logArg.completionMethod).toBe("contractor");
    expect(logArg.homeownerId).toBe(HOMEOWNER_ID);
  });
});

// ---------------------------------------------------------------------------
// POST /api/homeowner/pending-job-records/:id/decline
// ---------------------------------------------------------------------------

describe("POST /api/homeowner/pending-job-records/:id/decline", () => {
  let app: express.Express;

  beforeEach(async () => {
    app = await buildApp();
    mockDbUpdateWhere.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the caller is not a homeowner", async () => {
    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/decline`)
      .set("x-test-user", "contractor");

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only homeowners/i);
  });

  it("returns 404 when the record does not exist for this homeowner", async () => {
    selectOnce([]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/decline`)
      .set("x-test-user", "homeowner");

    expect(res.status).toBe(404);
    expect(res.body.message).toMatch(/record not found/i);
  });

  it("returns 409 when the record has already been declined (idempotency)", async () => {
    selectOnce([{ ...JOB_RECORD_FIXTURE, status: "declined" }]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/decline`)
      .set("x-test-user", "homeowner");

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already processed/i);
  });

  it("returns 409 when the record has already been accepted (idempotency)", async () => {
    selectOnce([{ ...JOB_RECORD_FIXTURE, status: "accepted" }]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/decline`)
      .set("x-test-user", "homeowner");

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already processed/i);
  });

  it("returns 200 and marks the record as declined", async () => {
    selectOnce([JOB_RECORD_FIXTURE]);

    const res = await request(app)
      .post(`/api/homeowner/pending-job-records/${RECORD_ID}/decline`)
      .set("x-test-user", "homeowner");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/dismissed/i);

    // db.update must have been called with status: 'declined'
    expect(mockDbUpdateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: "declined" }),
    );
  });
});
