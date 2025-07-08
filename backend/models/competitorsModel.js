// backend/models/competitorsModel.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

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
    console.error('Gemini Competitors Model Error:', error.response?.data || error.message);
    throw new Error('Failed to generate competitors from Gemini');
  }
};

module.exports = { generateCompetitors };
