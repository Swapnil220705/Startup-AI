// backend/routes/shared.js
const express = require('express');
const router = express.Router();
const { getSharedPlanController } = require('../controllers/planShareController');

// Public shared plan retrieval endpoint (unauthenticated)
router.get('/:token', getSharedPlanController);

module.exports = router;
