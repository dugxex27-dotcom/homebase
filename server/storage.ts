import { type Contractor, type InsertContractor, type Company, type InsertCompany, type CompanyInviteCode, type InsertCompanyInviteCode, type ContractorLicense, type InsertContractorLicense, type Product, type InsertProduct, type HomeAppliance, type InsertHomeAppliance, type HomeApplianceManual, type InsertHomeApplianceManual, type MaintenanceLog, type InsertMaintenanceLog, type ContractorAppointment, type InsertContractorAppointment, type House, type InsertHouse, type Notification, type InsertNotification, type User, type UpsertUser, type ServiceRecord, type InsertServiceRecord, type HomeownerConnectionCode, type InsertHomeownerConnectionCode, type Conversation, type InsertConversation, type Message, type InsertMessage, type ContractorReview, type InsertContractorReview, type CustomMaintenanceTask, type InsertCustomMaintenanceTask, type Proposal, type InsertProposal, type HomeSystem, type InsertHomeSystem, type PushSubscription, type InsertPushSubscription, type ContractorBoost, type InsertContractorBoost, type HouseTransfer, type InsertHouseTransfer, type ContractorAnalytics, type InsertContractorAnalytics, type TaskOverride, type InsertTaskOverride, type Country, type InsertCountry, type Region, type InsertRegion, type ClimateZone, type InsertClimateZone, type RegulatoryBody, type InsertRegulatoryBody, type RegionalMaintenanceTask, type InsertRegionalMaintenanceTask, type TaskCompletion, type InsertTaskCompletion, type Achievement, type InsertAchievement, type AchievementDefinition, type InsertAchievementDefinition, type UserAchievement, type InsertUserAchievement, type SearchAnalytics, type InsertSearchAnalytics, type InviteCode, type InsertInviteCode, type AgentProfile, type InsertAgentProfile, type AffiliateReferral, type InsertAffiliateReferral, type SubscriptionCycleEvent, type InsertSubscriptionCycleEvent, type AffiliatePayout, type InsertAffiliatePayout, type AgentVerificationAudit, type InsertAgentVerificationAudit, type SupportTicket, type InsertSupportTicket, type TicketReply, type InsertTicketReply, users, contractors, companies, contractorLicenses, countries, regions, climateZones, regulatoryBodies, regionalMaintenanceTasks, taskCompletions, achievements, achievementDefinitions, userAchievements, maintenanceLogs, searchAnalytics, inviteCodes, agentProfiles, affiliateReferrals, subscriptionCycleEvents, affiliatePayouts, agentVerificationAudits, supportTickets, ticketReplies, houses, homeSystems, customMaintenanceTasks, taskOverrides, serviceRecords, homeownerConnectionCodes, conversations, messages, proposals, houseTransfers , type CrmLead, type InsertCrmLead, type CrmNote, type InsertCrmNote, type ErrorLog, type InsertErrorLog, type ErrorBreadcrumb, type InsertErrorBreadcrumb, type CrmIntegration, type InsertCrmIntegration, type WebhookLog, type InsertWebhookLog, crmLeads, crmNotes, errorLogs, errorBreadcrumbs, crmIntegrations, webhookLogs } from "@shared/schema";
import { randomUUID, randomBytes } from "crypto";
import { db } from "./db";
import { eq, ne, isNotNull, and, or, isNull, not, desc } from "drizzle-orm";

// DEMO DATA PROTECTION SYSTEM
// Helper functions to identify demo accounts and prevent overwrites of real user data

// List of known demo account ID prefixes - these are the ONLY IDs that should be used for demo data
const DEMO_ID_PREFIXES = [
  'demo-',
  'bellevue-roofer-',
  'seattle-plumber-',
  'elite-roofing-company-',
  'quality-home-services-',
  'maint-log-demo-',
  'maint-log-contractor-',
  'task-comp-demo-',
  'demo-lead-',
];

// Demo email domains - emails from these domains are considered demo accounts
const DEMO_EMAIL_DOMAINS = [
  '@homebase.com',
  '@eliteroofing.com',
  '@qualityhome.com',
  '@precisionhvac.com',
];

// Check if an ID belongs to a demo account
export function isDemoId(id: string | null | undefined): boolean {
  if (!id) return false;
  return DEMO_ID_PREFIXES.some(prefix => id.startsWith(prefix));
}

// Check if an email belongs to a demo account
export function isDemoEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return DEMO_EMAIL_DOMAINS.some(domain => email.endsWith(domain));
}

// Check if a user is a demo account
export function isDemoUser(user: { id: string; email?: string | null }): boolean {
  return isDemoId(user.id) || isDemoEmail(user.email);
}

// Check if we're in production environment (demo seeding should be disabled)
export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production' || process.env.REPLIT_DEPLOYMENT === '1';
}

