CREATE TABLE "home_handoff_packages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" varchar NOT NULL,
	"property_address" text NOT NULL,
	"buyer_name" text NOT NULL,
	"buyer_email" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"invite_token" varchar,
	"extracted_data" jsonb,
	"notes" text,
	"claimed_by_user_id" varchar,
	"claimed_at" timestamp,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "home_handoff_packages_invite_token_unique" UNIQUE("invite_token")
);
--> statement-breakpoint
CREATE TABLE "handoff_documents" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"handoff_package_id" varchar NOT NULL,
	"file_name" text NOT NULL,
	"file_type" text NOT NULL,
	"storage_key" text,
	"extracted_text" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "home_handoff_packages" ADD CONSTRAINT "home_handoff_packages_agent_id_users_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "home_handoff_packages" ADD CONSTRAINT "home_handoff_packages_claimed_by_user_id_users_id_fk" FOREIGN KEY ("claimed_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "handoff_documents" ADD CONSTRAINT "handoff_documents_handoff_package_id_home_handoff_packages_id_fk" FOREIGN KEY ("handoff_package_id") REFERENCES "public"."home_handoff_packages"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "IDX_handoff_packages_agent_id" ON "home_handoff_packages" USING btree ("agent_id");
--> statement-breakpoint
CREATE INDEX "IDX_handoff_packages_invite_token" ON "home_handoff_packages" USING btree ("invite_token");
--> statement-breakpoint
CREATE INDEX "IDX_handoff_packages_status" ON "home_handoff_packages" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "IDX_handoff_documents_package_id" ON "handoff_documents" USING btree ("handoff_package_id");
