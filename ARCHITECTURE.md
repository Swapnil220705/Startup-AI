# Startup-AI Architecture Documentation

This document describes the verified architecture and technical flow of the Startup-AI application as of Chunk 3.1.

---

## 1. High-Level Architecture Overview

```text
User / Browser (React 19 Frontend)
   │
   │  1. Parallel HTTP POST Requests (Axios)
   ▼
Express 5.1 Backend Server (Port 4000)
   │
   │  2. Route Dispatch (`/api/*`)
   ▼
Express Routes (`routes/*.js`)
   │
   │  3. Controller Handlers
   ▼
Controllers (`controllers/*.js`)
   │
   │  4. Prompt Construction & Centralized Gemini Client
   ▼
AI Model Modules (`models/*.js`) ──► Gemini Client (`services/geminiClient.js`) ──► Google Gemini API (`gemini-3.8-flash`)
   │                                                                                     │
   │  5. Robust JSON Parser (`utils/jsonParser.js`)                                      ▼
   ▼                                                                                JSON Responses
Presentation Layer (`localStorage` / `DashboardPage.js`)
   │
   │  6. Plan Persistence API (`POST /api/plans`, `GET /api/plans/:id`)
   ▼
Plan Service (`services/planService.js`)
   │
   │  7. Prepared Statements (WAL Mode, Parameterized SQL)
   ▼
SQLite Database (`backend/data/startup_ai.db`)
```

---

## 2. Directory Structure

```text
Startup-AI/
├── .gitignore                   # Root-level ignore rules (frontend, backend, database files)
├── README.md                    # Project intro
├── ARCHITECTURE.md              # System architecture (this document)
├── MODELS.md                    # AI models, configuration, and data structures
├── PROJECT_STATE.md             # Single source of truth for project lifecycle
├── backend/
│   ├── .env                     # Backend environment configuration (GEMINI_API_KEY, DATABASE_PATH)
│   ├── index.js                 # Express application entry point (port 4000, DB init)
│   ├── package.json             # Backend dependencies & test scripts
│   ├── controllers/             # Route controllers handling HTTP req/res
│   │   ├── competitorController.js
│   │   ├── leanCanvasController.js
│   │   ├── mvpController.js
│   │   ├── personaController.js
│   │   ├── pitchController.js
│   │   ├── planController.js    # Plan persistence controller (Chunk 3.1)
│   │   └── revenueController.js
│   ├── db/                      # Database connection and migration layer (Chunk 3.1)
│   │   ├── database.js          # SQLite connection manager, pragma configuration, lifecycle
│   │   ├── migrate.js           # Transactional migration runner with schema_migrations tracking
│   │   └── migrations/          # Explicit SQL migration files
│   │       └── 001_create_plans_table.sql
│   ├── data/                    # Local development SQLite databases (gitignored)
│   ├── models/                  # AI prompt definitions and Gemini REST callers
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
│   │   ├── plans.js             # Plan persistence routes (POST /, GET /, GET /:id)
│   │   └── revenue.js
│   ├── services/
│   │   ├── geminiClient.js      # Centralized Gemini HTTP client with retries, backoff, and limiter
│   │   ├── planService.js       # Plan persistence service & repository abstraction
│   │   └── aiService.js         # Legacy auxiliary service
│   ├── utils/
│   │   ├── apiError.js          # Standardized API error contract utility
│   │   └── jsonParser.js        # Robust Gemini JSON parser utility
│   └── tests/                   # Zero-dependency deterministic test suites
│       ├── controllers.test.js
│       ├── e2eGenerationFlow.test.js
│       ├── frontendPersistenceIntegration.test.js # Frontend persistence integration test suite
│       ├── frontendRoutes.test.js
│       ├── geminiClient.test.js
│       ├── jsonParser.test.js
│       ├── mvpStorage.test.js
│       ├── partialGeneration.test.js
│       ├── persistence.test.js  # Plan persistence & database test suite
│       ├── planHistory.test.js  # Plan history listing, pagination & UI logic test suite
│       └── uspDataFlow.test.js
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
        │   ├── Header.js        # Global navigation header (Dashboard, My Plans, Pitch Deck)
        │   └── DashboardTabs.js # Tab views with defensive fallback cards
        ├── pages/
        │   ├── LandingPage.js   # Hero landing page
        │   ├── IdeaInputPage.js # Startup intake form triggering parallel generation
        │   ├── DashboardPage.js # Main output dashboard with partial generation alert
        │   ├── HistoryPage.js   # Real API-backed saved plan history & pagination page
        │   └── PitchPreviewPage.js # Pitch deck preview slide deck
        └── utils/
            ├── Router.js        # Custom lightweight pushState/popState router
            ├── ThemeContext.js  # Light/dark mode React context
            └── mockData.js      # Mock data fallbacks and industry list
```

---

## 3. Database & Persistence Architecture (Chunk 3.1)

### 3.1 Technology Selection: SQLite (`better-sqlite3`)
- **Zero External Infrastructure**: Operates embedded in-process; requires no database daemons, container setup, or external cloud dependencies for local development and CI testing.
- **Synchronous & High Performance**: Powered by `better-sqlite3`, providing C++ bindings directly into SQLite, prepared statements, and synchronous execution that avoids async connection overhead for single-node Express.
- **WAL Mode & Foreign Keys**: Configured with `PRAGMA foreign_keys = ON` and `PRAGMA journal_mode = WAL` (Write-Ahead Logging), allowing concurrent read operations without blocking writes.
- **Test Isolation**: Supports `:memory:` databases, allowing test suites to spin up an isolated, fully migrated database in RAM in < 1ms, perform assertions, and teardown cleanly without touching the developer's local `startup_ai.db`.
- **PostgreSQL Migration Path**: The SQL schema and queries adhere to standard ANSI SQL (`TEXT`, `INTEGER`, `TIMESTAMPTZ`, `JSONB`). Repositories use parameterized queries that map directly to PostgreSQL drivers (`pg` / `knex` pool) when moving to multi-server production deployment.

### 3.2 Schema Design: Single `plans` Table with JSON Columns
Rather than over-normalizing six rapidly evolving generative AI documents into dozens of brittle relational tables, each startup plan is stored in a cohesive record with JSON/TEXT columns:

```sql
CREATE TABLE IF NOT EXISTS plans (
  id TEXT PRIMARY KEY NOT NULL,             -- Server-generated UUID v4
  startup_name TEXT NOT NULL,               -- Required business name
  industry TEXT,                           -- Startup domain/industry
  problem TEXT,                            -- Problem statement
  solution TEXT,                           -- Solution description
  target_audience TEXT,                    -- Target customer segment
  usp TEXT,                                -- Unique Selling Proposition
  lean_canvas TEXT,                        -- JSON-serialized Lean Canvas
  mvp TEXT,                                -- JSON-serialized MVP Roadmap
  revenue TEXT,                            -- JSON-serialized Revenue Model
  pitch TEXT,                              -- JSON-serialized Pitch
  personas TEXT,                           -- JSON-serialized User Personas
  competitors TEXT,                        -- JSON-serialized Competitors
  generation_status TEXT NOT NULL DEFAULT 'completed', -- 'completed' | 'partial' | 'failed'
  generation_errors TEXT,                  -- JSON-serialized error metadata (if partial)
  created_at TEXT NOT NULL,                -- ISO-8601 UTC timestamp
  updated_at TEXT NOT NULL                 -- ISO-8601 UTC timestamp
);

CREATE INDEX IF NOT EXISTS idx_plans_created_at ON plans(created_at DESC);
```

### 3.3 Key Architectural Decisions
1. **Server-Side UUID v4 Identifier**:
   - Every plan receives a stable, cryptographically random, URL-safe UUID generated on the server via Node's native `crypto.randomUUID()`.
   - Client-provided IDs are strictly ignored during creation to prevent ID spoofing.
2. **Deterministic Migration System**:
   - Migrations live in `backend/db/migrations/` as numbered SQL files (`001_create_plans_table.sql`).
   - `backend/db/migrate.js` tracks applied migrations in `schema_migrations`, executing each inside an atomic transaction.
3. **Layered Repository Pattern**:
   - Controllers (`controllers/planController.js`) delegate to `services/planService.js`, which manages serialization, deserialization, status computation, and prepared statement execution. Controllers contain no raw SQL.
4. **Structured Error Contract**:
   - Persistence endpoints adhere to the API error contract established in Chunk 2.3:
     `{ "success": false, "error": { "code": "...", "message": "..." } }`.
   - Internal SQLite errors and stack traces are suppressed and logged server-side, returning safe generic messages to the client.

---

## 4. End-to-End Persistence API

| Method | Endpoint | Description | Status Code | Response Shape |
|---|---|---|---|---|
| `POST` | `/api/plans` | Create and persist a startup plan | `201 Created` | `{ success: true, data: { id, startupName, ... } }` |
| `GET` | `/api/plans` | List plans with pagination (`?limit=50&offset=0`) | `200 OK` | `{ success: true, data: { plans: [...], total, limit, offset } }` |
| `GET` | `/api/plans/:id` | Retrieve single plan by UUID | `200 OK` / `404 Not Found` | `{ success: true, data: { id, ... } }` |

---

## 5. Storage Strategy & Frontend Boundary (Chunk 3.2)

### 5.1 Transitional Architecture
To ensure seamless product reliability without breaking existing workflows or splitting state across half-migrated sources, Chunk 3.2 establishes a dual-tier transition architecture:
1. **Server Database (`plans` table in SQLite)**: The persistent source of truth for all generated startup plans. Every successful or partial generation is saved to the database via `POST /api/plans` and assigned a server-generated UUID v4.
2. **Client Browser (`localStorage`)**: The active, current-session state layer for the dashboard and pitch preview. `localStorage` continues to hold the current session's generated modules to avoid jarring state disruptions.

### 5.2 Generation to Persistence Flow
```text
User Submits Idea Form (IdeaInputPage)
         │
         │  1. Purges Stale Keys (including currentPlanId and planPersistenceStatus)
         │  2. Dispatches 6 parallel Gemini requests via Promise.allSettled
         ▼
Settled Results Evaluation
   ├─► 0/6 Succeeded: Halts navigation, alerts user, NO plan created, NO POST /api/plans
   └─► 1-6 Succeeded:
         │
         ├─► Writes successful modules to localStorage (never fabricating missing modules)
         ├─► Records generationErrors metadata if 1-5 succeeded
         ├─► Constructs validated plan payload adhering to schema
         │
         ▼
   POST /api/plans (Backend Persistence)
         ├─► Success:
         │     Stores server-generated UUID in `localStorage.currentPlanId`
         │     Sets `localStorage.planPersistenceStatus = 'saved'`
         └─► Failure:
               Preserves all local generated data (never lost!)
               Removes `currentPlanId` (never stores fake IDs)
               Sets `localStorage.planPersistenceStatus = 'save_failed'`
         │
         ▼
   navigate('/dashboard')
         │
         ├─► Reads current session data from localStorage
         ├─► Reads `currentPlanId` and `planPersistenceStatus`
         ├─► Asynchronously verifies plan existence via `GET /api/plans/:id`
         ├─► Displays status badge ("Saved to Database" or "Session Only")
         └─► Displays non-intrusive warning notice if database persistence failed
```

### 5.3 Storage Key Lifecycle
- **Keys Managed**: `leanCanvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`, `generationErrors`, `currentPlanId`, `planPersistenceStatus`.
- **Stale Data Protection**: All 9 keys are wiped at the start of every new generation run, preventing previous plan IDs or modules from masquerading as current results.
- **Double-Submit Protection**: The form submission is guarded with `if (isLoading) return;` and the CTA button is disabled while requests are in flight.

---

## 6. Plan History & Browsing Architecture (Chunk 3.3)

### 6.1 Route & View Architecture
- **Canonical Route**: `/my-plans`
- **Component**: `frontend/src/pages/HistoryPage.js`
- **Global Header**: Accessible via desktop nav and mobile dropdown (`Header.js`) between Dashboard and Pitch Deck.
- **API Endpoint Consumed**: `GET /api/plans?limit=6&offset=0`

### 6.2 Plan Summaries & Performance Optimization
- To prevent heavy payload bloat when browsing history, the backend query (`SELECT ... FROM plans`) excludes the six large JSON trees (`leanCanvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`).
- Returns lightweight summary rows containing: `id`, `startupName`, `industry`, `problem`, `solution`, `targetAudience`, `usp`, `generationStatus`, `createdAt`, `updatedAt`.
- Deterministic newest-first ordering: `ORDER BY created_at DESC, rowid DESC`.

### 6.3 Pagination
- **Server Parameters**: `limit` (default 50, client uses 6 for balanced grid) and `offset` (0, 6, 12...).
- **Response**: `{ plans: [...], total, limit, offset }`.
- **Client Controls**:
  - Showing `{start} to {end} of {total} saved plans`.
  - Previous button: disabled when `offset === 0`.
  - Next button: disabled when `offset + limit >= total`.
  - Hidden when `total === 0`.

### 6.4 State Machine & UX States
1. **Loading State**: Displays spinner while fetching plans asynchronously.
2. **Error State**: Surfaces non-intrusive alert box if the backend or database is unreachable, with a "Retry" button.
3. **Empty State**: Displays an illustrated placeholder with a "Create Your First Plan" button navigating to `/start`.
4. **Populated State**: Displays cards with startup name, industry tag, created date, problem snippet, and color-coded status badges:
   - `completed`: Green pill with `CheckCircle2`
   - `partial`: Amber pill with `AlertTriangle`
   - `failed`: Rose pill with `XCircle`

### 6.5 Plan Selection & Chunk 3.4 Boundary
- **Current Role**: Chunk 3.3 is strictly focused on **history browsing and summary inspection**.
- **Open Plan Action**: The "Open Plan" button establishes the navigation path (`navigate('/dashboard')`).
- **Deferred to Chunk 3.4**: Arbitrary plan loading, full-plan detail retrieval (`GET /api/plans/:id`), populating the active dashboard, syncing `currentPlanId`, and reopening past plans belong to Chunk 3.4. LocalStorage remains the current-session rendering source in this chunk.


