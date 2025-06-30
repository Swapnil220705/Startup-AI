const { generatePersonas } = require('../models/personasModel');

const generatePersonasController = async (req, res) => {
  try {
    const inputData = req.body;
    const aiResponse = await generatePersonas('/personas', inputData);
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Persona Error:', error.message);
    res.status(500).json({ error: 'Failed to generate personas' });
  }
};

module.exports = { generatePersonas : generatePersonasController };
