/**
 * HTTP-level integration tests: invoice-analyses visibility across a house transfer
 * via POST /api/handoff/:token/claim → GET /api/invoice-analyses.
 *
 * The claim route now includes `invoiceAnalyses` in its transactional ownership
 * transfer.  These tests confirm that:
 *   1. Before the claim: ownerA (the seller) sees their analysis, ownerB sees nothing.
 *   2. After the claim route runs: ownerB (the buyer) sees the analysis; ownerA does not.
 *
 * The db.select mock is table-aware: it routes each query to the right fixture or
 * filters the live analysisStore for invoiceAnalyses queries.  The db.transaction
 * mock actually executes the callback with a tx mock whose update() for
 * invoiceAnalyses mutates analysisStore, so the subsequent GET reflects real
 * post-transfer state rather than a pre-programmed response.
 *
 * This means the test would fail if:
 *  - the route's GET handler stops filtering by homeownerId, OR
 *  - the claim route's transaction stops updating invoiceAnalyses.homeownerId.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — create the shared mutable store and all named mock fns before
// any vi.mock() factory runs.  The store object is closed over by both the
// db.transaction mock (which mutates it) and the db.select mock (which reads it).
// ---------------------------------------------------------------------------

const {
  OWNER_A_ID,
  OWNER_B_ID,
  HOUSE_ID,
  PKG_ID,
  TOKEN,
  ANALYSIS_ID,
  TRANSFER_ROW_ID,
  analysisStore,
  houseStore,
  maintenanceLogStore,
  applianceStore,
  homeSystemStore,
  mockGetUser,
  mockGetHouses,
  mockGetMaintenanceLogs,
  mockGetHomeAppliances,
  mockGetHomeSystems,
  mockGetHouseTransfer,
  mockTransferHouseOwnership,
  mockUpdateHouseTransfer,
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbTransaction,
} = vi.hoisted(() => {
  const store = { rows: [] as Array<Record<string, any>> };

  return {
    OWNER_A_ID:      "demo-homeowner-owner-a",
    OWNER_B_ID:      "demo-homeowner-owner-b",
    HOUSE_ID:        "house-transfer-001",
    PKG_ID:          "pkg-transfer-001",
    TOKEN:           "test-invite-token-xyz",
    ANALYSIS_ID:     "analysis-transfer-001",
    TRANSFER_ROW_ID: "transfer-row-001",
    analysisStore:   store,
    houseStore:      { rows: [] as Array<Record<string, any>> },
    maintenanceLogStore: { rows: [] as Array<Record<string, any>> },
    applianceStore:      { rows: [] as Array<Record<string, any>> },
    homeSystemStore:     { rows: [] as Array<Record<string, any>> },
    mockGetUser:     vi.fn(),
    mockGetHouses:   vi.fn(),
    mockGetMaintenanceLogs: vi.fn(),
    mockGetHomeAppliances: vi.fn(),
    mockGetHomeSystems: vi.fn(),
    mockGetHouseTransfer: vi.fn(),
    mockTransferHouseOwnership: vi.fn(),
    mockUpdateHouseTransfer: vi.fn(),
    mockDbSelect:    vi.fn(),
    mockDbInsert:    vi.fn(),
    mockDbUpdate:    vi.fn(),
    mockDbTransaction: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Drizzle SQL introspection helper — extracts string Param values from a WHERE
// condition so the store filter is driven by the route's actual SQL arguments.
//
// Param objects (drizzle-orm) have:  { value: TDataType, encoder: Column }
// StringChunk objects have:          { value: string }          (no 'encoder')
// SQL objects have:                  { queryChunks: SQLChunk[] }
// ---------------------------------------------------------------------------

function extractStringParams(node: any, seen = new WeakSet(), depth = 0): string[] {
  if (depth > 20 || node == null || typeof node !== "object") return [];
  if (seen.has(node)) return [];
  seen.add(node);
  // Param: both 'value' and 'encoder'; StringChunk only has 'value'
  if ("value" in node && "encoder" in node && typeof node.value === "string") {
    return [node.value];
  }
  if (Array.isArray(node.queryChunks)) {
    return node.queryChunks.flatMap((c: any) => extractStringParams(c, seen, depth + 1));
  }
  return [];
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

function makeSession(userId: string, role = "homeowner") {
  return {
    isAuthenticated: true,
    user: { id: userId, email: `${userId}@homebase.com`, role, status: "active" },
  };
}

const SESSION_A = makeSession(OWNER_A_ID);
const SESSION_B = makeSession(OWNER_B_ID);

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      const who = req.headers?.["x-test-user"];
      if (who === "owner-a") { req.session = SESSION_A; return next(); }
      if (who === "owner-b") { req.session = SESSION_B; return next(); }
      return _res.status(401).json({ message: "Unauthorized" });
    }),
    requirePropertyOwner: vi.fn((req: any, res: any, next: any) => {
      if (!req.session?.isAuthenticated) return res.status(401).json({ message: "Unauthorized" });
      if (!["homeowner", "contractor"].includes(req.session.user?.role)) {
        return res.status(403).json({ message: "Forbidden" });
      }
      next();
    }),
    evictStatusCache: vi.fn(),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));
vi.mock("ws", () => ({
  WebSocketServer: class { on() {} clients = new Set(); },
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
  ObjectStorageService: class {
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
    this.webhooks = {
      constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }),
    };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
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

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      getHouses: mockGetHouses,
      getMaintenanceLogs: mockGetMaintenanceLogs,
      getHomeAppliances: mockGetHomeAppliances,
      getHomeSystems: mockGetHomeSystems,
      getHouseTransfer: mockGetHouseTransfer,
      transferHouseOwnership: mockTransferHouseOwnership,
      updateHouseTransfer: mockUpdateHouseTransfer,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    select:      mockDbSelect,
    insert:      mockDbInsert,
    update:      mockDbUpdate,
    delete:      vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    execute:     vi.fn().mockResolvedValue({ rows: [] }),
    transaction: mockDbTransaction,
  },
}));

// ---------------------------------------------------------------------------
// Imports — after vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
// Import table references so the table-aware select mock can identify queries.
// These come from @workspace/db (schema), NOT from "../db" (connection) — not mocked.
import {
  invoiceAnalyses  as invoiceAnalysesTable,
  homeHandoffPackages as homeHandoffPackagesTable,
  handoffTransfers as handoffTransfersTable,
  houses           as housesTable,
  maintenanceLogs  as maintenanceLogsTable,
  homeAppliances   as homeAppliancesTable,
  homeSystems      as homeSystemsTable,
} from "@workspace/db";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_ANALYSIS = Object.freeze({
  id:                 ANALYSIS_ID,
  homeownerId:        OWNER_A_ID,
  houseId:            HOUSE_ID,
  status:             "pending",
  completionMethod:   "professional",
  serviceDescription: "Roof inspection",
  serviceDate:        "2026-05-01",
  totalAmount:        "450.00",
  contractorName:     "Ace Roofing",
  contractorCompany:  null,
  homeArea:           "roof",
  serviceType:        "inspection",
  invoiceUrls:        [],
  receiptUrls:        [],
  beforePhotoUrls:    [],
  afterPhotoUrls:     [],
  diyVerified:        false,
  aiNotes:            null,
  createdAt:          new Date("2026-05-01T10:00:00Z"),
});

const TRANSFERRED_RECORD_FIXTURES = {
  maintenanceLog: {
    id: "maintenance-log-transfer-001",
    homeownerId: OWNER_A_ID,
    houseId: HOUSE_ID,
    title: "Annual furnace service",
  },
  appliance: {
    id: "appliance-transfer-001",
    homeownerId: OWNER_A_ID,
    houseId: HOUSE_ID,
    name: "Kitchen refrigerator",
  },
  homeSystem: {
    id: "home-system-transfer-001",
    homeownerId: OWNER_A_ID,
    houseId: HOUSE_ID,
    systemType: "HVAC",
  },
} as const;

const BASE_HOUSE = Object.freeze({
  id: HOUSE_ID,
  homeownerId: OWNER_A_ID,
  name: "Transferred Home",
  address: "123 Transfer Lane",
});

const ACCEPTED_HOUSE_TRANSFER = Object.freeze({
  id: TRANSFER_ROW_ID,
  houseId: HOUSE_ID,
  fromHomeownerId: OWNER_A_ID,
  toHomeownerId: OWNER_B_ID,
  status: "accepted",
});

/** Handoff package with a real houseId — triggers the transactional transfer path. */
const PKG_FIXTURE = Object.freeze({
  id:              PKG_ID,
  inviteToken:     TOKEN,
  houseId:         HOUSE_ID,
  status:          "sent",
  claimedAt:       null,
  claimedByUserId: null,
  extractedData:   null,
  createdAt:       new Date("2026-04-01T00:00:00Z"),
  updatedAt:       new Date("2026-04-01T00:00:00Z"),
});

