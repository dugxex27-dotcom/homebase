import {
  houses,
  invoiceAnalyses,
  maintenanceEvidenceReviews,
  maintenanceLogs,
  taskCompletions,
  users,
} from "@workspace/db";
import { and, desc, eq, inArray, or, sql as drizzleSql } from "drizzle-orm";

export type MaintenanceEvidenceReviewDecision =
  | "approve"
  | "reject"
  | "request_more_info";

export type MaintenanceEvidenceReviewSourceType = "maintenance" | "invoice";

type EvidenceRow = Record<string, any>;

export type MaintenanceEvidenceReviewItem = {
  id: string;
  sourceType: MaintenanceEvidenceReviewSourceType;
  sourceId: string;
  homeowner: {
    id: string;
    name: string;
    email: string | null;
  };
  property: {
    id: string;
    address: string | null;
  };
  claimedTask: {
    title: string;
    category: string | null;
    serviceDate: string | null;
    completionMethod: string | null;
  };
  createdAt: string | null;
  sourceSummary: {
    hasMaintenanceLog: boolean;
    hasTaskCompletion: boolean;
    hasInvoiceAnalysis: boolean;
    isPreConfirmation: boolean;
  };
  evidence: {
    beforePhotos: string[];
    afterPhotos: string[];
    documents: string[];
    aiNotes: string[];
    reasonCodes: string[];
    integrity: {
      locationFlag: boolean;
      timestampFlag: boolean;
      distanceFromPropertyMiles: string | null;
      timestampDeltaHours: string | null;
    };
    duplicateSummary: {
      count: number;
      currentSubmissionMatches: number;
      priorEvidenceMatches: number;
      priorRecordIds: string[];
    };
  };
  history: Array<{
    id: string;
    reviewerId: string;
    reviewerEmail: string;
    decision: MaintenanceEvidenceReviewDecision;
    notes: string | null;
    createdAt: string | null;
    resultingAiVerificationStatus: string | null;
    resultingVerificationTier: string | null;
  }>;
  technical: {
    maintenanceLogId: string | null;
    taskCompletionId: string | null;
    invoiceAnalysisId: string | null;
    beforePhotoHashes: string[];
    afterPhotoHashes: string[];
    invoiceHash: string | null;
    maintenanceAiResponse: unknown;
    taskCompletionAiResponse: unknown;
    invoiceAiResponse: unknown;
    rawInvoiceExtraction: unknown;
  };
};

export type MaintenanceEvidenceReviewRows = {
  maintenanceLogs: EvidenceRow[];
  invoiceAnalyses: EvidenceRow[];
  taskCompletions: EvidenceRow[];
  reviews: EvidenceRow[];
  houses: EvidenceRow[];
  users: EvidenceRow[];
};

function uniqueStrings(...values: unknown[]): string[] {
  return [
    ...new Set(
      values
        .flatMap((value) => (Array.isArray(value) ? value : []))
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    ),
  ];
}

