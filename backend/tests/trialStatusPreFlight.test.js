// backend/tests/trialStatusPreFlight.test.js
/**
 * Test Suite for Chunk 6.3 — Pre-Flight Trial Check & AI Quota Protection
 * 
 * Verifies:
 * 1. Trial Available (Anonymous, no trial session):
 *    - Allowed: true, authenticated: false, trialExhausted: false
 * 2. Trial Available (Anonymous, trial session created but no plan yet):
 *    - Allowed: true, authenticated: false, trialExhausted: false, hasTrialSession: true
 * 3. Trial Exhausted (Anonymous, one-plan trial consumed):
 *    - Allowed: false, authenticated: false, trialExhausted: true, hasTrialSession: true
 * 4. Missing / Invalid / Malformed Anonymous Session:
 *    - Safely returns allowed: true, trialExhausted: false without throwing
 * 5. Authenticated User Behavior:
 *    - Always allowed (allowed: true, authenticated: true, trialExhausted: false)
 *    - Not blocked by stale anonymous trial cookies
 * 6. Information Hygiene & Response Minimal:
 *    - Minimal payload, zero plan content, zero passwords, zero session tokens leaked
 * 7. Live HTTP Endpoint Route Precedence:
 *    - GET /api/plans/trial-status returns 200 OK
 *    - Crucially NOT intercepted or matched as an :id by GET /api/plans/:id
 * 8. Rate Limiting:
 *    - GET /api/plans/trial-status protected by trialStatusLimiter
 * 9. Server-Side Enforcement Invariant:
 *    - POST /api/plans continues to strictly reject exhausted trials with 403 TRIAL_LIMIT_REACHED
 */

const assert = require('assert');
const http = require('http');
const express = require('express');
const crypto = require('crypto');
const { createDatabaseInstance, initDatabase } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const {
  checkTrialStatus,
  createTrialPlan,
  getOrCreateTrialSession,
  TRIAL_COOKIE_NAME
} = require('../services/planService');
const {
  getTrialStatusController,
  createPlanController
} = require('../controllers/planController');
const { createTrialStatusLimiter } = require('../middleware/rateLimiter');
const plansRouter = require('../routes/plans');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 6.3 PRE-FLIGHT TRIAL CHECK TESTS');
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
    },
    cookie(name, val, opts) {
      this.headers[`set-cookie`] = `${name}=${val}`;
      return this;
    }
  };
}

