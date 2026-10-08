// backend/controllers/planShareController.js
const {
  createOrGetActiveShare,
  revokeActiveShare,
  getSharedPlanByToken
} = require('../services/planShareService');

/**
 * Controller to create or retrieve the active share for an owned plan.
 * POST /api/plans/:id/share
 * 
 * Requirements:
 * - Requires authenticated user (req.user)
 * - Derives ownership strictly on the server
 * - Returns existing active share if already active (idempotent)
 * - Returns 404 for non-existent or unowned plans
 */
async function createShareController(req, res) {
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

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to share a plan.'
        }
      });
    }

    const result = createOrGetActiveShare(id.trim(), userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found.'
        }
      });
    }

    const statusCode = result.isExisting ? 200 : 201;
    return res.status(statusCode).json({
      success: true,
      data: result.share
    });
  } catch (error) {
    console.error('Create Share Error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SHARE_CREATION_FAILED',
        message: 'Failed to create share link.'
      }
    });
  }
}

/**
 * Controller to revoke the active share for an owned plan.
 * DELETE /api/plans/:id/share
 * 
 * Requirements:
 * - Requires authenticated user (req.user)
 * - Derives ownership strictly on the server
 * - Marks is_active = 0 and revoked_at = now
 * - Returns safe 404 for non-existent or unowned plans
 */
async function revokeShareController(req, res) {
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

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please sign in to manage shares.'
        }
      });
    }

    const result = revokeActiveShare(id.trim(), userId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PLAN_NOT_FOUND',
          message: 'Plan not found.'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        revoked: true,
        message: 'Plan share revoked successfully.'
      }
    });
  } catch (error) {
    console.error('Revoke Share Error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SHARE_REVOCATION_FAILED',
        message: 'Failed to revoke plan share.'
      }
    });
  }
}

/**
 * Controller to retrieve a public shared plan via its bearer token.
 * GET /api/shared/:token
 * 
 * Requirements:
 * - Unauthenticated public endpoint
 * - Returns safe 404 for invalid, nonexistent, or revoked tokens (no existence leaking)
 * - Returns strictly sanitized read-only plan representation
 * - Atomically increments view_count on successful retrieval
 * - Never logs complete raw token or bearer URL
 */
async function getSharedPlanController(req, res) {
  try {
    const { token } = req.params;
    if (!token || typeof token !== 'string' || !token.trim()) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHARE_NOT_FOUND',
          message: 'Shared plan not found or link has expired.'
        }
      });
    }

    const sanitizedPlan = getSharedPlanByToken(token.trim());

    if (!sanitizedPlan) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'SHARE_NOT_FOUND',
          message: 'Shared plan not found or link has expired.'
        }
      });
    }

    return res.status(200).json({
      success: true,
      data: sanitizedPlan
    });
  } catch (error) {
    // Avoid logging raw bearer tokens
    console.error('Get Shared Plan Error:', error.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: 'Failed to retrieve shared plan.'
      }
    });
  }
}

module.exports = {
  createShareController,
  revokeShareController,
  getSharedPlanController
};
