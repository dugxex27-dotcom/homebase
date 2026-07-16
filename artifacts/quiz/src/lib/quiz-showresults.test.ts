import { describe, it, expect, beforeEach } from "vitest";
import {
  applyResultsToDOM,
  ResultElements,
  RING_COLOR_GOOD,
  RING_COLOR_IMPROVE,
  RING_CIRCUMFERENCE,
} from "./quiz-renderer";
import { TIER_DISPLAY } from "./quiz-logic";

function makeElements(): ResultElements {
  return {
    scoreNumber: { textContent: null },
    ringFill: { style: { strokeDashoffset: RING_CIRCUMFERENCE, stroke: "" } },
    scoreBarFill: { style: { width: "0%" }, className: "" },
    resultBadge: { textContent: null, className: "" },
    resultHeadline: { textContent: null },
    resultMsg: { textContent: null },
    quizWrap: { style: { display: "block" } },
    resultsCard: { style: { display: "none" } },
  };
}

describe("applyResultsToDOM — score number rendered in DOM", () => {
  it("sets scoreNumber.textContent to the computed pct (100)", () => {
    const el = makeElements();
    applyResultsToDOM(100, el);
    expect(el.scoreNumber.textContent).toBe("100");
  });

  it("sets scoreNumber.textContent to the computed pct (0)", () => {
    const el = makeElements();
    applyResultsToDOM(0, el);
    expect(el.scoreNumber.textContent).toBe("0");
  });

  it("sets scoreNumber.textContent to the computed pct (42)", () => {
    const el = makeElements();
    applyResultsToDOM(42, el);
    expect(el.scoreNumber.textContent).toBe("42");
  });

  it("sets scoreNumber.textContent to the computed pct (60)", () => {
    const el = makeElements();
    applyResultsToDOM(60, el);
    expect(el.scoreNumber.textContent).toBe("60");
  });
});

describe("applyResultsToDOM — badge text in DOM", () => {
  it("renders '🏠 Home Pro' badge text for score 100", () => {
    const el = makeElements();
    applyResultsToDOM(100, el);
    expect(el.resultBadge.textContent).toBe("🏠 Home Pro");
  });

  it("renders '🏠 Home Pro' badge text for score 80", () => {
    const el = makeElements();
    applyResultsToDOM(80, el);
    expect(el.resultBadge.textContent).toBe("🏠 Home Pro");
  });

  it("renders '👍 Solid Foundation' badge text for score 79", () => {
    const el = makeElements();
    applyResultsToDOM(79, el);
    expect(el.resultBadge.textContent).toBe("👍 Solid Foundation");
  });

  it("renders '👍 Solid Foundation' badge text for score 60", () => {
    const el = makeElements();
    applyResultsToDOM(60, el);
    expect(el.resultBadge.textContent).toBe("👍 Solid Foundation");
  });

  it("renders '⚠️ Needs Attention' badge text for score 59", () => {
    const el = makeElements();
    applyResultsToDOM(59, el);
    expect(el.resultBadge.textContent).toBe("⚠️ Needs Attention");
  });

  it("renders '⚠️ Needs Attention' badge text for score 40", () => {
    const el = makeElements();
    applyResultsToDOM(40, el);
    expect(el.resultBadge.textContent).toBe("⚠️ Needs Attention");
  });

  it("renders '🔴 High Risk' badge text for score 39", () => {
    const el = makeElements();
    applyResultsToDOM(39, el);
    expect(el.resultBadge.textContent).toBe("🔴 High Risk");
  });

  it("renders '🔴 High Risk' badge text for score 0", () => {
    const el = makeElements();
    applyResultsToDOM(0, el);
    expect(el.resultBadge.textContent).toBe("🔴 High Risk");
  });
});