// Check if demo data operations are explicitly enabled (for testing in development)
export function isDemoDataEnabled(): boolean {
  // In production, demo data is ALWAYS disabled unless explicitly enabled
  if (isProductionEnvironment()) {
    return process.env.ENABLE_DEMO_DATA === 'true';
  }
  // In development, demo data is enabled by default
  return process.env.DISABLE_DEMO_DATA !== 'true';
}

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByReferralCode(referralCode: string): Promise<User | undefined>;
  getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined>;
  updateUserStripeSubscription(userId: string, subscriptionId: string, priceId: string): Promise<User | undefined>;
  
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
  
  // Company methods
  getCompany(id: string): Promise<Company | undefined>;
  createCompany(company: InsertCompany): Promise<Company>;
  updateCompany(id: string, company: Partial<InsertCompany>): Promise<Company | undefined>;
  getCompanyEmployees(companyId: string): Promise<User[]>;
  getCompanyByReferralCode(code: string): Promise<Company | undefined>;
  
  // Company invite code methods
  createCompanyInviteCode(inviteCode: InsertCompanyInviteCode): Promise<CompanyInviteCode>;
  getCompanyInviteCode(id: string): Promise<CompanyInviteCode | undefined>;
  getCompanyInviteCodeByCode(code: string): Promise<CompanyInviteCode | undefined>;
  getCompanyInviteCodes(companyId: string): Promise<CompanyInviteCode[]>;
  updateCompanyInviteCode(id: string, inviteCode: Partial<InsertCompanyInviteCode>): Promise<CompanyInviteCode | undefined>;
  
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
  getMaintenanceLogs(homeownerId?: string, houseId?: string): Promise<MaintenanceLog[]>;
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
  getContractorNotifications(contractorId: string): Promise<Notification[]>;
  getUnreadContractorNotifications(contractorId: string): Promise<Notification[]>;
  markNotificationAsRead(id: string): Promise<boolean>;
  
  // Search methods
  searchContractors(query: string, location?: string, services?: string[], maxDistance?: number): Promise<Contractor[]>;
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
  getServiceRecordsByHomeowner(homeownerId: string, houseId?: string): Promise<ServiceRecord[]>;
  
  // Customer service record operations  
  getCustomerServiceRecords(customerId?: string, customerEmail?: string, customerAddress?: string): Promise<ServiceRecord[]>;

  // Permanent connection code operations (attached to user)
  getOrCreatePermanentConnectionCode(userId: string): Promise<string>;
  validatePermanentConnectionCode(code: string): Promise<{ homeownerId: string; homeownerName: string; homeownerEmail: string; homeownerZipCode: string | null; houses: Array<{id: string; name: string; address: string}> } | null>;
  regeneratePermanentConnectionCode(userId: string): Promise<string>;

  // Messaging operations
  getConversations(userId: string, userType: 'homeowner' | 'contractor'): Promise<(Conversation & { otherPartyName: string; unreadCount: number })[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessagesAsRead(conversationId: string, userId: string): Promise<void>;
  getUnreadMessageCount(userId: string): Promise<number>;
  getContactedHomeowners(contractorId: string): Promise<(User & { lastContactedAt: Date })[]>;

  // Review operations
  getContractorReviews(contractorId: string): Promise<ContractorReview[]>;
  getReviewsByHomeowner(homeownerId: string): Promise<ContractorReview[]>;
  getAllReviews(): Promise<ContractorReview[]>;
  createContractorReview(review: InsertContractorReview): Promise<ContractorReview>;
  updateContractorReview(id: string, review: Partial<InsertContractorReview>): Promise<ContractorReview | undefined>;
  
  // Review flag operations
  createReviewFlag(flag: InsertReviewFlag): Promise<ReviewFlag>;
  getReviewFlags(status?: string): Promise<ReviewFlag[]>;
  getReviewFlag(id: string): Promise<ReviewFlag | undefined>;
  updateReviewFlag(id: string, flag: Partial<InsertReviewFlag>): Promise<ReviewFlag | undefined>;
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
    serviceRecordsTransferred: number;
    taskCompletionsTransferred: number;
    taskOverridesTransferred: number;
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
  getHouseDIYSavings(houseId: string): Promise<{ totalSavings: number; taskCount: number }>;

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
  calculateAchievementsProgress(homeownerId: string, houseId?: string): Promise<Array<{ achievementKey: string; progress: number; isUnlocked: boolean; unlockedAt?: Date; metadata?: string }>>;
  getAchievementProgress(homeownerId: string, achievementKey: string): Promise<{ progress: number; isUnlocked: boolean; criteria: any }>;

  // Authentication methods
  getUserByEmail(email: string): Promise<User | undefined>;
  createUserWithPassword(data: { 
    email: string; 
    passwordHash: string; 
    firstName: string; 
    lastName: string; 
    role: 'homeowner' | 'contractor'; 
    zipCode: string;
    trialEndsAt?: Date;
    maxHousesAllowed?: number;
    subscriptionStatus?: string;
  }): Promise<User>;
  cancelUserAccount(userId: string, role: string): Promise<{ success: boolean; message: string }>;

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

  // Advanced admin analytics methods
  getActiveUsersSeries(days: number): Promise<Array<{ date: string; count: number }>>;
  getReferralGrowthSeries(days: number): Promise<Array<{ date: string; count: number }>>;
  getContractorSignupsSeries(days: number): Promise<Array<{ date: string; count: number }>>;
  getRevenueMetrics(days: number): Promise<{
    mrr: number;
    totalRevenue: number;
    revenueByPlan: Array<{ plan: string; revenue: number }>;
    revenueSeries: Array<{ date: string; amount: number }>;
  }>;
  getChurnMetrics(days: number): Promise<{
    churnRate: number;
    churnedUsers: number;
    totalActiveUsers: number;
    churnSeries: Array<{ date: string; rate: number }>;
  }>;
  getFeatureUsageStats(): Promise<Array<{ feature: string; count: number }>>;

  // Agent profile operations
  getAgentProfile(agentId: string): Promise<AgentProfile | undefined>;
  createAgentProfile(profile: InsertAgentProfile): Promise<AgentProfile>;
  updateAgentProfile(agentId: string, profile: Partial<InsertAgentProfile>): Promise<AgentProfile | undefined>;
  
  // Affiliate referral operations
  getAffiliateReferrals(agentId: string): Promise<AffiliateReferral[]>;
  getAffiliateReferral(id: string): Promise<AffiliateReferral | undefined>;
  getAffiliateReferralByUserId(userId: string): Promise<AffiliateReferral | undefined>;
  getReferringAgentForHomeowner(homeownerId: string): Promise<{ firstName: string; lastName: string; email: string | null; phone: string | null; website: string | null; officeAddress: string | null; referralCode: string | null; profileImageUrl: string | null; } | undefined>;
  createAffiliateReferral(referral: InsertAffiliateReferral): Promise<AffiliateReferral>;
  updateAffiliateReferral(id: string, referral: Partial<InsertAffiliateReferral>): Promise<AffiliateReferral | undefined>;
  
  // Subscription cycle event operations
  getSubscriptionCycleEvents(userId: string): Promise<SubscriptionCycleEvent[]>;
  createSubscriptionCycleEvent(event: InsertSubscriptionCycleEvent): Promise<SubscriptionCycleEvent>;
  getLastPaymentEvent(userId: string): Promise<SubscriptionCycleEvent | undefined>;
  
  // Affiliate payout operations
  getAffiliatePayouts(agentId: string): Promise<AffiliatePayout[]>;
  getAffiliatePayout(id: string): Promise<AffiliatePayout | undefined>;
  createAffiliatePayout(payout: InsertAffiliatePayout): Promise<AffiliatePayout>;
  updateAffiliatePayout(id: string, payout: Partial<InsertAffiliatePayout>): Promise<AffiliatePayout | undefined>;
  getPendingPayouts(): Promise<AffiliatePayout[]>;
  
  // Agent dashboard stats
  getAgentStats(agentId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
  }>;
  
  // Agent verification operations
  submitAgentVerification(agentId: string, data: {
    licenseNumber: string;
    licenseState: string;
    licenseExpiration: Date;
    stateIdStorageKey: string;
    stateIdOriginalFilename: string;
    stateIdMimeType: string;
    stateIdFileSize: number;
    stateIdChecksum: string;
  }): Promise<AgentProfile | undefined>;
  getAgentVerificationStatus(agentId: string): Promise<{
    verificationStatus: string;
    licenseNumber?: string | null;
    licenseState?: string | null;
    licenseExpiration?: Date | null;
    verificationRequestedAt?: Date | null;
    reviewNotes?: string | null;
  } | undefined>;
  
  // Agent verification audit operations
  createVerificationAudit(audit: InsertAgentVerificationAudit): Promise<AgentVerificationAudit>;
  getVerificationAudits(agentId: string): Promise<AgentVerificationAudit[]>;
  
  // Support ticket operations
  getSupportTickets(filters?: {
    userId?: string;
    status?: string;
    category?: string;
    priority?: string;
    assignedToAdminId?: string;
  }): Promise<SupportTicket[]>;
  getSupportTicket(id: string): Promise<SupportTicket | undefined>;
  createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined>;
  
  // Ticket reply operations
  getTicketReplies(ticketId: string): Promise<TicketReply[]>;
  createTicketReply(reply: InsertTicketReply): Promise<TicketReply>;
  
  // Support ticket with replies (for detailed view)
  getSupportTicketWithReplies(id: string): Promise<{
    ticket: SupportTicket;
    replies: TicketReply[];
    user: { id: string; firstName: string | null; lastName: string | null; email: string | null };
  } | undefined>;

  // CRM Lead operations
  getCrmLeads(contractorUserId: string, filters?: {
    status?: string;
    priority?: string;
    source?: string;
    searchQuery?: string;
  }): Promise<CrmLead[]>;
  getCrmLead(id: string): Promise<CrmLead | undefined>;
  createCrmLead(lead: InsertCrmLead): Promise<CrmLead>;
  updateCrmLead(id: string, lead: Partial<InsertCrmLead>): Promise<CrmLead | undefined>;
  deleteCrmLead(id: string): Promise<boolean>;
  
  // CRM Note operations
  getCrmNotes(leadId: string): Promise<CrmNote[]>;
  createCrmNote(note: InsertCrmNote): Promise<CrmNote>;
  updateCrmNote(id: string, note: Partial<InsertCrmNote>): Promise<CrmNote | undefined>;
  deleteCrmNote(id: string): Promise<boolean>;
  
  // CRM Integration operations
  getCrmIntegrations(contractorUserId: string, companyId?: string | null): Promise<CrmIntegration[]>;
  getCrmIntegration(id: string): Promise<CrmIntegration | undefined>;
  createCrmIntegration(integration: InsertCrmIntegration): Promise<CrmIntegration>;
  updateCrmIntegration(id: string, integration: Partial<InsertCrmIntegration>): Promise<CrmIntegration | undefined>;
  deleteCrmIntegration(id: string): Promise<boolean>;
  
  // Webhook Log operations
  getWebhookLogs(integrationId: string, limit?: number): Promise<WebhookLog[]>;
  createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog>;
  
  // CRM Lead with notes (for detailed view)
  getCrmLeadWithNotes(id: string): Promise<{
    lead: CrmLead;
    notes: CrmNote[];
  } | undefined>;
  
  // Error Tracking operations
  getErrorLogs(filters?: {
    errorType?: string;
    severity?: string;
    resolved?: boolean;
    userId?: string;
    limit?: number;
  }): Promise<ErrorLog[]>;
  getErrorLog(id: string): Promise<ErrorLog | undefined>;
  createErrorLog(error: InsertErrorLog): Promise<ErrorLog>;
  updateErrorLog(id: string, error: Partial<InsertErrorLog>): Promise<ErrorLog | undefined>;
  
  // Error Breadcrumb operations
  getErrorBreadcrumbs(errorLogId: string): Promise<ErrorBreadcrumb[]>;
  createErrorBreadcrumb(breadcrumb: InsertErrorBreadcrumb): Promise<ErrorBreadcrumb>;
  
  // Error Log with breadcrumbs (for detailed view)
  getErrorLogWithBreadcrumbs(id: string): Promise<{
    error: ErrorLog;
    breadcrumbs: ErrorBreadcrumb[];
  } | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private companies: Map<string, Company>;
  private companyInviteCodes: Map<string, CompanyInviteCode>;
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
  private reviewFlags: Map<string, ReviewFlag>;
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
  // Support ticket Maps
  private supportTickets: Map<string, SupportTicket>;
  private ticketReplies: Map<string, TicketReply>;
  // CRM Maps
  private crmLeads: Map<string, CrmLead>;
  private crmNotes: Map<string, CrmNote>;
  private crmIntegrations: Map<string, CrmIntegration>;
  private webhookLogs: Map<string, WebhookLog>;

  constructor() {
    this.users = new Map();
    this.companies = new Map();
    this.companyInviteCodes = new Map();
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
    this.reviewFlags = new Map();
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
    // Initialize support ticket Maps
    this.supportTickets = new Map();
    this.ticketReplies = new Map();
    // Initialize CRM Maps
    this.crmLeads = new Map();
    this.crmNotes = new Map();
    this.crmIntegrations = new Map();
    this.webhookLogs = new Map();
    
    // DEMO DATA PROTECTION: Only seed demo data if explicitly enabled
    if (isDemoDataEnabled()) {
      console.log('[DEMO DATA] Demo data seeding is ENABLED');
      this.seedData();
      // Seed demo homeowner data asynchronously
      this.seedHomeownerDemoData().catch(error => {
        console.error('[DEMO DATA] Failed to seed homeowner demo data:', error);
      });
      this.seedReviews();
    } else {
      console.log('[DEMO DATA] Demo data seeding is DISABLED (production environment or DISABLE_DEMO_DATA=true)');
    }
    
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
      // Company fields for contractors
      companyId: userData.companyId ?? existingUser?.companyId ?? null,
      companyRole: userData.companyRole ?? existingUser?.companyRole ?? null,
      canRespondToProposals: userData.canRespondToProposals ?? existingUser?.canRespondToProposals ?? false,
      // Subscription fields
      subscriptionPlanId: userData.subscriptionPlanId ?? existingUser?.subscriptionPlanId ?? null,
      subscriptionStatus: userData.subscriptionStatus ?? existingUser?.subscriptionStatus ?? 'inactive',
      maxHousesAllowed: userData.maxHousesAllowed ?? existingUser?.maxHousesAllowed ?? 2,
    };
    this.users.set(user.id, user);
    return user;
  }

  private seedData() {
    // DEMO DATA PROTECTION: Validate that seedData only uses demo IDs
    // Create demo homeowner user - Sarah Anderson
    const demoHomeownerId = "demo-homeowner-permanent-id";
    
    if (!demoHomeownerId.includes('demo')) {
      console.error('🛡️ DEMO DATA PROTECTION: seedData attempted to use non-demo homeowner ID!');
      return;
    }
    const demoHomeowner: User = {
      id: demoHomeownerId,
      email: "sarah.anderson@homebase.com",
      firstName: "Sarah",
      lastName: "Anderson",
      role: "homeowner",
      passwordHash: "$2a$10$7xmrE7Mz3zU4QgP5v4VyK.7TYgZ5RQb8BzqW6rH9nP5Q4vK7Y8b9K", // "demo123"
      referralCode: "DEMO4567",
      referredBy: null,
      referralCount: 2,
      subscriptionStatus: "active",
      subscriptionPlanId: "plan_homeowner_base",
      maxHousesAllowed: 2,
      isPremium: true,
      zipCode: "98101",
      profileImageUrl: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      companyId: null,
      companyRole: null,
      canRespondToProposals: false,
      createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      updatedAt: new Date(),
      isAdmin: false,
      inviteCode: null,
      trialEndDate: null,
    };
    this.users.set(demoHomeownerId, demoHomeowner);

    // Create Elite Roofing Solutions demo contractor
    const eliteRoofingUserId = "bellevue-roofer-001";
    const eliteRoofingCompanyId = "elite-roofing-company-001";
    
    // Set creation date to 2023 to show tenure
    const year2023 = new Date('2023-01-15T00:00:00Z');
    
    const eliteRoofingUser: User = {
      id: eliteRoofingUserId,
      email: "tom.chen@eliteroofing.com",
      firstName: "Tom",
      lastName: "Chen",
      role: "contractor",
      passwordHash: "$2a$10$7xmrE7Mz3zU4QgP5v4VyK.7TYgZ5RQb8BzqW6rH9nP5Q4vK7Y8b9K", // "demo123"
      referralCode: null,
      referredBy: null,
      referralCount: 0,
      subscriptionStatus: "active",
      subscriptionPlanId: "plan_contractor_base",
      maxHousesAllowed: 0,
      isPremium: true,
      zipCode: "98004",
      profileImageUrl: null,
      stripeCustomerId: null,
      stripeSubscriptionId: null,
      companyId: eliteRoofingCompanyId,
      companyRole: "owner",
      canRespondToProposals: true,
      createdAt: year2023,
      updatedAt: new Date(),
      isAdmin: false,
      inviteCode: null,
      trialEndDate: null,
    };
    this.users.set(eliteRoofingUserId, eliteRoofingUser);
    
    // Create Elite Roofing Solutions company
    const eliteRoofingCompany: Company = {
      id: eliteRoofingCompanyId,
      name: "Elite Roofing Solutions",
      ownerId: eliteRoofingUserId,
      location: "Bellevue, WA",
      address: "890 Commercial Blvd, Bellevue, WA 98004",
      countryId: "USA",
      regionId: "WA",
      postalCode: "98004",
      latitude: 47.6101,
      longitude: -122.2015,
      website: "https://eliteroofing.example.com",
      phone: "(425) 555-0199",
      email: "tom.chen@eliteroofing.com",
      bio: "Professional roofing contractor serving the greater Seattle area since 2023. Specializing in residential roof inspections, repairs, and replacements. Licensed and insured.",
      services: ["Roofing Services", "Roof Inspection", "Roof Repair", "Roof Replacement", "Emergency Services"],
      serviceRadius: 30,
      hasEmergencyServices: true,
      isLicensed: true,
      licenseNumber: "WA-ROOF-54321",
      licenseState: "WA",
      licenseExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      isInsured: true,
      insuranceProvider: "Travelers Insurance",
      insuranceExpiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      insuranceCoverageAmount: "$1,000,000",
      businessHours: "Mon-Sat: 8am-5pm, Sun: Closed",
      rating: "4.8",
      referralCode: "ELITE2023",
      businessLogo: null,
      projectPhotos: [],
      createdAt: year2023,
      updatedAt: new Date()
    };
    this.companies.set(eliteRoofingCompanyId, eliteRoofingCompany);

    // Create contractor profile for Elite Roofing Solutions
    const eliteRoofingContractor: Contractor = {
      id: eliteRoofingUserId,
      name: "Tom Chen",
      company: "Elite Roofing Solutions",
      companyId: eliteRoofingCompanyId,
      location: "Bellevue, WA",
      distance: "0",
      rating: "4.8",
      reviewCount: 12,
      services: ["Roofing Services", "Roof Inspection", "Roof Repair", "Roof Replacement", "Emergency Services"],
      bio: "Professional roofing contractor serving the greater Seattle area since 2023. Specializing in residential roof inspections, repairs, and replacements. Licensed and insured.",
      experience: "2",
      availability: "Available this week",
      profileImage: null,
      businessLogo: null,
      projectPhotos: [],
      hasEmergencyServices: true,
      phoneNumber: "(425) 555-0199",
      email: "tom.chen@eliteroofing.com",
      licenseNumber: "WA-ROOF-54321",
      zipCode: "98004",
      createdAt: year2023,
    };
    this.contractors.set(eliteRoofingUserId, eliteRoofingContractor);

    // No other seed contractors - contractors will register through the app
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

    // Add Sarah Anderson's two houses
    const sarahHouses: House[] = [
      {
        id: "8d44c1d0-af55-4f1c-bada-b70e54c823bc",
        homeownerId: demoHomeownerId,
        name: "Main Residence",
        address: "2847 Maple Drive, Seattle, WA 98112",
        climateZone: "Pacific Northwest",
        homeSystems: ["Central Air", "Gas Furnace", "Gas Water Heater", "Dishwasher", "Garbage Disposal", "Refrigerator"],
        isDefault: true,
        latitude: "47.6281",
        longitude: "-122.3121",
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000), // 6 months ago
      },
      {
        id: "f5c8a9d2-3e1b-4f7c-a6b3-8d9e5f2c1a4b", 
        homeownerId: demoHomeownerId,
        name: "Lake House",
        address: "1523 Lakefront Road, Bellevue, WA 98004",
        climateZone: "Pacific Northwest",
        homeSystems: ["Heat Pump", "Electric Water Heater", "Fireplace", "Well Water System"],
        isDefault: false,
        latitude: "47.6101",
        longitude: "-122.2015",
        createdAt: new Date(Date.now() - 150 * 24 * 60 * 60 * 1000), // 5 months ago
      }
    ];

    sarahHouses.forEach(house => {
      this.houses.set(house.id, house);
    });

    // Add demo home systems with installation years for Sarah's Main Residence
    const mainResidenceId = "8d44c1d0-af55-4f1c-bada-b70e54c823bc";
    const demoHomeSystems = [
      {
        id: randomUUID(),
        homeownerId: demoHomeownerId,
        houseId: mainResidenceId,
        systemType: "gas-furnace",
        brand: "Carrier",
        model: "59TN6",
        installationYear: 2007, // 17 years old - should trigger important/critical recommendation
        lastServiceYear: 2023,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        homeownerId: demoHomeownerId,
        houseId: mainResidenceId,
        systemType: "central-ac",
        brand: "Trane",
        model: "XR13",
        installationYear: 2010, // 14 years old - should trigger critical recommendation
        lastServiceYear: 2024,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        homeownerId: demoHomeownerId,
        houseId: mainResidenceId,
        systemType: "gas-water-heater",
        brand: "Rheem",
        model: "Performance Plus",
        installationYear: 2015, // 9 years old - approaching replacement
        lastServiceYear: 2024,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: randomUUID(),
        homeownerId: demoHomeownerId,
        houseId: mainResidenceId,
        systemType: "sump-pump",
        brand: "Wayne",
        model: "CDU980E",
        installationYear: 2018, // 6 years old
        lastServiceYear: null,
        notes: null,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    demoHomeSystems.forEach(system => {
      this.homeSystems.set(system.id, system);
    });
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

  // Company methods
  async getCompany(id: string): Promise<Company | undefined> {
    return this.companies.get(id);
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const newCompany: Company = {
      ...companyData,
      id: randomUUID(),
      rating: "0",
      reviewCount: 0,
      // Ensure required fields have default values to prevent NOT NULL constraint violations
      licenseNumber: companyData.licenseNumber || '',
      licenseMunicipality: companyData.licenseMunicipality || '',
      bio: companyData.bio || '',
      location: companyData.location || '',
      phone: companyData.phone || '',
      email: companyData.email || '',
      services: companyData.services || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.companies.set(newCompany.id, newCompany);
    return newCompany;
  }

  async updateCompany(id: string, companyData: Partial<InsertCompany>): Promise<Company | undefined> {
    const existingCompany = this.companies.get(id);
    if (!existingCompany) {
      return undefined;
    }

    const updatedCompany: Company = {
      ...existingCompany,
      ...companyData,
      updatedAt: new Date()
    };
    this.companies.set(id, updatedCompany);
    return updatedCompany;
  }

  async getCompanyEmployees(companyId: string): Promise<User[]> {
    const employees: User[] = [];
    for (const user of this.users.values()) {
      if (user.companyId === companyId) {
        employees.push(user);
      }
    }
    return employees;
  }

  // Company invite code methods
  async createCompanyInviteCode(inviteCodeData: InsertCompanyInviteCode): Promise<CompanyInviteCode> {
    const newInviteCode: CompanyInviteCode = {
      ...inviteCodeData,
      id: randomUUID(),
      isActive: inviteCodeData.isActive ?? true,
      usedBy: inviteCodeData.usedBy ?? null,
      usedAt: inviteCodeData.usedAt ?? null,
      expiresAt: inviteCodeData.expiresAt ?? null,
      createdAt: new Date()
    };
    this.companyInviteCodes.set(newInviteCode.id, newInviteCode);
    return newInviteCode;
  }

  async getCompanyInviteCode(id: string): Promise<CompanyInviteCode | undefined> {
    return this.companyInviteCodes.get(id);
  }

  async getCompanyInviteCodeByCode(code: string): Promise<CompanyInviteCode | undefined> {
    for (const inviteCode of this.companyInviteCodes.values()) {
      if (inviteCode.code === code) {
        return inviteCode;
      }
    }
    return undefined;
  }

  async getCompanyInviteCodes(companyId: string): Promise<CompanyInviteCode[]> {
    const codes: CompanyInviteCode[] = [];
    for (const inviteCode of this.companyInviteCodes.values()) {
      if (inviteCode.companyId === companyId) {
        codes.push(inviteCode);
      }
    }
    return codes;
  }

  async updateCompanyInviteCode(id: string, inviteCodeData: Partial<InsertCompanyInviteCode>): Promise<CompanyInviteCode | undefined> {
    const existingInviteCode = this.companyInviteCodes.get(id);
    if (!existingInviteCode) {
      return undefined;
    }

    const updatedInviteCode: CompanyInviteCode = {
      ...existingInviteCode,
      ...inviteCodeData
    };
    this.companyInviteCodes.set(id, updatedInviteCode);
    return updatedInviteCode;
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
  async getMaintenanceLogs(homeownerId?: string, houseId?: string): Promise<MaintenanceLog[]> {
    const logs = Array.from(this.maintenanceLogs.values());
    
    let filtered = logs;
    
    if (homeownerId) {
      filtered = filtered.filter(log => log.homeownerId === homeownerId);
    }
    
    if (houseId) {
      filtered = filtered.filter(log => log.houseId === houseId);
    }
    
    return filtered.sort((a, b) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());
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

  async getContractorNotifications(contractorId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    return notifications.filter(notification => 
      notification.contractorId === contractorId
    ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getUnreadContractorNotifications(contractorId: string): Promise<Notification[]> {
    const notifications = Array.from(this.notifications.values());
    return notifications.filter(notification => 
      notification.contractorId === contractorId && !notification.isRead
    );
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
  async searchContractors(query: string, location?: string, services?: string[], maxDistance?: number): Promise<Contractor[]> {
    let contractors = Array.from(this.contractors.values());
    
    // Filter by services - include both exact matches AND handymen (who can do most basic repairs)
    if (services && services.length > 0) {
      contractors = contractors.filter(contractor => {
        // Check if contractor offers the requested service(s)
        const hasRequestedService = contractor.services.some(contractorService => 
          services.some(requestedService => 
            contractorService.toLowerCase() === requestedService.toLowerCase()
          )
        );
        
        // Also include handymen for most searches (they handle basic repairs)
        const excludeHandymanServices = [
          'roofing services',
          'hvac services',
          'septic services',
          'pool installation',
          'custom home building',
          'general contracting'
        ];
        
        const isHandyman = contractor.services.some(s => 
          s.toLowerCase() === 'handyman services'
        );
        
        const shouldIncludeHandyman = isHandyman && 
          !services.some(s => excludeHandymanServices.includes(s.toLowerCase()));
        
        return hasRequestedService || shouldIncludeHandyman;
      });
    }
    
    return contractors.filter(contractor => {
      const matchesQuery = query === "" || 
        contractor.name.toLowerCase().includes(query.toLowerCase()) ||
        contractor.company.toLowerCase().includes(query.toLowerCase()) ||
        contractor.bio.toLowerCase().includes(query.toLowerCase()) ||
        contractor.services.some(service => service.toLowerCase().includes(query.toLowerCase()));
      
      const matchesLocation = !location || 
        contractor.location.toLowerCase().includes(location.toLowerCase());
      
      // Two-way radius check: both contractor's service radius AND homeowner's search radius must intersect
      let radiiIntersect = true;
      if (contractor.distance) {
        const distance = parseFloat(contractor.distance);
        const contractorReachesHomeowner = contractor.serviceRadius >= distance;
        const homeownerReachesContractor = !maxDistance || distance <= maxDistance;
        radiiIntersect = contractorReachesHomeowner && homeownerReachesContractor;
      }
      
      return matchesQuery && matchesLocation && radiiIntersect;
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
        name: profileData.name || 'Contractor',
        company: profileData.company || 'My Company',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        postalCode: profileData.postalCode || null,
        serviceRadius: profileData.serviceRadius || 25,
        services: profileData.services || [],
        hasEmergencyServices: profileData.hasEmergencyServices || false,
        website: profileData.website || null,
        facebook: profileData.facebook || null,
        instagram: profileData.instagram || null,
        linkedin: profileData.linkedin || null,
        googleBusinessUrl: profileData.googleBusinessUrl || null,
        bio: profileData.bio || 'Professional contractor',
        experience: profileData.experience || 0,
        location: profileData.location || 'Not specified',
        rating: '0.00',
        reviewCount: 0,
        distance: null,
        profileImage: profileData.profileImage || null,
        businessLogo: profileData.businessLogo || null,
        projectPhotos: profileData.projectPhotos || [],
        licenseNumber: profileData.licenseNumber || 'Pending',
        licenseMunicipality: profileData.licenseMunicipality || 'Not specified',
        isLicensed: profileData.isLicensed !== undefined ? profileData.isLicensed : true,
        countryId: profileData.countryId || null,
        regionId: profileData.regionId || null,
        licenses: profileData.licenses || null,
        insuranceInfo: profileData.insuranceInfo || null,
        createdAt: new Date(),
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

  async getServiceRecordsByHomeowner(homeownerId: string, houseId?: string): Promise<ServiceRecord[]> {
    let filtered = this.serviceRecords.filter(record => 
      record.homeownerId === homeownerId && record.isVisibleToHomeowner !== false
    );
    
    if (houseId) {
      filtered = filtered.filter(record => record.houseId === houseId);
    }
    
    return filtered;
  }

  async getServiceRecord(id: string): Promise<ServiceRecord | undefined> {
    return this.serviceRecords.find(record => record.id === id);
  }

  async createServiceRecord(serviceRecord: InsertServiceRecord): Promise<ServiceRecord> {
    const newRecord: ServiceRecord = {
      ...serviceRecord,
      id: randomUUID(),
      homeownerId: serviceRecord.homeownerId ?? null,
      houseId: serviceRecord.houseId ?? null,
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

  async getContactedHomeowners(contractorId: string): Promise<(User & { lastContactedAt: Date })[]> {
    const conversations = Array.from(this.conversations.values());
    const contractorConversations = conversations.filter(conv => conv.contractorId === contractorId);
    
    const homeownerMap = new Map<string, Date>();
    contractorConversations.forEach(conv => {
      const lastContactedAt = conv.lastMessageAt || conv.createdAt;
      if (lastContactedAt) {
        const existingDate = homeownerMap.get(conv.homeownerId);
        if (!existingDate || new Date(lastContactedAt) > existingDate) {
          homeownerMap.set(conv.homeownerId, new Date(lastContactedAt));
        }
      }
    });
    
    const homeowners = Array.from(homeownerMap.entries()).map(([homeownerId, lastContactedAt]) => {
      const user = this.users.get(homeownerId);
      if (user) {
        return { ...user, lastContactedAt };
      }
      return null;
    }).filter((h): h is User & { lastContactedAt: Date } => h !== null);
    
    return homeowners.sort((a, b) => b.lastContactedAt.getTime() - a.lastContactedAt.getTime());
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

  async getAllReviews(): Promise<ContractorReview[]> {
    return Array.from(this.contractorReviews.values());
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

  // Review flag operations
  async createReviewFlag(flagData: InsertReviewFlag): Promise<ReviewFlag> {
    const id = randomUUID();
    const flag: ReviewFlag = {
      ...flagData,
      id,
      status: flagData.status || 'pending',
      reviewedBy: flagData.reviewedBy || null,
      resolution: flagData.resolution || null,
      notes: flagData.notes || null,
      createdAt: new Date(),
      resolvedAt: flagData.resolvedAt || null,
    };
    
    this.reviewFlags.set(id, flag);
    return flag;
  }

  async getReviewFlags(status?: string): Promise<ReviewFlag[]> {
    const flags = Array.from(this.reviewFlags.values());
    if (status) {
      return flags.filter(f => f.status === status);
    }
    return flags;
  }

  async getReviewFlag(id: string): Promise<ReviewFlag | undefined> {
    return this.reviewFlags.get(id);
  }

  async updateReviewFlag(id: string, flagData: Partial<InsertReviewFlag>): Promise<ReviewFlag | undefined> {
    const flag = this.reviewFlags.get(id);
    if (!flag) {
      return undefined;
    }
    
    const updatedFlag: ReviewFlag = {
      ...flag,
      ...flagData,
    };
    
    this.reviewFlags.set(id, updatedFlag);
    return updatedFlag;
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

  private async seedHomeownerDemoData() {
    // DEMO DATA PROTECTION: Extra validation to ensure this function only uses demo IDs
    const demoHomeownerId = "demo-homeowner-permanent-id";
    const mainHouseId = "8d44c1d0-af55-4f1c-bada-b70e54c823bc";
    const lakeHouseId = "f5c8a9d2-3e1b-4f7c-a6b3-8d9e5f2c1a4b";
    
    // Validate all IDs contain "demo" prefix or are known house UUIDs for demo purposes
    if (!demoHomeownerId.includes('demo')) {
      console.error('🛡️ DEMO DATA PROTECTION: seedHomeownerDemoData attempted to use non-demo homeowner ID!');
      return;
    }
    
    // 14 DIY maintenance logs spread over 6 months with total savings of $1,360
    // Using deterministic IDs for idempotent seeding
    const diyMaintenanceLogsData = [
      // Main Residence - Month 1 (6 months ago)
      {
        id: "maint-log-demo-001",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Plumbing",
        serviceDate: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Kitchen",
        serviceDescription: "Replaced leaky kitchen faucet (DIY)",
        cost: "45.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "135.00", // $180 - $45
        notes: "Watched YouTube tutorial and replaced faucet myself. Saved on labor costs!",
        createdAt: new Date(Date.now() - 175 * 24 * 60 * 60 * 1000),
      },
      {
        id: "maint-log-demo-002",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "HVAC",
        serviceDate: new Date(Date.now() - 170 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "HVAC System",
        serviceDescription: "Replaced HVAC air filters (DIY)",
        cost: "35.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "85.00", // $120 - $35
        notes: "Quarterly maintenance completed",
        createdAt: new Date(Date.now() - 170 * 24 * 60 * 60 * 1000),
      },
      // Main Residence - Month 2 (5 months ago)
      {
        id: "maint-log-demo-003",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Electrical",
        serviceDate: new Date(Date.now() - 145 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Bedroom",
        serviceDescription: "Installed new ceiling fan in bedroom (DIY)",
        cost: "89.99",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "160.01", // $250 - $89.99
        notes: "Home Depot clearance find! Installation was easier than expected.",
        createdAt: new Date(Date.now() - 145 * 24 * 60 * 60 * 1000),
      },
      {
        id: "maint-log-demo-004",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Landscaping",
        serviceDate: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Yard",
        serviceDescription: "Spring yard cleanup and mulching (DIY)",
        cost: "65.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "135.00", // $200 - $65
        notes: "Spent weekend on yard work - looks great!",
        createdAt: new Date(Date.now() - 140 * 24 * 60 * 60 * 1000),
      },
      // Lake House - Month 2
      {
        id: "maint-log-demo-005",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        serviceType: "Plumbing",
        serviceDate: new Date(Date.now() - 135 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Bathroom",
        serviceDescription: "Fixed running toilet (DIY)",
        cost: "12.50",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "82.50", // $95 - $12.50
        notes: "New flapper valve from hardware store",
        createdAt: new Date(Date.now() - 135 * 24 * 60 * 60 * 1000),
      },
      // Main Residence - Month 3 (4 months ago)
      {
        id: "maint-log-demo-006",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Painting",
        serviceDate: new Date(Date.now() - 115 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Living Room",
        serviceDescription: "Painted living room walls (DIY)",
        cost: "120.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "330.00", // $450 - $120
        notes: "Fresh coat of paint makes such a difference!",
        createdAt: new Date(Date.now() - 115 * 24 * 60 * 60 * 1000),
      },
      {
        id: "maint-log-demo-007",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "General Maintenance",
        serviceDate: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Bathroom",
        serviceDescription: "Caulked bathroom tiles (DIY)",
        cost: "8.99",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "66.01", // $75 - $8.99
        notes: "Prevented water damage with fresh caulk",
        createdAt: new Date(Date.now() - 110 * 24 * 60 * 60 * 1000),
      },
      // Main Residence - Month 4 (3 months ago)
      {
        id: "maint-log-demo-008",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Appliance Repair",
        serviceDate: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Kitchen",
        serviceDescription: "Replaced dishwasher spray arm (DIY)",
        cost: "22.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "128.00", // $150 - $22
        notes: "Much cheaper than calling a repair service!",
        createdAt: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
      },
      {
        id: "maint-log-demo-009",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Flooring",
        serviceDate: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Hallway",
        serviceDescription: "Refined hardwood floors in hallway (DIY)",
        cost: "95.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "285.00", // $380 - $95
        notes: "Rented sander and did it myself over the weekend",
        createdAt: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
      },
      // Lake House - Month 4
      {
        id: "maint-log-demo-010",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        serviceType: "Deck & Patio",
        serviceDate: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Deck",
        serviceDescription: "Power washed and stained deck (DIY)",
        cost: "78.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "242.00", // $320 - $78
        notes: "Deck looks brand new!",
        createdAt: new Date(Date.now() - 75 * 24 * 60 * 60 * 1000),
      },
      // Main Residence - Month 5 (2 months ago)
      {
        id: "maint-log-demo-011",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Windows & Doors",
        serviceDate: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Doors",
        serviceDescription: "Installed weatherstripping on doors (DIY)",
        cost: "25.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "85.00", // $110 - $25
        notes: "Reduced drafts and energy bills",
        createdAt: new Date(Date.now() - 55 * 24 * 60 * 60 * 1000),
      },
      // Lake House - Month 5
      {
        id: "maint-log-demo-012",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        serviceType: "General Maintenance",
        serviceDate: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Living Room",
        serviceDescription: "Cleaned and maintained fireplace (DIY)",
        cost: "15.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "110.00", // $125 - $15
        notes: "Ready for winter!",
        createdAt: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000),
      },
      // Main Residence - Month 6 (1 month ago)
      {
        id: "maint-log-demo-013",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Gutter Cleaning",
        serviceDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Exterior",
        serviceDescription: "Cleaned gutters and downspouts (DIY)",
        cost: "0.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "150.00", // $150 - $0
        notes: "Used ladder and garden hose - free!",
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
      },
      {
        id: "maint-log-demo-014",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Pest Control",
        serviceDate: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Exterior",
        serviceDescription: "Sealed cracks and applied pest prevention (DIY)",
        cost: "32.00",
        contractorName: null,
        contractorCompany: null,
        contractorId: null,
        completionMethod: "diy",
        diySavingsAmount: "143.00", // $175 - $32
        notes: "Preventive maintenance before summer",
        createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
      },
      // CONTRACTOR-PERFORMED SERVICES (to show "Previously Used" contractors)
      // Main Residence - Contractor HVAC Service (3 months ago)
      {
        id: "maint-log-contractor-001",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "HVAC Services",
        serviceDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Whole House",
        serviceDescription: "Annual HVAC maintenance and tune-up",
        cost: "185.00",
        contractorName: "Mike Johnson",
        contractorCompany: "Quality Home Services LLC",
        contractorId: "seattle-plumber-001",
        completionMethod: "contractor",
        diySavingsAmount: null,
        notes: "Great service - system running efficiently",
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
      // Main Residence - Contractor Electrical Work (2 months ago)
      {
        id: "maint-log-contractor-002",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        serviceType: "Electrical Services",
        serviceDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Kitchen",
        serviceDescription: "Installed new ceiling fan and dimmer switches",
        cost: "275.00",
        contractorName: "Mike Johnson",
        contractorCompany: "Quality Home Services LLC",
        contractorId: "seattle-plumber-001",
        completionMethod: "contractor",
        diySavingsAmount: null,
        notes: "Professional work, highly recommend",
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
      // Lake House - Contractor Plumbing (1.5 months ago)
      {
        id: "maint-log-contractor-003",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        serviceType: "Plumbing Services",
        serviceDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Bathroom",
        serviceDescription: "Replaced water heater",
        cost: "1250.00",
        contractorName: "Mike Johnson",
        contractorCompany: "Quality Home Services LLC",
        contractorId: "seattle-plumber-001",
        completionMethod: "contractor",
        diySavingsAmount: null,
        notes: "Quick and efficient installation",
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      // Lake House - Contractor Roofing (1 month ago)
      {
        id: "maint-log-contractor-004",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        serviceType: "Roofing Services",
        serviceDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        homeArea: "Exterior",
        serviceDescription: "Roof inspection and minor repairs",
        cost: "425.00",
        contractorName: "Tom Chen",
        contractorCompany: "Elite Roofing Solutions",
        contractorId: "bellevue-roofer-001",
        completionMethod: "contractor",
        diySavingsAmount: null,
        notes: "Found and fixed several loose shingles",
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    ];

    // Insert DIY maintenance logs into database with idempotent seeding
    try {
      await Promise.all(diyMaintenanceLogsData.map(async (log) => {
        await db.insert(maintenanceLogs).values(log).onConflictDoNothing();
      }));
      console.log('[DEMO DATA] Seeded 18 maintenance logs for Sarah Anderson (14 DIY + 4 contractor) (idempotent)');
    } catch (error) {
      console.error('[DEMO DATA] Error inserting DIY maintenance logs:', error);
    }

    // Add 15 completed seasonal maintenance tasks for home health score calculation
    // Spanning May-November 2025 across both houses
    // Using deterministic UUIDs for idempotent seeding
    const taskCompletionsData = [
      // Main Residence - May 2025
      {
        id: "task-comp-demo-001",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Check and clean AC filters",
        taskCategory: "HVAC",
        year: 2025,
        month: 5,
        completedAt: new Date(2025, 4, 15),
        completionMethod: "diy",
        costSavings: "80",
        notes: "Cleaned filters before summer season",
        createdAt: new Date(2025, 4, 15),
      },
      {
        id: "task-comp-demo-002",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Inspect roof and gutters",
        taskCategory: "Roofing",
        year: 2025,
        month: 5,
        completedAt: new Date(2025, 4, 20),
        completionMethod: "diy",
        costSavings: "150",
        notes: "Everything looks good for summer",
        createdAt: new Date(2025, 4, 20),
      },
      // Lake House - May 2025
      {
        id: "task-comp-demo-003",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        taskType: "maintenance",
        taskTitle: "Test well water system",
        taskCategory: "Plumbing",
        year: 2025,
        month: 5,
        completedAt: new Date(2025, 4, 25),
        completionMethod: "diy",
        costSavings: "120",
        notes: "Well pump working perfectly",
        createdAt: new Date(2025, 4, 25),
      },
      // Main Residence - June 2025
      {
        id: "task-comp-demo-004",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Service lawn mower and outdoor equipment",
        taskCategory: "Landscaping",
        year: 2025,
        month: 6,
        completedAt: new Date(2025, 5, 10),
        completionMethod: "diy",
        costSavings: "90",
        notes: "Ready for lawn care season",
        createdAt: new Date(2025, 5, 10),
      },
      {
        id: "task-comp-demo-005",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Check exterior paint and siding",
        taskCategory: "Exterior",
        year: 2025,
        month: 6,
        completedAt: new Date(2025, 5, 18),
        completionMethod: "diy",
        costSavings: "0",
        notes: "No issues found",
        createdAt: new Date(2025, 5, 18),
      },
      // Lake House - July 2025
      {
        id: "task-comp-demo-006",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        taskType: "maintenance",
        taskTitle: "Clean and maintain dock",
        taskCategory: "Deck & Patio",
        year: 2025,
        month: 7,
        completedAt: new Date(2025, 6, 4),
        completionMethod: "diy",
        costSavings: "200",
        notes: "Power washed and inspected",
        createdAt: new Date(2025, 6, 4),
      },
      // Main Residence - August 2025
      {
        id: "task-comp-demo-007",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Deep clean and service refrigerator",
        taskCategory: "Appliances",
        year: 2025,
        month: 8,
        completedAt: new Date(2025, 7, 12),
        completionMethod: "diy",
        costSavings: "75",
        notes: "Cleaned coils and checked seals",
        createdAt: new Date(2025, 7, 12),
      },
      {
        id: "task-comp-demo-008",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Inspect and maintain water heater",
        taskCategory: "Plumbing",
        year: 2025,
        month: 8,
        completedAt: new Date(2025, 7, 22),
        completionMethod: "diy",
        costSavings: "110",
        notes: "Drained tank and checked anode rod",
        createdAt: new Date(2025, 7, 22),
      },
      // Lake House - September 2025
      {
        id: "task-comp-demo-009",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        taskType: "maintenance",
        taskTitle: "Prepare fireplace for winter",
        taskCategory: "Heating",
        year: 2025,
        month: 9,
        completedAt: new Date(2025, 8, 15),
        completionMethod: "diy",
        costSavings: "125",
        notes: "Cleaned chimney and inspected",
        createdAt: new Date(2025, 8, 15),
      },
      // Main Residence - October 2025
      {
        id: "task-comp-demo-010",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Clean gutters and downspouts",
        taskCategory: "Roofing",
        year: 2025,
        month: 10,
        completedAt: new Date(2025, 9, 8),
        completionMethod: "diy",
        costSavings: "150",
        notes: "Removed fall leaves",
        createdAt: new Date(2025, 9, 8),
      },
      {
        id: "task-comp-demo-011",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Winterize outdoor faucets",
        taskCategory: "Plumbing",
        year: 2025,
        month: 10,
        completedAt: new Date(2025, 9, 20),
        completionMethod: "diy",
        costSavings: "80",
        notes: "Disconnected hoses and shut off valves",
        createdAt: new Date(2025, 9, 20),
      },
      // Lake House - October 2025
      {
        id: "task-comp-demo-012",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        taskType: "maintenance",
        taskTitle: "Winterize plumbing system",
        taskCategory: "Plumbing",
        year: 2025,
        month: 10,
        completedAt: new Date(2025, 9, 25),
        completionMethod: "diy",
        costSavings: "180",
        notes: "Drained pipes for winter",
        createdAt: new Date(2025, 9, 25),
      },
      // Main Residence - November 2025
      {
        id: "task-comp-demo-013",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Test heating system before winter",
        taskCategory: "HVAC",
        year: 2025,
        month: 11,
        completedAt: new Date(2025, 10, 5),
        completionMethod: "diy",
        costSavings: "100",
        notes: "Furnace running smoothly",
        createdAt: new Date(2025, 10, 5),
      },
      {
        id: "task-comp-demo-014",
        homeownerId: demoHomeownerId,
        houseId: mainHouseId,
        taskType: "maintenance",
        taskTitle: "Check weatherstripping on doors and windows",
        taskCategory: "Windows & Doors",
        year: 2025,
        month: 11,
        completedAt: new Date(2025, 10, 12),
        completionMethod: "diy",
        costSavings: "85",
        notes: "Replaced worn weatherstripping",
        createdAt: new Date(2025, 10, 12),
      },
      // Lake House - November 2025
      {
        id: "task-comp-demo-015",
        homeownerId: demoHomeownerId,
        houseId: lakeHouseId,
        taskType: "maintenance",
        taskTitle: "Close up lake house for winter",
        taskCategory: "General Maintenance",
        year: 2025,
        month: 11,
        completedAt: new Date(2025, 10, 18),
        completionMethod: "diy",
        costSavings: "250",
        notes: "Winterization complete",
        createdAt: new Date(2025, 10, 18),
      },
    ];

    // Insert task completions into database
    try {
      await Promise.all(taskCompletionsData.map(async (task) => {
        await db.insert(taskCompletions).values(task).onConflictDoNothing();
      }));
      console.log('[DEMO DATA] Inserted 15 task completions for Sarah Anderson');
    } catch (error) {
      console.error('[DEMO DATA] Error inserting task completions:', error);
    }

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
    serviceRecordsTransferred: number;
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
    let serviceRecordsTransferred = 0;

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

    // Transfer service records (database-backed, handled by DbStorage)
    // MemStorage doesn't have service records, so this stays at 0 for in-memory

    return {
      maintenanceLogsTransferred,
      appliancesTransferred,
      appointmentsTransferred,
      customTasksTransferred,
      homeSystemsTransferred,
      serviceRecordsTransferred,
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
    try {
      const result = await db.select()
        .from(taskOverrides)
        .where(and(
          eq(taskOverrides.homeownerId, homeownerId),
          eq(taskOverrides.houseId, houseId)
        ));
      return result;
    } catch (error) {
      console.error("Error fetching task overrides from database:", error);
      return [];
    }
  }

  async getTaskOverride(homeownerId: string, houseId: string, taskId: string): Promise<TaskOverride | undefined> {
    try {
      const result = await db.select()
        .from(taskOverrides)
        .where(and(
          eq(taskOverrides.homeownerId, homeownerId),
          eq(taskOverrides.houseId, houseId),
          eq(taskOverrides.taskId, taskId)
        ))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error("Error fetching task override from database:", error);
      return undefined;
    }
  }

  async upsertTaskOverride(overrideData: InsertTaskOverride): Promise<TaskOverride> {
    try {
      const result = await db.insert(taskOverrides)
        .values({
          homeownerId: overrideData.homeownerId,
          houseId: overrideData.houseId,
          taskId: overrideData.taskId,
          isEnabled: overrideData.isEnabled ?? true,
          frequencyType: overrideData.frequencyType || null,
          frequencyValue: overrideData.frequencyValue || null,
          specificMonths: overrideData.specificMonths || null,
          customDescription: overrideData.customDescription || null,
          notes: overrideData.notes || null,
        })
        .onConflictDoUpdate({
          target: [taskOverrides.homeownerId, taskOverrides.houseId, taskOverrides.taskId],
          set: {
            isEnabled: overrideData.isEnabled ?? true,
            frequencyType: overrideData.frequencyType || null,
            frequencyValue: overrideData.frequencyValue || null,
            specificMonths: overrideData.specificMonths || null,
            customDescription: overrideData.customDescription || null,
            notes: overrideData.notes || null,
            updatedAt: new Date(),
          },
        })
        .returning();
      return result[0];
    } catch (error) {
      console.error("Error upserting task override:", error);
      throw error;
    }
  }

  async deleteTaskOverride(homeownerId: string, houseId: string, taskId: string): Promise<boolean> {
    try {
      const result = await db.delete(taskOverrides)
        .where(and(
          eq(taskOverrides.homeownerId, homeownerId),
          eq(taskOverrides.houseId, houseId),
          eq(taskOverrides.taskId, taskId)
        ))
        .returning();
      return result.length > 0;
    } catch (error) {
      console.error("Error deleting task override:", error);
      return false;
    }
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

  async getHouseDIYSavings(houseId: string): Promise<{ totalSavings: number; taskCount: number }> {
    const result = await db.select({
      totalSavings: sql<number>`COALESCE(SUM(${taskCompletions.costSavings}), 0)`,
      taskCount: sql<number>`COUNT(*)`
    })
      .from(taskCompletions)
      .where(and(
        eq(taskCompletions.houseId, houseId),
        eq(taskCompletions.completionMethod, 'diy'),
        isNotNull(taskCompletions.costSavings)
      ));
    
    return {
      totalSavings: parseFloat(result[0]?.totalSavings?.toString() || '0'),
      taskCount: parseInt(result[0]?.taskCount?.toString() || '0', 10)
    };
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
    
    // PRE-AGGREGATE all savings data once to avoid repeated queries
    const savingsCompletions = await db.select().from(taskCompletions)
      .where(eq(taskCompletions.homeownerId, homeownerId))
      .where(isNotNull(taskCompletions.costSavings));
    
    const tasksWithSavings = savingsCompletions.filter(c => 
      c.costSavings && parseFloat(c.costSavings.toString()) > 0
    );
    
    // Calculate aggregated savings metrics once
    const savingsMetrics = {
      totalSavings: tasksWithSavings.reduce((sum, c) => sum + parseFloat(c.costSavings!.toString()), 0),
      underBudgetCount: tasksWithSavings.length,
      avgSavingsPerTask: tasksWithSavings.length > 0 
        ? tasksWithSavings.reduce((sum, c) => sum + parseFloat(c.costSavings!.toString()), 0) / tasksWithSavings.length 
        : 0,
      monthsWithSavings: new Map<string, number>(),
      quarterSavings: new Map<string, number>(),
      maxConsecutiveMonths: 0
    };
    
    // Group by month and quarter
    for (const completion of tasksWithSavings) {
      if (completion.completedAt) {
        const year = completion.completedAt.getFullYear();
        const month = completion.completedAt.getMonth() + 1;
        const monthKey = `${year}-${String(month).padStart(2, '0')}`;
        const quarter = Math.floor((month - 1) / 3) + 1;
        const quarterKey = `${year}-Q${quarter}`;
        
        savingsMetrics.monthsWithSavings.set(monthKey, (savingsMetrics.monthsWithSavings.get(monthKey) || 0) + 1);
        
        const savings = parseFloat(completion.costSavings!.toString());
        savingsMetrics.quarterSavings.set(quarterKey, (savingsMetrics.quarterSavings.get(quarterKey) || 0) + savings);
      }
    }
    
    // Calculate consecutive month streak using proper calendar arithmetic
    if (savingsMetrics.monthsWithSavings.size > 0) {
      const sortedMonths = Array.from(savingsMetrics.monthsWithSavings.keys()).sort();
      let currentStreak = 1;
      let maxStreak = 1;
      
      for (let i = 1; i < sortedMonths.length; i++) {
        const [prevYear, prevMonth] = sortedMonths[i - 1].split('-').map(Number);
        const [currYear, currMonth] = sortedMonths[i].split('-').map(Number);
        
        // Check if months are consecutive using proper calendar arithmetic
        let isConsecutive = false;
        if (currYear === prevYear && currMonth === prevMonth + 1) {
          isConsecutive = true;
        } else if (currYear === prevYear + 1 && prevMonth === 12 && currMonth === 1) {
          // Handle year rollover
          isConsecutive = true;
        }
        
        if (isConsecutive) {
          currentStreak++;
          maxStreak = Math.max(maxStreak, currentStreak);
        } else {
          currentStreak = 1;
        }
      }
      
      savingsMetrics.maxConsecutiveMonths = maxStreak;
    }
    
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
          
          const requiredCount = criteria.count || 5;
          progress = Math.min(100, (seasonalCompletions.length / requiredCount) * 100);
          isCompleted = seasonalCompletions.length >= requiredCount;
          break;
        }
        
        case 'all_seasons': {
          // Check if user completed tasks in all 4 seasons in current year
          const seasonMonths: Record<string, number[]> = {
            winter: [12, 1, 2],
            spring: [3, 4, 5],
            summer: [6, 7, 8],
            fall: [9, 10, 11]
          };
          
          const currentYear = new Date().getFullYear();
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId))
            .where(eq(taskCompletions.year, currentYear));
          
          const seasonsCompleted = new Set<string>();
          for (const completion of completions) {
            for (const [season, months] of Object.entries(seasonMonths)) {
              if (months.includes(completion.month)) {
                seasonsCompleted.add(season);
              }
            }
          }
          
          progress = Math.min(100, (seasonsCompleted.size / 4) * 100);
          isCompleted = seasonsCompleted.size === 4;
          break;
        }
        
        case 'seasonal_peak': {
          // Check if user completed X+ tasks in any single season
          const seasonMonths: Record<string, number[]> = {
            winter: [12, 1, 2],
            spring: [3, 4, 5],
            summer: [6, 7, 8],
            fall: [9, 10, 11]
          };
          
          const currentYear = new Date().getFullYear();
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId))
            .where(eq(taskCompletions.year, currentYear));
          
          const seasonCounts: Record<string, number> = {
            winter: 0,
            spring: 0,
            summer: 0,
            fall: 0
          };
          
          for (const completion of completions) {
            for (const [season, months] of Object.entries(seasonMonths)) {
              if (months.includes(completion.month)) {
                seasonCounts[season]++;
              }
            }
          }
          
          const maxSeasonalTasks = Math.max(...Object.values(seasonCounts));
          progress = Math.min(100, (maxSeasonalTasks / criteria.count) * 100);
          isCompleted = maxSeasonalTasks >= criteria.count;
          break;
        }
        
        case 'year_round':
        case 'seasonal_consistency': {
          // Check if user completed min tasks in each season
          const seasonMonths: Record<string, number[]> = {
            winter: [12, 1, 2],
            spring: [3, 4, 5],
            summer: [6, 7, 8],
            fall: [9, 10, 11]
          };
          
          const currentYear = new Date().getFullYear();
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId))
            .where(eq(taskCompletions.year, currentYear));
          
          const seasonCounts: Record<string, number> = {
            winter: 0,
            spring: 0,
            summer: 0,
            fall: 0
          };
          
          for (const completion of completions) {
            for (const [season, months] of Object.entries(seasonMonths)) {
              if (months.includes(completion.month)) {
                seasonCounts[season]++;
              }
            }
          }
          
          const minPerSeason = criteria.min_per_season || 3;
          const seasonsMetTarget = Object.values(seasonCounts).filter(count => count >= minPerSeason).length;
          
          progress = Math.min(100, (seasonsMetTarget / 4) * 100);
          isCompleted = seasonsMetTarget === 4;
          break;
        }
        
        case 'under_budget': {
          // Use pre-aggregated data
          progress = Math.min(100, (savingsMetrics.underBudgetCount / criteria.count) * 100);
          isCompleted = savingsMetrics.underBudgetCount >= criteria.count;
          break;
        }
        
        case 'total_savings': {
          // Use pre-aggregated data
          progress = Math.min(100, (savingsMetrics.totalSavings / criteria.amount) * 100);
          isCompleted = savingsMetrics.totalSavings >= criteria.amount;
          break;
        }
        
        case 'consecutive_savings_months': {
          // Use pre-calculated streak (now with proper calendar arithmetic)
          progress = Math.min(100, (savingsMetrics.maxConsecutiveMonths / criteria.count) * 100);
          isCompleted = savingsMetrics.maxConsecutiveMonths >= criteria.count;
          break;
        }
        
        case 'average_savings_per_task': {
          // Improved progress visibility
          const minTasks = criteria.min_tasks || 10;
          
          if (tasksWithSavings.length < minTasks) {
            // Show progress toward reaching minimum tasks required
            progress = (tasksWithSavings.length / minTasks) * 50; // First 50% is reaching min tasks
            isCompleted = false;
            break;
          }
          
          // Once min tasks met, show progress based on average savings
          const taskProgress = 50; // Already met min tasks
          const avgProgress = Math.min(50, (savingsMetrics.avgSavingsPerTask / criteria.amount) * 50);
          progress = taskProgress + avgProgress;
          isCompleted = savingsMetrics.avgSavingsPerTask >= criteria.amount;
          break;
        }
        
        case 'quarterly_savings': {
          // Use pre-aggregated quarterly data
          const maxQuarterlySavings = savingsMetrics.quarterSavings.size > 0
            ? Math.max(...Array.from(savingsMetrics.quarterSavings.values()))
            : 0;
          
          progress = Math.min(100, (maxQuarterlySavings / criteria.amount) * 100);
          isCompleted = maxQuarterlySavings >= criteria.amount;
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
        
        case 'detailed_logs': {
          const logs = await db.select().from(maintenanceLogs)
            .where(eq(maintenanceLogs.homeownerId, homeownerId));
          
          // Count logs with detailed descriptions (50+ characters)
          const detailedLogs = logs.filter(log => 
            log.description && log.description.length >= 50
          );
          
          progress = Math.min(100, (detailedLogs.length / criteria.count) * 100);
          isCompleted = detailedLogs.length >= criteria.count;
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
        
        case 'referrals': {
          // Get user's referral count
          const user = await this.getUser(homeownerId);
          const referralCount = user?.referralCount || 0;
          
          progress = Math.min(100, (referralCount / criteria.count) * 100);
          isCompleted = referralCount >= criteria.count;
          break;
        }
        
        case 'contractor_hired': {
          // Count unique contractor hires
          const acceptedProposals = await db.select().from(proposals)
            .where(eq(proposals.homeownerId, homeownerId))
            .where(eq(proposals.status, 'accepted'));
          
          progress = Math.min(100, (acceptedProposals.length / criteria.count) * 100);
          isCompleted = acceptedProposals.length >= criteria.count;
          break;
        }
        
        case 'multi_property': {
          // Count user's houses
          const userHouses = await db.select().from(houses)
            .where(eq(houses.homeownerId, homeownerId));
          
          progress = Math.min(100, (userHouses.length / criteria.count) * 100);
          isCompleted = userHouses.length >= criteria.count;
          break;
        }
        
        case 'profile_complete': {
          // Check if user has added home systems
          const userHouses = await db.select().from(houses)
            .where(eq(houses.homeownerId, homeownerId));
          
          if (userHouses.length === 0) {
            progress = 0;
            isCompleted = false;
            break;
          }
          
          const systemsData = await db.select().from(homeSystems)
            .where(eq(homeSystems.houseId, userHouses[0].id));
          
          progress = Math.min(100, (systemsData.length / criteria.systems) * 100);
          isCompleted = systemsData.length >= criteria.systems;
          break;
        }
        
        case 'streak': {
          // Calculate consecutive months with task completions
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId));
          
          if (completions.length === 0) {
            progress = 0;
            isCompleted = false;
            break;
          }
          
          // Group by year-month
          const monthSet = new Set(
            completions.map(c => `${c.year}-${c.month}`)
          );
          const uniqueMonths = Array.from(monthSet).sort();
          
          // Calculate longest streak
          let currentStreak = 1;
          let maxStreak = 1;
          
          for (let i = 1; i < uniqueMonths.length; i++) {
            const [prevYear, prevMonth] = uniqueMonths[i - 1].split('-').map(Number);
            const [currYear, currMonth] = uniqueMonths[i].split('-').map(Number);
            
            // Check if consecutive
            let isConsecutive = false;
            if (currYear === prevYear && currMonth === prevMonth + 1) {
              isConsecutive = true;
            } else if (currYear === prevYear + 1 && prevMonth === 12 && currMonth === 1) {
              isConsecutive = true;
            }
            
            if (isConsecutive) {
              currentStreak++;
              maxStreak = Math.max(maxStreak, currentStreak);
            } else {
              currentStreak = 1;
            }
          }
          
          progress = Math.min(100, (maxStreak / criteria.months) * 100);
          isCompleted = maxStreak >= criteria.months;
          break;
        }
        
        case 'first_task': {
          // Check if user has completed any task
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId));
          
          progress = completions.length > 0 ? 100 : 0;
          isCompleted = completions.length > 0;
          break;
        }
        
        case 'total_tasks': {
          // Count total completed tasks
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId));
          
          progress = Math.min(100, (completions.length / criteria.count) * 100);
          isCompleted = completions.length >= criteria.count;
          break;
        }
        
        case 'high_priority_safety': {
          // Count high-priority safety task completions
          const completions = await db.select().from(taskCompletions)
            .where(eq(taskCompletions.homeownerId, homeownerId));
          
          // Filter for high-priority tasks (would need task data to verify)
          // For now, assume tasks with specific safety keywords
          const safetyTasks = completions.filter(c => 
            c.taskTitle?.toLowerCase().includes('smoke') ||
            c.taskTitle?.toLowerCase().includes('carbon') ||
            c.taskTitle?.toLowerCase().includes('detector') ||
            c.taskTitle?.toLowerCase().includes('safety') ||
            c.taskTitle?.toLowerCase().includes('emergency')
          );
          
          progress = Math.min(100, (safetyTasks.length / criteria.count) * 100);
          isCompleted = safetyTasks.length >= criteria.count;
          break;
        }
        
        case 'early_adopter': {
          // Check if user signed up before cutoff date
          const user = await this.getUser(homeownerId);
          const cutoffDate = new Date(criteria.before);
          const userCreatedAt = user?.createdAt ? new Date(user.createdAt) : new Date();
          
          isCompleted = userCreatedAt < cutoffDate;
          progress = isCompleted ? 100 : 0;
          break;
        }
        
        case 'premium_subscription': {
          // Check if user has premium subscription
          const user = await this.getUser(homeownerId);
          const isPremium = user?.subscriptionStatus === 'active' && 
            (user?.subscriptionPlanId === 'premium' || user?.subscriptionPlanId === 'premium_plus');
          
          isCompleted = isPremium;
          progress = isPremium ? 100 : 0;
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

  async calculateAchievementsProgress(
    homeownerId: string,
    houseId?: string
  ): Promise<Array<{ achievementKey: string; progress: number; isUnlocked: boolean; unlockedAt?: Date; metadata?: string }>> {
    const results: Array<{ achievementKey: string; progress: number; isUnlocked: boolean; unlockedAt?: Date; metadata?: string }> = [];
    
    // Get all achievement definitions
    const definitions = await this.getAllAchievementDefinitions();
    
    // Get user's current achievements for unlocked status
    const userAchievs = await this.getUserAchievements(homeownerId);
    
    // If filtering by house, only calculate house-specific achievements
    // Otherwise, use the full calculation from checkAndAwardAchievements
    if (!houseId) {
      // No house filter - return user's actual achievement progress
      for (const def of definitions) {
        const userAchiev = userAchievs.find(ua => ua.achievementKey === def.achievementKey);
        results.push({
          achievementKey: def.achievementKey,
          progress: userAchiev ? parseFloat(userAchiev.progress?.toString() || "0") : 0,
          isUnlocked: userAchiev?.isUnlocked || false,
          unlockedAt: userAchiev?.unlockedAt,
          metadata: userAchiev?.metadata
        });
      }
      return results;
    }
    
    // House-specific filtering - calculate progress based on house data only
    // Get house-specific data
    const houseTaskCompletions = await db.select().from(taskCompletions)
      .where(and(
        eq(taskCompletions.homeownerId, homeownerId),
        eq(taskCompletions.houseId, houseId)
      ));
    
    const houseMaintenanceLogs = await db.select().from(maintenanceLogs)
      .where(and(
        eq(maintenanceLogs.homeownerId, homeownerId),
        eq(maintenanceLogs.houseId, houseId)
      ));
    
    // Calculate house-specific savings metrics
    const tasksWithSavings = houseTaskCompletions.filter(c => 
      c.costSavings && parseFloat(c.costSavings.toString()) > 0
    );
    
    const houseSavingsMetrics = {
      totalSavings: tasksWithSavings.reduce((sum, c) => sum + parseFloat(c.costSavings!.toString()), 0),
      underBudgetCount: tasksWithSavings.length,
      avgSavingsPerTask: tasksWithSavings.length > 0 
        ? tasksWithSavings.reduce((sum, c) => sum + parseFloat(c.costSavings!.toString()), 0) / tasksWithSavings.length 
        : 0,
    };
    
    // Calculate progress for each achievement based on house data
    for (const def of definitions) {
      const criteria = typeof def.criteria === 'string' ? JSON.parse(def.criteria) : def.criteria;
      let progress = 0;
      const userAchiev = userAchievs.find(ua => ua.achievementKey === def.achievementKey);
      
      // Calculate progress based on achievement type
      switch (criteria.type) {
        case 'seasonal_tasks': {
          const seasonMap: Record<string, number> = {
            winter: 12, spring: 3, summer: 6, fall: 9
          };
          const seasonMonth = seasonMap[criteria.season] || 1;
          const tasksForSeason = houseTaskCompletions.filter(c => {
            if (!c.completedAt) return false;
            const month = c.completedAt.getMonth() + 1;
            return (
              (criteria.season === 'winter' && (month === 12 || month <= 2)) ||
              (criteria.season === 'spring' && month >= 3 && month <= 5) ||
              (criteria.season === 'summer' && month >= 6 && month <= 8) ||
              (criteria.season === 'fall' && month >= 9 && month <= 11)
            );
          });
          progress = Math.min(100, (tasksForSeason.length / criteria.count) * 100);
          break;
        }
        
        case 'total_savings': {
          progress = Math.min(100, (houseSavingsMetrics.totalSavings / criteria.amount) * 100);
          break;
        }
        
        case 'under_budget': {
          progress = Math.min(100, (houseSavingsMetrics.underBudgetCount / criteria.count) * 100);
          break;
        }
        
        case 'logs_created': {
          progress = Math.min(100, (houseMaintenanceLogs.length / criteria.count) * 100);
          break;
        }
        
        case 'documents_uploaded': {
          const docsCount = houseMaintenanceLogs.filter(log => log.receiptUrls && log.receiptUrls.length > 0).length;
          progress = Math.min(100, (docsCount / criteria.count) * 100);
          break;
        }
        
        case 'photos_uploaded': {
          const photosCount = houseMaintenanceLogs.reduce((sum, log) => 
            sum + (log.beforePhotoUrls?.length || 0) + (log.afterPhotoUrls?.length || 0), 0
          );
          const pairsCount = Math.floor(photosCount / 2);
          progress = Math.min(100, (pairsCount / criteria.count) * 100);
          break;
        }
        
        case 'detailed_logs': {
          const detailedLogs = houseMaintenanceLogs.filter(log => 
            log.description && log.description.length >= 50
          );
          progress = Math.min(100, (detailedLogs.length / criteria.count) * 100);
          break;
        }
        
        // For non-house-specific achievements (referrals, subscriptions, etc.), return 0 or use user's actual progress
        default: {
          progress = userAchiev ? parseFloat(userAchiev.progress?.toString() || "0") : 0;
          break;
        }
      }
      
      // For house filtering, determine unlock status based on house-specific progress
      const isHouseUnlocked = progress >= 100;
      
      results.push({
        achievementKey: def.achievementKey,
        progress,
        isUnlocked: isHouseUnlocked,
        unlockedAt: isHouseUnlocked && userAchiev?.isUnlocked ? userAchiev.unlockedAt : undefined,
        metadata: userAchiev?.metadata
      });
    }
    
    return results;
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

  async cancelUserAccount(userId: string, role: string): Promise<{ success: boolean; message: string }> {
    const user = this.users.get(userId);
    if (!user) {
      return { success: false, message: 'User not found' };
    }

    // Update user account status
    user.accountStatus = 'cancelled';
    user.accountCancelledAt = new Date();
    user.subscriptionStatus = 'cancelled';
    user.updatedAt = new Date();
    
    this.users.set(userId, user);
    return { success: true, message: 'Account cancelled successfully' };
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

  // Advanced admin analytics methods
  async getActiveUsersSeries(days: number): Promise<Array<{ date: string; count: number }>> {
    const allUsers = Array.from(this.users.values());
    const now = new Date();
    const series: Array<{ date: string; count: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);
      
      // Count actual signups on this day (users created on this date)
      const count = allUsers.filter(user => {
        if (!user.createdAt) return false;
        const userDate = new Date(user.createdAt);
        return userDate >= targetDate && userDate < nextDate;
      }).length;
      
      const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
      series.push({ date: dateStr, count });
    }
    
    return series;
  }

  async getReferralGrowthSeries(days: number): Promise<Array<{ date: string; count: number }>> {
    const now = new Date();
    const series: Array<{ date: string; count: number }> = [];
    
    const referralCreditsArray = await db.select().from(referralCredits);
    
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);
      
      const count = referralCreditsArray.filter(credit => {
        if (!credit.earnedAt) return false;
        const earnedDate = new Date(credit.earnedAt);
        return earnedDate < nextDate;
      }).length;
      
      const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
      series.push({ date: dateStr, count });
    }
    
    return series;
  }

  async getContractorSignupsSeries(days: number): Promise<Array<{ date: string; count: number }>> {
    const allUsers = Array.from(this.users.values());
    const contractors = allUsers.filter(u => u.role === 'contractor');
    const now = new Date();
    const series: Array<{ date: string; count: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);
      
      const count = contractors.filter(user => {
        if (!user.createdAt) return false;
        const userDate = new Date(user.createdAt);
        return userDate >= targetDate && userDate < nextDate;
      }).length;
      
      const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
      series.push({ date: dateStr, count });
    }
    
    return series;
  }

  async getRevenueMetrics(days: number): Promise<{
    mrr: number;
    totalRevenue: number;
    revenueByPlan: Array<{ plan: string; revenue: number }>;
    revenueSeries: Array<{ date: string; amount: number }>;
  }> {
    const allUsers = Array.from(this.users.values());
    const activeSubscribers = allUsers.filter(u => u.subscriptionStatus === 'active');
    
    const cycleEvents = await db.select().from(subscriptionCycleEvents);
    
    const mrr = activeSubscribers.length * 20;
    
    const totalRevenue = cycleEvents
      .filter(e => e.eventType === 'payment_succeeded')
      .reduce((sum, e) => sum + (Number(e.amountInCents || 0) / 100), 0);
    
    const revenueByPlan = [
      { plan: 'Basic', revenue: activeSubscribers.filter(u => u.subscriptionTier === 'basic').length * 20 },
      { plan: 'Super', revenue: activeSubscribers.filter(u => u.subscriptionTier === 'super').length * 35 },
      { plan: 'Contractor', revenue: activeSubscribers.filter(u => u.role === 'contractor').length * 50 },
    ];
    
    const now = new Date();
    const revenueSeries: Array<{ date: string; amount: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);
      
      const dayRevenue = cycleEvents
        .filter(e => {
          if (!e.eventTimestamp || e.eventType !== 'payment_succeeded') return false;
          const eventDate = new Date(e.eventTimestamp);
          return eventDate >= targetDate && eventDate < nextDate;
        })
        .reduce((sum, e) => sum + (Number(e.amountInCents || 0) / 100), 0);
      
      const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
      revenueSeries.push({ date: dateStr, amount: dayRevenue });
    }
    
    return { mrr, totalRevenue, revenueByPlan, revenueSeries };
  }

  async getChurnMetrics(days: number): Promise<{
    churnRate: number;
    churnedUsers: number;
    totalActiveUsers: number;
    churnSeries: Array<{ date: string; rate: number }>;
  }> {
    const allUsers = Array.from(this.users.values());
    const churnedUsers = allUsers.filter(u => u.accountCancelledAt != null).length;
    const totalActiveUsers = allUsers.filter(u => u.subscriptionStatus === 'active').length;
    const churnRate = totalActiveUsers > 0 ? (churnedUsers / (churnedUsers + totalActiveUsers)) * 100 : 0;
    
    const now = new Date();
    const churnSeries: Array<{ date: string; rate: number }> = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() - i);
      targetDate.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(targetDate);
      nextDate.setDate(targetDate.getDate() + 1);
      
      const dayChurned = allUsers.filter(u => {
        if (!u.accountCancelledAt) return false;
        const cancelDate = new Date(u.accountCancelledAt);
        return cancelDate >= targetDate && cancelDate < nextDate;
      }).length;
      
      const activeAtDate = allUsers.filter(u => {
        if (!u.createdAt) return false;
        const createDate = new Date(u.createdAt);
        const isCancelled = u.accountCancelledAt && new Date(u.accountCancelledAt) <= targetDate;
        return createDate <= targetDate && !isCancelled;
      }).length;
      
      const rate = activeAtDate > 0 ? (dayChurned / activeAtDate) * 100 : 0;
      
      const dateStr = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
      churnSeries.push({ date: dateStr, rate: Math.min(rate, 5) });
    }
    
    return { churnRate, churnedUsers, totalActiveUsers, churnSeries };
  }

  async getFeatureUsageStats(): Promise<Array<{ feature: string; count: number }>> {
    const taskCompletionsArray = await db.select().from(taskCompletions);
    const messagesArray = Array.from(this.messages.values());
    const proposalsArray = Array.from(this.proposals.values());
    const contractorBoostsArray = Array.from(this.contractorBoosts.values());
    
    return [
      { feature: 'Task Completions', count: taskCompletionsArray.length },
      { feature: 'Messages Sent', count: messagesArray.length },
      { feature: 'Proposals Created', count: proposalsArray.length },
      { feature: 'Contractor Boosts', count: contractorBoostsArray.length },
      { feature: 'Service Records', count: this.serviceRecords.length },
      { feature: 'Houses Tracked', count: this.houses.size },
    ];
  }

  // Agent profile operations
  async getAgentProfile(agentId: string): Promise<AgentProfile | undefined> {
    const [profile] = await db
      .select()
      .from(agentProfiles)
      .where(eq(agentProfiles.agentId, agentId))
      .limit(1);
    return profile;
  }

  async createAgentProfile(profile: InsertAgentProfile): Promise<AgentProfile> {
    const [created] = await db
      .insert(agentProfiles)
      .values(profile)
      .returning();
    return created;
  }

  async updateAgentProfile(agentId: string, profile: Partial<InsertAgentProfile>): Promise<AgentProfile | undefined> {
    const [updated] = await db
      .update(agentProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(agentProfiles.agentId, agentId))
      .returning();
    return updated;
  }

  // Upload metadata storage (in-memory for file upload tracking)
  private uploadedFiles = new Map<string, {
    userId: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    checksum: string;
    storagePath: string;
    uploadedAt: Date;
  }>();

  async storeUploadMetadata(uploadId: string, metadata: {
    userId: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    checksum: string;
    storagePath: string;
  }): Promise<void> {
    this.uploadedFiles.set(uploadId, {
      ...metadata,
      uploadedAt: new Date(),
    });
  }

  async getUploadMetadata(uploadId: string): Promise<{
    userId: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    checksum: string;
    storagePath: string;
    uploadedAt: Date;
  } | undefined> {
    const metadata = this.uploadedFiles.get(uploadId);
    
    // Check expiration (1 hour)
    if (metadata) {
      const expirationMs = 60 * 60 * 1000; // 1 hour
      const age = Date.now() - metadata.uploadedAt.getTime();
      
      if (age > expirationMs) {
        // Expired - cleanup and return undefined
        await this.deleteUploadMetadata(uploadId, true);
        return undefined;
      }
    }
    
    return metadata;
  }

  async cleanupExpiredUploads(): Promise<void> {
    const expirationMs = 60 * 60 * 1000; // 1 hour
    const now = Date.now();
    
    for (const [uploadId, metadata] of this.uploadedFiles.entries()) {
      const age = now - metadata.uploadedAt.getTime();
      if (age > expirationMs) {
        await this.deleteUploadMetadata(uploadId, true);
      }
    }
  }

  async deleteUploadMetadata(uploadId: string, cleanupFile: boolean = false): Promise<void> {
    if (cleanupFile) {
      const metadata = this.uploadedFiles.get(uploadId);
      if (metadata?.storagePath) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(metadata.storagePath)) {
            fs.unlinkSync(metadata.storagePath);
          }
        } catch (error) {
          console.error('Failed to cleanup uploaded file:', error);
        }
      }
    }
    this.uploadedFiles.delete(uploadId);
  }

  // Agent verification operations
  async submitAgentVerification(agentId: string, data: {
    licenseNumber: string;
    licenseState: string;
    licenseExpiration: Date;
    stateIdStorageKey: string;
    stateIdOriginalFilename: string;
    stateIdMimeType: string;
    stateIdFileSize: number;
    stateIdChecksum: string;
  }): Promise<AgentProfile | undefined> {
    const now = new Date();
    const [updated] = await db
      .update(agentProfiles)
      .set({
        licenseNumber: data.licenseNumber,
        licenseState: data.licenseState,
        licenseExpiration: data.licenseExpiration,
        stateIdStorageKey: data.stateIdStorageKey,
        stateIdOriginalFilename: data.stateIdOriginalFilename,
        stateIdMimeType: data.stateIdMimeType,
        stateIdFileSize: data.stateIdFileSize,
        stateIdChecksum: data.stateIdChecksum,
        stateIdUploadedAt: now,
        verificationStatus: 'pending_review',
        verificationRequestedAt: now,
        // Clear review metadata on resubmission
        verifiedAt: null,
        lastRejectedAt: null,
        reviewedByAdminId: null,
        reviewNotes: null,
        updatedAt: now,
      })
      .where(eq(agentProfiles.agentId, agentId))
      .returning();
    return updated;
  }

  async getAgentVerificationStatus(agentId: string): Promise<{
    verificationStatus: string;
    licenseNumber?: string | null;
    licenseState?: string | null;
    licenseExpiration?: Date | null;
    verificationRequestedAt?: Date | null;
    reviewNotes?: string | null;
  } | undefined> {
    const [profile] = await db
      .select({
        verificationStatus: agentProfiles.verificationStatus,
        licenseNumber: agentProfiles.licenseNumber,
        licenseState: agentProfiles.licenseState,
        licenseExpiration: agentProfiles.licenseExpiration,
        verificationRequestedAt: agentProfiles.verificationRequestedAt,
        reviewNotes: agentProfiles.reviewNotes,
      })
      .from(agentProfiles)
      .where(eq(agentProfiles.agentId, agentId))
      .limit(1);
    return profile;
  }

  // Agent verification audit operations
  async createVerificationAudit(audit: InsertAgentVerificationAudit): Promise<AgentVerificationAudit> {
    const [created] = await db
      .insert(agentVerificationAudits)
      .values(audit)
      .returning();
    return created;
  }

  async getVerificationAudits(agentId: string): Promise<AgentVerificationAudit[]> {
    return await db
      .select()
      .from(agentVerificationAudits)
      .where(eq(agentVerificationAudits.agentId, agentId))
      .orderBy(desc(agentVerificationAudits.createdAt));
  }

  // Affiliate referral operations
  async getAffiliateReferrals(agentId: string): Promise<AffiliateReferral[]> {
    return await db
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.agentId, agentId));
  }

  async getAffiliateReferral(id: string): Promise<AffiliateReferral | undefined> {
    const [referral] = await db
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.id, id))
      .limit(1);
    return referral;
  }

  async getAffiliateReferralByUserId(userId: string): Promise<AffiliateReferral | undefined> {
    const [referral] = await db
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.referredUserId, userId))
      .limit(1);
    return referral;
  }

  async getReferringAgentForHomeowner(homeownerId: string): Promise<{ firstName: string; lastName: string; email: string | null; phone: string | null; website: string | null; officeAddress: string | null; referralCode: string | null; profileImageUrl: string | null; } | undefined> {
    // Get the affiliate referral record for this homeowner
    const referral = await this.getAffiliateReferralByUserId(homeownerId);
    if (!referral) {
      return undefined;
    }

    // Get the agent's user information
    const agent = await this.getUser(referral.agentId);
    if (!agent) {
      return undefined;
    }

    // Get the agent's profile for contact information
    const agentProfile = await this.getAgentProfile(referral.agentId);

    return {
      firstName: agent.firstName || 'Agent',
      lastName: agent.lastName || '',
      email: agent.email,
      phone: agentProfile?.phone || null,
      website: agentProfile?.website || null,
      officeAddress: agentProfile?.officeAddress || null,
      referralCode: agent.referralCode,
      profileImageUrl: agent.profileImageUrl,
    };
  }

  async createAffiliateReferral(referral: InsertAffiliateReferral): Promise<AffiliateReferral> {
    const [created] = await db
      .insert(affiliateReferrals)
      .values(referral)
      .returning();
    return created;
  }

  async updateAffiliateReferral(id: string, referral: Partial<InsertAffiliateReferral>): Promise<AffiliateReferral | undefined> {
    const [updated] = await db
      .update(affiliateReferrals)
      .set({ ...referral, updatedAt: new Date() })
      .where(eq(affiliateReferrals.id, id))
      .returning();
    return updated;
  }

  // Subscription cycle event operations
  async getSubscriptionCycleEvents(userId: string): Promise<SubscriptionCycleEvent[]> {
    return await db
      .select()
      .from(subscriptionCycleEvents)
      .where(eq(subscriptionCycleEvents.userId, userId));
  }

  async createSubscriptionCycleEvent(event: InsertSubscriptionCycleEvent): Promise<SubscriptionCycleEvent> {
    const [created] = await db
      .insert(subscriptionCycleEvents)
      .values(event)
      .returning();
    return created;
  }

  async getLastPaymentEvent(userId: string): Promise<SubscriptionCycleEvent | undefined> {
    const [lastEvent] = await db
      .select()
      .from(subscriptionCycleEvents)
      .where(and(
        eq(subscriptionCycleEvents.userId, userId),
        eq(subscriptionCycleEvents.status, 'paid')
      ))
      .orderBy(desc(subscriptionCycleEvents.periodStart))
      .limit(1);
    return lastEvent;
  }

  // Affiliate payout operations
  async getAffiliatePayouts(agentId: string): Promise<AffiliatePayout[]> {
    return await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.agentId, agentId));
  }

  async getAffiliatePayout(id: string): Promise<AffiliatePayout | undefined> {
    const [payout] = await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.id, id))
      .limit(1);
    return payout;
  }

  async createAffiliatePayout(payout: InsertAffiliatePayout): Promise<AffiliatePayout> {
    const [created] = await db
      .insert(affiliatePayouts)
      .values(payout)
      .returning();
    return created;
  }

  async updateAffiliatePayout(id: string, payout: Partial<InsertAffiliatePayout>): Promise<AffiliatePayout | undefined> {
    const [updated] = await db
      .update(affiliatePayouts)
      .set({ ...payout, updatedAt: new Date() })
      .where(eq(affiliatePayouts.id, id))
      .returning();
    return updated;
  }

  async getPendingPayouts(): Promise<AffiliatePayout[]> {
    return await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.status, 'pending'));
  }

  // Agent dashboard stats
  async getAgentStats(agentId: string): Promise<{
    totalReferrals: number;
    activeReferrals: number;
    totalEarnings: number;
    pendingEarnings: number;
  }> {
    const referrals = await db
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.agentId, agentId));

    const payouts = await db
      .select()
      .from(affiliatePayouts)
      .where(eq(affiliatePayouts.agentId, agentId));

    const totalReferrals = referrals.length;
    const activeReferrals = referrals.filter(r => 
      r.status !== 'voided' && r.status !== 'paid'
    ).length;

    const paidPayouts = payouts.filter(p => p.status === 'paid');
    const totalEarnings = paidPayouts.reduce((sum, p) => 
      sum + parseFloat(p.amount || '0'), 0
    );

    const pendingPayoutsFiltered = payouts.filter(p => p.status === 'pending');
    const pendingEarnings = pendingPayoutsFiltered.reduce((sum, p) => 
      sum + parseFloat(p.amount || '0'), 0
    );

    return {
      totalReferrals,
      activeReferrals,
      totalEarnings,
      pendingEarnings,
    };
  }

  // Support ticket operations
  async getSupportTickets(filters?: {
    userId?: string;
    status?: string;
    category?: string;
    priority?: string;
    assignedToAdminId?: string;
  }): Promise<SupportTicket[]> {
    let tickets = Array.from(this.supportTickets.values());
    
    if (filters?.userId) {
      tickets = tickets.filter(t => t.userId === filters.userId);
    }
    if (filters?.status) {
      tickets = tickets.filter(t => t.status === filters.status);
    }
    if (filters?.category) {
      tickets = tickets.filter(t => t.category === filters.category);
    }
    if (filters?.priority) {
      tickets = tickets.filter(t => t.priority === filters.priority);
    }
    if (filters?.assignedToAdminId) {
      tickets = tickets.filter(t => t.assignedToAdminId === filters.assignedToAdminId);
    }
    
    return tickets.sort((a, b) => 
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }

  async getSupportTicket(id: string): Promise<SupportTicket | undefined> {
    return this.supportTickets.get(id);
  }

  async createSupportTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newTicket: SupportTicket = {
      id,
      ...ticket,
      createdAt: now,
      updatedAt: now,
      closedAt: null,
    };
    this.supportTickets.set(id, newTicket);
    return newTicket;
  }

  async updateSupportTicket(id: string, ticket: Partial<InsertSupportTicket>): Promise<SupportTicket | undefined> {
    const existing = this.supportTickets.get(id);
    if (!existing) return undefined;
    
    const updated: SupportTicket = {
      ...existing,
      ...ticket,
      updatedAt: new Date(),
      closedAt: ticket.status === 'closed' || ticket.status === 'resolved' ? new Date() : existing.closedAt,
    };
    this.supportTickets.set(id, updated);
    return updated;
  }

  // Ticket reply operations
  async getTicketReplies(ticketId: string): Promise<TicketReply[]> {
    const replies = Array.from(this.ticketReplies.values())
      .filter(r => r.ticketId === ticketId)
      .sort((a, b) => 
        new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );
    return replies;
  }

  async createTicketReply(reply: InsertTicketReply): Promise<TicketReply> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newReply: TicketReply = {
      id,
      ...reply,
      createdAt: now,
    };
    this.ticketReplies.set(id, newReply);
    return newReply;
  }

  // Support ticket with replies (for detailed view)
  async getSupportTicketWithReplies(id: string): Promise<{
    ticket: SupportTicket;
    replies: TicketReply[];
    user: { id: string; firstName: string | null; lastName: string | null; email: string | null };
  } | undefined> {
    const ticket = await this.getSupportTicket(id);
    if (!ticket) return undefined;
    
    const user = await this.getUser(ticket.userId);
    if (!user) return undefined;
    
    const replies = await this.getTicketReplies(id);
    
    return {
      ticket,
      replies,
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
      },
    };
  }

  // CRM Lead operations
  async getCrmLeads(contractorUserId: string, filters?: {
    status?: string;
    priority?: string;
    source?: string;
    searchQuery?: string;
  }): Promise<CrmLead[]> {
    // Get contractor's company if they belong to one
    const user = await this.getUser(contractorUserId);
    const companyId = user?.companyId;

    // Get leads owned by contractor OR company-shared leads
    let leads = Array.from(this.crmLeads.values())
      .filter(l => 
        l.contractorUserId === contractorUserId || 
        (companyId && l.companyId === companyId)
      );

    // Apply filters
    if (filters?.status && filters.status !== 'all') {
      leads = leads.filter(l => l.status === filters.status);
    }
    if (filters?.priority && filters.priority !== 'all') {
      leads = leads.filter(l => l.priority === filters.priority);
    }
    if (filters?.source && filters.source !== 'all') {
      leads = leads.filter(l => l.source === filters.source);
    }
    if (filters?.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      leads = leads.filter(l => {
        const firstName = l.firstName?.toLowerCase() || '';
        const lastName = l.lastName?.toLowerCase() || '';
        const email = l.email?.toLowerCase() || '';
        const phone = l.phone?.toLowerCase() || '';
        const projectType = l.projectType?.toLowerCase() || '';
        const tags = l.tags?.map(t => t.toLowerCase()).join(' ') || '';
        
        return firstName.includes(query) ||
          lastName.includes(query) ||
          email.includes(query) ||
          phone.includes(query) ||
          projectType.includes(query) ||
          tags.includes(query);
      });
    }

    // Sort by follow-up date (soonest first), then by created date (newest first)
    leads.sort((a, b) => {
      if (a.followUpDate && b.followUpDate) {
        return new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime();
      }
      if (a.followUpDate) return -1;
      if (b.followUpDate) return 1;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });

    return leads;
  }

  async getCrmLead(id: string): Promise<CrmLead | undefined> {
    return this.crmLeads.get(id);
  }

  async createCrmLead(lead: InsertCrmLead): Promise<CrmLead> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newLead: CrmLead = {
      id,
      ...lead,
      createdAt: now,
      updatedAt: now,
    };
    this.crmLeads.set(id, newLead);
    return newLead;
  }

  async updateCrmLead(id: string, lead: Partial<InsertCrmLead>): Promise<CrmLead | undefined> {
    const existing = this.crmLeads.get(id);
    if (!existing) return undefined;

    const updated: CrmLead = {
      ...existing,
      ...lead,
      updatedAt: new Date(),
      // Set wonAt/lostAt timestamps based on status changes
      wonAt: lead.status === 'won' && !existing.wonAt ? new Date() : existing.wonAt,
      lostAt: lead.status === 'lost' && !existing.lostAt ? new Date() : existing.lostAt,
    };
    this.crmLeads.set(id, updated);
    return updated;
  }

  async deleteCrmLead(id: string): Promise<boolean> {
    // Also delete associated notes
    const notes = Array.from(this.crmNotes.values())
      .filter(n => n.leadId === id);
    notes.forEach(n => this.crmNotes.delete(n.id));
    
    return this.crmLeads.delete(id);
  }

  // CRM Note operations
  async getCrmNotes(leadId: string): Promise<CrmNote[]> {
    const notes = Array.from(this.crmNotes.values())
      .filter(n => n.leadId === leadId)
      .sort((a, b) => {
        // Pinned notes first
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        // Then by created date (newest first)
        return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
      });
    return notes;
  }

  async createCrmNote(note: InsertCrmNote): Promise<CrmNote> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newNote: CrmNote = {
      id,
      ...note,
      createdAt: now,
      updatedAt: now,
    };
    this.crmNotes.set(id, newNote);
    return newNote;
  }

  async updateCrmNote(id: string, note: Partial<InsertCrmNote>): Promise<CrmNote | undefined> {
    const existing = this.crmNotes.get(id);
    if (!existing) return undefined;

    const updated: CrmNote = {
      ...existing,
      ...note,
      updatedAt: new Date(),
    };
    this.crmNotes.set(id, updated);
    return updated;
  }

  async deleteCrmNote(id: string): Promise<boolean> {
    return this.crmNotes.delete(id);
  }

  // CRM Lead with notes (for detailed view)
  async getCrmLeadWithNotes(id: string): Promise<{
    lead: CrmLead;
    notes: CrmNote[];
  } | undefined> {
    const lead = await this.getCrmLead(id);
    if (!lead) return undefined;
    
    const notes = await this.getCrmNotes(id);
    
    return {
      lead,
      notes,
    };
  }

  // CRM Integration operations
  async getCrmIntegrations(contractorUserId: string, companyId?: string | null): Promise<CrmIntegration[]> {
    return Array.from(this.crmIntegrations.values())
      .filter(i => 
        i.contractorUserId === contractorUserId || 
        (companyId && i.companyId === companyId)
      )
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async getCrmIntegration(id: string): Promise<CrmIntegration | undefined> {
    return this.crmIntegrations.get(id);
  }

  async createCrmIntegration(integration: InsertCrmIntegration): Promise<CrmIntegration> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newIntegration: CrmIntegration = {
      id,
      ...integration,
      createdAt: now,
      updatedAt: now,
    };
    this.crmIntegrations.set(id, newIntegration);
    return newIntegration;
  }

  async updateCrmIntegration(id: string, integration: Partial<InsertCrmIntegration>): Promise<CrmIntegration | undefined> {
    const existing = this.crmIntegrations.get(id);
    if (!existing) return undefined;

    const updated: CrmIntegration = {
      ...existing,
      ...integration,
      updatedAt: new Date(),
    };
    this.crmIntegrations.set(id, updated);
    return updated;
  }

  async deleteCrmIntegration(id: string): Promise<boolean> {
    return this.crmIntegrations.delete(id);
  }

  // Webhook Log operations
  async getWebhookLogs(integrationId: string, limit = 50): Promise<WebhookLog[]> {
    return Array.from(this.webhookLogs.values())
      .filter(log => log.integrationId === integrationId)
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, limit);
  }

  async createWebhookLog(log: InsertWebhookLog): Promise<WebhookLog> {
    const id = crypto.randomUUID();
    const now = new Date();
    const newLog: WebhookLog = {
      id,
      ...log,
      createdAt: now,
    };
    this.webhookLogs.set(id, newLog);
    return newLog;
  }
}

