# AI Models Documentation

This document records the verified AI models, endpoints, and configuration used in **Startup-AI**.

---

## 1. Active Primary Model

| Attribute | Verified Value |
|---|---|
| **Provider** | Google (Google AI Studio / Generative Language API) |
| **Model Name** | `gemini-3.8-flash` |
| **Full Resource Name** | `models/gemini-3.8-flash` |
| **Model Version** | `3.0` |
| **Display Name** | Gemini 3.8 Flash |
| **Input Token Limit** | 1,048,576 tokens |
| **Output Token Limit** | 65,536 tokens |
| **Supported Methods** | `generateContent`, `countTokens`, `createCachedContent`, `batchGenerateContent` |
| **API Endpoint** | `https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}` |
| **SDK / API Method** | Direct HTTP REST calls via `axios` (`POST`) |
| **Authentication** | Query parameter API key (`?key=${GEMINI_API_KEY}`) from `backend/.env` |

---

## 2. Configuration & Centralized Client

Gemini requests are centralized through `backend/services/geminiClient.js`, which manages:
- HTTP requests via Axios
- Request timeouts (default: 30,000 ms)
- In-process concurrency rate limiting (default: max 2 concurrent requests)
- Transient error classification & exponential backoff with jitter
- Header `Retry-After` parsing

All 6 backend generation models delegate requests to `callGemini(prompt, options)`:
1. `backend/models/leanCanvas.js` (`generateLeanCanvas`)
2. `backend/models/competitorsModel.js` (`generateCompetitors`)
3. `backend/models/mvpGenerator.js` (`generateMVP`)
4. `backend/models/personasModel.js` (`generatePersonas`)
5. `backend/models/pitchModel.js` (`generatePitch`)
6. `backend/models/revenueModel.js` (`generateRevenue`)

### Environment & Tuning Configuration

| Variable | Default Value | Description |
|---|---|---|
| `GEMINI_API_KEY` | *(from `.env`)* | Google AI Studio REST API authentication key |
| `GEMINI_MODEL_URL` | `https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent` | Target model endpoint |
| `GEMINI_MAX_RETRIES` | `3` | Maximum retry attempts for transient errors |
| `GEMINI_RETRY_BASE_DELAY_MS` | `1000` | Base exponential backoff delay (ms) |
| `GEMINI_RETRY_MAX_DELAY_MS` | `10000` | Maximum backoff delay cap (ms) |
| `GEMINI_TIMEOUT_MS` | `30000` | Axios HTTP request timeout (ms) |
| `GEMINI_MAX_CONCURRENT` | `2` | Maximum concurrent in-process requests to Gemini |

---

## 3. Purpose & Application Features

The model handles structured generative reasoning for all 6 startup intelligence modules:

1. **Lean Canvas Generation** (`/api/lean-canvas`):
   - Generates a 9-box Lean Canvas (problem, solution, key metrics, UVP, channels, customer segments, cost structure, revenue streams, unfair advantage).
2. **Competitor Analysis** (`/api/competitors`):
   - Identifies 3 realistic competitors with descriptions and differentiators.
3. **MVP Planning** (`/api/mvp`):
   - Outlines core MVP features, technical stack recommendations, and launch timelines (1-3 months).
4. **User Personas** (`/api/personas`):
   - Creates 2 detailed demographic and behavioral customer profiles (goals, pain points, tech comfort).
5. **Elevator Pitch** (`/api/pitch`):
   - Formulates a 2-4 sentence punchy investor-friendly elevator pitch.
6. **Revenue & Pricing Strategy** (`/api/revenue`):
   - Produces monetization models, pricing approaches, monthly revenue projections, and growth vectors.

---

## 4. Request Flow, Retry Strategy & Response Parsing

