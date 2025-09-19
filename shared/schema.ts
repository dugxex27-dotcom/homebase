import { sql, eq } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, index, uniqueIndex, check, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tierName: text("tier_name").notNull().unique(), // "basic", "super", "contractor"
  displayName: text("display_name").notNull(), // "Basic Homeowner", "Super Homeowner", "Contractor"
  description: text("description").notNull(),
  monthlyPrice: decimal("monthly_price", { precision: 10, scale: 2 }).notNull(),
  minHouses: integer("min_houses").notNull().default(0), // Minimum houses required for this tier
  maxHouses: integer("max_houses"), // Maximum houses allowed (null = unlimited)
  planType: text("plan_type").notNull().default("homeowner"), // "homeowner" or "contractor"
  stripeProductId: varchar("stripe_product_id").unique(),
  stripePriceId: varchar("stripe_price_id").unique(),
  features: text("features").array().notNull(), // Array of feature descriptions
  isActive: boolean("is_active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0), // For display ordering
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Referral credits tracking table for detailed audit trail
export const referralCredits = pgTable("referral_credits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  referrerUserId: varchar("referrer_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // User who made the referral
  referredUserId: varchar("referred_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // User who was referred
  creditAmount: decimal("credit_amount", { precision: 10, scale: 2 }).notNull().default("1.00"), // Amount of credit earned
  status: text("status").notNull().default("earned"), // "earned", "applied", "expired", "cancelled"
  earnedAt: timestamp("earned_at").notNull().defaultNow(), // When the credit was earned
  appliedAt: timestamp("applied_at"), // When credit was applied to a bill
  appliedToInvoiceId: varchar("applied_to_invoice_id"), // Stripe invoice ID where credit was applied
  appliedAmount: decimal("applied_amount", { precision: 10, scale: 2 }), // Actual amount applied (may be less than credit_amount)
  billingPeriodStart: timestamp("billing_period_start"), // Start of billing period where applied
  billingPeriodEnd: timestamp("billing_period_end"), // End of billing period where applied
  expiresAt: timestamp("expires_at"), // Optional expiration date for credits
  source: text("source").notNull().default("referral"), // "referral", "bonus", "promotion", etc.
  notes: text("notes"), // Additional notes about the credit
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate referral credits
  uniqueIndex("UX_referral_pair").on(table.referrerUserId, table.referredUserId),
  // Performance indexes
  index("IDX_referral_referrer_status_applied_at").on(table.referrerUserId, table.status, table.appliedAt),
  index("IDX_referral_referred").on(table.referredUserId),
  // Check constraint to prevent self-referrals
  check("CHK_not_self", sql`referrer_user_id <> referred_user_id`),
]);

// Users table for Replit Auth with role and subscription support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("homeowner"), // "homeowner" or "contractor"
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"), // referral code of user who referred this user
  referralCount: integer("referral_count").notNull().default(0),
  // Subscription fields
  subscriptionPlanId: varchar("subscription_plan_id").references(() => subscriptionPlans.id, { onDelete: 'set null' }), // FK to subscription_plans.id
  subscriptionStatus: text("subscription_status").default("inactive"), // "active", "inactive", "cancelled", "past_due"
  // Note: maxHousesAllowed and tier info can be derived from the plan, but keeping for performance
  maxHousesAllowed: integer("max_houses_allowed").notNull().default(2), // Cached from subscription plan
  isPremium: boolean("is_premium").notNull().default(false),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"), // Current Stripe price ID for the subscription
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for subscription plan lookups
  index("IDX_users_subscription_plan_id").on(table.subscriptionPlanId),
]);

