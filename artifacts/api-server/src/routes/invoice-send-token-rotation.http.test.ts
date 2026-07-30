/**
 * Tests that POST /api/crm/invoices/:id/send generates a fresh payment-link
 * token on every send/resend and persists it to the invoice record.
 *
 * Uses the demo-contractor shortcut so hasCrmProAccess returns true without
 * needing a real subscription record in the database.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted fixtures
// ---------------------------------------------------------------------------

const {
  INVOICE_ID,
  CONTRACTOR_ID,
  CLIENT_ID,
  mockGetCrmInvoice,
  mockGetCrmClient,
  mockGetContractorByUserId,
  mockGetUser,
  mockGetCompany,
  mockUpdateCrmInvoice,
} = vi.hoisted(() => ({
  INVOICE_ID: "inv-send-rotation-001",
  CONTRACTOR_ID: "demo-contractor-rotation-test",
  CLIENT_ID: "client-rotation-001",
  mockGetCrmInvoice: vi.fn(),
  mockGetCrmClient: vi.fn(),
  mockGetContractorByUserId: vi.fn(),
  mockGetUser: vi.fn(),
  mockGetCompany: vi.fn(),
  mockUpdateCrmInvoice: vi.fn(),
}));

const CONTRACTOR_SESSION = {
  isAuthenticated: true,
  user: {
    id: "demo-contractor-rotation-test",
    role: "contractor",
    email: "contractor@test.com",
    status: "active",
  },
};

const BASE_INVOICE = {
  id: INVOICE_ID,
  contractorUserId: CONTRACTOR_ID,
  homeownerId: "homeowner-rotation-001",
  clientId: CLIENT_ID,
  companyId: null,
  invoiceNumber: "INV-002",
  title: "Plumbing Work",
  description: null,
  status: "draft",
  lineItems: [],
  subtotal: "200.00",
  taxRate: "0.00",
  taxAmount: "0.00",
  discount: "0.00",
  total: "200.00",
  amountPaid: "0.00",
  amountDue: "200.00",
  dueDate: null,
  sentAt: null,
  viewedAt: null,
  paidAt: null,
  paymentMethod: null,
  paymentNotes: null,
  notes: null,
  termsAndConditions: null,
  houseId: null,
  // Pre-existing token (will be rotated)
  paymentToken: "oldhashedtoken".padEnd(64, "0"),
  paymentTokenExpiresAt: new Date(Date.now() - 1000), // already expired
  createdAt: new Date(),
  updatedAt: new Date(),
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
      if (req.headers?.["x-test-user"] === "contractor") {
        req.session = CONTRACTOR_SESSION;
      }
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
  WebSocketServer: class { on() {} clients = new Set(); },
  WebSocket: { OPEN: 1 },
}));
vi.mock("../push-routes", () => ({ default: vi.fn() }));
vi.mock("../push-service", () => ({ pushService: { sendToUser: vi.fn(), sendToMany: vi.fn() } }));
vi.mock("../notification-orchestrator", () => ({
  notificationOrchestrator: { notify: vi.fn(), sendMaintenanceReminder: vi.fn(), sendWeatherAlert: vi.fn() },
}));
vi.mock("../email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailService: {
    send: vi.fn().mockResolvedValue(undefined),
    sendInvoiceEmail: vi.fn().mockResolvedValue(true),
  },
  sendCheckoutFailureEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../sms-service", () => ({
  smsService: { send: vi.fn().mockResolvedValue(undefined), sendInvoiceSMS: vi.fn().mockResolvedValue(true) },
}));
vi.mock("../apple-iap", () => ({
  verifyAndActivateAppleTransaction: vi.fn().mockResolvedValue(undefined),
  handleAppleServerNotification: vi.fn().mockResolvedValue(undefined),
  AppleIapError: class extends Error {},
}));
vi.mock("../objectStorage", () => ({
  ObjectStorageService: class {
    upload = vi.fn(); download = vi.fn(); delete = vi.fn();
    getSignedUrl = vi.fn(); getUploadUrl = vi.fn(); deleteObject = vi.fn();
    getObject = vi.fn(); putObject = vi.fn(); listObjects = vi.fn();
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
vi.mock("openai", () => ({ default: class { chat = { completions: { create: vi.fn() } }; } }));
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
  sessionManager: { createSession: vi.fn(), validateSession: vi.fn(), invalidateSession: vi.fn(), trackRequest: vi.fn() },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = { retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }) };
    this.paymentIntents = { retrieve: vi.fn() };
    this.checkout = { sessions: { create: vi.fn().mockResolvedValue({ url: "https://checkout.stripe.com/stub", id: "cs_stub" }) } };
  }
  return { default: MockStripe };
});
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getCrmInvoice: mockGetCrmInvoice,
      getCrmClient: mockGetCrmClient,
      getContractorByUserId: mockGetContractorByUserId,
      getUser: mockGetUser,
      getCompany: mockGetCompany,
      updateCrmInvoice: mockUpdateCrmInvoice,
    }),
  };
});
vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined), returning: vi.fn().mockResolvedValue([]) }) }),
    select: vi.fn().mockReturnValue({ from: vi.fn().mockReturnValue({ where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }) }) }),
    update: vi.fn().mockReturnValue({ set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }) }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

let _app: express.Express | null = null;
async function buildApp() {
  if (!_app) {
    _app = express();
    _app.use(express.json());
    // Inject contractor session for routes that use isAuthenticated middleware
    _app.use((req: any, _res: any, next: any) => {
      if (req.headers?.["x-test-user"] === "contractor") {
        req.session = CONTRACTOR_SESSION;
      }
      next();
    });
    process.env.STRIPE_SECRET_KEY = "sk_test_send_token_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_send_token_placeholder";
    await registerRoutes(_app);
  }
  return _app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/crm/invoices/:id/send — token generation and rotation", () => {
  afterEach(() => vi.clearAllMocks());

  it("persists a fresh paymentToken and paymentTokenExpiresAt on first send", async () => {
    const app = await buildApp();

    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    mockGetCrmClient.mockResolvedValue({
      id: CLIENT_ID,
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@test.com",
      phone: null,
    });
    mockGetContractorByUserId.mockResolvedValue({ id: "c1", companyId: null, phone: null });
    mockGetUser.mockResolvedValue({ id: CONTRACTOR_ID, firstName: "Bob", lastName: "Builder", email: "bob@test.com", phone: null });
    mockUpdateCrmInvoice.mockResolvedValue({ ...BASE_INVOICE, status: "sent" });

    const res = await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/send`)
      .set("x-test-user", "contractor")
      .send({ method: "email" });

    expect(res.status).toBe(200);

    // updateCrmInvoice must have been called with a new token hash and expiry
    expect(mockUpdateCrmInvoice).toHaveBeenCalledOnce();
    const [_id, updates] = mockUpdateCrmInvoice.mock.calls[0];
    expect(_id).toBe(INVOICE_ID);
    expect(typeof updates.paymentToken).toBe("string");
    expect(updates.paymentToken).toHaveLength(64); // SHA-256 hex digest
    expect(updates.paymentTokenExpiresAt).toBeInstanceOf(Date);
    expect(updates.paymentTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("rotates the token on resend (new hash differs from any previously stored value)", async () => {
    const app = await buildApp();

    // Invoice already has an existing (expired) token
    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    mockGetCrmClient.mockResolvedValue({
      id: CLIENT_ID,
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@test.com",
      phone: null,
    });
    mockGetContractorByUserId.mockResolvedValue({ id: "c1", companyId: null, phone: null });
    mockGetUser.mockResolvedValue({ id: CONTRACTOR_ID, firstName: "Bob", lastName: "Builder", email: "bob@test.com", phone: null });
    mockUpdateCrmInvoice.mockResolvedValue({ ...BASE_INVOICE, status: "sent" });

    const res = await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/send`)
      .set("x-test-user", "contractor")
      .send({ method: "email" });

    expect(res.status).toBe(200);

    const [, updates] = mockUpdateCrmInvoice.mock.calls[0];
    // The new hash must differ from the old expired one stored on BASE_INVOICE
    expect(updates.paymentToken).not.toBe(BASE_INVOICE.paymentToken);
    // And the new expiry must be in the future (not the old expired one)
    expect(updates.paymentTokenExpiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("embeds the raw token in the payment URL sent to the client (not the hash)", async () => {
    const app = await buildApp();

    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    const { emailService } = await import("../email-service");
    const sendInvoiceEmailSpy = vi.spyOn(emailService, "sendInvoiceEmail").mockResolvedValue(true);

    mockGetCrmClient.mockResolvedValue({
      id: CLIENT_ID,
      firstName: "Alice",
      lastName: "Smith",
      email: "alice@test.com",
      phone: null,
    });
    mockGetContractorByUserId.mockResolvedValue({ id: "c1", companyId: null, phone: null });
    mockGetUser.mockResolvedValue({ id: CONTRACTOR_ID, firstName: "Bob", lastName: "Builder", email: "bob@test.com", phone: null });
    mockUpdateCrmInvoice.mockResolvedValue({ ...BASE_INVOICE, status: "sent" });

    await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/send`)
      .set("x-test-user", "contractor")
      .send({ method: "email" });

    expect(sendInvoiceEmailSpy).toHaveBeenCalledOnce();
    const emailArgs = sendInvoiceEmailSpy.mock.calls[0][0] as any;

    // The viewUrl in the email should contain ?token= with a 64-char hex value
    expect(emailArgs.viewUrl).toMatch(/\?token=[0-9a-f]{64}$/);

    // The token in the URL must be the raw value (different from the hash stored in DB)
    const [, updateArgs] = mockUpdateCrmInvoice.mock.calls[0];
    const rawTokenInUrl = new URL(emailArgs.viewUrl).searchParams.get("token")!;
    expect(rawTokenInUrl).not.toBe(updateArgs.paymentToken); // URL has raw; DB has hash
    expect(rawTokenInUrl).toHaveLength(64);
  });
});
