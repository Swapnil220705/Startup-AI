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
        │   ├── Header.js        # Global navigation header with auth state & user menu
        │   ├── DashboardTabs.js # Tab views with defensive fallback cards
        │   └── AuthModal.js     # Google GIS & Email Sign In / Sign Up modal
        ├── context/
        │   └── AuthContext.js   # Centralized auth state & session provider
        ├── services/
        │   └── api.js           # Centralized Axios client (withCredentials) & error formatting
        ├── pages/
        │   ├── LandingPage.js   # Hero landing page
        │   ├── IdeaInputPage.js # Startup intake form triggering parallel generation & 403 handling
        │   ├── DashboardPage.js # Main output dashboard with anonymous trial banner & claim flow
        │   ├── HistoryPage.js   # Real API-backed saved plan history & anonymous sign-in state
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
| `PATCH` | `/api/plans/:id` | Update plan metadata fields | `200 OK` / `400 Bad Request` / `404 Not Found` | `{ success: true, data: { id, startupName, ... } }` |
| `DELETE` | `/api/plans/:id` | Delete plan by UUID | `200 OK` / `404 Not Found` | `{ success: true, data: { id, deleted: true } }` |

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

### 6.5 Plan Selection (Chunk 3.3 & Chunk 3.4)
- **History Browsing**: Displays saved plan cards with status badges and timestamps.
- **Open Plan Action**: Navigates to `/dashboard?plan=<UUID>` passing the selected plan's server-generated ID as a URL query parameter.

---

## 7. Plan Re-Opening & Hydration Architecture (Chunk 3.4)

### 7.1 Re-Opening Flow Overview

```text
User clicks "Open Plan" on HistoryPage (/my-plans)
                     │
                     ▼
      navigate('/dashboard?plan=<UUID>')
                     │
                     ▼
Router captures pathname + search; App.js resolves route to '/dashboard'
                     │
                     ▼
DashboardPage detects `plan` query parameter in currentPath
                     │
         ┌───────────┴───────────┐
         │                       │
   [plan query present]    [no query param]
         │                       │
         ▼                       ▼
  GET /api/plans/:id       loadFromLocalStorage()
         │                 (Direct /dashboard navigation:
         │                  preserves active session state)
    ┌────┴───────────────────────────┐
    │                                │
    ▼                                ▼
[HTTP 200 OK]             [HTTP 404 / Network Error]
    │                                │
    │ 1. Stale-State Purge           ├─► 404: "Plan Not Found" screen with CTAs to /my-plans & /start
    │    (clears 10 plan keys)       └─► 5xx/Network: "Failed to Load Plan" error screen with Retry
    │
    │ 2. Restore formData
    │    (name, domain, problem, solution, audience, usp)
    │
    │ 3. Restore Generated Modules
    │    (leanCanvas, mvp, revenue, pitch, personas, competitors)
    │
    │ 4. Restore generationErrors (if partial plan)
    │
    │ 5. Set currentPlanId = serverId
    │    Set planPersistenceStatus = 'saved'
    │
    ▼
Render Dashboard with restored state & green "Saved to Database" badge
```

### 7.2 Router & Navigation Mechanism
- **Lightweight History API Integration**: `frontend/src/utils/Router.js` preserves query parameters by tracking `window.location.pathname + window.location.search` in `currentPath`.
- **Base Route Matching**: `frontend/src/App.js` splits `currentPath` on `?` (`const basePath = (currentPath || '').split('?')[0];`), allowing canonical routes such as `/dashboard` to resolve correctly while passing the complete `currentPath` prop down to page components.
- **Zero URL Bloat**: Uses standard query string `/dashboard?plan=<UUID>`. Direct `/dashboard` visits without query parameters remain 100% backward-compatible.

### 7.3 Stale Data Isolation & Key Lifecycle
Before writing historical plan data into active storage, `DashboardPage` cleanses all previous plan data to prevent partial plans from inheriting modules of previously viewed complete plans.

**Purged and Restored Keys**:
1. `formData`: Restored to canonical frontend shape:
   - `startupName` → `formData.name`
   - `industry` → `formData.domain`
   - `problem` → `formData.problem`
   - `solution` → `formData.solution`
   - `targetAudience` → `formData.audience`
   - `usp` → `formData.usp`
2. `leanCanvas`: JSON object (or null)
3. `mvp`: JSON object (or null)
4. `revenue`: JSON object (or null)
5. `pitch`: JSON object (or null)
6. `personas`: JSON object (or null)
7. `competitors`: JSON object (or null)
8. `generationErrors`: Error metadata array (or null if completed)
9. `currentPlanId`: Restored to `plan.id` (server-generated UUID)
10. `planPersistenceStatus`: Restored to `'saved'`

Unrelated browser storage (such as `theme`) is left completely untouched.

### 7.4 Why `localStorage` Remains the Dashboard State Layer
1. **Zero UI Rewrite**: Dashboard tab components and `PitchPreviewPage` read synchronously from `localStorage`. Hydrating `localStorage` upon reopening allows all existing visualizer components to function without introducing complex asynchronous fetching into every tab.
2. **Offline Resilience**: Once re-opened, navigating between Dashboard tabs and Pitch Preview requires zero subsequent network calls.
3. **Clear Transition Path**: Maintains a clean boundary where the SQLite database is the persistent system of record and `localStorage` is the active working memory.

### 7.5 Partial Plan Handling
- When re-opening a plan with `generationStatus = 'partial'`, successful modules are restored to their respective keys, while failed modules remain `null`.
- `generationErrors` is written to `localStorage.generationErrors`.
- The existing partial generation banner and defensive tab fallback cards in `DashboardTabs.js` render seamlessly without modification.

### 7.6 Error & Not-Found Boundary
- **404 Not Found**: If an invalid or deleted UUID is provided, `DashboardPage` catches the 404, clears any invalid `currentPlanId`, and renders a styled "Plan Not Found" screen with navigation CTAs back to `/my-plans` or `/start`.
- **Network / Server Failure**: If the backend is unreachable or returns a 5xx error, a "Failed to Load Plan" screen is displayed with an interactive "Try Again" retry action and "Back to My Plans" CTA, without crashing the application or corrupting existing session data.

---

## 8. Plan Lifecycle Management: Update, Delete & Session Consistency (Chunk 3.5)

### 8.1 Metadata Mutation (`PATCH /api/plans/:id`)
- **Restricted Mutation Surface**: Allows editing of business metadata fields only: `startupName`, `industry`, `problem`, `solution`, `targetAudience`, and `usp`.
- **Protection of AI Modules**: Primary key (`id`), creation timestamp (`created_at`), generation status (`generation_status`), error metadata (`generation_errors`), and all six generated JSON trees (`leanCanvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`) are strictly immutable through the update endpoint.
- **Validation**: Requires non-empty string for `startupName` if provided; returns structured HTTP 400 `INVALID_INPUT` on invalid or blank names.
- **Timestamp Handling**: Updates `updated_at` to the current ISO-8601 UTC timestamp while preserving `created_at`.
- **Response**: Returns the complete, updated plan document with full module trees.

### 8.2 Safe Plan Deletion (`DELETE /api/plans/:id`)
- **Single Plan Scoping**: Parameterized execution (`DELETE FROM plans WHERE id = ?`) ensures exact single-row deletion without cascade risks.
- **Not-Found Handling**: Returns structured HTTP 404 `PLAN_NOT_FOUND` if the plan does not exist in the database.
- **Response**: Returns `{ success: true, data: { id, deleted: true } }`.

### 8.3 Active Session Invariants & LocalStorage Consistency
To avoid leaving stale data in the browser working state after mutations, the following invariants are enforced:

1. **Current-Plan Deletion**:
   - If the user deletes the plan that is currently loaded in active session (`plan.id === localStorage.getItem('currentPlanId')`):
     - All 10 plan-related localStorage keys are immediately wiped: `formData`, `leanCanvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`, `generationErrors`, `currentPlanId`, `planPersistenceStatus`.
     - The dashboard stops claiming the plan is "Saved to Database".
     - When initiated from `DashboardPage`, safely navigates to `/my-plans`.
2. **Non-Current-Plan Deletion**:
   - Deleting any historical plan from `HistoryPage` that is not currently loaded preserves the active working session completely untouched.
3. **Metadata Synchronization**:
   - When an active plan is edited (from either `HistoryPage` or `DashboardPage`), `localStorage.formData` is synchronized with the new `name`, `domain`, `problem`, `solution`, `audience`, and `usp` values immediately.
   - `currentPlanId` remains unchanged.
4. **Deleted Plan Direct Re-opening**:
   - Navigating to `/dashboard?plan=<deleted-UUID>` gracefully resolves to the "Plan Not Found" screen without application crashes.

### 8.4 User Confirmation & Safety
- **Accidental Deletion Prevention**: Deleting a plan from both `HistoryPage` and `DashboardPage` requires explicit confirmation through a styled modal dialog.
- **Active Session Notice**: The deletion modal explicitly warns the user if the targeted plan is currently open in their active session.

---

## 9. Authentication & Multi-User Plan Architecture (Phase 4)

> [!NOTE]
> **Implementation Status**:
> - **Chunk 4.2 (COMPLETED)**: Database Migration 002 (`users`, `sessions`, `trial_sessions`, `plans.user_id`), Authentication Service (`authService.js`), secure HTTP-only cookie sessions, Google ID token verification (`google-auth-library`), email signup/login/logout/me endpoints, timing-safe scrypt password hashing, and CORS credentials configuration.
> - **Chunk 4.3 (COMPLETED)**: Multi-user plan ownership scoping, anonymous trial cookie (`startup_ai_trial`), 1-plan gatekeeper in `trial_sessions` (`403 TRIAL_LIMIT_REACHED`), secure anonymous plan access control (matching trial cookie required; 404 for unlinked), history isolation (`GET /api/plans` user-filtered or empty for anonymous), authorized `PATCH` / `DELETE` (owner-only with safe 404), and atomic trial plan claiming (`POST /api/plans/claim`) with race-condition defense (`409 PLAN_ALREADY_CLAIMED`).
> - **Chunk 4.4 (PLANNED NEXT)**: Frontend AuthContext, AuthModal, Google Sign-in button, header user profile dropdown, and dashboard claim banner.

