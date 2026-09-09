import { quizResults } from '@workspace/db';
import { gte, sql } from 'drizzle-orm';
import { db } from './db';
import { sendEmail } from './email-service';

export const QUIZ_SPIKE_WINDOW_MS = 5 * 60 * 1000;
export const QUIZ_SPIKE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const DEFAULT_QUIZ_SPIKE_THRESHOLD = 100;
const ALERT_DEDUPLICATION_WINDOW_MS = 30 * 60 * 1000;
const DEFAULT_ADMIN_EMAIL = 'gotohomebase2025@gmail.com';

export function getQuizSpikeThreshold(raw = process.env.QUIZ_SPIKE_THRESHOLD): number {
  if (raw === undefined || raw.trim() === '') return DEFAULT_QUIZ_SPIKE_THRESHOLD;

  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    console.warn(
      `[QUIZ SPIKE] Invalid QUIZ_SPIKE_THRESHOLD "${raw}"; using ${DEFAULT_QUIZ_SPIKE_THRESHOLD}`,
    );
    return DEFAULT_QUIZ_SPIKE_THRESHOLD;
  }
  return parsed;
}

export async function checkQuizSubmissionSpike(now = new Date()): Promise<{
  count: number;
  threshold: number;
  alerted: boolean;
}> {
  const threshold = getQuizSpikeThreshold();
  const windowStart = new Date(now.getTime() - QUIZ_SPIKE_WINDOW_MS);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(quizResults)
    .where(gte(quizResults.createdAt, windowStart));
  const count = Number(row?.count ?? 0);

  if (count <= threshold) {
    return { count, threshold, alerted: false };
  }

  const adminEmail =
    process.env.QUIZ_SPIKE_ALERT_EMAIL ||
    process.env.ADMIN_EMAIL ||
    DEFAULT_ADMIN_EMAIL;
  const windowLabel = `${windowStart.toISOString()} to ${now.toISOString()}`;
  const delivered = await sendEmail({
    to: adminEmail,
    subject: `Quiz submission spike detected: ${count} in 5 minutes`,
    text: `HomeBase detected ${count} quiz submissions from ${windowLabel}, above the configured threshold of ${threshold}. This may indicate a coordinated bot flood. Review quiz traffic and analytics promptly.`,
    html: `
      <h1>Quiz submission spike detected</h1>
      <p>HomeBase recorded <strong>${count} quiz submissions</strong> in the last 5 minutes.</p>
      <p><strong>Configured threshold:</strong> ${threshold}<br>
      <strong>Window:</strong> ${windowLabel}</p>
      <p>This may indicate a coordinated bot flood. Review quiz traffic and analytics promptly.</p>
    `,
    deduplication: {
      key: 'quiz-submission-spike',
      windowMs: ALERT_DEDUPLICATION_WINDOW_MS,
    },
  });

  if (delivered) {
    console.warn('[QUIZ SPIKE] Alert sent', { count, threshold, windowStart, now });
  } else {
    console.error('[QUIZ SPIKE] Alert delivery failed', { count, threshold, windowStart, now });
  }
  return { count, threshold, alerted: delivered };
}

export const quizSpikeScheduler = {
  _checkInterval: null as NodeJS.Timeout | null,

  start() {
    if (this._checkInterval !== null) {
      console.log('[QUIZ SPIKE] Scheduler already running — start skipped');
      return;
    }

    console.log('[QUIZ SPIKE] Scheduler started (5-minute interval)');
    void checkQuizSubmissionSpike().catch((error) => {
      console.error('[QUIZ SPIKE] Initial check failed', error);
    });
    this._checkInterval = setInterval(() => {
      void checkQuizSubmissionSpike().catch((error) => {
        console.error('[QUIZ SPIKE] Scheduled check failed', error);
      });
    }, QUIZ_SPIKE_CHECK_INTERVAL_MS);
  },

  stop() {
    if (this._checkInterval !== null) {
      clearInterval(this._checkInterval);
      this._checkInterval = null;
    }
    console.log('[QUIZ SPIKE] Scheduler stopped');
  },
};