- **Prompting Strategy**: Every prompt instructs the model to return "strictly valid JSON" adhering to a documented schema, explicitly instructing the exclusion of conversational filler.
- **Request Pipeline (`backend/services/geminiClient.js`)**:
  All 6 models dispatch requests through `callGemini(prompt, options)`:
  ```javascript
  const { callGemini } = require('../services/geminiClient');
  const { parseGeminiJson } = require('../utils/jsonParser');

  // In each model handler:
  const rawText = await callGemini(prompt, { context: 'Lean Canvas' });
  return parseGeminiJson(rawText);
  ```
  - **Concurrency Limiting**: In-process semaphore throttles bursts to a maximum of 2 concurrent requests (`GEMINI_MAX_CONCURRENT`), smoothing the parallel intake spike.
  - **Timeout Protection**: Requests time out after 30,000 ms (`GEMINI_TIMEOUT_MS`) to prevent hanging sockets.
  - **Retry Classification**:
    - **Transient (Retryable)**: HTTP 429 (Rate Limit / Quota), HTTP 408, HTTP 500, 502, 503 (Overload), 504, socket hang up, `ECONNRESET`, `ETIMEDOUT`, `ECONNABORTED`, and network drops.
    - **Permanent (Non-Retryable)**: HTTP 400 (Bad Request), HTTP 401 (Unauthorized), HTTP 403 (Forbidden), HTTP 404 (Not Found). Fails immediately without wasting quota.
  - **Exponential Backoff with Jitter**:
    Calculates `min(maxDelay, baseDelay * 2^(attempt - 1) + jitter)`. Defaults: 1s base delay, doubling each attempt up to 10s maximum, with 25% proportional jitter.
  - **Retry-After Header**: Automatically parsed and respected when returned by Google API headers.
- **Robust Parsing Utility (`backend/utils/jsonParser.js`)**:
  Responses are parsed via `parseGeminiJson(rawText)`:
  1. Strips UTF-8 BOM and zero-width spaces; trims whitespace.
  2. Fast path: Direct `JSON.parse` attempt.
  3. Fenced code block extraction (` ```json `, ` ```JSON `, ` ```javascript `, ` ``` `) including unclosed fences.
  4. Outermost object `{...}` or array `[...]` candidate extraction (handling conversational preambles/postambles).
  5. Trailing comma sanitization outside quoted string literals.
  6. Descriptive `SyntaxError` reporting if all strategies fail.
---

## 5. API Error Contract & Partial Generation Handling (Chunk 2.3)

### Standardized Error Response Contract
When model generation requests fail after retries or encounter client-side validation errors, backend controllers return a consistent, safe JSON structure via `backend/utils/apiError.js`:

```json
{
  "success": false,
  "error": {
    "code": "GENERATION_FAILED",
    "message": "Failed to generate Lean Canvas: AI service is temporarily unavailable or timed out after retries."
  }
}
```

### HTTP Status Code Mapping
- **HTTP 400 (`INVALID_INPUT`)**: Missing required payload fields (e.g. `startupName`) or invalid request body.
- **HTTP 429 (`RATE_LIMIT_EXCEEDED`)**: Upstream Google Gemini quota exhaustion or RPM rate limits exceeded after all retry attempts.
- **HTTP 503 (`UPSTREAM_UNAVAILABLE`)**: Upstream Google Gemini overload (502, 503, 504) or socket/network timeouts (`ETIMEDOUT`, `ECONNRESET`, `ECONNABORTED`).
- **HTTP 500 (`GENERATION_FAILED`)**: Unhandled internal errors or unparseable generative responses.

### Error Payload Safety Guarantees
- `GEMINI_API_KEY`, Bearer tokens, and Authorization headers are strictly scrubbed and never returned in error messages.
- Full generative prompts and raw upstream payloads are omitted from client responses.
- Internal stack traces are suppressed in production HTTP responses.
- Successful response contracts (`res.status(200).json(data)`) remain unwrapped to preserve full compatibility with existing frontend consumers.

