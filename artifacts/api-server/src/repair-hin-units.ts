import { db } from "./db";
import { houses, homeIdentificationNumbers } from "@workspace/db";
import { eq, isNotNull } from "drizzle-orm";
import { splitCombinedAddress } from "./address-parser";
import { getOrCreateHINForCombinedAddress, propertyTypeFromHomeType } from "./hin-service";

/**
 * One-off repair: before the unit-extraction fix, `splitCombinedAddress`
 * didn't pull an Apt/Unit/Suite/# token out of a house's address, so any
 * multi-unit house got a HIN whose `unit` column was blank and whose
 * street_name/street_suffix absorbed the unit token.
 *
 * `home_identification_numbers` rows are permanent and append-only (see
 * hin-service.ts) — this script never updates or deletes an existing row.
 * Instead, for each affected house it computes the corrected HIN (which,
 * because the normalized address now differs, gets its own new row) and
 * repoints `houses.hin` / `houses.hinAssignedAt` at it. The old HIN row is
 * left orphaned, as intended.
 *
 * Safe to re-run: a house is only touched if its address still parses to a
 * unit and its *current* HIN's unit column is still blank.
 *
 * Run with: pnpm --filter @workspace/api-server exec tsx src/repair-hin-units.ts
 */
async function repairHinUnits() {
  console.log("Starting HIN unit repair...");

  // Every house that already has a HIN, joined to that HIN's current row so
  // we can see what unit value (if any) it was assigned.
  const rows = await db
    .select({
      house: houses,
      currentHin: homeIdentificationNumbers,
    })
    .from(houses)
    .innerJoin(homeIdentificationNumbers, eq(houses.hin, homeIdentificationNumbers.hin))
    .where(isNotNull(houses.hin));

  console.log(`Found ${rows.length} houses with an existing HIN`);

  const candidates = rows.filter(({ house, currentHin }) => {
    if (currentHin.unit && currentHin.unit.trim() !== "") return false; // already correct
    const parsed = splitCombinedAddress(house.address);
    return !!(parsed && parsed.unit);
  });

  console.log(
    `Identified ${candidates.length} houses whose address contains a unit token but whose current HIN has a blank unit`,
  );

  let repaired = 0;
  let unchanged = 0; // corrected HIN turned out identical to the current one
  let failed = 0;

  for (const { house, currentHin } of candidates) {
    try {
      const hinRecord = await getOrCreateHINForCombinedAddress(house.address, {
        propertyType: propertyTypeFromHomeType(house.homeType),
        latitude: house.latitude ? parseFloat(house.latitude) : undefined,
        longitude: house.longitude ? parseFloat(house.longitude) : undefined,
        sourceHomeId: house.id,
      });

      if (!hinRecord) {
        console.warn(`Skipped house ${house.id}: address could not be parsed ("${house.address}")`);
        failed++;
        continue;
      }

      if (hinRecord.hin === currentHin.hin) {
        // Shouldn't normally happen (the corrected normalized address should
        // differ once the unit is extracted), but guard against a no-op.
        console.log(`House ${house.id}: corrected HIN matches current HIN (${hinRecord.hin}), no change needed`);
        unchanged++;
        continue;
      }

      await db
        .update(houses)
        .set({ hin: hinRecord.hin, hinAssignedAt: new Date() })
        .where(eq(houses.id, house.id));

      console.log(
        `House ${house.id} (${house.address}): ${currentHin.hin} (unit="") -> ${hinRecord.hin} (unit="${hinRecord.normalizedAddress}") [${hinRecord.isNew ? "new HIN row" : "existing HIN row"}]`,
      );
      repaired++;
    } catch (err) {
      console.error(`Failed to repair house ${house.id}:`, err);
      failed++;
    }
  }

  console.log(
    `Done. Candidates: ${candidates.length}, repaired: ${repaired}, unchanged: ${unchanged}, failed: ${failed}`,
  );
  process.exit(0);
}

repairHinUnits();
