import { beforeEach, describe, expect, it, vi } from "vitest";

const { isSyntheticAccountUserId } = vi.hoisted(() => ({
  isSyntheticAccountUserId: vi.fn(),
}));

vi.mock("./qa-access", () => ({
  isSyntheticAccountUserId,
}));

vi.mock("./storage", () => ({
  storage: {},
}));

vi.mock("@sendgrid/mail", () => ({
  default: { setApiKey: vi.fn(), send: vi.fn() },
}));

vi.mock("twilio", () => ({
  default: vi.fn(() => ({ messages: { create: vi.fn() } })),
}));

vi.mock("./firebase-admin", () => ({
  isFcmConfigured: () => true,
  sendFcmMulticast: vi.fn(),
}));

import { sendNewMessageEmail } from "./email-service";
import { smsService } from "./sms-service";
import { pushNotificationService } from "./push-notification-service";

describe("new-message QA recipient isolation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isSyntheticAccountUserId.mockResolvedValue(true);
  });

  it("suppresses email, SMS, and push before a QA recipient can reach a provider", async () => {
    await expect(sendNewMessageEmail("qa-recipient", "Normal User", "Hello")).resolves.toBe(false);
    await expect(smsService.sendNewMessageNotification("qa-recipient", "Normal User", "Hello")).resolves.toBe(false);
    await expect(pushNotificationService.sendNewMessagePush("qa-recipient", "Normal User")).resolves.toBe(false);

    expect(isSyntheticAccountUserId).toHaveBeenCalledWith("qa-recipient");
  });
});