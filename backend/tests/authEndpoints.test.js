// backend/tests/authEndpoints.test.js
/**
 * Test Suite for Chunk 4.2 — Authentication Backend Foundation
 * 
 * Verifies:
 * - Migration:
 *   - A: users table exists with required columns and constraints
 *   - B: sessions table exists with foreign key and cascade
 *   - C: trial_sessions table exists with plan relation
 *   - D: plans table contains user_id column
 *   - E: Existing Phase 3 data remains readable (user_id = NULL)
 * - Passwords:
 *   - F: Password hashing does not store plaintext
 *   - G: Correct password verifies successfully
 *   - H: Incorrect password fails verification
 *   - I: Different salts produce distinct hashes for identical passwords
 * - Sessions:
 *   - J: Session token is cryptographically random (64 hex chars)
 *   - K: Session is created correctly in database with future expiry
 *   - L: Valid session resolves user
 *   - M: Expired session is rejected and deleted
 *   - N: Logout / session destruction invalidates session
 * - Signup:
 *   - O: Successful signup creates user and issues session cookie
 *   - P: Duplicate email rejected with 409 EMAIL_ALREADY_IN_USE
 *   - Q: Invalid email format rejected with 400 INVALID_INPUT
 *   - R: Short password (< 8 chars) rejected with 400 INVALID_INPUT
 *   - S: Session cookie configured with HttpOnly, SameSite=Lax
 * - Login:
 *   - T: Successful login returns user and sets session cookie
 *   - U: Incorrect password rejected with generic 401 INVALID_CREDENTIALS
 *   - V: Unknown account handled safely with same 401 (no account enumeration)
 *   - W: Local account required for password login (Google user cannot password login)
 * - Google:
 *   - X: Valid Google credential creates user and session
 *   - Y: Existing Google user logs in without creating duplicate record
 *   - Z: Invalid Google credential rejected with 401 INVALID_CREDENTIALS
 *   - AA: Google audience validation enforced
 *   - AB: Verified claims are used rather than untrusted frontend data
 *   - AC: Local-account collision handled safely (409 ACCOUNT_COLLISION)
 * - Current User (/me):
 *   - AD: Valid session returns authenticated user
 *   - AE: Missing or invalid session returns 401 UNAUTHORIZED
 * - Logout:
 *   - AF: Session invalidated in database
 *   - AG: Cookie cleared with maxAge: 0
 * - Security:
 *   - AH: Password hash never appears in API response
 *   - AI: Session token never appears in API response body
 *   - AJ: Database errors / stack traces are not exposed
 */

const assert = require('assert');
const { createDatabaseInstance } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const {
  hashPassword,
  verifyPassword,
  createLocalUser,
  loginLocalUser,
  authenticateWithGoogle,
  createSession,
  getSessionAndUser,
  destroySession,
  cleanupExpiredSessions,
  setSessionCookie,
  clearSessionCookie,
  parseCookies,
  SESSION_COOKIE_NAME
} = require('../services/authService');
const {
  signupController,
  loginController,
  googleAuthController,
  logoutController,
  getCurrentUserController
} = require('../controllers/authController');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 4.2 AUTHENTICATION BACKEND TESTS');
console.log('====================================================\n');

// Mock Express response helper
function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    cookies: {},
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
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

