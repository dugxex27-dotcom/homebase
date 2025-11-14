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
// Companies table for contractor businesses
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  bio: text("bio").notNull(),
  experience: integer("experience").notNull().default(0), // Years of experience
  location: text("location").notNull(),
  ownerId: varchar("owner_id").notNull(), // User ID of the company owner
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull().default("0"),
  reviewCount: integer("review_count").notNull().default(0),
  services: text("services").array().notNull(), // Array of services offered
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  latitude: decimal("latitude", { precision: 10, scale: 8 }), // Geocoded latitude
  longitude: decimal("longitude", { precision: 11, scale: 8 }), // Geocoded longitude
  serviceRadius: integer("service_radius").notNull().default(25), // Service radius in miles
  hasEmergencyServices: boolean("has_emergency_services").notNull().default(false),
  businessLogo: text("business_logo"),
  projectPhotos: text("project_photos").array().default(sql`ARRAY[]::text[]`),
  website: text("website"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  googleBusinessUrl: text("google_business_url"),
  countryId: varchar("country_id").references(() => countries.id),
  regionId: varchar("region_id").references(() => regions.id),
  licenseNumber: text("license_number").notNull(),
  licenseMunicipality: text("license_municipality").notNull(),
  isLicensed: boolean("is_licensed").notNull().default(true),
  licenses: text("licenses"), // JSON string of licensing info per regulatory body
  insuranceInfo: text("insurance_info"), // JSON string of insurance details by region
  referralCode: varchar("referral_code").unique(), // Company-wide referral code (shared by all employees)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Company invite codes table for employees to join companies
export const companyInviteCodes = pgTable("company_invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  code: varchar("code").notNull().unique(),
  createdBy: varchar("created_by").notNull(), // User ID of who created the invite
  isActive: boolean("is_active").notNull().default(true),
  usedBy: varchar("used_by"), // User ID who used this code (nullable until used)
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"), // Optional expiration
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_company_invite_codes_company").on(table.companyId),
  index("IDX_company_invite_codes_code").on(table.code),
]);

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("homeowner"), // "homeowner", "contractor", or "agent"
  passwordHash: varchar("password_hash"),
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  zipCode: varchar("zip_code", { length: 10 }),
  referralCode: varchar("referral_code").unique(),
  referredBy: varchar("referred_by"), // referral code of user who referred this user
  referralCount: integer("referral_count").notNull().default(0),
  connectionCode: varchar("connection_code", { length: 8 }).unique(), // Permanent code for homeowners to share with contractors
  // Company fields for contractors
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'set null' }),
  companyRole: text("company_role"), // 'owner' or 'employee' (nullable for homeowners)
  canRespondToProposals: boolean("can_respond_to_proposals").notNull().default(false), // For employees: owner can toggle
  // Subscription fields
  subscriptionPlanId: varchar("subscription_plan_id").references(() => subscriptionPlans.id, { onDelete: 'set null' }), // FK to subscription_plans.id
  subscriptionStatus: text("subscription_status").default("inactive"), // "active", "inactive", "cancelled", "past_due", "trialing", "grandfathered"
  // Note: maxHousesAllowed and tier info can be derived from the plan, but keeping for performance
  maxHousesAllowed: integer("max_houses_allowed"), // Cached from subscription plan (null = unlimited for grandfathered users)
  isPremium: boolean("is_premium").notNull().default(false),
  trialEndsAt: timestamp("trial_ends_at"), // When the free trial ends (14 days from signup for new users)
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripePriceId: varchar("stripe_price_id"), // Current Stripe price ID for the subscription
  subscriptionStartDate: timestamp("subscription_start_date"),
  subscriptionEndDate: timestamp("subscription_end_date"),
  accountStatus: text("account_status").notNull().default("active"), // "active", "cancelled", "deleted"
  accountCancelledAt: timestamp("account_cancelled_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for subscription plan lookups
  index("IDX_users_subscription_plan_id").on(table.subscriptionPlanId),
  index("IDX_users_zip_code").on(table.zipCode),
  index("IDX_users_company_id").on(table.companyId),
]);

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  token: varchar("token").notNull().unique(), // 6-digit code
  expiresAt: timestamp("expires_at").notNull(), // Tokens expire after 15 minutes
  used: boolean("used").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_password_reset_tokens_email").on(table.email),
  index("IDX_password_reset_tokens_token").on(table.token),
]);

