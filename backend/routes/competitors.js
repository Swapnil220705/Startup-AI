const express = require('express');
const router = express.Router();
const { generateCompetitors } = require('../controllers/competitorController');
const { createAiGenerationLimiter } = require('../middleware/rateLimiter');

const competitorLimiter = createAiGenerationLimiter();

router.post('/', competitorLimiter, generateCompetitors);

module.exports = router;
