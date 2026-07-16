import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('./db', () => ({ db: {} }));
vi.mock('@workspace/db', () => ({
  users: {},
  houses: {},
  notificationPreferences: {},
  weatherAlertsSent: {},
}));
vi.mock('./email-service', () => ({
  sendWeatherAlertEmail: vi.fn(),
  getPreparednessInfo: vi.fn(() => ({ emoji: '⚡', smsTip: 'tip' })),
}));
vi.mock('./sms-service', () => ({ smsService: { sendWeatherAlertSMS: vi.fn() } }));
vi.mock('./push-notification-service', () => ({
  pushNotificationService: { sendToUser: vi.fn() },
}));
vi.mock('./geocoding-service', () => ({ geocodeAddress: vi.fn() }));
vi.mock('./storage', () => ({ isDemoId: vi.fn(() => false) }));
vi.mock('drizzle-orm', () => ({
  eq: vi.fn(),
  and: vi.fn(),
  lt: vi.fn(),
}));

import { weatherAlertScheduler } from './weather-alert-scheduler';

describe('weatherAlertScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    weatherAlertScheduler._initialTimeout = null;
    weatherAlertScheduler._checkInterval = null;
    weatherAlertScheduler._cleanupInterval = null;
  });

  afterEach(() => {
    weatherAlertScheduler.stop();
    vi.useRealTimers();
  });

  it('stores timer handles after start()', () => {
    weatherAlertScheduler.start();

    expect(weatherAlertScheduler._initialTimeout).not.toBeNull();
    expect(weatherAlertScheduler._checkInterval).not.toBeNull();
    expect(weatherAlertScheduler._cleanupInterval).not.toBeNull();
  });

  it('clears all handles after stop()', () => {
    weatherAlertScheduler.start();
    weatherAlertScheduler.stop();

    expect(weatherAlertScheduler._initialTimeout).toBeNull();
    expect(weatherAlertScheduler._checkInterval).toBeNull();
    expect(weatherAlertScheduler._cleanupInterval).toBeNull();
  });

  it('stop() is idempotent when called before start()', () => {
    expect(() => weatherAlertScheduler.stop()).not.toThrow();
    expect(weatherAlertScheduler._initialTimeout).toBeNull();
    expect(weatherAlertScheduler._checkInterval).toBeNull();
    expect(weatherAlertScheduler._cleanupInterval).toBeNull();
  });

  it('stop() clears the initial timeout before it fires', () => {
    const clearTimeoutSpy = vi.spyOn(globalThis, 'clearTimeout');

    weatherAlertScheduler.start();
    const capturedTimeout = weatherAlertScheduler._initialTimeout;
    weatherAlertScheduler.stop();

    expect(clearTimeoutSpy).toHaveBeenCalledWith(capturedTimeout);
    clearTimeoutSpy.mockRestore();
  });

  it('stop() clears the check interval', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    weatherAlertScheduler.start();
    const capturedInterval = weatherAlertScheduler._checkInterval;
    weatherAlertScheduler.stop();

    expect(clearIntervalSpy).toHaveBeenCalledWith(capturedInterval);
    clearIntervalSpy.mockRestore();
  });

  it('stop() clears the cleanup interval', () => {
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');

    weatherAlertScheduler.start();
    const capturedCleanup = weatherAlertScheduler._cleanupInterval;
    weatherAlertScheduler.stop();

    expect(clearIntervalSpy).toHaveBeenCalledWith(capturedCleanup);
    clearIntervalSpy.mockRestore();
  });

  it('initial timeout handle is nulled out when it fires naturally', async () => {
    weatherAlertScheduler.start();
    expect(weatherAlertScheduler._initialTimeout).not.toBeNull();

    await vi.advanceTimersByTimeAsync(31_000);
    weatherAlertScheduler.stop();

    expect(weatherAlertScheduler._initialTimeout).toBeNull();
  });
});
