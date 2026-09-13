import type {
  LocationMaintenanceData,
  MaintenanceEventGuidance,
  MaintenanceRecurrence,
  MaintenanceRecurrenceFrequency,
  MaintenanceTaskItem,
  RawLocationMaintenanceData,
} from './location-maintenance-data';
import { generateTaskContent } from './task-content-generator';

type TaskDraft = Omit<MaintenanceTaskItem, 'id' | 'recurrence'> & {
  id?: string;
  recurrence?: MaintenanceRecurrence;
};

export interface MaintenanceCompletionLike {
  taskId?: string | null;
  taskTitle: string;
  completedAt?: Date | string | null;
  month?: number;
  year?: number;
}

type CanonicalTaskKey =
  | 'smoke-co-test'
  | 'smoke-co-batteries'
  | 'hvac-filter'
  | 'washing-machine-filter'
  | 'sump-pump-test'
  | 'gutter-cleaning'
  | 'professional-hvac-service'
  | 'humidity-monitoring'
  | 'chimney-inspection'
  | 'water-heater-flush'
  | 'dryer-vent-cleaning'
  | 'roof-inspection'
  | 'hail-roof-followup'
  | 'electrical-panel-visual'
  | 'electrical-panel-professional'
  | 'whole-home-electrical'
  | 'whole-home-plumbing'
  | 'septic-inspection'
  | 'termite-inspection'
  | 'defensible-space'
  | 'earthquake-setup'
  | 'earthquake-kit'
  | 'moss-treatment'
  | 'roof-cleaning';

const QUARTERLY_MONTHS = [1, 4, 7, 10];
const SPRING_FALL_MONTHS = [4, 10];

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function slug(value: string): string {
  return normalizeText(value).replace(/\s+/g, '-').slice(0, 72);
}

function canonicalKey(region: string, title: string): CanonicalTaskKey | null {
  const text = normalizeText(title);
  if (text.includes('washing machine') && text.includes('filter')) return 'washing-machine-filter';
  if (text.includes('sump pump') && (text.includes('test') || text.includes('inspect') || text.includes('check'))) return 'sump-pump-test';
  if ((text.includes('smoke') || text.includes('carbon monoxide')) && text.includes('detector')) {
    return text.includes('batter') ? 'smoke-co-batteries' : 'smoke-co-test';
  }
  if (
    text.includes('filter') &&
    (text.includes('hvac') || text.includes('furnace') || text.includes('air conditioning') || text.includes('ac filter'))
  ) return 'hvac-filter';
  if (
    (text.includes('gutter') || text.includes('downspout')) &&
    (text.includes('clean') || text.includes('maintain'))
  ) return 'gutter-cleaning';
  if (
    (text.includes('service') || text.includes('tune up') || text.includes('professional maintenance') || text.includes('transition maintenance')) &&
    (text.includes('hvac') || text.includes('furnace') || text.includes('heating system') || text.includes('air conditioning') || /\bac\b/.test(text))
  ) return 'professional-hvac-service';
  if (
    text.includes('humidity') &&
    (text.includes('monitor') || text.includes('check'))
  ) return 'humidity-monitoring';
  if (text.includes('chimney') && (text.includes('inspect') || text.includes('inspection') || text.includes('sweep'))) return 'chimney-inspection';
  if (text.includes('water heater') && text.includes('flush')) return 'water-heater-flush';
  if (text.includes('dryer vent')) return 'dryer-vent-cleaning';
  if (text.includes('roof') && (text.includes('inspect') || text.includes('inspection') || text.includes('check'))) return 'roof-inspection';
  if (text.includes('electrical panel')) {
    return text.includes('visual') || text.includes('diy') ? 'electrical-panel-visual' : 'electrical-panel-professional';
  }
  if (text.includes('whole home electrical')) return 'whole-home-electrical';
  if (text.includes('whole home plumbing')) return 'whole-home-plumbing';
  if (text.includes('septic') && (text.includes('inspect') || text.includes('pump'))) return 'septic-inspection';
  if (
    (region === 'Mountain West' || region === 'West Coast') &&
    (text.includes('defensible space') || text.includes('wildfire brush') || text.includes('wildfire season preparation'))
  ) return 'defensible-space';
  if (region === 'West Coast' && text.includes('earthquake')) {
    return text.includes('supplies') || text.includes('kit') ? 'earthquake-kit' : 'earthquake-setup';
  }
  if (region === 'Pacific Northwest' && text.includes('moss')) return 'moss-treatment';
  if (region === 'Pacific Northwest' && text.includes('roof clean')) return 'roof-cleaning';
  return null;
}

