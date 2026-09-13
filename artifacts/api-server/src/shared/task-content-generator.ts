/**
 * Content used by the maintenance catalog.
 *
 * Keep this registry deliberately data-driven.  The catalog contains several
 * thousand title/description combinations and a title-only switch statement
 * tends to produce either duplicated titles or unsafe, generic instructions.
 * A family owns the language, tools, time, and difficulty for the work it
 * understands; catalog-authored values are applied by the caller first.
 */

import { getCostEstimate, type CostEstimate } from './cost-baselines';

export type GeneratedDifficulty = 'easy' | 'moderate' | 'difficult';
export type CostApplicability = 'costable' | 'monitoring_only';

export interface GeneratedTaskContent {
  actionSummary: string;
  steps: string[];
  toolsAndSupplies: string[];
  estimatedTime: string;
  difficulty: GeneratedDifficulty;
  intentFamily: string;
  fallbackUsed: boolean;
  monitoringOnly: boolean;
  costApplicability: CostApplicability;
  /** Omitted for observation-only work, which has no meaningful job estimate. */
  costEstimate?: CostEstimate;
}

export interface IntentFamily {
  id?: string;
  name: string;
  matches: (text: string, title: string) => boolean;
  category: string;
  estimatedTime: string;
  difficulty: GeneratedDifficulty;
  actionSummary: (title: string, description: string) => string;
  steps: (title: string, description: string) => string[];
  tools: string[];
}

const textOf = (title: string, description: string) => `${title} ${description}`.toLowerCase();

function hasAny(text: string, words: string[]): boolean {
  return words.some(word => text.includes(word));
}

function targetFromTitle(title: string): string {
  return title
    .replace(/^(continue|begin|check|inspect|test|clean|monitor|replace|service|maintain|prepare|complete|clear|flush|schedule|review|ensure|verify)\s+/i, '')
    .replace(/\s+(before|after|for|during|if|when)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.!?]+$/, '')
    .toLowerCase() || 'this home system';
}

function descriptionSentences(description: string): string[] {
  return description
    .split(/(?:\r?\n|[.!?])+/)
    .map(sentence => sentence.replace(/^\s*(?:[-*]|\d+[.)])\s*/, '').trim())
    .filter(sentence => sentence.length >= 24)
    .slice(0, 5)
    .map(sentence => sentence.charAt(0).toUpperCase() + sentence.slice(1).replace(/[.;:,]+$/, '') + '.');
}

function numberedDescriptionSteps(description: string): string[] {
  const steps = description
    .split(/(?:\r?\n|(?=\d+[.)]\s))/)
    .map(value => value.replace(/^\s*\d+[.)]\s*/, '').trim())
    .filter(value => value.length >= 18);
  return steps.length >= 3 ? steps.slice(0, 6) : [];
}

function summaryFor(action: string, object: string, outcome: string): string {
  return `${action} ${object} so ${outcome}.`;
}

