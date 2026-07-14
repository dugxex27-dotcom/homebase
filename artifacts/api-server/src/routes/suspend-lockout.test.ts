/**
 * Route integration tests — boot real registerRoutes with mocked heavy deps.
 *
 * Verifies that the actual PATCH /suspend and DELETE /remove route handlers
 * fire both side-effects that produce immediate lockout:
 *   1. suspendedUserIds.add(userId)  — in-memory blocklist updated
 *   2. invalidateUserSessions(...)   — session-destroy path called with correct userId
 *
 * Then verifies the blocked user's subsequent authenticated request returns 401.
 *
 * Unit-level tests for invalidateUserSessions and requireNotSuspended middleware
 * live in suspend-lockout-unit.test.ts (no vi.mock of replitAuth).
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared state visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  sharedSuspendedUserIds,
  mockInvalidateUserSessions,
  ADMIN_USER_ID,
  TARGET_USER_ID,
  COMPANY_ID,
  mockDbSelect,
  mockDbUpdate,
} = vi.hoisted(() => {
  const ADMIN_USER_ID = "admin-owner-001";
  const TARGET_USER_ID = "tech-user-001";
  const COMPANY_ID = "company-001";
  const sharedSuspendedUserIds = new Set<string>();

  const mockDbSelect = vi.fn();
  const mockDbUpdate = vi.fn();

  return {
    sharedSuspendedUserIds,
    mockInvalidateUserSessions: vi.fn(),
    ADMIN_USER_ID,
    TARGET_USER_ID,
    COMPANY_ID,
    mockDbSelect,
    mockDbUpdate,
  };
});

// Shared user fixtures referenced inside vi.mock() closures
const ADMIN_SESSION = {
  isAuthenticated: true,
  user: {
    id: "admin-owner-001",
    email: "owner@company.test",
    companyId: "company-001",
    companyRole: "owner",
    status: "active",
    firstName: "Admin",
    lastName: "Owner",
  },
};
const TARGET_SESSION = {
  isAuthenticated: true,
  user: {
    id: "tech-user-001",
    email: "tech@company.test",
    companyId: "company-001",
    companyRole: "tech",
    status: "active",
    firstName: "Tech",
    lastName: "User",
  },
};

// ---------------------------------------------------------------------------
// Module mocks — hoisted before all imports by Vitest
// ---------------------------------------------------------------------------

// Partial mock: spread the real module so any future new replitAuth exports
// don't silently break the test (e.g. if routes.ts starts using a new function
// that we forgot to stub here).  We only override the functions that need to
// behave differently inside the test environment.
vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,

    setupAuth: vi.fn().mockResolvedValue(undefined),

    // isAuthenticated: injects session from x-test-user header
    //   "target" → suspended tech user session
    //   anything else → admin/owner session
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      const who = req.headers?.["x-test-user"] ?? "admin";
      req.session = who === "target" ? TARGET_SESSION : ADMIN_SESSION;
      next();
    }),

    // requireNotSuspended: checks our sharedSuspendedUserIds Set so lockout
    // tests work without needing a real DB or TTL cache.
    requireNotSuspended: vi.fn(() => (req: any, res: any, next: any) => {
      const user = req.session?.user;
      if (!user) return res.status(401).json({ message: "Unauthorized" });
      if (
        ["suspended", "removed", "pending_invite"].includes(user.status) ||
        sharedSuspendedUserIds.has(user.id)
      ) {
        return res
          .status(401)
          .json({ message: "Account suspended. Contact your company administrator." });
      }
      next();
    }),

    // requireActiveAccountFresh: no-op pass-through — not under test here.
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

    // The shared Set and spy — routes.ts imports and mutates these directly.
    suspendedUserIds: sharedSuspendedUserIds,
    invalidateUserSessions: mockInvalidateUserSessions,
    evictStatusCache: vi.fn(),
    refreshUserSessionRole: vi.fn(),
    invalidateActiveStatusCache: vi.fn(),
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
  AuditEventTypes: { ADMIN_USER_MODIFY: "admin.user.modify", SECURITY_SCAN: "security.scan" },
  AuditEventCategories: {},
  AuditSeverity: {},
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    logAuth: vi.fn(),
    logSecurity: vi.fn(),
    logRequest: vi.fn(),
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
    select: mockDbSelect,
    update: mockDbUpdate,
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// Imports — placed AFTER vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import { storage } from "../storage";

// ---------------------------------------------------------------------------
// DB mock helpers — drizzle-style chained query builders
// ---------------------------------------------------------------------------

const DEFAULT_TARGET_USER = {
  id: TARGET_USER_ID,
  email: "tech@company.test",
  companyId: COMPANY_ID,
  companyRole: "tech",
  status: "active",
  firstName: "Tech",
  lastName: "User",
  inviteExpiresAt: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

/** Returns a drizzle-style select chain that resolves to `rows` on .limit() */
function makeSelectChain(rows: any[]) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
        groupBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            offset: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
    }),
  };
}

