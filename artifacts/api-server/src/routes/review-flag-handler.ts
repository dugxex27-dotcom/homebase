import { z } from "zod";
import { insertReviewFlagSchema } from "@workspace/db";
import type { IStorage } from "../storage";

export function isDuplicateReviewFlagError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const databaseError = error as { code?: unknown; constraint?: unknown };
  return databaseError.code === "23505"
    && databaseError.constraint === "UX_review_flags_review_reporter";
}

export async function handleCreateReviewFlag(
  req: any,
  res: any,
  reviewStorage: Pick<IStorage, "getReview" | "createReviewFlag">,
): Promise<any> {
  try {
    const userId = req.session.user.id;
    const reviewId = req.params.id;

    const review = await reviewStorage.getReview(reviewId);
    if (!review) {
      return res.status(404).json({ message: "Review not found" });
    }

    if (review.homeownerId === userId) {
      return res.status(403).json({ message: "You cannot flag your own review" });
    }

    const flagData = insertReviewFlagSchema.parse({
      reviewId,
      reportedBy: userId,
      reason: req.body.reason,
      notes: req.body.notes || null,
      status: "pending",
    });

    const flag = await reviewStorage.createReviewFlag(flagData);
    return res.status(201).json(flag);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid flag data", errors: error.issues });
    }
    if (isDuplicateReviewFlagError(error)) {
      return res.status(409).json({
        message: "You have already flagged this review",
        code: "REVIEW_ALREADY_FLAGGED",
      });
    }
    console.error("Error flagging review:", error);
    return res.status(500).json({ message: "Failed to flag review" });
  }
}