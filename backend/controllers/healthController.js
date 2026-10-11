// backend/controllers/healthController.js
const { getDatabase } = require('../db/database');
const { isShuttingDown } = require('../utils/shutdown');

/**
 * Lightweight liveness probe endpoint.
 * GET /health (and /api/health)
 * 
 * Verifies that the Node.js event loop and Express process are responsive.
 * Does not query databases, external APIs, or allocate heavy resources.
 */
function livenessController(req, res) {
  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.round(process.uptime() * 100) / 100
  });
}

/**
 * Database readiness probe endpoint.
 * GET /ready (and /api/ready)
 * 
 * Verifies that the backend is prepared to accept user traffic and execute SQL queries.
 * Returns 200 OK when database is connected and responsive.
 * Returns 503 Service Unavailable if the process is shutting down or the database is unavailable.
 * Never exposes database paths, connection details, stack traces, or secrets.
 */
function readinessController(req, res, dbOverride = null) {
  // If server is draining in-flight requests, report not ready so load balancers stop sending new traffic
  if (isShuttingDown()) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      database: 'shutting_down'
    });
  }

  try {
    // If Express passes 'next' function as 3rd arg, treat as null override
    const db = (dbOverride && typeof dbOverride !== 'function') ? dbOverride : getDatabase();

    if (!db || !db.open) {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      });
    }

    const check = db.prepare('SELECT 1 AS healthy').get();
    if (!check || check.healthy !== 1) {
      return res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        database: 'unhealthy'
      });
    }

    return res.status(200).json({
      status: 'ready',
      timestamp: new Date().toISOString(),
      database: 'connected'
    });
  } catch (err) {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      database: 'disconnected'
    });
  }
}

module.exports = {
  livenessController,
  readinessController
};
