---
phase: 11-discount-system
plan: "03"
subsystem: payments
tags: [react, discount, crud, payments-view, admin-tools]

# Dependency graph
requires:
  - "11-01 (discountTypes state, onSaveDiscountTypes prop 배선)"
provides:
  - "DiscountTypeManager 컴포넌트 — 할인 타입 CRUD UI (PaymentsView.jsx line 10)"
  - "PaymentsView 5번째 '할인 관리' 탭 (admin/manager 전용)"
  - "DEFAULT_DISCOUNT_TYPES 씨드 상수 export (AdminTools.jsx line 10)"
affects:
  - 11-04-PLAN.md

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "인라인 삭제 확인: deleteConfirmId state + '정말 삭제?' 텍스트 + [삭제][취소] 버튼 (window.confirm 금지)"
    - "DiscountTypeManager: PaymentsView.jsx 상단 별도 함수 컴포넌트 (export default 전 정의)"
    - "씨드 버튼: discountTypes.length === 0 && !adding 조건부 노출"

key-files:
  created: []
  modified:
    - src/components/admin/AdminTools.jsx
    - src/components/payment/PaymentsView.jsx

key-decisions:
  - "DiscountTypeManager는 PaymentsView.jsx 파일 내 상단(export default 전)에 별도 함수 컴포넌트로 정의 — 별도 파일 없이 응집성 유지"
  - "할인 관리 탭은 canManageAll(currentUser.role) 조건 블록 내 탭 버튼에 추가 — teacher 역할에서 탭 버튼 자체 미노출"
  - "씨드 초기화(handleSeedDefaults)는 DiscountTypeManager 컴포넌트 내에서만 수행 — AdminTools 버튼 별도 없이 설계 단순화"

requirements-completed:
  - DIS-03
  - DIS-04

# Metrics
duration: 20min
completed: 2026-06-22
---

# Phase 11 Plan 03: 할인 관리 탭 + DiscountTypeManager Summary

**PaymentsView에 '할인 관리' 5번째 탭과 DiscountTypeManager 컴포넌트를 추가하고, AdminTools에 DEFAULT_DISCOUNT_TYPES 씨드 상수 7개를 export**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-06-22T00:00:00Z
- **Completed:** 2026-06-22T00:10:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `DEFAULT_DISCOUNT_TYPES` (7개) — AdminTools.jsx line 10에 export 추가. id/createdAt 제외, 사용 시 uid()로 생성
- `DiscountTypeManager` 컴포넌트 — PaymentsView.jsx line 10에 정의. 활성/비활성 토글, 수정(인라인), 삭제(인라인 확인: deleteConfirmId), 추가 폼, 씨드 버튼 포함
- PaymentsView 5번째 탭 버튼 (line 637) + 탭 내용 (line 898) 추가 — canManageAll 조건 블록 내 (teacher 미노출)
- `discountTypes = []`, `onSaveDiscountTypes` props PaymentsView 함수 선언부에 추가
- window.confirm 없음 확인 (grep -c == 0)

## Task Commits

1. **Task 1: AdminTools DEFAULT_DISCOUNT_TYPES 상수 export 추가** - `2f094ba` (feat)
2. **Task 2: PaymentsView 5번째 탭 + DiscountTypeManager 컴포넌트** - `15a0a7f` (feat)

## Key Line Numbers

| 위치 | 파일 | 라인 |
|------|------|------|
| DEFAULT_DISCOUNT_TYPES 정의 | src/components/admin/AdminTools.jsx | 10 |
| DiscountTypeManager 컴포넌트 정의 | src/components/payment/PaymentsView.jsx | 10 |
| DEFAULT_DISCOUNT_TYPES import | src/components/payment/PaymentsView.jsx | 8 |
| 5번째 탭 버튼 ("할인 관리") | src/components/payment/PaymentsView.jsx | 637 |
| discounts 탭 내용 렌더링 | src/components/payment/PaymentsView.jsx | 898 |

## Files Created/Modified

- `src/components/admin/AdminTools.jsx` — DEFAULT_DISCOUNT_TYPES 7개 씨드 상수 export 추가 (11행)
- `src/components/payment/PaymentsView.jsx` — DiscountTypeManager 컴포넌트 + 5번째 탭 + props 추가 (+247행)

## Decisions Made

- DiscountTypeManager는 별도 파일 없이 PaymentsView.jsx 상단에 함수 컴포넌트로 정의 — 파일 수 최소화
- 삭제 확인은 deleteConfirmId state로 인라인 구현 (CLAUDE.md: window.confirm 절대 금지 준수)
- 씨드 초기화 버튼은 discountTypes.length === 0 && !adding 조건에서만 표시

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - DiscountTypeManager는 onSaveDiscountTypes prop을 통해 실제 Firestore 데이터와 연결됨 (Plan 01에서 배선 완료).

## Threat Flags

No new security surface introduced. T-11-05 (Elevation of Privilege) 대응: canManageAll 조건으로 탭 버튼 자체 미렌더링 확인. T-11-06 (DoS — 씨드 버튼 중복 클릭): saving 상태로 버튼 disabled 처리 확인.

## Self-Check: PASSED

- `src/components/admin/AdminTools.jsx` — FOUND (DEFAULT_DISCOUNT_TYPES export 확인)
- `src/components/payment/PaymentsView.jsx` — FOUND (DiscountTypeManager, 5번째 탭 확인)
- `2f094ba` — FOUND in git log
- `15a0a7f` — FOUND in git log
- `npm run build` — PASSED (4.88s, 79 modules)
- `window.confirm` — 0 occurrences in PaymentsView.jsx

---
*Phase: 11-discount-system*
*Completed: 2026-06-22*
