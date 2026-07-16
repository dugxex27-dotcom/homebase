import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";

// Only require REPLIT_DOMAINS in production
if (!process.env.REPLIT_DOMAINS && process.env.NODE_ENV === 'production') {
  throw new Error("Environment variable REPLIT_DOMAINS not provided");
}

const getOidcConfig = memoize(
  async () => {
    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: 'none' as const,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  // Check if user already exists to preserve existing data
  const existingUser = await storage.getUser(claims["sub"]);
  
  const userData: any = {
    id: claims["sub"],
    email: claims["email"] || existingUser?.email,
    firstName: claims["first_name"] || existingUser?.firstName,
    lastName: claims["last_name"] || existingUser?.lastName,
    profileImageUrl: claims["profile_image_url"] || existingUser?.profileImageUrl,
  };

  // Preserve existing fields that aren't in OAuth claims
  if (existingUser) {
    userData.role = existingUser.role;
    userData.zipCode = existingUser.zipCode;
    userData.companyId = existingUser.companyId;
    userData.companyRole = existingUser.companyRole;
    userData.passwordHash = existingUser.passwordHash;
    userData.isPremium = existingUser.isPremium;
    userData.trialEndsAt = existingUser.trialEndsAt;
    userData.subscriptionStatus = existingUser.subscriptionStatus;
    userData.maxHousesAllowed = existingUser.maxHousesAllowed;
  } else {
    // New user defaults - give all new users a 14-day trial
    userData.role = (global as any).pendingUserRole || 'homeowner';
    userData.zipCode = null;
    userData.trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now
    userData.subscriptionStatus = 'trialing';
    userData.maxHousesAllowed = userData.role === 'homeowner' ? 2 : undefined; // Base plan: 2 houses during trial
  }

  await storage.upsertUser(userData);
  
  // Clear the pending role
  delete (global as any).pendingUserRole;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  
  // Store session parser for WebSocket authentication
  const sessionParser = getSession();
  app.set('sessionParser', sessionParser);
  app.use(sessionParser);
  
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    const user = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };


  // Get all configured domains
  const domains = process.env.REPLIT_DOMAINS?.split(',') || [];
  console.log('[AUTH] Configured domains:', domains);
  
  // Register a strategy for each domain
  for (const domain of domains) {
    const strategyName = `replitauth:${domain.trim()}`;
    const callbackURL = `https://${domain.trim()}/api/callback`;
    console.log('[AUTH] Pre-registering strategy for domain:', domain.trim(), 'with callback:', callbackURL);
    
    const strategy = new Strategy(
      {
        name: strategyName,
        config,
        scope: "openid email profile offline_access",
        callbackURL: callbackURL,
      },
      verify,
    );
    passport.use(strategy);
    console.log('[AUTH] Strategy pre-registered:', strategyName);
  }
  
  // Helper function to get strategy for a domain
  const getStrategyName = (hostname: string) => {
    // Find matching domain from configured domains
    const matchedDomain = domains.find(d => d.trim() === hostname);
    if (matchedDomain) {
      return `replitauth:${matchedDomain.trim()}`;
    }
    // Fallback to hostname
    console.warn('[AUTH] No pre-registered domain for hostname:', hostname);
    return `replitauth:${hostname}`;
  };

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    console.log('[OAUTH] /api/login called');
    console.log('[OAUTH] Hostname:', req.hostname);
    console.log('[OAUTH] Protocol:', req.protocol);
    
    const strategyName = getStrategyName(req.hostname);
    console.log('[OAUTH] Using strategy:', strategyName);
    
    passport.authenticate(strategyName, {
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    console.log('[OAUTH] ========= CALLBACK RECEIVED =========');
    console.log('[OAUTH] Callback hostname:', req.hostname);
    console.log('[OAUTH] Callback query:', JSON.stringify(req.query, null, 2));
    console.log('[OAUTH] Callback session ID:', req.sessionID);
    
    if (req.query.error) {
      console.error('[OAUTH] OAuth error:', req.query.error);
      console.error('[OAUTH] Error description:', req.query.error_description);
      return res.redirect('/signin?error=oauth-failed');
    }
    
    const strategyName = getStrategyName(req.hostname);
    console.log('[OAUTH] Using callback strategy:', strategyName);
    
    passport.authenticate(strategyName, {
      successReturnToOrRedirect: "/",
      failureRedirect: "/signin?error=callback-failed",
    })(req, res, next);
  });

  app.get("/api/logout", async (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Check session-based authentication (email/password login)
  if (req.session?.isAuthenticated && req.session?.user) {
    // Detect suspension after a server restart (cold cache). getUserStatusCached
    // falls through to the DB when the in-memory cache has been evicted, so a
    // suspended user is blocked on the very next request even with a valid session.
    const userId: string = req.session.user.id;
    const status = await getUserStatusCached(userId);
    if (status !== null && ['suspended', 'removed', 'pending_invite'].includes(status)) {
      return res.status(401).json({ message: "Account suspended. Contact your company administrator." });
    }
    return next();
  }

  // Check OAuth authentication
  const user = req.user as any;
  const isOAuthAuthenticated = typeof req.isAuthenticated === 'function' && req.isAuthenticated();
  if (!isOAuthAuthenticated || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Block suspended OAuth users before any token refresh is attempted.
  const oauthUserId: string | undefined = user?.claims?.sub;
  if (oauthUserId && suspendedUserIds.has(oauthUserId)) {
    return res.status(401).json({ message: "Account suspended. Contact your company administrator." });
  }

  // Check if token is expired
  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  // Try to refresh the token
  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

// Role-based authorization middleware
export const requireRole = (role: 'homeowner' | 'contractor'): RequestHandler => {
  return async (req: any, res: any, next: any) => {
    // Check if user is authenticated via session
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = req.session.user;
    
    if (!user || user.role !== role) {
      return res.status(403).json({ message: "Forbidden - insufficient permissions" });
    }

    next();
  };
};

// ─── Enterprise contractor role helpers ───────────────────────────────────────

// ─── LRU cache implementation ─────────────────────────────────────────────────

const SUSPENSION_RECHECK_TTL_MS = 5 * 60 * 1000;
const ACTIVE_STATUS_TTL_MS = 2 * 60 * 1000;

// Bounded blocklist: combines TTL expiry with an LRU size cap so the structure
// cannot grow without bound on long-running servers.
//
// - Size cap: when the map reaches maxSize the oldest (LRU) entry is evicted,
//   mirroring the 5000-entry cap on `userStatusCache`.
// - TTL: entries expire after ttlMs ms; .has() evicts them lazily.  If the
//   user is still suspended the downstream DB check re-adds them; if they have
//   been reactivated they pass through.
// - Explicit .delete() on reactivation still provides instant removal, same
//   as the old Set-based approach.
class TtlSet {
  private readonly _map = new Map<string, number>(); // key → expiresAt (ms)
  private readonly _ttlMs: number;
  private readonly _maxSize: number;

  constructor(ttlMs: number, maxSize: number = 5000) {
    this._ttlMs = ttlMs;
    this._maxSize = maxSize;
  }

  get size(): number {
    return this._map.size;
  }

  has(key: string): boolean {
    const expiresAt = this._map.get(key);
    if (expiresAt === undefined) return false;
    if (Date.now() > expiresAt) {
      this._map.delete(key);
      return false;
    }
    return true;
  }

  add(key: string): this {
    if (this._map.has(key)) {
      // Refresh TTL: remove first so the re-insertion moves it to the end
      // (Map iteration is insertion-ordered, so oldest = first key).
      this._map.delete(key);
    } else if (this._map.size >= this._maxSize) {
      // Evict the oldest (LRU) entry to stay within the size cap.
      const oldest = this._map.keys().next().value;
      if (oldest !== undefined) this._map.delete(oldest);
    }
    this._map.set(key, Date.now() + this._ttlMs);
    return this;
  }

  delete(key: string): boolean {
    return this._map.delete(key);
  }

  clear(): void {
    this._map.clear();
  }
}

export const suspendedUserIds = new TtlSet(SUSPENSION_RECHECK_TTL_MS, 5000);

// ─── LRU cache ────────────────────────────────────────────────────────────────

class LruCache<K, V> {
  map: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
    this.map = new Map();
  }

  set(key: K, value: V): void {
    if (this.map.has(key)) {
      this.map.delete(key);
    } else if (this.map.size >= this.maxSize) {
      this.map.delete(this.map.keys().next().value!);
    }
    this.map.set(key, value);
  }

  get(key: K): V | undefined {
    if (!this.map.has(key)) return undefined;
    const value = this.map.get(key)!;
    this.map.delete(key);
    this.map.set(key, value);
    return value;
  }

  delete(key: K): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }
}

interface StatusCacheEntry {
  status: string;
  expiresAt: number;
}

const USER_STATUS_TTL_MS = 30_000;
const ACTIVE_ACCOUNT_FRESH_TTL_MS = 30_000;

export const userStatusCache = new LruCache<string, StatusCacheEntry>(5000);
export const activeStatusCache = new Map<string, StatusCacheEntry>();
const suspensionRecheckCache = new Map<string, number>();
const _revocationCache = new Map<string, StatusCacheEntry>();

export function evictStatusCache(userId: string): void {
  userStatusCache.delete(userId);
}

export function invalidateActiveStatusCache(userId?: string): void {
  if (userId !== undefined) {
    activeStatusCache.delete(userId);
  } else {
    activeStatusCache.clear();
  }
}

export function __resetSuspensionRecheckCacheForTests(): void {
  suspensionRecheckCache.clear();
  userStatusCache.clear();
  _revocationCache.clear();
}

export async function seedSuspendedUserIds(
  log?: { info: (...args: any[]) => void; warn: (...args: any[]) => void },
): Promise<void> {
  try {
    const { db } = await import('./db');
    const { users } = await import('@workspace/db');
    const { inArray } = await import('drizzle-orm');
    const rows = await db
      .select({ id: (users as any).id })
      .from(users)
      .where(inArray((users as any).status, ['suspended', 'removed']));
    for (const row of (rows as any[])) {
      suspendedUserIds.add(row.id);
    }
    if (log) {
      log.info({ count: rows.length }, `Pre-populated suspendedUserIds with ${rows.length} suspended/removed users`);
    }
  } catch (err) {
    if (log) log.warn({ err }, 'seedSuspendedUserIds: DB query failed');
  }
}

/**
 * Check whether a user (identified by id, usually an OAuth sub claim) is
 * suspended or removed. Consults the in-memory blocklist first, then falls
 * back to a TTL-bound DB re-check via userStatusCache.
 */
export async function isOAuthUserSuspended(userId: string): Promise<boolean> {
  if (suspendedUserIds.has(userId)) return true;

  const now = Date.now();
  const cached = userStatusCache.get(userId);
  if (cached && cached.expiresAt > now) {
    return ['suspended', 'removed'].includes(cached.status);
  }

  try {
    const { db: dbInst } = await import('./db');
    const { users: usersTable } = await import('@workspace/db');
    const { eq: eqFn } = await import('drizzle-orm');
    const rows = await dbInst
      .select({ status: usersTable.status })
      .from(usersTable)
      .where(eqFn(usersTable.id, userId))
      .limit(1);
    const status = rows[0]?.status ?? 'active';
    userStatusCache.set(userId, { status, expiresAt: now + SUSPENSION_RECHECK_TTL_MS });
    const isSuspended = ['suspended', 'removed'].includes(status);
    if (isSuspended) suspendedUserIds.add(userId);
    return isSuspended;
  } catch {
    return false; // fail open
  }
}

async function getUserStatusCached(userId: string): Promise<string | null> {
  const cached = userStatusCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) return cached.status;
  try {
    const { db } = await import('./db');
    const { users } = await import('@workspace/db');
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select({ status: (users as any).status })
      .from(users)
      .where(eq((users as any).id, userId))
      .limit(1);
    const status = (rows[0] as any)?.status ?? 'removed';
    userStatusCache.set(userId, { status, expiresAt: Date.now() + USER_STATUS_TTL_MS });
    return status;
  } catch {
    return null;
  }
}

async function recheckSuspensionFromDb(userId: string): Promise<boolean> {
  const expiresAt = suspensionRecheckCache.get(userId);
  if (expiresAt !== undefined && expiresAt > Date.now()) return false;
  try {
    const { db } = await import('./db');
    const { users } = await import('@workspace/db');
    const { eq } = await import('drizzle-orm');
    const rows = await db
      .select({ status: (users as any).status })
      .from(users)
      .where(eq((users as any).id, userId))
      .limit(1);
    const status = (rows[0] as any)?.status ?? 'active';
    const blocked = ['suspended', 'removed', 'pending_invite'].includes(status);
    if (blocked) {
      suspendedUserIds.add(userId);
      return true;
    }
    suspensionRecheckCache.set(userId, Date.now() + SUSPENSION_RECHECK_TTL_MS);
    return false;
  } catch {
    return false;
  }
}

export function invalidateUserSessions(
  sessionStore: any,
  userId: string,
  log?: { warn: (...args: any[]) => void; info?: (...args: any[]) => void },
): void {
  if (!sessionStore || typeof sessionStore.all !== 'function') return;
  sessionStore.all((err: any, sessions: Record<string, any> | null) => {
    if (err || !sessions) return;
    for (const [sid, sess] of Object.entries(sessions)) {
      if (sess?.user?.id !== userId) continue;
      sessionStore.destroy(sid, (destroyErr: any) => {
        if (destroyErr) {
          if (log) log.warn(`Failed to destroy session ${sid} for user ${userId}`, destroyErr);
        } else {
          if (log?.info) log.info(`Destroyed session ${sid} for user ${userId}`);
        }
      });
    }
  });
}

/**
 * Middleware factory: performs a short-TTL DB status re-check on every request
 * to close the stale-session window (suspended/removed/pending_invite users
 * whose session cookie still says "active").
 */
export const requireActiveAccountFresh = (): RequestHandler => {
  return async (req: any, res, next): Promise<void> => {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    const userId: string = req.session.user.id;
    const now = Date.now();

    // Check activeStatusCache first (short-TTL)
    const cached = activeStatusCache.get(userId);
    if (cached && cached.expiresAt > now) {
      if (['suspended', 'removed', 'pending_invite'].includes(cached.status)) {
        return void res.status(403).json({ message: "Account suspended. Contact your company administrator." });
      }
      return next();
    }

    // Fresh DB check
    try {
      const { db: dbInst } = await import('./db');
      const { users: usersTable } = await import('@workspace/db');
      const { eq: eqFn } = await import('drizzle-orm');
      const rows = await dbInst
        .select({ status: usersTable.status })
        .from(usersTable)
        .where(eqFn(usersTable.id, userId))
        .limit(1);
      const status = rows[0]?.status ?? 'removed';
      activeStatusCache.set(userId, { status, expiresAt: now + ACTIVE_STATUS_TTL_MS });

      if (['suspended', 'removed', 'pending_invite'].includes(status)) {
        suspendedUserIds.add(userId);
        try { req.session.destroy?.(); } catch {}
        return void res.status(403).json({ message: "Account suspended. Contact your company administrator." });
      }

      next();
    } catch {
      // Fail open — the existing session guard still applies
      next();
    }
  };
};

// Check that the session user's companyRole is one of the allowed roles.
// Accepts any role value including the Phase 2 additions: 'manager' | 'dispatcher'.
export const requireCompanyRole = (...roles: string[]): RequestHandler => {
  return (req: any, res: any, next: any) => {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const user = req.session.user;
    if (!roles.includes(user.companyRole)) {
      return res.status(403).json({ message: "Forbidden - insufficient company role" });
    }
    next();
  };
};

// Shorthand factory — use instead of requireCompanyRole when the allowed set is defined
// at the call site (avoids spreading arrays in every route definition).
// Examples:
//   requireCompanyRoleAny('owner','admin','manager')  — division-level actions
//   requireCompanyRoleAny('owner','admin','dispatcher') — job assignment actions
export const requireCompanyRoleAny = (...roles: string[]): RequestHandler =>
  requireCompanyRole(...roles);

// Scopes manager-role requests to their assigned division.
// Attaches req.divisionFilter (string | undefined) for downstream query filtering.
// Non-manager roles pass through unfiltered.
export const requireDivisionAccess = (req: any, res: any, next: any) => {
  if (!req.session?.isAuthenticated || !req.session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  if (req.session.user.companyRole === 'manager') {
    const divisionId = req.session.user.divisionId;
    if (!divisionId) {
      return res.status(403).json({ code: 'NO_DIVISION_ASSIGNED', message: 'Manager has no division assigned' });
    }
    req.divisionFilter = divisionId;
  }
  next();
};

// Gates routes that require the Business/Enterprise bulk-import feature.
export const requireBulkImport = async (req: any, res: any, next: any) => {
  if (!req.session?.isAuthenticated || !req.session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const companyId = req.session.user.companyId;
  if (!companyId) return res.status(403).json({ code: 'BULK_IMPORT_NOT_AVAILABLE' });
  try {
    const { storage } = await import('./storage');
    const company = await (storage as any).getCompany(companyId);
    const allowed =
      company?.bulkImportEnabled === true ||
      ['contractor_business', 'contractor_enterprise'].includes(company?.tier ?? '');
    if (!allowed) return res.status(403).json({ code: 'BULK_IMPORT_NOT_AVAILABLE' });
    next();
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Gates routes that require the Enterprise API-access feature.
export const requireApiAccess = async (req: any, res: any, next: any) => {
  if (!req.session?.isAuthenticated || !req.session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  const companyId = req.session.user.companyId;
  if (!companyId) return res.status(403).json({ code: 'API_ACCESS_NOT_AVAILABLE' });
  try {
    const { storage } = await import('./storage');
    const company = await (storage as any).getCompany(companyId);
    const allowed =
      company?.apiAccessEnabled === true ||
      company?.tier === 'contractor_enterprise';
    if (!allowed) return res.status(403).json({ code: 'API_ACCESS_NOT_AVAILABLE' });
    next();
  } catch {
    return res.status(500).json({ message: 'Internal server error' });
  }
};

// Block suspended users from all authenticated contractor routes
export const requireNotSuspended = (): RequestHandler => {
  return async (req: any, res: any, next: any): Promise<void> => {
    // Resolve the userId from either the session path or the OAuth path.
    let userId: string | undefined;

    if (req.session?.isAuthenticated && req.session?.user) {
      userId = req.session.user.id;
    } else if (
      typeof req.isAuthenticated === 'function' &&
      req.isAuthenticated() &&
      req.user?.claims?.sub
    ) {
      userId = req.user.claims.sub;
    } else {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    if (!userId) {
      return void res.status(401).json({ message: "Unauthorized" });
    }

    // Fast path: in-memory blocklist.
    if (suspendedUserIds.has(userId)) {
      return void res.status(401).json({ message: "Account suspended. Contact your company administrator." });
    }

    // Short-TTL DB-backed status check (catches suspensions made on this instance).
    const status = await getUserStatusCached(userId);
    if (status !== null && ['suspended', 'removed', 'pending_invite'].includes(status)) {
      suspendedUserIds.add(userId);
      return void res.status(401).json({ message: "Account suspended. Contact your company administrator." });
    }

    // Cross-process staleness check: catches suspensions applied on another instance.
    const isSuspended = await recheckSuspensionFromDb(userId);
    if (isSuspended) {
      return void res.status(401).json({ message: "Account suspended. Contact your company administrator." });
    }

    next();
  };
};

// Verify a :userId route param belongs to the same company as the session user
export const requireSameCompany = (): RequestHandler => {
  return async (req: any, res, next) => {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const adminUser = req.session.user;
    const targetId = req.params.userId;
    if (!targetId) return next();
    try {
      const { db } = await import('./db');
      const { users } = await import('@workspace/db');
      const { eq } = await import('drizzle-orm');
      const [target] = await db.select({ companyId: users.companyId })
        .from(users).where(eq(users.id, targetId)).limit(1);
      if (!target || target.companyId !== adminUser.companyId) {
        return res.status(403).json({ message: "Forbidden - different company" });
      }
    } catch {
      return res.status(500).json({ message: "Internal server error" });
    }
    next();
  };
};

// Helper function to validate house ownership
export const validateHouseOwnership = async (houseId: string, userId: string): Promise<boolean> => {
  try {
    const house = await storage.getHouse(houseId);
    return house?.homeownerId === userId;
  } catch {
    return false;
  }
};

// Helper function to validate maintenance log ownership
export const validateMaintenanceLogOwnership = async (logId: string, userId: string): Promise<boolean> => {
  try {
    const log = await storage.getMaintenanceLog(logId);
    return log?.homeownerId === userId;
  } catch {
    return false;
  }
};

// Helper function to validate custom maintenance task ownership
export const validateCustomMaintenanceTaskOwnership = async (taskId: string, userId: string): Promise<boolean> => {
  try {
    const task = await storage.getCustomMaintenanceTask(taskId);
    return task?.homeownerId === userId;
  } catch {
    return false;
  }
};

// Helper function to validate home system ownership
export const validateHomeSystemOwnership = async (systemId: string, userId: string): Promise<boolean> => {
  try {
    const system = await storage.getHomeSystem(systemId);
    // Home systems belong to houses, so we need to check the house ownership
    if (!system?.houseId) return false;
    return await validateHouseOwnership(system.houseId, userId);
  } catch {
    return false;
  }
};

// Middleware that allows both homeowners and contractors access to maintenance features
export const requirePropertyOwner: RequestHandler = async (req: any, res: any, next: any) => {
  // Check if user is authenticated via session
  if (!req.session?.isAuthenticated || !req.session?.user) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.session.user;
  
  // Allow both homeowners and contractors to manage their own properties for maintenance
  if (!user || (user.role !== 'homeowner' && user.role !== 'contractor')) {
    return res.status(403).json({ message: "Forbidden - insufficient permissions" });
  }

  next();
};

// Middleware to validate resource ownership for specific resources
export const requireResourceOwnership = (resourceType: 'house' | 'maintenanceLog' | 'customMaintenanceTask' | 'homeSystem') => {
  return async (req: any, res: any, next: any) => {
    const userId = req.session?.user?.id;
    const resourceId = req.params.id;
    
    if (!userId || !resourceId) {
      return res.status(400).json({ message: "Invalid request" });
    }

    let isOwner = false;
    
    try {
      switch (resourceType) {
        case 'house':
          isOwner = await validateHouseOwnership(resourceId, userId);
          break;
        case 'maintenanceLog':
          isOwner = await validateMaintenanceLogOwnership(resourceId, userId);
          break;
        case 'customMaintenanceTask':
          isOwner = await validateCustomMaintenanceTaskOwnership(resourceId, userId);
          break;
        case 'homeSystem':
          isOwner = await validateHomeSystemOwnership(resourceId, userId);
          break;
      }
    } catch (error) {
      console.error(`Error validating ${resourceType} ownership:`, error);
      return res.status(500).json({ message: "Internal server error" });
    }
    
    if (!isOwner) {
      return res.status(404).json({ message: `${resourceType.charAt(0).toUpperCase() + resourceType.slice(1)} not found` });
    }
    
    next();
  };
};

/**
 * Patches the stored session record(s) for a specific user so that their
 * next request immediately reflects a role change — without requiring them
 * to log out and back in.  Silently no-ops when the store has no `.all`
 * method or when no matching session is found.
 */
export function refreshUserSessionRole(
  store: any,
  userId: string,
  updates: Record<string, unknown>,
  log?: { warn: (...args: unknown[]) => void; info?: (...args: unknown[]) => void },
): void {
  if (!store || typeof store.all !== 'function') return;

  store.all((err: unknown, sessions: Record<string, any> | null) => {
    if (err || !sessions) return;
    for (const [sid, sess] of Object.entries(sessions)) {
      if (sess?.user?.id !== userId) continue;
      const updated = { ...sess, user: { ...sess.user, ...updates } };
      store.set(sid, updated, (setErr: unknown) => {
        if (setErr && log) {
          log.warn('[refreshUserSessionRole] Failed to persist session patch', setErr);
        }
      });
    }
  });
}
