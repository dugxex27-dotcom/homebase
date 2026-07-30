/**
 * HTTP-level tests: POST /api/maintenance-logs/complete-task
 *
 * Verifies the server-side EXIF GPS extraction and location-flag logic:
 *
 *   (a) Photo with EXIF GPS near the property   → locationFlag = false
 *   (b) Photo with EXIF GPS far from property   → locationFlag = true
 *       (even when the client sends "near" GPS — fake GPS cannot override EXIF)
 *   (c) Photo with no EXIF GPS, client supplies fallback near property
 *       → falls back to client GPS, locationFlag = false
 *   (d) No photos provided, client supplies GPS near property
 *       → uses client GPS, locationFlag = false
 */

import { vi, describe, it, expect, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks — created before vi.mock() factories execute
// ---------------------------------------------------------------------------

const {
  mockGetUser,
  mockGetHouse,
  mockCreateMaintenanceLog,
  mockCheckAndAwardAchievements,
  mockSearchPublicObject,
  mockExifrGps,
  mockExifrParse,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetHouse: vi.fn(),
  mockCreateMaintenanceLog: vi.fn(),
  mockCheckAndAwardAchievements: vi.fn().mockResolvedValue([]),
  // ObjectStorageService.searchPublicObject — controlled per test
  mockSearchPublicObject: vi.fn(),
  // exifr module functions
  mockExifrGps: vi.fn(),
  mockExifrParse: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", () => ({
  setupAuth: vi.fn().mockResolvedValue(undefined),
  isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
    req.session = {
      isAuthenticated: true,
      user: {
        id: "homeowner-test-001",
        email: "test@homebase.com",
        role: "homeowner",
        status: "active",
      },
    };
    next();
  }),
  requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requirePropertyOwner: vi.fn((_req: any, _res: any, next: any) => next()),
  requireCompanyRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireCompanyRoleAny: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireDivisionAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireBulkImport: vi.fn((_req: any, _res: any, next: any) => next()),
  requireApiAccess: vi.fn((_req: any, _res: any, next: any) => next()),
  requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  requireSameCompany: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  suspendedUserIds: new Set<string>(),
  invalidateUserSessions: vi.fn(),
  refreshUserSessionRole: vi.fn(),
  requireActiveAccountFresh: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  invalidateActiveStatusCache: vi.fn(),
  evictStatusCache: vi.fn(),
  validateHouseOwnership: vi.fn().mockResolvedValue(true),
  validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
  validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
  validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
  requireResourceOwnership: vi.fn(() => (_req: any, _res: any, next: any) => next()),
  isOAuthUserSuspended: vi.fn().mockResolvedValue(false),
}));

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
  sendCheckoutFailureEmail: vi.fn().mockResolvedValue(undefined),
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
    deleteFile = vi.fn().mockResolvedValue(undefined);
    getSignedUrl = vi.fn();
    getUploadUrl = vi.fn();
    deleteObject = vi.fn();
    getObject = vi.fn();
    putObject = vi.fn();
    listObjects = vi.fn();
    searchPublicObject = mockSearchPublicObject;
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
    this.webhooks = { constructEvent: vi.fn() };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({
        id: "acct_test",
        charges_enabled: true,
        payouts_enabled: true,
        country: "US",
      }),
    };
    this.subscriptions = {
      retrieve: vi.fn().mockResolvedValue({ status: "active", items: { data: [] } }),
    };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue({}) };
  }
  return { default: MockStripe };
});

vi.mock("../security-audit", () => ({
  AuditEventTypes: { ADMIN_USER_MODIFY: "admin_user_modify" },
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
      getHouse: mockGetHouse,
      createMaintenanceLog: mockCreateMaintenanceLog,
      checkAndAwardAchievements: mockCheckAndAwardAchievements,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
    execute: vi.fn().mockResolvedValue({ rows: [] }),
  },
}));

// Mock exifr as a dynamic import
vi.mock("exifr", () => ({
  gps: mockExifrGps,
  parse: mockExifrParse,
}));

// ---------------------------------------------------------------------------
// Imports — after vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const HOMEOWNER_ID = "homeowner-test-001";
const HOUSE_ID = "house-test-001";

/** San Francisco coordinates — used as the "property" location */
const PROPERTY_LAT = 37.7749;
const PROPERTY_LNG = -122.4194;

/** GPS coordinates very close to the property (< 0.01 miles away) */
const NEAR_LAT = 37.7750;
const NEAR_LNG = -122.4195;

/** New York coordinates — clearly > 1 mile from the San Francisco property */
const FAR_LAT = 40.7128;
const FAR_LNG = -74.006;

const HOUSE_FIXTURE = {
  id: HOUSE_ID,
  homeownerId: HOMEOWNER_ID,
  address: "123 Main St",
  latitude: String(PROPERTY_LAT),
  longitude: String(PROPERTY_LNG),
};

const USER_FIXTURE = {
  id: HOMEOWNER_ID,
  email: "test@homebase.com",
  role: "homeowner",
  status: "active",
  subscriptionStatus: "active",
};

/** A photo URL whose storage path survives the /public/ prefix stripping */
const PHOTO_URL = "/public/photos/test-photo.jpg";

/** Minimal valid DIY body without any photos */
const BASE_BODY = {
  houseId: HOUSE_ID,
  taskTitle: "Test Task",
  completionMethod: "diy",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function buildApp() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  await registerRoutes(app);
  return app;
}

