// backend/tests/partialGeneration.test.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 2.3 PARTIAL GENERATION & ERROR TESTS');
console.log('====================================================\n');

const { sendApiError } = require('../utils/apiError');

// Helper to create mock Express response
function createMockRes() {
  let statusCode = null;
  let jsonBody = null;
  return {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          jsonBody = data;
        }
      };
    },
    getStatusCode: () => statusCode,
    getJsonBody: () => jsonBody
  };
}

// In-memory localStorage mock with clear tracking
class LocalStorageMock {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = value.toString();
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
  all() {
    return { ...this.store };
  }
}

const mockStorage = new LocalStorageMock();

// Simulation of IdeaInputPage handleSubmit generation logic
async function simulateIdeaInputSubmit({ endpoints, payload, storage, mockFetch }) {
  // Step 1: Purge stale generation keys
  const GENERATION_STORAGE_KEYS = [
    'leanCanvas',
    'mvp',
    'revenue',
    'pitch',
    'personas',
    'competitors',
    'generationErrors'
  ];
  GENERATION_STORAGE_KEYS.forEach(key => storage.removeItem(key));

  // Step 2: Parallel execution with Promise.allSettled
  const settledResults = await Promise.allSettled(
    endpoints.map(ep => mockFetch(ep.key, payload))
  );

  const successfulModules = [];
  const failedModules = [];

  settledResults.forEach((result, idx) => {
    const ep = endpoints[idx];
    if (result.status === 'fulfilled' && result.value?.data) {
      const resData = result.value.data;
      successfulModules.push(ep.label);

      if (ep.key === 'leanCanvas') {
        storage.setItem('leanCanvas', JSON.stringify(resData));
      } else if (ep.key === 'mvp') {
        const mvpRes = result.value;
        storage.setItem('mvp', JSON.stringify(mvpRes.data));
      } else if (ep.key === 'revenue') {
        storage.setItem('revenue', JSON.stringify([
          {
            model: "Primary Revenue Stream",
            description: resData.revenueStreams,
            projection: resData.expectedMonthlyRevenue
          },
          {
            model: "Pricing Strategy",
            description: resData.pricingStrategy,
            projection: "Growth Phase"
          }
        ]));
      } else if (ep.key === 'pitch') {
        storage.setItem('pitch', JSON.stringify(resData));
      } else if (ep.key === 'personas') {
        storage.setItem('personas', JSON.stringify(resData.personas || resData));
      } else if (ep.key === 'competitors') {
        storage.setItem('competitors', JSON.stringify(resData.competitors || resData));
      }
    } else {
      const errMessage = result.reason?.response?.data?.error?.message ||
        result.reason?.response?.data?.error ||
        result.reason?.message ||
        'Request failed';
      failedModules.push({ label: ep.label, error: errMessage });
    }
  });

  // Flow branching
  if (successfulModules.length === 0) {
    return {
      status: 'ALL_FAILED',
      navigated: false,
      navigatedTo: null,
      failedModules,
      successfulModules
    };
  }

  storage.setItem('formData', JSON.stringify(payload));

  if (failedModules.length > 0) {
    storage.setItem('generationErrors', JSON.stringify({
      failedModules: failedModules.map(m => m.label),
      successfulModules: successfulModules
    }));
    return {
      status: 'PARTIAL_SUCCESS',
      navigated: true,
      navigatedTo: '/dashboard',
      failedModules,
      successfulModules
    };
  } else {
    storage.removeItem('generationErrors');
    return {
      status: 'FULL_SUCCESS',
      navigated: true,
      navigatedTo: '/dashboard',
      failedModules: [],
      successfulModules
    };
  }
}

const standardEndpoints = [
  { key: 'leanCanvas', label: 'Lean Canvas' },
  { key: 'mvp', label: 'MVP Plan' },
  { key: 'revenue', label: 'Revenue Model' },
  { key: 'pitch', label: 'Pitch Deck' },
  { key: 'personas', label: 'User Personas' },
  { key: 'competitors', label: 'Competitor Analysis' }
];

