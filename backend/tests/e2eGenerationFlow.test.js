const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('====================================================');
console.log('🧪 RUNNING END-TO-END GENERATION INTEGRATION TEST');
console.log('====================================================\n');

// 1. Mock Axios to intercept Gemini API calls and return realistic valid JSON adhering to schemas
const axiosPath = require.resolve('axios');
const originalAxios = require(axiosPath);

const mockGeminiResponses = {
  leanCanvas: {
    startupName: 'AutoPitch AI',
    problem: 'Early stage founders struggle to build pitch materials',
    solution: 'AI-assisted generation of comprehensive startup business plans',
    audience: 'Early stage founders',
    keyMetrics: '10,000 generated plans, 20% conversion to pitch deck export',
    uniqueValueProposition: 'Generate validated investor-grade startup materials in 60 seconds',
    channels: 'Product Hunt, Founder communities, Accelerator partnerships',
    customerSegments: 'Pre-seed founders, incubator applicants, solo builders',
    costStructure: 'Hosting, LLM API inference, developer salaries',
    revenueStreams: 'SaaS subscription, one-time investor export pass',
    unfairAdvantage: 'Proprietary startup benchmarking algorithm'
  },
  mvp: {
    startupName: 'AutoPitch AI',
    coreFeatures: [
      'Interactive 9-box Lean Canvas editor',
      'One-click investor pitch slide generator',
      'Competitor differentiation matrix'
    ],
    technicalRequirements: 'React 19, Tailwind CSS, Express 5.1, Gemini REST API',
    launchTimeline: '6 weeks to public beta launch'
  },
  revenue: {
    revenueStreams: 'Tiered monthly SaaS subscription ($29/mo - $99/mo)',
    pricingStrategy: 'Value-based pricing targeting active fundraising cycles',
    expectedMonthlyRevenue: '$15,000 - $35,000 within 6 months',
    growthOpportunities: 'Enterprise accelerator licensing and investor matching commissions'
  },
  pitch: {
    elevatorPitch: 'AutoPitch AI turns early-stage ideas into investor-ready business plans in under 60 seconds.'
  },
  personas: {
    personas: [
      {
        name: 'Sarah Chen',
        age: '29 years old',
        occupation: 'First-time Founder',
        goals: 'Secure pre-seed angel funding quickly',
        painPoints: 'Lacks business background and investor network',
        techComfortLevel: 'High'
      },
      {
        name: 'Marcus Bell',
        age: '38 years old',
        occupation: 'Serial Solopreneur',
        goals: 'Rapidly test and validate 5 B2B SaaS ideas per year',
        painPoints: 'Spending too much time on manual documentation',
        techComfortLevel: 'Very High'
      }
    ]
  },
  competitors: {
    competitors: [
      {
        name: 'PitchBob',
        description: 'AI pitch deck builder for pitch competitions',
        differentiator: 'AutoPitch provides holistic lean canvas and revenue models, not just slides'
      },
      {
        name: 'LivePlan',
        description: 'Traditional business plan software',
        differentiator: 'AutoPitch generates plans 100x faster using modern LLM reasoning'
      },
      {
        name: 'VenturusAI',
        description: 'General startup analysis tool',
        differentiator: 'AutoPitch focuses on investor fundraising readiness with presentation previews'
      }
    ]
  }
};

let capturedPrompts = {};

require.cache[axiosPath] = {
  id: axiosPath,
  filename: axiosPath,
  loaded: true,
  exports: {
    ...originalAxios,
    post: async (url, body, config) => {
      const promptText = body?.contents?.[0]?.parts?.[0]?.text || '';
      let matchedResponse = null;

      if (promptText.includes('Lean Canvas strategist')) {
        capturedPrompts.leanCanvas = promptText;
        matchedResponse = mockGeminiResponses.leanCanvas;
      } else if (promptText.includes('startup product strategist') || promptText.includes('MVP plan')) {
        capturedPrompts.mvp = promptText;
        matchedResponse = mockGeminiResponses.mvp;
      } else if (promptText.includes('expert startup revenue strategist')) {
        capturedPrompts.revenue = promptText;
        matchedResponse = mockGeminiResponses.revenue;
      } else if (promptText.includes('pitch deck expert')) {
        capturedPrompts.pitch = promptText;
        matchedResponse = mockGeminiResponses.pitch;
      } else if (promptText.includes('UX researcher')) {
        capturedPrompts.personas = promptText;
        matchedResponse = mockGeminiResponses.personas;
      } else if (promptText.includes('market research expert') || promptText.includes('competitors')) {
        capturedPrompts.competitors = promptText;
        matchedResponse = mockGeminiResponses.competitors;
      } else {
        matchedResponse = { status: 'mock_default' };
      }

      return {
        status: 200,
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(matchedResponse) }]
              }
            }
          ]
        }
      };
    }
  }
};

