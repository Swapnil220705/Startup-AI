const { generatePitch } = require('../models/pitchModel');
const { sendApiError } = require('../utils/apiError');

const generatePitchDeck = async (req, res) => {
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
    const aiResponse = await generatePitch(inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Pitch Deck Error:', error.message);
    sendApiError(res, error, 'Failed to generate pitch deck');
  }
};

module.exports = { generatePitch: generatePitchDeck };
