// backend/routes/auth.js
const express = require('express');
const router = express.Router();
const {
  signupController,
  loginController,
  googleAuthController,
  logoutController,
  getCurrentUserController
} = require('../controllers/authController');
const { authenticateUser } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

// Public authentication endpoints (protected by authLimiter: 10 req/15min per IP)
router.post('/signup', authLimiter, signupController);
router.post('/login', authLimiter, loginController);
router.post('/google', authLimiter, googleAuthController);
router.post('/logout', logoutController);

// Session inspection endpoint
router.get('/me', authenticateUser, getCurrentUserController);

module.exports = router;
