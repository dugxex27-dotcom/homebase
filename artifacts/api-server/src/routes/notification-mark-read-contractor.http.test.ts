/**
 * Integration tests for PATCH /api/notifications/:id/read
 *
 * Covers the fix for appointment-linked notifications being permanently
 * stuck unread for contractors: the endpoint used to authorize only when
 * `notification.homeownerId === session user`, but contractor-facing
 * unread notifications (surfaced via getContractorNotifications, which
 * joins notifications -> contractorAppointments on appointmentId) carry
 * the homeowner's id, not the contractor's — so a contractor could never
 * pass that check and could never mark their own notification read.
 *
 * The fix also allows the contractor legitimately linked to the
 * notification's appointment (appointment.contractorId === session user)
 * to mark it read, while still rejecting an unrelated third party.
 *
 *   1. Contractor CAN mark their own appointment-linked notification as read
 *   2. Contractor CANNOT mark an unrelated notification as read (403)
 *   3. Homeowner can still mark their own notifications as read (no regression)
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// vi.hoisted() — shared mocks visible inside vi.mock() factory closures
// ---------------------------------------------------------------------------

const {
  mockGetNotification,
  mockGetContractorAppointment,
  mockMarkNotificationAsRead,
  HOMEOWNER_ID,
  CONTRACTOR_ID,
  OTHER_CONTRACTOR_ID,
  NOTIFICATION_ID,
  APPOINTMENT_ID,
} = vi.hoisted(() => ({
  mockGetNotification: vi.fn(),
  mockGetContractorAppointment: vi.fn(),
  mockMarkNotificationAsRead: vi.fn().mockResolvedValue(true),
  HOMEOWNER_ID: "homeowner-001",
  CONTRACTOR_ID: "contractor-001",
  OTHER_CONTRACTOR_ID: "contractor-002",
  NOTIFICATION_ID: "notification-001",
  APPOINTMENT_ID: "appointment-001",
}));

let currentSession: any;

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../replitAuth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replitAuth")>();
  return {
    ...actual,
    setupAuth: vi.fn().mockResolvedValue(undefined),
    isAuthenticated: vi.fn((req: any, _res: any, next: any) => {
      req.session = currentSession;
      next();
    }),
    requireNotSuspended: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireActiveAccountFresh: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireCompanyRole: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireCompanyRoleAny: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireDivisionAccess: vi.fn((_req: any, _res: any, next: any) => next()),
    requireBulkImport: vi.fn((_req: any, _res: any, next: any) => next()),
    requireApiAccess: vi.fn((_req: any, _res: any, next: any) => next()),
    requireSameCompany: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    requireResourceOwnership: vi.fn(() => (_req: any, _res: any, next: any) => next()),
    validateHouseOwnership: vi.fn().mockResolvedValue(true),
    validateMaintenanceLogOwnership: vi.fn().mockResolvedValue(true),
    validateCustomMaintenanceTaskOwnership: vi.fn().mockResolvedValue(true),
    validateHomeSystemOwnership: vi.fn().mockResolvedValue(true),
    suspendedUserIds: new Set<string>(),
    invalidateUserSessions: vi.fn(),
    evictStatusCache: vi.fn(),
    refreshUserSessionRole: vi.fn(),
    invalidateActiveStatusCache: vi.fn(),
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
vi.mock("../security-audit", () => ({
  AuditEventTypes: { ADMIN_USER_MODIFY: "admin.user.modify", SECURITY_SCAN: "security.scan" },
  AuditEventCategories: {},
  AuditSeverity: {},
  auditLogger: {
    log: vi.fn().mockResolvedValue(undefined),
    logAuth: vi.fn(),
    logSecurity: vi.fn(),
    logRequest: vi.fn(),
    logLogin: vi.fn().mockResolvedValue(undefined),
    logLogout: vi.fn().mockResolvedValue(undefined),
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
vi.mock("stripe", () => {
  function MockStripe(this: any) {
    this.webhooks = { constructEvent: vi.fn().mockReturnValue({ id: "evt_stub", type: "test.stub" }) };
    this.subscriptionItems = { createUsageRecord: vi.fn().mockResolvedValue(undefined) };
    this.subscriptions = { retrieve: vi.fn().mockResolvedValue({ id: "sub_stub", items: { data: [] } }) };
    this.accounts = {
      retrieve: vi.fn().mockResolvedValue({ id: "acct_test", charges_enabled: true, payouts_enabled: true, country: "US" }),
    };
    this.paymentIntents = { retrieve: vi.fn() };
    this.transfers = { create: vi.fn() };
  }
  return { default: MockStripe };
});

vi.mock("../storage", async () => {
  const { createStorageMock } = await import("../test-helpers/storage-mock");
  return {
    storage: createStorageMock({
      getNotification: mockGetNotification,
      getContractorAppointment: mockGetContractorAppointment,
      markNotificationAsRead: mockMarkNotificationAsRead,
    }),
  };
});

vi.mock("../db", () => ({
  pool: { query: vi.fn().mockResolvedValue({ rows: [] }), end: vi.fn() },
  db: {
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined),
        returning: vi.fn().mockResolvedValue([]),
      }),
    }),
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
    update: vi.fn().mockReturnValue({
      set: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
    }),
    delete: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue(undefined) }),
  },
}));

// ---------------------------------------------------------------------------
// Imports — placed AFTER vi.mock() blocks
// ---------------------------------------------------------------------------

import express from "express";
import request from "supertest";
import { registerRoutes } from "./routes";
import { json as expressJson } from "express";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("PATCH /api/notifications/:id/read — contractor authorization", () => {
  let app: express.Express;

  const appointmentLinkedNotification = {
    id: NOTIFICATION_ID,
    homeownerId: HOMEOWNER_ID,
    houseId: "house-1",
    appointmentId: APPOINTMENT_ID,
    maintenanceTaskId: null,
    type: "24_hour",
    category: "appointment",
    title: "Upcoming appointment",
    message: "Your contractor is arriving soon",
    scheduledFor: new Date().toISOString(),
    sentAt: null,
    isRead: false,
    priority: "medium",
    actionUrl: null,
  };

  const appointment = {
    id: APPOINTMENT_ID,
    homeownerId: HOMEOWNER_ID,
    houseId: "house-1",
    contractorId: CONTRACTOR_ID,
    contractorName: "Bob the Builder",
    contractorCompany: null,
    contractorPhone: null,
    serviceType: "plumbing",
    serviceDescription: "Fix leak",
    homeArea: "kitchen",
    scheduledDateTime: new Date().toISOString(),
    estimatedDuration: 60,
    status: "scheduled",
    notes: null,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    mockMarkNotificationAsRead.mockResolvedValue(true);

    process.env.STRIPE_SECRET_KEY = "sk_test_notif_read_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_notif_read_placeholder";

    app = express();
    app.use(expressJson());
    await registerRoutes(app);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lets the contractor legitimately linked to the appointment mark their notification as read", async () => {
    currentSession = {
      isAuthenticated: true,
      user: { id: CONTRACTOR_ID, email: "contractor@test.com", role: "contractor", status: "active" },
    };
    mockGetNotification.mockResolvedValue({ ...appointmentLinkedNotification });
    mockGetContractorAppointment.mockResolvedValue({ ...appointment });

    const res = await request(app).patch(`/api/notifications/${NOTIFICATION_ID}/read`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(mockMarkNotificationAsRead).toHaveBeenCalledWith(NOTIFICATION_ID);
  });

  it("rejects a contractor who is not the one linked to the notification's appointment", async () => {
    currentSession = {
      isAuthenticated: true,
      user: { id: OTHER_CONTRACTOR_ID, email: "other-contractor@test.com", role: "contractor", status: "active" },
    };
    mockGetNotification.mockResolvedValue({ ...appointmentLinkedNotification });
    mockGetContractorAppointment.mockResolvedValue({ ...appointment }); // contractorId = CONTRACTOR_ID, not OTHER_CONTRACTOR_ID

    const res = await request(app).patch(`/api/notifications/${NOTIFICATION_ID}/read`);

    expect(res.status).toBe(403);
    expect(mockMarkNotificationAsRead).not.toHaveBeenCalled();
  });

  it("rejects a contractor when the notification has no linked appointment at all", async () => {
    currentSession = {
      isAuthenticated: true,
      user: { id: CONTRACTOR_ID, email: "contractor@test.com", role: "contractor", status: "active" },
    };
    mockGetNotification.mockResolvedValue({ ...appointmentLinkedNotification, appointmentId: null });

    const res = await request(app).patch(`/api/notifications/${NOTIFICATION_ID}/read`);

    expect(res.status).toBe(403);
    expect(mockGetContractorAppointment).not.toHaveBeenCalled();
    expect(mockMarkNotificationAsRead).not.toHaveBeenCalled();
  });

  it("still lets the homeowner mark their own notification as read (no regression)", async () => {
    currentSession = {
      isAuthenticated: true,
      user: { id: HOMEOWNER_ID, email: "homeowner@test.com", role: "homeowner", status: "active" },
    };
    mockGetNotification.mockResolvedValue({ ...appointmentLinkedNotification });

    const res = await request(app).patch(`/api/notifications/${NOTIFICATION_ID}/read`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ success: true });
    expect(mockMarkNotificationAsRead).toHaveBeenCalledWith(NOTIFICATION_ID);
    // Homeowner ownership is a direct match — no need to consult the appointment.
    expect(mockGetContractorAppointment).not.toHaveBeenCalled();
  });

  it("still rejects an unrelated homeowner from marking someone else's notification as read", async () => {
    currentSession = {
      isAuthenticated: true,
      user: { id: "homeowner-999", email: "stranger@test.com", role: "homeowner", status: "active" },
    };
    mockGetNotification.mockResolvedValue({ ...appointmentLinkedNotification });

    const res = await request(app).patch(`/api/notifications/${NOTIFICATION_ID}/read`);

    expect(res.status).toBe(403);
    expect(mockMarkNotificationAsRead).not.toHaveBeenCalled();
  });
});
