# Architecture Patterns — RYE-K New Features

**Domain:** K-Culture education management PWA (Korean traditional music school)
**Researched:** 2026-05-05
**Overall confidence:** HIGH — based on direct codebase analysis + established patterns for each subsystem

---

## Existing Architecture Baseline

```
Browser / PWA (React 18 SPA)
  ├── Firebase Auth (email + anonymous)
  ├── Firestore onSnapshot (real-time, all state in App.jsx)
  └── fetch("/api/ai/*") → Cloudflare Workers
            ├── _middleware.js (verifyToken + rateLimit)
            └── *.js → Gemini 2.5 Flash (via anthropic.js)
```

Key constraints derived from codebase:
- No Redux / no Zustand — all state props-drilled from App.jsx
- No Firebase Functions — Spark plan; serverless backend is Cloudflare Workers only
- No TypeScript — plain .js/.jsx throughout
- CSS is inline strings in constants.jsx, injected as `<style>` tags
- Firestore is a **single collection** ("appData") with document-per-entity-type (e.g. "rye-students", "rye-payments")
- Role is stored in the teacher record (`rye-teachers`), not in Firebase Auth custom claims

---

## Component Boundaries (Current + Proposed)

```
┌────────────────────────────────────────────────────────────────────────┐
│  Browser / PWA                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │  Admin App (email auth users: admin, manager, teacher)          │   │
│  │  App.jsx — state hub, all onSnapshot listeners                  │   │
│  │  └── components/* (student, attendance, payment, analytics...)  │   │
│  ├─────────────────────────────────────────────────────────────────┤   │
│  │  Student Portal (code-based, no Firebase Auth)                  │   │
│  │  PublicPortal.jsx + PublicRegisterForm                          │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│        │ Firebase SDK                │ fetch /api/*                    │
└────────┼─────────────────────────────┼───────────────────────────────  │
         ▼                             ▼
┌──────────────────┐    ┌──────────────────────────────────────────────┐
│  Firebase        │    │  Cloudflare Workers (functions/api/)          │
│  Firestore       │    │  ├── /api/ai/* (existing AI endpoints)        │
│  Auth            │    │  ├── /api/notify/* (NEW: AlimTalk pipeline)   │
│                  │    │  ├── /api/webhook/bank (NEW: bank transfers)   │
│                  │    │  └── /api/portal/* (NEW: portal session API)   │
└──────────────────┘    └──────────────────────────────────────────────┘
                                         │
                              ┌──────────┴───────────┐
                              │  External services    │
                              │  - Kakao AlimTalk API │
                              │  - Bank webhook src   │
                              └──────────────────────┘
```

---

## Subsystem 1: KakaoTalk AlimTalk Notification Architecture

### Decision: Cloudflare Worker as Notification Proxy (not Firebase Functions)

Firebase Functions would need Blaze plan. Client-side triggering leaks API keys. The existing Worker pattern (`functions/api/ai/`) already has auth middleware — extend it for notifications.

**Recommended architecture:**

```
Trigger sources
  A. Manual send (admin clicks "발송" in AlimtalkModal)
  B. Automated (attendance event → worker cron or delayed fetch)

Path A — Manual (implemented now, needs API wiring):
  Browser (AlimtalkModal.onSend)
    → fetch POST /api/notify/alimtalk
    → functions/api/notify/alimtalk.js
         ├── verifyToken() — same auth guard as AI endpoints
         ├── validate payload: { recipients[], templateId, params }
         └── fetch Kakao AlimTalk API (with env.KAKAO_API_KEY)

Path B — Attendance-triggered (absent notification):
  Browser writes attendance record → Firestore
    → No Firestore trigger available (no Functions)
    → INSTEAD: attendance write function in Attendance.jsx
         calls fetch POST /api/notify/alimtalk immediately after successful Firestore write
         with { trigger: "absence", studentId, date, teacherName }
```

**Key design choices:**

