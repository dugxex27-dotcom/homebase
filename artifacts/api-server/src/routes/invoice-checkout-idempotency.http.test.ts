/**
 * Tests for the invoice Checkout-session idempotency guard.
 *
 * Covers both call sites that create a Stripe Checkout Session for a CRM
 * invoice:
 *   - POST /api/crm/invoices/:invoiceId/payment-link (contractor-initiated)
 *   - POST /api/pay/invoice/:invoiceId/checkout (homeowner/token-initiated)
 *
 * Proves:
 *   1. A normal single request still creates a session and returns its url.
 *   2. Two genuinely concurrent requests to the SAME endpoint for the same
 *      invoice create only one real Stripe session; the loser reuses it.
 *   3. Two genuinely concurrent requests across the TWO DIFFERENT endpoints
 *      (contractor resending the link while the homeowner clicks "Pay") for
 *      the same invoice+amount also collapse to one real Stripe session.
 *   4. A stale/expired in-flight claim (e.g. left behind by a crashed
 *      request) can be reclaimed rather than blocking forever.
 *   5. A re-priced invoice (different amount) is not blocked by an older
 *      claim/session for the previous amount.
 *
 * The storage mock below implements the same check-then-set semantics as
 * the real atomic `UPDATE ... WHERE` claim in storage.ts, but as a plain
 * synchronous-until-first-await JS function. Because the route handler
 * awaits this call with no intervening awaits inside the mock body itself,
 * two concurrent requests processed on Node's single-threaded event loop
 * cannot interleave in the middle of a claim check-and-set — this gives the
 * same atomicity guarantee a real DB row lock would, so a genuine race
 * (via Promise.all) is a valid proof, not just a sequential-call test.
 */

import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted fixtures
// ---------------------------------------------------------------------------

const {
  INVOICE_ID,
  CONTRACTOR_ID,
  HOMEOWNER_ID,
  CLIENT_ID,
  COMPANY_ID,
  mockGetCrmInvoice,
  mockGetCrmClient,
  mockGetUser,
  mockGetCompany,
  mockUpdateCrmInvoice,
  mockCheckoutSessionsCreate,
  mockCheckoutSessionsRetrieve,
  claimStore,
  resetClaimStore,
  mockClaimInvoiceCheckoutSession,
  mockFinalizeInvoiceCheckoutSession,
  mockReleaseInvoiceCheckoutClaim,
} = vi.hoisted(() => {
  const claimStore: Record<
    string,
    { sessionId: string | null; amount: string | null; expiresAt: number | null }
  > = {};

  function resetClaimStore() {
    for (const key of Object.keys(claimStore)) delete claimStore[key];
  }

  const mockClaimInvoiceCheckoutSession = vi.fn(
    async (invoiceId: string, amount: string, claimTtlMs: number) => {
      const now = Date.now();
      const existing = claimStore[invoiceId];
      const isReclaimable =
        !existing ||
        !existing.sessionId ||
        (existing.expiresAt !== null && existing.expiresAt < now) ||
        existing.amount !== amount;

      if (isReclaimable) {
        claimStore[invoiceId] = { sessionId: "pending", amount, expiresAt: now + claimTtlMs };
        return { outcome: "claimed" as const };
      }
      if (existing.sessionId && existing.sessionId !== "pending") {
        return { outcome: "existing" as const, sessionId: existing.sessionId };
      }
      return { outcome: "pending" as const };
    },
  );

  const mockFinalizeInvoiceCheckoutSession = vi.fn(
    async (invoiceId: string, sessionId: string, amount: string, expiresAt: Date) => {
      claimStore[invoiceId] = { sessionId, amount, expiresAt: expiresAt.getTime() };
    },
  );

  const mockReleaseInvoiceCheckoutClaim = vi.fn(async (invoiceId: string, expectedSessionId: string) => {
    const existing = claimStore[invoiceId];
    if (existing?.sessionId === expectedSessionId) {
      claimStore[invoiceId] = { sessionId: null, amount: null, expiresAt: null };
    }
  });

  return {
    INVOICE_ID: "inv-idem-001",
    CONTRACTOR_ID: "contractor-idem-001",
    HOMEOWNER_ID: "homeowner-idem-001",
    CLIENT_ID: "client-idem-001",
    COMPANY_ID: "company-idem-001",
    mockGetCrmInvoice: vi.fn(),
    mockGetCrmClient: vi.fn(),
    mockGetUser: vi.fn(),
    mockGetCompany: vi.fn(),
    mockUpdateCrmInvoice: vi.fn(),
    mockCheckoutSessionsCreate: vi.fn(),
    mockCheckoutSessionsRetrieve: vi.fn(),
    claimStore,
    resetClaimStore,
    mockClaimInvoiceCheckoutSession,
    mockFinalizeInvoiceCheckoutSession,
    mockReleaseInvoiceCheckoutClaim,
  };
});

