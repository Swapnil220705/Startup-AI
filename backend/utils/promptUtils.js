// backend/utils/promptUtils.js

/**
 * Normalizes an input field value:
 * - Trims whitespace
 * - Treats null, undefined, "", whitespace-only, or literal "undefined"/"null" strings as empty
 * - Returns clean string or fallback (defaults to null)
 * 
 * @param {any} val - Input value
 * @param {string|null} [fallback=null] - Fallback value if empty
 * @returns {string|null} Normalized string or fallback
 */
function normalizeInput(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  const str = String(val).trim();
  if (str.length === 0) return fallback;
  const lower = str.toLowerCase();
  if (lower === 'undefined' || lower === 'null') return fallback;
  return str;
}

/**
 * Builds a standardized startup prompt context block.
 * Guarantees that:
 * - No literal "undefined" or "null" strings are injected into prompts.
 * - Missing or whitespace-only fields are replaced with explicit wording ("Not provided").
 * - Optional idea summary is included when populated and explicitly marked "Not provided" when absent.
 * - All core business dimensions (name, industry, problem, solution, audience, USP) are present.
 * 
 * @param {object} data - Raw input data
 * @returns {String} Context string with attached dimension properties
 */
function buildStartupPromptContext(data = {}) {
  const safeData = data && typeof data === 'object' ? data : {};

  const name = normalizeInput(safeData.startupName, 'Untitled Startup');
  const industry = normalizeInput(safeData.industry, 'Not provided');
  const problem = normalizeInput(safeData.problem, 'Not provided');
  const solution = normalizeInput(safeData.solution, 'Not provided');
  const audience = normalizeInput(safeData.targetAudience || safeData.audience, 'Not provided');
  const usp = normalizeInput(safeData.usp, 'Not provided');
  const summary = normalizeInput(safeData.summary, null);

  const formatted = `Startup Name: ${name}
Industry: ${industry}
Problem Statement: ${problem}
Proposed Solution: ${solution}
Target Audience: ${audience}
Unique Selling Proposition: ${usp}
Idea Summary: ${summary || 'Not provided'}`;

  // Return a String instance with attached dimension properties
  const res = new String(formatted);
  res.name = name;
  res.industry = industry;
  res.problem = problem;
  res.solution = solution;
  res.targetAudience = audience;
  res.usp = usp;
  res.summary = summary || 'Not provided';
  res.formatForPrompt = () => formatted;

  return res;
}

module.exports = {
  normalizeInput,
  buildStartupPromptContext
};
