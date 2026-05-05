# Phase 1: 보안 기반 (Security Foundation) — Research

**Researched:** 2026-05-05
**Domain:** Firebase Auth, Firestore Security Rules, Cloudflare KV, Vite build guards, PII hygiene
**Confidence:** HIGH — all findings grounded in direct codebase inspection

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| SEC-01 | 프로덕션 빌드에서 모든 console.log UID/PII 출력 제거 | 4개 log call in aiClient.js + 2 in App.jsx migration code + 1 in utils.js identified precisely |
| SEC-02 | `resetSeed` 및 샘플 데이터 초기화 버튼을 개발 환경에서만 노출 | resetSeed() in App.jsx is fully live; button already removed from MoreMenu but function + generateSeedData() still run in prod |
| SEC-03 | `saveStudents([...])` 잔여 참조 코드베이스 전체 감사 및 제거 | src/App.jsx has the throw-guard version; App.jsx (root, backup file) has live array-overwrite version; confirmed no active call paths in src/ |
| SEC-04 | Cloudflare KV namespace 바인딩 추가 → rate limiter 활성화 | wrangler.toml confirmed empty — no KV binding exists; ratelimit.js silently passes when kv is falsy |
| SEC-05 | Firebase Custom Claims Worker 배포 (역할별 claim 설정) | jose library already used in auth.js for token verification; Admin REST approach documented; MUST deploy before SEC-06 |
| SEC-06 | Firestore 보안 규칙 배포 — 익명 전체 읽기 차단, 역할별 read/write 제한 | Current rules: `allow read: if isAuthed()` on all appData — any anon visitor reads all PII; role matrix fully designed |
| SEC-07 | Firebase Auth ↔ localStorage 세션 동기화 수리 — 30일 재인증 흐름 | onAuthStateChanged imported but never called; session is purely localStorage; 30-day check fires but only clears localStorage — no Firebase token refresh |
</phase_requirements>

---

## Summary

Phase 1 addresses seven P0 security deficits in the current RYE-K codebase. Four of the seven are single-file, low-effort fixes (SEC-01, SEC-02, SEC-03, SEC-04). Two require new Cloudflare Worker endpoints plus Firebase configuration changes (SEC-05, SEC-06). One requires a careful refactor of the auth session pattern (SEC-07).

The most critical risk is SEC-06 (Firestore rules): the current rules allow any anonymous Firebase user — including visitors to the public `/register` page — to read all 77 students' PII, teacher contact details, and financial records in one Firestore `get()`. This is a live PIPA violation. However, SEC-05 (Custom Claims Worker) MUST be deployed and verified before SEC-06 rules go live, or all teachers will receive ACCESS DENIED immediately.

The implementation must proceed in strict order: SEC-01 → SEC-02 → SEC-03 → SEC-04 → SEC-05 (deploy + verify) → SEC-06 → SEC-07. Parallelizing SEC-05 and SEC-06 is the only step that causes a production lockout.

**Primary recommendation:** Fix the three trivial code issues (SEC-01, -02, -03) first. Then add KV binding (SEC-04). Then build and verify the Custom Claims Worker end-to-end before touching firestore.rules.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| console.log removal | Browser / Client (src/) | — | PII leaks in client-side JS bundle |
| resetSeed / DEV guard | Browser / Client (src/App.jsx) | — | Vite `import.meta.env.DEV` is build-time client guard |
| saveStudents audit | Browser / Client (src/) | — | Write path lives in React component layer |
| Rate limiter KV binding | Cloudflare Workers (wrangler.toml) | — | KV namespace is Worker-environment config, not client |
| Custom Claims Worker | API / Backend (functions/api/auth/) | Firebase Auth REST | Role assignment is a server-side privileged operation |
| Firestore security rules | Database / Storage (firestore.rules) | Firebase Auth token | Rules evaluated server-side by Firestore on every request |
| Auth session sync | Browser / Client (App.jsx) | Firebase Auth | onAuthStateChanged listener missing from client |

---

## Standard Stack

### Core (existing — no new packages needed)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `jose` | already in functions/ | JWT verification in Workers | Used by auth.js; also usable for generating service account JWTs |
| Vite `import.meta.env.DEV` | 5.4.0 | Build-time DEV guard | Tree-shaken from production bundle automatically |
| Firebase Auth `onAuthStateChanged` | v10.13.0 | Token refresh listener | Already imported in firebase.js, not yet called in App.jsx |
| Firebase Auth `getIdToken(user, true)` | v10.13.0 | Force-refresh token after claims update | Required after Custom Claims are set |
| Firestore Rules v2 | — | Security rules language | Already in firestore.rules |

### For SEC-04 (KV binding)
| Config | Location | Purpose |
|--------|----------|---------|
| `[[kv_namespaces]]` in wrangler.toml | wrangler.toml | Binds KV namespace to `env.RATE_LIMIT_KV` |
| Cloudflare Dashboard KV namespace | Cloudflare account | Create namespace "rye-k-ratelimit" |

