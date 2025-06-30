const { generateRevenue } = require('../models/revenueModel');

const generateRevenueController = async (req, res) => {
  try {
    const inputData = req.body;
    const aiResponse = await generateRevenue('/revenue', inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Revenue Error:', error.message);
    res.status(500).json({ error: 'Failed to generate revenue model' });
  }
};

module.exports = { generateRevenue : generateRevenueController };
