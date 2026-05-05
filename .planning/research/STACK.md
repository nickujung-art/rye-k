# Technology Stack — RYE-K New Modules

**Project:** RYE-K K-Culture Center  
**Researched:** 2026-05-05  
**Scope:** Kakao AlimTalk integration, bank transfer auto-matching, Firestore security rules, portal enhancements  
**Overall confidence:** MEDIUM — Korean B2C messaging APIs verified from training data (Aug 2025); Firebase rules patterns HIGH confidence; bank webhook landscape MEDIUM (rapidly changing Korean fintech market)

---

## Current Stack Baseline

The existing stack is fixed by project constraint:

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React SPA | 18.3.1 |
| Build | Vite | 5.4.0 |
| Database | Firebase Firestore | SDK v10.13.0 |
| Auth | Firebase Auth | SDK v10.13.0 |
| Edge functions | Cloudflare Pages Functions (Workers) | — |
| AI | Gemini 2.5 Flash via Cloudflare Workers | — |
| Hosting | Cloudflare Pages | — |

New modules must integrate cleanly into this stack. No new frontend frameworks, no new hosting platforms.

---

## Module 1: Kakao AlimTalk

### How AlimTalk Works (Confidence: HIGH)

KakaoTalk Business AlimTalk (카카오 알림톡) is a regulated channel for Korean businesses to send transactional messages to KakaoTalk users. It is **not a free-form messaging API** — every message must use a pre-approved template.

**Flow:**
1. Business registers a KakaoTalk Channel (카카오톡 채널 — formerly PlusFriend)
2. Submits message templates to Kakao for approval (심사)
3. Template approval takes 1–7 business days per template
4. Approved templates are sent via a third-party messaging partner (발신 대행사), NOT directly via Kakao's own API

**Critical constraint:** Kakao does not expose a public REST API that you can call directly from your server. All AlimTalk sending goes through a certified messaging partner (발신 대행사) such as:
- **Solapi** (formerly CoolSMS) — `solapi.com`
- **NCP (Naver Cloud Platform)** — SENS service
- **Bizmessage** — `bizmsg.kr`
- **KakaoEnterprise** — for large enterprises only

### Registration Requirements (Confidence: HIGH)

Before any API call works:
1. **사업자 등록증** — Business registration certificate (사업자등록번호 required)
2. **카카오톡 채널 개설** — Create a KakaoTalk Channel at `business.kakao.com`. Personal accounts cannot send AlimTalk.
3. **채널 검색 허용 설정** — Channel must be set to searchable
4. **발신 프로필 키 발급** — After channel approval, get a Sender Profile Key
5. **템플릿 등록·심사** — Each message template must be pre-registered and approved. Variables use `#{변수명}` syntax

**For RYE-K specifically:** The three templates in `AlimtalkModal.jsx` (monthly fee, unpaid reminder, makeup lesson) must each be submitted for approval before the feature can go live. Budget 1–2 weeks for approval.

### Recommended SDK: Solapi (Confidence: MEDIUM)

Use **Solapi** (`@solapi/node-sdk`) as the messaging partner. Reasons:
- Most widely used AlimTalk partner in Korean startup/SME ecosystem
- Good Node.js SDK, compatible with Cloudflare Workers (uses `fetch` internally, not Node.js `http`)
- Reasonable pricing (~8–15원/message for AlimTalk vs ~20원 for SMS)
- Dashboard with delivery receipts and failure logs
- Supports both AlimTalk and fallback SMS (중요: 카카오톡 미사용자에게 SMS 폴백)

**Alternative: NCP SENS** — more enterprise-grade, better SLA, higher pricing, heavier SDK. Good if the project expects volume > 10,000 messages/month. Overkill for a 77-student academy.

**Do NOT use:** Direct Kakao REST API — it does not exist for external developers. Do not try to call `api.kakao.com` directly for AlimTalk.

### API Approach for Cloudflare Workers (Confidence: MEDIUM)

The Solapi Node.js SDK uses `node-fetch` under the hood. In Cloudflare Workers, use the REST API directly (not the SDK) because Workers do not have full Node.js compatibility for SDK internals.

Recommended approach: Implement a thin Cloudflare Worker function at `functions/api/notify/alimtalk.js` that calls the Solapi REST API directly:

```
POST https://api.solapi.com/messages/v4/send
Authorization: HMAC-SHA256 ApiKey={key}, Date={date}, Salt={salt}, Signature={sig}
Content-Type: application/json

{
  "messages": [
    {
      "to": "01012345678",
      "from": "01000000000",   // approved sender number
      "kakaoOptions": {
        "pfId": "KA01PF...",   // sender profile ID
        "templateId": "KA01TP...", // approved template ID
        "variables": { "#{이름}": "홍길동", "#{금액}": "150,000" }
      }
    }
  ]
}
```

