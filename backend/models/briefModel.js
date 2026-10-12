// backend/models/briefModel.js
const geminiClient = require('../services/geminiClient');
const { parseGeminiJson } = require('../utils/jsonParser');
const { buildStartupPromptContext } = require('../utils/promptUtils');
const { validateStartupBrief, BriefValidationError } = require('../utils/briefValidator');

/**
 * Generates a structured Draft Startup Brief from the founder's raw intake data
 * using a single, comprehensive Gemini API call.
 *
 * Strict Guidelines:
 * - Distinguishes supplied facts from AI interpretations and unverified assumptions.
 * - Identifies 2-3 material clarification questions without blocking progression.
 * - Does NOT fabricate company traction, revenue figures, user counts, or customer quotes.
 *
 * @param {object} data - Founder input fields (startupName, industry, problem, solution, targetAudience, usp, summary)
 * @returns {Promise<object>} Canonical Draft Startup Brief conforming to schemaVersion 1
 */
async function generateDraftBrief(data) {
  const context = buildStartupPromptContext(data);

  const prompt = `
You are a senior venture architect and startup strategist. Analyze the founder's submitted idea below and draft a canonical Startup Brief.

${context}

Distinguish strictly between:
1. FACTS: Information provided directly by the founder (do not alter their intended meaning).
2. AI INTERPRETATIONS: Your structured categorization of their idea (market classification, business model archetype, market dynamics, core value proposition).
3. ASSUMPTIONS: Plausible, unverified propositions required for this business model to succeed (2-4 key assumptions across market, product, operations, or economics).
4. CLARIFICATION QUESTIONS: 2-3 high-leverage questions highlighting ambiguities, trade-offs, or missing operational constraints that would sharpen the business plan.

Guidelines:
- Never fabricate customer interviews, traction statistics, financial numbers, or non-existent partnerships.
- If information is missing or ambiguous, surface it as an assumption or clarification question, not as an invented fact.
- Keep the language clear, actionable, and free of vague buzzwords.

Return strictly valid JSON with this exact structure:
{
  "aiInterpretations": {
    "category": "e.g., B2B SaaS / Two-Sided Marketplace / Direct-to-Consumer / DeepTech",
    "businessModel": "e.g., Subscription / Usage-Based / Commission / Freemium",
    "targetMarketDynamics": "Concise summary of market environment and customer behavior",
    "coreValueProposition": "Clear synthesis of the unfair advantage and primary customer benefit"
  },
  "assumptions": [
    {
      "id": "asm_1",
      "assumption": "Clear statement of what must hold true for this venture to succeed",
      "category": "Market"
    },
    {
      "id": "asm_2",
      "assumption": "Second critical operational or product assumption",
      "category": "Product"
    }
  ],
  "clarificationQuestions": [
    {
      "id": "q_1",
      "question": "Actionable question for the founder",
      "context": "Why answering this will improve the downstream business plan"
    },
    {
      "id": "q_2",
      "question": "Second strategic or execution question",
      "context": "Context on the strategic trade-off involved"
    }
  ]
}
`;

  try {
    const rawText = await geminiClient.callGemini(prompt, { context: 'Startup Brief' });
    const parsed = parseGeminiJson(rawText);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new BriefValidationError('Gemini output must be a valid JSON object.');
    }

    const aiInterps = parsed.aiInterpretations || (parsed.category ? parsed : null);
    if (!aiInterps || typeof aiInterps !== 'object') {
      throw new BriefValidationError('Gemini output is missing required aiInterpretations section.');
    }

    if (!Array.isArray(parsed.assumptions) || parsed.assumptions.length === 0) {
      throw new BriefValidationError('Gemini output is missing required assumptions array.');
    }

    if (!Array.isArray(parsed.clarificationQuestions) || parsed.clarificationQuestions.length === 0) {
      throw new BriefValidationError('Gemini output is missing required clarificationQuestions array.');
    }

    const now = new Date().toISOString();
    const rawInput = {
      startupName: String(data.startupName || data.name || 'Untitled Startup').trim(),
      industry: String(data.industry || data.domain || '').trim(),
      problem: String(data.problem || '').trim(),
      solution: String(data.solution || '').trim(),
      targetAudience: String(data.targetAudience || data.audience || '').trim(),
      usp: String(data.usp || '').trim(),
      summary: String(data.summary || '').trim()
    };

    const draftBrief = {
      schemaVersion: 1,
      status: 'draft',
      rawInput,
      facts: {
        startupName: rawInput.startupName,
        industry: rawInput.industry || 'Not provided',
        problem: rawInput.problem || 'Not provided',
        solution: rawInput.solution || 'Not provided',
        targetAudience: rawInput.targetAudience || 'Not provided',
        usp: rawInput.usp || 'Not provided',
        summary: rawInput.summary || ''
      },
      aiInterpretations: {
        category: String(aiInterps.category || '').trim() || 'General Business',
        businessModel: String(aiInterps.businessModel || '').trim() || 'Value Exchange',
        targetMarketDynamics: String(aiInterps.targetMarketDynamics || '').trim() || 'Emerging market',
        coreValueProposition: String(aiInterps.coreValueProposition || rawInput.usp || '').trim() || 'Targeted value delivery'
      },
      assumptions: parsed.assumptions.map((a, i) => ({
        id: a?.id ? String(a.id) : `asm_${i + 1}`,
        assumption: String(a?.assumption || a?.statement || a?.text || '').trim(),
        statement: String(a?.assumption || a?.statement || a?.text || '').trim(),
        category: String(a?.category || 'General').trim(),
        status: 'unverified',
        confirmed: false
      })).filter(a => a.assumption.length > 0),
      clarificationQuestions: parsed.clarificationQuestions.map((q, i) => ({
        id: q?.id ? String(q.id) : `q_${i + 1}`,
        question: String(q?.question || q?.text || '').trim(),
        context: String(q?.context || q?.category || '').trim(),
        category: String(q?.context || q?.category || '').trim(),
        answered: false,
        answer: '',
        founderAnswer: ''
      })).filter(q => q.question.length > 0),
      metadata: {
        createdAt: now,
        updatedAt: now,
        confirmedAt: null
      }
    };

    return validateStartupBrief(draftBrief);
  } catch (error) {
    if (error.name === 'SchemaValidationError' || error.name === 'BriefValidationError') {
      throw error;
    }
    console.error('Gemini Draft Brief Error:', error.response?.data || error.message);
    const modelError = new Error('Failed to draft Startup Brief from Gemini');
    modelError.status = error.response?.status || (error.code ? 503 : 500);
    modelError.code = error.code;
    throw modelError;
  }
}

module.exports = {
  generateDraftBrief
};
