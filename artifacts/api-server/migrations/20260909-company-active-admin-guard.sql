-- Prevent a contractor company from losing its final active owner/admin.
--
-- This is a deferred constraint trigger so ownership transfers can demote the
-- old owner and promote the new owner in either order inside one transaction.
-- A separate immediate trigger serializes membership changes per company,
-- preventing two transactions from each relying on the other's uncommitted
-- administrator and then both committing.
-- It is idempotent for local recovery and post-merge application.
--
-- Production: publish after this migration has been applied to development.
-- Replit's Publish flow carries the development schema change to production;
-- do not run this migration from application startup or a deployment command.
CREATE OR REPLACE FUNCTION lock_company_membership_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_company_id varchar;
BEGIN
  -- Sort IDs so a move between two companies always acquires locks in the same
  -- order. Hash collisions only add harmless serialization.
  FOR affected_company_id IN
    SELECT DISTINCT company_id
    FROM (
      VALUES
        (CASE WHEN TG_OP <> 'INSERT' THEN OLD.company_id ELSE NULL END),
        (CASE WHEN TG_OP <> 'DELETE' THEN NEW.company_id ELSE NULL END)
    ) AS affected(company_id)
    WHERE company_id IS NOT NULL
    ORDER BY company_id
  LOOP
    PERFORM pg_advisory_xact_lock(hashtextextended(affected_company_id, 0));
  END LOOP;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION enforce_company_active_admin()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  affected_company_id varchar;
BEGIN
  FOR affected_company_id IN
    SELECT DISTINCT company_id
    FROM (
      VALUES
        (CASE WHEN TG_OP <> 'INSERT' THEN OLD.company_id ELSE NULL END),
        (CASE WHEN TG_OP <> 'DELETE' THEN NEW.company_id ELSE NULL END)
    ) AS affected(company_id)
    WHERE company_id IS NOT NULL
  LOOP
    -- A deleted company does not need an administrator. This also permits the
    -- users.company_id ON DELETE SET NULL action during company deletion.
    IF EXISTS (SELECT 1 FROM companies WHERE id = affected_company_id)
       AND NOT EXISTS (
         SELECT 1
         FROM users
         WHERE company_id = affected_company_id
           AND company_role IN ('owner', 'admin')
           AND (company_status = 'active' OR company_status IS NULL)
       )
    THEN
      RAISE EXCEPTION
        'company % must retain at least one active owner or admin',
        affected_company_id
        USING ERRCODE = '23514',
              CONSTRAINT = 'company_requires_active_admin';
    END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS lock_company_membership_change ON users;
DROP TRIGGER IF EXISTS company_requires_active_admin ON users;

CREATE TRIGGER lock_company_membership_change
BEFORE INSERT OR UPDATE OF company_id, company_role, company_status OR DELETE
ON users
FOR EACH ROW
EXECUTE FUNCTION lock_company_membership_change();

CREATE CONSTRAINT TRIGGER company_requires_active_admin
AFTER INSERT OR UPDATE OF company_id, company_role, company_status OR DELETE
ON users
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION enforce_company_active_admin();