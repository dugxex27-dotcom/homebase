/**
 * HTTP-level integration tests: POST /api/invoice-analyses/:id/diy-verify
 *
 * Regression coverage for orphaned-file prevention:
 *   1. AI rejection  → uploaded files deleted, DB row unchanged, 422 returned
 *   2. AI error      → uploaded files deleted before 500 returned, DB row unchanged
 *   3. AI approval   → files persisted, DB row updated with new URLs, 200 returned
 *   4. Client disconnect after upload but before AI responds → uploaded files deleted
 */

import * as http from "node:http";
import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared spies visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  OWNER_ID,
  HOUSE_ID,
  ANALYSIS_ID,
  mockGetUser,
  mockDbSelect,
  mockDbUpdate,
  mockDbExecute,
  mockDbInsert,
  mockDeleteFile,
  mockUploadFile,
} = vi.hoisted(() => ({
  OWNER_ID: "demo-homeowner-owner-001",
  HOUSE_ID: "house-001",
  ANALYSIS_ID: "analysis-001",
  mockGetUser: vi.fn(),
  mockDbSelect: vi.fn(),
  mockDbUpdate: vi.fn(),
  mockDbExecute: vi.fn().mockResolvedValue({ rows: [] }),
  mockDbInsert: vi.fn(),
  mockDeleteFile: vi.fn().mockResolvedValue(undefined),
  mockUploadFile: vi.fn().mockResolvedValue(undefined),
}));

const OWNER_SESSION = {
  isAuthenticated: true,
  user: {
    id: OWNER_ID,
    email: "owner@homebase.com",
    role: "homeowner",
    status: "active",
  },
};

// ---------------------------------------------------------------------------
// Module mocks — must be hoisted before imports
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      if (req.headers?.["x-test-user"] === "owner") {
        req.session = OWNER_SESSION;
        return next();
      }
      return _res.status(401).json({ message: "Unauthorized" });
    }),
    requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
    evictStatusCache: vi.fn(),
  };
});

vi.mock("../googleAuth", () => ({ setupGoogleAuth: vi.fn() }));

vi.mock("ws", () => ({
  WebSocketServer: class MockWss {
    on() {}
    clients = new Set();
  },
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
    uploadFile = mockUploadFile;
    download = vi.fn();
    delete = vi.fn();
    deleteFile = mockDeleteFile;
    getSignedUrl = vi.fn();
    getUploadUrl = vi.fn();
    deleteObject = vi.fn();
    getObject = vi.fn();
    putObject = vi.fn();
    listObjects = vi.fn();
    searchPublicObject = vi.fn();
    downloadObject = vi.fn();
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

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getUser: mockGetUser,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn(), end: vi.fn() },
  db: {
    insert: mockDbInsert,
    select: mockDbSelect,
    update: mockDbUpdate,
    execute: mockDbExecute,
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    transaction: vi.fn().mockImplementation(async (cb: (tx: any) => Promise<any>) =>
      cb({
        execute: mockDbExecute,
        update: mockDbUpdate,
        select: mockDbSelect,
        insert: mockDbInsert,
        delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
      })
    ),
  },
}));

// ---------------------------------------------------------------------------
// Imports — after vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import * as invoiceAnalysisService from "../invoice-analysis-service";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const USER_FIXTURE = {
  id: OWNER_ID,
  email: "owner@homebase.com",
  role: "homeowner",
  status: "active",
  subscriptionStatus: "active",
};

const PENDING_DIY_ANALYSIS = {
  id: ANALYSIS_ID,
  homeownerId: OWNER_ID,
  houseId: HOUSE_ID,
  status: "pending",
  completionMethod: "diy",
  serviceDescription: "Replaced kitchen faucet myself",
  serviceDate: "2024-03-15",
  totalAmount: "80.00",
  contractorName: null,
  contractorCompany: null,
  homeArea: "plumbing",
  serviceType: "repair",
  invoiceUrls: [],
  receiptUrls: [],
  beforePhotoUrls: [],
  afterPhotoUrls: [],
  diyVerified: false,
  aiNotes: null,
};

