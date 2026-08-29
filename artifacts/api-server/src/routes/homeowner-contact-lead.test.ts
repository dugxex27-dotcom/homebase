import { describe, expect, it, vi } from "vitest";
import { ensureHomeownerContactLead } from "./homeowner-contact-lead";

function buildStorage(existingLeads: Array<{ metadata?: unknown }> = []) {
  return {
    getCrmLeads: vi.fn().mockResolvedValue(existingLeads),
    getUser: vi.fn(async (id: string) => id === "homeowner-1"
      ? {
          id,
          firstName: "Jane",
          lastName: "Homeowner",
          email: "jane@example.invalid",
          phone: "555-0101",
        }
      : { id, companyId: "company-1" }),
    createCrmLead: vi.fn().mockResolvedValue({ id: "lead-1" }),
  };
}

describe("ensureHomeownerContactLead", () => {
  it("creates a visible new CRM lead from a homeowner contact", async () => {
    const storage = buildStorage();

    await ensureHomeownerContactLead(storage, {
      homeownerId: "homeowner-1",
      contractorId: "contractor-1",
      conversationId: "conversation-1",
      subject: "Replace water heater",
    });

    expect(storage.createCrmLead).toHaveBeenCalledWith(expect.objectContaining({
      contractorUserId: "contractor-1",
      companyId: "company-1",
      firstName: "Jane",
      lastName: "Homeowner",
      email: "jane@example.invalid",
      source: "website",
      status: "new",
      projectType: "Replace water heater",
      metadata: {
        contactSource: "homeowner_contact",
        homeownerId: "homeowner-1",
        conversationId: "conversation-1",
      },
    }));
  });

  it("does not duplicate a homeowner contact lead when the conversation is reused", async () => {
    const storage = buildStorage([{
      metadata: {
        contactSource: "homeowner_contact",
        homeownerId: "homeowner-1",
        conversationId: "conversation-1",
      },
    }]);

    await ensureHomeownerContactLead(storage, {
      homeownerId: "homeowner-1",
      contractorId: "contractor-1",
      conversationId: "conversation-1",
      subject: "Replace water heater",
    });

    expect(storage.createCrmLead).not.toHaveBeenCalled();
    expect(storage.getUser).not.toHaveBeenCalled();
  });
});