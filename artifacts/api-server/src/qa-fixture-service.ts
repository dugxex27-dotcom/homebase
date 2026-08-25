import { and, eq, inArray, or } from "drizzle-orm";
import {
  companies,
  conversations,
  contractorAppointments,
  contractorReviews,
  contractors,
  crmLeads,
  houses,
  proposals,
  qaFixtureRegistry,
  taskCompletions,
  users,
} from "@workspace/db";
import { db } from "./db";
import { QA_ADMIN_READONLY_SCOPE } from "./qa-access";

export const QA_FIXTURE_KEYS = {
  admin: "qa-admin-readonly",
  contractor: "qa-contractor-dashboard",
  homeowner: "qa-homeowner-multiproperty",
} as const;

const QA_FIXTURE_PREFIX = "qa-fixture-v1";
const QA_FIXTURE_COMPLETED_AT = new Date("2026-08-01T12:00:00.000Z");

type QaFixtureIdentityIds = {
  adminUserId: string;
  contractorUserId: string;
  homeownerUserId: string;
};

function fixtureId(name: string) {
  return `${QA_FIXTURE_PREFIX}-${name}`;
}

function assertDistinctIds(ids: QaFixtureIdentityIds) {
  const values = Object.values(ids);
  if (values.some((id) => !id.trim()) || new Set(values).size !== values.length) {
    throw new Error("QA fixture identities must be three distinct authenticated user IDs");
  }
}

async function requireQaProvisioningEnabled() {
  if (process.env.QA_FIXTURE_PROVISIONING_ENABLED !== "true") {
    throw new Error("QA fixture provisioning is disabled");
  }
}

async function assertPristineQaFixtureIdentities(identityIds: string[]) {
  const [ownedHouses, ownedContractors, ownedCompanies, ownedTasks, ownedProposals, ownedConversations] = await Promise.all([
    db.select({ id: houses.id }).from(houses).where(inArray(houses.homeownerId, identityIds)),
    db.select({ id: contractors.id }).from(contractors).where(inArray(contractors.userId, identityIds)),
    db.select({ id: companies.id }).from(companies).where(inArray(companies.ownerId, identityIds)),
    db.select({ id: taskCompletions.id }).from(taskCompletions).where(inArray(taskCompletions.homeownerId, identityIds)),
    db.select({ id: proposals.id }).from(proposals).where(inArray(proposals.homeownerId, identityIds)),
    db.select({ id: conversations.id }).from(conversations).where(
      or(inArray(conversations.homeownerId, identityIds), inArray(conversations.contractorId, identityIds)),
    ),
  ]);
  if ([ownedHouses, ownedContractors, ownedCompanies, ownedTasks, ownedProposals, ownedConversations].some(rows => rows.length > 0)) {
    throw new Error("QA fixture identities must be pristine accounts with no operational data");
  }
}

/**
 * Binds already-authenticated OIDC users to their QA personas. This function
 * is server-only and deliberately has no HTTP route. The environment flag is
 * an operator safety interlock, not a user-facing feature flag.
 */
