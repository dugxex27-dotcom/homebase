/**
 * Integration test: cold-cache lockout after a simulated server restart
 *
 * Task #395 — the restart-gap fix relies on `isAuthenticated` calling
 * `getUserStatusCached`, which falls through to the DB when the in-memory
 * `userStatusCache` is cold. This test exercises the *real* `isAuthenticated`
 * middleware (not mocked) against the real Express app and the real
 * database, and simulates a server restart by explicitly evicting the
 * in-memory cache entry after suspending the user.
 *
 * Flow:
 *   1. Create a real user row (status: active) via storage against the real DB.
 *   2. Log in via POST /api/auth/login to obtain a real, valid session cookie.
 *   3. Confirm the session cookie can reach a protected route (200/302, not 401).
 *   4. Suspend the user directly in the DB (bypassing any app-level cache
 *      invalidation, to model an out-of-band or delayed status change).
 *   5. Evict the in-memory status cache entry for that user — this is what a
 *      cold cache looks like immediately after a server restart.
 *   6. Replay the *same* (now-stale) session cookie against the protected
 *      route and assert the request is rejected with 401.
 *
 * Only `setupAuth` is replaced (network-dependent OIDC discovery + Postgres
 * session store swapped for an in-memory session store) — `isAuthenticated`,
 * `evictStatusCache`, and the rest of `replitAuth` run unmocked so the real
 * restart-gap fix is under test. Heavy third-party integrations (Stripe,
 * email/SMS, push, object storage, OpenAI, etc.) are mocked since they are
 * unrelated to this code path.
 */

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// ---------------------------------------------------------------------------
// Partial-mock replitAuth: keep the real isAuthenticated/evictStatusCache
// implementation, but replace setupAuth with a lightweight in-memory-session
// version so the test doesn't need live Replit OIDC discovery or a
// connect-pg-simple session table.
// ---------------------------------------------------------------------------
vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  const session = (await import("express-session")).default;

  return {
    ...actual,
    setupAuth: async (app: any) => {
      const sess = session({
        secret: process.env.SESSION_SECRET ?? "test-secret-for-ci",
        resave: false,
        saveUninitialized: false,
      });
      app.set("sessionParser", sess);
      app.use(sess);
    },
    getSession: () =>
      session({
        secret: process.env.SESSION_SECRET ?? "test-secret-for-ci",
        resave: false,
        saveUninitialized: false,
      }),
  };
});

// ---------------------------------------------------------------------------
// Mocks for unrelated heavy/external dependencies
// ---------------------------------------------------------------------------

vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn() };
    this.accounts = { retrieve: vi.fn().mockResolvedValue({}) };
  }
  return { default: MockStripe };
});

vi.mock("../googleAuth", () => ({
  setupGoogleAuth: vi.fn(),
}));

vi.mock("ws", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ws")>();
  return {
    ...actual,
    WebSocketServer: class MockWss {
      on() {}
      clients = new Set();
    },
    WebSocket: { OPEN: 1 },
  };
});

vi.mock("../push-routes", () => ({ default: vi.fn() }));
vi.mock("../push-service", () => ({
  pushService: new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock("../notification-orchestrator", () => ({
  notificationOrchestrator: new Proxy(
    {},
    { get: () => vi.fn().mockResolvedValue(undefined) },
  ),
}));
vi.mock("../email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailService: new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock("../sms-service", () => ({
  smsService: new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) }),
}));
vi.mock("../apple-iap", () => ({
  verifyAndActivateAppleTransaction: vi.fn().mockResolvedValue(undefined),
  handleAppleServerNotification: vi.fn().mockResolvedValue(undefined),
  AppleIapError: class AppleIapError extends Error {},
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
vi.mock("../objectStorage", () => ({
  ObjectStorageService: class MockObjectStorageService {
    getObjectEntityUploadURL = vi.fn().mockResolvedValue("https://example.test/upload");
    getObjectEntityFile = vi.fn();
    downloadObject = vi.fn();
  },
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
}));

// ---------------------------------------------------------------------------
// Real imports (after mocks are in place) — real app, real DB
// ---------------------------------------------------------------------------

import supertest from "supertest";
import type { Server } from "http";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import app from "../app";
import { registerRoutes } from "./routes";
import { storage } from "../storage";
import { db } from "../db";
import { users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { evictStatusCache } from "../replitAuth";

let server: Server;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  server = await registerRoutes(app);
  request = supertest(app);
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("suspended user is locked out immediately after a simulated server restart", () => {
  const email = `restart-gap-${randomUUID()}@example.test`;
  const password = "correct-horse-battery-staple";
  let userId: string;

  it("logs in successfully while active and creates a real session", async () => {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await storage.createUserWithPassword({
      email,
      passwordHash,
      firstName: "Restart",
      lastName: "Gap",
      role: "homeowner",
      zipCode: "78701",
    });
    userId = user.id;

    const agent = supertest.agent(app);
    const loginRes = await agent
      .post("/api/auth/login")
      .send({ email, password })
      .set("Content-Type", "application/json");

    expect(loginRes.status).toBe(200);

    // Sanity check: with a fresh, active session the protected route succeeds.
    const okRes = await agent
      .post("/api/objects/upload")
      .send({ fileType: "proposal" })
      .set("Content-Type", "application/json");
    expect(okRes.status).toBe(200);

    (globalThis as any).__restartGapAgent = agent;
  });

  it("rejects the stale session cookie with 401 once suspended and the cache is cold", async () => {
    const agent = (globalThis as any).__restartGapAgent as ReturnType<
      typeof supertest.agent
    >;
    expect(agent).toBeTruthy();

    // Suspend the user directly in the DB — models an out-of-band status
    // change (e.g. an admin action processed by a different server instance).
    await db.update(users).set({ status: "suspended" }).where(eq(users.id, userId));

    // Simulate a server restart: the in-memory status cache is cold, so the
    // very next request must fall through to the DB and see 'suspended'.
    evictStatusCache(userId);

    const res = await agent
      .post("/api/objects/upload")
      .send({ fileType: "proposal" })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/suspended/i);
  });

  afterAll(async () => {
    if (userId) {
      await db.delete(users).where(eq(users.id, userId));
    }
  });
});
