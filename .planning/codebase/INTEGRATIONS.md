# External Integrations

**Analysis Date:** 2026-05-05

## APIs & External Services

**AI / Language Model:**
- Google Gemini 2.5 Flash — primary AI model for all text generation and query tasks
  - SDK/Client: native `fetch` calls to `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`
  - Auth: `GEMINI_API_KEY` environment variable (Cloudflare dashboard secret)
  - Used for: lesson note polishing, reply suggestions, payment message tone, practice guides, monthly reports, punctuation, natural language queries, churn analysis
  - Function calling: `callGeminiTools()` in `functions/api/ai/_utils/anthropic.js` — used by `query.js` for structured data retrieval
  - Note: file is named `anthropic.js` but actually calls Gemini (historical artifact)

**Google Fonts CDN:**
- `https://fonts.googleapis.com` — `Noto Serif KR` + `Noto Sans KR`
- Loaded via `@import` inside the CSS string in `src/constants.jsx`
- No SRI hash; loaded async by browser

## Data Storage

**Databases:**
- Firebase Firestore (Cloud Firestore)
  - Project: `rye-k-center`
  - Connection: hardcoded `firebaseConfig` in `src/firebase.js` (public config — not a secret)
  - Client: Firebase JS SDK v10 (`firebase/firestore`)
  - Pattern: single collection `appData`, documents keyed by string (e.g. `rye-students`, `rye-teachers`)
  - Each document: `{ value: T[], updatedAt: number }`
  - Real-time sync via `onSnapshot` listeners in `App.jsx`

**Firestore Collections (all under `appData`):**

| Key | Type | Description |
|-----|------|-------------|
| `rye-teachers` | `Teacher[]` | Staff profiles |
| `rye-students` | `Student[]` | Member roster |
| `rye-attendance` | `Attendance[]` | Attendance records with lesson notes + comments |
| `rye-payments` | `Payment[]` | Fee payment records |
| `rye-notices` | `Notice[]` | Bulletin board |
| `rye-categories` | `object` | Instrument category tree |
| `rye-fee-presets` | `object` | Fee and rental presets |
| `rye-schedule-overrides` | `ScheduleOverride[]` | Ad-hoc schedule changes |
| `rye-activity` | `ActivityLog[]` | Audit log |
| `rye-pending` | `Pending[]` | Teacher registration queue |
| `rye-trash` | `TrashItem[]` | Soft-delete bin |
| `rye-student-notices` | `StudentNotice[]` | Member-specific notices |
| `rye-institutions` | `Institution[]` | B2B partner organizations |

**File Storage:**
- Local filesystem only — photos stored as base64 strings directly in Firestore documents (no separate object storage)

**Caching:**
- Cloudflare KV (`RATE_LIMIT_KV` binding) — used exclusively for per-user AI rate limiting
  - Key pattern: `rl:{uid}:{minute_bucket}`
  - TTL: 120 seconds
  - Limit: 20 requests per user per minute
  - Implementation: `functions/api/ai/_utils/ratelimit.js`

## Authentication & Identity

**Auth Provider:**
- Firebase Authentication
  - Client: Firebase JS SDK v10 (`firebase/auth`)
  - Implementation: `src/firebase.js`

**Auth Modes:**

| Mode | Flow | Users |
|------|------|-------|
| Email/password | Synthetic email `{username}@ryek.app` + derived password | Teachers, managers, admin |
| Anonymous | `signInAnonymously()` | Public portal visitors |
| Hybrid | `aiClient.js` uses anonymous auth as fallback for AI token acquisition | AI API callers |

**Server-side token verification:**
- Library: `jose` v5 (JOSE/JWT)
- Mechanism: `jwtVerify()` against Google JWKS at `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`
- Issuer check: `https://securetoken.google.com/rye-k-center`
- Implementation: `functions/api/ai/_utils/auth.js`
- Anonymous users (`payload.sub` present but anonymous flag set) are accepted by the token verifier; the middleware (`functions/api/ai/_middleware.js`) does NOT explicitly block anonymous tokens — only missing/invalid tokens are blocked

**Session persistence:**
- `localStorage['rye-session']` — staff app login session
- `sessionStorage['ryekPortal']` — portal auto-login
- `localStorage['ryek_last_login']` — 30-day re-auth timestamp

