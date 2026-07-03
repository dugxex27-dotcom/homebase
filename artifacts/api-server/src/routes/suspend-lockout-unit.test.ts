/**
 * Unit tests — no module mocks for replitAuth; tests its real implementations.
 *
 * Covers:
 *  - invalidateUserSessions  — session-destroy path fires for the right user
 *  - suspendedUserIds        — in-memory blocklist + requireNotSuspended middleware
 *
 * requireNotSuspended checks THREE layers in order:
 *   1. In-memory suspendedUserIds blocklist (instant, no DB)
 *   2. getUserStatusCached → short-TTL DB select (primary DB path)
 *   3. recheckSuspensionFromDb → additional DB select if TTL expired
 * The db module is mocked so getUserStatusCached can be exercised without a
 * real Postgres connection; all other replitAuth exports are the real functions.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// DB mock — vi.hoisted so it is in scope inside vi.mock() factory
// ---------------------------------------------------------------------------

const { mockDbSelect } = vi.hoisted(() => ({ mockDbSelect: vi.fn() }));

vi.mock("../db", () => ({
  db: {
    select: mockDbSelect,
    update: vi.fn(),
    insert: vi.fn(),
    delete: vi.fn(),
  },
  pool: { query: vi.fn(), end: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Real replitAuth imports (no vi.mock of this module)
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import {
  invalidateUserSessions,
  suspendedUserIds,
  requireNotSuspended,
  evictStatusCache,
  __resetSuspensionRecheckCacheForTests,
} from "../replitAuth";

// ---------------------------------------------------------------------------
// Helper — chain shape that getUserStatusCached / recheckSuspensionFromDb call:
//   db.select(fields).from(table).where(cond).limit(1)
// ---------------------------------------------------------------------------

function makeStatusChain(status: string) {
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue([{ status }]),
      }),
    }),
  };
}

// ---------------------------------------------------------------------------
// Helper — minimal Express app that simulates an authenticated session
// ---------------------------------------------------------------------------

function buildApp(userId: string) {
  const app = express();
  app.use((req: any, _res, next) => {
    req.session = { isAuthenticated: true, user: { id: userId, status: "active" } };
    next();
  });
  app.get("/protected", requireNotSuspended(), (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

// ---------------------------------------------------------------------------
// invalidateUserSessions — session-destroy path
// ---------------------------------------------------------------------------

describe("invalidateUserSessions", () => {
  it("destroys every session belonging to the target user", async () => {
    const destroy = vi.fn((_sid: string, cb: any) => cb(null));
    const sessions = {
      "sess-1": { user: { id: "user-abc" } },
      "sess-2": { user: { id: "user-xyz" } },
      "sess-3": { user: { id: "user-abc" } },
    };
    const sessionStore = { all: (cb: any) => cb(null, sessions), destroy };

    invalidateUserSessions(sessionStore, "user-abc");
    await new Promise((r) => setTimeout(r, 0));

    expect(destroy).toHaveBeenCalledTimes(2);
    expect(destroy).toHaveBeenCalledWith("sess-1", expect.any(Function));
    expect(destroy).toHaveBeenCalledWith("sess-3", expect.any(Function));
    expect(destroy).not.toHaveBeenCalledWith("sess-2", expect.any(Function));
  });

  it("does not touch sessions belonging to other users", async () => {
    const destroy = vi.fn();
    const sessionStore = {
      all: (cb: any) => cb(null, { "sess-other": { user: { id: "user-other" } } }),
      destroy,
    };

    invalidateUserSessions(sessionStore, "user-abc");
    await new Promise((r) => setTimeout(r, 0));

    expect(destroy).not.toHaveBeenCalled();
  });

  it("is a no-op when sessionStore is null or has no .all method", () => {
    expect(() => invalidateUserSessions(null as any, "user-abc")).not.toThrow();
    expect(() => invalidateUserSessions({} as any, "user-abc")).not.toThrow();
  });

  it("is a no-op when sessionStore.all returns an error", async () => {
    const destroy = vi.fn();
    const sessionStore = {
      all: (cb: any) => cb(new Error("DB error"), null),
      destroy,
    };
    invalidateUserSessions(sessionStore, "user-abc");
    await new Promise((r) => setTimeout(r, 0));
    expect(destroy).not.toHaveBeenCalled();
  });

  it("logs a warning when session.destroy fails", async () => {
    const log = { warn: vi.fn(), info: vi.fn() };
    const sessionStore = {
      all: (cb: any) => cb(null, { "sess-1": { user: { id: "user-abc" } } }),
      destroy: (_sid: string, cb: any) => cb(new Error("destroy failed")),
    };
    invalidateUserSessions(sessionStore, "user-abc", log);
    await new Promise((r) => setTimeout(r, 0));
    expect(log.warn).toHaveBeenCalledOnce();
  });

  it("logs info when a session is successfully destroyed", async () => {
    const log = { warn: vi.fn(), info: vi.fn() };
    const sessionStore = {
      all: (cb: any) => cb(null, { "sess-1": { user: { id: "user-abc" } } }),
      destroy: (_sid: string, cb: any) => cb(null),
    };
    invalidateUserSessions(sessionStore, "user-abc", log);
    await new Promise((r) => setTimeout(r, 0));
    expect(log.info).toHaveBeenCalledOnce();
  });

  it("only destroys sessions for the suspended user, not other active users", async () => {
    const destroy = vi.fn((_sid: string, cb: any) => cb(null));
    const sessions = {
      "session-target": { user: { id: "user-target" } },
      "session-other": { user: { id: "user-other" } },
    };
    const sessionStore = { all: (cb: any) => cb(null, sessions), destroy };

    invalidateUserSessions(sessionStore, "user-target");
    await new Promise((r) => setTimeout(r, 0));

    expect(destroy).toHaveBeenCalledWith("session-target", expect.any(Function));
    expect(destroy).not.toHaveBeenCalledWith("session-other", expect.any(Function));
  });

  it("blocks a user even when destroy fails (blocklist is the safety net)", async () => {
    const sessionStore = {
      all: (cb: any) => cb(null, { "sess-fail": { user: { id: "user-abc" } } }),
      destroy: (_sid: string, cb: any) => cb(new Error("destroy failed")),
    };

    expect(() => invalidateUserSessions(sessionStore, "user-abc")).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));

    suspendedUserIds.add("user-abc");
    const app = buildApp("user-abc");
    const res = await request(app).get("/protected");
    expect(res.status).toBe(401);

    suspendedUserIds.delete("user-abc");
  });

  it("destroys all sessions across multiple devices", async () => {
    const destroy = vi.fn((_sid: string, cb: any) => cb(null));
    const sessions = {
      "sess-mobile": { user: { id: "user-multi" } },
      "sess-desktop": { user: { id: "user-multi" } },
      "sess-tablet": { user: { id: "user-multi" } },
    };
    const sessionStore = { all: (cb: any) => cb(null, sessions), destroy };

    invalidateUserSessions(sessionStore, "user-multi");
    await new Promise((r) => setTimeout(r, 0));

    expect(destroy).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// suspendedUserIds blocklist + requireNotSuspended middleware
// ---------------------------------------------------------------------------

describe("suspendedUserIds blocklist — requireNotSuspended middleware", () => {
  const USER_ID = "user-middleware-test";

  beforeEach(() => {
    suspendedUserIds.delete(USER_ID);
    evictStatusCache(USER_ID);
    __resetSuspensionRecheckCacheForTests();
    mockDbSelect.mockReset();
  });
  afterEach(() => {
    suspendedUserIds.delete(USER_ID);
    evictStatusCache(USER_ID);
  });

  it("allows an active user through when not in the blocklist", async () => {
    const res = await request(buildApp(USER_ID)).get("/protected");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("returns 401 immediately after user is added to suspendedUserIds (stale session path)", async () => {
    const app = buildApp(USER_ID);

    const before = await request(app).get("/protected");
    expect(before.status).toBe(200);

    // Simulate the suspend route: add to in-memory blocklist
    suspendedUserIds.add(USER_ID);

    // Same session cookie — now blocked without any round-trip to the DB
    const after = await request(app).get("/protected");
    expect(after.status).toBe(401);
    expect(after.body.message).toMatch(/suspended/i);
  });

  it("returns 401 when DB reports status 'suspended' (getUserStatusCached path)", async () => {
    mockDbSelect.mockReturnValueOnce(makeStatusChain("suspended"));
    const res = await request(buildApp(USER_ID)).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("returns 401 when DB reports status 'removed' (getUserStatusCached path)", async () => {
    mockDbSelect.mockReturnValueOnce(makeStatusChain("removed"));
    const res = await request(buildApp(USER_ID)).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("returns 401 when DB reports status 'pending_invite' (getUserStatusCached path)", async () => {
    mockDbSelect.mockReturnValueOnce(makeStatusChain("pending_invite"));
    const res = await request(buildApp(USER_ID)).get("/protected");
    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  it("restores access after removal from the blocklist (reactivate path)", async () => {
    suspendedUserIds.add(USER_ID);
    const app = buildApp(USER_ID);

    const blocked = await request(app).get("/protected");
    expect(blocked.status).toBe(401);

    suspendedUserIds.delete(USER_ID);
    evictStatusCache(USER_ID);
    __resetSuspensionRecheckCacheForTests();

    const allowed = await request(app).get("/protected");
    expect(allowed.status).toBe(200);
  });
});