export const contractors = pgTable("contractors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  company: text("company").notNull(),
  bio: text("bio").notNull(),
  location: text("location").notNull(),
  distance: decimal("distance", { precision: 5, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull(),
  reviewCount: integer("review_count").notNull().default(0),
  experience: integer("experience").notNull(),
  services: text("services").array().notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  licenseNumber: text("license_number").notNull(),
  licenseMunicipality: text("license_municipality").notNull(),
  isLicensed: boolean("is_licensed").notNull().default(true),
  serviceRadius: integer("service_radius").notNull().default(25), // Service radius in miles

  hasEmergencyServices: boolean("has_emergency_services").notNull().default(false),
  profileImage: text("profile_image"),
  businessLogo: text("business_logo"),
  projectPhotos: text("project_photos").array().default(sql`ARRAY[]::text[]`),
  googleBusinessUrl: text("google_business_url"),
});

export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull(),
  reviewCount: integer("review_count").notNull().default(0),
  image: text("image").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  inStock: boolean("in_stock").notNull().default(true),
});

export const maintenanceTasks = pgTable("maintenance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  month: integer("month").notNull(), // 1-12
  climateZones: text("climate_zones").array().notNull(), // array of climate zones
  priority: text("priority").notNull(), // 'high', 'medium', 'low'
  estimatedTime: text("estimated_time").notNull(),
  difficulty: text("difficulty").notNull(), // 'easy', 'moderate', 'difficult'
  category: text("category").notNull(),
  tools: text("tools").array(),
  cost: text("cost"),
});

export const customMaintenanceTasks = pgTable("custom_maintenance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  houseId: text("house_id"), // nullable, if null applies to all houses
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  priority: text("priority").notNull().default('medium'), // 'high', 'medium', 'low'
  estimatedTime: text("estimated_time"),
  difficulty: text("difficulty").default('easy'), // 'easy', 'moderate', 'difficult'
  tools: text("tools").array(),
  cost: text("cost"),
  // Frequency settings
  frequencyType: text("frequency_type").notNull(), // 'monthly', 'quarterly', 'biannually', 'annually', 'custom'
  frequencyValue: integer("frequency_value"), // for custom frequency in days
  specificMonths: text("specific_months").array(), // for annual tasks, which months (1-12)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const homeAppliances = pgTable("home_appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(), // In real app would be foreign key to users table
  houseId: text("house_id").notNull(), // references houses table
  applianceType: text("appliance_type").notNull(), // 'hvac', 'water_heater', 'washer', etc.
  brand: text("brand").notNull(),
  model: text("model").notNull(),
  yearInstalled: integer("year_installed"),
  serialNumber: text("serial_number"),
  notes: text("notes"), // Additional details about condition, issues, etc.
  location: text("location"), // Kitchen, basement, garage, etc.
  warrantyExpiration: text("warranty_expiration"),
  lastServiceDate: text("last_service_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(), // In real app would be foreign key to users table
  houseId: text("house_id").notNull(), // references houses table
  serviceDate: text("service_date").notNull(), // Date when service was performed
  serviceType: text("service_type").notNull(), // Type of service performed
  homeArea: text("home_area").notNull(), // What part of home was serviced (roof, HVAC, plumbing, etc.)
  serviceDescription: text("service_description").notNull(), // Description of work performed
  cost: decimal("cost", { precision: 10, scale: 2 }), // Cost of service
  contractorName: text("contractor_name"), // Name of contractor who performed service
  contractorCompany: text("contractor_company"), // Contractor company
  contractorId: text("contractor_id"), // Reference to contractor if from our platform
  notes: text("notes"), // Additional notes about the service
  warrantyPeriod: text("warranty_period"), // Warranty period for the work
  nextServiceDue: text("next_service_due"), // When next service is recommended
  createdAt: timestamp("created_at").defaultNow(),
});