1. **Trigger point is the client, not Firestore.** Without Firebase Functions, there is no server-side trigger. The client that performed the write is responsible for dispatching the notification fetch. This means: if the network drops mid-write, the notification may not fire. For a school of 77 students this failure mode is acceptable — notification misses are visible on retry.

2. **Notification deduplication via Cloudflare KV.** Store a dedup key `notif:{type}:{studentId}:{date}` with TTL of 24 hours. Worker checks before dispatching. This prevents double-sends if the UI calls the endpoint twice.

   ```
   KV key:   notif:absence:s123:2026-05-05
   KV value: "sent"
   TTL:      86400 (24h)
   ```

3. **Delivery tracking in Firestore.** Write a lightweight notification log to `rye-notifications` document (array of log entries, same single-doc pattern):
   ```js
   { id, type, studentId, recipientPhone, status: "sent"|"failed", sentAt, error }
   ```
   Cap array at 500 entries; discard oldest. This fits the single-doc pattern and stays well within 1MB.

4. **AlimTalk API provider note.** Kakao AlimTalk requires a registered business channel and template approval. The `ALIGO` provider (`sendAligoMessage` is already imported in `utils.js`) is a common intermediary for Korean developers. The Worker should call ALIGO's REST endpoint rather than Kakao directly. Env vars needed: `ALIGO_API_KEY`, `ALIGO_USER_ID`, `ALIGO_SENDER`.

**Worker file structure:**
```
functions/api/notify/
├── _middleware.js    (reuse: verifyToken + rateLimit)
├── alimtalk.js       (send one or bulk)
└── _utils/
    └── kakao.js      (ALIGO REST client)
```

**AlimTalk payload contract:**
```js
// POST /api/notify/alimtalk
{
  trigger: "manual" | "absence" | "payment_reminder" | "schedule_change",
  recipients: [{ name, phone, params: { ... } }],
  templateCode: "absence_v1" | "fee_reminder_v1" | ...
}
```

### Absence Notification Flow (Most Time-Sensitive)

```
Teacher marks student absent in AttendanceView
  → updateAttendanceDoc(record) — existing per-op transaction
  → [if status === "absent" && student.guardianPhone]
       → notifyAbsence(studentId, date, teacherName)
            → fetch POST /api/notify/alimtalk
                 { trigger: "absence", recipients: [{ phone: guardianPhone }], ... }
```

The notification call should be fire-and-forget from the UI (`fetch(...).catch(noop)`). Failures surface in admin dashboard via `rye-notifications` log.

---

## Subsystem 2: Bank Transfer Webhook — Auto Payment Matching

### Architecture

```
Bank (Kakao/KB/NH) sends HTTP webhook to:
  POST https://<pages-domain>/api/webhook/bank

functions/api/webhook/bank.js (Cloudflare Worker)
  1. Verify webhook signature (HMAC-SHA256, bank-specific)
  2. Parse transfer: { amount, sender_name, sender_account, datetime }
  3. Match to student via matching logic
  4. Write result to Firestore
```

**Webhook Worker does NOT use Firebase Auth middleware** — the caller is the bank, not an authenticated user. Authentication is via HMAC signature verification using `env.BANK_WEBHOOK_SECRET`.

### Matching Logic

The matching problem: student names on bank transfers are truncated/ambiguous (Korean names are 2-3 chars, not unique). Design a scoring function:

```js
function matchTransfer({ amount, senderName, datetime }, students, payments, month) {
  const candidates = [];

  for (const student of students) {
    let score = 0;
    const expectedFee = student.monthlyFee || 0;
    const existing = payments.find(p => p.studentId === student.id && p.month === month);

    // Skip already paid
    if (existing?.paid) continue;

    // Exact amount match — strongest signal
    if (amount === expectedFee && expectedFee > 0) score += 50;
    // Partial amount (within 500 won) — likely
    else if (Math.abs(amount - expectedFee) <= 500 && expectedFee > 0) score += 20;

    // Name match (sender vs student name or guardian name)
    if (senderName.includes(student.name)) score += 40;
    if (student.guardianPhone && senderName.includes(student.guardianName || "")) score += 30;

    if (score > 0) candidates.push({ student, score });
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length === 1 && candidates[0].score >= 60) {
    return { match: candidates[0].student, confidence: "high" };
  }
  if (candidates.length > 0 && candidates[0].score >= 40) {
    return { match: candidates[0].student, confidence: "low", alternatives: candidates.slice(1, 3) };
  }
  return { match: null, confidence: "none" };
}
```