const BASE_INVOICE = {
  id: INVOICE_ID,
  contractorUserId: CONTRACTOR_ID,
  homeownerId: HOMEOWNER_ID,
  clientId: CLIENT_ID,
  companyId: COMPANY_ID,
  invoiceNumber: "INV-IDEM-001",
  title: "Roof Repair",
  description: "Fixed the roof",
  status: "sent",
  lineItems: [],
  subtotal: "250.00",
  taxRate: "0.00",
  taxAmount: "0.00",
  discount: "0.00",
  total: "250.00",
  amountPaid: "0.00",
  amountDue: "250.00",
  dueDate: null,
  sentAt: new Date(),
  viewedAt: null,
  paidAt: null,
  paymentMethod: null,
  paymentNotes: null,
  notes: null,
  termsAndConditions: null,
  houseId: null,
  paymentToken: null,
  paymentTokenExpiresAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CONTRACTOR_SESSION = {
  isAuthenticated: true,
  user: { id: CONTRACTOR_ID, role: "contractor", email: "bob@test.com", status: "active" },
};
const HOMEOWNER_SESSION = {
  isAuthenticated: true,
  user: { id: HOMEOWNER_ID, role: "homeowner", email: "alice@test.com", status: "active" },
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
      const who = req.headers?.["x-test-user"];
      if (who === "contractor") req.session = CONTRACTOR_SESSION;
      else if (who === "homeowner") req.session = HOMEOWNER_SESSION;
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
  emailService: { send: vi.fn().mockResolvedValue(undefined), sendInvoiceEmail: vi.fn().mockResolvedValue(true) },
  sendCheckoutFailureEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../sms-service", () => ({ smsService: { send: vi.fn().mockResolvedValue(undefined), sendInvoiceSMS: vi.fn().mockResolvedValue(true) } }));
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
vi.mock("openai", () => ({ default: class { chat = { completions: { create: vi.fn() } }; } } ));
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
    this.checkout = { sessions: { create: mockCheckoutSessionsCreate, retrieve: mockCheckoutSessionsRetrieve } };
  }
  return { default: MockStripe };
});
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getCrmInvoice: mockGetCrmInvoice,
      getCrmClient: mockGetCrmClient,
      getUser: mockGetUser,
      getCompany: mockGetCompany,
      updateCrmInvoice: mockUpdateCrmInvoice,
      claimInvoiceCheckoutSession: mockClaimInvoiceCheckoutSession,
      finalizeInvoiceCheckoutSession: mockFinalizeInvoiceCheckoutSession,
      releaseInvoiceCheckoutClaim: mockReleaseInvoiceCheckoutClaim,
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
// Imports (after vi.mock blocks)
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

let _app: express.Express | null = null;
async function buildApp() {
  if (!_app) {
    _app = express();
    _app.use(express.json());
    _app.use((req: any, _res: any, next: any) => {
      const who = req.headers?.["x-test-user"];
      if (who === "contractor") req.session = CONTRACTOR_SESSION;
      else if (who === "homeowner") req.session = HOMEOWNER_SESSION;
      next();
    });
    process.env.STRIPE_SECRET_KEY = "sk_test_invoice_idem_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_invoice_idem_placeholder";
    await registerRoutes(_app);
  }
  return _app;
}

