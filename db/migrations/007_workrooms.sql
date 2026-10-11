CREATE TABLE IF NOT EXISTS profiles (
 user_id uuid PRIMARY KEY REFERENCES auth_users(id) ON DELETE CASCADE,
 active_role text NOT NULL DEFAULT 'requester' CHECK(active_role IN ('requester','worker')),
 bio text NOT NULL DEFAULT '' CHECK(length(bio)<=1000),
 skills jsonb NOT NULL DEFAULT '[]', portfolio_url text NOT NULL DEFAULT '', updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS wallet_links (
 wallet text PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth_users(id), linked_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wallet_links_user_idx ON wallet_links(user_id);
ALTER TABLE auth_challenges ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth_users(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth_users(id);
CREATE TABLE IF NOT EXISTS messages (
 seq bigserial PRIMARY KEY, id uuid NOT NULL UNIQUE, bounty_id uuid NOT NULL REFERENCES bounties(id),
 sender_id uuid NOT NULL REFERENCES auth_users(id), client_id uuid NOT NULL,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 4000), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(sender_id,client_id)
);
CREATE INDEX IF NOT EXISTS messages_bounty_seq_idx ON messages(bounty_id,seq);
CREATE TABLE IF NOT EXISTS notifications (
 id bigserial PRIMARY KEY, user_id uuid NOT NULL REFERENCES auth_users(id), bounty_id uuid REFERENCES bounties(id),
 event_key text NOT NULL, kind text NOT NULL, body text NOT NULL, read_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(user_id,event_key)
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id,id DESC);
CREATE TABLE IF NOT EXISTS app_rate_limits (
 key text PRIMARY KEY, window_start timestamptz NOT NULL, count integer NOT NULL
);
CREATE TABLE IF NOT EXISTS reports (
 id uuid PRIMARY KEY, reporter_id uuid NOT NULL REFERENCES auth_users(id), bounty_id uuid REFERENCES bounties(id),
 reason text NOT NULL CHECK(length(reason) BETWEEN 10 AND 2000), created_at timestamptz NOT NULL DEFAULT now(), resolved_at timestamptz
);
CREATE OR REPLACE FUNCTION notify_bounty_operation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NEW.status='confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' THEN
  INSERT INTO notifications(user_id,bounty_id,event_key,kind,body)
  SELECT DISTINCT w.user_id, NEW.bounty_id, 'operation:'||NEW.id, 'bounty', 'Quest update: '||NEW.action
  FROM bounties b JOIN wallet_links w ON w.wallet IN (b.requester,b.worker)
  WHERE b.id=NEW.bounty_id AND NOT EXISTS(SELECT 1 FROM wallet_links actor WHERE actor.wallet=NEW.actor AND actor.user_id=w.user_id)
  ON CONFLICT(user_id,event_key) DO NOTHING;
 END IF;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bounty_operation_notification ON operations;
CREATE TRIGGER bounty_operation_notification AFTER UPDATE OF status ON operations FOR EACH ROW EXECUTE FUNCTION notify_bounty_operation();
CREATE OR REPLACE FUNCTION notify_bounty_message() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 INSERT INTO notifications(user_id,bounty_id,event_key,kind,body)
 SELECT DISTINCT w.user_id,NEW.bounty_id,'message:'||NEW.id,'message','New message in your quest workroom'
 FROM bounties b JOIN wallet_links w ON w.wallet IN (b.requester,b.worker)
 WHERE b.id=NEW.bounty_id AND w.user_id<>NEW.sender_id ON CONFLICT(user_id,event_key) DO NOTHING;
 RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS bounty_message_notification ON messages;
CREATE TRIGGER bounty_message_notification AFTER INSERT ON messages FOR EACH ROW EXECUTE FUNCTION notify_bounty_message();
