import type { InsertNotification } from "@workspace/db";

type NotificationInsert = InsertNotification & { id?: string };

export type ImmediateNotificationInput = Omit<NotificationInsert, "scheduledFor"> & {
  scheduledFor?: string;
};

type NotificationStorage = {
  createNotification(notification: NotificationInsert): Promise<unknown>;
};

export const notificationCategories = {
  contactForm: "support",
  supportTicket: "support",
  proposal: "messages",
  regionalMaintenance: "maintenance",
  reviewRequest: "reviews",
} as const;

export function createImmediateNotification(
  notification: ImmediateNotificationInput,
  now = new Date(),
): NotificationInsert {
  return {
    ...notification,
    scheduledFor: notification.scheduledFor ?? now.toISOString(),
  };
}

export async function createNotificationSafely(
  notificationStorage: NotificationStorage,
  notification: NotificationInsert,
  context: string,
): Promise<boolean> {
  try {
    await notificationStorage.createNotification(notification);
    return true;
  } catch (error) {
    console.error(`[NOTIFICATION] Failed to create ${context}; primary workflow continues.`, error);
    return false;
  }
}