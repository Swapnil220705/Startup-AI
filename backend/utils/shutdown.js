// backend/utils/shutdown.js
const { closeDatabase } = require('../db/database');

let shuttingDown = false;

/**
 * Returns true if the application has initiated a shutdown sequence.
 * 
 * @returns {boolean}
 */
function isShuttingDown() {
  return shuttingDown;
}

/**
 * Sets the current shutdown state.
 * Useful for testing and manual state transitions.
 * 
 * @param {boolean} val
 */
function setShuttingDown(val) {
  shuttingDown = Boolean(val);
}

/**
 * Orchestrates a graceful shutdown of the HTTP server and database connections.
 * 
 * Flow:
 * 1. Checks if a shutdown is already in progress (deduplicates repeated signals).
 * 2. Marks process as shutting down so readiness probes immediately return 503.
 * 3. Starts a bounded force-termination timer (default: 10s) to guard against hung requests.
 * 4. Instructs HTTP server to stop accepting new connections and finish in-flight requests.
 * 5. Once active requests have drained, cleanly closes the SQLite database connection.
 * 6. Terminates the process with exit code 0 (or 1 if server closure failed).
 * 
 * @param {import('http').Server|null} server - Running HTTP server instance
 * @param {object} [options]
 * @param {string} [options.signal='SIGTERM'] - Triggering signal name
 * @param {number} [options.timeoutMs=10000] - Force termination timeout in milliseconds
 * @param {Function} [options.exitFn=process.exit] - Process exit function (injectable for testing)
 * @param {Function} [options.closeDbFn=closeDatabase] - Database close function (injectable for testing)
 * @param {object} [options.logger=console] - Logger object
 * @returns {Promise<void>}
 */
function handleGracefulShutdown(server, options = {}) {
  const {
    signal = 'SIGTERM',
    timeoutMs = 10000,
    exitFn = process.exit,
    closeDbFn = closeDatabase,
    logger = console
  } = options;

  if (shuttingDown) {
    logger.log(`[Shutdown] Shutdown sequence already in progress. Ignoring repeated ${signal}.`);
    return Promise.resolve();
  }

  shuttingDown = true;
  logger.log(`[Shutdown] Received ${signal}. Starting graceful shutdown...`);

  return new Promise((resolve) => {
    let forceTimer = null;

    if (timeoutMs > 0 && typeof setTimeout === 'function') {
      forceTimer = setTimeout(() => {
        logger.error('[Shutdown] Graceful shutdown grace period expired. Forcing process exit.');
        exitFn(1);
        resolve();
      }, timeoutMs);

      if (forceTimer.unref) {
        forceTimer.unref();
      }
    }

    const finalizeDatabaseAndExit = (serverErr = null) => {
      try {
        closeDbFn();
        logger.log('[Shutdown] Database connection closed cleanly.');
      } catch (dbErr) {
        logger.error('[Shutdown] Error closing database during shutdown:', dbErr.message);
      }

      if (forceTimer) {
        clearTimeout(forceTimer);
      }

      const exitCode = serverErr ? 1 : 0;
      exitFn(exitCode);
      resolve();
    };

    if (!server || typeof server.close !== 'function') {
      finalizeDatabaseAndExit(null);
      return;
    }

    // Stop accepting new HTTP connections; drain active requests
    server.close((serverErr) => {
      if (serverErr) {
        logger.error('[Shutdown] Error closing HTTP server:', serverErr.message);
      } else {
        logger.log('[Shutdown] HTTP server closed cleanly. In-flight requests drained.');
      }

      finalizeDatabaseAndExit(serverErr);
    });
  });
}

/**
 * Registers SIGTERM and SIGINT listeners on process for graceful shutdown.
 * 
 * @param {import('http').Server} server - Running HTTP server instance
 * @param {object} [options]
 * @returns {{ onSigTerm: Function, onSigInt: Function }}
 */
function registerShutdownHandlers(server, options = {}) {
  const onSigTerm = () => handleGracefulShutdown(server, { ...options, signal: 'SIGTERM' });
  const onSigInt = () => handleGracefulShutdown(server, { ...options, signal: 'SIGINT' });

  process.on('SIGTERM', onSigTerm);
  process.on('SIGINT', onSigInt);

  return { onSigTerm, onSigInt };
}

module.exports = {
  isShuttingDown,
  setShuttingDown,
  handleGracefulShutdown,
  registerShutdownHandlers
};
