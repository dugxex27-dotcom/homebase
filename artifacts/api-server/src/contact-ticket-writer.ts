import type { InsertNotification } from "@workspace/db";
import {
  createImmediateNotification,
  createNotificationSafely,
  notificationCategories,
} from "./notification-writers";

export interface PublicContactSubmission {
  name: string;
  email: string;
  category: string;
  subject: string;
  message: string;
}

interface GuestTicketInput {
  userId: null;
  category: string;
  priority: string;
  subject: string;
  description: string;
}

export interface ContactTicketStorage {
  createSupportTicket(ticket: GuestTicketInput): Promise<{ id: string }>;
  getUserByEmail(email: string): Promise<{ id: string } | undefined>;
  createNotification(notification: InsertNotification): Promise<unknown>;
}

export async function createGuestContactTicket(
  storage: ContactTicketStorage,
  submission: PublicContactSubmission,
  notificationEmails: string[],
) {
  const ticket = await storage.createSupportTicket({
    userId: null,
    category: submission.category,
    priority: "medium",
    subject: submission.subject,
    description: `From: ${submission.name} (${submission.email})\n\n${submission.message}`,
  });

  for (const email of new Set(notificationEmails)) {
    try {
      const adminUser = await storage.getUserByEmail(email);
      if (!adminUser) {
        continue;
      }

      await createNotificationSafely(
        storage,
        createImmediateNotification({
          homeownerId: adminUser.id,
          type: "support_ticket",
          category: notificationCategories.contactForm,
          title: "New Contact Form Submission",
          message: `${submission.name} (${submission.email}) submitted a contact form: "${submission.subject}"`,
          actionUrl: "/admin/support",
        }),
        `contact form notification for ticket ${ticket.id}`,
      );
    } catch (notificationError) {
      console.error(
        `[CONTACT] Failed to prepare admin notification for ticket ${ticket.id}; ticket was created.`,
        notificationError,
      );
    }
  }

  return ticket;
}