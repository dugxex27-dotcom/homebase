import { randomUUID } from "crypto";
import { pool } from "./db";
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
  stateScope: "fleet";
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

export interface StripeWebhookMonitoringState {
  consecutive5xxFailures: number;
  lastFailureAtMs: number | null;
  lastSuccessfulResponseAtMs: number | null;
  stalePendingCount: number;
  lastStalePendingEventIds: string[];
  monitoringCheckError: string | null;
}

interface StateMutationResult extends StripeWebhookMonitoringState {
  shouldAlert: boolean;
  previousCount: number;
}

export interface StripeWebhookMonitoringStore {
  read(): Promise<StripeWebhookMonitoringState>;
  recordFailure(nowMs: number): Promise<StateMutationResult>;
  recordSuccess(nowMs: number): Promise<StateMutationResult>;
  recordStaleEvents(count: number, eventIds: string[], nowMs: number): Promise<StateMutationResult>;
  recordCheckError(errorCode: string): Promise<StripeWebhookMonitoringState>;
}

type MonitoringRow = {
  consecutive_5xx_failures: number;
  last_failure_at: Date | null;
  last_successful_response_at: Date | null;
  stale_pending_count: number;
  last_stale_pending_event_ids: string[];
  monitoring_check_error: string | null;
  should_alert?: boolean;
  previous_count?: number;
};

const EMPTY_STATE: StripeWebhookMonitoringState = {
  consecutive5xxFailures: 0,
  lastFailureAtMs: null,
  lastSuccessfulResponseAtMs: null,
  stalePendingCount: 0,
  lastStalePendingEventIds: [],
  monitoringCheckError: null,
};

function fromRow(row: MonitoringRow | undefined): StripeWebhookMonitoringState {
  if (!row) throw new Error("Stripe webhook monitoring state row is missing");
  return {
    consecutive5xxFailures: row.consecutive_5xx_failures,
    lastFailureAtMs: row.last_failure_at?.getTime() ?? null,
    lastSuccessfulResponseAtMs: row.last_successful_response_at?.getTime() ?? null,
    stalePendingCount: row.stale_pending_count,
    lastStalePendingEventIds: row.last_stale_pending_event_ids ?? [],
    monitoringCheckError: row.monitoring_check_error,
  };
}

interface Queryable {
  query<T extends object>(text: string, values?: unknown[]): Promise<{ rows: T[] }>;
}

