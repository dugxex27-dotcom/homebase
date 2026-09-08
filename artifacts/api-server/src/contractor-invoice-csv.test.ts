import { describe, expect, it } from "vitest";
import { serializeContractorInvoicesCsv } from "./contractor-invoice-csv";

describe("serializeContractorInvoicesCsv", () => {
  it("exports the required columns and safely quotes invoice values", () => {
    const csv = serializeContractorInvoicesCsv([{
      invoiceDate: "2026-09-07",
      createdAt: "2026-09-08T12:00:00.000Z",
      uploaderFirstName: "Ana",
      uploaderLastName: "Smith",
      uploaderEmail: "ana@example.com",
      homeownerFirstName: "Chris",
      homeownerLastName: "Jones",
      amount: "1250.50",
      fileName: 'invoice, "final".pdf',
      notes: "Kitchen work\nPaid",
    }]);

    expect(csv).toBe(
      '"date","uploader name","homeowner name","amount","file name","notes"\r\n'
      + '"2026-09-07","Ana Smith","Chris Jones","1250.50","invoice, ""final"".pdf","Kitchen work\nPaid"',
    );
  });

  it("falls back to creation date and uploader email while preserving blank fields", () => {
    const csv = serializeContractorInvoicesCsv([{
      invoiceDate: null,
      createdAt: "2026-09-06T23:15:00.000Z",
      uploaderFirstName: null,
      uploaderLastName: null,
      uploaderEmail: "tech@example.com",
      homeownerFirstName: null,
      homeownerLastName: null,
      amount: null,
      fileName: "invoice.pdf",
      notes: null,
    }]);

    expect(csv.split("\r\n")[1]).toBe(
      '"2026-09-06","tech@example.com","","","invoice.pdf",""',
    );
  });

  it("neutralizes spreadsheet formulas in names, file names, and notes", () => {
    const csv = serializeContractorInvoicesCsv([{
      invoiceDate: "2026-09-08",
      createdAt: null,
      uploaderFirstName: "=HYPERLINK(\"https://bad.example\")",
      uploaderLastName: null,
      uploaderEmail: null,
      homeownerFirstName: "\t+SUM(1,1)",
      homeownerLastName: null,
      amount: "50",
      fileName: "-malicious.csv",
      notes: "  @IMPORTXML(\"https://bad.example\")",
    }]);

    expect(csv.split("\r\n")[1]).toBe(
      '"2026-09-08","\'=HYPERLINK(""https://bad.example"")","\'\t+SUM(1,1)","50","\'-malicious.csv","\'  @IMPORTXML(""https://bad.example"")"',
    );
  });
});