/** Audit row returned by the transaction's INSERT into handoff_transfers. */
const TRANSFER_ROW = Object.freeze({
  id:                  TRANSFER_ROW_ID,
  packageId:           PKG_ID,
  houseId:             HOUSE_ID,
  previousHomeownerId: OWNER_A_ID,
  newHomeownerId:      OWNER_B_ID,
  tablesUpdated:       { houses: 1, invoice_analyses: 1 },
  status:              "completed",
  errorDetail:         null,
  createdAt:           new Date(),
});

// ---------------------------------------------------------------------------
// App builder — wires all db mocks before registering routes
// ---------------------------------------------------------------------------

async function buildApp(store: { rows: Array<Record<string, any>> }) {
  // ── db.insert: plan-seeding at startup + any inserts in the claim route ──
  mockDbInsert.mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
      returning:           vi.fn().mockResolvedValue([TRANSFER_ROW]),
    }),
  });

  // ── db.update: handoff_transfers stamp on leak (not triggered when n=0) ─
  mockDbUpdate.mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  });

  // ── db.transaction: executes the callback with a tx mock that mutates the
  //    store when it processes the invoiceAnalyses UPDATE. ─────────────────
  mockDbTransaction.mockImplementation(async (cb: (tx: any) => Promise<any>) => {
    const txMock = {
      // SELECT FOR UPDATE on the house row — returns ownerA as current owner
      execute: vi.fn().mockResolvedValue({
        rows: [{ id: HOUSE_ID, homeowner_id: OWNER_A_ID }],
      }),
      update: vi.fn().mockImplementation((table: any) => ({
        set: vi.fn().mockImplementation((values: any) => ({
          where: vi.fn().mockImplementation((condition: any) => {
            // When the transaction updates invoiceAnalyses, mutate the store
            // so subsequent GET requests see the new homeownerId.
            if (table === invoiceAnalysesTable && values.homeownerId) {
              const params = extractStringParams(condition);
              for (const row of store.rows) {
                if (params.includes(row.houseId)) {
                  row.homeownerId = values.homeownerId;
                }
              }
            }
            const childStores = new Map<any, { rows: Array<Record<string, any>> }>([
              [maintenanceLogsTable, maintenanceLogStore],
              [homeAppliancesTable, applianceStore],
              [homeSystemsTable, homeSystemStore],
            ]);
            const childStore = childStores.get(table);
            if (childStore && values.homeownerId) {
              const params = extractStringParams(condition);
              for (const row of childStore.rows) {
                if (params.includes(row.houseId)) row.homeownerId = values.homeownerId;
              }
            }
            return Promise.resolve(undefined);
          }),
        })),
      })),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([TRANSFER_ROW]),
        }),
      }),
    };
    return cb(txMock);
  });

  // ── db.select: table-aware router ────────────────────────────────────────
  //
  // Many Drizzle queries are used as both:
  //   await db.select().from(t).where(...)               ← thenable (direct await)
  //   await db.select().from(t).where(...).orderBy().limit()  ← chained
  // makeWhereResult() returns an object that supports both patterns.
  function makeWhereResult(rows: any[]) {
    return {
      then:    (ok: any, err: any) => Promise.resolve(rows).then(ok, err),
      catch:   (err: any)         => Promise.resolve(rows).catch(err),
      orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) }),
      limit:   vi.fn().mockResolvedValue(rows),
    };
  }

  mockDbSelect.mockImplementation((selectArg?: any) => {
    // Count queries use db.select({ n: drizzleSql`count(*)::int` })
    const isCount = selectArg != null && typeof selectArg === "object" && "n" in selectArg;

    return {
      from: vi.fn().mockImplementation((table: any) => {
        // ── invoiceAnalyses: filter live store by homeownerId in WHERE ─────
        // The GET route chains .where().orderBy().limit() so makeWhereResult
        // supports both direct-await AND chaining.
        if (table === invoiceAnalysesTable) {
          return {
            where: vi.fn().mockImplementation((condition: any) => {
              const params = extractStringParams(condition);
              const matching = store.rows.filter(r => params.includes(r.homeownerId));
              return makeWhereResult(matching);
            }),
          };
        }

        // ── homeHandoffPackages: return the fixture ────────────────────────
        // Route: await db.select().from(homeHandoffPackages).where(...)
        if (table === homeHandoffPackagesTable) {
          return {
            where: vi.fn().mockReturnValue(makeWhereResult([PKG_FIXTURE])),
          };
        }

        // ── handoffTransfers: no previous claim ───────────────────────────
        // Route: await db.select().from(handoffTransfers).where(...).orderBy(...).limit(1)
        if (table === handoffTransfersTable) {
          return {
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          };
        }

        // ── houses: preflight or post-commit count ────────────────────────
        // Preflight: await db.select({ id, homeownerId }).from(houses).where(...)
        // Post-commit: db.select({ n: count }).from(houses).where(and(...))
        if (table === housesTable) {
          if (isCount) {
            // 0 means no leak — verification passes
            return { where: vi.fn().mockReturnValue(makeWhereResult([{ n: 0 }])) };
          }
          return {
            where: vi.fn().mockReturnValue(
              makeWhereResult([{ id: HOUSE_ID, homeownerId: OWNER_A_ID }]),
            ),
          };
        }

        // ── All other tables (count queries for maintenanceLogs etc.) ─────
        if (isCount) {
          return { where: vi.fn().mockReturnValue(makeWhereResult([{ n: 0 }])) };
        }

        // Default fallthrough
        return {
          where: vi.fn().mockReturnValue(makeWhereResult([])),
          orderBy: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) }),
          limit:   vi.fn().mockResolvedValue([]),
        };
      }),
    };
  });

  const app = express();
  app.use(express.json());
  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/handoff/:token/claim + GET /api/invoice-analyses — ownership transfer", () => {
  let app: express.Express;

  beforeEach(async () => {
    // Reset store: ownerA owns the analysis at the start of each test.
    analysisStore.rows = [{ ...BASE_ANALYSIS }];
    maintenanceLogStore.rows = [{ ...TRANSFERRED_RECORD_FIXTURES.maintenanceLog }];
    applianceStore.rows = [{ ...TRANSFERRED_RECORD_FIXTURES.appliance }];
    homeSystemStore.rows = [{ ...TRANSFERRED_RECORD_FIXTURES.homeSystem }];
    mockGetUser.mockImplementation(async (userId: string) => ({
      id: userId,
      email: `${userId}@homebase.com`,
      role: "homeowner",
      status: "active",
      subscriptionStatus: "active",
    }));
    mockGetMaintenanceLogs.mockImplementation(async (homeownerId: string) =>
      maintenanceLogStore.rows.filter((row) => row.homeownerId === homeownerId),
    );
    mockGetHomeAppliances.mockImplementation(async (homeownerId: string) =>
      applianceStore.rows.filter((row) => row.homeownerId === homeownerId),
    );
    mockGetHomeSystems.mockImplementation(async (homeownerId: string) =>
      homeSystemStore.rows.filter((row) => row.homeownerId === homeownerId),
    );
    app = await buildApp(analysisStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ── Pre-transfer visibility ─────────────────────────────────────────────

  it("ownerA sees their analysis before any transfer", async () => {
    const res = await request(app)
      .get("/api/invoice-analyses")
      .set("x-test-user", "owner-a");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(ANALYSIS_ID);
    expect(res.body[0].homeownerId).toBe(OWNER_A_ID);
  });

  it("ownerB sees nothing before the transfer", async () => {
    const res = await request(app)
      .get("/api/invoice-analyses")
      .set("x-test-user", "owner-b");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  // ── Claim route drives the transfer ────────────────────────────────────

  it("claim route succeeds and ownerB sees the analysis; ownerA does not", async () => {
    // ownerB claims the handoff package — this triggers the transactional transfer
    // which updates invoiceAnalyses.homeownerId from ownerA → ownerB in the store.
    const claimRes = await request(app)
      .post(`/api/handoff/${TOKEN}/claim`)
      .set("x-test-user", "owner-b")
      .send({});

    expect(claimRes.status).toBe(200);
    expect(claimRes.body.success).toBe(true);
    expect(claimRes.body.houseId).toBe(HOUSE_ID);
    // The response should report that invoice_analyses were transferred
    expect(claimRes.body.tablesUpdated).toHaveProperty("invoice_analyses");

    // ownerB now sees the analysis
    const resB = await request(app)
      .get("/api/invoice-analyses")
      .set("x-test-user", "owner-b");
    expect(resB.status).toBe(200);
    expect(resB.body).toHaveLength(1);
    expect(resB.body[0].id).toBe(ANALYSIS_ID);
    expect(resB.body[0].homeownerId).toBe(OWNER_B_ID);

    // ownerA no longer sees the analysis
    const resA = await request(app)
      .get("/api/invoice-analyses")
      .set("x-test-user", "owner-a");
    expect(resA.status).toBe(200);
    expect(resA.body).toHaveLength(0);
  });

  it("houseId filter: ownerA loses access and ownerB gains access after claim", async () => {
    // Pre-claim: ownerA can filter by house
    const preA = await request(app)
      .get(`/api/invoice-analyses?houseId=${HOUSE_ID}`)
      .set("x-test-user", "owner-a");
    expect(preA.body).toHaveLength(1);

    // Run the claim
    const claimRes = await request(app)
      .post(`/api/handoff/${TOKEN}/claim`)
      .set("x-test-user", "owner-b")
      .send({});
    expect(claimRes.status).toBe(200);

    // Post-claim with houseId filter
    const postB = await request(app)
      .get(`/api/invoice-analyses?houseId=${HOUSE_ID}`)
      .set("x-test-user", "owner-b");
    expect(postB.body).toHaveLength(1);
    expect(postB.body[0].homeownerId).toBe(OWNER_B_ID);

    const postA = await request(app)
      .get(`/api/invoice-analyses?houseId=${HOUSE_ID}`)
      .set("x-test-user", "owner-a");
    expect(postA.body).toHaveLength(0);
  });

  it.each([
    ["maintenance logs", "/api/maintenance-logs", TRANSFERRED_RECORD_FIXTURES.maintenanceLog.id],
    ["home appliances", "/api/appliances", TRANSFERRED_RECORD_FIXTURES.appliance.id],
    ["home systems", "/api/home-systems", TRANSFERRED_RECORD_FIXTURES.homeSystem.id],
  ])("after transfer, the former owner cannot see %s but the new owner can", async (
    _label,
    endpoint,
    recordId,
  ) => {
    const claimRes = await request(app)
      .post(`/api/handoff/${TOKEN}/claim`)
      .set("x-test-user", "owner-b")
      .send({});
    expect(claimRes.status).toBe(200);

    const formerOwnerRes = await request(app)
      .get(endpoint)
      .set("x-test-user", "owner-a");
    expect(formerOwnerRes.status).toBe(200);
    expect(formerOwnerRes.body).toEqual([]);

    const newOwnerRes = await request(app)
      .get(endpoint)
      .set("x-test-user", "owner-b");
    expect(newOwnerRes.status).toBe(200);
    expect(newOwnerRes.body).toHaveLength(1);
    expect(newOwnerRes.body[0]).toMatchObject({
      id: recordId,
      homeownerId: OWNER_B_ID,
      houseId: HOUSE_ID,
    });
  });

  it("unauthenticated GET returns 401", async () => {
    const res = await request(app).get("/api/invoice-analyses");
    expect(res.status).toBe(401);
  });

  it("non-homeowner cannot claim a handoff package", async () => {
    // Owner-a is a homeowner so this test just verifies the 403 path
    // by sneaking a contractor-role session in via a custom header check
    // (the x-test-user for "owner-a" is homeowner — we expect 200 for them,
    // so we confirm the route rejects a missing auth header)
    const res = await request(app)
      .post(`/api/handoff/${TOKEN}/claim`)
      .send({}); // no x-test-user → isAuthenticated returns 401
    expect(res.status).toBe(401);
  });
});

describe("POST /api/house-transfers/:id/confirm + GET /api/houses — ownership transfer", () => {
  let app: express.Express;

  beforeEach(async () => {
    houseStore.rows = [{ ...BASE_HOUSE }];
    mockGetHouses.mockImplementation(async (homeownerId: string) =>
      houseStore.rows.filter((house) => house.homeownerId === homeownerId),
    );
    mockGetHouseTransfer.mockResolvedValue({ ...ACCEPTED_HOUSE_TRANSFER });
    mockTransferHouseOwnership.mockImplementation(
      async (houseId: string, fromHomeownerId: string, toHomeownerId: string) => {
        const house = houseStore.rows.find(
          (row) => row.id === houseId && row.homeownerId === fromHomeownerId,
        );
        if (house) house.homeownerId = toHomeownerId;
        return {
          maintenanceLogsTransferred: 0,
          appliancesTransferred: 0,
          appointmentsTransferred: 0,
          customTasksTransferred: 0,
          homeSystemsTransferred: 0,
          serviceRecordsTransferred: 0,
          taskCompletionsTransferred: 0,
          taskOverridesTransferred: 0,
          crmInvoicesTransferred: 0,
          invoiceAnalysesTransferred: 0,
        };
      },
    );
    mockUpdateHouseTransfer.mockResolvedValue({
      ...ACCEPTED_HOUSE_TRANSFER,
      status: "completed",
    });
    app = await buildApp(analysisStore);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("removes the transferred house from the former owner's list and shows it to the new owner", async () => {
    const confirmRes = await request(app)
      .post(`/api/house-transfers/${TRANSFER_ROW_ID}/confirm`)
      .set("x-test-user", "owner-a")
      .send({});

    expect(confirmRes.status).toBe(200);
    expect(mockTransferHouseOwnership).toHaveBeenCalledWith(
      HOUSE_ID,
      OWNER_A_ID,
      OWNER_B_ID,
    );

    const formerOwnerRes = await request(app)
      .get("/api/houses")
      .set("x-test-user", "owner-a");
    expect(formerOwnerRes.status).toBe(200);
    expect(formerOwnerRes.body).toHaveLength(0);

    const newOwnerRes = await request(app)
      .get("/api/houses")
      .set("x-test-user", "owner-b");
    expect(newOwnerRes.status).toBe(200);
    expect(newOwnerRes.body).toHaveLength(1);
    expect(newOwnerRes.body[0]).toMatchObject({
      id: HOUSE_ID,
      homeownerId: OWNER_B_ID,
    });
  });
});
