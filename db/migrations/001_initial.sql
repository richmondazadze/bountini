CREATE TABLE IF NOT EXISTS auth_challenges (
 id uuid PRIMARY KEY, wallet text NOT NULL, message text NOT NULL, origin text NOT NULL,
 expires_at timestamptz NOT NULL, consumed_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sessions (
 token_hash text PRIMARY KEY, wallet text NOT NULL, expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS bounties (
 id uuid PRIMARY KEY, requester text NOT NULL, worker text,
 title text NOT NULL, description text NOT NULL, category text NOT NULL,
 requirements jsonb NOT NULL, agreement text NOT NULL, requirements_hash text NOT NULL,
 reward_lamports numeric(20,0) NOT NULL CHECK (reward_lamports > 0),
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','open','in-progress','in-review','revision-requested','paid','refunded')),
 chain_address text UNIQUE, deadline bigint, revision_used boolean NOT NULL DEFAULT false,
 signature text, chain_slot numeric(20,0), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS submissions (
 id uuid PRIMARY KEY, bounty_id uuid NOT NULL REFERENCES bounties(id), worker text NOT NULL,
 body text NOT NULL CHECK(length(body) BETWEEN 1 AND 20000), content_hash text NOT NULL,
 revision smallint NOT NULL CHECK(revision IN (0,1)), confirmed boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), UNIQUE(bounty_id, revision)
);
CREATE TABLE IF NOT EXISTS operations (
 id uuid PRIMARY KEY, bounty_id uuid NOT NULL REFERENCES bounties(id), actor text NOT NULL,
 action text NOT NULL, signature text UNIQUE,
 status text NOT NULL DEFAULT 'waiting-wallet' CHECK(status IN ('waiting-wallet','submitting','confirming','confirmed','rejected','failed','unknown')),
 error_code text, attempts integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS reviews (
 id uuid PRIMARY KEY, bounty_id uuid NOT NULL REFERENCES bounties(id), requester text NOT NULL,
 action text NOT NULL, feedback text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS bounty_market ON bounties(status, created_at DESC);
CREATE INDEX IF NOT EXISTS pending_operations ON operations(status, updated_at);
CREATE INDEX IF NOT EXISTS session_expiry ON sessions(expires_at);