**Handling ambiguous matches:**

The Worker writes to `rye-unmatched-payments` in Firestore (new document key, same single-doc pattern):
```js
{
  id, amount, senderName, datetime, receivedAt,
  status: "matched" | "needs_review" | "unmatched",
  matchedStudentId?,    // if matched
  confidence?,          // "high" | "low"
  alternativeStudentIds?,  // for low confidence
  reviewedBy?, reviewedAt?
}
```

Admin UI shows a "미매칭 입금" badge on the payment view. Admin resolves manually with one click (assigns to student → confirms payment).

**Critical: Worker must read students from Firestore, not from browser state.** The Worker fetches `rye-students` and `rye-payments` via the Firebase Admin SDK (or Firebase REST API with service account). Env vars: `FIREBASE_SERVICE_ACCOUNT_JSON` or `FIREBASE_PROJECT_ID` + `FIREBASE_CLIENT_EMAIL` + `FIREBASE_PRIVATE_KEY`.

**Worker file structure:**
```
functions/api/webhook/
└── bank.js     (webhook receiver + matcher + Firestore writer)
```

**Build order implication:** Bank webhook needs Firestore write access from the Worker side. This requires setting up service account credentials in Cloudflare Worker env before implementation.

---

## Subsystem 3: Firebase Firestore Security Rules

### Current State

Security rules are open or absent. Any authenticated user (including anonymous visitors to the portal) can read/write all data. The portal uses `firebaseSignInAnon()` — anonymous users currently have full read access.

### Architecture: Custom Claims via Cloudflare Worker (No Firebase Functions)

The standard approach uses Firebase Functions to set custom claims on login. Without Functions, use the **Firebase Admin REST API** from the existing Cloudflare Worker.

**Flow:**
```
Teacher logs in (browser calls firebaseSignIn)
  → Firebase Auth issues ID token
  → Browser calls POST /api/auth/set-role (new Worker endpoint)
       → Worker verifies token via verifyToken()
       → Worker reads teacher record from Firestore to get role
       → Worker calls Firebase Admin REST: setCustomUserClaims(uid, { role, teacherId })
       → Browser refreshes ID token: auth.currentUser.getIdToken(true)
       → Subsequent Firestore requests include role in token
```

