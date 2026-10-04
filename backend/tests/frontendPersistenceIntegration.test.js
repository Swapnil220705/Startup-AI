// backend/tests/frontendPersistenceIntegration.test.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { createDatabaseInstance } = require('../db/database');
const {
  createPlan,
  getPlanById,
  listPlans
} = require('../services/planService');
const {
  createPlanController,
  getPlanByIdController
} = require('../controllers/planController');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 3.2 FRONTEND PERSISTENCE INTEGRATION TESTS');
console.log('====================================================\n');

// In-memory mock localStorage
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

// Express mock response
function createMockRes() {
  let statusCode = 200;
  let jsonBody = null;
  return {
    status: (code) => {
      statusCode = code;
      return {
        json: (data) => {
          jsonBody = data;
          return jsonBody;
        }
      };
    },
    json: (data) => {
      jsonBody = data;
      return jsonBody;
    },
    getStatusCode: () => statusCode,
    getJsonBody: () => jsonBody
  };
}

// Simulated IdeaInputPage handleSubmit logic matching frontend/src/pages/IdeaInputPage.js exactly
async function simulateIdeaInputSubmit({
  formData,
  storage,
  mockGenerationFetch,
  mockPersistencePost,
  initialIsLoading = false
}) {
  if (initialIsLoading) {
    return { status: 'BLOCKED_DUPLICATE_SUBMIT', navigated: false };
  }

  let isLoading = true;
  let navigated = false;
  let navigatedTo = null;

  // 1. Purge stale generation data
  const GENERATION_STORAGE_KEYS = [
    'leanCanvas',
    'mvp',
    'revenue',
    'pitch',
    'personas',
    'competitors',
    'generationErrors',
    'currentPlanId',
    'planPersistenceStatus'
  ];
  GENERATION_STORAGE_KEYS.forEach(key => storage.removeItem(key));

  const payload = {
    startupName: formData.name,
    industry: formData.domain,
    problem: formData.problem,
    solution: formData.solution,
    targetAudience: formData.audience,
    usp: formData.usp
  };

  const endpoints = [
    { key: 'leanCanvas', label: 'Lean Canvas' },
    { key: 'mvp', label: 'MVP Plan' },
    { key: 'revenue', label: 'Revenue Model' },
    { key: 'pitch', label: 'Pitch Deck' },
    { key: 'personas', label: 'User Personas' },
    { key: 'competitors', label: 'Competitor Analysis' }
  ];

  // Parallel generation dispatch
  const settledResults = await Promise.allSettled(
    endpoints.map(ep => mockGenerationFetch(ep.key, payload))
  );

  const successfulModules = [];
  const failedModules = [];
  const persistedModules = {
    leanCanvas: null,
    mvp: null,
    revenue: null,
    pitch: null,
    personas: null,
    competitors: null
  };

  settledResults.forEach((result, idx) => {
    const ep = endpoints[idx];
    if (result.status === 'fulfilled' && result.value?.data) {
      const resData = result.value.data;
      successfulModules.push(ep.label);

      if (ep.key === 'leanCanvas') {
        persistedModules.leanCanvas = resData;
        storage.setItem('leanCanvas', JSON.stringify(resData));
      } else if (ep.key === 'mvp') {
        persistedModules.mvp = resData;
        storage.setItem('mvp', JSON.stringify(resData));
      } else if (ep.key === 'revenue') {
        const revenueItems = [
          {
            model: 'Primary Revenue Stream',
            description: resData.revenueStreams,
            projection: resData.expectedMonthlyRevenue
          },
          {
            model: 'Pricing Strategy',
            description: resData.pricingStrategy,
            projection: 'Growth Phase'
          }
        ];
        persistedModules.revenue = revenueItems;
        storage.setItem('revenue', JSON.stringify(revenueItems));
      } else if (ep.key === 'pitch') {
        persistedModules.pitch = resData;
        storage.setItem('pitch', JSON.stringify(resData));
      } else if (ep.key === 'personas') {
        const personasData = resData.personas || resData;
        persistedModules.personas = personasData;
        storage.setItem('personas', JSON.stringify(personasData));
      } else if (ep.key === 'competitors') {
        const competitorsData = resData.competitors || resData;
        persistedModules.competitors = competitorsData;
        storage.setItem('competitors', JSON.stringify(competitorsData));
      }
    } else {
      const errMessage = result.reason?.message || 'Request failed';
      failedModules.push({ label: ep.label, error: errMessage });
    }
  });

  // 0/6 failure
  if (successfulModules.length === 0) {
    isLoading = false;
    return {
      status: 'ALL_GENERATION_FAILED',
      navigated: false,
      navigatedTo: null,
      failedModules,
      successfulModules
    };
  }

  // At least 1 succeeded: store formData
  storage.setItem('formData', JSON.stringify(formData));

  let genErrorsObj = null;
  if (failedModules.length > 0) {
    genErrorsObj = {
      failedModules: failedModules.map(m => m.label),
      successfulModules: successfulModules
    };
    storage.setItem('generationErrors', JSON.stringify(genErrorsObj));
  } else {
    storage.removeItem('generationErrors');
  }

  // Persist plan to server database via POST /api/plans
  const isPartial = failedModules.length > 0;
  const planPayload = {
    startupName: formData.name,
    industry: formData.domain || '',
    problem: formData.problem || '',
    solution: formData.solution || '',
    targetAudience: formData.audience || '',
    usp: formData.usp || '',
    leanCanvas: persistedModules.leanCanvas,
    mvp: persistedModules.mvp,
    revenue: persistedModules.revenue,
    pitch: persistedModules.pitch,
    personas: persistedModules.personas,
    competitors: persistedModules.competitors,
    generationStatus: isPartial ? 'partial' : 'completed',
    generationErrors: genErrorsObj
  };

  let persistenceCallSucceeded = false;
  try {
    const persistRes = await mockPersistencePost('/api/plans', planPayload);
    const serverPlanId = persistRes.data?.data?.id;
    if (serverPlanId) {
      storage.setItem('currentPlanId', serverPlanId);
      storage.setItem('planPersistenceStatus', 'saved');
      persistenceCallSucceeded = true;
    } else {
      storage.setItem('planPersistenceStatus', 'save_failed');
      storage.removeItem('currentPlanId');
    }
  } catch (persistErr) {
    storage.setItem('planPersistenceStatus', 'save_failed');
    storage.removeItem('currentPlanId');
  }

  isLoading = false;
  navigated = true;
  navigatedTo = '/dashboard';

  return {
    status: isPartial ? 'PARTIAL_SUCCESS' : 'COMPLETE_SUCCESS',
    navigated,
    navigatedTo,
    persistenceCallSucceeded,
    planPayload
  };
}

