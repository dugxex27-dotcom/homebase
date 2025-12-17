import { db } from './db';
import { users } from '@shared/schema';
import { eq, and, between, isNotNull } from 'drizzle-orm';
import { notificationOrchestrator } from './notification-orchestrator';
import { isDemoId } from './storage';

const REMINDER_DAYS = [3, 1]; // Days before trial ends to send reminders
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

// Track sent reminders to prevent duplicates (in-memory, resets on restart)
const sentReminders = new Map<string, Set<number>>(); // userId -> Set of daysRemaining values

async function checkAndSendTrialReminders() {
  console.log('[TRIAL-SCHEDULER] Checking for expiring trials...');
  
  try {
    const now = new Date();
    
    for (const daysRemaining of REMINDER_DAYS) {
      const targetDate = new Date(now);
      targetDate.setDate(targetDate.getDate() + daysRemaining);
      
      // Set time boundaries for the target day
      const dayStart = new Date(targetDate);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(targetDate);
      dayEnd.setHours(23, 59, 59, 999);
      
      // Find users with trials ending on the target day
      const expiringUsers = await db.select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        subscriptionStatus: users.subscriptionStatus,
      })
        .from(users)
        .where(and(
          eq(users.subscriptionStatus, 'trialing'),
          isNotNull(users.trialEndsAt),
          between(users.trialEndsAt, dayStart, dayEnd)
        ));
      
      // Filter out demo users
      const realUsers = expiringUsers.filter(u => !isDemoId(u.id));
      
      if (realUsers.length > 0) {
        console.log(`[TRIAL-SCHEDULER] Found ${realUsers.length} users with trials expiring in ${daysRemaining} day(s)`);
        
        for (const user of realUsers) {
          // Check if we already sent this reminder
          const userReminders = sentReminders.get(user.id) || new Set();
          if (userReminders.has(daysRemaining)) {
            console.log(`[TRIAL-SCHEDULER] Skipping duplicate reminder for user ${user.id} (${daysRemaining}d)`);
            continue;
          }
          
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
          
          await notificationOrchestrator.sendTrialExpiringNotifications(
            user.id,
            userName,
            daysRemaining
          );
          
          // Mark as sent
          userReminders.add(daysRemaining);
          sentReminders.set(user.id, userReminders);
          
          // Small delay between notifications to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
  } catch (error) {
    console.error('[TRIAL-SCHEDULER] Error checking expiring trials:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startTrialReminderScheduler() {
  if (schedulerInterval) {
    console.log('[TRIAL-SCHEDULER] Scheduler already running');
    return;
  }
  
  console.log('[TRIAL-SCHEDULER] Starting trial reminder scheduler');
  
  // Run immediately on startup
  checkAndSendTrialReminders();
  
  // Then run every hour
  schedulerInterval = setInterval(checkAndSendTrialReminders, CHECK_INTERVAL_MS);
}

export function stopTrialReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[TRIAL-SCHEDULER] Scheduler stopped');
  }
}

export const trialReminderScheduler = {
  start: startTrialReminderScheduler,
  stop: stopTrialReminderScheduler,
  checkNow: checkAndSendTrialReminders,
};
