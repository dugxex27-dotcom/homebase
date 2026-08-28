import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ContractorContractDetail from "./contractor-contract-detail";

vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "proposal-001" }],
  useLocation: () => ["/contractor/proposals/proposal-001/contract", vi.fn()],
  Link: ({
    href,
    children,
    ...props
  }: {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ContractorContractDetail />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("contractor contract snapshot", () => {
  it("renders immutable terms and signing metadata returned by the contract API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            id: "contract-001",
            proposalId: "proposal-001",
            title: "Roof repair",
            description: "Replace storm-damaged roofing",
            serviceType: "roofing",
            estimatedCost: "8450.25",
            estimatedDuration: "3 days",
            scope: "Remove old shingles and install a new roof",
            materials: ["Shingles", "Underlayment"],
            warrantyPeriod: "10 years",
            validUntil: "2026-10-31",
            status: "active",
            createdAt: "2026-08-28T12:00:00.000Z",
            acceptedAt: "2026-08-28T12:00:00.000Z",
            customerSignerName: "Homer Owner",
            customerSignedAt: "2026-08-28T12:00:00.000Z",
            contractFilePath: "/objects/contract.pdf",
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    renderPage();

    expect(await screen.findByTestId("text-contract-title")).toHaveTextContent("Roof repair");
    expect(screen.getByTestId("text-signer-info")).toHaveTextContent(
      "Electronically signed by Homer Owner",
    );
    expect(screen.getByTestId("text-contract-scope")).toHaveTextContent(
      "Remove old shingles and install a new roof",
    );
    expect(screen.getByTestId("text-estimated-cost")).toHaveTextContent("$8,450.25");
    expect(screen.getByTestId("text-estimated-duration")).toHaveTextContent("3 days");
    expect(screen.getByTestId("text-warranty-period")).toHaveTextContent("10 years");
    expect(screen.getByTestId("text-valid-until")).toHaveTextContent("Oct 31, 2026");
    expect(screen.getByText("Shingles")).toBeDefined();
    expect(screen.getByTestId("link-view-contract-file")).toHaveAttribute(
      "href",
      "/objects/contract.pdf",
    );
  });
});