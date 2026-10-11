const express = require('express');
const router = express.Router();
const { generatePitch } = require('../controllers/pitchController');
const { createAiGenerationLimiter } = require('../middleware/rateLimiter');

const pitchLimiter = createAiGenerationLimiter();

router.post('/', pitchLimiter, generatePitch);

module.exports = router;
