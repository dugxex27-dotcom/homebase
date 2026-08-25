import { describe, expect, it, vi } from "vitest";
import { createGuestContactTicket } from "./contact-ticket-writer";

const submission = {
  name: "Guest Contact",
  email: "guest@example.test",
  category: "technical",
  subject: "Help with my account",
  message: "Please help me resolve this issue.",
};

describe("createGuestContactTicket", () => {
  it("persists a guest ticket and a complete admin notification", async () => {
    const storage = {
      createSupportTicket: vi.fn().mockResolvedValue({ id: "ticket-1" }),
      getUserByEmail: vi.fn().mockResolvedValue({ id: "admin-1" }),
      createNotification: vi.fn().mockResolvedValue({ id: "notification-1" }),
    };

    const ticket = await createGuestContactTicket(storage, submission, [
      "admin@example.test",
      "admin@example.test",
    ]);

    expect(ticket).toEqual({ id: "ticket-1" });
    expect(storage.createSupportTicket).toHaveBeenCalledWith(expect.objectContaining({
      userId: null,
      category: "technical",
      subject: "Help with my account",
    }));
    expect(storage.getUserByEmail).toHaveBeenCalledTimes(1);
    expect(storage.createNotification).toHaveBeenCalledWith(expect.objectContaining({
      homeownerId: "admin-1",
      type: "support_ticket",
      category: "support",
      actionUrl: "/admin/support",
      scheduledFor: expect.any(String),
    }));
  });

  it("keeps the ticket successful when the secondary admin notification fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const storage = {
      createSupportTicket: vi.fn().mockResolvedValue({ id: "ticket-2" }),
      getUserByEmail: vi.fn().mockResolvedValue({ id: "admin-1" }),
      createNotification: vi.fn().mockRejectedValue(new Error("notification database unavailable")),
    };

    await expect(
      createGuestContactTicket(storage, submission, ["admin@example.test"]),
    ).resolves.toEqual({ id: "ticket-2" });

    expect(storage.createSupportTicket).toHaveBeenCalledOnce();
    expect(storage.createNotification).toHaveBeenCalledOnce();
    errorSpy.mockRestore();
  });
});