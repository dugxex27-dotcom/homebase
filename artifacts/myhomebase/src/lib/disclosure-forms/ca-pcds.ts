import type { DisclosureSection, DisclosureAnswers } from "./ny-pcds";

export const CA_TDS_SECTIONS: DisclosureSection[] = [
  {
    id: "general",
    title: "General Information",
    description: "Basic property and ownership facts.",
    questions: [
      { id: "yearBuilt", questionNumber: 1, text: "Year the property was built (to the best of your knowledge)", type: "number", prefillKey: "yearBuilt", hint: "From your home profile" },
      { id: "ownershipYears", questionNumber: 2, text: "How long have you owned this property?", type: "text" },
      { id: "occupancy", questionNumber: 3, text: "Is the property currently occupied?", type: "yes_no" },
      { id: "hoaExists", questionNumber: 4, text: "Is the property subject to a homeowners association (HOA)?", type: "yes_no", followUp: "If yes, provide the name and monthly/annual dues." },
      { id: "hoaDefects", questionNumber: 5, text: "Are there any current or pending special assessments from the HOA?", type: "yes_no_unknown", followUp: "If yes, describe." },
    ],
  },
  {
    id: "environmental",
    title: "Environmental & Natural Hazards",
    description: "Hazardous materials and California natural hazard zone disclosures.",
    questions: [
      { id: "leadPaint", questionNumber: 6, text: "Has the property ever tested positive for lead paint?", type: "yes_no_unknown", followUp: "If yes, describe remediation." },
      { id: "asbestos", questionNumber: 7, text: "Do you know of any asbestos-containing materials on the property?", type: "yes_no_unknown", followUp: "If yes, describe location and condition." },
      { id: "mold", questionNumber: 8, text: "Do you know of any mold or water damage on the property?", type: "yes_no_unknown", followUp: "If yes, describe and whether treated." },
      { id: "radon", questionNumber: 9, text: "Has radon been detected or tested for?", type: "yes_no_unknown", followUp: "If yes, were mitigation steps taken?" },
      { id: "specialHazardZone", questionNumber: 10, text: "Is the property located in a Special Flood Hazard Area (SFHA) per FEMA?", type: "yes_no_unknown" },
      { id: "fireHazardZone", questionNumber: 11, text: "Is the property in a State Fire Responsibility Area (SFRA) or Very High Fire Hazard Severity Zone (VHFHSZ)?", type: "yes_no_unknown" },
      { id: "earthquakeZone", questionNumber: 12, text: "Is the property in a Seismic Hazard Zone (formerly Earthquake Fault Zone or Seismic Hazard Zone)?", type: "yes_no_unknown" },
      { id: "naturalHazardDisclosure", questionNumber: 13, text: "Has a Natural Hazard Disclosure (NHD) report been ordered?", type: "yes_no_unknown" },
      { id: "undergroundTank", questionNumber: 14, text: "Is there a buried fuel or chemical storage tank on the property?", type: "yes_no_unknown", followUp: "If yes, describe type and current status." },
    ],
  },
  {
    id: "structural",
    title: "Structural Conditions",
    description: "Foundation, roof, walls, and structural integrity.",
    questions: [
      { id: "foundationType", questionNumber: 15, text: "Type of foundation", type: "select", options: ["Basement", "Crawl Space", "Slab", "Pier & Beam", "Other / Unknown"], prefillKey: "foundationType", hint: "From your home profile" },
      { id: "foundationProblems", questionNumber: 16, text: "Do you know of any foundation defects or settling?", type: "yes_no_unknown", followUp: "If yes, describe and state whether repaired." },
      { id: "roofType", questionNumber: 17, text: "Roof material type", type: "select", options: ["Asphalt Shingles", "Metal", "Tile", "Slate", "Wood Shakes", "Flat / Built-up", "Other / Unknown"], prefillKey: "roofType", hint: "From your home profile" },
      { id: "roofAge", questionNumber: 18, text: "Approximate year current roof was installed", type: "number", prefillKey: "roofInstalledYear", hint: "From your home profile" },
      { id: "roofLeaks", questionNumber: 19, text: "Do you know of any roof leaks or roof damage?", type: "yes_no_unknown", followUp: "If yes, describe and state whether repaired." },
      { id: "basementWater", questionNumber: 20, text: "Do you know of any water intrusion, flooding, or dampness in a basement, crawl space, or subarea?", type: "yes_no_unknown", followUp: "If yes, describe frequency and repairs." },
      { id: "drainageGrading", questionNumber: 21, text: "Do you know of any drainage or grading problems on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
    ],
  },
  {
    id: "mechanical",
    title: "Mechanical Systems",
    description: "Heating, cooling, plumbing, electrical, and other systems.",
    questions: [
      { id: "heatingType", questionNumber: 22, text: "Primary heating system type", type: "select", options: ["Forced Air Furnace", "Boiler / Radiator", "Heat Pump", "Electric Baseboard", "Radiant Floor", "Wall Heater", "Other / Unknown"], prefillKey: "hvacType", hint: "From your home profile" },
      { id: "heatingFuel", questionNumber: 23, text: "Primary heating fuel", type: "select", options: ["Natural Gas", "Oil", "Electric", "Propane", "Wood", "Solar", "Other / Unknown"], prefillKey: "primaryHeatingFuel", hint: "From your home profile" },
      { id: "hvacInstallYear", questionNumber: 24, text: "Approximate year HVAC system was installed", type: "number", prefillKey: "hvacInstallYear", hint: "From your home systems" },
      { id: "heatingDefects", questionNumber: 25, text: "Do you know of any defects in the heating system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "coolingType", questionNumber: 26, text: "Is there central or room air conditioning?", type: "yes_no_unknown" },
      { id: "plumbingType", questionNumber: 27, text: "Primary plumbing material", type: "select", options: ["Copper", "PEX", "PVC", "Galvanized Steel", "Cast Iron", "Lead", "Other / Unknown"], prefillKey: "plumbingType", hint: "From your home profile" },
      { id: "plumbingDefects", questionNumber: 28, text: "Do you know of any defects in the plumbing?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "waterHeaterType", questionNumber: 29, text: "Water heater type", type: "select", options: ["Tank (Gas)", "Tank (Electric)", "Tankless (Gas)", "Tankless (Electric)", "Heat Pump Water Heater", "Solar", "Other / Unknown"], prefillKey: "waterHeaterType", hint: "From your home profile" },
      { id: "waterHeaterInstallYear", questionNumber: 30, text: "Approximate year water heater was installed", type: "number", prefillKey: "waterHeaterInstallYear", hint: "From your home systems" },
      { id: "electricalAmps", questionNumber: 31, text: "Electrical service capacity (amps)", type: "select", options: ["60 A", "100 A", "150 A", "200 A", "400 A", "Unknown"] },
      { id: "electricalDefects", questionNumber: 32, text: "Do you know of any defects in the electrical system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "sewerType", questionNumber: 33, text: "Sewage disposal method", type: "select", options: ["Municipal Sewer", "Septic System", "Cesspool", "Unknown"] },
      { id: "waterSource", questionNumber: 34, text: "Source of potable water", type: "select", options: ["Municipal / Public Water", "Well", "Other / Unknown"] },
    ],
  },
  {
    id: "additions",
    title: "Additions, Alterations & Permits",
    description: "Improvements and permit compliance.",
    questions: [
      { id: "additionsAlterations", questionNumber: 35, text: "Have any additions or structural alterations been made since the property was built?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "permitsObtained", questionNumber: 36, text: "Were all required building permits obtained for any additions or alterations?", type: "yes_no_unknown" },
      { id: "unpermittedWork", questionNumber: 37, text: "Is there any unpermitted construction or work on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "garageType", questionNumber: 38, text: "Type of garage", type: "select", options: ["None", "Attached", "Detached", "Built-in", "Carport"], prefillKey: "garageType", hint: "From your home profile" },
    ],
  },
  {
    id: "legal",
    title: "Legal, Title & Other Disclosures",
    description: "Legal matters, title issues, and California-specific disclosures.",
    questions: [
      { id: "deathOnProperty", questionNumber: 39, text: "Have there been any deaths on the property within the last three years?", type: "yes_no_unknown", followUp: "If yes, describe circumstances (seller is not required to disclose AIDS-related deaths)." },
      { id: "sexOffender", questionNumber: 40, text: "Are you aware of any registered sex offenders in the vicinity of this property?", type: "yes_no_unknown" },
      { id: "legalProceedings", questionNumber: 41, text: "Are there any pending lawsuits, judgments, or liens on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "easements", questionNumber: 42, text: "Are there any easements, rights-of-way, or encroachments?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "insuranceClaims", questionNumber: 43, text: "Have any insurance claims been filed on the property in the last 5 years?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "windowSecurityBars", questionNumber: 44, text: "Are there window security bars on any bedroom windows?", type: "yes_no_unknown", followUp: "If yes, do they have quick-release mechanisms?" },
      { id: "smokeDetectors", questionNumber: 45, text: "Are all required smoke detectors installed and operational?", type: "yes_no_unknown" },
      { id: "carbonMonoxide", questionNumber: 46, text: "Are all required carbon monoxide detectors installed and operational?", type: "yes_no_unknown" },
      { id: "otherDefects", questionNumber: 47, text: "Are you aware of any other material defects or conditions not previously disclosed?", type: "yes_no_unknown", followUp: "If yes, describe." },
    ],
  },
];

export function generateCASummaryText(answers: DisclosureAnswers, propertyAddress?: string): string {
  const lines: string[] = [];
  lines.push("CALIFORNIA TRANSFER DISCLOSURE STATEMENT (TDS)");
  lines.push("=".repeat(55));
  if (propertyAddress) lines.push(`Property Address: ${propertyAddress}`);
  lines.push("");
  for (const section of CA_TDS_SECTIONS) {
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
