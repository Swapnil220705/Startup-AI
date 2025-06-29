const axios = require('axios');
const AI_BASE_URL = process.env.AI_URL || 'http://localhost:5001';

const callAI = async (endpoint, data) => {
  const response = await axios.post(`${AI_BASE_URL}${endpoint}`, data);
  return response.data;
};

module.exports = { callAI };
