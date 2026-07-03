import { vi, describe, it, expect, beforeEach } from "vitest";

// ── Heavy dependency mocks (hoisted before any imports) ──────────────────────

vi.mock("openid-client", () => ({
  discovery: vi.fn(),
  refreshTokenGrant: vi.fn(),
  buildEndSessionUrl: vi.fn(),
}));

vi.mock("openid-client/passport", () => ({
  Strategy: vi.fn(),
}));

vi.mock("passport", () => ({
  default: {
    initialize: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    session: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    use: vi.fn(),
    serializeUser: vi.fn(),
    deserializeUser: vi.fn(),
    authenticate: vi.fn(),
  },
}));

vi.mock("express-session", () => ({
  default: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

vi.mock("memoizee", () => ({
  default: (fn: any) => fn,
}));

vi.mock("connect-pg-simple", () => ({
  default: () => class MockStore {},
}));

vi.mock("./storage", () => ({
  storage: {
    getUser: vi.fn(),
    upsertUser: vi.fn(),
    getHouse: vi.fn(),
    getMaintenanceLog: vi.fn(),
    getCustomMaintenanceTask: vi.fn(),
    getHomeSystem: vi.fn(),
  },
}));

vi.mock("./db", () => ({
  db: {
    select: vi.fn(),
  },
  pool: {},
}));

vi.mock("@workspace/db", () => ({
  users: { id: "id", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  inArray: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("./lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// ── Now import the module under test ─────────────────────────────────────────

import * as client from "openid-client";
import { db } from "./db";
import {
  seedSuspendedUserIds,
  suspendedUserIds,
  requireNotSuspended,
  isAuthenticated,
  isOAuthUserSuspended,
  __resetSuspensionRecheckCacheForTests,
  requireActiveAccountFresh,
  activeStatusCache,
  invalidateActiveStatusCache,
  userStatusCache,
} from "./replitAuth";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeReq(userId: string, status?: string) {
  return {
    session: {
      isAuthenticated: true,
      user: { id: userId, status: status ?? "active" },
    },
  } as any;
}

function makeOAuthReq(userId: string) {
  return {
    session: {},
    user: {
      claims: { sub: userId },
      access_token: "tok",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
    isAuthenticated: () => true,
  } as any;
}

function makeRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

// By default, mock db.select() to resolve with no matching row (i.e. the
// per-request DB re-check that requireNotSuspended performs finds nothing
// and lets the request through). Individual tests override this when they
// need to simulate a status returned by the DB.
function mockDbSelectResult(rows: Array<Record<string, any>>) {
  (db.select as any).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(rows),
      }),
    }),
  });
}

function mockDbSelectResultForSeed(rows: Array<Record<string, any>>) {
  (db.select as any).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(rows),
    }),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// seedSuspendedUserIds
// ─────────────────────────────────────────────────────────────────────────────

describe("seedSuspendedUserIds — DB pre-population on startup", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    __resetSuspensionRecheckCacheForTests();
    vi.resetAllMocks();
  });

  it("adds suspended user IDs returned by the DB to the in-memory set", async () => {
    const rows = [{ id: "user-suspended-1" }, { id: "user-suspended-2" }];
    mockDbSelectResultForSeed(rows);

    await seedSuspendedUserIds();

    expect(suspendedUserIds.has("user-suspended-1")).toBe(true);
    expect(suspendedUserIds.has("user-suspended-2")).toBe(true);
    expect(suspendedUserIds.size).toBe(2);
  });

  it("adds removed user IDs returned by the DB to the in-memory set", async () => {
    const rows = [{ id: "user-removed-99" }];
    mockDbSelectResultForSeed(rows);

    await seedSuspendedUserIds();

    expect(suspendedUserIds.has("user-removed-99")).toBe(true);
  });

  it("results in an empty set when the DB returns no suspended/removed rows", async () => {
    mockDbSelectResultForSeed([]);

    await seedSuspendedUserIds();

    expect(suspendedUserIds.size).toBe(0);
  });

  it("does not throw and leaves the set intact when the DB query rejects", async () => {
    suspendedUserIds.add("pre-existing-user");
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockRejectedValue(new Error("DB connection lost")),
      }),
    });

    await expect(seedSuspendedUserIds()).resolves.toBeUndefined();

    expect(suspendedUserIds.has("pre-existing-user")).toBe(true);
  });

  it("passes the row count to the log callback", async () => {
    const rows = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];
    mockDbSelectResultForSeed(rows);

    const log = { info: vi.fn(), warn: vi.fn() };
    await seedSuspendedUserIds(log);

    expect(log.info).toHaveBeenCalledWith({ count: 3 }, expect.stringContaining("Pre-populated"));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireNotSuspended — in-memory blocklist enforcement without DB
// ─────────────────────────────────────────────────────────────────────────────

describe("requireNotSuspended — in-memory blocklist checked on every request", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    __resetSuspensionRecheckCacheForTests();
    vi.resetAllMocks();
    mockDbSelectResult([]); // default: DB re-check finds nothing suspended
  });

  it("returns 401 for a user present in the in-memory set, even with no DB check", async () => {
    const userId = "user-blocklisted";
    suspendedUserIds.add(userId);

    const req = makeReq(userId, "active");
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("suspended") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for a user whose DB status is 'suspended' (cache-backed check)", async () => {
    // Mock the DB chain used by getUserStatusCached: select().from().where().limit()
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ status: "suspended" }]),
        }),
      }),
    });

    const req = makeReq("user-field-suspended", "active"); // session status is stale/active
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for a user whose DB status is 'removed' (cache-backed check)", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ status: "removed" }]),
        }),
      }),
    });

    const req = makeReq("user-field-removed", "active"); // session status is stale/active
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() for an active user absent from the blocklist", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ status: "active" }]),
        }),
      }),
    });

    const req = makeReq("user-active", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks a user that was seeded into the set on restart, with no live DB query needed", async () => {
    const seededId = "user-seeded-on-restart";
    mockDbSelectResultForSeed([{ id: seededId }]);

    await seedSuspendedUserIds();

    const req = makeReq(seededId, "active");
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 for an unauthenticated request (no session)", async () => {
    const req = { session: {} } as any;
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireNotSuspended — OAuth auth path (req.user / req.isAuthenticated)
// ─────────────────────────────────────────────────────────────────────────────

describe("requireNotSuspended — OAuth auth path consulted against the blocklist", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    __resetSuspensionRecheckCacheForTests();
    vi.resetAllMocks();
    mockDbSelectResult([]);
  });

  it("returns 401 with suspended message for an OAuth user present in the in-memory blocklist", async () => {
    const userId = "oauth-user-blocklisted";
    suspendedUserIds.add(userId);

    const req = makeOAuthReq(userId);
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("suspended") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() for an OAuth user absent from the blocklist", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ status: "active" }]),
        }),
      }),
    });

    const req = makeOAuthReq("oauth-user-clean");
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("blocks an OAuth user that was seeded into the blocklist on server restart", async () => {
    const seededId = "oauth-user-seeded";
    mockDbSelectResultForSeed([{ id: seededId }]);

    await seedSuspendedUserIds();

    const req = makeOAuthReq(seededId);
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("suspended") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized for an OAuth request with no claims.sub", async () => {
    const req = {
      session: {},
      user: { access_token: "tok", expires_at: Math.floor(Date.now() / 1000) + 3600 },
      isAuthenticated: () => true,
    } as any;
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 401 Unauthorized when isAuthenticated() returns false and no session exists", async () => {
    const req = {
      session: {},
      user: { claims: { sub: "oauth-user-xyz" } },
      isAuthenticated: () => false,
    } as any;
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isOAuthUserSuspended — shared helper consumed directly by routes.ts's
// blanket /api/contractor and /api/crm guards (not just requireNotSuspended)
// ─────────────────────────────────────────────────────────────────────────────

describe("isOAuthUserSuspended — shared helper used by blanket route guards", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    __resetSuspensionRecheckCacheForTests();
    vi.resetAllMocks();
    mockDbSelectResult([]);
  });

  it("returns true for a user present in the in-memory blocklist without querying the DB", async () => {
    const userId = "oauth-helper-blocklisted";
    suspendedUserIds.add(userId);

    const result = await isOAuthUserSuspended(userId);

    expect(result).toBe(true);
    expect(db.select).not.toHaveBeenCalled();
  });

  it("returns false for an active user absent from the blocklist", async () => {
    const result = await isOAuthUserSuspended("oauth-helper-active");

    expect(result).toBe(false);
  });

  it("returns true when the TTL-bound DB re-check finds the user suspended elsewhere", async () => {
    const userId = "oauth-helper-suspended-elsewhere";
    mockDbSelectResult([{ status: "suspended" }]);

    const result = await isOAuthUserSuspended(userId);

    expect(result).toBe(true);
    // The blocklist should now be updated so subsequent calls short-circuit.
    expect(suspendedUserIds.has(userId)).toBe(true);
  });

  it("returns true when the TTL-bound DB re-check finds the user removed elsewhere", async () => {
    mockDbSelectResult([{ status: "removed" }]);

    const result = await isOAuthUserSuspended("oauth-helper-removed-elsewhere");

    expect(result).toBe(true);
  });

  it("does not re-query the DB again for the same user within the TTL window", async () => {
    const userId = "oauth-helper-cached";
    mockDbSelectResult([]);

    await isOAuthUserSuspended(userId);
    expect(db.select).toHaveBeenCalledTimes(1);

    await isOAuthUserSuspended(userId);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("fails open (returns false) when the DB re-check throws", async () => {
    (db.select as any).mockImplementation(() => {
      throw new Error("DB unavailable");
    });

    const result = await isOAuthUserSuspended("oauth-helper-db-down");

    expect(result).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireNotSuspended — cross-process staleness bound (DB re-check on TTL expiry)
// ─────────────────────────────────────────────────────────────────────────────
//
// Simulates the race described in the task: an admin suspends a user via a
// different process. This process's in-memory `suspendedUserIds` blocklist
// hasn't heard about it, but the periodic DB re-check should catch it within
// SUSPENSION_RECHECK_TTL_MS instead of only on next restart.

describe("requireNotSuspended — cross-process staleness bound via DB re-check", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    __resetSuspensionRecheckCacheForTests();
    vi.resetAllMocks();
  });

  it("blocks a user suspended on another process even though the local blocklist doesn't know yet", async () => {
    const userId = "user-suspended-elsewhere";
    // Local in-memory blocklist has NOT been told about this suspension —
    // simulating a different process having handled the admin's suspend call.
    expect(suspendedUserIds.has(userId)).toBe(false);

    // The DB, however, reflects the suspension.
    mockDbSelectResult([{ status: "suspended" }]);

    const req = makeReq(userId, "active");
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("suspended") })
    );
    expect(next).not.toHaveBeenCalled();
    // Local blocklist should now be updated so subsequent requests short-circuit.
    expect(suspendedUserIds.has(userId)).toBe(true);
  });

  it("blocks an OAuth-authenticated user suspended on another process via the same DB re-check", async () => {
    const userId = "oauth-user-suspended-elsewhere";
    mockDbSelectResult([{ status: "removed" }]);

    const req = makeOAuthReq(userId);
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not re-query the DB again for the same user within the TTL window", async () => {
    const userId = "user-active-cached";
    mockDbSelectResult([{ status: "active" }]);

    // requireNotSuspended() performs two independent cold-cache DB lookups on
    // the first request: one via the short-TTL status cache used for the
    // instant-revocation check, and one via the separate cross-process
    // suspension re-check (SUSPENSION_RECHECK_TTL_MS). Both are populated
    // after this first call.
    const req1 = makeReq(userId, "active");
    const res1 = makeRes();
    await requireNotSuspended()(req1, res1, vi.fn());
    expect(db.select).toHaveBeenCalledTimes(2);

    const req2 = makeReq(userId, "active");
    const res2 = makeRes();
    const next2 = vi.fn();
    await requireNotSuspended()(req2, res2, next2);

    // No additional DB calls — the second request lands within both TTL windows.
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(next2).toHaveBeenCalled();
  });

  it("fails open (calls next) when the DB re-check throws", async () => {
    (db.select as any).mockImplementation(() => {
      throw new Error("DB unavailable");
    });

    const req = makeReq("user-db-down", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireNotSuspended()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// requireActiveAccountFresh — DB status re-check closes the stale-cookie window
// ─────────────────────────────────────────────────────────────────────────────

function makeReqWithSession(userId: string, status?: string) {
  return {
    session: {
      isAuthenticated: true,
      user: { id: userId, status: status ?? "active" },
      destroy: vi.fn((cb?: () => void) => cb?.()),
    },
  } as any;
}

function mockDbStatus(status: string | undefined) {
  (db.select as any).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(status === undefined ? [] : [{ status }]),
      }),
    }),
  });
}

