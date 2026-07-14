/**
 * HTTP-level integration tests: checkActorActiveGuard wiring for the
 * team-management routes that perform a fresh DB actor-status lookup to close
 * the stale-session race window.
 *
 * Routes under test:
 *   PATCH  /api/contractor/team/:userId/suspend
 *   PATCH  /api/contractor/team/:userId/reactivate
 *   POST   /api/contractor/team/:userId/resend-invite
 *   DELETE /api/contractor/team/:userId/invite
 *   GET    /api/contractor/team                    (member list — includes pending invites;
 *                                                    there is no separate /team/invites route)
 *   GET    /api/contractor/team/audit-log
 *   GET    /api/contractor/team/:userId/audit-log
 *
 * Strategy
 * ────────
 * 1. All heavy dependencies (DB, Stripe, auth, email, etc.) are module-mocked
 *    so the test is self-contained and fast.
 * 2. Session data is injected via a middleware added before `registerRoutes` so
 *    the session shows the actor as 'active' (simulating a stale cookie).
 * 3. The hoisted `mockDbLimit` controls what the DB returns for the actor-status
 *    query (the first `.limit(1)` call in each handler).
 * 4. Suspended actor → expects 403.  Active actor → expects the guard to pass
 *    (handler proceeds; target-user not found → 404, confirming we got past the guard).
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared mock functions available inside vi.mock() factories
// ---------------------------------------------------------------------------

const {
  mockDbLimit,
  mockGetRecentStripeProcessedEventIds,
} = vi.hoisted(() => ({
  mockDbLimit: vi.fn().mockResolvedValue([]),
  mockGetRecentStripeProcessedEventIds: vi
    .fn()
    .mockResolvedValue(new Map<string, number>()),
}));

// ---------------------------------------------------------------------------
// Module mocks — hoisted before all imports by Vitest
// ---------------------------------------------------------------------------

vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn() };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({
        id: "acct_test",
        charges_enabled: true,
        payouts_enabled: true,
        country: "US",
      }),
    };
    this.subscriptions = {
      retrieve: vi.fn().mockResolvedValue({
        status: "active",
        items: { data: [] },
      }),
    };
    this.subscriptionItems = {
      createUsageRecord: vi.fn().mockResolvedValue({}),
    };
  }
  return { default: MockStripe };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getRecentStripeProcessedEventIds: mockGetRecentStripeProcessedEventIds,
    }),
  };
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
  suspendedUserIds: new Set<string>(),
  invalidateUserSessions: vi.fn(),
  refreshUserSessionRole: vi.fn(),
  requireActiveAccountFresh: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  invalidateActiveStatusCache: vi.fn(),
  evictStatusCache: vi.fn(),
  validateHouseOwnership: vi.fn().mockResolvedValue(true),
  validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
  validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
  validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
  requireResourceOwnership: vi.fn(
    () => (_req: any, _res: any, next: any) => next(),
  ),
  isOAuthUserSuspended: vi.fn().mockResolvedValue(false),
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

/**
 * DB mock — the key mock for these tests.
 *
 * The actor-guard query uses: db.select({…}).from(…).where(…).limit(1)
 * `mockDbLimit` is the hoisted fn that controls what this returns.
 *
 * Default return value: [] (no rows — downstream target-user lookups return
 * "not found", producing a 404 which proves the actor guard was passed).
 *
 * Per-test overrides via mockResolvedValueOnce allow the first limit() call
 * (the actor-status lookup) to return a specific status value.
 */