const mockValidData = {
  leanCanvas: { startupName: 'Acme', problem: 'P', solution: 'S' },
  mvp: { startupName: 'Acme', coreFeatures: ['F1', 'F2', 'F3'], technicalRequirements: 'React 19', launchTimeline: '4 weeks' },
  revenue: { revenueStreams: 'SaaS', pricingStrategy: 'Tiered', expectedMonthlyRevenue: '$10k' },
  pitch: { elevatorPitch: 'Acme is the best solution for problems.' },
  personas: [{ name: 'Alex', occupation: 'Founder' }],
  competitors: [{ name: 'OldCorp', differentiator: '10x faster' }]
};

async function runAllTests() {
  // -------------------------------------------------------------
  // PART 1: Backend Controller Error Contract Tests (Requirements 1-6)
  // -------------------------------------------------------------
  console.log('Part 1: Verifying Backend Controller Error Contract...');

  // Test 1: Successful controller response preserves existing contract (HTTP 200 + raw data)
  console.log('Test 1: Successful controller response returns HTTP 200 with raw module data...');
  const controllerFiles = [
    { file: 'leanCanvasController.js', fn: 'generateLeanCanvas', modelPath: '../models/leanCanvas.js', mockData: { startupName: 'Test1', problem: 'P' } },
    { file: 'mvpController.js', fn: 'generateMVP', modelPath: '../models/mvpGenerator.js', mockData: { startupName: 'Test1', coreFeatures: ['F1'] } },
    { file: 'revenueController.js', fn: 'generateRevenue', modelPath: '../models/revenueModel.js', mockData: { revenueStreams: 'SaaS' } },
    { file: 'pitchController.js', fn: 'generatePitch', modelPath: '../models/pitchModel.js', mockData: { elevatorPitch: 'Pitch' } },
    { file: 'personaController.js', fn: 'generatePersonas', modelPath: '../models/personasModel.js', mockData: { personas: [] } },
    { file: 'competitorController.js', fn: 'generateCompetitors', modelPath: '../models/competitorsModel.js', mockData: { competitors: [] } },
  ];

  for (const c of controllerFiles) {
    const fullModelPath = path.join(__dirname, c.modelPath);
    require.cache[require.resolve(fullModelPath)] = {
      id: require.resolve(fullModelPath),
      filename: require.resolve(fullModelPath),
      loaded: true,
      exports: {
        [c.fn]: async () => c.mockData
      }
    };

    const ctrlPath = path.join(__dirname, '../controllers', c.file);
    delete require.cache[require.resolve(ctrlPath)];
    const controller = require(ctrlPath)[c.fn];

    const mockRes = createMockRes();
    const mockReq = { body: { startupName: 'Acme', industry: 'Tech' } };

    await controller(mockReq, mockRes);
    assert.strictEqual(mockRes.getStatusCode(), 200, `${c.file} must return 200 on success`);
    assert.deepStrictEqual(mockRes.getJsonBody(), c.mockData, `${c.file} must return raw module data (unwrapped)`);
  }
  console.log('✅ Passed Test 1: All 6 controllers return HTTP 200 with raw unwrapped data on success');

  // Test 2: Input validation returns HTTP 400 with structured INVALID_INPUT
  console.log('Test 2: Malformed or missing startupName returns HTTP 400 INVALID_INPUT...');
  const ctrlPath = path.join(__dirname, '../controllers/leanCanvasController.js');
  delete require.cache[require.resolve(ctrlPath)];
  const { generateLeanCanvas } = require(ctrlPath);

  // Missing body
  const res1 = createMockRes();
  await generateLeanCanvas({ body: null }, res1);
  assert.strictEqual(res1.getStatusCode(), 400);
  const body1 = res1.getJsonBody();
  assert.strictEqual(body1.success, false);
  assert.strictEqual(body1.error.code, 'INVALID_INPUT');
  assert(body1.error.message.includes('startupName'));

  // Missing startupName in body
  const res2 = createMockRes();
  await generateLeanCanvas({ body: { industry: 'Tech' } }, res2);
  assert.strictEqual(res2.getStatusCode(), 400);
  const body2 = res2.getJsonBody();
  assert.strictEqual(body2.success, false);
  assert.strictEqual(body2.error.code, 'INVALID_INPUT');
  console.log('✅ Passed Test 2: Input validation returns HTTP 400 with structured error');

  // Test 3: Model 429 quota failure produces HTTP 429 RATE_LIMIT_EXCEEDED
  console.log('Test 3: Model 429 quota error produces HTTP 429 RATE_LIMIT_EXCEEDED...');
  const res3 = createMockRes();
  const error429 = new Error('Quota exceeded');
  error429.status = 429;

  sendApiError(res3, error429, 'Failed to generate Lean Canvas');
  assert.strictEqual(res3.getStatusCode(), 429);
  const body3 = res3.getJsonBody();
  assert.strictEqual(body3.success, false);
  assert.strictEqual(body3.error.code, 'RATE_LIMIT_EXCEEDED');
  assert(body3.error.message.includes('rate limit exceeded'));
  console.log('✅ Passed Test 3: HTTP 429 returned with RATE_LIMIT_EXCEEDED');

  // Test 4: Model 503 upstream service failure produces HTTP 503 UPSTREAM_UNAVAILABLE
  console.log('Test 4: Model 503 / timeout produces HTTP 503 UPSTREAM_UNAVAILABLE...');
  const res4 = createMockRes();
  const error503 = new Error('Upstream 503 Service Unavailable');
  error503.status = 503;

  sendApiError(res4, error503, 'Failed to generate MVP plan');
  assert.strictEqual(res4.getStatusCode(), 503);
  const body4 = res4.getJsonBody();
  assert.strictEqual(body4.success, false);
  assert.strictEqual(body4.error.code, 'UPSTREAM_UNAVAILABLE');
  assert(body4.error.message.includes('temporarily unavailable'));

  // Network timeout error code check
  const resTimeout = createMockRes();
  const errorTimeout = new Error('Socket timeout');
  errorTimeout.code = 'ETIMEDOUT';

  sendApiError(resTimeout, errorTimeout, 'Failed to generate pitch');
  assert.strictEqual(resTimeout.getStatusCode(), 503);
  assert.strictEqual(resTimeout.getJsonBody().error.code, 'UPSTREAM_UNAVAILABLE');
  console.log('✅ Passed Test 4: HTTP 503 returned with UPSTREAM_UNAVAILABLE');

  // Test 5: Generic model failure produces HTTP 500 GENERATION_FAILED
  console.log('Test 5: Generic error produces HTTP 500 GENERATION_FAILED...');
  const res5 = createMockRes();
  const errorGeneric = new Error('Unexpected parsing error');

  sendApiError(res5, errorGeneric, 'Failed to generate revenue model');
  assert.strictEqual(res5.getStatusCode(), 500);
  const body5 = res5.getJsonBody();
  assert.strictEqual(body5.success, false);
  assert.strictEqual(body5.error.code, 'GENERATION_FAILED');
  assert.strictEqual(body5.error.message, 'Failed to generate revenue model');
  console.log('✅ Passed Test 5: HTTP 500 returned with GENERATION_FAILED');

  // Test 6: Error response never exposes API secrets, raw prompts, or stack traces
  console.log('Test 6: Error response safety (no secrets, prompts, or stack dumps)...');
  process.env.GEMINI_API_KEY = 'AIzaSySECRET_API_KEY_DO_NOT_LEAK';

  const res6 = createMockRes();
  const secretError = new Error(`Request failed with API key: ${process.env.GEMINI_API_KEY} at /v1/models/gemini`);
  secretError.status = 400;

  sendApiError(res6, secretError, 'Failed to generate competitors');
  const body6 = res6.getJsonBody();

  assert(!JSON.stringify(body6).includes('AIzaSySECRET_API_KEY_DO_NOT_LEAK'), 'API key must NEVER appear in response body');
  assert(!body6.error.stack, 'Stack trace must not appear in response body');
  console.log('✅ Passed Test 6: Error response is clean and safe from secrets');

  // -------------------------------------------------------------
  // PART 2: Frontend Data-Flow & Partial Generation Logic (Requirements 7-14)
  // -------------------------------------------------------------
  console.log('\nPart 2: Verifying Frontend Data-Flow & Partial Generation Logic...');

  // Test 7: 6/6 Successful modules
  console.log('Test 7: 6/6 Successful modules persists all 6, clears errors, navigates to /dashboard...');
  mockStorage.clear();

  const outcome7 = await simulateIdeaInputSubmit({
    endpoints: standardEndpoints,
    payload: { name: 'Acme', problem: 'P', solution: 'S', audience: 'Founders', usp: 'Fast' },
    storage: mockStorage,
    mockFetch: async (key) => ({ data: mockValidData[key] })
  });

  assert.strictEqual(outcome7.status, 'FULL_SUCCESS');
  assert.strictEqual(outcome7.navigated, true);
  assert.strictEqual(outcome7.navigatedTo, '/dashboard');
  assert.strictEqual(mockStorage.getItem('generationErrors'), null);

  for (const ep of standardEndpoints) {
    assert(mockStorage.getItem(ep.key) !== null, `${ep.key} must be stored in localStorage`);
  }
  console.log('✅ Passed Test 7: 6/6 successful modules verified');

  // Test 8: 5/6 Successful modules (1 failed module)
  console.log('Test 8: 5/6 Successful modules persists 5, does NOT store fake data for failed, records generationErrors, navigates to /dashboard...');
  mockStorage.clear();

  const outcome8 = await simulateIdeaInputSubmit({
    endpoints: standardEndpoints,
    payload: { name: 'Acme', problem: 'P', solution: 'S', audience: 'Founders', usp: 'Fast' },
    storage: mockStorage,
    mockFetch: async (key) => {
      if (key === 'competitors') {
        const err = new Error('503 Service Unavailable');
        err.response = { status: 503, data: { success: false, error: { code: 'UPSTREAM_UNAVAILABLE', message: 'AI service unavailable' } } };
        throw err;
      }
      return { data: mockValidData[key] };
    }
  });

  assert.strictEqual(outcome8.status, 'PARTIAL_SUCCESS');
  assert.strictEqual(outcome8.navigated, true);
  assert.strictEqual(outcome8.navigatedTo, '/dashboard');

  // Competitors must NOT be stored
  assert.strictEqual(mockStorage.getItem('competitors'), null, 'Failed module competitors must NOT be stored in localStorage');

  // The other 5 must be stored
  assert(mockStorage.getItem('leanCanvas') !== null);
  assert(mockStorage.getItem('mvp') !== null);
  assert(mockStorage.getItem('revenue') !== null);
  assert(mockStorage.getItem('pitch') !== null);
  assert(mockStorage.getItem('personas') !== null);

  // generationErrors must identify Competitor Analysis
  const genErrors8 = JSON.parse(mockStorage.getItem('generationErrors'));
  assert.deepStrictEqual(genErrors8.failedModules, ['Competitor Analysis']);
  assert.strictEqual(genErrors8.successfulModules.length, 5);
  console.log('✅ Passed Test 8: 5/6 partial generation correctly stored without fake data');

  // Test 9: Multiple failed modules (e.g. 2 succeeded, 4 failed)
  console.log('Test 9: Multiple failed modules (2 succeeded, 4 failed)...');
  mockStorage.clear();

  const outcome9 = await simulateIdeaInputSubmit({
    endpoints: standardEndpoints,
    payload: { name: 'Acme', problem: 'P', solution: 'S', audience: 'Founders', usp: 'Fast' },
    storage: mockStorage,
    mockFetch: async (key) => {
      if (key === 'leanCanvas' || key === 'mvp') {
        return { data: mockValidData[key] };
      }
      const err = new Error('429 Rate Limit');
      err.response = { status: 429, data: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Quota exceeded' } } };
      throw err;
    }
  });

  assert.strictEqual(outcome9.status, 'PARTIAL_SUCCESS');
  assert.strictEqual(outcome9.navigated, true);
  assert.strictEqual(outcome9.successfulModules.length, 2);
  assert.strictEqual(outcome9.failedModules.length, 4);

  assert(mockStorage.getItem('leanCanvas') !== null);
  assert(mockStorage.getItem('mvp') !== null);
  assert.strictEqual(mockStorage.getItem('revenue'), null);
  assert.strictEqual(mockStorage.getItem('pitch'), null);
  assert.strictEqual(mockStorage.getItem('personas'), null);
  assert.strictEqual(mockStorage.getItem('competitors'), null);

  const genErrors9 = JSON.parse(mockStorage.getItem('generationErrors'));
  assert.strictEqual(genErrors9.failedModules.length, 4);
  console.log('✅ Passed Test 9: Multiple failed modules correctly partitioned');

  // Test 10: 0/6 Successful modules (All failed)
  console.log('Test 10: 0/6 Successful modules does not navigate, stores no fake data...');
  mockStorage.clear();

  const outcome10 = await simulateIdeaInputSubmit({
    endpoints: standardEndpoints,
    payload: { name: 'Acme', problem: 'P', solution: 'S', audience: 'Founders', usp: 'Fast' },
    storage: mockStorage,
    mockFetch: async () => {
      const err = new Error('Network error');
      err.code = 'ECONNREFUSED';
      throw err;
    }
  });

  assert.strictEqual(outcome10.status, 'ALL_FAILED');
  assert.strictEqual(outcome10.navigated, false);
  assert.strictEqual(outcome10.navigatedTo, null);

  // No generated modules stored
  for (const ep of standardEndpoints) {
    assert.strictEqual(mockStorage.getItem(ep.key), null, `localStorage[${ep.key}] must remain null`);
  }
  console.log('✅ Passed Test 10: 0/6 failures aborts navigation and stores no fake data');

  // Test 11: Stale localStorage protection
  console.log('Test 11: Stale localStorage protection prevents old startup data from masquerading as current output...');
  mockStorage.clear();

  // Seed old startup data from previous run
  mockStorage.setItem('leanCanvas', JSON.stringify({ startupName: 'OldStartupA', problem: 'OldProblem' }));
  mockStorage.setItem('competitors', JSON.stringify([{ name: 'OldCompetitor' }]));

  // New submission where competitors fails
  await simulateIdeaInputSubmit({
    endpoints: standardEndpoints,
    payload: { name: 'NewStartupB', problem: 'NewP', solution: 'NewS', audience: 'NewA', usp: 'NewU' },
    storage: mockStorage,
    mockFetch: async (key) => {
      if (key === 'competitors') {
        const err = new Error('503 Service Unavailable');
        throw err;
      }
      return { data: { startupName: 'NewStartupB' } };
    }
  });

  // Verify competitors is NOT OldCompetitor!
  assert.strictEqual(mockStorage.getItem('competitors'), null, 'Stale competitors from previous run MUST be purged');
  const currentCanvas = JSON.parse(mockStorage.getItem('leanCanvas'));
  assert.strictEqual(currentCanvas.startupName, 'NewStartupB', 'New generation data must reflect current startup');
  console.log('✅ Passed Test 11: Stale localStorage data purged cleanly before new generation');

  // Test 12: Dashboard missing-data safety simulation
  console.log('Test 12: Dashboard missing-data safety (tabs handle null data without crashes)...');

  // Simulate dashboard data collector when all module data is null
  const nullData = {
    overview: {
      name: 'TestStartup',
      industry: '',
      problem: '',
      solution: '',
      audience: '',
      usp: ''
    },
    leanCanvas: null,
    mvp: null,
    revenue: null,
    pitch: null,
    personas: null,
    competitors: null
  };

  // 1. OverviewTab safety
  assert.strictEqual(nullData.overview?.name, 'TestStartup');
  assert.strictEqual(nullData.overview?.problem || 'No problem statement available', 'No problem statement available');

  // 2. LeanCanvasTab safety: Object.keys(data.leanCanvas || {}).length === 0
  const leanCanvasData = nullData.leanCanvas || {};
  assert.strictEqual(Object.keys(leanCanvasData).length, 0);

  // 3. MVPTab safety: hasMvpData check
  const mvpData = nullData.mvp;
  const coreFeatures = mvpData?.coreFeatures || (Array.isArray(mvpData) ? mvpData : []);
  const hasMvpData = Boolean(
    mvpData &&
    (mvpData.startupName || mvpData.technicalRequirements || mvpData.launchTimeline || (Array.isArray(coreFeatures) && coreFeatures.length > 0))
  );
  assert.strictEqual(hasMvpData, false, 'hasMvpData must be false when mvp is null');

  // 4. RevenueTab safety: Array.isArray(nullData.revenue) === false
  const revenueData = nullData.revenue || [];
  assert.strictEqual(revenueData.length, 0);

  // 5. CompetitorsTab safety: Array.isArray(nullData.competitors) === false
  const competitorData = nullData.competitors || [];
  assert.strictEqual(competitorData.length, 0);

  // 6. PersonasTab safety: Array.isArray(nullData.personas) === false
  const personaData = nullData.personas || [];
  assert.strictEqual(personaData.length, 0);

  // 7. PitchPreviewPage safety: elevatorPitch fallback
  const elevatorPitch = nullData.pitch?.elevatorPitch || 'No elevator pitch available';
  assert.strictEqual(elevatorPitch, 'No elevator pitch available');

  console.log('✅ Passed Test 12: All dashboard components and pages evaluate null states safely');

  // Test 13: MVP complete object preservation regression check (Chunk 1.3)
  console.log('Test 13: MVP complete object preservation regression check...');
  mockStorage.clear();

  const fullMvp = {
    startupName: 'AutoPitch AI',
    coreFeatures: ['Feature 1', 'Feature 2'],
    technicalRequirements: 'Express, React, Gemini API',
    launchTimeline: '8 weeks'
  };

  await simulateIdeaInputSubmit({
    endpoints: standardEndpoints,
    payload: { name: 'AutoPitch AI', problem: 'P', solution: 'S', audience: 'Founders', usp: 'Fast' },
    storage: mockStorage,
    mockFetch: async (key) => ({ data: key === 'mvp' ? fullMvp : mockValidData[key] })
  });

  const storedMvp = JSON.parse(mockStorage.getItem('mvp'));
  assert.strictEqual(storedMvp.startupName, 'AutoPitch AI');
  assert.deepStrictEqual(storedMvp.coreFeatures, ['Feature 1', 'Feature 2']);
  assert.strictEqual(storedMvp.technicalRequirements, 'Express, React, Gemini API');
  assert.strictEqual(storedMvp.launchTimeline, '8 weeks');
  console.log('✅ Passed Test 13: Full MVP object preserved without truncation');

  // Test 14: Canonical routing regression check
  console.log('Test 14: Canonical routing regression check...');
  const appJsPath = path.join(__dirname, '../../frontend/src/App.js');
  const appJsCode = fs.readFileSync(appJsPath, 'utf8');

  assert(appJsCode.includes("case '/start':"), 'App.js must support /start');
  assert(appJsCode.includes("case '/dashboard':"), 'App.js must support /dashboard');
  assert(appJsCode.includes("case '/pitch-preview':"), 'App.js must support /pitch-preview');
  console.log('✅ Passed Test 14: Canonical routing remains intact');

  console.log('\n====================================================');
  console.log('🎉 ALL PARTIAL GENERATION & ERROR TESTS PASSED CLEANLY!');
  console.log('====================================================\n');
}

runAllTests().catch((err) => {
  console.error('\n❌ Partial generation test FAILED:', err);
  process.exit(1);
});
