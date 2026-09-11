/**
 * HTTP-level tests: house-count-vs-plan-limit race condition fix
 *
 * Covers:
 *  - POST /api/houses — atomic row-locked (FOR UPDATE) transaction closes the
 *    read-count-then-insert race that previously let two concurrent requests
 *    both pass the plan limit check and both insert, exceeding the plan's
 *    maxHousesAllowed.
 *  - POST /api/house-transfers/:id/accept — same row-locked transaction,
 *    plus an atomic conditional UPDATE ... WHERE status = 'pending' RETURNING
 *    that also closes a same-transfer double-accept race.
 *  - Normal single-request creation/accept still succeeds.
 *  - Grandfathered / maxHousesAllowed === null accounts bypass the limit
 *    entirely and are unaffected by the new locking logic.
 *
 * NOTE: registerRoutes() performs its own startup seeding (subscription
 * plans, etc.) via db.insert/db.update, so assertions below filter captured
 * calls by house/transfer-specific payload shape rather than relying on raw
 * call counts, which would be polluted by that unrelated seeding traffic.
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted — fixtures visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  HOMEOWNER_ID,
  mockGetUser,
  mockGetHouseTransfer,
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbExecute,
} = vi.hoisted(() => ({
  HOMEOWNER_ID: "house-race-homeowner-001",
  mockGetUser: vi.fn(),
  mockGetHouseTransfer: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbExecute: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Sessions
// ---------------------------------------------------------------------------

function homeownerSession(overrides: Record<string, unknown> = {}) {
  return {
    id: HOMEOWNER_ID,
    role: "homeowner",
    email: "race-homeowner@example.com",
    subscriptionStatus: "active",
    maxHousesAllowed: 2, // Base plan: up to 2 homes
    trialEndsAt: null,
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
    requireActiveAccountFresh: vi.fn(
      () => (_req: any, _res: any, next: any) => next(),
    ),
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
      getHouseTransfer: mockGetHouseTransfer,
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

const VALID_HOUSE_BODY = {
  name: "Test House",
  address: "123 Main St, Springfield, IL",
  climateZone: "temperate",
  countryId: "country-us",
  regionId: "region-il",
  climateZoneId: "climate-temperate",
  homeSystems: [],
};

/** Captures every payload passed to `tx.insert(houses).values(payload)`,
 * regardless of unrelated startup-seeding inserts happening on other tables. */
function captureHouseInserts() {
  const captured: any[] = [];
  mockDbInsert.mockImplementation(() => ({
    values: vi.fn().mockImplementation((payload: any) => {
      captured.push(payload);
      return Promise.resolve(undefined);
    }),
  }));
  return captured;
}

function houseInsertsFor(captured: any[], address: string) {
  return captured.filter((c) => c && c.address === address);
}

/** Mocks the two distinct `tx.select().from(...).where(...)` shapes used by
 * POST /api/houses inside its transaction: first the COUNT(*) query, then
 * (only on success) the post-insert fetch-back with `.limit(1)`. */
function mockHouseSelectSequence(countValue: number, createdRow: any) {
  let call = 0;
  mockDbSelect.mockImplementation((projection?: any) => ({
    from: () => ({
      where: () => {
        if (projection && "code" in projection && "countryId" in projection) {
          return { limit: () => Promise.resolve([{
            id: VALID_HOUSE_BODY.climateZoneId,
            countryId: VALID_HOUSE_BODY.countryId,
            code: "temperate",
          }]) };
        }
        if (projection && "code" in projection) {
          return { limit: () => Promise.resolve([{
            id: VALID_HOUSE_BODY.countryId,
            code: "US",
          }]) };
        }
        if (projection && "countryId" in projection) {
          return { limit: () => Promise.resolve([{
            id: VALID_HOUSE_BODY.regionId,
            countryId: VALID_HOUSE_BODY.countryId,
          }]) };
        }
        call += 1;
        if (call % 2 === 1) {
          return Promise.resolve([{ count: countValue }]);
        }
        return { limit: () => Promise.resolve([createdRow]) };
      },
    }),
  }));
}

