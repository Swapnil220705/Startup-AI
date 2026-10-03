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

- **Phase**: Phase 1 — Core Backend & Data Flow Fixes
- **Current Chunk**: Chunk 1.4 — Fix Frontend Routing Inconsistencies
- **Status**: Completed

---

## 7. Completed in Current Chunk (Chunk 1.4)

- [x] Inspected routing implementation in `frontend/src/App.js` and `frontend/src/utils/Router.js`: verified the 4 canonical registered routes:
  - `/` → `LandingPage`
  - `/start` → `IdeaInputPage`
  - `/dashboard` → `DashboardPage`
  - `/pitch-preview` → `PitchPreviewPage`
- [x] Audited all 15 active `navigate(...)` calls across all components and pages in `frontend/src/`.
- [x] Corrected stale route `/input` → `/start` in `frontend/src/pages/DashboardPage.js` (empty state "Generate New Plan" CTA).
- [x] Corrected stale route `/input` → `/start` in `frontend/src/pages/PitchPreviewPage.js` (empty state "Generate New Plan" CTA).
- [x] Aligned `frontend/src/components/Header.js`:
  - Activated desktop navigation links for `/dashboard` and `/pitch-preview` (allowing navigation between Dashboard and Pitch Preview).
  - Removed dead link to `/my-plans` from mobile navigation (aligning with desktop where history feature is deferred to Phase 2).
- [x] Verified `/canvas` is an internal tab identifier in `DashboardPage.js` (`activeTab === 'canvas'`), not an invalid router path.
- [x] Created comprehensive test suite in `backend/tests/frontendRoutes.test.js`:
  - Discovers canonical routes dynamically from `App.js`.
  - Scans all frontend files for active `navigate()` calls and asserts 100% of targets belong to the canonical route set.
  - Verifies zero references to invalid paths (`/input`, `/canvas`, `/my-plans`).
  - Verifies reachability of all registered canonical routes.
  - Verifies `Router.js` history simulation (`pushState`, `popstate`).
  - Verifies empty-state buttons and header navigation.
- [x] Updated `backend/package.json` test script to include `frontendRoutes.test.js`.
- [x] Verified full regression pass: backend syntax clean, all 4 backend test suites pass (controllers, USP, MVP storage, frontend routing), and frontend production build compiles cleanly.

---

## 8. Next Chunk

**Chunk 1.5 — End-to-End Generation Testing**
- Validate end-to-end business plan generation flow with structured error handling and resilient retry/rate-limit recovery.

---

## 9. Future Roadmap

- **Chunk 1.1**: Fix Critical Backend Controller Argument Bugs (Completed)
- **Chunk 1.2**: Fix USP Payload Mismatch & Standardize Request Schemas (Completed)
- **Chunk 1.3**: Fix MVP localStorage Data Truncation (Completed)
- **Chunk 1.4**: Fix Frontend Routing Inconsistencies (Completed)
- **Chunk 1.5**: End-to-End Generation Testing
- **Phase 2**: Backend Database Persistence (User Accounts & Plan History)
- **Phase 3**: Pitch Deck Export (PDF / PowerPoint) & Sharing
- **Phase 4**: Production Hardening, Test Suite Modernization & CI/CD

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `5a06ab5` (Milestone Chunk 1.3)
- **Chunk Milestone Commit**: `6c4007c` (Milestone Chunk 1.4)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000. |
| **Backend Unit Tests** | PASS | `npm test` passed controller argument, USP data-flow, MVP storage persistence, and frontend routing tests. |
| **USP Prompt Verification** | PASS | Tested all 6 models in `uspDataFlow.test.js`: prompt strings contain `data.usp` without undefined/fallback. |
| **MVP Storage Verification** | PASS | `backend/tests/mvpStorage.test.js`: verifies complete MVP object retention, reproduces regression, and tests consumers + legacy fallback. |
| **Frontend Routing Verification** | PASS | `backend/tests/frontendRoutes.test.js`: 100% of active `navigate()` calls map to canonical routes; no stale `/input`, `/canvas`, or `/my-plans` references. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly (`main.7412d32b.js`). |
| **Gemini Live Generation** | BLOCKED (429/503) | Google upstream rate limits (5 RPM free tier) and model demand spikes. |

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
