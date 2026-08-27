/**
 * HTTP-level tests: unified team-capacity race condition
 *
 * Covers:
 *  - POST /api/contractor/invite-tech — atomic row-locked (FOR UPDATE on the
 *    company row) transaction closes the read-count-then-insert race that
 *    previously let two concurrent invites both pass the seat-limit check and
 *    both insert, exceeding the role-agnostic 50-person ceiling.
 *  - POST /api/contractor/bulk-import — same row lock wraps the whole import;
 *    each CSV row re-checks the seat count from inside the transaction (seeing
 *    its own earlier inserts), so a partial import (some rows succeed, the
 *    rest rejected once the limit is hit) is correctly reported and no
 *    concurrent request (another import, or a single invite) can interleave.
 *  - Tech, admin, manager, and dispatcher invitations share the same ceiling.
 *  - Legacy role-specific company/plan limits no longer affect admission.
 *  - Normal single-invite and bulk-import behavior remains intact.
 *
 * NOTE: registerRoutes() performs its own startup seeding (subscription
 * plans, etc.) via db.insert/db.update, so this file's mocks dispatch by the
 * `table` object identity passed to `.from()`/`.insert()`/`.update()` rather
 * than relying on raw call counts or call order, which would be polluted by
 * that unrelated seeding traffic.
 */

import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted — fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  COMPANY_ID,
  ADMIN_ID,
  mockGetUser,
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbExecute,
} = vi.hoisted(() => ({
  COMPANY_ID: "company-race-001",
  ADMIN_ID: "admin-race-001",
  mockGetUser: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbExecute: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function adminSession(overrides: Record<string, unknown> = {}) {
  return {
    id: ADMIN_ID,
    role: "contractor",
    companyId: COMPANY_ID,
    companyRole: "owner",
    email: "owner@example.com",
    firstName: "Owner",
    subscriptionPlanId: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      if (req.session?.user) return next();
      return _res.status(401).json({ message: "Unauthorized" });
    }),
  };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      getCompany: vi.fn().mockResolvedValue({ id: COMPANY_ID, tier: "contractor_business", bulkImportEnabled: true }),
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue(undefined), end: vi.fn() },
  db: {
    insert: mockDbInsert,
    select: mockDbSelect,
    update: mockDbUpdate,
    execute: mockDbExecute,
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) =>
      cb({
        execute: mockDbExecute,
        select: mockDbSelect,
        insert: mockDbInsert,
        update: mockDbUpdate,
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      })
    ),
  },
}));

vi.mock("../geocoding-service", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
  calculateDistance: vi.fn().mockReturnValue(0),
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

const mockSendTechInviteEmail = vi.fn().mockResolvedValue(undefined);
vi.mock("../email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailService: {
    send: vi.fn().mockResolvedValue(undefined),
    sendTechInviteEmail: (...args: any[]) => mockSendTechInviteEmail(...args),
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
    uploadFile = vi.fn().mockResolvedValue(undefined);
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
vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: vi.fn() } };
  },
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

// ---------------------------------------------------------------------------
// Imports — placed AFTER vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import { companies, subscriptionPlans, users, companyBulkImports } from "@workspace/db";

async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const raw = req.headers["x-test-session"];
    if (raw && typeof raw === "string") {
      req.session = { isAuthenticated: true, user: JSON.parse(Buffer.from(raw, "base64").toString("utf8")) };
    } else {
      req.session = {};
    }
    next();
  });
  await registerRoutes(app);
  return app;
}

function sessionHeader(session: Record<string, unknown>) {
  return Buffer.from(JSON.stringify(session)).toString("base64");
}

// ---------------------------------------------------------------------------
// Shared DB-state router
//
// Dispatches every db.select()/insert()/update() call by the `table` object
// identity passed to .from()/into it, so the same mock correctly serves the
// company row lookup, plan row lookup, active-tech-count query, per-email
// existing-user lookup, and requireNotSuspended's own status check, without
// depending on call order (essential once concurrency tests interleave
// requests).
// ---------------------------------------------------------------------------

interface SeatState {
  actorCompanyRole: "owner" | "admin";
  companyMaxTechSeats: number | null | undefined; // legacy value, intentionally ignored
  planIncludedTechSeats: number | null; // legacy value, intentionally ignored
  additionalSeatPrice: string | null; // legacy value, intentionally ignored
  techIds: string[]; // all reserved company-member ids, including the owner and pending invites
  existingUsersByEmail: Record<string, any>;
}

