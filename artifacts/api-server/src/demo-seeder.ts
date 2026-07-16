/**
 * Demo seeder module
 *
 * Encapsulates all demo-login seeding logic for homeowner, contractor, and agent
 * demo accounts. Extracted from routes.ts so the seeding logic is testable in
 * isolation and easier to keep in sync with schema changes.
 *
 * Each exported function:
 *  - creates or verifies the demo user
 *  - seeds all associated records (idempotent)
 *  - returns { user, seedResults } — session handling stays in the route handler
 */

import { randomUUID } from "crypto";
import { eq, sql as drizzleSql, inArray } from "drizzle-orm";
import { storage } from "./storage";
import { db } from "./db";
import {
  taskCompletions,
  maintenanceLogs,
  homeSystems,
  homeAppliances,
  taskOverrides,
  conversations,
  messages,
  affiliateReferrals,
  subscriptionCycleEvents,
  users,
  type House,
} from "@workspace/db";
import { emailService } from "./email-service";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeedResult = {
  ok: boolean;
  inserted?: number;
  expected?: number;
  error?: string;
  healthCheck?: Record<string, unknown>;
  skipped?: boolean;
};
export type SeedResults = Record<string, SeedResult>;

export interface SeedOutcome {
  user: any;
  seedResults: SeedResults;
}

