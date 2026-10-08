// backend/services/planShareService.js
const crypto = require('crypto');
const dbModule = require('../db/database');

function getDb(customDb) {
  return customDb || dbModule.getDatabase();
}

/**
 * Generates a cryptographically secure random bearer token with 256 bits of entropy.
 * 32 bytes encoded as 64 hex characters.
 * 
 * @returns {string} 64-character hex token
 */
function generateShareToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Computes the SHA-256 hash of a raw bearer share token.
 * Only the hash is persisted in the database to prevent bearer URL leakage on DB dumps.
 * 
 * @param {string} rawToken
 * @returns {string|null}
 */
function hashShareToken(rawToken) {
  if (!rawToken || typeof rawToken !== 'string') {
    return null;
  }
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Safely parses a JSON string into an object/array, returning null on failure.
 */
function safeJsonParse(val) {
  if (!val || typeof val !== 'string') {
    return null;
  }
  try {
    return JSON.parse(val);
  } catch {
    return null;
  }
}

/**
 * Strictly sanitizes a persisted plan database row into a public read-only representation.
 * 
 * Explicitly excludes:
 * - user_id / userId
 * - owner email / name / credentials
 * - session / trial session tokens
 * - internal database rowids
 * - generation_errors / generationErrors
 * - stack traces or model telemetry
 * 
 * @param {object} planRow - Raw database row from plans table
 * @returns {object|null}
 */
function toPublicSharedPlan(planRow) {
  if (!planRow || typeof planRow !== 'object') {
    return null;
  }

  return {
    id: planRow.id,
    startupName: planRow.startup_name || '',
    industry: planRow.industry || '',
    problem: planRow.problem || '',
    solution: planRow.solution || '',
    targetAudience: planRow.target_audience || '',
    usp: planRow.usp || '',
    leanCanvas: safeJsonParse(planRow.lean_canvas),
    mvp: safeJsonParse(planRow.mvp),
    revenue: safeJsonParse(planRow.revenue),
    pitch: safeJsonParse(planRow.pitch),
    personas: safeJsonParse(planRow.personas),
    competitors: safeJsonParse(planRow.competitors),
    createdAt: planRow.created_at || null,
    updatedAt: planRow.updated_at || null
  };
}

/**
 * Creates or retrieves the active share for a plan owned by an authenticated user.
 * Idempotent: If an active share already exists, returns the existing share metadata
 * without creating duplicate tokens or proliferating active links.
 * 
 * @param {string} planId - UUID of the plan
 * @param {string} userId - UUID of the authenticated owner
 * @param {object} [db] - Optional Database instance
 * @returns {object|null} { share, isExisting } or null if plan not found / unauthorized
 */
function createOrGetActiveShare(planId, userId, db = null) {
  if (!planId || typeof planId !== 'string' || !planId.trim()) {
    return null;
  }
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return null;
  }

  const dbInstance = getDb(db);
  const trimmedPlanId = planId.trim();
  const trimmedUserId = userId.trim();

  // 1. Verify plan exists and is owned by the authenticated requester
  const plan = dbInstance.prepare('SELECT id, user_id FROM plans WHERE id = ?').get(trimmedPlanId);
  if (!plan || plan.user_id !== trimmedUserId) {
    return null; // Safe 404: do not leak existence of another user's plan or unowned trial plan
  }

  // 2. Check for an existing active, non-revoked share
  const existingShare = dbInstance.prepare(`
    SELECT id, plan_id, user_id, is_active, view_count, created_at, revoked_at
    FROM plan_shares
    WHERE plan_id = ? AND is_active = 1 AND revoked_at IS NULL
    LIMIT 1
  `).get(trimmedPlanId);

  if (existingShare) {
    return {
      share: {
        id: existingShare.id,
        planId: existingShare.plan_id,
        isActive: Boolean(existingShare.is_active),
        createdAt: existingShare.created_at,
        viewCount: existingShare.view_count,
        alreadyExists: true
      },
      isExisting: true
    };
  }

  // 3. Generate a new high-entropy token and persist its SHA-256 hash
  const rawToken = generateShareToken();
  const tokenHash = hashShareToken(rawToken);
  const shareId = crypto.randomUUID();
  const now = new Date().toISOString();

  dbInstance.prepare(`
    INSERT INTO plan_shares (
      id, plan_id, user_id, share_token, is_active, view_count, created_at, revoked_at
    ) VALUES (?, ?, ?, ?, 1, 0, ?, NULL)
  `).run(shareId, trimmedPlanId, trimmedUserId, tokenHash, now);

  return {
    share: {
      id: shareId,
      planId: trimmedPlanId,
      token: rawToken,
      url: `/share/${rawToken}`,
      isActive: true,
      createdAt: now,
      viewCount: 0
    },
    isExisting: false
  };
}

