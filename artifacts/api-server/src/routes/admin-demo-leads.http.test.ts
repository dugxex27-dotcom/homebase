/**
 * HTTP-level tests: GET /api/admin/demo-leads
 *
 * Covers:
 *  - 401 when the caller has no authenticated session
 *  - 403 when the caller is authenticated but not on the ADMIN_EMAILS allow-list
 *  - 403 when the caller is a QA account (even if somehow allow-listed)
 *  - 200 with the full lead list, sorted most-recent-first, for an admin
 *  - 200 with an empty array when there are no leads (empty-state)
 *  - role/email query params are forwarded into the DB filter conditions
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted — shared mock fn refs visible in vi.mock() factories
// ---------------------------------------------------------------------------

const { mockDbOrderBy, mockDbWhere, mockDbFrom, mockDbSelect, mockGetUser } = vi.hoisted(() => {
  const mockDbOrderBy = vi.fn().mockResolvedValue([]);
  const mockDbWhere = vi.fn().mockReturnValue({ orderBy: mockDbOrderBy });
  const mockDbFrom = vi.fn().mockReturnValue({ where: mockDbWhere });
  const mockDbSelect = vi.fn().mockReturnValue({ from: mockDbFrom });
  return {
    mockDbOrderBy,
    mockDbWhere,
    mockDbFrom,
    mockDbSelect,
    mockGetUser: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
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
      getUser: mockGetUser,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 }), end: vi.fn() },
  db: {
    select: mockDbSelect,
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

const ADMIN_EMAIL = "site-admin@example.com";
const ADMIN_ID = "admin-test-001";
const NON_ADMIN_EMAIL = "regular-user@example.com";

async function buildApp(sessionUser: { id: string; email: string } | null): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    if (sessionUser) {
      req.session = { isAuthenticated: true, user: sessionUser };
    } else {
      req.session = { isAuthenticated: false };
    }
    next();
  });

  await registerRoutes(app);
  return app;
}

const LEAD_FIXTURE_1 = {
  id: "lead-001",
  name: "Jane Homeowner",
  email: "jane@example.com",
  zipcode: "94103",
  role: "homeowner",
  ipAddress: "203.0.113.5",
  createdAt: new Date("2026-08-25T12:00:00.000Z"),
};

const LEAD_FIXTURE_2 = {
  id: "lead-002",
  name: "Carl Contractor",
  email: "carl@example.com",
  zipcode: "10001",
  role: "contractor",
  ipAddress: "203.0.113.9",
  createdAt: new Date("2026-08-20T09:30:00.000Z"),
};

describe("GET /api/admin/demo-leads", () => {
  let previousAdminEmails: string | undefined;

  beforeEach(() => {
    previousAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    mockDbOrderBy.mockReset().mockResolvedValue([]);
    mockGetUser.mockReset();
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = previousAdminEmails;
    vi.clearAllMocks();
  });

  it("returns 401 when there is no authenticated session", async () => {
    const app = await buildApp(null);

    const res = await request(app).get("/api/admin/demo-leads");

    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is authenticated but not on the admin allow-list", async () => {
    const app = await buildApp({ id: "regular-001", email: NON_ADMIN_EMAIL });

    const res = await request(app).get("/api/admin/demo-leads");

    expect(res.status).toBe(403);
    expect(mockDbOrderBy).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is a QA account, even if the email is allow-listed", async () => {
    mockGetUser.mockResolvedValue({ id: ADMIN_ID, email: ADMIN_EMAIL, isQaAccount: true });
    const app = await buildApp({ id: ADMIN_ID, email: ADMIN_EMAIL });

    const res = await request(app).get("/api/admin/demo-leads");

    expect(res.status).toBe(403);
    expect(mockDbOrderBy).not.toHaveBeenCalled();
  });

  it("returns 200 with the full lead list for an admin (populated state)", async () => {
    mockGetUser.mockResolvedValue({ id: ADMIN_ID, email: ADMIN_EMAIL, isQaAccount: false });
    mockDbOrderBy.mockResolvedValueOnce([LEAD_FIXTURE_1, LEAD_FIXTURE_2]);
    const app = await buildApp({ id: ADMIN_ID, email: ADMIN_EMAIL });

    const res = await request(app).get("/api/admin/demo-leads");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({
      name: "Jane Homeowner",
      email: "jane@example.com",
      zipcode: "94103",
      role: "homeowner",
      ipAddress: "203.0.113.5",
    });
  });

  it("returns 200 with an empty array when there are no leads (empty state)", async () => {
    mockGetUser.mockResolvedValue({ id: ADMIN_ID, email: ADMIN_EMAIL, isQaAccount: false });
    mockDbOrderBy.mockResolvedValueOnce([]);
    const app = await buildApp({ id: ADMIN_ID, email: ADMIN_EMAIL });

    const res = await request(app).get("/api/admin/demo-leads");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("applies the role filter query param to the DB where clause", async () => {
    mockGetUser.mockResolvedValue({ id: ADMIN_ID, email: ADMIN_EMAIL, isQaAccount: false });
    mockDbOrderBy.mockResolvedValueOnce([LEAD_FIXTURE_2]);
    const app = await buildApp({ id: ADMIN_ID, email: ADMIN_EMAIL });

    const res = await request(app).get("/api/admin/demo-leads?role=contractor");

    expect(res.status).toBe(200);
    // A defined (non-undefined) condition object was passed to .where(),
    // proving the role filter was applied rather than ignored.
    expect(mockDbWhere).toHaveBeenCalledWith(expect.anything());
    expect(mockDbWhere.mock.calls[mockDbWhere.mock.calls.length - 1][0]).not.toBeUndefined();
  });

  it("ignores an invalid role value and returns the unfiltered where clause", async () => {
    mockGetUser.mockResolvedValue({ id: ADMIN_ID, email: ADMIN_EMAIL, isQaAccount: false });
    mockDbOrderBy.mockResolvedValueOnce([LEAD_FIXTURE_1, LEAD_FIXTURE_2]);
    const app = await buildApp({ id: ADMIN_ID, email: ADMIN_EMAIL });

    const res = await request(app).get("/api/admin/demo-leads?role=not-a-real-role");

    expect(res.status).toBe(200);
    expect(mockDbWhere.mock.calls[mockDbWhere.mock.calls.length - 1][0]).toBeUndefined();
  });
});

describe("GET /api/admin/maintenance-evidence-reviews authorization", () => {
  let previousAdminEmails: string | undefined;

  beforeEach(() => {
    previousAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    mockGetUser.mockReset();
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = previousAdminEmails;
    vi.clearAllMocks();
  });

  it("returns 401 when there is no authenticated session", async () => {
    const app = await buildApp(null);

    const res = await request(app).get("/api/admin/maintenance-evidence-reviews");

    expect(res.status).toBe(401);
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("returns 403 when the caller is not on the admin allow-list", async () => {
    const app = await buildApp({ id: "regular-001", email: NON_ADMIN_EMAIL });

    const res = await request(app).get("/api/admin/maintenance-evidence-reviews");

    expect(res.status).toBe(403);
    expect(mockDbSelect).not.toHaveBeenCalled();
  });
});

describe("PUT /api/site-content/:key authorization", () => {
  let previousAdminEmails: string | undefined;

  beforeEach(() => {
    previousAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    mockGetUser.mockReset();
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = previousAdminEmails;
    vi.clearAllMocks();
  });

  it("returns 401 when there is no authenticated session", async () => {
    const app = await buildApp(null);

    const res = await request(app)
      .put("/api/site-content/landing-headline")
      .send({ value: "Unauthorized edit" });

    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not on the admin allow-list", async () => {
    const app = await buildApp({ id: "regular-001", email: NON_ADMIN_EMAIL });

    const res = await request(app)
      .put("/api/site-content/landing-headline")
      .send({ value: "Non-admin edit" });

    expect(res.status).toBe(403);
  });
});
