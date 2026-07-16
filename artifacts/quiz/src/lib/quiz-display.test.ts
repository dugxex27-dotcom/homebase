import { describe, it, expect } from "vitest";
import { getResultDisplay, TIER_DISPLAY } from "./quiz-logic";

describe("TIER_DISPLAY", () => {
  it("Home Pro has badge class 'result-badge good'", () => {
    expect(TIER_DISPLAY["Home Pro"].badgeClass).toBe("result-badge good");
  });

  it("Solid Foundation has badge class 'result-badge good'", () => {
    expect(TIER_DISPLAY["Solid Foundation"].badgeClass).toBe("result-badge good");
  });

  it("Needs Attention has badge class 'result-badge improve'", () => {
    expect(TIER_DISPLAY["Needs Attention"].badgeClass).toBe("result-badge improve");
  });

  it("High Risk has badge class 'result-badge improve'", () => {
    expect(TIER_DISPLAY["High Risk"].badgeClass).toBe("result-badge improve");
  });

  it("every tier has a non-empty headline", () => {
    for (const tier of ["Home Pro", "Solid Foundation", "Needs Attention", "High Risk"] as const) {
      expect(TIER_DISPLAY[tier].headline.length).toBeGreaterThan(0);
    }
  });

  it("every tier has a non-empty msg", () => {
    for (const tier of ["Home Pro", "Solid Foundation", "Needs Attention", "High Risk"] as const) {
      expect(TIER_DISPLAY[tier].msg.length).toBeGreaterThan(0);
    }
  });

  it("every tier has a non-empty emoji", () => {
    for (const tier of ["Home Pro", "Solid Foundation", "Needs Attention", "High Risk"] as const) {
      expect(TIER_DISPLAY[tier].emoji.length).toBeGreaterThan(0);
    }
  });
});

describe("getResultDisplay — score number", () => {
  it("scoreText equals the pct passed in (as string)", () => {
    expect(getResultDisplay(100).scoreText).toBe("100");
    expect(getResultDisplay(0).scoreText).toBe("0");
    expect(getResultDisplay(75).scoreText).toBe("75");
    expect(getResultDisplay(42).scoreText).toBe("42");
  });
});

describe("getResultDisplay — badge text", () => {
  it("shows '🏠 Home Pro' badge for 100%", () => {
    expect(getResultDisplay(100).badgeText).toBe("🏠 Home Pro");
  });

  it("shows '🏠 Home Pro' badge for 80%", () => {
    expect(getResultDisplay(80).badgeText).toBe("🏠 Home Pro");
  });

  it("shows '👍 Solid Foundation' badge for 79%", () => {
    expect(getResultDisplay(79).badgeText).toBe("👍 Solid Foundation");
  });

  it("shows '👍 Solid Foundation' badge for 60%", () => {
    expect(getResultDisplay(60).badgeText).toBe("👍 Solid Foundation");
  });

  it("shows '⚠️ Needs Attention' badge for 59%", () => {
    expect(getResultDisplay(59).badgeText).toBe("⚠️ Needs Attention");
  });

  it("shows '⚠️ Needs Attention' badge for 40%", () => {
    expect(getResultDisplay(40).badgeText).toBe("⚠️ Needs Attention");
  });

  it("shows '🔴 High Risk' badge for 39%", () => {
    expect(getResultDisplay(39).badgeText).toBe("🔴 High Risk");
  });

  it("shows '🔴 High Risk' badge for 0%", () => {
    expect(getResultDisplay(0).badgeText).toBe("🔴 High Risk");
  });
});

describe("getResultDisplay — badge class", () => {
  it("Home Pro gets 'result-badge good' class", () => {
    expect(getResultDisplay(100).badgeClass).toBe("result-badge good");
    expect(getResultDisplay(80).badgeClass).toBe("result-badge good");
  });

  it("Solid Foundation gets 'result-badge good' class", () => {
    expect(getResultDisplay(79).badgeClass).toBe("result-badge good");
    expect(getResultDisplay(60).badgeClass).toBe("result-badge good");
  });

  it("Needs Attention gets 'result-badge improve' class", () => {
    expect(getResultDisplay(59).badgeClass).toBe("result-badge improve");
    expect(getResultDisplay(40).badgeClass).toBe("result-badge improve");
  });

  it("High Risk gets 'result-badge improve' class", () => {
    expect(getResultDisplay(39).badgeClass).toBe("result-badge improve");
    expect(getResultDisplay(0).badgeClass).toBe("result-badge improve");
  });
});

