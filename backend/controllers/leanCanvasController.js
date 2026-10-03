const { generateLeanCanvas } = require('../models/leanCanvas');
const { sendApiError } = require('../utils/apiError');

const generateLeanCanvasController = async (req, res) => {
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
    const aiResponse = await generateLeanCanvas(inputData);

    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Lean Canvas Error:', error.message);
    sendApiError(res, error, 'Failed to generate Lean Canvas');
  }
};

module.exports = { generateLeanCanvas: generateLeanCanvasController };
