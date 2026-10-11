// backend/tests/healthEndpoints.test.js
/**
 * Test Suite for Chunk 6.1 — Production Environment, Scripts & Health Check Hardening
 * 
 * Verifies:
 * 1. Liveness Probe (GET /health): returns 200 OK with status: 'ok', valid ISO timestamp, and uptime.
 * 2. Liveness Alias (GET /api/health): returns 200 OK with matching payload.
 * 3. Readiness Probe (GET /ready): returns 200 OK with status: 'ready', database: 'connected' when SQLite is open.
 * 4. Readiness Alias (GET /api/ready): returns 200 OK with matching payload.
 * 5. Readiness Failure on Closed Database: returns 503 Service Unavailable with status: 'not_ready'.
 * 6. Readiness Failure During Shutdown: returns 503 with status: 'not_ready', database: 'shutting_down'.
 * 7. Graceful Shutdown Mechanics: drains server, closes database cleanly, deduplicates repeated signals.
 * 8. Real HTTP Server Integration: verifies endpoints over actual HTTP socket connections.
 * 9. Information Hygiene: zero secrets, stack traces, or file paths leaked in health responses.
 */

const assert = require('assert');
const http = require('http');
const { getDatabase, closeDatabase, initDatabase } = require('../db/database');
const { livenessController, readinessController } = require('../controllers/healthController');
const {
  isShuttingDown,
  setShuttingDown,
  handleGracefulShutdown
} = require('../utils/shutdown');
const app = require('../index');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 6.1 HEALTH & SHUTDOWN TESTS');
console.log('====================================================\n');

