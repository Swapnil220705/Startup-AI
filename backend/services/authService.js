// backend/services/authService.js
const crypto = require('crypto');
const dbModule = require('../db/database');

function getDb(customDb) {
  return customDb || dbModule.getDatabase();
}

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || 'startup_ai_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

/**
 * Normalizes an email address by trimming and lowercasing.
 * 
 * @param {string} email
 * @returns {string}
 */
function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

/**
 * Validates email format using standard RFC-compatible pattern.
 * 
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Hashes a plaintext password using Node's native scrypt with a cryptographically secure salt.
 * 
 * @param {string} password
 * @returns {string} Salted hash in format: `${salt}:${derivedKey}`
 */
function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Password must be a non-empty string.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verifies a plaintext password against a stored salted scrypt hash using timing-safe comparison.
 * 
 * @param {string} password
 * @param {string} storedHash - Format: `${salt}:${derivedKey}`
 * @returns {boolean}
 */
function verifyPassword(password, storedHash) {
  if (!password || typeof password !== 'string' || !storedHash || typeof storedHash !== 'string') {
    return false;
  }
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;

  const [salt, originalDerivedKey] = parts;
  if (!salt || !originalDerivedKey) return false;

  try {
    const derivedKey = crypto.scryptSync(password, salt, 64);
    const originalBuffer = Buffer.from(originalDerivedKey, 'hex');

    if (derivedKey.length !== originalBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, originalBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Formats a raw user database row into a safe, client-facing user object.
 * Strictly strips password hashes and internal provider details.
 * 
 * @param {object} row
 * @returns {object|null}
 */
function formatUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name || null,
    pictureUrl: row.picture_url || row.pictureUrl || null,
    authProvider: row.auth_provider || row.authProvider,
    createdAt: row.created_at || row.createdAt,
    updatedAt: row.updated_at || row.updatedAt
  };
}

/**
 * Creates and registers a new local user with email & password.
 * 
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.name]
 * @param {object} [db] - Optional SQLite database instance for testing
 * @returns {object} Formatted user object
 */
function createLocalUser({ email, password, name }, db = null) {
  const normalizedEmail = normalizeEmail(email);

  if (!isValidEmail(normalizedEmail)) {
    const err = new Error('Please provide a valid email address.');
    err.statusCode = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }

  if (typeof password !== 'string' || password.length < 8) {
    const err = new Error('Password must be at least 8 characters long.');
    err.statusCode = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }

  const dbInstance = getDb(db);

  // Check if account already exists with this email
  const existingUser = dbInstance.prepare('SELECT id, auth_provider FROM users WHERE email = ?').get(normalizedEmail);
  if (existingUser) {
    const err = new Error('An account with this email already exists.');
    err.statusCode = 409;
    err.code = 'EMAIL_ALREADY_IN_USE';
    throw err;
  }

  const id = crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = new Date().toISOString();
  const displayName = typeof name === 'string' && name.trim() ? name.trim() : null;

  const stmt = dbInstance.prepare(`
    INSERT INTO users (
      id,
      email,
      name,
      picture_url,
      auth_provider,
      provider_subject_id,
      password_hash,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, null, 'local', null, ?, ?, ?)
  `);

  stmt.run(id, normalizedEmail, displayName, passwordHash, now, now);

  return formatUser({
    id,
    email: normalizedEmail,
    name: displayName,
    picture_url: null,
    auth_provider: 'local',
    created_at: now,
    updated_at: now
  });
}

/**
 * Authenticates a local user with email & password.
 * 
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {object} [db]
 * @returns {object} Formatted user object
 */
function loginLocalUser({ email, password }, db = null) {
  const normalizedEmail = normalizeEmail(email);

  // Timing-neutral error message to avoid account enumeration
  const invalidCredsError = new Error('Invalid email or password.');
  invalidCredsError.statusCode = 401;
  invalidCredsError.code = 'INVALID_CREDENTIALS';

  if (!normalizedEmail || typeof password !== 'string' || !password) {
    throw invalidCredsError;
  }

  const dbInstance = getDb(db);
  const userRow = dbInstance.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);

  if (!userRow) {
    throw invalidCredsError;
  }

  if (userRow.auth_provider !== 'local' || !userRow.password_hash) {
    throw invalidCredsError;
  }

  const passwordValid = verifyPassword(password, userRow.password_hash);
  if (!passwordValid) {
    throw invalidCredsError;
  }

  return formatUser(userRow);
}

