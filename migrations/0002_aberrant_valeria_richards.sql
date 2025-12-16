CREATE TABLE "crm_clients" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"secondary_phone" text,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"notes" text,
	"tags" text[] DEFAULT ARRAY[]::text[],
	"preferred_contact_method" text DEFAULT 'phone',
	"is_active" boolean DEFAULT true NOT NULL,
	"total_jobs_completed" integer DEFAULT 0 NOT NULL,
	"total_revenue" numeric(12, 2) DEFAULT '0.00',
	"last_service_date" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_import_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"integration_id" varchar,
	"import_type" text NOT NULL,
	"source_system" text,
	"entity_type" text NOT NULL,
	"file_name" text,
	"total_records" integer DEFAULT 0 NOT NULL,
	"successful_records" integer DEFAULT 0 NOT NULL,
	"failed_records" integer DEFAULT 0 NOT NULL,
	"skipped_records" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"field_mapping" jsonb,
	"errors" jsonb,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_invoices" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"client_id" varchar NOT NULL,
	"job_id" varchar,
	"quote_id" varchar,
	"invoice_number" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0.00',
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"discount" numeric(10, 2) DEFAULT '0.00',
	"total" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) DEFAULT '0.00',
	"amount_due" numeric(10, 2) NOT NULL,
	"due_date" timestamp,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"paid_at" timestamp,
	"payment_method" text,
	"payment_notes" text,
	"notes" text,
	"terms_and_conditions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_job_assignments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job_id" varchar NOT NULL,
	"team_member_id" varchar NOT NULL,
	"role" text DEFAULT 'assigned',
	"hours_worked" numeric(6, 2),
	"notes" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_jobs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"client_id" varchar NOT NULL,
	"quote_id" varchar,
	"title" text NOT NULL,
	"description" text,
	"service_type" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"scheduled_end_date" timestamp,
	"actual_start_time" timestamp,
	"actual_end_time" timestamp,
	"estimated_duration" integer,
	"actual_duration" integer,
	"address" text,
	"city" text,
	"state" text,
	"postal_code" text,
	"labor_cost" numeric(10, 2),
	"materials_cost" numeric(10, 2),
	"total_cost" numeric(10, 2),
	"notes" text,
	"internal_notes" text,
	"completion_notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_payments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"invoice_id" varchar NOT NULL,
	"client_id" varchar NOT NULL,
	"stripe_payment_intent_id" varchar,
	"stripe_charge_id" varchar,
	"stripe_transfer_id" varchar,
	"amount" numeric(10, 2) NOT NULL,
	"platform_fee" numeric(10, 2) DEFAULT '0.00',
	"stripe_fee" numeric(10, 2) DEFAULT '0.00',
	"net_amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'usd',
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"card_brand" varchar,
	"card_last4" varchar(4),
	"receipt_url" text,
	"refunded_amount" numeric(10, 2) DEFAULT '0.00',
	"refund_reason" text,
	"failure_reason" text,
	"metadata" jsonb,
	"paid_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_quotes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"contractor_user_id" varchar NOT NULL,
	"company_id" varchar,
	"client_id" varchar NOT NULL,
	"quote_number" varchar NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"service_type" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"line_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"tax_rate" numeric(5, 2) DEFAULT '0.00',
	"tax_amount" numeric(10, 2) DEFAULT '0.00',
	"discount" numeric(10, 2) DEFAULT '0.00',
	"total" numeric(10, 2) NOT NULL,
	"valid_until" timestamp,
	"sent_at" timestamp,
	"viewed_at" timestamp,
	"accepted_at" timestamp,
	"declined_at" timestamp,
	"notes" text,
	"terms_and_conditions" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "crm_team_members" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" varchar NOT NULL,
	"user_id" varchar,
	"email" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"phone" text,
	"role" text DEFAULT 'technician' NOT NULL,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"hourly_rate" numeric(8, 2),
	"color" varchar(7),
	"is_active" boolean DEFAULT true NOT NULL,
	"invited_at" timestamp,
	"joined_at" timestamp,
	"last_active_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rate_limit_tracking" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"identifier" varchar NOT NULL,
	"identifier_type" text NOT NULL,
	"endpoint" text NOT NULL,
	"window_start" timestamp NOT NULL,
	"window_end" timestamp NOT NULL,
	"request_count" integer DEFAULT 1 NOT NULL,
	"limit_exceeded" boolean DEFAULT false NOT NULL,
	"last_request_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_audit_logs" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_type" text NOT NULL,
	"event_category" text NOT NULL,
	"severity" text DEFAULT 'info' NOT NULL,
	"user_id" varchar,
	"user_email" varchar,
	"user_role" text,
	"target_user_id" varchar,
	"target_resource_type" text,
	"target_resource_id" varchar,
	"action" text NOT NULL,
	"action_details" jsonb,
	"ip_address" varchar,
	"user_agent" text,
	"session_id" varchar,
	"request_method" varchar(10),
	"request_path" text,
	"request_id" varchar,
	"response_status" integer,
	"error_message" text,
	"geo_location" jsonb,
	"device_fingerprint" varchar,
	"risk_score" integer,
	"is_anomaly" boolean DEFAULT false,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security_sessions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"session_sid" varchar NOT NULL,
	"ip_address" varchar,
	"user_agent" text,
	"device_fingerprint" varchar,
	"device_type" text,
	"browser" text,
	"os" text,
	"geo_location" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_activity_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"terminated_at" timestamp,
	"termination_reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "affiliate_payouts" ALTER COLUMN "amount" SET DEFAULT '15.00';--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_connect_account_id" varchar;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_onboarding_complete" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_charges_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_payouts_enabled" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "stripe_default_currency" varchar(3) DEFAULT 'usd';--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "referral_credit_cap" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "subscription_plans" ADD COLUMN "has_crm_access" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "crm_clients" ADD CONSTRAINT "crm_clients_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_clients" ADD CONSTRAINT "crm_clients_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_import_logs" ADD CONSTRAINT "crm_import_logs_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_import_logs" ADD CONSTRAINT "crm_import_logs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_import_logs" ADD CONSTRAINT "crm_import_logs_integration_id_crm_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."crm_integrations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_invoices" ADD CONSTRAINT "crm_invoices_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_invoices" ADD CONSTRAINT "crm_invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_invoices" ADD CONSTRAINT "crm_invoices_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_invoices" ADD CONSTRAINT "crm_invoices_job_id_crm_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."crm_jobs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_invoices" ADD CONSTRAINT "crm_invoices_quote_id_crm_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."crm_quotes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_job_assignments" ADD CONSTRAINT "crm_job_assignments_job_id_crm_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."crm_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_job_assignments" ADD CONSTRAINT "crm_job_assignments_team_member_id_crm_team_members_id_fk" FOREIGN KEY ("team_member_id") REFERENCES "public"."crm_team_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_jobs" ADD CONSTRAINT "crm_jobs_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_jobs" ADD CONSTRAINT "crm_jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_jobs" ADD CONSTRAINT "crm_jobs_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_payments" ADD CONSTRAINT "crm_payments_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_payments" ADD CONSTRAINT "crm_payments_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_payments" ADD CONSTRAINT "crm_payments_invoice_id_crm_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."crm_invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_payments" ADD CONSTRAINT "crm_payments_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_contractor_user_id_users_id_fk" FOREIGN KEY ("contractor_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_quotes" ADD CONSTRAINT "crm_quotes_client_id_crm_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."crm_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_team_members" ADD CONSTRAINT "crm_team_members_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crm_team_members" ADD CONSTRAINT "crm_team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_sessions" ADD CONSTRAINT "security_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_crm_clients_contractor" ON "crm_clients" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_clients_company" ON "crm_clients" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_clients_email" ON "crm_clients" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_crm_clients_is_active" ON "crm_clients" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_crm_import_logs_contractor" ON "crm_import_logs" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_import_logs_company" ON "crm_import_logs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_import_logs_status" ON "crm_import_logs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_crm_import_logs_created_at" ON "crm_import_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_crm_invoices_contractor" ON "crm_invoices" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_invoices_company" ON "crm_invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_invoices_client" ON "crm_invoices" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_invoices_job" ON "crm_invoices" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_invoices_status" ON "crm_invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_crm_invoices_due_date" ON "crm_invoices" USING btree ("due_date");--> statement-breakpoint
