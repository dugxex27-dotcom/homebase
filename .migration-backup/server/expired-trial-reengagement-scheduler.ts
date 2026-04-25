import { db } from './db';
import { users } from '@shared/schema';
import { eq, and, isNotNull, lt, or, isNull } from 'drizzle-orm';
import { sendExpiredTrialReengagementEmail } from './email-service';
import { isDemoId } from './storage';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour
const GRANDFATHERED_EMAILS = [
  'lihandyman2008@gmail.com',
  'bryanmendezdesign@gmail.com',
  'freshandcleangutters@gmail.com',
];

function isNthSundayOfMonth(date: Date, nthWeeks: number[]): boolean {
  if (date.getDay() !== 0) return false; // Not Sunday
  const dayOfMonth = date.getDate();
  const weekOfMonth = Math.ceil(dayOfMonth / 7);
  return nthWeeks.includes(weekOfMonth);
}

async function sendExpiredTrialReengagementEmails() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  
  // Only run on 1st and 3rd Sunday at 10 AM
  if (dayOfWeek !== 0 || hour !== 10) {
    return;
  }
  
  if (!isNthSundayOfMonth(now, [1, 3])) {
    return;
  }
  
  console.log('[EXPIRED-TRIAL-SCHEDULER] Starting expired trial re-engagement check...');
  
  try {
    // Get users who:
    // 1. Were trialing but now have expired trials (trial_ends_at in the past)
    // 2. OR have subscription_status = 'inactive' (expired)
    // 3. AND are not currently active subscribers
    // 4. AND haven't received a re-engagement email recently
    const expiredUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
      subscriptionStatus: users.subscriptionStatus,
      trialEndsAt: users.trialEndsAt,
      lastReengagementEmailSent: users.lastReengagementEmailSent,
    })
      .from(users)
      .where(and(
        isNotNull(users.email),
        or(
          // Trialing with expired trial
          and(
            eq(users.subscriptionStatus, 'trialing'),
            lt(users.trialEndsAt, now)
          ),
          // Inactive status
          eq(users.subscriptionStatus, 'inactive')
        )
      ));
    
    // Filter out:
    // - Demo users
    // - Grandfathered accounts
    // - Users who received a re-engagement email within the last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const eligibleUsers = expiredUsers.filter(user => {
      if (!user.email) return false;
      if (isDemoId(user.id)) return false;
      if (GRANDFATHERED_EMAILS.includes(user.email.toLowerCase())) return false;
      if (user.lastReengagementEmailSent && new Date(user.lastReengagementEmailSent) > sevenDaysAgo) return false;
      return true;
    });
    
    console.log(`[EXPIRED-TRIAL-SCHEDULER] Found ${eligibleUsers.length} eligible users with expired trials`);
    
    let emailsSent = 0;
    
    for (const user of eligibleUsers) {
      if (!user.email) continue;
      
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
      const userRole: 'homeowner' | 'contractor' = user.role === 'contractor' ? 'contractor' : 'homeowner';
      
      const sent = await sendExpiredTrialReengagementEmail(user.id, userName, userRole);
      
      if (sent) {
        // Update the last re-engagement email sent timestamp
        await db.update(users)
          .set({ lastReengagementEmailSent: now })
          .where(eq(users.id, user.id));
        
        emailsSent++;
        console.log(`[EXPIRED-TRIAL-SCHEDULER] Sent re-engagement email to ${user.email}`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[EXPIRED-TRIAL-SCHEDULER] Completed. Sent ${emailsSent} re-engagement emails.`);
  } catch (error) {
    console.error('[EXPIRED-TRIAL-SCHEDULER] Error sending re-engagement emails:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startExpiredTrialReengagementScheduler() {
  if (schedulerInterval) {
    console.log('[EXPIRED-TRIAL-SCHEDULER] Scheduler already running');
    return;
  }
  
  console.log('[EXPIRED-TRIAL-SCHEDULER] Starting expired trial re-engagement scheduler (runs 1st and 3rd Sunday at 10 AM)');
  
  // Run immediately on startup to check
  sendExpiredTrialReengagementEmails().catch(err => 
    console.error('[EXPIRED-TRIAL-SCHEDULER] Initial check failed:', err)
  );
  
  // Then run every hour
  schedulerInterval = setInterval(() => {
    sendExpiredTrialReengagementEmails().catch(err => 
      console.error('[EXPIRED-TRIAL-SCHEDULER] Scheduled check failed:', err)
    );
  }, CHECK_INTERVAL_MS);
}

export function stopExpiredTrialReengagementScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[EXPIRED-TRIAL-SCHEDULER] Scheduler stopped');
  }
}

export const expiredTrialReengagementScheduler = {
  start: startExpiredTrialReengagementScheduler,
  stop: stopExpiredTrialReengagementScheduler,
  checkNow: sendExpiredTrialReengagementEmails,
};
