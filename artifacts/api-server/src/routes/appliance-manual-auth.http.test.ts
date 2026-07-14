/**
 * HTTP-level integration tests: PATCH/DELETE /api/appliance-manuals/:id must
 * require authentication and enforce ownership of the manual's parent
 * appliance's house, mirroring the pattern used by DELETE /api/appliances/:id.
 *
 * Regression coverage for previously-unauthenticated routes: anyone who
 * guessed or enumerated a manual ID could edit or delete another homeowner's
 * appliance manual without logging in.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  OWNER_ID,
  OTHER_HOMEOWNER_ID,
  HOUSE_ID,
  APPLIANCE_ID,
  MANUAL_ID,
  mockGetHomeApplianceManual,
  mockGetHomeAppliance,
  mockGetHouse,
  mockUpdateHomeApplianceManual,
  mockDeleteHomeApplianceManual,
} = vi.hoisted(() => ({
  OWNER_ID: "homeowner-owner-001",
  OTHER_HOMEOWNER_ID: "homeowner-other-002",
  HOUSE_ID: "house-001",
  APPLIANCE_ID: "appliance-001",
  MANUAL_ID: "manual-001",
  mockGetHomeApplianceManual: vi.fn(),
  mockGetHomeAppliance: vi.fn(),
  mockGetHouse: vi.fn(),
  mockUpdateHomeApplianceManual: vi.fn(),
  mockDeleteHomeApplianceManual: vi.fn(),
}));

const OWNER_SESSION = {
  isAuthenticated: true,
  user: { id: OWNER_ID, email: "owner@test.com", role: "homeowner", status: "active" },
};

// ---------------------------------------------------------------------------
// Module mocks — hoisted before all imports by Vitest
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),

    // isAuthenticated: injects a session from the x-test-user header.
    //   "owner" → authenticated homeowner session
    //   "none"/unset → no session at all (simulates an unauthenticated request)
    isAuthenticated: vi.fn((req: any, res: any, next: any) => {
      const who = req.headers?.["x-test-user"];
      if (who === "owner") {
        req.session = OWNER_SESSION;
        return next();
      }
      return res.status(401).json({ message: "Unauthorized" });
    }),

    // requirePropertyOwner mirrors the real implementation's session check so
    // the "unauthenticated" test case is meaningful even if isAuthenticated
    // were ever removed from the route.
    requirePropertyOwner: vi.fn((req: any, res: any, next: any) => {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      const role = req.session.user.role;
      if (role !== "homeowner" && role !== "contractor") {
        return res.status(403).json({ message: "Forbidden - insufficient permissions" });
      }
      next();
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
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getHomeApplianceManual: mockGetHomeApplianceManual,
      getHomeAppliance: mockGetHomeAppliance,
      getHouse: mockGetHouse,
      updateHomeApplianceManual: mockUpdateHomeApplianceManual,
      deleteHomeApplianceManual: mockDeleteHomeApplianceManual,
    }),
  };
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
        where: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
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

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

describe("PATCH /api/appliance-manuals/:id — auth & ownership", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session is present (unauthenticated)", async () => {
    const app = await buildApp();

    const res = await request(app)
      .patch(`/api/appliance-manuals/${MANUAL_ID}`)
      .send({ url: "https://example.com/manual.pdf" });

    expect(res.status).toBe(401);
    expect(mockUpdateHomeApplianceManual).not.toHaveBeenCalled();
  });

  it("returns 404 when the manual's appliance belongs to a different homeowner's house", async () => {
    const app = await buildApp();
    mockGetHomeApplianceManual.mockResolvedValue({ id: MANUAL_ID, applianceId: APPLIANCE_ID });
    mockGetHomeAppliance.mockResolvedValue({ id: APPLIANCE_ID, houseId: HOUSE_ID });
    mockGetHouse.mockResolvedValue({ id: HOUSE_ID, homeownerId: OTHER_HOMEOWNER_ID });

    const res = await request(app)
      .patch(`/api/appliance-manuals/${MANUAL_ID}`)
      .set("x-test-user", "owner")
      .send({ url: "https://example.com/manual.pdf" });

    expect(res.status).toBe(404);
    expect(mockUpdateHomeApplianceManual).not.toHaveBeenCalled();
  });

  it("returns 404 when the manual's appliance has no houseId (cannot verify ownership)", async () => {
    const app = await buildApp();
    mockGetHomeApplianceManual.mockResolvedValue({ id: MANUAL_ID, applianceId: APPLIANCE_ID });
    mockGetHomeAppliance.mockResolvedValue({ id: APPLIANCE_ID, houseId: null });

    const res = await request(app)
      .patch(`/api/appliance-manuals/${MANUAL_ID}`)
      .set("x-test-user", "owner")
      .send({ url: "https://example.com/manual.pdf" });

    expect(res.status).toBe(404);
    expect(mockUpdateHomeApplianceManual).not.toHaveBeenCalled();
  });

  it("updates the manual when the authenticated user owns the house", async () => {
    const app = await buildApp();
    mockGetHomeApplianceManual.mockResolvedValue({ id: MANUAL_ID, applianceId: APPLIANCE_ID });
    mockGetHomeAppliance.mockResolvedValue({ id: APPLIANCE_ID, houseId: HOUSE_ID });
    mockGetHouse.mockResolvedValue({ id: HOUSE_ID, homeownerId: OWNER_ID });
    mockUpdateHomeApplianceManual.mockResolvedValue({ id: MANUAL_ID, applianceId: APPLIANCE_ID });

    const res = await request(app)
      .patch(`/api/appliance-manuals/${MANUAL_ID}`)
      .set("x-test-user", "owner")
      .send({ url: "https://example.com/manual.pdf" });

    expect(res.status).toBe(200);
    expect(mockUpdateHomeApplianceManual).toHaveBeenCalledWith(
      MANUAL_ID,
      expect.objectContaining({ url: "https://example.com/manual.pdf" })
    );
  });
});

describe("DELETE /api/appliance-manuals/:id — auth & ownership", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session is present (unauthenticated)", async () => {
    const app = await buildApp();

    const res = await request(app).delete(`/api/appliance-manuals/${MANUAL_ID}`);

    expect(res.status).toBe(401);
    expect(mockDeleteHomeApplianceManual).not.toHaveBeenCalled();
  });

  it("returns 404 when the manual's appliance belongs to a different homeowner's house", async () => {
    const app = await buildApp();
    mockGetHomeApplianceManual.mockResolvedValue({ id: MANUAL_ID, applianceId: APPLIANCE_ID });
    mockGetHomeAppliance.mockResolvedValue({ id: APPLIANCE_ID, houseId: HOUSE_ID });
    mockGetHouse.mockResolvedValue({ id: HOUSE_ID, homeownerId: OTHER_HOMEOWNER_ID });

    const res = await request(app)
      .delete(`/api/appliance-manuals/${MANUAL_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(404);
    expect(mockDeleteHomeApplianceManual).not.toHaveBeenCalled();
  });

  it("returns 404 when the manual's appliance has no houseId (cannot verify ownership)", async () => {
    const app = await buildApp();
    mockGetHomeApplianceManual.mockResolvedValue({ id: MANUAL_ID, applianceId: APPLIANCE_ID });
    mockGetHomeAppliance.mockResolvedValue({ id: APPLIANCE_ID, houseId: null });

    const res = await request(app)
      .delete(`/api/appliance-manuals/${MANUAL_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(404);
    expect(mockDeleteHomeApplianceManual).not.toHaveBeenCalled();
  });

  it("returns 404 when the manual itself does not exist", async () => {
    const app = await buildApp();
    mockGetHomeApplianceManual.mockResolvedValue(undefined);

    const res = await request(app)
      .delete(`/api/appliance-manuals/${MANUAL_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(404);
    expect(mockDeleteHomeApplianceManual).not.toHaveBeenCalled();
  });

  it("deletes the manual when the authenticated user owns the house", async () => {
    const app = await buildApp();
    mockGetHomeApplianceManual.mockResolvedValue({ id: MANUAL_ID, applianceId: APPLIANCE_ID });
    mockGetHomeAppliance.mockResolvedValue({ id: APPLIANCE_ID, houseId: HOUSE_ID });
    mockGetHouse.mockResolvedValue({ id: HOUSE_ID, homeownerId: OWNER_ID });
    mockDeleteHomeApplianceManual.mockResolvedValue(true);

    const res = await request(app)
      .delete(`/api/appliance-manuals/${MANUAL_ID}`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(204);
    expect(mockDeleteHomeApplianceManual).toHaveBeenCalledWith(MANUAL_ID);
  });
});
