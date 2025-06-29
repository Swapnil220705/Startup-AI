const { callAI } = require('../services/aiService');

const generatePitchDeck = async (req, res) => {
  try {
    const inputData = req.body;
    // const aiResponse = await callAI('/pitch', inputData);
    const aiResponse = {
      "slides": [
        {
          "title": "Startup Name & Tagline",
          "content": "CareConnect — Trusted eldercare on demand"
        },
        {
          "title": "Problem",
          "content": "Millions of families struggle to find certified caregivers for their elderly."
        },
        {
          "title": "Solution",
          "content": "An AI-powered platform that instantly connects families with verified caregivers."
        },
        {
          "title": "Market Opportunity",
          "content": "India’s eldercare market is projected to reach $20B by 2027."
        },
        {
          "title": "Business Model",
          "content": "Commission on bookings + premium subscriptions + institutional partnerships."
        },
        {
          "title": "MVP Features",
          "content": "Caregiver discovery, profile reviews, booking, payment, feedback."
        },
        {
          "title": "Competitive Advantage",
          "content": "First-mover in verified caregiver-only platform + AI-driven matching."
        },
        {
          "title": "Team",
          "content": "Founders with backgrounds in healthcare, AI, and tech startups."
        },
        {
          "title": "Vision",
          "content": "Become India’s #1 eldercare platform and expand across Asia by 2030."
        }
      ]
    };
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Pitch Deck Error:', error.message);
    res.status(500).json({ error: 'Failed to generate pitch deck' });
  }
};

module.exports = { generatePitchDeck };
