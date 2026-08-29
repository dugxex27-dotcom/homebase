import { beforeEach, describe, expect, it, vi } from "vitest";
import { logger } from "./lib/logger";
import {
  checkStripeWebhookHealth,
  getStripeWebhookHealthHttpStatus,
  getStripeWebhookHealthSnapshot,
  recordStripeWebhookFailure,
  recordStripeWebhookSuccess,
  resetStripeWebhookMonitoringForTests,
  STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD,
} from "./stripe-webhook-monitoring";

describe("Stripe webhook monitoring", () => {
  beforeEach(() => {
    resetStripeWebhookMonitoringForTests();
    vi.restoreAllMocks();
  });

  it("emits sanitized structured failure logs", () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);

    recordStripeWebhookFailure({
      eventId: "evt_bad\nid",
      eventType: "invoice.paid",
      statusCode: 500,
      reason: "event_processing_failed",
      error: new Error(
        "customer@example.com authorization: Bearer secret postgresql://user:pass@db.example/app",
      ),
    }, 1_000);

    const expectedFailure = expect.objectContaining({
      stripeEventId: "evt_bad_id",
      eventType: "invoice.paid",
      httpStatus: 500,
      responseClass: "5xx",
      failureReason: "event_processing_failed",
      errorClass: "Error",
      countsTowardOutage: true,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expectedFailure,
      "[STRIPE-WEBHOOK] Processing failure",
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("customer@example.com");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("Bearer secret");
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("user:pass");
  });

  it("alerts at the consecutive-5xx threshold and resets after success", () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);

    for (let i = 0; i < STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD; i += 1) {
      recordStripeWebhookFailure({
        eventId: `evt_${i}`,
        eventType: "invoice.paid",
        statusCode: 500,
        reason: "event_processing_failed",
        error: "database unavailable",
      }, 1_000 + i);
    }

    expect(getStripeWebhookHealthSnapshot()).toMatchObject({
      status: "unhealthy",
      consecutive5xxFailures: 3,
      reasons: ["consecutive_5xx_responses"],
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        alert: true,
        consecutive5xxFailures: STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD,
      }),
      expect.stringContaining("Consecutive HTTP 5xx threshold exceeded"),
    );

    recordStripeWebhookSuccess(2_000);
    expect(getStripeWebhookHealthSnapshot()).toMatchObject({
      status: "healthy",
      consecutive5xxFailures: 0,
      lastSuccessfulResponseAt: "1970-01-01T00:00:02.000Z",
    });
  });

  it("rate-limits repeated threshold alerts until the cooldown expires", () => {
    const errorSpy = vi.spyOn(logger, "error").mockImplementation(() => logger);

    for (let i = 0; i < STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD + 1; i += 1) {
      recordStripeWebhookFailure({
        eventId: `evt_${i}`,
        eventType: "invoice.paid",
        statusCode: 500,
        reason: "event_processing_failed",
        error: "database unavailable",
      }, 1_000 + i);
    }

    const thresholdAlerts = () => errorSpy.mock.calls.filter(
      ([, message]) => String(message).includes("Consecutive HTTP 5xx threshold exceeded"),
    );
    expect(thresholdAlerts()).toHaveLength(1);

    recordStripeWebhookFailure({
      eventId: "evt_after_cooldown",
      eventType: "invoice.paid",
      statusCode: 500,
      reason: "event_processing_failed",
      error: "database unavailable",
    }, 1_002 + 15 * 60 * 1000);

    expect(thresholdAlerts()).toHaveLength(2);
  });

  it("breaks the consecutive 5xx streak on a non-5xx response", () => {
    recordStripeWebhookFailure({
      eventId: "evt_500",
      eventType: "invoice.paid",
      statusCode: 500,
      reason: "event_processing_failed",
    }, 1_000);
    recordStripeWebhookFailure({
      statusCode: 400,
      reason: "signature_verification_failed",
    }, 2_000);

    expect(getStripeWebhookHealthSnapshot()).toMatchObject({
      status: "healthy",
      consecutive5xxFailures: 0,
    });
  });

  it("logs lease contention without counting it as an outage failure", () => {
    recordStripeWebhookFailure({
      eventId: "evt_pending",
      eventType: "invoice.paid",
      statusCode: 500,
      reason: "event_claim_pending",
      countsTowardOutage: false,
    }, 1_000);

    expect(getStripeWebhookHealthSnapshot()).toMatchObject({
      status: "healthy",
      consecutive5xxFailures: 0,
    });
  });

  it("detects stale pending claims without performing a write", async () => {
    const readCheck = vi.fn().mockResolvedValue([
      {
        eventId: "evt_stale_1",
        processedAt: new Date("2026-08-29T12:00:00.000Z"),
      },
    ]);

    const result = await checkStripeWebhookHealth(readCheck, 2_000);

    expect(readCheck).toHaveBeenCalledOnce();
    expect(result).toMatchObject({
      status: "unhealthy",
      reasons: ["stale_pending_event_claims"],
      stalePendingCount: 1,
      lastStalePendingEventIds: ["evt_stale_1"],
    });
  });

  it("reports healthy when no stale claims exist and unhealthy when the read check fails", async () => {
    const healthy = await checkStripeWebhookHealth(
      vi.fn().mockResolvedValue([]),
      2_000,
    );
    expect(healthy).toMatchObject({
      status: "healthy",
      reasons: [],
      stalePendingCount: 0,
    });
    expect(getStripeWebhookHealthHttpStatus(healthy)).toBe(200);

    const unhealthy = await checkStripeWebhookHealth(
      vi.fn().mockRejectedValue(new Error("database unavailable")),
      3_000,
    );
    expect(unhealthy).toMatchObject({
      status: "unhealthy",
      reasons: ["monitoring_check_failed"],
      monitoringCheckError: "stale_pending_check_failed",
    });
    expect(getStripeWebhookHealthHttpStatus(unhealthy)).toBe(503);
  });

  it("does not leave a stale-claim alert after the claim is cleared", async () => {
    await checkStripeWebhookHealth(
      vi.fn().mockResolvedValue([
        {
          eventId: "evt_stale_2",
          processedAt: new Date("2026-08-29T12:00:00.000Z"),
        },
      ]),
      2_000,
    );
    const cleared = await checkStripeWebhookHealth(
      vi.fn().mockResolvedValue([]),
      3_000,
    );

    expect(cleared).toMatchObject({
      status: "healthy",
      stalePendingCount: 0,
      reasons: [],
    });
  });
});