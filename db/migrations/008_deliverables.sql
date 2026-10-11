CREATE TABLE IF NOT EXISTS attachments (
 id uuid PRIMARY KEY, bounty_id uuid NOT NULL REFERENCES bounties(id), worker text NOT NULL,
 filename text NOT NULL, size integer NOT NULL CHECK(size BETWEEN 1 AND 2097152),
 content_type text NOT NULL, sha256 text NOT NULL CHECK(sha256 ~ '^[0-9a-f]{64}$'),
 object_path text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'uploading' CHECK(status IN ('uploading','ready','deleting','deleted')),
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS submission_manifests (
 id uuid PRIMARY KEY, bounty_id uuid NOT NULL REFERENCES bounties(id), worker text NOT NULL,
 revision smallint NOT NULL CHECK(revision IN (0,1)), content_hash text NOT NULL,
 manifest jsonb NOT NULL, confirmed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bounty_id,revision,content_hash)
);
CREATE TABLE IF NOT EXISTS manifest_attachments (
 manifest_id uuid NOT NULL REFERENCES submission_manifests(id), attachment_id uuid NOT NULL REFERENCES attachments(id),
 PRIMARY KEY(manifest_id,attachment_id)
);
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES submission_manifests(id);
ALTER TABLE operations ADD COLUMN IF NOT EXISTS manifest_id uuid REFERENCES submission_manifests(id);
ALTER TABLE submissions DROP CONSTRAINT IF EXISTS submissions_body_check;
ALTER TABLE submissions ADD CONSTRAINT submissions_body_check CHECK(length(body) BETWEEN 0 AND 20000);
CREATE INDEX IF NOT EXISTS attachment_cleanup ON attachments(status,updated_at);

CREATE OR REPLACE FUNCTION protect_manifest() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' OR (to_jsonb(NEW)-'confirmed') IS DISTINCT FROM (to_jsonb(OLD)-'confirmed') OR (OLD.confirmed AND NOT NEW.confirmed) THEN
  RAISE EXCEPTION 'Submission snapshots are immutable';
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS immutable_manifest ON submission_manifests;
CREATE TRIGGER immutable_manifest BEFORE UPDATE OR DELETE ON submission_manifests FOR EACH ROW EXECUTE FUNCTION protect_manifest();

CREATE OR REPLACE FUNCTION protect_confirmed_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF OLD.confirmed AND (TG_OP='DELETE' OR NEW IS DISTINCT FROM OLD) THEN RAISE EXCEPTION 'Confirmed submissions are immutable'; END IF;
 RETURN CASE WHEN TG_OP='DELETE' THEN OLD ELSE NEW END;
END $$;
DROP TRIGGER IF EXISTS immutable_confirmed_submission ON submissions;
CREATE TRIGGER immutable_confirmed_submission BEFORE UPDATE OR DELETE ON submissions FOR EACH ROW EXECUTE FUNCTION protect_confirmed_submission();

CREATE OR REPLACE FUNCTION protect_attachment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Use safe attachment cleanup'; END IF;
 IF (to_jsonb(NEW)-'status'-'updated_at') IS DISTINCT FROM (to_jsonb(OLD)-'status'-'updated_at') THEN RAISE EXCEPTION 'Attachment metadata is immutable'; END IF;
 IF NEW.status IN ('deleting','deleted') AND EXISTS(SELECT 1 FROM manifest_attachments WHERE attachment_id=OLD.id) THEN RAISE EXCEPTION 'Frozen attachments must be retained'; END IF;
 IF OLD.status IN ('deleting','deleted') AND NEW.status NOT IN ('deleting','deleted') THEN RAISE EXCEPTION 'Attachment cleanup already started'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS immutable_attachment ON attachments;
CREATE TRIGGER immutable_attachment BEFORE UPDATE OR DELETE ON attachments FOR EACH ROW EXECUTE FUNCTION protect_attachment();

CREATE OR REPLACE FUNCTION bind_manifest_attachment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE a attachments; m submission_manifests;
BEGIN
 IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Manifest attachment bindings are immutable'; END IF;
 SELECT * INTO a FROM attachments WHERE id=NEW.attachment_id FOR UPDATE;
 SELECT * INTO m FROM submission_manifests WHERE id=NEW.manifest_id;
 IF a.status<>'ready' OR a.bounty_id<>m.bounty_id OR a.worker<>m.worker OR m.confirmed
    OR NOT EXISTS(SELECT 1 FROM jsonb_array_elements(m.manifest->'attachments') item WHERE item->>'id'=a.id::text AND item->>'sha256'=a.sha256 AND item->>'filename'=a.filename AND (item->>'size')::integer=a.size AND item->>'contentType'=a.content_type)
 THEN RAISE EXCEPTION 'Attachment cannot be bound to this manifest'; END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bind_attachment ON manifest_attachments;
CREATE TRIGGER bind_attachment BEFORE INSERT OR UPDATE OR DELETE ON manifest_attachments FOR EACH ROW EXECUTE FUNCTION bind_manifest_attachment();

-- The existing hosted reconciler validates the finalized transaction before
-- setting confirmed. This trigger projects the EXACT operation's frozen snapshot,
-- including a recovered attempt, without requiring a worker deployment.
CREATE OR REPLACE FUNCTION confirm_deliverables() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE m submission_manifests;
BEGIN
 IF NEW.status='confirmed' AND NEW.action='submit' AND NEW.manifest_id IS NOT NULL AND OLD.status<>'confirmed' THEN
  SELECT * INTO m FROM submission_manifests WHERE id=NEW.manifest_id FOR UPDATE;
  IF m.bounty_id<>NEW.bounty_id OR m.worker<>NEW.actor OR NEW.expected_data IS NULL OR substring(NEW.expected_data FROM 17)<>m.content_hash THEN RAISE EXCEPTION 'Submission hash does not match manifest'; END IF;
  IF (SELECT count(*) FROM manifest_attachments WHERE manifest_id=m.id)<>jsonb_array_length(m.manifest->'attachments') THEN RAISE EXCEPTION 'Incomplete manifest attachments'; END IF;
  INSERT INTO submissions(id,bounty_id,worker,body,content_hash,revision,confirmed,manifest_id)
   VALUES(m.id,m.bounty_id,m.worker,m.manifest->>'writtenResponse',m.content_hash,m.revision,true,m.id)
   ON CONFLICT(bounty_id,revision) DO UPDATE SET body=EXCLUDED.body,content_hash=EXCLUDED.content_hash,confirmed=true,manifest_id=EXCLUDED.manifest_id WHERE NOT submissions.confirmed;
  UPDATE submission_manifests SET confirmed=true WHERE id=m.id;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS confirm_manifest ON operations;
CREATE TRIGGER confirm_manifest AFTER UPDATE ON operations FOR EACH ROW EXECUTE FUNCTION confirm_deliverables();
