import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "./lib/logger";
import {
  createStripeWebhookMonitor,
  getStripeWebhookHealthHttpStatus,
  type StripeWebhookMonitoringState,
  type StripeWebhookMonitoringStore,
  STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD,
  STRIPE_WEBHOOK_ALERT_COOLDOWN_MS,
} from "./stripe-webhook-monitoring";

function createSharedMemoryStore(): StripeWebhookMonitoringStore {
  let state: StripeWebhookMonitoringState = {
    consecutive5xxFailures: 0,
    lastFailureAtMs: null,
    lastSuccessfulResponseAtMs: null,
    stalePendingCount: 0,
    lastStalePendingEventIds: [],
    monitoringCheckError: null,
  };
  let failureAlertAtMs: number | null = null;
  let staleAlertAtMs: number | null = null;
  let queue = Promise.resolve();

  const atomic = async <T>(operation: () => T): Promise<T> => {
    const previous = queue;
    let release!: () => void;
    queue = new Promise<void>((resolve) => { release = resolve; });
    await previous;
    try {
      return operation();
    } finally {
      release();
    }
  };

  return {
    async read() {
      return atomic(() => ({ ...state, lastStalePendingEventIds: [...state.lastStalePendingEventIds] }));
    },
    async recordFailure(nowMs) {
      return atomic(() => {
        const previousCount = state.consecutive5xxFailures;
        const count = previousCount + 1;
        const shouldAlert = count >= STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD
          && (failureAlertAtMs === null || nowMs - failureAlertAtMs >= STRIPE_WEBHOOK_ALERT_COOLDOWN_MS);
        if (shouldAlert) failureAlertAtMs = nowMs;
        state = { ...state, consecutive5xxFailures: count, lastFailureAtMs: nowMs };
        return { ...state, shouldAlert, previousCount };
      });
    },
    async recordSuccess(nowMs) {
      return atomic(() => {
        const previousCount = state.consecutive5xxFailures;
        failureAlertAtMs = null;
        state = { ...state, consecutive5xxFailures: 0, lastSuccessfulResponseAtMs: nowMs };
        return { ...state, shouldAlert: false, previousCount };
      });
    },
    async recordStaleEvents(count, eventIds, nowMs) {
      return atomic(() => {
        const previousCount = state.stalePendingCount;
        const shouldAlert = count > 0
          && (previousCount !== count || staleAlertAtMs === null
            || nowMs - staleAlertAtMs >= STRIPE_WEBHOOK_ALERT_COOLDOWN_MS);
        staleAlertAtMs = count === 0 ? null : shouldAlert ? nowMs : staleAlertAtMs;
        state = {
          ...state,
          stalePendingCount: count,
          lastStalePendingEventIds: [...eventIds],
          monitoringCheckError: null,
        };
        return { ...state, shouldAlert, previousCount };
      });
    },
    async recordCheckError(errorCode) {
      return atomic(() => {
        state = { ...state, monitoringCheckError: errorCode };
        return { ...state };
      });
    },
  };
}

