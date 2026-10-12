-- 006_add_brief_to_plans.sql
-- Migration 006: Add nullable brief column to plans table for canonical Startup Brief persistence
ALTER TABLE plans ADD COLUMN brief TEXT;
