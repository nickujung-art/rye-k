# Domain Pitfalls — RYE-K

**Domain:** K-Culture education management PWA (React 18 + Firebase + Cloudflare Workers)
**Researched:** 2026-05-05
**Confidence:** HIGH (all findings grounded in actual codebase analysis)

---

## CRITICAL Pitfalls

These cause data loss, security breaches, or production outages if not addressed.

---

### Pitfall C-1: Anonymous Users Can Read All Student and Financial Data

**Severity: CRITICAL**
**Source: CONCERNS.md #1 + firestore.rules analysis**

**What goes wrong:**
The current Firestore rules grant `read` access to all of `appData/{document}` for any `isAuthed()` user, which includes anonymous Firebase users. Anonymous auth is granted automatically by `firebaseSignInAnon()` called from `PublicPortal.jsx` (the public `/register` and `/myryk` paths). This means any visitor to the registration form already holds a valid Firebase token and can read `rye-students`, `rye-teachers`, `rye-payments`, `rye-categories`, and `rye-fee-presets` — all in one Firestore document each.

The rules file itself acknowledges this at lines 55-59 as a planned v14.4 fix that has not been implemented.

**Why it happens:**
The anonymous auth was added so the `/register` form could submit to `rye-pending` without requiring login. The simplest fix at the time was to open all reads to any authed user. The deeper fix (denormalizing teacherName into student docs, moving portal comments to a subcollection) has been deferred.

**Consequences:**
- Student names, phone numbers, birthdates, and guardian contacts are fully readable by anyone who visits `/register`.
- Teacher contact information is exposed.
- Fee structures are exposed, enabling competitive intelligence.
- Violates Korean PIPA (개인정보보호법) Article 15 — data must be collected for the stated purpose only.

**Warning signs:**
- Any browser DevTools → Network tab → Firestore REST call returns full student array without a teacher login.
- `firestore.rules` `allow read: if isAuthed()` applies to more than just `rye-pending`.

**Prevention:**
1. Create a separate `appData/rye-portal-config` document containing only public-safe data (teacher names, category list) and allow anonymous read only on that document.
2. Change `rye-students`, `rye-teachers`, `rye-payments` to `allow read: if isEmailUser()`.
3. For portal access (student looking up own records), introduce a server-side Cloudflare Worker lookup that verifies the student code + birthdate combination before returning only that student's own data.

**Phase:** Security hardening phase — block all other features until this is closed.

---

### Pitfall C-2: Bulk-Overwrite Race Condition on Non-Student Collections

**Severity: CRITICAL**
**Source: CONCERNS.md #2**

**What goes wrong:**
The `saveStudents()` hard-lock only protects the student collection. Collections `rye-attendance`, `rye-payments`, `rye-teachers`, `rye-notices`, `rye-institutions` all still use full array overwrite — read the array from Firestore into React state, modify locally, write the entire array back. If two sessions (e.g., two browser tabs, or manager + teacher simultaneously) are open and both modify different records, the last writer wins and silently discards the other session's changes.

The same incident that caused 77 student records to vanish in 2025 can recur on attendance and payment history — the only difference is those losses might not be noticed immediately.

**Why it happens:**
The per-op transaction pattern was applied reactively after the student data loss. Other collections were not audited.

**Consequences:**
- Attendance records deleted silently during concurrent edits.
- Payment history partially overwritten — incorrect revenue reporting.
- Teacher records corrupted when manager and admin edit concurrently.

**Warning signs:**
- Any `saveX([...])` pattern where `X` is not students.
- Any `setDoc(ref, { value: [...existingArray, newItem] })` without a `runTransaction`.

**Prevention:**
Audit all write paths and replace array overwrites with `runTransaction`-based per-op functions mirroring the student pattern: `addAttendanceDoc`, `updateAttendanceDoc`, `addPaymentDoc`, `updatePaymentDoc`. The existing `addStudentDoc` / `updateStudentDoc` / `deleteStudentDoc` pattern in `src/App.jsx` is the reference implementation.

**Phase:** Security/data-integrity phase, paired with Firestore rules work.

---

### Pitfall C-3: `resetSeed()` Is Reachable in the Live Production Build

**Severity: CRITICAL**
**Source: CONCERNS.md #4**

**What goes wrong:**
The "샘플 데이터 초기화" button in AdminTools triggers `resetSeed()`, which overwrites the live Firestore database with seed data. There is no build-time guard and no runtime env check. Deploying the current code to Cloudflare Pages means a misclick by any admin-role user wipes ~77 students and all associated records.

