const { generateLeanCanvas } = require('../models/leanCanvas');

const generateLeanCanvasController = async (req, res) => {
  try {
    const inputData = req.body;
    const aiResponse = await generateLeanCanvas(inputData);

    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Lean Canvas Error:', error);
    res.status(500).json({ error: 'Failed to generate Lean Canvas' });
  }
};

module.exports = { generateLeanCanvas: generateLeanCanvasController };
