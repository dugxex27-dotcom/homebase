/**
 * Integration tests for POST /api/contractor/invoices/upload
 *
 * Covers two silent-default bugs fixed on this endpoint:
 *
 *   1. homeownerId: when the caller supplies a homeownerId that has no
 *      proposal relationship scoping it to their company, the route used
 *      to silently drop it to null and proceed as if no homeowner had been
 *      given at all. Now it returns a 400 validation error instead, while
 *      omitting homeownerId entirely (a legitimate, unscoped invoice) still
 *      succeeds with a null homeownerId.
 *
 *   2. amount: non-numeric amounts used to be persisted verbatim via
 *      String(amount), and a real $0 amount was turned into null by a
 *      truthiness check. Now non-numeric amounts are rejected with a 400,
 *      and 0 is stored as "0".
 */

import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  COMPANY_ID,
  OWNER_USER_ID,
  HOMEOWNER_ID,
  UNSCOPED_HOMEOWNER_ID,
  mockDbSelect,
  mockDbInsert,
} = vi.hoisted(() => ({
  COMPANY_ID: "company-001",
  OWNER_USER_ID: "contractor-owner-001",
  HOMEOWNER_ID: "homeowner-scoped-001",
  UNSCOPED_HOMEOWNER_ID: "homeowner-unscoped-999",
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
}));

const OWNER_SESSION = {
  isAuthenticated: true,
  user: {
    id: OWNER_USER_ID,
    email: "owner@contractor.com",
    role: "contractor",
    companyId: COMPANY_ID,
    companyRole: "owner",
    status: "active",
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
      req.session = OWNER_SESSION;
      next();
    }),
    requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireActiveAccountFresh: vi.fn(() => (_req: any, _res: any, next: any) => next()),
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
    uploadFile = vi.fn().mockResolvedValue(undefined);
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
  return { storage: createStorageMock({}) };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
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

/** Mocks db.select(...).from(...).where(...).limit(...) for the proposal-scoping check. */
function mockProposalLookup(result: Array<{ id: string }>) {
  mockDbSelect.mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(result),
      }),
    }),
  });
}

/**
 * db.insert is shared with unrelated startup seeding (e.g. subscription
 * plans), which also runs during registerRoutes(). Returns the `values`
 * mock directly so assertions can filter to the call shaped like an
 * invoice-upload insert (identified by its `fileName` key) instead of
 * assuming db.insert is called exactly once overall.
 */
function mockInsertReturning(row: any) {
  const valuesMock = vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([row]),
  });
  mockDbInsert.mockReturnValue({ values: valuesMock });
  return valuesMock;
}

function findInvoiceInsertValues(valuesMock: ReturnType<typeof vi.fn>) {
  return valuesMock.mock.calls.map((c: any[]) => c[0]).find((v: any) => v && "fileName" in v);
}