describe("POST /api/houses — plan-limit race condition", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("allows a normal single request under the limit to create a house", async () => {
    const app = await buildApp();
    mockDbExecute.mockResolvedValue(undefined);
    const captured = captureHouseInserts();
    mockHouseSelectSequence(1, { id: "new-house-id", ...VALID_HOUSE_BODY, homeownerId: HOMEOWNER_ID });

    const res = await request(app)
      .post("/api/houses")
      .set("x-test-session", sessionHeader(homeownerSession()))
      .send(VALID_HOUSE_BODY);

    expect(res.status).toBe(201);
    expect(res.body.id).toBe("new-house-id");
    expect(houseInsertsFor(captured, VALID_HOUSE_BODY.address)).toHaveLength(1);
  });

  it("blocks a normal single request already at the limit", async () => {
    const app = await buildApp();
    mockDbExecute.mockResolvedValue(undefined);
    const captured = captureHouseInserts();
    mockHouseSelectSequence(2, null); // already at Base plan's 2-home limit

    const res = await request(app)
      .post("/api/houses")
      .set("x-test-session", sessionHeader(homeownerSession()))
      .send(VALID_HOUSE_BODY);

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PLAN_LIMIT_EXCEEDED");
    expect(houseInsertsFor(captured, VALID_HOUSE_BODY.address)).toHaveLength(0);
  });

  it("bypasses the limit entirely for grandfathered accounts", async () => {
    const app = await buildApp();
    mockDbExecute.mockResolvedValue(undefined);
    const captured = captureHouseInserts();
    // Even with a huge existing count, grandfathered accounts must pass.
    mockHouseSelectSequence(50, { id: "new-house-id", ...VALID_HOUSE_BODY, homeownerId: HOMEOWNER_ID });

    const res = await request(app)
      .post("/api/houses")
      .set("x-test-session", sessionHeader(homeownerSession({ subscriptionStatus: "grandfathered", maxHousesAllowed: 2 })))
      .send(VALID_HOUSE_BODY);

    expect(res.status).toBe(201);
    expect(houseInsertsFor(captured, VALID_HOUSE_BODY.address)).toHaveLength(1);
  });

  it("bypasses the limit entirely when maxHousesAllowed is explicitly null", async () => {
    const app = await buildApp();
    mockDbExecute.mockResolvedValue(undefined);
    const captured = captureHouseInserts();
    mockHouseSelectSequence(50, { id: "new-house-id", ...VALID_HOUSE_BODY, homeownerId: HOMEOWNER_ID });

    const res = await request(app)
      .post("/api/houses")
      .set("x-test-session", sessionHeader(homeownerSession({ subscriptionStatus: "active", maxHousesAllowed: null })))
      .send(VALID_HOUSE_BODY);

    expect(res.status).toBe(201);
    expect(houseInsertsFor(captured, VALID_HOUSE_BODY.address)).toHaveLength(1);
  });

  it("never lets two concurrent requests both exceed the plan limit (real Promise.all race)", async () => {
    const app = await buildApp();
    mockDbExecute.mockResolvedValue(undefined);
    const captured = captureHouseInserts();

    // Serialize concurrent transactions through a queue, mirroring what a
    // real Postgres `SELECT ... FOR UPDATE` guarantees: the second request's
    // transaction body only begins once the first has fully committed
    // (insert done), so its COUNT(*) read reflects the first request's
    // insert.
    let lockQueue: Promise<void> = Promise.resolve();
    let insertedCount = 1; // start at 1 existing house; limit is 2 (Base plan)

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
          update: mockDbUpdate,
          delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        });
      } finally {
        releaseNext();
      }
    });

    // Distinguish the COUNT(*) query from the post-insert fetch-back by the
    // projection argument passed to select() (`{ count: ... }` vs none) —
    // more robust than call-order parity once requests interleave.
    mockDbSelect.mockImplementation((projection?: any) => {
      if (projection && "code" in projection && "countryId" in projection) {
        return { from: () => ({ where: () => ({ limit: () => Promise.resolve([{
          id: VALID_HOUSE_BODY.climateZoneId,
          countryId: VALID_HOUSE_BODY.countryId,
          code: "temperate",
        }]) }) }) };
      }
      if (projection && "code" in projection) {
        return { from: () => ({ where: () => ({ limit: () => Promise.resolve([{
          id: VALID_HOUSE_BODY.countryId,
          code: "US",
        }]) }) }) };
      }
      if (projection && "countryId" in projection) {
        return { from: () => ({ where: () => ({ limit: () => Promise.resolve([{
          id: VALID_HOUSE_BODY.regionId,
          countryId: VALID_HOUSE_BODY.countryId,
        }]) }) }) };
      }
      if (projection && typeof projection === "object" && "count" in projection) {
        return { from: () => ({ where: () => Promise.resolve([{ count: insertedCount }]) }) };
      }
      return { from: () => ({ where: () => ({ limit: () => Promise.resolve([{ id: "new-house-id" }]) }) }) };
    });
    mockDbInsert.mockImplementation(() => ({
      values: vi.fn().mockImplementation((payload: any) => {
        captured.push(payload);
        insertedCount += 1;
        return Promise.resolve(undefined);
      }),
    }));

    const session = homeownerSession(); // maxHousesAllowed: 2, currently 1 house

    const [res1, res2] = await Promise.all([
      request(app).post("/api/houses").set("x-test-session", sessionHeader(session)).send(VALID_HOUSE_BODY),
      request(app).post("/api/houses").set("x-test-session", sessionHeader(session)).send(VALID_HOUSE_BODY),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 403]);

    const failed = res1.status === 403 ? res1 : res2;
    expect(failed.body.code).toBe("PLAN_LIMIT_EXCEEDED");

    // Exactly one insert ever happened, never both.
    expect(houseInsertsFor(captured, VALID_HOUSE_BODY.address)).toHaveLength(1);
    expect(insertedCount).toBe(2);
  });
});

