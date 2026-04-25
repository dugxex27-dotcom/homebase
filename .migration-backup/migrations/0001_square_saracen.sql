CREATE TABLE "achievement_definitions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"achievement_key" text NOT NULL,
	"category" text NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"icon" text NOT NULL,
	"criteria" text NOT NULL,
	"points" integer DEFAULT 10,
	"tier" text DEFAULT 'bronze',
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "achievement_definitions_achievement_key_unique" UNIQUE("achievement_key")
);
--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"achievement_type" text NOT NULL,
	"achievement_title" text NOT NULL,
	"achievement_description" text NOT NULL,
	"unlocked_at" timestamp DEFAULT now() NOT NULL,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "affiliate_payouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"affiliate_referral_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"amount" numeric(10, 2) DEFAULT '10.00' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"stripe_transfer_id" varchar,
	"error_message" text,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliate_payouts_affiliate_referral_id_unique" UNIQUE("affiliate_referral_id")
);
--> statement-breakpoint
CREATE TABLE "affiliate_referrals" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"referred_user_id" varchar NOT NULL,
	"referred_user_role" text NOT NULL,
	"referral_code" varchar NOT NULL,
	"status" text DEFAULT 'trial' NOT NULL,
	"signup_date" timestamp DEFAULT now() NOT NULL,
	"trial_end_date" timestamp,
	"first_payment_date" timestamp,
	"consecutive_months_paid" integer DEFAULT 0 NOT NULL,
	"last_payment_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "affiliate_referrals_referred_user_id_unique" UNIQUE("referred_user_id")
);
--> statement-breakpoint
CREATE TABLE "agent_profiles" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"stripe_connect_account_id" varchar,
	"stripe_onboarding_complete" boolean DEFAULT false NOT NULL,
	"phone" text,
	"website" text,
	"office_address" text,
	"license_number" text,
	"license_state" text,
	"license_expiration" timestamp,
	"verification_status" text DEFAULT 'not_submitted' NOT NULL,
	"state_id_storage_key" text,
	"state_id_original_filename" text,
	"state_id_mime_type" text,
	"state_id_file_size" integer,
	"state_id_uploaded_at" timestamp,
	"state_id_checksum" text,
	"verification_requested_at" timestamp,
	"verified_at" timestamp,
	"last_rejected_at" timestamp,
	"reviewed_by_admin_id" varchar,
	"review_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "agent_profiles_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
