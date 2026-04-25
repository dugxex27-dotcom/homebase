CREATE TABLE "contractor_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" text NOT NULL,
	"session_id" text NOT NULL,
	"homeowner_id" text,
	"click_type" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"referrer_url" text,
	"clicked_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_appointments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text NOT NULL,
	"contractor_id" text,
	"contractor_name" text NOT NULL,
	"contractor_company" text,
	"contractor_phone" text,
	"service_type" text NOT NULL,
	"service_description" text NOT NULL,
	"home_area" text NOT NULL,
	"scheduled_date_time" text NOT NULL,
	"estimated_duration" integer,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_boosts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" text NOT NULL,
	"service_category" text NOT NULL,
	"business_address" text NOT NULL,
	"business_latitude" numeric(10, 8) NOT NULL,
	"business_longitude" numeric(11, 8) NOT NULL,
	"boost_radius" integer DEFAULT 10 NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"stripe_payment_intent_id" text,
	"status" text DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_licenses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" text NOT NULL,
	"license_number" text NOT NULL,
	"municipality" text NOT NULL,
	"state" text NOT NULL,
	"expiry_date" text,
	"license_type" text DEFAULT 'General Contractor' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractor_reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" text NOT NULL,
	"homeowner_id" text NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"service_date" timestamp,
	"service_type" text,
	"would_recommend" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "contractors" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"company" text NOT NULL,
	"bio" text NOT NULL,
	"location" text NOT NULL,
	"distance" numeric(5, 2),
	"rating" numeric(3, 2) NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"experience" integer NOT NULL,
	"services" text[] NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"license_number" text NOT NULL,
	"license_municipality" text NOT NULL,
	"is_licensed" boolean DEFAULT true NOT NULL,
	"service_radius" integer DEFAULT 25 NOT NULL,
	"has_emergency_services" boolean DEFAULT false NOT NULL,
	"profile_image" text,
	"business_logo" text,
	"project_photos" text[] DEFAULT ARRAY[]::text[],
	"google_business_url" text
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"contractor_id" text NOT NULL,
	"subject" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"last_message_at" timestamp DEFAULT now(),
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "custom_maintenance_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"estimated_time" text,
	"difficulty" text DEFAULT 'easy',
	"tools" text[],
	"cost" text,
	"frequency_type" text NOT NULL,
	"frequency_value" integer,
	"specific_months" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "home_appliance_manuals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appliance_id" varchar NOT NULL,
	"title" text NOT NULL,
	"type" text DEFAULT 'owner' NOT NULL,
	"source" text NOT NULL,
	"url" text NOT NULL,
	"file_name" text,
	"file_size" integer,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "home_appliances" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text,
	"name" text NOT NULL,
	"make" text NOT NULL,
	"model" text NOT NULL,
	"serial_number" text,
	"purchase_date" text,
	"install_date" text,
	"year_installed" integer,
	"notes" text,
	"location" text,
	"warranty_expiration" text,
	"last_service_date" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "home_systems" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text NOT NULL,
	"system_type" text NOT NULL,
	"installation_year" integer,
	"last_service_year" integer,
	"brand" text,
	"model" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "house_transfers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"house_id" text NOT NULL,
	"from_homeowner_id" text NOT NULL,
	"to_homeowner_email" text NOT NULL,
	"to_homeowner_id" text,
	"token" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"maintenance_logs_transferred" integer DEFAULT 0,
	"appliances_transferred" integer DEFAULT 0,
	"appointments_transferred" integer DEFAULT 0,
	"custom_tasks_transferred" integer DEFAULT 0,
	"home_systems_transferred" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "house_transfers_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "houses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text NOT NULL,
	"climate_zone" text NOT NULL,
	"home_systems" text[] NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text NOT NULL,
	"service_date" text NOT NULL,
	"service_type" text NOT NULL,
	"home_area" text NOT NULL,
	"service_description" text NOT NULL,
	"cost" numeric(10, 2),
	"contractor_name" text,
	"contractor_company" text,
	"contractor_id" text,
	"notes" text,
	"warranty_period" text,
	"next_service_due" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "maintenance_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"month" integer NOT NULL,
	"climate_zones" text[] NOT NULL,
	"priority" text NOT NULL,
	"estimated_time" text NOT NULL,
	"difficulty" text NOT NULL,
	"category" text NOT NULL,
	"tools" text[],
	"cost" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" text NOT NULL,
	"sender_type" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text,
	"appointment_id" text,
	"maintenance_task_id" text,
	"type" text NOT NULL,
	"category" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"scheduled_for" text NOT NULL,
	"sent_at" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"action_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"category" text NOT NULL,
	"rating" numeric(3, 2) NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"image" text NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"in_stock" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "proposals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" text NOT NULL,
	"homeowner_id" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"service_type" text NOT NULL,
	"estimated_cost" numeric(10, 2) NOT NULL,
	"estimated_duration" text NOT NULL,
	"scope" text NOT NULL,
	"materials" text[] DEFAULT '{}'::text[] NOT NULL,
	"warranty_period" text,
	"valid_until" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"customer_notes" text,
	"internal_notes" text,
	"attachments" text[] DEFAULT '{}'::text[],
	"contract_file_path" text,
	"contract_signed_at" timestamp,
	"customer_signature" text,
	"contractor_signature" text,
	"signature_ip_address" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh_key" text NOT NULL,
	"auth_key" text NOT NULL,
	"user_agent" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "referral_credits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_user_id" varchar NOT NULL,
	"referred_user_id" varchar NOT NULL,
	"credit_amount" numeric(10, 2) DEFAULT '1.00' NOT NULL,
	"status" text DEFAULT 'earned' NOT NULL,
	"earned_at" timestamp DEFAULT now() NOT NULL,
	"applied_at" timestamp,
	"applied_to_invoice_id" varchar,
	"applied_amount" numeric(10, 2),
	"billing_period_start" timestamp,
	"billing_period_end" timestamp,
	"expires_at" timestamp,
	"source" text DEFAULT 'referral' NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "CHK_not_self" CHECK (referrer_user_id <> referred_user_id)
);
--> statement-breakpoint
CREATE TABLE "service_records" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_id" varchar NOT NULL,
	"homeowner_id" text,
	"customer_name" text NOT NULL,
	"customer_address" text NOT NULL,
	"customer_phone" text,
	"customer_email" text,
	"service_type" text NOT NULL,
	"service_description" text NOT NULL,
	"service_date" text NOT NULL,
	"duration" text,
	"cost" numeric(10, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"notes" text,
	"materials_used" text[] DEFAULT '{}'::text[] NOT NULL,
	"warranty_period" text,
	"follow_up_date" text,
	"is_visible_to_homeowner" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscription_plans" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tier_name" text NOT NULL,
	"display_name" text NOT NULL,
	"description" text NOT NULL,
	"monthly_price" numeric(10, 2) NOT NULL,
	"min_houses" integer DEFAULT 0 NOT NULL,
	"max_houses" integer,
	"plan_type" text DEFAULT 'homeowner' NOT NULL,
	"stripe_product_id" varchar,
	"stripe_price_id" varchar,
	"features" text[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_plans_tier_name_unique" UNIQUE("tier_name"),
	CONSTRAINT "subscription_plans_stripe_product_id_unique" UNIQUE("stripe_product_id"),
	CONSTRAINT "subscription_plans_stripe_price_id_unique" UNIQUE("stripe_price_id")
);
--> statement-breakpoint
CREATE TABLE "task_overrides" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text NOT NULL,
	"task_id" text NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"frequency_type" text,
	"frequency_value" integer,
	"specific_months" text[],
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"role" text DEFAULT 'homeowner' NOT NULL,
	"referral_code" varchar,
	"referred_by" varchar,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"subscription_plan_id" varchar,
	"subscription_status" text DEFAULT 'inactive',
	"max_houses_allowed" integer DEFAULT 2 NOT NULL,
	"is_premium" boolean DEFAULT false NOT NULL,
	"stripe_customer_id" varchar,
	"stripe_subscription_id" varchar,
	"stripe_price_id" varchar,
	"subscription_start_date" timestamp,
	"subscription_end_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
ALTER TABLE "home_appliance_manuals" ADD CONSTRAINT "home_appliance_manuals_appliance_id_home_appliances_id_fk" FOREIGN KEY ("appliance_id") REFERENCES "public"."home_appliances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credits" ADD CONSTRAINT "referral_credits_referrer_user_id_users_id_fk" FOREIGN KEY ("referrer_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_credits" ADD CONSTRAINT "referral_credits_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_subscription_plan_id_subscription_plans_id_fk" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plans"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_house_transfers_pending" ON "house_transfers" USING btree ("house_id","status") WHERE "house_transfers"."status" = $1;--> statement-breakpoint
CREATE UNIQUE INDEX "UX_referral_pair" ON "referral_credits" USING btree ("referrer_user_id","referred_user_id");--> statement-breakpoint
CREATE INDEX "IDX_referral_referrer_status_applied_at" ON "referral_credits" USING btree ("referrer_user_id","status","applied_at");--> statement-breakpoint
CREATE INDEX "IDX_referral_referred" ON "referral_credits" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_task_overrides_unique" ON "task_overrides" USING btree ("homeowner_id","house_id","task_id");--> statement-breakpoint
CREATE INDEX "IDX_users_subscription_plan_id" ON "users" USING btree ("subscription_plan_id");