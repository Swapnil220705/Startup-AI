const { generateCompetitors } = require('../models/competitorsModel');

const generateCompetitorList = async (req, res) => {
  try {
    const inputData = req.body;
    const aiResponse = await generateCompetitors('/competitors', inputData); // or scraping logic here
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Competitor Error:', error.message);
    res.status(500).json({ error: 'Failed to generate competitors list' });
  }
};

module.exports = { generateCompetitors : generateCompetitorList };
