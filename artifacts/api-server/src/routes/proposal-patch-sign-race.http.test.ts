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
  mockGetProposals,
  mockGetProposal,
  mockGetConversations,
  mockCreateProposal,
  mockDeleteProposal,
  mockUpdateProposalIfStatusMatches,
  mockGetContractByProposalId,
  mockAcceptProposalAndCreateContractIfSent,
  mockCheckAchievements,
  mockCreateNotificationSafely,
} = vi.hoisted(() => ({
  HOMEOWNER_ID: "homeowner-001",
  CONTRACTOR_ID: "contractor-001",
  PROPOSAL_ID: "proposal-001",
  mockGetProposals: vi.fn(),
  mockGetProposal: vi.fn(),
  mockGetConversations: vi.fn(),
  mockCreateProposal: vi.fn(),
  mockDeleteProposal: vi.fn(),
  mockUpdateProposalIfStatusMatches: vi.fn(),
  mockGetContractByProposalId: vi.fn(),
  mockAcceptProposalAndCreateContractIfSent: vi.fn(),
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
      getProposals: mockGetProposals,
      getProposal: mockGetProposal,
      getConversations: mockGetConversations,
      createProposal: mockCreateProposal,
      deleteProposal: mockDeleteProposal,
      updateProposalIfStatusMatches: mockUpdateProposalIfStatusMatches,
      getContractByProposalId: mockGetContractByProposalId,
      acceptProposalAndCreateContractIfSent: mockAcceptProposalAndCreateContractIfSent,
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
  getClientIP: vi.fn().mockImplementation((req: any) =>
    req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
    req.socket?.remoteAddress ||
    "127.0.0.1"
  ),
}));

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

