import { db } from './db';
import { notificationPreferences, monthlyReportsSent } from '@workspace/db';
import { eq, and, sql } from 'drizzle-orm';
import { storage, isDemoId, IStorage } from './storage';
import { sendContractorMonthlyViewReportEmail } from './email-service';

const typedStorage = storage as unknown as IStorage;

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

async function canSendEngagementEmail(userId: string): Promise<boolean> {
  try {
    const prefs = await db.select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, 'engagement_updates')
      ))
      .limit(1);
    
    if (prefs.length === 0) {
      return true; // Default to opt-in if no preferences set
    }
    
    const pref = prefs[0];
    return pref.isEnabled && pref.channels.includes('email');
  } catch (error) {
    console.error('[PROFILE-VIEW-SCHEDULER] Error checking preferences:', error);
    return true;
  }
}

// Claim timeout in milliseconds (30 minutes) - stale claims older than this can be reclaimed
// This is generous to handle slow email APIs; typical email send is <30 seconds
const CLAIM_TIMEOUT_MS = 30 * 60 * 1000;

// Try to claim the slot for sending report - returns true if we got the lock
// Uses two-step atomic approach: try INSERT first, then UPDATE stale if needed
async function claimReportSlot(contractorId: string, reportMonth: string): Promise<boolean> {
  try {
    const now = new Date();
    
    // Step 1: Try to INSERT new claim
    const insertResult = await db.insert(monthlyReportsSent).values({
      contractorId,
      reportMonth,
      status: 'claimed',
      claimedAt: now,
      totalViews: 0,
      uniqueVisitors: 0,
    }).onConflictDoNothing().returning({ id: monthlyReportsSent.id });
    
    // If INSERT succeeded, we claimed it
    if (insertResult.length > 0) {
      return true;
    }
    
    // Step 2: INSERT failed (row exists) - check if we can reclaim a stale claim
    const staleThreshold = new Date(Date.now() - CLAIM_TIMEOUT_MS);
    
    // Atomic UPDATE that only succeeds if row is stale AND still claimed
    const updateResult = await db.update(monthlyReportsSent)
      .set({ claimedAt: now })
      .where(and(
        eq(monthlyReportsSent.contractorId, contractorId),
        eq(monthlyReportsSent.reportMonth, reportMonth),
        eq(monthlyReportsSent.status, 'claimed'),
        sql`${monthlyReportsSent.claimedAt} < ${staleThreshold}`
      ))
      .returning({ id: monthlyReportsSent.id });
    
    // If UPDATE succeeded, we reclaimed the stale slot
    return updateResult.length > 0;
  } catch (error) {
    console.error('[PROFILE-VIEW-SCHEDULER] Error claiming report slot:', error);
    return false;
  }
}

// Mark report as sent after successful email delivery
// Returns true if update succeeded, false if claim was lost
async function markReportSent(contractorId: string, reportMonth: string, totalViews: number, uniqueVisitors: number): Promise<boolean> {
  try {
    const result = await db.update(monthlyReportsSent)
      .set({ status: 'sent', totalViews, uniqueVisitors, sentAt: new Date() })
      .where(and(
        eq(monthlyReportsSent.contractorId, contractorId),
        eq(monthlyReportsSent.reportMonth, reportMonth),
        eq(monthlyReportsSent.status, 'claimed') // Only update if still claimed (not stolen)
      ))
      .returning({ id: monthlyReportsSent.id });
    
    if (result.length === 0) {
      console.warn(`[PROFILE-VIEW-SCHEDULER] Warning: Claim was lost for ${contractorId}/${reportMonth} - another process may have taken over`);
      return false;
    }
    return true;
  } catch (error) {
    console.error('[PROFILE-VIEW-SCHEDULER] Error marking report sent:', error);
    return false;
  }
}

