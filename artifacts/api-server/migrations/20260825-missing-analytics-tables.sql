-- Create the five tables already declared in the Drizzle schema.
-- This migration is intentionally narrow and development-safe: it only
-- creates missing tables/indexes and does not alter existing application data.

CREATE TABLE IF NOT EXISTS public.home_appliance_manuals (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  appliance_id varchar NOT NULL
    REFERENCES public.home_appliances(id) ON DELETE CASCADE,
  title text NOT NULL,
  type text NOT NULL DEFAULT 'owner',
  source text NOT NULL,
  url text NOT NULL,
  file_name text,
  file_size integer,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.contractor_analytics (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_id text NOT NULL,
  session_id text NOT NULL,
  homeowner_id text,
  click_type text NOT NULL,
  ip_address text,
  user_agent text,
  referrer_url text,
  clicked_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regional_maintenance_tasks (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id varchar NOT NULL
    REFERENCES public.countries(id),
  climate_zone_id varchar
    REFERENCES public.climate_zones(id),
  task_id text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  priority text NOT NULL,
  estimated_time text,
  difficulty text,
  tools text[],
  cost text,
  season text,
  months text[],
  system_requirements text[],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.regulatory_bodies (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id varchar
    REFERENCES public.regions(id),
  country_id varchar NOT NULL
    REFERENCES public.countries(id),
  name text NOT NULL,
  type text NOT NULL,
  website text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.search_analytics (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id varchar
    REFERENCES public.users(id) ON DELETE SET NULL,
  search_term text NOT NULL,
  service_type text,
  user_zip_code varchar(10),
  search_context text,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_search_analytics_user_id"
  ON public.search_analytics(user_id);
CREATE INDEX IF NOT EXISTS "IDX_search_analytics_zip_code"
  ON public.search_analytics(user_zip_code);
CREATE INDEX IF NOT EXISTS "IDX_search_analytics_created_at"
  ON public.search_analytics(created_at);