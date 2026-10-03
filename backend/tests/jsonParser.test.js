const assert = require('assert');
const { parseGeminiJson, stripTrailingCommas, extractOuterJsonCandidates } = require('../utils/jsonParser');

console.log('====================================================');
console.log('🧪 RUNNING GEMINI JSON PARSER TESTS (CHUNK 2.1)');
console.log('====================================================\n');

// -------------------------------------------------------------
// 1. Plain pristine JSON
// -------------------------------------------------------------
console.log('Test 1: Plain pristine JSON (objects and arrays)...');
const plainObj = parseGeminiJson('{"startupName": "AutoPitch", "industry": "B2B SaaS"}');
assert.strictEqual(plainObj.startupName, 'AutoPitch');
assert.strictEqual(plainObj.industry, 'B2B SaaS');

const plainArr = parseGeminiJson('[{"name": "Competitor 1"}, {"name": "Competitor 2"}]');
assert(Array.isArray(plainArr));
assert.strictEqual(plainArr.length, 2);
assert.strictEqual(plainArr[0].name, 'Competitor 1');
console.log('✅ Passed Test 1: Pristine JSON');

// -------------------------------------------------------------
// 2. Markdown fenced code blocks
// -------------------------------------------------------------
console.log('\nTest 2: Markdown fenced code blocks...');

// standard ```json
const fencedJson = parseGeminiJson('```json\n{\n  "elevatorPitch": "Turn ideas into pitch decks in 60s."\n}\n```');
assert.strictEqual(fencedJson.elevatorPitch, 'Turn ideas into pitch decks in 60s.');

// uppercase ```JSON
const fencedUpper = parseGeminiJson('```JSON\n{\n  "elevatorPitch": "Uppercase tag works."\n}\n```');
assert.strictEqual(fencedUpper.elevatorPitch, 'Uppercase tag works.');

// ```javascript
const fencedJs = parseGeminiJson('```javascript\n{\n  "module": "javascript language identifier"\n}\n```');
assert.strictEqual(fencedJs.module, 'javascript language identifier');

// generic ``` without language
const fencedNoLang = parseGeminiJson('```\n{\n  "module": "no language tag"\n}\n```');
assert.strictEqual(fencedNoLang.module, 'no language tag');

// unclosed code fence (streaming cut-off or model omitted closing fence)
const unclosedFence = parseGeminiJson('```json\n{\n  "status": "unclosed fence works"\n}');
assert.strictEqual(unclosedFence.status, 'unclosed fence works');
console.log('✅ Passed Test 2: Markdown code blocks');

// -------------------------------------------------------------
// 3. Conversational preamble and postamble
// -------------------------------------------------------------
console.log('\nTest 3: Conversational preamble and postamble...');

const preambleOnly = parseGeminiJson(`
Here is the Lean Canvas generated for your startup:
\`\`\`json
{
  "problem": "Founders struggle with pitch decks",
  "solution": "Automated pitch deck generation"
}
\`\`\`
`);
assert.strictEqual(preambleOnly.problem, 'Founders struggle with pitch decks');

const postambleOnly = parseGeminiJson(`
\`\`\`json
{
  "keyMetrics": "1000 signups/mo"
}
\`\`\`
I hope this business plan helps your fundraising journey! Let me know if you need tweaks.
`);
assert.strictEqual(postambleOnly.keyMetrics, '1000 signups/mo');

const bothPreambleAndPostamble = parseGeminiJson(`
Certainly! Below is the requested MVP roadmap for your team:

\`\`\`json
{
  "coreFeatures": ["Feature A", "Feature B"],
  "technicalRequirements": "Node.js and React",
  "launchTimeline": "4 weeks"
}
\`\`\`

Feel free to ask for further refinements!
`);
assert.strictEqual(bothPreambleAndPostamble.coreFeatures.length, 2);
assert.strictEqual(bothPreambleAndPostamble.launchTimeline, '4 weeks');

// Conversational wrapper without code fences
const unfencedConversational = parseGeminiJson(`
Sure thing! Here is the pricing model:

{
  "revenueStreams": "Monthly subscriptions",
  "pricingStrategy": "Freemium with $49/mo pro tier"
}

Best regards,
Your AI Co-founder
`);
assert.strictEqual(unfencedConversational.revenueStreams, 'Monthly subscriptions');
assert.strictEqual(unfencedConversational.pricingStrategy, 'Freemium with $49/mo pro tier');
console.log('✅ Passed Test 3: Conversational wrappers');

