const assert = require('assert');
const path = require('path');

// Test 1: competitorController
{
  const modelPath = path.join(__dirname, '../models/competitorsModel.js');
  let capturedArg = null;
  require.cache[require.resolve(modelPath)] = {
    id: require.resolve(modelPath),
    filename: require.resolve(modelPath),
    loaded: true,
    exports: {
      generateCompetitors: async (data) => {
        capturedArg = data;
        return { competitors: [] };
      }
    }
  };

  const controllerPath = path.join(__dirname, '../controllers/competitorController.js');
  delete require.cache[require.resolve(controllerPath)];
  const { generateCompetitors: controller } = require(controllerPath);

  const testPayload = { startupName: 'CompTest', problem: 'P', solution: 'S' };
  let statusCode = null;

  const req = { body: testPayload };
  const res = {
    status: (code) => {
      statusCode = code;
      return { json: () => {} };
    }
  };

  controller(req, res).then(() => {
    assert.strictEqual(statusCode, 200);
    assert.deepStrictEqual(capturedArg, testPayload, 'competitorController must pass req.body directly to model');
    assert.notStrictEqual(capturedArg, '/competitors', 'competitorController must NOT pass endpoint string');
    console.log('✅ competitorController passed req.body directly to model');
  }).catch((err) => {
    console.error('❌ competitorController test FAILED:', err);
    process.exit(1);
  });
}

// Test 2: personaController
{
  const modelPath = path.join(__dirname, '../models/personasModel.js');
  let capturedArg = null;
  require.cache[require.resolve(modelPath)] = {
    id: require.resolve(modelPath),
    filename: require.resolve(modelPath),
    loaded: true,
    exports: {
      generatePersonas: async (data) => {
        capturedArg = data;
        return { personas: [] };
      }
    }
  };

  const controllerPath = path.join(__dirname, '../controllers/personaController.js');
  delete require.cache[require.resolve(controllerPath)];
  const { generatePersonas: controller } = require(controllerPath);

  const testPayload = { startupName: 'PersonaTest', industry: 'Fintech' };
  let statusCode = null;

  const req = { body: testPayload };
  const res = {
    status: (code) => {
      statusCode = code;
      return { json: () => {} };
    }
  };

  controller(req, res).then(() => {
    assert.strictEqual(statusCode, 200);
    assert.deepStrictEqual(capturedArg, testPayload, 'personaController must pass req.body directly to model');
    assert.notStrictEqual(capturedArg, '/personas', 'personaController must NOT pass endpoint string');
    console.log('✅ personaController passed req.body directly to model');
  }).catch((err) => {
    console.error('❌ personaController test FAILED:', err);
    process.exit(1);
  });
}

// Test 3: pitchController
{
  const modelPath = path.join(__dirname, '../models/pitchModel.js');
  let capturedArg = null;
  require.cache[require.resolve(modelPath)] = {
    id: require.resolve(modelPath),
    filename: require.resolve(modelPath),
    loaded: true,
    exports: {
      generatePitch: async (data) => {
        capturedArg = data;
        return { elevatorPitch: 'Test' };
      }
    }
  };

  const controllerPath = path.join(__dirname, '../controllers/pitchController.js');
  delete require.cache[require.resolve(controllerPath)];
  const { generatePitch: controller } = require(controllerPath);

  const testPayload = { startupName: 'PitchTest', solution: 'AI Pitch' };
  let statusCode = null;

  const req = { body: testPayload };
  const res = {
    status: (code) => {
      statusCode = code;
      return { json: () => {} };
    }
  };

  controller(req, res).then(() => {
    assert.strictEqual(statusCode, 200);
    assert.deepStrictEqual(capturedArg, testPayload, 'pitchController must pass req.body directly to model');
    assert.notStrictEqual(capturedArg, '/pitch', 'pitchController must NOT pass endpoint string');
    console.log('✅ pitchController passed req.body directly to model');
  }).catch((err) => {
    console.error('❌ pitchController test FAILED:', err);
    process.exit(1);
  });
}

// Test 4: revenueController
{
  const modelPath = path.join(__dirname, '../models/revenueModel.js');
  let capturedArg = null;
  require.cache[require.resolve(modelPath)] = {
    id: require.resolve(modelPath),
    filename: require.resolve(modelPath),
    loaded: true,
    exports: {
      generateRevenue: async (data) => {
        capturedArg = data;
        return { revenueStreams: 'SaaS' };
      }
    }
  };

  const controllerPath = path.join(__dirname, '../controllers/revenueController.js');
  delete require.cache[require.resolve(controllerPath)];
  const { generateRevenue: controller } = require(controllerPath);

  const testPayload = { startupName: 'RevTest', problem: 'Monetization' };
  let statusCode = null;

  const req = { body: testPayload };
  const res = {
    status: (code) => {
      statusCode = code;
      return { json: () => {} };
    }
  };

  controller(req, res).then(() => {
    assert.strictEqual(statusCode, 200);
    assert.deepStrictEqual(capturedArg, testPayload, 'revenueController must pass req.body directly to model');
    assert.notStrictEqual(capturedArg, '/revenue', 'revenueController must NOT pass endpoint string');
    console.log('✅ revenueController passed req.body directly to model');
  }).catch((err) => {
    console.error('❌ revenueController test FAILED:', err);
    process.exit(1);
  });
}