### 9.1 High-Level Authentication & Trial Flow

```text
Visitor arrives at Startup-AI
       │
       ├─► Wants to try immediately (Frictionless Onboarding)
       │         │
       │         ▼
       │   Landing Page ──► Enter Idea (/start)
       │         │
       │         ▼
       │   Server verifies/issues Anonymous Trial Cookie (`startup_ai_trial`)
       │   AI Generation Pipeline runs (6 modules in parallel)
       │   Plan persisted with `user_id = NULL` (UUID returned)
       │         │
       │         ▼
       │   Full Dashboard (/dashboard) & Pitch Preview (/pitch-preview) accessible
       │   Banner CTA: "✨ Free Trial Plan • Sign in to save permanently to your account"
       │         │
       │         ▼
       │   User clicks "Save My Startup Plan" (or Sign In / My Plans)
       │         │
       │         ├─► Continue with Google (Primary, Instant)
       │         └─► Email & Password (Secondary)
       │         │
       │         ▼
       │   Authenticated Session Established (Secure HTTP-Only Cookie)
       │   Backend executes atomic plan claim (`POST /api/plans/claim`)
       │   `UPDATE plans SET user_id = :userId WHERE id = :planId AND user_id IS NULL`
       │         │
       │         ▼
       │   Trial plan is now permanently owned by user in `/my-plans`!
       │   (Zero regeneration, zero data loss, zero duplicate copies)
       │
       └─► Returning User / Direct Sign-In
                 │
                 ▼
           Authenticate (Google or Email)
                 │
                 ▼
           Access all owned plans via `/my-plans`
```

### 9.2 User & Account Model

The database user model is designed with strict minimalism, storing only fields strictly required for authentication, display, and foreign key relationships:

| Field | Type | Modifiers | Rationale |
|---|---|---|---|
| `id` | `TEXT` | `PRIMARY KEY NOT NULL` | Cryptographically random UUID v4, immutable internal reference for `plans.user_id` and `sessions.user_id`. |
| `email` | `TEXT` | `NOT NULL UNIQUE` | Canonical lowercase email address used as the unique identity anchor. |
| `name` | `TEXT` | `NULLABLE` | Display name populated from Google profile (`name`) or signup input; used for personalized header greeting. |
| `picture_url` | `TEXT` | `NULLABLE` | Profile avatar URL from Google OAuth (`picture`); rendered in header profile dropdown. |
| `auth_provider` | `TEXT` | `NOT NULL` | `'google'` or `'local'`. Prevents password brute-forcing against OAuth-only accounts. |
| `provider_subject_id` | `TEXT` | `NULLABLE` | Google `sub` claim from ID token. Provides stable mapping even if the user updates their Google primary email. |
| `password_hash` | `TEXT` | `NULLABLE` | Stored only for `'local'` users using Node's native `crypto.scrypt`. Strictly `NULL` for Google OAuth accounts. |
| `created_at` | `TEXT` | `NOT NULL` | ISO-8601 UTC timestamp. |
| `updated_at` | `TEXT` | `NOT NULL` | ISO-8601 UTC timestamp. |

Unnecessary fields (such as enterprise roles, phone numbers, or organizational hierarchy) are explicitly omitted to prevent bloat.

### 9.3 Database Evolution & Migration 002

In adherence to project rules, `001_create_plans_table.sql` remains completely untouched. The schema evolves via `backend/db/migrations/002_add_user_id_to_plans.sql`:

```sql
-- 002_add_user_id_to_plans.sql
-- Users, Sessions, Anonymous Trials & Multi-User Plan Ownership

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT,
  picture_url TEXT,
  auth_provider TEXT NOT NULL,
  provider_subject_id TEXT,
  password_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_provider_sub ON users(auth_provider, provider_subject_id);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,              -- 64-char crypto random token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,                  -- ISO-8601 UTC timestamp
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS trial_sessions (
  id TEXT PRIMARY KEY NOT NULL,              -- UUID cookie value
  plan_id TEXT REFERENCES plans(id) ON DELETE SET NULL,
  ip_hash TEXT,                              -- Salted SHA-256 hash for abuse mitigation
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_trial_sessions_ip ON trial_sessions(ip_hash);

-- Evolve plans table to support multi-user ownership
ALTER TABLE plans ADD COLUMN user_id TEXT REFERENCES users(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_plans_user_id_created ON plans(user_id, created_at DESC);
```

#### Handling Existing Phase 3 Plans:
In SQLite, `ALTER TABLE ... ADD COLUMN` sets existing rows to `NULL`. Plans with `user_id = NULL` are treated as unowned trial plans. This guarantees 100% backward compatibility with all 13 existing test suites and ensures no existing test fixtures break.

### 9.4 Authentication Mechanisms: Google Primary + Email Secondary

#### 1. Google OAuth (Primary)
- **Zero New Heavy Backend Dependencies**: `"google-auth-library": "^10.1.0"` is **already installed** in `backend/package.json`.
- **Frontend Flow**: Uses Google Identity Services (GIS) via official script or button (`google.accounts.id.renderButton`).
- **Token Verification**: Frontend receives a signed Google ID token credential upon user consent and posts it to `POST /api/auth/google`.
- **Backend Verification**:
  ```javascript
  const { OAuth2Client } = require('google-auth-library');
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID
  });
  const payload = ticket.getPayload(); // sub, email, name, picture
  ```
- **Upsert Logic**: If user exists by `provider_subject_id` or `email`, update profile and create session; if new user, create user record and session.

#### 2. Native Email & Password (Secondary)
- **Zero Third-Party Vendor Lock-in**: Implemented using Node.js built-in `crypto` module (`crypto.scryptSync` / `crypto.randomBytes`).
- **Endpoints**: `POST /api/auth/signup` and `POST /api/auth/login`.
- **Validation**: Requires valid email format and password minimum length (8 characters).
- **Password Hashing**: Salted scrypt key derivation with per-user cryptographic salt (`salt:derivedKey` format).

### 9.5 Session Management & Security

```text
Browser                                                     Backend (Express)
   │                                                               │
   │ ── POST /api/auth/google (or /login) ───────────────────────► │
   │                                                               │ 1. Verify credentials
   │                                                               │ 2. Generate crypto session token
   │                                                               │ 3. INSERT INTO sessions (...)
   │ ◄── Set-Cookie: startup_ai_session=xyz; HttpOnly; SameSite=Lax │
   │                                                               │
   │ ── GET /api/plans (Cookie automatically sent) ──────────────► │
   │                                                               │ 1. Read req.cookies.startup_ai_session
   │                                                               │ 2. SELECT * FROM sessions WHERE id = ?
   │                                                               │ 3. Verify expires_at > now
   │                                                               │ 4. Attach req.user
   │ ◄── HTTP 200 { plans: [...] } ─────────────────────────────── │
```

#### Security Architectural Invariants:
1. **No Tokens in `localStorage`**: Storing auth tokens in `localStorage` exposes them to XSS attacks from third-party scripts. The session token is stored exclusively in an **HTTP-only, SameSite=Lax, Secure** (in production) cookie (`startup_ai_session`).
2. **Instant Server-Side Revocation**: Logout is not merely a client-side deletion; `POST /api/auth/logout` deletes the session row from SQLite and clears the cookie.
3. **CORS & Credentials**:
   - Backend Express CORS updated from `cors()` to:
     ```javascript
     app.use(cors({
       origin: process.env.FRONTEND_URL || 'http://localhost:3000',
       credentials: true
     }));
     ```
   - Frontend Axios configured with `withCredentials: true`.
4. **Session Expiry**: Sessions are valid for 30 days (`expires_at = now + 30 days`), supporting seamless persistent login.

### 9.6 Anonymous Trial Architecture (One Free Plan Gate)

To honor the core product decision:
> **"A visitor should NOT be forced to create an account before experiencing the product. The first complete AI-generated startup plan should be available without authentication."**

#### Abuse Prevention & Limit Enforcement Mechanism:
1. **Trial Cookie**: On initial visit or generation attempt by an unauthenticated user, the server assigns a cryptographically random anonymous trial ID (`startup_ai_trial`) via HTTP-only cookie.
2. **Server-Side Tracking (`trial_sessions`)**:
   - Stores `(id, plan_id, ip_hash, created_at)`.
   - `ip_hash` is a salted SHA-256 digest of client IP, preventing plain IP logging while providing secondary rate limiting against cookie wiping.
3. **Generation Gating**:
   - When `POST /api/plans` (or generation endpoints) is requested:
     - If user is authenticated (`req.user` present): generation and persistence proceed under user account.
     - If user is anonymous:
       - Check `trial_sessions` for `trial_id` or `ip_hash`.
       - If no plan has been generated yet for this trial session: allow generation and record `plan_id` in `trial_sessions`.
       - If a plan has ALREADY been generated for this trial session: abort with structured HTTP 403:
         ```json
         {
           "success": false,
           "error": {
             "code": "TRIAL_LIMIT_REACHED",
             "message": "You have used your free anonymous startup plan trial. Please sign in or create a free account to generate more plans and save your work."
           }
         }
         ```
4. **No Premature Gatekeeping**: The user enters their idea, watches the parallel generation progress, explores all tabs on `/dashboard`, and previews their pitch deck without ever seeing a login screen.

### 9.7 Trial-to-Account Plan Claiming Flow

When the anonymous user clicks "Save My Startup Plan" on the dashboard, the trial plan is claimed without regeneration:

```text
Step 1: Anonymous generation completes -> plan persisted in DB with `id = <UUID>` and `user_id = NULL`.
Step 2: Client holds `currentPlanId = <UUID>`. Dashboard shows:
        "✨ Free Trial Plan • Sign in to save permanently to your account [ Save My Plan ]"
Step 3: User clicks "Save My Plan" -> AuthModal opens -> User clicks "Continue with Google".
Step 4: Google authentication completes -> Backend sets session cookie.
Step 5: Frontend (or backend auth callback) triggers:
        POST /api/plans/claim
        Payload: { planId: localStorage.getItem('currentPlanId') }
Step 6: Backend verification:
        a. Verify req.user exists (authenticated session).
        b. Fetch plan where id = planId.
        c. Assert plan.user_id IS NULL (must be unowned trial plan).
        d. Execute: UPDATE plans SET user_id = ?, updated_at = ? WHERE id = ? AND user_id IS NULL.
Step 7: Plan is now owned by the user!
Step 8: Dashboard updates status to "Saved to Account".
        Navigating to /my-plans immediately displays the claimed plan.
```

