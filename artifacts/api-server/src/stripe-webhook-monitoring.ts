import { logger } from "./lib/logger";

export const STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD = 3;
export const STRIPE_WEBHOOK_ALERT_COOLDOWN_MS = 15 * 60 * 1000;
export const STRIPE_WEBHOOK_STALE_PENDING_OLDER_THAN_MINUTES = 15;

export type StripeWebhookFailureReason =
  | "stripe_not_configured"
  | "webhook_secret_not_configured"
  | "signature_verification_failed"
  | "event_claim_pending"
  | "event_claim_stale"
  | "event_processing_failed";

export interface StripeWebhookFailureContext {
  eventId?: unknown;
  eventType?: unknown;
  statusCode: number;
  reason: StripeWebhookFailureReason;
  error?: unknown;
  countsTowardOutage?: boolean;
}

export interface StaleStripePendingEvent {
  eventId: string;
  processedAt: Date;
}

export interface StripeWebhookHealthSnapshot {
  status: "healthy" | "unhealthy";
  stateScope: "process";
  reasons: string[];
  consecutive5xxFailures: number;
  consecutive5xxThreshold: number;
  stalePendingCount: number;
  stalePendingThreshold: number;
  lastFailureAt: string | null;
  lastSuccessfulResponseAt: string | null;
  lastStalePendingEventIds: string[];
  monitoringCheckError: string | null;
}

interface MonitoringState {
  consecutive5xxFailures: number;
  lastFailureAtMs: number | null;
  lastSuccessfulResponseAtMs: number | null;
  lastFailureAlertAtMs: number | null;
  stalePendingCount: number;
  lastStalePendingEventIds: string[];
  lastStaleAlertAtMs: number | null;
  monitoringCheckError: string | null;
}

const state: MonitoringState = {
  consecutive5xxFailures: 0,
  lastFailureAtMs: null,
  lastSuccessfulResponseAtMs: null,
  lastFailureAlertAtMs: null,
  stalePendingCount: 0,
  lastStalePendingEventIds: [],
  lastStaleAlertAtMs: null,
  monitoringCheckError: null,
};

function sanitizeToken(value: unknown, fallback: string): string {
  if (typeof value !== "string" || value.length === 0) return fallback;
  const sanitized = value.replace(/[^a-zA-Z0-9_:.@-]/g, "_").slice(0, 128);
  return sanitized || fallback;
}

export function sanitizeStripeWebhookEventId(eventId: unknown): string {
  return sanitizeToken(eventId, "unknown");
}

export function sanitizeStripeWebhookEventType(eventType: unknown): string {
  return sanitizeToken(eventType, "unknown");
}

function getSafeErrorClass(error: unknown): string {
  return error instanceof Error ? "Error" : "non_error";
}

function asIso(timestampMs: number | null): string | null {
  return timestampMs === null ? null : new Date(timestampMs).toISOString();
}

export function getStripeWebhookHealthSnapshot(): StripeWebhookHealthSnapshot {
  const reasons: string[] = [];
  if (state.consecutive5xxFailures >= STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD) {
    reasons.push("consecutive_5xx_responses");
  }
  if (state.stalePendingCount > 0) {
    reasons.push("stale_pending_event_claims");
  }
  if (state.monitoringCheckError) {
    reasons.push("monitoring_check_failed");
  }

  return {
    status: reasons.length > 0 ? "unhealthy" : "healthy",
    stateScope: "process",
    reasons,
    consecutive5xxFailures: state.consecutive5xxFailures,
    consecutive5xxThreshold: STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD,
    stalePendingCount: state.stalePendingCount,
    stalePendingThreshold: 1,
    lastFailureAt: asIso(state.lastFailureAtMs),
    lastSuccessfulResponseAt: asIso(state.lastSuccessfulResponseAtMs),
    lastStalePendingEventIds: [...state.lastStalePendingEventIds],
    monitoringCheckError: state.monitoringCheckError,
  };
}

export function getStripeWebhookHealthHttpStatus(
  health: StripeWebhookHealthSnapshot,
): 200 | 503 {
  return health.status === "healthy" ? 200 : 503;
}

export function recordStripeWebhookSuccess(nowMs = Date.now()): StripeWebhookHealthSnapshot {
  const previousFailures = state.consecutive5xxFailures;
  state.consecutive5xxFailures = 0;
  state.lastFailureAlertAtMs = null;
  state.lastSuccessfulResponseAtMs = nowMs;

  if (previousFailures > 0) {
    logger.info(
      { previousConsecutive5xxFailures: previousFailures },
      "[STRIPE-WEBHOOK-MONITOR] Webhook 5xx streak recovered",
    );
  }

  return getStripeWebhookHealthSnapshot();
}

