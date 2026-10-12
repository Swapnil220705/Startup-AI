const assert = require('assert');
const {
  SchemaValidationError,
  validateLeanCanvas,
  validateMVP,
  validateRevenue,
  validatePersonas,
  validateCompetitors,
  validatePitch
} = require('../utils/responseValidators');
const { sendApiError } = require('../utils/apiError');

console.log('====================================================');
console.log('🧪 RUNNING AI OUTPUT SCHEMA VALIDATION TESTS (CHUNK 7.1)');
console.log('====================================================\n');

// 1. Lean Canvas Validator Tests
console.log('Test 1: Lean Canvas validation (valid, missing keys, empty, malformed)...');

const validLeanCanvas = {
  startupName: 'AutoPitch AI',
  problem: 'Founders spend weeks making pitch decks',
  solution: 'Instant AI business plan generation',
  uniqueValueProposition: 'Complete investor decks in 60s',
  customerSegments: ['Early-stage founders', 'Solo founders'],
  keyMetrics: ['MRR', 'Customer Acquisition Cost'],
  channels: ['Product Hunt', 'LinkedIn'],
  costStructure: ['Cloud hosting', 'AI API costs'],
  revenueStreams: ['Monthly SaaS subscription', 'Enterprise tier'],
  unfairAdvantage: 'Proprietary reasoning engine'
};

const validatedLC = validateLeanCanvas(validLeanCanvas);
assert.strictEqual(validatedLC.startupName, 'AutoPitch AI');
assert.strictEqual(validatedLC.problem, 'Founders spend weeks making pitch decks');
assert(Array.isArray(validatedLC.customerSegments));

// Empty object rejected
assert.throws(() => {
  validateLeanCanvas({});
}, (err) => {
  assert(err instanceof SchemaValidationError);
  assert.strictEqual(err.code, 'MODEL_OUTPUT_INVALID');
  assert.strictEqual(err.status, 502);
  assert(err.details.missing.length > 0);
  return true;
});

// Missing required keys rejected
assert.throws(() => {
  validateLeanCanvas({
    startupName: 'AutoPitch',
    problem: 'Some problem',
    solution: 'Some solution'
    // Missing all other 7 sections
  });
}, (err) => {
  assert(err instanceof SchemaValidationError);
  assert(err.message.includes('missing required section(s)'));
  assert(err.details.missing.includes('Unique Value Proposition'));
  assert(err.details.missing.includes('Revenue Streams'));
  return true;
});

// Non-object rejected
assert.throws(() => validateLeanCanvas('not an object'), SchemaValidationError);
assert.throws(() => validateLeanCanvas([]), SchemaValidationError);
assert.throws(() => validateLeanCanvas(null), SchemaValidationError);
console.log('  ✅ validateLeanCanvas correctly validates and rejects invalid shapes');

// 2. MVP Roadmap Validator Tests
console.log('\nTest 2: MVP Roadmap validation (valid, missing fields, empty features)...');

const validMVP = {
  startupName: 'AutoPitch AI',
  technicalRequirements: 'React 19, Tailwind CSS, Express 5.1, Gemini REST API',
  launchTimeline: '6 weeks to public beta',
  coreFeatures: ['Feature 1', 'Feature 2', 'Feature 3']
};

const validatedMVP = validateMVP(validMVP);
assert.strictEqual(validatedMVP.startupName, 'AutoPitch AI');
assert.strictEqual(validatedMVP.coreFeatures.length, 3);

// Empty coreFeatures rejected
assert.throws(() => {
  validateMVP({
    startupName: 'AutoPitch',
    technicalRequirements: 'Node.js',
    launchTimeline: '4 weeks',
    coreFeatures: []
  });
}, (err) => {
  assert(err instanceof SchemaValidationError);
  assert(err.message.includes('coreFeatures'));
  return true;
});