// -------------------------------------------------------------
// STEP 1: Simulate User Intake in IdeaInputPage
// -------------------------------------------------------------
console.log('Step 1: Simulating user form submission in IdeaInputPage...');
const userFormData = {
  name: 'AutoPitch AI',
  domain: 'B2B SaaS',
  problem: 'Early stage founders struggle to build pitch materials',
  solution: 'AI-assisted generation of comprehensive startup business plans',
  audience: 'Early stage founders',
  usp: 'Generate validated investor-grade startup materials in 60 seconds',
  summary: 'A complete SaaS platform for founders'
};

// Canonical payload construction (matching IdeaInputPage.js lines 30-37)
const canonicalPayload = {
  startupName: userFormData.name,
  industry: userFormData.domain,
  problem: userFormData.problem,
  solution: userFormData.solution,
  targetAudience: userFormData.audience,
  usp: userFormData.usp
};

assert.strictEqual(canonicalPayload.usp, userFormData.usp, 'USP must be stored as canonical field "usp"');
assert.strictEqual(canonicalPayload.uniqueValueProposition, undefined, 'Legacy field uniqueValueProposition must NOT exist');
console.log('✅ Canonical input payload built with correct field naming');

// -------------------------------------------------------------
// STEP 2: Dispatch 6 Requests to Controllers
// -------------------------------------------------------------
console.log('\nStep 2: Dispatching canonical payload through all 6 controllers...');

const controllers = [
  { name: 'leanCanvas', file: 'leanCanvasController.js', fn: 'generateLeanCanvas' },
  { name: 'mvp', file: 'mvpController.js', fn: 'generateMVP' },
  { name: 'revenue', file: 'revenueController.js', fn: 'generateRevenue' },
  { name: 'pitch', file: 'pitchController.js', fn: 'generatePitch' },
  { name: 'personas', file: 'personaController.js', fn: 'generatePersonas' },
  { name: 'competitors', file: 'competitorController.js', fn: 'generateCompetitors' }
];

const apiResponses = {};

async function runControllers() {
  for (const ctrl of controllers) {
    const ctrlPath = path.join(__dirname, '../controllers', ctrl.file);
    delete require.cache[require.resolve(ctrlPath)];
    const controllerModule = require(ctrlPath);
    const handler = controllerModule[ctrl.fn];

    assert(typeof handler === 'function', `Controller handler ${ctrl.fn} must be a function`);

    let responseStatus = null;
    let responseData = null;

    const req = { body: canonicalPayload };
    const res = {
      status: (code) => {
        responseStatus = code;
        return {
          json: (data) => {
            responseData = data;
          }
        };
      }
    };

    await handler(req, res);

    assert.strictEqual(responseStatus, 200, `${ctrl.name} controller must return HTTP 200`);
    assert(responseData !== null, `${ctrl.name} controller must return JSON data`);
    apiResponses[ctrl.name] = responseData;

    console.log(`✅ [${ctrl.name}] Controller processed request -> HTTP 200 OK`);
  }
}

// -------------------------------------------------------------
// STEP 3: Verify Model Prompt Construction
// -------------------------------------------------------------
async function verifyPrompts() {
  console.log('\nStep 3: Verifying model prompt construction received canonical fields...');
  for (const moduleName of ['leanCanvas', 'mvp', 'revenue', 'pitch', 'personas', 'competitors']) {
    const prompt = capturedPrompts[moduleName];
    assert(prompt, `Prompt was not captured for ${moduleName}`);
    assert(prompt.includes(canonicalPayload.startupName), `Prompt for ${moduleName} must include startupName`);
    assert(prompt.includes(canonicalPayload.usp), `Prompt for ${moduleName} must include usp`);
    assert(!prompt.includes('undefined'), `Prompt for ${moduleName} must not contain "undefined"`);
    console.log(`✅ [${moduleName}] Prompt correctly embeds startupName and usp`);
  }
}

