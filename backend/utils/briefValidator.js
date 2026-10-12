// backend/utils/briefValidator.js
const { SchemaValidationError } = require('./responseValidators');

class BriefValidationError extends SchemaValidationError {
  constructor(message, details = null, code = 'MODEL_OUTPUT_INVALID', status = 502) {
    super(message, details);
    this.name = 'BriefValidationError';
    this.code = code;
    this.status = status;
    this.statusCode = status;
  }
}

/**
 * Validates and normalizes a Startup Brief structure.
 *
 * Enforces the canonical schema:
 * - schemaVersion: 1
 * - status: 'draft' | 'confirmed'
 * - rawInput: { startupName, industry, problem, solution, targetAudience, usp, summary }
 * - facts: { startupName, industry, problem, solution, targetAudience, usp, summary }
 * - aiInterpretations: { category, businessModel, targetMarketDynamics, coreValueProposition }
 * - assumptions: Array of { id, assumption, category, status }
 * - clarificationQuestions: Array of { id, question, context, answered, answer }
 * - metadata: { createdAt, updatedAt, confirmedAt }
 *
 * @param {any} brief - Brief data to validate
 * @param {object} [options={}] - Validation options
 * @param {boolean} [options.requireConfirmed=false] - Require confirmed status
 * @returns {object} Normalized, validated brief
 * @throws {SchemaValidationError}
 */
