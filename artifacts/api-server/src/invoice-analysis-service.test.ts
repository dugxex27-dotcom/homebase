/**
 * Unit tests for invoice-analysis-service.ts
 *
 * Covers:
 *  - tryExtractPdfText: successful extraction, failure fallback, short-text fallback
 *  - extractInvoiceData: PDF text fast path vs vision fallback
 *  - extractInvoiceData: image/jpeg always uses vision path
 */

import { vi, describe, it, expect, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Shared mock state — must use vi.hoisted() so they are in scope inside the
// vi.mock() factory closures, which are hoisted to the top of the file by Vitest.
// ---------------------------------------------------------------------------

const { mockChatCompletionsCreate, mockGetText, MockPDFParse } = vi.hoisted(() => {
  const mockGetText = vi.fn();
  const MockPDFParse = vi.fn(function (this: any) {
    this.getText = mockGetText;
  });
  return {
    mockChatCompletionsCreate: vi.fn(),
    mockGetText,
    MockPDFParse,
  };
});

vi.mock("openai", () => ({
  default: class MockOpenAI {
    chat = { completions: { create: mockChatCompletionsCreate } };
  },
}));

vi.mock("pdf-parse", () => ({
  PDFParse: MockPDFParse,
  VerbosityLevel: { ERRORS: 0 },
}));

// ---------------------------------------------------------------------------
// Imports (after vi.mock blocks)
// ---------------------------------------------------------------------------

import {
  extractInvoiceData,
  tryExtractPdfText,
  PDF_TEXT_MIN_LENGTH,
} from "./invoice-analysis-service";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal valid InvoiceExtraction JSON that GPT would return. */
function makeGptResponse(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    isValidInvoice: true,
    invalidReason: null,
    serviceDescription: "HVAC annual service",
    serviceDate: "2026-03-15",
    totalAmount: 250,
    contractorName: "Alice Smith",
    contractorCompany: "Cool Air LLC",
    homeArea: "hvac",
    serviceType: "maintenance",
    aiConfidence: "high",
    aiNotes: null,
    ...overrides,
  });
}

function makeGptCompletionResponse(content: string) {
  return {
    choices: [{ message: { content } }],
  };
}

// ---------------------------------------------------------------------------
// tryExtractPdfText
// ---------------------------------------------------------------------------

