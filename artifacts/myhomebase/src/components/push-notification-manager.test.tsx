/**
 * Tests for PushNotificationManager: subscription persistence across app update cycles.
 *
 * The service worker lifecycle in registerServiceWorker() unregisters all old
 * workers and clears caches on every app update before re-registering the new
 * worker. These tests confirm that the component:
 *
 *  1. Calls /api/push/verify after finding an existing browser subscription
 *  2. Does NOT re-subscribe when verify returns 200 (subscription still valid)
 *  3. Automatically re-subscribes when verify returns 404 (server lost the record)
 *  4. Registers the new endpoint on the server after a re-subscribe
 *  5. Does NOT call verify when no browser subscription exists
 *
 * Strategy:
 *  - Browser APIs (navigator.serviceWorker, PushManager, Notification, caches)
 *    are stubbed in beforeEach so each test controls what subscription state
 *    the browser exposes after the SW update cycle.
 *  - `fetch` is replaced with a vi.fn() whose per-URL behaviour each test
 *    configures to simulate server responses.
 *  - `act(async () => { ...; await new Promise(r => setTimeout(r, 100)); })`
 *    flushes the chain of async effects (useEffect → checkExistingSubscription
 *    → verifySubscriptionOnServer → subscribeUser) so assertions are stable.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, act, cleanup } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Mock the toast hook — we don't need to assert on toasts in these tests
// ---------------------------------------------------------------------------
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Import subject AFTER vi.mock() declarations
// ---------------------------------------------------------------------------
import PushNotificationManager from "./push-notification-manager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** A VAPID key that passes base64url decoding inside urlBase64ToUint8Array. */
const FAKE_VAPID_KEY = "dGVzdC12YXBpZA";

/** Builds a minimal fake PushSubscription. */
function makeFakeSub(endpoint: string) {
  return {
    endpoint,
    unsubscribe: vi.fn().mockResolvedValue(true),
    getKey: (key: string) => {
      if (key === "p256dh") return new Uint8Array([1, 2, 3]).buffer;
      if (key === "auth") return new Uint8Array([4, 5, 6]).buffer;
      return null;
    },
  };
}

type FakeSub = ReturnType<typeof makeFakeSub>;

/**
 * Stubs all browser push APIs that PushNotificationManager touches.
 *
 * @param existingSub  The PushSubscription that `pushManager.getSubscription()`
 *                     returns, or null if no subscription exists on the browser.
 * @param newSubAfterResubscribe  The PushSubscription returned by
 *                                `pushManager.subscribe()` during a re-subscribe.
 *                                Defaults to a new unique endpoint.
 */
function stubBrowserPushApis(
  existingSub: FakeSub | null,
  newSubAfterResubscribe: FakeSub = makeFakeSub("https://push.example.com/new-sub"),
) {
  const getSubscriptionMock = vi.fn().mockResolvedValue(existingSub);
  const subscribeMock = vi.fn().mockResolvedValue(newSubAfterResubscribe);

  const fakeRegistration = {
    pushManager: {
      getSubscription: getSubscriptionMock,
      subscribe: subscribeMock,
    },
    unregister: vi.fn().mockResolvedValue(true),
    addEventListener: vi.fn(),
    installing: null,
  };

  const fakeServiceWorker = {
    getRegistrations: vi.fn().mockResolvedValue([fakeRegistration]),
    register: vi.fn().mockResolvedValue(fakeRegistration),
    // `ready` is a Promise<ServiceWorkerRegistration>
    ready: Promise.resolve(fakeRegistration),
    addEventListener: vi.fn(),
  };

  Object.defineProperty(navigator, "serviceWorker", {
    value: fakeServiceWorker,
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, "PushManager", {
    value: class {},
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, "Notification", {
    value: {
      permission: "granted" as NotificationPermission,
      requestPermission: vi.fn().mockResolvedValue("granted"),
    },
    configurable: true,
    writable: true,
  });

  Object.defineProperty(window, "caches", {
    value: {
      keys: vi.fn().mockResolvedValue([]),
      delete: vi.fn().mockResolvedValue(true),
    },
    configurable: true,
    writable: true,
  });

  return { getSubscriptionMock, subscribeMock };
}

/** Returns all calls to `fetchMock` whose URL contains `urlFragment`. */
function callsTo(fetchMock: ReturnType<typeof vi.fn>, urlFragment: string) {
  return fetchMock.mock.calls.filter(([url]: [string]) =>
    typeof url === "string" && url.includes(urlFragment),
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Verify is called for existing subscriptions
// ---------------------------------------------------------------------------

describe("PushNotificationManager — verify called for existing browser subscription", () => {
  it("POSTs to /api/push/verify with the subscription endpoint when one is found", async () => {
    const existingSub = makeFakeSub("https://push.example.com/endpoint-check");
    stubBrowserPushApis(existingSub);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ exists: true }),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<PushNotificationManager userId="user-001" />);
      await new Promise((r) => setTimeout(r, 100));
    });

    const verifyCalls = callsTo(fetchMock, "/api/push/verify");
    expect(verifyCalls.length).toBeGreaterThanOrEqual(1);

    const body = JSON.parse(verifyCalls[0][1]?.body);
    expect(body.endpoint).toBe("https://push.example.com/endpoint-check");
  });

  it("does NOT call /api/push/verify when no browser push subscription exists", async () => {
    stubBrowserPushApis(null);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<PushNotificationManager userId="user-001" />);
      await new Promise((r) => setTimeout(r, 100));
    });

    const verifyCalls = callsTo(fetchMock, "/api/push/verify");
    expect(verifyCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 2. Subscription preserved when server confirms validity (verify → 200)
// ---------------------------------------------------------------------------

describe("PushNotificationManager — subscription preserved when verify succeeds", () => {
  it("does not call /api/push/subscribe when verify returns 200", async () => {
    const existingSub = makeFakeSub("https://push.example.com/preserved-sub");
    stubBrowserPushApis(existingSub);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/push/verify")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ exists: true }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<PushNotificationManager userId="user-001" />);
      await new Promise((r) => setTimeout(r, 100));
    });

    const subscribeCalls = callsTo(fetchMock, "/api/push/subscribe");
    expect(subscribeCalls.length).toBe(0);
  });

  it("keeps the component in subscribed state when verify returns 200", async () => {
    const existingSub = makeFakeSub("https://push.example.com/still-valid");
    stubBrowserPushApis(existingSub);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/push/verify")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ exists: true }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = await act(async () => {
      const result = render(<PushNotificationManager userId="user-001" />);
      await new Promise((r) => setTimeout(r, 100));
      return result;
    });

    // The "Enabled" badge should be visible — subscription is active
    expect(container.textContent).toContain("Enabled");
  });
});

