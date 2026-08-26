import type { RequestHandler } from "express";
import { and, desc, eq } from "drizzle-orm";
import { errorBreadcrumbs, errorLogs, searchAnalytics, users } from "@workspace/db";
import { db } from "./db";
import { storage } from "./storage";

export const QA_ADMIN_READONLY_SCOPE = "admin_readonly";

const QA_MUTATION_ALLOWLIST = new Set([
  "/analytics/search",
  "/analytics/track",
  "/errors",
]);

type QaSessionUser = {
  id: string;
  isQaAccount: boolean;
  qaAccessScopes: string[] | null;
};

export function getAuthenticatedDatabaseUserId(req: any): string | null {
  const sessionUserId = req.session?.isAuthenticated ? req.session?.user?.id : null;
  if (typeof sessionUserId === "string" && sessionUserId) return sessionUserId;

  // Replit OIDC is Passport-backed. user.id is the persisted application user
  // ID; claims.sub is provider identity and must not be used after email linking.
  if (typeof req.isAuthenticated === "function" && req.isAuthenticated() && typeof req.user?.id === "string") {
    return req.user.id;
  }

  return null;
}

async function getQaSessionUser(req: any): Promise<QaSessionUser | null> {
  const userId = getAuthenticatedDatabaseUserId(req);
  if (!userId) return null;

  const user = await storage.getUser(userId);
  if (!user?.isQaAccount) return null;

  return {
    id: user.id,
    isQaAccount: user.isQaAccount,
    qaAccessScopes: user.qaAccessScopes ?? [],
  };
}

export async function isQaAccountUserId(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  return user?.isQaAccount === true;
}

/**
 * True for QA fixtures AND public-facing demo accounts. Demo accounts stay
 * fully interactive in-app (unlike QA, they are not mutation-blocked or
 * admin-denied — see blockQaOperationalMutations/requireAdmin), but neither
 * should trigger real outbound email/SMS/push to their synthetic contact
 * info. Use this for notification suppression; use isQaAccountUserId directly
 * where QA-specific access-control semantics are actually intended.
 */
export async function isSyntheticAccountUserId(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  return user?.isQaAccount === true || user?.isDemoAccount === true;
}

export const requireQaAdminReadOnly: RequestHandler = async (req: any, res, next) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    return res.status(405).json({ message: "QA admin access is read-only" });
  }

  try {
    const user = await getQaSessionUser(req);
    if (!user?.qaAccessScopes?.includes(QA_ADMIN_READONLY_SCOPE)) {
      return res.status(403).json({ message: "QA admin access required" });
    }
    return next();
  } catch (error) {
    req.log?.error({ err: error }, "Failed to evaluate QA admin access");
    return res.status(500).json({ message: "Failed to evaluate QA admin access" });
  }
};

/**
 * QA personas are intentionally read-only. The analytics/error capture writes
 * below are the only permitted mutations, so their QA behavior can be verified
 * while every operational, billing, communication, and admin mutation is denied.
 */
export const blockQaOperationalMutations: RequestHandler = async (req: any, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  try {
    const user = await getQaSessionUser(req);
    if (!user) return next();

    if (QA_MUTATION_ALLOWLIST.has(req.path)) return next();

    return res.status(403).json({
      message: "QA accounts are read-only and cannot perform operational actions",
      code: "QA_READ_ONLY_ACCOUNT",
    });
  } catch (error) {
    req.log?.error({ err: error }, "Failed to evaluate QA mutation policy");
    return res.status(500).json({ message: "Failed to evaluate QA account policy" });
  }
};

export async function getQaSearchAnalytics(limit = 50) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const rows = await db
    .select({ analytics: searchAnalytics })
    .from(searchAnalytics)
    .innerJoin(users, eq(searchAnalytics.userId, users.id))
    .where(eq(users.isQaAccount, true))
    .orderBy(desc(searchAnalytics.createdAt))
    .limit(safeLimit);

  return rows.map((row) => row.analytics);
}

export async function getQaErrorLogs(limit = 100) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  const rows = await db
    .select({ error: errorLogs })
    .from(errorLogs)
    .innerJoin(users, eq(errorLogs.userId, users.id))
    .where(eq(users.isQaAccount, true))
    .orderBy(desc(errorLogs.createdAt))
    .limit(safeLimit);

  return rows.map((row) => row.error);
}

export async function getQaErrorLogWithBreadcrumbs(id: string) {
  const rows = await db
    .select({ error: errorLogs })
    .from(errorLogs)
    .innerJoin(users, eq(errorLogs.userId, users.id))
    .where(and(eq(errorLogs.id, id), eq(users.isQaAccount, true)))
    .limit(1);

  const error = rows[0]?.error;
  if (!error) return undefined;

  const breadcrumbs = await db
    .select()
    .from(errorBreadcrumbs)
    .where(eq(errorBreadcrumbs.errorLogId, error.id))
    .orderBy(desc(errorBreadcrumbs.timestamp));

  return { ...error, breadcrumbs };
}