describe("applyResultsToDOM — badge CSS class in DOM", () => {
  it("Home Pro (score 100) gets 'result-badge good' class", () => {
    const el = makeElements();
    applyResultsToDOM(100, el);
    expect(el.resultBadge.className).toBe("result-badge good");
  });

  it("Home Pro (score 80) gets 'result-badge good' class", () => {
    const el = makeElements();
    applyResultsToDOM(80, el);
    expect(el.resultBadge.className).toBe("result-badge good");
  });

  it("Solid Foundation (score 79) gets 'result-badge good' class", () => {
    const el = makeElements();
    applyResultsToDOM(79, el);
    expect(el.resultBadge.className).toBe("result-badge good");
  });

  it("Solid Foundation (score 60) gets 'result-badge good' class", () => {
    const el = makeElements();
    applyResultsToDOM(60, el);
    expect(el.resultBadge.className).toBe("result-badge good");
  });

  it("Needs Attention (score 59) gets 'result-badge improve' class", () => {
    const el = makeElements();
    applyResultsToDOM(59, el);
    expect(el.resultBadge.className).toBe("result-badge improve");
  });

  it("Needs Attention (score 40) gets 'result-badge improve' class", () => {
    const el = makeElements();
    applyResultsToDOM(40, el);
    expect(el.resultBadge.className).toBe("result-badge improve");
  });

  it("High Risk (score 39) gets 'result-badge improve' class", () => {
    const el = makeElements();
    applyResultsToDOM(39, el);
    expect(el.resultBadge.className).toBe("result-badge improve");
  });

  it("High Risk (score 0) gets 'result-badge improve' class", () => {
    const el = makeElements();
    applyResultsToDOM(0, el);
    expect(el.resultBadge.className).toBe("result-badge improve");
  });
});

describe("applyResultsToDOM — ring/bar colour class switches at 60% boundary", () => {
  it("scoreBarFill gets 'score-bar-fill good' class at score 60", () => {
    const el = makeElements();
    applyResultsToDOM(60, el);
    expect(el.scoreBarFill.className).toBe("score-bar-fill good");
  });

  it("scoreBarFill gets 'score-bar-fill good' class at score 100", () => {
    const el = makeElements();
    applyResultsToDOM(100, el);
    expect(el.scoreBarFill.className).toBe("score-bar-fill good");
  });

  it("scoreBarFill gets 'score-bar-fill improve' class at score 59", () => {
    const el = makeElements();
    applyResultsToDOM(59, el);
    expect(el.scoreBarFill.className).toBe("score-bar-fill improve");
  });

  it("scoreBarFill gets 'score-bar-fill improve' class at score 0", () => {
    const el = makeElements();
    applyResultsToDOM(0, el);
    expect(el.scoreBarFill.className).toBe("score-bar-fill improve");
  });

  it("60% is the exact switch: 59 → improve, 60 → good", () => {
    const below = makeElements();
    applyResultsToDOM(59, below);
    expect(below.scoreBarFill.className).toBe("score-bar-fill improve");

    const exact = makeElements();
    applyResultsToDOM(60, exact);
    expect(exact.scoreBarFill.className).toBe("score-bar-fill good");
  });

  it("ring stroke colour is RING_COLOR_GOOD (#2E7D5A) at score 60", () => {
    const el = makeElements();
    applyResultsToDOM(60, el);
    expect(el.ringFill.style.stroke).toBe(RING_COLOR_GOOD);
  });

  it("ring stroke colour is RING_COLOR_IMPROVE (#C05C1A) at score 59", () => {
    const el = makeElements();
    applyResultsToDOM(59, el);
    expect(el.ringFill.style.stroke).toBe(RING_COLOR_IMPROVE);
  });

  it("ring stroke colour is RING_COLOR_GOOD (#2E7D5A) at score 80", () => {
    const el = makeElements();
    applyResultsToDOM(80, el);
    expect(el.ringFill.style.stroke).toBe(RING_COLOR_GOOD);
  });

  it("ring stroke colour is RING_COLOR_IMPROVE (#C05C1A) at score 0", () => {
    const el = makeElements();
    applyResultsToDOM(0, el);
    expect(el.ringFill.style.stroke).toBe(RING_COLOR_IMPROVE);
  });
});

