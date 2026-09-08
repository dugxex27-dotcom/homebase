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
  mockGetMaintenanceLog,
  mockUpdateMaintenanceLog,
  mockCacheHouseCoordinatesIfAddressMatches,
  mockCreateMaintenanceLog,
  mockCreateTaskCompletion,
  mockArchiveMaintenanceNotificationForTask,
  mockCheckAndAwardAchievements,
  mockSearchPublicObject,
  mockExifrGps,
  mockExifrParse,
  mockResolvePropertyCoordinates,
  mockDbInsertValues,
} = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockGetHouse: vi.fn(),
  mockGetMaintenanceLog: vi.fn(),
  mockUpdateMaintenanceLog: vi.fn(),
  mockCacheHouseCoordinatesIfAddressMatches: vi.fn(),
  mockCreateMaintenanceLog: vi.fn(),
  mockCreateTaskCompletion: vi.fn(),
  mockArchiveMaintenanceNotificationForTask: vi.fn().mockResolvedValue(1),
  mockCheckAndAwardAchievements: vi.fn().mockResolvedValue([]),
  // ObjectStorageService.searchPublicObject — controlled per test
  mockSearchPublicObject: vi.fn(),
  // exifr module functions
  mockExifrGps: vi.fn(),
  mockExifrParse: vi.fn(),
  mockDbInsertValues: vi.fn().mockResolvedValue(undefined),
  mockResolvePropertyCoordinates: vi.fn(async (house: {
    latitude?: string | number | null;
    longitude?: string | number | null;
  }, _persist?: (
    coordinates: { latitude: number; longitude: number },
  ) => Promise<{ latitude: number; longitude: number } | null>) => {
    const latitude = house.latitude == null ? Number.NaN : Number(house.latitude);
    const longitude = house.longitude == null ? Number.NaN : Number(house.longitude);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
      ? { latitude, longitude }
      : null;
  }),
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

vi.mock("../geocoding-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../geocoding-service")>();
  return {
    ...actual,
    geocodeAddress: vi.fn().mockResolvedValue(null),
    resolvePropertyCoordinates: mockResolvePropertyCoordinates,
  };
});

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
      getMaintenanceLog: mockGetMaintenanceLog,
      updateMaintenanceLog: mockUpdateMaintenanceLog,
      cacheHouseCoordinatesIfAddressMatches: mockCacheHouseCoordinatesIfAddressMatches,
      createMaintenanceLog: mockCreateMaintenanceLog,
      createTaskCompletion: mockCreateTaskCompletion,
      archiveMaintenanceNotificationForTask: mockArchiveMaintenanceNotificationForTask,
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
      values: mockDbInsertValues,
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

