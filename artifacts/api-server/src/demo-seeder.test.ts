/**
 * Integration test: demo seeder endpoints
 *
 * Calls POST /api/auth/contractor-demo-login and
 * POST /api/auth/homeowner-demo-login against the real database and asserts
 * every seeded section reports { ok: true }.  The response body exposes a
 * _seedStatus field when NODE_ENV !== "production", which is what we inspect.
 *
 * Why a real DB?  The original silent failure was a field-name mismatch
 * between the seeder and the actual schema.  Only a real Drizzle query
 * (not MemStorage) will surface that class of bug.
 */

import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// --- mock replitAuth before any app import ----------------------------------
// setupAuth normally does OIDC discovery (network call) + pg session store.
// We replace it with a lightweight memory-session equivalent so the test
// doesn't need a live Replit OIDC server.
vi.mock("./replitAuth", async () => {
  const session = (await import("express-session")).default;
  // Direct middleware (used as `app.get("/path", directMiddleware, handler)`)
  const noop = (_req: any, _res: any, next: any) => next();
  // Factory middleware (used as `app.get("/path", factory(), handler)`)
  const noopFactory = () => noop;

  return {
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
    // Direct middlewares (not called as functions in route definitions)
    isAuthenticated: noop,
    requirePropertyOwner: noop,
    requireDivisionAccess: noop,
    requireBulkImport: noop,
    requireApiAccess: noop,
    // Factory middlewares (called as requireXxx(...) in route definitions)
    requireRole: noopFactory,
    requireCompanyRole: noopFactory,
    requireCompanyRoleAny: noopFactory,
    requireNotSuspended: noopFactory,
    requireSameCompany: noopFactory,
    suspendedUserIds: new Set<string>(),
  };
});

// --- mock email service so no outbound email is attempted ------------------
vi.mock("./email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailService: new Proxy(
    {},
    { get: () => vi.fn().mockResolvedValue(undefined) }
  ),
}));

// --- mock push / notification services (depend on Firebase env var) --------
vi.mock("./push-service", () => ({
  pushService: new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) }),
}));

vi.mock("./notification-orchestrator", () => ({
  notificationOrchestrator: new Proxy(
    {},
    { get: () => vi.fn().mockResolvedValue(undefined) }
  ),
}));

vi.mock("./sms-service", () => ({
  smsService: new Proxy({}, { get: () => vi.fn().mockResolvedValue(undefined) }),
}));

// ---------------------------------------------------------------------------
// Real imports (after mocks are in place)
// ---------------------------------------------------------------------------
import supertest from "supertest";
import type { Server } from "http";
import app from "./app";
import { registerRoutes } from "./routes/routes";
import { db } from "./db";
import { affiliateReferrals, subscriptionCycleEvents } from "@workspace/db";
import { eq, like, count } from "drizzle-orm";

let server: Server;
let request: ReturnType<typeof supertest>;

beforeAll(async () => {
  server = await registerRoutes(app);
  request = supertest(app);
}, 60_000);

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

// ---------------------------------------------------------------------------

