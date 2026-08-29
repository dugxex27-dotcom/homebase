/**
 * HTTP-level tests: bulk-import CSV quoted-field parsing (comma-corruption fix)
 *
 * Previously `parseCsvRows` split every line on raw commas with no quoted-field
 * handling, so a name/address field containing a comma (e.g. `"Smith, Jr."`)
 * shifted every subsequent column — the email column would end up holding a
 * last-name fragment, etc. This file verifies the `csv-parse`-backed
 * replacement:
 *  - a quoted field containing a comma parses into the correct number of
 *    columns with the correct values (no column shifting)
 *  - a quoted field containing an escaped `""` double-quote parses correctly
 *  - a plain, comma-free CSV (the common case) still parses exactly as before
 *  - malformed CSV (unmatched quote, wrong column count on a row) is rejected
 *    with a clear 400 error rather than silently misaligning columns or
 *    crashing into a generic 500
 */

import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

const {
  COMPANY_ID,
  ADMIN_ID,
  mockGetUser,
  mockDbSelect,
  mockDbInsert,
  mockDbUpdate,
  mockDbExecute,
} = vi.hoisted(() => ({
  COMPANY_ID: "company-csv-001",
  ADMIN_ID: "admin-csv-001",
  mockGetUser: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbExecute: vi.fn(),
}));

function adminSession(overrides: Record<string, unknown> = {}) {
  return {
    id: ADMIN_ID,
    role: "contractor",
    companyId: COMPANY_ID,
    companyRole: "owner",
    email: "owner@example.com",
    firstName: "Owner",
    subscriptionPlanId: null,
    status: "active",
    accountStatus: "active",
    subscriptionStatus: "active",
    ...overrides,
  };
}

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

function hybrid(promise: Promise<any>) {
  return {
    then: (onRes: any, onRej: any) => promise.then(onRes, onRej),
    catch: (onRej: any) => promise.catch(onRej),
    limit: () => promise,
  };
}

interface State {
  techIds: string[];
}

function wireDbMocks(state: State, capturedInserts: any[]) {
  mockDbSelect.mockImplementation((projection?: any) => ({
    from: (table: any) => ({
      where: (..._args: any[]) => {
        if (table === companies) {
          return hybrid(Promise.resolve([{ id: COMPANY_ID, name: "Acme Co", maxTechSeats: 50 }]));
        }
        if (table === subscriptionPlans) {
          return hybrid(Promise.resolve([{ id: "plan-1", includedTechSeats: null, additionalSeatPrice: null }]));
        }
        if (table === users) {
          if (projection && "status" in projection) {
            return hybrid(Promise.resolve([{ status: "active", accountStatus: "active" }]));
          }
          if (projection && "id" in projection && Object.keys(projection).length === 1) {
            return hybrid(Promise.resolve(state.techIds.map((id) => ({ id }))));
          }
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
        if (payload.companyRole === "tech") state.techIds.push(payload.id);
        return Promise.resolve(undefined);
      }
      return Promise.resolve(undefined);
    },
  }));

  mockDbUpdate.mockImplementation(() => ({
    set: () => ({ where: () => Promise.resolve(undefined) }),
  }));
}

const CONTRACTOR_FIXTURE = {
  id: ADMIN_ID,
  email: "owner@example.com",
  role: "contractor",
  companyId: COMPANY_ID,
  companyRole: "owner",
  status: "active",
  accountStatus: "active",
  subscriptionStatus: "active",
};

beforeEach(() => {
  mockDbExecute.mockResolvedValue(undefined);
  mockGetUser.mockResolvedValue(CONTRACTOR_FIXTURE);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/contractor/bulk-import — CSV quoted-field parsing", () => {
  it("parses a plain comma-free CSV exactly as before (regression check)", async () => {
    const app = await buildApp();
    const state: State = { techIds: [] };
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const csv = [
      "email,firstName,lastName",
      "alice@example.com,Alice,Anderson",
      "bob@example.com,Bob,Brown",
    ].join("\n");

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach("file", Buffer.from(csv, "utf-8"), "techs.csv");

    expect(res.status).toBe(200);
    expect(res.body.successRows).toBe(2);
    expect(res.body.failedRows).toBe(0);
    expect(captured.map((c) => ({ email: c.email, firstName: c.firstName, lastName: c.lastName }))).toEqual([
      { email: "alice@example.com", firstName: "Alice", lastName: "Anderson" },
      { email: "bob@example.com", firstName: "Bob", lastName: "Brown" },
    ]);
  });

  it("keeps every column aligned when a quoted field contains a comma", async () => {
    const app = await buildApp();
    const state: State = { techIds: [] };
    const captured: any[] = [];
    wireDbMocks(state, captured);

    // lastName contains a comma; must NOT shift email/firstName on this row
    // or the following row.
    const csv = [
      "email,firstName,lastName",
      'carol@example.com,Carol,"Smith, Jr."',
      "dave@example.com,Dave,Davis",
    ].join("\n");

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach("file", Buffer.from(csv, "utf-8"), "techs.csv");

    expect(res.status).toBe(200);
    expect(res.body.successRows).toBe(2);
    expect(res.body.failedRows).toBe(0);
    expect(captured).toHaveLength(2);
    expect(captured[0]).toMatchObject({ email: "carol@example.com", firstName: "Carol", lastName: "Smith, Jr." });
    expect(captured[1]).toMatchObject({ email: "dave@example.com", firstName: "Dave", lastName: "Davis" });
  });

  it("handles an escaped double-quote inside a quoted field", async () => {
    const app = await buildApp();
    const state: State = { techIds: [] };
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const csv = [
      "email,firstName,lastName",
      'erin@example.com,Erin,"O""Brien"',
    ].join("\n");

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach("file", Buffer.from(csv, "utf-8"), "techs.csv");

    expect(res.status).toBe(200);
    expect(res.body.successRows).toBe(1);
    expect(captured[0]).toMatchObject({ email: "erin@example.com", firstName: "Erin", lastName: 'O"Brien' });
  });

  it("rejects a CSV with an unmatched quote with a clear 400 error instead of misaligning columns", async () => {
    const app = await buildApp();
    const state: State = { techIds: [] };
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const csv = [
      "email,firstName,lastName",
      'frank@example.com,"Frank,Foster', // unterminated quote
    ].join("\n");

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach("file", Buffer.from(csv, "utf-8"), "techs.csv");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid csv format/i);
    expect(captured).toHaveLength(0);
  });

  it("rejects a row with the wrong number of columns with a clear 400 error instead of silently misaligning data", async () => {
    const app = await buildApp();
    const state: State = { techIds: [] };
    const captured: any[] = [];
    wireDbMocks(state, captured);

    const csv = [
      "email,firstName,lastName",
      "grace@example.com,Grace", // missing lastName column
    ].join("\n");

    const res = await request(app)
      .post("/api/contractor/bulk-import")
      .set("x-test-session", sessionHeader(adminSession()))
      .attach("file", Buffer.from(csv, "utf-8"), "techs.csv");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/invalid csv format/i);
    expect(captured).toHaveLength(0);
  });
});
