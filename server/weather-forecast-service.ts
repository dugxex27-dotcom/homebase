import { db } from './db';
import { eq, or, ilike, and, gte } from 'drizzle-orm';
import { maintenanceTasks, customMaintenanceTasks, taskCompletions } from '@shared/schema';

export type WeatherTrigger = 'hard_freeze' | 'heavy_rain' | 'high_winds' | 'extreme_heat' | 'snow_storm';

export interface ForecastTriggerResult {
  trigger: WeatherTrigger;
  description: string;
  expectedDate: string;
  temperatureF?: number;
}

export interface RelevantTask {
  id: string;
  title: string;
  category: string;
  priority: string;
  taskType: 'maintenance' | 'custom';
}

interface NWSPoint {
  properties: {
    forecast: string;
    forecastHourly: string;
    gridId: string;
    gridX: number;
    gridY: number;
    relativeLocation: {
      properties: {
        city: string;
        state: string;
      };
    };
  };
}

interface ForecastPeriod {
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  windSpeed: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation: { value: number | null } | null;
}

interface NWSForecast {
  properties: {
    periods: ForecastPeriod[];
  };
}

const TRIGGER_KEYWORDS: Record<WeatherTrigger, string[]> = {
  hard_freeze: ['winteriz', 'pipe', 'sprinkler', 'hose bib', 'faucet', 'weatherstrip', 'draft', 'heating', 'furnace', 'boiler', 'insulat', 'caulk', 'seal', 'freeze', 'outdoor'],
  heavy_rain: ['sump pump', 'gutter', 'downspout', 'drain', 'flood', 'basement water', 'grading', 'runoff', 'french drain', 'window well'],
  high_winds: ['roof', 'shutter', 'tree', 'trim', 'branch', 'loose', 'secure', 'anchor', 'awning', 'fence'],
  extreme_heat: ['hvac', 'air condition', 'cooling', 'fan', 'attic', 'ventil', 'filter', 'refrigerant', 'condenser'],
  snow_storm: ['furnace', 'heating', 'generator', 'walkway', 'driveway', 'ice', 'snow', 'shovel', 'salt', 'de-ice'],
};