#### Edge Case Handling:
- **Existing User Login**: If an existing user creates a trial plan while logged out and logs into their existing account, the trial plan is claimed and added to their existing plan library.
- **Refresh Before Claim**: `currentPlanId` remains in `localStorage` and `trial_sessions`; the claim banner remains visible after page reload.
- **Claim Failure Recovery**: If network drops during claim, the plan remains unowned (`user_id = NULL`) in the database; the UI surfaces an actionable "Retry Save" button.
- **Already-Claimed Plan**: If a user attempts to claim a plan that already has `user_id !== NULL`, the backend returns HTTP 409 `PLAN_ALREADY_CLAIMED`.

### 9.8 Endpoint Authorization Matrix

| Endpoint | Anonymous Request | Authenticated Request |
|---|---|---|
| `POST /api/plans` | Allowed if under 1-trial limit; creates plan with `user_id = NULL` and records `plan_id` in `trial_sessions`. Issues `startup_ai_trial` cookie. If trial used, returns `403 TRIAL_LIMIT_REACHED`. | Creates plan with `user_id = req.user.id`. Client-supplied user IDs are strictly ignored. |
| `GET /api/plans` | Returns empty history `{ plans: [], total: 0 }`. Prevents exposing anonymous or other users' plans. | Returns `SELECT ... WHERE user_id = req.user.id ORDER BY created_at DESC LIMIT ? OFFSET ?`. |
| `GET /api/plans/:id` | Allowed ONLY if `user_id = NULL` AND requester possesses matching `startup_ai_trial` cookie linked in `trial_sessions`. Unlinked plans return safe `404 PLAN_NOT_FOUND` to prevent ID enumeration. | Allowed ONLY if `user_id = req.user.id`. Returns safe `404 PLAN_NOT_FOUND` if unowned or owned by another user. |
| `PATCH /api/plans/:id` | `401 UNAUTHORIZED` (guarded by `requireAuth`). | Allowed ONLY if `user_id = req.user.id`. Non-owner receives safe `404 PLAN_NOT_FOUND`. Updates metadata only; AI modules, status, and `user_id` are immutable. |
| `DELETE /api/plans/:id`| `401 UNAUTHORIZED` (guarded by `requireAuth`). | Allowed ONLY if `user_id = req.user.id`. Non-owner receives safe `404 PLAN_NOT_FOUND`. |
| `POST /api/plans/claim`| `401 UNAUTHORIZED` (guarded by `requireAuth`). | Requires authenticated session and matching `startup_ai_trial` cookie linked in `trial_sessions`. Atomically updates `user_id = req.user.id`. Returns `409 PLAN_ALREADY_CLAIMED` on conflict. |


### 9.9 Frontend Authentication UX & State Architecture

#### 1. `AuthContext` (`src/context/AuthContext.js`)
Centralizes authentication state and wraps the entire application:
```javascript
const AuthContext = createContext({
  user: null,             // { id, email, name, pictureUrl, authProvider } or null
  isAuthenticated: false,
  isLoading: true,        // True during initial session bootstrap
  authError: null,
  loginWithGoogle: async (credential) => {},
  loginWithEmail: async (email, password) => {},
  signupWithEmail: async (name, email, password) => {},
  logout: async () => {},
  refreshUser: async () => {},
  claimCurrentPlan: async (planId) => {},
  openAuthModal: (context = {}) => {},
  closeAuthModal: () => {},
  isAuthModalOpen: false,
  authModalContext: {}
});
```

#### 2. Session Hydration on Mount
When the React application boots, `AuthContext` dispatches `GET /api/auth/me` with `withCredentials: true` via `api.js`:
- If session cookie valid: sets `user` and `isAuthenticated = true`.
- If 401 unauthenticated: sets `user = null` and `isAuthenticated = false` cleanly without interrupting anonymous user experience.
- Sets `isLoading = false` (no blocking white screen; pages render immediately).
- Temporary network issues do NOT erase local anonymous startup plan data.

#### 3. Centralized API Client (`src/services/api.js`)
- Pre-configured Axios instance with `withCredentials: true` and `baseURL: 'http://localhost:4000'`.
- Includes `formatAuthError` mapping backend error codes (`INVALID_CREDENTIALS`, `EMAIL_ALREADY_IN_USE`, `ACCOUNT_COLLISION`, `PLAN_ALREADY_CLAIMED`, `TRIAL_LIMIT_REACHED`, `PLAN_NOT_FOUND`) to safe, friendly messages without exposing internal SQL or stack traces.

#### 4. Navigation Header (`Header.js`) Integration
- **Unauthenticated**: Renders clean "Sign In" button and "Get Started" CTA.
- **Authenticated**: Renders user display name, avatar picture or initials circle, and an accessible dropdown menu with:
  - "My Saved Plans"
  - "Current Dashboard"
  - "Sign Out" action
- Mobile responsive navigation reflecting authentication state.

#### 5. `AuthModal` Component (`src/components/AuthModal.js`)
- Modal accessible from Header "Sign In", Dashboard "Save My Plan" banner, IdeaInput trial limit trigger, or My Plans sign-in state.
- **Top Section**: High-visibility "Continue with Google" button utilizing Google Identity Services (GIS), client ID verification, script idempotency, and backend `POST /api/auth/google` verification handshake.
- **Divider**: Subtle "or continue with email" separator.
- **Bottom Section**: Tabbed Email Login / Signup form with client-side validation (minimum 8 character password), loading indicators, and error feedback.

#### 6. Dashboard Trial Banner & Atomic Plan Claiming
When `DashboardPage` detects an active persisted trial plan (`planPersistenceStatus === 'saved'` or valid `currentPlanId`) but `user === null`:
- Displays top banner:
  > **✨ Free Trial Plan** — Your complete AI startup plan is ready. Sign in to save it permanently and access it from My Plans.
  > `[ Save My Plan ]`
- Clicking "Save My Plan" opens `AuthModal`; upon successful login or signup, immediately dispatches `POST /api/plans/claim` with `{ planId: currentPlanId }`.
- Backend atomically associates ownership (`user_id = req.user.id`).
- Local plan data, `currentPlanId`, and all 6 AI modules are preserved without regeneration or duplicate plan creation.
- Once claimed, transitions banner to "Saved to Your Account" and enables My Plans access.

---

## 10. Phase 5 Proposed Architecture: Pitch Deck Export & Sharing (Audit Findings)

> [!IMPORTANT]
> **ARCHITECTURE AUDIT STATUS: PROPOSED (NOT YET IMPLEMENTED)**
> The architectural designs in this section represent the audited and approved technical blueprint for Phase 5. No Phase 5 application code, dependencies, or database migrations have been implemented yet. Existing Phase 1–4 behavior remains the active implementation baseline.

### 10.1 Current System Baseline & Asset Reusability

#### What Already Exists (Reusable)
1. **Multi-Module Presentation Data**:
   - The database (`plans` table) already stores the full canonical JSON representation of all 6 modules (`lean_canvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`) alongside intake fields (`startup_name`, `industry`, `problem`, `solution`, `target_audience`, `usp`).
2. **Pitch Deck UI Composition (`src/pages/PitchPreviewPage.js`)**:
   - Assembles a 7-slide investor presentation:
     - Slide 1: Title Slide (`startupName`, `usp`, `elevatorPitch`)
     - Slide 2: Problem → Solution (`problem`, `solution`)
     - Slide 3: Market Opportunity (`targetAudience`, `customerSegments`)
     - Slide 4: Product Overview (`mvp.coreFeatures`)
     - Slide 5: Monetization (`revenue` stream list with models and projections)
     - Slide 6: Competition & Market Position (`usp`, `competitors` with differentiators)
     - Slide 7: Next Steps (`elevatorPitch`, static launch vectors)
3. **Export Tab UI Skeleton (`src/components/DashboardTabs.js`)**:
   - Contains placeholder cards for "Business Plan PDF", "Pitch Deck", "Financial Model", "Executive Summary", and "Share Link".
4. **Authorization Infrastructure (`backend/services/planService.js`)**:
   - Proven `getPlanForRequester(id, { userId, trialToken })` pattern enforcing strict ownership and trial access boundaries.

#### What Is Missing
1. **PDF Generation Engine**: Neither backend nor frontend contains PDF libraries or `@media print` style definitions.
2. **Database Sharing Entity**: No database table exists to store, track, or revoke public share links.
3. **Sharing Endpoints & Public Routes**: No backend routes exist under `/api/plans/:id/share` or `/api/shared/:token`, and no public frontend route exists under `/share/:token`.

---

### 10.2 Implemented PDF Export Architecture (Phase 5.2 - IMPLEMENTED)

#### 1. Architecture Choice & Evaluation

| Architecture | Operational Footprint | Rendering Quality | Verdict for Startup-AI |
|---|---|---|---|
| **Server-Side Headless (Puppeteer / Playwright)** | 200MB+ Chromium binary, 150–300MB RAM/render | Pixel-perfect Chromium | **REJECTED**: Massive operational cost and container bloat. |
| **Server-Side Node PDFKit** | <10MB package, low memory | Coordinate-based primitive drawing | **REJECTED**: High maintenance, difficult responsive sync. |
| **Client-Side Canvas (`html2canvas` + `jsPDF`)** | 200–500KB bundle | Blurry rasterized bitmap; non-selectable text | **REJECTED**: Substandard investor presentation quality. |
| **Native Browser Print Engine + Print CSS (`@media print`)** | **0 KB added packages / 0 new dependencies** | **Crystal-clear vector text, native OS print-to-PDF, zero latency** | **IMPLEMENTED**: Cleanest, most maintainable, zero-dependency architecture. |