// Mock Express Response helper
function createMockRes() {
  return {
    statusCode: 200,
    headers: {},
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
}

let passedCount = 0;

async function runTests() {
  // Reset shutdown state and ensure DB is initialized
  setShuttingDown(false);
  initDatabase();

  // --------------------------------------------------------------------------
  // Test 1: Liveness Controller
  // --------------------------------------------------------------------------
  console.log('Test 1: Liveness probe unit contract (livenessController)...');
  {
    const req = {};
    const res = createMockRes();

    livenessController(req, res);

    assert.strictEqual(res.statusCode, 200, 'Liveness probe must return HTTP 200');
    assert.ok(res.jsonData, 'Liveness probe must return JSON payload');
    assert.strictEqual(res.jsonData.status, 'ok', 'Status must be "ok"');
    assert.ok(typeof res.jsonData.timestamp === 'string', 'Timestamp must be an ISO string');
    assert.ok(!isNaN(Date.parse(res.jsonData.timestamp)), 'Timestamp must be valid date');
    assert.ok(typeof res.jsonData.uptime === 'number' && res.jsonData.uptime >= 0, 'Uptime must be non-negative number');

    console.log('✅ Passed Test 1: Liveness probe returns 200 OK with timestamp and uptime');
    passedCount++;
  }

  // --------------------------------------------------------------------------
  // Test 2: Readiness Controller When Database is Healthy
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Readiness probe unit contract with active database...');
  {
    setShuttingDown(false);
    const db = getDatabase();
    assert.strictEqual(db.open, true, 'Database must be open for test');

    const req = {};
    const res = createMockRes();

    readinessController(req, res);

    assert.strictEqual(res.statusCode, 200, 'Readiness probe must return HTTP 200 when database is healthy');
    assert.ok(res.jsonData, 'Readiness probe must return JSON payload');
    assert.strictEqual(res.jsonData.status, 'ready', 'Status must be "ready"');
    assert.strictEqual(res.jsonData.database, 'connected', 'Database status must be "connected"');
    assert.ok(typeof res.jsonData.timestamp === 'string', 'Timestamp must be a string');

    console.log('✅ Passed Test 2: Readiness probe returns 200 OK with database: connected');
    passedCount++;
  }

  // --------------------------------------------------------------------------
  // Test 3: Readiness Controller When Server is Shutting Down
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Readiness probe returns 503 during graceful shutdown...');
  {
    setShuttingDown(true);

    const req = {};
    const res = createMockRes();

    readinessController(req, res);

    assert.strictEqual(res.statusCode, 503, 'Readiness probe must return 503 when shutting down');
    assert.strictEqual(res.jsonData.status, 'not_ready', 'Status must be "not_ready"');
    assert.strictEqual(res.jsonData.database, 'shutting_down', 'Database status must be "shutting_down"');

    // Reset flag
    setShuttingDown(false);

    console.log('✅ Passed Test 3: Readiness probe returns 503 when shutdown flag is active');
    passedCount++;
  }

  // --------------------------------------------------------------------------
  // Test 4: Readiness Controller When Database Connection is Closed / Faulty
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Readiness probe returns 503 when database is closed or faulty...');
  {
    setShuttingDown(false);

    // 4A: Closed database instance (open = false)
    const req1 = {};
    const res1 = createMockRes();
    readinessController(req1, res1, { open: false });

    assert.strictEqual(res1.statusCode, 503, 'Readiness probe must return 503 when database is not open');
    assert.strictEqual(res1.jsonData.status, 'not_ready', 'Status must be "not_ready"');
    assert.strictEqual(res1.jsonData.database, 'disconnected', 'Database status must be "disconnected"');

    // 4B: Query failure on database (throws error)
    const req2 = {};
    const res2 = createMockRes();
    readinessController(req2, res2, {
      open: true,
      prepare: () => { throw new Error('Simulated SQLite disk I/O failure'); }
    });

    assert.strictEqual(res2.statusCode, 503, 'Readiness probe must return 503 when database query throws');
    assert.strictEqual(res2.jsonData.status, 'not_ready', 'Status must be "not_ready"');
    assert.strictEqual(res2.jsonData.database, 'disconnected', 'Database status must be "disconnected"');

    console.log('✅ Passed Test 4: Readiness probe safely fails with 503 on closed or faulty database');
    passedCount++;
  }

  // --------------------------------------------------------------------------
  // Test 5: Graceful Shutdown Mechanics
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Graceful shutdown execution order and deduplication...');
  {
    setShuttingDown(false);
    let serverCloseCalled = false;
    let dbCloseCalled = false;
    let orderOfCalls = [];
    let exitCode = null;

    const mockServer = {
      close(cb) {
        serverCloseCalled = true;
        orderOfCalls.push('server.close');
        // Simulate async in-flight completion
        setImmediate(() => {
          cb(null);
        });
      }
    };

    const mockCloseDb = () => {
      dbCloseCalled = true;
      orderOfCalls.push('closeDatabase');
    };

    const mockExit = (code) => {
      exitCode = code;
    };

    const silentLogger = {
      log: () => {},
      error: () => {}
    };

    // First shutdown call
    await handleGracefulShutdown(mockServer, {
      signal: 'SIGTERM',
      timeoutMs: 5000,
      exitFn: mockExit,
      closeDbFn: mockCloseDb,
      logger: silentLogger
    });

    assert.strictEqual(serverCloseCalled, true, 'server.close must be called');
    assert.strictEqual(dbCloseCalled, true, 'closeDatabase must be called');
    assert.deepStrictEqual(orderOfCalls, ['server.close', 'closeDatabase'], 'server must close BEFORE database closes');
    assert.strictEqual(exitCode, 0, 'Exit code must be 0 on clean shutdown');
    assert.strictEqual(isShuttingDown(), true, 'isShuttingDown must remain true');

    // Second shutdown call (must be ignored and deduplicated)
    let secondExitCalled = false;
    await handleGracefulShutdown(mockServer, {
      signal: 'SIGINT',
      exitFn: () => { secondExitCalled = true; },
      logger: silentLogger
    });

    assert.strictEqual(secondExitCalled, false, 'Repeated shutdown signal must be ignored');

    // Reset flag and database for subsequent tests
    setShuttingDown(false);
    initDatabase();

    console.log('✅ Passed Test 5: Graceful shutdown preserves drain order and ignores duplicates');
    passedCount++;
  }

  // --------------------------------------------------------------------------
  // Test 6: Real HTTP Integration Tests
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Real HTTP request testing (/health, /ready, /api/health, /api/ready)...');
  {
    setShuttingDown(false);
    initDatabase();

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = server.address().port;

    const fetchJson = (path) => {
      return new Promise((resolve, reject) => {
        const req = http.get(`http://127.0.0.1:${port}${path}`, (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
            } catch (err) {
              resolve({ statusCode: res.statusCode, raw: data });
            }
          });
        });
        req.on('error', reject);
      });
    };

    // 6A: GET /health
    const resHealth = await fetchJson('/health');
    assert.strictEqual(resHealth.statusCode, 200, 'GET /health must return 200');
    assert.strictEqual(resHealth.data.status, 'ok', 'GET /health status must be ok');

    // 6B: GET /api/health
    const resApiHealth = await fetchJson('/api/health');
    assert.strictEqual(resApiHealth.statusCode, 200, 'GET /api/health must return 200');
    assert.strictEqual(resApiHealth.data.status, 'ok', 'GET /api/health status must be ok');

    // 6C: GET /ready
    const resReady = await fetchJson('/ready');
    assert.strictEqual(resReady.statusCode, 200, 'GET /ready must return 200');
    assert.strictEqual(resReady.data.status, 'ready', 'GET /ready status must be ready');
    assert.strictEqual(resReady.data.database, 'connected', 'GET /ready database must be connected');

    // 6D: GET /api/ready
    const resApiReady = await fetchJson('/api/ready');
    assert.strictEqual(resApiReady.statusCode, 200, 'GET /api/ready must return 200');
    assert.strictEqual(resApiReady.data.status, 'ready', 'GET /api/ready status must be ready');
    assert.strictEqual(resApiReady.data.database, 'connected', 'GET /api/ready database must be connected');

    // Close test server
    await new Promise((resolve) => server.close(resolve));

    console.log('✅ Passed Test 6: All 4 health endpoints respond with 200 OK over real HTTP');
    passedCount++;
  }

  // --------------------------------------------------------------------------
  // Test 7: Information Hygiene
  // --------------------------------------------------------------------------
  console.log('\nTest 7: Information leakage inspection in health responses...');
  {
    const req = {};
    const resLiveness = createMockRes();
    const resReadiness = createMockRes();

    livenessController(req, resLiveness);
    readinessController(req, resReadiness);

    const livenessStr = JSON.stringify(resLiveness.jsonData);
    const readinessStr = JSON.stringify(resReadiness.jsonData);

    // Verify forbidden keywords
    const forbidden = ['sqlite', 'key', 'token', 'password', 'data/', 'startup_ai.db', 'SELECT'];
    for (const term of forbidden) {
      assert.strictEqual(livenessStr.toLowerCase().includes(term.toLowerCase()), false, `Liveness leaked: ${term}`);
      assert.strictEqual(readinessStr.toLowerCase().includes(term.toLowerCase()), false, `Readiness leaked: ${term}`);
    }

    console.log('✅ Passed Test 7: Health endpoints are strictly sanitized with zero secret/path leakage');
    passedCount++;
  }

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedCount} HEALTH & SHUTDOWN TESTS PASSED!`);
  console.log('====================================================\n');
}

runTests().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