async function buildApp(sessionUser: Record<string, unknown>) {
  const app = express();
  app.use(express.json());
  app.use((req: any, _res, next) => {
    const role =
      sessionUser.role ??
      (sessionUser.id === CONTRACTOR_ID ? "contractor" : "homeowner");
    req.session = {
      isAuthenticated: true,
      user: { role, ...sessionUser },
      save: (cb: (err?: any) => void) => cb(),
    };
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
  let contract: Record<string, any> | undefined;
  let contractCreations = 0;
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
  mockGetContractByProposalId.mockImplementation(async (proposalId: string) =>
    proposalId === state.id && contract ? { ...contract } : undefined,
  );
  mockAcceptProposalAndCreateContractIfSent.mockImplementation(
    async (
      proposalId: string,
      acceptedAt: Date,
      customerSignature: string,
      customerSignerName: string,
      signatureIpAddress: string,
    ) => {
      if (
        proposalId !== state.id ||
        state.status !== "sent" ||
        !state.homeownerId
      ) {
        return undefined;
      }

      const acceptedTerms = { ...state };
      Object.assign(state, {
        status: "accepted",
        customerSignature,
        customerSignerName,
        contractSignedAt: acceptedAt,
        signatureIpAddress,
        rejectionReason: null,
      });
      contract = {
        id: "contract-001",
        proposalId,
        homeownerId: acceptedTerms.homeownerId,
        contractorId: acceptedTerms.contractorId,
        companyId: acceptedTerms.companyId ?? null,
        title: acceptedTerms.title,
        description: acceptedTerms.description ?? "Repair description",
        serviceType: acceptedTerms.serviceType ?? "Roofing",
        estimatedCost: acceptedTerms.estimatedCost ?? "1234.50",
        estimatedDuration: acceptedTerms.estimatedDuration ?? "2 days",
        scope: acceptedTerms.scope ?? "Replace damaged roofing",
        materials: [...(acceptedTerms.materials ?? ["Shingles"])],
        warrantyPeriod: acceptedTerms.warrantyPeriod ?? null,
        validUntil: acceptedTerms.validUntil ?? "2026-12-31",
        status: "active",
        createdAt: acceptedAt,
        acceptedAt,
        customerSignature,
        customerSignerName,
        customerSignedAt: acceptedAt,
        contractFilePath: acceptedTerms.contractFilePath ?? null,
      };
      contractCreations += 1;
      return { proposal: { ...state }, contract: { ...contract } };
    },
  );

  return {
    getContract: () => contract && { ...contract },
    getContractCreations: () => contractCreations,
  };
}

beforeEach(() => {
  mockCheckAchievements.mockResolvedValue([]);
  mockGetConversations.mockResolvedValue([
    {
      id: "conversation-001",
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      subject: "Roof repair",
      status: "active",
      otherPartyName: "Home Owner",
      unreadCount: 0,
    },
  ]);
  mockCreateProposal.mockImplementation(async (proposal) => ({
    id: PROPOSAL_ID,
    ...proposal,
  }));
  mockDeleteProposal.mockResolvedValue(true);
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

  it.each([
    ["status", "accepted"],
    ["customerSignature", "forged-signature"],
    ["contractSignedAt", new Date().toISOString()],
    ["signatureIpAddress", "203.0.113.10"],
  ])(
    "rejects a homeowner PATCH attempting to change %s",
    async (field, value) => {
      const state: ProposalState = {
        id: PROPOSAL_ID,
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status: "draft",
        title: "Roof repair",
      };
      wireProposalMocks(state);
      const app = await buildApp({ id: HOMEOWNER_ID });

      const res = await request(app)
        .patch(`/api/proposals/${PROPOSAL_ID}`)
        .send({ [field]: value });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("only update customer notes");
      expect(state.status).toBe("draft");
      expect(state.customerSignature).toBeUndefined();
      expect(mockUpdateProposalIfStatusMatches).not.toHaveBeenCalled();
    },
  );

  it("still allows a homeowner to update customer notes", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: HOMEOWNER_ID });

    const res = await request(app)
      .patch(`/api/proposals/${PROPOSAL_ID}`)
      .send({ customerNotes: "Please call before arriving." });

    expect(res.status).toBe(200);
    expect(mockUpdateProposalIfStatusMatches).toHaveBeenCalledWith(
      PROPOSAL_ID,
      "sent",
      { customerNotes: "Please call before arriving." },
    );
  });

  it("preserves contractor ability to PATCH proposal status", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "draft",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app)
      .patch(`/api/proposals/${PROPOSAL_ID}`)
      .send({ status: "sent" });

    expect(res.status).toBe(200);
    expect(state.status).toBe("sent");
  });

  it.each([
    ["status", "accepted"],
    ["status", "rejected"],
    ["customerSignature", "forged-signature"],
    ["customerSignerName", "Forged Signer"],
    ["contractSignedAt", new Date().toISOString()],
    ["signatureIpAddress", "203.0.113.10"],
    ["rejectionReason", "forged-reason"],
  ])(
    "rejects a contractor PATCH attempting to change server-managed %s",
    async (field, value) => {
      const state: ProposalState = {
        id: PROPOSAL_ID,
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status: "draft",
        title: "Roof repair",
      };
      wireProposalMocks(state);
      const app = await buildApp({ id: CONTRACTOR_ID });

      const res = await request(app)
        .patch(`/api/proposals/${PROPOSAL_ID}`)
        .send({ [field]: value });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("dedicated homeowner response");
      expect(mockUpdateProposalIfStatusMatches).not.toHaveBeenCalled();
      expect(state.status).toBe("draft");
    },
  );

  it.each(["sent", "accepted", "rejected", "expired"])(
    "rejects contractor term edits after a proposal reaches %s",
    async (status) => {
      const state: ProposalState = {
        id: PROPOSAL_ID,
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status,
        title: "Roof repair",
      };
      wireProposalMocks(state);
      const app = await buildApp({ id: CONTRACTOR_ID });

      const res = await request(app)
        .patch(`/api/proposals/${PROPOSAL_ID}`)
        .send({ title: "Changed after sending" });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Only draft proposals");
      expect(mockUpdateProposalIfStatusMatches).not.toHaveBeenCalled();
      expect(state.title).toBe("Roof repair");
    },
  );

  it.each(["homeownerId", "contractorId", "companyId", "createdBy"])(
    "rejects contractor reassignment of immutable party field %s",
    async (field) => {
      const state: ProposalState = {
        id: PROPOSAL_ID,
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status: "draft",
        title: "Roof repair",
      };
      wireProposalMocks(state);
      const app = await buildApp({ id: CONTRACTOR_ID });

      const res = await request(app)
        .patch(`/api/proposals/${PROPOSAL_ID}`)
        .send({ [field]: "other-party" });

      expect(res.status).toBe(403);
      expect(mockUpdateProposalIfStatusMatches).not.toHaveBeenCalled();
    },
  );
});

