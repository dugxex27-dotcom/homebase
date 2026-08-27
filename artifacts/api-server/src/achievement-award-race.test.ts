import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./db", () => ({
  db: {},
  pool: {},
}));

vi.mock("./lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { MemStorage } from "./storage";
import type { AchievementDefinition } from "@workspace/db";

/**
 * Exercises the achievement duplicate-award race: two concurrent
 * checkAndAwardAchievements() calls for the same homeowner both see the
 * achievement as not-yet-unlocked and both attempt to create it.
 *
 * The fix relies on the DB's unique (homeowner_id, achievement_key) index
 * plus createUserAchievementIfAbsent()'s onConflictDoNothing guard — in
 * MemStorage the same atomicity is provided by a synchronous
 * check-and-insert over the in-memory map. Only one of the two concurrent
 * calls should end up with the achievement in its own `newlyUnlocked`
 * result, and exactly one row should ever exist for the pair.
 */
describe("achievement duplicate-award race", () => {
  let storage: MemStorage;
  const homeownerId = "homeowner-race";

  const seedFirstTaskDefinition = () => {
    const def: AchievementDefinition = {
      id: "def-first-task",
      achievementKey: "first_task_completed",
      category: "organization",
      name: "First Task",
      description: "Complete your first maintenance task",
      icon: "trophy",
      criteria: JSON.stringify({ type: "first_task" }),
      points: 10,
      tier: "bronze",
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
    };
    // No public seed API exists for achievement definitions (dev seeds them
    // out-of-band); reach into the private map directly for this test.
    (storage as any).achievementDefinitionsMap.set(def.id, def);
  };

  beforeEach(async () => {
    storage = new MemStorage();
    seedFirstTaskDefinition();

    const house = await storage.createHouse({
      homeownerId,
      name: "Race Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "1 Race Ct",
      isDefault: true,
    });

    // A single completed task is enough to satisfy the "first_task" criteria
    // (isCompleted = allCompletions.length > 0), so both concurrent checks
    // will independently evaluate isCompleted = true for the same key.
    await storage.createTaskCompletion({
      homeownerId,
      houseId: house.id,
      taskId: "task-1",
      taskType: "seasonal",
      taskTitle: "Change HVAC filter",
      month: 1,
      year: new Date().getFullYear(),
    });
  });

  it("awards the achievement exactly once on a normal (non-concurrent) check", async () => {
    const first = await storage.checkAndAwardAchievements(homeownerId);
    expect(first.map((a) => a.achievementKey)).toContain("first_task_completed");

    const second = await storage.checkAndAwardAchievements(homeownerId);
    // Already unlocked — a second check must not re-award or duplicate it.
    expect(second.map((a) => a.achievementKey)).not.toContain("first_task_completed");

    const rows = (await storage.getUserAchievements(homeownerId)).filter(
      (a) => a.achievementKey === "first_task_completed"
    );
    expect(rows).toHaveLength(1);
  });

  it("never lets two concurrent checks both create the achievement row or both report it as newly unlocked", async () => {
    const [resultA, resultB] = await Promise.all([
      storage.checkAndAwardAchievements(homeownerId),
      storage.checkAndAwardAchievements(homeownerId),
    ]);

    const awardedInA = resultA.some((a) => a.achievementKey === "first_task_completed");
    const awardedInB = resultB.some((a) => a.achievementKey === "first_task_completed");

    // Exactly one of the two concurrent requests should see itself as the
    // one that unlocked the achievement (i.e. exactly one badge/notification
    // would be sent), never both and never neither.
    expect([awardedInA, awardedInB].filter(Boolean)).toHaveLength(1);

    const rows = (await storage.getUserAchievements(homeownerId)).filter(
      (a) => a.achievementKey === "first_task_completed"
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].isUnlocked).toBe(true);
  });

  it("createUserAchievementIfAbsent returns undefined for a duplicate (homeownerId, achievementKey) pair", async () => {
    const first = await storage.createUserAchievementIfAbsent({
      homeownerId,
      achievementKey: "manual_key",
      progress: "100",
      isUnlocked: true,
      unlockedAt: new Date(),
    });
    expect(first).toBeDefined();

    const second = await storage.createUserAchievementIfAbsent({
      homeownerId,
      achievementKey: "manual_key",
      progress: "100",
      isUnlocked: true,
      unlockedAt: new Date(),
    });
    expect(second).toBeUndefined();

    const rows = (await storage.getUserAchievements(homeownerId)).filter(
      (a) => a.achievementKey === "manual_key"
    );
    expect(rows).toHaveLength(1);
  });
});
