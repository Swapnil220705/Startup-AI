const axios = require('axios');
const { parseGeminiJson } = require('../utils/jsonParser');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent';

const generatePitch = async (data) => {
  const prompt = `
  You are a pitch deck expert helping startups craft powerful elevator pitches that are short, sharp, and investor-friendly.

  Use the following startup details to generate a compelling pitch:

  Startup Name: ${data.startupName}
  Problem: ${data.problem}
  Solution: ${data.solution}
  Industry: ${data.industry}
  Target Audience: ${data.targetAudience}
  Unique Value or USP: ${data.usp || 'Not specified'}

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
    
        const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return parseGeminiJson(rawText);
  } catch (error) {
    console.error('Gemini Pitch Model Error:', error.response?.data || error.message);
    throw new Error('Failed to generate Elevator Pitch from Gemini');
  }
};

module.exports = { generatePitch };
