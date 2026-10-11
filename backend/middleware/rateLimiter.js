// backend/middleware/rateLimiter.js
const { rateLimit } = require('express-rate-limit');

/**
 * Generates a standardized error response handler conforming to the Startup-AI error schema:
 * HTTP 429
 * {
 *   "success": false,
 *   "error": {
 *     "code": "RATE_LIMIT_EXCEEDED",
 *     "message": "..."
 *   }
 * }
 *
 * Guarantees:
 * - Uniform error shape matching backend/utils/apiError.js.
 * - Zero credentials, tokens, or stack traces logged or returned.
 *
 * @param {string} defaultMessage
 * @param {string} [code='RATE_LIMIT_EXCEEDED']
 * @returns {Function} Express rate-limit handler
 */
function createRateLimitHandler(defaultMessage, code = 'RATE_LIMIT_EXCEEDED') {
  return (req, res, next, options) => {
    res.status(options.statusCode || 429).json({
      success: false,
      error: {
        code,
        message: options.message || defaultMessage
      }
    });
  };
}

/**
 * Baseline configuration for express-rate-limit across the application.
 */
const BASE_LIMITER_OPTIONS = {
  standardHeaders: true, // Sends Draft-6/Draft-7 RateLimit-* headers
  legacyHeaders: false,   // Disables obsolete X-RateLimit-* headers
  validate: {
    xForwardedForHeader: false, // Suppresses false warnings when trust proxy is intentionally disabled
  },
  skip: () => {
    return process.env.DISABLE_RATE_LIMIT === 'true';
  }
};

/**
 * Factory for Authentication Rate Limiter.
 * Targets: /api/auth/login, /api/auth/signup, /api/auth/google
 * Policy: 10 requests per 15 minutes per client IP.
 *
 * @param {object} [overrides]
 * @returns {Function} Express rate-limit middleware
 */
function createAuthLimiter(overrides = {}) {
  const windowMs = overrides.windowMs !== undefined
    ? overrides.windowMs
    : (process.env.AUTH_RATE_LIMIT_WINDOW_MS ? parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10) : 15 * 60 * 1000);

  const limit = overrides.limit !== undefined
    ? overrides.limit
    : (process.env.AUTH_RATE_LIMIT_MAX ? parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) : 10);

  const message = overrides.message || 'Too many authentication attempts. Please try again later.';

  return rateLimit({
    ...BASE_LIMITER_OPTIONS,
    windowMs,
    limit,
    message,
    handler: createRateLimitHandler(message),
    ...overrides
  });
}

/**
 * Factory for AI Generation Rate Limiter.
 * Targets: /api/lean-canvas, /api/mvp, /api/revenue, /api/pitch, /api/personas, /api/competitors
 * Policy: 5 requests per 10 minutes per client IP per endpoint.
 *
 * @param {object} [overrides]
 * @returns {Function} Express rate-limit middleware
 */
function createAiGenerationLimiter(overrides = {}) {
  const windowMs = overrides.windowMs !== undefined
    ? overrides.windowMs
    : (process.env.AI_RATE_LIMIT_WINDOW_MS ? parseInt(process.env.AI_RATE_LIMIT_WINDOW_MS, 10) : 10 * 60 * 1000);

  const limit = overrides.limit !== undefined
    ? overrides.limit
    : (process.env.AI_RATE_LIMIT_MAX ? parseInt(process.env.AI_RATE_LIMIT_MAX, 10) : 5);

  const message = overrides.message || 'Too many AI generation requests. Please wait a few minutes before trying again.';

  return rateLimit({
    ...BASE_LIMITER_OPTIONS,
    windowMs,
    limit,
    message,
    handler: createRateLimitHandler(message),
    ...overrides
  });
}

/**
 * Factory for Public Shared Link Rate Limiter.
 * Targets: GET /api/shared/:token
 * Policy: 60 requests per 1 minute per client IP.
 *
 * @param {object} [overrides]
 * @returns {Function} Express rate-limit middleware
 */
function createSharedPlanLimiter(overrides = {}) {
  const windowMs = overrides.windowMs !== undefined
    ? overrides.windowMs
    : (process.env.SHARED_PLAN_RATE_LIMIT_WINDOW_MS ? parseInt(process.env.SHARED_PLAN_RATE_LIMIT_WINDOW_MS, 10) : 60 * 1000);

  const limit = overrides.limit !== undefined
    ? overrides.limit
    : (process.env.SHARED_PLAN_RATE_LIMIT_MAX ? parseInt(process.env.SHARED_PLAN_RATE_LIMIT_MAX, 10) : 60);

  const message = overrides.message || 'Too many requests for shared plans. Please try again shortly.';

  return rateLimit({
    ...BASE_LIMITER_OPTIONS,
    windowMs,
    limit,
    message,
    handler: createRateLimitHandler(message),
    ...overrides
  });
}

const authLimiter = createAuthLimiter();
const sharedPlanLimiter = createSharedPlanLimiter();

module.exports = {
  createAuthLimiter,
  createAiGenerationLimiter,
  createSharedPlanLimiter,
  createRateLimitHandler,
  authLimiter,
  sharedPlanLimiter
};
