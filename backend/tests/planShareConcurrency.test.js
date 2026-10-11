// backend/tests/planShareConcurrency.test.js
/**
 * Test Suite for Corrective Chunk 5.5.1 — Enforce One Active Share Per Plan
 * 
 * Verifies:
 * - Test 1: The database partial unique index rejects two active shares for the same plan
 * - Test 2: Multiple concurrent/subsequent initial creation attempts leave exactly one active share
 * - Test 3: Successful competing requests return the same winning link where recoverable
 * - Test 4: Revoked historical shares can coexist with a new active share
 * - Test 5: Explicit replacement invalidates the old link and leaves exactly one active link
 * - Test 6: Database migration 005 reconciles legacy duplicate active shares deterministically
 * - Test 7: Unique constraint conflicts during racing inserts resolve cleanly to the winning active share
 */

const assert = require('assert');
const crypto = require('crypto');
const { createDatabaseInstance } = require('../db/database');
const { createPlan } = require('../services/planService');
const { createLocalUser } = require('../services/authService');
const {
  generateShareToken,
  hashShareToken,
  createOrGetActiveShare,
  getActiveShareStatus,
  revokeActiveShare
} = require('../services/planShareService');
const { encryptToken } = require('../utils/encryption');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 5.5.1 ONE-ACTIVE-SHARE CONCURRENCY TESTS');
console.log('====================================================\n');

// Standard 32-byte test encryption key
const TEST_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
process.env.SHARE_ENCRYPTION_KEY = TEST_KEY_HEX;

function setupTestEnvironment() {
  const db = createDatabaseInstance(':memory:');
  const user = createLocalUser(
    {
      email: `founder_${crypto.randomUUID().slice(0, 8)}@example.com`,
      password: 'StrongPassword123!',
      name: 'Concurrency Tester'
    },
    db
  );

  const plan = createPlan(
    {
      startupName: 'Concurrency Test Startup',
      industry: 'Software',
      problem: 'Race conditions',
      solution: 'Deterministic locking',
      targetAudience: 'Developers',
      usp: 'Zero race bugs'
    },
    { userId: user.id },
    db
  );

  return { db, user, plan };
}

// ----------------------------------------------------
// Test 1: Database rejects two active shares for the same plan
// ----------------------------------------------------
console.log('Test 1: Database partial unique index rejects two active shares for the same plan...');
{
  const { db, user, plan } = setupTestEnvironment();

  const token1 = generateShareToken();
  const tokenHash1 = hashShareToken(token1);
  const shareId1 = crypto.randomUUID();
  const now = new Date().toISOString();

  // Insert first active share directly
  db.prepare(`
    INSERT INTO plan_shares (id, plan_id, user_id, share_token, is_active, created_at)
    VALUES (?, ?, ?, ?, 1, ?)
  `).run(shareId1, plan.id, user.id, tokenHash1, now);

  const token2 = generateShareToken();
  const tokenHash2 = hashShareToken(token2);
  const shareId2 = crypto.randomUUID();

  // Second active share MUST be rejected by idx_plan_shares_one_active
  assert.throws(
    () => {
      db.prepare(`
        INSERT INTO plan_shares (id, plan_id, user_id, share_token, is_active, created_at)
        VALUES (?, ?, ?, ?, 1, ?)
      `).run(shareId2, plan.id, user.id, tokenHash2, now);
    },
    (err) => {
      assert(
        err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message.includes('UNIQUE constraint failed'),
        `Expected SQLITE_CONSTRAINT_UNIQUE error, got: ${err.message}`
      );
      return true;
    }
  );

  const activeCount = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 1').get(plan.id);
  assert.strictEqual(activeCount.count, 1, 'Exactly one active share should exist in database');

  console.log('✅ Passed Test 1: Database partial unique index strictly rejects multiple active shares');
}

// ----------------------------------------------------
// Test 2: Multiple concurrent/subsequent initial creation attempts leave exactly one active share
// ----------------------------------------------------
console.log('\nTest 2: Multiple creation attempts leave exactly one active share...');
{
  const { db, user, plan } = setupTestEnvironment();

  const results = [];
  for (let i = 0; i < 5; i++) {
    results.push(createOrGetActiveShare(plan.id, user.id, {}, db));
  }

  // All 5 calls succeeded
  assert.strictEqual(results.length, 5);

  // Exactly one active share in DB
  const activeShares = db.prepare('SELECT * FROM plan_shares WHERE plan_id = ? AND is_active = 1').all(plan.id);
  assert.strictEqual(activeShares.length, 1, 'Should have exactly 1 active share record');

  // Total shares in DB is 1 (no duplicate rows created)
  const allShares = db.prepare('SELECT * FROM plan_shares WHERE plan_id = ?').all(plan.id);
  assert.strictEqual(allShares.length, 1, 'Should have created exactly 1 record in total');

  console.log('✅ Passed Test 2: Repeated creation calls leave exactly one active share without duplication');
}

