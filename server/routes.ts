import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole, requirePropertyOwner } from "./replitAuth";
import { z } from "zod";
import { randomUUID } from "crypto";
import { insertHomeApplianceSchema, insertMaintenanceLogSchema, insertContractorAppointmentSchema, insertNotificationSchema, insertConversationSchema, insertMessageSchema, insertContractorReviewSchema, insertCustomMaintenanceTaskSchema, insertProposalSchema, insertHomeSystemSchema, insertContractorBoostSchema, insertHouseSchema, insertHouseTransferSchema } from "@shared/schema";
import pushRoutes from "./push-routes";
import { pushService } from "./push-service";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";

// Extend session data interface
declare module 'express-session' {
  interface SessionData {
    user?: any;
    isAuthenticated?: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Skip OAuth setup to prevent browser crashes
  // await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      // Check for demo session first
      if (req.session?.isAuthenticated && req.session?.user) {
        // Ensure isPremium is included in the response
        const user = req.session.user;
        if (!user.hasOwnProperty('isPremium')) {
          user.isPremium = false; // Default for demo users
        }
        return res.json(user);
      }

      // No authentication found
      return res.status(401).json({ message: "Unauthorized" });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Demo logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Could not log out" });
      }
      res.json({ success: true });
    });
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

  // Simple contractor demo login (no OAuth)
  app.post('/api/auth/contractor-demo-login', async (req, res) => {
    try {
      const { email, name, company } = req.body;
      
      if (!email || !name || !company) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Create a demo contractor user
      const contractorId = `demo-contractor-${Date.now()}`;
      const user = await storage.upsertUser({
        id: contractorId,
        email: email,
        firstName: name.split(' ')[0],
        lastName: name.split(' ').slice(1).join(' '),
        profileImageUrl: null,
        role: 'contractor'
      });

      // Create a simple session (for demo purposes)
      req.session.user = user;
      req.session.isAuthenticated = true;

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error creating contractor demo user:", error);
      res.status(500).json({ message: "Failed to create contractor account" });
    }
  });

  // Simple homeowner demo login
  app.post('/api/auth/homeowner-demo-login', async (req, res) => {
    try {
      const { email, name, role } = req.body;
      
      // Create a demo homeowner user
      const homeownerId = `demo-homeowner-${Date.now()}`;
      const user = await storage.upsertUser({
        id: homeownerId,
        email: email || 'demo@homeowner.com',
        firstName: (name || 'Demo Homeowner').split(' ')[0],
        lastName: (name || 'Demo Homeowner').split(' ').slice(1).join(' '),
        profileImageUrl: null,
        role: role || 'homeowner'
      });

      // Create a simple session
      req.session.user = user;
      req.session.isAuthenticated = true;

      res.json({ success: true, user });
    } catch (error) {
      console.error("Error creating homeowner demo user:", error);
      res.status(500).json({ message: "Failed to create homeowner account" });
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
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch contractors" });
    }
  });

  app.get("/api/contractors/search", async (req, res) => {
    try {
      const query = req.query.q as string || "";
      const location = req.query.location as string;
      
      const contractors = await storage.searchContractors(query, location);
      res.json(contractors);
    } catch (error) {
      res.status(500).json({ message: "Failed to search contractors" });
    }
  });

  app.get("/api/contractors/:id", async (req, res) => {
    try {
      const contractor = await storage.getContractor(req.params.id);
      if (!contractor) {
        return res.status(404).json({ message: "Contractor not found" });
      }
      res.json(contractor);
    } catch (error) {
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
      const appliances = await storage.getHomeAppliances(homeownerId);
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

  // Maintenance Log routes
  app.get("/api/maintenance-logs", isAuthenticated, requirePropertyOwner, async (req: any, res) => {
    try {
      // Always use authenticated user's ID, ignore query params to prevent IDOR
      const homeownerId = req.session.user.id;
      const logs = await storage.getMaintenanceLogs(homeownerId);
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
      const proposal = await storage.updateProposal(req.params.id, partialData);
      if (!proposal) {
        return res.status(404).json({ message: "Proposal not found" });
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
          profileImage: ''
        });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error fetching contractor profile:", error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.put('/api/contractor/profile', async (req: any, res) => {
    try {
      if (!req.session?.isAuthenticated || req.session?.user?.role !== 'contractor') {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const contractorId = req.session.user.id;
      const profileData = req.body;

      const updatedProfile = await storage.updateContractorProfile(contractorId, profileData);
      res.json(updatedProfile);
    } catch (error) {
      console.error("Error updating contractor profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
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
      const contractorId = req.session.user.id;
      const serviceRecords = await storage.getServiceRecords(contractorId);
      res.json(serviceRecords);
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
      res.json(serviceRecord);
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
      res.json(serviceRecord);
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

  // Check if homeowner can review contractor (requires accepted proposals)
  app.get('/api/contractors/:id/can-review', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      const contractorId = req.params.id;
      
      // Only homeowners can review
      if (userType !== 'homeowner') {
        return res.json({ canReview: false, reason: "Only homeowners can review contractors" });
      }
      
      // Check if homeowner has accepted proposals with this contractor
      const hasAcceptedProposal = await storage.hasAcceptedProposalWithContractor(userId, contractorId);
      
      if (!hasAcceptedProposal) {
        return res.json({ canReview: false, reason: "You can only review contractors after accepting their proposals" });
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
      
      // Check if homeowner has accepted proposals with this contractor
      const hasAcceptedProposal = await storage.hasAcceptedProposalWithContractor(userId, contractorId);
      if (!hasAcceptedProposal) {
        return res.status(403).json({ message: "You can only review contractors after accepting their proposals" });
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

  const httpServer = createServer(app);
  return httpServer;
}
