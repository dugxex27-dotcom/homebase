/**
 * Real-Postgres coverage for Stripe webhook deduplication persistence.
 *
 * The route integration suite mocks storage. These tests intentionally use the
 * actual stripe_processed_events table so schema, column, and timestamp-query
 * regressions are caught before Stripe retries reach production.
 */
import { randomUUID } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { inArray } from "drizzle-orm";
import { stripeProcessedEvents } from "@workspace/db";
import { db } from "./db";
import { storage } from "./storage";

const fixtureEventIds = new Set<string>();

function eventId(label: string): string {
  const id = `evt_dedup_db_${label}_${randomUUID()}`;
  fixtureEventIds.add(id);
  return id;
}

async function insertEvent(
  stripeEventId: string,
  status: "pending" | "committed" | "failed",
  processedAt: Date,
) {
  await db.insert(stripeProcessedEvents).values({
    stripeEventId,
    status,
    processedAt,
    updatedAt: processedAt,
  });
}

async function readFixtures(...stripeEventIds: string[]) {
  return db
    .select()
    .from(stripeProcessedEvents)
    .where(inArray(stripeProcessedEvents.stripeEventId, stripeEventIds));
}

async function cleanupFixtures() {
  if (fixtureEventIds.size === 0) return;
  await db
    .delete(stripeProcessedEvents)
    .where(inArray(stripeProcessedEvents.stripeEventId, [...fixtureEventIds]));
  fixtureEventIds.clear();
}

afterEach(cleanupFixtures);

describe.skipIf(!process.env.TEST_DATABASE_URL)(
  "Stripe webhook dedup storage — real PostgreSQL",
  () => {
  it("rejects a duplicate while its pending row is fresh", async () => {
    const id = eventId("pending");
    await insertEvent(id, "pending", new Date());

    await expect(storage.hasProcessedStripeEvent(id)).resolves.toBe(true);
  });

  it("rejects a duplicate after its row is committed", async () => {
    const id = eventId("committed");
    await insertEvent(id, "committed", new Date(Date.now() - 60 * 60 * 1000));

    await expect(storage.hasProcessedStripeEvent(id)).resolves.toBe(true);
  });

  it("allows a retry when its pending row is older than five minutes", async () => {
    const id = eventId("stale_pending");
    await insertEvent(id, "pending", new Date(Date.now() - 6 * 60 * 1000));

    await expect(storage.hasProcessedStripeEvent(id)).resolves.toBe(false);
  });

  it("marks only pending rows older than thirty minutes as failed", async () => {
    const staleId = eventId("fail_stale");
    const freshId = eventId("keep_fresh");
    const committedId = eventId("keep_committed");
    await insertEvent(staleId, "pending", new Date(Date.now() - 31 * 60 * 1000));
    await insertEvent(freshId, "pending", new Date(Date.now() - 29 * 60 * 1000));
    await insertEvent(committedId, "committed", new Date(Date.now() - 31 * 60 * 1000));

    const result = await storage.failStaleStripePendingEvents();

    expect(result.updated).toBeGreaterThanOrEqual(1);
    const rows = await readFixtures(staleId, freshId, committedId);
    const statusById = new Map(rows.map((row) => [row.stripeEventId, row.status]));
    expect(statusById.get(staleId)).toBe("failed");
    expect(statusById.get(freshId)).toBe("pending");
    expect(statusById.get(committedId)).toBe("committed");
  });

  it("prunes rows beyond the TTL while preserving newer rows", async () => {
    const expiredId = eventId("prune_expired");
    const retainedId = eventId("prune_retained");
    await insertEvent(expiredId, "committed", new Date(Date.now() - 25 * 60 * 60 * 1000));
    await insertEvent(retainedId, "committed", new Date(Date.now() - 23 * 60 * 60 * 1000));

    const result = await storage.pruneOldStripeProcessedEvents(24);

    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(result.remaining).toBeGreaterThanOrEqual(1);
    const rows = await readFixtures(expiredId, retainedId);
    expect(rows.map((row) => row.stripeEventId)).toEqual([retainedId]);
  });
  },
);