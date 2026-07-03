import { db } from "./db";
import { houses } from "@workspace/db";
import { eq, isNull } from "drizzle-orm";
import { getOrCreateHINForCombinedAddress, propertyTypeFromHomeType } from "./hin-service";

/**
 * One-off backfill: assigns a Home Identification Number to every existing
 * house that doesn't have one yet. Safe to re-run — getOrCreateHIN is
 * idempotent per normalized address.
 *
 * Run with: pnpm --filter @workspace/api-server exec tsx src/backfill-hins.ts
 */
async function backfillHINs() {
  console.log("Starting HIN backfill...");

  const housesToBackfill = await db.select().from(houses).where(isNull(houses.hin));
  console.log(`Found ${housesToBackfill.length} houses without a HIN`);

  let assigned = 0;
  let skipped = 0;
  let failed = 0;

  for (const house of housesToBackfill) {
    try {
      const hinRecord = await getOrCreateHINForCombinedAddress(house.address, {
        propertyType: propertyTypeFromHomeType(house.homeType),
        latitude: house.latitude ? parseFloat(house.latitude) : undefined,
        longitude: house.longitude ? parseFloat(house.longitude) : undefined,
        sourceHomeId: house.id,
      });

      if (!hinRecord) {
        console.warn(`Skipped house ${house.id}: address could not be parsed ("${house.address}")`);
        skipped++;
        continue;
      }

      await db
        .update(houses)
        .set({ hin: hinRecord.hin, hinAssignedAt: new Date() })
        .where(eq(houses.id, house.id));

      console.log(`House ${house.id} -> ${hinRecord.hin} (${hinRecord.isNew ? "new" : "existing"})`);
      assigned++;
    } catch (err) {
      console.error(`Failed to backfill house ${house.id}:`, err);
      failed++;
    }
  }

  console.log(`Done. Assigned: ${assigned}, skipped (unparseable address): ${skipped}, failed: ${failed}`);
  process.exit(0);
}

backfillHINs();
