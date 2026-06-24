---
phase: 11-discount-system
plan: "04"
subsystem: payments
tags: [react, discount, ui, payments-view, dashboard, settlement]

# Dependency graph
requires:
  - "11-01 (calcTotalFee 객체 반환 + discountTypes App.jsx 배선)"
  - "11-02 (StudentFormModal 할인 섹션 + .total 수정)"
  - "11-03 (PaymentsView discountTypes prop + DiscountTypeManager)"
provides:
  - "autoFeeResult(s): calcTotalFee(s, feePresets, discountTypes) 래퍼 — 할인 적용 결과 객체 반환"
  - "수납 리스트 행: 자동계산 수강료 할인 시 원가 취소선 + 할인가 + 할인명 뱃지 표시"
  - "수납 상세 모달: 할인 브레이크다운 섹션 (원가/할인명/할인가/할인 적용가)"
  - "Dashboard: discountTypes prop + calcTotalFee().total 접근 (NaN 제거)"
  - "SettlementView: calcResult + export default 함수에 discountTypes 추가 + .total 접근"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "autoFeeResult 래퍼 패턴: autoFee(s) = autoFeeResult(s).total — 기존 호출부 무수정, 할인 표시용 객체는 autoFeeResult(s) 사용"
    - "수납 행 할인 표시: !p?.amount && feeResult.discountAmount > 0 조건 — 자동계산 수강료에만 표시"
    - "모달 IIFE 패턴: 조건부 null 반환으로 할인 없는 경우 섹션 미노출"

key-files:
  created: []
  modified:
    - src/components/payment/PaymentsView.jsx
    - src/components/dashboard/Dashboard.jsx
    - src/components/settlement/SettlementView.jsx

key-decisions:
  - "autoFeeResult 래퍼 도입: autoFee(s) 기존 호출부(filterUnpaid, totalDue, unpaidCount, exportCSV, openEdit, UnmatchedPaymentsTab) 전체 무수정 유지, 할인 UI에만 autoFeeResult(s) 사용"
  - "수납 행 할인 표시 조건: !p?.amount(수동 입력 없음) && feeResult.discountAmount > 0 — 관리자 수동 입력 금액에는 할인 표시 안 함"
  - "모달 할인 브레이크다운: 합계 브레이크다운(extraSum > 0) 섹션 앞에 삽입 — 할인 → 기본수강료+추가청구 순서로 논리적 흐름"

requirements-completed:
  - DIS-06
  - DIS-07
  - DIS-08

# Metrics
duration: 15min
completed: 2026-06-22
---

# Phase 11 Plan 04: 수납 리스트 할인 표시 + 전체 호출부 NaN 제거 Summary

