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

1. **Absence of Persistent Database Storage**:
   - Plans are only stored in the user's browser `localStorage`. Clearing cache or switching devices leads to permanent data loss (scheduled for Phase 3).
2. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules` (custom test suites in `backend/tests/` verify both frontend and backend functionality).
3. **Upstream Gemini Free-Tier Quota & Demand Restrictions (429/503)**:
   - When generating all 6 modules simultaneously under free-tier quota (5 RPM), upstream 429 quota or 503 service overload can exhaust retries; Chunk 2.3 handles this by generating available modules and reporting unavailable ones cleanly.

---

## 6. Current Status

- **Phase**: Phase 2 — Product Reliability
- **Current Chunk**: Chunk 2.3 — Clean API / Partial Generation Errors
- **Status**: Completed
- **Phase 2 Status**: COMPLETED (All chunks 2.1, 2.2, 2.3 verified and complete)
- **Next Planned Phase**: Phase 3 — Backend Database Persistence (User Accounts & Plan History)

---

## 7. Completed in Current Chunk (Chunk 2.3)

- [x] Inspected existing error flow across frontend (`IdeaInputPage.js`, `DashboardPage.js`, `PitchPreviewPage.js`, `DashboardTabs.js`) and backend (all 6 controllers, models, `geminiClient.js`, routes).
- [x] Established standardized API error response utility in `backend/utils/apiError.js`:
  - Uniform error shape: `{ "success": false, "error": { "code": "...", "message": "..." } }`.
  - Machine-readable codes: `INVALID_INPUT` (400), `RATE_LIMIT_EXCEEDED` (429), `UPSTREAM_UNAVAILABLE` (503), `GENERATION_FAILED` (500).
  - Preserves raw unwrapped success contract (`res.status(200).json(aiResponse)`), ensuring complete backwards compatibility with existing frontend consumers.
  - Redacts sensitive secrets (`GEMINI_API_KEY`, Bearer tokens) and suppresses internal stack dumps.
- [x] Updated all 6 backend models (`leanCanvas.js`, `mvpGenerator.js`, `revenueModel.js`, `pitchModel.js`, `personasModel.js`, `competitorsModel.js`):
  - Preserved upstream status codes (`error.response?.status`) and network error codes (`error.code`) on thrown model errors.
- [x] Updated all 6 backend controllers (`leanCanvasController.js`, `mvpController.js`, `revenueController.js`, `pitchController.js`, `personaController.js`, `competitorController.js`):
  - Validated input parameters (requires `startupName`), returning HTTP 400 `INVALID_INPUT` if missing.
  - Routed caught errors through `sendApiError(res, error, defaultMessage)` for uniform HTTP status and error responses.
- [x] Refactored `frontend/src/pages/IdeaInputPage.js`:
  - Replaced brittle `Promise.all` with `Promise.allSettled`.
  - Implemented proactive purging of stale generation keys (`leanCanvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`, `generationErrors`) before dispatching new generation.
  - If 6/6 succeed: saves all 6 modules, removes `generationErrors`, navigates to `/dashboard`.
  - If 1-5 succeed: saves only fulfilled modules, does NOT fabricate fake fallback data, saves `generationErrors` metadata, navigates to `/dashboard`.
  - If 0/6 succeed: aborts navigation, alerts user with detailed failure reasons, leaves user on `/start` ready to retry.
- [x] Enhanced `frontend/src/pages/DashboardPage.js`:
  - Added dismissible partial generation notification banner showing available vs unavailable sections.
  - Updated `getTabByStatus` to rigorously check that data exists before marking tabs as ready.
  - Dynamically calculates completed sections percentage rather than hardcoded 95%.
- [x] Hardened `frontend/src/components/DashboardTabs.js`:
  - Added defensive `hasMvpData` check and fallback empty state in `MVPTab` matching `LeanCanvasTab`, `RevenueTab`, `CompetitorsTab`, and `PersonasTab`.
- [x] Created comprehensive test suite in `backend/tests/partialGeneration.test.js`:
  - Test 1: Successful controller responses return HTTP 200 with raw module data.
  - Test 2: Input validation returns HTTP 400 with `INVALID_INPUT`.
  - Test 3: Model 429 quota failure returns HTTP 429 with `RATE_LIMIT_EXCEEDED`.
  - Test 4: Model 503 / timeout returns HTTP 503 with `UPSTREAM_UNAVAILABLE`.
  - Test 5: Generic model failure returns HTTP 500 with `GENERATION_FAILED`.
  - Test 6: Error responses never expose API secrets or prompts.
  - Test 7: 6/6 success flow persists all 6 modules, clears errors, and navigates.
  - Test 8: 5/6 partial generation persists 5 modules, stores no fake data for failed, records `generationErrors`, and navigates.
  - Test 9: Multiple failed modules correctly partitioned.
  - Test 10: 0/6 failures aborts navigation and stores no fake data.
  - Test 11: Stale localStorage data purged cleanly before new generation.
  - Test 12: All dashboard components and pages evaluate null states safely without crashing.
  - Test 13: Full MVP object preserved without truncation regression (Chunk 1.3).
  - Test 14: Canonical routing remains intact regression (Chunk 1.4).
- [x] Updated `backend/package.json` test script to include `partialGeneration.test.js`.
- [x] Full regression verification: all 8 backend test suites pass with 0 errors, backend syntax check passes, and frontend production build succeeds cleanly.

---

## 8. Next Planned Phase & Chunk

**Phase 3: Backend Database Persistence**
- **Chunk 3.1 — Database Setup & User / Plan Schemas**: Add persistent database storage for generated business plans and user sessions so plans are not lost on browser cache clearing.

---

## 9. Future Roadmap

- **Phase 1: Core Backend & Data Flow Fixes (COMPLETED - Commit `c8a625a`)**
  - Chunk 0.1: Baseline Audit + Project Documentation + Gemini Model Upgrade (Completed - `b531f3f`)
  - Chunk 1.1: Fix Critical Backend Controller Argument Bugs (Completed - `02a754f`)
  - Chunk 1.2: Fix USP Payload Field Mismatch & Standardize Request Schemas (Completed - `b22a6f7`)
  - Chunk 1.3: Fix MVP localStorage Data Truncation (Completed - `5a06ab5`)
  - Chunk 1.4: Fix Frontend Routing Inconsistencies (Completed - `26e1d2d`)
  - Chunk 1.5: End-to-End Generation Testing (Completed - `c8a625a`)
- **Phase 2: Product Reliability (COMPLETED - Chunk 2.3)**
  - Chunk 2.1: Robust Gemini JSON Parsing (Completed - `e0d7f83`)
  - Chunk 2.2: Rate Limiting & Retry/Backoff Strategy (Completed - `e87a12f`)
  - Chunk 2.3: Clean API / Partial Generation Errors (Completed)
- **Phase 3: Backend Database Persistence** (User Accounts & Plan History)
- **Phase 4: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 5: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `e87a12f` (Milestone Chunk 2.2)
- **Phase 1 Status**: COMPLETED
- **Phase 2 Status**: COMPLETED
- **Phase 3 Status**: PLANNED (Not started)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c index.js controllers/*.js models/*.js routes/*.js services/*.js utils/*.js tests/*.js`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000. |
| **Backend Test Suite (8 suites)** | PASS | `npm test` runs all 8 test files cleanly: `controllers.test.js`, `uspDataFlow.test.js`, `mvpStorage.test.js`, `frontendRoutes.test.js`, `e2eGenerationFlow.test.js`, `jsonParser.test.js`, `geminiClient.test.js`, `partialGeneration.test.js`. |
| **Partial Generation & Error Suite** | PASS | `backend/tests/partialGeneration.test.js`: 14 tests verifying 200 raw success contracts, 400/429/503/500 error mapping, secret scrubbing, 6/6, 5/6, multiple failure, 0/6 flows, stale data purging, and dashboard null-safety. |
| **Gemini Client & Retry Suite** | PASS | `backend/tests/geminiClient.test.js`: 13 test categories covering 429/503 retries, network recovery, fail-fast on 400/401/403, exponential backoff, jitter, limiter, and model integration. |
| **Robust JSON Parser** | PASS | `backend/tests/jsonParser.test.js`: 9 test suites covering code blocks, conversational wrappers, unclosed fences, trailing commas, BOMs, error handling, and 6 model integrations. |
| **USP Prompt Verification** | PASS | Tested all 6 models in `uspDataFlow.test.js`: prompt strings contain `data.usp` without undefined/fallback. |
| **MVP Storage Verification** | PASS | `backend/tests/mvpStorage.test.js`: verifies complete MVP object retention, reproduces regression, and tests consumers + legacy fallback. |
| **Frontend Routing Verification** | PASS | `backend/tests/frontendRoutes.test.js`: 100% of active `navigate()` calls map to canonical routes; no stale `/input`, `/canvas`, or `/my-plans` references. |
| **End-to-End Generation Flow** | PASS | `backend/tests/e2eGenerationFlow.test.js`: deterministic simulation of end-to-end chain from form input to Dashboard/PitchPreview consumption passes with 0 errors. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.d8401959.js`). |

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
