import { db } from './db';
import { eq, and, lt } from 'drizzle-orm';
import { users, houses, notificationPreferences, weatherAlertsSent } from '@shared/schema';
import { sendWeatherAlertEmail } from './email-service';
import { smsService } from './sms-service';
import { pushNotificationService } from './push-notification-service';
import { geocodeAddress } from './geocoding-service';
import { isDemoId } from './storage';

const SEVERE_WEATHER_EVENT_TYPES = new Set([
  'Tornado Warning',
  'Tornado Watch',
  'Severe Thunderstorm Warning',
  'Flash Flood Warning',
  'Flash Flood Watch',
  'Hurricane Warning',
  'Hurricane Watch',
  'Winter Storm Warning',
  'Blizzard Warning',
  'Ice Storm Warning',
  'Freeze Warning',
  'High Wind Warning',
  'Extreme Heat Warning',
]);

interface NWSAlert {
  id: string;
  properties: {
    event: string;
    headline: string;
    description: string;
    severity: string;
    urgency: string;
    expires: string;
    effective: string;
    status: string;
    messageType: string;
  };
}

interface NWSAlertsResponse {
  features: NWSAlert[];
}

interface HouseRow {
  id: string;
  name: string;
  address: string;
  latitude: string | null;
  longitude: string | null;
}

interface WeatherChannelPrefs {
  enabled: boolean;
  email: boolean;
  sms: boolean;
  push: boolean;
}