### Frontend Partial Generation Execution
- **Concurrent Execution**: `frontend/src/pages/IdeaInputPage.js` uses `Promise.allSettled()` to dispatch all 6 module requests in parallel, preventing a single failure from cancelling other successful results.
- **Stale Data Protection**: All previous generation keys (`leanCanvas`, `mvp`, `revenue`, `pitch`, `personas`, `competitors`, `generationErrors`) are purged from `localStorage` before initiating new generation.
- **Selective Persistence**: Fulfilled modules are stored immediately. Failed modules are never filled with fabricated or placeholder data.
- **Flow Branching**:
  - **Full Success (6/6)**: All modules saved, `generationErrors` cleared, navigated to `/dashboard`.
  - **Partial Success (1-5/6)**: Successful modules saved, failed modules recorded in `generationErrors`, user navigated to `/dashboard` with an informative notice banner displaying available and unavailable sections.
  - **Complete Failure (0/6)**: Navigation halted on `/start`, error message shown to user, allowing immediate retry without creating corrupted dashboard state.
- **Dashboard Defensive Rendering**: Every tab component (`MVPTab`, `LeanCanvasTab`, `RevenueTab`, `CompetitorsTab`, `PersonasTab`, `OverviewTab`) and `PitchPreviewPage` renders clean empty states when its respective module is absent.

---

## 6. Verification & Connectivity Note

- **Model Availability**: Confirmed present and verified via `GET https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash`.
- **Token Counting**: Verified working via `POST https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:countTokens` (`HTTP 200`).
- **Generation Status**: Live generation functions on `gemini-3.8-flash`. Verified in Chunk 2.2 with a controlled live smoke-test that recovered from a transient 503 overload using automatic exponential backoff.
- **Quota Limitations**: Free tier enforces a 5 requests per minute (RPM) limit. Parallel 6-request bursts are throttled by the local concurrency limiter and recovered via exponential backoff.

---

## 7. Model Change History

- **Chunk 0.1**: `gemini-2.5-flash → gemini-3.8-flash`
  - *Rationale*: Google Generative Language API flagged `gemini-2.5-flash` as deprecated for new users ("*This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash*"). Upgraded all 6 backend modules to `gemini-3.8-flash`.
- **Chunk 2.1**: Upgraded JSON response parsing across all 6 backend models from naive `replace(/```json|```/g, '')` to robust `parseGeminiJson` utility in `backend/utils/jsonParser.js`. Covers markdown code blocks, uppercase tags, unclosed fences, conversational preambles/postambles, trailing commas, and BOM sanitization.
- **Chunk 2.2**: Centralized Gemini HTTP requests into `backend/services/geminiClient.js`. Implemented bounded exponential backoff with proportional jitter, `Retry-After` header extraction, transient error classification (retrying 429, 500, 502, 503, 504, network errors; failing fast on 400, 401, 403), 30s request timeouts, and in-process concurrency limiting (max 2 concurrent requests).
- **Chunk 2.3**: Established standardized backend API error contract (`{ success: false, error: { code, message } }`) with upstream status mapping (400, 429, 503, 500) and secret redaction. Replaced brittle `Promise.all` with `Promise.allSettled` in `IdeaInputPage.js`, added stale `localStorage` cleanup, added partial-generation status banner in `DashboardPage.js`, and added defensive missing-data fallback cards across dashboard tabs.
- **Chunk 3.1**: Added server-side SQLite persistence layer (`backend/services/planService.js`, `backend/controllers/planController.js`, `backend/routes/plans.js`) preserving complete AI model output payloads (Lean Canvas, MVP, Revenue, Pitch, Personas, Competitors) along with generation status and error metadata.
- **Chunk 3.2**: Connected frontend generation output to backend persistence API (`POST /api/plans`). Successfully generated model outputs are persisted to SQLite, returning server-generated `currentPlanId`. Browser `localStorage` is maintained as active session state.
- **Chunk 3.3**: Restored canonical `/my-plans` history route and implemented real API-backed plan history page (`HistoryPage.js`) consuming `GET /api/plans`. Listing excludes heavy JSON model documents to maintain optimal query performance while exposing plan metadata and generation statuses.



