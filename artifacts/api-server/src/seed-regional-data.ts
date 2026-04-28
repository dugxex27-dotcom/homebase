import { db } from "./db";
import {
  countries,
  regions,
  climateZones,
  regulatoryBodies,
} from "@workspace/db";
import { eq, sql } from "drizzle-orm";

// ─── Country definitions ────────────────────────────────────────────────────

const COUNTRIES = [
  { code: "US", name: "United States", defaultCurrency: "USD" },
  { code: "CA", name: "Canada", defaultCurrency: "CAD" },
  { code: "AU", name: "Australia", defaultCurrency: "AUD" },
  { code: "GB", name: "United Kingdom", defaultCurrency: "GBP" },
];

// ─── Regions by country code ─────────────────────────────────────────────────

const REGIONS: Record<string, Array<{ code: string; name: string; type: string }>> = {
  US: [
    { code: "AL", name: "Alabama", type: "state" },
    { code: "AK", name: "Alaska", type: "state" },
    { code: "AZ", name: "Arizona", type: "state" },
    { code: "AR", name: "Arkansas", type: "state" },
    { code: "CA", name: "California", type: "state" },
    { code: "CO", name: "Colorado", type: "state" },
    { code: "CT", name: "Connecticut", type: "state" },
    { code: "DE", name: "Delaware", type: "state" },
    { code: "FL", name: "Florida", type: "state" },
    { code: "GA", name: "Georgia", type: "state" },
    { code: "HI", name: "Hawaii", type: "state" },
    { code: "ID", name: "Idaho", type: "state" },
    { code: "IL", name: "Illinois", type: "state" },
    { code: "IN", name: "Indiana", type: "state" },
    { code: "IA", name: "Iowa", type: "state" },
    { code: "KS", name: "Kansas", type: "state" },
    { code: "KY", name: "Kentucky", type: "state" },
    { code: "LA", name: "Louisiana", type: "state" },
    { code: "ME", name: "Maine", type: "state" },
    { code: "MD", name: "Maryland", type: "state" },
    { code: "MA", name: "Massachusetts", type: "state" },
    { code: "MI", name: "Michigan", type: "state" },
    { code: "MN", name: "Minnesota", type: "state" },
    { code: "MS", name: "Mississippi", type: "state" },
    { code: "MO", name: "Missouri", type: "state" },
    { code: "MT", name: "Montana", type: "state" },
    { code: "NE", name: "Nebraska", type: "state" },
    { code: "NV", name: "Nevada", type: "state" },
    { code: "NH", name: "New Hampshire", type: "state" },
    { code: "NJ", name: "New Jersey", type: "state" },
    { code: "NM", name: "New Mexico", type: "state" },
    { code: "NY", name: "New York", type: "state" },
    { code: "NC", name: "North Carolina", type: "state" },
    { code: "ND", name: "North Dakota", type: "state" },
    { code: "OH", name: "Ohio", type: "state" },
    { code: "OK", name: "Oklahoma", type: "state" },
    { code: "OR", name: "Oregon", type: "state" },
    { code: "PA", name: "Pennsylvania", type: "state" },
    { code: "RI", name: "Rhode Island", type: "state" },
    { code: "SC", name: "South Carolina", type: "state" },
    { code: "SD", name: "South Dakota", type: "state" },
    { code: "TN", name: "Tennessee", type: "state" },
    { code: "TX", name: "Texas", type: "state" },
    { code: "UT", name: "Utah", type: "state" },
    { code: "VT", name: "Vermont", type: "state" },
    { code: "VA", name: "Virginia", type: "state" },
    { code: "WA", name: "Washington", type: "state" },
    { code: "WV", name: "West Virginia", type: "state" },
    { code: "WI", name: "Wisconsin", type: "state" },
    { code: "WY", name: "Wyoming", type: "state" },
    { code: "DC", name: "District of Columbia", type: "territory" },
  ],
  CA: [
    { code: "AB", name: "Alberta", type: "province" },
    { code: "BC", name: "British Columbia", type: "province" },
    { code: "MB", name: "Manitoba", type: "province" },
    { code: "NB", name: "New Brunswick", type: "province" },
    { code: "NL", name: "Newfoundland and Labrador", type: "province" },
    { code: "NS", name: "Nova Scotia", type: "province" },
    { code: "NT", name: "Northwest Territories", type: "territory" },
    { code: "NU", name: "Nunavut", type: "territory" },
    { code: "ON", name: "Ontario", type: "province" },
    { code: "PE", name: "Prince Edward Island", type: "province" },
    { code: "QC", name: "Quebec", type: "province" },
    { code: "SK", name: "Saskatchewan", type: "province" },
    { code: "YT", name: "Yukon", type: "territory" },
  ],
  AU: [
    { code: "ACT", name: "Australian Capital Territory", type: "territory" },
    { code: "NSW", name: "New South Wales", type: "state" },
    { code: "NT", name: "Northern Territory", type: "territory" },
    { code: "QLD", name: "Queensland", type: "state" },
    { code: "SA", name: "South Australia", type: "state" },
    { code: "TAS", name: "Tasmania", type: "state" },
    { code: "VIC", name: "Victoria", type: "state" },
    { code: "WA", name: "Western Australia", type: "state" },
  ],
  GB: [
    { code: "ENG", name: "England", type: "country" },
    { code: "NIR", name: "Northern Ireland", type: "country" },
    { code: "SCT", name: "Scotland", type: "country" },
    { code: "WLS", name: "Wales", type: "country" },
  ],
};

