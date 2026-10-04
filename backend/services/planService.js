// backend/services/planService.js
const crypto = require('crypto');
const dbModule = require('../db/database');

function getDb(customDb) {
  return customDb || dbModule.getDatabase();
}

const TRIAL_COOKIE_NAME = process.env.TRIAL_COOKIE_NAME || 'startup_ai_trial';
const TRIAL_COOKIE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Returns trial cookie options adhering to project security guidelines.
 */
function getTrialCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: TRIAL_COOKIE_TTL_MS,
    secure: isProd
  };
}

/**
 * Sets the anonymous trial cookie on the Express response.
 * 
 * @param {object} res - Express response
 * @param {string} token - Cryptographically random trial UUID
 */
function setTrialCookie(res, token) {
  if (res && typeof res.cookie === 'function') {
    res.cookie(TRIAL_COOKIE_NAME, token, getTrialCookieOptions());
  }
}

/**
 * Clears the trial cookie on the Express response.
 * 
 * @param {object} res - Express response
 */
function clearTrialCookie(res) {
  if (res && typeof res.cookie === 'function') {
    res.cookie(TRIAL_COOKIE_NAME, '', {
      ...getTrialCookieOptions(),
      maxAge: 0
    });
  }
}

/**
 * Computes a salted SHA-256 hash of the client IP address.
 * Used exclusively as an abuse/rate-mitigation signal, never as primary identity.
 * 
 * @param {string} ip
 * @returns {string}
 */
