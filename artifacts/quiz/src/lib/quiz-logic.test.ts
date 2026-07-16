import { describe, it, expect } from "vitest";
import {
  QUESTIONS,
  MAX_SCORE,
  getTier,
  calculateScore,
  calculateResult,
} from "./quiz-logic";

const ALL_PERFECT = QUESTIONS.map(() => 3);
const ALL_ZERO = QUESTIONS.map(() => 0);
const ALL_MEDIUM = QUESTIONS.map(() => 2);
const ALL_LOW = QUESTIONS.map(() => 1);

describe("QUESTIONS", () => {
  it("has exactly 10 questions", () => {
    expect(QUESTIONS).toHaveLength(10);
  });

  it("every question has exactly 4 answer choices", () => {
    QUESTIONS.forEach((q, i) => {
      expect(q.answers, `Q${i + 1} (${q.text.slice(0, 30)}…)`).toHaveLength(4);
    });
  });

  it("every answer score is 0, 1, 2, or 3", () => {
    QUESTIONS.forEach((q, qi) => {
      q.answers.forEach((a, ai) => {
        expect([0, 1, 2, 3], `Q${qi + 1} answer ${ai}`).toContain(a.score);
      });
    });
  });

  it("answer scores within each question are in ascending order (0→3)", () => {
    QUESTIONS.forEach((q, i) => {
      const scores = q.answers.map((a) => a.score);
      expect(scores, `Q${i + 1} answer scores`).toEqual([0, 1, 2, 3]);
    });
  });

  it("all question weights are positive", () => {
    QUESTIONS.forEach((q, i) => {
      expect(q.weight, `Q${i + 1} weight`).toBeGreaterThan(0);
    });
  });
});

describe("MAX_SCORE", () => {
  it("equals the sum of (3 × weight) for all questions", () => {
    const expected = QUESTIONS.reduce((sum, q) => sum + 3 * q.weight, 0);
    expect(MAX_SCORE).toBe(expected);
  });

  it("is 69 based on the defined question weights", () => {
    expect(MAX_SCORE).toBe(69);
  });

  it("is positive", () => {
    expect(MAX_SCORE).toBeGreaterThan(0);
  });
});

describe("getTier", () => {
  it("returns 'Home Pro' at exactly 80%", () => {
    expect(getTier(80)).toBe("Home Pro");
  });

  it("returns 'Home Pro' at 100%", () => {
    expect(getTier(100)).toBe("Home Pro");
  });

  it("returns 'Home Pro' at 95%", () => {
    expect(getTier(95)).toBe("Home Pro");
  });

  it("returns 'Solid Foundation' at exactly 60%", () => {
    expect(getTier(60)).toBe("Solid Foundation");
  });

  it("returns 'Solid Foundation' at 79%", () => {
    expect(getTier(79)).toBe("Solid Foundation");
  });

  it("returns 'Solid Foundation' at 70%", () => {
    expect(getTier(70)).toBe("Solid Foundation");
  });

  it("returns 'Needs Attention' at exactly 40%", () => {
    expect(getTier(40)).toBe("Needs Attention");
  });

  it("returns 'Needs Attention' at 59%", () => {
    expect(getTier(59)).toBe("Needs Attention");
  });

  it("returns 'Needs Attention' at 50%", () => {
    expect(getTier(50)).toBe("Needs Attention");
  });

  it("returns 'High Risk' at 39%", () => {
    expect(getTier(39)).toBe("High Risk");
  });

  it("returns 'High Risk' at 0%", () => {
    expect(getTier(0)).toBe("High Risk");
  });

  it("returns 'High Risk' at 1%", () => {
    expect(getTier(1)).toBe("High Risk");
  });
});

describe("calculateScore", () => {
  it("returns 100 when every answer is perfect (score=3)", () => {
    expect(calculateScore(ALL_PERFECT)).toBe(100);
  });

  it("returns 0 when every answer is worst (score=0)", () => {
    expect(calculateScore(ALL_ZERO)).toBe(0);
  });

  it("returns a score in range [0, 100] for all-medium answers", () => {
    const score = calculateScore(ALL_MEDIUM);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns 67 for all-medium answers (score=2 each)", () => {
    const raw = QUESTIONS.reduce((sum, q) => sum + 2 * q.weight, 0);
    const expected = Math.round((raw / MAX_SCORE) * 100);
    expect(calculateScore(ALL_MEDIUM)).toBe(expected);
  });

  it("returns 33 for all-low answers (score=1 each)", () => {
    const raw = QUESTIONS.reduce((sum, q) => sum + 1 * q.weight, 0);
    const expected = Math.round((raw / MAX_SCORE) * 100);
    expect(calculateScore(ALL_LOW)).toBe(expected);
  });

  it("weighs high-weight questions more than low-weight questions", () => {
    const answersAllZeroExceptQ2 = QUESTIONS.map(() => 0);
    answersAllZeroExceptQ2[1] = 3;

    const answersAllZeroExceptQ10 = QUESTIONS.map(() => 0);
    answersAllZeroExceptQ10[9] = 3;

    const scoreHighWeight = calculateScore(answersAllZeroExceptQ2);
    const scoreLowWeight = calculateScore(answersAllZeroExceptQ10);

    expect(scoreHighWeight).toBeGreaterThan(scoreLowWeight);
  });

  it("throws when fewer than 10 answers are provided", () => {
    expect(() => calculateScore([3, 3, 3])).toThrow();
  });

  it("throws when more than 10 answers are provided", () => {
    expect(() => calculateScore([...ALL_PERFECT, 3])).toThrow();
  });

  it("produces monotonically increasing scores as all answers improve", () => {
    const scores = [0, 1, 2, 3].map((s) => calculateScore(QUESTIONS.map(() => s)));
    for (let i = 1; i < scores.length; i++) {
      expect(scores[i]).toBeGreaterThan(scores[i - 1]);
    }
  });
});

describe("calculateResult", () => {
  it("returns score=100 and tier='Home Pro' for perfect answers", () => {
    const result = calculateResult(ALL_PERFECT);
    expect(result.score).toBe(100);
    expect(result.tier).toBe("Home Pro");
  });

  it("returns score=0 and tier='High Risk' for all-zero answers", () => {
    const result = calculateResult(ALL_ZERO);
    expect(result.score).toBe(0);
    expect(result.tier).toBe("High Risk");
  });

  it("tier in result is consistent with getTier applied to the score", () => {
    for (const answers of [ALL_ZERO, ALL_LOW, ALL_MEDIUM, ALL_PERFECT]) {
      const result = calculateResult(answers);
      expect(result.tier).toBe(getTier(result.score));
    }
  });

  it("returns a result object with score and tier properties", () => {
    const result = calculateResult(ALL_PERFECT);
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("tier");
  });

  it("score is always an integer (no decimals)", () => {
    for (const answers of [ALL_ZERO, ALL_LOW, ALL_MEDIUM, ALL_PERFECT]) {
      const result = calculateResult(answers);
      expect(Number.isInteger(result.score)).toBe(true);
    }
  });
});