// ─── Climate zones by country code ──────────────────────────────────────────

const CLIMATE_ZONES: Record<string, Array<{ code: string; name: string; description: string }>> = {
  US: [
    {
      code: "hot-humid",
      name: "Hot-Humid",
      description:
        "Covers the southeastern US (FL, LA, coastal TX, SC, GA coastal). Hot summers with high humidity, mild winters. Cooling loads dominate; moisture control and mold prevention are critical.",
    },
    {
      code: "hot-dry",
      name: "Hot-Dry / Mixed-Dry",
      description:
        "Covers the desert Southwest (AZ, NV, NM, inland CA, UT lowlands). Hot summers with very low humidity, cool winters. Cooling dominates; dust and UV exposure are primary concerns.",
    },
    {
      code: "mixed-humid",
      name: "Mixed-Humid",
      description:
        "Covers mid-Atlantic and parts of the South and Midwest (VA, NC piedmont, KY, TN, MO, IN, OH, KS, OK). Hot summers and cold winters with moderate humidity throughout the year.",
    },
    {
      code: "cold",
      name: "Cold / Very Cold",
      description:
        "Covers much of the northern US (MN, WI, MI, ND, SD, NE, IA, NY, PA, ME, NH, VT, MA, CO mountains, WY). Cold winters with significant snowfall; heating dominates; insulation and weatherization are key.",
    },
    {
      code: "subarctic",
      name: "Subarctic / Arctic",
      description:
        "Covers Alaska. Extreme cold winters with permafrost concerns. Heating is paramount; structures must account for freeze-thaw cycles and frozen ground.",
    },
    {
      code: "marine",
      name: "Marine",
      description:
        "Covers the Pacific Coast (coastal WA, OR, northern CA). Mild, temperate year-round with wet winters and dry summers. Moisture intrusion, mold, and rot are primary concerns.",
    },
  ],
  CA: [
    {
      code: "oceanic",
      name: "Oceanic (Pacific Coast)",
      description:
        "Covers coastal British Columbia. Mild, wet winters and warm, dry summers. Moisture management and roof condition are critical maintenance priorities.",
    },
    {
      code: "cold-continental",
      name: "Cold Continental (Prairies)",
      description:
        "Covers Alberta, Saskatchewan, and Manitoba. Very cold winters with low humidity, hot dry summers. Heating systems and insulation require rigorous maintenance.",
    },
    {
      code: "humid-continental",
      name: "Humid Continental (Central & Eastern Canada)",
      description:
        "Covers Ontario and Quebec. Cold winters with significant snowfall, hot and humid summers. HVAC, roof, and foundation maintenance are all critical.",
    },
    {
      code: "maritime-east",
      name: "Maritime (Atlantic Canada)",
      description:
        "Covers New Brunswick, Nova Scotia, PEI, and Newfoundland. Mild but wet and foggy. High precipitation requires vigilant roof, gutter, and moisture maintenance.",
    },
    {
      code: "subarctic-ca",
      name: "Subarctic / Arctic (Northern Territories)",
      description:
        "Covers Yukon, Northwest Territories, and Nunavut. Extreme cold; permafrost is a factor. Heating infrastructure and structural integrity in freeze-thaw cycles are primary concerns.",
    },
  ],
  AU: [
    {
      code: "tropical",
      name: "Tropical",
      description:
        "Covers northern Queensland and the Northern Territory. Hot and wet summers (monsoon), warm dry winters. Cyclone preparedness, humidity control, and corrosion prevention are key.",
    },
    {
      code: "subtropical",
      name: "Subtropical",
      description:
        "Covers southeast Queensland and coastal NSW. Warm year-round with distinct wet and dry seasons. Roof, gutter, and pest management are critical priorities.",
    },
    {
      code: "semi-arid",
      name: "Semi-Arid / Arid",
      description:
        "Covers inland Queensland, NSW, SA, and WA. Hot, dry summers with low rainfall. Dust management, water conservation, and heat protection are key concerns.",
    },
    {
      code: "temperate",
      name: "Temperate",
      description:
        "Covers Victoria, SA, ACT, and southern NSW. Mild year-round with cool, wet winters and warm summers. Balanced maintenance across HVAC, roof, and landscaping.",
    },
    {
      code: "mediterranean",
      name: "Mediterranean",
      description:
        "Covers the Perth region of Western Australia. Hot, dry summers and mild, wet winters. Fire risk during summer, moisture management in winter.",
    },
    {
      code: "cool-temperate",
      name: "Cool Temperate / Alpine",
      description:
        "Covers Tasmania and alpine regions of Victoria and NSW. Cool to cold year-round with significant rainfall. Insulation, heating, and moisture protection are priorities.",
    },
  ],
  GB: [
    {
      code: "oceanic-gb",
      name: "Oceanic (Temperate Maritime)",
      description:
        "The dominant UK climate across England, Wales, and much of Scotland. Mild, wet, and overcast year-round with no extreme seasonal temperature swings. Moisture, damp, and mold are the primary home maintenance concerns.",
    },
    {
      code: "highland-gb",
      name: "Highland",
      description:
        "Covers the Scottish Highlands and elevated areas of Wales. Cooler, wetter, and windier than lowland UK. Snow is common in winter; insulation and roof integrity are critical.",
    },
    {
      code: "continental-gb",
      name: "Continental (Eastern England)",
      description:
        "Covers parts of eastern England (East Anglia, Lincolnshire). Drier and with greater temperature extremes than the rest of the UK. Drought-related ground movement can affect foundations.",
    },
  ],
};

