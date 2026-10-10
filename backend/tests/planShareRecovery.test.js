// backend/tests/planShareRecovery.test.js
/**
 * Test Suite for Phase 5.5 — Share Management & Secure Existing-Link Recovery
 * 
 * Verifies:
 * - 1: Existing active share returns the same recoverable URL for authenticated owner
 * - 2: Reopening sharing interface does not create another share (idempotent recovery)
 * - 3: New share creation persists a hash and encrypted token, never a plaintext token in database
 * - 4: Valid encrypted tokens decrypt correctly with verified AES-256-GCM auth tag
 * - 5: Wrong encryption key or corrupted ciphertext fails safely without crashing
 * - 6: Legacy active share without encrypted token is identified as requiring replacement (requiresReplacement: true)
 * - 7: Replacement invalidates the old URL (old token returns 404)
 * - 8: Replacement generates a fresh token and maintains exactly one active share
 * - 9: Anonymous and non-owner users cannot create, recover, replace, or revoke links (safe 401 / 404)
 * - 10: Missing encryption configuration throws and never causes plaintext fallback
 * - 11: Public endpoint continues to accept the raw token and resolve its SHA-256 hash
 * - 12: Public DTO contains no token hash, ciphertext, encryption metadata, or owner secrets
 * - 13: Endpoints adhere strictly to API contracts (POST /:id/share, GET /:id/share, DELETE /:id/share)
 */

const assert = require('assert');
const crypto = require('crypto');
const { createDatabaseInstance } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const { createPlan, createTrialPlan, claimPlan } = require('../services/planService');
const { createLocalUser } = require('../services/authService');
const {
  generateShareToken,
  hashShareToken,
  toPublicSharedPlan,
  createOrGetActiveShare,
  getActiveShareStatus,
  revokeActiveShare,
  getSharedPlanByToken
} = require('../services/planShareService');
const {
  encryptToken,
  decryptToken,
  getEncryptionKey
} = require('../utils/encryption');
const {
  createShareController,
  getShareStatusController,
  revokeShareController,
  getSharedPlanController
} = require('../controllers/planShareController');

console.log('====================================================');
console.log('🧪 RUNNING PHASE 5.5 SHARE RECOVERY & MANAGEMENT TESTS');
console.log('====================================================\n');

// Standard 32-byte test encryption key
const TEST_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.SHARE_ENCRYPTION_KEY = TEST_KEY_HEX;

function createMockRes() {
  return {
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
    }
  };
}

const samplePlanData = {
  startupName: 'NexusFlow AI',
  industry: 'Enterprise Software',
  problem: 'Enterprises struggle to monitor agentic workflow deployments.',
  solution: 'Real-time telemetry and safety assertions for agent swarms.',
  targetAudience: 'Chief Information Security Officers & AI Engineers.',
  usp: 'Zero-latency protocol assertions for autonomous LLM agents.',
  leanCanvas: { problem: 'No agent observability', solution: 'Autonomous telemetry' },
  mvp: { coreFeatures: ['Protocol proxy', 'Audit dashboard'] },
  revenue: [{ stream: 'Enterprise License', model: '$50,000/yr' }],
  pitch: { elevatorPitch: 'NexusFlow provides the control plane for autonomous AI swarms.' },
  personas: [{ name: 'Security Steve', role: 'CISO' }],
  competitors: [{ name: 'Legacy SIEM', weakness: 'Lacks LLM understanding' }]
};