export function createPostgresStripeWebhookMonitoringStore(
  queryable: Queryable,
  tableName = "stripe_webhook_monitoring_state",
): StripeWebhookMonitoringStore {
  if (!/^[a-z_][a-z0-9_]*$/.test(tableName)) {
    throw new Error("Invalid Stripe webhook monitoring table name");
  }
  const table = `"${tableName}"`;

  return {
  async read() {
    const result = await queryable.query<MonitoringRow>(
      `SELECT * FROM ${table} WHERE id = 1`,
    );
    return fromRow(result.rows[0]);
  },

  async recordFailure(nowMs) {
    const now = new Date(nowMs);
    const alertClaimToken = randomUUID();
    const result = await queryable.query<MonitoringRow>(
      `INSERT INTO ${table} (
         id, consecutive_5xx_failures, last_failure_at,
         last_failure_alert_at, last_failure_alert_token
       ) VALUES (1, 1, $1, NULL, NULL)
       ON CONFLICT (id) DO UPDATE SET
         consecutive_5xx_failures = ${table}.consecutive_5xx_failures + 1,
         last_failure_at = $1,
         last_failure_alert_at = CASE
           WHEN ${table}.consecutive_5xx_failures + 1 >= $2
            AND (${table}.last_failure_alert_at IS NULL
              OR ${table}.last_failure_alert_at <= $1 - ($3 * interval '1 millisecond'))
           THEN $1 ELSE ${table}.last_failure_alert_at END,
         last_failure_alert_token = CASE
           WHEN ${table}.consecutive_5xx_failures + 1 >= $2
            AND (${table}.last_failure_alert_at IS NULL
              OR ${table}.last_failure_alert_at <= $1 - ($3 * interval '1 millisecond'))
           THEN $4 ELSE ${table}.last_failure_alert_token END
       RETURNING *,
         (last_failure_alert_token = $4) AS should_alert,
         GREATEST(consecutive_5xx_failures - 1, 0) AS previous_count`,
      [now, STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD, STRIPE_WEBHOOK_ALERT_COOLDOWN_MS, alertClaimToken],
    );
    const row = result.rows[0];
    return { ...fromRow(row), shouldAlert: row?.should_alert === true, previousCount: row?.previous_count ?? 0 };
  },

  async recordSuccess(nowMs) {
    const result = await queryable.query<MonitoringRow>(
      `INSERT INTO ${table} (
         id, consecutive_5xx_failures, last_successful_response_at,
         last_failure_alert_at, last_failure_alert_token
       ) VALUES (1, 0, $1, NULL, NULL)
       ON CONFLICT (id) DO UPDATE SET
         consecutive_5xx_failures = 0,
         last_successful_response_at = $1,
         last_failure_alert_at = NULL,
         last_failure_alert_token = NULL
       RETURNING *, false AS should_alert,
         0 AS previous_count`,
      [new Date(nowMs)],
    );
    const row = result.rows[0];
    return { ...fromRow(row), shouldAlert: false, previousCount: row?.previous_count ?? 0 };
  },

  async recordStaleEvents(count, eventIds, nowMs) {
    const alertClaimToken = randomUUID();
    const result = await queryable.query<MonitoringRow>(
      `INSERT INTO ${table} (
         id, stale_pending_count, last_stale_pending_event_ids,
         last_stale_alert_at, last_stale_alert_token, monitoring_check_error
       ) VALUES (
         1, $1, $2,
         CASE WHEN $1 > 0 THEN $3 ELSE NULL END,
         CASE WHEN $1 > 0 THEN $5 ELSE NULL END,
         NULL
       )
       ON CONFLICT (id) DO UPDATE SET
         stale_pending_count = $1,
         last_stale_pending_event_ids = $2,
         monitoring_check_error = NULL,
         last_stale_alert_at = CASE
           WHEN $1 > 0 AND (
             ${table}.stale_pending_count <> $1 OR ${table}.last_stale_alert_at IS NULL
             OR ${table}.last_stale_alert_at <= $3 - ($4 * interval '1 millisecond')
           ) THEN $3
           WHEN $1 = 0 THEN NULL
           ELSE ${table}.last_stale_alert_at END,
         last_stale_alert_token = CASE
           WHEN $1 > 0 AND (
             ${table}.stale_pending_count <> $1 OR ${table}.last_stale_alert_at IS NULL
             OR ${table}.last_stale_alert_at <= $3 - ($4 * interval '1 millisecond')
           ) THEN $5
           WHEN $1 = 0 THEN NULL
           ELSE ${table}.last_stale_alert_token END
       RETURNING *,
         ($1 > 0 AND last_stale_alert_token = $5) AS should_alert,
         0 AS previous_count`,
      [count, eventIds, new Date(nowMs), STRIPE_WEBHOOK_ALERT_COOLDOWN_MS, alertClaimToken],
    );
    const row = result.rows[0];
    return { ...fromRow(row), shouldAlert: row?.should_alert === true, previousCount: row?.previous_count ?? 0 };
  },

  async recordCheckError(errorCode) {
    const result = await queryable.query<MonitoringRow>(
      `INSERT INTO ${table} (id, monitoring_check_error)
       VALUES (1, $1)
       ON CONFLICT (id) DO UPDATE SET monitoring_check_error = EXCLUDED.monitoring_check_error
       RETURNING *`,
      [errorCode],
    );
    return fromRow(result.rows[0]);
  },
  };
}

const postgresStore = createPostgresStripeWebhookMonitoringStore(pool);

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

