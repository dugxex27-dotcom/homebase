function escapeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  // Quoting alone does not stop spreadsheet applications from evaluating
  // attacker-controlled values as formulas. Prefix formula-like cells with an
  // apostrophe, including when the marker follows whitespace or a tab.
  const spreadsheetSafeText = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${spreadsheetSafeText.replace(/"/g, '""')}"`;
}

export interface ContractorInvoiceCsvRow {
  invoiceDate: string | Date | null;
  createdAt: string | Date | null;
  uploaderFirstName: string | null;
  uploaderLastName: string | null;
  uploaderEmail: string | null;
  homeownerFirstName: string | null;
  homeownerLastName: string | null;
  amount: string | number | null;
  fileName: string;
  notes: string | null;
}

export function serializeContractorInvoicesCsv(invoices: ContractorInvoiceCsvRow[]): string {
  const header = ["date", "uploader name", "homeowner name", "amount", "file name", "notes"];
  const rows = invoices.map((invoice) => {
    const dateValue = invoice.invoiceDate ?? invoice.createdAt;
    const date = dateValue ? new Date(dateValue).toISOString().slice(0, 10) : "";
    const uploaderName =
      [invoice.uploaderFirstName, invoice.uploaderLastName].filter(Boolean).join(" ")
      || invoice.uploaderEmail
      || "";
    const homeownerName = [invoice.homeownerFirstName, invoice.homeownerLastName]
      .filter(Boolean)
      .join(" ");

    return [
      date,
      uploaderName,
      homeownerName,
      invoice.amount ?? "",
      invoice.fileName,
      invoice.notes ?? "",
    ];
  });

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(",")).join("\r\n");
}