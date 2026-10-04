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
- **Current Chunk**: Chunk 4.3 — Plan Ownership, Anonymous Trial & Claiming
- **Status**: Completed
- **Phase 4 Status**: IN PROGRESS (Chunks 4.1, 4.2 & 4.3 complete, Chunk 4.4 next)
- **Next Planned Chunk**: Chunk 4.4 — Frontend Authentication UX & Trial Claim Flow

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

## 7.6 Completed in Chunk 4.1 — Authentication & Anonymous Trial Architecture Audit

- [x] Audited full codebase (Express 5, SQLite, Google auth library, React 19, localStorage).
- [x] Defined user model, session strategy (HTTP-only cookies), and Migration 002.
- [x] Defined 1-trial anonymous generation limit, trial claiming flow, and endpoint authorization matrix.
- [x] Defined 4-chunk Phase 4 roadmap.

---

## 7.7 Completed in Chunk 4.2 — Authentication Backend Foundation

- [x] **Database Migration 002 (`backend/db/migrations/002_add_user_id_to_plans.sql`)**:
  - Created `users` table: `id` (UUID), `email` (UNIQUE NOCASE), `name`, `picture_url`, `auth_provider` ('google' | 'local'), `provider_subject_id`, `password_hash`, `created_at`, `updated_at`.
  - Created `sessions` table: `id` (64-char crypto token), `user_id` (FK -> users ON DELETE CASCADE), `expires_at`, `created_at`.
  - Created `trial_sessions` table: `id` (UUID), `plan_id` (FK -> plans ON DELETE SET NULL), `ip_hash`, `created_at`.
  - Evolved `plans` table: added `user_id TEXT REFERENCES users(id) ON DELETE CASCADE` with composite index `idx_plans_user_id_created`.
  - Maintained 100% backward compatibility: existing plans have `user_id = NULL` and remain fully readable.
- [x] **Authentication Service (`backend/services/authService.js`)**:
  - **Password Security**: Implemented salted scrypt password hashing (`crypto.scryptSync`, 16-byte random salt, 64-byte derived key) and timing-safe verification (`crypto.timingSafeEqual`).
  - **Session Management**: Cryptographically random 64-character session tokens (`crypto.randomBytes(32)`), 30-day sliding expiry, database storage, and bounded expired session cleanup.
  - **Cookie Security**: HTTP-only, `SameSite=Lax`, `Path=/`, positive `Max-Age`, and `Secure` in production (`startup_ai_session`). Zero tokens in `localStorage`.
  - **Google Verification**: Verified token verification using pre-installed `google-auth-library` (`OAuth2Client.verifyIdToken`), enforced audience check against `GOOGLE_CLIENT_ID`, and verified email claim requirements.
  - **Account Collision Defense**: If a Google login attempts to authenticate an email already registered with local password auth, returns structured HTTP 409 `ACCOUNT_COLLISION` without silent takeover.
- [x] **Authentication Middleware (`backend/middleware/auth.js`)**:
  - `authenticateUser`: Inspects incoming session cookie, verifies session and expiry in database, populates `req.user` and `req.session` (or `null`), and never blocks unauthenticated requests.
  - `requireAuth`: Route guard returning structured HTTP 401 `UNAUTHORIZED` when no valid session is present.
  - Registered globally in `backend/index.js` while keeping existing plan routes unauthenticated for Phase 3 compatibility.
- [x] **Authentication Endpoints & Controllers (`backend/controllers/authController.js` & `backend/routes/auth.js`)**:
  - `POST /api/auth/signup`: Validates email and password (min 8 chars), creates local user, establishes session, sets cookie, returns 201 with safe user profile.
  - `POST /api/auth/login`: Validates credentials, creates session, sets cookie, returns 200 with safe user profile. Timing-neutral error handling prevents account enumeration.
  - `POST /api/auth/google`: Verifies Google ID token, upserts Google user, creates session, sets cookie, returns 200 with safe user profile.
  - `POST /api/auth/logout`: Invalidates server-side session row in SQLite and clears cookie (`maxAge: 0`).
  - `GET /api/auth/me`: Returns current authenticated user profile (`200 OK`) or structured `401 UNAUTHORIZED`.
- [x] **CORS Configuration Update (`backend/index.js`)**:
  - Configured explicit origins (`process.env.FRONTEND_ORIGIN || 'http://localhost:3000'`) with `credentials: true`. Removed wildcard `*` to allow cross-origin cookie sharing.
- [x] **Environment Configuration**:
  - Created `backend/.env.example` documenting `GOOGLE_CLIENT_ID`, `FRONTEND_ORIGIN`, `NODE_ENV`, and `SESSION_COOKIE_NAME`.
- [x] **Comprehensive Test Suite (`backend/tests/authEndpoints.test.js`)**:
  - Created 36 deterministic zero-dependency tests (Tests A through AJ) covering migrations, password hashing, sessions, signup, login, Google verification, /me, logout, and security sanitization.
  - Added to `backend/package.json` test script.

---

## 7.8 Completed in Current Chunk (Chunk 4.3) — Plan Ownership, Anonymous Trial & Claiming

- [x] **Authenticated Plan Ownership (`POST /api/plans`)**:
  - Automatically resolves `req.user` from `authenticateUser` middleware and assigns `user_id = req.user.id`.
  - Client-supplied `userId`, `user_id`, or query parameters are strictly ignored.
- [x] **Anonymous One-Plan Trial Enforcement**:
  - Issues cryptographically random trial token in HTTP-only, `SameSite=Lax`, `Path=/`, 30-day `startup_ai_trial` cookie.
  - Tracks trial sessions in SQLite `trial_sessions` (`id`, `plan_id`, `ip_hash`, `created_at`).
  - Salted SHA-256 IP hash recorded as secondary abuse mitigation signal (never blocks NAT/VPN shared IPs).
  - Enforces strict 1-plan limit: if an anonymous trial session already has a persisted plan, subsequent creations are rejected with HTTP 403 `TRIAL_LIMIT_REACHED`.
  - Failed generations before persistence do not consume the trial.
