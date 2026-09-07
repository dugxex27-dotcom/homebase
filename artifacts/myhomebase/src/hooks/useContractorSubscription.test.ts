import { describe, expect, it } from "vitest";
import { resolveDivisionAccess } from "./useContractorSubscription";

describe("resolveDivisionAccess", () => {
  it("shows divisions to a paid contractor without a historical company tier", () => {
    expect(
      resolveDivisionAccess({
        hasActiveSubscription: true,
        needsSubscription: false,
      }),
    ).toBe(true);
  });

  it("shows divisions to demo contractors without a paid subscription", () => {
    expect(
      resolveDivisionAccess({
        isDemoAccount: true,
        hasActiveSubscription: false,
        needsSubscription: true,
      }),
    ).toBe(true);
  });

  it("honors the server entitlement when it is present", () => {
    expect(
      resolveDivisionAccess({
        hasDivisions: false,
        hasActiveSubscription: true,
        needsSubscription: false,
      }),
    ).toBe(false);
  });

  it("keeps divisions hidden when subscription access is unresolved", () => {
    expect(
      resolveDivisionAccess({
        hasActiveSubscription: false,
        needsSubscription: true,
      }),
    ).toBe(false);
  });
});