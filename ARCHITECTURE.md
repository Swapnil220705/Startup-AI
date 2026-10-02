# Startup-AI Architecture Documentation

This document describes the verified architecture and technical flow of the Startup-AI application as of Chunk 0.1.

---

## 1. High-Level Architecture Overview

```text
User / Browser (React 19 Frontend)
   │
   │  Parallel HTTP POST Requests (Axios)
   ▼
Express 5.1 Backend Server (Port 4000)
   │
   │  Route Dispatch (`/api/*`)
   ▼
Express Routes (`routes/*.js`)
   │
   │  Controller Handlers
   ▼
Controllers (`controllers/*.js`)
   │
   │  Prompt Construction & Model Execution
   ▼
AI Model Modules (`models/*.js`)
   │
   │  Google Generative Language REST API (`generateContent`)
   ▼
Google Gemini API (`gemini-3.8-flash`)
   │
   │  JSON Response
   ▼
Frontend Storage & Presentation (`localStorage` -> `DashboardPage.js`)
```

---

## 2. Directory Structure

```text
Startup-AI/
├── .gitignore                   # Root-level ignore rules for frontend and backend
├── README.md                    # Project intro
├── ARCHITECTURE.md              # System architecture (this document)
├── MODELS.md                    # AI models and configuration
├── PROJECT_STATE.md             # Single source of truth for project lifecycle
├── backend/
│   ├── .env                     # Backend environment configuration (GEMINI_API_KEY, AI_URL)
│   ├── index.js                 # Express application entry point (port 4000)
│   ├── listModels.js            # Utility script querying Google AI Studio models
│   ├── package.json             # Backend dependencies (Express, Axios, Dotenv, Cors)
│   ├── controllers/             # Route controllers handling HTTP req/res
│   │   ├── competitorController.js
│   │   ├── leanCanvasController.js
│   │   ├── mvpController.js
│   │   ├── personaController.js
│   │   ├── pitchController.js
│   │   └── revenueController.js
│   ├── keys/                    # Service account keys (gitignored)
│   │   └── gemini-service-account.json
│   ├── models/                  # AI prompt definition and Gemini REST callers
│   │   ├── competitorsModel.js
│   │   ├── leanCanvas.js
│   │   ├── mvpGenerator.js
│   │   ├── personasModel.js
│   │   ├── pitchModel.js
│   │   └── revenueModel.js
│   ├── routes/                  # Express router definitions
│   │   ├── competitors.js
│   │   ├── leanCanvas.js
│   │   ├── mvp.js
│   │   ├── personas.js
│   │   ├── pitch.js
│   │   └── revenue.js
│   ├── services/
│   │   └── aiService.js         # Legacy auxiliary service for external AI server
│   └── utils/                   # Empty directory for utility helpers
└── frontend/
    ├── package.json             # React 19, Tailwind CSS, Lucide React, Framer Motion
    ├── tailwind.config.js       # Tailwind CSS configuration
    ├── postcss.config.js        # PostCSS configuration
    ├── public/                  # Static assets and index.html
    └── src/
        ├── App.js               # Root component with ThemeProvider and Router
        ├── App.css              # Root styling
        ├── index.js             # React DOM entry point
        ├── index.css            # Tailwind directives
        ├── components/
        │   ├── Header.js        # Global navigation header with theme toggle
        │   └── DashboardTabs.js # Tab views for Lean Canvas, MVP, Revenue, Personas, etc.
        ├── pages/
        │   ├── LandingPage.js   # Hero landing page
        │   ├── IdeaInputPage.js # Startup intake form triggering parallel generation
        │   ├── DashboardPage.js # Main output dashboard rendering tabs
        │   ├── HistoryPage.js   # History page component (commented route)
        │   └── PitchPreviewPage.js # Pitch deck preview slide deck
        └── utils/
            ├── Router.js        # Custom lightweight pushState/popState router
            ├── ThemeContext.js  # Light/dark mode React context
            └── mockData.js      # Mock data fallbacks and industry list
```

---

## 3. End-to-End Request Flow

1. **User Intake**:
   - The user navigates to `/start` (`IdeaInputPage.js`) and fills in the startup inputs: name, domain/industry, problem, solution, target audience, and unique selling proposition (USP).
2. **Parallel Generation Dispatch**:
   - Upon form submission, `IdeaInputPage.js` executes 6 parallel HTTP POST requests using `Promise.all`:
     - `POST http://localhost:4000/api/lean-canvas`
     - `POST http://localhost:4000/api/mvp`
     - `POST http://localhost:4000/api/revenue`
     - `POST http://localhost:4000/api/pitch`
     - `POST http://localhost:4000/api/personas`
     - `POST http://localhost:4000/api/competitors`
3. **Backend Routing & Controllers**:
   - Express receives requests on `port 4000` via `backend/index.js`.
   - Each route delegates to its controller:
     - `leanCanvasController.js` and `mvpController.js` invoke model functions directly with `inputData`.
     - *Known Issue*: `competitorController.js`, `personaController.js`, `pitchController.js`, and `revenueController.js` currently pass legacy endpoint arguments (e.g., `generateCompetitors('/competitors', inputData)`), scheduled for fix in Chunk 1.1.
4. **AI Generation (Gemini REST)**:
   - Each module in `backend/models/*.js` constructs domain-specific prompts instructing the model to output strict JSON.
   - A direct HTTP POST is dispatched via `axios` to the Google AI Studio Generative Language endpoint:
     `https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`
   - The raw response text is extracted from `response.data.candidates[0].content.parts[0].text`, sanitized of markdown fences (` ```json `), parsed with `JSON.parse()`, and returned to the controller.
5. **Persistence & Presentation**:
   - The frontend receives the 6 JSON responses.
   - Responses are serialized into browser `localStorage`:
     - `localStorage.setItem('formData', ...)`
     - `localStorage.setItem('leanCanvas', ...)`
     - `localStorage.setItem('mvp', ...)`
     - `localStorage.setItem('revenue', ...)`
     - `localStorage.setItem('pitch', ...)`
     - `localStorage.setItem('personas', ...)`
     - `localStorage.setItem('competitors', ...)`
   - The user is navigated to `/dashboard` (`DashboardPage.js`), which reads from `localStorage` and presents the modules across interactive tabs.

---

## 4. Key Architectural Patterns

- **Stateless Backend**: The Express backend does not maintain sessions or database connections; each endpoint functions as a stateless transformation and proxy to Gemini.
- **Client-Side State Storage**: The application currently relies on browser `localStorage` as its primary storage mechanism.
- **Custom Client Routing**: Navigation uses a custom HTML5 History API router (`Router.js`) instead of `react-router-dom` (which is installed in `package.json` but not used in `App.js`).