/**
 * Authenticates or registers a user via Google ID Token credential.
 * 
 * @param {string} credential - Google JWT ID Token
 * @param {object} [options]
 * @param {Function} [options.verifyToken] - Custom verify function for testing
 * @param {string} [options.clientId] - Target Google Client ID
 * @param {object} [db]
 * @returns {Promise<object>} Formatted user object
 */
async function authenticateWithGoogle(credential, options = {}, db = null) {
  if (!credential || typeof credential !== 'string') {
    const err = new Error('Google credential is required.');
    err.statusCode = 400;
    err.code = 'INVALID_INPUT';
    throw err;
  }

  let payload;

  if (typeof options.verifyToken === 'function') {
    // Allows deterministic testing without live Google network access
    payload = await options.verifyToken(credential);
  } else {
    const { OAuth2Client } = require('google-auth-library');
    const clientId = options.clientId || process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      const err = new Error('Server Google OAuth configuration is missing.');
      err.statusCode = 500;
      err.code = 'OAUTH_CONFIGURATION_ERROR';
      throw err;
    }

    const client = new OAuth2Client(clientId);
    try {
      const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: clientId
      });
      payload = ticket.getPayload();
    } catch (verifyErr) {
      const err = new Error('Invalid Google credential.');
      err.statusCode = 401;
      err.code = 'INVALID_CREDENTIALS';
      throw err;
    }
  }

  if (!payload || !payload.sub || !payload.email || payload.email_verified === false) {
    const err = new Error('Google token does not contain a verified email identity.');
    err.statusCode = 401;
    err.code = 'INVALID_CREDENTIALS';
    throw err;
  }

  const dbInstance = getDb(db);
  const normalizedEmail = normalizeEmail(payload.email);
  const sub = String(payload.sub);
  const name = typeof payload.name === 'string' && payload.name.trim() ? payload.name.trim() : null;
  const pictureUrl = typeof payload.picture === 'string' && payload.picture.trim() ? payload.picture.trim() : null;
  const now = new Date().toISOString();

  // 1. Check if user exists by Google provider subject ID
  const existingGoogleUser = dbInstance.prepare(`
    SELECT * FROM users WHERE auth_provider = 'google' AND provider_subject_id = ?
  `).get(sub);

  if (existingGoogleUser) {
    // Update profile data if changed
    dbInstance.prepare(`
      UPDATE users SET name = ?, picture_url = ?, updated_at = ? WHERE id = ?
    `).run(name, pictureUrl, now, existingGoogleUser.id);

    return formatUser({
      ...existingGoogleUser,
      name,
      picture_url: pictureUrl,
      updated_at: now
    });
  }

  // 2. Check if an account already exists with this email
  const existingEmailUser = dbInstance.prepare('SELECT * FROM users WHERE email = ?').get(normalizedEmail);
  if (existingEmailUser) {
    if (existingEmailUser.auth_provider === 'local') {
      // Safe collision defense: Do NOT overwrite or silently take over local account
      const collisionErr = new Error(
        'An account with this email already exists using password authentication. Please log in with your email and password.'
      );
      collisionErr.statusCode = 409;
      collisionErr.code = 'ACCOUNT_COLLISION';
      throw collisionErr;
    } else if (existingEmailUser.auth_provider === 'google') {
      // Attach subject ID if missing
      dbInstance.prepare(`
        UPDATE users SET provider_subject_id = ?, name = ?, picture_url = ?, updated_at = ? WHERE id = ?
      `).run(sub, name, pictureUrl, now, existingEmailUser.id);

      return formatUser({
        ...existingEmailUser,
        provider_subject_id: sub,
        name,
        picture_url: pictureUrl,
        updated_at: now
      });
    }
  }

  // 3. Create brand-new Google user
  const newUserId = crypto.randomUUID();
  dbInstance.prepare(`
    INSERT INTO users (
      id,
      email,
      name,
      picture_url,
      auth_provider,
      provider_subject_id,
      password_hash,
      created_at,
      updated_at
    ) VALUES (?, ?, ?, ?, 'google', ?, null, ?, ?)
  `).run(newUserId, normalizedEmail, name, pictureUrl, sub, now, now);

  return formatUser({
    id: newUserId,
    email: normalizedEmail,
    name,
    picture_url: pictureUrl,
    authProvider: 'google',
    created_at: now,
    updated_at: now
  });
}

/**
 * Creates a server-side session for a user.
 * 
 * @param {string} userId - UUID of the user
 * @param {object} [db]
 * @returns {{ id: string, userId: string, expiresAt: string }}
 */
