import { describe, expect, it, vi } from "vitest";
import {
  invoiceAnalyses,
  maintenanceEvidenceReviews,
  maintenanceLogs,
  taskCompletions,
} from "@workspace/db";
import {
  assembleMaintenanceEvidenceReviewItems,
  getResolvedHumanReviewForInvoice,
  MaintenanceEvidenceReviewError,
  resubmitMaintenanceEvidence,
  type MaintenanceEvidenceReviewRows,
  recordMaintenanceEvidenceReview,
} from "./maintenance-evidence-review";

const AI_RESPONSE = {
  notes: "The work appears complete, but duplicate evidence needs review.",
  verificationReasonCodes: ["duplicate_photo_hash", "review_needed"],
  evidence: {
    photoHashes: {
      before: ["a".repeat(64)],
      after: ["b".repeat(64)],
    },
    duplicatePhotoMatches: [
      {
        hash: "a".repeat(64),
        source: "prior_maintenance_evidence",
        priorRecordId: "prior-log",
      },
    ],
  },
};

function queueRows(): MaintenanceEvidenceReviewRows {
  return {
    maintenanceLogs: [
      {
        id: "log-1",
        homeownerId: "owner-1",
        houseId: "house-1",
        taskCompletionId: "task-1",
        serviceType: "HVAC filter replacement",
        serviceDescription: "Replace HVAC filter",
        serviceDate: "2026-08-25",
        completionMethod: "diy",
        aiVerificationStatus: "review_needed",
        verificationTier: "self_reported",
        verificationReasonCodes: ["duplicate_photo_hash", "review_needed"],
        aiVerificationResponse: AI_RESPONSE,
        beforePhotoUrls: ["/public/before.jpg"],
        afterPhotoUrls: ["/public/after.jpg"],
        receiptUrls: [],
        beforePhotoHashes: ["a".repeat(64)],
        afterPhotoHashes: ["b".repeat(64)],
        locationFlag: false,
        timestampFlag: true,
        distanceFromPropertyMiles: "0.30",
        timestampDeltaHours: "30.00",
        createdAt: new Date("2026-08-25T10:00:00Z"),
      },
      {
        id: "log-resolved",
        homeownerId: "owner-1",
        houseId: "house-1",
        aiVerificationStatus: "verified",
        createdAt: new Date("2026-08-26T10:00:00Z"),
      },
    ],
    invoiceAnalyses: [
      {
        id: "analysis-linked",
        homeownerId: "owner-1",
        houseId: "house-1",
        maintenanceLogId: "log-1",
        taskCompletionId: "task-1",
        status: "confirmed",
        completionMethod: "diy",
        aiVerificationStatus: "review_needed",
        aiVerificationResponse: AI_RESPONSE,
        aiNotes: "Potential duplicate photo.",
        invoiceUrls: ["/public/invoice.pdf"],
        beforePhotoUrls: ["/public/before.jpg"],
        afterPhotoUrls: ["/public/after.jpg"],
        receiptUrls: [],
        invoiceHash: "invoice-hash",
        rawExtraction: { service: "HVAC" },
        createdAt: new Date("2026-08-25T09:00:00Z"),
      },
      {
        id: "analysis-pending",
        homeownerId: "owner-2",
        houseId: "house-2",
        maintenanceLogId: null,
        taskCompletionId: null,
        status: "pending",
        completionMethod: "diy",
        serviceDescription: "Clean dryer vent",
        aiVerificationStatus: "review_needed",
        aiVerificationResponse: AI_RESPONSE,
        beforePhotoUrls: ["/public/dryer-before.jpg"],
        afterPhotoUrls: ["/public/dryer-after.jpg"],
        invoiceUrls: [],
        receiptUrls: [],
        createdAt: new Date("2026-08-27T09:00:00Z"),
      },
      {
        id: "analysis-rejected",
        homeownerId: "owner-2",
        houseId: "house-2",
        status: "rejected",
        aiVerificationStatus: "review_needed",
        createdAt: new Date("2026-08-28T09:00:00Z"),
      },
    ],
    taskCompletions: [
      {
        id: "task-1",
        taskTitle: "Replace HVAC filter",
        taskCategory: "HVAC",
        aiVerificationStatus: "review_needed",
        verificationTier: "self_reported",
        verificationReasonCodes: ["duplicate_photo_hash", "review_needed"],
        aiVerificationResponse: AI_RESPONSE,
      },
    ],
    reviews: [
      {
        id: "review-note",
        maintenanceLogId: "log-1",
        taskCompletionId: "task-1",
        invoiceAnalysisId: "analysis-linked",
        reviewerId: "admin-1",
        reviewerEmail: "admin@example.com",
        decision: "request_more_info",
        notes: "Check the original timestamp.",
        resultingAiVerificationStatus: "review_needed",
        resultingVerificationTier: null,
        createdAt: new Date("2026-08-26T12:00:00Z"),
      },
    ],
    houses: [
      { id: "house-1", address: "100 Main St" },
      { id: "house-2", address: "200 Pine St" },
    ],
    users: [
      { id: "owner-1", firstName: "Alex", lastName: "Owner", email: "alex@example.com" },
      { id: "owner-2", firstName: "Sam", lastName: "Owner", email: "sam@example.com" },
    ],
  };
}

