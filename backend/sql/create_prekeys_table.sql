-- Prekey bundles table
CREATE TABLE IF NOT EXISTS prekeys (
  username TEXT PRIMARY KEY,
  identity_key TEXT NOT NULL,
  signed_prekey JSONB NOT NULL,
  prekey JSONB,
  meta JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