const PHOTO_FILE = {
  fileData: "data:image/png;base64,iVBORw0KGgo=",
  fileName: "photo.png",
  fileType: "image/png",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildInsertMock() {
  const mockInsertValues = vi.fn().mockReturnValue({
    onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
    returning: vi.fn().mockResolvedValue([{ id: "plan-id" }]),
  });
  mockDbInsert.mockReturnValue({ values: mockInsertValues });
}

async function buildApp() {
  const app = express();
  app.use(express.json({ limit: "100mb" }));
  await registerRoutes(app);
  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/invoice-analyses/:id/diy-verify — AI rejection cleanup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 422 when AI rejects photos and deletes every uploaded file", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    // Initial select: fetch the analysis row
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...PENDING_DIY_ANALYSIS }]),
      }),
    });

    // AI says no
    vi.mocked(invoiceAnalysisService.verifyDIYPhotos).mockResolvedValueOnce({
      verified: false,
      notes: "Photos are too blurry to confirm the work was completed.",
    });

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [PHOTO_FILE],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [PHOTO_FILE],
      });

    // Must respond with 422 (not 200 or 500)
    expect(res.status).toBe(422);
    expect(res.body.diyVerified).toBe(false);
    expect(res.body.verificationNotes).toContain("blurry");

    // Each of the 3 uploaded files must have been deleted
    expect(mockDeleteFile).toHaveBeenCalledTimes(3);

    // DB must NOT have been updated — the rejected photo URLs must not be persisted
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("deletes all uploaded files even when some are before and some are after photos", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...PENDING_DIY_ANALYSIS }]),
      }),
    });

    vi.mocked(invoiceAnalysisService.verifyDIYPhotos).mockResolvedValueOnce({
      verified: false,
      notes: "Cannot verify completion from provided images.",
    });

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [PHOTO_FILE, PHOTO_FILE],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [],
      });

    expect(res.status).toBe(422);

    // 2 before + 1 after = 3 files uploaded; all 3 must be cleaned up
    expect(mockDeleteFile).toHaveBeenCalledTimes(3);
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/invoice-analyses/:id/diy-verify — AI error cleanup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 500 when AI throws and deletes every uploaded file before responding", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...PENDING_DIY_ANALYSIS }]),
      }),
    });

    // AI call throws unexpectedly
    vi.mocked(invoiceAnalysisService.verifyDIYPhotos).mockRejectedValueOnce(
      new Error("OpenAI service unavailable"),
    );

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [PHOTO_FILE],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [],
      });

    // Must return 500, not 200
    expect(res.status).toBe(500);

    // Both uploaded files must be cleaned up before the error response is sent
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);

    // DB must NOT have been updated
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/invoice-analyses/:id/diy-verify — pre-upload size and type validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  function setupAnalysisSelect() {
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...PENDING_DIY_ANALYSIS }]),
      }),
    });
  }

  it("returns 413 when a single photo exceeds the 20 MB per-file limit", async () => {
    buildInsertMock();
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    setupAnalysisSelect();

    // base64Str.length * 0.75 must exceed 20 * 1024 * 1024 = 20,971,520 bytes
    // Minimum base64 length needed: ceil(20_971_520 / 0.75) + 1 = 27_962_028
    const oversizedBase64 = "A".repeat(27_962_028);

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [{ fileData: oversizedBase64, fileName: "big-before.png", fileType: "image/png" }],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [],
      });

    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/20 MB/);

    // No files must have been uploaded
    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("returns 413 when the combined total of all files exceeds 50 MB", async () => {
    buildInsertMock();
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    setupAnalysisSelect();

    // Each file ≈ 14 MB decoded (base64 length ≈ 18_724_923); three files ≈ 42 MB — under per-file
    // limit but three of them total ≈ 42 MB, and adding a fourth pushes past 50 MB.
    // Simpler: use two files at ~18 MB each decoded → total ~36 MB — still under. Use three at ~18 MB → ~54 MB > 50 MB.
    // 18 MB decoded ← base64 length = ceil(18 * 1024 * 1024 / 0.75) = 25_165_825
    const largeBase64 = "A".repeat(25_165_825); // ~18 MB decoded per file, under per-file limit
    const largeFile = { fileData: largeBase64, fileName: "large.png", fileType: "image/png" };

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [largeFile],
        afterPhotoFiles: [largeFile],
        receiptFiles: [largeFile],  // 3 × 18 MB ≈ 54 MB > 50 MB total limit
      });

    expect(res.status).toBe(413);
    expect(res.body.message).toMatch(/50 MB/);

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("returns 400 when a before/after photo has an unsupported MIME type", async () => {
    buildInsertMock();
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    setupAnalysisSelect();

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [{ fileData: "data:video/mp4;base64,AAAA", fileName: "clip.mp4", fileType: "video/mp4" }],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unsupported type/i);

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("returns 400 when a receipt file has an unsupported MIME type", async () => {
    buildInsertMock();
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    setupAnalysisSelect();

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [PHOTO_FILE],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [{ fileData: "data:text/plain;base64,AAAA", fileName: "notes.txt", fileType: "text/plain" }],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/unsupported type/i);

    expect(mockUploadFile).not.toHaveBeenCalled();
  });

  it("accepts PDF receipts alongside image photos without error", async () => {
    buildInsertMock();
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    setupAnalysisSelect();

    // AI approves
    vi.mocked(invoiceAnalysisService.verifyDIYPhotos).mockResolvedValueOnce({
      verified: true,
      notes: "Work verified.",
    });

    // tx SELECT … FOR UPDATE
    mockDbExecute.mockResolvedValueOnce({
      rows: [{
        id: ANALYSIS_ID,
        diy_verified: false,
        before_photo_urls: [],
        after_photo_urls: [],
        receipt_urls: [],
      }],
    });

    const updatedAnalysis = {
      ...PENDING_DIY_ANALYSIS,
      diyVerified: true,
      aiNotes: "Work verified.",
      beforePhotoUrls: ["/public/invoices/new-before.png"],
      afterPhotoUrls: ["/public/invoices/new-after.png"],
      receiptUrls: ["/public/invoices/new-receipt.pdf"],
    };
    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedAnalysis]),
      }),
    });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [PHOTO_FILE],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [{ fileData: "data:application/pdf;base64,AAAA", fileName: "receipt.pdf", fileType: "application/pdf" }],
      });

    // PDF receipts are allowed — request should succeed
    expect(res.status).toBe(200);
    expect(mockUploadFile).toHaveBeenCalled();
  });
});

