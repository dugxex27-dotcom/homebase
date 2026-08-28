import { describe, expect, it } from "vitest";
import { CONTRACTOR_TEAM_SIZE_OPTIONS } from "./contractor-onboarding";

describe("contractor onboarding team sizes", () => {
  it("caps the selectable team-size buckets at 50 people", () => {
    expect(CONTRACTOR_TEAM_SIZE_OPTIONS.map((option) => option.value)).toEqual([
      "just_me",
      "2_10",
      "11_25",
      "26_50",
    ]);
    expect(CONTRACTOR_TEAM_SIZE_OPTIONS.at(-1)?.label).toBe("26–50 people");
  });

  it("does not expose enterprise or contact-sales messaging", () => {
    const optionCopy = CONTRACTOR_TEAM_SIZE_OPTIONS
      .flatMap((option) => [option.value, option.label, option.sub, option.tier])
      .join(" ")
      .toLowerCase();

    expect(optionCopy).not.toContain("enterprise");
    expect(optionCopy).not.toContain("100_plus");
    expect(optionCopy).not.toContain("100+");
    expect(optionCopy).not.toContain("contact");
    expect(optionCopy).not.toContain("business plan");
  });
});