export const contractors = pgTable("contractors", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull(), // References users.id
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  company: text("company").notNull(), // Kept for backward compatibility, will match company.name
  bio: text("bio").notNull(),
  location: text("location").notNull(),
  distance: decimal("distance", { precision: 5, scale: 2 }),
  rating: decimal("rating", { precision: 3, scale: 2 }).notNull(),
  reviewCount: integer("review_count").notNull().default(0),
  experience: integer("experience").notNull(),
  services: text("services").array().notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  address: text("address"), // Street address
  city: text("city"), // City
  state: text("state"), // State/Province
  licenseNumber: text("license_number").notNull(),
  licenseMunicipality: text("license_municipality").notNull(),
  isLicensed: boolean("is_licensed").notNull().default(true),
  serviceRadius: integer("service_radius").notNull().default(25), // Service radius in miles

  hasEmergencyServices: boolean("has_emergency_services").notNull().default(false),
  profileImage: text("profile_image"),
  businessLogo: text("business_logo"),
  projectPhotos: text("project_photos").array().default(sql`ARRAY[]::text[]`),
  
  // Verification and insurance
  isVerified: boolean("is_verified").notNull().default(false),
  insuranceCarrier: text("insurance_carrier"),
  insurancePolicyNumber: text("insurance_policy_number"),
  insuranceExpiryDate: text("insurance_expiry_date"), // Date when insurance expires
  insuranceCoverageAmount: text("insurance_coverage_amount"), // e.g., "$1M", "$2M"
  
  // Website and social media
  website: text("website"),
  facebook: text("facebook"),
  instagram: text("instagram"),
  linkedin: text("linkedin"),
  googleBusinessUrl: text("google_business_url"),
  
  // International expansion fields
  countryId: varchar("country_id").references(() => countries.id), // nullable for backward compatibility
  regionId: varchar("region_id").references(() => regions.id), // nullable for backward compatibility
  licenses: text("licenses"), // JSON string of licensing info per regulatory body
  insuranceInfo: text("insurance_info"), // JSON string of insurance details by region
  postalCode: text("postal_code"), // For international address support
  
  createdAt: timestamp("created_at").defaultNow(),
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
  description: text("description"), // now optional
  category: text("category").notNull(),
  priority: text("priority").notNull().default('medium'), // 'high', 'medium', 'low'
  estimatedTime: text("estimated_time"),
  difficulty: text("difficulty").default('easy'), // 'easy', 'moderate', 'difficult'
  tools: text("tools").array(),
  cost: text("cost"),
  // Cost estimates for professional vs DIY
  proLow: decimal("pro_low", { precision: 10, scale: 2 }), // Minimum professional cost
  proHigh: decimal("pro_high", { precision: 10, scale: 2 }), // Maximum professional cost
  materialsLow: decimal("materials_low", { precision: 10, scale: 2 }), // Minimum materials cost for DIY
  materialsHigh: decimal("materials_high", { precision: 10, scale: 2 }), // Maximum materials cost for DIY
  // Frequency settings
  frequencyType: text("frequency_type").notNull(), // 'monthly', 'quarterly', 'biannually', 'annually', 'custom'
  frequencyValue: integer("frequency_value"), // for custom frequency in days
  specificMonths: text("specific_months").array(), // for annual tasks, which months (1-12)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Task overrides table for customizing default regional maintenance tasks
export const taskOverrides = pgTable("task_overrides", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  houseId: text("house_id").notNull(), // references houses table
  taskId: text("task_id").notNull(), // unique identifier for the default task (generated from task title)
  isEnabled: boolean("is_enabled").notNull().default(true), // false to disable the task entirely
  frequencyType: text("frequency_type"), // override default frequency: 'monthly', 'quarterly', 'biannually', 'annually', 'custom'
  frequencyValue: integer("frequency_value"), // for custom frequency in days
  specificMonths: text("specific_months").array(), // override which months the task appears in (1-12)
  customDescription: text("custom_description"), // user's custom description overriding the default
  notes: text("notes"), // user's personal notes about the customization
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure one override per task per house
  uniqueIndex("idx_task_overrides_unique").on(table.homeownerId, table.houseId, table.taskId),
]);

export const homeAppliances = pgTable("home_appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(), // In real app would be foreign key to users table
  houseId: text("house_id"), // Temporarily nullable for migration - will be required after backfill
  name: text("name").notNull(), // User-friendly name like "Kitchen Dishwasher", "Main Water Heater"
  make: text("make").notNull(), // Brand/manufacturer
  model: text("model").notNull(),
  serialNumber: text("serial_number"),
  purchaseDate: text("purchase_date"), // For age calculation
  installDate: text("install_date"), // For age calculation, separate from purchase
  yearInstalled: integer("year_installed"), // Keep for backward compatibility
  notes: text("notes"), // Additional details about condition, issues, etc.
  location: text("location"), // Kitchen, basement, garage, etc.
  warrantyExpiration: text("warranty_expiration"),
  lastServiceDate: text("last_service_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const homeApplianceManuals = pgTable("home_appliance_manuals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applianceId: varchar("appliance_id").notNull().references(() => homeAppliances.id, { onDelete: 'cascade' }),
  title: text("title").notNull(), // "Owner's Manual", "Installation Guide", etc.
  type: text("type").notNull().default("owner"), // 'owner', 'install', 'warranty', 'service', 'other'
  source: text("source").notNull(), // 'upload' or 'link'
  url: text("url").notNull(), // File path (/objects/...) or external URL
  fileName: text("file_name"), // Original filename if uploaded
  fileSize: integer("file_size"), // File size in bytes if uploaded
  createdAt: timestamp("created_at").defaultNow(),
});

export const maintenanceLogs = pgTable("maintenance_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(), // In real app would be foreign key to users table
  houseId: text("house_id").notNull(), // references houses table
  serviceDate: text("service_date").notNull(), // Date when service was performed
  serviceType: text("service_type").notNull(), // Type of service performed
  homeArea: text("home_area"), // What part of home was serviced (roof, HVAC, plumbing, etc.) - now optional
  serviceDescription: text("service_description"), // Description of work performed - now optional
  cost: decimal("cost", { precision: 10, scale: 2 }), // Cost of service
  contractorName: text("contractor_name"), // Name of contractor who performed service
  contractorCompany: text("contractor_company"), // Contractor company
  contractorId: text("contractor_id"), // Reference to contractor if from our platform
  notes: text("notes"), // Additional notes about the service
  warrantyPeriod: text("warranty_period"), // Warranty period for the work
  nextServiceDue: text("next_service_due"), // When next service is recommended
  receiptUrls: text("receipt_urls").array().default(sql`'{}'::text[]`), // uploaded receipt images
  beforePhotoUrls: text("before_photo_urls").array().default(sql`'{}'::text[]`), // before photos
  afterPhotoUrls: text("after_photo_urls").array().default(sql`'{}'::text[]`), // after photos
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
  climateZone: text("climate_zone").notNull(), // Legacy field for backward compatibility
  homeSystems: text("home_systems").array().notNull(), // Array of systems like ["Central Air", "Gas Heat", etc.]
  isDefault: boolean("is_default").default(false).notNull(),
  // International expansion fields
  countryId: varchar("country_id").references(() => countries.id), // nullable for backward compatibility
  regionId: varchar("region_id").references(() => regions.id), // nullable for backward compatibility  
  climateZoneId: varchar("climate_zone_id").references(() => climateZones.id), // nullable for backward compatibility
  postalCode: text("postal_code"), // For international address support
  latitude: decimal("latitude", { precision: 10, scale: 8 }), // Geocoded latitude
  longitude: decimal("longitude", { precision: 11, scale: 8 }), // Geocoded longitude
  // Household Profile fields for maintenance schedule generation
  homeType: text("home_type"), // "single_family", "condo", "townhouse", "apartment", "mobile_home", "multi_family"
  squareFootage: integer("square_footage"), // Total square footage of the home
  yearBuilt: integer("year_built"), // Year the home was built
  roofInstalledYear: integer("roof_installed_year"), // Year roof was installed/replaced
  roofType: text("roof_type"), // "asphalt_shingle", "metal", "tile", "flat", "slate", "wood"
  hvacInstalledYear: integer("hvac_installed_year"), // Year HVAC system was installed
  hvacType: text("hvac_type"), // "central_air", "heat_pump", "furnace", "boiler", "ductless", "window_unit"
  plumbingType: text("plumbing_type"), // "copper", "pex", "cpvc", "galvanized", "mixed"
  foundationType: text("foundation_type"), // "slab", "crawl_space", "basement", "pier_and_beam"
  waterHeaterInstalledYear: integer("water_heater_installed_year"), // Year water heater was installed
  waterHeaterType: text("water_heater_type"), // "tank", "tankless", "hybrid"
  garageType: text("garage_type"), // "none", "attached", "detached", "carport"
  numberOfStories: integer("number_of_stories"), // 1, 2, 3, etc.
  primaryHeatingFuel: text("primary_heating_fuel"), // "natural_gas", "electric", "oil", "propane", "wood", "other"
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

// User activity fact table for analytics (tracks user engagement events)
export const userActivity = pgTable("user_activity", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(), // links to users table
  activityType: text("activity_type").notNull(), // "login", "search", "message", "proposal", "task_completion", "house_added", "contractor_view", "boost_purchase"
  metadata: jsonb("metadata"), // Additional context (e.g., { searchTerm, serviceType, conversationId, taskId })
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  // Critical index for time-series queries
  index("IDX_user_activity_created_at").on(table.createdAt),
  // Index for user-specific queries
  index("IDX_user_activity_user_id").on(table.userId),
  // Composite index for user activity over time
  index("IDX_user_activity_user_date").on(table.userId, table.createdAt),
]);

