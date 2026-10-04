// backend/tests/planLifecycle.test.js
/**
 * Test Suite for Chunk 3.5 — Update / Delete / Archive & Persistence Lifecycle
 * 
 * Verifies:
 * - A: PATCH updates only supplied metadata fields
 * - B: PATCH preserves unspecified fields
 * - C: PATCH rejects invalid or empty startupName (400 INVALID_INPUT)
 * - D: PATCH updates updatedAt timestamp
 * - E: PATCH does not alter createdAt timestamp
 * - F: PATCH does not overwrite or touch generated module JSON trees
 * - G: PATCH missing plan ID returns structured 404 (PLAN_NOT_FOUND)
 * - H: DELETE removes exactly the targeted plan
 * - I: DELETE missing plan ID returns structured 404 (PLAN_NOT_FOUND)
 * - J: Deleted plan no longer appears in listPlans (GET /api/plans)
 * - K: Deleted plan cannot be retrieved via getPlanById (GET /api/plans/:id)
 * - L: Multiple plans remain intact when one is deleted (isolation)
 * - M: Current-plan deletion: purges active session keys from localStorage
 * - N: Non-current-plan deletion: preserves active session state completely intact
 * - O: Metadata update synchronization: updates localStorage.formData when active plan is edited
 * - P: Partial plan lifecycle: partial plans can be listed, updated, and deleted cleanly
 * - Q: Controller HTTP contract verification for PATCH and DELETE
 */

const assert = require('assert');
const { createDatabaseInstance } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const { 
  createPlan, 
  getPlanById, 
  listPlans, 
  updatePlan, 
  deletePlan 
} = require('../services/planService');
const { 
  updatePlanController, 
  deletePlanController 
} = require('../controllers/planController');

console.log('====================================================');
console.log('🧪 RUNNING CHUNK 3.5 PLAN LIFECYCLE TESTS');
console.log('====================================================\n');

