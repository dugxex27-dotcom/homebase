/**
 * Tests for the invoice payment-link token system.
 *
 * Covers:
 *   1. generateInvoicePaymentToken / verifyInvoicePaymentToken helpers
 *   2. GET /api/pay/invoice/:id — 401 with no credentials, 401 with bad/expired
 *      token, 200 with a valid token, 200 with a valid session
 *   3. POST /api/pay/invoice/:id/checkout — same access rules
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHash } from "crypto";

// ---------------------------------------------------------------------------
// Hoisted fixtures
// ---------------------------------------------------------------------------

const {
  INVOICE_ID,
  HOMEOWNER_ID,
  CONTRACTOR_ID,
  CLIENT_ID,
  mockGetCrmInvoice,
  mockGetCrmClient,
  mockGetUser,
  mockGetCompany,
  mockCheckoutSessionsCreate,
  mockClaimInvoiceCheckoutSession,
  mockUnlinkInvoiceFromHomeowner,
  invoiceLinkState,
} = vi.hoisted(() => ({
  INVOICE_ID: "inv-token-001",
  HOMEOWNER_ID: "homeowner-token-001",
  CONTRACTOR_ID: "contractor-token-001",
  CLIENT_ID: "client-token-001",
  mockGetCrmInvoice: vi.fn(),
  mockGetCrmClient: vi.fn(),
  mockGetUser: vi.fn(),
  mockGetCompany: vi.fn(),
  mockCheckoutSessionsCreate: vi.fn(),
  mockUnlinkInvoiceFromHomeowner: vi.fn(),
  invoiceLinkState: {
    homeownerId: "homeowner-token-001" as string | null,
    houseId: "house-token-001" as string | null,
  },
  // Checkout-session idempotency claim — default to "claimed" so this
  // file's existing tests exercise the normal (uncontested) path, same as
  // before the idempotency guard existed.
  mockClaimInvoiceCheckoutSession: vi.fn().mockResolvedValue({ outcome: "claimed" }),
}));

// A valid SHA-256 token stored on the invoice (computed from a known raw value)
const RAW_TOKEN = "a".repeat(64); // deterministic raw token for tests
const HASHED_TOKEN = createHash("sha256").update(RAW_TOKEN).digest("hex");
const FUTURE_EXPIRY = new Date(Date.now() + 72 * 60 * 60 * 1000);
const PAST_EXPIRY = new Date(Date.now() - 1000); // already expired

const BASE_INVOICE = {
  id: INVOICE_ID,
  contractorUserId: CONTRACTOR_ID,
  homeownerId: HOMEOWNER_ID,
  clientId: CLIENT_ID,
  companyId: "company-001",
  invoiceNumber: "INV-001",
  title: "Plumbing Work",
  description: "Fixed the pipes",
  status: "sent",
  lineItems: [],
  subtotal: "100.00",
  taxRate: "0.00",
  taxAmount: "0.00",
  discount: "0.00",
  total: "100.00",
  amountPaid: "0.00",
  amountDue: "100.00",
  dueDate: null,
  sentAt: new Date(),
  viewedAt: null,
  paidAt: null,
  paymentMethod: null,
  paymentNotes: null,
  notes: null,
  termsAndConditions: null,
  houseId: null,
  paymentToken: HASHED_TOKEN,
  paymentTokenExpiresAt: FUTURE_EXPIRY,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const HOMEOWNER_SESSION = {
  isAuthenticated: true,
  user: { id: HOMEOWNER_ID, role: "homeowner", email: "h@test.com", status: "active" },
};
const OTHER_HOMEOWNER_SESSION = {
  isAuthenticated: true,
  user: { id: "homeowner-token-002", role: "homeowner", email: "other@test.com", status: "active" },
};

function sessionForTestUser(who: unknown) {
  if (who === "homeowner") return HOMEOWNER_SESSION;
  if (who === "other-homeowner") return OTHER_HOMEOWNER_SESSION;
  if (who === "contractor" || who === "agent" || who === "admin") {
    return {
      isAuthenticated: true,
      user: { id: `${who}-token-001`, role: who, email: `${who}@test.com`, status: "active" },
    };
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      req.session = sessionForTestUser(req.headers?.["x-test-user"]);
      // else: no session injected — simulates unauthenticated request
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
    this.checkout = { sessions: { create: mockCheckoutSessionsCreate } };
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
      claimInvoiceCheckoutSession: mockClaimInvoiceCheckoutSession,
      unlinkInvoiceFromHomeowner: mockUnlinkInvoiceFromHomeowner,
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
import { registerRoutes, generateInvoicePaymentToken, verifyInvoicePaymentToken, INVOICE_TOKEN_TTL_MS } from "./routes";

let _app: express.Express | null = null;
async function buildApp() {
  if (!_app) {
    _app = express();
    _app.use(express.json());
    // Inject session based on x-test-user header so routes that bypass
    // isAuthenticated middleware (e.g. token-based public endpoints) can still
    // receive an authenticated session in tests.
    _app.use((req: any, _res: any, next: any) => {
      req.session = sessionForTestUser(req.headers?.["x-test-user"]);
      next();
    });
    process.env.STRIPE_SECRET_KEY = "sk_test_invoice_token_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_invoice_token_placeholder";
    await registerRoutes(_app);
  }
  return _app;
}

// ---------------------------------------------------------------------------
// Unit tests: token helpers
// ---------------------------------------------------------------------------

describe("generateInvoicePaymentToken / verifyInvoicePaymentToken helpers", () => {
  it("generates a 64-char hex raw token and a 64-char SHA-256 hex hash", () => {
    const { raw, hash, expiresAt } = generateInvoicePaymentToken();
    expect(raw).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(raw)).toBe(true);
    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    expect(hash).not.toBe(raw);
  });

  it("sets expiresAt approximately INVOICE_TOKEN_TTL_MS in the future", () => {
    const before = Date.now();
    const { expiresAt } = generateInvoicePaymentToken();
    const after = Date.now();
    const expMs = expiresAt.getTime();
    expect(expMs).toBeGreaterThanOrEqual(before + INVOICE_TOKEN_TTL_MS - 100);
    expect(expMs).toBeLessThanOrEqual(after + INVOICE_TOKEN_TTL_MS + 100);
  });

  it("verifies a correct raw token against its stored hash", () => {
    const { raw, hash, expiresAt } = generateInvoicePaymentToken();
    expect(verifyInvoicePaymentToken(raw, hash, expiresAt)).toBe(true);
  });

  it("rejects a wrong raw token", () => {
    const { hash, expiresAt } = generateInvoicePaymentToken();
    expect(verifyInvoicePaymentToken("wrong" + "0".repeat(59), hash, expiresAt)).toBe(false);
  });

  it("rejects an expired token", () => {
    const { raw, hash } = generateInvoicePaymentToken();
    expect(verifyInvoicePaymentToken(raw, hash, PAST_EXPIRY)).toBe(false);
  });

  it("rejects when storedHash is null", () => {
    const { raw } = generateInvoicePaymentToken();
    expect(verifyInvoicePaymentToken(raw, null, FUTURE_EXPIRY)).toBe(false);
  });

  it("rejects when expiresAt is null", () => {
    const { raw, hash } = generateInvoicePaymentToken();
    expect(verifyInvoicePaymentToken(raw, hash, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// GET /api/pay/invoice/:id
// ---------------------------------------------------------------------------

describe("GET /api/pay/invoice/:id — token-based access control", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 404 when invoice does not exist", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue(undefined);
    const res = await request(app).get(`/api/pay/invoice/${INVOICE_ID}`);
    expect(res.status).toBe(404);
  });

  it("returns 401 when no session and no token", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    const res = await request(app).get(`/api/pay/invoice/${INVOICE_ID}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is wrong", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    const res = await request(app)
      .get(`/api/pay/invoice/${INVOICE_ID}`)
      .query({ token: "0".repeat(64) }); // wrong raw token
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is expired", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue({ ...BASE_INVOICE, paymentTokenExpiresAt: PAST_EXPIRY });
    const res = await request(app)
      .get(`/api/pay/invoice/${INVOICE_ID}`)
      .query({ token: RAW_TOKEN });
    expect(res.status).toBe(401);
  });

  it("returns 200 when a valid token is supplied (unauthenticated homeowner via email link)", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    mockGetCrmClient.mockResolvedValue({ id: CLIENT_ID, firstName: "Alice", lastName: "Smith", email: "alice@test.com" });
    mockGetUser.mockResolvedValue({ id: CONTRACTOR_ID, firstName: "Bob", lastName: "Builder", email: "bob@test.com" });
    mockGetCompany.mockResolvedValue({ id: "company-001", name: "Bob's Plumbing", businessLogo: null });
    const res = await request(app)
      .get(`/api/pay/invoice/${INVOICE_ID}`)
      .query({ token: RAW_TOKEN });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(INVOICE_ID);
  });

  it("returns 200 when the authenticated homeowner accesses without a token", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    mockGetCrmClient.mockResolvedValue({ id: CLIENT_ID, firstName: "Alice", lastName: "Smith", email: "alice@test.com" });
    mockGetUser.mockResolvedValue({ id: CONTRACTOR_ID, firstName: "Bob", lastName: "Builder", email: "bob@test.com" });
    mockGetCompany.mockResolvedValue({ id: "company-001", name: "Bob's Plumbing", businessLogo: null });
    const res = await request(app)
      .get(`/api/pay/invoice/${INVOICE_ID}`)
      .set("x-test-user", "homeowner");
    expect(res.status).toBe(200);
  });

  it("returns 401 when invoice has no token stored and caller is unauthenticated", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue({ ...BASE_INVOICE, paymentToken: null, paymentTokenExpiresAt: null });
    const res = await request(app)
      .get(`/api/pay/invoice/${INVOICE_ID}`)
      .query({ token: RAW_TOKEN }); // token supplied but nothing stored on invoice
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/pay/invoice/:id/checkout
// ---------------------------------------------------------------------------

describe("POST /api/pay/invoice/:id/checkout — token-based access control", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns 401 when no session and no token", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    const res = await request(app)
      .post(`/api/pay/invoice/${INVOICE_ID}/checkout`)
      .send({ customerEmail: "alice@test.com" });
    expect(res.status).toBe(401);
  });

  it("returns 401 when token is expired", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue({ ...BASE_INVOICE, paymentTokenExpiresAt: PAST_EXPIRY });
    const res = await request(app)
      .post(`/api/pay/invoice/${INVOICE_ID}/checkout`)
      .query({ token: RAW_TOKEN })
      .send({ customerEmail: "alice@test.com" });
    expect(res.status).toBe(401);
  });

  it("proceeds past auth with a valid token (Stripe drives the next response)", async () => {
    const app = await buildApp();
    mockGetCrmInvoice.mockResolvedValue(BASE_INVOICE);
    mockGetCrmClient.mockResolvedValue({ id: CLIENT_ID, firstName: "Alice", lastName: "Smith", email: "alice@test.com" });
    // Company has Stripe Connect set up
    mockGetCompany.mockResolvedValue({
      id: "company-001",
      name: "Bob's Plumbing",
      stripeConnectAccountId: "acct_test",
      stripeChargesEnabled: true,
    });
    mockCheckoutSessionsCreate.mockResolvedValue({ url: "https://checkout.stripe.com/test", id: "cs_test" });

    const res = await request(app)
      .post(`/api/pay/invoice/${INVOICE_ID}/checkout`)
      .query({ token: RAW_TOKEN })
      .send({ customerEmail: "alice@test.com" });
    // 200 means auth passed and Stripe checkout was created
    expect(res.status).toBe(200);
    expect(res.body.url).toContain("checkout.stripe.com");
  });
});

describe("PATCH /api/homeowner/unlink-invoice/:invoiceId — ownership", () => {
  beforeEach(() => {
    invoiceLinkState.homeownerId = HOMEOWNER_ID;
    invoiceLinkState.houseId = "house-token-001";
    mockUnlinkInvoiceFromHomeowner.mockReset().mockImplementation(
      async (invoiceId: string, homeownerId: string) => {
        if (invoiceId !== INVOICE_ID || invoiceLinkState.homeownerId !== homeownerId) {
          return false;
        }
        invoiceLinkState.homeownerId = null;
        invoiceLinkState.houseId = null;
        return true;
      },
    );
  });

  it("allows a homeowner to unlink their own linked invoice", async () => {
    const app = await buildApp();
    const res = await request(app)
      .patch(`/api/homeowner/unlink-invoice/${INVOICE_ID}`)
      .set("x-test-user", "homeowner");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockUnlinkInvoiceFromHomeowner).toHaveBeenCalledWith(INVOICE_ID, HOMEOWNER_ID);
    expect(invoiceLinkState).toEqual({ homeownerId: null, houseId: null });
  });

  it("returns not found when a homeowner tries to unlink another homeowner's invoice", async () => {
    const app = await buildApp();
    const originalLinkage = { ...invoiceLinkState };
    const res = await request(app)
      .patch(`/api/homeowner/unlink-invoice/${INVOICE_ID}`)
      .set("x-test-user", "other-homeowner");

    expect(res.status).toBe(404);
    expect(mockUnlinkInvoiceFromHomeowner).toHaveBeenCalledWith(
      INVOICE_ID,
      OTHER_HOMEOWNER_SESSION.user.id,
    );
    expect(invoiceLinkState).toEqual(originalLinkage);
  });

  it.each(["contractor", "agent", "admin"])(
    "rejects the %s role without changing invoice linkage",
    async (role) => {
      const app = await buildApp();
      const originalLinkage = { ...invoiceLinkState };
      const res = await request(app)
        .patch(`/api/homeowner/unlink-invoice/${INVOICE_ID}`)
        .set("x-test-user", role);

      expect(res.status).toBe(403);
      expect(mockUnlinkInvoiceFromHomeowner).not.toHaveBeenCalled();
      expect(invoiceLinkState).toEqual(originalLinkage);
    },
  );
});
