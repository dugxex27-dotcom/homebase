import { db } from "./db";
import { achievementDefinitions } from "@shared/schema";

interface AchievementDefinition {
  achievementKey: string;
  category: string;
  name: string;
  description: string;
  icon: string;
  criteria: string;
  points: number;
  tier: string;
  sortOrder: number;
}

const achievements: AchievementDefinition[] = [
  // SEASONAL MAINTENANCE ACHIEVEMENTS (20 total - expanded from 4)
  // Winter Season (3 tiers)
  {
    achievementKey: "winter_starter",
    category: "Seasonal",
    name: "Winter Starter",
    description: "Complete 3 winter maintenance tasks (Dec-Feb)",
    icon: "snowflake",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "winter", count: 3 }),
    points: 10,
    tier: "bronze",
    sortOrder: 1
  },
  {
    achievementKey: "winter_warrior",
    category: "Seasonal",
    name: "Winter Warrior",
    description: "Complete 5 winter maintenance tasks (Dec-Feb)",
    icon: "snowflake",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "winter", count: 5 }),
    points: 20,
    tier: "silver",
    sortOrder: 2
  },
  {
    achievementKey: "winter_champion",
    category: "Seasonal",
    name: "Winter Champion",
    description: "Complete 10 winter maintenance tasks (Dec-Feb)",
    icon: "snowflake",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "winter", count: 10 }),
    points: 35,
    tier: "gold",
    sortOrder: 3
  },
  
  // Spring Season (3 tiers)
  {
    achievementKey: "spring_starter",
    category: "Seasonal",
    name: "Spring Starter",
    description: "Complete 3 spring maintenance tasks (Mar-May)",
    icon: "leaf",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "spring", count: 3 }),
    points: 10,
    tier: "bronze",
    sortOrder: 4
  },
  {
    achievementKey: "spring_renewal",
    category: "Seasonal",
    name: "Spring Renewal",
    description: "Complete 5 spring maintenance tasks (Mar-May)",
    icon: "leaf",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "spring", count: 5 }),
    points: 20,
    tier: "silver",
    sortOrder: 5
  },
  {
    achievementKey: "spring_champion",
    category: "Seasonal",
    name: "Spring Champion",
    description: "Complete 10 spring maintenance tasks (Mar-May)",
    icon: "leaf",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "spring", count: 10 }),
    points: 35,
    tier: "gold",
    sortOrder: 6
  },
  
  // Summer Season (3 tiers)
  {
    achievementKey: "summer_starter",
    category: "Seasonal",
    name: "Summer Starter",
    description: "Complete 3 summer maintenance tasks (Jun-Aug)",
    icon: "sun",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "summer", count: 3 }),
    points: 10,
    tier: "bronze",
    sortOrder: 7
  },
  {
    achievementKey: "summer_sentinel",
    category: "Seasonal",
    name: "Summer Sentinel",
    description: "Complete 5 summer maintenance tasks (Jun-Aug)",
    icon: "sun",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "summer", count: 5 }),
    points: 20,
    tier: "silver",
    sortOrder: 8
  },
  {
    achievementKey: "summer_champion",
    category: "Seasonal",
    name: "Summer Champion",
    description: "Complete 10 summer maintenance tasks (Jun-Aug)",
    icon: "sun",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "summer", count: 10 }),
    points: 35,
    tier: "gold",
    sortOrder: 9
  },
  
  // Fall Season (3 tiers)
  {
    achievementKey: "fall_starter",
    category: "Seasonal",
    name: "Fall Starter",
    description: "Complete 3 fall maintenance tasks (Sep-Nov)",
    icon: "cloud",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "fall", count: 3 }),
    points: 10,
    tier: "bronze",
    sortOrder: 10
  },
  {
    achievementKey: "fall_prepper",
    category: "Seasonal",
    name: "Fall Prepper",
    description: "Complete 5 fall maintenance tasks (Sep-Nov)",
    icon: "cloud",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "fall", count: 5 }),
    points: 20,
    tier: "silver",
    sortOrder: 11
  },
  {
    achievementKey: "fall_champion",
    category: "Seasonal",
    name: "Fall Champion",
    description: "Complete 10 fall maintenance tasks (Sep-Nov)",
    icon: "cloud",
    criteria: JSON.stringify({ type: "seasonal_tasks", season: "fall", count: 10 }),
    points: 35,
    tier: "gold",
    sortOrder: 12
  },
  
  // Special Seasonal Achievements (4)
  {
    achievementKey: "all_seasons_master",
    category: "Seasonal",
    name: "All Seasons Master",
    description: "Complete maintenance tasks in all 4 seasons in a calendar year",
    icon: "calendar",
    criteria: JSON.stringify({ type: "all_seasons", count: 1 }),
    points: 50,
    tier: "platinum",
    sortOrder: 13
  },
  {
    achievementKey: "seasonal_perfectionist",
    category: "Seasonal",
    name: "Seasonal Perfectionist",
    description: "Complete 15+ tasks in any single season",
    icon: "star",
    criteria: JSON.stringify({ type: "seasonal_peak", count: 15 }),
    points: 60,
    tier: "platinum",
    sortOrder: 14
  },
  {
    achievementKey: "year_round_caretaker",
    category: "Seasonal",
    name: "Year-Round Caretaker",
    description: "Maintain your home across all 4 seasons (at least 3 tasks per season)",
    icon: "home",
    criteria: JSON.stringify({ type: "year_round", min_per_season: 3 }),
    points: 75,
    tier: "diamond",
    sortOrder: 15
  },
  {
    achievementKey: "seasonal_consistency",
    category: "Seasonal",
    name: "Seasonal Consistency",
    description: "Complete at least 5 tasks in each of the 4 seasons",
    icon: "target",
    criteria: JSON.stringify({ type: "seasonal_consistency", min_per_season: 5 }),
    points: 100,
    tier: "diamond",
    sortOrder: 16
  },

  // FINANCIAL SAVVY ACHIEVEMENTS (5)
  {
    achievementKey: "budget_boss",
    category: "Financial Savvy",
    name: "Budget Boss",
    description: "Save $500 total through DIY maintenance",
    icon: "dollar-sign",
    criteria: JSON.stringify({ type: "total_savings", amount: 500 }),
    points: 20,
    tier: "silver",
    sortOrder: 5
  },
  {
    achievementKey: "savings_expert",
    category: "Financial Savvy",
    name: "Savings Expert",
    description: "Save $1,000 total through DIY maintenance",
    icon: "piggy-bank",
    criteria: JSON.stringify({ type: "total_savings", amount: 1000 }),
    points: 30,
    tier: "gold",
    sortOrder: 6
  },
  {
    achievementKey: "frugal_master",
    category: "Financial Savvy",
    name: "Frugal Master",
    description: "Save $2,500 total through DIY maintenance",
    icon: "trophy",
    criteria: JSON.stringify({ type: "total_savings", amount: 2500 }),
    points: 50,
    tier: "platinum",
    sortOrder: 7
  },
  {
    achievementKey: "diy_champion",
    category: "Financial Savvy",
    name: "DIY Champion",
    description: "Complete 10 tasks under professional cost estimates",
    icon: "wrench",
    criteria: JSON.stringify({ type: "under_budget", count: 10 }),
    points: 25,
    tier: "silver",
    sortOrder: 8
  },
  {
    achievementKey: "penny_pincher_pro",
    category: "Financial Savvy",
    name: "Penny Pincher Pro",
    description: "Complete 25 tasks under budget",
    icon: "dollar-sign",
    criteria: JSON.stringify({ type: "under_budget", count: 25 }),
    points: 40,
    tier: "gold",
    sortOrder: 9
  },
  
  // EXPANDED FINANCIAL ACHIEVEMENTS - Higher Savings Tiers
  {
    achievementKey: "savings_titan",
    category: "Financial Savvy",
    name: "Savings Titan",
    description: "Save $5,000 total through DIY maintenance",
    icon: "piggy-bank",
    criteria: JSON.stringify({ type: "total_savings", amount: 5000 }),
    points: 75,
    tier: "platinum",
    sortOrder: 10
  },
  {
    achievementKey: "savings_legend",
    category: "Financial Savvy",
    name: "Savings Legend",
    description: "Save $10,000 total through DIY maintenance",
    icon: "trophy",
    criteria: JSON.stringify({ type: "total_savings", amount: 10000 }),
    points: 100,
    tier: "diamond",
    sortOrder: 11
  },
  {
    achievementKey: "savings_master",
    category: "Financial Savvy",
    name: "Savings Master",
    description: "Save $25,000 total through DIY maintenance",
    icon: "star",
    criteria: JSON.stringify({ type: "total_savings", amount: 25000 }),
    points: 150,
    tier: "diamond",
    sortOrder: 12
  },
  {
    achievementKey: "savings_guru",
    category: "Financial Savvy",
    name: "Savings Guru",
    description: "Save $50,000 total through DIY maintenance",
    icon: "star",
    criteria: JSON.stringify({ type: "total_savings", amount: 50000 }),
    points: 200,
    tier: "legendary",
    sortOrder: 13
  },
  {
    achievementKey: "ultimate_saver",
    category: "Financial Savvy",
    name: "Ultimate Saver",
    description: "Save $100,000 total through DIY maintenance",
    icon: "trophy",
    criteria: JSON.stringify({ type: "total_savings", amount: 100000 }),
    points: 300,
    tier: "legendary",
    sortOrder: 14
  },
  
  // EXPANDED - More Under-Budget Tiers
  {
    achievementKey: "budget_expert",
    category: "Financial Savvy",
    name: "Budget Expert",
    description: "Complete 50 tasks under professional estimates",
    icon: "wrench",
    criteria: JSON.stringify({ type: "under_budget", count: 50 }),
    points: 60,
    tier: "platinum",
    sortOrder: 15
  },
  {
    achievementKey: "budget_legend",
    category: "Financial Savvy",
    name: "Budget Legend",
    description: "Complete 100 tasks under professional estimates",
    icon: "wrench",
    criteria: JSON.stringify({ type: "under_budget", count: 100 }),
    points: 100,
    tier: "diamond",
    sortOrder: 16
  },
  {
    achievementKey: "budget_master",
    category: "Financial Savvy",
    name: "Budget Master",
    description: "Complete 250 tasks under professional estimates",
    icon: "trophy",
    criteria: JSON.stringify({ type: "under_budget", count: 250 }),
    points: 150,
    tier: "diamond",
    sortOrder: 17
  },
  {
    achievementKey: "budget_champion",
    category: "Financial Savvy",
    name: "Budget Champion",
    description: "Complete 500 tasks under professional estimates",
    icon: "star",
    criteria: JSON.stringify({ type: "under_budget", count: 500 }),
    points: 250,
    tier: "legendary",
    sortOrder: 18
  },
  
  // NEW ACHIEVEMENT TYPE - Savings Streaks
  {
    achievementKey: "savings_streak_6",
    category: "Financial Savvy",
    name: "Consistent Saver",
    description: "Save money through DIY for 6 consecutive months",
    icon: "clock",
    criteria: JSON.stringify({ type: "consecutive_savings_months", count: 6 }),
    points: 50,
    tier: "gold",
    sortOrder: 19
  },
  {
    achievementKey: "savings_streak_12",
    category: "Financial Savvy",
    name: "Year-Long Saver",
    description: "Save money through DIY for 12 consecutive months",
    icon: "clock",
    criteria: JSON.stringify({ type: "consecutive_savings_months", count: 12 }),
    points: 100,
    tier: "platinum",
    sortOrder: 20
  },
  {
    achievementKey: "savings_streak_24",
    category: "Financial Savvy",
    name: "Savings Marathon",
    description: "Save money through DIY for 24 consecutive months",
    icon: "star",
    criteria: JSON.stringify({ type: "consecutive_savings_months", count: 24 }),
    points: 200,
    tier: "legendary",
    sortOrder: 21
  },
  
  // NEW ACHIEVEMENT TYPE - High ROI per Task
  {
    achievementKey: "high_roi_bronze",
    category: "Financial Savvy",
    name: "Efficiency Expert",
    description: "Average $200 saved per DIY task completed",
    icon: "dollar-sign",
    criteria: JSON.stringify({ type: "average_savings_per_task", amount: 200, min_tasks: 10 }),
    points: 40,
    tier: "gold",
    sortOrder: 22
  },
  {
    achievementKey: "high_roi_silver",
    category: "Financial Savvy",
    name: "ROI Master",
    description: "Average $500 saved per DIY task completed",
    icon: "piggy-bank",
    criteria: JSON.stringify({ type: "average_savings_per_task", amount: 500, min_tasks: 10 }),
    points: 75,
    tier: "platinum",
    sortOrder: 23
  },
  {
    achievementKey: "high_roi_gold",
    category: "Financial Savvy",
    name: "Value Maximizer",
    description: "Average $1,000 saved per DIY task completed",
    icon: "star",
    criteria: JSON.stringify({ type: "average_savings_per_task", amount: 1000, min_tasks: 10 }),
    points: 125,
    tier: "diamond",
    sortOrder: 24
  },
  
  // NEW ACHIEVEMENT TYPE - Quarterly Savings Goals
  {
    achievementKey: "quarterly_saver_bronze",
    category: "Financial Savvy",
    name: "Quarterly Winner",
    description: "Save $1,000 in a single quarter through DIY",
    icon: "dollar-sign",
    criteria: JSON.stringify({ type: "quarterly_savings", amount: 1000 }),
    points: 30,
    tier: "silver",
    sortOrder: 25
  },
  {
    achievementKey: "quarterly_saver_silver",
    category: "Financial Savvy",
    name: "Quarterly Champion",
    description: "Save $2,500 in a single quarter through DIY",
    icon: "piggy-bank",
    criteria: JSON.stringify({ type: "quarterly_savings", amount: 2500 }),
    points: 60,
    tier: "gold",
    sortOrder: 26
  },
  {
    achievementKey: "quarterly_saver_gold",
    category: "Financial Savvy",
    name: "Quarterly Legend",
    description: "Save $5,000 in a single quarter through DIY",
    icon: "trophy",
    criteria: JSON.stringify({ type: "quarterly_savings", amount: 5000 }),
    points: 100,
    tier: "platinum",
    sortOrder: 27
  },

  // ORGANIZATION & DOCUMENTATION ACHIEVEMENTS (6)
  {
    achievementKey: "getting_started",
    category: "Organization",
    name: "Getting Started",
    description: "Create your first 3 service records",
    icon: "file-text",
    criteria: JSON.stringify({ type: "logs_created", count: 3 }),
    points: 10,
    tier: "bronze",
    sortOrder: 10
  },
  {
    achievementKey: "record_keeper",
    category: "Organization",
    name: "Record Keeper",
    description: "Create 10 service records",
    icon: "file-text",
    criteria: JSON.stringify({ type: "logs_created", count: 10 }),
    points: 20,
    tier: "silver",
    sortOrder: 11
  },
  {
    achievementKey: "documentation_pro",
    category: "Organization",
    name: "Documentation Pro",
    description: "Create 25 service records",
    icon: "file-text",
    criteria: JSON.stringify({ type: "logs_created", count: 25 }),
    points: 35,
    tier: "gold",
    sortOrder: 12
  },
  {
    achievementKey: "archive_master",
    category: "Organization",
    name: "Archive Master",
    description: "Create 50 service records",
    icon: "archive",
    criteria: JSON.stringify({ type: "logs_created", count: 50 }),
    points: 60,
    tier: "platinum",
    sortOrder: 125
  },
  {
    achievementKey: "documentation_legend",
    category: "Organization",
    name: "Documentation Legend",
    description: "Create 100 service records",
    icon: "trophy",
    criteria: JSON.stringify({ type: "logs_created", count: 100 }),
    points: 100,
    tier: "diamond",
    sortOrder: 126
  },
  {
    achievementKey: "photo_journalist",
    category: "Organization",
    name: "Photo Journalist",
    description: "Upload 5 before/after photo pairs",
    icon: "camera",
    criteria: JSON.stringify({ type: "photos_uploaded", count: 5 }),
    points: 15,
    tier: "bronze",
    sortOrder: 130
  },
  {
    achievementKey: "photo_pro",
    category: "Organization",
    name: "Photo Pro",
    description: "Upload 10 before/after photo pairs",
    icon: "camera",
    criteria: JSON.stringify({ type: "photos_uploaded", count: 10 }),
    points: 25,
    tier: "silver",
    sortOrder: 135
  },
  {
    achievementKey: "visual_archivist",
    category: "Organization",
    name: "Visual Archivist",
    description: "Upload 15 before/after photo pairs",
    icon: "camera",
    criteria: JSON.stringify({ type: "photos_uploaded", count: 15 }),
    points: 30,
    tier: "gold",
    sortOrder: 140
  },
  {
    achievementKey: "visual_master",
    category: "Organization",
    name: "Visual Master",
    description: "Upload 30 before/after photo pairs",
    icon: "image",
    criteria: JSON.stringify({ type: "photos_uploaded", count: 30 }),
    points: 50,
    tier: "platinum",
    sortOrder: 145
  },
  {
    achievementKey: "receipt_ranger",
    category: "Organization",
    name: "Receipt Ranger",
    description: "Upload 10 receipts/warranty documents",
    icon: "file-text",
    criteria: JSON.stringify({ type: "documents_uploaded", count: 10 }),
    points: 20,
    tier: "silver",
    sortOrder: 150
  },
  {
    achievementKey: "document_keeper",
    category: "Organization",
    name: "Document Keeper",
    description: "Upload 25 receipts/warranty documents",
    icon: "folder",
    criteria: JSON.stringify({ type: "documents_uploaded", count: 25 }),
    points: 35,
    tier: "gold",
    sortOrder: 155
  },
  {
    achievementKey: "archive_expert",
    category: "Organization",
    name: "Archive Expert",
    description: "Upload 50 receipts/warranty documents",
    icon: "archive",
    criteria: JSON.stringify({ type: "documents_uploaded", count: 50 }),
    points: 60,
    tier: "platinum",
    sortOrder: 156
  },
  {
    achievementKey: "detail_oriented",
    category: "Organization",
    name: "Detail Oriented",
    description: "Create 10 service records with detailed descriptions (50+ characters)",
    icon: "pen-tool",
    criteria: JSON.stringify({ type: "detailed_logs", count: 10 }),
    points: 25,
    tier: "silver",
    sortOrder: 157
  },
  {
    achievementKey: "master_documenter",
    category: "Organization",
    name: "Master Documenter",
    description: "Create 25 service records with detailed descriptions (50+ characters)",
    icon: "file-check",
    criteria: JSON.stringify({ type: "detailed_logs", count: 25 }),
    points: 45,
    tier: "gold",
    sortOrder: 158
  },

  // REFERRAL & COMMUNITY ACHIEVEMENTS (4)
  {
    achievementKey: "helpful_neighbor",
    category: "Referral & Community",
    name: "Helpful Neighbor",
    description: "Refer 1 friend to Home Base",
    icon: "star",
    criteria: JSON.stringify({ type: "referrals", count: 1 }),
    points: 15,
    tier: "bronze",
    sortOrder: 16
  },
  {
    achievementKey: "community_builder",
    category: "Referral & Community",
    name: "Community Builder",
    description: "Refer 3 friends to Home Base",
    icon: "star",
    criteria: JSON.stringify({ type: "referrals", count: 3 }),
    points: 25,
    tier: "silver",
    sortOrder: 17
  },
  {
    achievementKey: "ambassador",
    category: "Referral & Community",
    name: "Ambassador",
    description: "Refer 5 friends to Home Base",
    icon: "star",
    criteria: JSON.stringify({ type: "referrals", count: 5 }),
    points: 40,
    tier: "gold",
    sortOrder: 18
  },
  {
    achievementKey: "influencer",
    category: "Referral & Community",
    name: "Influencer",
    description: "Refer 10 friends to Home Base",
    icon: "trophy",
    criteria: JSON.stringify({ type: "referrals", count: 10 }),
    points: 60,
    tier: "platinum",
    sortOrder: 19
  },

  // MILESTONES & ENGAGEMENT ACHIEVEMENTS (6)
  {
    achievementKey: "first_step",
    category: "Milestones",
    name: "First Step",
    description: "Complete your first maintenance task",
    icon: "star",
    criteria: JSON.stringify({ type: "first_task", count: 1 }),
    points: 10,
    tier: "bronze",
    sortOrder: 20
  },
  {
    achievementKey: "getting_serious",
    category: "Milestones",
    name: "Getting Serious",
    description: "Complete 10 total maintenance tasks",
    icon: "wrench",
    criteria: JSON.stringify({ type: "total_tasks", count: 10 }),
    points: 20,
    tier: "bronze",
    sortOrder: 21
  },
  {
    achievementKey: "maintenance_master",
    category: "Milestones",
    name: "Maintenance Master",
    description: "Complete 25 total maintenance tasks",
    icon: "trophy",
    criteria: JSON.stringify({ type: "total_tasks", count: 25 }),
    points: 35,
    tier: "silver",
    sortOrder: 22
  },
  {
    achievementKey: "home_hero",
    category: "Milestones",
    name: "Home Hero",
    description: "Complete 50 total maintenance tasks",
    icon: "trophy",
    criteria: JSON.stringify({ type: "total_tasks", count: 50 }),
    points: 50,
    tier: "gold",
    sortOrder: 23
  },
  {
    achievementKey: "multi_property_manager",
    category: "Milestones",
    name: "Multi-Property Manager",
    description: "Add 2 or more properties to your account",
    icon: "star",
    criteria: JSON.stringify({ type: "multi_property", count: 2 }),
    points: 25,
    tier: "silver",
    sortOrder: 24
  },
  {
    achievementKey: "contractor_connection",
    category: "Milestones",
    name: "Contractor Connection",
    description: "Hire your first contractor through Home Base",
    icon: "wrench",
    criteria: JSON.stringify({ type: "contractor_hired", count: 1 }),
    points: 15,
    tier: "bronze",
    sortOrder: 25
  },

  // STREAK & CONSISTENCY ACHIEVEMENTS (3)
  {
    achievementKey: "monthly_momentum",
    category: "Streaks",
    name: "Monthly Momentum",
    description: "Complete tasks in 3 consecutive months",
    icon: "clock",
    criteria: JSON.stringify({ type: "streak", months: 3 }),
    points: 20,
    tier: "silver",
    sortOrder: 26
  },
  {
    achievementKey: "quarterly_qualifier",
    category: "Streaks",
    name: "Quarterly Qualifier",
    description: "Complete tasks in 6 consecutive months",
    icon: "clock",
    criteria: JSON.stringify({ type: "streak", months: 6 }),
    points: 35,
    tier: "gold",
    sortOrder: 27
  },
  {
    achievementKey: "year_round_warrior",
    category: "Streaks",
    name: "Year-Round Warrior",
    description: "Complete tasks in 12 consecutive months",
    icon: "trophy",
    criteria: JSON.stringify({ type: "streak", months: 12 }),
    points: 60,
    tier: "platinum",
    sortOrder: 28
  },

  // SPECIAL ACHIEVEMENTS (4)
  {
    achievementKey: "early_adopter",
    category: "Special",
    name: "Early Adopter",
    description: "Sign up during launch period",
    icon: "star",
    criteria: JSON.stringify({ type: "early_adopter", before: "2026-01-01" }),
    points: 25,
    tier: "gold",
    sortOrder: 29
  },
  {
    achievementKey: "premium_member",
    category: "Special",
    name: "Premium Member",
    description: "Upgrade to Premium or Premium Plus plan",
    icon: "star",
    criteria: JSON.stringify({ type: "premium_subscription" }),
    points: 30,
    tier: "gold",
    sortOrder: 30
  },
  {
    achievementKey: "complete_profile",
    category: "Special",
    name: "Complete Profile",
    description: "Add all home system information",
    icon: "star",
    criteria: JSON.stringify({ type: "profile_complete", systems: 5 }),
    points: 15,
    tier: "bronze",
    sortOrder: 31
  },
  {
    achievementKey: "safety_first",
    category: "Special",
    name: "Safety First",
    description: "Complete 5 high-priority safety tasks",
    icon: "star",
    criteria: JSON.stringify({ type: "high_priority_safety", count: 5 }),
    points: 30,
    tier: "silver",
    sortOrder: 32
  }
];

