import { db } from './db';
import { users, onboardingProgress, notifications } from '@workspace/db';
import { eq, and, isNull, lt, isNotNull } from 'drizzle-orm';
import { sendOnboardingNudgeEmail } from './email-service';
import { storage } from './storage';
import { isDemoId } from './storage';
import { logger } from './lib/logger';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

// Send nudge to homeowners whose account is at least this many days old
const NUDGE_AFTER_DAYS = 3;

// Only send between 9 AM and 10 AM local server time
const NUDGE_HOUR = 9;

async function sendOnboardingNudges(): Promise<void> {
  const now = new Date();
  const hour = now.getHours();

  if (hour !== NUDGE_HOUR) {
    return;
  }

  logger.info('[ONBOARDING-NUDGE-SCHEDULER] Starting incomplete onboarding nudge check...');

  try {
    const nudgeCutoff = new Date(now.getTime() - NUDGE_AFTER_DAYS * 24 * 60 * 60 * 1000);

    // Find homeowners who have an onboarding_progress row with completedAt IS NULL
    // and whose account was created more than N days ago
    const incompleteUsers = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .innerJoin(onboardingProgress, eq(onboardingProgress.userId, users.id))
      .where(
        and(
          eq(users.role, 'homeowner'),
          isNotNull(users.email),
          isNull(onboardingProgress.completedAt),
          lt(users.createdAt, nudgeCutoff),
        ),
      );

    // Filter out demo users
    const eligible = incompleteUsers.filter((u) => !isDemoId(u.id));

    logger.info(
      { count: eligible.length },
      '[ONBOARDING-NUDGE-SCHEDULER] Found eligible users with incomplete onboarding',
    );

    let nudgesSent = 0;

    for (const user of eligible) {
      if (!user.email) continue;

      // Dedup: skip if an onboarding_reminder notification already exists for this user
      const existing = await db
        .select({ id: notifications.id })
        .from(notifications)
        .where(
          and(
            eq(notifications.homeownerId, user.id),
            eq(notifications.type, 'onboarding_reminder'),
          ),
        )
        .limit(1);

      if (existing.length > 0) {
        continue;
      }

      const userName = [user.firstName, user.lastName].filter(Boolean).join(' ') || 'there';
      const nowIso = now.toISOString();

      // Create in-app notification
      try {
        await storage.createNotification({
          homeownerId: user.id,
          type: 'onboarding_reminder',
          category: 'onboarding',
          title: 'Finish Setting Up Your Home',
          message: "You're one step away! Complete your home setup to unlock your maintenance schedule and Home Wellness Score™.",
          scheduledFor: nowIso,
          sentAt: nowIso,
          isRead: false,
          priority: 'medium',
          actionUrl: '/',
        });
      } catch (err) {
        logger.error({ err, userId: user.id }, '[ONBOARDING-NUDGE-SCHEDULER] Failed to create in-app notification');
      }

      // Send email nudge
      const sent = await sendOnboardingNudgeEmail(user.id, userName);

      if (sent) {
        nudgesSent++;
        logger.info(
          { email: user.email },
          '[ONBOARDING-NUDGE-SCHEDULER] Sent onboarding nudge email',
        );
      }

      // Small delay to avoid rate limits
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    logger.info(
      { nudgesSent },
      '[ONBOARDING-NUDGE-SCHEDULER] Completed onboarding nudge run',
    );
  } catch (err) {
    logger.error({ err }, '[ONBOARDING-NUDGE-SCHEDULER] Error during nudge run');
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

function startOnboardingNudgeScheduler(): void {
  if (schedulerInterval) {
    logger.info('[ONBOARDING-NUDGE-SCHEDULER] Scheduler already running');
    return;
  }

  logger.info(
    '[ONBOARDING-NUDGE-SCHEDULER] Starting incomplete-onboarding nudge scheduler (runs daily at 9 AM)',
  );

  // Run once on startup so missed windows are caught after deploys
  sendOnboardingNudges().catch((err) =>
    logger.error({ err }, '[ONBOARDING-NUDGE-SCHEDULER] Initial check failed'),
  );

  schedulerInterval = setInterval(() => {
    sendOnboardingNudges().catch((err) =>
      logger.error({ err }, '[ONBOARDING-NUDGE-SCHEDULER] Scheduled check failed'),
    );
  }, CHECK_INTERVAL_MS);
}

function stopOnboardingNudgeScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    logger.info('[ONBOARDING-NUDGE-SCHEDULER] Scheduler stopped');
  }
}

export const onboardingNudgeScheduler = {
  start: startOnboardingNudgeScheduler,
  stop: stopOnboardingNudgeScheduler,
  checkNow: sendOnboardingNudges,
};
