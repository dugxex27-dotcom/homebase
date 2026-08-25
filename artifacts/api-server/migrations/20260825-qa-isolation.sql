ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_qa_account boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS qa_access_scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  ADD COLUMN IF NOT EXISTS qa_fixture_key varchar(80);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_qa_fixture_key_unique'
      AND conrelid = 'users'::regclass
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_qa_fixture_key_unique UNIQUE (qa_fixture_key);
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS IDX_users_is_qa_account ON users (is_qa_account);

CREATE TABLE IF NOT EXISTS qa_fixture_registry (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_key varchar(80) NOT NULL UNIQUE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  fixture_role text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp NOT NULL DEFAULT now(),
  retired_at timestamp
);

CREATE INDEX IF NOT EXISTS IDX_qa_fixture_registry_user_id ON qa_fixture_registry (user_id);
CREATE INDEX IF NOT EXISTS IDX_qa_fixture_registry_active ON qa_fixture_registry (is_active);