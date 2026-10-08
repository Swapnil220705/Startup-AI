-- 003_create_plan_shares_table.sql
-- Plan Sharing Database Foundation

CREATE TABLE IF NOT EXISTS plan_shares (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_shares_token ON plan_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_plan_shares_plan_id ON plan_shares(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_shares_user_id ON plan_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_shares_active ON plan_shares(plan_id, is_active);
