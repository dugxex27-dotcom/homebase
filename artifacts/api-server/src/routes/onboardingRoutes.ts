import type { Express } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { isAuthenticated } from "../replitAuth";
import { db } from "../db";
import { onboardingProgress, users } from "@workspace/db";
import { storage } from "../storage";
import { logger } from "../lib/logger";

export function registerOnboardingRoutes(app: Express): void {
  // ── GET /api/onboarding/progress ─────────────────────────────────────────
  // Returns (or creates) the onboarding progress record for the authed homeowner.
  app.get("/api/onboarding/progress", isAuthenticated, async (req: any, res): Promise<void> => {
    try {
      const userId = req.session?.user?.id as string | undefined;
      if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

      let [progress] = await db
        .select()
        .from(onboardingProgress)
        .where(eq(onboardingProgress.userId, userId));

      if (!progress) {
        [progress] = await db
          .insert(onboardingProgress)
          .values({ userId, currentStep: 2, completedSteps: [], skippedSteps: [], startedAt: new Date() })
          .returning();
      }

      res.json(progress);
    } catch (err) {
      logger.error({ err }, "[onboarding] GET /api/onboarding/progress failed");
      res.status(500).json({ message: "Failed to get onboarding progress" });
    }
  });

  // ── POST /api/onboarding/progress ────────────────────────────────────────
  // Upserts current step and completed/skipped step lists.
  app.post("/api/onboarding/progress", isAuthenticated, async (req: any, res): Promise<void> => {
    try {
      const userId = req.session?.user?.id as string | undefined;
      if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

      const bodySchema = z.object({
        currentStep: z.number().int().min(0).max(12),
        completedSteps: z.array(z.number().int()).optional(),
        skippedSteps: z.array(z.number().int()).optional(),
      });

      const { currentStep, completedSteps, skippedSteps } = bodySchema.parse(req.body);

      const [existing] = await db
        .select({ id: onboardingProgress.id })
        .from(onboardingProgress)
        .where(eq(onboardingProgress.userId, userId));

      let result;
      if (existing) {
        const patch: Record<string, unknown> = { currentStep, updatedAt: new Date() };
        if (completedSteps !== undefined) patch.completedSteps = completedSteps;
        if (skippedSteps !== undefined) patch.skippedSteps = skippedSteps;
        [result] = await db
          .update(onboardingProgress)
          .set(patch)
          .where(eq(onboardingProgress.userId, userId))
          .returning();
      } else {
        [result] = await db
          .insert(onboardingProgress)
          .values({
            userId,
            currentStep,
            completedSteps: completedSteps ?? [],
            skippedSteps: skippedSteps ?? [],
            startedAt: new Date(),
          })
          .returning();
      }

      res.json(result);
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid data", errors: err.errors }); return; }
      logger.error({ err }, "[onboarding] POST /api/onboarding/progress failed");
      res.status(500).json({ message: "Failed to update onboarding progress" });
    }
  });

  // ── POST /api/onboarding/complete ────────────────────────────────────────
  // Stamps completedAt — closes the data-entry phase; spotlight tour follows.
  app.post("/api/onboarding/complete", isAuthenticated, async (req: any, res): Promise<void> => {
    try {
      const userId = req.session?.user?.id as string | undefined;
      if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

      const [existing] = await db
        .select({ id: onboardingProgress.id })
        .from(onboardingProgress)
        .where(eq(onboardingProgress.userId, userId));

      let result;
      if (existing) {
        [result] = await db
          .update(onboardingProgress)
          .set({ completedAt: new Date(), updatedAt: new Date() })
          .where(eq(onboardingProgress.userId, userId))
          .returning();
      } else {
        [result] = await db
          .insert(onboardingProgress)
          .values({
            userId,
            currentStep: 4,
            completedSteps: [2, 3],
            skippedSteps: [],
            startedAt: new Date(),
            completedAt: new Date(),
          })
          .returning();
      }

      res.json(result);
    } catch (err) {
      logger.error({ err }, "[onboarding] POST /api/onboarding/complete failed");
      res.status(500).json({ message: "Failed to complete onboarding" });
    }
  });

  // ── POST /api/onboarding/referral ────────────────────────────────────────
  // Validates and applies a referral code to the current user.
  app.post("/api/onboarding/referral", isAuthenticated, async (req: any, res): Promise<void> => {
    try {
      const userId = req.session?.user?.id as string | undefined;
      if (!userId) { res.status(401).json({ message: "Unauthorized" }); return; }

      const bodySchema = z.object({ code: z.string().trim().min(1) });
      const { code } = bodySchema.parse(req.body);

      const currentUser = await storage.getUser(userId);
      if (!currentUser) { res.status(404).json({ message: "User not found" }); return; }

      if (currentUser.referralCode === code) {
        res.status(400).json({ message: "You cannot use your own referral code" });
        return;
      }

      const referrer = await storage.getUserByReferralCode(code);
      const referrerCompany = referrer ? null : await storage.getCompanyByReferralCode(code);

      if (!referrer && !referrerCompany) {
        res.status(400).json({ message: "Invalid referral code. Double-check and try again." });
        return;
      }

      if (!currentUser.referredBy) {
        await db
          .update(users)
          .set({ referredBy: code, updatedAt: new Date() })
          .where(eq(users.id, userId));
      }

      await db
        .update(onboardingProgress)
        .set({ referralCodeApplied: code, updatedAt: new Date() })
        .where(eq(onboardingProgress.userId, userId));

      const referrerName = referrer
        ? [referrer.firstName, referrer.lastName].filter(Boolean).join(" ") || referrer.email || "a friend"
        : (referrerCompany?.name ?? "a company");

      res.json({ success: true, referrerName });
    } catch (err) {
      if (err instanceof z.ZodError) { res.status(400).json({ message: "Invalid data", errors: err.errors }); return; }
      logger.error({ err }, "[onboarding] POST /api/onboarding/referral failed");
      res.status(500).json({ message: "Failed to apply referral code" });
    }
  });
}