async function seedAchievements() {
  console.log("Starting achievement seeding...");
  
  try {
    // Insert all achievements
    for (const achievement of achievements) {
      await db.insert(achievementDefinitions).values(achievement).onConflictDoNothing();
      console.log(`✓ Seeded: ${achievement.name}`);
    }
    
    console.log("\n✅ Successfully seeded all 66 achievements!");
    console.log("\nAchievements by category:");
    console.log("- Seasonal: 16 (EXPANDED!)");
    console.log("  → Tiered Seasonal: 12 (Bronze/Silver/Gold for Winter, Spring, Summer, Fall)");
    console.log("  → Special Seasonal: 4 (All Seasons Master, Perfectionist, Year-Round, Consistency)");
    console.log("- Financial Savvy: 19 (EXPANDED!)");
    console.log("  → Total Savings Tiers: 8 ($500 to $100K)");
    console.log("  → Under Budget Tiers: 6 (10 to 500 tasks)");
    console.log("  → Savings Streaks: 3 (6, 12, 24 months)");
    console.log("  → High ROI/Task: 3 (avg $200, $500, $1K per task)");
    console.log("  → Quarterly Goals: 3 ($1K, $2.5K, $5K per quarter)");
    console.log("- Organization: 14 (EXPANDED!)");
    console.log("  → Service Records: 5 (3 to 100 records)");
    console.log("  → Photo Pairs: 4 (5 to 30 pairs)");
    console.log("  → Documents: 3 (10 to 50 documents)");
    console.log("  → Detailed Logs: 2 (10 to 25 detailed descriptions)");
    console.log("- Referral & Community: 4");
    console.log("- Milestones: 6");
    console.log("- Streaks: 3");
    console.log("- Special: 4");
    console.log("\nTotal: 66 achievements (38 new: 16 seasonal + 14 financial + 8 organization!)");
    
  } catch (error) {
    console.error("Error seeding achievements:", error);
    throw error;
  }
}

// Run the seeding
seedAchievements()
  .then(() => {
    console.log("\nSeeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