export async function getWeatherForecast(latitude: number, longitude: number): Promise<ForecastPeriod[]> {
  try {
    const pointUrl = `https://api.weather.gov/points/${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const pointRes = await fetch(pointUrl, {
      headers: {
        'User-Agent': 'HomeBase-App/1.0 (support@gotohomebase.com)',
        'Accept': 'application/geo+json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!pointRes.ok) {
      console.warn(`[FORECAST] NWS points API returned ${pointRes.status} for ${latitude},${longitude}`);
      return [];
    }

    const pointData: NWSPoint = await pointRes.json();
    const forecastUrl = pointData.properties?.forecast;
    if (!forecastUrl) {
      console.warn(`[FORECAST] No forecast URL returned for ${latitude},${longitude}`);
      return [];
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    const forecastRes = await fetch(forecastUrl, {
      headers: {
        'User-Agent': 'HomeBase-App/1.0 (support@gotohomebase.com)',
        'Accept': 'application/geo+json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!forecastRes.ok) {
      console.warn(`[FORECAST] Forecast URL returned ${forecastRes.status}`);
      return [];
    }

    const forecastData: NWSForecast = await forecastRes.json();
    return forecastData.properties?.periods || [];
  } catch (error) {
    console.error(`[FORECAST] Error fetching forecast for ${latitude},${longitude}:`, error);
    return [];
  }
}

export function detectForecastTriggers(periods: ForecastPeriod[]): ForecastTriggerResult[] {
  const triggers: ForecastTriggerResult[] = [];
  const next5Days = periods.slice(0, 10);

  let hardFreezeFound = false;
  let heavyRainFound = false;
  let highWindsFound = false;
  let extremeHeatFound = false;
  let snowStormFound = false;

  for (const period of next5Days) {
    const forecastText = (period.shortForecast + ' ' + period.detailedForecast).toLowerCase();
    const tempF = period.temperatureUnit === 'F' ? period.temperature : (period.temperature * 9/5 + 32);

    if (!hardFreezeFound && !period.isDaytime && tempF <= 28) {
      hardFreezeFound = true;
      triggers.push({
        trigger: 'hard_freeze',
        description: `Hard freeze expected — temperatures dropping to ${period.temperature}°${period.temperatureUnit}`,
        expectedDate: period.name,
        temperatureF: tempF,
      });
    }

    const precipProb = period.probabilityOfPrecipitation?.value ?? 0;
    if (!heavyRainFound && precipProb >= 60 && (forecastText.includes('rain') || forecastText.includes('shower'))) {
      heavyRainFound = true;
      triggers.push({
        trigger: 'heavy_rain',
        description: `Heavy rain expected — ${precipProb}% chance of precipitation`,
        expectedDate: period.name,
      });
    }

    if (!highWindsFound) {
      const windText = period.windSpeed.toLowerCase();
      const windMatch = windText.match(/(\d+)\s*(to\s*(\d+))?\s*mph/);
      if (windMatch) {
        const windMax = windMatch[3] ? parseInt(windMatch[3]) : parseInt(windMatch[1]);
        if (windMax >= 40) {
          highWindsFound = true;
          triggers.push({
            trigger: 'high_winds',
            description: `High winds expected — ${period.windSpeed}`,
            expectedDate: period.name,
          });
        }
      }
    }

    if (!extremeHeatFound && period.isDaytime && tempF >= 100) {
      extremeHeatFound = true;
      triggers.push({
        trigger: 'extreme_heat',
        description: `Extreme heat expected — temperatures reaching ${period.temperature}°${period.temperatureUnit}`,
        expectedDate: period.name,
        temperatureF: tempF,
      });
    }

    if (!snowStormFound && (forecastText.includes('snow') || forecastText.includes('sleet') || forecastText.includes('blizzard') || forecastText.includes('ice storm'))) {
      snowStormFound = true;
      triggers.push({
        trigger: 'snow_storm',
        description: `${period.shortForecast} expected`,
        expectedDate: period.name,
      });
    }
  }

  return triggers;
}

export async function findRelevantOverdueTasks(
  homeownerId: string,
  houseId: string,
  triggers: ForecastTriggerResult[]
): Promise<Map<WeatherTrigger, RelevantTask[]>> {
  const result = new Map<WeatherTrigger, RelevantTask[]>();

  if (triggers.length === 0) return result;

  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const recentCompletions = await db.select({
    taskTitle: taskCompletions.taskTitle,
    taskId: taskCompletions.taskId,
    taskCategory: taskCompletions.taskCategory,
    completedAt: taskCompletions.completedAt,
  })
    .from(taskCompletions)
    .where(and(
      eq(taskCompletions.homeownerId, homeownerId),
      eq(taskCompletions.houseId, houseId),
      gte(taskCompletions.completedAt, twelveMonthsAgo)
    ));

  const recentTitleSet = new Set(recentCompletions.map(c => c.taskTitle.toLowerCase()));

  for (const triggerResult of triggers) {
    const keywords = TRIGGER_KEYWORDS[triggerResult.trigger];
    if (!keywords || keywords.length === 0) continue;

    const matchedTasks: RelevantTask[] = [];

    const orConditions = keywords.map(kw =>
      or(
        ilike(maintenanceTasks.title, `%${kw}%`),
        ilike(maintenanceTasks.category, `%${kw}%`)
      )
    );

    const standardTasks = await db.select({
      id: maintenanceTasks.id,
      title: maintenanceTasks.title,
      category: maintenanceTasks.category,
      priority: maintenanceTasks.priority,
    })
      .from(maintenanceTasks)
      .where(or(...orConditions))
      .limit(10);

    for (const task of standardTasks) {
      if (!recentTitleSet.has(task.title.toLowerCase())) {
        matchedTasks.push({ ...task, taskType: 'maintenance' });
      }
    }

    const customOrConditions = keywords.map(kw =>
      or(
        ilike(customMaintenanceTasks.title, `%${kw}%`),
        ilike(customMaintenanceTasks.category, `%${kw}%`)
      )
    );

    const customTasks = await db.select({
      id: customMaintenanceTasks.id,
      title: customMaintenanceTasks.title,
      category: customMaintenanceTasks.category,
      priority: customMaintenanceTasks.priority,
    })
      .from(customMaintenanceTasks)
      .where(and(
        eq(customMaintenanceTasks.homeownerId, homeownerId),
        eq(customMaintenanceTasks.isActive, true),
        or(...customOrConditions)!
      ))
      .limit(5);

    for (const task of customTasks) {
      if (!recentTitleSet.has(task.title.toLowerCase())) {
        matchedTasks.push({
          id: task.id,
          title: task.title,
          category: task.category,
          priority: task.priority,
          taskType: 'custom',
        });
      }
    }

    if (matchedTasks.length > 0) {
      const uniqueTasks = matchedTasks.filter(
        (task, idx, arr) => arr.findIndex(t => t.title.toLowerCase() === task.title.toLowerCase()) === idx
      ).slice(0, 6);
      result.set(triggerResult.trigger, uniqueTasks);
    }
  }

  return result;
}

export const TRIGGER_DISPLAY: Record<WeatherTrigger, { emoji: string; label: string }> = {
  hard_freeze:  { emoji: '🧊', label: 'Hard Freeze' },
  heavy_rain:   { emoji: '🌧️', label: 'Heavy Rain' },
  high_winds:   { emoji: '💨', label: 'High Winds' },
  extreme_heat: { emoji: '🌡️', label: 'Extreme Heat' },
  snow_storm:   { emoji: '❄️', label: 'Snow/Ice Storm' },
};