#### 2. Implemented Architecture Specifications:

1. **Dual Export Modes**:
   - **Pitch Deck PDF (16:9 Landscape)**:
     - Rendered via `<PitchDeckPrintView data={data} />` on `/pitch-preview`.
     - Exactly 7 presentation slides: Title Slide, Problem → Solution, Market Opportunity, Product Overview, Monetization, Competition & Positioning, and Strategic Milestones.
     - Sized for widescreen 16:9 presentation paper (`@page { size: landscape; margin: 0; }`).
     - Uses `break-after: page; page-break-inside: avoid;` to ensure each slide occupies exactly one printed page without accidental splitting.
   - **Business Plan PDF (A4 Portrait)**:
     - Rendered via `<BusinessPlanPrintView data={data} />` on `/dashboard` (Export Tab).
     - Professional portrait multi-page executive document covering Executive Summary & Overview, Target Market & Personas, Lean Canvas Matrix, MVP Scope & Technical Specs, Monetization, Competitor Landscape, and Strategic Execution Roadmap.
     - Sized for standard document print (`@page { size: portrait; margin: 12mm 10mm; }`).

2. **Dedicated Print Presentation vs. Screen UI**:
   - Screen markup is wrapped in `.screen-only` (`display: none !important` in `@media print`).
   - Printable layouts are wrapped in `.print-only` (`display: none !important` on screen; `display: block !important` in `@media print`).
   - Interactive buttons, header navigation, theme toggles, and edit controls are completely stripped from print output without relying on JavaScript listeners.

3. **Dynamic Document Title & `@page` Orientation Injection**:
   - Handled cleanly via `triggerPrintWithTitle(suggestedTitle, orientation)` in `frontend/src/utils/exportHelpers.js`.
   - Injects a scoped `<style id="startup-ai-print-page-style">` configuring the exact `@page` orientation (landscape vs. portrait) immediately before calling `window.print()`, avoiding orientation clashes between routes.
   - Temporarily updates `document.title` to sanitize the startup name (e.g., `NovaScale_AI-Pitch-Deck.pdf` or `NovaScale_AI-Business-Plan.pdf`), which modern browsers suggest as the default PDF download filename.
   - Restores the original document title and removes temporary style elements on the `afterprint` event or fallback timeout.

4. **Dark Mode Print Safety**:
   - In `frontend/src/print.css`, `@media print` strictly overrides dark mode classes (`.dark, .dark body, .dark #root` forced to `#ffffff` background and `#111827` text).
   - Enforces `-webkit-print-color-adjust: exact; print-color-adjust: exact;` ensuring cards, badges, and accents render with exact colors without wasting printer toner or washing out contrast.

5. **Defensive Partial Generation Handling**:
   - Pure mapping functions (`normalizePlanData`, `buildPitchDeckSlides`, `buildBusinessPlanDocument`) tolerate missing modules gracefully.
   - When 1–5 modules fail during AI generation or are unpopulated in storage, safe human-friendly placeholders (e.g., *"Not specified"*, *"No elevator pitch available"*) are rendered without throwing errors or exposing internal error metadata.

6. **Zero Server Clutter & Authorization Invariant**:
   - Stateless client-side generation; 0 binary files saved to disk or SQLite.
   - Because generation operates on the active loaded plan in state, authenticated users export their own plans, anonymous trial users export their single active trial plan, and unauthorized users are protected by Phase 4.3 route boundaries.

---

### 10.3 Recommended Link Sharing Architecture

#### 1. Sharing Security & Token Model
- **Token Design**: Cryptographically random 256-bit token (`crypto.randomBytes(32).toString('hex')` -> 64 characters).
- **Entropy Guarantee**: Brute-force resistance of $2^{256}$ possibilities; guessing is mathematically infeasible.
- **Raw Plan UUID Isolation**: Public URLs never expose the internal database UUID of the plan (`/share/:token`, NOT `/share/:planId`).
- **SEO & Privacy Guard**: Public share endpoint sends HTTP header:
  ```http
  X-Robots-Tag: noindex, nofollow, noarchive
  ```
- **Logging Sanitization**: Share tokens are truncated/masked in server access logs to prevent leakage in telemetry.

#### 2. Product Policy: Authentication Requirement for Sharing
- **Anonymous Trial Policy**: Creating a public share link **requires account authentication**.
  - *Rationale*: Anonymous trial users have no durable credentials beyond a transient browser cookie. If they share a link and lose their cookie, they lose the ability to manage or revoke the link. Requiring 1-click Google or Email authentication before generating a public share link protects founder privacy and creates a natural, high-intent product conversion loop.
  - *UX Trigger*: Clicking "Share Link" while unauthenticated opens `AuthModal` with contextual copy: *"Sign in to save and share your startup plan with investors."* Once authenticated and claimed, the share link is created immediately.

#### 3. Share Lifecycle: Dynamic vs. Snapshot
- **Selected Model: Dynamic Read-Only Sharing**:
  - The public share endpoint retrieves the current persisted state of the parent plan.
  - Typo fixes or metadata updates made by the owner immediately reflect in the shared view without requiring re-sharing.
  - If the owner revokes the share (`revoked_at IS NOT NULL`) or deletes the plan, subsequent public requests return safe HTTP 404 `SHARE_NOT_FOUND`.

#### 4. Sanitization Guarantees (Zero Data Leakage)
The public payload returned by `GET /api/shared/:token` strictly excludes:
- `user_id`, owner email, owner name, owner avatar
- Session cookies, trial cookies, authentication headers
- Edit, delete, and persistence actions
- `generation_errors` and internal status flags

---

### 10.4 Proposed Database Schema (Migration 003)

```sql
-- 003_create_plan_shares_table.sql
CREATE TABLE IF NOT EXISTS plan_shares (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_shares_token ON plan_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_plan_shares_plan_id ON plan_shares(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_shares_user_id ON plan_shares(user_id);
```

---

### 10.5 Proposed Share API Contract

| Endpoint | Method | Auth Required | Purpose |
|---|---|---|---|
| `/api/plans/:id/share` | `POST` | Yes (`requireAuth`) | Idempotently creates or returns existing active share token for plan owned by `req.user.id`. |
| `/api/plans/:id/share` | `DELETE` | Yes (`requireAuth`) | Revokes the active share token for the specified plan (`revoked_at = CURRENT_TIMESTAMP`, `is_active = 0`). |
| `/api/shared/:token` | `GET` | No (Public, rate-limited) | Validates active share token and returns sanitized, read-only plan presentation data. |

---

### 10.6 Proposed Phase 5 Implementation Breakdown

1. **Chunk 5.1 — Export & Sharing Architecture Audit** (COMPLETED)
   - Comprehensive audit of data structures, UI components, dependencies, security models, and deployment constraints.
2. **Chunk 5.2 — Pitch Deck & Business Plan PDF Export Engine** (COMPLETED)
   - Implemented print stylesheet rules (`@media print`, `print.css`) and native browser print-to-PDF engine for both Pitch Deck (16:9 landscape, 7 slides) and Business Plan (A4 portrait multi-page document).
   - Wired "Export PDF" on `PitchPreviewPage` and `DashboardTabs` with dynamic `@page` injection, safe title filename suggestion, and defensive data normalization.
3. **Chunk 5.3 — Plan Sharing Database Foundation & Backend API** (COMPLETED)
   - Migration 003 (`plan_shares` table with cascading foreign keys to `plans` and `users`).
   - Implemented `planShareService.js`, `planShareController.js`, `routes/shared.js`, and updated `routes/plans.js`.
   - Endpoints: `POST /api/plans/:id/share`, `DELETE /api/plans/:id/share`, `GET /api/shared/:token`.
   - Cryptographic SHA-256 token hashing at rest, atomic SQL view counter, dynamic plan resolution, and strict public DTO sanitization.
4. **Chunk 5.4 — Public Shareable Presentation Page & Viral Growth UX** (PENDING)
   - Dedicated route `/share/:token` and component `SharedPitchPage`.
   - Branded read-only presentation viewer with slide navigation and "Create Your Own Startup Plan" CTA.
5. **Chunk 5.5 — Dashboard & Pitch Preview Share Management UX** (PENDING)
   - "Share Link" modal on `DashboardTabs` and `PitchPreviewPage` with 1-click clipboard copy, QR code, and revocation controls.
   - Comprehensive integration tests and end-to-end verification.

---

## 11. Plan Sharing Architecture (Phase 5.3 Implementation)

### 11.1 Overview & Architecture Flow

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ OWNER FLOW (AUTHENTICATED)                                                              │
│                                                                                         │
│ Founder (Authenticated req.user)                                                       │
│   │                                                                                     │
│   ├── POST /api/plans/:id/share ──────────────────┐                                     │
│   │   (Idempotent create or return active share)  │                                     │
│   │                                               ▼                                     │
│   │                                  planShareService.createOrGetActiveShare            │
│   │                                  - Verify plan ownership (plan.user_id === userId)  │
│   │                                  - Check existing active share (is_active = 1)      │
│   │                                  - If none: generate 256-bit token                  │
│   │                                  - Persist SHA-256 hash in `plan_shares`            │
│   │                                  - Return raw bearer token & URL to owner           │
│   │                                                                                     │
│   └── DELETE /api/plans/:id/share ────────────────┐                                     │
│       (Revoke active share)                       │                                     │
│                                                   ▼                                     │
│                                      planShareService.revokeActiveShare                 │
│                                      - Verify plan ownership                            │
│                                      - Update `is_active = 0, revoked_at = datetime`    │
└─────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│ PUBLIC VIEWER FLOW (UNAUTHENTICATED)                                                    │
│                                                                                         │
│ Public Client / Investor                                                                │
│   │                                                                                     │
│   └── GET /api/shared/:token ─────────────────────┐                                     │
│       (Bearer token credential)                   │                                     │
│                                                   ▼                                     │
│                                      planShareService.getSharedPlanByToken              │
│                                      - Compute SHA-256 hash of incoming rawToken        │
│                                      - Lookup `plan_shares` by hash & is_active = 1     │
│                                      - If not found or revoked: return safe HTTP 404    │
│                                      - Atomically increment view_count (SQL: +1)        │
│                                      - Fetch current persisted plan dynamically         │
│                                      - Strictly sanitize DTO via toPublicSharedPlan     │
│                                      - Return sanitized JSON representation             │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 11.2 Database Schema (Migration 003)