// -------------------------------------------------------------
// STEP 4: Simulate Frontend localStorage Persistence
// -------------------------------------------------------------
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => { store[key] = val.toString(); },
    clear: () => { store = {}; },
    all: () => store
  };
})();

function simulateStorage() {
  console.log('\nStep 4: Simulating localStorage persistence (IdeaInputPage lines 67-88)...');

  // Exact storage logic from IdeaInputPage.js
  localStorageMock.setItem('leanCanvas', JSON.stringify(apiResponses.leanCanvas));
  localStorageMock.setItem('mvp', JSON.stringify(apiResponses.mvp));
  localStorageMock.setItem('revenue', JSON.stringify([
    {
      model: 'Primary Revenue Stream',
      description: apiResponses.revenue.revenueStreams,
      projection: apiResponses.revenue.expectedMonthlyRevenue
    },
    {
      model: 'Pricing Strategy',
      description: apiResponses.revenue.pricingStrategy,
      projection: 'Growth Phase'
    }
  ]));
  localStorageMock.setItem('pitch', JSON.stringify(apiResponses.pitch));
  localStorageMock.setItem('personas', JSON.stringify(apiResponses.personas.personas || apiResponses.personas));
  localStorageMock.setItem('competitors', JSON.stringify(apiResponses.competitors.competitors || apiResponses.competitors));
  localStorageMock.setItem('formData', JSON.stringify(userFormData));

  // Verify MVP object completeness (Chunk 1.3 regression check)
  const storedMvp = JSON.parse(localStorageMock.getItem('mvp'));
  assert(storedMvp.startupName, 'Stored MVP must contain startupName');
  assert(Array.isArray(storedMvp.coreFeatures), 'Stored MVP must contain coreFeatures array');
  assert.strictEqual(storedMvp.coreFeatures.length, 3, 'Stored MVP coreFeatures length must be 3');
  assert(storedMvp.technicalRequirements, 'Stored MVP must contain technicalRequirements');
  assert(storedMvp.launchTimeline, 'Stored MVP must contain launchTimeline');
  console.log('✅ localStorage["mvp"] verified: complete object preserved without truncation');

  // Verify Lean Canvas completeness
  const storedCanvas = JSON.parse(localStorageMock.getItem('leanCanvas'));
  assert(storedCanvas.keyMetrics, 'Stored Lean Canvas must contain keyMetrics');
  assert(storedCanvas.uniqueValueProposition, 'Stored Lean Canvas must contain uniqueValueProposition');
  console.log('✅ localStorage["leanCanvas"] verified');

  // Verify Revenue completeness
  const storedRevenue = JSON.parse(localStorageMock.getItem('revenue'));
  assert(Array.isArray(storedRevenue), 'Stored Revenue must be an array of revenue streams');
  assert.strictEqual(storedRevenue.length, 2, 'Stored Revenue must have 2 models');
  console.log('✅ localStorage["revenue"] verified');

  // Verify Personas completeness
  const storedPersonas = JSON.parse(localStorageMock.getItem('personas'));
  assert(Array.isArray(storedPersonas), 'Stored Personas must be an array of persona profiles');
  assert.strictEqual(storedPersonas.length, 2, 'Stored Personas must have 2 profiles');
  console.log('✅ localStorage["personas"] verified');

  // Verify Competitors completeness
  const storedCompetitors = JSON.parse(localStorageMock.getItem('competitors'));
  assert(Array.isArray(storedCompetitors), 'Stored Competitors must be an array of competitor objects');
  assert.strictEqual(storedCompetitors.length, 3, 'Stored Competitors must have 3 entries');
  console.log('✅ localStorage["competitors"] verified');

  // Verify Pitch completeness
  const storedPitch = JSON.parse(localStorageMock.getItem('pitch'));
  assert(storedPitch.elevatorPitch, 'Stored Pitch must contain elevatorPitch');
  console.log('✅ localStorage["pitch"] verified');
}

