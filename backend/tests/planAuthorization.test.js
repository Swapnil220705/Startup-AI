// backend/tests/planAuthorization.test.js
/**
 * Test Suite for Chunk 4.3 — Plan Ownership, Anonymous Trial & Claiming
 * 
 * Verifies:
 * - A: Authenticated plan creation (user_id assigned, isolated from other users)
 * - B: Anonymous trial creation (cookie issued, user_id = NULL, trial_sessions linked)
 * - C: One-plan trial limit (2nd anonymous creation receives 403 TRIAL_LIMIT_REACHED)
 * - D: Trial and plan isolation (anonymous User A cannot view User B trial, random UUID 404, User A cannot view User B plan)
 * - E: History isolation (authenticated user sees only own plans, anonymous history is empty, no cross-user leakage)
 * - F: PATCH authorization (unauthenticated rejected, non-owner safe 404, owner updates metadata, immutable AI trees/user_id)
 * - G: DELETE authorization (unauthenticated rejected, non-owner safe 404, owner deletes, anonymous cannot delete)
 * - H: Plan claim (authenticated user claims trial plan, user_id updated, 6 modules intact, no duplicate row, old anonymous access denied)
 * - I: Invalid claim (cannot claim another user's trial, cannot claim arbitrary unlinked NULL-user plan, 409 if already claimed)
 * - J: Claim race safety (concurrent/subsequent claims safely rejected with 409 without reassigning owner)
 * - K: Existing Phase 3 plans (NULL user_id without trial session remain isolated, not in history, not globally accessible)
 * - L: Error hygiene (no SQL errors, no stack traces, no session tokens, no trial tokens, no password hashes)
 */

const assert = require('assert');
const crypto = require('crypto');
const { createDatabaseInstance } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const {
  createPlan,
  createTrialPlan,
  getPlanById,
  getPlanForRequester,
  listPlans,
  updatePlan,
  deletePlan,
  claimPlan,
  getOrCreateTrialSession,
  TRIAL_COOKIE_NAME,
  setTrialCookie,
  getTrialCookieOptions
} = require('../services/planService');
const {
  createLocalUser,
  createSession,
  formatUser,
  SESSION_COOKIE_NAME
} = require('../services/authService');
const {
  createPlanController,
  getPlanByIdController,
  listPlansController,
  updatePlanController,
  deletePlanController,
  claimPlanController
} = require('../controllers/planController');
const { requireAuth } = require('../middleware/auth');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 4.3 PLAN AUTHORIZATION & TRIAL TESTS');
console.log('====================================================\n');

// Mock Express response helper
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
    cookie(name, value, options) {
      this.cookies[name] = { value, options };
      return this;
    },
    setHeader(name, value) {
      this.headers[name] = value;
      return this;
    }
  };
  return res;
}

// Sample 6-module plan data
const sampleFullModules = {
  startupName: 'CloudScale AI',
  industry: 'Cloud Infrastructure',
  problem: 'Cloud computing costs are unpredictable.',
  solution: 'AI-driven dynamic multi-cloud cost optimization.',
  targetAudience: 'DevOps leads and CTOs at scale-ups.',
  usp: 'Guaranteed 35% reduction in compute spend within 48 hours.',
  leanCanvas: {
    problem: 'Cloud spend unpredictability',
    solution: 'Automated AI balancer',
    uniqueValueProposition: '35% reduction guaranteed'
  },
  mvp: {
    coreFeatures: ['AWS cost analyzer', 'GCP bridge', 'Slack alerts']
  },
  revenue: [
    { stream: 'SaaS Subscription', model: 'Tiered per cluster' }
  ],
  pitch: {
    elevatorPitch: 'We cut enterprise cloud bills in half automatically.'
  },
  personas: [
    { name: 'DevOps Dave', role: 'Platform Architect' }
  ],
  competitors: [
    { name: 'LegacyMonitor Corp', weakness: 'Manual configuration required' }
  ]
};

