import OpenAI from "openai";

export interface InvoiceExtraction {
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
Return ONLY a JSON object with these fields (use null for any field you cannot find or read clearly):
{
  "serviceDescription": "concise description of what work was done (1-2 sentences)",
  "serviceDate": "date of service in YYYY-MM-DD format, or null",
  "totalAmount": number (dollars, no currency symbol) or null,
  "contractorName": "name of technician or contractor, or null",
  "contractorCompany": "company or business name, or null",
  "homeArea": "one of: hvac, plumbing, electrical, roof, foundation, siding, windows, doors, flooring, kitchen, bathroom, basement, attic, garage, landscaping, driveway, gutters, chimney, septic, well, other",
  "serviceType": "one of: maintenance, repair, installation, replacement, inspection, cleaning, upgrade, emergency, other",
  "aiConfidence": "high if most fields found clearly, medium if some fields missing/uncertain, low if image is unclear or few fields found",
  "aiNotes": "any caveats, e.g. 'date partially obscured', 'handwritten invoice difficult to read', or null"
}`;

const DIY_VERIFICATION_PROMPT = `You are verifying that photos show legitimate DIY home maintenance work.
Analyze these photos and return ONLY a JSON object:
{
  "verified": true if photos clearly show before/after DIY work or purchase receipts for materials,
  "confidence": "high" | "medium" | "low",
  "notes": "brief explanation of what you see and why you did or did not verify",
  "workDescribed": "concise description of the work visible in photos, or null",
  "materialsIdentified": ["list of any materials or tools visible in photos"]
}`;

export async function extractInvoiceData(
  imageBase64: string,
  mimeType: string
): Promise<InvoiceExtraction> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  const parsed = JSON.parse(raw);

  return {
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
