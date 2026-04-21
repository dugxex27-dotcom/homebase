import { db } from './db';
import { eq, and, gte } from 'drizzle-orm';
import { users, houses, notificationPreferences, weatherForecastRemindersSent } from '@shared/schema';
import { geocodeAddress } from './geocoding-service';
import { isDemoId } from './storage';
import { storage } from './storage';
import {
  getWeatherForecast,
  detectForecastTriggers,
  findRelevantOverdueTasks,
  TRIGGER_DISPLAY,
  type WeatherTrigger,
  type ForecastTriggerResult,
  type RelevantTask,
} from './weather-forecast-service';
import { sendWeatherForecastReminderEmail } from './email-service';
import { smsService } from './sms-service';
import { pushNotificationService } from './push-notification-service';

interface HouseRow {
  id: string;
  name: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
}

async function getOrGeocodeHouse(house: HouseRow): Promise<{ latitude: number; longitude: number } | null> {
  if (house.latitude && house.longitude) {
    const lat = parseFloat(house.latitude);
    const lon = parseFloat(house.longitude);
    if (!isNaN(lat) && !isNaN(lon)) return { latitude: lat, longitude: lon };
  }
  return await geocodeAddress(house.address);
}

async function getForecastReminderPrefs(userId: string): Promise<{ enabled: boolean; email: boolean; sms: boolean; push: boolean }> {
  const rows = await db.select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const byType = new Map(rows.map(r => [r.notificationType, r]));

  const forecastPref = byType.get('weather_forecast_reminders');
  const emailPref = byType.get('email');
  const smsPref = byType.get('sms');

  const enabled = forecastPref ? forecastPref.isEnabled : true;
  const emailEnabled = emailPref ? emailPref.isEnabled : true;
  const smsEnabled = smsPref ? smsPref.isEnabled : false;
  const pushEnabled = forecastPref ? forecastPref.channels.includes('push') : true;

  return {
    enabled,
    email: enabled && emailEnabled,
    sms: enabled && smsEnabled,
    push: enabled && pushEnabled,
  };
}

async function hasAlreadySentForecastReminder(userId: string, houseId: string, triggerType: WeatherTrigger): Promise<boolean> {
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  const existing = await db.select({ id: weatherForecastRemindersSent.id })
    .from(weatherForecastRemindersSent)
    .where(and(
      eq(weatherForecastRemindersSent.userId, userId),
      eq(weatherForecastRemindersSent.houseId, houseId),
      eq(weatherForecastRemindersSent.triggerType, triggerType),
      gte(weatherForecastRemindersSent.sentAt, threeDaysAgo)
    ))
    .limit(1);

  return existing.length > 0;
}

async function recordForecastReminderSent(userId: string, houseId: string, triggerType: WeatherTrigger): Promise<void> {
  try {
    await db.insert(weatherForecastRemindersSent).values({ userId, houseId, triggerType });
  } catch (error) {
    console.error('[FORECAST] Error recording reminder sent:', error);
  }
}

async function cleanupOldReminders(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await db.delete(weatherForecastRemindersSent)
      .where(eq(weatherForecastRemindersSent.sentAt, thirtyDaysAgo));
    console.log('[FORECAST] Cleaned up old forecast reminder records');
  } catch (error) {
    console.error('[FORECAST] Error cleaning up old reminders:', error);
  }
}