describe("POST /api/house-transfers/:id/accept — plan-limit race condition", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  const TRANSFER_ID = "transfer-001";
  const PENDING_TRANSFER = {
    id: TRANSFER_ID,
    houseId: "house-xyz",
    toHomeownerEmail: "race-homeowner@example.com",
    toHomeownerId: null,
    status: "pending",
  };

  /** Captures every `tx.update(houseTransfers).set(payload)` call. */
  function captureTransferUpdates(returningResultForCall: (callIndex: number) => any[]) {
    const captured: any[] = [];
    let call = 0;
    mockDbUpdate.mockImplementation(() => ({
      set: vi.fn().mockImplementation((payload: any) => {
        captured.push(payload);
        const idx = call;
        call += 1;
        return {
          where: () => ({
            returning: () => Promise.resolve(returningResultForCall(idx)),
          }),
        };
      }),
    }));
    return captured;
  }

  it("accepts a pending transfer for a recipient under the limit", async () => {
    const app = await buildApp();
    mockGetHouseTransfer.mockResolvedValue({ ...PENDING_TRANSFER });
    mockGetUser.mockResolvedValue(homeownerSession());
    mockDbExecute.mockResolvedValue(undefined);
    mockDbSelect.mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve([{ count: 1 }]) }), // 1 existing, limit 2
    }));
    const captured = captureTransferUpdates(() => [{ ...PENDING_TRANSFER, status: "accepted", toHomeownerId: HOMEOWNER_ID }]);

    const res = await request(app)
      .post(`/api/house-transfers/${TRANSFER_ID}/accept`)
      .set("x-test-session", sessionHeader(homeownerSession()));

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("accepted");
    expect(captured).toHaveLength(1);
  });

  it("blocks accepting a transfer when the recipient is already at their plan limit", async () => {
    const app = await buildApp();
    mockGetHouseTransfer.mockResolvedValue({ ...PENDING_TRANSFER });
    mockGetUser.mockResolvedValue(homeownerSession());
    mockDbExecute.mockResolvedValue(undefined);
    mockDbSelect.mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve([{ count: 2 }]) }), // already at limit
    }));
    const captured = captureTransferUpdates(() => [{}]);

    const res = await request(app)
      .post(`/api/house-transfers/${TRANSFER_ID}/accept`)
      .set("x-test-session", sessionHeader(homeownerSession()));

    expect(res.status).toBe(403);
    expect(res.body.code).toBe("PLAN_LIMIT_EXCEEDED");
    expect(captured).toHaveLength(0);
  });

  it("bypasses the limit for grandfathered recipients", async () => {
    const app = await buildApp();
    mockGetHouseTransfer.mockResolvedValue({ ...PENDING_TRANSFER });
    const grandfatheredUser = homeownerSession({ subscriptionStatus: "grandfathered" });
    mockGetUser.mockResolvedValue(grandfatheredUser);
    mockDbExecute.mockResolvedValue(undefined);
    mockDbSelect.mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve([{ count: 50 }]) }),
    }));
    captureTransferUpdates(() => [{ ...PENDING_TRANSFER, status: "accepted", toHomeownerId: HOMEOWNER_ID }]);

    const res = await request(app)
      .post(`/api/house-transfers/${TRANSFER_ID}/accept`)
      .set("x-test-session", sessionHeader(grandfatheredUser));

    expect(res.status).toBe(200);
  });

  it("rejects a second accept attempt on the same transfer once it is no longer pending (atomic UPDATE...RETURNING)", async () => {
    const app = await buildApp();
    mockGetHouseTransfer.mockResolvedValue({ ...PENDING_TRANSFER });
    mockGetUser.mockResolvedValue(homeownerSession());
    mockDbExecute.mockResolvedValue(undefined);
    mockDbSelect.mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve([{ count: 1 }]) }),
    }));
    // Simulate the conditional UPDATE finding no matching 'pending' row (a
    // concurrent request already claimed it) by returning an empty array.
    captureTransferUpdates(() => []);

    const res = await request(app)
      .post(`/api/house-transfers/${TRANSFER_ID}/accept`)
      .set("x-test-session", sessionHeader(homeownerSession()));

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/no longer pending/i);
  });

  it("never lets two concurrent accepts on the same transfer both succeed (real Promise.all race)", async () => {
    const app = await buildApp();
    mockGetHouseTransfer.mockResolvedValue({ ...PENDING_TRANSFER });
    mockGetUser.mockResolvedValue(homeownerSession());
    mockDbExecute.mockResolvedValue(undefined);

    mockDbSelect.mockImplementation(() => ({
      from: () => ({ where: () => Promise.resolve([{ count: 1 }]) }), // 1 existing, limit 2 — never the blocker here
    }));

    // Only the FIRST conditional update (status still 'pending') succeeds;
    // the second sees status already flipped and returns [].
    let claimed = false;
    captureTransferUpdates(() => {
      if (claimed) return [];
      claimed = true;
      return [{ ...PENDING_TRANSFER, status: "accepted", toHomeownerId: HOMEOWNER_ID }];
    });

    // Serialize the two "transactions" the same way the house-creation race
    // test does, mirroring the real FOR UPDATE row lock's effect.
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
          insert: mockDbInsert,
          update: (...args: any[]) => (mockDbUpdate as any)(...args),
          delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
        });
      } finally {
        releaseNext();
      }
    });

    const session = homeownerSession();
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/house-transfers/${TRANSFER_ID}/accept`).set("x-test-session", sessionHeader(session)),
      request(app).post(`/api/house-transfers/${TRANSFER_ID}/accept`).set("x-test-session", sessionHeader(session)),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([200, 400]);
    const failed = res1.status === 400 ? res1 : res2;
    expect(failed.body.message).toMatch(/no longer pending/i);
  });
});
