import { describe, it, expect } from "vitest";
import { splitCombinedAddress, normalizeAddress, extractUnitFromStreet } from "./address-parser";

describe("splitCombinedAddress", () => {
  it("parses a standard 'street, city, ST zip' address", () => {
    const result = splitCombinedAddress("2847 Maple Drive, Seattle, WA 98101");
    expect(result).toEqual({
      street: "2847 Maple Drive",
      city: "Seattle",
      state: "WA",
      zip: "98101",
      unit: "",
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

  it("extracts an 'Apt' unit embedded in the street segment", () => {
    const result = splitCombinedAddress("789 Main St Apt 12, Seattle, WA 98101");
    expect(result).toEqual({
      street: "789 Main St",
      city: "Seattle",
      state: "WA",
      zip: "98101",
      unit: "Apt 12",
    });
  });

  it("extracts a 'Unit' token that is its own comma-separated segment", () => {
    const result = splitCombinedAddress("789 Main St, Unit 5B, Seattle, WA 98101");
    expect(result).toEqual({
      street: "789 Main St",
      city: "Seattle",
      state: "WA",
      zip: "98101",
      unit: "Unit 5B",
    });
  });

  it("extracts a 'Suite' token", () => {
    const result = splitCombinedAddress("500 Corporate Pkwy Suite 200, Austin, TX 78701");
    expect(result).toEqual({
      street: "500 Corporate Pkwy",
      city: "Austin",
      state: "TX",
      zip: "78701",
      unit: "Suite 200",
    });
  });

  it("extracts a '#' unit token", () => {
    const result = splitCombinedAddress("42 Ocean Ave #4, Miami, FL 33101");
    expect(result).toEqual({
      street: "42 Ocean Ave",
      city: "Miami",
      state: "FL",
      zip: "33101",
      unit: "# 4",
    });
  });

  it("leaves the unit empty when no apartment/unit/suite token is present", () => {
    const result = splitCombinedAddress("2847 Maple Drive, Seattle, WA 98101");
    expect(result?.unit).toBe("");
  });

  it("extracts a unit that is its own segment in a verbose address with a full state name and separate zip", () => {
    const result = splitCombinedAddress("789 Main St, Apt 12, Seattle, Washington, 98101");
    expect(result).not.toBeNull();
    expect(result!.street).toBe("789 Main St");
    expect(result!.city).toBe("Seattle");
    expect(result!.state).toBe("WA");
    expect(result!.zip).toBe("98101");
    expect(result!.unit).toBe("Apt 12");
  });

  it("extracts a unit embedded in the street segment of a verbose address", () => {
    const result = splitCombinedAddress(
      "44 Crown Acres Road Unit 3, Centereach, Town of Brookhaven, Suffolk County, New York, 11720, United States",
    );
    expect(result).not.toBeNull();
    expect(result!.street).toBe("44 Crown Acres Road");
    expect(result!.state).toBe("NY");
    expect(result!.zip).toBe("11720");
    expect(result!.unit).toBe("Unit 3");
  });

  it("rejoins a house number that lands on its own segment in the verbose fallback path (#879)", () => {
    const result = splitCombinedAddress(
      "44, Crown Acres Road, Centereach, Town of Brookhaven, Suffolk County, New York, 11720, United States",
    );
    expect(result).not.toBeNull();
    expect(result!.street).toBe("44, Crown Acres Road");
    expect(result!.state).toBe("NY");
    expect(result!.zip).toBe("11720");
  });

  it("rejoins a split house number in the fast path too (no regression)", () => {
    const result = splitCombinedAddress("44, Crown Acres Road, Centereach, NY 11720");
    expect(result).not.toBeNull();
    expect(result!.street).toBe("44, Crown Acres Road");
    expect(result!.city).toBe("Centereach");
    expect(result!.state).toBe("NY");
    expect(result!.zip).toBe("11720");
  });

  it("does not alter a normal address with no leading comma after the house number", () => {
    const result = splitCombinedAddress("123 Main St, Springfield, IL 62704");
    expect(result).toEqual({
      street: "123 Main St",
      city: "Springfield",
      state: "IL",
      zip: "62704",
      unit: "",
    });
  });
});

describe("extractUnitFromStreet", () => {
  it("extracts and strips an Apt token", () => {
    expect(extractUnitFromStreet("789 Main St Apt 12")).toEqual({
      street: "789 Main St",
      unit: "Apt 12",
    });
  });

  it("extracts and strips a Unit token", () => {
    expect(extractUnitFromStreet("789 Main St Unit 5B")).toEqual({
      street: "789 Main St",
      unit: "Unit 5B",
    });
  });

  it("extracts and strips a Suite/Ste token", () => {
    expect(extractUnitFromStreet("500 Corporate Pkwy Ste 200")).toEqual({
      street: "500 Corporate Pkwy",
      unit: "Ste 200",
    });
  });

  it("extracts and strips a # token", () => {
    expect(extractUnitFromStreet("42 Ocean Ave #4")).toEqual({
      street: "42 Ocean Ave",
      unit: "# 4",
    });
  });

  it("leaves the street untouched when there is no unit token", () => {
    expect(extractUnitFromStreet("2847 Maple Drive")).toEqual({
      street: "2847 Maple Drive",
      unit: "",
    });
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