function task(
  region: string,
  key: CanonicalTaskKey,
  title: string,
  description: string,
  recurrence: MaintenanceRecurrence,
  options: Pick<MaintenanceTaskItem, 'priority' | 'appliesWhen'> = {},
): MaintenanceTaskItem {
  return {
    id: `us-${slug(region)}-${key}`,
    title,
    description,
    recurrence,
    priority: options.priority ?? 'medium',
    appliesWhen: options.appliesWhen,
  };
}

function canonicalTasks(region: string): MaintenanceTaskItem[] {
  const southwestFilterEvents: MaintenanceEventGuidance[] | undefined = region === 'Southwest'
    ? [
        { event: 'dust_storm', timing: 'Immediately after the event', guidance: 'Inspect and replace the filter if dust-loaded.' },
        { event: 'monsoon', timing: 'Immediately after the event', guidance: 'Inspect the filter and verify airflow after wind-driven dust.' },
      ]
    : undefined;
  const filterDescription = region === 'Southwest'
    ? 'Inspect the HVAC filter every month. Standard homes commonly need replacement every 30-60 days; use 20-45 days with pets or allergies and 20-30 days near unpaved roads or construction. Replace at least every 30 days from June through September and inspect immediately after any monsoon or dust storm.'
    : region === 'Southeast'
      ? 'Inspect the HVAC filter every month. A 45-60 day replacement interval is a reasonable baseline, but replace monthly from spring through September when humidity, pollen, and cooling demand are highest.'
      : region === 'West Coast'
        ? 'Inspect the HVAC filter monthly because dust, smoke, and long cooling seasons can load filters quickly. Replace sooner whenever airflow drops or the filter is visibly dirty.'
        : 'Inspect the HVAC filter monthly and replace it when dirty. Manufacturer guidance commonly ranges from one to three months; monthly checks safely catch pets, allergies, smoke, dust, and heavy system use.';

  const result: MaintenanceTaskItem[] = [
    task(region, 'smoke-co-test', 'Test smoke and carbon monoxide detectors',
      'Press the test button on every smoke and carbon monoxide detector each month. This is separate from the twice-yearly battery replacement.',
      { frequency: 'monthly' }, { priority: 'high' }),
    task(region, 'smoke-co-batteries', 'Replace smoke and carbon monoxide detector batteries',
      'Replace removable detector batteries at the spring and fall Daylight Saving time changes. Do not open sealed ten-year batteries; replace the alarm at end of life.',
      { frequency: 'biannual', months: [3, 11], notes: 'Tied to Daylight Saving time changes.' }, { priority: 'high' }),
    task(region, 'hvac-filter', 'Check HVAC filter', filterDescription,
      { frequency: 'monthly', eventGuidance: southwestFilterEvents },
      { priority: region === 'Southwest' || region === 'West Coast' ? 'high' : 'medium' }),
    task(region, 'washing-machine-filter', 'Clean washing machine drain filter',
      'Clean the washing machine drain or pump filter once per season. Follow the appliance manual, drain residual water safely, remove debris, and confirm the filter seals without leaking.',
      { frequency: 'quarterly', months: QUARTERLY_MONTHS }),
    task(region, 'chimney-inspection', 'Inspect chimney and fireplace',
      'Have every in-use chimney, fireplace, or wood stove inspected annually under NFPA 211 guidance. Clean or repair it when inspection finds deposits, blockage, or damage.',
      { frequency: 'annual', months: [9] }, { priority: 'high', appliesWhen: ['wood-stove'] }),
    task(region, 'dryer-vent-cleaning', 'Clean dryer vent',
      'Clean the full dryer exhaust path annually, including the exterior termination. Remove lint restrictions and verify the flap opens freely.',
      { frequency: 'annual', months: [5] }, { priority: 'high' }),
    task(region, 'electrical-panel-visual', 'Visually check electrical panel',
      'Once a year, perform a no-contact visual check for rust, scorching, buzzing, heat, loose covers, water intrusion, or frequent trips. Do not remove the dead front.',
      { frequency: 'annual', months: [1] }, { priority: 'high' }),
    task(region, 'electrical-panel-professional', 'Professional electrical panel inspection',
      'Have a licensed electrician inspect the panel every 10 years. Inspect sooner only when the panel is 40 or more years old, has known unsafe equipment, or the annual visual check finds warning signs.',
      { frequency: 'every_10_years', months: [1] }),
    task(region, 'whole-home-electrical', 'Whole-home electrical inspection',
      'Schedule a licensed whole-home electrical inspection every three years, the cautious end of the common three-to-five-year range.',
      { frequency: 'every_3_years', months: [1] }),
    task(region, 'whole-home-plumbing', 'Whole-home plumbing inspection',
      'Inspect supply lines, drains, exposed piping, fixtures, shutoffs, and water pressure annually. Escalate leaks, corrosion, or pressure problems to a plumber.',
      { frequency: 'annual', months: [2] }),
    task(region, 'septic-inspection', 'Inspect and pump septic system',
      'Have the septic system inspected and pumped as needed every three years, using the cautious end of the standard three-to-five-year range.',
      { frequency: 'every_3_years', months: [4] }, { appliesWhen: ['septic'] }),
  ];

  if (['Northeast', 'Southeast', 'Midwest'].includes(region)) {
    result.push(task(region, 'sump-pump-test', 'Test sump pump',
      'Test the sump pump once per season by adding water to the pit and confirming automatic start, discharge flow, check-valve operation, and backup power where installed.',
      { frequency: 'quarterly', months: QUARTERLY_MONTHS }, { priority: 'high', appliesWhen: ['sump-pump'] }));
  }

  const gutterMonths: Partial<Record<string, number[]>> = {
    Northeast: [4, 11],
    Southeast: [4, 10],
    Midwest: [4, 10],
    'West Coast': [2, 10],
    'Pacific Northwest': [3, 10],
  };
  if (gutterMonths[region]) {
    result.push(task(region, 'gutter-cleaning', 'Clean gutters and downspouts',
      ['Northeast', 'Southeast', 'Midwest'].includes(region)
        ? 'Clean gutters in spring and around leaf drop. Homes under heavy tree cover should make one additional post-leaf-drop check rather than receiving routine paid-service reminders every few months.'
        : 'Keep the established twice-yearly spring/fall cleaning cadence, checking drainage and attachment while debris is removed.',
      { frequency: 'biannual', months: gutterMonths[region] }, { priority: 'high' }));
  }

  result.push(task(region, 'professional-hvac-service', 'Professional HVAC service',
    region === 'Southwest'
      ? 'Schedule AC-focused professional service before peak cooling and again after summer. Do not add unnecessary furnace-heavy service calls in this cooling-dominant climate.'
      : 'Schedule professional HVAC service twice yearly: cooling equipment in spring and heating equipment in fall. Do not inflate paid service beyond this cadence unless a fault is present.',
    { frequency: 'biannual', months: region === 'Southwest' ? [3, 10] : SPRING_FALL_MONTHS }, { priority: 'high' }));

  if (['Northeast', 'Southeast', 'Midwest'].includes(region)) {
    result.push(task(region, 'humidity-monitoring', 'Check indoor humidity',
      'Check relative humidity at peak summer and the start of heating season. Target roughly 30-40% in winter and 40-50% in summer while avoiding condensation and mold.',
      { frequency: 'biannual', months: [7, 10] }));
  }

  result.push(task(region, 'water-heater-flush', 'Flush water heater',
    region === 'Southwest'
      ? 'Flush a tank-style water heater twice yearly because hard water accelerates sediment buildup. Follow manufacturer instructions.'
      : 'Flush a tank-style water heater annually. Increase to twice yearly for unusually hard water or tanks older than eight years when the manufacturer permits it.',
    region === 'Southwest'
      ? { frequency: 'biannual', months: [3, 9], notes: 'Hard-water regional baseline.' }
      : { frequency: 'annual', months: [4], notes: 'Use twice yearly for hard water or tanks over eight years old.' },
    { appliesWhen: ['water-heater'] }));

  const stormExposed = ['Northeast', 'Southeast', 'Midwest'].includes(region);
  const hailGuidance: MaintenanceEventGuidance[] | undefined = region === 'Midwest'
    ? [{ event: 'hailstorm', timing: 'Inspect within 24-48 hours and recheck 3-6 months later', guidance: 'Document visible damage promptly; latent hail damage may appear months later.' }]
    : undefined;
  result.push(task(region, 'roof-inspection', 'Inspect roof',
    stormExposed
      ? 'Inspect annually because regional wind, hail, hurricanes, snow, or ice increase exposure. Inspect sooner after major weather or when leaks appear.'
      : 'Use a professional inspection every three years as the mild-climate baseline. Inspect sooner when the roof is aging, leaking, or has experienced significant weather.',
    { frequency: stormExposed ? 'annual' : 'every_3_years', months: [4], eventGuidance: hailGuidance }, { priority: 'high' }));

  if (region === 'Midwest') {
    result.push(task(region, 'hail-roof-followup', 'Inspect roof after a hailstorm',
      'After any hailstorm, inspect within 24-48 hours and schedule a follow-up 3-6 months later because some damage becomes visible only after weathering.',
      { frequency: 'one_time', eventOnly: true, eventGuidance: hailGuidance }, { priority: 'high' }));
  }
  if (region === 'Southeast') {
    result.push(task(region, 'termite-inspection', 'Annual termite inspection',
      'Schedule a professional termite inspection annually. In high-pressure sub-areas or where prior activity, moisture, or wood-to-soil contact raises risk, use a six-to-nine-month interval.',
      { frequency: 'annual', months: [4], notes: 'Use a 6-9 month interval in high-pressure sub-areas.' }, { priority: 'high' }));
  }
  if (region === 'Mountain West' || region === 'West Coast') {
    result.push(task(region, 'defensible-space', 'Clear defensible space for wildfire season',
      region === 'West Coast'
        ? 'Complete CAL FIRE-aligned defensible-space and brush clearing in spring. Remove combustible debris, maintain vegetation spacing, and recheck after any extended dry spell.'
        : 'Clear brush, dead vegetation, needles, and other fuels around the home in spring before fire season. Recheck after any extended dry spell.',
      { frequency: 'annual', months: [region === 'West Coast' ? 4 : 5], eventGuidance: [{ event: 'extended_dry_spell', timing: 'After the dry spell', guidance: 'Recheck vegetation, debris, and clearance zones.' }] },
      { priority: 'high' }));
  }
  if (region === 'West Coast') {
    result.push(
      task(region, 'earthquake-setup', 'Complete earthquake-prep setup',
        'One time, verify the gas shutoff arrangement, strap the water heater, and anchor tall furniture and other heavy items. Revisit after remodeling or equipment replacement.',
        { frequency: 'one_time', months: [1] }, { priority: 'high' }),
      task(region, 'earthquake-kit', 'Check earthquake kit batteries and supplies',
        'Annually test flashlights and radios, replace expired batteries, food, water, and medications, and confirm the household emergency plan and shutoff tools remain accessible.',
        { frequency: 'annual', months: [1] }, { priority: 'high' }),
    );
  }
  if (region === 'Pacific Northwest') {
    result.push(
      task(region, 'moss-treatment', 'Treat roof moss',
        'Treat roof moss annually in spring or early fall using a roof-safe method. Heavy-moss or heavy-tree-cover homes may need a second treatment.',
        { frequency: 'annual', months: [4], notes: 'A second early-fall treatment may be appropriate in heavy-moss zones.' }, { priority: 'high' }),
      task(region, 'roof-cleaning', 'Professionally clean the roof',
        'Have the full roof cleaned every three years, the conservative end of the common two-to-three-year range for a paid service. This is distinct from inspection and moss treatment.',
        { frequency: 'every_3_years', months: [9] }),
    );
  }
  return result;
}

