---
phase: 11-discount-system
plan: "02"
subsystem: ui
tags: [react, discount, student-form, calcTotalFee, canManageAll]

# Dependency graph
requires:
  - phase: 11-01
    provides: "calcTotalFee(student, feePresets, discountTypes) — { total, original, discountAmount, discountName } 객체 반환"
provides:
  - "StudentFormModal에 discountTypes prop 추가 + 할인 배정 섹션 UI (드롭다운, 시작일, 종료일, 과목 선택, 메모)"
  - "calcTotalFee 두 호출부 .total/.original 접근으로 수정 (DIS-08 NaN 방지)"
  - "수강료 합계 표시: 할인 적용 시 원가 취소선 + 할인가 + 할인명 뱃지"
affects:
  - 11-03-PLAN.md
  - 11-04-PLAN.md

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "StudentFormModal 할인 섹션: canManageAll 조건부 렌더링 — admin/manager만 노출 (T-11-03)"
    - "monthlyFee 저장 = 원가(original) 기준; 할인은 student.discount 별도 관리"
    - "calcTotalFee 3인수 패턴: calcTotalFee(form, feePresets, discountTypes) — 모든 호출부 통일"

key-files:
  created: []
  modified:
    - src/components/student/StudentManagement.jsx

key-decisions:
  - "monthlyFee에는 원가(할인 전) 저장 — 할인 제거 시 원가가 사라지는 문제 방지. discounted total은 student.discount + calcTotalFee로 런타임 계산"
  - "할인 섹션 위치: 악기 대여 섹션 아래, 수강 상태 섹션 위 — 수강료 관련 UI를 연속 배치"

patterns-established:
  - "할인 선택 onChange: discountId 없으면 null, 있으면 기존 startDate/notes 보존하며 새 객체 생성"
  - "다과목(lessons.length > 1) 조건부 과목 선택 드롭다운 — 단일 과목 학생에게 불필요한 UI 숨김"

requirements-completed:
  - DIS-05
  - DIS-08

# Metrics
duration: 8min
completed: 2026-06-22
---

# Phase 11 Plan 02: StudentFormModal 할인 섹션 + calcTotalFee 호출부 수정 Summary

**StudentFormModal에 할인 배정 섹션 UI(드롭다운+날짜+과목+메모)를 추가하고 calcTotalFee 두 호출부를 객체 반환에 맞게 업데이트하여 NaN 방지 및 취소선+뱃지 할인 표시 구현**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-06-21T15:00:00Z
- **Completed:** 2026-06-21T15:07:22Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- `StudentFormModal` props에 `discountTypes = []` 추가, form 초기 상태에 `discount: null` 필드 추가
- 할인 배정 섹션 UI 삽입: 활성 할인 타입 드롭다운(할인 없음 첫 항목), 시작일/종료일 날짜 입력, 다과목 시 과목 선택 드롭다운, 메모 입력 — `canManageAll` 조건부 렌더링
- `handleConfirm` 내 `totalFee` 추출: `calcTotalFee(form, feePresets)` → `{ original: totalFee } = calcTotalFee(form, feePresets, discountTypes)` (원가 기준 monthlyFee 저장)
- 수강료 합계 표시: `discountAmount > 0`일 때 원가 취소선 + 할인가 + 할인명 뱃지(파란 pill)

## Task Commits

1. **Task 1: StudentFormModal 할인 배정 섹션 UI 추가 + discountTypes prop** - `863e471` (feat)
2. **Task 2: calcTotalFee 호출부 .total/.original 접근으로 수정 (DIS-08)** - `cf4f60b` (fix)

**Plan metadata:** (docs commit — this SUMMARY)

## Files Created/Modified
- `src/components/student/StudentManagement.jsx` — discountTypes prop, discount form state, 할인 섹션 UI, calcTotalFee 두 호출부 업데이트

## Decisions Made
- `monthlyFee`에는 원가(할인 전) 저장 — 할인 제거 시 원가가 사라지는 문제 방지. 할인 적용 금액은 런타임에 `calcTotalFee` 결과로 계산
- 할인 섹션 위치: 악기 대여 섹션 아래, 수강 상태 섹션 위 (수강료 관련 UI 연속 배치)
- `lessonInstrument` 과목 선택은 `form.lessons.length > 1` 조건부 — 단일 과목 학생에게는 노출 안 함

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 03 (PaymentsView 할인 관리 탭 + DiscountTypeManager) 즉시 진행 가능
- Plan 04 (수납 리스트 할인 표시) — calcTotalFee 반환 객체 호출부 이 Plan으로 수정 완료
- 주의: `form.discount`는 `onSave({ ...form })` 스프레드를 통해 `updateStudentDoc`으로 전달됨 (App.jsx 배선은 Plan 01에서 완료)

---
*Phase: 11-discount-system*
*Completed: 2026-06-22*
