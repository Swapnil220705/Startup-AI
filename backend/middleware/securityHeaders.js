// backend/middleware/securityHeaders.js
const helmet = require('helmet');

/**
 * Creates production-ready HTTP security headers configured for the Express API backend.
 *
 * Design & Security Guarantees:
 * - Content-Security-Policy (CSP): Disabled on the backend API (contentSecurityPolicy: false).
 *   The backend serves JSON REST endpoints, not frontend HTML documents. Frontend CSP
 *   must be configured by the static hosting provider (e.g., Netlify _headers or Nginx).
 *   Disabling CSP here avoids header bloat, cache invalidation issues, and false restrictions.
 * - Cross-Origin-Resource-Policy (CORP): Configured as 'cross-origin' so browsers do not
 *   block cross-origin API responses when fetched by the separate React SPA frontend.
 * - Cross-Origin-Opener-Policy (COOP): Set to 'same-origin-allow-popups' to avoid interfering
 *   with OAuth popup dialogs (e.g., Google Sign-In) on the client.
 * - HTTP Strict Transport Security (HSTS): Enabled only when HTTPS is guaranteed
 *   (via process.env.ENABLE_HSTS === 'true' or in production when process.env.HTTPS === 'true').
 *   Disabled by default in local/test environments to prevent caching HSTS on localhost.
 * - Standard headers applied:
 *   - X-Content-Type-Options: nosniff
 *   - X-Frame-Options: SAMEORIGIN
 *   - X-Download-Options: noopen
 *   - X-Permitted-Cross-Domain-Policies: none
 *   - X-DNS-Prefetch-Control: off
 *
 * @param {object} [options]
 * @returns {Function} Express middleware
 */
function createSecurityHeadersMiddleware(options = {}) {
  const isProd = process.env.NODE_ENV === 'production';
  const enableHsts = options.enableHsts !== undefined
    ? options.enableHsts
    : (process.env.ENABLE_HSTS === 'true' || (isProd && process.env.HTTPS === 'true'));

  return helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    hsts: enableHsts ? {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: false
    } : false,
    ...options
  });
}

const defaultSecurityHeaders = createSecurityHeadersMiddleware();

module.exports = {
  createSecurityHeadersMiddleware,
  securityHeaders: defaultSecurityHeaders
};