CREATE TABLE "agent_verification_audits" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_profile_id" varchar NOT NULL,
	"agent_id" varchar NOT NULL,
	"action" text NOT NULL,
	"previous_status" text NOT NULL,
	"new_status" text NOT NULL,
	"reviewed_by_admin_id" varchar,
	"reviewer_email" text,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "climate_zones" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" varchar NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"bio" text NOT NULL,
	"experience" integer DEFAULT 0 NOT NULL,
	"location" text NOT NULL,
	"owner_id" varchar NOT NULL,
	"rating" numeric(3, 2) DEFAULT '0' NOT NULL,
	"review_count" integer DEFAULT 0 NOT NULL,
	"services" text[] NOT NULL,
	"phone" text NOT NULL,
	"email" text NOT NULL,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"service_radius" integer DEFAULT 25 NOT NULL,
	"has_emergency_services" boolean DEFAULT false NOT NULL,
	"business_logo" text,
	"project_photos" text[] DEFAULT ARRAY[]::text[],
	"website" text,
	"facebook" text,
	"instagram" text,
	"linkedin" text,
	"google_business_url" text,
	"country_id" varchar,
	"region_id" varchar,
	"license_number" text NOT NULL,
	"license_municipality" text NOT NULL,
	"is_licensed" boolean DEFAULT true NOT NULL,
	"licenses" text,
	"insurance_info" text,
	"referral_code" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "companies_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "company_invite_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"code" varchar NOT NULL,
	"created_by" varchar NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"used_by" varchar,
	"used_at" timestamp,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "company_invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "countries" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"default_currency" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "countries_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "crm_integrations" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"platform" text NOT NULL,
	"platform_name" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"webhook_secret" text,
	"api_key" text,
	"api_secret" text,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp,
	"last_sync_at" timestamp,
	"sync_frequency" text DEFAULT 'manual',
	"field_mapping" jsonb,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_leads" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"source" text DEFAULT 'other' NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"project_type" text,
	"estimated_value" numeric(10, 2),
	"follow_up_date" timestamp,
	"last_contacted_at" timestamp,
	"won_at" timestamp,
	"lost_at" timestamp,
	"lost_reason" text,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_notes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lead_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"note_type" text DEFAULT 'general' NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "error_breadcrumbs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"error_log_id" varchar NOT NULL,
	"timestamp" timestamp NOT NULL,
	"event_type" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE TABLE "error_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"error_type" text NOT NULL,
	"error_message" text NOT NULL,
	"error_stack" text,
	"url" text,
	"user_agent" text,
	"user_id" varchar,
	"user_email" text,
	"user_role" text,
	"severity" text DEFAULT 'error' NOT NULL,
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp,
	"resolved_by" varchar,
	"notes" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "homeowner_connection_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text,
	"code" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"usage_limit" integer DEFAULT 1,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "homeowner_connection_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "invite_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" varchar(50) NOT NULL,
	"created_by" varchar,
	"used_by" varchar[] DEFAULT ARRAY[]::varchar[],
	"is_active" boolean DEFAULT true NOT NULL,
	"max_uses" integer DEFAULT 1 NOT NULL,
	"current_uses" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "invite_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"notification_type" text NOT NULL,
	"channels" text[] DEFAULT '{push}'::text[] NOT NULL,
	"is_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar NOT NULL,
	"token" varchar NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "password_reset_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "regional_maintenance_tasks" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" varchar NOT NULL,
	"climate_zone_id" varchar,
	"task_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category" text NOT NULL,
	"priority" text NOT NULL,
	"estimated_time" text,
	"difficulty" text,
	"tools" text[],
	"cost" text,
	"season" text,
	"months" text[],
	"system_requirements" text[],
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"country_id" varchar NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "regulatory_bodies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_id" varchar,
	"country_id" varchar NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"website" text,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "review_flags" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"review_id" varchar NOT NULL,
	"reported_by" varchar NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" varchar,
	"resolution" text,
	"created_at" timestamp DEFAULT now(),
	"resolved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "search_analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"search_term" text NOT NULL,
	"service_type" text,
	"user_zip_code" varchar(10),
	"search_context" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscription_cycle_events" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"stripe_subscription_id" varchar,
	"stripe_invoice_id" varchar,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"status" text NOT NULL,
	"amount" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "subscription_cycle_events_stripe_invoice_id_unique" UNIQUE("stripe_invoice_id")
);
--> statement-breakpoint
CREATE TABLE "support_tickets" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"category" text NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"assigned_to_admin_id" varchar,
	"assigned_to_admin_email" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"closed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "task_completions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"house_id" text NOT NULL,
	"task_id" text,
	"task_type" text NOT NULL,
	"task_title" text NOT NULL,
	"task_category" text,
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"completion_method" text DEFAULT 'professional' NOT NULL,
	"estimated_cost" numeric(10, 2),
	"actual_cost" numeric(10, 2),
	"cost_savings" numeric(10, 2),
	"notes" text,
	"documents_uploaded" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ticket_replies" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"is_internal" boolean DEFAULT false NOT NULL,
	"is_automated" boolean DEFAULT false NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"homeowner_id" text NOT NULL,
	"achievement_key" text NOT NULL,
	"progress" numeric(5, 2) DEFAULT '0',
	"is_unlocked" boolean DEFAULT false NOT NULL,
	"unlocked_at" timestamp,
	"metadata" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_activity" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"activity_type" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" varchar NOT NULL,
	"payload" jsonb NOT NULL,
	"headers" jsonb,
	"ip_address" text,
	"status" text NOT NULL,
	"error_message" text,
	"lead_id" varchar,
	"processed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "custom_maintenance_tasks" ALTER COLUMN "description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ALTER COLUMN "home_area" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ALTER COLUMN "service_description" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ALTER COLUMN "endpoint" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ALTER COLUMN "p256dh_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ALTER COLUMN "auth_key" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "max_houses_allowed" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "max_houses_allowed" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD COLUMN "company_id" varchar;--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD COLUMN "device_fingerprint" text;--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD COLUMN "ip_address" varchar(45);--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD COLUMN "is_verified_service" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "user_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "company_id" varchar NOT NULL;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "is_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "insurance_carrier" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "insurance_policy_number" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "insurance_expiry_date" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "insurance_coverage_amount" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "website" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "facebook" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "instagram" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "linkedin" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "country_id" varchar;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "region_id" varchar;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "licenses" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "insurance_info" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "contractors" ADD COLUMN "created_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "custom_maintenance_tasks" ADD COLUMN "pro_low" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "custom_maintenance_tasks" ADD COLUMN "pro_high" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "custom_maintenance_tasks" ADD COLUMN "materials_low" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "custom_maintenance_tasks" ADD COLUMN "materials_high" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "house_transfers" ADD COLUMN "transfer_note" text;--> statement-breakpoint