function asObject(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function asIso(value: unknown): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function evidenceDisplayUrl(value: string): string {
  return value.startsWith("/objects/maintenance-evidence/")
    ? `/api/maintenance-evidence/objects?path=${encodeURIComponent(value)}`
    : value;
}

function duplicateMatchesFromResponse(response: unknown): EvidenceRow[] {
  const evidence = asObject(asObject(response).evidence);
  return Array.isArray(evidence.duplicatePhotoMatches)
    ? evidence.duplicatePhotoMatches.filter(
        (match): match is EvidenceRow =>
          Boolean(match) && typeof match === "object" && !Array.isArray(match),
      )
    : [];
}

function aiNotesFromResponse(response: unknown): string[] {
  const record = asObject(response);
  return uniqueStrings(
    [record.notes, record.summary, record.reason].filter(
      (value): value is string => typeof value === "string" && value.trim().length > 0,
    ),
  );
}

function makeItem(
  maintenanceLog: EvidenceRow | null,
  linkedAnalyses: EvidenceRow[],
  taskCompletion: EvidenceRow | null,
  reviews: EvidenceRow[],
  house: EvidenceRow | null,
  homeowner: EvidenceRow | null,
): MaintenanceEvidenceReviewItem {
  const invoice = linkedAnalyses[0] ?? null;
  const sourceType: MaintenanceEvidenceReviewSourceType = maintenanceLog
    ? "maintenance"
    : "invoice";
  const sourceId = maintenanceLog?.id ?? invoice?.id;
  const duplicateMatches = [
    ...new Map(
      [
        ...duplicateMatchesFromResponse(maintenanceLog?.aiVerificationResponse),
        ...duplicateMatchesFromResponse(invoice?.aiVerificationResponse),
      ].map((match) => [
        JSON.stringify([match.hash, match.source, match.priorRecordId ?? null]),
        match,
      ]),
    ).values(),
  ];
  const priorRecordIds = uniqueStrings(
    duplicateMatches.map((match) => match.priorRecordId),
  );
  const history = reviews
    .slice()
    .sort((left, right) =>
      (asIso(right.createdAt) ?? "").localeCompare(asIso(left.createdAt) ?? ""),
    )
    .map((review) => ({
      id: review.id,
      reviewerId: review.reviewerId,
      reviewerEmail: review.reviewerEmail,
      decision: review.decision,
      notes: review.notes ?? null,
      createdAt: asIso(review.createdAt),
      resultingAiVerificationStatus: review.resultingAiVerificationStatus ?? null,
      resultingVerificationTier: review.resultingVerificationTier ?? null,
    }));

  const homeownerName = [
    homeowner?.firstName,
    homeowner?.lastName,
  ].filter(Boolean).join(" ").trim();
  const aiNotes = uniqueStrings(
    linkedAnalyses.map((analysis) => analysis.aiNotes),
    aiNotesFromResponse(maintenanceLog?.aiVerificationResponse),
    linkedAnalyses.flatMap((analysis) => aiNotesFromResponse(analysis.aiVerificationResponse)),
  );

  return {
    id: `${sourceType}:${sourceId}`,
    sourceType,
    sourceId,
    homeowner: {
      id: maintenanceLog?.homeownerId ?? invoice?.homeownerId ?? "",
      name: homeownerName || homeowner?.email || "Unknown homeowner",
      email: homeowner?.email ?? null,
    },
    property: {
      id: maintenanceLog?.houseId ?? invoice?.houseId ?? "",
      address: house?.address ?? null,
    },
    claimedTask: {
      title:
        taskCompletion?.taskTitle
        ?? maintenanceLog?.serviceDescription
        ?? maintenanceLog?.serviceType
        ?? invoice?.serviceDescription
        ?? invoice?.serviceType
        ?? "Maintenance evidence",
      category:
        taskCompletion?.taskCategory
        ?? maintenanceLog?.homeArea
        ?? invoice?.homeArea
        ?? null,
      serviceDate: maintenanceLog?.serviceDate ?? invoice?.serviceDate ?? null,
      completionMethod:
        maintenanceLog?.completionMethod
        ?? invoice?.completionMethod
        ?? taskCompletion?.completionMethod
        ?? null,
    },
    createdAt: asIso(
      maintenanceLog?.createdAt
      ?? invoice?.createdAt
      ?? taskCompletion?.createdAt,
    ),
    sourceSummary: {
      hasMaintenanceLog: Boolean(maintenanceLog),
      hasTaskCompletion: Boolean(taskCompletion),
      hasInvoiceAnalysis: linkedAnalyses.length > 0,
      isPreConfirmation: !maintenanceLog && invoice?.status === "pending",
    },
    evidence: {
      beforePhotos: uniqueStrings(
        maintenanceLog?.beforePhotoUrls,
        linkedAnalyses.flatMap((analysis) => analysis.beforePhotoUrls ?? []),
      ).map(evidenceDisplayUrl),
      afterPhotos: uniqueStrings(
        maintenanceLog?.afterPhotoUrls,
        linkedAnalyses.flatMap((analysis) => analysis.afterPhotoUrls ?? []),
      ).map(evidenceDisplayUrl),
      documents: uniqueStrings(
        maintenanceLog?.receiptUrls,
        linkedAnalyses.flatMap((analysis) => analysis.invoiceUrls ?? []),
        linkedAnalyses.flatMap((analysis) => analysis.receiptUrls ?? []),
      ).map(evidenceDisplayUrl),
      aiNotes,
      reasonCodes: uniqueStrings(
        maintenanceLog?.verificationReasonCodes,
        taskCompletion?.verificationReasonCodes,
        linkedAnalyses.flatMap((analysis) => {
          const response = asObject(analysis.aiVerificationResponse);
          return Array.isArray(response.verificationReasonCodes)
            ? response.verificationReasonCodes
            : [];
        }),
      ),
      integrity: {
        locationFlag: maintenanceLog?.locationFlag === true,
        timestampFlag: maintenanceLog?.timestampFlag === true,
        distanceFromPropertyMiles:
          maintenanceLog?.distanceFromPropertyMiles
          ?? taskCompletion?.distanceFromPropertyMiles
          ?? null,
        timestampDeltaHours:
          maintenanceLog?.timestampDeltaHours
          ?? taskCompletion?.timestampDeltaHours
          ?? null,
      },
      duplicateSummary: {
        count: duplicateMatches.length,
        currentSubmissionMatches: duplicateMatches.filter(
          (match) => match.source === "current_submission",
        ).length,
        priorEvidenceMatches: duplicateMatches.filter(
          (match) => match.source === "prior_maintenance_evidence",
        ).length,
        priorRecordIds,
      },
    },
    history,
    technical: {
      maintenanceLogId: maintenanceLog?.id ?? null,
      taskCompletionId:
        taskCompletion?.id
        ?? maintenanceLog?.taskCompletionId
        ?? invoice?.taskCompletionId
        ?? null,
      invoiceAnalysisId: invoice?.id ?? null,
      beforePhotoHashes: uniqueStrings(
        maintenanceLog?.beforePhotoHashes,
        linkedAnalyses.flatMap((analysis) =>
          asObject(asObject(analysis.aiVerificationResponse).evidence).photoHashes?.before ?? [],
        ),
      ),
      afterPhotoHashes: uniqueStrings(
        maintenanceLog?.afterPhotoHashes,
        linkedAnalyses.flatMap((analysis) =>
          asObject(asObject(analysis.aiVerificationResponse).evidence).photoHashes?.after ?? [],
        ),
      ),
      invoiceHash: invoice?.invoiceHash ?? null,
      maintenanceAiResponse: maintenanceLog?.aiVerificationResponse ?? null,
      taskCompletionAiResponse: taskCompletion?.aiVerificationResponse ?? null,
      invoiceAiResponse: invoice?.aiVerificationResponse ?? null,
      rawInvoiceExtraction: invoice?.rawExtraction ?? null,
    },
  };
}

export function assembleMaintenanceEvidenceReviewItems(
  rows: MaintenanceEvidenceReviewRows,
): MaintenanceEvidenceReviewItem[] {
  const taskById = new Map(rows.taskCompletions.map((row) => [row.id, row]));
  const houseById = new Map(rows.houses.map((row) => [row.id, row]));
  const userById = new Map(rows.users.map((row) => [row.id, row]));
  const handledAnalysisIds = new Set<string>();
  const items: MaintenanceEvidenceReviewItem[] = [];

  for (const log of rows.maintenanceLogs) {
    if (log.aiVerificationStatus !== "review_needed") continue;
    const analyses = rows.invoiceAnalyses.filter(
      (analysis) =>
        analysis.maintenanceLogId === log.id
        || (
          Boolean(log.taskCompletionId)
          && analysis.taskCompletionId === log.taskCompletionId
        ),
    );
    analyses.forEach((analysis) => handledAnalysisIds.add(analysis.id));
    const taskId = log.taskCompletionId ?? analyses[0]?.taskCompletionId ?? null;
    const relatedReviews = rows.reviews.filter(
      (review) =>
        review.maintenanceLogId === log.id
        || (taskId && review.taskCompletionId === taskId)
        || analyses.some((analysis) => review.invoiceAnalysisId === analysis.id),
    );
    items.push(makeItem(
      log,
      analyses,
      taskId ? taskById.get(taskId) ?? null : null,
      relatedReviews,
      houseById.get(log.houseId) ?? null,
      userById.get(log.homeownerId) ?? null,
    ));
  }

  for (const analysis of rows.invoiceAnalyses) {
    if (
      handledAnalysisIds.has(analysis.id)
      ||
      analysis.aiVerificationStatus !== "review_needed"
      || analysis.status !== "pending"
    ) {
      continue;
    }
    const analyses = rows.invoiceAnalyses.filter(
      (candidate) =>
        candidate.status === "pending"
        && candidate.aiVerificationStatus === "review_needed"
        && (
          candidate.id === analysis.id
          || (
            Boolean(analysis.taskCompletionId)
            && candidate.taskCompletionId === analysis.taskCompletionId
          )
        ),
    );
    analyses.forEach((candidate) => handledAnalysisIds.add(candidate.id));
    const task = analysis.taskCompletionId
      ? taskById.get(analysis.taskCompletionId) ?? null
      : null;
    const relatedReviews = rows.reviews.filter(
      (review) =>
        analyses.some((candidate) => review.invoiceAnalysisId === candidate.id)
        || (analysis.taskCompletionId && review.taskCompletionId === analysis.taskCompletionId),
    );
    items.push(makeItem(
      null,
      analyses,
      task,
      relatedReviews,
      houseById.get(analysis.houseId) ?? null,
      userById.get(analysis.homeownerId) ?? null,
    ));
  }

  return items.sort((left, right) =>
    (left.createdAt ?? "").localeCompare(right.createdAt ?? ""),
  );
}

export async function loadMaintenanceEvidenceReviewItems(
  dbInstance: any,
): Promise<MaintenanceEvidenceReviewItem[]> {
  const reviewNeededLogs = await dbInstance
    .select()
    .from(maintenanceLogs)
    .where(eq(maintenanceLogs.aiVerificationStatus, "review_needed"));
  const reviewNeededAnalyses = await dbInstance
    .select()
    .from(invoiceAnalyses)
    .where(eq(invoiceAnalyses.aiVerificationStatus, "review_needed"));
  const logIds = reviewNeededLogs.map((row: EvidenceRow) => row.id);
  const logTaskIds = uniqueStrings(
    reviewNeededLogs.map((row: EvidenceRow) => row.taskCompletionId),
  );
  const linkedAnalysisConditions = [
    logIds.length > 0
      ? inArray(invoiceAnalyses.maintenanceLogId, logIds)
      : undefined,
    logTaskIds.length > 0
      ? inArray(invoiceAnalyses.taskCompletionId, logTaskIds)
      : undefined,
  ].filter(Boolean);
  const additionallyLinkedAnalyses = linkedAnalysisConditions.length > 0
    ? await dbInstance
        .select()
        .from(invoiceAnalyses)
        .where(or(...linkedAnalysisConditions))
    : [];
  const allAnalyses = [
    ...new Map(
      [...reviewNeededAnalyses, ...additionallyLinkedAnalyses]
        .map((row: EvidenceRow) => [row.id, row]),
    ).values(),
  ] as EvidenceRow[];
  const taskIds = uniqueStrings(
    reviewNeededLogs.map((row: EvidenceRow) => row.taskCompletionId),
    allAnalyses.map((row) => row.taskCompletionId),
  );
  const linkedTaskCompletions = taskIds.length > 0
    ? await dbInstance
        .select()
        .from(taskCompletions)
        .where(inArray(taskCompletions.id, taskIds))
    : [];
  const analysisIds = allAnalyses.map((row) => row.id);
  const reviewConditions = [
    logIds.length > 0
      ? inArray(maintenanceEvidenceReviews.maintenanceLogId, logIds)
      : undefined,
    taskIds.length > 0
      ? inArray(maintenanceEvidenceReviews.taskCompletionId, taskIds)
      : undefined,
    analysisIds.length > 0
      ? inArray(maintenanceEvidenceReviews.invoiceAnalysisId, analysisIds)
      : undefined,
  ].filter(Boolean);
  const reviewRows = reviewConditions.length > 0
    ? await dbInstance
        .select()
        .from(maintenanceEvidenceReviews)
        .where(or(...reviewConditions))
        .orderBy(desc(maintenanceEvidenceReviews.createdAt))
    : [];
  const houseIds = uniqueStrings(
    reviewNeededLogs.map((row: EvidenceRow) => row.houseId),
    allAnalyses.map((row) => row.houseId),
  );
  const homeownerIds = uniqueStrings(
    reviewNeededLogs.map((row: EvidenceRow) => row.homeownerId),
    allAnalyses.map((row) => row.homeownerId),
  );
  const [houseRows, homeownerRows] = await Promise.all([
    houseIds.length > 0
      ? dbInstance.select().from(houses).where(inArray(houses.id, houseIds))
      : Promise.resolve([]),
    homeownerIds.length > 0
      ? dbInstance.select().from(users).where(inArray(users.id, homeownerIds))
      : Promise.resolve([]),
  ]);

  return assembleMaintenanceEvidenceReviewItems({
    maintenanceLogs: reviewNeededLogs,
    invoiceAnalyses: allAnalyses,
    taskCompletions: linkedTaskCompletions,
    reviews: reviewRows,
    houses: houseRows,
    users: homeownerRows,
  });
}

export class MaintenanceEvidenceReviewError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
  }
}

