const { callGemini } = require('../services/geminiClient');
const { parseGeminiJson } = require('../utils/jsonParser');
const { buildStartupPromptContext } = require('../utils/promptUtils');
const { validatePitch } = require('../utils/responseValidators');

const generatePitch = async (data) => {
  const contextBlock = buildStartupPromptContext(data);

  const prompt = `
  You are a pitch deck expert helping startups craft powerful elevator pitches that are short, sharp, and investor-friendly.

${contextBlock}

  Guidelines:
  - 2 to 4 sentences only.
  - Be punchy and persuasive.
  - Clearly state the value to the target audience.
  - Avoid filler phrases like “we aim to” or “we strive to”.

  Return ONLY valid JSON:
  {
    "elevatorPitch": "The pitch here..."
  }
  `;

  try {
    const rawText = await callGemini(prompt, { context: 'Pitch' });
    const parsed = parseGeminiJson(rawText);
    return validatePitch(parsed);
  } catch (error) {
    if (error.name === 'SchemaValidationError') {
      throw error;
    }
    console.error('Gemini Pitch Model Error:', error.response?.data || error.message);
    const modelError = new Error('Failed to generate Elevator Pitch from Gemini');
    modelError.status = error.response?.status || (error.code ? 503 : 500);
    modelError.code = error.code;
    throw modelError;
  }
};

module.exports = { generatePitch };
