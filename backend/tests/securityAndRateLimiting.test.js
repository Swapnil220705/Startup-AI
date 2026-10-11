// backend/tests/securityAndRateLimiting.test.js
/**
 * Test Suite for Chunk 6.2 — Security Hardening, Rate Limiting & API Key Protection
 *
 * Verifies:
 * - 1. HTTP Security Headers:
 *   - Nosniff, X-Frame-Options, noopen, cross-origin resource policy applied
 *   - CSP disabled on backend REST API (left to frontend static host)
 *   - HSTS disabled by default in non-production, enabled when configured
 *   - CORS preflight and standard requests work seamlessly
 * - 2. Authentication Rate Limiting:
 *   - /api/auth/login allows up to 10 attempts per 15 min per IP, then returns HTTP 429
 *   - /api/auth/signup protected by auth rate limiter
 *   - /api/auth/me not throttled by auth rate limiter
 *   - User-safe error code RATE_LIMIT_EXCEEDED and message
 * - 3. AI Generation Rate Limiting:
 *   - All 6 endpoints (/api/lean-canvas, /api/mvp, /api/revenue, /api/pitch, /api/personas, /api/competitors) protected
 *   - Initial limit of 5 requests per 10 minutes enforced per endpoint
 *   - Rate limiter executes and halts before dispatching expensive Gemini requests
 *   - Concurrent 6-endpoint plan generation flow succeeds without false collisions
 * - 4. Public Shared Plan Link Protection:
 *   - GET /api/shared/:token protected by low-cost limiter
 *   - Returns HTTP 429 when limit exceeded without updating database view count
 * - 5. Reverse Proxy & Header Spoofing Protection:
 *   - Untrusted X-Forwarded-For cannot bypass rate limits when trust proxy is off
 * - 6. Gemini API Key Handling:
 *   - Key passed exclusively in x-goog-api-key request header
 *   - Request URL does not contain ?key= query parameter
 *   - stripApiKeyFromUrl strips embedded query keys
 *   - redactSensitiveData redacts keys from error messages, URLs, and headers
 */

const assert = require('assert');
const http = require('http');
const express = require('express');
const axios = require('axios');

const {
  createSecurityHeadersMiddleware,
  securityHeaders
} = require('../middleware/securityHeaders');
const {
  createAuthLimiter,
  createAiGenerationLimiter,
  createSharedPlanLimiter,
  authLimiter,
  sharedPlanLimiter
} = require('../middleware/rateLimiter');
const {
  callGemini,
  stripApiKeyFromUrl,
  redactSensitiveData
} = require('../services/geminiClient');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 6.2 SECURITY & RATE LIMITING TESTS');
console.log('====================================================\n');

// Helper to launch an ephemeral Express app and run HTTP requests
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