function freshState(overrides: Partial<SeatState> = {}): SeatState {
  return {
    actorCompanyRole: "owner",
    companyMaxTechSeats: undefined,
    planIncludedTechSeats: null,
    additionalSeatPrice: null,
    techIds: [],
    existingUsersByEmail: {},
    ...overrides,
  };
}

/** Wraps a promise so callers may either `await` it directly or chain `.limit(n)`. */
function hybrid(promise: Promise<any>) {
  return {
    then: (onRes: any, onRej: any) => promise.then(onRes, onRej),
    catch: (onRej: any) => promise.catch(onRej),
    limit: () => promise,
  };
}

function wireDbMocks(state: SeatState, capturedInserts: any[]) {
  mockDbSelect.mockImplementation((projection?: any) => ({
    from: (table: any) => ({
      where: (..._args: any[]) => {
        if (table === companies) {
          return hybrid(Promise.resolve([{ id: COMPANY_ID, name: "Acme Co", maxTechSeats: state.companyMaxTechSeats ?? null }]));
        }
        if (table === subscriptionPlans) {
          return hybrid(Promise.resolve([{ id: "plan-1", includedTechSeats: state.planIncludedTechSeats, additionalSeatPrice: state.additionalSeatPrice }]));
        }
        if (table === users) {
          if (projection && "status" in projection && Object.keys(projection).length === 1) {
            // requireNotSuspended / getUserStatusCached / recheckSuspensionFromDb
            return hybrid(Promise.resolve([{ status: "active" }]));
          }
          if (projection && "count" in projection) {
            return hybrid(Promise.resolve([{ count: state.techIds.length }]));
          }
          if (projection && "companyRole" in projection && Object.keys(projection).length === 1) {
            return hybrid(Promise.resolve([{ companyRole: state.actorCompanyRole }]));
          }
          if (projection && "id" in projection && Object.keys(projection).length === 1) {
            return hybrid(Promise.resolve(state.techIds.map((id) => ({ id }))));
          }
          // existing-user-by-email lookup (bare select())
          return hybrid(Promise.resolve([]));
        }
        return hybrid(Promise.resolve([]));
      },
    }),
  }));

  mockDbInsert.mockImplementation((table: any) => ({
    values: (payload: any) => {
      if (table === companyBulkImports) {
        return { returning: () => Promise.resolve([{ id: "import-1", ...payload }]) };
      }
      if (table === users) {
        capturedInserts.push(payload);
        state.techIds.push(payload.id);
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    },
  }));

  mockDbUpdate.mockImplementation(() => ({
    set: () => ({ where: () => Promise.resolve(undefined) }),
  }));
}

/** Serializes concurrent db.transaction() calls through a queue, mirroring
 * what a real Postgres `SELECT ... FOR UPDATE` on the company row guarantees:
 * the second request's transaction body only begins once the first has fully
 * committed. */
async function withSerializedTransactions<T>(fn: () => Promise<T>): Promise<T> {
  let lockQueue: Promise<void> = Promise.resolve();
  const { db } = await import("../db");
  (db.transaction as any).mockImplementation(async (cb: (tx: any) => Promise<any>) => {
    const myTurn = lockQueue;
    let releaseNext!: () => void;
    lockQueue = new Promise((resolve) => { releaseNext = resolve; });
    await myTurn;
    try {
      return await cb({
        execute: mockDbExecute,
        select: (...args: any[]) => (mockDbSelect as any)(...args),
        insert: (...args: any[]) => (mockDbInsert as any)(...args),
        update: (...args: any[]) => (mockDbUpdate as any)(...args),
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      });
    } finally {
      releaseNext();
    }
  });
  return fn();
}

beforeEach(() => {
  mockDbExecute.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/contractor/invite-tech — seat-limit race condition", () => {
  it("allows a normal single invite under the limit", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: 3, techIds: ["owner"] });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/invite-team-member")
      .set("x-test-session", sessionHeader(adminSession()))
      .send({ email: "newtech@example.com", role: "tech" });

    expect(res.status).toBe(200);
    expect(captured.some((c) => c.email === "newtech@example.com")).toBe(true);
    expect(mockSendTechInviteEmail).toHaveBeenCalledTimes(1);
  });

  it("allows an owner to invite an admin", async () => {
    const app = await buildApp();
    const state = freshState({ actorCompanyRole: "owner", techIds: ["owner"] });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/invite-team-member")
      .set("x-test-session", sessionHeader(adminSession()))
      .send({ email: "newadmin@example.com", role: "admin" });

    expect(res.status).toBe(200);
    expect(captured[0]).toMatchObject({ email: "newadmin@example.com", companyRole: "admin" });
  });

  it("prevents an admin from inviting another admin", async () => {
    const app = await buildApp();
    const state = freshState({ actorCompanyRole: "admin", techIds: ["owner", "admin"] });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/invite-team-member")
      .set("x-test-session", sessionHeader(adminSession({ companyRole: "admin" })))
      .send({ email: "blocked-admin@example.com", role: "admin" });

    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/only the company owner/i);
    expect(captured).toHaveLength(0);
  });

  it("blocks a normal single invite already at the limit", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: 2, techIds: Array.from({ length: 50 }, (_, i) => `member-${i}`) });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/invite-tech")
      .set("x-test-session", sessionHeader(adminSession()))
      .send({ email: "newtech@example.com", role: "tech" });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe("SEAT_LIMIT_REACHED");
    expect(captured).toHaveLength(0);
  });

  it("ignores a legacy company.maxTechSeats override and enforces the unified ceiling", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: 100, techIds: Array.from({ length: 50 }, (_, i) => `t${i}`) });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/invite-tech")
      .set("x-test-session", sessionHeader(adminSession()))
      .send({ email: "newtech@example.com", role: "tech" });

    expect(res.status).toBe(400);
    expect(res.body.maxSeats).toBe(50);
    expect(captured).toHaveLength(0);
  });

  it("counts every invited role against the same unified ceiling", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: null, planIncludedTechSeats: 2, techIds: Array.from({ length: 49 }, (_, i) => `member-${i}`) });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/invite-tech")
      .set("x-test-session", sessionHeader(adminSession({ subscriptionPlanId: "plan-1" })))
      .send({ email: "newmanager@example.com", role: "manager" });

    expect(res.status).toBe(200);
    expect(captured[0]).toMatchObject({ email: "newmanager@example.com", companyRole: "manager" });
    expect(state.techIds).toHaveLength(50);
  });

  it("uses the same fixed ceiling when no legacy company or plan limit exists", async () => {
    const app = await buildApp();
    // No company override (undefined -> null from DB), no plan attached at all.
    const state = freshState({ companyMaxTechSeats: undefined, planIncludedTechSeats: null, techIds: Array.from({ length: 50 }, (_, i) => `member-${i}`) });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/invite-tech")
      .set("x-test-session", sessionHeader(adminSession({ subscriptionPlanId: null })))
      .send({ email: "newtech@example.com", role: "tech" });

    expect(res.status).toBe(400);
    expect(res.body.maxSeats).toBe(50);
  });

  it("never lets two concurrent invites both exceed the seat limit (real Promise.all race)", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: 2, techIds: Array.from({ length: 49 }, (_, i) => `member-${i}`) }); // 1 place available
    const captured: any[] = [];
    wireDbMocks(state, captured);
    await withSerializedTransactions(async () => {});

    const session = adminSession();
    const [res1, res2] = await Promise.all([
      request(app).post("/api/contractor/invite-tech").set("x-test-session", sessionHeader(session)).send({ email: "tech-a@example.com", role: "tech" }),
      request(app).post("/api/contractor/invite-tech").set("x-test-session", sessionHeader(session)).send({ email: "tech-b@example.com", role: "tech" }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 400]);
    const failed = res1.status === 400 ? res1 : res2;
    expect(failed.body.code).toBe("SEAT_LIMIT_REACHED");

    // Exactly one insert ever happened, never both.
    expect(captured).toHaveLength(1);
    expect(state.techIds).toHaveLength(50);
  });
});

