// backend/models/pitchModel.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

const generatePitch = async (data) => {
  const prompt = `
Create a compelling elevator pitch for the following startup:
Startup Name: ${data.startupName}
Problem: ${data.problem}
Solution: ${data.solution}
Industry: ${data.industry}
Target Audience: ${data.targetAudience}

Return the response in JSON with this structure:
{
  "elevatorPitch": ""
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
    console.error('Gemini Pitch Model Error:', error.response?.data || error.message);
    throw new Error('Failed to generate Elevator Pitch from Gemini');
  }
};

module.exports = { generatePitch };
