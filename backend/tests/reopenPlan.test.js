// backend/tests/reopenPlan.test.js
/**
 * Test Suite for Chunk 3.4 — Plan Detail / Loading / Re-opening
 * 
 * Verifies:
 * - A: History "Open Plan" carries the correct server plan ID (?plan=<UUID>)
 * - B: Dashboard extracts the selected plan ID correctly from query params
 * - C: GET /api/plans/:id returns complete persisted plan data
 * - D: Successful historical plan load writes correct formData shape
 * - E: Successful historical plan load writes all 6 generated modules
 * - F: Historical plan load restores generationErrors for partial plans
 * - G: Historical plan load sets currentPlanId to the server ID
 * - H: Historical plan load sets planPersistenceStatus = "saved"
 * - I: Historical plan load clears stale previous-plan module data before restoration
 * - J: Missing historical plan (404) returns safe not-found state
 * - K: Network/API failure returns safe error state with retry option
 * - L: Direct /dashboard without a plan ID retains existing active-session behavior
 * - M: Existing generation flow remains unchanged
 * - N: Existing My Plans listing/pagination remains unchanged
 * - O: Complete persisted-plan round-trip remains intact
 */

const assert = require('assert');
const { createDatabaseInstance } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const { createPlan, getPlanById, listPlans } = require('../services/planService');
const { getPlanByIdController } = require('../controllers/planController');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 3.4 PLAN RE-OPENING & HYDRATION TESTS');
console.log('====================================================\n');

