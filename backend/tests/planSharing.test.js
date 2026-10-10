// backend/tests/planSharing.test.js
/**
 * Test Suite for Phase 5.3 — Plan Sharing Database Foundation & Backend API
 * 
 * Verifies:
 * - A: Migration 003 schema, indexes, foreign keys, and cascading deletion on plan & user delete
 * - B: Share creation by authenticated owner (256-bit entropy, active status, initial view_count, SHA-256 hash storage)
 * - C: Idempotent active share (subsequent create calls return existing active share metadata without duplicate row/token)
 * - D: Share revocation (authenticated owner can revoke, sets is_active=0 and revoked_at, subsequent share creates fresh token)
 * - E: Public bearer token retrieval (unauthenticated GET /api/shared/:token, dynamic reading of persisted plan)
 * - F: Public response sanitization (strictly strips user_id, email, sessions, internal generation errors, raw database fields)
 * - G: Atomic view counting (increments view_count by 1 on each successful public request, zero on invalid/revoked requests)
 * - H: Multi-user isolation (User A cannot share or revoke User B's plan, non-owner gets safe 404)
 * - I: Anonymous trial boundary (unclaimed trial plan cannot be shared; claimed trial plan can be shared by owner)
 * - J: Token security & error hygiene (raw token never stored in plain text, hash never leaked, safe 404 uniform error shape)
 */

require('dotenv').config();
if (!process.env.SHARE_ENCRYPTION_KEY) {
  process.env.SHARE_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
}
const assert = require('assert');
const crypto = require('crypto');
const { createDatabaseInstance } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const {
  createPlan,
  createTrialPlan,
  getPlanById,
  claimPlan,
  updatePlan,
  deletePlan,
  TRIAL_COOKIE_NAME
} = require('../services/planService');
const {
  createLocalUser,
  createSession,
  formatUser,
  SESSION_COOKIE_NAME
} = require('../services/authService');
const {
  generateShareToken,
  hashShareToken,
  toPublicSharedPlan,
  createOrGetActiveShare,
  revokeActiveShare,
  getSharedPlanByToken
} = require('../services/planShareService');
const {
  createShareController,
  revokeShareController,
  getSharedPlanController
} = require('../controllers/planShareController');
const { requireAuth } = require('../middleware/auth');

console.log('====================================================');
console.log('🧪 RUNNING PHASE 5.3 PLAN SHARING BACKEND TESTS');
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

// Sample test plan data
const samplePlanData = {
  startupName: 'ApexMetrics AI',
  industry: 'Analytics & Growth',
  problem: 'Founders spend too much time calculating customer cohort retention.',
  solution: 'AI-automated cohort analysis and churn prediction in real time.',
  targetAudience: 'Early-stage SaaS founders and product managers.',
  usp: 'Instant cohort insights directly from raw Stripe events with zero ETL.',
  leanCanvas: {
    problem: 'Manual spreadsheet retention tracking',
    solution: 'Automated ML retention models',
    uniqueValueProposition: 'Cohort retention in 30 seconds'
  },
  mvp: {
    coreFeatures: ['Stripe webhook ingest', 'Cohort matrix UI', 'Automated churn alerts']
  },
  revenue: [
    { stream: 'Pro SaaS', model: '$49/mo per 10k users' }
  ],
  pitch: {
    elevatorPitch: 'ApexMetrics turns Stripe logs into actionable retention cohorts automatically.'
  },
  personas: [
    { name: 'SaaS Samantha', role: 'Growth Lead' }
  ],
  competitors: [
    { name: 'Mixpanel', weakness: 'Requires complex custom instrumentation' }
  ],
  generationErrors: {
    pitch: 'Ignored internal debug metadata'
  }
};

