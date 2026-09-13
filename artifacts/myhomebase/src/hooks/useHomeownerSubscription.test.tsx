import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "demo-homeowner-permanent-id", role: "homeowner" },
    isLoading: false,
  }),
}));

import { useHomeownerSubscription } from "./useHomeownerSubscription";

function wrapperWith(queryFn: () => Promise<unknown>) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, queryFn },
    },
  });

  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useHomeownerSubscription source of truth", () => {
  it("does not present an unresolved subscription as free", () => {
    const pending = new Promise<unknown>(() => {});
    const { result } = renderHook(() => useHomeownerSubscription(), {
      wrapper: wrapperWith(() => pending),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isError).toBe(false);
    expect(result.current.isFreeUser).toBe(false);
    expect(result.current.subscriptionStatus).toBe("unknown");
  });

  it("does not present a failed subscription request as free", async () => {
    const { result } = renderHook(() => useHomeownerSubscription(), {
      wrapper: wrapperWith(() => Promise.reject(new Error("unavailable"))),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isFreeUser).toBe(false);
    expect(result.current.subscriptionStatus).toBe("unknown");
  });

  it("uses the demo subscription response consistently as Premium+", async () => {
    const { result } = renderHook(() => useHomeownerSubscription(), {
      wrapper: wrapperWith(() => Promise.resolve({
        currentPlan: "premium_plus",
        maxHouses: "unlimited",
        currentHouses: 1,
        canAddHomes: true,
        isTrialing: false,
        trialDaysRemaining: 0,
        hasActiveSubscription: true,
        subscriptionStatus: "active",
        isDemoAccount: true,
      })),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isError).toBe(false);
    expect(result.current.currentPlan).toBe("premium_plus");
    expect(result.current.isPaidSubscriber).toBe(true);
    expect(result.current.currentHouses).toBe(1);
    expect(result.current.isFreeUser).toBe(false);
  });
});