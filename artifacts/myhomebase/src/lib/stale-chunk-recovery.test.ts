import { describe, expect, it, vi } from "vitest";
import {
  attemptStaleChunkRecovery,
  claimStaleChunkRecovery,
  isStaleChunkLoadError,
  STALE_CHUNK_RECOVERY_WINDOW_MS,
} from "./stale-chunk-recovery";

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => {
      values.set(key, value);
    },
  };
}

describe("stale chunk recovery", () => {
  it.each([
    "Failed to fetch dynamically imported module: /assets/maintenance-old.js",
    "Importing a module script failed.",
    "ChunkLoadError: Loading chunk 42 failed",
  ])("recognizes deployment chunk failures: %s", (message) => {
    expect(isStaleChunkLoadError(new Error(message))).toBe(true);
  });

  it("does not treat an ordinary application exception as stale code", () => {
    expect(isStaleChunkLoadError(new Error("Cannot read properties of undefined"))).toBe(false);
  });

  it("allows one recovery attempt and blocks an immediate reload loop", () => {
    const storage = createStorage();
    const now = 1_000_000;

    expect(claimStaleChunkRecovery(storage, now)).toBe(true);
    expect(claimStaleChunkRecovery(storage, now + 1_000)).toBe(false);
    expect(
      claimStaleChunkRecovery(storage, now + STALE_CHUNK_RECOVERY_WINDOW_MS),
    ).toBe(true);
  });

  it("reloads once for a stale chunk and then falls back normally", () => {
    const storage = createStorage();
    const reload = vi.fn();
    const error = new Error(
      "Failed to fetch dynamically imported module: /assets/account-old.js",
    );

    expect(
      attemptStaleChunkRecovery(error, {
        storage,
        now: () => 2_000_000,
        reload,
      }),
    ).toBe(true);
    expect(
      attemptStaleChunkRecovery(error, {
        storage,
        now: () => 2_001_000,
        reload,
      }),
    ).toBe(false);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});