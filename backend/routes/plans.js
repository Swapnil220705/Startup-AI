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
const {
  createShareController,
  revokeShareController
} = require('../controllers/planShareController');
const { requireAuth } = require('../middleware/auth');

// Plan Persistence & Multi-User Ownership Routes
router.post('/', createPlanController);
router.get('/', listPlansController);
router.post('/claim', requireAuth, claimPlanController);
router.get('/:id', getPlanByIdController);
router.patch('/:id', requireAuth, updatePlanController);
router.delete('/:id', requireAuth, deletePlanController);

// Plan Share Management Routes (Authenticated Owner Only)
router.post('/:id/share', requireAuth, createShareController);
router.delete('/:id/share', requireAuth, revokeShareController);

module.exports = router;


