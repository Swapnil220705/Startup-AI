// backend/controllers/briefController.js
const { generateDraftBrief } = require('../models/briefModel');
const { checkTrialStatus, TRIAL_COOKIE_NAME } = require('../services/planService');
const { parseCookies } = require('../services/authService');
const { sendApiError } = require('../utils/apiError');

/**
 * Controller to generate an AI-drafted Startup Brief via single Gemini call.
 * POST /api/brief/draft
 *
 * Enforces:
 * - Basic input validation (startupName required)
 * - Trial quota protection for anonymous visitors
 * - Safe error mapping without secret leakage
 */
async function draftBriefController(req, res) {
  try {
    const startupName = (req.body?.startupName || req.body?.name || '').trim();
    if (!req.body || typeof req.body !== 'object' || !startupName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input: startupName is required.'
        }
      });
    }

    // Trial check for anonymous users: ensure free trial has not already been exhausted
    if (!req.user) {
      const cookies = parseCookies(req);
      const trialToken = cookies[TRIAL_COOKIE_NAME];
      const trialStatus = checkTrialStatus(trialToken, null);

      if (trialStatus && (trialStatus.trialExhausted || !trialStatus.allowed)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'TRIAL_LIMIT_REACHED',
            message: 'You have reached the free anonymous trial limit. Please sign in or create an account to draft and generate more plans.'
          }
        });
      }
    }

    const draftBrief = await generateDraftBrief(req.body);

    return res.status(200).json({
      success: true,
      data: draftBrief
    });
  } catch (error) {
    console.error('Draft Brief Error:', error.message);
    sendApiError(res, error, 'Failed to draft Startup Brief');
  }
}

module.exports = {
  draftBriefController
};