// -------------------------------------------------------------
// 4. Trailing comma sanitization
// -------------------------------------------------------------
console.log('\nTest 4: Trailing comma sanitization...');

const trailingCommaObj = parseGeminiJson(`
{
  "startupName": "AutoPitch",
  "industry": "FinTech",
}
`);
assert.strictEqual(trailingCommaObj.startupName, 'AutoPitch');

const trailingCommaArr = parseGeminiJson(`
[
  "Feature 1",
  "Feature 2",
  "Feature 3",
]
`);
assert.strictEqual(trailingCommaArr.length, 3);

const nestedTrailingCommas = parseGeminiJson(`
\`\`\`json
{
  "personas": [
    {
      "name": "Sarah",
      "age": "28",
      "goals": "Raise funding",
    },
    {
      "name": "David",
      "age": "35",
      "goals": "Scale revenue",
    },
  ],
}
\`\`\`
`);
assert.strictEqual(nestedTrailingCommas.personas.length, 2);
assert.strictEqual(nestedTrailingCommas.personas[0].name, 'Sarah');

// Preserve commas and brackets inside string literals
const stringLiteralPreservation = parseGeminiJson(`
{
  "description": "Features include: auth, payments, } and [analytics].",
  "query": "SELECT [col] FROM [table],"
}
`);
assert.strictEqual(stringLiteralPreservation.description, 'Features include: auth, payments, } and [analytics].');
assert.strictEqual(stringLiteralPreservation.query, 'SELECT [col] FROM [table],');
console.log('✅ Passed Test 4: Trailing commas');

// -------------------------------------------------------------
// 5. UTF-8 BOM, zero-width spaces, and whitespace
// -------------------------------------------------------------
console.log('\nTest 5: UTF-8 BOM, zero-width spaces, and whitespace...');

const bomJson = parseGeminiJson('\uFEFF{"startupName": "With BOM"}');
assert.strictEqual(bomJson.startupName, 'With BOM');

const zeroWidthJson = parseGeminiJson('\u200B\u200C{"startupName": "With Zero Width"}\u200D');
assert.strictEqual(zeroWidthJson.startupName, 'With Zero Width');

const excessWhitespace = parseGeminiJson('\n\n\r\t  {"startupName": "Whitespace"}   \r\n\t');
assert.strictEqual(excessWhitespace.startupName, 'Whitespace');
console.log('✅ Passed Test 5: BOM and whitespace handling');

// -------------------------------------------------------------
// 6. Real-world Gemini output variations for all 6 modules
// -------------------------------------------------------------
console.log('\nTest 6: Real-world module response shapes...');

// Lean Canvas
const leanCanvasSample = parseGeminiJson(`
Here is your Lean Canvas:
\`\`\`json
{
  "startupName": "EcoShip",
  "problem": "High carbon footprint in logistics",
  "solution": "AI route optimization",
  "audience": "Freight companies",
  "keyMetrics": "CO2 reduced",
  "uniqueValueProposition": "Green freight in minutes",
  "channels": "B2B direct",
  "customerSegments": "Mid-market shippers",
  "costStructure": "Cloud GPUs",
  "revenueStreams": "SaaS per truck",
  "unfairAdvantage": "Proprietary emissions dataset"
}
\`\`\`
`);
assert.strictEqual(leanCanvasSample.startupName, 'EcoShip');
assert.strictEqual(leanCanvasSample.uniqueValueProposition, 'Green freight in minutes');

// MVP
const mvpSample = parseGeminiJson(`
\`\`\`json
{
  "startupName": "EcoShip",
  "coreFeatures": ["Route calculation", "Emissions tracker", "PDF export"],
  "technicalRequirements": "Python FastAPI, React frontend",
  "launchTimeline": "8 weeks to beta"
}
\`\`\`
`);
assert.strictEqual(mvpSample.coreFeatures.length, 3);
assert.strictEqual(mvpSample.launchTimeline, '8 weeks to beta');

// Revenue
const revenueSample = parseGeminiJson(`
\`\`\`json
{
  "revenueStreams": "Tiered enterprise subscription ($499 - $2500/mo)",
  "pricingStrategy": "Volume-based per shipment",
  "expectedMonthlyRevenue": "$25,000 in Year 1",
  "growthOpportunities": "API licensing to third-party telematics"
}
\`\`\`
`);
assert.strictEqual(revenueSample.expectedMonthlyRevenue, '$25,000 in Year 1');

