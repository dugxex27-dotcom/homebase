export interface HomeWellnessScoreStatus {
  color: string;
  label: string;
}

const SCORE_STATUS_BANDS = [
  { minimumScore: 750, color: "#2f7d32", label: "Excellent" },
  { minimumScore: 550, color: "#6da936", label: "Doing Well" },
  { minimumScore: 350, color: "#a3a51b", label: "Progressing" },
  { minimumScore: 150, color: "#e87920", label: "Building Momentum" },
  { minimumScore: 1, color: "#e03e3e", label: "Just Starting Out" },
] as const;

const GETTING_STARTED_STATUS: HomeWellnessScoreStatus = {
  color: "#9ca3af",
  label: "Getting Started",
};

export function getHomeWellnessScoreStatus(score: number): HomeWellnessScoreStatus {
  if (score <= 0) {
    return GETTING_STARTED_STATUS;
  }

  const band = SCORE_STATUS_BANDS.find((candidate) => score >= candidate.minimumScore);

  return band
    ? { color: band.color, label: band.label }
    : GETTING_STARTED_STATUS;
}