vi.mock("../db", () => ({
  pool: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    end: vi.fn(),
  },
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: mockDbLimit,
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

// ---------------------------------------------------------------------------
// Test constants
// ---------------------------------------------------------------------------

const ACTOR_ID = "actor-admin-001";
const COMPANY_ID = "company-test-001";
const TARGET_ID = "target-tech-001";

/**
 * Build an Express app with session data injected for the acting admin user.
 * The session reports the actor as 'active' — simulating a valid but stale
 * session cookie that has not yet picked up the DB suspension.
 */
async function buildApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  // Inject a session that looks like an active admin/owner — this passes all
  // session-level auth gates (isAuthenticated, requireNotSuspended, requireCompanyRole).
  // The route then re-checks the actor's status directly from the DB via
  // checkActorActiveGuard — that is the check under test.
  app.use((req: any, _res, next) => {
    req.session = {
      isAuthenticated: true,
      user: {
        id: ACTOR_ID,
        role: "contractor",
        companyId: COMPANY_ID,
        companyRole: "owner",
        status: "active", // stale — DB may say 'suspended'
        email: "actor@example.com",
        firstName: "Actor",
        lastName: "Admin",
      },
    };
    req.sessionStore = { all: null }; // satisfies invalidateUserSessions guard
    next();
  });

  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("checkActorActiveGuard — PATCH /api/contractor/team/:userId/suspend", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    // The first DB limit() call is the actor-status lookup — return 'suspended'
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_ID}/suspend`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    // Actor status is 'active' — guard passes.  Second call is the fresh
    // requestor-role lookup (demotion guard) — return 'owner' to match the
    // session so it doesn't short-circuit with 403.  Target user not
    // found → 404.
    mockDbLimit
      .mockResolvedValueOnce([{ status: "active" }])
      .mockResolvedValueOnce([{ companyRole: "owner" }]);

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_ID}/suspend`)
      .send({});

    // Guard passed — 404 because target user is not found in mocked DB
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("checkActorActiveGuard — PATCH /api/contractor/team/:userId/reactivate", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_ID}/reactivate`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    // Second call is the fresh requestor-role lookup (demotion guard) —
    // return 'owner' to match the session so it doesn't short-circuit with 403.
    mockDbLimit
      .mockResolvedValueOnce([{ status: "active" }])
      .mockResolvedValueOnce([{ companyRole: "owner" }]);

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_ID}/reactivate`)
      .send({});

    // Guard passed — 404 because target user is not found in mocked DB
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("checkActorActiveGuard — POST /api/contractor/team/:userId/resend-invite", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app)
      .post(`/api/contractor/team/${TARGET_ID}/resend-invite`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    // First call: actor-status lookup returns 'active'. Second call: the
    // demotion-guard companyRole re-check — return 'admin' so it passes.
    // Third call: target tech user lookup — return [] (not found) to prove
    // we got past both guards.
    mockDbLimit
      .mockResolvedValueOnce([{ status: "active" }])
      .mockResolvedValueOnce([{ companyRole: "admin" }])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .post(`/api/contractor/team/${TARGET_ID}/resend-invite`)
      .send({});

    // Guard passed — 404 because target tech user is not found in mocked DB
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("checkActorActiveGuard — PATCH /api/contractor/team/:userId (role-change)", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    // The first DB limit() call is the actor-status lookup — return 'suspended'
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_ID}`)
      .send({ firstName: "New" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    // First call: actor-status lookup returns 'active'. Second call: the
    // demotion-guard companyRole re-check — return 'admin' so it passes.
    // Third call: target team member lookup — return [] (not found) to prove
    // we got past both guards.
    mockDbLimit
      .mockResolvedValueOnce([{ status: "active" }])
      .mockResolvedValueOnce([{ companyRole: "admin" }])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_ID}`)
      .send({ firstName: "New" });

    // Guard passed — 404 because target team member is not found in mocked DB
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("checkActorActiveGuard — DELETE /api/contractor/team/:userId (remove-member)", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    // The first DB limit() call is the actor-status lookup — return 'suspended'
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app).delete(`/api/contractor/team/${TARGET_ID}`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    // First call: actor-status lookup (also returns companyRole/companyId via
    // the same row shape used by the route). Second call: executeRemoveMember's
    // target-user lookup — return [] (not found) to prove we got past the guard.
    mockDbLimit
      .mockResolvedValueOnce([
        { status: "active", companyRole: "owner", companyId: COMPANY_ID },
      ])
      .mockResolvedValueOnce([]);

    const res = await request(app).delete(`/api/contractor/team/${TARGET_ID}`);

    // Guard passed — 404 because target team member is not found in mocked DB
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

describe("checkActorActiveGuard — DELETE /api/contractor/team/:userId/invite", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_ID}/invite`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    // First call: actor-status lookup returns 'active'. Second call: the
    // demotion-guard companyRole re-check — return 'admin' so it passes.
    // Third call: pending invite target lookup — return [] (not found) to
    // prove we got past both guards.
    mockDbLimit
      .mockResolvedValueOnce([{ status: "active" }])
      .mockResolvedValueOnce([{ companyRole: "admin" }])
      .mockResolvedValueOnce([]);

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_ID}/invite`)
      .send({});

    // Guard passed — 404 because pending invite target is not found in mocked DB
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(404);
  });
});

/**
 * Team read routes. Note: there is no separate GET /api/contractor/team/invites
 * endpoint — pending invites are surfaced as team members with
 * status: 'pending_invite' inside the GET /api/contractor/team response. That
 * route (and both audit-log read routes below) already perform the same
 * fresh DB actor-status lookup as the four mutation routes above, so a stale
 * 'active' session cannot let a DB-suspended admin read team members or
 * their audit history.
 */
describe("checkActorActiveGuard — GET /api/contractor/team (member list, includes pending invites)", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app).get("/api/contractor/team");

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    // Actor status lookup, then company max-seats lookup, then count query,
    // then the team member list query all resolve through the same mocked
    // `.limit()` chain — none of them need to be a real row for the guard
    // itself to be proven; we only assert we did NOT get a 403.
    mockDbLimit.mockResolvedValueOnce([{ status: "active" }]);

    const res = await request(app).get("/api/contractor/team");

    // Guard passed — the mocked DB chain does not fully model the
    // team-list query (groupBy/count), so it 500s downstream of the guard.
    // That 500 (not 403) proves the actor guard let the request through.
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(500);
  });
});