Migration `003_create_plan_shares_table.sql` establishes the persistence foundation:

```sql
CREATE TABLE IF NOT EXISTS plan_shares (
  id TEXT PRIMARY KEY NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  share_token TEXT NOT NULL UNIQUE,
  is_active INTEGER NOT NULL DEFAULT 1,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  revoked_at TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_shares_token ON plan_shares(share_token);
CREATE INDEX IF NOT EXISTS idx_plan_shares_plan_id ON plan_shares(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_shares_user_id ON plan_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_plan_shares_active ON plan_shares(plan_id, is_active);
```

#### Schema Constraints & Cascade Guarantees
1. **Foreign Key to `plans` (`ON DELETE CASCADE`)**: When a plan is deleted by its owner (`DELETE /api/plans/:id`), SQLite automatically purges all associated records in `plan_shares`.
2. **Foreign Key to `users` (`ON DELETE CASCADE`)**: If an owner account is removed, all issued shares are cleanly purged.
3. **Token Column (`share_token`)**: Stores a 64-character hexadecimal SHA-256 digest of the raw bearer token. Indexed uniquely for $O(1)$ lookups.
4. **Lifecycle Columns (`is_active`, `revoked_at`)**: Active shares maintain `is_active = 1` and `revoked_at = NULL`. Revoking an active share preserves audit records with `is_active = 0` and timestamped `revoked_at`.

---

### 11.3 Cryptographic Token & Security Storage Architecture

1. **Token Generation & Entropy**:
   - Generated server-side using Node's cryptographic PRNG: `crypto.randomBytes(32).toString('hex')`.
   - Yields a 64-character lowercase hexadecimal string providing 256 bits of cryptographic entropy ($2^{256}$ search space).
   - Resistant to brute-force, dictionary attacks, and enumeration.

2. **Hashed Token Storage at Rest**:
   - The database **never stores raw bearer tokens**.
   - Instead, the SHA-256 hash (`crypto.createHash('sha256').update(rawToken).digest('hex')`) is stored in `plan_shares.share_token`.
   - If the database is compromised, dumped, or leaked, attackers cannot reconstruct working bearer URLs.
   - The raw token is returned **only once** to the authenticated owner upon initial share creation (`POST /api/plans/:id/share`).

3. **Public Token Verification**:
   - The client supplies `:token` in the public URL path (`/api/shared/:token`).
   - The server computes `hash = SHA256(rawToken)` and queries `plan_shares WHERE share_token = hash AND is_active = 1 AND revoked_at IS NULL`.
   - Raw tokens are never logged or exposed in unhandled error messages.

---

### 11.4 Share Lifecycle & Idempotency Rules

- **Single Active Share Per Plan**: A plan may only have one active share at any given moment.
- **Idempotent Create**: If an authenticated owner calls `POST /api/plans/:id/share` on a plan with an existing active share, the server returns the existing active share metadata (`200 OK`, `alreadyExists: true`) rather than generating new tokens or accumulating duplicate active records.
- **Revocation**: When an owner calls `DELETE /api/plans/:id/share`, the active share record is updated to `is_active = 0` and `revoked_at = ISO_TIMESTAMP`. It can never be reactivated.
- **Re-Sharing After Revocation**: Calling `POST /api/plans/:id/share` on a previously revoked plan generates a **brand-new 256-bit token** and inserts a new active share row.

---

### 11.5 Authorization & Security Boundaries

1. **Owner Derivation**:
   - All management endpoints (`POST /api/plans/:id/share`, `DELETE /api/plans/:id/share`) derive the owner identity strictly from `req.user.id` via `authenticateUser` and `requireAuth`.
   - Client-supplied user IDs or ownership parameters are strictly ignored.
2. **Safe 404 Responses**:
   - If a requested plan does not exist, or belongs to another user, or is an unclaimed anonymous trial plan (`user_id === null`), the server returns `404 PLAN_NOT_FOUND`.
   - This prevents user enumeration and reveals no information regarding whether another user's plan exists.
   - For public requests, non-existent, invalid, or revoked tokens return an identical `404 SHARE_NOT_FOUND` response with uniform timing.
3. **Anonymous Trial Policy**:
   - Anonymous visitors (`user_id = NULL`) cannot share plans.
   - Calling share management without an active session triggers `401 UNAUTHORIZED`.
   - An anonymous trial plan must first be claimed via authentication (`POST /api/plans/claim`) before the owner can generate a public share link.

---

### 11.6 Dynamic Plan Content & View Counting

1. **Dynamic Content Resolution**:
   - The public share endpoint reads live persisted plan data from `plans` at request time.
   - Plans are **not snapshot** into static share records. If an owner edits their plan's startup name, problem, or solution, public viewers immediately see the updated content upon refresh.
2. **Atomic View Counting**:
   - Each successful public retrieval (`GET /api/shared/:token`) executes an atomic SQL increment:
     ```sql
     UPDATE plan_shares SET view_count = view_count + 1 WHERE id = ?;
     ```
   - Invalid, expired, revoked, or non-existent requests do not increment the counter.

---

### 11.7 Public Response Sanitization Contract (`toPublicSharedPlan`)

The public endpoint `GET /api/shared/:token` applies strict DTO sanitization via `toPublicSharedPlan(planRow)`:

| Field Name | Type | Sanitization & Safety Guarantee |
|---|---|---|
| `id` | `string` | Safe plan UUID |
| `startupName` | `string` | Startup name |
| `industry` | `string` | Industry/domain |
| `problem` | `string` | Problem statement |
| `solution` | `string` | Solution statement |
| `targetAudience` | `string` | Target market |
| `usp` | `string` | Unique selling proposition |
| `leanCanvas` | `object` | Parsed 9-box lean canvas |
| `mvp` | `object` | Parsed MVP roadmap |
| `revenue` | `array` | Parsed pricing/monetization streams |
| `pitch` | `object` | Parsed pitch deck slides & elevator pitch |
| `personas` | `array` | Parsed user personas |
| `competitors` | `array` | Parsed competitive benchmark |
| `createdAt` | `string` | Plan creation ISO timestamp |
| `updatedAt` | `string` | Plan last updated ISO timestamp |

**Strictly Excluded from Public Output**:
- `user_id` / `userId` (owner identity completely hidden)
- Owner email, name, avatar, or credentials
- Session tokens, cookie parameters, trial session tokens
- Database internal `rowid`
- Internal `generation_errors` or `generationErrors`
- Model execution metadata or server stack traces

---

## 12. Public Shareable Presentation Page Architecture (Phase 5.4)

### 12.1 Overview & Routing Integration

The public shared presentation page exposes read-only startup plans via the frontend route:
```text
/share/:token
```
- **Custom Router Integration**: Handled in `frontend/src/App.js` and `src/utils/Router.js`. `basePath` checks identify `/share` or paths starting with `/share/`, safely extracting the token parameter and rendering `SharedPlanPage.js`.
- **Zero Authentication Requirement**: Visitors can load and view shared plans without logging in, without trial cookies, and without being redirected to `/` or an auth modal.
- **Client-Side Authorization Isolation**: The public page makes no client-side authorization assumptions. It fetches `GET /api/shared/:token` and relies on backend token validation.

---

### 12.2 Public Page Lifecycle & States

`SharedPlanPage.js` manages four explicit application states:

1. **Initial Loading (`loading`)**:
   - Clean, animated skeleton loader with pulsing badges and cards.
   - Prevents flashing unstyled content or jarring layout shifts.
2. **Successful Retrieval (`success`)**:
   - Renders an executive business document presentation with 8 primary sections:
     1. *Startup Overview*: Name, domain, elevator pitch, USP, and metadata badges.
     2. *Problem & Proposed Solution*: Card-by-card breakdown with target market.
     3. *Lean Canvas*: 9-box responsive grid preserving exact framework sections.
     4. *MVP Roadmap*: Core capabilities, technical architecture stack, and phased milestones.
     5. *Revenue & Monetization*: Pricing models, tiers, and financial forecasts.
     6. *User Personas*: Archetype profiles with demographics, core pain points, and motivations.
     7. *Competitive Benchmark*: Landscape table/cards with key differentiators and defensibility.
     8. *Plan Information*: ISO timestamps (`createdAt`, `updatedAt`) without exposing database IDs.
   - Missing/partial modules gracefully degrade or display restrained "Not provided" notices without crashing.
3. **Unavailable Link (`unavailable`)**:
   - Displayed on HTTP 404, 410, or when the token is missing/revoked.
   - Uniform neutral public message: *"This shared plan is unavailable. The link may have expired or been revoked."*
   - Strictly obscures whether the token ever existed, who owns the plan, or why access failed.
4. **Network / Server Failure (`network_error`)**:
   - Displayed on network loss or HTTP 5xx responses.
   - Clear distinction from invalid links with a prominent **Try Again** retry action.

---

### 12.3 Search Engine & Indexing Directives

Because shared startup plans contain sensitive proprietary business concepts:
1. **Robots Meta Tag**:
   - Upon mount, `SharedPlanPage.js` dynamically creates or updates `<meta name="robots" content="noindex, nofollow, noarchive" />` in document `<head>`.
   - On component unmount, the element is cleaned up to prevent affecting other application routes.
2. **Limitations**:
   - `noindex, nofollow, noarchive` instructs compliant web crawlers not to index or cache the page.
   - It **does not** provide cryptographic access control or make the URL private; anyone with the unhashed bearer token can access the read-only presentation.
   - Public plan URLs are excluded from sitemaps.

---

### 12.4 Security & Data Hygiene Guarantees

- **Bearer Token Handling**: The share token is passed directly from URL props to the Axios request. It is **never** written to `localStorage`, `sessionStorage`, cookies, analytics, or error logs.
- **Strict React Text Rendering**: Plan content is rendered purely as React children; `dangerouslySetInnerHTML` is strictly prohibited to prevent XSS.
- **Read-Only Enclosure**: No owner actions, edit controls, delete triggers, or plan mutation APIs are rendered.
- **Privacy Enforcement**: Owner identity, user ID, email, session cookies, and internal backend generation errors are strictly excluded from both the API response and DOM rendering.