export const serviceRecords = pgTable("service_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: varchar("contractor_id").notNull(), // Kept for backward compatibility
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'set null' }), // Company that performed service
  employeeId: varchar("employee_id"), // Specific employee who performed service (user_id)
  homeownerId: text("homeowner_id"), // Added to link to homeowner
  houseId: text("house_id"), // Link to specific house for homeowner's multi-property support
  customerName: text("customer_name").notNull(),
  customerAddress: text("customer_address").notNull(),
  customerPhone: text("customer_phone"),
  customerEmail: text("customer_email"),
  serviceType: text("service_type").notNull(),
  serviceDescription: text("service_description").notNull(),
  homeArea: text("home_area"), // What part of home was serviced (roof, HVAC, plumbing, etc.)
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

// Homeowner connection codes for contractors to add service records
export const homeownerConnectionCodes = pgTable("homeowner_connection_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(), // Homeowner who generated the code
  houseId: text("house_id"), // Optional: specific house for the connection
  code: text("code").notNull().unique(), // The shareable code (8-character alphanumeric)
  expiresAt: timestamp("expires_at").notNull(), // When the code expires
  isActive: boolean("is_active").notNull().default(true), // Can be manually deactivated
  usageLimit: integer("usage_limit").default(1), // How many times the code can be used (null = unlimited)
  usageCount: integer("usage_count").notNull().default(0), // How many times it's been used
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
  imageUrl: text("image_url"), // Optional image attachment (legacy - for backward compatibility)
  attachments: text("attachments").array().default(sql`'{}'::text[]`), // Array of file URLs (images, PDFs, docs)
  isRead: boolean("is_read").default(false).notNull(),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Contractor reviews table (now company reviews)
export const contractorReviews = pgTable("contractor_reviews", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: text("contractor_id").notNull(), // Kept for backward compatibility
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'cascade' }), // Company being reviewed
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
  contractorId: text("contractor_id").notNull(), // Kept for backward compatibility
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'set null' }), // Company making the proposal
  createdBy: varchar("created_by"), // Employee who created the proposal (user_id)
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
  provider: text("provider").notNull().default("web-push"), // "web-push" or "fcm"
  endpoint: text("endpoint"), // nullable for FCM (only web-push uses this)
  p256dhKey: text("p256dh_key"), // nullable for FCM (only web-push uses this)
  authKey: text("auth_key"), // nullable for FCM (only web-push uses this)
  token: text("token"), // FCM device token (nullable for web-push)
  deviceInfo: jsonb("device_info"), // Device metadata (browser, OS, etc.)
  userAgent: text("user_agent"), // to identify device/browser
  lastSeenAt: timestamp("last_seen_at"), // Last time this subscription was verified active
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const notificationPreferences = pgTable("notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: text("user_id").notNull(), // links to users table
  notificationType: text("notification_type").notNull(), // "messages", "appointments", "maintenance", "proposals", "referrals", "scheduled_jobs", "contractor_updates"
  channels: text("channels").array().notNull().default(sql`'{push}'::text[]`), // Array of enabled channels: "push", "email", "sms"
  isEnabled: boolean("is_enabled").notNull().default(true), // Global toggle for this notification type
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint: one preference row per user per notification type
  uniqueIndex("UX_notification_preferences_user_type").on(table.userId, table.notificationType),
  // Performance index for querying user's preferences
  index("IDX_notification_preferences_user").on(table.userId),
]);

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

// Task completions tracking for achievements and streak calculation
export const taskCompletions = pgTable("task_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  houseId: text("house_id").notNull(), // references houses table
  taskId: text("task_id"), // references maintenanceTasks or customMaintenanceTasks
  taskType: text("task_type").notNull(), // "maintenance" or "custom"
  taskTitle: text("task_title").notNull(), // denormalized for quick access
  taskCategory: text("task_category"), // category for seasonal tracking
  completedAt: timestamp("completed_at").notNull().defaultNow(),
  month: integer("month").notNull(), // 1-12, month when task was completed
  year: integer("year").notNull(), // year when task was completed
  completionMethod: text("completion_method").notNull().default("professional"), // "diy" or "professional"
  estimatedCost: decimal("estimated_cost", { precision: 10, scale: 2 }), // estimated cost before doing task
  actualCost: decimal("actual_cost", { precision: 10, scale: 2 }), // actual cost paid
  costSavings: decimal("cost_savings", { precision: 10, scale: 2 }), // calculated savings (for DIY tasks)
  notes: text("notes"), // optional completion notes
  documentsUploaded: integer("documents_uploaded").default(0), // count of receipts/photos uploaded
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_task_completions_homeowner").on(table.homeownerId),
  index("IDX_task_completions_date").on(table.year, table.month),
]);

