CREATE TABLE "weather_alerts_sent" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" text NOT NULL,
        "house_id" text NOT NULL,
        "nws_alert_id" text NOT NULL,
        "alert_event" text NOT NULL,
        "sent_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "UX_weather_alerts_house_alert" ON "weather_alerts_sent" USING btree ("user_id","house_id","nws_alert_id");--> statement-breakpoint
CREATE INDEX "IDX_weather_alerts_user" ON "weather_alerts_sent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "IDX_weather_alerts_sent_at" ON "weather_alerts_sent" USING btree ("sent_at");
