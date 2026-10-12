const { callGemini } = require('../services/geminiClient');
const { parseGeminiJson } = require('../utils/jsonParser');
const { buildStartupPromptContext } = require('../utils/promptUtils');
const { validateMVP } = require('../utils/responseValidators');

const generateMVP = async (data) => {
  const contextBlock = buildStartupPromptContext(data);

  const prompt = `
  You are a startup product strategist. Based on the startup idea below, generate a realistic MVP plan.

${contextBlock}

  Instructions:
  - Core features should focus on *minimal functionality* to test the idea.
  - Timeline should reflect a realistic MVP build (1-3 months).
  - Technical requirements should list tools, frameworks, or infrastructure expected for MVP only (not scale).

  Return valid JSON only:
  {
    "startupName": "",
    "coreFeatures": ["Feature 1", "Feature 2", ...],
    "technicalRequirements": "List of frameworks, tools, stack for MVP",
    "launchTimeline": "Example: 4-6 weeks or 2 months"
  }
  `;

  try {
    const rawText = await callGemini(prompt, { context: 'MVP' });
    const parsed = parseGeminiJson(rawText);
    return validateMVP(parsed);
  } catch (error) {
    if (error.name === 'SchemaValidationError') {
      throw error;
    }
    console.error('Gemini MVP Error:', error.response?.data || error.message);
    const modelError = new Error('Failed to generate MVP from Gemini');
    modelError.status = error.response?.status || (error.code ? 503 : 500);
    modelError.code = error.code;
    throw modelError;
  }
};

module.exports = { generateMVP };