// Pitch
const pitchSample = parseGeminiJson(`
\`\`\`json
{
  "elevatorPitch": "EcoShip helps logistics operators reduce emissions by 30% through intelligent routing."
}
\`\`\`
`);
assert(pitchSample.elevatorPitch.includes('EcoShip'));

// Personas
const personasSample = parseGeminiJson(`
\`\`\`json
{
  "personas": [
    {
      "name": "Fleet Manager Frank",
      "age": "45",
      "occupation": "Director of Logistics",
      "goals": "Cut fuel costs and hit ESG targets",
      "painPoints": "Manual dispatching and poor visibility",
      "techComfortLevel": "Moderate"
    }
  ]
}
\`\`\`
`);
assert.strictEqual(personasSample.personas.length, 1);
assert.strictEqual(personasSample.personas[0].name, 'Fleet Manager Frank');

// Competitors
const competitorsSample = parseGeminiJson(`
\`\`\`json
{
  "competitors": [
    {
      "name": "LegacyRoute",
      "description": "Traditional route planner",
      "differentiator": "EcoShip calculates real-time carbon offsets"
    }
  ]
}
\`\`\`
`);
assert.strictEqual(competitorsSample.competitors.length, 1);
assert.strictEqual(competitorsSample.competitors[0].name, 'LegacyRoute');
console.log('✅ Passed Test 6: All 6 module response schemas');

// -------------------------------------------------------------
// 7. Error cases
// -------------------------------------------------------------
console.log('\nTest 7: Error handling for invalid inputs...');

assert.throws(() => parseGeminiJson(null), /Invalid or empty response text/);
assert.throws(() => parseGeminiJson(undefined), /Invalid or empty response text/);
assert.throws(() => parseGeminiJson(''), /Response text from Gemini is empty/);
assert.throws(() => parseGeminiJson('    \n\t  '), /Response text from Gemini is empty/);
assert.throws(() => parseGeminiJson(12345), /Invalid or empty response text/);
assert.throws(() => parseGeminiJson(true), /Invalid or empty response text/);
assert.throws(
  () => parseGeminiJson('I am an AI and I cannot generate this response due to policy violations.'),
  /Failed to parse JSON from Gemini response/
);
assert.throws(
  () => parseGeminiJson('```json\n{"broken": unquoted string}\n```'),
  /Failed to parse JSON from Gemini response/
);
console.log('✅ Passed Test 7: Error handling');

// -------------------------------------------------------------
// 8. Idempotency / Already-parsed object passthrough
// -------------------------------------------------------------
console.log('\nTest 8: Object passthrough...');
const existingObj = { already: 'parsed' };
assert.strictEqual(parseGeminiJson(existingObj), existingObj);
console.log('✅ Passed Test 8: Object passthrough');

// -------------------------------------------------------------
// 9. Integration test: All 6 model functions handling variations
// -------------------------------------------------------------
console.log('\nTest 9: Integration with all 6 model functions...');

const axios = require('axios');

const mockModelData = {
  startupName: 'AutoPitch AI',
  industry: 'B2B SaaS',
  problem: 'Founders struggle to build pitch materials',
  solution: 'AI-assisted generation of business plans',
  targetAudience: 'Early stage founders',
  usp: 'Generate validated startup materials in 60 seconds'
};

