---
phase: 08-group-lesson-enhancement
plan: "05"
subsystem: schedule-timetable
tags: [timetable, schedule, css-grid, teacher-view, admin-view]
dependency_graph:
  requires: [08-01, 08-03]
  provides: [TimetableView]
  affects: [ScheduleView]
tech_stack:
  added: []
  patterns: [CSS grid (8열×26행), role-gated teacher select, lessonSlots prop]
key_files:
  created:
    - src/components/TimetableView.jsx
  modified:
    - src/components/ScheduleView.jsx
    - src/constants.jsx
decisions:
  - TimetableGrid renders ALL slots for the selected teacher across the week in a single CSS grid — no per-day rendering loop
  - TeacherSelectGrid uses card-based layout with borderLeft teacher color for quick visual identification
  - timetable viewMode branch inserted before week branch so it short-circuits before any week/month computation
metrics:
  duration: "~10 minutes"
  completed: "2026-06-12T14:12:00Z"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 08 Plan 05: TimetableView Summary

## One-liner

09:00~21:00 × 월~일 CSS 격자 시간표 뷰 — 강사 본인 자동 표시, 관리자/매니저는 강사 카드 선택 후 확인.

## What Was Built

### Task 1: TimetableView.jsx 신규 생성 (commit 1f30a32)

- `src/components/TimetableView.jsx` 신규 파일 생성 (162줄)
- `TimetableGrid`: ROWS=25 (09:00~21:00, 30분 단위), DAYS=7개 요일, CSS grid 격자
  - lessonSlots 필터링: teacherId 일치 + status !== "closed"
  - 슬롯 카드: 강사 컬러 배경(26 hex = ~15% opacity) + 좌측 border + 이름 + 인원 수
  - 범위 밖 슬롯(09:00 미만 / 21:00 이상) 스킵
- `TeacherSelectGrid`: 관리자/매니저 전용, 강사 카드 그리드 (borderLeft = 강사 컬러)
- `TimetableView` (default export): role 기반 분기
  - 강사(teacher): selectedTeacherId = currentUser.id 고정
  - 관리자/매니저(canSeeAll): null → TeacherSelectGrid → 클릭 → TimetableGrid
  - "← 강사 목록" 뒤로가기 버튼 (canSeeAll + 선택된 강사 있을 때)
- window.confirm/alert 없음

### Task 2: ScheduleView.jsx + constants.jsx 업데이트 (commit cb349d5)

**constants.jsx** — 8개 CSS 클래스 추가:
- `.timetable-wrap` — 가로 스크롤 컨테이너
- `.timetable-grid` — CSS grid (52px + repeat(7,minmax(72px,1fr)), 36px + repeat(25,48px))
- `.timetable-header` — 요일 헤더 셀 (sticky top)
- `.timetable-time` — 시간 라벨 셀
- `.timetable-cell` — 일반 데이터 셀 (position:relative)
- `.timetable-slot` — 슬롯 카드 (position:absolute inset:2px)
- `.timetable-slot-name` — 슬롯 이름 (11px bold, ellipsis)
- `.timetable-slot-sub` — 인원 수 (10px, opacity .65)

**ScheduleView.jsx**:
- `import TimetableView from "./TimetableView.jsx"` 추가
- `viewMode === "timetable"` 분기 추가 (week 분기 앞에 삽입)
  - 툴바: 주간/월간/시간표(active) 버튼
  - `<TimetableView lessonSlots students teachers currentUser />` 렌더
- 주간 툴바와 월간 툴바 각각에 "시간표" 탭 버튼 추가

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. TimetableView는 lessonSlots prop에서 실제 데이터를 직접 읽으며, 08-01(rye-lesson-slots 인프라)에서 wiring이 완료된 상태.

## Self-Check

### Artifacts verification

- `src/components/TimetableView.jsx` exists: FOUND
- commit 1f30a32 exists: FOUND
- commit cb349d5 exists: FOUND
- `grep "export default function TimetableView"` → 1줄 FOUND
- `grep ".timetable-grid" src/constants.jsx` → 1줄 FOUND
- `grep "import TimetableView" src/components/ScheduleView.jsx` → 1줄 FOUND
- `npm run build` → PASSED (77 modules, built in 2.95s)
- window.confirm/alert → 0줄 FOUND

## Self-Check: PASSED
