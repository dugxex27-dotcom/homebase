import { describe, expect, it } from "vitest";
import {
  CRM_INVOICE_DUPLICATE_WINDOW_MS,
  findRecentDuplicateCrmInvoice,
} from "./routes";

const now = new Date("2026-09-08T12:00:00.000Z").getTime();
const candidate = {
  contractorUserId: "contractor-1",
  homeownerId: "homeowner-1",
  title: "Replace water heater",
  amountDue: "1250.00",
};

describe("findRecentDuplicateCrmInvoice", () => {
  it("returns an identical invoice created within five minutes", () => {
    const existing = {
      id: "invoice-existing",
      ...candidate,
      amountDue: 1250,
      createdAt: new Date(now - CRM_INVOICE_DUPLICATE_WINDOW_MS),
    };

    expect(findRecentDuplicateCrmInvoice([existing], candidate, now)).toBe(existing);
  });

  it("does not match an otherwise identical invoice from another contractor", () => {
    const existing = {
      ...candidate,
      contractorUserId: "contractor-2",
      createdAt: new Date(now - 1_000),
    };

    expect(findRecentDuplicateCrmInvoice([existing], candidate, now)).toBeUndefined();
  });

  it("does not match an identical invoice older than five minutes", () => {
    const existing = {
      ...candidate,
      createdAt: new Date(now - CRM_INVOICE_DUPLICATE_WINDOW_MS - 1),
    };

    expect(findRecentDuplicateCrmInvoice([existing], candidate, now)).toBeUndefined();
  });

  it.each([
    ["homeowner", { homeownerId: "homeowner-2" }],
    ["title", { title: "Repair furnace" }],
    ["amount", { amountDue: "1250.01" }],
  ])("does not match when the %s differs", (_field, difference) => {
    const existing = {
      ...candidate,
      ...difference,
      createdAt: new Date(now - 1_000),
    };

    expect(findRecentDuplicateCrmInvoice([existing], candidate, now)).toBeUndefined();
  });
});