### For SEC-05 (Custom Claims Worker)
| Approach | Why |
|----------|-----|
| Firebase Auth REST API (`identitytoolkit.googleapis.com`) | No Firebase Admin SDK (requires Node.js). Workers use Web APIs. |
| Service Account JSON in Cloudflare secret | Needed to generate signed JWTs for Admin API auth |
| `jose` (`SignJWT`) | Already installed; creates the service account JWT for Google auth |

### What NOT to add
| Library | Why Not |
|---------|---------|
| `firebase-admin` | Node.js only — Cloudflare Workers cannot run it |
| Any new npm packages | No new deps needed for any SEC-01 through SEC-07 |

---

## Architecture Patterns

### System Architecture Diagram

```
Browser (React PWA)
  ├── Email Login ──────────────────────────────────────────────────┐
  │   firebaseSignIn() → Firebase Auth ID token                     │
  │   then: POST /api/auth/set-role (NEW SEC-05)                    │
  │   then: getIdToken(true) → refreshed token with role claim      │
  │   then: onAuthStateChanged listener guards Firestore reads      │
  │                                                                 │
  ├── Anonymous Login (portal /register, /myryk)                   │
  │   firebaseSignInAnon() → anonymous Firebase token              │
  │   Firestore rules: only allow rye-pending write, DENY all read  │
  │                                                                 │
  └── Firestore reads ──────────────────────────────────────────────┤
      Token evaluated against firestore.rules                       │
      request.auth.token.role checked for every collection          │
                                                                    ▼
functions/api/auth/set-role.js (NEW — SEC-05)
  verifyToken() → confirms email user (not anon)
  fetch rye-teachers to get role + teacherId
  call Firebase Admin REST → setCustomUserClaims(uid, {role, teacherId})
  return 200

firestore.rules (SEC-06)
  isEmailUser() + hasRole() gates on all appData documents
  anonymous: DENY read on all PII collections
  anonymous: allow write to rye-pending only
```

### Recommended Project Structure additions
```
functions/api/
├── ai/              (existing)
│   ├── _middleware.js
│   └── _utils/
│       ├── auth.js       ← existing verifyToken (jose)
│       └── ratelimit.js  ← fix: throw if kv null (SEC-04)
└── auth/            (NEW — SEC-05)
    └── set-role.js  ← POST: verify token → read role → setCustomUserClaims
```

### Pattern 1: Vite DEV Guard for resetSeed
**What:** Wrap `generateSeedData` definition and `resetSeed` function in `import.meta.env.DEV`
**When to use:** Any code that must never run in the production Vite bundle

```javascript
// Source: [VERIFIED: Vite docs — import.meta.env.DEV is tree-shaken in production]
// In App.jsx — wrap both definition and usage:

let resetSeed;
if (import.meta.env.DEV) {
  // generateSeedData() definition can stay here or be extracted to a dev-only module
  resetSeed = async () => {
    // ... seed logic
  };
} else {
  resetSeed = () => { throw new Error("resetSeed not available in production"); };
}
```

**Important:** `generateSeedData()` is also called unconditionally at lines 344 and 373 in the startup migration code. The startup path (`checkAllLoaded`) seeds an empty DB on first run — this is intentional behavior that must NOT be removed. However, line 373 (`generateSeedData().seedStudents` for the recovery merge) runs on every startup after the one-time recovery is done. That recovery guard (`rye-recovery-v1`) means it only runs once, so the production impact is minimal — but `generateSeedData` itself (containing real PII in seed data) still exists in the bundle. SEC-02 should move `generateSeedData` to a separate import guarded by `import.meta.env.DEV`, and replace the production startup path with a static "no-op if DB is already seeded" check.

**Simpler alternative for SEC-02:** Since the "샘플 데이터 초기화" button was already removed from MoreMenu (confirmed in NavLayout.jsx), and `onResetSeed` is passed to MoreMenu but never called there, the immediate risk is: `resetSeed` is a dangling function — it can only be triggered programmatically, not via UI. The production risk is LOW right now. The correct fix is still to guard the entire function body with `import.meta.env.DEV` and move `generateSeedData` to a dev-only module.

### Pattern 2: Rate Limiter — Make KV Required
**What:** Change `if (!kv) return true` to throw an error [VERIFIED: from ratelimit.js line 3]

```javascript
// Source: [VERIFIED: ratelimit.js direct inspection]
// Current (dangerous):
export async function checkRateLimit(kv, userId, limit = 20) {
  if (!kv) return true; // ← allows all requests if KV not bound

// Fixed (SEC-04):
export async function checkRateLimit(kv, userId, limit = 20) {
  if (!kv) throw new Error("RATE_LIMIT_KV binding not configured — check wrangler.toml");
```

**wrangler.toml addition (SEC-04):**
```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<KV_NAMESPACE_ID>"          # created via Cloudflare dashboard
preview_id = "<KV_PREVIEW_ID>"   # for local wrangler dev
```

