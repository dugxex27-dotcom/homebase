/**
 * Unit tests for ActivatingPlanBanner
 *
 * Verifies that:
 *   1. The banner appears when a user with a stripeCustomerId has an inactive
 *      subscription.
 *   2. The banner disappears **automatically** — without clicking "Refresh now"
 *      — when the fast-poll cycle returns active status after one poll interval.
 *   3. The fast-poll queries (/api/auth/user, /api/user,
 *      /api/contractor/subscription) are actively refetching during the
 *      activation window.
 *   4. Polling stops once the status transitions to active and the banner
 *      unmounts.
 *
 * Strategy:
 *   - Real @tanstack/react-query with a fresh QueryClient per test,
 *     wrapped in QueryClientProvider, so observer-merging and the
 *     refetchInterval mechanism work as they do in production.
 *   - useAuth is NOT mocked — it uses the real useQuery(["/api/auth/user"])
 *     which picks up the cache updates driven by the polling cycle.
 *   - Only the network layer (getQueryFn from @/lib/queryClient) is mocked
 *     so tests run without a real server.
 *   - vi.useFakeTimers() + vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS)
 *     simulates one complete fast-poll cycle, proving the timer-driven
 *     refetch is what causes the banner to unmount — not a manual rerender.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, cleanup, act, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// Hoisted mutable state — must be before all vi.mock() calls
// ---------------------------------------------------------------------------

const network = vi.hoisted(() => ({
  /** Responses keyed by query path. Tests mutate this to drive status changes. */
  responses: {
    "/api/auth/user": null as null | Record<string, unknown>,
    "/api/user": null as null | Record<string, unknown>,
    "/api/contractor/subscription": null as null | Record<string, unknown>,
  } as Record<string, unknown>,

  /**
   * Call counter per query key — incremented every time the queryFn fires.
   * Used to prove the fast-poll actually triggered a real refetch, not just
   * a state injection.
   */
  callCounts: {
    "/api/auth/user": 0,
    "/api/user": 0,
    "/api/contractor/subscription": 0,
  } as Record<string, number>,
}));

// ---------------------------------------------------------------------------
// Mock only the network layer — React Query itself is NOT mocked
// ---------------------------------------------------------------------------

vi.mock("@/lib/queryClient", () => ({
  /**
   * A deterministic queryFn factory: each call increments the key's counter
   * then returns whatever is currently in network.responses for that key.
   * Tests change network.responses to drive status transitions.
   */
  getQueryFn: vi.fn((_opts: { on401: string }) =>
    async ({ queryKey }: { queryKey: readonly unknown[] }) => {
      const key = queryKey[0] as string;
      if (key in network.callCounts) {
        network.callCounts[key]++;
      }
      return network.responses[key] ?? null;
    }
  ),

  /** Not used by this component, but exported by the real module. */
  apiRequest: vi.fn(),

  /** Minimal stand-in so anything importing queryClient doesn't crash. */
  queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
}));

// ---------------------------------------------------------------------------
// Import subject AFTER all vi.mock() calls
// ---------------------------------------------------------------------------

import { ActivatingPlanBanner } from "./activating-plan-banner";

// ---------------------------------------------------------------------------
// Constants (must match component source)
// ---------------------------------------------------------------------------

const FAST_POLL_INTERVAL_MS = 5_000;
const MAX_FAST_POLL_MS = 60_000;

// ---------------------------------------------------------------------------
// Test QueryClient factory
//
// staleTime: 0  — every pre-seeded entry is immediately stale so the first
//   background refetch fires without waiting for a timer.
// retry: false  — no retry noise in test output.
// gcTime: Infinity — keeps observers alive for the duration of a test.
// ---------------------------------------------------------------------------

function makeTestClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        refetchOnWindowFocus: false,
        gcTime: Infinity,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Render helper — wraps the banner in a real QueryClientProvider
// ---------------------------------------------------------------------------

function renderBanner(client: QueryClient) {
  return render(
    <QueryClientProvider client={client}>
      <ActivatingPlanBanner />
    </QueryClientProvider>
  );
}