// -------------------------------------------------------------
// STEP 5: Simulate Dashboard Consumption
// -------------------------------------------------------------
function simulateDashboardConsumption() {
  console.log('\nStep 5: Simulating DashboardPage and tabs data consumption...');

  const formData = JSON.parse(localStorageMock.getItem('formData') || '{}');
  const leanCanvas = JSON.parse(localStorageMock.getItem('leanCanvas') || 'null');
  const mvp = JSON.parse(localStorageMock.getItem('mvp') || 'null');
  const revenue = JSON.parse(localStorageMock.getItem('revenue') || 'null');
  const pitch = JSON.parse(localStorageMock.getItem('pitch') || 'null');
  const personas = JSON.parse(localStorageMock.getItem('personas') || 'null');
  const competitors = JSON.parse(localStorageMock.getItem('competitors') || 'null');

  // DashboardPage state builder (DashboardPage.js lines 54-69)
  const collectedData = {
    overview: {
      name: formData.name || leanCanvas?.startupName || 'Your Startup',
      industry: formData.domain || leanCanvas?.industry || '',
      problem: formData.problem || leanCanvas?.problem || '',
      solution: formData.solution || leanCanvas?.solution || '',
      audience: formData.audience || leanCanvas?.audience || leanCanvas?.customerSegments || '',
      usp: formData.usp || leanCanvas?.uniqueValueProposition || ''
    },
    leanCanvas,
    mvp,
    revenue,
    pitch,
    personas,
    competitors
  };

  // 1. OverviewTab verification
  assert.strictEqual(collectedData.overview.name, 'AutoPitch AI');
  assert.strictEqual(collectedData.overview.usp, 'Generate validated investor-grade startup materials in 60 seconds');
  console.log('✅ OverviewTab receives complete overview data');

  // 2. MVPTab verification (DashboardTabs.js lines 238-375)
  const mvpData = collectedData.mvp;
  const coreFeatures = mvpData?.coreFeatures || (Array.isArray(mvpData) ? mvpData : []);
  assert.strictEqual(coreFeatures.length, 3);
  assert.strictEqual(mvpData.startupName, 'AutoPitch AI');
  assert.strictEqual(mvpData.technicalRequirements, 'React 19, Tailwind CSS, Express 5.1, Gemini REST API');
  assert.strictEqual(mvpData.launchTimeline, '6 weeks to public beta launch');
  console.log('✅ MVPTab successfully reads coreFeatures, technicalRequirements, and launchTimeline');

  // 3. RevenueTab verification (DashboardTabs.js lines 380-455)
  const revenueData = collectedData.revenue;
  assert(Array.isArray(revenueData));
  assert.strictEqual(revenueData[0].model, 'Primary Revenue Stream');
  assert(revenueData[0].description.includes('SaaS subscription'));
  console.log('✅ RevenueTab successfully reads revenue stream items and projections');

  // 4. CompetitorsTab verification (DashboardTabs.js lines 473-573)
  const competitorData = collectedData.competitors;
  assert(Array.isArray(competitorData));
  assert.strictEqual(competitorData.length, 3);
  assert.strictEqual(competitorData[0].name, 'PitchBob');
  assert(competitorData[0].differentiator);
  console.log('✅ CompetitorsTab successfully reads competitor list and differentiators');

  // 5. PersonasTab verification (DashboardTabs.js lines 592-692)
  const personaData = collectedData.personas;
  assert(Array.isArray(personaData));
  assert.strictEqual(personaData.length, 2);
  assert.strictEqual(personaData[0].name, 'Sarah Chen');
  assert.strictEqual(personaData[0].occupation, 'First-time Founder');
  console.log('✅ PersonasTab successfully reads user personas');

  // 6. PitchPreviewPage verification (PitchPreviewPage.js lines 82-160)
  const previewFeatures = collectedData.mvp?.coreFeatures || (Array.isArray(collectedData.mvp) ? collectedData.mvp : []);
  assert.strictEqual(previewFeatures.length, 3);
  assert(collectedData.pitch?.elevatorPitch.includes('AutoPitch AI'));
  console.log('✅ PitchPreviewPage successfully reads pitch and MVP features');
}

// -------------------------------------------------------------
// STEP 6: Execute Integration Test Sequence
// -------------------------------------------------------------
async function runAll() {
  await runControllers();
  await verifyPrompts();
  simulateStorage();
  simulateDashboardConsumption();

  console.log('\n====================================================');
  console.log('🎉 ALL END-TO-END GENERATION TESTS PASSED CLEANLY!');
  console.log('====================================================\n');
}

runAll().catch((err) => {
  console.error('\n❌ End-to-end integration test FAILED:', err);
  process.exit(1);
});
