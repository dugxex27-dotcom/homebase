import { describe, expect, it } from "vitest";
import {
  contractorMatchesTaskCategory,
  inferTaskTradeCategory,
} from "./contractor-category-match";

describe("maintenance task contractor category matching", () => {
  it.each([
    ["Replace HVAC filter", "HVAC"],
    ["Flush the water heater", "Plumbing"],
    ["Inspect roof flashing", "Roofing"],
    ["Clean gutters and downspouts", "Gutters"],
    ["Test electrical panel breakers", "Electrical"],
  ])("infers a trade for %s", (title, expectedCategory) => {
    expect(inferTaskTradeCategory(title, "General Maintenance")).toBe(expectedCategory);
  });

  it("keeps an explicit custom-task category when the title has no known trade", () => {
    expect(inferTaskTradeCategory("Annual specialist inspection", "Masonry")).toBe("Masonry");
  });

  it("matches common equivalent service names without selecting unrelated trades", () => {
    expect(contractorMatchesTaskCategory({ services: ["Heating & Cooling"] }, "HVAC")).toBe(true);
    expect(contractorMatchesTaskCategory({ services: ["Plumbing Repair"] }, "Plumbing")).toBe(true);
    expect(contractorMatchesTaskCategory({ services: ["Roofing Services"] }, "Roofing")).toBe(true);
    expect(contractorMatchesTaskCategory({ services: ["Electrical"] }, "HVAC")).toBe(false);
  });

  it("returns no match for an empty category", () => {
    expect(contractorMatchesTaskCategory({ services: ["HVAC Repair"] }, "")).toBe(false);
  });
});
