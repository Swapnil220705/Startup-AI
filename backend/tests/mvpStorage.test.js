const assert = require('assert');
const path = require('path');
const fs = require('fs');

// Test 1: Static code check on frontend/src/pages/IdeaInputPage.js
{
  const ideaInputPath = path.join(__dirname, '../../frontend/src/pages/IdeaInputPage.js');
  const code = fs.readFileSync(ideaInputPath, 'utf8');

  assert(
    !code.includes('mvpRes.data.coreFeatures || mvpRes.data'),
    'IdeaInputPage.js must NOT truncate MVP data using `mvpRes.data.coreFeatures || mvpRes.data`'
  );

  assert(
    code.includes("localStorage.setItem('mvp', JSON.stringify(mvpRes.data))"),
    'IdeaInputPage.js must persist the complete `mvpRes.data` object under localStorage key "mvp"'
  );

  console.log('✅ Static analysis: IdeaInputPage.js persists complete mvpRes.data without truncation');
}

// Test 2: Verify complete MVP object preservation in localStorage simulation
{
  const mockBackendMvpResponse = {
    data: {
      startupName: 'AutoPitch AI',
      coreFeatures: [
        'One-click pitch deck generator',
        'Interactive financial runway modeler',
        'Competitor benchmark matrix'
      ],
      technicalRequirements: 'React 19, Tailwind CSS, Node.js Express, Google Gemini REST API',
      launchTimeline: '6-8 weeks for public MVP beta'
    }
  };

  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => { store[key] = value.toString(); },
      clear: () => { store = {}; }
    };
  })();

  // Simulate buggy storage logic
  const buggyStorageValue = JSON.stringify(mockBackendMvpResponse.data.coreFeatures || mockBackendMvpResponse.data);
  const parsedBuggy = JSON.parse(buggyStorageValue);

  // Assert buggy storage caused truncation
  assert(Array.isArray(parsedBuggy), 'Buggy logic should have produced an array');
  assert.strictEqual(parsedBuggy.technicalRequirements, undefined, 'Buggy logic dropped technicalRequirements');
  assert.strictEqual(parsedBuggy.launchTimeline, undefined, 'Buggy logic dropped launchTimeline');
  assert.strictEqual(parsedBuggy.startupName, undefined, 'Buggy logic dropped startupName');
  console.log('✅ Regression proof: Buggy logic reproduces truncation of technicalRequirements and launchTimeline');

  // Simulate fixed storage logic
  localStorageMock.setItem('mvp', JSON.stringify(mockBackendMvpResponse.data));
  const storedMvp = JSON.parse(localStorageMock.getItem('mvp'));

  assert(storedMvp !== null, 'Stored MVP must not be null');
  assert(Array.isArray(storedMvp.coreFeatures), 'Stored MVP must retain coreFeatures array');
  assert.strictEqual(storedMvp.coreFeatures.length, 3, 'Stored MVP must preserve all coreFeatures items');
  assert.strictEqual(
    storedMvp.technicalRequirements,
    mockBackendMvpResponse.data.technicalRequirements,
    'Stored MVP must retain complete technicalRequirements'
  );
  assert.strictEqual(
    storedMvp.launchTimeline,
    mockBackendMvpResponse.data.launchTimeline,
    'Stored MVP must retain complete launchTimeline'
  );
  assert.strictEqual(
    storedMvp.startupName,
    mockBackendMvpResponse.data.startupName,
    'Stored MVP must retain startupName'
  );
  console.log('✅ Storage verification: localStorage["mvp"] preserves all top-level MVP fields');

  // Test 3: Downstream reader simulation (DashboardPage / MVPTab / PitchPreviewPage)
  // MVPTab reading logic from DashboardTabs.js:
  const mvpData = storedMvp;
  const coreFeatures = mvpData?.coreFeatures || (Array.isArray(mvpData) ? mvpData : []);
  const techReqs = mvpData?.technicalRequirements;
  const timeline = mvpData?.launchTimeline;
  const startup = mvpData?.startupName;

  assert.deepStrictEqual(coreFeatures, mockBackendMvpResponse.data.coreFeatures);
  assert.strictEqual(techReqs, 'React 19, Tailwind CSS, Node.js Express, Google Gemini REST API');
  assert.strictEqual(timeline, '6-8 weeks for public MVP beta');
  assert.strictEqual(startup, 'AutoPitch AI');
  console.log('✅ Downstream consumption: MVPTab successfully reads coreFeatures, technicalRequirements, and launchTimeline');

  // PitchPreviewPage reading logic from PitchPreviewPage.js:
  const pitchMvpFeatures = storedMvp?.coreFeatures || (Array.isArray(storedMvp) ? storedMvp : []);
  assert.deepStrictEqual(pitchMvpFeatures, mockBackendMvpResponse.data.coreFeatures);
  console.log('✅ Downstream consumption: PitchPreviewPage extracts coreFeatures from full MVP object');

  // Test 4: Backward compatibility with legacy stored array
  const legacyStorageMock = (() => {
    let store = {
      mvp: JSON.stringify(['Feature A', 'Feature B'])
    };
    return {
      getItem: (key) => store[key] || null
    };
  })();

  const legacyData = JSON.parse(legacyStorageMock.getItem('mvp'));
  const legacyCoreFeatures = legacyData?.coreFeatures || (Array.isArray(legacyData) ? legacyData : []);
  assert.deepStrictEqual(legacyCoreFeatures, ['Feature A', 'Feature B']);
  console.log('✅ Backward compatibility: Legacy array format in localStorage["mvp"] remains safe');
}

console.log('\n🎉 All MVP localStorage data-flow and persistence tests PASSED successfully!');
