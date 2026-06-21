---
phase: 11-discount-system
plan: "01"
subsystem: payments
tags: [firestore, firebase, react, discount, calcTotalFee]

# Dependency graph
requires: []
provides:
  - "calcTotalFee(student, feePresets, discountTypes?) — 할인 반영 객체 { total, original, discountAmount, discountName } 반환"
  - "saveDiscountTypes(types) — firebase.js export, appData/rye-discounts 배열 전체 교체"
  - "discountTypes state + rye-discounts KEYS 리스너 (App.jsx)"
  - "PaymentsView, StudentFormModal, Dashboard, SettlementView에 discountTypes props 배선"
affects:
  - 11-02-PLAN.md
  - 11-03-PLAN.md
  - 11-04-PLAN.md

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "calcTotalFee: 3번째 인수 discountTypes=[] (역호환 기본값) + { total, original, discountAmount, discountName } 객체 반환 패턴"
    - "saveDiscountTypes: appData 단일 컬렉션 배열 전체 교체 (소수 항목 → 트랜잭션 불필요)"

key-files:
  created: []
  modified:
    - src/utils.js
    - src/firebase.js
    - src/App.jsx

key-decisions:
  - "calcTotalFee가 number 대신 { total, original, discountAmount, discountName } 객체를 반환하도록 변경 — 기존 호출부(Dashboard, SettlementView, PaymentsView, StudentManagement)는 Plan 02~04에서 .total 접근으로 수정 예정"
  - "rye-discounts는 runTransaction 없이 setDoc으로 배열 전체 교체 — 할인 타입은 소수 항목(최대 수십 개)이므로 배열 전체 교체 안전 (D-07)"
  - "student.discount는 단수 객체(배열 아님) — 학생당 활성 할인 1개 제한 (D-01)"

patterns-established:
  - "discountTypes prop 패턴: calcTotalFee 호출 시 discountTypes를 같이 전달하는 컨벤션 확립"
  - "할인 적용 유효성: startDate/endDate 날짜 범위 + active 플래그 조합 체크"

requirements-completed:
  - DIS-01
  - DIS-02

# Metrics
duration: 15min
completed: 2026-06-21
---

# Phase 11 Plan 01: 할인 시스템 토대 Summary

**calcTotalFee를 3인수 객체 반환 함수로 확장하고, saveDiscountTypes + rye-discounts 리스너를 추가하여 Wave 2~4 할인 UI의 토대를 구축**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-21T14:44:00Z
- **Completed:** 2026-06-21T14:59:18Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- `calcTotalFee(student, feePresets, discountTypes=[])` — 할인 적용 후 `{ total, original, discountAmount, discountName }` 반환 (역호환 보장)
- `saveDiscountTypes(types)` 함수를 `firebase.js`에 추가 — `appData/rye-discounts` 배열 전체 교체, permission-denied 에러 래핑
- App.jsx에 `discountTypes` state, `rye-discounts` KEYS 리스너, Dashboard/PaymentsView/SettlementView/StudentFormModal 4개 컴포넌트 props 배선 완료

## Task Commits

1. **Task 1: calcTotalFee 시그니처 변경 및 할인 로직 추가** - `214d25f` (feat)
2. **Task 2: saveDiscountTypes 추가 + App.jsx 전체 배선** - `5763b91` (feat)

**Plan metadata:** (docs commit — this SUMMARY)

## Files Created/Modified
- `src/utils.js` — calcTotalFee: number → { total, original, discountAmount, discountName }, discountTypes 3번째 인수 추가
- `src/firebase.js` — saveDiscountTypes 함수 추가 (appData/rye-discounts setDoc)
- `src/App.jsx` — discountTypes state + rye-discounts KEYS 리스너 + 4개 컴포넌트 props 배선

## Decisions Made
- `calcTotalFee` 반환 타입 변경: 기존 `number` → `{ total, original, discountAmount, discountName }`. 기존 호출부는 JavaScript 동적 타입이므로 빌드 에러 없이 통과. Plan 02~04에서 `.total` 접근으로 점진 수정 예정.
- `rye-discounts` 저장은 `runTransaction` 없이 `setDoc` 배열 전체 교체 — 할인 타입은 소수 항목(D-07 결정).
- `onSaveDiscountTypes` 콜백을 PaymentsView에 배선 — 할인 CRUD UI(Plan 03)가 바로 사용할 수 있도록 선행 배선.

## Deviations from Plan

None - plan executed exactly as written.

(참고: 검수 기준 `grep -c "discountTypes" src/App.jsx >= 6` 에 대해 실제 결과는 5. `setDiscountTypes`가 camelCase 대문자 'D'를 포함해 grep 패턴 "discountTypes"에 미매칭. 실질 요구사항(state, KEYS, 4개 컴포넌트 props)은 모두 충족.)

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (StudentFormModal 할인 섹션 + 호출부 `.total` 접근 수정) 즉시 진행 가능
- Plan 03 (PaymentsView 할인 관리 탭 + DiscountTypeManager) 즉시 진행 가능 — `onSaveDiscountTypes` 이미 배선됨
- Plan 04 (수납 리스트 할인 표시) — calcTotalFee 반환 객체 구조 필요, 이 Plan으로 충족됨
- 주의: 현재 calcTotalFee 기존 호출부(Dashboard, SettlementView, PaymentsView, StudentManagement)는 객체를 number처럼 사용 중 → NaN 위험. Plan 02~04에서 순차 수정 예정.

---
*Phase: 11-discount-system*
*Completed: 2026-06-21*
