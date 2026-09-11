import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  invoice: {} as Record<string, any>,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: state.invoice,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
  }),
}));

vi.mock("wouter", () => ({
  useParams: () => ({ invoiceId: "invoice-history-ui" }),
  useLocation: () => ["/pay/invoice/invoice-history-ui", vi.fn()],
}));

vi.mock("@/lib/nativeBrowser", () => ({
  openPaymentUrl: vi.fn(),
  onBrowserFinished: vi.fn(() => vi.fn()),
}));

import PayInvoicePage from "./pay-invoice";

const history = [
  {
    id: "event-1",
    field: "Amount",
    oldValue: "$100.00",
    newValue: "$125.00",
    createdAt: "2026-09-11T12:01:00.000Z",
  },
  {
    id: "event-2",
    field: "Payment recorded",
    oldValue: "$0.00",
    newValue: "$125.00",
    createdAt: "2026-09-11T12:04:00.000Z",
  },
];

describe("PayInvoicePage invoice history", () => {
  beforeEach(() => {
    state.invoice = {
      id: "invoice-history-ui",
      invoiceNumber: "INV-2026-0001",
      title: "HVAC service",
      description: null,
      status: "sent",
      totalAmount: "125.00",
      dueDate: "2026-10-01T12:00:00.000Z",
      lineItems: [],
      clientName: "Alice Homeowner",
      contractorName: "Bob Builder",
      companyName: "Builder Co",
      companyLogo: null,
      canSaveToHistory: false,
      houseId: null,
      history,
    };
  });

  afterEach(cleanup);

  it("renders chronological history on an unpaid invoice", () => {
    render(<PayInvoicePage />);

    expect(screen.getByTestId("invoice-change-history")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Payment recorded")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("renders the same history after the invoice is paid", () => {
    state.invoice = { ...state.invoice, status: "paid" };
    render(<PayInvoicePage />);

    expect(screen.getByText("Invoice Already Paid")).toBeInTheDocument();
    expect(screen.getByTestId("invoice-change-history")).toBeInTheDocument();
    expect(screen.getAllByText("$125.00", { selector: ".font-medium" })).toHaveLength(2);
  });
});