// ---------------------------------------------------------------------------
// Setup helpers for common scenarios
// ---------------------------------------------------------------------------

function seedInactiveHomeowner(client: QueryClient) {
  const user = {
    id: "user-001",
    role: "homeowner",
    stripeCustomerId: "cus_test123",
    subscriptionStatus: "inactive",
  };
  network.responses["/api/auth/user"] = user;
  network.responses["/api/user"] = { subscriptionStatus: "inactive" };
  // Pre-seed so the banner has data on the very first render
  client.setQueryData(["/api/auth/user"], user);
  client.setQueryData(["/api/user"], { subscriptionStatus: "inactive" });
}

function seedActiveHomeowner() {
  network.responses["/api/auth/user"] = {
    id: "user-001",
    role: "homeowner",
    stripeCustomerId: "cus_test123",
    subscriptionStatus: "active",
  };
  network.responses["/api/user"] = { subscriptionStatus: "active" };
}

function seedInactiveContractor(client: QueryClient) {
  const user = {
    id: "user-002",
    role: "contractor",
    stripeCustomerId: "cus_contractor456",
    subscriptionStatus: "inactive",
  };
  network.responses["/api/auth/user"] = user;
  network.responses["/api/contractor/subscription"] = { subscriptionStatus: "inactive" };
  client.setQueryData(["/api/auth/user"], user);
  client.setQueryData(["/api/contractor/subscription"], { subscriptionStatus: "inactive" });
}

function seedActiveContractor() {
  network.responses["/api/auth/user"] = {
    id: "user-002",
    role: "contractor",
    stripeCustomerId: "cus_contractor456",
    subscriptionStatus: "active",
  };
  network.responses["/api/contractor/subscription"] = { subscriptionStatus: "active" };
}

// ---------------------------------------------------------------------------
// Tear-down
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  network.responses["/api/auth/user"] = null;
  network.responses["/api/user"] = null;
  network.responses["/api/contractor/subscription"] = null;
  network.callCounts["/api/auth/user"] = 0;
  network.callCounts["/api/user"] = 0;
  network.callCounts["/api/contractor/subscription"] = 0;
});

// ---------------------------------------------------------------------------
// Banner visibility — static rendering without polling
// ---------------------------------------------------------------------------

