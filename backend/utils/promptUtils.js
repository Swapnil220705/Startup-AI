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
  const brief = safeData.brief && typeof safeData.brief === 'object' ? safeData.brief : null;
  const facts = brief && brief.facts && typeof brief.facts === 'object' ? brief.facts : {};

  const name = normalizeInput(facts.startupName || safeData.startupName || safeData.name, 'Untitled Startup');
  const industry = normalizeInput(facts.industry || safeData.industry || safeData.domain, 'Not provided');
  const problem = normalizeInput(facts.problem || safeData.problem, 'Not provided');
  const solution = normalizeInput(facts.solution || safeData.solution, 'Not provided');
  const audience = normalizeInput(facts.targetAudience || safeData.targetAudience || safeData.audience, 'Not provided');
  const usp = normalizeInput(facts.usp || safeData.usp, 'Not provided');
  const summary = normalizeInput(facts.summary || safeData.summary, null);

  let formatted = `Startup Name: ${name}
Industry: ${industry}
Problem Statement: ${problem}
Proposed Solution: ${solution}
Target Audience: ${audience}
Unique Selling Proposition: ${usp}
Idea Summary: ${summary || 'Not provided'}`;

  // If a confirmed Startup Brief is present, enrich context for downstream models
  if (brief) {
    const briefParts = [];
    if (brief.aiInterpretations) {
      if (brief.aiInterpretations.category) briefParts.push(`Category: ${brief.aiInterpretations.category}`);
      if (brief.aiInterpretations.businessModel) briefParts.push(`Business Model: ${brief.aiInterpretations.businessModel}`);
      if (brief.aiInterpretations.targetMarketDynamics) briefParts.push(`Market Dynamics: ${brief.aiInterpretations.targetMarketDynamics}`);
      if (brief.aiInterpretations.coreValueProposition) briefParts.push(`Core Value Proposition: ${brief.aiInterpretations.coreValueProposition}`);
    }

    if (Array.isArray(brief.assumptions) && brief.assumptions.length > 0) {
      const assumptionLines = brief.assumptions
        .map(a => typeof a === 'string' ? a.trim() : String(a.assumption || '').trim())
        .filter(Boolean)
        .map(a => `  • ${a}`);
      if (assumptionLines.length > 0) {
        briefParts.push(`Key Assumptions:\n${assumptionLines.join('\n')}`);
      }
    }

    if (Array.isArray(brief.clarificationQuestions) && brief.clarificationQuestions.length > 0) {
      const answeredLines = brief.clarificationQuestions
        .filter(q => q && q.answered && q.answer && String(q.answer).trim())
        .map(q => `  • Q: ${q.question} -> A: ${q.answer}`);
      if (answeredLines.length > 0) {
        briefParts.push(`Founder Clarifications:\n${answeredLines.join('\n')}`);
      }
    }

    if (briefParts.length > 0) {
      formatted += `\n\n[Confirmed Startup Brief Context]\n${briefParts.join('\n')}`;
    }
  }

  // Return a String instance with attached dimension properties
  const res = new String(formatted);
  res.name = name;
  res.industry = industry;
  res.problem = problem;
  res.solution = solution;
  res.targetAudience = audience;
  res.usp = usp;
  res.summary = summary || 'Not provided';
  res.brief = brief;
  res.formatForPrompt = () => formatted;

  return res;
}

module.exports = {
  normalizeInput,
  buildStartupPromptContext
};
