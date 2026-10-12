// index.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { initDatabase } = require('./db/database');

console.log("Gemini Key:", process.env.GEMINI_API_KEY ? "Loaded ✅" : "Missing ❌");

// Initialize database and apply pending migrations
try {
  initDatabase();
  console.log("Database: Connected & Migrated ✅");
} catch (dbErr) {
  console.error("Database initialization failed ❌:", dbErr.message);
  process.exit(1);
}

const app = express();

// Proxy configuration: Do not blindly enable trust proxy.
// Untrusted forwarded headers can undermine IP-based rate limiting.
// Enable only when explicitly configured for a trusted reverse proxy environment.
if (process.env.TRUST_PROXY) {
  const tp = process.env.TRUST_PROXY;
  if (tp === 'true') {
    app.set('trust proxy', true);
  } else if (tp === 'false') {
    app.set('trust proxy', false);
  } else if (!isNaN(tp)) {
    app.set('trust proxy', parseInt(tp, 10));
  } else {
    app.set('trust proxy', tp);
  }
}

// HTTP security headers (Helmet configured for API backend)
const { securityHeaders } = require('./middleware/securityHeaders');
app.use(securityHeaders);

const configuredOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:3000';

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (tools, curl, server-to-server tests)
    if (!origin) return callback(null, true);

    if (origin === configuredOrigin) return callback(null, true);

    // In development/test, allow any localhost port
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost:\d+$/.test(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json());

// Health and readiness probes (lightweight, unauthenticated)
const healthRoutes = require('./routes/health');
app.use(healthRoutes);
app.use('/api', healthRoutes);

const { authenticateUser } = require('./middleware/auth');
app.use(authenticateUser);

// Routes
const leanCanvasRoutes = require('./routes/leanCanvas');
const mvpRoutes = require('./routes/mvp');
const revenueRoutes = require('./routes/revenue');
const pitchRoutes = require('./routes/pitch');
const personaRoutes = require('./routes/personas');
const competitorRoutes = require('./routes/competitors');
const planRoutes = require('./routes/plans');
const authRoutes = require('./routes/auth');
const sharedRoutes = require('./routes/shared');
const briefRoutes = require('./routes/brief');

app.use('/api/lean-canvas', leanCanvasRoutes);
app.use('/api/mvp', mvpRoutes);
app.use('/api/revenue', revenueRoutes);
app.use('/api/pitch', pitchRoutes);
app.use('/api/personas', personaRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/brief', briefRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/shared', sharedRoutes);

const { registerShutdownHandlers } = require('./utils/shutdown');

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
  });
  registerShutdownHandlers(server);
}

module.exports = app;

