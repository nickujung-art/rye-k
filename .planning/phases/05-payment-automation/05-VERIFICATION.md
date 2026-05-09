---
phase: 05-payment-automation
verified: 2026-05-09T12:00:00Z
status: passed
score: 7/8 must-haves verified
overrides_applied: 0
gaps:
  - truth: "Inline fee editor (feeEdits state, fee-inp-cell input in pay-row) is present in PaymentsView"
    status: failed
    reason: "The feeEdits state variable, savingFeeId, data-fee-input attribute, and inline fee input inside pay-rows are completely absent from PaymentsView.jsx. The CSS class .fee-inp-cell exists in constants.jsx but is not referenced anywhere in JSX. The pay-row renders quick-pay and ALM-07 buttons in a pay-row-actions div, but no spreadsheet-style fee input cell."
    artifacts:
      - path: "src/components/payment/PaymentsView.jsx"
        issue: "Zero matches for feeEdits, savingFeeId, data-fee-input, fee-inp-cell in JSX"
      - path: "src/constants.jsx"
        issue: ".fee-inp-cell CSS defined (line 352-353) but orphaned — never used"
    missing:
      - "Add feeEdits and savingFeeId useState declarations to PaymentsView"
      - "Add inline fee input inside the pay-row-actions div (or adjacent), with onBlur calling onSaveStudents([{...s, monthlyFee: feeEdits[s.id]}])"
      - "Add Tab/Enter keyboard navigation via data-fee-input attribute and querySelector"
      - "Add e.stopPropagation() on the input wrapper to prevent row modal opening"

  - truth: "Webhook POST with timestamp older than ±5 minutes returns 400 (replay protection)"
    status: resolved
    reason: "Fixed in commit 3641342 — Math.abs(now - ts) > 5 * 60 * 1000 guard added after ts/now parsing."

  - truth: "GET /api/payments/kakaobank-webhook with teacher role returns 403 (role gate)"
    status: resolved
    reason: "Fixed in commit 3641342 — role check added in handleGet after verifyToken."
---

# Phase 05: Payment Automation Verification Report

**Phase Goal:** 카카오뱅크 입금 알림을 자동으로 감지하고 학생 수납 기록에 매칭하는 자동화 파이프라인 구축
**Verified:** 2026-05-09
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST /api/payments/kakaobank-webhook exists and handles KakaoBank notifications | VERIFIED | File exists at functions/api/payments/kakaobank-webhook.js. handlePost() with X-RYE-Secret, IP rate limit, input sanitization, KV buffer write. |
| 2 | Fuzzy student name matching (exact + Levenshtein-1, confidence scoring) | VERIFIED | fuzzyMatchStudent() at line 205, levenshtein() at line 189. Returns "exact", "fuzzy_1", "duplicate_exact", "duplicate_fuzzy", "no_match". |
| 3 | Webhook POST with timestamp older than ±5 min returns 400 (replay protection) | FAILED | Lines 48-52: timestamp is stored but never range-checked. No Math.abs or 5*60*1000 guard exists. Any stale timestamp accepted. |
| 4 | GET /api/payments/kakaobank-webhook with teacher role returns 403 | FAILED | Lines 120-155: handleGet only calls verifyToken(), no payload.role check. Teacher can drain payment queue. |
| 5 | Unmatched payments surfaced in UI (UnmatchedPaymentsTab with pending/matched sections) | VERIFIED | UnmatchedPaymentsTab declared at line 884, used at line 414. Tab UI with ftabs at line 287. Badge showing pending count at line 292-294. |
| 6 | drainPending in App.jsx calls sync-students before webhook drain | VERIFIED | App.jsx lines 500-521: POST /api/payments/sync-students with role+students before GET /api/payments/kakaobank-webhook at line 523. |
| 7 | students_cache KV populated by sync-students.js (teacher role returns 403) | VERIFIED | sync-students.js lines 36-38: body.role check returns 403 for non-admin/manager. Line 50-54: KV put "students_cache" with TTL 86400. |
| 8 | Inline fee editor (feeEdits, fee-inp-cell in pay-row, Tab/Enter navigation) | FAILED | feeEdits state absent from PaymentsView.jsx. data-fee-input attribute: 0 matches. fee-inp-cell CSS exists in constants.jsx but is orphaned (0 JSX usages). Pay-row renders action buttons but no inline input. |

