/**
 * One-time guarded data correction for the two homeowner accounts affected by
 * missed Stripe webhook processing.
 *
 * Dry-run (default):
 *   pnpm --filter @workspace/api-server exec tsx src/one-time-step5-account-reconciliation.ts
 *
 * Execute against the DATABASE_URL provided to the process:
 *   pnpm --filter @workspace/api-server exec tsx src/one-time-step5-account-reconciliation.ts \
 *     --execute --confirm-step5-production
 *
 * This is a data correction, not a schema migration. The execute mode is
 * intentionally guarded by exact user/customer/subscription/status/watermark
 * preconditions and updates both rows in one transaction.
 */
import { pathToFileURL } from "node:url";
import { Pool, type PoolClient } from "pg";

export interface ReconciliationTarget {
  label: "Account A" | "Account B";
  userId: string;
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  expectedStatus: "active" | "trialing";
  correctedStatus: "active";
}

interface AccountRow {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  stripe_subscription_event_at: Date | null;
  updated_at: Date | null;
}

export const PRODUCTION_TARGETS: readonly [
  ReconciliationTarget,
  ReconciliationTarget,
] = [
  {
    label: "Account A",
    userId: "6ed0832d-6f6a-455c-abc2-a57c28540bbb",
    stripeCustomerId: "cus_Tn8fqDKYP9lagp",
    stripeSubscriptionId: "sub_1SpYsRQu2dH51kafaVoZtkRO",
    expectedStatus: "active",
    correctedStatus: "active",
  },
  {
    label: "Account B",
    userId: "2c1ebc5a-005e-4f9a-b889-94506b3d4c29",
    stripeCustomerId: "cus_V4S0kJlaCHhHnz",
    stripeSubscriptionId: "sub_1U4MyhQu2dH51kafo99GLPF4",
    expectedStatus: "trialing",
    correctedStatus: "active",
  },
];

export interface ReconciliationResult {
  mode: "dry-run" | "execute";
  correctionTimestamp: Date | null;
  before: AccountRow[];
  after: AccountRow[];
}

const ROW_PROJECTION = `
  id,
  stripe_customer_id,
  stripe_subscription_id,
  subscription_status,
  stripe_subscription_event_at,
  updated_at
`;

function assertTargetPreconditions(
  rows: AccountRow[],
  targets: readonly ReconciliationTarget[],
): void {
  if (rows.length !== targets.length) {
    throw new Error(
      `Precondition failed: expected ${targets.length} locked rows, found ${rows.length}`,
    );
  }

  for (const target of targets) {
    const row = rows.find((candidate) => candidate.id === target.userId);
    if (!row) {
      throw new Error(`Precondition failed: ${target.label} row was not found`);
    }
    if (row.stripe_customer_id !== target.stripeCustomerId) {
      throw new Error(
        `Precondition failed: ${target.label} Stripe customer does not match`,
      );
    }
    if (row.stripe_subscription_id !== target.stripeSubscriptionId) {
      throw new Error(
        `Precondition failed: ${target.label} Stripe subscription does not match`,
      );
    }
    if (row.subscription_status !== target.expectedStatus) {
      throw new Error(
        `Precondition failed: ${target.label} status is ${row.subscription_status ?? "NULL"}, expected ${target.expectedStatus}`,
      );
    }
    if (row.stripe_subscription_event_at !== null) {
      throw new Error(
        `Precondition failed: ${target.label} already has a Stripe event watermark`,
      );
    }
  }
}

async function readRows(
  client: PoolClient,
  targets: readonly ReconciliationTarget[],
  lock: boolean,
): Promise<AccountRow[]> {
  const result = await client.query<AccountRow>(
    `SELECT ${ROW_PROJECTION}
       FROM users
      WHERE id = ANY($1::text[])
      ORDER BY id
      ${lock ? "FOR UPDATE" : ""}`,
    [targets.map((target) => target.userId)],
  );
  return result.rows;
}

