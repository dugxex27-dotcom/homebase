/**
 * Address parsing/normalization for the Home Identification Number (HIN) system.
 *
 * The `houses` table stores a single free-text `address` field (e.g.
 * "2847 Maple Drive, Seattle, WA 98101"), so unlike the original HIN spec
 * (which assumes separate street/city/state/zip inputs) we first split the
 * combined string into components, then normalize them the same way.
 */

export interface ParsedAddress {
  streetNumber: string;
  streetName: string;
  streetSuffix: string;
  unit: string;
  city: string;
  state: string;
  zip: string;
  normalizedString: string;
}

const STREET_SUFFIXES: Record<string, string> = {
  STREET: "ST", STR: "ST", ST: "ST",
  AVENUE: "AVE", AV: "AVE", AVE: "AVE",
  ROAD: "RD", RD: "RD",
  BOULEVARD: "BLVD", BLVD: "BLVD", BOUL: "BLVD",
  DRIVE: "DR", DR: "DR",
  LANE: "LN", LN: "LN",
  COURT: "CT", CT: "CT",
  CIRCLE: "CIR", CIR: "CIR",
  PLACE: "PL", PL: "PL",
  TERRACE: "TER", TER: "TER", TERR: "TER",
  WAY: "WAY", HIGHWAY: "HWY", HWY: "HWY",
  PARKWAY: "PKWY", PKWY: "PKWY",
  TRAIL: "TRL", TRL: "TRL",
  LOOP: "LOOP", RUN: "RUN", PATH: "PATH", PASS: "PASS", PIKE: "PIKE",
};

const UNIT_PREFIXES: Record<string, string> = {
  APARTMENT: "APT", APT: "APT",
  UNIT: "UNIT", SUITE: "STE", STE: "STE",
  "#": "UNIT", NO: "UNIT", "NO.": "UNIT", NUMBER: "UNIT",
};

const DIRECTIONALS: Record<string, string> = {
  NORTH: "N", SOUTH: "S", EAST: "E", WEST: "W",
  NORTHEAST: "NE", NORTHWEST: "NW", SOUTHEAST: "SE", SOUTHWEST: "SW",
  N: "N", S: "S", E: "E", W: "W", NE: "NE", NW: "NW", SE: "SE", SW: "SW",
};

const US_STATE_ABBREVIATIONS = new Set([
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA",
  "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM",
  "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA",
  "WV", "WI", "WY",
]);

const US_STATE_NAME_TO_ABBR: Record<string, string> = {
  ALABAMA: "AL", ALASKA: "AK", ARIZONA: "AZ", ARKANSAS: "AR", CALIFORNIA: "CA",
  COLORADO: "CO", CONNECTICUT: "CT", DELAWARE: "DE", "DISTRICT OF COLUMBIA": "DC",
  FLORIDA: "FL", GEORGIA: "GA", HAWAII: "HI", IDAHO: "ID", ILLINOIS: "IL", INDIANA: "IN",
  IOWA: "IA", KANSAS: "KS", KENTUCKY: "KY", LOUISIANA: "LA", MAINE: "ME", MARYLAND: "MD",
  MASSACHUSETTS: "MA", MICHIGAN: "MI", MINNESOTA: "MN", MISSISSIPPI: "MS", MISSOURI: "MO",
  MONTANA: "MT", NEBRASKA: "NE", NEVADA: "NV", "NEW HAMPSHIRE": "NH", "NEW JERSEY": "NJ",
  "NEW MEXICO": "NM", "NEW YORK": "NY", "NORTH CAROLINA": "NC", "NORTH DAKOTA": "ND",
  OHIO: "OH", OKLAHOMA: "OK", OREGON: "OR", PENNSYLVANIA: "PA", "RHODE ISLAND": "RI",
  "SOUTH CAROLINA": "SC", "SOUTH DAKOTA": "SD", TENNESSEE: "TN", TEXAS: "TX", UTAH: "UT",
  VERMONT: "VT", VIRGINIA: "VA", WASHINGTON: "WA", "WEST VIRGINIA": "WV", WISCONSIN: "WI",
  WYOMING: "WY",
};

function abbreviateState(raw: string): string | null {
  const upper = raw.toUpperCase().trim();
  if (US_STATE_ABBREVIATIONS.has(upper)) return upper;
  if (US_STATE_NAME_TO_ABBR[upper]) return US_STATE_NAME_TO_ABBR[upper];
  return null;
}

// Matches an apartment/unit/suite token embedded in a street string, e.g.
// "789 Main St Apt 12", "789 Main St, Unit 5B", "789 Main St Suite 200".
const UNIT_WORD_REGEX =
  /\b(APARTMENT|APT|UNIT|SUITE|STE)\.?\s*#?\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)\b/i;