async function withTestServer(appSetupFn, testFn) {
  const app = express();
  await appSetupFn(app);
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    await testFn(baseUrl);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runAllTests() {
  const testDb = createDatabaseInstance(':memory:');
  runMigrations(testDb);

  // --------------------------------------------------------------------------
  // Test 1: Trial available for first-time anonymous visitor (no token)
  // --------------------------------------------------------------------------
  console.log('Test 1: First-time anonymous visitor has trial available...');
  {
    const status = checkTrialStatus(null, null, testDb);
    assert.strictEqual(status.allowed, true);
    assert.strictEqual(status.authenticated, false);
    assert.strictEqual(status.trialExhausted, false);
    assert.strictEqual(status.hasTrialSession, false);
    assert.ok(status.message.includes('available'));
    console.log('✅ Passed Test 1: First-time anonymous visitor correctly allowed');
  }

  // --------------------------------------------------------------------------
  // Test 2: Trial available for anonymous visitor with active session, no plan
  // --------------------------------------------------------------------------
  console.log('\nTest 2: Anonymous visitor with active session but no plan has trial available...');
  {
    const { session } = getOrCreateTrialSession(null, '192.168.1.1', testDb);
    assert.ok(session && session.id);

    const status = checkTrialStatus(session.id, null, testDb);
    assert.strictEqual(status.allowed, true);
    assert.strictEqual(status.authenticated, false);
    assert.strictEqual(status.trialExhausted, false);
    assert.strictEqual(status.hasTrialSession, true);
    console.log('✅ Passed Test 2: In-progress session with no generated plan is allowed');
  }

  // --------------------------------------------------------------------------
  // Test 3: Trial exhausted once anonymous visitor creates a plan
  // --------------------------------------------------------------------------
  console.log('\nTest 3: Anonymous visitor trial is exhausted after 1 plan generated...');
  {
    const planPayload = {
      startupName: 'Trial Seed Startup',
      industry: 'EdTech',
      problem: 'High education cost',
      solution: 'Free AI tutors',
      targetAudience: 'Students',
      usp: 'Personalized AI'
    };

    const { plan, trialToken } = createTrialPlan(planPayload, { ip: '10.0.0.1' }, testDb);
    assert.ok(plan.id);
    assert.ok(trialToken);

    const status = checkTrialStatus(trialToken, null, testDb);
    assert.strictEqual(status.allowed, false);
    assert.strictEqual(status.authenticated, false);
    assert.strictEqual(status.trialExhausted, true);
    assert.strictEqual(status.hasTrialSession, true);
    assert.ok(status.message.toLowerCase().includes('already been used'));
    console.log('✅ Passed Test 3: Exhausted trial correctly flagged allowed=false, trialExhausted=true');
  }

  // --------------------------------------------------------------------------
  // Test 4: Missing, expired, invalid, or malformed session state
  // --------------------------------------------------------------------------
  console.log('\nTest 4: Missing, malformed, or invalid trial tokens safely handled...');
  {
    // Random UUID not in DB
    const randomUuid = crypto.randomUUID();
    const statusRandom = checkTrialStatus(randomUuid, null, testDb);
    assert.strictEqual(statusRandom.allowed, true);
    assert.strictEqual(statusRandom.trialExhausted, false);
    assert.strictEqual(statusRandom.hasTrialSession, false);

    // Malformed inputs (not strings, injection attempts)
    const malformedCases = ['', '   ', 12345, {}, [], null, undefined, "' OR 1=1 --"];
    for (const badToken of malformedCases) {
      const statusBad = checkTrialStatus(badToken, null, testDb);
      assert.strictEqual(statusBad.allowed, true);
      assert.strictEqual(statusBad.trialExhausted, false);
    }
    console.log('✅ Passed Test 4: Malformed tokens do not crash or block users');
  }

  // --------------------------------------------------------------------------
  // Test 5: Authenticated users are never blocked by trial exhaustion
  // --------------------------------------------------------------------------
  console.log('\nTest 5: Authenticated users bypass trial exhaustion checks...');
  {
    // Create an exhausted trial token
    const { trialToken } = createTrialPlan({
      startupName: 'Auth Test App',
      industry: 'AI'
    }, { ip: '127.0.0.1' }, testDb);

    const authUser = { id: 'usr_abc123', email: 'founder@example.com' };

    // Pass the exhausted token together with an authenticated user
    const status = checkTrialStatus(trialToken, authUser, testDb);
    assert.strictEqual(status.allowed, true);
    assert.strictEqual(status.authenticated, true);
    assert.strictEqual(status.trialExhausted, false);
    assert.strictEqual(status.message, 'Authenticated user session active.');
    console.log('✅ Passed Test 5: Authenticated users are allowed regardless of trial cookie');
  }

  // --------------------------------------------------------------------------
  // Test 6: Controller contract & Information Hygiene
  // --------------------------------------------------------------------------
  console.log('\nTest 6: Controller returns minimal, non-leaking JSON contract...');
  {
    // Exhausted trial cookie request
    const { trialToken } = createTrialPlan({
      startupName: 'Secret Project X',
      industry: 'Defense'
    }, { ip: '172.16.0.1' }, testDb);

    const mockReq = {
      headers: {
        cookie: `${TRIAL_COOKIE_NAME}=${trialToken}`
      },
      user: null
    };
    const mockRes = createMockRes();

    // Use default DB (testDb set globally or in controller)
    // Controller calls checkTrialStatus(trialToken, req.user)
    // To ensure controller uses testDb, initialize global db or invoke with service
    initDatabase(':memory:');
    const globalDb = require('../db/database').getDatabase();
    runMigrations(globalDb);

    // Seed into globalDb
    const seeded = createTrialPlan({
      startupName: 'Secret Project X',
      industry: 'Defense'
    }, { ip: '172.16.0.1' }, globalDb);

    const seedReq = {
      headers: {
        cookie: `${TRIAL_COOKIE_NAME}=${seeded.trialToken}`
      },
      user: null
    };
    const seedRes = createMockRes();

    await getTrialStatusController(seedReq, seedRes);
    assert.strictEqual(seedRes.statusCode, 200);
    assert.strictEqual(seedRes.jsonData.success, true);
    assert.strictEqual(seedRes.jsonData.data.allowed, false);
    assert.strictEqual(seedRes.jsonData.data.trialExhausted, true);

    // Check hygiene: zero plan details, zero user details, zero tokens returned
    const jsonStr = JSON.stringify(seedRes.jsonData);
    assert.strictEqual(jsonStr.includes('Secret Project X'), false, 'Must not leak startup name');
    assert.strictEqual(jsonStr.includes(seeded.plan.id), false, 'Must not leak plan id');
    assert.strictEqual(jsonStr.includes(seeded.trialToken), false, 'Must not leak trial token');
    console.log('✅ Passed Test 6: Controller returns structured data without leaking secrets');
  }

  // --------------------------------------------------------------------------
  // Test 7: Express Router Precedence (GET /api/plans/trial-status)
  // --------------------------------------------------------------------------
  console.log('\nTest 7: Express routing precedence test (trial-status is not treated as :id)...');
  {
    await withTestServer(
      (app) => {
        app.use(express.json());
        // Mount plansRouter at /api/plans
        app.use('/api/plans', plansRouter);
      },
      async (baseUrl) => {
        const res = await fetch(`${baseUrl}/api/plans/trial-status`);
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.success, true);
        assert.strictEqual(typeof data.data.allowed, 'boolean');
        assert.strictEqual(typeof data.data.trialExhausted, 'boolean');

        // Crucial test: If trial-status were treated as :id, getPlanByIdController
        // would return 404 PLAN_NOT_FOUND or fail UUID parsing.
        assert.notStrictEqual(data.error?.code, 'PLAN_NOT_FOUND');
      }
    );
    console.log('✅ Passed Test 7: GET /api/plans/trial-status route resolves properly before /:id');
  }

  // --------------------------------------------------------------------------
  // Test 8: Rate Limiting on trial-status
  // --------------------------------------------------------------------------
  console.log('\nTest 8: Rate limiter protects trial-status endpoint...');
  {
    const customTrialLimiter = createTrialStatusLimiter({ max: 3, windowMs: 60 * 1000 });
    await withTestServer(
      (app) => {
        app.get('/test/trial-status', customTrialLimiter, (req, res) => res.json({ success: true }));
      },
      async (baseUrl) => {
        for (let i = 0; i < 3; i++) {
          const res = await fetch(`${baseUrl}/test/trial-status`);
          assert.strictEqual(res.status, 200);
        }
        const blockedRes = await fetch(`${baseUrl}/test/trial-status`);
        assert.strictEqual(blockedRes.status, 429);
        const blockedData = await blockedRes.json();
        assert.strictEqual(blockedData.error.code, 'RATE_LIMIT_EXCEEDED');
      }
    );
    console.log('✅ Passed Test 8: Rate limiting successfully bounds trial status checks');
  }

  // --------------------------------------------------------------------------
  // Test 9: Authoritative Server-Side Enforcement Invariant
  // --------------------------------------------------------------------------
  console.log('\nTest 9: Server-side POST /api/plans trial enforcement remains authoritative...');
  {
    const globalDb = require('../db/database').getDatabase();
    const seeded = createTrialPlan({
      startupName: 'Initial Seed Plan',
      industry: 'SaaS'
    }, { ip: '10.1.1.1' }, globalDb);

    // Now attempt a 2nd plan with the same exhausted token via createPlanController
    const postReq = {
      body: {
        startupName: 'Second Plan Attempt'
      },
      headers: {
        cookie: `${TRIAL_COOKIE_NAME}=${seeded.trialToken}`
      },
      ip: '10.1.1.1',
      user: null
    };
    const postRes = createMockRes();

    await createPlanController(postReq, postRes);
    assert.strictEqual(postRes.statusCode, 403);
    assert.strictEqual(postRes.jsonData.error.code, 'TRIAL_LIMIT_REACHED');
    console.log('✅ Passed Test 9: Server-side enforcement stops exhausted trials even if preflight bypassed');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL 9 PRE-FLIGHT TRIAL CHECK TESTS PASSED!');
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('❌ Test failure:', err);
  process.exit(1);
});