async function testModelIntegration() {
  const originalPost = axios.post;

  try {
    // 1. Test leanCanvas with conversational wrapper + markdown fence + uppercase JSON tag
    axios.post = async () => ({
      data: {
        candidates: [{
          content: {
            parts: [{
              text: `Here is the requested Lean Canvas:\n\`\`\`JSON\n{\n  "startupName": "AutoPitch AI",\n  "problem": "Pitching is hard",\n  "solution": "AI plans",\n  "uniqueValueProposition": "Instant plans",\n  "keyMetrics": "Active users",\n}\n\`\`\`\nHope this helps!`
            }]
          }
        }]
      }
    });
    const { generateLeanCanvas } = require('../models/leanCanvas');
    const canvasResult = await generateLeanCanvas(mockModelData);
    assert.strictEqual(canvasResult.startupName, 'AutoPitch AI');
    assert.strictEqual(canvasResult.uniqueValueProposition, 'Instant plans');
    console.log('  ✅ [leanCanvas] successfully handled conversational preamble + uppercase fence + trailing comma');

    // 2. Test mvpGenerator with unclosed code fence + trailing commas
    axios.post = async () => ({
      data: {
        candidates: [{
          content: {
            parts: [{
              text: `\`\`\`json\n{\n  "startupName": "AutoPitch AI",\n  "coreFeatures": [\n    "Feature 1",\n    "Feature 2",\n  ],\n  "technicalRequirements": "Node.js",\n  "launchTimeline": "4 weeks",\n}`
            }]
          }
        }]
      }
    });
    const { generateMVP } = require('../models/mvpGenerator');
    const mvpResult = await generateMVP(mockModelData);
    assert.strictEqual(mvpResult.startupName, 'AutoPitch AI');
    assert.strictEqual(mvpResult.coreFeatures.length, 2);
    console.log('  ✅ [mvpGenerator] successfully handled unclosed fence + trailing commas');

    // 3. Test revenueModel with unfenced conversational text
    axios.post = async () => ({
      data: {
        candidates: [{
          content: {
            parts: [{
              text: `Certainly! Here is your monetization plan:\n\n{\n  "revenueStreams": "SaaS Subscription",\n  "pricingStrategy": "Tiered pricing",\n  "expectedMonthlyRevenue": "$10,000",\n  "growthOpportunities": "Enterprise expansion"\n}\n\nLet me know if you need adjustments.`
            }]
          }
        }]
      }
    });
    const { generateRevenue } = require('../models/revenueModel');
    const revenueResult = await generateRevenue(mockModelData);
    assert.strictEqual(revenueResult.revenueStreams, 'SaaS Subscription');
    console.log('  ✅ [revenueModel] successfully handled unfenced conversational response');

    // 4. Test pitchModel with UTF-8 BOM + standard code fence
    axios.post = async () => ({
      data: {
        candidates: [{
          content: {
            parts: [{
              text: `\uFEFF\`\`\`json\n{\n  "elevatorPitch": "AutoPitch AI turns ideas into investor-ready decks in 60s."\n}\n\`\`\``
            }]
          }
        }]
      }
    });
    const { generatePitch } = require('../models/pitchModel');
    const pitchResult = await generatePitch(mockModelData);
    assert(pitchResult.elevatorPitch.includes('AutoPitch AI'));
    console.log('  ✅ [pitchModel] successfully handled UTF-8 BOM + markdown block');

    // 5. Test personasModel with markdown block and trailing commas
    axios.post = async () => ({
      data: {
        candidates: [{
          content: {
            parts: [{
              text: `\`\`\`json\n{\n  "personas": [\n    {\n      "name": "Sarah",\n      "age": "29",\n      "occupation": "Founder",\n      "goals": "Raise seed round",\n      "painPoints": "No design skills",\n      "techComfortLevel": "High",\n    },\n  ],\n}\n\`\`\``
            }]
          }
        }]
      }
    });
    const { generatePersonas } = require('../models/personasModel');
    const personasResult = await generatePersonas(mockModelData);
    assert.strictEqual(personasResult.personas.length, 1);
    assert.strictEqual(personasResult.personas[0].name, 'Sarah');
    console.log('  ✅ [personasModel] successfully handled personas array with nested trailing commas');

    // 6. Test competitorsModel with plain JSON
    axios.post = async () => ({
      data: {
        candidates: [{
          content: {
            parts: [{
              text: `{"competitors": [{"name": "PitchBob", "description": "Deck builder", "differentiator": "Faster"}]}`
            }]
          }
        }]
      }
    });
    const { generateCompetitors } = require('../models/competitorsModel');
    const competitorsResult = await generateCompetitors(mockModelData);
    assert.strictEqual(competitorsResult.competitors.length, 1);
    assert.strictEqual(competitorsResult.competitors[0].name, 'PitchBob');
    console.log('  ✅ [competitorsModel] successfully handled pristine JSON');

  } finally {
    axios.post = originalPost;
  }
}

testModelIntegration().then(() => {
  console.log('✅ Passed Test 9: All 6 model functions handle real-world variations cleanly');

  console.log('\n====================================================');
  console.log('🎉 ALL GEMINI JSON PARSER TESTS PASSED CLEANLY!');
  console.log('====================================================\n');
}).catch((err) => {
  console.error('\n❌ Test 9 failed:', err);
  process.exit(1);
});