describe("Stripe webhook fleet monitoring", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("aggregates failures split between API instances into one unhealthy streak", async () => {
    const sharedStore = createSharedMemoryStore();
    const processA = createStripeWebhookMonitor(sharedStore);
    const processB = createStripeWebhookMonitor(sharedStore);

    await processA.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_000);
    await processB.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_001);
    await processA.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_002);

    const healthFromOtherProcess = await processB.getHealthSnapshot();
    expect(healthFromOtherProcess).toMatchObject({
      status: "unhealthy",
      stateScope: "fleet",
      consecutive5xxFailures: 3,
      reasons: ["consecutive_5xx_responses"],
    });
  });

  it("sanitizes failure logs without leaking exception contents", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);
    const monitor = createStripeWebhookMonitor(createSharedMemoryStore());
    await monitor.recordFailure({
      eventId: "evt_bad\nid",
      eventType: "invoice.paid",
      statusCode: 500,
      reason: "event_processing_failed",
      error: new Error("customer@example.com Bearer secret"),
    }, 1_000);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({ stripeEventId: "evt_bad_id", errorClass: "Error", countsTowardOutage: true }),
      "[STRIPE-WEBHOOK] Processing failure",
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("customer@example.com");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("Bearer secret");
  });

  it("atomically emits only one fleet alert under concurrent threshold failures", async () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);
    const sharedStore = createSharedMemoryStore();
    const processA = createStripeWebhookMonitor(sharedStore);
    const processB = createStripeWebhookMonitor(sharedStore);

    await Promise.all([
      processA.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_000),
      processB.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_000),
      processA.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_000),
      processB.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_000),
    ]);

    const alerts = errorSpy.mock.calls.filter(([, message]) =>
      String(message).includes("Consecutive HTTP 5xx threshold exceeded"));
    expect(alerts).toHaveLength(1);
  });

  it("excludes pending and stale claim contention from the shared outage streak", async () => {
    const sharedStore = createSharedMemoryStore();
    const processA = createStripeWebhookMonitor(sharedStore);
    const processB = createStripeWebhookMonitor(sharedStore);
    await processA.recordFailure({
      statusCode: 500,
      reason: "event_claim_pending",
      countsTowardOutage: false,
    });
    await processB.recordFailure({
      statusCode: 500,
      reason: "event_claim_stale",
      countsTowardOutage: false,
    });
    expect(await processA.getHealthSnapshot()).toMatchObject({
      status: "healthy",
      consecutive5xxFailures: 0,
    });
  });

  it("resets the fleet streak after a successful response on another instance", async () => {
    const sharedStore = createSharedMemoryStore();
    const processA = createStripeWebhookMonitor(sharedStore);
    const processB = createStripeWebhookMonitor(sharedStore);
    await processA.recordFailure({ statusCode: 500, reason: "event_processing_failed" }, 1_000);
    await processB.recordSuccess(2_000);
    expect(await processA.getHealthSnapshot()).toMatchObject({
      status: "healthy",
      consecutive5xxFailures: 0,
      lastSuccessfulResponseAt: "1970-01-01T00:00:02.000Z",
    });
  });

  it("reports shared stale claims and monitoring failures through health status", async () => {
    const sharedStore = createSharedMemoryStore();
    const leader = createStripeWebhookMonitor(sharedStore);
    const healthProcess = createStripeWebhookMonitor(sharedStore);
    await leader.checkHealth(async () => [{
      eventId: "evt_stale",
      processedAt: new Date("2026-08-29T12:00:00.000Z"),
    }], 2_000);
    const stale = await healthProcess.getHealthSnapshot();
    expect(stale).toMatchObject({
      status: "unhealthy",
      reasons: ["stale_pending_event_claims"],
      lastStalePendingEventIds: ["evt_stale"],
    });
    expect(getStripeWebhookHealthHttpStatus(stale)).toBe(503);

    const failed = await healthProcess.checkHealth(async () => {
      throw new Error("database unavailable");
    }, 3_000);
    expect(failed.reasons).toContain("monitoring_check_failed");
  });

  it("keeps the full stale count while limiting displayed event IDs", async () => {
    const monitor = createStripeWebhookMonitor(createSharedMemoryStore());
    const events = Array.from({ length: 12 }, (_, index) => ({
      eventId: `evt_${index}`,
      processedAt: new Date("2026-08-29T12:00:00.000Z"),
    }));
    const health = await monitor.checkHealth(async () => events, 2_000);
    expect(health.stalePendingCount).toBe(12);
    expect(health.lastStalePendingEventIds).toHaveLength(10);
  });

  it("fails health closed but preserves webhook handling when shared state is unavailable", async () => {
    const unavailableStore = {
      read: vi.fn().mockRejectedValue(new Error("database unavailable")),
      recordFailure: vi.fn().mockRejectedValue(new Error("database unavailable")),
      recordSuccess: vi.fn().mockRejectedValue(new Error("database unavailable")),
      recordStaleEvents: vi.fn().mockRejectedValue(new Error("database unavailable")),
      recordCheckError: vi.fn().mockRejectedValue(new Error("database unavailable")),
    } satisfies StripeWebhookMonitoringStore;
    const monitor = createStripeWebhookMonitor(unavailableStore);

    await expect(monitor.recordFailure({
      statusCode: 400,
      reason: "signature_verification_failed",
    })).resolves.toMatchObject({ status: "unhealthy" });
    const health = await monitor.getHealthSnapshot();
    expect(health).toMatchObject({
      status: "unhealthy",
      reasons: ["monitoring_check_failed"],
      monitoringCheckError: "shared_monitoring_state_unavailable",
    });
    expect(getStripeWebhookHealthHttpStatus(health)).toBe(503);
  });
});