async function buildAppWithSession() {
  const app = express();
  app.use(express.json({ limit: "10mb" }));
  app.use((req: any, _res, next) => {
    req.session = {
      isAuthenticated: true,
      user: {
        id: HOMEOWNER_ID,
        email: USER_FIXTURE.email,
        role: "homeowner",
        status: "active",
      },
    };
    next();
  });
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

  it("persists the stable catalog task ID when the client provides it", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-stable-id", locationFlag: false });

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        taskId: "us-northeast-hvac-filter",
      });

    expect(res.status).toBe(201);
    expect(mockDbInsertValues).toHaveBeenCalledWith(
      expect.objectContaining({ taskId: "us-northeast-hvac-filter" }),
    );
    expect(mockArchiveMaintenanceNotificationForTask).toHaveBeenCalledWith(
      HOMEOWNER_ID,
      "us-northeast-hvac-filter",
    );
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
    expect(Number(logData.distanceFromPropertyMiles)).toBeLessThanOrEqual(0.1);
    expect(Number(logData.timestampDeltaHours)).toBeLessThanOrEqual(0.1);
    expect(logData.verificationTier).toBe("self_reported");
    expect(logData.verificationReasonCodes).toEqual(["ai_ambiguous"]);
    expect(logData.aiVerificationStatus).toBe("not_run");
    expect(logData.aiVerificationResponse.finalEvidenceDecision).toMatchObject({
      outcome: "ambiguous",
      verificationTier: "self_reported",
    });

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
    expect(Number(logData.distanceFromPropertyMiles)).toBeGreaterThan(1);
    expect(logData.verificationReasonCodes).toEqual(expect.arrayContaining([
      "distance_from_property_exceeded",
      "timestamp_missing",
    ]));
    expect(logData.verificationTier).toBe("self_reported");
    expect(logData.aiVerificationResponse.finalEvidenceDecision).toMatchObject({
      outcome: "rejected",
      verificationTier: "self_reported",
    });
  });

  it("preserves contractor_verified while persisting a rejected out-of-tolerance outcome", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-contractor-far" });
    mockPhotoInStorage(Buffer.from("contractor-photo"));
    mockExifrGps.mockResolvedValue({ latitude: FAR_LAT, longitude: FAR_LNG });
    mockExifrParse.mockResolvedValue({ DateTimeOriginal: new Date() });

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        completionMethod: "contractor",
        contractorBusinessName: "Trusted HVAC",
        contractorJobDate: "2026-08-29",
        invoiceRef: "invoice-proof-001",
        afterPhotoUrls: [PHOTO_URL],
      });

    expect(res.status).toBe(201);
    const logData = mockCreateMaintenanceLog.mock.calls[0][0];
    expect(logData.verificationTier).toBe("contractor_verified");
    expect(logData.verificationReasonCodes).toContain("distance_from_property_exceeded");
    expect(logData.aiVerificationResponse.finalEvidenceDecision).toMatchObject({
      outcome: "rejected",
      verificationTier: "contractor_verified",
    });
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

  it.each([
    {
      label: "just below",
      gpsLat: PROPERTY_LAT + (0.99 / 69),
      expectedFlag: false,
      expectedReason: false,
    },
    {
      label: "just above",
      gpsLat: PROPERTY_LAT + (1.01 / 69),
      expectedFlag: true,
      expectedReason: true,
    },
  ])(
    "uses the unrounded distance at the one-mile boundary: $label",
    async ({ gpsLat, expectedFlag, expectedReason }) => {
      const app = await buildApp();
      mockGetUser.mockResolvedValue(USER_FIXTURE);
      mockGetHouse.mockResolvedValue(HOUSE_FIXTURE);
      mockCreateMaintenanceLog.mockResolvedValue({
        id: `log-boundary-${expectedFlag ? "above" : "below"}`,
        locationFlag: expectedFlag,
      });

      const res = await request(app)
        .post("/api/maintenance-logs/complete-task")
        .send({
          ...BASE_BODY,
          gpsLat,
          gpsLng: PROPERTY_LNG,
        });

      expect(res.status).toBe(201);
      const logData = mockCreateMaintenanceLog.mock.calls[0][0];
      expect(logData.locationFlag).toBe(expectedFlag);
      expect(Number(logData.distanceFromPropertyMiles) > 1).toBe(expectedFlag);
      expect(logData.verificationReasonCodes.includes("distance_from_property_exceeded"))
        .toBe(expectedReason);
    },
  );

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
    expect(logData.distanceFromPropertyMiles).toBeNull();
    expect(logData.verificationReasonCodes).toEqual(expect.arrayContaining([
      "property_coordinates_missing",
      "timestamp_missing",
    ]));
  });

  it("persists newly resolved property coordinates for later completion requests", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetHouse.mockResolvedValue({
      id: HOUSE_ID,
      homeownerId: HOMEOWNER_ID,
      address: "789 Cache Me Road",
      latitude: null,
      longitude: null,
    });
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-006", locationFlag: false });
    mockCacheHouseCoordinatesIfAddressMatches.mockResolvedValue({
      ...HOUSE_FIXTURE,
      coordinatesCachedAt: new Date(),
    });
    mockResolvePropertyCoordinates.mockImplementationOnce(async (
      _house: { latitude?: string | number | null; longitude?: string | number | null },
      persist?: (
        coordinates: { latitude: number; longitude: number },
      ) => Promise<{ latitude: number; longitude: number } | null>,
    ) => {
      const coordinates = { latitude: PROPERTY_LAT, longitude: PROPERTY_LNG };
      return await persist?.(coordinates) ?? null;
    });

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        gpsLat: NEAR_LAT,
        gpsLng: NEAR_LNG,
      });

    expect(res.status).toBe(201);
    expect(mockCacheHouseCoordinatesIfAddressMatches).toHaveBeenCalledWith(
      HOUSE_ID,
      "789 Cache Me Road",
      String(PROPERTY_LAT),
      String(PROPERTY_LNG),
      expect.any(Date),
    );
    const logData = mockCreateMaintenanceLog.mock.calls[0][0];
    expect(logData.propertyLat).toBe(String(PROPERTY_LAT));
    expect(logData.propertyLng).toBe(String(PROPERTY_LNG));
    expect(logData.locationFlag).toBe(false);
  });

  it("uses coordinates cached by another instance instead of recording a false missing-coordinate reason", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    const initiallyUncachedHouse = {
      id: HOUSE_ID,
      homeownerId: HOMEOWNER_ID,
      address: "321 Concurrent Way",
      latitude: null,
      longitude: null,
    };
    mockGetHouse
      .mockResolvedValueOnce(initiallyUncachedHouse)
      .mockResolvedValueOnce({
        ...initiallyUncachedHouse,
        latitude: String(PROPERTY_LAT),
        longitude: String(PROPERTY_LNG),
        coordinatesCachedAt: new Date(),
      });
    mockCacheHouseCoordinatesIfAddressMatches.mockResolvedValue(undefined);
    mockCreateMaintenanceLog.mockResolvedValue({ id: "log-007", locationFlag: false });
    mockResolvePropertyCoordinates.mockImplementationOnce(async (_house, persist) => {
      const geocoded = { latitude: PROPERTY_LAT, longitude: PROPERTY_LNG };
      return await persist?.(geocoded) ?? null;
    });

    const res = await request(app)
      .post("/api/maintenance-logs/complete-task")
      .send({
        ...BASE_BODY,
        gpsLat: NEAR_LAT,
        gpsLng: NEAR_LNG,
      });

    expect(res.status).toBe(201);
    const logData = mockCreateMaintenanceLog.mock.calls[0][0];
    expect(logData.propertyLat).toBe(String(PROPERTY_LAT));
    expect(logData.propertyLng).toBe(String(PROPERTY_LNG));
    expect(logData.locationFlag).toBe(false);
    expect(logData.verificationReasonCodes).not.toContain("property_coordinates_missing");
  });
});