function inferYearRoundRecurrence(draft: TaskDraft): MaintenanceRecurrence {
  if (draft.recurrence) return draft.recurrence;
  const text = normalizeText(`${draft.title} ${draft.description}`);
  if (text.includes('monthly')) return { frequency: 'monthly' };
  if (text.includes('quarter')) return { frequency: 'quarterly', months: QUARTERLY_MONTHS };
  if (text.includes('twice yearly') || text.includes('twice a year') || text.includes('biannual')) {
    return { frequency: 'biannual', months: SPRING_FALL_MONTHS };
  }
  if (text.includes('10 years') || text.includes('ten years')) return { frequency: 'every_10_years', months: [1] };
  if (text.includes('3 5 years') || text.includes('three to five years') || text.includes('every 3 years')) {
    return { frequency: 'every_3_years', months: [1] };
  }
  return { frequency: 'annual', months: [1] };
}

function recurringDuplicate(region: string, draft: TaskDraft, months: number[]): MaintenanceTaskItem {
  const uniqueMonths = [...new Set(months)].sort((a, b) => a - b);
  const consecutive = uniqueMonths.every((month, index) => index === 0 || month === uniqueMonths[index - 1] + 1);
  const frequency: MaintenanceRecurrenceFrequency =
    uniqueMonths.length >= 3 && consecutive ? 'monthly'
      : uniqueMonths.length >= 3 ? 'quarterly'
        : uniqueMonths.length === 2 ? 'biannual'
          : 'annual';
  return {
    ...draft,
    id: draft.id ?? `us-${slug(region)}-recurring-${slug(draft.title)}`,
    recurrence: draft.recurrence ?? { frequency, months: uniqueMonths },
  };
}

