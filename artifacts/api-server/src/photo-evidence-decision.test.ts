import { describe, expect, it } from "vitest";
import {
  decidePhotoEvidence,
  hasDuplicatePhotoHash,
  PHOTO_DISTANCE_TOLERANCE_MILES,
  PHOTO_TIMESTAMP_TOLERANCE_HOURS,
} from "./photo-evidence-decision";

const CLEAN_AI_EVIDENCE = {
  completionMethod: "diy",
  hasPhotoEvidence: true,
  aiRequired: true,
  aiStatus: "verified",
  aiVerified: true,
  aiConfidence: "high",
  locationRequired: false,
  timestampRequired: false,
  fraudRiskFlag: false,
  duplicatePhotoHashDetected: false,
} as const;

describe("decidePhotoEvidence", () => {
  it("promotes clean approved evidence to photo_verified", () => {
    expect(decidePhotoEvidence(CLEAN_AI_EVIDENCE)).toEqual({
      outcome: "approved",
      verificationTier: "photo_verified",
      reasonCodes: [],
      aiVerificationStatus: "verified",
    });
  });

  it("falls back safely when photo evidence is missing", () => {
    expect(decidePhotoEvidence({
      completionMethod: "diy",
      hasPhotoEvidence: false,
      aiStatus: "not_run",
    })).toEqual({
      outcome: "ambiguous",
      verificationTier: "self_reported",
      reasonCodes: ["evidence_missing"],
      aiVerificationStatus: "not_run",
    });
  });

  it.each([
    {
      name: "location",
      input: {
        ...CLEAN_AI_EVIDENCE,
        locationRequired: true,
        distanceFromPropertyMiles: null,
      },
      reason: "location_missing",
    },
    {
      name: "timestamp",
      input: {
        ...CLEAN_AI_EVIDENCE,
        timestampRequired: true,
        timestampDeltaHours: null,
      },
      reason: "timestamp_missing",
    },
  ])("falls back to self_reported when required $name evidence is unavailable", ({ input, reason }) => {
    const result = decidePhotoEvidence(input);
    expect(result.outcome).toBe("ambiguous");
    expect(result.verificationTier).toBe("self_reported");
    expect(result.reasonCodes).toContain(reason);
  });

  it.each([
    {
      input: {
        ...CLEAN_AI_EVIDENCE,
        locationRequired: true,
        distanceFromPropertyMiles: PHOTO_DISTANCE_TOLERANCE_MILES + 0.01,
      },
      reason: "distance_from_property_exceeded",
    },
    {
      input: {
        ...CLEAN_AI_EVIDENCE,
        timestampRequired: true,
        timestampDeltaHours: PHOTO_TIMESTAMP_TOLERANCE_HOURS + 0.01,
      },
      reason: "timestamp_delta_exceeded",
    },
  ])("rejects out-of-tolerance evidence without promoting it", ({ input, reason }) => {
    const result = decidePhotoEvidence(input);
    expect(result.outcome).toBe("rejected");
    expect(result.verificationTier).toBe("self_reported");
    expect(result.reasonCodes).toContain(reason);
  });

  it("returns rejected for an AI mismatch", () => {
    expect(decidePhotoEvidence({
      ...CLEAN_AI_EVIDENCE,
      aiStatus: "rejected",
      aiVerified: false,
    })).toMatchObject({
      outcome: "rejected",
      verificationTier: "self_reported",
      reasonCodes: ["ai_mismatch"],
      aiVerificationStatus: "rejected",
    });
  });

  it("returns ambiguous for low-confidence AI evidence", () => {
    expect(decidePhotoEvidence({
      ...CLEAN_AI_EVIDENCE,
      aiConfidence: "low",
    })).toMatchObject({
      outcome: "ambiguous",
      verificationTier: "self_reported",
      reasonCodes: ["ai_ambiguous"],
    });
  });

  it("routes AI fraud risk to review without hard rejection", () => {
    expect(decidePhotoEvidence({
      ...CLEAN_AI_EVIDENCE,
      fraudRiskFlag: true,
    })).toEqual({
      outcome: "review_needed",
      verificationTier: "self_reported",
      reasonCodes: ["ai_fraud_risk", "review_needed"],
      aiVerificationStatus: "review_needed",
    });
  });

  it("routes duplicate hashes to review without hard rejection", () => {
    expect(decidePhotoEvidence({
      ...CLEAN_AI_EVIDENCE,
      duplicatePhotoHashDetected: true,
      existingReasonCodes: ["duplicate_photo_hash", "duplicate_photo_hash"],
    })).toEqual({
      outcome: "review_needed",
      verificationTier: "self_reported",
      reasonCodes: ["duplicate_photo_hash", "review_needed"],
      aiVerificationStatus: "review_needed",
    });
  });

  it("honors persisted duplicate evidence even when the convenience flag is absent", () => {
    expect(decidePhotoEvidence({
      ...CLEAN_AI_EVIDENCE,
      existingReasonCodes: ["duplicate_photo_hash"],
    })).toMatchObject({
      outcome: "review_needed",
      verificationTier: "self_reported",
      aiVerificationStatus: "review_needed",
    });
  });

  it("preserves contractor_verified without requiring photo or AI evidence", () => {
    expect(decidePhotoEvidence({
      completionMethod: "contractor",
      hasPhotoEvidence: false,
      aiStatus: null,
      locationRequired: false,
      timestampRequired: false,
    })).toEqual({
      outcome: "approved",
      verificationTier: "contractor_verified",
      reasonCodes: [],
      aiVerificationStatus: null,
    });
  });

  it.each([
    {
      name: "AI rejection",
      input: { aiStatus: "rejected", aiVerified: false },
      outcome: "rejected",
      reason: "ai_mismatch",
    },
    {
      name: "fraud risk",
      input: { fraudRiskFlag: true },
      outcome: "review_needed",
      reason: "ai_fraud_risk",
    },
    {
      name: "duplicate evidence",
      input: { duplicatePhotoHashDetected: true },
      outcome: "review_needed",
      reason: "duplicate_photo_hash",
    },
    {
      name: "out-of-tolerance location",
      input: { distanceFromPropertyMiles: PHOTO_DISTANCE_TOLERANCE_MILES + 1 },
      outcome: "rejected",
      reason: "distance_from_property_exceeded",
    },
  ])("preserves the contractor tier while honoring $name", ({ input, outcome, reason }) => {
    const result = decidePhotoEvidence({
      completionMethod: "contractor",
      hasPhotoEvidence: true,
      aiRequired: false,
      locationRequired: false,
      timestampRequired: false,
      ...input,
    });
    expect(result.verificationTier).toBe("contractor_verified");
    expect(result.outcome).toBe(outcome);
    expect(result.reasonCodes).toContain(reason);
  });

  it("keeps a legacy no-photo completion self_reported", () => {
    const result = decidePhotoEvidence({
      completionMethod: "diy",
      hasPhotoEvidence: false,
      aiRequired: false,
      existingReasonCodes: [],
    });
    expect(result.verificationTier).toBe("self_reported");
    expect(result.outcome).toBe("ambiguous");
  });
});

describe("hasDuplicatePhotoHash", () => {
  it("normalizes case and detects repeated SHA-256 values", () => {
    const hash = "a".repeat(64);
    expect(hasDuplicatePhotoHash([hash, hash.toUpperCase()])).toBe(true);
  });

  it("ignores malformed values", () => {
    expect(hasDuplicatePhotoHash(["not-a-hash", null, undefined])).toBe(false);
  });
});