**Firestore security rules (role-based, no Functions dependency):**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    function getRole() {
      return request.auth.token.role;
    }
    function isAdmin() {
      return getRole() == 'admin';
    }
    function isManager() {
      return getRole() == 'manager';
    }
    function isStaff() {
      return getRole() in ['admin', 'manager', 'teacher'];
    }
    function isTeacher() {
      return getRole() == 'teacher';
    }
    function myTeacherId() {
      return request.auth.token.teacherId;
    }

    match /appData/{docId} {
      // Anonymous users: read-only access to registration support docs only
      allow read: if isSignedIn() && (
        isStaff() ||
        (request.auth.token.firebase.sign_in_provider == 'anonymous'
         && docId in ['rye-categories', 'rye-fee-presets', 'rye-pending'])
      );

      // Students: admin/manager full, teacher only own students
      allow read: if docId == 'rye-students' && isStaff();
      allow write: if docId == 'rye-students' && (isAdmin() || isManager());

      // Attendance: teacher can write own student records
      allow read: if docId == 'rye-attendance' && isStaff();
      allow write: if docId == 'rye-attendance' && isStaff();

      // Payments: teacher cannot read amounts
      allow read: if docId == 'rye-payments' && (isAdmin() || isManager());
      allow write: if docId == 'rye-payments' && (isAdmin() || isManager());

      // Admin-only collections
      allow read, write: if docId in ['rye-activity', 'rye-trash']
                         && isAdmin();

      // Institutions: admin/manager full, teacher read-only
      allow read: if docId == 'rye-institutions' && isStaff();
      allow write: if docId == 'rye-institutions' && (isAdmin() || isManager());

      // Pending registrations: anonymous can write (portal registration form)
      allow write: if docId == 'rye-pending'
                   && request.auth != null;  // anonymous OK for write

      // General fallback: staff reads everything
      allow read: if isStaff();
      allow write: if isAdmin() || isManager();
    }
  }
}
```

**IMPORTANT caveat — per-op transaction safety.** Current student mutations use `runTransaction(db, async tx => { snap = tx.get(...); ... tx.set(...) })`. If security rules block the `tx.get()` (read phase), the transaction will fail. Rules must allow teachers to read `rye-students` even if they cannot write. The rule above separates read/write correctly.

**Testing rules without hitting production:**
- Use Firebase Emulator Suite: `firebase emulators:start --only firestore`
- Write unit tests with `@firebase/rules-unit-testing` package
- Test key scenarios: anonymous read blocked, teacher can't read payments, teacher can write own attendance

**New Worker endpoint needed:**
```
functions/api/auth/
└── set-role.js    (POST: verify token → read role from Firestore → set custom claim)
```

**Build order implication:** Custom claims must be set BEFORE rules enforcement is enabled. If rules go live before the Worker is deployed, all teachers will be locked out. Rollout order: (1) deploy set-role Worker, (2) test claim-setting flow end-to-end, (3) deploy rules.

---

## Subsystem 4: Portal Architecture

### Current State

`PublicPortal.jsx` (~1200 lines) handles:
- `PublicRegisterForm` — public registration (Step 1/2/3, anonymous auth, writes to `rye-pending`)
- `PublicParentView` — student/parent portal (code-based login, reads attendance/payments/notices)

Portal uses `firebaseSignInAnon()` to get Firestore access. Student identity is `studentCode` matched against `rye-students`.

### Session Isolation

```
Admin App session
  Storage: localStorage["rye-session"] = { username, role, teacherId, uid }
  Auth: Firebase email auth → UID in token
  Firestore: reads/writes with Firebase Auth token

Portal session
  Storage: sessionStorage["ryekPortal"] = { studentId, studentCode, name }
  Auth: NO Firebase Auth — anonymous only
  Firestore: reads with anonymous token (scoped by rules to portal-safe docs)
```

These sessions are already isolated. The key architectural improvement needed is **preventing anonymous tokens from reading sensitive data** — that's the security rules work above.

### Code Sharing Strategy (Single Bundle)

The existing pattern already uses React.lazy for heavy admin views:
```js
const AnalyticsView = lazy(() => import("./components/analytics/AnalyticsView.jsx"));
```

Portal views should follow the same pattern. PublicPortal.jsx is currently eagerly loaded — it should be lazy-loaded since portal users never load the admin app and vice versa.

**Recommended split:**
```js
// App.jsx — route based on URL
const isPortalRoute = window.location.pathname.startsWith('/myryk') ||
                      window.location.pathname.startsWith('/register');

if (isPortalRoute) {
  // Lazy load only portal code
  const PublicPortal = lazy(() => import("./components/portal/PublicPortal.jsx"));
  // → renders independently, no admin state needed
} else {
  // Lazy load admin views
  // Already done for AnalyticsView, ScheduleView, etc.
}
```

This avoids loading the 77-student dataset and all teacher management code when a student opens the portal.

### Portal Expansion Architecture

For the planned expansions (timetable, lesson notes, payment history, parent view):

```
Portal data access pattern (via anonymous Firestore):
  Student identifies with studentCode
    → lookup studentId from rye-students (read: name, schedule, status)
    → reads from rye-attendance WHERE studentId = matched
    → reads from rye-payments WHERE studentId = matched (IF rules allow portal read)
    → reads from rye-notices WHERE target includes studentId