describe("ActivatingPlanBanner — visibility", () => {
  it("renders the banner when a homeowner has an inactive subscription", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    // Flush the initial background refetch (runs as a microtask, not a timer)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText(/your subscription is activating/i)).toBeDefined();
  });

  it("renders nothing when no user is authenticated", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    // No user in cache, network returns null
    network.responses["/api/auth/user"] = null;

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders nothing when the homeowner subscription is already active", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    const user = {
      id: "user-001",
      role: "homeowner",
      stripeCustomerId: "cus_test123",
    };
    network.responses["/api/auth/user"] = user;
    network.responses["/api/user"] = { subscriptionStatus: "active" };
    client.setQueryData(["/api/auth/user"], user);
    client.setQueryData(["/api/user"], { subscriptionStatus: "active" });

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders nothing when the user has no stripeCustomerId even if status is inactive", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    const user = { id: "user-001", role: "homeowner" /* no stripeCustomerId */ };
    network.responses["/api/auth/user"] = user;
    network.responses["/api/user"] = { subscriptionStatus: "inactive" };
    client.setQueryData(["/api/auth/user"], user);
    client.setQueryData(["/api/user"], { subscriptionStatus: "inactive" });

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("renders the banner for a contractor with an inactive subscription", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveContractor(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText(/your subscription is activating/i)).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Auto-dismiss: banner unmounts when fast-poll returns active status
//
// These tests use vi.useFakeTimers() and advance time by exactly one
// FAST_POLL_INTERVAL_MS (5 000 ms), which is what React Query uses to
// schedule the next refetch.  The banner must disappear without any explicit
// "Refresh now" click — proving the observer-merge mechanism causes the
// automatic unlock.
// ---------------------------------------------------------------------------

describe("ActivatingPlanBanner — auto-dismiss after fast-poll resolves with active status", () => {
  it("unmounts the homeowner banner automatically after one poll interval returns active status", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    // Flush the initial background refetch (returns inactive — banner stays up)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole("status")).toBeDefined();

    // Switch the network mock to active status.
    // The fast-poll refetchInterval timer will fire at t=5 000 ms and call
    // getQueryFn, which now returns active data.  React Query then notifies
    // all observers — including the one inside useAuth — and the component
    // re-renders with isActivating=false, unmounting the banner.
    seedActiveHomeowner();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/your subscription is activating/i)).toBeNull();
  });

  it("unmounts the contractor banner automatically after one poll interval returns active status", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveContractor(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole("status")).toBeDefined();

    seedActiveContractor();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("does not require the Refresh now button to be clicked before the banner disappears", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Confirm the manual-refresh button exists during activation
    expect(screen.getByRole("button", { name: /refresh now/i })).toBeDefined();

    // Transition to active via the polling cycle — no button click
    seedActiveHomeowner();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    // Both the banner and the manual-refresh button are gone — no click needed
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByRole("button", { name: /refresh now/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Fast-poll: the refetchInterval cycle fires during the activation window
//
// Proven by tracking how many times getQueryFn is called per query key.
// After one poll interval, the count must exceed the initial-fetch count,
// confirming that React Query's timer-driven refetch is active.
// ---------------------------------------------------------------------------

describe("ActivatingPlanBanner — fast-poll fires during the activation window", () => {
  it("triggers a refetch of /api/user within one poll interval while the homeowner status is inactive", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    // Let initial background refetch settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const callsAfterMount = network.callCounts["/api/user"];

    // Advance exactly one poll interval — the refetchInterval observer fires
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/user"]).toBeGreaterThan(callsAfterMount);
  });

  it("triggers a refetch of /api/auth/user within one poll interval while the homeowner status is inactive", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const callsAfterMount = network.callCounts["/api/auth/user"];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/auth/user"]).toBeGreaterThan(callsAfterMount);
  });

  it("triggers a refetch of /api/contractor/subscription within one poll interval while the contractor status is inactive", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveContractor(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const callsAfterMount = network.callCounts["/api/contractor/subscription"];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/contractor/subscription"]).toBeGreaterThan(callsAfterMount);
  });
});

// ---------------------------------------------------------------------------
// Fast-poll: polling stops once the banner unmounts after activation
//
// Once the status becomes active the banner returns null, removing all
// observers.  A further timer advancement must NOT trigger additional
// getQueryFn calls — confirming polling is tied to the activation window
// and not running indefinitely.
// ---------------------------------------------------------------------------

describe("ActivatingPlanBanner — fast-poll stops after activation resolves", () => {
  it("stops calling getQueryFn for /api/user once the homeowner status is active and the banner unmounts", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    // Initial settle
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Activate — one poll cycle unmounts the banner
    seedActiveHomeowner();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(screen.queryByRole("status")).toBeNull();

    const callsAfterUnmount = network.callCounts["/api/user"];

    // Advance another full poll interval — no observers remain, so no refetch
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/user"]).toBe(callsAfterUnmount);
  });

  it("stops calling getQueryFn for /api/auth/user once the homeowner status is active and the banner unmounts", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    seedActiveHomeowner();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(screen.queryByRole("status")).toBeNull();

    const callsAfterUnmount = network.callCounts["/api/auth/user"];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/auth/user"]).toBe(callsAfterUnmount);
  });

  it("does not call getQueryFn more than once (initial mount fetch) when there is no activation in progress", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();

    // Active from the start — banner never shows, fast-poll never enabled
    const user = {
      id: "user-001",
      role: "homeowner",
      stripeCustomerId: "cus_test123",
    };
    network.responses["/api/auth/user"] = user;
    network.responses["/api/user"] = { subscriptionStatus: "active" };
    client.setQueryData(["/api/auth/user"], user);
    client.setQueryData(["/api/user"], { subscriptionStatus: "active" });

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    const callsAtSettled = network.callCounts["/api/user"];

    // Advance well past one poll interval — if polling were running this would increment
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    // No additional refetches — fast-poll was never enabled
    expect(network.callCounts["/api/user"]).toBe(callsAtSettled);
  });
});

