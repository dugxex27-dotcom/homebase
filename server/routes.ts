import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, requireRole } from "./replitAuth";
import { z } from "zod";
import { insertHomeApplianceSchema, insertMaintenanceLogSchema, insertContractorAppointmentSchema, insertNotificationSchema, insertConversationSchema, insertMessageSchema, insertContractorReviewSchema, insertCustomMaintenanceTaskSchema, insertProposalSchema, insertHomeSystemSchema } from "@shared/schema";
import pushRoutes from "./push-routes";
import { pushService } from "./push-service";

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
        return res.json(req.session.user);
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

  // Push notification routes
  app.use('/api/push', pushRoutes);

  // Push notification routes
  app.use('/api/push', pushRoutes);

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
  app.get("/api/maintenance-logs", async (req, res) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      const logs = await storage.getMaintenanceLogs(homeownerId);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance logs" });
    }
  });

  app.get("/api/maintenance-logs/:id", async (req, res) => {
    try {
      const log = await storage.getMaintenanceLog(req.params.id);
      if (!log) {
        return res.status(404).json({ message: "Maintenance log not found" });
      }
      res.json(log);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch maintenance log" });
    }
  });

  app.post("/api/maintenance-logs", async (req, res) => {
    try {
      const logData = insertMaintenanceLogSchema.parse(req.body);
      const log = await storage.createMaintenanceLog(logData);
      res.status(201).json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid maintenance log data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create maintenance log" });
    }
  });

  app.patch("/api/maintenance-logs/:id", async (req, res) => {
    try {
      const partialData = insertMaintenanceLogSchema.partial().parse(req.body);
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

  app.delete("/api/maintenance-logs/:id", async (req, res) => {
    try {
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
  app.get("/api/custom-maintenance-tasks", async (req, res) => {
    try {
      const homeownerId = req.query.homeownerId as string;
      const houseId = req.query.houseId as string;
      const tasks = await storage.getCustomMaintenanceTasks(homeownerId, houseId);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom maintenance tasks" });
    }
  });

  app.get("/api/custom-maintenance-tasks/:id", async (req, res) => {
    try {
      const task = await storage.getCustomMaintenanceTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.json(task);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch custom maintenance task" });
    }
  });

  app.post("/api/custom-maintenance-tasks", async (req, res) => {
    try {
      const taskData = insertCustomMaintenanceTaskSchema.parse(req.body);
      const task = await storage.createCustomMaintenanceTask(taskData);
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid custom maintenance task data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create custom maintenance task" });
    }
  });

  app.patch("/api/custom-maintenance-tasks/:id", async (req, res) => {
    try {
      const partialData = insertCustomMaintenanceTaskSchema.partial().parse(req.body);
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

  app.delete("/api/custom-maintenance-tasks/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomMaintenanceTask(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Custom maintenance task not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete custom maintenance task" });
    }
  });

  // AI Maintenance Suggestions Routes
  app.get("/api/ai-maintenance-suggestions/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const { aiMaintenanceService } = await import("./ai-maintenance-service");
      
      // Get user's houses and home systems
      const houses = await storage.getHousesByHomeowner(userId);
      const homeSystems = await storage.getHomeSystemsByHomeowner(userId);
      const maintenanceLogs = await storage.getMaintenanceLogsByHomeowner(userId);
      
      const suggestions = await aiMaintenanceService.getMonthlyMaintenanceSuggestions(
        userId,
        houses,
        homeSystems.map((system: any) => system.systemType),
        maintenanceLogs
      );
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating AI maintenance suggestions:", error);
      res.status(500).json({ message: "Failed to generate maintenance suggestions" });
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

  app.post("/api/proposals", async (req, res) => {
    try {
      const proposalData = insertProposalSchema.parse(req.body);
      const proposal = await storage.createProposal(proposalData);
      res.status(201).json(proposal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid proposal data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create proposal" });
    }
  });

  app.patch("/api/proposals/:id", async (req, res) => {
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
      res.status(500).json({ message: "Failed to update proposal" });
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
  app.post("/api/notifications/maintenance", async (req, res) => {
    try {
      const { homeownerId, tasks } = req.body;
      if (!homeownerId || !Array.isArray(tasks)) {
        return res.status(400).json({ message: "homeownerId and tasks array are required" });
      }
      
      await storage.createMaintenanceNotifications(homeownerId, tasks);
      res.json({ success: true, message: "Maintenance notifications created" });
    } catch (error) {
      res.status(500).json({ message: "Failed to create maintenance notifications" });
    }
  });

  // House management routes
  app.get("/api/houses", async (req, res) => {
    try {
      const { homeownerId } = req.query;
      const houses = await storage.getHouses(homeownerId as string);
      res.json(houses);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch houses" });
    }
  });

  app.get("/api/houses/:id", async (req, res) => {
    try {
      const house = await storage.getHouse(req.params.id);
      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch house" });
    }
  });

  app.post("/api/houses", async (req, res) => {  
    try {
      const house = await storage.createHouse(req.body);
      res.status(201).json(house);
    } catch (error) {
      res.status(500).json({ message: "Failed to create house" });
    }
  });

  app.delete("/api/houses/:id", async (req, res) => {
    try {
      const success = await storage.deleteHouse(req.params.id);
      if (!success) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete house" });
    }
  });

  app.put("/api/houses/:id", async (req, res) => {
    try {
      const house = await storage.updateHouse(req.params.id, req.body);
      if (!house) {
        return res.status(404).json({ message: "House not found" });
      }
      res.json(house);
    } catch (error) {
      res.status(500).json({ message: "Failed to update house" });
    }
  });

  // Home Systems routes
  app.get("/api/home-systems", async (req, res) => {
    try {
      const { homeownerId, houseId } = req.query;
      const systems = await storage.getHomeSystems(homeownerId as string, houseId as string);
      res.json(systems);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home systems" });
    }
  });

  app.get("/api/home-systems/:id", async (req, res) => {
    try {
      const system = await storage.getHomeSystem(req.params.id);
      if (!system) {
        return res.status(404).json({ message: "Home system not found" });
      }
      res.json(system);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch home system" });
    }
  });

  app.post("/api/home-systems", async (req, res) => {
    try {
      const systemData = insertHomeSystemSchema.parse(req.body);
      const system = await storage.createHomeSystem(systemData);
      res.status(201).json(system);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid home system data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create home system" });
    }
  });

  app.patch("/api/home-systems/:id", async (req, res) => {
    try {
      const partialData = insertHomeSystemSchema.partial().parse(req.body);
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

  app.delete("/api/home-systems/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteHomeSystem(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "Home system not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete home system" });
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

  app.post('/api/contractors/:id/reviews', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.session.user.id;
      const userType = req.session.user.role;
      
      // Only homeowners can leave reviews
      if (userType !== 'homeowner') {
        return res.status(403).json({ message: "Only homeowners can leave reviews" });
      }
      
      const reviewData = insertContractorReviewSchema.parse({
        ...req.body,
        contractorId: req.params.id,
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