/** Simulate a photo stored in object storage that returns `imageBuffer` on download */
function mockPhotoInStorage(imageBuffer: Buffer) {
  mockSearchPublicObject.mockResolvedValueOnce({
    download: vi.fn().mockResolvedValue([imageBuffer]),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/maintenance-logs/complete-task — EXIF GPS location flag", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("(a) EXIF GPS near property → locationFlag = false", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-001", locationFlag: false });

    // Simulate a stored image whose EXIF contains GPS near the property
    mockPhotoInStorage(Buffer.from("fake-image-bytes"));
    mockExifrGps.mockResolvedValue({ latitude: NEAR_LAT, longitude: NEAR_LNG });
    mockExifrParse.mockResolvedValue({ DateTimeOriginal: new Date() });

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        afterPhotoUrls: [PHOTO_URL],
      });

    expect(res.status).toBe(201);

    // createMaintenanceLog must have been called with locationFlag = false
    expect(mockCreateMaintenanceLog).toHaveBeenCalledOnce();
    const logData = mockCreateMaintenanceLog.mock.calls[0][0];
    expect(logData.locationFlag).toBe(false);

    // EXIF GPS must be stored as the authoritative coordinates
    expect(parseFloat(logData.gpsLat)).toBeCloseTo(NEAR_LAT, 4);
    expect(parseFloat(logData.gpsLng)).toBeCloseTo(NEAR_LNG, 4);
  });

  it("(b) EXIF GPS far from property → locationFlag = true even when client GPS is near", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-002", locationFlag: true });

    // The photo's EXIF GPS is far (New York)
    mockPhotoInStorage(Buffer.from("fake-image-bytes"));
    mockExifrGps.mockResolvedValue({ latitude: FAR_LAT, longitude: FAR_LNG });
    mockExifrParse.mockResolvedValue({});

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        // Client tries to sneak in a "near" GPS value — server must ignore it
        gpsLat: NEAR_LAT,
        gpsLng: NEAR_LNG,
        afterPhotoUrls: [PHOTO_URL],
      });

    expect(res.status).toBe(201);

    const logData = mockCreateMaintenanceLog.mock.calls[0][0];

    // EXIF (far) must override the client-supplied (near) value
    expect(parseFloat(logData.gpsLat)).toBeCloseTo(FAR_LAT, 4);
    expect(parseFloat(logData.gpsLng)).toBeCloseTo(FAR_LNG, 4);

    // Distance > 1 mile → must be flagged
    expect(logData.locationFlag).toBe(true);
  });

  it("(c) No EXIF GPS in photo + client GPS near property → falls back to client, locationFlag = false", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-003", locationFlag: false });

    // Photo has no GPS in EXIF
    mockPhotoInStorage(Buffer.from("screenshot-bytes"));
    mockExifrGps.mockResolvedValue(null); // no GPS in EXIF
    mockExifrParse.mockResolvedValue({});

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        gpsLat: NEAR_LAT,
        gpsLng: NEAR_LNG,
        afterPhotoUrls: [PHOTO_URL],
      });

    expect(res.status).toBe(201);

    const logData = mockCreateMaintenanceLog.mock.calls[0][0];

    // Should fall back to client GPS
    expect(parseFloat(logData.gpsLat)).toBeCloseTo(NEAR_LAT, 4);
    expect(parseFloat(logData.gpsLng)).toBeCloseTo(NEAR_LNG, 4);

    // Client GPS is near → not flagged
    expect(logData.locationFlag).toBe(false);
  });

  it("(d) No photos provided + client GPS near property → uses client GPS, locationFlag = false", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-004", locationFlag: false });

    // No photos — objectStorage.searchPublicObject must NOT be called
    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        gpsLat: NEAR_LAT,
        gpsLng: NEAR_LNG,
        // No beforePhotoUrls or afterPhotoUrls
      });

    expect(res.status).toBe(201);

    // Storage must not have been contacted for images
    expect(mockSearchPublicObject).not.toHaveBeenCalled();
    // exifr must not have been called
    expect(mockExifrGps).not.toHaveBeenCalled();

    const logData = mockCreateMaintenanceLog.mock.calls[0][0];

    // Falls back to client GPS
    expect(parseFloat(logData.gpsLat)).toBeCloseTo(NEAR_LAT, 4);
    expect(parseFloat(logData.gpsLng)).toBeCloseTo(NEAR_LNG, 4);

    expect(logData.locationFlag).toBe(false);
  });

  it("(b-extra) EXIF GPS far from property is flagged even when house has no stored coordinates", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    // House has no geocoordinates stored
    mockGetHouse.mockResolvedValue({
      id: HOUSE_ID,
      homeownerId: HOMEOWNER_ID,
      address: "456 Unknown Ln",
      latitude: null,
      longitude: null,
    });
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-005", locationFlag: true });

    mockPhotoInStorage(Buffer.from("fake-image-bytes"));
    mockExifrGps.mockResolvedValue({ latitude: NEAR_LAT, longitude: NEAR_LNG });
    mockExifrParse.mockResolvedValue({});

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        afterPhotoUrls: [PHOTO_URL],
      });

    expect(res.status).toBe(201);

    const logData = mockCreateMaintenanceLog.mock.calls[0][0];
    // GPS present but no property coordinates to compare against → unverifiable → flagged
    expect(logData.locationFlag).toBe(true);
  });
});
