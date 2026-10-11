const express = require('express');
const router = express.Router();
const { generateRevenue } = require('../controllers/revenueController');
const { createAiGenerationLimiter } = require('../middleware/rateLimiter');

const revenueLimiter = createAiGenerationLimiter();

router.post('/', revenueLimiter, generateRevenue);

module.exports = router;