function validateStartupBrief(brief, options = {}) {
  if (!brief || typeof brief !== 'object' || Array.isArray(brief)) {
    throw new BriefValidationError('Startup Brief must be a valid non-null object');
  }

  // 1. Schema Version & Status
  const schemaVersion = brief.schemaVersion === 1 || brief.schemaVersion === '1' ? 1 : null;
  if (schemaVersion !== 1) {
    throw new BriefValidationError('Startup Brief schemaVersion must be 1');
  }

  const validStatuses = ['draft', 'confirmed'];
  const status = typeof brief.status === 'string' && validStatuses.includes(brief.status.toLowerCase())
    ? brief.status.toLowerCase()
    : null;

  if (!status) {
    throw new BriefValidationError('Startup Brief status must be either "draft" or "confirmed"');
  }

  if (options.requireConfirmed && status !== 'confirmed') {
    throw new BriefValidationError('Startup Brief must have confirmed status');
  }

  // 2. Raw Input & Facts
  if (!brief.rawInput || typeof brief.rawInput !== 'object' || Array.isArray(brief.rawInput)) {
    throw new BriefValidationError('Startup Brief must contain a valid rawInput object');
  }

  if (!brief.facts || typeof brief.facts !== 'object' || Array.isArray(brief.facts)) {
    throw new BriefValidationError('Startup Brief must contain a valid facts object');
  }

  const startupName = typeof brief.facts.startupName === 'string' ? brief.facts.startupName.trim() : '';
  if (!startupName) {
    throw new BriefValidationError('Startup Brief facts must include a non-empty startupName');
  }

  const rawInput = {
    startupName: String(brief.rawInput.startupName || brief.rawInput.name || startupName).trim(),
    industry: String(brief.rawInput.industry || brief.rawInput.domain || '').trim(),
    problem: String(brief.rawInput.problem || '').trim(),
    solution: String(brief.rawInput.solution || '').trim(),
    targetAudience: String(brief.rawInput.targetAudience || brief.rawInput.audience || '').trim(),
    usp: String(brief.rawInput.usp || '').trim(),
    summary: String(brief.rawInput.summary || '').trim()
  };

  const normalizedFacts = {
    startupName,
    industry: String(brief.facts.industry || 'Not provided').trim() || 'Not provided',
    problem: String(brief.facts.problem || 'Not provided').trim() || 'Not provided',
    solution: String(brief.facts.solution || 'Not provided').trim() || 'Not provided',
    targetAudience: String(brief.facts.targetAudience || brief.facts.audience || 'Not provided').trim() || 'Not provided',
    usp: String(brief.facts.usp || 'Not provided').trim() || 'Not provided',
    summary: String(brief.facts.summary || '').trim()
  };

  // 3. AI Interpretations
  if (!brief.aiInterpretations || typeof brief.aiInterpretations !== 'object' || Array.isArray(brief.aiInterpretations)) {
    throw new BriefValidationError('Startup Brief must contain an aiInterpretations object');
  }

  const normalizedInterpretations = {
    category: String(brief.aiInterpretations.category || 'General Business').trim(),
    businessModel: String(brief.aiInterpretations.businessModel || 'Direct Value Proposition').trim(),
    targetMarketDynamics: String(brief.aiInterpretations.targetMarketDynamics || '').trim(),
    coreValueProposition: String(brief.aiInterpretations.coreValueProposition || '').trim()
  };

  // 4. Assumptions Collection
  if (!Array.isArray(brief.assumptions)) {
    throw new BriefValidationError('Startup Brief assumptions must be an array');
  }

  const normalizedAssumptions = brief.assumptions.map((item, idx) => {
    if (!item || (typeof item !== 'object' && typeof item !== 'string')) {
      throw new BriefValidationError(`Assumption at index ${idx} must be an object or string`);
    }
    const assumptionText = typeof item === 'string'
      ? item.trim()
      : String(item.assumption || item.statement || item.text || '').trim();

    if (!assumptionText) {
      throw new BriefValidationError(`Assumption at index ${idx} cannot be empty`);
    }

    const confirmed = typeof item.confirmed === 'boolean'
      ? item.confirmed
      : (item.status === 'confirmed');

    return {
      id: item.id ? String(item.id).trim() : `asm_${idx + 1}`,
      assumption: assumptionText,
      statement: assumptionText,
      category: typeof item.category === 'string' && item.category.trim() ? item.category.trim() : 'General',
      status: confirmed ? 'confirmed' : (typeof item.status === 'string' && item.status.trim() ? item.status.trim() : 'unverified'),
      confirmed
    };
  });

  // 5. Clarification Questions Collection
  if (!Array.isArray(brief.clarificationQuestions)) {
    throw new BriefValidationError('Startup Brief clarificationQuestions must be an array');
  }

  const normalizedQuestions = brief.clarificationQuestions.map((q, idx) => {
    if (!q || (typeof q !== 'object' && typeof q !== 'string')) {
      throw new BriefValidationError(`Clarification question at index ${idx} must be an object or string`);
    }

    const questionText = typeof q === 'string'
      ? q.trim()
      : String(q.question || q.text || '').trim();

    if (!questionText) {
      throw new BriefValidationError(`Clarification question at index ${idx} cannot be empty`);
    }

    const context = typeof q.context === 'string' ? q.context.trim() : (typeof q.category === 'string' ? q.category.trim() : '');
    const answer = typeof q.answer === 'string'
      ? q.answer.trim()
      : (typeof q.founderAnswer === 'string' ? q.founderAnswer.trim() : '');
    const answered = typeof q.answered === 'boolean' ? q.answered : answer.length > 0;

    return {
      id: q.id ? String(q.id).trim() : `q_${idx + 1}`,
      question: questionText,
      context,
      category: context,
      answered,
      answer,
      founderAnswer: answer
    };
  });

  // 6. Metadata
  const now = new Date().toISOString();
  const metadata = {
    createdAt: brief.metadata?.createdAt ? String(brief.metadata.createdAt) : now,
    updatedAt: brief.metadata?.updatedAt ? String(brief.metadata.updatedAt) : now,
    confirmedAt: status === 'confirmed'
      ? (brief.metadata?.confirmedAt ? String(brief.metadata.confirmedAt) : now)
      : null
  };

  return {
    schemaVersion,
    status,
    rawInput,
    facts: normalizedFacts,
    aiInterpretations: normalizedInterpretations,
    assumptions: normalizedAssumptions,
    clarificationQuestions: normalizedQuestions,
    metadata
  };
}

/**
 * Normalizes founder intake fields.
 * Accepts { name, domain, problem, solution, audience, usp, summary } or { startupName, industry, ... }
 */
function normalizeStartupBriefInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new BriefValidationError('Idea text or problem details must be a non-empty object', null, 'VALIDATION_FAILED', 400);
  }

  const name = String(input.startupName || input.name || '').trim();
  const domain = String(input.industry || input.domain || '').trim();
  const problem = String(input.problem || '').trim();
  const solution = String(input.solution || '').trim();
  const audience = String(input.targetAudience || input.audience || '').trim();
  const usp = String(input.usp || '').trim();
  const summary = String(input.summary || '').trim();

  if (!name && !problem && !solution) {
    throw new BriefValidationError('Idea text or problem details are required to draft a brief', null, 'VALIDATION_FAILED', 400);
  }

  return {
    name,
    domain,
    problem,
    solution,
    audience,
    usp,
    summary,
    startupName: name,
    industry: domain,
    targetAudience: audience
  };
}

module.exports = {
  BriefValidationError,
  validateStartupBrief,
  normalizeStartupBriefInput
};
