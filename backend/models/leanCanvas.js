const { callGemini } = require('../services/geminiClient');
const { parseGeminiJson } = require('../utils/jsonParser');

const generateLeanCanvas = async (data) => {
  const prompt = `
  You are a Lean Canvas strategist. Create a startup Lean Canvas based on the inputs below. Be specific and concise.

  Startup Name: ${data.startupName}
  Problem: ${data.problem}
  Solution: ${data.solution}
  Industry: ${data.industry}
  Target Audience: ${data.targetAudience}
  Unique Selling Proposition: ${data.usp}

  Guidelines:
  - Avoid filler or vague responses like "N/A", "unknown", or placeholders.
  - Use real assumptions based on typical industry behavior where applicable.

  Return strictly valid JSON with these keys:
  {
    "startupName": "",
    "problem": "",
    "solution": "",
    "audience": "",
    "keyMetrics": "Quantifiable metrics to track growth or product performance",
    "uniqueValueProposition": "",
    "channels": "Marketing/sales/distribution channels",
    "customerSegments": "Main user/customer groups",
    "costStructure": "Primary cost drivers (people, infra, acquisition, etc.)",
    "revenueStreams": "Main ways the startup will generate money",
    "unfairAdvantage": "What makes the startup defensible or hard to copy"
  }
  `;

  try {
    const rawText = await callGemini(prompt, { context: 'Lean Canvas' });
    return parseGeminiJson(rawText);
  } catch (error) {
    console.error('Gemini Lean Canvas Error:', error.response?.data || error.message);
    const modelError = new Error('Failed to generate Lean Canvas from Gemini');
    modelError.status = error.response?.status || (error.code ? 503 : 500);
    modelError.code = error.code;
    throw modelError;
  }
};

module.exports = { generateLeanCanvas };