describe("POST /api/proposals — contractor and signing authorization", () => {
  const validProposal = {
    homeownerId: HOMEOWNER_ID,
    title: "Roof repair",
    description: "Replace damaged roofing",
    serviceType: "roofing",
    estimatedCost: "1234.50",
    estimatedDuration: "2 days",
    scope: "Remove and replace shingles",
    materials: ["Shingles"],
    warrantyPeriod: "5 years",
    validUntil: "2026-12-31",
    status: "sent",
  };

  it("allows a contractor to send a proposal to a homeowner in an existing conversation", async () => {
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app).post("/api/proposals").send(validProposal);

    expect(res.status).toBe(201);
    expect(mockCreateProposal).toHaveBeenCalledWith(
      expect.objectContaining({
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status: "sent",
      }),
    );
  });

  it("rejects proposal creation by a non-contractor", async () => {
    const app = await buildApp({ id: HOMEOWNER_ID, role: "homeowner" });

    const res = await request(app).post("/api/proposals").send(validProposal);

    expect(res.status).toBe(403);
    expect(mockCreateProposal).not.toHaveBeenCalled();
  });

  it("rejects a proposal for a homeowner with no contractor conversation", async () => {
    mockGetConversations.mockResolvedValue([]);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app).post("/api/proposals").send(validProposal);

    expect(res.status).toBe(403);
    expect(res.body.message).toContain("existing conversation");
    expect(mockCreateProposal).not.toHaveBeenCalled();
  });

  it.each([
    ["status", "accepted"],
    ["status", "rejected"],
    ["customerSignature", "forged-signature"],
    ["customerSignerName", "Forged Signer"],
    ["contractSignedAt", new Date().toISOString()],
    ["signatureIpAddress", "203.0.113.10"],
    ["rejectionReason", "forged-reason"],
  ])("rejects create attempts that set server-managed %s", async (field, value) => {
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app)
      .post("/api/proposals")
      .send({ ...validProposal, [field]: value });

    expect(res.status).toBe(403);
    expect(mockCreateProposal).not.toHaveBeenCalled();
  });
});

describe("GET /api/proposals — authenticated role scoping", () => {
  it("uses only the contractor filter when a contractor requests their list", async () => {
    mockGetProposals.mockResolvedValue([]);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app)
      .get("/api/proposals")
      .query({ contractorId: CONTRACTOR_ID });

    expect(res.status).toBe(200);
    expect(mockGetProposals).toHaveBeenCalledWith(CONTRACTOR_ID, undefined);
  });

  it("rejects a contractor filter for a different user", async () => {
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app)
      .get("/api/proposals")
      .query({ contractorId: "other-contractor" });

    expect(res.status).toBe(403);
    expect(mockGetProposals).not.toHaveBeenCalled();
  });

  it("uses OR-party scoping when no role filter is supplied", async () => {
    mockGetProposals.mockResolvedValue([]);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app).get("/api/proposals");

    expect(res.status).toBe(200);
    expect(mockGetProposals).toHaveBeenCalledWith(CONTRACTOR_ID, CONTRACTOR_ID);
  });
});