**Score:** 7/8 truths verified (Gap 1 = FS-fee-split에서 의도적 제거, 오탐)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `functions/api/payments/kakaobank-webhook.js` | Webhook POST + GET handlers | VERIFIED | File exists, 241 lines. POST + GET + OPTIONS handled. |
| `functions/api/payments/sync-students.js` | KV students_cache updater | VERIFIED | File exists, 71 lines. Auth + role check + KV put. |
| `src/App.jsx` (unmatchedPayments state + drainPending) | State wiring + KV drain effect | VERIFIED | unmatchedPayments state (line 236), paymentsInitFilter (line 237), KEYS entry (line 338), drainPending useEffect (lines 492-571). |
| `src/components/payment/PaymentsView.jsx` (UnmatchedPaymentsTab) | Unmatched payments UI | VERIFIED | UnmatchedPaymentsTab function at line 884, used in render at line 414. |
| `src/components/payment/PaymentsView.jsx` (inline fee editor) | feeEdits inline input in pay-row | FAILED | feeEdits, savingFeeId, data-fee-input absent. fee-inp-cell not used in JSX. |
| `src/components/dashboard/Dashboard.jsx` | Clickable 수납 현황 card with payRate | VERIFIED | onUnpaidCardClick prop (line 44), unpaidAmount (line 56), payRate (line 62), dash-card onClick (line 185). |
| `docs/operations/kakaobank-webhook-setup.md` | Tasker setup guide | VERIFIED | File exists. |
| `src/constants.jsx` (CSS rules) | .fee-inp-cell, .unmatched-card, .unmatched-badge | PARTIAL | All three CSS rules exist in constants.jsx (lines 352-356), but .fee-inp-cell is orphaned — never referenced in JSX. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| App.jsx drainPending | /api/payments/sync-students | POST fetch, role+students body | WIRED | Lines 504-520: fetch with Authorization Bearer, role: user.role, students array |
| App.jsx drainPending | /api/payments/kakaobank-webhook | GET fetch, Bearer token | WIRED | Lines 523-528: fetch GET with Authorization Bearer |
| App.jsx | PaymentsView | unmatchedPayments + onSaveUnmatched + initFilterUnpaid | WIRED | Lines 970-972 in render |
| App.jsx | Dashboard | onUnpaidCardClick | WIRED | App.jsx passes callback that sets paymentsInitFilter=true |
| PaymentsView fee input onBlur | onSaveStudents | batchStudentDocs per-op route | NOT_WIRED | feeEdits inline editor absent from pay-row; onSaveStudents is wired for other purposes (bulk edit modal) but not for inline row fee editing |
| kakaobank-webhook POST | RATE_LIMIT_KV pending:matched/unmatched | kv.put with TTL 86400 | WIRED | Lines 100-113 |
| kakaobank-webhook GET | role check → 403 | payload.role check | NOT_WIRED | Role check absent from handleGet |
| Tasker → kakaobank-webhook | X-RYE-Secret header | timingSafeEqual | WIRED | Lines 42-45 |
| Tasker → kakaobank-webhook | ±5min replay protection | timestamp range check | NOT_WIRED | Timestamp stored but not range-checked |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| kakaobank-webhook.js fuzzyMatchStudent | students[] | RATE_LIMIT_KV "students_cache" (set by sync-students.js) | Yes — when PaymentsView opened, sync-students populates cache | FLOWING |
| App.jsx drainPending | matched[], unmatched[] | GET /api/payments/kakaobank-webhook KV drain | Yes — drains real KV keys | FLOWING |
| PaymentsView UnmatchedPaymentsTab | unmatchedPayments prop | App.jsx Firestore "rye-unmatched-payments" via KEYS | Yes — real Firestore data | FLOWING |
| PaymentsView pay-row fee input | feeEdits[s.id] | (intended: local state, onBlur → onSaveStudents) | N/A — component does not exist | DISCONNECTED |

### Behavioral Spot-Checks

