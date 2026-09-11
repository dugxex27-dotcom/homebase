import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_SESSION_EXPIRED_EVENT } from "@/lib/auth-events";
import { HOMEOWNER_TOUR_STATE_KEY } from "./guided-tour-init";
import { GuidedTour } from "./guided-tour";

const homeowner = { id: "homeowner-1", role: "homeowner" };
let currentUser: typeof homeowner | null = homeowner;
const wizardProgress = { step: 3, completedAt: null, data: {} };
const setLocation = vi.fn();
const invalidateQueries = vi.fn();
const mutate = vi.fn();

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: currentUser, isLoading: false }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/", setLocation],
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries }),
    useMutation: () => ({ mutate }),
    useQuery: ({ queryKey }: { queryKey: string[] }) => ({
      data: queryKey[0] === "/api/homeowner/wizard-progress"
        ? wizardProgress
        : null,
    }),
  };
});

describe("GuidedTour session expiry", () => {
  beforeEach(() => {
    currentUser = homeowner;
    localStorage.clear();
    localStorage.setItem(
      HOMEOWNER_TOUR_STATE_KEY,
      JSON.stringify({ phase: "tour", stepIndex: 0 }),
    );
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("suppresses a mid-tour state before redirect and stays hidden after remount", async () => {
    const firstMount = render(<GuidedTour />);
    await screen.findByText("Your Home Wellness Score™");

    act(() => {
      window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
    });

    expect(JSON.parse(localStorage.getItem(HOMEOWNER_TOUR_STATE_KEY)!)).toEqual({
      phase: "inactive",
      stepIndex: 0,
    });
    await waitFor(() => {
      expect(screen.queryByText("Your Home Wellness Score™")).not.toBeInTheDocument();
    });

    firstMount.unmount();
    render(<GuidedTour />);

    await waitFor(() => {
      expect(screen.queryByText("Welcome to MyHomeBase™")).not.toBeInTheDocument();
      expect(screen.queryByText("Continue your setup tour where you left off")).not.toBeInTheDocument();
      expect(screen.queryByText("Your Home Wellness Score™")).not.toBeInTheDocument();
    });
  });

  it("suppresses a mid-tour state when the authenticated homeowner disappears", async () => {
    const view = render(<GuidedTour />);
    await screen.findByText("Your Home Wellness Score™");

    currentUser = null;
    view.rerender(<GuidedTour />);

    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(HOMEOWNER_TOUR_STATE_KEY)!)).toEqual({
        phase: "inactive",
        stepIndex: 0,
      });
      expect(screen.queryByText("Your Home Wellness Score™")).not.toBeInTheDocument();
    });
  });
});