async function getActiveAlerts(latitude: number, longitude: number): Promise<NWSAlert[]> {
  try {
    const url = `https://api.weather.gov/alerts/active?point=${latitude.toFixed(4)},${longitude.toFixed(4)}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'HomeBase-App/1.0 (support@gotohomebase.com)',
        'Accept': 'application/geo+json',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      console.warn(`[WEATHER] NWS API returned ${response.status} for ${latitude},${longitude}`);
      return [];
    }

    const data: NWSAlertsResponse = await response.json();
    return (data.features || []).filter(f =>
      f.properties.status === 'Actual' &&
      f.properties.messageType !== 'Cancel' &&
      SEVERE_WEATHER_EVENT_TYPES.has(f.properties.event)
    );
  } catch (error) {
    console.error(`[WEATHER] Error fetching alerts for ${latitude},${longitude}:`, error);
    return [];
  }
}

async function hasAlreadySentAlert(userId: string, houseId: string, nwsAlertId: string): Promise<boolean> {
  const existing = await db.select({ id: weatherAlertsSent.id })
    .from(weatherAlertsSent)
    .where(and(
      eq(weatherAlertsSent.userId, userId),
      eq(weatherAlertsSent.houseId, houseId),
      eq(weatherAlertsSent.nwsAlertId, nwsAlertId)
    ))
    .limit(1);
  return existing.length > 0;
}

async function recordAlertSent(userId: string, houseId: string, nwsAlertId: string, alertEvent: string): Promise<void> {
  try {
    await db.insert(weatherAlertsSent).values({
      userId,
      houseId,
      nwsAlertId,
      alertEvent,
    }).onConflictDoNothing();
  } catch (error) {
    console.error('[WEATHER] Error recording alert sent:', error);
  }
}

async function getWeatherChannelPrefs(userId: string): Promise<WeatherChannelPrefs> {
  const rows = await db.select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId));

  const byType = new Map(rows.map(r => [r.notificationType, r]));

  const weatherPref = byType.get('weather');
  const emailPref = byType.get('email');
  const smsPref = byType.get('sms');

  const weatherEnabled = weatherPref ? weatherPref.isEnabled : true;

  const emailEnabled = emailPref ? emailPref.isEnabled : true;
  const smsEnabled = smsPref ? smsPref.isEnabled : false;

  const pushEnabled = weatherPref ? weatherPref.channels.includes('push') : true;

  return {
    enabled: weatherEnabled,
    email: weatherEnabled && emailEnabled,
    sms: weatherEnabled && smsEnabled,
    push: weatherEnabled && pushEnabled,
  };
}

async function getOrGeocodeHouse(house: HouseRow): Promise<{ latitude: number; longitude: number } | null> {
  if (house.latitude && house.longitude) {
    const lat = parseFloat(house.latitude);
    const lon = parseFloat(house.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      return { latitude: lat, longitude: lon };
    }
  }
  return await geocodeAddress(house.address);
}

async function checkWeatherAlertsForAllHomes(): Promise<void> {
  console.log('[WEATHER] Starting weather alert check...');

  try {
    const homeowners = await db.select({ id: users.id, email: users.email })
      .from(users)
      .where(eq(users.role, 'homeowner'));

    let processed = 0;
    let alertsSent = 0;

    for (const homeowner of homeowners) {
      if (isDemoId(homeowner.id)) continue;
      if (!homeowner.email) continue;

      const channelPrefs = await getWeatherChannelPrefs(homeowner.id);
      if (!channelPrefs.enabled) continue;

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
            console.log(`[WEATHER] Could not geocode house ${house.id}: ${house.address}`);
            continue;
          }

          const alerts = await getActiveAlerts(coords.latitude, coords.longitude);

          for (const alert of alerts) {
            const alreadySent = await hasAlreadySentAlert(homeowner.id, house.id, alert.id);
            if (alreadySent) continue;

            const { event, headline, description, severity, urgency, expires } = alert.properties;

            const sends: Promise<boolean>[] = [];

            if (channelPrefs.email) {
              sends.push(sendWeatherAlertEmail(
                homeowner.id,
                house.name,
                house.address,
                event,
                headline || event,
                description || '',
                severity || 'Unknown',
                urgency || 'Unknown',
                expires || ''
              ));
            }

            if (channelPrefs.sms) {
              sends.push(smsService.sendWeatherAlertSMS(
                homeowner.id,
                house.name,
                event,
                headline || event,
                severity || 'Unknown'
              ));
            }

            if (channelPrefs.push) {
              sends.push(pushNotificationService.sendToUser(homeowner.id, {
                title: `⚠️ Weather Alert: ${event}`,
                body: `${house.name}: ${headline || event}`,
                data: { type: 'weather_alert', houseId: house.id },
              }));
            }

            await Promise.allSettled(sends);
            await recordAlertSent(homeowner.id, house.id, alert.id, event);
            alertsSent++;
            console.log(`[WEATHER] Sent ${event} alert to homeowner ${homeowner.id} for house ${house.id}`);
          }

          await new Promise(resolve => setTimeout(resolve, 1100));
        } catch (houseError) {
          console.error(`[WEATHER] Error processing house ${house.id}:`, houseError);
        }
      }

      processed++;
    }

    console.log(`[WEATHER] Check complete — ${processed} homeowners processed, ${alertsSent} alerts sent`);
  } catch (error) {
    console.error('[WEATHER] Fatal error in weather alert check:', error);
  }
}

async function cleanupOldAlerts(): Promise<void> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await db.delete(weatherAlertsSent)
      .where(lt(weatherAlertsSent.sentAt, thirtyDaysAgo));
    console.log('[WEATHER] Cleaned up old alert records');
  } catch (error) {
    console.error('[WEATHER] Error cleaning up old alerts:', error);
  }
}

const CHECK_INTERVAL_MS = 2 * 60 * 60 * 1000;

export const weatherAlertScheduler = {
  start() {
    console.log('[WEATHER] Weather alert scheduler started (2-hour interval)');

    setTimeout(async () => {
      await checkWeatherAlertsForAllHomes();
    }, 30 * 1000);

    setInterval(async () => {
      await checkWeatherAlertsForAllHomes();
    }, CHECK_INTERVAL_MS);

    setInterval(async () => {
      await cleanupOldAlerts();
    }, 24 * 60 * 60 * 1000);
  },
};
