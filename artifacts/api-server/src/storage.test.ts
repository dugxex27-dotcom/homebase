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

describe("MemStorage.transferHouseOwnership", () => {
  let storage: MemStorage;

  const ownerA = "homeowner-a";
  const ownerB = "homeowner-b";

  beforeEach(() => {
    storage = new MemStorage();
  });

  it("transfers task completions from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      address: "123 Main St",
      city: "Testville",
      state: "TX",
      zipCode: "78701",
      country: "US",
      isDefault: true,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-1",
      taskType: "seasonal",
      taskTitle: "Change HVAC filter",
      month: 5,
      year: 2026,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-2",
      taskType: "annual",
      taskTitle: "Inspect roof",
      month: 5,
      year: 2026,
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(2);

    const completionsForB = await storage.getTaskCompletions(ownerB, house.id);
    expect(completionsForB).toHaveLength(2);
    completionsForB.forEach((c) => {
      expect(c.homeownerId).toBe(ownerB);
      expect(c.houseId).toBe(house.id);
    });

    const completionsForA = await storage.getTaskCompletions(ownerA, house.id);
    expect(completionsForA).toHaveLength(0);
  });

  it("transfers task overrides from homeowner A to homeowner B", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      address: "456 Oak Ave",
      city: "Testville",
      state: "TX",
      zipCode: "78701",
      country: "US",
      isDefault: false,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "seasonal-hvac",
      isEnabled: false,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "annual-roof",
      isEnabled: true,
      notes: "Custom note",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskOverridesTransferred).toBe(2);

    const overridesForB = await storage.getTaskOverrides(ownerB, house.id);
    expect(overridesForB).toHaveLength(2);
    overridesForB.forEach((o) => {
      expect(o.homeownerId).toBe(ownerB);
      expect(o.houseId).toBe(house.id);
    });

    const overridesForA = await storage.getTaskOverrides(ownerA, house.id);
    expect(overridesForA).toHaveLength(0);
  });

  it("transfers both task completions and task overrides in a single call", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      address: "789 Pine Rd",
      city: "Testville",
      state: "TX",
      zipCode: "78701",
      country: "US",
      isDefault: false,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-3",
      taskType: "monthly",
      taskTitle: "Test smoke detectors",
      month: 4,
      year: 2026,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: house.id,
      taskId: "task-3",
      isEnabled: true,
      frequencyType: "monthly",
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(1);
    expect(result.taskOverridesTransferred).toBe(1);

    const completionsForB = await storage.getTaskCompletions(ownerB, house.id);
    expect(completionsForB).toHaveLength(1);
    expect(completionsForB[0].homeownerId).toBe(ownerB);

    const overridesForB = await storage.getTaskOverrides(ownerB, house.id);
    expect(overridesForB).toHaveLength(1);
    expect(overridesForB[0].homeownerId).toBe(ownerB);
  });

  it("only transfers records belonging to the specified house", async () => {
    const houseToTransfer = await storage.createHouse({
      homeownerId: ownerA,
      address: "10 Transfer St",
      city: "Testville",
      state: "TX",
      zipCode: "78701",
      country: "US",
      isDefault: false,
    });

    const otherHouse = await storage.createHouse({
      homeownerId: ownerA,
      address: "20 Other St",
      city: "Testville",
      state: "TX",
      zipCode: "78701",
      country: "US",
      isDefault: false,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: houseToTransfer.id,
      taskId: "task-transfer",
      taskType: "seasonal",
      taskTitle: "Should transfer",
      month: 5,
      year: 2026,
    });

    await storage.createTaskCompletion({
      homeownerId: ownerA,
      houseId: otherHouse.id,
      taskId: "task-stay",
      taskType: "annual",
      taskTitle: "Should stay",
      month: 5,
      year: 2026,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: houseToTransfer.id,
      taskId: "task-transfer",
      isEnabled: true,
    });

    await storage.upsertTaskOverride({
      homeownerId: ownerA,
      houseId: otherHouse.id,
      taskId: "task-stay",
      isEnabled: false,
    });

    const result = await storage.transferHouseOwnership(houseToTransfer.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(1);
    expect(result.taskOverridesTransferred).toBe(1);

    const completionsForB = await storage.getTaskCompletions(ownerB, houseToTransfer.id);
    expect(completionsForB).toHaveLength(1);

    const remainingForA = await storage.getTaskCompletions(ownerA, otherHouse.id);
    expect(remainingForA).toHaveLength(1);
    expect(remainingForA[0].homeownerId).toBe(ownerA);

    const overridesStillWithA = await storage.getTaskOverrides(ownerA, otherHouse.id);
    expect(overridesStillWithA).toHaveLength(1);
    expect(overridesStillWithA[0].homeownerId).toBe(ownerA);
  });

  it("returns zero counts when there are no task completions or overrides", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      address: "Empty House Lane",
      city: "Testville",
      state: "TX",
      zipCode: "78701",
      country: "US",
      isDefault: false,
    });

    const result = await storage.transferHouseOwnership(house.id, ownerA, ownerB);

    expect(result.taskCompletionsTransferred).toBe(0);
    expect(result.taskOverridesTransferred).toBe(0);
  });

  it("throws when the house does not belong to homeowner A", async () => {
    const house = await storage.createHouse({
      homeownerId: ownerA,
      address: "Wrong Owner St",
      city: "Testville",
      state: "TX",
      zipCode: "78701",
      country: "US",
      isDefault: false,
    });

    await expect(
      storage.transferHouseOwnership(house.id, "wrong-owner", ownerB)
    ).rejects.toThrow("House not found or ownership mismatch");
  });
});
