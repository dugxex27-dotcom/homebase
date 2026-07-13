import { describe, it, expect } from "vitest";
import { computeTourInit } from "./guided-tour-init";
import type { InitUser, WizardProgress } from "./guided-tour-init";

const homeowner: InitUser = { role: "homeowner", id: "user-123" };
const completedProgress: WizardProgress = { step: 10, completedAt: "2026-01-01T00:00:00Z", data: {} };
const pendingProgress: WizardProgress = { step: 3, completedAt: null, data: {} };
const inactiveStorage = () => JSON.stringify({ phase: "inactive", stepIndex: 0 });
const noStorage = () => null;

describe("computeTourInit — completedAt is authoritative", () => {
  it("returns already-complete when completedAt is set and localStorage is empty", () => {
    const result = computeTourInit(homeowner, completedProgress, noStorage);
    expect(result.kind).toBe("already-complete");
  });

  it("returns already-complete even when localStorage has a stale welcome state", () => {
    const stale = () => JSON.stringify({ phase: "welcome", stepIndex: 0 });
    const result = computeTourInit(homeowner, completedProgress, stale);
    expect(result.kind).toBe("already-complete");
  });

  it("returns already-complete even when localStorage has a stale tour state", () => {
    const stale = () => JSON.stringify({ phase: "tour", stepIndex: 2 });
    const result = computeTourInit(homeowner, completedProgress, stale);
    expect(result.kind).toBe("already-complete");
  });
});

describe("computeTourInit — first visit (no localStorage, not complete)", () => {
  it("returns welcome when completedAt is null and localStorage is empty", () => {
    const result = computeTourInit(homeowner, pendingProgress, noStorage);
    expect(result.kind).toBe("welcome");
  });
});

describe("computeTourInit — restores in-progress tour from localStorage", () => {
  it("returns restore with the stored state when phase is tour", () => {
    const stored = { phase: "tour" as const, stepIndex: 2 };
    const result = computeTourInit(homeowner, pendingProgress, () => JSON.stringify(stored));
    expect(result.kind).toBe("restore");
    if (result.kind === "restore") {
      expect(result.state).toEqual(stored);
    }
  });

  it("returns restore with the stored state when phase is welcome", () => {
    const stored = { phase: "welcome" as const, stepIndex: 0 };
    const result = computeTourInit(homeowner, pendingProgress, () => JSON.stringify(stored));
    expect(result.kind).toBe("restore");
  });

  it("returns already-complete when stored phase is inactive (optimistic completion signal)", () => {
    const result = computeTourInit(homeowner, pendingProgress, inactiveStorage);
    expect(result.kind).toBe("already-complete");
  });

  it("returns welcome when stored value is malformed JSON", () => {
    const result = computeTourInit(homeowner, pendingProgress, () => "not-json{{{");
    expect(result.kind).toBe("welcome");
  });
});

describe("computeTourInit — non-homeowner and demo users are skipped", () => {
  it("returns skip for a contractor user", () => {
    const contractor: InitUser = { role: "contractor", id: "c-1" };
    const result = computeTourInit(contractor, pendingProgress, noStorage);
    expect(result.kind).toBe("skip");
  });

  it("returns skip for a demo homeowner (id starts with demo-)", () => {
    const demo: InitUser = { role: "homeowner", id: "demo-abc" };
    const result = computeTourInit(demo, pendingProgress, noStorage);
    expect(result.kind).toBe("skip");
  });

  it("returns skip when user is null", () => {
    const result = computeTourInit(null, pendingProgress, noStorage);
    expect(result.kind).toBe("skip");
  });
});

describe("computeTourInit — still loading", () => {
  it("returns loading when wizardProgress is undefined", () => {
    const result = computeTourInit(homeowner, undefined, noStorage);
    expect(result.kind).toBe("loading");
  });
});

// ---------------------------------------------------------------------------
// Integration-level: complete → re-initialize round-trip
// ---------------------------------------------------------------------------

describe("complete → server stamp → reload (empty localStorage) → stays inactive", () => {
  it("does not reappear after a clean page reload: completedAt set, localStorage empty", () => {
    // Simulate: user finished tour, server stamped completedAt, browser cleared localStorage.
    const serverStamped: WizardProgress = { step: 10, completedAt: "2026-07-12T10:00:00Z", data: {} };
    const result = computeTourInit(homeowner, serverStamped, noStorage);
    expect(result.kind).toBe("already-complete");
  });

  it("does not reappear after reload when both server stamp and inactive localStorage are present", () => {
    const serverStamped: WizardProgress = { step: 10, completedAt: "2026-07-12T10:00:00Z", data: {} };
    const result = computeTourInit(homeowner, serverStamped, inactiveStorage);
    expect(result.kind).toBe("already-complete");
  });

  it("does not reappear when the wizard was completed mid-tour (stale tour state in localStorage)", () => {
    // User may have completed the tour on another device; local cache is behind.
    const serverStamped: WizardProgress = { step: 10, completedAt: "2026-07-12T10:00:00Z", data: {} };
    const midTour = () => JSON.stringify({ phase: "tour", stepIndex: 5 });
    const result = computeTourInit(homeowner, serverStamped, midTour);
    expect(result.kind).toBe("already-complete");
  });
});

describe("mutation fails path — optimistic localStorage prevents re-show", () => {
  it("does not reshow if the onboarding mutation failed but inactive was written to localStorage", () => {
    // Simulate: goNext() wrote inactive to localStorage, then both mutations threw.
    // Server still has completedAt === null. On next init (same browser, localStorage intact)
    // the tour must NOT reappear.
    const result = computeTourInit(homeowner, pendingProgress, inactiveStorage);
    expect(result.kind).toBe("already-complete");
  });

  it("shows welcome again only when both mutation failed AND localStorage was cleared (page reload)", () => {
    // This is the only scenario where the tour can legitimately reappear: the server has no
    // stamp AND the browser lost the optimistic cache. The user will see the welcome modal
    // and can skip to dismiss it permanently.
    const result = computeTourInit(homeowner, pendingProgress, noStorage);
    expect(result.kind).toBe("welcome");
  });

  it("still does not reshow if mutation failed and localStorage has inactive, even after role re-check", () => {
    // Belt-and-suspenders: ensure role filtering does not accidentally bypass inactive check.
    const nonDemoHomeowner: InitUser = { role: "homeowner", id: "real-user-99" };
    const result = computeTourInit(nonDemoHomeowner, pendingProgress, inactiveStorage);
    expect(result.kind).toBe("already-complete");
  });

  it("demo users are always skipped regardless of localStorage state", () => {
    const demo: InitUser = { role: "homeowner", id: "demo-xyz" };
    const result = computeTourInit(demo, pendingProgress, inactiveStorage);
    expect(result.kind).toBe("skip");
  });
});
