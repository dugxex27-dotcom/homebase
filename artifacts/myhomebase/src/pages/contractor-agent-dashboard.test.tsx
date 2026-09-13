import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const fixtures = vi.hoisted(() => ({
  verificationStatus: "approved" as string | undefined,
  verificationLoading: false,
  verificationError: false,
  verificationRefetch: vi.fn(),
  submittedProposalPayload: null as Record<string, unknown> | null,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: {
      id: "demo-contractor",
      role: "contractor",
      companyRole: "owner",
      firstName: "Demo",
      email: "demo.contractor@example.com",
      referralCode: "DEMO",
    },
  }),
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
    seatInfo: { reservedTeamCount: 0, teamSeatLimit: 10, additionalTeamSeatPrice: 5 },
  }),
}));

vi.mock("wouter", () => ({
  Link: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
    <a href={href} {...props}>{children}</a>
  ),
  useLocation: () => ["/contractor-dashboard", vi.fn()],
  useSearch: () => "",
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
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: vi.fn() }),
    useQuery: ({ queryKey }: { queryKey: unknown[] }) => {
      switch (queryKey[0]) {
        case "/api/crm/dashboard":
          return { data: { revenue: { total: "18450.75" } }, isLoading: false, isError: false };
        case "/api/crm/clients":
          return {
            data: [{ id: "crm-client-1", firstName: "Seeded", lastName: "Client", email: "client@example.com" }],
            isLoading: false,
            isError: false,
          };
        case "/api/crm/leads":
          return {
            data: [{ id: "lead-1", status: "new", createdAt: new Date().toISOString() }],
            isLoading: false,
            isError: false,
          };
        case "/api/contractors":
          return {
            data: [{
              id: "homeowner-user-1",
              firstName: "Legacy",
              lastName: "Homeowner",
              email: "homeowner@example.com",
              lastContactedAt: new Date().toISOString(),
            }],
            isLoading: false,
            isError: false,
          };
        case "/api/agent/referrals":
          return {
            data: [{ id: "referral-1", status: "eligible", refereeName: "Seeded Homeowner", refereeEmail: "homeowner@example.com" }],
            isLoading: false,
            isError: false,
          };
        case "/api/agent/verification-status":
          return {
            data: fixtures.verificationStatus
              ? { verificationStatus: fixtures.verificationStatus }
              : undefined,
            isLoading: fixtures.verificationLoading,
            isError: fixtures.verificationError,
            refetch: fixtures.verificationRefetch,
          };
        default:
          return { data: [], isLoading: false, isError: false, refetch: vi.fn() };
      }
    },
    useMutation: (options: {
      mutationFn?: (variables: unknown) => unknown;
      onSuccess?: (data: unknown, variables: unknown) => void;
    }) => ({
      mutate: (variables: unknown) => {
        const result = options.mutationFn?.(variables);
        Promise.resolve(result).then((data) => options.onSuccess?.(data, variables));
      },
      isPending: false,
      variables: undefined,
    }),
  };
});

vi.mock("@/lib/queryClient", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queryClient")>();
  return {
    ...actual,
    apiRequest: vi.fn(async (url: string, method: string, body: Record<string, unknown>) => {
      if (url === "/api/proposals" && method === "POST") {
        fixtures.submittedProposalPayload = body;
      }
      return new Response(JSON.stringify({ id: "proposal-1" }), { status: 201 });
    }),
  };
});

import ContractorDashboard from "./contractor-dashboard";
import AgentDashboard from "./agent-dashboard";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  fixtures.verificationStatus = "approved";
  fixtures.verificationLoading = false;
  fixtures.verificationError = false;
  fixtures.submittedProposalPayload = null;
});

