// backend/models/revenueModel.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

const generateRevenue = async (data) => {
  const prompt = `
Generate a revenue model for a startup with the following details:
Startup Name: ${data.startupName}
Industry: ${data.industry}
Solution Description: ${data.solution}

Return the response in JSON with these keys:
{
  "revenueStreams": "",
  "pricingStrategy": "",
  "expectedMonthlyRevenue": "",
  "growthOpportunities": ""
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
    console.error('Gemini Revenue Model Error:', error.response?.data || error.message);
    throw new Error('Failed to generate Revenue Model from Gemini');
  }
};

module.exports = { generateRevenue };
