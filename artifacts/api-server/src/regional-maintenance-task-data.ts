export type RegionalTaskTemplate = {
  taskId: string;
  title: string;
  description: string;
  category: string;
  priority: "high" | "medium" | "low";
  estimatedTime: string;
  difficulty: "easy" | "medium" | "hard";
  tools: string[];
  cost: string;
  season: "spring" | "summer" | "autumn" | "winter" | "year-round";
  months: string[];
  systemRequirements: string[];
};

type TaskSeed = [title: string, season: RegionalTaskTemplate["season"], months: string[], category: string, priority?: RegionalTaskTemplate["priority"]];

const slug = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const makeTasks = (countryCode: string, zoneCode: string, seeds: TaskSeed[]): RegionalTaskTemplate[] =>
  seeds.map(([title, season, months, category, priority = "medium"]) => ({
    taskId: `${countryCode.toLowerCase()}-${zoneCode}-${slug(title)}`,
    title,
    description: `${title} to protect the home from the conditions common to the ${zoneCode.replace(/-/g, " ")} climate zone.`,
    category,
    priority,
    estimatedTime: priority === "high" ? "1–2 hours" : "30–60 minutes",
    difficulty: priority === "high" ? "medium" : "easy",
    tools: ["Flashlight", "Work gloves"],
    cost: priority === "high" ? "$50–$250" : "$0–$75",
    season,
    months,
    systemRequirements: [],
  }));

