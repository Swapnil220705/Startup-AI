// backend/routes/shared.js
const express = require('express');
const router = express.Router();
const { getSharedPlanController } = require('../controllers/planShareController');
const { sharedPlanLimiter } = require('../middleware/rateLimiter');

// Public shared plan retrieval endpoint (unauthenticated, rate-limited)
router.get('/:token', sharedPlanLimiter, getSharedPlanController);

module.exports = router;
