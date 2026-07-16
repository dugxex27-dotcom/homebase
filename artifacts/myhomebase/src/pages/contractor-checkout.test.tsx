/**
 * Unit tests for the contractor-checkout page covering the auth-resolution race.
 *
 * Test 1 — delayed auth resolve:
 *   When `user` is null on mount and becomes non-null later the CheckoutModal
 *   must open (via the useEffect that watches `user`).
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
  useLocation: () => ["/contractor-checkout", vi.fn()],
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock("@/lib/nativeBrowser", () => ({
  isNativePlatform: false,
  openPaymentUrl: vi.fn(),
  onBackButton: () => () => {},
  onAppStateChange: () => () => {},
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: vi.fn(),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useMutation: vi.fn(() => ({
      mutate: vi.fn(),
      isPending: false,
      isError: false,
    })),
  };
});

vi.mock("@/components/CheckoutModal", () => ({
  CheckoutModal: ({ plan }: { plan: string; trialMode: boolean; onClose: () => void }) => (
    <div data-testid="checkout-modal" data-plan={plan}>Checkout Modal</div>
  ),
}));

// ---------------------------------------------------------------------------
// Subject under test — imported after all mocks are registered
// ---------------------------------------------------------------------------

import ContractorCheckout from "./contractor-checkout";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  authFlags.user = null;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("ContractorCheckout — delayed auth resolve", () => {
  it("opens the checkout modal when user resolves after initial render", async () => {
    // Render with null user — should show the loading spinner, not the modal.
    const { rerender } = render(<ContractorCheckout />);

    expect(screen.queryByTestId("checkout-modal")).toBeNull();
    expect(screen.getByText(/preparing your checkout/i)).toBeTruthy();

    // Simulate auth resolving: update flag and re-render.
    authFlags.user = { id: "ctr-001", role: "contractor" };

    await act(async () => {
      rerender(<ContractorCheckout />);
    });

    expect(screen.getByTestId("checkout-modal")).toBeTruthy();
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

    expect(screen.queryByText(/taking too long/i)).toBeNull();
    expect(screen.getByTestId("checkout-modal")).toBeTruthy();
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
