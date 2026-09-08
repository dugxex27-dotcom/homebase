import { describe, expect, it } from "vitest";

import { extractInvoiceDataFromPDF } from "./invoice-analysis-service";

function createContractorInvoicePdf(): Buffer {
  const invoiceText =
    "QUICKBOOKS INVOICE 1042 | Cool Air LLC | HVAC annual service | Service date 03/15/2026 | Total $250.00";
  const stream = `BT /F1 12 Tf 72 720 Td (${invoiceText}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => `${offset.toString().padStart(10, "0")} 00000 n \n`)
    .join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdf);
}

describe("contractor invoice PDF extraction", () => {
  it("extracts text from a realistic digital contractor invoice", async () => {
    const pdfBase64 = createContractorInvoicePdf().toString("base64");

    const text = await extractInvoiceDataFromPDF(pdfBase64);

    expect(text).toContain("QUICKBOOKS INVOICE 1042");
    expect(text).toContain("Cool Air LLC");
    expect(text).toContain("HVAC annual service");
  });
});