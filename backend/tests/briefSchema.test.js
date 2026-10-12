const assert = require('assert');
const {
  BriefValidationError,
  validateStartupBrief,
  normalizeStartupBriefInput
} = require('../utils/briefValidator');
const geminiClient = require('../services/geminiClient');
const { generateDraftBrief } = require('../models/briefModel');

console.log('====================================================');
console.log('🧪 RUNNING STARTUP BRIEF SCHEMA & MODEL TESTS (CHUNK 7.2)');
console.log('====================================================\n');

// 1. Normalization of input
console.log('Test 1: Input normalization & required check...');
const normalized = normalizeStartupBriefInput({
  name: '  NeuroFlow  ',
  domain: ' HealthTech ',
  problem: 'Doctors spend 3 hours per day on charts ',
  solution: ' Real-time AI ambient scribe',
  audience: ' Clinical physicians ',
  usp: ' HIPAA-compliant zero-latency audio transcription ',
  summary: ' Ambient medical scribe '
});

assert.strictEqual(normalized.name, 'NeuroFlow');
assert.strictEqual(normalized.domain, 'HealthTech');
assert.strictEqual(normalized.problem, 'Doctors spend 3 hours per day on charts');
assert.strictEqual(normalized.solution, 'Real-time AI ambient scribe');
assert.strictEqual(normalized.audience, 'Clinical physicians');
assert.strictEqual(normalized.usp, 'HIPAA-compliant zero-latency audio transcription');

// Missing required fields rejected
assert.throws(() => {
  normalizeStartupBriefInput({});
}, (err) => {
  assert(err instanceof BriefValidationError);
  assert.strictEqual(err.code, 'VALIDATION_FAILED');
  assert.strictEqual(err.status, 400);
  assert(err.message.includes('Idea text or problem'));
  return true;
});
console.log('  ✅ Input normalization and validation passed');

// 2. Valid Draft Brief Schema
console.log('\nTest 2: Valid Draft Brief schema validation...');
const validDraft = {
  schemaVersion: 1,
  status: 'draft',
  rawInput: {
    name: 'NeuroFlow',
    domain: 'HealthTech',
    problem: 'Doctors spend 3 hours per day on charts',
    solution: 'Real-time AI ambient scribe',
    audience: 'Clinical physicians',
    usp: 'HIPAA-compliant zero-latency audio transcription'
  },
  facts: {
    startupName: 'NeuroFlow',
    industry: 'HealthTech',
    problem: 'Doctors spend 3 hours per day on charts',
    solution: 'Real-time AI ambient scribe',
    targetAudience: 'Clinical physicians',
    usp: 'HIPAA-compliant zero-latency audio transcription'
  },
  aiInterpretations: {
    category: 'Healthcare AI / B2B SaaS',
    businessModel: 'Subscription per clinician seat',
    targetMarketDynamics: 'High compliance barriers, high physician burnout',
    coreValueProposition: 'Save 3 hours daily per doctor with clinical-grade ambient scribing'
  },
  assumptions: [
    {
      id: 'asm-1',
      statement: 'Clinics have modern microphone hardware in exam rooms',
      category: 'technical',
      confirmed: false
    },
    {
      id: 'asm-2',
      statement: 'EHR systems support FHIR or HL7 live data export',
      category: 'integration',
      confirmed: false
    }
  ],
  clarificationQuestions: [
    {
      id: 'cq-1',
      question: 'Which EHR platforms do your target clinics use primarily?',
      category: 'integration',
      answered: false,
      founderAnswer: ''
    },
    {
      id: 'cq-2',
      question: 'Are you targeting private practices or hospital networks first?',
      category: 'market',
      answered: true,
      founderAnswer: 'Private practices under 10 clinicians'
    }
  ],
  metadata: {
    generatedAt: new Date().toISOString()
  }
};

const validatedDraft = validateStartupBrief(validDraft);
assert.strictEqual(validatedDraft.schemaVersion, 1);
assert.strictEqual(validatedDraft.status, 'draft');
assert.strictEqual(validatedDraft.facts.startupName, 'NeuroFlow');
assert.strictEqual(validatedDraft.aiInterpretations.category, 'Healthcare AI / B2B SaaS');
assert.strictEqual(validatedDraft.assumptions.length, 2);
assert.strictEqual(validatedDraft.clarificationQuestions.length, 2);
assert.strictEqual(validatedDraft.clarificationQuestions[1].answered, true);
assert.strictEqual(validatedDraft.clarificationQuestions[1].founderAnswer, 'Private practices under 10 clinicians');
console.log('  ✅ Valid draft brief schema validated successfully');

