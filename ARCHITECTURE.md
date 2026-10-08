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

### 10.2 Recommended PDF Export Architecture

#### 1. Client-Side vs. Server-Side Evaluation

| Architecture | Pros | Cons | Verdict for Startup-AI |
|---|---|---|---|
| **Server-Side Headless (Puppeteer / Playwright)** | Exact pixel-perfect Chromium rendering. | Adds 200MB+ Chromium binary, consumes 150–300MB RAM per render, crashes low-memory VPS/serverless, fragile Docker dependencies (`libnss3`, etc.). | **REJECTED** for current stack. Extreme operational overhead. |
| **Server-Side Node PDFKit** | Lightweight (<10MB), fast, no browser dependency. | Requires manual programmatic coordinate drawing; difficult to match responsive Tailwind typography and cards. | **REJECTED** as primary export. High maintenance effort. |
| **Client-Side DOM-to-Canvas (`html2canvas` + `jsPDF`)** | Simple client capture. | Produces rasterized, blurry bitmap PDFs with huge file sizes (5–20MB); text is non-selectable and non-searchable; fragile on mobile. | **REJECTED**. Unprofessional output. |
| **Client-Side Print CSS (`@media print`) + Declarative Vector PDF** | 0 KB added server bloat, crisp selectable vector text, native browser print-to-PDF, zero deployment dependencies, works on all platforms. | Cannot silently auto-download without user print dialog on pure CSS approach; declarative requires formatted layout templates. | **RECOMMENDED**. Dual strategy provides highest reliability with zero server overhead. |

#### 2. Selected PDF Architecture: Dual Vector & Print Engine
- **Primary Mechanism**: Polished CSS Print Stylesheet (`@media print`) tailored for `/pitch-preview` (landscape slides) and `/dashboard` (portrait business plan).
  - Strips navigation headers, background noise, and interactive buttons.
  - Enforces explicit page breaks (`break-inside: avoid; page-break-after: always`).
  - Vector-sharp text, preserved colors, and native browser PDF output.
- **Direct Download Enhancer**: Lightweight client-side vector generator (e.g. `pdfmake` or standalone print iframe helper) providing 1-click "Download PDF" without server load.
- **Export Scope**:
  - **Pitch Deck PDF**: 7-slide landscape presentation deck matching `PitchPreviewPage`.
  - **Full Business Plan PDF**: Formatted multi-page portrait document covering Executive Summary, Lean Canvas, MVP, Revenue, Personas, and Competitors.
- **Storage Strategy**: **Stateless On-Demand Generation (Zero Binary Storage)**. PDFs are generated dynamically and delivered directly. No binary BLOBs stored in SQLite; zero server disk clutter.
- **Export Authorization**: Strictly adheres to Phase 4.3 rules:
  - Authenticated owner: allowed for owned plans.
  - Anonymous trial visitor: allowed for their active trial plan matching `startup_ai_trial` cookie.
  - Unauthorized third parties: safe HTTP 404 `PLAN_NOT_FOUND`.

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
2. **Chunk 5.2 — Pitch Deck & Business Plan PDF Export Engine**
   - Implement print stylesheet rules (`@media print`) and client-side vector PDF generation on `PitchPreviewPage` and `DashboardTabs`.
   - Wire "Download PDF" and "Pitch Deck" export actions with proper loading and progress indicators.
3. **Chunk 5.3 — Plan Sharing Database Foundation & Backend API**
   - Migration 003 (`plan_shares` table).
   - Endpoints: `POST /api/plans/:id/share`, `DELETE /api/plans/:id/share`, `GET /api/shared/:token`.
   - Rate limiting, token validation, and error sanitization.
4. **Chunk 5.4 — Public Shareable Presentation Page & Viral Growth UX**
   - Dedicated route `/share/:token` and component `SharedPitchPage`.
   - Branded read-only presentation viewer with slide navigation and "Create Your Own Startup Plan" CTA.
5. **Chunk 5.5 — Dashboard & Pitch Preview Share Management UX**
   - "Share Link" modal on `DashboardTabs` and `PitchPreviewPage` with 1-click clipboard copy, QR code, and revocation controls.
   - Comprehensive integration tests and end-to-end verification.

---

