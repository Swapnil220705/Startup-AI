// backend/services/planShareService.js
const crypto = require('crypto');
const dbModule = require('../db/database');
const { encryptToken, decryptToken } = require('../utils/encryption');

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
 * Retrieves the current share status for a plan owned by an authenticated user.
 * Does NOT generate a new share if none exists.
 * 
 * @param {string} planId - UUID of the plan
 * @param {string} userId - UUID of the authenticated owner
 * @param {object} [db] - Optional Database instance
 * @returns {object|null} { isActive: boolean, share?: object } or null if unauthorized/not found
 */
function getActiveShareStatus(planId, userId, db = null) {
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
    return null; // Safe 404
  }

  // 2. Query for active share
  const activeShare = dbInstance.prepare(`
    SELECT id, plan_id, user_id, share_token, encrypted_token, is_active, view_count, created_at, revoked_at
    FROM plan_shares
    WHERE plan_id = ? AND is_active = 1 AND revoked_at IS NULL
    LIMIT 1
  `).get(trimmedPlanId);

  if (!activeShare) {
    return {
      isActive: false
    };
  }

  // 3. Attempt decryption if encrypted_token is present
  let decryptedToken = null;
  let requiresReplacement = false;

  if (activeShare.encrypted_token) {
    decryptedToken = decryptToken(activeShare.encrypted_token);
    if (!decryptedToken) {
      requiresReplacement = true;
    }
  } else {
    requiresReplacement = true;
  }

  const shareData = {
    id: activeShare.id,
    planId: activeShare.plan_id,
    isActive: true,
    createdAt: activeShare.created_at,
    viewCount: activeShare.view_count,
    alreadyExists: true,
    requiresReplacement
  };

  if (decryptedToken) {
    shareData.token = decryptedToken;
    shareData.url = `/share/${decryptedToken}`;
  }

  return {
    isActive: true,
    share: shareData
  };
}

/**
 * Creates or retrieves the active share for a plan owned by an authenticated user.
 * Supports:
 * - Encrypted token recovery for existing active shares
 * - Explicit atomic replacement via options.replace = true
 * - Identification of legacy Phase 5.3 unrecoverable shares requiring replacement
 * 
 * @param {string} planId - UUID of the plan
 * @param {string} userId - UUID of the authenticated owner
 * @param {object|Database} [optionsOrDb] - Options object { replace: boolean } or Database instance
 * @param {object} [customDb] - Optional Database instance when options object is provided
 * @returns {object|null} { share, isExisting } or null if plan not found / unauthorized
 */
function createOrGetActiveShare(planId, userId, optionsOrDb = {}, customDb = null) {
  if (!planId || typeof planId !== 'string' || !planId.trim()) {
    return null;
  }
  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    return null;
  }

  let opts = {};
  let dbInstance = null;
  if (optionsOrDb && typeof optionsOrDb === 'object' && typeof optionsOrDb.prepare === 'function') {
    dbInstance = optionsOrDb;
  } else if (optionsOrDb && typeof optionsOrDb === 'object') {
    opts = optionsOrDb;
    dbInstance = getDb(customDb);
  } else {
    dbInstance = getDb(customDb);
  }

  const trimmedPlanId = planId.trim();
  const trimmedUserId = userId.trim();

  // 1. Verify plan exists and is owned by the authenticated requester
  const plan = dbInstance.prepare('SELECT id, user_id FROM plans WHERE id = ?').get(trimmedPlanId);
  if (!plan || plan.user_id !== trimmedUserId) {
    return null; // Safe 404: do not leak existence of another user's plan or unowned trial plan
  }

  // 2. Explicit link replacement requested
  if (opts.replace) {
    const executeReplacement = dbInstance.transaction(() => {
      const now = new Date().toISOString();

      // Revoke any existing active share(s) for this plan
      dbInstance.prepare(`
        UPDATE plan_shares
        SET is_active = 0, revoked_at = ?
        WHERE plan_id = ? AND is_active = 1
      `).run(now, trimmedPlanId);

      // Generate new cryptographically random token (256 bits)
      const rawToken = generateShareToken();
      const tokenHash = hashShareToken(rawToken);
      const encryptedToken = encryptToken(rawToken);
      const shareId = crypto.randomUUID();

      dbInstance.prepare(`
        INSERT INTO plan_shares (
          id, plan_id, user_id, share_token, encrypted_token, is_active, view_count, created_at, revoked_at
        ) VALUES (?, ?, ?, ?, ?, 1, 0, ?, NULL)
      `).run(shareId, trimmedPlanId, trimmedUserId, tokenHash, encryptedToken, now);

      return {
        share: {
          id: shareId,
          planId: trimmedPlanId,
          token: rawToken,
          url: `/share/${rawToken}`,
          isActive: true,
          createdAt: now,
          viewCount: 0,
          replaced: true
        },
        isExisting: false
      };
    });

    return executeReplacement();
  }

  // 3. Check for an existing active, non-revoked share
  const existingShare = dbInstance.prepare(`
    SELECT id, plan_id, user_id, share_token, encrypted_token, is_active, view_count, created_at, revoked_at
    FROM plan_shares
    WHERE plan_id = ? AND is_active = 1 AND revoked_at IS NULL
    LIMIT 1
  `).get(trimmedPlanId);

  if (existingShare) {
    let decryptedToken = null;
    let requiresReplacement = false;

    if (existingShare.encrypted_token) {
      decryptedToken = decryptToken(existingShare.encrypted_token);
      if (!decryptedToken) {
        requiresReplacement = true;
      }
    } else {
      requiresReplacement = true;
    }

    const shareData = {
      id: existingShare.id,
      planId: existingShare.plan_id,
      isActive: Boolean(existingShare.is_active),
      createdAt: existingShare.created_at,
      viewCount: existingShare.view_count,
      alreadyExists: true,
      requiresReplacement
    };

    if (decryptedToken) {
      shareData.token = decryptedToken;
      shareData.url = `/share/${decryptedToken}`;
    }

    return {
      share: shareData,
      isExisting: true
    };
  }

  // 4. Generate a new high-entropy token and persist SHA-256 hash + encrypted token
  const rawToken = generateShareToken();
  const tokenHash = hashShareToken(rawToken);
  const encryptedToken = encryptToken(rawToken);
  const shareId = crypto.randomUUID();
  const now = new Date().toISOString();

  dbInstance.prepare(`
    INSERT INTO plan_shares (
      id, plan_id, user_id, share_token, encrypted_token, is_active, view_count, created_at, revoked_at
    ) VALUES (?, ?, ?, ?, ?, 1, 0, ?, NULL)
  `).run(shareId, trimmedPlanId, trimmedUserId, tokenHash, encryptedToken, now);

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
  getActiveShareStatus,
  revokeActiveShare,
  getSharedPlanByToken
};