// Achievement definitions - master list of all available achievements
export const achievementDefinitions = pgTable("achievement_definitions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  achievementKey: text("achievement_key").notNull().unique(), // unique identifier e.g. "winter_ready", "budget_boss"
  category: text("category").notNull(), // "seasonal", "financial", "organization", "streak", "community"
  name: text("name").notNull(), // Display name
  description: text("description").notNull(), // What this achievement is for
  icon: text("icon").notNull(), // lucide-react icon name
  criteria: text("criteria").notNull(), // JSON string describing unlock criteria
  points: integer("points").default(10), // Achievement points value
  tier: text("tier").default("bronze"), // "bronze", "silver", "gold", "platinum"
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0), // for display ordering
  createdAt: timestamp("created_at").defaultNow(),
});

// User achievements - tracks which achievements each user has earned
export const userAchievements = pgTable("user_achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  achievementKey: text("achievement_key").notNull(), // references achievementDefinitions.achievementKey
  progress: decimal("progress", { precision: 5, scale: 2 }).default("0"), // percentage progress (0-100)
  isUnlocked: boolean("is_unlocked").default(false).notNull(),
  unlockedAt: timestamp("unlocked_at"),
  metadata: text("metadata"), // JSON string for additional tracking data
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_user_achievements_homeowner").on(table.homeownerId),
  uniqueIndex("UX_user_achievement_unique").on(table.homeownerId, table.achievementKey),
]);

// Legacy achievements table - kept for backward compatibility, will migrate to userAchievements
export const achievements = pgTable("achievements", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(),
  achievementType: text("achievement_type").notNull(), // "first_task", "monthly_streak", "contractor_hired_1", "contractor_hired_3", "contractor_hired_5", "contractor_hired_10", "referral"
  achievementTitle: text("achievement_title").notNull(), // Display title
  achievementDescription: text("achievement_description").notNull(), // Description of what was accomplished
  unlockedAt: timestamp("unlocked_at").notNull().defaultNow(),
  metadata: text("metadata"), // JSON string for additional data (e.g., streak count, contractor count)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_achievements_homeowner").on(table.homeownerId),
  // Ensure one achievement per type per homeowner (except referrals which can be multiple)
  uniqueIndex("UX_achievement_unique").on(table.homeownerId, table.achievementType),
]);

export const houseTransfers = pgTable("house_transfers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  houseId: text("house_id").notNull(), // references houses table
  fromHomeownerId: text("from_homeowner_id").notNull(), // current owner initiating transfer
  toHomeownerEmail: text("to_homeowner_email").notNull(), // email of recipient
  toHomeownerId: text("to_homeowner_id"), // nullable until accepted
  token: text("token").notNull().unique(), // secure token for transfer acceptance
  status: text("status").notNull().default("pending"), // "pending", "accepted", "completed", "cancelled", "expired"
  expiresAt: timestamp("expires_at").notNull(), // when the transfer token expires
  completedAt: timestamp("completed_at"), // when transfer was completed
  transferNote: text("transfer_note"), // optional note from sender
  // Transfer counts for audit trail
  maintenanceLogsTransferred: integer("maintenance_logs_transferred").default(0),
  appliancesTransferred: integer("appliances_transferred").default(0),
  appointmentsTransferred: integer("appointments_transferred").default(0),
  customTasksTransferred: integer("custom_tasks_transferred").default(0),
  homeSystemsTransferred: integer("home_systems_transferred").default(0),
  serviceRecordsTransferred: integer("service_records_transferred").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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

// Notification preference types
export const insertNotificationPreferenceSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference = z.infer<typeof insertNotificationPreferenceSchema>;

export const insertContractorSchema = createInsertSchema(contractors).omit({
  id: true,
});

export const insertCompanySchema = createInsertSchema(companies).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  rating: true,
  reviewCount: true,
});

