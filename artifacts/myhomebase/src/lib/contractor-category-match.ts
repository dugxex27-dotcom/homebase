type ContractorServiceProfile = {
  services: string[];
};

const TRADE_KEYWORDS: Array<{ category: string; keywords: string[] }> = [
  { category: "HVAC", keywords: ["hvac", "furnace", "air conditioner", "air conditioning", "a/c", "heat pump", "heating system", "cooling system", "boiler"] },
  { category: "Plumbing", keywords: ["plumb", "water heater", "pipe", "faucet", "toilet", "drain", "sump pump", "septic"] },
  { category: "Roofing", keywords: ["roof", "shingle", "flashing"] },
  { category: "Gutters", keywords: ["gutter", "downspout"] },
  { category: "Electrical", keywords: ["electric", "outlet", "wiring", "breaker", "panel", "smoke detector", "carbon monoxide"] },
  { category: "Chimney", keywords: ["chimney", "fireplace", "flue"] },
  { category: "Landscaping", keywords: ["landscap", "lawn", "tree", "sprinkler", "irrigation", "yard"] },
  { category: "Pest Control", keywords: ["pest", "termite", "rodent", "insect"] },
  { category: "Pool", keywords: ["pool", "spa", "hot tub"] },
  { category: "Appliance Repair", keywords: ["appliance", "refrigerator", "dishwasher", "washer", "dryer", "oven", "range"] },
  { category: "Windows & Doors", keywords: ["window", "door", "weatherstrip"] },
  { category: "Foundation", keywords: ["foundation", "crawl space", "basement"] },
];

const CATEGORY_ALIASES: Record<string, string[]> = {
  hvac: ["hvac", "heating", "cooling", "air conditioning", "furnace", "heat pump", "boiler"],
  plumbing: ["plumb", "water heater", "pipe", "drain", "septic", "sump pump"],
  roofing: ["roof", "shingle", "flashing"],
  gutters: ["gutter", "downspout"],
  electrical: ["electric", "wiring", "outlet", "breaker"],
  chimney: ["chimney", "fireplace", "flue"],
  landscaping: ["landscap", "lawn", "tree", "irrigation", "sprinkler"],
  "pest control": ["pest", "termite", "rodent", "extermin"],
  pool: ["pool", "spa", "hot tub"],
  "appliance repair": ["appliance", "refrigerator", "dishwasher", "washer", "dryer", "oven"],
  "windows & doors": ["window", "door", "weatherstrip"],
  foundation: ["foundation", "crawl space", "basement"],
};

export function inferTaskTradeCategory(taskTitle: string, fallbackCategory: string): string {
  const normalizedTitle = taskTitle.trim().toLowerCase();
  const match = TRADE_KEYWORDS.find(({ keywords }) =>
    keywords.some((keyword) => normalizedTitle.includes(keyword))
  );

  return match?.category ?? fallbackCategory;
}

export function contractorMatchesTaskCategory(
  contractor: ContractorServiceProfile,
  taskCategory: string,
): boolean {
  const normalizedCategory = taskCategory.trim().toLowerCase();
  if (!normalizedCategory) return false;

  const categoryTerms = CATEGORY_ALIASES[normalizedCategory] ?? [normalizedCategory];
  return contractor.services.some((service) => {
    const normalizedService = service.trim().toLowerCase();
    if (!normalizedService) return false;
    return categoryTerms.some((term) =>
      normalizedService.includes(term) || term.includes(normalizedService)
    );
  });
}