describe("assembleMaintenanceEvidenceReviewItems", () => {
  it("filters to unresolved sources and groups linked records into one queue item", () => {
    const items = assembleMaintenanceEvidenceReviewItems(queueRows());

    expect(items.map((item) => item.id)).toEqual([
      "maintenance:log-1",
      "invoice:analysis-pending",
    ]);
    expect(items[0].sourceSummary).toEqual({
      hasMaintenanceLog: true,
      hasTaskCompletion: true,
      hasInvoiceAnalysis: true,
      isPreConfirmation: false,
    });
    expect(items[1].sourceSummary.isPreConfirmation).toBe(true);
  });

  it("assembles curated evidence, audit history, and separately nested technical details", () => {
    const [item] = assembleMaintenanceEvidenceReviewItems(queueRows());

    expect(item.claimedTask.title).toBe("Replace HVAC filter");
    expect(item.evidence.beforePhotos).toEqual(["/public/before.jpg"]);
    expect(item.evidence.documents).toEqual(["/public/invoice.pdf"]);
    expect(item.evidence.reasonCodes).toEqual([
      "duplicate_photo_hash",
      "review_needed",
    ]);
    expect(item.evidence.duplicateSummary).toEqual({
      count: 1,
      currentSubmissionMatches: 0,
      priorEvidenceMatches: 1,
      priorRecordIds: ["prior-log"],
    });
    expect(item.history[0]).toMatchObject({
      decision: "request_more_info",
      notes: "Check the original timestamp.",
      reviewerEmail: "admin@example.com",
    });
    expect(item.technical.beforePhotoHashes).toEqual(["a".repeat(64)]);
    expect(item.technical.invoiceHash).toBe("invoice-hash");
  });

  it("groups pending analyses linked through the same task completion", () => {
    const rows = queueRows();
    rows.maintenanceLogs = [];
    rows.invoiceAnalyses = [
      {
        ...rows.invoiceAnalyses[1],
        id: "analysis-pending-a",
        taskCompletionId: "shared-task",
      },
      {
        ...rows.invoiceAnalyses[1],
        id: "analysis-pending-b",
        taskCompletionId: "shared-task",
      },
    ];
    rows.taskCompletions = [{
      id: "shared-task",
      taskTitle: "Clean dryer vent",
      taskCategory: "Safety",
    }];
    rows.reviews = [];

    const items = assembleMaintenanceEvidenceReviewItems(rows);

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      id: "invoice:analysis-pending-a",
      sourceSummary: {
        hasMaintenanceLog: false,
        hasTaskCompletion: true,
        hasInvoiceAnalysis: true,
        isPreConfirmation: true,
      },
    });
  });
});

