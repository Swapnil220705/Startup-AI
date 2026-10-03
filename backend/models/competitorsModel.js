const { callGemini } = require('../services/geminiClient');
const { parseGeminiJson } = require('../utils/jsonParser');

const generateCompetitors = async (data) => {
  const prompt = `
  You're a market research expert. Based on the following startup details, identify 3 real potential competitors or similar platforms in the market.

  Startup Name: ${data.startupName}
  Problem: ${data.problem}
  Solution: ${data.solution}
  Industry: ${data.industry}
  Target Audience: ${data.targetAudience}
  Unique Selling Proposition: ${data.usp}

  Return the result as a JSON object:
  {
    "competitors": [
      {
        "name": "Competitor 1 Name",
        "description": "What they offer and how they work",
        "differentiator": "How our startup is different"
      },
      {
        "name": "Competitor 2 Name",
        "description": "What they offer and how they work",
        "differentiator": "How our startup is different"
      },
      {
        "name": "Competitor 3 Name",
        "description": "What they offer and how they work",
        "differentiator": "How our startup is different"
      }
    ]
  }
  `;

  try {
    const rawText = await callGemini(prompt, { context: 'Competitors' });
    return parseGeminiJson(rawText);
  } catch (error) {
    console.error('Gemini Competitors Model Error:', error.response?.data || error.message);
    const modelError = new Error('Failed to generate competitors from Gemini');
    modelError.status = error.response?.status || (error.code ? 503 : 500);
    modelError.code = error.code;
    throw modelError;
  }
};

module.exports = { generateCompetitors };
