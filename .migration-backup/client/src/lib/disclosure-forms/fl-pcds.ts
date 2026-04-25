import type { DisclosureSection, DisclosureAnswers } from "./ny-pcds";

export const FL_PCDS_SECTIONS: DisclosureSection[] = [
  {
    id: "general",
    title: "General Information",
    description: "Basic property and ownership facts.",
    questions: [
      { id: "yearBuilt", questionNumber: 1, text: "Year the property was built (to the best of your knowledge)", type: "number", prefillKey: "yearBuilt", hint: "From your home profile" },
      { id: "ownershipYears", questionNumber: 2, text: "How long have you owned this property?", type: "text" },
      { id: "occupancy", questionNumber: 3, text: "Is the property currently occupied?", type: "yes_no" },
      { id: "hoaExists", questionNumber: 4, text: "Is the property subject to a homeowners or condominium association?", type: "yes_no", followUp: "If yes, provide name and monthly/annual dues." },
      { id: "hoaAssessments", questionNumber: 5, text: "Are there any current or pending special assessments?", type: "yes_no_unknown", followUp: "If yes, describe amount and purpose." },
    ],
  },
  {
    id: "environmental",
    title: "Environmental & Natural Hazards",
    description: "Hazardous materials and Florida-specific natural hazard disclosures.",
    questions: [
      { id: "leadPaint", questionNumber: 6, text: "Has the property tested positive for lead paint?", type: "yes_no_unknown", followUp: "If yes, describe and whether remediated." },
      { id: "asbestos", questionNumber: 7, text: "Do you know of any asbestos-containing materials on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "mold", questionNumber: 8, text: "Do you know of any mold, water damage, or moisture intrusion?", type: "yes_no_unknown", followUp: "If yes, describe and whether treated." },
      { id: "chineseDrywall", questionNumber: 9, text: "Does the property contain Chinese-manufactured drywall (imported circa 2001–2009)?", type: "yes_no_unknown", followUp: "If yes, has remediation been performed?" },
      { id: "sinkhole", questionNumber: 10, text: "Do you know of any sinkhole activity on or near the property?", type: "yes_no_unknown", followUp: "If yes, describe and whether any repairs or remediation were performed." },
      { id: "sinkholeInsurance", questionNumber: 11, text: "Has a sinkhole claim ever been filed on this property?", type: "yes_no_unknown", followUp: "If yes, describe the outcome." },
      { id: "floodZone", questionNumber: 12, text: "Is the property located in a FEMA Special Flood Hazard Area (SFHA)?", type: "yes_no_unknown" },
      { id: "floodInsurance", questionNumber: 13, text: "Is flood insurance currently maintained or required?", type: "yes_no_unknown", followUp: "If yes, provide insurer and annual premium if known." },
      { id: "previousFlood", questionNumber: 14, text: "Has the property ever experienced flooding or hurricane damage?", type: "yes_no_unknown", followUp: "If yes, describe when and extent of damage." },
      { id: "undergroundTank", questionNumber: 15, text: "Is there a buried oil or chemical storage tank on the property?", type: "yes_no_unknown", followUp: "If yes, describe type and status." },
    ],
  },
  {
    id: "structural",
    title: "Structural Conditions",
    description: "Foundation, roof, walls, and structural integrity.",
    questions: [
      { id: "foundationType", questionNumber: 16, text: "Type of foundation", type: "select", options: ["Slab", "Crawl Space", "Basement", "Pier & Beam", "Other / Unknown"], prefillKey: "foundationType", hint: "From your home profile" },
      { id: "foundationProblems", questionNumber: 17, text: "Do you know of any foundation defects or movement?", type: "yes_no_unknown", followUp: "If yes, describe and state whether repaired." },
      { id: "roofType", questionNumber: 18, text: "Roof material type", type: "select", options: ["Asphalt Shingles", "Metal", "Tile", "Slate", "Wood Shakes", "Flat / Built-up", "Other / Unknown"], prefillKey: "roofType", hint: "From your home profile" },
      { id: "roofAge", questionNumber: 19, text: "Approximate year current roof was installed", type: "number", prefillKey: "roofInstalledYear", hint: "From your home profile" },
      { id: "roofLeaks", questionNumber: 20, text: "Do you know of any roof leaks, wind damage, or missing shingles?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "windMitigationReport", questionNumber: 21, text: "Has a wind mitigation inspection report been completed for this property?", type: "yes_no_unknown" },
    ],
  },
  {
    id: "mechanical",
    title: "Mechanical Systems",
    description: "Heating, cooling, plumbing, electrical, and other systems.",
    questions: [
      { id: "heatingType", questionNumber: 22, text: "Primary heating system type", type: "select", options: ["Heat Pump", "Forced Air Furnace", "Electric Baseboard", "Other / Unknown"], prefillKey: "hvacType", hint: "From your home profile" },
      { id: "hvacInstallYear", questionNumber: 23, text: "Approximate year HVAC system was installed", type: "number", prefillKey: "hvacInstallYear", hint: "From your home systems" },
      { id: "heatingDefects", questionNumber: 24, text: "Do you know of any defects in the HVAC system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "plumbingType", questionNumber: 25, text: "Primary plumbing material", type: "select", options: ["Copper", "PEX", "PVC", "CPVC", "Galvanized Steel", "Polybutylene", "Other / Unknown"], prefillKey: "plumbingType", hint: "From your home profile" },
      { id: "polybutylenePipe", questionNumber: 26, text: "Does the property contain polybutylene (gray plastic) plumbing pipe?", type: "yes_no_unknown" },
      { id: "plumbingDefects", questionNumber: 27, text: "Do you know of any defects in the plumbing?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "waterHeaterType", questionNumber: 28, text: "Water heater type", type: "select", options: ["Tank (Gas)", "Tank (Electric)", "Tankless (Gas)", "Tankless (Electric)", "Heat Pump Water Heater", "Solar", "Other / Unknown"], prefillKey: "waterHeaterType", hint: "From your home profile" },
      { id: "waterHeaterInstallYear", questionNumber: 29, text: "Approximate year water heater was installed", type: "number", prefillKey: "waterHeaterInstallYear", hint: "From your home systems" },
      { id: "electricalAmps", questionNumber: 30, text: "Electrical service capacity (amps)", type: "select", options: ["60 A", "100 A", "150 A", "200 A", "400 A", "Unknown"] },
      { id: "electricalDefects", questionNumber: 31, text: "Do you know of any defects in the electrical system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "sewerType", questionNumber: 32, text: "Sewage disposal method", type: "select", options: ["Municipal Sewer", "Septic System", "Cesspool", "Unknown"] },
      { id: "waterSource", questionNumber: 33, text: "Source of potable water", type: "select", options: ["Municipal / Public Water", "Well", "Other / Unknown"] },
      { id: "poolSpa", questionNumber: 34, text: "Does the property have a pool or spa?", type: "yes_no", followUp: "If yes, describe condition and any known defects." },
    ],
  },
  {
    id: "legal",
    title: "Legal & Other Disclosures",
    description: "Legal matters and other Florida-specific disclosures.",
    questions: [
      { id: "additionsAlterations", questionNumber: 35, text: "Have any additions or structural alterations been made?", type: "yes_no_unknown", followUp: "If yes, describe and whether permits were obtained." },
      { id: "legalProceedings", questionNumber: 36, text: "Are there any pending lawsuits, judgments, or liens on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "easements", questionNumber: 37, text: "Are there any easements, rights-of-way, or encroachments?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "insuranceClaims", questionNumber: 38, text: "Have any insurance claims been filed on the property in the last 5 years?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "smokeDetectors", questionNumber: 39, text: "Are smoke detectors installed and operational?", type: "yes_no_unknown" },
      { id: "termiteInspection", questionNumber: 40, text: "Has a termite or wood-destroying organism (WDO) inspection been performed?", type: "yes_no_unknown", followUp: "If yes, were any treatments or repairs made?" },
      { id: "otherDefects", questionNumber: 41, text: "Are you aware of any other material defects not previously disclosed?", type: "yes_no_unknown", followUp: "If yes, describe." },
    ],
  },
];

export function generateFLSummaryText(answers: DisclosureAnswers, propertyAddress?: string): string {
  const lines: string[] = [];
  lines.push("FLORIDA SELLER'S PROPERTY DISCLOSURE STATEMENT");
  lines.push("=".repeat(55));
  if (propertyAddress) lines.push(`Property Address: ${propertyAddress}`);
  lines.push("");
  for (const section of FL_PCDS_SECTIONS) {
    lines.push(section.title.toUpperCase());
    lines.push("-".repeat(section.title.length));
    for (const q of section.questions) {
      const ans = answers[q.id];
      const det = answers[`${q.id}_details`];
      const display = ans !== null && ans !== undefined && ans !== "" ? String(ans) : "Not answered";
      lines.push(`Q${q.questionNumber}. ${q.text}`);
      lines.push(`  Answer: ${display}`);
      if (det) lines.push(`  Details: ${det}`);
      lines.push("");
    }
  }
  lines.push("This disclosure is for informational purposes only.");
  lines.push("Consult your attorney and real estate professional before submitting any legal disclosure.");
  return lines.join("\n");
}
