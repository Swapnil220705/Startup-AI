// backend/controllers/authController.js
const {
  createLocalUser,
  loginLocalUser,
  authenticateWithGoogle,
  createSession,
  destroySession,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  SESSION_COOKIE_NAME
} = require('../services/authService');

/**
 * Controller for email/password registration.
 * POST /api/auth/signup
 */
async function signupController(req, res) {
  try {
    const { email, password, name } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Email and password are required.'
        }
      });
    }

    const user = createLocalUser({ email, password, name });
    const session = createSession(user.id);
    setSessionCookie(res, session.id);

    return res.status(201).json({
      success: true,
      data: {
        user
      }
    });
  } catch (err) {
    if (err.statusCode && err.code) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message
        }
      });
    }

    console.error('Signup error:', err.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: 'An error occurred during account registration.'
      }
    });
  }
}

/**
 * Controller for email/password login.
 * POST /api/auth/login
 */
async function loginController(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.'
        }
      });
    }

    const user = loginLocalUser({ email, password });
    const session = createSession(user.id);
    setSessionCookie(res, session.id);

    return res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (err) {
    if (err.statusCode && err.code) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message
        }
      });
    }

    console.error('Login error:', err.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: 'An error occurred during login.'
      }
    });
  }
}

/**
 * Controller for Google OAuth credential authentication.
 * POST /api/auth/google
 */
async function googleAuthController(req, res) {
  try {
    const { credential } = req.body || {};

    if (!credential || typeof credential !== 'string') {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Google credential is required.'
        }
      });
    }

    // Support optional verifyToken injected via app locals or req options (for automated testing)
    const options = req.authOptions || {};
    const user = await authenticateWithGoogle(credential, options);
    const session = createSession(user.id);
    setSessionCookie(res, session.id);

    return res.status(200).json({
      success: true,
      data: {
        user
      }
    });
  } catch (err) {
    if (err.statusCode && err.code) {
      return res.status(err.statusCode).json({
        success: false,
        error: {
          code: err.code,
          message: err.message
        }
      });
    }

    console.error('Google Auth error:', err.message);
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_FAILED',
        message: 'An error occurred during Google authentication.'
      }
    });
  }
}

/**
 * Controller for user logout.
 * POST /api/auth/logout
 */
async function logoutController(req, res) {
  try {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE_NAME];

    if (token) {
      destroySession(token);
    }

    clearSessionCookie(res);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully.'
      }
    });
  } catch (err) {
    console.error('Logout error:', err.message);
    clearSessionCookie(res);
    return res.status(200).json({
      success: true,
      data: {
        message: 'Logged out successfully.'
      }
    });
  }
}

/**
 * Controller to fetch current authenticated user profile.
 * GET /api/auth/me
 */
async function getCurrentUserController(req, res) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'No active authenticated session.'
      }
    });
  }

  return res.status(200).json({
    success: true,
    data: {
      user: req.user
    }
  });
}

module.exports = {
  signupController,
  loginController,
  googleAuthController,
  logoutController,
  getCurrentUserController
};
