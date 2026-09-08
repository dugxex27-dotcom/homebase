import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  invalidateQueries: vi.fn(),
  setLocation: vi.fn(),
}));

const queryClient = vi.hoisted(() => ({
  invalidateQueries: mocks.invalidateQueries,
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: mocks.apiRequest,
}));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  return {
    ...actual,
    useQueryClient: () => queryClient,
  };
});

vi.mock("wouter", () => ({
  useLocation: () => ["/subscription-success", mocks.setLocation],
}));

import SubscriptionSuccess from "./subscription-success";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });
  return { promise, resolve };
}

describe("SubscriptionSuccess redirect timing", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T12:00:00Z"));
    mocks.apiRequest.mockReset();
    mocks.invalidateQueries.mockReset();
    mocks.setLocation.mockReset();
    window.history.replaceState({}, "", "/subscription-success?role=homeowner");
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("does not redirect after five seconds while subscription sync is still pending", async () => {
    const sync = deferred<{ synced: boolean }>();
    mocks.apiRequest.mockReturnValue(sync.promise);

    render(<SubscriptionSuccess />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000);
    });

    expect(mocks.setLocation).not.toHaveBeenCalled();
    expect(screen.getByText("Activating your subscription…")).toBeInTheDocument();

    await act(async () => {
      sync.resolve({ synced: true });
      await sync.promise;
    });

    expect(mocks.setLocation).toHaveBeenCalledTimes(1);
    expect(mocks.setLocation).toHaveBeenCalledWith("/maintenance");
  });

  it("resumes from the remaining countdown time when sync finishes before five seconds", async () => {
    const sync = deferred<{ synced: boolean }>();
    mocks.apiRequest.mockReturnValue(sync.promise);

    render(<SubscriptionSuccess />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_000);
      sync.resolve({ synced: true });
      await sync.promise;
    });

    expect(screen.getByText("Redirecting to your dashboard in 3 seconds…")).toBeInTheDocument();
    expect(mocks.setLocation).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2_999);
    });
    expect(mocks.setLocation).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(mocks.setLocation).toHaveBeenCalledTimes(1);
    expect(mocks.setLocation).toHaveBeenCalledWith("/maintenance");
  });

  it("redirects after all sync retries fail", async () => {
    mocks.apiRequest.mockRejectedValue(new Error("sync unavailable"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<SubscriptionSuccess />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_999);
    });
    expect(mocks.apiRequest).toHaveBeenCalledTimes(3);
    expect(mocks.setLocation).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(mocks.apiRequest).toHaveBeenCalledTimes(4);
    expect(mocks.setLocation).toHaveBeenCalledTimes(1);
    expect(mocks.setLocation).toHaveBeenCalledWith("/maintenance");

    consoleError.mockRestore();
  });
});