// ─── Regulatory bodies by country code ──────────────────────────────────────

const REGULATORY_BODIES: Record<
  string,
  Array<{
    name: string;
    type: string;
    website: string | null;
    description: string;
    regionCode?: string;
  }>
> = {
  US: [
    {
      name: "U.S. Environmental Protection Agency (EPA)",
      type: "certification",
      website: "https://www.epa.gov",
      description:
        "Federal agency regulating environmental standards including lead-safe renovation (RRP rule) and asbestos removal practices.",
    },
    {
      name: "Occupational Safety and Health Administration (OSHA)",
      type: "licensing",
      website: "https://www.osha.gov",
      description:
        "Federal agency setting safety standards for construction and renovation work, including contractor safety compliance.",
    },
    {
      name: "National Electrical Contractors Association (NECA)",
      type: "certification",
      website: "https://www.necanet.org",
      description:
        "Industry association representing electrical contractors; promotes licensing standards and safety codes across US states.",
    },
    {
      name: "Plumbing-Heating-Cooling Contractors Association (PHCC)",
      type: "certification",
      website: "https://www.phccweb.org",
      description:
        "National association for plumbing, heating, and cooling contractors; supports state licensing and training programs.",
    },
  ],
  CA: [
    {
      name: "Skilled Trades Ontario (STO)",
      type: "licensing",
      website: "https://www.skilledtradesontario.ca",
      description:
        "Regulates skilled trades apprenticeship and certification in Ontario, including electricians, plumbers, and HVAC technicians.",
      regionCode: "ON",
    },
    {
      name: "Technical Standards and Safety Authority (TSSA)",
      type: "registration",
      website: "https://www.tssa.org",
      description:
        "Ontario-based authority overseeing safety of fuel systems, elevating devices, and pressure equipment.",
      regionCode: "ON",
    },
    {
      name: "BC Safety Authority (BCSA)",
      type: "licensing",
      website: "https://www.bcsafety.ca",
      description:
        "Regulates the safe installation and operation of gas, electrical, and technical safety systems in British Columbia.",
      regionCode: "BC",
    },
    {
      name: "Alberta Boilers Safety Association (ABSA)",
      type: "registration",
      website: "https://www.absa.ca",
      description:
        "Administers boiler, pressure vessel, and pressure piping safety programs in Alberta on behalf of the provincial government.",
      regionCode: "AB",
    },
    {
      name: "Régie du bâtiment du Québec (RBQ)",
      type: "licensing",
      website: "https://www.rbq.gouv.qc.ca",
      description:
        "Quebec's building regulator; licenses contractors in construction, renovation, electrical, and plumbing trades.",
      regionCode: "QC",
    },
  ],
  AU: [
    {
      name: "Queensland Building and Construction Commission (QBCC)",
      type: "licensing",
      website: "https://www.qbcc.qld.gov.au",
      description:
        "Licenses contractors and regulates building work quality and disputes in Queensland.",
      regionCode: "QLD",
    },
    {
      name: "NSW Fair Trading (Building)",
      type: "licensing",
      website: "https://www.fairtrading.nsw.gov.au",
      description:
        "Licenses and regulates building practitioners and tradespeople in New South Wales.",
      regionCode: "NSW",
    },
    {
      name: "Victorian Building Authority (VBA)",
      type: "licensing",
      website: "https://www.vba.vic.gov.au",
      description:
        "Registers building practitioners and plumbers and oversees building standards in Victoria.",
      regionCode: "VIC",
    },
    {
      name: "Consumer and Business Services SA (CBS)",
      type: "licensing",
      website: "https://www.cbs.sa.gov.au",
      description:
        "Licenses building work contractors and plumbers in South Australia.",
      regionCode: "SA",
    },
    {
      name: "Building and Energy (WA)",
      type: "licensing",
      website: "https://www.commerce.wa.gov.au/building-and-energy",
      description:
        "Regulates building, plumbing, and electrical licensing and standards in Western Australia.",
      regionCode: "WA",
    },
    {
      name: "ActewAGL / Access Canberra",
      type: "licensing",
      website: "https://www.accesscanberra.act.gov.au",
      description:
        "Manages licensing for builders, trades, and occupations in the Australian Capital Territory.",
      regionCode: "ACT",
    },
  ],
  GB: [
    {
      name: "Gas Safe Register",
      type: "registration",
      website: "https://www.gassaferegister.co.uk",
      description:
        "Mandatory UK register for businesses and engineers legally allowed to work on gas appliances and installations. All gas work must be carried out by a registered engineer.",
    },
    {
      name: "NICEIC (National Inspection Council for Electrical Installation Contracting)",
      type: "certification",
      website: "https://www.niceic.com",
      description:
        "UK's leading voluntary regulatory body for the electrical contracting industry; certifies electricians and electrical businesses.",
    },
    {
      name: "NAPIT (National Association of Professional Inspectors and Testers)",
      type: "certification",
      website: "https://www.napit.org.uk",
      description:
        "UK certification body for electrical, heating, plumbing, and other building trades; approves contractors for self-certification of work.",
    },
    {
      name: "NHBC (National House Building Council)",
      type: "registration",
      website: "https://www.nhbc.co.uk",
      description:
        "UK's leading warranty and insurance provider for new-build homes; registers builders and sets construction standards.",
    },
    {
      name: "Construction Industry Training Board (CITB)",
      type: "certification",
      website: "https://www.citb.co.uk",
      description:
        "Industry training board for construction in Great Britain; manages the CSCS card scheme and supports contractor training and qualification.",
    },
    {
      name: "Ofgem",
      type: "registration",
      website: "https://www.ofgem.gov.uk",
      description:
        "UK government regulator for gas and electricity markets; sets standards for energy-related home improvements and contractor compliance.",
    },
  ],
};

