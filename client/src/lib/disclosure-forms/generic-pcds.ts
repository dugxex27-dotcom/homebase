import type { DisclosureSection, DisclosureAnswers } from "./ny-pcds";

export const GENERIC_PCDS_SECTIONS: DisclosureSection[] = [
  {
    id: "general",
    title: "General Information",
    description: "Basic property facts.",
    questions: [
      {
        id: "yearBuilt",
        questionNumber: 1,
        text: "Year the property was built (to the best of your knowledge)",
        type: "number",
        prefillKey: "yearBuilt",
        hint: "From your home profile",
      },
      {
        id: "ownershipYears",
        questionNumber: 2,
        text: "How long have you owned this property?",
        type: "text",
      },
      {
        id: "occupancy",
        questionNumber: 3,
        text: "Is the property currently occupied?",
        type: "yes_no",
      },
    ],
  },
  {
    id: "environmental",
    title: "Environmental Conditions",
    description: "Known hazardous materials and environmental concerns.",
    questions: [
      {
        id: "leadPaint",
        questionNumber: 4,
        text: "Has the property ever tested positive for lead paint?",
        type: "yes_no_unknown",
        followUp: "If yes, describe and indicate whether remediated.",
      },
      {
        id: "asbestos",
        questionNumber: 5,
        text: "Do you know of any asbestos-containing materials on the property?",
        type: "yes_no_unknown",
        followUp: "If yes, describe location and current condition.",
      },
      {
        id: "mold",
        questionNumber: 6,
        text: "Do you know of any mold or mildew present?",
        type: "yes_no_unknown",
        followUp: "If yes, describe and state whether treated.",
      },
    ],
  },
  {
    id: "structural",
    title: "Structural Conditions",
    description: "Foundation, roof, and structural integrity.",
    questions: [
      {
        id: "foundationType",
        questionNumber: 7,
        text: "Type of foundation",
        type: "select",
        options: ["Basement", "Crawl Space", "Slab", "Pier & Beam", "Other / Unknown"],
        prefillKey: "foundationType",
        hint: "From your home profile",
      },
      {
        id: "foundationProblems",
        questionNumber: 8,
        text: "Are you aware of any foundation defects or problems?",
        type: "yes_no_unknown",
        followUp: "If yes, describe the defect and any repairs made.",
      },
      {
        id: "roofType",
        questionNumber: 9,
        text: "Roof material type",
        type: "select",
        options: ["Asphalt Shingles", "Metal", "Tile", "Slate", "Wood Shakes", "Flat / Built-up", "Other / Unknown"],
        prefillKey: "roofType",
        hint: "From your home profile",
      },
      {
        id: "roofLeaks",
        questionNumber: 10,
        text: "Are you aware of any roof leaks or damage?",
        type: "yes_no_unknown",
        followUp: "If yes, describe and indicate whether repaired.",
      },
    ],
  },
  {
    id: "mechanical",
    title: "Mechanical Systems",
    description: "Heating, cooling, plumbing, and electrical.",
    questions: [
      {
        id: "heatingType",
        questionNumber: 11,
        text: "Primary heating system type",
        type: "select",
        options: ["Forced Air Furnace", "Boiler / Radiator", "Heat Pump", "Electric Baseboard", "Radiant Floor", "Other / Unknown"],
        prefillKey: "hvacType",
        hint: "From your home profile",
      },
      {
        id: "heatingFuel",
        questionNumber: 12,
        text: "Primary heating fuel",
        type: "select",
        options: ["Natural Gas", "Oil", "Electric", "Propane", "Wood", "Solar", "Other / Unknown"],
        prefillKey: "primaryHeatingFuel",
        hint: "From your home profile",
      },
      {
        id: "plumbingDefects",
        questionNumber: 13,
        text: "Are you aware of any plumbing defects?",
        type: "yes_no_unknown",
        followUp: "If yes, describe.",
      },
      {
        id: "electricalDefects",
        questionNumber: 14,
        text: "Are you aware of any electrical defects?",
        type: "yes_no_unknown",
        followUp: "If yes, describe.",
      },
    ],
  },
  {
    id: "legal",
    title: "Legal & Other Disclosures",
    description: "Legal matters and additional disclosures.",
    questions: [
      {
        id: "floodZone",
        questionNumber: 15,
        text: "Is the property located in a FEMA designated flood zone?",
        type: "yes_no_unknown",
      },
      {
        id: "legalProceedings",
        questionNumber: 16,
        text: "Are there any pending legal actions or disputes affecting the property?",
        type: "yes_no_unknown",
        followUp: "If yes, describe.",
      },
      {
        id: "otherDefects",
        questionNumber: 17,
        text: "Are you aware of any other material defects not previously disclosed?",
        type: "yes_no_unknown",
        followUp: "If yes, describe.",
      },
    ],
  },
];

export function generateGenericSummaryText(answers: DisclosureAnswers, stateCode: string, propertyAddress?: string): string {
  const lines: string[] = [];
  lines.push(`PROPERTY CONDITION DISCLOSURE STATEMENT`);
  lines.push(`State: ${stateCode} (Generic Form)`);
  lines.push("=".repeat(55));
  if (propertyAddress) {
    lines.push(`Property Address: ${propertyAddress}`);
  }
  lines.push("");
  for (const section of GENERIC_PCDS_SECTIONS) {
    lines.push(section.title.toUpperCase());
    lines.push("-".repeat(section.title.length));
    for (const question of section.questions) {
      const answer = answers[question.id];
      const detail = answers[`${question.id}_details`];
      const displayAnswer = answer !== null && answer !== undefined && answer !== "" ? String(answer) : "Not answered";
      lines.push(`${question.questionNumber}. ${question.text}`);
      lines.push(`   Answer: ${displayAnswer}`);
      if (detail) lines.push(`   Details: ${detail}`);
      lines.push("");
    }
    lines.push("");
  }
  lines.push("This disclosure is for informational purposes only.");
  lines.push("Consult your attorney and real estate professional before submitting any legal disclosure.");
  return lines.join("\n");
}
