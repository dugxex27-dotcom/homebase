/**
 * HTTP-level integration tests: service-record GET/PUT/DELETE routes must
 * enforce role-aware ownership — homeowners can only access records via
 * homeownerId, contractors via contractorId, and admins bypass all checks.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted fixtures
// ---------------------------------------------------------------------------

const {
  HOMEOWNER_ID,
  OTHER_HOMEOWNER_ID,
  CONTRACTOR_ID,
  OTHER_CONTRACTOR_ID,
  ADMIN_ID,
  RECORD_ID,
  mockGetUser,
  mockGetServiceRecord,
  mockUpdateServiceRecord,
  mockDeleteServiceRecord,
  mockCheckAndAwardAchievements,
} = vi.hoisted(() => ({
  HOMEOWNER_ID: "homeowner-001",
  OTHER_HOMEOWNER_ID: "homeowner-002",
  CONTRACTOR_ID: "contractor-001",
  OTHER_CONTRACTOR_ID: "contractor-002",
  ADMIN_ID: "admin-001",
  RECORD_ID: "sr-001",
  mockGetServiceRecord: vi.fn(),
  mockUpdateServiceRecord: vi.fn(),
  mockDeleteServiceRecord: vi.fn(),
  mockCheckAndAwardAchievements: vi.fn().mockResolvedValue([]),
  mockGetUser: vi.fn(),
}));

// A service record owned by HOMEOWNER_ID and created by CONTRACTOR_ID
const BASE_RECORD = {
  id: RECORD_ID,
  homeownerId: HOMEOWNER_ID,
  contractorId: CONTRACTOR_ID,
  customerName: "Test User",
  customerAddress: "123 Main St",
  serviceType: "HVAC",
  serviceDescription: "Annual tune-up",
  serviceDate: "2025-01-01",
  cost: "150.00",
  status: "completed",
  materialsUsed: [],
  servicePhotos: [],
  isVisibleToHomeowner: true,
};

// Session factories
const session = (id: string, role: string) => ({
  isAuthenticated: true,
  user: { id, role, email: `${id}@test.com`, status: "active" },
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, res: any, next: any) => {
      const who = req.headers?.["x-test-user"];
      if (who === "homeowner-owner") {
        req.session = session(HOMEOWNER_ID, "homeowner");
        return next();
      }
      if (who === "homeowner-other") {
        req.session = session(OTHER_HOMEOWNER_ID, "homeowner");
        return next();
      }
      if (who === "contractor-owner") {
        req.session = session(CONTRACTOR_ID, "contractor");
        return next();
      }
      if (who === "contractor-other") {
        req.session = session(OTHER_CONTRACTOR_ID, "contractor");
        return next();
      }
      if (who === "admin") {
        req.session = session(ADMIN_ID, "admin");
        return next();
      }
      return res.status(401).json({ message: "Unauthorized" });
    }),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    requireHomeownerSubscription: vi.fn((_req: any, _res: any, next: any) => next()),
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
  emailService: { send: vi.fn().mockResolvedValue(undefined) },
  sendCheckoutFailureEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("../sms-service", () => ({ smsService: { send: vi.fn().mockResolvedValue(undefined) } }));
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
vi.mock("openai", () => ({
  default: class { chat = { completions: { create: vi.fn() } }; },
}));
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = { retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }) };
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
  sessionManager: { createSession: vi.fn(), validateSession: vi.fn(), invalidateSession: vi.fn(), trackRequest: vi.fn() },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  // getUser is called by requireHomeownerSubscription; return a user matching the session role
  const userMap: Record<string, any> = {
    [HOMEOWNER_ID]: { id: HOMEOWNER_ID, role: "homeowner", email: "h@test.com", subscriptionStatus: "active", status: "active" },
    [OTHER_HOMEOWNER_ID]: { id: OTHER_HOMEOWNER_ID, role: "homeowner", email: "h2@test.com", subscriptionStatus: "active", status: "active" },
    [CONTRACTOR_ID]: { id: CONTRACTOR_ID, role: "contractor", email: "c@test.com", subscriptionStatus: "active", status: "active" },
    [OTHER_CONTRACTOR_ID]: { id: OTHER_CONTRACTOR_ID, role: "contractor", email: "c2@test.com", subscriptionStatus: "active", status: "active" },
    [ADMIN_ID]: { id: ADMIN_ID, role: "admin", email: "a@test.com", subscriptionStatus: "active", status: "active" },
  };
  mockGetUser.mockImplementation((id: string) => Promise.resolve(userMap[id] ?? null));
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      getServiceRecord: mockGetServiceRecord,
      updateServiceRecord: mockUpdateServiceRecord,
      deleteServiceRecord: mockDeleteServiceRecord,
      checkAndAwardAchievements: mockCheckAndAwardAchievements,
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
// App factory
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

let _app: express.Express | null = null;
async function buildApp() {
  if (!_app) {
    _app = express();
    _app.use(express.json());
    await registerRoutes(_app);
  }
  return _app;
}

// ---------------------------------------------------------------------------
// GET /api/service-records/:id
// ---------------------------------------------------------------------------

describe("GET /api/service-records/:id — ownership", () => {
  afterEach(() => vi.clearAllMocks());

  it("401 when unauthenticated", async () => {
    const app = await buildApp();
    const res = await request(app).get(`/api/service-records/${RECORD_ID}`);
    expect(res.status).toBe(401);
  });

  it("404 when record does not exist", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(null);
    const res = await request(app)
      .get(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "homeowner-owner");
    expect(res.status).toBe(404);
  });

  it("200 for the homeowner who owns the record", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .get(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "homeowner-owner");
    expect(res.status).toBe(200);
  });

  it("403 for a different homeowner", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .get(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "homeowner-other");
    expect(res.status).toBe(403);
  });

  it("200 for the contractor who created the record", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .get(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "contractor-owner");
    expect(res.status).toBe(200);
  });

  it("403 for a different contractor", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .get(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "contractor-other");
    expect(res.status).toBe(403);
  });

  it("200 for an admin (bypass)", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .get(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "admin");
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// PUT /api/service-records/:id
// ---------------------------------------------------------------------------

describe("PUT /api/service-records/:id — ownership", () => {
  afterEach(() => vi.clearAllMocks());

  it("403 for a different homeowner", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .put(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "homeowner-other")
      .send({ notes: "hacked" });
    expect(res.status).toBe(403);
    expect(mockUpdateServiceRecord).not.toHaveBeenCalled();
  });

  it("403 for a different contractor", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .put(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "contractor-other")
      .send({ notes: "hacked" });
    expect(res.status).toBe(403);
    expect(mockUpdateServiceRecord).not.toHaveBeenCalled();
  });

  it("200 for the owning contractor", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    mockUpdateServiceRecord.mockResolvedValue({ ...BASE_RECORD, notes: "updated" });
    const res = await request(app)
      .put(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "contractor-owner")
      .send({ notes: "updated" });
    expect(res.status).toBe(200);
  });

  it("strips homeownerId/contractorId from non-admin update body", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    mockUpdateServiceRecord.mockResolvedValue(BASE_RECORD);
    await request(app)
      .put(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "contractor-owner")
      .send({ notes: "ok", homeownerId: "hacker", contractorId: "hacker" });
    const callArg = mockUpdateServiceRecord.mock.calls[0][1];
    expect(callArg.homeownerId).toBeUndefined();
    expect(callArg.contractorId).toBeUndefined();
    expect(callArg.notes).toBe("ok");
  });

  it("200 for an admin (bypass)", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    mockUpdateServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .put(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "admin")
      .send({ notes: "admin edit" });
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/service-records/:id
// ---------------------------------------------------------------------------

describe("DELETE /api/service-records/:id — ownership", () => {
  afterEach(() => vi.clearAllMocks());

  it("403 for a different homeowner", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .delete(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "homeowner-other");
    expect(res.status).toBe(403);
    expect(mockDeleteServiceRecord).not.toHaveBeenCalled();
  });

  it("403 for a different contractor", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    const res = await request(app)
      .delete(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "contractor-other");
    expect(res.status).toBe(403);
    expect(mockDeleteServiceRecord).not.toHaveBeenCalled();
  });

  it("200 for the owning homeowner", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    mockDeleteServiceRecord.mockResolvedValue(true);
    const res = await request(app)
      .delete(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "homeowner-owner");
    expect(res.status).toBe(200);
    expect(mockDeleteServiceRecord).toHaveBeenCalledWith(RECORD_ID);
  });

  it("200 for the owning contractor", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    mockDeleteServiceRecord.mockResolvedValue(true);
    const res = await request(app)
      .delete(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "contractor-owner");
    expect(res.status).toBe(200);
  });

  it("200 for an admin (bypass)", async () => {
    const app = await buildApp();
    mockGetServiceRecord.mockResolvedValue(BASE_RECORD);
    mockDeleteServiceRecord.mockResolvedValue(true);
    const res = await request(app)
      .delete(`/api/service-records/${RECORD_ID}`)
      .set("x-test-user", "admin");
    expect(res.status).toBe(200);
  });
});
