import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Proposals } from "./proposals";

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock("@/lib/queryClient", () => ({
  apiRequest,
}));

vi.mock("./ObjectUploader", () => ({
  ObjectUploader: ({ children }: { children: React.ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));

const baseProposal = {
  contractorId: "contractor-001",
  companyId: null,
  createdBy: "contractor-001",
  homeownerId: "homeowner-001",
  title: "Roof repair",
  description: "Replace storm-damaged roofing",
  serviceType: "roofing",
  estimatedCost: "8450.25",
  estimatedDuration: "3 days",
  scope: "Remove old shingles and install a new roof",
  materials: ["Shingles", "Underlayment"],
  warrantyPeriod: "10 years",
  validUntil: "2026-10-31",
  customerNotes: null,
  internalNotes: null,
  attachments: [],
  contractFilePath: null,
  customerSignature: null,
  contractorSignature: null,
  signatureIpAddress: null,
  createdAt: new Date("2026-08-01T00:00:00.000Z"),
  updatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

function renderProposals(proposals: Array<Record<string, unknown>>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("contacted-homeowners")) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify(proposals), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }),
  );
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Proposals contractorId="contractor-001" />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  apiRequest.mockReset();
});

describe("contractor proposal outcomes", () => {
  it("shows every workflow status with accepted signing and rejected reason details", async () => {
    renderProposals([
      {
        ...baseProposal,
        id: "accepted-001",
        status: "accepted",
        customerSignerName: "Homer Owner",
        contractSignedAt: "2026-08-28T12:00:00.000Z",
        customerSignature: JSON.stringify({ type: "typed-name-agreement" }),
      },
      {
        ...baseProposal,
        id: "rejected-001",
        status: "rejected",
        rejectionReason: "The timing no longer works.",
      },
      { ...baseProposal, id: "sent-001", status: "sent" },
      { ...baseProposal, id: "expired-001", status: "expired" },
      { ...baseProposal, id: "draft-001", status: "draft" },
    ]);

    expect(await screen.findByTestId("proposal-status-accepted-001")).toHaveTextContent("Accepted");
    expect(screen.getByTestId("proposal-status-rejected-001")).toHaveTextContent("Rejected");
    expect(screen.getByTestId("proposal-status-sent-001")).toHaveTextContent("Sent");
    expect(screen.getByTestId("proposal-status-expired-001")).toHaveTextContent("Expired");
    expect(screen.getByTestId("proposal-status-draft-001")).toHaveTextContent("Draft");
    expect(screen.getByTestId("proposal-contract-created-accepted-001")).toHaveTextContent("contract created");
    expect(screen.getByTestId("proposal-signer-accepted-001")).toHaveTextContent(
      "Signed by Homer Owner on Aug 28, 2026",
    );
    expect(screen.getByTestId("proposal-rejection-reason-rejected-001")).toHaveTextContent(
      "The timing no longer works.",
    );
    expect(screen.queryByTestId("button-edit-proposal-accepted-001")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-delete-proposal-accepted-001")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-edit-proposal-rejected-001")).not.toBeInTheDocument();
    expect(screen.queryByTestId("button-delete-proposal-rejected-001")).not.toBeInTheDocument();
    expect(screen.getByTestId("button-delete-proposal-sent-001")).toBeInTheDocument();
    expect(screen.getByTestId("link-view-contract-accepted-001")).toHaveAttribute(
      "href",
      "/contractor/proposals/accepted-001/contract",
    );
  });

  it("keeps the existing contractor edit flow functional", async () => {
    apiRequest.mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const user = userEvent.setup();
    renderProposals([{ ...baseProposal, id: "draft-001", status: "draft" }]);

    await user.click(await screen.findByTestId("button-edit-proposal-draft-001"));
    const title = screen.getByTestId("input-proposal-title");
    await user.clear(title);
    await user.type(title, "Updated roof repair");
    const submitButton = screen.getByTestId("button-submit-proposal");
    fireEvent.submit(submitButton.closest("form")!);

    await waitFor(() => {
      expect(apiRequest).toHaveBeenCalledWith(
        "/api/proposals/draft-001",
        "PATCH",
        expect.objectContaining({ title: "Updated roof repair" }),
      );
    });
  });
});