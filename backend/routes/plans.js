// backend/routes/plans.js
const express = require('express');
const router = express.Router();
const {
  createPlanController,
  getPlanByIdController,
  listPlansController,
  updatePlanController,
  deletePlanController
} = require('../controllers/planController');

// Persistence Foundation Routes
router.post('/', createPlanController);
router.get('/', listPlansController);
router.get('/:id', getPlanByIdController);
router.patch('/:id', updatePlanController);
router.delete('/:id', deletePlanController);

module.exports = router;