export const insertCompanyInviteCodeSchema = createInsertSchema(companyInviteCodes).omit({
  id: true,
  createdAt: true,
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

export const insertHomeApplianceManualSchema = createInsertSchema(homeApplianceManuals).omit({
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
}).extend({
  homeType: z.enum(['single_family', 'condo', 'townhouse', 'apartment', 'mobile_home', 'multi_family']).optional(),
  squareFootage: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  roofInstalledYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  roofType: z.enum(['asphalt_shingle', 'metal', 'tile', 'flat', 'slate', 'wood']).optional(),
  hvacInstalledYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  hvacType: z.enum(['central_air', 'heat_pump', 'furnace', 'boiler', 'ductless', 'window_unit']).optional(),
  plumbingType: z.enum(['copper', 'pex', 'cpvc', 'galvanized', 'mixed']).optional(),
  foundationType: z.enum(['slab', 'crawl_space', 'basement', 'pier_and_beam']).optional(),
  waterHeaterInstalledYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  waterHeaterType: z.enum(['tank', 'tankless', 'hybrid']).optional(),
  garageType: z.enum(['none', 'attached', 'detached', 'carport']).optional(),
  numberOfStories: z.number().int().positive().max(10).optional(),
  primaryHeatingFuel: z.enum(['natural_gas', 'electric', 'oil', 'propane', 'wood', 'other']).optional(),
});

// Update schema specifically for household profile updates
export const updateHouseholdProfileSchema = z.object({
  homeType: z.enum(['single_family', 'condo', 'townhouse', 'apartment', 'mobile_home', 'multi_family']).optional(),
  squareFootage: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  roofInstalledYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  roofType: z.enum(['asphalt_shingle', 'metal', 'tile', 'flat', 'slate', 'wood']).optional(),
  hvacInstalledYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  hvacType: z.enum(['central_air', 'heat_pump', 'furnace', 'boiler', 'ductless', 'window_unit']).optional(),
  plumbingType: z.enum(['copper', 'pex', 'cpvc', 'galvanized', 'mixed']).optional(),
  foundationType: z.enum(['slab', 'crawl_space', 'basement', 'pier_and_beam']).optional(),
  waterHeaterInstalledYear: z.number().int().min(1800).max(new Date().getFullYear()).optional(),
  waterHeaterType: z.enum(['tank', 'tankless', 'hybrid']).optional(),
  garageType: z.enum(['none', 'attached', 'detached', 'carport']).optional(),
  numberOfStories: z.number().int().positive().max(10).optional(),
  primaryHeatingFuel: z.enum(['natural_gas', 'electric', 'oil', 'propane', 'wood', 'other']).optional(),
});

export const insertTaskOverrideSchema = createInsertSchema(taskOverrides).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type TaskOverride = typeof taskOverrides.$inferSelect;
export type InsertTaskOverride = z.infer<typeof insertTaskOverrideSchema>;

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertUserActivitySchema = createInsertSchema(userActivity).omit({
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

export const insertHomeownerConnectionCodeSchema = createInsertSchema(homeownerConnectionCodes).omit({
  id: true,
  createdAt: true,
  usageCount: true,
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

export const insertTaskCompletionSchema = createInsertSchema(taskCompletions).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementDefinitionSchema = createInsertSchema(achievementDefinitions).omit({
  id: true,
  createdAt: true,
});

export const insertUserAchievementSchema = createInsertSchema(userAchievements).omit({
  id: true,
  createdAt: true,
});

export const insertAchievementSchema = createInsertSchema(achievements).omit({
  id: true,
  createdAt: true,
});

export const insertHouseTransferSchema = createInsertSchema(houseTransfers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  completedAt: true,
  maintenanceLogsTransferred: true,
  appliancesTransferred: true,
  appointmentsTransferred: true,
  customTasksTransferred: true,
  homeSystemsTransferred: true,
  serviceRecordsTransferred: true,
});

// Contractor Analytics table for tracking profile interactions
export const contractorAnalytics = pgTable("contractor_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorId: text("contractor_id").notNull(), // references contractors table
  sessionId: text("session_id").notNull(), // unique session identifier
  homeownerId: text("homeowner_id"), // nullable, if user is logged in
  clickType: text("click_type").notNull(), // 'profile_view', 'website', 'facebook', 'instagram', 'linkedin', 'google_business', 'phone', 'email', 'message'
  ipAddress: text("ip_address"), // for unique visitor tracking
  userAgent: text("user_agent"), // browser information
  referrerUrl: text("referrer_url"), // where they came from
  clickedAt: timestamp("clicked_at").defaultNow(),
});

export const insertContractorAnalyticsSchema = createInsertSchema(contractorAnalytics).omit({
  id: true,
  clickedAt: true,
});

// Regional Support Tables for International Expansion

// Countries table - master list of supported countries
export const countries = pgTable("countries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(), // ISO 3166-1 alpha-2 (US, CA, AU, GB)
  name: text("name").notNull(), // United States, Canada, Australia, United Kingdom
  isActive: boolean("is_active").default(true).notNull(),
  defaultCurrency: text("default_currency").notNull(), // USD, CAD, AUD, GBP
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Administrative regions within countries (states, provinces, territories)
export const regions = pgTable("regions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").notNull().references(() => countries.id),
  code: text("code").notNull(), // State/province code (CA, ON, NSW, etc.)
  name: text("name").notNull(), // California, Ontario, New South Wales
  type: text("type").notNull(), // state, province, territory, country
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Climate zones for each country with regional mapping
export const climateZones = pgTable("climate_zones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").notNull().references(() => countries.id),
  code: text("code").notNull(), // pacific-northwest, zone-5, zone-1, etc.
  name: text("name").notNull(), // Pacific Northwest, Zone 5 - Warm-Humid, etc.
  description: text("description"), // Detailed climate description
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Regulatory bodies for contractor licensing by region
export const regulatoryBodies = pgTable("regulatory_bodies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  regionId: varchar("region_id").references(() => regions.id),
  countryId: varchar("country_id").notNull().references(() => countries.id),
  name: text("name").notNull(), // Gas Safe Register, Skilled Trades Ontario, etc.
  type: text("type").notNull(), // licensing, certification, registration
  website: text("website"), // Official website URL
  description: text("description"), // What they regulate
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Regional maintenance task templates with seasonal mappings
export const regionalMaintenanceTasks = pgTable("regional_maintenance_tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  countryId: varchar("country_id").notNull().references(() => countries.id),
  climateZoneId: varchar("climate_zone_id").references(() => climateZones.id),
  taskId: text("task_id").notNull(), // Unique identifier for the task type
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // HVAC, Plumbing, Electrical, etc.
  priority: text("priority").notNull(), // high, medium, low
  estimatedTime: text("estimated_time"),
  difficulty: text("difficulty"), // easy, medium, hard
  tools: text("tools").array(), // Required tools
  cost: text("cost"), // Estimated cost range
  season: text("season"), // spring, summer, autumn, winter, year-round
  months: text("months").array(), // Specific months [1,2,3] for seasonal tasks
  systemRequirements: text("system_requirements").array(), // Required home systems
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Schema definitions for new regional tables
export const insertCountrySchema = createInsertSchema(countries).omit({
  id: true,
  createdAt: true,
});

export const insertRegionSchema = createInsertSchema(regions).omit({
  id: true,
  createdAt: true,
});

export const insertClimateZoneSchema = createInsertSchema(climateZones).omit({
  id: true,
  createdAt: true,
});

export const insertRegulatoryBodySchema = createInsertSchema(regulatoryBodies).omit({
  id: true,
  createdAt: true,
});

export const insertRegionalMaintenanceTaskSchema = createInsertSchema(regionalMaintenanceTasks).omit({
  id: true,
  createdAt: true,
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
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;
export type InsertCompanyInviteCode = z.infer<typeof insertCompanyInviteCodeSchema>;
export type CompanyInviteCode = typeof companyInviteCodes.$inferSelect;
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
export type InsertUserActivity = z.infer<typeof insertUserActivitySchema>;
export type UserActivity = typeof userActivity.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UpsertUser = typeof users.$inferInsert;
export type InsertServiceRecord = z.infer<typeof insertServiceRecordSchema>;
export type ServiceRecord = typeof serviceRecords.$inferSelect;
export type InsertHomeownerConnectionCode = z.infer<typeof insertHomeownerConnectionCodeSchema>;
export type HomeownerConnectionCode = typeof homeownerConnectionCodes.$inferSelect;
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
export type InsertTaskCompletion = z.infer<typeof insertTaskCompletionSchema>;
export type TaskCompletion = typeof taskCompletions.$inferSelect;
export type InsertAchievementDefinition = z.infer<typeof insertAchievementDefinitionSchema>;
export type AchievementDefinition = typeof achievementDefinitions.$inferSelect;
export type InsertUserAchievement = z.infer<typeof insertUserAchievementSchema>;
export type UserAchievement = typeof userAchievements.$inferSelect;
export type InsertAchievement = z.infer<typeof insertAchievementSchema>;
export type Achievement = typeof achievements.$inferSelect;
export type InsertHouseTransfer = z.infer<typeof insertHouseTransferSchema>;
export type HouseTransfer = typeof houseTransfers.$inferSelect;
export type InsertContractorAnalytics = z.infer<typeof insertContractorAnalyticsSchema>;
export type ContractorAnalytics = typeof contractorAnalytics.$inferSelect;
export type InsertHomeApplianceManual = z.infer<typeof insertHomeApplianceManualSchema>;
export type HomeApplianceManual = typeof homeApplianceManuals.$inferSelect;

// Type exports for new regional tables
export type Country = typeof countries.$inferSelect;
export type InsertCountry = z.infer<typeof insertCountrySchema>;
export type Region = typeof regions.$inferSelect;
export type InsertRegion = z.infer<typeof insertRegionSchema>;
export type ClimateZone = typeof climateZones.$inferSelect;
export type InsertClimateZone = z.infer<typeof insertClimateZoneSchema>;
export type RegulatoryBody = typeof regulatoryBodies.$inferSelect;
export type InsertRegulatoryBody = z.infer<typeof insertRegulatoryBodySchema>;
export type RegionalMaintenanceTask = typeof regionalMaintenanceTasks.$inferSelect;
export type InsertRegionalMaintenanceTask = z.infer<typeof insertRegionalMaintenanceTaskSchema>;

// Search analytics table
export const searchAnalytics = pgTable("search_analytics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }),
  searchTerm: text("search_term").notNull(),
  serviceType: text("service_type"),
  userZipCode: varchar("user_zip_code", { length: 10 }),
  searchContext: text("search_context"), // "contractor_directory", "marketplace", "maintenance"
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_search_analytics_user_id").on(table.userId),
  index("IDX_search_analytics_zip_code").on(table.userZipCode),
  index("IDX_search_analytics_created_at").on(table.createdAt),
]);

export const insertSearchAnalyticsSchema = createInsertSchema(searchAnalytics).omit({ id: true, createdAt: true });
export type InsertSearchAnalytics = z.infer<typeof insertSearchAnalyticsSchema>;
export type SearchAnalytics = typeof searchAnalytics.$inferSelect;

// Invite codes table
export const inviteCodes = pgTable("invite_codes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  code: varchar("code", { length: 50 }).notNull().unique(),
  createdBy: varchar("created_by").references(() => users.id, { onDelete: 'set null' }),
  usedBy: varchar("used_by").array().default(sql`ARRAY[]::varchar[]`),
  isActive: boolean("is_active").notNull().default(true),
  maxUses: integer("max_uses").notNull().default(1),
  currentUses: integer("current_uses").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_invite_codes_code").on(table.code),
  index("IDX_invite_codes_is_active").on(table.isActive),
]);

export const insertInviteCodeSchema = createInsertSchema(inviteCodes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertInviteCode = z.infer<typeof insertInviteCodeSchema>;
export type InviteCode = typeof inviteCodes.$inferSelect;

// Agent profiles table for real estate agents (affiliates)
export const agentProfiles = pgTable("agent_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  stripeConnectAccountId: varchar("stripe_connect_account_id"),
  stripeOnboardingComplete: boolean("stripe_onboarding_complete").notNull().default(false),
  
  // Contact information fields
  phone: text("phone"),
  website: text("website"),
  officeAddress: text("office_address"),
  
  // Verification fields
  licenseNumber: text("license_number"),
  licenseState: text("license_state"),
  licenseExpiration: timestamp("license_expiration"),
  verificationStatus: text("verification_status").notNull().default("not_submitted"), // 'not_submitted', 'pending_review', 'approved', 'rejected', 'resubmit_required'
  
  // State ID document metadata
  stateIdStorageKey: text("state_id_storage_key"), // Object storage reference
  stateIdOriginalFilename: text("state_id_original_filename"),
  stateIdMimeType: text("state_id_mime_type"),
  stateIdFileSize: integer("state_id_file_size"),
  stateIdUploadedAt: timestamp("state_id_uploaded_at"),
  stateIdChecksum: text("state_id_checksum"),
  
  // Verification timestamps
  verificationRequestedAt: timestamp("verification_requested_at"),
  verifiedAt: timestamp("verified_at"),
  lastRejectedAt: timestamp("last_rejected_at"),
  
  // Admin review fields
  reviewedByAdminId: varchar("reviewed_by_admin_id").references(() => users.id, { onDelete: 'set null' }),
  reviewNotes: text("review_notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_agent_profiles_agent_id").on(table.agentId),
  index("IDX_agent_profiles_verification_status").on(table.verificationStatus),
]);

export const insertAgentProfileSchema = createInsertSchema(agentProfiles).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgentProfile = z.infer<typeof insertAgentProfileSchema>;
export type AgentProfile = typeof agentProfiles.$inferSelect;

// Agent verification submission validation schema
export const agentVerificationSubmissionSchema = z.object({
  licenseNumber: z.string().min(1, "License number is required").max(100),
  licenseState: z.string().length(2, "State must be 2-letter code").transform((v) => v.toUpperCase()),
  licenseExpiration: z.string().refine((date) => {
    const parsed = new Date(date);
    return !isNaN(parsed.getTime()) && parsed > new Date();
  }, "License must not be expired"),
  uploadId: z.string().uuid("Invalid upload ID"),
});

export type AgentVerificationSubmission = z.infer<typeof agentVerificationSubmissionSchema>;

// Agent contact information update validation schema
export const agentContactInfoSchema = z.object({
  phone: z.string().max(20).trim().optional().or(z.literal('')),
  website: z.string().url({ message: "Please enter a valid URL (e.g., https://example.com)" }).max(2048).trim().optional().or(z.literal('')),
  officeAddress: z.string().max(255).trim().optional().or(z.literal('')),
});

export type AgentContactInfo = z.infer<typeof agentContactInfoSchema>;

// Affiliate referrals table - tracks each referral made by an agent
export const affiliateReferrals = pgTable("affiliate_referrals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentId: varchar("agent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  referredUserId: varchar("referred_user_id").notNull().unique().references(() => users.id, { onDelete: 'cascade' }),
  referredUserRole: text("referred_user_role").notNull(), // 'homeowner' or 'contractor'
  referralCode: varchar("referral_code").notNull(), // The agent's referral code used
  status: text("status").notNull().default("trial"), // 'trial', 'month_1', 'month_2', 'month_3', 'eligible', 'payout_pending', 'paid', 'voided'
  signupDate: timestamp("signup_date").notNull().defaultNow(),
  trialEndDate: timestamp("trial_end_date"),
  firstPaymentDate: timestamp("first_payment_date"),
  consecutiveMonthsPaid: integer("consecutive_months_paid").notNull().default(0),
  lastPaymentDate: timestamp("last_payment_date"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_affiliate_referrals_agent_id").on(table.agentId),
  index("IDX_affiliate_referrals_referred_user_id").on(table.referredUserId),
  index("IDX_affiliate_referrals_status").on(table.status),
]);

export const insertAffiliateReferralSchema = createInsertSchema(affiliateReferrals).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliateReferral = z.infer<typeof insertAffiliateReferralSchema>;
export type AffiliateReferral = typeof affiliateReferrals.$inferSelect;

// Subscription cycle events - tracks individual payment cycles for consecutive month calculation
export const subscriptionCycleEvents = pgTable("subscription_cycle_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  stripeInvoiceId: varchar("stripe_invoice_id").unique(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  status: text("status").notNull(), // 'paid', 'failed', 'voided'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_subscription_cycle_events_user_id").on(table.userId),
  index("IDX_subscription_cycle_events_subscription_id").on(table.stripeSubscriptionId),
  index("IDX_subscription_cycle_events_status").on(table.status),
  index("IDX_subscription_cycle_events_user_period").on(table.userId, table.periodStart),
]);

export const insertSubscriptionCycleEventSchema = createInsertSchema(subscriptionCycleEvents).omit({ id: true, createdAt: true });
export type InsertSubscriptionCycleEvent = z.infer<typeof insertSubscriptionCycleEventSchema>;
export type SubscriptionCycleEvent = typeof subscriptionCycleEvents.$inferSelect;

// Affiliate payouts table - tracks $10 payments to agents when referrals hit 4-month milestone
export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  affiliateReferralId: varchar("affiliate_referral_id").notNull().unique().references(() => affiliateReferrals.id, { onDelete: 'cascade' }),
  agentId: varchar("agent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull().default("10.00"),
  status: text("status").notNull().default("pending"), // 'pending', 'processing', 'paid', 'failed'
  stripeTransferId: varchar("stripe_transfer_id"),
  errorMessage: text("error_message"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_affiliate_payouts_agent_id").on(table.agentId),
  index("IDX_affiliate_payouts_referral_id").on(table.affiliateReferralId),
  index("IDX_affiliate_payouts_status").on(table.status),
]);

export const insertAffiliatePayoutSchema = createInsertSchema(affiliatePayouts).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAffiliatePayout = z.infer<typeof insertAffiliatePayoutSchema>;
export type AffiliatePayout = typeof affiliatePayouts.$inferSelect;

// Agent verification audits table - tracks all verification review actions for compliance
export const agentVerificationAudits = pgTable("agent_verification_audits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  agentProfileId: varchar("agent_profile_id").notNull().references(() => agentProfiles.id, { onDelete: 'cascade' }),
  agentId: varchar("agent_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // 'submitted', 'approved', 'rejected', 'resubmit_requested'
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(),
  reviewedByAdminId: varchar("reviewed_by_admin_id").references(() => users.id, { onDelete: 'set null' }),
  reviewerEmail: text("reviewer_email"), // Store email for audit even if admin deleted
  notes: text("notes"),
  metadata: jsonb("metadata"), // Store additional context (IP, user agent, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_agent_verification_audits_agent_id").on(table.agentId),
  index("IDX_agent_verification_audits_profile_id").on(table.agentProfileId),
  index("IDX_agent_verification_audits_action").on(table.action),
  index("IDX_agent_verification_audits_created_at").on(table.createdAt),
]);

export const insertAgentVerificationAuditSchema = createInsertSchema(agentVerificationAudits).omit({ id: true, createdAt: true });
export type InsertAgentVerificationAudit = z.infer<typeof insertAgentVerificationAuditSchema>;
export type AgentVerificationAudit = typeof agentVerificationAudits.$inferSelect;

// Support tickets table - customer support ticket system
export const supportTickets = pgTable("support_tickets", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  category: text("category").notNull(), // 'billing', 'technical', 'feature_request', 'account', 'contractor', 'general'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  status: text("status").notNull().default("open"), // 'open', 'in_progress', 'waiting_on_customer', 'resolved', 'closed'
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  assignedToAdminId: varchar("assigned_to_admin_id").references(() => users.id, { onDelete: 'set null' }),
  assignedToAdminEmail: text("assigned_to_admin_email"), // Store email for display
  metadata: jsonb("metadata"), // Store additional context (browser info, page URL, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  closedAt: timestamp("closed_at"),
}, (table) => [
  index("IDX_support_tickets_user_id").on(table.userId),
  index("IDX_support_tickets_status").on(table.status),
  index("IDX_support_tickets_category").on(table.category),
  index("IDX_support_tickets_assigned_to").on(table.assignedToAdminId),
  index("IDX_support_tickets_created_at").on(table.createdAt),
]);

export const insertSupportTicketSchema = createInsertSchema(supportTickets).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupportTicket = z.infer<typeof insertSupportTicketSchema>;
export type SupportTicket = typeof supportTickets.$inferSelect;

// Ticket replies table - messages/replies to support tickets
export const ticketReplies = pgTable("ticket_replies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ticketId: varchar("ticket_id").notNull().references(() => supportTickets.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  isInternal: boolean("is_internal").notNull().default(false), // True for admin-only notes
  isAutomated: boolean("is_automated").notNull().default(false), // True for automated replies
  metadata: jsonb("metadata"), // Store additional context (attachments, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_ticket_replies_ticket_id").on(table.ticketId),
  index("IDX_ticket_replies_user_id").on(table.userId),
  index("IDX_ticket_replies_created_at").on(table.createdAt),
]);

export const insertTicketReplySchema = createInsertSchema(ticketReplies).omit({ id: true, createdAt: true });
export type InsertTicketReply = z.infer<typeof insertTicketReplySchema>;
export type TicketReply = typeof ticketReplies.$inferSelect;

// CRM Leads table - for contractors to manage their leads/prospects
export const crmLeads = pgTable("crm_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contractorUserId: varchar("contractor_user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'cascade' }), // Optional, for company-wide leads
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  postalCode: text("postal_code"),
  source: text("source").notNull().default("other"), // 'referral', 'website', 'advertisement', 'social_media', 'repeat_customer', 'other'
  status: text("status").notNull().default("new"), // 'new', 'contacted', 'qualified', 'proposal_sent', 'won', 'lost', 'not_interested'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  projectType: text("project_type"), // e.g., 'roofing', 'siding', 'gutters'
  estimatedValue: decimal("estimated_value", { precision: 10, scale: 2 }),
  followUpDate: timestamp("follow_up_date"),
  lastContactedAt: timestamp("last_contacted_at"),
  wonAt: timestamp("won_at"),
  lostAt: timestamp("lost_at"),
  lostReason: text("lost_reason"), // Reason for losing the lead
  tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Custom tags for filtering
  metadata: jsonb("metadata"), // Store additional custom fields
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_crm_leads_contractor").on(table.contractorUserId),
  index("IDX_crm_leads_company").on(table.companyId),
  index("IDX_crm_leads_status").on(table.status),
  index("IDX_crm_leads_priority").on(table.priority),
  index("IDX_crm_leads_follow_up_date").on(table.followUpDate),
  index("IDX_crm_leads_created_at").on(table.createdAt),
]);

