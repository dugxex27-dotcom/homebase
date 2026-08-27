import { describe, expect, it } from "vitest";
import {
  normalizeServiceRecordMutationInput,
  ServiceRecordInputError,
} from "./service-record-normalization";

describe("normalizeServiceRecordMutationInput", () => {
  it.each([
    [125, "125.00"],
    ["125", "125.00"],
    ["125.75", "125.75"],
    [0, "0.00"],
  ])("normalizes cost %p to %p", (cost, expected) => {
    expect(normalizeServiceRecordMutationInput({ cost })).toEqual({
      cost: expected,
    });
  });

  it("omits an absent cost property", () => {
    expect(normalizeServiceRecordMutationInput({})).toEqual({});
  });

  it.each([null, ""])("preserves a missing cost value %p as null", (cost) => {
    expect(normalizeServiceRecordMutationInput({ cost })).toEqual({
      cost: null,
    });
  });

  it.each(["not-a-number", "NaN", -1, Number.POSITIVE_INFINITY])(
    "rejects invalid cost %p",
    (cost) => {
      expect(() => normalizeServiceRecordMutationInput({ cost })).toThrow(
        ServiceRecordInputError,
      );
    },
  );

  it("parses service and follow-up dates into canonical storage strings", () => {
    expect(
      normalizeServiceRecordMutationInput({
        serviceDate: "2026-08-27",
        followUpDate: "2026-09-05",
      }),
    ).toEqual({
      serviceDate: "2026-08-27",
      followUpDate: "2026-09-05",
    });
  });

  it("preserves null when an optional follow-up date is cleared", () => {
    expect(
      normalizeServiceRecordMutationInput({ followUpDate: null }),
    ).toEqual({ followUpDate: null });
  });

  it.each([
    { serviceDate: "2026-02-30" },
    { serviceDate: "08/27/2026" },
    { serviceDate: null },
    { followUpDate: "not-a-date" },
  ])("rejects invalid date input %p", (input) => {
    expect(() => normalizeServiceRecordMutationInput(input)).toThrow(
      ServiceRecordInputError,
    );
  });

  it("drops server-owned and unknown fields", () => {
    expect(
      normalizeServiceRecordMutationInput({
        customerName: "Taylor",
        contractorId: "other-contractor",
        createdAt: "2026-08-27T00:00:00.000Z",
        unexpected: true,
      }),
    ).toEqual({ customerName: "Taylor" });
  });
});