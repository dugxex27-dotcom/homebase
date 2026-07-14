/**
 * HTTP-level integration tests for the Home Identification Number routes:
 *   - GET /api/hin/:hin — public lookup, must never leak owner/homeownerId,
 *     only city/state/zipPrefix + decoded metadata.
 *   - GET /api/houses/:id/hin — authenticated, ownership-checked.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

const {
  OWNER_ID,
  OTHER_HOMEOWNER_ID,
  HOUSE_ID,
  mockGetHouse,
  mockLookupByHIN,
} = vi.hoisted(() => ({
  OWNER_ID: "homeowner-owner-001",
  OTHER_HOMEOWNER_ID: "homeowner-other-002",
  HOUSE_ID: "house-001",
  mockGetHouse: vi.fn(),
  mockLookupByHIN: vi.fn(),
}));

const OWNER_SESSION = {
  isAuthenticated: true,
  user: { id: OWNER_ID, email: "owner@test.com", role: "homeowner", status: "active" },
};

const VALID_HIN = "HU741C7879FLYUWCC";

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

vi.mock("../hin-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../hin-service")>();
  return {
    ...actual,
    lookupByHIN: mockLookupByHIN,
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
  return { storage: createStorageMock({ getHouse: mockGetHouse }) };
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

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

async function buildApp() {
  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

describe("GET /api/hin/:hin — public lookup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 404 for an unknown/invalid HIN without requiring auth", async () => {
    const app = await buildApp();
    mockLookupByHIN.mockResolvedValue(null);

    const res = await request(app).get(`/api/hin/${VALID_HIN}`);

    expect(res.status).toBe(404);
  });

  it("returns only city/state/zipPrefix + decoded info — never owner/homeowner data", async () => {
    const app = await buildApp();
    mockLookupByHIN.mockResolvedValue({
      hin: VALID_HIN,
      normalizedAddress: "123 TEST ST, AUSTIN TX 78701",
      city: "AUSTIN",
      state: "TX",
      zip: "78701",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      isNew: false,
    });

    const res = await request(app).get(`/api/hin/${VALID_HIN}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      hin: VALID_HIN,
      address: { city: "AUSTIN", state: "TX", zipPrefix: "787" },
    });
    expect(res.body).not.toHaveProperty("homeownerId");
    expect(res.body).not.toHaveProperty("normalizedAddress");
    expect(res.body.address).not.toHaveProperty("street");
  });
});

describe("GET /api/houses/:id/hin — auth & ownership", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no session is present", async () => {
    const app = await buildApp();

    const res = await request(app).get(`/api/houses/${HOUSE_ID}/hin`);

    expect(res.status).toBe(401);
    expect(mockGetHouse).not.toHaveBeenCalled();
  });

  it("returns 404 when the house belongs to a different homeowner", async () => {
    const app = await buildApp();
    mockGetHouse.mockResolvedValue({ id: HOUSE_ID, homeownerId: OTHER_HOMEOWNER_ID, hin: VALID_HIN });

    const res = await request(app)
      .get(`/api/houses/${HOUSE_ID}/hin`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(404);
  });

  it("returns the HIN when the authenticated user owns the house", async () => {
    const app = await buildApp();
    mockGetHouse.mockResolvedValue({
      id: HOUSE_ID,
      homeownerId: OWNER_ID,
      hin: VALID_HIN,
      hinAssignedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    const res = await request(app)
      .get(`/api/houses/${HOUSE_ID}/hin`)
      .set("x-test-user", "owner");

    expect(res.status).toBe(200);
    expect(res.body.hin).toBe(VALID_HIN);
  });
});