export const contractorAppointments = pgTable("contractor_appointments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  houseId: text("house_id").notNull(), // references houses table
  contractorId: text("contractor_id"), // nullable, references contractors table
  contractorName: text("contractor_name").notNull(),
  contractorCompany: text("contractor_company"), // nullable
  contractorPhone: text("contractor_phone"), // nullable
  serviceType: text("service_type").notNull(),
  serviceDescription: text("service_description").notNull(),
  homeArea: text("home_area").notNull(),
  scheduledDateTime: text("scheduled_date_time").notNull(), // ISO datetime string
  estimatedDuration: integer("estimated_duration"), // minutes
  status: text("status").notNull().default("scheduled"), // "scheduled", "confirmed", "completed", "cancelled"
  notes: text("notes"), // nullable
  createdAt: timestamp("created_at").defaultNow(),
});

// Houses table for multi-property support
export const houses = pgTable("houses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  name: text("name").notNull(), // "Main House", "Vacation Home", "Rental Property", etc.
  address: text("address").notNull(),
  climateZone: text("climate_zone").notNull(),
  homeSystems: text("home_systems").array().notNull(), // Array of systems like ["Central Air", "Gas Heat", etc.]
  isDefault: boolean("is_default").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  houseId: text("house_id"), // nullable, references houses
  appointmentId: text("appointment_id"), // nullable, references contractor_appointments
  maintenanceTaskId: text("maintenance_task_id"), // nullable, references maintenance tasks
  type: text("type").notNull(), // "24_hour", "4_hour", "1_hour", "maintenance_due", "maintenance_overdue"
  category: text("category").notNull(), // "appointment", "maintenance"
  title: text("title").notNull(),
  message: text("message").notNull(),
  scheduledFor: text("scheduled_for").notNull(), // ISO datetime string when notification should be sent
  sentAt: text("sent_at"), // nullable, ISO datetime string when notification was actually sent
  isRead: boolean("is_read").default(false).notNull(),
  priority: text("priority").default("medium").notNull(), // "high", "medium", "low"
  actionUrl: text("action_url"), // nullable, URL to take action on notification
  createdAt: timestamp("created_at").defaultNow(),
});

export const serviceRecords = pgTable("service_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: varchar("contractor_id").notNull(),
  homeownerId: text("homeowner_id"), // Added to link to homeowner
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  serviceType: text("service_type").notNull(),
  serviceDescription: text("service_description").notNull(),
  serviceDate: text("service_date").notNull(),
  duration: text("duration"),
  cost: decimal("cost", { precision: 10, scale: 2 }).notNull().default("0"),
  status: text("status").notNull().default("completed"), // completed, in-progress, scheduled
  notes: text("notes"),
  materialsUsed: text("materials_used").array().notNull().default(sql`'{}'::text[]`),
  warrantyPeriod: text("warranty_period"),
  followUpDate: text("follow_up_date"),
  isVisibleToHomeowner: boolean("is_visible_to_homeowner").notNull().default(true), // Allow contractors to control visibility
  createdAt: timestamp("created_at").defaultNow(),
});

