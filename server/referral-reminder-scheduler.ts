import { db } from './db';
import { users, referralCredits, subscriptionPlans } from '@shared/schema';
import { eq, and, isNotNull, or, sql, ne } from 'drizzle-orm';
import { sendReferralReminderEmail } from './email-service';
import { isDemoId } from './storage';

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

async function sendReferralReminders() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const hour = now.getHours();
  
  // Only run on Wednesdays (3) at 10 AM
  if (dayOfWeek !== 3 || hour !== 10) {
    return;
  }
  
  console.log('[REFERRAL-REMINDER-SCHEDULER] Starting referral reminder check...');
  
  try {
    // Get all active subscribers with referral codes
    const activeUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      referralCode: users.referralCode,
      subscriptionStatus: users.subscriptionStatus,
      subscriptionPlanId: users.subscriptionPlanId,
      lastReferralReminderSent: users.lastReferralReminderSent,
    })
      .from(users)
      .where(and(
        isNotNull(users.email),
        isNotNull(users.referralCode),
        or(
          eq(users.subscriptionStatus, 'active'),
          eq(users.subscriptionStatus, 'trialing')
        )
      ));
    
    // Filter out demo users and those who received a reminder within the last 7 days
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    const eligibleUsers = activeUsers.filter(user => {
      if (!user.email || !user.referralCode) return false;
      if (isDemoId(user.id)) return false;
      if (user.lastReferralReminderSent && new Date(user.lastReferralReminderSent) > sevenDaysAgo) return false;
      return true;
    });
    
    console.log(`[REFERRAL-REMINDER-SCHEDULER] Found ${eligibleUsers.length} eligible users to check`);
    
    let emailsSent = 0;
    
    for (const user of eligibleUsers) {
      if (!user.email || !user.referralCode) continue;
      
      // Get the user's referral cap from their subscription plan
      let referralCap = 5; // Default cap
      
      if (user.subscriptionPlanId) {
        const plan = await db.select({ referralCreditCap: subscriptionPlans.referralCreditCap })
          .from(subscriptionPlans)
          .where(eq(subscriptionPlans.id, user.subscriptionPlanId))
          .limit(1);
        
        if (plan.length > 0 && plan[0].referralCreditCap) {
          referralCap = parseInt(plan[0].referralCreditCap, 10);
        }
      }
      
      // Count how many successful referrals this user has made
      const referralCount = await db.select({ count: sql<number>`count(*)` })
        .from(referralCredits)
        .where(eq(referralCredits.referrerUserId, user.id));
      
      const currentReferrals = Number(referralCount[0]?.count || 0);
      
      // Only send if they haven't maxed out their referrals
      if (currentReferrals >= referralCap) {
        console.log(`[REFERRAL-REMINDER-SCHEDULER] Skipping ${user.email} - already at cap (${currentReferrals}/${referralCap})`);
        continue;
      }
      
      const userName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
      
      const sent = await sendReferralReminderEmail(
        user.id,
        userName,
        currentReferrals,
        referralCap,
        user.referralCode
      );
      
      if (sent) {
        // Update the last referral reminder sent timestamp
        await db.update(users)
          .set({ lastReferralReminderSent: now })
          .where(eq(users.id, user.id));
        
        emailsSent++;
        console.log(`[REFERRAL-REMINDER-SCHEDULER] Sent referral reminder to ${user.email} (${currentReferrals}/${referralCap})`);
        
        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`[REFERRAL-REMINDER-SCHEDULER] Completed. Sent ${emailsSent} referral reminder emails.`);
  } catch (error) {
    console.error('[REFERRAL-REMINDER-SCHEDULER] Error sending referral reminders:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startReferralReminderScheduler() {
  if (schedulerInterval) {
    console.log('[REFERRAL-REMINDER-SCHEDULER] Scheduler already running');
    return;
  }
  
  console.log('[REFERRAL-REMINDER-SCHEDULER] Starting referral reminder scheduler (runs Wednesdays at 10 AM)');
  
  // Run immediately on startup to check
  sendReferralReminders().catch(err => 
    console.error('[REFERRAL-REMINDER-SCHEDULER] Initial check failed:', err)
  );
  
  // Then run every hour
  schedulerInterval = setInterval(() => {
    sendReferralReminders().catch(err => 
      console.error('[REFERRAL-REMINDER-SCHEDULER] Scheduled check failed:', err)
    );
  }, CHECK_INTERVAL_MS);
}

export function stopReferralReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[REFERRAL-REMINDER-SCHEDULER] Scheduler stopped');
  }
}

export const referralReminderScheduler = {
  start: startReferralReminderScheduler,
  stop: stopReferralReminderScheduler,
  checkNow: sendReferralReminders,
};