---

## 13. Share Management UX and Secure Existing-Link Recovery (Phase 5.5)

### 13.1 Overview & Goals

Phase 5.5 completes the end-to-end plan-sharing lifecycle for authenticated plan owners. In Phase 5.3, public share tokens were stored solely as one-way SHA-256 hashes (`share_token`). While this prevented plaintext token exposure in the database, it prevented owners from recovering and copying their active link upon reopening the sharing interface.

Phase 5.5 introduces:
1. **Authenticated AES-256-GCM Encryption**: Secure reversible token storage via an encrypted token column (`encrypted_token`), enabling authenticated owners to recover and copy their active link without regenerating new links or storing plaintext tokens.
2. **Database Migration 004**: Adds `encrypted_token TEXT` to the `plan_shares` table.
3. **Graceful Legacy Share Handling**: Existing Phase 5.3 share records (which have `encrypted_token = NULL`) are identified with `requiresReplacement: true` without fabricating invalid tokens or revoking existing public links prematurely.
4. **Atomic Link Replacement**: Explicit owner-confirmed replacement revokes the legacy or compromised link and issues a fresh token within a SQLite transaction, enforcing the one-active-share-per-plan invariant.
5. **Dashboard & Export Tab Integration**: A polished, responsive `ShareModal` accessible from both the `DashboardPage` header and the `ExportTab`, featuring explicit lifecycle states, clipboard integration, view analytics, and error recovery.

---

### 13.2 Authenticated Encryption Architecture (AES-256-GCM)

Implemented in `backend/utils/encryption.js`:

```text
Plaintext Raw Token (64-char Hex, 256 bits entropy)
   │
   ├─► SHA-256 Hash ─────────► Stored in `share_token` (Public DB lookup)
   │
   └─► AES-256-GCM Encryption ──► Stored in `encrypted_token` (Owner recovery)
         ▲
         ├─ Key: SHARE_ENCRYPTION_KEY (32 bytes / 256 bits)
         ├─ IV: 12 bytes cryptographically random nonce
         └─ Auth Tag: 16 bytes GCM authentication tag
```

- **Cipher Specification**: `aes-256-gcm` authenticated encryption with 96-bit (12-byte) initialization vector (IV) and 128-bit (16-byte) authentication tag.
- **Serialization Format**: `ivHex:tagHex:ciphertextHex`.
- **Key Configuration (`SHARE_ENCRYPTION_KEY`)**:
  - Supplied via environment variable as 64-hexadecimal characters or 32 raw bytes.
  - Validated at startup / runtime; rejects non-32-byte keys with descriptive configuration errors.
  - Documented in `.env.example` with instructions on generating keys via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  - **Zero Plaintext Fallback**: If the key is missing or invalid, encryption throws an error and rejects share creation; it *never* stores raw or unencrypted tokens.
- **Decryption Integrity**: Decryption verifies the GCM authentication tag. If the tag fails verification, ciphertext is corrupted, or key is incorrect, it fails safely returning `null` without throwing fatal unhandled exceptions.

---

### 13.3 Database Migration 004

Implemented in `backend/db/migrations/004_add_encrypted_token_to_plan_shares.sql`:
```sql
-- Migration 004: Add encrypted_token column to plan_shares for authenticated owner link recovery
ALTER TABLE plan_shares ADD COLUMN encrypted_token TEXT;
```
- Fully backward compatible with Migration 003.
- Existing records have `encrypted_token = NULL` and transition through the legacy replacement workflow.

---

### 13.4 API Endpoints & Contract Extensions

1. **`GET /api/plans/:id/share`**:
   - Requires authenticated plan owner (`authMiddleware`).
   - Returns current sharing status without mutating state:
     - If no active share: `{ success: true, data: { isActive: false, share: null } }`.
     - If active share with encrypted token: `{ success: true, data: { isActive: true, share: { id, shareUrl, views, createdAt, requiresReplacement: false } } }`.
     - If active legacy share (null `encrypted_token`): `{ success: true, data: { isActive: true, share: { id, shareUrl: null, views, createdAt, requiresReplacement: true } } }`.
   - Returns 404 for non-owners or non-existent plans.

2. **`POST /api/plans/:id/share`**:
   - Accepts optional `{ replace: true }` body payload.
   - If no active share exists: creates new share with SHA-256 hash in `share_token` and AES-256-GCM ciphertext in `encrypted_token`. Returns 201 with `shareUrl`.
   - If active share exists and `replace !== true`:
     - If recoverable: returns existing `shareUrl` idempotently (200).
     - If legacy unrecoverable: returns `{ requiresReplacement: true, shareUrl: null }` (200).
   - If `replace === true`: executes atomic transaction revoking active share (`is_active = 0, revoked_at = datetime('now')`) and inserting fresh share with new raw token. Returns 201 with fresh `shareUrl`.

3. **`DELETE /api/plans/:id/share`**:
   - Requires authenticated plan owner.
   - Sets `is_active = 0, revoked_at = datetime('now')` for active share.
   - Returns `{ success: true, message: 'Share link revoked successfully' }`.

4. **`GET /api/shared/:token`**:
   - Public read-only endpoint remains completely unchanged.
   - Hashes incoming raw token with SHA-256 and queries `share_token`.
   - Increments view count atomically.
   - Strictly sanitizes public DTO, omitting `share_token`, `encrypted_token`, `plan_id`, and owner information.

---

### 13.5 Share-Management Frontend UX & State Machine

Implemented in `frontend/src/components/ShareModal.js`:

```text
┌──────────────┐
│   Loading    │
└──────┬───────┘
       ▼
┌────────────────────────────────────────────────────────┐
│                      State Match                       │
├──────────────────┬─────────────────┬───────────────────┤
▼                  ▼                 ▼                   ▼
[No Active Share]  [Active Share]    [Legacy Share]      [Error State]
│                  │                 │                   │
├─ "Plan Private"  ├─ Copyable URL   ├─ "Unrecoverable"  └─ Retry CTA
├─ Create Button   ├─ View Count     ├─ Replace Warning
│                  ├─ Copy CTA       ├─ Replace CTA
│                  └─ Revoke CTA     │
│                         │          │
│                         ▼          ▼
│                  [Confirm Dialogs: Revoke / Replace]
│                         │
▼                         ▼
[Success Feedback / Fresh State Hydration]
```

- **Entry Points**:
  - `DashboardPage` header button next to Edit and Delete for persisted plans.
  - `ExportTab` card "Share Online" (replaces previous "Coming Soon" placeholder).
- **Ownership & Auth Enforcement**: Unauthenticated trial users attempting to share are intercepted and prompted with an authentication modal explaining they must sign in / claim the plan first.
- **Clipboard Management**: Uses `navigator.clipboard.writeText` with smooth fallback to an auto-focusing selectable input field with copy instructions for environments without clipboard API permissions.
- **Defensive State Synchronization**: Modal resets and refetches status whenever opened or when the active `planId` changes, preventing stale state leaks across plans.

---

### 13.6 Security & Privacy Invariants

- **Zero Plaintext Token Storage**: Raw tokens exist only ephemerally during creation and recovery; database records contain only SHA-256 hashes and AES-256-GCM ciphertexts.
- **Server-Side Ownership Verification**: Client user IDs are never trusted; `req.user.id` is enforced against `plans.user_id`.
- **Public DTO Sanitization**: Neither `share_token` (hash) nor `encrypted_token` (ciphertext/nonce/tag) is ever returned in public or owner responses.
- **Cryptographic Entropy**: Raw tokens generated via `crypto.randomBytes(32).toString('hex')` (256 bits of entropy).

---

### 13.7 One Active Share Per Plan Invariant & Concurrency Hardening (Chunk 5.5.1)

