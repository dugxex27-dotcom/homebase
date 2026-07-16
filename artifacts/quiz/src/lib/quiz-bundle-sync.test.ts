import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "fs";
import { runInNewContext } from "vm";
import path from "path";
import { QUESTIONS, MAX_SCORE, getTier } from "./quiz-logic";

interface BundleExports {
  QUESTIONS: typeof QUESTIONS;
  MAX_SCORE: number;
  getTier: typeof getTier;
}

describe("quiz-logic.js bundle sync", () => {
  let bundle: BundleExports;

  beforeAll(() => {
    const bundlePath = path.resolve(
      import.meta.dirname,
      "../../public/quiz-logic.js",
    );
    const src = readFileSync(bundlePath, "utf8");
    const ctx: Record<string, unknown> = {};
    runInNewContext(src, ctx);
    bundle = ctx.MhbQuiz as BundleExports;
  });

  it(
    "QUESTIONS matches quiz-logic.ts — run 'pnpm run build:logic' if this fails",
    () => {
      expect(bundle.QUESTIONS).toEqual(QUESTIONS);
    },
  );

  it("MAX_SCORE matches quiz-logic.ts", () => {
    expect(bundle.MAX_SCORE).toBe(MAX_SCORE);
  });

  it("getTier thresholds match quiz-logic.ts at all tier boundaries", () => {
    const testPoints = [0, 1, 39, 40, 59, 60, 79, 80, 95, 100];
    for (const pct of testPoints) {
      expect(bundle.getTier(pct), `getTier(${pct})`).toBe(getTier(pct));
    }
  });
});