**autoFeeResult 래퍼를 도입하여 수납 리스트 행 할인 표시 UI와 모달 할인 브레이크다운 섹션을 추가하고, Dashboard/SettlementView의 calcTotalFee 호출부를 .total 접근으로 업데이트하여 NaN을 완전 제거**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-06-22T00:00:00Z
- **Completed:** 2026-06-22T00:15:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- `autoFeeResult(s)` 래퍼 함수 정의 (PaymentsView.jsx line 350) — `calcTotalFee(s, feePresets, discountTypes)` 호출, 기존 `autoFee(s)` = `autoFeeResult(s).total`로 교체
- 수납 리스트 행: `!p?.amount && feeResult.discountAmount > 0` 조건으로 자동계산 할인 시 원가 취소선(font-size 11 line-through) + 할인가 + 할인명 뱃지(#3B82F6 파란 뱃지) 표시
- 수납 상세 모달: `합계 브레이크다운` 섹션 앞에 `할인 브레이크다운` 섹션 추가 — 원가/할인명+할인금액/할인 적용가 3행 구성 (DIS-07)
- Dashboard `discountTypes = []` prop 추가 + `calcTotalFee(s, feePresets, discountTypes).total` 접근 (DIS-08)
- SettlementView `calcResult` 함수 파라미터 + `SettlementView` export default 함수 props에 `discountTypes = []` 추가, 두 호출부 `.total` 접근, useMemo 의존성 배열 업데이트 (DIS-08)

## Task Commits

1. **Task 1: PaymentsView autoFeeResult + 수납 리스트 할인 표시 (DIS-06)** — `acceb52` (feat)
2. **Task 2: 수납 모달 할인 브레이크다운 + Dashboard/SettlementView .total (DIS-07, DIS-08)** — `0e2caa7` (feat)

## Key Line Numbers

| 위치 | 파일 | 라인 |
|------|------|------|
| `autoFeeResult` 정의 | src/components/payment/PaymentsView.jsx | 350 |
| `autoFee` = `.total` 래퍼 | src/components/payment/PaymentsView.jsx | 351 |
| `feeResult` 변수 (수납 행) | src/components/payment/PaymentsView.jsx | 686 |
| 수납 행 할인 표시 UI | src/components/payment/PaymentsView.jsx | 706-723 |
| 모달 할인 브레이크다운 | src/components/payment/PaymentsView.jsx | 1089-1108 |
| Dashboard props (`discountTypes`) | src/components/dashboard/Dashboard.jsx | 128 |
| Dashboard unpaidAmount `.total` | src/components/dashboard/Dashboard.jsx | 145 |
| calcResult 함수 파라미터 | src/components/settlement/SettlementView.jsx | 28 |
| `studentTotalFee` `.total` | src/components/settlement/SettlementView.jsx | 44 |
| `gTotalFee` `.total` | src/components/settlement/SettlementView.jsx | 79 |
| SettlementView props (`discountTypes`) | src/components/settlement/SettlementView.jsx | 325 |
| calcResult 호출부 | src/components/settlement/SettlementView.jsx | 345 |

## Files Created/Modified

- `src/components/payment/PaymentsView.jsx` — autoFeeResult 래퍼 + 수납 행 할인 표시 + 모달 할인 브레이크다운 (+26행)
- `src/components/dashboard/Dashboard.jsx` — discountTypes prop + calcTotalFee .total (+1행 수정)
- `src/components/settlement/SettlementView.jsx` — calcResult/SettlementView props discountTypes + 두 호출부 .total (+5행 수정)

## Phase 11 전체 완료 상태

| 요구사항 | 플랜 | 상태 |
|----------|------|------|
| DIS-01 (calcTotalFee 객체 반환) | 11-01 | ✓ |
| DIS-02 (saveDiscountTypes + App.jsx 배선) | 11-01 | ✓ |
| DIS-03 (DiscountTypeManager CRUD) | 11-03 | ✓ |
| DIS-04 (DEFAULT_DISCOUNT_TYPES 씨드) | 11-03 | ✓ |
| DIS-05 (StudentFormModal 할인 섹션) | 11-02 | ✓ |
| DIS-06 (수납 리스트 할인 표시) | 11-04 | ✓ |
| DIS-07 (수납 모달 할인 브레이크다운) | 11-04 | ✓ |
| DIS-08 (전체 호출부 NaN 제거) | 11-04 | ✓ |

**Phase 11 할인 시스템 전체 완료 (DIS-01 ~ DIS-08)**

## Decisions Made

- `autoFeeResult` 래퍼 패턴: `autoFee(s)`의 기존 호출부 6곳(filterUnpaid, totalDue, unpaidCount, exportCSV, openEdit, UnmatchedPaymentsTab)을 무수정으로 유지하면서 할인 정보가 필요한 UI 전용으로 `autoFeeResult(s)` 사용
- 수납 행 할인 표시: `!p?.amount` 조건으로 관리자 수동 입력 금액에는 할인 표시 안 함 (T-11-07 Tampering 대응)
- 모달 브레이크다운 삽입 순서: 할인 브레이크다운 → 추가 청구 합계 순서로 논리적 계산 흐름 반영

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — 모든 할인 표시는 Firestore rye-discounts + student.discount 실데이터 기반으로 동작.

## Threat Flags

No new security surface introduced.
- T-11-07 (Tampering — 할인 적용 수납 금액): autoFeeResult는 표시 전용, 실제 저장은 autoFee(s) 기반. !p?.amount 조건으로 수동 입력 금액 보호 확인.
- T-11-08 (Repudiation — 모달 할인 표시): 현재 student.discount 기반 계산. 이력 관리 Phase 추후 대응.

## Self-Check: PASSED

- `src/components/payment/PaymentsView.jsx` — FOUND (autoFeeResult, feeResult, 할인 브레이크다운 확인)
- `src/components/dashboard/Dashboard.jsx` — FOUND (discountTypes prop, .total 접근 확인)
- `src/components/settlement/SettlementView.jsx` — FOUND (discountTypes 6곳, .total 2곳 확인)
- `acceb52` — FOUND in git log
- `0e2caa7` — FOUND in git log
- `npm run build` — PASSED (4.35s)
- 구 패턴 `calcTotalFee(s, feePresets)` in Dashboard.jsx — 0 occurrences (완전 제거)
- 구 패턴 `calcTotalFee(student, feePresets)` in SettlementView.jsx — 0 occurrences (완전 제거)

---
*Phase: 11-discount-system*
*Completed: 2026-06-22*