const TASK_SEEDS: Record<string, Record<string, TaskSeed[]>> = {
  US: {
    "hot-humid": [
      ["Service air conditioning before peak heat", "spring", ["3", "4"], "HVAC", "high"],
      ["Inspect attic and crawlspace for mold", "summer", ["6", "9"], "Moisture"],
      ["Clear condensate drain lines", "summer", ["5", "8"], "HVAC", "high"],
      ["Check hurricane shutters and roof fasteners", "spring", ["4", "5"], "Exterior", "high"],
      ["Inspect exterior caulking for moisture gaps", "autumn", ["10"], "Exterior"],
    ],
    "hot-dry": [
      ["Service cooling system before extreme heat", "spring", ["3", "4"], "HVAC", "high"],
      ["Replace HVAC filters after dust season", "summer", ["6", "9"], "HVAC"],
      ["Inspect roof and seals for UV damage", "autumn", ["10"], "Roofing"],
      ["Check irrigation for leaks and overspray", "spring", ["3", "5"], "Landscaping"],
      ["Flush mineral buildup from water heater", "winter", ["1"], "Plumbing"],
    ],
    "mixed-humid": [
      ["Service heating and cooling systems", "spring", ["4"], "HVAC", "high"],
      ["Inspect basement for moisture intrusion", "spring", ["3", "5"], "Foundation"],
      ["Clean gutters before winter", "autumn", ["10", "11"], "Roofing"],
      ["Seal drafts around windows and doors", "autumn", ["9", "10"], "Insulation"],
      ["Test sump pump before storm season", "spring", ["3"], "Plumbing", "high"],
    ],
    cold: [
      ["Service furnace before winter", "autumn", ["9", "10"], "HVAC", "high"],
      ["Inspect roof for ice-dam risks", "autumn", ["10"], "Roofing", "high"],
      ["Winterize exterior plumbing", "autumn", ["10", "11"], "Plumbing", "high"],
      ["Check attic insulation and air sealing", "autumn", ["9"], "Insulation"],
      ["Inspect spring thaw drainage", "spring", ["3", "4"], "Foundation"],
    ],
    subarctic: [
      ["Test backup heating and generator systems", "autumn", ["8", "9"], "HVAC", "high"],
      ["Inspect foundation for freeze-thaw movement", "summer", ["6", "7"], "Foundation", "high"],
      ["Protect water lines from deep freezing", "autumn", ["8", "9"], "Plumbing", "high"],
      ["Inspect roof after heavy snow season", "spring", ["4", "5"], "Roofing"],
      ["Check ventilation while home is tightly sealed", "winter", ["1", "2"], "Ventilation"],
    ],
    marine: [
      ["Inspect roof and flashing before wet season", "autumn", ["9", "10"], "Roofing", "high"],
      ["Clean moss from roof and shaded surfaces", "spring", ["4", "5"], "Exterior"],
      ["Inspect crawlspace for damp and rot", "spring", ["3", "4"], "Moisture", "high"],
      ["Clear gutters and storm drains", "autumn", ["10", "11"], "Drainage"],
      ["Check exterior timber coatings", "summer", ["7", "8"], "Exterior"],
    ],
  },
  CA: {
    oceanic: [
      ["Inspect roof before Pacific winter rains", "autumn", ["9", "10"], "Roofing", "high"],
      ["Remove moss from roof and walkways", "spring", ["4", "5"], "Exterior"],
      ["Check crawlspace for moisture and rot", "spring", ["3", "4"], "Moisture", "high"],
      ["Clear gutters and perimeter drains", "autumn", ["10", "11"], "Drainage"],
      ["Service heat pump before cool weather", "autumn", ["9"], "HVAC"],
    ],
    "cold-continental": [
      ["Service furnace before prairie winter", "autumn", ["9"], "HVAC", "high"],
      ["Inspect attic for ice-dam risks", "autumn", ["9", "10"], "Roofing", "high"],
      ["Winterize outdoor taps and irrigation", "autumn", ["9", "10"], "Plumbing", "high"],
      ["Seal drafts around doors and windows", "autumn", ["9"], "Insulation"],
      ["Check foundation after spring thaw", "spring", ["4", "5"], "Foundation"],
    ],
    "humid-continental": [
      ["Service furnace and air conditioner", "spring", ["4"], "HVAC", "high"],
      ["Inspect basement after snowmelt", "spring", ["3", "4"], "Foundation", "high"],
      ["Clean gutters before freezing weather", "autumn", ["10"], "Roofing"],
      ["Test sump pump before spring rains", "spring", ["3"], "Plumbing", "high"],
      ["Check roof after winter snow loads", "spring", ["4"], "Roofing"],
    ],
    "maritime-east": [
      ["Inspect roof and flashing before storm season", "autumn", ["9", "10"], "Roofing", "high"],
      ["Clear gutters after leaf fall", "autumn", ["11"], "Drainage"],
      ["Inspect basement for damp and salt moisture", "spring", ["4"], "Moisture"],
      ["Check exterior fasteners for corrosion", "summer", ["7"], "Exterior"],
      ["Seal windows against wind-driven rain", "autumn", ["9"], "Exterior"],
    ],
    "subarctic-ca": [
      ["Test primary and backup heating", "summer", ["8"], "HVAC", "high"],
      ["Inspect supports for permafrost movement", "summer", ["7"], "Foundation", "high"],
      ["Protect water and waste lines from freezing", "summer", ["8"], "Plumbing", "high"],
      ["Inspect roof after snow and ice loads", "spring", ["5"], "Roofing"],
      ["Check emergency supplies before winter", "autumn", ["9"], "Safety"],
    ],
  },
  AU: {
    tropical: [
      ["Check roof and exterior for cyclone damage", "autumn", ["4", "5"], "Roofing", "high"],
      ["Prepare shutters and tie-downs for cyclone season", "spring", ["10", "11"], "Safety", "high"],
      ["Service air conditioning before the wet season", "spring", ["9", "10"], "HVAC", "high"],
      ["Clear gutters and stormwater drains", "spring", ["10"], "Drainage"],
      ["Inspect metal fixtures for corrosion", "winter", ["7"], "Exterior"],
    ],
    subtropical: [
      ["Service cooling before humid summer", "spring", ["9", "10"], "HVAC", "high"],
      ["Clear gutters before summer storms", "spring", ["10", "11"], "Drainage"],
      ["Inspect roof after storm season", "autumn", ["4", "5"], "Roofing"],
      ["Check for termites and other pests", "spring", ["9"], "Pest Control", "high"],
      ["Inspect wet areas for mold", "autumn", ["5"], "Moisture"],
    ],
    "semi-arid": [
      ["Service evaporative cooling before summer", "spring", ["9", "10"], "HVAC", "high"],
      ["Clean dust from vents and outdoor units", "summer", ["12", "2"], "HVAC"],
      ["Inspect seals and roofing for heat damage", "autumn", ["4"], "Roofing"],
      ["Check rainwater tanks and water-saving systems", "winter", ["6", "7"], "Plumbing"],
      ["Clear vegetation from bushfire defendable space", "spring", ["9", "10"], "Safety", "high"],
    ],
    temperate: [
      ["Service heating before cool weather", "autumn", ["4", "5"], "HVAC"],
      ["Clean gutters before winter rain", "autumn", ["5"], "Drainage"],
      ["Inspect roof after winter weather", "spring", ["9"], "Roofing"],
      ["Check smoke alarms before heating season", "autumn", ["4"], "Safety", "high"],
      ["Seal drafts around windows and doors", "autumn", ["4", "5"], "Insulation"],
    ],
    mediterranean: [
      ["Clear vegetation before bushfire season", "spring", ["9", "10"], "Safety", "high"],
      ["Clean gutters of dry leaves and debris", "spring", ["10", "11"], "Roofing", "high"],
      ["Service cooling before summer heat", "spring", ["10"], "HVAC"],
      ["Inspect roof after winter rain", "spring", ["9"], "Roofing"],
      ["Check irrigation before the dry season", "spring", ["9", "10"], "Landscaping"],
    ],
    "cool-temperate": [
      ["Service heating before winter", "autumn", ["4", "5"], "HVAC", "high"],
      ["Inspect insulation and seal drafts", "autumn", ["4"], "Insulation"],
      ["Clear gutters before prolonged winter rain", "autumn", ["5"], "Drainage"],
      ["Check roof and flashing after winter", "spring", ["9"], "Roofing"],
      ["Inspect subfloor areas for damp", "spring", ["10"], "Moisture"],
    ],
  },
  GB: {
    "oceanic-gb": [
      ["Bleed radiators before winter", "autumn", ["9", "10"], "Heating"],
      ["Service boiler before the heating season", "autumn", ["9"], "Heating", "high"],
      ["Check loft and walls for damp and mold", "winter", ["1", "2"], "Moisture", "high"],
      ["Clear gutters after autumn leaf fall", "autumn", ["11"], "Drainage"],
      ["Inspect roof slates and flashing", "spring", ["3", "4"], "Roofing"],
    ],
    "highland-gb": [
      ["Service heating before Highland winter", "autumn", ["8", "9"], "Heating", "high"],
      ["Inspect roof fixings before winter gales", "autumn", ["9"], "Roofing", "high"],
      ["Protect exterior pipes from freezing", "autumn", ["9", "10"], "Plumbing", "high"],
      ["Check loft insulation and ventilation", "autumn", ["9"], "Insulation"],
      ["Inspect drainage after snowmelt", "spring", ["3", "4"], "Drainage"],
    ],
    "continental-gb": [
      ["Inspect foundations after dry summer", "autumn", ["9"], "Foundation", "high"],
      ["Check soil drainage and signs of subsidence", "summer", ["7", "8"], "Foundation", "high"],
      ["Service boiler before winter", "autumn", ["9", "10"], "Heating"],
      ["Inspect roof and gutters after winter", "spring", ["3", "4"], "Roofing"],
      ["Check water-saving and garden irrigation", "spring", ["4", "5"], "Plumbing"],
    ],
  },
};

export const REGIONAL_MAINTENANCE_TASKS: Record<string, Record<string, RegionalTaskTemplate[]>> =
  Object.fromEntries(
    Object.entries(TASK_SEEDS).map(([countryCode, zones]) => [
      countryCode,
      Object.fromEntries(
        Object.entries(zones).map(([zoneCode, seeds]) => [
          zoneCode,
          makeTasks(countryCode, zoneCode, seeds),
        ]),
      ),
    ]),
  );