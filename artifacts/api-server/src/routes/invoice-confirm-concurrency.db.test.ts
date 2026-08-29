/**
 * Real-Postgres concurrency proof for invoice confirmation scoring.
 *
 * Unlike the mocked HTTP regression suites, this file intentionally uses the
 * development database so PostgreSQL advisory-lock behavior is exercised by
 * two genuinely concurrent transactions.
 */

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "crypto";

const {
  OWNER_ID,
  mockGetUser,
  mockGetHouse,
  mockCheckAchievements,
  mockGetSubscriptionPlanByTier,
} = vi.hoisted(() => ({
  OWNER_ID: "invoice-concurrency-db-homeowner",
  mockGetUser: vi.fn(),
  mockGetHouse: vi.fn(),
  mockCheckAchievements: vi.fn(),
  mockGetSubscriptionPlanByTier: vi.fn(),
}));

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, res: any, next: any) => {
      if (req.headers?.["x-test-user"] !== "owner") {
        return res.status(401).json({ message: "Unauthorized" });
      }
      req.session = {
        isAuthenticated: true,
        user: {
          id: OWNER_ID,
          email: "invoice-concurrency@example.com",
          role: "homeowner",
          status: "active",
        },
      };
      next();
    }),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    evictStatusCache: vi.fn(),
  };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
      getHouse: mockGetHouse,
      checkAndAwardAchievements: mockCheckAchievements,
      getSubscriptionPlanByTier: mockGetSubscriptionPlanByTier,
    }),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));
