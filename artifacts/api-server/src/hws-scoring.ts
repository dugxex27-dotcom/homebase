import type { MaintenanceVerificationTier } from "@workspace/db";
import { calculateMechanicalDocumentationBonus } from "./shared/maintenance-scheduler";

export const HWS_VERIFIED_TASK_POINTS = 4;
export const HWS_SELF_REPORTED_TASK_POINTS = 2.4;
export const HWS_ALL_SELF_REPORTED_SOFT_CAP = 85;
export const HWS_MAX_SCORE = 1000;

export type HwsScoreBand = "Critical" | "Progressing" | "Doing Well" | "Excellent";

/** Canonical score labels; mirrors the frontend helper and documented 0–1000 scale. */
export function getHwsScoreBand(score: number): HwsScoreBand {
  const normalized = Math.max(0, Math.min(HWS_MAX_SCORE, score));
  if (normalized >= 800) return "Excellent";
  if (normalized >= 600) return "Doing Well";
  if (normalized >= 400) return "Progressing";
  return "Critical";
}

export type HwsScoringCompletion = {
  year?: number | null;
  month?: number | null;
  verificationTier?: MaintenanceVerificationTier | string | null;
};

export type HwsScoringHouse = Parameters<typeof calculateMechanicalDocumentationBonus>[0];

export type HwsScoringOptions = {
  /**
   * When provided, only completions at or after the inclusive calendar-month
   * cutoff contribute points. Omit this option for consumers that historically
   * score all completions.
   */
  rollingWindowMonths?: number;
  now?: Date;
};

export type HwsScoringResult<T extends HwsScoringCompletion> = {
  score: number;
  rawTaskScore: number;
  taskScore: number;
  documentationBonus: number;
  scoringCompletions: T[];
  historicalCompletions: T[];
  scoringCount: number;
  historicalCount: number;
  contractorVerifiedCount: number;
  photoVerifiedCount: number;
  verifiedCount: number;
  selfReportedCount: number;
  allSelfReported: boolean;
};

function absoluteMonth(completion: HwsScoringCompletion): number {
  return Number(completion.year) * 12 + Number(completion.month);
}

/**
 * Canonical Home Wellness Score calculation shared by every HWS-style
 * consumer. Unknown and legacy tiers intentionally retain self-reported
 * weighting. Photo-verified and contractor-verified completions receive the
 * same verified-task point value while remaining separately countable.
 */
export function calculateHwsScore<T extends HwsScoringCompletion>(
  completions: readonly T[],
  house: HwsScoringHouse,
  options: HwsScoringOptions = {},
): HwsScoringResult<T> {
  const { rollingWindowMonths, now = new Date() } = options;

  let scoringCompletions: T[];
  let historicalCompletions: T[];

  if (rollingWindowMonths === undefined) {
    scoringCompletions = [...completions];
    historicalCompletions = [];
  } else {
    const currentAbsoluteMonth = now.getFullYear() * 12 + (now.getMonth() + 1);
    const cutoffAbsoluteMonth = currentAbsoluteMonth - rollingWindowMonths;
    scoringCompletions = completions.filter(
      (completion) => absoluteMonth(completion) >= cutoffAbsoluteMonth,
    );
    historicalCompletions = completions.filter(
      (completion) => absoluteMonth(completion) < cutoffAbsoluteMonth,
    );
  }

  const contractorVerifiedCount = scoringCompletions.filter(
    (completion) => completion.verificationTier === "contractor_verified",
  ).length;
  const photoVerifiedCount = scoringCompletions.filter(
    (completion) => completion.verificationTier === "photo_verified",
  ).length;
  const verifiedCount = contractorVerifiedCount + photoVerifiedCount;
  const scoringCount = scoringCompletions.length;
  const selfReportedCount = scoringCount - verifiedCount;

  const rawTaskScore =
    verifiedCount * HWS_VERIFIED_TASK_POINTS
    + selfReportedCount * HWS_SELF_REPORTED_TASK_POINTS;
  const allSelfReported = scoringCount > 0 && verifiedCount === 0;
  const taskScore = allSelfReported
    ? Math.min(rawTaskScore, HWS_ALL_SELF_REPORTED_SOFT_CAP)
    : rawTaskScore;
  const documentationBonus = calculateMechanicalDocumentationBonus(house);

  return {
    // Scores are always on the documented 0–1000 scale.
    score: Math.min(HWS_MAX_SCORE, Math.max(0, Math.round(taskScore + documentationBonus))),
    rawTaskScore,
    taskScore,
    documentationBonus,
    scoringCompletions,
    historicalCompletions,
    scoringCount,
    historicalCount: historicalCompletions.length,
    contractorVerifiedCount,
    photoVerifiedCount,
    verifiedCount,
    selfReportedCount,
    allSelfReported,
  };
}