async function checkForecastRemindersForAllHomes(): Promise<void> {
  console.log('[FORECAST] Starting weather forecast maintenance reminder check...');

  try {
    const homeowners = await db.select({ id: users.id, email: users.email, firstName: users.firstName })
      .from(users)
      .where(eq(users.role, 'homeowner'));

    let processed = 0;
    let remindersSent = 0;

    for (const homeowner of homeowners) {
      if (isDemoId(homeowner.id)) continue;

      const prefs = await getForecastReminderPrefs(homeowner.id);
      if (!prefs.enabled) continue;

      const userHouses = await db.select({
        id: houses.id,
        name: houses.name,
        address: houses.address,
        latitude: houses.latitude,
        longitude: houses.longitude,
      })
        .from(houses)
        .where(eq(houses.homeownerId, homeowner.id));

      for (const house of userHouses) {
        try {
          const coords = await getOrGeocodeHouse(house);
          if (!coords) {
            console.log(`[FORECAST] Could not geocode house ${house.id}`);
            continue;
          }

          const forecastPeriods = await getWeatherForecast(coords.latitude, coords.longitude);
          if (!forecastPeriods.length) continue;

          const triggers = detectForecastTriggers(forecastPeriods);
          if (!triggers.length) continue;

          const tasksByTrigger = await findRelevantOverdueTasks(homeowner.id, house.id, triggers);

          for (const triggerResult of triggers) {
            const tasks = tasksByTrigger.get(triggerResult.trigger);
            if (!tasks || tasks.length === 0) continue;

            const alreadySent = await hasAlreadySentForecastReminder(homeowner.id, house.id, triggerResult.trigger);
            if (alreadySent) {
              console.log(`[FORECAST] Already sent ${triggerResult.trigger} reminder for house ${house.id} — skipping`);
              continue;
            }

            const display = TRIGGER_DISPLAY[triggerResult.trigger];
            const sends: Promise<boolean>[] = [];

            if (prefs.email) {
              sends.push(sendWeatherForecastReminderEmail(
                homeowner.id,
                house.name,
                house.address,
                triggerResult,
                tasks
              ));
            }

            if (prefs.sms) {
              sends.push(smsService.sendWeatherForecastReminderSMS(
                homeowner.id,
                house.name,
                triggerResult,
                tasks
              ));
            }

            if (prefs.push) {
              const taskList = tasks.slice(0, 3).map(t => t.title).join(', ');
              sends.push(pushNotificationService.sendToUser(homeowner.id, {
                title: `${display.emoji} ${display.label} Coming — ${house.name}`,
                body: `${tasks.length} maintenance task${tasks.length > 1 ? 's' : ''} need attention before ${triggerResult.expectedDate.toLowerCase()}: ${taskList}`,
                data: { type: 'weather_forecast_reminder', houseId: house.id, trigger: triggerResult.trigger },
              }));
            }

            if (sends.length === 0) continue;

            const results = await Promise.allSettled(sends);
            const anySucceeded = results.some(r => r.status === 'fulfilled' && r.value === true);

            if (anySucceeded) {
              await recordForecastReminderSent(homeowner.id, house.id, triggerResult.trigger);
              remindersSent++;
              console.log(`[FORECAST] Sent ${triggerResult.trigger} reminder for homeowner ${homeowner.id} house ${house.id} (${tasks.length} tasks)`);
            } else {
              console.warn(`[FORECAST] All channels failed for ${triggerResult.trigger} reminder to homeowner ${homeowner.id}`);
            }
          }

          await new Promise(resolve => setTimeout(resolve, 1200));
        } catch (houseError) {
          console.error(`[FORECAST] Error processing house ${house.id}:`, houseError);
        }
      }

      processed++;
    }

    console.log(`[FORECAST] Check complete — ${processed} homeowners processed, ${remindersSent} reminders sent`);
  } catch (error) {
    console.error('[FORECAST] Fatal error in forecast reminder check:', error);
  }
}

function getMillisecondsUntil8AM(): number {
  const now = new Date();
  const next8AM = new Date();
  next8AM.setHours(8, 0, 0, 0);
  if (next8AM <= now) {
    next8AM.setDate(next8AM.getDate() + 1);
  }
  return next8AM.getTime() - now.getTime();
}

export const weatherForecastReminderScheduler = {
  start() {
    console.log('[FORECAST] Weather forecast reminder scheduler started (daily at 8 AM)');

    const msUntil8AM = getMillisecondsUntil8AM();
    console.log(`[FORECAST] First run in ${Math.round(msUntil8AM / 1000 / 60)} minutes`);

    setTimeout(async () => {
      await checkForecastRemindersForAllHomes();

      setInterval(async () => {
        await checkForecastRemindersForAllHomes();
      }, 24 * 60 * 60 * 1000);
    }, msUntil8AM);

    setInterval(async () => {
      await cleanupOldReminders();
    }, 24 * 60 * 60 * 1000);
  },
};