// ---------------------------------------------------------------------------
// Expiry: polling stops after MAX_FAST_POLL_MS even if status stays inactive
//
// The component sets fastPollExpired=true after 60 000 ms, which flips
// fastPollActive to false and disables all three polling queries.  The banner
// must stay visible (switching to the "Taking longer than expected" warning
// state) rather than dismissing itself.
// ---------------------------------------------------------------------------

describe("ActivatingPlanBanner — poll expiry after MAX_FAST_POLL_MS (60 s)", () => {
  it("keeps the banner visible after the 60-second poll window expires", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText(/your subscription is activating/i)).toBeDefined();

    // Advance past the 60-second expiry — status never changes to active
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    // Banner must still be in the DOM (expiry shows the warning variant, not null)
    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText(/taking longer than expected/i)).toBeDefined();
  });

  it("stops fast-polling /api/auth/user once the 60-second window expires", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Let the poll window expire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    const callsAfterExpiry = network.callCounts["/api/auth/user"];

    // Advance another full poll interval — enabled=false means no new fetches
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/auth/user"]).toBe(callsAfterExpiry);
  });

  it("stops fast-polling /api/user once the 60-second window expires", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    const callsAfterExpiry = network.callCounts["/api/user"];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/user"]).toBe(callsAfterExpiry);
  });

  it("stops fast-polling /api/contractor/subscription once the 60-second window expires", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveContractor(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    const callsAfterExpiry = network.callCounts["/api/contractor/subscription"];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/contractor/subscription"]).toBe(callsAfterExpiry);
  });
});

// ---------------------------------------------------------------------------
// Dismissed banner: polling continues in the background so features unlock
//
// When the user clicks the X button the banner DOM is removed, but the
// fast-poll queries remain enabled because fastPollActive is derived from
// isActivating (the real status), not from banner visibility.  These tests
// confirm that contract: dismiss → banner gone, polling still fires, cache
// still updates when the server eventually returns active status.
// ---------------------------------------------------------------------------

describe("ActivatingPlanBanner — polling continues after the banner is dismissed", () => {
  it("hides the banner immediately when the dismiss button is clicked", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    // Let the initial background refetch settle so the banner is visible
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    expect(screen.getByRole("status")).toBeDefined();
    expect(screen.getByText(/your subscription is activating/i)).toBeDefined();

    // Click the X dismiss button
    const dismissButton = screen.getByRole("button", { name: /dismiss/i });
    await act(async () => {
      fireEvent.click(dismissButton);
    });

    // Banner is gone — dismissed=true causes the component to return null
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText(/your subscription is activating/i)).toBeNull();
  });

  it("keeps firing fast-poll refetches after the banner is dismissed", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Dismiss the banner
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    });

    // Banner is hidden
    expect(screen.queryByRole("status")).toBeNull();

    // Record call counts right after dismiss (underlying status is still inactive)
    const callsAfterDismiss = {
      authUser: network.callCounts["/api/auth/user"],
      user: network.callCounts["/api/user"],
    };

    // Advance one full poll interval — the fast-poll observers are still mounted
    // inside the component (it returns null for the visible DOM but the hooks
    // remain active), so their refetchInterval timer must fire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    // Call counts must have grown, proving polling is still active
    expect(network.callCounts["/api/auth/user"]).toBeGreaterThan(callsAfterDismiss.authUser);
    expect(network.callCounts["/api/user"]).toBeGreaterThan(callsAfterDismiss.user);
  });

  it("updates the query cache with active status when the poll resolves after dismiss", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Verify the cache holds inactive status before any transition
    expect((client.getQueryData(["/api/user"]) as any)?.subscriptionStatus).toBe("inactive");

    // Dismiss the banner — it disappears but polling keeps running
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    });

    expect(screen.queryByRole("status")).toBeNull();

    // Switch the network mock so the next poll returns active status
    seedActiveHomeowner();

    // Advance one poll interval — the background poll fires and writes active
    // data into the shared query cache, exactly as it would in production
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    // The cache now holds the active status that the background poll returned
    const cachedUser = client.getQueryData(["/api/user"]) as any;
    expect(cachedUser?.subscriptionStatus).toBe("active");

    const cachedAuthUser = client.getQueryData(["/api/auth/user"]) as any;
    expect(cachedAuthUser?.subscriptionStatus).toBe("active");
  });
});

