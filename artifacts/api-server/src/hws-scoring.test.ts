import { describe, expect, it } from "vitest";
import {
  calculateHwsScore,
  HWS_ALL_SELF_REPORTED_SOFT_CAP,
  HWS_SELF_REPORTED_TASK_POINTS,
  HWS_VERIFIED_TASK_POINTS,
  getHwsScoreBand,
} from "./hws-scoring";

const HOUSE_WITHOUT_DOCUMENTATION_BONUS = {
  roofInstalledYear: null,
  hvacInstalledYear: null,
  waterHeaterInstalledYear: null,
  homeSystems: [],
};

describe("calculateHwsScore", () => {
  it.each([
    [0, "Critical"],
    [105, "Critical"],
    [399, "Critical"],
    [400, "Progressing"],
    [600, "Doing Well"],
    [800, "Excellent"],
    [1000, "Excellent"],
  ])("uses the documented score band for %i", (score, band) => {
    expect(getHwsScoreBand(score)).toBe(band);
  });

  it("scores photo_verified exactly like contractor_verified", () => {
    const contractor = calculateHwsScore(
      [{ verificationTier: "contractor_verified" }],
      HOUSE_WITHOUT_DOCUMENTATION_BONUS,
    );
    const photo = calculateHwsScore(
      [{ verificationTier: "photo_verified" }],
      HOUSE_WITHOUT_DOCUMENTATION_BONUS,
    );

    expect(contractor.score).toBe(HWS_VERIFIED_TASK_POINTS);
    expect(photo.score).toBe(contractor.score);
    expect(photo.photoVerifiedCount).toBe(1);
    expect(photo.contractorVerifiedCount).toBe(0);
    expect(photo.selfReportedCount).toBe(0);
  });

  it("preserves self-reported weighting for explicit and legacy tiers", () => {
    const result = calculateHwsScore(
      [
        { verificationTier: "self_reported" },
        { verificationTier: null },
        {},
      ],
      HOUSE_WITHOUT_DOCUMENTATION_BONUS,
    );

    expect(result.rawTaskScore).toBe(3 * HWS_SELF_REPORTED_TASK_POINTS);
    expect(result.selfReportedCount).toBe(3);
    expect(result.verifiedCount).toBe(0);
    expect(result.allSelfReported).toBe(true);
  });

  it("preserves the all-self-reported soft cap", () => {
    const result = calculateHwsScore(
      Array.from({ length: 40 }, () => ({ verificationTier: "self_reported" })),
      HOUSE_WITHOUT_DOCUMENTATION_BONUS,
    );

    expect(result.rawTaskScore).toBeGreaterThan(HWS_ALL_SELF_REPORTED_SOFT_CAP);
    expect(result.taskScore).toBe(HWS_ALL_SELF_REPORTED_SOFT_CAP);
    expect(result.score).toBe(HWS_ALL_SELF_REPORTED_SOFT_CAP);
  });

  it("preserves the rolling-window split while scoring an in-window photo verification", () => {
    const now = new Date("2026-08-29T12:00:00Z");
    const result = calculateHwsScore(
      [
        { year: 2026, month: 8, verificationTier: "photo_verified" },
        { year: 2024, month: 1, verificationTier: "contractor_verified" },
      ],
      HOUSE_WITHOUT_DOCUMENTATION_BONUS,
      { rollingWindowMonths: 12, now },
    );

    expect(result.score).toBe(HWS_VERIFIED_TASK_POINTS);
    expect(result.scoringCount).toBe(1);
    expect(result.historicalCount).toBe(1);
    expect(result.photoVerifiedCount).toBe(1);
  });

  it("preserves the additive mechanical documentation bonus", () => {
    const result = calculateHwsScore(
      [{ verificationTier: "photo_verified" }],
      {
        ...HOUSE_WITHOUT_DOCUMENTATION_BONUS,
        homeSystems: ["roof", "hvac"],
      },
    );

    expect(result.documentationBonus).toBe(4);
    expect(result.score).toBe(HWS_VERIFIED_TASK_POINTS + 4);
  });
});