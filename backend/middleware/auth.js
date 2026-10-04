// backend/middleware/auth.js
const { getSessionAndUser, parseCookies, SESSION_COOKIE_NAME } = require('../services/authService');

/**
 * Optional authentication middleware.
 * Inspects incoming request cookies for a valid session token.
 * If valid, attaches `req.user` and `req.session`.
 * If missing, invalid, or expired, safely sets `req.user = null` and `req.session = null`.
 * Always calls next() without blocking unauthenticated requests.
 */
function authenticateUser(req, res, next) {
  try {
    const cookies = parseCookies(req);
    const sessionToken = cookies[SESSION_COOKIE_NAME];

    if (!sessionToken) {
      req.user = null;
      req.session = null;
      return next();
    }

    const sessionData = getSessionAndUser(sessionToken);

    if (!sessionData) {
      req.user = null;
      req.session = null;
      return next();
    }

    req.user = sessionData.user;
    req.session = sessionData.session;
    return next();
  } catch (err) {
    console.error('Error in authenticateUser middleware:', err.message);
    req.user = null;
    req.session = null;
    return next();
  }
}

/**
 * Strict authentication guard middleware.
 * Requires `req.user` to be populated by `authenticateUser`.
 * If unauthenticated, halts with structured HTTP 401 UNAUTHORIZED response.
 */
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required. Please sign in to access this resource.'
      }
    });
  }
  return next();
}

module.exports = {
  authenticateUser,
  requireAuth
};
