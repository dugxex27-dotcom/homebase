import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { Pool } from "pg";
import {
  runStep5Reconciliation,
  type ReconciliationTarget,
} from "./one-time-step5-account-reconciliation";

const runIntegration = process.env.RUN_STEP5_DATA_CORRECTION_TESTS === "1";
const describeIntegration = runIntegration ? describe : describe.skip;

const TARGETS: readonly [ReconciliationTarget, ReconciliationTarget] = [
  {
    label: "Account A",
    userId: "step5-reconciliation-fixture-a",
    stripeCustomerId: "cus_step5_fixture_a",
    stripeSubscriptionId: "sub_step5_fixture_a",
    expectedStatus: "active",
    correctedStatus: "active",
  },
  {
    label: "Account B",
    userId: "step5-reconciliation-fixture-b",
    stripeCustomerId: "cus_step5_fixture_b",
    stripeSubscriptionId: "sub_step5_fixture_b",
    expectedStatus: "trialing",
    correctedStatus: "active",
  },
];

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 2,
});

async function resetFixtures(): Promise<void> {
  await pool.query("DELETE FROM users WHERE id = ANY($1::text[])", [
    TARGETS.map((target) => target.userId),
  ]);
  await pool.query(
    `INSERT INTO users (
       id,
       role,
       stripe_customer_id,
       stripe_subscription_id,
       subscription_status,
       stripe_subscription_event_at,
       updated_at
     ) VALUES
       ($1, 'homeowner', $2, $3, 'active', NULL, '2026-01-01T00:00:00Z'),
       ($4, 'homeowner', $5, $6, 'trialing', NULL, '2026-01-01T00:00:00Z')`,
    [
      TARGETS[0].userId,
      TARGETS[0].stripeCustomerId,
      TARGETS[0].stripeSubscriptionId,
      TARGETS[1].userId,
      TARGETS[1].stripeCustomerId,
      TARGETS[1].stripeSubscriptionId,
    ],
  );
}

describeIntegration("one-time Step 5 account reconciliation", () => {
  beforeEach(resetFixtures);

  afterAll(async () => {
    await pool.query("DELETE FROM users WHERE id = ANY($1::text[])", [
      TARGETS.map((target) => target.userId),
    ]);
    await pool.end();
  });

  it("updates both matching accounts atomically", async () => {
    const client = await pool.connect();
    try {
      const result = await runStep5Reconciliation(client, TARGETS, true);
      expect(result.mode).toBe("execute");
      expect(result.correctionTimestamp).not.toBeNull();

      const accountA = result.after.find(
        (row) => row.id === TARGETS[0].userId,
      );
      const accountB = result.after.find(
        (row) => row.id === TARGETS[1].userId,
      );

      expect(accountA?.subscription_status).toBe("active");
      expect(accountB?.subscription_status).toBe("active");
      expect(accountA?.stripe_subscription_event_at).toEqual(
        result.correctionTimestamp,
      );
      expect(accountB?.stripe_subscription_event_at).toEqual(
        result.correctionTimestamp,
      );
      expect(accountA?.updated_at).toEqual(result.correctionTimestamp);
      expect(accountB?.updated_at).toEqual(result.correctionTimestamp);
    } finally {
      client.release();
    }
  });

  it("rolls back every change when either account misses a precondition", async () => {
    await pool.query(
      "UPDATE users SET subscription_status = 'inactive' WHERE id = $1",
      [TARGETS[1].userId],
    );

    const before = await pool.query(
      `SELECT id, subscription_status, stripe_subscription_event_at, updated_at
         FROM users
        WHERE id = ANY($1::text[])
        ORDER BY id`,
      [TARGETS.map((target) => target.userId)],
    );

    const client = await pool.connect();
    try {
      await expect(
        runStep5Reconciliation(client, TARGETS, true),
      ).rejects.toThrow("Account B status is inactive, expected trialing");
    } finally {
      client.release();
    }

    const after = await pool.query(
      `SELECT id, subscription_status, stripe_subscription_event_at, updated_at
         FROM users
        WHERE id = ANY($1::text[])
        ORDER BY id`,
      [TARGETS.map((target) => target.userId)],
    );
    expect(after.rows).toEqual(before.rows);
  });
});