- [x] **Anonymous Plan Access Security (`GET /api/plans/:id`)**:
  - Anonymous visitors can ONLY access plans where `plan.user_id IS NULL` AND `trial_sessions.plan_id` matches the requester's `startup_ai_trial` cookie.
  - Non-matching or missing trial cookies return safe 404 `PLAN_NOT_FOUND` (prevents UUID enumeration).
  - Authenticated users can ONLY access plans they own (`plan.user_id === req.user.id`). Other users' plans return safe 404 `PLAN_NOT_FOUND`.
- [x] **User History Isolation (`GET /api/plans`)**:
  - Authenticated users receive only plans where `user_id = req.user.id` with deterministic ordering and pagination.
  - Anonymous users receive an empty history list (`{ plans: [], total: 0 }`).
- [x] **Authorization for Plan Mutation & Deletion (`PATCH / DELETE /api/plans/:id`)**:
  - Guarded with `requireAuth`. Unauthenticated requests return 401 `UNAUTHORIZED`.
  - Non-owners receive safe 404 `PLAN_NOT_FOUND`.
  - Owner PATCH preserves immutable fields (`id`, `user_id`, `created_at`, `generation_status`, `generation_errors`, and all 6 AI modules).
- [x] **Atomic Plan Claiming (`POST /api/plans/claim`)**:
  - Requires authenticated session (`requireAuth`) and matching `startup_ai_trial` cookie linked to `planId`.
  - Atomically assigns ownership: `UPDATE plans SET user_id = :userId, updated_at = :now WHERE id = :planId AND user_id IS NULL`.
  - Race-condition safe: returns HTTP 409 `PLAN_ALREADY_CLAIMED` on duplicate or concurrent claim attempts without overwriting.
  - Preserves all 6 AI module trees, status, and timestamps without duplication or regeneration.
  - Old anonymous trial access is immediately revoked after claim.
- [x] **Phase 3 Plan Backward Compatibility**:
  - Existing plans with `user_id = NULL` lacking trial session linkage remain isolated, unclaimable, and invisible in history.
- [x] **Comprehensive Test Suite (`backend/tests/planAuthorization.test.js`)**:
  - 12 comprehensive test categories (A through L) covering ownership, trials, limits, isolation, PATCH/DELETE authorization, atomic claim, race conditions, and error sanitization.
- [x] **Explicit Scope Boundaries Maintained**:
  - Chunk 4.4 was NOT started.
  - Frontend authentication UX, AuthContext, AuthModal, Google Sign-in button, and Header UI were NOT started.
  - All 15 backend test suites pass with 0 regressions.

---

## 8. Next Planned Phase & Chunk

**Phase 4: Authentication & Multi-User Plan Architecture**
- **Chunk 4.4 — Frontend Authentication UX & Trial Claim Flow**:
  - Implement `AuthContext` (`src/utils/AuthContext.js`) wrapping React tree with session hydration (`GET /api/auth/me`).
  - Implement `AuthModal` component supporting Google Sign-In button and Email/Password login/signup tabs.
  - Integrate Header profile avatar / dropdown menu (My Plans, Sign Out).
  - Implement Dashboard trial banner ("✨ Free Trial Plan • Sign in to save permanently") and auto-claim hook.
  - Connect trial claim flow end-to-end between frontend and backend.

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
  - Chunk 4.1: Authentication & Anonymous Trial Architecture Audit (Completed - `632609e`)
  - Chunk 4.2: Database Migration 002, User Model & Core Backend Auth Endpoints (Completed)
  - Chunk 4.3: Plan Ownership, Multi-User Isolation & Plan Claiming API
  - Chunk 4.4: Frontend Auth UX, Google Sign-In & Dashboard Claim Flow
- **Phase 5: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 6: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `37f3f0d29116044f2430e00c1c0005d8d7366a40` (feat: implement user authentication and session foundation)
- **Phase 1 Status**: COMPLETED
- **Phase 2 Status**: COMPLETED
- **Phase 3 Status**: COMPLETED
- **Phase 4 Status**: IN PROGRESS (Chunks 4.1, 4.2 and 4.3 Completed)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c index.js controllers/*.js models/*.js routes/*.js services/*.js utils/*.js db/*.js middleware/*.js tests/*.js`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000 with `Database: Connected & Migrated ✅`. |
| **Backend Test Suite (15 suites)** | PASS | `npm test` runs all 15 test files cleanly with 0 errors across 160+ assertions. |
| **Plan Authorization & Trial Suite** | PASS | `backend/tests/planAuthorization.test.js`: 12 comprehensive categories (A–L) verifying authenticated ownership, anonymous trial cookies, 403 limit enforcement, trial & user isolation, history isolation, PATCH/DELETE authorization, atomic plan claiming, claim race safety (409), Phase 3 backward compatibility, and error sanitization. |
| **Auth Endpoints Test Suite** | PASS | `backend/tests/authEndpoints.test.js`: 36 comprehensive tests (A–AJ) covering migrations, scrypt hashing, timing-safe verification, session random tokens, 30-day expiry, signup, login, Google token verification, local account collision protection, /me, logout cookie clearing, and secret stripping. |
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
| **Manual HTTP Verification (9 scenarios)** | PASS | Verified with live Express HTTP server: anonymous creation & cookie, 403 trial limit, cross-visitor isolation, user A plan creation, cross-user isolation, cross-user patch/delete blocked, atomic claim, anonymous revocation after claim, and history isolation. |


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
