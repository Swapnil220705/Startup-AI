# Startup-AI Project State

Single source of truth for the project lifecycle, architecture, progress, known issues, and future roadmap.

---

## 1. Project Overview

**Startup-AI** is an AI-powered SaaS tool tailored for early-stage entrepreneurs and founders. Given basic startup inputs (name, problem, solution, industry/domain, target audience, and USP), the application orchestrates parallel generative AI pipelines to automatically produce:
- A comprehensive 9-box **Lean Canvas**
- An **MVP Roadmap** with prioritized core features and launch timelines
- A **Revenue & Monetization Strategy** with realistic pricing models
- A competitive landscape benchmark (**Competitors Analysis**)
- Detailed target **User Personas**
- An investor-ready **Elevator Pitch** and presentation deck preview

---

## 2. Current Architecture

- **Frontend**: Single Page Application built with React 19 and Tailwind CSS. Navigation is managed via a custom lightweight pushState router (`src/utils/Router.js`). Form submissions in `IdeaInputPage.js` purge stale localStorage keys and dispatch 6 parallel Axios POST requests via `Promise.allSettled` to the backend. Successful modules are stored selectively in `localStorage` without fake/fallback data. If any module fails, `generationErrors` metadata is stored and a prominent, dismissible notice banner informs the user on `DashboardPage.js`. If all 6 modules fail, the user is kept on `/start` with actionable error feedback.
- **Backend**: Express 5.1.0 server listening on port 4000 (`backend/index.js`), exposing 6 modular REST routes under `/api/*`. Routes map to controllers in `backend/controllers/`, which validate inputs and delegate prompt engineering and REST API calls to `backend/models/*.js`. Errors are normalized using `backend/utils/apiError.js`, which returns structured JSON (`{ success: false, error: { code, message } }`), preserving upstream status codes (400, 429, 503, 500) while strictly redacting secrets and suppressing stack traces.
- **AI Integration**: Backend models route requests through `backend/services/geminiClient.js` targeting `models/gemini-3.8-flash:generateContent`. Features in-process concurrency limiting (max 2 active requests), 30s request timeouts, exponential backoff with proportional jitter, `Retry-After` header extraction, and transient error recovery. Outputs are cleaned and parsed through `backend/utils/jsonParser.js`.
- **Storage**: Client-side browser `localStorage` (database scheduled for Phase 3).

---

## 3. Current Technology Stack

| Layer | Technologies Verified in Repo |
|---|---|
| **Runtime** | Node.js (v22.14.0) |
| **Backend Framework** | Express 5.1.0 |
| **Backend Libraries** | Axios 1.10.0, Dotenv 17.0.0, Cors 2.8.5 |
| **Backend Testing** | Zero-dependency Node.js test suite (8 test suites in `backend/tests/`) |
| **Frontend Framework** | React 19.1.0, React DOM 19.1.0 |
| **Frontend Styling** | Tailwind CSS 3.4.3, PostCSS 8.5.6, Autoprefixer 10.4.21 |
| **Frontend UI / Icons** | Lucide React 0.525.0, Framer Motion 12.19.3, react-hot-toast 2.5.2 |
| **Frontend Routing** | Custom HTML5 History Router (`src/utils/Router.js`) |
| **AI Provider** | Google AI Studio REST API (`gemini-3.8-flash`) |

---

## 4. Completed Features

- [x] **Landing Page** (`/`): Responsive hero, feature showcase, testimonials carousel, and dynamic light/dark mode theme support.
- [x] **Idea Intake Workflow** (`/start`): Multi-field form capturing startup name, domain, problem, solution, audience, and USP.
- [x] **Parallel Generation Dispatch**: Simultaneous dispatch of 6 generation requests to Express endpoints with `Promise.allSettled`.
- [x] **Partial Generation Error Handling**: Graceful degradation when 1-5 modules fail; preserves successful modules, blocks fake fallback data, displays available/unavailable sections in dashboard alert banner, and halts navigation when 0 modules succeed.
- [x] **Stale Data Protection**: Explicit purging of stale generated localStorage keys before launching new generation runs.
- [x] **Interactive Dashboard** (`/dashboard`): Dynamic tabbed views for Overview, Lean Canvas, MVP, Revenue, Competitors, Personas, and Export with defensive empty-state rendering for missing modules.
- [x] **Pitch Deck Preview** (`/pitch-preview`): Slide presentation deck rendering generated pitch data with defensive fallback handling.
- [x] **Light / Dark Mode**: Global theme management via `ThemeContext.js` and HTML root `dark` class toggling.

---

## 5. Known Issues (Deferred to Subsequent Phases)

1. **Arbitrary Plan Loading / Reopening into Dashboard (Chunk 3.4)**:
   - Plans can be generated, persisted, and browsed via `/my-plans`. The arbitrary loading of a past persisted plan into the active dashboard and local state is scheduled for Chunk 3.4.
2. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules` (custom test suites in `backend/tests/` verify both frontend and backend functionality).
3. **Upstream Gemini Free-Tier Quota & Demand Restrictions (429/503)**:
   - When generating all 6 modules simultaneously under free-tier quota (5 RPM), upstream 429 quota or 503 service overload can exhaust retries; Chunk 2.3 handles this by generating available modules and reporting unavailable ones cleanly.

---

## 6. Current Status

- **Phase**: Phase 3 — Backend Database Persistence
- **Current Chunk**: Chunk 3.3 — Plan History / My Plans
- **Status**: Completed
- **Phase 3 Status**: IN PROGRESS (Chunks 3.1, 3.2, 3.3 complete, Chunk 3.4 next)
- **Next Planned Chunk**: Chunk 3.4 — Plan Detail / Loading / Re-opening

---

## 7. Completed in Current Chunk (Chunk 3.3)

- [x] Inspected existing database listing API (`GET /api/plans`) and verified contract:
  - Returns `{ success: true, data: { plans, total, limit, offset } }`.
  - Excludes heavy JSON module trees (`leanCanvas`, `mvp`, etc.) in the list query to keep payload lightweight and performant.
  - Added deterministic tie-breaking via `ORDER BY created_at DESC, rowid DESC` in `planService.js`.
- [x] Replaced static mock `HistoryPage.js` with fully functional API-backed `HistoryPage.js`:
  - Fetches plans via `GET /api/plans?limit=6&offset=0` on mount.
  - Renders responsive plan card grid (startup name, industry tag, created date, problem snippet, status badge).
  - Implements color-coded generation status badges: Completed (green), Partial (amber), Failed (rose).
  - Added clear loading indicator with spinning animation.
  - Added helpful error state with "Retry" action button.
  - Added empty state illustration with CTA navigating to `/start` ("Create Your First Plan").
  - Implemented pagination controls (Previous/Next, page counts, bounds checking).
  - Established "Open Plan" action navigating to `/dashboard` as the navigation path for Chunk 3.4.
  - Removed dead "Edit" button from mock design.
  - Supports both dark and light mode seamlessly.
- [x] Restored `/my-plans` canonical routing:
  - Enabled `case '/my-plans':` in `src/App.js`.
  - Added "My Plans" navigation links to both desktop and mobile navigation in `src/components/Header.js`.
  - Updated `backend/tests/frontendRoutes.test.js` to assert `/my-plans` is registered, active, and reachable.
- [x] Created comprehensive test suite in `backend/tests/planHistory.test.js` (12 tests):
  - Test 1: Empty database returns empty list structure.
  - Test 2: Persisted plans returned with lightweight metadata (heavy JSON modules excluded).
  - Test 3: Newest-first ordering verified across multiple plans.
  - Test 4: Pagination limit, offset, and malformed value safety verified.
  - Test 5: Partial plan correctly listed with partial status.
  - Test 6: HTTP `listPlansController` conforms to API response contract.
  - Test 7: Database integrity preserved across list operations.
  - Test 8: Empty state conditions evaluated accurately.
  - Test 9: Error state and retry invocation verified.
  - Test 10: Pagination page counts and button disabling verified.
  - Test 11: Status badge mapping correctly categorizes plans.
  - Test 12: Open plan navigation contract confirmed.
- [x] Added `planHistory.test.js` to `backend/package.json` test script.
- [x] Full regression verification: all 11 backend test suites pass with 0 errors, backend syntax check passes, and frontend production build succeeds cleanly.

---

## 8. Next Planned Phase & Chunk

**Phase 3: Backend Database Persistence**
- **Chunk 3.4 — Plan Detail / Loading / Re-opening**:
  - Selecting a persisted plan from history.
  - Fetching complete plan details via `GET /api/plans/:id`.
  - Populating the dashboard and session state with the loaded persisted plan.
  - Synchronizing `currentPlanId` and session data cleanly.

---

## 9. Future Roadmap

- **Phase 1: Core Backend & Data Flow Fixes (COMPLETED - Commit `c8a625a`)**
  - Chunk 0.1: Baseline Audit + Project Documentation + Gemini Model Upgrade (Completed - `b531f3f`)
  - Chunk 1.1: Fix Critical Backend Controller Argument Bugs (Completed - `02a754f`)
  - Chunk 1.2: Fix USP Payload Field Mismatch & Standardize Request Schemas (Completed - `b22a6f7`)
  - Chunk 1.3: Fix MVP localStorage Data Truncation (Completed - `5a06ab5`)
  - Chunk 1.4: Fix Frontend Routing Inconsistencies (Completed - `26e1d2d`)
  - Chunk 1.5: End-to-End Generation Testing (Completed - `c8a625a`)
- **Phase 2: Product Reliability (COMPLETED - Commit `52ecf78`)**
  - Chunk 2.1: Robust Gemini JSON Parsing (Completed - `e0d7f83`)
  - Chunk 2.2: Rate Limiting & Retry/Backoff Strategy (Completed - `e87a12f`)
  - Chunk 2.3: Clean API / Partial Generation Errors (Completed - `52ecf78`)
- **Phase 3: Backend Database Persistence (IN PROGRESS)**
  - Chunk 3.1: Persistence Architecture & Database Foundation (Completed - `f68b6a4`)
  - Chunk 3.2: Connect Frontend Generation Flow to Persistence API (Completed - `d50406a`)
  - Chunk 3.3: Plan History / My Plans (Completed)
  - Chunk 3.4: Plan Detail / Loading / Re-opening (Next)
- **Phase 4: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 5: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `d50406a` (Milestone Chunk 3.2)
- **Phase 1 Status**: COMPLETED
- **Phase 2 Status**: COMPLETED
- **Phase 3 Status**: IN PROGRESS (Chunks 3.1, 3.2, 3.3 Completed)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c index.js controllers/*.js models/*.js routes/*.js services/*.js utils/*.js db/*.js tests/*.js`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000 with `Database: Connected & Migrated ✅`. |
| **Backend Test Suite (11 suites)** | PASS | `npm test` runs all 11 test files cleanly: `controllers.test.js`, `uspDataFlow.test.js`, `mvpStorage.test.js`, `frontendRoutes.test.js`, `e2eGenerationFlow.test.js`, `jsonParser.test.js`, `geminiClient.test.js`, `partialGeneration.test.js`, `persistence.test.js`, `frontendPersistenceIntegration.test.js`, `planHistory.test.js`. |
| **Plan History / My Plans Test Suite** | PASS | `backend/tests/planHistory.test.js`: 12 comprehensive tests covering empty database, lightweight summary metadata, newest-first ordering with tie-breaking, pagination limits/offsets, partial/failed status preservation, controller HTTP contracts, empty states, error handling/retry, pagination calculations, status badge mapping, and open plan routing contract. |
| **Frontend Persistence Integration Suite** | PASS | `backend/tests/frontendPersistenceIntegration.test.js`: 9 test categories covering 6/6 and partial generation persistence, 0/6 abort, persistence failure recovery, stale key cleanup, 404 handling, complete round-trip, and double-submit protection. |
| **Plan Persistence Test Suite** | PASS | `backend/tests/persistence.test.js`: 10 comprehensive tests verifying in-memory initialization, migrations, CRUD, deep nested JSON preservation, pagination, ordering, 404/400 errors, partial plan persistence, and test DB isolation. |
| **Partial Generation & Error Suite** | PASS | `backend/tests/partialGeneration.test.js`: 14 tests verifying 200 raw success contracts, 400/429/503/500 error mapping, secret scrubbing, 6/6, 5/6, multiple failure, 0/6 flows, stale data purging, and dashboard null-safety. |
| **Gemini Client & Retry Suite** | PASS | `backend/tests/geminiClient.test.js`: 13 test categories covering 429/503 retries, network recovery, fail-fast on 400/401/403, exponential backoff, jitter, limiter, and model integration. |
| **Robust JSON Parser** | PASS | `backend/tests/jsonParser.test.js`: 9 test suites covering code blocks, conversational wrappers, unclosed fences, trailing commas, BOMs, error handling, and 6 model integrations. |
| **USP Prompt Verification** | PASS | Tested all 6 models in `uspDataFlow.test.js`: prompt strings contain `data.usp` without undefined/fallback. |
| **MVP Storage Verification** | PASS | `backend/tests/mvpStorage.test.js`: verifies complete MVP object retention, reproduces regression, and tests consumers + legacy fallback. |
| **Frontend Routing Verification** | PASS | `backend/tests/frontendRoutes.test.js`: 100% of active `navigate()` calls map to canonical routes; verified `/my-plans` active canonical registration and reachability. |
| **End-to-End Generation Flow** | PASS | `backend/tests/e2eGenerationFlow.test.js`: deterministic simulation of end-to-end chain from form input to Dashboard/PitchPreview consumption passes with 0 errors. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.472fd210.js`). |


---

## 12. Important Development Rules

- Do not hallucinate.
- Inspect before modifying.
- Do not modify unrelated functionality.
- Do not introduce unnecessary dependencies.
- Verify every change.
- Update `PROJECT_STATE.md` after every completed chunk.
- Review git diff before committing.
- Never commit unverified or failing changes.
- Commit each completed chunk separately.
- Never expose secrets.
- If uncertain, stop and report instead of guessing.
