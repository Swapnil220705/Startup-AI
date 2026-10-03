const { callGemini } = require('../services/geminiClient');
const { parseGeminiJson } = require('../utils/jsonParser');

const generateMVP = async (data) => {
  const prompt = `
  You are a startup product strategist. Based on the startup idea below, generate a realistic MVP plan.

  Startup Name: ${data.startupName}
  Problem: ${data.problem}
  Solution: ${data.solution}
  Industry: ${data.industry}
  Target Audience: ${data.targetAudience}
  Unique Selling Proposition: ${data.usp}

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
    return parseGeminiJson(rawText);
  } catch (error) {
    console.error('Gemini MVP Error:', error.response?.data || error.message);
    throw new Error('Failed to generate MVP from Gemini');
  }
};

module.exports = { generateMVP };
