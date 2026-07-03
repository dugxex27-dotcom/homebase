import { describe, it, expect } from "vitest";
import { buildHIN, decodeHIN, validateHIN, isSupportedState, getStateName } from "./hin-encoder";

describe("hin-encoder", () => {
  it("builds a 17-character HIN with the expected structure", () => {
    const hin = buildHIN("WA", "98101", 1, 2026);
    expect(hin).toHaveLength(17);
    expect(hin[0]).toBe("H"); // platform
    expect(hin[1]).toBe("U"); // country
    expect(hin.substring(6, 9)).toBe("981"); // zip prefix
  });

  it("produces a HIN that passes its own check-digit validation", () => {
    const hin = buildHIN("TX", "78701", 1, 2026);
    expect(validateHIN(hin)).toBe(true);
  });

  it("fails validation when a character is corrupted (tamper detection)", () => {
    const hin = buildHIN("CA", "90210", 1, 2026);
    const tampered = hin.substring(0, 5) + (hin[5] === "A" ? "B" : "A") + hin.substring(6);
    expect(validateHIN(tampered)).toBe(false);
  });

  it("fails validation for malformed input (wrong length, ambiguous chars)", () => {
    expect(validateHIN("TOO_SHORT")).toBe(false);
    expect(validateHIN("")).toBe(false);
    expect(validateHIN("HU741C7879FLYUWC" + "I")).toBe(false); // 'I' not in charset
  });

  it("round-trips through decodeHIN with the encoded components", () => {
    const hin = buildHIN("NY", "10001", 2, 2026);
    const decoded = decodeHIN(hin);
    expect(decoded).not.toBeNull();
    expect(decoded!.platform).toBe("H");
    expect(decoded!.country).toBe("U");
    expect(decoded!.propertyType).toBe(2);
    expect(decoded!.zipPrefix).toBe("100");
  });

  it("returns null from decodeHIN for an invalid HIN", () => {
    expect(decodeHIN("not-a-valid-hin")).toBeNull();
  });

  it("generates different unique segments across calls for the same address inputs", () => {
    const a = buildHIN("WA", "98101", 1, 2026);
    const b = buildHIN("WA", "98101", 1, 2026);
    expect(a).not.toBe(b);
  });

  it("throws for an unsupported state", () => {
    expect(() => buildHIN("ZZ", "00000", 1, 2026)).toThrow();
  });

  it("throws for a year outside the encodable range", () => {
    expect(() => buildHIN("WA", "98101", 1, 2023)).toThrow();
    expect(() => buildHIN("WA", "98101", 1, 2058)).toThrow();
  });

  it("isSupportedState reports supported vs unsupported states", () => {
    expect(isSupportedState("wa")).toBe(true);
    expect(isSupportedState("XX")).toBe(false);
  });

  it("getStateName resolves division/state codes back to a state abbreviation", () => {
    const hin = buildHIN("WA", "98101", 1, 2026);
    const decoded = decodeHIN(hin)!;
    expect(getStateName(decoded.division, decoded.stateCode)).toBe("WA");
  });
});
