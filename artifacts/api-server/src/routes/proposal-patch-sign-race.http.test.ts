/**
 * HTTP-level tests: proposal PATCH / sign race condition
 *
 * Both the generic `PATCH /api/proposals/:id` and `POST /api/proposals/:id/sign`
 * previously read the proposal, checked its old status in JS, then wrote an
 * unconditional update — two concurrent requests (e.g. a homeowner
 * double-clicking "sign", or a contractor and homeowner acting on the same
 * proposal at once) could both pass the read-check and both apply their
 * write, both observing the same "old status -> new status" transition and
 * both firing a duplicate notification / achievement check.
 *
 * The fix folds the "status hasn't changed since we read it" check into the
 * update itself via `storage.updateProposalIfStatusMatches` (atomic
 * UPDATE...WHERE status = expected...RETURNING), so only the request whose
 * write actually matches a row can proceed; the loser gets a 409 and never
 * fires a second notification.
 */

import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

const {
  HOMEOWNER_ID,
  CONTRACTOR_ID,
  PROPOSAL_ID,
  mockGetProposal,
  mockUpdateProposalIfStatusMatches,
  mockCheckAchievements,
  mockCreateNotificationSafely,
} = vi.hoisted(() => ({
  HOMEOWNER_ID: "homeowner-001",
  CONTRACTOR_ID: "contractor-001",
  PROPOSAL_ID: "proposal-001",
  mockGetProposal: vi.fn(),
  mockUpdateProposalIfStatusMatches: vi.fn(),
  mockCheckAchievements: vi.fn(),
  mockCreateNotificationSafely: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return { ...actual, setupAuth: vi.fn().mockResolvedValue(undefined) };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getProposal: mockGetProposal,
      updateProposalIfStatusMatches: mockUpdateProposalIfStatusMatches,
      checkAndUnlockContractorHiringAchievements: mockCheckAchievements,
      getUser: vi.fn().mockResolvedValue({ id: CONTRACTOR_ID, firstName: "Cara", lastName: "Contractor", companyId: null }),
      getCompany: vi.fn().mockResolvedValue(null),
    }),
  };
});

vi.mock("../notification-writers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../notification-writers")>();
  return {
    ...actual,
    createNotificationSafely: (...args: any[]) => mockCreateNotificationSafely(...args),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue(undefined), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({ values: () => ({ returning: () => Promise.resolve([{ id: "seed" }]) }) }),
    select: vi.fn().mockReturnValue({ from: () => ({ where: () => Promise.resolve([]) }) }),
    update: vi.fn().mockReturnValue({ set: () => ({ where: () => Promise.resolve(undefined) }) }),
    execute: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) => cb({})),
  },
}));

vi.mock("../geocoding-service", () => ({
  geocodeAddress: vi.fn().mockResolvedValue(null),
  calculateDistance: vi.fn().mockReturnValue(0),
}));
vi.mock("../push-routes", () => ({ default: vi.fn() }));
vi.mock("../push-service", () => ({ pushService: { sendToUser: vi.fn(), sendToMany: vi.fn() } }));
vi.mock("../notification-orchestrator", () => ({
  notificationOrchestrator: { notify: vi.fn(), sendMaintenanceReminder: vi.fn(), sendWeatherAlert: vi.fn() },
}));
vi.mock("../email-service", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
  emailService: { send: vi.fn().mockResolvedValue(undefined), sendTechInviteEmail: vi.fn().mockResolvedValue(undefined) },
}));
vi.mock("../sms-service", () => ({ smsService: { send: vi.fn().mockResolvedValue(undefined) } }));
vi.mock("../apple-iap", () => ({
  verifyAndActivateAppleTransaction: vi.fn().mockResolvedValue(undefined),
  handleAppleServerNotification: vi.fn().mockResolvedValue(undefined),
  AppleIapError: class AppleIapError extends Error {},
}));
vi.mock("../objectStorage", () => ({
  ObjectStorageService: class MockObjectStorageService {
    upload = vi.fn(); uploadFile = vi.fn().mockResolvedValue(undefined); download = vi.fn(); delete = vi.fn();
    getSignedUrl = vi.fn(); getUploadUrl = vi.fn(); deleteObject = vi.fn(); getObject = vi.fn(); putObject = vi.fn(); listObjects = vi.fn();
    normalizeObjectEntityPath = (p: string) => p;
  },
  ObjectNotFoundError: class ObjectNotFoundError extends Error {},
}));
vi.mock("openai", () => ({ default: class MockOpenAI { chat = { completions: { create: vi.fn() } }; } }));
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = { retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }) };
  }
  return { default: MockStripe };
});
vi.mock("../security-audit", () => ({
  AuditEventTypes: {}, AuditEventCategories: {}, AuditSeverity: {},
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined), logAuth: vi.fn().mockResolvedValue(undefined), logLogin: vi.fn().mockResolvedValue(undefined),
    logLogout: vi.fn().mockResolvedValue(undefined), logSecurity: vi.fn().mockResolvedValue(undefined), logRequest: vi.fn().mockResolvedValue(undefined),
    logPasswordChange: vi.fn().mockResolvedValue(undefined), logAdminAction: vi.fn().mockResolvedValue(undefined),
  },
  sessionManager: { createSession: vi.fn(), validateSession: vi.fn(), invalidateSession: vi.fn(), trackRequest: vi.fn() },
  userRateLimiter: { check: vi.fn().mockResolvedValue(true) },
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

async function buildApp(sessionUser: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = { isAuthenticated: true, user: sessionUser, save: (cb: (err?: any) => void) => cb() };
    next();
  });
  await registerRoutes(app);
  return app;
}

