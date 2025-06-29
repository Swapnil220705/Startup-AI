const { callAI } = require('../services/aiService');

const generateCompetitorList = async (req, res) => {
  try {
    const inputData = req.body;
    // const aiResponse = await callAI('/competitors', inputData); // or scraping logic here
    const aiResponse= {
      "competitors": [
        {
          "name": "UrbanClap (now Urban Company)",
          "focus": "General home services including caregiving",
          "strengths": "Large service network, brand recognition",
          "weaknesses": "Not eldercare-specific, limited medical support"
        },
        {
          "name": "Portea Medical",
          "focus": "At-home healthcare services",
          "strengths": "Nursing care, physiotherapy, diagnostics",
          "weaknesses": "Premium pricing, no AI-matching features"
        },
        {
          "name": "Care24",
          "focus": "Home nursing & eldercare",
          "strengths": "Certified caregivers, medical tie-ups",
          "weaknesses": "Limited to metro cities"
        }
      ],
      "positioning": "CareConnect focuses only on eldercare with smart AI-based caregiver matching and regional language support — a first of its kind in India."
    }

    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Competitor Error:', error.message);
    res.status(500).json({ error: 'Failed to generate competitors list' });
  }
};

module.exports = { generateCompetitorList };
