/**
 * HTTP-level integration tests: rate limiting on the six public demo-login
 * routes (homeowner/contractor/agent, GET + POST).
 *
 * Background: these routes previously relied solely on `authLimiter`, which
 * uses `skipSuccessfulRequests: true` — a no-op here since demo logins almost
 * always succeed. A new `demoLoginLimiter` (separate PgRateLimitStore bucket,
 * counts every request) now caps repeated calls per IP.
 *
 * Covers:
 *   1. A handful of legitimate calls from one IP are never blocked.
 *   2. Sustained rapid calls from one IP get throttled once the limit is hit.
 *   3. The limit is shared across all six demo-login routes per IP (one
 *      exhausted role blocks the others from that same IP).
 *   4. Real login (`/api/auth/login`) is unaffected by the new limiter —
 *      it isn't mounted there, and `authLimiter`'s own config/behavior for
 *      real auth routes is untouched.
 */

import { vi, describe, it, expect, afterEach, beforeAll, afterAll } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const {
  mockGetUserByEmail,
  mockGetUser,
  mockUpsertUser,
  mockSeedHomeowner,
  mockSeedContractor,
  mockSeedAgent,
  mockTopUp,
  mockTransactionClient,
  ratelimitPool,
} = vi.hoisted(() => {
  // A minimal in-memory stand-in for the real Postgres-backed rate-limit
  // table. PgRateLimitStore issues raw SQL against `pool` (not the drizzle
  // `db` object), so this mock recognizes its statements by substring and
  // keeps per-key hit counts in memory — giving deterministic, isolated
  // tests without depending on a real database or leaking state across runs.
  function createRateLimitPoolMock() {
    const hits = new Map<string, number>();
    return {
      query: async (sql: string, params?: any[]) => {
        if (typeof sql === "string" && sql.includes("express_rate_limits")) {
          if (sql.trim().startsWith("INSERT")) {
            const key = params?.[0];
            const next = (hits.get(key) ?? 0) + 1;
            hits.set(key, next);
            return { rows: [{ hits: String(next) }] };
          }
          if (sql.trim().startsWith("DELETE")) {
            return { rows: [] };
          }
        }
        return { rows: [] };
      },
      end: async () => {},
    };
  }

  return {
    mockGetUserByEmail: vi.fn(),
    mockGetUser: vi.fn(),
    mockUpsertUser: vi.fn(),
    mockSeedHomeowner: vi.fn(),
    mockSeedContractor: vi.fn(),
    mockSeedAgent: vi.fn(),
    mockTopUp: vi.fn().mockResolvedValue(undefined),
    mockTransactionClient: { transactionScoped: true },
    ratelimitPool: createRateLimitPoolMock(),
  };
});

const HOMEOWNER_USER = {
  id: "demo-homeowner-permanent-id",
  email: "sarah.anderson@homebase.com",
  role: "homeowner",
  subscriptionStatus: "trialing",
};
const CONTRACTOR_USER = {
  id: "demo-contractor-permanent-id",
  email: "david.martinez@precisionhvac.com",
  role: "contractor",
  subscriptionStatus: "grandfathered",
};
const AGENT_USER = {
  id: "demo-agent-permanent-id",
  email: "jessica.roberts@ellisonrealty.com",
  role: "agent",
  subscriptionStatus: "active",
};

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  const session = (await import("express-session")).default;
  // Demo-login routes call `req.session.regenerate(...)` /
  // `req.session.save(...)`, so the test app needs a real (in-memory)
  // express-session instance rather than a no-op setupAuth stub.
  const sess = session({
    secret: process.env.SESSION_SECRET ?? "test-secret-for-ci",
    resave: false,
    saveUninitialized: false,
  });
  return {
    ...actual,
    setupAuth: async (app: any) => {
      app.use(sess);
    },
    getSession: () => sess,
    isAuthenticated: vi.fn((_req: any, res: any) => res.status(401).json({ message: "Unauthorized" })),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    evictStatusCache: vi.fn(),
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
  sendCheckoutFailureEmail: vi.fn().mockResolvedValue(undefined),
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
    uploadFile = vi.fn();
    download = vi.fn();
    delete = vi.fn();
    deleteFile = vi.fn();
    getSignedUrl = vi.fn();
    getUploadUrl = vi.fn();
    deleteObject = vi.fn();
    getObject = vi.fn();
    putObject = vi.fn();
    listObjects = vi.fn();
    searchPublicObject = vi.fn();
    downloadObject = vi.fn();
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
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }),
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

