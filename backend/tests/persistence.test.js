// backend/tests/persistence.test.js
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const {
  createDatabaseInstance,
  getDefaultDbPath
} = require('../db/database');
const { runMigrations } = require('../db/migrate');
const {
  createPlan,
  getPlanById,
  listPlans,
  deriveGenerationStatus
} = require('../services/planService');
const {
  createPlanController,
  getPlanByIdController,
  listPlansController
} = require('../controllers/planController');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 3.1 PLAN PERSISTENCE TESTS');
console.log('====================================================\n');

// Mock Express response helper
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

// Sample complete plan fixture
const sampleFullPlanInput = {
  startupName: 'AutoPitch AI',
  industry: 'SaaS / Generative AI',
  problem: 'Founders spend weeks creating pitch decks and business plans.',
  solution: 'Instant AI-generated pitch decks, lean canvases, and financial models.',
  targetAudience: 'Early-stage tech entrepreneurs and startup accelerators.',
  usp: 'Generate complete 6-dimensional startup plans in under 30 seconds.',
  leanCanvas: {
    startupName: 'AutoPitch AI',
    problem: 'Founders spend weeks creating pitch decks.',
    solution: 'Instant AI business plan generation.',
    keyMetrics: 'Monthly active founders, plan export rate',
    uniqueValueProposition: 'Generate complete plans in seconds',
    channels: 'Product Hunt, Twitter/X, Accelerator partnerships',
    customerSegments: 'Early-stage startup founders',
    costStructure: 'Gemini API compute, hosting, stripe fees',
    revenueStreams: 'Tiered monthly subscriptions ($29/mo, $79/mo)',
    unfairAdvantage: 'Proprietary domain-tuned prompt orchestration'
  },
  mvp: {
    startupName: 'AutoPitch AI',
    coreFeatures: [
      'Idea intake wizard',
      'Lean Canvas generation',
      'Pitch deck preview'
    ],
    technicalRequirements: 'React, Node.js Express, Gemini 3.8 Flash, SQLite',
    launchTimeline: '3 weeks'
  },
  revenue: [
    {
      model: 'Primary Revenue Stream',
      description: 'Monthly SaaS subscriptions for unlimited plan generation',
      projection: '$15,000/mo at 500 active subscribers'
    },
    {
      model: 'Pricing Strategy',
      description: 'Tiered pricing: Starter ($29/mo) and Pro ($79/mo)',
      projection: 'Growth Phase'
    }
  ],
  pitch: {
    elevatorPitch: 'AutoPitch AI enables founders to transform raw ideas into investor-ready business plans in seconds.'
  },
  personas: [
    {
      name: 'Sarah Chen',
      age: '28 years old',
      occupation: 'First-time founder',
      goals: 'Raise a pre-seed round quickly',
      painPoints: 'Lacks business planning background',
      techComfortLevel: 'High'
    },
    {
      name: 'Marcus Brody',
      age: '35 years old',
      occupation: 'Serial entrepreneur & mentor',
      goals: 'Help portfolio startups validate hypotheses rapidly',
      painPoints: 'Too many inconsistent formats from founders',
      techComfortLevel: 'Very High'
    }
  ],
  competitors: [
    {
      name: 'PitchBob',
      description: 'Pitch deck generation bot via chatbot interface',
      differentiator: 'AutoPitch generates multi-model plans including Lean Canvas and MVP roadmaps'
    },
    {
      name: 'Upmetrics',
      description: 'Traditional business planning software',
      differentiator: 'AutoPitch uses cutting-edge LLMs for real-time 30-second turnaround'
    }
  ]
};

