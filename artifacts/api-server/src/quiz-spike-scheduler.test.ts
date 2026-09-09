import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  count: 0,
  sendEmail: vi.fn(),
}));

vi.mock('./db', () => ({
  db: {
    select: () => ({
      from: () => ({
        where: async () => [{ count: mocks.count }],
      }),
    }),
  },
}));

vi.mock('./email-service', () => ({
  sendEmail: mocks.sendEmail,
}));

import {
  DEFAULT_QUIZ_SPIKE_THRESHOLD,
  QUIZ_SPIKE_CHECK_INTERVAL_MS,
  checkQuizSubmissionSpike,
  getQuizSpikeThreshold,
  quizSpikeScheduler,
} from './quiz-spike-scheduler';

describe('quiz spike scheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mocks.count = 0;
    mocks.sendEmail.mockReset().mockResolvedValue(true);
    delete process.env.QUIZ_SPIKE_THRESHOLD;
    delete process.env.QUIZ_SPIKE_ALERT_EMAIL;
    delete process.env.ADMIN_EMAIL;
    quizSpikeScheduler._checkInterval = null;
  });

  afterEach(() => {
    quizSpikeScheduler.stop();
    vi.useRealTimers();
  });

  it('uses a safe default for missing or invalid thresholds', () => {
    expect(getQuizSpikeThreshold()).toBe(DEFAULT_QUIZ_SPIKE_THRESHOLD);
    expect(getQuizSpikeThreshold('25')).toBe(25);
    expect(getQuizSpikeThreshold('0')).toBe(DEFAULT_QUIZ_SPIKE_THRESHOLD);
    expect(getQuizSpikeThreshold('not-a-number')).toBe(DEFAULT_QUIZ_SPIKE_THRESHOLD);
  });

  it('does not alert at or below the configured threshold', async () => {
    process.env.QUIZ_SPIKE_THRESHOLD = '20';
    mocks.count = 20;

    await expect(checkQuizSubmissionSpike(new Date('2026-09-09T12:00:00Z'))).resolves.toEqual({
      count: 20,
      threshold: 20,
      alerted: false,
    });
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it('emails the configured admin when submissions exceed the threshold', async () => {
    process.env.QUIZ_SPIKE_THRESHOLD = '20';
    process.env.QUIZ_SPIKE_ALERT_EMAIL = 'alerts@example.com';
    mocks.count = 21;

    await expect(checkQuizSubmissionSpike(new Date('2026-09-09T12:00:00Z'))).resolves.toEqual({
      count: 21,
      threshold: 20,
      alerted: true,
    });
    expect(mocks.sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'alerts@example.com',
      subject: expect.stringContaining('21 in 5 minutes'),
      deduplication: expect.objectContaining({ key: 'quiz-submission-spike' }),
    }));
  });

  it('starts only once and checks every five minutes', async () => {
    const intervalSpy = vi.spyOn(globalThis, 'setInterval');

    quizSpikeScheduler.start();
    quizSpikeScheduler.start();
    await vi.advanceTimersByTimeAsync(0);

    expect(intervalSpy).toHaveBeenCalledTimes(1);
    expect(intervalSpy).toHaveBeenCalledWith(expect.any(Function), QUIZ_SPIKE_CHECK_INTERVAL_MS);
    expect(quizSpikeScheduler._checkInterval).not.toBeNull();
  });
});