#### Database Migration 005
Implemented in `backend/db/migrations/005_enforce_one_active_share_per_plan.sql`:
1. **Deterministic Reconciliation**: If any historical duplicate active shares exist, the migration preserves the newest active record (`created_at DESC, id DESC`) and marks older duplicate active rows as revoked (`is_active = 0, revoked_at = now`) to preserve audit and view history.
2. **Partial Unique Index**:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_plan_shares_one_active
   ON plan_shares(plan_id)
   WHERE is_active = 1;
   ```
   - Enforces the database invariant that a given `plan_id` can appear at most once where `is_active = 1`.
   - Allows an unlimited number of revoked historical shares (`is_active = 0`) to coexist for the same `plan_id`.

#### Concurrency-Safe Service Creation
In `backend/services/planShareService.js` (`createOrGetActiveShare`):
1. **Atomic Transaction Re-Check**: Creation is enclosed in `dbInstance.transaction(...)`, which re-queries active share status before attempting an insert.
2. **Graceful Conflict Recovery**: If a concurrent request races and inserts an active share, SQLite's partial unique index raises `SQLITE_CONSTRAINT_UNIQUE`. The service intercepts this error, queries the winning active share, decrypts its token, and returns `{ share: winningShareData, isExisting: true }`.
3. **Guarantees**: Competing requests always resolve to the exact same singular active link without 500 errors, without duplicate rows, and without leaking cryptographic material or database errors.

---

## 14. Financial Model Export Architecture Audit (Phase 5.6A)

### 14.1 Objective & Context

The `ExportTab` component currently features a placeholder card for **Financial Model** ("Excel spreadsheet with financial projections") marked with a "Coming Soon" badge. The objective of Phase 5.6A is an architecture audit to:
1. Assess the availability, granularity, and structure of financial and monetization data currently generated and persisted by Startup-AI.
2. Evaluate export formats (CSV, XLSX, PDF) across usability, formula support, application compatibility, dependency overhead, and security.
3. Define a safe, non-hallucinatory implementation design that delivers high utility to founders without fabricating artificial numbers.
4. Verify the security design of Phase 5.5 authenticated token encryption and sharing link replacement.

---

### 14.2 Assessment of Existing Generated & Persisted Data

A thorough inspection of `backend/models/revenueModel.js`, `backend/models/leanCanvas.js`, `frontend/src/pages/IdeaInputPage.js`, `frontend/src/utils/exportHelpers.js`, and the SQLite database schema reveals the following:

#### A. Actual Generated Data Fields
| Source Module | Field Name | Data Type | Content Description |
|---|---|---|---|
| **Revenue Model** (`/api/revenue`) | `revenueStreams` | Text (string) | Qualitative explanation of 1–2 monetization methods (e.g. SaaS subscription, freemium, usage-based). |
| **Revenue Model** (`/api/revenue`) | `pricingStrategy` | Text (string) | High-level pricing approach (e.g., tiered pricing, value-based pricing). |
| **Revenue Model** (`/api/revenue`) | `expectedMonthlyRevenue` | Text (string) | Qualitative projection range with contributing factors (e.g. "$5K - $10K depending on CAC and conversion"). |
| **Revenue Model** (`/api/revenue`) | `growthOpportunities` | Text (string) | Bullet points or narrative on long-term expansion vectors. |
| **Lean Canvas** (`/api/lean-canvas`) | `costStructure` | Text (string) | Narrative summary of primary cost drivers (e.g., cloud hosting, developer salaries, acquisition). |
| **Lean Canvas** (`/api/lean-canvas`) | `keyMetrics` | Text (string) | Quantifiable performance and growth metrics (e.g., MRR, churn rate, LTV:CAC). |
| **Lean Canvas** (`/api/lean-canvas`) | `channels` | Text (string) | Marketing, sales, and distribution pathways. |
| **Lean Canvas** (`/api/lean-canvas`) | `customerSegments` | Text (string) | Target customer profiles and initial early adopters. |
| **MVP Generator** (`/api/mvp`) | `launchTimeline` | Text (string) | Estimated build and launch timeline (e.g. "6-8 weeks"). |
| **Overview** (`formData` / `plans`) | `startupName`, `industry`, `problem`, `solution`, `usp` | Text (string) | Foundational startup context. |

#### B. Frontend Storage Discrepancy
In `frontend/src/pages/IdeaInputPage.js` (lines 97–108), the raw `resData` from `/api/revenue` is reshaped into an array:
```javascript
[
  { model: "Primary Revenue Stream", description: resData.revenueStreams, projection: resData.expectedMonthlyRevenue },
  { model: "Pricing Strategy", description: resData.pricingStrategy, projection: "Growth Phase" }
]
```
This drops `growthOpportunities` from client storage, and hardcodes `projection: "Growth Phase"` for the second item. Additionally, `DashboardTabs.js` (lines 455–468) displays static mock cards (`$10K Initial Target`, `$50K 6 Month Goal`, `$200K Year 1 Target`) that are hardcoded JSX elements rather than dynamic data.

#### C. Data That Does NOT Exist in the Application
- **Zero numerical line items**: No discrete unit prices (e.g., $29, $99), discrete customer quantities, or monthly transaction volumes.
- **Zero cost numbers**: No numerical salaries, headcount schedules, server costs, payment processing fees, or marketing budgets.
- **Zero time-series financial projections**: No Month 1–12 or Year 1–5 cash flow, balance sheet, or P&L tables.
- **Zero unit economics**: No numerical CAC, LTV, payback period, churn rate, or gross margin percentages.

#### D. Non-Fabrication Principle
Attempting to output an auto-generated 5-year multi-scenario financial model would require fabricating ~95% of the quantitative figures. Doing so would violate the project's reliability and trust requirements. Instead, the exported spreadsheet must serve as:
1. An **Audited Strategy & Assumptions Summary** containing all actual AI-generated business model decisions.
2. A **Formula-Driven 12-Month Projections Starter Model** where standard startup financial formulas are pre-wired, and founders can plug in their own target price and monthly user estimates without inventing figures.

---

### 14.3 Export Format Evaluation

| Evaluation Criteria | CSV (Comma-Separated) | XLSX (OpenXML Spreadsheet) | PDF (Native Print) |
|---|---|---|---|
| **Multi-Sheet Structure** | ❌ No. Single flat table only. Mashing narrative strategy and formulas into one table produces messy output. | ✅ Excellent. Supports distinct worksheets for Assumptions, Revenue Strategy, Cost Drivers, and 12-Month Projections. | ⚠️ Multi-page, but non-editable. |
| **Formulas & Interactivity** | ❌ None. Plain text values only. | ✅ Native formulas (`=SUM()`, `=B5*C5`, `=(B10-B11)/B10`) auto-calculate in Excel, Sheets, and Numbers. | ❌ None. Static presentation only. |
| **Formatting & Readability** | ❌ No column widths, bold headers, colors, or cell wrapping. Multiline AI text is awkward. | ✅ Full control over column widths, cell wrapping, currency formats (`$#,##0`), and section headers. | ✅ High visual polish (already implemented in Phase 5.2). |
| **Dependency Cost** | ✅ Zero dependencies (native browser `Blob`). | ⚠️ Requires lightweight client-side generator or small library. | ✅ Zero dependencies (native `window.print()`). |
| **Security (Formula Injection)** | ⚠️ Vulnerable to CSV/DDE injection (CWE-1236) if cells start with `=`, `+`, `-`, `@`. | ⚠️ Same formula injection risk; must escape AI strings by writing as explicit text cells or prefixing `'`. | ✅ Immune to formula injection. |
| **Product Alignment** | ⚠️ Disappoints user expecting "Excel spreadsheet with financial projections". | ✅ Exactly matches UI promise in `ExportTab`. | ❌ Redundant with existing Business Plan PDF export. |

**Primary Recommendation: XLSX Format**
XLSX is the clear winner because a financial model is inherently a spreadsheet deliverable. Founders need to open the file in Excel or Google Sheets, review their AI-generated revenue strategy, and adjust numbers to see live calculations.

---

### 14.4 Recommended Implementation Architecture (Multi-Sheet XLSX)

The exported workbook should contain 4 cleanly organized sheets:

#### Sheet 1: `Executive Overview & Assumptions`
- **Metadata**: Startup Name, Industry, Generation Date, Plan ID.
- **Strategic Summary**: Elevator Pitch, Problem, Solution, Unique Selling Proposition.
- **Financial Baseline**: Launch Timeline (`mvp.launchTimeline`), Customer Segments (`leanCanvas.customerSegments`), Primary Channels (`leanCanvas.channels`).

#### Sheet 2: `Monetization & Revenue Strategy`
- **Primary Revenue Stream**: Extracted from `revenue.revenueStreams` (or `revenue[0].description`).
- **Pricing Strategy**: Extracted from `revenue.pricingStrategy` (or `revenue[1].description`).
- **Target Revenue Benchmark**: Extracted from `revenue.expectedMonthlyRevenue` (or `revenue[0].projection`).
- **Growth Opportunities**: Extracted from `revenue.growthOpportunities` (with fallback to `leanCanvas.revenueStreams`).

#### Sheet 3: `Cost Structure & Operational Drivers`
- **Cost Drivers**: Categorized breakdown of `leanCanvas.costStructure` (Infrastructure, People, Acquisition, Operations).
- **Key Metrics to Track**: Extracted from `leanCanvas.keyMetrics` (e.g. MRR, CAC, Churn, Retention).
- **Core MVP Scope**: List of MVP features (`mvp.coreFeatures`) indicating initial engineering cost drivers.

#### Sheet 4: `12-Month Financial Projections (Working Model)`
A pre-wired, interactive formula table with Months 1 through 12 across columns:
- **Revenue Drivers (User Inputs)**:
  - Average Price per Customer / Subscription ($) `[Input cell: Default $49]`
  - Starting Customers / Active Accounts `[Input cell: Default 10]`
  - Monthly Growth Rate (%) `[Input cell: Default 15%]`
- **Calculated Revenue (Formulas)**:
  - Active Accounts = `Prior Month * (1 + Growth Rate)`
  - Gross Revenue = `Active Accounts * Price`
- **Cost Drivers (Formulas & Inputs)**:
  - Hosting & Infrastructure Cost (Base + $0.50/user)
  - Payment Processing Fees (`=Gross Revenue * 2.9% + $0.30/txn`)
  - Marketing & Customer Acquisition Budget
- **Summary Metrics (Formulas)**:
  - Total Monthly Expenses = `=SUM(Expenses)`
  - Net Profit / Monthly Burn = `=Gross Revenue - Total Expenses`
  - Cumulative 12-Month Net Total = `=SUM(B25:M25)`

#### Formula Injection Mitigation (CWE-1236)
All text cells populated from user inputs or AI model outputs MUST be sanitized before insertion into the XML/worksheet structure:
If a string begins with `=`, `+`, `-`, `@`, `\t`, or `\r`, prepend a single quote `'` or force cell data type to string (`t="inlineStr"` or `t="s"`).

---

### 14.5 Verification of Phase 5.5 Sharing Security Design

A comprehensive inspection of the Phase 5.5 implementation confirms:

1. **Fail-Safe Encryption Configuration**:
   - `backend/utils/encryption.js` verifies `process.env.SHARE_ENCRYPTION_KEY` is a 32-byte secret (64-character hex).
   - If missing or invalid, `encryptToken` throws an explicit error and *never* falls back to plaintext.
   - `planShareController.js` catches missing key errors and maps them to HTTP 500 `{ success: false, error: { code: 'ENCRYPTION_CONFIGURATION_ERROR' } }`.
   - Covered by deterministic test in `backend/tests/planShareRecovery.test.js` (Test 10).

2. **Zero Secret Leakage**:
   - Neither `share_token` (SHA-256 hash) nor `encrypted_token` (AES-256-GCM ciphertext) is ever included in public DTOs (`toPublicSharedPlan`) or owner share status responses.
   - Public endpoint `GET /api/shared/:token` strips owner ID, user ID, and internal database IDs.
   - Controller error logging prints `error.message` only, never logging tokens or token-bearing URLs.

