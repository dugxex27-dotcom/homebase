export type QuestionType = "yes_no_unknown" | "yes_no" | "text" | "select" | "number";

export interface DisclosureQuestion {
  id: string;
  questionNumber: number;
  text: string;
  type: QuestionType;
  options?: string[];
  followUp?: string;
  prefillKey?: string;
  hint?: string;
}

export interface DisclosureSection {
  id: string;
  title: string;
  description?: string;
  questions: DisclosureQuestion[];
}

export const NY_PCDS_SECTIONS: DisclosureSection[] = [
  {
    id: "general",
    title: "General Information",
    description: "Basic property facts.",
    questions: [
      { id: "yearBuilt", questionNumber: 1, text: "What year was the property built (to the best of your knowledge)?", type: "number", prefillKey: "yearBuilt", hint: "From your home profile" },
      { id: "ownershipYears", questionNumber: 2, text: "How long have you owned this property?", type: "text", hint: "e.g. '5 years'" },
      { id: "occupancy", questionNumber: 3, text: "Is the property currently occupied?", type: "yes_no" },
      { id: "condoCoopHoa", questionNumber: 4, text: "Is there a homeowners association (HOA), co-op board, or condo fee?", type: "yes_no_unknown", followUp: "If yes, provide amount and frequency." },
    ],
  },
  {
    id: "environmental",
    title: "Environmental Conditions",
    description: "Hazardous materials and environmental concerns.",
    questions: [
      { id: "leadPaint", questionNumber: 5, text: "Has the property ever tested positive for lead paint?", type: "yes_no_unknown", followUp: "If yes, describe and indicate whether remediated." },
      { id: "asbestos", questionNumber: 6, text: "Do you know of any asbestos-containing materials on the property?", type: "yes_no_unknown", followUp: "If yes, describe location and current condition." },
      { id: "radon", questionNumber: 7, text: "Has radon been detected or tested on the property?", type: "yes_no_unknown", followUp: "If yes, were mitigation steps taken?" },
      { id: "mold", questionNumber: 8, text: "Do you know of any mold or mildew on the property?", type: "yes_no_unknown", followUp: "If yes, describe and state whether treated." },
      { id: "undergroundTank", questionNumber: 9, text: "Is there a buried or underground storage tank on the property?", type: "yes_no_unknown", followUp: "If yes, describe type and current status." },
      { id: "hazardousMaterials", questionNumber: 10, text: "Do you know of any other hazardous materials on the property?", type: "yes_no_unknown", followUp: "If yes, please describe." },
    ],
  },
  {
    id: "structural",
    title: "Structural Conditions",
    description: "Foundation, roof, walls, and structural integrity.",
    questions: [
      { id: "foundationType", questionNumber: 11, text: "What type of foundation does the property have?", type: "select", options: ["Basement", "Crawl Space", "Slab", "Pier & Beam", "Other / Unknown"], prefillKey: "foundationType", hint: "From your home profile" },
      { id: "foundationProblems", questionNumber: 12, text: "Do you know of any foundation defects or problems?", type: "yes_no_unknown", followUp: "If yes, describe the problem and any repairs made." },
      { id: "roofType", questionNumber: 13, text: "What is the roof material type?", type: "select", options: ["Asphalt Shingles", "Metal", "Tile", "Slate", "Wood Shakes", "Flat / Built-up", "Other / Unknown"], prefillKey: "roofType", hint: "From your home profile" },
      { id: "roofAge", questionNumber: 14, text: "Approximately what year was the current roof installed?", type: "number", prefillKey: "roofInstalledYear", hint: "From your home profile" },
      { id: "roofLeaks", questionNumber: 15, text: "Do you know of any roof leaks or damage?", type: "yes_no_unknown", followUp: "If yes, describe and state whether repaired." },
      { id: "basementWater", questionNumber: 16, text: "Do you know of any water infiltration, flooding, or dampness in a basement or crawl space?", type: "yes_no_unknown", followUp: "If yes, how often and were repairs made?" },
    ],
  },
  {
    id: "mechanical",
    title: "Mechanical Systems",
    description: "Heating, cooling, plumbing, electrical, and other systems.",
    questions: [
      { id: "heatingType", questionNumber: 17, text: "What is the primary heating system type?", type: "select", options: ["Forced Air Furnace", "Boiler / Radiator", "Heat Pump", "Electric Baseboard", "Radiant Floor", "Other / Unknown"], prefillKey: "hvacType", hint: "From your home profile" },
      { id: "heatingFuel", questionNumber: 18, text: "What is the primary heating fuel?", type: "select", options: ["Natural Gas", "Oil", "Electric", "Propane", "Wood", "Solar", "Other / Unknown"], prefillKey: "primaryHeatingFuel", hint: "From your home profile" },
      { id: "hvacInstallYear", questionNumber: 19, text: "Approximately what year was the current heating/cooling system installed?", type: "number", prefillKey: "hvacInstallYear", hint: "From your home systems" },
      { id: "hvacBrandModel", questionNumber: 20, text: "HVAC system brand and model (if known)", type: "text", prefillKey: "hvacBrandModel", hint: "From your home systems" },
      { id: "heatingDefects", questionNumber: 21, text: "Do you know of any defects in the heating system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "coolingType", questionNumber: 22, text: "Is there central air conditioning?", type: "yes_no_unknown" },
      { id: "coolingDefects", questionNumber: 23, text: "Do you know of any defects in the cooling system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "plumbingType", questionNumber: 24, text: "What is the primary plumbing material?", type: "select", options: ["Copper", "PEX", "PVC", "Galvanized Steel", "Cast Iron", "Lead", "Other / Unknown"], prefillKey: "plumbingType", hint: "From your home profile" },
      { id: "plumbingDefects", questionNumber: 25, text: "Do you know of any defects in the plumbing system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "waterHeaterType", questionNumber: 26, text: "What type of water heater is installed?", type: "select", options: ["Tank (Gas)", "Tank (Electric)", "Tankless (Gas)", "Tankless (Electric)", "Heat Pump Water Heater", "Solar", "Other / Unknown"], prefillKey: "waterHeaterType", hint: "From your home profile" },
      { id: "waterHeaterInstallYear", questionNumber: 27, text: "Approximately what year was the water heater installed?", type: "number", prefillKey: "waterHeaterInstallYear", hint: "From your home systems" },
      { id: "waterHeaterBrandModel", questionNumber: 28, text: "Water heater brand and model (if known)", type: "text", prefillKey: "waterHeaterBrandModel", hint: "From your home systems" },
      { id: "electricalAmps", questionNumber: 29, text: "What is the electrical service capacity (amps)?", type: "select", options: ["60 A", "100 A", "150 A", "200 A", "400 A", "Unknown"] },
      { id: "electricalDefects", questionNumber: 30, text: "Do you know of any defects in the electrical system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "sewerType", questionNumber: 31, text: "How is sewage disposed of?", type: "select", options: ["Municipal Sewer", "Septic System", "Cesspool", "Unknown"] },
      { id: "waterSource", questionNumber: 32, text: "What is the source of potable water?", type: "select", options: ["Municipal / Public Water", "Well", "Other / Unknown"] },
    ],
  },
  {
    id: "additions",
    title: "Additions, Alterations & Permits",
    description: "Improvements and compliance.",
    questions: [
      { id: "additionsAlterations", questionNumber: 33, text: "Have there been any additions or structural alterations to the property since it was built?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "permitsObtained", questionNumber: 34, text: "Were all required building permits obtained for any additions or alterations?", type: "yes_no_unknown" },
      { id: "certificateOfOccupancy", questionNumber: 35, text: "Is there a valid Certificate of Occupancy (CO) for the property?", type: "yes_no_unknown" },
      { id: "garageType", questionNumber: 36, text: "What type of garage does the property have?", type: "select", options: ["None", "Attached", "Detached", "Built-in", "Carport"], prefillKey: "garageType", hint: "From your home profile" },
    ],
  },
  {
    id: "legal",
    title: "Legal & Other Disclosures",
    description: "Legal matters, disputes, and encumbrances.",
    questions: [
      { id: "legalProceedings", questionNumber: 37, text: "Are you aware of any pending legal actions, lawsuits, or judgments affecting the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "easements", questionNumber: 38, text: "Are there any easements, rights-of-way, or encroachments on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "floodZone", questionNumber: 39, text: "Is the property located in a FEMA flood zone?", type: "yes_no_unknown" },
      { id: "floodDamage", questionNumber: 40, text: "Has the property sustained flood damage?", type: "yes_no_unknown", followUp: "If yes, describe and state whether repaired." },
      { id: "insuranceClaims", questionNumber: 41, text: "Have any insurance claims been filed on the property in the last 5 years?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "otherDefects", questionNumber: 42, text: "Are you aware of any other material defects or conditions not previously disclosed?", type: "yes_no_unknown", followUp: "If yes, describe." },
    ],
  },
];

export type AnswerValue = string | number | null;
export type DisclosureAnswers = Record<string, AnswerValue>;

export interface HomeSystemLike {
  systemType: string;
  installationYear?: number | null;
  brand?: string | null;
  model?: string | null;
  serialNumber?: string | null;
}

export function buildPrefillFromSystems(systems: HomeSystemLike[]): DisclosureAnswers {
  const answers: DisclosureAnswers = {};
  for (const sys of systems) {
    const type = (sys.systemType ?? "").toLowerCase();
    const isHvac = type.includes("hvac") || type.includes("furnace") || type.includes("heat") || type.includes("air handler") || type.includes("air conditioning");
    const isWaterHeater = type.includes("water heater");

    if (isHvac) {
      if (!answers["heatingType"]) {
        if (type.includes("heat pump")) answers["heatingType"] = "Heat Pump";
        else if (type.includes("boiler")) answers["heatingType"] = "Boiler / Radiator";
        else if (type.includes("furnace") || type.includes("forced air")) answers["heatingType"] = "Forced Air Furnace";
        else if (type.includes("baseboard")) answers["heatingType"] = "Electric Baseboard";
      }
      if (!answers["hvacInstallYear"] && sys.installationYear) {
        answers["hvacInstallYear"] = sys.installationYear;
      }
      if (!answers["hvacBrandModel"]) {
        const parts = [sys.brand, sys.model].filter(Boolean).join(" ");
        if (parts) answers["hvacBrandModel"] = parts;
      }
    }
    if (isWaterHeater) {
      if (!answers["waterHeaterType"]) {
        if (type.includes("tankless")) answers["waterHeaterType"] = "Tankless (Gas)";
        else if (type.includes("heat pump")) answers["waterHeaterType"] = "Heat Pump Water Heater";
        else answers["waterHeaterType"] = "Tank (Gas)";
      }
      if (!answers["waterHeaterInstallYear"] && sys.installationYear) {
        answers["waterHeaterInstallYear"] = sys.installationYear;
      }
      if (!answers["waterHeaterBrandModel"]) {
        const parts = [sys.brand, sys.model].filter(Boolean).join(" ");
        if (parts) answers["waterHeaterBrandModel"] = parts;
      }
    }
  }
  return answers;
}

export interface MaintenanceLogLike {
  serviceDate?: string | null;
  serviceType?: string | null;
  homeArea?: string | null;
  serviceDescription?: string | null;
  notes?: string | null;
}

export function buildPrefillFromLogs(logs: MaintenanceLogLike[]): DisclosureAnswers {
  const answers: DisclosureAnswers = {};
  for (const log of logs) {
    const area = (log.homeArea ?? "").toLowerCase();
    const type = (log.serviceType ?? "").toLowerCase();
    const desc = ((log.serviceDescription ?? "") + " " + (log.notes ?? "")).toLowerCase();

    if (area.includes("roof") || type.includes("roof")) {
      const year = log.serviceDate ? parseInt(log.serviceDate.slice(0, 4), 10) : NaN;
      if (!isNaN(year) && year > 1950 && year <= new Date().getFullYear()) {
        if (!answers["roofAge"]) answers["roofAge"] = year;
      }
    }
    if (desc.includes("flood") || desc.includes("water damage") || desc.includes("water intrusion")) {
      if (!answers["floodDamage"]) answers["floodDamage"] = "Yes";
    }
    if (desc.includes("mold") || desc.includes("mould")) {
      if (!answers["mold"]) answers["mold"] = "Yes";
    }
    if (desc.includes("insurance claim") || type.includes("insurance")) {
      if (!answers["insuranceClaims"]) answers["insuranceClaims"] = "Yes";
    }
    if (desc.includes("asbestos") || type.includes("asbestos")) {
      if (!answers["asbestos"]) answers["asbestos"] = "Yes";
    }
    if (desc.includes("lead paint") || type.includes("lead paint")) {
      if (!answers["leadPaint"]) answers["leadPaint"] = "Yes";
    }
    if (desc.includes("radon")) {
      if (!answers["radon"]) answers["radon"] = "Yes";
    }
    if ((area.includes("basement") || area.includes("crawl")) && (desc.includes("leak") || desc.includes("water"))) {
      if (!answers["basementWater"]) answers["basementWater"] = "Yes";
    }
  }
  return answers;
}

export function buildPrefillAnswers(house: Record<string, unknown>): DisclosureAnswers {
  const answers: DisclosureAnswers = {};
  const prefillMap: Record<string, string> = {
    yearBuilt: "yearBuilt",
    foundationType: "foundationType",
    roofType: "roofType",
    roofInstalledYear: "roofAge",
    hvacType: "heatingType",
    primaryHeatingFuel: "heatingFuel",
    plumbingType: "plumbingType",
    waterHeaterType: "waterHeaterType",
    garageType: "garageType",
  };

  for (const [houseField, questionId] of Object.entries(prefillMap)) {
    const val = house[houseField];
    if (val !== null && val !== undefined && val !== "") {
      if (questionId === "foundationType") {
        const map: Record<string, string> = {
          basement: "Basement",
          crawl_space: "Crawl Space",
          slab: "Slab",
          pier_beam: "Pier & Beam",
        };
        answers[questionId] = map[String(val)] ?? String(val);
      } else if (questionId === "heatingType") {
        const map: Record<string, string> = {
          forced_air: "Forced Air Furnace",
          boiler: "Boiler / Radiator",
          heat_pump: "Heat Pump",
          electric_baseboard: "Electric Baseboard",
          radiant: "Radiant Floor",
        };
        answers[questionId] = map[String(val)] ?? String(val);
      } else if (questionId === "heatingFuel") {
        const map: Record<string, string> = {
          natural_gas: "Natural Gas",
          oil: "Oil",
          electric: "Electric",
          propane: "Propane",
        };
        answers[questionId] = map[String(val)] ?? String(val);
      } else if (questionId === "garageType") {
        const map: Record<string, string> = {
          none: "None",
          attached: "Attached",
          detached: "Detached",
          built_in: "Built-in",
          carport: "Carport",
        };
        answers[questionId] = map[String(val)] ?? String(val);
      } else {
        answers[questionId] = val as AnswerValue;
      }
    }
  }

  return answers;
}

export function getSectionProgress(sectionId: string, answers: DisclosureAnswers, sections: DisclosureSection[] = NY_PCDS_SECTIONS): number {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return 0;
  const answered = section.questions.filter(q => {
    const v = answers[q.id];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((answered / section.questions.length) * 100);
}

export function getTotalProgress(answers: DisclosureAnswers, sections: DisclosureSection[] = NY_PCDS_SECTIONS): number {
  const total = sections.reduce((sum, s) => sum + s.questions.length, 0);
  const answered = sections.flatMap(s => s.questions).filter(q => {
    const v = answers[q.id];
    return v !== null && v !== undefined && v !== "";
  }).length;
  return Math.round((answered / total) * 100);
}

export function formatAnswerForSummary(question: DisclosureQuestion, answer: AnswerValue): string {
  if (answer === null || answer === undefined || answer === "") return "Not answered";
  return String(answer);
}

export function generateSectionSummaryText(section: DisclosureSection, answers: DisclosureAnswers): string {
  const lines: string[] = [];
  lines.push(section.title.toUpperCase());
  lines.push("-".repeat(section.title.length));
  for (const question of section.questions) {
    const answer = answers[question.id];
    const detailAnswer = answers[`${question.id}_details`];
    const displayAnswer = formatAnswerForSummary(question, answer ?? null);
    lines.push(`Q${question.questionNumber}. ${question.text}`);
    lines.push(`  Answer: ${displayAnswer}`);
    if (detailAnswer) {
      lines.push(`  Details: ${detailAnswer}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}

export function generateSummaryText(answers: DisclosureAnswers, propertyAddress?: string): string {
  const lines: string[] = [];
  lines.push("NEW YORK STATE PROPERTY CONDITION DISCLOSURE STATEMENT");
  lines.push("=".repeat(55));
  if (propertyAddress) {
    lines.push(`Property Address: ${propertyAddress}`);
  }
  lines.push("");

  for (const section of NY_PCDS_SECTIONS) {
    lines.push(section.title.toUpperCase());
    lines.push("-".repeat(section.title.length));
    for (const question of section.questions) {
      const answer = answers[question.id];
      const detailAnswer = answers[`${question.id}_details`];
      const displayAnswer = formatAnswerForSummary(question, answer ?? null);
      lines.push(`Q${question.questionNumber}. ${question.text}`);
      lines.push(`  Answer: ${displayAnswer}`);
      if (detailAnswer) {
        lines.push(`  Details: ${detailAnswer}`);
      }
      lines.push("");
    }
    lines.push("");
  }

  lines.push("This disclosure statement is provided for informational purposes.");
  lines.push("Consult your attorney and/or real estate professional before completing any legal disclosure form.");
  return lines.join("\n");
}

/**
 * Single orchestration helper that combines all prefill sources.
 * Merge priority (highest wins): house fields > home systems > maintenance logs.
 * Returns a flat DisclosureAnswers map with all pre-populated values.
 */
export function buildAllPrefillAnswers(
  house: Record<string, unknown>,
  systems: HomeSystemLike[],
  logs: MaintenanceLogLike[],
): DisclosureAnswers {
  const logsPrefill = buildPrefillFromLogs(logs);
  const systemsPrefill = buildPrefillFromSystems(systems);
  const housePrefill = buildPrefillAnswers(house);
  return { ...logsPrefill, ...systemsPrefill, ...housePrefill };
}
