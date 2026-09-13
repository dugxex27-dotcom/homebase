import { describe, expect, it, vi } from "vitest";
import { createStorageMock } from "./storage-mock";

describe("createStorageMock", () => {
  it("creates a cached async no-op stub for an unconfigured method", async () => {
    const storage = createStorageMock();

    const firstAccess = storage.deleteUserPushSubscriptions;
    const secondAccess = storage.deleteUserPushSubscriptions;

    expect(firstAccess).toBe(secondAccess);
    expect(vi.isMockFunction(firstAccess)).toBe(true);
    await expect(firstAccess("user-1")).resolves.toBeUndefined();
    expect(firstAccess).toHaveBeenCalledWith("user-1");
  });

  it("preserves explicit method overrides", async () => {
    const getUser = vi.fn().mockResolvedValue({ id: "user-1" });
    const storage = createStorageMock({ getUser });

    await expect(storage.getUser("user-1")).resolves.toEqual({ id: "user-1" });
    expect(storage.getUser).toBe(getUser);
  });

  it("exposes lazily created methods through reflection", () => {
    const storage = createStorageMock();

    void storage.newStorageMethod;

    expect("newStorageMethod" in storage).toBe(true);
    expect(Object.keys(storage)).toContain("newStorageMethod");
    expect(Object.getOwnPropertyDescriptor(storage, "newStorageMethod")?.value)
      .toBe(storage.newStorageMethod);
  });
});