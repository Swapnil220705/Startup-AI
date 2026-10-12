const { callGemini } = require('../services/geminiClient');
const { parseGeminiJson } = require('../utils/jsonParser');
const { buildStartupPromptContext } = require('../utils/promptUtils');
const { validatePersonas } = require('../utils/responseValidators');

const generatePersonas = async (data) => {
  const contextBlock = buildStartupPromptContext(data);

  const prompt = `
  You're a UX researcher. Based on the startup details below, generate 2 realistic user personas in pure JSON only. Do NOT include explanations, headings, or markdown formatting.

${contextBlock}

  Return ONLY valid raw JSON using this format exactly:
  {
    "personas": [
      {
        "name": "Full Name",
        "age": "e.g. 24 years old",
        "occupation": "Their current job or role",
        "goals": "What they want to achieve",
        "painPoints": "Problems or frustrations they face",
        "techComfortLevel": "Low / Medium / High / Very High"
      },
      {
        "name": "Full Name",
        "age": "...",
        "occupation": "...",
        "goals": "...",
        "painPoints": "...",
        "techComfortLevel": "..."
      }
    ]
  }
  Strictly return valid JSON only — no extra commentary or code formatting.
  `;

  try {
    const rawText = await callGemini(prompt, { context: 'Personas' });
    const parsed = parseGeminiJson(rawText);
    return validatePersonas(parsed);
  } catch (error) {
    if (error.name === 'SchemaValidationError') {
      throw error;
    }
    console.error('Gemini Personas Model Error:', error.response?.data || error.message);
    const modelError = new Error('Failed to generate user personas from Gemini');
    modelError.status = error.response?.status || (error.code ? 503 : 500);
    modelError.code = error.code;
    throw modelError;
  }
};

module.exports = { generatePersonas };