// Missing technicalRequirements rejected
assert.throws(() => {
  validateMVP({
    startupName: 'AutoPitch',
    launchTimeline: '4 weeks',
    coreFeatures: ['Feature 1']
  });
}, SchemaValidationError);

// Missing launchTimeline rejected
assert.throws(() => {
  validateMVP({
    startupName: 'AutoPitch',
    technicalRequirements: 'Node.js',
    coreFeatures: ['Feature 1']
  });
}, SchemaValidationError);

console.log('  ✅ validateMVP correctly enforces coreFeatures, technical requirements, and timeline');

// 3. Revenue & Pricing Validator Tests
console.log('\nTest 3: Revenue & Pricing validation (valid, missing keys, empty values)...');

const validRevenue = {
  revenueStreams: [
    { stream: 'Pro Tier', description: 'Monthly subscription', pricingModel: '$29/mo' },
    { stream: 'Team Tier', description: 'Collaborative subscription', pricingModel: '$99/mo' }
  ],
  pricingStrategy: 'Value-based tiered pricing targeting early-stage companies',
  expectedMonthlyRevenue: '$15,000 - $30,000 within 6 months',
  growthOpportunities: [
    'Accelerator enterprise licenses',
    'Investor network discovery fees'
  ]
};

const validatedRev = validateRevenue(validRevenue);
assert.strictEqual(validatedRev.pricingStrategy, validRevenue.pricingStrategy);
assert.strictEqual(validatedRev.expectedMonthlyRevenue, validRevenue.expectedMonthlyRevenue);
assert.strictEqual(validatedRev.growthOpportunities.length, 2);

// Missing growthOpportunities rejected
assert.throws(() => {
  validateRevenue({
    revenueStreams: ['SaaS'],
    pricingStrategy: 'Tiered',
    expectedMonthlyRevenue: '$10k'
    // missing growthOpportunities
  });
}, (err) => {
  assert(err instanceof SchemaValidationError);
  assert(err.message.includes('Growth Opportunities'));
  assert(err.details.missing.includes('Growth Opportunities'));
  return true;
});

// Missing expectedMonthlyRevenue rejected
assert.throws(() => {
  validateRevenue({
    revenueStreams: ['SaaS'],
    pricingStrategy: 'Tiered',
    growthOpportunities: ['Enterprise']
  });
}, SchemaValidationError);

// Missing pricingStrategy rejected
assert.throws(() => {
  validateRevenue({
    revenueStreams: ['SaaS'],
    expectedMonthlyRevenue: '$10k',
    growthOpportunities: ['Enterprise']
  });
}, SchemaValidationError);

// Missing revenueStreams rejected
assert.throws(() => {
  validateRevenue({
    pricingStrategy: 'Tiered',
    expectedMonthlyRevenue: '$10k',
    growthOpportunities: ['Enterprise']
  });
}, SchemaValidationError);

console.log('  ✅ validateRevenue strictly guards revenueStreams, pricingStrategy, monthly revenue, and growthOpportunities');

// 4. User Personas Validator Tests
console.log('\nTest 4: User Personas validation (usable collection, missing fields)...');

const validPersonas = {
  personas: [
    {
      name: 'Sarah Chen',
      age: '29',
      occupation: 'First-time founder',
      goals: 'Raise pre-seed round',
      painPoints: 'No financial modeling background',
      techComfortLevel: 'High'
    },
    {
      name: 'Marcus Bell',
      age: '42',
      occupation: 'Serial entrepreneur',
      goals: 'Fast market testing',
      painPoints: 'Writing tedious documentation',
      techComfortLevel: 'Very High'
    }
  ]
};

const validatedPersonas = validatePersonas(validPersonas);
assert.strictEqual(validatedPersonas.personas.length, 2);

// Empty personas array rejected
assert.throws(() => {
  validatePersonas({ personas: [] });
}, (err) => {
  assert(err instanceof SchemaValidationError);
  assert(err.message.includes('non-empty "personas" array'));
  return true;
});

