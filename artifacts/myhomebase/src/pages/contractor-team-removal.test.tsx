import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const owner = {
  id: "owner-1",
  role: "contractor",
  companyId: "company-1",
  companyRole: "owner",
  firstName: "Olivia",
  lastName: "Owner",
};

const soleAdmin = {
  id: "owner-1",
  email: "owner@example.com",
  firstName: "Olivia",
  lastName: "Owner",
  companyRole: "owner",
  status: "active",
  lastLoginAt: null,
  inviteExpiresAt: null,
  lastInviteSentAt: null,
  createdAt: null,
  invoiceCount: 0,
  mostRecentJobDate: null,
  totalBilled: "0",
};

const pendingInvite = {
  id: "pending-1",
  email: "pending@example.com",
  firstName: "Pat",
  lastName: "Pending",
  companyRole: "admin",
  status: "pending_invite",
  lastLoginAt: null,
  inviteExpiresAt: null,
  lastInviteSentAt: null,
  createdAt: null,
  invoiceCount: 0,
  mostRecentJobDate: null,
  totalBilled: "0",
};

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: owner }),
}));

vi.mock("@/hooks/useContractorSubscription", () => ({
  useContractorSubscription: () => ({
    needsSubscription: false,
    isInTrial: false,
    isLoading: false,
    hasDivisions: false,
    hasBulkImport: false,
    subscriptionStatus: "active",
    trialExpired: false,
    seatInfo: {
      reservedTeamCount: 2,
      teamSeatLimit: 10,
      additionalTeamSeatPrice: 5,
    },
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
  useLocation: () => ["/contractor-dashboard"],
  useSearch: () => "?tab=team",
}));

vi.mock("@/components/proposals", () => ({ Proposals: () => null }));
vi.mock("@/components/ConnectionCodes", () => ({ ContractorCodeEntry: () => null }));
vi.mock("@/components/contractor-feature-gate", () => ({
  ContractorTrialExpiredPaywall: () => null,
  ContractorTrialBanner: () => null,
  ContractorNoPlanBanner: () => null,
}));
vi.mock("@/components/activating-plan-banner", () => ({ ActivatingPlanBanner: () => null }));
vi.mock("@/components/BoostRenewalCheckoutModal", () => ({ BoostRenewalCheckoutModal: () => null }));
vi.mock("./tech-dashboard", () => ({ TechDashboard: () => null }));

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>();
  const ReactModule = await import("react");

  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      const path = queryKey[0];
      if (path === "/api/contractor/team") {
        return {
          data: {
            teamMembers: [soleAdmin, pendingInvite],
            acceptedTeamCount: 1,
            reservedTeamCount: 2,
            pendingInviteCount: 1,
            billedTeamSeatCount: 1,
            includedTeamSeats: 3,
            teamSeatLimit: 10,
            seatUsageAlertThreshold: 80,
          },
          isLoading: false,
          refetch: vi.fn(),
        };
      }
      return { data: undefined, isLoading: false, isError: false, refetch: vi.fn() };
    },
    useMutation: (options: {
      mutationFn: (variables: any) => Promise<unknown>;
      onSuccess?: (data: unknown, variables: any) => void;
      onError?: (error: Error, variables: any) => void;
    }) => {
      const [isPending, setIsPending] = ReactModule.useState(false);
      const [variables, setVariables] = ReactModule.useState<any>();
      return {
        isPending,
        variables,
        mutate: (nextVariables: any) => {
          setVariables(nextVariables);
          setIsPending(true);
          void options.mutationFn(nextVariables)
            .then((data) => options.onSuccess?.(data, nextVariables))
            .catch((error) => options.onError?.(error, nextVariables))
            .finally(() => setIsPending(false));
        },
      };
    },
  };
});

import ContractorDashboard from "./contractor-dashboard";

describe("contractor team member removal", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/contractor-dashboard?tab=team");
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/contractor/team/owner-1" && init?.method === "DELETE") {
        return new Response(
          JSON.stringify({ message: "Cannot remove the only admin or owner of the company. Promote another member to admin first." }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
      }
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows actionable guidance when DELETE is blocked for the sole admin", async () => {
    render(<ContractorDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(fetch).toHaveBeenCalledWith(
      "/api/contractor/team/owner-1",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Promote another member to admin first, then try again.",
    );
  });

  it("explains that pending invites cannot receive ownership yet", () => {
    render(<ContractorDashboard />);

    fireEvent.click(screen.getByRole("button", { name: "Transfer ownership" }));

    expect(screen.getByText(
      "You have 1 pending invite. Once a member accepts their invite, you can transfer ownership to them.",
    )).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer Ownership" })).toBeDisabled();
  });
});