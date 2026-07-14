/**
 * Home Identification Number (HIN) assignment service.
 *
 * Critical rule: `home_identification_numbers` rows are permanent and
 * append-only. Never update or delete a row from that table here.
 */
import { eq } from "drizzle-orm";
import { db } from "./db";
import { homeIdentificationNumbers } from "@workspace/db";
import { normalizeAddress, splitCombinedAddress } from "./address-parser";
import { buildHIN, validateHIN, decodeHIN } from "./hin-encoder";

export interface HINRecord {
  hin: string;
  normalizedAddress: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  createdAt: Date | null;
  isNew: boolean;
}

export interface HINAssignmentOptions {
  unit?: string;
  propertyType?: number;
  latitude?: number;
  longitude?: number;
  sourceHomeId?: string;
  metadata?: Record<string, unknown>;
}

function toRecord(
  row: {
    hin: string;
    normalizedAddress: string;
    city: string | null;
    state: string | null;
    zip: string | null;
    createdAt: Date | null;
  },
  isNew: boolean,
): HINRecord {
  return {
    hin: row.hin,
    normalizedAddress: row.normalizedAddress,
    city: row.city,
    state: row.state,
    zip: row.zip,
    createdAt: row.createdAt,
    isNew,
  };
}

/**
 * Primary entry point. Call every time a home is saved with a resolvable
 * street/city/state/zip. Returns the same HIN for the same address every
 * time (idempotent) — safe to call for both new homes and address edits.
 */
export async function getOrCreateHIN(
  street: string,
  city: string,
  state: string,
  zip: string,
  options?: HINAssignmentOptions,
): Promise<HINRecord> {
  const parsed = normalizeAddress(street, city, state, zip, options?.unit);

  const existing = await db
    .select()
    .from(homeIdentificationNumbers)
    .where(eq(homeIdentificationNumbers.normalizedAddress, parsed.normalizedString))
    .limit(1);

  if (existing.length > 0) {
    return toRecord(existing[0], false);
  }

  let hin = "";
  for (let attempt = 0; attempt < 10; attempt++) {
    const candidate = buildHIN(parsed.state, parsed.zip, options?.propertyType || 1, new Date().getFullYear());
    const collision = await db
      .select({ hin: homeIdentificationNumbers.hin })
      .from(homeIdentificationNumbers)
      .where(eq(homeIdentificationNumbers.hin, candidate))
      .limit(1);
    if (collision.length === 0) {
      hin = candidate;
      break;
    }
  }

  if (!hin) throw new Error("HIN generation failed after 10 attempts");

  try {
    const inserted = await db
      .insert(homeIdentificationNumbers)
      .values({
        hin,
        normalizedAddress: parsed.normalizedString,
        streetNumber: parsed.streetNumber,
        streetName: parsed.streetName,
        streetSuffix: parsed.streetSuffix,
        unit: parsed.unit,
        city: parsed.city,
        state: parsed.state,
        zip: parsed.zip,
        censusDivision: parseInt(hin[2], 10),
        propertyType: options?.propertyType || 1,
        registrationYearChar: hin[5],
        latitude: options?.latitude != null ? options.latitude.toString() : null,
        longitude: options?.longitude != null ? options.longitude.toString() : null,
        sourceHomeId: options?.sourceHomeId ?? null,
        metadata: options?.metadata ?? {},
      } as any)
      .onConflictDoNothing({ target: homeIdentificationNumbers.normalizedAddress })
      .returning();

    if (inserted.length === 0) {
      // Race: another request inserted the same normalized address first.
      return getOrCreateHIN(street, city, state, zip, options);
    }

    return toRecord(inserted[0], true);
  } catch (err) {
    // Race on the unique constraint can also surface as a thrown DB error
    // depending on driver/version; fall back to a re-read instead of failing.
    const existingAfterRace = await db
      .select()
      .from(homeIdentificationNumbers)
      .where(eq(homeIdentificationNumbers.normalizedAddress, parsed.normalizedString))
      .limit(1);
    if (existingAfterRace.length > 0) {
      return toRecord(existingAfterRace[0], false);
    }
    throw err;
  }
}

/**
 * Convenience wrapper for the common case where a house stores a single
 * combined "address" field instead of separate street/city/state/zip.
 * Returns null when the address can't be confidently parsed (e.g. missing
 * state/zip) rather than throwing, so callers can skip HIN assignment.
 */
export async function getOrCreateHINForCombinedAddress(
  fullAddress: string,
  options?: HINAssignmentOptions,
): Promise<HINRecord | null> {
  const parsed = splitCombinedAddress(fullAddress);
  if (!parsed) return null;
  return getOrCreateHIN(parsed.street, parsed.city, parsed.state, parsed.zip, options);
}

export async function lookupByHIN(hin: string): Promise<HINRecord | null> {
  if (!validateHIN(hin)) return null;
  const result = await db
    .select()
    .from(homeIdentificationNumbers)
    .where(eq(homeIdentificationNumbers.hin, hin.toUpperCase()))
    .limit(1);
  if (!result.length) return null;
  return toRecord(result[0], false);
}

export { validateHIN, decodeHIN };

/**
 * Maps this app's `homeType` string field to the HIN spec's numeric
 * property type code (position 5). Falls back to "single family" (1)
 * for unknown/unset types.
 */
export function propertyTypeFromHomeType(homeType: string | null | undefined): number {
  switch (homeType) {
    case "single_family":
      return 1;
    case "condo":
    case "apartment":
      return 2;
    case "townhouse":
      return 3;
    case "multi_family":
      return 4;
    case "mobile_home":
      return 6;
    default:
      return 1;
  }
}
