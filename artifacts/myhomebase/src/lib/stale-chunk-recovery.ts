const RECOVERY_STORAGE_KEY = "myhomebase:stale-chunk-recovery-at";
export const STALE_CHUNK_RECOVERY_WINDOW_MS = 5 * 60 * 1000;

const STALE_CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /importing a module script failed/i,
  /chunkloaderror/i,
  /loading chunk [\d-]+ failed/i,
  /unable to preload css/i,
];

type RecoveryOptions = {
  storage?: Pick<Storage, "getItem" | "setItem">;
  now?: () => number;
  reload?: () => void;
};

export function isStaleChunkLoadError(error: unknown): boolean {
  const message = error instanceof Error
    ? `${error.name}: ${error.message}`
    : typeof error === "string"
      ? error
      : "";

  return STALE_CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

export function claimStaleChunkRecovery(
  storage: Pick<Storage, "getItem" | "setItem">,
  now: number,
): boolean {
  try {
    const previousAttempt = Number(storage.getItem(RECOVERY_STORAGE_KEY));
    if (
      Number.isFinite(previousAttempt) &&
      previousAttempt > 0 &&
      now - previousAttempt < STALE_CHUNK_RECOVERY_WINDOW_MS
    ) {
      return false;
    }

    storage.setItem(RECOVERY_STORAGE_KEY, String(now));
    return true;
  } catch {
    // Without durable storage, reloading could create an infinite loop.
    return false;
  }
}

export function attemptStaleChunkRecovery(
  error: unknown,
  options: RecoveryOptions = {},
): boolean {
  if (!isStaleChunkLoadError(error) || typeof window === "undefined") {
    return false;
  }

  const storage = options.storage ?? window.sessionStorage;
  const now = options.now?.() ?? Date.now();
  if (!claimStaleChunkRecovery(storage, now)) {
    return false;
  }

  (options.reload ?? (() => window.location.reload()))();
  return true;
}

export function installStaleChunkRecovery(): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handlePreloadError = (event: Event) => {
    const error = (event as Event & { payload?: unknown }).payload;
    if (!isStaleChunkLoadError(error)) {
      return;
    }

    if (attemptStaleChunkRecovery(error)) {
      // Vite otherwise rethrows the failed import into React's error boundary.
      event.preventDefault();
    }
  };

  window.addEventListener("vite:preloadError", handlePreloadError);
  return () => window.removeEventListener("vite:preloadError", handlePreloadError);
}