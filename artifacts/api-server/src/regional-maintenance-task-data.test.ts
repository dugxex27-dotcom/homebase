import { describe, expect, it } from "vitest";
import { REGIONAL_MAINTENANCE_TASKS } from "./regional-maintenance-task-data";

const EXPECTED_ZONE_COUNTS = {
  US: 6,
  CA: 5,
  AU: 6,
  GB: 3,
};

describe("regional maintenance task seed data", () => {
  it("provides five unique tasks for every climate zone in all four countries", () => {
    const allTaskIds = new Set<string>();
    let totalTasks = 0;

    for (const [countryCode, expectedZoneCount] of Object.entries(EXPECTED_ZONE_COUNTS)) {
      const zones = REGIONAL_MAINTENANCE_TASKS[countryCode];
      expect(Object.keys(zones)).toHaveLength(expectedZoneCount);

      for (const tasks of Object.values(zones)) {
        expect(tasks).toHaveLength(5);
        for (const task of tasks) {
          expect(allTaskIds.has(task.taskId)).toBe(false);
          allTaskIds.add(task.taskId);
          expect(task.months.length).toBeGreaterThan(0);
          expect(task.title).not.toHaveLength(0);
          expect(task.description).not.toHaveLength(0);
          totalTasks++;
        }
      }
    }

    expect(totalTasks).toBe(100);
  });

  it("includes the key climate-specific maintenance examples", () => {
    expect(
      REGIONAL_MAINTENANCE_TASKS.AU.tropical.some((task) =>
        task.title.toLowerCase().includes("cyclone damage"),
      ),
    ).toBe(true);
    expect(
      REGIONAL_MAINTENANCE_TASKS.GB["oceanic-gb"].some((task) =>
        task.title.toLowerCase().includes("bleed radiators"),
      ),
    ).toBe(true);
  });
});