## Monitoring & Observability

**Error Tracking:**
- None — no Sentry, Datadog, or similar service integrated

**Logs:**
- `console.error` in Cloudflare Functions — visible in Cloudflare dashboard Workers logs
- `console.warn` for Gemini truncation warnings in `functions/api/ai/_utils/anthropic.js`
- Activity log stored in Firestore (`rye-activity` key) for user-facing audit trail

## CI/CD & Deployment

**Hosting:**
- Cloudflare Pages
  - Build output dir: `dist/` (configured in `wrangler.toml`)
  - Compatibility date: `2024-09-23`
  - Functions: `functions/` directory auto-detected by Cloudflare Pages as Edge Workers

**CI Pipeline:**
- No explicit CI workflow file (no `.github/workflows/`) — Cloudflare Pages handles build + deploy automatically on push to `main`
- Build command run by Cloudflare: `npm run build` (Vite)

**Repository:**
- GitHub: `nickujung-art/rye-k`
- Branch: `main` is production

## Cloudflare Pages Functions (AI Layer)

All functions live under `functions/api/ai/` and are served at `/api/ai/{endpoint}`.

**Middleware** (`functions/api/ai/_middleware.js`):
- Applied to all `/api/ai/*` routes
- Checks: method=POST, `AI_ENABLED` flag, Firebase token verification, KV rate limit
- Returns 405 / 503 / 401 / 429 as appropriate

**AI Endpoints:**

| File | Endpoint | Purpose |
|------|----------|---------|
| `lesson-note.js` | `/api/ai/lesson-note` | Polish teacher's lesson note text |
| `reply-suggest.js` | `/api/ai/reply-suggest` | Suggest parent/student comment reply |
| `payment-tone.js` | `/api/ai/payment-tone` | Adjust tone of payment reminder messages |
| `practice-guide.js` | `/api/ai/practice-guide` | Generate practice assignment suggestions |
| `monthly-report.js` | `/api/ai/monthly-report` | Generate monthly progress report for a student |
| `punctuate.js` | `/api/ai/punctuate` | Add punctuation to voice-dictated text |
| `query.js` | `/api/ai/query` | Natural language → structured data query (Gemini function calling) |
| `churn.js` | `/api/ai/churn` | Analyze churn-risk students and produce advisory comments |

**PII Protection** (`functions/api/ai/_utils/pii-guard.js`):
- Strips `phone`, `guardianPhone`, `email`, `address`, `bizNumber`, `contactEmail`, `contactPhone` keys from all request bodies before passing to Gemini

**Name Anonymization** (`functions/api/ai/_utils/anonymize.js`):
- Used in `lesson-note.js` when `AI_SAFE_MODE=true`
- Replaces student names with tokens before sending to Gemini; restores them in the response

## Client-Side AI Integration

**`src/aiClient.js`** — thin client wrapper:
- Obtains Firebase ID token (uses anonymous auth as fallback)
- POSTs to `/api/ai/{endpoint}` with `Authorization: Bearer {token}`
- Exported functions: `callAi`, `aiPolishLessonNote`, `aiSuggestReply`, `aiPolishPaymentMessage`, `aiSuggestPractice`, `aiGenerateMonthlyReport`, `aiPunctuate`, `aiQuery`, `aiChurnAnalysis`
- Feature flag: `_aiEnabled` (toggled via `setAiEnabled()` from admin settings)

## Webhooks & Callbacks

**Incoming:**
- None — no webhook endpoints

**Outgoing:**
- None — no outgoing webhooks; all external calls are user-initiated API requests

## Environment Configuration

**Cloudflare dashboard secrets (runtime, not committed):**
- `GEMINI_API_KEY` — Google Gemini API key
- `AI_ENABLED` — `"true"` | `"false"` (503 gate for all AI endpoints)
- `AI_SAFE_MODE` — `"true"` | `"false"` (PII anonymization toggle)
- `RATE_LIMIT_KV` — KV namespace binding

**Vite build-time env vars (set in Cloudflare Pages build settings):**
- `VITE_AUTH_SALT` — salt for Firebase password derivation; **must never be changed after initial set**

**Firebase config:**
- Hardcoded in `src/firebase.js` (lines 5–12) — this is intentional for Firebase web apps; the public config is not a secret

---

*Integration audit: 2026-05-05*
