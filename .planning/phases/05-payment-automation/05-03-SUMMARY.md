---
phase: "05"
plan: "03"
subsystem: "dashboard"
tags: ["dashboard", "payments", "PAY-02", "clickable-card", "unpaid-amount"]
dependency_graph:
  requires: ["05-01"]
  provides: ["Dashboard onUnpaidCardClick wiring", "payRate display", "unpaidAmount display"]
  affects: ["Dashboard.jsx"]
tech_stack:
  added: []
  patterns: ["inline IIFE computation", "conditional prop call pattern"]
key_files:
  modified: ["src/components/dashboard/Dashboard.jsx"]
decisions:
  - "Filter activeStudents with !s.isInstitution explicitly even though App.jsx already excludes them, for defensive correctness"
  - "payRate line placed after paidCount row inside IIFE — outer-scope variable access works fine"
  - "unpaidAmount displayed inline in 미납 row as a secondary span, not a separate line"
metrics:
  duration: "~8 minutes"
  completed: "2026-05-09"
  tasks_completed: 1
  files_modified: 1
---

# Phase 05 Plan 03: Dashboard 미납 현황 카드 PAY-02 Summary

**One-liner:** Dashboard 수납 현황 카드에 클릭 핸들러(onUnpaidCardClick), 납부율(payRate%), 미납금액합계(fmtMoney) 추가

## What Was Built

Modified `src/components/dashboard/Dashboard.jsx` to implement PAY-02:

1. **`onUnpaidCardClick` prop added** to Dashboard function signature — receives the callback wired in App.jsx (Plan 01) that sets `paymentsInitFilter=true` and navigates to PaymentsView.

2. **New computation variables** added after existing payment computations:
   - `activeStudents` — students filtered with `!s.isInstitution` (explicit safety filter)
   - `unpaidAmount` — sum of unpaid fees across active students (uses payment record amount if exists, else `monthlyFee + rentalFee`)
   - `paidActiveCount` — count of active students with paid payment this month
   - `payRate` — percentage rounded to integer

3. **"이번달 미납" stat-card updated:**
   - `onClick` now calls `onUnpaidCardClick` if available, falls back to `nav("payments")`
   - `stat-sub` shows `fmtMoney(unpaidAmount)` when unpaidAmount > 0, else monthLabel

4. **"이번달 수납 현황" dash-card updated:**
   - `cursor: "pointer"` style added
   - `onClick` calls `onUnpaidCardClick` or falls back to `nav("payments")`
   - After paidCount row: 납부율 line with green/red color based on `payRate >= 80`
   - After unpaidCount span: conditional `fmtMoney(unpaidAmount)` in red

## Acceptance Criteria Status

| Criterion | Status |
|-----------|--------|
| 수납 현황 dash-card clickable → onUnpaidCardClick | PASS |
| 미납 금액 합계 표시 (fmtMoney) | PASS |
| 납부율 표시 (납부율 X%) | PASS |
| 이번달 미납 stat-card → onUnpaidCardClick | PASS |
| isInstitution 제외 계산 | PASS |
| Build passes | PASS |

## Commit

- `38cc97e`: feat(05-03): Dashboard 미납 현황 카드 클릭 + payRate + unpaidAmount 표시 (PAY-02)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — no new network endpoints or auth paths introduced.

## Self-Check: PASSED

- File `src/components/dashboard/Dashboard.jsx` modified: confirmed
- Commit `38cc97e` exists: confirmed
- Build exit 0: confirmed
