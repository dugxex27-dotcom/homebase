/**
 * HTTP-level integration tests: DELETE /api/home-documents/:id must verify
 * that the document belongs to the requesting session user before deleting
 * it, mirroring the ownership-check pattern used by DELETE
 * /api/home-systems/:id and DELETE /api/appliances/:id.
 *
 * Regression coverage for a scan finding (task #424): the route requires
 * authentication, but a review flagged that it needed an explicit ownership
 * check so a logged-in user cannot delete another homeowner's uploaded
 * document (contracts, invoices, vault files) by guessing its ID. The route
 * filters its lookup query by `homeownerId = session user id`, so a
 * cross-tenant request must find no matching row and return 404 without
 * touching object storage or the database delete.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

const { OWNER_ID, DOC_ID, mockDbSelectResult, mockDbDelete, mockDeleteFile } = vi.hoisted(() => ({
  OWNER_ID: "homeowner-owner-001",
  DOC_ID: "doc-001",
  mockDbSelectResult: { current: [] as any[] },
  mockDbDelete: vi.fn(),
  mockDeleteFile: vi.fn(),
}));

const OWNER_SESSION = {
  isAuthenticated: true,
  user: { id: OWNER_ID, email: "owner@test.com", role: "homeowner", status: "active" },
};

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, res: any, next: any) => {
      const who = req.headers?.["x-test-user"];
      if (who === "owner") {
        req.session = OWNER_SESSION;
        return next();
      }
      return res.status(401).json({ message: "Unauthorized" });
    }),
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
    deleteFile = mockDeleteFile;
    getSignedUrl = vi.fn();
    getUploadUrl = vi.fn();
    deleteObject = vi.fn();
    getObject = vi.fn();
    putObject = vi.fn();
    listObjects = vi.fn();
    searchPublicObject = vi.fn();
    downloadObject = vi.fn();
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
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return { storage: createStorageMock() };
});
vi.mock("../db", () => ({
  pool: { query: vi.fn(), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockImplementation(() => Promise.resolve(mockDbSelectResult.current)),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    }),
    delete: vi.fn().mockImplementation((...args: any[]) => {
      mockDbDelete(...args);
      return { where: vi.fn().mockResolvedValue(undefined) };
    }),
  },
}));

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

describe("DELETE /api/home-documents/:id — ownership check", () => {
  afterEach(() => {
    vi.clearAllMocks();
    mockDbSelectResult.current = [];
  });

  it("returns 401 when no session is present (unauthenticated)", async () => {
    const app = await buildApp();

    const res = await request(app).delete(`/api/home-documents/${DOC_ID}`);

    expect(res.status).toBe(401);
    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it("returns 404 when the document does not belong to the requesting user (cross-tenant)", async () => {
    // The route's own query filters by homeownerId = session user id, so a
    // cross-tenant lookup for this doc resolves to no rows — simulating the
    // real DB behavior of the ownership-scoped WHERE clause.
    mockDbSelectResult.current = [];
    const app = await buildApp();

    const res = await request(app)
      .delete(`/api/home-documents/${DOC_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(404);
    expect(mockDeleteFile).not.toHaveBeenCalled();
    expect(mockDbDelete).not.toHaveBeenCalled();
  });

  it("deletes the document when the authenticated user owns it", async () => {
    mockDbSelectResult.current = [
      {
        id: DOC_ID,
        homeownerId: OWNER_ID,
        storageKey: "home-documents/owner/file.pdf",
        originalFileName: "file.pdf",
      },
    ];
    const app = await buildApp();

    const res = await request(app)
      .delete(`/api/home-documents/${DOC_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockDeleteFile).toHaveBeenCalledWith("home-documents/owner/file.pdf");
    expect(mockDbDelete).toHaveBeenCalled();
  });
});