export async function runStep5Reconciliation(
  client: PoolClient,
  targets: readonly ReconciliationTarget[],
  execute: boolean,
): Promise<ReconciliationResult> {
  await client.query("BEGIN");
  try {
    const before = await readRows(client, targets, true);
    assertTargetPreconditions(before, targets);

    if (!execute) {
      await client.query("ROLLBACK");
      return {
        mode: "dry-run",
        correctionTimestamp: null,
        before,
        after: before,
      };
    }

    const timestampResult = await client.query<{ correction_at: Date }>(
      "SELECT CURRENT_TIMESTAMP AS correction_at",
    );
    const correctionTimestamp = timestampResult.rows[0]?.correction_at;
    if (!correctionTimestamp) {
      throw new Error("Could not obtain the database correction timestamp");
    }

    const accountA = targets.find((target) => target.label === "Account A");
    const accountB = targets.find((target) => target.label === "Account B");
    if (!accountA || !accountB) {
      throw new Error("Both Account A and Account B targets are required");
    }

    const accountAResult = await client.query(
      `UPDATE users
          SET stripe_subscription_event_at = $5,
              updated_at = $5
        WHERE id = $1
          AND stripe_customer_id = $2
          AND stripe_subscription_id = $3
          AND subscription_status = $4
          AND stripe_subscription_event_at IS NULL`,
      [
        accountA.userId,
        accountA.stripeCustomerId,
        accountA.stripeSubscriptionId,
        accountA.expectedStatus,
        correctionTimestamp,
      ],
    );

    const accountBResult = await client.query(
      `UPDATE users
          SET subscription_status = $5,
              stripe_subscription_event_at = $6,
              updated_at = $6
        WHERE id = $1
          AND stripe_customer_id = $2
          AND stripe_subscription_id = $3
          AND subscription_status = $4
          AND stripe_subscription_event_at IS NULL`,
      [
        accountB.userId,
        accountB.stripeCustomerId,
        accountB.stripeSubscriptionId,
        accountB.expectedStatus,
        accountB.correctedStatus,
        correctionTimestamp,
      ],
    );

    if (accountAResult.rowCount !== 1 || accountBResult.rowCount !== 1) {
      throw new Error(
        `Guarded update failed: Account A changed ${accountAResult.rowCount ?? 0} row(s); Account B changed ${accountBResult.rowCount ?? 0} row(s)`,
      );
    }

    await client.query("COMMIT");
    const after = await readRows(client, targets, false);
    return {
      mode: "execute",
      correctionTimestamp,
      before,
      after,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

function printableRow(row: AccountRow) {
  return {
    id: row.id,
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    stripeSubscriptionEventAt:
      row.stripe_subscription_event_at?.toISOString() ?? null,
    updatedAt: row.updated_at?.toISOString() ?? null,
  };
}

async function main(): Promise<void> {
  const execute = process.argv.includes("--execute");
  const confirmed = process.argv.includes("--confirm-step5-production");

  if (execute && !confirmed) {
    throw new Error(
      "Refusing to execute without --confirm-step5-production. Omit --execute for a dry-run.",
    );
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
  });
  const client = await pool.connect();
  try {
    const result = await runStep5Reconciliation(
      client,
      PRODUCTION_TARGETS,
      execute,
    );
    console.log(
      JSON.stringify(
        {
          mode: result.mode,
          correctionTimestamp:
            result.correctionTimestamp?.toISOString() ?? null,
          before: result.before.map(printableRow),
          after: result.after.map(printableRow),
          committed: result.mode === "execute",
        },
        null,
        2,
      ),
    );
  } finally {
    client.release();
    await pool.end();
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(process.argv[1]).href
  : null;
if (invokedPath === import.meta.url) {
  main().catch((error) => {
    console.error(
      JSON.stringify(
        {
          committed: false,
          error: error instanceof Error ? error.message : String(error),
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  });
}