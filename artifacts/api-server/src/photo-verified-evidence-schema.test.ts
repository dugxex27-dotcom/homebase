import { describe, expect, it } from "vitest";
import {
  insertHouseSchema,
  insertInvoiceAnalysisSchema,
  insertMaintenanceLogSchema,
  insertTaskCompletionSchema,
} from "@workspace/db";

describe("photo-verified evidence data contracts", () => {
  const evidence = {
    verificationTier: "photo_verified" as const,
    distanceFromPropertyMiles: "0.42",
    timestampDeltaHours: "2.50",
    verificationReasonCodes: ["review_needed"] as const,
    aiVerificationStatus: "review_needed" as const,
    aiVerificationResponse: {
      verified: false,
      confidence: "medium",
      notes: "Evidence needs review",
    },
  };

  it("accepts photo_verified evidence on maintenance logs", () => {
    const parsed = insertMaintenanceLogSchema.parse({
      homeownerId: "owner-1",
      houseId: "house-1",
      serviceDate: "2026-08-29",
      serviceType: "HVAC inspection",
      ...evidence,
      verificationReasonCodes: [...evidence.verificationReasonCodes],
    });

    expect(parsed.verificationTier).toBe("photo_verified");
    expect(parsed.distanceFromPropertyMiles).toBe("0.42");
    expect(parsed.verificationReasonCodes).toEqual(["review_needed"]);
    expect(parsed.aiVerificationResponse).toMatchObject({ confidence: "medium" });
  });

  it("accepts the same evidence contract on task completions", () => {
    const parsed = insertTaskCompletionSchema.parse({
      homeownerId: "owner-1",
      houseId: "house-1",
      taskType: "maintenance",
      taskTitle: "HVAC inspection",
      month: 8,
      year: 2026,
      ...evidence,
      verificationReasonCodes: [...evidence.verificationReasonCodes],
    });

    expect(parsed.verificationTier).toBe("photo_verified");
    expect(parsed.timestampDeltaHours).toBe("2.50");
    expect(parsed.aiVerificationStatus).toBe("review_needed");
  });

  it("rejects unknown tiers, reason codes, and AI statuses", () => {
    const baseLog = {
      homeownerId: "owner-1",
      houseId: "house-1",
      serviceDate: "2026-08-29",
      serviceType: "HVAC inspection",
    };

    expect(insertMaintenanceLogSchema.safeParse({
      ...baseLog,
      verificationTier: "untrusted",
    }).success).toBe(false);
    expect(insertMaintenanceLogSchema.safeParse({
      ...baseLog,
      verificationReasonCodes: ["free_form_reason"],
    }).success).toBe(false);
    expect(insertMaintenanceLogSchema.safeParse({
      ...baseLog,
      aiVerificationStatus: "maybe",
    }).success).toBe(false);
  });

  it("stores structured AI verification responses on invoice analyses", () => {
    const parsed = insertInvoiceAnalysisSchema.parse({
      homeownerId: "owner-1",
      houseId: "house-1",
      aiVerificationStatus: "verified",
      aiVerificationResponse: {
        verified: true,
        confidence: "high",
        workDescribed: "Filter replaced",
      },
    });

    expect(parsed.aiVerificationStatus).toBe("verified");
    expect(parsed.aiVerificationResponse).toMatchObject({ verified: true });
  });

  it("accepts a durable coordinate-cache timestamp on houses", () => {
    const cachedAt = new Date("2026-08-29T12:00:00Z");
    const parsed = insertHouseSchema.parse({
      homeownerId: "owner-1",
      name: "Main House",
      address: "123 Main Street",
      climateZone: "temperate",
      homeSystems: [],
      latitude: "40.71280000",
      longitude: "-74.00600000",
      coordinatesCachedAt: cachedAt,
    });

    expect(parsed.coordinatesCachedAt).toEqual(cachedAt);
  });
});