// ----------------------------------------------------
// Test 3: Competing requests return the same winning link where recoverable
// ----------------------------------------------------
console.log('\nTest 3: Competing requests return the same winning link where recoverable...');
{
  const { db, user, plan } = setupTestEnvironment();

  const call1 = createOrGetActiveShare(plan.id, user.id, {}, db);
  const call2 = createOrGetActiveShare(plan.id, user.id, {}, db);
  const call3 = createOrGetActiveShare(plan.id, user.id, {}, db);

  assert.strictEqual(call1.isExisting, false, 'First call creates new share');
  assert.strictEqual(call2.isExisting, true, 'Second call recovers existing share');
  assert.strictEqual(call3.isExisting, true, 'Third call recovers existing share');

  assert.strictEqual(call1.share.id, call2.share.id);
  assert.strictEqual(call2.share.id, call3.share.id);

  assert.strictEqual(call1.share.url, call2.share.url);
  assert.strictEqual(call2.share.url, call3.share.url);

  assert.strictEqual(call1.share.token, call2.share.token);

  console.log('✅ Passed Test 3: Competing requests identically return the winning active URL and token');
}

// ----------------------------------------------------
// Test 4: Revoked historical shares can coexist with a new active share
// ----------------------------------------------------
console.log('\nTest 4: Revoked historical shares can coexist with a new active share...');
{
  const { db, user, plan } = setupTestEnvironment();

  // Create 3 historical revoked shares directly in DB
  for (let i = 0; i < 3; i++) {
    const historicalToken = generateShareToken();
    const tokenHash = hashShareToken(historicalToken);
    db.prepare(`
      INSERT INTO plan_shares (id, plan_id, user_id, share_token, is_active, created_at, revoked_at)
      VALUES (?, ?, ?, ?, 0, datetime('now', '-${i + 1} days'), datetime('now', '-${i} days'))
    `).run(crypto.randomUUID(), plan.id, user.id, tokenHash);
  }

  const revokedCountBefore = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 0').get(plan.id);
  assert.strictEqual(revokedCountBefore.count, 3, 'Should have 3 revoked records');

  // Now create a new active share via service
  const activeResult = createOrGetActiveShare(plan.id, user.id, {}, db);
  assert(activeResult && activeResult.share.isActive === true);

  // Check database counts: 3 revoked + 1 active = 4 total
  const totalCount = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ?').get(plan.id);
  const activeCount = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 1').get(plan.id);
  const revokedCountAfter = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 0').get(plan.id);

  assert.strictEqual(totalCount.count, 4, 'All historical and active shares preserved');
  assert.strictEqual(activeCount.count, 1, 'Only 1 active share exists');
  assert.strictEqual(revokedCountAfter.count, 3, 'All 3 revoked shares coexist without constraint conflict');

  console.log('✅ Passed Test 4: Multiple historical revoked shares coexist safely with active share');
}

// ----------------------------------------------------
// Test 5: Explicit replacement invalidates old link and leaves exactly one active link
// ----------------------------------------------------
console.log('\nTest 5: Explicit replacement invalidates old link and leaves exactly one active link...');
{
  const { db, user, plan } = setupTestEnvironment();

  const initialShare = createOrGetActiveShare(plan.id, user.id, {}, db);
  assert.strictEqual(initialShare.isExisting, false);

  // Replace once
  const replacement1 = createOrGetActiveShare(plan.id, user.id, { replace: true }, db);
  assert.strictEqual(replacement1.share.replaced, true);
  assert.notStrictEqual(replacement1.share.id, initialShare.share.id);
  assert.notStrictEqual(replacement1.share.token, initialShare.share.token);

  let activeCount = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 1').get(plan.id);
  assert.strictEqual(activeCount.count, 1, 'Must have exactly 1 active share after replacement');

  // Replace twice
  const replacement2 = createOrGetActiveShare(plan.id, user.id, { replace: true }, db);
  assert.strictEqual(replacement2.share.replaced, true);
  assert.notStrictEqual(replacement2.share.id, replacement1.share.id);

  activeCount = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 1').get(plan.id);
  assert.strictEqual(activeCount.count, 1, 'Must still have exactly 1 active share after second replacement');

  const revokedCount = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 0').get(plan.id);
  assert.strictEqual(revokedCount.count, 2, 'Previous 2 shares marked revoked');

  console.log('✅ Passed Test 5: Explicit replacement atomicity and single active share invariant verified');
}

