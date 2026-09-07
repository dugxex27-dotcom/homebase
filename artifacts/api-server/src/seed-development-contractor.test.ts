import { afterEach, describe, expect, it } from "vitest";
import { canSeedDevelopmentContractor } from "./seed-development-contractor";

describe("development contractor fixture guard", () => {
  afterEach(() => {
    delete process.env.NODE_ENV;
    delete process.env.REPLIT_DEPLOYMENT;
  });

  it("allows local development and test environments", () => {
    expect(canSeedDevelopmentContractor({ NODE_ENV: "development" })).toBe(true);
    expect(canSeedDevelopmentContractor({ NODE_ENV: "test" })).toBe(true);
  });

  it("never seeds in production or a Replit deployment", () => {
    expect(canSeedDevelopmentContractor({ NODE_ENV: "production" })).toBe(false);
    expect(
      canSeedDevelopmentContractor({
        NODE_ENV: "development",
        REPLIT_DEPLOYMENT: "1",
      }),
    ).toBe(false);
  });
});