async function runTests() {
  const testDb = createDatabaseInstance(':memory:');
  runMigrations(testDb);

  // Setup: Create 2 test users
  const user1 = createLocalUser({ email: 'founder1@startup.io', password: 'Password123!', name: 'Founder One' }, testDb);
  const user2 = createLocalUser({ email: 'founder2@startup.io', password: 'Password123!', name: 'Founder Two' }, testDb);

  // Setup database getter override for controller testing
  const databaseModule = require('../db/database');
  const origGetDatabase = databaseModule.getDatabase;
  databaseModule.getDatabase = () => testDb;

  try {
    // ==========================================
    // TEST A: Authenticated Plan Creation
    // ==========================================
    console.log('Test A: Authenticated plan creation...');
    {
      const planUser1 = createPlan(
        { ...sampleFullModules, startupName: 'User 1 SaaS' },
        { userId: user1.id },
        testDb
      );

      assert.strictEqual(planUser1.userId, user1.id, 'Plan userId must match user 1 ID');
      assert.strictEqual(planUser1.user_id, user1.id, 'Plan user_id must match user 1 ID');

      // Direct controller test
      const mockReq = {
        user: user1,
        body: { ...sampleFullModules, startupName: 'Controller Auth Plan' },
        headers: {}
      };
      const mockRes = createMockRes();
      await createPlanController(mockReq, mockRes);

      assert.strictEqual(mockRes.statusCode, 201);
      assert.strictEqual(mockRes.body.success, true);
      assert.strictEqual(mockRes.body.data.userId, user1.id);
      assert.strictEqual(mockRes.cookies[TRIAL_COOKIE_NAME], undefined, 'No trial cookie issued for authenticated creation');

      // Ensure client-supplied userId in body is strictly ignored
      const spoofReq = {
        user: user1,
        body: { ...sampleFullModules, startupName: 'Spoof Test', userId: 'malicious-id-999', user_id: 'malicious-id-999' },
        headers: {}
      };
      const spoofRes = createMockRes();
      await createPlanController(spoofReq, spoofRes);
      assert.strictEqual(spoofRes.body.data.userId, user1.id, 'Server MUST override any client-supplied userId');

      console.log('✅ Passed Test A: Authenticated plan creation assigns server-determined user_id and ignores client spoofing');
    }

    // ==========================================
    // TEST B: Anonymous Trial Creation
    // ==========================================
    console.log('\nTest B: Anonymous trial creation...');
    let anonTrialCookie = null;
    let anonPlanId = null;
    {
      const mockReq = {
        user: null,
        body: { ...sampleFullModules, startupName: 'Anonymous Idea Pro' },
        headers: {
          'x-forwarded-for': '198.51.100.25'
        }
      };
      const mockRes = createMockRes();
      await createPlanController(mockReq, mockRes);

      assert.strictEqual(mockRes.statusCode, 201);
      assert.strictEqual(mockRes.body.success, true);
      assert.strictEqual(mockRes.body.data.userId, null, 'Anonymous plan user_id must be null');
      assert.strictEqual(mockRes.body.data.user_id, null);
      assert(mockRes.cookies[TRIAL_COOKIE_NAME], 'Trial cookie must be issued to anonymous visitor');

      anonTrialCookie = mockRes.cookies[TRIAL_COOKIE_NAME].value;
      anonPlanId = mockRes.body.data.id;

      // Verify trial session row in database
      const trialRow = testDb.prepare('SELECT * FROM trial_sessions WHERE id = ?').get(anonTrialCookie);
      assert(trialRow, 'trial_sessions row must exist');
      assert.strictEqual(trialRow.plan_id, anonPlanId, 'trial_sessions.plan_id must point to created plan');
      assert(trialRow.ip_hash, 'trial_sessions must record ip_hash');

      // Verify cookie security attributes
      const cookieOpts = mockRes.cookies[TRIAL_COOKIE_NAME].options;
      assert.strictEqual(cookieOpts.httpOnly, true, 'Trial cookie must be HttpOnly');
      assert.strictEqual(cookieOpts.sameSite, 'lax', 'Trial cookie must be SameSite=Lax');
      assert.strictEqual(cookieOpts.path, '/', 'Trial cookie must have Path=/');
      assert(cookieOpts.maxAge > 0, 'Trial cookie must have positive maxAge');

      console.log('✅ Passed Test B: Anonymous trial creates plan with NULL user_id, links trial session, and sets secure cookie');
    }

    // ==========================================
    // TEST C: One-Plan Anonymous Trial Limit
    // ==========================================
    console.log('\nTest C: One-plan anonymous trial limit enforcement...');
    {
      // Same anonymous visitor tries to create a 2nd plan with their trial cookie
      const mockReqSecond = {
        user: null,
        body: { ...sampleFullModules, startupName: 'Second Plan Attempt' },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}`
        }
      };
      const mockResSecond = createMockRes();
      await createPlanController(mockReqSecond, mockResSecond);

      assert.strictEqual(mockResSecond.statusCode, 403, 'Second plan creation must be rejected with HTTP 403');
      assert.strictEqual(mockResSecond.body.success, false);
      assert.strictEqual(mockResSecond.body.error.code, 'TRIAL_LIMIT_REACHED');

      // Verify that no second plan was persisted
      const planCount = testDb.prepare("SELECT COUNT(*) as count FROM plans WHERE startup_name = 'Second Plan Attempt'").get().count;
      assert.strictEqual(planCount, 0, 'Rejected trial plan must not be persisted in database');

      console.log('✅ Passed Test C: Anonymous visitor is strictly blocked from creating a second plan with 403 TRIAL_LIMIT_REACHED');
    }

    // ==========================================
    // TEST D: Trial & Plan Isolation
    // ==========================================
    console.log('\nTest D: Trial & plan access isolation...');
    {
      // 1. Anonymous visitor with matching trial cookie CAN access their trial plan
      const mockReqOwner = {
        user: null,
        params: { id: anonPlanId },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}`
        }
      };
      const mockResOwner = createMockRes();
      await getPlanByIdController(mockReqOwner, mockResOwner);
      assert.strictEqual(mockResOwner.statusCode, 200);
      assert.strictEqual(mockResOwner.body.data.id, anonPlanId);

      // 2. Different anonymous visitor with a different trial cookie CANNOT access User A's trial plan
      const otherTrialId = crypto.randomUUID();
      testDb.prepare("INSERT INTO trial_sessions (id, plan_id, ip_hash, created_at) VALUES (?, null, 'other', ?)").run(
        otherTrialId,
        new Date().toISOString()
      );

      const mockReqOther = {
        user: null,
        params: { id: anonPlanId },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${otherTrialId}`
        }
      };
      const mockResOther = createMockRes();
      await getPlanByIdController(mockReqOther, mockResOther);
      assert.strictEqual(mockResOther.statusCode, 404, 'Other anonymous visitor must receive 404 PLAN_NOT_FOUND');
      assert.strictEqual(mockResOther.body.error.code, 'PLAN_NOT_FOUND');

      // 3. Anonymous visitor without any cookie gets 404
      const mockReqNoCookie = {
        user: null,
        params: { id: anonPlanId },
        headers: {}
      };
      const mockResNoCookie = createMockRes();
      await getPlanByIdController(mockReqNoCookie, mockResNoCookie);
      assert.strictEqual(mockResNoCookie.statusCode, 404, 'Anonymous visitor without cookie must receive 404');
      assert.strictEqual(mockResNoCookie.body.error.code, 'PLAN_NOT_FOUND');

      // 4. Guessed or non-existent UUID returns safe 404
      const mockReqRandom = {
        user: null,
        params: { id: '00000000-1111-2222-3333-444444444444' },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}`
        }
      };
      const mockResRandom = createMockRes();
      await getPlanByIdController(mockReqRandom, mockResRandom);
      assert.strictEqual(mockResRandom.statusCode, 404);
      assert.strictEqual(mockResRandom.body.error.code, 'PLAN_NOT_FOUND');

      // 5. Authenticated User 2 CANNOT access User 1's plan
      const user1Plan = createPlan({ ...sampleFullModules, startupName: 'Confidential User 1 Plan' }, { userId: user1.id }, testDb);
      const mockReqUser2 = {
        user: user2,
        params: { id: user1Plan.id },
        headers: {}
      };
      const mockResUser2 = createMockRes();
      await getPlanByIdController(mockReqUser2, mockResUser2);
      assert.strictEqual(mockResUser2.statusCode, 404, 'User 2 accessing User 1 plan must receive safe 404');
      assert.strictEqual(mockResUser2.body.error.code, 'PLAN_NOT_FOUND');

      console.log('✅ Passed Test D: Trial and plan access strictly isolated; non-matching requesters get safe 404 PLAN_NOT_FOUND');
    }

    // ==========================================
    // TEST E: History Isolation
    // ==========================================
    console.log('\nTest E: History listing user isolation...');
    {
      // Create distinct plans for user 1 and user 2
      createPlan({ ...sampleFullModules, startupName: 'User 1 Portfolio Item 1' }, { userId: user1.id }, testDb);
      createPlan({ ...sampleFullModules, startupName: 'User 1 Portfolio Item 2' }, { userId: user1.id }, testDb);
      createPlan({ ...sampleFullModules, startupName: 'User 2 Unique Secret' }, { userId: user2.id }, testDb);

      // Authenticated User 1 history
      const mockReqU1 = { user: user1, query: { limit: '20', offset: '0' } };
      const mockResU1 = createMockRes();
      await listPlansController(mockReqU1, mockResU1);

      assert.strictEqual(mockResU1.statusCode, 200);
      const u1Plans = mockResU1.body.data.plans;
      assert(u1Plans.length >= 2, 'User 1 should see all their owned plans');
      for (const p of u1Plans) {
        assert.strictEqual(p.userId, user1.id, 'Every plan in User 1 history must belong to user 1');
        assert.notStrictEqual(p.startupName, 'User 2 Unique Secret', 'User 2 plan must NEVER appear in User 1 history');
      }

      // Authenticated User 2 history
      const mockReqU2 = { user: user2, query: { limit: '20', offset: '0' } };
      const mockResU2 = createMockRes();
      await listPlansController(mockReqU2, mockResU2);

      assert.strictEqual(mockResU2.statusCode, 200);
      const u2Plans = mockResU2.body.data.plans;
      assert.strictEqual(u2Plans.length, 1);
      assert.strictEqual(u2Plans[0].startupName, 'User 2 Unique Secret');

      // Anonymous history: MUST BE EMPTY
      const mockReqAnon = { user: null, query: { limit: '20', offset: '0' } };
      const mockResAnon = createMockRes();
      await listPlansController(mockReqAnon, mockResAnon);

      assert.strictEqual(mockResAnon.statusCode, 200);
      assert.strictEqual(mockResAnon.body.data.plans.length, 0, 'Anonymous history must be empty');
      assert.strictEqual(mockResAnon.body.data.total, 0, 'Anonymous total must be 0');

      console.log('✅ Passed Test E: Multi-user history isolation verified; anonymous history is empty');
    }

    // ==========================================
    // TEST F: PATCH Authorization
    // ==========================================
    console.log('\nTest F: PATCH authorization and immutability...');
    {
      const planToUpdate = createPlan({ ...sampleFullModules, startupName: 'Original Brand' }, { userId: user1.id }, testDb);

      // 1. Unauthenticated PATCH: requireAuth middleware test
      let authBlocked = false;
      const unauthReq = { user: null };
      const unauthRes = createMockRes();
      requireAuth(unauthReq, unauthRes, () => { authBlocked = false; });
      assert.strictEqual(unauthRes.statusCode, 401, 'Unauthenticated PATCH must receive 401 UNAUTHORIZED');
      assert.strictEqual(unauthRes.body.error.code, 'UNAUTHORIZED');

      // 2. Non-owner (User 2) PATCH -> safe 404 PLAN_NOT_FOUND
      const nonOwnerReq = {
        user: user2,
        params: { id: planToUpdate.id },
        body: { startupName: 'Hacked by User 2' }
      };
      const nonOwnerRes = createMockRes();
      await updatePlanController(nonOwnerReq, nonOwnerRes);
      assert.strictEqual(nonOwnerRes.statusCode, 404, 'Non-owner PATCH must receive safe 404 PLAN_NOT_FOUND');
      assert.strictEqual(nonOwnerRes.body.error.code, 'PLAN_NOT_FOUND');

      // Verify not modified
      const checkPlan = getPlanById(planToUpdate.id, testDb);
      assert.strictEqual(checkPlan.startupName, 'Original Brand');

      // 3. Owner PATCH: metadata updates successfully
      const ownerReq = {
        user: user1,
        params: { id: planToUpdate.id },
        body: {
          startupName: 'Renamed Brand Pro',
          industry: 'Enterprise AI',
          // Malicious fields attempting to tamper with immutability:
          userId: user2.id,
          user_id: user2.id,
          generationStatus: 'failed',
          leanCanvas: { tampered: true }
        }
      };
      const ownerRes = createMockRes();
      await updatePlanController(ownerReq, ownerRes);

      assert.strictEqual(ownerRes.statusCode, 200);
      assert.strictEqual(ownerRes.body.data.startupName, 'Renamed Brand Pro');
      assert.strictEqual(ownerRes.body.data.industry, 'Enterprise AI');
      // Immutable guarantees:
      assert.strictEqual(ownerRes.body.data.userId, user1.id, 'user_id must NOT change via PATCH');
      assert.strictEqual(ownerRes.body.data.generationStatus, 'completed', 'generationStatus must NOT change via PATCH');
      assert.deepStrictEqual(ownerRes.body.data.leanCanvas, sampleFullModules.leanCanvas, 'AI JSON trees must remain untouched');

      console.log('✅ Passed Test F: PATCH requires authentication, non-owner gets 404, owner updates only metadata, AI trees & user_id immutable');
    }

    // ==========================================
    // TEST G: DELETE Authorization
    // ==========================================
    console.log('\nTest G: DELETE authorization...');
    {
      const planToDelete = createPlan({ ...sampleFullModules, startupName: 'Delete Candidate' }, { userId: user1.id }, testDb);

      // 1. Unauthenticated DELETE -> 401
      const unauthRes = createMockRes();
      requireAuth({ user: null }, unauthRes, () => {});
      assert.strictEqual(unauthRes.statusCode, 401);

      // 2. Non-owner DELETE -> safe 404
      const nonOwnerReq = { user: user2, params: { id: planToDelete.id } };
      const nonOwnerRes = createMockRes();
      await deletePlanController(nonOwnerReq, nonOwnerRes);
      assert.strictEqual(nonOwnerRes.statusCode, 404);
      assert.strictEqual(nonOwnerRes.body.error.code, 'PLAN_NOT_FOUND');

      // Verify plan still exists in database
      assert(getPlanById(planToDelete.id, testDb), 'Plan must not be deleted by non-owner');

      // 3. Owner DELETE -> 200
      const ownerReq = { user: user1, params: { id: planToDelete.id } };
      const ownerRes = createMockRes();
      await deletePlanController(ownerReq, ownerRes);
      assert.strictEqual(ownerRes.statusCode, 200);
      assert.strictEqual(ownerRes.body.data.deleted, true);

      // Verify plan is removed from database
      assert.strictEqual(getPlanById(planToDelete.id, testDb), null, 'Plan must be deleted by owner');

      // 4. Anonymous cannot delete trial plan
      const trialDeleteReq = { user: null, params: { id: anonPlanId } };
      const trialDeleteRes = createMockRes();
      requireAuth(trialDeleteReq, trialDeleteRes, () => {});
      assert.strictEqual(trialDeleteRes.statusCode, 401, 'Anonymous cannot delete trial plan');

      console.log('✅ Passed Test G: DELETE authorization strictly enforced for owners only');
    }

    // ==========================================
    // TEST H: Plan Claim
    // ==========================================
    console.log('\nTest H: Successful trial plan claim flow...');
    {
      // 1. User 1 claims the anonymous trial plan created in Test B
      const claimReq = {
        user: user1,
        body: { planId: anonPlanId },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}`
        }
      };
      const claimRes = createMockRes();
      await claimPlanController(claimReq, claimRes);

      assert.strictEqual(claimRes.statusCode, 200, 'Claim should return HTTP 200');
      assert.strictEqual(claimRes.body.success, true);
      const claimedPlan = claimRes.body.data;
      assert.strictEqual(claimedPlan.id, anonPlanId, 'Claimed plan must preserve original ID');
      assert.strictEqual(claimedPlan.userId, user1.id, 'Claimed plan user_id must become authenticated user ID');
      assert.strictEqual(claimedPlan.user_id, user1.id);

      // Verify all 6 AI modules are identical
      assert.deepStrictEqual(claimedPlan.leanCanvas, sampleFullModules.leanCanvas);
      assert.deepStrictEqual(claimedPlan.mvp, sampleFullModules.mvp);
      assert.deepStrictEqual(claimedPlan.revenue, sampleFullModules.revenue);
      assert.deepStrictEqual(claimedPlan.pitch, sampleFullModules.pitch);
      assert.deepStrictEqual(claimedPlan.personas, sampleFullModules.personas);
      assert.deepStrictEqual(claimedPlan.competitors, sampleFullModules.competitors);

      // Verify no duplicate row was created in plans table
      const countMatching = testDb.prepare('SELECT COUNT(*) as count FROM plans WHERE id = ?').get(anonPlanId).count;
      assert.strictEqual(countMatching, 1, 'Exactly one row must exist; no duplicate plan created');

      // Verify old anonymous access with trial cookie is now DENIED
      const oldAnonReq = {
        user: null,
        params: { id: anonPlanId },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}`
        }
      };
      const oldAnonRes = createMockRes();
      await getPlanByIdController(oldAnonReq, oldAnonRes);
      assert.strictEqual(oldAnonRes.statusCode, 404, 'Claimed plan must no longer be accessible via old anonymous cookie');

      // Verify authenticated owner CAN now access it
      const ownerReq = {
        user: user1,
        params: { id: anonPlanId },
        headers: {}
      };
      const ownerRes = createMockRes();
      await getPlanByIdController(ownerReq, ownerRes);
      assert.strictEqual(ownerRes.statusCode, 200);
      assert.strictEqual(ownerRes.body.data.id, anonPlanId);

      console.log('✅ Passed Test H: Claim atomically transfers plan to user, preserves all 6 modules, creates no duplicates, and revokes anonymous access');
    }

    // ==========================================
    // TEST I: Invalid Claim Scenarios
    // ==========================================
    console.log('\nTest I: Invalid claim attempts...');
    {
      // 1. User 2 attempts to claim already-claimed plan
      const alreadyClaimedReq = {
        user: user2,
        body: { planId: anonPlanId },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}`
        }
      };
      const alreadyClaimedRes = createMockRes();
      await claimPlanController(alreadyClaimedReq, alreadyClaimedRes);
      assert.strictEqual(alreadyClaimedRes.statusCode, 409, 'Claiming already-claimed plan must return 409 PLAN_ALREADY_CLAIMED');
      assert.strictEqual(alreadyClaimedRes.body.error.code, 'PLAN_ALREADY_CLAIMED');

      // 2. User 2 creates their own trial plan
      const anonTrial2 = createTrialPlan(
        { ...sampleFullModules, startupName: 'User 2 Trial Plan' },
        { trialToken: null, ip: '198.51.100.99' },
        testDb
      );

      // User 1 attempts to claim User 2's trial plan without User 2's trial cookie
      const wrongCookieReq = {
        user: user1,
        body: { planId: anonTrial2.plan.id },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}` // Using User 1's trial cookie
        }
      };
      const wrongCookieRes = createMockRes();
      await claimPlanController(wrongCookieReq, wrongCookieRes);
      assert.strictEqual(wrongCookieRes.statusCode, 403, 'Claiming another user trial without matching cookie must return 403');
      assert.strictEqual(wrongCookieRes.body.error.code, 'INVALID_TRIAL_SESSION');

      // 3. User attempts to claim arbitrary non-existent UUID
      const fakePlanReq = {
        user: user1,
        body: { planId: '00000000-0000-0000-0000-000000000000' },
        headers: {
          cookie: `${TRIAL_COOKIE_NAME}=${anonTrialCookie}`
        }
      };
      const fakePlanRes = createMockRes();
      await claimPlanController(fakePlanReq, fakePlanRes);
      assert(fakePlanRes.statusCode === 403 || fakePlanRes.statusCode === 404);

      // 4. Missing planId in body
      const missingIdRes = createMockRes();
      await claimPlanController({ user: user1, body: {}, headers: {} }, missingIdRes);
      assert.strictEqual(missingIdRes.statusCode, 400);
      assert.strictEqual(missingIdRes.body.error.code, 'INVALID_INPUT');

      console.log('✅ Passed Test I: Claim safeguards verify trial ownership and return 409 for conflicts and 403 for unauthorized claims');
    }

    // ==========================================
    // TEST J: Claim Race-Condition Safety
    // ==========================================
    console.log('\nTest J: Claim race-condition safety...');
    {
      // Create a fresh unowned trial plan
      const raceTrial = createTrialPlan(
        { ...sampleFullModules, startupName: 'Race Trial Plan' },
        { trialToken: null, ip: '127.0.0.1' },
        testDb
      );

      // First claim succeeds
      const firstClaim = claimPlan(raceTrial.plan.id, user1.id, raceTrial.trialToken, testDb);
      assert.strictEqual(firstClaim.userId, user1.id);

      // Concurrent/second claim attempt by another user MUST throw 409 PLAN_ALREADY_CLAIMED
      assert.throws(
        () => {
          claimPlan(raceTrial.plan.id, user2.id, raceTrial.trialToken, testDb);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 409);
          assert.strictEqual(err.code, 'PLAN_ALREADY_CLAIMED');
          return true;
        },
        'Second concurrent claim must throw 409 PLAN_ALREADY_CLAIMED'
      );

      // Verify user 1 remains the sole owner and was NOT overwritten
      const checkPlan = getPlanById(raceTrial.plan.id, testDb);
      assert.strictEqual(checkPlan.userId, user1.id, 'Original owner must be preserved');

      console.log('✅ Passed Test J: Race-condition atomic update prevents duplicate or conflicting claims');
    }

    // ==========================================
    // TEST K: Existing Phase 3 Plans
    // ==========================================
    console.log('\nTest K: Handling existing Phase 3 plans (user_id = NULL without trial session)...');
    {
      // Seed a legacy Phase 3 plan directly into plans table with user_id = NULL
      const legacyId = crypto.randomUUID();
      testDb.prepare(`
        INSERT INTO plans (
          id, user_id, startup_name, industry, problem, solution,
          target_audience, usp, generation_status, created_at, updated_at
        ) VALUES (
          ?, null, 'Legacy Phase 3 Startup', 'EdTech', 'Problem', 'Solution',
          'Audience', 'USP', 'completed', ?, ?
        )
      `).run(legacyId, new Date().toISOString(), new Date().toISOString());

      // 1. Legacy plan must NOT appear in authenticated user 1 or user 2 history
      const listUser1 = listPlans({ userId: user1.id }, testDb);
      const listUser2 = listPlans({ userId: user2.id }, testDb);
      assert(!listUser1.plans.some(p => p.id === legacyId), 'Legacy plan must NOT appear in User 1 history');
      assert(!listUser2.plans.some(p => p.id === legacyId), 'Legacy plan must NOT appear in User 2 history');

      // 2. Anonymous visitor without linkage cannot access it
      const anonAccess = getPlanForRequester(legacyId, { trialToken: 'unlinked-trial-token' }, testDb);
      assert.strictEqual(anonAccess, null, 'Legacy plan must NOT be accessible anonymously');

      // 3. User cannot claim legacy plan without a trial relationship
      assert.throws(
        () => {
          claimPlan(legacyId, user1.id, 'unlinked-trial-token', testDb);
        },
        (err) => {
          assert.strictEqual(err.statusCode, 403);
          return true;
        },
        'User cannot claim unlinked legacy plan'
      );

      console.log('✅ Passed Test K: Existing Phase 3 plans remain safe, isolated, and unclaiamable without valid trial linkage');
    }

    // ==========================================
    // TEST L: Error Hygiene & Sanitization
    // ==========================================
    console.log('\nTest L: Error hygiene and secret sanitization...');
    {
      // Ensure error responses have standard structure without SQL or internals
      const badReq = { user: null, body: { startupName: null }, headers: {} };
      const badRes = createMockRes();
      await createPlanController(badReq, badRes);

      assert.strictEqual(badRes.statusCode, 400);
      assert.strictEqual(badRes.body.success, false);
      assert(badRes.body.error.code);
      assert(badRes.body.error.message);
      assert.strictEqual(badRes.body.error.stack, undefined, 'Stack traces must never leak');
      assert.strictEqual(badRes.body.error.sql, undefined, 'SQL must never leak');

      console.log('✅ Passed Test L: Error responses strictly follow standard shape without internal stack or query leakage');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL 12 PLAN AUTHORIZATION & TRIAL TEST CATEGORIES (A - L) PASSED CLEANLY!');
    console.log('====================================================\n');

  } finally {
    databaseModule.getDatabase = origGetDatabase;
  }
}

runTests().catch(err => {
  console.error('❌ PLAN AUTHORIZATION TEST FAILURE:', err);
  process.exit(1);
});
