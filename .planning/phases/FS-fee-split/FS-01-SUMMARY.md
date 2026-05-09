---
phase: FS-fee-split
plan: 01
subsystem: payments
tags: [utils, fee-calculation, lessons, fallback]

# Dependency graph
requires: []
provides:
  - calcLessonFeeWithFallback: lesson 단건 fee 결정 (lesson.fee > preset > fallback)
  - calcTotalFee: student 전체 월 수강료 합산 (레슨 합산 + 대여료, 구 데이터 호환)
affects: [FS-02, FS-03, FS-04, payment, dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "lesson.fee > feePresets[instrument] > monthlyFee/lessonCount 우선순위 폴백 패턴"
    - "lessons 없을 때 monthlyFee 직접 반환 (구 데이터 하위 호환)"

key-files:
  created: []
  modified:
    - src/utils.js

key-decisions:
  - "lesson.fee 양수 체크로 0이 '미설정'과 구분되도록 처리"
  - "fallbackPerLesson = monthlyFee / lessons.length (Math.round) — 구 데이터에서 균등 분배"
  - "isInstitution 가상회원도 lessons[0].fee 없으면 monthlyFee로 폴백, 별도 분기 불필요"

patterns-established:
  - "calcTotalFee(student, feePresets): 모든 컴포넌트가 s.monthlyFee 직접 참조 대신 이 함수를 통해 금액 계산"

requirements-completed: [FS-FEE-01, FS-FEE-02]

# Metrics
duration: 1min
completed: 2026-05-09
---

# Phase FS-fee-split Plan 01: Fee Calculation Helpers Summary

**utils.js에 calcLessonFeeWithFallback + calcTotalFee 추가 — lesson.fee > feePresets > monthlyFee 폴백으로 레슨별 수강료 계산 기반 마련**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-09T13:48:46Z
- **Completed:** 2026-05-09T13:49:35Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `calcLessonFeeWithFallback(lesson, feePresets, fallbackPerLesson)` export — lesson 단건 fee 결정 헬퍼
- `calcTotalFee(student, feePresets)` export — 전체 월 수강료 계산 (레슨 합산 + 대여료)
- 구 데이터(lessons 없는 학생)에서 monthlyFee 직접 반환으로 하위 호환 보장
- npm run build 통과

## Task Commits

각 태스크가 원자적으로 커밋됨:

1. **Task 1: utils.js에 calcLessonFeeWithFallback, calcTotalFee 함수 추가** - `b047d93` (feat)

## Files Created/Modified
- `src/utils.js` - calcLessonFeeWithFallback, calcTotalFee 함수 추가 (파일 끝에 27줄 추가)

## Decisions Made
- `lesson.fee != null && lesson.fee > 0` 조건: 0이 "미설정"과 구분되도록 양수 체크
- `Math.round((student.monthlyFee || 0) / lessons.length)` — 구 데이터 균등 분배 fallback
- 기관 가상회원(isInstitution=true)은 별도 분기 없이 기존 폴백 로직으로 자연스럽게 처리됨

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FS-02: LessonEditor UI에서 lesson.fee 입력 필드 추가 준비 완료
- FS-03: PaymentsView에서 calcTotalFee import로 autoFee() 대체 준비 완료
- FS-04: Dashboard 미납 금액 계산 교체 준비 완료

## Self-Check: PASSED
- src/utils.js: FOUND
- FS-01-SUMMARY.md: FOUND
- Commit b047d93: FOUND
- export function calcTotalFee: 1 occurrence
- export function calcLessonFeeWithFallback: 1 occurrence

---
*Phase: FS-fee-split*
*Completed: 2026-05-09*
