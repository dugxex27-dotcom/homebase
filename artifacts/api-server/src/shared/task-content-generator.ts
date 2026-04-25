/**
 * Automatic Task Content Generator
 * 
 * Generates action summaries, steps, and tools/supplies for maintenance tasks
 * based on their title and description
 */

export interface GeneratedTaskContent {
  actionSummary: string;
  steps: string[];
  toolsAndSupplies: string[];
}

/**
 * Generate action summary from task title and description
 * Creates a concise, action-oriented single sentence
 */
function generateActionSummary(title: string, description: string): string {
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  // Safety/Emergency tasks
  if (lowerTitle.includes('carbon monoxide') || lowerTitle.includes('co detector') || lowerTitle.includes('smoke detector')) {
    return 'Test your safety detectors monthly to protect your family from invisible dangers.';
  }
  
  if (lowerTitle.includes('emergency') || lowerDesc.includes('emergency')) {
    return 'Complete these essential safety checks to prepare for unexpected emergencies.';
  }
  
  // Inspection tasks
  if (lowerTitle.includes('inspect') || lowerTitle.includes('check for')) {
    const target = extractTarget(title);
    return `Perform a thorough inspection of your ${target} to catch problems early.`;
  }
  
  // Testing tasks
  if (lowerTitle.includes('test ')) {
    const target = extractTarget(title);
    return `Run these quick tests to ensure your ${target} works when you need it.`;
  }
  
  // Cleaning tasks
  if (lowerTitle.includes('clean ')) {
    const target = extractTarget(title);
    return `Clean your ${target} to maintain performance and prevent buildup.`;
  }
  
  // Monitor/Check tasks
  if (lowerTitle.includes('monitor') || lowerTitle.includes('check ')) {
    const target = extractTarget(title);
    return `Check your ${target} with these quick steps to ensure everything runs smoothly.`;
  }
  
  // Winterization/Preparation tasks
  if (lowerTitle.includes('winterize') || lowerTitle.includes('prepare for winter')) {
    return 'Complete these essential steps to protect your home from winter damage.';
  }
  
  // Default action-oriented summary
  return `Follow these steps to ${title.toLowerCase()}.`;
}

/**
 * Extract the main target/subject from a task title
 */
function extractTarget(title: string): string {
  // Remove common action words
  const cleaned = title
    .toLowerCase()
    .replace(/^(test|inspect|check|clean|monitor|replace|service|maintain)\s+/i, '')
    .replace(/\s+for.*$/, '') // Remove "for X" endings
    .replace(/\s+if.*$/, ''); // Remove "if applicable" endings
  
  return cleaned || 'system';
}

/**
 * Generate step-by-step instructions from description
 */
function generateSteps(title: string, description: string): string[] {
  const steps: string[] = [];
  const lowerTitle = title.toLowerCase();
  
  // Try to extract numbered steps or bullet points from description
  const numberMatches = description.match(/\d+\.\s+([^.]+\.)/g);
  if (numberMatches && numberMatches.length > 0) {
    return numberMatches.map(m => m.replace(/^\d+\.\s+/, '').trim());
  }
  
  // Generate contextual steps based on task type
  if (lowerTitle.includes('test') && lowerTitle.includes('detector')) {
    steps.push('Press the test button on the detector until it beeps');
    steps.push('Verify the alarm sound is loud and clear');
    steps.push('Replace batteries if the low-battery chirp sounds');
  } else if (lowerTitle.includes('inspect') && lowerTitle.includes('roof')) {
    steps.push('Use binoculars to inspect roof from the ground');
    steps.push('Look for missing, cracked, or curled shingles');
    steps.push('Check flashing around chimneys and vents');
    steps.push('Schedule professional inspection if damage is found');
  } else if (lowerTitle.includes('clean') && lowerTitle.includes('gutter')) {
    steps.push('Set up stable ladder on level ground');
    steps.push('Remove debris by hand or with scoop');
    steps.push('Flush gutters with garden hose');
    steps.push('Ensure downspouts drain away from foundation');
  } else if (lowerTitle.includes('filter')) {
    steps.push('Locate the filter access panel');
    steps.push('Remove the old filter and note its size');
    steps.push('Insert new filter with airflow arrow pointing toward unit');
    steps.push('Mark calendar to check again in 30-90 days');
  } else {
    // Generic steps based on description
    const sentences = description.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length >= 2) {
      return sentences.slice(0, 4).map(s => s.trim());
    }
    
    // Fallback generic steps
    steps.push('Read the task description carefully');
    steps.push('Gather necessary tools and supplies');
    steps.push('Complete the maintenance task as described');
    steps.push('Document completion and note any issues');
  }
  
  return steps;
}

/**
 * Generate tools and supplies list based on task type
 */
