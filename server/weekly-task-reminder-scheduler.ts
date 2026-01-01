import { db } from './db';
import { users, taskCompletions, notificationPreferences } from '@shared/schema';
import type { TaskCompletion } from '@shared/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { storage, isDemoId, IStorage } from './storage';
import { sendWeeklyTaskReminderEmail } from './email-service';
import { getCurrentMonthTasks, getRegionFromClimateZone } from '@shared/location-maintenance-data';

const typedStorage = storage as unknown as IStorage;

const CHECK_INTERVAL_MS = 60 * 60 * 1000; // Check every hour

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

async function canSendMaintenanceEmail(userId: string): Promise<boolean> {
  try {
    const prefs = await db.select()
      .from(notificationPreferences)
      .where(and(
        eq(notificationPreferences.userId, userId),
        eq(notificationPreferences.notificationType, 'maintenance')
      ))
      .limit(1);
    
    if (prefs.length === 0) {
      return true;
    }
    
    const pref = prefs[0];
    return pref.isEnabled && pref.channels.includes('email');
  } catch (error) {
    console.error('[WEEKLY-TASK-SCHEDULER] Error checking preferences:', error);
    return true;
  }
}

interface RemainingTask {
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: string;
}

async function getRemainingTasksForHouse(
  homeownerId: string, 
  houseId: string, 
  climateZone: string,
  currentMonth: number,
  currentYear: number
): Promise<RemainingTask[]> {
  try {
    const region = getRegionFromClimateZone(climateZone);
    if (!region) return [];
    
    const monthTasks = getCurrentMonthTasks(region, currentMonth);
    if (!monthTasks) return [];
    
    const allTasks: RemainingTask[] = [];
    
    for (const task of monthTasks.seasonal) {
      allTasks.push({
        title: task.title,
        description: task.description,
        priority: task.priority || monthTasks.priority,
        category: 'seasonal'
      });
    }
    
    for (const task of monthTasks.weatherSpecific) {
      allTasks.push({
        title: task.title,
        description: task.description,
        priority: task.priority || monthTasks.priority,
        category: 'weather'
      });
    }
    
    const completions = await typedStorage.getTaskCompletionsByMonth(homeownerId, currentYear, currentMonth);
    const completedTitles = new Set(
      completions
        .filter((c: TaskCompletion) => c.houseId === houseId)
        .map((c: TaskCompletion) => c.taskTitle.toLowerCase())
    );
    
    return allTasks.filter(task => !completedTitles.has(task.title.toLowerCase()));
  } catch (error) {
    console.error('[WEEKLY-TASK-SCHEDULER] Error getting remaining tasks:', error);
    return [];
  }
}

async function sendWeeklyTaskReminders() {
  const now = new Date();
  const dayOfWeek = now.getDay();
  
  if (dayOfWeek !== 5) {
    return;
  }
  
  const hour = now.getHours();
  if (hour !== 9) {
    return;
  }
  
  console.log('[WEEKLY-TASK-SCHEDULER] Sending weekly task reminders (Friday)...');
  
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthName = MONTH_NAMES[now.getMonth()];
  
  try {
    const homeowners = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
    }).from(users)
      .where(and(
        eq(users.role, 'homeowner'),
        isNotNull(users.email)
      ));
    
    console.log(`[WEEKLY-TASK-SCHEDULER] Processing ${homeowners.length} homeowners for ${monthName} ${currentYear}`);
    
    let sentCount = 0;
    let skippedCount = 0;
    
    for (const homeowner of homeowners) {
      if (isDemoId(homeowner.id)) {
        skippedCount++;
        continue;
      }
      
      if (!homeowner.email) {
        skippedCount++;
        continue;
      }
      
      const canSend = await canSendMaintenanceEmail(homeowner.id);
      if (!canSend) {
        skippedCount++;
        continue;
      }
      
      const userHouses = await typedStorage.getHousesByHomeowner(homeowner.id);
      if (userHouses.length === 0) {
        skippedCount++;
        continue;
      }
      
      const houseTasks: { houseName: string; tasks: RemainingTask[] }[] = [];
      let totalRemainingTasks = 0;
      
      for (const house of userHouses) {
        const remainingTasks = await getRemainingTasksForHouse(
          homeowner.id,
          house.id,
          house.climateZone,
          currentMonth,
          currentYear
        );
        
        if (remainingTasks.length > 0) {
          houseTasks.push({
            houseName: house.name,
            tasks: remainingTasks
          });
          totalRemainingTasks += remainingTasks.length;
        }
      }
      
      if (totalRemainingTasks === 0) {
        skippedCount++;
        continue;
      }
      
      const success = await sendWeeklyTaskReminderEmail({
        homeownerName: homeowner.firstName || 'Homeowner',
        homeownerEmail: homeowner.email,
        monthName,
        year: currentYear,
        houseTasks,
        totalRemainingTasks,
      });
      
      if (success) {
        sentCount++;
        console.log(`[WEEKLY-TASK-SCHEDULER] Sent reminder to ${homeowner.firstName} (${homeowner.email}) - ${totalRemainingTasks} tasks remaining`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log(`[WEEKLY-TASK-SCHEDULER] Completed: ${sentCount} sent, ${skippedCount} skipped`);
  } catch (error) {
    console.error('[WEEKLY-TASK-SCHEDULER] Error sending weekly reminders:', error);
  }
}

let schedulerInterval: NodeJS.Timeout | null = null;

export function startWeeklyTaskReminderScheduler() {
  if (schedulerInterval) {
    console.log('[WEEKLY-TASK-SCHEDULER] Scheduler already running');
    return;
  }
  
  console.log('[WEEKLY-TASK-SCHEDULER] Starting weekly task reminder scheduler');
  
  sendWeeklyTaskReminders();
  
  schedulerInterval = setInterval(sendWeeklyTaskReminders, CHECK_INTERVAL_MS);
}

export function stopWeeklyTaskReminderScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[WEEKLY-TASK-SCHEDULER] Scheduler stopped');
  }
}

export const weeklyTaskReminderScheduler = {
  start: startWeeklyTaskReminderScheduler,
  stop: stopWeeklyTaskReminderScheduler,
};
