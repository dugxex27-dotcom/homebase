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
  } else {
    // New user defaults
    userData.role = (global as any).pendingUserRole || 'homeowner';
    userData.zipCode = null;
  }

  await storage.upsertUser(userData);
  
  // Clear the pending role
  delete (global as any).pendingUserRole;
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

  // Only set up OAuth strategies if REPLIT_DOMAINS is available
  if (process.env.REPLIT_DOMAINS) {
    for (const domain of process.env.REPLIT_DOMAINS.split(",")) {
      const strategy = new Strategy(
        {
          name: `replitauth:${domain}`,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify,
      );
      passport.use(strategy);
    }
  }

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  app.get("/api/login", (req, res, next) => {
    // If no OAuth is configured, redirect to signin page for demo login
    if (!process.env.REPLIT_DOMAINS) {
      return res.redirect("/signin");
    }
    passport.authenticate(`replitauth:${req.hostname}`, {
      prompt: "login consent", 
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    // If no OAuth is configured, redirect to signin page
    if (!process.env.REPLIT_DOMAINS) {
      return res.redirect("/signin");
    }
    passport.authenticate(`replitauth:${req.hostname}`, async (err: any, user: any) => {
      if (err || !user) {
        return res.redirect("/signin");
      }
      
      try {
        // Get the full user record from storage
        const userId = user.claims?.sub;
        if (!userId) {
          return res.redirect("/signin");
        }
        
        const fullUser = await storage.getUser(userId);
        if (!fullUser) {
          return res.redirect("/signin");
        }
        
        // Create session in the same format as email/password login
        (req.session as any).isAuthenticated = true;
        (req.session as any).user = fullUser;
        
        // Save session before redirecting
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.redirect("/signin");
          }
          
          // Check if user needs to complete profile (add zip code)
          if (!fullUser.zipCode) {
            return res.redirect("/complete-profile");
          }
          
          // Redirect to appropriate dashboard based on role
          const redirectPath = fullUser.role === 'contractor' 
            ? '/contractor-dashboard' 
            : '/';
          res.redirect(redirectPath);
        });
      } catch (error) {
        console.error("OAuth callback error:", error);
        res.redirect("/signin");
      }
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect("/signin");
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // Check session-based authentication (email/password login)
  if (req.session?.isAuthenticated && req.session?.user) {
    return next();
  }

  // Check passport user (Google OAuth login)
  if (req.user) {
    // Sync passport user to session format for consistent access
    const userId = (req.user as any).id || (req.user as any).claims?.sub;
    if (userId) {
      const fullUser = await storage.getUser(userId);
      if (fullUser) {
        req.session.isAuthenticated = true;
        req.session.user = fullUser;
        return next();
      }
    }
  }

  return res.status(401).json({ message: "Unauthorized" });
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