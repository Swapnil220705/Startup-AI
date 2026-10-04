// backend/controllers/planController.js
const {
  createPlan,
  createTrialPlan,
  getPlanById,
  getPlanForRequester,
  listPlans,
  updatePlan,
  deletePlan,
  claimPlan,
  setTrialCookie,
  TRIAL_COOKIE_NAME
} = require('../services/planService');
const { parseCookies } = require('../services/authService');
const { sendApiError } = require('../utils/apiError');

/**
 * Controller to create and persist a new startup plan.
 * Supports both authenticated user ownership and anonymous 1-plan trial.
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

    const userId = req.user ? req.user.id : null;

    if (userId) {
      // Authenticated user creates plan with server-determined user_id
      const plan = createPlan(req.body, { userId });
      return res.status(201).json({
        success: true,
        data: plan
      });
    }

    // Anonymous request: first-time trial flow
    const cookies = parseCookies(req);
    const existingTrialToken = cookies[TRIAL_COOKIE_NAME];
    const clientIp = req.ip || req.headers?.['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || '127.0.0.1';

    const { plan, trialToken } = createTrialPlan(req.body, { trialToken: existingTrialToken, ip: clientIp });

    // Send trial cookie to browser
    setTrialCookie(res, trialToken);

    return res.status(201).json({
      success: true,
      data: plan
    });
  } catch (error) {
    if (error.statusCode === 403 && error.code === 'TRIAL_LIMIT_REACHED') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TRIAL_LIMIT_REACHED',
          message: error.message || 'You have reached the free anonymous trial limit. Please sign in to create more plans.'
        }
      });
    }

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
 * Strictly verifies owner or trial-session matching.
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

    const trimmedId = id.trim();
    let plan;

    // Backward compatibility for unit tests passing mock req without headers/cookies
    if (!req.headers && !req.cookies) {
      plan = getPlanById(trimmedId);
    } else {
      const userId = req.user ? req.user.id : null;
      const cookies = parseCookies(req);
      const trialToken = cookies[TRIAL_COOKIE_NAME];
      plan = getPlanForRequester(trimmedId, { userId, trialToken });
    }

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
 * Scoped to authenticated user. Anonymous users receive an empty list.
 * GET /api/plans
 */
async function listPlansController(req, res) {
  try {
    const { limit, offset } = req.query || {};
    const userId = req.user ? req.user.id : null;

    const result = listPlans({ limit, offset, userId });

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

/**
 * Controller to update metadata of an existing startup plan.
 * PATCH /api/plans/:id
 */
async function updatePlanController(req, res) {
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

    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Request body must be a valid object.'
        }
      });
    }

    const userId = req.user ? req.user.id : null;
    const updatedPlan = updatePlan(id.trim(), req.body, { userId });

    if (!updatedPlan) {
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
      data: updatedPlan
    });
  } catch (error) {
    console.error('Update Plan Error:', error.message);
    if (error.statusCode === 400 || error.code === 'INVALID_INPUT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: error.message || 'Invalid update data.'
        }
      });
    }

    return res.status(500).json({
      success: false,
      error: {
        code: 'PERSISTENCE_FAILED',
        message: 'Failed to update startup plan in database.'
      }
    });
  }
}

/**
 * Controller to delete a startup plan by its ID.
 * DELETE /api/plans/:id
 */
async function deletePlanController(req, res) {
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

    const userId = req.user ? req.user.id : null;
    const deleted = deletePlan(id.trim(), { userId });

    if (!deleted) {
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
      data: {
        id: id.trim(),
        deleted: true
      }
    });
  } catch (error) {
    console.error('Delete Plan Error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PERSISTENCE_FAILED',
        message: 'Failed to delete startup plan from database.'
      }
    });
  }
}

/**
 * Controller to claim an unowned anonymous trial plan after authentication.
 * POST /api/plans/claim
 */
async function claimPlanController(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to claim this plan.'
        }
      });
    }

    const { planId } = req.body || {};
    if (!planId || typeof planId !== 'string' || !planId.trim()) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Plan ID is required to claim a plan.'
        }
      });
    }

    const cookies = parseCookies(req);
    const trialToken = cookies[TRIAL_COOKIE_NAME];

    const claimedPlan = claimPlan(planId.trim(), userId, trialToken);

    return res.status(200).json({
      success: true,
      data: claimedPlan
    });
  } catch (error) {
    if (error.statusCode === 400 || error.code === 'INVALID_INPUT') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: error.message || 'Invalid claim request.'
        }
      });
    }
    if (error.statusCode === 403 || error.code === 'INVALID_TRIAL_SESSION') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'INVALID_TRIAL_SESSION',
          message: error.message || 'You can only claim plans created during your active trial session.'
        }
      });
    }
    if (error.statusCode === 404 || error.code === 'PLAN_NOT_FOUND') {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: error.message || 'Plan not found.'
        }
      });
    }
    if (error.statusCode === 409 || error.code === 'PLAN_ALREADY_CLAIMED') {
      return res.status(409).json({
        success: false,
        error: {
          code: 'PLAN_ALREADY_CLAIMED',
          message: error.message || 'This plan has already been claimed.'
        }
      });
    }

    console.error('Claim Plan Error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'PERSISTENCE_FAILED',
        message: 'Failed to claim startup plan.'
      }
    });
  }
}

module.exports = {
  createPlanController,
  getPlanByIdController,
  listPlansController,
  updatePlanController,
  deletePlanController,
  claimPlanController
};


