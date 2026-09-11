import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migrationPath = resolve(
  process.cwd(),
  "migrations/20260911-suspended-user-push-subscription-cleanup.sql",
);

describe("suspended user push-subscription cleanup migration", () => {
  it("selects blocked account subscriptions by their physical SQL column before deleting", () => {
    const sql = readFileSync(migrationPath, "utf8");

    expect(sql).toContain("WITH orphaned_subscriptions AS");
    expect(sql).toContain("owner.company_status IN ('suspended', 'removed')");
    expect(sql).toContain("DELETE FROM push_subscriptions");
    expect(sql).not.toMatch(/\bowner\.status\b/);
  });
});