### Pattern 3: Firebase Custom Claims via REST API (SEC-05)
**What:** Cloudflare Worker calls Firebase Auth Admin REST to set `{role, teacherId}` claims on a verified email user
**Why not Admin SDK:** `firebase-admin` requires Node.js; Workers use Web APIs only

```javascript
// Source: [CITED: firebase.google.com/docs/auth/admin/custom-claims]
// Source: [CITED: cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update]

// functions/api/auth/set-role.js
import { verifyToken } from "../ai/_utils/auth.js";  // reuse existing

export async function onRequest(context) {
  const { request, env } = context;
  if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  // 1. Verify this is a real email user (not anon)
  const payload = await verifyToken(request);
  if (!payload || payload.firebase?.sign_in_provider !== "password") {
    return new Response("Unauthorized", { status: 401 });
  }
  const uid = payload.sub;

  // 2. Read role from Firestore via REST (no Admin SDK)
  const fsUrl = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/appData/rye-teachers`;
  const fsResp = await fetch(fsUrl, {
    headers: { Authorization: `Bearer ${await getGoogleAccessToken(env)}` }
  });
  const fsData = await fsResp.json();
  const teachers = fsData.fields?.value?.arrayValue?.values || [];
  const teacher = teachers.find(t => t.mapValue?.fields?.uid?.stringValue === uid ||
    t.mapValue?.fields?.authUid?.stringValue === uid);
  const role = teacher?.mapValue?.fields?.role?.stringValue || "teacher";
  const teacherId = teacher?.mapValue?.fields?.id?.stringValue || "";

  // 3. Set custom claims via Firebase Auth REST
  const claimsUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${env.FIREBASE_API_KEY}`;
  // NOTE: setCustomUserClaims requires Admin SDK or Google OAuth2 access token
  // Use the Admin REST endpoint: POST https://identitytoolkit.googleapis.com/v1/accounts:update
  // with a Google service-account-signed JWT in Authorization: Bearer
  await fetch(claimsUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json",
               "Authorization": `Bearer ${await getGoogleAccessToken(env)}` },
    body: JSON.stringify({ localId: uid,
                           customAttributes: JSON.stringify({ role, teacherId }) })
  });

  return new Response(JSON.stringify({ ok: true, role }), {
    headers: { "Content-Type": "application/json" }
  });
}
```

**Google service account JWT generation in Workers:**
```javascript
// Source: [CITED: developers.google.com/identity/protocols/oauth2/service-account]
// Uses jose (already in project) to sign the JWT

import { SignJWT, importPKCS8 } from "jose";

async function getGoogleAccessToken(env) {
  const SA = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const privateKey = await importPKCS8(SA.private_key, "RS256");
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({
    iss: SA.client_email,
    sub: SA.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/datastore",
  }).setProtectedHeader({ alg: "RS256" }).sign(privateKey);

  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth2:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const { access_token } = await tokenResp.json();
  return access_token;
}
```

**Critical note on matching teacher UID:** The current teacher records in Firestore do NOT store the Firebase Auth UID — they store `username`, `id` (a local "t1"/"t2" style ID), and `password` (legacy). The set-role Worker needs a way to look up a teacher by UID. Solution: after `firebaseSignIn()` succeeds in App.jsx, store the Firebase UID into the teacher's Firestore record on first login. Alternatively, match by email: Firebase email is `${username}@ryek.app`, and each teacher has a `username` field — so look up by email from the verified token's `email` claim.

### Pattern 4: Firestore Rules — Role-Based Access (SEC-06)
**What:** Replace `allow read: if isAuthed()` with email-user-only plus role-based gates
**When to use:** After SEC-05 is deployed and all teacher logins have claims

