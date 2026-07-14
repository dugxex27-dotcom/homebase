/**
 * HTTP-level integration tests: `/api/push/*` must require a real
 * authenticated user (session or OAuth) and must never fall back to a
 * shared 'demo-user' identity when no session is present.
 *
 * Background: push-routes.ts previously read
 * `req.session?.user?.id || 'demo-user'` in every handler with no auth
 * requirement on the mount at all, so an unauthenticated caller could
 * register/remove push subscriptions and read another party's subscription
 * list under the shared demo-user identity.
 *
 * Fix: routes.ts now mounts '/api/push' behind `isAuthenticated` +
 * `requireNotSuspended()`, and push-routes.ts derives the user id from the
 * authenticated session/OAuth user only, rejecting with 401 if neither is
 * present instead of defaulting to 'demo-user'.
 *
 * Strategy: mount the exact same guard chain used in routes.ts
 * (`isAuthenticated`, `requireNotSuspended()`, pushRoutes) against a minimal
 * express app, with the real replitAuth module (its own deps mocked) and a
 * mocked storage module so we can assert which userId was used.
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

vi.mock("../push-service", () => ({
  pushService: {
    getVapidPublicKey: vi.fn().mockReturnValue("pub-key"),
    sendToUser: vi.fn().mockResolvedValue(undefined),
    sendToMany: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getPushSubscriptions: vi.fn().mockResolvedValue([]),
      createPushSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
      updatePushSubscription: vi.fn().mockResolvedValue({ id: "sub-1" }),
      deletePushSubscriptionByEndpoint: vi.fn().mockResolvedValue(true),
      getUnreadNotifications: vi.fn().mockResolvedValue([]),
    }),
  };
});

import { db } from "../db";
import { storage } from "../storage";
import { isAuthenticated, requireNotSuspended, suspendedUserIds, activeStatusCache } from "../replitAuth";
import pushRoutes from "../push-routes";

function mockDbStatus(status: string | undefined) {
  (db.select as any).mockReturnValue({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(status === undefined ? [] : [{ status }]),
      }),
    }),
  });
}

function buildPushApp() {
  const app = express();
  app.use(express.json());
  // Mirrors the exact guard chain registered in routes.ts for '/api/push'.
  app.use("/api/push", isAuthenticated, requireNotSuspended(), pushRoutes);
  return app;
}

function withSession(userId?: string, status = "active") {
  const app = express();
  app.use((req: any, _res, next) => {
    req.session = userId
      ? { isAuthenticated: true, user: { id: userId, status } }
      : {};
    req.isAuthenticated = () => false;
    next();
  });
  app.use(buildPushApp());
  return app;
}

function withOAuthUser(oauthUserId: string) {
  const app = express();
  app.use((req: any, _res, next) => {
    req.session = {};
    req.user = {
      claims: { sub: oauthUserId },
      access_token: "tok",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    };
    req.isAuthenticated = () => true;
    next();
  });
  app.use(buildPushApp());
  return app;
}

function withNoAuth() {
  const app = express();
  app.use((req: any, _res, next) => {
    req.session = {};
    req.isAuthenticated = () => false;
    next();
  });
  app.use(buildPushApp());
  return app;
}

describe("/api/push guard — no unauthenticated access, no demo-user fallback", () => {
  beforeEach(() => {
    suspendedUserIds.clear();
    activeStatusCache.clear();
    vi.clearAllMocks();
    mockDbStatus("active");
  });

  it("rejects unauthenticated POST /api/push/subscribe with 401", async () => {
    const response = await supertest(withNoAuth())
      .post("/api/push/subscribe")
      .send({ endpoint: "https://push.example/abc", keys: { p256dh: "a", auth: "b" } });

    expect(response.status).toBe(401);
    expect(storage.createPushSubscription).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated GET /api/push/subscriptions with 401", async () => {
    const response = await supertest(withNoAuth()).get("/api/push/subscriptions");

    expect(response.status).toBe(401);
    expect(storage.getPushSubscriptions).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated POST /api/push/verify with 401", async () => {
    const response = await supertest(withNoAuth())
      .post("/api/push/verify")
      .send({ endpoint: "https://push.example/abc" });

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated POST /api/push/test with 401", async () => {
    const response = await supertest(withNoAuth()).post("/api/push/test");

    expect(response.status).toBe(401);
  });

  it("rejects unauthenticated POST /api/push/sync with 401", async () => {
    const response = await supertest(withNoAuth()).post("/api/push/sync");

    expect(response.status).toBe(401);
  });

  it("uses the real session user id, never 'demo-user', when subscribing", async () => {
    const response = await supertest(withSession("user-abc"))
      .post("/api/push/subscribe")
      .send({ endpoint: "https://push.example/abc", keys: { p256dh: "a", auth: "b" } });

    expect(response.status).toBe(200);
    expect(storage.createPushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-abc" }),
    );
  });

  it("allows an OAuth-authenticated user (no session.user) to subscribe using their real id", async () => {
    const response = await supertest(withOAuthUser("oauth-user-1"))
      .post("/api/push/subscribe")
      .send({ endpoint: "https://push.example/xyz", keys: { p256dh: "a", auth: "b" } });

    expect(response.status).toBe(200);
    expect(storage.createPushSubscription).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "oauth-user-1" }),
    );
  });

  it("scopes GET /api/push/subscriptions to the authenticated user's own id", async () => {
    const response = await supertest(withSession("user-scope-check")).get(
      "/api/push/subscriptions",
    );

    expect(response.status).toBe(200);
    expect(storage.getPushSubscriptions).toHaveBeenCalledWith("user-scope-check");
  });
});