**Warning signs:**
- The button renders in production without a `import.meta.env.DEV` guard.
- `generateSeedData()` in `App.jsx` is called outside of any dev-only conditional.

**Prevention:**
Wrap the entire seed/reset code path in `import.meta.env.DEV` checks. In Vite, this is tree-shaken from production bundles entirely. Alternatively, remove the function from the codebase and rely on a separate dev-only script.

**Phase:** Must be done before any new data migrations or portal expansion that increases admin user count.

---

### Pitfall C-4: Firebase UIDs Logged to Browser Console in Production

**Severity: CRITICAL**
**Source: CONCERNS.md #3 + src/aiClient.js lines 10, 14, 20, 23**

**What goes wrong:**
`src/aiClient.js` contains four `console.log` / `console.warn` calls that emit Firebase UIDs on every AI request. Anyone with DevTools open can read the UID of any logged-in user. UIDs can be used to construct authenticated Firestore requests if the security rules are permissive (and they currently are).

**Warning signs:**
- Browser DevTools Console shows `[ai] currentUser: <uid> true` on every lesson note generation.

**Prevention:**
Remove all `console.log` and `console.warn` calls from `src/aiClient.js`. The `getToken()` function has four such calls at lines 10, 14, 20, and 23. The `console.error` calls for genuine error paths can stay but should not expose UIDs.

**Phase:** Immediate — single-file, low-effort fix.

---

## HIGH Pitfalls

These cause significant operational problems but do not immediately lose data.

---

### Pitfall H-1: KakaoTalk AlimTalk Template Not Pre-Approved Before Go-Live

**Severity: HIGH**

**What goes wrong:**
The current `AlimtalkModal.jsx` generates message text dynamically using template strings and calls `onSend()`. The component has no actual KakaoTalk API integration — it is a UI shell. When the API integration is built, each message template must be submitted to Kakao for approval before it can be sent as an official AlimTalk. Template approval in Korea typically takes 3-10 business days and requires the sender to hold a verified KakaoTalk Channel.

If the templates are not pre-approved and the developer attempts to send messages using unapproved content, the messages are either rejected silently by the Kakao API or downgraded to a plain SMS fallback (which has higher per-message cost and no formatting).

The three current templates — `monthly_fee`, `unpaid_reminder`, `makeup_lesson` — each contain emoji characters. Kakao AlimTalk does not permit arbitrary emoji in approved templates; approved templates must use exactly the registered content.

**Warning signs:**
- No Kakao Business Channel has been registered.
- Template content in `TEMPLATES` object contains `💰`, `📅`, `😊` — these will cause template rejection.
- `onSend` prop is a no-op (`onSend?.()` with optional chaining suggests it is not wired).

**Prevention:**
1. Register a Kakao Business Channel (카카오 비즈니스 채널) before beginning API integration work.
2. Strip all emoji from template text before submitting for approval. Use plain Korean text.
3. Submit templates for approval at the start of the AlimTalk phase, not at the end.
4. Keep a separate `templateCode` identifier per template type to pass to the Kakao API — the approved template is referenced by code, not by content string.
5. Implement a fallback notification path (email or in-app banner) for the period before template approval completes.

**Phase:** AlimTalk integration phase — start channel registration and template submission as phase prerequisites, before writing API code.

---

### Pitfall H-2: KakaoTalk Channel Block Silently Drops Messages

**Severity: HIGH**

**What goes wrong:**
When a student or parent blocks the RYE-K KakaoTalk channel, the Kakao API returns a `200 OK` with a `resultCode` indicating the message was not delivered, rather than an HTTP error. If the integration only checks HTTP status, blocked recipients are silently ignored and the manager believes the message was sent.

**Warning signs:**
- Kakao AlimTalk API returns `resultCode: "E002"` (차단된 사용자) inside a 200 response body.

**Prevention:**
Parse the `resultCode` field in every Kakao API response. Log and surface failed recipients in the AlimtalkModal send result. Maintain a per-student "last delivery status" field to avoid repeatedly attempting blocked recipients. Provide managers a UI to see which sends failed and why.

**Phase:** AlimTalk integration — error handling design.

---

### Pitfall H-3: Bank Transfer Auto-Matching False Positives

**Severity: HIGH**