// Conversations table for messaging between homeowners and contractors
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  contractorId: text("contractor_id").notNull(),
  subject: text("subject").notNull(),
  status: text("status").notNull().default("active"), // "active", "closed", "archived"
  lastMessageAt: timestamp("last_message_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Messages table for individual messages in conversations
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: text("conversation_id").notNull(),
  senderId: text("sender_id").notNull(), // user ID who sent the message
  senderType: text("sender_type").notNull(), // "homeowner" or "contractor"
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contractor reviews table
export const contractorReviews = pgTable("contractor_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: text("contractor_id").notNull(),
  homeownerId: text("homeowner_id").notNull(),
  rating: integer("rating").notNull(), // 1-5 stars
  comment: text("comment"),
  serviceDate: timestamp("service_date"),
  serviceType: text("service_type"), // What service was provided
  wouldRecommend: boolean("would_recommend").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Contractor licenses table for multiple licenses per contractor
export const contractorLicenses = pgTable("contractor_licenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: text("contractor_id").notNull(),
  licenseNumber: text("license_number").notNull(),
  municipality: text("municipality").notNull(),
  state: text("state").notNull(),
  expiryDate: text("expiry_date"), // Date when license expires
  licenseType: text("license_type").notNull().default("General Contractor"), // Type of license
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const proposals = pgTable("proposals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: text("contractor_id").notNull(),
  homeownerId: text("homeowner_id"), // nullable until sent
  title: text("title").notNull(),
  description: text("description").notNull(),
  serviceType: text("service_type").notNull(),
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }).notNull(),
  estimatedDuration: text("estimated_duration").notNull(), // e.g., "2-3 days", "1 week"
  scope: text("scope").notNull(), // detailed scope of work
  materials: text("materials").array().notNull().default(sql`'{}'::text[]`), // list of materials included
  warrantyPeriod: text("warranty_period"), // e.g., "1 year", "6 months"
  validUntil: text("valid_until").notNull(), // expiration date for proposal
  status: text("status").notNull().default("draft"), // "draft", "sent", "accepted", "rejected", "expired"
  customerNotes: text("customer_notes"), // notes visible to customer about the job
  internalNotes: text("internal_notes"), // internal notes only contractor can see
  attachments: text("attachments").array().default(sql`'{}'::text[]`), // array of file paths/URLs
  contractFilePath: text("contract_file_path"), // path to uploaded contract file
  contractSignedAt: timestamp("contract_signed_at"), // when customer signed the contract
  customerSignature: text("customer_signature"), // customer's e-signature data
  contractorSignature: text("contractor_signature"), // contractor's signature
  signatureIpAddress: text("signature_ip_address"), // IP address when signed for legal purposes
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const homeSystems = pgTable("home_systems", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  houseId: text("house_id").notNull(),
  systemType: text("system_type").notNull(), // "Central Air", "Gas Heat", etc.
  installationYear: integer("installation_year"), // Year the system was installed
  lastServiceYear: integer("last_service_year"), // Year of last major service
  brand: text("brand"), // Brand/manufacturer
  model: text("model"), // Model number
  notes: text("notes"), // Additional notes about the system
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(), // links to users table
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  userAgent: text("user_agent"), // to identify device/browser
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const contractorBoosts = pgTable("contractor_boosts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: text("contractor_id").notNull(), // links to contractors table
  serviceCategory: text("service_category").notNull(), // the specific service being boosted
  businessAddress: text("business_address").notNull(), // contractor's business address for radius calculation
  businessLatitude: decimal("business_latitude", { precision: 10, scale: 8 }).notNull(),
  businessLongitude: decimal("business_longitude", { precision: 11, scale: 8 }).notNull(),
  boostRadius: integer("boost_radius").notNull().default(10), // radius in miles (fixed at 10)
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(), // amount paid for boost
  stripePaymentIntentId: text("stripe_payment_intent_id"), // Stripe payment tracking
  status: text("status").notNull().default("active"), // "active", "expired", "cancelled"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const houseTransfers = pgTable("house_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  houseId: text("house_id").notNull(), // references houses table
  fromHomeownerId: text("from_homeowner_id").notNull(), // current owner initiating transfer
  toHomeownerEmail: text("to_homeowner_email").notNull(), // email of recipient
  toHomeownerId: text("to_homeowner_id"), // nullable until accepted
  token: text("token").notNull().unique(), // secure token for transfer acceptance
  status: text("status").notNull().default("pending"), // "pending", "completed", "cancelled", "expired"
  expiresAt: timestamp("expires_at").notNull(), // when the transfer token expires
  completedAt: timestamp("completed_at"), // when transfer was completed
  // Transfer counts for audit trail
  maintenanceLogsTransferred: integer("maintenance_logs_transferred").default(0),
  appliancesTransferred: integer("appliances_transferred").default(0),
  appointmentsTransferred: integer("appointments_transferred").default(0),
  customTasksTransferred: integer("custom_tasks_transferred").default(0),
  homeSystemsTransferred: integer("home_systems_transferred").default(0),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Ensure no duplicate pending transfers for same house
  uniqueIndex("idx_house_transfers_pending").on(table.houseId, table.status).where(eq(table.status, "pending")),
]);

// Push subscription types
export const insertPushSubscriptionSchema = createInsertSchema(pushSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = z.infer<typeof insertPushSubscriptionSchema>;

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export const insertMaintenanceTaskSchema = createInsertSchema(maintenanceTasks).omit({
  id: true,
});

export const insertHomeApplianceSchema = createInsertSchema(homeAppliances).omit({
  id: true,
  createdAt: true,
});

export const insertMaintenanceLogSchema = createInsertSchema(maintenanceLogs).omit({
  id: true,
  createdAt: true,
});

export const insertContractorAppointmentSchema = createInsertSchema(contractorAppointments).omit({
  id: true,
  createdAt: true,
});

export const insertHouseSchema = createInsertSchema(houses).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertServiceRecordSchema = createInsertSchema(serviceRecords).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
  readAt: true,
});

export const insertContractorReviewSchema = createInsertSchema(contractorReviews).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertProposalSchema = createInsertSchema(proposals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCustomMaintenanceTaskSchema = createInsertSchema(customMaintenanceTasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHomeSystemSchema = createInsertSchema(homeSystems).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractorLicenseSchema = createInsertSchema(contractorLicenses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContractorBoostSchema = createInsertSchema(contractorBoosts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertHouseTransferSchema = createInsertSchema(houseTransfers).omit({
  id: true,
  createdAt: true,
  completedAt: true,
  maintenanceLogsTransferred: true,
  appliancesTransferred: true,
  appointmentsTransferred: true,
  customTasksTransferred: true,
  homeSystemsTransferred: true,
});

export const insertSubscriptionPlanSchema = createInsertSchema(subscriptionPlans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertReferralCreditSchema = createInsertSchema(referralCredits).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertSubscriptionPlan = z.infer<typeof insertSubscriptionPlanSchema>;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertReferralCredit = z.infer<typeof insertReferralCreditSchema>;
export type ReferralCredit = typeof referralCredits.$inferSelect;
export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractors.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertHomeAppliance = z.infer<typeof insertHomeApplianceSchema>;
export type HomeAppliance = typeof homeAppliances.$inferSelect;
export type InsertMaintenanceLog = z.infer<typeof insertMaintenanceLogSchema>;
export type MaintenanceLog = typeof maintenanceLogs.$inferSelect;
export type InsertContractorAppointment = z.infer<typeof insertContractorAppointmentSchema>;
export type ContractorAppointment = typeof contractorAppointments.$inferSelect;
export type InsertHouse = z.infer<typeof insertHouseSchema>;
export type House = typeof houses.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertServiceRecord = z.infer<typeof insertServiceRecordSchema>;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertContractorReview = z.infer<typeof insertContractorReviewSchema>;
export type ContractorReview = typeof contractorReviews.$inferSelect;
export type InsertCustomMaintenanceTask = z.infer<typeof insertCustomMaintenanceTaskSchema>;
export type CustomMaintenanceTask = typeof customMaintenanceTasks.$inferSelect;
export type InsertProposal = z.infer<typeof insertProposalSchema>;
export type Proposal = typeof proposals.$inferSelect;
export type InsertHomeSystem = z.infer<typeof insertHomeSystemSchema>;
export type HomeSystem = typeof homeSystems.$inferSelect;
export type InsertContractorLicense = z.infer<typeof insertContractorLicenseSchema>;
export type ContractorLicense = typeof contractorLicenses.$inferSelect;
export type InsertContractorBoost = z.infer<typeof insertContractorBoostSchema>;
export type ContractorBoost = typeof contractorBoosts.$inferSelect;
export type InsertHouseTransfer = z.infer<typeof insertHouseTransferSchema>;
export type HouseTransfer = typeof houseTransfers.$inferSelect;
