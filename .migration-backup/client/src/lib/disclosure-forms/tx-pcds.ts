import type { DisclosureSection, DisclosureAnswers } from "./ny-pcds";

export const TX_PCDS_SECTIONS: DisclosureSection[] = [
  {
    id: "general",
    title: "General Information",
    description: "Basic property and ownership facts.",
    questions: [
      { id: "yearBuilt", questionNumber: 1, text: "Year the property was built (to the best of your knowledge)", type: "number", prefillKey: "yearBuilt", hint: "From your home profile" },
      { id: "ownershipYears", questionNumber: 2, text: "How long have you owned this property?", type: "text" },
      { id: "occupancy", questionNumber: 3, text: "Is the property currently occupied?", type: "yes_no" },
      { id: "hoaExists", questionNumber: 4, text: "Is the property subject to a homeowners association (HOA)?", type: "yes_no", followUp: "If yes, provide HOA name and dues amount." },
      { id: "mudDistrict", questionNumber: 5, text: "Is the property located in a Municipal Utility District (MUD), Water Control and Improvement District (WCID), or other special district?", type: "yes_no_unknown", followUp: "If yes, provide district name and annual fees/taxes." },
      { id: "pidDistrict", questionNumber: 6, text: "Is the property located in a Public Improvement District (PID)?", type: "yes_no_unknown", followUp: "If yes, provide PID name and annual assessment." },
    ],
  },
  {
    id: "environmental",
    title: "Environmental Conditions",
    description: "Hazardous materials and environmental concerns.",
    questions: [
      { id: "leadPaint", questionNumber: 7, text: "Has the property tested positive for lead paint?", type: "yes_no_unknown", followUp: "If yes, describe and whether remediated." },
      { id: "asbestos", questionNumber: 8, text: "Do you know of any asbestos-containing materials on the property?", type: "yes_no_unknown", followUp: "If yes, describe location and condition." },
      { id: "mold", questionNumber: 9, text: "Do you know of any mold or mildew on the property?", type: "yes_no_unknown", followUp: "If yes, describe and whether treated." },
      { id: "undergroundTank", questionNumber: 10, text: "Is there a buried oil or chemical storage tank on the property?", type: "yes_no_unknown", followUp: "If yes, describe type and current status." },
      { id: "previousFlood", questionNumber: 11, text: "Has the property flooded within the last 5 years?", type: "yes_no_unknown", followUp: "If yes, describe when and the extent of damage." },
      { id: "floodInsurance", questionNumber: 12, text: "Is flood insurance required for this property?", type: "yes_no_unknown" },
      { id: "drainagePond", questionNumber: 13, text: "Is the property located adjacent to or near a drainage pond or retention basin?", type: "yes_no_unknown" },
    ],
  },
  {
    id: "structural",
    title: "Structural Conditions",
    description: "Foundation, roof, walls, and structural integrity.",
    questions: [
      { id: "foundationType", questionNumber: 14, text: "Type of foundation", type: "select", options: ["Basement", "Crawl Space", "Slab", "Pier & Beam", "Other / Unknown"], prefillKey: "foundationType", hint: "From your home profile" },
      { id: "foundationProblems", questionNumber: 15, text: "Do you know of any foundation defects, movement, or cracking?", type: "yes_no_unknown", followUp: "If yes, describe problem and any repairs including piers/pilings added." },
      { id: "subsurfaceRepairs", questionNumber: 16, text: "Have any subsurface repairs (e.g., foundation piers, slab repairs) been made?", type: "yes_no_unknown", followUp: "If yes, describe type, contractor, and date." },
      { id: "roofType", questionNumber: 17, text: "Roof material type", type: "select", options: ["Asphalt Shingles", "Metal", "Tile", "Slate", "Wood Shakes", "Flat / Built-up", "Other / Unknown"], prefillKey: "roofType", hint: "From your home profile" },
      { id: "roofAge", questionNumber: 18, text: "Approximate year current roof was installed", type: "number", prefillKey: "roofInstalledYear", hint: "From your home profile" },
      { id: "roofLeaks", questionNumber: 19, text: "Do you know of any roof leaks or hail damage?", type: "yes_no_unknown", followUp: "If yes, describe and whether repaired." },
      { id: "waterIntrusion", questionNumber: 20, text: "Do you know of any water intrusion or dampness inside the property?", type: "yes_no_unknown", followUp: "If yes, describe cause and repairs." },
    ],
  },
  {
    id: "mechanical",
    title: "Mechanical Systems",
    description: "Heating, cooling, plumbing, electrical, and other systems.",
    questions: [
      { id: "heatingType", questionNumber: 21, text: "Primary heating system type", type: "select", options: ["Forced Air Furnace", "Heat Pump", "Electric Baseboard", "Radiant Floor", "Wall Heater", "Other / Unknown"], prefillKey: "hvacType", hint: "From your home profile" },
      { id: "heatingFuel", questionNumber: 22, text: "Primary heating fuel", type: "select", options: ["Natural Gas", "Oil", "Electric", "Propane", "Other / Unknown"], prefillKey: "primaryHeatingFuel", hint: "From your home profile" },
      { id: "hvacInstallYear", questionNumber: 23, text: "Approximate year HVAC system was installed", type: "number", prefillKey: "hvacInstallYear", hint: "From your home systems" },
      { id: "heatingDefects", questionNumber: 24, text: "Do you know of any defects in the heating or cooling system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "plumbingType", questionNumber: 25, text: "Primary plumbing material", type: "select", options: ["Copper", "PEX", "PVC", "Galvanized Steel", "Cast Iron", "Polybutylene", "Other / Unknown"], prefillKey: "plumbingType", hint: "From your home profile" },
      { id: "polybutylenePipe", questionNumber: 26, text: "Does the property contain polybutylene (gray plastic) plumbing pipe?", type: "yes_no_unknown" },
      { id: "plumbingDefects", questionNumber: 27, text: "Do you know of any defects in the plumbing?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "waterHeaterType", questionNumber: 28, text: "Water heater type", type: "select", options: ["Tank (Gas)", "Tank (Electric)", "Tankless (Gas)", "Tankless (Electric)", "Heat Pump Water Heater", "Solar", "Other / Unknown"], prefillKey: "waterHeaterType", hint: "From your home profile" },
      { id: "waterHeaterInstallYear", questionNumber: 29, text: "Approximate year water heater was installed", type: "number", prefillKey: "waterHeaterInstallYear", hint: "From your home systems" },
      { id: "electricalAmps", questionNumber: 30, text: "Electrical service capacity (amps)", type: "select", options: ["60 A", "100 A", "150 A", "200 A", "400 A", "Unknown"] },
      { id: "electricalDefects", questionNumber: 31, text: "Do you know of any defects in the electrical system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "sewerType", questionNumber: 32, text: "Sewage disposal method", type: "select", options: ["Municipal Sewer", "Septic System", "Aerobic Septic", "Cesspool", "Unknown"] },
      { id: "septicDefects", questionNumber: 33, text: "Do you know of any defects in the septic or sewer system?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "waterSource", questionNumber: 34, text: "Source of potable water", type: "select", options: ["Municipal / Public Water", "Well", "Rainwater Collection", "Other / Unknown"] },
    ],
  },
  {
    id: "legal",
    title: "Legal & Other Disclosures",
    description: "Legal matters, disputes, and other Texas-specific disclosures.",
    questions: [
      { id: "additionsAlterations", questionNumber: 35, text: "Have any additions or structural alterations been made to the property?", type: "yes_no_unknown", followUp: "If yes, describe and whether permits were obtained." },
      { id: "legalProceedings", questionNumber: 36, text: "Are there any pending lawsuits, judgments, or liens on the property?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "easements", questionNumber: 37, text: "Are there any easements, rights-of-way, or encroachments?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "insuranceClaims", questionNumber: 38, text: "Have any insurance claims been filed on the property in the last 4 years?", type: "yes_no_unknown", followUp: "If yes, describe." },
      { id: "smokeDetectors", questionNumber: 39, text: "Are smoke detectors installed and in working condition?", type: "yes_no_unknown" },
      { id: "carbonMonoxide", questionNumber: 40, text: "Are carbon monoxide detectors installed if required by local ordinance?", type: "yes_no_unknown" },
      { id: "otherDefects", questionNumber: 41, text: "Are you aware of any other material defects or conditions not previously disclosed?", type: "yes_no_unknown", followUp: "If yes, describe." },
    ],
  },
];

export function generateTXSummaryText(answers: DisclosureAnswers, propertyAddress?: string): string {
  const lines: string[] = [];
  lines.push("TEXAS SELLER'S DISCLOSURE NOTICE");
  lines.push("=".repeat(55));
  if (propertyAddress) lines.push(`Property Address: ${propertyAddress}`);
  lines.push("");
  for (const section of TX_PCDS_SECTIONS) {
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