ALTER TABLE "house_transfers" ADD COLUMN "service_records_transferred" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "house_transfers" ADD COLUMN "updated_at" timestamp DEFAULT now();--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "country_id" varchar;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "region_id" varchar;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "climate_zone_id" varchar;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "postal_code" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "latitude" numeric(10, 8);--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "longitude" numeric(11, 8);--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "home_type" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "square_footage" integer;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "year_built" integer;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "roof_installed_year" integer;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "roof_type" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "hvac_installed_year" integer;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "hvac_type" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "plumbing_type" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "foundation_type" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "water_heater_installed_year" integer;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "water_heater_type" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "garage_type" text;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "number_of_stories" integer;--> statement-breakpoint
ALTER TABLE "houses" ADD COLUMN "primary_heating_fuel" text;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD COLUMN "receipt_urls" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD COLUMN "before_photo_urls" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD COLUMN "after_photo_urls" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD COLUMN "completion_method" text;--> statement-breakpoint
ALTER TABLE "maintenance_logs" ADD COLUMN "diy_savings_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "image_url" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "attachments" text[] DEFAULT '{}'::text[];--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "company_id" varchar;--> statement-breakpoint
ALTER TABLE "proposals" ADD COLUMN "created_by" varchar;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "provider" text DEFAULT 'web-push' NOT NULL;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "token" text;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "device_info" jsonb;--> statement-breakpoint
ALTER TABLE "push_subscriptions" ADD COLUMN "last_seen_at" timestamp;--> statement-breakpoint
ALTER TABLE "service_records" ADD COLUMN "company_id" varchar;--> statement-breakpoint
ALTER TABLE "service_records" ADD COLUMN "employee_id" varchar;--> statement-breakpoint
ALTER TABLE "service_records" ADD COLUMN "house_id" text;--> statement-breakpoint
ALTER TABLE "service_records" ADD COLUMN "home_area" text;--> statement-breakpoint
ALTER TABLE "task_overrides" ADD COLUMN "custom_description" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "password_hash" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone" varchar(20);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "zip_code" varchar(10);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "connection_code" varchar(8);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verified_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_verification_token_expiry" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_id" varchar;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_role" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "can_respond_to_proposals" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "trial_ends_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_status" text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "account_cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_affiliate_referral_id_affiliate_referrals_id_fk" FOREIGN KEY ("affiliate_referral_id") REFERENCES "public"."affiliate_referrals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ADD CONSTRAINT "affiliate_payouts_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliate_referrals" ADD CONSTRAINT "affiliate_referrals_referred_user_id_users_id_fk" FOREIGN KEY ("referred_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_profiles" ADD CONSTRAINT "agent_profiles_reviewed_by_admin_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_verification_audits" ADD CONSTRAINT "agent_verification_audits_agent_profile_id_agent_profiles_id_fk" FOREIGN KEY ("agent_profile_id") REFERENCES "public"."agent_profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_verification_audits" ADD CONSTRAINT "agent_verification_audits_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agent_verification_audits" ADD CONSTRAINT "agent_verification_audits_reviewed_by_admin_id_users_id_fk" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "climate_zones" ADD CONSTRAINT "climate_zones_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "companies" ADD CONSTRAINT "companies_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "company_invite_codes" ADD CONSTRAINT "company_invite_codes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_integrations" ADD CONSTRAINT "crm_integrations_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_integrations" ADD CONSTRAINT "crm_integrations_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_leads" ADD CONSTRAINT "crm_leads_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_notes" ADD CONSTRAINT "crm_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_breadcrumbs" ADD CONSTRAINT "error_breadcrumbs_error_log_id_error_logs_id_fk" FOREIGN KEY ("error_log_id") REFERENCES "public"."error_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "error_logs" ADD CONSTRAINT "error_logs_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_maintenance_tasks" ADD CONSTRAINT "regional_maintenance_tasks_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regional_maintenance_tasks" ADD CONSTRAINT "regional_maintenance_tasks_climate_zone_id_climate_zones_id_fk" FOREIGN KEY ("climate_zone_id") REFERENCES "public"."climate_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regions" ADD CONSTRAINT "regions_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_bodies" ADD CONSTRAINT "regulatory_bodies_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "regulatory_bodies" ADD CONSTRAINT "regulatory_bodies_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_flags" ADD CONSTRAINT "review_flags_review_id_contractor_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."contractor_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_analytics" ADD CONSTRAINT "search_analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscription_cycle_events" ADD CONSTRAINT "subscription_cycle_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assigned_to_admin_id_users_id_fk" FOREIGN KEY ("assigned_to_admin_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticket_id_support_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."support_tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_integration_id_crm_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."crm_integrations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_logs" ADD CONSTRAINT "webhook_logs_lead_id_crm_leads_id_fk" FOREIGN KEY ("lead_id") REFERENCES "public"."crm_leads"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_achievements_homeowner" ON "achievements" USING btree ("homeowner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UX_achievement_unique" ON "achievements" USING btree ("homeowner_id","achievement_type");--> statement-breakpoint
CREATE INDEX "IDX_affiliate_payouts_agent_id" ON "affiliate_payouts" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "IDX_affiliate_payouts_referral_id" ON "affiliate_payouts" USING btree ("affiliate_referral_id");--> statement-breakpoint
CREATE INDEX "IDX_affiliate_payouts_status" ON "affiliate_payouts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_affiliate_referrals_agent_id" ON "affiliate_referrals" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "IDX_affiliate_referrals_referred_user_id" ON "affiliate_referrals" USING btree ("referred_user_id");--> statement-breakpoint
CREATE INDEX "IDX_affiliate_referrals_status" ON "affiliate_referrals" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_agent_profiles_agent_id" ON "agent_profiles" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "IDX_agent_profiles_verification_status" ON "agent_profiles" USING btree ("verification_status");--> statement-breakpoint
CREATE INDEX "IDX_agent_verification_audits_agent_id" ON "agent_verification_audits" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "IDX_agent_verification_audits_profile_id" ON "agent_verification_audits" USING btree ("agent_profile_id");--> statement-breakpoint
CREATE INDEX "IDX_agent_verification_audits_action" ON "agent_verification_audits" USING btree ("action");--> statement-breakpoint
CREATE INDEX "IDX_agent_verification_audits_created_at" ON "agent_verification_audits" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_company_invite_codes_company" ON "company_invite_codes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_company_invite_codes_code" ON "company_invite_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "IDX_crm_integrations_contractor" ON "crm_integrations" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_integrations_company" ON "crm_integrations" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_integrations_platform" ON "crm_integrations" USING btree ("platform");--> statement-breakpoint
CREATE INDEX "IDX_crm_leads_contractor" ON "crm_leads" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_leads_company" ON "crm_leads" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_leads_status" ON "crm_leads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_crm_leads_priority" ON "crm_leads" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "IDX_crm_leads_follow_up_date" ON "crm_leads" USING btree ("follow_up_date");--> statement-breakpoint
CREATE INDEX "IDX_crm_leads_created_at" ON "crm_leads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_crm_notes_lead_id" ON "crm_notes" USING btree ("lead_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_notes_user_id" ON "crm_notes" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_notes_created_at" ON "crm_notes" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_error_breadcrumbs_error_log_id" ON "error_breadcrumbs" USING btree ("error_log_id");--> statement-breakpoint
CREATE INDEX "IDX_error_breadcrumbs_timestamp" ON "error_breadcrumbs" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "IDX_error_logs_type" ON "error_logs" USING btree ("error_type");--> statement-breakpoint
CREATE INDEX "IDX_error_logs_severity" ON "error_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "IDX_error_logs_resolved" ON "error_logs" USING btree ("resolved");--> statement-breakpoint
CREATE INDEX "IDX_error_logs_user_id" ON "error_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_error_logs_created_at" ON "error_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_invite_codes_code" ON "invite_codes" USING btree ("code");--> statement-breakpoint
CREATE INDEX "IDX_invite_codes_is_active" ON "invite_codes" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "UX_notification_preferences_user_type" ON "notification_preferences" USING btree ("user_id","notification_type");--> statement-breakpoint
CREATE INDEX "IDX_notification_preferences_user" ON "notification_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_password_reset_tokens_email" ON "password_reset_tokens" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_password_reset_tokens_token" ON "password_reset_tokens" USING btree ("token");--> statement-breakpoint
CREATE INDEX "IDX_review_flags_review" ON "review_flags" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "IDX_review_flags_status" ON "review_flags" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_review_flags_reported_by" ON "review_flags" USING btree ("reported_by");--> statement-breakpoint
CREATE INDEX "IDX_search_analytics_user_id" ON "search_analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_search_analytics_zip_code" ON "search_analytics" USING btree ("user_zip_code");--> statement-breakpoint
CREATE INDEX "IDX_search_analytics_created_at" ON "search_analytics" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_subscription_cycle_events_user_id" ON "subscription_cycle_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_subscription_cycle_events_subscription_id" ON "subscription_cycle_events" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "IDX_subscription_cycle_events_status" ON "subscription_cycle_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_subscription_cycle_events_user_period" ON "subscription_cycle_events" USING btree ("user_id","period_start");--> statement-breakpoint
CREATE INDEX "IDX_support_tickets_user_id" ON "support_tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_support_tickets_status" ON "support_tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_support_tickets_category" ON "support_tickets" USING btree ("category");--> statement-breakpoint
CREATE INDEX "IDX_support_tickets_assigned_to" ON "support_tickets" USING btree ("assigned_to_admin_id");--> statement-breakpoint
CREATE INDEX "IDX_support_tickets_created_at" ON "support_tickets" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_task_completions_homeowner" ON "task_completions" USING btree ("homeowner_id");--> statement-breakpoint
CREATE INDEX "IDX_task_completions_date" ON "task_completions" USING btree ("year","month");--> statement-breakpoint
CREATE INDEX "IDX_ticket_replies_ticket_id" ON "ticket_replies" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "IDX_ticket_replies_user_id" ON "ticket_replies" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_ticket_replies_created_at" ON "ticket_replies" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_user_achievements_homeowner" ON "user_achievements" USING btree ("homeowner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "UX_user_achievement_unique" ON "user_achievements" USING btree ("homeowner_id","achievement_key");--> statement-breakpoint
CREATE INDEX "IDX_user_activity_created_at" ON "user_activity" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_user_activity_user_id" ON "user_activity" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_user_activity_user_date" ON "user_activity" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "IDX_webhook_logs_integration" ON "webhook_logs" USING btree ("integration_id");--> statement-breakpoint
CREATE INDEX "IDX_webhook_logs_status" ON "webhook_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_webhook_logs_created_at" ON "webhook_logs" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "contractor_reviews" ADD CONSTRAINT "contractor_reviews_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contractors" ADD CONSTRAINT "contractors_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "houses" ADD CONSTRAINT "houses_country_id_countries_id_fk" FOREIGN KEY ("country_id") REFERENCES "public"."countries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "houses" ADD CONSTRAINT "houses_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "houses" ADD CONSTRAINT "houses_climate_zone_id_climate_zones_id_fk" FOREIGN KEY ("climate_zone_id") REFERENCES "public"."climate_zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "proposals" ADD CONSTRAINT "proposals_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_records" ADD CONSTRAINT "service_records_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "UX_review_homeowner_contractor" ON "contractor_reviews" USING btree ("homeowner_id","contractor_id");--> statement-breakpoint
CREATE INDEX "IDX_review_ip_address" ON "contractor_reviews" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "IDX_review_device_fingerprint" ON "contractor_reviews" USING btree ("device_fingerprint");--> statement-breakpoint
CREATE INDEX "IDX_review_homeowner" ON "contractor_reviews" USING btree ("homeowner_id");--> statement-breakpoint
CREATE INDEX "IDX_review_contractor" ON "contractor_reviews" USING btree ("contractor_id");--> statement-breakpoint
CREATE INDEX "IDX_maintenance_logs_completion_method" ON "maintenance_logs" USING btree ("completion_method");--> statement-breakpoint
CREATE INDEX "IDX_users_zip_code" ON "users" USING btree ("zip_code");--> statement-breakpoint
CREATE INDEX "IDX_users_company_id" ON "users" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_users_email_verification_token" ON "users" USING btree ("email_verification_token");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_connection_code_unique" UNIQUE("connection_code");