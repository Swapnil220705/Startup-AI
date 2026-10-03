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

- **Frontend**: Single Page Application built with React 19 and Tailwind CSS. Navigation is managed via a custom lightweight pushState router (`src/utils/Router.js`). Form submissions in `IdeaInputPage.js` trigger 6 parallel Axios POST requests via `Promise.all` to the backend and store results in `localStorage`.
- **Backend**: Express 5.1.0 server listening on port 4000 (`backend/index.js`), exposing 6 modular REST routes under `/api/*`. Routes map to controllers in `backend/controllers/`, which delegate prompt engineering and REST API calls to `backend/models/*.js`.
- **AI Integration**: Backend models communicate directly with the Google AI Studio Generative Language REST API (`v1`) via Axios, targeting `models/gemini-3.8-flash:generateContent`.
- **Storage**: Client-side browser `localStorage` (no database currently configured).

---

## 3. Current Technology Stack

| Layer | Technologies Verified in Repo |
|---|---|
| **Runtime** | Node.js (v22.14.0) |
| **Backend Framework** | Express 5.1.0 |
| **Backend Libraries** | Axios 1.10.0, Dotenv 17.0.0, Cors 2.8.5 |
| **Backend Testing** | Zero-dependency Node.js test suite (`backend/tests/controllers.test.js`, `backend/tests/uspDataFlow.test.js`) |
| **Frontend Framework** | React 19.1.0, React DOM 19.1.0 |
| **Frontend Styling** | Tailwind CSS 3.4.3, PostCSS 8.5.6, Autoprefixer 10.4.21 |
| **Frontend UI / Icons** | Lucide React 0.525.0, Framer Motion 12.19.3, react-hot-toast 2.5.2 |
| **Frontend Routing** | Custom HTML5 History Router (`src/utils/Router.js`) |
| **AI Provider** | Google AI Studio REST API (`gemini-3.8-flash`) |

---

## 4. Completed Features

- [x] **Landing Page** (`/`): Responsive hero, feature showcase, testimonials carousel, and dynamic light/dark mode theme support.
- [x] **Idea Intake Workflow** (`/start`): Multi-field form capturing startup name, domain, problem, solution, audience, and USP.
- [x] **Parallel Generation Dispatch**: Simultaneous dispatch of 6 generation requests to Express endpoints.
- [x] **Interactive Dashboard** (`/dashboard`): Dynamic tabbed views for Overview, Lean Canvas, MVP, Revenue, Competitors, Personas, and Export.
- [x] **Pitch Deck Preview** (`/pitch-preview`): Slide presentation deck rendering generated pitch data.
- [x] **Light / Dark Mode**: Global theme management via `ThemeContext.js` and HTML root `dark` class toggling.

---

## 5. Known Issues (Deferred to Subsequent Chunks)

1. **Absence of Persistent Storage**:
   - Plans are only stored in the user's browser `localStorage`. Clearing cache or switching devices leads to permanent data loss (scheduled for Phase 2).
2. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules`.
3. **Upstream Gemini Free-Tier Quota & Demand Restrictions (429/503)**:
   - When generating all 6 modules simultaneously, the free-tier quota (5 requests per minute) on `gemini-3.8-flash` triggers `429 RESOURCE_EXHAUSTED` or temporary high demand `503 UNAVAILABLE` from Google's servers.

---

## 6. Current Status

- **Phase**: Phase 2 — Product Reliability
- **Current Chunk**: Chunk 2.2 — Gemini Rate Limiting & Retry/Backoff Strategy
- **Status**: Completed
- **Next Planned Chunk**: Chunk 2.3 — Clean API / Partial Generation Errors

---

## 7. Completed in Current Chunk (Chunk 2.2)

- [x] Inspected existing model HTTP calling pattern: confirmed all 6 models duplicated identical Axios calls with no timeouts, retries, or rate limiting.
- [x] Designed and implemented centralized request client in `backend/services/geminiClient.js`:
  - `callGemini(prompt, options)` manages HTTP POST requests, timeouts, retries, backoff, and concurrency.
  - **Timeout Handling**: Default 30,000 ms bounded timeout (`GEMINI_TIMEOUT_MS`) prevents connection hangs.
  - **Error Classification (`isTransientError`)**:
    - Retries transient errors: HTTP 429, 408, 500, 502, 503, 504, `ECONNRESET`, `ETIMEDOUT`, `ECONNABORTED`, socket hang up, and network failures.
    - Fails fast on permanent client/auth errors: HTTP 400, 401, 403, 404.
  - **Exponential Backoff with Jitter (`calculateBackoffDelay`)**:
    - Calculates `min(maxDelay, baseDelay * 2^(attempt - 1) + jitter)`.
    - Configurable defaults: 1,000 ms base delay, doubling each retry up to 10,000 ms maximum, with 25% proportional jitter.
  - **Retry-After Header Handling (`getRetryAfterDelayMs`)**:
    - Inspects and parses `Retry-After` headers (in seconds or HTTP dates) up to `maxDelayMs`.
  - **In-Process Concurrency Limiter (`ConcurrencyLimiter`)**:
    - Zero-dependency semaphore limiting in-flight requests to max 2 (`GEMINI_MAX_CONCURRENT`), smoothing the 6-module parallel intake spike.
    - Safe `try ... finally` release guarantees slots are never leaked on success or failure.
  - **Sanitized Logging**: Logs model context, status codes, retry counts, and delay intervals without exposing API keys, complete prompts, or user data.
- [x] Refactored all 6 backend models to route requests through `callGemini`:
  - `backend/models/leanCanvas.js`
  - `backend/models/competitorsModel.js`
  - `backend/models/mvpGenerator.js`
  - `backend/models/personasModel.js`
  - `backend/models/pitchModel.js`
  - `backend/models/revenueModel.js`
  - Preserved the clean separation: model prompts → `callGemini` → `parseGeminiJson` → parsed response.
- [x] Created comprehensive unit and integration test suite in `backend/tests/geminiClient.test.js`:
  - Test 1: Successful first-attempt request (no retry).
  - Test 2: HTTP 429 retry and recovery.
  - Test 3: HTTP 503 overload retry and recovery.
  - Test 4: Network failure (`ECONNRESET`) retry and recovery.
  - Test 5: Permanent HTTP 400 fails immediately without retrying.
  - Test 6: Permanent HTTP 401 and 403 fail immediately without retrying.
  - Test 7: Exhausted retries propagates final error.
  - Test 8: Configurable retry limit (`maxRetries`).
  - Test 9: Deterministic exponential backoff calculation (1s, 2s, 4s).
  - Test 10: Delay strictly capped at `maxDelayMs`.
  - Test 11: Jitter implementation verified deterministically with injected random generator.
  - Test 11b: `Retry-After` header parsing and capping.
  - Test 12: Concurrency limiter enforcement (max 2 active) and error release.
  - Test 13: End-to-end integration verifying all 6 model handlers recover from transient errors and parse through `parseGeminiJson`.
- [x] Updated `backend/package.json` test script to include `geminiClient.test.js`.
- [x] Full regression verification: all 7 backend test suites pass with 0 errors, backend syntax check passes, and frontend production build succeeds cleanly.
- [x] Live smoke-test verified: single live request recovered from a transient 503 response through `geminiClient` and succeeded with structured JSON.

---

## 8. Next Chunk

**Chunk 2.3 — Clean API / Partial Generation Errors**
- Add clean error propagation, partial generation handling, and structured frontend status indicators when specific modules fail permanently or exhaust retries.

---

## 9. Future Roadmap

- **Phase 1: Core Backend & Data Flow Fixes (COMPLETED)**
  - Chunk 0.1: Baseline Audit + Project Documentation + Gemini Model Upgrade (Completed - `b531f3f`)
  - Chunk 1.1: Fix Critical Backend Controller Argument Bugs (Completed - `02a754f`)
  - Chunk 1.2: Fix USP Payload Field Mismatch & Standardize Request Schemas (Completed - `b22a6f7`)
  - Chunk 1.3: Fix MVP localStorage Data Truncation (Completed - `5a06ab5`)
  - Chunk 1.4: Fix Frontend Routing Inconsistencies (Completed - `26e1d2d`)
  - Chunk 1.5: End-to-End Generation Testing (Completed - `c8a625a`)
- **Phase 2: Product Reliability (IN PROGRESS)**
  - Chunk 2.1: Robust Gemini JSON Parsing (Completed - `e0d7f83`)
  - Chunk 2.2: Rate Limiting & Retry/Backoff Strategy (Completed)
  - Chunk 2.3: Clean API / Partial Generation Errors (Next)
- **Phase 3: Backend Database Persistence** (User Accounts & Plan History)
- **Phase 4: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 5: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `e0d7f83` (Milestone Chunk 2.1)
- **Phase 1 Status**: COMPLETED
- **Phase 2 Status**: In Progress (Chunk 2.2 Completed)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000. |
| **Backend Test Suite (7 suites)** | PASS | `npm test` runs all 7 test files cleanly: `controllers.test.js`, `uspDataFlow.test.js`, `mvpStorage.test.js`, `frontendRoutes.test.js`, `e2eGenerationFlow.test.js`, `jsonParser.test.js`, `geminiClient.test.js`. |
| **Gemini Client & Retry Suite** | PASS | `backend/tests/geminiClient.test.js`: 13 test categories covering 429/503 retries, network recovery, fail-fast on 400/401/403, exponential backoff, jitter, limiter, and model integration. |
| **Robust JSON Parser** | PASS | `backend/tests/jsonParser.test.js`: 9 test suites covering code blocks, conversational wrappers, unclosed fences, trailing commas, BOMs, error handling, and 6 model integrations. |
| **USP Prompt Verification** | PASS | Tested all 6 models in `uspDataFlow.test.js`: prompt strings contain `data.usp` without undefined/fallback. |
| **MVP Storage Verification** | PASS | `backend/tests/mvpStorage.test.js`: verifies complete MVP object retention, reproduces regression, and tests consumers + legacy fallback. |
| **Frontend Routing Verification** | PASS | `backend/tests/frontendRoutes.test.js`: 100% of active `navigate()` calls map to canonical routes; no stale `/input`, `/canvas`, or `/my-plans` references. |
| **End-to-End Generation Flow** | PASS | `backend/tests/e2eGenerationFlow.test.js`: deterministic simulation of end-to-end chain from form input to Dashboard/PitchPreview consumption passes with 0 errors. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.7412d32b.js`). |
| **Gemini Live Generation** | CONTROLLED PASS (RETRY VERIFIED) | Controlled live request recovered from transient 503 via automatic exponential backoff in `geminiClient` and returned valid JSON. |

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
