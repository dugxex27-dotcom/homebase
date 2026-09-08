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
  invoice: "invoices",
  regionalMaintenance: "maintenance",
  reviewRequest: "reviews",
} as const;

type InvoiceNotificationInput = {
  homeownerId: string;
  houseId?: string | null;
  invoiceId: string;
  invoiceTitle?: string | null;
};

export function createInvoiceUpdatedNotification(
  input: InvoiceNotificationInput,
  now = new Date(),
): NotificationInsert {
  const invoiceTitle = input.invoiceTitle || "Invoice";
  return createImmediateNotification({
    homeownerId: input.homeownerId,
    houseId: input.houseId ?? undefined,
    type: "invoice_updated",
    category: notificationCategories.invoice,
    title: "Invoice updated",
    message: `"${invoiceTitle}" was updated. Review the latest details.`,
    priority: "medium",
    actionUrl: `/pay/invoice/${input.invoiceId}`,
  }, now);
}

export function createInvoicePaymentNotification(
  input: InvoiceNotificationInput & { paymentAmount: string; isPaid: boolean },
  now = new Date(),
): NotificationInsert {
  const invoiceTitle = input.invoiceTitle || "Invoice";
  return createImmediateNotification({
    homeownerId: input.homeownerId,
    houseId: input.houseId ?? undefined,
    type: "invoice_payment",
    category: notificationCategories.invoice,
    title: input.isPaid ? "Invoice paid" : "Invoice payment recorded",
    message: `${input.paymentAmount} was recorded for "${invoiceTitle}".`,
    priority: "medium",
    actionUrl: `/pay/invoice/${input.invoiceId}`,
  }, now);
}

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