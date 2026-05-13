---
phase: SHOP-01-instant-charge-shop
plan: "05"
subsystem: payment-ui
tags: [payments, instant-charge, confirm-payment, dashboard-badge, react-component]
dependency_graph:
  requires: [SHOP-01-01, SHOP-01-03, SHOP-01-04]
  provides: [입금확인-버튼, 즉시청구-paid-전환, 수납레코드-생성, dashboard-배지]
  affects: [src/components/payment/PaymentsView.jsx, src/components/dashboard/Dashboard.jsx, src/App.jsx]
tech_stack:
  added: []
  patterns: [confirm-payment-callback, kst-datetime, type-instant-payment-record]
key_files:
  created: []
  modified:
    - src/components/payment/PaymentsView.jsx
    - src/components/dashboard/Dashboard.jsx
    - src/App.jsx
decisions:
  - "입금 확인 버튼 클릭 시 중복 처리 차단은 confirmingPaymentId state로 (window.confirm 미사용)"
  - "payment record id는 charge.id + '_pay' 패턴으로 즉시청구 참조 추적 가능하게"
  - "KST month/paidDate 계산: Date.now() + 9시간 오프셋으로 UTC→KST 변환"
  - "Dashboard 4.6 배지는 type:blue, key:instant-charge (강사 비용 청구 4.5와 구분)"
metrics:
  duration: "~10분"
  completed: "2026-05-14"
  tasks_completed: 2
  files_changed: 3
---

# Phase SHOP-01 Plan 05: 입금 확인 버튼 + Dashboard 배지 Summary

즉시청구 approved 카드에 "입금 확인" 버튼 구현 + 클릭 시 rye-instant-charges status를 'paid'로 변경하고 rye-payments에 type:'instant' 수납 레코드 자동 생성. Dashboard에 pending 건수 배지 추가로 전체 즉시청구 플로우(요청→승인→알림→입금확인→수납기록) 완성.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PaymentsView 입금 확인 버튼 + onConfirmInstantPayment prop | 217e748 | src/components/payment/PaymentsView.jsx |
| 2 | Dashboard 배지 + App.jsx 콜백 연결 | 43c8542 | src/components/dashboard/Dashboard.jsx, src/App.jsx |

## What Was Built

### src/components/payment/PaymentsView.jsx

**신규 props (1개):**
- `onConfirmInstantPayment` — 입금 확인 콜백 (charge, student 인자)

**신규 state (1개):**
- `confirmingPaymentId` — null | charge.id (중복 클릭 차단, 처리 중 버튼 disabled)

**입금 확인 버튼 (approved 카드 isApproved 블록 내):**
- btn-primary 스타일, "알림 메시지 복사" 버튼 아래 배치
- 처리 중: disabled + "처리 중.." 텍스트 표시
- 완료/취소 시 confirmingPaymentId 초기화 (finally 블록)

### src/components/dashboard/Dashboard.jsx

**prop 추가:**
- `instantCharges = []` — Dashboard prop 서명 끝에 추가

**알림 배지 추가 (4.6):**
- canManageAll 조건 (관리자/매니저 전용)
- pending 건수 > 0 일 때 type:"blue" 알림 표시
- "📦 즉시 청구 요청 N건 — 수납 관리에서 확인하세요"
- key: "instant-charge", onClick: () => nav("payments")

### src/App.jsx

**onConfirmInstantPayment 콜백:**
1. `updateInstantCharge(charge.id, { status: "paid", paidAt, paymentId })`
2. KST 기준 YYYY-MM / YYYY-MM-DD 계산 후 payRecord 생성:
   - id: charge.id + "_pay"
   - type: "instant"
   - instantChargeId: charge.id (역참조용)
   - method: "transfer", paid: true
3. `savePayments([...payments, payRecord])` — 배열 스프레드로 불변 추가
4. `addLog(즉시청구 입금 확인 — 학생명 금액)`
5. `showToast("입금 확인 완료. 수납 레코드가 생성되었습니다.")`

## SHOP-01 Phase 전체 플로우 완성

| 단계 | Plan | 구현 내용 |
|------|------|---------|
| 1. Firestore 기반 설정 | SHOP-01-01 | instantCharges 리스너, firebase 함수 |
| 2. 상품 카탈로그 관리 | SHOP-01-02 | ShopView, 상품 CRUD |
| 3. 강사 즉시청구 요청 | SHOP-01-03 | 요청 모달, addInstantCharge |
| 4. 관리자 승인/거절 | SHOP-01-04 | 승인 모달, 알림 메시지 복사 |
| 5. 입금 확인 + 수납기록 | SHOP-01-05 | 입금 확인 버튼, payments 레코드 생성, Dashboard 배지 |

## Deviations from Plan

없음 — 플랜 그대로 실행.

## Threat Flags

없음. T-SHOP05-01~03 모두 플랜 threat_model에서 처리됨:
- T-SHOP05-01: canManageAll 조건으로 관리자/매니저만 즉시청구 탭 접근 (SHOP-01-04에서 구현)
- T-SHOP05-02: amount는 관리자가 승인 시 설정한 값을 그대로 사용 (accept)
- T-SHOP05-03: addLog()로 처리자·금액·학생명 기록, paidAt 타임스탬프 저장

## Known Stubs

없음. 즉시청구 전체 플로우(요청→승인→알림→입금확인→수납레코드) 완전 구현됨.

## Self-Check: PASSED

- [x] src/components/payment/PaymentsView.jsx — "입금 확인" 5회, onConfirmInstantPayment 2회, confirmingPaymentId 3회
- [x] src/components/dashboard/Dashboard.jsx — instantCharges 2회, "즉시 청구 요청" 1회
- [x] src/App.jsx — onConfirmInstantPayment 1회, type: "instant" 2회 (type:"instant" 레코드 + type.*instant grep)
- [x] 커밋 217e748 (Task 1), 43c8542 (Task 2) 존재
- [x] npm run build 오류 없이 통과 (built in 2.70s)
- [x] 모든 acceptance criteria 통과
