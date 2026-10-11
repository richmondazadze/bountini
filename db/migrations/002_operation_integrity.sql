ALTER TABLE operations ADD COLUMN IF NOT EXISTS expected_data text;
ALTER TABLE operations ADD COLUMN IF NOT EXISTS expected_account text;
CREATE UNIQUE INDEX IF NOT EXISTS one_active_actor_operation ON operations(bounty_id,actor) WHERE status IN ('waiting-wallet','submitting','confirming','unknown');
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS operation_id uuid REFERENCES operations(id);