function annotatedResubmission(
  response: unknown,
  hashes: { before: string[]; after: string[]; receipts: string[] },
): Record<string, any> {
  const current = asObject(response);
  const reasonCodes = uniqueStrings(current.verificationReasonCodes, ["homeowner_resubmitted_evidence"]);
  const evidence = asObject(current.evidence);
  const photoHashes = asObject(evidence.photoHashes);
  return {
    ...current,
    verificationReasonCodes: reasonCodes,
    evidence: {
      ...evidence,
      photoHashes: {
        ...photoHashes,
        before: uniqueStrings(photoHashes.before, hashes.before),
        after: uniqueStrings(photoHashes.after, hashes.after),
        receipts: uniqueStrings(photoHashes.receipts, hashes.receipts),
      },
    },
    homeownerResubmittedEvidence: true,
    homeownerResubmittedAt: new Date().toISOString(),
  };
}

/**
 * Appends homeowner-provided evidence to every record in a review linkage group.
 * Deliberately does not re-score or alter verification status/tier: an admin still
 * has to make the final decision after reviewing the new evidence.
 */
export async function resubmitMaintenanceEvidence(
  dbInstance: any,
  input: {
    sourceType: MaintenanceEvidenceReviewSourceType;
    sourceId: string;
    homeownerId: string;
    beforeUrls: string[];
    afterUrls: string[];
    receiptUrls: string[];
    beforeHashes: string[];
    afterHashes: string[];
    receiptHashes: string[];
  },
): Promise<{ title: string; beforeCount: number; afterCount: number; receiptCount: number }> {
  return dbInstance.transaction(async (tx: any) => {
    const sourceTable = input.sourceType === "maintenance" ? maintenanceLogs : invoiceAnalyses;
    const [preliminary] = await tx.select().from(sourceTable)
      .where(eq(sourceTable.id, input.sourceId)).limit(1);
    if (!preliminary || preliminary.homeownerId !== input.homeownerId) {
      throw new MaintenanceEvidenceReviewError("Evidence request was not found", 404, "EVIDENCE_REQUEST_NOT_FOUND");
    }
    if (preliminary.aiVerificationStatus !== "review_needed") {
      throw new MaintenanceEvidenceReviewError("This evidence request is no longer awaiting information", 409, "EVIDENCE_REQUEST_ALREADY_RESOLVED");
    }
    const groupLockKey = preliminary.taskCompletionId
      ? `maintenance-evidence-task:${preliminary.taskCompletionId}`
      : preliminary.maintenanceLogId
        ? `maintenance-evidence-log:${preliminary.maintenanceLogId}`
        : input.sourceType === "maintenance"
          ? `maintenance-evidence-log:${preliminary.id}`
          : `maintenance-evidence-invoice:${preliminary.id}`;
    await tx.execute(drizzleSql`SELECT pg_advisory_xact_lock(hashtextextended(${groupLockKey}, 0))`);

    const [source] = await tx.select().from(sourceTable)
      .where(eq(sourceTable.id, input.sourceId)).limit(1);
    if (!source || source.homeownerId !== input.homeownerId) {
      throw new MaintenanceEvidenceReviewError("Evidence request was not found", 404, "EVIDENCE_REQUEST_NOT_FOUND");
    }
    if (source.aiVerificationStatus !== "review_needed") {
      throw new MaintenanceEvidenceReviewError("This evidence request is no longer awaiting information", 409, "EVIDENCE_REQUEST_ALREADY_RESOLVED");
    }
    const logId = input.sourceType === "maintenance" ? source.id : source.maintenanceLogId;
    const taskId = source.taskCompletionId;
    const analysisConditions = [eq(invoiceAnalyses.id, input.sourceType === "invoice" ? source.id : "")];
    if (logId) analysisConditions.push(eq(invoiceAnalyses.maintenanceLogId, logId));
    if (taskId) analysisConditions.push(eq(invoiceAnalyses.taskCompletionId, taskId));
    const analyses = await tx.select().from(invoiceAnalyses).where(or(...analysisConditions));
    const logConditions = logId ? [eq(maintenanceLogs.id, logId)] : [];
    if (taskId) logConditions.push(eq(maintenanceLogs.taskCompletionId, taskId));
    const logs = logConditions.length ? await tx.select().from(maintenanceLogs).where(or(...logConditions)) : [];
    const taskIds = uniqueStrings(
      [taskId],
      (logs as EvidenceRow[]).map((row) => row.taskCompletionId),
      (analyses as EvidenceRow[]).map((row) => row.taskCompletionId),
    );
    const completions = taskIds.length
      ? await tx.select().from(taskCompletions).where(inArray(taskCompletions.id, taskIds))
      : [];
    const append = (existing: unknown, additions: string[]) => uniqueStrings(existing, additions);

    for (const log of logs) {
      await tx.update(maintenanceLogs).set({
        beforePhotoUrls: append(log.beforePhotoUrls, input.beforeUrls),
        afterPhotoUrls: append(log.afterPhotoUrls, input.afterUrls),
        receiptUrls: append(log.receiptUrls, input.receiptUrls),
        beforePhotoHashes: append(log.beforePhotoHashes, input.beforeHashes),
        afterPhotoHashes: append(log.afterPhotoHashes, input.afterHashes),
        verificationReasonCodes: append(log.verificationReasonCodes, ["homeowner_resubmitted_evidence"]),
        aiVerificationResponse: annotatedResubmission(log.aiVerificationResponse, {
          before: input.beforeHashes, after: input.afterHashes, receipts: input.receiptHashes,
        }),
      }).where(eq(maintenanceLogs.id, log.id));
    }
    for (const analysis of analyses) {
      await tx.update(invoiceAnalyses).set({
        beforePhotoUrls: append(analysis.beforePhotoUrls, input.beforeUrls),
        afterPhotoUrls: append(analysis.afterPhotoUrls, input.afterUrls),
        receiptUrls: append(analysis.receiptUrls, input.receiptUrls),
        aiVerificationResponse: annotatedResubmission(analysis.aiVerificationResponse, {
          before: input.beforeHashes, after: input.afterHashes, receipts: input.receiptHashes,
        }),
      }).where(eq(invoiceAnalyses.id, analysis.id));
    }
    for (const completion of completions) {
      await tx.update(taskCompletions).set({
        documentsUploaded: (completion.documentsUploaded ?? 0) + input.beforeUrls.length + input.afterUrls.length + input.receiptUrls.length,
        verificationReasonCodes: append(completion.verificationReasonCodes, ["homeowner_resubmitted_evidence"]),
        aiVerificationResponse: annotatedResubmission(completion.aiVerificationResponse, {
          before: input.beforeHashes, after: input.afterHashes, receipts: input.receiptHashes,
        }),
      }).where(eq(taskCompletions.id, completion.id));
    }
    const title = source.serviceDescription ?? source.serviceType ?? completions[0]?.taskTitle ?? "Maintenance evidence";
    return { title, beforeCount: input.beforeUrls.length, afterCount: input.afterUrls.length, receiptCount: input.receiptUrls.length };
  });
}

