const axios = require('axios');
require('dotenv').config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function listModels() {
  try {
    const res = await axios.get(
      `https://generativelanguage.googleapis.com/v1/models?key=${GEMINI_API_KEY}`
    );
    console.log('✅ Available Models:\n');
    res.data.models.forEach((model) => {
      console.log(`• ${model.name}`);
    });
  } catch (err) {
    console.error('❌ Error listing models:', err.response?.data || err.message);
  }
}

listModels();
