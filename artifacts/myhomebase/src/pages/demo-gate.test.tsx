import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import DemoGate from "./demo-gate";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  window.history.replaceState({}, "", "/");
});

describe("DemoGate role switching", () => {
  it("clears the previous persona before showing a neutral role intro", async () => {
    window.history.replaceState({}, "", "/demo?role=homeowner");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    queryClient.setQueryData(["/api/auth/user"], {
      id: "demo-agent-permanent-id",
      role: "agent",
    });
    queryClient.setQueryData(["/api/agent/referrals"], [{ id: "old-agent-data" }]);

    let finishLogout!: (response: Response) => void;
    const logoutResponse = new Promise<Response>((resolve) => {
      finishLogout = resolve;
    });
    const fetchMock = vi.fn(() => logoutResponse);
    vi.stubGlobal("fetch", fetchMock);

    render(
      <QueryClientProvider client={queryClient}>
        <DemoGate />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Preparing your demo…")).toBeInTheDocument();
    expect(screen.queryByText("Quick intro")).not.toBeInTheDocument();

    await act(async () => {
      finishLogout(new Response(JSON.stringify({ success: true }), { status: 200 }));
      await logoutResponse;
    });

    expect(await screen.findByText("Quick intro")).toBeInTheDocument();
    expect(screen.getByText(/Before you explore the Homeowner demo/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    expect(queryClient.getQueryData(["/api/auth/user"])).toBeNull();
    expect(queryClient.getQueryData(["/api/agent/referrals"])).toBeUndefined();
  });

  it("does not expose the intro when the old server session cannot be cleared", async () => {
    window.history.replaceState({}, "", "/demo?role=contractor");
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 500 })));

    render(
      <QueryClientProvider client={queryClient}>
        <DemoGate />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("We couldn’t prepare the demo")).toBeInTheDocument();
    });
    expect(screen.queryByText("Quick intro")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});