export async function provisionQaFixtures(ids: QaFixtureIdentityIds) {
  await requireQaProvisioningEnabled();
  assertDistinctIds(ids);

  const identityIds = [ids.adminUserId, ids.contractorUserId, ids.homeownerUserId];
  const existingUsers = await db.select().from(users).where(inArray(users.id, identityIds));
  if (existingUsers.length !== identityIds.length) {
    throw new Error("Each QA persona must first complete normal OIDC sign-in");
  }
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(email => email.trim()).filter(Boolean);
  const unsafeIdentity = existingUsers.find(user =>
    adminEmails.includes(user.email ?? "") ||
    (!user.isQaAccount && Boolean(user.companyId || user.stripeCustomerId || user.stripeSubscriptionId || user.appleOriginalTransactionId))
  );
  if (unsafeIdentity) {
    throw new Error("QA fixture identities must be dedicated, non-privileged, non-operational accounts");
  }
  const existingFixtureRows = await db.select().from(qaFixtureRegistry)
    .where(inArray(qaFixtureRegistry.userId, identityIds));
  if (existingFixtureRows.length === 0) {
    await assertPristineQaFixtureIdentities(identityIds);
  }

  await db.transaction(async (tx) => {
    await tx
      .update(users)
      .set({
        isQaAccount: true,
        qaFixtureKey: QA_FIXTURE_KEYS.admin,
        qaAccessScopes: [QA_ADMIN_READONLY_SCOPE],
        updatedAt: new Date(),
      })
      .where(eq(users.id, ids.adminUserId));

    await tx
      .update(users)
      .set({
        isQaAccount: true,
        qaFixtureKey: QA_FIXTURE_KEYS.contractor,
        qaAccessScopes: [],
        role: "contractor",
        companyRole: "owner",
        canRespondToProposals: true,
        subscriptionStatus: "grandfathered",
        isPremium: true,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ids.contractorUserId));

    await tx
      .update(users)
      .set({
        isQaAccount: true,
        qaFixtureKey: QA_FIXTURE_KEYS.homeowner,
        qaAccessScopes: [],
        role: "homeowner",
        subscriptionStatus: "grandfathered",
        isPremium: true,
        maxHousesAllowed: 3,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripePriceId: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, ids.homeownerUserId));

    const registryRows = [
      { fixtureKey: QA_FIXTURE_KEYS.admin, userId: ids.adminUserId, fixtureRole: "admin" },
      { fixtureKey: QA_FIXTURE_KEYS.contractor, userId: ids.contractorUserId, fixtureRole: "contractor" },
      { fixtureKey: QA_FIXTURE_KEYS.homeowner, userId: ids.homeownerUserId, fixtureRole: "homeowner" },
    ];

    for (const row of registryRows) {
      await tx.insert(qaFixtureRegistry)
        .values({ ...row, isActive: true, metadata: { managedBy: QA_FIXTURE_PREFIX } })
        .onConflictDoUpdate({
          target: qaFixtureRegistry.fixtureKey,
          set: { userId: row.userId, fixtureRole: row.fixtureRole, isActive: true, retiredAt: null },
        });
    }

    const companyId = fixtureId("company");
    await tx.insert(companies)
      .values({
        id: companyId,
        name: "TEST — DO NOT USE QA Services",
        bio: "Synthetic, internal-only contractor dashboard fixture. No services are provided.",
        experience: 5,
        location: "QA fixture only",
        ownerId: ids.contractorUserId,
        services: ["HVAC Maintenance"],
        phone: "206-555-0199",
        email: "qa-contractor@example.invalid",
        licenseNumber: "QA-NOT-A-LICENSE",
        licenseMunicipality: "QA fixture only",
        isLicensed: false,
        stripeConnectAccountId: null,
        stripeOnboardingComplete: false,
        stripeChargesEnabled: false,
        stripePayoutsEnabled: false,
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: { ownerId: ids.contractorUserId, name: "TEST — DO NOT USE QA Services", updatedAt: new Date() },
      });

    await tx.update(users).set({ companyId, updatedAt: new Date() }).where(eq(users.id, ids.contractorUserId));

    await tx.insert(contractors)
      .values({
        id: fixtureId("contractor"),
        userId: ids.contractorUserId,
        companyId,
        name: "TEST — QA Contractor",
        company: "TEST — DO NOT USE QA Services",
        bio: "Synthetic internal QA contractor profile.",
        location: "QA fixture only",
        rating: "5.00",
        reviewCount: 1,
        experience: 5,
        services: ["HVAC Maintenance"],
        phone: "206-555-0199",
        email: "qa-contractor@example.invalid",
        licenseNumber: "QA-NOT-A-LICENSE",
        licenseMunicipality: "QA fixture only",
        isLicensed: false,
        serviceRadius: 0,
        hasEmergencyServices: false,
        isVerified: false,
      })
      .onConflictDoUpdate({
        target: contractors.id,
        set: { userId: ids.contractorUserId, companyId, name: "TEST — QA Contractor" },
      });

    const houseFixtures = [
      { id: fixtureId("house-primary"), name: "TEST — QA Primary Home", isDefault: true, yearBuilt: 2010 },
      { id: fixtureId("house-second"), name: "TEST — QA Second Home", isDefault: false, yearBuilt: 1998 },
      { id: fixtureId("house-third"), name: "TEST — QA Third Home", isDefault: false, yearBuilt: 2020 },
    ];
    for (const [index, house] of houseFixtures.entries()) {
      await tx.insert(houses)
        .values({
          id: house.id,
          homeownerId: ids.homeownerUserId,
          name: house.name,
          address: `${index + 1}00 QA Fixture Lane`,
          climateZone: "qa-fixture",
          homeSystems: ["central-ac", "gas-furnace", "gas-water-heater"],
          isDefault: house.isDefault,
          postalCode: "00000",
          latitude: null,
          longitude: null,
          homeType: "single_family",
          squareFootage: 1800 + (index * 200),
          yearBuilt: house.yearBuilt,
          roofType: "asphalt_shingle",
          hvacType: "central_air",
          foundationType: "slab",
          numberOfStories: 2,
          primaryHeatingFuel: "natural_gas",
        })
        .onConflictDoUpdate({
          target: houses.id,
          set: { homeownerId: ids.homeownerUserId, name: house.name, isDefault: house.isDefault },
        });

      await tx.insert(taskCompletions)
        .values({
          id: fixtureId(`completion-${index + 1}`),
          homeownerId: ids.homeownerUserId,
          houseId: house.id,
          taskId: null,
          taskType: "maintenance",
          taskTitle: "TEST — QA HVAC inspection",
          taskCategory: "HVAC",
          completedAt: QA_FIXTURE_COMPLETED_AT,
          month: QA_FIXTURE_COMPLETED_AT.getUTCMonth() + 1,
          year: QA_FIXTURE_COMPLETED_AT.getUTCFullYear(),
          completionMethod: "diy",
          estimatedCost: "50.00",
          actualCost: "10.00",
          costSavings: "40.00",
          notes: "Synthetic QA completion; no physical work occurred.",
          documentsUploaded: 0,
          verificationTier: index === 1 ? "contractor_verified" : "self_reported",
        })
        .onConflictDoUpdate({
          target: taskCompletions.id,
          set: { homeownerId: ids.homeownerUserId, houseId: house.id },
        });
    }

    await tx.insert(proposals)
      .values({
        id: fixtureId("proposal-accepted"),
        contractorId: ids.contractorUserId,
        companyId,
        createdBy: ids.contractorUserId,
        homeownerId: ids.homeownerUserId,
        title: "TEST — QA HVAC Tune-Up",
        description: "Synthetic accepted proposal for dashboard verification.",
        serviceType: "HVAC Maintenance",
        estimatedCost: "285.00",
        estimatedDuration: "1-2 hours",
        scope: "Synthetic fixture only. No service will occur.",
        materials: ["Synthetic HVAC filter"],
        warrantyPeriod: "QA fixture",
        validUntil: "2099-12-31",
        status: "accepted",
        customerNotes: "QA fixture",
        internalNotes: "QA fixture; never fulfill.",
        attachments: [],
      })
      .onConflictDoUpdate({
        target: proposals.id,
        set: { contractorId: ids.contractorUserId, homeownerId: ids.homeownerUserId, status: "accepted", estimatedCost: "285.00" },
      });

    await tx.insert(crmLeads)
      .values({
        id: fixtureId("lead"),
        contractorUserId: ids.contractorUserId,
        companyId,
        firstName: "TEST",
        lastName: "QA Lead",
        email: "qa-lead@example.invalid",
        phone: "206-555-0101",
        address: "QA fixture only",
        city: "QA",
        state: "QA",
        postalCode: "00000",
        source: "other",
        status: "qualified",
        priority: "medium",
        projectType: "HVAC Repair",
        estimatedValue: "500.00",
        followUpDate: new Date("2099-01-15T12:00:00Z"),
        tags: ["qa-fixture"],
        metadata: { fixture: true, noContact: true },
      })
      .onConflictDoUpdate({
        target: crmLeads.id,
        set: { contractorUserId: ids.contractorUserId, companyId, status: "qualified", metadata: { fixture: true, noContact: true } },
      });

    await tx.insert(contractorAppointments)
      .values({
        id: fixtureId("appointment"),
        homeownerId: ids.homeownerUserId,
        houseId: fixtureId("house-primary"),
        contractorId: ids.contractorUserId,
        contractorName: "TEST — QA Contractor",
        contractorCompany: "TEST — DO NOT USE QA Services",
        contractorPhone: "206-555-0199",
        serviceType: "HVAC Maintenance",
        serviceDescription: "Synthetic QA appointment. No service will occur.",
        homeArea: "HVAC",
        scheduledDateTime: "2099-01-20T15:00:00.000Z",
        estimatedDuration: 60,
        status: "scheduled",
        notes: "QA fixture; do not contact.",
      })
      .onConflictDoUpdate({
        target: contractorAppointments.id,
        set: { homeownerId: ids.homeownerUserId, contractorId: ids.contractorUserId, status: "scheduled" },
      });

    await tx.insert(contractorReviews)
      .values({
        id: fixtureId("review"),
        contractorId: ids.contractorUserId,
        companyId,
        homeownerId: ids.homeownerUserId,
        rating: 5,
        comment: "Synthetic QA review. No service was performed.",
        serviceDate: new Date("2098-12-01T12:00:00Z"),
        serviceType: "HVAC Maintenance",
        wouldRecommend: true,
        deviceFingerprint: "qa-fixture",
        ipAddress: "192.0.2.10",
        isVerifiedService: false,
        serviceRecordId: null,
      })
      .onConflictDoUpdate({
        target: [contractorReviews.homeownerId, contractorReviews.contractorId],
        set: { rating: 5, comment: "Synthetic QA review. No service was performed.", updatedAt: new Date() },
      });
  });
}