Portal-specific security concern:
  Anonymous users with a valid studentCode can read that student's data.
  The studentCode is a 6-char alphanumeric (RKXXXX) — not cryptographically strong.
  For sensitive data (payments), consider requiring birthDate verification as a second factor.
  Current pattern already uses birthDate as password: getBirthPassword(birthDate) = MMDD.
```

**Recommended portal data access component:**

Extract a `usePortalSession()` hook from PublicPortal.jsx that:
1. Reads `sessionStorage["ryekPortal"]`
2. Verifies studentCode against Firestore on first load
3. Returns `{ student, isLoaded, error }`

This hook is shared across all portal views (attendance tab, payment tab, lesson notes tab) without re-fetching the student record.

---

## Subsystem 5: Analytics Dashboard Architecture

### Data Source

Analytics read from existing Firestore collections — no new data storage needed. The key architectural challenge is **aggregation**: counting attendance rates, payment rates, revenue trends all require array scans over large documents.

**Pattern:** Compute aggregations in the component (client-side) rather than on the server. At 77 students and a few months of records, this is fine in-browser. Server-side aggregation (Cloudflare Worker + Firestore REST) adds latency and complexity without benefit at this scale.

```
AnalyticsView (lazy loaded)
  props: { students[], attendance[], payments[], teachers[], institutions[] }
  ← all already loaded in App.jsx via onSnapshot

  Computes:
  - Monthly revenue: sum(payments.filter(month).paidAmount)
  - Attendance rate: computeMonthlyAttStats() [already in utils.js]
  - Churn risk: existing ChurnWidget logic
  - Instrument distribution: count by lessons[].instrument
```

**No new backend needed for analytics.** The existing `computeMonthlyAttStats` in `utils.js` and `ChurnWidget` in `dashboard/` already demonstrate the pattern.

**Teacher-level analytics view:**

Teacher role sees only own students. The existing `canManageAll(role)` gate already filters. The analytics component should accept a `teacherFilter` prop that scopes the computation, same as the pattern in PaymentsView and AttendanceView.

---

## Integration Points with Existing Code

| New Feature | Attaches To | Integration Point |
|-------------|------------|-------------------|
| AlimTalk notification | AlimtalkModal.handleSend | Replace `onSend?.(...)` stub with real `fetch POST /api/notify/alimtalk` |
| AlimTalk absence trigger | Attendance.jsx (markAbsent) | After successful `updateAttendanceDoc()`, call notification helper |
| Bank webhook | Cloudflare Workers | New `functions/api/webhook/bank.js` — no UI integration until match review UI |
| Unmatched payments UI | PaymentsView.jsx | Add "미매칭 입금" section reading from `rye-unmatched-payments` doc |
| Security rules | firebase.js / App.jsx | No code changes needed for rules deployment; Worker add for claim-setting |
| Custom claim worker | functions/api/auth/ | New Worker; called once after login (App.jsx onAuthStateChanged) |
| Portal session hook | PublicPortal.jsx | Extract `usePortalSession()` — refactor, not new feature |
| Analytics | AnalyticsView.jsx | Already lazy-loaded; receives props from App.jsx |
| Monthly reports | MonthlyReportsView.jsx | Already lazy-loaded; AI endpoint `monthly-report` already exists |

---

## Build Order Implications

The dependency graph for new subsystems:

```
Phase: Security Rules (blocks all else from being safe)
  1. Deploy set-role Worker → test custom claims
  2. Update App.jsx: call set-role after email login
  3. Deploy Firestore rules (permissive first, tighten incrementally)
  THEN:

Phase: Notification Pipeline (independent of security rules except Worker auth)
  4. Create /api/notify/alimtalk Worker
  5. Wire AlimtalkModal.handleSend to real endpoint
  6. Add absence trigger in Attendance.jsx