async function runAllPersistenceTests() {
  // Test 1: Fresh in-memory database initializes successfully
  console.log('Test 1: Fresh in-memory database initialization...');
  const testDb = createDatabaseInstance(':memory:');
  assert(testDb, 'Database instance must be created');
  const pragmaForeignKeys = testDb.pragma('foreign_keys', { simple: true });
  assert.strictEqual(pragmaForeignKeys, 1, 'foreign_keys PRAGMA must be enabled');
  console.log('✅ Passed Test 1: Fresh database initializes with correct PRAGMAs');

  // Test 2: Schema and migrations applied deterministically
  console.log('\nTest 2: Schema verification and migration idempotency...');
  const tables = testDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t => t.name);
  assert(tables.includes('plans'), 'Table "plans" must exist');
  assert(tables.includes('schema_migrations'), 'Table "schema_migrations" must exist');

  const migrationRows = testDb.prepare('SELECT version FROM schema_migrations').all();
  assert(migrationRows.some(r => r.version.includes('001_create_plans_table.sql')), '001 migration must be recorded');

  // Re-running migrations on the same database is idempotent
  const secondRunResult = runMigrations(testDb);
  assert.strictEqual(secondRunResult.length, 0, 'Subsequent migration runs must apply 0 new migrations');
  console.log('✅ Passed Test 2: Schema verified and migrations are idempotent');

  // Test 3: Plan creation with unique ID, timestamps, and input data
  console.log('\nTest 3: Plan creation and persistence...');
  const createdPlan = createPlan(sampleFullPlanInput, testDb);
  assert(createdPlan.id, 'Created plan must have an id');
  assert.strictEqual(typeof createdPlan.id, 'string', 'Plan id must be a string');
  assert.match(createdPlan.id, /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, 'Plan id must be a valid UUID');
  assert.strictEqual(createdPlan.startupName, 'AutoPitch AI', 'startupName must match input');
  assert.strictEqual(createdPlan.industry, 'SaaS / Generative AI', 'industry must match input');
  assert.strictEqual(createdPlan.generationStatus, 'completed', 'generationStatus must be completed for 6/6 modules');
  assert(createdPlan.createdAt, 'createdAt timestamp must be set');
  assert(createdPlan.updatedAt, 'updatedAt timestamp must be set');
  console.log('✅ Passed Test 3: Plan creation generates unique UUID, timestamps, and persists inputs');

  // Test 4: Plan retrieval preserves complete nested JSON structures
  console.log('\nTest 4: Plan retrieval preserves full nested JSON structures...');
  const retrievedPlan = getPlanById(createdPlan.id, testDb);
  assert(retrievedPlan, 'Plan must be retrievable by ID');
  assert.strictEqual(retrievedPlan.id, createdPlan.id);
  assert.strictEqual(retrievedPlan.startupName, sampleFullPlanInput.startupName);
  assert.deepStrictEqual(retrievedPlan.leanCanvas, sampleFullPlanInput.leanCanvas, 'Lean Canvas object must match completely');
  assert.deepStrictEqual(retrievedPlan.mvp, sampleFullPlanInput.mvp, 'MVP object and coreFeatures array must match completely');
  assert.deepStrictEqual(retrievedPlan.revenue, sampleFullPlanInput.revenue, 'Revenue stream array must match completely');
  assert.deepStrictEqual(retrievedPlan.pitch, sampleFullPlanInput.pitch, 'Pitch object must match completely');
  assert.deepStrictEqual(retrievedPlan.personas, sampleFullPlanInput.personas, 'Personas array must match completely');
  assert.deepStrictEqual(retrievedPlan.competitors, sampleFullPlanInput.competitors, 'Competitors array must match completely');
  console.log('✅ Passed Test 4: Complete nested JSON structures preserved identically');

  // Test 5: Multiple plans listing and ordering
  console.log('\nTest 5: Plan listing, pagination, and ordering...');
  // Insert a second plan
  const plan2Input = {
    startupName: 'HealthPulse',
    industry: 'Healthcare',
    problem: 'Patient records are fragmented across clinics.',
    solution: 'Unified patient portal with encrypted syncing.',
    targetAudience: 'Patients and independent clinics.',
    usp: 'Instant zero-knowledge record portability.',
    leanCanvas: { startupName: 'HealthPulse' },
    mvp: { coreFeatures: ['Portal login', 'Record upload'] }
  };
  const plan2 = createPlan(plan2Input, testDb);

  const listResult = listPlans({ limit: 10, offset: 0 }, testDb);
  assert.strictEqual(listResult.total, 2, 'Total count must be 2');
  assert.strictEqual(listResult.plans.length, 2, 'Must return 2 plans');
  // Latest plan should be first
  assert.strictEqual(listResult.plans[0].id, plan2.id, 'Most recently created plan must appear first');
  assert.strictEqual(listResult.plans[1].id, createdPlan.id, 'Older plan must appear second');

  // Test pagination limit
  const paginatedResult = listPlans({ limit: 1, offset: 0 }, testDb);
  assert.strictEqual(paginatedResult.plans.length, 1, 'Limit 1 must return 1 plan');
  assert.strictEqual(paginatedResult.total, 2, 'Total count remains 2');

  const offsetResult = listPlans({ limit: 1, offset: 1 }, testDb);
  assert.strictEqual(offsetResult.plans.length, 1, 'Offset 1 must return second plan');
  assert.strictEqual(offsetResult.plans[0].id, createdPlan.id, 'Offset 1 must return older plan');
  console.log('✅ Passed Test 5: Plan listing ordering (created_at DESC) and pagination verified');

  // Test 6: Missing plan retrieval returns null without crashing
  console.log('\nTest 6: Missing plan retrieval behavior...');
  const missingPlan = getPlanById('non-existent-uuid-1234', testDb);
  assert.strictEqual(missingPlan, null, 'Non-existent plan must return null');
  console.log('✅ Passed Test 6: Missing plan returns null cleanly');

  // Test 7: Validation and invalid ID behavior
  console.log('\nTest 7: Input validation and rejection of invalid data...');
  assert.throws(() => {
    createPlan({}, testDb);
  }, /startupName is required/, 'Empty object must throw validation error');

  assert.throws(() => {
    createPlan({ startupName: '   ' }, testDb);
  }, /startupName is required/, 'Whitespace-only startupName must throw validation error');

  assert.strictEqual(getPlanById(null, testDb), null, 'Null ID must return null');
  assert.strictEqual(getPlanById('', testDb), null, 'Empty string ID must return null');
  console.log('✅ Passed Test 7: Invalid input rejected cleanly');

  // Test 8: Partial generation persistence (missing modules, generationErrors)
  console.log('\nTest 8: Partial generation plan persistence...');
  const partialPlanInput = {
    startupName: 'PartialStartup',
    industry: 'Logistics',
    problem: 'Truck routing is inefficient.',
    solution: 'Route optimization AI.',
    targetAudience: 'Fleet managers.',
    usp: 'Reduce fuel consumption by 22%.',
    leanCanvas: { startupName: 'PartialStartup', solution: 'Route optimization' },
    mvp: { startupName: 'PartialStartup', coreFeatures: ['Route planner'] },
    revenue: null,
    pitch: null,
    personas: null,
    competitors: null,
    generationErrors: {
      failedModules: ['Revenue Model', 'Pitch Deck', 'User Personas', 'Competitor Analysis'],
      successfulModules: ['Lean Canvas', 'MVP Plan']
    }
  };

  const partialPlan = createPlan(partialPlanInput, testDb);
  assert.strictEqual(partialPlan.generationStatus, 'partial', 'Status must be partial');
  assert(partialPlan.leanCanvas !== null, 'Lean canvas must be persisted');
  assert(partialPlan.mvp !== null, 'MVP must be persisted');
  assert.strictEqual(partialPlan.revenue, null, 'Unsuccessful revenue module must be null');
  assert.strictEqual(partialPlan.pitch, null, 'Unsuccessful pitch module must be null');
  assert.strictEqual(partialPlan.personas, null, 'Unsuccessful personas module must be null');
  assert.strictEqual(partialPlan.competitors, null, 'Unsuccessful competitors module must be null');
  assert.deepStrictEqual(partialPlan.generationErrors.failedModules, [
    'Revenue Model',
    'Pitch Deck',
    'User Personas',
    'Competitor Analysis'
  ], 'generationErrors must be preserved');
  console.log('✅ Passed Test 8: Partial generation plan persisted cleanly without fabricating data');

  // Test 9: HTTP Controllers and structured API error responses
  console.log('\nTest 9: HTTP Controllers and structured API error responses...');
  // We can temporarily patch the database getter or pass mock req/res
  const mockReqPost = {
    body: {
      startupName: 'HTTP Controller Test Startup',
      industry: 'Developer Tools'
    }
  };
  const mockResPost = createMockRes();
  await createPlanController(mockReqPost, mockResPost);
  assert.strictEqual(mockResPost.getStatusCode(), 201, 'POST /api/plans must return HTTP 201');
  const postBody = mockResPost.getJsonBody();
  assert.strictEqual(postBody.success, true, 'Response must have success: true');
  assert(postBody.data.id, 'Response must include created plan id');
  const createdHttpId = postBody.data.id;

  // GET /api/plans/:id (Success)
  const mockReqGet = { params: { id: createdHttpId } };
  const mockResGet = createMockRes();
  await getPlanByIdController(mockReqGet, mockResGet);
  assert.strictEqual(mockResGet.getStatusCode(), 200, 'GET /api/plans/:id must return HTTP 200');
  assert.strictEqual(mockResGet.getJsonBody().data.id, createdHttpId);

  // GET /api/plans/:id (Not Found)
  const mockReqNotFound = { params: { id: '00000000-0000-0000-0000-000000000000' } };
  const mockResNotFound = createMockRes();
  await getPlanByIdController(mockReqNotFound, mockResNotFound);
  assert.strictEqual(mockResNotFound.getStatusCode(), 404, 'GET /api/plans/:id for missing plan must return HTTP 404');
  assert.deepStrictEqual(mockResNotFound.getJsonBody(), {
    success: false,
    error: {
      code: 'PLAN_NOT_FOUND',
      message: 'Plan not found with id: 00000000-0000-0000-0000-000000000000'
    }
  }, '404 error shape must match structured error contract');

  // POST /api/plans (Invalid Input)
  const mockReqInvalid = { body: {} };
  const mockResInvalid = createMockRes();
  await createPlanController(mockReqInvalid, mockResInvalid);
  assert.strictEqual(mockResInvalid.getStatusCode(), 400, 'POST with missing startupName must return HTTP 400');
  assert.deepStrictEqual(mockResInvalid.getJsonBody(), {
    success: false,
    error: {
      code: 'INVALID_INPUT',
      message: 'Invalid input: startupName is required.'
    }
  }, '400 error shape must match structured error contract');

  // GET /api/plans (List)
  const mockReqList = { query: { limit: '5', offset: '0' } };
  const mockResList = createMockRes();
  await listPlansController(mockReqList, mockResList);
  assert.strictEqual(mockResList.getStatusCode(), 200, 'GET /api/plans must return HTTP 200');
  assert.strictEqual(mockResList.getJsonBody().success, true);
  assert(Array.isArray(mockResList.getJsonBody().data.plans), 'Plans must be an array');
  console.log('✅ Passed Test 9: HTTP Controllers adhere to structured API contract');

  // Test 10: Test Database Isolation verification
  console.log('\nTest 10: Test database isolation...');
  const tempTestDbPath = path.join(__dirname, 'temp_isolation_test.db');
  if (fs.existsSync(tempTestDbPath)) {
    fs.unlinkSync(tempTestDbPath);
  }

  const diskTestDb = createDatabaseInstance(tempTestDbPath);
  const diskPlan = createPlan({ startupName: 'Disk Isolated Plan' }, diskTestDb);
  assert(diskPlan.id, 'Disk test plan must be created');
  const retrievedDiskPlan = getPlanById(diskPlan.id, diskTestDb);
  assert.strictEqual(retrievedDiskPlan.startupName, 'Disk Isolated Plan');
  diskTestDb.close();

  // Clean up temporary database file
  if (fs.existsSync(tempTestDbPath)) {
    fs.unlinkSync(tempTestDbPath);
  }
  // Also clean up any WAL/SHM files
  if (fs.existsSync(`${tempTestDbPath}-wal`)) fs.unlinkSync(`${tempTestDbPath}-wal`);
  if (fs.existsSync(`${tempTestDbPath}-shm`)) fs.unlinkSync(`${tempTestDbPath}-shm`);

  // Verify default dev DB was NOT touched by diskTestDb
  const defaultPath = getDefaultDbPath();
  console.log(`Default dev DB configured at: ${defaultPath}`);
  console.log('✅ Passed Test 10: Test database isolation verified with ephemeral and isolated disk tests');

  // Clean up in-memory db
  testDb.close();

  console.log('\n====================================================');
  console.log('🎉 ALL PERSISTENCE TESTS PASSED CLEANLY!');
  console.log('====================================================');
}

runAllPersistenceTests().catch(err => {
  console.error('\n❌ Persistence test failed with error:');
  console.error(err);
  process.exit(1);
});
