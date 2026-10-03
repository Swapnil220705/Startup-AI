const assert = require('assert');
const axios = require('axios');
const {
  callGemini,
  isTransientError,
  calculateBackoffDelay,
  getRetryAfterDelayMs,
  ConcurrencyLimiter,
  DEFAULT_CONFIG,
} = require('../services/geminiClient');

console.log('====================================================');
console.log('🧪 RUNNING GEMINI CLIENT RETRY & LIMITER TESTS (CHUNK 2.2)');
console.log('====================================================\n');

async function runTests() {
  const originalPost = axios.post;

  try {
    // -------------------------------------------------------------
    // 1. Successful request (no retries)
    // -------------------------------------------------------------
    console.log('Test 1: Successful request on first attempt...');
    let callCount = 0;
    axios.post = async () => {
      callCount++;
      return {
        data: {
          candidates: [{ content: { parts: [{ text: '{"result": "success"}' }] } }]
        }
      };
    };

    const recordedDelays1 = [];
    const text1 = await callGemini('test prompt', {
      sleepFn: async (ms) => recordedDelays1.push(ms),
      limiter: null
    });
    assert.strictEqual(text1, '{"result": "success"}');
    assert.strictEqual(callCount, 1, 'Should only call once on success');
    assert.strictEqual(recordedDelays1.length, 0, 'No retries/sleeps should occur');
    console.log('✅ Passed Test 1: Successful request on first attempt');

    // -------------------------------------------------------------
    // 2. HTTP 429 retry
    // -------------------------------------------------------------
    console.log('\nTest 2: HTTP 429 retry and recovery...');
    let attempt429 = 0;
    const recordedDelays429 = [];
    axios.post = async () => {
      attempt429++;
      if (attempt429 === 1) {
        const error = new Error('Request failed with status code 429');
        error.response = { status: 429, data: { error: 'Quota exceeded' } };
        throw error;
      }
      return {
        data: {
          candidates: [{ content: { parts: [{ text: '{"status": "recovered_after_429"}' }] } }]
        }
      };
    };

    const text429 = await callGemini('test prompt', {
      sleepFn: async (ms) => recordedDelays429.push(ms),
      limiter: null,
      maxRetries: 3
    });
    assert.strictEqual(text429, '{"status": "recovered_after_429"}');
    assert.strictEqual(attempt429, 2, 'Should succeed on attempt 2');
    assert.strictEqual(recordedDelays429.length, 1, 'Exactly one sleep should have occurred');
    console.log(`✅ Passed Test 2: HTTP 429 recovered on retry (delay was ${recordedDelays429[0]}ms)`);

    // -------------------------------------------------------------
    // 3. HTTP 503 retry
    // -------------------------------------------------------------
    console.log('\nTest 3: HTTP 503 retry and recovery...');
    let attempt503 = 0;
    const recordedDelays503 = [];
    axios.post = async () => {
      attempt503++;
      if (attempt503 === 1) {
        const error = new Error('Request failed with status code 503');
        error.response = { status: 503, data: { error: 'Model overloaded' } };
        throw error;
      }
      return {
        data: {
          candidates: [{ content: { parts: [{ text: '{"status": "recovered_after_503"}' }] } }]
        }
      };
    };

    const text503 = await callGemini('test prompt', {
      sleepFn: async (ms) => recordedDelays503.push(ms),
      limiter: null
    });
    assert.strictEqual(text503, '{"status": "recovered_after_503"}');
    assert.strictEqual(attempt503, 2);
    assert.strictEqual(recordedDelays503.length, 1);
    console.log('✅ Passed Test 3: HTTP 503 recovered on retry');

    // -------------------------------------------------------------
    // 4. Network failure retry
    // -------------------------------------------------------------
    console.log('\nTest 4: Network failure retry and recovery...');
    let attemptNet = 0;
    const recordedDelaysNet = [];
    axios.post = async () => {
      attemptNet++;
      if (attemptNet === 1) {
        const error = new Error('socket hang up');
        error.code = 'ECONNRESET';
        throw error;
      }
      return {
        data: {
          candidates: [{ content: { parts: [{ text: '{"status": "recovered_after_net_err"}' }] } }]
        }
      };
    };

    const textNet = await callGemini('test prompt', {
      sleepFn: async (ms) => recordedDelaysNet.push(ms),
      limiter: null
    });
    assert.strictEqual(textNet, '{"status": "recovered_after_net_err"}');
    assert.strictEqual(attemptNet, 2);
    assert.strictEqual(recordedDelaysNet.length, 1);
    console.log('✅ Passed Test 4: Network failure recovered on retry');

    // -------------------------------------------------------------
    // 5. Permanent 400 failure (no retry)
    // -------------------------------------------------------------
    console.log('\nTest 5: Permanent 400 failure does not retry...');
    let attempt400 = 0;
    const recordedDelays400 = [];
    axios.post = async () => {
      attempt400++;
      const error = new Error('Request failed with status code 400');
      error.response = { status: 400, data: { error: 'Bad Request' } };
      throw error;
    };

    await assert.rejects(
      async () => {
        await callGemini('bad prompt', {
          sleepFn: async (ms) => recordedDelays400.push(ms),
          limiter: null,
          maxRetries: 3
        });
      },
      (err) => err.response?.status === 400
    );
    assert.strictEqual(attempt400, 1, '400 must fail immediately without retries');
    assert.strictEqual(recordedDelays400.length, 0);
    console.log('✅ Passed Test 5: Permanent 400 fails immediately without retrying');

    // -------------------------------------------------------------
    // 6. Permanent auth/config failure (401 / 403, no retry)
    // -------------------------------------------------------------
    console.log('\nTest 6: Permanent 401 and 403 do not retry...');
    let attempt403 = 0;
    axios.post = async () => {
      attempt403++;
      const error = new Error('Request failed with status code 403');
      error.response = { status: 403, data: { error: 'API key not valid' } };
      throw error;
    };

    await assert.rejects(
      async () => {
        await callGemini('test prompt', { limiter: null, maxRetries: 3 });
      },
      (err) => err.response?.status === 403
    );
    assert.strictEqual(attempt403, 1, '403 must fail immediately without retrying');

    let attempt401 = 0;
    axios.post = async () => {
      attempt401++;
      const error = new Error('Request failed with status code 401');
      error.response = { status: 401, data: { error: 'Unauthorized' } };
      throw error;
    };

    await assert.rejects(
      async () => {
        await callGemini('test prompt', { limiter: null, maxRetries: 3 });
      },
      (err) => err.response?.status === 401
    );
    assert.strictEqual(attempt401, 1, '401 must fail immediately without retrying');
    console.log('✅ Passed Test 6: Auth/Config 401 and 403 fail immediately without retrying');

    // -------------------------------------------------------------
    // 7. Exhausted retries propagates final error
    // -------------------------------------------------------------
    console.log('\nTest 7: Exhausted retries propagates final error...');
    let attemptExhaust = 0;
    const recordedDelaysExhaust = [];
    axios.post = async () => {
      attemptExhaust++;
      const error = new Error('Request failed with status code 503');
      error.response = { status: 503, data: { error: 'High demand' } };
      throw error;
    };

    await assert.rejects(
      async () => {
        await callGemini('test prompt', {
          sleepFn: async (ms) => recordedDelaysExhaust.push(ms),
          limiter: null,
          maxRetries: 3
        });
      },
      (err) => err.response?.status === 503
    );
    // 1 initial attempt + 3 retries = 4 total calls
    assert.strictEqual(attemptExhaust, 4);
    assert.strictEqual(recordedDelaysExhaust.length, 3);
    console.log('✅ Passed Test 7: Exhausted retries propagates final error');

    // -------------------------------------------------------------
    // 8. Retry limit configurable
    // -------------------------------------------------------------
    console.log('\nTest 8: Configurable retry limit...');
    let attemptLimit = 0;
    axios.post = async () => {
      attemptLimit++;
      const error = new Error('429');
      error.response = { status: 429 };
      throw error;
    };

    await assert.rejects(
      async () => {
        await callGemini('test', {
          maxRetries: 1,
          sleepFn: async () => {},
          limiter: null
        });
      },
      (err) => err.response?.status === 429
    );
    // 1 initial + 1 retry = 2 calls
    assert.strictEqual(attemptLimit, 2);
    console.log('✅ Passed Test 8: Retry limit respected (maxRetries: 1 executed 2 attempts)');

    // -------------------------------------------------------------
    // 9. Backoff behavior (increasing exponential delays)
    // -------------------------------------------------------------
    console.log('\nTest 9: Exponential backoff calculation...');
    const base = 1000;
    const max = 10000;
    // With zero jitter
    const delay1 = calculateBackoffDelay(1, base, max, () => 0);
    const delay2 = calculateBackoffDelay(2, base, max, () => 0);
    const delay3 = calculateBackoffDelay(3, base, max, () => 0);

    assert.strictEqual(delay1, 1000, 'Attempt 1 should be base delay (1000ms)');
    assert.strictEqual(delay2, 2000, 'Attempt 2 should be double (2000ms)');
    assert.strictEqual(delay3, 4000, 'Attempt 3 should be quadruple (4000ms)');
    console.log(`✅ Passed Test 9: Exponential backoff verified (1: ${delay1}ms, 2: ${delay2}ms, 3: ${delay3}ms)`);

    // -------------------------------------------------------------
    // 10. Maximum delay capped
    // -------------------------------------------------------------
    console.log('\nTest 10: Maximum delay cap...');
    const cappedDelay = calculateBackoffDelay(6, base, 5000, () => 0);
    assert.strictEqual(cappedDelay, 5000, 'Delay must be capped at maxDelayMs');

    const cappedWithJitter = calculateBackoffDelay(6, base, 5000, () => 1);
    assert.strictEqual(cappedWithJitter, 5000, 'Delay with jitter must still be capped at maxDelayMs');
    console.log('✅ Passed Test 10: Delay strictly capped at maxDelayMs');

    // -------------------------------------------------------------
    // 11. Jitter testing deterministically
    // -------------------------------------------------------------
    console.log('\nTest 11: Jitter implementation...');
    const delayNoJitter = calculateBackoffDelay(1, 1000, 10000, () => 0);
    const delayHalfJitter = calculateBackoffDelay(1, 1000, 10000, () => 0.5);
    const delayFullJitter = calculateBackoffDelay(1, 1000, 10000, () => 1.0);

    assert.strictEqual(delayNoJitter, 1000);
    // 1000 + 1000 * 0.25 * 0.5 = 1125
    assert.strictEqual(delayHalfJitter, 1125);
    // 1000 + 1000 * 0.25 * 1.0 = 1250
    assert.strictEqual(delayFullJitter, 1250);
    assert(delayNoJitter < delayHalfJitter && delayHalfJitter < delayFullJitter);
    console.log(`✅ Passed Test 11: Jitter verified deterministically (0%: ${delayNoJitter}ms, 50%: ${delayHalfJitter}ms, 100%: ${delayFullJitter}ms)`);

    // -------------------------------------------------------------
    // 11b. Retry-After header parsing
    // -------------------------------------------------------------
    console.log('\nTest 11b: Retry-After header parsing...');
    const retryErr = {
      response: {
        headers: { 'retry-after': '5' }
      }
    };
    const retryAfterMs = getRetryAfterDelayMs(retryErr, 10000);
    assert.strictEqual(retryAfterMs, 5000, 'Retry-After: 5 should convert to 5000ms');

    const cappedRetryAfter = getRetryAfterDelayMs(retryErr, 3000);
    assert.strictEqual(cappedRetryAfter, 3000, 'Retry-After should be capped at maxDelayMs');
    console.log('✅ Passed Test 11b: Retry-After header parsed and capped');

    // -------------------------------------------------------------
    // 12. Rate / Concurrency limiting
    // -------------------------------------------------------------
    console.log('\nTest 12: Concurrency limiter...');
    const limiter = new ConcurrencyLimiter(2); // Max 2 concurrent
    let activeRunning = 0;
    let maxSeenActive = 0;

    const runTask = async (id, durationMs, shouldFail = false) => {
      return await limiter.run(async () => {
        activeRunning++;
        if (activeRunning > maxSeenActive) {
          maxSeenActive = activeRunning;
        }
        await new Promise((r) => setTimeout(r, durationMs));
        activeRunning--;
        if (shouldFail) {
          throw new Error(`Task ${id} failed`);
        }
        return `Task ${id} done`;
      });
    };

    // Launch 6 tasks concurrently with limiter
    const promises = [
      runTask(1, 10),
      runTask(2, 10),
      runTask(3, 10, true), // Task 3 fails
      runTask(4, 10),
      runTask(5, 10),
      runTask(6, 10)
    ];

    const results = await Promise.allSettled(promises);
    assert.strictEqual(maxSeenActive, 2, 'Max concurrent tasks must never exceed limit (2)');
    assert.strictEqual(results[0].status, 'fulfilled');
    assert.strictEqual(results[1].status, 'fulfilled');
    assert.strictEqual(results[2].status, 'rejected', 'Task 3 should reject');
    assert.strictEqual(results[3].status, 'fulfilled');
    assert.strictEqual(results[4].status, 'fulfilled');
    assert.strictEqual(results[5].status, 'fulfilled');
    assert.strictEqual(limiter.currentRunning, 0, 'Limiter should release all slots even when task fails');
    assert.strictEqual(limiter.queue.length, 0, 'Limiter queue should be empty');
    console.log('✅ Passed Test 12: Concurrency limiter enforces max limit and releases slots on error');

    // -------------------------------------------------------------
    // 13. Existing six model integration with retry & parseGeminiJson
    // -------------------------------------------------------------
    console.log('\nTest 13: Six model integration with shared request layer & parser...');

    const sampleStartup = {
      startupName: 'AutoPitch AI',
      industry: 'B2B SaaS',
      problem: 'Pitching is hard',
      solution: 'AI-assisted generation',
      targetAudience: 'Early founders',
      usp: 'Investor plans in 60s'
    };

    // Helper to simulate a transient 429 on first try, then successful JSON
    const makeTransientThenSuccessHandler = (jsonString) => {
      let tries = 0;
      return async () => {
        tries++;
        if (tries === 1) {
          const err = new Error('Rate limit');
          err.response = { status: 429, headers: {} };
          throw err;
        }
        return {
          data: {
            candidates: [{ content: { parts: [{ text: `\`\`\`json\n${jsonString}\n\`\`\`` }] } }]
          }
        };
      };
    };

    // 1. Lean Canvas
    axios.post = makeTransientThenSuccessHandler(JSON.stringify({
      startupName: 'AutoPitch AI',
      problem: 'Hard to pitch',
      solution: 'AI plans',
      audience: 'Founders',
      keyMetrics: 'Signups',
      uniqueValueProposition: 'Fast plans',
      channels: 'Web',
      customerSegments: 'Founders',
      costStructure: 'Servers',
      revenueStreams: 'SaaS',
      unfairAdvantage: 'Algorithm'
    }));
    const { generateLeanCanvas } = require('../models/leanCanvas');
    const canvasRes = await generateLeanCanvas(sampleStartup);
    assert.strictEqual(canvasRes.startupName, 'AutoPitch AI');
    assert.strictEqual(canvasRes.uniqueValueProposition, 'Fast plans');
    console.log('  ✅ [leanCanvas] recovered from 429, returned valid Lean Canvas');

    // 2. MVP
    axios.post = makeTransientThenSuccessHandler(JSON.stringify({
      startupName: 'AutoPitch AI',
      coreFeatures: ['Feature 1', 'Feature 2'],
      technicalRequirements: 'React and Node',
      launchTimeline: '6 weeks'
    }));
    const { generateMVP } = require('../models/mvpGenerator');
    const mvpRes = await generateMVP(sampleStartup);
    assert.strictEqual(mvpRes.startupName, 'AutoPitch AI');
    assert.strictEqual(mvpRes.coreFeatures.length, 2);
    console.log('  ✅ [mvpGenerator] recovered from 429, returned valid MVP');

    // 3. Revenue
    axios.post = makeTransientThenSuccessHandler(JSON.stringify({
      revenueStreams: 'SaaS',
      pricingStrategy: 'Tiered',
      expectedMonthlyRevenue: '$10k',
      growthOpportunities: 'Enterprise'
    }));
    const { generateRevenue } = require('../models/revenueModel');
    const revenueRes = await generateRevenue(sampleStartup);
    assert.strictEqual(revenueRes.revenueStreams, 'SaaS');
    console.log('  ✅ [revenueModel] recovered from 429, returned valid Revenue');

    // 4. Pitch
    axios.post = makeTransientThenSuccessHandler(JSON.stringify({
      elevatorPitch: 'AutoPitch AI builds pitch decks in 60 seconds.'
    }));
    const { generatePitch } = require('../models/pitchModel');
    const pitchRes = await generatePitch(sampleStartup);
    assert.strictEqual(pitchRes.elevatorPitch, 'AutoPitch AI builds pitch decks in 60 seconds.');
    console.log('  ✅ [pitchModel] recovered from 429, returned valid Pitch');

    // 5. Personas
    axios.post = makeTransientThenSuccessHandler(JSON.stringify({
      personas: [{ name: 'Founder Alex', age: '30', occupation: 'CEO', goals: 'Fundraise', painPoints: 'Time', techComfortLevel: 'High' }]
    }));
    const { generatePersonas } = require('../models/personasModel');
    const personasRes = await generatePersonas(sampleStartup);
    assert.strictEqual(personasRes.personas.length, 1);
    assert.strictEqual(personasRes.personas[0].name, 'Founder Alex');
    console.log('  ✅ [personasModel] recovered from 429, returned valid Personas');

    // 6. Competitors
    axios.post = makeTransientThenSuccessHandler(JSON.stringify({
      competitors: [{ name: 'Comp1', description: 'Deck app', differentiator: 'Manual only' }]
    }));
    const { generateCompetitors } = require('../models/competitorsModel');
    const compRes = await generateCompetitors(sampleStartup);
    assert.strictEqual(compRes.competitors.length, 1);
    assert.strictEqual(compRes.competitors[0].name, 'Comp1');
    console.log('  ✅ [competitorsModel] recovered from 429, returned valid Competitors');

    console.log('✅ Passed Test 13: All 6 models successfully integrate with retry layer and JSON parser');

  } finally {
    axios.post = originalPost;
  }
}

runTests().then(() => {
  console.log('\n====================================================');
  console.log('🎉 ALL GEMINI CLIENT & RETRY TESTS PASSED CLEANLY!');
  console.log('====================================================\n');
}).catch((err) => {
  console.error('\n❌ Gemini client tests failed:', err);
  process.exit(1);
});
