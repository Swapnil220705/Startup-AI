// backend/routes/plans.js
const express = require('express');
const router = express.Router();
const {
  createPlanController,
  getPlanByIdController,
  listPlansController
} = require('../controllers/planController');

// Persistence Foundation Routes
router.post('/', createPlanController);
router.get('/', listPlansController);
router.get('/:id', getPlanByIdController);

module.exports = router;
