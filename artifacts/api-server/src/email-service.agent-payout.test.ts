import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetUser, mockSend } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockSend: vi.fn(),
}));

vi.mock("./storage", () => ({
  storage: {
    getUser: mockGetUser,
  },
}));

vi.mock("./db", () => ({
  db: {},
}));

vi.mock("@sendgrid/mail", () => ({
  default: {
    setApiKey: vi.fn(),
    send: mockSend,
  },
}));

describe("sendAgentPayoutPaidEmail", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    process.env.SENDGRID_API_KEY = "test-key";
    mockGetUser.mockResolvedValue({
      id: "agent-1",
      email: "agent@example.com",
      firstName: "Alex",
    });
    mockSend.mockResolvedValue(undefined);
  });

  it("includes the amount, referred user name, and agent dashboard link", async () => {
    const { sendAgentPayoutPaidEmail } = await import("./email-service");

    await expect(
      sendAgentPayoutPaidEmail("agent-1", "15.00", "Jamie Homeowner"),
    ).resolves.toBe(true);

    expect(mockSend).toHaveBeenCalledWith(expect.objectContaining({
      to: "agent@example.com",
      subject: expect.stringContaining("$15.00"),
      text: expect.stringMatching(/\$15\.00.*Jamie Homeowner.*https:\/\/gotohomebase\.com\/agent-dashboard/),
      html: expect.stringMatching(/\$15\.00[\s\S]*Jamie Homeowner[\s\S]*https:\/\/gotohomebase\.com\/agent-dashboard/),
    }));
  });

  it("does not send when the agent has no email address", async () => {
    mockGetUser.mockResolvedValue({ id: "agent-1", email: null });
    const { sendAgentPayoutPaidEmail } = await import("./email-service");

    await expect(
      sendAgentPayoutPaidEmail("agent-1", "15.00", "Jamie Homeowner"),
    ).resolves.toBe(false);
    expect(mockSend).not.toHaveBeenCalled();
  });
});