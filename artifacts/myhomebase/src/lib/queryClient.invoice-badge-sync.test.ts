import { beforeEach, describe, expect, it, vi } from "vitest";

class FakeBroadcastChannel {
  static instances: FakeBroadcastChannel[] = [];

  readonly postMessage = vi.fn();
  private messageListener: EventListener | null = null;

  constructor(readonly name: string) {
    FakeBroadcastChannel.instances.push(this);
  }

  addEventListener(type: string, listener: EventListener) {
    if (type === "message") {
      this.messageListener = listener;
    }
  }

  receiveMessage() {
    this.messageListener?.(new MessageEvent("message", { data: "changed" }));
  }
}

describe("invoice badge cross-tab sync", () => {
  beforeEach(() => {
    vi.resetModules();
    FakeBroadcastChannel.instances = [];
    vi.stubGlobal("BroadcastChannel", FakeBroadcastChannel);
  });

  it("broadcasts a change and invalidates the current tab", async () => {
    const { notifyInvoiceBadgeChanged, queryClient } = await import("./queryClient");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    notifyInvoiceBadgeChanged();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"],
    });
    expect(FakeBroadcastChannel.instances[0]?.postMessage).toHaveBeenCalledWith("changed");
  });

  it("invalidates from the server when another tab broadcasts a change", async () => {
    const { queryClient } = await import("./queryClient");
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue();

    FakeBroadcastChannel.instances[0]?.receiveMessage();

    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ["/api/homeowner/linked-invoices/unclaimed-count"],
    });
  });
});