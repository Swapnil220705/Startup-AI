// backend/routes/plans.js
const express = require('express');
const router = express.Router();
const {
  createPlanController,
  getPlanByIdController,
  listPlansController,
  updatePlanController,
  deletePlanController,
  claimPlanController
} = require('../controllers/planController');
const { requireAuth } = require('../middleware/auth');

// Plan Persistence & Multi-User Ownership Routes
router.post('/', createPlanController);
router.get('/', listPlansController);
router.post('/claim', requireAuth, claimPlanController);
router.get('/:id', getPlanByIdController);
router.patch('/:id', requireAuth, updatePlanController);
router.delete('/:id', requireAuth, deletePlanController);

module.exports = router;