// Delete slot if email fails (allows retry)
async function releaseReportSlot(contractorId: string, reportMonth: string): Promise<void> {
  try {
    await db.delete(monthlyReportsSent)
      .where(and(
        eq(monthlyReportsSent.contractorId, contractorId),
        eq(monthlyReportsSent.reportMonth, reportMonth),
        eq(monthlyReportsSent.status, 'claimed') // Only delete claimed, not sent
      ));
  } catch (error) {
    console.error('[PROFILE-VIEW-SCHEDULER] Error releasing report slot:', error);
  }
}

async function sendMonthlyProfileViewReports() {
  const now = new Date();
  const currentDay = now.getDate();
  
  // Only send reports on the 1st of the month
  if (currentDay !== 1) {
    return;
  }
  
  // Get the previous month's year and month
  const previousMonth = new Date(now);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const reportYear = previousMonth.getFullYear();
  const reportMonth = previousMonth.getMonth() + 1;
  const reportKey = `${reportYear}-${String(reportMonth).padStart(2, '0')}`;
  const monthName = MONTH_NAMES[previousMonth.getMonth()];
  
  console.log('[PROFILE-VIEW-SCHEDULER] Sending monthly profile view reports...');
  
  try {
    // Get 2 months ago for comparison
    const twoMonthsAgo = new Date(previousMonth);
    twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1);
    const prevYear = twoMonthsAgo.getFullYear();
    const prevMonth = twoMonthsAgo.getMonth() + 1;
    
    const allContractors = await storage.getContractors({});
    
    console.log(`[PROFILE-VIEW-SCHEDULER] Processing ${allContractors.length} contractors for ${monthName} ${reportYear} report`);
    
    let sentCount = 0;
    let skippedCount = 0;
    
    for (const contractor of allContractors) {
      if (isDemoId(contractor.userId) || isDemoId(contractor.id)) {
        skippedCount++;
        continue;
      }
      
      // Try to claim the slot FIRST - this is the atomic lock
      const claimed = await claimReportSlot(contractor.id, reportKey);
      if (!claimed) {
        // Another process already claimed this contractor or report was sent
        skippedCount++;
        continue;
      }
      
      const user = await storage.getUser(contractor.userId);
      if (!user?.email) {
        console.log(`[PROFILE-VIEW-SCHEDULER] Skipping ${contractor.id}, no email found`);
        await releaseReportSlot(contractor.id, reportKey); // Release slot for retry
        skippedCount++;
        continue;
      }
      
      const canSend = await canSendEngagementEmail(contractor.userId);
      if (!canSend) {
        console.log(`[PROFILE-VIEW-SCHEDULER] Skipping ${contractor.id}, email notifications disabled`);
        await releaseReportSlot(contractor.id, reportKey); // Release slot for retry
        skippedCount++;
        continue;
      }
      
      const stats = await typedStorage.getContractorMonthlyStats(contractor.id, reportYear, reportMonth);
      
      let previousMonthViews: number | undefined;
      try {
        const prevStats = await typedStorage.getContractorMonthlyStats(contractor.id, prevYear, prevMonth);
        previousMonthViews = prevStats.totalViews;
      } catch (e) {}
      
      const success = await sendContractorMonthlyViewReportEmail({
        contractorName: contractor.name || user.firstName || 'Contractor',
        contractorEmail: user.email,
        monthName,
        year: reportYear,
        totalViews: stats.totalViews,
        uniqueVisitors: stats.uniqueVisitors,
        websiteClicks: stats.websiteClicks,
        phoneClicks: stats.phoneClicks,
        emailClicks: stats.emailClicks,
        socialMediaClicks: stats.socialMediaClicks,
        previousMonthViews,
      });
      
      if (success) {
        // Mark as sent with actual stats after successful email delivery
        const marked = await markReportSent(contractor.id, reportKey, stats.totalViews, stats.uniqueVisitors);
        if (marked) {
          sentCount++;
          console.log(`[PROFILE-VIEW-SCHEDULER] Sent report to ${contractor.name} (${user.email})`);
        } else {
          // Claim was lost (another process took over) - don't count as our send
          // The other process will handle marking it sent
          console.log(`[PROFILE-VIEW-SCHEDULER] Claim lost for ${contractor.id} after email sent - another process handling`);
        }
      } else {
        // Email failed - release slot so it can be retried
        await releaseReportSlot(contractor.id, reportKey);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    console.log(`[PROFILE-VIEW-SCHEDULER] Completed: ${sentCount} sent, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[PROFILE-VIEW-SCHEDULER] Error sending monthly reports:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startProfileViewReportScheduler() {
  if (schedulerInterval) {
    console.log('[PROFILE-VIEW-SCHEDULER] Scheduler already running');
    return;
  }
  
  console.log('[PROFILE-VIEW-SCHEDULER] Starting profile view report scheduler');
  
  // Run immediately on startup (will only send on 1st of month)
  sendMonthlyProfileViewReports();
  
  // Then check every hour
  schedulerInterval = setInterval(sendMonthlyProfileViewReports, CHECK_INTERVAL_MS);
}

export function stopProfileViewReportScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[PROFILE-VIEW-SCHEDULER] Scheduler stopped');
  }
}

// Manual trigger for testing (bypasses the 1st of month check)
// WARNING: This will send real emails to contractors - use with caution
async function sendReportsNow() {
  console.log('[PROFILE-VIEW-SCHEDULER] Manual trigger - sending reports...');
  
  const now = new Date();
  const previousMonth = new Date(now);
  previousMonth.setMonth(previousMonth.getMonth() - 1);
  const reportYear = previousMonth.getFullYear();
  const reportMonth = previousMonth.getMonth() + 1;
  const reportKey = `${reportYear}-${String(reportMonth).padStart(2, '0')}`;
  const monthName = MONTH_NAMES[previousMonth.getMonth()];
  
  const twoMonthsAgo = new Date(previousMonth);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 1);
  const prevYear = twoMonthsAgo.getFullYear();
  const prevMonth = twoMonthsAgo.getMonth() + 1;
  
  const allContractors = await storage.getContractors({});
  let sentCount = 0;
  
  for (const contractor of allContractors) {
    if (isDemoId(contractor.userId) || isDemoId(contractor.id)) continue;
    
    // Try to claim the slot FIRST - atomic lock prevents duplicates
    const claimed = await claimReportSlot(contractor.id, reportKey);
    if (!claimed) {
      console.log(`[PROFILE-VIEW-SCHEDULER] Skipping ${contractor.id}, already claimed for ${reportKey}`);
      continue;
    }
    
    const user = await storage.getUser(contractor.userId);
    if (!user?.email) {
      await releaseReportSlot(contractor.id, reportKey);
      continue;
    }
    
    const canSend = await canSendEngagementEmail(contractor.userId);
    if (!canSend) {
      await releaseReportSlot(contractor.id, reportKey);
      continue;
    }
    
    const stats = await typedStorage.getContractorMonthlyStats(contractor.id, reportYear, reportMonth);
    
    let previousMonthViews: number | undefined;
    try {
      const prevStats = await typedStorage.getContractorMonthlyStats(contractor.id, prevYear, prevMonth);
      previousMonthViews = prevStats.totalViews;
    } catch (e) {}
    
    const success = await sendContractorMonthlyViewReportEmail({
      contractorName: contractor.name || user.firstName || 'Contractor',
      contractorEmail: user.email,
      monthName,
      year: reportYear,
      totalViews: stats.totalViews,
      uniqueVisitors: stats.uniqueVisitors,
      websiteClicks: stats.websiteClicks,
      phoneClicks: stats.phoneClicks,
      emailClicks: stats.emailClicks,
      socialMediaClicks: stats.socialMediaClicks,
      previousMonthViews,
    });
    
    if (success) {
      const marked = await markReportSent(contractor.id, reportKey, stats.totalViews, stats.uniqueVisitors);
      if (marked) {
        sentCount++;
      }
    } else {
      await releaseReportSlot(contractor.id, reportKey);
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`[PROFILE-VIEW-SCHEDULER] Manual send complete: ${sentCount} reports sent`);
  return sentCount;
}

export const profileViewReportScheduler = {
  start: startProfileViewReportScheduler,
  stop: stopProfileViewReportScheduler,
  sendNow: sendReportsNow,
};