describe("DELETE /api/proposals/:id — immutable outcome retention", () => {
  it.each(["accepted", "rejected"])(
    "retains a contractor-owned %s proposal",
    async (status) => {
      const state: ProposalState = {
        id: PROPOSAL_ID,
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status,
        title: "Roof repair",
      };
      wireProposalMocks(state);
      const app = await buildApp({ id: CONTRACTOR_ID });

      const res = await request(app).delete(`/api/proposals/${PROPOSAL_ID}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("immutable records");
      expect(mockDeleteProposal).not.toHaveBeenCalled();
    },
  );

  it("still allows the contractor to delete a non-terminal proposal", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app).delete(`/api/proposals/${PROPOSAL_ID}`);

    expect(res.status).toBe(204);
    expect(mockDeleteProposal).toHaveBeenCalledWith(PROPOSAL_ID);
  });
});

describe("GET /api/proposals/:id/contract", () => {
  const proposal = {
    id: PROPOSAL_ID,
    contractorId: CONTRACTOR_ID,
    homeownerId: HOMEOWNER_ID,
    status: "accepted",
    title: "Roof repair",
  };
  const contract = {
    id: "contract-001",
    proposalId: PROPOSAL_ID,
    homeownerId: HOMEOWNER_ID,
    contractorId: CONTRACTOR_ID,
    title: "Roof repair",
    description: "Replace the roof",
    serviceType: "roofing",
    estimatedCost: "8450.25",
    estimatedDuration: "3 days",
    scope: "Remove and replace shingles",
    materials: ["Shingles", "Underlayment"],
    warrantyPeriod: "10 years",
    validUntil: "2026-10-31",
    status: "active",
    acceptedAt: new Date("2026-08-28T12:00:00.000Z"),
    customerSignerName: "Homer Owner",
    customerSignedAt: new Date("2026-08-28T12:00:00.000Z"),
    contractFilePath: "/objects/contract.pdf",
  };

  it.each([CONTRACTOR_ID, HOMEOWNER_ID])(
    "returns the immutable snapshot to an authorized proposal party (%s)",
    async (userId) => {
      mockGetProposal.mockResolvedValue(proposal);
      mockGetContractByProposalId.mockResolvedValue(contract);
      const app = await buildApp({ id: userId });

      const res = await request(app).get(
        `/api/proposals/${PROPOSAL_ID}/contract`,
      );

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        proposalId: PROPOSAL_ID,
        estimatedDuration: "3 days",
        validUntil: "2026-10-31",
        customerSignerName: "Homer Owner",
        scope: "Remove and replace shingles",
      });
    },
  );

  it("rejects an unrelated authenticated user", async () => {
    mockGetProposal.mockResolvedValue(proposal);
    mockGetContractByProposalId.mockResolvedValue(contract);
    const app = await buildApp({ id: "unrelated-user" });

    const res = await request(app).get(
      `/api/proposals/${PROPOSAL_ID}/contract`,
    );

    expect(res.status).toBe(403);
    expect(mockGetContractByProposalId).not.toHaveBeenCalled();
  });

  it("returns 404 when an accepted proposal has no contract snapshot", async () => {
    mockGetProposal.mockResolvedValue(proposal);
    mockGetContractByProposalId.mockResolvedValue(undefined);
    const app = await buildApp({ id: CONTRACTOR_ID });

    const res = await request(app).get(
      `/api/proposals/${PROPOSAL_ID}/contract`,
    );

    expect(res.status).toBe(404);
    expect(res.body.message).toBe("Contract not found");
  });
});

describe("POST /api/proposals/:id/accept-and-sign", () => {
  it("accepts and signs a sent proposal with server-derived audit fields", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      companyId: "company-001",
      status: "sent",
      title: "Roof repair",
      description: "Replace storm-damaged roof",
      serviceType: "Roofing",
      estimatedCost: "8450.25",
      scope: "Remove old roof and install new shingles",
      materials: ["Architectural shingles", "Underlayment"],
      warrantyPeriod: "10 years",
      contractFilePath: "/contracts/source.pdf",
    };
    const harness = wireProposalMocks(state);
    const app = await buildApp({ id: HOMEOWNER_ID });
    const before = Date.now();

    const res = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
      .set("x-forwarded-for", "198.51.100.24")
      .send({
        signerName: "Homer Owner",
        agreementConfirmed: true,
      });

    expect(res.status).toBe(200);
    expect(state.status).toBe("accepted");
    expect(state.customerSignerName).toBe("Homer Owner");
    expect(state.signatureIpAddress).toBe("198.51.100.24");
    expect(state.contractSignedAt).toBeInstanceOf(Date);
    expect(state.contractSignedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(JSON.parse(state.customerSignature)).toEqual({
      type: "typed-name-agreement",
      signerName: "Homer Owner",
      agreementConfirmed: true,
    });
    expect(harness.getContractCreations()).toBe(1);
    expect(res.body.contract).toMatchObject({
      id: "contract-001",
      proposalId: PROPOSAL_ID,
      homeownerId: HOMEOWNER_ID,
      contractorId: CONTRACTOR_ID,
      companyId: "company-001",
      title: "Roof repair",
      description: "Replace storm-damaged roof",
      serviceType: "Roofing",
      estimatedCost: "8450.25",
      scope: "Remove old roof and install new shingles",
      materials: ["Architectural shingles", "Underlayment"],
      warrantyPeriod: "10 years",
      status: "active",
      customerSignerName: "Homer Owner",
      contractFilePath: "/contracts/source.pdf",
    });
    expect(res.body.contract.acceptedAt).toBe(res.body.contract.customerSignedAt);
    expect(mockCheckAchievements).toHaveBeenCalledTimes(1);
    expect(mockCreateNotificationSafely).toHaveBeenCalledTimes(1);
    expect(mockCreateNotificationSafely.mock.calls[0][1]).toMatchObject({
      homeownerId: CONTRACTOR_ID,
      type: "proposal",
      title: "Proposal Accepted and Signed",
      actionUrl: "/contractor-dashboard",
    });
  });

  it("returns the existing contract on an identical retry without duplicating side effects", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
      description: "Original description",
      serviceType: "Roofing",
      estimatedCost: "1200.00",
      scope: "Original scope",
      materials: ["Original material"],
      warrantyPeriod: "1 year",
    };
    const harness = wireProposalMocks(state);
    const app = await buildApp({ id: HOMEOWNER_ID });
    const body = { signerName: "Homer Owner", agreementConfirmed: true };

    const first = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
      .send(body);
    const retry = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
      .send(body);

    expect(first.status).toBe(200);
    expect(retry.status).toBe(200);
    expect(retry.body.idempotent).toBe(true);
    expect(retry.body.contract.id).toBe(first.body.contract.id);
    expect(harness.getContractCreations()).toBe(1);
    expect(mockCreateNotificationSafely).toHaveBeenCalledTimes(1);
    expect(mockCheckAchievements).toHaveBeenCalledTimes(1);
  });

  it("keeps the accepted contract snapshot unchanged after later proposal edits", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Original title",
      description: "Original description",
      serviceType: "Roofing",
      estimatedCost: "2500.00",
      scope: "Original scope",
      materials: ["Original material"],
      warrantyPeriod: "5 years",
    };
    const harness = wireProposalMocks(state);
    const homeownerApp = await buildApp({ id: HOMEOWNER_ID });

    const accepted = await request(homeownerApp)
      .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
      .send({ signerName: "Homer Owner", agreementConfirmed: true });
    expect(accepted.status).toBe(200);

    const originalContract = harness.getContract();
    Object.assign(state, {
      title: "Edited proposal title",
      description: "Edited proposal description",
      estimatedCost: "9999.99",
      scope: "Edited scope",
      materials: ["Edited material"],
      warrantyPeriod: "No warranty",
    });

    expect(harness.getContract()).toEqual(originalContract);
    expect(harness.getContract()).toMatchObject({
      title: "Original title",
      description: "Original description",
      estimatedCost: "2500.00",
      scope: "Original scope",
      materials: ["Original material"],
      warrantyPeriod: "5 years",
    });
  });

  it.each([
    [{ signerName: "", agreementConfirmed: true }, "signer name"],
    [{ signerName: "Homer Owner", agreementConfirmed: false }, "agreement"],
    [{ signerName: "Homer Owner" }, "missing agreement"],
  ])("rejects invalid acceptance data: %s", async (body, _caseLabel) => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: HOMEOWNER_ID });

    const res = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
      .send(body);

    expect(res.status).toBe(400);
    expect(state.status).toBe("sent");
    expect(mockUpdateProposalIfStatusMatches).not.toHaveBeenCalled();
  });

  it("rejects client-supplied signing timestamp and IP fields", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: HOMEOWNER_ID });

    const res = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
      .send({
        signerName: "Homer Owner",
        agreementConfirmed: true,
        signedAt: "2000-01-01T00:00:00.000Z",
        ipAddress: "1.2.3.4",
      });

    expect(res.status).toBe(400);
    expect(state.status).toBe("sent");
  });

  it.each(["draft", "expired", "accepted", "rejected"])(
    "rejects acceptance when the proposal status is %s",
    async (status) => {
      const state: ProposalState = {
        id: PROPOSAL_ID,
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status,
        title: "Roof repair",
      };
      wireProposalMocks(state);
      const app = await buildApp({ id: HOMEOWNER_ID });

      const res = await request(app)
        .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
        .send({
          signerName: "Homer Owner",
          agreementConfirmed: true,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Only sent proposals");
      expect(state.status).toBe(status);
      expect(mockUpdateProposalIfStatusMatches).not.toHaveBeenCalled();
    },
  );

  it("rejects an unrelated homeowner", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: "unrelated-homeowner" });

    const res = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`)
      .send({
        signerName: "Wrong Homeowner",
        agreementConfirmed: true,
      });

    expect(res.status).toBe(403);
    expect(state.status).toBe("sent");
  });

  it("never lets two concurrent acceptance requests both apply or notify", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID, contractorId: CONTRACTOR_ID, homeownerId: HOMEOWNER_ID, status: "sent", title: "Roof repair",
    };
    const harness = wireProposalMocks(state, 2);
    const app = await buildApp({ id: HOMEOWNER_ID });

    const body = { signerName: "Homer Owner", agreementConfirmed: true };
    const [res1, res2] = await Promise.all([
      request(app).post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`).send(body),
      request(app).post(`/api/proposals/${PROPOSAL_ID}/accept-and-sign`).send(body),
    ]);

    const statuses = [res1.status, res2.status];
    expect(statuses.filter((s) => s === 200)).toHaveLength(1);
    expect(statuses.filter((s) => s === 409)).toHaveLength(1);
    expect(state.status).toBe("accepted");
    expect(harness.getContractCreations()).toBe(1);
    expect(harness.getContract()?.proposalId).toBe(PROPOSAL_ID);
    expect(mockCheckAchievements).toHaveBeenCalledTimes(1);
    expect(mockCreateNotificationSafely).toHaveBeenCalledTimes(1);
  });

  it("retires the legacy client-trusting sign endpoint", async () => {
    const app = await buildApp({ id: HOMEOWNER_ID });

    const res = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/sign`)
      .send({
        signature: "data:sig",
        signerName: "Homer Owner",
        signedAt: "2000-01-01T00:00:00.000Z",
        ipAddress: "1.2.3.4",
      });

    expect(res.status).toBe(410);
    expect(res.body.message).toContain("accept-and-sign");
  });
});

