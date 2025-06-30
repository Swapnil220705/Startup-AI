const { generatePitch } = require('../models/pitchModel');

const generatePitchDeck = async (req, res) => {
  try {
    const inputData = req.body;
    const aiResponse = await generatePitch('/pitch', inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Pitch Deck Error:', error.message);
    res.status(500).json({ error: 'Failed to generate pitch deck' });
  }
};

module.exports = { generatePitch : generatePitchDeck };
