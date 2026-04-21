CREATE TABLE IF NOT EXISTS "weather_forecast_reminders_sent" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "house_id" text NOT NULL,
        "trigger_type" text NOT NULL,
        "sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "UX_wfr_user_house_trigger" ON "weather_forecast_reminders_sent" USING btree ("user_id","house_id","trigger_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_wfr_user" ON "weather_forecast_reminders_sent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "IDX_wfr_sent_at" ON "weather_forecast_reminders_sent" USING btree ("sent_at");