HMAC-SHA256 signature can be computed in Workers using the Web Crypto API (`crypto.subtle.sign`). No external library needed.

### Message Template Constraints (Confidence: HIGH)

- Maximum length: **1,000 bytes** (Korean characters = 3 bytes each; ~333 Korean chars)
- Variables: `#{변수명}` format — variable names must be Korean or English, no spaces
- Buttons: up to 5 buttons (link, copy, phone, app scheme)
- Template categories: notification (알림), authentication (인증), marketing (광고)
  - Marketing templates require user opt-in (수신 동의); use notification category for service messages
- Line breaks: allowed
- Links in body text: not allowed (use button instead)
- Emoji: allowed but count toward byte limit

**Current templates in `AlimtalkModal.jsx` use emoji and multi-line — this is fine.** However the template text must exactly match the approved template text during submission, with `#{변수명}` placeholders where variable content will be.

### Cost and Rate Limits (Confidence: MEDIUM)

| Channel | Cost per message | Notes |
|---------|-----------------|-------|
| AlimTalk (알림톡) | ~8–15원 | Transactional, no opt-in required |
| FriendTalk (친구톡) | ~5–10원 | Requires user to follow the channel |
| SMS fallback | ~20원 | Triggered when recipient does not use KakaoTalk |

For 77 students × 3 message types × 1/month = ~231 messages/month ≈ 2,000–3,500원/month. Negligible cost.

Rate limits (Solapi): 1,000 messages/second burst, no monthly cap at this volume.

### What NOT to Do

- Do NOT send AlimTalk directly from the React client — API keys must stay server-side
- Do NOT use the Kakao SDK for Social Login (`kakao.js`) — that is unrelated to AlimTalk
- Do NOT try to send unapproved template text — messages will be rejected by the Kakao gateway
- Do NOT expose the Solapi API key or HMAC secret in the frontend bundle

---

## Module 2: Bank Transfer Auto-matching (입금 자동 매칭)

### Landscape Overview (Confidence: MEDIUM)

There are three distinct approaches to receive bank deposit notifications in Korea:

| Approach | What it is | Suitability for RYE-K |
|----------|-----------|----------------------|
| **가상계좌 (Virtual Account)** | PG issues a unique account per student; deposits auto-match | Best technical fit but requires PG integration |
| **오픈뱅킹 (Open Banking)** | 금융결제원 API for reading account transactions | Possible but requires KFTC registration + OAuth |
| **은행 문자 파싱** | Bank sends SMS on deposit; parse and match | Brittle, not recommended |
| **수동 입금 확인** | Staff checks bank app and marks paid in RYE-K | Current state — works, just manual |

**Verdict for RYE-K:** Given that PG integration is explicitly Out of Scope (PROJECT.md), and KFTC Open Banking requires a licensed fintech registration process, the lightest-path recommendation is **토스페이먼츠 가상계좌** within a limited PG scope, or staying with manual confirmation but adding **입금 확인 단축키 UX** improvements.

### Virtual Account Path (토스페이먼츠) — Confidence: MEDIUM

토스페이먼츠 (Toss Payments) supports 가상계좌 (virtual account) issuance without requiring full payment gateway integration for card payments. A business can:
1. Issue unique virtual account numbers per student (KakaoBank, Shinhan, KB, etc.)
2. Student deposits into their assigned account
3. Toss sends a webhook to your server on successful deposit
4. Your server matches the deposit to a student and marks payment confirmed

**Prerequisites:**
- 사업자 등록 (business registration) — required
- Toss Payments merchant account registration
- HTTPS endpoint to receive webhooks (Cloudflare Worker URL works)

**Why NOT full PG:** Full PG (card payments, etc.) requires additional compliance. Virtual account only is a lighter registration path, but still requires business registration.

**나이스페이 / KG이니시스:** Both also offer virtual accounts but with heavier integration requirements and older APIs. Toss Payments has the best developer experience and Korean-language docs.

### Open Banking Path (금융결제원) — Confidence: LOW

The Financial Settlement Institute (금융결제원) Open Banking API allows reading account transaction history. However:
- Requires membership registration with KFTC (금융결제원)
- User must authenticate each bank account via OAuth flow
- Designed for fintech apps, not for a small academy's internal use
- Registration process is significant (weeks, compliance review)

**Do NOT pursue this path for RYE-K's scale.**

### Recommended Approach: Manual + UX Improvements First (Confidence: HIGH)