function hashIp(ip) {
  if (!ip || typeof ip !== 'string') {
    ip = '127.0.0.1';
  }
  const salt = process.env.IP_SALT || 'startup_ai_trial_salt';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

/**
 * Retrieves or registers an anonymous trial session in the database.
 * 
 * @param {string} [trialToken] - Existing trial cookie value
 * @param {string} [ip] - Client IP address
 * @param {object} [db] - Optional Database instance
 * @returns {{ session: object, isNew: boolean }}
 */
function getOrCreateTrialSession(trialToken, ip, db = null) {
  const dbInstance = getDb(db);
  const ipHash = hashIp(ip);
  const now = new Date().toISOString();

  if (trialToken && typeof trialToken === 'string') {
    const existing = dbInstance.prepare('SELECT * FROM trial_sessions WHERE id = ?').get(trialToken.trim());
    if (existing) {
      return { session: existing, isNew: false };
    }
  }

  const newId = crypto.randomUUID();
  dbInstance.prepare(`
    INSERT INTO trial_sessions (id, plan_id, ip_hash, created_at)
    VALUES (?, null, ?, ?)
  `).run(newId, ipHash, now);

  const newSession = {
    id: newId,
    plan_id: null,
    ip_hash: ipHash,
    created_at: now
  };

  return { session: newSession, isNew: true };
}

/**
 * Safely stringifies a value to JSON, returning null if null/undefined.
 */
function safeJsonStringify(val) {
  if (val === undefined || val === null) {
    return null;
  }
  if (typeof val === 'string') {
    try {
      JSON.parse(val);
      return val;
    } catch {
      return JSON.stringify(val);
    }
  }
  return JSON.stringify(val);
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
 * Formats a database row into a structured plan response object.
 */
function formatPlanRow(row, includeModules = true) {
  if (!row) return null;

  const userId = row.user_id !== undefined ? row.user_id : (row.userId !== undefined ? row.userId : null);

  const base = {
    id: row.id,
    userId: userId,
    user_id: userId,
    startupName: row.startup_name,
    industry: row.industry || '',
    problem: row.problem || '',
    solution: row.solution || '',
    targetAudience: row.target_audience || '',
    usp: row.usp || '',
    generationStatus: row.generation_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };

  if (!includeModules) {
    return base;
  }

  return {
    ...base,
    leanCanvas: safeJsonParse(row.lean_canvas),
    mvp: safeJsonParse(row.mvp),
    revenue: safeJsonParse(row.revenue),
    pitch: safeJsonParse(row.pitch),
    personas: safeJsonParse(row.personas),
    competitors: safeJsonParse(row.competitors),
    generationErrors: safeJsonParse(row.generation_errors)
  };
}

/**
 * Determines generation status from module availability and errors.
 */
function deriveGenerationStatus(planData) {
  if (planData.generationStatus && ['completed', 'partial', 'failed'].includes(planData.generationStatus)) {
    return planData.generationStatus;
  }

  const modules = [
    planData.leanCanvas,
    planData.mvp,
    planData.revenue,
    planData.pitch,
    planData.personas,
    planData.competitors
  ];

  const presentCount = modules.filter(m => m !== undefined && m !== null).length;
  const hasErrors = Boolean(planData.generationErrors);

  if (presentCount === 6 && !hasErrors) {
    return 'completed';
  } else if (presentCount > 0) {
    return 'partial';
  }
  return 'failed';
}

/**
 * Creates and persists a new startup plan.
 * 
 * Supports both:
 * - createPlan(planData, db) [Phase 3 backward compatible]
 * - createPlan(planData, { userId }, db) [Phase 4 user ownership]
 * 
 * @param {object} planData - Input details and generated modules
 * @param {object} [optionsOrDb] - Options { userId } or Database instance
 * @param {object} [db] - Optional Database instance
 * @returns {object} The created plan object
 */
function createPlan(planData, optionsOrDb = null, db = null) {
  if (!planData || typeof planData !== 'object') {
    const error = new Error('Plan data must be a valid object');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT';
    throw error;
  }

  const startupName = typeof planData.startupName === 'string' ? planData.startupName.trim() : '';
  if (!startupName) {
    const error = new Error('Invalid input: startupName is required.');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT';
    throw error;
  }

  let options = {};
  let dbInstance = null;

  if (optionsOrDb && (typeof optionsOrDb.prepare === 'function' || typeof optionsOrDb.exec === 'function')) {
    dbInstance = optionsOrDb;
  } else if (optionsOrDb && typeof optionsOrDb === 'object') {
    options = optionsOrDb;
    dbInstance = db;
  }
  dbInstance = getDb(dbInstance);

  const userId = typeof options.userId === 'string' && options.userId.trim() ? options.userId.trim() : null;

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const generationStatus = deriveGenerationStatus(planData);

  const rowData = {
    id,
    user_id: userId,
    startup_name: startupName,
    industry: planData.industry ? String(planData.industry).trim() : null,
    problem: planData.problem ? String(planData.problem).trim() : null,
    solution: planData.solution ? String(planData.solution).trim() : null,
    target_audience: planData.targetAudience ? String(planData.targetAudience).trim() : null,
    usp: planData.usp ? String(planData.usp).trim() : null,
    lean_canvas: safeJsonStringify(planData.leanCanvas),
    mvp: safeJsonStringify(planData.mvp),
    revenue: safeJsonStringify(planData.revenue),
    pitch: safeJsonStringify(planData.pitch),
    personas: safeJsonStringify(planData.personas),
    competitors: safeJsonStringify(planData.competitors),
    generation_status: generationStatus,
    generation_errors: safeJsonStringify(planData.generationErrors),
    created_at: now,
    updated_at: now
  };

  const stmt = dbInstance.prepare(`
    INSERT INTO plans (
      id,
      user_id,
      startup_name,
      industry,
      problem,
      solution,
      target_audience,
      usp,
      lean_canvas,
      mvp,
      revenue,
      pitch,
      personas,
      competitors,
      generation_status,
      generation_errors,
      created_at,
      updated_at
    ) VALUES (
      @id,
      @user_id,
      @startup_name,
      @industry,
      @problem,
      @solution,
      @target_audience,
      @usp,
      @lean_canvas,
      @mvp,
      @revenue,
      @pitch,
      @personas,
      @competitors,
      @generation_status,
      @generation_errors,
      @created_at,
      @updated_at
    )
  `);

  try {
    stmt.run(rowData);
  } catch (err) {
    const dbError = new Error('Failed to persist plan in database');
    dbError.statusCode = 500;
    dbError.code = 'DATABASE_ERROR';
    throw dbError;
  }

  return formatPlanRow(rowData, true);
}

/**
 * Creates and persists a plan for an anonymous trial session.
 * Enforces the strict one-plan anonymous trial limit.
 * Runs atomically inside a SQLite transaction.
 * 
 * @param {object} planData - Input details and generated modules
 * @param {object} trialContext - { trialToken, ip }
 * @param {object} [db] - Optional Database instance
 * @returns {{ plan: object, trialToken: string }}
 */
function createTrialPlan(planData, trialContext = {}, db = null) {
  const dbInstance = getDb(db);
  const { session } = getOrCreateTrialSession(trialContext.trialToken, trialContext.ip, dbInstance);

  if (session.plan_id) {
    const limitError = new Error('You have reached the free anonymous trial limit. Please sign in or create an account to generate more plans and save your work.');
    limitError.statusCode = 403;
    limitError.code = 'TRIAL_LIMIT_REACHED';
    throw limitError;
  }

  const createTrialTx = dbInstance.transaction(() => {
    const plan = createPlan(planData, { userId: null }, dbInstance);
    dbInstance.prepare('UPDATE trial_sessions SET plan_id = ? WHERE id = ?').run(plan.id, session.id);
    return plan;
  });

  const createdPlan = createTrialTx();
  return { plan: createdPlan, trialToken: session.id };
}

/**
 * Retrieves a plan by its ID directly without access control.
 * 
 * @param {string} id - Plan UUID
 * @param {object} [db] - Optional Database instance
 * @returns {object|null}
 */
function getPlanById(id, db = null) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const dbInstance = getDb(db);
  const stmt = dbInstance.prepare('SELECT * FROM plans WHERE id = ?');
  const row = stmt.get(id);

  if (!row) {
    return null;
  }

  return formatPlanRow(row, true);
}

/**
 * Retrieves a plan with strict requester access-control verification.
 * 
 * Rules:
 * - Authenticated: allowed ONLY if plan.user_id === userId.
 * - Anonymous: allowed ONLY if plan.user_id IS NULL AND trial_sessions links trialToken to this plan.
 * - Non-matching requests return null (safe 404 PLAN_NOT_FOUND).
 * 
 * @param {string} id - Plan UUID
 * @param {object} authContext - { userId, trialToken }
 * @param {object} [db] - Optional Database instance
 * @returns {object|null}
 */
function getPlanForRequester(id, authContext = {}, db = null) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const dbInstance = getDb(db);
  const plan = getPlanById(id.trim(), dbInstance);
  if (!plan) {
    return null;
  }

  const { userId, trialToken } = authContext;

  if (userId) {
    if (plan.userId === userId || plan.user_id === userId) {
      return plan;
    }
    return null;
  }

  // Anonymous requester
  if (plan.userId === null && plan.user_id === null) {
    if (!trialToken || typeof trialToken !== 'string') {
      return null;
    }
    const trialRow = dbInstance.prepare('SELECT id, plan_id FROM trial_sessions WHERE id = ?').get(trialToken.trim());
    if (trialRow && trialRow.plan_id === plan.id) {
      return plan;
    }
    return null;
  }

  return null;
}

