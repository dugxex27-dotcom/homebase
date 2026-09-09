import { describe, expect, it } from "vitest";
import { shouldRunStartupMigrations } from "./migrate";

describe("startup migration environment guard", () => {
  it("allows migrations in local development and test environments", () => {
    expect(shouldRunStartupMigrations({ NODE_ENV: "development" })).toBe(true);
    expect(shouldRunStartupMigrations({ NODE_ENV: "test" })).toBe(true);
  });

  it("blocks migrations for either production signal", () => {
    expect(shouldRunStartupMigrations({ NODE_ENV: "production" })).toBe(false);
    expect(
      shouldRunStartupMigrations({
        NODE_ENV: "development",
        REPLIT_DEPLOYMENT: "1",
      }),
    ).toBe(false);
  });
});