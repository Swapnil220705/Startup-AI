// backend/models/leanCanvas.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

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
    const response = await axios.post(
      MODEL_URL + `?key=${GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    let rawText = response.data.candidates?.[0]?.content?.parts?.[0]?.text;

    // Remove markdown formatting if present
    rawText = rawText.replace(/```json|```/g, '').trim();

    return JSON.parse(rawText);
  } catch (error) {
    console.error('Gemini Lean Canvas Error:', error.response?.data || error.message);
    throw new Error('Failed to generate Lean Canvas from Gemini');
  }
};

module.exports = { generateLeanCanvas };
