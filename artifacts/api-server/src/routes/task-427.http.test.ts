/**
 * HTTP regression coverage for Task 427's site-content and handoff
 * authorization/relationship checks.  The mocks intentionally follow the
 * appliance-manual-auth HTTP test pattern: routes are registered on Express
 * and requests exercise the actual middleware/handlers.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  ADMIN_ID, AGENT_ID, SELLER_ID, BUYER_ID, PACKAGE_ID, HOUSE_ID, TOKEN,
  dbSelect, dbUpdate, dbInsert, dbTransaction, getUser, state,
} = vi.hoisted(() => ({
  ADMIN_ID: "admin-427", AGENT_ID: "agent-427", SELLER_ID: "seller-427",
  BUYER_ID: "buyer-427", PACKAGE_ID: "package-427", HOUSE_ID: "house-427",
  TOKEN: "task-427-token",
  dbSelect: vi.fn(), dbUpdate: vi.fn(), dbInsert: vi.fn(), dbTransaction: vi.fn(),
  getUser: vi.fn(),
  state: { ownerAuthorizedTransfer: false, updates: [] as any[] },
}));

const session = (id: string, role: string, email = `${id}@test.com`) => ({
  isAuthenticated: true, user: { id, role, email, status: "active" },
});

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, res: any, next: any) => {
      const who = req.headers["x-test-user"];
      if (who === "agent") req.session = session(AGENT_ID, "agent");
      else if (who === "buyer") req.session = session(BUYER_ID, "homeowner");
      else if (who === "admin") req.session = session(ADMIN_ID, "admin", "admin427@test.com");
      else if (who === "non-admin") req.session = session("ordinary-427", "homeowner");
      else return res.status(401).json({ message: "Unauthorized" });
      next();
    }),
    requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  };
});
vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));
vi.mock("ws", () => ({ WebSocketServer: class { on() {} clients = new Set(); }, WebSocket: { OPEN: 1 } }));
vi.mock("../push-routes", () => ({ default: vi.fn() }));
vi.mock("../push-service", () => ({ pushService: { sendToUser: vi.fn(), sendToMany: vi.fn() } }));
vi.mock("../notification-orchestrator", () => ({ notificationOrchestrator: { notify: vi.fn(), sendMaintenanceReminder: vi.fn(), sendWeatherAlert: vi.fn() } }));
vi.mock("../email-service", () => ({ sendEmail: vi.fn(), emailService: { send: vi.fn(), wrapEmailContent: vi.fn(), getEmailHeader: vi.fn() } }));
vi.mock("../sms-service", () => ({ smsService: { send: vi.fn() } }));
vi.mock("../apple-iap", () => ({ verifyAndActivateAppleTransaction: vi.fn(), handleAppleServerNotification: vi.fn(), AppleIapError: class extends Error {} }));
vi.mock("../objectStorage", () => ({ ObjectStorageService: class { uploadFile = vi.fn(); upload = vi.fn(); }, ObjectNotFoundError: class extends Error {} }));
vi.mock("../geocoding-service", () => ({ geocodeAddress: vi.fn(), calculateDistance: vi.fn() }));
vi.mock("../invoice-analysis-service", () => ({ extractInvoiceData: vi.fn(), verifyDIYPhotos: vi.fn() }));
vi.mock("openai", () => ({ default: class { chat = { completions: { create: vi.fn() } }; } }));
vi.mock("stripe", () => ({ default: class { webhooks = { constructEvent: vi.fn() }; subscriptions = { retrieve: vi.fn() }; accounts = { retrieve: vi.fn() }; subscriptionItems = { createUsageRecord: vi.fn() }; } }));
vi.mock("../security-audit", () => ({ AuditEventTypes: {}, AuditEventCategories: {}, AuditSeverity: {}, auditLogger: { log: vi.fn(), logAuth: vi.fn(), logLogin: vi.fn(), logLogout: vi.fn(), logSecurity: vi.fn(), logRequest: vi.fn(), logPasswordChange: vi.fn(), logAdminAction: vi.fn() }, sessionManager: { createSession: vi.fn(), validateSession: vi.fn(), invalidateSession: vi.fn(), trackRequest: vi.fn() }, userRateLimiter: { check: vi.fn() }, getClientIP: vi.fn() }));
vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return { storage: createStorageMock({ getUser }) };
});
vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: { select: dbSelect, update: dbUpdate, insert: dbInsert, delete: vi.fn(), execute: vi.fn(), transaction: dbTransaction },
}));

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import { homeHandoffPackages, houses, houseTransfers } from "@workspace/db";

const pkg = () => ({
  id: PACKAGE_ID, agentId: AGENT_ID, inviteToken: TOKEN, houseId: HOUSE_ID,
  houseEverLinked: true, claimedAt: null, status: "sent", propertyAddress: "427 Test Way",
  buyerEmail: `${BUYER_ID}@test.com`,
});
const ownerTransfer = () => ({
  id: "owner-transfer-427",
  houseId: HOUSE_ID,
  fromHomeownerId: SELLER_ID,
  toHomeownerEmail: `${BUYER_ID}@test.com`,
  status: "pending",
  expiresAt: new Date(Date.now() + 60_000),
});
const chain = (rows: any[]) => {
  const result: any = Promise.resolve(rows);
  result.limit = vi.fn().mockResolvedValue(rows);
  result.orderBy = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue(rows) });
  return result;
};

async function buildApp() {
  dbInsert.mockReturnValue({ values: vi.fn().mockReturnValue({ onConflictDoNothing: vi.fn().mockResolvedValue(undefined), onConflictDoUpdate: vi.fn().mockResolvedValue(undefined), returning: vi.fn().mockResolvedValue([]) }) });
  dbUpdate.mockImplementation(() => ({ set: vi.fn().mockImplementation((values: any) => ({ where: vi.fn().mockImplementation(() => { state.updates.push(values); return { returning: vi.fn().mockResolvedValue([{ ...pkg(), ...values }]) }; }) })) }));
  dbTransaction.mockImplementation(async (callback: any) => callback({}));
  dbSelect.mockImplementation(() => ({
    from: vi.fn().mockImplementation((table: any) => ({
      where: vi.fn().mockReturnValue(
        table === homeHandoffPackages ? chain([pkg()]) :
        table === houses ? chain([{ id: HOUSE_ID, homeownerId: SELLER_ID }]) :
        table === houseTransfers ? chain(state.ownerAuthorizedTransfer ? [ownerTransfer()] : []) :
        chain([]),
      ),
    })),
  }));
  const app = express();
  app.use(express.json());
  // Site-content uses its local requireAdmin middleware directly (rather than
  // isAuthenticated), so seed the same header-driven session for that route.
  app.use((req: any, _res, next) => {
    const who = req.headers["x-test-user"];
    if (who === "admin") req.session = session(ADMIN_ID, "admin", "admin427@test.com");
    if (who === "non-admin") req.session = session("ordinary-427", "homeowner");
    next();
  });
  await registerRoutes(app);
  return app;
}

beforeEach(() => {
  state.ownerAuthorizedTransfer = false;
  state.updates = [];
  getUser.mockImplementation(async (id: string) => {
    if (id === ADMIN_ID) return { id, isQaAccount: false };
    if (id === BUYER_ID) return { id, email: `${BUYER_ID}@test.com`, role: "homeowner" };
    return undefined;
  });
  process.env.ADMIN_EMAILS = "admin427@test.com";
  process.env.NODE_ENV = "development";
});
afterEach(() => vi.clearAllMocks());

describe("Task 427 HTTP regressions", () => {
  it("keeps site-content writes admin-only in development", async () => {
    const app = await buildApp();
    const unauthenticated = await request(app).put("/api/site-content/hero").send({ value: "Updated" });
    const nonAdmin = await request(app).put("/api/site-content/hero").set("x-test-user", "non-admin").send({ value: "Updated" });
    const admin = await request(app).put("/api/site-content/hero").set("x-test-user", "admin").send({ value: "Updated" });
    expect(unauthenticated.status).toBe(401);
    expect(nonAdmin.status).toBe(403);
    expect(admin.status).toBe(200);
  });

  it("refuses a house link without the current homeowner's property-specific transfer authorization", async () => {
    const app = await buildApp();
    const res = await request(app).patch(`/api/agent/handoff-packages/${PACKAGE_ID}`).set("x-test-user", "agent").send({ houseId: HOUSE_ID });
    expect(res.status).toBe(404);
    expect(state.updates).toEqual([]);
  });

  it("allows linking a house covered by the current homeowner's transfer authorization", async () => {
    state.ownerAuthorizedTransfer = true;
    const app = await buildApp();
    const res = await request(app).patch(`/api/agent/handoff-packages/${PACKAGE_ID}`).set("x-test-user", "agent").send({ houseId: HOUSE_ID });
    expect(res.status).toBe(200);
    expect(state.updates).toContainEqual(expect.objectContaining({ houseId: HOUSE_ID, houseEverLinked: true }));
  });

  it("refuses an unrelated house transfer claim before any write", async () => {
    const app = await buildApp();
    const res = await request(app).post(`/api/handoff/${TOKEN}/claim`).set("x-test-user", "buyer").send({});
    expect(res.status).toBe(404);
    expect(state.updates).toEqual([]);
    expect(dbTransaction).not.toHaveBeenCalled();
  });
});