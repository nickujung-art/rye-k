---
phase: 05-payment-automation
plan: "01"
subsystem: app-wiring
tags: [payments, firestore, kakaobank, state, css]
dependency_graph:
  requires: []
  provides:
    - unmatchedPayments state (App.jsx)
    - paymentsInitFilter state (App.jsx)
    - saveUnmatchedPayments helper (App.jsx)
    - PaymentsView props: unmatchedPayments, onSaveUnmatched, initFilterUnpaid, onMountFilterConsumed
    - Dashboard prop: onUnpaidCardClick
    - drainPending polling effect (PAY-05 KV drain)
    - CSS: .fee-inp-cell, .unmatched-card, .unmatched-badge
  affects:
    - src/App.jsx
    - src/constants.jsx
tech_stack:
  added: []
  patterns:
    - "sSet-based save helper pattern (saveUnmatchedPayments)"
    - "view-gated useEffect polling (drainPending on view === 'payments')"
    - "Firebase auth.currentUser.getIdToken() for Worker JWT auth"
    - "CSS-in-JS template literal append in constants.jsx"
key_files:
  modified:
    - path: src/App.jsx
      changes: "unmatchedPayments state, paymentsInitFilter state, saveUnmatchedPayments helper, KEYS entry, PaymentsView props extended, Dashboard props extended, drainPending useEffect"
    - path: src/constants.jsx
      changes: ".fee-inp-cell (2 rules), .unmatched-card, .unmatched-badge appended to CSS string"
decisions:
  - "Used auth.currentUser (already imported) instead of adding a firebase named export — firebase.js exports auth, not firebase"
  - "drainPending dependency array is [view] only — avoids infinite loop from payments/unmatchedPayments state deps"
  - "Silent catch in drainPending — drain is best-effort, PaymentsView opens cleanly even if Worker endpoint unavailable"
  - "Dedup strategy: studentId+month merge keeps newest matched record"
metrics:
  duration: "~4 minutes"
  completed: "2026-05-08T14:52:14Z"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
---

# Phase 5 Plan 01: App.jsx State Wiring + CSS + KV Drain Summary

**One-liner:** App.jsx gains unmatchedPayments/paymentsInitFilter state, PaymentsView/Dashboard prop wiring, and a view-gated drainPending effect that pulls KakaoBank matched deposits from Worker KV into Firestore via Firebase JWT auth.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | unmatchedPayments + paymentsInitFilter state, KEYS entry, saveUnmatchedPayments, PaymentsView/Dashboard prop wiring | 713c67c |
| 2 | CSS rules: .fee-inp-cell, .unmatched-card, .unmatched-badge in constants.jsx | 3da564b |
| 3 | drainPending useEffect: GET /api/payments/kakaobank-webhook with Bearer token, KV buffer drain | a7a45c6 |

## Verification Results

```
grep -c "unmatchedPayments" src/App.jsx  → 3 (+ setUnmatchedPayments lines = 8 total)
grep -c "paymentsInitFilter" src/App.jsx → 4 lines (>= 3 required)
grep -c "drainPending" src/App.jsx       → 2 (definition + call)
grep -c "getIdToken" src/App.jsx         → 1
grep -c "fee-inp-cell" src/constants.jsx → 2 (rule + nested .inp rule)
grep -c "unmatched-card" src/constants.jsx → 1
npm run build                            → ✓ built in 2.95s (0 errors)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Deviation] Used auth.currentUser instead of firebase.currentUser**
- **Found during:** Task 3
- **Issue:** Plan specified `firebase.currentUser.getIdToken()` assuming a `firebase` named export from `./firebase.js`, but `firebase.js` exports `auth` (the Firebase Auth instance), not `firebase`.
- **Fix:** Used `auth.currentUser.getIdToken()` — `auth` is already imported on line 2 of App.jsx. Functionally identical.
- **Files modified:** src/App.jsx
- **Commit:** a7a45c6

## Known Stubs

None — this plan is infrastructure wiring only. No UI rendering changes. PaymentsView and Dashboard components will consume the new props in Plans 02 and 03 respectively.

## Threat Flags

None — all new surface is covered by the plan's threat model (T-05-01-01 through T-05-01-05).

## Self-Check: PASSED

- FOUND: src/App.jsx
- FOUND: src/constants.jsx
- FOUND: .planning/phases/05-payment-automation/05-01-SUMMARY.md
- FOUND: commits 713c67c, 3da564b, a7a45c6
