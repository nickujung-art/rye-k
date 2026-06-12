---
phase: 08-group-lesson-enhancement
plan: "02"
subsystem: admin, app-state, navigation
tags: [lesson-slots, migration, admin-tools, nav]
dependency_graph:
  requires: [08-01]
  provides: [LessonSlotsView, runLessonSlotMigration, lessonSlots-nav]
  affects: [src/components/admin/AdminTools.jsx, src/App.jsx, src/components/layout/NavLayout.jsx]
tech_stack:
  added: []
  patterns: [inline-confirm-ui (window.confirm 금지), per-op-transaction (updateStudentDoc), idempotent-migration]
key_files:
  created: []
  modified:
    - src/components/admin/AdminTools.jsx
    - src/App.jsx
    - src/components/layout/NavLayout.jsx
decisions:
  - "nav 진입점은 App.jsx가 아닌 NavLayout.jsx에 추가 (Sidebar + MoreMenu + BottomNav active 리스트)"
  - "saveStudents() 호출 없음 — updateStudentDoc per-op 트랜잭션으로 학생당 1회 업데이트"
  - "인라인 confirm state로 실행 전 확인 UI 구현 (window.confirm 절대 금지 준수)"
metrics:
  duration: "~15 minutes"
  completed: "2026-06-12"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 3
---

# Phase 08 Plan 02: AdminTools 레슨 슬롯 마이그레이션 UI Summary

AdminTools.jsx에 LessonSlotsView 컴포넌트를 추가하고, App.jsx에 3단계 idempotent 마이그레이션 함수(runLessonSlotMigration)와 admin 전용 렌더 가드를 구현했다. NavLayout.jsx의 Sidebar·MoreMenu·BottomNav에 nav 진입점도 추가했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | AdminTools.jsx — LessonSlotsView 컴포넌트 | be4c963 | src/components/admin/AdminTools.jsx |
| 2 | App.jsx + NavLayout — runLessonSlotMigration + 뷰 + nav | 35ce192 | src/App.jsx, src/components/layout/NavLayout.jsx |

## What Was Built

### Task 1: LessonSlotsView (AdminTools.jsx)
- `export function LessonSlotsView({ students, teachers, lessonSlots, onRunMigration, showToast })`
- 인라인 confirm state (window.confirm 절대 금지 준수): 버튼 클릭 → 확인/취소 노출 → 재클릭 실행
- 현황 카드: 생성된 슬롯 수, slotId 연결 학생 수, 전체 대상 학생 수
- 마이그레이션 결과 카드 (slotsCreated, studentsUpdated) 인라인 표시
- 오류 발생 시 에러 메시지 인라인 표시 (window.alert 절대 금지 준수)

### Task 2: App.jsx + NavLayout.jsx
- `LessonSlotsView` import 추가 (AdminTools.jsx에서)
- `runLessonSlotMigration` 함수: 3단계 마이그레이션
  - Step 1: 그룹 맵 구성 — `${tid}::${instrument}::${schedFp}` 키로 동일 슬롯 감지, slotId 있는 lesson 스킵(idempotent), isInstitution/withdrawn 제외
  - Step 2: `addLessonSlot` 호출 — 2명 이상 = group, 1명 = individual, 슬롯 이름 자동 생성
  - Step 3: `updateStudentDoc` per-op 트랜잭션 — 학생당 1회, lessons[].slotId 연결
- `{view === "lessonSlots" && user.role === "admin" && <LessonSlotsView .../>}` 렌더 가드
- NavLayout Sidebar: "레슨 슬롯" 항목 (admin 전용, shop 아래)
- NavLayout MoreMenu: "레슨 슬롯" 항목 (admin 전용, shop 아래)
- NavLayout BottomNav: "lessonSlots" active more 탭 리스트에 추가

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] nav 진입점 위치 수정 — App.jsx 아닌 NavLayout.jsx**
- **Found during:** Task 2
- **Issue:** 플랜에서 "App.jsx에서 nav 항목 추가"라고 했으나, nav item 배열은 NavLayout.jsx (Sidebar, MoreMenu, BottomNav)에 있음. App.jsx에는 nav 배열 없음
- **Fix:** NavLayout.jsx의 세 위치에 "lessonSlots" 항목 추가 (Sidebar line ~87, MoreMenu line ~164, BottomNav active 리스트)
- **Files modified:** src/components/layout/NavLayout.jsx
- **Commit:** 35ce192

## Threat Flags

None. LessonSlotsView는 `user.role === "admin"` 가드로 보호됨 (T-08-02-01 mitigate 완료). updateStudentDoc per-op 트랜잭션 사용으로 배열 덮어쓰기 없음 (T-08-02-03 mitigate 완료).

## Known Stubs

None. 마이그레이션 버튼은 실제 Firestore 데이터에 작동하는 완전한 구현.

## Self-Check: PASSED

- [x] `grep "export function LessonSlotsView" src/components/admin/AdminTools.jsx` → 1줄 출력
- [x] `grep "window.confirm\|window.alert" src/components/admin/AdminTools.jsx` → 0줄
- [x] `grep "runLessonSlotMigration" src/App.jsx` → 함수 선언 + prop 전달 2줄
- [x] `grep "LessonSlotsView" src/App.jsx` → import + 렌더 2줄
- [x] `grep "saveStudents" src/App.jsx` → throw 선언 1줄만 (호출 없음)
- [x] `grep "lessonSlots" src/components/layout/NavLayout.jsx` → nav 항목들 존재
- [x] Commits be4c963, 35ce192 생성 확인
- [x] npm run build 통과 (gzip 297.84 kB, 오류 없음)
- [x] No unexpected file deletions