function collectSqlValues(value: unknown, seen = new WeakSet<object>()): unknown[] {
  if (value == null || typeof value !== "object") return [value];
  if (seen.has(value)) return [];
  seen.add(value);
  return Object.values(value).flatMap((child) => collectSqlValues(child, seen));
}

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/contractor/invoices/upload — homeownerId + amount validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_invoice_upload_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_invoice_upload_placeholder";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects with 400 (not silent null) when homeownerId has no proposal relationship scoping it to this company", async () => {
    const app = await buildApp();
    mockProposalLookup([]); // no matching proposal found

    const res = await request(app)
      .post("/api/contractor/invoices/upload")
      .field("homeownerId", UNSCOPED_HOMEOWNER_ID)
      .field("amount", "100")
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/homeowner/i);
  });

  it("succeeds and links the homeowner when a proposal relationship does scope it to this company", async () => {
    const app = await buildApp();
    mockProposalLookup([{ id: "proposal-1" }]);
    const valuesMock = mockInsertReturning({ id: "invoice-1", homeownerId: HOMEOWNER_ID, amount: "100" });

    const res = await request(app)
      .post("/api/contractor/invoices/upload")
      .field("homeownerId", HOMEOWNER_ID)
      .field("amount", "100")
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    const insertedValues = findInvoiceInsertValues(valuesMock);
    expect(insertedValues?.homeownerId).toBe(HOMEOWNER_ID);
  });

  it("succeeds with a null homeownerId when none is supplied at all (legitimate unscoped invoice)", async () => {
    const app = await buildApp();
    const valuesMock = mockInsertReturning({ id: "invoice-2", homeownerId: null, amount: "50" });

    const res = await request(app)
      .post("/api/contractor/invoices/upload")
      .field("amount", "50")
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    const insertedValues = findInvoiceInsertValues(valuesMock);
    expect(insertedValues?.homeownerId).toBeNull();
  });

  it("rejects a non-numeric amount with 400 instead of persisting it verbatim", async () => {
    const app = await buildApp();
    const valuesMock = mockInsertReturning({ id: "invoice-x" });

    const res = await request(app)
      .post("/api/contractor/invoices/upload")
      .field("amount", "not-a-number")
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/amount/i);
    expect(findInvoiceInsertValues(valuesMock)).toBeUndefined();
  });

  it("stores a real $0 amount as \"0\", not null", async () => {
    const app = await buildApp();
    const valuesMock = mockInsertReturning({ id: "invoice-3", homeownerId: null, amount: "0" });

    const res = await request(app)
      .post("/api/contractor/invoices/upload")
      .field("amount", "0")
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    const insertedValues = findInvoiceInsertValues(valuesMock);
    expect(insertedValues?.amount).toBe("0");
  });

  it("stores null amount when amount is omitted entirely (no regression)", async () => {
    const app = await buildApp();
    const valuesMock = mockInsertReturning({ id: "invoice-4", homeownerId: null, amount: null });

    const res = await request(app)
      .post("/api/contractor/invoices/upload")
      .attach("file", Buffer.from("%PDF-1.4 fake"), { filename: "invoice.pdf", contentType: "application/pdf" });

    expect(res.status).toBe(201);
    const insertedValues = findInvoiceInsertValues(valuesMock);
    expect(insertedValues?.amount).toBeNull();
  });
});

describe("GET /api/contractor/invoices — CSV export", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    OWNER_SESSION.user.companyRole = "owner";
  });

  afterEach(() => {
    OWNER_SESSION.user.companyRole = "owner";
  });

  it("rejects CSV export for technicians", async () => {
    OWNER_SESSION.user.companyRole = "tech";
    const app = await buildApp();

    const res = await request(app).get("/api/contractor/invoices?format=csv");

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/admins/i);
    expect(mockDbSelect).not.toHaveBeenCalled();
  });

  it("exports CSV for admins and preserves every active filter", async () => {
    const whereMock = vi.fn().mockReturnValue({
      orderBy: vi.fn().mockResolvedValue([{
        invoiceDate: "2026-09-05",
        createdAt: "2026-09-06T00:00:00.000Z",
        uploaderFirstName: "Terry",
        uploaderLastName: "Tech",
        uploaderEmail: "terry@example.com",
        homeownerFirstName: "Hana",
        homeownerLastName: "Homeowner",
        amount: "99.50",
        fileName: "invoice.pdf",
        notes: "Paid",
      }]),
    });
    mockDbSelect.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({ where: whereMock }),
      }),
    });
    const app = await buildApp();

    const res = await request(app).get(
      "/api/contractor/invoices?format=csv&techId=tech-22"
      + "&startDate=2026-09-01&endDate=2026-09-30&homeownerName=Hana",
    );

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/text\/csv/);
    expect(res.headers["content-disposition"]).toMatch(/attachment/);
    expect(res.text).toContain('"Terry Tech","Hana Homeowner","99.50","invoice.pdf","Paid"');

    const appliedValues = collectSqlValues(whereMock.mock.calls[0][0]);
    expect(appliedValues).toContain("tech-22");
    expect(appliedValues).toContain("2026-09-01");
    expect(appliedValues).toContain("2026-09-30");
    expect(appliedValues).toContain("%hana%");
  });
});