// Database-backed storage for users (OAuth persistence)
class DbStorage implements IStorage {
  private memStorage: MemStorage;
  
  // Upload metadata storage (in-memory for file upload tracking)
  private uploadedFiles = new Map<string, {
    userId: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    checksum: string;
    storagePath: string;
    uploadedAt: Date;
  }>();

  constructor() {
    this.memStorage = new MemStorage();
    
    // Bind all MemStorage methods (except database-backed ones)
    // getContractors and getContractor now use database-backed methods (defined below)
    this.createContractor = this.memStorage.createContractor.bind(this.memStorage);
    // Contractor licenses now database-backed - implemented below (getContractorLicenses, createContractorLicense, updateContractorLicense, deleteContractorLicense)
    // Company methods - now database backed (getCompany, createCompany, updateCompany, getCompanyEmployees)
    this.createCompanyInviteCode = this.memStorage.createCompanyInviteCode.bind(this.memStorage);
    this.getCompanyInviteCode = this.memStorage.getCompanyInviteCode.bind(this.memStorage);
    this.getCompanyInviteCodeByCode = this.memStorage.getCompanyInviteCodeByCode.bind(this.memStorage);
    this.getCompanyInviteCodes = this.memStorage.getCompanyInviteCodes.bind(this.memStorage);
    this.updateCompanyInviteCode = this.memStorage.updateCompanyInviteCode.bind(this.memStorage);
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
    // Maintenance logs and custom tasks now database-backed - implemented below
    // Home systems, custom tasks, maintenance logs, and service records are now database-backed
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
    this.getContractorNotifications = this.memStorage.getContractorNotifications.bind(this.memStorage);
    this.getUnreadContractorNotifications = this.memStorage.getUnreadContractorNotifications.bind(this.memStorage);
    this.markNotificationAsRead = this.memStorage.markNotificationAsRead.bind(this.memStorage);
    // searchContractors, getContractorProfile, updateContractorProfile, and getConversations now use database-backed methods (defined below)
    this.searchProducts = this.memStorage.searchProducts.bind(this.memStorage);
    // Service records now database-backed - implemented below
    this.getCustomerServiceRecords = this.memStorage.getCustomerServiceRecords.bind(this.memStorage);
    // Messaging operations now database-backed - implemented below
    this.getContactedHomeowners = this.memStorage.getContactedHomeowners.bind(this.memStorage);
    this.getContractorReviews = this.memStorage.getContractorReviews.bind(this.memStorage);
    this.getReviewsByHomeowner = this.memStorage.getReviewsByHomeowner.bind(this.memStorage);
    this.createContractorReview = this.memStorage.createContractorReview.bind(this.memStorage);
    this.updateContractorReview = this.memStorage.updateContractorReview.bind(this.memStorage);
    this.deleteContractorReview = this.memStorage.deleteContractorReview.bind(this.memStorage);
    this.getContractorAverageRating = this.memStorage.getContractorAverageRating.bind(this.memStorage);
    // Proposal operations now database-backed - implemented below
    // Home systems now database-backed - implemented below
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
    this.calculateAchievementsProgress = this.memStorage.calculateAchievementsProgress.bind(this.memStorage);
    this.getAchievementProgress = this.memStorage.getAchievementProgress.bind(this.memStorage);
    this.validateAndUseInviteCode = this.memStorage.validateAndUseInviteCode.bind(this.memStorage);
    this.getInviteCodes = this.memStorage.getInviteCodes.bind(this.memStorage);
    this.createInviteCode = this.memStorage.createInviteCode.bind(this.memStorage);
    this.deactivateInviteCode = this.memStorage.deactivateInviteCode.bind(this.memStorage);
    this.trackSearch = this.memStorage.trackSearch.bind(this.memStorage);
    this.getSearchAnalytics = this.memStorage.getSearchAnalytics.bind(this.memStorage);
    this.getAdminStats = this.memStorage.getAdminStats.bind(this.memStorage);
    this.getActiveUsersSeries = this.memStorage.getActiveUsersSeries.bind(this.memStorage);
    this.getReferralGrowthSeries = this.memStorage.getReferralGrowthSeries.bind(this.memStorage);
    this.getContractorSignupsSeries = this.memStorage.getContractorSignupsSeries.bind(this.memStorage);
    this.getRevenueMetrics = this.memStorage.getRevenueMetrics.bind(this.memStorage);
    this.getChurnMetrics = this.memStorage.getChurnMetrics.bind(this.memStorage);
    this.getFeatureUsageStats = this.memStorage.getFeatureUsageStats.bind(this.memStorage);
    // Agent methods
    this.getAgentProfile = this.memStorage.getAgentProfile.bind(this.memStorage);
    this.getAffiliateReferrals = this.memStorage.getAffiliateReferrals.bind(this.memStorage);
    this.getAgentStats = this.memStorage.getAgentStats.bind(this.memStorage);
    this.submitAgentVerification = this.memStorage.submitAgentVerification.bind(this.memStorage);
    this.getAgentVerificationStatus = this.memStorage.getAgentVerificationStatus.bind(this.memStorage);
    // Support ticket methods
    this.getSupportTickets = this.memStorage.getSupportTickets.bind(this.memStorage);
    this.getSupportTicket = this.memStorage.getSupportTicket.bind(this.memStorage);
    this.createSupportTicket = this.memStorage.createSupportTicket.bind(this.memStorage);
    this.updateSupportTicket = this.memStorage.updateSupportTicket.bind(this.memStorage);
    this.getTicketReplies = this.memStorage.getTicketReplies.bind(this.memStorage);
    this.createTicketReply = this.memStorage.createTicketReply.bind(this.memStorage);
    this.getSupportTicketWithReplies = this.memStorage.getSupportTicketWithReplies.bind(this.memStorage);
    // CRM methods
    this.getCrmLeads = this.memStorage.getCrmLeads.bind(this.memStorage);
    this.getCrmLead = this.memStorage.getCrmLead.bind(this.memStorage);
    this.createCrmLead = this.memStorage.createCrmLead.bind(this.memStorage);
    this.updateCrmLead = this.memStorage.updateCrmLead.bind(this.memStorage);
    this.deleteCrmLead = this.memStorage.deleteCrmLead.bind(this.memStorage);
    this.getCrmNotes = this.memStorage.getCrmNotes.bind(this.memStorage);
    this.createCrmNote = this.memStorage.createCrmNote.bind(this.memStorage);
    this.updateCrmNote = this.memStorage.updateCrmNote.bind(this.memStorage);
    this.deleteCrmNote = this.memStorage.deleteCrmNote.bind(this.memStorage);
    this.getCrmLeadWithNotes = this.memStorage.getCrmLeadWithNotes.bind(this.memStorage);
  }

