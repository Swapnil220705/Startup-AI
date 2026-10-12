// backend/utils/responseValidators.js

/**
 * Custom Error for AI Model Response Schema Validation Failures.
 * HTTP 502 Bad Gateway / Model Output Invalid.
 */
class SchemaValidationError extends Error {
  constructor(message, details = null) {
    super(message);
    this.name = 'SchemaValidationError';
    this.code = 'MODEL_OUTPUT_INVALID';
    this.status = 502;
    this.statusCode = 502;
    this.details = details;
  }
}

/**
 * Checks if a value is a non-empty string or non-empty array.
 * 
 * @param {any} val
 * @returns {boolean}
 */
function isNonEmpty(val) {
  if (typeof val === 'string') {
    return val.trim().length > 0;
  }
  if (Array.isArray(val)) {
    return val.length > 0;
  }
  return false;
}

/**
 * Validates parsed Lean Canvas output.
 * 
 * @param {any} data - Parsed JSON from Gemini
 * @returns {object} Validated Lean Canvas object
 * @throws {SchemaValidationError}
 */
function validateLeanCanvas(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SchemaValidationError('Lean Canvas output must be a valid JSON object.');
  }

  // Canonicalize aliases
  const uvp = data.uniqueValueProposition || data.usp;
  const segments = data.customerSegments || data.audience;

  const requiredFields = [
    { key: 'problem', val: data.problem, label: 'Problem' },
    { key: 'solution', val: data.solution, label: 'Solution' },
    { key: 'uniqueValueProposition', val: uvp, label: 'Unique Value Proposition' },
    { key: 'customerSegments', val: segments, label: 'Customer Segments' },
    { key: 'keyMetrics', val: data.keyMetrics, label: 'Key Metrics' },
    { key: 'channels', val: data.channels, label: 'Channels' },
    { key: 'costStructure', val: data.costStructure, label: 'Cost Structure' },
    { key: 'revenueStreams', val: data.revenueStreams, label: 'Revenue Streams' },
    { key: 'unfairAdvantage', val: data.unfairAdvantage, label: 'Unfair Advantage' },
  ];

  const missing = [];
  for (const field of requiredFields) {
    if (!isNonEmpty(field.val)) {
      missing.push(field.label);
    }
  }

  if (missing.length > 0) {
    throw new SchemaValidationError(
      `Lean Canvas response is missing required section(s): ${missing.join(', ')}.`,
      { missing }
    );
  }

  return {
    ...data,
    uniqueValueProposition: typeof uvp === 'string' ? uvp.trim() : uvp,
    customerSegments: typeof segments === 'string' ? segments.trim() : segments
  };
}

/**
 * Validates parsed MVP Roadmap output.
 * 
 * @param {any} data - Parsed JSON from Gemini
 * @returns {object} Validated MVP object
 * @throws {SchemaValidationError}
 */
function validateMVP(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SchemaValidationError('MVP output must be a valid JSON object.');
  }

  // coreFeatures must be a non-empty array
  if (!Array.isArray(data.coreFeatures) || data.coreFeatures.length === 0) {
    throw new SchemaValidationError('MVP output must include a non-empty "coreFeatures" array.');
  }

  // Filter out empty items
  const validFeatures = data.coreFeatures.filter((f) => {
    if (typeof f === 'string') return f.trim().length > 0;
    if (f && typeof f === 'object') return Boolean(f.feature || f.title || f.name);
    return false;
  });

  if (validFeatures.length === 0) {
    throw new SchemaValidationError('MVP "coreFeatures" array contains no usable features.');
  }

  if (!isNonEmpty(data.technicalRequirements)) {
    throw new SchemaValidationError('MVP output is missing required "technicalRequirements".');
  }

  if (!isNonEmpty(data.launchTimeline)) {
    throw new SchemaValidationError('MVP output is missing required "launchTimeline".');
  }

  return {
    ...data,
    coreFeatures: validFeatures
  };
}