export const insertCrmLeadSchema = createInsertSchema(crmLeads).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmLead = z.infer<typeof insertCrmLeadSchema>;
export type CrmLead = typeof crmLeads.$inferSelect;

// CRM Notes table - notes associated with leads
export const crmNotes = pgTable("crm_notes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: varchar("lead_id").notNull().references(() => crmLeads.id, { onDelete: 'cascade' }),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }), // Who wrote the note
  content: text("content").notNull(),
  noteType: text("note_type").notNull().default("general"), // 'general', 'call', 'meeting', 'email', 'follow_up'
  isPinned: boolean("is_pinned").notNull().default(false), // Pin important notes to top
  metadata: jsonb("metadata"), // Store additional context (call duration, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  index("IDX_crm_notes_lead_id").on(table.leadId),
  index("IDX_crm_notes_user_id").on(table.userId),
  index("IDX_crm_notes_created_at").on(table.createdAt),
]);

export const insertCrmNoteSchema = createInsertSchema(crmNotes).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCrmNote = z.infer<typeof insertCrmNoteSchema>;
export type CrmNote = typeof crmNotes.$inferSelect;

// Error Logs table - for tracking client and server errors
export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  errorType: text("error_type").notNull(), // 'client', 'api', 'server'
  errorMessage: text("error_message").notNull(),
  errorStack: text("error_stack"), // Full stack trace
  url: text("url"), // URL where error occurred
  userAgent: text("user_agent"), // Browser info
  userId: varchar("user_id").references(() => users.id, { onDelete: 'set null' }), // Null for anonymous errors
  userEmail: text("user_email"), // Denormalized for quick reference
  userRole: text("user_role"), // 'homeowner', 'contractor', 'agent', null
  severity: text("severity").notNull().default("error"), // 'info', 'warning', 'error', 'critical'
  resolved: boolean("resolved").notNull().default(false),
  resolvedAt: timestamp("resolved_at"),
  resolvedBy: varchar("resolved_by").references(() => users.id, { onDelete: 'set null' }),
  notes: text("notes"), // Admin notes about the error
  metadata: jsonb("metadata"), // Additional context (component name, props, etc.)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("IDX_error_logs_type").on(table.errorType),
  index("IDX_error_logs_severity").on(table.severity),
  index("IDX_error_logs_resolved").on(table.resolved),
  index("IDX_error_logs_user_id").on(table.userId),
  index("IDX_error_logs_created_at").on(table.createdAt),
]);

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({ id: true, createdAt: true });
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;
export type ErrorLog = typeof errorLogs.$inferSelect;

// Error Breadcrumbs table - user events leading to errors
export const errorBreadcrumbs = pgTable("error_breadcrumbs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  errorLogId: varchar("error_log_id").notNull().references(() => errorLogs.id, { onDelete: 'cascade' }),
  timestamp: timestamp("timestamp").notNull(),
  eventType: text("event_type").notNull(), // 'navigation', 'click', 'api_call', 'user_input'
  message: text("message").notNull(),
  data: jsonb("data"), // Additional event data
}, (table) => [
  index("IDX_error_breadcrumbs_error_log_id").on(table.errorLogId),
  index("IDX_error_breadcrumbs_timestamp").on(table.timestamp),
]);

export const insertErrorBreadcrumbSchema = createInsertSchema(errorBreadcrumbs).omit({ id: true });
export type InsertErrorBreadcrumb = z.infer<typeof insertErrorBreadcrumbSchema>;
export type ErrorBreadcrumb = typeof errorBreadcrumbs.$inferSelect;
