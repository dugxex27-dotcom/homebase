CREATE TABLE IF NOT EXISTS demo_leads (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  zipcode text NOT NULL,
  role text NOT NULL DEFAULT 'homeowner',
  ip_address text,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "IDX_demo_leads_email" ON demo_leads (email);
CREATE INDEX IF NOT EXISTS "IDX_demo_leads_created_at" ON demo_leads (created_at);
