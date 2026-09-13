import { createHash } from "crypto";

type NotificationIdentity = {
  id?: string;
  homeownerId: string;
  houseId?: string | null;
  appointmentId?: string | null;
  maintenanceTaskId?: string | null;
  type: string;
  category: string;
  title: string;
  message: string;
  scheduledFor: string;
};

export function createNotificationOccurrenceId(parts: unknown[]): string {
  return `notif_${createHash("sha256").update(JSON.stringify(parts)).digest("hex")}`;
}

export function getIdempotentNotificationId(notification: NotificationIdentity): string {
  if (notification.id) return notification.id;

  let identityParts: string[];
  if (notification.maintenanceTaskId) {
    identityParts = [
      notification.homeownerId,
      notification.houseId ?? "",
      "maintenance-task",
      notification.maintenanceTaskId,
      notification.scheduledFor.slice(0, 7),
    ];
  } else if (notification.appointmentId) {
    identityParts = [
      notification.homeownerId,
      "appointment",
      notification.appointmentId,
      notification.scheduledFor,
    ];
  } else if (notification.category === "weather") {
    identityParts = [
      notification.homeownerId,
      notification.houseId ?? "",
      "weather",
      notification.type,
      notification.scheduledFor.slice(0, 10),
    ];
  } else if (notification.category === "maintenance") {
    identityParts = [
      notification.homeownerId,
      notification.houseId ?? "",
      "regional-maintenance",
      notification.title.trim().toLowerCase(),
      notification.message.trim().toLowerCase(),
      notification.scheduledFor.slice(0, 7),
    ];
  } else {
    identityParts = [
      notification.homeownerId,
      notification.houseId ?? "",
      notification.type,
      notification.category,
      notification.title,
      notification.message,
      notification.scheduledFor.slice(0, 10),
    ];
  }

  return createNotificationOccurrenceId(identityParts);
}