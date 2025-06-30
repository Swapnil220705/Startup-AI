// backend/models/competitorsModel.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent';

const generateCompetitors = async (data) => {
  const prompt = `
Identify 3 potential competitors for the following startup:
Startup Name: ${data.startupName}
Industry: ${data.industry}
Solution: ${data.solution}
Target Audience: ${data.targetAudience}

Return the response in JSON with this structure:
{
  "competitors": [
    {
      "name": "",
      "description": "",
      "differentiator": ""
    },
    {
      "name": "",
      "description": "",
      "differentiator": ""
    },
    {
      "name": "",
      "description": "",
      "differentiator": ""
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
