const express = require('express');
const router = express.Router();
const { generatePersonas } = require('../controllers/personaController');
const { createAiGenerationLimiter } = require('../middleware/rateLimiter');

const personaLimiter = createAiGenerationLimiter();

router.post('/', personaLimiter, generatePersonas);

module.exports = router;
