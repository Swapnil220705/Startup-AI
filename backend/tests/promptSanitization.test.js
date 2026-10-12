const assert = require('assert');
const path = require('path');
const { normalizeInput, buildStartupPromptContext } = require('../utils/promptUtils');

console.log('====================================================');
console.log('🧪 RUNNING PROMPT SANITIZATION & SUMMARY TESTS (CHUNK 7.1)');
console.log('====================================================\n');

// 1. normalizeInput tests
console.log('Test 1: normalizeInput helper handles all edge cases...');
assert.strictEqual(normalizeInput(undefined), null);
assert.strictEqual(normalizeInput(null), null);
assert.strictEqual(normalizeInput(''), null);
assert.strictEqual(normalizeInput('   '), null);
assert.strictEqual(normalizeInput('\n\t  '), null);
assert.strictEqual(normalizeInput('Acme Inc'), 'Acme Inc');
assert.strictEqual(normalizeInput('  Acme Inc   '), 'Acme Inc');
assert.strictEqual(normalizeInput(123), '123');
assert.strictEqual(normalizeInput('undefined'), null);
assert.strictEqual(normalizeInput('null'), null);
assert.strictEqual(normalizeInput('UNDEFINED'), null);
assert.strictEqual(normalizeInput('NULL'), null);
console.log('  ✅ normalizeInput correctly sanitizes undefined, null, whitespace, and literal strings');

// 2. buildStartupPromptContext tests
console.log('\nTest 2: buildStartupPromptContext normalizes inputs and prevents literal "undefined"...');
const dirtyInput = {
  startupName: '  CleanApp  ',
  industry: undefined,
  problem: null,
  solution: '   ',
  targetAudience: 'undefined',
  usp: 'null',
  summary: ''
};
const ctx = buildStartupPromptContext(dirtyInput);
assert.strictEqual(ctx.name, 'CleanApp');
assert.strictEqual(ctx.industry, 'Not provided');
assert.strictEqual(ctx.problem, 'Not provided');
assert.strictEqual(ctx.solution, 'Not provided');
assert.strictEqual(ctx.targetAudience, 'Not provided');
assert.strictEqual(ctx.usp, 'Not provided');
assert.strictEqual(ctx.summary, 'Not provided');

const promptText = ctx.formatForPrompt();
assert(!promptText.includes('undefined'), 'Prompt must never contain literal "undefined"');
assert(!promptText.includes('null'), 'Prompt must never contain literal "null"');
assert(promptText.includes('Startup Name: CleanApp'));
assert(promptText.includes('Industry: Not provided'));
assert(promptText.includes('Idea Summary: Not provided'));
console.log('  ✅ buildStartupPromptContext reliably outputs clean context without "undefined" or "null"');

// 3. Optional summary inclusion when populated
console.log('\nTest 3: Populated summary is included in prompt context...');
const populatedInput = {
  startupName: 'LogiFlow',
  industry: 'Supply Chain',
  problem: 'Warehouse delays',
  solution: 'Predictive dispatch',
  targetAudience: 'Fleet managers',
  usp: '10x faster routing',
  summary: 'A cloud-based AI dispatch manager for mid-market regional freight carriers.'
};
const populatedCtx = buildStartupPromptContext(populatedInput);
assert.strictEqual(populatedCtx.summary, 'A cloud-based AI dispatch manager for mid-market regional freight carriers.');
const populatedPromptText = populatedCtx.formatForPrompt();
assert(populatedPromptText.includes('Idea Summary: A cloud-based AI dispatch manager for mid-market regional freight carriers.'));
console.log('  ✅ Populated summary is cleanly included in prompt context');

// 4. Test all 6 model files construct prompts with problem and summary correctly
console.log('\nTest 4: Verifying all 6 model prompt builders embed problem and summary...');

const axiosPath = require.resolve('axios');
let capturedPrompt = null;

require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: {
    post: async (url, body) => {
      capturedPrompt = body?.contents?.[0]?.parts?.[0]?.text;
      return {
        data: {
          candidates: [{
            content: {
              parts: [{
                text: JSON.stringify({
                  // Satisfy all validators defensively
                  startupName: 'TestStartup',
                  problem: 'P',
                  solution: 'S',
                  uniqueValueProposition: 'U',
                  customerSegments: ['C'],
                  keyMetrics: ['K'],
                  channels: ['CH'],
                  costStructure: ['CS'],
                  revenueStreams: ['RS'],
                  unfairAdvantage: 'UA',
                  technicalRequirements: 'TR',
                  launchTimeline: '6w',
                  coreFeatures: ['F1'],
                  pricingStrategy: 'PS',
                  expectedMonthlyRevenue: 'MRR',
                  growthOpportunities: ['GO'],
                  elevatorPitch: 'AutoPitch AI turns early ideas into investor plans in 60s.',
                  personas: [{ name: 'N', age: '30', occupation: 'O', goals: 'G', painPoints: 'PP', techComfortLevel: 'H' }],
                  competitors: [{ name: 'CN', description: 'CD', differentiator: 'DIFF' }]
                })
              }]
            }
          }]
        }
      };
    }
  }
};

