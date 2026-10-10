// backend/utils/encryption.js
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV recommended for AES-GCM
const AUTH_TAG_LENGTH = 16; // 128-bit authentication tag

/**
 * Resolves and validates the 32-byte encryption key from environment variable SHARE_ENCRYPTION_KEY.
 * Accepts:
 * - 64-character hexadecimal string
 * - 44-character base64 string
 * - 32-byte UTF-8 string
 * 
 * Returns Buffer of 32 bytes or null if missing/invalid.
 * 
 * @returns {Buffer|null}
 */
function getEncryptionKey() {
  const keyEnv = process.env.SHARE_ENCRYPTION_KEY;
  if (!keyEnv || typeof keyEnv !== 'string' || !keyEnv.trim()) {
    return null;
  }
  const trimmed = keyEnv.trim();

  // 64-character hex string (32 bytes)
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, 'hex');
  }

  // 44-character base64 string (32 bytes)
  if (/^[A-Za-z0-9+/]{43}=$/.test(trimmed) || /^[A-Za-z0-9+/=]{44}$/.test(trimmed)) {
    const buf = Buffer.from(trimmed, 'base64');
    if (buf.length === 32) {
      return buf;
    }
  }

  // 32-byte UTF-8 string
  if (Buffer.byteLength(trimmed, 'utf8') === 32) {
    return Buffer.from(trimmed, 'utf8');
  }

  return null;
}

/**
 * Encrypts a plaintext string using AES-256-GCM.
 * Generates a fresh cryptographically random 12-byte IV for every invocation.
 * Formats output as colon-separated hex bundle: `iv:authTag:ciphertext`.
 * 
 * Throws an explicit error if SHARE_ENCRYPTION_KEY is not configured or invalid.
 * Strictly prevents silent fallback to plaintext storage.
 * 
 * @param {string} plaintext - Plaintext token string to encrypt
 * @param {Buffer|null} [keyOverride] - Optional key buffer for testing
 * @returns {string} Hex-encoded bundle: iv:authTag:ciphertext
 */
function encryptToken(plaintext, keyOverride = null) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext string is required for encryption.');
  }

  const key = keyOverride || getEncryptionKey();
  if (!key) {
    throw new Error(
      'SHARE_ENCRYPTION_KEY is not configured or invalid. It must be a 32-byte secret (e.g. 64-character hex string).'
    );
  }

  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts an authenticated AES-256-GCM bundle formatted as `iv:authTag:ciphertext`.
 * Verifies authentication tag integrity.
 * Returns decrypted plaintext string, or null if decryption / authentication fails.
 * 
 * Throws an error if key is missing/unconfigured.
 * 
 * @param {string} bundle - Hex-encoded bundle: iv:authTag:ciphertext
 * @param {Buffer|null} [keyOverride] - Optional key buffer for testing
 * @returns {string|null} Decrypted plaintext or null on decryption failure
 */
function decryptToken(bundle, keyOverride = null) {
  if (!bundle || typeof bundle !== 'string') {
    return null;
  }

  const parts = bundle.split(':');
  if (parts.length !== 3) {
    return null;
  }

  const [ivHex, authTagHex, cipherHex] = parts;
  if (!ivHex || !authTagHex || !cipherHex) {
    return null;
  }

  const key = keyOverride || getEncryptionKey();
  if (!key) {
    throw new Error(
      'SHARE_ENCRYPTION_KEY is not configured or invalid. It must be a 32-byte secret (e.g. 64-character hex string).'
    );
  }

  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(cipherHex, 'hex');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (err) {
    // Decryption failed (bad key, corrupted ciphertext, altered auth tag)
    return null;
  }
}

module.exports = {
  getEncryptionKey,
  encryptToken,
  decryptToken,
  ALGORITHM
};