function generateToolsAndSupplies(title: string, description: string): string[] {
  const tools: string[] = [];
  const lowerTitle = title.toLowerCase();
  const lowerDesc = description.toLowerCase();
  
  // Smoke & CO Detector tasks
  if (lowerTitle.includes('smoke detector') || lowerTitle.includes('co detector') || lowerTitle.includes('carbon monoxide')) {
    tools.push('9V or AA batteries (check your detector model)');
    tools.push('Step stool or small ladder');
    tools.push('Vacuum with brush attachment (to clean dust)');
    tools.push('Microfiber cloth');
    return tools;
  }
  
  // HVAC Filter replacement
  if (lowerTitle.includes('filter') && (lowerTitle.includes('hvac') || lowerTitle.includes('furnace') || lowerTitle.includes('air'))) {
    tools.push('Replacement HVAC filter (16x25x1 MERV 8-13, check your system size)');
    tools.push('Vacuum cleaner');
    tools.push('Flashlight or headlamp');
    tools.push('Permanent marker (to write installation date)');
    tools.push('Screwdriver (if access panel has screws)');
    return tools;
  }
  
  // Gutter cleaning
  if (lowerTitle.includes('gutter')) {
    tools.push('Sturdy extension ladder (A-frame or extension type)');
    tools.push('Rubber work gloves (waterproof)');
    tools.push('Gutter scoop or small hand trowel');
    tools.push('5-gallon bucket with S-hook for hanging');
    tools.push('Garden hose with spray nozzle');
    tools.push('Safety glasses');
    tools.push('Ladder stabilizer (recommended)');
    return tools;
  }
  
  // Roof inspection
  if (lowerTitle.includes('roof') && lowerTitle.includes('inspect')) {
    tools.push('Binoculars (10x magnification)');
    tools.push('Smartphone or camera (for photos)');
    tools.push('Notepad and pen');
    tools.push('Flashlight (for attic inspection)');
    return tools;
  }
  
  // Weatherstripping
  if (lowerTitle.includes('weatherstrip') || lowerTitle.includes('weather strip')) {
    tools.push('Self-adhesive foam weatherstripping tape');
    tools.push('Door sweep or threshold seal');
    tools.push('Tape measure');
    tools.push('Utility knife or scissors');
    tools.push('Rubbing alcohol (for surface prep)');
    tools.push('Clean rag');
    return tools;
  }
  
  // Caulking tasks
  if (lowerTitle.includes('caulk') || lowerDesc.includes('seal gaps')) {
    tools.push('100% silicone caulk or painter\'s caulk');
    tools.push('Caulk gun');
    tools.push('Utility knife (to remove old caulk)');
    tools.push('Putty knife or caulk removal tool');
    tools.push('Rubbing alcohol and rag (for cleanup)');
    tools.push('Painter\'s tape (for clean lines)');
    return tools;
  }
  
  // Window inspection/cleaning
  if (lowerTitle.includes('window') && (lowerTitle.includes('inspect') || lowerTitle.includes('clean'))) {
    tools.push('Glass cleaner or vinegar solution');
    tools.push('Microfiber cloths or squeegee');
    tools.push('Bucket with warm soapy water');
    tools.push('Scrub brush (for frames and tracks)');
    tools.push('Vacuum with brush attachment');
    tools.push('Spray bottle');
    return tools;
  }
  
  // Dryer vent cleaning
  if (lowerTitle.includes('dryer') && (lowerTitle.includes('vent') || lowerTitle.includes('lint'))) {
    tools.push('Dryer vent brush kit (24-inch flexible brush)');
    tools.push('Vacuum cleaner with hose attachment');
    tools.push('Screwdriver set (to disconnect vent)');
    tools.push('Shop vacuum (recommended for heavy buildup)');
    tools.push('Vent cleaning rods or auger brush');
    return tools;
  }
  
  // Water heater maintenance
  if (lowerTitle.includes('water heater')) {
    tools.push('Garden hose (3/4-inch diameter)');
    tools.push('5-gallon bucket');
    tools.push('Adjustable wrench');
    tools.push('Screwdriver');
    tools.push('Flashlight');
    tools.push('Gloves (heat-resistant)');
    tools.push('Wire brush (to clean sediment)');
    return tools;
  }
  
  // Sump pump testing
  if (lowerTitle.includes('sump pump')) {
    tools.push('5-gallon bucket of water');
    tools.push('Flashlight or work light');
    tools.push('Measuring tape');
    tools.push('Towels or rags');
    tools.push('Backup pump float switch (if testing backup)');
    return tools;
  }
  
  // Deck/patio cleaning
  if ((lowerTitle.includes('deck') || lowerTitle.includes('patio')) && lowerTitle.includes('clean')) {
    tools.push('Pressure washer (1500-2000 PSI) or garden hose');
    tools.push('Deck cleaning solution or oxygen bleach');
    tools.push('Stiff bristle brush or deck brush');
    tools.push('5-gallon bucket');
    tools.push('Safety glasses');
    tools.push('Rubber boots');
    tools.push('Garden hose with spray nozzle');
    return tools;
  }
  
  // Chimney/fireplace inspection
  if (lowerTitle.includes('chimney') || lowerTitle.includes('fireplace')) {
    tools.push('Flashlight or headlamp');
    tools.push('Mirror (to inspect flue)');
    tools.push('Smartphone camera (for photos)');
    tools.push('Safety glasses');
    tools.push('Dust mask');
    return tools;
  }
  
  // Faucet aerator cleaning
  if (lowerTitle.includes('faucet') || lowerTitle.includes('aerator')) {
    tools.push('Adjustable wrench or pliers');
    tools.push('White vinegar (1 cup)');
    tools.push('Small bowl or cup');
    tools.push('Old toothbrush');
    tools.push('Towel or rag');
    tools.push('Teflon tape (for reassembly)');
    return tools;
  }
  
  // Electrical outlet testing
  if (lowerDesc.includes('gfci') || (lowerDesc.includes('outlet') && lowerDesc.includes('test'))) {
    tools.push('GFCI outlet tester (3-light tester)');
    tools.push('Small appliance or lamp (for testing)');
    tools.push('Flashlight');
    tools.push('Notepad (to record locations)');
    return tools;
  }
  
  // Garage door maintenance
  if (lowerTitle.includes('garage door')) {
    tools.push('Silicone-based garage door lubricant spray');
    tools.push('Household oil (for hinges)');
    tools.push('Socket wrench set (to tighten hardware)');
    tools.push('Level (4-foot level)');
    tools.push('Adjustable wrench');
    tools.push('Safety glasses');
    tools.push('Clean rags');
    return tools;
  }
  
  // Lawn mower maintenance
  if (lowerTitle.includes('lawn mower') || lowerTitle.includes('mower')) {
    tools.push('Spark plug wrench');
    tools.push('New spark plug (check manual for type)');
    tools.push('Air filter (check manual for size)');
    tools.push('SAE 30 or 10W-30 motor oil');
    tools.push('Oil drain pan');
    tools.push('Funnel');
    tools.push('Socket wrench set');
    tools.push('Work gloves');
    return tools;
  }
  
  // General plumbing inspection
  if (lowerDesc.includes('plumb') || lowerDesc.includes('pipe') || lowerDesc.includes('leak')) {
    tools.push('Flashlight or headlamp');
    tools.push('Towels or absorbent rags');
    tools.push('Bucket (for drips)');
    tools.push('Adjustable wrench (8-inch and 10-inch)');
    tools.push('Pipe wrench (optional, for threaded pipes)');
    tools.push('Plumber\'s tape (Teflon tape)');
    return tools;
  }
  
  // Foundation/basement inspection
  if (lowerDesc.includes('foundation') || lowerDesc.includes('basement')) {
    tools.push('Flashlight or work light');
    tools.push('Moisture meter (optional but recommended)');
    tools.push('Crack gauge or ruler');
    tools.push('Camera or smartphone (for documentation)');
    tools.push('Notepad and pen');
    return tools;
  }
  
  // General cleaning tasks
  if (lowerTitle.includes('clean') && tools.length === 0) {
    tools.push('All-purpose cleaner or appropriate cleaning solution');
    tools.push('Microfiber cloths (pack of 3-5)');
    tools.push('Bucket with warm water');
    tools.push('Scrub brush or sponge');
    tools.push('Vacuum cleaner');
    tools.push('Rubber gloves');
    return tools;
  }
  
  // General inspection tasks
  if (lowerTitle.includes('inspect') && tools.length === 0) {
    tools.push('Flashlight or headlamp (LED, 200+ lumens)');
    tools.push('Notepad and pen (for recording findings)');
    tools.push('Smartphone or camera (for photos)');
    tools.push('Measuring tape (25-foot)');
    return tools;
  }
  
  // Default specific fallback
  if (tools.length === 0) {
    tools.push('Flashlight (LED, 200+ lumens)');
    tools.push('Basic hand tools (screwdriver set, pliers, wrench)');
    tools.push('Work gloves');
    tools.push('Safety glasses (recommended)');
  }
  
  return tools;
}

/**
 * Main function to generate all content for a task
 */
export function generateTaskContent(title: string, description: string): GeneratedTaskContent {
  return {
    actionSummary: generateActionSummary(title, description),
    steps: generateSteps(title, description),
    toolsAndSupplies: generateToolsAndSupplies(title, description)
  };
}
