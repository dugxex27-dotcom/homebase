import OpenAI from "openai";

export interface InvoiceExtraction {
  isValidInvoice: boolean; // false if image is not an invoice/receipt at all
  invalidReason: string | null; // populated when isValidInvoice is false
  serviceDescription: string | null;
  serviceDate: string | null;
  totalAmount: number | null;
  contractorName: string | null;
  contractorCompany: string | null;
  homeArea: string | null;
  serviceType: string | null;
  aiConfidence: "high" | "medium" | "low";
  aiNotes: string | null;
}

export interface DIYVerification {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  notes: string;
  workDescribed: string | null;
  materialsIdentified: string[];
}

const INVOICE_PROMPT = `You are extracting home maintenance service details from an invoice, receipt, or work order photo.

FIRST: Determine if this image is a home maintenance invoice, receipt, or work order. If not (e.g. selfie, unrelated photo, blank image, food receipt), set isValidInvoice to false and fill invalidReason.

Return ONLY a JSON object with these fields:
{
  "isValidInvoice": true if this looks like a home service invoice/receipt, false otherwise,
  "invalidReason": "brief reason if not valid, e.g. 'Image does not appear to be a home service invoice', or null if valid",
  "serviceDescription": "concise description of what work was done (1-2 sentences), or null",
  "serviceDate": "date of service in YYYY-MM-DD format, or null",
  "totalAmount": number (dollars, no currency symbol) or null,
  "contractorName": "name of technician or contractor, or null",
  "contractorCompany": "company or business name, or null",
  "homeArea": "one of: hvac, plumbing, electrical, roof, foundation, siding, windows, doors, flooring, kitchen, bathroom, basement, attic, garage, landscaping, driveway, gutters, chimney, septic, well, other, or null",
  "serviceType": "one of: maintenance, repair, installation, replacement, inspection, cleaning, upgrade, emergency, other, or null",
  "aiConfidence": "high if most fields found clearly, medium if some fields missing/uncertain, low if image is unclear or few fields found",
  "aiNotes": "any caveats, e.g. 'date partially obscured', 'handwritten invoice difficult to read', or null"
}`;

const INVOICE_TEXT_PROMPT = `You are extracting home maintenance service details from the text of an invoice, receipt, or work order.

FIRST: Determine if the text represents a home maintenance invoice, receipt, or work order. If not (e.g. food receipt, unrelated document, blank), set isValidInvoice to false and fill invalidReason.

Return ONLY a JSON object with these fields:
{
  "isValidInvoice": true if this looks like a home service invoice/receipt, false otherwise,
  "invalidReason": "brief reason if not valid, e.g. 'Text does not appear to be a home service invoice', or null if valid",
  "serviceDescription": "concise description of what work was done (1-2 sentences), or null",
  "serviceDate": "date of service in YYYY-MM-DD format, or null",
  "totalAmount": number (dollars, no currency symbol) or null,
  "contractorName": "name of technician or contractor, or null",
  "contractorCompany": "company or business name, or null",
  "homeArea": "one of: hvac, plumbing, electrical, roof, foundation, siding, windows, doors, flooring, kitchen, bathroom, basement, attic, garage, landscaping, driveway, gutters, chimney, septic, well, other, or null",
  "serviceType": "one of: maintenance, repair, installation, replacement, inspection, cleaning, upgrade, emergency, other, or null",
  "aiConfidence": "high if most fields found clearly, medium if some fields missing/uncertain, low if text is unclear or few fields found",
  "aiNotes": "any caveats, e.g. 'date partially obscured', 'amount unclear', or null"
}

Invoice text:
`;

const DIY_VERIFICATION_PROMPT = `You are verifying that photos show legitimate DIY home maintenance work.
Analyze these photos and return ONLY a JSON object:
{
  "verified": true if photos clearly show before/after DIY work or purchase receipts for materials,
  "confidence": "high" | "medium" | "low",
  "notes": "brief explanation of what you see and why you did or did not verify",
  "workDescribed": "concise description of the work visible in photos, or null",
  "materialsIdentified": ["list of any materials or tools visible in photos"]
}`;

