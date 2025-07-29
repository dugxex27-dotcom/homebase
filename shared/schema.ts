import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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

export type InsertContractor = z.infer<typeof insertContractorSchema>;
export type Contractor = typeof contractors.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertMaintenanceTask = z.infer<typeof insertMaintenanceTaskSchema>;
export type MaintenanceTask = typeof maintenanceTasks.$inferSelect;
export type InsertHomeAppliance = z.infer<typeof insertHomeApplianceSchema>;
export type HomeAppliance = typeof homeAppliances.$inferSelect;
