import { db } from './db';
import { users } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { notificationOrchestrator } from './notification-orchestrator';
import { isDemoId } from './storage';

const REMINDER_DAYS = [7, 4, 2, 1]; // Days before trial ends to send reminders
const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

async function checkAndSendTrialReminders() {
  const now = new Date();
  const hour = now.getHours();
  
  // Only run at 9 AM to avoid spamming
  if (hour !== 9) {
    return;
  }
  
  console.log('[TRIAL-SCHEDULER] Checking for expiring trials...');
  
  try {
    // Get all users who are trialing and have a trial end date
    const trialingUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      subscriptionStatus: users.subscriptionStatus,
      trialEndsAt: users.trialEndsAt,
      trialRemindersSent: users.trialRemindersSent,
    })
      .from(users)
      .where(and(
        eq(users.subscriptionStatus, 'trialing'),
        isNotNull(users.trialEndsAt),
        isNotNull(users.email)
      ));
    
    // Filter out demo users
    const realUsers = trialingUsers.filter(u => !isDemoId(u.id));
    
    console.log(`[TRIAL-SCHEDULER] Found ${realUsers.length} trialing users to check`);
    
    let emailsSent = 0;
    
    for (const user of realUsers) {
      if (!user.trialEndsAt || !user.email) continue;
      
      // Calculate days remaining
      const trialEndsAt = new Date(user.trialEndsAt);
      const timeDiff = trialEndsAt.getTime() - now.getTime();
      const daysRemaining = Math.ceil(timeDiff / (1000 * 60 * 60 * 24));
      
      // Check if this is a reminder day and if we haven't sent this reminder yet
      if (REMINDER_DAYS.includes(daysRemaining)) {
        const reminderKey = `${daysRemaining}-day`;
        const sentReminders = user.trialRemindersSent || [];
        
        if (!sentReminders.includes(reminderKey)) {
          const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
          
          // Send via notification orchestrator (handles email + in-app)
          await notificationOrchestrator.sendTrialExpiringNotifications(
            user.id,
            userName,
            daysRemaining
          );
          
          // Update the user's sent reminders (persist to database)
          const updatedReminders = [...sentReminders, reminderKey];
          await db.update(users)
            .set({ trialRemindersSent: updatedReminders })
            .where(eq(users.id, user.id));
          
          emailsSent++;
          console.log(`[TRIAL-SCHEDULER] Sent ${reminderKey} reminder to ${user.email}`);
          
          // Small delay between notifications to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }
    
    console.log(`[TRIAL-SCHEDULER] Completed. Sent ${emailsSent} reminder emails.`);
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