interface ProposalState {
  id: string;
  contractorId: string;
  homeownerId: string;
  status: string;
  title: string;
  [key: string]: any;
}

/**
 * A tiny "arrive at the barrier" helper: the returned function resolves only
 * once it has been called `n` times, so `n` concurrent callers are guaranteed
 * to all reach the barrier (i.e. all complete their *read*) before any of
 * them is allowed to proceed to the *write*. Without this, two supertest
 * requests fired via `Promise.all` are not guaranteed to interleave at the
 * precise point needed to exercise the race — one may incidentally run to
 * completion before the other's handler even starts. This makes the "both
 * requests read the same pre-write state" race window deterministic instead
 * of relying on incidental Node scheduling.
 */
function makeArrivalBarrier(n: number) {
  let arrivals = 0;
  const waiters: Array<() => void> = [];
  return async function arrive() {
    arrivals++;
    if (arrivals >= n) {
      waiters.forEach((resolve) => resolve());
      return;
    }
    await new Promise<void>((resolve) => waiters.push(resolve));
  };
}

/**
 * Wires the storage mocks to a single shared in-memory proposal, with
 * `updateProposalIfStatusMatches` performing the check-and-mutate atomically
 * in one synchronous step — mirroring the real UPDATE...WHERE...RETURNING
 * guarantee the same way a real Postgres row lock would. When `raceReaders`
 * is set, `getProposal` blocks at a barrier until that many concurrent
 * callers have arrived, guaranteeing every reader observes the pre-write
 * state before any writer proceeds — the deterministic version of "two
 * requests happened to read at the same time".
 */
function wireProposalMocks(state: ProposalState, raceReaders = 1) {
  const arrive = makeArrivalBarrier(raceReaders);
  mockGetProposal.mockImplementation(async (id: string) => {
    const snapshot = id === state.id ? { ...state } : undefined;
    await arrive();
    return snapshot;
  });
  mockUpdateProposalIfStatusMatches.mockImplementation(async (id: string, expectedStatus: string, patch: Record<string, any>) => {
    if (id !== state.id || state.status !== expectedStatus) {
      return undefined;
    }
    Object.assign(state, patch);
    return { ...state };
  });
}

beforeEach(() => {
  mockCheckAchievements.mockResolvedValue([]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("PATCH /api/proposals/:id — race condition", () => {
  it("applies a normal status transition and fires exactly one notification", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID, contractorId: CONTRACTOR_ID, homeownerId: HOMEOWNER_ID, status: "draft", title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app).patch(`/api/proposals/${PROPOSAL_ID}`).send({ status: "sent" });

    expect(res.status).toBe(200);
    expect(state.status).toBe("sent");
    expect(mockCreateNotificationSafely).toHaveBeenCalledTimes(1);
  });

  it("never lets two concurrent PATCHes both apply a status transition or both notify", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID, contractorId: CONTRACTOR_ID, homeownerId: HOMEOWNER_ID, status: "draft", title: "Roof repair",
    };
    wireProposalMocks(state, 2);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const [res1, res2] = await Promise.all([
      request(app).patch(`/api/proposals/${PROPOSAL_ID}`).send({ status: "sent" }),
      request(app).patch(`/api/proposals/${PROPOSAL_ID}`).send({ status: "sent" }),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);
    expect(state.status).toBe("sent");
    // Exactly one homeowner notification for the transition, not two.
    expect(mockCreateNotificationSafely).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/proposals/:id/sign — race condition", () => {
  it("signs a normal sent proposal once and checks achievements once", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID, contractorId: CONTRACTOR_ID, homeownerId: HOMEOWNER_ID, status: "sent", title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: HOMEOWNER_ID });

    const res = await request(app).post(`/api/proposals/${PROPOSAL_ID}/sign`).send({
      signature: "data:sig", signerName: "Homer Owner", signedAt: new Date().toISOString(), ipAddress: "1.2.3.4",
    });

    expect(res.status).toBe(200);
    expect(state.status).toBe("accepted");
    expect(mockCheckAchievements).toHaveBeenCalledTimes(1);
  });

  it("never lets two concurrent /sign submissions both apply a signature or both check achievements twice", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID, contractorId: CONTRACTOR_ID, homeownerId: HOMEOWNER_ID, status: "sent", title: "Roof repair",
    };
    wireProposalMocks(state, 2);
    const app = await buildApp({ id: HOMEOWNER_ID });

    const body = { signature: "data:sig", signerName: "Homer Owner", signedAt: new Date().toISOString(), ipAddress: "1.2.3.4" };
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/proposals/${PROPOSAL_ID}/sign`).send(body),
      request(app).post(`/api/proposals/${PROPOSAL_ID}/sign`).send(body),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);
    expect(state.status).toBe("accepted");
    // Achievement check (and its downstream notifications) must run for the
    // single winning signature only, never twice.
    expect(mockCheckAchievements).toHaveBeenCalledTimes(1);
  });
});