describe("requireActiveAccountFresh — per-request DB status re-check", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    activeStatusCache.clear();
    vi.clearAllMocks();
  });

  it("returns 401 for an unauthenticated request (no session)", async () => {
    const req = { session: {} } as any;
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when the DB shows the account is active, even if not cached yet", async () => {
    mockDbStatus("active");
    const req = makeReqWithSession("user-1", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("short-circuits with 403 and destroys the session when the DB shows 'suspended', even though the session cookie still says 'active'", async () => {
    mockDbStatus("suspended");
    const req = makeReqWithSession("user-revoked", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("suspended") })
    );
    expect(req.session.destroy).toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it("short-circuits with 403 when the DB shows 'removed'", async () => {
    mockDbStatus("removed");
    const req = makeReqWithSession("user-removed", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("short-circuits with 403 when the DB shows 'pending_invite'", async () => {
    mockDbStatus("pending_invite");
    const req = makeReqWithSession("user-pending", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("treats a missing DB row (deleted user) as 'removed' and blocks the request", async () => {
    mockDbStatus(undefined);
    const req = makeReqWithSession("user-gone", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("adds the userId to suspendedUserIds so same-instance requests short-circuit without a DB round trip", async () => {
    mockDbStatus("suspended");
    const req = makeReqWithSession("user-2", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(suspendedUserIds.has("user-2")).toBe(true);
  });

  it("only queries the DB once within the cache TTL for repeated requests from the same user", async () => {
    mockDbStatus("active");
    const req1 = makeReqWithSession("user-3", "active");
    const req2 = makeReqWithSession("user-3", "active");
    const res1 = makeRes();
    const res2 = makeRes();
    const next1 = vi.fn();
    const next2 = vi.fn();

    await requireActiveAccountFresh()(req1, res1, next1);
    await requireActiveAccountFresh()(req2, res2, next2);

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(next1).toHaveBeenCalled();
    expect(next2).toHaveBeenCalled();
  });

  it("invalidateActiveStatusCache forces the next request to re-query the DB", async () => {
    mockDbStatus("active");
    const req1 = makeReqWithSession("user-4", "active");
    await requireActiveAccountFresh()(req1, makeRes(), vi.fn());
    expect(db.select).toHaveBeenCalledTimes(1);

    invalidateActiveStatusCache("user-4");

    mockDbStatus("suspended");
    const req2 = makeReqWithSession("user-4", "active");
    const res2 = makeRes();
    const next2 = vi.fn();
    await requireActiveAccountFresh()(req2, res2, next2);

    expect(db.select).toHaveBeenCalledTimes(2);
    expect(res2.status).toHaveBeenCalledWith(403);
    expect(next2).not.toHaveBeenCalled();
  });

  it("degrades to next() when the DB query throws, instead of hard-failing the request", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error("connection lost")),
        }),
      }),
    });
    const req = makeReqWithSession("user-5", "active");
    const res = makeRes();
    const next = vi.fn();

    await requireActiveAccountFresh()(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// isAuthenticated — suspended OAuth user must not be able to refresh a token
// ─────────────────────────────────────────────────────────────────────────────
//
// Gap this closes: a suspended OAuth user's passport session can stay alive.
// If their access token has expired but they still hold a valid refresh
// token, `isAuthenticated` used to reach the refresh branch, silently mint a
// new access token, and call next() — bypassing `requireNotSuspended` on any
// route guarded only by `isAuthenticated`. The blocklist must be consulted
// before the refresh is ever attempted.

describe("isAuthenticated — blocks suspended OAuth users before token refresh", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    __resetSuspensionRecheckCacheForTests();
    vi.resetAllMocks();
  });

  function makeExpiredOAuthReq(userId: string) {
    return {
      session: {},
      user: {
        claims: { sub: userId },
        access_token: "expired-tok",
        refresh_token: "valid-refresh-tok",
        expires_at: Math.floor(Date.now() / 1000) - 3600, // expired an hour ago
      },
      isAuthenticated: () => true,
    } as any;
  }

  it("does not attempt a token refresh and returns 401 for a suspended user with an expired token", async () => {
    const userId = "oauth-suspended-with-refresh-token";
    suspendedUserIds.add(userId);

    const req = makeExpiredOAuthReq(userId);
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(client.refreshTokenGrant).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("suspended") })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("still refreshes the token and calls next() for a non-suspended user with an expired token", async () => {
    const userId = "oauth-active-with-refresh-token";
    (client.refreshTokenGrant as any).mockResolvedValue({
      claims: () => ({ sub: userId, exp: Math.floor(Date.now() / 1000) + 3600 }),
      access_token: "new-tok",
      refresh_token: "new-refresh-tok",
    });

    const req = makeExpiredOAuthReq(userId);
    const res = makeRes();
    const next = vi.fn();

    await isAuthenticated(req, res, next);

    expect(client.refreshTokenGrant).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// userStatusCache — bounded LRU eviction
// ─────────────────────────────────────────────────────────────────────────────

describe("userStatusCache — bounded LRU eviction", () => {
  const MAX_SIZE = 5000;

  it("does not grow past the configured max size even with many unique users", () => {
    for (let i = 0; i < MAX_SIZE + 500; i++) {
      userStatusCache.set(`user-${i}`, { status: "active", expiresAt: Date.now() + 30_000 });
    }

    expect((userStatusCache as any).map.size).toBeLessThanOrEqual(MAX_SIZE);
  });

  it("evicts the least-recently-used entry first once the cache is full", () => {
    for (let i = 0; i < MAX_SIZE; i++) {
      userStatusCache.set(`lru-user-${i}`, { status: "active", expiresAt: Date.now() + 30_000 });
    }

    // Touch the oldest entry so it becomes most-recently-used and should survive.
    userStatusCache.get("lru-user-0");

    // Insert one more entry, which should evict the now-least-recently-used
    // entry ("lru-user-1"), not the one we just touched.
    userStatusCache.set("lru-user-new", { status: "active", expiresAt: Date.now() + 30_000 });

    expect(userStatusCache.get("lru-user-0")).toBeDefined();
    expect(userStatusCache.get("lru-user-1")).toBeUndefined();
    expect(userStatusCache.get("lru-user-new")).toBeDefined();
  });
});