**What goes wrong:**
Korean bank transfer notifications (via virtual accounts or webhook services like Toss, NHN KCP, or direct bank APIs) include the depositor name as a free-text string from the bank. Student names are frequently abbreviated, use informal characters, or are entered incorrectly by the parent (e.g., "김민지" instead of "김민지(어머니)"). A matching algorithm that uses exact name matching will miss ~30% of legitimate deposits. A fuzzy match algorithm risks crediting a payment to the wrong student when two students have similar names (e.g., "이지수" and "이지숙").

The current `monthlyFee: 0` for all students (CONCERNS.md #15) means amount-based matching cannot disambiguate either.

**Warning signs:**
- All student `monthlyFee` fields are 0 — amount matching is not possible until this data is populated.
- No student name normalization function exists in `src/utils.js`.

**Prevention:**
1. **Populate `monthlyFee` before building auto-matching.** Without real fee data, the matching logic cannot use amount as a secondary signal.
2. Use a two-signal match: (a) depositor name fuzzy-matches a student name AND (b) deposit amount matches `monthlyFee`. Only auto-confirm when both match. Queue single-signal matches for manual review.
3. Build a manual review queue UI before the auto-match. Auto-matching is a convenience feature; the queue is the correctness safety net.
4. Store the raw bank transaction string alongside the matched payment record for audit purposes.

**Phase:** Payment automation phase — requires `monthlyFee` data population as a prerequisite.

---

### Pitfall H-4: Firestore 1MB Document Limit Will Be Hit by Attendance and Activity Logs

**Severity: HIGH**
**Source: CONCERNS.md #14**

**What goes wrong:**
All records of each type are stored as arrays in single Firestore documents. With 77 students attending ~4 lessons per month, the `rye-attendance` document grows by roughly 300+ records per month. Each attendance record contains a `lessonNote` object (progress, content, assignment, memo fields) plus a `comments` array. At current growth rate, the 1MB limit will be hit in approximately 12-18 months. When a Firestore document write is rejected due to size, the write silently fails — `setDoc` returns without error in some SDK versions.

**Warning signs:**
- `rye-attendance` document already contains records from multiple months.
- Activity log is already being truncated at 200 entries (CONCERNS.md #16) — a symptom of the same root cause.

**Prevention:**
Migrate high-volume collections (`rye-attendance`, `rye-payments`, `rye-activity`) to subcollections before the portal expansion and monthly reports phases add more write volume. The subcollection migration is in PROJECT.md "Out of Scope" but should be promoted to a prerequisite for the monthly reports and payment automation phases.

**Phase:** Data architecture — should precede monthly reports and payment automation phases.

---

### Pitfall H-5: AI Monthly Reports Sent With No Content When Lesson Notes Are Sparse

**Severity: HIGH**

**What goes wrong:**
The `monthly-report.js` prompt instructs the model: "레슨노트가 비어있는 항목은 추측해서 만들어내지 마세요" (do not fabricate content when lesson notes are empty). However, the user path passes `"이번 달 레슨노트 없음 — 일반적인 격려 톤으로 작성"` when `noteSummaries` is empty. This produces a generic, content-free report that a parent receives and finds useless or confusing. The parent has no way to know whether the lack of content reflects actual sparse teaching or a missing data entry.

Additionally, when lesson notes exist but contain only vague entries (e.g., "수업 진행"), the model fills the "잘한 점" section with generated praise not grounded in actual observations — this is educational hallucination in a context where accuracy matters (parents making decisions about continued enrollment).

**Warning signs:**
- `noteSummaries.length === 0` for a student who attended lessons.
- Lesson notes contain only the `condition` field with no `progress`, `content`, or `assignment`.

**Prevention:**
1. Add a pre-generation gate: if a student has fewer than 2 lesson notes for the month, show a warning and require the teacher to confirm before generating. Display the note count and quality score in the MonthlyReportsView UI.
2. In the prompt, replace the fallback instruction with a hard stop: if notes are absent, return a structured message explaining to the parent that the report could not be generated this month and the teacher will follow up.
3. Add a "report quality" indicator in the MonthlyReportsView that shows teachers which students have insufficient note data before bulk generation.

**Phase:** AI completion phase — add quality gates before the bulk-generate and publish flow is built.

---

### Pitfall H-6: PII Sent to Gemini Without Explicit Per-Student Consent

**Severity: HIGH**

**What goes wrong:**
The `monthly-report.js` endpoint receives `studentName` in the request body and sends it directly to the Gemini API. The `stripPii` function in `pii-guard.js` strips `phone`, `guardianPhone`, `email`, `address`, `bizNumber`, `contactEmail`, `contactPhone` — but not `studentName` or `birthDate`. Student names are PII under Korean PIPA.

The public registration form does include an optional AI consent checkbox (`aiAgreed` in `PublicPortal.jsx` line 162). However:
1. Existing students who registered before this consent field existed have no recorded consent.
2. There is no runtime check that verifies the student's AI consent before calling the Gemini endpoint.
3. The consent data is stored in `reg.consent` in the pending registration, but there is no field in the active student schema to carry this consent through to the main student record.

**Warning signs:**
- Student records in `rye-students` have no `consent.ai` field.
- The AI endpoint calls proceed regardless of student consent status.

**Prevention:**
1. Add a `consentAi: boolean` field to the student schema.
2. In MonthlyReportsView, skip or grey-out AI generation for students where `consentAi` is not `true`.
3. Add `studentName` and `studentId` to the `PII_KEYS` set in `pii-guard.js` for endpoints that do not require the name for their core function (e.g., churn analysis already sends only `name`, `consecutive`, `rate`, `score`). For monthly reports, the name is required for the output — document this exception explicitly.
4. Run a one-time consent migration: present existing students (via portal) with the AI consent option before enabling report generation for their records.

**Phase:** AI completion phase — consent migration before bulk report generation is shipped.

---

### Pitfall H-7: Rate Limiter Silently No-Ops When KV Binding Is Missing

**Severity: HIGH**
**Source: CONCERNS.md #7 + functions/api/ai/_utils/ratelimit.js line 3**

**What goes wrong:**
`checkRateLimit` in `ratelimit.js` returns `true` (allow all requests) when `kv` is falsy. The middleware passes `env.RATE_LIMIT_KV` which is `undefined` if the Cloudflare KV namespace is not bound in the Workers configuration. This means that on any deployment where the KV binding is not configured, every AI endpoint is fully unthrottled — an external attacker can run up Gemini API costs arbitrarily.

**Warning signs:**
- `wrangler.toml` or Cloudflare Dashboard does not show a `RATE_LIMIT_KV` binding.
- No startup validation confirms the binding is present.

**Prevention:**
Change `if (!kv) return true` to `if (!kv) throw new Error("RATE_LIMIT_KV binding not configured")`. This causes the middleware to return 500 rather than allowing unthrottled requests. Add a deployment checklist that verifies KV binding before each release.

**Phase:** Security phase — fix before shipping any new AI endpoints.

---

### Pitfall H-8: Firebase Auth Sessions Never Expire

**Severity: HIGH**
**Source: CONCERNS.md #5**

**What goes wrong:**
`localStorage` session tokens for the teacher app never expire. A compromised or shared device keeps a teacher session active indefinitely. Firebase Auth token refresh is bypassed because the app uses a local session fallback. Changing a teacher's password in Firebase Auth does not force them out of active sessions.

**Warning signs:**
- `ryek_last_login` localStorage key exists but the 30-day re-auth only triggers a UI prompt, not a Firebase Auth re-verification.
- `ryekSavedId` and `ryekSavedCode` in localStorage have no TTL.

**Prevention:**
Fix the Firebase Auth ↔ localStorage desync before expanding the portal. The portal expansion phase will add more session types (student portal, parent portal) — building on a broken session foundation multiplies the risk.

**Phase:** Security/auth phase — prerequisite for portal expansion.

---

## MEDIUM Pitfalls

These cause developer confusion, technical debt accumulation, or degraded UX.

---

### Pitfall M-1: AlimTalk Message Template Content Diverges From Approved Template

**Severity: MEDIUM**

**What goes wrong:**
Once a Kakao AlimTalk template is approved, the message content is frozen. The current `TEMPLATES` object in `AlimtalkModal.jsx` uses `RYE-K K-Culture Center` as the sender prefix. If the business name changes or the template text needs to be updated, a new template must be submitted for re-approval. Until re-approval (3-10 days), the old template must be used or sends will fail.

**Prevention:**
Design templates conservatively: minimize variable text, avoid references to specific prices (pass amount as a template variable), avoid time-sensitive language. Register the minimum number of templates needed at launch.

---

### Pitfall M-2: iOS Safari Push Notification Limitations in PWA

**Severity: MEDIUM**

**What goes wrong:**
The app is a PWA deployed on Cloudflare Pages. FCM-based push notifications are explicitly out of scope (PROJECT.md). However, the portal expansion (student and parent portal) may trigger expectations around push notifications for lesson reminders. iOS Safari prior to iOS 16.4 does not support Web Push API for PWAs at all. iOS 16.4+ supports it only for apps added to the Home Screen via "Add to Home Screen" — not for browser tabs.

KakaoTalk AlimTalk delivers to the Kakao app (which works on all iOS versions), so this is not a blocking issue for notifications. However, if any portal feature tries to use the Web Push API for in-app notifications, it will silently fail on most iOS users.

**Prevention:**
Do not use the Web Push API in the portal. Use in-app banners and KakaoTalk AlimTalk for all outbound notifications. If the portal needs to surface new messages, use polling (periodic Firestore `onSnapshot`) rather than push.

---

### Pitfall M-3: 880KB Single Bundle Slows Portal First Load on Mobile

**Severity: MEDIUM**
**Source: CONCERNS.md #13**

**What goes wrong:**
The entire app ships as one ~880KB JS bundle. The student portal (`/myryk`) and parent portal share this bundle with the full teacher/admin management app. A student accessing their portal on a mid-range Android device on a Korean LTE connection faces a 2-4 second parse time for code they will never use.

The portal expansion adds more routes and components. Without code splitting, the bundle grows further and LCP (Largest Contentful Paint) degrades.

**Warning signs:**
- Vite build output shows a single `main-*.js` chunk.
- No `React.lazy()` or `Suspense` in `App.jsx`.

**Prevention:**
Add route-level code splitting before the portal expansion ships new heavy views. Apply `React.lazy()` to `MonthlyReportsView`, `AnalyticsView`, `AdminTools`, and `Institutions` — views that the portal users will never visit. This reduces the portal entry bundle by 30-40%.

**Phase:** Portal expansion phase — do bundle splitting before adding portal routes.

---

### Pitfall M-4: Single-Month Report Generation Blocks the Thread

**Severity: MEDIUM**

**What goes wrong:**
`MonthlyReportsView.jsx` has a bulk-generate path (`bulkBusy` state). If the manager clicks "전체 생성" for 77 students, 77 sequential calls to the Gemini API will be issued. Each call is ~2-4 seconds. Total time: 2.5-5 minutes. The component state tracks `bulkProgress` but there is no timeout, no partial failure recovery, and no way to cancel. If the browser tab is closed mid-run, some reports are generated and some are not with no indication of which.

**Prevention:**
1. Cap bulk generation at 20 students per run, require manual pagination.
2. Implement a server-side queue (Cloudflare Queues or D1-backed job table) that processes report generation asynchronously and writes results back to Firestore.
3. At minimum, add a timeout per request (currently there is none) and show which students succeeded/failed after the batch.

**Phase:** AI completion phase.

---

### Pitfall M-5: Portal Student Code + Birthdate Brute-Force Risk

**Severity: MEDIUM**

**What goes wrong:**
The student portal uses `studentCode` + birthdate as the authentication factor. `studentCode` is not shown to the student publicly but could be inferred (sequential or derivable from name). Birthdate is 8 digits (YYYYMMDD) — for a student known to be roughly 10 years old, the search space is ~3,650 values. With no rate limiting on portal login attempts, a targeted attacker can brute-force any student's portal access and read their lesson notes and attendance records.

**Warning signs:**
- No `checkRateLimit` call in the portal auth path.
- `getBirthPassword()` in `utils.js` confirms birthdate is used directly as the credential.

**Prevention:**
1. Add rate limiting to portal login attempts: max 5 attempts per IP per 10 minutes.
2. Consider a short SMS/KakaoTalk one-time code as a second factor for first portal access.
3. At minimum, implement lockout after 10 failed attempts per student code.

**Phase:** Portal security hardening — before portal expansion ships publicly.

---

### Pitfall M-6: `callAnthropic` Naming Causes Configuration Mistakes

**Severity: MEDIUM**
**Source: CONCERNS.md #6 + functions/api/ai/_utils/anthropic.js**

**What goes wrong:**
The file is named `anthropic.js` and exports `callAnthropic`, but calls the Gemini API. Future developers (or AI coding assistants) will configure an `ANTHROPIC_API_KEY` environment variable expecting this to work, or modify the function assuming Anthropic's API schema. The actual key used is `env.GEMINI_API_KEY`.

**Prevention:**
Rename `anthropic.js` → `gemini.js` and `callAnthropic` → `callGemini`. Update all import sites. This is a low-risk, single-session change.

**Phase:** Early — any phase. Rename before adding new AI endpoints.

---

### Pitfall M-7: Monthly Reports Stored in Firestore Without Size Budget

**Severity: MEDIUM**

**What goes wrong:**
Generated monthly reports (600-900 characters of Korean text each) will be saved into a Firestore document under `rye-ai-reports` (or similar). At 77 students × 12 months = 924 reports/year, each ~1KB of Korean text plus metadata, the annual storage is ~1MB per year — which approaches the per-document limit if stored as a single array. This is the same single-document pattern that threatens attendance data (CONCERNS.md #14).

**Prevention:**
Store AI reports in a subcollection from the start, not as an array in a single document. Do not add a new high-volume collection under the existing single-document pattern.

**Phase:** AI completion phase — design data model before implementation.

---

## LOW Pitfalls

These cause minor friction or future maintenance cost.

---

### Pitfall L-1: AI Consent Not Retroactively Collected for Existing Students

**Severity: LOW**

**What goes wrong:**
The registration form's AI consent checkbox (`aiAgreed`) was added recently. All 77+ existing students have no recorded AI consent. This is a data gap that becomes a compliance issue when monthly reports are generated and sent to those students.

**Prevention:**
Add a consent collection flow in the portal: on first portal visit, present the AI consent option before showing lesson notes. Record the response in the student record.

---

### Pitfall L-2: Partial AlimTalk Send Leaves No Delivery Receipt

**Severity: LOW**

**What goes wrong:**
If the `onSend()` call in AlimtalkModal partially succeeds (some recipients delivered, some failed), the current UI shows only a spinner and then closes the modal. There is no per-recipient delivery status stored.

**Prevention:**
Store a send log per batch: `{ type, sentAt, totalTargets, delivered, failed, failedRecipients[] }`. Surface this in a "발송 이력" view so managers can follow up manually.

---

### Pitfall L-3: Bank Deposit Webhook Replay Attacks

**Severity: LOW**

**What goes wrong:**
Bank notification webhooks (when implemented) can be replayed. If the same deposit notification is delivered twice (network retry), the payment could be recorded twice, crediting a student twice and double-counting revenue.

**Prevention:**
Store the bank transaction ID with each payment record. Before recording a payment, check for an existing payment with the same transaction ID. This is idempotency — standard webhook design.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|---|---|---|
| Firestore security rules | Anonymous read access exposes all PII (C-1) | Fix rules before any other phase |
| Firestore security rules | Migration breaks existing portal writes (attendance comments, pending registration) | Test rules in Firebase Emulator against all portal flows before deploying |
| AlimTalk integration | Template not pre-approved, emoji in content (H-1) | Register channel and submit templates as phase prerequisites |
| AlimTalk integration | Block detection missed inside 200 OK response (H-2) | Parse `resultCode`, not just HTTP status |
| Bank auto-matching | False positives when `monthlyFee` is 0 (H-3) | Require fee data population as a prerequisite |
| Bank auto-matching | Webhook replay double-credits payment (L-3) | Idempotency key from transaction ID |
| AI monthly reports | Reports generated without AI consent (H-6) | Consent gate before generation |
| AI monthly reports | Bulk generation times out or partially fails (M-4) | Cap batch size, add per-request timeout |
| AI monthly reports | Reports stored as single-document array (M-7) | Use subcollection from day one |
| Portal expansion | Brute-force on student code + birthdate (M-5) | Rate limit portal login before public launch |
| Portal expansion | 880KB bundle on mobile (M-3) | Route-level code splitting before new portal routes |
| Portal expansion | iOS Safari push limitations (M-2) | Use Kakao AlimTalk, not Web Push |
| Any new AI endpoint | Rate limiter silent no-op (H-7) | Make KV binding required, not optional |
| Any AI feature | UID logged to console (C-4) | Remove `console.log` from `aiClient.js` |

---

## Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Firestore security rules | HIGH | Direct code inspection of `firestore.rules` |
| Bulk-overwrite vulnerability | HIGH | Direct code inspection of write patterns |
| AI feature pitfalls | HIGH | Direct inspection of `monthly-report.js`, `churn.js`, `aiClient.js` |
| AlimTalk pitfalls | MEDIUM | UI code inspected; Kakao API behavior from known platform documentation |
| Bank auto-matching pitfalls | MEDIUM | Standard webhook/matching patterns; Korean banking specifics based on known industry behavior |
| Portal security | HIGH | Direct inspection of `PublicPortal.jsx` auth flow and `ratelimit.js` |
| iOS PWA limitations | HIGH | Well-documented platform constraints |
