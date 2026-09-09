import { describe, expect, it } from "vitest";
import type { Company, CrmClient, CrmInvoice, User } from "@workspace/db";
import { generateInvoicePdf } from "./invoice-pdf";

describe("generateInvoicePdf", () => {
  it("creates a valid, non-empty PDF for a finalized invoice", async () => {
    const pdf = await generateInvoicePdf({
      invoice: {
        id: "invoice-1",
        contractorUserId: "contractor-1",
        companyId: "company-1",
        clientId: "client-1",
        invoiceNumber: "INV-2026-0001",
        title: "Roof repair",
        status: "sent",
        lineItems: [
          { description: "Labor", quantity: 2, unitPrice: 125, total: 250 },
          { description: "Materials", quantity: 1, unitPrice: 75, total: 75 },
        ],
        subtotal: "325.00",
        taxRate: "10.00",
        taxAmount: "32.50",
        discount: "0.00",
        total: "357.50",
        amountPaid: "0.00",
        amountDue: "357.50",
        dueDate: new Date("2026-09-30T00:00:00Z"),
        paymentNotes: "Pay by check or card.",
        createdAt: new Date("2026-09-09T00:00:00Z"),
      } as CrmInvoice,
      client: {
        id: "client-1",
        firstName: "Jordan",
        lastName: "Customer",
        email: "customer@example.com",
        address: "10 Main Street",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
      } as CrmClient,
      company: {
        id: "company-1",
        name: "Excellent Home Services",
        email: "office@example.com",
        phone: "555-0100",
      } as Company,
      contractor: {
        id: "contractor-1",
        firstName: "Casey",
        lastName: "Contractor",
        email: "casey@example.com",
      } as User,
    });

    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdf.length).toBeGreaterThan(1_000);
  });
});