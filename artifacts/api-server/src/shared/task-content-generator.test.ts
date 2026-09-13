import { describe, expect, it } from 'vitest';
import {
  generateTaskContent,
  INTENT_FAMILIES,
  isMonitoringOnlyTask,
} from './task-content-generator';
import { US_MAINTENANCE_DATA } from './location-maintenance-data';

describe('maintenance task content generator', () => {
  const GENERIC_CONTENT_PHRASES = [
    'read the task details',
    'follow these steps',
    'gather the necessary tools',
    'complete the task',
    'document completion',
  ];

  it.each([
    ['Clear defensible space for wildfire season', 'wildfire-and-evacuation'],
    ['Monitor air quality during fire season', 'air-quality-and-filtration'],
    ['Prepare for tornado season', 'severe-weather-and-temperature-readiness'],
    ['Check emergency supplies', 'emergency-supplies-and-communications'],
    ['Test home security system', 'home-security-and-access'],
    ['Inspect septic system', 'septic-and-sewer-service'],
    ['Test backup generator', 'backup-generator-and-power'],
    ['Check attic ventilation', 'attic-ventilation'],
    ['Check water conservation during drought', 'water-conservation-and-drought'],
    ['Check heating system efficiency', 'hvac-heating-and-filters'],
    ['Begin fall preparation', 'fall-and-winter-preparation'],
    ['Prepare for weather transition', 'seasonal-weather-observation'],
    ['Deep clean interior', 'interior-cleaning-and-dust-control'],
    ['Inspect for mold and moisture', 'pests-radon-mold-and-moisture'],
    ['Test garage door auto-reverse', 'garage-door-fans-lighting-and-fireplace'],
    ['Inspect fences and walkways', 'fences-driveways-and-walkways'],
    ['Prepare snow removal equipment', 'outdoor-and-snow-equipment'],
    ['Check earthquake preparedness', 'earthquake-altitude-and-avalanche-readiness'],
    ['Check fire extinguishers', 'fire-extinguishers-and-fire-safety'],
    ['Inspect foundation for damage', 'foundation-and-structural-drainage'],
    ['Inspect roof after storm', 'roof-gutters-and-storms'],
    ['Protect pipes from freezing', 'plumbing-and-freezing'],
    ['Test GFCI outlets', 'electrical-and-detectors'],
    ['Flush water heater', 'water-heater'],
    ['Test sump pump', 'drainage-and-sump'],
    ['Seal window drafts', 'windows-and-weatherization'],
    ['Clean dryer vent', 'appliances'],
    ['Check pool equipment', 'pool-and-spa-equipment'],
    ['Inspect exterior paint', 'exterior-deck-landscape-and-pool'],
  ])('has a golden assignment for %s', (title, family) => {
    const content = generateTaskContent(title, 'Use the manufacturer or local safety guidance.');
    expect(content.intentFamily).toBe(family);
    expect(content.fallbackUsed).toBe(false);
  });

  it('keeps every registered family non-empty and identifiable', () => {
    expect(INTENT_FAMILIES.length).toBeGreaterThanOrEqual(20);
    expect(INTENT_FAMILIES.every(family => family.name && family.tools.length > 0)).toBe(true);
  });

  it.each([
    [
      'Continue wildfire vigilance',
      'Review fire danger, maintain defensible space, and keep evacuation supplies ready.',
    ],
    [
      'Begin fall preparation',
      'Test heating, protect outdoor plumbing, and stock supplies before freezing weather.',
    ],
    [
      'Check heating system preparation',
      'Turn on heat, verify vents, and schedule service for unusual sounds.',
    ],
    [
      'Monitor air quality systems',
      'Check AQI, run HEPA filtration when needed, and watch the filter indicator.',
    ],
  ])('creates specific content for %s', (title, description) => {
    const content = generateTaskContent(title, description);

    expect(content.actionSummary).toBeTruthy();
    expect(content.actionSummary.toLowerCase()).not.toBe(title.toLowerCase());
    expect(content.steps.length).toBeGreaterThanOrEqual(3);
    expect(content.steps.every(step => step.length >= 24)).toBe(true);
    expect(content.estimatedTime).toBeTruthy();
    expect(['easy', 'moderate', 'difficult']).toContain(content.difficulty);
    expect(content.toolsAndSupplies.length).toBeGreaterThan(0);
  });

  it('does not invent a contractor range for observation-only AQI work', () => {
    const content = generateTaskContent(
      'Monitor air quality systems',
      'Monitor AQI daily and run filtration when outdoor air becomes unhealthy.',
    );

    expect(isMonitoringOnlyTask('Monitor air quality systems', 'Monitor AQI daily')).toBe(true);
    expect(content.costEstimate).toBeUndefined();
  });

  it.each([
    ['Check fire extinguishers for charge', 'Check the pressure gauge and expiration date.', 'fire-extinguishers-and-fire-safety'],
    ['Inspect storm drains', 'Clear leaves and confirm water flows safely.', 'drainage-and-sump'],
    ['Monitor wildfire smoke and AQI', 'Review smoke advisories and indoor air conditions.', 'air-quality-and-filtration'],
    ['Begin fall preparation', 'Prepare the home before cold weather.', 'fall-and-winter-preparation'],
    ['Test garage door auto-reverse safety', 'Confirm the door reverses when it meets an obstruction.', 'garage-door-fans-lighting-and-fireplace'],
    ['Check heating system efficiency', 'Verify the thermostat, airflow, and safe operation.', 'hvac-heating-and-filters'],
    ['Inspect foundation for damage', 'Look for cracks, movement, and water entry.', 'foundation-and-structural-drainage'],
    ['Test irrigation/sprinkler system', 'Check coverage, leaks, and broken heads.', 'exterior-deck-landscape-and-pool'],
    ['Inspect exterior paint', 'Look for peeling, cracking, and exposed wood.', 'exterior-deck-landscape-and-pool'],
    ['Test home security system and update codes', 'The description mentions windows, but this is an alarm and access-code task.', 'home-security-and-access'],
    ['Check pool equipment for safety and leaks', 'Inspect the pump, filter, and visible plumbing for leaks.', 'pool-and-spa-equipment'],
    ['Inspect and pump septic system', 'A professional should inspect the tank and pump it on schedule.', 'septic-and-sewer-service'],
    ['Test emergency generator if applicable', 'Run it outside and verify backup power safely.', 'backup-generator-and-power'],
    ['Check attic ventilation and insulation', 'Look for blocked soffit and ridge vents.', 'attic-ventilation'],
    ['Check water conservation during drought', 'Review irrigation use and leaks.', 'water-conservation-and-drought'],
    ['Prepare for weather transition', 'Seasonal conditions are changing; watch the forecast.', 'seasonal-weather-observation'],
  ])('selects the title-object family for %s', (title, description, family) => {
    const content = generateTaskContent(title, description);
    expect(content.intentFamily).toBe(family);
    expect(content.fallbackUsed).toBe(false);
    if (/^(monitor|track|watch|continue)\b/i.test(title)) {
      expect(content.costEstimate).toBeUndefined();
    } else {
      expect(content.costEstimate).toBeDefined();
    }
  });

  it.each([
    [
      'Check refrigerator door seals (paper test)',
      'appliances',
      /\bpaper\b|gasket|seal/i,
      /caulk|pipe insulation|exterior/i,
    ],
    [
      'Well water test (if applicable, annually)',
      'plumbing-and-freezing',
      /certified laboratory|sample|sterile|health department/i,
      /pipe insulation|tank flush|caulk/i,
    ],
    [
      'Check water heater pressure relief valve (carefully lift lever)',
      'water-heater',
      /relief valve|manufacturer|discharge|lever/i,
      /flush sediment|tank flush|caulk/i,
    ],
    [
      'Check water heater for leaks',
      'water-heater',
      /water heater|tank|relief|thermostat/i,
      /insulate cold pipes|main shutoff|fixture connections/i,
    ],
    [
      'Test furnace emergency shut-off switch',
      'hvac-heating-and-filters',
      /shutoff|shut-off|switch|furnace stops/i,
      /refrigerator|caulk|pipe insulation/i,
    ],
    [
      'Monitor air conditioning efficiency',
      'hvac-heating-and-filters',
      /temperature|airflow|run time|capacity|efficiency/i,
      /refrigerator|caulk|pipe insulation/i,
    ],
    [
      'Inspect grout and caulking in showers, tubs, and sinks',
      'bathroom-grout-and-sealant',
      /grout|remove|mold|sealant|curing/i,
      /pipe insulation/i,
    ],
    [
      'Use portable emergency generator safely',
      'backup-generator-and-power',
      /portable|outdoors|20 feet|load/i,
      /automatic exercise|permanently installed/i,
    ],
    [
      'Test permanently installed standby generator',
      'backup-generator-and-power',
      /standby|automatic exercise|clearances|qualified/i,
      /20 feet from the home|move the generator/i,
    ],
  ])('uses a title-specific sub-intent for %s', (title, family, required, prohibited) => {
    const content = generateTaskContent(title, 'The description mentions unrelated windows and exterior details.');
    const steps = [...content.steps, ...content.toolsAndSupplies].join(' ');
    expect(content.intentFamily).toBe(family);
    expect(steps).toMatch(required);
    expect(steps).not.toMatch(prohibited);
  });

  it.each([
    ['Monitor air quality systems', 'Watch AQI and smoke advisories.'],
    ['Monitor for dry wind conditions', 'Watch wind and fire-weather alerts.'],
    ['Continue wildfire vigilance', 'Watch official fire conditions and evacuation alerts.'],
    ['Monitor heating system performance', 'Watch for problems during the season.'],
    ['Track pool equipment leaks', 'Watch the equipment and call if conditions change.'],
    ['Watch for wildfire smoke and AQI', 'Review official air-quality alerts.'],
    ['Check indoor humidity', 'Review the hygrometer and keep humidity in the healthy range.'],
    ['Check altitude weather monitoring', 'Review mountain weather and official alerts.'],
    ['Check air-quality monitoring', 'Review the AQI and smoke advisories.'],
  ])('marks passive monitoring as no-cost for %s', (title, description) => {
    const content = generateTaskContent(title, description);
    expect(content.monitoringOnly).toBe(true);
    expect(content.costApplicability).toBe('monitoring_only');
    expect(content.costEstimate).toBeUndefined();
  });

  it('keeps hands-on check and test tasks costable', () => {
    for (const title of ['Test garage door auto-reverse safety', 'Check HVAC filter', 'Check water heater pressure relief valve']) {
      const content = generateTaskContent(title, 'Perform the physical safety check according to the manual.');
      expect(content.monitoringOnly, title).toBe(false);
      expect(content.costEstimate, title).toBeDefined();
    }
  });

  it('enriches every normalized catalog task without replacing authored fields', () => {
    const authored = US_MAINTENANCE_DATA.Northeast.monthlyTasks[1].seasonal.find(
      task => task.title === 'Check heating system efficiency',
    );
    expect(authored?.actionSummary).toBe(
      'Do these 3 quick checks to ensure your heating system runs efficiently all winter.',
    );
    expect(authored?.steps).toHaveLength(3);
    expect(authored?.estimatedTime).toBeTruthy();
    expect(authored?.difficulty).toBeTruthy();
    expect(authored?.toolsAndSupplies?.length).toBeGreaterThan(0);
  });

  it('gives every catalog task at least three actionable steps and a time estimate', () => {
    for (const data of Object.values(US_MAINTENANCE_DATA)) {
      const tasks = [
        ...Object.values(data.monthlyTasks).flatMap(month => [...month.seasonal, ...month.weatherSpecific]),
        ...data.yearRoundTasks,
      ];
      for (const task of tasks) {
        expect(task.actionSummary, task.title).toBeTruthy();
        expect(task.steps?.length, task.title).toBeGreaterThanOrEqual(3);
        expect(task.estimatedTime, task.title).toBeTruthy();
        expect(task.difficulty, task.title).toBeTruthy();
        expect(task.toolsAndSupplies, task.title).toBeDefined();
        expect(task.fallbackUsed, task.title).toBe(false);
        expect(task.intentFamily, task.title).toBeTruthy();
        const content = [task.actionSummary, ...(task.steps ?? [])].join(' ').toLowerCase();
        for (const phrase of GENERIC_CONTENT_PHRASES) {
          expect(content, `${task.title} contains generic phrase "${phrase}"`).not.toContain(phrase);
        }
      }
    }
  });

  it('reports title-family compatibility and fallback assignments only on failure', () => {
    const violations: string[] = [];
    const assignments: string[] = [];
    const forbidden: Array<[RegExp, RegExp]> = [
      [/home security|security system/i, /windows|weatherization/i],
      [/\b(pool|spa|hot tub)\b/i, /plumbing|appliances/i],
      [/septic|drain field/i, /appliances|plumbing/i],
      [/generator|backup power/i, /windows|roof|appliances/i],
      [/attic ventilation|soffit vent|ridge vent/i, /windows|roof|appliances/i],
      [/water conservation|drought/i, /wildfire|hvac|roof/i],
    ];
    const required: Array<[RegExp, RegExp]> = [
      [/home security|security system|burglar alarm/i, /home-security-and-access/],
      [/\b(pool|spa|hot tub)\b/i, /pool-and-spa-equipment/],
      [/septic|drain field/i, /septic-and-sewer-service/],
      [/generator|backup power/i, /backup-generator-and-power/],
      [/attic ventilation|soffit vent|ridge vent/i, /attic-ventilation/],
      [/water conservation|drought/i, /water-conservation-and-drought/],
      [/^prepare for weather transition$/i, /seasonal-weather-observation/],
    ];
    for (const data of Object.values(US_MAINTENANCE_DATA)) {
      const tasks = [
        ...Object.values(data.monthlyTasks).flatMap(month => [...month.seasonal, ...month.weatherSpecific]),
        ...data.yearRoundTasks,
      ];
      for (const task of tasks) {
        assignments.push(`${task.title} => ${task.intentFamily}`);
        if (task.fallbackUsed) violations.push(`${task.title}: fallbackUsed`);
        for (const [required, forbiddenFamily] of forbidden) {
          if (required.test(task.title) && forbiddenFamily.test(task.intentFamily ?? '')) {
            violations.push(`${task.title}: ${task.intentFamily}`);
          }
        }
        for (const [requiredTitle, requiredFamily] of required) {
          if (requiredTitle.test(task.title) && !requiredFamily.test(task.intentFamily ?? '')) {
            violations.push(`${task.title}: expected ${requiredFamily}, received ${task.intentFamily}`);
          }
        }
      }
    }
    expect(violations, `family assignments:\n${assignments.join('\n')}`).toEqual([]);
  });

  it('keeps concrete objects out of seasonal weather observation assignments', () => {
    const concreteObject = /gutter|downspout|deck|patio|storm shelter|safe room|storm shutter|cooling system|heating system|energy|outdoor living|pool|spa|roof|window|fence|driveway|sump|storm drain|well water|water heater|generator|septic|fireplace|garage|appliance|irrigation|sprinkler|foundation|attic|drainage/i;
    const seasonalTitles: string[] = [];
    for (const data of Object.values(US_MAINTENANCE_DATA)) {
      const tasks = [
        ...Object.values(data.monthlyTasks).flatMap(month => [...month.seasonal, ...month.weatherSpecific]),
        ...data.yearRoundTasks,
      ];
      for (const task of tasks) {
        if (task.intentFamily === 'seasonal-weather-observation') {
          seasonalTitles.push(task.title);
          expect(task.title, task.title).not.toMatch(concreteObject);
        }
      }
    }
    expect(seasonalTitles.length).toBeGreaterThan(0);
  });
});