function familyId(family: IntentFamily): string {
  return family.id ?? family.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const RAW_INTENT_FAMILIES: IntentFamily[] = [
  {
    name: 'wildfire and evacuation',
    matches: (text) => hasAny(text, ['wildfire', 'defensible space', 'evacuation', 'evacuation route', 'go-bag', 'go bag', 'fire danger', 'red flag']),
    category: 'fire_safety',
    estimatedTime: '30–90 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /monitor|vigilance|watch|alert/i.test(title)
      ? 'Review current fire conditions and confirm that your household can leave quickly if an alert is issued.'
      : 'Reduce fire exposure around the home and make the household evacuation plan usable before conditions worsen.',
    steps: (title) => /monitor|vigilance|watch|alert/i.test(title)
      ? [
          'Check the current local fire-danger level, red-flag notices, and evacuation zones using your county or state emergency service',
          'Walk the home perimeter from a safe route and note new dry vegetation, debris, blocked access, or clearance concerns',
          'Confirm every household member knows two evacuation routes, the meeting point, and where the go-bag, keys, and vehicle are kept',
          'Record the check and set the next review for the local fire agency’s stated interval or after a major weather change',
        ]
      : [
          'Check the current local fire-danger level, red-flag notices, and evacuation zones using your county or state emergency service',
          'Walk the home perimeter and remove dry leaves, needles, dead plants, and combustible items from the immediate clearance area',
          'Confirm every household member knows two evacuation routes, the meeting point, and where the go-bag, keys, and vehicle are kept',
          'Photograph the completed clearance and note any trees, brush, or structures that need qualified help',
        ],
    tools: ['Phone with local emergency-alert app or radio', 'Work gloves', 'Leaf rake and yard-waste bags', 'N95 masks for smoke conditions'],
  },
  {
    name: 'air quality and filtration',
    matches: (text) => hasAny(text, ['aqi', 'air quality', 'air purifier', 'air filtration', 'hepa', 'wildfire smoke', 'smoke filtration', 'dust and sand filtration', 'dust and sand', 'smoke management']),
    category: 'ventilation',
    estimatedTime: '10–20 minutes',
    difficulty: 'easy',
    actionSummary: () => 'Check outdoor air conditions and verify that the home can filter indoor air when smoke or pollution rises.',
    steps: (title) => /^monitor\b/i.test(title)
      ? [
          'Look up the current AQI and any smoke or health advisory from AirNow or your local air-quality agency',
          'Check that the purifier or HVAC filter is seated correctly, the airflow indicator is normal, and the intake and exhaust are unobstructed',
          'Run HEPA filtration and close windows during unhealthy conditions, then record the filter-change date or alert threshold',
          'Note the next filter inspection date without replacing a filter unless its indicator or condition calls for it',
        ]
      : [
          'Look up the current AQI and any smoke or health advisory from AirNow or your local air-quality agency',
          'Check that the purifier or HVAC filter is seated correctly, the airflow indicator is normal, and the intake and exhaust are unobstructed',
          'Run HEPA filtration and close windows during unhealthy conditions, then record the filter-change date or alert threshold',
          'Replace a loaded filter with the exact model or size specified by the equipment manufacturer',
        ],
    tools: ['Phone with AirNow or local AQI app', 'Manufacturer-specified HEPA or HVAC filter (only if replacement is due)', 'Clean microfiber cloth'],
  },
  {
    name: 'severe weather and temperature readiness',
    matches: (text) => hasAny(text, [
      'severe weather', 'tornado', 'winter storm', 'blizzard', 'extreme heat',
      'heat wave', 'heatwave', 'peak heat', 'severe summer', 'severe winter', 'extreme winter',
      'hurricane preparation', 'storm readiness',
      'storm preparedness', 'monsoon', 'dry to wet', 'fire to flood', 'weather emergency', 'weather alert',
      'dry wind conditions', 'wind and storm damage', 'storm shelter', 'safe room', 'storm shutter',
    ]),
    category: 'safety',
    estimatedTime: '30–90 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /monitor|vigilance|watch|alert/i.test(title)
      ? 'Check the current weather threat and keep the household ready to shelter or leave safely if conditions change.'
      : 'Secure the home, verify emergency provisions, and make a weather-specific plan before the next dangerous event.',
    steps: (title) => /monitor|vigilance|watch|alert/i.test(title)
      ? [
          'Check official National Weather Service alerts and identify the shelter or evacuation instruction for the current threat',
          'Walk the exterior from a safe position and note loose objects, blocked drains, exposed pipes, or heat-sensitive areas',
          'Confirm phones, weather radio, flashlights, medications, and household contacts are ready if power or travel is disrupted',
          'Record the next check time and move indoors or follow local emergency instructions when an alert escalates',
        ]
      : [
          'Read the local emergency guidance and identify the safest interior shelter or evacuation route for this hazard',
          'Secure or store loose outdoor items, check roof drainage and shutters, and keep vehicles and access routes clear',
          'Test flashlights, weather radio, detectors, and backup power without operating fuel equipment indoors',
          'Check on vulnerable household members and pets, then follow official instructions instead of attempting unsafe outdoor work',
        ],
    tools: ['Weather radio or phone alerts', 'Flashlight and spare batteries', 'Work gloves', 'Straps or tie-downs for outdoor items', 'Emergency drinking water'],
  },
  {
    name: 'emergency supplies and communications',
    matches: (text) => hasAny(text, [
      'emergency supplies', 'emergency kit', 'emergency preparedness', 'emergency plan',
      'communication plan', 'communications', 'power outage', 'blackout', 'shelter in place',
      'shelter-in-place', 'household isolation', 'isolation preparedness', 'backup supplies',
      'emergency backup', 'emergency systems', 'isolation conditions',
    ]),
    category: 'safety',
    estimatedTime: '30–60 minutes',
    difficulty: 'easy',
    actionSummary: () => 'Make the household emergency kit and contact plan usable when travel, power, or communications are interrupted.',
    steps: () => [
      'Inventory water, shelf-stable food, medications, first aid, sanitation items, masks, and supplies for each household member',
      'Test flashlights, battery banks, weather radio, and backup chargers; replace expired batteries without using damaged cells',
      'Write down out-of-area contacts, meeting locations, medical needs, utility shutoffs, and an accessible backup communication method',
      'Store the kit where it can be reached quickly and calendar a review before the next severe-weather or wildfire season',
    ],
    tools: ['Household emergency checklist', 'Phone and paper contact list', 'Flashlights and spare batteries', 'Battery bank or hand-crank radio', 'Water containers and first-aid kit'],
  },
  {
    name: 'home security and access',
    matches: (text) => hasAny(text, ['home security', 'security system', 'burglar alarm', 'alarm system', 'security codes', 'door lock codes']),
    category: 'safety',
    estimatedTime: '20–45 minutes',
    difficulty: 'easy',
    actionSummary: () => 'Verify the security system, sensors, and access codes work without weakening privacy or emergency access.',
    steps: () => [
      'Place the system in its approved test mode and check the panel, door/window sensors, motion sensors, and audible or monitored alert',
      'Update user codes through the manufacturer’s secure interface, avoiding shared or easily guessed codes and recording changes privately',
      'Check battery, cellular, Wi-Fi, and backup-power warnings without opening energized equipment or bypassing a sensor',
      'Restore normal monitoring, notify the monitoring provider when required, and call the installer for persistent faults or tampering',
    ],
    tools: ['System owner manual or app', 'Phone for private code management', 'Fresh system battery when indicated', 'Notepad stored securely'],
  },
  {
    name: 'septic and sewer service',
    matches: (text) => hasAny(text, ['septic', 'sewer system', 'septic tank', 'drain field', 'sewage treatment']),
    category: 'septic',
    estimatedTime: '30–60 minutes',
    difficulty: 'difficult',
    actionSummary: () => 'Arrange and document professional septic or sewer service before sludge, drainage, or tank defects become a backup.',
    steps: () => [
      'Locate the tank, access lids, cleanouts, drain field, and service records without opening a lid or entering a tank',
      'Note slow drains, odors, wet or unusually green drain-field areas, sewage surfacing, and the date of the last inspection or pumping',
      'Keep vehicles, structures, chemicals, and deep-rooted plants off the tank and drain field while waiting for service',
      'Schedule a licensed septic professional to inspect and pump the system on the applicable interval or immediately for sewage backup',
    ],
    tools: ['Property or septic record', 'Flashlight', 'Phone or notepad for service records', 'Work gloves for surface-only inspection'],
  },
  {
    name: 'backup generator and power',
    matches: (text) => hasAny(text, ['backup generator', 'emergency generator', 'standby generator', 'portable generator', 'generator', 'backup power']),
    category: 'electrical',
    estimatedTime: '30–60 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /portable/i.test(title)
      ? 'Exercise the portable generator safely outdoors and verify fuel, ventilation, cords, and load limits before an outage.'
      : /standby|whole[- ]home|permanent|fixed|automatic transfer/i.test(title)
        ? 'Review the permanently installed standby generator’s automatic exercise, clearances, and service status without altering its installation.'
        : 'Review the generator manual and service requirements for the installed equipment without guessing at placement or transfer wiring.',
    steps: (title) => /portable/i.test(title)
      ? [
          'Inspect oil, fuel, battery, cords, exhaust, guards, and weather protection using the portable-generator manual',
          'Run the unit outdoors at least 20 feet from the home with exhaust pointed away from doors, windows, and vents',
          'Apply only the manufacturer-approved load and use outdoor-rated cords or a listed transfer method without backfeeding',
          'Shut it down, store fuel safely, and call a qualified generator technician for wiring, carbon-monoxide, or fault issues',
        ]
      : /standby|whole[- ]home|permanent|fixed|automatic transfer/i.test(title)
        ? [
            'Use the standby generator manual to review the automatic exercise schedule, controller status, fuel supply, exhaust path, and fault indicators',
            'From the ground, confirm required clearances and intake or exhaust openings remain unobstructed; do not relocate, open, or modify the installation',
            'Confirm the transfer equipment and essential circuits are covered by the service plan, without opening energized panels or changing wiring',
            'Arrange the manufacturer-authorized or licensed generator technician for failed exercise, fuel, exhaust, transfer, or placement concerns',
          ]
        : [
            'Identify whether the equipment is portable or permanently installed and follow its model-specific manual before operating it',
            'Inspect only owner-accessible oil, fuel, battery, exhaust, guards, connections, and fault indicators without changing the installation',
            'Use the manufacturer’s approved exercise or load procedure and never improvise transfer wiring, fuel storage, or exhaust clearance',
            'Stop for a fault, fuel or exhaust concern and call a qualified generator technician or electrician for placement, transfer, or service work',
          ],
    tools: ['Generator manual', 'Correct oil and fuel or approved battery charger', 'Outdoor-rated cord and load tester when specified', 'Carbon-monoxide alarm', 'Work gloves'],
  },
  {
    name: 'attic ventilation',
    matches: (text) => hasAny(text, ['attic ventilation', 'attic vent', 'soffit vent', 'ridge vent', 'gable vent', 'attic fan', 'bathroom exhaust fan', 'exhaust fan']),
    category: 'ventilation',
    estimatedTime: '30–60 minutes',
    difficulty: 'moderate',
    actionSummary: () => 'Check attic airflow and moisture paths so insulation stays dry and the roof assembly can release heat safely.',
    steps: () => [
      'From a safe access point, inspect soffit, ridge, gable, and fan openings for insulation blockage, nests, moisture, or damage',
      'Look for condensation, mold, frost, or wet insulation and compare airflow at opposite intake and exhaust points',
      'Keep insulation below baffles and never cover a required vent; clean only accessible grilles with power isolated',
      'Refer inadequate ventilation, roof penetrations, wiring, or persistent moisture to an insulation, roofing, or electrical professional',
    ],
    tools: ['Flashlight or headlamp', 'Dust mask and eye protection', 'Moisture meter when available', 'Vacuum with soft brush', 'Manufacturer manual for an attic fan'],
  },
  {
    name: 'water conservation and drought',
    matches: (text) => hasAny(text, ['water conservation', 'water-saving', 'water saving', 'drought', 'water usage', 'water use reduction', 'xeriscape']),
    category: 'water_systems',
    estimatedTime: '30–90 minutes',
    difficulty: 'easy',
    actionSummary: () => 'Find avoidable water use and adjust irrigation or fixtures to protect supply during dry conditions without harming the landscape.',
    steps: () => [
      'Read the water meter before and after a no-use period and inspect fixtures, irrigation valves, and exposed lines for unexplained flow',
      'Adjust irrigation to local restrictions, weather, soil, and plant needs while avoiding runoff, overspray, and watering during peak evaporation',
      'Repair accessible drips, install approved aerators or efficient controls, and preserve required backflow protection',
      'Record the change and use a licensed plumber or irrigation professional for hidden leaks, backflow devices, or major landscape redesign',
    ],
    tools: ['Water meter or utility app', 'Screwdriver and adjustable wrench', 'Irrigation controller manual', 'Leak-detection dye or flags', 'Replacement aerator or emitter when compatible'],
  },
  {
    name: 'HVAC, heating, and filters',
    matches: (text) => !text.includes('water heater') && hasAny(text, [
      'hvac', 'furnace', 'heating system', 'heating', 'heater', 'heat pump',
      'cooling system', 'cooling equipment', 'air conditioning', 'air conditioner',
      'cooling season', 'pool heating', 'pool cooling', 'energy usage', 'energy efficiency',
      'system efficiency', 'cooling capacity', 'cooling efficiency',
      'peak summer', 'summer maintenance', 'peak winter', 'winter maintenance',
      'thermostat', 'boiler', 'baseboard heat', 'radiator', 'furnace filter',
      'hvac filter', 'air filter',
    ]),
    category: 'hvac',
    estimatedTime: '30–60 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /shut[- ]?off|emergency shut/i.test(title)
      ? 'Verify the owner-accessible HVAC emergency shutoff is labeled and operates without opening energized equipment.'
      : /capacity|efficiency|performance|energy usage/i.test(title)
        ? 'Record HVAC operating conditions and airflow so declining capacity or efficiency can be addressed before a system failure.'
        : /filter/i.test(title)
          ? 'Check the filter and restore clear airflow so the HVAC equipment can operate efficiently.'
          : /professional|service|tune|inspection/i.test(title)
            ? 'Arrange a qualified HVAC safety and performance check before the system is needed continuously.'
            : 'Run the heating or cooling system briefly and verify safe operation, airflow, and thermostat response before the season.',
    steps: (title) => /shut[- ]?off|emergency shut/i.test(title)
      ? [
          'Locate the labeled service or emergency shutoff switch and confirm it is accessible without removing equipment covers',
          'With the system operating only as the manual permits, use the switch to stop the equipment and verify that it shuts down',
          'Restore power or operation only after confirming the switch resets normally and no fan, burner, compressor, odor, or electrical fault remains',
          'Label an unclear switch and call qualified HVAC or electrical service for wiring, combustion, refrigerant, or repeated-shutdown concerns',
        ]
      : /capacity|efficiency|performance|energy usage/i.test(title)
        ? [
            'Record thermostat setting, indoor and outdoor temperature, run time, supply and return temperature when the manual permits, and any short-cycling',
            'Check all accessible registers, returns, filter condition, condensate path, and outdoor unit clearance without opening sealed panels',
            'Compare the observations with the manufacturer’s expected operation or a prior baseline, and note rooms with weak airflow or comfort changes',
            'Schedule licensed HVAC service for reduced capacity, refrigerant or combustion concerns, electrical faults, or worsening efficiency instead of adjusting sealed components',
          ]
        : /filter/i.test(title)
      ? [
          'Turn the HVAC system off and locate the filter access panel',
          'Remove the filter, confirm its size and airflow arrow, and compare its surface with a light source',
          'Install a correctly sized replacement with the arrow pointing toward the equipment',
          'Record the installation date and set a reminder to inspect it again according to system use and manufacturer guidance',
        ]
      : [
          'Inspect the thermostat setting, equipment area, electrical disconnect, and visible condensate or refrigerant lines without opening sealed panels',
          'Run the system for 10–15 minutes and verify air comes from every open register at a consistent temperature',
          'Listen for new banging, scraping, short-cycling, burning smells, or unusual vibration and turn the system off if a safety concern appears',
          'Schedule licensed service for combustion, refrigerant, electrical, or performance problems rather than attempting an unsafe repair',
        ],
    tools: ['Flashlight or headlamp', 'Manufacturer-specified replacement filter when due', 'Phone or notepad for readings and symptoms', 'Screwdriver only for an owner-accessible filter panel'],
  },
  {
    name: 'fall and winter preparation',
    matches: (text) => hasAny(text, ['fall preparation', 'winter preparation', 'winterize', 'winter readiness', 'before winter', 'cold weather preparation', 'winter storm preparation', 'prepare for cold']),
    category: 'general_maintenance',
    estimatedTime: '2–4 hours',
    difficulty: 'moderate',
    actionSummary: () => 'Work through the seasonal shutdown and readiness checks that protect the home before freezing weather arrives.',
    steps: () => [
      'Walk the exterior and list exposed water lines, roof drainage, drafts, loose outdoor items, and fuel or emergency-supply gaps',
      'Test the heating system and safety detectors, replace a dirty filter, and schedule qualified service for any fault',
      'Disconnect and drain outdoor hoses, close or insulate vulnerable water supplies, and store or secure furniture and equipment',
      'Check the emergency kit, flashlights, batteries, ice-melt, and household contact plan before the first storm',
    ],
    tools: ['Flashlight', 'Work gloves', 'Pipe insulation and hose bib covers when applicable', 'Replacement HVAC filter', 'Batteries and weather-appropriate emergency supplies'],
  },
  {
    name: 'seasonal weather observation',
    matches: (text) => !hasAny(text, [
      'gutter', 'downspout', 'deck', 'patio', 'storm shelter', 'safe room', 'storm shutter',
      'cooling system', 'heating system', 'energy', 'outdoor living', 'pool', 'spa',
      'roof', 'window', 'fence', 'driveway', 'sump', 'storm drain', 'well water',
      'water heater', 'generator', 'septic', 'fireplace', 'garage', 'appliance',
      'irrigation', 'sprinkler', 'foundation', 'attic', 'drainage',
    ]) && hasAny(text, [
      'mild winter', 'pleasant weather', 'optimal weather', 'weather transition',
      'transition from', 'season transition', 'season change', 'weather change', 'spring weather',
      'fall transition', 'cooler season', 'cooler weather', 'first freeze', 'peak wet season',
      'season continues', 'seasonal conditions', 'weather pattern', 'weather monitoring',
      'storm damage', 'storm season', 'rapid temperature', 'early frost', 'ice and snow',
      'seasonal weather', 'mild fall', 'spring transition', 'spring maintenance', 'fall cleanup',
      'increasing uv', 'increasing daylight', 'increasing rainfall', 'cool weather conditions',
      'extreme cold', 'winter damage', 'summer damage', 'weather effects', 'heat stress',
      'heat-related expansion', 'heat and uv', 'uv and heat', 'outdoor uv', 'wind and dust',
      'dust and debris', 'santa ana wind', 'flash flood', 'mudslide', 'lightning',
      'energy usage', 'energy efficiency', 'outdoor living', 'fire season damage',
      'fire and flood', 'spring preparation', 'mild warming', 'warm, dry', 'transition to wet',
      'early fall rains', 'late summer storms', 'extreme weather', 'smoke management',
      'storm shutters', 'storm shelter',
    ]),
    category: 'general_maintenance',
    estimatedTime: '10–20 minutes',
    difficulty: 'easy',
    actionSummary: (title) => /prepare|secure|winterize|protect/i.test(title)
      ? 'Review the approaching seasonal change and complete only the weather-specific safeguards that apply to this home.'
      : 'Watch local conditions and record the next seasonal check without inventing repair work that the weather does not require.',
    steps: () => [
      'Check the local forecast and official weather or emergency guidance for the next meaningful temperature, wind, rain, or snow change',
      'Walk only safe, accessible areas and note exposed water lines, drainage, loose items, drafts, or heat and moisture concerns',
      'Set a calendar reminder for the next condition-based check and keep emergency contacts or supplies reachable',
      'Escalate an observed leak, unsafe structure, utility fault, or active hazard rather than attempting a weather-exposed repair',
    ],
    tools: ['Phone with local forecast and alerts', 'Flashlight', 'Phone or notepad for observations'],
  },
  {
    name: 'interior cleaning and dust control',
    matches: (text) => hasAny(text, ['deep clean interior', 'deep cleaning', 'spring cleaning', 'interior cleaning', 'baseboard', 'carpet cleaning', 'dust control', 'dust and allergen']),
    category: 'cleaning',
    estimatedTime: '1–3 hours',
    difficulty: 'easy',
    actionSummary: () => 'Clean the interior surfaces and dust traps that collect seasonal debris while protecting finishes and indoor air quality.',
    steps: () => [
      'Work from high surfaces down, opening ventilation when outdoor air is suitable and keeping cleaners away from children and pets',
      'Vacuum vents, baseboards, upholstery edges, and the spaces behind accessible appliances with the correct attachment',
      'Clean each material with a compatible product on a small hidden area first and keep moisture away from electrical components',
      'Replace or launder filters and cloths as needed, then note damage or persistent odors that need specialized service',
    ],
    tools: ['Vacuum with brush and crevice attachments', 'Microfiber cloths', 'Material-safe cleaner', 'Bucket and gloves', 'Replacement filter when specified'],
  },
  {
    name: 'bathroom grout and sealant',
    matches: (text) => hasAny(text, ['bathroom grout', 'tile grout', 'shower grout', 'grout repair', 'inspect grout', 'grout and caulking', 'shower caulking', 'bathroom caulking', 'shower caulk', 'tub caulk', 'bathroom caulk', 'bathroom sealant', 'shower sealant', 'recaulk shower']),
    category: 'cleaning',
    estimatedTime: '2–4 hours',
    difficulty: 'moderate',
    actionSummary: () => 'Inspect bathroom grout and sealant, remove failed material safely, and restore a compatible water-resistant joint.',
    steps: () => [
      'Inspect grout joints, corners, tub or shower transitions, and penetrations for cracks, gaps, staining, loose material, or movement',
      'Remove only failed grout or caulk with a hand tool, protect the waterproofing layer, and clean and dry the joint before repair',
      'Treat surface mold with ventilation and a compatible cleaner without mixing chemicals, then follow the product instructions for rinsing and drying',
      'Apply the tile- and wet-area-compatible grout or 100% silicone sealant to the prepared joint, tool it neatly, and observe the full curing time before wet use',
    ],
    tools: ['Grout saw or plastic scraper', 'Utility knife for old caulk', 'Mildew-resistant bathroom cleaner', 'Tile grout or 100% silicone sealant matched to the joint', 'Caulk tool, gloves, eye protection, and painter’s tape'],
  },
  {
    name: 'pests, radon, mold, and moisture',
    matches: (text) => hasAny(text, [
      'pest', 'termite', 'rodent', 'mice', 'mouse droppings', 'radon', 'mold',
      'mould', 'moisture', 'humidity', 'dehumidifier', 'damp', 'condensation',
      'musty', 'crawlspace moisture',
    ]),
    category: 'pest_control',
    estimatedTime: '30–90 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /radon/i.test(title)
      ? 'Test the lowest occupied level for radon and use a qualified mitigation professional when results exceed the applicable action level.'
      : /humidity|dehumidifier|moisture|mold|mould|damp/i.test(title)
        ? 'Find the source of moisture, measure indoor conditions, and reduce dampness before mold or material damage spreads.'
        : 'Look for pest entry points and evidence, then remove attractants and arrange targeted treatment rather than spreading unsafe chemicals.',
    steps: (title) => /radon/i.test(title)
      ? [
          'Place a certified short- or long-term radon test in the lowest regularly occupied level away from drafts, heat, and direct sunlight',
          'Keep exterior doors and windows closed as directed and avoid moving the test during the measurement period',
          'Record the start and end dates, return the kit through its approved laboratory, and keep the result with home records',
          'Use a qualified radon professional for elevated results; do not improvise a fan or seal system without a diagnostic plan',
        ]
      : /humidity|dehumidifier|moisture|mold|mould|damp/i.test(title)
        ? [
            'Use a hygrometer and flashlight to locate condensation, leaks, wet materials, blocked ventilation, or standing water',
            'Stop the water source when safe, ventilate the area, and empty or clean the dehumidifier according to its manual',
            'Dry small nonporous areas promptly while avoiding fans that spread suspected mold or entering contaminated spaces without protection',
            'Refer recurring moisture, visible extensive mold, sewage contamination, or hidden dampness to a qualified remediation or building professional',
          ]
        : [
            'Inspect the foundation, attic, utility penetrations, and stored food for droppings, damage, nests, or gaps larger than the pest can enter',
            'Remove food, standing water, and clutter that provide shelter, while keeping children and pets away from contaminated material',
            'Seal small entry gaps with compatible material and follow the product label for any trap or treatment used',
            'Use a licensed pest professional for termites, stinging insects, recurring rodents, or suspected contamination',
          ],
    tools: ['Flashlight', 'Hygrometer when humidity is involved', 'Certified radon test kit when applicable', 'Nitrile gloves and mask for minor cleanup', 'Caulk or copper mesh for small pest gaps'],
  },
  {
    name: 'garage door, fans, lighting, and fireplace',
    matches: (text) => hasAny(text, [
      'garage door', 'garage opener', 'ceiling fan', 'outdoor lighting', 'exterior lighting',
      'security light', 'holiday decoration', 'holiday lights', 'fireplace', 'chimney',
      'grill', 'outdoor cooking',
      'wood stove', 'fire box', 'firebox',
    ]),
    category: 'electrical',
    estimatedTime: '20–60 minutes',
    difficulty: 'easy',
    actionSummary: (title) => /garage door|garage opener/i.test(title)
      ? 'Test the garage door safety reversal and inspect moving hardware without bypassing the opener’s protective sensors.'
      : /fireplace|chimney|wood stove|firebox/i.test(title)
        ? 'Check the fireplace or chimney for safe operation and arrange a qualified sweep before burning when deposits or damage are present.'
        : 'Check the fixture or seasonal installation for secure mounting, safe wiring, and reliable operation before using it.',
    steps: (title) => /garage door|garage opener/i.test(title)
      ? [
          'Watch the door through a full open-and-close cycle and keep people, pets, and objects clear of its travel path',
          'Test photo-eye sensors and the auto-reverse feature with the manufacturer’s approved method; never defeat or relocate sensors',
          'Inspect hinges, rollers, springs, cables, and mounting points from a safe distance for wear or unusual tension',
          'Disconnect use and call a garage-door technician for broken springs, frayed cables, a falling door, or failed reversal',
        ]
      : /fireplace|chimney|wood stove|firebox/i.test(title)
        ? [
            'Confirm the damper, hearth, screen, and visible firebox are cool before checking for cracks, loose masonry, or blockage',
            'Look for creosote, bird nests, water entry, or damaged flue components without climbing onto the roof or opening sealed liners',
            'Remove only cool loose ash into a metal container with a lid and keep it outdoors away from combustible materials',
            'Do not burn until a qualified chimney professional inspects or sweeps a blocked, damaged, or heavily used flue',
          ]
        : [
            'Turn off power before cleaning a fixture and inspect cords, plugs, boxes, mounts, and weather seals for damage or moisture',
            'Secure decorations and fan blades without overloading outlets, extension cords, hooks, or electrical circuits',
            'Restore power and test the fixture, fan direction, switch, timer, and sensor from a safe standing position',
            'Stop using equipment with heat, arcing, loose mounting, or exposed conductors and call an electrician for concealed wiring',
          ],
    tools: ['Flashlight', 'Non-contact voltage tester for appropriate electrical work', 'Step ladder on a level surface', 'Soft brush and cloth', 'Manufacturer manual and replacement bulb when required'],
  },
  {
    name: 'fences, driveways, and walkways',
    matches: (text) => hasAny(text, [
      'fence', 'fencing', 'driveway', 'walkway', 'sidewalk', 'paver',
      'retaining wall', 'hardscape', 'parking area',
    ]),
    category: 'exterior',
    estimatedTime: '30–90 minutes',
    difficulty: 'moderate',
    actionSummary: () => 'Inspect outdoor walking and boundary surfaces for movement, trip hazards, drainage problems, and damage before they worsen.',
    steps: () => [
      'Walk the full surface or fence line and mark cracks, uplift, leaning posts, loose boards, missing fasteners, and pooling water',
      'Check gates, handrails, steps, and transitions for secure movement while keeping people away from unstable sections',
      'Clear leaves and soil from drainage paths, then fill only small compatible cracks or tighten owner-serviceable fasteners',
      'Refer structural movement, large cracks, retaining-wall lean, utility conflicts, or tree-root damage to a qualified contractor',
    ],
    tools: ['Flashlight', 'Work gloves and safety glasses', 'Tape measure and level', 'Broom or stiff brush', 'Compatible crack filler or replacement fasteners'],
  },
  {
    name: 'outdoor and snow equipment',
    matches: (text) => hasAny(text, [
      'snow removal', 'snow removal equipment', 'snow blower', 'snowblower', 'snow shovel',
      'ice melt', 'winter equipment', 'outdoor equipment', 'outdoor furniture',
      'furniture and equipment', 'store outdoor', 'yard equipment', 'leaf blower',
    ]),
    category: 'lawn',
    estimatedTime: '30–75 minutes',
    difficulty: 'moderate',
    actionSummary: () => 'Prepare outdoor equipment for safe operation and keep snow or ice work away from people, vehicles, and building openings.',
    steps: () => [
      'Inspect the machine, guards, handles, tires, belts, chute, cords, fuel lines, and safety controls before starting it',
      'Use the manufacturer’s fuel, oil, battery, and storage guidance; never mix fuels or service a running machine',
      'Test the equipment briefly in an open area, keeping hands, feet, pets, and bystanders away from moving parts and discharge',
      'Store fuel, batteries, tools, and ice-melt securely, and arrange repair when a control, guard, or cable is damaged',
    ],
    tools: ['Manufacturer manual', 'Work gloves and eye protection', 'Correct fuel or battery charger', 'Snow shovel or approved ice-melt', 'Brush and rags'],
  },
  {
    name: 'earthquake, altitude, and avalanche readiness',
    matches: (text) => hasAny(text, [
      'earthquake', 'seismic', 'earthquake kit', 'altitude', 'high elevation',
      'avalanche', 'avalanche danger', 'mountain emergency',
    ]),
    category: 'safety',
    estimatedTime: '30–90 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /monitor|watch|vigilance|alert/i.test(title)
      ? 'Check official seismic or mountain-hazard information and keep the household ready for a rapid shelter or evacuation decision.'
      : 'Reduce preventable earthquake and mountain-weather risks by securing the home and refreshing emergency plans and supplies.',
    steps: (title) => /monitor|watch|vigilance|alert/i.test(title)
      ? [
          'Check the official local earthquake, avalanche, weather, and road-condition alerts for the property and planned travel',
          'Confirm emergency contacts, meeting places, shutoff tools, traction gear, and medication supplies remain accessible',
          'Inspect the route to shelter or evacuation for blocked exits, snow load, falling-object hazards, and unsafe conditions',
          'Follow official evacuation or travel guidance and do not enter avalanche terrain or damaged structures without qualified direction',
        ]
      : [
          'Secure tall furniture, shelves, televisions, and breakable heavy items; keep exits and utility shutoffs accessible',
          'Check that the water heater, gas shutoff tool, fire extinguisher, first-aid kit, water, and communications supplies are ready',
          'Review drop-cover-hold, post-earthquake shutoff, and household meeting procedures with everyone who lives in the home',
          'Use avalanche forecasts and trained local guidance for mountain travel; never treat a familiar route as proof of safety',
        ],
    tools: ['Anchors and straps rated for the item', 'Utility shutoff tool', 'Flashlight and radio', 'First-aid and water supplies', 'Local hazard-alert app or beacon when applicable'],
  },
  {
    name: 'fire extinguishers and fire safety',
    matches: (text) => hasAny(text, ['fire extinguisher', 'fire extinguishers', 'fire safety equipment', 'fire escape plan', 'fire drill', 'fire suppression', 'fire-safe practices', 'holiday safety']),
    category: 'fire_safety',
    estimatedTime: '15–30 minutes',
    difficulty: 'easy',
    actionSummary: () => 'Verify fire-safety equipment is charged, accessible, and understood before an emergency occurs.',
    steps: () => [
      'Check each extinguisher’s pressure gauge, pin, seal, hose, body, and inspection or expiration marking without discharging it',
      'Confirm the extinguisher is mounted in its labeled location, unobstructed, and appropriate for the nearby fire risks',
      'Review the exit route and PASS instructions with household members, keeping evacuation the priority over fighting a fire',
      'Replace or professionally service damaged, discharged, corroded, or expired equipment and never test an extinguisher by spraying it',
    ],
    tools: ['Flashlight', 'Household fire-safety checklist', 'Phone for inspection-date records', 'Replacement extinguisher only when the existing unit is out of date or damaged'],
  },
  {
    name: 'foundation and structural drainage',
    matches: (text) => hasAny(text, ['foundation', 'foundation damage', 'foundation crack', 'foundation inspection', 'foundation wall', 'structural damage', 'settling', 'bowing wall']),
    category: 'foundation',
    estimatedTime: '30–60 minutes',
    difficulty: 'moderate',
    actionSummary: () => 'Document foundation movement, cracking, and water entry so a structural problem is escalated before it worsens.',
    steps: () => [
      'Walk the interior and exterior foundation and photograph cracks, offsets, bowing, efflorescence, stains, and damp areas with a reference scale',
      'Measure and date any accessible crack, but do not chip concrete, excavate soil, or remove finishes to investigate it',
      'Check grading, gutters, downspouts, and sump discharge for water directed toward the wall or recurring pooling',
      'Contact a structural engineer or qualified foundation professional for horizontal or widening cracks, displacement, active leaks, or unsafe movement',
    ],
    tools: ['Flashlight', 'Phone or camera', 'Ruler or crack gauge', 'Moisture meter when available', 'Notepad and marker'],
  },
  {
    name: 'pool and spa equipment',
    matches: (text) => /\b(pool|spa|hot tub)\b/.test(text) || hasAny(text, ['pool equipment', 'pool pump', 'pool filter']),
    category: 'pool',
    estimatedTime: '30–75 minutes',
    difficulty: 'moderate',
    actionSummary: () => 'Check pool or spa equipment, water circulation, and visible leaks while keeping electrical and chemical hazards controlled.',
    steps: () => [
      'Turn off power before inspecting the pump, filter, heater, lights, and exposed connections; keep electrical equipment dry',
      'Look for leaks, cracked housings, unusual pressure, loose lids, damaged drain covers, or unsafe access around the equipment',
      'Test water chemistry with a fresh kit and run circulation only within manufacturer guidance, keeping swimmers out when chemistry is unsafe',
      'Shut down leaking or electrically unsafe equipment and call a qualified pool professional for repairs, gas, electrical, or structural problems',
    ],
    tools: ['Pool or spa owner manual', 'Flashlight', 'Fresh water test kit', 'Towels', 'Replacement O-ring or filter only when model-matched'],
  },
  {
    name: 'roof, gutters, and storms',
    matches: (text) => hasAny(text, ['roof', 'shingle', 'flashing', 'gutter', 'downspout', 'ice dam', 'storm drain', 'hail', 'hurricane', 'wind damage', 'storm preparation']),
    category: 'roof',
    estimatedTime: '45–120 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /gutter|downspout/i.test(title)
      ? 'Restore clear roof drainage and direct runoff away from the foundation before the next heavy rain.'
      : 'Inspect the roof and storm-exposed details from a safe location, then document damage before it becomes a leak.',
    steps: (title) => /gutter|downspout/i.test(title)
      ? [
          'From the ground, check gutter runs, brackets, seams, and downspout outlets for sagging, separation, or blockage',
          'Use a stable ladder only where appropriate and remove reachable debris while keeping three points of contact',
          'Flush each section with a hose and confirm water exits at least several feet away from the foundation',
          'Photograph leaks or roof damage and call a roofing professional for steep roofs, storm damage, or work above a safe reach',
        ]
      : [
          'Inspect the roof from the ground with binoculars; never walk a wet, icy, or storm-damaged roof',
          'Look for missing, cracked, lifted, or granule-shedding shingles and gaps or rust at flashing, vents, and skylights',
          'Check attic ceilings and insulation for new stains or dampness after rain, and photograph each finding',
          'Arrange a licensed roofer for active leaks, structural damage, loose flashing, or any repair requiring roof access',
        ],
    tools: ['Binoculars or phone camera with zoom', 'Flashlight for an attic check', 'Work gloves', 'Stable ladder and ladder stabilizer only when safe', 'Gutter scoop and hose for ground-level cleaning'],
  },
  {
    name: 'plumbing and freezing',
    matches: (text) => hasAny(text, ['plumbing', 'pipe', 'faucet', 'toilet', 'sink', 'leak', 'freezing', 'freeze', 'burst pipe', 'outdoor spigot', 'spigots', 'hose bib', 'outdoor water system', 'water system', 'water pressure', 'well water', 'water test']),
    category: 'plumbing',
    estimatedTime: '30–90 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /well water|water test/i.test(title)
      ? 'Collect a representative well-water sample safely and send it to a certified laboratory for the tests required by local guidance.'
      : 'Find vulnerable plumbing, stop avoidable water loss, and protect exposed lines before a freeze or leak causes damage.',
    steps: (title) => /well water|water test/i.test(title)
      ? [
          'Contact the local health department or certified laboratory for the correct bottle, analytes, preservation, and submission deadline',
          'Use clean hands and the laboratory instructions to collect the sample from the specified cold-water tap without touching the cap or inside of the bottle',
          'Label the sample with the requested well and collection information, keep it at the required temperature, and deliver it within the laboratory holding time',
          'Review the certified report and follow local health guidance or a qualified well professional for any failed result; do not drink-test or shock the well based on a guess',
        ]
      : [
          'Locate the main shutoff and inspect exposed supply lines, valves, traps, and fixture connections for dampness, corrosion, or bulges',
          'Insulate cold pipes in unheated areas and disconnect outdoor hoses; during extreme cold, open cabinet doors and use a safe drip strategy',
          'Operate each accessible fixture briefly and confirm drains, supply connections, and the area below remain dry',
          'Shut off water and call a plumber for a burst line, hidden leak, sewage backup, or a valve that will not operate',
        ],
    tools: ['Flashlight or headlamp', 'Absorbent towels and bucket', 'Pipe insulation sleeves', 'Adjustable wrench', 'Plumber’s tape for compatible threaded fittings', 'Laboratory-provided sterile sample bottle when testing well water'],
  },
  {
    name: 'electrical and detectors',
    matches: (text) => hasAny(text, ['electrical', 'outlet', 'gfci', 'afci', 'breaker', 'wiring', 'smoke detector', 'carbon monoxide', 'co detector', 'fire extinguisher']),
    category: 'electrical',
    estimatedTime: '15–45 minutes',
    difficulty: 'easy',
    actionSummary: (title) => /detector|alarm/i.test(title)
      ? 'Test every alarm and correct battery or end-of-life warnings so occupants receive an alert when it matters.'
      : 'Perform a no-contact electrical safety check and escalate heat, noise, damage, or repeated trips to an electrician.',
    steps: (title) => /detector|alarm/i.test(title)
      ? [
          'Press and hold the test button on each detector and confirm the alarm is loud and audible from sleeping areas',
          'Check the manufacture or replace-by date and install the battery specified by the detector label when applicable',
          'Vacuum dust from the grille without opening the detector, then repeat the test after the battery or cleaning change',
          'Replace sealed alarms at end of life and call a qualified professional for hardwired faults or an alarm that will not test',
        ]
      : [
          'Visually inspect accessible outlets, switches, cords, and the panel cover for scorching, moisture, damage, or loose hardware',
          'Use the device’s test and reset buttons on GFCI/AFCI protection without removing covers or the electrical-panel dead front',
          'Record any breaker that trips, outlet that will not reset, buzzing, heat, or burning odor and stop using the affected circuit',
          'Have a licensed electrician diagnose panel, wiring, or repeated-trip problems rather than opening energized equipment',
        ],
    tools: ['Flashlight', 'Replacement detector batteries when required', 'Vacuum with soft brush', 'GFCI receptacle tester for compatible outlets', 'Notepad or phone for locations'],
  },
  {
    name: 'water heater',
    matches: (text) => text.includes('water heater') || text.includes('hot water tank'),
    category: 'water_heater',
    estimatedTime: '45–90 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /pressure relief|relief valve|t\&p valve/i.test(title)
      ? 'Visually check the water-heater temperature-and-pressure relief valve and use its test lever only as the manufacturer permits.'
      : 'Check the water heater for leaks, safe temperature, and sediment symptoms before they shorten its service life.',
    steps: (title) => /pressure relief|relief valve|t\&p valve/i.test(title)
      ? [
          'Read the water-heater manual and identify the temperature-and-pressure relief valve and its unobstructed discharge pipe',
          'Without removing the valve or cap, look for corrosion, leakage, blockage, or a discharge pipe that is missing, capped, or aimed unsafely',
          'Only if the manufacturer directs a homeowner test, keep clear of hot discharge and briefly lift the lever as instructed, then verify it closes fully',
          'Stop immediately for continuous discharge, scalding risk, a stuck lever, or an unsafe installation and call a licensed plumber; do not open the tank',
        ]
      : [
          'Look around the tank, temperature-and-pressure relief discharge, shutoff, and connections for active leaks or corrosion',
          'Verify the thermostat is near the manufacturer’s safe setting (about 120°F for many homes) and test hot water carefully',
          'For a tank-style unit, follow the manual to connect a hose and flush sediment only when the water can be safely cooled and drained',
          'Stop and call a licensed plumber for a leaking tank, relief-valve discharge, gas odor, damaged wiring, or uncertain drain connections',
        ],
    tools: ['Flashlight', 'Thermometer', 'Manufacturer manual', 'Phone or camera for the valve and discharge-pipe condition', 'Garden hose only for a separate, manufacturer-directed tank flush'],
  },
  {
    name: 'drainage and sump',
    matches: (text) => hasAny(text, ['drainage', 'storm drain', 'sump pump', 'sump pit', 'foundation water', 'basement moisture', 'flooding', 'french drain', 'catch basin']),
    category: 'drainage',
    estimatedTime: '20–60 minutes',
    difficulty: 'easy',
    actionSummary: () => 'Verify that water can leave the property and that the sump system starts, discharges, and has a usable backup plan.',
    steps: () => [
      'Inspect the pit, float, inlet screen, check valve, and discharge pipe for debris, binding, or a disconnected joint',
      'Add enough clean water to raise the float and confirm the pump starts automatically and empties the pit',
      'Walk the discharge outlet and nearby grading to confirm water drains away from the foundation without erosion or blockage',
      'Test the battery or secondary pump if installed and arrange service for a failed pump, recurring flooding, or unsafe wiring',
    ],
    tools: ['Bucket of clean water', 'Flashlight or work light', 'Towels', 'Phone for photos', 'Replacement backup battery when applicable'],
  },
  {
    name: 'windows and weatherization',
    matches: (text) => hasAny(text, ['window', 'door seal', 'weatherstrip', 'weather strip', 'draft', 'air leak', 'caulk', 'insulation', 'storm door']),
    category: 'windows',
    estimatedTime: '30–90 minutes',
    difficulty: 'easy',
    actionSummary: () => 'Find air and moisture paths around openings, then seal the gaps that waste energy or invite water damage.',
    steps: () => [
      'Inspect frames, sashes, thresholds, and exterior caulk for gaps, cracked seals, condensation, or soft trim',
      'On a windy day, compare airflow around the opening with a tissue or incense held safely away from flammable materials',
      'Clean and dry the surface, measure the gap, and install compatible weatherstripping, a sweep, or exterior sealant',
      'Open and close the window or door to confirm the repair does not prevent drainage, locking, or emergency egress',
    ],
    tools: ['Tape measure', 'Utility knife or scissors', 'Weatherstripping or door sweep', 'Exterior-rated caulk and caulk gun', 'Clean rag and mild cleaner'],
  },
  {
    name: 'appliances',
    matches: (text) => hasAny(text, ['appliance', 'refrigerator', 'freezer', 'washing machine', 'washer', 'dryer', 'dishwasher', 'range', 'oven', 'garbage disposal']),
    category: 'appliances',
    estimatedTime: '30–75 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /refrigerator|fridge|door seal|gasket/i.test(title)
      ? 'Test the refrigerator door gasket for a continuous seal so the appliance holds temperature without unnecessary compressor work.'
      : /dryer/i.test(title)
        ? 'Clear lint and verify the dryer exhaust so heat and moisture can leave the home safely.'
      : 'Clean the appliance’s serviceable parts and check connections so it operates safely without avoidable wear or leaks.',
    steps: (title) => /refrigerator|fridge|door seal|gasket/i.test(title)
      ? [
          'Close a clean sheet of paper in several places around the refrigerator door gasket and gently pull to check for consistent resistance',
          'Inspect the gasket and door alignment for splits, hardened sections, trapped food, or a corner that does not contact the cabinet',
          'Clean the gasket and mating surface with the manufacturer-approved mild cleaner, then repeat the paper test around the full perimeter',
          'Adjust or replace the model-matched gasket according to the manual, or arrange appliance service if the door or cabinet is warped',
        ]
      : /dryer/i.test(title)
      ? [
          'Turn the dryer off, unplug it, and move it only as far as the supply and exhaust connections allow',
          'Remove lint from the screen housing, hose, rigid duct, and exterior termination with a dryer brush or vacuum',
          'Reconnect the duct without crushing it and run a short cycle to confirm the outside flap opens with strong airflow',
          'Arrange professional cleaning when the duct is inaccessible, damaged, unusually long, or still has weak airflow',
        ]
      : [
          'Read the appliance manual and disconnect power or water only when the task requires it',
          'Clean the user-serviceable filter, gasket, coil, drain, or spray arm specified by the manufacturer',
          'Inspect hoses, cords, water connections, and the floor below for wear, leaks, heat damage, or unusual vibration',
          'Run a short test cycle and stop using the appliance if a safety fault, burning smell, or persistent leak remains',
        ],
    tools: ['Manufacturer manual', 'Flashlight', 'Vacuum with crevice or brush attachment', 'Microfiber cloths', 'Clean sheet of paper for a refrigerator gasket test', 'Appliance-specific brush or replacement filter when required'],
  },
  {
    name: 'exterior, deck, landscape, and pool',
    matches: (text) => hasAny(text, ['exterior', 'outdoor area', 'outdoor space', 'outdoor living', 'yard', 'garden', 'grill', 'pleasant weather', 'optimal weather', 'outdoor maintenance', 'leaves', 'rake', 'siding', 'trim', 'deck', 'porch', 'railing', 'handrails', 'patio', 'landscape', 'landscap', 'lawn', 'irrigation', 'sprinkler', 'pool', 'spa', 'hot tub', 'mower']),
    category: 'exterior',
    estimatedTime: '45–120 minutes',
    difficulty: 'moderate',
    actionSummary: (title) => /pool|spa|hot tub/i.test(title)
      ? 'Check circulation, water chemistry, and exposed equipment so the pool or spa remains safe and protected.'
      : 'Inspect outdoor surfaces and equipment for damage, water paths, and loose parts before the area is used heavily.',
    steps: (title) => /pool|spa|hot tub/i.test(title)
      ? [
          'Inspect the shell, cover, deck, pump, filter, heater, and visible plumbing for cracks, leaks, or unsafe access',
          'Test water with a fresh kit and adjust chemicals only within the manufacturer’s or public-health guidance',
          'Run circulation briefly and confirm the filter pressure, returns, and drain covers appear normal',
          'Shut down unsafe equipment and use a qualified pool professional for electrical, gas, structural, or persistent leak problems',
        ]
      : [
          'Walk the area and check boards, railings, siding, trim, irrigation heads, plants, and fasteners for rot, movement, or leaks',
          'Probe only accessible wood for soft spots and mark repairs; keep people off a deck or stair that moves or cannot support weight',
          'Clean the surface with the least aggressive method that will remove dirt without forcing water behind siding or into joints',
          'Repair or refer structural rot, unstable railings, irrigation breaks, tree hazards, or equipment that requires specialized service',
        ],
    tools: ['Flashlight', 'Work gloves and safety glasses', 'Screwdriver or inspection probe', 'Garden hose', 'Manufacturer-approved cleaner or pool test kit when applicable'],
  },
];

export const INTENT_FAMILIES: IntentFamily[] = RAW_INTENT_FAMILIES.map((family: IntentFamily): IntentFamily => ({
  ...family,
  id: family.id ?? family.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
}));

function fallbackFamily(title: string, description: string): IntentFamily {
  const target = targetFromTitle(title);
  return {
    id: 'general-maintenance-fallback',
    name: 'general maintenance',
    matches: () => true,
    category: 'general_maintenance',
    estimatedTime: '30–60 minutes',
    difficulty: 'easy',
    actionSummary: () => summaryFor('Review', target, 'you can address small issues before they become expensive repairs'),
    steps: () => [
      `Locate ${target} and identify the exact component, access point, or condition named by the maintenance request`,
      `Inspect ${target} safely and record visible damage, moisture, noise, or changes from normal operation`,
      `Clean, adjust, or test only the owner-serviceable parts specified for ${target} by its manufacturer`,
      `Escalate ${target} to qualified service when the work involves structural, gas, energized, or hidden components`,
    ],
    tools: ['Flashlight', 'Phone or notepad for documentation', 'Work gloves'],
  };
}

function familyFor(title: string, description: string): IntentFamily {
  const titleText = title.toLowerCase();
  const precedence = [
    'air quality and filtration',
    'pool and spa equipment',
    'home security and access',
    'septic and sewer service',
    'backup generator and power',
    'attic ventilation',
    'water conservation and drought',
    'wildfire and evacuation',
    'HVAC, heating, and filters',
    'severe weather and temperature readiness',
    'fall and winter preparation',
    'drainage and sump',
    'pests, radon, mold, and moisture',
    'fire extinguishers and fire safety',
    'garage door, fans, lighting, and fireplace',
    'bathroom grout and sealant',
    'foundation and structural drainage',
    'roof, gutters, and storms',
    'water heater',
    'plumbing and freezing',
    'electrical and detectors',
    'appliances',
    'windows and weatherization',
    'fences, driveways, and walkways',
    'outdoor and snow equipment',
    'exterior, deck, landscape, and pool',
    'interior cleaning and dust control',
    'earthquake, altitude, and avalanche readiness',
    'seasonal weather observation',
  ];
  const titleMatches = INTENT_FAMILIES.filter(family => family.matches(titleText, title));
  const preferredTitleMatch = precedence
    .map(name => titleMatches.find(family => family.name === name))
    .find((family): family is IntentFamily => Boolean(family));
  if (preferredTitleMatch) return preferredTitleMatch;
  if (titleMatches[0]) return titleMatches[0];

  // Descriptions are intentionally not used to change the family. A sentence
  // mentioning windows, plumbing, or fire is often only a safety note for a
  // different title object. Unknown weather notices use the title aliases
  // above; genuinely unknown work remains visibly marked as fallback.
  return fallbackFamily(title, description);
}

/**
 * Observation-only work does not have a contractor/materials range.  Keep the
 * check intentionally conservative: a task that cleans, replaces, tests, or
 * repairs something remains costable even when its title starts with "check".
 */
export function isMonitoringOnlyTask(title: string, description: string): boolean {
  const normalizedTitle = title.toLowerCase();
  // A monitoring verb is passive by default. A title that explicitly names
  // hands-on work remains costable even when it begins with "Monitor" or
  // "Continue" (for example, "Monitor and replace the HVAC filter").
  const passivePrefix = /^(monitor|track|watch|continue)\b/.test(normalizedTitle);
  const activeWork = /\b(repair|replace|service|install|clean|maintain)\b/.test(normalizedTitle);
  const reviewedPassiveCheck = /^check\b/.test(normalizedTitle)
    && /\b(indoor humidity|humidity level|air quality|aqi|air-quality|altitude weather|weather monitoring|wildfire smoke|smoke conditions|dry wind)\b/.test(normalizedTitle)
    && !/\b(repair|replace|service|install|clean|maintain|test|calibrate|adjust)\b/.test(normalizedTitle);
  return (passivePrefix || reviewedPassiveCheck) && !activeWork;
}

export function generateTaskContent(title: string, description: string, region?: string): GeneratedTaskContent {
  const family = familyFor(title, description);
  const actionSummary = family.actionSummary(title, description);
  let steps = family.steps(title, description);
  const authoredSteps = numberedDescriptionSteps(description);
  if (authoredSteps.length >= 3 && family.name === 'general maintenance') steps = authoredSteps;
  if (steps.length < 3) steps = [...steps, ...descriptionSentences(description)].slice(0, 4);
  while (steps.length < 3) {
    steps.push(`Record the result and note any follow-up needed for ${targetFromTitle(title)}`);
  }
  const monitoringOnly = isMonitoringOnlyTask(title, description);
  const toolsAndSupplies = /well water|water test/i.test(title)
    ? family.tools.filter(tool => !/pipe insulation|adjustable wrench|plumber.?s tape/i.test(tool))
    : /pressure relief|relief valve|t&?p valve/i.test(title)
      ? family.tools.filter(tool => !/garden hose|bucket|drain/i.test(tool))
      : family.tools;

  const content: GeneratedTaskContent = {
    actionSummary,
    steps,
    toolsAndSupplies,
    estimatedTime: family.estimatedTime,
    difficulty: family.difficulty,
    intentFamily: familyId(family),
    fallbackUsed: family.name === 'general maintenance',
    monitoringOnly,
    costApplicability: monitoringOnly ? 'monitoring_only' : 'costable',
  };
  if (monitoringOnly && (family.name === 'wildfire and evacuation' || family.name === 'air quality and filtration')) {
    content.estimatedTime = '10–20 minutes';
    content.difficulty = 'easy';
  }
  if (!monitoringOnly) {
    content.costEstimate = getCostEstimate(family.category, family.difficulty, region);
  }
  return content;
}