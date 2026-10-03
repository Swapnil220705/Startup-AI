const { generateMVP } = require('../models/mvpGenerator');
const { sendApiError } = require('../utils/apiError');

const generateMVPController = async (req, res) => {
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
    const aiResponse = await generateMVP(inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('MVP Error:', error.message);
    sendApiError(res, error, 'Failed to generate MVP plan');
  }
};

module.exports = { generateMVP: generateMVPController };