// Matches a "#4"-style unit token. No leading `\b` since `#` sits between two
// non-word characters (a space and a digit boundary handles the trailing side).
const UNIT_HASH_REGEX = /#\s*([A-Za-z0-9]+(?:-[A-Za-z0-9]+)?)\b/;

// Matches a comma-separated segment that is *only* a house number (e.g. "44",
// "44A"), used to detect when a source address split the house number away
// from the street name onto its own segment (e.g. "44, Crown Acres Road, ...").
const HOUSE_NUMBER_ONLY_REGEX = /^\d+[A-Za-z]?$/;

/**
 * Pulls an apartment/unit/suite token out of a street string, if present,
 * returning the street with the token removed (and separators cleaned up)
 * alongside the extracted unit text (e.g. "Apt 12").
 */
export function extractUnitFromStreet(streetRaw: string): { street: string; unit: string } {
  const wordMatch = streetRaw.match(UNIT_WORD_REGEX);
  const hashMatch = streetRaw.match(UNIT_HASH_REGEX);

  // Prefer whichever token appears first in the string when both could match.
  let match: RegExpMatchArray | null = wordMatch;
  let unit = "";
  if (wordMatch && (!hashMatch || (wordMatch.index ?? Infinity) <= (hashMatch.index ?? Infinity))) {
    match = wordMatch;
    unit = `${wordMatch[1]} ${wordMatch[2]}`.trim();
  } else if (hashMatch) {
    match = hashMatch;
    unit = `# ${hashMatch[1]}`.trim();
  }

  if (!match || match.index == null || !unit) {
    return { street: streetRaw, unit: "" };
  }

  const before = streetRaw.slice(0, match.index);
  const after = streetRaw.slice(match.index + match[0].length);
  const street = (before + after)
    .replace(/,\s*,/g, ",")
    .replace(/^[\s,]+/, "")
    .replace(/[\s,]+$/, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  return { street, unit };
}

/**
 * Best-effort split of a single free-text US address string into
 * street / city / state / zip, e.g.:
 *   "2847 Maple Drive, Seattle, WA 98101" ->
 *   { street: "2847 Maple Drive", city: "Seattle", state: "WA", zip: "98101" }
 *
 * Handles both "City, ST 98101" and more verbose forms with a full state
 * name and/or the ZIP in its own comma-separated part, e.g.:
 *   "44 Crown Acres Road, Centereach, Town of Brookhaven, Suffolk County, New York, 11720, United States"
 *
 * Returns null when a state and zip cannot be confidently identified —
 * callers should treat this as "not eligible for HIN assignment yet".
 */
export function splitCombinedAddress(fullAddress: string): {
  street: string;
  city: string;
  state: string;
  zip: string;
  unit: string;
} | null {
  const parts = fullAddress.split(",").map((p) => p.trim()).filter(Boolean);

  // Fast path: "STATE ZIP" pair together in one part (usually the last one),
  // e.g. "Seattle, WA 98101".
  const stateZipRegex = /\b([A-Za-z]{2})\s+(\d{5})(-\d{4})?\b/;
  let stateZipIndex = -1;
  let state = "";
  let zip = "";

  for (let i = parts.length - 1; i >= 0; i--) {
    const match = parts[i].match(stateZipRegex);
    if (match && US_STATE_ABBREVIATIONS.has(match[1].toUpperCase())) {
      stateZipIndex = i;
      state = match[1].toUpperCase();
      zip = match[2];
      break;
    }
  }

  if (stateZipIndex !== -1 && zip) {
    const city = stateZipIndex > 0 ? parts[stateZipIndex - 1] : "";
    const rawStreet =
      parts.slice(0, Math.max(stateZipIndex - 1, stateZipIndex === 0 ? 0 : 1)).join(", ") ||
      parts[0] ||
      "";

    if (!city || !rawStreet) return null;
    const { street, unit } = extractUnitFromStreet(rawStreet);
    return { street, city, state, zip, unit };
  }

  // Fallback path: ZIP and state live in separate parts, and/or the state is
  // spelled out in full (common in geocoded/verbose addresses).
  const zipOnlyRegex = /^(\d{5})(-\d{4})?$/;
  let zipIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    const m = parts[i].match(zipOnlyRegex);
    if (m) {
      zipIndex = i;
      zip = m[1];
      break;
    }
  }
  if (zipIndex === -1) return null;

  let stateIndex = -1;
  for (let i = zipIndex - 1; i >= 0; i--) {
    const abbr = abbreviateState(parts[i]);
    if (abbr) {
      stateIndex = i;
      state = abbr;
      break;
    }
  }
  if (stateIndex === -1) return null;

  // City is the part immediately before the state (skipping county/town
  // administrative segments is out of scope — we take the closest preceding
  // part that isn't itself state/zip noise).
  const cityIndex = stateIndex > 0 ? stateIndex - 1 : -1;
  const city = cityIndex >= 0 ? parts[cityIndex] : "";

  // Normally the street is just the first segment. But some sources split
  // the house number onto its own leading segment (e.g. "44, Crown Acres
  // Road, ..."), in which case parts[0] is just "44" and the real street
  // name is parts[1] — rejoin them so the street name isn't silently
  // dropped. This is scoped to *only* the house-number segment (unlike the
  // fast path, which can safely join everything up to the city in one
  // shot) because the fallback path legitimately has extra county/town
  // administrative segments between the street and the chosen city that
  // must NOT be swept into the street.
  const houseNumberSplit = HOUSE_NUMBER_ONLY_REGEX.test(parts[0] || "") && parts.length > 1;
  const rawStreet = houseNumberSplit ? `${parts[0]}, ${parts[1]}` : parts[0] || "";
  const streetSegmentsConsumed = houseNumberSplit ? 2 : 1;

  if (!city || !rawStreet || rawStreet === city) return null;

  const { street, unit: embeddedUnit } = extractUnitFromStreet(rawStreet);
  let unit = embeddedUnit;

  // A unit can also show up as its own comma-separated segment between the
  // street and the city (e.g. "789 Main St, Apt 12, Seattle, Washington,
  // 98101"), which this path otherwise treats as address noise and drops —
  // check those segments for a unit token before giving up on one.
  if (!unit) {
    for (let i = streetSegmentsConsumed; i < cityIndex; i++) {
      const segment = extractUnitFromStreet(parts[i]);
      if (segment.unit) {
        unit = segment.unit;
        break;
      }
    }
  }

  return { street, city, state, zip, unit };
}