describe("POST /api/invoice-analyses/:id/diy-verify — AI approval (happy path)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns 200, persists files to DB, and does NOT delete any uploaded file", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    // Initial outer select: fetch the analysis
    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...PENDING_DIY_ANALYSIS }]),
      }),
    });

    // AI approves the photos
    vi.mocked(invoiceAnalysisService.verifyDIYPhotos).mockResolvedValueOnce({
      verified: true,
      notes: "Before and after photos clearly show the completed repair.",
    });

    // tx.execute: SELECT … FOR UPDATE returns the locked row (snake_case)
    mockDbExecute.mockResolvedValueOnce({
      rows: [{
        id: ANALYSIS_ID,
        diy_verified: false,
        before_photo_urls: [],
        after_photo_urls: [],
        receipt_urls: [],
      }],
    });

    const updatedAnalysis = {
      ...PENDING_DIY_ANALYSIS,
      diyVerified: true,
      aiNotes: "Before and after photos clearly show the completed repair.",
      beforePhotoUrls: ["/public/invoices/new-before.png"],
      afterPhotoUrls: ["/public/invoices/new-after.png"],
      receiptUrls: [],
    };

    const mockUpdateSet = vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([updatedAnalysis]),
      }),
    });
    mockDbUpdate.mockReturnValue({ set: mockUpdateSet });

    const res = await request(app)
      .post(`/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`)
      .set("x-test-user", "owner")
      .send({
        beforePhotoFiles: [PHOTO_FILE],
        afterPhotoFiles: [PHOTO_FILE],
        receiptFiles: [],
      });

    expect(res.status).toBe(200);
    expect(res.body.diyVerified).toBe(true);

    // No files should have been deleted on success
    expect(mockDeleteFile).not.toHaveBeenCalled();

    // DB must have been updated with the new photo URLs
    expect(mockUpdateSet).toHaveBeenCalledTimes(1);
    const setPayload = mockUpdateSet.mock.calls[0][0] as Record<string, unknown>;
    expect(setPayload).toHaveProperty("diyVerified", true);
    expect(setPayload).toHaveProperty("beforePhotoUrls");
    expect(setPayload).toHaveProperty("afterPhotoUrls");
    expect(setPayload).toHaveProperty("receiptUrls");

    // The update payload must include the newly uploaded before/after URLs
    expect((setPayload.beforePhotoUrls as string[]).length).toBeGreaterThan(0);
    expect((setPayload.afterPhotoUrls as string[]).length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Disconnect-after-upload cleanup
// ---------------------------------------------------------------------------
// This suite exercises the req.on("close") path: files are uploaded, then the
// client socket is destroyed before verifyDIYPhotos resolves.  The close
// handler must detect res.headersSent === false and delete the orphaned files.
// ---------------------------------------------------------------------------

describe("POST /api/invoice-analyses/:id/diy-verify — disconnect-after-upload cleanup", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deletes uploaded files when client disconnects after upload but before AI responds", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...PENDING_DIY_ANALYSIS }]),
      }),
    });

    // AI hangs indefinitely — this is the window in which the disconnect occurs.
    // releaseAI is called in cleanup so the route handler can eventually settle.
    let releaseAI!: (value: { verified: boolean; notes: string }) => void;
    vi.mocked(invoiceAnalysisService.verifyDIYPhotos).mockReturnValueOnce(
      new Promise<{ verified: boolean; notes: string }>((resolve) => {
        releaseAI = resolve;
      }),
    );

    // Start a real HTTP server so we can get hold of the underlying socket
    const server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const { port } = server.address() as { port: number };

    const body = JSON.stringify({
      beforePhotoFiles: [PHOTO_FILE],
      afterPhotoFiles: [PHOTO_FILE],
    });

    // Make the request and capture the socket via the "socket" event so we
    // always have a valid reference to destroy — clientReq.socket is not set
    // synchronously and optional-chaining would silently no-op if we race it.
    const clientSocket = await new Promise<import("node:net").Socket>((resolve) => {
      const clientReq = http.request({
        hostname: "127.0.0.1",
        port,
        method: "POST",
        path: `/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "x-test-user": "owner",
        },
      });
      // Suppress the ECONNRESET that fires when we later destroy the socket
      clientReq.on("error", () => {});
      clientReq.once("socket", (socket) => resolve(socket));
      clientReq.write(body);
      clientReq.end();
    });

    // Wait for the server to receive the body, pass validation, and complete
    // all uploadFileSet calls (mockUploadFile resolves synchronously, so
    // uploads finish within a few microtasks). The server is now suspended
    // inside `await verifyDIYPhotos(...)` with the socket close-handler live.
    await new Promise((r) => setTimeout(r, 150));

    // Simulate a network drop mid-request
    clientSocket.destroy();

    // Allow the socket close event and async cleanup to propagate
    await new Promise((r) => setTimeout(r, 150));

    // Both uploaded files (1 before + 1 after) must have been cleaned up
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);

    // Settle the pending AI promise and close the server
    releaseAI({ verified: false, notes: "" });
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it("does not persist file URLs to DB when client disconnects and AI later approves", async () => {
    buildInsertMock();
    const app = await buildApp();

    mockGetUser.mockResolvedValue(USER_FIXTURE);

    mockDbSelect.mockReturnValueOnce({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ ...PENDING_DIY_ANALYSIS }]),
      }),
    });

    // AI hangs — will be released with verified:true AFTER the disconnect
    let releaseAI!: (value: { verified: boolean; notes: string }) => void;
    vi.mocked(invoiceAnalysisService.verifyDIYPhotos).mockReturnValueOnce(
      new Promise<{ verified: boolean; notes: string }>((resolve) => {
        releaseAI = resolve;
      }),
    );

    const server = await new Promise<http.Server>((resolve) => {
      const s = app.listen(0, () => resolve(s));
    });
    const { port } = server.address() as { port: number };

    const body = JSON.stringify({
      beforePhotoFiles: [PHOTO_FILE],
      afterPhotoFiles: [PHOTO_FILE],
    });

    const clientSocket = await new Promise<import("node:net").Socket>((resolve) => {
      const clientReq = http.request({
        hostname: "127.0.0.1",
        port,
        method: "POST",
        path: `/api/invoice-analyses/${ANALYSIS_ID}/diy-verify`,
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(body),
          "x-test-user": "owner",
        },
      });
      clientReq.on("error", () => {});
      clientReq.once("socket", (socket) => resolve(socket));
      clientReq.write(body);
      clientReq.end();
    });

    // Wait for server to be suspended in verifyDIYPhotos with close-handler live
    await new Promise((r) => setTimeout(r, 150));

    // Client disconnects — close handler should set clientDisconnected + delete files
    clientSocket.destroy();
    await new Promise((r) => setTimeout(r, 150));

    // Files should already be cleaned up
    expect(mockDeleteFile).toHaveBeenCalledTimes(2);

    // Now AI resolves approved — the route should bail out before the DB write
    releaseAI({ verified: true, notes: "Looks good" });

    // Give the route enough time to reach (and skip) the transaction block
    await new Promise((r) => setTimeout(r, 150));

    // DB must NOT have been updated — writing deleted URLs would create broken references
    expect(mockDbUpdate).not.toHaveBeenCalled();

    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
