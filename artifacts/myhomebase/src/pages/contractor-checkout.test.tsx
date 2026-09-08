/**
 * Unit tests for the contractor-checkout page covering the auth-resolution race.
 *
 * Test 1 — delayed auth resolve:
 *   When `user` is null on mount and becomes non-null later, checkoutMutation.mutate()
 *   must be called (via the useEffect that watches `user`). No modal is shown —
 *   the component redirects to Stripe-hosted checkout directly.
 *
 * Test 2 — 10 s auth timeout:
 *   When `user` stays null for 10 000 ms the component renders the
 *   "Taking too long to load" error state with the retry button.
 *
 * Test 3 — retry button calls window.location.reload:
 *   Clicking the "Try again" button inside the timeout error state must call
 *   window.location.reload().
 *
 * All external dependencies are mocked so tests run without a server.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";

// ---------------------------------------------------------------------------
// Hoisted mutable flags — set before any module is processed by vi.mock
// ---------------------------------------------------------------------------

const authFlags = vi.hoisted(() => ({
  user: null as { id: string; role: string } | null,
}));
const nativeFlags = vi.hoisted(() => ({
  isNative: false,
  isPending: false,
}));
const setLocationSpy = vi.hoisted(() => vi.fn());

// ---------------------------------------------------------------------------
// Module mocks — must appear before subject import
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: authFlags.user,
    isLoading: authFlags.user === null,
    isAuthenticated: authFlags.user !== null,
  }),
}));

vi.mock("wouter", () => ({
  useLocation: () => ["/contractor-checkout", setLocationSpy],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/nativeBrowser", () => ({
  get isNativePlatform() {
    return nativeFlags.isNative;
  },
  openPaymentUrl: vi.fn(),
  onBackButton: () => () => {},
  onAppStateChange: () => () => {},
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

const mutateSpy = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: vi.fn(() => ({
      mutate: mutateSpy,
      get isPending() {
        return nativeFlags.isPending;
      },
      isError: false,
    })),
  };
});

// ---------------------------------------------------------------------------
// Subject under test — imported after all mocks are registered
// ---------------------------------------------------------------------------

import ContractorCheckout from "./contractor-checkout";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  authFlags.user = null;
  nativeFlags.isNative = false;
  nativeFlags.isPending = false;
  mutateSpy.mockClear();
  setLocationSpy.mockClear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("ContractorCheckout — delayed auth resolve", () => {
  it("calls mutate() when user resolves after initial render", async () => {
    // Render with null user — should show the loading spinner, mutate not called yet.
    const { rerender } = render(<ContractorCheckout />);

    expect(mutateSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/preparing your checkout/i)).toBeTruthy();

    // Simulate auth resolving: update flag and re-render.
    authFlags.user = { id: "ctr-001", role: "contractor" };

    await act(async () => {
      rerender(<ContractorCheckout />);
    });

    // The useEffect fires mutate() to start the hosted Stripe checkout redirect.
    expect(mutateSpy).toHaveBeenCalledTimes(1);
    // Loading spinner still visible while mutation is in flight.
    expect(screen.getByText(/preparing your checkout/i)).toBeTruthy();
  });
});

describe("ContractorCheckout — 10 s auth timeout", () => {
  it("shows the AuthTimedOut error state after 10 000 ms with null user", async () => {
    render(<ContractorCheckout />);

    // Before timeout: still shows loading spinner.
    expect(screen.queryByText(/taking too long/i)).toBeNull();

    // Advance fake timers past the 10 s threshold.
    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });

    expect(screen.getByText(/taking too long to load/i)).toBeTruthy();
    expect(screen.getByTestId("button-retry-auth")).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("does NOT show the timeout state when user resolves before 10 s", async () => {
    render(<ContractorCheckout />);

    // User resolves at 5 s — well within the timeout window.
    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    authFlags.user = { id: "ctr-001", role: "contractor" };

    await act(async () => {
      // Re-render with resolved user so useEffect re-runs.
      cleanup();
      render(<ContractorCheckout />);
    });

    // Timeout error state must not appear.
    expect(screen.queryByText(/taking too long/i)).toBeNull();
    // mutate() was called to kick off the hosted checkout redirect.
    expect(mutateSpy).toHaveBeenCalledTimes(1);
  });
});

describe("ContractorCheckout — retry button", () => {
  it("calls window.location.reload when the retry button is clicked", async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadSpy, search: "" },
      writable: true,
      configurable: true,
    });

    render(<ContractorCheckout />);

    // Advance past the timeout.
    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });

    const retryButton = screen.getByTestId("button-retry-auth");
    fireEvent.click(retryButton);

    expect(reloadSpy).toHaveBeenCalledTimes(1);
  });
});

describe("ContractorCheckout — timeout escape actions", () => {
  it("navigates to contractor sign in from the auth timeout state", async () => {
    render(<ContractorCheckout />);

    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));

    expect(setLocationSpy).toHaveBeenCalledWith("/signin/contractor");
  });

  it("shows the native checkout timeout after a mutation stays pending for 10 seconds", async () => {
    authFlags.user = { id: "ctr-001", role: "contractor" };
    nativeFlags.isNative = true;
    nativeFlags.isPending = true;

    render(<ContractorCheckout />);

    expect(screen.queryByText(/taking too long to load/i)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });

    expect(screen.getByText(/couldn't start your checkout session in time/i)).toBeTruthy();
    expect(screen.getByTestId("button-retry-native-checkout")).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("reloads or navigates to sign in from the native checkout timeout state", async () => {
    const reloadSpy = vi.fn();
    Object.defineProperty(window, "location", {
      value: { reload: reloadSpy, search: "" },
      writable: true,
      configurable: true,
    });
    authFlags.user = { id: "ctr-001", role: "contractor" };
    nativeFlags.isNative = true;
    nativeFlags.isPending = true;

    render(<ContractorCheckout />);

    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });

    fireEvent.click(screen.getByTestId("button-retry-native-checkout"));
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /sign in/i }));
    expect(setLocationSpy).toHaveBeenCalledWith("/signin/contractor");
  });
});
