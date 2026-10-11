-- 005_enforce_one_active_share_per_plan.sql
-- Enforce invariant: At most one active share per plan

-- 1. Reconcile any existing duplicate active shares deterministically
-- If any plan has multiple active shares, keep the newest active share (by created_at, then id)
-- and mark older duplicate active shares as revoked to preserve audit history.
UPDATE plan_shares
SET is_active = 0, revoked_at = COALESCE(revoked_at, datetime('now'))
WHERE is_active = 1
  AND id NOT IN (
    SELECT id FROM (
      SELECT id, ROW_NUMBER() OVER (
        PARTITION BY plan_id
        ORDER BY created_at DESC, id DESC
      ) as rn
      FROM plan_shares
      WHERE is_active = 1
    ) WHERE rn = 1
  );

-- 2. Create partial unique index guaranteeing at most one active share per plan
CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_shares_one_active
ON plan_shares(plan_id)
WHERE is_active = 1;
