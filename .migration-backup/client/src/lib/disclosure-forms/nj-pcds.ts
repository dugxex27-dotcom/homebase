import type { DisclosureSection, DisclosureAnswers } from "./ny-pcds";

export const NJ_PCDS_SECTIONS: DisclosureSection[] = [
  {
    id: "general",
    title: "General Information",
    description: "Basic property and ownership facts.",
    questions: [
      { id: "yearBuilt", questionNumber: 1, text: "Year the property was built (to the best of your knowledge)", type: "number", prefillKey: "yearBuilt", hint: "From your home profile" },
      { id: "ownershipYears", questionNumber: 2, text: "How long have you owned this property?", type: "text" },
      { id: "occupancy", questionNumber: 3, text: "Is the property currently occupied?", type: "yes_no" },
      { id: "hoaExists", questionNumber: 4, text: "Is the property subject to a homeowners or condominium association?", type: "yes_no", followUp: "If yes, provide name and monthly/annual dues." },
    ],
  },
  {
    id: "environmental",
    title: "Environmental Conditions",
    description: "Hazardous materials and New Jersey environmental disclosures.",
    questions: [
      { id: "leadPaint", questionNumber: 5, text: "Has the property tested positive for lead paint?", type: "yes_no_unknown", followUp: "If yes, describe and whether remediated." },
      { id: "asbestos", questionNumber: 6, text: "Do you know of any asbestos-containing materials on the property?", type: "yes_no_unknown", followUp: "If yes, describe location and condition." },
      { id: "radon", questionNumber: 7, text: "Has radon been detected or tested for?", type: "yes_no_unknown", followUp: "If yes, were mitigation steps taken?" },
      { id: "mold", questionNumber: 8, text: "Do you know of any mold or water damage?", type: "yes_no_unknown", followUp: "If yes, describe and whether treated." },
      { id: "undergroundTank", questionNumber: 9, text: "Is there a buried oil or chemical storage tank (UST/AST) on the property?", type: "yes_no_unknown", followUp: "If yes, describe type, age, and current NJDEP status." },
      { id: "njdepCleanup", questionNumber: 10, text: "Is the property subject to an NJDEP remediation or cleanup order?", type: "yes_no_unknown", followUp: "If yes, describe the nature and current status." },
      { id: "oilTank", questionNumber: 11, text: "Is there an aboveground oil storage tank on the property?", type: "yes_no_unknown", followUp: "If yes, describe size and condition." },
      { id: "floodZone", questionNumber: 12, text: "Is the property in a FEMA Special Flood Hazard Area?", type: "yes_no_unknown" },
    ],
  },
  {
    id: "structural",
    title: "Structural Conditions",
    description: "Foundation, roof, walls, and structural integrity.",
    questions: [
      { id: "foundationType", questionNumber: 13, text: "Type of foundation", type: "select", options: ["Basement", "Crawl Space", "Slab", "Pier & Beam", "Other / Unknown"], prefillKey: "foundationType", hint: "From your home profile" },
      { id: "foundationProblems", questionNumber: 14, text: "Do you know of any foundation defects or settling?", type: "yes_no_unknown", followUp: "If yes, describe and state whether repaired." },
      { id: "roofType", questionNumber: 15, text: "Roof material type", type: "select", options: ["Asphalt Shingles", "Metal", "Tile", "Slate", "Wood Shakes", "Flat / Built-up", "Other / Unknown"], prefillKey: "roofType", hint: "From your home profile" },
      { id: "roofAge", questionNumber: 16, text: "Approximate year current roof was installed", type: "number", prefillKey: "roofInstalledYear", hint: "From your home profile" },
      { id: "roofLeaks", questionNumber: 17, text: "Do you know of any roof leaks or damage?", type: "yes_no_unknown", followUp: "If yes, describe and whether repaired." },
      { id: "basementWater", questionNumber: 18, text: "Do you know of any water intrusion, dampness, or flooding in a basement or crawl space?", type: "yes_no_unknown", followUp: "If yes, describe frequency and repairs." },
    ],
  },
  {
    id: "mechanical",
    title: "Mechanical Systems",
    description: "Heating, cooling, plumbing, electrical, and other systems.",
    questions: [
      { id: "heatingType", questionNumber: 19, text: "Primary heating system type", type: "select", options: ["Forced Air Furnace", "Boiler / Radiator", "Heat Pump", "Electric Baseboard", "Radiant Floor", "Other / Unknown"], prefillKey: "hvacType", hint: "From your home profile" },
      { id: "heatingFuel", questionNumber: 20, text: "Primary heating fuel", type: "select", options: ["Natural Gas", "Oil", "Electric", "Propane", "Wood", "Other / Unknown"], prefillKey: "primaryHeatingFuel", hint: "From your home profile" },
      { id: "hvacInstallYear", questionNumber: 21, text: "Approximate year HVAC system was installed", type: "number", prefillKey: "hvacInstallYear", hint: "From your home systems" },
      { id: "heatingDefects", questionNumber: 22, text: "Do you know of any defects in the heating or cooling system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "plumbingType", questionNumber: 23, text: "Primary plumbing material", type: "select", options: ["Copper", "PEX", "PVC", "Galvanized Steel", "Cast Iron", "Lead", "Other / Unknown"], prefillKey: "plumbingType", hint: "From your home profile" },
      { id: "plumbingDefects", questionNumber: 24, text: "Do you know of any defects in the plumbing?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "waterHeaterType", questionNumber: 25, text: "Water heater type", type: "select", options: ["Tank (Gas)", "Tank (Electric)", "Tankless (Gas)", "Tankless (Electric)", "Heat Pump Water Heater", "Solar", "Other / Unknown"], prefillKey: "waterHeaterType", hint: "From your home profile" },
      { id: "waterHeaterInstallYear", questionNumber: 26, text: "Approximate year water heater was installed", type: "number", prefillKey: "waterHeaterInstallYear", hint: "From your home systems" },
      { id: "electricalAmps", questionNumber: 27, text: "Electrical service capacity (amps)", type: "select", options: ["60 A", "100 A", "150 A", "200 A", "400 A", "Unknown"] },
      { id: "electricalDefects", questionNumber: 28, text: "Do you know of any defects in the electrical system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "sewerType", questionNumber: 29, text: "Sewage disposal method", type: "select", options: ["Municipal Sewer", "Septic System", "Cesspool", "Unknown"] },
      { id: "waterSource", questionNumber: 30, text: "Source of potable water", type: "select", options: ["Municipal / Public Water", "Well", "Other / Unknown"] },
    ],
  },
  {
    id: "legal",
    title: "Legal & Other Disclosures",
    description: "Legal matters and New Jersey-specific disclosures.",
    questions: [
      { id: "additionsAlterations", questionNumber: 31, text: "Have any additions or structural alterations been made?", type: "yes_no_unknown", followUp: "If yes, describe and whether permits were obtained." },
      { id: "certificateOfOccupancy", questionNumber: 32, text: "Is there a valid Certificate of Occupancy for the property?", type: "yes_no_unknown" },
      { id: "legalProceedings", questionNumber: 33, text: "Are there any pending lawsuits, judgments, or liens?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "easements", questionNumber: 34, text: "Are there any easements, rights-of-way, or encroachments?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "insuranceClaims", questionNumber: 35, text: "Have any insurance claims been filed on the property in the last 5 years?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "smokeDetectors", questionNumber: 36, text: "Are smoke and carbon monoxide detectors installed and operational?", type: "yes_no_unknown" },
      { id: "otherDefects", questionNumber: 37, text: "Are you aware of any other material defects not previously disclosed?", type: "yes_no_unknown", followUp: "If yes, describe." },
    ],
  },
];

export function generateNJSummaryText(answers: DisclosureAnswers, propertyAddress?: string): string {
  const lines: string[] = [];
  lines.push("NEW JERSEY SELLER'S PROPERTY CONDITION DISCLOSURE STATEMENT");
  lines.push("=".repeat(55));
  if (propertyAddress) lines.push(`Property Address: ${propertyAddress}`);
  lines.push("");
  for (const section of NJ_PCDS_SECTIONS) {
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