CREATE UNIQUE INDEX "UX_crm_invoices_number" ON "crm_invoices" USING btree ("contractor_user_id","invoice_number");--> statement-breakpoint
CREATE INDEX "IDX_crm_job_assignments_job" ON "crm_job_assignments" USING btree ("job_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_job_assignments_team_member" ON "crm_job_assignments" USING btree ("team_member_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_jobs_contractor" ON "crm_jobs" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_jobs_company" ON "crm_jobs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_jobs_client" ON "crm_jobs" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_jobs_status" ON "crm_jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_crm_jobs_scheduled_date" ON "crm_jobs" USING btree ("scheduled_date");--> statement-breakpoint
CREATE INDEX "IDX_crm_payments_contractor" ON "crm_payments" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_payments_company" ON "crm_payments" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_payments_invoice" ON "crm_payments" USING btree ("invoice_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_payments_client" ON "crm_payments" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_payments_status" ON "crm_payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "IDX_crm_payments_stripe_pi" ON "crm_payments" USING btree ("stripe_payment_intent_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_quotes_contractor" ON "crm_quotes" USING btree ("contractor_user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_quotes_company" ON "crm_quotes" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_quotes_client" ON "crm_quotes" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_quotes_status" ON "crm_quotes" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "UX_crm_quotes_number" ON "crm_quotes" USING btree ("contractor_user_id","quote_number");--> statement-breakpoint
CREATE INDEX "IDX_crm_team_company" ON "crm_team_members" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_team_user" ON "crm_team_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_crm_team_email" ON "crm_team_members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "IDX_crm_team_role" ON "crm_team_members" USING btree ("role");--> statement-breakpoint
CREATE INDEX "IDX_crm_team_is_active" ON "crm_team_members" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_rate_limit_identifier" ON "rate_limit_tracking" USING btree ("identifier","identifier_type");--> statement-breakpoint
CREATE INDEX "IDX_rate_limit_endpoint" ON "rate_limit_tracking" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "IDX_rate_limit_window" ON "rate_limit_tracking" USING btree ("window_start","window_end");--> statement-breakpoint
CREATE UNIQUE INDEX "UX_rate_limit_unique" ON "rate_limit_tracking" USING btree ("identifier","endpoint","window_start");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_event_type" ON "security_audit_logs" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_event_category" ON "security_audit_logs" USING btree ("event_category");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_user_id" ON "security_audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_target_resource" ON "security_audit_logs" USING btree ("target_resource_type","target_resource_id");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_created_at" ON "security_audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_severity" ON "security_audit_logs" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_ip_address" ON "security_audit_logs" USING btree ("ip_address");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_session_id" ON "security_audit_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "IDX_audit_logs_is_anomaly" ON "security_audit_logs" USING btree ("is_anomaly");--> statement-breakpoint
CREATE INDEX "IDX_security_sessions_user_id" ON "security_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_security_sessions_session_sid" ON "security_sessions" USING btree ("session_sid");--> statement-breakpoint
CREATE INDEX "IDX_security_sessions_is_active" ON "security_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "IDX_security_sessions_expires_at" ON "security_sessions" USING btree ("expires_at");