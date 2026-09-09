import PDFDocument from "pdfkit";
import type { Company, CrmClient, CrmInvoice, User } from "@workspace/db";

type InvoiceLineItem = {
  description?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  total?: unknown;
};

export interface InvoicePdfInput {
  invoice: CrmInvoice;
  client: CrmClient;
  company?: Company;
  contractor: User;
  logo?: Buffer;
}

const money = (value: unknown): string => {
  const amount = Number(value ?? 0);
  return `$${Number.isFinite(amount) ? amount.toFixed(2) : "0.00"}`;
};

const date = (value: Date | string | null | undefined): string =>
  value
    ? new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      }).format(new Date(value))
    : "Upon receipt";

const compact = (...parts: Array<string | null | undefined>): string =>
  parts.filter((part): part is string => Boolean(part?.trim())).join(", ");

function addPageIfNeeded(doc: PDFKit.PDFDocument, height: number): void {
  if (doc.y + height <= doc.page.height - 55) return;
  doc.addPage();
}

export async function generateInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const { invoice, client, company, contractor, logo } = input;
  const doc = new PDFDocument({ size: "LETTER", margin: 50, compress: false });
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const brand = company?.name || "Invoice";
  if (logo) {
    try {
      doc.image(logo, 50, 45, { fit: [120, 60], valign: "center" });
    } catch {
      // Unsupported or corrupt logos should not prevent invoice delivery.
    }
  }
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#172554").text(brand, 190, 50, {
    align: "right",
  });
  doc.font("Helvetica-Bold").fontSize(28).fillColor("#111827").text("INVOICE", 190, 78, {
    align: "right",
  });
  doc.font("Helvetica").fontSize(10).fillColor("#4b5563")
    .text(`#${invoice.invoiceNumber}`, 190, 112, { align: "right" })
    .text(`Issued: ${date(invoice.sentAt || invoice.createdAt)}`, { align: "right" })
    .text(`Due: ${date(invoice.dueDate)}`, { align: "right" });

  doc.moveDown(3);
  const detailsTop = Math.max(doc.y, 155);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#172554").text("FROM", 50, detailsTop);
  doc.font("Helvetica").fillColor("#111827")
    .text(brand)
    .text(compact(contractor.firstName, contractor.lastName))
    .text(company?.email || contractor.email || "")
    .text(company?.phone || contractor.phone || "")
    .text(company?.address || "")
    .text(compact(company?.city, company?.state, company?.postalCode));

  doc.font("Helvetica-Bold").fillColor("#172554").text("BILL TO", 320, detailsTop);
  doc.font("Helvetica").fillColor("#111827")
    .text(compact(client.firstName, client.lastName), 320)
    .text(client.email || "", 320)
    .text(client.phone || "", 320)
    .text(client.address || "", 320)
    .text(compact(client.city, client.state, client.postalCode), 320);

  doc.y = Math.max(doc.y, detailsTop + 100);
  doc.font("Helvetica-Bold").fontSize(15).text(invoice.title);
  if (invoice.description) {
    doc.font("Helvetica").fontSize(10).fillColor("#4b5563").text(invoice.description);
  }
  doc.moveDown();

  const columns = { description: 50, quantity: 320, unit: 390, total: 475 };
  const drawHeader = () => {
    doc.rect(50, doc.y, 512, 24).fill("#172554");
    const y = doc.y + 7;
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#ffffff")
      .text("DESCRIPTION", columns.description, y, { width: 250 })
      .text("QTY", columns.quantity, y, { width: 50, align: "right" })
      .text("UNIT PRICE", columns.unit, y, { width: 70, align: "right" })
      .text("AMOUNT", columns.total, y, { width: 87, align: "right" });
    doc.y += 28;
  };
  drawHeader();

  const lineItems = Array.isArray(invoice.lineItems)
    ? (invoice.lineItems as InvoiceLineItem[])
    : [];
  for (const item of lineItems) {
    addPageIfNeeded(doc, 32);
    if (doc.y < 70) drawHeader();
    const y = doc.y;
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    doc.font("Helvetica").fontSize(9).fillColor("#111827")
      .text(String(item.description ?? "Service"), columns.description, y, { width: 250 })
      .text(Number.isFinite(quantity) ? String(quantity) : "0", columns.quantity, y, { width: 50, align: "right" })
      .text(money(unitPrice), columns.unit, y, { width: 70, align: "right" })
      .text(money(item.total ?? quantity * unitPrice), columns.total, y, { width: 87, align: "right" });
    doc.y = Math.max(doc.y, y + 25);
    doc.moveTo(50, doc.y).lineTo(562, doc.y).strokeColor("#e5e7eb").stroke();
    doc.y += 7;
  }

  addPageIfNeeded(doc, 125);
  const totalsX = 370;
  const totalRow = (label: string, value: unknown, bold = false) => {
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).fillColor("#111827")
      .text(label, totalsX, y, { width: 95 })
      .text(money(value), 475, y, { width: 87, align: "right" });
    doc.y = y + (bold ? 22 : 17);
  };
  totalRow("Subtotal", invoice.subtotal);
  totalRow(`Tax (${Number(invoice.taxRate || 0).toFixed(2)}%)`, invoice.taxAmount);
  if (Number(invoice.discount || 0) !== 0) totalRow("Discount", -Number(invoice.discount));
  totalRow("Total", invoice.total, true);
  if (Number(invoice.amountPaid || 0) > 0) totalRow("Paid", -Number(invoice.amountPaid));
  totalRow("Amount Due", invoice.amountDue, true);

  addPageIfNeeded(doc, 110);
  doc.moveDown();
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#172554").text("PAYMENT INSTRUCTIONS");
  doc.font("Helvetica").fontSize(10).fillColor("#111827").text(
    invoice.paymentNotes?.trim()
      || `Please remit ${money(invoice.amountDue)} by ${date(invoice.dueDate)}. Contact ${company?.email || contractor.email || brand} with payment questions.`,
  );
  if (invoice.termsAndConditions) {
    doc.moveDown();
    doc.font("Helvetica-Bold").text("TERMS");
    doc.font("Helvetica").text(invoice.termsAndConditions);
  }
  if (invoice.notes) {
    doc.moveDown();
    doc.font("Helvetica-Bold").text("NOTES");
    doc.font("Helvetica").text(invoice.notes);
  }

  doc.end();
  return completed;
}