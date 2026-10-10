-- 004_add_encrypted_token_to_plan_shares.sql
-- Add encrypted_token column to plan_shares for authenticated existing-link recovery

ALTER TABLE plan_shares ADD COLUMN encrypted_token TEXT;