function createSession(userId, db = null) {
  if (!userId || typeof userId !== 'string') {
    throw new Error('Valid user ID is required to create a session.');
  }

  const dbInstance = getDb(db);
  const sessionId = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();

  // Lightweight session cleanup during creation
  cleanupExpiredSessions(dbInstance);

  dbInstance.prepare(`
    INSERT INTO sessions (id, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)
  `).run(sessionId, userId, expiresAt, now.toISOString());

  return {
    id: sessionId,
    userId,
    expiresAt
  };
}

/**
 * Retrieves the session and associated user by session token.
 * Validates expiration and deletes expired sessions.
 * 
 * @param {string} token
 * @param {object} [db]
 * @returns {{ session: object, user: object } | null}
 */
function getSessionAndUser(token, db = null) {
  if (!token || typeof token !== 'string') {
    return null;
  }

  const dbInstance = getDb(db);
  const row = dbInstance.prepare(`
    SELECT
      s.id as session_id,
      s.user_id,
      s.expires_at,
      u.id as user_id_col,
      u.email,
      u.name,
      u.picture_url,
      u.auth_provider,
      u.created_at as user_created_at,
      u.updated_at as user_updated_at
    FROM sessions s
    JOIN users u ON s.user_id = u.id
    WHERE s.id = ?
  `).get(token);

  if (!row) {
    return null;
  }

  // Check if session has expired
  const now = new Date();
  if (new Date(row.expires_at) < now) {
    dbInstance.prepare('DELETE FROM sessions WHERE id = ?').run(token);
    return null;
  }

  return {
    session: {
      id: row.session_id,
      userId: row.user_id,
      expiresAt: row.expires_at
    },
    user: formatUser({
      id: row.user_id_col,
      email: row.email,
      name: row.name,
      picture_url: row.picture_url,
      auth_provider: row.auth_provider,
      created_at: row.user_created_at,
      updated_at: row.user_updated_at
    })
  };
}

/**
 * Invalidates and destroys a session by its token.
 * 
 * @param {string} token
 * @param {object} [db]
 * @returns {boolean} True if deleted, false if not found
 */
function destroySession(token, db = null) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  const dbInstance = getDb(db);
  const res = dbInstance.prepare('DELETE FROM sessions WHERE id = ?').run(token);
  return res.changes > 0;
}

/**
 * Purges all expired sessions from the database.
 * 
 * @param {object} [db]
 * @returns {number} Count of deleted sessions
 */
function cleanupExpiredSessions(db = null) {
  const dbInstance = getDb(db);
  const now = new Date().toISOString();
  try {
    const res = dbInstance.prepare('DELETE FROM sessions WHERE expires_at < ?').run(now);
    return res.changes;
  } catch (err) {
    console.error('Session cleanup error:', err.message);
    return 0;
  }
}

/**
 * Returns cookie options adhering to project security guidelines.
 * 
 * @returns {object}
 */
function getCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_MS,
    secure: isProd
  };
}

/**
 * Sets the session cookie on the Express response.
 * 
 * @param {object} res - Express response
 * @param {string} token - 64-char session token
 */
function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, getCookieOptions());
}

/**
 * Clears the session cookie on the Express response.
 * 
 * @param {object} res - Express response
 */
function clearSessionCookie(res) {
  res.cookie(SESSION_COOKIE_NAME, '', {
    ...getCookieOptions(),
    maxAge: 0
  });
}

/**
 * Helper to parse cookies from incoming request headers without external dependencies.
 * 
 * @param {object} req - Express request
 * @returns {object} Key-value map of cookies
 */
function parseCookies(req) {
  if (req.cookies && typeof req.cookies === 'object') {
    return req.cookies;
  }
  const cookies = {};
  const cookieHeader = req.headers?.cookie;
  if (!cookieHeader) return cookies;

  cookieHeader.split(';').forEach(pair => {
    const parts = pair.split('=');
    const name = parts[0]?.trim();
    if (name) {
      cookies[name] = decodeURIComponent(parts.slice(1).join('='));
    }
  });

  return cookies;
}

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  normalizeEmail,
  isValidEmail,
  hashPassword,
  verifyPassword,
  formatUser,
  createLocalUser,
  loginLocalUser,
  authenticateWithGoogle,
  createSession,
  getSessionAndUser,
  destroySession,
  cleanupExpiredSessions,
  getCookieOptions,
  setSessionCookie,
  clearSessionCookie,
  parseCookies
};
