/**
 * Real-Postgres proof for fleet-wide Stripe webhook monitoring.
 *
 * The unit suite models independent processes with an in-memory store. These
 * tests exercise the actual upsert, row serialization, and alert-claim SQL.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "crypto";
import { pool } from "./db";
import {
  createPostgresStripeWebhookMonitoringStore,
  STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD,
} from "./stripe-webhook-monitoring";

const tableName = `stripe_webhook_monitor_test_${randomUUID().replaceAll("-", "")}`;

describe("Stripe webhook monitoring PostgreSQL concurrency", () => {
  beforeAll(async () => {
    await pool.query(`
      CREATE TABLE "${tableName}" (
        id integer PRIMARY KEY CHECK (id = 1),
        consecutive_5xx_failures integer NOT NULL DEFAULT 0,
        last_failure_at timestamptz,
        last_successful_response_at timestamptz,
        last_failure_alert_at timestamptz,
        last_failure_alert_token text,
        stale_pending_count integer NOT NULL DEFAULT 0,
        last_stale_pending_event_ids text[] NOT NULL DEFAULT '{}',
        last_stale_alert_at timestamptz,
        last_stale_alert_token text,
        monitoring_check_error text
      )
    `);
  });

  afterAll(async () => {
    await pool.query(`DROP TABLE IF EXISTS "${tableName}"`);
  });

  it("seeds a missing row and atomically aggregates simultaneous instances", async () => {
    const processA = createPostgresStripeWebhookMonitoringStore(pool, tableName);
    const processB = createPostgresStripeWebhookMonitoringStore(pool, tableName);
    const nowMs = Date.parse("2026-09-07T12:00:00.000Z");

    const results = await Promise.all([
      processA.recordFailure(nowMs),
      processB.recordFailure(nowMs),
      processA.recordFailure(nowMs),
      processB.recordFailure(nowMs),
    ]);

    expect(results.filter((result) => result.shouldAlert)).toHaveLength(1);
    const state = await processA.read();
    expect(state.consecutive5xxFailures).toBe(4);
    expect(state.consecutive5xxFailures).toBeGreaterThanOrEqual(
      STRIPE_WEBHOOK_5XX_ALERT_THRESHOLD,
    );
  });

  it("does not report healthy before the shared singleton exists", async () => {
    await pool.query(`DELETE FROM "${tableName}"`);
    const store = createPostgresStripeWebhookMonitoringStore(pool, tableName);
    await expect(store.read()).rejects.toThrow("state row is missing");
  });
});