function normalizeRegion(region: string, raw: RawLocationMaintenanceData): LocationMaintenanceData {
  const aliases = new Map<CanonicalTaskKey, Set<string>>();
  const occurrences = new Map<string, Array<{ month: number; draft: TaskDraft }>>();

  for (const [monthValue, monthData] of Object.entries(raw.monthlyTasks)) {
    const month = Number(monthValue);
    for (const section of ['seasonal', 'weatherSpecific'] as const) {
      for (const draft of monthData[section]) {
        const key = canonicalKey(region, draft.title);
        if (key) {
          const values = aliases.get(key) ?? new Set<string>();
          values.add(draft.title);
          aliases.set(key, values);
          continue;
        }
        const titleKey = normalizeText(draft.title);
        const values = occurrences.get(titleKey) ?? [];
        values.push({ month, draft });
        occurrences.set(titleKey, values);
      }
    }
  }
  for (const draft of raw.yearRoundTasks) {
    const key = canonicalKey(region, draft.title);
    if (!key) continue;
    const values = aliases.get(key) ?? new Set<string>();
    values.add(draft.title);
    aliases.set(key, values);
  }

  const repeated = new Set([...occurrences].filter(([, values]) => values.length > 1).map(([key]) => key));
  const emitted = new Set<string>();
  const recurring: MaintenanceTaskItem[] = [];
  const monthlyTasks: LocationMaintenanceData['monthlyTasks'] = {};

  for (const [monthValue, monthData] of Object.entries(raw.monthlyTasks)) {
    const month = Number(monthValue);
    const normalizedMonth = {
      seasonal: [] as MaintenanceTaskItem[],
      weatherSpecific: [] as MaintenanceTaskItem[],
      priority: monthData.priority,
    };
    for (const section of ['seasonal', 'weatherSpecific'] as const) {
      for (const draft of monthData[section]) {
        if (canonicalKey(region, draft.title)) continue;
        const titleKey = normalizeText(draft.title);
        if (repeated.has(titleKey)) {
          if (!emitted.has(titleKey)) {
            recurring.push(recurringDuplicate(region, draft, (occurrences.get(titleKey) ?? []).map(value => value.month)));
            emitted.add(titleKey);
          }
          continue;
        }
        normalizedMonth[section].push({
          ...draft,
          id: draft.id ?? `us-${slug(region)}-${section}-${slug(draft.title)}`,
          recurrence: draft.recurrence ?? { frequency: 'annual', months: [month] },
        });
      }
    }
    monthlyTasks[month] = normalizedMonth;
  }

  for (const draft of raw.yearRoundTasks) {
    if (canonicalKey(region, draft.title)) continue;
    const titleKey = normalizeText(draft.title);
    if (emitted.has(titleKey)) continue;
    recurring.push({
      ...draft,
      id: draft.id ?? `us-${slug(region)}-recurring-${slug(draft.title)}`,
      recurrence: inferYearRoundRecurrence(draft),
    });
  }

  const standards = canonicalTasks(region).map(value => {
    const key = value.id.replace(`us-${slug(region)}-`, '') as CanonicalTaskKey;
    return { ...value, legacyTitles: [...(aliases.get(key) ?? [])] };
  });
  const seen = new Set<string>();
  const yearRoundTasks = [...recurring, ...standards].filter(value => {
    if (seen.has(value.id)) return false;
    seen.add(value.id);
    return true;
  });

  const addGeneratedContent = (value: MaintenanceTaskItem): MaintenanceTaskItem => {
    const generated = generateTaskContent(value.title, value.description, region);
    return {
      ...value,
      // Nullish checks intentionally preserve catalog-authored values, even
      // when an editor deliberately supplied an empty checklist.
      actionSummary: value.actionSummary ?? generated.actionSummary,
      steps: value.steps ?? generated.steps,
      toolsAndSupplies: value.toolsAndSupplies ?? generated.toolsAndSupplies,
      estimatedTime: value.estimatedTime ?? generated.estimatedTime,
      difficulty: value.difficulty ?? generated.difficulty,
      intentFamily: value.intentFamily ?? generated.intentFamily,
      fallbackUsed: value.fallbackUsed ?? generated.fallbackUsed,
      monitoringOnly: value.monitoringOnly ?? generated.monitoringOnly,
      costApplicability: value.costApplicability ?? generated.costApplicability,
      costEstimate: value.costEstimate ?? generated.costEstimate,
    };
  };

  return {
    region: raw.region,
    climateZone: raw.climateZone,
    monthlyTasks: Object.fromEntries(Object.entries(monthlyTasks).map(([month, monthData]) => [
      month,
      {
        ...monthData,
        seasonal: monthData.seasonal.map(addGeneratedContent),
        weatherSpecific: monthData.weatherSpecific.map(addGeneratedContent),
      },
    ])),
    yearRoundTasks: yearRoundTasks.map(addGeneratedContent),
    specialConsiderations: raw.specialConsiderations,
  };
}

