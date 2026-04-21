CREATE TABLE IF NOT EXISTS "invoice_analyses" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "homeowner_id" text NOT NULL,
        "house_id" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "completion_method" text NOT NULL DEFAULT 'contractor',
        "invoice_urls" text[] DEFAULT '{}'::text[],
        "before_photo_urls" text[] DEFAULT '{}'::text[],
        "after_photo_urls" text[] DEFAULT '{}'::text[],
        "receipt_urls" text[] DEFAULT '{}'::text[],
        "service_description" text,
        "service_date" text,
        "total_amount" numeric(10, 2),
        "contractor_name" text,
        "contractor_company" text,
        "home_area" text,
        "service_type" text,
        "ai_confidence" text,
        "ai_notes" text,
        "maintenance_log_id" text,
        "created_at" timestamp DEFAULT now(),
        "confirmed_at" timestamp
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_invoice_analyses_homeowner" ON "invoice_analyses" USING btree ("homeowner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_invoice_analyses_house" ON "invoice_analyses" USING btree ("house_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_invoice_analyses_status" ON "invoice_analyses" USING btree ("status");
