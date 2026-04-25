import { db } from "./db";
import { maintenanceLogs, taskCompletions } from "@shared/schema";
import { isNotNull, notInArray, sql } from "drizzle-orm";

/**
 * Backfill script to migrate existing maintenance_logs into task_completions table
 * This ensures historical completed tasks count toward health scores
 */
async function backfillTaskCompletions() {
  console.log("Starting task completions backfill...");
  
  try {
    // Get all existing task completion IDs to avoid duplicates
    const existingCompletions = await db.select({ 
      taskTitle: taskCompletions.taskTitle,
      houseId: taskCompletions.houseId,
      completedAt: taskCompletions.completedAt
    }).from(taskCompletions);
    
    console.log(`Found ${existingCompletions.length} existing task completions`);
    
    // Get all maintenance logs that have completion_method set (indicating they're task completions)
    const logsToMigrate = await db.select()
      .from(maintenanceLogs)
      .where(isNotNull(maintenanceLogs.completionMethod));
    
    console.log(`Found ${logsToMigrate.length} maintenance logs to potentially migrate`);
    
    let migratedCount = 0;
    let skippedCount = 0;
    
    for (const log of logsToMigrate) {
      // Skip if this exact task already exists in task_completions
      const isDuplicate = existingCompletions.some(completion => 
        completion.taskTitle === log.serviceType &&
        completion.houseId === log.houseId &&
        new Date(completion.completedAt).toDateString() === new Date(log.serviceDate).toDateString()
      );
      
      if (isDuplicate) {
        console.log(`Skipping duplicate: ${log.serviceType} (${log.serviceDate})`);
        skippedCount++;
        continue;
      }
      
      // Parse the service date
      const serviceDate = new Date(log.serviceDate);
      
      // Calculate estimated cost from actual cost or diy savings
      let estimatedCost: string | null = null;
      if (log.cost) {
        estimatedCost = log.cost.toString();
      } else if (log.diySavingsAmount) {
        // For DIY tasks, estimated cost ≈ savings (since savings = pro cost - diy cost ≈ pro cost)
        estimatedCost = log.diySavingsAmount.toString();
      }
      
      const taskCompletionData = {
        homeownerId: log.homeownerId,
        houseId: log.houseId,
        taskId: null,
        taskType: 'maintenance' as const,
        taskTitle: log.serviceType || 'Maintenance Task',
        taskCategory: null,
        completedAt: serviceDate,
        month: serviceDate.getMonth() + 1,
        year: serviceDate.getFullYear(),
        completionMethod: log.completionMethod === 'diy' ? 'diy' as const : 'professional' as const,
        estimatedCost,
        actualCost: log.cost?.toString() || null,
        costSavings: log.diySavingsAmount?.toString() || null,
        notes: log.notes,
        documentsUploaded: 0,
      };
      
      await db.insert(taskCompletions).values(taskCompletionData);
      console.log(`✓ Migrated: ${log.serviceType} (${log.serviceDate})`);
      migratedCount++;
    }
    
    console.log("\n=== Backfill Complete ===");
    console.log(`Migrated: ${migratedCount} tasks`);
    console.log(`Skipped: ${skippedCount} duplicates`);
    console.log(`Total in task_completions: ${existingCompletions.length + migratedCount}`);
    
  } catch (error) {
    console.error("Backfill failed:", error);
    throw error;
  }
}

// Run the backfill
backfillTaskCompletions()
  .then(() => {
    console.log("Backfill script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Backfill script failed:", error);
    process.exit(1);
  });
