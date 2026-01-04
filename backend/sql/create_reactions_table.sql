-- Reactions table migration
CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  message_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (message_id, emoji, username)
);
CREATE INDEX IF NOT EXISTS idx_reactions_message_id ON reactions (message_id);