type FakeTxOptions = {
  log?: Record<string, any>;
  analyses?: Record<string, any>[];
  completions?: Record<string, any>[];
  reviews?: Record<string, any>[];
};

function thenableRows(rows: Record<string, any>[]) {
  const result = {
    limit: vi.fn().mockResolvedValue(rows.slice(0, 1)),
    then: (
      resolve: (value: Record<string, any>[]) => unknown,
      reject: (reason: unknown) => unknown,
    ) => Promise.resolve(rows).then(resolve, reject),
    orderBy: vi.fn(),
  };
  result.orderBy.mockReturnValue(result);
  return result;
}

function makeReviewDb(options: FakeTxOptions) {
  const state = structuredClone(options);
  const inserts: Record<string, any>[] = [];
  const updates: Array<{ table: unknown; values: Record<string, any> }> = [];
  const rowsFor = (table: unknown) => {
    if (table === maintenanceLogs) return state.log ? [state.log] : [];
    if (table === invoiceAnalyses) return state.analyses ?? [];
    if (table === taskCompletions) return state.completions ?? [];
    if (table === maintenanceEvidenceReviews) return state.reviews ?? [];
    return [];
  };
  const tx = {
    execute: vi.fn().mockResolvedValue({ rows: [] }),
    select: vi.fn(() => ({
      from: vi.fn((table: unknown) => ({
        where: vi.fn(() => thenableRows(rowsFor(table))),
      })),
    })),
    insert: vi.fn((table: unknown) => ({
      values: vi.fn((values: Record<string, any>) => {
        inserts.push(values);
        return {
          returning: vi.fn().mockResolvedValue([
            { id: "review-1", ...values, createdAt: new Date("2026-08-29T12:00:00Z") },
          ]),
        };
      }),
    })),
    update: vi.fn((table: unknown) => ({
      set: vi.fn((values: Record<string, any>) => ({
        where: vi.fn(async () => {
          updates.push({ table, values });
          if (table === maintenanceLogs && state.log) {
            Object.assign(state.log, values);
          }
          if (table === invoiceAnalyses) {
            state.analyses?.forEach((analysis) => Object.assign(analysis, values));
          }
          if (table === taskCompletions) {
            state.completions?.forEach((completion) => Object.assign(completion, values));
          }
        }),
      })),
    })),
  };
  let transactionChain = Promise.resolve<unknown>(undefined);
  const transaction = vi.fn(
    (callback: (transaction: typeof tx) => unknown) => {
      const result = transactionChain.then(() => callback(tx));
      transactionChain = result.then(
        () => undefined,
        () => undefined,
      );
      return result;
    },
  );
  return {
    db: {
      transaction,
      select: tx.select,
    },
    inserts,
    updates,
  };
}

const linkedSources = {
  log: {
    id: "log-1",
    taskCompletionId: "task-1",
    aiVerificationStatus: "review_needed",
    verificationTier: "self_reported",
    verificationReasonCodes: ["duplicate_photo_hash", "review_needed"],
    aiVerificationResponse: AI_RESPONSE,
  },
  analyses: [{
    id: "analysis-1",
    maintenanceLogId: "log-1",
    taskCompletionId: "task-1",
    status: "confirmed",
    aiVerificationStatus: "review_needed",
    aiVerificationResponse: AI_RESPONSE,
  }],
  completions: [{
    id: "task-1",
    aiVerificationStatus: "review_needed",
    verificationTier: "self_reported",
    verificationReasonCodes: ["duplicate_photo_hash", "review_needed"],
    aiVerificationResponse: AI_RESPONSE,
  }],
};