// ─── Seeding function ─────────────────────────────────────────────────────────

export async function seedRegionalData(): Promise<void> {
  console.log("[seed-regional-data] Checking regional seed data...");

  // Counters for the startup summary log
  const summary = {
    countriesInserted: 0,
    regionsInserted: 0,
    regionsSkipped: 0,
    climateZonesInserted: 0,
    climateZonesSkipped: 0,
    regulatoryBodiesInserted: 0,
    regulatoryBodiesSkipped: 0,
  };

  // One-time check: is the regulatory_bodies table present in this DB?
  // db.execute() returns { rows: Array<Record<string,unknown>>, ... } (pg-style).
  const regBodyTableCheck = await db.execute(
    sql`SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'regulatory_bodies'
    ) AS "exists"`
  );
  const regBodyTableExists =
    Boolean((regBodyTableCheck.rows as Array<{ exists: boolean }>)[0]?.exists);

  if (!regBodyTableExists) {
    console.warn("[seed-regional-data] regulatory_bodies table not found — regulatory body seeding will be skipped (not yet migrated).");
  }

  for (const countryDef of COUNTRIES) {
    // ── Check / insert country ──────────────────────────────────────────────
    const existing = await db
      .select()
      .from(countries)
      .where(eq(countries.code, countryDef.code))
      .limit(1);

    let countryId: string;

    if (existing.length > 0) {
      countryId = existing[0].id;
    } else {
      const inserted = await db
        .insert(countries)
        .values({
          code: countryDef.code,
          name: countryDef.name,
          defaultCurrency: countryDef.defaultCurrency,
          isActive: true,
        })
        .returning();
      countryId = inserted[0].id;
      summary.countriesInserted++;
    }

    // ── Insert missing regions (per-row idempotency by code) ───────────────
    const countryRegions = REGIONS[countryDef.code] ?? [];
    const existingRegions = await db
      .select({ code: regions.code })
      .from(regions)
      .where(eq(regions.countryId, countryId));
    const existingRegionCodes = new Set(existingRegions.map((r) => r.code));

    const missingRegions = countryRegions.filter((r) => !existingRegionCodes.has(r.code));
    if (missingRegions.length > 0) {
      await db.insert(regions).values(
        missingRegions.map((r) => ({
          countryId,
          code: r.code,
          name: r.name,
          type: r.type,
          isActive: true,
        }))
      );
      summary.regionsInserted += missingRegions.length;
    }
    summary.regionsSkipped += countryRegions.length - missingRegions.length;

    // ── Insert missing climate zones (per-row idempotency by code) ─────────
    const countryZones = CLIMATE_ZONES[countryDef.code] ?? [];
    const existingZones = await db
      .select({ code: climateZones.code })
      .from(climateZones)
      .where(eq(climateZones.countryId, countryId));
    const existingZoneCodes = new Set(existingZones.map((z) => z.code));

    const missingZones = countryZones.filter((z) => !existingZoneCodes.has(z.code));
    if (missingZones.length > 0) {
      await db.insert(climateZones).values(
        missingZones.map((z) => ({
          countryId,
          code: z.code,
          name: z.name,
          description: z.description,
          isActive: true,
        }))
      );
      summary.climateZonesInserted += missingZones.length;
    }
    summary.climateZonesSkipped += countryZones.length - missingZones.length;

    // ── Check / insert regulatory bodies ──────────────────────────────────
    if (!regBodyTableExists) {
      continue;
    }

    const countryBodies = REGULATORY_BODIES[countryDef.code] ?? [];
    try {
      const existingBodies = await db
        .select({ name: regulatoryBodies.name })
        .from(regulatoryBodies)
        .where(eq(regulatoryBodies.countryId, countryId));
      const existingBodyNames = new Set(existingBodies.map((b) => b.name));

      const missingBodies = countryBodies.filter((b) => !existingBodyNames.has(b.name));
      if (missingBodies.length > 0) {
        // Fetch regions so we can resolve regionCode → regionId
        const allRegions = await db
          .select({ code: regions.code, id: regions.id })
          .from(regions)
          .where(eq(regions.countryId, countryId));
        const regionByCode = new Map(allRegions.map((r) => [r.code, r.id]));

        await db.insert(regulatoryBodies).values(
          missingBodies.map((b) => ({
            countryId,
            regionId: b.regionCode ? (regionByCode.get(b.regionCode) ?? null) : null,
            name: b.name,
            type: b.type,
            website: b.website ?? null,
            description: b.description,
            isActive: true,
          }))
        );
        summary.regulatoryBodiesInserted += missingBodies.length;
      }
      summary.regulatoryBodiesSkipped += countryBodies.length - missingBodies.length;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("does not exist")) {
        console.warn(`[seed-regional-data] regulatory_bodies table not accessible for ${countryDef.code} — skipping.`);
      } else {
        throw err;
      }
    }
  }

  // ── Startup summary ────────────────────────────────────────────────────────
  console.log(
    `[seed-regional-data] Complete. ` +
    `Countries inserted: ${summary.countriesInserted}. ` +
    `Regions: ${summary.regionsInserted} inserted, ${summary.regionsSkipped} already present. ` +
    `Climate zones: ${summary.climateZonesInserted} inserted, ${summary.climateZonesSkipped} already present. ` +
    (regBodyTableExists
      ? `Regulatory bodies: ${summary.regulatoryBodiesInserted} inserted, ${summary.regulatoryBodiesSkipped} already present.`
      : `Regulatory bodies: skipped (table not yet migrated).`)
  );
}
