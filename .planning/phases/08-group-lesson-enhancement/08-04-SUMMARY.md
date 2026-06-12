---
phase: 08-group-lesson-enhancement
plan: "04"
subsystem: attendance
tags: [lesson-slots, group-header, attendance, slot-name]
dependency_graph:
  requires: [08-01]
  provides: [Attendance 그룹 헤더 슬롯 이름 표시]
  affects: [src/components/attendance/Attendance.jsx]
tech_stack:
  added: []
  patterns: [prop-pass-through, optional-chaining-fallback]
key_files:
  created: []
  modified:
    - src/components/attendance/Attendance.jsx
decisions:
  - "detectLessonGroups는 lessonSlots를 인자로 받지 않음 — slotId만 그룹 객체에 포함하고 AttendanceView 내부에서 lessonSlots prop으로 조회"
  - "슬롯 이름 없으면 기존 instrument·time·teacher 형식 유지 (fallback)"
metrics:
  duration: "~5 minutes"
  completed: "2026-06-12"
  tasks_completed: 1
  tasks_total: 1
  files_changed: 1
---

# Phase 08 Plan 04: Attendance 그룹 헤더 슬롯 이름 표시 Summary

Attendance.jsx의 detectLessonGroups가 slotId를 포함하도록 확장하고, 그룹 헤더에서 lessonSlots prop으로 슬롯 이름을 조회해 표시한다. slotId 없거나 매칭 실패 시 기존 instrument·time·teacher 형식으로 fallback.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | detectLessonGroups slotId + AttendanceView 시그니처 + 그룹 헤더 슬롯 이름 | 45c3e56 | src/components/attendance/Attendance.jsx |

## What Was Built

### Task 1: Attendance.jsx — 3종 변경

**변경 1 (line 359):** `detectLessonGroups` 내 `grouped[key]` 초기화에 `slotId: l.slotId || null` 추가.
- 같은 그룹 학생들은 동일 슬롯이므로 첫 번째 lesson의 slotId로 충분.

**변경 2 (line 369):** `AttendanceView` 시그니처 끝에 `lessonSlots` prop 추가 (기본값 없음 — App.jsx에서 항상 배열 전달됨, 08-01 완료).

**변경 3 (lines 589-598):** 그룹 헤더 span 내용 교체.
- `group.slotId`가 있으면 `(lessonSlots || []).find(s => s.id === group.slotId)?.name`으로 조회.
- 슬롯 이름 있으면: `<strong>{slotName}</strong> · instrument · time · teacher 강사 · N명`
- 슬롯 이름 없으면(fallback): `instrument · time · teacher 강사 · N명` (기존 형식 유지)

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None. T-08-04-01 — 슬롯 이름은 PII 아님(악기+반 명칭). 강사/관리자 로그인 상태에서만 Attendance 접근 가능. Accept.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `grep "slotId: l.slotId" src/components/attendance/Attendance.jsx` — line 359 출력 확인
- [x] `grep "lessonSlots" src/components/attendance/Attendance.jsx` — line 369(시그니처) + line 590(렌더) 2줄 출력 확인
- [x] `grep "slot?.name" src/components/attendance/Attendance.jsx` — line 591 출력 확인
- [x] Commit 45c3e56 존재 확인
- [x] `npm run build` 통과 (4.94s, 경고는 pre-existing chunk size 경고)
- [x] window.confirm / window.alert 없음
- [x] 편집 UI 없음 (읽기 전용 표시만)
