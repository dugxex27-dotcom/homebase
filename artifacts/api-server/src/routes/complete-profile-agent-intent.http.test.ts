/**
 * HTTP-level integration tests for POST /api/auth/complete-profile with
 * intent=agent (i.e. role: 'agent' in the body).
 *
 * These tests confirm that the profile-completion step which follows the
 * /auth/google/callback → /complete-profile?intent=agent redirect correctly
 * finishes role assignment — the critical handoff that had no test coverage.
 *
 * Cases covered:
 *   1. Unauthenticated request              → 401
 *   2. Missing zipCode                      → 400
 *   3. Missing role                         → 400
 *   4. Invalid role value                   → 400
 *   5. Valid agent intent (role='agent')    → role set to 'agent'; 200
 *   6. Role upgrade: homeowner → agent      → upsertUser called with role: 'agent'
 *
 * Strategy
 * ────────
 * The route checks req.session.isAuthenticated / req.session.user directly
 * (no isAuthenticated middleware wrapper), so we inject the session through a
 * pre-middleware added before registerRoutes.  All heavy imports used by the
 * routes monolith are mocked to keep the test hermetic.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted fixtures
// ---------------------------------------------------------------------------

const {
  USER_ID,
  mockGetUser,
  mockUpsertUser,
} = vi.hoisted(() => ({
  USER_ID: "google_ag_profile_001",
  mockGetUser: vi.fn(),
  mockUpsertUser: vi.fn(),
}));

const BASE_USER = {
  id: USER_ID,
  email: "agentprofile@example.com",
  role: "homeowner" as const,
  zipCode: null,
  firstName: "Alex",
  lastName: "Rivera",
  profileImageUrl: null,
  status: "active",
};

const AUTHED_SESSION = {
  isAuthenticated: true,
  user: BASE_USER,
};

// ---------------------------------------------------------------------------
// Module mocks — must come before all imports
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((_req: any, res: any, _next: any) => {
      return res.status(401).json({ message: "Unauthorized" });
    }),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    evictStatusCache: vi.fn(),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));

vi.mock("ws", () => ({
  WebSocketServer: class {
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
  ObjectStorageService: class {
    upload = vi.fn();
    download = vi.fn();
    delete = vi.fn();
    getSignedUrl = vi.fn();
    getUploadUrl = vi.fn();
    deleteObject = vi.fn();
    getObject = vi.fn();
    putObject = vi.fn();
    listObjects = vi.fn();
    searchPublicObject = vi.fn().mockResolvedValue(null);
    downloadObject = vi.fn().mockResolvedValue(undefined);
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
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
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
      getUser: mockGetUser,
      upsertUser: mockUpsertUser,
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
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({ returning: vi.fn().mockResolvedValue([]) }),
      }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// Imports — after mocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build a minimal Express app with the full route tree registered.
 * A pre-middleware injects req.session when the x-test-user header is "agent".
 */
async function buildApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    if (req.headers?.["x-test-user"] === "agent") {
      req.session = { ...AUTHED_SESSION };
    } else {
      req.session = { isAuthenticated: false, user: null };
    }
    next();
  });

  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/auth/complete-profile — agent intent role assignment", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when the request has no authenticated session", async () => {
    const app = await buildApp();

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .send({ zipCode: "90210", role: "agent" });

    expect(res.status).toBe(401);
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("returns 400 when zipCode is missing", async () => {
    const app = await buildApp();

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("x-test-user", "agent")
      .send({ role: "agent" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing required fields/i);
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("returns 400 when role is missing", async () => {
    const app = await buildApp();

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("x-test-user", "agent")
      .send({ zipCode: "90210" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/missing required fields/i);
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("returns 400 when role is an unrecognised value", async () => {
    const app = await buildApp();

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("x-test-user", "agent")
      .send({ zipCode: "90210", role: "superadmin" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid role/i);
    expect(mockUpsertUser).not.toHaveBeenCalled();
  });

  it("upgrades a homeowner to agent and redirects to /agent-dashboard on success", async () => {
    const updatedUser = { ...BASE_USER, zipCode: "90210", role: "agent" as const };
    mockGetUser.mockResolvedValue(BASE_USER);
    mockUpsertUser.mockResolvedValue(updatedUser);

    const app = await buildApp();

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("x-test-user", "agent")
      .send({ zipCode: "90210", role: "agent" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.role).toBe("agent");
    // The response must carry the explicit navigation contract so the client
    // knows where to send the user after profile completion.
    expect(res.body.redirectTo).toBe("/agent-dashboard");
    expect(mockGetUser).toHaveBeenCalledWith(USER_ID);
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: "agent", zipCode: "90210" }),
    );
  });

  it("sets role to 'agent' and returns /agent-dashboard regardless of the user's prior role", async () => {
    const homeowner = { ...BASE_USER, role: "homeowner" as const, zipCode: null };
    const upgraded = { ...homeowner, zipCode: "10001", role: "agent" as const };
    mockGetUser.mockResolvedValue(homeowner);
    mockUpsertUser.mockResolvedValue(upgraded);

    const app = await buildApp();

    const res = await request(app)
      .post("/api/auth/complete-profile")
      .set("x-test-user", "agent")
      .send({ zipCode: "10001", role: "agent" });

    expect(res.status).toBe(200);
    expect(res.body.role).toBe("agent");
    expect(res.body.redirectTo).toBe("/agent-dashboard");
    expect(mockUpsertUser).toHaveBeenCalledWith(
      expect.objectContaining({ role: "agent", zipCode: "10001" }),
    );
  });
});