export function normalizeUsMaintenanceData(
  rawData: Record<string, RawLocationMaintenanceData>,
): Record<string, LocationMaintenanceData> {
  return Object.fromEntries(Object.entries(rawData).map(([region, data]) => [region, normalizeRegion(region, data)]));
}

function scheduledForMonth(value: MaintenanceTaskItem, month: number): boolean {
  if (value.recurrence.eventOnly) return false;
  const months = value.recurrence.months;
  return !months || months.length === 0 || months.includes(month);
}

function taskMatchesCompletion(value: MaintenanceTaskItem, completion: MaintenanceCompletionLike): boolean {
  if (completion.taskId && completion.taskId === value.id) return true;
  const title = normalizeText(completion.taskTitle);
  return title === normalizeText(value.title) || (value.legacyTitles ?? []).some(alias => normalizeText(alias) === title);
}

function completedAt(completion: MaintenanceCompletionLike): Date | null {
  if (completion.completedAt) {
    const date = new Date(completion.completedAt);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return completion.year && completion.month ? new Date(completion.year, completion.month - 1, 1) : null;
}

function completionPeriod(completion: MaintenanceCompletionLike): number | null {
  if (completion.year && completion.month) {
    return completion.year * 12 + completion.month - 1;
  }
  const date = completedAt(completion);
  return date ? date.getFullYear() * 12 + date.getMonth() : null;
}

export function isTaskDue(
  value: MaintenanceTaskItem,
  date: Date,
  completions: MaintenanceCompletionLike[] = [],
): boolean {
  if (!scheduledForMonth(value, date.getMonth() + 1)) return false;
  const evaluatedPeriod = date.getFullYear() * 12 + date.getMonth();
  const latest = completions
    .filter(completion => taskMatchesCompletion(value, completion))
    .filter(completion => {
      const period = completionPeriod(completion);
      return period !== null && period <= evaluatedPeriod;
    })
    .map(completedAt)
    .filter((candidate): candidate is Date => candidate !== null)
    .sort((a, b) => b.getTime() - a.getTime())[0];
  if (!latest) return true;
  if (value.recurrence.frequency === 'one_time') return false;
  if (
    value.recurrence.frequency === 'every_3_years' ||
    value.recurrence.frequency === 'every_10_years'
  ) {
    const intervalYears = value.recurrence.frequency === 'every_3_years' ? 3 : 10;
    return date.getFullYear() - latest.getFullYear() >= intervalYears;
  }

  // Calendar-cadenced work becomes due at each configured window. A completion
  // just after last year's slot belongs to that prior cycle and must not suppress
  // the next slot for an extra year.
  const currentWindowStart = new Date(date.getFullYear(), date.getMonth(), 1);
  return latest < currentWindowStart;
}

export function getTasksForMonth(
  data: Record<string, LocationMaintenanceData>,
  region: string,
  month: number,
) {
  const regionData = data[region];
  const monthData = regionData?.monthlyTasks[month];
  if (!regionData || !monthData) return null;
  const recurring = regionData.yearRoundTasks.filter(value => scheduledForMonth(value, month));
  return {
    ...monthData,
    seasonal: [...monthData.seasonal, ...recurring],
    weatherSpecific: [...monthData.weatherSpecific],
  };
}

export function getDueTasksForMonth(
  data: Record<string, LocationMaintenanceData>,
  region: string,
  date: Date,
  completions: MaintenanceCompletionLike[] = [],
) {
  const projected = getTasksForMonth(data, region, date.getMonth() + 1);
  if (!projected) return null;
  return {
    ...projected,
    seasonal: projected.seasonal.filter(value => isTaskDue(value, date, completions)),
    weatherSpecific: projected.weatherSpecific.filter(value => isTaskDue(value, date, completions)),
  };
}