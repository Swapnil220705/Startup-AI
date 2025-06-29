const { callAI } = require('../services/aiService');

const generateMVP = async (req, res) => {
  try {
    const inputData = req.body;
    // const aiResponse = await callAI('/mvp', inputData);
    const aiResponse = {
      "coreModules": [
        "User Login/Signup with mobile/email",
        "Browse certified caregivers by location & skills",
        "Real-time booking and payment flow",
        "Caregiver profile + ratings",
        "Chat system between user and caregiver",
        "Feedback system after service"
      ],
      "techStack": {
        "Frontend": "React.js",
        "Backend": "Node.js with Express",
        "Database": "MongoDB",
        "AI Integration": "OpenAI GPT-4 API",
        "Optional": "Flutter app or PWA"
      },
      "launchPlan": [
        "Week 1: Finalize UI and APIs",
        "Week 2: Integrate AI & MVP flows",
        "Week 3: Testing & bug fixes",
        "Week 4: Launch to small pilot group"
      ]
    };
    res.status(200).json(aiResponse);
  } catch (error) {
    console.error('MVP Error:', error.message);
    res.status(500).json({ error: 'Failed to generate MVP plan' });
  }
};

module.exports = { generateMVP };