/**
 * Retires access before any destructive cleanup. The QA marker remains set so
 * orphaned fixture rows stay excluded from customer-facing queries.
 */
export async function retireQaFixtures(fixtureKeys = Object.values(QA_FIXTURE_KEYS)) {
  await requireQaProvisioningEnabled();
  const registryRows = await db
    .select()
    .from(qaFixtureRegistry)
    .where(and(inArray(qaFixtureRegistry.fixtureKey, fixtureKeys), eq(qaFixtureRegistry.isActive, true)));

  await db.transaction(async (tx) => {
    for (const row of registryRows) {
      await tx.update(qaFixtureRegistry)
        .set({ isActive: false, retiredAt: new Date() })
        .where(eq(qaFixtureRegistry.id, row.id));
      await tx.update(users)
        .set({ qaAccessScopes: [], status: "suspended", updatedAt: new Date() })
        .where(eq(users.id, row.userId));
    }
  });

  return registryRows.map(row => ({ fixtureKey: row.fixtureKey, userId: row.userId }));
}

/**
 * Permanently removes only registry-owned, already-retired QA fixtures. The
 * explicit IDs and registry metadata make this intentionally incapable of
 * broad customer-data cleanup.
 */
export async function purgeRetiredQaFixtures(fixtureKeys = Object.values(QA_FIXTURE_KEYS)) {
  await requireQaProvisioningEnabled();
  const requiredFixtureKeys = Object.values(QA_FIXTURE_KEYS);
  if (
    fixtureKeys.length !== requiredFixtureKeys.length ||
    requiredFixtureKeys.some(key => !fixtureKeys.includes(key))
  ) {
    throw new Error("QA fixtures must be purged as one complete retired set");
  }
  const registryRows = await db
    .select()
    .from(qaFixtureRegistry)
    .where(inArray(qaFixtureRegistry.fixtureKey, fixtureKeys));

  if (registryRows.length !== fixtureKeys.length) {
    throw new Error("Every QA fixture must be registered before purge");
  }
  if (registryRows.some(row => row.isActive)) {
    throw new Error("QA fixtures must be retired before purge");
  }
  if (registryRows.some(row => (row.metadata as { managedBy?: string })?.managedBy !== QA_FIXTURE_PREFIX)) {
    throw new Error("Refusing to purge an unrecognized QA fixture registry row");
  }

  const registeredUserIds = registryRows.map(row => row.userId);
  const registeredUsers = await db.select().from(users).where(inArray(users.id, registeredUserIds));
  if (
    registeredUsers.length !== registeredUserIds.length ||
    registeredUsers.some(user => !user.isQaAccount || !fixtureKeys.includes(user.qaFixtureKey as typeof fixtureKeys[number]))
  ) {
    throw new Error("Refusing to purge users that are not active QA fixture identities");
  }

  await db.transaction(async (tx) => {
    await tx.delete(contractorReviews).where(eq(contractorReviews.id, fixtureId("review")));
    await tx.delete(contractorAppointments).where(eq(contractorAppointments.id, fixtureId("appointment")));
    await tx.delete(crmLeads).where(eq(crmLeads.id, fixtureId("lead")));
    await tx.delete(proposals).where(eq(proposals.id, fixtureId("proposal-accepted")));
    await tx.delete(taskCompletions).where(inArray(taskCompletions.id, [
      fixtureId("completion-1"),
      fixtureId("completion-2"),
      fixtureId("completion-3"),
    ]));
    await tx.delete(houses).where(inArray(houses.id, [
      fixtureId("house-primary"),
      fixtureId("house-second"),
      fixtureId("house-third"),
    ]));
    await tx.delete(contractors).where(eq(contractors.id, fixtureId("contractor")));
    await tx.delete(companies).where(eq(companies.id, fixtureId("company")));
    await tx.delete(qaFixtureRegistry).where(inArray(qaFixtureRegistry.id, registryRows.map(row => row.id)));
  });

  return registryRows.map(row => row.fixtureKey);
}