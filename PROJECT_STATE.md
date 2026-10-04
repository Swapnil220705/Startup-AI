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

1. **Plan Modification & Deletion (Chunk 3.5)**:
   - Plans can be generated, persisted, browsed via `/my-plans`, and re-opened into the active dashboard. Modification (updating inputs/modules) and plan deletion endpoints/UI are scheduled for Chunk 3.5.
2. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules` (custom test suites in `backend/tests/` verify both frontend and backend functionality).
3. **Upstream Gemini Free-Tier Quota & Demand Restrictions (429/503)**:
   - When generating all 6 modules simultaneously under free-tier quota (5 RPM), upstream 429 quota or 503 service overload can exhaust retries; Chunk 2.3 handles this by generating available modules and reporting unavailable ones cleanly.

---

## 6. Current Status

- **Phase**: Phase 4 — Authentication & Multi-User Plan Architecture
- **Current Chunk**: Chunk 4.1 — Authentication & Anonymous Trial Architecture Audit
- **Status**: Completed (Architecture & Design Audit)
- **Phase 4 Status**: IN PROGRESS (Chunk 4.1 complete, Chunk 4.2 next)
- **Next Planned Chunk**: Chunk 4.2 — Database Migration 002, User Model & Core Backend Auth Endpoints

---

## 7. Completed in Phase 3

### Chunk 3.4 — Plan Detail / Loading / Re-opening
- [x] Detail API (`GET /api/plans/:id`) integration and re-opening navigation via `/dashboard?plan=<UUID>`.
- [x] Stale data purge before hydrating historical plan into active localStorage session.
- [x] Form data and all 6 modules restored cleanly without fabricating missing data.
- [x] Partial plan safety with generation errors metadata.
- [x] Robust 404 not-found and server error screens with retry CTAs.
- [x] Pitch preview and direct `/dashboard` navigation backward compatibility.

### Chunk 3.5 — Update / Delete / Archive & Persistence Lifecycle
- [x] Metadata editing endpoint (`PATCH /api/plans/:id`) with validation, protected AI modules, and timestamp updates.
- [x] Single plan deletion endpoint (`DELETE /api/plans/:id`).
- [x] Active session synchronization: deleting active plan purges all 10 localStorage keys; non-active deletion leaves session intact; metadata edits synchronize into active `formData`.
- [x] Modals for edit and delete with active plan warnings in `HistoryPage.js` and `DashboardPage.js`.

---

## 7.6 Current Completed Chunk: Chunk 4.1 — Authentication & Anonymous Trial Architecture Audit

- [x] **Repository Inspection & Current Architecture Audit**:
  - Backend: Verified Express 5.1.0, `better-sqlite3` WAL mode, `PRAGMA foreign_keys = ON`, transactional `schema_migrations` runner.
  - Dependencies: Verified `"google-auth-library": "^10.1.0"` is already installed in `backend/package.json`.
  - Network & CORS: Identified `cors()` default wildcard (`origin: '*'`, `credentials: false`); verified need for explicit origin (`http://localhost:3000`) and `credentials: true` for HTTP-only session cookies.
  - Storage: Mapped 10 active `localStorage` keys; audited current single-user, unauthenticated `/api/plans` endpoints.
- [x] **Product Requirements Formalized**:
  - **Anonymous First-Time Visitor**: Visitors generate exactly ONE complete AI startup plan without upfront registration.
  - **No Regeneration on Signup**: When an anonymous user signs up / logs in after exploring their generated plan, the existing plan is claimed and attached to their new account without losing data or regenerating.
  - **Primary Auth Provider**: Google OAuth ("Continue with Google") prioritized for frictionless onboarding.
  - **Secondary Auth Provider**: Native Email/Password supported for universal accessibility.
  - **Persistent Session**: Secure HTTP-only cookies (`startup_ai_session`) backed by SQLite `sessions` table (no auth tokens in localStorage).
- [x] **Database & User Model Architecture**:
  - Designed Migration `002_add_user_id_to_plans.sql` (preserving `001_create_plans_table.sql` completely intact).
  - Designed `users` table: `id` (UUID), `email` (UNIQUE), `name`, `picture_url`, `auth_provider` ('google' | 'local'), `provider_subject_id`, `password_hash` (NULL for Google users), `created_at`, `updated_at`.
  - Designed `sessions` table: `id` (cryptographic token), `user_id` (FK -> users.id CASCADE), `expires_at`, `created_at`.
  - Designed `trial_sessions` table: `id` (UUID cookie), `plan_id` (FK -> plans.id), `ip_hash`, `created_at`.
  - Added `user_id TEXT REFERENCES users(id) ON DELETE CASCADE` to `plans` (NULL for unowned anonymous trials, populated upon claim).
  - Existing Phase 3 data automatically remains safe with `user_id = NULL`.
- [x] **Anonymous Trial & Abuse Protection**:
  - Anonymous trial session cookie (`startup_ai_trial`) issued on first unauthenticated visit.
  - Server-side trial gatekeeper in `trial_sessions` tracks consumed trials by cookie and salted IP hash.
  - Returns structured HTTP 403 `TRIAL_LIMIT_REACHED` if an anonymous visitor attempts a second generation run, inviting them to authenticate.