  // User operations - DATABASE BACKED for persistence
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const rawUser = result[0];
    
    if (!rawUser) {
      return undefined;
    }
    
    // Reject cancelled accounts
    if (rawUser.accountStatus === 'cancelled') {
      return undefined;
    }
    
    // WORKAROUND: Manually map snake_case to camelCase if Drizzle casing fails
    // This ensures companyId and companyRole are always populated correctly
    const user: any = { ...rawUser };
    
    // If we have snake_case but not camelCase, map it
    if ((rawUser as any).company_id !== undefined && !user.companyId) {
      user.companyId = (rawUser as any).company_id;
      console.error('[FIX] Manually mapped company_id to companyId:', user.companyId);
    }
    
    if ((rawUser as any).company_role !== undefined && !user.companyRole) {
      user.companyRole = (rawUser as any).company_role;
      console.error('[FIX] Manually mapped company_role to companyRole:', user.companyRole);
    }
    
    if ((rawUser as any).can_respond_to_proposals !== undefined && user.canRespondToProposals === undefined) {
      user.canRespondToProposals = (rawUser as any).can_respond_to_proposals;
    }
    
    console.error('[DEBUG getUser] Final user - companyId:', user.companyId, 'companyRole:', user.companyRole);
    
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    const rawUser = result[0];
    