/**
 * Revokes the active share link for a plan owned by an authenticated user.
 * Preserves the share record for audit/lifecycle history and marks is_active = 0, revoked_at = now.
 * 
 * @param {string} planId - UUID of the plan
 * @param {string} userId - UUID of the authenticated owner
 * @param {object} [db] - Optional Database instance
 * @returns {object|null} { success: true, revoked: boolean } or null if plan not found / unauthorized
 */
function revokeActiveShare(planId, userId, db = null) {
  if (!planId || typeof planId !== 'string' || !planId.trim()) {
    return null;
  }
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return null;
  }

  const dbInstance = getDb(db);
  const trimmedPlanId = planId.trim();
  const trimmedUserId = userId.trim();

  // 1. Verify plan exists and is owned by the requester
  const plan = dbInstance.prepare('SELECT id, user_id FROM plans WHERE id = ?').get(trimmedPlanId);
  if (!plan || plan.user_id !== trimmedUserId) {
    return null; // Safe 404
  }

  // 2. Find and revoke active share if present
  const activeShare = dbInstance.prepare(`
    SELECT id FROM plan_shares
    WHERE plan_id = ? AND is_active = 1 AND revoked_at IS NULL
    LIMIT 1
  `).get(trimmedPlanId);

  if (!activeShare) {
    return { success: true, revoked: false };
  }

  const now = new Date().toISOString();
  dbInstance.prepare(`
    UPDATE plan_shares
    SET is_active = 0, revoked_at = ?
    WHERE id = ?
  `).run(now, activeShare.id);

  return { success: true, revoked: true };
}

/**
 * Retrieves a sanitized, read-only plan representation via public bearer share token.
 * 
 * Security & Data Guarantees:
 * - Computes SHA-256 of the token to find active share
 * - Verifies is_active === 1 and revoked_at IS NULL
 * - Reads live persisted plan data dynamically (not a stale snapshot)
 * - Atomically increments view_count on successful retrieval
 * - Returns null (triggering safe 404) for invalid, nonexistent, or revoked tokens
 * 
 * @param {string} rawToken - Bearer token from the public share URL
 * @param {object} [db] - Optional Database instance
 * @returns {object|null} Sanitized public plan DTO or null
 */
function getSharedPlanByToken(rawToken, db = null) {
  if (!rawToken || typeof rawToken !== 'string' || !rawToken.trim()) {
    return null;
  }

  const dbInstance = getDb(db);
  const tokenHash = hashShareToken(rawToken);

  // 1. Find matching active share by hash
  const share = dbInstance.prepare(`
    SELECT id, plan_id, is_active, revoked_at
    FROM plan_shares
    WHERE share_token = ? AND is_active = 1 AND revoked_at IS NULL
  `).get(tokenHash);

  if (!share) {
    return null; // Safe 404
  }

  // 2. Dynamically fetch current persisted plan
  const plan = dbInstance.prepare('SELECT * FROM plans WHERE id = ?').get(share.plan_id);
  if (!plan) {
    return null; // Safe 404 (plan deleted or missing)
  }

  // 3. Atomically increment view_count
  dbInstance.prepare(`
    UPDATE plan_shares
    SET view_count = view_count + 1
    WHERE id = ?
  `).run(share.id);

  // 4. Return strictly sanitized public plan DTO
  return toPublicSharedPlan(plan);
}

module.exports = {
  generateShareToken,
  hashShareToken,
  toPublicSharedPlan,
  createOrGetActiveShare,
  revokeActiveShare,
  getSharedPlanByToken
};