/**
 * Validates parsed Revenue Model output.
 * 
 * @param {any} data - Parsed JSON from Gemini
 * @returns {object} Validated Revenue Model object
 * @throws {SchemaValidationError}
 */
function validateRevenue(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SchemaValidationError('Revenue Model output must be a valid JSON object.');
  }

  const requiredFields = [
    { key: 'revenueStreams', val: data.revenueStreams, label: 'Revenue Streams' },
    { key: 'pricingStrategy', val: data.pricingStrategy, label: 'Pricing Strategy' },
    { key: 'expectedMonthlyRevenue', val: data.expectedMonthlyRevenue, label: 'Expected Monthly Revenue' },
    { key: 'growthOpportunities', val: data.growthOpportunities, label: 'Growth Opportunities' },
  ];

  const missing = [];
  for (const field of requiredFields) {
    if (!isNonEmpty(field.val)) {
      missing.push(field.label);
    }
  }

  if (missing.length > 0) {
    throw new SchemaValidationError(
      `Revenue Model response is missing required section(s): ${missing.join(', ')}.`,
      { missing }
    );
  }

  return data;
}

/**
 * Validates parsed User Personas output.
 * 
 * @param {any} data - Parsed JSON from Gemini
 * @returns {object} Validated { personas: [...] } object
 * @throws {SchemaValidationError}
 */
function validatePersonas(data) {
  if (!data || typeof data !== 'object') {
    throw new SchemaValidationError('User Personas output must be a valid JSON object or array.');
  }

  const personaArray = Array.isArray(data) ? data : data.personas;

  if (!Array.isArray(personaArray) || personaArray.length === 0) {
    throw new SchemaValidationError('User Personas response must contain a non-empty "personas" array.');
  }

  const validPersonas = personaArray.filter((p) => {
    if (!p || typeof p !== 'object' || Array.isArray(p)) return false;
    return isNonEmpty(p.name) && isNonEmpty(p.goals) && isNonEmpty(p.painPoints);
  });

  if (validPersonas.length === 0) {
    throw new SchemaValidationError('User Personas contains no valid personas with required name, goals, and painPoints.');
  }

  return {
    personas: validPersonas
  };
}

/**
 * Validates parsed Competitor Analysis output.
 * 
 * @param {any} data - Parsed JSON from Gemini
 * @returns {object} Validated { competitors: [...] } object
 * @throws {SchemaValidationError}
 */
function validateCompetitors(data) {
  if (!data || typeof data !== 'object') {
    throw new SchemaValidationError('Competitor Analysis output must be a valid JSON object or array.');
  }

  const competitorArray = Array.isArray(data) ? data : data.competitors;

  if (!Array.isArray(competitorArray) || competitorArray.length === 0) {
    throw new SchemaValidationError('Competitor Analysis response must contain a non-empty "competitors" array.');
  }

  const validCompetitors = competitorArray.filter((c) => {
    if (!c || typeof c !== 'object' || Array.isArray(c)) return false;
    return isNonEmpty(c.name) && isNonEmpty(c.description) && isNonEmpty(c.differentiator);
  });

  if (validCompetitors.length === 0) {
    throw new SchemaValidationError('Competitor Analysis contains no valid competitors with required name, description, and differentiator.');
  }

  return {
    competitors: validCompetitors
  };
}

/**
 * Validates parsed Elevator Pitch output.
 * 
 * @param {any} data - Parsed JSON from Gemini
 * @returns {object} Validated { elevatorPitch: string } object
 * @throws {SchemaValidationError}
 */
function validatePitch(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new SchemaValidationError('Investor Pitch output must be a valid JSON object.');
  }

  const pitch = data.elevatorPitch || data.pitch;

  if (typeof pitch !== 'string' || pitch.trim().length < 10) {
    throw new SchemaValidationError('Investor Pitch response must contain a valid, non-empty "elevatorPitch" string.');
  }

  return {
    elevatorPitch: pitch.trim()
  };
}

module.exports = {
  SchemaValidationError,
  validateLeanCanvas,
  validateMVP,
  validateRevenue,
  validatePersonas,
  validateCompetitors,
  validatePitch
};
