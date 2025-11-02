import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole, requirePropertyOwner } from "./replitAuth";
import { setupGoogleAuth } from "./googleAuth";
import { z } from "zod";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { insertHomeApplianceSchema, insertHomeApplianceManualSchema, insertMaintenanceLogSchema, insertContractorAppointmentSchema, insertNotificationSchema, insertConversationSchema, insertMessageSchema, insertContractorReviewSchema, insertCustomMaintenanceTaskSchema, insertProposalSchema, insertHomeSystemSchema, insertContractorBoostSchema, insertHouseSchema, insertHouseTransferSchema, insertContractorAnalyticsSchema, insertTaskOverrideSchema, insertCountrySchema, insertRegionSchema, insertClimateZoneSchema, insertRegulatoryBodySchema, insertRegionalMaintenanceTaskSchema, insertTaskCompletionSchema, insertAchievementSchema, insertCompanySchema, insertCompanyInviteCodeSchema } from "@shared/schema";
import pushRoutes from "./push-routes";
import { pushService } from "./push-service";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { pool } from "./db";

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    user?: any;
    isAuthenticated?: boolean;
  }
}

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Temporarily increased for testing
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
});

export async function registerRoutes(app: Express): Promise<Server> {
  // IMMEDIATE TEST: Simple test endpoint to verify routing works
  app.post('/api/test-simple', (req, res) => {
    console.error("===== SIMPLE TEST ENDPOINT CALLED =====");
    res.json({ success: true, message: "Test endpoint works!" });
  });

  // DEBUG: Test endpoint to check what Drizzle returns
  app.get('/api/test-user-data', async (req, res) => {
    try {
      const testUser = await storage.getUser('google_103315263202734374496');
      console.log('[TEST] User from storage:', testUser);
      res.json({
        user: testUser,
        companyId: testUser?.companyId,
        companyRole: testUser?.companyRole,
        hasCompanyIdField: testUser?.hasOwnProperty('companyId'),
        rawKeys: testUser ? Object.keys(testUser) : []
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // CRITICAL TEST: Force login with correct data
  app.get('/api/force-login-test', async (req: any, res) => {
    try {
      const userId = 'google_103315263202734374496';
      const freshUser = await storage.getUser(userId);
      
      if (!freshUser) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Create fresh session with mapped data
      req.session.regenerate((err: any) => {
        if (err) {
          return res.status(500).json({ error: 'Session error' });
        }
        
        req.session.isAuthenticated = true;
        req.session.user = freshUser;
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            return res.status(500).json({ error: 'Save error' });
          }
          
          res.json({
            success: true,
            message: 'Session created with fresh user data',
            companyId: freshUser.companyId,
            companyRole: freshUser.companyRole,
            user: freshUser
          });
        });
      });
    } catch (error) {
      res.status(500).json({ error: String(error) });
    }
  });

  // Set up Replit Auth (handles Google OAuth via Replit)
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      console.log('[AUTH-DEBUG] /api/auth/user called');
      console.log('[AUTH-DEBUG] Session exists:', !!req.session);
      console.log('[AUTH-DEBUG] Session isAuthenticated:', req.session?.isAuthenticated);
      console.log('[AUTH-DEBUG] Session user exists:', !!req.session?.user);
      console.log('[AUTH-DEBUG] Session user id:', req.session?.user?.id);
      console.log('[AUTH-DEBUG] req.user exists:', !!req.user);
      console.log('[AUTH-DEBUG] req.user id:', (req.user as any)?.id);
      
      // Check for session-based authentication (email/password login)
      if (req.session?.isAuthenticated && req.session?.user) {
        // CRITICAL FIX: Fetch fresh user from storage to apply snake_case -> camelCase mapping
        const userId = req.session.user.id;
        console.log('[AUTH-DEBUG] Using session auth, fetching user:', userId);
        const freshUser = await storage.getUser(userId);
        
        if (!freshUser) {
          console.log('[AUTH-DEBUG] User not found in storage:', userId);
          return res.status(401).json({ message: 'Unauthorized' });
        }
        
        // Ensure isPremium is included in the response
        if (!freshUser.hasOwnProperty('isPremium')) {
          (freshUser as any).isPremium = false; // Default for demo users
        }
        
        console.log('[AUTH-DEBUG] Returning session user with companyId:', freshUser.companyId);
        return res.json(freshUser);
      }

      // Check for passport authentication (Google OAuth login)
      if (req.user) {
        const userId = (req.user as any).id || (req.user as any).claims?.sub;
        console.log('[AUTH-DEBUG] Using passport auth, fetching user:', userId);
        if (userId) {
          const fullUser = await storage.getUser(userId);
          console.log('[AUTH-DEBUG] Fetched user companyId:', fullUser?.companyId);
          
          if (fullUser) {
            // Sync to session for consistent access
            req.session.isAuthenticated = true;
            req.session.user = fullUser;
            
            // Ensure isPremium is included
            if (!fullUser.hasOwnProperty('isPremium')) {
              fullUser.isPremium = false;
            }
            console.log('[AUTH-DEBUG] Returning passport user with companyId:', fullUser.companyId);
            return res.json(fullUser);
          }
        }
      }

      // No authentication found
      console.log('[AUTH-DEBUG] No authentication found - returning 401');
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("[AUTH-DEBUG] Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Demo logout
  app.post('/api/auth/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error('Passport logout error:', err);
      }
      req.session.destroy((sessionErr: any) => {
        if (sessionErr) {
          return res.status(500).json({ message: "Could not log out" });
        }
        res.json({ success: true });
      });
    });
  });

  // TEMPORARY: Test login endpoint for debugging OAuth issues
  app.post('/api/auth/test-login', async (req: any, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Create session
      req.session.user = user;
      req.session.isAuthenticated = true;

      await new Promise<void>((resolve, reject) => {
        req.session.save((err: any) => {
          if (err) reject(err);
          else resolve();
        });
      });

      res.json({ success: true, user });
    } catch (error) {
      console.error('Test login failed:', error);
      res.status(500).json({ message: "Test login failed" });
    }
  });

  // GET logout endpoint for direct navigation
  app.get('/api/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.redirect('/?error=logout-failed');
      }
      res.redirect('/');
    });
  });

  // Refresh session data from database (fixes stale sessions)
  app.post('/api/auth/refresh-session', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user?.id) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const freshUser = await storage.getUser(userId);
      
      if (!freshUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update session with fresh data from database
      req.session.user = freshUser;
      
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ message: "Failed to refresh session" });
        }
        console.log(`[SESSION REFRESH] Updated session for ${freshUser.email} with companyId: ${freshUser.companyId}`);
        res.json({ success: true, user: freshUser });
      });
    } catch (error) {
      console.error("Error refreshing session:", error);
      res.status(500).json({ message: "Failed to refresh session" });
    }
  });

  // Generate unique referral code utility function
  function generateUniqueReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Get or create user's referral code
  app.get('/api/user/referral-code', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      let user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user doesn't have a referral code, generate one
      if (!user.referralCode) {
        let newCode = generateUniqueReferralCode();
        let attempts = 0;
        const maxAttempts = 10;

        // Ensure uniqueness by checking against existing codes
        while (attempts < maxAttempts) {
          const existingUser = await storage.getUserByReferralCode?.(newCode);
          if (!existingUser) {
            break; // Code is unique
          }
          newCode = generateUniqueReferralCode();
          attempts++;
        }

        if (attempts >= maxAttempts) {
          return res.status(500).json({ message: "Failed to generate unique referral code" });
        }

        // Update user with new referral code
        user = await storage.upsertUser({
          ...user,
          referralCode: newCode
        });

        // Update session user data
        req.session.user = { ...req.session.user, referralCode: newCode };
      }

      res.json({ 
        referralCode: user.referralCode,
        referralCount: user.referralCount || 0,
        referralLink: `${req.protocol}://${req.get('host')}/?ref=${user.referralCode}`
      });
    } catch (error) {
      console.error("Error getting referral code:", error);
      res.status(500).json({ message: "Failed to get referral code" });
    }
  });

  // Push notification routes
  app.use('/api/push', pushRoutes);

  // File upload routes
  const objectStorageService = new ObjectStorageService();

  // Get upload URL for proposal attachments
  app.post("/api/objects/upload", isAuthenticated, async (req: any, res) => {
    try {
      const { fileType = "proposal" } = req.body;
      const uploadURL = await objectStorageService.getObjectEntityUploadURL(fileType);
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ message: "Failed to get upload URL" });
    }
  });

  // Serve uploaded files
  app.get("/objects/:objectPath(*)", isAuthenticated, async (req: any, res) => {
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error checking object access:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  // Simple homeowner demo login
  app.post('/api/auth/homeowner-demo-login', authLimiter, async (req, res) => {
    try {
      const demoEmail = 'demo@homeowner.com';
      
      // Check if demo user already exists
      let user = await storage.getUserByEmail(demoEmail);
      
      // If not, create demo user
      if (!user) {
        user = await storage.upsertUser({
          id: `demo-homeowner-${Date.now()}`,
          email: demoEmail,
          firstName: 'Demo',
          lastName: 'Homeowner',
          profileImageUrl: null,
          role: 'homeowner'
        });
      }

      // Create a simple session
      req.session.user = user;
      req.session.isAuthenticated = true;

      // Save session explicitly
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json({ success: true, user });
      });
    } catch (error) {
      console.error("Error creating homeowner demo user:", error);
      res.status(500).json({ message: "Failed to create homeowner account" });
    }
  });

  // Simple contractor demo login
  app.post('/api/auth/contractor-demo-login', authLimiter, async (req, res) => {
    try {
      const demoEmail = 'demo@contractor.com';
      
      // Check if demo user already exists
      let user = await storage.getUserByEmail(demoEmail);
      
      // If not, create demo user
      if (!user) {
        user = await storage.upsertUser({
          id: `demo-contractor-${Date.now()}`,
          email: demoEmail,
          firstName: 'Demo',
          lastName: 'Contractor',
          profileImageUrl: null,
          role: 'contractor'
        });
      }

      // Create a simple session
      req.session.user = user;
      req.session.isAuthenticated = true;

      // Save session explicitly
      req.session.save((err: any) => {
        if (err) {
          console.error("Session save error:", err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.json({ success: true, user });
      });
    } catch (error) {
      console.error("Error creating contractor demo user:", error);
      res.status(500).json({ message: "Failed to create contractor account" });
    }
  });

  // Email/password registration
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { 
        email, password, firstName, lastName, role, zipCode, inviteCode,
        companyAction, companyName, companyBio, companyPhone, companyInviteCode 
      } = req.body;
      
      if (!email || !password || !firstName || !lastName || !role || !zipCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate contractor company requirements
      if (role === 'contractor') {
        if (!companyAction) {
          return res.status(400).json({ message: "Contractors must either create or join a company" });
        }
        if (companyAction === 'create' && (!companyName || !companyBio || !companyPhone)) {
          return res.status(400).json({ message: "Company name, bio, and phone are required" });
        }
        if (companyAction === 'join' && !companyInviteCode) {
          return res.status(400).json({ message: "Company invite code is required" });
        }
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      // Check for duplicate email
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "Email already registered" });
      }

      // Validate homeowner invite code if provided
      if (inviteCode && role === 'homeowner') {
        const isValid = await storage.validateAndUseInviteCode(inviteCode);
        if (!isValid) {
          return res.status(400).json({ message: "Invalid or expired invite code" });
        }
      }

      // Validate company invite code BEFORE creating user (if contractor joining)
      let companyToJoin = null;
      if (role === 'contractor' && companyAction === 'join') {
        const invite = await storage.getCompanyInviteCodeByCode(companyInviteCode);
        if (!invite || !invite.isActive || invite.usedBy) {
          return res.status(400).json({ message: "Invalid or already used company invite code" });
        }
        companyToJoin = { invite };
      }

      // Hash password with bcrypt
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user
      let user = await storage.createUserWithPassword({
        email,
        passwordHash,
        firstName,
        lastName,
        role: role as 'homeowner' | 'contractor',
        zipCode
      });

      // Handle contractor company setup
      if (role === 'contractor') {
        if (companyAction === 'create') {
          // Create new company
          const company = await storage.createCompany({
            name: companyName,
            bio: companyBio,
            phone: companyPhone,
            email: email,
            location: zipCode,
            ownerId: user.id,
            services: [],
            licenseNumber: '',
            licenseMunicipality: '',
          });

          // Update user with company info (owners can respond to proposals by default)
          user = await storage.upsertUser({
            ...user,
            companyId: company.id,
            companyRole: 'owner',
            canRespondToProposals: true
          });
        } else if (companyAction === 'join' && companyToJoin) {
          // Update user with company info
          user = await storage.upsertUser({
            ...user,
            companyId: companyToJoin.invite.companyId,
            companyRole: 'employee'
          });

          // Mark invite code as used
          await storage.updateCompanyInviteCode(companyToJoin.invite.id, {
            ...companyToJoin.invite,
            usedBy: user.id,
            usedAt: new Date(),
            isActive: false
          });
        }
      }

      // Create session
      req.session.user = user;
      req.session.isAuthenticated = true;

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Email/password login
  app.post('/api/auth/login', authLimiter, async (req, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.passwordHash) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      req.session.user = user;
      req.session.isAuthenticated = true;

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Complete profile for OAuth users
  app.post('/api/auth/complete-profile', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { 
        zipCode, role, 
        companyAction, companyName, companyBio, companyPhone, companyInviteCode 
      } = req.body;
      
      if (!zipCode || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate contractor company requirements
      if (role === 'contractor') {
        if (!companyAction) {
          return res.status(400).json({ message: "Contractors must either create or join a company" });
        }
        if (companyAction === 'create' && (!companyName || !companyBio || !companyPhone)) {
          return res.status(400).json({ message: "Company name, bio, and phone are required" });
        }
        if (companyAction === 'join' && !companyInviteCode) {
          return res.status(400).json({ message: "Company invite code is required" });
        }
      }

      const userId = req.session.user.id;
      let currentUser = await storage.getUser(userId);
      
      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Update user with zip code and role
      currentUser = await storage.upsertUser({
        ...currentUser,
        zipCode,
        role: role as 'homeowner' | 'contractor'
      });

      // Handle contractor company setup
      if (role === 'contractor') {
        if (companyAction === 'create') {
          // Create new company
          const company = await storage.createCompany({
            name: companyName,
            bio: companyBio,
            phone: companyPhone,
            email: currentUser.email,
            location: zipCode,
            ownerId: currentUser.id,
            services: [],
            licenseNumber: '',
            licenseMunicipality: '',
          });

          // Update user with company info (owners can respond to proposals by default)
          currentUser = await storage.upsertUser({
            ...currentUser,
            companyId: company.id,
            companyRole: 'owner',
            canRespondToProposals: true
          });
        } else if (companyAction === 'join') {
          // Validate company invite code
          const invite = await storage.getCompanyInviteCodeByCode(companyInviteCode);
          if (!invite || !invite.isActive || invite.usedBy) {
            return res.status(400).json({ message: "Invalid or already used company invite code" });
          }

          // Update user with company info
          currentUser = await storage.upsertUser({
            ...currentUser,
            companyId: invite.companyId,
            companyRole: 'employee'
          });

          // Mark invite code as used
          await storage.updateCompanyInviteCode(invite.id, {
            ...invite,
            usedBy: currentUser.id,
            usedAt: new Date(),
            isActive: false
          });
        }
      }

      // Update session
      req.session.user = currentUser;

      res.json({ success: true, role: currentUser.role });
    } catch (error) {
      console.error("Error completing profile:", error);
      res.status(500).json({ message: "Failed to complete profile" });
    }
  });

  // Admin middleware
  const requireAdmin: any = (req: any, res: any, next: any) => {
    if (!req.session?.isAuthenticated || !req.session?.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
    if (!adminEmails.includes(req.session.user.email)) {
      return res.status(403).json({ message: "Forbidden - admin access required" });
    }

    next();
  };

  // Serve public object storage files
  app.get('/public/*', async (req, res) => {
    try {
      const filePath = req.path.replace('/public/', ''); // Remove /public/ prefix
      const objectStorage = new ObjectStorageService();
      
      const file = await objectStorage.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
      
      await objectStorage.downloadObject(file, res);
    } catch (error) {
      console.error("Error serving public file:", error);
      res.status(500).json({ message: "Failed to serve file" });
    }
  });

  // Image upload endpoint for contractor profiles
  app.post('/api/upload/image', isAuthenticated, async (req: any, res) => {
    try {
      console.log('[IMAGE UPLOAD] Request received');
      console.log('[IMAGE UPLOAD] Body keys:', Object.keys(req.body));
      console.log('[IMAGE UPLOAD] Type:', req.body.type);
      console.log('[IMAGE UPLOAD] ImageData length:', req.body.imageData?.length);
      
      const { imageData, type } = req.body; // imageData is base64, type is 'logo' or 'photo'
      
      if (!imageData || !type) {
        console.log('[IMAGE UPLOAD] Missing data - imageData:', !!imageData, 'type:', !!type);
        return res.status(400).json({ message: "Missing imageData or type" });
      }

      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      console.log('[IMAGE UPLOAD] Buffer size:', buffer.length);
      
      // Generate unique filename
      const fileExtension = imageData.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `public/contractor-images/${type}s/${filename}`;
      
      console.log('[IMAGE UPLOAD] Uploading to path:', path);
      
      // Upload to object storage
      const objectStorage = new ObjectStorageService();
      await objectStorage.uploadFile(path, buffer, `image/${fileExtension}`);
      
      // Return public URL
      const url = `/public/contractor-images/${type}s/${filename}`;
      console.log('[IMAGE UPLOAD] Upload successful, URL:', url);
      res.json({ url });
    } catch (error) {
      console.error("[IMAGE UPLOAD] Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // DIRECT endpoint - works with email, no session needed
  app.post('/api/contractor/upload-logo', async (req: any, res) => {
    try {
      console.log('[UPLOAD-LOGO] Request received');
      console.log('[UPLOAD-LOGO] Body keys:', Object.keys(req.body));
      
      const { imageData, email } = req.body;
      
      if (!imageData) {
        console.log('[UPLOAD-LOGO] Missing imageData');
        return res.status(400).json({ message: "Missing imageData" });
      }
      
      if (!email) {
        console.log('[UPLOAD-LOGO] Missing email');
        return res.status(400).json({ message: "Missing email" });
      }
      
      console.error('[UPLOAD-LOGO] Looking up user by email:', email);
      
      // Look up user by email (bypasses broken session)
      const user = await storage.getUserByEmail(email);
      if (!user) {
        console.error('[UPLOAD-LOGO] User not found:', email);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.error('[UPLOAD-LOGO] Raw user object:', JSON.stringify(user, null, 2));
      console.error('[UPLOAD-LOGO] user.companyId:', user.companyId);
      console.error('[UPLOAD-LOGO] user.company_id:', (user as any).company_id);
      console.error('[UPLOAD-LOGO] Full user keys:', Object.keys(user));
      
      // CRITICAL FIX: Manually map company_id if not already mapped
      if (!user.companyId && (user as any).company_id) {
        console.error('[UPLOAD-LOGO] MANUALLY MAPPING company_id to companyId');
        (user as any).companyId = (user as any).company_id;
      }
      
      if (!user.companyId) {
        console.error('[UPLOAD-LOGO] User STILL has no companyId after manual mapping!');
        return res.status(400).json({ message: "User must belong to a company to upload logo" });
      }
      
      console.log('[UPLOAD-LOGO] Found user:', user.id, 'companyId:', user.companyId);

      // Upload to object storage
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = imageData.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `public/contractor-images/logos/${filename}`;
      
      console.log('[UPLOAD-LOGO] Uploading to:', path);
      
      const objectStorage = new ObjectStorageService();
      await objectStorage.uploadFile(path, buffer, `image/${fileExtension}`);
      const url = `/public/contractor-images/logos/${filename}`;
      
      console.log('[UPLOAD-LOGO] Uploaded successfully to:', url);
      
      // Save to company database
      const updatedCompany = await storage.updateCompany(user.companyId, { businessLogo: url });
      console.log('[UPLOAD-LOGO] Database updated successfully. Logo:', updatedCompany?.businessLogo);
      
      res.json({ url, company: updatedCompany });
    } catch (error) {
      console.error("[UPLOAD-LOGO] Error:", error);
      res.status(500).json({ message: "Failed to upload logo", error: String(error) });
    }
  });

  // Search analytics tracking
  app.post('/api/analytics/search', async (req: any, res) => {
    try {
      const { searchTerm, serviceType, searchContext } = req.body;
      
      const userId = req.session?.user?.id || null;
      const userZipCode = req.session?.user?.zipCode || null;

      const analytics = await storage.trackSearch({
        userId,
        searchTerm,
        serviceType,
        userZipCode,
        searchContext
      });

      res.json({ success: true, id: analytics.id });
    } catch (error) {
      console.error("Error tracking search:", error);
      res.status(500).json({ message: "Failed to track search" });
    }
  });

  // Admin analytics routes
  app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  app.get('/api/admin/search-analytics', requireAdmin, async (req, res) => {
    try {
      const { zipCode, limit } = req.query;
      const analytics = await storage.getSearchAnalytics({
        zipCode: zipCode as string,
        limit: limit ? parseInt(limit as string) : undefined
      });
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching search analytics:", error);
      res.status(500).json({ message: "Failed to fetch search analytics" });
    }
  });

  // Invite code routes
  app.get('/api/admin/invite-codes', requireAdmin, async (req, res) => {
    try {
      const codes = await storage.getInviteCodes();
      res.json(codes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  app.post('/api/admin/invite-codes', requireAdmin, async (req, res) => {
    try {
      const { code, maxUses } = req.body;
      
      const createdBy = req.session.user.id;
      const inviteCode = await storage.createInviteCode({
        code,
        createdBy,
        maxUses: maxUses || 1,
        currentUses: 0,
        isActive: true,
        usedBy: []
      });

      res.json(inviteCode);
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  app.patch('/api/admin/invite-codes/:code/deactivate', requireAdmin, async (req, res) => {
    try {
      const { code } = req.params;
      const success = await storage.deactivateInviteCode(code);
      
      if (!success) {
        return res.status(404).json({ message: "Invite code not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating invite code:", error);
      res.status(500).json({ message: "Failed to deactivate invite code" });
    }
  });

  // Homeowner profile routes
  app.patch('/api/homeowner/profile', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'homeowner') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { firstName, lastName, email, phone, address } = req.body;
      const userId = req.session.user.id;

      // Update user profile
      const updatedUser = await storage.upsertUser({
        id: userId,
        email: email,
        firstName: firstName,
        lastName: lastName,
        profileImageUrl: req.session.user.profileImageUrl,
        role: 'homeowner'
      });

      // Update session
      req.session.user = updatedUser;

      res.json({ success: true, user: updatedUser });
    } catch (error) {
      console.error("Error updating homeowner profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch('/api/homeowner/notifications/preferences', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'homeowner') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const preferences = req.body;
      
      // For now, we'll just return success since we're not persisting preferences
      // In a real app, you'd save these to a user_preferences table
      console.log(`Notification preferences updated for user ${req.session.user.id}:`, preferences);

      res.json({ success: true, preferences });
    } catch (error) {
      console.error("Error updating notification preferences:", error);
      res.status(500).json({ message: "Failed to update notification preferences" });
    }
  });

  // Contractor routes
  app.get("/api/contractors", async (req, res) => {
    try {
      const filters = {
        services: req.query.services ? (req.query.services as string).split(',') : undefined,
        location: req.query.location as string,
        minRating: req.query.minRating ? parseFloat(req.query.minRating as string) : undefined,
        availableThisWeek: req.query.availableThisWeek === 'true',
        hasEmergencyServices: req.query.hasEmergencyServices === 'true',
        maxDistance: req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined,
      };

      const contractors = await storage.getContractors(filters);
      console.log('[DEBUG] /api/contractors returning', contractors.length, 'contractors');
      if (contractors.length > 0) {
        console.log('[DEBUG] First contractor ID:', contractors[0].id);
      }
      res.json(contractors);
    } catch (error) {
      console.error("Error fetching contractors:", error);
      res.status(500).json({ message: "Failed to fetch contractors" });
    }
  });

  app.get("/api/contractors/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const location = req.query.location as string;
      const servicesParam = req.query.services as string;
      const services = servicesParam ? servicesParam.split(',').map(s => s.trim()).filter(s => s) : undefined;
      
      const contractors = await storage.searchContractors(query, location, services);
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ message: "Failed to search contractors" });
    }
  });

  app.get("/api/contractors/:id", async (req, res) => {
    try {
      console.log('[DEBUG] GET /api/contractors/:id - Looking for contractor ID:', req.params.id);
      const contractor = await storage.getContractor(req.params.id);
      console.log('[DEBUG] Contractor found:', !!contractor);
      if (!contractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }
      
      // Fetch company data to include businessLogo and projectPhotos
      let contractorWithCompanyData = { ...contractor };
      if ((contractor as any).companyId) {
        const company = await storage.getCompany((contractor as any).companyId);
        if (company) {
          contractorWithCompanyData = {
            ...contractor,
            businessLogo: company.businessLogo || '',
            projectPhotos: company.projectPhotos || []
          };
        }
      }
      
      res.json(contractorWithCompanyData);
    } catch (error) {
      console.error('[ERROR] Failed to fetch contractor:', error);
      res.status(500).json({ message: "Failed to fetch contractor" });
    }
  });

  // Contractor boost routes
  app.post("/api/contractors/boost", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can create boosts" });
      }

      const boostData = insertContractorBoostSchema.parse({
        ...req.body,
        contractorId: userId
      });

      const boost = await storage.createContractorBoost(boostData);
      res.json(boost);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid boost data", errors: error.errors });
      }
      console.error("Error creating boost:", error);
      res.status(500).json({ message: "Failed to create boost" });
    }
  });

  app.get("/api/contractors/boost/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can check boost availability" });
      }

      const { serviceCategory, businessAddress } = req.query;
      
      if (!serviceCategory || !businessAddress) {
        return res.status(400).json({ message: "Service category and business address are required" });
      }

      // For now, we'll check if there are any conflicts by checking existing boosts
      // This is a simplified version - in a real app, we'd geocode the business address
      const existingBoosts = await storage.getContractorBoosts(userId as string);
      const hasActiveBoost = existingBoosts.some(boost => 
        boost.serviceCategory === serviceCategory && 
        boost.status === 'active' && 
        boost.isActive &&
        new Date(boost.endDate) > new Date()
      );
      
      res.json({ canBoost: !hasActiveBoost });
    } catch (error) {
      console.error("Error checking boost availability:", error);
      res.status(500).json({ message: "Failed to check boost availability" });
    }
  });

  app.delete("/api/contractors/boost/:boostId", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can delete boosts" });
      }

      const userBoosts = await storage.getContractorBoosts(userId as string);
      const boost = userBoosts.find(b => b.id === req.params.boostId);
      
      if (!boost) {
        return res.status(404).json({ message: "Boost not found or access denied" });
      }

      await storage.deleteContractorBoost(req.params.boostId);
      res.json({ message: "Boost deleted successfully" });
    } catch (error) {
      console.error("Error deleting boost:", error);
      res.status(500).json({ message: "Failed to delete boost" });
    }
  });

  // Company routes
  app.post("/api/companies", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;

      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can create companies" });
      }

      // Check if user already belongs to a company
      const user = await storage.getUser(userId);
      if (user?.companyId) {
        return res.status(400).json({ message: "You already belong to a company" });
      }

      const companyData = insertCompanySchema.parse({
        ...req.body,
        ownerId: userId
      });

      const company = await storage.createCompany(companyData);

      // Update user's company info (reuse already-fetched user)
      await storage.upsertUser({
        ...user,
        companyId: company.id,
        companyRole: 'owner'
      });

      res.status(201).json(company);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      console.error("Error creating company:", error);
      res.status(500).json({ message: "Failed to create company" });
    }
  });

  app.get("/api/companies/:id", async (req, res) => {
    try {
      const company = await storage.getCompany(req.params.id);
      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }
      res.json(company);
    } catch (error) {
      console.error("Error fetching company:", error);
      res.status(500).json({ message: "Failed to fetch company" });
    }
  });

  app.put("/api/companies/:id", isAuthenticated, async (req: any, res) => {
    try {
      console.log('[Company Update] Request received for company:', req.params.id);
      console.log('[Company Update] Request body:', JSON.stringify(req.body, null, 2));
      
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        console.log('[Company Update] Company not found:', req.params.id);
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can update company profile
      if (company.ownerId !== userId) {
        console.log('[Company Update] Permission denied. Owner:', company.ownerId, 'User:', userId);
        return res.status(403).json({ message: "Only company owner can update company profile" });
      }

      console.log('[Company Update] Validating data...');
      const partialData = insertCompanySchema.partial().omit({ ownerId: true }).parse(req.body);
      console.log('[Company Update] Validated data:', JSON.stringify(partialData, null, 2));
      
      const updatedCompany = await storage.updateCompany(req.params.id, partialData);
      console.log('[Company Update] Update successful. Logo:', updatedCompany?.businessLogo ? 'SET' : 'EMPTY', 'Photos:', updatedCompany?.projectPhotos?.length || 0);

      res.json(updatedCompany);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.log('[Company Update] Validation error:', error.errors);
        return res.status(400).json({ message: "Invalid company data", errors: error.errors });
      }
      console.error("[Company Update] Error updating company:", error);
      res.status(500).json({ message: "Failed to update company" });
    }
  });

  app.get("/api/companies/:id/employees", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company members can view employees
      const user = await storage.getUser(userId);
      if (user?.companyId !== req.params.id) {
        return res.status(403).json({ message: "Access denied" });
      }

      const employees = await storage.getCompanyEmployees(req.params.id);
      res.json(employees);
    } catch (error) {
      console.error("Error fetching company employees:", error);
      res.status(500).json({ message: "Failed to fetch employees" });
    }
  });

  app.delete("/api/companies/:id/employees/:userId", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can remove employees
      if (company.ownerId !== ownerId) {
        return res.status(403).json({ message: "Only company owner can remove employees" });
      }

      // Cannot remove the owner
      if (req.params.userId === ownerId) {
        return res.status(400).json({ message: "Cannot remove company owner" });
      }

      // Remove employee from company
      const employee = await storage.getUser(req.params.userId);
      if (employee) {
        await storage.upsertUser({
          ...employee,
          companyId: null,
          companyRole: null
        });
      }

      res.json({ message: "Employee removed successfully" });
    } catch (error) {
      console.error("Error removing employee:", error);
      res.status(500).json({ message: "Failed to remove employee" });
    }
  });

  app.put("/api/companies/:id/employees/:userId/permissions", isAuthenticated, async (req: any, res) => {
    try {
      const ownerId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can change permissions
      if (company.ownerId !== ownerId) {
        return res.status(403).json({ message: "Only company owner can change permissions" });
      }

      // Cannot change owner's permissions
      if (req.params.userId === ownerId) {
        return res.status(400).json({ message: "Cannot change owner permissions" });
      }

      const employee = await storage.getUser(req.params.userId);
      if (!employee) {
        return res.status(404).json({ message: "Employee not found" });
      }

      if (employee.companyId !== req.params.id) {
        return res.status(400).json({ message: "Employee does not belong to this company" });
      }

      // Update employee permissions
      const updatedEmployee = await storage.upsertUser({
        ...employee,
        canRespondToProposals: req.body.canRespondToProposals
      });

      res.json(updatedEmployee);
    } catch (error) {
      console.error("Error updating employee permissions:", error);
      res.status(500).json({ message: "Failed to update permissions" });
    }
  });

  app.post("/api/companies/:id/invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can generate invite codes
      if (company.ownerId !== userId) {
        return res.status(403).json({ message: "Only company owner can generate invite codes" });
      }

      const inviteData = insertCompanyInviteCodeSchema.parse({
        companyId: req.params.id,
        code: Math.random().toString(36).substring(2, 10).toUpperCase(), // Generate 8-char code
        createdBy: userId
      });

      const invite = await storage.createCompanyInviteCode(inviteData);
      res.status(201).json(invite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid invite data", errors: error.errors });
      }
      console.error("Error creating invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  app.get("/api/companies/:id/invite-codes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const company = await storage.getCompany(req.params.id);

      if (!company) {
        return res.status(404).json({ message: "Company not found" });
      }

      // Only company owner can view invite codes
      if (company.ownerId !== userId) {
        return res.status(403).json({ message: "Only company owner can view invite codes" });
      }

      const inviteCodes = await storage.getCompanyInviteCodes(req.params.id);
      res.json(inviteCodes);
    } catch (error) {
      console.error("Error fetching invite codes:", error);
      res.status(500).json({ message: "Failed to fetch invite codes" });
    }
  });

  app.get("/api/companies/invite-codes/:code", async (req, res) => {
    try {
      const invite = await storage.getCompanyInviteCodeByCode(req.params.code);
      
      if (!invite) {
        return res.status(404).json({ message: "Invite code not found" });
      }

      if (!invite.isActive) {
        return res.status(400).json({ message: "Invite code is no longer active" });
      }

      if (invite.usedBy) {
        return res.status(400).json({ message: "Invite code has already been used" });
      }

      if (invite.expiresAt && new Date(invite.expiresAt) < new Date()) {
        return res.status(400).json({ message: "Invite code has expired" });
      }

      // Return invite with company info
      const company = await storage.getCompany(invite.companyId);
      res.json({ invite, company });
    } catch (error) {
      console.error("Error fetching invite code:", error);
      res.status(500).json({ message: "Failed to fetch invite code" });
    }
  });

  // Product routes
  app.get("/api/products", async (req, res) => {
    try {
      const filters = {
        category: req.query.category as string,
        featured: req.query.featured === 'true',
        search: req.query.search as string,
      };

      const products = await storage.getProducts(filters);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      
      const products = await storage.searchProducts(query);
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Home Appliance routes
  app.get("/api/appliances", async (req, res) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      const houseId = req.query.houseId as string;
      const appliances = await storage.getHomeAppliances(homeownerId, houseId);
      res.json(appliances);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appliances" });
    }
  });

  app.get("/api/appliances/:id", async (req, res) => {
    try {
      const appliance = await storage.getHomeAppliance(req.params.id);
      if (!appliance) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      res.json(appliance);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appliance" });
    }
  });

  app.post("/api/appliances", async (req, res) => {
    try {
      const applianceData = insertHomeApplianceSchema.parse(req.body);
      const appliance = await storage.createHomeAppliance(applianceData);
      res.status(201).json(appliance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appliance data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create appliance" });
    }
  });

  app.patch("/api/appliances/:id", async (req, res) => {
    try {
      const partialData = insertHomeApplianceSchema.partial().parse(req.body);
      const appliance = await storage.updateHomeAppliance(req.params.id, partialData);
      if (!appliance) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      res.json(appliance);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appliance data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update appliance" });
    }
  });

  app.delete("/api/appliances/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHomeAppliance(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Appliance not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appliance" });
    }
  });

  // Home Appliance Manual routes
  app.get("/api/appliances/:applianceId/manuals", async (req, res) => {
    try {
      const manuals = await storage.getHomeApplianceManuals(req.params.applianceId);
      res.json(manuals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appliance manuals" });
    }
  });

  app.get("/api/appliance-manuals/:id", async (req, res) => {
    try {
      const manual = await storage.getHomeApplianceManual(req.params.id);
      if (!manual) {
        return res.status(404).json({ message: "Manual not found" });
      }
      res.json(manual);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch manual" });
    }
  });

  app.post("/api/appliances/:applianceId/manuals", async (req, res) => {
    try {
      const manualData = insertHomeApplianceManualSchema.parse({
        ...req.body,
        applianceId: req.params.applianceId
      });
      const manual = await storage.createHomeApplianceManual(manualData);
      res.status(201).json(manual);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid manual data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create manual" });
    }
  });

  app.patch("/api/appliance-manuals/:id", async (req, res) => {
    try {
      const partialData = insertHomeApplianceManualSchema.partial().parse(req.body);
      const manual = await storage.updateHomeApplianceManual(req.params.id, partialData);
      if (!manual) {
        return res.status(404).json({ message: "Manual not found" });
      }
      res.json(manual);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid manual data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update manual" });
    }
  });

  app.delete("/api/appliance-manuals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHomeApplianceManual(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Manual not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete manual" });
    }
  });

  // Maintenance Log routes
  app.get("/api/maintenance-logs", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Always use authenticated user's ID, ignore query params to prevent IDOR
      const homeownerId = req.session.user.id;
      const houseId = req.query.houseId as string;
      
      // If houseId is provided, verify it belongs to the user
      if (houseId) {
        const house = await storage.getHouse(houseId);
        if (!house || house.homeownerId !== homeownerId) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const logs = await storage.getMaintenanceLogs(homeownerId, houseId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance logs" });
    }
  });

  app.get("/api/maintenance-logs/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const log = await storage.getMaintenanceLog(req.params.id);
      if (!log || log.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance log" });
    }
  });

  app.post("/api/maintenance-logs", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Validate request body (excluding homeownerId which we set from session)
      const validatedData = insertMaintenanceLogSchema.omit({ homeownerId: true }).parse(req.body);
      
      // Use authenticated user's ID, never trust client input
      const logData = {
        ...validatedData,
        homeownerId: req.session.user.id
      };
      
      const log = await storage.createMaintenanceLog(logData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance log data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create maintenance log" });
    }
  });

  app.patch("/api/maintenance-logs/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the maintenance log belongs to the authenticated user
      const existingLog = await storage.getMaintenanceLog(req.params.id);
      if (!existingLog || existingLog.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      
      // Validate request body (excluding homeownerId which cannot be changed)
      const partialData = insertMaintenanceLogSchema.omit({ homeownerId: true }).partial().parse(req.body);
      
      const log = await storage.updateMaintenanceLog(req.params.id, partialData);
      if (!log) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance log data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update maintenance log" });
    }
  });

  app.delete("/api/maintenance-logs/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the maintenance log belongs to the authenticated user
      const existingLog = await storage.getMaintenanceLog(req.params.id);
      if (!existingLog || existingLog.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      
      const deleted = await storage.deleteMaintenanceLog(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete maintenance log" });
    }
  });

  // Custom Maintenance Task routes
  app.get("/api/custom-maintenance-tasks", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Always use authenticated user's ID, ignore query params to prevent IDOR
      const homeownerId = req.session.user.id;
      const houseId = req.query.houseId as string;
      
      // If houseId is provided, verify it belongs to the user
      if (houseId) {
        const house = await storage.getHouse(houseId);
        if (!house || house.homeownerId !== homeownerId) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const tasks = await storage.getCustomMaintenanceTasks(homeownerId, houseId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom maintenance tasks" });
    }
  });

  app.get("/api/custom-maintenance-tasks/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const task = await storage.getCustomMaintenanceTask(req.params.id);
      if (!task || task.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom maintenance task" });
    }
  });

  app.post("/api/custom-maintenance-tasks", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Validate request body (excluding homeownerId which we set from session)
      const validatedData = insertCustomMaintenanceTaskSchema.omit({ homeownerId: true }).parse(req.body);
      
      // If houseId is provided, verify it belongs to the user
      if (validatedData.houseId) {
        const house = await storage.getHouse(validatedData.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      // Use authenticated user's ID, never trust client input
      const taskData = {
        ...validatedData,
        homeownerId: req.session.user.id
      };
      
      const task = await storage.createCustomMaintenanceTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom maintenance task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create custom maintenance task" });
    }
  });

  app.patch("/api/custom-maintenance-tasks/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the custom maintenance task belongs to the authenticated user
      const existingTask = await storage.getCustomMaintenanceTask(req.params.id);
      if (!existingTask || existingTask.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      
      // Validate request body (excluding homeownerId which cannot be changed)
      const partialData = insertCustomMaintenanceTaskSchema.omit({ homeownerId: true }).partial().parse(req.body);
      
      // If houseId is being updated, verify it belongs to the user
      if (partialData.houseId) {
        const house = await storage.getHouse(partialData.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const task = await storage.updateCustomMaintenanceTask(req.params.id, partialData);
      if (!task) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom maintenance task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update custom maintenance task" });
    }
  });

  app.delete("/api/custom-maintenance-tasks/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the custom maintenance task belongs to the authenticated user
      const existingTask = await storage.getCustomMaintenanceTask(req.params.id);
      if (!existingTask || existingTask.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      
      const deleted = await storage.deleteCustomMaintenanceTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom maintenance task" });
    }
  });

  // Task override routes for customizing default regional tasks
  app.get("/api/houses/:houseId/task-overrides", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const houseId = req.params.houseId;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      const overrides = await storage.getTaskOverrides(homeownerId, houseId);
      res.json(overrides);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch task overrides" });
    }
  });

  app.post("/api/houses/:houseId/task-overrides", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const houseId = req.params.houseId;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      // Validate request body
      const validatedData = insertTaskOverrideSchema.omit({ homeownerId: true, houseId: true }).parse(req.body);
      
      const overrideData = {
        ...validatedData,
        homeownerId,
        houseId
      };
      
      const override = await storage.upsertTaskOverride(overrideData);
      res.status(201).json(override);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task override data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create task override" });
    }
  });

  app.delete("/api/houses/:houseId/task-overrides/:taskId", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const houseId = req.params.houseId;
      const taskId = req.params.taskId;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      const deleted = await storage.deleteTaskOverride(homeownerId, houseId, taskId);
      if (!deleted) {
        return res.status(404).json({ message: "Task override not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete task override" });
    }
  });

  // Proposal routes
  app.get("/api/proposals", async (req, res) => {
    try {
      const contractorId = req.query.contractorId as string;
      const homeownerId = req.query.homeownerId as string;
      const proposals = await storage.getProposals(contractorId, homeownerId);
      res.json(proposals);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch proposals" });
    }
  });

  app.get("/api/proposals/:id", async (req, res) => {
    try {
      const proposal = await storage.getProposal(req.params.id);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.json(proposal);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch proposal" });
    }
  });

  app.post("/api/proposals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const proposalData = insertProposalSchema.parse({
        ...req.body,
        contractorId: userId
      });
      const proposal = await storage.createProposal(proposalData);
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proposal data", errors: error.errors });
      }
      console.error("Error creating proposal:", error);
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  app.patch("/api/proposals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const partialData = insertProposalSchema.partial().parse(req.body);
      const oldProposal = await storage.getProposal(req.params.id);
      const proposal = await storage.updateProposal(req.params.id, partialData);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      if (oldProposal && oldProposal.status !== 'accepted' && proposal.status === 'accepted' && proposal.homeownerId) {
        try {
          const newAchievements = await storage.checkAndUnlockContractorHiringAchievements(proposal.homeownerId);
          if (newAchievements.length > 0) {
            res.json({ ...proposal, newAchievements });
            return;
          }
        } catch (achievementError) {
          console.error("Error unlocking contractor hiring achievement:", achievementError);
        }
      }
      
      res.json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proposal data", errors: error.errors });
      }
      console.error("Error updating proposal:", error);
      res.status(500).json({ message: "Failed to update proposal" });
    }
  });

  // E-signature route for proposals
  app.post("/api/proposals/:id/sign", isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = req.params.id;
      const userId = req.session.user.id;
      const { signature, signerName, signedAt, ipAddress } = req.body;

      if (!signature || !signerName || !signedAt) {
        return res.status(400).json({ message: "Missing required signature data" });
      }

      // Get the proposal and verify the user has permission to sign it
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      // Check if user is the homeowner for this proposal
      if (proposal.homeownerId !== userId) {
        return res.status(403).json({ message: "Only the homeowner can sign this proposal" });
      }

      // Update proposal with signature data
      const updatedProposal = await storage.updateProposal(proposalId, {
        customerSignature: signature,
        contractSignedAt: new Date(signedAt),
        signatureIpAddress: ipAddress,
        status: "accepted"
      });

      try {
        const newAchievements = await storage.checkAndUnlockContractorHiringAchievements(userId);
        if (newAchievements.length > 0) {
          res.json({ ...updatedProposal, newAchievements });
          return;
        }
      } catch (achievementError) {
        console.error("Error unlocking contractor hiring achievement:", achievementError);
      }

      res.json(updatedProposal);
    } catch (error) {
      console.error("Error signing proposal:", error);
      res.status(500).json({ message: "Failed to sign proposal" });
    }
  });

  // Upload contract file for proposal
  app.post("/api/proposals/:id/contract", isAuthenticated, async (req: any, res) => {
    try {
      const proposalId = req.params.id;
      const userId = req.session.user.id;
      const { contractFilePath } = req.body;

      if (!contractFilePath) {
        return res.status(400).json({ message: "Contract file path is required" });
      }

      // Get the proposal and verify the user is the contractor
      const proposal = await storage.getProposal(proposalId);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }

      if (proposal.contractorId !== userId) {
        return res.status(403).json({ message: "Only the contractor can upload contracts" });
      }

      // Normalize the file path if it's a full URL
      const normalizedPath = objectStorageService.normalizeObjectEntityPath(contractFilePath);

      // Update proposal with contract file
      const updatedProposal = await storage.updateProposal(proposalId, {
        contractFilePath: normalizedPath
      });

      res.json(updatedProposal);
    } catch (error) {
      console.error("Error uploading contract:", error);
      res.status(500).json({ message: "Failed to upload contract" });
    }
  });

  app.delete("/api/proposals/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProposal(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete proposal" });
    }
  });

  // Contractor Appointment routes
  app.get("/api/appointments", async (req, res) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      const appointments = await storage.getContractorAppointments(homeownerId);
      res.json(appointments);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointments" });
    }
  });

  app.get("/api/appointments/:id", async (req, res) => {
    try {
      const appointment = await storage.getContractorAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch appointment" });
    }
  });

  app.post("/api/appointments", async (req, res) => {
    try {
      const appointmentData = insertContractorAppointmentSchema.parse(req.body);
      const appointment = await storage.createContractorAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id", async (req, res) => {
    try {
      const partialData = insertContractorAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateContractorAppointment(req.params.id, partialData);
      if (!appointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteContractorAppointment(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete appointment" });
    }
  });

  // Notification routes
  app.get("/api/notifications", async (req, res) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      const notifications = await storage.getNotifications(homeownerId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", async (req, res) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      if (!homeownerId) {
        return res.status(400).json({ message: "homeownerId is required" });
      }
      const notifications = await storage.getUnreadNotifications(homeownerId);
      res.json(notifications);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", async (req, res) => {
    try {
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNotification(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  // Generate maintenance notifications for current month
  app.post("/api/notifications/maintenance", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const { homeownerId, tasks } = req.body;
      if (!homeownerId || !Array.isArray(tasks)) {
        return res.status(400).json({ message: "homeownerId and tasks array are required" });
      }
      
      await storage.createMaintenanceNotifications(homeownerId, tasks);
      
      // Also create regional maintenance suggestions notifications
      try {
        const houses = await storage.getHousesByHomeowner(homeownerId);
        if (houses.length > 0) {
          const { US_MAINTENANCE_DATA, getCurrentMonthTasks, getRegionFromClimateZone } = await import("../shared/location-maintenance-data");
          
          for (const house of houses) {
            const region = getRegionFromClimateZone(house.climateZone);
            const regionData = US_MAINTENANCE_DATA[region];
            const currentMonth = new Date().getMonth() + 1;
            const currentMonthTasks = regionData ? getCurrentMonthTasks(region, currentMonth) : null;
            
            if (regionData && currentMonthTasks) {
              // Create regional suggestions notifications
              const regionalNotifications: any[] = [];
              
              // Add seasonal tasks as notifications
              currentMonthTasks.seasonal.forEach((task, index) => {
                regionalNotifications.push({
                  id: `regional-seasonal-${homeownerId}-${currentMonth}-${index}`,
                  homeownerId,
                  houseId: house.id,
                  type: "maintenance_task" as const,
                  title: `${region} Regional Suggestion`,
                  message: task,
                  priority: currentMonthTasks.priority as "high" | "medium" | "low",
                  isRead: false,
                  actionUrl: "/maintenance",
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              });
              
              // Add weather-specific tasks
              currentMonthTasks.weatherSpecific.forEach((task, index) => {
                regionalNotifications.push({
                  id: `regional-weather-${homeownerId}-${currentMonth}-${index}`,
                  homeownerId,
                  houseId: house.id,
                  type: "maintenance_task" as const,
                  title: `Weather-Specific Task for ${region}`,
                  message: task,
                  priority: "medium" as const,
                  isRead: false,
                  actionUrl: "/maintenance",
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              });
              
              // Add special considerations
              regionData.specialConsiderations.forEach((consideration, index) => {
                regionalNotifications.push({
                  id: `regional-consideration-${homeownerId}-${currentMonth}-${index}`,
                  homeownerId,
                  houseId: house.id,
                  type: "maintenance_task" as const,
                  title: `${region} Regional Consideration`,
                  message: consideration,
                  priority: "low" as const,
                  isRead: false,
                  actionUrl: "/maintenance",
                  createdAt: new Date(),
                  updatedAt: new Date()
                });
              });
              
              // Create the notifications
              for (const notification of regionalNotifications) {
                await storage.createNotification(notification);
              }
            }
          }
        }
      } catch (regionalError) {
        console.error("Error creating regional notifications:", regionalError);
        // Don't fail the whole request if regional notifications fail
      }
      
      res.json({ success: true, message: "Maintenance notifications created" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create maintenance notifications" });
    }
  });

  // House management routes
  app.get("/api/houses", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Always use authenticated user's ID, ignore query params
      const homeownerId = req.session.user.id;
      const houses = await storage.getHouses(homeownerId);
      res.json(houses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch houses" });
    }
  });

  app.get("/api/houses/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house" });
    }
  });

  app.post("/api/houses", isAuthenticated, requirePropertyOwner, async (req: any, res) => {  
    try {
      // Validate request body (excluding homeownerId which we set from session)
      const validatedData = insertHouseSchema.omit({ homeownerId: true }).parse(req.body);
      
      // Use authenticated user's ID, never trust client input
      const homeownerId = req.session.user.id;
      const user = req.session.user;
      
      // Check property limits based on user role
      const existingHouses = await storage.getHouses(homeownerId);
      
      if (user?.role === 'contractor') {
        // Contractors are limited to 1 home for personal maintenance tracking
        if (existingHouses.length >= 1) {
          return res.status(403).json({ 
            message: "Property limit reached. Contractors can track maintenance for one personal property.",
            code: "CONTRACTOR_LIMIT_EXCEEDED"
          });
        }
      } else if (user?.role === 'homeowner') {
        // Non-premium homeowners are limited to 2 properties
        if (!user?.isPremium && existingHouses.length >= 2) {
          return res.status(403).json({ 
            message: "Property limit reached. Upgrade to Platinum to add unlimited properties.",
            code: "PLAN_LIMIT_EXCEEDED"
          });
        }
      }
      
      // Create house with authenticated user's ID
      const houseData = {
        ...validatedData,
        homeownerId
      };
      
      const house = await storage.createHouse(houseData);
      res.status(201).json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create house" });
    }
  });

  app.delete("/api/houses/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the house belongs to the authenticated user
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }
      
      const success = await storage.deleteHouse(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete house" });
    }
  });

  app.put("/api/houses/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the house belongs to the authenticated user
      const existingHouse = await storage.getHouse(req.params.id);
      if (!existingHouse || existingHouse.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }
      
      // Validate request body (excluding homeownerId which cannot be changed)
      const validatedData = insertHouseSchema.omit({ homeownerId: true }).partial().parse(req.body);
      
      const house = await storage.updateHouse(req.params.id, validatedData);
      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update house" });
    }
  });

  // Get maintenance tasks for a specific house
  app.get("/api/houses/:id/maintenance-tasks", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }

      // Get current month and create mock maintenance tasks based on house
      const currentDate = new Date();
      const currentMonth = currentDate.toLocaleString('default', { month: 'long' });
      
      // Mock response structure - in a real app this would be more sophisticated
      const response = {
        house,
        currentMonth,
        region: house.climateZone || "Mixed",
        tasks: {
          seasonal: [
            "Check HVAC filters and replace if needed",
            "Inspect gutters and downspouts for blockages",
            "Test smoke and carbon monoxide detectors",
            "Check weatherstripping around doors and windows"
          ],
          weatherSpecific: [
            "Inspect roof for loose or damaged shingles",
            "Clean dryer vent and lint trap",
            "Service lawn equipment for spring use"
          ],
          priority: "medium" as const
        }
      };
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance tasks" });
    }
  });

  // House Transfer routes
  app.post("/api/house-transfers", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      
      // Validate request body (exclude server-generated fields)
      const validatedData = insertHouseTransferSchema.omit({ 
        fromHomeownerId: true,
        token: true,
        expiresAt: true,
        status: true,
        maintenanceLogsTransferred: true,
        appliancesTransferred: true,
        appointmentsTransferred: true,
        customTasksTransferred: true,
        homeSystemsTransferred: true,
        createdAt: true,
        completedAt: true
      }).parse(req.body);
      
      // Verify house ownership
      const house = await storage.getHouse(validatedData.houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found or access denied" });
      }
      
      // Generate secure token and expiry server-side
      const token = randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      // Create transfer request with server-generated security fields
      const transfer = await storage.createHouseTransfer({
        ...validatedData,
        fromHomeownerId: homeownerId,
        token,
        expiresAt,
      });
      
      res.status(201).json(transfer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create house transfer request" });
    }
  });

  app.get("/api/house-transfers", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const transfers = await storage.getHouseTransfersForUser(homeownerId);
      res.json(transfers);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house transfers" });
    }
  });

  app.get("/api/house-transfers/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const transfer = await storage.getHouseTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Verify user is involved in this transfer
      if (transfer.fromHomeownerId !== homeownerId && transfer.toHomeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house transfer" });
    }
  });

  app.get("/api/house-transfers/token/:token", async (req: any, res) => {
    try {
      const transfer = await storage.getHouseTransferByToken(req.params.token);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Check if token is still valid
      const tokenExpiry = transfer.expiresAt ? 
        new Date(transfer.expiresAt) : 
        new Date(new Date(transfer.createdAt).getTime() + 7*24*60*60*1000);
      
      if (new Date() > tokenExpiry) {
        return res.status(410).json({ message: "Transfer token has expired" });
      }
      
      res.json(transfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house transfer" });
    }
  });

  app.post("/api/house-transfers/:id/accept", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const transfer = await storage.getHouseTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Verify this user is the intended recipient (by email or ID)
      const user = await storage.getUser(homeownerId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const emailMatch = user.email?.toLowerCase() === transfer.toHomeownerEmail?.toLowerCase();
      const idMatch = transfer.toHomeownerId === homeownerId;
      
      if (!emailMatch && !idMatch) {
        return res.status(403).json({ 
          message: "Access denied - this transfer is not intended for your account" 
        });
      }
      
      if (transfer.status !== 'pending') {
        return res.status(400).json({ message: "Transfer is no longer pending" });
      }
      
      // Check subscription limits for recipient
      const housesCount = await storage.getHousesCount(homeownerId);
      
      // Check subscription limits
      const maxHouses = user.maxHousesAllowed || 2; // Default to basic plan limit
      if (housesCount >= maxHouses) {
        return res.status(400).json({ 
          message: `Cannot accept transfer. Your subscription plan allows maximum ${maxHouses} houses.` 
        });
      }
      
      // Update transfer status to accepted and set recipient ID
      const updatedTransfer = await storage.updateHouseTransfer(req.params.id, {
        status: 'accepted',
        toHomeownerId: homeownerId
      });
      
      res.json(updatedTransfer);
    } catch (error) {
      res.status(500).json({ message: "Failed to accept house transfer" });
    }
  });

  app.post("/api/house-transfers/:id/confirm", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const transfer = await storage.getHouseTransfer(req.params.id);
      
      if (!transfer) {
        return res.status(404).json({ message: "Transfer not found" });
      }
      
      // Verify this is the original owner confirming the transfer
      if (transfer.fromHomeownerId !== homeownerId) {
        return res.status(403).json({ message: "Access denied - only the original owner can confirm" });
      }
      
      if (transfer.status !== 'accepted') {
        return res.status(400).json({ message: "Transfer must be accepted before confirmation" });
      }
      
      // Perform the actual ownership transfer
      if (!transfer.toHomeownerId) {
        return res.status(400).json({ message: "Transfer recipient not set" });
      }
      
      const transferResults = await storage.transferHouseOwnership(
        transfer.houseId,
        transfer.fromHomeownerId,
        transfer.toHomeownerId
      );
      
      // Update transfer record with completion details
      const completedTransfer = await storage.updateHouseTransfer(req.params.id, {
        status: 'completed',
        completedAt: new Date(),
        maintenanceLogsTransferred: transferResults.maintenanceLogsTransferred,
        appliancesTransferred: transferResults.appliancesTransferred,
        appointmentsTransferred: transferResults.appointmentsTransferred,
        customTasksTransferred: transferResults.customTasksTransferred,
        homeSystemsTransferred: transferResults.homeSystemsTransferred,
      });
      
      res.json({
        transfer: completedTransfer,
        transferResults
      });
    } catch (error) {
      console.error("Transfer confirmation error:", error);
      res.status(500).json({ message: "Failed to confirm house transfer" });
    }
  });

  // Home Systems routes
  app.get("/api/home-systems", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Always use authenticated user's ID, ignore query params to prevent IDOR
      const homeownerId = req.session.user.id;
      const houseId = req.query.houseId as string;
      
      // If houseId is provided, verify it belongs to the user
      if (houseId) {
        const house = await storage.getHouse(houseId);
        if (!house || house.homeownerId !== homeownerId) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const systems = await storage.getHomeSystems(homeownerId, houseId);
      res.json(systems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home systems" });
    }
  });

  app.get("/api/home-systems/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const system = await storage.getHomeSystem(req.params.id);
      if (!system) {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      // Home systems belong to houses, so verify the house belongs to the user
      if (system.houseId) {
        const house = await storage.getHouse(system.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(404).json({ message: "Home system not found" });
        }
      } else {
        // If no houseId, this is a security issue - home systems should always belong to a house
        return res.status(404).json({ message: "Home system not found" });
      }
      
      res.json(system);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home system" });
    }
  });

  app.post("/api/home-systems", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const systemData = insertHomeSystemSchema.parse(req.body);
      
      // Verify the house belongs to the authenticated user
      if (!systemData.houseId) {
        return res.status(400).json({ message: "House ID is required for home systems" });
      }
      
      const house = await storage.getHouse(systemData.houseId);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      const system = await storage.createHomeSystem(systemData);
      res.status(201).json(system);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid home system data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create home system" });
    }
  });

  app.patch("/api/home-systems/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the home system belongs to a house owned by the authenticated user
      const existingSystem = await storage.getHomeSystem(req.params.id);
      if (!existingSystem) {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      if (existingSystem.houseId) {
        const house = await storage.getHouse(existingSystem.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(404).json({ message: "Home system not found" });
        }
      } else {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      const partialData = insertHomeSystemSchema.partial().parse(req.body);
      
      // If houseId is being updated, verify the new house also belongs to the user
      if (partialData.houseId && partialData.houseId !== existingSystem.houseId) {
        const newHouse = await storage.getHouse(partialData.houseId);
        if (!newHouse || newHouse.homeownerId !== req.session.user.id) {
          return res.status(403).json({ message: "Access denied to house" });
        }
      }
      
      const system = await storage.updateHomeSystem(req.params.id, partialData);
      if (!system) {
        return res.status(404).json({ message: "Home system not found" });
      }
      res.json(system);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid home system data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update home system" });
    }
  });

  app.delete("/api/home-systems/:id", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the home system belongs to a house owned by the authenticated user
      const existingSystem = await storage.getHomeSystem(req.params.id);
      if (!existingSystem) {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      if (existingSystem.houseId) {
        const house = await storage.getHouse(existingSystem.houseId);
        if (!house || house.homeownerId !== req.session.user.id) {
          return res.status(404).json({ message: "Home system not found" });
        }
      } else {
        return res.status(404).json({ message: "Home system not found" });
      }
      
      const deleted = await storage.deleteHomeSystem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Home system not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete home system" });
    }
  });

  // Contractor home management routes 
  app.get('/api/contractor/my-home', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houses = await storage.getHouses(contractorId);
      res.json(houses);
    } catch (error) {
      console.error("Error fetching contractor houses:", error);
      res.status(500).json({ message: "Failed to fetch houses" });
    }
  });

  app.post('/api/contractor/my-home', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      
      // CRITICAL SECURITY: Enforce 1-home limit for contractors
      const existingHouses = await storage.getHouses(contractorId);
      if (existingHouses.length >= 1) {
        return res.status(403).json({ 
          message: "Property limit reached. Contractors can track maintenance for one personal property.",
          code: "CONTRACTOR_LIMIT_EXCEEDED"
        });
      }
      
      const houseData = insertHouseSchema.parse({
        ...req.body,
        homeownerId: contractorId
      });

      const house = await storage.createHouse(houseData);
      res.status(201).json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid house data", errors: error.errors });
      }
      console.error("Error creating contractor house:", error);
      res.status(500).json({ message: "Failed to create house" });
    }
  });

  app.patch('/api/contractor/my-home/:houseId', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houseId = req.params.houseId;

      // Check if house belongs to contractor
      const existingHouse = await storage.getHouse(houseId);
      if (!existingHouse || existingHouse.homeownerId !== contractorId) {
        return res.status(404).json({ message: "House not found or not owned by you" });
      }

      // Strip homeownerId from request body to prevent ownership transfer
      const { homeownerId, ...safeRequestData } = req.body;
      const partialData = insertHouseSchema.partial().parse(safeRequestData);
      const house = await storage.updateHouse(houseId, partialData);
      res.json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid house data", errors: error.errors });
      }
      console.error("Error updating contractor house:", error);
      res.status(500).json({ message: "Failed to update house" });
    }
  });

  app.delete('/api/contractor/my-home/:houseId', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houseId = req.params.houseId;

      // Check if house belongs to contractor
      const existingHouse = await storage.getHouse(houseId);
      if (!existingHouse || existingHouse.homeownerId !== contractorId) {
        return res.status(404).json({ message: "House not found or not owned by you" });
      }

      const success = await storage.deleteHouse(houseId);
      if (!success) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting contractor house:", error);
      res.status(500).json({ message: "Failed to delete house" });
    }
  });

  app.get('/api/contractor/my-home/tasks', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const houseId = req.query.houseId as string;

      if (!houseId) {
        return res.status(400).json({ message: "houseId is required" });
      }

      // Check if house belongs to contractor
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== contractorId) {
        return res.status(404).json({ message: "House not found or not owned by you" });
      }

      // Get maintenance tasks for current month based on house climate zone
      const currentMonth = new Date().getMonth() + 1;
      const { getCurrentMonthTasks, getRegionFromClimateZone } = await import('../shared/location-maintenance-data');
      
      const region = getRegionFromClimateZone(house.climateZone);
      const tasks = getCurrentMonthTasks(region, currentMonth);

      res.json({
        house,
        currentMonth: new Date().toLocaleString('default', { month: 'long' }),
        region,
        tasks: tasks || {
          seasonal: [],
          weatherSpecific: [],
          priority: 'medium'
        }
      });
    } catch (error) {
      console.error("Error fetching maintenance tasks:", error);
      res.status(500).json({ message: "Failed to fetch maintenance tasks" });
    }
  });

  // Contractor profile routes
  app.get('/api/contractor/profile', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const profile = await storage.getContractorProfile(contractorId);
      
      if (!profile) {
        // Return default profile structure
        return res.json({
          businessName: '',
          contactName: req.session.user.firstName || '',
          email: req.session.user.email || '',
          phone: '',
          address: '',
          city: '',
          state: '',
          zipCode: '',
          licenseNumber: '',
          licenseState: '',
          licenseExpiry: '',
          insuranceProvider: '',
          insurancePolicy: '',
          insuranceExpiry: '',
          servicesOffered: [],
          website: '',
          facebook: '',
          instagram: '',
          linkedin: '',
          bio: '',
          yearsExperience: '',
          profileImage: '',
          businessLogo: '',
          projectPhotos: []
        });
      }

      // CRITICAL FIX: Merge company photos into profile response
      let profileWithPhotos = { ...profile };
      if ((profile as any).companyId) {
        const company = await storage.getCompany((profile as any).companyId);
        if (company) {
          profileWithPhotos = {
            ...profile,
            businessLogo: company.businessLogo || '',
            projectPhotos: company.projectPhotos || []
          };
        }
      }

      res.json(profileWithPhotos);
    } catch (error) {
      console.error("Error fetching contractor profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/contractor/profile', async (req: any, res) => {
    try {
      console.log('[DEBUG] PUT /api/contractor/profile - Session:', {
        isAuthenticated: req.session?.isAuthenticated,
        role: req.session?.user?.role,
        userId: req.session?.user?.id
      });
      
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        console.log('[DEBUG] Unauthorized - session check failed');
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const profileData = req.body;
      
      console.log('[DEBUG] Updating contractor profile:', contractorId, 'with data keys:', Object.keys(profileData));

      const updatedProfile = await storage.updateContractorProfile(contractorId, profileData);
      console.log('[DEBUG] Profile updated successfully');
      res.json(updatedProfile);
    } catch (error) {
      console.error("[ERROR] Error updating contractor profile:", error);
      console.error("[ERROR] Error stack:", error instanceof Error ? error.stack : 'No stack trace');
      res.status(500).json({ message: "Failed to update profile", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Contractor licenses routes
  app.get('/api/contractor/licenses', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const licenses = await storage.getContractorLicenses(contractorId);
      res.json(licenses);
    } catch (error) {
      console.error("Error fetching contractor licenses:", error);
      res.status(500).json({ message: "Failed to fetch licenses" });
    }
  });

  app.post('/api/contractor/licenses', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const licenseData = { ...req.body, contractorId };
      const newLicense = await storage.createContractorLicense(licenseData);
      res.json(newLicense);
    } catch (error) {
      console.error("Error creating contractor license:", error);
      res.status(500).json({ message: "Failed to create license" });
    }
  });

  app.put('/api/contractor/licenses/:id', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const licenseId = req.params.id;
      const contractorId = req.session.user.id;
      const licenseData = req.body;
      
      const updatedLicense = await storage.updateContractorLicense(licenseId, contractorId, licenseData);
      if (!updatedLicense) {
        return res.status(404).json({ message: "License not found" });
      }
      
      res.json(updatedLicense);
    } catch (error) {
      console.error("Error updating contractor license:", error);
      res.status(500).json({ message: "Failed to update license" });
    }
  });

  app.delete('/api/contractor/licenses/:id', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const licenseId = req.params.id;
      const contractorId = req.session.user.id;
      
      const success = await storage.deleteContractorLicense(licenseId, contractorId);
      if (!success) {
        return res.status(404).json({ message: "License not found" });
      }
      
      res.json({ message: "License deleted successfully" });
    } catch (error) {
      console.error("Error deleting contractor license:", error);
      res.status(500).json({ message: "Failed to delete license" });
    }
  });

  // Service records routes
  app.get('/api/service-records', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const houseId = req.query.houseId as string;
      
      // For contractors, fetch their service records
      if (userRole === 'contractor') {
        const serviceRecords = await storage.getServiceRecords(userId);
        res.json(serviceRecords);
      } 
      // For homeowners, fetch service records filtered by house
      else {
        // If houseId is provided, verify it belongs to the user
        if (houseId) {
          const house = await storage.getHouse(houseId);
          if (!house || house.homeownerId !== userId) {
            return res.status(403).json({ message: "Access denied to house" });
          }
        }
        
        const serviceRecords = await storage.getServiceRecordsByHomeowner(userId, houseId);
        res.json(serviceRecords);
      }
    } catch (error) {
      console.error("Error fetching service records:", error);
      res.status(500).json({ message: "Failed to fetch service records" });
    }
  });

  app.get('/api/service-records/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const serviceRecord = await storage.getServiceRecord(id);
      if (!serviceRecord) {
        return res.status(404).json({ message: "Service record not found" });
      }
      res.json(serviceRecord);
    } catch (error) {
      console.error("Error fetching service record:", error);
      res.status(500).json({ message: "Failed to fetch service record" });
    }
  });

  app.post('/api/service-records', isAuthenticated, async (req: any, res) => {
    try {
      const contractorId = req.session.user.id;
      const serviceRecordData = {
        ...req.body,
        contractorId,
      };
      const serviceRecord = await storage.createServiceRecord(serviceRecordData);
      
      // Check for homeowner achievements if there's cost savings
      let newAchievements: any[] = [];
      if (serviceRecordData.homeownerId && serviceRecordData.cost) {
        try {
          newAchievements = await storage.checkAndAwardAchievements(serviceRecordData.homeownerId);
        } catch (error) {
          console.error("Error checking achievements:", error);
          // Don't fail the request if achievement check fails
        }
      }
      
      res.json({ serviceRecord, newAchievements });
    } catch (error) {
      console.error("Error creating service record:", error);
      res.status(500).json({ message: "Failed to create service record" });
    }
  });

  app.put('/api/service-records/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const serviceRecord = await storage.updateServiceRecord(id, req.body);
      if (!serviceRecord) {
        return res.status(404).json({ message: "Service record not found" });
      }
      
      // Check for homeowner achievements if cost was updated
      let newAchievements: any[] = [];
      if (serviceRecord.homeownerId && req.body.cost) {
        try {
          newAchievements = await storage.checkAndAwardAchievements(serviceRecord.homeownerId);
        } catch (error) {
          console.error("Error checking achievements:", error);
          // Don't fail the request if achievement check fails
        }
      }
      
      res.json({ serviceRecord, newAchievements });
    } catch (error) {
      console.error("Error updating service record:", error);
      res.status(500).json({ message: "Failed to update service record" });
    }
  });

  app.delete('/api/service-records/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteServiceRecord(id);
      if (!deleted) {
        return res.status(404).json({ message: "Service record not found" });
      }
      res.json({ message: "Service record deleted successfully" });
    } catch (error) {
      console.error("Error deleting service record:", error);
      res.status(500).json({ message: "Failed to delete service record" });
    }
  });

  // Homeowner service records endpoint
  app.get('/api/homeowner-service-records', isAuthenticated, async (req: any, res) => {
    try {
      const homeownerId = req.session.user.id;
      const serviceRecords = await storage.getHomeownerServiceRecords(homeownerId);
      
      // Enrich with contractor details
      const enrichedRecords = await Promise.all(
        serviceRecords.map(async (record) => {
          const contractor = await storage.getContractor(record.contractorId);
          return {
            ...record,
            contractorName: contractor?.name || 'Unknown Contractor',
            contractorCompany: contractor?.company || 'Unknown Company',
            contractorPhone: contractor?.phone || null,
            contractorEmail: contractor?.email || null
          };
        })
      );
      
      res.json(enrichedRecords);
    } catch (error) {
      console.error("Error fetching homeowner service records:", error);
      res.status(500).json({ message: "Failed to fetch service records" });
    }
  });

  // Customer service records routes
  app.get('/api/customer-service-records', isAuthenticated, async (req: any, res) => {
    try {
      const customerId = req.session.user.id;
      const customerEmail = req.session.user.email;
      
      // Get service records for this customer
      const serviceRecords = await storage.getCustomerServiceRecords(customerId, customerEmail);
      res.json(serviceRecords);
    } catch (error) {
      console.error("Error fetching customer service records:", error);
      res.status(500).json({ message: "Failed to fetch service records" });
    }
  });

  // Messaging API endpoints
  app.get('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      const conversations = await storage.getConversations(userId, userType);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ message: "Failed to fetch conversations" });
    }
  });

  app.get('/api/contractors/:contractorId/contacted-homeowners', isAuthenticated, async (req: any, res) => {
    try {
      const contractorId = req.params.contractorId;
      const userId = req.session.user.id;
      
      // Verify the user is the contractor or has permission
      if (userId !== contractorId && req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const homeowners = await storage.getContactedHomeowners(contractorId);
      res.json(homeowners);
    } catch (error) {
      console.error("Error fetching contacted homeowners:", error);
      res.status(500).json({ message: "Failed to fetch contacted homeowners" });
    }
  });

  app.get('/api/conversations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      // Check if user has access to this conversation
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType === 'homeowner' && conversation.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (userType === 'contractor' && conversation.contractorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(conversation);
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ message: "Failed to fetch conversation" });
    }
  });

  app.post('/api/conversations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        [userType === 'homeowner' ? 'homeownerId' : 'contractorId']: userId
      });
      
      // Check if conversation already exists between these parties
      const existingConversations = await storage.getConversations(userId, userType);
      const otherPartyId = userType === 'homeowner' ? conversationData.contractorId : conversationData.homeownerId;
      const existing = existingConversations.find(conv => 
        userType === 'homeowner' ? conv.contractorId === otherPartyId : conv.homeownerId === otherPartyId
      );
      
      if (existing) {
        return res.json(existing);
      }
      
      const conversation = await storage.createConversation(conversationData);
      res.status(201).json(conversation);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid conversation data", errors: error.errors });
      }
      console.error("Error creating conversation:", error);
      res.status(500).json({ message: "Failed to create conversation" });
    }
  });

  // Bulk message sending - create conversations with multiple contractors
  app.post('/api/conversations/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can send bulk messages" });
      }

      const { subject, message, contractorIds } = req.body;
      
      if (!subject || !message || !contractorIds || !Array.isArray(contractorIds) || contractorIds.length === 0) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const createdConversations = [];
      
      // Create a conversation with each contractor
      for (const contractorId of contractorIds) {
        // Check if conversation already exists
        const existingConversations = await storage.getConversations(userId, userType);
        const existing = existingConversations.find(conv => conv.contractorId === contractorId);
        
        let conversation;
        if (existing) {
          conversation = existing;
        } else {
          // Create new conversation
          const conversationData = insertConversationSchema.parse({
            homeownerId: userId,
            contractorId: contractorId,
            subject: subject
          });
          conversation = await storage.createConversation(conversationData);
        }
        
        // Send the message in this conversation
        const messageData = insertMessageSchema.parse({
          conversationId: conversation.id,
          senderId: userId,
          senderType: 'homeowner',
          message: message
        });
        
        await storage.createMessage(messageData);
        createdConversations.push(conversation);
      }

      res.json({ 
        success: true, 
        conversationsCreated: createdConversations.length,
        messagesSent: contractorIds.length 
      });
    } catch (error) {
      console.error("Error sending bulk messages:", error);
      res.status(500).json({ message: "Failed to send bulk messages" });
    }
  });

  app.get('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.session.user.id;
      
      // Verify user has access to this conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      const userType = req.session.user.role;
      if (userType === 'homeowner' && conversation.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (userType === 'contractor' && conversation.contractorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messages = await storage.getMessages(conversationId);
      
      // Mark messages as read
      await storage.markMessagesAsRead(conversationId, userId);
      
      res.json(messages);
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.post('/api/conversations/:id/messages', isAuthenticated, async (req: any, res) => {
    try {
      const conversationId = req.params.id;
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      // Verify user has access to this conversation
      const conversation = await storage.getConversation(conversationId);
      if (!conversation) {
        return res.status(404).json({ message: "Conversation not found" });
      }
      
      if (userType === 'homeowner' && conversation.homeownerId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      if (userType === 'contractor' && conversation.contractorId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId,
        senderId: userId,
        senderType: userType
      });
      
      const message = await storage.createMessage(messageData);
      res.status(201).json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid message data", errors: error.errors });
      }
      console.error("Error creating message:", error);
      res.status(500).json({ message: "Failed to create message" });
    }
  });

  app.get('/api/messages/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const count = await storage.getUnreadMessageCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread message count:", error);
      res.status(500).json({ message: "Failed to fetch unread message count" });
    }
  });

  // Review API endpoints
  app.get('/api/contractors/:id/reviews', async (req, res) => {
    try {
      const reviews = await storage.getContractorReviews(req.params.id);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching contractor reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get('/api/contractors/:id/rating', async (req, res) => {
    try {
      const rating = await storage.getContractorAverageRating(req.params.id);
      res.json(rating);
    } catch (error) {
      console.error("Error fetching contractor rating:", error);
      res.status(500).json({ message: "Failed to fetch rating" });
    }
  });

  // Check if homeowner can review contractor (requires exchanged messages)
  app.get('/api/contractors/:id/can-review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      const contractorId = req.params.id;
      
      // Only homeowners can review
      if (userType !== 'homeowner') {
        return res.json({ canReview: false, reason: "Only homeowners can review contractors" });
      }
      
      // Check if homeowner has exchanged messages with this contractor
      const conversations = await storage.getConversationsByUser(userId);
      const hasConversation = conversations.some(conv => 
        (conv.homeownerId === userId && conv.contractorId === contractorId) ||
        (conv.contractorId === userId && conv.homeownerId === contractorId)
      );
      
      if (!hasConversation) {
        return res.json({ canReview: false, reason: "You can only review contractors after exchanging messages with them" });
      }
      
      res.json({ canReview: true });
    } catch (error) {
      console.error("Error checking review eligibility:", error);
      res.status(500).json({ message: "Failed to check review eligibility" });
    }
  });

  app.post('/api/contractors/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      const contractorId = req.params.id;
      
      // Only homeowners can leave reviews
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can leave reviews" });
      }
      
      // Check if homeowner has exchanged messages with this contractor
      const conversations = await storage.getConversationsByUser(userId);
      const hasConversation = conversations.some(conv => 
        (conv.homeownerId === userId && conv.contractorId === contractorId) ||
        (conv.contractorId === userId && conv.homeownerId === contractorId)
      );
      
      if (!hasConversation) {
        return res.status(403).json({ message: "You can only review contractors after exchanging messages with them" });
      }
      
      const reviewData = insertContractorReviewSchema.parse({
        ...req.body,
        contractorId: contractorId,
        homeownerId: userId
      });
      
      const review = await storage.createContractorReview(reviewData);
      res.status(201).json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      console.error("Error creating review:", error);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get('/api/reviews/my-reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view their reviews" });
      }
      
      const reviews = await storage.getReviewsByHomeowner(userId);
      res.json(reviews);
    } catch (error) {
      console.error("Error fetching user reviews:", error);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.put('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can edit reviews" });
      }
      
      // Check if the review belongs to the user
      const reviews = await storage.getReviewsByHomeowner(userId);
      const existingReview = reviews.find(r => r.id === req.params.id);
      
      if (!existingReview) {
        return res.status(404).json({ message: "Review not found or access denied" });
      }
      
      const reviewData = insertContractorReviewSchema.partial().parse(req.body);
      const review = await storage.updateContractorReview(req.params.id, reviewData);
      
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      res.json(review);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid review data", errors: error.errors });
      }
      console.error("Error updating review:", error);
      res.status(500).json({ message: "Failed to update review" });
    }
  });

  app.delete('/api/reviews/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can delete reviews" });
      }
      
      // Check if the review belongs to the user
      const reviews = await storage.getReviewsByHomeowner(userId);
      const existingReview = reviews.find(r => r.id === req.params.id);
      
      if (!existingReview) {
        return res.status(404).json({ message: "Review not found or access denied" });
      }
      
      const deleted = await storage.deleteContractorReview(req.params.id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      res.json({ message: "Review deleted successfully" });
    } catch (error) {
      console.error("Error deleting review:", error);
      res.status(500).json({ message: "Failed to delete review" });
    }
  });

  // Analytics API endpoints
  app.post('/api/analytics/track', async (req: any, res) => {
    try {
      // Remove homeownerId from client data and set from session if available
      const { homeownerId, ...clientData } = req.body;
      
      const analyticsData = insertContractorAnalyticsSchema.parse({
        ...clientData,
        homeownerId: req.session?.user?.id || null, // Override with server-side user ID
        ipAddress: req.ip || req.connection.remoteAddress || null
      });
      
      const analytics = await storage.trackContractorClick(analyticsData);
      res.status(201).json({ success: true, id: analytics.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid analytics data", errors: error.errors });
      }
      console.error("Error tracking analytics:", error);
      // Fail silently for analytics to not break user experience
      res.status(200).json({ success: true });
    }
  });

  app.get('/api/analytics/contractor/:contractorId', isAuthenticated, async (req: any, res) => {
    try {
      const contractorId = req.params.contractorId;
      const { startDate, endDate } = req.query;
      
      // Only allow contractors to access their own analytics
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Access denied - not a contractor" });
      }
      
      // Check if the contractorId matches the authenticated user's ID
      if (req.session.user.id !== contractorId) {
        return res.status(403).json({ message: "Access denied - can only view own analytics" });
      }

      const analytics = await storage.getContractorAnalytics(
        contractorId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching contractor analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get('/api/analytics/contractor/:contractorId/monthly/:year/:month', isAuthenticated, async (req: any, res) => {
    try {
      const contractorId = req.params.contractorId;
      const year = parseInt(req.params.year);
      const month = parseInt(req.params.month);
      
      // Only allow contractors to access their own analytics
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Access denied - not a contractor" });
      }
      
      // Check if the contractorId matches the authenticated user's ID
      if (req.session.user.id !== contractorId) {
        return res.status(403).json({ message: "Access denied - can only view own analytics" });
      }

      const stats = await storage.getContractorMonthlyStats(contractorId, year, month);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching monthly stats:", error);
      res.status(500).json({ message: "Failed to fetch monthly stats" });
    }
  });

  // Regional API endpoints for international expansion
  
  // Countries endpoints
  app.get('/api/countries', async (req: any, res) => {
    try {
      // Temporarily use direct SQL to test international expansion functionality
      const result = await pool.query('SELECT * FROM countries ORDER BY name');
      res.json(result.rows);
    } catch (error) {
      console.error("Error fetching countries:", error);
      // Fallback to storage interface
      try {
        const countries = await storage.getCountries();
        res.json(countries);
      } catch (storageError) {
        console.error("Error fetching countries from storage:", storageError);
        res.status(500).json({ message: "Failed to fetch countries" });
      }
    }
  });

  app.get('/api/countries/:id', async (req: any, res) => {
    try {
      const country = await storage.getCountry(req.params.id);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      console.error("Error fetching country:", error);
      res.status(500).json({ message: "Failed to fetch country" });
    }
  });

  app.get('/api/countries/code/:code', async (req: any, res) => {
    try {
      const country = await storage.getCountryByCode(req.params.code);
      if (!country) {
        return res.status(404).json({ message: "Country not found" });
      }
      res.json(country);
    } catch (error) {
      console.error("Error fetching country by code:", error);
      res.status(500).json({ message: "Failed to fetch country" });
    }
  });

  // Regions endpoints
  app.get('/api/countries/:countryId/regions', async (req: any, res) => {
    try {
      const regions = await storage.getRegionsByCountry(req.params.countryId);
      res.json(regions);
    } catch (error) {
      console.error("Error fetching regions:", error);
      res.status(500).json({ message: "Failed to fetch regions" });
    }
  });

  app.get('/api/regions/:id', async (req: any, res) => {
    try {
      const region = await storage.getRegion(req.params.id);
      if (!region) {
        return res.status(404).json({ message: "Region not found" });
      }
      res.json(region);
    } catch (error) {
      console.error("Error fetching region:", error);
      res.status(500).json({ message: "Failed to fetch region" });
    }
  });

  // Climate zones endpoints
  app.get('/api/countries/:countryId/climate-zones', async (req: any, res) => {
    try {
      const climateZones = await storage.getClimateZonesByCountry(req.params.countryId);
      res.json(climateZones);
    } catch (error) {
      console.error("Error fetching climate zones:", error);
      res.status(500).json({ message: "Failed to fetch climate zones" });
    }
  });

  app.get('/api/climate-zones/:id', async (req: any, res) => {
    try {
      const climateZone = await storage.getClimateZone(req.params.id);
      if (!climateZone) {
        return res.status(404).json({ message: "Climate zone not found" });
      }
      res.json(climateZone);
    } catch (error) {
      console.error("Error fetching climate zone:", error);
      res.status(500).json({ message: "Failed to fetch climate zone" });
    }
  });

  // Regulatory bodies endpoints
  app.get('/api/regions/:regionId/regulatory-bodies', async (req: any, res) => {
    try {
      const regulatoryBodies = await storage.getRegulatoryBodiesByRegion(req.params.regionId);
      res.json(regulatoryBodies);
    } catch (error) {
      console.error("Error fetching regulatory bodies by region:", error);
      res.status(500).json({ message: "Failed to fetch regulatory bodies" });
    }
  });

  app.get('/api/countries/:countryId/regulatory-bodies', async (req: any, res) => {
    try {
      const regulatoryBodies = await storage.getRegulatoryBodiesByCountry(req.params.countryId);
      res.json(regulatoryBodies);
    } catch (error) {
      console.error("Error fetching regulatory bodies by country:", error);
      res.status(500).json({ message: "Failed to fetch regulatory bodies" });
    }
  });

  app.get('/api/regulatory-bodies/:id', async (req: any, res) => {
    try {
      const regulatoryBody = await storage.getRegulatoryBody(req.params.id);
      if (!regulatoryBody) {
        return res.status(404).json({ message: "Regulatory body not found" });
      }
      res.json(regulatoryBody);
    } catch (error) {
      console.error("Error fetching regulatory body:", error);
      res.status(500).json({ message: "Failed to fetch regulatory body" });
    }
  });

  // Regional maintenance tasks endpoints
  app.get('/api/maintenance-tasks/regional', async (req: any, res) => {
    try {
      const { countryId, climateZoneId, month } = req.query;
      
      if (!countryId) {
        return res.status(400).json({ message: "countryId is required" });
      }

      const tasks = await storage.getRegionalMaintenanceTasks(
        countryId as string,
        climateZoneId as string | undefined,
        month ? parseInt(month as string) : undefined
      );
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching regional maintenance tasks:", error);
      res.status(500).json({ message: "Failed to fetch regional maintenance tasks" });
    }
  });

  app.get('/api/maintenance-tasks/regional/:id', async (req: any, res) => {
    try {
      const task = await storage.getRegionalMaintenanceTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Regional maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Error fetching regional maintenance task:", error);
      res.status(500).json({ message: "Failed to fetch regional maintenance task" });
    }
  });

  // Task completion endpoints for achievements
  app.get('/api/task-completions', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const completions = await storage.getTaskCompletions(homeownerId, req.query.houseId as string);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching task completions:", error);
      res.status(500).json({ message: "Failed to fetch task completions" });
    }
  });

  app.post('/api/task-completions', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const completionData = insertTaskCompletionSchema.parse({
        ...req.body,
        homeownerId,
      });

      const completion = await storage.createTaskCompletion(completionData);

      // Check and award achievements using new system
      let newAchievements: any[] = [];
      try {
        newAchievements = await storage.checkAndAwardAchievements(homeownerId);
      } catch (error) {
        console.error("Error checking achievements:", error);
        // Don't fail the request if achievement check fails
      }

      res.json({ completion, newAchievements });
    } catch (error) {
      console.error("Error creating task completion:", error);
      res.status(500).json({ message: "Failed to create task completion" });
    }
  });

  app.get('/api/task-completions/streak', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const streak = await storage.getMonthlyStreak(homeownerId);
      res.json(streak);
    } catch (error) {
      console.error("Error fetching streak:", error);
      res.status(500).json({ message: "Failed to fetch streak" });
    }
  });

  // Achievement endpoints
  app.get('/api/achievements', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const achievements = await storage.getAchievements(homeownerId);
      
      // Also return progress toward locked achievements
      const taskCount = (await storage.getTaskCompletions(homeownerId)).length;
      const contractorCount = await storage.getContractorHireCount(homeownerId);
      const { currentStreak, longestStreak } = await storage.getMonthlyStreak(homeownerId);
      
      res.json({
        achievements,
        progress: {
          tasksCompleted: taskCount,
          contractorsHired: contractorCount,
          currentStreak,
          longestStreak,
        },
      });
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  app.post('/api/achievements/contractor-hired', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorCount = await storage.getContractorHireCount(homeownerId);
      
      // Check milestones: 1st, 3rd, 5th, 10th contractor
      const milestones = [
        { count: 1, type: 'contractor_hired_1', title: 'First Hire!', description: 'You hired your first contractor' },
        { count: 3, type: 'contractor_hired_3', title: 'Building Trust', description: 'You hired 3 contractors' },
        { count: 5, type: 'contractor_hired_5', title: 'Growing Network', description: 'You hired 5 contractors' },
        { count: 10, type: 'contractor_hired_10', title: 'Community Builder', description: 'You hired 10 contractors' },
      ];

      for (const milestone of milestones) {
        if (contractorCount >= milestone.count && !(await storage.hasAchievement(homeownerId, milestone.type))) {
          await storage.createAchievement({
            homeownerId,
            achievementType: milestone.type,
            achievementTitle: milestone.title,
            achievementDescription: milestone.description,
            metadata: JSON.stringify({ contractorCount }),
          });
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error checking contractor hire achievement:", error);
      res.status(500).json({ message: "Failed to check achievement" });
    }
  });

  app.post('/api/achievements/referral', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const { referredUserId } = req.body;
      
      // Create referral achievement (can have multiple)
      await storage.createAchievement({
        homeownerId,
        achievementType: `referral_${referredUserId}`, // Make it unique per referral
        achievementTitle: 'Referral Success!',
        achievementDescription: 'You referred a new user to Home Base',
        metadata: JSON.stringify({ referredUserId }),
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error creating referral achievement:", error);
      res.status(500).json({ message: "Failed to create referral achievement" });
    }
  });

  // New achievement system endpoints
  // GET /api/achievements - Returns all achievement definitions with user progress
  app.get('/api/achievements', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      const { category } = req.query;
      
      // Get all definitions (or filtered by category)
      let definitions;
      if (category) {
        definitions = await storage.getAchievementDefinitionsByCategory(category as string);
      } else {
        definitions = await storage.getAllAchievementDefinitions();
      }
      
      // If user is authenticated, merge with their progress
      if (homeownerId) {
        const userAchievements = await storage.getUserAchievements(homeownerId);
        
        const achievementsWithProgress = definitions.map(def => {
          const userAchiev = userAchievements.find(ua => ua.achievementKey === def.achievementKey);
          return {
            ...def,
            progress: userAchiev ? parseFloat(userAchiev.progress?.toString() || "0") : 0,
            isUnlocked: userAchiev?.isUnlocked || false,
            unlockedAt: userAchiev?.unlockedAt || null,
            metadata: userAchiev?.metadata || null
          };
        });
        
        res.json(achievementsWithProgress);
      } else {
        // If not authenticated, just return definitions without progress
        res.json(definitions.map(def => ({
          ...def,
          progress: 0,
          isUnlocked: false,
          unlockedAt: null,
          metadata: null
        })));
      }
    } catch (error) {
      console.error("Error fetching achievements:", error);
      res.status(500).json({ message: "Failed to fetch achievements" });
    }
  });

  // GET /api/achievements/user - Returns only the user's earned/unlocked achievements
  app.get('/api/achievements/user', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const userAchievements = await storage.getUserAchievements(homeownerId);
      const definitions = await storage.getAllAchievementDefinitions();
      
      // Return only unlocked achievements with full definition data
      const unlockedAchievements = userAchievements
        .filter(ua => ua.isUnlocked)
        .map(ua => {
          const def = definitions.find(d => d.achievementKey === ua.achievementKey);
          return {
            ...def,
            ...ua,
            progress: parseFloat(ua.progress?.toString() || "100")
          };
        })
        .filter(a => a.id); // Filter out any that didn't match a definition
      
      res.json(unlockedAchievements);
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      res.status(500).json({ message: "Failed to fetch user achievements" });
    }
  });

  app.post('/api/achievements/check', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const newlyUnlocked = await storage.checkAndAwardAchievements(homeownerId);
      
      res.json({
        success: true,
        newlyUnlocked: newlyUnlocked.map(ua => ({
          achievementKey: ua.achievementKey,
          unlockedAt: ua.unlockedAt
        }))
      });
    } catch (error) {
      console.error("Error checking and awarding achievements:", error);
      res.status(500).json({ message: "Failed to check achievements" });
    }
  });

  app.get('/api/achievements/progress/:achievementKey', async (req: any, res) => {
    try {
      const homeownerId = req.session?.user?.id;
      if (!homeownerId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { achievementKey } = req.params;
      const progress = await storage.getAchievementProgress(homeownerId, achievementKey);
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching achievement progress:", error);
      res.status(500).json({ message: "Failed to fetch achievement progress" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
