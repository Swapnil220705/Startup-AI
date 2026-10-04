// backend/services/planService.js
const crypto = require('crypto');
const { getDatabase } = require('../db/database');

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

  const base = {
    id: row.id,
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
 * @param {object} planData - Input details and generated modules
 * @param {object} [db] - Optional Database instance for isolation/testing
 * @returns {object} The created plan object
 */
function createPlan(planData, db = null) {
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

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const generationStatus = deriveGenerationStatus(planData);

  const rowData = {
    id,
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

  const dbInstance = db || getDatabase();

  const stmt = dbInstance.prepare(`
    INSERT INTO plans (
      id,
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
 * Retrieves a plan by its ID.
 * 
 * @param {string} id - Plan UUID
 * @param {object} [db] - Optional Database instance
 * @returns {object|null}
 */
function getPlanById(id, db = null) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  const dbInstance = db || getDatabase();
  const stmt = dbInstance.prepare('SELECT * FROM plans WHERE id = ?');
  const row = stmt.get(id);

  if (!row) {
    return null;
  }

  return formatPlanRow(row, true);
}

/**
 * Lists plans ordered by creation date descending with pagination.
 * 
 * @param {object} [options]
 * @param {number} [options.limit=50]
 * @param {number} [options.offset=0]
 * @param {object} [db] - Optional Database instance
 * @returns {{ plans: object[], total: number, limit: number, offset: number }}
 */
function listPlans(options = {}, db = null) {
  const dbInstance = db || getDatabase();

  let limit = parseInt(options.limit, 10);
  if (isNaN(limit) || limit < 1) limit = 50;
  if (limit > 100) limit = 100;

  let offset = parseInt(options.offset, 10);
  if (isNaN(offset) || offset < 0) offset = 0;

  const countRow = dbInstance.prepare('SELECT COUNT(*) as count FROM plans').get();
  const total = countRow ? countRow.count : 0;

  const stmt = dbInstance.prepare(`
    SELECT
      id,
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
 * 
 * @param {string} id - Plan UUID
 * @param {object} updates - Metadata fields to update (startupName, industry, problem, solution, targetAudience, usp)
 * @param {object} [db] - Optional Database instance
 * @returns {object|null} The updated plan object or null if not found
 */
function updatePlan(id, updates = {}, db = null) {
  if (!id || typeof id !== 'string') {
    return null;
  }

  if (!updates || typeof updates !== 'object') {
    const error = new Error('Updates must be a valid object');
    error.statusCode = 400;
    error.code = 'INVALID_INPUT';
    throw error;
  }

  const dbInstance = db || getDatabase();

  // Verify plan exists
  const existing = dbInstance.prepare('SELECT id FROM plans WHERE id = ?').get(id);
  if (!existing) {
    return null;
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
  const params = { id, updated_at: new Date().toISOString() };

  for (const [key, col] of Object.entries(allowedFields)) {
    if (updates[key] !== undefined) {
      setClauses.push(`${col} = @${col}`);
      params[col] = updates[key] === null ? null : String(updates[key]).trim();
    }
  }

  setClauses.push('updated_at = @updated_at');

  const sql = `UPDATE plans SET ${setClauses.join(', ')} WHERE id = @id`;

  try {
    dbInstance.prepare(sql).run(params);
  } catch (err) {
    const dbError = new Error('Failed to update plan in database');
    dbError.statusCode = 500;
    dbError.code = 'DATABASE_ERROR';
    throw dbError;
  }

  return getPlanById(id, dbInstance);
}

/**
 * Deletes a startup plan by its ID.
 * 
 * @param {string} id - Plan UUID
 * @param {object} [db] - Optional Database instance
 * @returns {boolean} True if deleted, false if not found
 */
function deletePlan(id, db = null) {
  if (!id || typeof id !== 'string') {
    return false;
  }

  const dbInstance = db || getDatabase();
  const stmt = dbInstance.prepare('DELETE FROM plans WHERE id = ?');
  const result = stmt.run(id);

  return result.changes > 0;
}

module.exports = {
  createPlan,
  getPlanById,
  listPlans,
  updatePlan,
  deletePlan,
  formatPlanRow,
  deriveGenerationStatus,
  safeJsonStringify,
  safeJsonParse
};

