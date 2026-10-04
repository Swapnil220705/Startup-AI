const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('--- Running Frontend Routing Verification Tests ---');

const srcDir = path.join(__dirname, '../../frontend/src');

// 1. Extract registered canonical routes from frontend/src/App.js
const appPath = path.join(srcDir, 'App.js');
const appContent = fs.readFileSync(appPath, 'utf8');

// Match active (non-commented) "case '...':"
const caseRegex = /^\s*case\s+['"]([^'"]+)['"]\s*:/gm;
const registeredRoutes = [];
let match;
while ((match = caseRegex.exec(appContent)) !== null) {
  registeredRoutes.push(match[1]);
}

console.log('✅ Registered routes discovered in App.js:', registeredRoutes);
const canonicalRoutes = new Set(registeredRoutes);
assert(canonicalRoutes.has('/'), 'Route "/" must be registered');
assert(canonicalRoutes.has('/start'), 'Route "/start" must be registered');
assert(canonicalRoutes.has('/dashboard'), 'Route "/dashboard" must be registered');
assert(canonicalRoutes.has('/pitch-preview'), 'Route "/pitch-preview" must be registered');
assert(!canonicalRoutes.has('/input'), 'Route "/input" must NOT be registered as canonical');
assert(!canonicalRoutes.has('/canvas'), 'Route "/canvas" must NOT be registered as canonical');
assert(canonicalRoutes.has('/my-plans'), 'Route "/my-plans" must be registered as active canonical');

// 2. Scan all JS files in frontend/src/pages and frontend/src/components
const filesToScan = [];
function collectFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.jsx'))) {
      filesToScan.push(fullPath);
    }
  }
}

collectFiles(path.join(srcDir, 'pages'));
collectFiles(path.join(srcDir, 'components'));

const navigateRegex = /navigate\(\s*['"]([^'"]+)['"]\s*\)/g;
const referencedRoutes = new Set();
const routeUsage = [];

for (const filePath of filesToScan) {
  const relPath = path.relative(srcDir, filePath);
  const content = fs.readFileSync(filePath, 'utf8');

  // Remove commented lines to only check active code
  const lines = content.split('\n');
  lines.forEach((line, lineIndex) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('{/*') || trimmed.startsWith('/*') || trimmed.startsWith('*')) {
      return;
    }
    let navMatch;
    const lineRegex = /navigate\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((navMatch = lineRegex.exec(line)) !== null) {
      const target = navMatch[1];
      referencedRoutes.add(target);
      routeUsage.push({ file: relPath, line: lineIndex + 1, target });
    }
  });
}

console.log(`\nFound ${routeUsage.length} active navigate() calls across ${filesToScan.length} files:`);
for (const usage of routeUsage) {
  console.log(`  - [${usage.file}:${usage.line}] -> "${usage.target}"`);
}

// 3. Assert all active navigation targets point to registered canonical routes
for (const usage of routeUsage) {
  assert(
    canonicalRoutes.has(usage.target),
    `Invalid route reference "${usage.target}" in ${usage.file}:${usage.line} is not registered in App.js`
  );
}
console.log('✅ All active navigation elements point exclusively to canonical routes');

// 4. Assert non-existent paths are never used
assert(!referencedRoutes.has('/input'), 'Active navigate() to "/input" must not exist (must use "/start")');
assert(!referencedRoutes.has('/canvas'), 'Active navigate() to "/canvas" must not exist');
assert(referencedRoutes.has('/my-plans'), 'Active navigate() to "/my-plans" must exist');
console.log('✅ Verified: No references to /input or /canvas; active reference to /my-plans confirmed');

// 5. Assert all registered routes are reachable via navigation
for (const route of registeredRoutes) {
  assert(
    referencedRoutes.has(route),
    `Canonical route "${route}" must be reachable via at least one navigate() call`
  );
}
console.log('✅ Verified: Every canonical route is reachable through application navigation');

// 6. Test Router.js history behavior simulation
{
  const routerPath = path.join(srcDir, 'utils/Router.js');
  const routerContent = fs.readFileSync(routerPath, 'utf8');

  assert(routerContent.includes('window.history.pushState'), 'Router.js must use window.history.pushState');
  assert(routerContent.includes("addEventListener('popstate'"), 'Router.js must listen for popstate');
  assert(routerContent.includes("removeEventListener('popstate'"), 'Router.js must clean up popstate listener');
  assert(routerContent.includes('currentPath'), 'Router.js must track and provide currentPath');
  console.log('✅ Router.js implementation correctly handles pushState, popstate, and path tracking');
}

// 7. Verify specific empty-state button corrections
{
  const dashboardPath = path.join(srcDir, 'pages/DashboardPage.js');
  const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');
  assert(
    !dashboardContent.includes("navigate('/input')"),
    'DashboardPage empty state must not navigate to /input'
  );
  assert(
    dashboardContent.includes("navigate('/start')"),
    'DashboardPage empty state must navigate to /start'
  );

  const pitchPath = path.join(srcDir, 'pages/PitchPreviewPage.js');
  const pitchContent = fs.readFileSync(pitchPath, 'utf8');
  assert(
    !pitchContent.includes("navigate('/input')"),
    'PitchPreviewPage empty state must not navigate to /input'
  );
  assert(
    pitchContent.includes("navigate('/start')"),
    'PitchPreviewPage empty state must navigate to /start'
  );

  console.log('✅ Empty state buttons in DashboardPage and PitchPreviewPage correctly navigate to /start');
}

// 8. Verify Header.js navigation links
{
  const headerPath = path.join(srcDir, 'components/Header.js');
  const headerContent = fs.readFileSync(headerPath, 'utf8');

  // Verify desktop navigation is active for registered routes
  assert(
    headerContent.includes("navigate('/dashboard')"),
    'Header.js must allow navigation to /dashboard'
  );
  assert(
    headerContent.includes("navigate('/pitch-preview')"),
    'Header.js must allow navigation to /pitch-preview'
  );
  assert(
    headerContent.includes("navigate('/start')"),
    'Header.js Get Started button must navigate to /start'
  );
  assert(
    headerContent.includes("navigate('/')"),
    'Header.js logo button must navigate to /'
  );
  assert(
    headerContent.includes("navigate('/my-plans')"),
    'Header.js must allow navigation to /my-plans'
  );

  console.log('✅ Header.js provides verified navigation between Landing, Start, Dashboard, Pitch Deck, and My Plans');
}

console.log('\n🎉 All Frontend Routing Verification Tests PASSED successfully!\n');