// Sample fixtures
const validFormData = {
  name: 'HealthCloud',
  domain: 'HealthTech',
  problem: 'Electronic medical records cannot be accessed across clinic networks.',
  solution: 'Zero-knowledge cross-hospital medical records cloud.',
  audience: 'Clinics, physicians, and patients.',
  usp: 'Instant secure patient record access in under 5 seconds.'
};

const mockFullAiResponses = {
  leanCanvas: { startupName: 'HealthCloud', problem: 'EMR fragmentation', solution: 'Unified cloud' },
  mvp: { startupName: 'HealthCloud', coreFeatures: ['Portal', 'Sync engine'], launchTimeline: '6 weeks' },
  revenue: { revenueStreams: 'Subscription fee per clinic', pricingStrategy: 'Tiered', expectedMonthlyRevenue: '$10k/mo' },
  pitch: { elevatorPitch: 'HealthCloud unites fragmented patient records safely.' },
  personas: [{ name: 'Dr. Emily', occupation: 'Physician', goals: 'Fast record access' }],
  competitors: [{ name: 'Epic', description: 'Legacy EHR', differentiator: 'Slow and closed ecosystem' }]
};

async function runTests() {
  const testDb = createDatabaseInstance(':memory:');

  // Test A: Complete generation (6/6) + successful persistence
  console.log('Test A: Complete generation (6/6) + successful persistence...');
  const storageA = new LocalStorageMock();
  const resultA = await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: storageA,
    mockGenerationFetch: async (key) => ({ data: mockFullAiResponses[key] }),
    mockPersistencePost: async (url, payload) => {
      const plan = createPlan(payload, testDb);
      return { data: { success: true, data: plan } };
    }
  });

  assert.strictEqual(resultA.status, 'COMPLETE_SUCCESS');
  assert.strictEqual(resultA.navigated, true);
  assert.strictEqual(resultA.navigatedTo, '/dashboard');
  assert.strictEqual(resultA.persistenceCallSucceeded, true);
  assert(storageA.getItem('currentPlanId'), 'currentPlanId must be set');
  assert.strictEqual(storageA.getItem('planPersistenceStatus'), 'saved');
  assert(storageA.getItem('leanCanvas') !== null, 'localStorage leanCanvas preserved');
  assert(storageA.getItem('mvp') !== null, 'localStorage mvp preserved');
  assert(storageA.getItem('revenue') !== null, 'localStorage revenue preserved');
  assert(storageA.getItem('pitch') !== null, 'localStorage pitch preserved');
  assert(storageA.getItem('personas') !== null, 'localStorage personas preserved');
  assert(storageA.getItem('competitors') !== null, 'localStorage competitors preserved');
  assert.strictEqual(storageA.getItem('generationErrors'), null, 'No generationErrors on full success');
  console.log('✅ Passed Test A: Complete generation persists plan and sets currentPlanId');

  // Test B: Partial generation (e.g. 4 succeeded, 2 failed) + persistence
  console.log('\nTest B: Partial generation (4/6) + successful persistence...');
  const storageB = new LocalStorageMock();
  const resultB = await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: storageB,
    mockGenerationFetch: async (key) => {
      if (key === 'pitch' || key === 'competitors') {
        const err = new Error('503 Service Overload');
        throw err;
      }
      return { data: mockFullAiResponses[key] };
    },
    mockPersistencePost: async (url, payload) => {
      const plan = createPlan(payload, testDb);
      return { data: { success: true, data: plan } };
    }
  });

  assert.strictEqual(resultB.status, 'PARTIAL_SUCCESS');
  assert.strictEqual(resultB.navigated, true);
  assert.strictEqual(resultB.planPayload.generationStatus, 'partial');
  assert.strictEqual(resultB.planPayload.pitch, null, 'Failed module pitch must be null');
  assert.strictEqual(resultB.planPayload.competitors, null, 'Failed module competitors must be null');
  assert(resultB.planPayload.leanCanvas !== null, 'Successful module leanCanvas must be present');
  assert(storageB.getItem('currentPlanId') !== null, 'currentPlanId must be stored');
  assert.strictEqual(storageB.getItem('planPersistenceStatus'), 'saved');
  assert.strictEqual(storageB.getItem('pitch'), null, 'Failed pitch module must NOT be in localStorage');
  assert.strictEqual(storageB.getItem('competitors'), null, 'Failed competitors module must NOT be in localStorage');
  const storedErrors = JSON.parse(storageB.getItem('generationErrors'));
  assert.deepStrictEqual(storedErrors.failedModules, ['Pitch Deck', 'Competitor Analysis']);
  console.log('✅ Passed Test B: Partial generation correctly persists only successful modules without fake data');

  // Test C: Zero generation success (0/6)
  console.log('\nTest C: Zero generation success (0/6)...');
  const storageC = new LocalStorageMock();
  let persistenceCalledC = false;
  const resultC = await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: storageC,
    mockGenerationFetch: async () => {
      throw new Error('Network error');
    },
    mockPersistencePost: async () => {
      persistenceCalledC = true;
      return { data: {} };
    }
  });

  assert.strictEqual(resultC.status, 'ALL_GENERATION_FAILED');
  assert.strictEqual(resultC.navigated, false);
  assert.strictEqual(persistenceCalledC, false, 'POST /api/plans must NOT be called when 0 modules succeed');
  assert.strictEqual(storageC.getItem('currentPlanId'), null, 'No plan ID created on 0/6 failure');
  console.log('✅ Passed Test C: Zero generation aborts without calling POST /api/plans or creating an ID');

  // Test D: Persistence API failure after successful generation
  console.log('\nTest D: Persistence API failure after successful generation...');
  const storageD = new LocalStorageMock();
  const resultD = await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: storageD,
    mockGenerationFetch: async (key) => ({ data: mockFullAiResponses[key] }),
    mockPersistencePost: async () => {
      throw new Error('Database connection failed');
    }
  });

  assert.strictEqual(resultD.navigated, true, 'User navigates to dashboard to use valid local generated data');
  assert.strictEqual(resultD.persistenceCallSucceeded, false);
  assert.strictEqual(storageD.getItem('planPersistenceStatus'), 'save_failed', 'Status must be save_failed');
  assert.strictEqual(storageD.getItem('currentPlanId'), null, 'No fake plan ID must be stored');
  assert(storageD.getItem('leanCanvas') !== null, 'Generated local data remains intact');
  assert(storageD.getItem('mvp') !== null, 'Generated local data remains intact');
  console.log('✅ Passed Test D: Persistence failure does not lose local data and flags save_failed');

  // Test E: Persistence API failure after partial generation
  console.log('\nTest E: Persistence API failure after partial generation...');
  const storageE = new LocalStorageMock();
  const resultE = await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: storageE,
    mockGenerationFetch: async (key) => {
      if (key === 'revenue') throw new Error('Quota exceeded');
      return { data: mockFullAiResponses[key] };
    },
    mockPersistencePost: async () => {
      throw new Error('500 Internal DB Error');
    }
  });

  assert.strictEqual(resultE.navigated, true);
  assert.strictEqual(storageE.getItem('planPersistenceStatus'), 'save_failed');
  assert.strictEqual(storageE.getItem('currentPlanId'), null);
  assert(storageE.getItem('leanCanvas') !== null, 'Available module remains in localStorage');
  assert.strictEqual(storageE.getItem('revenue'), null, 'Failed module remains null');
  assert(storageE.getItem('generationErrors') !== null, 'generationErrors metadata preserved');
  console.log('✅ Passed Test E: Partial generation with persistence failure retains available local data');

  // Test F: Stale plan ID cleanup before new generation
  console.log('\nTest F: Stale plan ID cleanup before new generation...');
  const storageF = new LocalStorageMock();
  storageF.setItem('currentPlanId', 'stale-plan-uuid-from-yesterday');
  storageF.setItem('planPersistenceStatus', 'saved');
  storageF.setItem('leanCanvas', '{"old":"data"}');

  // Start new generation that fails persistence
  await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: storageF,
    mockGenerationFetch: async (key) => ({ data: mockFullAiResponses[key] }),
    mockPersistencePost: async () => {
      throw new Error('Network timeout on DB');
    }
  });

  assert.notStrictEqual(storageF.getItem('currentPlanId'), 'stale-plan-uuid-from-yesterday', 'Stale ID must not persist');
  assert.strictEqual(storageF.getItem('currentPlanId'), null, 'Failed persistence must leave currentPlanId null');
  assert.strictEqual(storageF.getItem('planPersistenceStatus'), 'save_failed');
  console.log('✅ Passed Test F: Stale plan ID purged cleanly and cannot masquerade as new ID');

  // Test G: GET /api/plans/:id (existing plan vs 404 missing plan)
  console.log('\nTest G: GET /api/plans/:id verification...');
  const mockReqCreate = {
    body: {
      startupName: 'VerificationPlan',
      leanCanvas: { title: 'VC' }
    }
  };
  const mockResCreate = createMockRes();
  await createPlanController(mockReqCreate, mockResCreate);
  const createdTestPlan = mockResCreate.getJsonBody().data;

  // Success
  const mockReqFound = { params: { id: createdTestPlan.id } };
  const mockResFound = createMockRes();
  await getPlanByIdController(mockReqFound, mockResFound);
  assert.strictEqual(mockResFound.getStatusCode(), 200);
  assert.strictEqual(mockResFound.getJsonBody().data.id, createdTestPlan.id);

  // 404 Not Found
  const mockReqNotFound = { params: { id: '00000000-0000-0000-0000-000000000000' } };
  const mockResNotFound = createMockRes();
  await getPlanByIdController(mockReqNotFound, mockResNotFound);
  assert.strictEqual(mockResNotFound.getStatusCode(), 404);
  assert.strictEqual(mockResNotFound.getJsonBody().error.code, 'PLAN_NOT_FOUND');
  console.log('✅ Passed Test G: GET /api/plans/:id returns 200 for existing and 404 for missing plan');

  // Test H: Complete persisted plan round-trip (Frontend payload -> API -> DB -> GET)
  console.log('\nTest H: Complete persisted plan round-trip...');
  const roundTripStorage = new LocalStorageMock();
  let roundTripPersistedId = null;

  await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: roundTripStorage,
    mockGenerationFetch: async (key) => ({ data: mockFullAiResponses[key] }),
    mockPersistencePost: async (url, payload) => {
      const mockReq = { body: payload };
      const mockRes = createMockRes();
      await createPlanController(mockReq, mockRes);
      roundTripPersistedId = mockRes.getJsonBody().data.id;
      return { data: mockRes.getJsonBody() };
    }
  });

  assert(roundTripPersistedId, 'Plan must be created via controller');
  const fetchedPlan = getPlanById(roundTripPersistedId);
  assert.strictEqual(fetchedPlan.id, roundTripPersistedId);
  assert.strictEqual(fetchedPlan.startupName, validFormData.name);
  assert.strictEqual(fetchedPlan.industry, validFormData.domain);
  assert.deepStrictEqual(fetchedPlan.leanCanvas, mockFullAiResponses.leanCanvas);
  assert.deepStrictEqual(fetchedPlan.mvp, mockFullAiResponses.mvp);
  assert.strictEqual(fetchedPlan.revenue.length, 2);
  assert.deepStrictEqual(fetchedPlan.pitch, mockFullAiResponses.pitch);
  assert.deepStrictEqual(fetchedPlan.personas, mockFullAiResponses.personas);
  assert.deepStrictEqual(fetchedPlan.competitors, mockFullAiResponses.competitors);
  assert.strictEqual(fetchedPlan.generationStatus, 'completed');
  console.log('✅ Passed Test H: Full round-trip preserves all 6 module data trees identically');

  // Test I: Duplicate submit protection
  console.log('\nTest I: Duplicate submit protection...');
  const storageI = new LocalStorageMock();
  const dupResult = await simulateIdeaInputSubmit({
    formData: validFormData,
    storage: storageI,
    mockGenerationFetch: async () => ({ data: {} }),
    mockPersistencePost: async () => ({ data: {} }),
    initialIsLoading: true // Form was already in loading state
  });
  assert.strictEqual(dupResult.status, 'BLOCKED_DUPLICATE_SUBMIT');
  assert.strictEqual(dupResult.navigated, false);
  console.log('✅ Passed Test I: Duplicate submission blocked cleanly while loading');

  testDb.close();

  console.log('\n====================================================');
  console.log('🎉 ALL FRONTEND PERSISTENCE INTEGRATION TESTS PASSED CLEANLY!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ Frontend persistence integration test failed:');
  console.error(err);
  process.exit(1);
});