describe("getResultDisplay — ring/bar colour class (good vs improve at 60% boundary)", () => {
  it("colorClass is 'good' at exactly 60%", () => {
    expect(getResultDisplay(60).colorClass).toBe("good");
  });

  it("colorClass is 'good' above 60%", () => {
    expect(getResultDisplay(61).colorClass).toBe("good");
    expect(getResultDisplay(79).colorClass).toBe("good");
    expect(getResultDisplay(80).colorClass).toBe("good");
    expect(getResultDisplay(100).colorClass).toBe("good");
  });

  it("colorClass is 'improve' at 59%", () => {
    expect(getResultDisplay(59).colorClass).toBe("improve");
  });

  it("colorClass is 'improve' below 60%", () => {
    expect(getResultDisplay(58).colorClass).toBe("improve");
    expect(getResultDisplay(40).colorClass).toBe("improve");
    expect(getResultDisplay(39).colorClass).toBe("improve");
    expect(getResultDisplay(0).colorClass).toBe("improve");
  });

  it("60% is the exact switching point — 59 is improve, 60 is good", () => {
    expect(getResultDisplay(59).colorClass).toBe("improve");
    expect(getResultDisplay(60).colorClass).toBe("good");
  });
});

describe("getResultDisplay — headline", () => {
  it("Home Pro headline matches TIER_DISPLAY", () => {
    expect(getResultDisplay(100).headline).toBe(TIER_DISPLAY["Home Pro"].headline);
    expect(getResultDisplay(80).headline).toBe(TIER_DISPLAY["Home Pro"].headline);
  });

  it("Solid Foundation headline matches TIER_DISPLAY", () => {
    expect(getResultDisplay(60).headline).toBe(TIER_DISPLAY["Solid Foundation"].headline);
    expect(getResultDisplay(70).headline).toBe(TIER_DISPLAY["Solid Foundation"].headline);
  });

  it("Needs Attention headline matches TIER_DISPLAY", () => {
    expect(getResultDisplay(40).headline).toBe(TIER_DISPLAY["Needs Attention"].headline);
    expect(getResultDisplay(50).headline).toBe(TIER_DISPLAY["Needs Attention"].headline);
  });

  it("High Risk headline matches TIER_DISPLAY", () => {
    expect(getResultDisplay(0).headline).toBe(TIER_DISPLAY["High Risk"].headline);
    expect(getResultDisplay(39).headline).toBe(TIER_DISPLAY["High Risk"].headline);
  });
});

describe("getResultDisplay — msg", () => {
  it("Home Pro msg matches TIER_DISPLAY", () => {
    expect(getResultDisplay(100).msg).toBe(TIER_DISPLAY["Home Pro"].msg);
  });

  it("Solid Foundation msg matches TIER_DISPLAY", () => {
    expect(getResultDisplay(60).msg).toBe(TIER_DISPLAY["Solid Foundation"].msg);
  });

  it("Needs Attention msg matches TIER_DISPLAY", () => {
    expect(getResultDisplay(40).msg).toBe(TIER_DISPLAY["Needs Attention"].msg);
  });

  it("High Risk msg matches TIER_DISPLAY", () => {
    expect(getResultDisplay(0).msg).toBe(TIER_DISPLAY["High Risk"].msg);
  });
});

describe("getResultDisplay — DOM rendering contract (showResults integration)", () => {
  it("all fields needed to populate the result card are present", () => {
    const display = getResultDisplay(75);
    expect(display).toHaveProperty("scoreText");
    expect(display).toHaveProperty("badgeText");
    expect(display).toHaveProperty("badgeClass");
    expect(display).toHaveProperty("headline");
    expect(display).toHaveProperty("msg");
    expect(display).toHaveProperty("colorClass");
  });

  it("scoreBarFill class would be 'score-bar-fill good' for 75% score", () => {
    const { colorClass } = getResultDisplay(75);
    const barClass = "score-bar-fill " + colorClass;
    expect(barClass).toBe("score-bar-fill good");
  });

  it("scoreBarFill class would be 'score-bar-fill improve' for 45% score", () => {
    const { colorClass } = getResultDisplay(45);
    const barClass = "score-bar-fill " + colorClass;
    expect(barClass).toBe("score-bar-fill improve");
  });

  it("badgeText contains both the emoji and the tier name", () => {
    for (const pct of [0, 39, 40, 59, 60, 79, 80, 100]) {
      const { badgeText } = getResultDisplay(pct);
      expect(badgeText.length).toBeGreaterThan(3);
      expect(badgeText).toContain(" ");
    }
  });
});