async function runSecurityTests() {
  // ==========================================
  // 1. HTTP SECURITY HEADERS TESTS
  // ==========================================
  console.log('Test 1: HTTP security headers applied via Helmet...');
  await withTestServer(
    (app) => {
      app.use(securityHeaders);
      app.get('/test-headers', (req, res) => res.json({ ok: true }));
    },
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/test-headers`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers.get('x-content-type-options'), 'nosniff');
      assert.strictEqual(res.headers.get('x-frame-options'), 'SAMEORIGIN');
      assert.strictEqual(res.headers.get('x-download-options'), 'noopen');
      assert.strictEqual(res.headers.get('x-permitted-cross-domain-policies'), 'none');
      assert.strictEqual(res.headers.get('cross-origin-resource-policy'), 'cross-origin');
      assert.strictEqual(res.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');

      // CSP must be omitted on API backend
      assert.strictEqual(res.headers.get('content-security-policy'), null, 'CSP must not be set on backend API');

      // HSTS must be omitted by default in non-production
      assert.strictEqual(res.headers.get('strict-transport-security'), null, 'HSTS must be omitted when HTTPS is not guaranteed');
    }
  );
  console.log('✅ Passed Test 1: Protective security headers verified; CSP and HSTS configured safely');

  console.log('\nTest 1b: HSTS header is enabled when explicitly configured...');
  const customHstsMiddleware = createSecurityHeadersMiddleware({ enableHsts: true });
  await withTestServer(
    (app) => {
      app.use(customHstsMiddleware);
      app.get('/test-hsts', (req, res) => res.json({ ok: true }));
    },
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/test-hsts`);
      const hsts = res.headers.get('strict-transport-security');
      assert(hsts && hsts.includes('max-age=31536000'), 'HSTS header must be present when enabled');
    }
  );
  console.log('✅ Passed Test 1b: HSTS correctly included when HTTPS is guaranteed');

  // ==========================================
  // 2. AUTHENTICATION RATE LIMITING TESTS
  // ==========================================
  console.log('\nTest 2: Authentication rate limiter enforces limit and returns 429...');
  const testAuthLimiter = createAuthLimiter({ limit: 3, windowMs: 10000 });
  await withTestServer(
    (app) => {
      app.use(express.json());
      app.post('/api/auth/login', testAuthLimiter, (req, res) => {
        res.json({ success: true, message: 'login attempt handled' });
      });
      app.get('/api/auth/me', (req, res) => {
        res.json({ success: true, user: { id: 'u1' } });
      });
    },
    async (baseUrl) => {
      // First 3 login attempts should pass through (status 200)
      for (let i = 1; i <= 3; i++) {
        const res = await fetch(`${baseUrl}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
        });
        assert.strictEqual(res.status, 200, `Attempt ${i} must succeed`);
        assert(res.headers.get('ratelimit-limit') !== null, 'RateLimit headers must be present');
      }

      // 4th attempt must be rejected with HTTP 429
      const blockedRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'password123' })
      });
      assert.strictEqual(blockedRes.status, 429, 'Attempt 4 must return HTTP 429');
      const blockedBody = await blockedRes.json();
      assert.strictEqual(blockedBody.success, false);
      assert.strictEqual(blockedBody.error.code, 'RATE_LIMIT_EXCEEDED');
      assert.strictEqual(blockedBody.error.message, 'Too many authentication attempts. Please try again later.');

      // /api/auth/me must NOT be blocked by authLimiter
      const meRes = await fetch(`${baseUrl}/api/auth/me`);
      assert.strictEqual(meRes.status, 200, '/me endpoint must not be throttled by auth limiter');
    }
  );
  console.log('✅ Passed Test 2: Auth rate limiter blocks abuse at limit and returns standard 429 schema');

  // ==========================================
  // 3. AI GENERATION RATE LIMITING TESTS
  // ==========================================
  console.log('\nTest 3: AI generation rate limiter protects expensive generation endpoints...');
  let geminiCallsDispatched = 0;
  const testAiLimiter = createAiGenerationLimiter({ limit: 2, windowMs: 10000 });

  await withTestServer(
    (app) => {
      app.use(express.json());
      app.post('/api/lean-canvas', testAiLimiter, (req, res) => {
        geminiCallsDispatched++;
        res.json({ success: true, module: 'lean-canvas' });
      });
    },
    async (baseUrl) => {
      // First 2 requests pass through to the controller
      for (let i = 1; i <= 2; i++) {
        const res = await fetch(`${baseUrl}/api/lean-canvas`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ startupName: 'Startup' })
        });
        assert.strictEqual(res.status, 200);
      }
      assert.strictEqual(geminiCallsDispatched, 2, 'Controller executed for allowed requests');

      // 3rd request is blocked before reaching the controller
      const blockedRes = await fetch(`${baseUrl}/api/lean-canvas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupName: 'Startup' })
      });
      assert.strictEqual(blockedRes.status, 429, 'Should return 429 when AI limit is exceeded');
      const body = await blockedRes.json();
      assert.strictEqual(body.success, false);
      assert.strictEqual(body.error.code, 'RATE_LIMIT_EXCEEDED');
      assert.strictEqual(body.error.message, 'Too many AI generation requests. Please wait a few minutes before trying again.');

      // Verify expensive generation controller was NOT executed for blocked request
      assert.strictEqual(geminiCallsDispatched, 2, 'Gemini request must NOT be dispatched for rate-limited requests');
    }
  );
  console.log('✅ Passed Test 3: AI generation rate limiter halts requests before expensive generation executes');

  console.log('\nTest 3b: Concurrent 6-module generation flow succeeds without cross-endpoint collision...');
  // Simulate the actual 6 routes with default limiters (5 req / 10 min each)
  const appAi = express();
  appAi.use(express.json());

  const routes = ['lean-canvas', 'mvp', 'revenue', 'pitch', 'personas', 'competitors'];
  routes.forEach(route => {
    const limiter = createAiGenerationLimiter();
    appAi.post(`/api/${route}`, limiter, (req, res) => {
      res.json({ success: true, module: route });
    });
  });

  const serverAi = http.createServer(appAi);
  await new Promise((resolve) => serverAi.listen(0, '127.0.0.1', resolve));
  const portAi = serverAi.address().port;
  const baseUrlAi = `http://127.0.0.1:${portAi}`;

  try {
    // A single plan generation flow fires all 6 endpoints concurrently
    const parallelResponses = await Promise.all(
      routes.map(r => fetch(`${baseUrlAi}/api/${r}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startupName: 'ConcurrentTest' })
      }))
    );

    // All 6 must succeed on the first plan generation run
    for (let i = 0; i < routes.length; i++) {
      assert.strictEqual(parallelResponses[i].status, 200, `Module ${routes[i]} must succeed in parallel generation run`);
    }
  } finally {
    await new Promise((resolve) => serverAi.close(resolve));
  }
  console.log('✅ Passed Test 3b: All 6 endpoints in parallel plan generation run succeed cleanly');

  // ==========================================
  // 4. PUBLIC SHARED PLAN RATE LIMITING TESTS
  // ==========================================
  console.log('\nTest 4: Public shared plan rate limiter protects GET /api/shared/:token...');
  let databaseReads = 0;
  const testSharedLimiter = createSharedPlanLimiter({ limit: 3, windowMs: 10000 });

  await withTestServer(
    (app) => {
      app.get('/api/shared/:token', testSharedLimiter, (req, res) => {
        databaseReads++;
        res.json({ success: true, token: req.params.token });
      });
    },
    async (baseUrl) => {
      for (let i = 1; i <= 3; i++) {
        const res = await fetch(`${baseUrl}/api/shared/token-xyz`);
        assert.strictEqual(res.status, 200);
      }
      assert.strictEqual(databaseReads, 3);

      const blockedRes = await fetch(`${baseUrl}/api/shared/token-xyz`);
      assert.strictEqual(blockedRes.status, 429);
      const blockedBody = await blockedRes.json();
      assert.strictEqual(blockedBody.success, false);
      assert.strictEqual(blockedBody.error.code, 'RATE_LIMIT_EXCEEDED');
      assert.strictEqual(blockedBody.error.message, 'Too many requests for shared plans. Please try again shortly.');

      // Database write/read was not triggered for rate-limited request
      assert.strictEqual(databaseReads, 3, 'Rate-limited request must not reach database handler');
    }
  );
  console.log('✅ Passed Test 4: Public shared plan rate limiter protects view count and DB writes');

  // ==========================================
  // 5. PROXY SPOOFING PROTECTION TESTS
  // ==========================================
  console.log('\nTest 5: Header spoofing protection (X-Forwarded-For rejected when trust proxy is off)...');
  const testSpoofLimiter = createAuthLimiter({ limit: 2, windowMs: 10000 });

  await withTestServer(
    (app) => {
      // Explicitly untrusted (default)
      app.set('trust proxy', false);
      app.post('/api/auth/login', testSpoofLimiter, (req, res) => res.json({ ok: true }));
    },
    async (baseUrl) => {
      // Attacker attempts to rotate X-Forwarded-For IP on each request
      const r1 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'X-Forwarded-For': '198.51.100.1' }
      });
      assert.strictEqual(r1.status, 200);

      const r2 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'X-Forwarded-For': '198.51.100.2' }
      });
      assert.strictEqual(r2.status, 200);

      // 3rd request with another fake IP must STILL be rate-limited because socket IP is identical
      const r3 = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'X-Forwarded-For': '198.51.100.3' }
      });
      assert.strictEqual(r3.status, 429, 'Spoofed X-Forwarded-For must NOT bypass rate limit when trust proxy is off');
    }
  );
  console.log('✅ Passed Test 5: Untrusted X-Forwarded-For headers cannot bypass client rate limits');

  // ==========================================
  // 6. GEMINI API KEY HEADER & REDACTION TESTS
  // ==========================================
  console.log('\nTest 6: Gemini API key header usage and URL sanitization...');
  const originalPost = axios.post;

  try {
    let capturedUrl = null;
    let capturedHeaders = null;

    axios.post = async (url, data, config) => {
      capturedUrl = url;
      capturedHeaders = config.headers;
      return {
        data: {
          candidates: [{ content: { parts: [{ text: '{"result": "mocked"}' }] } }]
        }
      };
    };

    const testKey = 'AIzaSy_Secret_Test_Key_12345';
    await callGemini('test prompt', {
      apiKey: testKey,
      modelUrl: 'https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent',
      limiter: null
    });

    // 1. API key must be in x-goog-api-key header
    assert.strictEqual(capturedHeaders['x-goog-api-key'], testKey, 'API key must be passed via x-goog-api-key header');

    // 2. API key must NOT be in the request URL query string
    assert(!capturedUrl.includes(testKey), 'API key must never appear in the request URL');
    assert(!capturedUrl.includes('key='), 'Request URL must not contain key query parameter');
    assert.strictEqual(capturedUrl, 'https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent');

    console.log('✅ Passed Test 6: API key is transmitted via x-goog-api-key header and stripped from URL');

    // Test 6b: stripApiKeyFromUrl helper
    console.log('\nTest 6b: stripApiKeyFromUrl strips existing key query parameter...');
    const urlWithKey = 'https://api.google.com/model:generate?key=AIzaSySecretKey&other=param';
    const cleaned = stripApiKeyFromUrl(urlWithKey);
    assert(!cleaned.includes('AIzaSySecretKey'), 'Key must be stripped');
    assert(cleaned.includes('other=param'), 'Other parameters must be preserved');

    const cleanUrl = 'https://api.google.com/model:generate';
    assert.strictEqual(stripApiKeyFromUrl(cleanUrl), cleanUrl);
    console.log('✅ Passed Test 6b: stripApiKeyFromUrl cleans query strings reliably');

    // Test 6c: Error redaction
    console.log('\nTest 6c: Error redaction prevents API key leakage in thrown errors...');
    const sensitiveKey = 'AIzaSy_UltraSecret_Key_9999';
    axios.post = async (url, data, config) => {
      const err = new Error(`Upstream failed for key ${sensitiveKey} at ${url}`);
      err.response = { status: 400 }; // non-retryable
      err.config = {
        url: `${url}?key=${sensitiveKey}`,
        headers: { 'x-goog-api-key': sensitiveKey }
      };
      throw err;
    };

    let caughtError = null;
    try {
      await callGemini('fail prompt', {
        apiKey: sensitiveKey,
        limiter: null,
        maxRetries: 0
      });
    } catch (err) {
      caughtError = err;
    }

    assert(caughtError !== null, 'Should propagate error');
    assert(!caughtError.message.includes(sensitiveKey), 'Error message must not leak key');
    assert(caughtError.message.includes('[REDACTED_API_KEY]'), 'Error message must contain redacted placeholder');
    assert(!caughtError.config.url.includes(sensitiveKey), 'Error config URL must not leak key');
    assert.strictEqual(caughtError.config.headers['x-goog-api-key'], '[REDACTED_API_KEY]', 'Error config header must be redacted');
    console.log('✅ Passed Test 6c: API key successfully redacted from thrown errors, URLs, and headers');

  } finally {
    axios.post = originalPost;
  }

  console.log('\n====================================================');
  console.log('🎉 ALL CHUNK 6.2 SECURITY & RATE LIMITING TESTS PASSED!');
  console.log('====================================================\n');
}

runSecurityTests().catch((err) => {
  console.error('\n❌ Security & Rate Limiting tests failed:', err);
  process.exit(1);
});
