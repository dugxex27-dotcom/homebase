import { describe, expect, it } from "vitest";
import {
  getServiceRecordCostInputValue,
  getServiceRecordCostState,
  parseServiceRecordCost,
} from "./service-record-cost";

describe("service record cost formatting", () => {
  it.each([
    [125, 125],
    ["125", 125],
    ["125.75", 125.75],
    [null, null],
    [undefined, null],
    ["", null],
    ["invalid", null],
  ])("parses %p safely", (value, expected) => {
    expect(parseServiceRecordCost(value)).toBe(expected);
  });

  it("formats numeric and numeric-string costs", () => {
    expect(getServiceRecordCostState(125).label).toBe("$125.00");
    expect(getServiceRecordCostState("125.75").label).toBe("$125.75");
  });

  it("distinguishes missing and invalid costs", () => {
    expect(getServiceRecordCostState(null)).toEqual({
      kind: "missing",
      label: "Cost not provided",
    });
    expect(getServiceRecordCostState("invalid")).toEqual({
      kind: "invalid",
      label: "Cost unavailable",
    });
  });

  it("does not put malformed values into the edit form", () => {
    expect(getServiceRecordCostInputValue("89.95")).toBe("89.95");
    expect(getServiceRecordCostInputValue(null)).toBe("");
    expect(getServiceRecordCostInputValue("invalid")).toBe("");
  });
});