describe("POST /api/contractor/bulk-import — seat-limit race condition", () => {
  function csvBuffer(emails: string[]) {
    const lines = ["email,firstName,lastName", ...emails.map((e, i) => `${e},First${i},Last${i}`)];
    return Buffer.from(lines.join("\n"), "utf-8");
  }

  it("imports all rows when comfortably under the limit", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: 5, techIds: ["owner"] });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach("file", csvBuffer(["a@example.com", "b@example.com", "c@example.com"]), "techs.csv");

    expect(res.status).toBe(200);
    expect(res.body.successRows).toBe(3);
    expect(res.body.failedRows).toBe(0);
    expect(state.techIds).toHaveLength(4);
  });

  it("imports only up to the available seat count and reports the rest as failed (partial import)", async () => {
    const app = await buildApp();
    // Unified ceiling=50, 48 places already reserved -> 2 available.
    const state = freshState({ companyMaxTechSeats: 3, techIds: Array.from({ length: 48 }, (_, i) => `member-${i}`) });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach(
        "file",
        csvBuffer(["a@example.com", "b@example.com", "c@example.com", "d@example.com", "e@example.com"]),
        "techs.csv"
      );

    expect(res.status).toBe(200);
    expect(res.body.totalRows).toBe(5);
    expect(res.body.successRows).toBe(2);
    expect(res.body.failedRows).toBe(3);
    expect(res.body.errors.filter((e: any) => /team capacity reached/i.test(e.error))).toHaveLength(3);
    // Only the first two rows (in file order) got the available seats.
    expect(captured.map((c) => c.email)).toEqual(["a@example.com", "b@example.com"]);
    expect(mockSendTechInviteEmail).toHaveBeenCalledTimes(2);
  });

  it("uses the same fixed ceiling as invite-tech when legacy limits are absent", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: undefined, planIncludedTechSeats: null, techIds: Array.from({ length: 50 }, (_, i) => `member-${i}`) });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession({ subscriptionPlanId: null })))
      .attach("file", csvBuffer(["a@example.com"]), "techs.csv");

    expect(res.status).toBe(200);
    expect(res.body.successRows).toBe(0);
    expect(res.body.failedRows).toBe(1);
    expect(res.body.errors[0].error).toMatch(/team capacity reached \(50\)/i);
  });

  it("does not let a legacy high company.maxTechSeats override bypass the unified ceiling", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: 100, techIds: Array.from({ length: 50 }, (_, i) => `t${i}`) });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach("file", csvBuffer(["a@example.com", "b@example.com"]), "techs.csv");

    expect(res.status).toBe(200);
    expect(res.body.successRows).toBe(0);
    expect(res.body.failedRows).toBe(2);
  });

  it("allows an import below the unified ceiling regardless of a smaller legacy plan value", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: null, planIncludedTechSeats: 1, techIds: ["owner"] });
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession({ subscriptionPlanId: "plan-1" })))
      .attach("file", csvBuffer(["a@example.com"]), "techs.csv");

    expect(res.status).toBe(200);
    expect(res.body.successRows).toBe(1);
    expect(res.body.failedRows).toBe(0);
  });

  it("never lets a concurrent bulk import and single invite together exceed the seat limit (real Promise.all race)", async () => {
    const app = await buildApp();
    const state = freshState({ companyMaxTechSeats: 2, techIds: Array.from({ length: 49 }, (_, i) => `member-${i}`) }); // 1 place available
    const captured: any[] = [];
    wireDbMocks(state, captured);
    await withSerializedTransactions(async () => {});

    const session = adminSession();
    const [importRes, inviteRes] = await Promise.all([
      request(app)
        .post("/api/contractor/bulk-import")
        .set("x-test-session", sessionHeader(session))
        .attach("file", csvBuffer(["bulk-a@example.com"]), "techs.csv"),
      request(app)
        .post("/api/contractor/invite-tech")
        .set("x-test-session", sessionHeader(session))
        .send({ email: "single-b@example.com", role: "tech" }),
    ]);

    // Exactly one of the two ever claims the single remaining seat.
    expect(state.techIds).toHaveLength(50);
    expect(captured).toHaveLength(1);

    const bulkGotSeat = importRes.body.successRows === 1;
    const inviteGotSeat = inviteRes.status === 200;
    expect(bulkGotSeat !== inviteGotSeat).toBe(true); // exactly one, never both, never neither

    if (!bulkGotSeat) {
      expect(importRes.body.failedRows).toBe(1);
      expect(importRes.body.errors[0].error).toMatch(/team capacity reached/i);
    }
    if (!inviteGotSeat) {
      expect(inviteRes.status).toBe(400);
      expect(inviteRes.body.code).toBe("SEAT_LIMIT_REACHED");
    }
  });
});
