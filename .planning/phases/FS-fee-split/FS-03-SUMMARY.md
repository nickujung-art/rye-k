---
phase: FS-fee-split
plan: "03"
subsystem: payment
tags: [fee-split, calcTotalFee, payments, dashboard, breakdown]
dependency_graph:
  requires: [FS-01]
  provides: [payments-fee-accurate, dashboard-fee-accurate]
  affects: [PaymentsView, Dashboard, App]
tech_stack:
  added: []
  patterns: [calcTotalFee-based-fee-calculation, breakdown-ui]
key_files:
  created: []
  modified:
    - src/components/payment/PaymentsView.jsx
    - src/components/dashboard/Dashboard.jsx
    - src/App.jsx
decisions:
  - "autoFee를 calcTotalFee(s, feePresets) 기반으로 교체하여 lessons[].fee 합산이 수납 화면에 반영됨"
  - "인라인 monthlyFee 단일 편집 입력창 제거 — 수강료 편집은 StudentFormModal에서 레슨별로 이루어지는 것이 정석"
  - "수납 상세 모달에 과목별 breakdown을 표시하여 수납 내역 투명성 확보"
  - "feePresets prop을 App.jsx에서 PaymentsView와 Dashboard로 전달 (기존 MainApp state 활용)"
metrics:
  duration: "~15분"
  completed: "2026-05-09"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 3
---

# Phase FS Plan 03: PaymentsView/Dashboard calcTotalFee 교체 Summary

## One-liner

PaymentsView의 autoFee와 Dashboard의 unpaidAmount를 calcTotalFee(lessons[].fee 합산) 기반으로 교체하고, 수납 상세 모달에 과목별 수강료 breakdown UI를 추가했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PaymentsView autoFee 교체, 인라인 fee 편집 제거, 상세 모달 breakdown | 1772ffb | PaymentsView.jsx |
| 2 | Dashboard calcTotalFee 교체 + App.jsx feePresets prop 연결 | 4008c59 | Dashboard.jsx, App.jsx |

## Changes Summary

### Task 1: PaymentsView (1772ffb)

- `calcTotalFee` import 추가 (utils.js에서)
- `feePresets = {}` prop 추가
- `autoFee = (s) => calcTotalFee(s, feePresets)` 로 교체
- `feeEdits`, `savingFeeId` state 선언 제거
- `<div className="fee-inp-cell">` 인라인 수강료 편집 블록 제거 (입금 버튼, 알림톡 버튼은 유지)
- 수납 상세 모달에 과목별 수강료 breakdown JSX 삽입 (extraSum 브레이크다운 앞에 위치)

### Task 2: Dashboard + App.jsx (4008c59)

- Dashboard.jsx: `calcTotalFee` import 추가, `feePresets = {}` prop 추가
- Dashboard.jsx: `unpaidAmount` 계산을 `calcTotalFee(s, feePresets)` 기반으로 교체
- App.jsx: Dashboard 렌더에 `feePresets={feePresets}` prop 추가
- App.jsx: PaymentsView 렌더에 `feePresets={feePresets}` prop 추가

## Deviations from Plan

None - 플랜 그대로 실행됨.

## Known Stubs

없음. 모든 변경은 실제 데이터 흐름에 연결됨.

## Threat Flags

| Flag | File | Description |
|------|------|-------------|
| T-FS-03-01 (mitigated) | PaymentsView.jsx | 수강료 금액 표시는 canManageAll 체크 하에서만 노출 — 강사에게 숨김 패턴 유지됨 |

## Self-Check: PASSED

- [x] src/components/payment/PaymentsView.jsx 수정됨
- [x] src/components/dashboard/Dashboard.jsx 수정됨
- [x] src/App.jsx 수정됨
- [x] Task 1 커밋: 1772ffb
- [x] Task 2 커밋: 4008c59
- [x] npm run build 통과
