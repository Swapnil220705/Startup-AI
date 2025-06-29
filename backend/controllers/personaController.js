const { callAI } = require('../services/aiService');

const generatePersonas = async (req, res) => {
  try {
    const inputData = req.body;
    // const aiResponse = await callAI('/personas', inputData);
    const aiResponse ={
      "personas": [
        {
          "name": "Rajesh",
          "age": 42,
          "profession": "Software Engineer",
          "location": "Bangalore",
          "painPoints": [
            "Busy schedule, can't accompany parents to hospital",
            "Worried about safety and reliability of local caregivers"
          ],
          "goals": [
            "Wants a trusted and certified caregiver",
            "Needs flexible booking options"
          ]
        },
        {
          "name": "Meena",
          "age": 38,
          "profession": "Doctor",
          "location": "Delhi",
          "painPoints": [
            "Works long shifts",
            "Needs part-time elderly care for her parents"
          ],
          "goals": [
            "Verified caregivers who can assist with basic health checkups"
          ]
        }
      ]
    }

    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('Persona Error:', error.message);
    res.status(500).json({ error: 'Failed to generate personas' });
  }
};

module.exports = { generatePersonas };