function automatedSnapshot(
  log: EvidenceRow | null,
  completions: EvidenceRow[],
  analyses: EvidenceRow[],
): Record<string, unknown> {
  return {
    maintenanceLog: log
      ? {
          id: log.id,
          aiVerificationStatus: log.aiVerificationStatus,
          verificationTier: log.verificationTier,
          verificationReasonCodes: log.verificationReasonCodes ?? [],
          aiVerificationResponse: log.aiVerificationResponse ?? null,
        }
      : null,
    taskCompletions: completions.map((completion) => ({
      id: completion.id,
      aiVerificationStatus: completion.aiVerificationStatus,
      verificationTier: completion.verificationTier,
      verificationReasonCodes: completion.verificationReasonCodes ?? [],
      aiVerificationResponse: completion.aiVerificationResponse ?? null,
    })),
    invoiceAnalyses: analyses.map((analysis) => ({
      id: analysis.id,
      aiVerificationStatus: analysis.aiVerificationStatus,
      verificationReasonCodes:
        asObject(analysis.aiVerificationResponse).verificationReasonCodes ?? [],
      aiVerificationResponse: analysis.aiVerificationResponse ?? null,
    })),
  };
}

export async function recordMaintenanceEvidenceReview(
  dbInstance: any,
  input: {
    sourceType: MaintenanceEvidenceReviewSourceType;
    sourceId: string;
    decision: MaintenanceEvidenceReviewDecision;
    notes?: string | null;
    reviewerId: string;
    reviewerEmail: string;
  },
): Promise<EvidenceRow> {
  const notes = input.notes?.trim() || null;
  if (input.decision === "request_more_info" && !notes) {
    throw new MaintenanceEvidenceReviewError(
      "A note is required when requesting more information",
      400,
      "REVIEW_NOTE_REQUIRED",
    );
  }

  return dbInstance.transaction(async (tx: any) => {
    let log: EvidenceRow | null = null;
    let analyses: EvidenceRow[] = [];

    if (input.sourceType === "maintenance") {
      const [preliminaryLog] = await tx
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.id, input.sourceId))
        .limit(1);
      if (!preliminaryLog) {
        throw new MaintenanceEvidenceReviewError(
          "Maintenance evidence was not found",
          404,
          "REVIEW_ITEM_NOT_FOUND",
        );
      }
      const groupLockKey = preliminaryLog.taskCompletionId
        ? `maintenance-evidence-task:${preliminaryLog.taskCompletionId}`
        : `maintenance-evidence-log:${preliminaryLog.id}`;
      await tx.execute(drizzleSql`
        SELECT pg_advisory_xact_lock(hashtextextended(${groupLockKey}, 0))
      `);
      await tx.execute(drizzleSql`
        SELECT id
        FROM maintenance_logs
        WHERE id = ${input.sourceId}
        FOR UPDATE
      `);
      [log] = await tx
        .select()
        .from(maintenanceLogs)
        .where(eq(maintenanceLogs.id, input.sourceId))
        .limit(1);
      if (!log) {
        throw new MaintenanceEvidenceReviewError(
          "Maintenance evidence was not found",
          404,
          "REVIEW_ITEM_NOT_FOUND",
        );
      }
      if (log.aiVerificationStatus !== "review_needed") {
        throw new MaintenanceEvidenceReviewError(
          "This evidence item is no longer awaiting review",
          409,
          "REVIEW_ITEM_ALREADY_RESOLVED",
        );
      }
      if (log.taskCompletionId) {
        await tx.execute(drizzleSql`
          SELECT id
          FROM invoice_analyses
          WHERE maintenance_log_id = ${log.id}
             OR task_completion_id = ${log.taskCompletionId}
          FOR UPDATE
        `);
        analyses = await tx
          .select()
          .from(invoiceAnalyses)
          .where(or(
            eq(invoiceAnalyses.maintenanceLogId, log.id),
            eq(invoiceAnalyses.taskCompletionId, log.taskCompletionId),
          ));
      } else {
        await tx.execute(drizzleSql`
          SELECT id
          FROM invoice_analyses
          WHERE maintenance_log_id = ${log.id}
          FOR UPDATE
        `);
        analyses = await tx
          .select()
          .from(invoiceAnalyses)
          .where(eq(invoiceAnalyses.maintenanceLogId, log.id));
      }
    } else {
      const [preliminaryAnalysis] = await tx
        .select()
        .from(invoiceAnalyses)
        .where(eq(invoiceAnalyses.id, input.sourceId))
        .limit(1);
      if (!preliminaryAnalysis || preliminaryAnalysis.status !== "pending") {
        throw new MaintenanceEvidenceReviewError(
          "Pending invoice evidence was not found",
          404,
          "REVIEW_ITEM_NOT_FOUND",
        );
      }
      const groupLockKey = preliminaryAnalysis.taskCompletionId
        ? `maintenance-evidence-task:${preliminaryAnalysis.taskCompletionId}`
        : preliminaryAnalysis.maintenanceLogId
          ? `maintenance-evidence-log:${preliminaryAnalysis.maintenanceLogId}`
          : `maintenance-evidence-invoice:${preliminaryAnalysis.id}`;
      await tx.execute(drizzleSql`
        SELECT pg_advisory_xact_lock(hashtextextended(${groupLockKey}, 0))
      `);
      if (preliminaryAnalysis.taskCompletionId && preliminaryAnalysis.maintenanceLogId) {
        await tx.execute(drizzleSql`
          SELECT id
          FROM invoice_analyses
          WHERE id = ${input.sourceId}
             OR task_completion_id = ${preliminaryAnalysis.taskCompletionId}
             OR maintenance_log_id = ${preliminaryAnalysis.maintenanceLogId}
          ORDER BY id
          FOR UPDATE
        `);
      } else if (preliminaryAnalysis.taskCompletionId) {
        await tx.execute(drizzleSql`
          SELECT id
          FROM invoice_analyses
          WHERE id = ${input.sourceId}
             OR task_completion_id = ${preliminaryAnalysis.taskCompletionId}
          ORDER BY id
          FOR UPDATE
        `);
      } else if (preliminaryAnalysis.maintenanceLogId) {
        await tx.execute(drizzleSql`
          SELECT id
          FROM invoice_analyses
          WHERE id = ${input.sourceId}
             OR maintenance_log_id = ${preliminaryAnalysis.maintenanceLogId}
          ORDER BY id
          FOR UPDATE
        `);
      } else {
        await tx.execute(drizzleSql`
          SELECT id
          FROM invoice_analyses
          WHERE id = ${input.sourceId}
          FOR UPDATE
        `);
      }
      const [analysis] = await tx
        .select()
        .from(invoiceAnalyses)
        .where(eq(invoiceAnalyses.id, input.sourceId))
        .limit(1);
      if (!analysis || analysis.status !== "pending") {
        throw new MaintenanceEvidenceReviewError(
          "Pending invoice evidence was not found",
          404,
          "REVIEW_ITEM_NOT_FOUND",
        );
      }
      if (analysis.aiVerificationStatus !== "review_needed") {
        throw new MaintenanceEvidenceReviewError(
          "This evidence item is no longer awaiting review",
          409,
          "REVIEW_ITEM_ALREADY_RESOLVED",
        );
      }
      const analysisConditions = [eq(invoiceAnalyses.id, analysis.id)];
      if (analysis.maintenanceLogId) {
        analysisConditions.push(
          eq(invoiceAnalyses.maintenanceLogId, analysis.maintenanceLogId),
        );
      }
      if (analysis.taskCompletionId) {
        analysisConditions.push(
          eq(invoiceAnalyses.taskCompletionId, analysis.taskCompletionId),
        );
      }
      analyses = await tx
        .select()
        .from(invoiceAnalyses)
        .where(or(...analysisConditions));
      const linkedLogIds = uniqueStrings(
        [analysis.maintenanceLogId],
        analyses.map((candidate) => candidate.maintenanceLogId),
      );
      if (linkedLogIds.length > 0 || analysis.taskCompletionId) {
        if (linkedLogIds.length > 0 && analysis.taskCompletionId) {
          await tx.execute(drizzleSql`
            SELECT id
            FROM maintenance_logs
            WHERE id = ANY(${linkedLogIds}::text[])
               OR task_completion_id = ${analysis.taskCompletionId}
            FOR UPDATE
          `);
          [log] = await tx
            .select()
            .from(maintenanceLogs)
            .where(or(
              inArray(maintenanceLogs.id, linkedLogIds),
              eq(maintenanceLogs.taskCompletionId, analysis.taskCompletionId),
            ))
            .limit(1);
        } else if (linkedLogIds.length > 0) {
          await tx.execute(drizzleSql`
            SELECT id
            FROM maintenance_logs
            WHERE id = ANY(${linkedLogIds}::text[])
            FOR UPDATE
          `);
          [log] = await tx
            .select()
            .from(maintenanceLogs)
            .where(inArray(maintenanceLogs.id, linkedLogIds))
            .limit(1);
        } else if (analysis.taskCompletionId) {
          await tx.execute(drizzleSql`
            SELECT id
            FROM maintenance_logs
            WHERE task_completion_id = ${analysis.taskCompletionId}
            FOR UPDATE
          `);
          [log] = await tx
            .select()
            .from(maintenanceLogs)
            .where(eq(maintenanceLogs.taskCompletionId, analysis.taskCompletionId))
            .limit(1);
        }
      }
    }

    const taskIds = uniqueStrings(
      [log?.taskCompletionId],
      analyses.map((analysis) => analysis.taskCompletionId),
    );
    const completions = taskIds.length > 0
      ? await tx
          .select()
          .from(taskCompletions)
          .where(inArray(taskCompletions.id, taskIds))
      : [];
    const resultingAiVerificationStatus =
      input.decision === "approve"
        ? "verified"
        : input.decision === "reject"
          ? "rejected"
          : "review_needed";
    const resultingVerificationTier =
      input.decision === "approve"
        ? "photo_verified"
        : input.decision === "reject"
          ? "self_reported"
          : null;

    const [review] = await tx
      .insert(maintenanceEvidenceReviews)
      .values({
        maintenanceLogId: log?.id ?? null,
        taskCompletionId: completions[0]?.id ?? taskIds[0] ?? null,
        invoiceAnalysisId:
          input.sourceType === "invoice"
            ? input.sourceId
            : analyses[0]?.id ?? null,
        reviewerId: input.reviewerId,
        reviewerEmail: input.reviewerEmail,
        decision: input.decision,
        notes,
        automatedSnapshot: automatedSnapshot(log, completions, analyses),
        resultingAiVerificationStatus,
        resultingVerificationTier,
      })
      .returning();

    if (input.decision !== "request_more_info") {
      if (log) {
        await tx
          .update(maintenanceLogs)
          .set({
            aiVerificationStatus: resultingAiVerificationStatus,
            verificationTier: resultingVerificationTier,
          })
          .where(eq(maintenanceLogs.id, log.id));
      }
      if (taskIds.length > 0) {
        await tx
          .update(taskCompletions)
          .set({
            aiVerificationStatus: resultingAiVerificationStatus,
            verificationTier: resultingVerificationTier,
          })
          .where(inArray(taskCompletions.id, taskIds));
      }
      if (analyses.length > 0) {
        await tx
          .update(invoiceAnalyses)
          .set({ aiVerificationStatus: resultingAiVerificationStatus })
          .where(inArray(invoiceAnalyses.id, analyses.map((analysis) => analysis.id)));
      }
    }

    return review;
  });
}