describe("POST /api/proposals/:id/reject", () => {
  it("rejects a sent proposal, stores the optional reason, and notifies the contractor", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: HOMEOWNER_ID });

    const res = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/reject`)
      .send({ rejectionReason: "The timing no longer works." });

    expect(res.status).toBe(200);
    expect(state.status).toBe("rejected");
    expect(state.rejectionReason).toBe("The timing no longer works.");
    expect(mockCreateNotificationSafely).toHaveBeenCalledTimes(1);
    expect(mockCreateNotificationSafely.mock.calls[0][1]).toMatchObject({
      homeownerId: CONTRACTOR_ID,
      type: "proposal",
      title: "Proposal Rejected",
      actionUrl: "/contractor-dashboard",
    });
  });

  it.each(["draft", "expired", "accepted", "rejected"])(
    "rejects rejection when the proposal status is %s",
    async (status) => {
      const state: ProposalState = {
        id: PROPOSAL_ID,
        contractorId: CONTRACTOR_ID,
        homeownerId: HOMEOWNER_ID,
        status,
        title: "Roof repair",
      };
      wireProposalMocks(state);
      const app = await buildApp({ id: HOMEOWNER_ID });

      const res = await request(app)
        .post(`/api/proposals/${PROPOSAL_ID}/reject`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.message).toContain("Only sent proposals");
      expect(state.status).toBe(status);
      expect(mockUpdateProposalIfStatusMatches).not.toHaveBeenCalled();
    },
  );

  it("rejects an unrelated homeowner", async () => {
    const state: ProposalState = {
      id: PROPOSAL_ID,
      contractorId: CONTRACTOR_ID,
      homeownerId: HOMEOWNER_ID,
      status: "sent",
      title: "Roof repair",
    };
    wireProposalMocks(state);
    const app = await buildApp({ id: "unrelated-homeowner" });

    const res = await request(app)
      .post(`/api/proposals/${PROPOSAL_ID}/reject`)
      .send({ rejectionReason: "Not my proposal" });

    expect(res.status).toBe(403);
    expect(state.status).toBe("sent");
  });
});
