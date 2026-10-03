// backend/utils/apiError.js

/**
 * Standardized API error handler for generation controllers.
 * 
 * Guarantees a consistent JSON error response shape:
 * {
 *   "success": false,
 *   "error": {
 *     "code": "GENERATION_FAILED" | "INVALID_INPUT" | "RATE_LIMIT_EXCEEDED" | "UPSTREAM_UNAVAILABLE",
 *     "message": "Human-readable safe message"
 *   }
 * }
 * 
 * Safety guarantees:
 * - Never returns API keys or Authorization headers
 * - Never returns raw model prompts or internal stack traces
 * - Preserves upstream HTTP status codes (400, 429, 503) where appropriate
 * 
 * @param {object} res - Express response object
 * @param {Error} error - Caught error from model or execution
 * @param {string} defaultMessage - Safe fallback message for the client
 */
function sendApiError(res, error, defaultMessage = 'Generation failed') {
  const upstreamStatus = error?.status || error?.statusCode || error?.response?.status;
  const errorCodeProperty = error?.code;

  let statusCode = 500;
  let code = 'GENERATION_FAILED';

  if (upstreamStatus === 400) {
    statusCode = 400;
    code = 'INVALID_INPUT';
  } else if (upstreamStatus === 429) {
    statusCode = 429;
    code = 'RATE_LIMIT_EXCEEDED';
  } else if (
    upstreamStatus === 503 ||
    upstreamStatus === 502 ||
    upstreamStatus === 504 ||
    errorCodeProperty === 'ETIMEDOUT' ||
    errorCodeProperty === 'ECONNRESET' ||
    errorCodeProperty === 'ECONNABORTED'
  ) {
    statusCode = 503;
    code = 'UPSTREAM_UNAVAILABLE';
  }

  // Construct a safe, clean message without exposing internal details
  let message = defaultMessage;
  if (code === 'RATE_LIMIT_EXCEEDED') {
    message = `${defaultMessage}: AI service quota or rate limit exceeded. Please wait a moment and try again.`;
  } else if (code === 'UPSTREAM_UNAVAILABLE') {
    message = `${defaultMessage}: AI service is temporarily unavailable or timed out after retries.`;
  } else if (code === 'INVALID_INPUT') {
    message = error?.message || `${defaultMessage}: Invalid request parameters.`;
  }

  // Ensure secrets/keys never leak into the response
  if (typeof message === 'string' && process.env.GEMINI_API_KEY && message.includes(process.env.GEMINI_API_KEY)) {
    message = defaultMessage;
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message
    }
  });
}

module.exports = { sendApiError };
