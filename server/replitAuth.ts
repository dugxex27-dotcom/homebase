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

// FIX 2: Hostname normalization helper
function normalizeHostname(hostname: string, configuredDomains: string[]): string {
  // Remove port numbers and hash segments
  const cleanHost = hostname.split(':')[0].split('#')[0];
  
  // Check if it matches a configured domain
  for (const domain of configuredDomains) {
    if (cleanHost === domain || cleanHost.endsWith('.' + domain)) {
      return domain;
    }
  }
  
  // Fallback to first configured domain
  console.warn('[AUTH] Unknown hostname:', cleanHost, '- falling back to:', configuredDomains[0]);
  return configuredDomains[0];
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
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

  // Keep track of registered strategies
  const registeredStrategies = new Set<string>();

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
    return next();
  }

  // Check OAuth authentication
  const user = req.user as any;
  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
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
  return async (req: any, res, next) => {
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
export const requirePropertyOwner: RequestHandler = async (req: any, res, next) => {
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

declare global {
  var pendingUserRole: string | undefined;
}