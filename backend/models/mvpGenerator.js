// backend/models/mvpGenerator.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

const generateMVP = async (data) => {
  const prompt = `
Based on the following startup details, generate a Minimum Viable Product (MVP) feature list:

Startup Name: ${data.startupName}
Problem: ${data.problem}
Solution: ${data.solution}
Target Audience: ${data.targetAudience}

Return only valid JSON with these keys and nothing else (no explanation, no markdown):
{
  "startupName": "",
  "coreFeatures": [],
  "technicalRequirements": "",
  "launchTimeline": ""
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
