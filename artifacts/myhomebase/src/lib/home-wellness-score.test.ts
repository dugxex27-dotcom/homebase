import { describe, expect, it } from "vitest";
import { getHomeWellnessScoreStatus } from "./home-wellness-score";

describe("getHomeWellnessScoreStatus", () => {
  it.each([
    [0, "#9ca3af", "Getting Started"],
    [64, "#e03e3e", "Just Starting Out"],
    [150, "#e87920", "Building Momentum"],
    [350, "#a3a51b", "Progressing"],
    [550, "#6da936", "Doing Well"],
    [750, "#2f7d32", "Excellent"],
    [1000, "#2f7d32", "Excellent"],
  ])("maps a score of %i to the expected status", (score, color, label) => {
    expect(getHomeWellnessScoreStatus(score)).toEqual({ color, label });
  });
});