function toSnapshot(state: StripeWebhookMonitoringState): StripeWebhookHealthSnapshot {
  const reasons: string[] = [];
  if (state.consecutive5xxFailures >= STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD) reasons.push("consecutive_5xx_responses");
  if (state.stalePendingCount > 0) reasons.push("stale_pending_event_claims");
  if (state.monitoringCheckError) reasons.push("monitoring_check_failed");
  return {
    status: reasons.length > 0 ? "unhealthy" : "healthy",
    stateScope: "fleet",
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

export function createStripeWebhookMonitor(store: StripeWebhookMonitoringStore) {
  const unavailableState = (): StripeWebhookMonitoringState => ({
    ...EMPTY_STATE,
    lastStalePendingEventIds: [],
    monitoringCheckError: "shared_monitoring_state_unavailable",
  });
  const logStoreFailure = () => {
    logger.error(
      { failureReason: "shared_monitoring_state_unavailable", errorClass: "Error" },
      "[STRIPE-WEBHOOK-MONITOR] Shared monitoring state unavailable",
    );
  };

  return {
    async getHealthSnapshot() {
      try {
        return toSnapshot(await store.read());
      } catch {
        logStoreFailure();
        return toSnapshot(unavailableState());
      }
    },
    async recordSuccess(nowMs = Date.now()) {
      try {
        const result = await store.recordSuccess(nowMs);
        if (result.previousCount > 0) {
          logger.info({ previousConsecutive5xxFailures: result.previousCount }, "[STRIPE-WEBHOOK-MONITOR] Webhook 5xx streak recovered");
        }
        return toSnapshot(result);
      } catch {
        logStoreFailure();
        return toSnapshot(unavailableState());
      }
    },
    async recordFailure(context: StripeWebhookFailureContext, nowMs = Date.now()) {
      const responseClass = `${Math.floor(context.statusCode / 100)}xx`;
      const countsTowardOutage = context.statusCode >= 500 && context.statusCode < 600 && context.countsTowardOutage !== false;
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

      try {
        let state: StripeWebhookMonitoringState;
        if (countsTowardOutage) {
          const result = await store.recordFailure(nowMs);
          state = result;
          if (result.shouldAlert) {
            logger.error(
              { ...failure, alert: true, consecutive5xxFailures: result.consecutive5xxFailures, threshold: STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD },
              "[STRIPE-WEBHOOK-MONITOR] Consecutive HTTP 5xx threshold exceeded — operator attention required",
            );
          }
        } else if (context.statusCode < 500 || context.statusCode >= 600) {
          state = await store.recordSuccess(nowMs);
        } else {
          state = await store.read();
        }
        return toSnapshot(state);
      } catch {
        logStoreFailure();
        return toSnapshot(unavailableState());
      }
    },
    async checkHealth(readStalePendingEvents: () => Promise<readonly StaleStripePendingEvent[]>, nowMs = Date.now()) {
      try {
        const events = await readStalePendingEvents();
        const eventIds = events.slice(0, 10).map((event) => sanitizeStripeWebhookEventId(event.eventId));
        const result = await store.recordStaleEvents(events.length, eventIds, nowMs);
        if (result.shouldAlert) {
          const oldestClaimedAtMs = Math.min(...events.map((event) => event.processedAt.getTime()));
          logger.error(
            { alert: true, stalePendingCount: events.length, threshold: 1, eventIds, oldestClaimedAt: new Date(oldestClaimedAtMs).toISOString(), olderThanMinutes: STRIPE_WEBHOOK_STALE_PENDING_OLDER_THAN_MINUTES },
            "[STRIPE-WEBHOOK-MONITOR] Stale pending Stripe event claims detected — recovery required",
          );
        } else if (events.length === 0 && result.previousCount > 0) {
          logger.info({ previousStalePendingCount: result.previousCount }, "[STRIPE-WEBHOOK-MONITOR] Stale pending Stripe event claims cleared");
        }
        return toSnapshot(result);
      } catch (error) {
        logger.error({ failureReason: "stale_pending_check_failed", errorClass: getSafeErrorClass(error) }, "[STRIPE-WEBHOOK-MONITOR] Stale pending claim check failed");
        try {
          return toSnapshot(await store.recordCheckError("stale_pending_check_failed"));
        } catch {
          logStoreFailure();
          return toSnapshot(unavailableState());
        }
      }
    },
  };
}

const monitor = createStripeWebhookMonitor(postgresStore);

export const getStripeWebhookHealthSnapshot = monitor.getHealthSnapshot;
export const recordStripeWebhookSuccess = monitor.recordSuccess;
export const recordStripeWebhookFailure = monitor.recordFailure;
export const checkStripeWebhookHealth = monitor.checkHealth;

export function getStripeWebhookHealthHttpStatus(health: StripeWebhookHealthSnapshot): 200 | 503 {
  return health.status === "healthy" ? 200 : 503;
}