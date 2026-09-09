import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStripeProcessedEventCount: vi.fn(),
  failStaleStripePendingEvents: vi.fn(),
  pruneOldStripeProcessedEvents: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: {
    getStripeProcessedEventCount: mocks.getStripeProcessedEventCount,
    failStaleStripePendingEvents: mocks.failStaleStripePendingEvents,
    pruneOldStripeProcessedEvents: mocks.pruneOldStripeProcessedEvents,
  },
}));

vi.mock("./lib/logger", () => ({
  logger: {
    info: mocks.info,
    warn: mocks.warn,
    error: mocks.error,
  },
}));

import {
  checkStripeDedupTableSize,
  STRIPE_DEDUP_HEALTH_PROBE_INTERVAL_MS,
  STRIPE_DEDUP_ROW_WARN_THRESHOLD,
  stripeDedupCleanupScheduler,
} from "./stripe-dedup-cleanup-scheduler";

describe("Stripe dedup cleanup scheduler health probe", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    mocks.getStripeProcessedEventCount.mockResolvedValue(0);
    mocks.failStaleStripePendingEvents.mockResolvedValue({ updated: 0 });
    mocks.pruneOldStripeProcessedEvents.mockResolvedValue({ deleted: 0, remaining: 0 });
  });

  afterEach(() => {
    stripeDedupCleanupScheduler.stop();
    vi.useRealTimers();
  });

  it("warns when the row count exceeds the threshold without pruning", async () => {
    mocks.getStripeProcessedEventCount.mockResolvedValue(STRIPE_DEDUP_ROW_WARN_THRESHOLD + 1);

    await checkStripeDedupTableSize();

    expect(mocks.warn).toHaveBeenCalledWith(
      {
        rowCount: STRIPE_DEDUP_ROW_WARN_THRESHOLD + 1,
        threshold: STRIPE_DEDUP_ROW_WARN_THRESHOLD,
      },
      expect.stringContaining("exceeds warning threshold between cleanup runs"),
    );
    expect(mocks.failStaleStripePendingEvents).not.toHaveBeenCalled();
    expect(mocks.pruneOldStripeProcessedEvents).not.toHaveBeenCalled();
  });

  it("does not warn at the threshold", async () => {
    mocks.getStripeProcessedEventCount.mockResolvedValue(STRIPE_DEDUP_ROW_WARN_THRESHOLD);

    await checkStripeDedupTableSize();

    expect(mocks.warn).not.toHaveBeenCalled();
  });

  it("runs the read-only health probe every six hours", async () => {
    stripeDedupCleanupScheduler.start();

    await vi.advanceTimersByTimeAsync(STRIPE_DEDUP_HEALTH_PROBE_INTERVAL_MS);

    expect(mocks.getStripeProcessedEventCount).toHaveBeenCalledTimes(1);
    expect(mocks.failStaleStripePendingEvents).toHaveBeenCalledTimes(1);
    expect(mocks.pruneOldStripeProcessedEvents).toHaveBeenCalledTimes(1);
  });
});