/** Minimal subset of pino logger used inside the seeders. */
interface DemoLog {
  info(obj: object, msg: string): void;
  warn(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function generateUniqueReferralCode(): Promise<string> {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let attempts = 0;
  while (attempts < 10) {
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    const existing = await storage.getUserByReferralCode(code);
    if (!existing) return code;
    attempts++;
  }
  throw new Error("Failed to generate unique referral code");
}

// ---------------------------------------------------------------------------
// Homeowner seeder
// ---------------------------------------------------------------------------

export async function seedHomeownerDemo(log: DemoLog): Promise<SeedOutcome> {
  const demoEmail = "sarah.anderson@homebase.com";
  const demoId = "demo-homeowner-permanent-id";

  let user = await storage.getUserByEmail(demoEmail);
  if (!user) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    user = await storage.upsertUser({
      id: demoId,
      email: demoEmail,
      firstName: "Sarah",
      lastName: "Anderson",
      profileImageUrl: null,
      role: "homeowner",
      zipCode: "98101",
      subscriptionStatus: "trialing",
      trialEndsAt,
      maxHousesAllowed: 2,
      connectionCode: "DEMO4567",
    });
  }

  const mainHouseId = "8d44c1d0-af55-4f1c-bada-b70e54c823bc";
  const lakeHouseId = "f5c8a9d2-3e1b-4f7c-a6b3-8d9e5f2c1a4b";
  const canonicalHouseIds = new Set([mainHouseId]);

  const existingHouses = await storage.getHouses(demoId);

  const rogueHouses = existingHouses.filter(
    (h: House) => !canonicalHouseIds.has(h.id)
  );
  if (rogueHouses.length > 0) {
    log.info(
      { rogueCount: rogueHouses.length },
      `[DEMO] Removing ${rogueHouses.length} rogue house(s) from demo account`
    );
    for (const rogue of rogueHouses) {
      await db.delete(maintenanceLogs).where(eq(maintenanceLogs.houseId, rogue.id));
      await db.delete(taskOverrides).where(eq(taskOverrides.houseId, rogue.id));
      await db.delete(taskCompletions).where(eq(taskCompletions.houseId, rogue.id));
      await db.delete(homeSystems).where(eq(homeSystems.houseId, rogue.id));
      await db.delete(homeAppliances).where(eq(homeAppliances.houseId, rogue.id));
      await storage.deleteHouse(rogue.id);
    }
  }

  const cleanedHouses = await storage.getHouses(demoId);
  const cleanedHouseIds = new Set(cleanedHouses.map((h: House) => h.id));

  const mainHouseMissing = !cleanedHouseIds.has(mainHouseId);
  const lakeHouseMissing = !cleanedHouseIds.has(lakeHouseId);

  const seedResults: SeedResults = {};

  if (mainHouseMissing) {
    try {
      const house1 = await storage.createHouse({
        homeownerId: demoId,
        name: "Main Residence",
        address: "2847 Maple Drive, Seattle, WA 98101",
        climateZone: "pacific-northwest",
        homeSystems: [
          "central-ac",
          "gas-furnace",
          "gas-water-heater",
          "dishwasher",
          "garbage-disposal",
          "security-system",
        ],
        isDefault: true,
        countryId: "USA",
        regionId: "WA",
        postalCode: "98101",
        latitude: String(47.6062),
        longitude: String(-122.3321),
        yearBuilt: 2008,
        squareFootage: 2400,
        bedrooms: 4,
        bathrooms: 2.5,
        stories: 2,
        garageSpaces: 2,
        lotSize: 0.25,
        propertyType: "single-family",
        roofType: "asphalt_shingle",
        roofAge: 8,
        foundationType: "slab",
        exteriorMaterial: "vinyl-siding",
        primaryHeatingFuel: "natural_gas",
      } as any);

      const logBase = { homeownerId: demoId, houseId: house1.id };
      type ServiceRecord = { serviceDate: string; serviceType: string; homeArea: string; serviceDescription: string; cost: string; contractorName: string | null; contractorCompany: string | null; notes: string; completionMethod: "contractor" | "diy"; diySavingsAmount?: string };
      const serviceRecordsData: ServiceRecord[] = [
        {
          serviceDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "installation",
          homeArea: "security",
          serviceDescription: "Smart doorbell and security camera installation",
          cost: "450.00",
          contractorName: "Tech Solutions Pro",
          contractorCompany: "SecureHome Systems",
          notes: "Installed Ring doorbell and two outdoor cameras. Configured mobile app and tested motion detection.",
          completionMethod: "contractor",
        },
        {
          serviceDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "repair",
          homeArea: "plumbing",
          serviceDescription: "Kitchen faucet replacement",
          cost: "0.00",
          contractorName: "Sarah Anderson",
          contractorCompany: null,
          notes: "Replaced old leaking faucet with new Moen model. Used YouTube tutorial for installation. Turned out great!",
          completionMethod: "diy",
          diySavingsAmount: "275.00",
        },
        {
          serviceDate: new Date(Date.now() - 145 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "maintenance",
          homeArea: "exterior",
          serviceDescription: "Pressure washing deck and siding",
          cost: "0.00",
          contractorName: "Sarah Anderson",
          contractorCompany: null,
          notes: "Rented pressure washer from Home Depot. Took 4 hours but saved a ton of money. Deck looks brand new!",
          completionMethod: "diy",
          diySavingsAmount: "325.00",
        },
        {
          serviceDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "maintenance",
          homeArea: "exterior",
          serviceDescription: "Gutter cleaning and inspection",
          cost: "150.00",
          contractorName: "James Wilson",
          contractorCompany: "ProGutter Services",
          notes: "Cleaned all gutters and downspouts. Found and repaired small leak in north gutter. Recommended annual service.",
          completionMethod: "contractor",
        },
        {
          serviceDate: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "repair",
          homeArea: "electrical",
          serviceDescription: "Replaced living room light fixture",
          cost: "0.00",
          contractorName: "Sarah Anderson",
          contractorCompany: null,
          notes: "Upgraded to modern LED fixture. Turned off breaker and followed safety guidelines. Much brighter now!",
          completionMethod: "diy",
          diySavingsAmount: "185.00",
        },
        {
          serviceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "maintenance",
          homeArea: "landscaping",
          serviceDescription: "Tree trimming and yard cleanup",
          cost: "285.00",
          contractorName: "Green Thumb Landscaping",
          contractorCompany: "Green Thumb Services",
          notes: "Trimmed large oak tree branches overhanging roof. Cleaned up yard debris and mulched flower beds.",
          completionMethod: "contractor",
        },
        {
          serviceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "inspection",
          homeArea: "hvac",
          serviceDescription: "Annual HVAC maintenance and tune-up",
          cost: "185.00",
          contractorName: "Mike Johnson",
          contractorCompany: "Elite Heating & Cooling",
          notes: "System is running efficiently. Replaced air filters, cleaned coils, checked refrigerant levels. No issues found.",
          completionMethod: "contractor",
        },
        {
          serviceDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "maintenance",
          homeArea: "interior",
          serviceDescription: "Caulked bathroom tiles and repaired grout",
          cost: "0.00",
          contractorName: "Sarah Anderson",
          contractorCompany: null,
          notes: "Regrouted master bathroom shower. Bought supplies at hardware store. Looks professional!",
          completionMethod: "diy",
          diySavingsAmount: "225.00",
        },
        {
          serviceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "repair",
          homeArea: "garage",
          serviceDescription: "Garage door spring replacement",
          cost: "195.00",
          contractorName: "Quick Fix Garage Doors",
          contractorCompany: "Reliable Garage Services",
          notes: "Spring broke suddenly. Same-day service. Professional and courteous. Door works perfectly now.",
          completionMethod: "contractor",
        },
        {
          serviceDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          serviceType: "maintenance",
          homeArea: "hvac",
          serviceDescription: "Changed air filters",
          cost: "0.00",
          contractorName: "Sarah Anderson",
          contractorCompany: null,
          notes: "Quarterly filter change. Bought MERV 11 filters. Quick 15-minute job.",
          completionMethod: "diy",
          diySavingsAmount: "75.00",
        },
      ];

      for (const rec of serviceRecordsData) {
        await storage.createMaintenanceLog({ ...logBase, ...rec });
      }

      const currentYear = new Date().getFullYear();
      const taskCompletionsData = [
        { taskTitle: "Inspect and clean air conditioner", taskCategory: "HVAC", month: 5, completionMethod: "diy", daysAgo: 180, costSavings: 150 },
        { taskTitle: "Check smoke and CO detectors", taskCategory: "Safety", month: 5, completionMethod: "diy", daysAgo: 175, costSavings: 0 },
        { taskTitle: "Clean gutters and downspouts", taskCategory: "Exterior", month: 6, completionMethod: "diy", daysAgo: 150, costSavings: 200 },
        { taskTitle: "Inspect roof for damage", taskCategory: "Exterior", month: 6, completionMethod: "diy", daysAgo: 145, costSavings: 0 },
        { taskTitle: "Service lawn equipment", taskCategory: "Outdoor", month: 6, completionMethod: "diy", daysAgo: 140, costSavings: 80 },
        { taskTitle: "Check and replace weather stripping", taskCategory: "Doors & Windows", month: 7, completionMethod: "diy", daysAgo: 120, costSavings: 120 },
        { taskTitle: "Test garage door safety features", taskCategory: "Safety", month: 7, completionMethod: "diy", daysAgo: 115, costSavings: 0 },
        { taskTitle: "Drain water heater sediment", taskCategory: "Plumbing", month: 8, completionMethod: "diy", daysAgo: 90, costSavings: 100 },
        { taskTitle: "Clean range hood filters", taskCategory: "Kitchen", month: 8, completionMethod: "diy", daysAgo: 85, costSavings: 0 },
        { taskTitle: "Inspect and seal driveway cracks", taskCategory: "Exterior", month: 9, completionMethod: "diy", daysAgo: 60, costSavings: 250 },
        { taskTitle: "Change HVAC filters", taskCategory: "HVAC", month: 9, completionMethod: "diy", daysAgo: 55, costSavings: 0 },
        { taskTitle: "Inspect furnace before winter", taskCategory: "HVAC", month: 10, completionMethod: "professional", daysAgo: 30, costSavings: 0 },
        { taskTitle: "Clean and store outdoor furniture", taskCategory: "Outdoor", month: 10, completionMethod: "diy", daysAgo: 25, costSavings: 0 },
        { taskTitle: "Check attic insulation", taskCategory: "Insulation", month: 11, completionMethod: "diy", daysAgo: 10, costSavings: 0 },
        { taskTitle: "Test sump pump operation", taskCategory: "Plumbing", month: 11, completionMethod: "diy", daysAgo: 5, costSavings: 0 },
      ];

      await Promise.all(
        taskCompletionsData.map(async (task) => {
          const completedDate = new Date(Date.now() - task.daysAgo * 24 * 60 * 60 * 1000);
          await db.insert(taskCompletions).values({
            id: randomUUID(),
            homeownerId: demoId,
            houseId: house1.id,
            taskId: null,
            taskType: "maintenance",
            taskTitle: task.taskTitle,
            taskCategory: task.taskCategory,
            completedAt: completedDate,
            month: task.month,
            year: currentYear,
            completionMethod: task.completionMethod,
            estimatedCost: task.costSavings > 0 ? task.costSavings.toString() : null,
            actualCost: task.completionMethod === "professional" ? "150.00" : "0.00",
            costSavings: task.costSavings > 0 ? task.costSavings.toString() : null,
            notes: task.completionMethod === "diy" ? "Completed as DIY project" : null,
          });
        })
      );

      const mainLogsExpected = serviceRecordsData.length;
      const mainCompletionsExpected = taskCompletionsData.length;
      log.info(
        { section: "mainHouse", logsInserted: mainLogsExpected, completionsInserted: mainCompletionsExpected },
        "[DEMO DATA] Main Residence seeded for Sarah Anderson"
      );
      seedResults.mainHouse = {
        ok: true,
        inserted: mainLogsExpected + mainCompletionsExpected,
        expected: 25,
      };
    } catch (houseError) {
      const msg = houseError instanceof Error ? houseError.message : String(houseError);
      log.error({ section: "mainHouse", error: msg }, "[DEMO] Error creating demo Main Residence");
      seedResults.mainHouse = { ok: false, error: msg };
    }
  } else {
    try {
      const [{ count: mainLogCount }] = await db
        .select({ count: drizzleSql<number>`cast(count(*) as integer)` })
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.houseId, mainHouseId));
      seedResults.mainHouse = {
        ok: true,
        ...({ healthCheck: { maintenanceLogs: mainLogCount } } as any),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error({ section: "mainHouse", error: msg }, "[DEMO] Health-check failed for existing Main Residence");
      seedResults.mainHouse = { ok: false, error: msg };
    }
  }

  void lakeHouseMissing;
  seedResults.lakeHouse = { ok: true, inserted: 0, expected: 0 };

  const DEMO_TASK_TARGET = 195;
  try {
    const [{ existingCount }] = await db
      .select({ existingCount: drizzleSql<number>`cast(count(*) as integer)` })
      .from(taskCompletions)
      .where(eq(taskCompletions.homeownerId, demoId));

    if (existingCount < DEMO_TASK_TARGET) {
      const houses = await storage.getHouses(demoId);
      const mainHouse = houses.find((h: any) => h.name === "Main Residence") || houses[0];

      if (mainHouse) {
        const currentYear = new Date().getFullYear();
        const allDemoTasks = [
          // ── Year -4 ──────────────────────────────────────────────────
          { taskTitle: "Annual furnace tune-up", taskCategory: "HVAC", month: 1, year: currentYear - 4, daysAgo: 4 * 365 + 180, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Check and replace smoke detector batteries", taskCategory: "Safety", month: 1, year: currentYear - 4, daysAgo: 4 * 365 + 175, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Flush water heater", taskCategory: "Plumbing", month: 2, year: currentYear - 4, daysAgo: 4 * 365 + 150, completionMethod: "diy", costSavings: 120 },
          { taskTitle: "Inspect and clean dryer vent", taskCategory: "Laundry", month: 2, year: currentYear - 4, daysAgo: 4 * 365 + 145, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Test GFCI outlets", taskCategory: "Electrical", month: 3, year: currentYear - 4, daysAgo: 4 * 365 + 120, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Clean refrigerator coils", taskCategory: "Kitchen", month: 3, year: currentYear - 4, daysAgo: 4 * 365 + 115, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect window caulking", taskCategory: "Doors & Windows", month: 4, year: currentYear - 4, daysAgo: 4 * 365 + 90, completionMethod: "diy", costSavings: 80 },
          { taskTitle: "Service air conditioner", taskCategory: "HVAC", month: 5, year: currentYear - 4, daysAgo: 4 * 365 + 60, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Check attic ventilation", taskCategory: "Insulation", month: 5, year: currentYear - 4, daysAgo: 4 * 365 + 55, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Clean gutters", taskCategory: "Exterior", month: 6, year: currentYear - 4, daysAgo: 4 * 365 + 30, completionMethod: "diy", costSavings: 200 },
          { taskTitle: "Inspect deck for rot or damage", taskCategory: "Exterior", month: 6, year: currentYear - 4, daysAgo: 4 * 365 + 25, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Seal driveway cracks", taskCategory: "Exterior", month: 7, year: currentYear - 4, daysAgo: 4 * 365 + 5, completionMethod: "diy", costSavings: 250 },
          { taskTitle: "Test sump pump", taskCategory: "Plumbing", month: 8, year: currentYear - 4, daysAgo: 4 * 365, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Replace HVAC filter", taskCategory: "HVAC", month: 9, year: currentYear - 4, daysAgo: 4 * 365 - 30, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Winterize outdoor faucets", taskCategory: "Plumbing", month: 10, year: currentYear - 4, daysAgo: 4 * 365 - 60, completionMethod: "diy", costSavings: 150 },
          { taskTitle: "Check weather stripping on exterior doors", taskCategory: "Doors & Windows", month: 10, year: currentYear - 4, daysAgo: 4 * 365 - 65, completionMethod: "diy", costSavings: 120 },
          { taskTitle: "Inspect fireplace and chimney", taskCategory: "Fireplace", month: 11, year: currentYear - 4, daysAgo: 4 * 365 - 90, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Check attic insulation", taskCategory: "Insulation", month: 12, year: currentYear - 4, daysAgo: 4 * 365 - 120, completionMethod: "diy", costSavings: 0 },
          // ── Year -3 ──────────────────────────────────────────────────
          { taskTitle: "Furnace inspection and tune-up", taskCategory: "HVAC", month: 1, year: currentYear - 3, daysAgo: 3 * 365 + 180, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Test carbon monoxide detectors", taskCategory: "Safety", month: 1, year: currentYear - 3, daysAgo: 3 * 365 + 175, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Clean bathroom exhaust fans", taskCategory: "Ventilation", month: 2, year: currentYear - 3, daysAgo: 3 * 365 + 150, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect plumbing for leaks", taskCategory: "Plumbing", month: 2, year: currentYear - 3, daysAgo: 3 * 365 + 145, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Lubricate garage door hardware", taskCategory: "Garage", month: 3, year: currentYear - 3, daysAgo: 3 * 365 + 120, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Check electrical panel for issues", taskCategory: "Electrical", month: 3, year: currentYear - 3, daysAgo: 3 * 365 + 115, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Deep clean kitchen appliances", taskCategory: "Kitchen", month: 4, year: currentYear - 3, daysAgo: 3 * 365 + 90, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect roof shingles for damage", taskCategory: "Exterior", month: 4, year: currentYear - 3, daysAgo: 3 * 365 + 85, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Service central A/C unit", taskCategory: "HVAC", month: 5, year: currentYear - 3, daysAgo: 3 * 365 + 60, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Paint exterior trim", taskCategory: "Exterior", month: 5, year: currentYear - 3, daysAgo: 3 * 365 + 55, completionMethod: "diy", costSavings: 400 },
          { taskTitle: "Clean and inspect deck boards", taskCategory: "Exterior", month: 6, year: currentYear - 3, daysAgo: 3 * 365 + 30, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Clear gutters and downspouts", taskCategory: "Exterior", month: 6, year: currentYear - 3, daysAgo: 3 * 365 + 25, completionMethod: "diy", costSavings: 200 },
          { taskTitle: "Inspect and caulk windows", taskCategory: "Doors & Windows", month: 7, year: currentYear - 3, daysAgo: 3 * 365 + 5, completionMethod: "diy", costSavings: 100 },
          { taskTitle: "Service lawn irrigation system", taskCategory: "Outdoor", month: 7, year: currentYear - 3, daysAgo: 3 * 365, completionMethod: "diy", costSavings: 180 },
          { taskTitle: "Replace HVAC filters", taskCategory: "HVAC", month: 8, year: currentYear - 3, daysAgo: 3 * 365 - 30, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Check crawl space for moisture", taskCategory: "Foundation", month: 8, year: currentYear - 3, daysAgo: 3 * 365 - 35, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Aerate and overseed lawn", taskCategory: "Outdoor", month: 9, year: currentYear - 3, daysAgo: 3 * 365 - 60, completionMethod: "diy", costSavings: 300 },
          { taskTitle: "Inspect attic for pests", taskCategory: "Insulation", month: 9, year: currentYear - 3, daysAgo: 3 * 365 - 65, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Drain irrigation and shut off outdoor water", taskCategory: "Plumbing", month: 10, year: currentYear - 3, daysAgo: 3 * 365 - 90, completionMethod: "diy", costSavings: 150 },
          { taskTitle: "Clean fireplace flue", taskCategory: "Fireplace", month: 11, year: currentYear - 3, daysAgo: 3 * 365 - 120, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Inspect and re-caulk bathtubs", taskCategory: "Plumbing", month: 11, year: currentYear - 3, daysAgo: 3 * 365 - 125, completionMethod: "diy", costSavings: 200 },
          { taskTitle: "Replace worn door hardware", taskCategory: "Doors & Windows", month: 12, year: currentYear - 3, daysAgo: 3 * 365 - 150, completionMethod: "diy", costSavings: 0 },
          // ── Year -2 ──────────────────────────────────────────────────
          { taskTitle: "Annual HVAC service contract renewal", taskCategory: "HVAC", month: 1, year: currentYear - 2, daysAgo: 2 * 365 + 180, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Replace smoke detector batteries", taskCategory: "Safety", month: 1, year: currentYear - 2, daysAgo: 2 * 365 + 175, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Flush water heater sediment", taskCategory: "Plumbing", month: 2, year: currentYear - 2, daysAgo: 2 * 365 + 150, completionMethod: "diy", costSavings: 120 },
          { taskTitle: "Inspect dryer vent for lint buildup", taskCategory: "Laundry", month: 2, year: currentYear - 2, daysAgo: 2 * 365 + 145, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Check whole-home water pressure", taskCategory: "Plumbing", month: 3, year: currentYear - 2, daysAgo: 2 * 365 + 120, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Replace furnace filter", taskCategory: "HVAC", month: 3, year: currentYear - 2, daysAgo: 2 * 365 + 115, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Check exterior drainage and grading", taskCategory: "Exterior", month: 4, year: currentYear - 2, daysAgo: 2 * 365 + 90, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Clean windows inside and out", taskCategory: "Doors & Windows", month: 4, year: currentYear - 2, daysAgo: 2 * 365 + 85, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "A/C pre-season service", taskCategory: "HVAC", month: 5, year: currentYear - 2, daysAgo: 2 * 365 + 60, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Stain and seal deck", taskCategory: "Exterior", month: 5, year: currentYear - 2, daysAgo: 2 * 365 + 55, completionMethod: "diy", costSavings: 600 },
          { taskTitle: "Inspect and clean gutters", taskCategory: "Exterior", month: 6, year: currentYear - 2, daysAgo: 2 * 365 + 30, completionMethod: "diy", costSavings: 200 },
          { taskTitle: "Test garage door auto-reverse", taskCategory: "Garage", month: 6, year: currentYear - 2, daysAgo: 2 * 365 + 25, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Re-caulk kitchen backsplash", taskCategory: "Kitchen", month: 7, year: currentYear - 2, daysAgo: 2 * 365 + 5, completionMethod: "diy", costSavings: 300 },
          { taskTitle: "Clean HVAC air vents", taskCategory: "HVAC", month: 7, year: currentYear - 2, daysAgo: 2 * 365, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect roof after summer storms", taskCategory: "Exterior", month: 8, year: currentYear - 2, daysAgo: 2 * 365 - 30, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Change HVAC filters (quarterly)", taskCategory: "HVAC", month: 9, year: currentYear - 2, daysAgo: 2 * 365 - 60, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Seal foundation cracks", taskCategory: "Foundation", month: 9, year: currentYear - 2, daysAgo: 2 * 365 - 65, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Winterize lawn irrigation", taskCategory: "Outdoor", month: 10, year: currentYear - 2, daysAgo: 2 * 365 - 90, completionMethod: "diy", costSavings: 150 },
          { taskTitle: "Inspect weatherproofing on garage door", taskCategory: "Garage", month: 10, year: currentYear - 2, daysAgo: 2 * 365 - 95, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Pre-winter furnace inspection", taskCategory: "HVAC", month: 11, year: currentYear - 2, daysAgo: 2 * 365 - 120, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Check crawl space insulation", taskCategory: "Insulation", month: 11, year: currentYear - 2, daysAgo: 2 * 365 - 125, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Deep clean oven and range", taskCategory: "Kitchen", month: 12, year: currentYear - 2, daysAgo: 2 * 365 - 150, completionMethod: "diy", costSavings: 0 },
          // ── Year -1 ──────────────────────────────────────────────────
          { taskTitle: "HVAC preventive maintenance visit", taskCategory: "HVAC", month: 1, year: currentYear - 1, daysAgo: 365 + 180, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Check all door locks and deadbolts", taskCategory: "Safety", month: 1, year: currentYear - 1, daysAgo: 365 + 175, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Drain sediment from water heater", taskCategory: "Plumbing", month: 2, year: currentYear - 1, daysAgo: 365 + 150, completionMethod: "diy", costSavings: 120 },
          { taskTitle: "Clean range hood filter", taskCategory: "Kitchen", month: 2, year: currentYear - 1, daysAgo: 365 + 145, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Test whole-house smoke alarm system", taskCategory: "Safety", month: 3, year: currentYear - 1, daysAgo: 365 + 120, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect attic for air leaks", taskCategory: "Insulation", month: 3, year: currentYear - 1, daysAgo: 365 + 115, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Patch and paint interior walls", taskCategory: "Interior", month: 4, year: currentYear - 1, daysAgo: 365 + 90, completionMethod: "diy", costSavings: 500 },
          { taskTitle: "Check outdoor lighting and fixtures", taskCategory: "Electrical", month: 4, year: currentYear - 1, daysAgo: 365 + 85, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect and clean air conditioner", taskCategory: "HVAC", month: 5, year: currentYear - 1, daysAgo: 365 + 60, completionMethod: "diy", costSavings: 150 },
          { taskTitle: "Check smoke and CO detectors", taskCategory: "Safety", month: 5, year: currentYear - 1, daysAgo: 365 + 55, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Clean gutters and downspouts", taskCategory: "Exterior", month: 6, year: currentYear - 1, daysAgo: 365 + 30, completionMethod: "diy", costSavings: 200 },
          { taskTitle: "Inspect roof for damage", taskCategory: "Exterior", month: 6, year: currentYear - 1, daysAgo: 365 + 25, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Service lawn equipment", taskCategory: "Outdoor", month: 6, year: currentYear - 1, daysAgo: 365 + 20, completionMethod: "diy", costSavings: 80 },
          { taskTitle: "Check and replace weather stripping", taskCategory: "Doors & Windows", month: 7, year: currentYear - 1, daysAgo: 365 + 5, completionMethod: "diy", costSavings: 120 },
          { taskTitle: "Test garage door safety features", taskCategory: "Safety", month: 7, year: currentYear - 1, daysAgo: 365, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Drain water heater sediment", taskCategory: "Plumbing", month: 8, year: currentYear - 1, daysAgo: 365 - 30, completionMethod: "diy", costSavings: 100 },
          { taskTitle: "Clean range hood filters", taskCategory: "Kitchen", month: 8, year: currentYear - 1, daysAgo: 365 - 35, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect and seal driveway cracks", taskCategory: "Exterior", month: 9, year: currentYear - 1, daysAgo: 365 - 60, completionMethod: "diy", costSavings: 250 },
          { taskTitle: "Change HVAC filters", taskCategory: "HVAC", month: 9, year: currentYear - 1, daysAgo: 365 - 65, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Inspect furnace before winter", taskCategory: "HVAC", month: 10, year: currentYear - 1, daysAgo: 365 - 90, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Clean and store outdoor furniture", taskCategory: "Outdoor", month: 10, year: currentYear - 1, daysAgo: 365 - 95, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Check attic insulation", taskCategory: "Insulation", month: 11, year: currentYear - 1, daysAgo: 365 - 120, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Test sump pump operation", taskCategory: "Plumbing", month: 11, year: currentYear - 1, daysAgo: 365 - 125, completionMethod: "diy", costSavings: 0 },
          { taskTitle: "Clean and inspect chimney", taskCategory: "Fireplace", month: 12, year: currentYear - 1, daysAgo: 365 - 150, completionMethod: "professional", costSavings: 0 },
          { taskTitle: "Inspect weatherstripping on windows", taskCategory: "Doors & Windows", month: 12, year: currentYear - 1, daysAgo: 365 - 155, completionMethod: "diy", costSavings: 80 },
        ];

        const needed = DEMO_TASK_TARGET - existingCount;
        const tasksToInsert = allDemoTasks.slice(0, needed);

        await Promise.all(
          tasksToInsert.map(async (task) => {
            const completedDate = new Date(Date.now() - task.daysAgo * 24 * 60 * 60 * 1000);
            await db.insert(taskCompletions).values({
              id: randomUUID(),
              homeownerId: demoId,
              houseId: mainHouse.id,
              taskId: null,
              taskType: "maintenance",
              taskTitle: task.taskTitle,
              taskCategory: task.taskCategory,
              completedAt: completedDate,
              month: task.month,
              year: task.year,
              completionMethod: task.completionMethod,
              estimatedCost: task.costSavings > 0 ? task.costSavings.toString() : null,
              actualCost: task.completionMethod === "professional" ? "150.00" : "0.00",
              costSavings: task.costSavings > 0 ? task.costSavings.toString() : null,
              notes: task.completionMethod === "diy" ? "Completed as DIY project" : null,
            });
          })
        );

        log.info(
          { section: "taskCompletions", inserted: tasksToInsert.length, existingCount, target: DEMO_TASK_TARGET },
          "[DEMO DATA] Task completions topped up for Sarah Anderson"
        );
        seedResults.taskCompletions = {
          ok: true,
          inserted: tasksToInsert.length,
          expected: needed,
        };
      }
    } else {
      log.info(
        { section: "taskCompletions", existingCount, target: DEMO_TASK_TARGET },
        "[DEMO DATA] Task completions already at target — skipping"
      );
      seedResults.taskCompletions = { ok: true };
    }
  } catch (taskError) {
    const msg = taskError instanceof Error ? taskError.message : String(taskError);
    log.error({ section: "taskCompletions", error: msg }, "[DEMO] Error creating demo task completions");
    seedResults.taskCompletions = { ok: false, error: msg };
  }

  const failedSections = Object.entries(seedResults).filter(([, v]) => !v.ok).map(([k]) => k);
  const countMismatches = Object.entries(seedResults)
    .filter(([, v]) => v.ok && v.inserted !== undefined && v.inserted !== v.expected)
    .map(([k, v]) => ({ section: k, inserted: v.inserted, expected: v.expected }));
  if (failedSections.length > 0 || countMismatches.length > 0) {
    log.warn({ seedResults, failedSections, countMismatches }, "[DEMO] Homeowner demo seeding completed with issues");
  } else {
    log.info({ seedResults }, "[DEMO] Homeowner demo seeding completed successfully");
  }

  return { user, seedResults };
}

// ---------------------------------------------------------------------------
// Homeowner task top-up (used by the GET redirect path)
// ---------------------------------------------------------------------------

export async function topUpHomeownerTaskCompletions(): Promise<void> {
  const demoId = "demo-homeowner-permanent-id";
  const DEMO_TC_TARGET = 195;
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // Matches the health-score endpoint's 12-month rolling window
  const cutoffAbsMonth = (currentYear - 1) * 12 + currentMonth;

  // Count only in-window completions — out-of-window rows don't contribute to score
  const [{ cnt }] = await db
    .select({ cnt: drizzleSql<number>`cast(coalesce(sum(case when year * 12 + month >= ${cutoffAbsMonth} then 1 else 0 end), 0) as integer)` })
    .from(taskCompletions)
    .where(eq(taskCompletions.homeownerId, demoId));

  if (cnt >= DEMO_TC_TARGET) return;

  const houses = await storage.getHouses(demoId);
  const mainHouse = houses.find((h: any) => h.name === "Main Residence") || houses[0];
  if (!mainHouse) return;

  const allDemoTasks = [
    { taskTitle: "Annual furnace tune-up", taskCategory: "HVAC", month: 1, year: currentYear - 4, daysAgo: 4 * 365 + 180, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Check and replace smoke detector batteries", taskCategory: "Safety", month: 1, year: currentYear - 4, daysAgo: 4 * 365 + 175, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Flush water heater", taskCategory: "Plumbing", month: 2, year: currentYear - 4, daysAgo: 4 * 365 + 150, completionMethod: "diy", costSavings: 120 },
    { taskTitle: "Inspect and clean dryer vent", taskCategory: "Laundry", month: 2, year: currentYear - 4, daysAgo: 4 * 365 + 145, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Test GFCI outlets", taskCategory: "Electrical", month: 3, year: currentYear - 4, daysAgo: 4 * 365 + 120, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Clean refrigerator coils", taskCategory: "Kitchen", month: 3, year: currentYear - 4, daysAgo: 4 * 365 + 115, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect window caulking", taskCategory: "Doors & Windows", month: 4, year: currentYear - 4, daysAgo: 4 * 365 + 90, completionMethod: "diy", costSavings: 80 },
    { taskTitle: "Service air conditioner", taskCategory: "HVAC", month: 5, year: currentYear - 4, daysAgo: 4 * 365 + 60, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Check attic ventilation", taskCategory: "Insulation", month: 5, year: currentYear - 4, daysAgo: 4 * 365 + 55, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Clean gutters", taskCategory: "Exterior", month: 6, year: currentYear - 4, daysAgo: 4 * 365 + 30, completionMethod: "diy", costSavings: 200 },
    { taskTitle: "Inspect deck for rot or damage", taskCategory: "Exterior", month: 6, year: currentYear - 4, daysAgo: 4 * 365 + 25, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Seal driveway cracks", taskCategory: "Exterior", month: 7, year: currentYear - 4, daysAgo: 4 * 365 + 5, completionMethod: "diy", costSavings: 250 },
    { taskTitle: "Test sump pump", taskCategory: "Plumbing", month: 8, year: currentYear - 4, daysAgo: 4 * 365, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Replace HVAC filter", taskCategory: "HVAC", month: 9, year: currentYear - 4, daysAgo: 4 * 365 - 30, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Winterize outdoor faucets", taskCategory: "Plumbing", month: 10, year: currentYear - 4, daysAgo: 4 * 365 - 60, completionMethod: "diy", costSavings: 150 },
    { taskTitle: "Check weather stripping on exterior doors", taskCategory: "Doors & Windows", month: 10, year: currentYear - 4, daysAgo: 4 * 365 - 65, completionMethod: "diy", costSavings: 120 },
    { taskTitle: "Inspect fireplace and chimney", taskCategory: "Fireplace", month: 11, year: currentYear - 4, daysAgo: 4 * 365 - 90, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Check attic insulation", taskCategory: "Insulation", month: 12, year: currentYear - 4, daysAgo: 4 * 365 - 120, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Furnace inspection and tune-up", taskCategory: "HVAC", month: 1, year: currentYear - 3, daysAgo: 3 * 365 + 180, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Test carbon monoxide detectors", taskCategory: "Safety", month: 1, year: currentYear - 3, daysAgo: 3 * 365 + 175, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Clean bathroom exhaust fans", taskCategory: "Ventilation", month: 2, year: currentYear - 3, daysAgo: 3 * 365 + 150, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect plumbing for leaks", taskCategory: "Plumbing", month: 2, year: currentYear - 3, daysAgo: 3 * 365 + 145, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Lubricate garage door hardware", taskCategory: "Garage", month: 3, year: currentYear - 3, daysAgo: 3 * 365 + 120, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Check electrical panel for issues", taskCategory: "Electrical", month: 3, year: currentYear - 3, daysAgo: 3 * 365 + 115, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Deep clean kitchen appliances", taskCategory: "Kitchen", month: 4, year: currentYear - 3, daysAgo: 3 * 365 + 90, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect roof shingles for damage", taskCategory: "Exterior", month: 4, year: currentYear - 3, daysAgo: 3 * 365 + 85, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Service central A/C unit", taskCategory: "HVAC", month: 5, year: currentYear - 3, daysAgo: 3 * 365 + 60, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Paint exterior trim", taskCategory: "Exterior", month: 5, year: currentYear - 3, daysAgo: 3 * 365 + 55, completionMethod: "diy", costSavings: 400 },
    { taskTitle: "Clean and inspect deck boards", taskCategory: "Exterior", month: 6, year: currentYear - 3, daysAgo: 3 * 365 + 30, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Clear gutters and downspouts", taskCategory: "Exterior", month: 6, year: currentYear - 3, daysAgo: 3 * 365 + 25, completionMethod: "diy", costSavings: 200 },
    { taskTitle: "Inspect and caulk windows", taskCategory: "Doors & Windows", month: 7, year: currentYear - 3, daysAgo: 3 * 365 + 5, completionMethod: "diy", costSavings: 100 },
    { taskTitle: "Service lawn irrigation system", taskCategory: "Outdoor", month: 7, year: currentYear - 3, daysAgo: 3 * 365, completionMethod: "diy", costSavings: 180 },
    { taskTitle: "Replace HVAC filters", taskCategory: "HVAC", month: 8, year: currentYear - 3, daysAgo: 3 * 365 - 30, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Check crawl space for moisture", taskCategory: "Foundation", month: 8, year: currentYear - 3, daysAgo: 3 * 365 - 35, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Aerate and overseed lawn", taskCategory: "Outdoor", month: 9, year: currentYear - 3, daysAgo: 3 * 365 - 60, completionMethod: "diy", costSavings: 300 },
    { taskTitle: "Drain irrigation and shut off outdoor water", taskCategory: "Plumbing", month: 10, year: currentYear - 3, daysAgo: 3 * 365 - 90, completionMethod: "diy", costSavings: 150 },
    { taskTitle: "Clean fireplace flue", taskCategory: "Fireplace", month: 11, year: currentYear - 3, daysAgo: 3 * 365 - 120, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Inspect and re-caulk bathtubs", taskCategory: "Plumbing", month: 11, year: currentYear - 3, daysAgo: 3 * 365 - 125, completionMethod: "diy", costSavings: 200 },
    { taskTitle: "Replace worn door hardware", taskCategory: "Doors & Windows", month: 12, year: currentYear - 3, daysAgo: 3 * 365 - 150, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Annual HVAC service contract renewal", taskCategory: "HVAC", month: 1, year: currentYear - 2, daysAgo: 2 * 365 + 180, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Replace smoke detector batteries", taskCategory: "Safety", month: 1, year: currentYear - 2, daysAgo: 2 * 365 + 175, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Flush water heater sediment", taskCategory: "Plumbing", month: 2, year: currentYear - 2, daysAgo: 2 * 365 + 150, completionMethod: "diy", costSavings: 120 },
    { taskTitle: "Inspect dryer vent for lint buildup", taskCategory: "Laundry", month: 2, year: currentYear - 2, daysAgo: 2 * 365 + 145, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Check whole-home water pressure", taskCategory: "Plumbing", month: 3, year: currentYear - 2, daysAgo: 2 * 365 + 120, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Replace furnace filter", taskCategory: "HVAC", month: 3, year: currentYear - 2, daysAgo: 2 * 365 + 115, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Check exterior drainage and grading", taskCategory: "Exterior", month: 4, year: currentYear - 2, daysAgo: 2 * 365 + 90, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Clean windows inside and out", taskCategory: "Doors & Windows", month: 4, year: currentYear - 2, daysAgo: 2 * 365 + 85, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "A/C pre-season service", taskCategory: "HVAC", month: 5, year: currentYear - 2, daysAgo: 2 * 365 + 60, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Stain and seal deck", taskCategory: "Exterior", month: 5, year: currentYear - 2, daysAgo: 2 * 365 + 55, completionMethod: "diy", costSavings: 600 },
    { taskTitle: "Inspect and clean gutters", taskCategory: "Exterior", month: 6, year: currentYear - 2, daysAgo: 2 * 365 + 30, completionMethod: "diy", costSavings: 200 },
    { taskTitle: "Test garage door auto-reverse", taskCategory: "Garage", month: 6, year: currentYear - 2, daysAgo: 2 * 365 + 25, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Re-caulk kitchen backsplash", taskCategory: "Kitchen", month: 7, year: currentYear - 2, daysAgo: 2 * 365 + 5, completionMethod: "diy", costSavings: 300 },
    { taskTitle: "Clean HVAC air vents", taskCategory: "HVAC", month: 7, year: currentYear - 2, daysAgo: 2 * 365, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect roof after summer storms", taskCategory: "Exterior", month: 8, year: currentYear - 2, daysAgo: 2 * 365 - 30, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Change HVAC filters (quarterly)", taskCategory: "HVAC", month: 9, year: currentYear - 2, daysAgo: 2 * 365 - 60, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Winterize lawn irrigation", taskCategory: "Outdoor", month: 10, year: currentYear - 2, daysAgo: 2 * 365 - 90, completionMethod: "diy", costSavings: 150 },
    { taskTitle: "Pre-winter furnace inspection", taskCategory: "HVAC", month: 11, year: currentYear - 2, daysAgo: 2 * 365 - 120, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Check crawl space insulation", taskCategory: "Insulation", month: 11, year: currentYear - 2, daysAgo: 2 * 365 - 125, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Deep clean oven and range", taskCategory: "Kitchen", month: 12, year: currentYear - 2, daysAgo: 2 * 365 - 150, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "HVAC preventive maintenance visit", taskCategory: "HVAC", month: 1, year: currentYear - 1, daysAgo: 365 + 180, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Check all door locks and deadbolts", taskCategory: "Safety", month: 1, year: currentYear - 1, daysAgo: 365 + 175, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Drain sediment from water heater", taskCategory: "Plumbing", month: 2, year: currentYear - 1, daysAgo: 365 + 150, completionMethod: "diy", costSavings: 120 },
    { taskTitle: "Clean range hood filter", taskCategory: "Kitchen", month: 2, year: currentYear - 1, daysAgo: 365 + 145, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Test whole-house smoke alarm system", taskCategory: "Safety", month: 3, year: currentYear - 1, daysAgo: 365 + 120, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect attic for air leaks", taskCategory: "Insulation", month: 3, year: currentYear - 1, daysAgo: 365 + 115, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Patch and paint interior walls", taskCategory: "Interior", month: 4, year: currentYear - 1, daysAgo: 365 + 90, completionMethod: "diy", costSavings: 500 },
    { taskTitle: "Check outdoor lighting and fixtures", taskCategory: "Electrical", month: 4, year: currentYear - 1, daysAgo: 365 + 85, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect and clean air conditioner", taskCategory: "HVAC", month: 5, year: currentYear - 1, daysAgo: 365 + 60, completionMethod: "diy", costSavings: 150 },
    { taskTitle: "Check smoke and CO detectors", taskCategory: "Safety", month: 5, year: currentYear - 1, daysAgo: 365 + 55, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Clean gutters and downspouts", taskCategory: "Exterior", month: 6, year: currentYear - 1, daysAgo: 365 + 30, completionMethod: "diy", costSavings: 200 },
    { taskTitle: "Inspect roof for damage", taskCategory: "Exterior", month: 6, year: currentYear - 1, daysAgo: 365 + 25, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Service lawn equipment", taskCategory: "Outdoor", month: 6, year: currentYear - 1, daysAgo: 365 + 20, completionMethod: "diy", costSavings: 80 },
    { taskTitle: "Check and replace weather stripping", taskCategory: "Doors & Windows", month: 7, year: currentYear - 1, daysAgo: 365 + 5, completionMethod: "diy", costSavings: 120 },
    { taskTitle: "Test garage door safety features", taskCategory: "Safety", month: 7, year: currentYear - 1, daysAgo: 365, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Drain water heater sediment", taskCategory: "Plumbing", month: 8, year: currentYear - 1, daysAgo: 365 - 30, completionMethod: "diy", costSavings: 100 },
    { taskTitle: "Clean range hood filters", taskCategory: "Kitchen", month: 8, year: currentYear - 1, daysAgo: 365 - 35, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect and seal driveway cracks", taskCategory: "Exterior", month: 9, year: currentYear - 1, daysAgo: 365 - 60, completionMethod: "diy", costSavings: 250 },
    { taskTitle: "Change HVAC filters", taskCategory: "HVAC", month: 9, year: currentYear - 1, daysAgo: 365 - 65, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Inspect furnace before winter", taskCategory: "HVAC", month: 10, year: currentYear - 1, daysAgo: 365 - 90, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Clean and store outdoor furniture", taskCategory: "Outdoor", month: 10, year: currentYear - 1, daysAgo: 365 - 95, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Check attic insulation", taskCategory: "Insulation", month: 11, year: currentYear - 1, daysAgo: 365 - 120, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Test sump pump operation", taskCategory: "Plumbing", month: 11, year: currentYear - 1, daysAgo: 365 - 125, completionMethod: "diy", costSavings: 0 },
    { taskTitle: "Clean and inspect chimney", taskCategory: "Fireplace", month: 12, year: currentYear - 1, daysAgo: 365 - 150, completionMethod: "professional", costSavings: 0 },
    { taskTitle: "Inspect weatherstripping on windows", taskCategory: "Doors & Windows", month: 12, year: currentYear - 1, daysAgo: 365 - 155, completionMethod: "diy", costSavings: 80 },
  ];

  const needed = DEMO_TC_TARGET - cnt;
  const toInsert = allDemoTasks.slice(0, needed);
  await Promise.all(
    toInsert.map(async (task) => {
      const completedDate = new Date(Date.now() - task.daysAgo * 24 * 60 * 60 * 1000);
      // Place each task in the 12-month scoring window:
      // months >= currentMonth land in last year; earlier months land in current year.
      const taskYear = task.month >= currentMonth ? currentYear - 1 : currentYear;
      await db.insert(taskCompletions).values({
        id: randomUUID(),
        homeownerId: demoId,
        houseId: mainHouse.id,
        taskId: null,
        taskType: "maintenance",
        taskTitle: task.taskTitle,
        taskCategory: task.taskCategory,
        completedAt: completedDate,
        month: task.month,
        year: taskYear,
        completionMethod: task.completionMethod,
        estimatedCost: task.costSavings > 0 ? task.costSavings.toString() : null,
        actualCost: task.completionMethod === "professional" ? "150.00" : "0.00",
        costSavings: task.costSavings > 0 ? task.costSavings.toString() : null,
        notes: task.completionMethod === "diy" ? "Completed as DIY project" : null,
      });
    })
  );
}

// ---------------------------------------------------------------------------
// Contractor seeder
// ---------------------------------------------------------------------------

export async function seedContractorDemo(log: DemoLog): Promise<SeedOutcome> {
  const demoEmail = "david.martinez@precisionhvac.com";
  const demoId = "demo-contractor-permanent-id";
  const companyId = "demo-company-permanent-id";

  let user = await storage.getUserByEmail(demoEmail);
  if (!user) {
    const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    user = await storage.upsertUser({
      id: demoId,
      email: demoEmail,
      firstName: "David",
      lastName: "Martinez",
      profileImageUrl: null,
      role: "contractor",
      zipCode: "98103",
      subscriptionStatus: "grandfathered",
      trialEndsAt,
      companyId: null,
      companyRole: null,
    });
  }

  const seedResults: SeedResults = {};

  try {
    let company = await storage.getCompany(companyId);
    if (!company) {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);

      company = await storage.createCompany({
        name: "Precision HVAC & Plumbing",
        ownerId: user.id,
        location: "Seattle, WA",
        address: "1425 Industrial Way, Seattle, WA 98103",
        countryId: null,
        regionId: null,
        postalCode: "98103",
        latitude: String(47.6597),
        longitude: String(-122.3331),
        website: "https://precisionhvac.example.com",
        phone: "(206) 555-0142",
        email: demoEmail,
        bio: "Family-owned HVAC and plumbing company serving Seattle and surrounding areas since 2015. Specializing in residential heating, cooling, and plumbing services with a focus on energy efficiency and customer satisfaction. Our certified technicians provide honest, reliable service at fair prices.",
        services: ["HVAC Installation", "HVAC Repair", "AC Maintenance", "Furnace Service", "Plumbing Repair", "Water Heater Installation", "Emergency Services"],
        serviceRadius: 25,
        hasEmergencyServices: true,
        isLicensed: true,
        licenseNumber: "WA-HVAC-98765",
        licenseMunicipality: "Washington State",
        licenseExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        isInsured: true,
        createdAt: threeYearsAgo,
        insuranceProvider: "State Farm Commercial",
        insuranceExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        insuranceCoverageAmount: "$2,000,000",
        businessHours: "Mon-Fri: 7am-6pm, Sat: 8am-4pm, Sun: Closed",
        yearsInBusiness: 9,
        numberOfEmployees: 12,
        isBonded: true,
        bondingCompany: "Travelers Casualty & Surety",
        certifications: ["NATE Certified", "EPA 608 Universal", "Master Plumber", "Energy Star Partner"],
        specialties: ["High-efficiency HVAC systems", "Tankless water heaters", "Radiant floor heating", "Smart thermostat installation"],
        paymentMethods: ["Cash", "Check", "Credit Card", "Financing Available"],
        warrantyInfo: "All installations include 1-year labor warranty. Equipment warranties vary by manufacturer (typically 5-10 years).",
        insuranceInfo: "Comprehensive general liability and workers compensation insurance. $2M coverage limit.",
        rating: "4.8",
        reviewCount: 127,
      } as any);
      seedResults.company = { ok: true, inserted: 1, expected: 1 };
    } else {
      try {
        const [{ count: teamCount }] = await db
          .select({ count: drizzleSql<number>`cast(count(*) as integer)` })
          .from(users)
          .where(eq(users.companyId, companyId));
        seedResults.company = {
          ok: true,
          ...({ healthCheck: { teamMembers: teamCount } } as any),
        };
      } catch (hcErr) {
        const msg = hcErr instanceof Error ? hcErr.message : String(hcErr);
        log.error({ section: "company", error: msg }, "[DEMO] Health-check failed for existing demo company");
        seedResults.company = { ok: false, error: msg };
      }
    }

    if (!user.companyId) {
      user = await storage.upsertUser({
        ...user,
        companyId,
        companyRole: "owner",
        canRespondToProposals: true,
      });
    }

    // ── CRM Leads ────────────────────────────────────────────────────────────
    try {
      const leadSeed = [
        { id: "demo-lead-1", contractorUserId: demoId, companyId, firstName: "Michael", lastName: "Chen", email: "michael.chen@email.com", phone: "(206) 555-1234", projectType: "HVAC Repair", address: "1523 Pine Street, Seattle, WA 98101", status: "contacted", priority: "high", estimatedValue: "850.00", source: "website", metadata: { notes: "AC not cooling. Customer has 20-year-old unit. Likely needs replacement. Scheduled estimate for next week." }, followUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
        { id: "demo-lead-2", contractorUserId: demoId, companyId, firstName: "Jennifer", lastName: "Martinez", email: "jmartinez@email.com", phone: "(206) 555-5678", projectType: "Water Heater Installation", address: "892 Broadway Ave E, Seattle, WA 98102", status: "qualified", priority: "medium", estimatedValue: "1850.00", source: "referral", metadata: { notes: "Current water heater is leaking. Wants tankless upgrade. Sent quote yesterday. Waiting for decision." }, followUpDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000) },
        { id: "demo-lead-3", contractorUserId: demoId, companyId, firstName: "Robert", lastName: "Thompson", email: "rthompson@email.com", phone: "(206) 555-9012", projectType: "Furnace Service", address: "3345 15th Ave W, Seattle, WA 98119", status: "new", priority: "medium", estimatedValue: "350.00", source: "other", metadata: { notes: "Annual maintenance needed before winter. Called this morning. Need to call back to schedule." }, followUpDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000) },
        { id: "demo-lead-4", contractorUserId: demoId, companyId, firstName: "Susan", lastName: "Williams", email: "swilliams@email.com", phone: "(206) 555-3456", projectType: "AC Installation", address: "7821 Greenwood Ave N, Seattle, WA 98103", status: "lost", priority: "low", estimatedValue: "4500.00", source: "advertisement", metadata: { notes: "Got 3 quotes. Went with another company that was $500 cheaper. Price-focused customer." }, followUpDate: null },
        { id: "demo-lead-5", contractorUserId: demoId, companyId, firstName: "David", lastName: "Park", email: "dpark@email.com", phone: "(206) 555-7890", projectType: "Plumbing Repair", address: "2156 Queen Anne Ave N, Seattle, WA 98109", status: "won", priority: "high", estimatedValue: "625.00", source: "other", metadata: { notes: "Emergency leak repair. Job completed successfully last week. Customer very happy." }, followUpDate: null },
      ];
      let leadInserted = 0;
      for (const lead of leadSeed) {
        const existing = await storage.getCrmLead(lead.id);
        if (!existing) await storage.createCrmLead(lead as any);
        leadInserted++;
      }
      seedResults.leads = { ok: true, inserted: leadInserted, expected: leadSeed.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "leads", error: msg }, "[DEMO] Error seeding CRM leads");
      seedResults.leads = { ok: false, error: msg };
    }

    // ── Sample homeowners & conversations ────────────────────────────────────
    try {
      const sampleHomeownerIds = ["sample-homeowner-1", "sample-homeowner-2", "sample-homeowner-3"];
      const existingChecks = await Promise.all(sampleHomeownerIds.map((id) => storage.getUser(id)));
      if (!existingChecks.every((u) => u != null)) {
        for (let i = 0; i < sampleHomeownerIds.length; i++) {
          await storage.upsertUser({
            id: sampleHomeownerIds[i],
            email: `homeowner${i + 1}@example.com`,
            firstName: ["Emma", "James", "Sophia"][i],
            lastName: ["Wilson", "Brown", "Davis"][i],
            role: "homeowner",
            zipCode: "98105",
            subscriptionStatus: "active",
          });
        }
      }

      const existingDemoConvs = await db
        .select({ id: conversations.id })
        .from(conversations)
        .where(eq(conversations.contractorId, demoId))
        .limit(1);

      if (existingDemoConvs.length > 0) {
        seedResults.conversations = { ok: true, inserted: 0, expected: 2, skipped: true };
      } else {
        const conv1Id = "demo-conversation-1";
        await db.insert(conversations).values({ id: conv1Id, homeownerId: sampleHomeownerIds[0], contractorId: demoId, subject: "HVAC furnace inspection inquiry" }).onConflictDoNothing();
        await db.insert(messages).values({ id: "demo-msg-1-1", conversationId: conv1Id, senderId: sampleHomeownerIds[0], senderType: "homeowner", message: "Hi David! My furnace is making a strange rattling noise when it starts up. It's about 8 years old. Could you take a look at it? I'm located in Fremont.", createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) }).onConflictDoNothing();
        await db.insert(messages).values({ id: "demo-msg-1-2", conversationId: conv1Id, senderId: demoId, senderType: "contractor", message: "Hello Emma! I'd be happy to help. A rattling noise often indicates a loose component or debris in the blower. I can come by this Thursday or Friday afternoon. Would either of those work for you?", createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000) }).onConflictDoNothing();
        await db.insert(messages).values({ id: "demo-msg-1-3", conversationId: conv1Id, senderId: sampleHomeownerIds[0], senderType: "homeowner", message: "Friday at 2pm would be perfect! What's your service call fee?", createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) }).onConflictDoNothing();
        await db.insert(messages).values({ id: "demo-msg-1-4", conversationId: conv1Id, senderId: demoId, senderType: "contractor", message: "Great! Friday at 2pm is booked. Our diagnostic service call is $125, which includes the first hour of labor. If repairs are needed, I'll provide an estimate before starting any work. See you Friday!", createdAt: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000) }).onConflictDoNothing();

        const conv2Id = "demo-conversation-2";
        await db.insert(conversations).values({ id: conv2Id, homeownerId: sampleHomeownerIds[1], contractorId: demoId, subject: "Water heater installation follow-up" }).onConflictDoNothing();
        await db.insert(messages).values({ id: "demo-msg-2-1", conversationId: conv2Id, senderId: demoId, senderType: "contractor", message: "Hi James! Just following up on the water heater installation we completed last month. Is everything working well? Remember that your 1-year labor warranty covers any installation issues.", createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) }).onConflictDoNothing();
        await db.insert(messages).values({ id: "demo-msg-2-2", conversationId: conv2Id, senderId: sampleHomeownerIds[1], senderType: "homeowner", message: "Everything is great! The tankless system is working perfectly. We love the endless hot water. Thanks for the quality work - I've already recommended you to two neighbors!", createdAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000) }).onConflictDoNothing();

        seedResults.conversations = { ok: true, inserted: 2, expected: 2 };
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "conversations", error: msg }, "[DEMO] Error seeding conversations");
      seedResults.conversations = { ok: false, error: msg };
    }

    // ── Team members ─────────────────────────────────────────────────────────
    try {
      const teamSeed = [
        { id: "demo-admin-1", email: "kayla.torres@precisionhvac.com", firstName: "Kayla", lastName: "Torres", companyRole: "admin" },
        { id: "demo-tech-1", email: "jake.reed@precisionhvac.com", firstName: "Jake", lastName: "Reed", companyRole: "tech" },
        { id: "demo-tech-2", email: "priya.nair@precisionhvac.com", firstName: "Priya", lastName: "Nair", companyRole: "dispatcher" },
      ];
      let teamInserted = 0;
      for (const tm of teamSeed) {
        await storage.upsertUser({ id: tm.id, email: tm.email, firstName: tm.firstName, lastName: tm.lastName, role: "contractor", companyId, companyRole: tm.companyRole as any, subscriptionStatus: "grandfathered", zipCode: "98103", canRespondToProposals: false });
        teamInserted++;
      }
      seedResults.team = { ok: true, inserted: teamInserted, expected: 3 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "team", error: msg }, "[DEMO] Error seeding team members");
      seedResults.team = { ok: false, error: msg };
    }

    // ── CRM Clients ──────────────────────────────────────────────────────────
    try {
      const clientSeed = [
        { id: "demo-client-1", contractorUserId: demoId, companyId, firstName: "Patricia", lastName: "Nguyen", email: "pnguyen@homeemail.com", phone: "(206) 555-2201", address: "4821 Fremont Ave N", city: "Seattle", state: "WA", postalCode: "98103", tags: ["HVAC", "Annual Contract"], preferredContactMethod: "phone", totalJobsCompleted: 5, totalRevenue: "3240.00", notes: "Long-term customer since 2018. Annual maintenance contract. Has a Carrier system.", lastServiceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000) },
        { id: "demo-client-2", contractorUserId: demoId, companyId, firstName: "Brian", lastName: "Okafor", email: "bokafor@email.com", phone: "(206) 555-3312", address: "2207 10th Ave E", city: "Seattle", state: "WA", postalCode: "98102", tags: ["Plumbing", "Emergency"], preferredContactMethod: "email", totalJobsCompleted: 2, totalRevenue: "1480.00", notes: "New customer from emergency call. Replaced main shutoff valve. Interested in annual plumbing inspection.", lastServiceDate: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000) },
        { id: "demo-client-3", contractorUserId: demoId, companyId, firstName: "Linda", lastName: "Cho", email: "linda.cho@email.com", phone: "(206) 555-4433", address: "1108 NW 56th St", city: "Seattle", state: "WA", postalCode: "98107", tags: ["HVAC", "Water Heater"], preferredContactMethod: "text", totalJobsCompleted: 3, totalRevenue: "4750.00", notes: "Installed new Trane system last year. Due for first maintenance visit. Also wants to upgrade to tankless water heater.", lastServiceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        { id: "demo-client-4", contractorUserId: demoId, companyId, firstName: "Marcus", lastName: "Delgado", email: "mdelgado@email.com", phone: "(206) 555-5544", address: "7623 35th Ave SW", city: "Seattle", state: "WA", postalCode: "98126", tags: ["Commercial", "HVAC"], preferredContactMethod: "phone", totalJobsCompleted: 8, totalRevenue: "12800.00", notes: "Owns a small restaurant. Multiple HVAC units. Quarterly maintenance schedule. High-value account.", lastServiceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        { id: "demo-client-5", contractorUserId: demoId, companyId, firstName: "Sarah", lastName: "Johansson", email: "sjohansson@email.com", phone: "(206) 555-6655", address: "3301 Eastlake Ave E", city: "Seattle", state: "WA", postalCode: "98102", tags: ["HVAC"], preferredContactMethod: "email", totalJobsCompleted: 1, totalRevenue: "325.00", notes: "First-time customer. Furnace tune-up. Was happy with service — asked about our annual plans.", lastServiceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) },
        { id: "demo-client-6", contractorUserId: demoId, companyId, firstName: "Tony", lastName: "Vasquez", email: "tvasquez@email.com", phone: "(206) 555-7766", address: "912 E Union St", city: "Seattle", state: "WA", postalCode: "98122", tags: ["Plumbing", "HVAC"], preferredContactMethod: "phone", totalJobsCompleted: 4, totalRevenue: "2900.00", notes: "Rental property owner. 3-unit building. Good steady customer.", lastServiceDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) },
      ];
      let clientInserted = 0;
      for (const c of clientSeed) {
        const existing = await storage.getCrmClient(c.id);
        if (!existing) {
          const { id: clientId, ...clientData } = c;
          await storage.createCrmClient({ id: clientId, ...clientData } as any);
        }
        clientInserted++;
      }
      seedResults.clients = { ok: true, inserted: clientInserted, expected: 6 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "clients", error: msg }, "[DEMO] Error seeding CRM clients");
      seedResults.clients = { ok: false, error: msg };
    }

    // ── CRM Jobs ─────────────────────────────────────────────────────────────
    try {
      const nowMs = Date.now();
      const hr = 60 * 60 * 1000;
      const day = 24 * hr;
      const jobSeed = [
        { id: "demo-job-1", contractorUserId: demoId, companyId, clientId: "demo-client-1", title: "Annual HVAC Maintenance — Patricia Nguyen", description: "Full system inspection and tune-up per annual contract terms.", serviceType: "HVAC Maintenance", status: "scheduled", priority: "normal", scheduledDate: new Date(nowMs + 3 * day), scheduledEndDate: new Date(nowMs + 3 * day + 2 * hr), estimatedDuration: 120, address: "4821 Fremont Ave N", city: "Seattle", state: "WA", postalCode: "98103", laborCost: "145.00", materialsCost: "35.00", totalCost: "180.00", notes: "Customer prefers mornings. Key under mat if no answer." },
        { id: "demo-job-2", contractorUserId: demoId, companyId, clientId: "demo-client-4", title: "Q3 Commercial HVAC Inspection — Delgado Restaurant", description: "Quarterly maintenance for restaurant HVAC units — filters, coils, refrigerant levels.", serviceType: "Commercial HVAC", status: "scheduled", priority: "high", scheduledDate: new Date(nowMs + 7 * day), scheduledEndDate: new Date(nowMs + 7 * day + 4 * hr), estimatedDuration: 240, address: "7623 35th Ave SW", city: "Seattle", state: "WA", postalCode: "98126", laborCost: "380.00", materialsCost: "120.00", totalCost: "500.00", notes: "Before 8am — restaurant opens at 11. Ask for Marcus or floor manager." },
        { id: "demo-job-3", contractorUserId: demoId, companyId, clientId: "demo-client-2", title: "Water Heater Flush & Inspection — Brian Okafor", description: "Annual flush and anode rod inspection on 50-gal tank water heater.", serviceType: "Plumbing", status: "in_progress", priority: "normal", scheduledDate: new Date(nowMs - 2 * hr), scheduledEndDate: new Date(nowMs + hr), actualStartTime: new Date(nowMs - 2 * hr), estimatedDuration: 90, address: "2207 10th Ave E", city: "Seattle", state: "WA", postalCode: "98102", laborCost: "125.00", materialsCost: "45.00", totalCost: "170.00", notes: "Anode rod may need replacement. Bring Hex 1-1/16\" socket." },
        { id: "demo-job-4", contractorUserId: demoId, companyId, clientId: "demo-client-6", title: "Unit 2 Furnace Repair — Tony Vasquez", description: "Flame sensor cleaning and igniter replacement on aging Bryant furnace.", serviceType: "HVAC Repair", status: "completed", priority: "urgent", scheduledDate: new Date(nowMs - 5 * day), scheduledEndDate: new Date(nowMs - 5 * day + 3 * hr), actualStartTime: new Date(nowMs - 5 * day + 30 * 60 * 1000), actualEndTime: new Date(nowMs - 5 * day + 2.5 * hr), actualDuration: 120, estimatedDuration: 180, address: "912 E Union St Unit 2", city: "Seattle", state: "WA", postalCode: "98122", laborCost: "185.00", materialsCost: "68.00", totalCost: "253.00", notes: "Tenant without heat for 1 day — prioritize.", completionNotes: "Replaced igniter and cleaned flame sensor. Furnace heating normally. Advised owner heat exchanger showing early wear — may need replacement next season." },
        { id: "demo-job-5", contractorUserId: demoId, companyId, clientId: "demo-client-3", title: "Trane System Annual Tune-Up — Linda Cho", description: "First post-install maintenance visit for new Trane XR15 system.", serviceType: "HVAC Maintenance", status: "completed", priority: "normal", scheduledDate: new Date(nowMs - 14 * day), scheduledEndDate: new Date(nowMs - 14 * day + 2 * hr), actualStartTime: new Date(nowMs - 14 * day), actualEndTime: new Date(nowMs - 14 * day + 1.75 * hr), actualDuration: 105, estimatedDuration: 120, address: "1108 NW 56th St", city: "Seattle", state: "WA", postalCode: "98107", laborCost: "145.00", materialsCost: "20.00", totalCost: "165.00", notes: "Within 1-year warranty. No charge for parts under warranty.", completionNotes: "System running at peak efficiency. Filter replaced. Customer asked about tankless water heater — quote to follow." },
        { id: "demo-job-6", contractorUserId: demoId, companyId, clientId: "demo-client-5", title: "Mini-Split Assessment — Sarah Johansson", description: "On-site assessment for ductless mini-split in home office addition.", serviceType: "HVAC Installation", status: "on_hold", priority: "low", scheduledDate: new Date(nowMs + 14 * day), scheduledEndDate: new Date(nowMs + 14 * day + hr), estimatedDuration: 60, address: "3301 Eastlake Ave E", city: "Seattle", state: "WA", postalCode: "98102", laborCost: "0.00", materialsCost: "0.00", totalCost: "0.00", notes: "On hold — customer waiting for room framing to finish before site visit.", internalNotes: "Estimate will be ~$2,800–3,400 installed. Mitsubishi or Daikin preferred." },
      ];
      let jobInserted = 0;
      for (const j of jobSeed) {
        const existing = await storage.getCrmJob(j.id);
        if (!existing) {
          const { id: jobId, ...jobData } = j;
          await storage.createCrmJob({ id: jobId, ...jobData } as any);
        }
        jobInserted++;
      }
      seedResults.jobs = { ok: true, inserted: jobInserted, expected: 6 };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "jobs", error: msg }, "[DEMO] Error seeding CRM jobs");
      seedResults.jobs = { ok: false, error: msg };
    }

    // ── CRM Quotes ────────────────────────────────────────────────────────────
    try {
      const nowMs = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const quoteSeed = [
        { id: "demo-quote-1", contractorUserId: demoId, companyId, clientId: "demo-client-3", quoteNumber: "Q-DEMO-0001", title: "Tankless Water Heater Installation — Linda Cho", description: "Supply and install Rinnai RU199iN condensing tankless unit. Includes gas line upgrade and permit.", serviceType: "Plumbing", status: "sent", lineItems: [{ description: "Rinnai RU199iN Tankless Water Heater", quantity: 1, unitPrice: "1650.00", total: "1650.00" }, { description: "Labor — installation & gas line upgrade", quantity: 1, unitPrice: "680.00", total: "680.00" }, { description: "Permit & inspection fee", quantity: 1, unitPrice: "120.00", total: "120.00" }], subtotal: "2450.00", taxRate: "10.10", taxAmount: "247.45", discount: "0.00", total: "2697.45", validUntil: new Date(nowMs + 21 * day), sentAt: new Date(nowMs - 3 * day), notes: "Quote valid 30 days. Includes 1-year labor warranty on top of Rinnai 12-year heat exchanger warranty." },
        { id: "demo-quote-2", contractorUserId: demoId, companyId, clientId: "demo-client-5", quoteNumber: "Q-DEMO-0002", title: "Ductless Mini-Split Installation — Sarah Johansson", description: "Supply and install single-zone Mitsubishi MSZ-GL12NA mini-split for home office addition.", serviceType: "HVAC Installation", status: "accepted", lineItems: [{ description: "Mitsubishi MSZ-GL12NA 12,000 BTU mini-split (indoor + outdoor)", quantity: 1, unitPrice: "1420.00", total: "1420.00" }, { description: "Labor — installation, line set, electrical connection", quantity: 1, unitPrice: "950.00", total: "950.00" }, { description: "Line set & accessories", quantity: 1, unitPrice: "185.00", total: "185.00" }, { description: "Permit", quantity: 1, unitPrice: "95.00", total: "95.00" }], subtotal: "2650.00", taxRate: "10.10", taxAmount: "267.65", discount: "100.00", total: "2817.65", validUntil: new Date(nowMs + 14 * day), sentAt: new Date(nowMs - 10 * day), acceptedAt: new Date(nowMs - 7 * day), notes: "Loyalty discount of $100 applied. Scheduling pending room framing completion." },
        { id: "demo-quote-3", contractorUserId: demoId, companyId, clientId: "demo-client-2", quoteNumber: "Q-DEMO-0003", title: "Annual Plumbing Inspection & Water Softener — Brian Okafor", description: "Annual whole-home plumbing inspection plus supply and install Pentair water softener.", serviceType: "Plumbing", status: "draft", lineItems: [{ description: "Annual plumbing inspection (14-point)", quantity: 1, unitPrice: "195.00", total: "195.00" }, { description: "Pentair Fleck 5600SXT 48,000 grain water softener", quantity: 1, unitPrice: "780.00", total: "780.00" }, { description: "Labor — softener installation & bypass valve", quantity: 1, unitPrice: "320.00", total: "320.00" }], subtotal: "1295.00", taxRate: "10.10", taxAmount: "130.80", discount: "0.00", total: "1425.80", validUntil: new Date(nowMs + 30 * day), notes: "Draft — pending customer confirmation on softener model preference." },
        { id: "demo-quote-4", contractorUserId: demoId, companyId, clientId: "demo-client-1", quoteNumber: "Q-DEMO-0004", title: "Carrier System Tune-Up & Coil Cleaning — Patricia Nguyen", description: "Extended annual maintenance visit including evaporator and condenser coil cleaning.", serviceType: "HVAC Maintenance", status: "declined", lineItems: [{ description: "Annual HVAC tune-up (standard)", quantity: 1, unitPrice: "145.00", total: "145.00" }, { description: "Evaporator coil cleaning", quantity: 1, unitPrice: "220.00", total: "220.00" }, { description: "Condenser coil cleaning", quantity: 1, unitPrice: "180.00", total: "180.00" }], subtotal: "545.00", taxRate: "0.00", taxAmount: "0.00", discount: "0.00", total: "545.00", validUntil: new Date(nowMs - 5 * day), sentAt: new Date(nowMs - 20 * day), declinedAt: new Date(nowMs - 12 * day), notes: "Customer opted for standard tune-up only this season. Follow up next spring for coil cleaning." },
      ];
      let quoteInserted = 0;
      for (const q of quoteSeed) {
        const existing = await storage.getCrmQuote(q.id);
        if (!existing) {
          const { id: quoteId, ...quoteData } = q;
          await storage.createCrmQuote({ id: quoteId, ...quoteData } as any);
        }
        quoteInserted++;
      }
      seedResults.quotes = { ok: true, inserted: quoteInserted, expected: quoteSeed.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "quotes", error: msg }, "[DEMO] Error seeding CRM quotes");
      seedResults.quotes = { ok: false, error: msg };
    }

    // ── CRM Invoices ──────────────────────────────────────────────────────────
    try {
      const nowMs = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const invoiceSeed = [
        { id: "demo-invoice-1", contractorUserId: demoId, companyId, clientId: "demo-client-6", jobId: "demo-job-4", invoiceNumber: "INV-DEMO-0001", title: "Furnace Repair — Tony Vasquez (Unit 2)", description: "Emergency furnace repair: flame sensor cleaning and igniter replacement on aging Bryant furnace.", status: "paid", lineItems: [{ description: "Labor — flame sensor cleaning & igniter replacement", quantity: 1, unitPrice: "185.00", total: "185.00" }, { description: "OEM igniter (Bryant/Carrier compatible)", quantity: 1, unitPrice: "48.00", total: "48.00" }, { description: "Service call / dispatch fee", quantity: 1, unitPrice: "20.00", total: "20.00" }], subtotal: "253.00", taxRate: "10.10", taxAmount: "25.55", discount: "0.00", total: "278.55", amountPaid: "278.55", amountDue: "0.00", dueDate: new Date(nowMs - 2 * day), sentAt: new Date(nowMs - 5 * day), viewedAt: new Date(nowMs - 4 * day), paidAt: new Date(nowMs - 3 * day), paymentMethod: "check", paymentNotes: "Check #1042 from Tony Vasquez.", notes: "Emergency after-hours call. Tenant now has heat. Advised owner heat exchanger showing early wear." },
        { id: "demo-invoice-2", contractorUserId: demoId, companyId, clientId: "demo-client-3", jobId: "demo-job-5", invoiceNumber: "INV-DEMO-0002", title: "Trane Annual Tune-Up — Linda Cho", description: "First post-install maintenance visit for Trane XR15 system. Filter replaced, full 14-point inspection.", status: "sent", lineItems: [{ description: "Annual HVAC tune-up (14-point inspection)", quantity: 1, unitPrice: "145.00", total: "145.00" }, { description: "Merv-13 filter replacement", quantity: 1, unitPrice: "20.00", total: "20.00" }], subtotal: "165.00", taxRate: "10.10", taxAmount: "16.67", discount: "0.00", total: "181.67", amountPaid: "0.00", amountDue: "181.67", dueDate: new Date(nowMs + 3 * day), sentAt: new Date(nowMs - 12 * day), notes: "Covered under 1-year warranty — no parts charge. Please remit within 15 days." },
        { id: "demo-invoice-3", contractorUserId: demoId, companyId, clientId: "demo-client-2", jobId: "demo-job-3", invoiceNumber: "INV-DEMO-0003", title: "Water Heater Flush & Inspection — Brian Okafor", description: "Annual flush, anode rod inspection, and T&P valve test on 50-gal tank water heater.", status: "overdue", lineItems: [{ description: "Labor — water heater flush & inspection", quantity: 1, unitPrice: "125.00", total: "125.00" }, { description: "Anode rod (magnesium, 3/4\" hex)", quantity: 1, unitPrice: "35.00", total: "35.00" }, { description: "Teflon tape, fittings, misc materials", quantity: 1, unitPrice: "10.00", total: "10.00" }], subtotal: "170.00", taxRate: "0.00", taxAmount: "0.00", discount: "0.00", total: "170.00", amountPaid: "0.00", amountDue: "170.00", dueDate: new Date(nowMs - 14 * day), sentAt: new Date(nowMs - 30 * day), viewedAt: new Date(nowMs - 28 * day), notes: "PAST DUE — Please remit payment at your earliest convenience. A $15 late fee will apply after 45 days." },
        { id: "demo-invoice-4", contractorUserId: demoId, companyId, clientId: "demo-client-5", jobId: "demo-job-6", quoteId: "demo-quote-2", invoiceNumber: "INV-DEMO-0004", title: "Ductless Mini-Split Installation — Sarah Johansson", description: "Supply and install single-zone Mitsubishi MSZ-GL12NA mini-split for home office addition. Converted from accepted quote Q-DEMO-0002.", status: "viewed", lineItems: [{ description: "Mitsubishi MSZ-GL12NA 12,000 BTU mini-split (indoor + outdoor unit)", quantity: 1, unitPrice: "1420.00", total: "1420.00" }, { description: "Labor — installation, line set, electrical connection", quantity: 1, unitPrice: "950.00", total: "950.00" }, { description: "Line set & accessories", quantity: 1, unitPrice: "185.00", total: "185.00" }, { description: "Permit", quantity: 1, unitPrice: "95.00", total: "95.00" }], subtotal: "2650.00", taxRate: "10.10", taxAmount: "267.65", discount: "100.00", total: "2817.65", amountPaid: "0.00", amountDue: "2817.65", dueDate: new Date(nowMs + 23 * day), sentAt: new Date(nowMs - 7 * day), viewedAt: new Date(nowMs - 5 * day), notes: "Loyalty discount of $100 applied. Installation scheduled pending room framing completion." },
      ];
      let invoiceInserted = 0;
      for (const inv of invoiceSeed) {
        const existing = await storage.getCrmInvoice(inv.id);
        if (!existing) {
          const { id: invoiceId, ...invoiceData } = inv;
          await storage.createCrmInvoice({ id: invoiceId, ...invoiceData } as any);
        }
        invoiceInserted++;
      }
      seedResults.invoices = { ok: true, inserted: invoiceInserted, expected: invoiceSeed.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "invoices", error: msg }, "[DEMO] Error seeding CRM invoices");
      seedResults.invoices = { ok: false, error: msg };
    }

    // ── Proposals ─────────────────────────────────────────────────────────────
    try {
      const nowMs = Date.now();
      const day = 24 * 60 * 60 * 1000;
      const demoHomeownerId = "demo-homeowner-permanent-id";
      const proposalSeed = [
        { id: "demo-proposal-1", contractorId: demoId, companyId, homeownerId: demoHomeownerId, title: "Furnace Diagnostic & Repair Proposal", description: "Full diagnostic of furnace rattling noise, cleaning, and repair of loose blower components.", serviceType: "HVAC Repair", estimatedCost: "325.00", estimatedDuration: "2-4 hours", scope: "Inspect and diagnose rattling noise, tighten or replace loose blower wheel, clean heat exchanger, verify combustion and airflow, test all safety switches.", materials: ["Blower wheel fasteners", "Furnace filter (1\")", "Electrical contact cleaner"], warrantyPeriod: "1 year on labor", validUntil: new Date(nowMs + 30 * day).toISOString().split("T")[0], status: "sent", customerNotes: "Price includes all labor and standard repair parts. Any major component replacements will be quoted separately before proceeding." },
        { id: "demo-proposal-2", contractorId: demoId, companyId, homeownerId: demoHomeownerId, title: "Smart Thermostat Installation", description: "Supply and install Ecobee SmartThermostat Premium with room sensors.", serviceType: "HVAC Maintenance", estimatedCost: "285.00", estimatedDuration: "1-2 hours", scope: "Remove old thermostat, install Ecobee SmartThermostat Premium, configure Wi-Fi and app integration, install 2 room sensors, test with existing HVAC system.", materials: ["Ecobee SmartThermostat Premium", "Ecobee room sensors (2-pack)", "Mounting screws & wire labels"], warrantyPeriod: "1 year on labor", validUntil: new Date(nowMs + 21 * day).toISOString().split("T")[0], status: "accepted", customerNotes: "Ecobee is compatible with your existing Carrier system. Includes 3-year device warranty from Ecobee." },
      ];
      let proposalInserted = 0;
      for (const p of proposalSeed) {
        const existing = await storage.getProposal(p.id);
        if (!existing) {
          const { id: proposalId, ...proposalData } = p;
          await storage.createProposal({ id: proposalId, ...proposalData } as any);
        }
        proposalInserted++;
      }
      seedResults.proposals = { ok: true, inserted: proposalInserted, expected: proposalSeed.length };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn({ section: "proposals", error: msg }, "[DEMO] Error seeding proposals");
      seedResults.proposals = { ok: false, error: msg };
    }

    // ── Seed summary ──────────────────────────────────────────────────────────
    const failedSections = Object.entries(seedResults).filter(([, v]) => !v.ok).map(([k]) => k);
    const countMismatches = Object.entries(seedResults)
      .filter(([, v]) => v.ok && v.inserted !== undefined && v.inserted !== v.expected)
      .map(([k, v]) => ({ section: k, inserted: v.inserted, expected: v.expected }));
    if (failedSections.length > 0 || countMismatches.length > 0) {
      log.warn({ seedResults, failedSections, countMismatches }, "[DEMO] Contractor demo seeding completed with issues");
    } else {
      log.info({ seedResults }, "[DEMO] Contractor demo seeding completed successfully");
    }

    if (failedSections.length > 0) {
      emailService.sendDemoSeedingFailureAlert(user.id, failedSections, seedResults).catch((alertErr: unknown) => {
        const msg = alertErr instanceof Error ? alertErr.message : String(alertErr);
        log.error({ error: msg }, "[DEMO] Failed to send demo seeding failure alert email");
      });
    }
  } catch (companyError) {
    const msg = companyError instanceof Error ? companyError.message : String(companyError);
    log.error({ error: msg }, "[DEMO] Error creating demo company or linking user");
  }

  return { user, seedResults };
}

// ---------------------------------------------------------------------------
// Agent seeder
// ---------------------------------------------------------------------------

export async function seedAgentDemo(log: DemoLog): Promise<SeedOutcome> {
  const demoEmail = "jessica.roberts@ellisonrealty.com";
  const demoId = "demo-agent-permanent-id";

  let user = await storage.getUserByEmail(demoEmail);
  if (!user) {
    user = await storage.upsertUser({
      id: demoId,
      email: demoEmail,
      firstName: "Jessica",
      lastName: "Roberts",
      profileImageUrl: null,
      role: "agent",
      zipCode: "98115",
      subscriptionStatus: "active",
      companyId: null,
      companyRole: null,
    });
  }

  const agentUser = await storage.getUser(demoId);
  let agentReferralCode = agentUser?.referralCode || "";
  if (!agentUser?.referralCode) {
    agentReferralCode = await generateUniqueReferralCode();
  }

  const referralData = [
    { id: "agent-referral-1", firstName: "Michael", lastName: "Stevens", email: "michael.stevens@email.com", zipCode: "98115", role: "homeowner", signupMonthsAgo: 6, subscriptionStatus: "active", plan: "base", monthlyAmount: "5.00", cyclesPaid: 6, qualified: true },
    { id: "agent-referral-2", firstName: "Laura", lastName: "Thompson", email: "laura.thompson@email.com", zipCode: "98102", role: "homeowner", signupMonthsAgo: 5, subscriptionStatus: "active", plan: "premium", monthlyAmount: "20.00", cyclesPaid: 5, qualified: true },
    { id: "agent-referral-3", firstName: "Robert", lastName: "Chang", email: "robert.chang@email.com", zipCode: "98119", role: "homeowner", signupMonthsAgo: 4.5, subscriptionStatus: "active", plan: "base", monthlyAmount: "5.00", cyclesPaid: 4, qualified: true },
    { id: "agent-referral-4", firstName: "Amanda", lastName: "Rodriguez", email: "amanda.rodriguez@email.com", zipCode: "98125", role: "contractor", signupMonthsAgo: 4, subscriptionStatus: "active", plan: "contractor", monthlyAmount: "20.00", cyclesPaid: 4, qualified: true },
    { id: "agent-referral-5", firstName: "Kevin", lastName: "Martinez", email: "kevin.martinez@email.com", zipCode: "98105", role: "homeowner", signupMonthsAgo: 2.5, subscriptionStatus: "active", plan: "premium", monthlyAmount: "20.00", cyclesPaid: 2, qualified: false },
    { id: "agent-referral-6", firstName: "Nicole", lastName: "Park", email: "nicole.park@email.com", zipCode: "98103", role: "homeowner", signupMonthsAgo: 1.5, subscriptionStatus: "active", plan: "base", monthlyAmount: "5.00", cyclesPaid: 1, qualified: false },
    { id: "agent-referral-7", firstName: "Daniel", lastName: "Foster", email: "daniel.foster@email.com", zipCode: "98109", role: "homeowner", signupMonthsAgo: 0.3, subscriptionStatus: "trialing", plan: "base", monthlyAmount: "0.00", cyclesPaid: 0, qualified: false },
    { id: "agent-referral-8", firstName: "Rachel", lastName: "Kim", email: "rachel.kim@email.com", zipCode: "98117", role: "homeowner", signupMonthsAgo: 0.1, subscriptionStatus: "trialing", plan: "premium", monthlyAmount: "0.00", cyclesPaid: 0, qualified: false },
  ];

  const seedResults: SeedResults = {};

  try {
    const referralUserExpected = referralData.length;
    const referralRecordExpected = referralData.length;
    const cycleEventExpected = referralData.reduce((sum, r) => sum + r.cyclesPaid, 0);
    let referralUserInserted = 0;
    let referralRecordInserted = 0;
    let cycleEventInserted = 0;

    await db.transaction(async (tx) => {
      if (!agentUser?.referralCode) {
        await tx.update(users).set({ referralCode: agentReferralCode }).where(eq(users.id, demoId));
      }

      for (const referral of referralData) {
        const signupDate = new Date(Date.now() - referral.signupMonthsAgo * 30 * 24 * 60 * 60 * 1000);
        const trialEndsAt =
          referral.subscriptionStatus === "trialing"
            ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
            : null;

        await tx
          .insert(users)
          .values({
            id: referral.id,
            email: referral.email,
            firstName: referral.firstName,
            lastName: referral.lastName,
            role: referral.role as "homeowner" | "contractor" | "agent",
            zipCode: referral.zipCode,
            subscriptionStatus: referral.subscriptionStatus,
            trialEndsAt,
            maxHousesAllowed: referral.role === "homeowner" ? 2 : null,
          })
          .onConflictDoUpdate({
            target: users.id,
            set: { subscriptionStatus: referral.subscriptionStatus, trialEndsAt },
          });
        referralUserInserted++;

        await tx
          .insert(affiliateReferrals)
          .values({
            agentId: demoId,
            referredUserId: referral.id,
            referredUserRole: referral.role as "homeowner" | "contractor",
            referralCode: agentReferralCode,
            signupDate,
            status: referral.qualified ? "eligible" : "trial",
          })
          .onConflictDoNothing({ target: affiliateReferrals.referredUserId });
        referralRecordInserted++;

        if (referral.cyclesPaid > 0) {
          for (let month = 0; month < referral.cyclesPaid; month++) {
            const cycleStart = new Date(signupDate.getTime() + (month * 30 + 14) * 24 * 60 * 60 * 1000);
            const cycleEnd = new Date(cycleStart.getTime() + 30 * 24 * 60 * 60 * 1000);
            await tx
              .insert(subscriptionCycleEvents)
              .values({
                userId: referral.id,
                periodStart: cycleStart,
                periodEnd: cycleEnd,
                amount: referral.monthlyAmount,
                status: "paid",
                stripeInvoiceId: `demo_inv_${referral.id}_${month + 1}`,
              })
              .onConflictDoNothing({ target: subscriptionCycleEvents.stripeInvoiceId });
            cycleEventInserted++;
          }
        }
      }
    });

    seedResults["agent-referral-users"] = { ok: true, inserted: referralUserInserted, expected: referralUserExpected };
    seedResults["agent-referral-records"] = { ok: true, inserted: referralRecordInserted, expected: referralRecordExpected };
    seedResults["agent-cycle-events"] = { ok: true, inserted: cycleEventInserted, expected: cycleEventExpected };

    const failedSections = Object.entries(seedResults).filter(([, v]) => !v.ok).map(([k]) => k);
    const countMismatches = Object.entries(seedResults)
      .filter(([, v]) => v.ok && v.inserted !== undefined && v.inserted !== v.expected)
      .map(([k, v]) => ({ section: k, inserted: v.inserted, expected: v.expected }));
    if (failedSections.length > 0 || countMismatches.length > 0) {
      log.warn({ seedResults, failedSections, countMismatches }, "[DEMO] Agent demo seeding completed with issues");
    } else {
      log.info({ seedResults }, "[DEMO] Agent demo seeding completed successfully");
    }
  } catch (seedError) {
    const msg = seedError instanceof Error ? seedError.message : String(seedError);
    log.warn({ section: "agent-referrals", error: msg }, "[DEMO] Error seeding agent referral data — referral data may be missing");
    seedResults["agent-referrals"] = { ok: false, error: msg };
  }

  return { user, seedResults };
}
