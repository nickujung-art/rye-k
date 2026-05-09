---
phase: FS-fee-split
plan: 02
subsystem: ui
tags: [react, fee, lesson, student-management, feePresets]

# Dependency graph
requires:
  - phase: FS-fee-split
    plan: 01
    provides: "calcTotalFee, calcLessonFeeWithFallback in utils.js"
provides:
  - "LessonEditor에 과목별 fee 입력 UI (feePresets 자동 채움)"
  - "StudentFormModal 월 수강료 섹션 → 과목별 breakdown + calcTotalFee 합계로 교체"
  - "저장 시 lessons[].fee 합산값이 monthlyFee에 저장됨 (하위 호환)"
affects: [FS-03, FS-04, PaymentsView]

# Tech tracking
tech-stack:
  added: []
  patterns: ["lessons[].fee 필드 기반 수강료 계산", "feePresets를 LessonEditor까지 prop drilling"]

key-files:
  created: []
  modified:
    - src/components/student/StudentManagement.jsx

key-decisions:
  - "set() 함수에서 monthlyFee 자동계산 제거 — feePresets 기반 fee 적용은 toggleInst에서만 (신규 과목 추가 시)"
  - "handleConfirm에서 calcTotalFee 파생 계산 후 monthlyFee 덮어씀 — 기존 PaymentsView의 s.monthlyFee 참조 보호"
  - "월 수강료 입력 필드 → 읽기 전용 합계 표시로 교체, 수강료 편집은 LessonEditor 내부에서"

patterns-established:
  - "fee 입력: 담당 강사 select 바로 아래, maxWidth 200px 인라인 배치"
  - "합계 표시: 과목별 행 + 대여료(조건부) + dashed 구분선 + 굵은 합계"

requirements-completed:
  - FS-FEE-03

# Metrics
duration: 15min
completed: 2026-05-09
---

# Phase FS-02: LessonEditor fee 입력 UI + StudentFormModal 합계 표시 Summary

**LessonEditor에 과목별 수강료 입력 필드 추가, StudentFormModal 월 수강료 섹션을 lessons[].fee 합산 breakdown으로 전환**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-09T00:00:00Z
- **Completed:** 2026-05-09T00:15:00Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- LessonEditor props에 `feePresets` 추가, toggleInst에서 신규 과목 추가 시 feePresets 기반 fee 자동 설정
- 각 lesson-item의 담당 강사 select 아래에 "수강료 (월)" 입력 필드 추가 (placeholder에 feePresets 값 표시)
- StudentFormModal의 단일 monthlyFee input을 과목별 fee breakdown + 합계 읽기 전용 UI로 교체
- handleConfirm에서 calcTotalFee 파생 계산 후 monthlyFee에 저장 (기존 PaymentsView 하위 호환)

## Task Commits

1. **Task 1+2: LessonEditor fee 입력 + StudentFormModal 합계 표시** - `0c238c4` (feat)

**Plan metadata:** (이 SUMMARY 커밋 포함 예정)

## Files Created/Modified
- `src/components/student/StudentManagement.jsx` - LessonEditor fee 입력 UI 추가, StudentFormModal 합계 표시 교체, calcTotalFee import 및 사용

## Decisions Made
- `set()` 함수의 lessons 처리에서 기존 monthlyFee 자동계산 로직 제거. feePresets 기반 fee 적용은 toggleInst(과목 선택 토글)에서만 담당하여 관심사 분리
- `handleConfirm`에서 저장 직전 `calcTotalFee`로 monthlyFee 파생 계산 — DB에는 합산값 저장하여 PaymentsView 등 기존 `s.monthlyFee` 참조 코드가 그대로 동작
- 월 수강료 입력 필드는 읽기 전용 합계 표시로 대체. 개별 수강료 편집 위치는 LessonEditor 내부로 이동

## Deviations from Plan

None — 플랜에 명시된 대로 정확히 실행됨.

## Issues Encountered

None

## User Setup Required

None - 외부 서비스 설정 불필요.

## Next Phase Readiness
- FS-03(StudentDetailModal 수강료 표시 개선)이 이 변경에 의존하므로 즉시 진행 가능
- `lessons[].fee` 구조가 DB에 저장되기 시작하므로 FS-04(수납 계산 로직 업데이트)도 준비됨

---
*Phase: FS-fee-split*
*Completed: 2026-05-09*