describe("recordMaintenanceEvidenceReview", () => {
  it("approves and synchronizes linked records while snapshotting automated evidence", async () => {
    const fake = makeReviewDb(linkedSources);

    await recordMaintenanceEvidenceReview(fake.db, {
      sourceType: "maintenance",
      sourceId: "log-1",
      decision: "approve",
      notes: "Photos match the claimed work.",
      reviewerId: "admin-1",
      reviewerEmail: "admin@example.com",
    });

    expect(fake.inserts[0]).toMatchObject({
      decision: "approve",
      resultingAiVerificationStatus: "verified",
      resultingVerificationTier: "photo_verified",
    });
    expect(fake.inserts[0].automatedSnapshot.maintenanceLog).toMatchObject({
      aiVerificationStatus: "review_needed",
      verificationTier: "self_reported",
      verificationReasonCodes: ["duplicate_photo_hash", "review_needed"],
      aiVerificationResponse: AI_RESPONSE,
    });
    expect(fake.updates).toEqual(expect.arrayContaining([
      {
        table: maintenanceLogs,
        values: {
          aiVerificationStatus: "verified",
          verificationTier: "photo_verified",
        },
      },
      {
        table: taskCompletions,
        values: {
          aiVerificationStatus: "verified",
          verificationTier: "photo_verified",
        },
      },
      {
        table: invoiceAnalyses,
        values: { aiVerificationStatus: "verified" },
      },
    ]));
  });

  it("rejects to self-reported and synchronizes the linked records", async () => {
    const fake = makeReviewDb(linkedSources);

    await recordMaintenanceEvidenceReview(fake.db, {
      sourceType: "maintenance",
      sourceId: "log-1",
      decision: "reject",
      reviewerId: "admin-1",
      reviewerEmail: "admin@example.com",
    });

    expect(fake.inserts[0]).toMatchObject({
      decision: "reject",
      resultingAiVerificationStatus: "rejected",
      resultingVerificationTier: "self_reported",
    });
    expect(fake.updates).toEqual(expect.arrayContaining([
      {
        table: maintenanceLogs,
        values: {
          aiVerificationStatus: "rejected",
          verificationTier: "self_reported",
        },
      },
      {
        table: taskCompletions,
        values: {
          aiVerificationStatus: "rejected",
          verificationTier: "self_reported",
        },
      },
    ]));
  });

  it("records an admin-only information request without changing automated state", async () => {
    const fake = makeReviewDb(linkedSources);

    await recordMaintenanceEvidenceReview(fake.db, {
      sourceType: "maintenance",
      sourceId: "log-1",
      decision: "request_more_info",
      notes: "Need the uncropped after photo.",
      reviewerId: "admin-1",
      reviewerEmail: "admin@example.com",
    });

    expect(fake.inserts[0]).toMatchObject({
      decision: "request_more_info",
      notes: "Need the uncropped after photo.",
      resultingAiVerificationStatus: "review_needed",
      resultingVerificationTier: null,
    });
    expect(fake.updates).toEqual([]);
  });

  it("requires a note for an information request", async () => {
    const fake = makeReviewDb(linkedSources);

    await expect(recordMaintenanceEvidenceReview(fake.db, {
      sourceType: "maintenance",
      sourceId: "log-1",
      decision: "request_more_info",
      notes: "  ",
      reviewerId: "admin-1",
      reviewerEmail: "admin@example.com",
    })).rejects.toMatchObject({
      status: 400,
      code: "REVIEW_NOTE_REQUIRED",
    });
  });

  it("allows only one final decision when two admins decide concurrently", async () => {
    const fake = makeReviewDb(linkedSources);

    const decisions = await Promise.allSettled([
      recordMaintenanceEvidenceReview(fake.db, {
        sourceType: "maintenance",
        sourceId: "log-1",
        decision: "approve",
        reviewerId: "admin-1",
        reviewerEmail: "admin-one@example.com",
      }),
      recordMaintenanceEvidenceReview(fake.db, {
        sourceType: "maintenance",
        sourceId: "log-1",
        decision: "reject",
        reviewerId: "admin-2",
        reviewerEmail: "admin-two@example.com",
      }),
    ]);

    expect(decisions.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const rejected = decisions.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(rejected?.reason).toMatchObject({
      status: 409,
      code: "REVIEW_ITEM_ALREADY_RESOLVED",
    });
    expect(fake.inserts).toHaveLength(1);
  });
});

describe("resubmitMaintenanceEvidence", () => {
  it("requires a review-needed owned source and appends evidence without changing review status or tier", async () => {
    const fake = makeReviewDb({
      log: { ...linkedSources.log, homeownerId: "owner-1", beforePhotoUrls: ["/public/original-before.jpg"], afterPhotoUrls: [], receiptUrls: [] },
      analyses: [{ ...linkedSources.analyses[0], homeownerId: "owner-1", beforePhotoUrls: [], afterPhotoUrls: [], receiptUrls: [] }],
      completions: [{ ...linkedSources.completions[0], documentsUploaded: 1 }],
    });

    await resubmitMaintenanceEvidence(fake.db, {
      sourceType: "maintenance",
      sourceId: "log-1",
      homeownerId: "owner-1",
      beforeUrls: ["/public/new-before.jpg"],
      afterUrls: ["/public/new-after.jpg"],
      receiptUrls: ["/public/new-receipt.pdf"],
      beforeHashes: ["c".repeat(64)],
      afterHashes: ["d".repeat(64)],
      receiptHashes: ["e".repeat(64)],
    });

    const logUpdate = fake.updates.find((update) => update.table === maintenanceLogs)?.values;
    const invoiceUpdate = fake.updates.find((update) => update.table === invoiceAnalyses)?.values;
    const taskUpdate = fake.updates.find((update) => update.table === taskCompletions)?.values;
    expect(logUpdate).toMatchObject({
      beforePhotoUrls: ["/public/original-before.jpg", "/public/new-before.jpg"],
      afterPhotoUrls: ["/public/new-after.jpg"],
      verificationReasonCodes: expect.arrayContaining(["homeowner_resubmitted_evidence"]),
    });
    expect(invoiceUpdate).toMatchObject({ receiptUrls: ["/public/new-receipt.pdf"] });
    expect(taskUpdate).toMatchObject({ documentsUploaded: 4 });
    expect(logUpdate).not.toHaveProperty("aiVerificationStatus");
    expect(logUpdate).not.toHaveProperty("verificationTier");
  });

  it("does not allow a different homeowner to append evidence", async () => {
    const fake = makeReviewDb({ log: { ...linkedSources.log, homeownerId: "owner-1" } });
    await expect(resubmitMaintenanceEvidence(fake.db, {
      sourceType: "maintenance", sourceId: "log-1", homeownerId: "owner-2",
      beforeUrls: [], afterUrls: ["/public/new.jpg"], receiptUrls: [],
      beforeHashes: [], afterHashes: ["d".repeat(64)], receiptHashes: [],
    })).rejects.toMatchObject({ status: 404, code: "EVIDENCE_REQUEST_NOT_FOUND" });
  });
});

describe("getResolvedHumanReviewForInvoice", () => {
  it("finds a final decision recorded against another invoice in the same task-linked group", async () => {
    const fake = makeReviewDb({
      analyses: [
        {
          id: "analysis-b",
          taskCompletionId: "shared-task",
          maintenanceLogId: null,
        },
        {
          id: "analysis-a",
          taskCompletionId: "shared-task",
          maintenanceLogId: null,
        },
      ],
      reviews: [{
        id: "review-a",
        invoiceAnalysisId: "analysis-a",
        taskCompletionId: "shared-task",
        decision: "approve",
        createdAt: new Date("2026-08-29T12:00:00Z"),
      }],
    });

    const review = await getResolvedHumanReviewForInvoice(
      fake.db,
      "analysis-b",
    );

    expect(review).toMatchObject({
      id: "review-a",
      decision: "approve",
    });
  });
});