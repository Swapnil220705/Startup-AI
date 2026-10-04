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

// Public authentication endpoints
router.post('/signup', signupController);
router.post('/login', loginController);
router.post('/google', googleAuthController);
router.post('/logout', logoutController);

// Session inspection endpoint
router.get('/me', authenticateUser, getCurrentUserController);

module.exports = router;