function resolveAfterATick<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 5));
}

const COMPANY_FIXTURE = {
  id: COMPANY_ID,
  name: "Bob's Roofing",
  stripeConnectAccountId: "acct_test",
  stripeChargesEnabled: true,
};
const CLIENT_FIXTURE = { id: CLIENT_ID, firstName: "Alice", lastName: "Smith", email: "alice@test.com" };

function setupCommonFixtures() {
  mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
  mockGetCrmClient.mockResolvedValue(CLIENT_FIXTURE);
  mockGetUser.mockResolvedValue({ id: CONTRACTOR_ID, companyId: COMPANY_ID });
  mockGetCompany.mockResolvedValue(COMPANY_FIXTURE);
  mockUpdateCrmInvoice.mockResolvedValue({ ...BASE_INVOICE, status: "sent" });
  let sessionCounter = 0;
  mockCheckoutSessionsCreate.mockImplementation(async () => {
    sessionCounter += 1;
    const id = `cs_test_${sessionCounter}`;
    return resolveAfterATick({
      id,
      url: `https://checkout.stripe.com/${id}`,
      status: "open",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    });
  });
  mockCheckoutSessionsRetrieve.mockImplementation(async (id: string) => ({
    id,
    url: `https://checkout.stripe.com/${id}`,
    status: "open",
  }));
}

beforeEach(() => {
  resetClaimStore();
  vi.clearAllMocks();
  setupCommonFixtures();
});
afterEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// Normal single-request flow (regression guard)
// ---------------------------------------------------------------------------

describe("Invoice checkout idempotency — normal single-request flow", () => {
  it("POST /api/crm/invoices/:id/payment-link creates one session and marks the invoice sent", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/payment-link`)
      .set("x-test-user", "contractor")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toContain("checkout.stripe.com");
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
    expect(mockUpdateCrmInvoice).toHaveBeenCalledWith(INVOICE_ID, expect.objectContaining({ status: "sent" }));
  });

  it("POST /api/pay/invoice/:id/checkout creates one session for a normal single request", async () => {
    const app = await buildApp();
    const res = await request(app)
      .post(`/api/pay/invoice/${INVOICE_ID}/checkout`)
      .set("x-test-user", "homeowner")
      .send({ customerEmail: "alice@test.com" });

    expect(res.status).toBe(200);
    expect(res.body.url).toContain("checkout.stripe.com");
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
  });

  it("passes a stable idempotencyKey derived from invoice id and amount to Stripe", async () => {
    const app = await buildApp();
    await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/payment-link`)
      .set("x-test-user", "contractor")
      .send({});

    const [, options] = mockCheckoutSessionsCreate.mock.calls[0];
    expect(options.idempotencyKey).toBe(`crm-invoice-payment-link-${INVOICE_ID}-25000`);
  });
});

// ---------------------------------------------------------------------------
// Real concurrency proof — same endpoint
// ---------------------------------------------------------------------------

