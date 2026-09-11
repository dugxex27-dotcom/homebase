import { describe, expect, it } from "vitest";
import { getHomeWellnessScoreStatus } from "./home-wellness-score";

describe("getHomeWellnessScoreStatus", () => {
  it.each([
    [0, "#e03e3e", "Critical"],
    [1, "#e03e3e", "Critical"],
    [105, "#e03e3e", "Critical"],
    [399, "#e03e3e", "Critical"],
    [400, "#a3a51b", "Progressing"],
    [599, "#a3a51b", "Progressing"],
    [600, "#6da936", "Doing Well"],
    [799, "#6da936", "Doing Well"],
    [800, "#2f7d32", "Excellent"],
    [1000, "#2f7d32", "Excellent"],
  ])("maps a score of %i to the expected status", (score, color, label) => {
    expect(getHomeWellnessScoreStatus(score)).toEqual({ color, label });
  });
});