describe("tryExtractPdfText", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns extracted text when pdf-parse succeeds and text is long enough", async () => {
    const longText = "A".repeat(PDF_TEXT_MIN_LENGTH + 10);
    mockGetText.mockResolvedValue({ text: longText });

    const result = await tryExtractPdfText("dGVzdA=="); // base64("test")
    expect(result).toBe(longText);
  });

  it("returns null when extracted text is shorter than PDF_TEXT_MIN_LENGTH", async () => {
    const shortText = "A".repeat(PDF_TEXT_MIN_LENGTH - 1);
    mockGetText.mockResolvedValue({ text: shortText });

    const result = await tryExtractPdfText("dGVzdA==");
    expect(result).toBeNull();
  });

  it("returns null when extracted text is empty", async () => {
    mockGetText.mockResolvedValue({ text: "" });

    const result = await tryExtractPdfText("dGVzdA==");
    expect(result).toBeNull();
  });

  it("returns null when pdf-parse throws (e.g. corrupted/scanned PDF)", async () => {
    mockGetText.mockRejectedValue(new Error("pdf parse error"));

    const result = await tryExtractPdfText("dGVzdA==");
    expect(result).toBeNull();
  });

  it("returns null when result.text is undefined", async () => {
    mockGetText.mockResolvedValue({ text: undefined });

    const result = await tryExtractPdfText("dGVzdA==");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// extractInvoiceData — PDF text fast path
// ---------------------------------------------------------------------------

describe("extractInvoiceData — PDF mimeType", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the text extraction path (not vision) when PDF text is readable", async () => {
    const pdfText = "A".repeat(PDF_TEXT_MIN_LENGTH + 20);
    mockGetText.mockResolvedValue({ text: pdfText });
    mockChatCompletionsCreate.mockResolvedValue(
      makeGptCompletionResponse(makeGptResponse())
    );

    const result = await extractInvoiceData("dGVzdA==", "application/pdf");

    expect(result.isValidInvoice).toBe(true);
    expect(result.serviceDescription).toBe("HVAC annual service");

    // The text path sends a plain string message, NOT an image_url content block.
    const call = mockChatCompletionsCreate.mock.calls[0][0];
    const content = call.messages[0].content;
    // Text-path: content is a string (not an array with image_url)
    expect(typeof content).toBe("string");
    expect(content).toContain(pdfText);
  });

  it("falls back to vision when PDF text extraction returns null (scanned PDF)", async () => {
    // Simulate scanned PDF: pdf-parse returns text shorter than minimum
    mockGetText.mockResolvedValue({ text: "abc" });
    mockChatCompletionsCreate.mockResolvedValue(
      makeGptCompletionResponse(makeGptResponse())
    );

    await extractInvoiceData("dGVzdA==", "application/pdf");

    // Vision path: content is an array with an image_url entry
    const call = mockChatCompletionsCreate.mock.calls[0][0];
    const content = call.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    const imageBlock = content.find((c: any) => c.type === "image_url");
    expect(imageBlock).toBeDefined();
    expect(imageBlock.image_url.url).toMatch(/^data:application\/pdf;base64,/);
  });

  it("falls back to vision when pdf-parse throws (corrupted/password-protected PDF)", async () => {
    mockGetText.mockRejectedValue(new Error("encrypted PDF"));
    mockChatCompletionsCreate.mockResolvedValue(
      makeGptCompletionResponse(makeGptResponse())
    );

    await extractInvoiceData("dGVzdA==", "application/pdf");

    const call = mockChatCompletionsCreate.mock.calls[0][0];
    const content = call.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    const imageBlock = content.find((c: any) => c.type === "image_url");
    expect(imageBlock).toBeDefined();
  });

  it("correctly parses the GPT response from the text path", async () => {
    const pdfText = "B".repeat(PDF_TEXT_MIN_LENGTH + 5);
    mockGetText.mockResolvedValue({ text: pdfText });
    mockChatCompletionsCreate.mockResolvedValue(
      makeGptCompletionResponse(
        makeGptResponse({
          serviceDate: "2025-11-01",
          totalAmount: 480,
          contractorName: "Bob Jones",
          aiConfidence: "medium",
        })
      )
    );

    const result = await extractInvoiceData("dGVzdA==", "application/pdf");

    expect(result.isValidInvoice).toBe(true);
    expect(result.serviceDate).toBe("2025-11-01");
    expect(result.totalAmount).toBe(480);
    expect(result.contractorName).toBe("Bob Jones");
    expect(result.aiConfidence).toBe("medium");
  });

  it("handles isValidInvoice=false from GPT via the text path", async () => {
    const pdfText = "C".repeat(PDF_TEXT_MIN_LENGTH + 5);
    mockGetText.mockResolvedValue({ text: pdfText });
    mockChatCompletionsCreate.mockResolvedValue(
      makeGptCompletionResponse(
        JSON.stringify({
          isValidInvoice: false,
          invalidReason: "Text does not appear to be a home service invoice",
          serviceDescription: null,
          serviceDate: null,
          totalAmount: null,
          contractorName: null,
          contractorCompany: null,
          homeArea: null,
          serviceType: null,
          aiConfidence: "low",
          aiNotes: null,
        })
      )
    );

    const result = await extractInvoiceData("dGVzdA==", "application/pdf");

    expect(result.isValidInvoice).toBe(false);
    expect(result.invalidReason).toBe("Text does not appear to be a home service invoice");
  });
});

// ---------------------------------------------------------------------------
// extractInvoiceData — non-PDF (vision path always)
// ---------------------------------------------------------------------------

describe("extractInvoiceData — image mimeTypes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("always uses the vision path for image/jpeg", async () => {
    mockChatCompletionsCreate.mockResolvedValue(
      makeGptCompletionResponse(makeGptResponse())
    );

    await extractInvoiceData("dGVzdA==", "image/jpeg");

    // pdf-parse should never be called for non-PDF types
    expect(MockPDFParse).not.toHaveBeenCalled();

    const call = mockChatCompletionsCreate.mock.calls[0][0];
    const content = call.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    const imageBlock = content.find((c: any) => c.type === "image_url");
    expect(imageBlock).toBeDefined();
    expect(imageBlock.image_url.url).toMatch(/^data:image\/jpeg;base64,/);
  });

  it("always uses the vision path for image/png", async () => {
    mockChatCompletionsCreate.mockResolvedValue(
      makeGptCompletionResponse(makeGptResponse())
    );

    await extractInvoiceData("dGVzdA==", "image/png");

    expect(MockPDFParse).not.toHaveBeenCalled();

    const call = mockChatCompletionsCreate.mock.calls[0][0];
    const content = call.messages[0].content;
    expect(Array.isArray(content)).toBe(true);
    const imageBlock = content.find((c: any) => c.type === "image_url");
    expect(imageBlock.image_url.url).toMatch(/^data:image\/png;base64,/);
  });
});
