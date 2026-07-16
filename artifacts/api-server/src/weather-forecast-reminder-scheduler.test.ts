import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('./db', () => ({ db: {} }));
vi.mock('@workspace/db', () => ({
  users: {},
  houses: {},
  notificationPreferences: {},
  weatherForecastRemindersSent: {},
}));
vi.mock('./geocoding-service', () => ({ geocodeAddress: vi.fn() }));
vi.mock('./storage', () => ({ isDemoId: vi.fn(() => false) }));
vi.mock('./weather-forecast-service', () => ({
  getWeatherForecast: vi.fn(),
  detectForecastTriggers: vi.fn(),
  findRelevantOverdueTasks: vi.fn(),
  TRIGGER_DISPLAY: {},
}));
vi.mock('./email-service', () => ({
  sendWeatherForecastReminderEmail: vi.fn(),
}));
vi.mock('./sms-service', () => ({
  smsService: { sendWeatherForecastReminderSMS: vi.fn() },
}));
vi.mock('./push-notification-service', () => ({
  pushNotificationService: { sendToUser: vi.fn() },
}));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  gte: vi.fn(),
  lt: vi.fn(),
}));

import { weatherForecastReminderScheduler } from './weather-forecast-reminder-scheduler';
import { db } from './db';

describe('weatherForecastReminderScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    weatherForecastReminderScheduler._initialTimeout = null;
    weatherForecastReminderScheduler._checkInterval = null;
    weatherForecastReminderScheduler._cleanupInterval = null;
    weatherForecastReminderScheduler._stopped = false;
  });

  afterEach(() => {
    weatherForecastReminderScheduler.stop();
    vi.useRealTimers();
  });

  it('stores timer handles after start()', () => {
    weatherForecastReminderScheduler.start();

    expect(weatherForecastReminderScheduler._initialTimeout).not.toBeNull();
    expect(weatherForecastReminderScheduler._cleanupInterval).not.toBeNull();
  });

  it('clears all handles after stop()', () => {
    weatherForecastReminderScheduler.start();
    weatherForecastReminderScheduler.stop();

    expect(weatherForecastReminderScheduler._initialTimeout).toBeNull();
    expect(weatherForecastReminderScheduler._checkInterval).toBeNull();
    expect(weatherForecastReminderScheduler._cleanupInterval).toBeNull();
  });

  it('stop() is idempotent when called before start()', () => {
    expect(() => weatherForecastReminderScheduler.stop()).not.toThrow();
    expect(weatherForecastReminderScheduler._initialTimeout).toBeNull();
    expect(weatherForecastReminderScheduler._checkInterval).toBeNull();
    expect(weatherForecastReminderScheduler._cleanupInterval).toBeNull();
  });

  it('stop() clears the initial timeout before it fires', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    weatherForecastReminderScheduler.start();
    const capturedTimeout = weatherForecastReminderScheduler._initialTimeout;
    weatherForecastReminderScheduler.stop();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(capturedTimeout);
    clearTimeoutSpy.mockRestore();
  });

  it('stop() clears the cleanup interval', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    weatherForecastReminderScheduler.start();
    const capturedCleanup = weatherForecastReminderScheduler._cleanupInterval;
    weatherForecastReminderScheduler.stop();

    expect(clearIntervalSpy).toHaveBeenCalledWith(capturedCleanup);
    clearIntervalSpy.mockRestore();
  });

  it('stores the daily check interval handle after the initial timeout fires', async () => {
    vi.setSystemTime(new Date('2026-07-16T07:59:59.000Z'));
    weatherForecastReminderScheduler.start();
    expect(weatherForecastReminderScheduler._checkInterval).toBeNull();

    await vi.advanceTimersByTimeAsync(2_000);

    expect(weatherForecastReminderScheduler._checkInterval).not.toBeNull();
    expect(weatherForecastReminderScheduler._initialTimeout).toBeNull();

    weatherForecastReminderScheduler.stop();
  });

  it('stop() clears the daily check interval when called after initial timeout fires', async () => {
    vi.setSystemTime(new Date('2026-07-16T07:59:59.000Z'));
    weatherForecastReminderScheduler.start();
    await vi.advanceTimersByTimeAsync(2_000);

    const capturedInterval = weatherForecastReminderScheduler._checkInterval;
    expect(capturedInterval).not.toBeNull();

    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    weatherForecastReminderScheduler.stop();

    expect(clearIntervalSpy).toHaveBeenCalledWith(capturedInterval);
    expect(weatherForecastReminderScheduler._checkInterval).toBeNull();
    clearIntervalSpy.mockRestore();
  });

  it('does not arm the daily interval if stop() is called while the first check is in-flight', async () => {
    vi.setSystemTime(new Date('2026-07-16T07:59:59.000Z'));

    let resolveQuery!: (rows: any[]) => void;
    const deferred = new Promise<any[]>(resolve => { resolveQuery = resolve; });
    const dbMock = db as any;
    dbMock.select = vi.fn().mockReturnValue({ from: () => ({ where: () => deferred }) });

    weatherForecastReminderScheduler.start();

    vi.advanceTimersByTime(2_000);

    weatherForecastReminderScheduler.stop();
    expect(weatherForecastReminderScheduler._stopped).toBe(true);

    resolveQuery([]);
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(weatherForecastReminderScheduler._checkInterval).toBeNull();

    delete dbMock.select;
  });
});