- [x] **Trial-to-Account Plan Claiming Design**:
  - Endpoint `POST /api/plans/claim` with `{ planId }`.
  - Atomic ownership transfer: `UPDATE plans SET user_id = :userId WHERE id = :planId AND user_id IS NULL`.
  - Retains all 6 generated modules, metadata, and timestamps without duplication.
  - Attaches to either newly created accounts or existing user accounts seamlessly.
- [x] **Endpoint Authorization Matrix**:
  - `POST /api/plans`: Authenticated user -> user plan; Anonymous user -> trial plan (`user_id = NULL`) if under trial limit.
  - `GET /api/plans`: Authenticated user -> only plans where `user_id = req.user.id`; Anonymous user -> empty or trial session only.
  - `GET /api/plans/:id`: Accessible if owned by caller or if unowned trial plan; returns 404 if owned by another user (prevents ID enumeration).
  - `PATCH /api/plans/:id` & `DELETE /api/plans/:id`: Strictly requires `user_id = req.user.id`.
- [x] **Frontend Auth UX Architecture**:
  - Designed `AuthContext` managing `{ user, isAuthenticated, isLoading, loginWithGoogle, loginWithEmail, signupWithEmail, logout, claimPlan }`.
  - Designed `AuthModal` with prominent "Continue with Google" button, tabbed Email login/signup, and inline error feedback.
  - Designed Dashboard "Save My Startup Plan" claim banner and Header user profile dropdown.
- [x] **Defined Phase 4 Breakdown**:
  - Chunk 4.1: Architecture Audit & Design (THIS CHUNK - COMPLETE)
  - Chunk 4.2: Database Migration 002, User Model & Core Backend Auth Endpoints
  - Chunk 4.3: Plan Ownership, Multi-User Isolation & Plan Claiming API
  - Chunk 4.4: Frontend Auth UX, Google Sign-In & Dashboard Claim Flow

---

## 8. Next Planned Phase & Chunk

**Phase 4: Authentication & Multi-User Plan Architecture**
- **Chunk 4.2 — Database Migration 002, User Model & Core Backend Auth Endpoints**:
  - Execute migration `002_add_user_id_to_plans.sql`.
  - Implement `userService.js` and `authService.js` (password hashing with Node `crypto.scrypt`, Google token verification with `google-auth-library`).
  - Implement session management with secure HTTP-only cookies.
  - Register `/api/auth/google`, `/api/auth/signup`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me`.
  - Verify with zero-dependency automated test suite.

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
- **Phase 3: Backend Database Persistence (COMPLETED - Commit `c73a00a`)**
  - Chunk 3.1: Persistence Architecture & Database Foundation (Completed - `f68b6a4`)
  - Chunk 3.2: Connect Frontend Generation Flow to Persistence API (Completed - `d50406a`)
  - Chunk 3.3: Plan History / My Plans (Completed - `04eed8f`)
  - Chunk 3.4: Plan Detail / Loading / Re-opening (Completed - `5c6d58f`)
  - Chunk 3.5: Update/Delete/Archive & Persistence Edge Cases (Completed - `c73a00a`)
- **Phase 4: Authentication & Multi-User Plan Architecture (IN PROGRESS)**
  - Chunk 4.1: Authentication & Anonymous Trial Architecture Audit (Completed)
  - Chunk 4.2: Database Migration 002, User Model & Core Backend Auth Endpoints
  - Chunk 4.3: Plan Ownership, Multi-User Isolation & Plan Claiming API
  - Chunk 4.4: Frontend Auth UX, Google Sign-In & Dashboard Claim Flow
- **Phase 5: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 6: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `c73a00ada2c4924b9beaa282cb9a8f6abf45f7a3` (feat: manage persisted plan lifecycle)
- **Phase 1 Status**: COMPLETED
- **Phase 2 Status**: COMPLETED
- **Phase 3 Status**: COMPLETED (Chunks 3.1 through 3.5 all verified and committed)
- **Phase 4 Status**: IN PROGRESS (Chunk 4.1 Completed)

---


## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c index.js controllers/*.js models/*.js routes/*.js services/*.js utils/*.js db/*.js tests/*.js`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000 with `Database: Connected & Migrated ✅`. |
| **Backend Test Suite (13 suites)** | PASS | `npm test` runs all 13 test files cleanly: `controllers.test.js`, `uspDataFlow.test.js`, `mvpStorage.test.js`, `frontendRoutes.test.js`, `e2eGenerationFlow.test.js`, `jsonParser.test.js`, `geminiClient.test.js`, `partialGeneration.test.js`, `persistence.test.js`, `frontendPersistenceIntegration.test.js`, `planHistory.test.js`, `reopenPlan.test.js`, `planLifecycle.test.js`. |
| **Plan Lifecycle Test Suite** | PASS | `backend/tests/planLifecycle.test.js`: 17 comprehensive tests (A–Q) covering metadata updates, field preservation, empty name validation, timestamp management, module preservation, 404 handling, single plan deletion isolation, active session purging, non-active session protection, active session metadata synchronization, partial plan lifecycle, and HTTP controller contracts. |
| **Plan Re-Opening & Hydration Suite** | PASS | `backend/tests/reopenPlan.test.js`: 15 comprehensive tests (A–O) covering URL query generation, plan ID extraction, full document retrieval, formData restoration, module restoration, partial plan error handling, currentPlanId synchronization, stale data cleanup between plans, 404 not-found handling, network failure error handling, direct dashboard session retention, generation regression, history regression, and full round-trip. |
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
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.0139c39c.js`). |


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
