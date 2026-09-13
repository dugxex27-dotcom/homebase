import { vi, describe, it, expect, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('./db', () => ({ db: {} }));
vi.mock('@workspace/db', () => ({
  users: {},
  houses: {},
  notifications: {},
  notificationPreferences: {},
  weatherForecastRemindersSent: {},
}));
vi.mock('./geocoding-service', () => ({ geocodeAddress: vi.fn() }));
vi.mock('./storage', () => ({ isDemoId: vi.fn(() => false) }));
vi.mock('./weather-forecast-service', () => ({
  getWeatherForecast: vi.fn(),
  detectForecastTriggers: vi.fn(),
  findRelevantOverdueTasks: vi.fn(),
  TRIGGER_DISPLAY: {
    hard_freeze: { emoji: '🧊', label: 'Hard Freeze' },
    heavy_rain: { emoji: '🌧️', label: 'Heavy Rain' },
  },
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

import {
  createForecastNotification,
  sendForecastReminder,
  weatherForecastReminderScheduler,
} from './weather-forecast-reminder-scheduler';
import { db } from './db';
import { notifications } from '@workspace/db';
import { sendWeatherForecastReminderEmail } from './email-service';
import { smsService } from './sms-service';
import { pushNotificationService } from './push-notification-service';

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

  it('does not create duplicate timer handles when start() is called twice', () => {
    const setTimeoutSpy = vi.spyOn(globalThis, 'setTimeout');
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');

    weatherForecastReminderScheduler.start();
    const initialTimeout = weatherForecastReminderScheduler._initialTimeout;
    const cleanupInterval = weatherForecastReminderScheduler._cleanupInterval;

    weatherForecastReminderScheduler.start();

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(weatherForecastReminderScheduler._initialTimeout).toBe(initialTimeout);
    expect(weatherForecastReminderScheduler._cleanupInterval).toBe(cleanupInterval);

    setTimeoutSpy.mockRestore();
    setIntervalSpy.mockRestore();
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

describe('sendForecastReminder', () => {
  const homeowner = { id: 'homeowner-1' };
  const house = { id: 'house-1', name: 'Main Home', address: '1 Main St' };
  const trigger = {
    trigger: 'hard_freeze' as const,
    description: 'Hard freeze expected',
    expectedDate: 'Tonight',
    temperatureF: 24,
  };
  const tasks = [{
    id: 'task-1',
    title: 'Winterize outdoor faucets',
    category: 'Plumbing',
    priority: 'high',
    taskType: 'maintenance' as const,
  }];

  beforeEach(() => {
    vi.clearAllMocks();
    const dbMock = db as any;
    dbMock.select = vi.fn().mockReturnValue({
      from: () => ({
        where: () => Promise.resolve([
          { notificationType: 'weather_forecast_reminders', isEnabled: false, channels: ['email', 'push'] },
          { notificationType: 'email', isEnabled: true, channels: ['email'] },
          { notificationType: 'sms', isEnabled: false, channels: ['sms'] },
        ]),
      }),
    });
    vi.mocked(sendWeatherForecastReminderEmail).mockResolvedValue(true);
    vi.mocked(smsService.sendWeatherForecastReminderSMS).mockResolvedValue(true);
    vi.mocked(pushNotificationService.sendToUser).mockResolvedValue(false);
  });

  it('does not send scheduled reminders when forecast reminders are disabled', async () => {
    await expect(sendForecastReminder(homeowner, house, trigger, tasks)).resolves.toBe(false);
    expect(sendWeatherForecastReminderEmail).not.toHaveBeenCalled();
    expect(pushNotificationService.sendToUser).not.toHaveBeenCalled();
  });

  it('sends a test email when the forecast toggle is off while preserving global channel opt-outs', async () => {
    await expect(sendForecastReminder(
      homeowner,
      house,
      trigger,
      tasks,
      { ignoreForecastToggle: true },
    )).resolves.toBe(true);

    expect(sendWeatherForecastReminderEmail).toHaveBeenCalledWith(
      homeowner.id,
      house.name,
      house.address,
      trigger,
      tasks,
      { ignoreForecastPreference: true },
    );
    expect(smsService.sendWeatherForecastReminderSMS).not.toHaveBeenCalled();
  });
});

describe('createForecastNotification', () => {
  it('creates a persistent weather bell notification with trigger, task count, and maintenance link', async () => {
    const returning = vi.fn().mockResolvedValue([{ id: 'weather-notification-id' }]);
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
    const values = vi.fn().mockReturnValue({ onConflictDoNothing });
    const insert = vi.fn().mockReturnValue({ values });
    (db as any).insert = insert;

    const created = await createForecastNotification(
      'homeowner-1',
      {
        id: 'house-1',
        name: 'Main Home',
        address: '123 Main St',
        latitude: '40',
        longitude: '-75',
      },
      {
        trigger: 'heavy_rain' as any,
        expectedDate: 'Friday',
      },
      3,
    );

    expect(created).toBe(true);
    expect(insert).toHaveBeenCalledWith(notifications);
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      id: expect.stringMatching(/^notif_/),
      homeownerId: 'homeowner-1',
      houseId: 'house-1',
      type: 'weather_forecast_heavy_rain',
      category: 'weather',
      title: '🌧️ Heavy Rain Coming — Main Home',
      message: '3 maintenance tasks need attention before friday.',
      actionUrl: '/maintenance',
    }));

    delete (db as any).insert;
  });

  it('reports an existing weather occurrence as already claimed', async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const onConflictDoNothing = vi.fn().mockReturnValue({ returning });
    (db as any).insert = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({ onConflictDoNothing }),
    });

    await expect(createForecastNotification(
      'homeowner-1',
      {
        id: 'house-1',
        name: 'Main Home',
        address: '123 Main St',
        latitude: '40',
        longitude: '-75',
      },
      { trigger: 'heavy_rain' as any, expectedDate: 'Friday' },
      3,
    )).resolves.toBe(false);

    delete (db as any).insert;
  });
});
