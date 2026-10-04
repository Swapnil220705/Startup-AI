-- 002_add_user_id_to_plans.sql
-- Users, Sessions, Anonymous Trials & Multi-User Plan Ownership

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT,
  picture_url TEXT,
  auth_provider TEXT NOT NULL,
  provider_subject_id TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider_sub ON users(auth_provider, provider_subject_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS trial_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  ip_hash TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trial_sessions_ip ON trial_sessions(ip_hash);

-- Evolve plans table to support multi-user ownership
ALTER TABLE plans ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_plans_user_id_created ON plans(user_id, created_at DESC);