/**
 * Lists plans ordered by creation date descending with pagination.
 * Scoped to user_id when provided. Anonymous users receive an empty list.
 * 
 * @param {object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @param {string|null} [options.userId] - User UUID or null for anonymous
 * @param {object} [db] - Optional Database instance
 * @returns {{ plans: object[], total: number, limit: number, offset: number }}
 */
function listPlans(options = {}, db = null) {
  const dbInstance = getDb(db);

  let limit = parseInt(options.limit, 10);
  if (isNaN(limit) || limit < 1) limit = 50;
  if (limit > 100) limit = 100;

  let offset = parseInt(options.offset, 10);
  if (isNaN(offset) || offset < 0) offset = 0;

  // If userId is explicitly null or false (anonymous request), return empty history list
  if (options.userId === null || options.userId === false) {
    return {
      plans: [],
      total: 0,
      limit,
      offset
    };
  }

  // If userId is specified as a non-empty string, isolate to that user's plans
  if (typeof options.userId === 'string' && options.userId.trim()) {
    const uid = options.userId.trim();
    const countRow = dbInstance.prepare('SELECT COUNT(*) as count FROM plans WHERE user_id = ?').get(uid);
    const total = countRow ? countRow.count : 0;

    const stmt = dbInstance.prepare(`
      SELECT
        id,
        user_id,
        startup_name,
        industry,
        problem,
        solution,
        target_audience,
        usp,
        generation_status,
        created_at,
        updated_at
      FROM plans
      WHERE user_id = ?
      ORDER BY created_at DESC, rowid DESC
      LIMIT ? OFFSET ?
    `);

    const rows = stmt.all(uid, limit, offset);
    const plans = rows.map(row => formatPlanRow(row, false));

    return {
      plans,
      total,
      limit,
      offset
    };
  }

  // Backward compatibility: If options.userId is undefined (e.g. Phase 3 unit tests)
  const countRow = dbInstance.prepare('SELECT COUNT(*) as count FROM plans').get();
  const total = countRow ? countRow.count : 0;

  const stmt = dbInstance.prepare(`
    SELECT
      id,
      user_id,
      startup_name,
      industry,
      problem,
      solution,
      target_audience,
      usp,
      generation_status,
      created_at,
      updated_at
    FROM plans
    ORDER BY created_at DESC, rowid DESC
    LIMIT ? OFFSET ?
  `);

  const rows = stmt.all(limit, offset);
  const plans = rows.map(row => formatPlanRow(row, false));

  return {
    plans,
    total,
    limit,
    offset
  };
}

