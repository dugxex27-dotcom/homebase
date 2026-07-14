/**
 * HTTP-level integration tests for the OAuth-authenticated suspension bypass
 * fix on the blanket `/api/contractor` and `/api/crm` guards.
 *
 * Background
 * ──────────
 * Both guards originally short-circuited with `return next()` for any request
 * where `req.session?.isAuthenticated` was falsy — including requests from a
 * fully OAuth-authenticated (Replit OIDC / passport) user who simply hasn't
 * hit `/api/auth/user` yet (which is what lazily populates
 * `req.session.user`/`req.session.isAuthenticated`). A suspended contractor
 * team member authenticated purely via OAuth could therefore call
 * `/api/contractor/*` or `/api/crm/*` directly and bypass suspension entirely.
 *
 * The fix adds an OAuth fallback branch that checks the shared
 * `isOAuthUserSuspended()` helper (the same blocklist + DB re-check
 * `requireNotSuspended()` uses) before falling through to `next()`.
 *
 * These tests exercise the real `registerRoutes` wiring with `../replitAuth`
 * only partially mocked (auth guards are no-ops, but `isOAuthUserSuspended`
 * and `suspendedUserIds` are the real interesting bits under test).
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

const { mockIsOAuthUserSuspended } = vi.hoisted(() => ({
  mockIsOAuthUserSuspended: vi.fn().mockResolvedValue(false),
}));

// ---------------------------------------------------------------------------
// Module mocks — hoisted before all imports by Vitest
// ---------------------------------------------------------------------------

vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn() };
  }
  return { default: MockStripe };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return { storage: createStorageMock({ getCompanyLeads: vi.fn().mockResolvedValue([]) }) };
});

vi.mock("../replitAuth", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn((_req: any, _res: any, next: any) => next()),
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
  requireCompanyRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireCompanyRoleAny: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  requireDivisionAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireBulkImport: vi.fn((_req: any, _res: any, next: any) => next()),
  requireApiAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireNotSuspended: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  requireSameCompany: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  requireActiveAccountFresh: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  invalidateActiveStatusCache: vi.fn(),
  suspendedUserIds: new Set<string>(),
  invalidateUserSessions: vi.fn(),
  refreshUserSessionRole: vi.fn(),
  validateHouseOwnership: vi.fn().mockResolvedValue(true),
  validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
  validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
  validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
  requireResourceOwnership: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  isOAuthUserSuspended: mockIsOAuthUserSuspended,
}));

vi.mock("../googleAuth", () => ({
  setupGoogleAuth: vi.fn(),
}));

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
  emailService: {
    send: vi.fn().mockResolvedValue(undefined),
    sendTechInviteEmail: vi.fn().mockResolvedValue(undefined),
    sendAffiliatePayoutFailureEmail: vi.fn().mockResolvedValue(undefined),
    sendAffiliatePayoutFailureAdminAlert: vi.fn().mockResolvedValue(undefined),
  },
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

vi.mock("../db", () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn(),
  },
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
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
  AuditEventTypes: { ADMIN_USER_MODIFY: "admin_user_modify" },
  AuditEventCategories: {},
  AuditSeverity: {},
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    logAuth: vi.fn().mockResolvedValue(undefined),
    logSecurity: vi.fn().mockResolvedValue(undefined),
    logRequest: vi.fn().mockResolvedValue(undefined),
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

// ---------------------------------------------------------------------------
// Test imports — placed AFTER vi.mock() blocks so mocks are active
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

const OAUTH_USER_ID = "oauth-contractor-tech-001";

/**
 * Build an Express app where the request is authenticated purely via the
 * OAuth (Replit OIDC/passport) path — no `req.session.isAuthenticated` /
 * `req.session.user` populated, simulating a user who has not yet hit
 * `/api/auth/user` to lazily populate their session-derived user object.
 */
async function buildOAuthOnlyApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    req.session = {}; // no isAuthenticated / user — pure OAuth path
    req.user = {
      claims: { sub: OAUTH_USER_ID },
      access_token: "tok",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    req.isAuthenticated = () => true;
    next();
  });

  await registerRoutes(app);
  return app;
}

/** Build an app simulating a fully unauthenticated request (no session, no OAuth user). */
async function buildUnauthenticatedApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    req.session = {};
    req.isAuthenticated = () => false;
    next();
  });

  await registerRoutes(app);
  return app;
}

describe("OAuth-authenticated suspension bypass — /api/contractor/* blanket guard", () => {
  beforeEach(() => {
    mockIsOAuthUserSuspended.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for a suspended OAuth-authenticated user hitting a /api/contractor/* route directly", async () => {
    mockIsOAuthUserSuspended.mockResolvedValue(true);
    const app = await buildOAuthOnlyApp();

    const res = await request(app).get("/api/contractor/team");

    expect(mockIsOAuthUserSuspended).toHaveBeenCalledWith(OAUTH_USER_ID);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("does not short-circuit an active OAuth-authenticated user (falls through to next handlers)", async () => {
    mockIsOAuthUserSuspended.mockResolvedValue(false);
    const app = await buildOAuthOnlyApp();

    const res = await request(app).get("/api/contractor/team");

    expect(mockIsOAuthUserSuspended).toHaveBeenCalledWith(OAUTH_USER_ID);
    // Guard passed through — whatever status the downstream route returns,
    // it must NOT be the suspension 401.
    expect(res.status).not.toBe(401);
  });

  it("does not query suspension status for a fully unauthenticated request (fails open to downstream auth middleware)", async () => {
    const app = await buildUnauthenticatedApp();

    await request(app).get("/api/contractor/team");

    expect(mockIsOAuthUserSuspended).not.toHaveBeenCalled();
  });
});

describe("OAuth-authenticated suspension bypass — /api/crm/* blanket guard", () => {
  beforeEach(() => {
    mockIsOAuthUserSuspended.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for a suspended OAuth-authenticated user hitting a /api/crm/* route directly", async () => {
    mockIsOAuthUserSuspended.mockResolvedValue(true);
    const app = await buildOAuthOnlyApp();

    const res = await request(app).get("/api/crm/leads");

    expect(mockIsOAuthUserSuspended).toHaveBeenCalledWith(OAUTH_USER_ID);
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("does not short-circuit an active OAuth-authenticated user (falls through to next handlers)", async () => {
    mockIsOAuthUserSuspended.mockResolvedValue(false);
    const app = await buildOAuthOnlyApp();

    const res = await request(app).get("/api/crm/leads");

    expect(mockIsOAuthUserSuspended).toHaveBeenCalledWith(OAUTH_USER_ID);
    // Guard passed through — whatever downstream status is returned (this route
    // has further checks like an active-subscription requirement), it must NOT
    // be our suspension-guard's 401 message.
    expect(res.body?.message).not.toMatch(/Account suspended/i);
  });

  it("does not query suspension status for a fully unauthenticated request (fails open to downstream auth middleware)", async () => {
    const app = await buildUnauthenticatedApp();

    await request(app).get("/api/crm/leads");

    expect(mockIsOAuthUserSuspended).not.toHaveBeenCalled();
  });
});
