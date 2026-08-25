import { describe, expect, it, vi } from "vitest";
import {
  createImmediateNotification,
  createNotificationSafely,
  notificationCategories,
} from "./notification-writers";

const FIXED_NOW = new Date("2026-08-25T12:00:00.000Z");

function buildNotification(category: string, actionUrl: string) {
  return createImmediateNotification(
    {
      homeownerId: "homeowner-1",
      type: "test_notification",
      category,
      title: "Test notification",
      message: "A valid notification payload.",
      actionUrl,
      priority: "medium",
    },
    FIXED_NOW,
  );
}

describe("notification writer safeguards", () => {
  it.each([
    ["homeowner-targeted proposal creation", notificationCategories.proposal, "/messages"],
    ["sending an existing draft proposal", notificationCategories.proposal, "/messages"],
    ["public contact form", notificationCategories.contactForm, "/admin/support"],
    ["regional maintenance suggestion", notificationCategories.regionalMaintenance, "/maintenance"],
    ["contractor review request", notificationCategories.reviewRequest, "/messages"],
    ["authenticated support ticket", notificationCategories.supportTicket, "/admin/support"],
  ])("builds a complete payload for %s", (_flow, category, actionUrl) => {
    const notification = buildNotification(category, actionUrl);

    expect(notification.category).toBe(category);
    expect(notification.scheduledFor).toBe(FIXED_NOW.toISOString());
    expect(notification.actionUrl).toBe(actionUrl);
  });

  it("builds immediate notifications with the required schedule and action URL", () => {
    const notification = buildNotification(notificationCategories.proposal, "/messages");

    expect(notification).toMatchObject({
      homeownerId: "homeowner-1",
      type: "test_notification",
      category: "messages",
      scheduledFor: FIXED_NOW.toISOString(),
      actionUrl: "/messages",
    });
  });

  it("preserves an explicitly supplied schedule", () => {
    const scheduledFor = "2026-08-26T08:30:00.000Z";
    const notification = createImmediateNotification(
      {
        homeownerId: "homeowner-1",
        type: "maintenance_task",
        category: notificationCategories.regionalMaintenance,
        title: "Maintenance reminder",
        message: "Inspect the exterior.",
        scheduledFor,
        actionUrl: "/maintenance",
      },
      FIXED_NOW,
    );

    expect(notification.scheduledFor).toBe(scheduledFor);
  });

  it("stores a valid notification when persistence succeeds", async () => {
    const createNotification = vi.fn().mockResolvedValue({ id: "notification-1" });
    const stored = await createNotificationSafely(
      { createNotification },
      buildNotification(notificationCategories.reviewRequest, "/messages"),
      "review request notification",
    );

    expect(stored).toBe(true);
    expect(createNotification).toHaveBeenCalledWith(expect.objectContaining({
      category: "reviews",
      scheduledFor: FIXED_NOW.toISOString(),
      actionUrl: "/messages",
    }));
  });

  it("does not rethrow a notification persistence failure", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const createNotification = vi.fn().mockRejectedValue(new Error("database unavailable"));
    const stored = await createNotificationSafely(
      { createNotification },
      buildNotification(notificationCategories.supportTicket, "/admin/support"),
      "support ticket notification",
    );

    expect(stored).toBe(false);
    expect(createNotification).toHaveBeenCalledOnce();
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining("primary workflow continues"),
      expect.any(Error),
    );
    errorSpy.mockRestore();
  });
});