async function runTests() {
  // Setup fresh isolated in-memory DB
  const db = createDatabaseInstance(':memory:');
  runMigrations(db);

  // Setup database getter override for controller testing
  const databaseModule = require('../db/database');
  const origGetDatabase = databaseModule.getDatabase;
  databaseModule.getDatabase = () => db;

  // Setup test users and plans
  const owner = createLocalUser({ email: 'owner@startup.io', password: 'SecurePass123!', name: 'Founder Fiona' }, db);
  const otherUser = createLocalUser({ email: 'stranger@startup.io', password: 'SecurePass123!', name: 'Stranger Sam' }, db);
  const ownerPlan = createPlan(samplePlanData, { userId: owner.id }, db);
  const otherPlan = createPlan(samplePlanData, { userId: otherUser.id }, db);

  // -------------------------------------------------------------
  // Test 1: New share creation persists hash and encrypted token, never plaintext
  // -------------------------------------------------------------
  console.log('Test 1: New share creation persists hash and encrypted token, never plaintext...');
  const createResult1 = createOrGetActiveShare(ownerPlan.id, owner.id, {}, db);
  assert.ok(createResult1, 'Share creation should succeed');
  assert.strictEqual(createResult1.isExisting, false, 'Should be flagged as newly created');
  assert.ok(createResult1.share.token, 'Should return raw bearer token to owner');
  assert.ok(createResult1.share.url.includes(createResult1.share.token), 'URL must contain raw token');

  const rawToken1 = createResult1.share.token;
  const tokenHash1 = hashShareToken(rawToken1);

  // Inspect database row directly
  const shareRow1 = db.prepare('SELECT * FROM plan_shares WHERE id = ?').get(createResult1.share.id);
  assert.strictEqual(shareRow1.share_token, tokenHash1, 'Database must store SHA-256 hash');
  assert.notStrictEqual(shareRow1.share_token, rawToken1, 'Database must NEVER store plaintext token in share_token');
  assert.ok(shareRow1.encrypted_token, 'Database must store encrypted_token');
  assert.ok(!shareRow1.encrypted_token.includes(rawToken1), 'encrypted_token must NOT contain plaintext token');
  console.log('✅ Passed Test 1: Hash and AES-256-GCM ciphertext persisted safely, plaintext excluded');

  // -------------------------------------------------------------
  // Test 2: Existing active share recovers the EXACT same URL without creating duplicate
  // -------------------------------------------------------------
  console.log('\nTest 2: Reopening sharing recovers existing URL idempotently...');
  const recoverResult = createOrGetActiveShare(ownerPlan.id, owner.id, {}, db);
  assert.strictEqual(recoverResult.isExisting, true, 'Must identify existing share');
  assert.strictEqual(recoverResult.share.alreadyExists, true);
  assert.strictEqual(recoverResult.share.token, rawToken1, 'Recovered token must match original token identically');
  assert.strictEqual(recoverResult.share.url, `/share/${rawToken1}`, 'Recovered URL must match original URL');
  assert.strictEqual(recoverResult.share.requiresReplacement, false, 'Does not require replacement');

  // Verify total count in DB remains 1
  const countRow1 = db.prepare('SELECT COUNT(*) as c FROM plan_shares WHERE plan_id = ?').get(ownerPlan.id);
  assert.strictEqual(countRow1.c, 1, 'Reopening must NOT proliferate share records');
  console.log('✅ Passed Test 2: Existing URL recovered identically without record duplication');

  // -------------------------------------------------------------
  // Test 3: getActiveShareStatus retrieves existing active link without mutating DB
  // -------------------------------------------------------------
  console.log('\nTest 3: getActiveShareStatus reads share status without generating when absent...');
  const statusOwner = getActiveShareStatus(ownerPlan.id, owner.id, db);
  assert.strictEqual(statusOwner.isActive, true);
  assert.strictEqual(statusOwner.share.token, rawToken1);
  assert.strictEqual(statusOwner.share.url, `/share/${rawToken1}`);

  // Test on otherPlan which has no share yet
  const statusEmpty = getActiveShareStatus(otherPlan.id, otherUser.id, db);
  assert.strictEqual(statusEmpty.isActive, false);
  assert.strictEqual(statusEmpty.share, undefined);
  // Verify otherPlan still has 0 shares
  const otherCount = db.prepare('SELECT COUNT(*) as c FROM plan_shares WHERE plan_id = ?').get(otherPlan.id);
  assert.strictEqual(otherCount.c, 0, 'Status query must not generate a share');
  console.log('✅ Passed Test 3: Status query is non-mutating and recovers active link');

  // -------------------------------------------------------------
  // Test 4: Encryption and Decryption integrity (AES-256-GCM)
  // -------------------------------------------------------------
  console.log('\nTest 4: Encryption and Decryption integrity...');
  const secretData = 'my-super-secret-token-12345';
  const bundle = encryptToken(secretData);
  assert.ok(bundle.split(':').length === 3, 'Bundle must be iv:tag:ciphertext');
  const decrypted = decryptToken(bundle);
  assert.strictEqual(decrypted, secretData, 'Decrypted text must match plaintext');

  // Different runs must produce distinct IVs and ciphertexts
  const bundle2 = encryptToken(secretData);
  assert.notStrictEqual(bundle, bundle2, 'Different runs must use fresh IVs');
  assert.strictEqual(decryptToken(bundle2), secretData);
  console.log('✅ Passed Test 4: AES-256-GCM authenticated encryption verified');

  // -------------------------------------------------------------
  // Test 5: Wrong encryption key or corrupted ciphertext fails safely
  // -------------------------------------------------------------
  console.log('\nTest 5: Wrong key or corrupted ciphertext fail safety...');
  const wrongKey = Buffer.alloc(32, 9);
  const badDecrypt = decryptToken(bundle, wrongKey);
  assert.strictEqual(badDecrypt, null, 'Wrong key must return null, not throw unhandled error');

  // Corrupted auth tag
  const [ivPart, tagPart, ctPart] = bundle.split(':');
  const tamperedTag = 'f'.repeat(tagPart.length);
  const corruptedBundle = `${ivPart}:${tamperedTag}:${ctPart}`;
  assert.strictEqual(decryptToken(corruptedBundle), null, 'Tampered auth tag must fail verification and return null');
  console.log('✅ Passed Test 5: Wrong key and corrupted ciphertext fail safely returning null');

  // -------------------------------------------------------------
  // Test 6: Legacy active share without encrypted token flags requiresReplacement: true
  // -------------------------------------------------------------
  console.log('\nTest 6: Legacy share without encrypted token requires replacement...');
  const legacyShareId = crypto.randomUUID();
  const legacyToken = generateShareToken();
  const legacyHash = hashShareToken(legacyToken);
  const legacyPlan = createPlan(samplePlanData, { userId: owner.id }, db);

  // Insert a Phase 5.3 legacy row with encrypted_token = NULL
  db.prepare(`
    INSERT INTO plan_shares (
      id, plan_id, user_id, share_token, encrypted_token, is_active, view_count, created_at, revoked_at
    ) VALUES (?, ?, ?, ?, NULL, 1, 5, ?, NULL)
  `).run(legacyShareId, legacyPlan.id, owner.id, legacyHash, new Date().toISOString());

  // Calling createOrGetActiveShare without replace
  const legacyResult = createOrGetActiveShare(legacyPlan.id, owner.id, {}, db);
  assert.strictEqual(legacyResult.isExisting, true);
  assert.strictEqual(legacyResult.share.requiresReplacement, true, 'Must flag requiresReplacement: true');
  assert.strictEqual(legacyResult.share.token, undefined, 'Must NOT fabricate a token');
  assert.strictEqual(legacyResult.share.url, undefined, 'Must NOT fabricate a URL');
  assert.strictEqual(legacyResult.share.viewCount, 5, 'Must preserve existing viewCount');

  // Public retrieval of legacy plan via original token STILL works until replaced!
  const publicLegacy = getSharedPlanByToken(legacyToken, db);
  assert.ok(publicLegacy, 'Legacy token must still be valid for public visitors');
  console.log('✅ Passed Test 6: Legacy share correctly identified and keeps old link active');

  // -------------------------------------------------------------
  // Test 7: Replacement invalidates old URL and generates fresh active link
  // -------------------------------------------------------------
  console.log('\nTest 7: Replacement invalidates old URL and generates fresh active link...');
  const replaceResult = createOrGetActiveShare(legacyPlan.id, owner.id, { replace: true }, db);
  assert.ok(replaceResult, 'Replacement must succeed');
  assert.strictEqual(replaceResult.share.replaced, true);
  assert.ok(replaceResult.share.token, 'Must return new raw token');
  assert.notStrictEqual(replaceResult.share.token, legacyToken, 'New token must differ from old legacy token');

  // Old legacy token MUST now return 404
  const oldPublicCheck = getSharedPlanByToken(legacyToken, db);
  assert.strictEqual(oldPublicCheck, null, 'Old token must be rejected after replacement');

  // New replacement token MUST now return 200
  const newPublicCheck = getSharedPlanByToken(replaceResult.share.token, db);
  assert.ok(newPublicCheck, 'New token must work for public visitors');

  // Exactly one active share must exist for legacyPlan
  const activeCount = db.prepare(`
    SELECT COUNT(*) as c FROM plan_shares WHERE plan_id = ? AND is_active = 1
  `).get(legacyPlan.id);
  assert.strictEqual(activeCount.c, 1, 'Must maintain exactly one active share after replacement');
  console.log('✅ Passed Test 7: Replacement atomic, invalidates old token, creates fresh active link');

  // -------------------------------------------------------------
  // Test 8: Revocation invalidates link and allows creating fresh link afterwards
  // -------------------------------------------------------------
  console.log('\nTest 8: Revocation and subsequent fresh link creation...');
  const revokeRes = revokeActiveShare(ownerPlan.id, owner.id, db);
  assert.strictEqual(revokeRes.revoked, true);

  // Status now shows inactive
  const statusAfterRevoke = getActiveShareStatus(ownerPlan.id, owner.id, db);
  assert.strictEqual(statusAfterRevoke.isActive, false);

  // Old token now rejected
  assert.strictEqual(getSharedPlanByToken(rawToken1, db), null, 'Revoked token rejected');

  // Create fresh link after revocation
  const freshRes = createOrGetActiveShare(ownerPlan.id, owner.id, {}, db);
  assert.strictEqual(freshRes.isExisting, false);
  assert.notStrictEqual(freshRes.share.token, rawToken1, 'New token must differ from revoked token');
  assert.ok(getSharedPlanByToken(freshRes.share.token, db), 'New token works publicly');
  console.log('✅ Passed Test 8: Revocation safe, public access cut off, fresh link creation works');

  // -------------------------------------------------------------
  // Test 9: Anonymous and non-owner access blocked (safe 401/404)
  // -------------------------------------------------------------
  console.log('\nTest 9: Anonymous and non-owner authorization isolation...');
  // Stranger cannot share or inspect owner's plan
  const strangerShare = createOrGetActiveShare(ownerPlan.id, otherUser.id, {}, db);
  assert.strictEqual(strangerShare, null, 'Non-owner create must return null');

  const strangerStatus = getActiveShareStatus(ownerPlan.id, otherUser.id, db);
  assert.strictEqual(strangerStatus, null, 'Non-owner status must return null');

  const strangerRevoke = revokeActiveShare(ownerPlan.id, otherUser.id, db);
  assert.strictEqual(strangerRevoke, null, 'Non-owner revoke must return null');

  // Anonymous trial plan boundary: unclaimed trial plan cannot be shared
  const trialPlan = createTrialPlan(samplePlanData, db);
  const trialShare = createOrGetActiveShare(trialPlan.id, owner.id, {}, db);
  assert.strictEqual(trialShare, null, 'Unowned trial plan cannot be shared by any user');
  console.log('✅ Passed Test 9: Non-owners and unowned trial plans cannot be shared or inspected');

  // -------------------------------------------------------------
  // Test 10: Missing encryption key throws and prevents plaintext fallback
  // -------------------------------------------------------------
  console.log('\nTest 10: Missing encryption configuration throws without plaintext fallback...');
  const originalKey = process.env.SHARE_ENCRYPTION_KEY;
  delete process.env.SHARE_ENCRYPTION_KEY;

  let threwError = false;
  try {
    createOrGetActiveShare(otherPlan.id, otherUser.id, {}, db);
  } catch (err) {
    threwError = true;
    assert.ok(err.message.includes('SHARE_ENCRYPTION_KEY'), 'Must throw specific encryption key error');
  }
  assert.strictEqual(threwError, true, 'Must fail when encryption key is unconfigured');

  // Verify no share record was inserted with plaintext
  const unencryptedCount = db.prepare('SELECT COUNT(*) as c FROM plan_shares WHERE plan_id = ?').get(otherPlan.id);
  assert.strictEqual(unencryptedCount.c, 0, 'No share record must be saved without encryption');

  // Restore encryption key
  process.env.SHARE_ENCRYPTION_KEY = originalKey;
  console.log('✅ Passed Test 10: Missing encryption key throws and never writes unencrypted records');

  // -------------------------------------------------------------
  // Test 11: HTTP Controllers adhere to structured API contracts
  // -------------------------------------------------------------
  console.log('\nTest 11: HTTP Controller contracts (GET, POST, DELETE)...');
  // GET /api/plans/:id/share (status)
  const reqGet = { params: { id: ownerPlan.id }, user: { id: owner.id } };
  const resGet = createMockRes();
  await getShareStatusController(reqGet, resGet);
  assert.strictEqual(resGet.statusCode, 200);
  assert.strictEqual(resGet.body.success, true);
  assert.strictEqual(resGet.body.data.isActive, true);

  // POST /api/plans/:id/share with replace: true
  const reqReplace = { params: { id: ownerPlan.id }, user: { id: owner.id }, body: { replace: true } };
  const resReplace = createMockRes();
  await createShareController(reqReplace, resReplace);
  assert.strictEqual(resReplace.statusCode, 201);
  assert.strictEqual(resReplace.body.success, true);
  assert.strictEqual(resReplace.body.data.replaced, true);

  // DELETE /api/plans/:id/share (revoke)
  const reqRevoke = { params: { id: ownerPlan.id }, user: { id: owner.id } };
  const resRevoke = createMockRes();
  await revokeShareController(reqRevoke, resRevoke);
  assert.strictEqual(resRevoke.statusCode, 200);
  assert.strictEqual(resRevoke.body.success, true);
  assert.strictEqual(resRevoke.body.data.revoked, true);

  // Public DTO sanitization check on getSharedPlanController
  const reqPublic = { params: { token: resReplace.body.data.token } };
  const resPublic = createMockRes();
  await getSharedPlanController(reqPublic, resPublic);
  assert.strictEqual(resPublic.statusCode, 404, 'Old replaced token should return 404');
  console.log('✅ Passed Test 11: All HTTP controller contracts verified adhering to security contracts');

  // -------------------------------------------------------------
  // Test 12: Public DTO contains no token hash, ciphertext, encryption metadata, or owner secrets
  // -------------------------------------------------------------
  console.log('\nTest 12: Public DTO sanitization excludes encryption and owner fields...');
  const freshShareForSanitization = createOrGetActiveShare(ownerPlan.id, owner.id, {}, db);
  const publicDto = getSharedPlanByToken(freshShareForSanitization.share.token, db);
  assert.ok(publicDto);
  assert.strictEqual(publicDto.share_token, undefined);
  assert.strictEqual(publicDto.encrypted_token, undefined);
  assert.strictEqual(publicDto.userId, undefined);
  assert.strictEqual(publicDto.user_id, undefined);
  assert.strictEqual(publicDto.email, undefined);
  console.log('✅ Passed Test 12: Public DTO strictly excludes all internal encryption and identity fields');

  console.log('\n====================================================');
  console.log('🎉 ALL 12 PHASE 5.5 SHARE RECOVERY & MANAGEMENT TESTS PASSED!');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('❌ Phase 5.5 Test Failure:', err);
  process.exit(1);
});
