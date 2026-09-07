import bcrypt from "bcryptjs";
import {
  companies,
  contractorReviews,
  contractors,
  crmLeads,
  proposals,
  users,
} from "@workspace/db";
import { db } from "./db";

export const DEVELOPMENT_CONTRACTOR_FIXTURE = {
  email: "dashboard.contractor@homebase.test",
  password: "DashboardCheck2026!",
  userId: "dev-dashboard-contractor",
  companyId: "dev-dashboard-company",
  contractorId: "dev-dashboard-contractor-profile",
  homeownerId: "dev-dashboard-homeowner",
} as const;

export function canSeedDevelopmentContractor(
  environment: NodeJS.ProcessEnv = process.env,
): boolean {
  return environment.NODE_ENV !== "production" && environment.REPLIT_DEPLOYMENT !== "1";
}

/**
 * Creates a stable, populated contractor for manual dashboard verification.
 * Every row has a deterministic ID and is upserted, so restarts repair the
 * fixture rather than multiplying it. This must never run in a deployment.
 */
export async function seedDevelopmentContractor(): Promise<{ seeded: boolean }> {
  if (!canSeedDevelopmentContractor()) {
    return { seeded: false };
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(DEVELOPMENT_CONTRACTOR_FIXTURE.password, 10);

  await db.transaction(async (tx) => {
    await tx
      .insert(companies)
      .values({
        id: DEVELOPMENT_CONTRACTOR_FIXTURE.companyId,
        name: "Dashboard Check Home Services",
        bio: "Development-only home services company used for dashboard verification.",
        experience: 12,
        location: "Seattle, WA",
        ownerId: DEVELOPMENT_CONTRACTOR_FIXTURE.userId,
        rating: "5.00",
        reviewCount: 1,
        services: ["HVAC", "Plumbing", "General Maintenance"],
        phone: "(206) 555-0142",
        email: DEVELOPMENT_CONTRACTOR_FIXTURE.email,
        address: "100 Test Avenue",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
        licenseNumber: "DEV-CHECK-001",
        licenseMunicipality: "Seattle",
        isLicensed: true,
      })
      .onConflictDoUpdate({
        target: companies.id,
        set: {
          rating: "5.00",
          reviewCount: 1,
          updatedAt: now,
        },
      });

    await tx
      .insert(users)
      .values({
        id: DEVELOPMENT_CONTRACTOR_FIXTURE.userId,
        email: DEVELOPMENT_CONTRACTOR_FIXTURE.email,
        firstName: "Casey",
        lastName: "Dashboard",
        role: "contractor",
        passwordHash,
        zipCode: "98101",
        companyId: DEVELOPMENT_CONTRACTOR_FIXTURE.companyId,
        companyRole: "owner",
        status: "active",
        canRespondToProposals: true,
        subscriptionStatus: "grandfathered",
        isPremium: true,
        emailVerified: true,
        emailVerifiedAt: now,
        isQaAccount: false,
        isDemoAccount: false,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: DEVELOPMENT_CONTRACTOR_FIXTURE.email,
          passwordHash,
          companyId: DEVELOPMENT_CONTRACTOR_FIXTURE.companyId,
          companyRole: "owner",
          status: "active",
          accountStatus: "active",
          canRespondToProposals: true,
          subscriptionStatus: "grandfathered",
          isPremium: true,
          emailVerified: true,
          emailVerifiedAt: now,
          isQaAccount: false,
          isDemoAccount: false,
          updatedAt: now,
        },
      });

    await tx
      .insert(users)
      .values({
        id: DEVELOPMENT_CONTRACTOR_FIXTURE.homeownerId,
        email: "dashboard.homeowner@homebase.test",
        firstName: "Jordan",
        lastName: "Homeowner",
        role: "homeowner",
        zipCode: "98101",
        subscriptionStatus: "inactive",
        isPremium: false,
        emailVerified: true,
        emailVerifiedAt: now,
        isQaAccount: false,
        isDemoAccount: false,
      })
      .onConflictDoUpdate({
        target: users.id,
        set: {
          isQaAccount: false,
          isDemoAccount: false,
          updatedAt: now,
        },
      });

    await tx
      .insert(contractors)
      .values({
        id: DEVELOPMENT_CONTRACTOR_FIXTURE.contractorId,
        userId: DEVELOPMENT_CONTRACTOR_FIXTURE.userId,
        companyId: DEVELOPMENT_CONTRACTOR_FIXTURE.companyId,
        name: "Casey Dashboard",
        company: "Dashboard Check Home Services",
        bio: "Development-only contractor profile for populated dashboard checks.",
        location: "Seattle, WA",
        rating: "5.00",
        reviewCount: 1,
        experience: 12,
        services: ["HVAC", "Plumbing", "General Maintenance"],
        phone: "(206) 555-0142",
        email: DEVELOPMENT_CONTRACTOR_FIXTURE.email,
        address: "100 Test Avenue",
        city: "Seattle",
        state: "WA",
        postalCode: "98101",
        licenseNumber: "DEV-CHECK-001",
        licenseMunicipality: "Seattle",
        isLicensed: true,
        isVerified: true,
      })
      .onConflictDoUpdate({
        target: contractors.id,
        set: {
          rating: "5.00",
          reviewCount: 1,
          isVerified: true,
        },
      });

    const acceptedProposals = [
      {
        id: "dev-dashboard-proposal-accepted-1",
        title: "Heat pump tune-up",
        description: "Seasonal heat pump inspection and tune-up.",
        serviceType: "HVAC",
        estimatedCost: "325.00",
        estimatedDuration: "3 hours",
        scope: "Inspect, clean, test, and document the heat pump system.",
      },
      {
        id: "dev-dashboard-proposal-accepted-2",
        title: "Water heater service",
        description: "Flush and inspect the water heater.",
        serviceType: "Plumbing",
        estimatedCost: "240.00",
        estimatedDuration: "2 hours",
        scope: "Flush tank, inspect fittings, and test safety valve.",
      },
    ];

    for (const proposal of acceptedProposals) {
      await tx
        .insert(proposals)
        .values({
          ...proposal,
          contractorId: DEVELOPMENT_CONTRACTOR_FIXTURE.userId,
          companyId: DEVELOPMENT_CONTRACTOR_FIXTURE.companyId,
          createdBy: DEVELOPMENT_CONTRACTOR_FIXTURE.userId,
          homeownerId: DEVELOPMENT_CONTRACTOR_FIXTURE.homeownerId,
          materials: [],
          validUntil: "2099-12-31",
          status: "accepted",
        })
        .onConflictDoUpdate({
          target: proposals.id,
          set: {
            contractorId: DEVELOPMENT_CONTRACTOR_FIXTURE.userId,
            homeownerId: DEVELOPMENT_CONTRACTOR_FIXTURE.homeownerId,
            status: "accepted",
            updatedAt: now,
          },
        });
    }

    await tx
      .insert(contractorReviews)
      .values({
        id: "dev-dashboard-review-1",
        contractorId: DEVELOPMENT_CONTRACTOR_FIXTURE.contractorId,
        companyId: DEVELOPMENT_CONTRACTOR_FIXTURE.companyId,
        homeownerId: DEVELOPMENT_CONTRACTOR_FIXTURE.homeownerId,
        rating: 5,
        comment: "Clear communication, punctual arrival, and excellent work.",
        serviceDate: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000),
        serviceType: "HVAC",
        wouldRecommend: true,
        isVerifiedService: true,
      })
      .onConflictDoUpdate({
        target: contractorReviews.id,
        set: {
          rating: 5,
          comment: "Clear communication, punctual arrival, and excellent work.",
          updatedAt: now,
        },
      });

    await tx
      .insert(crmLeads)
      .values({
        id: "dev-dashboard-lead-new-1",
        contractorUserId: DEVELOPMENT_CONTRACTOR_FIXTURE.userId,
        companyId: DEVELOPMENT_CONTRACTOR_FIXTURE.companyId,
        firstName: "Morgan",
        lastName: "Newlead",
        email: "morgan.newlead@example.test",
        phone: "(206) 555-0198",
        city: "Seattle",
        state: "WA",
        postalCode: "98109",
        source: "website",
        status: "new",
        priority: "high",
        projectType: "HVAC",
        estimatedValue: "1800.00",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: crmLeads.id,
        set: {
          status: "new",
          priority: "high",
          createdAt: now,
          updatedAt: now,
        },
      });
  });

  return { seeded: true };
}