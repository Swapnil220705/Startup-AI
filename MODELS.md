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

## 2. Configuration Locations

The model is configured across 6 backend model files:

1. `backend/models/leanCanvas.js` (`generateLeanCanvas`)
2. `backend/models/competitorsModel.js` (`generateCompetitors`)
3. `backend/models/mvpGenerator.js` (`generateMVP`)
4. `backend/models/personasModel.js` (`generatePersonas`)
5. `backend/models/pitchModel.js` (`generatePitch`)
6. `backend/models/revenueModel.js` (`generateRevenue`)

In all 6 files, the endpoint is declared as:
```javascript
const MODEL_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:generateContent';
```

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

## 4. Response Format & Parsing

- **Prompting Strategy**: Every prompt instructs the model to return "strictly valid JSON" adhering to a documented schema, explicitly instructing the exclusion of conversational filler.
- **Robust Parsing Utility (`backend/utils/jsonParser.js`)**:
  Gemini outputs frequently contain variations such as markdown code blocks (` ```json ... ``` `), conversational wrappers, trailing commas, UTF-8 BOMs, or unclosed fences. Responses across all 6 models are processed via `parseGeminiJson(rawText)`:
  ```javascript
  const { parseGeminiJson } = require('../utils/jsonParser');

  // In each model handler:
  const rawText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  return parseGeminiJson(rawText);
  ```
  - **Parsing Pipeline**:
    1. Strips UTF-8 BOM and zero-width spaces; trims whitespace.
    2. Fast path: Direct `JSON.parse` attempt.
    3. Fenced code block extraction (` ```json `, ` ```JSON `, ` ```javascript `, ` ``` `) including unclosed fences.
    4. Outermost object `{...}` or array `[...]` candidate extraction (handling conversational preambles/postambles).
    5. Trailing comma sanitization outside quoted string literals.
    6. Descriptive `SyntaxError` reporting if all strategies fail.
- **Fallback**: Throws an error caught by Express controllers if JSON parsing fails or the HTTP request errors out.

---

## 5. Verification & Connectivity Note

- **Model Availability**: Confirmed present and verified via `GET https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash`.
- **Token Counting**: Verified working via `POST https://generativelanguage.googleapis.com/v1/models/gemini-3.8-flash:countTokens` (`HTTP 200`).
- **Generation Status**: In Chunk 0.1, the currently configured project API key returns `403 Forbidden: "Your project has been denied access. Please contact support."` on `generateContent` across all models due to a Google Cloud project-level hold. The code has been upgraded to `gemini-3.8-flash` per user directive while documenting the external API quota/access hold.

---

## 6. Model Change History

- **Chunk 0.1**: `gemini-2.5-flash → gemini-3.8-flash`
  - *Rationale*: Google Generative Language API flagged `gemini-2.5-flash` as deprecated for new users ("*This model models/gemini-2.5-flash is no longer available to new users. Please update your code to use models/gemini-3.8-flash*"). Upgraded all 6 backend modules to `gemini-3.8-flash`.
- **Chunk 2.1**: Upgraded JSON response parsing across all 6 backend models from naive `replace(/```json|```/g, '')` to robust `parseGeminiJson` utility in `backend/utils/jsonParser.js`. Covers markdown code blocks, uppercase tags, unclosed fences, conversational preambles/postambles, trailing commas, and BOM sanitization.