// 3. Valid Confirmed Brief Schema
console.log('\nTest 3: Valid Confirmed Brief schema validation...');
const confirmedBrief = {
  ...validDraft,
  status: 'confirmed',
  metadata: {
    ...validDraft.metadata,
    confirmedAt: new Date().toISOString()
  }
};
const validatedConfirmed = validateStartupBrief(confirmedBrief);
assert.strictEqual(validatedConfirmed.status, 'confirmed');
assert(validatedConfirmed.metadata.confirmedAt);
console.log('  ✅ Confirmed brief validated successfully');

// 4. Schema rejection checks (invalid status, missing sections, invalid types)
console.log('\nTest 4: Schema rejections for invalid structures...');

// Invalid status
assert.throws(() => {
  validateStartupBrief({ ...validDraft, status: 'in-progress' });
}, (err) => {
  assert(err instanceof BriefValidationError);
  assert(err.message.includes('status must be either "draft" or "confirmed"'));
  return true;
});

// Missing rawInput
assert.throws(() => {
  const invalid = { ...validDraft };
  delete invalid.rawInput;
  validateStartupBrief(invalid);
}, (err) => {
  assert(err instanceof BriefValidationError);
  assert(err.message.includes('rawInput'));
  return true;
});

// Missing facts
assert.throws(() => {
  const invalid = { ...validDraft };
  delete invalid.facts;
  validateStartupBrief(invalid);
}, (err) => {
  assert(err instanceof BriefValidationError);
  assert(err.message.includes('facts'));
  return true;
});

// Missing aiInterpretations
assert.throws(() => {
  const invalid = { ...validDraft };
  delete invalid.aiInterpretations;
  validateStartupBrief(invalid);
}, (err) => {
  assert(err instanceof BriefValidationError);
  assert(err.message.includes('aiInterpretations'));
  return true;
});

// Non-object
assert.throws(() => validateStartupBrief(null), BriefValidationError);
assert.throws(() => validateStartupBrief([]), BriefValidationError);
assert.throws(() => validateStartupBrief('string'), BriefValidationError);
console.log('  ✅ Schema rejections for malformed inputs verified');

// 5. Verification of Single Gemini Call for drafting brief
console.log('\nTest 5: Verify single Gemini generation call in briefModel.generateDraftBrief...');

let geminiCallCount = 0;
const originalCallGemini = geminiClient.callGemini;

geminiClient.callGemini = async (prompt, options) => {
  geminiCallCount++;
  assert(prompt.includes('Startup Brief'));
  assert(prompt.includes('NeuroFlow'));
  return JSON.stringify({
    aiInterpretations: {
      category: 'Healthcare AI / B2B SaaS',
      businessModel: 'Subscription per clinician seat',
      targetMarketDynamics: 'High physician burnout, high compliance requirements',
      coreValueProposition: 'Save 3 hours per doctor per day'
    },
    assumptions: [
      { id: 'asm-1', statement: 'Doctors have room microphones', category: 'technical' }
    ],
    clarificationQuestions: [
      { id: 'cq-1', question: 'Which EHR systems are needed first?', category: 'integration' }
    ]
  });
};

(async () => {
  try {
    const draftResult = await generateDraftBrief({
      name: 'NeuroFlow',
      domain: 'HealthTech',
      problem: 'Doctors spend 3 hours per day charting',
      solution: 'Ambient AI scribe',
      audience: 'Clinicians',
      usp: 'Zero-latency transcription'
    });

    assert.strictEqual(geminiCallCount, 1, 'Exactly ONE Gemini call must be made to draft the Startup Brief');
    assert.strictEqual(draftResult.status, 'draft');
    assert.strictEqual(draftResult.schemaVersion, 1);
    assert.strictEqual(draftResult.facts.startupName, 'NeuroFlow');
    assert.strictEqual(draftResult.facts.problem, 'Doctors spend 3 hours per day charting');
    assert.strictEqual(draftResult.aiInterpretations.category, 'Healthcare AI / B2B SaaS');
    assert.strictEqual(draftResult.assumptions.length, 1);
    assert.strictEqual(draftResult.assumptions[0].confirmed, false);
    assert.strictEqual(draftResult.clarificationQuestions.length, 1);
    assert.strictEqual(draftResult.clarificationQuestions[0].answered, false);

    console.log('  ✅ Exactly one Gemini call drafted a valid Startup Brief');

    // Test Gemini invalid output rejection
    geminiClient.callGemini = async () => '{"invalid": true}'; // Missing required keys
    await assert.rejects(async () => {
      await generateDraftBrief({
        name: 'NeuroFlow',
        problem: 'Doctor burnout'
      });
    }, (err) => {
      assert(err instanceof BriefValidationError || err.code === 'MODEL_OUTPUT_INVALID');
      return true;
    });
    console.log('  ✅ Invalid AI model output safely mapped to 502/validation error without crashing');

  } finally {
    geminiClient.callGemini = originalCallGemini;
  }

  console.log('\n====================================================');
  console.log('🎉 ALL STARTUP BRIEF SCHEMA & MODEL TESTS PASSED');
  console.log('====================================================');
})();
