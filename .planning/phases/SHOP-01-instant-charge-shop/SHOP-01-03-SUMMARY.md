---
phase: SHOP-01-instant-charge-shop
plan: "03"
subsystem: payment-ui
tags: [payments, instant-charge, modal, teacher-ui, react-component]
dependency_graph:
  requires: [SHOP-01-01, SHOP-01-02]
  provides: [즉시청구-요청-모달, 강사-카드-버튼, 헤더-pending-버튼]
  affects: [src/components/payment/PaymentsView.jsx, src/App.jsx]
tech_stack:
  added: []
  patterns: [inline-error-state, stopPropagation-card-bubble, catalog-chip-selection, amountPending-checkbox]
key_files:
  created: []
  modified:
    - src/components/payment/PaymentsView.jsx
    - src/App.jsx
decisions:
  - "onAddInstantCharge prop 없을 시 window.confirm 아닌 instantReqErr 인라인 상태로 에러 표시"
  - "카탈로그 상품 선택 시 defaultPrice > 0 이면 금액 자동 입력, 0이면 amountPending=true 설정"
  - "헤더 '즉시 청구' 버튼 클릭 시 setActiveTab('instantCharges') — 실제 탭 처리는 SHOP-01-04에서 완성"
metrics:
  duration: "~15분"
  completed: "2026-05-14"
  tasks_completed: 2
  files_changed: 2
---

# Phase SHOP-01 Plan 03: PaymentsView 즉시청구 요청 모달 + App.jsx props 연결 Summary

강사가 회원 카드에서 한복·악세사리·악기가방 등 상품 즉시청구를 요청하는 모달 UI 구현 + App.jsx에서 firebase addInstantCharge와 연결 완료.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PaymentsView 즉시청구 요청 모달 + 헤더 건수 버튼 | 0ba1a7b | src/components/payment/PaymentsView.jsx |
| 2 | App.jsx에서 PaymentsView에 신규 props 연결 | a95b00b | src/App.jsx |

## What Was Built

### src/components/payment/PaymentsView.jsx

**신규 props (3개):**
- `instantCharges = []` — rye-instant-charges 실시간 배열 (SHOP-01-01 리스너)
- `shopItems = { categories, items }` — 상품 카탈로그 (SHOP-01-01 state)
- `onAddInstantCharge` — 즉시청구 요청 콜백

**신규 state (4개):**
- `instantReqModal` — null | studentObj (어느 학생 카드에서 모달 열렸는지)
- `instantReqForm` — category/itemName/amount/amountPending/stockAvailable/note
- `instantReqSaving` — 전송 중 버튼 비활성화용
- `instantReqErr` — 모달 내 인라인 에러 메시지

**파생 변수:**
- `pendingInstantCount` — instantCharges.filter(c => c.status === "pending").length

**헤더 버튼 (관리자/매니저용):**
- pendingInstantCount > 0 일 때 파란색 "즉시 청구 [N]" 버튼 표시
- 클릭 시 setActiveTab("instantCharges") (SHOP-01-04에서 탭 처리 완성 예정)

**강사 카드 버튼:**
- isTeacher 조건 내 기존 "+ 비용 청구 요청" 버튼 아래 "즉시 청구 요청" 버튼 추가
- e.stopPropagation()으로 카드 클릭 이벤트 버블링 차단
- 첫 번째 카테고리로 form 초기화 후 모달 오픈

**즉시청구 요청 모달 기능:**
- 카테고리 칩 선택 (shopItems.categories 기반, 변경 시 itemName 리셋)
- 카탈로그 상품 선택 (해당 카테고리 active 상품만, 선택 시 가격 자동 입력)
- 상품명 직접 입력 (필수)
- 금액 입력 + "금액 미정" 체크박스 (체크 시 금액 필드 비활성화)
- 재고 여부 버튼 (재고 있음 / 재고 없음)
- 메모 입력 (선택)
- 인라인 에러 표시 (⚠ instantReqErr)
- instantReqSaving 플래그로 중복 제출 차단 (T-SHOP03-03)
- parseInt(amount) 적용으로 문자열 삽입 방지 (T-SHOP03-02)

### src/App.jsx

- firebase.js import에 `addInstantCharge`, `updateInstantCharge` 추가
- PaymentsView 렌더 블록에 3개 props 추가:
  - `instantCharges={instantCharges}` (SHOP-01-01 state)
  - `shopItems={shopItems}` (SHOP-01-01 state)
  - `onAddInstantCharge` 콜백: addInstantCharge(data) + addLog + showToast

## Deviations from Plan

없음 — 플랜 그대로 실행.

## Threat Flags

없음. T-SHOP03-01~03 모두 플랜 threat_model에서 mitigate/accept 처리됨:
- isTeacher 조건으로 강사 역할만 버튼 노출 (T-SHOP03-01)
- parseInt(amount) 적용 (T-SHOP03-02)
- instantReqSaving 플래그로 중복 클릭 차단 (T-SHOP03-03)

## Known Stubs

없음. 즉시청구 요청 모달은 실제 addInstantCharge를 통해 Firestore rye-instant-charges에 쓰도록 연결됨. 헤더 "즉시 청구" 탭 버튼은 setActiveTab("instantCharges")를 호출하나, 실제 instantCharges 탭 UI는 SHOP-01-04에서 구현 예정 (현재 수납 탭이 기본 표시).

## Self-Check: PASSED

- [x] src/components/payment/PaymentsView.jsx — "즉시 청구 요청" 3회, instantReqModal 4회, instantCharges 3회, onAddInstantCharge 3회, pendingInstantCount 3회
- [x] src/App.jsx — addInstantCharge 2회, instantCharges={instantCharges} 2회(Dashboard+PaymentsView), onAddInstantCharge 1회
- [x] 커밋 0ba1a7b (Task 1), a95b00b (Task 2) 존재
- [x] npm run build 오류 없이 통과 (built in 2.71s)
