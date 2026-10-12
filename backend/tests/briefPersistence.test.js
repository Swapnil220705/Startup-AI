// backend/tests/briefPersistence.test.js
const assert = require('assert');
const { createDatabaseInstance } = require('../db/database');
const { runMigrations } = require('../db/migrate');
const {
  createPlan,
  getPlanById,
  updatePlan,
  listPlans,
  claimPlan
} = require('../services/planService');
const { toPublicSharedPlan } = require('../services/planShareService');

console.log('====================================================');
console.log('🧪 RUNNING STARTUP BRIEF PERSISTENCE & LIFECYCLE TESTS (CHUNK 7.2)');
console.log('====================================================\n');

async function runPersistenceTests() {
  const db = createDatabaseInstance(':memory:');
  runMigrations(db);

  // 1. Verify Migration 006 added brief column
  console.log('Test 1: Verify Migration 006 applied brief column to plans table...');
  const tableInfo = db.prepare('PRAGMA table_info(plans)').all();
  const briefColumn = tableInfo.find(c => c.name === 'brief');
  assert(briefColumn, 'Migration 006 must add "brief" column to plans table');
  console.log('  ✅ Column "brief" present in plans schema');

  // Insert test users to satisfy foreign key constraints
  db.prepare(`
    INSERT INTO users (id, email, auth_provider, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run('user_123', 'founder@test.com', 'email');

  db.prepare(`
    INSERT INTO users (id, email, auth_provider, created_at, updated_at)
    VALUES (?, ?, ?, datetime('now'), datetime('now'))
  `).run('user_456', 'other@test.com', 'email');

  // Sample valid brief
  const sampleBrief = {
    schemaVersion: 1,
    status: 'confirmed',
    rawInput: {
      startupName: 'AutoPitch AI',
      industry: 'SaaS / Generative AI',
      problem: 'Founders spend weeks creating pitch decks and business plans.',
      solution: 'Instant AI business plan generation.',
      targetAudience: 'Early-stage tech founders',
      usp: 'Complete plans in 60s'
    },
    facts: {
      startupName: 'AutoPitch AI',
      industry: 'SaaS / Generative AI',
      problem: 'Founders spend weeks creating pitch decks and business plans.',
      solution: 'Instant AI business plan generation.',
      targetAudience: 'Early-stage tech founders',
      usp: 'Complete plans in 60s'
    },
    aiInterpretations: {
      category: 'B2B SaaS / Venture Tech',
      businessModel: 'Freemium with Pro Tier',
      targetMarketDynamics: 'High founder velocity, compressed fundraising timelines',
      coreValueProposition: 'Instant 6-dimensional startup synthesis from a raw idea'
    },
    assumptions: [
      {
        id: 'asm_1',
        statement: 'Founders prefer structured, editable briefs over raw generation prompts',
        category: 'Product',
        confirmed: true,
        status: 'confirmed'
      }
    ],
    clarificationQuestions: [
      {
        id: 'cq_1',
        question: 'Are you focusing on pre-seed or seed stage founders first?',
        category: 'Market',
        answered: true,
        answer: 'Pre-seed founders',
        founderAnswer: 'Pre-seed founders'
      },
      {
        id: 'cq_2',
        question: 'What is your primary distribution channel?',
        category: 'Go-to-Market',
        answered: false,
        answer: '',
        founderAnswer: ''
      }
    ],
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      confirmedAt: new Date().toISOString()
    }
  };

  // 2. Persist plan with confirmed brief
  console.log('\nTest 2: Create plan with confirmed brief and round-trip verification...');
  const planPayload = {
    startupName: 'AutoPitch AI',
    industry: 'SaaS / Generative AI',
    problem: 'Founders spend weeks creating pitch decks.',
    solution: 'Instant AI business plan generation.',
    targetAudience: 'Early-stage tech founders',
    usp: 'Complete plans in 60s',
    brief: sampleBrief,
    leanCanvas: { startupName: 'AutoPitch AI' }
  };

  const createdPlan = createPlan(planPayload, { userId: 'user_123' }, db);
  assert(createdPlan.id, 'Plan must be created with UUID');
  assert(createdPlan.brief, 'Plan response must include brief object');
  assert.strictEqual(createdPlan.brief.status, 'confirmed');
  assert.strictEqual(createdPlan.brief.facts.startupName, 'AutoPitch AI');
  assert.strictEqual(createdPlan.brief.aiInterpretations.category, 'B2B SaaS / Venture Tech');

  // Verify fetch by ID
  const retrievedPlan = getPlanById(createdPlan.id, db);
  assert(retrievedPlan, 'Plan must be retrieved by ID');
  assert.strictEqual(retrievedPlan.brief.status, 'confirmed');
  assert.strictEqual(retrievedPlan.brief.rawInput.startupName, 'AutoPitch AI');
  assert.strictEqual(retrievedPlan.brief.assumptions[0].confirmed, true);
  console.log('  ✅ Plan persisted with brief and cleanly restored from database');

  // 3. Update brief via updatePlan
  console.log('\nTest 3: Update plan brief with edited founder facts and answers...');
  const updatedBrief = {
    ...sampleBrief,
    facts: {
      ...sampleBrief.facts,
      usp: 'Complete investor-grade decks in 30 seconds flat'
    }
  };
  const updatedPlan = updatePlan(createdPlan.id, { brief: updatedBrief }, db);
  assert.strictEqual(updatedPlan.brief.facts.usp, 'Complete investor-grade decks in 30 seconds flat');
  console.log('  ✅ Plan brief updated successfully in database');

  // 4. Backward Compatibility: Legacy plan without brief
  console.log('\nTest 4: Backward compatibility with legacy plans (brief = NULL)...');
  const legacyInsert = db.prepare(`
    INSERT INTO plans (id, user_id, startup_name, industry, problem, solution, target_audience, usp, brief, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, datetime('now'), datetime('now'))
  `);
  legacyInsert.run('legacy_plan_999', 'user_123', 'Legacy Startup', 'Retail', 'Old problem', 'Old solution', 'Audience', 'USP');

  const legacyPlan = getPlanById('legacy_plan_999', db);
  assert.strictEqual(legacyPlan.id, 'legacy_plan_999');
  assert.strictEqual(legacyPlan.brief, null, 'Legacy plan brief must be null without fabricated data');
  assert.strictEqual(legacyPlan.startupName, 'Legacy Startup');
  console.log('  ✅ Legacy plans without brief render and load safely as null');

  // 5. Claiming Anonymous Trial Plan preserves brief
  console.log('\nTest 5: Claiming anonymous trial plan preserves brief across ownership transition...');
  const trialBrief = {
    ...sampleBrief,
    rawInput: { startupName: 'TrialBot' },
    facts: { startupName: 'TrialBot' }
  };
  const { createTrialPlan } = require('../services/planService');
  const { plan: trialPlan, trialToken } = createTrialPlan({
    startupName: 'TrialBot',
    brief: trialBrief
  }, { ip: '127.0.0.1' }, db);

  assert.strictEqual(trialPlan.userId, null);
  assert(trialPlan.brief);

  // Claim into user_456
  const claimedPlan = claimPlan(trialPlan.id, 'user_456', trialToken, db);
  assert.strictEqual(claimedPlan.userId, 'user_456');
  assert(claimedPlan.brief, 'Claimed plan must preserve brief');
  assert.strictEqual(claimedPlan.brief.facts.startupName, 'TrialBot');
  console.log('  ✅ Anonymous trial plan claimed into authenticated account with brief intact');

  // 6. Public Share Sanitization
  console.log('\nTest 6: Public Share DTO Sanitization verifies private brief data is omitted...');
  const planRowWithBrief = db.prepare('SELECT * FROM plans WHERE id = ?').get(createdPlan.id);
  const publicShare = toPublicSharedPlan(planRowWithBrief);

  assert(publicShare.brief, 'Public shared plan should expose sanitized brief summary');
  assert.strictEqual(publicShare.brief.category, 'B2B SaaS / Venture Tech');
  assert.strictEqual(publicShare.brief.businessModel, 'Freemium with Pro Tier');
  assert(Array.isArray(publicShare.brief.assumptions));
  // CRITICAL PRIVACY CHECKS:
  assert.strictEqual(publicShare.brief.rawInput, undefined, 'Private rawInput MUST NOT be exposed in public share');
  assert.strictEqual(publicShare.brief.clarificationQuestions, undefined, 'Unanswered questions / founder notes MUST NOT be exposed in public share');
  console.log('  ✅ Public share DTO exposes sanitized dimensions while strictly omitting private rawInput and questions');

  // 7. Plan list retrieval includes brief
  console.log('\nTest 7: Plan listing includes brief...');
  const userPlansRes = listPlans({ userId: 'user_123' }, db);
  const userPlans = userPlansRes.plans;
  assert(userPlans.length >= 2);
  const planWithBriefInList = userPlans.find(p => p.id === createdPlan.id);
  assert(planWithBriefInList.brief, 'Plan in listing should contain brief');
  console.log('  ✅ listPlans returns brief object');

  console.log('\n====================================================');
  console.log('🎉 ALL STARTUP BRIEF PERSISTENCE TESTS PASSED');
  console.log('====================================================');
}

runPersistenceTests().catch(err => {
  console.error('Persistence Test Error:', err);
  process.exit(1);
});
