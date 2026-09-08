/**
 * Unit tests for contractor checkout auth resolution, request failures,
 * native checkout startup, and timeout recovery actions.
 *
 * All external dependencies are mocked so tests run without a server.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";

const authFlags = vi.hoisted(() => ({
  user: null as { id: string; role: string } | null,
}));

const nativeFlags = vi.hoisted(() => ({
  isNative: false,
  isPending: false,
}));

const setLocationSpy = vi.hoisted(() => vi.fn());
const mutateSpy = vi.hoisted(() => vi.fn());

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

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  const React = await import("react");

  return {
    ...actual,
    useMutation: vi.fn((options: {
      mutationFn: () => Promise<unknown>;
      onSuccess?: (data: any) => void | Promise<void>;
      onError?: (error: Error) => void;
    }) => {
      const [isPending, setIsPending] = React.useState(false);
      const mutate = () => {
        mutateSpy();
        setIsPending(true);
        void options.mutationFn()
          .then((data) => options.onSuccess?.(data))
          .catch((error) => options.onError?.(error))
          .finally(() => setIsPending(false));
      };

      return {
        mutate,
        isPending: nativeFlags.isPending || isPending,
        isError: false,
      };
    }),
  };
});

import ContractorCheckout from "./contractor-checkout";
import { openPaymentUrl } from "@/lib/nativeBrowser";
import { apiRequest } from "@/lib/queryClient";

beforeEach(() => {
  authFlags.user = null;
  nativeFlags.isNative = false;
  nativeFlags.isPending = false;
  mutateSpy.mockClear();
  setLocationSpy.mockClear();
  vi.mocked(openPaymentUrl).mockClear();
  vi.mocked(apiRequest).mockReset();
  vi.mocked(apiRequest).mockResolvedValue({
    json: async () => ({}),
  } as Response);
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  cleanup();
});

describe("ContractorCheckout — delayed auth resolve", () => {
  it("calls mutate() when user resolves after initial render", async () => {
    const { rerender } = render(<ContractorCheckout />);

    expect(mutateSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/preparing your checkout/i)).toBeTruthy();

    authFlags.user = { id: "ctr-001", role: "contractor" };

    await act(async () => {
      rerender(<ContractorCheckout />);
    });

    expect(mutateSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/preparing your checkout/i)).toBeTruthy();
  });
});

describe("ContractorCheckout — 10 s auth timeout", () => {
  it("shows the auth timeout state after 10 seconds with no user", async () => {
    render(<ContractorCheckout />);

    expect(screen.queryByText(/taking too long/i)).toBeNull();

    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });

    expect(screen.getByText(/taking too long to load/i)).toBeTruthy();
    expect(screen.getByTestId("button-retry-auth")).toBeTruthy();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeTruthy();
  });

  it("does not show the timeout state when user resolves before 10 seconds", async () => {
    render(<ContractorCheckout />);

    await act(async () => {
      vi.advanceTimersByTime(5_000);
    });

    authFlags.user = { id: "ctr-001", role: "contractor" };

    await act(async () => {
      cleanup();
      render(<ContractorCheckout />);
    });

    expect(screen.queryByText(/taking too long/i)).toBeNull();
    expect(mutateSpy).toHaveBeenCalledTimes(1);
  });
});

describe("ContractorCheckout — checkout failure", () => {
  it("shows the checkout error state and starts a fresh request on retry", async () => {
    vi.mocked(apiRequest)
      .mockRejectedValueOnce(new Error("Stripe session failed"))
      .mockResolvedValueOnce({ json: async () => ({}) } as Response)
      .mockResolvedValueOnce({ json: async () => ({}) } as Response);
    authFlags.user = { id: "ctr-001", role: "contractor" };

    render(<ContractorCheckout />);

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(screen.getByText("Checkout didn't load")).toBeTruthy();
    const retryButton = screen.getByTestId("button-retry-checkout");

    await act(async () => {
      fireEvent.click(retryButton);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mutateSpy).toHaveBeenCalledTimes(2);
    const checkoutCalls = vi.mocked(apiRequest).mock.calls.filter(
      ([path]) => path === "/api/create-subscription-checkout",
    );
    expect(checkoutCalls).toHaveLength(2);
    expect(checkoutCalls[0]?.[1]).toBe("POST");
    expect(checkoutCalls[0]?.[2]).toEqual(expect.objectContaining({ plan: "basic" }));
  });
});

describe("ContractorCheckout — native checkout", () => {
  it("starts checkout when the user resolves and opens the returned URL natively", async () => {
    vi.mocked(apiRequest).mockResolvedValue({
      json: async () => ({ url: "https://checkout.stripe.test/session" }),
    } as Response);
    nativeFlags.isNative = true;
    const { rerender } = render(<ContractorCheckout />);

    authFlags.user = { id: "ctr-001", role: "contractor" };
    await act(async () => {
      rerender(<ContractorCheckout />);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mutateSpy).toHaveBeenCalledTimes(1);
    const checkoutCalls = vi.mocked(apiRequest).mock.calls.filter(
      ([path]) => path === "/api/create-subscription-checkout",
    );
    expect(checkoutCalls).toHaveLength(1);
    expect(checkoutCalls[0]?.[1]).toBe("POST");
    expect(checkoutCalls[0]?.[2]).toEqual(expect.objectContaining({ plan: "basic" }));
    expect(openPaymentUrl).toHaveBeenCalledWith("https://checkout.stripe.test/session");
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

    await act(async () => {
      vi.advanceTimersByTime(10_001);
    });

    fireEvent.click(screen.getByTestId("button-retry-auth"));

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