import { type Contractor, type InsertContractor, type ContractorLicense, type InsertContractorLicense, type Product, type InsertProduct, type HomeAppliance, type InsertHomeAppliance, type HomeApplianceManual, type InsertHomeApplianceManual, type MaintenanceLog, type InsertMaintenanceLog, type ContractorAppointment, type InsertContractorAppointment, type House, type InsertHouse, type Notification, type InsertNotification, type User, type UpsertUser, type ServiceRecord, type InsertServiceRecord, type Conversation, type InsertConversation, type Message, type InsertMessage, type ContractorReview, type InsertContractorReview, type CustomMaintenanceTask, type InsertCustomMaintenanceTask, type Proposal, type InsertProposal, type HomeSystem, type InsertHomeSystem, type PushSubscription, type InsertPushSubscription, type ContractorBoost, type InsertContractorBoost, type HouseTransfer, type InsertHouseTransfer, type ContractorAnalytics, type InsertContractorAnalytics, type TaskOverride, type InsertTaskOverride, type Country, type InsertCountry, type Region, type InsertRegion, type ClimateZone, type InsertClimateZone, type RegulatoryBody, type InsertRegulatoryBody, type RegionalMaintenanceTask, type InsertRegionalMaintenanceTask, type TaskCompletion, type InsertTaskCompletion, type Achievement, type InsertAchievement, type AchievementDefinition, type InsertAchievementDefinition, type UserAchievement, type InsertUserAchievement, type SearchAnalytics, type InsertSearchAnalytics, type InviteCode, type InsertInviteCode, users, countries, regions, climateZones, regulatoryBodies, regionalMaintenanceTasks, taskCompletions, achievements, achievementDefinitions, userAchievements, maintenanceLogs, searchAnalytics, inviteCodes } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, ne, isNotNull } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Contractor methods
  getContractors(filters?: {
    services?: string[];
    location?: string;
    minRating?: number;
    hasEmergencyServices?: boolean;
    maxDistance?: number;
    serviceRadius?: number;
  }): Promise<Contractor[]>;
  getContractor(id: string): Promise<Contractor | undefined>;
  createContractor(contractor: InsertContractor): Promise<Contractor>;
  
  // Contractor license methods
  getContractorLicenses(contractorId: string): Promise<ContractorLicense[]>;
  getContractorLicense(id: string): Promise<ContractorLicense | undefined>;
  createContractorLicense(license: InsertContractorLicense): Promise<ContractorLicense>;
  updateContractorLicense(id: string, contractorId: string, license: Partial<InsertContractorLicense>): Promise<ContractorLicense | undefined>;
  deleteContractorLicense(id: string, contractorId: string): Promise<boolean>;
  
  // Product methods
  getProducts(filters?: {
    category?: string;
    featured?: boolean;
    search?: string;
  }): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  
  // Appliance methods
  getHomeAppliances(homeownerId?: string, houseId?: string): Promise<HomeAppliance[]>;
  getHomeAppliance(id: string): Promise<HomeAppliance | undefined>;
  createHomeAppliance(appliance: InsertHomeAppliance): Promise<HomeAppliance>;
  updateHomeAppliance(id: string, appliance: Partial<InsertHomeAppliance>): Promise<HomeAppliance | undefined>;
  deleteHomeAppliance(id: string): Promise<boolean>;
  
  // Appliance manual methods
  getHomeApplianceManuals(applianceId: string): Promise<HomeApplianceManual[]>;
  getHomeApplianceManual(id: string): Promise<HomeApplianceManual | undefined>;
  createHomeApplianceManual(manual: InsertHomeApplianceManual): Promise<HomeApplianceManual>;
  updateHomeApplianceManual(id: string, manual: Partial<InsertHomeApplianceManual>): Promise<HomeApplianceManual | undefined>;
  deleteHomeApplianceManual(id: string): Promise<boolean>;
  
  // Maintenance log methods
  getMaintenanceLogs(homeownerId?: string): Promise<MaintenanceLog[]>;
  getMaintenanceLog(id: string): Promise<MaintenanceLog | undefined>;
  createMaintenanceLog(log: InsertMaintenanceLog): Promise<MaintenanceLog>;
  updateMaintenanceLog(id: string, log: Partial<InsertMaintenanceLog>): Promise<MaintenanceLog | undefined>;
  deleteMaintenanceLog(id: string): Promise<boolean>;
  
  // Custom maintenance task methods
  getCustomMaintenanceTasks(homeownerId?: string, houseId?: string): Promise<CustomMaintenanceTask[]>;
  getCustomMaintenanceTask(id: string): Promise<CustomMaintenanceTask | undefined>;
  createCustomMaintenanceTask(task: InsertCustomMaintenanceTask): Promise<CustomMaintenanceTask>;
  updateCustomMaintenanceTask(id: string, task: Partial<InsertCustomMaintenanceTask>): Promise<CustomMaintenanceTask | undefined>;
  deleteCustomMaintenanceTask(id: string): Promise<boolean>;
  
  // House methods
  getHouses(homeownerId?: string): Promise<House[]>;
  getHouse(id: string): Promise<House | undefined>;
  createHouse(house: InsertHouse): Promise<House>;
  updateHouse(id: string, house: Partial<InsertHouse>): Promise<House | undefined>;
  deleteHouse(id: string): Promise<boolean>;
  getDefaultHouse(homeownerId: string): Promise<House | undefined>;

  // Contractor appointment methods
  getContractorAppointments(homeownerId?: string, houseId?: string): Promise<ContractorAppointment[]>;
  getContractorAppointment(id: string): Promise<ContractorAppointment | undefined>;
  createContractorAppointment(appointment: InsertContractorAppointment): Promise<ContractorAppointment>;
  updateContractorAppointment(id: string, appointment: Partial<InsertContractorAppointment>): Promise<ContractorAppointment | undefined>;
  deleteContractorAppointment(id: string): Promise<boolean>;
  
  // Notification methods
  getNotifications(homeownerId?: string): Promise<Notification[]>;
  getNotification(id: string): Promise<Notification | undefined>;
  createNotification(notification: InsertNotification): Promise<Notification>;
  updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification | undefined>;
  deleteNotification(id: string): Promise<boolean>;
  getUnreadNotifications(homeownerId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<boolean>;
  
  // Search methods
  searchContractors(query: string, location?: string): Promise<Contractor[]>;
  searchProducts(query: string): Promise<Product[]>;
  
  // Contractor profile operations
  getContractorProfile(contractorId: string): Promise<Contractor | undefined>;
  updateContractorProfile(contractorId: string, profileData: Partial<InsertContractor>): Promise<Contractor>;

  // Service record operations
  getServiceRecords(contractorId?: string, homeownerId?: string): Promise<ServiceRecord[]>;
  getServiceRecord(id: string): Promise<ServiceRecord | undefined>;
  createServiceRecord(record: InsertServiceRecord): Promise<ServiceRecord>;
  updateServiceRecord(id: string, record: Partial<InsertServiceRecord>): Promise<ServiceRecord | undefined>;
  deleteServiceRecord(id: string): Promise<boolean>;
  getHomeownerServiceRecords(homeownerId: string): Promise<ServiceRecord[]>;
  
  // Customer service record operations  
  getCustomerServiceRecords(customerId?: string, customerEmail?: string, customerAddress?: string): Promise<ServiceRecord[]>;

  // Messaging operations
  getConversations(userId: string, userType: 'homeowner' | 'contractor'): Promise<(Conversation & { otherPartyName: string; unreadCount: number })[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;

  // Review operations
  getContractorReviews(contractorId: string): Promise<ContractorReview[]>;
  getReviewsByHomeowner(homeownerId: string): Promise<ContractorReview[]>;
  createContractorReview(review: InsertContractorReview): Promise<ContractorReview>;
  updateContractorReview(id: string, review: Partial<InsertContractorReview>): Promise<ContractorReview | undefined>;
  deleteContractorReview(id: string): Promise<boolean>;
  getContractorAverageRating(contractorId: string): Promise<{ averageRating: number; totalReviews: number }>;

  // Proposal operations
  getProposals(contractorId?: string, homeownerId?: string): Promise<Proposal[]>;
  getProposal(id: string): Promise<Proposal | undefined>;
  createProposal(proposal: InsertProposal): Promise<Proposal>;
  updateProposal(id: string, proposal: Partial<InsertProposal>): Promise<Proposal | undefined>;
  deleteProposal(id: string): Promise<boolean>;

  // Home system operations
  getHomeSystems(homeownerId?: string, houseId?: string): Promise<HomeSystem[]>;
  getHomeSystem(id: string): Promise<HomeSystem | undefined>;
  createHomeSystem(system: InsertHomeSystem): Promise<HomeSystem>;
  updateHomeSystem(id: string, system: Partial<InsertHomeSystem>): Promise<HomeSystem | undefined>;
  deleteHomeSystem(id: string): Promise<boolean>;

  // Push subscription operations
  getPushSubscriptions(userId?: string): Promise<PushSubscription[]>;
  getPushSubscription(id: string): Promise<PushSubscription | undefined>;
  createPushSubscription(subscription: InsertPushSubscription): Promise<PushSubscription>;
  updatePushSubscription(id: string, subscription: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined>;
  deletePushSubscription(id: string): Promise<boolean>;
  deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean>;

  // AI Maintenance helper methods
  getHousesByHomeowner(homeownerId: string): Promise<House[]>;
  getHomeSystemsByHomeowner(homeownerId: string): Promise<HomeSystem[]>;
  getMaintenanceLogsByHomeowner(homeownerId: string): Promise<MaintenanceLog[]>;

  // Contractor boost operations
  getActiveBoosts(serviceCategory?: string, latitude?: number, longitude?: number): Promise<ContractorBoost[]>;
  getContractorBoosts(contractorId: string): Promise<ContractorBoost[]>;
  createContractorBoost(boost: InsertContractorBoost): Promise<ContractorBoost>;
  updateContractorBoost(id: string, boost: Partial<InsertContractorBoost>): Promise<ContractorBoost | undefined>;
  deleteContractorBoost(id: string): Promise<boolean>;
  checkBoostConflict(serviceCategory: string, latitude: number, longitude: number, radius: number): Promise<ContractorBoost | null>;

  // House transfer operations
  createHouseTransfer(transfer: InsertHouseTransfer): Promise<HouseTransfer>;
  getHouseTransfer(id: string): Promise<HouseTransfer | undefined>;
  getHouseTransferByToken(token: string): Promise<HouseTransfer | undefined>;
  getHouseTransfersForUser(homeownerId: string): Promise<HouseTransfer[]>;
  updateHouseTransfer(id: string, transfer: Partial<HouseTransfer>): Promise<HouseTransfer | undefined>;
  transferHouseOwnership(houseId: string, fromHomeownerId: string, toHomeownerId: string): Promise<{
    maintenanceLogsTransferred: number;
    appliancesTransferred: number;
    appointmentsTransferred: number;
    customTasksTransferred: number;
    homeSystemsTransferred: number;
  }>;
  getHousesCount(homeownerId: string): Promise<number>;

  // Contractor analytics operations
  trackContractorClick(analyticsData: InsertContractorAnalytics): Promise<ContractorAnalytics>;
  getContractorAnalytics(contractorId: string, startDate?: Date, endDate?: Date): Promise<ContractorAnalytics[]>;
  getContractorMonthlyStats(contractorId: string, year: number, month: number): Promise<{
    totalViews: number;
    uniqueVisitors: number;
    websiteClicks: number;
    socialMediaClicks: number;
    phoneClicks: number;
    emailClicks: number;
    topReferrers: { referrer: string; count: number }[];
    dailyBreakdown: { day: number; views: number; uniqueVisitors: number }[];
  }>;

  // Task override operations for customizing default regional tasks
  getTaskOverrides(homeownerId: string, houseId: string): Promise<TaskOverride[]>;
  getTaskOverride(homeownerId: string, houseId: string, taskId: string): Promise<TaskOverride | undefined>;
  upsertTaskOverride(override: InsertTaskOverride): Promise<TaskOverride>;
  deleteTaskOverride(homeownerId: string, houseId: string, taskId: string): Promise<boolean>;

  // Regional data operations for international expansion
  getCountries(): Promise<Country[]>;
  getCountry(id: string): Promise<Country | undefined>;
  getCountryByCode(code: string): Promise<Country | undefined>;
  createCountry(country: InsertCountry): Promise<Country>;
  updateCountry(id: string, country: Partial<InsertCountry>): Promise<Country | undefined>;

  getRegionsByCountry(countryId: string): Promise<Region[]>;
  getRegion(id: string): Promise<Region | undefined>;
  createRegion(region: InsertRegion): Promise<Region>;
  updateRegion(id: string, region: Partial<InsertRegion>): Promise<Region | undefined>;

  getClimateZonesByCountry(countryId: string): Promise<ClimateZone[]>;
  getClimateZone(id: string): Promise<ClimateZone | undefined>;
  createClimateZone(climateZone: InsertClimateZone): Promise<ClimateZone>;
  updateClimateZone(id: string, climateZone: Partial<InsertClimateZone>): Promise<ClimateZone | undefined>;

  getRegulatoryBodiesByRegion(regionId: string): Promise<RegulatoryBody[]>;
  getRegulatoryBodiesByCountry(countryId: string): Promise<RegulatoryBody[]>;
  getRegulatoryBody(id: string): Promise<RegulatoryBody | undefined>;
  createRegulatoryBody(regulatoryBody: InsertRegulatoryBody): Promise<RegulatoryBody>;
  updateRegulatoryBody(id: string, regulatoryBody: Partial<InsertRegulatoryBody>): Promise<RegulatoryBody | undefined>;

  getRegionalMaintenanceTasks(countryId: string, climateZoneId?: string, month?: number): Promise<RegionalMaintenanceTask[]>;
  getRegionalMaintenanceTask(id: string): Promise<RegionalMaintenanceTask | undefined>;
  createRegionalMaintenanceTask(task: InsertRegionalMaintenanceTask): Promise<RegionalMaintenanceTask>;
  updateRegionalMaintenanceTask(id: string, task: Partial<InsertRegionalMaintenanceTask>): Promise<RegionalMaintenanceTask | undefined>;

  // Task completion operations for achievements and streaks
  getTaskCompletions(homeownerId: string, houseId?: string): Promise<TaskCompletion[]>;
  getTaskCompletion(id: string): Promise<TaskCompletion | undefined>;
  createTaskCompletion(completion: InsertTaskCompletion): Promise<TaskCompletion>;
  getTaskCompletionsByMonth(homeownerId: string, year: number, month: number): Promise<TaskCompletion[]>;
  getMonthlyStreak(homeownerId: string): Promise<{ currentStreak: number; longestStreak: number }>;

  // Achievement operations for milestone tracking
  getAchievements(homeownerId: string): Promise<Achievement[]>;
  getAchievement(id: string): Promise<Achievement | undefined>;
  createAchievement(achievement: InsertAchievement): Promise<Achievement>;
  hasAchievement(homeownerId: string, achievementType: string): Promise<boolean>;
  getContractorHireCount(homeownerId: string): Promise<number>;
  
  // New achievement system operations
  getAllAchievementDefinitions(): Promise<AchievementDefinition[]>;
  getAchievementDefinitionsByCategory(category: string): Promise<AchievementDefinition[]>;
  getUserAchievements(homeownerId: string): Promise<UserAchievement[]>;
  getUserAchievement(homeownerId: string, achievementKey: string): Promise<UserAchievement | undefined>;
  createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement>;
  updateUserAchievementProgress(homeownerId: string, achievementKey: string, progress: number, metadata?: string): Promise<UserAchievement | undefined>;
  unlockUserAchievement(homeownerId: string, achievementKey: string): Promise<UserAchievement | undefined>;
  checkAndAwardAchievements(homeownerId: string): Promise<UserAchievement[]>;
  getAchievementProgress(homeownerId: string, achievementKey: string): Promise<{ progress: number; isUnlocked: boolean; criteria: any }>;

  // Authentication methods
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(data: { email: string, passwordHash: string, firstName: string, lastName: string, role: 'homeowner' | 'contractor', zipCode: string }): Promise<User>;

  // Invite code methods
  validateAndUseInviteCode(code: string): Promise<boolean>;
  getInviteCodes(): Promise<InviteCode[]>;
  createInviteCode(data: InsertInviteCode): Promise<InviteCode>;
  deactivateInviteCode(code: string): Promise<boolean>;

  // Search analytics methods
  trackSearch(data: InsertSearchAnalytics): Promise<SearchAnalytics>;
  getSearchAnalytics(filters?: { zipCode?: string, limit?: number }): Promise<SearchAnalytics[]>;

  // Admin analytics methods
  getAdminStats(): Promise<{
    totalUsers: number;
    homeownerCount: number;
    contractorCount: number;
    topSearches: Array<{ searchTerm: string; count: number }>;
    signupsByZip: Array<{ zipCode: string; count: number }>;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private contractors: Map<string, Contractor>;
  private contractorLicenses: Map<string, ContractorLicense>;
  private products: Map<string, Product>;
  private homeAppliances: Map<string, HomeAppliance>;
  private homeApplianceManuals: Map<string, HomeApplianceManual>;
  private maintenanceLogs: Map<string, MaintenanceLog>;
  private customMaintenanceTasks: Map<string, CustomMaintenanceTask>;
  private houses: Map<string, House>;
  private contractorAppointments: Map<string, ContractorAppointment>;
  private houseTransfers: Map<string, HouseTransfer>;
  private notifications: Map<string, Notification>;
  private contractorProfiles: Map<string, any>;
  private serviceRecords: ServiceRecord[];
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private contractorReviews: Map<string, ContractorReview>;
  private proposals: Map<string, Proposal>;
  private homeSystems: Map<string, HomeSystem>;
  private pushSubscriptions: Map<string, PushSubscription>;
  private contractorBoosts: Map<string, ContractorBoost>;
  private contractorAnalytics: Map<string, ContractorAnalytics>;
  private taskOverrides: Map<string, TaskOverride>;
  // Regional data Maps for international expansion
  private countries: Map<string, Country>;
  private regions: Map<string, Region>;
  private climateZones: Map<string, ClimateZone>;
  private regulatoryBodies: Map<string, RegulatoryBody>;
  private regionalMaintenanceTasks: Map<string, RegionalMaintenanceTask>;
  // Auth and analytics Maps
  private inviteCodesMap: Map<string, InviteCode>;
  private searchAnalyticsMap: Map<string, SearchAnalytics>;

  constructor() {
    this.users = new Map();
    this.contractors = new Map();
    this.contractorLicenses = new Map();
    this.products = new Map();
    this.homeAppliances = new Map();
    this.homeApplianceManuals = new Map();
    this.maintenanceLogs = new Map();
    this.customMaintenanceTasks = new Map();
    this.houses = new Map();
    this.contractorAppointments = new Map();
    this.houseTransfers = new Map();
    this.notifications = new Map();
    this.contractorProfiles = new Map();
    this.serviceRecords = [];
    this.conversations = new Map();
    this.messages = new Map();
    this.contractorReviews = new Map();
    this.proposals = new Map();
    this.homeSystems = new Map();
    this.pushSubscriptions = new Map();
    this.contractorBoosts = new Map();
    this.contractorAnalytics = new Map();
    this.taskOverrides = new Map();
    // Initialize regional data Maps
    this.countries = new Map();
    this.regions = new Map();
    this.climateZones = new Map();
    this.regulatoryBodies = new Map();
    this.regionalMaintenanceTasks = new Map();
    // Initialize auth and analytics Maps
    this.inviteCodesMap = new Map();
    this.searchAnalyticsMap = new Map();
    this.seedData();
    this.seedServiceRecords();
    this.seedReviews();
    
    // Add sample maintenance logs with contractor information after other data is seeded
    this.initializeMaintenanceLogsData();
  }

  private initializeMaintenanceLogsData() {
    // No sample maintenance logs - users will create their own
  }

  // User operations (required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.referralCode === referralCode) {
        return user;
      }
    }
    return undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id!);
    const user: User = {
      id: userData.id!,
      email: userData.email || null,
      firstName: userData.firstName || null,
      lastName: userData.lastName || null,
      profileImageUrl: userData.profileImageUrl || null,
      role: userData.role || existingUser?.role || 'homeowner',
      passwordHash: userData.passwordHash ?? existingUser?.passwordHash ?? null,
      zipCode: userData.zipCode ?? existingUser?.zipCode ?? null,
      referralCode: userData.referralCode || existingUser?.referralCode || null,
      referredBy: userData.referredBy || existingUser?.referredBy || null,
      referralCount: userData.referralCount ?? existingUser?.referralCount ?? 0,
      createdAt: existingUser?.createdAt || new Date(),
      updatedAt: new Date(),
      isPremium: userData.isPremium ?? existingUser?.isPremium ?? false,
      stripeCustomerId: userData.stripeCustomerId ?? existingUser?.stripeCustomerId ?? null,
      stripeSubscriptionId: userData.stripeSubscriptionId ?? existingUser?.stripeSubscriptionId ?? null,
    };
    this.users.set(user.id, user);
    return user;
  }

  private seedData() {
    // No seed contractors - contractors will register through the app
    const contractorData: InsertContractor[] = [];

    // Seed products
    const productData: InsertProduct[] = [
      {
        name: "DeWalt 20V Max Cordless Drill",
        description: "Professional-grade cordless drill with LED light and 2-speed transmission",
        price: "129.99",
        category: "Power Tools",
        rating: "4.8",
        reviewCount: 324,
        image: "https://images.unsplash.com/photo-1581092921461-eab62e97a780?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      },
      {
        name: "Brushed Nickel Cabinet Handles",
        description: "Set of 10 modern cabinet pulls, 5-inch centers, premium finish",
        price: "34.99",
        category: "Hardware",
        rating: "4.5",
        reviewCount: 89,
        image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      },
      {
        name: "Professional Paint Roller Set",
        description: "Complete painting kit with rollers, brushes, and tray for interior walls",
        price: "24.99",
        category: "Paint Supplies",
        rating: "4.7",
        reviewCount: 156,
        image: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      },
      {
        name: "Modern LED Ceiling Light",
        description: "Energy-efficient LED fixture with dimmer compatibility and easy installation",
        price: "79.99",
        category: "Lighting",
        rating: "4.4",
        reviewCount: 267,
        image: "https://images.unsplash.com/photo-1524484485831-a92ffc0de03f?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=400&h=300",
        isFeatured: true,
        inStock: true
      }
    ];

    productData.forEach(product => {
      const id = randomUUID();
      const productWithId: Product = { 
        ...product, 
        id,
        reviewCount: product.reviewCount || 0,
        isFeatured: product.isFeatured || false,
        inStock: product.inStock !== false
      };
      this.products.set(id, productWithId);
    });

    // Add sample houses for multi-house support
    const sampleHouses: House[] = [
      {
        id: "house-1",
        homeownerId: "demo-homeowner-123",
        name: "Main House",
        address: "123 Oak Street, Seattle, WA 98101",
        climateZone: "Pacific Northwest",
        homeSystems: ["Central Air", "Gas Heat", "Gas Water Heater", "Dishwasher", "Garbage Disposal"],
        isDefault: true,
        createdAt: new Date(),
      },
      {
        id: "house-2", 
        homeownerId: "demo-homeowner-123",
        name: "Vacation Cabin",
        address: "456 Mountain View Drive, Snoqualmie, WA 98065",
        climateZone: "Pacific Northwest",
        homeSystems: ["Electric Heat", "Electric Water Heater", "Wood Stove"],
        isDefault: false,
        createdAt: new Date(),
      }
    ];

    sampleHouses.forEach(house => {
      this.houses.set(house.id, house);
    });

    // No sample appointments - users will create their own

    // Add sample maintenance task notifications
    const sampleMaintenanceTasks = [
      {
        id: "hvac-filter-january",
        title: "Replace HVAC Filters",
        description: "Replace air filters in HVAC system for optimal air quality and system efficiency",
        month: new Date().getMonth() + 1, // Current month
        priority: "high",
        estimatedTime: "30 minutes",
        category: "HVAC"
      },
      {
        id: "smoke-detector-january", 
        title: "Test Smoke Detectors",
        description: "Test all smoke detectors and replace batteries if needed",
        month: new Date().getMonth() + 1, // Current month
        priority: "high",
        estimatedTime: "15 minutes",
        category: "Safety"
      },
      {
        id: "clean-gutters-january",
        title: "Clean Gutters and Downspouts",
        description: "Remove debris from gutters and check for proper drainage",
        month: new Date().getMonth() + 1, // Current month
        priority: "medium",
        estimatedTime: "2-3 hours",
        category: "Exterior"
      }
    ];

    // Create maintenance notifications
    this.createMaintenanceNotifications("demo-homeowner-123", sampleMaintenanceTasks);
  }

  async getContractors(filters?: {
    services?: string[];
    location?: string;
    minRating?: number;
    hasEmergencyServices?: boolean;
    maxDistance?: number;
  }): Promise<(Contractor & { isBoosted?: boolean })[]> {
    let contractors = Array.from(this.contractors.values());

    if (filters) {
      if (filters.services && filters.services.length > 0) {
        contractors = contractors.filter(contractor =>
          filters.services!.some(service =>
            contractor.services.some(contractorService =>
              contractorService.toLowerCase().includes(service.toLowerCase())
            )
          )
        );
      }

      if (filters.minRating) {
        contractors = contractors.filter(contractor =>
          parseFloat(contractor.rating) >= filters.minRating!
        );
      }

      if (filters.hasEmergencyServices !== undefined) {
        contractors = contractors.filter(contractor =>
          contractor.hasEmergencyServices === filters.hasEmergencyServices
        );
      }

      if (filters.maxDistance) {
        contractors = contractors.filter(contractor =>
          contractor.distance ? parseFloat(contractor.distance) <= filters.maxDistance! : true
        );
      }

      // Only show contractors whose service area overlaps with homeowner's location
      // This means the contractor's service radius must be >= the distance to the homeowner
      contractors = contractors.filter(contractor => {
        if (!contractor.distance) return true; // If no distance data, include contractor
        const distanceToHomeowner = parseFloat(contractor.distance);
        return contractor.serviceRadius >= distanceToHomeowner;
      });
    }

    // Check for active boosts and prioritize boosted contractors
    const contractorsWithBoosts = await Promise.all(
      contractors.map(async (contractor) => {
        let isBoosted = false;
        
        // Check if this contractor has active boosts for any of the filtered services
        if (filters?.services && filters.services.length > 0) {
          for (const service of filters.services) {
            const activeBoosts = await this.getActiveBoosts(service);
            if (activeBoosts.some(boost => boost.contractorId === contractor.id)) {
              isBoosted = true;
              break;
            }
          }
        }
        
        return { ...contractor, isBoosted };
      })
    );

    // Sort contractors: boosted contractors first, then by rating
    contractorsWithBoosts.sort((a, b) => {
      if (a.isBoosted && !b.isBoosted) return -1;
      if (!a.isBoosted && b.isBoosted) return 1;
      
      // If both are boosted or both are not boosted, sort by rating
      return parseFloat(b.rating) - parseFloat(a.rating);
    });

    return contractorsWithBoosts;
  }

  async getContractor(id: string): Promise<Contractor | undefined> {
    return this.contractors.get(id);
  }

  async createContractor(contractor: InsertContractor): Promise<Contractor> {
    const id = randomUUID();
    const newContractor: Contractor = { 
      ...contractor, 
      id,
      distance: contractor.distance || null,
      profileImage: contractor.profileImage || null,
      reviewCount: contractor.reviewCount || 0,
      isLicensed: contractor.isLicensed ?? true,
      hasEmergencyServices: contractor.hasEmergencyServices ?? false,
      serviceRadius: contractor.serviceRadius ?? 25,
      businessLogo: contractor.businessLogo || null,
      projectPhotos: contractor.projectPhotos || [],
      googleBusinessUrl: contractor.googleBusinessUrl || null,
      createdAt: new Date()
    };
    this.contractors.set(id, newContractor);
    return newContractor;
  }

  // Contractor license methods
  async getContractorLicenses(contractorId: string): Promise<ContractorLicense[]> {
    const licenses = Array.from(this.contractorLicenses.values())
      .filter(license => license.contractorId === contractorId && license.isActive);
    return licenses;
  }

  async getContractorLicense(id: string): Promise<ContractorLicense | undefined> {
    return this.contractorLicenses.get(id);
  }

  async createContractorLicense(license: InsertContractorLicense): Promise<ContractorLicense> {
    const id = randomUUID();
    const newLicense: ContractorLicense = {
      ...license,
      id,
      licenseType: license.licenseType ?? 'General Contractor',
      isActive: license.isActive ?? true,
      expiryDate: license.expiryDate ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.contractorLicenses.set(id, newLicense);
    return newLicense;
  }

  async updateContractorLicense(id: string, contractorId: string, licenseData: Partial<InsertContractorLicense>): Promise<ContractorLicense | undefined> {
    const existingLicense = this.contractorLicenses.get(id);
    if (!existingLicense || existingLicense.contractorId !== contractorId) {
      return undefined;
    }

    const updatedLicense: ContractorLicense = {
      ...existingLicense,
      ...licenseData,
      updatedAt: new Date()
    };
    this.contractorLicenses.set(id, updatedLicense);
    return updatedLicense;
  }

  async deleteContractorLicense(id: string, contractorId: string): Promise<boolean> {
    const existingLicense = this.contractorLicenses.get(id);
    if (!existingLicense || existingLicense.contractorId !== contractorId) {
      return false;
    }

    return this.contractorLicenses.delete(id);
  }

  async getProducts(filters?: {
    category?: string;
    featured?: boolean;
    search?: string;
  }): Promise<Product[]> {
    let products = Array.from(this.products.values());

    if (filters) {
      if (filters.category) {
        products = products.filter(product =>
          product.category.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      if (filters.featured !== undefined) {
        products = products.filter(product =>
          product.isFeatured === filters.featured
        );
      }

      if (filters.search) {
        products = products.filter(product =>
          product.name.toLowerCase().includes(filters.search!.toLowerCase()) ||
          product.description.toLowerCase().includes(filters.search!.toLowerCase())
        );
      }
    }

    return products;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const newProduct: Product = { 
      ...product, 
      id,
      reviewCount: product.reviewCount || 0,
      isFeatured: product.isFeatured ?? false,
      inStock: product.inStock ?? true
    };
    this.products.set(id, newProduct);
    return newProduct;
  }



  async getHomeAppliances(homeownerId?: string, houseId?: string): Promise<HomeAppliance[]> {
    const appliances = Array.from(this.homeAppliances.values());
    
    if (homeownerId && houseId) {
      return appliances.filter(appliance => appliance.homeownerId === homeownerId && appliance.houseId === houseId);
    } else if (homeownerId) {
      return appliances.filter(appliance => appliance.homeownerId === homeownerId);
    } else if (houseId) {
      return appliances.filter(appliance => appliance.houseId === houseId);
    }
    
    return appliances;
  }

  async getHomeAppliance(id: string): Promise<HomeAppliance | undefined> {
    return this.homeAppliances.get(id);
  }

  async createHomeAppliance(appliance: InsertHomeAppliance): Promise<HomeAppliance> {
    const id = randomUUID();
    const newAppliance: HomeAppliance = {
      ...appliance,
      id,
      yearInstalled: appliance.yearInstalled ?? null,
      serialNumber: appliance.serialNumber ?? null,
      notes: appliance.notes ?? null,
      location: appliance.location ?? null,
      warrantyExpiration: appliance.warrantyExpiration ?? null,
      lastServiceDate: appliance.lastServiceDate ?? null,
      createdAt: new Date()
    };
    this.homeAppliances.set(id, newAppliance);
    return newAppliance;
  }

  async updateHomeAppliance(id: string, appliance: Partial<InsertHomeAppliance>): Promise<HomeAppliance | undefined> {
    const existing = this.homeAppliances.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: HomeAppliance = {
      ...existing,
      ...appliance
    };
    this.homeAppliances.set(id, updated);
    return updated;
  }

  async deleteHomeAppliance(id: string): Promise<boolean> {
    return this.homeAppliances.delete(id);
  }

  // Appliance manual methods implementation
  async getHomeApplianceManuals(applianceId: string): Promise<HomeApplianceManual[]> {
    const manuals = Array.from(this.homeApplianceManuals.values());
    return manuals.filter(manual => manual.applianceId === applianceId);
  }

  async getHomeApplianceManual(id: string): Promise<HomeApplianceManual | undefined> {
    return this.homeApplianceManuals.get(id);
  }

  async createHomeApplianceManual(manual: InsertHomeApplianceManual): Promise<HomeApplianceManual> {
    const newManual: HomeApplianceManual = {
      id: randomUUID(),
      ...manual,
      createdAt: new Date(),
    };
    this.homeApplianceManuals.set(newManual.id, newManual);
    return newManual;
  }

  async updateHomeApplianceManual(id: string, manual: Partial<InsertHomeApplianceManual>): Promise<HomeApplianceManual | undefined> {
    const existing = this.homeApplianceManuals.get(id);
    if (!existing) return undefined;

    const updated: HomeApplianceManual = {
      ...existing,
      ...manual,
    };
    this.homeApplianceManuals.set(id, updated);
    return updated;
  }

  async deleteHomeApplianceManual(id: string): Promise<boolean> {
    return this.homeApplianceManuals.delete(id);
  }

  // Maintenance log methods
  async getMaintenanceLogs(homeownerId?: string): Promise<MaintenanceLog[]> {
    const logs = Array.from(this.maintenanceLogs.values());
    
    if (homeownerId) {
      return logs.filter(log => log.homeownerId === homeownerId);
    }
    
    return logs.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
  }

  async getMaintenanceLog(id: string): Promise<MaintenanceLog | undefined> {
    return this.maintenanceLogs.get(id);
  }

  async createMaintenanceLog(log: InsertMaintenanceLog): Promise<MaintenanceLog> {
    const id = randomUUID();
    const newLog: MaintenanceLog = {
      ...log,
      id,
      cost: log.cost ?? null,
      contractorName: log.contractorName ?? null,
      contractorCompany: log.contractorCompany ?? null,
      contractorId: log.contractorId ?? null,
      notes: log.notes ?? null,
      warrantyPeriod: log.warrantyPeriod ?? null,
      nextServiceDue: log.nextServiceDue ?? null,
      createdAt: new Date()
    };
    this.maintenanceLogs.set(id, newLog);
    return newLog;
  }

  async updateMaintenanceLog(id: string, log: Partial<InsertMaintenanceLog>): Promise<MaintenanceLog | undefined> {
    const existing = this.maintenanceLogs.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: MaintenanceLog = {
      ...existing,
      ...log
    };
    this.maintenanceLogs.set(id, updated);
    return updated;
  }

  async deleteMaintenanceLog(id: string): Promise<boolean> {
    return this.maintenanceLogs.delete(id);
  }

  // Custom maintenance task methods
  async getCustomMaintenanceTasks(homeownerId?: string, houseId?: string): Promise<CustomMaintenanceTask[]> {
    const tasks = Array.from(this.customMaintenanceTasks.values());
    return tasks.filter(task => {
      if (homeownerId && task.homeownerId !== homeownerId) return false;
      if (houseId && task.houseId !== houseId && task.houseId !== null) return false;
      return true;
    });
  }

  async getCustomMaintenanceTask(id: string): Promise<CustomMaintenanceTask | undefined> {
    return this.customMaintenanceTasks.get(id);
  }

  async createCustomMaintenanceTask(taskData: InsertCustomMaintenanceTask): Promise<CustomMaintenanceTask> {
    const id = randomUUID();
    const now = new Date();
    const task: CustomMaintenanceTask = {
      id,
      ...taskData,
      houseId: taskData.houseId || null,
      priority: taskData.priority || 'medium',
      estimatedTime: taskData.estimatedTime || null,
      difficulty: taskData.difficulty || 'easy',
      tools: taskData.tools || null,
      cost: taskData.cost || null,
      frequencyValue: taskData.frequencyValue || null,
      specificMonths: taskData.specificMonths || null,
      isActive: taskData.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.customMaintenanceTasks.set(id, task);
    return task;
  }

  async updateCustomMaintenanceTask(id: string, taskData: Partial<InsertCustomMaintenanceTask>): Promise<CustomMaintenanceTask | undefined> {
    const existingTask = this.customMaintenanceTasks.get(id);
    if (!existingTask) {
      return undefined;
    }

    const updated: CustomMaintenanceTask = {
      ...existingTask,
      ...taskData,
      updatedAt: new Date(),
    };
    this.customMaintenanceTasks.set(id, updated);
    return updated;
  }

  async deleteCustomMaintenanceTask(id: string): Promise<boolean> {
    return this.customMaintenanceTasks.delete(id);
  }

  // House methods
  async getHouses(homeownerId?: string): Promise<House[]> {
    const houses = Array.from(this.houses.values());
    if (homeownerId) {
      return houses.filter(house => house.homeownerId === homeownerId);
    }
    return houses;
  }

  async getHouse(id: string): Promise<House | undefined> {
    return this.houses.get(id);
  }

  async createHouse(house: InsertHouse): Promise<House> {
    const id = randomUUID();
    const newHouse: House = {
      ...house,
      id,
      isDefault: house.isDefault ?? false,
      createdAt: new Date(),
    };
    this.houses.set(id, newHouse);
    return newHouse;
  }

  async updateHouse(id: string, house: Partial<InsertHouse>): Promise<House | undefined> {
    const existing = this.houses.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: House = {
      ...existing,
      ...house,
    };
    this.houses.set(id, updated);
    return updated;
  }

  async deleteHouse(id: string): Promise<boolean> {
    return this.houses.delete(id);
  }

  async getDefaultHouse(homeownerId: string): Promise<House | undefined> {
    const houses = Array.from(this.houses.values());
    return houses.find(house => house.homeownerId === homeownerId && house.isDefault);
  }

  // Contractor appointment methods
  async getContractorAppointments(homeownerId?: string, houseId?: string): Promise<ContractorAppointment[]> {
    const appointments = Array.from(this.contractorAppointments.values());
    let filtered = appointments;
    
    if (homeownerId) {
      filtered = filtered.filter(appointment => appointment.homeownerId === homeownerId);
    }
    
    if (houseId) {
      filtered = filtered.filter(appointment => appointment.houseId === houseId);
    }
    
    return filtered.sort((a, b) => new Date(a.scheduledDateTime).getTime() - new Date(b.scheduledDateTime).getTime());
  }

  async getContractorAppointment(id: string): Promise<ContractorAppointment | undefined> {
    return this.contractorAppointments.get(id);
  }

  async createContractorAppointment(appointment: InsertContractorAppointment): Promise<ContractorAppointment> {
    const id = randomUUID();
    const newAppointment: ContractorAppointment = {
      ...appointment,
      id,
      contractorId: appointment.contractorId ?? null,
      contractorCompany: appointment.contractorCompany ?? null,
      contractorPhone: appointment.contractorPhone ?? null,
      estimatedDuration: appointment.estimatedDuration ?? null,
      notes: appointment.notes ?? null,
      status: appointment.status ?? "scheduled",
      createdAt: new Date()
    };
    this.contractorAppointments.set(id, newAppointment);
    
    // Create notifications for this appointment
    await this.createAppointmentNotifications(newAppointment);
    
    return newAppointment;
  }

  async updateContractorAppointment(id: string, appointment: Partial<InsertContractorAppointment>): Promise<ContractorAppointment | undefined> {
    const existing = this.contractorAppointments.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: ContractorAppointment = {
      ...existing,
      ...appointment
    };
    this.contractorAppointments.set(id, updated);
    
    // If the scheduled date/time changed, update notifications
    if (appointment.scheduledDateTime && appointment.scheduledDateTime !== existing.scheduledDateTime) {
      await this.updateAppointmentNotifications(updated);
    }
    
    return updated;
  }

  async deleteContractorAppointment(id: string): Promise<boolean> {
    const deleted = this.contractorAppointments.delete(id);
    
    if (deleted) {
      // Delete associated notifications
      const notifications = Array.from(this.notifications.values()).filter(n => n.appointmentId === id);
      notifications.forEach(notification => this.notifications.delete(notification.id));
    }
    
    return deleted;
  }

  // Notification methods
  async getNotifications(homeownerId?: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    
    if (homeownerId) {
      return notifications.filter(notification => notification.homeownerId === homeownerId);
    }
    
    return notifications.sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime());
  }

  async getNotification(id: string): Promise<Notification | undefined> {
    return this.notifications.get(id);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const id = randomUUID();
    const newNotification: Notification = {
      ...notification,
      id,
      houseId: notification.houseId ?? null,
      appointmentId: notification.appointmentId ?? null,
      maintenanceTaskId: notification.maintenanceTaskId ?? null,
      sentAt: notification.sentAt ?? null,
      isRead: notification.isRead ?? false,
      priority: notification.priority ?? "medium",
      actionUrl: notification.actionUrl ?? null,
      createdAt: new Date()
    };
    this.notifications.set(id, newNotification);
    return newNotification;
  }

  async updateNotification(id: string, notification: Partial<InsertNotification>): Promise<Notification | undefined> {
    const existing = this.notifications.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Notification = {
      ...existing,
      ...notification
    };
    this.notifications.set(id, updated);
    return updated;
  }

  async deleteNotification(id: string): Promise<boolean> {
    return this.notifications.delete(id);
  }

  async getUnreadNotifications(homeownerId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    return notifications.filter(notification => 
      notification.homeownerId === homeownerId && !notification.isRead
    ).sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }

  async markNotificationAsRead(id: string): Promise<boolean> {
    const notification = this.notifications.get(id);
    if (!notification) {
      return false;
    }

    const updated: Notification = {
      ...notification,
      isRead: true
    };
    this.notifications.set(id, updated);
    return true;
  }

  // Helper method to create notifications for an appointment
  private async createAppointmentNotifications(appointment: ContractorAppointment): Promise<void> {
    const appointmentDateTime = new Date(appointment.scheduledDateTime);
    const now = new Date();
    
    // Create 24-hour notification
    const twentyFourHourNotification = new Date(appointmentDateTime.getTime() - 24 * 60 * 60 * 1000);
    if (twentyFourHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        maintenanceTaskId: null,
        type: "24_hour",
        category: "appointment",
        title: "Contractor Visit Tomorrow",
        message: `${appointment.contractorName} is scheduled to visit tomorrow at ${appointmentDateTime.toLocaleTimeString()} for ${appointment.serviceDescription}.`,
        scheduledFor: twentyFourHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
        priority: "medium",
        actionUrl: null,
      });
    }
    
    // Create 4-hour notification
    const fourHourNotification = new Date(appointmentDateTime.getTime() - 4 * 60 * 60 * 1000);
    if (fourHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        maintenanceTaskId: null,
        type: "4_hour",
        category: "appointment",
        title: "Contractor Visit in 4 Hours",
        message: `${appointment.contractorName} will arrive in 4 hours at ${appointmentDateTime.toLocaleTimeString()} for ${appointment.serviceDescription}.`,
        scheduledFor: fourHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
        priority: "high",
        actionUrl: null,
      });
    }
    
    // Create 1-hour notification
    const oneHourNotification = new Date(appointmentDateTime.getTime() - 60 * 60 * 1000);
    if (oneHourNotification > now) {
      await this.createNotification({
        homeownerId: appointment.homeownerId,
        appointmentId: appointment.id,
        maintenanceTaskId: null,
        type: "1_hour",
        category: "appointment",
        title: "Contractor Arriving Soon",
        message: `${appointment.contractorName} will arrive in 1 hour at ${appointmentDateTime.toLocaleTimeString()}. Please ensure someone is home to let them in.`,
        scheduledFor: oneHourNotification.toISOString(),
        isRead: false,
        sentAt: null,
        priority: "high",
        actionUrl: null,
      });
    }
  }

  // New method to create maintenance task notifications
  async createMaintenanceNotifications(homeownerId: string, tasks: any[]): Promise<void> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    
    // Get tasks for current month that haven't been completed
    const pendingTasks = tasks.filter(task => task.month === currentMonth);
    
    for (const task of pendingTasks) {
      // Check if notification already exists for this task
      const existingNotifications = Array.from(this.notifications.values()).filter(n => 
        n.homeownerId === homeownerId && 
        n.maintenanceTaskId === task.id &&
        !n.isRead
      );
      
      if (existingNotifications.length === 0) {
        // Create notification based on task priority
        const priority = task.priority === 'high' ? 'high' : task.priority === 'low' ? 'low' : 'medium';
        const daysUntilEndOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate() - now.getDate();
        
        let notificationType = "maintenance_due";
        let title = "Maintenance Task Due";
        let message = `${task.title} is due this month. Estimated time: ${task.estimatedTime}.`;
        
        // Make it overdue if we're in the last week of the month
        if (daysUntilEndOfMonth <= 7) {
          notificationType = "maintenance_overdue";
          title = "Maintenance Task Overdue";
          message = `${task.title} is overdue! Only ${daysUntilEndOfMonth} days left this month. Estimated time: ${task.estimatedTime}.`;
        }
        
        await this.createNotification({
          homeownerId,
          appointmentId: null,
          maintenanceTaskId: task.id,
          type: notificationType,
          category: "maintenance",
          title,
          message,
          scheduledFor: now.toISOString(),
          isRead: false,
          sentAt: null,
          priority,
          actionUrl: "/maintenance",
        });
      }
    }
  }

  // Method to get pending maintenance notifications
  async getMaintenanceNotifications(homeownerId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    return notifications.filter(notification => 
      notification.homeownerId === homeownerId && 
      notification.category === "maintenance" &&
      !notification.isRead
    );
  }

  // Helper method to update notifications when appointment time changes
  private async updateAppointmentNotifications(appointment: ContractorAppointment): Promise<void> {
    // Delete existing notifications for this appointment
    const existingNotifications = Array.from(this.notifications.values()).filter(n => n.appointmentId === appointment.id);
    existingNotifications.forEach(notification => this.notifications.delete(notification.id));
    
    // Create new notifications with updated times
    await this.createAppointmentNotifications(appointment);
  }

  // Search methods
  async searchContractors(query: string, location?: string): Promise<Contractor[]> {
    const contractors = Array.from(this.contractors.values());
    
    return contractors.filter(contractor => {
      const matchesQuery = query === "" || 
        contractor.name.toLowerCase().includes(query.toLowerCase()) ||
        contractor.company.toLowerCase().includes(query.toLowerCase()) ||
        contractor.bio.toLowerCase().includes(query.toLowerCase()) ||
        contractor.services.some(service => service.toLowerCase().includes(query.toLowerCase()));
      
      const matchesLocation = !location || 
        contractor.location.toLowerCase().includes(location.toLowerCase());
      
      // Only show contractors whose service area overlaps with homeowner's location
      // This means the contractor's service radius must be >= the distance to the homeowner
      const withinServiceArea = !contractor.distance || contractor.serviceRadius >= parseFloat(contractor.distance);
      
      return matchesQuery && matchesLocation && withinServiceArea;
    });
  }

  async searchProducts(query: string): Promise<Product[]> {
    const products = Array.from(this.products.values());
    
    return products.filter(product =>
      query === "" ||
      product.name.toLowerCase().includes(query.toLowerCase()) ||
      product.description.toLowerCase().includes(query.toLowerCase()) ||
      product.category.toLowerCase().includes(query.toLowerCase())
    );
  }

  // Contractor profile methods
  async getContractorProfile(contractorId: string): Promise<Contractor | undefined> {
    return this.contractors.get(contractorId);
  }

  async updateContractorProfile(contractorId: string, profileData: Partial<InsertContractor>): Promise<Contractor> {
    const existingContractor = this.contractors.get(contractorId);
    
    if (!existingContractor) {
      // Create new contractor profile if it doesn't exist (upsert pattern)
      const newContractor: Contractor = {
        id: contractorId,
        businessName: profileData.businessName || '',
        contactName: profileData.contactName || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address || '',
        city: profileData.city || '',
        state: profileData.state || '',
        zipCode: profileData.zipCode || '',
        serviceRadius: profileData.serviceRadius || 25,
        servicesOffered: profileData.servicesOffered || [],
        hasEmergencyServices: profileData.hasEmergencyServices || false,
        website: profileData.website || '',
        facebook: profileData.facebook || '',
        instagram: profileData.instagram || '',
        linkedin: profileData.linkedin || '',
        googleBusinessUrl: profileData.googleBusinessUrl || '',
        bio: profileData.bio || '',
        yearsExperience: profileData.yearsExperience || '',
        profileImage: profileData.profileImage || '',
        businessLogo: profileData.businessLogo || '',
        projectPhotos: profileData.projectPhotos || [],
      };
      
      this.contractors.set(contractorId, newContractor);
      return newContractor;
    }

    const updatedContractor: Contractor = {
      ...existingContractor,
      ...profileData,
      businessLogo: profileData.businessLogo ?? existingContractor.businessLogo,
      projectPhotos: profileData.projectPhotos ?? existingContractor.projectPhotos,
    };

    this.contractors.set(contractorId, updatedContractor);
    return updatedContractor;
  }

  // Service record operations
  async getServiceRecords(contractorId?: string, homeownerId?: string): Promise<ServiceRecord[]> {
    let filtered = this.serviceRecords;
    
    if (contractorId) {
      filtered = filtered.filter(record => record.contractorId === contractorId);
    }
    
    if (homeownerId) {
      filtered = filtered.filter(record => record.homeownerId === homeownerId && record.isVisibleToHomeowner);
    }
    
    return filtered;
  }

  async getHomeownerServiceRecords(homeownerId: string): Promise<ServiceRecord[]> {
    return this.serviceRecords.filter(record => 
      record.homeownerId === homeownerId && record.isVisibleToHomeowner !== false
    );
  }

  async getServiceRecord(id: string): Promise<ServiceRecord | undefined> {
    return this.serviceRecords.find(record => record.id === id);
  }

  async createServiceRecord(serviceRecord: InsertServiceRecord): Promise<ServiceRecord> {
    const newRecord: ServiceRecord = {
      ...serviceRecord,
      id: randomUUID(),
      homeownerId: serviceRecord.homeownerId ?? null,
      customerPhone: serviceRecord.customerPhone ?? null,
      customerEmail: serviceRecord.customerEmail ?? null,
      cost: serviceRecord.cost ?? "0",
      status: serviceRecord.status ?? "completed",
      notes: serviceRecord.notes ?? null,
      materialsUsed: serviceRecord.materialsUsed ?? [],
      duration: serviceRecord.duration ?? null,
      warrantyPeriod: serviceRecord.warrantyPeriod ?? null,
      followUpDate: serviceRecord.followUpDate ?? null,
      isVisibleToHomeowner: serviceRecord.isVisibleToHomeowner ?? true,
      createdAt: new Date(),
    };
    this.serviceRecords.push(newRecord);
    return newRecord;
  }

  async updateServiceRecord(id: string, serviceRecord: Partial<InsertServiceRecord>): Promise<ServiceRecord | undefined> {
    const index = this.serviceRecords.findIndex(record => record.id === id);
    if (index !== -1) {
      this.serviceRecords[index] = { ...this.serviceRecords[index], ...serviceRecord };
      return this.serviceRecords[index];
    }
    return undefined;
  }

  async deleteServiceRecord(id: string): Promise<boolean> {
    const index = this.serviceRecords.findIndex(record => record.id === id);
    if (index !== -1) {
      this.serviceRecords.splice(index, 1);
      return true;
    }
    return false;
  }

  async getCustomerServiceRecords(customerId?: string, customerEmail?: string, customerAddress?: string): Promise<ServiceRecord[]> {
    // For demo purposes, return all service records with contractor details
    // In a real app, you'd filter by customer info from the authenticated user
    return this.serviceRecords.map(record => ({
      ...record,
      contractorName: "Mike Johnson", // Add contractor name from contractors table
      contractorCompany: "Johnson Home Services"
    } as any));
  }

  // Messaging operations
  async getConversations(userId: string, userType: 'homeowner' | 'contractor'): Promise<(Conversation & { otherPartyName: string; unreadCount: number })[]> {
    const conversations = Array.from(this.conversations.values());
    const userConversations = conversations.filter(conv => 
      userType === 'homeowner' ? conv.homeownerId === userId : conv.contractorId === userId
    );

    // Get conversation details with other party name and unread count
    const enrichedConversations = await Promise.all(
      userConversations.map(async (conv) => {
        // Get other party info
        let otherPartyName = "Unknown";
        if (userType === 'homeowner') {
          const contractor = this.contractors.get(conv.contractorId);
          otherPartyName = contractor?.name || "Contractor";
        } else {
          const homeowner = this.users.get(conv.homeownerId);
          otherPartyName = homeowner?.firstName || homeowner?.email || "Homeowner";
        }

        // Count unread messages
        const messages = Array.from(this.messages.values()).filter(m => m.conversationId === conv.id);
        const unreadCount = messages.filter(m => !m.isRead && m.senderId !== userId).length;

        return {
          ...conv,
          otherPartyName,
          unreadCount
        };
      })
    );

    return enrichedConversations.sort((a, b) => 
      new Date(b.lastMessageAt || b.createdAt || new Date()).getTime() - 
      new Date(a.lastMessageAt || a.createdAt || new Date()).getTime()
    );
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const newConversation: Conversation = {
      ...conversation,
      id,
      status: conversation.status ?? "active",
      lastMessageAt: new Date(),
      createdAt: new Date()
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    const messages = Array.from(this.messages.values());
    return messages
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => new Date(a.createdAt || new Date()).getTime() - new Date(b.createdAt || new Date()).getTime());
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const newMessage: Message = {
      ...message,
      id,
      isRead: message.isRead ?? false,
      readAt: null,
      createdAt: new Date()
    };
    this.messages.set(id, newMessage);

    // Update conversation's lastMessageAt
    const conversation = this.conversations.get(message.conversationId);
    if (conversation) {
      conversation.lastMessageAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }

    return newMessage;
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    const messages = Array.from(this.messages.values()).filter(m => 
      m.conversationId === conversationId && m.senderId !== userId && !m.isRead
    );

    messages.forEach(message => {
      message.isRead = true;
      message.readAt = new Date();
      this.messages.set(message.id, message);
    });
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const messages = Array.from(this.messages.values());
    return messages.filter(m => m.senderId !== userId && !m.isRead).length;
  }

  // Review methods
  async getContractorReviews(contractorId: string): Promise<ContractorReview[]> {
    const reviews = Array.from(this.contractorReviews.values());
    return reviews
      .filter(review => review.contractorId === contractorId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getReviewsByHomeowner(homeownerId: string): Promise<ContractorReview[]> {
    const reviews = Array.from(this.contractorReviews.values());
    return reviews
      .filter(review => review.homeownerId === homeownerId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async createContractorReview(reviewData: InsertContractorReview): Promise<ContractorReview> {
    const id = randomUUID();
    const review: ContractorReview = {
      ...reviewData,
      id,
      comment: reviewData.comment || null,
      serviceDate: reviewData.serviceDate || null,
      serviceType: reviewData.serviceType || null,
      wouldRecommend: reviewData.wouldRecommend ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contractorReviews.set(id, review);
    
    // Update contractor's average rating
    await this.updateContractorRating(reviewData.contractorId);
    
    return review;
  }

  async updateContractorReview(id: string, reviewData: Partial<InsertContractorReview>): Promise<ContractorReview | undefined> {
    const existing = this.contractorReviews.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: ContractorReview = {
      ...existing,
      ...reviewData,
      updatedAt: new Date(),
    };
    this.contractorReviews.set(id, updated);
    
    // Update contractor's average rating
    await this.updateContractorRating(existing.contractorId);
    
    return updated;
  }

  async deleteContractorReview(id: string): Promise<boolean> {
    const review = this.contractorReviews.get(id);
    if (!review) {
      return false;
    }
    
    const deleted = this.contractorReviews.delete(id);
    if (deleted) {
      // Update contractor's average rating
      await this.updateContractorRating(review.contractorId);
    }
    
    return deleted;
  }

  async getContractorAverageRating(contractorId: string): Promise<{ averageRating: number; totalReviews: number }> {
    const reviews = await this.getContractorReviews(contractorId);
    const totalReviews = reviews.length;
    
    if (totalReviews === 0) {
      return { averageRating: 0, totalReviews: 0 };
    }
    
    const sum = reviews.reduce((total, review) => total + review.rating, 0);
    const averageRating = Math.round((sum / totalReviews) * 10) / 10; // Round to 1 decimal place
    
    return { averageRating, totalReviews };
  }

  // Helper method to update contractor's rating in the contractors table
  private async updateContractorRating(contractorId: string): Promise<void> {
    const contractor = this.contractors.get(contractorId);
    if (!contractor) {
      return;
    }
    
    const { averageRating, totalReviews } = await this.getContractorAverageRating(contractorId);
    
    const updatedContractor: Contractor = {
      ...contractor,
      rating: averageRating.toString(),
      reviewCount: totalReviews,
    };
    
    this.contractors.set(contractorId, updatedContractor);
  }

  // Proposal methods
  async getProposals(contractorId?: string, homeownerId?: string): Promise<Proposal[]> {
    let proposals = Array.from(this.proposals.values());
    
    if (contractorId) {
      proposals = proposals.filter(proposal => proposal.contractorId === contractorId);
    }
    
    if (homeownerId) {
      proposals = proposals.filter(proposal => proposal.homeownerId === homeownerId);
    }
    
    return proposals.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    return this.proposals.get(id);
  }

  async createProposal(proposalData: InsertProposal): Promise<Proposal> {
    const id = randomUUID();
    const proposal: Proposal = {
      ...proposalData,
      id,
      materials: proposalData.materials || [],
      warrantyPeriod: proposalData.warrantyPeriod || null,
      customerNotes: proposalData.customerNotes || null,
      internalNotes: proposalData.internalNotes || null,
      homeownerId: proposalData.homeownerId || null,
      status: proposalData.status || 'draft',
      attachments: proposalData.attachments || null,
      contractFilePath: proposalData.contractFilePath || null,
      contractSignedAt: proposalData.contractSignedAt || null,
      customerSignature: proposalData.customerSignature || null,
      contractorSignature: proposalData.contractorSignature || null,
      signatureIpAddress: proposalData.signatureIpAddress || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.proposals.set(id, proposal);
    return proposal;
  }

  async updateProposal(id: string, proposalData: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const existing = this.proposals.get(id);
    if (!existing) {
      return undefined;
    }

    const updated: Proposal = {
      ...existing,
      ...proposalData,
      updatedAt: new Date(),
    };
    this.proposals.set(id, updated);
    return updated;
  }

  async deleteProposal(id: string): Promise<boolean> {
    return this.proposals.delete(id);
  }

  // Check if homeowner has accepted proposals with contractor
  async hasAcceptedProposalWithContractor(homeownerId: string, contractorId: string): Promise<boolean> {
    const proposals = Array.from(this.proposals.values());
    return proposals.some(proposal => 
      proposal.homeownerId === homeownerId && 
      proposal.contractorId === contractorId && 
      proposal.status === 'accepted'
    );
  }

  private seedServiceRecords() {
    // No sample service records - contractors will create their own
    this.serviceRecords = [];
  }

  private seedReviews() {
    // No sample reviews - homeowners will create their own reviews
  }

  // Home System operations
  async getHomeSystems(homeownerId?: string, houseId?: string): Promise<HomeSystem[]> {
    const allSystems = Array.from(this.homeSystems.values());
    let filtered = allSystems;

    if (homeownerId) {
      filtered = filtered.filter(system => system.homeownerId === homeownerId);
    }

    if (houseId) {
      filtered = filtered.filter(system => system.houseId === houseId);
    }

    return filtered;
  }

  async getHomeSystem(id: string): Promise<HomeSystem | undefined> {
    return this.homeSystems.get(id);
  }

  async createHomeSystem(systemData: InsertHomeSystem): Promise<HomeSystem> {
    const id = randomUUID();
    const system: HomeSystem = {
      ...systemData,
      id,
      brand: systemData.brand ?? null,
      model: systemData.model ?? null,
      notes: systemData.notes ?? null,
      installationYear: systemData.installationYear ?? null,
      lastServiceYear: systemData.lastServiceYear ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.homeSystems.set(id, system);
    return system;
  }

  async updateHomeSystem(id: string, systemData: Partial<InsertHomeSystem>): Promise<HomeSystem | undefined> {
    const existing = this.homeSystems.get(id);
    if (!existing) return undefined;

    const updated: HomeSystem = {
      ...existing,
      ...systemData,
      updatedAt: new Date(),
    };
    this.homeSystems.set(id, updated);
    return updated;
  }

  async deleteHomeSystem(id: string): Promise<boolean> {
    return this.homeSystems.delete(id);
  }

  // Push subscription methods
  async getPushSubscriptions(userId?: string): Promise<PushSubscription[]> {
    const subscriptions = Array.from(this.pushSubscriptions.values());
    if (userId) {
      return subscriptions.filter(sub => sub.userId === userId && sub.isActive);
    }
    return subscriptions.filter(sub => sub.isActive);
  }

  async getPushSubscription(id: string): Promise<PushSubscription | undefined> {
    return this.pushSubscriptions.get(id);
  }

  async createPushSubscription(subscriptionData: InsertPushSubscription): Promise<PushSubscription> {
    const id = randomUUID();
    const now = new Date();
    const subscription: PushSubscription = {
      id,
      ...subscriptionData,
      userAgent: subscriptionData.userAgent || null,
      isActive: subscriptionData.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.pushSubscriptions.set(id, subscription);
    return subscription;
  }

  async updatePushSubscription(id: string, subscriptionData: Partial<InsertPushSubscription>): Promise<PushSubscription | undefined> {
    const existingSubscription = this.pushSubscriptions.get(id);
    if (!existingSubscription) {
      return undefined;
    }

    const updated: PushSubscription = {
      ...existingSubscription,
      ...subscriptionData,
      updatedAt: new Date(),
    };
    this.pushSubscriptions.set(id, updated);
    return updated;
  }

  async deletePushSubscription(id: string): Promise<boolean> {
    return this.pushSubscriptions.delete(id);
  }

  async deletePushSubscriptionByEndpoint(endpoint: string): Promise<boolean> {
    const subscriptions = Array.from(this.pushSubscriptions.entries());
    const subscription = subscriptions.find(([_, sub]) => sub.endpoint === endpoint);
    
    if (subscription) {
      return this.pushSubscriptions.delete(subscription[0]);
    }
    return false;
  }

  // AI Maintenance helper methods
  async getHousesByHomeowner(homeownerId: string): Promise<House[]> {
    return Array.from(this.houses.values()).filter(house => house.homeownerId === homeownerId);
  }

  async getHomeSystemsByHomeowner(homeownerId: string): Promise<HomeSystem[]> {
    return Array.from(this.homeSystems.values()).filter(system => system.homeownerId === homeownerId);
  }

  async getMaintenanceLogsByHomeowner(homeownerId: string): Promise<MaintenanceLog[]> {
    return Array.from(this.maintenanceLogs.values()).filter(log => log.homeownerId === homeownerId);
  }

  // Contractor boost operations
  async getActiveBoosts(serviceCategory?: string, latitude?: number, longitude?: number): Promise<ContractorBoost[]> {
    const now = new Date();
    return Array.from(this.contractorBoosts.values()).filter(boost => {
      // Only return active boosts that haven't expired
      if (boost.status !== 'active' || !boost.isActive || new Date(boost.endDate) < now) {
        return false;
      }

      // If filtering by service category
      if (serviceCategory && boost.serviceCategory !== serviceCategory) {
        return false;
      }

      // If filtering by location (within radius)
      if (latitude !== undefined && longitude !== undefined) {
        const distance = this.calculateDistance(
          latitude, longitude,
          parseFloat(boost.businessLatitude), parseFloat(boost.businessLongitude)
        );
        if (distance > boost.boostRadius) {
          return false;
        }
      }

      return true;
    });
  }

  async getContractorBoosts(contractorId: string): Promise<ContractorBoost[]> {
    return Array.from(this.contractorBoosts.values()).filter(boost => boost.contractorId === contractorId);
  }

  async createContractorBoost(boostData: InsertContractorBoost): Promise<ContractorBoost> {
    const boost: ContractorBoost = {
      id: randomUUID(),
      ...boostData,
      isActive: boostData.isActive ?? true,
      status: boostData.status || 'active',
      boostRadius: boostData.boostRadius ?? 10,
      stripePaymentIntentId: boostData.stripePaymentIntentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.contractorBoosts.set(boost.id, boost);
    return boost;
  }

  async updateContractorBoost(id: string, boostData: Partial<InsertContractorBoost>): Promise<ContractorBoost | undefined> {
    const existingBoost = this.contractorBoosts.get(id);
    if (!existingBoost) {
      return undefined;
    }

    const updated: ContractorBoost = {
      ...existingBoost,
      ...boostData,
      updatedAt: new Date(),
    };
    this.contractorBoosts.set(id, updated);
    return updated;
  }

  async deleteContractorBoost(id: string): Promise<boolean> {
    return this.contractorBoosts.delete(id);
  }

  async checkBoostConflict(serviceCategory: string, latitude: number, longitude: number, radius: number): Promise<ContractorBoost | null> {
    const activeBoosts = await this.getActiveBoosts(serviceCategory);
    
    for (const boost of activeBoosts) {
      const distance = this.calculateDistance(
        latitude, longitude,
        parseFloat(boost.businessLatitude), parseFloat(boost.businessLongitude)
      );
      
      // Check if the areas overlap (sum of radii > distance between centers)
      if ((radius + boost.boostRadius) > distance) {
        return boost;
      }
    }
    
    return null;
  }

  // Helper method to calculate distance between two points using Haversine formula
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // House transfer operations
  async createHouseTransfer(transferData: InsertHouseTransfer): Promise<HouseTransfer> {
    const transfer: HouseTransfer = {
      id: randomUUID(),
      ...transferData,
      status: transferData.status || 'pending',
      maintenanceLogsTransferred: 0,
      appliancesTransferred: 0,
      appointmentsTransferred: 0,
      customTasksTransferred: 0,
      homeSystemsTransferred: 0,
      createdAt: new Date(),
      completedAt: null,
    };
    this.houseTransfers.set(transfer.id, transfer);
    return transfer;
  }

  async getHouseTransfer(id: string): Promise<HouseTransfer | undefined> {
    return this.houseTransfers.get(id);
  }

  async getHouseTransferByToken(token: string): Promise<HouseTransfer | undefined> {
    for (const transfer of this.houseTransfers.values()) {
      if (transfer.token === token) {
        return transfer;
      }
    }
    return undefined;
  }

  async getHouseTransfersForUser(homeownerId: string): Promise<HouseTransfer[]> {
    return Array.from(this.houseTransfers.values()).filter(
      transfer => transfer.fromHomeownerId === homeownerId || transfer.toHomeownerId === homeownerId
    );
  }

  async updateHouseTransfer(id: string, updateData: Partial<HouseTransfer>): Promise<HouseTransfer | undefined> {
    const existingTransfer = this.houseTransfers.get(id);
    if (!existingTransfer) {
      return undefined;
    }

    const updated: HouseTransfer = {
      ...existingTransfer,
      ...updateData,
    };
    this.houseTransfers.set(id, updated);
    return updated;
  }

  async transferHouseOwnership(houseId: string, fromHomeownerId: string, toHomeownerId: string): Promise<{
    maintenanceLogsTransferred: number;
    appliancesTransferred: number;
    appointmentsTransferred: number;
    customTasksTransferred: number;
    homeSystemsTransferred: number;
  }> {
    // First, transfer the house ownership
    const house = this.houses.get(houseId);
    if (!house || house.homeownerId !== fromHomeownerId) {
      throw new Error("House not found or ownership mismatch");
    }

    // Update house ownership
    const updatedHouse: House = {
      ...house,
      homeownerId: toHomeownerId,
    };
    this.houses.set(houseId, updatedHouse);

    // Transfer all related data
    let maintenanceLogsTransferred = 0;
    let appliancesTransferred = 0;
    let appointmentsTransferred = 0;
    let customTasksTransferred = 0;
    let homeSystemsTransferred = 0;

    // Transfer maintenance logs
    for (const [id, log] of this.maintenanceLogs.entries()) {
      if (log.houseId === houseId && log.homeownerId === fromHomeownerId) {
        const updated: MaintenanceLog = {
          ...log,
          homeownerId: toHomeownerId,
        };
        this.maintenanceLogs.set(id, updated);
        maintenanceLogsTransferred++;
      }
    }

    // Transfer home appliances
    for (const [id, appliance] of this.homeAppliances.entries()) {
      if (appliance.houseId === houseId && appliance.homeownerId === fromHomeownerId) {
        const updated: HomeAppliance = {
          ...appliance,
          homeownerId: toHomeownerId,
        };
        this.homeAppliances.set(id, updated);
        appliancesTransferred++;
      }
    }

    // Transfer contractor appointments
    for (const [id, appointment] of this.contractorAppointments.entries()) {
      if (appointment.houseId === houseId && appointment.homeownerId === fromHomeownerId) {
        const updated: ContractorAppointment = {
          ...appointment,
          homeownerId: toHomeownerId,
        };
        this.contractorAppointments.set(id, updated);
        appointmentsTransferred++;
      }
    }

    // Transfer custom maintenance tasks (only those with matching houseId)
    for (const [id, task] of this.customMaintenanceTasks.entries()) {
      if (task.houseId === houseId && task.homeownerId === fromHomeownerId) {
        const updated: CustomMaintenanceTask = {
          ...task,
          homeownerId: toHomeownerId,
        };
        this.customMaintenanceTasks.set(id, updated);
        customTasksTransferred++;
      }
    }

    // Transfer home systems
    for (const [id, system] of this.homeSystems.entries()) {
      if (system.houseId === houseId && system.homeownerId === fromHomeownerId) {
        const updated: HomeSystem = {
          ...system,
          homeownerId: toHomeownerId,
        };
        this.homeSystems.set(id, updated);
        homeSystemsTransferred++;
      }
    }

    return {
      maintenanceLogsTransferred,
      appliancesTransferred,
      appointmentsTransferred,
      customTasksTransferred,
      homeSystemsTransferred,
    };
  }

  async getHousesCount(homeownerId: string): Promise<number> {
    return Array.from(this.houses.values()).filter(house => house.homeownerId === homeownerId).length;
  }

  // Contractor analytics operations
  async trackContractorClick(analyticsData: InsertContractorAnalytics): Promise<ContractorAnalytics> {
    const analytics: ContractorAnalytics = {
      id: randomUUID(),
      contractorId: analyticsData.contractorId,
      sessionId: analyticsData.sessionId,
      homeownerId: analyticsData.homeownerId || null,
      clickType: analyticsData.clickType,
      ipAddress: analyticsData.ipAddress || null,
      userAgent: analyticsData.userAgent || null,
      referrerUrl: analyticsData.referrerUrl || null,
      clickedAt: new Date()
    };
    this.contractorAnalytics.set(analytics.id, analytics);
    return analytics;
  }

  async getContractorAnalytics(contractorId: string, startDate?: Date, endDate?: Date): Promise<ContractorAnalytics[]> {
    let analytics = Array.from(this.contractorAnalytics.values())
      .filter(a => a.contractorId === contractorId);

    if (startDate) {
      analytics = analytics.filter(a => a.clickedAt && a.clickedAt >= startDate);
    }
    if (endDate) {
      analytics = analytics.filter(a => a.clickedAt && a.clickedAt <= endDate);
    }

    return analytics.sort((a, b) => {
      const aTime = a.clickedAt ? a.clickedAt.getTime() : 0;
      const bTime = b.clickedAt ? b.clickedAt.getTime() : 0;
      return bTime - aTime;
    });
  }

  async getContractorMonthlyStats(contractorId: string, year: number, month: number): Promise<{
    totalViews: number;
    uniqueVisitors: number;
    websiteClicks: number;
    socialMediaClicks: number;
    phoneClicks: number;
    emailClicks: number;
    topReferrers: { referrer: string; count: number }[];
    dailyBreakdown: { day: number; views: number; uniqueVisitors: number }[];
  }> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    
    const analytics = await this.getContractorAnalytics(contractorId, startDate, endDate);

    // Calculate metrics
    const totalViews = analytics.filter(a => a.clickType === 'profile_view').length;
    const uniqueVisitors = new Set(analytics.map(a => a.sessionId)).size;
    const websiteClicks = analytics.filter(a => a.clickType === 'website').length;
    const socialMediaClicks = analytics.filter(a => 
      ['facebook', 'instagram', 'linkedin'].includes(a.clickType)
    ).length;
    const phoneClicks = analytics.filter(a => a.clickType === 'phone').length;
    const emailClicks = analytics.filter(a => a.clickType === 'email').length;

    // Top referrers
    const referrerCounts = new Map<string, number>();
    analytics.forEach(a => {
      if (a.referrerUrl) {
        const referrer = a.referrerUrl;
        referrerCounts.set(referrer, (referrerCounts.get(referrer) || 0) + 1);
      }
    });
    const topReferrers = Array.from(referrerCounts.entries())
      .map(([referrer, count]) => ({ referrer, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Daily breakdown
    const dailyData = new Map<number, { views: number; uniqueVisitors: Set<string> }>();
    analytics.forEach(a => {
      if (!a.clickedAt) return;
      const day = a.clickedAt.getDate();
      if (!dailyData.has(day)) {
        dailyData.set(day, { views: 0, uniqueVisitors: new Set() });
      }
      const dayData = dailyData.get(day)!;
      if (a.clickType === 'profile_view') {
        dayData.views++;
      }
      dayData.uniqueVisitors.add(a.sessionId);
    });

    const dailyBreakdown = Array.from(dailyData.entries())
      .map(([day, data]) => ({
        day,
        views: data.views,
        uniqueVisitors: data.uniqueVisitors.size
      }))
      .sort((a, b) => a.day - b.day);

    return {
      totalViews,
      uniqueVisitors,
      websiteClicks,
      socialMediaClicks,
      phoneClicks,
      emailClicks,
      topReferrers,
      dailyBreakdown
    };
  }

  // Task override operations for customizing default regional tasks
  async getTaskOverrides(homeownerId: string, houseId: string): Promise<TaskOverride[]> {
    const overrides: TaskOverride[] = [];
    for (const override of this.taskOverrides.values()) {
      if (override.homeownerId === homeownerId && override.houseId === houseId) {
        overrides.push(override);
      }
    }
    return overrides;
  }

  async getTaskOverride(homeownerId: string, houseId: string, taskId: string): Promise<TaskOverride | undefined> {
    for (const override of this.taskOverrides.values()) {
      if (override.homeownerId === homeownerId && override.houseId === houseId && override.taskId === taskId) {
        return override;
      }
    }
    return undefined;
  }

  async upsertTaskOverride(overrideData: InsertTaskOverride): Promise<TaskOverride> {
    // Look for existing override
    const existingOverride = await this.getTaskOverride(overrideData.homeownerId, overrideData.houseId, overrideData.taskId);
    
    const override: TaskOverride = {
      id: existingOverride?.id || randomUUID(),
      homeownerId: overrideData.homeownerId,
      houseId: overrideData.houseId,
      taskId: overrideData.taskId,
      isEnabled: overrideData.isEnabled ?? true,
      frequencyType: overrideData.frequencyType || null,
      frequencyValue: overrideData.frequencyValue || null,
      specificMonths: overrideData.specificMonths || null,
      notes: overrideData.notes || null,
      createdAt: existingOverride?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    this.taskOverrides.set(override.id, override);
    return override;
  }

  async deleteTaskOverride(homeownerId: string, houseId: string, taskId: string): Promise<boolean> {
    const existing = await this.getTaskOverride(homeownerId, houseId, taskId);
    if (!existing) {
      return false;
    }
    return this.taskOverrides.delete(existing.id);
  }

  // Regional data operations for international expansion
  async getCountries(): Promise<Country[]> {
    try {
      const result = await db.select().from(countries);
      return result;
    } catch (error) {
      console.error("Error fetching countries from database:", error);
      // Fallback to in-memory storage if database fails
      return Array.from(this.countries.values());
    }
  }

  async getCountry(id: string): Promise<Country | undefined> {
    return this.countries.get(id);
  }

  async getCountryByCode(code: string): Promise<Country | undefined> {
    for (const country of this.countries.values()) {
      if (country.code === code) {
        return country;
      }
    }
    return undefined;
  }

  async createCountry(countryData: InsertCountry): Promise<Country> {
    const country: Country = {
      id: randomUUID(),
      code: countryData.code,
      name: countryData.name,
      isActive: countryData.isActive ?? true,
      defaultCurrency: countryData.defaultCurrency,
      createdAt: new Date(),
    };
    this.countries.set(country.id, country);
    return country;
  }

  async updateCountry(id: string, countryData: Partial<InsertCountry>): Promise<Country | undefined> {
    const existing = this.countries.get(id);
    if (!existing) {
      return undefined;
    }
    const updated = { ...existing, ...countryData };
    this.countries.set(id, updated);
    return updated;
  }

  async getRegionsByCountry(countryId: string): Promise<Region[]> {
    const regions: Region[] = [];
    for (const region of this.regions.values()) {
      if (region.countryId === countryId) {
        regions.push(region);
      }
    }
    return regions;
  }

  async getRegion(id: string): Promise<Region | undefined> {
    return this.regions.get(id);
  }

  async createRegion(regionData: InsertRegion): Promise<Region> {
    const region: Region = {
      id: randomUUID(),
      countryId: regionData.countryId,
      code: regionData.code,
      name: regionData.name,
      type: regionData.type,
      isActive: regionData.isActive ?? true,
      createdAt: new Date(),
    };
    this.regions.set(region.id, region);
    return region;
  }

  async updateRegion(id: string, regionData: Partial<InsertRegion>): Promise<Region | undefined> {
    const existing = this.regions.get(id);
    if (!existing) {
      return undefined;
    }
    const updated = { ...existing, ...regionData };
    this.regions.set(id, updated);
    return updated;
  }

  async getClimateZonesByCountry(countryId: string): Promise<ClimateZone[]> {
    const zones: ClimateZone[] = [];
    for (const zone of this.climateZones.values()) {
      if (zone.countryId === countryId) {
        zones.push(zone);
      }
    }
    return zones;
  }

  async getClimateZone(id: string): Promise<ClimateZone | undefined> {
    return this.climateZones.get(id);
  }

  async createClimateZone(zoneData: InsertClimateZone): Promise<ClimateZone> {
    const zone: ClimateZone = {
      id: randomUUID(),
      countryId: zoneData.countryId,
      code: zoneData.code,
      name: zoneData.name,
      description: zoneData.description || null,
      isActive: zoneData.isActive ?? true,
      createdAt: new Date(),
    };
    this.climateZones.set(zone.id, zone);
    return zone;
  }

  async updateClimateZone(id: string, zoneData: Partial<InsertClimateZone>): Promise<ClimateZone | undefined> {
    const existing = this.climateZones.get(id);
    if (!existing) {
      return undefined;
    }
    const updated = { ...existing, ...zoneData };
    this.climateZones.set(id, updated);
    return updated;
  }

  async getRegulatoryBodiesByRegion(regionId: string): Promise<RegulatoryBody[]> {
    const bodies: RegulatoryBody[] = [];
    for (const body of this.regulatoryBodies.values()) {
      if (body.regionId === regionId) {
        bodies.push(body);
      }
    }
    return bodies;
  }

  async getRegulatoryBodiesByCountry(countryId: string): Promise<RegulatoryBody[]> {
    const bodies: RegulatoryBody[] = [];
    for (const body of this.regulatoryBodies.values()) {
      if (body.countryId === countryId) {
        bodies.push(body);
      }
    }
    return bodies;
  }

  async getRegulatoryBody(id: string): Promise<RegulatoryBody | undefined> {
    return this.regulatoryBodies.get(id);
  }

  async createRegulatoryBody(bodyData: InsertRegulatoryBody): Promise<RegulatoryBody> {
    const body: RegulatoryBody = {
      id: randomUUID(),
      regionId: bodyData.regionId || null,
      countryId: bodyData.countryId,
      name: bodyData.name,
      type: bodyData.type,
      website: bodyData.website || null,
      description: bodyData.description || null,
      isActive: bodyData.isActive ?? true,
      createdAt: new Date(),
    };
    this.regulatoryBodies.set(body.id, body);
    return body;
  }

  async updateRegulatoryBody(id: string, bodyData: Partial<InsertRegulatoryBody>): Promise<RegulatoryBody | undefined> {
    const existing = this.regulatoryBodies.get(id);
    if (!existing) {
      return undefined;
    }
    const updated = { ...existing, ...bodyData };
    this.regulatoryBodies.set(id, updated);
    return updated;
  }

  async getRegionalMaintenanceTasks(countryId: string, climateZoneId?: string, month?: number): Promise<RegionalMaintenanceTask[]> {
    const tasks: RegionalMaintenanceTask[] = [];
    for (const task of this.regionalMaintenanceTasks.values()) {
      if (task.countryId === countryId) {
        if (climateZoneId && task.climateZoneId !== climateZoneId) {
          continue;
        }
        if (month && task.months && !task.months.includes(month.toString())) {
          continue;
        }
        tasks.push(task);
      }
    }
    return tasks;
  }

  async getRegionalMaintenanceTask(id: string): Promise<RegionalMaintenanceTask | undefined> {
    return this.regionalMaintenanceTasks.get(id);
  }

  async createRegionalMaintenanceTask(taskData: InsertRegionalMaintenanceTask): Promise<RegionalMaintenanceTask> {
    const task: RegionalMaintenanceTask = {
      id: randomUUID(),
      countryId: taskData.countryId,
      climateZoneId: taskData.climateZoneId || null,
      taskId: taskData.taskId,
      title: taskData.title,
      description: taskData.description,
      category: taskData.category,
      priority: taskData.priority,
      estimatedTime: taskData.estimatedTime || null,
      difficulty: taskData.difficulty || null,
      tools: taskData.tools || null,
      cost: taskData.cost || null,
      season: taskData.season || null,
      months: taskData.months || null,
      systemRequirements: taskData.systemRequirements || null,
      isActive: taskData.isActive ?? true,
      createdAt: new Date(),
    };
    this.regionalMaintenanceTasks.set(task.id, task);
    return task;
  }

  async updateRegionalMaintenanceTask(id: string, taskData: Partial<InsertRegionalMaintenanceTask>): Promise<RegionalMaintenanceTask | undefined> {
    const existing = this.regionalMaintenanceTasks.get(id);
    if (!existing) {
      return undefined;
    }
    const updated = { ...existing, ...taskData };
    this.regionalMaintenanceTasks.set(id, updated);
    return updated;
  }

  // Task completion operations for achievements
  async getTaskCompletions(homeownerId: string, houseId?: string): Promise<TaskCompletion[]> {
    if (houseId) {
      const result = await db.select().from(taskCompletions).where(eq(taskCompletions.homeownerId, homeownerId)).where(eq(taskCompletions.houseId, houseId));
      return result;
    }
    const result = await db.select().from(taskCompletions).where(eq(taskCompletions.homeownerId, homeownerId));
    return result;
  }

  async getTaskCompletion(id: string): Promise<TaskCompletion | undefined> {
    const result = await db.select().from(taskCompletions).where(eq(taskCompletions.id, id));
    return result[0];
  }

  async createTaskCompletion(completion: InsertTaskCompletion): Promise<TaskCompletion> {
    const result = await db.insert(taskCompletions).values(completion).returning();
    return result[0];
  }

  async getTaskCompletionsByMonth(homeownerId: string, year: number, month: number): Promise<TaskCompletion[]> {
    const result = await db.select().from(taskCompletions)
      .where(eq(taskCompletions.homeownerId, homeownerId))
      .where(eq(taskCompletions.year, year))
      .where(eq(taskCompletions.month, month));
    return result;
  }

  async getMonthlyStreak(homeownerId: string): Promise<{ currentStreak: number; longestStreak: number }> {
    // Get all task completions ordered by date
    const completions = await db.select().from(taskCompletions)
      .where(eq(taskCompletions.homeownerId, homeownerId))
      .orderBy(taskCompletions.year, taskCompletions.month);

    if (completions.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 1;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    // Group completions by month
    const monthSet = new Set<string>();
    completions.forEach(c => monthSet.add(`${c.year}-${c.month}`));
    
    const months = Array.from(monthSet).sort();

    // Calculate longest streak
    for (let i = 1; i < months.length; i++) {
      const [prevYear, prevMonth] = months[i - 1].split('-').map(Number);
      const [currYear, currMonth] = months[i].split('-').map(Number);
      
      const isConsecutive = 
        (currYear === prevYear && currMonth === prevMonth + 1) ||
        (currYear === prevYear + 1 && prevMonth === 12 && currMonth === 1);
      
      if (isConsecutive) {
        tempStreak++;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Calculate current streak
    const lastMonth = months[months.length - 1];
    const [lastYear, lastMonthNum] = lastMonth.split('-').map(Number);
    
    if (lastYear === currentYear && lastMonthNum === currentMonth) {
      currentStreak = 1;
      for (let i = months.length - 2; i >= 0; i--) {
        const [year, month] = months[i].split('-').map(Number);
        const [nextYear, nextMonth] = months[i + 1].split('-').map(Number);
        
        const isConsecutive = 
          (nextYear === year && nextMonth === month + 1) ||
          (nextYear === year + 1 && month === 12 && nextMonth === 1);
        
        if (isConsecutive) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return { currentStreak, longestStreak };
  }

  // Achievement operations
  async getAchievements(homeownerId: string): Promise<Achievement[]> {
    const result = await db.select().from(achievements).where(eq(achievements.homeownerId, homeownerId));
    return result;
  }

  async getAchievement(id: string): Promise<Achievement | undefined> {
    const result = await db.select().from(achievements).where(eq(achievements.id, id));
    return result[0];
  }

  async createAchievement(achievement: InsertAchievement): Promise<Achievement> {
    const result = await db.insert(achievements).values(achievement).returning();
    return result[0];
  }

  async hasAchievement(homeownerId: string, achievementType: string): Promise<boolean> {
    const result = await db.select().from(achievements)
      .where(eq(achievements.homeownerId, homeownerId))
      .where(eq(achievements.achievementType, achievementType));
    return result.length > 0;
  }

  async getContractorHireCount(homeownerId: string): Promise<number> {
    // Count unique contractors hired by this homeowner from maintenance logs
    const logs = await db.select().from(maintenanceLogs)
      .where(eq(maintenanceLogs.homeownerId, homeownerId))
      .where(isNotNull(maintenanceLogs.contractorId));
    
    const uniqueContractors = new Set(logs.map(log => log.contractorId).filter(Boolean));
    return uniqueContractors.size;
  }

  // New achievement system operations
  async getAllAchievementDefinitions(): Promise<AchievementDefinition[]> {
    const result = await db.select().from(achievementDefinitions).where(eq(achievementDefinitions.isActive, true));
    return result;
  }

  async getAchievementDefinitionsByCategory(category: string): Promise<AchievementDefinition[]> {
    const result = await db.select().from(achievementDefinitions)
      .where(eq(achievementDefinitions.category, category))
      .where(eq(achievementDefinitions.isActive, true));
    return result;
  }

  async getUserAchievements(homeownerId: string): Promise<UserAchievement[]> {
    const result = await db.select().from(userAchievements).where(eq(userAchievements.homeownerId, homeownerId));
    return result;
  }

  async getUserAchievement(homeownerId: string, achievementKey: string): Promise<UserAchievement | undefined> {
    const result = await db.select().from(userAchievements)
      .where(eq(userAchievements.homeownerId, homeownerId))
      .where(eq(userAchievements.achievementKey, achievementKey));
    return result[0];
  }

  async createUserAchievement(userAchievement: InsertUserAchievement): Promise<UserAchievement> {
    const result = await db.insert(userAchievements).values(userAchievement).returning();
    return result[0];
  }

  async updateUserAchievementProgress(homeownerId: string, achievementKey: string, progress: number, metadata?: string): Promise<UserAchievement | undefined> {
    const updateData: any = { progress };
    if (metadata) {
      updateData.metadata = metadata;
    }
    
    const result = await db.update(userAchievements)
      .set(updateData)
      .where(eq(userAchievements.homeownerId, homeownerId))
      .where(eq(userAchievements.achievementKey, achievementKey))
      .returning();
    return result[0];
  }

  async unlockUserAchievement(homeownerId: string, achievementKey: string): Promise<UserAchievement | undefined> {
    const result = await db.update(userAchievements)
      .set({ isUnlocked: true, unlockedAt: new Date(), progress: "100" })
      .where(eq(userAchievements.homeownerId, homeownerId))
      .where(eq(userAchievements.achievementKey, achievementKey))
      .returning();
    return result[0];
  }

  async checkAndAwardAchievements(homeownerId: string): Promise<UserAchievement[]> {
    const newlyUnlocked: UserAchievement[] = [];
    
    // Get all achievement definitions
    const definitions = await this.getAllAchievementDefinitions();
    
    // Get user's current achievements
    const userAchievs = await this.getUserAchievements(homeownerId);
    const unlockedKeys = new Set(userAchievs.filter(a => a.isUnlocked).map(a => a.achievementKey));
    
    for (const def of definitions) {
      // Skip if already unlocked
      if (unlockedKeys.has(def.achievementKey)) continue;
      
      const criteria = JSON.parse(def.criteria);
      let isCompleted = false;
      let progress = 0;
      
      // Check each achievement type
      switch (criteria.type) {
        case 'seasonal_tasks': {
          // Get tasks for this season
          const seasonMonths: Record<string, number[]> = {
            winter: [12, 1, 2],
            spring: [3, 4, 5],
            summer: [6, 7, 8],
            fall: [9, 10, 11]
          };
          
          const months = seasonMonths[criteria.season] || [];
          const currentYear = new Date().getFullYear();
          
          // Count completed seasonal tasks
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId))
            .where(eq(taskCompletions.year, currentYear));
          
          const seasonalCompletions = completions.filter(c => months.includes(c.month));
          
          // For simplicity, assume "all" means at least 5 tasks per season
          const requiredCount = 5;
          progress = Math.min(100, (seasonalCompletions.length / requiredCount) * 100);
          isCompleted = seasonalCompletions.length >= requiredCount;
          break;
        }
        
        case 'under_budget': {
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId))
            .where(isNotNull(taskCompletions.costSavings));
          
          const underBudgetCount = completions.filter(c => 
            c.costSavings && parseFloat(c.costSavings.toString()) > 0
          ).length;
          
          progress = Math.min(100, (underBudgetCount / criteria.count) * 100);
          isCompleted = underBudgetCount >= criteria.count;
          break;
        }
        
        case 'total_savings': {
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId))
            .where(isNotNull(taskCompletions.costSavings));
          
          const totalSavings = completions.reduce((sum, c) => 
            sum + (c.costSavings ? parseFloat(c.costSavings.toString()) : 0), 0
          );
          
          progress = Math.min(100, (totalSavings / criteria.amount) * 100);
          isCompleted = totalSavings >= criteria.amount;
          break;
        }
        
        case 'documents_uploaded': {
          const logs = await db.select().from(maintenanceLogs)
            .where(eq(maintenanceLogs.homeownerId, homeownerId));
          
          const docsCount = logs.reduce((sum, log) => 
            sum + (log.receiptUrls?.length || 0), 0
          );
          
          progress = Math.min(100, (docsCount / criteria.count) * 100);
          isCompleted = docsCount >= criteria.count;
          break;
        }
        
        case 'logs_created': {
          const logs = await db.select().from(maintenanceLogs)
            .where(eq(maintenanceLogs.homeownerId, homeownerId));
          
          progress = Math.min(100, (logs.length / criteria.count) * 100);
          isCompleted = logs.length >= criteria.count;
          break;
        }
        
        case 'photos_uploaded': {
          const logs = await db.select().from(maintenanceLogs)
            .where(eq(maintenanceLogs.homeownerId, homeownerId));
          
          const photosCount = logs.reduce((sum, log) => 
            sum + (log.beforePhotoUrls?.length || 0) + (log.afterPhotoUrls?.length || 0), 0
          );
          
          // Count pairs of before/after photos
          const pairsCount = Math.floor(photosCount / 2);
          progress = Math.min(100, (pairsCount / criteria.count) * 100);
          isCompleted = pairsCount >= criteria.count;
          break;
        }
      }
      
      // Create or update user achievement
      const existing = userAchievs.find(a => a.achievementKey === def.achievementKey);
      
      if (isCompleted) {
        if (existing) {
          const unlocked = await this.unlockUserAchievement(homeownerId, def.achievementKey);
          if (unlocked) newlyUnlocked.push(unlocked);
        } else {
          const created = await this.createUserAchievement({
            homeownerId,
            achievementKey: def.achievementKey,
            progress: "100",
            isUnlocked: true,
            unlockedAt: new Date()
          });
          newlyUnlocked.push(created);
        }
      } else if (!existing && progress > 0) {
        // Create progress tracking
        await this.createUserAchievement({
          homeownerId,
          achievementKey: def.achievementKey,
          progress: progress.toString(),
          isUnlocked: false
        });
      } else if (existing && progress > parseFloat(existing.progress?.toString() || "0")) {
        // Update progress
        await this.updateUserAchievementProgress(homeownerId, def.achievementKey, progress);
      }
    }
    
    return newlyUnlocked;
  }

  async getAchievementProgress(homeownerId: string, achievementKey: string): Promise<{ progress: number; isUnlocked: boolean; criteria: any }> {
    const userAchiev = await this.getUserAchievement(homeownerId, achievementKey);
    const definition = await db.select().from(achievementDefinitions)
      .where(eq(achievementDefinitions.achievementKey, achievementKey));
    
    if (!definition[0]) {
      throw new Error('Achievement definition not found');
    }
    
    return {
      progress: userAchiev ? parseFloat(userAchiev.progress?.toString() || "0") : 0,
      isUnlocked: userAchiev?.isUnlocked || false,
      criteria: JSON.parse(definition[0].criteria)
    };
  }

  // Authentication methods
  async getUserByEmail(email: string): Promise<User | undefined> {
    for (const user of this.users.values()) {
      if (user.email === email) {
        return user;
      }
    }
    return undefined;
  }

  async createUserWithPassword(data: { 
    email: string; 
    passwordHash: string; 
    firstName: string; 
    lastName: string; 
    role: 'homeowner' | 'contractor'; 
    zipCode: string 
  }): Promise<User> {
    const id = randomUUID();
    const user: User = {
      id,
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      zipCode: data.zipCode,
      profileImageUrl: null,
      referralCode: null,
      referredBy: null,
      referralCount: 0,
      subscriptionPlanId: null,
      subscriptionStatus: 'inactive',
      maxHousesAllowed: 2,
      isPremium: false,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      stripePriceId: null,
      subscriptionStartDate: null,
      subscriptionEndDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Invite code methods
  async validateAndUseInviteCode(code: string): Promise<boolean> {
    const inviteCode = Array.from(this.inviteCodesMap.values()).find(ic => ic.code === code);
    
    if (!inviteCode) {
      return false;
    }
    
    if (!inviteCode.isActive) {
      return false;
    }
    
    if (inviteCode.currentUses >= inviteCode.maxUses) {
      return false;
    }
    
    // Increment usage
    const updated: InviteCode = {
      ...inviteCode,
      currentUses: inviteCode.currentUses + 1,
      updatedAt: new Date(),
    };
    this.inviteCodesMap.set(inviteCode.id, updated);
    return true;
  }

  async getInviteCodes(): Promise<InviteCode[]> {
    return Array.from(this.inviteCodesMap.values());
  }

  async createInviteCode(data: InsertInviteCode): Promise<InviteCode> {
    const id = randomUUID();
    const inviteCode: InviteCode = {
      id,
      code: data.code,
      createdBy: data.createdBy || null,
      usedBy: data.usedBy || [],
      isActive: data.isActive ?? true,
      maxUses: data.maxUses ?? 1,
      currentUses: data.currentUses ?? 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.inviteCodesMap.set(id, inviteCode);
    return inviteCode;
  }

  async deactivateInviteCode(code: string): Promise<boolean> {
    const inviteCode = Array.from(this.inviteCodesMap.values()).find(ic => ic.code === code);
    
    if (!inviteCode) {
      return false;
    }
    
    const updated: InviteCode = {
      ...inviteCode,
      isActive: false,
      updatedAt: new Date(),
    };
    this.inviteCodesMap.set(inviteCode.id, updated);
    return true;
  }

  // Search analytics methods
  async trackSearch(data: InsertSearchAnalytics): Promise<SearchAnalytics> {
    const id = randomUUID();
    const searchAnalytic: SearchAnalytics = {
      id,
      userId: data.userId || null,
      searchTerm: data.searchTerm,
      serviceType: data.serviceType || null,
      userZipCode: data.userZipCode || null,
      searchContext: data.searchContext || null,
      createdAt: new Date(),
    };
    this.searchAnalyticsMap.set(id, searchAnalytic);
    return searchAnalytic;
  }

  async getSearchAnalytics(filters?: { zipCode?: string; limit?: number }): Promise<SearchAnalytics[]> {
    let analytics = Array.from(this.searchAnalyticsMap.values());
    
    if (filters?.zipCode) {
      analytics = analytics.filter(a => a.userZipCode === filters.zipCode);
    }
    
    // Sort by most recent
    analytics.sort((a, b) => {
      const aTime = a.createdAt ? a.createdAt.getTime() : 0;
      const bTime = b.createdAt ? b.createdAt.getTime() : 0;
      return bTime - aTime;
    });
    
    if (filters?.limit) {
      analytics = analytics.slice(0, filters.limit);
    }
    
    return analytics;
  }

  // Admin analytics methods
  async getAdminStats(): Promise<{
    totalUsers: number;
    homeownerCount: number;
    contractorCount: number;
    topSearches: Array<{ searchTerm: string; count: number }>;
    signupsByZip: Array<{ zipCode: string; count: number }>;
  }> {
    const allUsers = Array.from(this.users.values());
    
    const totalUsers = allUsers.length;
    const homeownerCount = allUsers.filter(u => u.role === 'homeowner').length;
    const contractorCount = allUsers.filter(u => u.role === 'contractor').length;
    
    // Count search terms
    const searchTermCounts = new Map<string, number>();
    Array.from(this.searchAnalyticsMap.values()).forEach(search => {
      const term = search.searchTerm;
      searchTermCounts.set(term, (searchTermCounts.get(term) || 0) + 1);
    });
    
    const topSearches = Array.from(searchTermCounts.entries())
      .map(([searchTerm, count]) => ({ searchTerm, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Count signups by zip
    const zipCounts = new Map<string, number>();
    allUsers.forEach(user => {
      if (user.zipCode) {
        zipCounts.set(user.zipCode, (zipCounts.get(user.zipCode) || 0) + 1);
      }
    });
    
    const signupsByZip = Array.from(zipCounts.entries())
      .map(([zipCode, count]) => ({ zipCode, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalUsers,
      homeownerCount,
      contractorCount,
      topSearches,
      signupsByZip,
    };
  }
}

// Database-backed storage for users (OAuth persistence)
class DbStorage implements IStorage {
  private memStorage: MemStorage;

  constructor() {
    this.memStorage = new MemStorage();
    
    // Bind all MemStorage methods (except database-backed ones)
    // getContractors now uses database-backed method (defined below)
    this.getContractor = this.memStorage.getContractor.bind(this.memStorage);
    this.createContractor = this.memStorage.createContractor.bind(this.memStorage);
    this.getContractorLicenses = this.memStorage.getContractorLicenses.bind(this.memStorage);
    this.getContractorLicense = this.memStorage.getContractorLicense.bind(this.memStorage);
    this.createContractorLicense = this.memStorage.createContractorLicense.bind(this.memStorage);
    this.updateContractorLicense = this.memStorage.updateContractorLicense.bind(this.memStorage);
    this.deleteContractorLicense = this.memStorage.deleteContractorLicense.bind(this.memStorage);
    this.getProducts = this.memStorage.getProducts.bind(this.memStorage);
    this.getProduct = this.memStorage.getProduct.bind(this.memStorage);
    this.createProduct = this.memStorage.createProduct.bind(this.memStorage);
    this.getHomeAppliances = this.memStorage.getHomeAppliances.bind(this.memStorage);
    this.getHomeAppliance = this.memStorage.getHomeAppliance.bind(this.memStorage);
    this.createHomeAppliance = this.memStorage.createHomeAppliance.bind(this.memStorage);
    this.updateHomeAppliance = this.memStorage.updateHomeAppliance.bind(this.memStorage);
    this.deleteHomeAppliance = this.memStorage.deleteHomeAppliance.bind(this.memStorage);
    this.getHomeApplianceManuals = this.memStorage.getHomeApplianceManuals.bind(this.memStorage);
    this.getHomeApplianceManual = this.memStorage.getHomeApplianceManual.bind(this.memStorage);
    this.createHomeApplianceManual = this.memStorage.createHomeApplianceManual.bind(this.memStorage);
    this.updateHomeApplianceManual = this.memStorage.updateHomeApplianceManual.bind(this.memStorage);
    this.deleteHomeApplianceManual = this.memStorage.deleteHomeApplianceManual.bind(this.memStorage);
    this.getMaintenanceLogs = this.memStorage.getMaintenanceLogs.bind(this.memStorage);
    this.getMaintenanceLog = this.memStorage.getMaintenanceLog.bind(this.memStorage);
    this.createMaintenanceLog = this.memStorage.createMaintenanceLog.bind(this.memStorage);
    this.updateMaintenanceLog = this.memStorage.updateMaintenanceLog.bind(this.memStorage);
    this.deleteMaintenanceLog = this.memStorage.deleteMaintenanceLog.bind(this.memStorage);
    this.getCustomMaintenanceTasks = this.memStorage.getCustomMaintenanceTasks.bind(this.memStorage);
    this.getCustomMaintenanceTask = this.memStorage.getCustomMaintenanceTask.bind(this.memStorage);
    this.createCustomMaintenanceTask = this.memStorage.createCustomMaintenanceTask.bind(this.memStorage);
    this.updateCustomMaintenanceTask = this.memStorage.updateCustomMaintenanceTask.bind(this.memStorage);
    this.deleteCustomMaintenanceTask = this.memStorage.deleteCustomMaintenanceTask.bind(this.memStorage);
    this.getHouses = this.memStorage.getHouses.bind(this.memStorage);
    this.getHouse = this.memStorage.getHouse.bind(this.memStorage);
    this.createHouse = this.memStorage.createHouse.bind(this.memStorage);
    this.updateHouse = this.memStorage.updateHouse.bind(this.memStorage);
    this.deleteHouse = this.memStorage.deleteHouse.bind(this.memStorage);
    this.getDefaultHouse = this.memStorage.getDefaultHouse.bind(this.memStorage);
    this.getContractorAppointments = this.memStorage.getContractorAppointments.bind(this.memStorage);
    this.getContractorAppointment = this.memStorage.getContractorAppointment.bind(this.memStorage);
    this.createContractorAppointment = this.memStorage.createContractorAppointment.bind(this.memStorage);
    this.updateContractorAppointment = this.memStorage.updateContractorAppointment.bind(this.memStorage);
    this.deleteContractorAppointment = this.memStorage.deleteContractorAppointment.bind(this.memStorage);
    this.getNotifications = this.memStorage.getNotifications.bind(this.memStorage);
    this.getNotification = this.memStorage.getNotification.bind(this.memStorage);
    this.createNotification = this.memStorage.createNotification.bind(this.memStorage);
    this.updateNotification = this.memStorage.updateNotification.bind(this.memStorage);
    this.deleteNotification = this.memStorage.deleteNotification.bind(this.memStorage);
    this.getUnreadNotifications = this.memStorage.getUnreadNotifications.bind(this.memStorage);
    this.markNotificationAsRead = this.memStorage.markNotificationAsRead.bind(this.memStorage);
    // searchContractors, getContractorProfile, and updateContractorProfile now use database-backed methods (defined below)
    this.searchProducts = this.memStorage.searchProducts.bind(this.memStorage);
    this.getServiceRecords = this.memStorage.getServiceRecords.bind(this.memStorage);
    this.getServiceRecord = this.memStorage.getServiceRecord.bind(this.memStorage);
    this.createServiceRecord = this.memStorage.createServiceRecord.bind(this.memStorage);
    this.updateServiceRecord = this.memStorage.updateServiceRecord.bind(this.memStorage);
    this.deleteServiceRecord = this.memStorage.deleteServiceRecord.bind(this.memStorage);
    this.getHomeownerServiceRecords = this.memStorage.getHomeownerServiceRecords.bind(this.memStorage);
    this.getCustomerServiceRecords = this.memStorage.getCustomerServiceRecords.bind(this.memStorage);
    this.getConversations = this.memStorage.getConversations.bind(this.memStorage);
    this.getConversation = this.memStorage.getConversation.bind(this.memStorage);
    this.createConversation = this.memStorage.createConversation.bind(this.memStorage);
    this.getMessages = this.memStorage.getMessages.bind(this.memStorage);
    this.createMessage = this.memStorage.createMessage.bind(this.memStorage);
    this.markMessagesAsRead = this.memStorage.markMessagesAsRead.bind(this.memStorage);
    this.getUnreadMessageCount = this.memStorage.getUnreadMessageCount.bind(this.memStorage);
    this.getContractorReviews = this.memStorage.getContractorReviews.bind(this.memStorage);
    this.getReviewsByHomeowner = this.memStorage.getReviewsByHomeowner.bind(this.memStorage);
    this.createContractorReview = this.memStorage.createContractorReview.bind(this.memStorage);
    this.updateContractorReview = this.memStorage.updateContractorReview.bind(this.memStorage);
    this.deleteContractorReview = this.memStorage.deleteContractorReview.bind(this.memStorage);
    this.getContractorAverageRating = this.memStorage.getContractorAverageRating.bind(this.memStorage);
    this.getProposals = this.memStorage.getProposals.bind(this.memStorage);
    this.getProposal = this.memStorage.getProposal.bind(this.memStorage);
    this.createProposal = this.memStorage.createProposal.bind(this.memStorage);
    this.updateProposal = this.memStorage.updateProposal.bind(this.memStorage);
    this.deleteProposal = this.memStorage.deleteProposal.bind(this.memStorage);
    this.getHomeSystems = this.memStorage.getHomeSystems.bind(this.memStorage);
    this.getHomeSystem = this.memStorage.getHomeSystem.bind(this.memStorage);
    this.createHomeSystem = this.memStorage.createHomeSystem.bind(this.memStorage);
    this.updateHomeSystem = this.memStorage.updateHomeSystem.bind(this.memStorage);
    this.deleteHomeSystem = this.memStorage.deleteHomeSystem.bind(this.memStorage);
    this.getPushSubscriptions = this.memStorage.getPushSubscriptions.bind(this.memStorage);
    this.getPushSubscription = this.memStorage.getPushSubscription.bind(this.memStorage);
    this.createPushSubscription = this.memStorage.createPushSubscription.bind(this.memStorage);
    this.updatePushSubscription = this.memStorage.updatePushSubscription.bind(this.memStorage);
    this.deletePushSubscription = this.memStorage.deletePushSubscription.bind(this.memStorage);
    this.deletePushSubscriptionByEndpoint = this.memStorage.deletePushSubscriptionByEndpoint.bind(this.memStorage);
    this.getHousesByHomeowner = this.memStorage.getHousesByHomeowner.bind(this.memStorage);
    this.getHomeSystemsByHomeowner = this.memStorage.getHomeSystemsByHomeowner.bind(this.memStorage);
    this.getMaintenanceLogsByHomeowner = this.memStorage.getMaintenanceLogsByHomeowner.bind(this.memStorage);
    this.getActiveBoosts = this.memStorage.getActiveBoosts.bind(this.memStorage);
    this.getContractorBoosts = this.memStorage.getContractorBoosts.bind(this.memStorage);
    this.createContractorBoost = this.memStorage.createContractorBoost.bind(this.memStorage);
    this.updateContractorBoost = this.memStorage.updateContractorBoost.bind(this.memStorage);
    this.deleteContractorBoost = this.memStorage.deleteContractorBoost.bind(this.memStorage);
    this.checkBoostConflict = this.memStorage.checkBoostConflict.bind(this.memStorage);
    this.createHouseTransfer = this.memStorage.createHouseTransfer.bind(this.memStorage);
    this.getHouseTransfer = this.memStorage.getHouseTransfer.bind(this.memStorage);
    this.getHouseTransferByToken = this.memStorage.getHouseTransferByToken.bind(this.memStorage);
    this.getHouseTransfersForUser = this.memStorage.getHouseTransfersForUser.bind(this.memStorage);
    this.updateHouseTransfer = this.memStorage.updateHouseTransfer.bind(this.memStorage);
    this.transferHouseOwnership = this.memStorage.transferHouseOwnership.bind(this.memStorage);
    this.getHousesCount = this.memStorage.getHousesCount.bind(this.memStorage);
    this.trackContractorClick = this.memStorage.trackContractorClick.bind(this.memStorage);
    this.getContractorAnalytics = this.memStorage.getContractorAnalytics.bind(this.memStorage);
    this.getContractorMonthlyStats = this.memStorage.getContractorMonthlyStats.bind(this.memStorage);
    this.getTaskOverrides = this.memStorage.getTaskOverrides.bind(this.memStorage);
    this.getTaskOverride = this.memStorage.getTaskOverride.bind(this.memStorage);
    this.upsertTaskOverride = this.memStorage.upsertTaskOverride.bind(this.memStorage);
    this.deleteTaskOverride = this.memStorage.deleteTaskOverride.bind(this.memStorage);
    this.getCountries = this.memStorage.getCountries.bind(this.memStorage);
    this.getCountry = this.memStorage.getCountry.bind(this.memStorage);
    this.getCountryByCode = this.memStorage.getCountryByCode.bind(this.memStorage);
    this.createCountry = this.memStorage.createCountry.bind(this.memStorage);
    this.updateCountry = this.memStorage.updateCountry.bind(this.memStorage);
    this.getRegionsByCountry = this.memStorage.getRegionsByCountry.bind(this.memStorage);
    this.getRegion = this.memStorage.getRegion.bind(this.memStorage);
    this.createRegion = this.memStorage.createRegion.bind(this.memStorage);
    this.updateRegion = this.memStorage.updateRegion.bind(this.memStorage);
    this.getClimateZonesByCountry = this.memStorage.getClimateZonesByCountry.bind(this.memStorage);
    this.getClimateZone = this.memStorage.getClimateZone.bind(this.memStorage);
    this.createClimateZone = this.memStorage.createClimateZone.bind(this.memStorage);
    this.updateClimateZone = this.memStorage.updateClimateZone.bind(this.memStorage);
    this.getRegulatoryBodiesByRegion = this.memStorage.getRegulatoryBodiesByRegion.bind(this.memStorage);
    this.getRegulatoryBodiesByCountry = this.memStorage.getRegulatoryBodiesByCountry.bind(this.memStorage);
    this.getRegulatoryBody = this.memStorage.getRegulatoryBody.bind(this.memStorage);
    this.createRegulatoryBody = this.memStorage.createRegulatoryBody.bind(this.memStorage);
    this.updateRegulatoryBody = this.memStorage.updateRegulatoryBody.bind(this.memStorage);
    this.getRegionalMaintenanceTasks = this.memStorage.getRegionalMaintenanceTasks.bind(this.memStorage);
    this.getRegionalMaintenanceTask = this.memStorage.getRegionalMaintenanceTask.bind(this.memStorage);
    this.createRegionalMaintenanceTask = this.memStorage.createRegionalMaintenanceTask.bind(this.memStorage);
    this.updateRegionalMaintenanceTask = this.memStorage.updateRegionalMaintenanceTask.bind(this.memStorage);
    this.getTaskCompletions = this.memStorage.getTaskCompletions.bind(this.memStorage);
    this.getTaskCompletion = this.memStorage.getTaskCompletion.bind(this.memStorage);
    this.createTaskCompletion = this.memStorage.createTaskCompletion.bind(this.memStorage);
    this.getTaskCompletionsByMonth = this.memStorage.getTaskCompletionsByMonth.bind(this.memStorage);
    this.getMonthlyStreak = this.memStorage.getMonthlyStreak.bind(this.memStorage);
    this.getAchievements = this.memStorage.getAchievements.bind(this.memStorage);
    this.getAchievement = this.memStorage.getAchievement.bind(this.memStorage);
    this.createAchievement = this.memStorage.createAchievement.bind(this.memStorage);
    this.hasAchievement = this.memStorage.hasAchievement.bind(this.memStorage);
    this.getContractorHireCount = this.memStorage.getContractorHireCount.bind(this.memStorage);
    this.getAllAchievementDefinitions = this.memStorage.getAllAchievementDefinitions.bind(this.memStorage);
    this.getAchievementDefinitionsByCategory = this.memStorage.getAchievementDefinitionsByCategory.bind(this.memStorage);
    this.getUserAchievements = this.memStorage.getUserAchievements.bind(this.memStorage);
    this.getUserAchievement = this.memStorage.getUserAchievement.bind(this.memStorage);
    this.createUserAchievement = this.memStorage.createUserAchievement.bind(this.memStorage);
    this.updateUserAchievementProgress = this.memStorage.updateUserAchievementProgress.bind(this.memStorage);
    this.unlockUserAchievement = this.memStorage.unlockUserAchievement.bind(this.memStorage);
    this.checkAndAwardAchievements = this.memStorage.checkAndAwardAchievements.bind(this.memStorage);
    this.getAchievementProgress = this.memStorage.getAchievementProgress.bind(this.memStorage);
    this.validateAndUseInviteCode = this.memStorage.validateAndUseInviteCode.bind(this.memStorage);
    this.getInviteCodes = this.memStorage.getInviteCodes.bind(this.memStorage);
    this.createInviteCode = this.memStorage.createInviteCode.bind(this.memStorage);
    this.deactivateInviteCode = this.memStorage.deactivateInviteCode.bind(this.memStorage);
    this.trackSearch = this.memStorage.trackSearch.bind(this.memStorage);
    this.getSearchAnalytics = this.memStorage.getSearchAnalytics.bind(this.memStorage);
    this.getAdminStats = this.memStorage.getAdminStats.bind(this.memStorage);
  }

  // User operations - DATABASE BACKED for persistence
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    
    // Check if user exists
    const existingUser = userData.id ? await this.getUser(userData.id) : null;
    
    if (existingUser) {
      // Update existing user, preserving fields not provided in userData
      const updatedData = {
        id: userData.id!,
        email: userData.email ?? existingUser.email,
        firstName: userData.firstName ?? existingUser.firstName,
        lastName: userData.lastName ?? existingUser.lastName,
        profileImageUrl: userData.profileImageUrl ?? existingUser.profileImageUrl,
        role: userData.role ?? existingUser.role,
        passwordHash: userData.passwordHash ?? existingUser.passwordHash,
        zipCode: userData.zipCode ?? existingUser.zipCode,
        referralCode: userData.referralCode ?? existingUser.referralCode,
        referredBy: userData.referredBy ?? existingUser.referredBy,
        referralCount: userData.referralCount ?? existingUser.referralCount,
        subscriptionPlanId: userData.subscriptionPlanId ?? existingUser.subscriptionPlanId,
        subscriptionStatus: userData.subscriptionStatus ?? existingUser.subscriptionStatus,
        maxHousesAllowed: userData.maxHousesAllowed ?? existingUser.maxHousesAllowed,
        isPremium: userData.isPremium ?? existingUser.isPremium,
        stripeCustomerId: userData.stripeCustomerId ?? existingUser.stripeCustomerId,
        stripeSubscriptionId: userData.stripeSubscriptionId ?? existingUser.stripeSubscriptionId,
        stripePriceId: userData.stripePriceId ?? existingUser.stripePriceId,
        subscriptionStartDate: userData.subscriptionStartDate ?? existingUser.subscriptionStartDate,
        subscriptionEndDate: userData.subscriptionEndDate ?? existingUser.subscriptionEndDate,
        updatedAt: new Date(),
      };
      
      await db.update(users).set(updatedData).where(eq(users.id, userData.id!));
      return (await this.getUser(userData.id!))!;
    } else {
      // Insert new user
      const newUser = {
        id: userData.id,
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        role: userData.role ?? 'homeowner',
        passwordHash: userData.passwordHash ?? null,
        zipCode: userData.zipCode ?? null,
        referralCode: userData.referralCode ?? null,
        referredBy: userData.referredBy ?? null,
        referralCount: userData.referralCount ?? 0,
        subscriptionPlanId: userData.subscriptionPlanId ?? null,
        subscriptionStatus: userData.subscriptionStatus ?? 'inactive',
        maxHousesAllowed: userData.maxHousesAllowed ?? 2,
        isPremium: userData.isPremium ?? false,
        stripeCustomerId: userData.stripeCustomerId ?? null,
        stripeSubscriptionId: userData.stripeSubscriptionId ?? null,
        stripePriceId: userData.stripePriceId ?? null,
        subscriptionStartDate: userData.subscriptionStartDate ?? null,
        subscriptionEndDate: userData.subscriptionEndDate ?? null,
      };
      
      await db.insert(users).values(newUser);
      return (await this.getUser(newUser.id!))!;
    }
  }

  async createUserWithPassword(data: { email: string, passwordHash: string, firstName: string, lastName: string, role: 'homeowner' | 'contractor', zipCode: string }): Promise<User> {
    return this.upsertUser({
      id: randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      zipCode: data.zipCode,
    });
  }

  // Contractor operations - DATABASE BACKED for persistence
  async getContractors(filters?: {
    services?: string[];
    location?: string;
    minRating?: number;
    hasEmergencyServices?: boolean;
    maxDistance?: number;
  }): Promise<(Contractor & { isBoosted?: boolean })[]> {
    let results = await db.select().from(contractors);

    if (filters) {
      if (filters.services && filters.services.length > 0) {
        results = results.filter(contractor =>
          filters.services!.some(service =>
            contractor.services.some(contractorService =>
              contractorService.toLowerCase().includes(service.toLowerCase())
            )
          )
        );
      }

      if (filters.minRating) {
        results = results.filter(contractor =>
          parseFloat(contractor.rating) >= filters.minRating!
        );
      }

      if (filters.hasEmergencyServices !== undefined) {
        results = results.filter(contractor =>
          contractor.hasEmergencyServices === filters.hasEmergencyServices
        );
      }

      if (filters.maxDistance) {
        results = results.filter(contractor =>
          contractor.distance ? parseFloat(contractor.distance) <= filters.maxDistance! : true
        );
      }

      // Only show contractors whose service area overlaps with homeowner's location
      results = results.filter(contractor => {
        if (!contractor.distance) return true;
        const distanceToHomeowner = parseFloat(contractor.distance);
        return contractor.serviceRadius >= distanceToHomeowner;
      });
    }

    // Add isBoosted flag (set to false for now - boost logic would go here)
    return results.map(contractor => ({ ...contractor, isBoosted: false }));
  }

  async searchContractors(query: string, location?: string): Promise<Contractor[]> {
    let results = await db.select().from(contractors);
    
    return results.filter(contractor => {
      const matchesQuery = query === "" || 
        contractor.name.toLowerCase().includes(query.toLowerCase()) ||
        contractor.company.toLowerCase().includes(query.toLowerCase()) ||
        contractor.bio.toLowerCase().includes(query.toLowerCase()) ||
        contractor.services.some(service => service.toLowerCase().includes(query.toLowerCase()));
      
      const matchesLocation = !location || 
        contractor.location.toLowerCase().includes(location.toLowerCase());
      
      // Only show contractors whose service area overlaps with homeowner's location
      const withinServiceArea = !contractor.distance || 
        contractor.serviceRadius >= parseFloat(contractor.distance);
      
      return matchesQuery && matchesLocation && withinServiceArea;
    });
  }

  // Contractor profile operations - DATABASE BACKED for persistence
  async getContractorProfile(contractorId: string): Promise<Contractor | undefined> {
    const result = await db.select().from(contractors).where(eq(contractors.id, contractorId)).limit(1);
    return result[0];
  }

  async updateContractorProfile(contractorId: string, profileData: Partial<InsertContractor>): Promise<Contractor> {
    const existingContractor = await this.getContractorProfile(contractorId);
    
    // Build location from city and state if not provided
    const location = profileData.location || 
      (profileData.city && profileData.state ? `${profileData.city}, ${profileData.state}` : '');
    
    // Convert yearsExperience string to experience number
    const experience = profileData.experience !== undefined 
      ? profileData.experience 
      : (profileData.yearsExperience ? parseInt(profileData.yearsExperience as any) || 0 : 0);
    
    if (!existingContractor) {
      // Create new contractor profile if it doesn't exist (upsert pattern)
      const newContractor = {
        id: contractorId,
        name: profileData.name || '',
        company: profileData.company || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        location: location,
        postalCode: profileData.postalCode || '',
        serviceRadius: profileData.serviceRadius || 25,
        services: profileData.services || [],
        hasEmergencyServices: profileData.hasEmergencyServices || false,
        website: profileData.website || '',
        facebook: profileData.facebook || '',
        instagram: profileData.instagram || '',
        linkedin: profileData.linkedin || '',
        googleBusinessUrl: profileData.googleBusinessUrl || '',
        bio: profileData.bio || '',
        experience: experience,
        profileImage: profileData.profileImage || '',
        businessLogo: profileData.businessLogo || '',
        projectPhotos: profileData.projectPhotos || [],
        licenseNumber: profileData.licenseNumber || '',
        licenseMunicipality: profileData.licenseMunicipality || '',
        isLicensed: profileData.isLicensed !== undefined ? profileData.isLicensed : true,
        rating: profileData.rating || '0.00',
        reviewCount: profileData.reviewCount || 0,
      };
      
      await db.insert(contractors).values(newContractor);
      return (await this.getContractorProfile(contractorId))!;
    } else {
      // Update existing contractor profile
      const updatedData = {
        ...existingContractor,
        ...profileData,
        location: location || existingContractor.location,
        experience: experience,
      };
      
      await db.update(contractors).set(updatedData).where(eq(contractors.id, contractorId));
      return (await this.getContractorProfile(contractorId))!;
    }
  }

  // Methods delegated to MemStorage (bound in constructor)
}

export const storage = new DbStorage();