describe("checkActorActiveGuard — GET /api/contractor/team/audit-log (company-wide)", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app).get("/api/contractor/team/audit-log");

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "active" }]);

    const res = await request(app).get("/api/contractor/team/audit-log");

    // Guard passed — the mocked DB chain does not model .orderBy(), so the
    // query 500s downstream of the guard. That 500 (not 403) proves the
    // actor guard let the request through.
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(500);
  });
});

describe("checkActorActiveGuard — GET /api/contractor/team/:userId/audit-log (per-member)", () => {
  let app: express.Express;

  beforeEach(async () => {
    mockGetRecentStripeProcessedEventIds.mockResolvedValue(new Map());
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildApp();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when the DB reports the actor is suspended (stale-session bypass blocked)", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "suspended" }]);

    const res = await request(app).get(`/api/contractor/team/${TARGET_ID}/audit-log`);

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("passes the guard and proceeds when the DB reports the actor is active", async () => {
    mockDbLimit.mockResolvedValueOnce([{ status: "active" }]);

    const res = await request(app).get(`/api/contractor/team/${TARGET_ID}/audit-log`);

    // Guard passed — the mocked DB chain does not model .orderBy(), so the
    // query 500s downstream of the guard. That 500 (not 403) proves the
    // actor guard let the request through.
    expect(res.status).not.toBe(403);
    expect(res.status).toBe(500);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/admin/users/:userId/suspend and /reactivate — non-team-member
// (homeowner / standalone contractor) suspension flow.
//
// These routes are gated by the module-local `requireAdmin` middleware
// (session + ADMIN_EMAILS allow-list), not by company-scoped guards.
// ---------------------------------------------------------------------------

const ADMIN_EMAIL = "site-admin@example.com";

async function buildAdminApp(): Promise<express.Express> {
  const app = express();
  app.use(express.json());

  app.use((req: any, _res, next) => {
    req.session = {
      isAuthenticated: true,
      user: {
        id: "admin-001",
        email: ADMIN_EMAIL,
      },
    };
    req.sessionStore = { all: null };
    next();
  });

  await registerRoutes(app);
  return app;
}

describe("PATCH /api/admin/users/:userId/suspend — homeowner/standalone contractor", () => {
  let app: express.Express;
  const previousAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(async () => {
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildAdminApp();
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = previousAdminEmails;
    vi.clearAllMocks();
  });

  it("returns 401 when the requestor is not an admin", async () => {
    process.env.ADMIN_EMAILS = "someone-else@example.com";
    app = await buildAdminApp();

    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/suspend`)
      .send({});

    expect(res.status).toBe(403);
  });

  it("returns 404 when the target user does not exist", async () => {
    mockDbLimit.mockResolvedValueOnce([]);

    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/suspend`)
      .send({});

    expect(res.status).toBe(404);
  });

  it("returns 400 when the target is a company team member", async () => {
    mockDbLimit.mockResolvedValueOnce([
      { id: TARGET_ID, role: "contractor", companyRole: "tech" },
    ]);

    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/suspend`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/team/i);
  });

  it("suspends a standalone homeowner account", async () => {
    mockDbLimit.mockResolvedValueOnce([
      { id: TARGET_ID, role: "homeowner", companyRole: null, email: "owner@example.com" },
    ]);

    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/suspend`)
      .send({});

    expect(res.status).toBe(200);
  });
});

describe("PATCH /api/admin/users/:userId/reactivate — homeowner/standalone contractor", () => {
  let app: express.Express;
  const previousAdminEmails = process.env.ADMIN_EMAILS;

  beforeEach(async () => {
    process.env.ADMIN_EMAILS = ADMIN_EMAIL;
    mockDbLimit.mockReset().mockResolvedValue([]);
    app = await buildAdminApp();
  });

  afterEach(() => {
    process.env.ADMIN_EMAILS = previousAdminEmails;
    vi.clearAllMocks();
  });

  it("returns 400 when the target is a company team member", async () => {
    mockDbLimit.mockResolvedValueOnce([
      { id: TARGET_ID, role: "contractor", companyRole: "admin" },
    ]);

    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/reactivate`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/team/i);
  });

  it("reactivates a standalone contractor account", async () => {
    mockDbLimit.mockResolvedValueOnce([
      { id: TARGET_ID, role: "contractor", companyRole: null, email: "solo@example.com" },
    ]);

    const res = await request(app)
      .patch(`/api/admin/users/${TARGET_ID}/reactivate`)
      .send({});

    expect(res.status).toBe(200);
  });
});
