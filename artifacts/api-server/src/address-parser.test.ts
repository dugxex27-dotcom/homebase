import { describe, it, expect } from "vitest";
import { splitCombinedAddress, normalizeAddress } from "./address-parser";

describe("splitCombinedAddress", () => {
  it("parses a standard 'street, city, ST zip' address", () => {
    const result = splitCombinedAddress("2847 Maple Drive, Seattle, WA 98101");
    expect(result).toEqual({
      street: "2847 Maple Drive",
      city: "Seattle",
      state: "WA",
      zip: "98101",
    });
  });

  it("parses an address with a zip+4", () => {
    const result = splitCombinedAddress("123 Test Street, Austin, TX 78701-1234");
    expect(result).not.toBeNull();
    expect(result!.state).toBe("TX");
    expect(result!.zip).toBe("78701");
  });

  it("parses a verbose geocoded address with full state name and separate zip part", () => {
    const result = splitCombinedAddress(
      "44 Crown Acres Road, Centereach, Town of Brookhaven, Suffolk County, New York, 11720, United States",
    );
    expect(result).not.toBeNull();
    expect(result!.street).toBe("44 Crown Acres Road");
    expect(result!.state).toBe("NY");
    expect(result!.zip).toBe("11720");
  });

  it("parses a verbose address without a trailing country segment", () => {
    const result = splitCombinedAddress(
      "10 Farmstead Road, Town of Smithtown, Suffolk County, New York, 11725",
    );
    expect(result).not.toBeNull();
    expect(result!.state).toBe("NY");
    expect(result!.zip).toBe("11725");
  });

  it("returns null when no state can be identified", () => {
    expect(splitCombinedAddress("123 Main Street, Nowhereville")).toBeNull();
  });

  it("returns null when no zip can be identified", () => {
    expect(splitCombinedAddress("123 Main Street, Seattle, WA")).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(splitCombinedAddress("")).toBeNull();
  });
});

describe("normalizeAddress", () => {
  it("produces a stable, uppercased, deterministic normalized string", () => {
    const a = normalizeAddress("2847 Maple Drive", "Seattle", "wa", "98101");
    const b = normalizeAddress("2847 maple drive", "SEATTLE", "WA", "98101");
    expect(a.normalizedString).toBe(b.normalizedString);
    expect(a.normalizedString).toContain("SEATTLE");
    expect(a.normalizedString).toContain("WA");
    expect(a.normalizedString).toContain("98101");
  });

  it("expands common street suffixes and directionals consistently", () => {
    const result = normalizeAddress("123 N Main St", "Springfield", "IL", "62701");
    expect(result.streetSuffix).toBe("ST");
    expect(result.streetName).toContain("N");
    expect(result.streetName).toContain("MAIN");
  });

  it("normalizes unit designations", () => {
    const result = normalizeAddress("100 Elm St", "Portland", "OR", "97201", "Apt 4B");
    expect(result.unit).toBe("APT 4B");
  });
});
