// backend/routes/brief.js
const express = require('express');
const router = express.Router();
const { draftBriefController } = require('../controllers/briefController');
const { createAiGenerationLimiter } = require('../middleware/rateLimiter');

const briefLimiter = createAiGenerationLimiter();

// Single-call AI Startup Brief generation endpoint
router.post('/draft', briefLimiter, draftBriefController);

module.exports = router;