/** Parse a GPT JSON response string into an InvoiceExtraction object. */
function parseExtractionResponse(raw: string): InvoiceExtraction {
  const parsed = JSON.parse(raw);
  const isValidInvoice = parsed.isValidInvoice !== false;
  return {
    isValidInvoice,
    invalidReason: isValidInvoice ? null : (parsed.invalidReason ?? "Image does not appear to be a home service invoice"),
    serviceDescription: parsed.serviceDescription ?? null,
    serviceDate: parsed.serviceDate ?? null,
    totalAmount:
      typeof parsed.totalAmount === "number" ? parsed.totalAmount : null,
    contractorName: parsed.contractorName ?? null,
    contractorCompany: parsed.contractorCompany ?? null,
    homeArea: parsed.homeArea ?? null,
    serviceType: parsed.serviceType ?? null,
    aiConfidence: (["high", "medium", "low"].includes(parsed.aiConfidence)
      ? parsed.aiConfidence
      : "low") as "high" | "medium" | "low",
    aiNotes: parsed.aiNotes ?? null,
  };
}

/**
 * Minimum character count for extracted PDF text to be considered usable.
 * Short strings (< 50 chars) likely came from a scanned/image-only PDF and
 * should fall back to the vision path instead.
 */
export const PDF_TEXT_MIN_LENGTH = 50;

/**
 * Attempt to extract plain text from a base64-encoded PDF using pdf-parse.
 * Returns the trimmed text string, or null if extraction fails or the PDF
 * contains no readable text (i.e. it is a scanned/image-only PDF).
 */
export async function tryExtractPdfText(pdfBase64: string): Promise<string | null> {
  try {
    const pdfBuffer = Buffer.from(pdfBase64, "base64");
    const { PDFParse, VerbosityLevel } = await import("pdf-parse");
    const parser = new PDFParse({ data: pdfBuffer, verbosity: VerbosityLevel.ERRORS });
    const result = await parser.getText();
    const text = result.text?.trim() ?? "";
    return text.length >= PDF_TEXT_MIN_LENGTH ? text : null;
  } catch {
    return null;
  }
}

export async function extractInvoiceData(
  imageBase64: string,
  mimeType: string
): Promise<InvoiceExtraction> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // PDF fast path: text extraction is more reliable than vision for text-heavy
  // digital invoices. Only falls back to vision for scanned/image-only PDFs.
  if (mimeType === "application/pdf") {
    const pdfText = await tryExtractPdfText(imageBase64);
    if (pdfText !== null) {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: INVOICE_TEXT_PROMPT + pdfText,
          },
        ],
        max_tokens: 500,
        response_format: { type: "json_object" },
      });
      const raw = response.choices[0]?.message?.content ?? "{}";
      return parseExtractionResponse(raw);
    }
    // pdfText is null: scanned/image-only PDF — fall through to vision
  }

  // Vision path: images and scanned PDFs (no readable text layer)
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: INVOICE_PROMPT },
          {
            type: "image_url",
            image_url: { url: `data:${mimeType};base64,${imageBase64}` },
          },
        ],
      },
    ],
    max_tokens: 500,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return parseExtractionResponse(raw);
}

export async function verifyDIYPhotos(
  photoBase64List: Array<{ base64: string; mimeType: string }>
): Promise<DIYVerification> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const imageContent = photoBase64List.map((p) => ({
    type: "image_url" as const,
    image_url: { url: `data:${p.mimeType};base64,${p.base64}` },
  }));

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: DIY_VERIFICATION_PROMPT },
          ...imageContent,
        ],
      },
    ],
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);

  return {
    verified: Boolean(parsed.verified),
    confidence: (["high", "medium", "low"].includes(parsed.confidence)
      ? parsed.confidence
      : "low") as "high" | "medium" | "low",
    notes: parsed.notes ?? "Unable to verify photos",
    workDescribed: parsed.workDescribed ?? null,
    materialsIdentified: Array.isArray(parsed.materialsIdentified)
      ? parsed.materialsIdentified
      : [],
  };
}
