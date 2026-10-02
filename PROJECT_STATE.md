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
| **Backend Testing** | Zero-dependency Node.js test suite (`backend/tests/controllers.test.js`) |
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

1. **USP Payload Mismatch** (*Scheduled for Chunk 1.2*):
   - `frontend/src/pages/IdeaInputPage.js` sends `uniqueValueProposition: formData.usp`, while `backend/models/*.js` expect `data.usp`. As a result, the USP resolves to `undefined` in prompt generation.
2. **Absence of Persistent Storage**:
   - Plans are only stored in the user's browser `localStorage`. Clearing cache or switching devices leads to permanent data loss.
3. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules`.
4. **Upstream Gemini Free-Tier Quota & Demand Restrictions (429/503)**:
   - When generating all 6 modules simultaneously, the free-tier quota (5 requests per minute) on `gemini-3.8-flash` triggers `429 RESOURCE_EXHAUSTED` or temporary high demand `503 UNAVAILABLE` from Google's servers.

---

## 6. Current Status

- **Phase**: Phase 1 — Core Backend & Data Flow Fixes
- **Current Chunk**: Chunk 1.1 — Fix Critical Backend Controller Argument Bugs
- **Status**: Completed

---

## 7. Completed in Current Chunk (Chunk 1.1)

- [x] Inspected all 4 problematic controllers (`competitorController.js`, `personaController.js`, `pitchController.js`, `revenueController.js`) and verified their models expect `(data)`.
- [x] Fixed `competitorController.js`: Changed `generateCompetitors('/competitors', inputData)` to `generateCompetitors(inputData)`.
- [x] Fixed `personaController.js`: Changed `generatePersonas('/personas', inputData)` to `generatePersonas(inputData)`.
- [x] Fixed `pitchController.js`: Changed `generatePitch('/pitch', inputData)` to `generatePitch(inputData)`.
- [x] Fixed `revenueController.js`: Changed `generateRevenue('/revenue', inputData)` to `generateRevenue(inputData)`.
- [x] Added automated unit tests in `backend/tests/controllers.test.js` validating that each controller passes `req.body` directly without endpoint strings.
- [x] Configured `"test": "node tests/controllers.test.js"` in `backend/package.json` with 0 external dependencies.
- [x] Executed regression checks on backend startup, endpoint routing, and frontend build.

---

## 8. Next Chunk

**Chunk 1.2 — Fix USP Payload Field Mismatch**
- Resolve the key mismatch between frontend payload (`uniqueValueProposition`) and backend model expectations (`data.usp`).

---

## 9. Future Roadmap

- **Chunk 1.1**: Fix Critical Backend Controller Argument Bugs (Completed)
- **Chunk 1.2**: Fix USP Payload Mismatch & Standardize Request Schemas
- **Chunk 1.3**: Resolve Gemini API Access / Key Credentials & Add Structured Error Handling
- **Phase 2**: Backend Database Persistence (User Accounts & Plan History)
- **Phase 3**: Pitch Deck Export (PDF / PowerPoint) & Sharing
- **Phase 4**: Production Hardening, Test Suite Modernization & CI/CD

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `b531f3f chore: establish project baseline and upgrade Gemini model to gemini-3.8-flash`
- **Chunk Milestone Commit**: da443f (Milestone Chunk 1.1)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | All backend JS files checked with `node -c`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000. |
| **Backend Unit Tests** | PASS | `npm test` in `backend` passed all 4 controller argument tests. |
| **Live API Endpoint Routing** | PASS | Live POST requests reach the controllers and invoke models with data. |
| **Frontend Production Build** | PASS | `npm run build` succeeds cleanly. |
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