vi.mock("../demo-seeder", () => ({
  seedHomeownerDemo: mockSeedHomeowner,
  seedContractorDemo: mockSeedContractor,
  seedAgentDemo: mockSeedAgent,
  topUpHomeownerTaskCompletions: mockTopUp,
}));

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUserByEmail: mockGetUserByEmail,
      getUser: mockGetUser,
      upsertUser: mockUpsertUser,
    }),
  };
});

vi.mock("../db", () => ({
  pool: ratelimitPool,
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback(mockTransactionClient)),
  },
}));

// ---------------------------------------------------------------------------
// Imports — after vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import pinoHttp from "pino-http";
import { logger } from "../lib/logger";
import { registerRoutes } from "./routes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildApp() {
  const app = express();
  app.set("trust proxy", 1); // mirrors production app.ts so X-Forwarded-For drives req.ip
  // Demo-login handlers call req.log.info/.warn — mirror app.ts's pino-http
  // wiring so those calls don't throw in tests.
  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: "10mb" }));
  await registerRoutes(app);
  return app;
}

function demoLoginPost(app: any, ip: string) {
  return request(app).post("/api/auth/homeowner-demo-login").set("X-Forwarded-For", ip);
}

function contractorDemoLoginPost(app: any, ip: string) {
  return request(app).post("/api/auth/contractor-demo-login").set("X-Forwarded-For", ip);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Demo-login rate limiting", () => {
  // demoLoginLimiter mirrors `generalLimiter` in app.ts: it only enforces in
  // production (dev/test traffic — including real-DB integration tests like
  // demo-seeder.test.ts that call these routes directly — stays unthrottled).
  // This suite exists specifically to exercise that production behavior, so
  // it forces NODE_ENV="production" for its duration and restores it after.
  const originalNodeEnv = process.env.NODE_ENV;
  beforeAll(() => {
    process.env.NODE_ENV = "production";
  });
  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  afterEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue(HOMEOWNER_USER);
    mockSeedHomeowner.mockResolvedValue({ user: HOMEOWNER_USER, seedResults: {} });
    mockSeedContractor.mockResolvedValue({ user: CONTRACTOR_USER, seedResults: {} });
    mockSeedAgent.mockResolvedValue({ user: AGENT_USER, seedResults: {} });
  });

  it("allows a handful of occasional demo-login calls from the same IP", async () => {
    mockSeedHomeowner.mockResolvedValue({ user: HOMEOWNER_USER, seedResults: {} });
    const app = await buildApp();
    const ip = "203.0.113.10";

    for (let i = 0; i < 5; i++) {
      const res = await demoLoginPost(app, ip);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it("runs homeowner and contractor setup with the transaction-scoped client", async () => {
    const app = await buildApp();

    const homeownerResponse = await demoLoginPost(app, "203.0.113.11");
    const contractorResponse = await contractorDemoLoginPost(app, "203.0.113.12");

    expect(homeownerResponse.status).toBe(200);
    expect(contractorResponse.status).toBe(200);
    expect(mockSeedHomeowner).toHaveBeenCalledWith(expect.anything(), mockTransactionClient);
    expect(mockSeedContractor).toHaveBeenCalledWith(expect.anything(), mockTransactionClient);
  });

  it("aborts login when transactional setup fails", async () => {
    mockSeedHomeowner.mockRejectedValueOnce(new Error("mid-seed failure"));
    mockSeedContractor.mockRejectedValueOnce(new Error("mid-seed failure"));
    const app = await buildApp();

    const homeownerResponse = await demoLoginPost(app, "203.0.113.13");
    const contractorResponse = await contractorDemoLoginPost(app, "203.0.113.14");

    expect(homeownerResponse.status).toBe(500);
    expect(contractorResponse.status).toBe(500);
    expect(homeownerResponse.body.message).toBe("Failed to create homeowner account");
    expect(contractorResponse.body.message).toBe("Failed to create contractor account");
  });

  it("keeps the homeowner logged in and reports a failed seeding section", async () => {
    process.env.NODE_ENV = "test";
    mockGetUser.mockResolvedValue(HOMEOWNER_USER);
    mockSeedHomeowner.mockResolvedValueOnce({
      user: HOMEOWNER_USER,
      seedResults: {
        mainHouse: { ok: true },
        lakeHouse: { ok: true },
        taskCompletions: { ok: false, error: "simulated storage failure" },
      },
    });
    const app = await buildApp();
    const agent = request.agent(app);

    try {
      const loginResponse = await agent
        .post("/api/auth/homeowner-demo-login")
        .set("X-Forwarded-For", "203.0.113.15");

      expect(loginResponse.status).toBe(200);
      expect(loginResponse.body.success).toBe(true);
      expect(loginResponse.body._seedStatus.failedSections).toEqual(["taskCompletions"]);
      expect(loginResponse.headers["set-cookie"]).toBeDefined();

      const sessionResponse = await agent.get("/api/user");
      expect(sessionResponse.status).toBe(200);
      expect(sessionResponse.body.id).toBe(HOMEOWNER_USER.id);
    } finally {
      process.env.NODE_ENV = "production";
    }
  });

  it("throttles sustained rapid demo-login calls from the same IP once the limit is exceeded", async () => {
    mockSeedHomeowner.mockResolvedValue({ user: HOMEOWNER_USER, seedResults: {} });
    const app = await buildApp();
    const ip = "203.0.113.20";

    const statuses: number[] = [];
    for (let i = 0; i < 25; i++) {
      const res = await demoLoginPost(app, ip);
      statuses.push(res.status);
    }

    const allowed = statuses.filter((s) => s === 200);
    const blocked = statuses.filter((s) => s === 429);

    // Exactly the configured limit (20) should succeed; the rest are blocked.
    expect(allowed.length).toBe(20);
    expect(blocked.length).toBe(5);

    // The blocked responses must carry a clear, user-facing message.
    const lastRes = await demoLoginPost(app, ip);
    expect(lastRes.status).toBe(429);
    expect(lastRes.body.message).toMatch(/too many demo login attempts/i);
  });

  it("shares the rate limit across all six demo-login routes for the same IP", async () => {
    mockSeedHomeowner.mockResolvedValue({ user: HOMEOWNER_USER, seedResults: {} });
    mockGetUserByEmail.mockImplementation(async (email: string) => {
      if (email === CONTRACTOR_USER.email) return CONTRACTOR_USER;
      return undefined;
    });
    const app = await buildApp();
    const ip = "203.0.113.30";

    // Exhaust the shared bucket via the homeowner POST route.
    for (let i = 0; i < 20; i++) {
      const res = await demoLoginPost(app, ip);
      expect(res.status).toBe(200);
    }

    // A different demo-login route, same IP, should now also be blocked —
    // proving the limit is per-IP across the whole demo-login surface, not
    // per-route (a script can't dodge the limit by rotating between roles).
    const contractorRes = await request(app)
      .get("/api/auth/contractor-demo-login")
      .set("X-Forwarded-For", ip);
    expect(contractorRes.status).toBe(429);
  });

  it("does not affect real email/password login — different route, different limiter behavior", async () => {
    const app = await buildApp();
    const ip = "203.0.113.40";

    // Exhaust the demo-login-specific limiter for this IP.
    mockSeedHomeowner.mockResolvedValue({ user: HOMEOWNER_USER, seedResults: {} });
    for (let i = 0; i < 21; i++) {
      await demoLoginPost(app, ip);
    }
    const exhausted = await demoLoginPost(app, ip);
    expect(exhausted.status).toBe(429);

    // Real login from the SAME IP must not be blocked by the demo-login
    // limiter — it isn't mounted on /api/auth/login at all.
    mockGetUserByEmail.mockResolvedValueOnce(undefined); // simulate unknown user
    const loginRes = await request(app)
      .post("/api/auth/login")
      .set("X-Forwarded-For", ip)
      .send({ email: "someone@example.com", password: "wrong-password" });

    // 401 (invalid credentials) — NOT 429. Confirms real login is unaffected.
    expect(loginRes.status).toBe(401);
    expect(loginRes.body.message).toBe("Invalid credentials");
  });

  it("logs demo-login attempts for visibility (does not throw when req.log is present)", async () => {
    mockSeedAgent.mockResolvedValue({ user: AGENT_USER, seedResults: {} });
    const app = await buildApp();
    const res = await request(app)
      .post("/api/auth/agent-demo-login")
      .set("X-Forwarded-For", "203.0.113.50");
    expect(res.status).toBe(200);
  });
});
