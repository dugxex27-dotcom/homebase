import OpenAI from "openai";

function createOpenAIClient(): OpenAI {
  const replitBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const replitApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  return new OpenAI({
    apiKey: replitApiKey || process.env.OPENAI_API_KEY,
    ...(replitBaseUrl ? { baseURL: replitBaseUrl } : {}),
  });
}

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
  /** A soft signal only; this must never independently reject a submission. */
  fraudRiskFlag?: boolean;
  /** Stable, machine-readable reasons for the soft risk signal. */
  fraudRiskReasons?: string[];
}

export type DIYPhotoRole = "before" | "after" | "receipt";

export interface DIYPhotoInput {
  base64: string;
  mimeType: string;
  role: DIYPhotoRole;
}

export interface DIYVerificationContext {
  claimedTaskTitle: string;
  claimedCategory: string;
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
The homeowner's claimed task context will be provided before the images. Compare the visible work to that claim, but do not infer a final health-score or verification tier.

Each image is preceded by an explicit role label:
- BEFORE PHOTO: the condition before the claimed work
- AFTER PHOTO: the condition after the claimed work
- RECEIPT PHOTO: a purchase receipt or materials record

Return ONLY a JSON object. A fraud-risk flag is a soft review signal: it must not independently make "verified" false when the photos otherwise show the claimed work.
{
  "verified": true if photos clearly show before/after DIY work or purchase receipts for materials,
  "confidence": "high" | "medium" | "low",
  "notes": "brief explanation of what you see and why you did or did not verify",
  "workDescribed": "concise description of the work visible in photos, or null",
  "materialsIdentified": ["list of any materials or tools visible in photos"],
  "fraudRiskFlag": true only when there is a soft reason to send this evidence for review, otherwise false,
  "fraudRiskReasons": ["zero or more stable reason codes from: claimed_work_mismatch, reused_or_stock_image, insufficient_before_after_evidence, receipt_mismatch, other"]
}`;

const DIY_FRAUD_RISK_REASONS = new Set([
  "claimed_work_mismatch",
  "reused_or_stock_image",
  "insufficient_before_after_evidence",
  "receipt_mismatch",
  "other",
]);

export function buildDIYVerificationPrompt(context: DIYVerificationContext): string {
  const title = context.claimedTaskTitle.trim() || "DIY home maintenance";
  const category = context.claimedCategory.trim() || "general maintenance";
  return `${DIY_VERIFICATION_PROMPT}

Claimed task title: ${title}
Claimed maintenance category: ${category}

Evaluate the role-labeled images below against this claimed task.`;
}

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

/**
 * Static, realistic example data returned for demo accounts instead of a
 * real GPT-4o call. Demo prospects are evaluating the product, not actually
 * paying a contractor or doing DIY work — a real AI vision call here would
 * burn real API cost per demo click with no corresponding value (the "photo"
 * is usually not even a real invoice). The mock still exercises the full
 * confirm/reject/maintenance-log UI flow end to end.
 */
export function getMockInvoiceExtraction(): InvoiceExtraction {
  return {
    isValidInvoice: true,
    invalidReason: null,
    serviceDescription: "Annual HVAC system tune-up, filter replacement, and refrigerant level check",
    serviceDate: new Date().toISOString().split("T")[0],
    totalAmount: 189,
    contractorName: "David Martinez",
    contractorCompany: "Precision HVAC Services",
    homeArea: "hvac",
    serviceType: "maintenance",
    aiConfidence: "high",
    aiNotes: "This is a sample AI analysis shown for demo accounts — no AI service was called. In the full product, this reflects the invoice you actually upload.",
  };
}

/**
 * Static, realistic example data returned for demo accounts instead of a
 * real GPT-4o vision call on uploaded before/after photos. See
 * getMockInvoiceExtraction for rationale.
 */
export function getMockDIYVerification(): DIYVerification {
  return {
    verified: true,
    confidence: "high",
    notes: "This is a sample AI verification shown for demo accounts — no AI service was called. In the full product, this confirms your before/after photos show completed work.",
    workDescribed: "Replaced a worn kitchen faucet and resealed the surrounding countertop with silicone caulk",
    materialsIdentified: ["Faucet", "Plumber's tape", "Silicone caulk"],
    fraudRiskFlag: false,
    fraudRiskReasons: [],
  };
}

export async function extractInvoiceData(
  imageBase64: string,
  mimeType: string
): Promise<InvoiceExtraction> {
  const openai = createOpenAIClient();

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
  photoBase64List: DIYPhotoInput[],
  context: DIYVerificationContext = {
    claimedTaskTitle: "DIY home maintenance",
    claimedCategory: "general maintenance",
  },
): Promise<DIYVerification> {
  const openai = createOpenAIClient();

  const roleCounts: Record<DIYPhotoRole, number> = {
    before: 0,
    after: 0,
    receipt: 0,
  };
  const imageContent = photoBase64List.flatMap((p) => {
    roleCounts[p.role] += 1;
    return [
      {
        type: "text" as const,
        text: `${p.role.toUpperCase()} PHOTO ${roleCounts[p.role]}:`,
      },
      {
        type: "image_url" as const,
        image_url: { url: `data:${p.mimeType};base64,${p.base64}` },
      },
    ];
  });

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildDIYVerificationPrompt(context) },
          ...imageContent,
        ],
      },
    ],
    max_tokens: 400,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw);
  const fraudRiskReasons = Array.isArray(parsed.fraudRiskReasons)
    ? parsed.fraudRiskReasons.filter(
        (reason: unknown): reason is string =>
          typeof reason === "string" && DIY_FRAUD_RISK_REASONS.has(reason),
      )
    : [];
  const fraudRiskFlag = parsed.fraudRiskFlag === true;

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
    fraudRiskFlag,
    fraudRiskReasons: fraudRiskFlag && fraudRiskReasons.length === 0
      ? ["other"]
      : fraudRiskReasons,
  };
}
