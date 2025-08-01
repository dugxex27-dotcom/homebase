import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp, index, jsonb } from "drizzle-orm/pg-core";
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

// Users table for Replit Auth with role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: text("role").notNull().default("homeowner"), // "homeowner" or "contractor"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

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
  insuranceProvider: text("insurance_provider").notNull(),
  isLicensed: boolean("is_licensed").notNull().default(true),
  isInsured: boolean("is_insured").notNull().default(true),

  hasEmergencyServices: boolean("has_emergency_services").notNull().default(false),
  profileImage: text("profile_image"),
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

export const homeAppliances = pgTable("home_appliances", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  homeownerId: text("homeowner_id").notNull(), // In real app would be foreign key to users table
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