/**
 * Updates editable metadata of an existing startup plan.
 * Verifies ownership when options.userId is supplied.
 * 
 * @param {string} id - Plan UUID
 * @param {object} updates - Metadata fields to update (startupName, industry, problem, solution, targetAudience, usp)
 * @param {object} [optionsOrDb] - Options { userId } or Database instance
 * @param {object} [db] - Optional Database instance
 * @returns {object|null} The updated plan object or null if not found
 */
function updatePlan(id, updates = {}, optionsOrDb = null, db = null) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  if (!updates || typeof updates !== 'object') {
    const error = new Error('Updates must be a valid object');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT';
    throw error;
  }

  let options = {};
  let dbInstance = null;

  if (optionsOrDb && (typeof optionsOrDb.prepare === 'function' || typeof optionsOrDb.exec === 'function')) {
    dbInstance = optionsOrDb;
  } else if (optionsOrDb && typeof optionsOrDb === 'object') {
    options = optionsOrDb;
    dbInstance = db;
  }
  dbInstance = getDb(dbInstance);

  const trimmedId = id.trim();

  // Verify plan exists
  const existing = dbInstance.prepare('SELECT id, user_id FROM plans WHERE id = ?').get(trimmedId);
  if (!existing) {
    return null;
  }

  // Ownership verification: If userId is supplied, plan must belong to that user
  if (options.userId) {
    if (existing.user_id !== options.userId) {
      return null;
    }
  }

  // Validate startupName if supplied
  if (updates.startupName !== undefined) {
    if (typeof updates.startupName !== 'string' || !updates.startupName.trim()) {
      const error = new Error('Invalid input: startupName cannot be empty.');
      error.statusCode = 400;
      error.code = 'INVALID_INPUT';
      throw error;
    }
  }

  const allowedFields = {
    startupName: 'startup_name',
    industry: 'industry',
    problem: 'problem',
    solution: 'solution',
    targetAudience: 'target_audience',
    usp: 'usp'
  };

  const setClauses = [];
  const params = { id: trimmedId, updated_at: new Date().toISOString() };

  for (const [key, col] of Object.entries(allowedFields)) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = @${col}`);
      params[col] = updates[key] === null ? null : String(updates[key]).trim();
    }
  }

  setClauses.push('updated_at = @updated_at');

  let sql;
  if (options.userId) {
    params.user_id = options.userId;
    sql = `UPDATE plans SET ${setClauses.join(', ')} WHERE id = @id AND user_id = @user_id`;
  } else {
    sql = `UPDATE plans SET ${setClauses.join(', ')} WHERE id = @id`;
  }

  try {
    dbInstance.prepare(sql).run(params);
  } catch (err) {
    const dbError = new Error('Failed to update plan in database');
    dbError.statusCode = 500;
    dbError.code = 'DATABASE_ERROR';
    throw dbError;
  }

  return getPlanById(trimmedId, dbInstance);
}

/**
 * Deletes a startup plan by its ID.
 * Verifies ownership when options.userId is supplied.
 * 
 * @param {string} id - Plan UUID
 * @param {object} [optionsOrDb] - Options { userId } or Database instance
 * @param {object} [db] - Optional Database instance
 * @returns {boolean} True if deleted, false if not found
 */
function deletePlan(id, optionsOrDb = null, db = null) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  let options = {};
  let dbInstance = null;

  if (optionsOrDb && (typeof optionsOrDb.prepare === 'function' || typeof optionsOrDb.exec === 'function')) {
    dbInstance = optionsOrDb;
  } else if (optionsOrDb && typeof optionsOrDb === 'object') {
    options = optionsOrDb;
    dbInstance = db;
  }
  dbInstance = getDb(dbInstance);

  const trimmedId = id.trim();
  const existing = dbInstance.prepare('SELECT id, user_id FROM plans WHERE id = ?').get(trimmedId);
  if (!existing) {
    return false;
  }

  if (options.userId) {
    if (existing.user_id !== options.userId) {
      return false;
    }
    const stmt = dbInstance.prepare('DELETE FROM plans WHERE id = ? AND user_id = ?');
    const result = stmt.run(trimmedId, options.userId);
    return result.changes > 0;
  }

  const stmt = dbInstance.prepare('DELETE FROM plans WHERE id = ?');
  const result = stmt.run(trimmedId);
  return result.changes > 0;
}

/**
 * Claims an unowned anonymous trial plan for an authenticated user.
 * 
 * Rules:
 * 1. Plan must exist and currently have user_id IS NULL.
 * 2. Requester must possess the matching trial_sessions cookie associated with plan_id.
 * 3. Atomic UPDATE plans SET user_id = :userId WHERE id = :planId AND user_id IS NULL.
 * 4. Preserves all 6 AI modules, status, errors, timestamps, input fields.
 * 5. Returns 409 PLAN_ALREADY_CLAIMED on race/duplicate claim attempts.
 * 
 * @param {string} planId - UUID of the plan to claim
 * @param {string} userId - UUID of the authenticated user
 * @param {string} trialToken - Trial cookie value
 * @param {object} [db] - Optional Database instance
 * @returns {object} The claimed plan object
 */
function claimPlan(planId, userId, trialToken, db = null) {
  if (!planId || typeof planId !== 'string' || !planId.trim()) {
    const err = new Error('Plan ID is required.');
    err.statusCode = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }

  if (!userId || typeof userId !== 'string' || !userId.trim()) {
    const err = new Error('User ID is required.');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }

  const dbInstance = getDb(db);
  const trimmedId = planId.trim();
  const trimmedUserId = userId.trim();

  // 1. Verify trial relationship: Requester must possess the trial session that generated this plan
  if (!trialToken || typeof trialToken !== 'string') {
    const err = new Error('Trial session cookie is required to claim a trial plan.');
    err.statusCode = 403;
    err.code = 'INVALID_TRIAL_SESSION';
    throw err;
  }

  const trialSession = dbInstance.prepare('SELECT * FROM trial_sessions WHERE id = ?').get(trialToken.trim());
  if (!trialSession || trialSession.plan_id !== trimmedId) {
    const err = new Error('You can only claim plans created during your active trial session.');
    err.statusCode = 403;
    err.code = 'INVALID_TRIAL_SESSION';
    throw err;
  }

  // 2. Check if plan exists
  const existingPlan = dbInstance.prepare('SELECT id, user_id FROM plans WHERE id = ?').get(trimmedId);
  if (!existingPlan) {
    const err = new Error(`Plan not found with id: ${trimmedId}`);
    err.statusCode = 404;
    err.code = 'PLAN_NOT_FOUND';
    throw err;
  }

  // If already claimed by anyone
  if (existingPlan.user_id !== null) {
    const err = new Error('This plan has already been claimed.');
    err.statusCode = 409;
    err.code = 'PLAN_ALREADY_CLAIMED';
    throw err;
  }

  // 3. Atomically assign ownership with atomic WHERE guard
  const now = new Date().toISOString();
  const stmt = dbInstance.prepare(`
    UPDATE plans
    SET user_id = ?, updated_at = ?
    WHERE id = ? AND user_id IS NULL
  `);

  const result = stmt.run(trimmedUserId, now, trimmedId);

  if (result.changes === 0) {
    // Race condition: concurrent claim succeeded
    const err = new Error('This plan has already been claimed.');
    err.statusCode = 409;
    err.code = 'PLAN_ALREADY_CLAIMED';
    throw err;
  }

  return getPlanById(trimmedId, dbInstance);
}

module.exports = {
  TRIAL_COOKIE_NAME,
  TRIAL_COOKIE_TTL_MS,
  getTrialCookieOptions,
  setTrialCookie,
  clearTrialCookie,
  hashIp,
  getOrCreateTrialSession,
  createPlan,
  createTrialPlan,
  getPlanById,
  getPlanForRequester,
  listPlans,
  updatePlan,
  deletePlan,
  claimPlan,
  formatPlanRow,
  deriveGenerationStatus,
  safeJsonStringify,
  safeJsonParse
};
