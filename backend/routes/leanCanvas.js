const express = require('express');
const router = express.Router();
const { generateLeanCanvas } = require('../controllers/leanCanvasController');
const { createAiGenerationLimiter } = require('../middleware/rateLimiter');

const leanCanvasLimiter = createAiGenerationLimiter();

router.post('/', leanCanvasLimiter, generateLeanCanvas);

module.exports = router;
