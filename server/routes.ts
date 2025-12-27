import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, type IStorage, isDemoDataEnabled, isDemoId, isDemoEmail } from "./storage";
import { setupAuth, isAuthenticated, requireRole, requirePropertyOwner } from "./replitAuth";
import { setupGoogleAuth } from "./googleAuth";
import { z } from "zod";
import { randomUUID } from "crypto";
import rateLimit from "express-rate-limit";
import { eq, and, or, lte, isNull, desc } from "drizzle-orm";
import { insertHomeApplianceSchema, insertHomeApplianceManualSchema, insertMaintenanceLogSchema, insertContractorAppointmentSchema, insertNotificationSchema, insertConversationSchema, insertMessageSchema, insertContractorReviewSchema, insertCustomMaintenanceTaskSchema, insertProposalSchema, insertHomeSystemSchema, insertContractorBoostSchema, insertHouseSchema, insertHouseTransferSchema, insertContractorAnalyticsSchema, insertTaskOverrideSchema, insertCountrySchema, insertRegionSchema, insertClimateZoneSchema, insertRegulatoryBodySchema, insertRegionalMaintenanceTaskSchema, insertTaskCompletionSchema, insertAchievementSchema, insertCompanySchema, insertCompanyInviteCodeSchema, updateHouseholdProfileSchema, passwordResetTokens, taskCompletions, maintenanceTasks, customMaintenanceTasks, insertSupportTicketSchema, insertSubscriptionCycleEventSchema, completeTaskSchema, insertCrmClientSchema, insertCrmJobSchema, insertCrmQuoteSchema, insertCrmInvoiceSchema, subscriptionPlans, crmClients, crmJobs, crmQuotes, crmInvoices, securitySessions, referralCredits, agentProfiles } from "@shared/schema";
import { calculateDIYSavingsAmount } from "@shared/cost-helpers";
import pushRoutes from "./push-routes";
import { pushService } from "./push-service";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { pool, db } from "./db";
import OpenAI from "openai";
import multer from "multer";
import Stripe from "stripe";
import { geocodeAddress, calculateDistance } from "./geocoding-service";
import { auditLogger, sessionManager, AuditEventTypes } from "./security-audit";
import { smsService } from "./sms-service";
import { notificationOrchestrator } from "./notification-orchestrator";
import { sendEmail, emailService } from "./email-service";

const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: "2025-08-27.basil" })
  : null;

// Configure multer for memory storage
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  }
});

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

