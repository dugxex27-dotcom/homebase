/**
 * Home Identification Number (HIN) encoder/decoder.
 *
 * VIN-style 17-character alphanumeric code. See
 * attached_assets/myhomebase-hin-v2-prompt_1783037053794.md for the full spec.
 *
 * Pure functions only — no database access here.
 */

// 34 chars: 0-9, A-Z minus I and O (matches VIN standard)
const CHARSET = "0123456789ABCDEFGHJKLMNPQRSTUVWXYZ";

// Returns [divisionCode, stateCodeWithinDivision] for a 2-letter state
const STATE_CODES: Record<string, [number, number]> = {
  // Division 1: New England
  CT: [1, 1], ME: [1, 2], MA: [1, 3], NH: [1, 4], RI: [1, 5], VT: [1, 6],
  // Division 2: Mid-Atlantic
  NJ: [2, 1], NY: [2, 2], PA: [2, 3],
  // Division 3: East North Central
  IL: [3, 1], IN: [3, 2], MI: [3, 3], OH: [3, 4], WI: [3, 5],
  // Division 4: West North Central
  IA: [4, 1], KS: [4, 2], MN: [4, 3], MO: [4, 4], NE: [4, 5], ND: [4, 6], SD: [4, 7],
  // Division 5: South Atlantic
  DC: [5, 1], DE: [5, 2], FL: [5, 3], GA: [5, 4], MD: [5, 5], NC: [5, 6], SC: [5, 7], VA: [5, 8], WV: [5, 9],
  // Division 6: East South Central
  AL: [6, 1], KY: [6, 2], MS: [6, 3], TN: [6, 4],
  // Division 7: West South Central
  AR: [7, 1], LA: [7, 2], OK: [7, 3], TX: [7, 4],
  // Division 8: Mountain
  AZ: [8, 1], CO: [8, 2], ID: [8, 3], MT: [8, 4], NM: [8, 5], NV: [8, 6], UT: [8, 7], WY: [8, 8],
  // Division 9: Pacific
  AK: [9, 1], CA: [9, 2], HI: [9, 3], OR: [9, 4], WA: [9, 5],
};

// Skip I and O. A=2024, B=2025 ... Z=2047, 0=2048 ... 9=2057
const YEAR_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789";
const BASE_YEAR = 2024;

function encodeYear(year: number): string {
  const offset = year - BASE_YEAR;
  if (offset < 0 || offset >= YEAR_CHARS.length) {
    throw new Error(`Year ${year} is outside encodable range (2024-2057)`);
  }
  return YEAR_CHARS[offset];
}

// Curated charset that avoids visually ambiguous characters (0/O, 1/I/L, 2/Z, B/8, D, 5/S, 6)
const UNIQUE_CHARSET = "ACEFGHJKLMNPQRTUVWXY3479";

function generateUniqueSegment(length = 7): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += UNIQUE_CHARSET[Math.floor(Math.random() * UNIQUE_CHARSET.length)];
  }
  return result;
}

const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 9, 8, 0, 7, 6, 5, 4, 3, 2, 1];

function charValue(c: string): number {
  const idx = CHARSET.indexOf(c.toUpperCase());
  if (idx === -1) throw new Error(`Invalid character for check digit: '${c}'`);
  return idx;
}

function computeCheckDigit(hin17: string): string {
  // hin17 must be 17 chars with '0' at position 9 (index 9)
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    if (i === 9) continue;
    sum += charValue(hin17[i]) * WEIGHTS[i];
  }
  return CHARSET[sum % 34];
}

export interface HINComponents {
  platform: string; // pos 1
  country: string; // pos 2
  division: number; // pos 3
  stateCode: number; // pos 4
  propertyType: number; // pos 5
  yearChar: string; // pos 6
  zipPrefix: string; // pos 7-9
  checkDigit: string; // pos 10
  uniqueSegment: string; // pos 11-17
}

export function isSupportedState(state: string): boolean {
  return Boolean(STATE_CODES[state.toUpperCase()]);
}

export function buildHIN(
  state: string,
  zip: string,
  propertyType: number = 1,
  year: number = new Date().getFullYear(),
): string {
  const stateCodes = STATE_CODES[state.toUpperCase()];
  if (!stateCodes) throw new Error(`Unknown state: ${state}`);

  const [divisionCode, stateCode] = stateCodes;
  const yearChar = encodeYear(year);
  const zipPrefix = zip.replace(/\D/g, "").substring(0, 3).padStart(3, "0");
  const uniqueSegment = generateUniqueSegment(7);

  // Assemble with placeholder at position 10
  const withoutCheck =
    "H" + // pos 1: platform
    "U" + // pos 2: country
    divisionCode.toString() + // pos 3: census division
    stateCode.toString() + // pos 4: state within division
    propertyType.toString() + // pos 5: property type
    yearChar + // pos 6: registration year
    zipPrefix + // pos 7-9: ZIP prefix
    "0" + // pos 10: placeholder for check digit
    uniqueSegment; // pos 11-17: unique ID

  const checkDigit = computeCheckDigit(withoutCheck);

  return withoutCheck.substring(0, 9) + checkDigit + withoutCheck.substring(10);
}

export function decodeHIN(hin: string): HINComponents | null {
  if (!validateHIN(hin)) return null;

  const divisionCode = parseInt(hin[2], 10);
  const stateCode = parseInt(hin[3], 10);
  const propertyType = parseInt(hin[4], 10);

  return {
    platform: hin[0],
    country: hin[1],
    division: divisionCode,
    stateCode,
    propertyType,
    yearChar: hin[5],
    zipPrefix: hin.substring(6, 9),
    checkDigit: hin[9],
    uniqueSegment: hin.substring(10),
  };
}

export function validateHIN(hin: string): boolean {
  if (typeof hin !== "string" || hin.length !== 17) return false;
  if (!/^[0-9A-HJ-NP-Z]{17}$/i.test(hin)) return false;
  const placeholder = hin.substring(0, 9) + "0" + hin.substring(10);
  return computeCheckDigit(placeholder) === hin[9].toUpperCase();
}

export function getStateName(divisionCode: number, stateCode: number): string | null {
  const entry = Object.entries(STATE_CODES).find(
    ([, codes]) => codes[0] === divisionCode && codes[1] === stateCode,
  );
  return entry ? entry[0] : null;
}
