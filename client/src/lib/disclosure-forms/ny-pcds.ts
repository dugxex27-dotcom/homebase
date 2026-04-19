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
      { id: "heatingDefects", questionNumber: 19, text: "Do you know of any defects in the heating system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "coolingType", questionNumber: 20, text: "Is there central air conditioning?", type: "yes_no_unknown" },
      { id: "coolingDefects", questionNumber: 21, text: "Do you know of any defects in the cooling system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "plumbingType", questionNumber: 22, text: "What is the primary plumbing material?", type: "select", options: ["Copper", "PEX", "PVC", "Galvanized Steel", "Cast Iron", "Lead", "Other / Unknown"], prefillKey: "plumbingType", hint: "From your home profile" },
      { id: "plumbingDefects", questionNumber: 23, text: "Do you know of any defects in the plumbing system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "waterHeaterType", questionNumber: 24, text: "What type of water heater is installed?", type: "select", options: ["Tank (Gas)", "Tank (Electric)", "Tankless (Gas)", "Tankless (Electric)", "Heat Pump Water Heater", "Solar", "Other / Unknown"], prefillKey: "waterHeaterType", hint: "From your home profile" },
      { id: "electricalAmps", questionNumber: 25, text: "What is the electrical service capacity (amps)?", type: "select", options: ["60 A", "100 A", "150 A", "200 A", "400 A", "Unknown"] },
      { id: "electricalDefects", questionNumber: 26, text: "Do you know of any defects in the electrical system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "sewerType", questionNumber: 27, text: "How is sewage disposed of?", type: "select", options: ["Municipal Sewer", "Septic System", "Cesspool", "Unknown"] },
      { id: "waterSource", questionNumber: 28, text: "What is the source of potable water?", type: "select", options: ["Municipal / Public Water", "Well", "Other / Unknown"] },
    ],
  },
  {
    id: "additions",
    title: "Additions, Alterations & Permits",
    description: "Improvements and compliance.",
    questions: [
      { id: "additionsAlterations", questionNumber: 29, text: "Have there been any additions or structural alterations to the property since it was built?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "permitsObtained", questionNumber: 30, text: "Were all required building permits obtained for any additions or alterations?", type: "yes_no_unknown" },
      { id: "certificateOfOccupancy", questionNumber: 31, text: "Is there a valid Certificate of Occupancy (CO) for the property?", type: "yes_no_unknown" },
      { id: "garageType", questionNumber: 32, text: "What type of garage does the property have?", type: "select", options: ["None", "Attached", "Detached", "Built-in", "Carport"], prefillKey: "garageType", hint: "From your home profile" },
    ],
  },
  {
    id: "legal",
    title: "Legal & Other Disclosures",
    description: "Legal matters, disputes, and encumbrances.",
    questions: [
      { id: "legalProceedings", questionNumber: 33, text: "Are you aware of any pending legal actions, lawsuits, or judgments affecting the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "easements", questionNumber: 34, text: "Are there any easements, rights-of-way, or encroachments on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "floodZone", questionNumber: 35, text: "Is the property located in a FEMA flood zone?", type: "yes_no_unknown" },
      { id: "floodDamage", questionNumber: 36, text: "Has the property sustained flood damage?", type: "yes_no_unknown", followUp: "If yes, describe and state whether repaired." },
      { id: "insuranceClaims", questionNumber: 37, text: "Have any insurance claims been filed on the property in the last 5 years?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "otherDefects", questionNumber: 38, text: "Are you aware of any other material defects or conditions not previously disclosed?", type: "yes_no_unknown", followUp: "If yes, describe." },
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
}

export function buildPrefillFromSystems(systems: HomeSystemLike[]): DisclosureAnswers {
  const answers: DisclosureAnswers = {};
  for (const sys of systems) {
    const type = (sys.systemType ?? "").toLowerCase();
    if (type.includes("hvac") || type.includes("furnace") || type.includes("heat") || type.includes("air handler")) {
      if (!answers["heatingType"]) {
        if (type.includes("heat pump")) answers["heatingType"] = "Heat Pump";
        else if (type.includes("boiler")) answers["heatingType"] = "Boiler / Radiator";
        else if (type.includes("furnace") || type.includes("forced air")) answers["heatingType"] = "Forced Air Furnace";
        else if (type.includes("baseboard")) answers["heatingType"] = "Electric Baseboard";
      }
    }
    if (type.includes("water heater")) {
      if (!answers["waterHeaterType"]) {
        if (type.includes("tankless")) answers["waterHeaterType"] = "Tankless (Gas)";
        else if (type.includes("heat pump")) answers["waterHeaterType"] = "Heat Pump Water Heater";
        else answers["waterHeaterType"] = "Tank (Gas)";
      }
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

export function generateSummaryText(answers: DisclosureAnswers): string {
  const lines: string[] = [];
  lines.push("NEW YORK STATE PROPERTY CONDITION DISCLOSURE STATEMENT");
  lines.push("=".repeat(55));
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