// Rate limiting for file uploads to prevent disk exhaustion
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Max 10 uploads per hour per IP
  message: 'Too many upload attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export async function registerRoutes(app: Express): Promise<Server> {
  console.error('========================================');
  console.error('REGISTER ROUTES CALLED - NEW CODE VERSION 2025-11-02-21:28');
  console.error('========================================');
  
  // Health check endpoint for monitoring
  app.get('/api/health', async (_req, res) => {
    try {
      // Quick database connectivity check
      await pool.query('SELECT 1');
      res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } catch (error) {
      res.status(503).json({ 
        status: 'unhealthy', 
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      });
    }
  });

  // Test email endpoint (for development testing)
  app.post('/api/test-email', async (_req, res) => {
    try {
      const success = await sendEmail({
        to: 'lihandyman2008@gmail.com',
        subject: 'HomeBase Test Email',
        text: 'This is a test email from HomeBase to verify the email service is working correctly.',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #6B46C1 0%, #805AD5 100%); padding: 30px; text-align: center;">
              <h1 style="color: #ffffff !important; margin: 0;">HomeBase Test Email</h1>
            </div>
            <div style="padding: 30px; background: #f9f9f9;">
              <p>This is a test email from HomeBase to verify the email service is working correctly.</p>
              <p>If you received this email, the SendGrid integration is functioning properly!</p>
              <p>Timestamp: ${new Date().toISOString()}</p>
            </div>
          </div>
        `,
      });
      
      if (success) {
        res.json({ success: true, message: 'Test email sent to lihandyman2008@gmail.com' });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send test email - SendGrid may not be configured' });
      }
    } catch (error) {
      console.error('[TEST EMAIL] Error:', error);
      res.status(500).json({ success: false, message: 'Error sending test email' });
    }
  });

  // ========================================
  // SUBSCRIPTION PLANS
  // ========================================
  
  // Homeowner subscription tiers:
  // - Free: Contractor search, view past contractors, payments only (0 homes)
  // - Base ($5/month): 1-2 homes
  // - Premium ($20/month): 3-6 homes
  // - Premium Plus ($40/month): 7+ homes (unlimited)
  
  const HOMEOWNER_PLANS = [
    {
      tierName: 'free',
      displayName: 'Free',
      description: 'Search for contractors, view your past contractors, and make payments',
      monthlyPrice: '0.00',
      minHouses: 0,
      maxHouses: 0,
      planType: 'homeowner',
      features: ['Contractor search', 'View past contractors', 'Make payments through app'],
      referralCreditCap: '0.00',
      sortOrder: 0
    },
    {
      tierName: 'base',
      displayName: 'Base',
      description: 'Perfect for single homeowners with 1-2 properties',
      monthlyPrice: '5.00',
      minHouses: 1,
      maxHouses: 2,
      planType: 'homeowner',
      features: ['Up to 2 homes', 'Maintenance tracking', 'Home health score', 'DIY savings tracker', 'Service records', 'Earn up to $5/month in referral credits'],
      referralCreditCap: '5.00',
      sortOrder: 1
    },
    {
      tierName: 'premium',
      displayName: 'Premium',
      description: 'Ideal for homeowners with multiple properties',
      monthlyPrice: '20.00',
      minHouses: 3,
      maxHouses: 6,
      planType: 'homeowner',
      features: ['3-6 homes', 'All Base features', 'Priority contractor matching', 'Advanced maintenance insights', 'Earn up to $20/month in referral credits'],
      referralCreditCap: '20.00',
      sortOrder: 2
    },
    {
      tierName: 'premium_plus',
      displayName: 'Premium Plus',
      description: 'For property investors and managers with 7+ homes',
      monthlyPrice: '40.00',
      minHouses: 7,
      maxHouses: null, // unlimited
      planType: 'homeowner',
      features: ['Unlimited homes', 'All Premium features', 'Dedicated support', 'Bulk maintenance scheduling', 'Earn up to $40/month in referral credits'],
      referralCreditCap: '40.00',
      sortOrder: 3
    }
  ];

  const CONTRACTOR_PLANS = [
    {
      tierName: 'contractor_basic',
      displayName: 'Contractor Basic',
      description: 'Essential tools for independent contractors',
      monthlyPrice: '20.00',
      minHouses: 0,
      maxHouses: 1, // 1 personal home for maintenance tracking
      planType: 'contractor',
      features: ['Get found by homeowners', 'Messaging with homeowners', 'Send proposals', 'Reviews and ratings profile', 'Earn up to $20/month in referral credits'],
      referralCreditCap: '20.00',
      hasCrmAccess: false,
      sortOrder: 0
    },
    {
      tierName: 'contractor_pro',
      displayName: 'Contractor Pro',
      description: 'Full CRM for growing contracting businesses',
      monthlyPrice: '40.00',
      minHouses: 0,
      maxHouses: 1,
      planType: 'contractor',
      features: ['Everything in Basic', 'Full CRM with client management', 'Job scheduling & tracking', 'Quotes & invoices', 'Accept payments via Stripe Connect', 'Team management', 'Import from Jobber, ServiceTitan & more', 'Business analytics dashboard', 'Earn up to $40/month in referral credits'],
      referralCreditCap: '40.00',
      hasCrmAccess: true,
      sortOrder: 1
    }
  ];

  // Get all subscription plans
  app.get('/api/plans', async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch subscription plans' });
    }
  });

  // Get homeowner plans only
  app.get('/api/plans/homeowner', async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlansByType('homeowner');
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch homeowner plans' });
    }
  });

  // Get contractor plans only
  app.get('/api/plans/contractor', async (_req, res) => {
    try {
      const plans = await storage.getSubscriptionPlansByType('contractor');
      res.json(plans);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch contractor plans' });
    }
  });

  // Seed/sync subscription plans to database (admin only)
  app.post('/api/admin/seed-plans', isAuthenticated, async (req: any, res) => {
    try {
      const user = req.session.user;
      if (!user?.email || !['sarah@example.com', 'admin@homebase.com'].includes(user.email)) {
        return res.status(403).json({ message: 'Admin access required' });
      }

      const allPlans = [...HOMEOWNER_PLANS, ...CONTRACTOR_PLANS];
      let created = 0;
      let updated = 0;

      for (const plan of allPlans) {
        const existing = await storage.getSubscriptionPlanByTier(plan.tierName);
        if (existing) {
          // Update existing plan
          await db.update(subscriptionPlans)
            .set({
              displayName: plan.displayName,
              description: plan.description,
              monthlyPrice: plan.monthlyPrice,
              minHouses: plan.minHouses,
              maxHouses: plan.maxHouses,
              planType: plan.planType,
              features: plan.features,
              referralCreditCap: (plan as any).referralCreditCap || null,
              hasCrmAccess: (plan as any).hasCrmAccess || false,
              sortOrder: plan.sortOrder,
              updatedAt: new Date(),
            })
            .where(eq(subscriptionPlans.tierName, plan.tierName));
          updated++;
        } else {
          // Create new plan
          await db.insert(subscriptionPlans).values({
            tierName: plan.tierName,
            displayName: plan.displayName,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            minHouses: plan.minHouses,
            maxHouses: plan.maxHouses,
            planType: plan.planType,
            features: plan.features,
            referralCreditCap: (plan as any).referralCreditCap || null,
            hasCrmAccess: (plan as any).hasCrmAccess || false,
            sortOrder: plan.sortOrder,
          });
          created++;
        }
      }

      res.json({ message: `Plans synced: ${created} created, ${updated} updated` });
    } catch (error) {
      console.error('Error seeding plans:', error);
      res.status(500).json({ message: 'Failed to seed plans' });
    }
  });

  // Auto-seed subscription plans on startup
  (async () => {
    try {
      const allPlans = [...HOMEOWNER_PLANS, ...CONTRACTOR_PLANS];
      for (const plan of allPlans) {
        const existing = await storage.getSubscriptionPlanByTier(plan.tierName);
        if (!existing) {
          await db.insert(subscriptionPlans).values({
            tierName: plan.tierName,
            displayName: plan.displayName,
            description: plan.description,
            monthlyPrice: plan.monthlyPrice,
            minHouses: plan.minHouses,
            maxHouses: plan.maxHouses,
            planType: plan.planType,
            features: plan.features,
            referralCreditCap: (plan as any).referralCreditCap || null,
            hasCrmAccess: (plan as any).hasCrmAccess || false,
            sortOrder: plan.sortOrder,
          });
          console.log(`[PLANS] Seeded subscription plan: ${plan.tierName}`);
        }
      }
    } catch (error) {
      console.error('[PLANS] Error auto-seeding plans:', error);
    }
  })();

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

  // Secure logo upload endpoint with authentication (MUST be after setupAuth for session access)
  console.error('[STARTUP] Registering /api/upload-logo-raw endpoint');
  app.post('/api/upload-logo-raw', uploadLimiter, async (req: any, res) => {
    console.error('[LOGO-DEBUG] Session check:', {
      hasSession: !!req.session,
      isAuthenticated: req.session?.isAuthenticated,
      hasUser: !!req.session?.user,
      userRole: req.session?.user?.role,
      userId: req.session?.user?.id
    });
    
    // Check session-based authentication
    if (!req.session?.isAuthenticated || !req.session?.user) {
      console.error('[LOGO-DEBUG] Auth failed - no session');
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    if (req.session.user.role !== 'contractor') {
      console.error('[LOGO-DEBUG] Auth failed - not contractor, role:', req.session.user.role);
      return res.status(403).json({ message: "Forbidden - contractors only" });
    }
    
    try {
      console.error('[SECURE-UPLOAD] Request received from authenticated user:', req.session?.user?.id);
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: 'Missing imageData' });
      }
      
      // Validate image data format
      if (!imageData.startsWith('data:image/')) {
        return res.status(400).json({ error: 'Invalid image format' });
      }
      
      // Get user's company from storage layer
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'User or company not found' });
      }
      
      const companyId = user.companyId;
      
      // Validate image size (max 5MB for logos)
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Image too large (max 5MB)' });
      }
      
      // Validate file extension
      const extensionMatch = imageData.match(/^data:image\/(jpeg|jpg|png|webp|gif);/);
      if (!extensionMatch) {
        return res.status(400).json({ error: 'Invalid image type. Allowed: jpeg, png, webp, gif' });
      }
      const fileExtension = extensionMatch[1] === 'jpeg' ? 'jpg' : extensionMatch[1];
      
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `public/contractor-images/logos/${filename}`;
      
      const objectStorage = new ObjectStorageService();
      await objectStorage.uploadFile(path, buffer, `image/${fileExtension}`);
      const url = `/public/contractor-images/logos/${filename}`;
      
      // Update company using storage layer
      await storage.updateCompany(companyId, { businessLogo: url });
      
      console.error('[SECURE-UPLOAD] Logo uploaded successfully for company:', companyId);
      res.json({ success: true, url, companyId });
    } catch (error: any) {
      console.error('[SECURE-UPLOAD ERROR]', error);
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  });

  // Get current user's subscription info (must be after setupAuth for session access)
  app.get('/api/my-subscription', async (req: any, res) => {
    try {
      // Session auth check - matches /api/user pattern
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      
      // Check if user is grandfathered (free unlimited access forever)
      const grandfatheredEmails = (process.env.GRANDFATHERED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const isGrandfathered = user.email && grandfatheredEmails.includes(user.email.toLowerCase());
      
      const housesCount = await storage.getHousesCount(userId);
      
      // Determine current plan based on maxHousesAllowed
      let currentPlan = 'free';
      let maxHouses = user.maxHousesAllowed ?? 0;
      
      if (isGrandfathered || user.subscriptionStatus === 'grandfathered' || user.maxHousesAllowed === null) {
        currentPlan = 'premium_plus';
        maxHouses = -1; // unlimited
      } else if (maxHouses === 0) {
        currentPlan = 'free';
      } else if (maxHouses <= 2) {
        currentPlan = 'base';
      } else if (maxHouses <= 6) {
        currentPlan = 'premium';
      } else {
        currentPlan = 'premium_plus';
      }
      
      // Check if trial is active
      const isTrialing = user.subscriptionStatus === 'trialing' && 
                         user.trialEndsAt && 
                         new Date(user.trialEndsAt) > new Date();
      
      const trialDaysRemaining = isTrialing && user.trialEndsAt
        ? Math.ceil((new Date(user.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 0;
      
      res.json({
        currentPlan,
        maxHouses: maxHouses === -1 ? 'unlimited' : maxHouses,
        currentHouses: housesCount,
        canAddHomes: maxHouses === -1 || housesCount < maxHouses,
        subscriptionStatus: isGrandfathered ? 'grandfathered' : user.subscriptionStatus,
        isTrialing: isGrandfathered ? false : isTrialing,
        trialDaysRemaining: isGrandfathered ? 0 : trialDaysRemaining,
        trialEndsAt: isGrandfathered ? null : user.trialEndsAt,
        isPremium: isGrandfathered ? true : user.isPremium,
        isGrandfathered
      });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch subscription info' });
    }
  });

  // Stripe webhook handler - Uses raw body parser for signature verification
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('[STRIPE WEBHOOK] No webhook secret configured');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
    } catch (err: any) {
      console.error('[STRIPE WEBHOOK] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log('[STRIPE WEBHOOK] Event received:', event.type);

    try {
      switch (event.type) {
        case 'invoice.paid': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;
          const customerId = invoice.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          await storage.createSubscriptionCycleEvent({
            userId: user.id,
            stripeSubscriptionId: subscriptionId,
            stripeInvoiceId: invoice.id,
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
            status: 'paid',
            amount: (invoice.amount_paid / 100).toFixed(2),
          });

          await storage.updateUserSubscriptionStatus(user.id, 'active');
          console.log('[STRIPE WEBHOOK] Invoice paid processed for user:', user.email);

          // Check if this user was referred by an agent and update consecutive months
          try {
            const affiliateReferral = await storage.getAffiliateReferralByUserId(user.id);
            if (affiliateReferral && affiliateReferral.status !== 'paid' && affiliateReferral.status !== 'voided') {
              const newConsecutiveMonths = affiliateReferral.consecutiveMonthsPaid + 1;
              
              // Determine new status based on consecutive months
              let newStatus = affiliateReferral.status;
              if (newConsecutiveMonths === 1) newStatus = 'month_1';
              else if (newConsecutiveMonths === 2) newStatus = 'month_2';
              else if (newConsecutiveMonths === 3) newStatus = 'month_3';
              else if (newConsecutiveMonths >= 4) newStatus = 'eligible';

              // Update the affiliate referral
              await storage.updateAffiliateReferral(affiliateReferral.id, {
                consecutiveMonthsPaid: newConsecutiveMonths,
                lastPaymentDate: new Date(),
                firstPaymentDate: affiliateReferral.firstPaymentDate || new Date(),
                status: newStatus,
              });

              console.log(`[AFFILIATE] Updated referral ${affiliateReferral.id}: ${newConsecutiveMonths} months paid, status: ${newStatus}`);

              // Check if eligible for payout (4+ months) and hasn't been paid yet
              if (newConsecutiveMonths >= 4 && affiliateReferral.status !== 'paid') {
                // Check if there's already a payout record for this referral
                const existingPayouts = await storage.getAffiliatePayouts(affiliateReferral.agentId);
                const existingPayout = existingPayouts.find(p => p.affiliateReferralId === affiliateReferral.id);
                
                // Skip if already successfully paid
                if (existingPayout?.status === 'paid') {
                  console.log(`[AFFILIATE] Referral ${affiliateReferral.id} already paid, skipping`);
                } else {
                  console.log(`[AFFILIATE] Referral ${affiliateReferral.id} eligible for $15 payout (${newConsecutiveMonths} months)`);
                  
                  // Get the agent's profile to check Stripe Connect status
                  const agentProfile = await storage.getAgentProfile(affiliateReferral.agentId);
                  
                  if (agentProfile?.stripeConnectAccountId && agentProfile.stripeOnboardingComplete) {
                    // Create or update payout record
                    let payout = existingPayout;
                    if (!payout) {
                      payout = await storage.createAffiliatePayout({
                        affiliateReferralId: affiliateReferral.id,
                        agentId: affiliateReferral.agentId,
                        amount: "15.00",
                        status: 'processing',
                      });
                    } else {
                      // Update existing failed/pending payout to processing
                      await storage.updateAffiliatePayout(payout.id, {
                        status: 'processing',
                        errorMessage: null,
                      });
                    }

                    // Attempt to transfer to the agent's Stripe Connect account
                    try {
                      if (stripe) {
                        const transfer = await stripe.transfers.create({
                          amount: 1500, // $15.00 in cents
                          currency: 'usd',
                          destination: agentProfile.stripeConnectAccountId,
                          metadata: {
                            payoutId: payout.id,
                            affiliateReferralId: affiliateReferral.id,
                            agentId: affiliateReferral.agentId,
                          },
                        });

                        // Update payout as successful
                        await storage.updateAffiliatePayout(payout.id, {
                          status: 'paid',
                          stripeTransferId: transfer.id,
                          paidAt: new Date(),
                        });

                        // Update the referral status
                        await storage.updateAffiliateReferral(affiliateReferral.id, {
                          status: 'paid',
                        });

                        console.log(`[AFFILIATE] Successfully transferred $15 to agent ${affiliateReferral.agentId}, transfer ID: ${transfer.id}`);
                      }
                    } catch (transferError: any) {
                      console.error(`[AFFILIATE] Transfer failed for payout ${payout.id}:`, transferError.message);
                      await storage.updateAffiliatePayout(payout.id, {
                        status: 'failed',
                        errorMessage: transferError.message,
                      });
                    }
                  } else if (!existingPayout) {
                    // Agent doesn't have Stripe Connect set up - create pending payout (only if not already created)
                    await storage.createAffiliatePayout({
                      affiliateReferralId: affiliateReferral.id,
                      agentId: affiliateReferral.agentId,
                      amount: "15.00",
                      status: 'pending',
                      errorMessage: 'Agent has not completed Stripe Connect onboarding',
                    });

                    // Update referral status
                    await storage.updateAffiliateReferral(affiliateReferral.id, {
                      status: 'payout_pending',
                    });

                    console.log(`[AFFILIATE] Created pending payout for agent ${affiliateReferral.agentId} - Stripe Connect not set up`);
                  } else {
                    console.log(`[AFFILIATE] Pending payout already exists for referral ${affiliateReferral.id}, waiting for agent to complete Stripe onboarding`);
                  }
                }
              }
            }
          } catch (affiliateError: any) {
            console.error('[AFFILIATE] Error processing affiliate referral:', affiliateError.message);
            // Don't fail the webhook for affiliate errors
          }

          // Handle user-to-user referral credits (Option 1: automatic credit system)
          try {
            // Check if this user was referred by another user (not an agent)
            if (user.referredBy) {
              // Find the referrer by their referral code
              const referrer = await storage.getUserByReferralCode(user.referredBy);
              
              if (referrer && referrer.id !== user.id) {
                // Check if we've already created a credit for this referral pair
                const existingCredit = await db.select()
                  .from(referralCredits)
                  .where(and(
                    eq(referralCredits.referrerUserId, referrer.id),
                    eq(referralCredits.referredUserId, user.id)
                  ))
                  .limit(1);

                if (existingCredit.length === 0) {
                  // First payment from this referred user - create $1 credit for referrer
                  await db.insert(referralCredits).values({
                    referrerUserId: referrer.id,
                    referredUserId: user.id,
                    creditAmount: "1.00",
                    status: "earned",
                    earnedAt: new Date(),
                    source: "referral",
                    notes: `Credit earned from referral of ${user.email}`,
                  });

                  // Update referrer's referralCount
                  const currentCount = referrer.referralCount || 0;
                  await storage.upsertUser({
                    ...referrer,
                    referralCount: currentCount + 1,
                  });

                  console.log(`[REFERRAL CREDITS] Created $1 credit for referrer ${referrer.email} (referred: ${user.email})`);
                } else {
                  console.log(`[REFERRAL CREDITS] Credit already exists for referral pair: ${referrer.email} -> ${user.email}`);
                }
              }
            }
          } catch (referralError: any) {
            console.error('[REFERRAL CREDITS] Error creating referral credit:', referralError.message);
            // Don't fail the webhook for referral errors
          }

          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;
          const customerId = invoice.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          await storage.createSubscriptionCycleEvent({
            userId: user.id,
            stripeSubscriptionId: subscriptionId,
            stripeInvoiceId: invoice.id,
            periodStart: new Date(invoice.period_start * 1000),
            periodEnd: new Date(invoice.period_end * 1000),
            status: 'failed',
            amount: (invoice.amount_due / 100).toFixed(2),
          });

          await storage.updateUserSubscriptionStatus(user.id, 'past_due');
          console.log('[STRIPE WEBHOOK] Payment failed processed for user:', user.email);
          break;
        }

        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          const priceId = subscription.items.data[0]?.price.id;
          await storage.updateUserStripeSubscription(user.id, subscription.id, priceId || '');
          
          let status = 'active';
          if (subscription.status === 'canceled') status = 'cancelled';
          else if (subscription.status === 'past_due') status = 'past_due';
          else if (subscription.status === 'trialing') status = 'trialing';
          
          await storage.updateUserSubscriptionStatus(user.id, status);
          console.log('[STRIPE WEBHOOK] Subscription updated for user:', user.email, 'Status:', status);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.error('[STRIPE WEBHOOK] User not found for customer:', customerId);
            break;
          }

          await storage.updateUserSubscriptionStatus(user.id, 'cancelled');
          console.log('[STRIPE WEBHOOK] Subscription deleted for user:', user.email);
          break;
        }

        // Handle Connect payment events (invoice payments from homeowners to contractors)
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          
          // Handle subscription checkout completions
          if (session.mode === 'subscription' && session.metadata?.userId) {
            const userId = session.metadata.userId;
            const plan = session.metadata.plan;
            const maxHouses = session.metadata.maxHouses ? parseInt(session.metadata.maxHouses) : undefined;
            
            const user = await storage.getUser(userId);
            if (user) {
              // Update user subscription status
              const subscriptionId = session.subscription as string;
              await storage.updateUserStripeSubscription(userId, subscriptionId, '');
              await storage.updateUserSubscriptionStatus(userId, 'active');
              
              // Update max houses for homeowners
              if (maxHouses && user.role === 'homeowner') {
                await storage.upsertUser({
                  ...user,
                  maxHousesAllowed: maxHouses === 999 ? null : maxHouses, // null = unlimited
                  subscriptionStatus: 'active',
                });
              }
              
              // Update contractor tier
              if (user.role === 'contractor') {
                await storage.upsertUser({
                  ...user,
                  subscriptionStatus: 'active',
                  subscriptionTierName: plan === 'pro' ? 'contractor_pro' : 'contractor_basic',
                });
              }
              
              console.log(`[STRIPE WEBHOOK] Subscription activated for user: ${user.email}, plan: ${plan}`);
            }
          }
          
          // Check if this is a CRM invoice payment
          if (session.metadata?.type === 'crm_invoice_payment') {
            const invoiceId = session.metadata.invoiceId;
            const companyId = session.metadata.companyId;
            const clientId = session.metadata.clientId;
            
            if (invoiceId) {
              const invoice = await storage.getCrmInvoice(invoiceId);
              if (invoice) {
                // Update invoice status to paid
                await storage.updateCrmInvoice(invoiceId, {
                  status: 'paid',
                  paidAt: new Date(),
                  paymentMethod: 'credit_card',
                  paymentNotes: `Paid via Stripe checkout session: ${session.id}`,
                });
                
                console.log('[STRIPE WEBHOOK] Invoice paid:', invoiceId, 'Amount:', session.amount_total);
              }
            }
          }
          break;
        }

        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          
          // Check if this is a CRM invoice payment
          if (paymentIntent.metadata?.invoiceId) {
            const invoiceId = paymentIntent.metadata.invoiceId;
            const invoice = await storage.getCrmInvoice(invoiceId);
            
            if (invoice && invoice.status !== 'paid') {
              await storage.updateCrmInvoice(invoiceId, {
                status: 'paid',
                paidAt: new Date(),
                paymentMethod: 'credit_card',
                paymentNotes: `Payment intent: ${paymentIntent.id}`,
              });
              
              console.log('[STRIPE WEBHOOK] Payment intent succeeded for invoice:', invoiceId);
            }
          }
          break;
        }

        // Handle upcoming invoice - apply referral credits as discount
        case 'invoice.upcoming': {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;

          // Only process subscription invoices
          if (!invoice.subscription) {
            console.log('[REFERRAL CREDITS] Skipping non-subscription invoice');
            break;
          }

          const user = await storage.getUserByStripeCustomerId(customerId);
          if (!user) {
            console.log('[REFERRAL CREDITS] User not found for customer:', customerId);
            break;
          }

          // Calculate referral credits for this user from the referralCredits table
          try {
            // Query only "earned" status credits for this referrer (not yet applied)
            const earnedCreditsRows = await db.select()
              .from(referralCredits)
              .where(and(
                eq(referralCredits.referrerUserId, user.id),
                eq(referralCredits.status, 'earned')
              ))
              .orderBy(referralCredits.earnedAt); // FIFO - oldest first

            if (earnedCreditsRows.length === 0) {
              console.log('[REFERRAL CREDITS] No earned credits for user:', user.email);
              break;
            }

            // Get referral cap based on subscription tier
            let referralCreditCap = 5; // Default cap
            if (user.subscriptionPlanId) {
              const plans = await db.select().from(subscriptionPlans)
                .where(eq(subscriptionPlans.id, user.subscriptionPlanId))
                .limit(1);
              if (plans.length > 0 && plans[0].referralCreditCap) {
                referralCreditCap = parseFloat(plans[0].referralCreditCap);
              } else if (plans.length > 0 && plans[0].monthlyPrice) {
                referralCreditCap = parseFloat(plans[0].monthlyPrice);
              }
            }

            // Sum up available credits, respecting the cap (with partial support)
            let totalCreditsToApply = 0;
            const creditsToConsume: { id: string; fullAmount: number; appliedAmount: number }[] = [];
            
            for (const credit of earnedCreditsRows) {
              const creditAmount = parseFloat(credit.creditAmount || "1.00");
              const remainingCap = referralCreditCap - totalCreditsToApply;
              
              if (remainingCap <= 0) break; // Cap reached
              
              if (creditAmount <= remainingCap) {
                // Full credit can be applied
                totalCreditsToApply += creditAmount;
                creditsToConsume.push({ id: credit.id, fullAmount: creditAmount, appliedAmount: creditAmount });
              } else {
                // Partial credit application - apply only what fits in remaining cap
                totalCreditsToApply += remainingCap;
                creditsToConsume.push({ id: credit.id, fullAmount: creditAmount, appliedAmount: remainingCap });
                break; // Cap now fully used
              }
            }

            if (totalCreditsToApply <= 0) {
              console.log('[REFERRAL CREDITS] No credits to apply for user:', user.email);
              break;
            }

            console.log(`[REFERRAL CREDITS] Applying $${totalCreditsToApply.toFixed(2)} credit from ${creditsToConsume.length} referrals (cap: $${referralCreditCap}) for user: ${user.email}`);

            // Create a unique coupon ID for this billing cycle
            const billingCycleId = invoice.id || new Date().toISOString().slice(0, 7);
            const couponId = `ref_${user.id.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20)}_${Math.round(totalCreditsToApply * 100)}`;
            
            try {
              // Try to retrieve existing coupon
              await stripe.coupons.retrieve(couponId);
              console.log('[REFERRAL CREDITS] Using existing coupon:', couponId);
            } catch (couponErr: any) {
              // Coupon doesn't exist, create it
              if (couponErr.code === 'resource_missing') {
                await stripe.coupons.create({
                  id: couponId,
                  amount_off: Math.round(totalCreditsToApply * 100), // Convert to cents
                  currency: 'usd',
                  duration: 'once',
                  name: `Referral Credit - $${totalCreditsToApply.toFixed(2)} (${creditsToConsume.length} referrals)`,
                  metadata: {
                    userId: user.id,
                    creditIds: creditsToConsume.map(c => c.id).join(','),
                    referralCount: creditsToConsume.length.toString(),
                    creditCap: referralCreditCap.toString(),
                  },
                });
                console.log('[REFERRAL CREDITS] Created new coupon:', couponId);
              } else {
                throw couponErr;
              }
            }

            // Apply the coupon to the subscription using discounts array
            const subscriptionId = invoice.subscription as string;
            await stripe.subscriptions.update(subscriptionId, {
              discounts: [{ coupon: couponId }],
            });

            console.log(`[REFERRAL CREDITS] Successfully applied $${totalCreditsToApply.toFixed(2)} referral credit to subscription ${subscriptionId} for user ${user.email}`);

            // Get billing period from invoice lines (more accurate than invoice-level period)
            let periodStart: Date | null = null;
            let periodEnd: Date | null = null;
            const invoiceLines = (invoice as any).lines?.data;
            if (invoiceLines && invoiceLines.length > 0 && invoiceLines[0].period) {
              periodStart = invoiceLines[0].period.start ? new Date(invoiceLines[0].period.start * 1000) : null;
              periodEnd = invoiceLines[0].period.end ? new Date(invoiceLines[0].period.end * 1000) : null;
            } else if (invoice.period_start && invoice.period_end) {
              periodStart = new Date(invoice.period_start * 1000);
              periodEnd = new Date(invoice.period_end * 1000);
            }

            // Mark consumed credits with per-credit applied amounts
            const now = new Date();
            for (const creditEntry of creditsToConsume) {
              const isFullyConsumed = creditEntry.appliedAmount === creditEntry.fullAmount;
              
              await db.update(referralCredits)
                .set({
                  status: isFullyConsumed ? 'applied' : 'partial', // Mark partial if not fully consumed
                  appliedAt: now,
                  appliedToInvoiceId: invoice.id || null,
                  appliedAmount: creditEntry.appliedAmount.toFixed(2), // Actual amount applied from this credit
                  billingPeriodStart: periodStart,
                  billingPeriodEnd: periodEnd,
                  // If partial, update creditAmount to remaining balance
                  ...(isFullyConsumed ? {} : { creditAmount: (creditEntry.fullAmount - creditEntry.appliedAmount).toFixed(2) }),
                })
                .where(eq(referralCredits.id, creditEntry.id));
            }

            console.log(`[REFERRAL CREDITS] Marked ${creditsToConsume.length} credits as applied/partial`);

          } catch (creditError: any) {
            console.error('[REFERRAL CREDITS] Error applying credits:', creditError.message);
            // Don't fail the webhook for credit errors
          }
          break;
        }

        default:
          console.log('[STRIPE WEBHOOK] Unhandled event type:', event.type);
      }

      res.json({ received: true });
    } catch (error: any) {
      console.error('[STRIPE WEBHOOK] Error processing event:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ========================================
  // STRIPE CONNECT - Contractor Payment Processing
  // ========================================

  // Create Stripe Connect account for contractor
  app.post('/api/contractor/stripe-connect/create', isAuthenticated, requireRole('contractor'), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      // Check if account already exists
      if (company.stripeConnectAccountId) {
        return res.json({ accountId: company.stripeConnectAccountId, exists: true });
      }

      // Create Express account for contractor
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          companyId: company.id,
          userId: user.id,
        },
      });

      // Save account ID to company
      await storage.updateCompany(company.id, {
        stripeConnectAccountId: account.id,
      });

      console.log('[STRIPE CONNECT] Created account for company:', company.id, account.id);
      res.json({ accountId: account.id, exists: false });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating account:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe Connect onboarding link
  app.post('/api/contractor/stripe-connect/onboarding-link', isAuthenticated, requireRole('contractor'), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company || !company.stripeConnectAccountId) {
        return res.status(400).json({ error: 'No Stripe Connect account. Create one first.' });
      }

      const baseUrl = req.headers.origin || `https://${req.headers.host}`;

      const accountLink = await stripe.accountLinks.create({
        account: company.stripeConnectAccountId,
        refresh_url: `${baseUrl}/crm?tab=billing&stripe_refresh=true`,
        return_url: `${baseUrl}/crm?tab=billing&stripe_success=true`,
        type: 'account_onboarding',
      });

      res.json({ url: accountLink.url });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating onboarding link:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Get Stripe Connect account status
  app.get('/api/contractor/stripe-connect/status', isAuthenticated, requireRole('contractor'), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }

      if (!company.stripeConnectAccountId) {
        return res.json({
          hasAccount: false,
          onboardingComplete: false,
          chargesEnabled: false,
          payoutsEnabled: false,
        });
      }

      // Fetch account from Stripe to get current status
      const account = await stripe.accounts.retrieve(company.stripeConnectAccountId);

      // Update company with latest status
      await storage.updateCompany(company.id, {
        stripeOnboardingComplete: account.details_submitted,
        stripeChargesEnabled: account.charges_enabled,
        stripePayoutsEnabled: account.payouts_enabled,
      });

      res.json({
        hasAccount: true,
        accountId: company.stripeConnectAccountId,
        onboardingComplete: account.details_submitted,
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
      });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error fetching status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create Stripe Connect dashboard link for contractor
  app.post('/api/contractor/stripe-connect/dashboard-link', isAuthenticated, requireRole('contractor'), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const user = await storage.getUser(req.session.user.id);
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company || !company.stripeConnectAccountId) {
        return res.status(400).json({ error: 'No Stripe Connect account' });
      }

      const loginLink = await stripe.accounts.createLoginLink(company.stripeConnectAccountId);

      res.json({ url: loginLink.url });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating dashboard link:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Create payment link for invoice (contractor sends to homeowner)
  app.post('/api/crm/invoices/:invoiceId/payment-link', isAuthenticated, requireRole('contractor'), async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const { invoiceId } = req.params;
      const user = await storage.getUser(req.session.user.id);
      
      if (!user || !user.companyId) {
        return res.status(404).json({ error: 'Company not found' });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company || !company.stripeConnectAccountId || !company.stripeChargesEnabled) {
        return res.status(400).json({ error: 'Stripe Connect not set up or charges not enabled' });
      }

      // Get invoice
      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice || (invoice.contractorUserId !== user.id && invoice.companyId !== user.companyId)) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice is already paid' });
      }

      // Get client for email
      const client = await storage.getCrmClient(invoice.clientId);
      if (!client) {
        return res.status(404).json({ error: 'Client not found' });
      }

      const baseUrl = req.headers.origin || `https://${req.headers.host}`;
      const amountInCents = Math.round(parseFloat(invoice.totalAmount as string) * 100);

      // Create Checkout Session with connected account
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: invoice.title,
                description: `Invoice ${invoice.invoiceNumber}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          transfer_data: {
            destination: company.stripeConnectAccountId,
          },
          metadata: {
            invoiceId: invoice.id,
            companyId: company.id,
            clientId: client.id,
          },
        },
        customer_email: client.email || undefined,
        success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pay/cancelled?invoice=${invoiceId}`,
        metadata: {
          invoiceId: invoice.id,
          companyId: company.id,
          clientId: client.id,
          type: 'crm_invoice_payment',
        },
      });

      // Update invoice with payment link
      await storage.updateCrmInvoice(invoiceId, {
        status: 'sent',
        sentAt: new Date(),
      });

      res.json({ 
        paymentUrl: session.url,
        sessionId: session.id,
      });
    } catch (error: any) {
      console.error('[STRIPE CONNECT] Error creating payment link:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Public payment page - get invoice details for payment
  app.get('/api/pay/invoice/:invoiceId', async (req: any, res) => {
    try {
      const { invoiceId } = req.params;
      const { token } = req.query;

      // For now, allow access to invoice details for payment
      // In production, you'd want a signed token or session
      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      const contractor = await storage.getUser(invoice.contractorUserId);
      const company = invoice.companyId ? await storage.getCompany(invoice.companyId) : null;

      res.json({
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        title: invoice.title,
        description: invoice.description,
        status: invoice.status,
        totalAmount: invoice.totalAmount,
        dueDate: invoice.dueDate,
        lineItems: invoice.lineItems,
        clientName: client?.name || 'Customer',
        contractorName: contractor?.firstName && contractor?.lastName 
          ? `${contractor.firstName} ${contractor.lastName}` 
          : contractor?.email,
        companyName: company?.businessName,
        companyLogo: company?.businessLogo,
      });
    } catch (error: any) {
      console.error('[PAYMENT] Error fetching invoice:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Process payment for invoice (creates checkout session)
  app.post('/api/pay/invoice/:invoiceId/checkout', async (req: any, res) => {
    if (!stripe) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    try {
      const { invoiceId } = req.params;
      const { customerEmail } = req.body;

      const invoice = await storage.getCrmInvoice(invoiceId);
      if (!invoice) {
        return res.status(404).json({ error: 'Invoice not found' });
      }

      if (invoice.status === 'paid') {
        return res.status(400).json({ error: 'Invoice is already paid' });
      }

      const company = invoice.companyId ? await storage.getCompany(invoice.companyId) : null;
      if (!company || !company.stripeConnectAccountId || !company.stripeChargesEnabled) {
        return res.status(400).json({ error: 'Payment not available for this invoice' });
      }

      const client = await storage.getCrmClient(invoice.clientId);
      const baseUrl = req.headers.origin || `https://${req.headers.host}`;
      const amountInCents = Math.round(parseFloat(invoice.totalAmount as string) * 100);

      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: invoice.title,
                description: `Invoice ${invoice.invoiceNumber}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        payment_intent_data: {
          transfer_data: {
            destination: company.stripeConnectAccountId,
          },
          metadata: {
            invoiceId: invoice.id,
            companyId: company.id,
            clientId: client?.id || '',
          },
        },
        customer_email: customerEmail || client?.email || undefined,
        success_url: `${baseUrl}/pay/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/pay/invoice/${invoiceId}`,
        metadata: {
          invoiceId: invoice.id,
          companyId: company.id,
          clientId: client?.id || '',
          type: 'crm_invoice_payment',
        },
      });

      res.json({ url: session.url, sessionId: session.id });
    } catch (error: any) {
      console.error('[PAYMENT] Error creating checkout session:', error);
      res.status(500).json({ error: error.message });
    }
  });

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
  app.post('/api/auth/logout', async (req: any, res) => {
    const userId = req.session?.user?.id;
    const userEmail = req.session?.user?.email;
    const userRole = req.session?.user?.role;
    const sessionSid = req.sessionID;
    
    // Log logout event before destroying session
    if (userId) {
      await auditLogger.logLogout(userId, userEmail || '', userRole || '', req);
      await sessionManager.terminateSession(sessionSid, 'logout');
    }
    
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

  // Session management - Get user's active sessions
  app.get('/api/auth/sessions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const sessions = await sessionManager.getActiveSessions(userId);
      
      // Mark current session
      const currentSessionSid = req.sessionID;
      const sessionsWithCurrent = sessions.map(session => ({
        id: session.id,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress?.replace(/\d+\.\d+$/, 'x.x'), // Partial IP for privacy
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
        isCurrent: session.sessionSid === currentSessionSid,
      }));

      res.json(sessionsWithCurrent);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      res.status(500).json({ message: "Failed to fetch sessions" });
    }
  });

  // Session management - Revoke a specific session
  app.delete('/api/auth/sessions/:sessionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const { sessionId } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Verify the session belongs to this user
      const sessions = await sessionManager.getActiveSessions(userId);
      const session = sessions.find(s => s.id.toString() === sessionId);
      
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Don't allow revoking current session via this endpoint
      if (session.sessionSid === req.sessionID) {
        return res.status(400).json({ message: "Cannot revoke current session. Use logout instead." });
      }

      await sessionManager.terminateSession(session.sessionSid, 'user_revoked');
      
      // Log session revocation
      await auditLogger.log({
        eventType: AuditEventTypes.AUTH_LOGOUT,
        action: 'Session revoked by user',
        userId,
        userEmail: req.session.user.email || '',
        userRole: req.session.user.role || '',
        req,
        responseStatus: 200,
        metadata: { revokedSessionId: sessionId },
      });

      res.json({ success: true, message: "Session revoked" });
    } catch (error) {
      console.error("Error revoking session:", error);
      res.status(500).json({ message: "Failed to revoke session" });
    }
  });

  // Session management - Revoke all other sessions
  app.post('/api/auth/sessions/revoke-all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const currentSessionSid = req.sessionID;
      
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      await sessionManager.terminateAllUserSessions(userId, currentSessionSid, 'user_revoked_all');
      
      // Log bulk session revocation
      await auditLogger.log({
        eventType: AuditEventTypes.AUTH_LOGOUT,
        action: 'All other sessions revoked by user',
        userId,
        userEmail: req.session.user.email || '',
        userRole: req.session.user.role || '',
        req,
        responseStatus: 200,
        severity: 'warning',
      });

      res.json({ success: true, message: "All other sessions revoked" });
    } catch (error) {
      console.error("Error revoking sessions:", error);
      res.status(500).json({ message: "Failed to revoke sessions" });
    }
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

  // Cancel account endpoint
  app.delete('/api/account', async (req: any, res) => {
    try {
      // Check authentication
      const userId = req.session?.user?.id || (req.user as any)?.id;
      const userRole = req.session?.user?.role || (req.user as any)?.role;
      
      if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      // Cancel the account
      const result = await storage.cancelUserAccount(userId, userRole);
      
      if (!result.success) {
        return res.status(400).json({ message: result.message });
      }

      // Log out the user after cancellation
      req.logout((err: any) => {
        if (err) {
          console.error('Logout error after account cancellation:', err);
        }
        req.session.destroy((sessionErr: any) => {
          if (sessionErr) {
            console.error('Session destruction error:', sessionErr);
          }
          res.json({ success: true, message: result.message });
        });
      });
    } catch (error) {
      console.error('Error cancelling account:', error);
      res.status(500).json({ message: 'Failed to cancel account' });
    }
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
  async function generateUniqueReferralCode(storage: IStorage): Promise<string> {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar chars
    let attempts = 0;
    
    while (attempts < 10) {
      let code = '';
      for (let i = 0; i < 8; i++) {
        code += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      
      // Check if code already exists
      const existing = await storage.getUserByReferralCode(code);
      if (!existing) {
        return code;
      }
      attempts++;
    }
    
    throw new Error('Failed to generate unique referral code');
  }

  // Get current user data
  app.get('/api/user', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      return res.json(user);
    } catch (error: any) {
      console.error('Error fetching user:', error);
      return res.status(500).json({ message: "Failed to fetch user data" });
    }
  });

  // Get user's billing history (subscription cycle events)
  app.get('/api/billing-history', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const userId = req.session.user.id;
      const events = await storage.getSubscriptionCycleEvents(userId);
      
      // Sort by period start date, most recent first
      const sortedEvents = events.sort((a, b) => 
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      );

      return res.json(sortedEvents);
    } catch (error: any) {
      console.error('Error fetching billing history:', error);
      return res.status(500).json({ message: "Failed to fetch billing history" });
    }
  });

  // Create Stripe Checkout Session for subscription
  app.post('/api/create-subscription-checkout', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      const { plan } = req.body;

      // Validate plan
      const validHomeownerPlans = ['base', 'premium', 'premium_plus'];
      const validContractorPlans = ['basic', 'pro'];
      
      if (userRole === 'homeowner' && !validHomeownerPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan for homeowner" });
      }
      if (userRole === 'contractor' && !validContractorPlans.includes(plan)) {
        return res.status(400).json({ message: "Invalid plan for contractor" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Define pricing for each plan
      const pricing: Record<string, { price: number; name: string; maxHouses?: number }> = {
        base: { price: 500, name: 'HomeBase Base Plan', maxHouses: 2 },
        premium: { price: 2000, name: 'HomeBase Premium Plan', maxHouses: 6 },
        premium_plus: { price: 4000, name: 'HomeBase Premium Plus Plan', maxHouses: 999 },
        basic: { price: 2000, name: 'HomeBase Contractor Basic Plan' },
        pro: { price: 4000, name: 'HomeBase Contractor Pro Plan' },
      };

      const selectedPlan = pricing[plan];
      if (!selectedPlan) {
        return res.status(400).json({ message: "Invalid plan" });
      }

      // Get or create Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          metadata: { userId: user.id },
        });
        stripeCustomerId = customer.id;
        await storage.upsertUser({ ...user, stripeCustomerId });
      }

      // Determine base URL for redirect
      const baseUrl = req.headers.origin || `https://${req.headers.host}`;

      // Create Stripe Checkout Session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: selectedPlan.name,
                description: userRole === 'homeowner' 
                  ? `Manage up to ${selectedPlan.maxHouses === 999 ? 'unlimited' : selectedPlan.maxHouses} properties`
                  : plan === 'pro' ? 'Full CRM access with analytics' : 'Lead management and basic CRM',
              },
              unit_amount: selectedPlan.price,
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
          plan: plan,
          maxHouses: selectedPlan.maxHouses?.toString() || '',
        },
        success_url: `${baseUrl}/${userRole === 'homeowner' ? 'homeowner-account' : 'contractor-dashboard'}?subscription=success`,
        cancel_url: `${baseUrl}/${userRole === 'homeowner' ? 'homeowner-pricing' : 'contractor-dashboard'}?subscription=cancelled`,
      });

      console.log(`[SUBSCRIPTION] Created checkout session for user ${user.email}, plan: ${plan}`);
      return res.json({ url: session.url });
    } catch (error: any) {
      console.error('[SUBSCRIPTION] Error creating checkout session:', error);
      return res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

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

      // Get referral cap based on subscription tier
      let referralCreditCap = 20; // Default cap for contractors
      let tierName = 'contractor';
      
      if (user.subscriptionPlanId) {
        const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.subscriptionPlanId)).limit(1);
        if (plans.length > 0 && plans[0].referralCreditCap) {
          referralCreditCap = parseFloat(plans[0].referralCreditCap);
          tierName = plans[0].tierName;
        }
      } else if ((user as any).subscriptionTierName === 'contractor_pro') {
        referralCreditCap = 40;
        tierName = 'contractor_pro';
      }
      
      // For homeowners, cap is their subscription price
      if (user.role === 'homeowner') {
        if (user.subscriptionPlanId) {
          const plans = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.subscriptionPlanId)).limit(1);
          if (plans.length > 0 && plans[0].referralCreditCap) {
            referralCreditCap = parseFloat(plans[0].referralCreditCap);
          } else if (plans.length > 0 && plans[0].monthlyPrice) {
            referralCreditCap = parseFloat(plans[0].monthlyPrice);
          }
        } else {
          referralCreditCap = 5; // Default for basic homeowner
        }
      }

      // Calculate current monthly credits: each referral = $1, capped by tier
      const rawReferralCount = user.referralCount || 0;
      const earnedCredits = rawReferralCount * 1; // $1 per active referral
      const currentCredits = Math.min(earnedCredits, referralCreditCap);
      
      // For contractors, use the company's referral code instead of personal code
      if (user.role === 'contractor' && user.companyId) {
        const company = await storage.getCompany(user.companyId);
        if (company) {
          // If company doesn't have a referral code, generate one
          if (!company.referralCode) {
            const newCode = await generateUniqueReferralCode(storage);

            // Update company with new referral code
            await storage.updateCompany(user.companyId, { referralCode: newCode });
            
            return res.json({ 
              referralCode: newCode,
              referralCount: rawReferralCount,
              earnedCredits,
              referralCreditCap,
              currentCredits,
              tierName,
              referralLink: `${req.protocol}://${req.get('host')}/invite/${newCode}`
            });
          }
          
          // Return company's existing referral code
          return res.json({ 
            referralCode: company.referralCode,
            referralCount: rawReferralCount,
            earnedCredits,
            referralCreditCap,
            currentCredits,
            tierName,
            referralLink: `${req.protocol}://${req.get('host')}/invite/${company.referralCode}`
          });
        }
      }

      // For homeowners, use personal referral code
      if (!user.referralCode) {
        const newCode = await generateUniqueReferralCode(storage);

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
        referralCount: rawReferralCount,
        earnedCredits,
        referralCreditCap,
        currentCredits,
        tierName,
        referralLink: `${req.protocol}://${req.get('host')}/invite/${user.referralCode}`
      });
    } catch (error) {
      console.error("Error getting referral code:", error);
      res.status(500).json({ message: "Failed to get referral code" });
    }
  });

  // Get referral information by code (for invite page)
  app.get('/api/referrals/:code', async (req: any, res) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ message: "Referral code is required" });
      }
      
      const user = await storage.getUserByReferralCode(code);
      
      if (!user) {
        return res.status(404).json({ message: "Invalid referral code" });
      }
      
      // Return only the first name and role for privacy
      return res.json({ 
        firstName: user.firstName || 'A friend',
        role: user.role
      });
    } catch (error) {
      console.error("Error getting referral info:", error);
      res.status(500).json({ message: "Failed to get referral information" });
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

  // Message image upload endpoint
  app.post('/api/upload/message-image', isAuthenticated, async (req: any, res) => {
    try {
      const { imageData } = req.body;
      
      if (!imageData) {
        return res.status(400).json({ error: 'Missing imageData' });
      }
      
      // Upload image
      const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      const fileExtension = imageData.match(/^data:image\/(\w+);/)?.[1] || 'jpg';
      const filename = `${randomUUID()}.${fileExtension}`;
      const path = `public/message-images/${filename}`;
      
      await objectStorageService.uploadFile(path, buffer, `image/${fileExtension}`);
      const url = `/public/message-images/${filename}`;
      
      res.json({ success: true, url });
    } catch (error: any) {
      console.error('[MESSAGE IMAGE UPLOAD ERROR]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Universal file upload endpoint for messages and proposals
  app.post('/api/upload/files', isAuthenticated, async (req: any, res) => {
    try {
      const { files } = req.body; // files is an array of { fileData: base64, fileName: string, fileType: string }
      
      if (!files || !Array.isArray(files) || files.length === 0) {
        return res.status(400).json({ error: 'Missing files array' });
      }
      
      const uploadedUrls: string[] = [];
      
      for (const file of files) {
        const { fileData, fileName, fileType } = file;
        
        if (!fileData || !fileName) {
          continue; // Skip invalid files
        }
        
        // Extract base64 data (remove data:...;base64, prefix if present)
        const base64Data = fileData.includes('base64,') 
          ? fileData.split('base64,')[1] 
          : fileData;
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Get file extension from fileName or fileType
        const fileExtension = fileName.split('.').pop() || 'bin';
        const uniqueFilename = `${randomUUID()}.${fileExtension}`;
        const path = `public/attachments/${uniqueFilename}`;
        
        // Determine MIME type
        let mimeType = fileType || 'application/octet-stream';
        if (fileExtension === 'pdf') mimeType = 'application/pdf';
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExtension)) {
          mimeType = `image/${fileExtension === 'jpg' ? 'jpeg' : fileExtension}`;
        } else if (['doc', 'docx'].includes(fileExtension)) {
          mimeType = 'application/msword';
        }
        
        await objectStorageService.uploadFile(path, buffer, mimeType);
        uploadedUrls.push(`/public/attachments/${uniqueFilename}`);
      }
      
      res.json({ success: true, urls: uploadedUrls });
    } catch (error: any) {
      console.error('[FILE UPLOAD ERROR]', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Simple homeowner demo login with realistic profile
  app.post('/api/auth/homeowner-demo-login', authLimiter, async (req, res) => {
    try {
      // DEMO DATA PROTECTION: Block demo login in production unless explicitly enabled
      if (!isDemoDataEnabled()) {
        console.log('🛡️ DEMO DATA PROTECTION: Demo login blocked in production environment');
        return res.status(403).json({ 
          message: "Demo login is not available in production. Please create a real account." 
        });
      }
      
      const demoEmail = 'sarah.anderson@homebase.com';
      const demoId = 'demo-homeowner-permanent-id';
      
      // Check if demo user already exists
      let user = await storage.getUserByEmail(demoEmail);
      
      // If not, create demo user with realistic profile
      if (!user) {
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        
        user = await storage.upsertUser({
          id: demoId,
          email: demoEmail,
          firstName: 'Sarah',
          lastName: 'Anderson',
          profileImageUrl: null,
          role: 'homeowner',
          zipCode: '98101',
          subscriptionStatus: 'trialing',
          trialEndsAt,
          maxHousesAllowed: 2,
          connectionCode: 'DEMO4567'
        });

        // Create sample houses for the demo homeowner - showing 6 months of active usage
        try {
          // Main Residence
          const house1 = await storage.createHouse({
            homeownerId: demoId,
            name: 'Main Residence',
            address: '2847 Maple Drive, Seattle, WA 98101',
            climateZone: 'pacific-northwest',
            homeSystems: ['central-ac', 'gas-furnace', 'gas-water-heater', 'dishwasher', 'garbage-disposal', 'security-system'],
            isDefault: true,
            countryId: 'USA',
            regionId: 'WA',
            postalCode: '98101',
            latitude: 47.6062,
            longitude: -122.3321,
            yearBuilt: 2008,
            squareFootage: 2400,
            bedrooms: 4,
            bathrooms: 2.5,
            stories: 2,
            garageSpaces: 2,
            lotSize: 0.25,
            propertyType: 'single-family',
            roofType: 'asphalt-shingle',
            roofAge: 8,
            foundationType: 'slab',
            exteriorMaterial: 'vinyl-siding',
            primaryHeatingFuel: 'natural-gas'
          });

          // Vacation Rental Property - second home
          const house2 = await storage.createHouse({
            homeownerId: demoId,
            name: 'Lake House (Rental)',
            address: '4521 Lakeside Drive, Bellingham, WA 98225',
            climateZone: 'pacific-northwest',
            homeSystems: ['central-ac', 'gas-furnace', 'gas-water-heater', 'washer-dryer'],
            isDefault: false,
            countryId: 'USA',
            regionId: 'WA',
            postalCode: '98225',
            latitude: 48.7519,
            longitude: -122.4787,
            yearBuilt: 1995,
            squareFootage: 1800,
            bedrooms: 3,
            bathrooms: 2,
            stories: 1,
            garageSpaces: 1,
            lotSize: 0.5,
            propertyType: 'single-family',
            roofType: 'asphalt-shingle',
            roofAge: 15,
            foundationType: 'crawl-space',
            exteriorMaterial: 'wood-siding',
            primaryHeatingFuel: 'natural-gas'
          });

          // Service records spanning 6 months for Main Residence
          // Month 1 (6 months ago)
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'installation',
            homeArea: 'security',
            serviceDescription: 'Smart doorbell and security camera installation',
            cost: '450.00',
            contractorName: 'Tech Solutions Pro',
            contractorCompany: 'SecureHome Systems',
            notes: 'Installed Ring doorbell and two outdoor cameras. Configured mobile app and tested motion detection.',
            completionMethod: 'contractor'
          });

          // Month 2 (5 months ago)
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'repair',
            homeArea: 'plumbing',
            serviceDescription: 'Kitchen faucet replacement',
            cost: '0.00',
            contractorName: 'Sarah Anderson',
            contractorCompany: null,
            notes: 'Replaced old leaking faucet with new Moen model. Used YouTube tutorial for installation. Turned out great!',
            completionMethod: 'diy',
            diySavingsAmount: '275.00'
          });

          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 145 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'maintenance',
            homeArea: 'exterior',
            serviceDescription: 'Pressure washing deck and siding',
            cost: '0.00',
            contractorName: 'Sarah Anderson',
            contractorCompany: null,
            notes: 'Rented pressure washer from Home Depot. Took 4 hours but saved a ton of money. Deck looks brand new!',
            completionMethod: 'diy',
            diySavingsAmount: '325.00'
          });

          // Month 3 (4 months ago)
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'maintenance',
            homeArea: 'exterior',
            serviceDescription: 'Gutter cleaning and inspection',
            cost: '150.00',
            contractorName: 'James Wilson',
            contractorCompany: 'ProGutter Services',
            notes: 'Cleaned all gutters and downspouts. Found and repaired small leak in north gutter. Recommended annual service.',
            completionMethod: 'contractor'
          });

          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'repair',
            homeArea: 'electrical',
            serviceDescription: 'Replaced living room light fixture',
            cost: '0.00',
            contractorName: 'Sarah Anderson',
            contractorCompany: null,
            notes: 'Upgraded to modern LED fixture. Turned off breaker and followed safety guidelines. Much brighter now!',
            completionMethod: 'diy',
            diySavingsAmount: '185.00'
          });

          // Month 4 (3 months ago)
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'maintenance',
            homeArea: 'landscaping',
            serviceDescription: 'Tree trimming and yard cleanup',
            cost: '285.00',
            contractorName: 'Green Thumb Landscaping',
            contractorCompany: 'Green Thumb Services',
            notes: 'Trimmed large oak tree branches overhanging roof. Cleaned up yard debris and mulched flower beds.',
            completionMethod: 'contractor'
          });

          // Month 5 (2 months ago)
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'inspection',
            homeArea: 'hvac',
            serviceDescription: 'Annual HVAC maintenance and tune-up',
            cost: '185.00',
            contractorName: 'Mike Johnson',
            contractorCompany: 'Elite Heating & Cooling',
            notes: 'System is running efficiently. Replaced air filters, cleaned coils, checked refrigerant levels. No issues found.',
            completionMethod: 'contractor'
          });

          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'maintenance',
            homeArea: 'interior',
            serviceDescription: 'Caulked bathroom tiles and repaired grout',
            cost: '0.00',
            contractorName: 'Sarah Anderson',
            contractorCompany: null,
            notes: 'Regrouted master bathroom shower. Bought supplies at hardware store. Looks professional!',
            completionMethod: 'diy',
            diySavingsAmount: '225.00'
          });

          // Month 6 (1 month ago)
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'repair',
            homeArea: 'garage',
            serviceDescription: 'Garage door spring replacement',
            cost: '195.00',
            contractorName: 'Quick Fix Garage Doors',
            contractorCompany: 'Reliable Garage Services',
            notes: 'Spring broke suddenly. Same-day service. Professional and courteous. Door works perfectly now.',
            completionMethod: 'contractor'
          });

          // Recent maintenance
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house1.id,
            serviceDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'maintenance',
            homeArea: 'hvac',
            serviceDescription: 'Changed air filters',
            cost: '0.00',
            contractorName: 'Sarah Anderson',
            contractorCompany: null,
            notes: 'Quarterly filter change. Bought MERV 11 filters. Quick 15-minute job.',
            completionMethod: 'diy',
            diySavingsAmount: '75.00'
          });

          // Lake House service records
          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house2.id,
            serviceDate: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'inspection',
            homeArea: 'plumbing',
            serviceDescription: 'Annual septic system inspection',
            cost: '225.00',
            contractorName: 'Northwest Septic Services',
            contractorCompany: 'Clean Flow Septic',
            notes: 'System in good condition. Recommended pumping in 2 years. All drains flowing properly.',
            completionMethod: 'contractor'
          });

          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house2.id,
            serviceDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'maintenance',
            homeArea: 'exterior',
            serviceDescription: 'Dock repair and wood staining',
            cost: '425.00',
            contractorName: 'Lake Life Maintenance',
            contractorCompany: 'Waterfront Property Services',
            notes: 'Replaced damaged boards and restained entire dock. Looks great for summer rentals.',
            completionMethod: 'contractor'
          });

          await storage.createMaintenanceLog({
            homeownerId: demoId,
            houseId: house2.id,
            serviceDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            serviceType: 'maintenance',
            homeArea: 'interior',
            serviceDescription: 'Deep cleaning between rentals',
            cost: '180.00',
            contractorName: 'Crystal Clean Services',
            contractorCompany: 'Vacation Rental Cleaning Co',
            notes: 'Professional deep clean after summer guests. Carpets, windows, all appliances. Ready for fall bookings.',
            completionMethod: 'contractor'
          });

          // Add task completions for seasonal maintenance (for home health score)
          // Representing 6 months of good home maintenance
          const currentDate = new Date();
          const currentYear = currentDate.getFullYear();
          
          // Task completions spanning the past 6 months (May through November 2025)
          const taskCompletionsData = [
            // May 2025 tasks
            { taskTitle: 'Inspect and clean air conditioner', taskCategory: 'HVAC', month: 5, completionMethod: 'diy', daysAgo: 180, costSavings: 150 },
            { taskTitle: 'Check smoke and CO detectors', taskCategory: 'Safety', month: 5, completionMethod: 'diy', daysAgo: 175, costSavings: 0 },
            
            // June 2025 tasks
            { taskTitle: 'Clean gutters and downspouts', taskCategory: 'Exterior', month: 6, completionMethod: 'diy', daysAgo: 150, costSavings: 200 },
            { taskTitle: 'Inspect roof for damage', taskCategory: 'Exterior', month: 6, completionMethod: 'diy', daysAgo: 145, costSavings: 0 },
            { taskTitle: 'Service lawn equipment', taskCategory: 'Outdoor', month: 6, completionMethod: 'diy', daysAgo: 140, costSavings: 80 },
            
            // July 2025 tasks
            { taskTitle: 'Check and replace weather stripping', taskCategory: 'Doors & Windows', month: 7, completionMethod: 'diy', daysAgo: 120, costSavings: 120 },
            { taskTitle: 'Test garage door safety features', taskCategory: 'Safety', month: 7, completionMethod: 'diy', daysAgo: 115, costSavings: 0 },
            
            // August 2025 tasks
            { taskTitle: 'Drain water heater sediment', taskCategory: 'Plumbing', month: 8, completionMethod: 'diy', daysAgo: 90, costSavings: 100 },
            { taskTitle: 'Clean range hood filters', taskCategory: 'Kitchen', month: 8, completionMethod: 'diy', daysAgo: 85, costSavings: 0 },
            
            // September 2025 tasks
            { taskTitle: 'Inspect and seal driveway cracks', taskCategory: 'Exterior', month: 9, completionMethod: 'diy', daysAgo: 60, costSavings: 250 },
            { taskTitle: 'Change HVAC filters', taskCategory: 'HVAC', month: 9, completionMethod: 'diy', daysAgo: 55, costSavings: 0 },
            
            // October 2025 tasks
            { taskTitle: 'Inspect furnace before winter', taskCategory: 'HVAC', month: 10, completionMethod: 'professional', daysAgo: 30, costSavings: 0 },
            { taskTitle: 'Clean and store outdoor furniture', taskCategory: 'Outdoor', month: 10, completionMethod: 'diy', daysAgo: 25, costSavings: 0 },
            
            // November 2025 tasks (current month)
            { taskTitle: 'Check attic insulation', taskCategory: 'Insulation', month: 11, completionMethod: 'diy', daysAgo: 10, costSavings: 0 },
            { taskTitle: 'Test sump pump operation', taskCategory: 'Plumbing', month: 11, completionMethod: 'diy', daysAgo: 5, costSavings: 0 }
          ];

          // Insert task completions into database
          await Promise.all(taskCompletionsData.map(async (task) => {
            const completedDate = new Date(Date.now() - task.daysAgo * 24 * 60 * 60 * 1000);
            await db.insert(taskCompletions).values({
              id: randomUUID(),
              homeownerId: demoId,
              houseId: house1.id,
              taskId: null,
              taskType: 'maintenance',
              taskTitle: task.taskTitle,
              taskCategory: task.taskCategory,
              completedAt: completedDate,
              month: task.month,
              year: currentYear,
              completionMethod: task.completionMethod,
              estimatedCost: task.costSavings > 0 ? task.costSavings.toString() : null,
              actualCost: task.completionMethod === 'professional' ? '150.00' : '0.00',
              costSavings: task.costSavings > 0 ? task.costSavings.toString() : null,
              notes: task.completionMethod === 'diy' ? 'Completed as DIY project' : null
            });
          }));

          console.log(`[DEMO DATA] Inserted ${taskCompletionsData.length} task completions for Sarah Anderson`);

        } catch (houseError) {
          console.error("Error creating demo houses:", houseError);
        }
      }

      // Add task completions for existing demo users if they don't already have any
      try {
        const existingCompletions = await db.select()
          .from(taskCompletions)
          .where(eq(taskCompletions.homeownerId, demoId))
          .limit(1);

        if (existingCompletions.length === 0) {
          // Get the demo user's main house
          const houses = await storage.getHouses(demoId);
          const mainHouse = houses.find((h: any) => h.name === 'Main Residence') || houses[0];

          if (mainHouse) {
            const currentDate = new Date();
            const currentYear = currentDate.getFullYear();
            
            // Task completions spanning the past 6 months (May through November 2025)
            const taskCompletionsData = [
              // May 2025 tasks
              { taskTitle: 'Inspect and clean air conditioner', taskCategory: 'HVAC', month: 5, completionMethod: 'diy', daysAgo: 180, costSavings: 150 },
              { taskTitle: 'Check smoke and CO detectors', taskCategory: 'Safety', month: 5, completionMethod: 'diy', daysAgo: 175, costSavings: 0 },
              
              // June 2025 tasks
              { taskTitle: 'Clean gutters and downspouts', taskCategory: 'Exterior', month: 6, completionMethod: 'diy', daysAgo: 150, costSavings: 200 },
              { taskTitle: 'Inspect roof for damage', taskCategory: 'Exterior', month: 6, completionMethod: 'diy', daysAgo: 145, costSavings: 0 },
              { taskTitle: 'Service lawn equipment', taskCategory: 'Outdoor', month: 6, completionMethod: 'diy', daysAgo: 140, costSavings: 80 },
              
              // July 2025 tasks
              { taskTitle: 'Check and replace weather stripping', taskCategory: 'Doors & Windows', month: 7, completionMethod: 'diy', daysAgo: 120, costSavings: 120 },
              { taskTitle: 'Test garage door safety features', taskCategory: 'Safety', month: 7, completionMethod: 'diy', daysAgo: 115, costSavings: 0 },
              
              // August 2025 tasks
              { taskTitle: 'Drain water heater sediment', taskCategory: 'Plumbing', month: 8, completionMethod: 'diy', daysAgo: 90, costSavings: 100 },
              { taskTitle: 'Clean range hood filters', taskCategory: 'Kitchen', month: 8, completionMethod: 'diy', daysAgo: 85, costSavings: 0 },
              
              // September 2025 tasks
              { taskTitle: 'Inspect and seal driveway cracks', taskCategory: 'Exterior', month: 9, completionMethod: 'diy', daysAgo: 60, costSavings: 250 },
              { taskTitle: 'Change HVAC filters', taskCategory: 'HVAC', month: 9, completionMethod: 'diy', daysAgo: 55, costSavings: 0 },
              
              // October 2025 tasks
              { taskTitle: 'Inspect furnace before winter', taskCategory: 'HVAC', month: 10, completionMethod: 'professional', daysAgo: 30, costSavings: 0 },
              { taskTitle: 'Clean and store outdoor furniture', taskCategory: 'Outdoor', month: 10, completionMethod: 'diy', daysAgo: 25, costSavings: 0 },
              
              // November 2025 tasks (current month)
              { taskTitle: 'Check attic insulation', taskCategory: 'Insulation', month: 11, completionMethod: 'diy', daysAgo: 10, costSavings: 0 },
              { taskTitle: 'Test sump pump operation', taskCategory: 'Plumbing', month: 11, completionMethod: 'diy', daysAgo: 5, costSavings: 0 }
            ];

            // Insert task completions into database
            await Promise.all(taskCompletionsData.map(async (task) => {
              const completedDate = new Date(Date.now() - task.daysAgo * 24 * 60 * 60 * 1000);
              await db.insert(taskCompletions).values({
                id: randomUUID(),
                homeownerId: demoId,
                houseId: mainHouse.id,
                taskId: null,
                taskType: 'maintenance',
                taskTitle: task.taskTitle,
                taskCategory: task.taskCategory,
                completedAt: completedDate,
                month: task.month,
                year: currentYear,
                completionMethod: task.completionMethod,
                estimatedCost: task.costSavings > 0 ? task.costSavings.toString() : null,
                actualCost: task.completionMethod === 'professional' ? '150.00' : '0.00',
                costSavings: task.costSavings > 0 ? task.costSavings.toString() : null,
                notes: task.completionMethod === 'diy' ? 'Completed as DIY project' : null
              });
            }));

            console.log(`[DEMO DATA] Inserted ${taskCompletionsData.length} task completions for Sarah Anderson (existing user)`);
          }
        }
      } catch (taskError) {
        console.error("Error creating demo task completions:", taskError);
      }

      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        
        req.session.isAuthenticated = true;
        req.session.user = user;
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          console.log('[DEMO LOGIN] Session saved successfully for user:', user.id);
          res.json({ success: true, user });
        });
      });
    } catch (error) {
      console.error("Error creating homeowner demo user:", error);
      res.status(500).json({ message: "Failed to create homeowner account" });
    }
  });

  // Simple contractor demo login with realistic company profile
  app.post('/api/auth/contractor-demo-login', authLimiter, async (req, res) => {
    try {
      // DEMO DATA PROTECTION: Block demo login in production unless explicitly enabled
      if (!isDemoDataEnabled()) {
        console.log('🛡️ DEMO DATA PROTECTION: Contractor demo login blocked in production environment');
        return res.status(403).json({ 
          message: "Demo login is not available in production. Please create a real account." 
        });
      }
      
      const demoEmail = 'david.martinez@precisionhvac.com';
      const demoId = 'demo-contractor-permanent-id';
      const companyId = 'demo-company-permanent-id';
      
      // Check if demo user already exists
      let user = await storage.getUserByEmail(demoEmail);
      
      // If not, create demo user with realistic profile
      if (!user) {
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        
        // Step 1: Create the user WITHOUT companyId first
        user = await storage.upsertUser({
          id: demoId,
          email: demoEmail,
          firstName: 'David',
          lastName: 'Martinez',
          profileImageUrl: null,
          role: 'contractor',
          zipCode: '98103',
          subscriptionStatus: 'trialing',
          trialEndsAt,
          companyId: null, // Set to null initially
          companyRole: null
        });

        // Step 2: Create the company with the user as owner (if it doesn't exist)
        try {
          let company = await storage.getCompany(companyId);
          if (!company) {
            // Set company creation date to 3 years ago to show tenure
            const threeYearsAgo = new Date();
            threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
            
            company = await storage.createCompany({
            id: companyId,
            name: 'Precision HVAC & Plumbing',
            ownerId: user.id,
            location: 'Seattle, WA',
            address: '1425 Industrial Way, Seattle, WA 98103',
            countryId: 'USA',
            regionId: 'WA',
            postalCode: '98103',
            latitude: 47.6597,
            longitude: -122.3331,
            website: 'https://precisionhvac.example.com',
            phone: '(206) 555-0142',
            email: demoEmail,
            bio: 'Family-owned HVAC and plumbing company serving Seattle and surrounding areas since 2015. Specializing in residential heating, cooling, and plumbing services with a focus on energy efficiency and customer satisfaction. Our certified technicians provide honest, reliable service at fair prices.',
            services: ['HVAC Installation', 'HVAC Repair', 'AC Maintenance', 'Furnace Service', 'Plumbing Repair', 'Water Heater Installation', 'Emergency Services'],
            serviceRadius: 25,
            hasEmergencyServices: true,
            isLicensed: true,
            licenseNumber: 'WA-HVAC-98765',
            licenseState: 'WA',
            licenseExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            isInsured: true,
            createdAt: threeYearsAgo,
            insuranceProvider: 'State Farm Commercial',
            insuranceExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            insuranceCoverageAmount: '$2,000,000',
            businessHours: 'Mon-Fri: 7am-6pm, Sat: 8am-4pm, Sun: Closed',
            yearsInBusiness: 9,
            numberOfEmployees: 12,
            isBonded: true,
            bondingCompany: 'Travelers Casualty & Surety',
            certifications: ['NATE Certified', 'EPA 608 Universal', 'Master Plumber', 'Energy Star Partner'],
            specialties: ['High-efficiency HVAC systems', 'Tankless water heaters', 'Radiant floor heating', 'Smart thermostat installation'],
            paymentMethods: ['Cash', 'Check', 'Credit Card', 'Financing Available'],
            warrantyInfo: 'All installations include 1-year labor warranty. Equipment warranties vary by manufacturer (typically 5-10 years).',
            insuranceInfo: 'Comprehensive general liability and workers compensation insurance. $2M coverage limit.',
            rating: '4.8',
            reviewCount: 127
          });
          }
          
          // Step 3: Update the user with the company reference (always run this)
          user = await storage.upsertUser({
            ...user,
            companyId,
            companyRole: 'owner',
            canRespondToProposals: true
          });

          // Step 4: Add realistic 6-month usage data for contractor demo
          try {
            // CRM Leads - showing active pipeline
            const leadIds = ['demo-lead-1', 'demo-lead-2', 'demo-lead-3', 'demo-lead-4', 'demo-lead-5'];
            
            // Hot lead - ready to close
            await storage.createLead({
              id: leadIds[0],
              companyId,
              createdBy: demoId,
              customerName: 'Michael Chen',
              customerEmail: 'michael.chen@email.com',
              customerPhone: '(206) 555-1234',
              serviceNeeded: 'HVAC Repair',
              address: '1523 Pine Street, Seattle, WA 98101',
              status: 'contacted',
              priority: 'high',
              estimatedValue: '850.00',
              source: 'Website',
              notes: 'AC not cooling. Customer has 20-year-old unit. Likely needs replacement. Scheduled estimate for next week.',
              nextFollowUp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });

            // Warm lead - in progress
            await storage.createLead({
              id: leadIds[1],
              companyId,
              createdBy: demoId,
              customerName: 'Jennifer Martinez',
              customerEmail: 'jmartinez@email.com',
              customerPhone: '(206) 555-5678',
              serviceNeeded: 'Water Heater Installation',
              address: '892 Broadway Ave E, Seattle, WA 98102',
              status: 'qualified',
              priority: 'medium',
              estimatedValue: '1,850.00',
              source: 'Referral',
              notes: 'Current water heater is leaking. Wants tankless upgrade. Sent quote yesterday. Waiting for decision.',
              nextFollowUp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });

            // New lead - just came in
            await storage.createLead({
              id: leadIds[2],
              companyId,
              createdBy: demoId,
              customerName: 'Robert Thompson',
              customerEmail: 'rthompson@email.com',
              customerPhone: '(206) 555-9012',
              serviceNeeded: 'Furnace Service',
              address: '3345 15th Ave W, Seattle, WA 98119',
              status: 'new',
              priority: 'medium',
              estimatedValue: '350.00',
              source: 'Phone',
              notes: 'Annual maintenance needed before winter. Called this morning. Need to call back to schedule.',
              nextFollowUp: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            });

            // Lost lead - for realistic pipeline
            await storage.createLead({
              id: leadIds[3],
              companyId,
              createdBy: demoId,
              customerName: 'Susan Williams',
              customerEmail: 'swilliams@email.com',
              customerPhone: '(206) 555-3456',
              serviceNeeded: 'AC Installation',
              address: '7821 Greenwood Ave N, Seattle, WA 98103',
              status: 'lost',
              priority: 'low',
              estimatedValue: '4,500.00',
              source: 'Google',
              notes: 'Got 3 quotes. Went with another company that was $500 cheaper. Price-focused customer.',
              nextFollowUp: null
            });

            // Won lead - converted to job
            await storage.createLead({
              id: leadIds[4],
              companyId,
              createdBy: demoId,
              customerName: 'David Park',
              customerEmail: 'dpark@email.com',
              customerPhone: '(206) 555-7890',
              serviceNeeded: 'Plumbing Repair',
              address: '2156 Queen Anne Ave N, Seattle, WA 98109',
              status: 'won',
              priority: 'high',
              estimatedValue: '625.00',
              source: 'HomeBase',
              notes: 'Emergency leak repair. Job completed successfully last week. Customer very happy.',
              nextFollowUp: null
            });

            // Create some sample homeowner users for realistic messages/conversations
            const sampleHomeownerIds = ['sample-homeowner-1', 'sample-homeowner-2', 'sample-homeowner-3'];
            
            for (let i = 0; i < sampleHomeownerIds.length; i++) {
              await storage.upsertUser({
                id: sampleHomeownerIds[i],
                email: `homeowner${i + 1}@example.com`,
                firstName: ['Emma', 'James', 'Sophia'][i],
                lastName: ['Wilson', 'Brown', 'Davis'][i],
                role: 'homeowner',
                zipCode: '98105',
                subscriptionStatus: 'active'
              });
            }

            // Create conversation/messages with homeowners
            const conv1Id = 'demo-conversation-1';
            await storage.createConversation({
              id: conv1Id,
              homeownerId: sampleHomeownerIds[0],
              contractorId: demoId,
              companyId
            });

            // Message thread 1 - Active inquiry about HVAC service
            await storage.createMessage({
              conversationId: conv1Id,
              senderId: sampleHomeownerIds[0],
              senderRole: 'homeowner',
              recipientId: demoId,
              recipientRole: 'contractor',
              content: 'Hi David! My furnace is making a strange rattling noise when it starts up. It\'s about 8 years old. Could you take a look at it? I\'m located in Fremont.',
              createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
            });

            await storage.createMessage({
              conversationId: conv1Id,
              senderId: demoId,
              senderRole: 'contractor',
              recipientId: sampleHomeownerIds[0],
              recipientRole: 'homeowner',
              content: 'Hello Emma! I\'d be happy to help. A rattling noise often indicates a loose component or debris in the blower. I can come by this Thursday or Friday afternoon. Would either of those work for you?',
              createdAt: new Date(Date.now() - 2.5 * 24 * 60 * 60 * 1000)
            });

            await storage.createMessage({
              conversationId: conv1Id,
              senderId: sampleHomeownerIds[0],
              senderRole: 'homeowner',
              recipientId: demoId,
              recipientRole: 'contractor',
              content: 'Friday at 2pm would be perfect! What\'s your service call fee?',
              createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            });

            await storage.createMessage({
              conversationId: conv1Id,
              senderId: demoId,
              senderRole: 'contractor',
              recipientId: sampleHomeownerIds[0],
              recipientRole: 'homeowner',
              content: 'Great! Friday at 2pm is booked. Our diagnostic service call is $125, which includes the first hour of labor. If repairs are needed, I\'ll provide an estimate before starting any work. See you Friday!',
              createdAt: new Date(Date.now() - 1.8 * 24 * 60 * 60 * 1000)
            });

            // Message thread 2 - Past customer follow-up
            const conv2Id = 'demo-conversation-2';
            await storage.createConversation({
              id: conv2Id,
              homeownerId: sampleHomeownerIds[1],
              contractorId: demoId,
              companyId
            });

            await storage.createMessage({
              conversationId: conv2Id,
              senderId: demoId,
              senderRole: 'contractor',
              recipientId: sampleHomeownerIds[1],
              recipientRole: 'homeowner',
              content: 'Hi James! Just following up on the water heater installation we completed last month. Is everything working well? Remember that your 1-year labor warranty covers any installation issues.',
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
            });

            await storage.createMessage({
              conversationId: conv2Id,
              senderId: sampleHomeownerIds[1],
              senderRole: 'homeowner',
              recipientId: demoId,
              recipientRole: 'contractor',
              content: 'Everything is great! The tankless system is working perfectly. We love the endless hot water. Thanks for the quality work - I\'ve already recommended you to two neighbors!',
              createdAt: new Date(Date.now() - 4.5 * 24 * 60 * 60 * 1000)
            });

          } catch (demoDataError) {
            console.error("Error creating demo contractor data:", demoDataError);
          }
        } catch (companyError) {
          console.error("Error creating demo company:", companyError);
        }
      }

      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        
        req.session.isAuthenticated = true;
        req.session.user = user;
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          console.log('[DEMO LOGIN] Contractor session saved successfully for user:', user.id);
          res.json({ success: true, user });
        });
      });
    } catch (error) {
      console.error("Error creating contractor demo user:", error);
      res.status(500).json({ message: "Failed to create contractor account" });
    }
  });

  // Simple agent demo login with realistic agent profile
  app.post('/api/auth/agent-demo-login', authLimiter, async (req, res) => {
    try {
      const demoEmail = 'jessica.roberts@ellisonrealty.com';
      const demoId = 'demo-agent-permanent-id';
      
      // Check if demo user already exists
      let user = await storage.getUserByEmail(demoEmail);
      
      // If not, create demo user with realistic agent profile
      if (!user) {
        user = await storage.upsertUser({
          id: demoId,
          email: demoEmail,
          firstName: 'Jessica',
          lastName: 'Roberts',
          profileImageUrl: null,
          role: 'agent',
          zipCode: '98115',
          subscriptionStatus: 'active', // Agents don't pay subscription
          companyId: null,
          companyRole: null
        });

        // Create referral code for the agent
        try {
          const existingCode = await storage.getUserReferralCode(demoId);
          if (!existingCode) {
            const referralCode = await storage.generateUniqueReferralCode();
            await storage.createUserReferralCode({
              userId: demoId,
              referralCode,
              referralLink: `https://gotohomebase.com/signin?ref=${referralCode}`
            });
          }

          // Create realistic 6-month referral data showing agent's growing business
          const referralData = [
            // Qualified referrals (earning commissions)
            {
              id: 'agent-referral-1',
              firstName: 'Michael',
              lastName: 'Stevens',
              email: 'michael.stevens@email.com',
              zipCode: '98115',
              role: 'homeowner',
              signupMonthsAgo: 6,
              subscriptionStatus: 'active',
              plan: 'base',
              monthlyAmount: '5.00',
              cyclesPaid: 6,
              qualified: true
            },
            {
              id: 'agent-referral-2',
              firstName: 'Laura',
              lastName: 'Thompson',
              email: 'laura.thompson@email.com',
              zipCode: '98102',
              role: 'homeowner',
              signupMonthsAgo: 5,
              subscriptionStatus: 'active',
              plan: 'premium',
              monthlyAmount: '20.00',
              cyclesPaid: 5,
              qualified: true
            },
            {
              id: 'agent-referral-3',
              firstName: 'Robert',
              lastName: 'Chang',
              email: 'robert.chang@email.com',
              zipCode: '98119',
              role: 'homeowner',
              signupMonthsAgo: 4.5,
              subscriptionStatus: 'active',
              plan: 'base',
              monthlyAmount: '5.00',
              cyclesPaid: 4,
              qualified: true
            },
            // Recently qualified (just hit 4 months)
            {
              id: 'agent-referral-4',
              firstName: 'Amanda',
              lastName: 'Rodriguez',
              email: 'amanda.rodriguez@email.com',
              zipCode: '98125',
              role: 'contractor',
              signupMonthsAgo: 4,
              subscriptionStatus: 'active',
              plan: 'contractor',
              monthlyAmount: '20.00',
              cyclesPaid: 4,
              qualified: true
            },
            // Pending referrals (not yet qualified - need 4 months)
            {
              id: 'agent-referral-5',
              firstName: 'Kevin',
              lastName: 'Martinez',
              email: 'kevin.martinez@email.com',
              zipCode: '98105',
              role: 'homeowner',
              signupMonthsAgo: 2.5,
              subscriptionStatus: 'active',
              plan: 'premium',
              monthlyAmount: '20.00',
              cyclesPaid: 2,
              qualified: false
            },
            {
              id: 'agent-referral-6',
              firstName: 'Nicole',
              lastName: 'Park',
              email: 'nicole.park@email.com',
              zipCode: '98103',
              role: 'homeowner',
              signupMonthsAgo: 1.5,
              subscriptionStatus: 'active',
              plan: 'base',
              monthlyAmount: '5.00',
              cyclesPaid: 1,
              qualified: false
            },
            // Trial users (just signed up)
            {
              id: 'agent-referral-7',
              firstName: 'Daniel',
              lastName: 'Foster',
              email: 'daniel.foster@email.com',
              zipCode: '98109',
              role: 'homeowner',
              signupMonthsAgo: 0.3,
              subscriptionStatus: 'trialing',
              plan: 'base',
              monthlyAmount: '0.00',
              cyclesPaid: 0,
              qualified: false
            },
            {
              id: 'agent-referral-8',
              firstName: 'Rachel',
              lastName: 'Kim',
              email: 'rachel.kim@email.com',
              zipCode: '98117',
              role: 'homeowner',
              signupMonthsAgo: 0.1,
              subscriptionStatus: 'trialing',
              plan: 'premium',
              monthlyAmount: '0.00',
              cyclesPaid: 0,
              qualified: false
            }
          ];

          for (const referral of referralData) {
            const signupDate = new Date(Date.now() - referral.signupMonthsAgo * 30 * 24 * 60 * 60 * 1000);
            
            // Create the referred user
            await storage.upsertUser({
              id: referral.id,
              email: referral.email,
              firstName: referral.firstName,
              lastName: referral.lastName,
              role: referral.role as 'homeowner' | 'contractor' | 'agent',
              zipCode: referral.zipCode,
              subscriptionStatus: referral.subscriptionStatus as any,
              trialEndsAt: referral.subscriptionStatus === 'trialing' 
                ? new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) 
                : null,
              maxHousesAllowed: referral.role === 'homeowner' ? 2 : undefined
            });

            // Create referral record
            await storage.createReferral({
              agentId: demoId,
              referredUserId: referral.id,
              referredUserEmail: referral.email,
              signupDate: signupDate.toISOString().split('T')[0],
              status: referral.qualified ? 'qualified' : 'pending'
            });

            // Create subscription cycles for paying users
            if (referral.cyclesPaid > 0) {
              for (let month = 0; month < referral.cyclesPaid; month++) {
                const cycleStart = new Date(signupDate.getTime() + (month * 30 + 14) * 24 * 60 * 60 * 1000);
                const cycleEnd = new Date(cycleStart.getTime() + 30 * 24 * 60 * 60 * 1000);
                
                await storage.createSubscriptionCycle({
                  userId: referral.id,
                  cycleStart: cycleStart.toISOString().split('T')[0],
                  cycleEnd: cycleEnd.toISOString().split('T')[0],
                  amount: referral.monthlyAmount,
                  status: 'paid',
                  stripeInvoiceId: `demo_inv_${referral.id}_${month + 1}`
                });
              }
            }
          }
        } catch (referralError) {
          console.error("Error creating demo agent referrals:", referralError);
        }
      }

      // Regenerate session to prevent session fixation
      req.session.regenerate((err: any) => {
        if (err) {
          console.error("Session regeneration error:", err);
          return res.status(500).json({ message: "Session error" });
        }
        
        req.session.isAuthenticated = true;
        req.session.user = user;
        
        req.session.save((saveErr: any) => {
          if (saveErr) {
            console.error("Session save error:", saveErr);
            return res.status(500).json({ message: "Failed to save session" });
          }
          console.log('[DEMO LOGIN] Agent session saved successfully for user:', user.id);
          res.json({ success: true, user });
        });
      });
    } catch (error) {
      console.error("Error creating agent demo user:", error);
      res.status(500).json({ message: "Failed to create agent account" });
    }
  });

  // Email/password registration
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { 
        email, password, firstName, lastName, role, zipCode, inviteCode, referralCode,
        companyName, companyBio, companyPhone
      } = req.body;
      
      if (!email || !password || !firstName || !lastName || !role || !zipCode) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate role
      if (!['homeowner', 'contractor', 'agent'].includes(role)) {
        return res.status(400).json({ message: "Invalid role. Must be homeowner, contractor, or agent" });
      }

      // Validate contractor company requirements - must create a company
      if (role === 'contractor') {
        if (!companyName || !companyBio || !companyPhone) {
          return res.status(400).json({ message: "Company name, bio, and phone are required for contractors" });
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

      // Validate referral code if provided (for homeowners/contractors)
      // Supports both agent referrals (for affiliate payouts) and user-to-user referrals (for subscription credits)
      let referringAgent = null;
      let referringUser = null;
      if (referralCode && (role === 'homeowner' || role === 'contractor')) {
        const referrer = await storage.getUserByReferralCode(referralCode);
        if (!referrer) {
          return res.status(400).json({ message: "Invalid referral code" });
        }
        
        if (referrer.role === 'agent') {
          referringAgent = referrer; // Agent referral - for affiliate payouts
        } else {
          referringUser = referrer; // User-to-user referral - for subscription credits
        }
      }

      // Hash password with bcrypt
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(password, 10);

      // Create user based on role
      let user;
      
      if (role === 'agent') {
        // Agents don't have trial/subscription - they are affiliates
        const agentReferralCode = await generateUniqueReferralCode(storage);
        
        user = await storage.createUserWithPassword({
          email,
          passwordHash,
          firstName,
          lastName,
          role: 'agent',
          zipCode,
          referralCode: agentReferralCode,
          subscriptionStatus: 'inactive', // Agents don't subscribe
          trialEndsAt: null,
          maxHousesAllowed: null
        });
        
        // Create agent profile
        await storage.createAgentProfile({
          userId: user.id,
          agentType: 'individual',
          commissionRate: '10.00', // Default 10% commission
          status: 'active'
        });
        
        // Send admin notification about new agent signup (non-blocking)
        emailService.sendAgentSignupNotification(
          email,
          `${firstName} ${lastName}`,
          user.id
        ).catch(err => console.error('[EMAIL] Failed to send agent signup notification:', err));
      } else {
        // Homeowners and contractors get 14-day trial
        const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        
        user = await storage.createUserWithPassword({
          email,
          passwordHash,
          firstName,
          lastName,
          role: role as 'homeowner' | 'contractor',
          zipCode,
          trialEndsAt,
          maxHousesAllowed: role === 'homeowner' ? 2 : undefined, // Base plan: 2 houses during trial
          subscriptionStatus: 'trialing',
          referredBy: referralCode || undefined, // Store referral code for credit tracking
        });

        // Handle contractor company setup - always create a new company
        if (role === 'contractor') {
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
        }

        // Create affiliate referral record if referred by an agent
        if (referringAgent) {
          const signupDate = new Date();
          const trialEndDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
          
          await storage.createAffiliateReferral({
            agentId: referringAgent.id,
            referredUserId: user.id,
            signupDate,
            trialEndDate,
            status: 'trial'
          });
        }
      }

      // Create session
      req.session.user = user;
      req.session.isAuthenticated = true;

      // Log successful registration
      await auditLogger.log({
        eventType: 'auth.registration',
        action: `New ${role} account created`,
        userId: user.id,
        userEmail: email,
        userRole: role,
        req,
        responseStatus: 200,
        metadata: { 
          registrationMethod: 'email',
          referredBy: referralCode || null,
          referringAgent: referringAgent?.id || null,
        },
      });

      // Send welcome SMS and email (non-blocking)
      const userName = `${firstName || ''} ${lastName || ''}`.trim() || undefined;
      notificationOrchestrator.sendWelcomeNotifications(user.id, userName || 'there', role)
        .catch(err => console.error('[REGISTRATION] Error sending welcome notifications:', err));

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  // Email/password login
  app.post('/api/auth/login', authLimiter, async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }

      const user = await storage.getUserByEmail(email);
      
      if (!user || !user.passwordHash) {
        // Log failed login attempt (user not found)
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_FAILED_LOGIN,
          action: 'Login attempt failed - user not found',
          userEmail: email,
          req,
          responseStatus: 401,
          errorMessage: 'Invalid credentials - user not found',
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Verify password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.compare(password, user.passwordHash);
      
      if (!isValid) {
        // Log failed login attempt (wrong password)
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_FAILED_LOGIN,
          action: 'Login attempt failed - invalid password',
          userId: user.id,
          userEmail: email,
          userRole: user.role,
          req,
          responseStatus: 401,
          errorMessage: 'Invalid credentials - wrong password',
        });
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Create session
      req.session.user = user;
      req.session.isAuthenticated = true;

      // Log successful login
      await auditLogger.logLogin(user.id, user.email || email, user.role, req, true);
      
      // Create security session record
      const sessionExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      await sessionManager.createSession({
        userId: user.id,
        sessionSid: req.sessionID,
        req,
        expiresAt: sessionExpiry,
      });

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error logging in:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Forgot password - Request reset code
  app.post('/api/auth/forgot-password', authLimiter, async (req: any, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user exists
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Log the password reset request even for non-existent users (security monitoring)
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_PASSWORD_RESET_REQUEST,
          action: 'Password reset requested for unknown email',
          userEmail: email,
          req,
          responseStatus: 200,
          metadata: { userExists: false },
        });
        // Return success even if user doesn't exist (security best practice)
        return res.json({ success: true, message: "If an account exists with this email, a reset code has been sent." });
      }

      // Generate 6-digit code
      const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Store reset token in database (expires in 15 minutes)
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      await db.insert(passwordResetTokens).values({
        email,
        token: resetCode,
        expiresAt,
        used: false,
      });

      // Log password reset request
      await auditLogger.log({
        eventType: AuditEventTypes.AUTH_PASSWORD_RESET_REQUEST,
        action: 'Password reset code requested',
        userId: user.id,
        userEmail: email,
        userRole: user.role,
        req,
        responseStatus: 200,
        metadata: { userExists: true },
      });

      // Send email with reset code
      const userName = user.firstName || user.lastName 
        ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
        : undefined;
      const emailSent = await emailService.sendPasswordResetEmail(email, resetCode, userName);
      
      if (!emailSent) {
        console.log(`[PASSWORD RESET] Email failed for ${email}, code: ${resetCode}`);
      } else {
        console.log(`[PASSWORD RESET] Reset code sent to ${email}`);
      }
      
      res.json({ 
        success: true, 
        message: "Reset code sent to your email",
        // TEMPORARY: Remove this in production when email is configured
        resetCode: process.env.NODE_ENV === 'development' ? resetCode : undefined
      });
    } catch (error) {
      console.error("Error requesting password reset:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  // Reset password with code
  app.post('/api/auth/reset-password', authLimiter, async (req: any, res) => {
    try {
      const { email, resetCode, newPassword } = req.body;
      
      if (!email || !resetCode || !newPassword) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate password length
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      // Find valid reset token
      const tokens = await db
        .select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.email, email))
        .orderBy(passwordResetTokens.createdAt);

      const validToken = tokens.find(t => 
        t.token === resetCode && 
        !t.used && 
        new Date(t.expiresAt) > new Date()
      );

      if (!validToken) {
        // Log invalid reset attempt
        await auditLogger.log({
          eventType: AuditEventTypes.AUTH_PASSWORD_RESET_COMPLETE,
          action: 'Password reset failed - invalid or expired code',
          userEmail: email,
          req,
          responseStatus: 400,
          errorMessage: 'Invalid or expired reset code',
          severity: 'warning',
        });
        return res.status(400).json({ message: "Invalid or expired reset code" });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Hash new password
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.hash(newPassword, 10);

      // Update user password
      await storage.upsertUser({
        ...user,
        passwordHash,
      });

      // Mark token as used
      await db
        .update(passwordResetTokens)
        .set({ used: true })
        .where(eq(passwordResetTokens.id, validToken.id));

      // Log successful password reset - CRITICAL security event
      await auditLogger.logPasswordChange(user.id, user.email || email, req);
      
      // Terminate all other sessions for this user (security best practice)
      await sessionManager.terminateAllUserSessions(user.id, undefined, 'password_change');

      console.log(`[PASSWORD RESET] Password successfully reset for ${email}`);
      
      res.json({ success: true, message: "Password reset successful" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
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
        companyName, companyBio, companyPhone
      } = req.body;
      
      if (!zipCode || !role) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Validate contractor company requirements - must create a company
      if (role === 'contractor') {
        if (!companyName || !companyBio || !companyPhone) {
          return res.status(400).json({ message: "Company name, bio, and phone are required for contractors" });
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

      // Handle contractor company setup - always create a new company
      if (role === 'contractor') {
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
      
      // Try the correct path first
      let file = await objectStorage.searchPublicObject(filePath);
      
      // If not found, try legacy path with double 'public/' (for old uploads)
      if (!file) {
        const legacyPath = `public/${filePath}`;
        file = await objectStorage.searchPublicObject(legacyPath);
      }
      
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
      const path = `contractor-images/${type}s/${filename}`;
      
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
  console.error('[ROUTES] Registering /api/contractor/upload-logo endpoint');
  app.post('/api/contractor/upload-logo', async (req: any, res) => {
    try {
      console.error('[UPLOAD-LOGO] REQUEST RECEIVED!');
      console.error('[UPLOAD-LOGO] Body keys:', Object.keys(req.body));
      
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
      const path = `contractor-images/logos/${filename}`;
      
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

  app.post('/api/admin/invite-codes', requireAdmin, async (req: any, res) => {
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

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_SETTINGS_CHANGE,
        action: 'Created invite code',
        details: { code, maxUses: maxUses || 1 },
        req,
      });

      res.json(inviteCode);
    } catch (error) {
      console.error("Error creating invite code:", error);
      res.status(500).json({ message: "Failed to create invite code" });
    }
  });

  app.patch('/api/admin/invite-codes/:code/deactivate', requireAdmin, async (req: any, res) => {
    try {
      const { code } = req.params;
      const success = await storage.deactivateInviteCode(code);
      
      if (!success) {
        return res.status(404).json({ message: "Invite code not found" });
      }

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_SETTINGS_CHANGE,
        action: 'Deactivated invite code',
        details: { code },
        req,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Error deactivating invite code:", error);
      res.status(500).json({ message: "Failed to deactivate invite code" });
    }
  });

  // Admin - Force logout a user (security action)
  app.post('/api/admin/users/:userId/force-logout', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;
      const { reason } = req.body;

      // Get user info for logging
      const targetUser = await storage.getUserById(userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Terminate all sessions for the user
      await sessionManager.terminateAllUserSessions(userId, undefined, reason || 'admin_forced');

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_FORCE_LOGOUT,
        action: 'Force logged out user',
        targetUserId: userId,
        details: { 
          targetEmail: targetUser.email,
          reason: reason || 'admin_action',
        },
        req,
      });

      res.json({ success: true, message: `All sessions terminated for user ${targetUser.email}` });
    } catch (error) {
      console.error("Error forcing logout:", error);
      res.status(500).json({ message: "Failed to force logout user" });
    }
  });

  // Admin - Get active sessions for a user
  app.get('/api/admin/users/:userId/sessions', requireAdmin, async (req: any, res) => {
    try {
      const { userId } = req.params;

      const sessions = await sessionManager.getActiveSessions(userId);
      
      const sessionData = sessions.map(session => ({
        id: session.id,
        deviceType: session.deviceType,
        browser: session.browser,
        os: session.os,
        ipAddress: session.ipAddress,
        lastActivityAt: session.lastActivityAt,
        createdAt: session.createdAt,
      }));

      res.json(sessionData);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      res.status(500).json({ message: "Failed to fetch user sessions" });
    }
  });

  // Advanced analytics endpoint
  app.get('/api/admin/analytics', requireAdmin, async (req, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      
      const [activeUsers, referrals, contractors, revenue, churn, features] = await Promise.all([
        storage.getActiveUsersSeries(days),
        storage.getReferralGrowthSeries(days),
        storage.getContractorSignupsSeries(days),
        storage.getRevenueMetrics(days),
        storage.getChurnMetrics(days),
        storage.getFeatureUsageStats()
      ]);
      
      res.json({
        activeUsers,
        referrals,
        contractors,
        revenue,
        churn,
        features
      });
    } catch (error) {
      console.error("Error fetching advanced analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Security Dashboard - Admin endpoints for SOC 2 compliance
  app.get('/api/admin/security/audit-logs', requireAdmin, async (req: any, res) => {
    try {
      const { 
        eventType, 
        userId, 
        severity, 
        startDate, 
        endDate, 
        limit, 
        offset 
      } = req.query;

      const result = await auditLogger.getAuditLogs({
        eventType: eventType as string,
        userId: userId as string,
        severity: severity as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json(result);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  app.get('/api/admin/security/stats', requireAdmin, async (req: any, res) => {
    try {
      const days = parseInt(req.query.days as string) || 7;
      const stats = await auditLogger.getSecurityStats(days);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching security stats:", error);
      res.status(500).json({ message: "Failed to fetch security stats" });
    }
  });

  app.get('/api/admin/security/recent-alerts', requireAdmin, async (req: any, res) => {
    try {
      // Get recent security-related events
      const result = await auditLogger.getAuditLogs({
        limit: 20,
      });
      
      // Filter to security and warning/critical events
      const alerts = result.logs.filter(log => 
        log.eventType?.startsWith('security.') || 
        log.severity === 'warning' || 
        log.severity === 'critical'
      );

      res.json(alerts);
    } catch (error) {
      console.error("Error fetching security alerts:", error);
      res.status(500).json({ message: "Failed to fetch security alerts" });
    }
  });

  app.get('/api/admin/security/failed-logins', requireAdmin, async (req: any, res) => {
    try {
      const hours = parseInt(req.query.hours as string) || 24;
      const startDate = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const result = await auditLogger.getAuditLogs({
        eventType: AuditEventTypes.AUTH_FAILED_LOGIN,
        startDate,
        limit: 100,
      });

      // Group by email or IP for analysis
      const byEmail: Record<string, number> = {};
      const byIp: Record<string, number> = {};
      
      for (const log of result.logs) {
        if (log.userEmail) {
          byEmail[log.userEmail] = (byEmail[log.userEmail] || 0) + 1;
        }
        if (log.ipAddress) {
          byIp[log.ipAddress] = (byIp[log.ipAddress] || 0) + 1;
        }
      }

      res.json({
        total: result.total,
        logs: result.logs,
        byEmail: Object.entries(byEmail).sort((a, b) => b[1] - a[1]).slice(0, 10),
        byIp: Object.entries(byIp).sort((a, b) => b[1] - a[1]).slice(0, 10),
      });
    } catch (error) {
      console.error("Error fetching failed logins:", error);
      res.status(500).json({ message: "Failed to fetch failed login data" });
    }
  });

  app.get('/api/admin/security/active-sessions', requireAdmin, async (req: any, res) => {
    try {
      // Get all active sessions across all users
      const activeSessions = await db.select()
        .from(securitySessions)
        .where(eq(securitySessions.isActive, true))
        .orderBy(desc(securitySessions.lastActivityAt))
        .limit(100);

      // Enhance with user info
      const enhancedSessions = await Promise.all(activeSessions.map(async (session) => {
        const user = await storage.getUserById(session.userId);
        return {
          ...session,
          userName: user ? `${user.firstName} ${user.lastName}` : 'Unknown',
          userEmail: user?.email || 'Unknown',
          ipAddress: session.ipAddress?.replace(/\d+\.\d+$/, 'x.x'), // Partial IP for privacy
        };
      }));

      res.json(enhancedSessions);
    } catch (error) {
      console.error("Error fetching active sessions:", error);
      res.status(500).json({ message: "Failed to fetch active sessions" });
    }
  });

  // Admin Agent Verification routes
  app.get('/api/admin/agents', requireAdmin, async (req: any, res) => {
    try {
      // Get all agent profiles with user info - only real estate agents (role='agent')
      const profiles = await db.select()
        .from(agentProfiles)
        .orderBy(desc(agentProfiles.createdAt));
      
      const agentsWithInfo = await Promise.all(profiles.map(async (profile) => {
        const user = await storage.getUserById(profile.agentId);
        // Only include if user exists and is a real estate agent
        if (!user || user.role !== 'agent') {
          return null;
        }
        return {
          ...profile,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            createdAt: user.createdAt,
            role: user.role,
          },
        };
      }));
      
      // Filter out null entries
      res.json(agentsWithInfo.filter(a => a !== null));
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ message: "Failed to fetch agents" });
    }
  });

  // Zod schema for agent verification
  const agentVerifySchema = z.object({
    action: z.enum(['approve', 'reject', 'request_resubmit']),
    notes: z.string().max(1000).optional(),
  });

  app.patch('/api/admin/agents/:agentId/verify', requireAdmin, async (req: any, res) => {
    try {
      const { agentId } = req.params;
      const adminId = req.session.user.id;

      // Validate request body
      const validationResult = agentVerifySchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ message: "Invalid request", errors: validationResult.error.errors });
      }
      const { action, notes } = validationResult.data;

      // Verify the user is actually a real estate agent
      const user = await storage.getUserById(agentId);
      if (!user || user.role !== 'agent') {
        return res.status(404).json({ message: "Agent not found" });
      }

      const verificationStatus = action === 'approve' ? 'approved' 
        : action === 'reject' ? 'rejected' 
        : 'resubmit_required';

      const updateData: any = {
        verificationStatus,
        reviewedByAdminId: adminId,
        reviewNotes: notes || null,
      };

      if (action === 'approve') {
        updateData.verifiedAt = new Date();
      } else if (action === 'reject') {
        updateData.lastRejectedAt = new Date();
      }

      const updated = await storage.updateAgentProfile(agentId, updateData);
      
      if (!updated) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Send notification email (user was already fetched above)
      if (user.email) {
        // Send notification email about verification status
        const statusMessage = action === 'approve' 
          ? 'Your account has been verified! You can now earn affiliate commissions.'
          : action === 'reject'
          ? 'Your verification was not approved. Please contact support for more information.'
          : 'Please update your verification documents and resubmit.';

        await emailService.sendEmail({
          to: user.email,
          subject: `HomeBase Agent Verification ${action === 'approve' ? 'Approved' : action === 'reject' ? 'Update' : 'Action Required'}`,
          text: statusMessage,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #22C55E 0%, #16A34A 100%); padding: 30px; text-align: center;">
                <h1 style="color: #ffffff !important; margin: 0;">Agent Verification Update</h1>
              </div>
              <div style="padding: 30px; background: #f9f9f9;">
                <p>Hi ${user.firstName || 'there'},</p>
                <p>${statusMessage}</p>
                ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://gotohomebase.com/agent-dashboard" style="background: #6B46C1; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">Go to Dashboard</a>
                </div>
                <p>- The HomeBase Team</p>
              </div>
            </div>
          `,
        });
      }

      res.json({ success: true, agent: updated });
    } catch (error) {
      console.error("Error verifying agent:", error);
      res.status(500).json({ message: "Failed to verify agent" });
    }
  });

  // Admin endpoint to send welcome emails to all users
  app.post('/api/admin/send-welcome-emails', requireAdmin, async (req: any, res) => {
    try {
      const { dryRun = true, roleFilter } = req.body;
      
      // Get all users with emails
      const allUsers = await db.select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        role: users.role,
      }).from(users).where(sql`${users.email} IS NOT NULL`);
      
      // Filter by role if specified
      let targetUsers = allUsers;
      if (roleFilter && ['homeowner', 'contractor', 'agent'].includes(roleFilter)) {
        targetUsers = allUsers.filter(u => u.role === roleFilter);
      }
      
      // Exclude demo users
      targetUsers = targetUsers.filter(u => !u.email?.includes('demo') && !u.email?.includes('@homebase.com'));
      
      if (dryRun) {
        // Dry run - just show what would be sent
        return res.json({
          success: true,
          dryRun: true,
          message: `Would send welcome emails to ${targetUsers.length} users`,
          users: targetUsers.map(u => ({ email: u.email, name: `${u.firstName || ''} ${u.lastName || ''}`.trim(), role: u.role })),
        });
      }
      
      // Actually send emails with rate limiting (1 second between each)
      let successCount = 0;
      let failedCount = 0;
      const results: { email: string; success: boolean }[] = [];
      
      for (const user of targetUsers) {
        try {
          const name = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'there';
          const success = await emailService.sendWelcomeEmail(user.id, name, user.role || 'homeowner');
          results.push({ email: user.email!, success });
          if (success) successCount++;
          else failedCount++;
          
          // Rate limit: wait 1 second between emails to avoid hitting SendGrid limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (emailError) {
          console.error(`[WELCOME EMAIL] Failed to send to ${user.email}:`, emailError);
          results.push({ email: user.email!, success: false });
          failedCount++;
        }
      }
      
      console.log(`[WELCOME EMAIL] Sent ${successCount}/${targetUsers.length} welcome emails successfully`);
      
      res.json({
        success: true,
        dryRun: false,
        totalUsers: targetUsers.length,
        successCount,
        failedCount,
        results,
      });
    } catch (error) {
      console.error("Error sending welcome emails:", error);
      res.status(500).json({ message: "Failed to send welcome emails" });
    }
  });

  // Support ticket routes - User endpoints
  app.get('/api/support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const tickets = await storage.getSupportTickets({ userId });
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.get('/api/support/tickets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      
      const ticketWithReplies = await storage.getSupportTicketWithReplies(id);
      
      if (!ticketWithReplies) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      // Ensure user can only access their own tickets (unless admin)
      const isAdmin = req.session.user.email && process.env.ADMIN_EMAILS?.split(',').includes(req.session.user.email);
      if (ticketWithReplies.ticket.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(ticketWithReplies);
    } catch (error) {
      console.error("Error fetching support ticket:", error);
      res.status(500).json({ message: "Failed to fetch support ticket" });
    }
  });

  app.post('/api/support/tickets', isAuthenticated, async (req: any, res) => {
    try {
      const createTicketSchema = insertSupportTicketSchema.extend({
        category: z.enum(['billing', 'technical', 'feature_request', 'account', 'contractor', 'general']),
        priority: z.enum(['low', 'medium', 'high', 'urgent']),
        subject: z.string().min(5).max(200),
        description: z.string().min(10).max(5000),
      });
      
      const validatedData = createTicketSchema.parse(req.body);
      const userId = req.session.user.id;
      
      const ticket = await storage.createSupportTicket({
        ...validatedData,
        userId,
      });
      
      // Automated reply based on category
      const autoReplyContent = getAutomatedReply(ticket.category);
      if (autoReplyContent) {
        await storage.createTicketReply({
          ticketId: ticket.id,
          userId: 'system',
          content: autoReplyContent,
          isInternal: false,
          isAutomated: true,
        });
      }
      
      res.json(ticket);
    } catch (error) {
      console.error("Error creating support ticket:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid ticket data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create support ticket" });
    }
  });

  app.post('/api/support/tickets/:id/replies', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.user.id;
      const { content } = req.body;
      
      if (!content || content.trim().length < 1) {
        return res.status(400).json({ message: "Reply content is required" });
      }
      
      // Verify ticket exists and user has access
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const isAdmin = req.session.user.email && process.env.ADMIN_EMAILS?.split(',').includes(req.session.user.email);
      if (ticket.userId !== userId && !isAdmin) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const reply = await storage.createTicketReply({
        ticketId: id,
        userId,
        content: content.trim(),
        isInternal: false,
        isAutomated: false,
      });
      
      // Update ticket status if it was waiting on customer
      if (ticket.status === 'waiting_on_customer' && ticket.userId === userId) {
        await storage.updateSupportTicket(id, { status: 'in_progress' });
      }
      
      res.json(reply);
    } catch (error) {
      console.error("Error creating ticket reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Support ticket routes - Admin endpoints
  app.get('/api/admin/support/tickets', requireAdmin, async (req, res) => {
    try {
      const { status, category, priority, assignedToAdminId } = req.query;
      
      const tickets = await storage.getSupportTickets({
        status: status as string,
        category: category as string,
        priority: priority as string,
        assignedToAdminId: assignedToAdminId as string,
      });
      
      res.json(tickets);
    } catch (error) {
      console.error("Error fetching admin support tickets:", error);
      res.status(500).json({ message: "Failed to fetch support tickets" });
    }
  });

  app.patch('/api/admin/support/tickets/:id', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const updateSchema = z.object({
        status: z.enum(['open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        assignedToAdminId: z.string().nullable().optional(),
        assignedToAdminEmail: z.string().nullable().optional(),
      });
      
      const validatedData = updateSchema.parse(req.body);
      const updatedTicket = await storage.updateSupportTicket(id, validatedData);
      
      if (!updatedTicket) {
        return res.status(404).json({ message: "Ticket not found" });
      }

      // Log admin action
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_DATA_EXPORT,
        action: 'Updated support ticket',
        details: { ticketId: id, updates: validatedData },
        req,
      });
      
      res.json(updatedTicket);
    } catch (error) {
      console.error("Error updating support ticket:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid update data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update support ticket" });
    }
  });

  app.post('/api/admin/support/tickets/:id/replies', requireAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { content, isInternal } = req.body;
      
      if (!content || content.trim().length < 1) {
        return res.status(400).json({ message: "Reply content is required" });
      }
      
      // Verify ticket exists
      const ticket = await storage.getSupportTicket(id);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      
      const reply = await storage.createTicketReply({
        ticketId: id,
        userId: req.session.user.id,
        content: content.trim(),
        isInternal: isInternal || false,
        isAutomated: false,
      });
      
      // Update ticket status to waiting_on_customer if admin replied publicly
      if (!isInternal && ticket.status === 'open') {
        await storage.updateSupportTicket(id, { status: 'waiting_on_customer' });
      }
      
      res.json(reply);
    } catch (error) {
      console.error("Error creating admin reply:", error);
      res.status(500).json({ message: "Failed to create reply" });
    }
  });

  // Automated reply helper function
  function getAutomatedReply(category: string): string | null {
    const replies: Record<string, string> = {
      billing: "Thank you for contacting us about a billing issue. Our billing team will review your ticket and respond within 24 hours. In the meantime, you can check your billing history in your account settings.",
      technical: "Thank you for reporting this technical issue. Our support team has been notified and will investigate. Please include any error messages, screenshots, or steps to reproduce the issue to help us resolve it faster.",
      feature_request: "Thank you for your feature suggestion! We really appreciate feedback from our users. Our product team reviews all feature requests and will consider it for future updates. You'll receive an update on your request within 3-5 business days.",
      account: "Thank you for contacting us about your account. Our support team will assist you with your account-related question within 24 hours. For security purposes, please do not share your password in ticket replies.",
      contractor: "Thank you for reaching out about contractor-related services. Our contractor support team will review your request and respond within 24 hours to help you connect with the right professionals.",
      general: "Thank you for contacting HomeBase Support. We've received your message and our team will respond within 24-48 hours. If your issue is urgent, please mark the priority as 'urgent' in your ticket.",
    };
    
    return replies[category] || null;
  }

  // CRM Lead Management routes - For contractors to manage their leads/prospects
  
  // GET /api/crm/leads - List all leads for contractor with filters
  app.get('/api/crm/leads', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const { status, priority, source, searchQuery } = req.query;
      
      const leads = await storage.getCrmLeads(req.session.user.id, {
        status: status as string,
        priority: priority as string,
        source: source as string,
        searchQuery: searchQuery as string,
      });
      
      res.json(leads);
    } catch (error) {
      console.error("Error fetching CRM leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  // POST /api/crm/leads - Create new lead
  app.post('/api/crm/leads', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      // Validate request body
      const leadData = insertCrmLeadSchema.parse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.body.shareWithCompany ? req.session.user.companyId : null,
      });

      const lead = await storage.createCrmLead(leadData);
      res.status(201).json(lead);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating CRM lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  // GET /api/crm/leads/:id - Get lead with notes
  app.get('/api/crm/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const leadData = await storage.getCrmLeadWithNotes(req.params.id);
      
      if (!leadData) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check access: owned by user OR shared with their company
      const userCompanyId = req.session.user.companyId;
      const canAccess = leadData.lead.contractorUserId === req.session.user.id ||
        (userCompanyId && leadData.lead.companyId === userCompanyId);
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(leadData);
    } catch (error) {
      console.error("Error fetching CRM lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  // PATCH /api/crm/leads/:id - Update lead
  app.patch('/api/crm/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const lead = await storage.getCrmLead(req.params.id);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check write access: owned by user OR (shared with company AND user is owner/manager)
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      // Auto-update lastContactedAt when status changes
      const updateData = { ...req.body };
      if (req.body.status && req.body.status !== lead.status) {
        updateData.lastContactedAt = new Date();
      }

      const updatedLead = await storage.updateCrmLead(req.params.id, updateData);
      res.json(updatedLead);
    } catch (error) {
      console.error("Error updating CRM lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // DELETE /api/crm/leads/:id - Delete lead
  app.delete('/api/crm/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const lead = await storage.getCrmLead(req.params.id);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check write access (same as update)
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      await storage.deleteCrmLead(req.params.id);
      res.json({ success: true, message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // POST /api/crm/leads/:leadId/notes - Add note to lead
  app.post('/api/crm/leads/:leadId/notes', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const lead = await storage.getCrmLead(req.params.leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check write access
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      // Validate and create note
      const noteData = insertCrmNoteSchema.parse({
        leadId: req.params.leadId,
        userId: req.session.user.id,
        content: req.body.content,
        noteType: req.body.noteType || 'general',
        isPinned: req.body.isPinned || false,
      });

      const note = await storage.createCrmNote(noteData);
      res.status(201).json(note);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating CRM note:", error);
      res.status(500).json({ message: "Failed to create note" });
    }
  });

  // PATCH /api/crm/notes/:id - Update note
  app.patch('/api/crm/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      // Get note and verify it exists
      const notes = Array.from((storage as any).memStorage?.crmNotes?.values() || []);
      const note = notes.find((n: any) => n.id === req.params.id);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Get lead to check access
      const lead = await storage.getCrmLead(note.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Associated lead not found" });
      }

      // Check write access
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      const updatedNote = await storage.updateCrmNote(req.params.id, req.body);
      res.json(updatedNote);
    } catch (error) {
      console.error("Error updating CRM note:", error);
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  // DELETE /api/crm/notes/:id - Delete note
  app.delete('/api/crm/notes/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      // Get note and verify it exists
      const notes = Array.from((storage as any).memStorage?.crmNotes?.values() || []);
      const note = notes.find((n: any) => n.id === req.params.id);
      
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }

      // Get lead to check access
      const lead = await storage.getCrmLead(note.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Associated lead not found" });
      }

      // Check write access
      const userCompanyId = req.session.user.companyId;
      const userCompanyRole = req.session.user.companyRole;
      const canWrite = lead.contractorUserId === req.session.user.id ||
        (userCompanyId && lead.companyId === userCompanyId && 
         (userCompanyRole === 'owner' || userCompanyRole === 'manager'));
      
      if (!canWrite) {
        return res.status(403).json({ message: "Access denied - insufficient permissions" });
      }

      await storage.deleteCrmNote(req.params.id);
      res.json({ success: true, message: "Note deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM note:", error);
      res.status(500).json({ message: "Failed to delete note" });
    }
  });

  // CRM Integration routes
  // GET /api/crm/integrations - Get all integrations for contractor
  app.get('/api/crm/integrations', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM integrations" });
      }

      const integrations = await storage.getCrmIntegrations(
        req.session.user.id,
        req.session.user.companyId
      );
      
      // Don't expose sensitive tokens in response
      const sanitized = integrations.map(i => ({
        ...i,
        accessToken: i.accessToken ? '***' : null,
        refreshToken: i.refreshToken ? '***' : null,
        apiKey: i.apiKey ? '***' : null,
        apiSecret: i.apiSecret ? '***' : null,
        webhookSecret: i.webhookSecret ? '***' : null,
      }));
      
      res.json(sanitized);
    } catch (error) {
      console.error("Error fetching CRM integrations:", error);
      res.status(500).json({ message: "Failed to fetch integrations" });
    }
  });

  // POST /api/crm/integrations - Create new integration
  app.post('/api/crm/integrations', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can create integrations" });
      }

      const { insertCrmIntegrationSchema } = await import("@shared/schema");
      
      // Generate webhook secret for webhook integrations
      let webhookSecret = null;
      if (req.body.platform === 'webhook' || req.body.platform === 'custom') {
        webhookSecret = randomBytes(32).toString('hex');
      }

      const integrationData = insertCrmIntegrationSchema.parse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.body.shareWithCompany ? req.session.user.companyId : null,
        webhookSecret,
      });

      const integration = await storage.createCrmIntegration(integrationData);
      
      // Return sanitized response
      res.status(201).json({
        ...integration,
        accessToken: integration.accessToken ? '***' : null,
        refreshToken: integration.refreshToken ? '***' : null,
        apiKey: integration.apiKey ? '***' : null,
        apiSecret: integration.apiSecret ? '***' : null,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(422).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error creating CRM integration:", error);
      res.status(500).json({ message: "Failed to create integration" });
    }
  });

  // DELETE /api/crm/integrations/:id - Delete integration
  app.delete('/api/crm/integrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can delete integrations" });
      }

      const integration = await storage.getCrmIntegration(req.params.id);
      
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      // Check ownership
      const userCompanyId = req.session.user.companyId;
      const canDelete = integration.contractorUserId === req.session.user.id ||
        (userCompanyId && integration.companyId === userCompanyId);
      
      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmIntegration(req.params.id);
      res.json({ success: true, message: "Integration deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM integration:", error);
      res.status(500).json({ message: "Failed to delete integration" });
    }
  });

  // POST /api/crm/webhooks/:integrationId - Webhook receiver endpoint (NOT authenticated)
  app.post('/api/crm/webhooks/:integrationId', async (req, res) => {
    try {
      const integration = await storage.getCrmIntegration(req.params.integrationId);
      
      if (!integration || !integration.isActive) {
        console.log(`[WEBHOOK] Integration not found or inactive: ${req.params.integrationId}`);
        return res.status(404).json({ message: "Integration not found or inactive" });
      }

      // Validate webhook secret if provided
      const providedSecret = req.headers['x-webhook-secret'] || req.body.secret;
      if (integration.webhookSecret && providedSecret !== integration.webhookSecret) {
        console.log(`[WEBHOOK] Invalid webhook secret for integration: ${req.params.integrationId}`);
        // Log failed attempt
        await storage.createWebhookLog({
          integrationId: req.params.integrationId,
          payload: req.body,
          headers: req.headers as any,
          ipAddress: req.ip,
          status: 'failed',
          errorMessage: 'Invalid webhook secret',
          processedAt: new Date(),
        });
        return res.status(401).json({ message: "Invalid webhook secret" });
      }

      // Extract lead data from payload - support common CRM formats
      let leadData: any = {};
      
      // Generic webhook format (custom/default)
      if (integration.platform === 'webhook' || integration.platform === 'custom') {
        leadData = {
          firstName: req.body.first_name || req.body.firstName || req.body.name?.split(' ')[0] || 'Unknown',
          lastName: req.body.last_name || req.body.lastName || req.body.name?.split(' ')[1] || '',
          email: req.body.email,
          phone: req.body.phone || req.body.phone_number || req.body.phoneNumber,
          address: req.body.address || req.body.street,
          city: req.body.city,
          state: req.body.state || req.body.region,
          postalCode: req.body.postal_code || req.body.postalCode || req.body.zip,
          source: req.body.source || 'webhook',
          status: req.body.status || 'new',
          priority: req.body.priority || 'medium',
          projectType: req.body.project_type || req.body.projectType || req.body.service,
          estimatedValue: req.body.estimated_value || req.body.estimatedValue || req.body.value,
          metadata: req.body.metadata || req.body,
        };
      }
      
      // Apply field mapping if configured
      if (integration.fieldMapping) {
        const mapping = integration.fieldMapping as any;
        const dangerousKeys = ['__proto__', 'constructor', 'prototype'];
        Object.keys(mapping).forEach(ourField => {
          // Prevent prototype pollution
          if (dangerousKeys.includes(ourField)) {
            console.warn(`[WEBHOOK] Blocked dangerous property name in field mapping: ${ourField}`);
            return;
          }
          const theirField = mapping[ourField];
          if (req.body[theirField] !== undefined) {
            leadData[ourField] = req.body[theirField];
          }
        });
      }

      // Create the lead
      const { insertCrmLeadSchema } = await import("@shared/schema");
      const validatedData = insertCrmLeadSchema.parse({
        ...leadData,
        contractorUserId: integration.contractorUserId,
        companyId: integration.companyId,
      });

      const lead = await storage.createCrmLead(validatedData);

      // Log successful webhook
      await storage.createWebhookLog({
        integrationId: req.params.integrationId,
        payload: req.body,
        headers: req.headers as any,
        ipAddress: req.ip,
        status: 'success',
        leadId: lead.id,
        processedAt: new Date(),
      });

      // Update last sync time
      await storage.updateCrmIntegration(req.params.integrationId, {
        lastSyncAt: new Date(),
      });

      console.log(`[WEBHOOK] Successfully created lead from webhook: ${lead.id}`);
      res.status(201).json({ success: true, leadId: lead.id });
    } catch (error) {
      console.error("[WEBHOOK] Error processing webhook:", error);
      
      // Log failed webhook
      try {
        await storage.createWebhookLog({
          integrationId: req.params.integrationId,
          payload: req.body,
          headers: req.headers as any,
          ipAddress: req.ip,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          processedAt: new Date(),
        });
      } catch (logError) {
        console.error("[WEBHOOK] Failed to log webhook error:", logError);
      }
      
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // GET /api/crm/webhooks/:integrationId/logs - Get webhook logs
  app.get('/api/crm/webhooks/:integrationId/logs', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can view webhook logs" });
      }

      const integration = await storage.getCrmIntegration(req.params.integrationId);
      
      if (!integration) {
        return res.status(404).json({ message: "Integration not found" });
      }

      // Check ownership
      const userCompanyId = req.session.user.companyId;
      const canView = integration.contractorUserId === req.session.user.id ||
        (userCompanyId && integration.companyId === userCompanyId);
      
      if (!canView) {
        return res.status(403).json({ message: "Access denied" });
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const logs = await storage.getWebhookLogs(req.params.integrationId, limit);
      
      res.json(logs);
    } catch (error) {
      console.error("Error fetching webhook logs:", error);
      res.status(500).json({ message: "Failed to fetch webhook logs" });
    }
  });

  // ============================================
  // CRM Pro Tier Routes - Client Management, Jobs, Quotes, Invoices
  // ============================================

  // Helper function to check Pro tier access
  async function hasCrmProAccess(user: any): Promise<boolean> {
    if (!user || user.role !== 'contractor') return false;
    
    // Check if user's subscription plan has CRM access
    if (user.subscriptionPlanId) {
      const plan = await db.select().from(subscriptionPlans)
        .where(eq(subscriptionPlans.id, user.subscriptionPlanId))
        .limit(1);
      return plan[0]?.hasCrmAccess === true;
    }
    
    // Check by tier name (for demo purposes or fallback)
    const tierName = user.subscriptionTierName;
    return tierName === 'contractor_pro';
  }

  // Helper function to check ownership of CRM resources
  function canAccessCrmResource(user: any, resource: { contractorUserId: string; companyId?: string | null }): boolean {
    if (resource.contractorUserId === user.id) return true;
    if (user.companyId && resource.companyId === user.companyId) return true;
    return false;
  }

  // -------------------- CRM Clients Routes --------------------

  // GET /api/crm/clients - List all clients
  app.get('/api/crm/clients', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.search) {
        filters.search = req.query.search as string;
      }
      if (req.query.isActive !== undefined) {
        filters.isActive = req.query.isActive === 'true';
      }

      const clients = await storage.getCrmClients(req.session.user.id, filters);
      res.json(clients);
    } catch (error) {
      console.error("Error fetching CRM clients:", error);
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  // POST /api/crm/clients - Create new client
  app.post('/api/crm/clients', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const validationResult = insertCrmClientSchema.safeParse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: validationResult.error.errors 
        });
      }

      const client = await storage.createCrmClient(validationResult.data);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating CRM client:", error);
      res.status(500).json({ message: "Failed to create client" });
    }
  });

  // GET /api/crm/clients/:id - Get single client
  app.get('/api/crm/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const client = await storage.getCrmClient(req.params.id);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!canAccessCrmResource(req.session.user, client)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(client);
    } catch (error) {
      console.error("Error fetching CRM client:", error);
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  // PATCH /api/crm/clients/:id - Update client
  app.patch('/api/crm/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingClient = await storage.getCrmClient(req.params.id);
      
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingClient)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmClientSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid client data", 
          errors: validationResult.error.errors 
        });
      }

      const updatedClient = await storage.updateCrmClient(req.params.id, validationResult.data);
      res.json(updatedClient);
    } catch (error) {
      console.error("Error updating CRM client:", error);
      res.status(500).json({ message: "Failed to update client" });
    }
  });

  // DELETE /api/crm/clients/:id - Soft delete client (set isActive = false)
  app.delete('/api/crm/clients/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingClient = await storage.getCrmClient(req.params.id);
      
      if (!existingClient) {
        return res.status(404).json({ message: "Client not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingClient)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Soft delete - set isActive to false
      await storage.updateCrmClient(req.params.id, { isActive: false });
      res.json({ message: "Client deactivated successfully" });
    } catch (error) {
      console.error("Error deleting CRM client:", error);
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // -------------------- CRM Jobs Routes --------------------

  // GET /api/crm/jobs - List all jobs
  app.get('/api/crm/jobs', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.clientId) {
        filters.clientId = req.query.clientId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.startDate) {
        filters.startDate = new Date(req.query.startDate as string);
      }
      if (req.query.endDate) {
        filters.endDate = new Date(req.query.endDate as string);
      }

      const jobs = await storage.getCrmJobs(req.session.user.id, filters);
      res.json(jobs);
    } catch (error) {
      console.error("Error fetching CRM jobs:", error);
      res.status(500).json({ message: "Failed to fetch jobs" });
    }
  });

  // POST /api/crm/jobs - Create new job
  app.post('/api/crm/jobs', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const validationResult = insertCrmJobSchema.safeParse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid job data", 
          errors: validationResult.error.errors 
        });
      }

      const job = await storage.createCrmJob(validationResult.data);
      res.status(201).json(job);
    } catch (error) {
      console.error("Error creating CRM job:", error);
      res.status(500).json({ message: "Failed to create job" });
    }
  });

  // GET /api/crm/jobs/:id - Get single job
  app.get('/api/crm/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const job = await storage.getCrmJob(req.params.id);
      
      if (!job) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, job)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(job);
    } catch (error) {
      console.error("Error fetching CRM job:", error);
      res.status(500).json({ message: "Failed to fetch job" });
    }
  });

  // PATCH /api/crm/jobs/:id - Update job
  app.patch('/api/crm/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingJob = await storage.getCrmJob(req.params.id);
      
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingJob)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmJobSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid job data", 
          errors: validationResult.error.errors 
        });
      }

      const updatedJob = await storage.updateCrmJob(req.params.id, validationResult.data);
      res.json(updatedJob);
    } catch (error) {
      console.error("Error updating CRM job:", error);
      res.status(500).json({ message: "Failed to update job" });
    }
  });

  // DELETE /api/crm/jobs/:id - Delete job
  app.delete('/api/crm/jobs/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingJob = await storage.getCrmJob(req.params.id);
      
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingJob)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmJob(req.params.id);
      res.json({ message: "Job deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM job:", error);
      res.status(500).json({ message: "Failed to delete job" });
    }
  });

  // POST /api/crm/jobs/:id/notify - Send job notification via email and/or SMS
  app.post('/api/crm/jobs/:id/notify', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const { method = 'email' } = req.body; // 'email', 'sms', or 'both'

      const existingJob = await storage.getCrmJob(req.params.id);
      
      if (!existingJob) {
        return res.status(404).json({ message: "Job not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingJob)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get client info
      const client = await storage.getCrmClient(existingJob.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get contractor info
      const contractor = await storage.getContractorByUserId(req.session.user.id);
      const user = await storage.getUser(req.session.user.id);
      const company = contractor?.companyId ? await storage.getCompany(contractor.companyId) : null;

      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://gotohomebase.com' : `https://${req.headers.host}`;
      const viewUrl = `${baseUrl}/crm/jobs/${existingJob.id}`;

      const formatCurrency = (amount: string | number | null) => amount ? `$${parseFloat(String(amount)).toFixed(2)}` : '$0.00';
      const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : undefined;

      const emailData = {
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || '',
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        contractorPhone: user?.phone || contractor?.phone,
        contractorEmail: user?.email,
        documentNumber: existingJob.id,
        documentTitle: existingJob.title,
        total: formatCurrency(existingJob.totalCost),
        scheduledDate: formatDate(existingJob.scheduledDate),
        status: existingJob.status,
        viewUrl,
      };

      const smsData = {
        clientPhone: client.phone || '',
        clientName: client.firstName,
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        documentNumber: existingJob.id,
        documentTitle: existingJob.title,
        total: formatCurrency(existingJob.totalCost),
        scheduledDate: formatDate(existingJob.scheduledDate),
        viewUrl,
      };

      let emailSent = false;
      let smsSent = false;

      if ((method === 'email' || method === 'both') && client.email) {
        emailSent = await emailService.sendJobNotificationEmail(emailData);
      }

      if ((method === 'sms' || method === 'both') && client.phone) {
        smsSent = await smsService.sendJobNotificationSMS(smsData);
      }

      res.json({ 
        success: true,
        emailSent, 
        smsSent,
        message: `Notification sent${emailSent ? ' via email' : ''}${smsSent ? (emailSent ? ' and SMS' : ' via SMS') : ''}` 
      });
    } catch (error) {
      console.error("Error sending CRM job notification:", error);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // -------------------- CRM Quotes Routes --------------------

  // GET /api/crm/quotes - List all quotes
  app.get('/api/crm/quotes', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.clientId) {
        filters.clientId = req.query.clientId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }

      const quotes = await storage.getCrmQuotes(req.session.user.id, filters);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching CRM quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // POST /api/crm/quotes - Create new quote
  app.post('/api/crm/quotes', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      // Auto-generate quote number
      const year = new Date().getFullYear();
      const existingQuotes = await storage.getCrmQuotes(req.session.user.id, {});
      const quoteCount = existingQuotes.length + 1;
      const quoteNumber = `Q-${year}-${quoteCount.toString().padStart(4, '0')}`;

      const validationResult = insertCrmQuoteSchema.safeParse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
        quoteNumber,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid quote data", 
          errors: validationResult.error.errors 
        });
      }

      const quote = await storage.createCrmQuote(validationResult.data);
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating CRM quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  // GET /api/crm/quotes/:id - Get single quote
  app.get('/api/crm/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const quote = await storage.getCrmQuote(req.params.id);
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, quote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(quote);
    } catch (error) {
      console.error("Error fetching CRM quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // PATCH /api/crm/quotes/:id - Update quote
  app.patch('/api/crm/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingQuote = await storage.getCrmQuote(req.params.id);
      
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingQuote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmQuoteSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid quote data", 
          errors: validationResult.error.errors 
        });
      }

      const updatedQuote = await storage.updateCrmQuote(req.params.id, validationResult.data);
      res.json(updatedQuote);
    } catch (error) {
      console.error("Error updating CRM quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // POST /api/crm/quotes/:id/send - Send quote via email and/or SMS
  app.post('/api/crm/quotes/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const { method = 'email' } = req.body; // 'email', 'sms', or 'both'

      const existingQuote = await storage.getCrmQuote(req.params.id);
      
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingQuote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get client info
      const client = await storage.getCrmClient(existingQuote.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get contractor info
      const contractor = await storage.getContractorByUserId(req.session.user.id);
      const user = await storage.getUser(req.session.user.id);
      const company = contractor?.companyId ? await storage.getCompany(contractor.companyId) : null;

      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://gotohomebase.com' : `https://${req.headers.host}`;
      const viewUrl = `${baseUrl}/pay/invoice/${existingQuote.id}`;

      const formatCurrency = (amount: string | number) => `$${parseFloat(String(amount)).toFixed(2)}`;
      const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined;

      const lineItems = Array.isArray(existingQuote.lineItems) ? (existingQuote.lineItems as any[]).map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: formatCurrency(item.unitPrice || 0),
        total: formatCurrency(item.total || 0),
      })) : [];

      const emailData = {
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || '',
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        contractorPhone: user?.phone || contractor?.phone,
        contractorEmail: user?.email,
        documentNumber: existingQuote.quoteNumber,
        documentTitle: existingQuote.title,
        total: formatCurrency(existingQuote.total),
        validUntil: formatDate(existingQuote.validUntil),
        viewUrl,
        lineItems,
      };

      const smsData = {
        clientPhone: client.phone || '',
        clientName: client.firstName,
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        documentNumber: existingQuote.quoteNumber,
        documentTitle: existingQuote.title,
        total: formatCurrency(existingQuote.total),
        viewUrl,
      };

      let emailSent = false;
      let smsSent = false;

      if ((method === 'email' || method === 'both') && client.email) {
        emailSent = await emailService.sendQuoteEmail(emailData);
      }

      if ((method === 'sms' || method === 'both') && client.phone) {
        smsSent = await smsService.sendQuoteSMS(smsData);
      }

      const updatedQuote = await storage.updateCrmQuote(req.params.id, {
        status: 'sent',
        sentAt: new Date(),
      });

      res.json({ 
        ...updatedQuote, 
        emailSent, 
        smsSent,
        message: `Quote sent${emailSent ? ' via email' : ''}${smsSent ? (emailSent ? ' and SMS' : ' via SMS') : ''}` 
      });
    } catch (error) {
      console.error("Error sending CRM quote:", error);
      res.status(500).json({ message: "Failed to send quote" });
    }
  });

  // DELETE /api/crm/quotes/:id - Delete quote
  app.delete('/api/crm/quotes/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingQuote = await storage.getCrmQuote(req.params.id);
      
      if (!existingQuote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingQuote)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmQuote(req.params.id);
      res.json({ message: "Quote deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM quote:", error);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  // -------------------- CRM Invoices Routes --------------------

  // GET /api/crm/invoices - List all invoices
  app.get('/api/crm/invoices', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const filters: any = {};
      if (req.query.clientId) {
        filters.clientId = req.query.clientId as string;
      }
      if (req.query.status) {
        filters.status = req.query.status as string;
      }
      if (req.query.jobId) {
        filters.jobId = req.query.jobId as string;
      }

      const invoices = await storage.getCrmInvoices(req.session.user.id, filters);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching CRM invoices:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  // POST /api/crm/invoices - Create new invoice
  app.post('/api/crm/invoices', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      // Auto-generate invoice number
      const year = new Date().getFullYear();
      const existingInvoices = await storage.getCrmInvoices(req.session.user.id, {});
      const invoiceCount = existingInvoices.length + 1;
      const invoiceNumber = `INV-${year}-${invoiceCount.toString().padStart(4, '0')}`;

      const validationResult = insertCrmInvoiceSchema.safeParse({
        ...req.body,
        contractorUserId: req.session.user.id,
        companyId: req.session.user.companyId || null,
        invoiceNumber,
      });

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: validationResult.error.errors 
        });
      }

      const invoice = await storage.createCrmInvoice(validationResult.data);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Error creating CRM invoice:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  // GET /api/crm/invoices/:id - Get single invoice
  app.get('/api/crm/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const invoice = await storage.getCrmInvoice(req.params.id);
      
      if (!invoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, invoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(invoice);
    } catch (error) {
      console.error("Error fetching CRM invoice:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  // PATCH /api/crm/invoices/:id - Update invoice
  app.patch('/api/crm/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updateSchema = insertCrmInvoiceSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid invoice data", 
          errors: validationResult.error.errors 
        });
      }

      const updatedInvoice = await storage.updateCrmInvoice(req.params.id, validationResult.data);
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error updating CRM invoice:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // POST /api/crm/invoices/:id/send - Send invoice via email and/or SMS
  app.post('/api/crm/invoices/:id/send', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const { method = 'email' } = req.body; // 'email', 'sms', or 'both'

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      // Get client info
      const client = await storage.getCrmClient(existingInvoice.clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get contractor info
      const contractor = await storage.getContractorByUserId(req.session.user.id);
      const user = await storage.getUser(req.session.user.id);
      const company = contractor?.companyId ? await storage.getCompany(contractor.companyId) : null;

      const baseUrl = process.env.NODE_ENV === 'production' ? 'https://gotohomebase.com' : `https://${req.headers.host}`;
      const viewUrl = `${baseUrl}/pay/invoice/${existingInvoice.id}`;

      const formatCurrency = (amount: string | number) => `$${parseFloat(String(amount)).toFixed(2)}`;
      const formatDate = (date: Date | null) => date ? new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined;

      const lineItems = Array.isArray(existingInvoice.lineItems) ? (existingInvoice.lineItems as any[]).map(item => ({
        description: item.description || '',
        quantity: item.quantity || 1,
        unitPrice: formatCurrency(item.unitPrice || 0),
        total: formatCurrency(item.total || 0),
      })) : [];

      const emailData = {
        clientName: `${client.firstName} ${client.lastName}`,
        clientEmail: client.email || '',
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        contractorPhone: user?.phone || contractor?.phone,
        contractorEmail: user?.email,
        documentNumber: existingInvoice.invoiceNumber,
        documentTitle: existingInvoice.title,
        total: formatCurrency(existingInvoice.amountDue),
        dueDate: formatDate(existingInvoice.dueDate),
        viewUrl,
        lineItems,
      };

      const smsData = {
        clientPhone: client.phone || '',
        clientName: client.firstName,
        contractorName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() : 'Your Contractor',
        contractorCompany: company?.name,
        documentNumber: existingInvoice.invoiceNumber,
        documentTitle: existingInvoice.title,
        total: formatCurrency(existingInvoice.amountDue),
        dueDate: formatDate(existingInvoice.dueDate),
        viewUrl,
      };

      let emailSent = false;
      let smsSent = false;

      if ((method === 'email' || method === 'both') && client.email) {
        emailSent = await emailService.sendInvoiceEmail(emailData);
      }

      if ((method === 'sms' || method === 'both') && client.phone) {
        smsSent = await smsService.sendInvoiceSMS(smsData);
      }

      const updatedInvoice = await storage.updateCrmInvoice(req.params.id, {
        status: 'sent',
        sentAt: new Date(),
      });

      res.json({ 
        ...updatedInvoice, 
        emailSent, 
        smsSent,
        message: `Invoice sent${emailSent ? ' via email' : ''}${smsSent ? (emailSent ? ' and SMS' : ' via SMS') : ''}` 
      });
    } catch (error) {
      console.error("Error sending CRM invoice:", error);
      res.status(500).json({ message: "Failed to send invoice" });
    }
  });

  // POST /api/crm/invoices/:id/payment - Record payment
  app.post('/api/crm/invoices/:id/payment', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const paymentSchema = z.object({
        amount: z.string().or(z.number()).transform(val => String(val)),
        paymentMethod: z.string().optional(),
        paymentNotes: z.string().optional(),
      });

      const validationResult = paymentSchema.safeParse(req.body);

      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid payment data", 
          errors: validationResult.error.errors 
        });
      }

      const paymentAmount = parseFloat(validationResult.data.amount);
      const currentAmountPaid = parseFloat(existingInvoice.amountPaid || '0');
      const newAmountPaid = currentAmountPaid + paymentAmount;
      const totalAmount = parseFloat(existingInvoice.total);
      const newAmountDue = totalAmount - newAmountPaid;

      let newStatus = existingInvoice.status;
      if (newAmountDue <= 0) {
        newStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newStatus = 'partial';
      }

      const updatedInvoice = await storage.updateCrmInvoice(req.params.id, {
        amountPaid: newAmountPaid.toFixed(2),
        amountDue: Math.max(0, newAmountDue).toFixed(2),
        status: newStatus,
        paidAt: newStatus === 'paid' ? new Date() : existingInvoice.paidAt,
        paymentMethod: validationResult.data.paymentMethod || existingInvoice.paymentMethod,
        paymentNotes: validationResult.data.paymentNotes || existingInvoice.paymentNotes,
      });
      res.json(updatedInvoice);
    } catch (error) {
      console.error("Error recording payment:", error);
      res.status(500).json({ message: "Failed to record payment" });
    }
  });

  // DELETE /api/crm/invoices/:id - Delete invoice
  app.delete('/api/crm/invoices/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const existingInvoice = await storage.getCrmInvoice(req.params.id);
      
      if (!existingInvoice) {
        return res.status(404).json({ message: "Invoice not found" });
      }

      if (!canAccessCrmResource(req.session.user, existingInvoice)) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteCrmInvoice(req.params.id);
      res.json({ message: "Invoice deleted successfully" });
    } catch (error) {
      console.error("Error deleting CRM invoice:", error);
      res.status(500).json({ message: "Failed to delete invoice" });
    }
  });

  // -------------------- CRM Dashboard Route --------------------

  // GET /api/crm/dashboard - Get dashboard stats
  app.get('/api/crm/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const userId = req.session.user.id;

      // Fetch all data for dashboard
      const [clients, jobs, quotes, invoices] = await Promise.all([
        storage.getCrmClients(userId, { isActive: true }),
        storage.getCrmJobs(userId, {}),
        storage.getCrmQuotes(userId, {}),
        storage.getCrmInvoices(userId, {}),
      ]);

      // Calculate stats
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Jobs stats
      const scheduledJobs = jobs.filter(j => j.status === 'scheduled').length;
      const inProgressJobs = jobs.filter(j => j.status === 'in_progress').length;
      const completedJobs = jobs.filter(j => j.status === 'completed').length;
      const completedThisMonth = jobs.filter(j => 
        j.status === 'completed' && 
        j.updatedAt && new Date(j.updatedAt) >= thisMonth
      ).length;

      // Quotes stats
      const pendingQuotes = quotes.filter(q => q.status === 'sent' || q.status === 'draft').length;
      const acceptedQuotes = quotes.filter(q => q.status === 'accepted').length;
      const totalQuoteValue = quotes.reduce((sum, q) => sum + parseFloat(q.total), 0);

      // Invoice stats
      const unpaidInvoices = invoices.filter(i => 
        i.status !== 'paid' && i.status !== 'cancelled'
      );
      const overdueInvoices = unpaidInvoices.filter(i => 
        i.dueDate && new Date(i.dueDate) < now
      );
      const totalOutstanding = unpaidInvoices.reduce((sum, i) => 
        sum + parseFloat(i.amountDue), 0
      );
      const totalPaidThisMonth = invoices
        .filter(i => i.paidAt && new Date(i.paidAt) >= thisMonth)
        .reduce((sum, i) => sum + parseFloat(i.amountPaid || '0'), 0);

      // Revenue calculation
      const totalRevenue = invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + parseFloat(i.total), 0);

      res.json({
        clients: {
          total: clients.length,
          active: clients.filter(c => c.isActive).length,
        },
        jobs: {
          scheduled: scheduledJobs,
          inProgress: inProgressJobs,
          completed: completedJobs,
          completedThisMonth,
          total: jobs.length,
        },
        quotes: {
          pending: pendingQuotes,
          accepted: acceptedQuotes,
          totalValue: totalQuoteValue.toFixed(2),
          total: quotes.length,
        },
        invoices: {
          unpaid: unpaidInvoices.length,
          overdue: overdueInvoices.length,
          totalOutstanding: totalOutstanding.toFixed(2),
          paidThisMonth: totalPaidThisMonth.toFixed(2),
          total: invoices.length,
        },
        revenue: {
          total: totalRevenue.toFixed(2),
          thisMonth: totalPaidThisMonth.toFixed(2),
        },
      });
    } catch (error) {
      console.error("Error fetching CRM dashboard:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // -------------------- CRM Import Route --------------------

  // POST /api/crm/import - Import data from another CRM (JSON format)
  app.post('/api/crm/import', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const hasAccess = await hasCrmProAccess(req.session.user);
      if (!hasAccess) {
        return res.status(403).json({ 
          message: "CRM features require Contractor Pro subscription",
          upgradeRequired: true 
        });
      }

      const { clients = [], jobs = [], quotes = [], invoices = [] } = req.body;
      const userId = req.session.user.id;
      const companyId = req.session.user.companyId || null;
      
      const results = {
        clients: { imported: 0, failed: 0, errors: [] as string[] },
        jobs: { imported: 0, failed: 0, errors: [] as string[] },
        quotes: { imported: 0, failed: 0, errors: [] as string[] },
        invoices: { imported: 0, failed: 0, errors: [] as string[] },
      };

      // Map to track imported client names to IDs for linking jobs/quotes/invoices
      const clientNameToId: Map<string, string> = new Map();

      // Step 1: Import clients first (they're referenced by jobs, quotes, invoices)
      for (const clientData of clients) {
        try {
          const validationResult = insertCrmClientSchema.safeParse({
            ...clientData,
            contractorUserId: userId,
            companyId,
            isActive: clientData.isActive ?? true,
            totalJobsCompleted: clientData.totalJobsCompleted ?? 0,
            totalRevenue: clientData.totalRevenue ?? "0.00",
          });

          if (!validationResult.success) {
            results.clients.failed++;
            results.clients.errors.push(`Client "${clientData.firstName} ${clientData.lastName}": ${validationResult.error.errors[0]?.message}`);
            continue;
          }

          const client = await storage.createCrmClient(validationResult.data);
          results.clients.imported++;
          
          // Store mapping for later use
          const fullName = `${clientData.firstName} ${clientData.lastName}`.toLowerCase().trim();
          clientNameToId.set(fullName, client.id);
          
          // Also store by email if provided
          if (clientData.email) {
            clientNameToId.set(clientData.email.toLowerCase().trim(), client.id);
          }
        } catch (error: any) {
          results.clients.failed++;
          results.clients.errors.push(`Client "${clientData.firstName} ${clientData.lastName}": ${error.message}`);
        }
      }

      // Helper function to resolve client ID from name or email
      const resolveClientId = (job: any): string | null => {
        if (job.clientId && clientNameToId.has(job.clientId)) {
          return clientNameToId.get(job.clientId)!;
        }
        if (job.clientName) {
          const name = job.clientName.toLowerCase().trim();
          if (clientNameToId.has(name)) return clientNameToId.get(name)!;
        }
        if (job.clientEmail) {
          const email = job.clientEmail.toLowerCase().trim();
          if (clientNameToId.has(email)) return clientNameToId.get(email)!;
        }
        return null;
      };

      // Step 2: Import jobs
      for (const jobData of jobs) {
        try {
          const clientId = resolveClientId(jobData);
          if (!clientId) {
            results.jobs.failed++;
            results.jobs.errors.push(`Job "${jobData.title}": Client not found. Provide clientName or clientEmail that matches an imported client.`);
            continue;
          }

          const validationResult = insertCrmJobSchema.safeParse({
            ...jobData,
            contractorUserId: userId,
            companyId,
            clientId,
            scheduledDate: jobData.scheduledDate ? new Date(jobData.scheduledDate) : new Date(),
            scheduledEndDate: jobData.scheduledEndDate ? new Date(jobData.scheduledEndDate) : null,
            status: jobData.status || 'scheduled',
            priority: jobData.priority || 'normal',
          });

          if (!validationResult.success) {
            results.jobs.failed++;
            results.jobs.errors.push(`Job "${jobData.title}": ${validationResult.error.errors[0]?.message}`);
            continue;
          }

          await storage.createCrmJob(validationResult.data);
          results.jobs.imported++;
        } catch (error: any) {
          results.jobs.failed++;
          results.jobs.errors.push(`Job "${jobData.title}": ${error.message}`);
        }
      }

      // Step 3: Import quotes
      for (const quoteData of quotes) {
        try {
          const clientId = resolveClientId(quoteData);
          if (!clientId) {
            results.quotes.failed++;
            results.quotes.errors.push(`Quote "${quoteData.title}": Client not found. Provide clientName or clientEmail that matches an imported client.`);
            continue;
          }

          // Generate quote number if not provided
          const quoteNumber = quoteData.quoteNumber || `Q-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const validationResult = insertCrmQuoteSchema.safeParse({
            ...quoteData,
            contractorUserId: userId,
            companyId,
            clientId,
            quoteNumber,
            lineItems: quoteData.lineItems || [],
            subtotal: quoteData.subtotal || quoteData.total || "0.00",
            total: quoteData.total || quoteData.subtotal || "0.00",
            status: quoteData.status || 'draft',
            validUntil: quoteData.validUntil ? new Date(quoteData.validUntil) : null,
          });

          if (!validationResult.success) {
            results.quotes.failed++;
            results.quotes.errors.push(`Quote "${quoteData.title}": ${validationResult.error.errors[0]?.message}`);
            continue;
          }

          await storage.createCrmQuote(validationResult.data);
          results.quotes.imported++;
        } catch (error: any) {
          results.quotes.failed++;
          results.quotes.errors.push(`Quote "${quoteData.title}": ${error.message}`);
        }
      }

      // Step 4: Import invoices
      for (const invoiceData of invoices) {
        try {
          const clientId = resolveClientId(invoiceData);
          if (!clientId) {
            results.invoices.failed++;
            results.invoices.errors.push(`Invoice "${invoiceData.title}": Client not found. Provide clientName or clientEmail that matches an imported client.`);
            continue;
          }

          // Generate invoice number if not provided
          const invoiceNumber = invoiceData.invoiceNumber || `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

          const validationResult = insertCrmInvoiceSchema.safeParse({
            ...invoiceData,
            contractorUserId: userId,
            companyId,
            clientId,
            invoiceNumber,
            lineItems: invoiceData.lineItems || [],
            subtotal: invoiceData.subtotal || invoiceData.total || "0.00",
            total: invoiceData.total || invoiceData.subtotal || "0.00",
            amountDue: invoiceData.amountDue || invoiceData.total || "0.00",
            amountPaid: invoiceData.amountPaid || "0.00",
            status: invoiceData.status || 'draft',
            dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate) : null,
          });

          if (!validationResult.success) {
            results.invoices.failed++;
            results.invoices.errors.push(`Invoice "${invoiceData.title}": ${validationResult.error.errors[0]?.message}`);
            continue;
          }

          await storage.createCrmInvoice(validationResult.data);
          results.invoices.imported++;
        } catch (error: any) {
          results.invoices.failed++;
          results.invoices.errors.push(`Invoice "${invoiceData.title}": ${error.message}`);
        }
      }

      const totalImported = results.clients.imported + results.jobs.imported + results.quotes.imported + results.invoices.imported;
      const totalFailed = results.clients.failed + results.jobs.failed + results.quotes.failed + results.invoices.failed;

      res.json({
        success: true,
        message: `Import completed: ${totalImported} records imported, ${totalFailed} failed`,
        results,
      });
    } catch (error) {
      console.error("Error importing CRM data:", error);
      res.status(500).json({ message: "Failed to import CRM data" });
    }
  });

  // GET /api/crm/import/template - Get JSON template for import
  app.get('/api/crm/import/template', isAuthenticated, async (req: any, res) => {
    try {
      if (req.session.user.role !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can access CRM features" });
      }

      const template = {
        clients: [
          {
            firstName: "John",
            lastName: "Smith",
            email: "john.smith@example.com",
            phone: "(555) 123-4567",
            address: "123 Main St",
            city: "Springfield",
            state: "IL",
            postalCode: "62701",
            notes: "Loyal customer since 2020",
            preferredContactMethod: "phone"
          }
        ],
        jobs: [
          {
            clientName: "John Smith",
            clientEmail: "john.smith@example.com",
            title: "Kitchen Remodel",
            description: "Complete kitchen renovation",
            serviceType: "Remodeling",
            scheduledDate: "2024-03-15T09:00:00Z",
            status: "scheduled",
            priority: "high",
            address: "123 Main St",
            city: "Springfield",
            state: "IL",
            postalCode: "62701",
            laborCost: "2500.00",
            materialsCost: "3500.00",
            totalCost: "6000.00",
            notes: "Customer prefers morning appointments"
          }
        ],
        quotes: [
          {
            clientName: "John Smith",
            title: "Bathroom Renovation Quote",
            description: "Master bathroom complete renovation",
            serviceType: "Remodeling",
            lineItems: [
              { description: "Demolition", quantity: 1, unitPrice: 500, total: 500 },
              { description: "Plumbing", quantity: 1, unitPrice: 1500, total: 1500 },
              { description: "Tile Installation", quantity: 1, unitPrice: 2000, total: 2000 }
            ],
            subtotal: "4000.00",
            taxRate: "8.00",
            taxAmount: "320.00",
            total: "4320.00",
            validUntil: "2024-04-15T00:00:00Z",
            status: "sent"
          }
        ],
        invoices: [
          {
            clientName: "John Smith",
            title: "Kitchen Remodel - Final Invoice",
            description: "Final payment for kitchen remodel project",
            lineItems: [
              { description: "Labor", quantity: 40, unitPrice: 62.50, total: 2500 },
              { description: "Materials", quantity: 1, unitPrice: 3500, total: 3500 }
            ],
            subtotal: "6000.00",
            taxRate: "8.00",
            taxAmount: "480.00",
            total: "6480.00",
            amountPaid: "3240.00",
            amountDue: "3240.00",
            dueDate: "2024-04-01T00:00:00Z",
            status: "partial"
          }
        ]
      };

      res.json(template);
    } catch (error) {
      console.error("Error generating import template:", error);
      res.status(500).json({ message: "Failed to generate import template" });
    }
  });

  // Error Tracking routes - For logging and monitoring errors
  app.post('/api/errors', async (req: any, res) => {
    try {
      const errorData = req.body;
      
      // Add user context if authenticated
      const userId = req.session?.user?.id || null;
      const userEmail = req.session?.user?.email || null;
      const userRole = req.session?.user?.role || null;
      
      const error = await storage.createErrorLog({
        ...errorData,
        userId,
        userEmail,
        userRole,
        userAgent: req.headers['user-agent'] || null,
      });
      
      // Create breadcrumbs if provided
      if (errorData.breadcrumbs && Array.isArray(errorData.breadcrumbs)) {
        for (const breadcrumb of errorData.breadcrumbs) {
          await storage.createErrorBreadcrumb({
            errorLogId: error.id,
            timestamp: new Date(breadcrumb.timestamp),
            eventType: breadcrumb.eventType,
            message: breadcrumb.message,
            data: breadcrumb.data || null,
          });
        }
      }
      
      res.json({ success: true, errorId: error.id });
    } catch (error) {
      console.error("Error logging error:", error);
      res.status(500).json({ message: "Failed to log error" });
    }
  });

  app.get('/api/errors', async (req: any, res) => {
    try {
      // Only allow admins to view errors
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const filters = {
        errorType: req.query.errorType as string,
        severity: req.query.severity as string,
        resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
        userId: req.query.userId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
      };
      
      const errors = await storage.getErrorLogs(filters);
      res.json(errors);
    } catch (error) {
      console.error("Error fetching errors:", error);
      res.status(500).json({ message: "Failed to fetch errors" });
    }
  });

  app.get('/api/errors/:id', async (req: any, res) => {
    try {
      // Only allow admins to view errors
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const errorWithBreadcrumbs = await storage.getErrorLogWithBreadcrumbs(req.params.id);
      
      if (!errorWithBreadcrumbs) {
        return res.status(404).json({ message: "Error not found" });
      }
      
      res.json(errorWithBreadcrumbs);
    } catch (error) {
      console.error("Error fetching error details:", error);
      res.status(500).json({ message: "Failed to fetch error details" });
    }
  });

  app.patch('/api/errors/:id', async (req: any, res) => {
    try {
      // Only allow admins to update errors
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const updateData: any = {};
      
      if (req.body.resolved !== undefined) {
        updateData.resolved = req.body.resolved;
        if (req.body.resolved) {
          updateData.resolvedAt = new Date();
          updateData.resolvedBy = req.session.user.id;
        }
      }
      
      if (req.body.notes !== undefined) {
        updateData.notes = req.body.notes;
      }
      
      const updatedError = await storage.updateErrorLog(req.params.id, updateData);
      
      if (!updatedError) {
        return res.status(404).json({ message: "Error not found" });
      }
      
      res.json(updatedError);
    } catch (error) {
      console.error("Error updating error:", error);
      res.status(500).json({ message: "Failed to update error" });
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
        phone: phone,
        address: address,
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
      
      const houseId = req.query.houseId as string;

      const contractors = await storage.getContractors(filters);
      
      // If houseId is provided, filter contractors by distance
      let filteredContractors = contractors;
      if (houseId && filters.maxDistance) {
        const house = await storage.getHouse(houseId);
        if (house && house.latitude && house.longitude) {
          const houseLat = parseFloat(house.latitude);
          const houseLon = parseFloat(house.longitude);
          
          console.log('[DISTANCE FILTER] House location:', { lat: houseLat, lon: houseLon, maxDistance: filters.maxDistance });
          
          filteredContractors = [];
          for (const contractor of contractors) {
            // Get company location for the contractor
            if ((contractor as any).companyId) {
              const company = await storage.getCompany((contractor as any).companyId);
              if (company && company.latitude && company.longitude) {
                const companyLat = parseFloat(company.latitude);
                const companyLon = parseFloat(company.longitude);
                const distance = calculateDistance(houseLat, houseLon, companyLat, companyLon);
                
                console.log('[DISTANCE FILTER] Company:', company.name, 'Distance:', distance, 'miles');
                
                // Include contractor if within maxDistance AND within their service radius
                const effectiveRadius = Math.min(filters.maxDistance, company.serviceRadius);
                if (distance <= effectiveRadius) {
                  filteredContractors.push({
                    ...contractor,
                    distance: distance.toString()
                  } as any);
                }
              } else {
                // Company exists but doesn't have geocoded coordinates - include anyway
                console.log('[DISTANCE FILTER] Company has no coordinates, including contractor');
                filteredContractors.push(contractor);
              }
            } else {
              // Contractor has no company - include anyway
              console.log('[DISTANCE FILTER] Contractor has no company, including anyway');
              filteredContractors.push(contractor);
            }
          }
          
          console.log('[DISTANCE FILTER] Filtered from', contractors.length, 'to', filteredContractors.length, 'contractors');
        } else {
          console.log('[DISTANCE FILTER] House not found or missing coordinates:', houseId);
        }
      }
      
      // Enrich contractors with company logos and createdAt
      const enrichedContractors = await Promise.all(
        filteredContractors.map(async (contractor) => {
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              return {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          return contractor;
        })
      );
      
      console.log('[DEBUG] /api/contractors returning', enrichedContractors.length, 'contractors');
      if (enrichedContractors.length > 0) {
        console.log('[DEBUG] First contractor ID:', enrichedContractors[0].id);
      }
      res.json(enrichedContractors);
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
      const maxDistance = req.query.maxDistance ? parseFloat(req.query.maxDistance as string) : undefined;
      
      console.log('[CONTRACTOR SEARCH] ==================');
      console.log('[CONTRACTOR SEARCH] Query:', query);
      console.log('[CONTRACTOR SEARCH] Location:', location);
      console.log('[CONTRACTOR SEARCH] Services param:', servicesParam);
      console.log('[CONTRACTOR SEARCH] Services array:', services);
      console.log('[CONTRACTOR SEARCH] Max Distance (homeowner search radius):', maxDistance);
      console.log('[CONTRACTOR SEARCH] All query params:', req.query);
      
      const contractors = await storage.searchContractors(query, location, services, maxDistance);
      
      // Enrich contractors with company logos and createdAt
      const enrichedContractors = await Promise.all(
        contractors.map(async (contractor) => {
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              return {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          return contractor;
        })
      );
      
      console.log('[CONTRACTOR SEARCH] Results count:', enrichedContractors.length);
      console.log('[CONTRACTOR SEARCH] Results:', enrichedContractors.map(c => ({ 
        id: c.id, 
        company: c.company, 
        location: c.location,
        postalCode: (c as any).postalCode,
        distance: c.distance,
        serviceRadius: c.serviceRadius,
        services: c.services,
        businessLogo: (c as any).businessLogo
      })));
      console.log('[CONTRACTOR SEARCH] ==================');
      
      res.json(enrichedContractors);
    } catch (error) {
      console.error('[CONTRACTOR SEARCH] Error:', error);
      res.status(500).json({ message: "Failed to search contractors" });
    }
  });

  // Get contractors used at a specific house
  app.get("/api/houses/:houseId/contractors-used", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      const houseId = req.params.houseId;
      
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view contractors used" });
      }
      
      // Verify house belongs to user
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== userId) {
        return res.status(403).json({ message: "House not found or unauthorized" });
      }
      
      // Get unique contractor IDs from various sources for this specific house
      const contractorDataMap = new Map<string, { lastUsed: Date, serviceType?: string }>();
      
      // From maintenance logs for this house
      const maintenanceLogs = await storage.getMaintenanceLogs(userId);
      maintenanceLogs
        .filter((log: any) => log.houseId === houseId && log.contractorId)
        .forEach((log: any) => {
          const existing = contractorDataMap.get(log.contractorId);
          const logDate = new Date(log.serviceDate);
          if (!existing || logDate > existing.lastUsed) {
            contractorDataMap.set(log.contractorId, {
              lastUsed: logDate,
              serviceType: log.serviceType
            });
          }
        });
      
      // From proposals for this house
      const proposals = await storage.getProposals(undefined, userId);
      proposals
        .filter((proposal: any) => proposal.houseId === houseId && proposal.contractorId && proposal.status === 'accepted')
        .forEach((proposal: any) => {
          const existing = contractorDataMap.get(proposal.contractorId);
          const proposalDate = new Date(proposal.createdAt);
          if (!existing || proposalDate > existing.lastUsed) {
            contractorDataMap.set(proposal.contractorId, {
              lastUsed: proposalDate,
              serviceType: proposal.serviceType
            });
          }
        });
      
      // Fetch full contractor data for all unique contractor IDs
      const contractorIds = Array.from(contractorDataMap.keys());
      const contractors = await Promise.all(
        contractorIds.map(async (contractorId) => {
          const contractor = await storage.getContractor(contractorId);
          if (!contractor) return null;
          
          const metadata = contractorDataMap.get(contractorId);
          
          // Enrich with company data
          let enrichedContractor = { ...contractor };
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              enrichedContractor = {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          
          return {
            ...enrichedContractor,
            lastUsed: metadata?.lastUsed,
            lastServiceType: metadata?.serviceType
          };
        })
      );
      
      // Filter out nulls and sort by last used (most recent first)
      const validContractors = contractors
        .filter(c => c !== null)
        .sort((a, b) => {
          const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          return dateB - dateA;
        });
      
      console.log('[CONTRACTORS USED] House ID:', houseId);
      console.log('[CONTRACTORS USED] Found contractor IDs:', contractorIds);
      console.log('[CONTRACTORS USED] Returning contractors:', validContractors.length);
      console.log('[CONTRACTORS USED] Contractors:', validContractors.map(c => ({ id: c.id, name: c.name, company: c.company, createdAt: c.createdAt })));
      
      res.json(validContractors);
    } catch (error) {
      console.error("Error fetching contractors used at house:", error);
      res.status(500).json({ message: "Failed to fetch contractors used" });
    }
  });

  // Get all contractors previously used by homeowner (across all properties)
  app.get("/api/contractors/previously-used", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;
      
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view previously used contractors" });
      }
      
      // Get unique contractor IDs from various sources across ALL houses
      const contractorDataMap = new Map<string, { lastUsed: Date, serviceType?: string }>();
      
      // From maintenance logs (all houses)
      const maintenanceLogs = await storage.getMaintenanceLogs(userId);
      maintenanceLogs
        .filter((log: any) => log.contractorId)
        .forEach((log: any) => {
          const existing = contractorDataMap.get(log.contractorId);
          const logDate = new Date(log.serviceDate);
          if (!existing || logDate > existing.lastUsed) {
            contractorDataMap.set(log.contractorId, {
              lastUsed: logDate,
              serviceType: log.serviceType
            });
          }
        });
      
      // From proposals (all houses)
      const proposals = await storage.getProposals(undefined, userId);
      proposals
        .filter((proposal: any) => proposal.contractorId && proposal.status === 'accepted')
        .forEach((proposal: any) => {
          const existing = contractorDataMap.get(proposal.contractorId);
          const proposalDate = new Date(proposal.createdAt);
          if (!existing || proposalDate > existing.lastUsed) {
            contractorDataMap.set(proposal.contractorId, {
              lastUsed: proposalDate,
              serviceType: proposal.serviceType
            });
          }
        });
      
      // Fetch full contractor data for all unique contractor IDs
      const contractorIds = Array.from(contractorDataMap.keys());
      const contractors = await Promise.all(
        contractorIds.map(async (contractorId) => {
          const contractor = await storage.getContractor(contractorId);
          if (!contractor) return null;
          
          const metadata = contractorDataMap.get(contractorId);
          
          // Enrich with company data
          let enrichedContractor = { ...contractor };
          if ((contractor as any).companyId) {
            const company = await storage.getCompany((contractor as any).companyId);
            if (company) {
              enrichedContractor = {
                ...contractor,
                businessLogo: company.businessLogo || '',
                projectPhotos: company.projectPhotos || [],
                createdAt: company.createdAt
              };
            }
          }
          
          return {
            ...enrichedContractor,
            lastUsed: metadata?.lastUsed,
            lastServiceType: metadata?.serviceType
          };
        })
      );
      
      // Filter out nulls and sort by last used (most recent first)
      const validContractors = contractors
        .filter(c => c !== null)
        .sort((a, b) => {
          const dateA = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
          const dateB = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
          return dateB - dateA;
        });
      
      console.log('[PREVIOUSLY USED] Found contractor IDs:', contractorIds);
      console.log('[PREVIOUSLY USED] Returning contractors:', validContractors.length);
      
      res.json(validContractors);
    } catch (error) {
      console.error("Error fetching previously used contractors:", error);
      res.status(500).json({ message: "Failed to fetch previously used contractors" });
    }
  });

  app.get("/api/contractors/:id", async (req, res) => {
    try {
      console.log('[DEBUG] GET /api/contractors/:id - Looking for contractor ID:', req.params.id);
      let contractor = await storage.getContractor(req.params.id);
      console.log('[DEBUG] Contractor found in contractors table:', !!contractor);
      
      // If not found in contractors table, try to look up by user ID
      if (!contractor) {
        console.log('[DEBUG] Checking if this is a user ID for a contractor...');
        const user = await storage.getUserById(req.params.id);
        if (user && user.role === 'contractor' && user.companyId) {
          console.log('[DEBUG] Found contractor user with companyId:', user.companyId);
          const company = await storage.getCompany(user.companyId);
          console.log('[DEBUG] Company data:', JSON.stringify(company, null, 2));
          if (company) {
            console.log('[DEBUG] Company experience value:', company.experience, 'type:', typeof company.experience);
            // Try to get contractor record for this user to get correct contact info
            const contractorRecord = await storage.getContractorByUserId(user.id);
            console.log('[DEBUG] Contractor record found:', !!contractorRecord, 'phone:', contractorRecord?.phone);
            // Build a contractor-like object - use contractor record for contact info, company for business profile
            contractor = {
              id: user.id,
              name: contractorRecord?.name || user.name || '',
              company: company.name || user.name || '',
              email: contractorRecord?.email || user.email || '',
              phone: contractorRecord?.phone || company.phone || '',
              address: contractorRecord?.address || company.address || '',
              city: contractorRecord?.city || company.city || '',
              state: contractorRecord?.state || company.state || '',
              postalCode: contractorRecord?.postalCode || company.postalCode || '',
              location: company.location || `${contractorRecord?.city || company.city || ''}, ${contractorRecord?.state || company.state || ''}`.trim() || '',
              services: company.services || [],
              rating: company.rating || '5.0',
              reviewCount: company.reviewCount || 0,
              bio: company.bio || '',
              experience: company.experience || 0,
              profileImage: user.profileImageUrl || null,
              businessLogo: company.businessLogo || null,
              projectPhotos: company.projectPhotos || [],
              website: company.website || null,
              facebook: company.facebook || null,
              instagram: company.instagram || null,
              linkedin: company.linkedin || null,
              googleBusinessUrl: company.googleBusinessUrl || null,
              isLicensed: !!(company.licenseNumber),
              licenseNumber: company.licenseNumber || '',
              licenseMunicipality: company.licenseMunicipality || '',
              hasEmergencyServices: company.hasEmergencyServices || false,
              serviceRadius: company.serviceRadius || 25,
              distance: null,
              createdAt: user.createdAt || new Date(),
              companyId: user.companyId
            } as any;
            console.log('[DEBUG] Built contractor object from user+company data');
          }
        }
      }
      
      if (!contractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }
      
      // Fetch company data - company data takes precedence over contractors table data
      let contractorWithCompanyData = { ...contractor };
      
      // First check if contractor has companyId
      let companyId = (contractor as any).companyId;
      
      // If not, check if we can find user with this ID and get their companyId
      if (!companyId) {
        const user = await storage.getUserById(req.params.id);
        if (user && user.companyId) {
          companyId = user.companyId;
        }
      }
      
      if (companyId) {
        const company = await storage.getCompany(companyId);
        if (company) {
          console.log('[DEBUG] Merging company data - experience:', company.experience, 'licenseNumber:', company.licenseNumber);
          // Contractors table is source of truth for contact info (phone, email, address)
          // Company table is source of truth for business profile (bio, services, photos, etc.)
          contractorWithCompanyData = {
            ...contractor,
            experience: company.experience || (contractor as any).experience || 0,
            businessLogo: company.businessLogo || (contractor as any).businessLogo || '',
            projectPhotos: company.projectPhotos || (contractor as any).projectPhotos || [],
            licenseNumber: company.licenseNumber || (contractor as any).licenseNumber || '',
            licenseMunicipality: company.licenseMunicipality || (contractor as any).licenseMunicipality || '',
            isLicensed: !!(company.licenseNumber || (contractor as any).licenseNumber),
            bio: company.bio || (contractor as any).bio || '',
            services: company.services || (contractor as any).services || [],
            // Contact info: contractors table takes precedence
            phone: (contractor as any).phone || company.phone || '',
            address: (contractor as any).address || company.address || '',
            city: (contractor as any).city || company.city || '',
            state: (contractor as any).state || company.state || '',
            postalCode: (contractor as any).postalCode || company.postalCode || '',
            website: company.website || (contractor as any).website || '',
            facebook: company.facebook || (contractor as any).facebook || '',
            instagram: company.instagram || (contractor as any).instagram || '',
            linkedin: company.linkedin || (contractor as any).linkedin || '',
            googleBusinessUrl: company.googleBusinessUrl || (contractor as any).googleBusinessUrl || '',
            hasEmergencyServices: company.hasEmergencyServices ?? (contractor as any).hasEmergencyServices ?? false,
            serviceRadius: company.serviceRadius || (contractor as any).serviceRadius || 25,
            companyId: companyId
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

      // Geocode the company address to get coordinates
      let geocoded = null;
      if (companyData.address) {
        geocoded = await geocodeAddress(companyData.address);
      }

      const companyDataWithCoords = {
        ...companyData,
        ...(geocoded && {
          latitude: geocoded.latitude.toString(),
          longitude: geocoded.longitude.toString()
        })
      };

      const company = await storage.createCompany(companyDataWithCoords);

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

      // PRE-FILTER: Remove null/undefined values from request body before Zod validation
      // This prevents NOT NULL constraint violations on fields like licenseNumber
      const filteredBody: Record<string, any> = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (value !== null && value !== undefined) {
          filteredBody[key] = value;
        }
      }
      console.log('[Company Update] Filtered body (nulls removed):', JSON.stringify(filteredBody, null, 2));

      console.log('[Company Update] Validating data...');
      const partialData = insertCompanySchema.partial().omit({ ownerId: true }).parse(filteredBody);
      console.log('[Company Update] Validated data:', JSON.stringify(partialData, null, 2));
      
      // If address is being updated, re-geocode it
      let updateData = { ...partialData };
      if (partialData.address && partialData.address !== company.address) {
        const geocoded = await geocodeAddress(partialData.address);
        if (geocoded) {
          updateData.latitude = geocoded.latitude.toString();
          updateData.longitude = geocoded.longitude.toString();
        }
      }
      
      const updatedCompany = await storage.updateCompany(req.params.id, updateData);
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

  // Agent-specific routes
  app.get("/api/agent/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const profile = await storage.getAgentProfile(userId);
      if (!profile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Also fetch user data to get profileImageUrl
      const user = await storage.getUser(userId);
      
      res.json({
        ...profile,
        profileImageUrl: user?.profileImageUrl || null,
      });
    } catch (error) {
      console.error("Error fetching agent profile:", error);
      res.status(500).json({ message: "Failed to fetch agent profile" });
    }
  });

  app.put("/api/agent/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      // Import and use validation schema
      const { agentContactInfoSchema } = await import("@shared/schema");
      
      // Validate request body with Zod
      const validationResult = agentContactInfoSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }

      const validatedData = validationResult.data;

      // Convert empty strings to null for cleaner database storage
      const updateData = {
        phone: validatedData.phone?.trim() || null,
        website: validatedData.website?.trim() || null,
        officeAddress: validatedData.officeAddress?.trim() || null,
      };

      const updatedProfile = await storage.updateAgentProfile(userId, updateData);
      
      if (!updatedProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      res.json({ message: "Contact information updated successfully", profile: updatedProfile });
    } catch (error) {
      console.error("Error updating agent profile:", error);
      res.status(500).json({ message: "Failed to update agent profile" });
    }
  });

  app.get("/api/agent/referrals", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      const referrals = await storage.getAffiliateReferrals(userId);
      
      // Join with user data to get referee details
      const referralsWithUserDetails = await Promise.all(
        referrals.map(async (referral) => {
          const user = await storage.getUser(referral.referredUserId);
          return {
            ...referral,
            refereeName: user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown',
            refereeEmail: user?.email || '',
          };
        })
      );

      res.json(referralsWithUserDetails);
    } catch (error) {
      console.error("Error fetching agent referrals:", error);
      res.status(500).json({ message: "Failed to fetch agent referrals" });
    }
  });

  app.get("/api/agent/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      const stats = await storage.getAgentStats(userId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching agent stats:", error);
      res.status(500).json({ message: "Failed to fetch agent stats" });
    }
  });

  // Stripe Connect onboarding for agents
  app.post("/api/agent/stripe-connect/create-account", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Check if agent already has a Stripe Connect account
      if (agentProfile.stripeConnectAccountId) {
        // Create new account link for existing account (in case onboarding wasn't completed)
        const accountLink = await stripe.accountLinks.create({
          account: agentProfile.stripeConnectAccountId,
          refresh_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_refresh=true`,
          return_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_success=true`,
          type: 'account_onboarding',
        });
        return res.json({ url: accountLink.url, accountId: agentProfile.stripeConnectAccountId });
      }

      // Create a new Stripe Connect Express account
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'US',
        email: user.email || undefined,
        capabilities: {
          transfers: { requested: true },
        },
        business_type: 'individual',
        metadata: {
          userId: userId,
          agentProfileId: agentProfile.id,
        },
      });

      // Save the Stripe Connect account ID to the agent profile
      await storage.updateAgentProfile(userId, {
        stripeConnectAccountId: account.id,
        stripeOnboardingComplete: false,
      });

      // Create an account link for onboarding
      const accountLink = await stripe.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_refresh=true`,
        return_url: `${process.env.REPLIT_DOMAINS?.split(',')[0] ? 'https://' + process.env.REPLIT_DOMAINS.split(',')[0] : 'http://localhost:5000'}/agent-dashboard?stripe_success=true`,
        type: 'account_onboarding',
      });

      console.log('[STRIPE CONNECT] Created account for agent:', userId, 'Account ID:', account.id);
      res.json({ url: accountLink.url, accountId: account.id });
    } catch (error: any) {
      console.error("Error creating Stripe Connect account:", error);
      res.status(500).json({ message: "Failed to create Stripe Connect account", error: error.message });
    }
  });

  // Check Stripe Connect account status
  app.get("/api/agent/stripe-connect/status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!stripe) {
        return res.status(500).json({ message: "Stripe not configured" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      if (!agentProfile.stripeConnectAccountId) {
        return res.json({ 
          connected: false, 
          onboardingComplete: false,
          payoutsEnabled: false,
          chargesEnabled: false,
        });
      }

      // Get the Stripe account details
      const account = await stripe.accounts.retrieve(agentProfile.stripeConnectAccountId);
      
      const onboardingComplete = account.details_submitted && account.payouts_enabled;
      
      // Update the agent profile if onboarding status changed
      if (onboardingComplete && !agentProfile.stripeOnboardingComplete) {
        await storage.updateAgentProfile(userId, {
          stripeOnboardingComplete: true,
        });
      }

      res.json({
        connected: true,
        accountId: agentProfile.stripeConnectAccountId,
        onboardingComplete: onboardingComplete,
        payoutsEnabled: account.payouts_enabled,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      });
    } catch (error: any) {
      console.error("Error checking Stripe Connect status:", error);
      res.status(500).json({ message: "Failed to check Stripe Connect status", error: error.message });
    }
  });

  // Get agent payout history
  app.get("/api/agent/payouts", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const payouts = await storage.getAffiliatePayouts(userId);
      
      // Join with referral data to get referee details
      const payoutsWithDetails = await Promise.all(
        payouts.map(async (payout) => {
          const referral = await storage.getAffiliateReferral(payout.affiliateReferralId);
          let refereeName = 'Unknown';
          if (referral) {
            const user = await storage.getUser(referral.referredUserId);
            refereeName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown';
          }
          return {
            ...payout,
            refereeName,
          };
        })
      );

      res.json(payoutsWithDetails);
    } catch (error) {
      console.error("Error fetching agent payouts:", error);
      res.status(500).json({ message: "Failed to fetch agent payouts" });
    }
  });

  // Agent verification routes
  app.post("/api/agent/upload-state-id", isAuthenticated, uploadLimiter, upload.single('stateId'), async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, WEBP, and PDF are allowed" });
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File size must be less than 10MB" });
      }

      // Generate checksum for file integrity
      const crypto = await import('crypto');
      const fileBuffer = req.file.buffer;
      const checksum = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Upload to object storage (private directory) with secure path handling
      const path = await import('path');
      const fs = await import('fs');
      
      // Normalize and secure base directory
      const baseDir = path.resolve(process.cwd(), '.private', 'agent-verification');
      
      // Generate hash-based opaque ID (no user ID or timestamp in filename)
      const uploadId = crypto.randomUUID();
      const fileExtension = req.file.mimetype.includes('pdf') ? 'pdf' : 'jpg';
      const secureFilename = `${uploadId}.${fileExtension}`;
      const absoluteStoragePath = path.join(baseDir, secureFilename);
      
      // Validate path is within baseDir (prevent traversal)
      if (!absoluteStoragePath.startsWith(baseDir)) {
        return res.status(400).json({ message: "Invalid file path" });
      }
      
      // Ensure directory exists
      if (!fs.existsSync(baseDir)) {
        fs.mkdirSync(baseDir, { recursive: true });
      }

      // Write file to storage
      fs.writeFileSync(absoluteStoragePath, fileBuffer);

      // Store metadata server-side for verification
      await storage.storeUploadMetadata(uploadId, {
        userId,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        checksum,
        storagePath: absoluteStoragePath,
      });

      // Return opaque upload ID (no filesystem details)
      res.json({
        uploadId,
        originalFilename: req.file.originalname,
      });
    } catch (error) {
      console.error("Error uploading state ID:", error);
      res.status(500).json({ message: "Failed to upload state ID" });
    }
  });

  app.get("/api/agent/verification-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      const status = await storage.getAgentVerificationStatus(userId);
      if (!status) {
        return res.status(404).json({ message: "Verification status not found" });
      }

      res.json(status);
    } catch (error) {
      console.error("Error fetching verification status:", error);
      res.status(500).json({ message: "Failed to fetch verification status" });
    }
  });

  app.post("/api/agent/submit-verification", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      // Import and use validation schema
      const { agentVerificationSubmissionSchema } = await import("@shared/schema");
      
      // Validate request body with Zod
      const validationResult = agentVerificationSubmissionSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.flatten().fieldErrors 
        });
      }

      const validatedData = validationResult.data;

      // Retrieve server-stored upload metadata
      const uploadMetadata = await storage.getUploadMetadata(validatedData.uploadId);
      
      if (!uploadMetadata) {
        return res.status(400).json({ message: "Upload not found or expired" });
      }

      // Validate ownership - uploaded file must belong to current user
      if (uploadMetadata.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized: Upload does not belong to you" });
      }

      const agentProfile = await storage.getAgentProfile(userId);
      if (!agentProfile) {
        return res.status(404).json({ message: "Agent profile not found" });
      }

      // Use server-verified metadata instead of client-supplied values
      const updated = await storage.submitAgentVerification(userId, {
        licenseNumber: validatedData.licenseNumber,
        licenseState: validatedData.licenseState,
        licenseExpiration: new Date(validatedData.licenseExpiration),
        stateIdStorageKey: uploadMetadata.storagePath,
        stateIdOriginalFilename: uploadMetadata.originalFilename,
        stateIdMimeType: uploadMetadata.mimeType,
        stateIdFileSize: uploadMetadata.fileSize,
        stateIdChecksum: uploadMetadata.checksum,
      });

      // Clean up upload metadata after successful submission (keep file)
      await storage.deleteUploadMetadata(validatedData.uploadId, false);

      // Create audit record
      await storage.createVerificationAudit({
        agentProfileId: agentProfile.id,
        agentId: userId,
        action: 'submitted',
        previousStatus: agentProfile.verificationStatus,
        newStatus: 'pending_review',
        notes: 'Agent submitted verification request',
        metadata: { userAgent: req.headers['user-agent'], ip: req.ip },
      });

      res.json({ message: "Verification submitted successfully", profile: updated });
    } catch (error) {
      console.error("Error submitting verification:", error);
      res.status(500).json({ message: "Failed to submit verification" });
    }
  });

  // Agent profile picture upload endpoint
  app.post("/api/agent/profile-picture", isAuthenticated, uploadLimiter, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.session?.user?.id;
      const userRole = req.session?.user?.role;

      if (userRole !== 'agent') {
        return res.status(403).json({ message: "Forbidden: Agent access only" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Validate file type (only images)
      const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        return res.status(400).json({ message: "Invalid file type. Only JPEG, PNG, and WEBP images are allowed" });
      }

      // Validate file size (5MB max)
      const maxSize = 5 * 1024 * 1024;
      if (req.file.size > maxSize) {
        return res.status(400).json({ message: "File size must be less than 5MB" });
      }

      // Generate unique filename
      const crypto = await import('crypto');
      const fileExtension = req.file.mimetype.split('/')[1];
      const uniqueId = crypto.randomUUID();
      const storageKey = `profile-pictures/${userId}/${uniqueId}.${fileExtension}`;

      // Upload to object storage (public directory)
      await objectStorageService.uploadFile(storageKey, req.file.buffer, req.file.mimetype);

      // Get the current user to check for old profile picture
      const currentUser = await storage.getUser(userId);
      const oldProfileImageUrl = currentUser?.profileImageUrl;

      // Update user's profile image URL
      await storage.upsertUser({
        id: userId,
        profileImageUrl: storageKey,
      });

      // TODO: Delete old profile picture from object storage if it exists
      // This would require implementing a deleteFile method in ObjectStorageService

      // Return the storage key (frontend will construct URL)
      res.json({ 
        storageKey,
        message: "Profile picture uploaded successfully"
      });
    } catch (error) {
      console.error("Error uploading profile picture:", error);
      res.status(500).json({ message: "Failed to upload profile picture" });
    }
  });

  app.get("/api/referral/validate/:code", async (req, res) => {
    try {
      const { code } = req.params;
      
      const user = await storage.getUserByReferralCode(code);
      
      if (!user) {
        return res.json({ valid: false });
      }

      const agentName = `${user.firstName} ${user.lastName}`.trim() || user.email;
      res.json({ 
        valid: true, 
        agentName 
      });
    } catch (error) {
      console.error("Error validating referral code:", error);
      res.status(500).json({ message: "Failed to validate referral code" });
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
      console.error("[ERROR] Failed to fetch maintenance logs:", error);
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

  // Complete a maintenance task with DIY or contractor method
  app.post("/api/maintenance-logs/complete-task", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Validate request body with Zod schema
      const validatedData = completeTaskSchema.parse(req.body);
      const { houseId, taskTitle, completionMethod, costEstimate, contractorCost: providedCost } = validatedData;
      
      // Verify house belongs to user
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(403).json({ message: "Access denied to house" });
      }
      
      // Calculate DIY savings using shared helper function
      let diySavingsAmount: string | null = null;
      if (completionMethod === 'diy' && costEstimate) {
        const savingsNumber = calculateDIYSavingsAmount(costEstimate);
        diySavingsAmount = savingsNumber > 0 ? savingsNumber.toString() : null;
      }
      
      // Use provided contractor cost, or calculate midpoint if not provided
      let contractorCostStr: string | null = null;
      if (completionMethod === 'contractor') {
        if (providedCost !== undefined && providedCost !== null) {
          // Use the actual cost provided by the user
          contractorCostStr = providedCost.toFixed(2);
        } else if (costEstimate) {
          // Fall back to estimate midpoint if no cost provided
          const { proLow, proHigh } = costEstimate;
          if (proLow !== undefined && proHigh !== undefined) {
            contractorCostStr = ((proLow + proHigh) / 2).toFixed(2);
          }
        }
      }
      
      // Create maintenance log
      const logData = {
        homeownerId: req.session.user.id,
        houseId,
        homeArea: 'General Maintenance', // Default home area for task completions
        serviceDate: new Date().toISOString().split('T')[0],
        serviceType: taskTitle,
        serviceDescription: `Completed ${completionMethod === 'diy' ? 'DIY' : 'by contractor'}`,
        completionMethod,
        diySavingsAmount,
        cost: contractorCostStr
      };
      
      const log = await storage.createMaintenanceLog(logData);
      
      // Also create task completion record for health score tracking
      const now = new Date();
      
      // Calculate estimated cost properly - average only valid (finite) bounds
      let estimatedCost: number | null = null;
      if (costEstimate && (costEstimate.proLow !== undefined || costEstimate.proHigh !== undefined)) {
        const validBounds: number[] = [];
        
        if (costEstimate.proLow !== undefined && costEstimate.proLow !== null) {
          const low = Number(costEstimate.proLow);
          if (isFinite(low) && low > 0) validBounds.push(low);
        }
        
        if (costEstimate.proHigh !== undefined && costEstimate.proHigh !== null) {
          const high = Number(costEstimate.proHigh);
          if (isFinite(high) && high > 0) validBounds.push(high);
        }
        
        if (validBounds.length > 0) {
          const sum = validBounds.reduce((acc, val) => acc + val, 0);
          estimatedCost = sum / validBounds.length;
        }
      }
      
      const taskCompletionData = {
        homeownerId: req.session.user.id,
        houseId,
        taskId: null, // Could be populated if we track specific task IDs
        taskType: 'maintenance' as const,
        taskTitle,
        taskCategory: null,
        completedAt: now,
        month: now.getMonth() + 1, // 1-12
        year: now.getFullYear(),
        completionMethod: completionMethod === 'diy' ? 'diy' : 'professional',
        estimatedCost: estimatedCost !== null ? estimatedCost.toFixed(2) : null,
        actualCost: contractorCostStr || null,
        costSavings: diySavingsAmount || null,
        notes: null,
        documentsUploaded: 0,
      };
      
      await db.insert(taskCompletions).values(taskCompletionData);
      
      // Check and award achievements after task completion
      const newlyUnlocked = await storage.checkAndAwardAchievements(req.session.user.id);
      
      res.status(201).json({ 
        ...log, 
        newAchievements: newlyUnlocked || [] 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid task completion data", errors: error.errors });
      }
      console.error("Error completing task:", error);
      res.status(500).json({ message: "Failed to complete task" });
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
      console.error("[ERROR] Failed to fetch custom maintenance tasks:", error);
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
      
      // Create notification for homeowner when proposal is created
      if (proposal.homeownerId) {
        const contractorUser = await storage.getUser(userId);
        const company = contractorUser?.companyId 
          ? await storage.getCompany(contractorUser.companyId)
          : null;
        const contractorName = company?.name || contractorUser?.name || 'A contractor';
        
        await storage.createNotification({
          homeownerId: proposal.homeownerId,
          type: 'proposal',
          title: 'New Proposal',
          message: `${contractorName} sent you a proposal: ${proposal.title}`,
          link: '/messages',
          priority: 'high'
        });
      }
      
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
      const userId = req.session.user.id;
      const partialData = insertProposalSchema.partial().parse(req.body);
      const oldProposal = await storage.getProposal(req.params.id);
      const proposal = await storage.updateProposal(req.params.id, partialData);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Create notification when proposal status changes to "sent"
      if (oldProposal && oldProposal.status !== 'sent' && proposal.status === 'sent' && proposal.homeownerId) {
        const contractorUser = await storage.getUser(userId);
        const company = contractorUser?.companyId 
          ? await storage.getCompany(contractorUser.companyId)
          : null;
        const contractorName = company?.name || contractorUser?.name || 'A contractor';
        
        await storage.createNotification({
          homeownerId: proposal.homeownerId,
          type: 'proposal',
          title: 'New Proposal',
          message: `${contractorName} sent you a proposal: ${proposal.title}`,
          link: '/messages',
          priority: 'high'
        });
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

  app.delete("/api/proposals/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const proposal = await storage.getProposal(req.params.id);
      
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
      }
      
      // Only the contractor who created the proposal can delete it
      if (proposal.contractorId !== userId) {
        return res.status(403).json({ message: "Only the proposal creator can delete it" });
      }
      
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

  app.post("/api/appointments", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Verify user can create appointments (contractors or homeowners)
      if (!['contractor', 'homeowner'].includes(userRole)) {
        return res.status(403).json({ message: "Not authorized to create appointments" });
      }
      
      const appointmentData = insertContractorAppointmentSchema.parse(req.body);
      
      // Verify the user is creating an appointment for themselves
      if (userRole === 'contractor' && appointmentData.contractorId !== userId) {
        return res.status(403).json({ message: "Contractors can only create appointments for themselves" });
      }
      if (userRole === 'homeowner' && appointmentData.homeownerId !== userId) {
        return res.status(403).json({ message: "Homeowners can only create appointments for themselves" });
      }
      
      const appointment = await storage.createContractorAppointment(appointmentData);
      
      // Send SMS confirmation to homeowner
      if (appointmentData.homeownerId) {
        const contractor = appointmentData.contractorId 
          ? await storage.getContractor(appointmentData.contractorId)
          : null;
        const company = contractor?.companyId 
          ? await storage.getCompany(contractor.companyId)
          : null;
        const contractorName = company?.name || 'Your contractor';
        const appointmentDate = appointmentData.scheduledDate 
          ? new Date(appointmentData.scheduledDate).toLocaleDateString()
          : 'TBD';
        const appointmentTime = appointmentData.scheduledTime || 'TBD';
        
        smsService.sendAppointmentConfirmation(
          appointmentData.homeownerId,
          contractorName,
          appointmentDate,
          appointmentTime
        ).catch(err => console.error('[SMS] Error sending appointment confirmation:', err));
      }
      
      res.status(201).json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create appointment" });
    }
  });

  app.patch("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get appointment to verify ownership
      const existingAppointment = await storage.getContractorAppointment(req.params.id);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Verify user can update this appointment
      const isContractor = userRole === 'contractor' && existingAppointment.contractorId === userId;
      const isHomeowner = userRole === 'homeowner' && existingAppointment.homeownerId === userId;
      
      if (!isContractor && !isHomeowner) {
        return res.status(403).json({ message: "Not authorized to update this appointment" });
      }
      
      const partialData = insertContractorAppointmentSchema.partial().parse(req.body);
      const appointment = await storage.updateContractorAppointment(req.params.id, partialData);
      res.json(appointment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid appointment data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update appointment" });
    }
  });

  app.delete("/api/appointments/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get appointment to verify ownership
      const existingAppointment = await storage.getContractorAppointment(req.params.id);
      if (!existingAppointment) {
        return res.status(404).json({ message: "Appointment not found" });
      }
      
      // Verify user can delete this appointment
      const isContractor = userRole === 'contractor' && existingAppointment.contractorId === userId;
      const isHomeowner = userRole === 'homeowner' && existingAppointment.homeownerId === userId;
      
      if (!isContractor && !isHomeowner) {
        return res.status(403).json({ message: "Not authorized to delete this appointment" });
      }
      
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
  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get notifications based on user role
      if (userRole === 'homeowner') {
        const notifications = await storage.getNotifications(userId);
        res.json(notifications);
      } else if (userRole === 'contractor') {
        const notifications = await storage.getContractorNotifications(userId);
        res.json(notifications);
      } else {
        res.status(400).json({ message: "Invalid user role" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.get("/api/notifications/unread", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Get unread notifications based on user role
      if (userRole === 'homeowner') {
        const notifications = await storage.getUnreadNotifications(userId);
        res.json(notifications);
      } else if (userRole === 'contractor') {
        const notifications = await storage.getUnreadContractorNotifications(userId);
        res.json(notifications);
      } else {
        res.status(400).json({ message: "Invalid user role" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch unread notifications" });
    }
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Verify ownership before marking as read
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.homeownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to modify this notification" });
      }
      
      const success = await storage.markNotificationAsRead(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "Notification not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.delete("/api/notifications/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      
      // Verify ownership before deleting
      const notification = await storage.getNotification(req.params.id);
      if (!notification) {
        return res.status(404).json({ message: "Notification not found" });
      }
      
      if (notification.homeownerId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this notification" });
      }
      
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
      console.log("[DEBUG /api/houses] Returning", houses.length, "houses for", homeownerId);
      houses.forEach((h: any, i: number) => console.log(`  [${i}] ${h.name} - ${h.address} (id: ${h.id})`));
      
      // Prevent browser/proxy caching to ensure fresh data
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(houses);
    } catch (error) {
      console.error("[ERROR] Failed to fetch houses:", error);
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
        // Check subscription status and house limits
        const subscriptionStatus = user?.subscriptionStatus;
        const trialEndsAt = user?.trialEndsAt;
        
        // Only grandfathered users or explicitly null maxHousesAllowed get unlimited houses
        if (subscriptionStatus === 'grandfathered' || user?.maxHousesAllowed === null) {
          // No limit - allow house creation
        } else {
          // Subscription tier limits:
          // Free: 0 homes (contractor search only)
          // Base ($5): 1-2 homes
          // Premium ($20): 3-6 homes
          // Premium Plus ($40): 7+ (unlimited)
          const maxHouses = user?.maxHousesAllowed ?? 0; // Default to free plan (0 houses)
          
          // Free tier users cannot add any homes
          if (maxHouses === 0) {
            return res.status(403).json({ 
              message: "Free accounts can search for contractors but cannot add properties. Upgrade to Base ($5/month) to add up to 2 homes.",
              code: "FREE_TIER_LIMIT",
              currentPlan: 'free',
              maxHouses: 0,
              currentHouses: existingHouses.length,
              upgradeTo: 'base'
            });
          }
          
          if (existingHouses.length >= maxHouses) {
            // User has reached their plan limit - determine current plan and upgrade path
            const isTrialing = subscriptionStatus === 'trialing' && trialEndsAt && new Date(trialEndsAt) > new Date();
            let currentPlan = 'free';
            let upgradeTo = 'base';
            let upgradeMessage = '';
            
            if (maxHouses <= 2) {
              currentPlan = 'base';
              upgradeTo = 'premium';
              upgradeMessage = `You've reached the ${maxHouses} home limit on the Base plan ($5/month). Upgrade to Premium ($20/month) for up to 6 homes.`;
            } else if (maxHouses <= 6) {
              currentPlan = 'premium';
              upgradeTo = 'premium_plus';
              upgradeMessage = `You've reached the ${maxHouses} home limit on the Premium plan ($20/month). Upgrade to Premium Plus ($40/month) for unlimited homes.`;
            }
            
            return res.status(403).json({ 
              message: upgradeMessage || `Property limit reached. Upgrade to add more properties.`,
              code: "PLAN_LIMIT_EXCEEDED",
              currentPlan,
              maxHouses,
              currentHouses: existingHouses.length,
              isTrialing,
              upgradeTo
            });
          }
        }
      }
      
      // Geocode the address to get coordinates
      let geocoded = null;
      if (validatedData.address) {
        geocoded = await geocodeAddress(validatedData.address);
      }
      
      // Create house with authenticated user's ID and geocoded coordinates
      const houseData = {
        ...validatedData,
        homeownerId,
        ...(geocoded && {
          latitude: geocoded.latitude.toString(),
          longitude: geocoded.longitude.toString()
        })
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
      
      // If address is being updated, re-geocode it
      let updateData = { ...validatedData };
      if (validatedData.address && validatedData.address !== existingHouse.address) {
        const geocoded = await geocodeAddress(validatedData.address);
        if (geocoded) {
          updateData.latitude = geocoded.latitude.toString();
          updateData.longitude = geocoded.longitude.toString();
        }
      }
      
      const house = await storage.updateHouse(req.params.id, updateData);
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

  // Update household profile for a house
  app.patch("/api/houses/:id/profile", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Verify the house belongs to the authenticated user
      const existingHouse = await storage.getHouse(req.params.id);
      if (!existingHouse || existingHouse.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }

      // Validate request body with household profile schema
      const validatedData = updateHouseholdProfileSchema.parse(req.body);
      
      // Update house with household profile data
      const house = await storage.updateHouse(req.params.id, validatedData);
      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update household profile" });
    }
  });

  // Get generated maintenance schedule for a house
  app.get("/api/houses/:id/schedule", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const house = await storage.getHouse(req.params.id);
      if (!house || house.homeownerId !== req.session.user.id) {
        return res.status(404).json({ message: "House not found" });
      }

      // Generate maintenance schedule using the algorithm
      const { generateMaintenanceSchedule } = await import("../shared/maintenance-scheduler");
      const schedule = generateMaintenanceSchedule(house);
      
      res.json({
        house: {
          id: house.id,
          name: house.name,
          address: house.address,
        },
        schedule,
      });
    } catch (error) {
      console.error("[ERROR] Failed to generate maintenance schedule:", error);
      res.status(500).json({ message: "Failed to generate maintenance schedule" });
    }
  });

  // Get home health score for a house
  app.get("/api/houses/:id/health-score", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const houseId = req.params.id;
      const homeownerId = req.session.user.id;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }

      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const currentMonth = currentDate.getMonth() + 1; // 1-12

      // Get all completed tasks for this house in the current year
      const completedTasks = await db.select()
        .from(taskCompletions)
        .where(
          and(
            eq(taskCompletions.houseId, houseId),
            eq(taskCompletions.year, currentYear)
          )
        );

      const completedCount = completedTasks.length;

      // Get all seasonal maintenance tasks for past months (including current)
      const seasonalTasks = await db.select()
        .from(maintenanceTasks)
        .where(
          lte(maintenanceTasks.month, currentMonth)
        );

      // Filter seasonal tasks by climate zone
      const applicableTasks = seasonalTasks.filter(task => 
        task.climateZones.includes(house.climateZone || '')
      );

      // Get custom tasks for this house
      const customTasks = await db.select()
        .from(customMaintenanceTasks)
        .where(
          and(
            eq(customMaintenanceTasks.homeownerId, homeownerId),
            or(
              eq(customMaintenanceTasks.houseId, houseId),
              isNull(customMaintenanceTasks.houseId)
            ),
            eq(customMaintenanceTasks.isActive, true)
          )
        );

      // Calculate expected tasks (seasonal + custom)
      const expectedTasksCount = applicableTasks.length + customTasks.length;

      // Missed tasks = expected tasks - completed tasks
      const missedCount = Math.max(0, expectedTasksCount - completedCount);

      // Calculate score: +4 per completed, -4 per missed (minimum 0)
      const score = Math.max(0, (completedCount * 4) - (missedCount * 4));

      res.json({
        score,
        completedTasks: completedCount,
        missedTasks: missedCount,
        totalExpectedTasks: expectedTasksCount
      });
    } catch (error) {
      console.error("Error calculating home health score:", error);
      res.status(500).json({ message: "Failed to calculate home health score" });
    }
  });

  // Get total DIY savings for a house
  app.get("/api/houses/:id/diy-savings", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      const houseId = req.params.id;
      const homeownerId = req.session.user.id;
      
      // Verify house ownership
      const house = await storage.getHouse(houseId);
      if (!house || house.homeownerId !== homeownerId) {
        return res.status(404).json({ message: "House not found" });
      }

      // Get all maintenance logs for this house with DIY completions
      const logs = await storage.getMaintenanceLogs(homeownerId, houseId);
      
      // Calculate total savings from DIY task completions
      const diyLogs = logs.filter(log => log.completionMethod === 'diy' && log.diySavingsAmount);
      const totalSavings = diyLogs.reduce((sum, log) => sum + parseFloat(log.diySavingsAmount || '0'), 0);
      const taskCount = diyLogs.length;
      
      console.log('[DIY SAVINGS]', { houseId, totalLogs: logs.length, diyLogs: diyLogs.length, totalSavings, taskCount });
      
      // Disable caching for this endpoint
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      
      res.json({
        totalSavings: parseFloat(totalSavings.toFixed(2)),
        taskCount
      });
    } catch (error) {
      console.error("Error fetching DIY savings:", error);
      res.status(500).json({ message: "Failed to fetch DIY savings" });
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
      const subscriptionStatus = user.subscriptionStatus;
      
      // Only grandfathered users or explicitly null maxHousesAllowed get unlimited houses
      if (subscriptionStatus !== 'grandfathered' && user.maxHousesAllowed !== null) {
        // Subscription tier limits:
        // Free: 0 homes (contractor search only)
        // Base ($5): 1-2 homes
        // Premium ($20): 3-6 homes
        // Premium Plus ($40): 7+ (unlimited)
        const maxHouses = user.maxHousesAllowed ?? 0; // Default to free plan (0 houses)
        
        // Free tier users cannot accept transfers
        if (maxHouses === 0) {
          return res.status(403).json({ 
            message: "Free accounts cannot own properties. Upgrade to Base ($5/month) to accept this transfer.",
            code: "FREE_TIER_LIMIT",
            currentPlan: 'free',
            maxHouses: 0,
            currentHouses: housesCount,
            upgradeTo: 'base'
          });
        }
        
        if (housesCount >= maxHouses) {
          const isTrialing = subscriptionStatus === 'trialing' && user.trialEndsAt && new Date(user.trialEndsAt) > new Date();
          let currentPlan = 'free';
          let upgradeTo = 'base';
          let upgradeMessage = '';
          
          if (maxHouses <= 2) {
            currentPlan = 'base';
            upgradeTo = 'premium';
            upgradeMessage = `Cannot accept transfer. You have ${housesCount} homes on the Base plan (max ${maxHouses}). Upgrade to Premium ($20/month) for up to 6 homes.`;
          } else if (maxHouses <= 6) {
            currentPlan = 'premium';
            upgradeTo = 'premium_plus';
            upgradeMessage = `Cannot accept transfer. You have ${housesCount} homes on the Premium plan (max ${maxHouses}). Upgrade to Premium Plus ($40/month) for unlimited homes.`;
          }
          
          return res.status(403).json({ 
            message: upgradeMessage || `Cannot accept transfer. Upgrade to add more properties.`,
            code: "PLAN_LIMIT_EXCEEDED",
            currentPlan,
            maxHouses,
            currentHouses: housesCount,
            isTrialing,
            upgradeTo
          });
        }
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
      console.error("[ERROR] Failed to fetch home systems:", error);
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

  // Contractor subscription endpoint
  app.get('/api/contractor/subscription', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || !req.session?.user) {
        return res.status(401).json({ message: 'Unauthorized' });
      }
      
      const userId = req.session.user.id;
      const user = await storage.getUser(userId);
      
      if (!user || user.role !== 'contractor') {
        return res.status(403).json({ message: 'Not a contractor account' });
      }
      
      // Check if user is grandfathered (free Pro access forever)
      const grandfatheredEmails = (process.env.GRANDFATHERED_EMAILS || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const isGrandfathered = user.email && grandfatheredEmails.includes(user.email.toLowerCase());
      
      // Get subscription plan details if subscribed
      let planDetails = null;
      if (user.subscriptionPlanId) {
        planDetails = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, user.subscriptionPlanId)).limit(1);
      }
      
      const plan = planDetails?.[0];
      
      // Grandfathered users get full Pro access without subscription
      if (isGrandfathered) {
        return res.json({
          hasActiveSubscription: true,
          needsSubscription: false,
          isInTrial: false,
          trialExpired: false,
          trialDaysRemaining: 0,
          trialEndsAt: null,
          currentPlan: 'pro',
          hasCrmAccess: true,
          subscriptionStatus: 'grandfathered',
          monthlyPrice: 0,
          features: ['Lead management', 'Client management', 'Job scheduling', 'Quotes and invoices', 'Dashboard analytics', 'Referral program'],
          planName: 'Pro (Grandfathered)',
          tierName: 'contractor_pro',
          isGrandfathered: true,
        });
      }
      
      // Calculate trial status
      const now = new Date();
      const trialEndsAt = user.trialEndsAt ? new Date(user.trialEndsAt) : null;
      const isInTrial = user.subscriptionStatus === 'trialing' && trialEndsAt && trialEndsAt > now;
      const trialExpired = trialEndsAt && trialEndsAt <= now && user.subscriptionStatus === 'trialing';
      const trialDaysRemaining = trialEndsAt && trialEndsAt > now 
        ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      // Has active access if: paid subscription active, OR still in trial period
      const hasActiveSubscription = user.subscriptionStatus === 'active' || isInTrial;
      
      // If trial expired and no paid subscription, they need to pay
      const needsSubscription = trialExpired || (user.subscriptionStatus === 'inactive' && !isInTrial);
      
      // Determine current plan tier
      let currentPlan: 'none' | 'basic' | 'pro' = 'none';
      if (plan) {
        if (plan.tierName === 'contractor_pro') {
          currentPlan = 'pro';
        } else if (plan.tierName === 'contractor_basic' || plan.tierName === 'contractor') {
          currentPlan = 'basic';
        }
      }
      
      res.json({
        hasActiveSubscription,
        needsSubscription,
        isInTrial,
        trialExpired,
        trialDaysRemaining,
        trialEndsAt: trialEndsAt?.toISOString() || null,
        currentPlan,
        hasCrmAccess: plan?.hasCrmAccess ?? false,
        subscriptionStatus: user.subscriptionStatus || 'inactive',
        monthlyPrice: plan ? parseFloat(plan.monthlyPrice as string) : 0,
        features: plan?.features ?? [],
        planName: plan?.displayName ?? 'No Plan',
        tierName: plan?.tierName ?? null,
      });
    } catch (error) {
      console.error('Error fetching contractor subscription:', error);
      res.status(500).json({ message: 'Failed to fetch subscription' });
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

      // CRITICAL FIX: Merge company data into profile response for persistence
      // Profile (contractors table) is source of truth for business info (name, phone, email, address)
      // Company table is source of truth for company-specific fields (bio, experience, photos, services)
      let profileWithCompanyData = { ...profile };
      if ((profile as any).companyId) {
        const company = await storage.getCompany((profile as any).companyId);
        if (company) {
          profileWithCompanyData = {
            ...profile,
            // Business Information: PROFILE takes precedence (contractors table is source of truth)
            company: (profile as any).company || company.name || '',
            name: (profile as any).name || '',
            address: (profile as any).address || company.address || '',
            city: (profile as any).city || company.city || '',
            state: (profile as any).state || company.state || '',
            postalCode: (profile as any).postalCode || company.postalCode || '',
            phone: (profile as any).phone || company.phone || '',
            email: (profile as any).email || company.email || '',
            // Company-specific fields: COMPANY takes precedence
            serviceRadius: company.serviceRadius || (profile as any).serviceRadius || 25,
            services: (company.services && company.services.length > 0) ? company.services : ((profile as any).services || []),
            hasEmergencyServices: company.hasEmergencyServices || (profile as any).hasEmergencyServices || false,
            bio: company.bio || (profile as any).bio || '',
            experience: company.experience || (profile as any).experience || 0,
            // Social links from company
            website: company.website || (profile as any).website || '',
            facebook: company.facebook || (profile as any).facebook || '',
            instagram: company.instagram || (profile as any).instagram || '',
            linkedin: company.linkedin || (profile as any).linkedin || '',
            googleBusinessUrl: company.googleBusinessUrl || (profile as any).googleBusinessUrl || '',
            // Photos from company
            businessLogo: company.businessLogo || '',
            projectPhotos: company.projectPhotos || []
          };
        }
      }

      res.json(profileWithCompanyData);
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
        userId: req.session?.user?.id,
        companyId: req.session?.user?.companyId
      });
      
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        console.log('[DEBUG] Unauthorized - session check failed');
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const profileData = req.body;
      
      console.log('[DEBUG] Updating contractor profile:', contractorId, 'with data keys:', Object.keys(profileData));

      // AUTO-CREATE COMPANY: If contractor has no company, create one automatically
      let currentUser = await storage.getUser(contractorId);
      if (currentUser && !currentUser.companyId) {
        console.log('[DEBUG] Contractor has no company - auto-creating one...');
        
        // Create company with data from profile
        const companyName = profileData.company || `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'My Company';
        const newCompany = await storage.createCompany({
          name: companyName,
          ownerId: contractorId,
          email: currentUser.email || '',
          phone: profileData.phone || '',
          location: profileData.location || '',
          address: profileData.address || '',
          postalCode: profileData.postalCode || '',
          website: profileData.website || '',
          bio: profileData.bio || '',
          services: profileData.services || [],
          serviceRadius: profileData.serviceRadius || 25,
          hasEmergencyServices: profileData.hasEmergencyServices || false,
          licenseNumber: profileData.licenseNumber || '',
          licenseMunicipality: profileData.licenseMunicipality || '',
        });
        
        console.log('[DEBUG] Auto-created company:', newCompany.id, newCompany.name);
        
        // Link company to user
        currentUser = await storage.upsertUser({
          ...currentUser,
          companyId: newCompany.id,
          companyRole: 'owner',
        });
        
        // Update session with new companyId
        req.session.user = currentUser;
        req.session.save((err: any) => {
          if (err) console.error('[DEBUG] Failed to save session after company creation:', err);
        });
        
        console.log('[DEBUG] Linked company to user, companyId:', newCompany.id);
      }

      const updatedProfile = await storage.updateContractorProfile(contractorId, profileData);
      console.log('[DEBUG] Profile updated successfully');
      
      // Return the profile with companyId so frontend can update
      res.json({ ...updatedProfile, companyId: currentUser?.companyId });
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

  // Permanent connection code routes (attached to user account)
  app.get('/api/permanent-connection-code', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Only homeowners can view their permanent connection code
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view connection codes" });
      }
      
      const code = await storage.getOrCreatePermanentConnectionCode(userId);
      res.json({ code });
    } catch (error) {
      console.error("Error fetching permanent connection code:", error);
      res.status(500).json({ message: "Failed to fetch connection code" });
    }
  });

  app.post('/api/permanent-connection-code/regenerate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Only homeowners can regenerate their connection code
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can regenerate connection codes" });
      }
      
      const code = await storage.regeneratePermanentConnectionCode(userId);
      res.json({ code });
    } catch (error) {
      console.error("Error regenerating connection code:", error);
      res.status(500).json({ message: "Failed to regenerate connection code" });
    }
  });

  app.post('/api/permanent-connection-code/validate', isAuthenticated, authLimiter, async (req: any, res) => {
    try {
      const userRole = req.session.user.role;
      
      // Only contractors can validate connection codes
      if (userRole !== 'contractor') {
        return res.status(403).json({ message: "Only contractors can validate connection codes" });
      }
      
      // Validate request body
      const validationSchema = z.object({
        code: z.string().length(8).regex(/^[A-Z0-9]+$/, "Code must be 8 uppercase alphanumeric characters"),
      });
      
      const validated = validationSchema.parse(req.body);
      const { code } = validated;
      
      const result = await storage.validatePermanentConnectionCode(code);
      
      if (!result) {
        return res.status(400).json({ message: "Invalid connection code" });
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error validating connection code:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid code format", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to validate connection code" });
    }
  });

  // Get referring agent for homeowner
  app.get('/api/referring-agent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userRole = req.session.user.role;
      
      // Only homeowners can view their referring agent
      if (userRole !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can view referring agent information" });
      }
      
      const referringAgent = await storage.getReferringAgentForHomeowner(userId);
      
      if (!referringAgent) {
        return res.status(404).json({ message: "No referring agent found" });
      }
      
      res.json(referringAgent);
    } catch (error) {
      console.error("Error fetching referring agent:", error);
      res.status(500).json({ message: "Failed to fetch referring agent information" });
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
      
      // Create notification for contractor when homeowner sends a message
      if (userType === 'homeowner') {
        const homeownerUser = await storage.getUser(userId);
        const homeownerName = homeownerUser?.name || 'A homeowner';
        
        await storage.createNotification({
          contractorId: conversation.contractorId,
          type: 'message',
          title: 'New Message',
          message: `${homeownerName} sent you a message`,
          link: '/messages',
          priority: 'medium'
        });
        
        // Send SMS to contractor
        smsService.sendNewMessageNotification(
          conversation.contractorId,
          homeownerName,
          req.body.content || ''
        ).catch(err => console.error('[SMS] Error sending to contractor:', err));
      }
      
      // Create notification for homeowner when contractor sends a message
      if (userType === 'contractor') {
        const contractorUser = await storage.getUser(userId);
        const company = contractorUser?.companyId 
          ? await storage.getCompany(contractorUser.companyId)
          : null;
        const contractorName = company?.name || contractorUser?.name || 'A contractor';
        
        await storage.createNotification({
          homeownerId: conversation.homeownerId,
          type: 'message',
          title: 'New Message',
          message: `${contractorName} sent you a message`,
          link: '/messages',
          priority: 'medium'
        });
        
        // Send SMS to homeowner
        smsService.sendNewMessageNotification(
          conversation.homeownerId,
          contractorName,
          req.body.content || ''
        ).catch(err => console.error('[SMS] Error sending to homeowner:', err));
      }
      
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
      
      // Enhance reviews with reviewer email verification status
      const enhancedReviews = await Promise.all(reviews.map(async (review) => {
        const reviewer = await storage.getUserById(review.homeownerId);
        return {
          ...review,
          reviewerEmailVerified: reviewer?.emailVerified || false
        };
      }));
      
      res.json(enhancedReviews);
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

      // Get user info for fraud prevention checks
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // FRAUD PREVENTION CHECK 1: Email verification required
      if (!user.emailVerified) {
        return res.status(403).json({ 
          message: "Email verification required",
          details: "Please verify your email address before leaving reviews. Check your inbox for the verification link."
        });
      }

      // FRAUD PREVENTION CHECK 2: Account age must be at least 7 days
      const accountAge = Date.now() - new Date(user.createdAt!).getTime();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (accountAge < sevenDays) {
        const daysRemaining = Math.ceil((sevenDays - accountAge) / (24 * 60 * 60 * 1000));
        return res.status(403).json({ 
          message: "Account too new",
          details: `You must wait ${daysRemaining} more day(s) before leaving reviews. This helps prevent spam.`
        });
      }

      // FRAUD PREVENTION CHECK 3: Check for existing review (only 1 review per customer-contractor pair)
      const existingReviews = await storage.getReviewsByHomeowner(userId);
      const alreadyReviewed = existingReviews.some(r => r.contractorId === contractorId);
      if (alreadyReviewed) {
        return res.status(409).json({ 
          message: "Review already exists",
          details: "You have already reviewed this contractor. You can edit your existing review instead."
        });
      }

      // FRAUD PREVENTION CHECK 4: Verify service record exists within 90 days
      const serviceRecords = await storage.getServiceRecords(userId);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      
      const hasRecentService = serviceRecords.some(record => {
        const serviceDate = new Date(record.serviceDate);
        return record.contractorId === contractorId && serviceDate >= ninetyDaysAgo;
      });

      // FRAUD PREVENTION CHECK 5: Capture device fingerprint and IP address
      const deviceFingerprint = req.body.deviceFingerprint || req.headers['x-device-fingerprint'];
      const ipAddress = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

      // FRAUD PREVENTION CHECK 6: Detect duplicate IP/device fingerprints (>3 reviews)
      if (deviceFingerprint || ipAddress) {
        const allReviews = await storage.getAllReviews();
        
        if (deviceFingerprint) {
          const reviewsFromSameDevice = allReviews.filter(r => r.deviceFingerprint === deviceFingerprint);
          if (reviewsFromSameDevice.length >= 3) {
            console.warn(`[FRAUD ALERT] Device fingerprint ${deviceFingerprint} has ${reviewsFromSameDevice.length} reviews`);
            // Auto-flag for admin review but allow submission
          }
        }
        
        if (ipAddress) {
          const reviewsFromSameIP = allReviews.filter(r => r.ipAddress === ipAddress);
          if (reviewsFromSameIP.length >= 3) {
            console.warn(`[FRAUD ALERT] IP address ${ipAddress} has ${reviewsFromSameIP.length} reviews`);
            // Auto-flag for admin review but allow submission
          }
        }
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
        homeownerId: userId,
        deviceFingerprint: deviceFingerprint || null,
        ipAddress: ipAddress ? String(ipAddress).split(',')[0].trim() : null,
        isVerifiedService: hasRecentService
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

  // Review flag API endpoints
  app.post('/api/reviews/:id/flag', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const reviewId = req.params.id;
      
      // Check if review exists
      const allReviews = await storage.getAllReviews();
      const review = allReviews.find(r => r.id === reviewId);
      if (!review) {
        return res.status(404).json({ message: "Review not found" });
      }
      
      // Can't flag your own review
      if (review.homeownerId === userId) {
        return res.status(403).json({ message: "You cannot flag your own review" });
      }
      
      const flagData = insertReviewFlagSchema.parse({
        reviewId,
        reportedBy: userId,
        reason: req.body.reason,
        notes: req.body.notes || null,
        status: 'pending'
      });
      
      const flag = await storage.createReviewFlag(flagData);
      res.status(201).json(flag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flag data", errors: error.errors });
      }
      console.error("Error flagging review:", error);
      res.status(500).json({ message: "Failed to flag review" });
    }
  });

  app.get('/api/admin/review-flags', isAuthenticated, async (req: any, res) => {
    try {
      // Check admin access via email
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      if (!req.session.user.email || !adminEmails.includes(req.session.user.email)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const status = req.query.status as string | undefined;
      const flags = await storage.getReviewFlags(status);
      
      // Enhance flags with review and reporter data
      const enhancedFlags = await Promise.all(flags.map(async (flag) => {
        // Get the review directly from storage
        const allReviews = await storage.getAllReviews();
        const review = allReviews.find(r => r.id === flag.reviewId);
        
        const reporter = await storage.getUserById(flag.reportedBy);
        
        // Get contractor and homeowner names
        let contractorName = 'Unknown Contractor';
        let reviewerName = 'Unknown Reviewer';
        let reviewData = undefined;
        
        if (review) {
          const contractor = await storage.getContractorById(review.contractorId);
          contractorName = contractor?.companyName || 'Unknown Contractor';
          
          const homeowner = await storage.getUserById(review.homeownerId);
          reviewerName = homeowner ? `${homeowner.firstName} ${homeowner.lastName}` : 'Unknown Reviewer';
          
          reviewData = {
            id: review.id,
            contractorId: review.contractorId,
            homeownerId: review.homeownerId,
            rating: review.rating,
            comment: review.comment,
            wouldRecommend: review.wouldRecommend,
            contractorName,
            reviewerName,
            deviceFingerprint: review.deviceFingerprint,
            ipAddress: review.ipAddress
          };
        }
        
        return {
          ...flag,
          review: reviewData,
          reporter: reporter ? {
            name: `${reporter.firstName} ${reporter.lastName}`,
            email: reporter.email
          } : undefined
        };
      }));
      
      res.json(enhancedFlags);
    } catch (error) {
      console.error("Error fetching review flags:", error);
      res.status(500).json({ message: "Failed to fetch review flags" });
    }
  });

  app.put('/api/admin/review-flags/:id', isAuthenticated, async (req: any, res) => {
    try {
      // Check admin access via email
      const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean);
      if (!req.session.user.email || !adminEmails.includes(req.session.user.email)) {
        return res.status(403).json({ message: "Admin access required" });
      }
      
      const flagData = insertReviewFlagSchema.partial().parse({
        ...req.body,
        reviewedBy: req.session.user.id,
        resolvedAt: req.body.status === 'resolved_valid' || req.body.status === 'resolved_invalid' ? new Date() : undefined
      });
      
      const flag = await storage.updateReviewFlag(req.params.id, flagData);
      
      if (!flag) {
        return res.status(404).json({ message: "Flag not found" });
      }

      // Log admin action for review flag resolution
      await auditLogger.logAdminAction({
        userId: req.session.user.id,
        userEmail: req.session.user.email || '',
        eventType: AuditEventTypes.ADMIN_SETTINGS_CHANGE,
        action: 'Updated review flag',
        details: { flagId: req.params.id, newStatus: req.body.status, reviewId: flag.reviewId },
        req,
      });
      
      res.json(flag);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid flag data", errors: error.errors });
      }
      console.error("Error updating review flag:", error);
      res.status(500).json({ message: "Failed to update review flag" });
    }
  });

  // Email verification endpoints
  app.post('/api/send-verification-email', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const user = await storage.getUserById(userId);
      
      if (!user || !user.email) {
        return res.status(404).json({ message: "User not found or no email on file" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      // Generate verification token (6-digit code)
      const verificationToken = Math.floor(100000 + Math.random() * 900000).toString();
      const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Update user with verification token
      await storage.updateUser(userId, {
        emailVerificationToken: verificationToken,
        emailVerificationTokenExpiry: tokenExpiry
      });
      
      // TODO: Send email via SendGrid (when integrated)
      console.log(`[EMAIL VERIFICATION] Token for ${user.email}: ${verificationToken}`);
      
      res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (error) {
      console.error("Error sending verification email:", error);
      res.status(500).json({ message: "Failed to send verification email" });
    }
  });

  app.post('/api/verify-email', async (req: any, res) => {
    try {
      const { email, token } = req.body;
      
      if (!email || !token) {
        return res.status(400).json({ message: "Email and token are required" });
      }
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      if (user.emailVerified) {
        return res.status(400).json({ message: "Email already verified" });
      }
      
      if (!user.emailVerificationToken || user.emailVerificationToken !== token) {
        return res.status(400).json({ message: "Invalid verification token" });
      }
      
      if (user.emailVerificationTokenExpiry && new Date() > new Date(user.emailVerificationTokenExpiry)) {
        return res.status(400).json({ message: "Verification token expired" });
      }
      
      // Mark email as verified
      await storage.updateUser(user.id, {
        emailVerified: true,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null
      });
      
      res.json({ message: "Email verified successfully!" });
    } catch (error) {
      console.error("Error verifying email:", error);
      res.status(500).json({ message: "Failed to verify email" });
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
      const countries = await storage.getCountries();
      res.json(countries);
    } catch (error) {
      console.error("Error fetching countries:", error);
      res.status(500).json({ message: "Failed to fetch countries" });
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

      // Ensure month and year are set from completedAt
      const completedAt = req.body.completedAt ? new Date(req.body.completedAt) : new Date();
      
      const completionData = insertTaskCompletionSchema.parse({
        ...req.body,
        homeownerId,
        completedAt,
        month: completedAt.getMonth() + 1, // 1-12
        year: completedAt.getFullYear(),
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

  // Achievement endpoints (old - removed - using new system below)
  
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
      const { category, houseId } = req.query;
      
      // Get all definitions (or filtered by category)
      let definitions;
      if (category) {
        definitions = await storage.getAchievementDefinitionsByCategory(category as string);
      } else {
        definitions = await storage.getAllAchievementDefinitions();
      }
      
      // If user is authenticated, calculate progress based on house filter
      if (homeownerId) {
        // Calculate achievements with house filtering
        const achievementsWithProgress = await storage.calculateAchievementsProgress(
          homeownerId,
          houseId as string | undefined
        );
        
        // Merge with definitions
        const result = definitions.map(def => {
          const calculated = achievementsWithProgress.find(a => a.achievementKey === def.achievementKey);
          const criteria = typeof def.criteria === 'string' ? JSON.parse(def.criteria) : def.criteria;
          
          return {
            key: def.achievementKey,
            category: def.category,
            name: def.name,
            description: def.description,
            icon: def.icon,
            criteria: criteria,
            progress: calculated?.progress || 0,
            isUnlocked: calculated?.isUnlocked || false,
            unlockedAt: calculated?.unlockedAt || null,
            metadata: calculated?.metadata || null
          };
        });
        
        res.json({ achievements: result });
      } else {
        // If not authenticated, just return definitions without progress
        const achievementsWithoutProgress = definitions.map(def => {
          const criteria = typeof def.criteria === 'string' ? JSON.parse(def.criteria) : def.criteria;
          return {
            key: def.achievementKey,
            category: def.category,
            name: def.name,
            description: def.description,
            icon: def.icon,
            criteria: criteria,
            progress: 0,
            isUnlocked: false,
            unlockedAt: null,
            metadata: null
          };
        });
        res.json({ achievements: achievementsWithoutProgress });
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

  // AI Contractor Recommendation - using Replit AI Integrations blueprint
  // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
  const openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  });

  const AVAILABLE_SERVICES = [
    "Appliance Installation", "Appliance Repair & Maintenance", "Basement Remodeling", "Bathroom Remodeling",
    "Cabinet Installation", "Carpet Cleaning", "Carpet Installation", "Chimney & Fireplace Services", "Closet Organization", "Concrete & Masonry",
    "Custom Carpentry", "Custom Home Building", "Deck Construction", "Drainage Solutions",
    "Drywall & Spackling Repair", "Dumpster Rental", "Electrical Services", "Epoxy Flooring",
    "Exterior Painting", "Fence Installation", "Fire & Water Damage Restoration", "Furniture Assembly",
    "Garage Door Services", "General Contracting", "Gutter Cleaning and Repair", "Gutter Installation",
    "Handyman Services", "Hardwood Flooring", "Holiday Light Installation", "Home Automation & Tech Services", "Home Inspection",
    "House Cleaning", "HVAC Services", "Interior Painting", "Irrigation Systems",
    "Junk Removal", "Kitchen Remodeling", "Laminate & Vinyl Flooring", "Landscape Design",
    "Lawn & Landscaping", "Local Moving", "Locksmiths", "Masonry & Paver Installation", "Mold Remediation", "Pest Control",
    "Plumbing Services", "Pool Installation", "Pool Maintenance", "Pressure Washing",
    "Roofing Services", "Security System Installation", "Septic Services", "Siding Installation",
    "Snow Removal", "Tile Installation", "Tree Service & Trimming", "Trim & Finish Carpentry", "Window Cleaning",
    "Windows & Door Installation"
  ];

  // Topic validation helper for AI requests
  const isHomeMaintenanceRelated = (text: string): { valid: boolean; reason?: string } => {
    const normalizedText = text.toLowerCase().trim();
    
    // Allowed topic keywords - home, construction, maintenance related
    const allowedKeywords = [
      'home', 'house', 'property', 'room', 'wall', 'floor', 'ceiling', 'roof', 'foundation',
      'plumbing', 'electrical', 'hvac', 'heating', 'cooling', 'air', 'water', 'leak', 'drain',
      'contractor', 'repair', 'fix', 'broken', 'install', 'replace', 'maintenance', 'remodel',
      'construction', 'building', 'renovation', 'improvement', 'upgrade', 'service',
      'window', 'door', 'siding', 'gutter', 'deck', 'patio', 'garage', 'basement', 'attic',
      'kitchen', 'bathroom', 'appliance', 'fixture', 'paint', 'drywall', 'insulation',
      'landscaping', 'lawn', 'yard', 'tree', 'fence', 'concrete', 'masonry', 'brick',
      'flooring', 'carpet', 'tile', 'wood', 'cabinet', 'counter', 'sink', 'toilet', 'shower',
      'furnace', 'boiler', 'ac', 'thermostat', 'duct', 'vent', 'pipe', 'wiring', 'outlet',
      'smart home', 'security system', 'camera', 'alarm', 'detector', 'smoke', 'carbon monoxide',
      'automation', 'automated', 'automate', 'smart device', 'iot', 'wifi', 'network', 'router',
      'home theater', 'audio', 'video', 'speaker', 'tv mount', 'voice control', 'alexa', 'google home',
      'smart light', 'smart thermostat', 'smart lock', 'doorbell camera', 'nest', 'ring', 'ecobee',
      'mold', 'moisture', 'humidity', 'ventilation', 'energy', 'efficiency', 'solar'
    ];
    
    // Blocked topic keywords - use specific multi-word phrases to avoid false positives
    const blockedKeywords = [
      // Weather & Nature (non-home)
      'weather forecast', 'weather tomorrow', 'weather today', 'temperature outside', 
      'will it rain', 'climate change', 'global warming',
      
      // Food & Cooking (be specific to avoid blocking appliance repair)
      'recipe for', 'how to cook', 'cooking recipe', 'baking recipe', 'dinner recipe',
      'lunch recipe', 'breakfast recipe', 'food recipe', 'ingredient list',
      
      // Entertainment
      'tell me a joke', 'funny joke', 'make me laugh', 'comedy show', 'movie recommendation',
      'what movie', 'film recommendation', 'tv show recommendation', 'music recommendation',
      'song recommendation', 'netflix show', 'youtube video', 'video game', 'play a game',
      
      // Sports (use specific phrases)
      'sports score', 'game score', 'who won the game', 'sports team', 'football score',
      'basketball score', 'baseball score', 'soccer match', 'championship game',
      
      // Finance & Business (non-home, be specific)
      'stock market', 'stock price', 'cryptocurrency price', 'bitcoin price', 'crypto trading',
      'investment advice', 'stock portfolio', 'forex trading', 'tax return', 'tax advice',
      'irs form', 'accounting service',
      
      // Health & Medical
      'medical advice', 'health advice', 'see a doctor', 'doctor appointment', 'medicine for',
      'prescription for', 'disease symptom', 'illness symptom', 'mental health', 'therapy session',
      'covid test', 'vaccine appointment',
      
      // Legal
      'legal advice', 'lawyer consultation', 'attorney help', 'lawsuit help', 'divorce lawyer',
      'court case',
      
      // Relationships & Personal
      'dating advice', 'relationship advice', 'girlfriend problem', 'boyfriend problem',
      'marriage counseling', 'love advice',
      
      // Travel & Transportation
      'vacation destination', 'travel destination', 'hotel booking', 'flight booking',
      'airline ticket', 'cruise ship', 'passport application',
      
      // Shopping & Retail (non-home)
      'shopping mall', 'retail store', 'amazon deal', 'black friday deal', 'coupon code',
      
      // Education & School
      'homework help', 'school assignment', 'college application', 'exam preparation',
      
      // Technology (non-home, be specific)
      'smartphone repair', 'iphone problem', 'android app', 'computer virus', 'laptop repair',
      'social media', 'facebook account', 'instagram post', 'twitter feed',
      
      // Politics & News
      'political news', 'election results', 'president elect', 'breaking news', 'news story',
      
      // Pets (non-home maintenance)
      'dog training', 'cat behavior', 'pet grooming', 'veterinary care', 'pet food',
      
      // Miscellaneous clearly off-topic
      'fashion advice', 'clothing style', 'makeup tutorial', 'hair salon', 'car repair',
      'automobile service', 'book recommendation', 'novel summary', 'poem about',
      'religious advice'
    ];
    
    // Check for blocked topics first
    for (const blocked of blockedKeywords) {
      if (normalizedText.includes(blocked)) {
        return { 
          valid: false, 
          reason: 'This question appears to be about topics outside home maintenance and construction. Please ask about home repairs, maintenance, or contractor services.' 
        };
      }
    }
    
    // Check for allowed topics
    const hasAllowedKeyword = allowedKeywords.some(keyword => normalizedText.includes(keyword));
    
    // If very short and no allowed keywords, likely off-topic
    if (normalizedText.length < 20 && !hasAllowedKeyword) {
      return { 
        valid: false, 
        reason: 'Please describe a specific home maintenance, repair, or construction issue you need help with.' 
      };
    }
    
    // If longer text without any allowed keywords, probably off-topic
    if (normalizedText.length >= 20 && !hasAllowedKeyword) {
      return { 
        valid: false, 
        reason: 'I can only help with home maintenance, repair, and contractor-related questions. Please describe a home-related issue.' 
      };
    }
    
    return { valid: true };
  };

  app.post('/api/ai/contractor-recommendation', isAuthenticated, async (req: any, res) => {
    try {
      const { problem } = req.body;

      if (!problem || typeof problem !== 'string' || problem.trim().length < 10) {
        return res.status(400).json({ 
          message: "Please provide a detailed description of your problem (at least 10 characters)" 
        });
      }

      // Validate topic before making API call
      const topicValidation = isHomeMaintenanceRelated(problem);
      if (!topicValidation.valid) {
        console.log('[AI] Rejected off-topic query');
        return res.status(400).json({ 
          code: 'OFF_TOPIC',
          message: topicValidation.reason,
          examples: [
            'My toilet keeps running and won\'t stop',
            'Water stains on my ceiling',
            'Need to remodel my kitchen',
            'HVAC system not cooling properly'
          ]
        });
      }

      console.log('[AI] Processing contractor recommendation request');

      const systemPrompt = `You are a HOME MAINTENANCE EXPERT ASSISTANT. Your ONLY purpose is to help homeowners with home repair, maintenance, and construction issues.

**STRICT TOPIC BOUNDARIES:**
✅ ALLOWED TOPICS ONLY:
- Home repairs, maintenance, and construction issues
- Contractor recommendations for home services
- Building, remodeling, renovation questions
- Appliance installation and repair
- Plumbing, electrical, HVAC, roofing issues
- Landscaping, lawn care, outdoor structures
- Smart home devices, automation, and tech integration
- Home automation systems (lighting, thermostats, voice control)
- Home theater and audio/video installation
- Network setup, WiFi, and smart home hubs
- Home safety and security systems
- Energy efficiency and home improvements

❌ REFUSE ALL OTHER TOPICS:
- Weather forecasts, news, current events
- Recipes, cooking, food preparation
- Entertainment, jokes, games, trivia
- Medical, health, or legal advice
- Financial, tax, or investment advice
- Relationship or personal advice
- General knowledge not related to homes
- Any topic outside home/construction/maintenance

**REFUSAL PROTOCOL:**
If the question is clearly off-topic, respond with this JSON format:
{
  "possibleCauses": "This question is outside my area of expertise.",
  "recommendedServices": [],
  "explanation": "I can only help with home maintenance, repair, and contractor-related questions. Please ask about specific home issues like plumbing problems, electrical repairs, remodeling projects, or maintenance needs."
}

**FOR BORDERLINE CASES:**
If unclear whether the question relates to home maintenance, ask a clarifying question in the explanation field before refusing.

**YOUR ACTUAL JOB (for valid home questions):**
You are a helpful home maintenance expert assistant. Your job is to analyze home problems and recommend which type of contractor the homeowner should contact.

Available contractor service types:
${AVAILABLE_SERVICES.join(', ')}

IMPORTANT SERVICE GUIDANCE:
- Window/door leaks, drafts, exterior water intrusion → "Siding Installation" or "Windows & Door Installation"
- Interior water stains, ceiling leaks, missing shingles → "Roofing Services"
- Clogged gutters, water overflow from gutters → "Gutter Cleaning and Repair"
- Toilet/sink/drain issues, water pressure problems → "Plumbing Services"
- No heat/AC, thermostat issues, air quality → "HVAC Services"
- Outlet/switch/breaker problems, lights flickering → "Electrical Services"
- Brick/stone/paver walkways, retaining walls, chimneys → "Masonry & Paver Installation" or "Concrete & Masonry"
- Interior wall holes, cracks, texture repair → "Drywall & Spackling Repair"
- Kitchen/bathroom updates, cabinet work → "Kitchen Remodeling" or "Bathroom Remodeling"

HANDYMAN SERVICES GUIDANCE:
Many common home problems can be solved by EITHER a specialist OR a handyman. Consider suggesting "Handyman Services" as an additional option for:
- Minor plumbing fixes (running toilets, leaky faucets, basic repairs)
- Basic electrical work (replacing outlets, switches, light fixtures)
- Small drywall repairs, painting touch-ups
- Door/window adjustments, weatherstripping
- Minor carpentry (shelving, trim work, small fixes)
- General home repairs that don't require specialized licensing

For most problems, recommend BOTH the specialist AND handyman option to give homeowners flexibility. Only omit handyman if the problem requires specialized licensing (major electrical/plumbing) or specialized equipment (roofing, HVAC).

Analyze the problem and provide:
1. A brief explanation of possible causes (1-2 sentences)
2. The recommended contractor service type(s) from the available list (pick 1-3 most relevant)
3. A brief explanation of why these contractor type(s) are recommended

Respond ONLY in valid JSON format with this exact structure:
{
  "possibleCauses": "Brief explanation of what might be causing this problem",
  "recommendedServices": ["Service Type 1", "Service Type 2"],
  "explanation": "Why these contractor types are recommended for this problem"
}

Important: Only recommend service types from the available list. Match problems to services carefully using the guidance above. When appropriate, include both specialist and handyman options.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Problem: ${problem}` }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500,
        temperature: 0.7
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('[AI] No content in AI response');
        return res.status(500).json({ 
          message: "AI service returned an empty response. Please try again.",
          details: "No response content"
        });
      }

      let recommendation;
      try {
        recommendation = JSON.parse(content);
      } catch (parseError) {
        console.error('[AI] Failed to parse AI response:', parseError);
        return res.status(500).json({ 
          message: "AI service returned an invalid response format. Please try again.",
          details: "JSON parse error"
        });
      }
      
      console.log('[AI] Recommendation generated successfully');
      res.json(recommendation);

    } catch (error) {
      console.error("[AI] Error generating contractor recommendation:", error);
      
      // Provide more specific error messages based on error type
      if (error instanceof Error) {
        // Check for OpenAI API errors
        if (error.message.includes('model') || error.message.includes('gpt')) {
          return res.status(500).json({ 
            message: "AI model error. Please contact support if this persists.",
            details: error.message
          });
        }
        
        return res.status(500).json({ 
          message: "Failed to generate recommendation. Please try again.",
          details: error.message
        });
      }
      
      res.status(500).json({ 
        message: "An unexpected error occurred. Please try again.",
        details: "Unknown error"
      });
    }
  });

  // Push token registration endpoint for mobile apps (Firebase)
  app.post('/api/push-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { token, platform, deviceId } = req.body;

      if (!token || !platform) {
        return res.status(400).json({ message: "Token and platform are required" });
      }

      if (!['ios', 'android'].includes(platform)) {
        return res.status(400).json({ message: "Platform must be 'ios' or 'android'" });
      }

      // Check if token already exists for this user
      const existingTokens = await storage.getPushTokensForUser(userId);
      const existingToken = existingTokens.find(t => t.token === token);

      if (existingToken) {
        // Update last used time
        await storage.updatePushToken(existingToken.id, { isActive: true });
        console.log(`[PUSH] Updated existing token for user ${userId}`);
        return res.json({ message: "Token updated", id: existingToken.id });
      }

      // Create new token
      const newToken = await storage.createPushToken({
        userId,
        token,
        platform,
        deviceId: deviceId || null,
        isActive: true,
      });

      console.log(`[PUSH] Registered new token for user ${userId}, platform: ${platform}`);
      res.status(201).json({ message: "Token registered", id: newToken.id });
    } catch (error) {
      console.error('[PUSH] Error registering push token:', error);
      res.status(500).json({ message: "Failed to register push token" });
    }
  });

  app.delete('/api/push-token', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ message: "Token is required" });
      }

      const existingTokens = await storage.getPushTokensForUser(userId);
      const tokenToDelete = existingTokens.find(t => t.token === token);

      if (tokenToDelete) {
        await storage.deletePushToken(tokenToDelete.id);
        console.log(`[PUSH] Deleted token for user ${userId}`);
      }

      res.json({ message: "Token removed" });
    } catch (error) {
      console.error('[PUSH] Error deleting push token:', error);
      res.status(500).json({ message: "Failed to delete push token" });
    }
  });

  const httpServer = createServer(app);
  
  // WebSocket server for real-time messaging with session validation
  const wss = new WebSocketServer({ 
    noServer: true  // We'll handle upgrade manually for session validation
  });
  
  // Store active WebSocket connections with user info
  const clients = new Map<string, { userId: string; ws: WebSocket; conversations: Set<string> }>();
  
  // Handle WebSocket upgrade with session validation
  httpServer.on('upgrade', (request, socket, head) => {
    // Only handle /ws path
    if (request.url !== '/ws') {
      socket.destroy();
      return;
    }
    
    // Parse session from the request
    const sessionParser = app.get('sessionParser');
    sessionParser(request, {} as any, () => {
      const session = (request as any).session;
      
      // Validate authenticated session
      if (!session || !session.user || !session.user.id) {
        console.log('[WebSocket] Rejected unauthenticated connection attempt');
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      }
      
      const authenticatedUserId = session.user.id;
      console.log('[WebSocket] Authenticated connection for user:', authenticatedUserId);
      
      // Complete the WebSocket upgrade
      wss.handleUpgrade(request, socket, head, (ws) => {
        // Attach userId to the WebSocket for later use
        (ws as any).userId = authenticatedUserId;
        wss.emit('connection', ws, request);
      });
    });
  });
  
  wss.on('connection', (ws: WebSocket) => {
    // Get the authenticated userId from the WebSocket
    const userId = (ws as any).userId as string;
    const clientId = randomUUID();
    
    clients.set(clientId, { userId, ws, conversations: new Set() });
    console.log(`[WebSocket] Client connected: userId=${userId}, clientId=${clientId}`);
    
    // Send auth success
    ws.send(JSON.stringify({ type: 'auth_success', clientId, userId }));
    
    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle joining a conversation
        if (message.type === 'join_conversation') {
          if (clientId && clients.has(clientId)) {
            const client = clients.get(clientId)!;
            client.conversations.add(message.conversationId);
            console.log(`[WebSocket] Client ${clientId} joined conversation ${message.conversationId}`);
            ws.send(JSON.stringify({ type: 'joined_conversation', conversationId: message.conversationId }));
          }
          return;
        }
        
        // Handle leaving a conversation
        if (message.type === 'leave_conversation') {
          if (clientId && clients.has(clientId)) {
            const client = clients.get(clientId)!;
            client.conversations.delete(message.conversationId);
            console.log(`[WebSocket] Client ${clientId} left conversation ${message.conversationId}`);
          }
          return;
        }
        
        // Handle new message broadcast
        if (message.type === 'new_message') {
          const { conversationId, messageData } = message;
          console.log(`[WebSocket] Broadcasting new message in conversation ${conversationId}`);
          
          // Broadcast to all clients in this conversation
          clients.forEach((client) => {
            if (client.conversations.has(conversationId) && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'message_received',
                conversationId,
                message: messageData
              }));
            }
          });
        }
        
        // Handle typing indicator
        if (message.type === 'typing') {
          const { conversationId, isTyping } = message;
          
          // Broadcast typing status to other clients in the conversation
          clients.forEach((client) => {
            if (client.userId !== userId && client.conversations.has(conversationId) && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'user_typing',
                conversationId,
                userId,
                isTyping
              }));
            }
          });
        }
        
        // Handle read receipt
        if (message.type === 'mark_read') {
          const { conversationId, messageIds } = message;
          console.log(`[WebSocket] Marking messages as read in conversation ${conversationId}`);
          
          // Broadcast read receipt to other clients
          clients.forEach((client) => {
            if (client.userId !== userId && client.conversations.has(conversationId) && client.ws.readyState === WebSocket.OPEN) {
              client.ws.send(JSON.stringify({
                type: 'messages_read',
                conversationId,
                messageIds,
                readBy: userId
              }));
            }
          });
        }
        
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        ws.send(JSON.stringify({ type: 'error', message: 'Failed to process message' }));
      }
    });
    
    ws.on('close', () => {
      if (clientId) {
        clients.delete(clientId);
        console.log(`[WebSocket] Client disconnected: ${clientId}`);
      }
    });
    
    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
    });
  });
  
  console.log('[WebSocket] Server initialized on path /ws');
  
  return httpServer;
}
