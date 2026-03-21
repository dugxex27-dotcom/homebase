import { db } from './db';
import { eq, and, inArray } from 'drizzle-orm';
import { users, houses, notificationPreferences, weatherAlertsSent } from '@shared/schema';
import { sendWeatherAlertEmail } from './email-service';
import { smsService } from './sms-service';
import { geocodeAddress } from './geocoding-service';
import { isDemoId } from './storage';

const SEVERE_WEATHER_EVENT_TYPES = new Set([
  'Tornado Warning',
  'Tornado Watch',
  'Severe Thunderstorm Warning',
  'Severe Thunderstorm Watch',
  'Flash Flood Warning',
  'Flash Flood Watch',
  'Flood Warning',
  'Hurricane Warning',
  'Hurricane Watch',
  'Tropical Storm Warning',
  'Tropical Storm Watch',
  'Winter Storm Warning',
  'Blizzard Warning',
  'Ice Storm Warning',
  'Extreme Cold Warning',
  'Extreme Heat Warning',
  'High Wind Warning',
  'Dust Storm Warning',
  'Tsunami Warning',
  'Earthquake Warning',
  'Tsunami Watch',
  'Special Weather Statement',
  'Dense Fog Advisory',
  'Wind Advisory',
  'Winter Weather Advisory',
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

async function hasAlreadySentAlert(userId: string, nwsAlertId: string): Promise<boolean> {
  const existing = await db.select({ id: weatherAlertsSent.id })
    .from(weatherAlertsSent)
    .where(and(
      eq(weatherAlertsSent.userId, userId),
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

async function isWeatherAlertEnabled(userId: string): Promise<boolean> {
  const prefs = await db.select()
    .from(notificationPreferences)
    .where(and(
      eq(notificationPreferences.userId, userId),
      eq(notificationPreferences.notificationType, 'weather')
    ))
    .limit(1);

  if (prefs.length === 0) return true;
  return prefs[0].isEnabled;
}

async function getOrGeocodeHouse(house: { id: string; address: string; latitude: string | null; longitude: string | null }) {
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

      const enabled = await isWeatherAlertEnabled(homeowner.id);
      if (!enabled) continue;

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
          const coords = await getOrGeocodeHouse(house as any);
          if (!coords) {
            console.log(`[WEATHER] Could not geocode house ${house.id}: ${house.address}`);
            continue;
          }

          const alerts = await getActiveAlerts(coords.latitude, coords.longitude);

          for (const alert of alerts) {
            const alreadySent = await hasAlreadySentAlert(homeowner.id, alert.id);
            if (alreadySent) continue;

            const { event, headline, description, severity, urgency, expires } = alert.properties;

            const emailSent = await sendWeatherAlertEmail(
              homeowner.id,
              house.name,
              house.address,
              event,
              headline || event,
              description || '',
              severity || 'Unknown',
              urgency || 'Unknown',
              expires || ''
            );

            await smsService.sendWeatherAlertSMS(
              homeowner.id,
              house.name,
              event,
              headline || event,
              severity || 'Unknown'
            );

            await recordAlertSent(homeowner.id, house.id, alert.id, event);

            if (emailSent) alertsSent++;
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
      .where(eq(weatherAlertsSent.sentAt, thirtyDaysAgo));
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