describe("contractor demo seeder", () => {
  it("seeds all sections without errors", async () => {
    const res = await request
      .post("/api/auth/contractor-demo-login")
      .set("Content-Type", "application/json")
      .timeout(30_000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { seedResults } = res.body._seedStatus as {
      seedResults: Record<string, { ok: boolean; error?: string }>;
      failedSections: string[];
    };

    expect(Object.keys(seedResults).length).toBeGreaterThan(0);

    for (const [section, result] of Object.entries(seedResults)) {
      expect(
        result.ok,
        `Section "${section}" failed with: ${result.error ?? "unknown error"}`
      ).toBe(true);
    }
  }, 60_000);

  it("repeated login: existing-company path runs health-check and reports ok", async () => {
    // Second login — the demo company already exists in the DB from the
    // first test, so the seeder must take the else branch and emit a
    // health-check entry instead of silently returning { ok: true }.
    const res = await request
      .post("/api/auth/contractor-demo-login")
      .set("Content-Type", "application/json")
      .timeout(30_000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { seedResults } = res.body._seedStatus as {
      seedResults: Record<string, { ok: boolean; healthCheck?: { teamMembers: number }; error?: string }>;
      failedSections: string[];
    };

    // company must be present with ok: true on repeat login
    expect(seedResults.company, "company missing from seedResults on repeat login").toBeDefined();
    expect(
      seedResults.company.ok,
      `company health-check failed: ${seedResults.company?.error}`
    ).toBe(true);

    // health-check result must carry a teamMembers count (a real DB query)
    expect(
      typeof seedResults.company.healthCheck?.teamMembers,
      "company healthCheck.teamMembers should be a number"
    ).toBe("number");

    // All other sections must also be ok
    for (const [section, result] of Object.entries(seedResults)) {
      expect(
        result.ok,
        `Section "${section}" failed with: ${result.error ?? "unknown error"}`
      ).toBe(true);
    }
  }, 60_000);
});

describe("homeowner demo seeder", () => {
  it("seeds all sections without errors", async () => {
    const res = await request
      .post("/api/auth/homeowner-demo-login")
      .set("Content-Type", "application/json")
      .timeout(30_000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { seedResults } = res.body._seedStatus as {
      seedResults: Record<string, { ok: boolean; error?: string }>;
      failedSections: string[];
    };

    expect(Object.keys(seedResults).length).toBeGreaterThan(0);

    for (const [section, result] of Object.entries(seedResults)) {
      expect(
        result.ok,
        `Section "${section}" failed with: ${result.error ?? "unknown error"}`
      ).toBe(true);
    }
  }, 60_000);

  it("repeated login: existing-house path runs health-check and reports ok", async () => {
    // Second login — main house already exists in DB from the first test, so
    // the seeder must take the "else" branch and emit a health-check entry.
    // The Lake House was intentionally removed from the demo and is never
    // recreated, so it only reports { ok: true } with no healthCheck field.
    const res = await request
      .post("/api/auth/homeowner-demo-login")
      .set("Content-Type", "application/json")
      .timeout(30_000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { seedResults } = res.body._seedStatus as {
      seedResults: Record<string, { ok: boolean; healthCheck?: { maintenanceLogs: number }; error?: string }>;
      failedSections: string[];
    };

    // mainHouse must be present with ok: true and a real health-check
    expect(seedResults.mainHouse, "mainHouse missing from seedResults on repeat login").toBeDefined();
    expect(seedResults.mainHouse.ok, `mainHouse health-check failed: ${seedResults.mainHouse?.error}`).toBe(true);
    expect(
      typeof seedResults.mainHouse.healthCheck?.maintenanceLogs,
      "mainHouse healthCheck.maintenanceLogs should be a number"
    ).toBe("number");

    // lakeHouse is intentionally removed from the demo; it reports ok: true
    // with no healthCheck (inserted: 0, expected: 0 tombstone entry).
    expect(seedResults.lakeHouse, "lakeHouse missing from seedResults on repeat login").toBeDefined();
    expect(seedResults.lakeHouse.ok, `lakeHouse health-check failed: ${seedResults.lakeHouse?.error}`).toBe(true);
  }, 60_000);
});

// ---------------------------------------------------------------------------
// Read-path: verify seeded houses are actually readable via the API
// ---------------------------------------------------------------------------
// This test catches schema mismatches that only surface on SELECT, not on
// INSERT — e.g. a renamed column that makes the write succeed but the read
// return wrong/empty data.  We use a supertest agent so the session cookie
// from demo-login is carried into the GET /api/houses call.
// ---------------------------------------------------------------------------

describe("homeowner read-path", () => {
  it("GET /api/houses returns the canonical demo main house after seeding", async () => {
    const mainHouseId = "8d44c1d0-af55-4f1c-bada-b70e54c823bc";
    // Lake House (f5c8a9d2-…) was intentionally removed from the demo and is
    // never recreated, so we only verify the Main Residence here.

    // Agent preserves Set-Cookie across requests within the same test.
    const agent = supertest.agent(app);

    const loginRes = await agent
      .post("/api/auth/homeowner-demo-login")
      .set("Content-Type", "application/json")
      .timeout(30_000);

    expect(
      loginRes.status,
      `Demo login failed with ${loginRes.status}: ${JSON.stringify(loginRes.body)}`
    ).toBe(200);
    expect(loginRes.body.success).toBe(true);

    const housesRes = await agent
      .get("/api/houses")
      .timeout(30_000);

    expect(
      housesRes.status,
      `GET /api/houses failed with ${housesRes.status}: ${JSON.stringify(housesRes.body)}`
    ).toBe(200);

    const houses = housesRes.body as Array<{ id: string; name: string }>;
    const houseIds = new Set(houses.map((h) => h.id));

    expect(
      houseIds.has(mainHouseId),
      `Main Residence (${mainHouseId}) not found in GET /api/houses — schema mismatch or insert failed`
    ).toBe(true);
  }, 60_000);
});

describe("agent demo seeder", () => {
  it("seeds all sections without errors", async () => {
    const res = await request
      .post("/api/auth/agent-demo-login")
      .set("Content-Type", "application/json")
      .timeout(30_000);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const { seedResults } = res.body._seedStatus as {
      seedResults: Record<string, { ok: boolean; error?: string }>;
      failedSections: string[];
    };

    expect(Object.keys(seedResults).length).toBeGreaterThan(0);

    for (const [section, result] of Object.entries(seedResults)) {
      expect(
        result.ok,
        `Section "${section}" failed with: ${result.error ?? "unknown error"}`
      ).toBe(true);
    }
  }, 60_000);

  it("is idempotent: running the seeder twice leaves no duplicate rows", async () => {
    const DEMO_AGENT_ID = "demo-agent-permanent-id";

    // Expected stable counts based on referralData in the seeder
    // 8 referred users → 8 referral records
    // cyclesPaid per user: 6+5+4+4+2+1+0+0 = 22 cycle events
    const EXPECTED_REFERRALS = 8;
    const EXPECTED_CYCLE_EVENTS = 22;

    // Run the seeder a second time (first run already done in the test above)
    const res = await request
      .post("/api/auth/agent-demo-login")
      .set("Content-Type", "application/json")
      .timeout(30_000);

    expect(res.status).toBe(200);

    // Count affiliate_referrals rows owned by the demo agent
    const [{ referralCount }] = await db
      .select({ referralCount: count() })
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.agentId, DEMO_AGENT_ID));

    expect(Number(referralCount)).toBe(EXPECTED_REFERRALS);

    // Count subscription_cycle_events rows seeded for demo referred users
    // (identified by their stable stripeInvoiceId prefix)
    const [{ cycleCount }] = await db
      .select({ cycleCount: count() })
      .from(subscriptionCycleEvents)
      .where(like(subscriptionCycleEvents.stripeInvoiceId, "demo_inv_%"));

    expect(Number(cycleCount)).toBe(EXPECTED_CYCLE_EVENTS);
  }, 60_000);
});

// ---------------------------------------------------------------------------
// Quiz endpoints
// These do not go through a demo-login flow; they are public endpoints that
// write directly to the quiz_results table (anonymous path) or log a lead.
// A schema mismatch or missing column would surface here as a 500 before it
// ever reached production logs.
// ---------------------------------------------------------------------------

describe("quiz demo seeder", () => {
  it("POST /api/quiz-result inserts an anonymous record without errors", async () => {
    const payload = {
      score: 72,
      tier: "Solid Foundation",
      completedAt: new Date().toISOString(),
    };

    const res = await request
      .post("/api/quiz-result")
      .set("Content-Type", "application/json")
      .send(payload)
      .timeout(30_000);

    expect(
      res.status,
      `Expected 201 but got ${res.status}: ${JSON.stringify(res.body)}`
    ).toBe(201);

    // The endpoint returns the full inserted record; assert the shape matches
    // the quiz_results schema so column renames are caught immediately.
    const record = res.body as Record<string, unknown>;
    expect(typeof record.id).toBe("string");
    expect(record.score).toBe(payload.score);
    expect(record.tier).toBe(payload.tier);
    // userId is nullable for anonymous completions
    expect(Object.prototype.hasOwnProperty.call(record, "userId")).toBe(true);
    expect(Object.prototype.hasOwnProperty.call(record, "createdAt")).toBe(true);
  }, 60_000);

  it("POST /api/demo-lead accepts a valid lead without errors", async () => {
    const payload = {
      name: "Test Visitor",
      email: "ci-test-lead@homebase.com",
      zipcode: "90210",
      role: "homeowner",
    };

    const res = await request
      .post("/api/demo-lead")
      .set("Content-Type", "application/json")
      .send(payload)
      .timeout(30_000);

    expect(
      res.status,
      `Expected 200 but got ${res.status}: ${JSON.stringify(res.body)}`
    ).toBe(200);

    expect(res.body.ok).toBe(true);
  }, 60_000);
});
