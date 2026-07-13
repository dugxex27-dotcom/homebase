export interface TourState {
  phase: "welcome" | "tour" | "inactive";
  stepIndex: number;
}

export interface InitUser {
  role: string;
  id?: string;
}

export interface WizardProgress {
  step: number;
  completedAt: string | null;
  data: object;
}

export type TourInitOutcome =
  | { kind: "skip" }
  | { kind: "loading" }
  | { kind: "already-complete" }
  | { kind: "welcome" }
  | { kind: "restore"; state: TourState };

/**
 * computeTourInit — pure function that determines how the guided tour should
 * initialise on mount.  `wizardProgress.completedAt` is always authoritative:
 *
 * - Returns "loading"          while wizardProgress is undefined (server not yet resolved).
 * - Returns "already-complete" when the server confirms completedAt is set.
 * - Returns "restore"          when localStorage has an in-progress tour/welcome state.
 * - Returns "welcome"          on a fresh first visit (no completedAt, no stored state).
 * - Returns "skip"             for non-homeowners and demo users.
 *
 * Anti-flash suppression (optimistic suppress sentinel) lives in the *component*,
 * not here, so this function stays purely server-authoritative.
 */
export function computeTourInit(
  user: InitUser | null | undefined,
  wizardProgress: WizardProgress | undefined,
  getStoredState: () => string | null,
): TourInitOutcome {
  if (!user || user.role !== "homeowner" || user.id?.startsWith("demo-")) {
    return { kind: "skip" };
  }

  if (wizardProgress === undefined) {
    return { kind: "loading" };
  }

  if (wizardProgress.completedAt) {
    return { kind: "already-complete" };
  }

  const saved = getStoredState();
  if (saved) {
    try {
      const parsed = JSON.parse(saved) as TourState;
      if (parsed.phase === "tour" || parsed.phase === "welcome") {
        return { kind: "restore", state: parsed };
      }
      // "inactive" in localStorage means the user finished (or skipped) the tour
      // optimistically. Honor it even if the server mutation is still in-flight or
      // failed, so the tour never reappears in the same browser.
      if (parsed.phase === "inactive") {
        return { kind: "already-complete" };
      }
    } catch {
    }
  }

  return { kind: "welcome" };
}
