export interface HomeWellnessScoreStatus {
  color: string;
  label: string;
}

/** The documented HWS scale. Keep this ordered highest-to-lowest. */
export const HOME_WELLNESS_SCORE_BANDS = [
  { minimumScore: 800, color: "#2f7d32", label: "Excellent" },
  { minimumScore: 600, color: "#6da936", label: "Doing Well" },
  { minimumScore: 400, color: "#a3a51b", label: "Progressing" },
  { minimumScore: 0, color: "#e03e3e", label: "Critical" },
] as const;

const GETTING_STARTED_STATUS: HomeWellnessScoreStatus = {
  color: "#9ca3af",
  label: "Getting Started",
};

export function getHomeWellnessScoreStatus(score: number): HomeWellnessScoreStatus {
  const normalizedScore = Math.max(0, Math.min(1000, score));
  const band = HOME_WELLNESS_SCORE_BANDS.find((candidate) => normalizedScore >= candidate.minimumScore);

  return band
    ? { color: band.color, label: band.label }
    : GETTING_STARTED_STATUS;
}