/**
 * HTTP-level integration tests: the /api/crm/* guard now layers
 * requireActiveAccountFresh() in front of the session-based suspended/removed
 * check, mirroring the /api/contractor/* guard (see routes.ts, app.use('/api/crm', ...)).
 *
 * This closes the same stale-session gap for CRM routes: a session cookie
 * claiming 'active' must not keep working once the DB shows the account has
 * been suspended/removed/pending_invite — including on a different server
 * instance where the in-memory suspendedUserIds Set hasn't caught up yet.
 *
 * Strategy: mount the exact same two-middleware chain used in routes.ts for
 * '/api/crm' (inline session check + requireActiveAccountFresh()) against a
 * minimal express app, with ./db mocked so we control the "fresh" DB status.
 */

import { vi, describe, it, expect, beforeEach } from "vitest";
import express from "express";
import supertest from "supertest";

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

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return { storage: createStorageMock() };
});

vi.mock("../db", () => ({
  db: { select: vi.fn() },
  pool: {},
}));

vi.mock("@workspace/db", () => ({
  users: { id: "id", status: "status" },
}));

vi.mock("drizzle-orm", () => ({
  inArray: vi.fn(),
  eq: vi.fn(),
}));

vi.mock("../lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { db } from "../db";
import {
  suspendedUserIds,
  activeStatusCache,
  requireActiveAccountFresh,
} from "../replitAuth";

function mockDbStatus(status: string | undefined) {
  (db.select as any).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(status === undefined ? [] : [{ status }]),
      }),
    }),
  });
}

function buildCrmApp() {
  const app = express();
  app.use(express.json());

  // Mirrors the exact guard chain registered in routes.ts for '/api/crm'.
  app.use(
    "/api/crm",
    (req: any, res: any, next: any) => {
      if (!req.session?.isAuthenticated) return next();
      const u = req.session?.user;
      if (
        u &&
        (["suspended", "removed", "pending_invite"].includes(u.status) ||
          suspendedUserIds.has(u.id))
      ) {
        return res
          .status(401)
          .json({ message: "Account suspended. Contact your company administrator." });
      }
      if (u?.companyRole === "tech") {
        return res
          .status(403)
          .json({ message: "Forbidden - tech accounts cannot access this resource" });
      }
      next();
    },
    requireActiveAccountFresh(),
  );

  app.get("/api/crm/leads", (_req, res) => {
    res.status(200).json({ leads: [] });
  });

  return app;
}

function withSession(app: express.Express, userId: string, sessionStatus = "active") {
  const withSess = express();
  withSess.use((req: any, _res, next) => {
    req.session = {
      isAuthenticated: true,
      user: { id: userId, companyRole: "admin", status: sessionStatus },
      destroy: vi.fn((cb?: () => void) => cb?.()),
    };
    next();
  });
  withSess.use(app);
  return withSess;
}

describe("CRM guard — requireActiveAccountFresh closes the stale-session gap (integration)", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    activeStatusCache.clear();
    vi.clearAllMocks();
  });

  it("returns 403 and blocks a CRM route when the DB shows the account was suspended mid-session", async () => {
    mockDbStatus("suspended");
    const app = withSession(buildCrmApp(), "user-crm-1", "active");

    const response = await supertest(app).get("/api/crm/leads");

    expect(response.status).toBe(403);
    expect(response.body.message).toMatch(/suspended/i);
  });

  it("returns 403 when the DB shows the account was removed, even though the session cookie still says active", async () => {
    mockDbStatus("removed");
    const app = withSession(buildCrmApp(), "user-crm-2", "active");

    const response = await supertest(app).get("/api/crm/leads");

    expect(response.status).toBe(403);
  });

  it("allows the request through when the DB confirms the account is still active", async () => {
    mockDbStatus("active");
    const app = withSession(buildCrmApp(), "user-crm-3", "active");

    const response = await supertest(app).get("/api/crm/leads");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ leads: [] });
  });

  it("adds the userId to suspendedUserIds so a subsequent same-instance request short-circuits without a DB round trip", async () => {
    mockDbStatus("suspended");
    const app = withSession(buildCrmApp(), "user-crm-4", "active");

    await supertest(app).get("/api/crm/leads");

    expect(suspendedUserIds.has("user-crm-4")).toBe(true);
  });

  it("degrades to next() (existing session guard still applies) when the DB call errors", async () => {
    (db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error("connection lost")),
        }),
      }),
    });
    const app = withSession(buildCrmApp(), "user-crm-5", "active");

    const response = await supertest(app).get("/api/crm/leads");

    expect(response.status).toBe(200);
  });
});
