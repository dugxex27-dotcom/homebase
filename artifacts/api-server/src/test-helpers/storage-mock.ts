import { vi } from "vitest";

/**
 * Creates a lazily auto-stubbing storage mock.
 *
 * Any method NOT listed in `overrides` is automatically backed by a
 * `vi.fn().mockResolvedValue(undefined)` stub that is created on first access
 * and then cached (so the same fn instance is returned on subsequent accesses,
 * enabling `expect(storage.someMethod).toHaveBeenCalled()` assertions).
 *
 * This prevents "X is not a function" → 500 errors in route tests whenever a
 * new method is added to storage but the test mock hasn't been updated yet.
 *
 * Usage inside vi.mock():
 *
 *   // Named hoisted mocks for assertion:
 *   const { mockGetUser } = vi.hoisted(() => ({ mockGetUser: vi.fn() }));
 *
 *   vi.mock("../storage", async () => {
 *     const { createStorageMock } = await import("../test-helpers/storage-mock");
 *     return { storage: createStorageMock({ getUser: mockGetUser }) };
 *   });
 */
export function createStorageMock(
  overrides: Record<string, any> = {},
): Record<string, any> {
  const cache: Record<string, any> = { ...overrides };

  return new Proxy({} as Record<string, any>, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== "string") return undefined;
      if (!(prop in cache)) {
        cache[prop] = vi.fn().mockResolvedValue(undefined);
      }
      return cache[prop];
    },
    has() {
      return true;
    },
    ownKeys() {
      return Object.keys(cache);
    },
    getOwnPropertyDescriptor(_target, prop: string | symbol) {
      return {
        configurable: true,
        enumerable: true,
        writable: true,
        value: cache[prop as string],
      };
    },
  });
}
