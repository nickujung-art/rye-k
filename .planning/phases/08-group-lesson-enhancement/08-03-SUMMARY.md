---
phase: 08-group-lesson-enhancement
plan: "03"
subsystem: schedule-view
tags: [lesson-slots, group-lesson, inline-edit, schedule-view]
dependency_graph:
  requires: [08-01]
  provides: [ScheduleView slotId-based group name, inline slot name editor]
  affects: [src/components/ScheduleView.jsx]
tech_stack:
  added: []
  patterns: [inline-edit with useState, IIFE-free helper function pattern]
key_files:
  created: []
  modified:
    - src/components/ScheduleView.jsx
decisions:
  - "renderGroupName() 헬퍼 함수로 IIFE 패턴 대신 가독성 향상 — 주간/월간 두 렌더에서 재사용"
  - "slotId 없는 그룹(마이그레이션 전)은 '그룹 레슨' fallback — 기존 동작 유지"
  - "canSeeAll && entry.slotId && onUpdateSlot 3중 조건으로 연필 아이콘 노출 — T-08-03-01 mitigate"
metrics:
  duration: "~4 minutes"
  completed: "2026-06-12"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 1
---

# Phase 08 Plan 03: ScheduleView 그룹 이름 표시 + 인라인 편집 Summary

ScheduleView 그룹 레슨 헤더에서 `lessonSlots[slotId].name`을 표시하고, 관리자/매니저가 연필 아이콘으로 그룹 이름을 인라인 편집할 수 있도록 구현했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | slotId 엔트리 전파 + props 수신 | 6da8b5b | src/components/ScheduleView.jsx |
| 2 | 그룹 이름 표시 + 인라인 편집 UI | 6da8b5b | src/components/ScheduleView.jsx |

Note: Task 1 and Task 2 both modify only `ScheduleView.jsx` and were implemented in a single atomic write — committed together under one hash.

## What Was Built

### Task 1: slotId 엔트리 전파 + props 수신
- 함수 시그니처에 `lessonSlots`, `onUpdateSlot` prop 추가
- `editingSlotId`, `editingSlotName` useState 선언 (alimToast 바로 아래)
- non-institution 분기 `scheduleByDay.push(...)` 에 `slotId: lesson.slotId || null` 추가
- institution 분기는 건드리지 않음 — `groupMap`의 `...entry` spread가 slotId 자동 전파

### Task 2: 그룹 이름 표시 + 인라인 편집 UI
- `renderGroupName(entry)` 헬퍼 함수 추가 (line ~154):
  - `lessonSlots.find(s => s.id === entry.slotId)?.name || "그룹 레슨"` 으로 슬롯 이름 조회
  - 비편집 상태: slotName 텍스트 + canSeeAll 조건부 연필(✏) 아이콘
  - 편집 상태: `<input className="inp">` 인라인 전환
  - Enter: `onUpdateSlot(slotId, { name: value.trim() })` 저장 후 닫기
  - Escape: 저장 없이 닫기
  - blur: Enter와 동일하게 저장 후 닫기
  - input `onClick` / 연필 `onClick` 모두 `e.stopPropagation()` — 그룹 접힘/펼침 독립
- 주간 뷰(line ~232)와 월간 상세 뷰(line ~338) 양쪽에서 `renderGroupName(entry)` 호출
- `window.confirm` / `window.alert` 미사용 (CLAUDE.md 준수)

## Deviations from Plan

### Plan-vs-Implementation: Helper Function vs IIFE Pattern

**Found during:** Task 2 implementation

**Issue:** 플랜의 코드 예시는 IIFE `(() => { ... })()` 패턴을 사용하여 그룹 이름 렌더링을 인라인으로 처리했다. 두 렌더 위치(주간/월간)에서 중복 없이 재사용하려면 헬퍼 함수가 더 적합하다.

**Fix:** `renderGroupName(entry)` 헬퍼 함수로 추출 — 동일한 기능을 제공하면서 중복 제거 및 가독성 향상.

**Files modified:** src/components/ScheduleView.jsx

**Impact:** 기능 동일. 두 뷰에서 동일한 편집 상태(editingSlotId)를 공유하므로 주간 뷰에서 편집 시작 후 월간 뷰로 전환해도 상태가 유지된다.

## Threat Mitigations Applied

| Threat | Mitigation | Implemented |
|--------|-----------|-------------|
| T-08-03-01: 연필 아이콘 노출 | `canSeeAll && entry.slotId && onUpdateSlot` 3중 조건 | Yes |
| T-08-03-02: 빈 문자열 제출 | `editingSlotName.trim()` 체크 | Yes |

## Known Stubs

None. `lessonSlots` prop이 빈 배열이면 모든 그룹 헤더가 "그룹 레슨" fallback으로 표시됨 — 이는 마이그레이션 전 정상 동작이며 intentional.

## Threat Flags

None. 새로운 네트워크 엔드포인트 없음. `onUpdateSlot`은 App.jsx에서 전달된 `updateLessonSlot` 함수 — 기존 보안 경계 내.

## Self-Check: PASSED

- [x] `src/components/ScheduleView.jsx` — worktree 경로 수정됨
- [x] Commit `6da8b5b` exists in git log
- [x] `grep "lessonSlots" ScheduleView.jsx` → line 14 (signature), line 159 (usage) 확인
- [x] `grep "slotId: lesson.slotId" ScheduleView.jsx` → line 79 확인
- [x] `grep "editingSlotId\|editingSlotName" ScheduleView.jsx` → 8줄 확인
- [x] `grep "stopPropagation" ScheduleView.jsx` → lines 187, 197 확인
- [x] `"그룹 레슨"` 하드코딩 JSX 텍스트 노드 없음 (fallback 값으로만 존재 — line 160)
- [x] `window.confirm\|window.alert` → 0줄
- [x] `npm run build` passed (no errors)