Given the constraints (no PG integration in scope, ~77 students), the pragmatic recommendation is:

1. **Short term:** Improve the existing manual payment confirmation UX. The current "✓ 입금" quick-pay button is already in place. Add bulk confirmation mode.
2. **Medium term:** Integrate 토스페이먼츠 가상계좌 when Nick is ready to register the business account. This is a preparation task, not a build task.
3. **Integration point:** When a Toss webhook fires, call a new Cloudflare Worker function at `functions/api/notify/bank-webhook.js` that matches deposit `depositorName` + `amount` against unpaid student records in Firestore, then marks payment confirmed and triggers an AlimTalk confirmation message.

### Webhook Pattern for Cloudflare Workers (Confidence: HIGH)

```
POST /api/notify/bank-webhook
Authorization: toss-signature header (HMAC-SHA256)

{
  "type": "VIRTUAL_ACCOUNT_DEPOSIT",
  "data": {
    "orderId": "student-{studentId}-{month}",
    "amount": 150000,
    "depositorName": "홍길동",
    "virtualAccountNumber": "3333-XX-XXXXXXX"
  }
}
```

The `orderId` should be set to a predictable pattern (e.g., `student-{studentId}-{YYYY-MM}`) when issuing the virtual account. This allows deterministic matching without needing fuzzy name search.

### What NOT to Do

- Do NOT parse bank SMS messages — fragile, breaks with bank app updates, not GDPR-compliant
- Do NOT use Open Banking APIs — over-engineered for a 77-student school
- Do NOT store raw bank account credentials in Firestore — use the PG's webhook pattern
- Do NOT attempt to implement bank statement scraping

---

## Module 3: Firestore Security Rules

### Current State (Confirmed from `firestore.rules`)