describe("public record writes cannot forge server-owned verification evidence", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects photo_verified and AI evidence on maintenance-log creation", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);

    const res = await request(app)
      .post("/api/maintenance-logs")
      .send({
        houseId: HOUSE_ID,
        serviceDate: "2026-08-29",
        serviceType: "HVAC inspection",
        verificationTier: "photo_verified",
        aiVerificationStatus: "verified",
        aiVerificationResponse: { verified: true },
        distanceFromPropertyMiles: "0.01",
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: "SERVER_OWNED_VERIFICATION_FIELDS",
      fields: expect.arrayContaining([
        "verificationTier",
        "aiVerificationStatus",
        "aiVerificationResponse",
        "distanceFromPropertyMiles",
      ]),
    });
    expect(mockCreateMaintenanceLog).not.toHaveBeenCalled();
  });

  it("rejects attempts to promote or edit an existing maintenance log's evidence", async () => {
    const app = await buildApp();
    mockGetUser.mockResolvedValue(USER_FIXTURE);
    mockGetMaintenanceLog.mockResolvedValue({
      id: "log-existing",
      homeownerId: HOMEOWNER_ID,
      houseId: HOUSE_ID,
      verificationTier: "self_reported",
    });

    const res = await request(app)
      .patch("/api/maintenance-logs/log-existing")
      .send({
        verificationTier: "photo_verified",
        verificationReasonCodes: [],
        locationFlag: false,
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: "SERVER_OWNED_VERIFICATION_FIELDS",
      fields: expect.arrayContaining([
        "verificationTier",
        "verificationReasonCodes",
        "locationFlag",
      ]),
    });
    expect(mockUpdateMaintenanceLog).not.toHaveBeenCalled();
  });

  it("rejects forged verification evidence on direct task-completion creation", async () => {
    const app = await buildAppWithSession();

    const res = await request(app)
      .post("/api/task-completions")
      .send({
        houseId: HOUSE_ID,
        taskType: "maintenance",
        taskTitle: "HVAC inspection",
        verificationTier: "photo_verified",
        aiVerificationStatus: "verified",
        timestampDeltaHours: "0.25",
      });

    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      code: "SERVER_OWNED_VERIFICATION_FIELDS",
      fields: expect.arrayContaining([
        "verificationTier",
        "aiVerificationStatus",
        "timestampDeltaHours",
      ]),
    });
    expect(mockCreateTaskCompletion).not.toHaveBeenCalled();
  });

  it("archives the matching maintenance reminder after direct task-completion creation", async () => {
    const app = await buildAppWithSession();
    mockCreateTaskCompletion.mockResolvedValue({ id: "completion-1" });

    const res = await request(app)
      .post("/api/task-completions")
      .send({
        houseId: HOUSE_ID,
        taskId: "us-northeast-hvac-filter",
        taskType: "maintenance",
        taskTitle: "Replace HVAC filter",
        completionMethod: "diy",
      });

    expect(res.status).toBe(200);
    expect(mockArchiveMaintenanceNotificationForTask).toHaveBeenCalledWith(
      HOMEOWNER_ID,
      "us-northeast-hvac-filter",
    );
  });
});