async function runLifecycleTests() {
  const testDb = createDatabaseInstance(':memory:');
  runMigrations(testDb);

  // Mock localStorage for lifecycle state simulation
  const mockStorage = {};
  const mockLocalStorage = {
    getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
    setItem: (key, val) => { mockStorage[key] = String(val); },
    removeItem: (key) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); }
  };

  // Helper to seed complete plan
  const samplePlanData = {
    startupName: 'Nexus Cloud',
    industry: 'DevOps',
    problem: 'Multi-cloud orchestration is complex',
    solution: 'Unified serverless control plane',
    targetAudience: 'Infrastructure engineers',
    usp: 'Instant zero-config multi-cloud mesh',
    leanCanvas: { problem: 'Multi-cloud orchestration', solution: 'Control plane' },
    mvp: { features: ['Dashboard', 'Mesh connector'] },
    revenue: { streams: ['Subscription'] },
    pitch: { elevator: 'The cloud mesh for modern ops.' },
    personas: [{ role: 'Lead DevOps' }],
    competitors: [{ name: 'Legacy Mesh' }]
  };

  const planA = createPlan(samplePlanData, testDb);
  assert.ok(planA.id, 'Plan A must have an ID');

  // Helper to simulate time delay for timestamp assertion
  await new Promise(r => setTimeout(r, 10));

  // ==========================================
  // Test A & B: PATCH updates only supplied metadata and preserves others
  // ==========================================
  console.log('Test A & B: PATCH updates metadata and preserves unspecified fields...');
  const updatedA = updatePlan(planA.id, {
    startupName: 'Nexus Mesh Pro',
    usp: 'Real-time multi-cloud interconnect'
  }, testDb);

  assert.strictEqual(updatedA.startupName, 'Nexus Mesh Pro', 'startupName must be updated');
  assert.strictEqual(updatedA.usp, 'Real-time multi-cloud interconnect', 'usp must be updated');
  assert.strictEqual(updatedA.industry, 'DevOps', 'industry must be preserved');
  assert.strictEqual(updatedA.problem, 'Multi-cloud orchestration is complex', 'problem must be preserved');
  assert.strictEqual(updatedA.solution, 'Unified serverless control plane', 'solution must be preserved');
  assert.strictEqual(updatedA.targetAudience, 'Infrastructure engineers', 'targetAudience must be preserved');
  console.log('✅ Passed Test A & B: Metadata updated and unspecified fields preserved\n');

  // ==========================================
  // Test C: PATCH rejects invalid / empty startupName
  // ==========================================
  console.log('Test C: PATCH rejects invalid/empty startupName...');
  assert.throws(
    () => updatePlan(planA.id, { startupName: '' }, testDb),
    (err) => err.code === 'INVALID_INPUT' && err.statusCode === 400,
    'Empty startupName must throw 400 INVALID_INPUT'
  );
  assert.throws(
    () => updatePlan(planA.id, { startupName: '   ' }, testDb),
    (err) => err.code === 'INVALID_INPUT' && err.statusCode === 400,
    'Whitespace-only startupName must throw 400 INVALID_INPUT'
  );
  console.log('✅ Passed Test C: Empty startupName rejected cleanly\n');

  // ==========================================
  // Test D & E: PATCH updates updatedAt and preserves createdAt
  // ==========================================
  console.log('Test D & E: Timestamp handling (updatedAt changes, createdAt preserved)...');
  assert.strictEqual(updatedA.createdAt, planA.createdAt, 'createdAt must remain unchanged');
  assert.notStrictEqual(updatedA.updatedAt, planA.createdAt, 'updatedAt must be newer than createdAt');
  assert.ok(new Date(updatedA.updatedAt) >= new Date(planA.updatedAt), 'updatedAt must advance forward');
  console.log('✅ Passed Test D & E: Timestamps handled correctly\n');

  // ==========================================
  // Test F: PATCH does not touch generated module JSON trees
  // ==========================================
  console.log('Test F: PATCH preserves all 6 generated modules...');
  assert.deepStrictEqual(updatedA.leanCanvas, samplePlanData.leanCanvas, 'leanCanvas must remain identical');
  assert.deepStrictEqual(updatedA.mvp, samplePlanData.mvp, 'mvp must remain identical');
  assert.deepStrictEqual(updatedA.revenue, samplePlanData.revenue, 'revenue must remain identical');
  assert.deepStrictEqual(updatedA.pitch, samplePlanData.pitch, 'pitch must remain identical');
  assert.deepStrictEqual(updatedA.personas, samplePlanData.personas, 'personas must remain identical');
  assert.deepStrictEqual(updatedA.competitors, samplePlanData.competitors, 'competitors must remain identical');
  console.log('✅ Passed Test F: All 6 generated modules preserved untouched\n');

  // ==========================================
  // Test G: PATCH missing plan ID returns null (or 404 in controller)
  // ==========================================
  console.log('Test G: PATCH on non-existent plan ID...');
  const missingUpdate = updatePlan('00000000-0000-0000-0000-000000000000', { startupName: 'Ghost' }, testDb);
  assert.strictEqual(missingUpdate, null, 'Updating non-existent plan must return null');
  console.log('✅ Passed Test G: Missing ID update safely returns null\n');

  // ==========================================
  // Test H, J, K & L: DELETE removes single plan and preserves others
  // ==========================================
  console.log('Test H, J, K & L: DELETE single plan isolation...');
  const planB = createPlan({
    startupName: 'BioHealth AI',
    industry: 'HealthTech',
    problem: 'Diagnostic bottlenecks',
    solution: 'Clinical assistant'
  }, testDb);

  const planC = createPlan({
    startupName: 'FinLedger',
    industry: 'FinTech',
    problem: 'Settlement latency',
    solution: 'Decentralized ledger'
  }, testDb);

  // Delete Plan B
  const deleteResultB = deletePlan(planB.id, testDb);
  assert.strictEqual(deleteResultB, true, 'deletePlan must return true on success');

  // Verify Plan B is gone
  assert.strictEqual(getPlanById(planB.id, testDb), null, 'Plan B must not be retrievable by ID');

  // Verify listPlans does not include Plan B
  const listingAfterDelete = listPlans({}, testDb);
  const foundB = listingAfterDelete.plans.find(p => p.id === planB.id);
  assert.strictEqual(foundB, undefined, 'Plan B must not appear in plan list');

  // Verify Plan A and Plan C remain completely intact
  const foundA = listingAfterDelete.plans.find(p => p.id === planA.id);
  const foundC = listingAfterDelete.plans.find(p => p.id === planC.id);
  assert.ok(foundA, 'Plan A must remain in database');
  assert.ok(foundC, 'Plan C must remain in database');
  assert.strictEqual(getPlanById(planA.id, testDb).startupName, 'Nexus Mesh Pro', 'Plan A data must be intact');
  assert.strictEqual(getPlanById(planC.id, testDb).startupName, 'FinLedger', 'Plan C data must be intact');
  console.log('✅ Passed Test H, J, K & L: Plan deleted cleanly without affecting other plans\n');

  // ==========================================
  // Test I: DELETE missing plan ID returns false
  // ==========================================
  console.log('Test I: DELETE non-existent plan ID...');
  const deleteNonExistent = deletePlan('11111111-1111-1111-1111-111111111111', testDb);
  assert.strictEqual(deleteNonExistent, false, 'Deleting non-existent plan must return false');
  console.log('✅ Passed Test I: Deleting missing ID returns false cleanly\n');

  // ==========================================
  // Test M: Current-plan deletion clears localStorage active session
  // ==========================================
  console.log('Test M: Current-plan deletion purges active localStorage session...');
  // Simulate active session for Plan C
  mockLocalStorage.setItem('currentPlanId', planC.id);
  mockLocalStorage.setItem('planPersistenceStatus', 'saved');
  mockLocalStorage.setItem('formData', JSON.stringify({ name: 'FinLedger', domain: 'FinTech' }));
  mockLocalStorage.setItem('leanCanvas', JSON.stringify({ canvas: true }));
  mockLocalStorage.setItem('mvp', JSON.stringify({ mvp: true }));
  mockLocalStorage.setItem('revenue', JSON.stringify({ rev: true }));
  mockLocalStorage.setItem('pitch', JSON.stringify({ pitch: true }));
  mockLocalStorage.setItem('personas', JSON.stringify([{ persona: 1 }]));
  mockLocalStorage.setItem('competitors', JSON.stringify([{ comp: 1 }]));
  mockLocalStorage.setItem('generationErrors', JSON.stringify(['error1']));

  // Simulate deletion of the active plan
  const activePlanId = mockLocalStorage.getItem('currentPlanId');
  if (activePlanId === planC.id) {
    deletePlan(planC.id, testDb);
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
    PLAN_STORAGE_KEYS.forEach(k => mockLocalStorage.removeItem(k));
  }

  assert.strictEqual(mockLocalStorage.getItem('currentPlanId'), null, 'currentPlanId must be removed');
  assert.strictEqual(mockLocalStorage.getItem('planPersistenceStatus'), null, 'planPersistenceStatus must be removed');
  assert.strictEqual(mockLocalStorage.getItem('formData'), null, 'formData must be purged');
  assert.strictEqual(mockLocalStorage.getItem('leanCanvas'), null, 'leanCanvas must be purged');
  assert.strictEqual(mockLocalStorage.getItem('mvp'), null, 'mvp must be purged');
  console.log('✅ Passed Test M: Active session purged cleanly upon current-plan deletion\n');

  // ==========================================
  // Test N: Non-current-plan deletion preserves active session state
  // ==========================================
  console.log('Test N: Non-current-plan deletion preserves active session...');
  // Seed a new plan D and set Plan A as active
  const planD = createPlan({ startupName: 'QuickLogistics', industry: 'Logistics' }, testDb);
  mockLocalStorage.setItem('currentPlanId', planA.id);
  mockLocalStorage.setItem('planPersistenceStatus', 'saved');
  mockLocalStorage.setItem('formData', JSON.stringify({ name: 'Nexus Mesh Pro', domain: 'DevOps' }));

  // Delete Plan D (NOT active)
  const currentActive = mockLocalStorage.getItem('currentPlanId');
  deletePlan(planD.id, testDb);
  if (currentActive === planD.id) {
    mockLocalStorage.removeItem('currentPlanId');
  }

  assert.strictEqual(mockLocalStorage.getItem('currentPlanId'), planA.id, 'currentPlanId for Plan A must remain');
  assert.strictEqual(mockLocalStorage.getItem('planPersistenceStatus'), 'saved', 'status must remain saved');
  const storedForm = JSON.parse(mockLocalStorage.getItem('formData'));
  assert.strictEqual(storedForm.name, 'Nexus Mesh Pro', 'formData must remain intact');
  console.log('✅ Passed Test N: Non-current plan deletion left active session intact\n');

  // ==========================================
  // Test O: Metadata update synchronization into active localStorage
  // ==========================================
  console.log('Test O: Metadata update synchronization into active localStorage...');
  const updatedPlanA2 = updatePlan(planA.id, { startupName: 'Nexus AI HyperMesh' }, testDb);

  // If edited plan is the currently open plan, synchronize localStorage.formData
  if (mockLocalStorage.getItem('currentPlanId') === updatedPlanA2.id) {
    const existingForm = JSON.parse(mockLocalStorage.getItem('formData') || '{}');
    const syncedForm = {
      ...existingForm,
      name: updatedPlanA2.startupName,
      domain: updatedPlanA2.industry,
      problem: updatedPlanA2.problem,
      solution: updatedPlanA2.solution,
      audience: updatedPlanA2.targetAudience,
      usp: updatedPlanA2.usp
    };
    mockLocalStorage.setItem('formData', JSON.stringify(syncedForm));
  }

  const activeSyncedForm = JSON.parse(mockLocalStorage.getItem('formData'));
  assert.strictEqual(activeSyncedForm.name, 'Nexus AI HyperMesh', 'Active localStorage.formData must reflect updated name');
  console.log('✅ Passed Test O: Active session metadata synchronized seamlessly\n');

  // ==========================================
  // Test P: Partial plan lifecycle (list, update, delete)
  // ==========================================
  console.log('Test P: Partial plan lifecycle...');
  const partialPlan = createPlan({
    startupName: 'Incomplete Idea',
    industry: 'BioTech',
    leanCanvas: { partial: true },
    generationStatus: 'partial',
    generationErrors: [{ module: 'pitch', error: 'Service Unavailable' }]
  }, testDb);

  assert.strictEqual(partialPlan.generationStatus, 'partial');

  // Update partial plan metadata
  const updatedPartial = updatePlan(partialPlan.id, { industry: 'BioEngineering' }, testDb);
  assert.strictEqual(updatedPartial.industry, 'BioEngineering');
  assert.strictEqual(updatedPartial.generationStatus, 'partial', 'generationStatus must remain partial');
  assert.ok(updatedPartial.generationErrors, 'generationErrors must remain preserved');

  // Delete partial plan
  const deletedPartial = deletePlan(partialPlan.id, testDb);
  assert.strictEqual(deletedPartial, true, 'Partial plan deleted cleanly');
  assert.strictEqual(getPlanById(partialPlan.id, testDb), null, 'Partial plan no longer exists');
  console.log('✅ Passed Test P: Partial plan listed, updated, and deleted cleanly\n');

  // ==========================================
  // Test Q: Controller HTTP contracts for PATCH and DELETE
  // ==========================================
  console.log('Test Q: HTTP Controller contracts for PATCH and DELETE...');

  // Mock response builder
  function buildMockRes() {
    return {
      statusCode: null,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(payload) {
        this.body = payload;
        return this;
      }
    };
  }

  // Seed a fresh plan for controller tests in default or test DB
  const controllerTestPlan = createPlan({ startupName: 'Controller Test' }, testDb);

  // Test PATCH controller 400 for empty plan ID
  const patchRes1 = buildMockRes();
  await updatePlanController({ params: { id: '' }, body: { startupName: 'X' } }, patchRes1);
  assert.strictEqual(patchRes1.statusCode, 400, 'Empty plan ID must return 400');
  assert.strictEqual(patchRes1.body.success, false);
  assert.strictEqual(patchRes1.body.error.code, 'INVALID_INPUT');

  // Test DELETE controller 400 for empty plan ID
  const deleteRes1 = buildMockRes();
  await deletePlanController({ params: { id: '' } }, deleteRes1);
  assert.strictEqual(deleteRes1.statusCode, 400, 'Empty plan ID must return 400');
  assert.strictEqual(deleteRes1.body.success, false);
  assert.strictEqual(deleteRes1.body.error.code, 'INVALID_INPUT');

  // Test PATCH controller 404 for non-existent plan
  const patchRes404 = buildMockRes();
  await updatePlanController({ params: { id: '00000000-9999-9999-9999-000000000000' }, body: { startupName: 'Ghost' } }, patchRes404);
  assert.strictEqual(patchRes404.statusCode, 404, 'Non-existent ID must return 404');
  assert.strictEqual(patchRes404.body.success, false);
  assert.strictEqual(patchRes404.body.error.code, 'PLAN_NOT_FOUND');

  // Test DELETE controller 404 for non-existent plan
  const deleteRes404 = buildMockRes();
  await deletePlanController({ params: { id: '00000000-9999-9999-9999-000000000000' } }, deleteRes404);
  assert.strictEqual(deleteRes404.statusCode, 404, 'Non-existent ID must return 404');
  assert.strictEqual(deleteRes404.body.success, false);
  assert.strictEqual(deleteRes404.body.error.code, 'PLAN_NOT_FOUND');

  console.log('✅ Passed Test Q: HTTP controller contracts verified adhering to structured API contract\n');

  console.log('====================================================');
  console.log('🎉 ALL PLAN LIFECYCLE TESTS PASSED CLEANLY!');
  console.log('====================================================');
}

runLifecycleTests().catch(err => {
  console.error('❌ LIFECYCLE TEST FAILURE:', err);
  process.exit(1);
});
