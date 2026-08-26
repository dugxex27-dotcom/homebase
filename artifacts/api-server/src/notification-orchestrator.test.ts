import { beforeEach, describe, expect, it, vi } from "vitest";

const { isSyntheticAccountUserId, sendWelcomeSMS, sendWelcomeEmail, sendWelcomePush } = vi.hoisted(() => ({
  isSyntheticAccountUserId: vi.fn(),
  sendWelcomeSMS: vi.fn(),
  sendWelcomeEmail: vi.fn(),
  sendWelcomePush: vi.fn(),
}));

vi.mock("./storage", () => ({
  isDemoId: () => false,
}));

vi.mock("./qa-access", () => ({
  isSyntheticAccountUserId,
}));

vi.mock("./sms-service", () => ({
  smsService: { sendWelcomeSMS },
}));

vi.mock("./email-service", () => ({
  emailService: { sendWelcomeEmail },
}));

vi.mock("./push-notification-service", () => ({
  pushNotificationService: { sendWelcomePush },
}));

import { sendWelcomeNotifications } from "./notification-orchestrator";

describe("notification orchestrator QA isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not fan out email, SMS, or push for a QA account", async () => {
    isSyntheticAccountUserId.mockResolvedValue(true);

    await expect(sendWelcomeNotifications("qa-user", "QA User", "homeowner")).resolves.toEqual({
      sms: false,
      email: false,
      push: false,
    });

    expect(sendWelcomeSMS).not.toHaveBeenCalled();
    expect(sendWelcomeEmail).not.toHaveBeenCalled();
    expect(sendWelcomePush).not.toHaveBeenCalled();
  });

  it("continues normal fan-out for a non-QA account", async () => {
    isSyntheticAccountUserId.mockResolvedValue(false);
    sendWelcomeSMS.mockResolvedValue(true);
    sendWelcomeEmail.mockResolvedValue(true);
    sendWelcomePush.mockResolvedValue(true);

    await expect(sendWelcomeNotifications("real-user", "Real User", "homeowner")).resolves.toEqual({
      sms: true,
      email: true,
      push: true,
    });

    expect(sendWelcomeSMS).toHaveBeenCalledWith("real-user", "Real User");
    expect(sendWelcomeEmail).toHaveBeenCalledWith("real-user", "Real User", "homeowner");
    expect(sendWelcomePush).toHaveBeenCalledWith("real-user", "Real User");
  });
});