// Missing personas key rejected
assert.throws(() => {
  validatePersonas({});
}, SchemaValidationError);

// Array of unusable objects rejected
assert.throws(() => {
  validatePersonas({
    personas: [
      { randomKey: 'no name or goals' }
    ]
  });
}, SchemaValidationError);

console.log('  ✅ validatePersonas guarantees usable persona collection with required dimensions');

// 5. Competitor Analysis Validator Tests
console.log('\nTest 5: Competitor Analysis validation (usable collection, missing fields)...');

const validCompetitors = {
  competitors: [
    {
      name: 'PitchBob',
      description: 'AI pitch deck builder',
      differentiator: 'AutoPitch generates holistic plans, not just slides'
    },
    {
      name: 'LivePlan',
      description: 'Traditional business plan software',
      differentiator: 'AutoPitch uses modern AI reasoning 100x faster'
    }
  ]
};

const validatedComp = validateCompetitors(validCompetitors);
assert.strictEqual(validatedComp.competitors.length, 2);

// Empty competitors array rejected
assert.throws(() => {
  validateCompetitors({ competitors: [] });
}, (err) => {
  assert(err instanceof SchemaValidationError);
  assert(err.message.includes('non-empty "competitors" array'));
  return true;
});

// Missing differentiator rejected
assert.throws(() => {
  validateCompetitors({
    competitors: [{ name: 'Comp', description: 'Desc' }]
  });
}, SchemaValidationError);

console.log('  ✅ validateCompetitors guarantees usable competitor collection');

// 6. Investor Pitch Validator Tests
console.log('\nTest 6: Investor Pitch validation (elevatorPitch string contract)...');

const validPitch = {
  elevatorPitch: 'AutoPitch AI empowers early-stage founders to generate investor-grade business plans in seconds.'
};

const validatedPitch = validatePitch(validPitch);
assert.strictEqual(validatedPitch.elevatorPitch, validPitch.elevatorPitch);

// Missing elevatorPitch rejected
assert.throws(() => {
  validatePitch({});
}, SchemaValidationError);

// Too short elevatorPitch rejected (< 10 chars)
assert.throws(() => {
  validatePitch({ elevatorPitch: 'Too short' });
}, SchemaValidationError);

console.log('  ✅ validatePitch validates elevatorPitch contract and rejects empty/short output');

// 7. Schema Error vs Syntax Error & HTTP 502 Response Safe Handling
console.log('\nTest 7: Safe error responses for schema validation failures...');

function createMockRes() {
  let statusCode = 200;
  let sentData = null;
  return {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      sentData = data;
      return this;
    },
    getStatusCode: () => statusCode,
    getData: () => sentData
  };
}

const mockRes = createMockRes();
const schemaErr = new SchemaValidationError('Revenue Model missing growthOpportunities', 'revenue', { field: 'growthOpportunities' });
assert.strictEqual(schemaErr.status, 502);
assert.strictEqual(schemaErr.code, 'MODEL_OUTPUT_INVALID');

sendApiError(mockRes, schemaErr, 'Failed to generate revenue model');
assert.strictEqual(mockRes.getStatusCode(), 502);
const errBody = mockRes.getData();
assert.strictEqual(errBody.success, false);
assert.strictEqual(errBody.error.code, 'MODEL_OUTPUT_INVALID');
assert(errBody.error.message.includes('AI service returned an incomplete or invalid response structure'));
assert.strictEqual(errBody.error.stack, undefined, 'Stack trace must not leak');
assert.strictEqual(errBody.error.apiKey, undefined, 'API key must never leak');

console.log('  ✅ sendApiError safely returns HTTP 502 MODEL_OUTPUT_INVALID without leaking internal details');

console.log('\n====================================================');
console.log('🎉 ALL AI OUTPUT SCHEMA VALIDATION TESTS PASSED!');
console.log('====================================================');