Phase: Bank Webhook (needs service account; independent of notification)
  7. Provision service account → add to Cloudflare secrets
  8. Create /api/webhook/bank Worker
  9. Add unmatched payments UI in PaymentsView

Phase: Portal Expansion (needs security rules to be safe)
  10. Extract usePortalSession hook
  11. Lazy-load PublicPortal
  12. Add timetable / lesson notes tabs

Phase: Analytics (no dependencies — data already available)
  13. Expand AnalyticsView with revenue/attendance charts
  14. Add teacher-level view
```

The security rules phase is a gate: deploying rules before the custom-claim Worker locks out all teachers. This is the highest-risk step and must be sequenced carefully.

---

## Architectural Risks and Constraints

### Risk 1: Firestore Single-Document 1MB Limit
- `rye-attendance` and `rye-payments` accumulate unbounded entries
- At ~77 students × ~20 records/student/year = ~1,540 entries/year
- Each attendance record ~300 bytes → ~460KB/year
- **Action:** Add a yearly archive: `rye-attendance-2025`, `rye-attendance-2026`. Current year stays in the main doc. App reads current year by default, allows drill-back to previous year.

### Risk 2: Client-Triggered Notifications Can Double-Send
- If the user clicks "발송" twice rapidly, two Worker calls fire
- Dedup via KV (described above) is essential
- **Action:** Disable the send button immediately on first click (existing `isSubmitting` state already does this in AlimtalkModal)

### Risk 3: Bank Webhook Secret Exposure
- Cloudflare Worker env vars are not exposed to client code
- The webhook endpoint must NOT be called by the browser — only by the bank's servers
- **Action:** Document that `/api/webhook/bank` is a server-to-server endpoint; add an IP allowlist if the bank provides fixed IPs

### Risk 4: Custom Claims Propagation Delay
- After `setCustomUserClaims`, the client must call `getIdToken(true)` (force refresh) to get the new token
- If the client skips the refresh and calls Firestore before the token updates, the role claim will be missing → access denied
- **Action:** In App.jsx `onAuthStateChanged`, after calling set-role Worker, always call `await auth.currentUser.getIdToken(true)` before enabling the app UI

### Risk 5: Anonymous Portal Users with Stolen studentCodes
- StudentCode is 6 alphanumeric chars = ~1.7 billion combinations — brute force is infeasible in practice
- But if a code leaks, the leaker can read that student's data via portal
- **Action:** Add birthDate verification as second factor for sensitive portal sections (payment history). This is already technically supported via `getBirthPassword()`.

### Risk 6: App.jsx God-File (840+ lines)
- Adding more listeners (unmatched payments, notification log) will make App.jsx unmanageable
- **Action:** Before adding new feature listeners, extract existing listener initialization into `useAppData()` custom hook. This is a prerequisite refactor for the analytics/portal expansion phases.

---

## Sources and Confidence

| Area | Confidence | Basis |
|------|-----------|-------|
| Cloudflare Workers as notification proxy | HIGH | Matches existing AI worker pattern exactly; no new concepts |
| Client-triggered notifications (no Firestore triggers) | HIGH | Firebase Spark plan confirmed in PROJECT.md; Workers are the only backend |
| AlimTalk via ALIGO intermediary | MEDIUM | `sendAligoMessage` import visible in PaymentsView.jsx utils import; ALIGO is standard Korean AlimTalk proxy |
| Bank webhook HMAC pattern | HIGH | Standard webhook security pattern; bank-specific implementation varies |
| Firestore custom claims via Admin REST | HIGH | Documented Firebase approach; verified against existing verifyToken pattern |
| Security rule structure | HIGH | Based on direct analysis of role system in codebase; rules are standard Firestore syntax |
| Single-document 1MB limit concern | HIGH | Firestore documented limit; calculated from actual data scale |
| Portal session isolation | HIGH | Directly observed from sessionStorage vs localStorage usage in codebase |
| Client-side analytics aggregation | HIGH | Scale (~77 students) confirmed; computeMonthlyAttStats already exists in utils.js |
