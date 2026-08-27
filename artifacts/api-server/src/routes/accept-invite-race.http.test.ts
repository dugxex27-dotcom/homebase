/**
 * HTTP-level tests: contractor accept-invite race condition
 *
 * POST /api/contractor/accept-invite previously read the invited user's
 * status/expiry, then did an unconditional UPDATE — two concurrent accepts
 * of the same token could both pass the read-check and both activate the
 * account (both setting a password, both establishing a session). The fix
 * folds the eligibility check into the UPDATE's WHERE clause itself
 * (`status = 'pending_invite' AND (expires_at IS NULL OR expires_at > now())`)
 * with `.returning()`, so only a request whose UPDATE actually matches a row
 * can activate — this is a single-row flag guard (not a COUNT-based limit),
 * so a plain atomic UPDATE...WHERE...RETURNING closes the race without
 * needing a transaction or row lock.
 */

import { vi, describe, it, expect, afterEach, beforeEach } from "vitest";

const { TOKEN, USER_ID, mockDbSelect, mockDbInsert, mockDbUpdate, mockDbExecute, mockGetUser } = vi.hoisted(() => ({
  TOKEN: "invite-token-abc123",
  USER_ID: "tech-invited-001",
  mockDbSelect: vi.fn(),
  mockDbInsert: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbExecute: vi.fn(),
  mockGetUser: vi.fn(),
}));

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({ getUser: mockGetUser }),
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
import { users } from "@workspace/db";

async function buildApp() {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    req.session = {
      save: (cb: (err?: any) => void) => cb(),
    };
    next();
  });
  await registerRoutes(app);
  return app;
}

function hybrid(promise: Promise<any>) {
  return {
    then: (onRes: any, onRej: any) => promise.then(onRes, onRej),
    catch: (onRej: any) => promise.catch(onRej),
    limit: () => promise,
  };
}

interface InvitedUserState {
  id: string;
  inviteToken: string | null;
  status: string;
  inviteExpiresAt: Date | null;
  email: string;
  firstName: string;
  lastName: string;
  companyId: string;
}

function wireDbMocks(user: InvitedUserState) {
  // The route's differentiation-read (used only when the atomic UPDATE below
  // matches zero rows) looks up `where(eq(users.inviteToken, token))`. Since
  // every test in this file submits the same TOKEN, that lookup's real-DB
  // semantics reduce to "does this row's current inviteToken column still
  // equal TOKEN" — which is exactly what real Postgres would report too
  // (once the token is cleared to null by a successful activation, a lookup
  // for the original token value correctly finds nothing).
  mockDbSelect.mockImplementation((_projection?: any) => ({
    from: (table: any) => ({
      where: (..._args: any[]) => {
        if (table === users) {
          return hybrid(Promise.resolve(user.inviteToken === TOKEN ? [{ ...user }] : []));
        }
        return hybrid(Promise.resolve([]));
      },
    }),
  }));

  mockDbInsert.mockImplementation((_table: any) => ({
    values: (payload: any) => {
      const p: any = Promise.resolve(undefined);
      (p as any).returning = () => Promise.resolve([{ id: "seed-row", ...payload }]);
      return p;
    },
  }));

  // Atomic conditional UPDATE...WHERE...RETURNING — mirrors the real
  // Postgres guarantee: the check (status still 'pending_invite', not
  // expired, matching token) and the write happen in one synchronous step
  // with no `await` in between, so two "concurrent" calls into this mock
  // (which interleave only at real `await` boundaries, same as Postgres
  // interleaves only at transaction commit boundaries) can never both see
  // an eligible row.
  mockDbUpdate.mockImplementation((table: any) => ({
    set: (patch: any) => ({
      where: (..._args: any[]) => ({
        returning: () => {
          if (table !== users) return Promise.resolve([]);
          const stillPending = user.inviteToken === TOKEN && user.status === "pending_invite";
          const stillValid = !user.inviteExpiresAt || user.inviteExpiresAt.getTime() > Date.now();
          if (stillPending && stillValid) {
            Object.assign(user, patch, { inviteToken: null, inviteExpiresAt: null });
            return Promise.resolve([{ ...user }]);
          }
          return Promise.resolve([]);
        },
      }),
    }),
  }));
}

beforeEach(() => {
  mockDbExecute.mockResolvedValue(undefined);
  mockGetUser.mockImplementation(async (id: string) => ({ id, role: "contractor", companyId: "company-1" }));
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/contractor/accept-invite — race condition", () => {
  it("activates a normal, valid pending invite", async () => {
    const app = await buildApp();
    const user: InvitedUserState = {
      id: USER_ID, inviteToken: TOKEN, status: "pending_invite", inviteExpiresAt: null,
      email: "tech@example.com", firstName: "", lastName: "", companyId: "company-1",
    };
    wireDbMocks(user);

    const res = await request(app).post("/api/contractor/accept-invite").send({
      token: TOKEN, firstName: "Tim", lastName: "Tech", password: "supersecret1",
    });

    expect(res.status).toBe(200);
    expect(user.status).toBe("active");
    expect(user.inviteToken).toBeNull();
  });

  it("rejects an already-accepted invite with a clear error, without re-activating", async () => {
    const app = await buildApp();
    const user: InvitedUserState = {
      id: USER_ID, inviteToken: null, status: "active", inviteExpiresAt: null,
      email: "tech@example.com", firstName: "Tim", lastName: "Tech", companyId: "company-1",
    };
    wireDbMocks(user);

    const res = await request(app).post("/api/contractor/accept-invite").send({
      token: TOKEN, firstName: "Tim", lastName: "Tech", password: "supersecret1",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("rejects an expired invite", async () => {
    const app = await buildApp();
    const user: InvitedUserState = {
      id: USER_ID, inviteToken: TOKEN, status: "pending_invite", inviteExpiresAt: new Date(Date.now() - 60_000),
      email: "tech@example.com", firstName: "", lastName: "", companyId: "company-1",
    };
    wireDbMocks(user);

    const res = await request(app).post("/api/contractor/accept-invite").send({
      token: TOKEN, firstName: "Tim", lastName: "Tech", password: "supersecret1",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/expired/i);
    expect(user.status).toBe("pending_invite"); // never activated
  });

  it("never lets two concurrent accepts of the same token both activate (real Promise.all race)", async () => {
    const app = await buildApp();
    const user: InvitedUserState = {
      id: USER_ID, inviteToken: TOKEN, status: "pending_invite", inviteExpiresAt: null,
      email: "tech@example.com", firstName: "", lastName: "", companyId: "company-1",
    };
    wireDbMocks(user);

    const [res1, res2] = await Promise.all([
      request(app).post("/api/contractor/accept-invite").send({ token: TOKEN, firstName: "Tim", lastName: "TechA", password: "supersecret1" }),
      request(app).post("/api/contractor/accept-invite").send({ token: TOKEN, firstName: "Tim", lastName: "TechB", password: "supersecret2" }),
    ]);

    const statuses = [res1.status, res2.status];
    // Exactly one activation succeeds; the other fails (400 already-accepted
    // or 404 invalid-token, depending on exactly which read observes the
    // cleared token first — never a second 200).
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(user.status).toBe("active");
    // Only one of the two concurrent submissions' data actually stuck.
    expect(["TechA", "TechB"]).toContain(user.lastName);
  });
});