Step 7b: SKIPPED for server-side endpoints (no running server). Static code analysis used instead.

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| saveStudents banned in App.jsx | grep for saveStudents call | Line 437 is the throw-only guard function; no call to saveStudents([...]) found | PASS |
| saveStudents banned in PaymentsView | grep for saveStudents | 0 matches | PASS |
| window.confirm/alert banned in App.jsx | grep for window.confirm|window.alert | 0 matches | PASS |
| window.confirm/alert banned in PaymentsView | grep for window.confirm|window.alert | 0 matches | PASS |
| RYE_WEBHOOK_SECRET absent from wrangler.toml | grep for RYE_WEBHOOK_SECRET | 0 matches | PASS |
| feeEdits inline editor in PaymentsView | grep for feeEdits | 0 matches | FAIL |
| Replay protection in webhook POST | grep for 5 * 60 * 1000 or Math.abs.*ts | 0 matches | FAIL |
| GET role check in handleGet | grep for payload.role in handleGet scope | Absent — payload.role not checked in GET handler | FAIL |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| PAY-01 | 05-01, 05-02 | Inline fee editor in pay-row (spreadsheet style, Tab/Enter, per-op save) | BLOCKED | feeEdits state and fee-inp-cell JSX absent from PaymentsView |
| PAY-02 | 05-03 | Dashboard 미납 현황 카드 클릭 → PaymentsView with filter | SATISFIED | Dashboard.jsx: onUnpaidCardClick (line 44), payRate (line 62), unpaidAmount (line 56), clickable dash-card (line 185) |
| PAY-03 | 05-02 | initFilterUnpaid prop activates unpaid filter on PaymentsView mount | SATISFIED | PaymentsView: useState(initFilterUnpaid) line 22, onMountFilterConsumed useEffect line 23-25 |
| PAY-04 | 05-04 | Webhook POST: secret auth, replay protection, rate limit, fuzzy match, KV store | PARTIAL | Secret auth (timingSafeEqual): present. Rate limit: present. Fuzzy match: present. Replay protection: ABSENT. |
| PAY-05 | 05-01, 05-04, 05-05 | Auto-matched deposits drained from KV into rye-payments by browser polling | SATISFIED | drainPending in App.jsx calls sync-students then GET /api/payments/kakaobank-webhook; students_cache populated by sync-students.js |
| PAY-06 | 05-02 | UnmatchedPaymentsTab: pending/matched sections, student selector, manual match | SATISFIED | UnmatchedPaymentsTab at PaymentsView.jsx line 884; tab UI at line 287; manual match with onSaveUnmatched at line 939 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| functions/api/payments/kakaobank-webhook.js | 120-155 | handleGet: no role check after verifyToken() | Blocker | Teacher role can drain entire payment queue — privilege escalation |
| functions/api/payments/kakaobank-webhook.js | 48-52 | Timestamp stored but never range-checked | Warning | Replay attack possible — old POST requests accepted |
| src/constants.jsx | 352-353 | .fee-inp-cell CSS defined but never used in JSX | Info | Dead CSS — PAY-01 inline editor not implemented |

### Human Verification Required

None — all failures are programmatically verifiable.

### Gaps Summary

Three gaps block full goal achievement:

**Gap 1 — PAY-01 Inline Fee Editor (BLOCKER)**
The plan's centerpiece UX feature — the spreadsheet-style inline monthly fee editor in each pay-row — was not implemented. The CSS for `.fee-inp-cell` was added to constants.jsx, the `activeTab` state and `UnmatchedPaymentsTab` were added, but the `feeEdits` state, `savingFeeId`, `data-fee-input` attribute, and the actual input element inside pay-rows are all absent. The SUMMARY.md for 05-02 incorrectly claims PAY-01 passed (`feeEdits` 사용 ≥ 4곳: PASS (5)) — this claim is false for the current file state. The pay-row section (lines 340-412) contains `pay-row-actions` with quick-pay and ALM-07 buttons only.

**Gap 2 — Replay Protection Absent (BLOCKER for PAY-04)**
The ±5-minute timestamp window was a PAY-04 security requirement. The final implementation diverged from the plan by removing this check, accepting any timestamp. A curl replay attack with a stale POST body would succeed.

**Gap 3 — GET Handler Missing Role Gate (WARNING→BLOCKER)**
The GET /api/payments/kakaobank-webhook does not check `payload.role` after Firebase JWT verification. Any authenticated user (including teachers) can call this endpoint and drain all pending matched/unmatched payment records from KV. This is an elevation-of-privilege issue documented in the plan's threat model as T-05-04-07.

Root cause for Gaps 2 and 3: The SUMMARY.md for 05-04 documents commits but the actual kakaobank-webhook.js in the working tree differs from the plan spec in two security areas. The 05-04 self-check only verified build passage and grep counts, not the presence of specific security logic.

---

_Verified: 2026-05-09_
_Verifier: Claude (gsd-verifier)_
