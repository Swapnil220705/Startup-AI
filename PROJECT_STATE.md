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

1. **Frontend Integration with Database Persistence**:
   - The backend persistence layer and REST API (`/api/plans`) are established and verified in Chunk 3.1. Frontend `IdeaInputPage.js` and `DashboardPage.js` still interact via `localStorage` until wired in Chunk 3.2.
2. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules` (custom test suites in `backend/tests/` verify both frontend and backend functionality).
3. **Upstream Gemini Free-Tier Quota & Demand Restrictions (429/503)**:
   - When generating all 6 modules simultaneously under free-tier quota (5 RPM), upstream 429 quota or 503 service overload can exhaust retries; Chunk 2.3 handles this by generating available modules and reporting unavailable ones cleanly.

---

## 6. Current Status

- **Phase**: Phase 3 — Backend Database Persistence
- **Current Chunk**: Chunk 3.1 — Persistence Architecture & Database Foundation
- **Status**: Completed
- **Phase 3 Status**: IN PROGRESS (Chunk 3.1 complete, Chunk 3.2 next)
- **Next Planned Chunk**: Chunk 3.2 — Connect Frontend Generation Flow to Persistence API

---

## 7. Completed in Current Chunk (Chunk 3.1)

- [x] Inspected existing architecture, storage keys, and generation data flow across frontend (`IdeaInputPage.js`, `DashboardPage.js`, `PitchPreviewPage.js`, `DashboardTabs.js`) and backend (all 6 controllers, models, routes).
- [x] Evaluated database options and selected SQLite via `better-sqlite3` for zero-overhead development, embedded file-based storage (`backend/data/startup_ai.db`), and instantaneous `:memory:` test isolation without modifying developer databases.
- [x] Designed compact, future-proof schema in `backend/db/migrations/001_create_plans_table.sql`:
  - `plans` table with server-generated UUID v4 primary key.
  - Startup input fields (`startup_name`, `industry`, `problem`, `solution`, `target_audience`, `usp`).
  - 6 JSON text columns preserving complete raw AI module responses (`lean_canvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`).
  - Status and error tracking (`generation_status`, `generation_errors`).
  - UTC ISO-8601 timestamps (`created_at`, `updated_at`).
  - Descending creation index `idx_plans_created_at` on `created_at DESC`.
- [x] Created transactional migration runner in `backend/db/migrate.js` tracking applied migrations in `schema_migrations`.
- [x] Implemented database lifecycle manager in `backend/db/database.js` with WAL mode and foreign key enforcement.
- [x] Built persistence service abstraction in `backend/services/planService.js`:
  - `createPlan(planData, [db])`: Validates inputs, generates UUID v4, calculates generation status, executes parameterized insert, and returns deserialized object.
  - `getPlanById(id, [db])`: Retrieves plan by UUID, safely parsing all nested module JSON.
  - `listPlans(options, [db])`: Returns paginated, chronological summary list (`created_at DESC`).
- [x] Built HTTP controller layer in `backend/controllers/planController.js`:
  - `POST /api/plans`: HTTP 201 Created with structured error handling.
  - `GET /api/plans`: HTTP 200 OK with paginated list and total count.
  - `GET /api/plans/:id`: HTTP 200 OK on success, HTTP 404 with `PLAN_NOT_FOUND` if missing.
  - Preserves Chunk 2.3 structured error contract (`{ success: false, error: { code, message } }`), suppressing internal SQL stack dumps.
- [x] Mounted `/api/plans` routes in `backend/routes/plans.js` and integrated database startup in `backend/index.js`.
- [x] Updated `.gitignore` to explicitly ignore SQLite database, WAL, SHM, and journal files (`*.db`, `*.sqlite`, `/backend/data/*.db*`).
- [x] Created comprehensive zero-dependency test suite in `backend/tests/persistence.test.js`:
  - Test 1: Fresh in-memory database initializes with foreign keys enabled.
  - Test 2: Schema verification and idempotent migration re-runs.
  - Test 3: Plan creation with UUID v4, timestamps, and inputs.
  - Test 4: Complete nested JSON structures preserved identically across all 6 modules.
  - Test 5: Plan listing, pagination, and ordering (`created_at DESC`).
  - Test 6: Missing plan retrieval returns null cleanly.
  - Test 7: Input validation and rejection of invalid data.
  - Test 8: Partial generation persistence without fabricating missing data.
  - Test 9: HTTP Controllers adhere to structured API contract (201, 200, 400, 404).
  - Test 10: Test database isolation verified with ephemeral `:memory:` and isolated disk tests.
- [x] Updated `backend/package.json` test script to include `persistence.test.js`.
- [x] Full regression verification: all 9 backend test suites pass with 0 errors, backend syntax check passes, and frontend production build succeeds cleanly.

---

## 8. Next Planned Phase & Chunk

**Phase 3: Backend Database Persistence**
- **Chunk 3.2 — Connect Frontend Generation Flow to Persistence API**: Update `IdeaInputPage.js` and `DashboardPage.js` to automatically persist generated plans via `POST /api/plans` and load them via `GET /api/plans/:id` while keeping `localStorage` as a fallback boundary.
- **Chunk 3.3 — Plan History UI**: Add history view allowing users to browse previously generated plans and reload them into the dashboard.

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
  - Chunk 3.1: Persistence Architecture & Database Foundation (Completed)
  - Chunk 3.2: Connect Frontend Generation Flow to Persistence API (Next)
  - Chunk 3.3: Plan History UI & Plan Loading
- **Phase 4: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 5: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `52ecf78` (Chunk 2.3 Partial Generation)
- **Phase 1 Status**: COMPLETED
- **Phase 2 Status**: COMPLETED
- **Phase 3 Status**: IN PROGRESS (Chunk 3.1 Completed)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c index.js controllers/*.js models/*.js routes/*.js services/*.js utils/*.js db/*.js tests/*.js`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000 with `Database: Connected & Migrated ✅`. |
| **Backend Test Suite (9 suites)** | PASS | `npm test` runs all 9 test files cleanly: `controllers.test.js`, `uspDataFlow.test.js`, `mvpStorage.test.js`, `frontendRoutes.test.js`, `e2eGenerationFlow.test.js`, `jsonParser.test.js`, `geminiClient.test.js`, `partialGeneration.test.js`, `persistence.test.js`. |
| **Plan Persistence Test Suite** | PASS | `backend/tests/persistence.test.js`: 10 comprehensive tests verifying in-memory initialization, migrations, CRUD, deep nested JSON preservation, pagination, ordering, 404/400 errors, partial plan persistence, and test DB isolation. |
| **Partial Generation & Error Suite** | PASS | `backend/tests/partialGeneration.test.js`: 14 tests verifying 200 raw success contracts, 400/429/503/500 error mapping, secret scrubbing, 6/6, 5/6, multiple failure, 0/6 flows, stale data purging, and dashboard null-safety. |
| **Gemini Client & Retry Suite** | PASS | `backend/tests/geminiClient.test.js`: 13 test categories covering 429/503 retries, network recovery, fail-fast on 400/401/403, exponential backoff, jitter, limiter, and model integration. |
| **Robust JSON Parser** | PASS | `backend/tests/jsonParser.test.js`: 9 test suites covering code blocks, conversational wrappers, unclosed fences, trailing commas, BOMs, error handling, and 6 model integrations. |
| **USP Prompt Verification** | PASS | Tested all 6 models in `uspDataFlow.test.js`: prompt strings contain `data.usp` without undefined/fallback. |
| **MVP Storage Verification** | PASS | `backend/tests/mvpStorage.test.js`: verifies complete MVP object retention, reproduces regression, and tests consumers + legacy fallback. |
| **Frontend Routing Verification** | PASS | `backend/tests/frontendRoutes.test.js`: 100% of active `navigate()` calls map to canonical routes; no stale `/input`, `/canvas`, or `/my-plans` references. |
| **End-to-End Generation Flow** | PASS | `backend/tests/e2eGenerationFlow.test.js`: deterministic simulation of end-to-end chain from form input to Dashboard/PitchPreview consumption passes with 0 errors. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.9f1cf261.js`). |


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