describe("Invoice checkout idempotency — concurrent requests to the same endpoint", () => {
  it("two concurrent payment-link requests create only ONE real Stripe session", async () => {
    const app = await buildApp();

    const [res1, res2] = await Promise.all([
      request(app).post(`/api/crm/invoices/${INVOICE_ID}/payment-link`).set("x-test-user", "contractor").send({}),
      request(app).post(`/api/crm/invoices/${INVOICE_ID}/payment-link`).set("x-test-user", "contractor").send({}),
    ]);

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);

    const statuses = [res1.status, res2.status].sort();
    // One request wins and creates the session (200); the other either
    // reuses it (200 with the same paymentUrl) or gets a clear
    // "already in progress" response (409) if it arrived before the
    // winner finished persisting the session.
    expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);
    expect(statuses.includes(200)).toBe(true);

    const successResponses = [res1, res2].filter((r) => r.status === 200);
    if (successResponses.length === 2) {
      expect(successResponses[0].body.paymentUrl).toBe(successResponses[1].body.paymentUrl);
    }
  });

  it("two concurrent homeowner checkout requests create only ONE real Stripe session", async () => {
    const app = await buildApp();

    const [res1, res2] = await Promise.all([
      request(app).post(`/api/pay/invoice/${INVOICE_ID}/checkout`).set("x-test-user", "homeowner").send({ customerEmail: "alice@test.com" }),
      request(app).post(`/api/pay/invoice/${INVOICE_ID}/checkout`).set("x-test-user", "homeowner").send({ customerEmail: "alice@test.com" }),
    ]);

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
    const statuses = [res1.status, res2.status];
    expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);
    expect(statuses.includes(200)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Real concurrency proof — across the two different endpoints
// ---------------------------------------------------------------------------

describe("Invoice checkout idempotency — cross-endpoint race", () => {
  it("a contractor payment-link request and a homeowner checkout request racing for the same invoice create only ONE real Stripe session", async () => {
    const app = await buildApp();

    const [contractorRes, homeownerRes] = await Promise.all([
      request(app).post(`/api/crm/invoices/${INVOICE_ID}/payment-link`).set("x-test-user", "contractor").send({}),
      request(app).post(`/api/pay/invoice/${INVOICE_ID}/checkout`).set("x-test-user", "homeowner").send({ customerEmail: "alice@test.com" }),
    ]);

    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
    const statuses = [contractorRes.status, homeownerRes.status];
    expect(statuses.every((s) => s === 200 || s === 409)).toBe(true);
    expect(statuses.includes(200)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Stale-claim recovery and re-priced-invoice reclaiming
// ---------------------------------------------------------------------------

describe("Invoice checkout idempotency — reclaiming stale or stale-amount slots", () => {
  it("an expired in-flight claim (e.g. left by a crashed request) can be reclaimed", async () => {
    const app = await buildApp();
    // Simulate a previous request that claimed the slot and then crashed
    // before finalizing or releasing it, with the short in-flight TTL
    // already elapsed.
    claimStore[INVOICE_ID] = { sessionId: "pending", amount: "250.00", expiresAt: Date.now() - 1000 };

    const res = await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/payment-link`)
      .set("x-test-user", "contractor")
      .send({});

    expect(res.status).toBe(200);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
  });

  it("an existing valid session for a different (stale) amount does not block a fresh session for the current amount", async () => {
    const app = await buildApp();
    // A session already exists, but for the invoice's previous total
    // before it was edited/re-priced.
    claimStore[INVOICE_ID] = { sessionId: "cs_old_amount", amount: "100.00", expiresAt: Date.now() + 3600_000 };

    const res = await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/payment-link`)
      .set("x-test-user", "contractor")
      .send({});

    expect(res.status).toBe(200);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
    // Should not have needed to retrieve the stale-amount session.
    expect(mockCheckoutSessionsRetrieve).not.toHaveBeenCalled();
  });

  it("a still-open existing session for the SAME amount is reused instead of creating a new one", async () => {
    const app = await buildApp();
    claimStore[INVOICE_ID] = { sessionId: "cs_existing_open", amount: "250.00", expiresAt: Date.now() + 3600_000 };

    const res = await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/payment-link`)
      .set("x-test-user", "contractor")
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.paymentUrl).toBe("https://checkout.stripe.com/cs_existing_open");
    expect(mockCheckoutSessionsRetrieve).toHaveBeenCalledWith("cs_existing_open");
    expect(mockCheckoutSessionsCreate).not.toHaveBeenCalled();
  });

  it("an existing session that Stripe reports as no longer open is released and a fresh one is created", async () => {
    const app = await buildApp();
    claimStore[INVOICE_ID] = { sessionId: "cs_expired", amount: "250.00", expiresAt: Date.now() + 3600_000 };
    mockCheckoutSessionsRetrieve.mockResolvedValueOnce({ id: "cs_expired", url: null, status: "expired" });

    const res = await request(app)
      .post(`/api/crm/invoices/${INVOICE_ID}/payment-link`)
      .set("x-test-user", "contractor")
      .send({});

    expect(res.status).toBe(200);
    expect(mockCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
    expect(res.body.paymentUrl).not.toBe("https://checkout.stripe.com/cs_expired");
  });
});