export function recordStripeWebhookFailure(
  context: StripeWebhookFailureContext,
  nowMs = Date.now(),
): StripeWebhookHealthSnapshot {
  const responseClass = `${Math.floor(context.statusCode / 100)}xx`;
  const countsTowardOutage =
    context.statusCode >= 500 &&
    context.statusCode < 600 &&
    context.countsTowardOutage !== false;
  const failure = {
    stripeEventId: sanitizeStripeWebhookEventId(context.eventId),
    eventType: sanitizeStripeWebhookEventType(context.eventType),
    httpStatus: context.statusCode,
    responseClass,
    failureReason: context.reason,
    errorClass: getSafeErrorClass(context.error),
    countsTowardOutage,
  };

  logger.error(failure, "[STRIPE-WEBHOOK] Processing failure");

  if (countsTowardOutage) {
    state.consecutive5xxFailures += 1;
    state.lastFailureAtMs = nowMs;

    const cooldownExpired =
      state.lastFailureAlertAtMs === null ||
      nowMs - state.lastFailureAlertAtMs >= STRIPE_WEBHOOK_ALERT_COOLDOWN_MS;
    if (
      state.consecutive5xxFailures >= STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD &&
      cooldownExpired
    ) {
      state.lastFailureAlertAtMs = nowMs;
      logger.error(
        {
          ...failure,
          alert: true,
          consecutive5xxFailures: state.consecutive5xxFailures,
          threshold: STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD,
        },
        "[STRIPE-WEBHOOK-MONITOR] Consecutive HTTP 5xx threshold exceeded — operator attention required",
      );
    }
  } else if (context.statusCode < 500 || context.statusCode >= 600) {
    state.consecutive5xxFailures = 0;
    state.lastFailureAlertAtMs = null;
  }

  return getStripeWebhookHealthSnapshot();
}

export function recordStaleStripePendingEvents(
  events: readonly StaleStripePendingEvent[],
  nowMs = Date.now(),
): StripeWebhookHealthSnapshot {
  const previousCount = state.stalePendingCount;
  state.stalePendingCount = events.length;
  state.lastStalePendingEventIds = events
    .slice(0, 10)
    .map((event) => sanitizeStripeWebhookEventId(event.eventId));
  state.monitoringCheckError = null;

  if (events.length > 0) {
    const cooldownExpired =
      state.lastStaleAlertAtMs === null ||
      nowMs - state.lastStaleAlertAtMs >= STRIPE_WEBHOOK_ALERT_COOLDOWN_MS;
    if (previousCount !== events.length || cooldownExpired) {
      state.lastStaleAlertAtMs = nowMs;
      const oldestClaimedAtMs = Math.min(
        ...events.map((event) => event.processedAt.getTime()),
      );
      logger.error(
        {
          alert: true,
          stalePendingCount: events.length,
          threshold: 1,
          eventIds: state.lastStalePendingEventIds,
          oldestClaimedAt: new Date(oldestClaimedAtMs).toISOString(),
          olderThanMinutes: STRIPE_WEBHOOK_STALE_PENDING_OLDER_THAN_MINUTES,
        },
        "[STRIPE-WEBHOOK-MONITOR] Stale pending Stripe event claims detected — recovery required",
      );
    }
  } else if (previousCount > 0) {
    state.lastStaleAlertAtMs = null;
    logger.info(
      { previousStalePendingCount: previousCount },
      "[STRIPE-WEBHOOK-MONITOR] Stale pending Stripe event claims cleared",
    );
  }

  return getStripeWebhookHealthSnapshot();
}

export async function checkStripeWebhookHealth(
  readStalePendingEvents: () => Promise<readonly StaleStripePendingEvent[]>,
  nowMs = Date.now(),
): Promise<StripeWebhookHealthSnapshot> {
  try {
    const events = await readStalePendingEvents();
    return recordStaleStripePendingEvents(events, nowMs);
  } catch (error) {
    state.monitoringCheckError = "stale_pending_check_failed";
    logger.error(
      {
        failureReason: state.monitoringCheckError,
        errorClass: getSafeErrorClass(error),
      },
      "[STRIPE-WEBHOOK-MONITOR] Stale pending claim check failed",
    );
    return getStripeWebhookHealthSnapshot();
  }
}

/** Test-only reset; does not affect production behavior. */
export function resetStripeWebhookMonitoringForTests(): void {
  state.consecutive5xxFailures = 0;
  state.lastFailureAtMs = null;
  state.lastSuccessfulResponseAtMs = null;
  state.lastFailureAlertAtMs = null;
  state.stalePendingCount = 0;
  state.lastStalePendingEventIds = [];
  state.lastStaleAlertAtMs = null;
  state.monitoringCheckError = null;
}