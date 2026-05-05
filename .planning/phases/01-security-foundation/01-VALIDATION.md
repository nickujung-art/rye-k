---
phase: 1
phase-slug: security-foundation
date: 2026-05-05
---

# Validation Strategy — Phase 1: 보안 기반

> **Project note:** No test runner exists. All automated verification is `npm run build` exit 0 + grep commands. Manual browser checks cover runtime behavior.

---

## Validation Architecture

### Automated Checks (run after every task)

| Check | Command | Expected |
|-------|---------|----------|
| Build pass | `npm run build` | Exit 0, no errors |
| No UID console.log in aiClient | `grep -n "console.log" src/aiClient.js` | 0 matches |
| No PII console.log in App.jsx | `grep -n "console.log.*uid\|console.log.*token\|console.log.*UID" src/App.jsx` | 0 matches |
| No AlimTalk log in utils.js | `grep -n "console.log.*알림\|console.log.*alimtalk\|console.log.*aligo" src/utils.js` | 0 matches |
| resetSeed DEV-only | `grep -n "import.meta.env.DEV" src/App.jsx` | ≥1 match containing resetSeed guard |
| saveStudents audit | `grep -rn "saveStudents" src/` | Exactly 1 match (throw-guard only) |
| KV binding present | `grep -n "kv_namespaces" wrangler.toml` | ≥1 match |
| ratelimit.js null→throw | `grep -n "throw new Error" functions/api/ai/_utils/ratelimit.js` | ≥1 match |
| Custom Claims Worker exists | `ls functions/api/auth/set-role.js` | File exists |
| Firestore rules rewritten | `grep -n "allow read: if false\|isAdmin\|isManager\|isTeacher" firestore.rules` | ≥3 matches |
| onAuthStateChanged wired | `grep -n "onAuthStateChanged" src/App.jsx` | ≥2 matches (import + call) |

### Manual Browser Checks

| Check | How to verify | Expected |
|-------|--------------|---------|
| SEC-01: No UID in console | Open DevTools → Console → Login as teacher | Zero UID/token outputs |
| SEC-02: No seed in prod | `npm run build && npm run preview` → DevTools → No "시드 데이터" alerts | No generateSeedData call |
| SEC-04: Rate limiter active | AI feature call → check Worker logs | No `KV not bound` or silent bypass |
| SEC-05: Custom Claims set | Login → Firebase Console → Auth → check user custom claims | `{"role": "teacher"}` on token |
| SEC-06: Firestore rules | Open `/register` → DevTools Network → Firestore requests | 403 Permission Denied on rye-students |
| SEC-07: Auth session | Login → close browser → reopen within 30 days | Auto re-login without re-enter credentials |

---

## Requirement Mapping

| REQ-ID | Verification Method | Automated | Manual |
|--------|--------------------|-----------|----|
| SEC-01 | grep console.log in aiClient.js, App.jsx, utils.js | ✓ | DevTools Console check |
| SEC-02 | grep import.meta.env.DEV guard in App.jsx | ✓ | Preview build — no seed call |
| SEC-03 | grep saveStudents src/ → exactly 1 throw-guard | ✓ | — |
| SEC-04 | grep kv_namespaces in wrangler.toml | ✓ | Worker logs — rate limiter fires |
| SEC-05 | ls functions/api/auth/set-role.js + Firebase token check | ✓ | Firebase Console custom claims |
| SEC-06 | grep isAdmin in firestore.rules + 403 response | ✓ | Browser DevTools Network |
| SEC-07 | grep onAuthStateChanged call in App.jsx | ✓ | Browser 30-day session test |

---

## Phase Success Gate

All of the following must be TRUE before Phase 1 is considered complete:

1. `npm run build` exits 0 with zero console.log PII warnings
2. Firestore REST request to `/appData/rye-students` returns `403 Permission Denied` from anonymous browser session
3. Teacher login sets Firebase Custom Claim `role: "teacher"` visible in Firebase Console
4. Rate limiter KV binding active — AI Worker returns 429 after limit exceeded (not silent bypass)
5. `generateSeedData()` does NOT execute on production startup (`npm run preview`)
6. Teacher can log out and log back in within 30 days without entering credentials again

---

## Known Non-Automated Coverage

| Area | Why Not Automated | Mitigation |
|------|------------------|-----------|
| Firebase Custom Claims (SEC-05) | Requires live Firebase Auth | Checkpoint: Nick verifies in Firebase Console |
| Firestore rules deployment (SEC-06) | Requires `firebase deploy --only firestore:rules` | Human checkpoint before + after deploy |
| KV namespace creation (SEC-04) | Cloudflare Dashboard action | Nick runs `wrangler kv namespace create RATE_LIMIT_KV` and provides namespace ID |
| Portal breakage after SEC-06 | Runtime behavior change | Nick explicitly acknowledges portal outage before rules deploy |