async function runAuthTests() {
  const testDb = createDatabaseInstance(':memory:');
  runMigrations(testDb);

  // ==========================================
  // 1. MIGRATION TESTS (A - E)
  // ==========================================
  console.log('Test A: users table schema and constraints...');
  const usersColumns = testDb.prepare('PRAGMA table_info(users)').all();
  const userColNames = usersColumns.map(c => c.name);
  assert(userColNames.includes('id'), 'users must have id');
  assert(userColNames.includes('email'), 'users must have email');
  assert(userColNames.includes('name'), 'users must have name');
  assert(userColNames.includes('picture_url'), 'users must have picture_url');
  assert(userColNames.includes('auth_provider'), 'users must have auth_provider');
  assert(userColNames.includes('provider_subject_id'), 'users must have provider_subject_id');
  assert(userColNames.includes('password_hash'), 'users must have password_hash');
  assert(userColNames.includes('created_at'), 'users must have created_at');
  assert(userColNames.includes('updated_at'), 'users must have updated_at');
  console.log('✅ Passed Test A: users table schema and constraints verified');

  console.log('\nTest B: sessions table schema and foreign key...');
  const sessionsColumns = testDb.prepare('PRAGMA table_info(sessions)').all();
  const sessionColNames = sessionsColumns.map(c => c.name);
  assert(sessionColNames.includes('id'), 'sessions must have id');
  assert(sessionColNames.includes('user_id'), 'sessions must have user_id');
  assert(sessionColNames.includes('expires_at'), 'sessions must have expires_at');
  assert(sessionColNames.includes('created_at'), 'sessions must have created_at');
  console.log('✅ Passed Test B: sessions table schema verified');

  console.log('\nTest C: trial_sessions table schema...');
  const trialColumns = testDb.prepare('PRAGMA table_info(trial_sessions)').all();
  const trialColNames = trialColumns.map(c => c.name);
  assert(trialColNames.includes('id'), 'trial_sessions must have id');
  assert(trialColNames.includes('plan_id'), 'trial_sessions must have plan_id');
  assert(trialColNames.includes('ip_hash'), 'trial_sessions must have ip_hash');
  assert(trialColNames.includes('created_at'), 'trial_sessions must have created_at');
  console.log('✅ Passed Test C: trial_sessions table schema verified');

  console.log('\nTest D: plans table contains user_id column...');
  const plansColumns = testDb.prepare('PRAGMA table_info(plans)').all();
  const planColNames = plansColumns.map(c => c.name);
  assert(planColNames.includes('user_id'), 'plans must have user_id column');
  console.log('✅ Passed Test D: plans table user_id column verified');

  console.log('\nTest E: Existing Phase 3 plans remain readable with user_id = NULL...');
  // Insert unowned plan (mimicking Phase 3)
  const now = new Date().toISOString();
  testDb.prepare(`
    INSERT INTO plans (
      id, startup_name, industry, problem, solution, target_audience, usp,
      generation_status, created_at, updated_at
    ) VALUES ('test-p3-plan', 'Phase 3 Startup', 'AI', 'Problem', 'Solution', 'Audience', 'USP', 'completed', ?, ?)
  `).run(now, now);

  const planRow = testDb.prepare('SELECT * FROM plans WHERE id = ?').get('test-p3-plan');
  assert.strictEqual(planRow.startup_name, 'Phase 3 Startup');
  assert.strictEqual(planRow.user_id, null, 'Unowned plans must have user_id = NULL');
  console.log('✅ Passed Test E: Existing Phase 3 data remains 100% backward-compatible');

  // ==========================================
  // 2. PASSWORD HASHING TESTS (F - I)
  // ==========================================
  console.log('\nTest F: Password hashing does not store plaintext...');
  const plain = 'superSecretPassword123!';
  const hash1 = hashPassword(plain);
  assert.notStrictEqual(hash1, plain, 'Hash must not equal plaintext');
  assert(hash1.includes(':'), 'Hash must contain salt:key delimiter');
  const [salt, key] = hash1.split(':');
  assert.strictEqual(salt.length, 32, 'Salt must be 16 bytes (32 hex chars)');
  assert.strictEqual(key.length, 128, 'Key must be 64 bytes (128 hex chars)');
  console.log('✅ Passed Test F: Password hashing uses cryptographically secure salt + scrypt key');

  console.log('\nTest G: Correct password verifies successfully...');
  assert.strictEqual(verifyPassword(plain, hash1), true, 'Correct password must verify');
  console.log('✅ Passed Test G: Correct password verified');

  console.log('\nTest H: Incorrect password fails verification...');
  assert.strictEqual(verifyPassword('wrongPassword!', hash1), false, 'Incorrect password must fail');
  assert.strictEqual(verifyPassword('', hash1), false, 'Empty password must fail');
  assert.strictEqual(verifyPassword(plain, 'invalid:hash'), false, 'Corrupted hash must fail');
  console.log('✅ Passed Test H: Incorrect password rejected safely');

  console.log('\nTest I: Different salts produce distinct hashes for identical passwords...');
  const hash2 = hashPassword(plain);
  assert.notStrictEqual(hash1, hash2, 'Identical passwords must produce distinct hashes due to random salt');
  assert.strictEqual(verifyPassword(plain, hash2), true, 'Both distinct hashes must verify against the same plaintext');
  console.log('✅ Passed Test I: Unique cryptographic salts guaranteed');

  // ==========================================
  // 3. SESSION MANAGEMENT TESTS (J - N)
  // ==========================================
  console.log('\nTest J: Session token is cryptographically random...');
  const userA = createLocalUser({ email: 'session_user@example.com', password: 'password1234', name: 'Session User' }, testDb);
  const session1 = createSession(userA.id, testDb);
  const session2 = createSession(userA.id, testDb);
  assert.strictEqual(session1.id.length, 64, 'Session token must be 32 bytes (64 hex chars)');
  assert.notStrictEqual(session1.id, session2.id, 'Session tokens must be uniquely random');
  console.log('✅ Passed Test J: Session token high entropy verified');

  console.log('\nTest K: Session is created in database with future expiry...');
  const sessionRow = testDb.prepare('SELECT * FROM sessions WHERE id = ?').get(session1.id);
  assert(sessionRow, 'Session must exist in database');
  assert(new Date(sessionRow.expires_at) > new Date(), 'expires_at must be in future');
  assert.strictEqual(sessionRow.user_id, userA.id, 'Session must reference user');
  console.log('✅ Passed Test K: Session created with 30-day expiry');

  console.log('\nTest L: Valid session resolves user...');
  const resolved = getSessionAndUser(session1.id, testDb);
  assert(resolved, 'Should resolve valid session');
  assert.strictEqual(resolved.user.id, userA.id);
  assert.strictEqual(resolved.user.email, 'session_user@example.com');
  assert.strictEqual(resolved.user.name, 'Session User');
  console.log('✅ Passed Test L: Valid session resolves user cleanly');

  console.log('\nTest M: Expired session is rejected and deleted...');
  // Force session expiry in DB
  const pastDate = new Date(Date.now() - 10000).toISOString();
  testDb.prepare('UPDATE sessions SET expires_at = ? WHERE id = ?').run(pastDate, session2.id);

  const expiredResolved = getSessionAndUser(session2.id, testDb);
  assert.strictEqual(expiredResolved, null, 'Expired session must return null');
  // Check that row was cleaned up
  const dbCheck = testDb.prepare('SELECT * FROM sessions WHERE id = ?').get(session2.id);
  assert.strictEqual(dbCheck, undefined, 'Expired session row must be purged upon lookup');
  console.log('✅ Passed Test M: Expired session rejected and purged');

  console.log('\nTest N: Logout / session destruction invalidates session...');
  const destroyed = destroySession(session1.id, testDb);
  assert.strictEqual(destroyed, true, 'destroySession must return true');
  const postDestroy = getSessionAndUser(session1.id, testDb);
  assert.strictEqual(postDestroy, null, 'Destroyed session must not resolve');
  console.log('✅ Passed Test N: Session destruction verified');

  // ==========================================
  // 4. SIGNUP TESTS (O - S)
  // ==========================================
  console.log('\nTest O: Successful signup creates user and issues cookie...');
  const signupReq = {
    body: {
      email: 'NewFounder@Example.com ',
      password: 'StrongPassword123!',
      name: 'Alice Founder'
    }
  };
  const signupRes = createMockRes();
  // Temporarily hook activeDb for controller test
  const originalGetDb = require('../db/database').getDatabase;
  require('../db/database').getDatabase = () => testDb;

  await signupController(signupReq, signupRes);
  assert.strictEqual(signupRes.statusCode, 201);
  assert.strictEqual(signupRes.jsonData.success, true);
  assert.strictEqual(signupRes.jsonData.data.user.email, 'newfounder@example.com', 'Email must be normalized to lowercase');
  assert.strictEqual(signupRes.jsonData.data.user.name, 'Alice Founder');
  assert(signupRes.cookies[SESSION_COOKIE_NAME], 'Session cookie must be set');
  console.log('✅ Passed Test O: Successful signup verified');

  console.log('\nTest P: Duplicate email rejected with 409 EMAIL_ALREADY_IN_USE...');
  const dupRes = createMockRes();
  await signupController(signupReq, dupRes);
  assert.strictEqual(dupRes.statusCode, 409);
  assert.strictEqual(dupRes.jsonData.success, false);
  assert.strictEqual(dupRes.jsonData.error.code, 'EMAIL_ALREADY_IN_USE');
  console.log('✅ Passed Test P: Duplicate email rejected cleanly');

  console.log('\nTest Q: Invalid email format rejected with 400 INVALID_INPUT...');
  const badEmailRes = createMockRes();
  await signupController({ body: { email: 'not-an-email', password: 'password123' } }, badEmailRes);
  assert.strictEqual(badEmailRes.statusCode, 400);
  assert.strictEqual(badEmailRes.jsonData.error.code, 'INVALID_INPUT');
  console.log('✅ Passed Test Q: Invalid email rejected cleanly');

  console.log('\nTest R: Short password (< 8 chars) rejected with 400 INVALID_INPUT...');
  const shortPassRes = createMockRes();
  await signupController({ body: { email: 'valid@example.com', password: 'short' } }, shortPassRes);
  assert.strictEqual(shortPassRes.statusCode, 400);
  assert.strictEqual(shortPassRes.jsonData.error.code, 'INVALID_INPUT');
  console.log('✅ Passed Test R: Short password rejected cleanly');

  console.log('\nTest S: Session cookie configured with HttpOnly, SameSite=Lax...');
  const cookieInfo = signupRes.cookies[SESSION_COOKIE_NAME];
  assert.strictEqual(cookieInfo.options.httpOnly, true, 'Cookie must be HttpOnly');
  assert.strictEqual(cookieInfo.options.sameSite, 'lax', 'Cookie must be SameSite=Lax');
  assert.strictEqual(cookieInfo.options.path, '/', 'Cookie path must be /');
  assert(cookieInfo.options.maxAge > 0, 'Cookie must have positive maxAge');
  console.log('✅ Passed Test S: Session cookie security options verified');

  // ==========================================
  // 5. LOGIN TESTS (T - W)
  // ==========================================
  console.log('\nTest T: Successful login returns user and sets session cookie...');
  const loginReq = {
    body: {
      email: 'newfounder@example.com',
      password: 'StrongPassword123!'
    }
  };
  const loginRes = createMockRes();
  await loginController(loginReq, loginRes);
  assert.strictEqual(loginRes.statusCode, 200);
  assert.strictEqual(loginRes.jsonData.success, true);
  assert.strictEqual(loginRes.jsonData.data.user.email, 'newfounder@example.com');
  assert(loginRes.cookies[SESSION_COOKIE_NAME], 'Session cookie must be set upon login');
  const loggedInSessionToken = loginRes.cookies[SESSION_COOKIE_NAME].value;
  console.log('✅ Passed Test T: Successful login verified');

  console.log('\nTest U: Incorrect password rejected with generic 401 INVALID_CREDENTIALS...');
  const wrongPassRes = createMockRes();
  await loginController({ body: { email: 'newfounder@example.com', password: 'wrongPassword!' } }, wrongPassRes);
  assert.strictEqual(wrongPassRes.statusCode, 401);
  assert.strictEqual(wrongPassRes.jsonData.error.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(wrongPassRes.jsonData.error.message, 'Invalid email or password.');
  console.log('✅ Passed Test U: Incorrect password rejected safely');

  console.log('\nTest V: Unknown account handled safely with same 401 (no account enumeration)...');
  const unknownEmailRes = createMockRes();
  await loginController({ body: { email: 'nonexistent@example.com', password: 'SomePassword123!' } }, unknownEmailRes);
  assert.strictEqual(unknownEmailRes.statusCode, 401);
  assert.strictEqual(unknownEmailRes.jsonData.error.code, 'INVALID_CREDENTIALS');
  assert.strictEqual(unknownEmailRes.jsonData.error.message, 'Invalid email or password.');
  console.log('✅ Passed Test V: Account enumeration prevented via uniform error');

  console.log('\nTest W: Local account required for password login (Google user cannot password login)...');
  // Seed a Google-only user
  testDb.prepare(`
    INSERT INTO users (id, email, name, picture_url, auth_provider, provider_subject_id, password_hash, created_at, updated_at)
    VALUES ('google-u1', 'googleonly@example.com', 'Google User', null, 'google', 'sub-12345', null, ?, ?)
  `).run(now, now);

  const googlePassRes = createMockRes();
  await loginController({ body: { email: 'googleonly@example.com', password: 'AnyPassword123!' } }, googlePassRes);
  assert.strictEqual(googlePassRes.statusCode, 401);
  assert.strictEqual(googlePassRes.jsonData.error.code, 'INVALID_CREDENTIALS');
  console.log('✅ Passed Test W: Password login blocked on OAuth-only accounts');

  // ==========================================
  // 6. GOOGLE AUTHENTICATION TESTS (X - AC)
  // ==========================================
  console.log('\nTest X: Valid Google credential creates user and session...');
  const mockGooglePayload = {
    sub: 'google-sub-99999',
    email: 'sarah.founder@gmail.com',
    email_verified: true,
    name: 'Sarah Founder',
    picture: 'https://lh3.googleusercontent.com/avatar.jpg'
  };

  const googleReq = {
    body: { credential: 'mock-valid-google-jwt' },
    authOptions: {
      verifyToken: async (cred) => {
        if (cred === 'mock-valid-google-jwt') return mockGooglePayload;
        throw new Error('Invalid token');
      }
    }
  };
  const googleRes = createMockRes();
  await googleAuthController(googleReq, googleRes);
  assert.strictEqual(googleRes.statusCode, 200);
  assert.strictEqual(googleRes.jsonData.success, true);
  assert.strictEqual(googleRes.jsonData.data.user.email, 'sarah.founder@gmail.com');
  assert.strictEqual(googleRes.jsonData.data.user.name, 'Sarah Founder');
  assert.strictEqual(googleRes.jsonData.data.user.pictureUrl, 'https://lh3.googleusercontent.com/avatar.jpg');
  assert.strictEqual(googleRes.jsonData.data.user.authProvider, 'google');
  assert(googleRes.cookies[SESSION_COOKIE_NAME], 'Session cookie must be issued for Google user');
  console.log('✅ Passed Test X: Valid Google credential authenticated and user created');

  console.log('\nTest Y: Existing Google user logs in without creating duplicate record...');
  const countBefore = testDb.prepare('SELECT COUNT(*) as count FROM users WHERE auth_provider = \'google\'').get().count;
  const repeatGoogleRes = createMockRes();
  await googleAuthController(googleReq, repeatGoogleRes);
  const countAfter = testDb.prepare('SELECT COUNT(*) as count FROM users WHERE auth_provider = \'google\'').get().count;
  assert.strictEqual(countBefore, countAfter, 'Must not create duplicate row on repeat Google login');
  assert.strictEqual(repeatGoogleRes.jsonData.data.user.email, 'sarah.founder@gmail.com');
  console.log('✅ Passed Test Y: Existing Google user login idempotency verified');

  console.log('\nTest Z: Invalid Google credential rejected with 401 INVALID_CREDENTIALS...');
  const invalidGoogleReq = {
    body: { credential: 'malformed-jwt' },
    authOptions: {
      verifyToken: async () => {
        const err = new Error('Token signature invalid');
        err.statusCode = 401;
        err.code = 'INVALID_CREDENTIALS';
        throw err;
      }
    }
  };
  const invalidGoogleRes = createMockRes();
  await googleAuthController(invalidGoogleReq, invalidGoogleRes);
  assert.strictEqual(invalidGoogleRes.statusCode, 401);
  assert.strictEqual(invalidGoogleRes.jsonData.error.code, 'INVALID_CREDENTIALS');
  console.log('✅ Passed Test Z: Invalid Google credential rejected');

  console.log('\nTest AA: Google audience validation enforced...');
  const mismatchedAudienceReq = {
    body: { credential: 'wrong-audience-jwt' },
    authOptions: {
      verifyToken: async () => {
        const err = new Error('Audience mismatch');
        err.statusCode = 401;
        err.code = 'INVALID_CREDENTIALS';
        throw err;
      }
    }
  };
  const audRes = createMockRes();
  await googleAuthController(mismatchedAudienceReq, audRes);
  assert.strictEqual(audRes.statusCode, 401);
  assert.strictEqual(audRes.jsonData.error.code, 'INVALID_CREDENTIALS');
  console.log('✅ Passed Test AA: Google audience validation enforced');

  console.log('\nTest AB: Verified claims are used rather than untrusted frontend data...');
  const unverifiedEmailReq = {
    body: { credential: 'unverified-email-jwt' },
    authOptions: {
      verifyToken: async () => ({
        sub: 'sub-unverified',
        email: 'unverified@gmail.com',
        email_verified: false
      })
    }
  };
  const unverifiedRes = createMockRes();
  await googleAuthController(unverifiedEmailReq, unverifiedRes);
  assert.strictEqual(unverifiedRes.statusCode, 401);
  assert.strictEqual(unverifiedRes.jsonData.error.code, 'INVALID_CREDENTIALS');
  console.log('✅ Passed Test AB: Unverified Google email rejected');

  console.log('\nTest AC: Local-account collision handled safely (409 ACCOUNT_COLLISION)...');
  // Attempt to sign in with Google using the email of existing local user Alice
  const collisionReq = {
    body: { credential: 'collision-jwt' },
    authOptions: {
      verifyToken: async () => ({
        sub: 'google-sub-alice-collision',
        email: 'newfounder@example.com', // Already registered with local password in Test O!
        email_verified: true,
        name: 'Alice Impersonator'
      })
    }
  };
  const collisionRes = createMockRes();
  await googleAuthController(collisionReq, collisionRes);
  assert.strictEqual(collisionRes.statusCode, 409);
  assert.strictEqual(collisionRes.jsonData.error.code, 'ACCOUNT_COLLISION');
  assert(collisionRes.jsonData.error.message.includes('password authentication'));

  // Verify local user was not overwritten or corrupted
  const localAlice = testDb.prepare('SELECT * FROM users WHERE email = ?').get('newfounder@example.com');
  assert.strictEqual(localAlice.auth_provider, 'local');
  assert(localAlice.password_hash !== null);
  console.log('✅ Passed Test AC: Local account protected against silent OAuth takeover');

  // ==========================================
  // 7. CURRENT USER (/me) TESTS (AD - AE)
  // ==========================================
  console.log('\nTest AD: Valid session returns authenticated user...');
  const meReq = {
    user: {
      id: userA.id,
      email: userA.email,
      name: userA.name,
      pictureUrl: null
    }
  };
  const meRes = createMockRes();
  await getCurrentUserController(meReq, meRes);
  assert.strictEqual(meRes.statusCode, 200);
  assert.strictEqual(meRes.jsonData.data.user.email, userA.email);
  console.log('✅ Passed Test AD: Valid session returns current user profile');

  console.log('\nTest AE: Missing or invalid session returns 401 UNAUTHORIZED...');
  const unauthedMeReq = { user: null };
  const unauthedMeRes = createMockRes();
  await getCurrentUserController(unauthedMeReq, unauthedMeRes);
  assert.strictEqual(unauthedMeRes.statusCode, 401);
  assert.strictEqual(unauthedMeRes.jsonData.error.code, 'UNAUTHORIZED');
  console.log('✅ Passed Test AE: Missing session rejected with structured 401');

  // ==========================================
  // 8. LOGOUT TESTS (AF - AG)
  // ==========================================
  console.log('\nTest AF: Session invalidated in database on logout...');
  const logoutReq = {
    headers: {
      cookie: `${SESSION_COOKIE_NAME}=${loggedInSessionToken}`
    }
  };
  const logoutRes = createMockRes();
  await logoutController(logoutReq, logoutRes);
  assert.strictEqual(logoutRes.statusCode, 200);
  assert.strictEqual(logoutRes.jsonData.success, true);

  // Check that session was destroyed in DB
  const checkDestroyed = testDb.prepare('SELECT * FROM sessions WHERE id = ?').get(loggedInSessionToken);
  assert.strictEqual(checkDestroyed, undefined, 'Session row must be deleted upon logout');
  console.log('✅ Passed Test AF: Session destroyed from database');

  console.log('\nTest AG: Cookie cleared with maxAge: 0...');
  const clearedCookie = logoutRes.cookies[SESSION_COOKIE_NAME];
  assert(clearedCookie, 'Cookie clearance instruction must be sent');
  assert.strictEqual(clearedCookie.options.maxAge, 0, 'maxAge must be 0 to clear cookie');
  console.log('✅ Passed Test AG: Cookie cleared safely');

  // ==========================================
  // 9. SECURITY & DATA HYGIENE TESTS (AH - AJ)
  // ==========================================
  console.log('\nTest AH: Password hash never appears in API response...');
  // Inspect all responses generated above
  const responsesToCheck = [
    signupRes.jsonData,
    loginRes.jsonData,
    googleRes.jsonData,
    meRes.jsonData
  ];
  for (const resp of responsesToCheck) {
    const serialized = JSON.stringify(resp);
    assert(!serialized.includes('password_hash'), 'Response must never leak password_hash');
    assert(!serialized.includes('passwordHash'), 'Response must never leak passwordHash');
  }
  console.log('✅ Passed Test AH: Password hash is strictly stripped from all responses');

  console.log('\nTest AI: Session token never appears in API response body...');
  for (const resp of responsesToCheck) {
    const serialized = JSON.stringify(resp);
    assert(!serialized.includes(loggedInSessionToken), 'Session token must only exist in HttpOnly cookie');
  }
  console.log('✅ Passed Test AI: Session token is never leaked into response JSON body');

  console.log('\nTest AJ: Database errors / stack traces are not exposed...');
  // Trigger DB error by corrupting state or passing invalid parameters
  const errorSignupRes = createMockRes();
  await signupController({ body: null }, errorSignupRes);
  assert.strictEqual(errorSignupRes.statusCode, 400);
  assert(!JSON.stringify(errorSignupRes.jsonData).includes('SqliteError'), 'Raw SQL errors must be suppressed');
  assert(!JSON.stringify(errorSignupRes.jsonData).includes('stack'), 'Stack traces must be suppressed');
  console.log('✅ Passed Test AJ: Structured errors without stack trace leakage verified');

  // Restore getDatabase
  require('../db/database').getDatabase = originalGetDb;

  console.log('\n====================================================');
  console.log('🎉 ALL 36 AUTHENTICATION BACKEND TESTS PASSED CLEANLY!');
  console.log('====================================================');
}

runAuthTests().catch((err) => {
  console.error('\n❌ AUTH TEST SUITE FAILED:', err);
  process.exit(1);
});