// ---------------------------------------------------------------------------
// 3. Automatic re-subscribe when server has lost the subscription (verify → 404)
// ---------------------------------------------------------------------------

describe("PushNotificationManager — automatic re-subscribe when verify returns 404", () => {
  it("calls /api/push/subscribe when verify returns 404 (server lost the subscription record)", async () => {
    const existingSub = makeFakeSub("https://push.example.com/lost-endpoint");
    const newSub = makeFakeSub("https://push.example.com/resubscribed-endpoint");
    stubBrowserPushApis(existingSub, newSub);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/push/verify")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ exists: false }),
        } as Response);
      }
      if (url.includes("/api/push/vapid-public-key")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ publicKey: FAKE_VAPID_KEY }),
        } as Response);
      }
      if (url.includes("/api/push/subscribe")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<PushNotificationManager userId="user-001" />);
      await new Promise((r) => setTimeout(r, 150));
    });

    const subscribeCalls = callsTo(fetchMock, "/api/push/subscribe");
    expect(subscribeCalls.length).toBeGreaterThanOrEqual(1);
  });

  it("registers the new endpoint (not the old one) when re-subscribing after a SW update cycle", async () => {
    const oldSub = makeFakeSub("https://push.example.com/old-stale-endpoint");
    const newSub = makeFakeSub("https://push.example.com/fresh-endpoint-after-update");
    stubBrowserPushApis(oldSub, newSub);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/push/verify")) {
        // verify fails — server lost the record when the SW was unregistered
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ exists: false }),
        } as Response);
      }
      if (url.includes("/api/push/vapid-public-key")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ publicKey: FAKE_VAPID_KEY }),
        } as Response);
      }
      if (url.includes("/api/push/subscribe")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<PushNotificationManager userId="user-001" />);
      await new Promise((r) => setTimeout(r, 150));
    });

    const subscribeCalls = callsTo(fetchMock, "/api/push/subscribe");
    expect(subscribeCalls.length).toBeGreaterThanOrEqual(1);

    // The re-subscribe call must use the NEW endpoint, not the old stale one
    const subscribeBody = JSON.parse(subscribeCalls[0][1]?.body);
    expect(subscribeBody.endpoint).toBe(
      "https://push.example.com/fresh-endpoint-after-update",
    );
    expect(subscribeBody.endpoint).not.toBe(
      "https://push.example.com/old-stale-endpoint",
    );
  });

  it("fetches the VAPID public key before re-subscribing", async () => {
    const existingSub = makeFakeSub("https://push.example.com/any-endpoint");
    const newSub = makeFakeSub("https://push.example.com/any-new-endpoint");
    stubBrowserPushApis(existingSub, newSub);

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/push/verify")) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: async () => ({ exists: false }),
        } as Response);
      }
      if (url.includes("/api/push/vapid-public-key")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ publicKey: FAKE_VAPID_KEY }),
        } as Response);
      }
      if (url.includes("/api/push/subscribe")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response);
    });
    vi.stubGlobal("fetch", fetchMock);

    await act(async () => {
      render(<PushNotificationManager userId="user-001" />);
      await new Promise((r) => setTimeout(r, 150));
    });

    const vapidCalls = callsTo(fetchMock, "/api/push/vapid-public-key");
    expect(vapidCalls.length).toBeGreaterThanOrEqual(1);
  });
});