export function normalizeAddress(
  street: string,
  city: string,
  state: string,
  zip: string,
  unit?: string,
): ParsedAddress {
  const cleanStreet = street.toUpperCase().replace(/[^\w\s-]/g, "").trim();
  const cleanCity = city.toUpperCase().replace(/[^\w\s]/g, "").trim();
  const cleanState = state.toUpperCase().trim();
  const cleanZip = zip.replace(/\D/g, "").substring(0, 5);
  const cleanUnit = (unit || "").toUpperCase().replace(/[^\w\s-]/g, "").trim();

  const streetParts = cleanStreet.split(/\s+/);
  let streetNumber = "";
  let parts: string[] = [];

  if (streetParts[0] && /^\d+(-\d+)?[A-Z]?$/.test(streetParts[0])) {
    streetNumber = streetParts[0];
    parts = streetParts.slice(1);
  } else {
    parts = streetParts;
  }

  let dirPrefix = "";
  if (parts.length > 1 && DIRECTIONALS[parts[0]]) {
    dirPrefix = DIRECTIONALS[parts[0]];
    parts = parts.slice(1);
  }

  let suffix = "";
  if (parts.length > 1 && STREET_SUFFIXES[parts[parts.length - 1]]) {
    suffix = STREET_SUFFIXES[parts[parts.length - 1]];
    parts = parts.slice(0, -1);
  }

  let dirSuffix = "";
  if (parts.length > 1 && DIRECTIONALS[parts[parts.length - 1]]) {
    dirSuffix = DIRECTIONALS[parts[parts.length - 1]];
    parts = parts.slice(0, -1);
  }

  const streetName = [dirPrefix, ...parts, dirSuffix].filter(Boolean).join(" ");

  let normalizedUnit = "";
  if (cleanUnit) {
    const unitParts = cleanUnit.split(/\s+/);
    const prefix = UNIT_PREFIXES[unitParts[0]];
    normalizedUnit = prefix
      ? `${prefix} ${unitParts.slice(1).join(" ")}`.trim()
      : `UNIT ${cleanUnit}`;
  }

  const addressLine = [streetNumber, streetName, suffix, normalizedUnit]
    .filter(Boolean)
    .join(" ");

  return {
    streetNumber,
    streetName,
    streetSuffix: suffix,
    unit: normalizedUnit,
    city: cleanCity,
    state: cleanState,
    zip: cleanZip,
    normalizedString: `${addressLine}, ${cleanCity} ${cleanState} ${cleanZip}`,
  };
}