// ---------------------------------------------------------------------------
// Retry: "Try again" opens a fresh 60-second polling window
//
// handleRetry increments pollEpoch, which re-triggers the useEffect that
// resets fastPollExpired and restarts the MAX_FAST_POLL_MS timer.  Tests
// verify that:
//   1. The banner switches back to the standard activating state immediately.
//   2. Call counts increase after retry (polling has resumed).
//   3. The second window also expires if the status never becomes active.
// ---------------------------------------------------------------------------

describe("ActivatingPlanBanner — 'Try again' opens a fresh 60-second polling window", () => {
  it("clicking 'Try again' reverts the banner to the standard activating state", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Expire the first 60-second window
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    // Banner shows the expired warning and the "Try again" button
    expect(screen.getByText(/taking longer than expected/i)).toBeDefined();
    const retryBtn = screen.getByRole("button", { name: /try again/i });
    expect(retryBtn).toBeDefined();

    // Click "Try again"
    await act(async () => {
      fireEvent.click(retryBtn);
    });

    // Banner must revert to standard activating state
    expect(screen.getByText(/your subscription is activating/i)).toBeDefined();
    expect(screen.queryByText(/taking longer than expected/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
  });

  it("clicking 'Try again' resumes polling — call counts increase after the click", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Expire the first poll window
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    // Confirm polling stopped — one more interval must not add new calls
    const callsAtExpiry = network.callCounts["/api/user"];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });
    expect(network.callCounts["/api/user"]).toBe(callsAtExpiry);

    // Click "Try again" to open the second window
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    });

    const callsAfterRetry = network.callCounts["/api/user"];

    // Advance one poll interval — the resumed refetchInterval must fire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/user"]).toBeGreaterThan(callsAfterRetry);
  });

  it("polling for /api/auth/user also resumes after 'Try again'", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    });

    const callsAfterRetry = network.callCounts["/api/auth/user"];

    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/auth/user"]).toBeGreaterThan(callsAfterRetry);
  });

  it("polling for /api/contractor/subscription also resumes after 'Try again'", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveContractor(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Expire the first 60-second poll window
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    // Confirm polling stopped — one extra interval must not add new calls
    const callsAtExpiry = network.callCounts["/api/contractor/subscription"];
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });
    expect(network.callCounts["/api/contractor/subscription"]).toBe(callsAtExpiry);

    // Click "Try again" to open the second window
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    });

    const callsAfterRetry = network.callCounts["/api/contractor/subscription"];

    // Advance one poll interval — the resumed refetchInterval must fire
    await act(async () => {
      await vi.advanceTimersByTimeAsync(FAST_POLL_INTERVAL_MS);
    });

    expect(network.callCounts["/api/contractor/subscription"]).toBeGreaterThan(callsAfterRetry);
  });

  it("the second 60-second window also expires if the status never becomes active", async () => {
    vi.useFakeTimers();
    const client = makeTestClient();
    seedInactiveHomeowner(client);

    renderBanner(client);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(100);
    });

    // Expire the first window
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    expect(screen.getByText(/taking longer than expected/i)).toBeDefined();

    // Open the second window via "Try again"
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /try again/i }));
    });

    // Standard activating state shown immediately after retry
    expect(screen.getByText(/your subscription is activating/i)).toBeDefined();
    expect(screen.queryByText(/taking longer than expected/i)).toBeNull();

    // Expire the second window (status still inactive)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(MAX_FAST_POLL_MS);
    });

    // Banner must revert to the expired warning again
    expect(screen.getByText(/taking longer than expected/i)).toBeDefined();
    expect(screen.getByRole("button", { name: /try again/i })).toBeDefined();
  });
});
