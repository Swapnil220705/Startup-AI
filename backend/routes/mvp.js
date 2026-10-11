const express = require('express');
const router = express.Router();
const { generateMVP } = require('../controllers/mvpController');
const { createAiGenerationLimiter } = require('../middleware/rateLimiter');

const mvpLimiter = createAiGenerationLimiter();

router.post('/', mvpLimiter, generateMVP);

module.exports = router;
