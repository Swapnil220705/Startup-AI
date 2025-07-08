// backend/models/revenueModel.js
const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent';

const generateRevenue = async (data) => {
  const prompt = `
  You're an expert startup revenue strategist. Based on the following startup details, generate a clear revenue and monetization model.

  Startup Name: ${data.startupName}
  Problem: ${data.problem}
  Solution: ${data.solution}
  Industry: ${data.industry}
  Target Audience: ${data.targetAudience}
  Unique Selling Proposition: ${data.usp}

  Instructions:
  - Be specific and realistic — avoid generic language.
  - Mention relevant pricing models (e.g., SaaS subscription, one-time fee, freemium).
  - Include realistic revenue assumptions based on the solution and market.

  Return the response strictly in the following JSON format:
  {
    "revenueStreams": "Brief explanation of 1-2 monetization methods based on startup type",
    "pricingStrategy": "Clearly describe the most suitable pricing approach (e.g., tiered pricing, value-based pricing)",
    "expectedMonthlyRevenue": "Realistic projection with a range or factors affecting revenue (e.g., $5K - $10K depending on CAC and conversion)",
    "growthOpportunities": "Short bullet points on how revenue can scale over time"
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
