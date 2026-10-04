// backend/controllers/planController.js
const { createPlan, getPlanById, listPlans } = require('../services/planService');
const { sendApiError } = require('../utils/apiError');

/**
 * Controller to create and persist a new startup plan.
 * POST /api/plans
 */
async function createPlanController(req, res) {
  try {
    if (!req.body || typeof req.body !== 'object' || !req.body.startupName || typeof req.body.startupName !== 'string' || !req.body.startupName.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input: startupName is required.'
        }
      });
    }

    const plan = createPlan(req.body);

    return res.status(201).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Plan Creation Error:', error.message);
    if (error.statusCode === 400 || error.code === 'INVALID_INPUT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: error.message || 'Invalid plan data.'
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'PERSISTENCE_FAILED',
        message: 'Failed to persist startup plan in database.'
      }
    });
  }
}

/**
 * Controller to retrieve a startup plan by its ID.
 * GET /api/plans/:id
 */
async function getPlanByIdController(req, res) {
  try {
    const { id } = req.params;

    if (!id || typeof id !== 'string' || !id.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Plan ID is required.'
        }
      });
    }

    const plan = getPlanById(id.trim());

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: `Plan not found with id: ${id}`
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Get Plan Error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PERSISTENCE_FAILED',
        message: 'Failed to retrieve startup plan from database.'
      }
    });
  }
}

/**
 * Controller to list startup plans with pagination.
 * GET /api/plans
 */
async function listPlansController(req, res) {
  try {
    const { limit, offset } = req.query;

    const result = listPlans({ limit, offset });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('List Plans Error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PERSISTENCE_FAILED',
        message: 'Failed to list startup plans from database.'
      }
    });
  }
}

module.exports = {
  createPlanController,
  getPlanByIdController,
  listPlansController
};
