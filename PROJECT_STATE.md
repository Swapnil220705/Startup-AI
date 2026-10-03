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

- **Phase**: Phase 1 — Core Backend & Data Flow Fixes (COMPLETED)
- **Current Chunk**: Chunk 1.5 — End-to-End Generation Testing
- **Status**: Completed
- **Next Phase**: Phase 2 — Product Reliability
- **Next Planned Chunk**: Chunk 2.1 — Robust Gemini JSON Parsing

---

## 7. Completed in Current Chunk (Chunk 1.5)

- [x] Inspected and verified the complete end-to-end business plan generation flow across all 6 modules:
  - Landing Page (`/`) → Idea Intake (`/start`) → `IdeaInputPage.js` canonical payload → 6 parallel Express endpoints → 6 controllers → 6 model prompt builders → Gemini API → response handling → browser `localStorage` → Dashboard (`/dashboard`) tabs and Pitch Preview (`/pitch-preview`).
- [x] Verified the canonical frontend input payload in `IdeaInputPage.js`:
  - Contains `{ startupName, industry, problem, solution, targetAudience, usp }`.
  - Confirmed `usp` is consistently used across all 6 requests with zero references to deprecated `uniqueValueProposition`.
- [x] Verified all 6 backend API endpoints and controller dispatch contracts:
  - `/api/lean-canvas` → `leanCanvasController.js` → `generateLeanCanvas`
  - `/api/mvp` → `mvpController.js` → `generateMVP`
  - `/api/revenue` → `revenueController.js` → `generateRevenue`
  - `/api/pitch` → `pitchController.js` → `generatePitch`
  - `/api/personas` → `personaController.js` → `generatePersonas`
  - `/api/competitors` → `competitorController.js` → `generateCompetitors`
  - Confirmed all controllers pass `req.body` directly to model functions without string corruption.
- [x] Verified backend model prompt construction:
  - Confirmed all 6 model prompt builders correctly ingest `data.startupName` and `data.usp` without `undefined` interpolation or fallback degradation.
- [x] Verified complete response storage mapping in `localStorage`:
  - `localStorage['leanCanvas']`: Complete 9-box canvas object.
  - `localStorage['mvp']`: Complete MVP object (`startupName`, `coreFeatures`, `technicalRequirements`, `launchTimeline`) without truncation.
  - `localStorage['revenue']`: Array of revenue models and projections.
  - `localStorage['pitch']`: Object containing `elevatorPitch`.
  - `localStorage['personas']`: Array of user persona profiles.
  - `localStorage['competitors']`: Array of competitor objects and differentiators.
- [x] Verified downstream consumption across all Dashboard components and Pitch Preview:
  - `OverviewTab`: Ingests company profile and USP.
  - `MVPTab`: Correctly consumes `coreFeatures`, `technicalRequirements`, and `launchTimeline`.
  - `RevenueTab`: Correctly renders revenue streams and pricing strategies.
  - `CompetitorsTab`: Correctly renders competitor cards and differentiators.
  - `PersonasTab`: Correctly renders target user personas.
  - `PitchPreviewPage`: Extracts `pitch` data and `mvp.coreFeatures` for presentation slides.
  - Bidirectional navigation between `/dashboard` and `/pitch-preview` functions cleanly via canonical routes.
- [x] Created zero-dependency end-to-end integration test suite in `backend/tests/e2eGenerationFlow.test.js`:
  - Simulates the entire generation chain: user form submission → canonical payload → controller dispatch → prompt validation → `localStorage` persistence → Dashboard and Pitch Preview consumption.
- [x] Performed controlled live Gemini generation verification:
  - Confirmed single-request direct model generation succeeds (`gemini-3.8-flash:generateContent` returns valid HTTP 200 with structured JSON).
  - Documented known upstream concurrency restriction: parallel 6-request burst triggers Google free-tier quota (5 RPM) `429 RESOURCE_EXHAUSTED` or transient high-demand `503 UNAVAILABLE`.
- [x] Performed repository-wide audit:
  - Verified 0 active occurrences of `/input`, `/canvas` (as router path), `/my-plans`, or request-payload `uniqueValueProposition`.
- [x] Completed Phase 1 (Core Backend & Data Flow Fixes).

---

## 8. Next Phase & Chunk

**Phase 2 — Product Reliability**
- **Chunk 2.1 — Robust Gemini JSON Parsing**: Implement resilient JSON extraction handling markdown code blocks, partial fences, and malformed strings.
- **Chunk 2.2 — Rate Limiting & Retry/Backoff Strategy**: Implement structured pacing and exponential backoff to handle Google free-tier 5 RPM quota limitations.
- **Chunk 2.3 — Graceful Frontend Error Handling**: Allow partial generation results to display when specific modules experience upstream 429/503 errors.

---

## 9. Future Roadmap

- **Phase 1: Core Backend & Data Flow Fixes (COMPLETED)**
  - Chunk 0.1: Baseline Audit + Project Documentation + Gemini Model Upgrade (Completed - `b531f3f`)
  - Chunk 1.1: Fix Critical Backend Controller Argument Bugs (Completed - `02a754f`)
  - Chunk 1.2: Fix USP Payload Field Mismatch & Standardize Request Schemas (Completed - `b22a6f7`)
  - Chunk 1.3: Fix MVP localStorage Data Truncation (Completed - `5a06ab5`)
  - Chunk 1.4: Fix Frontend Routing Inconsistencies (Completed - `26e1d2d`)
  - Chunk 1.5: End-to-End Generation Testing (Completed)
- **Phase 2: Product Reliability (NEXT)**
  - Chunk 2.1: Robust Gemini JSON Parsing
  - Chunk 2.2: Rate Limiting & Retry/Backoff Strategy
  - Chunk 2.3: Graceful Frontend Error Handling & Partial Generation Recovery
- **Phase 3: Backend Database Persistence** (User Accounts & Plan History)
- **Phase 4: Pitch Deck Export & Sharing** (PDF / PowerPoint exports)
- **Phase 5: Production Hardening, Test Suite Modernization & CI/CD**

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `26e1d2d` (Milestone Chunk 1.4)
- **Phase 1 Status**: COMPLETED

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000. |
| **Backend Test Suite (5 suites)** | PASS | `npm test` runs all 5 test files cleanly: `controllers.test.js`, `uspDataFlow.test.js`, `mvpStorage.test.js`, `frontendRoutes.test.js`, `e2eGenerationFlow.test.js`. |
| **USP Prompt Verification** | PASS | Tested all 6 models in `uspDataFlow.test.js`: prompt strings contain `data.usp` without undefined/fallback. |
| **MVP Storage Verification** | PASS | `backend/tests/mvpStorage.test.js`: verifies complete MVP object retention, reproduces regression, and tests consumers + legacy fallback. |
| **Frontend Routing Verification** | PASS | `backend/tests/frontendRoutes.test.js`: 100% of active `navigate()` calls map to canonical routes; no stale `/input`, `/canvas`, or `/my-plans` references. |
| **End-to-End Generation Flow** | PASS | `backend/tests/e2eGenerationFlow.test.js`: deterministic simulation of end-to-end chain from form input to Dashboard/PitchPreview consumption passes with 0 errors. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.7412d32b.js`). |
| **Gemini Live Generation** | CONTROLLED PASS / 429/503 CONCURRENCY HOLD | Single call returns HTTP 200 OK on `gemini-3.8-flash`; parallel 6-request burst triggers Google free-tier 5 RPM limit (`429 RESOURCE_EXHAUSTED` / `503 UNAVAILABLE`). |

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