async function testPromptInclusion(modelFile, fnName, inputPayload) {
  const modelPath = path.join(__dirname, '../models', modelFile);
  delete require.cache[require.resolve(modelPath)];
  const modelFn = require(modelPath)[fnName];
  capturedPrompt = null;
  await modelFn(inputPayload);
  return capturedPrompt;
}

(async () => {
  // Test A: personasModel prompt MUST include Problem statement (Bug 2 fixed)
  const personaPrompt = await testPromptInclusion('personasModel.js', 'generatePersonas', populatedInput);
  assert(
    personaPrompt.includes('Warehouse delays'),
    'personasModel prompt must include the user problem statement'
  );
  assert(
    personaPrompt.includes('Problem Statement: Warehouse delays') || personaPrompt.includes('Problem: Warehouse delays'),
    'personasModel prompt must explicitly label the problem context'
  );
  assert(
    personaPrompt.includes('A cloud-based AI dispatch manager'),
    'personasModel prompt must include user summary when provided'
  );
  console.log('  ✅ [personasModel] prompt contains problem statement and idea summary');

  // Test B: leanCanvas prompt contains summary
  const canvasPrompt = await testPromptInclusion('leanCanvas.js', 'generateLeanCanvas', populatedInput);
  assert(canvasPrompt.includes('A cloud-based AI dispatch manager'), 'leanCanvas prompt must include summary');
  console.log('  ✅ [leanCanvas] prompt includes summary');

  // Test C: mvpGenerator prompt contains summary
  const mvpPrompt = await testPromptInclusion('mvpGenerator.js', 'generateMVP', populatedInput);
  assert(mvpPrompt.includes('A cloud-based AI dispatch manager'), 'mvpGenerator prompt must include summary');
  console.log('  ✅ [mvpGenerator] prompt includes summary');

  // Test D: revenueModel prompt contains summary
  const revenuePrompt = await testPromptInclusion('revenueModel.js', 'generateRevenue', populatedInput);
  assert(revenuePrompt.includes('A cloud-based AI dispatch manager'), 'revenueModel prompt must include summary');
  console.log('  ✅ [revenueModel] prompt includes summary');

  // Test E: competitorsModel prompt contains summary
  const competitorPrompt = await testPromptInclusion('competitorsModel.js', 'generateCompetitors', populatedInput);
  assert(competitorPrompt.includes('A cloud-based AI dispatch manager'), 'competitorsModel prompt must include summary');
  console.log('  ✅ [competitorsModel] prompt includes summary');

  // Test F: pitchModel prompt contains summary
  const pitchPrompt = await testPromptInclusion('pitchModel.js', 'generatePitch', populatedInput);
  assert(pitchPrompt.includes('A cloud-based AI dispatch manager'), 'pitchModel prompt must include summary');
  console.log('  ✅ [pitchModel] prompt includes summary');

  // Test G: missing summary does not cause undefined or null in any prompt
  const missingSummaryInput = {
    startupName: 'SafeCo',
    industry: 'Cybersecurity',
    problem: 'Phishing',
    solution: 'Email scanner',
    targetAudience: 'Enterprises',
    usp: 'Zero false positives'
    // summary is omitted
  };
  const models = [
    { file: 'leanCanvas.js', fn: 'generateLeanCanvas' },
    { file: 'mvpGenerator.js', fn: 'generateMVP' },
    { file: 'revenueModel.js', fn: 'generateRevenue' },
    { file: 'pitchModel.js', fn: 'generatePitch' },
    { file: 'personasModel.js', fn: 'generatePersonas' },
    { file: 'competitorsModel.js', fn: 'generateCompetitors' }
  ];

  for (const m of models) {
    const prompt = await testPromptInclusion(m.file, m.fn, missingSummaryInput);
    assert(!prompt.includes('undefined'), `${m.file} must not contain "undefined" when summary is omitted`);
    assert(!prompt.includes('null'), `${m.file} must not contain "null" when summary is omitted`);
    assert(prompt.includes('Idea Summary: Not provided'), `${m.file} must explicitly note summary was not provided`);
  }
  console.log('  ✅ All 6 models safely handle omitted summary without injecting undefined or null');

  console.log('\n====================================================');
  console.log('🎉 ALL PROMPT SANITIZATION & SUMMARY TESTS PASSED!');
  console.log('====================================================');
})().catch(err => {
  console.error('❌ Prompt sanitization test failed:', err);
  process.exit(1);
});