describe("demo contractor dashboard CRM stats", () => {
  it("renders CRM earnings and rolling-window leads instead of legacy proposal data", () => {
    render(<ContractorDashboard />);

    expect(screen.getByTestId("text-all-time-earnings")).toHaveTextContent("$18,450.75");
    expect(screen.getByTestId("text-new-leads")).toHaveTextContent("1");
  });

  it("renders seeded CRM clients in the dashboard relationship list", () => {
    render(<ContractorDashboard />);

    expect(screen.getByTestId("crm-client-relationship-crm-client-1")).toHaveTextContent("Seeded Client");
  });

  it("keeps proposal submission on a legitimate homeowner user ID", async () => {
    render(<ContractorDashboard />);

    fireEvent.click(screen.getByTestId("button-create-proposal"));
    fireEvent.click(screen.getByTestId("select-customer"));
    expect(screen.queryByTestId("crm-client-option-crm-client-1")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("homeowner-option-homeowner-user-1"));
    expect(screen.getByTestId("select-customer")).toHaveTextContent("Legacy Homeowner");
    fireEvent.change(screen.getByTestId("input-proposal-title"), { target: { value: "Roof repair" } });
    fireEvent.click(screen.getByTestId("select-service-type"));
    fireEvent.click(screen.getByRole("option", { name: "HVAC" }));
    fireEvent.change(screen.getByTestId("input-estimated-cost"), { target: { value: "2500" } });
    fireEvent.submit(screen.getByTestId("button-submit-proposal").closest("form")!);

    await waitFor(() => expect(fixtures.submittedProposalPayload).not.toBeNull());
    expect(fixtures.submittedProposalPayload?.homeownerId).toBe("homeowner-user-1");
    expect(fixtures.submittedProposalPayload?.homeownerId).not.toBe("crm-client-1");
  });
});

describe("demo agent dashboard relationships and verification", () => {
  it("renders seeded referral relationships", () => {
    render(<AgentDashboard />);

    expect(screen.getByText("1 Total")).toBeInTheDocument();
    expect(screen.getByText("Seeded Homeowner")).toBeInTheDocument();
  });

  it.each([
    ["pending_review", "License verification in progress"],
    ["not_submitted", "Verification required"],
    ["rejected", "Verification rejected"],
    ["resubmit_required", "Resubmission required"],
  ])("shows the correct banner for %s", (status, message) => {
    fixtures.verificationStatus = status;
    render(<AgentDashboard />);

    expect(screen.getByText(message)).toBeInTheDocument();
    if (status !== "pending_review") {
      expect(screen.queryByText("License verification in progress")).not.toBeInTheDocument();
    }
  });

  it("does not show a verification banner for an approved demo", () => {
    fixtures.verificationStatus = "approved";
    render(<AgentDashboard />);

    expect(screen.queryByTestId(/banner-verification/)).not.toBeInTheDocument();
    expect(screen.queryByText(/verification in progress/i)).not.toBeInTheDocument();
  });

  it.each([
    ["while verification is loading", { verificationStatus: undefined, verificationLoading: true, verificationError: false }],
    ["when verification is missing", { verificationStatus: undefined, verificationLoading: false, verificationError: false }],
  ])("does not call %s in progress", (_caseName, state) => {
    fixtures.verificationStatus = state.verificationStatus;
    fixtures.verificationLoading = state.verificationLoading;
    fixtures.verificationError = state.verificationError;
    render(<AgentDashboard />);

    expect(screen.queryByText(/verification in progress/i)).not.toBeInTheDocument();
    if (!state.verificationLoading && !state.verificationError) {
      expect(screen.getByTestId("banner-verification-required")).toHaveTextContent("Verification required");
    }
  });

  it("shows a retryable error state when verification status cannot be loaded", () => {
    fixtures.verificationStatus = undefined;
    fixtures.verificationError = true;
    render(<AgentDashboard />);

    expect(screen.getByTestId("banner-verification-error")).toHaveTextContent("Unable to load verification status");
    fireEvent.click(screen.getByTestId("button-retry-verification"));
    expect(fixtures.verificationRefetch).toHaveBeenCalled();
  });
});