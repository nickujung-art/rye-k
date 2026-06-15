---
phase: 09-schedule-enhancement
plan: "03"
subsystem: ui
tags: [react, timetable, popup, student-assignment, schedule]

requires:
  - phase: 09-02
    provides: onAddStudentToSlot function in App.jsx, IC.pause SVG, Phase 9 CSS classes
  - phase: 09-01
    provides: tt-cell-add, tt-member-add-btn CSS classes in constants.jsx

provides:
  - StudentSearchPopup 컴포넌트 (TimetableView.jsx 내부)
  - TimetableGrid 빈 셀 '+' 버튼 (onAddStudentToSlot prop 조건부 표시)
  - 그룹 슬롯 memberPopup '학생 추가' 버튼 (tt-member-add-btn)
  - ScheduleView → TimetableView onAddStudentToSlot prop 드릴링 완성

affects:
  - 09-04
  - TimetableView
  - ScheduleView

tech-stack:
  added: []
  patterns:
    - "searchPopup state: { teacherId, day, time, instrument, top, left, slotId? } 구조로 셀 배정과 그룹 배정을 단일 팝업에서 분기"
    - "cellInstrument 별도 state로 악기 드롭다운 선택을 팝업 외부에서 제어"

key-files:
  created: []
  modified:
    - src/components/TimetableView.jsx
    - src/components/ScheduleView.jsx

key-decisions:
  - "StudentSearchPopup에서 악기가 null이면 드롭다운 표시, 선택 후 onSelect 클릭 시에만 onAddStudentToSlot 호출"
  - "그룹 슬롯 멤버 추가 시 슬롯의 teacherId/instrument/schedule[0]을 자동 사용 — 사용자 입력 최소화"
  - "강사 기존 레슨 악기가 1종류면 자동 선택, 복수이면 드롭다운으로 수동 선택"

patterns-established:
  - "Pattern: popup state에 slotId 포함 여부로 '빈 셀 배정' vs '그룹 슬롯 멤버 추가' 분기"

requirements-completed:
  - SCH-02
  - SCH-03

duration: 15min
completed: 2026-06-16
---

# Phase 09 Plan 03: TimetableView 학생 배정 UI Summary

**TimetableGrid 빈 셀 '+' 버튼 + StudentSearchPopup (악기 자동선택/드롭다운) + 그룹 슬롯 '학생 추가' 버튼으로 D-02 배정 UI 완성**

## Performance

- **Duration:** 15 min
- **Started:** 2026-06-16T00:00:00Z
- **Completed:** 2026-06-16T00:15:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- `StudentSearchPopup` 컴포넌트 추가 — 이름 검색 + 악기 드롭다운(필요 시) + 학생 클릭으로 onAddStudentToSlot 호출
- TimetableGrid 빈 셀에 `.tt-cell-add` '+' 버튼 추가 — `onAddStudentToSlot && teacherId` 조건부 표시
- 그룹 슬롯 memberPopup에 `.tt-member-add-btn` '학생 추가' 버튼 추가 — 슬롯 정보 자동 사용
- ScheduleView가 `onAddStudentToSlot` prop을 수신해 TimetableView로 전달 완료

## Task Commits

1. **Task 1+2: StudentSearchPopup + '+' 버튼 + '학생 추가' 버튼 전체 구현** - `dc2e55e` (feat)

**Plan metadata:** (pending final commit)

## Files Created/Modified

- `src/components/TimetableView.jsx` - StudentSearchPopup 컴포넌트, handleCellAdd, searchPopup/cellInstrument state, 빈 셀 '+' 버튼, memberPopup '학생 추가' 버튼, onAddStudentToSlot prop 추가
- `src/components/ScheduleView.jsx` - onAddStudentToSlot prop 수신 및 TimetableView 전달

## Decisions Made

- Task 1 과 Task 2는 동일 파일에 연관 state를 공유하므로 단일 커밋으로 처리
- `cellInstrument` 초기값: 강사 기존 레슨의 악기가 1종류면 자동 선택, 복수이면 null(드롭다운 표시)
- 그룹 슬롯 '학생 추가' 버튼: `slot.instrument`를 `setCellInstrument`에 즉시 세팅해 팝업에서 악기 드롭다운 생략

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- D-02 UI 완성. App.jsx `onAddStudentToSlot` 함수(09-02에서 구현)와 TimetableView UI(이번 plan)가 연결 완료.
- 09-04(휴회 관리 뷰)로 진행 가능.

---
*Phase: 09-schedule-enhancement*
*Completed: 2026-06-16*
