import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendMock, setApiKeyMock } = vi.hoisted(() => {
  process.env.SENDGRID_API_KEY = 'test-key';
  return { sendMock: vi.fn(), setApiKeyMock: vi.fn() };
});

vi.mock('@sendgrid/mail', () => ({
  default: {
    setApiKey: setApiKeyMock,
    send: sendMock,
  },
}));

vi.mock('./storage', () => ({ storage: {} }));
vi.mock('./db', () => ({ db: {} }));
vi.mock('./qa-access', () => ({ isSyntheticAccountUserId: vi.fn() }));

import {
  clearEmailDeduplicationForTests,
  sendEmail,
} from './email-service';

const message = {
  to: 'recipient@example.com',
  subject: 'Transactional update',
  text: 'An update happened.',
  html: '<p>An update happened.</p>',
};

describe('transactional email deduplication', () => {
  beforeEach(() => {
    clearEmailDeduplicationForTests();
    sendMock.mockReset();
    sendMock.mockResolvedValue(undefined);
  });

  it('initializes the SendGrid client when an API key is configured', () => {
    expect(setApiKeyMock).toHaveBeenCalledWith('test-key');
  });

  it('sends only once when concurrent retries use the same event key', async () => {
    const results = await Promise.all([
      sendEmail({ ...message, deduplication: { key: 'event:123' } }),
      sendEmail({ ...message, deduplication: { key: 'event:123' } }),
    ]);

    expect(results).toEqual([true, true]);
    expect(sendMock).toHaveBeenCalledOnce();
  });

  it('does not suppress distinct business events', async () => {
    await sendEmail({ ...message, deduplication: { key: 'event:123' } });
    await sendEmail({ ...message, deduplication: { key: 'event:124' } });

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('releases the reservation after a delivery failure so a retry can send', async () => {
    sendMock.mockRejectedValueOnce(new Error('temporary outage'));
    sendMock.mockResolvedValueOnce(undefined);

    await expect(sendEmail({
      ...message,
      deduplication: { key: 'event:retryable' },
    })).resolves.toBe(false);
    await expect(sendEmail({
      ...message,
      deduplication: { key: 'event:retryable' },
    })).resolves.toBe(true);

    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('shares a concurrent failure result and leaves the event retryable', async () => {
    let rejectDelivery!: (error: Error) => void;
    sendMock.mockImplementationOnce(() => new Promise((_resolve, reject) => {
      rejectDelivery = reject;
    }));

    const first = sendEmail({
      ...message,
      deduplication: { key: 'event:concurrent-failure' },
    });
    const duplicate = sendEmail({
      ...message,
      deduplication: { key: 'event:concurrent-failure' },
    });
    rejectDelivery(new Error('temporary outage'));

    await expect(Promise.all([first, duplicate])).resolves.toEqual([false, false]);
    expect(sendMock).toHaveBeenCalledOnce();

    sendMock.mockResolvedValueOnce(undefined);
    await expect(sendEmail({
      ...message,
      deduplication: { key: 'event:concurrent-failure' },
    })).resolves.toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(2);
  });

  it('keeps a custom longer window when cleaning expired entries', async () => {
    vi.useFakeTimers();
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    try {
      await sendEmail({
        ...message,
        deduplication: { key: 'event:long-window', windowMs: 24 * 60 * 60 * 1000 },
      });
      await Promise.all(Array.from({ length: 10_001 }, (_, index) =>
        sendEmail({
          ...message,
          deduplication: { key: `expired:${index}`, windowMs: 1 },
        }),
      ));
      vi.advanceTimersByTime(2);
      await sendEmail({
        ...message,
        deduplication: { key: 'cleanup-trigger' },
      });
      await sendEmail({
        ...message,
        deduplication: { key: 'event:long-window', windowMs: 24 * 60 * 60 * 1000 },
      });

      expect(sendMock).toHaveBeenCalledTimes(10_003);
    } finally {
      logSpy.mockRestore();
      vi.useRealTimers();
    }
  });
});