import { beforeEach, describe, expect, it, vi } from "vitest";

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

import { achievements as canonicalDefinitions } from "./seed-achievements";
import { MemStorage } from "./storage";

describe("MemStorage achievement definition seed", () => {
  let storage: MemStorage;

  beforeEach(() => {
    storage = new MemStorage();
  });

  it("loads every active canonical definition with matching tiers and criteria", async () => {
    const definitions = await storage.getAllAchievementDefinitions();

    expect(definitions).toHaveLength(canonicalDefinitions.length);
    expect(definitions.map(({ achievementKey, tier, criteria }) => ({
      achievementKey,
      tier,
      criteria,
    }))).toEqual(canonicalDefinitions.map(({ achievementKey, tier, criteria }) => ({
      achievementKey,
      tier,
      criteria,
    })));
  });

  it("creates visible progress and unlocks the standard first-task badge", async () => {
    const homeownerId = "achievement-seed-homeowner";
    const house = await storage.createHouse({
      homeownerId,
      name: "Achievement Test House",
      climateZone: "mixed",
      homeSystems: [],
      address: "1 Badge Way",
      isDefault: true,
    });

    await storage.createTaskCompletion({
      homeownerId,
      houseId: house.id,
      taskId: "task-1",
      taskType: "seasonal",
      taskTitle: "Test smoke detector",
      month: 1,
      year: new Date().getFullYear(),
    });

    const newlyUnlocked = await storage.checkAndAwardAchievements(homeownerId);
    expect(newlyUnlocked.map((achievement) => achievement.achievementKey)).toContain("first_step");

    const progress = await storage.getAchievementProgress(homeownerId, "first_step");
    expect(progress.isUnlocked).toBe(true);
    expect(progress.progress).toBe(100);
  });
});