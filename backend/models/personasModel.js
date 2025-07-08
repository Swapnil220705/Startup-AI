// backend/models/personasModel.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

const generatePersonas = async (data) => {
  const prompt = `
  You're a UX researcher. Based on the startup details below, generate 2 realistic user personas in pure JSON only. Do NOT include explanations, headings, or markdown formatting.

  Startup Name: ${data.startupName}
  Industry: ${data.industry}
  Solution: ${data.solution}
  Target Audience: ${data.targetAudience}
  Unique Selling Proposition: ${data.usp || 'Not specified'}

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
    console.error('Gemini Personas Model Error:', error.response?.data || error.message);
    throw new Error('Failed to generate user personas from Gemini');
  }
};

module.exports = { generatePersonas };
