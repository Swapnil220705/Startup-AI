const { generateRevenue } = require('../models/revenueModel');
const { sendApiError } = require('../utils/apiError');

const generateRevenueController = async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object' || !req.body.startupName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input: startupName is required.'
        }
      });
    }

    const inputData = req.body;
    const aiResponse = await generateRevenue(inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Revenue Error:', error.message);
    sendApiError(res, error, 'Failed to generate revenue model');
  }
};

module.exports = { generateRevenue: generateRevenueController };