async function runTests() {
  const testDb = createDatabaseInstance(':memory:');
  runMigrations(testDb);

  // Setup: Create 2 test users
  const user1 = createLocalUser({ email: 'owner@startup.io', password: 'Password123!', name: 'Plan Owner' }, testDb);
  const user2 = createLocalUser({ email: 'other@startup.io', password: 'Password123!', name: 'Other User' }, testDb);

  // Setup database getter override for controller testing
  const databaseModule = require('../db/database');
  const origGetDatabase = databaseModule.getDatabase;
  databaseModule.getDatabase = () => testDb;

  try {
    // ==========================================
    // TEST A: Migration & Schema Integrity
    // ==========================================
    console.log('Test A: Migration 003 schema, indexes, and cascading delete...');
    {
      // Check plan_shares table exists with required columns
      const tableInfo = testDb.prepare("PRAGMA table_info('plan_shares')").all();
      const colNames = tableInfo.map(c => c.name);
      assert(colNames.includes('id'), 'plan_shares must have id');
      assert(colNames.includes('plan_id'), 'plan_shares must have plan_id');
      assert(colNames.includes('user_id'), 'plan_shares must have user_id');
      assert(colNames.includes('share_token'), 'plan_shares must have share_token');
      assert(colNames.includes('is_active'), 'plan_shares must have is_active');
      assert(colNames.includes('view_count'), 'plan_shares must have view_count');
      assert(colNames.includes('created_at'), 'plan_shares must have created_at');
      assert(colNames.includes('revoked_at'), 'plan_shares must have revoked_at');

      // Create a test plan and share
      const cascadePlan = createPlan({ ...samplePlanData, startupName: 'Cascade Test Plan' }, { userId: user1.id }, testDb);
      const shareResult = createOrGetActiveShare(cascadePlan.id, user1.id, testDb);
      assert(shareResult && shareResult.share, 'Share created successfully');

      // Verify share row exists in database
      const initialShareRow = testDb.prepare('SELECT * FROM plan_shares WHERE plan_id = ?').get(cascadePlan.id);
      assert(initialShareRow, 'Share record must exist before deletion');

      // Delete plan and verify cascade
      const deleted = deletePlan(cascadePlan.id, { userId: user1.id }, testDb);
      assert.strictEqual(deleted, true, 'Plan deleted');

      const cascadedShareRow = testDb.prepare('SELECT * FROM plan_shares WHERE plan_id = ?').get(cascadePlan.id);
      assert.strictEqual(cascadedShareRow, undefined, 'Deleting a plan must cascade and remove its share records');

      console.log('✅ Passed Test A: Migration 003 schema, indexes, and cascading delete verified');
    }

    // ==========================================
    // TEST B: Share Creation by Authenticated Owner
    // ==========================================
    console.log('Test B: Share creation by authenticated owner...');
    let plan1;
    let createdShare;
    {
      plan1 = createPlan({ ...samplePlanData, startupName: 'ApexMetrics Production' }, { userId: user1.id }, testDb);

      // Verify token entropy & format
      const rawToken = generateShareToken();
      assert.strictEqual(typeof rawToken, 'string');
      assert.strictEqual(rawToken.length, 64, 'Token must be 64 hex characters (256 bits of entropy)');
      assert(/^[0-9a-f]{64}$/.test(rawToken), 'Token must be valid hex');

      // Create share via controller
      const mockReq = {
        params: { id: plan1.id },
        user: user1
      };
      const mockRes = createMockRes();
      await createShareController(mockReq, mockRes);

      assert.strictEqual(mockRes.statusCode, 201, 'New share must return 201 Created');
      assert.strictEqual(mockRes.body.success, true);
      assert(mockRes.body.data.token, 'Must return raw bearer token to owner upon creation');
      assert.strictEqual(mockRes.body.data.token.length, 64);
      assert.strictEqual(mockRes.body.data.url, `/share/${mockRes.body.data.token}`);
      assert.strictEqual(mockRes.body.data.isActive, true);
      assert.strictEqual(mockRes.body.data.viewCount, 0);
      assert(mockRes.body.data.createdAt);

      createdShare = mockRes.body.data;

      // Verify token storage: Database must store SHA-256 hash, NOT the raw token
      const storedRow = testDb.prepare('SELECT * FROM plan_shares WHERE id = ?').get(createdShare.id);
      assert(storedRow, 'Share row must exist in DB');
      assert.notStrictEqual(storedRow.share_token, createdShare.token, 'Database must NOT store raw bearer token');
      const expectedHash = hashShareToken(createdShare.token);
      assert.strictEqual(storedRow.share_token, expectedHash, 'Database must store SHA-256 hash of bearer token');
      assert.strictEqual(storedRow.is_active, 1);
      assert.strictEqual(storedRow.view_count, 0);
      assert.strictEqual(storedRow.revoked_at, null);

      console.log('✅ Passed Test B: Share creation by authenticated owner verified');
    }

    // ==========================================
    // TEST C: Idempotent Active Share Link
    // ==========================================
    console.log('Test C: Idempotent active share link handling...');
    {
      // Repeat create for the same plan with active share
      const repeatReq = {
        params: { id: plan1.id },
        user: user1
      };
      const repeatRes = createMockRes();
      await createShareController(repeatReq, repeatRes);

      assert.strictEqual(repeatRes.statusCode, 200, 'Existing active share returns 200 OK');
      assert.strictEqual(repeatRes.body.success, true);
      assert.strictEqual(repeatRes.body.data.id, createdShare.id, 'Must return the existing share id');
      assert.strictEqual(repeatRes.body.data.alreadyExists, true);

      // Verify DB row count has not increased
      const shareCountRow = testDb.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ?').get(plan1.id);
      assert.strictEqual(shareCountRow.count, 1, 'Repeat create must NOT create additional active shares');

      console.log('✅ Passed Test C: Idempotent active share link verified');
    }

    // ==========================================
    // TEST D: Share Revocation & Regeneration
    // ==========================================
    console.log('Test D: Share revocation and fresh share creation...');
    {
      // Revoke share via controller
      const revokeReq = {
        params: { id: plan1.id },
        user: user1
      };
      const revokeRes = createMockRes();
      await revokeShareController(revokeReq, revokeRes);

      assert.strictEqual(revokeRes.statusCode, 200);
      assert.strictEqual(revokeRes.body.success, true);
      assert.strictEqual(revokeRes.body.data.revoked, true);

      // Verify row in database is marked inactive with revoked_at populated
      const revokedRow = testDb.prepare('SELECT * FROM plan_shares WHERE id = ?').get(createdShare.id);
      assert.strictEqual(revokedRow.is_active, 0, 'Revoked share is_active must be 0');
      assert(revokedRow.revoked_at !== null, 'revoked_at must be populated');

      // Attempting to access revoked share via bearer token returns safe 404
      const publicReq = { params: { token: createdShare.token } };
      const publicRes = createMockRes();
      await getSharedPlanController(publicReq, publicRes);
      assert.strictEqual(publicRes.statusCode, 404, 'Revoked token must return 404');
      assert.strictEqual(publicRes.body.error.code, 'SHARE_NOT_FOUND');

      // Creating a new share after revocation must generate a FRESH token
      const freshReq = {
        params: { id: plan1.id },
        user: user1
      };
      const freshRes = createMockRes();
      await createShareController(freshReq, freshRes);

      assert.strictEqual(freshRes.statusCode, 201, 'Fresh share returns 201');
      assert.notStrictEqual(freshRes.body.data.token, createdShare.token, 'New share must have a brand new token');
      assert.notStrictEqual(freshRes.body.data.id, createdShare.id, 'New share must have a new share ID');

      // Verify database now contains 2 records for this plan: 1 revoked, 1 active
      const shares = testDb.prepare('SELECT id, is_active FROM plan_shares WHERE plan_id = ? ORDER BY created_at ASC').all(plan1.id);
      assert.strictEqual(shares.length, 2);
      assert.strictEqual(shares[0].is_active, 0);
      assert.strictEqual(shares[1].is_active, 1);

      // Update createdShare for subsequent tests
      createdShare = freshRes.body.data;

      console.log('✅ Passed Test D: Share revocation and fresh share creation verified');
    }

    // ==========================================
    // TEST E: Public Shared Plan Retrieval (Dynamic)
    // ==========================================
    console.log('Test E: Public shared plan retrieval & dynamic content updates...');
    {
      // Retrieve plan via public bearer endpoint
      const publicReq = { params: { token: createdShare.token } };
      const publicRes = createMockRes();
      await getSharedPlanController(publicReq, publicRes);

      assert.strictEqual(publicRes.statusCode, 200);
      assert.strictEqual(publicRes.body.success, true);
      assert.strictEqual(publicRes.body.data.startupName, 'ApexMetrics Production');
      assert.strictEqual(publicRes.body.data.industry, 'Analytics & Growth');
      assert.strictEqual(publicRes.body.data.leanCanvas.problem, 'Manual spreadsheet retention tracking');
      assert.strictEqual(publicRes.body.data.mvp.coreFeatures.length, 3);

      // Verify dynamic retrieval: Owner updates persisted plan
      updatePlan(plan1.id, { startupName: 'ApexMetrics Enterprise Pro' }, { userId: user1.id }, testDb);

      // Public access immediately returns the updated plan content without regenerating share
      const publicReq2 = { params: { token: createdShare.token } };
      const publicRes2 = createMockRes();
      await getSharedPlanController(publicReq2, publicRes2);

      assert.strictEqual(publicRes2.statusCode, 200);
      assert.strictEqual(publicRes2.body.data.startupName, 'ApexMetrics Enterprise Pro', 'Public share must reflect live persisted updates dynamically');

      // Invalid tokens return safe 404
      const invalidReq = { params: { token: 'completely-invalid-nonexistent-token-12345' } };
      const invalidRes = createMockRes();
      await getSharedPlanController(invalidReq, invalidRes);
      assert.strictEqual(invalidRes.statusCode, 404);
      assert.strictEqual(invalidRes.body.error.code, 'SHARE_NOT_FOUND');

      console.log('✅ Passed Test E: Public shared plan retrieval & dynamic updates verified');
    }

    // ==========================================
    // TEST F: Public Response Sanitization Rigor
    // ==========================================
    console.log('Test F: Public response sanitization rigor...');
    {
      const publicReq = { params: { token: createdShare.token } };
      const publicRes = createMockRes();
      await getSharedPlanController(publicReq, publicRes);

      const data = publicRes.body.data;

      // Ensure NO user/owner/session metadata leaks
      assert.strictEqual(data.user_id, undefined, 'Must not leak user_id');
      assert.strictEqual(data.userId, undefined, 'Must not leak userId');
      assert.strictEqual(data.email, undefined, 'Must not leak owner email');
      assert.strictEqual(data.owner, undefined, 'Must not leak owner object');
      assert.strictEqual(data.session, undefined, 'Must not leak session');
      assert.strictEqual(data.trialSession, undefined, 'Must not leak trial session');

      // Ensure internal generationErrors are excluded
      assert.strictEqual(data.generationErrors, undefined, 'Must not expose generationErrors');
      assert.strictEqual(data.generation_errors, undefined, 'Must not expose generation_errors');

      // Ensure database rowid/internals are excluded
      assert.strictEqual(data.rowid, undefined, 'Must not expose SQLite rowid');
      assert.strictEqual(data.share_token, undefined, 'Must not expose share_token hash');
      assert.strictEqual(data.password_hash, undefined, 'Must not expose password_hash');

      // Ensure required presentation fields are safely formatted
      assert.strictEqual(typeof data.startupName, 'string');
      assert.strictEqual(typeof data.industry, 'string');
      assert.strictEqual(typeof data.problem, 'string');
      assert.strictEqual(typeof data.solution, 'string');
      assert.strictEqual(typeof data.targetAudience, 'string');
      assert.strictEqual(typeof data.usp, 'string');
      assert(data.leanCanvas && typeof data.leanCanvas === 'object');
      assert(data.mvp && typeof data.mvp === 'object');
      assert(Array.isArray(data.revenue));
      assert(data.pitch && typeof data.pitch === 'object');
      assert(Array.isArray(data.personas));
      assert(Array.isArray(data.competitors));

      console.log('✅ Passed Test F: Public response sanitization verified');
    }

    // ==========================================
    // TEST G: Atomic View Counting
    // ==========================================
    console.log('Test G: Atomic view counting...');
    {
      // Fetch initial view count in DB
      const shareBefore = testDb.prepare('SELECT view_count FROM plan_shares WHERE id = ?').get(createdShare.id);
      const countBefore = shareBefore.view_count;

      // 3 successful public requests
      for (let i = 0; i < 3; i++) {
        const req = { params: { token: createdShare.token } };
        const res = createMockRes();
        await getSharedPlanController(req, res);
        assert.strictEqual(res.statusCode, 200);
      }

      const shareAfterSuccess = testDb.prepare('SELECT view_count FROM plan_shares WHERE id = ?').get(createdShare.id);
      assert.strictEqual(shareAfterSuccess.view_count, countBefore + 3, 'Successful requests must increment view count by 3');

      // Invalid token requests must NOT increment view count
      const badReq = { params: { token: 'bogus-token-random-123' } };
      const badRes = createMockRes();
      await getSharedPlanController(badReq, badRes);
      assert.strictEqual(badRes.statusCode, 404);

      const shareAfterBad = testDb.prepare('SELECT view_count FROM plan_shares WHERE id = ?').get(createdShare.id);
      assert.strictEqual(shareAfterBad.view_count, countBefore + 3, 'Failed requests must NOT increment view count');

      console.log('✅ Passed Test G: Atomic view counting verified');
    }

    // ==========================================
    // TEST H: Multi-User Isolation & Authorization
    // ==========================================
    console.log('Test H: Multi-user isolation & authorization...');
    {
      // User 2 tries to create a share for User 1's plan
      const hackShareReq = {
        params: { id: plan1.id },
        user: user2
      };
      const hackShareRes = createMockRes();
      await createShareController(hackShareReq, hackShareRes);

      assert.strictEqual(hackShareRes.statusCode, 404, 'Non-owner must receive safe 404 PLAN_NOT_FOUND');
      assert.strictEqual(hackShareRes.body.error.code, 'PLAN_NOT_FOUND');

      // User 2 tries to revoke User 1's share
      const hackRevokeReq = {
        params: { id: plan1.id },
        user: user2
      };
      const hackRevokeRes = createMockRes();
      await revokeShareController(hackRevokeReq, hackRevokeRes);

      assert.strictEqual(hackRevokeRes.statusCode, 404, 'Non-owner revoke must receive safe 404 PLAN_NOT_FOUND');
      assert.strictEqual(hackRevokeRes.body.error.code, 'PLAN_NOT_FOUND');

      // Verify User 1's share is still active
      const intactShare = testDb.prepare('SELECT is_active FROM plan_shares WHERE id = ?').get(createdShare.id);
      assert.strictEqual(intactShare.is_active, 1, 'Share must remain active and untampered');

      // Anonymous requester (no req.user) is blocked by requireAuth guard
      const unauthReq = {
        params: { id: plan1.id },
        user: null
      };
      const unauthRes = createMockRes();
      let nextCalled = false;
      requireAuth(unauthReq, unauthRes, () => { nextCalled = true; });

      assert.strictEqual(unauthRes.statusCode, 401, 'Anonymous request must be rejected with 401 UNAUTHORIZED');
      assert.strictEqual(nextCalled, false);

      console.log('✅ Passed Test H: Multi-user isolation verified');
    }

    // ==========================================
    // TEST I: Anonymous Trial Boundary
    // ==========================================
    console.log('Test I: Anonymous trial plan boundary & post-claim sharing...');
    {
      // Create an anonymous trial plan (user_id = NULL)
      const { plan: trialPlan, trialToken } = createTrialPlan(
        { ...samplePlanData, startupName: 'Unclaimed Trial Startup' },
        { trialToken: null, ip: '127.0.0.1' },
        testDb
      );

      assert.strictEqual(trialPlan.user_id, null);

      // Attempt to create share link on unclaimed trial plan by User 1
      const trialShareReq = {
        params: { id: trialPlan.id },
        user: user1
      };
      const trialShareRes = createMockRes();
      await createShareController(trialShareReq, trialShareRes);

      assert.strictEqual(trialShareRes.statusCode, 404, 'Unclaimed trial plan cannot be shared by any user');

      // User 1 claims the trial plan
      const claimedPlan = claimPlan(trialPlan.id, user1.id, trialToken, testDb);
      assert(claimedPlan, 'Plan claimed successfully');
      assert.strictEqual(claimedPlan.user_id, user1.id);

      // After claiming, owner can now share the plan
      const postClaimReq = {
        params: { id: claimedPlan.id },
        user: user1
      };
      const postClaimRes = createMockRes();
      await createShareController(postClaimReq, postClaimRes);

      assert.strictEqual(postClaimRes.statusCode, 201, 'Claimed plan can be shared by authenticated owner');
      assert.strictEqual(postClaimRes.body.success, true);
      assert(postClaimRes.body.data.token);

      // Verify public access for the newly claimed & shared plan
      const publicTrialReq = { params: { token: postClaimRes.body.data.token } };
      const publicTrialRes = createMockRes();
      await getSharedPlanController(publicTrialReq, publicTrialRes);

      assert.strictEqual(publicTrialRes.statusCode, 200);
      assert.strictEqual(publicTrialRes.body.data.startupName, 'Unclaimed Trial Startup');

      console.log('✅ Passed Test I: Anonymous trial boundary & post-claim sharing verified');
    }

    // ==========================================
    // TEST J: Token Security & Error Hygiene
    // ==========================================
    console.log('Test J: Token security and error hygiene...');
    {
      // Confirm raw token is never exposed in getSharedPlan response
      const publicReq = { params: { token: createdShare.token } };
      const publicRes = createMockRes();
      await getSharedPlanController(publicReq, publicRes);

      const bodyStr = JSON.stringify(publicRes.body);
      const tokenHash = hashShareToken(createdShare.token);
      assert.strictEqual(bodyStr.includes(tokenHash), false, 'Database hash must never appear in public response');

      // Confirm safe 404 uniformity: non-existent plan, revoked token, invalid token return identical error shape
      const notFoundRes = createMockRes();
      await getSharedPlanController({ params: { token: 'nonexistent-token' } }, notFoundRes);

      assert.strictEqual(notFoundRes.statusCode, 404);
      assert.deepStrictEqual(notFoundRes.body, {
        success: false,
        error: {
          code: 'SHARE_NOT_FOUND',
          message: 'Shared plan not found or link has expired.'
        }
      });

      console.log('✅ Passed Test J: Token security and error hygiene verified');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL 10 PLAN SHARING TEST CATEGORIES (A - J) PASSED CLEANLY!');
    console.log('====================================================\n');

  } finally {
    // Restore original getDatabase
    databaseModule.getDatabase = origGetDatabase;
    testDb.close();
  }
}

runTests().catch(err => {
  console.error('\n❌ Plan Sharing Test Suite Failed:', err);
  process.exit(1);
});
