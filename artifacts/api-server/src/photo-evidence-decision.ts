import type {
  AiVerificationStatus,
  MaintenanceVerificationTier,
  PhotoVerificationReasonCode,
} from "@workspace/db";

export type PhotoEvidenceDecisionOutcome =
  | "approved"
  | "rejected"
  | "ambiguous"
  | "review_needed";

export type PhotoEvidenceDecision = {
  outcome: PhotoEvidenceDecisionOutcome;
  verificationTier: MaintenanceVerificationTier;
  reasonCodes: PhotoVerificationReasonCode[];
  aiVerificationStatus: AiVerificationStatus | null;
};

export type PhotoEvidenceDecisionInput = {
  completionMethod?: string | null;
  hasPhotoEvidence: boolean;
  aiRequired?: boolean;
  aiStatus?: unknown;
  aiVerified?: boolean | null;
  aiConfidence?: unknown;
  locationRequired?: boolean;
  timestampRequired?: boolean;
  locationFlag?: boolean | null;
  timestampFlag?: boolean | null;
  distanceFromPropertyMiles?: number | string | null;
  timestampDeltaHours?: number | string | null;
  fraudRiskFlag?: boolean | null;
  duplicatePhotoHashDetected?: boolean | null;
  existingReasonCodes?: readonly string[] | null;
};

const AI_STATUSES = new Set<AiVerificationStatus>([
  "not_run",
  "pending",
  "verified",
  "rejected",
  "review_needed",
]);

const REASON_CODES = new Set<PhotoVerificationReasonCode>([
  "evidence_missing",
  "location_missing",
  "property_coordinates_missing",
  "distance_from_property_exceeded",
  "timestamp_missing",
  "timestamp_invalid",
  "timestamp_delta_exceeded",
  "ai_ambiguous",
  "ai_mismatch",
  "ai_fraud_risk",
  "duplicate_photo_hash",
  "review_needed",
]);

export const PHOTO_DISTANCE_TOLERANCE_MILES = 1;
export const PHOTO_TIMESTAMP_TOLERANCE_HOURS = 24;

function normalizeStatus(value: unknown): AiVerificationStatus | null {
  return typeof value === "string" && AI_STATUSES.has(value as AiVerificationStatus)
    ? value as AiVerificationStatus
    : null;
}

function normalizeReasonCodes(values: readonly string[] | null | undefined): PhotoVerificationReasonCode[] {
  return [...new Set(
    (values ?? []).filter(
      (value): value is PhotoVerificationReasonCode =>
        typeof value === "string" && REASON_CODES.has(value as PhotoVerificationReasonCode),
    ),
  )];
}

function numericValue(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Decide whether the available evidence is strong enough to promote a
 * maintenance record to photo_verified.
 *
 * This function deliberately does not perform I/O, call AI, inspect storage,
 * or alter scoring. Callers provide normalized evidence gathered by their
 * route and persist the returned audit decision on both maintenance records.
 */
export function decidePhotoEvidence(
  input: PhotoEvidenceDecisionInput,
): PhotoEvidenceDecision {
  const reasons = normalizeReasonCodes(input.existingReasonCodes);
  const status = normalizeStatus(input.aiStatus);
  const isContractor = input.completionMethod === "contractor";
  const fallbackTier: MaintenanceVerificationTier =
    isContractor ? "contractor_verified" : "self_reported";
  const aiRequired = !isContractor && (input.aiRequired ?? true);
  const locationRequired = input.locationRequired ?? true;
  const timestampRequired = input.timestampRequired ?? true;

  if (
    status === "rejected"
    || input.aiVerified === false
    || reasons.includes("ai_mismatch")
  ) {
    if (!reasons.includes("ai_mismatch")) reasons.push("ai_mismatch");
    return {
      outcome: "rejected",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: "rejected",
    };
  }

  const distance = numericValue(input.distanceFromPropertyMiles);
  const timestampDelta = numericValue(input.timestampDeltaHours);
  const distanceExceeded =
    distance !== null && distance > PHOTO_DISTANCE_TOLERANCE_MILES;
  const timestampExceeded =
    timestampDelta !== null && timestampDelta > PHOTO_TIMESTAMP_TOLERANCE_HOURS;

  if (distanceExceeded || reasons.includes("distance_from_property_exceeded")) {
    if (!reasons.includes("distance_from_property_exceeded")) {
      reasons.push("distance_from_property_exceeded");
    }
    return {
      outcome: "rejected",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  if (timestampExceeded || reasons.includes("timestamp_delta_exceeded")) {
    if (!reasons.includes("timestamp_delta_exceeded")) {
      reasons.push("timestamp_delta_exceeded");
    }
    return {
      outcome: "rejected",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  const fraudRisk =
    input.fraudRiskFlag === true || reasons.includes("ai_fraud_risk");
  const duplicateRisk =
    input.duplicatePhotoHashDetected === true || reasons.includes("duplicate_photo_hash");
  if (status === "review_needed" || fraudRisk || duplicateRisk || reasons.includes("review_needed")) {
    if (fraudRisk && !reasons.includes("ai_fraud_risk")) reasons.push("ai_fraud_risk");
    if (duplicateRisk && !reasons.includes("duplicate_photo_hash")) {
      reasons.push("duplicate_photo_hash");
    }
    if (!reasons.includes("review_needed")) reasons.push("review_needed");
    return {
      outcome: "review_needed",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: "review_needed",
    };
  }

  if (!input.hasPhotoEvidence && !isContractor) {
    if (!reasons.includes("evidence_missing")) reasons.push("evidence_missing");
    return {
      outcome: "ambiguous",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  if (input.locationFlag === true) {
    if (!reasons.includes("location_missing") && !reasons.includes("property_coordinates_missing")) {
      reasons.push("location_missing");
    }
    return {
      outcome: "ambiguous",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  if (input.timestampFlag === true) {
    if (!reasons.includes("timestamp_missing") && !reasons.includes("timestamp_invalid")) {
      reasons.push("timestamp_missing");
    }
    return {
      outcome: "ambiguous",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  if (locationRequired && distance === null) {
    if (!reasons.includes("location_missing")) reasons.push("location_missing");
    return {
      outcome: "ambiguous",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  if (timestampRequired && timestampDelta === null) {
    if (!reasons.includes("timestamp_missing")) reasons.push("timestamp_missing");
    return {
      outcome: "ambiguous",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  if (aiRequired && (status !== "verified" || input.aiVerified !== true)) {
    if (!reasons.includes("ai_ambiguous")) reasons.push("ai_ambiguous");
    return {
      outcome: "ambiguous",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status ?? "not_run",
    };
  }

  if (input.aiConfidence === "low" || reasons.includes("ai_ambiguous")) {
    if (!reasons.includes("ai_ambiguous")) reasons.push("ai_ambiguous");
    return {
      outcome: "ambiguous",
      verificationTier: fallbackTier,
      reasonCodes: reasons,
      aiVerificationStatus: status,
    };
  }

  return {
    outcome: "approved",
    verificationTier: isContractor ? "contractor_verified" : "photo_verified",
    reasonCodes: reasons,
    aiVerificationStatus: status,
  };
}

/** True when the same normalized hash occurs more than once in a submission. */
export function hasDuplicatePhotoHash(values: readonly unknown[] | null | undefined): boolean {
  const hashes = (values ?? [])
    .filter((value): value is string => typeof value === "string" && /^[0-9a-f]{64}$/i.test(value))
    .map((value) => value.toLowerCase());
  return new Set(hashes).size < hashes.length;
}