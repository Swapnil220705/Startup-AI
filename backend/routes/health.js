// backend/routes/health.js
const express = require('express');
const router = express.Router();
const { livenessController, readinessController } = require('../controllers/healthController');

// Liveness probe (Node process response)
router.get('/health', livenessController);

// Readiness probe (Database read verification)
router.get('/ready', readinessController);

module.exports = router;