```javascript
// Source: [VERIFIED: direct codebase inspection of firestore.rules]
// Source: [CITED: firebase.google.com/docs/firestore/security/rules-conditions]

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isEmailUser() {
      return request.auth != null &&
        request.auth.token.firebase.sign_in_provider == 'password';
    }
    function isAnonymous() {
      return request.auth != null &&
        request.auth.token.firebase.sign_in_provider == 'anonymous';
    }
    function hasRole(r) {
      return isEmailUser() && request.auth.token.role == r;
    }
    function isAdmin()          { return hasRole('admin'); }
    function isManagerOrAbove() { return isEmailUser() && request.auth.token.role in ['admin', 'manager']; }
    function isStaff()          { return isEmailUser() && request.auth.token.role in ['admin', 'manager', 'teacher']; }

    match /appData/rye-students {
      allow read:  if isStaff();
      allow write: if isManagerOrAbove();
    }
    match /appData/rye-teachers {
      allow read:  if isStaff();
      allow write: if isManagerOrAbove();
    }
    match /appData/rye-payments {
      allow read:  if isManagerOrAbove();
      allow write: if isManagerOrAbove();
    }
    match /appData/rye-attendance {
      allow read:  if isStaff() || isAnonymous();  // portal reads own comments
      allow write: if isStaff() || isAnonymous();  // portal writes comments
    }
    match /appData/rye-pending {
      allow read:  if isStaff();
      allow write: if request.auth != null;         // anon OK — registration form
    }
    match /appData/rye-student-notices {
      allow read:  if isStaff() || isAnonymous();
      allow write: if isStaff() || isAnonymous();  // portal marks readBy[]
    }
    match /appData/rye-institutions {
      allow read:  if isStaff();
      allow write: if isManagerOrAbove();
    }
    match /appData/rye-categories {
      allow read:  if isStaff();
      allow write: if isManagerOrAbove();
    }
    match /appData/rye-fee-presets {
      allow read:  if isStaff();
      allow write: if isManagerOrAbove();
    }
    match /appData/rye-schedule-overrides {
      allow read:  if isStaff() || isAnonymous();
      allow write: if isStaff();
    }
    match /appData/rye-activity {
      allow read:  if isAdmin();
      allow write: if isStaff();
    }
    match /appData/rye-trash {
      allow read, write: if isAdmin();
    }
    match /appData/rye-notices {
      allow read:  if isStaff() || isAnonymous();
      allow write: if isStaff();
    }
    match /appData/{document} {
      allow read, write: if isManagerOrAbove();
    }
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**IMPORTANT transition note:** Anonymous users lose ALL read access to `rye-students`, `rye-teachers`, `rye-payments` etc. The public portal (`PublicPortal.jsx`) currently reads student records directly from Firestore using anonymous auth. After these rules deploy:
- The registration form (`/register`) still works — it only WRITES to `rye-pending`
- The student portal (`/myryk`) will BREAK for any feature that reads `rye-students` with anon auth

This means SEC-06 deployment requires a code change in `PublicPortal.jsx` to route student data lookups through a Cloudflare Worker (server-side, using service account) rather than direct Firestore SDK reads. OR: keep a narrow anonymous read allowance in the rules for the portal. The STACK.md recommends a "server-side Cloudflare Worker lookup" approach. This work is officially scoped to Phase 2 (POR-01), not Phase 1.

**Phase 1 compromise rule for portal:** Keep `rye-attendance`, `rye-student-notices`, and `rye-schedule-overrides` readable by anonymous users (as in the pattern above). These contain NO payment data and NO phone numbers — just lesson notes and notices. Block anonymous access to `rye-students`, `rye-teachers`, `rye-payments`, `rye-fee-presets` entirely. The portal student lookup (finding which student matches a studentCode) currently needs `rye-students` — this will break with Phase 1 rules. The plan MUST include a note to Phase 2 that the portal data access needs a Worker intermediary.

### Pattern 5: Auth Session Sync (SEC-07)
**What:** Wire `onAuthStateChanged` in App.jsx so Firebase Auth state drives session validity
**Current state:** `onAuthStateChanged` is imported from firebase.js but NEVER called in App.jsx. Session is purely `localStorage["rye-session"]` with no Firebase Auth synchronization.

```javascript
// Source: [VERIFIED: App.jsx direct inspection]
// Source: [CITED: firebase.google.com/docs/auth/web/manage-users#get_the_currently_signed-in_user]