The current rules are partially locked down but have critical gaps (as documented in `CONCERNS.md` issue #1):

- `appData/{document}` base rule: authenticated (including anonymous) can read, email users can write
- `rye-pending` and `rye-attendance` and `rye-student-notices`: any authenticated (including anonymous) can read AND write
- This means: anonymous portal visitors can read ALL student data, teacher data, payment data

### Recommended Approach: Custom Claims for Role (Confidence: HIGH)

**Use Firebase custom claims, not user document lookups.** The role system currently stores roles in `rye-teachers` Firestore documents. For security rules, this creates a circular dependency: to enforce a read rule, you'd need to do a Firestore `get()` inside the rule to check the teacher document, which:
1. Counts as an extra read (billing)
2. Can cause rule evaluation loops
3. Slows down every request

Custom claims are embedded in the Firebase ID token — zero extra reads:

```javascript
// In a Cloudflare Worker admin function, set claims after teacher login:
// admin.auth().setCustomUserClaims(uid, { role: 'teacher', teacherId: 'xxx' })
```

Then in rules:
```
request.auth.token.role == 'admin'
request.auth.token.role == 'manager'
request.auth.token.role == 'teacher'
request.auth.token.teacherId == resource.data.teacherId
```

**However:** Setting custom claims requires Firebase Admin SDK, which needs a service account key. Cloudflare Workers can call the Firebase Auth REST API to set claims without the Admin SDK using a service account JWT (generated via Web Crypto).

### Complete Role Matrix for Firestore Rules (Confidence: HIGH)

| Collection | anonymous | portal student (anon) | teacher (email) | manager (email) | admin (email) |
|-----------|-----------|----------------------|-----------------|-----------------|---------------|
| rye-students | DENY | DENY (own record only via portal, not Firestore) | read own students | read+write all | read+write all |
| rye-teachers | DENY | DENY | read self only | read+write all | read+write all |
| rye-attendance | DENY | write own comments only | read+write own | read+write all | read+write all |
| rye-payments | DENY | read own only | DENY (teachers can't see fees) | read+write all | read+write all |
| rye-pending | DENY | write only (registration) | read+write | read+write | read+write |
| rye-notices | DENY | read only | read+write own | read+write | read+write |
| rye-student-notices | DENY | write readBy[] only (own) | read+write own | read+write | read+write |
| rye-institutions | DENY | DENY | read own | read+write | read+write |
| rye-categories | DENY | DENY | read only | read+write | read+write |
| rye-fee-presets | DENY | DENY | read only | read+write | read+write |
| rye-schedule-overrides | DENY | read own | read+write own | read+write | read+write |
| rye-activity | DENY | DENY | write own logs, read own | read+write | read+write |
| rye-trash | DENY | DENY | DENY | read+write | read+write |

### Key Rule Pattern (Confidence: HIGH)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAnonymous() {
      return request.auth != null &&
        request.auth.token.firebase.sign_in_provider == 'anonymous';
    }

    function isEmailUser() {
      return request.auth != null &&
        request.auth.token.firebase.sign_in_provider == 'password';
    }

    function hasRole(role) {
      return isEmailUser() && request.auth.token.role == role;
    }

    function isTeacher() {
      return hasRole('teacher');
    }

    function isManagerOrAbove() {
      return isEmailUser() &&
        (request.auth.token.role == 'manager' || request.auth.token.role == 'admin');
    }

    function isAdmin() {
      return hasRole('admin');
    }

    function myTeacherId() {
      return request.auth.token.teacherId;
    }

    match /appData/rye-students {
      allow read: if isEmailUser();  // teachers read all for now; narrow to own later
      allow write: if isManagerOrAbove();
    }

    match /appData/rye-attendance {
      allow read: if isEmailUser() || isAnonymous(); // portal reads own via student code
      allow write: if isEmailUser() || isAnonymous(); // portal writes comments
    }

    match /appData/rye-pending {
      allow read, write: if request.auth != null; // public registration form
    }

    match /appData/rye-student-notices {
      allow read: if request.auth != null;
      allow write: if request.auth != null; // portal marks readBy[]
    }

    match /appData/rye-payments {
      allow read: if isEmailUser();
      allow write: if isManagerOrAbove();
    }

    match /appData/rye-teachers {
      allow read: if isEmailUser();
      allow write: if isManagerOrAbove();
    }

    match /appData/rye-trash {
      allow read, write: if isAdmin();
    }

    match /appData/rye-activity {
      allow read: if isAdmin();
      allow write: if isEmailUser();
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

**Note on the transition:** The current rules allow anonymous reads of all data. Tightening these rules without breaking the portal (which uses anonymous auth for portal visitors) requires careful sequencing:
1. Set custom claims for all email users first (admin tool)
2. Deploy tightened rules
3. Verify portal functionality
4. Tighten anonymous rules last

### Testing Firestore Rules (Confidence: HIGH)

Use the Firebase Rules Unit Testing library (`@firebase/rules-unit-testing`) with Vitest or Jest:

```bash
npm install -D @firebase/rules-unit-testing
```

Run against the Firebase Local Emulator Suite:
```bash
npx firebase emulators:start --only firestore
```

Test pattern:
```javascript
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

const env = await initializeTestEnvironment({
  projectId: 'rye-k-center',
  firestore: { rules: fs.readFileSync('firestore.rules', 'utf8') }
});

// Anonymous cannot read students
await assertFails(
  env.unauthenticatedContext().firestore()
    .doc('appData/rye-students').get()
);

// Teacher can read students
await assertSucceeds(
  env.authenticatedContext('teacher-uid', {
    firebase: { sign_in_provider: 'password' },
    role: 'teacher', teacherId: 'T001'
  }).firestore().doc('appData/rye-students').get()
);
```

**Do NOT use:** `firebase-admin` in test files if you want the tests to run in CI without a service account. The rules-unit-testing library handles this.

### Custom Claims Migration Path (Confidence: MEDIUM)

The current role is stored in `rye-teachers[].role` (Firestore), not in Auth claims. To migrate:

1. Add an admin-only function in `AdminTools.jsx` (or a Cloudflare Worker) that, on teacher login, reads the teacher's role from Firestore and sets it as a custom claim via Firebase Auth REST API
2. Or: run a one-time migration script via a Cloudflare Worker that iterates all teachers and sets their claims

**Firebase Auth REST API for setting custom claims** (from Cloudflare Worker using service account):
```
POST https://identitytoolkit.googleapis.com/v1/accounts:update?key={FIREBASE_API_KEY}
Body: { "idToken": "...", "customAttributes": "{\"role\":\"teacher\",\"teacherId\":\"T001\"}" }
```
This requires the user's own ID token — not ideal for server-side setting. The proper way requires Firebase Admin SDK or a service account flow. For Cloudflare Workers, the recommended path is using `google-auth-library` patterns via `fetch` to the Admin SDK REST endpoint.

**Simpler alternative until Admin SDK is available:** Keep role checks in the application layer (React) as they are now, but fix the immediate CRITICAL issue (anonymous reads) using only the `isEmailUser()` / `isAnonymous()` distinction. This does not require custom claims.

---

## Module 4: Student/Parent Portal Enhancements

### Current Portal Architecture (Confirmed from codebase)

The portal (`PublicPortal.jsx`) uses anonymous Firebase Auth + student code lookup. No Firebase Auth-linked identity for students or parents. This is a lightweight approach suitable for the current scale.

### Recommended Stack for Portal Enhancements

No new libraries needed. The existing React + Firestore anonymous auth pattern is sufficient for:
- Student view: timetable, attendance history, lesson notes, payment status
- Parent view: child's attendance, lesson notes, payment status
- Self-registration flow: write to `rye-pending`, admin approves

**What to add:**
- Persistent anonymous session (currently sessionStorage — move to localStorage for 30-day session)
- One-time link or QR code for parent onboarding (generate link with student code embedded, expires after first use)

### Portal Auth Token for Firestore Rules (Confidence: MEDIUM)

The portal currently uses anonymous auth which gets the same token as an unauthenticated visitor. To distinguish portal users (authenticated students) from random anonymous visitors in Firestore rules, the recommended pattern is:

After a student enters their correct student code, issue them a custom claim: `{ portalStudentId: "S001" }`. This allows Firestore rules to write:

```javascript
match /appData/rye-attendance {
  allow write: if request.auth.token.portalStudentId != null;
  // Only verified portal students can write comments
}
```

However this requires the custom claims Admin SDK path described above. **Short-term:** keep anonymous write access for `rye-attendance` (comments) and `rye-student-notices` (readBy) as-is.

---

## Supporting Library Decisions

### New Dependencies to Add

| Library | Purpose | Why | Notes |
|---------|---------|-----|-------|
| `@firebase/rules-unit-testing` | Test Firestore rules | Official Firebase testing library | Dev dependency only |
| none (Solapi REST API directly) | AlimTalk sending | Workers-compatible, no Node.js SDK needed | Server-side only |
| none (Toss Payments REST API) | Bank webhook receiving + virtual account | Standard REST webhooks, no SDK needed | Server-side only |

### What NOT to Add

| Library | Why Not |
|---------|---------|
| `firebase-admin` | Requires Node.js runtime; Cloudflare Workers use Web APIs. Use Firebase REST APIs instead |
| `@solapi/node-sdk` | Node.js-only internals; call Solapi REST API directly from Workers |
| `axios` | `fetch` is native in Workers and React 18; no need for a wrapper |
| `redux` / `zustand` | Project explicitly has no global state library; props drilling is the established pattern |
| Any new UI component library | Project uses inline CSS string pattern; external component libraries would conflict |
| `firebase-functions` | Project uses Cloudflare Workers, not Firebase Functions |

---

## Environment Variables to Add

| Variable | Where | Purpose |
|----------|-------|---------|
| `SOLAPI_API_KEY` | Cloudflare dashboard secret | Solapi API key for AlimTalk |
| `SOLAPI_API_SECRET` | Cloudflare dashboard secret | Solapi HMAC secret |
| `SOLAPI_SENDER_PROFILE_ID` | Cloudflare dashboard secret | Kakao channel sender profile ID (KA01PF...) |
| `SOLAPI_SENDER_NUMBER` | Cloudflare dashboard secret | Approved sender phone number |
| `TOSS_SECRET_KEY` | Cloudflare dashboard secret | Toss Payments secret key (when PG is added) |
| `TOSS_WEBHOOK_SECRET` | Cloudflare dashboard secret | Webhook signature verification |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | Cloudflare dashboard secret | For setting custom claims (JSON) |

All of these are Worker-only secrets (not `VITE_*`) — never exposed to the frontend bundle.

---

## Sources

**Confidence levels:**
- Kakao AlimTalk API: HIGH from training data (Aug 2025); Korean developer community documentation is stable on this topic
- Solapi as recommended partner: MEDIUM — most commonly cited in Korean startup tech blogs; verified as Workers-compatible from architecture (uses `fetch`)
- Bank webhook / virtual account: MEDIUM — Toss Payments documentation pattern from training data; should be verified against current `toss.im/developers` docs before implementation
- Firestore security rules patterns: HIGH — official Firebase documentation patterns, stable across versions
- Custom claims approach: HIGH — official Firebase Auth documentation
- `@firebase/rules-unit-testing`: HIGH — official Firebase testing library
- Portal architecture recommendations: HIGH — derived from existing codebase analysis

**Gaps that need verification before implementation:**
1. Solapi AlimTalk template registration — confirm variable substitution syntax `#{변수명}` matches current Solapi API version
2. Toss Payments virtual account — confirm the orderId pattern and webhook payload schema against current API docs at `developers.tosspayments.com`
3. Firebase custom claims via REST API from Cloudflare Workers — test the Admin SDK REST endpoint flow before committing to this path
4. AlimTalk template approval timeline — contact Solapi support for current average approval times (has ranged from same-day to 2 weeks historically)

---

*Stack research: 2026-05-05*