vi.mock("ws", async (importOriginal) => {
  const actual = await importOriginal<typeof import("ws")>();
  return {
    ...actual,
    WebSocketServer: class MockWss {
      on() {}
      clients = new Set();
    },
  };
});
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
  emailService: {
    send: vi.fn().mockResolvedValue(undefined),
    sendTechInviteEmail: vi.fn().mockResolvedValue(undefined),
    sendAffiliatePayoutFailureEmail: vi.fn().mockResolvedValue(undefined),
    sendAffiliatePayoutFailureAdminAlert: vi.fn().mockResolvedValue(undefined),
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
import { eq, inArray } from "drizzle-orm";
import {
  invoiceAnalyses,
  maintenanceLogs,
  taskCompletions,
} from "@workspace/db";
import { db, pool } from "../db";
import {
  invoiceScoringLockKey,
  normalizeInvoiceServiceType,
  registerRoutes,
} from "./routes";

let app: express.Express;
const fixtureHouseIds = new Set<string>();
const fixtureInvoiceIds = new Set<string>();

async function cleanupFixtures() {
  if (fixtureInvoiceIds.size > 0) {
    await db.delete(invoiceAnalyses).where(
      inArray(invoiceAnalyses.id, [...fixtureInvoiceIds]),
    );
  }
  for (const houseId of fixtureHouseIds) {
    await db.delete(maintenanceLogs).where(eq(maintenanceLogs.houseId, houseId));
    await db.delete(taskCompletions).where(eq(taskCompletions.houseId, houseId));
  }
  fixtureInvoiceIds.clear();
  fixtureHouseIds.clear();
}

beforeAll(async () => {
  // registerRoutes starts plan synchronization in a detached async task.
  // Keep that unrelated startup work dormant so this test only mutates its
  // uniquely named invoice/log/completion fixtures.
  mockGetSubscriptionPlanByTier.mockReturnValue(new Promise(() => {}));
  mockGetUser.mockResolvedValue({
    id: OWNER_ID,
    email: "invoice-concurrency@example.com",
    role: "homeowner",
    status: "active",
    subscriptionStatus: "active",
    isDemoAccount: true,
  });
  mockGetHouse.mockImplementation(async (houseId: string) => ({
    id: houseId,
    homeownerId: OWNER_ID,
    roofInstallYear: null,
    hvacInstallYear: null,
    waterHeaterInstallYear: null,
    homeSystems: [],
  }));
  mockCheckAchievements.mockResolvedValue([]);
  app = express();
  app.use(express.json());
  await registerRoutes(app);
});

afterAll(cleanupFixtures);

describe("PATCH /api/invoice-analyses/:id/confirm — real concurrent scoring", () => {
  it("creates two audit logs but only one HWS completion for the same normalized service bucket", async () => {
    const suffix = randomUUID();
    const houseId = `invoice-race-house-${suffix}`;
    const firstInvoiceId = `invoice-race-a-${suffix}`;
    const secondInvoiceId = `invoice-race-b-${suffix}`;
    fixtureHouseIds.add(houseId);
    fixtureInvoiceIds.add(firstInvoiceId);
    fixtureInvoiceIds.add(secondInvoiceId);

    const now = new Date();
    const serviceDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-10`;
    await db.insert(invoiceAnalyses).values([
      {
        id: firstInvoiceId,
        homeownerId: OWNER_ID,
        houseId,
        status: "pending",
        completionMethod: "contractor",
        serviceDescription: "Concurrent HVAC maintenance A",
        serviceDate,
        serviceType: "\tHVAC \n Maintenance\t",
      },
      {
        id: secondInvoiceId,
        homeownerId: OWNER_ID,
        houseId,
        status: "pending",
        completionMethod: "contractor",
        serviceDescription: "Concurrent HVAC maintenance B",
        serviceDate,
        serviceType: "hvac maintenance",
      },
    ]);

    const blocker = await pool.connect();
    let blockerTransactionOpen = false;
    try {
      const scoringLockKey = invoiceScoringLockKey(
        houseId,
        normalizeInvoiceServiceType("hvac maintenance"),
        now.getFullYear(),
      );
      await blocker.query("BEGIN");
      blockerTransactionOpen = true;
      await blocker.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [scoringLockKey],
      );

      let completedRequests = 0;
      const firstRequest = Promise.resolve(
        request(app)
          .patch(`/api/invoice-analyses/${firstInvoiceId}/confirm`)
          .set("x-test-user", "owner")
          .send({}),
      ).then((response) => {
        completedRequests += 1;
        return response;
      });
      const secondRequest = Promise.resolve(
        request(app)
          .patch(`/api/invoice-analyses/${secondInvoiceId}/confirm`)
          .set("x-test-user", "owner")
          .send({}),
      ).then((response) => {
        completedRequests += 1;
        return response;
      });

      // Both requests can read their independent invoice rows, but neither may
      // pass the shared scoring lock while this separate transaction holds it.
      await new Promise((resolve) => setTimeout(resolve, 250));
      expect(completedRequests).toBe(0);

      await blocker.query("COMMIT");
      blockerTransactionOpen = false;
      const [first, second] = await Promise.all([firstRequest, secondRequest]);

      expect([first.status, second.status]).toEqual([200, 200]);
      expect(
        [first.body.duplicateScoring, second.body.duplicateScoring].sort(),
      ).toEqual([false, true]);

      const completions = await db
        .select()
        .from(taskCompletions)
        .where(eq(taskCompletions.houseId, houseId));
      expect(completions).toHaveLength(1);
      expect(completions[0]).toMatchObject({
        year: now.getFullYear(),
        month: now.getMonth() + 1,
      });

      const logs = await db
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.houseId, houseId));
      expect(logs).toHaveLength(2);
      expect(logs.map((log) => log.serviceType)).toEqual([
        "hvac maintenance",
        "hvac maintenance",
      ]);
      expect(logs.filter((log) => log.taskCompletionId !== null)).toHaveLength(1);

      const scoredResponse = first.body.duplicateScoring ? second : first;
      expect(scoredResponse.body.maintenanceLog.taskCompletionId).toBe(
        completions[0].id,
      );

      const healthScore = await request(app)
        .get(`/api/houses/${houseId}/health-score`)
        .set("x-test-user", "owner");
      expect(healthScore.status).toBe(200);
      expect(healthScore.body.scoringCount).toBe(1);
      expect(healthScore.body.historicalCount).toBe(0);
    } finally {
      if (blockerTransactionOpen) {
        await blocker.query("ROLLBACK");
      }
      blocker.release();
      await cleanupFixtures();
    }
  }, 30_000);
});