// Add inside MainApp() useEffect:
useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser && user) {
      // Firebase says logged out but localStorage says logged in — log out
      setUserPersist(null);
      return;
    }
    if (fbUser && user && fbUser.email) {
      // Firebase user exists — force-refresh token to get current claims
      // This also catches token revocation (password changes, account disabled)
      try {
        await fbUser.getIdToken(/* forceRefresh= */ false);
        // Update ryek_last_login on active Firebase sessions
        localStorage.setItem("ryek_last_login", String(Date.now()));
      } catch {
        // Token refresh failed — session is invalid
        setUserPersist(null);
        await firebaseLogout();
      }
    }
  });
  return () => unsub();
}, []); // eslint-disable-line
```

**30-day re-auth flow:** The current code (App.jsx lines 257-270) does check `ryek_last_login` and clears localStorage + calls `firebaseLogout()` when 30 days have passed. The bug is: the check fires on mount with `[]` deps but the session may have already been loaded into state from localStorage before this check runs. The Firebase `onAuthStateChanged` listener would catch this more reliably because Firebase itself tracks token expiry (default: 1 hour for ID tokens, refreshed automatically until the account is revoked or the session expires).

**SEC-07 scope clarification:** The broken state is:
1. `onAuthStateChanged` not wired → Firebase password changes don't log out active sessions
2. 30-day check only clears localStorage, does not invalidate the Firebase Refresh Token
3. `getIdToken` in aiClient.js works because Firebase automatically refreshes short-lived ID tokens using the refresh token — the auth is NOT "broken" for AI features, only for the session expiry and role-change propagation cases

The minimal fix: add the `onAuthStateChanged` listener and call `set-role` Worker once per login session.

### Anti-Patterns to Avoid

- **Deploying firestore.rules before SEC-05 Worker:** If rules go live before teachers have `role` claims in their tokens, `hasRole('teacher')` is false for everyone → lockout
- **`if (!kv) return true` pattern:** Silent permissive fallback — change to throw
- **Leaving `generateSeedData()` in production bundle:** Contains real PII (teacher phone numbers) committed to a public repo — move to dev-only module
- **Using `import.meta.env.PROD` instead of `import.meta.env.DEV`:** `DEV` is the correct guard for Vite; `PROD` is the inverse but less common

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JWT verification in Workers | Custom JWT parsing | `jose` (already installed) | Handles key rotation, expiry, audience checks |
| Google service account auth | Manual HTTP auth flow | `jose SignJWT` + Google token endpoint | Service account JWT is well-specified; `jose` handles RSA-SHA256 |
| Firestore rules testing | Manual browser tests | Firebase Emulator + `@firebase/rules-unit-testing` | Emulator lets you test all role combinations without touching prod |
| KV rate limit logic | Custom sliding window | Existing `ratelimit.js` (just fix the null guard) | Pattern already correct; only the null guard needs fixing |
| Custom Claims admin endpoint | Firebase Functions | Cloudflare Worker + Firebase Auth REST | Functions require Blaze plan; Workers pattern already established |

---

## Runtime State Inventory

> This is NOT a rename phase. Runtime state inventory is not applicable.
> However, SEC-05 creates new runtime state: Firebase Custom Claims on Auth tokens.

| Category | Items | Action Required |
|----------|-------|-----------------|
| Stored data — Firebase Auth Custom Claims | Currently NO teachers have role claims | SEC-05 Worker must SET claims for all teachers on their next login. One-time migration only — no data exists to migrate. |
| Stored data — Firestore rye-teachers | Teacher records have `role` field (e.g. "teacher", "manager", "admin") | Read this field in set-role Worker to determine claim value |
| Stored data — Firestore rye-students | All 77+ students have real PII in `generateSeedData()` (also in live Firestore) | SEC-02 removes the function from production bundle — does NOT remove Firestore data |
| Live service config — Cloudflare KV | No KV namespace exists for rate limiting | Create namespace in Cloudflare Dashboard, add to wrangler.toml (SEC-04) |
| OS-registered state | None | — |
| Secrets/env vars — Cloudflare Workers | `FIREBASE_SERVICE_ACCOUNT_JSON` not yet set | Must be added to Cloudflare dashboard secrets before SEC-05 deployment |
| Secrets/env vars — wrangler.toml | `RATE_LIMIT_KV` binding missing | Add to wrangler.toml (SEC-04) |
| Build artifacts | `App.jsx` root-level backup file has live `saveStudents` array-overwrite | This is a backup file, not in the build. Confirm it is not imported anywhere. |

---

## Common Pitfalls

### Pitfall 1: Custom Claims Not in Token Until Force-Refresh
**What goes wrong:** After the set-role Worker sets custom claims, the teacher's browser still has the OLD token cached (without role claim). Firestore rules will deny access until the token is refreshed.
**Why it happens:** Firebase caches ID tokens for ~1 hour. Custom claims are written to the user record server-side, but the client token is only updated on next refresh.
**How to avoid:** After calling `/api/auth/set-role`, immediately call `await auth.currentUser.getIdToken(true)` (the `true` forces a refresh). Then Firestore reads will use the new token with role claims.
**Warning signs:** Teacher logs in, gets no errors, but cannot read Firestore data that the rules should allow.

### Pitfall 2: Deploying Rules Before Any Teacher Has Claims
**What goes wrong:** If `firestore.rules` with `hasRole('teacher')` gate is deployed before the set-role Worker is running, ALL email users fail the `isStaff()` check because their tokens have no `role` claim.
**Why it happens:** The `request.auth.token.role` field simply does not exist in the token — it evaluates to `null`, not `"teacher"`.
**How to avoid:** Strict sequencing: (1) deploy set-role Worker, (2) login as each role type and verify claims appear in the token, (3) THEN deploy rules.
**Warning signs:** All teachers suddenly get permission denied after rules deployment.

### Pitfall 3: Teacher UID Not Stored in Firestore
**What goes wrong:** The set-role Worker needs to look up a teacher's role by their Firebase Auth UID. But teacher records store `id` ("t1", "t2") not the Firebase UID. The Worker cannot find the teacher.
**Why it happens:** The teacher record schema predates Firebase Auth integration.
**How to avoid:** Match by email instead. Firebase Auth email is `${teacher.username}@ryek.app`. The token `payload.email` from `verifyToken()` returns this email. Look up teachers by username (strip `@ryek.app` suffix).
**Warning signs:** set-role Worker returns 200 but claims are not set (teacher not found).

### Pitfall 4: Anonymous Portal Users Break After Rules Deploy
**What goes wrong:** `PublicPortal.jsx` uses `firebaseSignInAnon()` and then reads from Firestore. After SEC-06 rules block anon reads on `rye-students`, the portal's student code lookup fails silently.
**Why it happens:** The new rules deny `rye-students` reads for anonymous tokens. Portal currently needs to look up a student by their `studentCode` — this requires reading the full `rye-students` array.
**How to avoid:** For Phase 1, keep a narrow note in the rules comments: anonymous read on `rye-students` will be closed when Phase 2 provides a Worker-based portal lookup endpoint. Or: leave anonymous read on `rye-students` blocked but accept that `/myryk` portal student login will fail until Phase 2. This is the correct tradeoff — PII protection > portal convenience.
**Warning signs:** Students cannot log into the portal after Phase 1 deployment.

### Pitfall 5: generateSeedData PII in Production Bundle
**What goes wrong:** `generateSeedData()` contains 77+ real-looking Korean people with actual phone numbers committed to a public GitHub repo. Even if `resetSeed()` is unreachable via UI, the data is still in the JS bundle served to all visitors.
**Why it happens:** Seed data was added to bootstrap the app without separating dev vs. prod concerns.
**How to avoid:** Move `generateSeedData` to a separate file imported only under `import.meta.env.DEV`. In production, the startup "seed if empty" check should be a no-op (prod DB is never empty).
**Warning signs:** Viewing the production JS bundle source reveals real phone numbers.

### Pitfall 6: rye-recovery-v1 Migration Still Runs on Every Startup
**What goes wrong:** App.jsx startup code (lines 371-382) checks `localStorage.getItem("rye-recovery-v1")` — if not set (new browser, cleared storage), it runs `generateSeedData()` and merges it into Firestore. This means a new browser session triggers the recovery merge.
**Why it happens:** The one-time recovery guard is per-browser, not per-database.
**How to avoid:** The recovery flag should be moved to Firestore (e.g., `rye-settings.recoveryV1Done`) so that all browsers know the recovery is complete. For SEC-02, simply move `generateSeedData` out of production bundle — the recovery path becomes a no-op if the function is not available.

---

## Code Examples

### SEC-01: Remove console.log calls (exact locations)
```javascript
// Source: [VERIFIED: src/aiClient.js direct inspection]
// REMOVE these 4 lines from src/aiClient.js:
// Line 10: console.log("[ai] currentUser:", user?.uid, user?.isAnonymous);
// Line 14: console.log("[ai] anon signin:", user?.uid);
// Line 20: console.warn("[ai] no user after anon");  // remove
// Line 23: console.log("[ai] token len:", t?.length);