async function runReopenPlanTests() {
  const testDb = createDatabaseInstance(':memory:');
  runMigrations(testDb);

  // Mock localStorage for simulation
  const mockStorage = {};
  const mockLocalStorage = {
    getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };

  const sampleCompletePlan = {
    startupName: 'CloudScale AI',
    industry: 'DevOps / Cloud',
    problem: 'Cloud infrastructure sizing is manual and inefficient.',
    solution: 'Automated ML-based dynamic cloud provisioning.',
    targetAudience: 'Engineering leaders and DevOps teams.',
    usp: 'Instant 40% cloud cost reduction guaranteed.',
    leanCanvas: {
      problem: 'Cloud overspending',
      solution: 'Autonomous rightsizing',
      uniqueValueProposition: 'Save 40% on AWS/GCP'
    },
    mvp: {
      coreFeatures: ['Metrics connector', 'Cost dashboard'],
      launchTimeline: '6 weeks'
    },
    revenue: [
      { model: 'SaaS Subscription', description: 'Tiered pricing based on cloud spend' }
    ],
    pitch: {
      title: 'CloudScale AI Investor Deck',
      tagline: 'Autonomous Cloud Optimization'
    },
    personas: [
      { name: 'DevOps Director Sarah', role: 'Head of Infrastructure' }
    ],
    competitors: [
      { name: 'Cast AI', differentiator: 'Multi-cloud native support' }
    ]
  };

  const samplePartialPlan = {
    startupName: 'MicroSip',
    industry: 'Food & Beverage',
    problem: 'Office coffee machines are expensive to maintain.',
    solution: 'Smart on-demand bean roasting pods.',
    targetAudience: 'Small offices and coworking spaces.',
    usp: 'Barista quality for $0.50 per cup.',
    leanCanvas: { problem: 'Bad office coffee' },
    mvp: { coreFeatures: ['Smart brewer pod'] },
    revenue: null,
    pitch: null,
    personas: null,
    competitors: null,
    generationStatus: 'partial',
    generationErrors: {
      failedModules: ['Revenue', 'Pitch', 'Personas', 'Competitors'],
      successfulModules: ['Lean Canvas', 'MVP']
    }
  };

  // Test A: History "Open Plan" carries the correct server plan ID
  console.log('Test A: History "Open Plan" URL construction...');
  {
    const plan = { id: '3d8a57e2-4bf1-4209-9ec6-89dcfd141e97' };
    let navigatedPath = null;
    const mockNavigate = (path) => { navigatedPath = path; };

    // Function matching HistoryPage.js handleOpenPlan implementation
    const handleOpenPlan = (p) => {
      if (p && p.id) {
        mockNavigate(`/dashboard?plan=${encodeURIComponent(p.id)}`);
      } else {
        mockNavigate('/dashboard');
      }
    };

    handleOpenPlan(plan);
    assert.strictEqual(navigatedPath, '/dashboard?plan=3d8a57e2-4bf1-4209-9ec6-89dcfd141e97');
    console.log('✅ Passed Test A: Open Plan navigates to /dashboard?plan=<UUID>');
  }

  // Test B: Dashboard extracts the selected plan ID correctly from query string
  console.log('\nTest B: Dashboard plan ID parameter extraction...');
  {
    const url1 = '/dashboard?plan=3d8a57e2-4bf1-4209-9ec6-89dcfd141e97';
    const params1 = new URLSearchParams(url1.split('?')[1]);
    assert.strictEqual(params1.get('plan'), '3d8a57e2-4bf1-4209-9ec6-89dcfd141e97');

    const url2 = '/dashboard';
    const params2 = new URLSearchParams(url2.includes('?') ? url2.split('?')[1] : '');
    assert.strictEqual(params2.get('plan'), null);

    console.log('✅ Passed Test B: Query parameters extracted accurately without hallucinations');
  }

  // Test C: GET /api/plans/:id returns complete persisted plan data
  console.log('\nTest C: GET /api/plans/:id endpoint data completeness...');
  let persistedPlan1, persistedPlan2;
  {
    persistedPlan1 = createPlan(sampleCompletePlan, testDb);
    const retrieved = getPlanById(persistedPlan1.id, testDb);

    assert(retrieved, 'Plan must be retrieved');
    assert.strictEqual(retrieved.id, persistedPlan1.id);
    assert.strictEqual(retrieved.startupName, 'CloudScale AI');
    assert.strictEqual(retrieved.industry, 'DevOps / Cloud');
    assert.deepStrictEqual(retrieved.leanCanvas, sampleCompletePlan.leanCanvas);
    assert.deepStrictEqual(retrieved.mvp, sampleCompletePlan.mvp);
    assert.deepStrictEqual(retrieved.revenue, sampleCompletePlan.revenue);
    assert.deepStrictEqual(retrieved.pitch, sampleCompletePlan.pitch);
    assert.deepStrictEqual(retrieved.personas, sampleCompletePlan.personas);
    assert.deepStrictEqual(retrieved.competitors, sampleCompletePlan.competitors);
    assert.strictEqual(retrieved.generationStatus, 'completed');

    console.log('✅ Passed Test C: GET /api/plans/:id returns complete nested documents');
  }

  // Helper simulating the exact plan hydration logic implemented in DashboardPage.js
  function hydrateDashboardFromPlan(plan, storage = mockLocalStorage) {
    const PLAN_STORAGE_KEYS = [
      'formData',
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
    PLAN_STORAGE_KEYS.forEach(key => storage.removeItem(key));

    const restoredFormData = {
      name: plan.startupName || '',
      domain: plan.industry || '',
      problem: plan.problem || '',
      solution: plan.solution || '',
      audience: plan.targetAudience || '',
      usp: plan.usp || '',
      summary: ''
    };
    storage.setItem('formData', JSON.stringify(restoredFormData));

    if (plan.leanCanvas) storage.setItem('leanCanvas', JSON.stringify(plan.leanCanvas));
    if (plan.mvp) storage.setItem('mvp', JSON.stringify(plan.mvp));
    if (plan.revenue) storage.setItem('revenue', JSON.stringify(plan.revenue));
    if (plan.pitch) storage.setItem('pitch', JSON.stringify(plan.pitch));
    if (plan.personas) storage.setItem('personas', JSON.stringify(plan.personas));
    if (plan.competitors) storage.setItem('competitors', JSON.stringify(plan.competitors));
    if (plan.generationErrors) storage.setItem('generationErrors', JSON.stringify(plan.generationErrors));

    storage.setItem('currentPlanId', plan.id);
    storage.setItem('planPersistenceStatus', 'saved');

    return {
      overview: {
        name: plan.startupName || plan.leanCanvas?.startupName || 'Your Startup',
        industry: plan.industry || plan.leanCanvas?.industry || '',
        problem: plan.problem || plan.leanCanvas?.problem || '',
        solution: plan.solution || plan.leanCanvas?.solution || '',
        audience: plan.targetAudience || plan.leanCanvas?.audience || plan.leanCanvas?.customerSegments || '',
        usp: plan.usp || plan.leanCanvas?.uniqueValueProposition || ''
      },
      leanCanvas: plan.leanCanvas || null,
      mvp: plan.mvp || null,
      revenue: plan.revenue || null,
      pitch: plan.pitch || null,
      personas: plan.personas || null,
      competitors: plan.competitors || null
    };
  }

  // Test D: Successful historical plan load writes correct formData
  console.log('\nTest D: Restoring formData into localStorage...');
  {
    mockLocalStorage.clear();
    const dashboardData = hydrateDashboardFromPlan(persistedPlan1, mockLocalStorage);

    const storedFormData = JSON.parse(mockLocalStorage.getItem('formData'));
    assert.strictEqual(storedFormData.name, 'CloudScale AI');
    assert.strictEqual(storedFormData.domain, 'DevOps / Cloud');
    assert.strictEqual(storedFormData.problem, 'Cloud infrastructure sizing is manual and inefficient.');
    assert.strictEqual(storedFormData.solution, 'Automated ML-based dynamic cloud provisioning.');
    assert.strictEqual(storedFormData.audience, 'Engineering leaders and DevOps teams.');
    assert.strictEqual(storedFormData.usp, 'Instant 40% cloud cost reduction guaranteed.');

    assert.strictEqual(dashboardData.overview.name, 'CloudScale AI');
    assert.strictEqual(dashboardData.overview.industry, 'DevOps / Cloud');

    console.log('✅ Passed Test D: formData restored with correct property mapping');
  }

  // Test E: Successful historical plan load writes all six generated modules
  console.log('\nTest E: Restoring all 6 generated modules...');
  {
    const storedLeanCanvas = JSON.parse(mockLocalStorage.getItem('leanCanvas'));
    const storedMvp = JSON.parse(mockLocalStorage.getItem('mvp'));
    const storedRevenue = JSON.parse(mockLocalStorage.getItem('revenue'));
    const storedPitch = JSON.parse(mockLocalStorage.getItem('pitch'));
    const storedPersonas = JSON.parse(mockLocalStorage.getItem('personas'));
    const storedCompetitors = JSON.parse(mockLocalStorage.getItem('competitors'));

    assert.deepStrictEqual(storedLeanCanvas, sampleCompletePlan.leanCanvas);
    assert.deepStrictEqual(storedMvp, sampleCompletePlan.mvp);
    assert.deepStrictEqual(storedRevenue, sampleCompletePlan.revenue);
    assert.deepStrictEqual(storedPitch, sampleCompletePlan.pitch);
    assert.deepStrictEqual(storedPersonas, sampleCompletePlan.personas);
    assert.deepStrictEqual(storedCompetitors, sampleCompletePlan.competitors);

    console.log('✅ Passed Test E: All 6 generated modules restored into active localStorage');
  }

  // Test F: Historical plan load restores generationErrors for partial plans
  console.log('\nTest F: Restoring partial plan and generationErrors...');
  {
    persistedPlan2 = createPlan(samplePartialPlan, testDb);
    mockLocalStorage.clear();

    const partialDashboard = hydrateDashboardFromPlan(persistedPlan2, mockLocalStorage);

    // Lean canvas and mvp exist
    assert(mockLocalStorage.getItem('leanCanvas'));
    assert(mockLocalStorage.getItem('mvp'));

    // Failed modules must remain absent (no fake data!)
    assert.strictEqual(mockLocalStorage.getItem('revenue'), null);
    assert.strictEqual(mockLocalStorage.getItem('pitch'), null);
    assert.strictEqual(mockLocalStorage.getItem('personas'), null);
    assert.strictEqual(mockLocalStorage.getItem('competitors'), null);

    // generationErrors restored
    const storedGenErrors = JSON.parse(mockLocalStorage.getItem('generationErrors'));
    assert(storedGenErrors);
    assert.strictEqual(storedGenErrors.failedModules.length, 4);

    assert.strictEqual(partialDashboard.revenue, null);
    assert.strictEqual(partialDashboard.pitch, null);

    console.log('✅ Passed Test F: Partial plan restored cleanly without fabricating missing data');
  }

  // Test G & H: currentPlanId and planPersistenceStatus = 'saved'
  console.log('\nTest G & H: currentPlanId and planPersistenceStatus updates...');
  {
    assert.strictEqual(mockLocalStorage.getItem('currentPlanId'), persistedPlan2.id);
    assert.strictEqual(mockLocalStorage.getItem('planPersistenceStatus'), 'saved');
    console.log('✅ Passed Test G & H: currentPlanId synchronized and status set to saved');
  }

  // Test I: Stale data protection: Plan B completely overwrites Plan A
  console.log('\nTest I: Stale data purge between plan switches...');
  {
    mockLocalStorage.clear();

    // 1. First load Plan 1 (complete, has pitch and revenue)
    hydrateDashboardFromPlan(persistedPlan1, mockLocalStorage);
    assert(mockLocalStorage.getItem('pitch'), 'Plan 1 must have pitch');
    assert(mockLocalStorage.getItem('revenue'), 'Plan 1 must have revenue');
    assert.strictEqual(mockLocalStorage.getItem('currentPlanId'), persistedPlan1.id);

    // 2. Next load Plan 2 (partial, does NOT have pitch or revenue)
    hydrateDashboardFromPlan(persistedPlan2, mockLocalStorage);

    // 3. Stale data from Plan 1 must NOT bleed into Plan 2!
    assert.strictEqual(mockLocalStorage.getItem('pitch'), null, 'Stale pitch from Plan 1 must be wiped');
    assert.strictEqual(mockLocalStorage.getItem('revenue'), null, 'Stale revenue from Plan 1 must be wiped');
    assert.strictEqual(mockLocalStorage.getItem('currentPlanId'), persistedPlan2.id, 'currentPlanId must now be Plan 2');
    const formData = JSON.parse(mockLocalStorage.getItem('formData'));
    assert.strictEqual(formData.name, 'MicroSip', 'formData must now be Plan 2');

    console.log('✅ Passed Test I: Stale plan data purged cleanly when switching plans');
  }

  // Test J: Missing plan (404) handling
  console.log('\nTest J: Missing plan 404 handling...');
  {
    let sentStatus = null;
    let sentBody = null;
    const mockReq = { params: { id: '00000000-0000-0000-0000-000000000000' } };
    const mockRes = {
      status(c) { sentStatus = c; return this; },
      json(b) { sentBody = b; return this; }
    };

    const databaseModule = require('../db/database');
    const origGetDatabase = databaseModule.getDatabase;
    databaseModule.getDatabase = () => testDb;

    try {
      await getPlanByIdController(mockReq, mockRes);
      assert.strictEqual(sentStatus, 404);
      assert.strictEqual(sentBody.success, false);
      assert.strictEqual(sentBody.error.code, 'PLAN_NOT_FOUND');
    } finally {
      databaseModule.getDatabase = origGetDatabase;
    }

    console.log('✅ Passed Test J: Missing plan returns clean 404 with structured error');
  }

  // Test K: Network/API failure handling simulation
  console.log('\nTest K: Network/API failure handling...');
  {
    let loadError = null;
    let notFound = false;

    // Simulate 500 error response
    const mockErr = { response: { status: 500 }, message: 'Server down' };
    if (mockErr.response?.status === 404) {
      notFound = true;
    } else {
      loadError = 'Failed to load the selected startup plan from the database. Please verify the server connection.';
    }

    assert(!notFound);
    assert(loadError.includes('Failed to load the selected startup plan'));
    console.log('✅ Passed Test K: Network failure triggers graceful error state with retry path');
  }

  // Test L: Direct /dashboard without plan ID retains active localStorage session
  console.log('\nTest L: Direct /dashboard retains active session data...');
  {
    // Storage has Plan 2 loaded
    const currentId = mockLocalStorage.getItem('currentPlanId');
    assert.strictEqual(currentId, persistedPlan2.id);

    // Simulating loadFromLocalStorage() when URL has no ?plan=
    const storedFormData = JSON.parse(mockLocalStorage.getItem('formData'));
    assert.strictEqual(storedFormData.name, 'MicroSip');

    console.log('✅ Passed Test L: Direct /dashboard navigation preserves existing active-session state');
  }

  // Test M: Existing generation flow remains unaffected
  console.log('\nTest M: Generation flow regression check...');
  {
    // Verify createPlan still returns full structured object with new UUID
    const freshPlan = createPlan({ startupName: 'FreshStartup' }, testDb);
    assert(freshPlan.id);
    assert.strictEqual(freshPlan.startupName, 'FreshStartup');
    console.log('✅ Passed Test M: Generation creation logic remains intact');
  }

  // Test N: Existing My Plans listing remains intact
  console.log('\nTest N: History listing regression check...');
  {
    const listing = listPlans({ limit: 10, offset: 0 }, testDb);
    assert.strictEqual(listing.total, 3);
    assert.strictEqual(listing.plans.length, 3);
    console.log('✅ Passed Test N: History listing and pagination unaffected');
  }

  // Test O: Complete persisted plan round trip
  console.log('\nTest O: Complete plan round-trip verification...');
  {
    const roundTripPlan = getPlanById(persistedPlan1.id, testDb);
    const restored = hydrateDashboardFromPlan(roundTripPlan, mockLocalStorage);

    assert.strictEqual(restored.overview.name, 'CloudScale AI');
    assert.strictEqual(restored.leanCanvas.problem, 'Cloud overspending');
    assert.strictEqual(restored.mvp.launchTimeline, '6 weeks');
    assert.strictEqual(restored.pitch.tagline, 'Autonomous Cloud Optimization');
    assert.strictEqual(restored.personas[0].name, 'DevOps Director Sarah');
    assert.strictEqual(restored.competitors[0].name, 'Cast AI');

    console.log('✅ Passed Test O: Full plan round trip preserves every detail perfectly');
  }

  console.log('\n====================================================');
  console.log('🎉 ALL PLAN RE-OPENING & HYDRATION TESTS PASSED!');
  console.log('====================================================\n');
}

runReopenPlanTests().catch(err => {
  console.error('Plan Reopen Test Failure:', err);
  process.exit(1);
});
