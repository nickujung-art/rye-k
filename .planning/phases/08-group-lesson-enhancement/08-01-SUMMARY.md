---
phase: 08-group-lesson-enhancement
plan: "01"
subsystem: firebase, app-state
tags: [lesson-slots, firestore, realtime-listener, prop-wiring]
dependency_graph:
  requires: []
  provides: [rye-lesson-slots CRUD, lessonSlots state, ScheduleView prop, AttendanceView prop]
  affects: [src/firebase.js, src/App.jsx]
tech_stack:
  added: []
  patterns: [independent-collection-listener (rye-instant-charges 패턴), per-op CRUD (addDoc/updateDoc/deleteDoc)]
key_files:
  created: []
  modified:
    - src/firebase.js
    - src/App.jsx
decisions:
  - "rye-lesson-slots는 appData 밖 독립 컬렉션 — addDoc/updateDoc/deleteDoc (runTransaction 불필요)"
  - "slotsUnsub 리스너는 chargesUnsub 바로 아래 동일 패턴으로 배치"
  - "ScheduleView에 onUpdateSlot = async (id, data) => updateLessonSlot(id, data) 인라인 핸들러 전달"
metrics:
  duration: "~8 minutes"
  completed: "2026-06-12"
  tasks_completed: 2
  tasks_total: 2
  files_changed: 2
---

# Phase 08 Plan 01: rye-lesson-slots 인프라 구축 Summary

firebase.js에 rye-lesson-slots 독립 컬렉션 CRUD 3종을 추가하고, App.jsx에 lessonSlots 실시간 리스너와 prop 배선을 완료했다.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | firebase.js — CRUD 3종 추가 | df38037 | src/firebase.js |
| 2 | App.jsx — 상태 + 리스너 + prop 전달 | 7246cc6 | src/App.jsx |

## What Was Built

### Task 1: firebase.js
- `deleteDoc`을 `firebase/firestore` import에 추가
- `addLessonSlot(data)`: `addDoc(collection(db, "rye-lesson-slots"), {...data, createdAt})` — docRef 반환
- `updateLessonSlot(id, data)`: `updateDoc(doc(db, "rye-lesson-slots", id), {...data, updatedAt})`
- `deleteLessonSlot(id)`: `deleteDoc(doc(db, "rye-lesson-slots", id))`
- 모두 `export async function`으로 직접 선언 — named import 가능

### Task 2: App.jsx
- firebase import 줄에 세 함수 추가
- `const [lessonSlots, setLessonSlots] = useState([])` 선언 (shopItems 바로 아래)
- `slotsUnsub` onSnapshot 리스너 추가 (chargesUnsub 아래, 동일 패턴)
- `AttendanceView`에 `lessonSlots={lessonSlots}` prop 추가
- `ScheduleView`에 `lessonSlots={lessonSlots}` + `onUpdateSlot={async (id, data) => updateLessonSlot(id, data)}` prop 추가

## Deviations from Plan

None - plan executed exactly as written.

## Threat Flags

None. rye-lesson-slots 데이터는 PII 없음 (강사 ID/악기/시간표). T-08-01-02 (Tampering on addLessonSlot) — Wave 2 AdminTools admin role check로 미이그레이션 예정, 이 plan은 함수 export만.

## Known Stubs

None. 이 plan은 인프라 배선만 — 실제 UI에서 lessonSlots를 소비하는 코드는 Wave 2 (08-03, 08-04)에서 구현.

## Self-Check: PASSED

- [x] src/firebase.js modified — `addLessonSlot`, `updateLessonSlot`, `deleteLessonSlot` exports confirmed
- [x] src/App.jsx modified — `lessonSlots` useState, `slotsUnsub` listener, ScheduleView/AttendanceView props confirmed
- [x] Commits df38037, 7246cc6 exist in git log
- [x] `npm run build` passed (no errors)
- [x] No unexpected file deletions
