-- 001_create_plans_table.sql
-- Initial schema for persisted startup plans

CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY NOT NULL,
  startup_name TEXT NOT NULL,
  industry TEXT,
  problem TEXT,
  solution TEXT,
  target_audience TEXT,
  usp TEXT,
  lean_canvas TEXT,
  mvp TEXT,
  revenue TEXT,
  pitch TEXT,
  personas TEXT,
  competitors TEXT,
  generation_status TEXT NOT NULL DEFAULT 'completed',
  generation_errors TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at DESC);