/** Returns a drizzle-style update chain that resolves on .where() */
function makeUpdateChain() {
  return {
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

/**
 * Configure DB mock for the suspend route (PATCH /api/contractor/team/:userId/suspend).
 * The handler makes 3 sequential selects before the update:
 *   1st select → actor status check (in route handler)          → active
 *   2nd select → requestor role check (verifyRequestorRoleFromDb) → owner
 *   3rd select → target user lookup (in route handler)           → tech user
 *   update     → success
 */
function configureDbForSuspend(targetUser = DEFAULT_TARGET_USER) {
  mockDbSelect
    .mockReturnValueOnce(makeSelectChain([{ status: "active" }]))        // 1: actor status
    .mockReturnValueOnce(makeSelectChain([{ companyRole: "owner" }]))    // 2: requestor role
    .mockReturnValueOnce(makeSelectChain([targetUser]));                 // 3: target user
  mockDbUpdate.mockReturnValue(makeUpdateChain());
}

/**
 * Configure DB mock for the remove route (DELETE /api/contractor/team/:userId).
 *
 * The handler (post-refactor) makes exactly 2 sequential selects:
 *   1st select → combined actor check (status + companyRole + companyId in one query)
 *   2nd select → target user lookup inside executeRemoveMember
 *   Tech target → no 3rd admin-count query (only fires for admin/owner targets)
 *   update     → success (inside executeRemoveMember)
 *
 * The first row MUST include all three fields the handler reads from actorRow
 * (status, companyRole, companyId).  Missing fields default to null which
 * causes executeRemoveMember to return 'unauthorized' → 403.
 */
function configureDbForRemove(targetUser = DEFAULT_TARGET_USER) {
  mockDbSelect
    .mockReturnValueOnce(makeSelectChain([{          // 1: combined actor row
      status: "active",
      companyRole: "owner",
      companyId: COMPANY_ID,
    }]))
    .mockReturnValueOnce(makeSelectChain([targetUser])); // 2: target user
  mockDbUpdate.mockReturnValue(makeUpdateChain());
}

const DEFAULT_PENDING_INVITE_USER = {
  ...DEFAULT_TARGET_USER,
  status: "pending_invite",
  inviteToken: "test-invite-token",
  inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
};

/**
 * Configure DB mock for the invite-cancel route
 * (DELETE /api/contractor/team/:userId/invite).
 *
 * The handler makes 3 sequential selects before the update:
 *   1st select → actor status check (in route handler)          → active
 *   2nd select → requestor role check (verifyRequestorRoleFromDb) → owner
 *   3rd select → pending-invite target user lookup (in route handler)
 *   update     → success
 */
function configureDbForInviteCancel(targetUser = DEFAULT_PENDING_INVITE_USER) {
  mockDbSelect
    .mockReturnValueOnce(makeSelectChain([{ status: "active" }]))     // 1: actor status
    .mockReturnValueOnce(makeSelectChain([{ companyRole: "owner" }])) // 2: requestor role
    .mockReturnValueOnce(makeSelectChain([targetUser]));               // 3: pending invite target
  mockDbUpdate.mockReturnValue(makeUpdateChain());
}

// ---------------------------------------------------------------------------
// PATCH /api/contractor/team/:userId/suspend — route-level integration
// ---------------------------------------------------------------------------

describe("PATCH /api/contractor/team/:userId/suspend — route-level wiring", () => {
  let app: express.Express;
  let addSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockInvalidateUserSessions.mockClear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    addSpy = vi.spyOn(sharedSuspendedUserIds, "add");

    process.env.STRIPE_SECRET_KEY = "sk_test_suspend_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_suspend_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  it("responds 200 and returns a suspension confirmation message", async () => {
    configureDbForSuspend();

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_USER_ID}/suspend`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("adds the target user to suspendedUserIds after a successful suspend", async () => {
    configureDbForSuspend();

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_USER_ID}/suspend`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    // Route must have called suspendedUserIds.add(TARGET_USER_ID)
    expect(addSpy).toHaveBeenCalledWith(TARGET_USER_ID);
    expect(sharedSuspendedUserIds.has(TARGET_USER_ID)).toBe(true);
  });

  it("calls invalidateUserSessions with the correct target userId after suspend", async () => {
    configureDbForSuspend();

    const res = await request(app)
      .patch(`/api/contractor/team/${TARGET_USER_ID}/suspend`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    // invalidateUserSessions must be called once with the target user's ID as the second arg.
    // sessionStore and req.log may be undefined in the test environment (no real session
    // middleware); the critical assertion is that the correct userId was passed.
    expect(mockInvalidateUserSessions).toHaveBeenCalledOnce();
    const calledWithUserId = mockInvalidateUserSessions.mock.calls[0][1];
    expect(calledWithUserId).toBe(TARGET_USER_ID);
  });

  it("both side-effects fire together: blocklist add AND session-destroy call", async () => {
    configureDbForSuspend();

    await request(app)
      .patch(`/api/contractor/team/${TARGET_USER_ID}/suspend`)
      .set("x-test-user", "admin");

    // Both must fire — either alone leaves a security gap
    expect(addSpy).toHaveBeenCalledWith(TARGET_USER_ID);
    expect(mockInvalidateUserSessions).toHaveBeenCalledOnce();
  });

  it("blocks the suspended user's subsequent request with 401 immediately after suspend", async () => {
    configureDbForSuspend();

    // Admin suspends the target tech
    const suspendRes = await request(app)
      .patch(`/api/contractor/team/${TARGET_USER_ID}/suspend`)
      .set("x-test-user", "admin");
    expect(suspendRes.status).toBe(200);

    // The target user's ID is now in sharedSuspendedUserIds.
    // Any subsequent request carrying that user's session is immediately rejected
    // by requireNotSuspended — no DB round-trip needed.
    const lockedOutRes = await request(app)
      .patch(`/api/contractor/team/${TARGET_USER_ID}/suspend`)
      .set("x-test-user", "target");
    expect(lockedOutRes.status).toBe(401);
    expect(lockedOutRes.body.message).toMatch(/suspended/i);
  });

  it("does not add an unrelated user to the blocklist", async () => {
    const OTHER_ID = "other-tech-999";
    configureDbForSuspend();

    await request(app)
      .patch(`/api/contractor/team/${TARGET_USER_ID}/suspend`)
      .set("x-test-user", "admin");

    expect(sharedSuspendedUserIds.has(OTHER_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/contractor/team/:userId — route-level integration
// ---------------------------------------------------------------------------

describe("DELETE /api/contractor/team/:userId — route-level wiring", () => {
  let app: express.Express;
  let addSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockInvalidateUserSessions.mockClear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    addSpy = vi.spyOn(sharedSuspendedUserIds, "add");

    process.env.STRIPE_SECRET_KEY = "sk_test_remove_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_remove_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  it("responds 200 and returns a removal confirmation message", async () => {
    configureDbForRemove();

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/removed/i);
  });

  it("adds the removed user to suspendedUserIds after a successful remove", async () => {
    configureDbForRemove();

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    expect(addSpy).toHaveBeenCalledWith(TARGET_USER_ID);
    expect(sharedSuspendedUserIds.has(TARGET_USER_ID)).toBe(true);
  });

  it("calls invalidateUserSessions with the correct target userId after remove", async () => {
    configureDbForRemove();

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    // invalidateUserSessions must be called once; second argument is the userId.
    expect(mockInvalidateUserSessions).toHaveBeenCalledOnce();
    const calledWithUserId = mockInvalidateUserSessions.mock.calls[0][1];
    expect(calledWithUserId).toBe(TARGET_USER_ID);
  });

  it("both side-effects fire together: blocklist add AND session-destroy call", async () => {
    configureDbForRemove();

    await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}`)
      .set("x-test-user", "admin");

    expect(addSpy).toHaveBeenCalledWith(TARGET_USER_ID);
    expect(mockInvalidateUserSessions).toHaveBeenCalledOnce();
  });

  it("blocks the removed user's subsequent request with 401 immediately after removal", async () => {
    configureDbForRemove();

    const removeRes = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}`)
      .set("x-test-user", "admin");
    expect(removeRes.status).toBe(200);

    // Removed user's next request is immediately rejected by requireNotSuspended
    const lockedOutRes = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}`)
      .set("x-test-user", "target");
    expect(lockedOutRes.status).toBe(401);
    expect(lockedOutRes.body.message).toMatch(/suspended/i);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/contractor/team/:userId/invite — route-level integration
// ---------------------------------------------------------------------------

describe("DELETE /api/contractor/team/:userId/invite — route-level wiring", () => {
  let app: express.Express;
  let addSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockInvalidateUserSessions.mockClear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    addSpy = vi.spyOn(sharedSuspendedUserIds, "add");

    process.env.STRIPE_SECRET_KEY = "sk_test_invite_cancel_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_invite_cancel_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  it("responds 200 and returns an invite-cancelled confirmation message", async () => {
    configureDbForInviteCancel();

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}/invite`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/cancel/i);
  });

  it("adds the invited user to suspendedUserIds after a successful cancel", async () => {
    configureDbForInviteCancel();

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}/invite`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    // Route must have called suspendedUserIds.add(TARGET_USER_ID)
    expect(addSpy).toHaveBeenCalledWith(TARGET_USER_ID);
    expect(sharedSuspendedUserIds.has(TARGET_USER_ID)).toBe(true);
  });

  it("calls invalidateUserSessions with the correct target userId after invite cancel", async () => {
    configureDbForInviteCancel();

    const res = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}/invite`)
      .set("x-test-user", "admin");

    expect(res.status).toBe(200);
    expect(mockInvalidateUserSessions).toHaveBeenCalledOnce();
    const calledWithUserId = mockInvalidateUserSessions.mock.calls[0][1];
    expect(calledWithUserId).toBe(TARGET_USER_ID);
  });

  it("both side-effects fire together: blocklist add AND session-destroy call", async () => {
    configureDbForInviteCancel();

    await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}/invite`)
      .set("x-test-user", "admin");

    // Both must fire — either alone leaves a security gap allowing the
    // cancelled invitee to continue using an already-active session.
    expect(addSpy).toHaveBeenCalledWith(TARGET_USER_ID);
    expect(mockInvalidateUserSessions).toHaveBeenCalledOnce();
  });

  it("blocks the invitee's subsequent request with 401 immediately after the invite is cancelled", async () => {
    configureDbForInviteCancel();

    // Admin cancels the invitee's pending invite while the invitee has an
    // active session (e.g. they logged in via a still-valid invite link).
    const cancelRes = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}/invite`)
      .set("x-test-user", "admin");
    expect(cancelRes.status).toBe(200);

    // The invitee's ID is now in sharedSuspendedUserIds. Any subsequent
    // request carrying that user's session is immediately rejected by
    // requireNotSuspended — no DB round-trip needed.
    const lockedOutRes = await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}/invite`)
      .set("x-test-user", "target");
    expect(lockedOutRes.status).toBe(401);
    expect(lockedOutRes.body.message).toMatch(/suspended/i);
  });

  it("does not add an unrelated user to the blocklist", async () => {
    const OTHER_ID = "other-tech-999";
    configureDbForInviteCancel();

    await request(app)
      .delete(`/api/contractor/team/${TARGET_USER_ID}/invite`)
      .set("x-test-user", "admin");

    expect(sharedSuspendedUserIds.has(OTHER_ID)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suspended-user lockout on previously-unguarded read routes
// ---------------------------------------------------------------------------
//
// These routes previously lacked requireNotSuspended(). A suspended contractor
// could continue reading business data (analytics, stripe-connect status,
// billing portal) until their session expired. The tests below confirm that
// adding requireNotSuspended() closes that gap: a user whose ID is in the
// sharedSuspendedUserIds set is immediately rejected with 401.
// ---------------------------------------------------------------------------

describe("Suspend lockout — contractor read routes (analytics, stripe-connect, billing)", () => {
  let app: express.Express;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_read_lockout_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_read_lockout_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  // ── GET /api/analytics/contractor/:contractorId ──────────────────────────

  it("blocks a suspended user from reading contractor analytics", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get(`/api/analytics/contractor/${TARGET_USER_ID}`)
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("blocks a suspended user from reading monthly contractor analytics", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get(`/api/analytics/contractor/${TARGET_USER_ID}/monthly/2026/7`)
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on contractor analytics", async () => {
    // TARGET_USER_ID is NOT in sharedSuspendedUserIds; requireNotSuspended passes.
    // The handler then enforces its own role check (role must be 'contractor').
    // TARGET_SESSION.user has companyRole 'tech', so the inner 403 fires — but
    // that means requireNotSuspended correctly let the request through.
    const res = await request(app)
      .get(`/api/analytics/contractor/${TARGET_USER_ID}`)
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/contractor/stripe-connect/status ────────────────────────────

  it("blocks a suspended user from reading Stripe Connect status", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/contractor/stripe-connect/status")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on Stripe Connect status", async () => {
    // Not suspended — requireNotSuspended passes. requireRole('contractor')
    // passes (mocked as no-op). The handler may 500 without a real Stripe key
    // but that's after the auth gates, confirming the suspension check ran.
    const res = await request(app)
      .get("/api/contractor/stripe-connect/status")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/contractor/billing/portal ──────────────────────────────────

  it("blocks a suspended user from accessing the billing portal", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/contractor/billing/portal")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on the billing portal", async () => {
    // Not suspended — requireNotSuspended passes. The handler's inner role check
    // (req.session.user.role !== 'contractor') may return 401 with "Unauthorized"
    // but the suspension check was not the blocker — the message won't say "suspended".
    const res = await request(app)
      .get("/api/contractor/billing/portal")
      .set("x-test-user", "target");

    // Whatever status, the response must NOT be the suspension 401
    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });
});

// Suspended-user lockout on CRM read routes
// ---------------------------------------------------------------------------
//
// GET /api/crm/jobs, /api/crm/quotes, /api/crm/invoices,
// /api/crm/integrations, /api/crm/webhooks/:id/logs previously relied solely
// on the blanket app.use('/api/crm', ...) guard which has an edge case where
// it calls next() unconditionally when neither session nor OAuth paths match.
// Adding requireNotSuspended() directly to each route closes that gap.
// ---------------------------------------------------------------------------

describe("Suspend lockout — CRM read routes (jobs, quotes, invoices, integrations, webhook logs)", () => {
  let app: express.Express;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_crm_lockout_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_crm_lockout_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  // ── GET /api/crm/jobs ────────────────────────────────────────────────────

  it("blocks a suspended user from reading CRM jobs", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/crm/jobs")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on CRM jobs", async () => {
    // TARGET_USER_ID is NOT in sharedSuspendedUserIds; requireNotSuspended passes.
    // The handler's inner role check fires next; whatever it returns is not a
    // suspension 401, confirming the suspension check let the request through.
    const res = await request(app)
      .get("/api/crm/jobs")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/crm/quotes ──────────────────────────────────────────────────

  it("blocks a suspended user from reading CRM quotes", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/crm/quotes")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on CRM quotes", async () => {
    const res = await request(app)
      .get("/api/crm/quotes")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/crm/invoices ────────────────────────────────────────────────

  it("blocks a suspended user from reading CRM invoices", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/crm/invoices")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on CRM invoices", async () => {
    const res = await request(app)
      .get("/api/crm/invoices")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/crm/integrations ────────────────────────────────────────────

  it("blocks a suspended user from reading CRM integrations", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/crm/integrations")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on CRM integrations", async () => {
    const res = await request(app)
      .get("/api/crm/integrations")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/crm/webhooks/:integrationId/logs ────────────────────────────

  it("blocks a suspended user from reading CRM webhook logs", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/crm/webhooks/integration-001/logs")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on CRM webhook logs", async () => {
    // requireNotSuspended passes. The handler checks role then looks up the
    // integration by ID; without a real DB it may 403 or 404, but not a
    // suspension 401.
    const res = await request(app)
      .get("/api/crm/webhooks/integration-001/logs")
      .set("x-test-user", "target");

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Suspended-user lockout on boost-check and previously-used routes
// ---------------------------------------------------------------------------
//
// These routes previously carried only isAuthenticated. A suspended contractor
// could still read boost availability and previously-used contractor lists
// until their session expired. requireNotSuspended() now closes that gap.
// ---------------------------------------------------------------------------

describe("Suspend lockout — boost check and previously-used contractor routes", () => {
  let app: express.Express;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_boost_lockout_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_boost_lockout_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  // ── POST /api/contractors/boost ──────────────────────────────────────────

  it("blocks a suspended user from creating a boost", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/contractors/boost")
      .set("x-test-user", "target")
      .send({ serviceCategory: "plumbing", businessAddress: "123 Main St" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on boost creation", async () => {
    const res = await request(app)
      .post("/api/contractors/boost")
      .set("x-test-user", "target")
      .send({ serviceCategory: "plumbing", businessAddress: "123 Main St" });

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/contractors/boost/check ─────────────────────────────────────

  it("blocks a suspended user from checking boost status", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/contractors/boost/check?serviceCategory=plumbing&businessAddress=123+Main+St")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on boost check", async () => {
    // TARGET_USER_ID is NOT in sharedSuspendedUserIds; requireNotSuspended passes.
    // The handler enforces its own role check (role must be 'contractor') —
    // TARGET_SESSION has companyRole 'tech' and no .role field, so the inner
    // 403 fires — but that confirms requireNotSuspended let the request through.
    const res = await request(app)
      .get("/api/contractors/boost/check?serviceCategory=plumbing&businessAddress=123+Main+St")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── DELETE /api/contractors/boost/:boostId ───────────────────────────────

  it("blocks a suspended user from deleting a boost", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .delete("/api/contractors/boost/boost-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on boost deletion", async () => {
    // TARGET_USER_ID is NOT in sharedSuspendedUserIds; requireNotSuspended passes.
    // The handler enforces its own role check (role must be 'contractor') —
    // TARGET_SESSION has companyRole 'tech' and no .role field, so the inner
    // 403 fires — but that confirms requireNotSuspended let the request through.
    const res = await request(app)
      .delete("/api/contractors/boost/boost-001")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── PATCH /api/contractors/boost/:boostId ────────────────────────────────

  it("blocks a suspended user from updating a boost", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .patch("/api/contractors/boost/boost-001")
      .set("x-test-user", "target")
      .send({ isActive: false });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on boost update", async () => {
    // TARGET_USER_ID is NOT in sharedSuspendedUserIds; requireNotSuspended passes.
    // The handler enforces its own role check (role must be 'contractor') —
    // TARGET_SESSION has companyRole 'tech' and no .role field, so the inner
    // 403 fires — but that confirms requireNotSuspended let the request through.
    const res = await request(app)
      .patch("/api/contractors/boost/boost-001")
      .set("x-test-user", "target")
      .send({ isActive: false });

    expect(res.status).not.toBe(401);
  });

  it("rejects a boost update that attempts to modify immutable fields", async () => {
    // Sensitive/economic fields (amount, status, dates, Stripe IDs, contractorId,
    // location) must not be writeable by contractors — the schema only permits
    // isActive. Any other field combination should return 400, not succeed.
    const res = await request(app)
      .patch("/api/contractors/boost/boost-001")
      .set("x-test-user", "target")
      .send({ amount: "0.00", status: "active", stripePaymentIntentId: "pi_fake" });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/isActive/i);
  });

  // ── GET /api/contractors/previously-used ─────────────────────────────────

  it("blocks a suspended user from reading previously-used contractors", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/contractors/previously-used")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on previously-used", async () => {
    const res = await request(app)
      .get("/api/contractors/previously-used")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/houses/:houseId/contractors-used ─────────────────────────────

  it("blocks a suspended user from reading contractors used at a house", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/houses/house-abc/contractors-used")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on house contractors-used", async () => {
    const res = await request(app)
      .get("/api/houses/house-abc/contractors-used")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });
});

// Suspended-user lockout on CRM action routes
// ---------------------------------------------------------------------------
//
// POST /api/crm/jobs/:id/notify, POST /api/crm/quotes/:id/send,
// POST /api/crm/invoices/:id/send, and POST /api/crm/invoices/:id/payment
// can trigger outbound messages or initiate payment flows. A suspended
// contractor must be blocked before any of that work happens.
// ---------------------------------------------------------------------------

describe("Suspend lockout — CRM action routes (notify, send, payment)", () => {
  let app: express.Express;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_crm_action_lockout_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_crm_action_lockout_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  // ── POST /api/crm/jobs/:id/notify ────────────────────────────────────────

  it("blocks a suspended user from sending a job notification", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/jobs/job-001/notify")
      .set("x-test-user", "target")
      .send({ method: "email" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on job notify", async () => {
    // Not suspended — requireNotSuspended passes. The handler's own role check
    // or DB lookup fires next; whatever it returns is not a suspension 401.
    const res = await request(app)
      .post("/api/crm/jobs/job-001/notify")
      .set("x-test-user", "target")
      .send({ method: "email" });

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── POST /api/crm/quotes/:id/send ────────────────────────────────────────

  it("blocks a suspended user from sending a quote", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/quotes/quote-001/send")
      .set("x-test-user", "target")
      .send({ method: "email" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on quote send", async () => {
    const res = await request(app)
      .post("/api/crm/quotes/quote-001/send")
      .set("x-test-user", "target")
      .send({ method: "email" });

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── POST /api/crm/invoices/:id/send ──────────────────────────────────────

  it("blocks a suspended user from sending an invoice", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/invoices/invoice-001/send")
      .set("x-test-user", "target")
      .send({ method: "email" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on invoice send", async () => {
    const res = await request(app)
      .post("/api/crm/invoices/invoice-001/send")
      .set("x-test-user", "target")
      .send({ method: "email" });

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── POST /api/crm/invoices/:id/payment ───────────────────────────────────

  it("blocks a suspended user from recording an invoice payment", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/invoices/invoice-001/payment")
      .set("x-test-user", "target")
      .send({ amount: 500, method: "cash" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on invoice payment", async () => {
    const res = await request(app)
      .post("/api/crm/invoices/invoice-001/payment")
      .set("x-test-user", "target")
      .send({ amount: 500, method: "cash" });

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });
});

// ---------------------------------------------------------------------------
// Suspended-user lockout on CRM write routes
// ---------------------------------------------------------------------------
//
// POST, PATCH, DELETE for jobs, quotes, invoices, and integrations previously
// only relied on the blanket app.use('/api/crm', ...) guard which has an edge
// case where it calls next() unconditionally when neither session nor OAuth
// paths match. Adding requireNotSuspended() directly to each write route
// closes that gap.
// ---------------------------------------------------------------------------

describe("Suspend lockout — CRM write routes (jobs, quotes, invoices, integrations)", () => {
  let app: express.Express;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_crm_write_lockout_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_crm_write_lockout_placeholder";

    // requireContractorSubscription calls storage.getUser — return a non-contractor
    // user so it always calls next() without checking subscription status.
    vi.mocked(storage.getUser).mockResolvedValue({
      id: TARGET_USER_ID,
      email: "tech@company.test",
      role: "homeowner",
      subscriptionStatus: null,
    } as any);

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  // ── POST /api/crm/jobs ───────────────────────────────────────────────────

  it("blocks a suspended user from creating a CRM job", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/jobs")
      .set("x-test-user", "target")
      .send({ title: "Test Job" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/crm/jobs", async () => {
    const res = await request(app)
      .post("/api/crm/jobs")
      .set("x-test-user", "target")
      .send({ title: "Test Job" });

    expect(res.status).not.toBe(401);
  });

  // ── PATCH /api/crm/jobs/:id ──────────────────────────────────────────────

  it("blocks a suspended user from updating a CRM job", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .patch("/api/crm/jobs/job-001")
      .set("x-test-user", "target")
      .send({ status: "completed" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on PATCH /api/crm/jobs/:id", async () => {
    const res = await request(app)
      .patch("/api/crm/jobs/job-001")
      .set("x-test-user", "target")
      .send({ status: "completed" });

    expect(res.status).not.toBe(401);
  });

  // ── DELETE /api/crm/jobs/:id ─────────────────────────────────────────────

  it("blocks a suspended user from deleting a CRM job", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .delete("/api/crm/jobs/job-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on DELETE /api/crm/jobs/:id", async () => {
    const res = await request(app)
      .delete("/api/crm/jobs/job-001")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── POST /api/crm/quotes ─────────────────────────────────────────────────

  it("blocks a suspended user from creating a CRM quote", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/quotes")
      .set("x-test-user", "target")
      .send({ title: "Test Quote" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/crm/quotes", async () => {
    const res = await request(app)
      .post("/api/crm/quotes")
      .set("x-test-user", "target")
      .send({ title: "Test Quote" });

    expect(res.status).not.toBe(401);
  });

  // ── PATCH /api/crm/quotes/:id ────────────────────────────────────────────

  it("blocks a suspended user from updating a CRM quote", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .patch("/api/crm/quotes/quote-001")
      .set("x-test-user", "target")
      .send({ status: "sent" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on PATCH /api/crm/quotes/:id", async () => {
    const res = await request(app)
      .patch("/api/crm/quotes/quote-001")
      .set("x-test-user", "target")
      .send({ status: "sent" });

    expect(res.status).not.toBe(401);
  });

  // ── DELETE /api/crm/quotes/:id ───────────────────────────────────────────

  it("blocks a suspended user from deleting a CRM quote", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .delete("/api/crm/quotes/quote-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on DELETE /api/crm/quotes/:id", async () => {
    const res = await request(app)
      .delete("/api/crm/quotes/quote-001")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── POST /api/crm/invoices ───────────────────────────────────────────────

  it("blocks a suspended user from creating a CRM invoice", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/invoices")
      .set("x-test-user", "target")
      .send({ title: "Test Invoice" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/crm/invoices", async () => {
    const res = await request(app)
      .post("/api/crm/invoices")
      .set("x-test-user", "target")
      .send({ title: "Test Invoice" });

    expect(res.status).not.toBe(401);
  });

  // ── PATCH /api/crm/invoices/:id ──────────────────────────────────────────

  it("blocks a suspended user from updating a CRM invoice", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .patch("/api/crm/invoices/invoice-001")
      .set("x-test-user", "target")
      .send({ status: "paid" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on PATCH /api/crm/invoices/:id", async () => {
    const res = await request(app)
      .patch("/api/crm/invoices/invoice-001")
      .set("x-test-user", "target")
      .send({ status: "paid" });

    expect(res.status).not.toBe(401);
  });

  // ── DELETE /api/crm/invoices/:id ─────────────────────────────────────────

  it("blocks a suspended user from deleting a CRM invoice", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .delete("/api/crm/invoices/invoice-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on DELETE /api/crm/invoices/:id", async () => {
    const res = await request(app)
      .delete("/api/crm/invoices/invoice-001")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── POST /api/crm/integrations ───────────────────────────────────────────

  it("blocks a suspended user from creating a CRM integration", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/integrations")
      .set("x-test-user", "target")
      .send({ platform: "webhook", name: "Test Integration" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/crm/integrations", async () => {
    const res = await request(app)
      .post("/api/crm/integrations")
      .set("x-test-user", "target")
      .send({ platform: "webhook", name: "Test Integration" });

    expect(res.status).not.toBe(401);
  });

  // ── DELETE /api/crm/integrations/:id ────────────────────────────────────

  it("blocks a suspended user from deleting a CRM integration", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .delete("/api/crm/integrations/integration-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on DELETE /api/crm/integrations/:id", async () => {
    const res = await request(app)
      .delete("/api/crm/integrations/integration-001")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── POST /api/crm/leads ──────────────────────────────────────────────────

  it("blocks a suspended user from creating a CRM lead", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/leads")
      .set("x-test-user", "target")
      .send({ name: "Test Lead" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/crm/leads", async () => {
    const res = await request(app)
      .post("/api/crm/leads")
      .set("x-test-user", "target")
      .send({ name: "Test Lead" });

    expect(res.status).not.toBe(401);
  });

  // ── PATCH /api/crm/leads/:id ─────────────────────────────────────────────

  it("blocks a suspended user from updating a CRM lead", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .patch("/api/crm/leads/lead-001")
      .set("x-test-user", "target")
      .send({ status: "qualified" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on PATCH /api/crm/leads/:id", async () => {
    const res = await request(app)
      .patch("/api/crm/leads/lead-001")
      .set("x-test-user", "target")
      .send({ status: "qualified" });

    expect(res.status).not.toBe(401);
  });

  // ── DELETE /api/crm/leads/:id ────────────────────────────────────────────

  it("blocks a suspended user from deleting a CRM lead", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .delete("/api/crm/leads/lead-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on DELETE /api/crm/leads/:id", async () => {
    const res = await request(app)
      .delete("/api/crm/leads/lead-001")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── POST /api/crm/leads/:leadId/notes ───────────────────────────────────

  it("blocks a suspended user from adding a note to a CRM lead", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/leads/lead-001/notes")
      .set("x-test-user", "target")
      .send({ content: "Test note" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/crm/leads/:leadId/notes", async () => {
    const res = await request(app)
      .post("/api/crm/leads/lead-001/notes")
      .set("x-test-user", "target")
      .send({ content: "Test note" });

    expect(res.status).not.toBe(401);
  });

  // ── PATCH /api/crm/notes/:id ─────────────────────────────────────────────

  it("blocks a suspended user from updating a CRM note", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .patch("/api/crm/notes/note-001")
      .set("x-test-user", "target")
      .send({ content: "Updated note" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on PATCH /api/crm/notes/:id", async () => {
    const res = await request(app)
      .patch("/api/crm/notes/note-001")
      .set("x-test-user", "target")
      .send({ content: "Updated note" });

    expect(res.status).not.toBe(401);
  });

  // ── DELETE /api/crm/notes/:id ────────────────────────────────────────────

  it("blocks a suspended user from deleting a CRM note", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .delete("/api/crm/notes/note-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on DELETE /api/crm/notes/:id", async () => {
    const res = await request(app)
      .delete("/api/crm/notes/note-001")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── POST /api/crm/import ─────────────────────────────────────────────────

  it("blocks a suspended user from bulk-importing CRM data", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/import")
      .set("x-test-user", "target")
      .send({ clients: [], jobs: [], quotes: [], invoices: [] });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/crm/import", async () => {
    const res = await request(app)
      .post("/api/crm/import")
      .set("x-test-user", "target")
      .send({ clients: [], jobs: [], quotes: [], invoices: [] });

    expect(res.status).not.toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Suspended-user lockout on messaging routes
// ---------------------------------------------------------------------------
//
// GET/POST /api/conversations, /api/conversations/:id,
// /api/conversations/:id/messages, /api/conversations/bulk, and
// /api/messages/unread-count previously carried only isAuthenticated.
// A suspended contractor could continue reading and sending messages to
// homeowners until their session expired. requireNotSuspended() now closes
// that gap.
// ---------------------------------------------------------------------------

describe("Suspend lockout — messaging routes (conversations, messages)", () => {
  let app: express.Express;

  beforeEach(async () => {
    sharedSuspendedUserIds.clear();
    mockDbSelect.mockReset();
    mockDbUpdate.mockReset();

    process.env.STRIPE_SECRET_KEY = "sk_test_messaging_lockout_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_messaging_lockout_placeholder";

    app = express();
    await registerRoutes(app);
  });

  afterEach(() => {
    sharedSuspendedUserIds.clear();
    vi.clearAllMocks();
  });

  // ── GET /api/conversations ────────────────────────────────────────────────

  it("blocks a suspended user from listing conversations", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/conversations")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on GET /api/conversations", async () => {
    const res = await request(app)
      .get("/api/conversations")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/conversations/:id ────────────────────────────────────────────

  it("blocks a suspended user from reading a single conversation", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/conversations/conv-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on GET /api/conversations/:id", async () => {
    const res = await request(app)
      .get("/api/conversations/conv-001")
      .set("x-test-user", "target");

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── POST /api/conversations ───────────────────────────────────────────────

  it("blocks a suspended user from creating a conversation", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/conversations")
      .set("x-test-user", "target")
      .send({ contractorId: "contractor-abc", subject: "test" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/conversations", async () => {
    const res = await request(app)
      .post("/api/conversations")
      .set("x-test-user", "target")
      .send({ contractorId: "contractor-abc", subject: "test" });

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── POST /api/conversations/bulk ──────────────────────────────────────────

  it("blocks a suspended user from sending bulk messages", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/conversations/bulk")
      .set("x-test-user", "target")
      .send({ subject: "test", message: "hello", contractorIds: ["contractor-abc"] });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/conversations/bulk", async () => {
    const res = await request(app)
      .post("/api/conversations/bulk")
      .set("x-test-user", "target")
      .send({ subject: "test", message: "hello", contractorIds: ["contractor-abc"] });

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── GET /api/conversations/:id/messages ───────────────────────────────────

  it("blocks a suspended user from reading messages in a conversation", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/conversations/conv-001/messages")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on GET /api/conversations/:id/messages", async () => {
    const res = await request(app)
      .get("/api/conversations/conv-001/messages")
      .set("x-test-user", "target");

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── POST /api/conversations/:id/messages ──────────────────────────────────

  it("blocks a suspended user from sending a message", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/conversations/conv-001/messages")
      .set("x-test-user", "target")
      .send({ content: "hello there" });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on POST /api/conversations/:id/messages", async () => {
    const res = await request(app)
      .post("/api/conversations/conv-001/messages")
      .set("x-test-user", "target")
      .send({ content: "hello there" });

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── POST /api/crm/invoices/:invoiceId/payment-link ────────────────────────

  it("blocks a suspended contractor from generating a payment link", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .post("/api/crm/invoices/inv-001/payment-link")
      .set("x-test-user", "target")
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended contractor past the suspension gate on POST /api/crm/invoices/:invoiceId/payment-link", async () => {
    const res = await request(app)
      .post("/api/crm/invoices/inv-001/payment-link")
      .set("x-test-user", "target")
      .send({});

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── GET /api/messages/unread-count ────────────────────────────────────────

  it("blocks a suspended user from reading the unread message count", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/messages/unread-count")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on GET /api/messages/unread-count", async () => {
    const res = await request(app)
      .get("/api/messages/unread-count")
      .set("x-test-user", "target");

    expect(res.status).not.toBe(401);
  });

  // ── GET /api/crm/quotes/:id ────────────────────────────────────────────────

  it("blocks a suspended user from reading a quote", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/crm/quotes/quote-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on GET /api/crm/quotes/:id", async () => {
    const res = await request(app)
      .get("/api/crm/quotes/quote-001")
      .set("x-test-user", "target");

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });

  // ── GET /api/crm/invoices/:id ──────────────────────────────────────────────

  it("blocks a suspended user from reading an invoice", async () => {
    sharedSuspendedUserIds.add(TARGET_USER_ID);

    const res = await request(app)
      .get("/api/crm/invoices/invoice-001")
      .set("x-test-user", "target");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("allows a non-suspended user past the suspension gate on GET /api/crm/invoices/:id", async () => {
    const res = await request(app)
      .get("/api/crm/invoices/invoice-001")
      .set("x-test-user", "target");

    if (res.status === 401) {
      expect(res.body.message).not.toMatch(/suspended/i);
    }
  });
});
