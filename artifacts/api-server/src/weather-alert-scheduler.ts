import { db } from './db';
import { eq, and, lt } from 'drizzle-orm';
import { users, houses, notificationPreferences, weatherAlertsSent } from '@workspace/db';
import { sendWeatherAlertEmail, getPreparednessInfo } from './email-service';
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
  enabledAlertTypes: string[]; // empty = all enabled
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

    const data = await response.json() as NWSAlertsResponse;
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
  const alertTypesPref = byType.get('weather_alert_types');

  const weatherEnabled = weatherPref ? weatherPref.isEnabled : true;
  const emailEnabled = emailPref ? emailPref.isEnabled : true;
  const smsEnabled = smsPref ? smsPref.isEnabled : false;
  const pushEnabled = weatherPref ? weatherPref.channels.includes('push') : true;

  const enabledAlertTypes: string[] = (alertTypesPref?.channels && alertTypesPref.channels.length > 0)
    ? alertTypesPref.channels
    : [];

  return {
    enabled: weatherEnabled,
    email: weatherEnabled && emailEnabled,
    sms: weatherEnabled && smsEnabled,
    push: weatherEnabled && pushEnabled,
    enabledAlertTypes,
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

            // Skip if user has restricted alert types and this event isn't in their list
            if (channelPrefs.enabledAlertTypes.length > 0 && !channelPrefs.enabledAlertTypes.includes(event)) {
              console.log(`[WEATHER] Skipping "${event}" — not in user ${homeowner.id} enabled types`);
              continue;
            }

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
              const prep = getPreparednessInfo(event);
              sends.push(pushNotificationService.sendToUser(homeowner.id, {
                title: `${prep.emoji} ${event} — ${house.name}`,
                body: `${headline || event} | ${prep.smsTip}`,
                data: { type: 'weather_alert', houseId: house.id },
              }));
            }

            if (sends.length === 0) {
              console.log(`[WEATHER] No active channels for homeowner ${homeowner.id} — skipping record`);
              continue;
            }

            const results = await Promise.allSettled(sends);
            const channelNames = [
              channelPrefs.email ? 'email' : null,
              channelPrefs.sms ? 'sms' : null,
              channelPrefs.push ? 'push' : null,
            ].filter(Boolean);

            let anySucceeded = false;
            results.forEach((result, i) => {
              const channel = channelNames[i];
              if (result.status === 'fulfilled' && result.value === true) {
                console.log(`[WEATHER] ${channel} sent for alert ${alert.id} to homeowner ${homeowner.id}`);
                anySucceeded = true;
              } else {
                const reason = result.status === 'rejected' ? result.reason : 'returned false';
                console.warn(`[WEATHER] ${channel} failed for alert ${alert.id}: ${reason}`);
              }
            });

            if (anySucceeded) {
              await recordAlertSent(homeowner.id, house.id, alert.id, event);
              alertsSent++;
              console.log(`[WEATHER] Recorded ${event} alert for homeowner ${homeowner.id} house ${house.id}`);
            } else {
              console.warn(`[WEATHER] All channels failed for ${event} alert to homeowner ${homeowner.id} house ${house.id} — will retry next cycle`);
            }
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
  _initialTimeout: null as NodeJS.Timeout | null,
  _checkInterval: null as NodeJS.Timeout | null,
  _cleanupInterval: null as NodeJS.Timeout | null,

  start() {
    console.log('[WEATHER] Weather alert scheduler started (2-hour interval)');

    this._initialTimeout = setTimeout(async () => {
      this._initialTimeout = null;
      await checkWeatherAlertsForAllHomes();
    }, 30 * 1000);

    this._checkInterval = setInterval(async () => {
      await checkWeatherAlertsForAllHomes();
    }, CHECK_INTERVAL_MS);

    this._cleanupInterval = setInterval(async () => {
      await cleanupOldAlerts();
    }, 24 * 60 * 60 * 1000);
  },

  stop() {
    if (this._initialTimeout !== null) {
      clearTimeout(this._initialTimeout);
      this._initialTimeout = null;
    }
    if (this._checkInterval !== null) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    if (this._cleanupInterval !== null) {
      clearInterval(this._cleanupInterval);
      this._cleanupInterval = null;
    }
    console.log('[WEATHER] Weather alert scheduler stopped');
  },
};
