interface ContactUser {
  id: string;
  companyId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface ContactLead {
  metadata?: unknown;
}

interface HomeownerContactLeadStorage {
  getUser(id: string): Promise<ContactUser | undefined>;
  getCrmLeads(contractorUserId: string): Promise<ContactLead[]>;
  createCrmLead(lead: Record<string, unknown>): Promise<unknown>;
}

function isLeadForHomeownerContact(lead: ContactLead, homeownerId: string): boolean {
  const metadata = lead.metadata;
  return Boolean(
    metadata &&
    typeof metadata === "object" &&
    (metadata as Record<string, unknown>).contactSource === "homeowner_contact" &&
    (metadata as Record<string, unknown>).homeownerId === homeownerId,
  );
}

export async function ensureHomeownerContactLead(
  storage: HomeownerContactLeadStorage,
  input: {
    homeownerId: string;
    contractorId: string;
    conversationId: string;
    subject: string;
  },
): Promise<void> {
  const existingLeads = await storage.getCrmLeads(input.contractorId);
  if (existingLeads.some(lead => isLeadForHomeownerContact(lead, input.homeownerId))) {
    return;
  }

  const [homeowner, contractor] = await Promise.all([
    storage.getUser(input.homeownerId),
    storage.getUser(input.contractorId),
  ]);
  if (!homeowner || !contractor) {
    throw new Error("Cannot create CRM lead for missing conversation party");
  }

  await storage.createCrmLead({
    contractorUserId: input.contractorId,
    companyId: contractor.companyId ?? null,
    firstName: homeowner.firstName?.trim() || "Homeowner",
    lastName: homeowner.lastName?.trim() || "",
    email: homeowner.email ?? null,
    phone: homeowner.phone ?? null,
    source: "website",
    status: "new",
    priority: "medium",
    projectType: input.subject,
    metadata: {
      contactSource: "homeowner_contact",
      homeownerId: input.homeownerId,
      conversationId: input.conversationId,
    },
  });
}