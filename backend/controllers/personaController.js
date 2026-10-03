const { generatePersonas } = require('../models/personasModel');
const { sendApiError } = require('../utils/apiError');

const generatePersonasController = async (req, res) => {
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
    const aiResponse = await generatePersonas(inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Persona Error:', error.message);
    sendApiError(res, error, 'Failed to generate personas');
  }
};

module.exports = { generatePersonas: generatePersonasController };