    if (!rawUser) {
      return undefined;
    }
    
    // Reject cancelled accounts
    if (rawUser.accountStatus === 'cancelled') {
      return undefined;
    }
    
    // Apply same manual mapping as getUser()
    const user: any = { ...rawUser };
    
    if ((rawUser as any).company_id !== undefined && !user.companyId) {
      user.companyId = (rawUser as any).company_id;
    }
    
    if ((rawUser as any).company_role !== undefined && !user.companyRole) {
      user.companyRole = (rawUser as any).company_role;
    }
    
    if ((rawUser as any).can_respond_to_proposals !== undefined && user.canRespondToProposals === undefined) {
      user.canRespondToProposals = (rawUser as any).can_respond_to_proposals;
    }
    
    return user;
  }

  async getUserByReferralCode(referralCode: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.referralCode, referralCode)).limit(1);
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      console.log('🟢 upsertUser called with:', { id: userData.id, email: userData.email, role: userData.role });
      
      // DEMO DATA PROTECTION: Check if this is a demo data operation trying to overwrite a real user
      const incomingIsDemoData = isDemoId(userData.id) || isDemoEmail(userData.email);
      
      // Check if user exists
      const existingUser = userData.id ? await this.getUser(userData.id) : null;
      console.log('🟢 Existing user check:', existingUser ? 'FOUND' : 'NOT FOUND');
      
      if (existingUser) {
        // DEMO DATA PROTECTION: Never allow demo data to overwrite a real user
        const existingIsRealUser = !isDemoUser(existingUser);
        
        if (incomingIsDemoData && existingIsRealUser) {
          console.log('🛡️ DEMO DATA PROTECTION: Blocked attempt to overwrite REAL user with demo data!');
          console.log('🛡️ Existing real user:', { id: existingUser.id, email: existingUser.email });
          console.log('🛡️ Demo data that was blocked:', { id: userData.id, email: userData.email });
          // Return the existing user without modification
          return existingUser;
        }
        
        // Update existing user, preserving fields not provided in userData
        const updatedData = {
          id: userData.id!,
          email: userData.email ?? existingUser.email,
          firstName: userData.firstName ?? existingUser.firstName,
          lastName: userData.lastName ?? existingUser.lastName,
          phone: userData.phone ?? existingUser.phone,
          address: userData.address ?? existingUser.address,
          profileImageUrl: userData.profileImageUrl ?? existingUser.profileImageUrl,
          role: userData.role ?? existingUser.role,
          passwordHash: userData.passwordHash ?? existingUser.passwordHash,
          zipCode: userData.zipCode ?? existingUser.zipCode,
          referralCode: userData.referralCode ?? existingUser.referralCode,
          referredBy: userData.referredBy ?? existingUser.referredBy,
          referralCount: userData.referralCount ?? existingUser.referralCount,
          // Company fields - CRITICAL: preserve these for contractors!
          companyId: userData.companyId ?? existingUser.companyId,
          companyRole: userData.companyRole ?? existingUser.companyRole,
          canRespondToProposals: userData.canRespondToProposals ?? existingUser.canRespondToProposals,
          // Subscription fields
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
        
        console.log('🟢 Updating existing user in database...');
        await db.update(users).set(updatedData).where(eq(users.id, userData.id!));
        const updatedUser = await this.getUser(userData.id!);
        console.log('🟢 User updated successfully:', updatedUser?.id);
        return updatedUser!;
      } else {
        // Insert new user
        const newUser = {
          id: userData.id,
          email: userData.email ?? null,
          firstName: userData.firstName ?? null,
          lastName: userData.lastName ?? null,
          phone: userData.phone ?? null,
          address: userData.address ?? null,
          profileImageUrl: userData.profileImageUrl ?? null,
          role: userData.role ?? 'homeowner',
          passwordHash: userData.passwordHash ?? null,
          zipCode: userData.zipCode ?? null,
          referralCode: userData.referralCode ?? null,
          referredBy: userData.referredBy ?? null,
          referralCount: userData.referralCount ?? 0,
          // Company fields - for contractors
          companyId: userData.companyId ?? null,
          companyRole: userData.companyRole ?? null,
          canRespondToProposals: userData.canRespondToProposals ?? false,
          // Subscription fields
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
        
        console.log('🟢 Inserting new user into database:', newUser.id);
        await db.insert(users).values(newUser);
        const insertedUser = await this.getUser(newUser.id!);
        console.log('🟢 User inserted successfully:', insertedUser?.id);
        return insertedUser!;
      }
    } catch (error) {
      console.error('🔴 upsertUser ERROR:', error);
      console.error('🔴 Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        userData: { id: userData.id, email: userData.email, role: userData.role }
      });
      throw error;
    }
  }

  async getUserByStripeCustomerId(stripeCustomerId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.stripeCustomerId, stripeCustomerId)).limit(1);
    return result[0];
  }

  async updateUserSubscriptionStatus(userId: string, status: string): Promise<User | undefined> {
    await db.update(users).set({ 
      subscriptionStatus: status,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    return this.getUser(userId);
  }

  async updateUserStripeSubscription(userId: string, subscriptionId: string, priceId: string): Promise<User | undefined> {
    await db.update(users).set({ 
      stripeSubscriptionId: subscriptionId,
      stripePriceId: priceId,
      updatedAt: new Date(),
    }).where(eq(users.id, userId));
    return this.getUser(userId);
  }

  async createUserWithPassword(data: { 
    email: string; 
    passwordHash: string; 
    firstName: string; 
    lastName: string; 
    role: 'homeowner' | 'contractor'; 
    zipCode: string;
    trialEndsAt?: Date;
    maxHousesAllowed?: number;
    subscriptionStatus?: string;
  }): Promise<User> {
    return this.upsertUser({
      id: randomUUID(),
      email: data.email,
      passwordHash: data.passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role,
      zipCode: data.zipCode,
      trialEndsAt: data.trialEndsAt ?? null,
      maxHousesAllowed: data.maxHousesAllowed ?? null,
      subscriptionStatus: data.subscriptionStatus ?? null,
    });
  }

  async cancelUserAccount(userId: string, role: string): Promise<{ success: boolean; message: string }> {
    try {
      const user = await this.getUser(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      // For contractors who own a company, check if they can cancel
      if (role === 'contractor' && user.companyRole === 'owner') {
        // Check if there are other employees in the company
        const employees = await this.db.select().from(users).where(eq(users.companyId, user.companyId!));
        if (employees.length > 1) {
          return { 
            success: false, 
            message: 'Company owners must transfer ownership or remove all employees before cancelling their account' 
          };
        }
      }

      // Update account status to cancelled
      await this.db
        .update(users)
        .set({
          accountStatus: 'cancelled',
          accountCancelledAt: new Date(),
          subscriptionStatus: 'cancelled',
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      console.log(`[ACCOUNT_CANCELLATION] User ${userId} (${role}) cancelled their account at ${new Date().toISOString()}`);
      
      return { success: true, message: 'Account cancelled successfully' };
    } catch (error) {
      console.error('Error cancelling user account:', error);
      return { success: false, message: 'Failed to cancel account' };
    }
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

  async searchContractors(query: string, location?: string, services?: string[], maxDistance?: number): Promise<Contractor[]> {
    console.log('[SEARCH-DEBUG] searchContractors called with:', { query, location, services, maxDistance });
    
    // Query companies and join with users to get owner info and zip code
    const companyResults = await db
      .select({
        companyId: companies.id,
        companyName: companies.name,
        bio: companies.bio,
        services: companies.services,
        serviceRadius: companies.serviceRadius,
        rating: companies.rating,
        reviewCount: companies.reviewCount,
        hasEmergencyServices: companies.hasEmergencyServices,
        businessLogo: companies.businessLogo,
        projectPhotos: companies.projectPhotos,
        phoneNumber: companies.phone,
        email: companies.email,
        licenseNumber: companies.licenseNumber,
        zipCode: users.zipCode,
        userId: users.id,
        userFirstName: users.firstName,
        userLastName: users.lastName,
      })
      .from(companies)
      .innerJoin(users, eq(users.companyId, companies.id))
      .where(eq(users.companyRole, 'owner'));
    
    // Transform company data to contractor format
    let results = companyResults.map(c => ({
      id: c.userId,
      name: `${c.userFirstName || ''} ${c.userLastName || ''}`.trim() || 'Contractor',
      company: c.companyName,
      bio: c.bio,
      services: c.services || [],
      location: c.zipCode || '',
      postalCode: c.zipCode || '',
      serviceRadius: c.serviceRadius,
      rating: c.rating,
      reviewCount: c.reviewCount,
      yearsExperience: 0, // Not stored in companies table
      licenseNumber: c.licenseNumber || '',
      insuranceExpiry: null,
      hasEmergencyServices: c.hasEmergencyServices,
      businessHours: {},
      email: c.email,
      phone: c.phoneNumber || '',
      businessLogo: c.businessLogo || '',
      projectPhotos: c.projectPhotos || [],
      distance: undefined as string | undefined,
      companyId: c.companyId,
    }));
    
    // If location is provided, geocode it and calculate distances
    if (location) {
      try {
        // Geocode the search location
        const searchCoords = await this.geocodeLocation(location);
        
        if (searchCoords) {
          // Calculate distance for each contractor
          results = results.map(contractor => {
            if (contractor.postalCode || contractor.location) {
              // Try to get contractor coordinates
              const contractorLocation = contractor.postalCode || contractor.location;
              
              // Simple distance estimation based on zip code proximity (placeholder)
              const distance = this.estimateDistanceByZipCode(
                location, 
                contractorLocation
              );
              
              return { ...contractor, distance: distance.toString() };
            }
            return contractor;
          });
          
          // Filter by BOTH service radius and homeowner search radius (two-way check)
          // Show contractor only if BOTH radii intersect
          results = results.filter(contractor => {
            if (!contractor.distance) return true;
            const distanceToHomeowner = parseFloat(contractor.distance);
            
            // Check 1: Contractor's service radius must reach the homeowner
            const contractorReachesHomeowner = contractor.serviceRadius >= distanceToHomeowner;
            
            // Check 2: Homeowner's search radius must reach the contractor (if specified)
            const homeownerReachesContractor = !maxDistance || distanceToHomeowner <= maxDistance;
            
            console.log('[RADIUS-CHECK]', {
              contractor: contractor.company,
              distance: distanceToHomeowner,
              contractorServiceRadius: contractor.serviceRadius,
              homeownerSearchRadius: maxDistance,
              contractorReachesHomeowner,
              homeownerReachesContractor,
              bothIntersect: contractorReachesHomeowner && homeownerReachesContractor
            });
            
            // Both radii must intersect
            return contractorReachesHomeowner && homeownerReachesContractor;
          });
        }
      } catch (error) {
        console.error('Error geocoding location:', error);
        // Fall back to simple string matching if geocoding fails
      }
    }
    
    // Filter by services - include both exact matches AND handymen (who can do most basic repairs)
    if (services && services.length > 0) {
      results = results.filter(contractor => {
        // Check if contractor offers the requested service(s)
        const hasRequestedService = contractor.services.some(contractorService => 
          services.some(requestedService => 
            contractorService.toLowerCase() === requestedService.toLowerCase()
          )
        );
        
        // Also include handymen for most searches (they handle basic repairs)
        // Exclude handymen only for highly specialized services that require licensing/equipment
        const excludeHandymanServices = [
          'roofing services',
          'hvac services',
          'septic services',
          'pool installation',
          'custom home building',
          'general contracting'
        ];
        
        const isHandyman = contractor.services.some(s => 
          s.toLowerCase() === 'handyman services'
        );
        
        const shouldIncludeHandyman = isHandyman && 
          !services.some(s => excludeHandymanServices.includes(s.toLowerCase()));
        
        return hasRequestedService || shouldIncludeHandyman;
      });
    }
    
    // Filter by query
    return results.filter(contractor => {
      const matchesQuery = query === "" || 
        contractor.name.toLowerCase().includes(query.toLowerCase()) ||
        contractor.company.toLowerCase().includes(query.toLowerCase()) ||
        contractor.bio.toLowerCase().includes(query.toLowerCase()) ||
        contractor.services.some(service => service.toLowerCase().includes(query.toLowerCase()));
      
      return matchesQuery;
    });
  }
  
  // Helper method to estimate distance between zip codes
  // This is a simplified version - real implementation should use actual geocoding
  private estimateDistanceByZipCode(zip1: string, zip2: string): number {
    // Extract zip code from potentially full address strings
    // Match 5-digit zip codes
    const extractZip = (str: string): number => {
      const match = str.match(/\b(\d{5})\b/);
      return match ? parseInt(match[1]) : NaN;
    };
    
    const num1 = extractZip(zip1);
    const num2 = extractZip(zip2);
    
    if (isNaN(num1) || isNaN(num2)) return 999; // Return large distance if invalid
    
    // US zip codes: first 3 digits represent geographic area
    // Approximate: each zip code difference ~= 0.5 miles (very rough estimate)
    const zipDiff = Math.abs(num1 - num2);
    
    // Estimate distance based on zip code difference
    // This is a placeholder - real implementation should use lat/lon
    if (zipDiff === 0) return 0;
    if (zipDiff < 10) return 2; // Very close (within ~5 miles)
    if (zipDiff < 100) return zipDiff * 0.5; // Rough estimate
    return Math.min(zipDiff * 0.5, 200); // Cap at 200 miles
  }
  
  // Geocode a location using Nominatim
  private async geocodeLocation(location: string): Promise<{ lat: number; lon: number } | null> {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&limit=1&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'HomeBase/1.0'
          }
        }
      );
      
      if (!response.ok) return null;
      
      const data = await response.json();
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        };
      }
      
      return null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  // Messaging operations - DATABASE BACKED for persistence
  
  async getConversations(userId: string, userType: 'homeowner' | 'contractor'): Promise<(Conversation & { otherPartyName: string; unreadCount: number })[]> {
    // Query conversations from database
    const convs = await db
      .select()
      .from(conversations)
      .where(
        userType === 'homeowner' 
          ? eq(conversations.homeownerId, userId)
          : eq(conversations.contractorId, userId)
      );
    
    // Enrich with other party names and unread counts
    const enriched = await Promise.all(
      convs.map(async (conv) => {
        let otherPartyName = "Unknown";
        
        if (userType === 'homeowner') {
          // Get contractor's company name
          const contractorUser = await this.getUser(conv.contractorId);
          if (contractorUser && contractorUser.companyId) {
            const company = await this.getCompany(contractorUser.companyId);
            otherPartyName = company?.name || "Contractor";
          } else {
            otherPartyName = "Contractor";
          }
        } else {
          // Get homeowner name
          const homeowner = await this.getUser(conv.homeownerId);
          otherPartyName = homeowner?.firstName || homeowner?.email || "Homeowner";
        }
        
        // Count unread messages
        const unreadMessages = await db
          .select()
          .from(messages)
          .where(
            and(
              eq(messages.conversationId, conv.id),
              eq(messages.isRead, false),
              not(eq(messages.senderId, userId))
            )
          );
        
        return {
          ...conv,
          otherPartyName,
          unreadCount: unreadMessages.length
        };
      })
    );
    
    return enriched;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return result[0];
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(conversation).returning();
    return result[0];
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    
    // Update conversation's lastMessageAt
    await db
      .update(conversations)
      .set({ lastMessageAt: new Date() })
      .where(eq(conversations.id, message.conversationId));
    
    return result[0];
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await db
      .update(messages)
      .set({ isRead: true, readAt: new Date() })
      .where(
        and(
          eq(messages.conversationId, conversationId),
          not(eq(messages.senderId, userId)),
          eq(messages.isRead, false)
        )
      );
  }

  async getUnreadMessageCount(userId: string): Promise<number> {
    const unreadMessages = await db
      .select()
      .from(messages)
      .where(
        and(
          not(eq(messages.senderId, userId)),
          eq(messages.isRead, false)
        )
      );
    
    return unreadMessages.length;
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
    
    // Get user to access companyId
    const user = await this.getUser(contractorId);
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.companyId) {
      throw new Error('User must belong to a company to update contractor profile');
    }
    
    // CRITICAL FIX: Update company-level data (projectPhotos, businessLogo, bio, experience) to persist across sessions
    const companyUpdates: any = {};
    if (profileData.projectPhotos !== undefined) {
      companyUpdates.projectPhotos = profileData.projectPhotos;
      console.log('[PHOTO-DEBUG] projectPhotos field found:', profileData.projectPhotos?.length || 0, 'photos');
    }
    if (profileData.businessLogo !== undefined) {
      companyUpdates.businessLogo = profileData.businessLogo;
      console.log('[PHOTO-DEBUG] businessLogo field found:', profileData.businessLogo ? 'yes' : 'no');
    }
    if (profileData.bio !== undefined) {
      companyUpdates.bio = profileData.bio;
      console.log('[PROFILE-DEBUG] bio field found:', profileData.bio ? 'yes' : 'no');
    }
    if (experience !== undefined && experience !== null) {
      companyUpdates.experience = experience;
      console.log('[PROFILE-DEBUG] experience field found:', experience, 'years');
    }
    
    if (Object.keys(companyUpdates).length > 0) {
      console.log('[PROFILE-DEBUG] Updating company data for companyId:', user.companyId);
      console.log('[PROFILE-DEBUG] Updates:', JSON.stringify(companyUpdates, null, 2));
      await this.updateCompany(user.companyId, companyUpdates);
      console.log('[PROFILE-DEBUG] Company data update complete');
    } else {
      console.log('[PROFILE-DEBUG] No company data updates to apply');
    }
    
    if (!existingContractor) {
      // Create new contractor profile if it doesn't exist (upsert pattern)
      const newContractor = {
        id: contractorId,
        userId: contractorId,
        companyId: user.companyId,
        name: profileData.name || 'Contractor',
        company: profileData.company || 'My Company',
        email: profileData.email || '',
        phone: profileData.phone || '',
        address: profileData.address || null,
        city: profileData.city || null,
        state: profileData.state || null,
        location: location || 'Not specified',
        postalCode: profileData.postalCode || null,
        serviceRadius: profileData.serviceRadius || 25,
        services: (profileData.services && profileData.services.length > 0) ? profileData.services : ['General Services'],
        hasEmergencyServices: profileData.hasEmergencyServices || false,
        website: profileData.website || null,
        facebook: profileData.facebook || null,
        instagram: profileData.instagram || null,
        linkedin: profileData.linkedin || null,
        googleBusinessUrl: profileData.googleBusinessUrl || null,
        bio: profileData.bio || 'Professional contractor',
        experience: experience || 0,
        profileImage: profileData.profileImage || null,
        businessLogo: profileData.businessLogo || null,
        projectPhotos: profileData.projectPhotos || [],
        licenseNumber: profileData.licenseNumber || 'Pending',
        licenseMunicipality: profileData.licenseMunicipality || 'Not specified',
        isLicensed: profileData.isLicensed !== undefined ? profileData.isLicensed : true,
        rating: profileData.rating || '0.00',
        reviewCount: profileData.reviewCount || 0,
      };
      
      await db.insert(contractors).values(newContractor);
      
      // Update verification status after creating profile
      await this.updateContractorVerificationStatus(contractorId);
      
      return (await this.getContractorProfile(contractorId))!;
    } else {
      // Update existing contractor profile
      // Remove fields that should never be updated by user
      const { id, createdAt, updatedAt, rating, reviewCount, distance, ...cleanProfileData } = profileData as any;
      
      // Filter out undefined values to prevent overwriting existing data with empty defaults
      const filteredData = Object.fromEntries(
        Object.entries(cleanProfileData).filter(([_, value]) => value !== undefined)
      );
      
      const updatedData = {
        ...filteredData,
        address: profileData.address ?? existingContractor.address,
        city: profileData.city ?? existingContractor.city,
        state: profileData.state ?? existingContractor.state,
        location: location || existingContractor.location,
        experience: experience,
      };
      
      await db.update(contractors).set(updatedData).where(eq(contractors.id, contractorId));
      
      // ALSO update the company table with services and location data so search works
      if (user.companyId) {
        const companyUpdates: Partial<InsertCompany> = {};
        if (profileData.services && profileData.services.length > 0) {
          companyUpdates.services = profileData.services;
        }
        if (profileData.address) companyUpdates.address = profileData.address;
        if (profileData.city) companyUpdates.city = profileData.city;
        if (profileData.state) companyUpdates.state = profileData.state;
        if (profileData.postalCode) companyUpdates.postalCode = profileData.postalCode;
        if (profileData.serviceRadius !== undefined) companyUpdates.serviceRadius = profileData.serviceRadius;
        
        if (Object.keys(companyUpdates).length > 0) {
          console.log('[DEBUG] Updating company with services/location:', companyUpdates);
          await this.updateCompany(user.companyId, companyUpdates);
        }
      }
      
      // Update verification status after updating profile
      await this.updateContractorVerificationStatus(contractorId);
      
      return (await this.getContractorProfile(contractorId))!;
    }
  }

  // Company operations - DATABASE BACKED for persistence
  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return result[0];
  }

  async createCompany(companyData: InsertCompany): Promise<Company> {
    const newCompany = {
      ...companyData,
      id: randomUUID(),
      rating: "0",
      reviewCount: 0,
      // Ensure required fields have default values to prevent NOT NULL constraint violations
      licenseNumber: companyData.licenseNumber || '',
      licenseMunicipality: companyData.licenseMunicipality || '',
      bio: companyData.bio || '',
      location: companyData.location || '',
      phone: companyData.phone || '',
      email: companyData.email || '',
      services: companyData.services || [],
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(companies).values(newCompany);
    return (await this.getCompany(newCompany.id))!;
  }

  async updateCompany(id: string, companyData: Partial<InsertCompany>): Promise<Company | undefined> {
    const existingCompany = await this.getCompany(id);
    if (!existingCompany) {
      return undefined;
    }

    // DEMO DATA PROTECTION: Check if this is a demo data operation trying to overwrite a real company
    const incomingIsDemoData = isDemoId(id) || isDemoEmail(companyData.email);
    const existingIsRealCompany = !isDemoId(existingCompany.id) && !isDemoEmail(existingCompany.email);
    
    if (incomingIsDemoData && existingIsRealCompany) {
      console.log('🛡️ DEMO DATA PROTECTION: Blocked attempt to overwrite REAL company with demo data!');
      console.log('🛡️ Existing real company:', { id: existingCompany.id, name: existingCompany.name, email: existingCompany.email });
      console.log('🛡️ Demo data that was blocked:', { id, email: companyData.email, name: companyData.name });
      // Return the existing company without modification
      return existingCompany;
    }

    // Filter out null/undefined values to prevent NOT NULL constraint violations
    // This ensures we only update fields that actually have values
    const filteredData: Record<string, any> = {};
    for (const [key, value] of Object.entries(companyData)) {
      if (value !== null && value !== undefined) {
        filteredData[key] = value;
      }
    }

    const updatedData = {
      ...filteredData,
      updatedAt: new Date()
    };
    
    await db.update(companies).set(updatedData).where(eq(companies.id, id));
    return (await this.getCompany(id))!;
  }

  async getCompanyEmployees(companyId: string): Promise<User[]> {
    const result = await db.select().from(users).where(eq(users.companyId, companyId));
    return result;
  }

  async getCompanyByReferralCode(code: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.referralCode, code)).limit(1);
    return result[0];
  }

  // Contractor license operations - DATABASE BACKED for persistence
  async getContractorLicenses(contractorId: string): Promise<ContractorLicense[]> {
    const result = await db.select()
      .from(contractorLicenses)
      .where(and(
        eq(contractorLicenses.contractorId, contractorId),
        eq(contractorLicenses.isActive, true)
      ));
    return result;
  }

  async getContractorLicense(id: string): Promise<ContractorLicense | undefined> {
    const result = await db.select()
      .from(contractorLicenses)
      .where(eq(contractorLicenses.id, id))
      .limit(1);
    return result[0];
  }

  async createContractorLicense(license: InsertContractorLicense): Promise<ContractorLicense> {
    const newLicense = {
      ...license,
      id: randomUUID(),
      licenseType: license.licenseType ?? 'General Contractor',
      isActive: license.isActive ?? true,
      expiryDate: license.expiryDate ?? null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(contractorLicenses).values(newLicense);
    
    // Update verification status after adding license
    await this.updateContractorVerificationStatus(license.contractorId);
    
    return (await this.getContractorLicense(newLicense.id))!;
  }

  async updateContractorLicense(id: string, contractorId: string, licenseData: Partial<InsertContractorLicense>): Promise<ContractorLicense | undefined> {
    const existingLicense = await this.getContractorLicense(id);
    if (!existingLicense || existingLicense.contractorId !== contractorId) {
      return undefined;
    }

    const updatedData = {
      ...licenseData,
      updatedAt: new Date()
    };
    
    await db.update(contractorLicenses).set(updatedData).where(eq(contractorLicenses.id, id));
    
    // Update verification status after updating license
    await this.updateContractorVerificationStatus(contractorId);
    
    return (await this.getContractorLicense(id))!;
  }

  async deleteContractorLicense(id: string, contractorId: string): Promise<boolean> {
    const existingLicense = await this.getContractorLicense(id);
    if (!existingLicense || existingLicense.contractorId !== contractorId) {
      return false;
    }

    // Soft delete by setting isActive to false
    await db.update(contractorLicenses)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(contractorLicenses.id, id));
    
    // Update verification status after license deletion
    await this.updateContractorVerificationStatus(contractorId);
    
    return true;
  }

  // Calculate and update contractor verification status
  async updateContractorVerificationStatus(contractorId: string): Promise<boolean> {
    const contractor = await this.getContractor(contractorId);
    if (!contractor) {
      return false;
    }

    // Get active licenses
    const licenses = await this.getContractorLicenses(contractorId);
    const hasActiveLicense = licenses.length > 0;

    // Check insurance validity - must have all fields AND expiry date must be in the future
    let hasValidInsurance = false;
    if (contractor.insuranceCarrier && 
        contractor.insurancePolicyNumber && 
        contractor.insuranceExpiryDate) {
      // Compare calendar dates to avoid timezone issues
      // Format: YYYY-MM-DD
      const expiryDateString = contractor.insuranceExpiryDate.split('T')[0]; // Handle both date-only and ISO strings
      const todayString = new Date().toISOString().split('T')[0];
      hasValidInsurance = expiryDateString >= todayString;
    }

    // Check profile completeness
    const hasCompleteProfile = !!(
      contractor.name &&
      contractor.company &&
      contractor.bio &&
      contractor.phone &&
      contractor.email &&
      contractor.services &&
      contractor.services.length > 0
    );

    // Contractor is verified if they have all three: active license, valid insurance, and complete profile
    const isVerified = hasActiveLicense && hasValidInsurance && hasCompleteProfile;

    // Update verification status
    await db.update(contractors)
      .set({ isVerified })
      .where(eq(contractors.id, contractorId));

    return isVerified;
  }

  // Get contractor by ID - DATABASE BACKED
  async getContractor(id: string): Promise<Contractor | undefined> {
    const result = await db.select().from(contractors).where(eq(contractors.id, id)).limit(1);
    return result[0];
  }

  // House operations - DATABASE BACKED for persistence
  async getHouses(homeownerId?: string): Promise<House[]> {
    if (homeownerId) {
      return await db.select().from(houses).where(eq(houses.homeownerId, homeownerId));
    }
    return await db.select().from(houses);
  }

  async getHouse(id: string): Promise<House | undefined> {
    const result = await db.select().from(houses).where(eq(houses.id, id)).limit(1);
    return result[0];
  }

  async createHouse(house: InsertHouse): Promise<House> {
    const newHouse = {
      ...house,
      id: randomUUID(),
      isDefault: house.isDefault ?? false,
      createdAt: new Date(),
    };
    
    await db.insert(houses).values(newHouse);
    return (await this.getHouse(newHouse.id))!;
  }

  async updateHouse(id: string, houseData: Partial<InsertHouse>): Promise<House | undefined> {
    const existingHouse = await this.getHouse(id);
    if (!existingHouse) {
      return undefined;
    }

    await db.update(houses).set(houseData).where(eq(houses.id, id));
    return (await this.getHouse(id))!;
  }

  async deleteHouse(id: string): Promise<boolean> {
    const result = await db.delete(houses).where(eq(houses.id, id));
    return true;
  }

  // Home Systems operations - DATABASE BACKED for persistence
  async getHomeSystems(homeownerId?: string, houseId?: string): Promise<HomeSystem[]> {
    let query = db.select().from(homeSystems);
    
    if (homeownerId && houseId) {
      // Return systems for this homeowner that belong to this specific house
      // Note: homeSystems.houseId is NOT NULL, so all systems must belong to a specific house
      return await query.where(and(eq(homeSystems.homeownerId, homeownerId), eq(homeSystems.houseId, houseId)));
    } else if (homeownerId) {
      return await query.where(eq(homeSystems.homeownerId, homeownerId));
    } else if (houseId) {
      return await query.where(eq(homeSystems.houseId, houseId));
    }
    
    return await query;
  }

  async getHomeSystem(id: string): Promise<HomeSystem | undefined> {
    const result = await db.select().from(homeSystems).where(eq(homeSystems.id, id)).limit(1);
    return result[0];
  }

  async createHomeSystem(system: InsertHomeSystem): Promise<HomeSystem> {
    const newSystem = {
      ...system,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(homeSystems).values(newSystem);
    return (await this.getHomeSystem(newSystem.id))!;
  }

  async updateHomeSystem(id: string, systemData: Partial<InsertHomeSystem>): Promise<HomeSystem | undefined> {
    const existing = await this.getHomeSystem(id);
    if (!existing) return undefined;

    const updatedData = {
      ...systemData,
      updatedAt: new Date()
    };

    await db.update(homeSystems).set(updatedData).where(eq(homeSystems.id, id));
    return (await this.getHomeSystem(id))!;
  }

  async deleteHomeSystem(id: string): Promise<boolean> {
    await db.delete(homeSystems).where(eq(homeSystems.id, id));
    return true;
  }

  async getHomeSystemsByHomeowner(homeownerId: string): Promise<HomeSystem[]> {
    return await db.select().from(homeSystems).where(eq(homeSystems.homeownerId, homeownerId));
  }

  // Custom Maintenance Tasks operations - DATABASE BACKED for persistence
  async getCustomMaintenanceTasks(homeownerId?: string, houseId?: string): Promise<CustomMaintenanceTask[]> {
    let query = db.select().from(customMaintenanceTasks);
    
    if (homeownerId && houseId) {
      // Return tasks for this homeowner that either belong to this house OR apply to all houses (NULL houseId)
      return await query.where(
        and(
          eq(customMaintenanceTasks.homeownerId, homeownerId),
          or(eq(customMaintenanceTasks.houseId, houseId), isNull(customMaintenanceTasks.houseId))
        )
      );
    } else if (homeownerId) {
      return await query.where(eq(customMaintenanceTasks.homeownerId, homeownerId));
    } else if (houseId) {
      // Return tasks that either belong to this house OR apply to all houses (NULL houseId)
      return await query.where(or(eq(customMaintenanceTasks.houseId, houseId), isNull(customMaintenanceTasks.houseId)));
    }
    
    return await query;
  }

  async getCustomMaintenanceTask(id: string): Promise<CustomMaintenanceTask | undefined> {
    const result = await db.select().from(customMaintenanceTasks).where(eq(customMaintenanceTasks.id, id)).limit(1);
    return result[0];
  }

  async createCustomMaintenanceTask(task: InsertCustomMaintenanceTask): Promise<CustomMaintenanceTask> {
    const newTask = {
      ...task,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(customMaintenanceTasks).values(newTask);
    return (await this.getCustomMaintenanceTask(newTask.id))!;
  }

  async updateCustomMaintenanceTask(id: string, taskData: Partial<InsertCustomMaintenanceTask>): Promise<CustomMaintenanceTask | undefined> {
    const existing = await this.getCustomMaintenanceTask(id);
    if (!existing) return undefined;

    const updatedData = {
      ...taskData,
      updatedAt: new Date()
    };

    await db.update(customMaintenanceTasks).set(updatedData).where(eq(customMaintenanceTasks.id, id));
    return (await this.getCustomMaintenanceTask(id))!;
  }

  async deleteCustomMaintenanceTask(id: string): Promise<boolean> {
    await db.delete(customMaintenanceTasks).where(eq(customMaintenanceTasks.id, id));
    return true;
  }

  // Maintenance Logs operations - DATABASE BACKED for persistence
  async getMaintenanceLogs(homeownerId?: string, houseId?: string): Promise<MaintenanceLog[]> {
    let query = db.select().from(maintenanceLogs);
    
    if (homeownerId && houseId) {
      // Return logs for this homeowner that belong to this specific house
      // Note: maintenanceLogs.houseId is NOT NULL, so all logs must belong to a specific house
      return await query.where(and(eq(maintenanceLogs.homeownerId, homeownerId), eq(maintenanceLogs.houseId, houseId)));
    } else if (homeownerId) {
      return await query.where(eq(maintenanceLogs.homeownerId, homeownerId));
    } else if (houseId) {
      return await query.where(eq(maintenanceLogs.houseId, houseId));
    }
    
    return await query;
  }

  async getMaintenanceLog(id: string): Promise<MaintenanceLog | undefined> {
    const result = await db.select().from(maintenanceLogs).where(eq(maintenanceLogs.id, id)).limit(1);
    return result[0];
  }

  async createMaintenanceLog(log: InsertMaintenanceLog): Promise<MaintenanceLog> {
    const newLog = {
      ...log,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    await db.insert(maintenanceLogs).values(newLog);
    return (await this.getMaintenanceLog(newLog.id))!;
  }

  async updateMaintenanceLog(id: string, logData: Partial<InsertMaintenanceLog>): Promise<MaintenanceLog | undefined> {
    const existing = await this.getMaintenanceLog(id);
    if (!existing) return undefined;

    const updatedData = {
      ...logData,
      updatedAt: new Date()
    };

    await db.update(maintenanceLogs).set(updatedData).where(eq(maintenanceLogs.id, id));
    return (await this.getMaintenanceLog(id))!;
  }

  async deleteMaintenanceLog(id: string): Promise<boolean> {
    await db.delete(maintenanceLogs).where(eq(maintenanceLogs.id, id));
    return true;
  }

  async getMaintenanceLogsByHomeowner(homeownerId: string): Promise<MaintenanceLog[]> {
    return await db.select().from(maintenanceLogs).where(eq(maintenanceLogs.homeownerId, homeownerId));
  }

  // Service Records operations - DATABASE BACKED for persistence
  async getServiceRecords(contractorId?: string, homeownerId?: string): Promise<ServiceRecord[]> {
    if (contractorId && homeownerId) {
      return await db.select().from(serviceRecords).where(
        and(eq(serviceRecords.contractorId, contractorId), eq(serviceRecords.homeownerId, homeownerId))
      );
    } else if (contractorId) {
      return await db.select().from(serviceRecords).where(eq(serviceRecords.contractorId, contractorId));
    } else if (homeownerId) {
      return await db.select().from(serviceRecords).where(eq(serviceRecords.homeownerId, homeownerId));
    }
    return await db.select().from(serviceRecords);
  }

  async getServiceRecord(id: string): Promise<ServiceRecord | undefined> {
    const result = await db.select().from(serviceRecords).where(eq(serviceRecords.id, id)).limit(1);
    return result[0];
  }

  async createServiceRecord(record: InsertServiceRecord): Promise<ServiceRecord> {
    const newRecord = {
      ...record,
      id: randomUUID(),
      createdAt: new Date()
    };
    
    await db.insert(serviceRecords).values(newRecord);
    return (await this.getServiceRecord(newRecord.id))!;
  }

  async updateServiceRecord(id: string, recordData: Partial<InsertServiceRecord>): Promise<ServiceRecord | undefined> {
    const existing = await this.getServiceRecord(id);
    if (!existing) return undefined;

    await db.update(serviceRecords).set(recordData).where(eq(serviceRecords.id, id));
    return (await this.getServiceRecord(id))!;
  }

  async deleteServiceRecord(id: string): Promise<boolean> {
    await db.delete(serviceRecords).where(eq(serviceRecords.id, id));
    return true;
  }

  async getHomeownerServiceRecords(homeownerId: string): Promise<ServiceRecord[]> {
    return await db.select().from(serviceRecords).where(eq(serviceRecords.homeownerId, homeownerId));
  }

  async getServiceRecordsByHomeowner(homeownerId: string, houseId?: string): Promise<ServiceRecord[]> {
    // Query both serviceRecords (contractor work) and maintenanceLogs (DIY work) for homeowners
    const serviceRecordsQuery = houseId
      ? db.select().from(serviceRecords).where(
          and(eq(serviceRecords.homeownerId, homeownerId), eq(serviceRecords.houseId, houseId))
        )
      : db.select().from(serviceRecords).where(eq(serviceRecords.homeownerId, homeownerId));
    
    const maintenanceLogsQuery = houseId
      ? db.select().from(maintenanceLogs).where(
          and(
            eq(maintenanceLogs.homeownerId, homeownerId),
            eq(maintenanceLogs.houseId, houseId),
            eq(maintenanceLogs.completionMethod, 'diy')
          )
        )
      : db.select().from(maintenanceLogs).where(
          and(
            eq(maintenanceLogs.homeownerId, homeownerId),
            eq(maintenanceLogs.completionMethod, 'diy')
          )
        );

    const [contractorRecords, diyLogs] = await Promise.all([serviceRecordsQuery, maintenanceLogsQuery]);
    
    // Convert maintenanceLogs to ServiceRecord format for display
    const diyAsServiceRecords: ServiceRecord[] = diyLogs.map(log => ({
      id: log.id,
      contractorId: '', // Empty for DIY
      companyId: null,
      employeeId: null,
      homeownerId: log.homeownerId,
      houseId: log.houseId,
      customerName: '', // Not applicable for DIY
      customerAddress: '', // Not applicable for DIY
      customerPhone: null,
      customerEmail: null,
      serviceType: log.serviceType || 'General Maintenance',
      serviceDescription: log.serviceDescription || '',
      homeArea: log.homeArea || null,
      serviceDate: log.serviceDate,
      duration: null,
      cost: log.cost?.toString() || '0',
      status: 'completed',
      notes: log.notes || null,
      materialsUsed: [],
      warrantyPeriod: log.warrantyPeriod || null,
      followUpDate: null,
      isVisibleToHomeowner: true,
      createdAt: log.createdAt || new Date(),
    }));
    
    // Combine and sort by date (most recent first)
    const allRecords = [...contractorRecords, ...diyAsServiceRecords];
    return allRecords.sort((a, b) => {
      const dateA = new Date(a.serviceDate).getTime();
      const dateB = new Date(b.serviceDate).getTime();
      return dateB - dateA; // Most recent first
    });
  }

  // Proposal operations (database-backed)
  async getProposals(contractorId?: string, homeownerId?: string): Promise<Proposal[]> {
    if (contractorId) {
      return await db.select().from(proposals).where(eq(proposals.contractorId, contractorId));
    }
    if (homeownerId) {
      return await db.select().from(proposals).where(eq(proposals.homeownerId, homeownerId));
    }
    return await db.select().from(proposals);
  }

  async getProposal(id: string): Promise<Proposal | undefined> {
    const result = await db.select().from(proposals).where(eq(proposals.id, id));
    return result[0];
  }

  async createProposal(proposalData: InsertProposal): Promise<Proposal> {
    const result = await db.insert(proposals).values(proposalData).returning();
    return result[0];
  }

  async updateProposal(id: string, proposalData: Partial<InsertProposal>): Promise<Proposal | undefined> {
    const result = await db.update(proposals)
      .set({ ...proposalData, updatedAt: new Date() })
      .where(eq(proposals.id, id))
      .returning();
    return result[0];
  }

  async deleteProposal(id: string): Promise<boolean> {
    const result = await db.delete(proposals).where(eq(proposals.id, id)).returning();
    return result.length > 0;
  }

  // Permanent connection code operations (attached to user)
  private generateConnectionCode(): string {
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar-looking characters
    let code = '';
    const bytes = randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += characters[bytes[i] % characters.length];
    }
    return code;
  }

  async getOrCreatePermanentConnectionCode(userId: string): Promise<string> {
    const user = await db.select().from(users).where(eq(users.id, userId));
    if (!user[0]) {
      throw new Error('User not found');
    }

    // If user already has a connection code, return it
    if (user[0].connectionCode) {
      return user[0].connectionCode;
    }

    // Generate a new unique code
    let code = this.generateConnectionCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await db.select().from(users).where(eq(users.connectionCode, code));
      if (existing.length === 0) {
        // Code is unique, save it
        await db.update(users)
          .set({ connectionCode: code })
          .where(eq(users.id, userId));
        return code;
      }
      // Code collision, try again
      code = this.generateConnectionCode();
      attempts++;
    }

    throw new Error('Failed to generate unique connection code');
  }

  async validatePermanentConnectionCode(code: string): Promise<{ homeownerId: string; homeownerName: string; homeownerEmail: string; homeownerZipCode: string | null; houses: Array<{id: string; name: string; address: string}> } | null> {
    const user = await db.select().from(users).where(eq(users.connectionCode, code));
    
    if (!user[0] || user[0].role !== 'homeowner') {
      return null;
    }

    // Fetch homeowner's houses
    const homeownerHouses = await db.select({
      id: houses.id,
      name: houses.name,
      address: houses.address,
    }).from(houses).where(eq(houses.homeownerId, user[0].id));

    return {
      homeownerId: user[0].id,
      homeownerName: `${user[0].firstName || ''} ${user[0].lastName || ''}`.trim() || 'Unknown',
      homeownerEmail: user[0].email || '',
      homeownerZipCode: user[0].zipCode,
      houses: homeownerHouses
    };
  }

  async regeneratePermanentConnectionCode(userId: string): Promise<string> {
    // Generate a new unique code
    let code = this.generateConnectionCode();
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const existing = await db.select().from(users).where(eq(users.connectionCode, code));
      if (existing.length === 0) {
        // Code is unique, save it
        await db.update(users)
          .set({ connectionCode: code })
          .where(eq(users.id, userId));
        return code;
      }
      // Code collision, try again
      code = this.generateConnectionCode();
      attempts++;
    }

    throw new Error('Failed to generate unique connection code');
  }

  // House transfer operations - DATABASE BACKED for persistence
  private generateTransferToken(): string {
    return randomBytes(32).toString('base64url');
  }

  async createHouseTransfer(transferData: InsertHouseTransfer): Promise<HouseTransfer> {
    const token = this.generateTransferToken();
    const transfer = await db.insert(houseTransfers).values({
      ...transferData,
      token,
    }).returning();
    return transfer[0];
  }

  async getHouseTransfer(id: string): Promise<HouseTransfer | undefined> {
    const result = await db.select().from(houseTransfers).where(eq(houseTransfers.id, id));
    return result[0];
  }

  async getHouseTransferByToken(token: string): Promise<HouseTransfer | undefined> {
    const result = await db.select().from(houseTransfers).where(eq(houseTransfers.token, token));
    return result[0];
  }

  async getHouseTransfersForUser(homeownerId: string): Promise<HouseTransfer[]> {
    const result = await db.select().from(houseTransfers)
      .where(or(
        eq(houseTransfers.fromHomeownerId, homeownerId),
        eq(houseTransfers.toHomeownerId, homeownerId)
      ));
    return result;
  }

  async updateHouseTransfer(id: string, updateData: Partial<HouseTransfer>): Promise<HouseTransfer | undefined> {
    const result = await db.update(houseTransfers)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(houseTransfers.id, id))
      .returning();
    return result[0];
  }

  async transferHouseOwnership(houseId: string, fromHomeownerId: string, toHomeownerId: string): Promise<{
    maintenanceLogsTransferred: number;
    appliancesTransferred: number;
    appointmentsTransferred: number;
    customTasksTransferred: number;
    homeSystemsTransferred: number;
    serviceRecordsTransferred: number;
    taskCompletionsTransferred: number;
    taskOverridesTransferred: number;
  }> {
    // Transfer house ownership
    await db.update(houses)
      .set({ homeownerId: toHomeownerId })
      .where(and(eq(houses.id, houseId), eq(houses.homeownerId, fromHomeownerId)));

    // Transfer maintenance logs
    const logsResult = await db.update(maintenanceLogs)
      .set({ homeownerId: toHomeownerId })
      .where(and(eq(maintenanceLogs.houseId, houseId), eq(maintenanceLogs.homeownerId, fromHomeownerId)))
      .returning();

    // Transfer home appliances (in-memory)
    let appliancesTransferred = 0;
    for (const [id, appliance] of this.memStorage['homeAppliances'].entries()) {
      if (appliance.houseId === houseId && appliance.homeownerId === fromHomeownerId) {
        const updated = { ...appliance, homeownerId: toHomeownerId };
        this.memStorage['homeAppliances'].set(id, updated);
        appliancesTransferred++;
      }
    }

    // Transfer contractor appointments (in-memory)
    let appointmentsTransferred = 0;
    for (const [id, appointment] of this.memStorage['contractorAppointments'].entries()) {
      if (appointment.houseId === houseId && appointment.homeownerId === fromHomeownerId) {
        const updated = { ...appointment, homeownerId: toHomeownerId };
        this.memStorage['contractorAppointments'].set(id, updated);
        appointmentsTransferred++;
      }
    }

    // Transfer custom tasks
    const tasksResult = await db.update(customMaintenanceTasks)
      .set({ homeownerId: toHomeownerId })
      .where(and(eq(customMaintenanceTasks.houseId, houseId), eq(customMaintenanceTasks.homeownerId, fromHomeownerId)))
      .returning();

    // Transfer home systems
    const systemsResult = await db.update(homeSystems)
      .set({ homeownerId: toHomeownerId })
      .where(and(eq(homeSystems.houseId, houseId), eq(homeSystems.homeownerId, fromHomeownerId)))
      .returning();

    // Transfer service records
    const recordsResult = await db.update(serviceRecords)
      .set({ homeownerId: toHomeownerId })
      .where(and(eq(serviceRecords.houseId, houseId), eq(serviceRecords.homeownerId, fromHomeownerId)))
      .returning();

    // Transfer task completions (for home health score)
    const completionsResult = await db.update(taskCompletions)
      .set({ homeownerId: toHomeownerId })
      .where(and(eq(taskCompletions.houseId, houseId), eq(taskCompletions.homeownerId, fromHomeownerId)))
      .returning();

    // Transfer task overrides (custom priority settings)
    const overridesResult = await db.update(taskOverrides)
      .set({ homeownerId: toHomeownerId })
      .where(and(eq(taskOverrides.houseId, houseId), eq(taskOverrides.homeownerId, fromHomeownerId)))
      .returning();

    return {
      maintenanceLogsTransferred: logsResult.length,
      appliancesTransferred,
      appointmentsTransferred,
      customTasksTransferred: tasksResult.length,
      homeSystemsTransferred: systemsResult.length,
      serviceRecordsTransferred: recordsResult.length,
      taskCompletionsTransferred: completionsResult.length,
      taskOverridesTransferred: overridesResult.length,
    };
  }

  // Upload metadata storage methods
  async storeUploadMetadata(uploadId: string, metadata: {
    userId: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    checksum: string;
    storagePath: string;
  }): Promise<void> {
    this.uploadedFiles.set(uploadId, {
      ...metadata,
      uploadedAt: new Date(),
    });
  }

  async getUploadMetadata(uploadId: string): Promise<{
    userId: string;
    originalFilename: string;
    mimeType: string;
    fileSize: number;
    checksum: string;
    storagePath: string;
    uploadedAt: Date;
  } | undefined> {
    const metadata = this.uploadedFiles.get(uploadId);
    
    // Check expiration (1 hour)
    if (metadata) {
      const expirationMs = 60 * 60 * 1000; // 1 hour
      const age = Date.now() - metadata.uploadedAt.getTime();
      
      if (age > expirationMs) {
        // Expired - cleanup and return undefined
        await this.deleteUploadMetadata(uploadId, true);
        return undefined;
      }
    }
    
    return metadata;
  }

  async cleanupExpiredUploads(): Promise<void> {
    const expirationMs = 60 * 60 * 1000; // 1 hour
    const now = Date.now();
    
    for (const [uploadId, metadata] of this.uploadedFiles.entries()) {
      const age = now - metadata.uploadedAt.getTime();
      if (age > expirationMs) {
        await this.deleteUploadMetadata(uploadId, true);
      }
    }
  }

  async deleteUploadMetadata(uploadId: string, cleanupFile: boolean = false): Promise<void> {
    if (cleanupFile) {
      const metadata = this.uploadedFiles.get(uploadId);
      if (metadata?.storagePath) {
        try {
          const fs = await import('fs');
          if (fs.existsSync(metadata.storagePath)) {
            fs.unlinkSync(metadata.storagePath);
          }
        } catch (error) {
          console.error('Failed to cleanup uploaded file:', error);
        }
      }
    }
    this.uploadedFiles.delete(uploadId);
  }

  // Error Tracking operations
  async getErrorLogs(filters?: {
    errorType?: string;
    severity?: string;
    resolved?: boolean;
    userId?: string;
    limit?: number;
  }): Promise<ErrorLog[]> {
    let query = db.select().from(errorLogs);
    
    const conditions = [];
    if (filters?.errorType) {
      conditions.push(eq(errorLogs.errorType, filters.errorType));
    }
    if (filters?.severity) {
      conditions.push(eq(errorLogs.severity, filters.severity));
    }
    if (filters?.resolved !== undefined) {
      conditions.push(eq(errorLogs.resolved, filters.resolved));
    }
    if (filters?.userId) {
      conditions.push(eq(errorLogs.userId, filters.userId));
    }
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    // Always order by most recent first
    query = query.orderBy(desc(errorLogs.createdAt)) as any;
    
    // Apply limit if specified
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    const result = await query;
    return result;
  }

  async getErrorLog(id: string): Promise<ErrorLog | undefined> {
    const result = await db.select().from(errorLogs).where(eq(errorLogs.id, id));
    return result[0];
  }

  async createErrorLog(error: InsertErrorLog): Promise<ErrorLog> {
    const result = await db.insert(errorLogs).values(error).returning();
    return result[0];
  }

  async updateErrorLog(id: string, error: Partial<InsertErrorLog>): Promise<ErrorLog | undefined> {
    const result = await db.update(errorLogs)
      .set(error)
      .where(eq(errorLogs.id, id))
      .returning();
    return result[0];
  }

  // Error Breadcrumb operations
  async getErrorBreadcrumbs(errorLogId: string): Promise<ErrorBreadcrumb[]> {
    const result = await db.select()
      .from(errorBreadcrumbs)
      .where(eq(errorBreadcrumbs.errorLogId, errorLogId))
      .orderBy(errorBreadcrumbs.timestamp);
    return result;
  }

  async createErrorBreadcrumb(breadcrumb: InsertErrorBreadcrumb): Promise<ErrorBreadcrumb> {
    const result = await db.insert(errorBreadcrumbs).values(breadcrumb).returning();
    return result[0];
  }

  // Error Log with breadcrumbs (for detailed view)
  async getErrorLogWithBreadcrumbs(id: string): Promise<{
    error: ErrorLog;
    breadcrumbs: ErrorBreadcrumb[];
  } | undefined> {
    const error = await this.getErrorLog(id);
    if (!error) return undefined;
    
    const breadcrumbs = await this.getErrorBreadcrumbs(id);
    
    return {
      error,
      breadcrumbs,
    };
  }

  // Methods delegated to MemStorage (bound in constructor)
}

export const storage = new DbStorage();