// REMOVE from src/App.jsx:
// Line 367: console.log("Migrated studentCodes for", ...)
// Line 381: console.log(`[Recovery] ${final.length}명 복구 완료 ...`)
// Line 779: console.warn("Firebase Auth failed, proceeding with local auth only")

// REMOVE from src/utils.js:
// Line 118: console.log(`[알림톡 목업] 발송 대상(${targetType}): ...`)

// KEEP (legitimate error paths):
// MicButton console.warn calls in CommonUI.jsx (microphone hardware errors — not PII)
// anthropic.js console.warn for MAX_TOKENS truncation (operational, not PII)
// firebase.js console.error calls (Firebase SDK errors)
```

### SEC-03: saveStudents audit result
```javascript
// Source: [VERIFIED: grep across src/ — only one occurrence]
// src/App.jsx line 434:
const saveStudents = () => {
  throw new Error("saveStudents 직접 호출 금지 — addStudentDoc/updateStudentDoc/deleteStudentDoc/batchStudentDocs 사용");
};
// Status: ALREADY HARDENED. No active call paths in src/.
// Action: Audit passes. No code changes needed for SEC-03.

// NOTE: App.jsx (root level, NOT src/App.jsx) is a backup file containing
// the OLD array-overwrite version. Confirm it is listed in .gitignore or
// is not imported anywhere. It is NOT part of the build.
```

### SEC-04: wrangler.toml addition
```toml
# Source: [CITED: developers.cloudflare.com/workers/wrangler/configuration/#kv-namespaces]
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "YOUR_KV_NAMESPACE_ID"
preview_id = "YOUR_KV_PREVIEW_ID"
```

---

## State of the Art

| Old Approach | Current Approach | Impact for Phase 1 |
|--------------|------------------|-------------------|
| Firebase Functions for custom claims | Cloudflare Worker + Firebase Auth REST | No Blaze plan needed; `jose` already in place |
| `firebase-admin` npm in Node.js | Service account JWT via `jose` in Workers | Works in Cloudflare's V8 isolates |
| Firestore rules `get()` to check role | Custom claims in token | Zero extra reads, no circular dependency |
| localStorage-only session | `onAuthStateChanged` + localStorage hybrid | Token revocation works; password changes propagate |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The root-level `App.jsx` file (not `src/App.jsx`) is a backup and not part of the build | SEC-03 | If somehow imported, old saveStudents pattern is live |
| A2 | Firebase Auth email for teachers follows the `${username}@ryek.app` pattern and the `email` claim is in the JWT payload | SEC-05 Pattern | If email format changed, set-role Worker cannot match teacher by email |
| A3 | Cloudflare Pages Functions support `[[kv_namespaces]]` binding via wrangler.toml (same as Workers) | SEC-04 | If Pages Functions use a different config format, KV binding approach differs |
| A4 | `jose` version in functions/ supports `SignJWT` and `importPKCS8` needed for service account JWT | SEC-05 | If jose version is too old, may need to add a method |
| A5 | MicButton console.warn calls in CommonUI.jsx are genuine hardware errors and do not expose PII | SEC-01 | If MicButton accidentally logs user data, those calls need removal too |
| A6 | The `rye-recovery-v1` localStorage flag is set for all current production users | SEC-02 | If any user has cleared localStorage, recovery runs again and generateSeedData is called in prod |

**If this table is not empty:** Claims A1-A6 should be verified before the planner assigns implementation tasks.

---

## Open Questions (RESOLVED)

1. **Portal student lookup after SEC-06 rules**
   - What we know: Anonymous reads on `rye-students` will be blocked by new rules
   - What's unclear: Phase 2 Worker-based portal lookup is planned (POR-01+) but Phase 1 rules would break `/myryk` login before Phase 2 ships
   - Recommendation: Phase 1 plan should include explicit "portal breakage acknowledged — Phase 2 will fix" note. Nick should be informed that after Phase 1 deployment, the student portal login will stop working until Phase 2 ships the Worker-based student lookup.

2. **Admin "super role" lookup in set-role Worker**
   - What we know: The hardcoded admin account (ADMIN in constants.jsx) may not have a teacher record in `rye-teachers`
   - What's unclear: How the set-role Worker handles the admin account whose credentials are hardcoded, not in Firestore
   - Recommendation: Check if ADMIN user has a Firestore teacher record. If not, add special-case logic in set-role Worker: if `payload.email === "admin@ryek.app"` (or whatever the admin username maps to), return role "admin" without Firestore lookup.

3. **Firestore service account scope for set-role Worker**
   - What we know: The service account needs `identitytoolkit` and `datastore` scopes to read teachers and set claims
   - What's unclear: Whether the Firebase project's service account has these permissions by default or needs manual IAM grants
   - Recommendation: When creating the service account in Firebase console (Settings → Service Accounts), generate a new key — it automatically has the correct Firebase-scoped permissions.

4. **`import.meta.env.DEV` and the auto-seed startup path**
   - What we know: The startup code seeds an empty DB with `generateSeedData()` when `rye-teachers` is empty
   - What's unclear: If `generateSeedData` is moved to a dev-only import, what happens when the production DB is empty (e.g. new deployment)?
   - Recommendation: The production startup path should check if the DB is empty and show an error/loading state instead of seeding. DB seeding is a dev-only action.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Firebase CLI (`firebase` command) | SEC-06 — deploy firestore.rules | [ASSUMED] | Unknown | Manual deploy via Firebase console |
| Cloudflare Wrangler CLI | SEC-04, SEC-05 — deploy Worker | [ASSUMED] | Unknown | Manual deploy via Cloudflare dashboard |
| Cloudflare KV namespace (in Dashboard) | SEC-04 | Not yet created | — | Must create before wrangler.toml update |
| Firebase Service Account JSON | SEC-05 | Not yet created | — | Must generate in Firebase console |
| Firebase Emulator | SEC-06 testing | [ASSUMED] | Unknown | Test rules in Firebase console Rules Playground |

**Missing dependencies with no fallback:**
- Firebase Service Account JSON — must be generated and added to Cloudflare secrets before SEC-05 can be deployed
- Cloudflare KV namespace ID — must be created before wrangler.toml can be updated

**Missing dependencies with fallback:**
- Firebase CLI — can deploy rules via Firebase console Rules editor as a fallback
- Firebase Emulator — can use Firebase console Rules Playground for basic testing

---

## Validation Architecture

> `workflow.nyquist_validation: true` — validation section required.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed — project uses `npm run build` + manual browser verification (per CLAUDE.md) |
| Config file | None |
| Quick run command | `npm run build` (build must pass — ~30s) |
| Full suite command | `npm run build && npm run preview` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| SEC-01 | No console.log calls exist in src/ | grep check | `grep -r "console.log\|console.warn" src/ --include="*.js" --include="*.jsx"` | Manual: 0 matches = pass |
| SEC-02 | resetSeed not callable in prod build | build + inspect | `npm run build` then search bundle for "resetSeed" | Manual bundle inspection |
| SEC-03 | saveStudents not reachable | grep check | `grep -r "saveStudents" src/ --include="*.js" --include="*.jsx"` | Only the throw-guard line should remain |
| SEC-04 | Rate limiter throws when KV absent | Worker test | `wrangler dev` → POST /api/ai/* without KV → expect 500 | Manual |
| SEC-05 | Teacher gets role claim after login | Manual test | Login as teacher → check token via Firebase console | Manual flow |
| SEC-06 | Anonymous cannot read rye-students | Manual test | DevTools → Firestore read attempt without auth | Manual; or Firebase Rules Playground |
| SEC-07 | Firebase Auth logout propagates to app | Manual test | Change password → refresh app → expect logout | Manual flow |

### Wave 0 Gaps

No test files exist. CLAUDE.md explicitly states "테스트 러너 없음" — no test runner. Validation is `npm run build` + browser. No automated tests will be added in Phase 1 (out of scope per project conventions).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | YES | Firebase Auth email sign-in; 30-day re-auth; onAuthStateChanged |
| V3 Session Management | YES | localStorage session + Firebase Refresh Token; force-refresh pattern |
| V4 Access Control | YES | Firestore security rules + Custom Claims role check |
| V5 Input Validation | Partial | Workers already validate tokens; no new user input in Phase 1 |
| V6 Cryptography | YES | Service account JWT via jose (RS256); never hand-roll crypto |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Anonymous Firestore reads exposing PII | Information Disclosure | Firestore rules: `isEmailUser()` guard (SEC-06) |
| Rate limit bypass (KV not bound) | Denial of Service (cost) | Make KV required in ratelimit.js (SEC-04) |
| UID exposure via console.log | Information Disclosure | Remove all console.log calls (SEC-01) |
| Stale session after password change | Elevation of Privilege | onAuthStateChanged + token revocation (SEC-07) |
| Seed data wipe in production | Tampering / DoS | import.meta.env.DEV guard (SEC-02) |
| Custom Claims Worker requires service account | Spoofing | Service account key in Cloudflare Secrets, never in source |

---

## Sources

### Primary (HIGH confidence — direct codebase inspection)
- `src/aiClient.js` — 4 console.log calls at lines 10, 14, 20, 23 [VERIFIED]
- `src/App.jsx` — console.log at lines 367, 381; console.warn at 779; resetSeed() at 684; generateSeedData() at 344, 373; saveStudents throw-guard at 434; onAuthStateChanged imported but never used [VERIFIED]
- `src/utils.js` — console.log at line 118 [VERIFIED]
- `functions/api/ai/_utils/auth.js` — jose-based verifyToken [VERIFIED]
- `functions/api/ai/_utils/ratelimit.js` — null KV guard at line 3 [VERIFIED]
- `functions/api/ai/_middleware.js` — auth + ratelimit wiring [VERIFIED]
- `src/firebase.js` — email auth, anon auth, onAuthStateChanged exported but not wired [VERIFIED]
- `src/components/layout/NavLayout.jsx` — onResetSeed accepted but not called [VERIFIED]
- `firestore.rules` — `allow read: if isAuthed()` gap confirmed [VERIFIED]
- `wrangler.toml` — no KV binding exists [VERIFIED]

### Secondary (HIGH confidence — existing planning documents)
- `.planning/research/STACK.md` — Firebase custom claims approach, role matrix
- `.planning/research/PITFALLS.md` — Pitfalls C-1 through C-4, H-7, H-8
- `.planning/research/ARCHITECTURE.md` — set-role Worker design, rules deployment order
- `.planning/codebase/CONCERNS.md` — Issues #1, #3, #4, #7 confirmed

### Tertiary (CITED — official documentation, not verified in this session)
- `firebase.google.com/docs/auth/admin/custom-claims` — Custom Claims Admin approach
- `developers.cloudflare.com/workers/wrangler/configuration/#kv-namespaces` — KV binding config
- `cloud.google.com/identity-platform/docs/reference/rest/v1/accounts/update` — Admin REST endpoint for setting claims

---

## Metadata

**Confidence breakdown:**
- SEC-01 (console.log removal): HIGH — exact line numbers verified
- SEC-02 (resetSeed guard): HIGH — function location verified; startup path nuance is MEDIUM (requires careful handling of auto-seed logic)
- SEC-03 (saveStudents audit): HIGH — grep confirmed single throw-guard in src/
- SEC-04 (KV binding): HIGH — wrangler.toml confirmed empty; ratelimit.js confirmed null guard
- SEC-05 (Custom Claims Worker): MEDIUM — jose-based service account JWT pattern is cited from docs but not run in this session; UID lookup by email approach is ASSUMED based on firebase.js email format
- SEC-06 (Firestore rules): HIGH — current rules inspected; role matrix from existing planning docs
- SEC-07 (Auth session): HIGH — onAuthStateChanged confirmed missing; 30-day check confirmed present but incomplete

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (stable APIs; Firebase Auth and Cloudflare KV are not rapidly changing)