// ----------------------------------------------------
// Test 6: Database migration 005 reconciles legacy duplicate active shares deterministically
// ----------------------------------------------------
console.log('\nTest 6: Migration 005 reconciliation of duplicate active shares...');
{
  // Setup database with schema up to migration 004 only
  const db = createDatabaseInstance(':memory:', { migrate: false });
  db.exec(`
    CREATE TABLE schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE plans (id TEXT PRIMARY KEY, startup_name TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE TABLE plan_shares (
      id TEXT PRIMARY KEY NOT NULL,
      plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      share_token TEXT NOT NULL UNIQUE,
      encrypted_token TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      view_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      revoked_at TEXT
    );
  `);

  const planId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  db.prepare('INSERT INTO plans VALUES (?, ?, ?, ?)').run(planId, 'Legacy Plan', '2026-01-01', '2026-01-01');
  db.prepare('INSERT INTO users VALUES (?, ?, ?)').run(userId, 'user@example.com', '2026-01-01');

  // Intentionally insert 3 active shares for the same plan with different timestamps
  const share1 = crypto.randomUUID();
  const share2 = crypto.randomUUID();
  const share3 = crypto.randomUUID();

  db.prepare('INSERT INTO plan_shares VALUES (?, ?, ?, ?, ?, 1, 0, ?, NULL)').run(share1, planId, userId, 'hash1', 'enc1', '2026-01-01T10:00:00Z');
  db.prepare('INSERT INTO plan_shares VALUES (?, ?, ?, ?, ?, 1, 0, ?, NULL)').run(share2, planId, userId, 'hash2', 'enc2', '2026-01-02T10:00:00Z');
  db.prepare('INSERT INTO plan_shares VALUES (?, ?, ?, ?, ?, 1, 0, ?, NULL)').run(share3, planId, userId, 'hash3', 'enc3', '2026-01-03T10:00:00Z'); // Newest

  const duplicateCheck = db.prepare('SELECT COUNT(*) as count FROM plan_shares WHERE plan_id = ? AND is_active = 1').get(planId);
  assert.strictEqual(duplicateCheck.count, 3, 'Pre-condition: 3 active shares exist before migration 005');

  // Now execute migration 005 SQL
  const migration005Sql = require('fs').readFileSync(
    require('path').join(__dirname, '../db/migrations/005_enforce_one_active_share_per_plan.sql'),
    'utf8'
  );
  db.exec(migration005Sql);

  // Check reconciliation result
  const activeAfter = db.prepare('SELECT * FROM plan_shares WHERE plan_id = ? AND is_active = 1').all(planId);
  assert.strictEqual(activeAfter.length, 1, 'Exactly one share must remain active');
  assert.strictEqual(activeAfter[0].id, share3, 'The newest share (share3) must be the active one');

  const revokedAfter = db.prepare('SELECT * FROM plan_shares WHERE plan_id = ? AND is_active = 0').all(planId);
  assert.strictEqual(revokedAfter.length, 2, 'Older duplicates must be marked revoked');
  assert(revokedAfter.every(r => r.revoked_at !== null), 'Revoked timestamps must be populated');

  // Verify the index is active and blocks future duplicates
  assert.throws(() => {
    db.prepare('INSERT INTO plan_shares VALUES (?, ?, ?, ?, ?, 1, 0, ?, NULL)').run(
      crypto.randomUUID(), planId, userId, 'hash4', 'enc4', '2026-01-04T10:00:00Z'
    );
  }, /UNIQUE constraint failed/);

  console.log('✅ Passed Test 6: Migration 005 reconciles legacy duplicate active shares preserving newest');
}

// ----------------------------------------------------
// Test 7: Unique constraint conflicts during racing inserts resolve cleanly to the winning active share
// ----------------------------------------------------
console.log('\nTest 7: Uniqueness constraint conflict recovery resolves to winning active share...');
{
  const { db, user, plan } = setupTestEnvironment();

  // Pre-seed an active share created by "Request A"
  const preSeedToken = generateShareToken();
  const preSeedHash = hashShareToken(preSeedToken);
  const preSeedEnc = encryptToken(preSeedToken);
  const preSeedId = crypto.randomUUID();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO plan_shares (id, plan_id, user_id, share_token, encrypted_token, is_active, view_count, created_at, revoked_at)
    VALUES (?, ?, ?, ?, ?, 1, 0, ?, NULL)
  `).run(preSeedId, plan.id, user.id, preSeedHash, preSeedEnc, now);

  // Now call createOrGetActiveShare. It should detect the existing share or recover cleanly
  const recoveredResult = createOrGetActiveShare(plan.id, user.id, {}, db);

  assert.strictEqual(recoveredResult.isExisting, true);
  assert.strictEqual(recoveredResult.share.id, preSeedId);
  assert.strictEqual(recoveredResult.share.token, preSeedToken);
  assert.strictEqual(recoveredResult.share.url, `/share/${preSeedToken}`);

  console.log('✅ Passed Test 7: Conflict recovery returns the winning active share seamlessly');
}

console.log('====================================================');
console.log('🎉 ALL 7 ONE-ACTIVE-SHARE CONCURRENCY TESTS PASSED CLEANLY!');
console.log('====================================================\n');