3. **Concurrency & One-Active-Share Guarantee**:
   - **Link Replacement (`replace: true`)**: Wrapped in `dbInstance.transaction(() => { ... })`. Executes serially, revoking prior active links before inserting replacement.
   - **Initial Share Creation (`replace: false`)**: Resolved in Corrective Chunk 5.5.1 via Migration 005 (`idx_plan_shares_one_active` partial unique index on `plan_shares(plan_id) WHERE is_active = 1`), transactional re-checking in `createOrGetActiveShare`, and graceful `SQLITE_CONSTRAINT_UNIQUE` conflict recovery that returns the winning active share.

4. **Key Persistence Requirements**:
   - `SHARE_ENCRYPTION_KEY` must remain persistent in the host environment. If rotated or lost, existing links remain active publicly (via SHA-256 hash lookup), but authenticated owners will be prompted with `requiresReplacement: true` to generate a fresh recoverable link upon reopening the share modal.

---

### 14.6 Proposed Phased Implementation Plan

- **Chunk 5.6A (Current)**: Architecture Audit, data availability verification, format comparison, and security review. (COMPLETED)
- **Chunk 5.6B (Future)**: Financial Model Export Engine Implementation: (COMPLETED)
  - Helper `frontend/src/utils/financialExportHelpers.js`: Workbook builder, formula generator, CWE-1236 sanitizer, and file downloader (`[StartupName]-Financial-Model.xlsx`).
  - Update `ExportTab` in `DashboardTabs.js`: Replace "Coming Soon" badge with an active "Export Excel" action button.
  - Comprehensive unit and integration tests verifying workbook structure, formulas, and sanitization.

---

## 15. Financial Model XLSX Export Engine (Phase 5.6B Implementation)

### 15.1 Architectural Objectives & Library Selection

Phase 5.6B implements the client-side Financial Model export feature, replacing the placeholder in `DashboardTabs.js` with an active OpenXML (`.xlsx`) workbook generator.

#### Library Decision: `exceljs` (^4.4.0)
- **Zero Server Overhead**: Generates workbooks directly in the user's browser as in-memory ArrayBuffers converted to downloadable Blobs (`application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
- **Complete OpenXML & Formula Support**: Full fidelity for multi-sheet workbooks, native cell formulas (`=SUM()`, `=IF()`, cell references across sheets), number formatting (`$#,##0.00`, `0.0%`), column styling, and auto-wrapped text cells.
- **MIT License & Webpack Compatibility**: Pure JavaScript library compatible with the existing React 19 / CRA build pipeline.
- **Why Alternatives Were Rejected**:
  - *`xlsx` (SheetJS Community)*: Free tier disables formula computation write styles and has legacy licensing ambiguities.
  - *Server-Side Generation*: Would introduce server compute load, temporary file storage risks, and unnecessary backend endpoints for data already loaded in the client session.
  - *CSV Export*: Inability to support multi-sheet structures, formulas, number formats, or styled headers.

---

### 15.2 Four-Worksheet Workbook Architecture

The generated workbook organizes strategic qualitative data and dynamic quantitative projections across 4 dedicated worksheets:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                      Startup-AI Financial Model Workbook                │
├────────────────────────────────┬───────────────────────────────────────┤
│ Sheet 1: Executive Overview    │ • Startup intake metadata & context   │
│          & Assumptions         │ • Editable Model Assumptions (B20:B27)│
├────────────────────────────────┼───────────────────────────────────────┤
│ Sheet 2: Monetization &        │ • Normalized revenue narrative        │
│          Revenue Strategy      │ • Pricing model, benchmarks & growth  │
├────────────────────────────────┼───────────────────────────────────────┤
│ Sheet 3: Cost Structure &      │ • Lean Canvas cost driver categories  │
│          Operational Drivers   │ • Key metrics & MVP feature scope     │
├────────────────────────────────┼───────────────────────────────────────┤
│ Sheet 4: 12-Month Projections  │ • Interactive formula-driven model    │
│          (Working Model)       │ • Dynamically wired to Sheet 1 inputs │
│                                │ • Prominently marked as illustrative  │
└────────────────────────────────┴───────────────────────────────────────┘
```

#### 1. Sheet 1: `Executive Overview & Assumptions`
- **Metadata**: Startup Name, Industry/Domain, Generation Date, and Plan ID.
- **Foundational Strategy**: Elevator Pitch, Problem Statement, Solution, and Unique Selling Proposition.
- **OpenXML 31-Character Worksheet Name Limit**:
  - The OpenXML standard strictly caps worksheet tab names at 31 characters.
  - `Executive Overview & Assumptions` (32 chars) is truncated to `Executive Overview & Assumption` (31 chars) by ExcelJS.
  - Formulas in Sheet 4 dynamically reference `'${wsOverview.name}'!$B$20` to guarantee reference integrity without `#REF!` errors.
  - `generateFinancialModelWorkbook` wraps `workbook.getWorksheet` to seamlessly match both the full and truncated tab names.
- **Editable Baseline Assumptions Table (`B20:B27`)**:
  - `B20`: Average Revenue per User / Sub (ARPU) — Default `$49.00` (`$#,##0.00`)
  - `B21`: Starting Active Customers — Default `10` (`#,##0`)
  - `B22`: Monthly Customer Growth Rate — Default `15.0%` (`0.0%`)
  - `B23`: Base Infrastructure Cost / Month — Default `$100.00` (`$#,##0.00`)
  - `B24`: Variable Infrastructure / Active User — Default `$1.50` (`$#,##0.00`)
  - `B25`: Payment Processing Rate — Default `2.9%` (`0.0%`)
  - `B26`: Payment Processing Fixed Fee / Txn — Default `$0.30` (`$#,##0.00`)
  - `B27`: Monthly Fixed Operating Expenses — Default `$500.00` (`$#,##0.00`)

#### 2. Sheet 2: `Monetization & Revenue Strategy`
- Preserves the AI-generated qualitative revenue narrative and pricing models without data loss or modification.
- **Dual Schema Normalization**:
  - Supports both the frontend array representation (`[ { model, description, projection } ]`) and the backend object representation (`{ revenueStreams, pricingStrategy, expectedMonthlyRevenue, growthOpportunities }`).
  - Gracefully falls back to `leanCanvas.revenueStreams` if the revenue module is partially populated.
  - Preserves `growthOpportunities` in full.

#### 3. Sheet 3: `Cost Structure & Operational Drivers`
- Categorizes Lean Canvas `costStructure` into actionable buckets (Infrastructure, People, Acquisition, Operations).
- Outlines `keyMetrics` (e.g. MRR, CAC, Churn) and lists core MVP features from `mvp.coreFeatures` as direct engineering drivers.

#### 4. Sheet 4: `12-Month Working Model`
- Provides an interactive 12-month projection matrix (Months 1–12 across Columns C through N).
- **Application-Authored Formula Engine**:
  - **Active Customers**: Month 1 references `='${wsOverview.name}'!$B$21`; Months 2–12 calculate `=C7*(1+'${wsOverview.name}'!$B$22)`.
  - **Gross Revenue**: Calculates `=C7*'${wsOverview.name}'!$B$20`.
  - **Cloud & Infrastructure Cost**: Calculates `='${wsOverview.name}'!$B$23+(C7*'${wsOverview.name}'!$B$24)`.
  - **Payment Processing Fees**: Calculates `=(C8*'${wsOverview.name}'!$B$25)+(C7*'${wsOverview.name}'!$B$26)`.
  - **Total COGS**: Sums `=C11+C12`.
  - **Gross Profit**: Calculates `=C8-C13`.
  - **Gross Margin %**: Employs guarded formula `=IF(C8>0,C15/C8,0)` to avoid `#DIV/0!` errors when revenue is zero.
  - **Operating Expenses**: References `='${wsOverview.name}'!$B$27`.
  - **Total Expenses**: Sums `=C13+C18`.
  - **Net Operating Income (EBITDA)**: Calculates `=C8-C20`.
  - **Cumulative Net Profit**: Month 1 `=C21`; Months 2–12 sum `=C23+D21`.
  - **Annual Total Column (O)**: Sums revenue and costs via `=SUM(C8:N8)` and computes full-year gross margin.
- **Prominent Illustrative Notice**: Clearly flags the model as an interactive starter template driven by Sheet 1 assumptions, ensuring founders understand that projections are formulaic models rather than AI guarantees.

---

### 15.3 Security Hardening & Formula Injection (CWE-1236) Protection

All cell content populated from user inputs or AI model outputs is strictly sanitized prior to insertion:
- **Formula Injection Mitigation**: Any string beginning with `=`, `+`, `-`, `@`, `\t`, or `\r` is escaped with a prepended single quote (`'`), preventing Excel or Google Sheets from interpreting malicious text as executable macro expressions or external commands.
- **Path Traversal & Filename Sanitization**: The export filename is generated via `sanitizeExportFilename(startupName)`:
  - Replaces all characters outside `[a-zA-Z0-9_-]` with hyphens (`-`).
  - Strips leading/trailing hyphens and compresses multiple hyphens.
  - Blocks directory traversal sequences (e.g. `../../etc/passwd` becomes `etc-passwd`).
  - Truncates to a maximum of 50 characters and defaults to `Startup-AI-Financial-Model.xlsx`.

---

### 15.4 Defensive Handling of Partial / Missing Plan Data

The export helper handles incomplete, partially generated, or malformed plans safely:
- Safe optional chaining and fallback strings (`"Not specified"`, `"No data available"`).
- Empty arrays or missing modules render clean empty-state tables without throwing JavaScript runtime errors.
- Never fabricates fake quantitative numbers or treats mock UI cards as real data.

---

### 15.5 Dashboard Integration & State UX

Integrated into `ExportTab` within `frontend/src/components/DashboardTabs.js`:
- Replaces the "Coming Soon" badge on the Financial Model card with an active "Export Excel" action button.
- Disabled when plan data is unavailable (`!data`).
- Includes asynchronous state management: loading spinner ("Generating Excel..."), success confirmation ("Downloaded!"), and error alert handling.
- Implements duplicate-click guard to prevent concurrent export jobs.
- Preserves existing Business Plan PDF export, Pitch Deck navigation, and Share Link modal management completely untouched.
- Introduces an explicit, genuinely unsupported 4th export card ("Cap Table & Equity") marked with a "Coming Soon" badge and disabled button to preserve user roadmap visibility.