export async function getResolvedHumanReviewForInvoice(
  dbInstance: any,
  invoiceAnalysisId: string,
): Promise<EvidenceRow | null> {
  const [analysis] = await dbInstance
    .select()
    .from(invoiceAnalyses)
    .where(eq(invoiceAnalyses.id, invoiceAnalysisId))
    .limit(1);
  if (!analysis) return null;
  const linkageConditions = [eq(invoiceAnalyses.id, invoiceAnalysisId)];
  if (analysis.taskCompletionId) {
    linkageConditions.push(
      eq(invoiceAnalyses.taskCompletionId, analysis.taskCompletionId),
    );
  }
  if (analysis.maintenanceLogId) {
    linkageConditions.push(
      eq(invoiceAnalyses.maintenanceLogId, analysis.maintenanceLogId),
    );
  }
  const linkedAnalyses = await dbInstance
    .select()
    .from(invoiceAnalyses)
    .where(or(...linkageConditions));
  const linkedInvoiceIds = uniqueStrings(
    [invoiceAnalysisId],
    linkedAnalyses.map((candidate: EvidenceRow) => candidate.id),
  );
  const reviewLinkageConditions = [
    inArray(maintenanceEvidenceReviews.invoiceAnalysisId, linkedInvoiceIds),
    analysis.taskCompletionId
      ? eq(
          maintenanceEvidenceReviews.taskCompletionId,
          analysis.taskCompletionId,
        )
      : undefined,
    analysis.maintenanceLogId
      ? eq(
          maintenanceEvidenceReviews.maintenanceLogId,
          analysis.maintenanceLogId,
        )
      : undefined,
  ].filter(Boolean);
  const [review] = await dbInstance
    .select()
    .from(maintenanceEvidenceReviews)
    .where(and(
      or(...reviewLinkageConditions),
      inArray(maintenanceEvidenceReviews.decision, ["approve", "reject"]),
    ))
    .orderBy(desc(maintenanceEvidenceReviews.createdAt))
    .limit(1);
  return review ?? null;
}