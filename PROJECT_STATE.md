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

1. **Frontend Plan History / Saved Plans UI**:
   - Plans are now persisted in the SQLite database upon generation and verified by `currentPlanId`. The full UI for browsing, managing, and reloading historical plans is scheduled for Chunk 3.3.
2. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules` (custom test suites in `backend/tests/` verify both frontend and backend functionality).
3. **Upstream Gemini Free-Tier Quota & Demand Restrictions (429/503)**:
   - When generating all 6 modules simultaneously under free-tier quota (5 RPM), upstream 429 quota or 503 service overload can exhaust retries; Chunk 2.3 handles this by generating available modules and reporting unavailable ones cleanly.

---

## 6. Current Status

- **Phase**: Phase 3 — Backend Database Persistence
- **Current Chunk**: Chunk 3.2 — Connect Frontend Generation Flow to Persistence API
- **Status**: Completed
- **Phase 3 Status**: IN PROGRESS (Chunk 3.1 & 3.2 complete, Chunk 3.3 next)
- **Next Planned Chunk**: Chunk 3.3 — Plan History / My Plans UI

---

## 7. Completed in Current Chunk (Chunk 3.2)

- [x] Inspected end-to-end frontend generation flow, storage keys, navigation, and persistence API contracts.
- [x] Connected `IdeaInputPage.js` to the persistence API (`POST /api/plans`):
  - After generation resolves via `Promise.allSettled`, maps input details and available module responses into the persistence payload without fabricating missing data.
  - Automatically posts payload to `POST /api/plans`.
  - Captures server-generated UUID v4 plan ID and stores it in `localStorage.currentPlanId`.
  - Sets `localStorage.planPersistenceStatus = 'saved'` on success.
  - If persistence fails (e.g. database/network error), preserves all local generated module data in `localStorage`, removes `currentPlanId` (never storing fake IDs), flags `planPersistenceStatus = 'save_failed'`, and still navigates to `/dashboard` so the user's generated work is not lost.
  - Added double-submit protection: guarded `handleSubmit` with `if (isLoading) return;` and disabled the CTA button with dynamic loading indicator while requests are active.
  - Updated stale key purging: wipes all 9 keys (`leanCanvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`, `generationErrors`, `currentPlanId`, `planPersistenceStatus`) before starting new generations.
- [x] Enhanced `DashboardPage.js` with persistence verification:
  - Tracks `currentPlanId` and `persistenceStatus` state.
  - If a `currentPlanId` is present, asynchronously verifies existence against the backend via `GET /api/plans/:id`.
  - Added dynamic header pill: displays "Saved to Database" with plan ID tooltip if saved, or "Session Only (Not Saved to DB)" if save failed.
  - Added non-intrusive warning notice banner if database persistence failed, informing the user that their plan is active in the current session.
  - Preserved defensive rendering and fallback cards across all dashboard tabs and `PitchPreviewPage.js`.
- [x] Created comprehensive test suite in `backend/tests/frontendPersistenceIntegration.test.js`:
  - Test A: Complete generation (6/6) persists plan and sets `currentPlanId`.
  - Test B: Partial generation (e.g. 4/6) persists only successful modules with `generationStatus = 'partial'` and `generationErrors`.
  - Test C: Zero generation success (0/6) halts flow without calling `POST /api/plans` or creating an ID.
  - Test D: Persistence failure after complete generation preserves local data, stores no fake plan ID, and sets status to `save_failed`.
  - Test E: Persistence failure after partial generation preserves available local data and records `save_failed`.
  - Test F: Stale plan ID cleanup removes old IDs before new generation.
  - Test G: `GET /api/plans/:id` returns 200 for existing plan and 404 for missing plan.
  - Test H: Full persisted plan round-trip preserves all 6 nested module data trees identically.
  - Test I: Duplicate submission is blocked cleanly while loading is in progress.
- [x] Updated `backend/package.json` test script to include `frontendPersistenceIntegration.test.js`.
- [x] Full regression verification: all 10 backend test suites pass with 0 errors, backend syntax check passes, and frontend production build succeeds cleanly.

---

## 8. Next Planned Phase & Chunk

**Phase 3: Backend Database Persistence**
- **Chunk 3.3 — Plan History / My Plans UI**: Add history view allowing users to browse previously generated plans and reload them into the dashboard.

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
  - Chunk 3.2: Connect Frontend Generation Flow to Persistence API (Completed)
  - Chunk 3.3: Plan History UI & Plan Loading (Next)
- **Phase 4: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 5: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `f68b6a4` (Milestone Chunk 3.1)
- **Phase 1 Status**: COMPLETED
- **Phase 2 Status**: COMPLETED
- **Phase 3 Status**: IN PROGRESS (Chunk 3.1 & 3.2 Completed)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c index.js controllers/*.js models/*.js routes/*.js services/*.js utils/*.js db/*.js tests/*.js`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000 with `Database: Connected & Migrated ✅`. |
| **Backend Test Suite (10 suites)** | PASS | `npm test` runs all 10 test files cleanly: `controllers.test.js`, `uspDataFlow.test.js`, `mvpStorage.test.js`, `frontendRoutes.test.js`, `e2eGenerationFlow.test.js`, `jsonParser.test.js`, `geminiClient.test.js`, `partialGeneration.test.js`, `persistence.test.js`, `frontendPersistenceIntegration.test.js`. |
| **Frontend Persistence Integration Suite** | PASS | `backend/tests/frontendPersistenceIntegration.test.js`: 9 test categories covering 6/6 and partial generation persistence, 0/6 abort, persistence failure recovery, stale key cleanup, 404 handling, complete round-trip, and double-submit protection. |
| **Plan Persistence Test Suite** | PASS | `backend/tests/persistence.test.js`: 10 comprehensive tests verifying in-memory initialization, migrations, CRUD, deep nested JSON preservation, pagination, ordering, 404/400 errors, partial plan persistence, and test DB isolation. |
| **Partial Generation & Error Suite** | PASS | `backend/tests/partialGeneration.test.js`: 14 tests verifying 200 raw success contracts, 400/429/503/500 error mapping, secret scrubbing, 6/6, 5/6, multiple failure, 0/6 flows, stale data purging, and dashboard null-safety. |
| **Gemini Client & Retry Suite** | PASS | `backend/tests/geminiClient.test.js`: 13 test categories covering 429/503 retries, network recovery, fail-fast on 400/401/403, exponential backoff, jitter, limiter, and model integration. |
| **Robust JSON Parser** | PASS | `backend/tests/jsonParser.test.js`: 9 test suites covering code blocks, conversational wrappers, unclosed fences, trailing commas, BOMs, error handling, and 6 model integrations. |
| **USP Prompt Verification** | PASS | Tested all 6 models in `uspDataFlow.test.js`: prompt strings contain `data.usp` without undefined/fallback. |
| **MVP Storage Verification** | PASS | `backend/tests/mvpStorage.test.js`: verifies complete MVP object retention, reproduces regression, and tests consumers + legacy fallback. |
| **Frontend Routing Verification** | PASS | `backend/tests/frontendRoutes.test.js`: 100% of active `navigate()` calls map to canonical routes; no stale `/input`, `/canvas`, or `/my-plans` references. |
| **End-to-End Generation Flow** | PASS | `backend/tests/e2eGenerationFlow.test.js`: deterministic simulation of end-to-end chain from form input to Dashboard/PitchPreview consumption passes with 0 errors. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.1dd3b70e.js`). |


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
