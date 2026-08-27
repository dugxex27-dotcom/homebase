/**
 * Integration tests for POST /api/crm/webhooks/:integrationId
 *
 * Covers the fix for silently defaulting a lead's name to 'Unknown'/'' when
 * a webhook payload doesn't match any expected name field (first_name /
 * firstName / name). The route now logs a clear warning naming the
 * integration and the actual payload shape so the anomaly is discoverable,
 * instead of leaving no trace.
 */

import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  INTEGRATION_ID,
  mockGetCrmIntegration,
  mockCreateCrmLead,
  mockCreateWebhookLog,
  mockUpdateCrmIntegration,
} = vi.hoisted(() => ({
  INTEGRATION_ID: "crm-integration-001",
  mockGetCrmIntegration: vi.fn(),
  mockCreateCrmLead: vi.fn(),
  mockCreateWebhookLog: vi.fn().mockResolvedValue({ id: "log-1" }),
  mockUpdateCrmIntegration: vi.fn().mockResolvedValue(undefined),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((_req: any, res: any, _next: any) => res.status(401).json({ message: "Unauthorized" })),
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
  return {
    storage: createStorageMock({
      getCrmIntegration: mockGetCrmIntegration,
      createCrmLead: mockCreateCrmLead,
      createWebhookLog: mockCreateWebhookLog,
      updateCrmIntegration: mockUpdateCrmIntegration,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
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

const INTEGRATION_FIXTURE = {
  id: INTEGRATION_ID,
  isActive: true,
  platform: "webhook",
  webhookSecret: null,
  fieldMapping: null,
  contractorUserId: "contractor-1",
  companyId: "company-1",
};

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

describe("POST /api/crm/webhooks/:integrationId — lead name warning on unexpected payload shape", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateWebhookLog.mockResolvedValue({ id: "log-1" });
    mockUpdateCrmIntegration.mockResolvedValue(undefined);
    process.env.STRIPE_SECRET_KEY = "sk_test_crm_webhook_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_crm_webhook_placeholder";
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("logs a warning naming the integration and payload shape when no name field is present, but still creates the lead as 'Unknown'", async () => {
    const app = await buildApp();
    mockGetCrmIntegration.mockResolvedValue(INTEGRATION_FIXTURE);
    mockCreateCrmLead.mockResolvedValue({ id: "lead-1", firstName: "Unknown", lastName: "" });

    const weirdPayload = { unexpected_field: "value", another_field: 123 };

    const res = await request(app)
      .post(`/api/crm/webhooks/${INTEGRATION_ID}`)
      .send(weirdPayload);

    expect(res.status).toBe(201);
    expect(mockCreateCrmLead).toHaveBeenCalledOnce();
    expect(mockCreateCrmLead.mock.calls[0][0]).toMatchObject({ firstName: "Unknown", lastName: "" });

    // A warning was logged, naming the integration and including the actual
    // payload shape (not just a silent default with no trace).
    expect(warnSpy).toHaveBeenCalledOnce();
    const warningMessage = warnSpy.mock.calls[0][0] as string;
    expect(warningMessage).toContain(INTEGRATION_ID);
    expect(warningMessage).toContain("unexpected_field");
    expect(warningMessage).toContain("another_field");
  });

  it("does NOT log a warning when the payload has an expected name field", async () => {
    const app = await buildApp();
    mockGetCrmIntegration.mockResolvedValue(INTEGRATION_FIXTURE);
    mockCreateCrmLead.mockResolvedValue({ id: "lead-2", firstName: "Jane", lastName: "Doe" });

    const res = await request(app)
      .post(`/api/crm/webhooks/${INTEGRATION_ID}`)
      .send({ first_name: "Jane", last_name: "Doe", email: "jane@example.com" });

    expect(res.status).toBe(201);
    expect(mockCreateCrmLead.mock.calls[0][0]).toMatchObject({ firstName: "Jane", lastName: "Doe" });
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("does NOT log a warning when the name comes from a combined 'name' field", async () => {
    const app = await buildApp();
    mockGetCrmIntegration.mockResolvedValue(INTEGRATION_FIXTURE);
    mockCreateCrmLead.mockResolvedValue({ id: "lead-3", firstName: "John", lastName: "Smith" });

    const res = await request(app)
      .post(`/api/crm/webhooks/${INTEGRATION_ID}`)
      .send({ name: "John Smith", email: "john@example.com" });

    expect(res.status).toBe(201);
    expect(mockCreateCrmLead.mock.calls[0][0]).toMatchObject({ firstName: "John", lastName: "Smith" });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