describe("applyResultsToDOM — ring arc offset matches score", () => {
  it("offset is 0 at score 100 (ring fully filled)", () => {
    const el = makeElements();
    applyResultsToDOM(100, el);
    expect(el.ringFill.style.strokeDashoffset).toBeCloseTo(0, 1);
  });

  it("offset equals RING_CIRCUMFERENCE at score 0 (ring empty)", () => {
    const el = makeElements();
    applyResultsToDOM(0, el);
    expect(el.ringFill.style.strokeDashoffset).toBeCloseTo(RING_CIRCUMFERENCE, 1);
  });

  it("offset is approximately half circumference at score 50", () => {
    const el = makeElements();
    applyResultsToDOM(50, el);
    expect(el.ringFill.style.strokeDashoffset as number).toBeCloseTo(
      RING_CIRCUMFERENCE / 2,
      0
    );
  });
});

describe("applyResultsToDOM — headline and message match TIER_DISPLAY", () => {
  it("renders Home Pro headline for score 100", () => {
    const el = makeElements();
    applyResultsToDOM(100, el);
    expect(el.resultHeadline.textContent).toBe(TIER_DISPLAY["Home Pro"].headline);
  });

  it("renders Solid Foundation headline for score 60", () => {
    const el = makeElements();
    applyResultsToDOM(60, el);
    expect(el.resultHeadline.textContent).toBe(
      TIER_DISPLAY["Solid Foundation"].headline
    );
  });

  it("renders Needs Attention headline for score 59", () => {
    const el = makeElements();
    applyResultsToDOM(59, el);
    expect(el.resultHeadline.textContent).toBe(
      TIER_DISPLAY["Needs Attention"].headline
    );
  });

  it("renders High Risk headline for score 0", () => {
    const el = makeElements();
    applyResultsToDOM(0, el);
    expect(el.resultHeadline.textContent).toBe(TIER_DISPLAY["High Risk"].headline);
  });

  it("renders Home Pro message for score 80", () => {
    const el = makeElements();
    applyResultsToDOM(80, el);
    expect(el.resultMsg.textContent).toBe(TIER_DISPLAY["Home Pro"].msg);
  });

  it("renders High Risk message for score 39", () => {
    const el = makeElements();
    applyResultsToDOM(39, el);
    expect(el.resultMsg.textContent).toBe(TIER_DISPLAY["High Risk"].msg);
  });
});

describe("applyResultsToDOM — visibility of quiz/result cards", () => {
  it("hides quizWrap and shows resultsCard", () => {
    const el = makeElements();
    applyResultsToDOM(75, el);
    expect(el.quizWrap.style.display).toBe("none");
    expect(el.resultsCard.style.display).toBe("block");
  });
});

describe("applyResultsToDOM — all four tiers produce consistent DOM output", () => {
  const cases = [
    { pct: 100, tier: "Home Pro", badgeClass: "result-badge good", colorClass: "good" },
    { pct: 80, tier: "Home Pro", badgeClass: "result-badge good", colorClass: "good" },
    { pct: 79, tier: "Solid Foundation", badgeClass: "result-badge good", colorClass: "good" },
    { pct: 60, tier: "Solid Foundation", badgeClass: "result-badge good", colorClass: "good" },
    { pct: 59, tier: "Needs Attention", badgeClass: "result-badge improve", colorClass: "improve" },
    { pct: 40, tier: "Needs Attention", badgeClass: "result-badge improve", colorClass: "improve" },
    { pct: 39, tier: "High Risk", badgeClass: "result-badge improve", colorClass: "improve" },
    { pct: 0, tier: "High Risk", badgeClass: "result-badge improve", colorClass: "improve" },
  ] as const;

  for (const { pct, tier, badgeClass, colorClass } of cases) {
    it(`score ${pct}% → badge class '${badgeClass}', bar class 'score-bar-fill ${colorClass}', score text '${pct}'`, () => {
      const el = makeElements();
      applyResultsToDOM(pct, el);

      expect(el.scoreNumber.textContent).toBe(String(pct));
      expect(el.resultBadge.className).toBe(badgeClass);
      expect(el.scoreBarFill.className).toBe("score-bar-fill " + colorClass);
      expect(el.resultHeadline.textContent).toBe(TIER_DISPLAY[tier].headline);
      expect(el.resultMsg.textContent).toBe(TIER_DISPLAY[tier].msg);
    });
  }
});
