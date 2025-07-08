// backend/models/mvpGenerator.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

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
    const response = await axios.post(
      MODEL_URL + `?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }]
      },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    let rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Remove markdown formatting if present
    rawText = rawText.replace(/```json|```/g, '').trim();

    return JSON.parse(rawText);
  } catch (error) {
    console.error('Gemini MVP Error:', error.response?.data || error.message);
    throw new Error('Failed to generate MVP from Gemini');
  }
};

module.exports = { generateMVP };
