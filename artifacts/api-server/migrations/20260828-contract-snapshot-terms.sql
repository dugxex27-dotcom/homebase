ALTER TABLE contracts
  ADD COLUMN IF NOT EXISTS estimated_duration text,
  ADD COLUMN IF NOT EXISTS valid_until text;

UPDATE contracts AS contract
SET estimated_duration = proposal.estimated_duration
FROM proposals AS proposal
WHERE contract.proposal_id = proposal.id
  AND contract.estimated_duration IS NULL;

UPDATE contracts
SET estimated_duration = 'Not specified'
WHERE estimated_duration IS NULL;

UPDATE contracts AS contract
SET valid_until = proposal.valid_until
FROM proposals AS proposal
WHERE contract.proposal_id = proposal.id
  AND contract.valid_until IS NULL;

UPDATE contracts
SET valid_until = COALESCE(accepted_at::date::text, created_at::date::text)
WHERE valid_until IS NULL;

ALTER TABLE contracts
  ALTER COLUMN estimated_duration SET NOT NULL,
  ALTER COLUMN valid_until SET NOT NULL;