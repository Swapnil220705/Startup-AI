const { generateMVP } = require('../models/mvpGenerator');

const generateMVPController = async (req, res) => {
  try {
    const inputData = req.body;
    const aiResponse = await generateMVP(inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('MVP Error:', error.message);
    res.status(500).json({ error: 'Failed to generate MVP plan' });
  }
};

module.exports = { generateMVP : generateMVPController };