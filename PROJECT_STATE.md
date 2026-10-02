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

1. **Backend Controller Argument Bugs** (*Scheduled for Chunk 1.1*):
   - In `competitorController.js`, `personaController.js`, `pitchController.js`, and `revenueController.js`, controllers call `generate*(endpoint, inputData)` with two arguments instead of one. As a result, `data` in each model evaluates to the endpoint string rather than the input object.
2. **USP Payload Mismatch**:
   - `frontend/src/pages/IdeaInputPage.js` sends `uniqueValueProposition: formData.usp`, while `backend/models/*.js` expect `data.usp`. As a result, the USP resolves to `undefined` in the prompts.
3. **Absence of Persistent Storage**:
   - Plans are only stored in the user's browser `localStorage`. Clearing cache or switching devices leads to permanent data loss.
4. **CRA / Jest Test Configuration**:
   - Default CRA test `App.test.js` fails due to Jest ESM parsing on `axios` inside `node_modules`.
5. **Google Cloud Project Access Block (403)**:
   - The current API key in `backend/.env` encounters `403 Forbidden: "Your project has been denied access. Please contact support."` on `generateContent` across all models due to an account/project-level Google Cloud hold. Token counting (`countTokens`) and model queries (`listModels`) function normally.

---

## 6. Current Status

- **Phase**: Phase 0 — Baseline & Foundation
- **Current Chunk**: Chunk 0.1 — Baseline Audit + Project Documentation + Gemini Model Upgrade
- **Status**: Completed

---

## 7. Completed in Current Chunk (Chunk 0.1)

- [x] Performed exhaustive codebase inspection across frontend, backend, configuration, and git history.
- [x] Audited Gemini configuration and identified active REST endpoints across all 6 backend modules.
- [x] Verified Google API model availability: confirmed `gemini-2.5-flash` deprecation notice from Google and confirmed `gemini-3.8-flash` availability.
- [x] Upgraded model configuration from `gemini-2.5-flash` to `gemini-3.8-flash` across all 6 backend model files.
- [x] Created `ARCHITECTURE.md` detailing system architecture, directory structure, and request flow.
- [x] Created `MODELS.md` documenting active model specs, generation settings, and migration history.
- [x] Created `PROJECT_STATE.md` as the single source of truth for future AI-assisted development.
- [x] Verified frontend build passes (`npm run build` exits code 0).
- [x] Verified backend server starts cleanly (`node index.js` on port 4000).

---

## 8. Next Chunk

**Chunk 1.1 — Fix Critical Backend Controller Argument Bugs**
- Align arguments in `competitorController.js`, `personaController.js`, `pitchController.js`, and `revenueController.js` to pass `inputData` directly to models.

---

## 9. Future Roadmap

- **Chunk 1.1**: Fix Critical Backend Controller Argument Bugs
- **Chunk 1.2**: Fix USP Payload Mismatch & Standardize Request Schemas
- **Chunk 1.3**: Resolve Gemini API Access / Key Credentials & Add Structured Error Handling
- **Phase 2**: Backend Database Persistence (User Accounts & Plan History)
- **Phase 3**: Pitch Deck Export (PDF / PowerPoint) & Sharing
- **Phase 4**: Production Hardening, Test Suite Modernization & CI/CD

---

## 10. Git State

- **Branch**: `main`
- **Pre-Chunk Commit**: `960e545 update: refined UI and optimized Gemini model prompts`
- **Chunk Milestone Commit**: `2b40bcd` (Milestone Chunk 0.1)

---

## 11. Verification Log

| Verification Check | Result | Details |
|---|---|---|
| **Backend Syntax** | PASS | Checked syntax on all 6 modified model files with `node -c`. |
| **Backend Startup** | PASS | `node index.js` runs cleanly on port 4000 with environment variables loaded. |
| **Frontend Build** | PASS | `npm run build` succeeds, generating production bundle. |
| **Frontend Tests** | FAIL | Default `App.test.js` failed due to CRA Jest ESM parsing issue with Axios. Unrelated bug deferred. |
| **Gemini Model Query** | PASS | `gemini-3.8-flash` verified available on `https://generativelanguage.googleapis.com/v1/models`. |
| **Gemini Token Count** | PASS | `countTokens` on `gemini-3.8-flash` succeeded with HTTP 200. |
| **Gemini Generation** | BLOCKED (403) | Key project encounters `403 Forbidden: Your project has been denied access.` Configured `gemini-3.8-flash` per user directive. |

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
