---
phase: 08-group-lesson-enhancement
verified: 2026-06-13T00:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "마이그레이션 버튼 실행 — 실제 Firestore 기록 생성"
    expected: "LessonSlotsView에서 '레슨 슬롯 초기화 실행' 후 rye-lesson-slots 문서 N개 생성되고 학생 lessons[].slotId 채워짐. 재실행 시 새 슬롯 0개(idempotent)."
    why_human: "Firestore에 실제 데이터가 없는 상태에서 버튼 실행 결과를 코드 분석으로 검증 불가. 실제 앱 실행 필요."
  - test: "TimetableView 시각 렌더링 — 09:00~21:00 격자"
    expected: "ScheduleView '시간표' 탭 클릭 시 월~일 × 09:00~21:00 CSS 격자가 렌더되고, 슬롯이 있는 셀에 이름+인원 카드가 표시된다."
    why_human: "CSS grid 렌더링 및 슬롯 카드 위치(gridColumn/gridRow 계산)의 시각적 정확성은 브라우저에서만 확인 가능."
  - test: "ScheduleView 인라인 그룹 이름 편집 — Enter/blur 동작"
    expected: "그룹 헤더에서 연필 아이콘 클릭 → input 노출 → 이름 변경 → Enter 또는 blur 시 onUpdateSlot 호출되고, 다음 로드 시 새 이름이 표시된다."
    why_human: "DOM 이벤트(Enter key, blur) 및 Firestore 저장 후 onSnapshot 반영은 브라우저 실행 없이 검증 불가."
  - test: "Attendance 그룹 헤더 슬롯 이름 표시"
    expected: "출석 뷰에서 그룹 레슨(2명 이상 동일 시간) 헤더에 slotId에 매핑된 슬롯 이름이 표시된다. 마이그레이션 전에는 기존 'instrument · time · teacher 강사' 형식으로 fallback된다."
    why_human: "실제 slotId가 채워진 학생 데이터가 있어야 슬롯 이름 조회 경로를 검증 가능. 마이그레이션 실행 후 확인 필요."
  - test: "강사 본인 시간표 뷰 — role 분기"
    expected: "강사 계정으로 로그인 후 '시간표' 탭 클릭 시 TeacherSelectGrid 없이 본인 시간표 격자가 즉시 표시된다. 관리자 계정은 강사 카드 그리드를 먼저 보여준다."
    why_human: "role 기반 조건 분기(isTeacher vs canSeeAll)의 실제 렌더 결과는 브라우저 확인 필요."
---

# Phase 8: 그룹 레슨 고도화 Verification Report

**Phase Goal:** 레슨 슬롯이 명시적 엔티티로 관리되고, 강사와 관리자가 시간표 뷰에서 공강/수업 현황을 한눈에 확인하며, 그룹 레슨에 이름을 붙여 출석·스케줄에서 일관되게 표시된다
**Verified:** 2026-06-13
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| SC-1 | AdminTools에서 마이그레이션 버튼 실행 후 모든 학생의 lessons[].slotId가 채워지고 rye-lesson-slots 문서가 생성된다 | VERIFIED | `runLessonSlotMigration` (App.jsx:555-615): Step 1 groupMap 구성, Step 2 `addLessonSlot` 호출, Step 3 `updateStudentDoc` per-op. isInstitution/withdrawn 필터링 및 slotId 이미 있는 lesson 스킵(idempotent) 확인 |
| SC-2 | ScheduleView에서 그룹 레슨 헤더를 클릭해 이름을 편집하면 즉시 Firestore에 저장되고 다음 로드 시 유지된다 | VERIFIED | `renderGroupName(entry)` (ScheduleView.jsx:160-210): Enter/blur 시 `onUpdateSlot(entry.slotId, { name })` 호출, `updateLessonSlot(id, data)` → Firestore `updateDoc` 확인. 런타임 동작은 human_verification 항목 참조. |
| SC-3 | Attendance 그룹 헤더에서 "그룹 레슨" 대신 슬롯 이름이 표시된다 | VERIFIED | Attendance.jsx:590-597: `group.slotId`가 있으면 `(lessonSlots\|\|[]).find(s => s.id === group.slotId)?.name` 조회, slotName 있으면 `<strong>{slotName}</strong>·...` 표시. fallback 경로도 존재. 런타임 동작은 human_verification 항목 참조. |
| SC-4 | 강사가 로그인 시 TimetableView에서 자신의 09:00~21:00 주간 시간표를 격자 형태로 볼 수 있다 | VERIFIED | TimetableView.jsx: `isTeacher = currentUser.role === "teacher"`, `selectedTeacherId = isTeacher ? currentUser.id : null` 고정. `TimetableGrid`: ROWS=25 (09:00~21:00 × 30분), DAYS=7, CSS grid 클래스 8종 constants.jsx:844-851에 정의. |
| SC-5 | 관리자/매니저가 강사 카드를 클릭해 해당 강사의 시간표를 확인할 수 있다 | VERIFIED | TimetableView.jsx: `canSeeAll && !selectedTeacherId` → `TeacherSelectGrid` 렌더, 카드 클릭 시 `setSelectedTeacherId(t.id)` → `TimetableGrid` 렌더. "← 강사 목록" 뒤로가기 버튼 존재. |

**Score:** 5/5 ROADMAP Success Criteria verified

### Plan-level Must-Haves

| # | Plan | Truth | Status | Evidence |
|---|------|-------|--------|---------|
| 1 | 08-01 | App.jsx에 lessonSlots 상태 + rye-lesson-slots onSnapshot 리스너 | VERIFIED | App.jsx:248 `useState([])`, :480-488 `slotsUnsub = onSnapshot(collection(db, "rye-lesson-slots"), ...)` |
| 2 | 08-01 | firebase.js addLessonSlot / updateLessonSlot / deleteLessonSlot export | VERIFIED | firebase.js:96-109: 3개 `export async function` 선언 |
| 3 | 08-01 | ScheduleView lessonSlots + onUpdateSlot prop 수신 | VERIFIED | ScheduleView.jsx:15 시그니처, App.jsx:1362 prop 전달 확인 |
| 4 | 08-01 | AttendanceView lessonSlots prop 수신 | VERIFIED | Attendance.jsx:369 시그니처, App.jsx:1275 prop 전달 확인 |
| 5 | 08-02 | LessonSlotsView 인라인 confirm UI (window.confirm 금지) | VERIFIED | AdminTools.jsx:791 `export function LessonSlotsView`, confirm state 사용. `window.confirm/alert` 0줄. |
| 6 | 08-02 | 마이그레이션 idempotent — slotId 있는 lesson 스킵 | VERIFIED | App.jsx:562 `if (l.slotId) return;` |
| 7 | 08-02 | 기관 가상회원 제외 | VERIFIED | App.jsx:556 `filter(s => !s.isInstitution && s.status !== "withdrawn")` |
| 8 | 08-02 | 결과 카운트 UI 표시 | VERIFIED | LessonSlotsView result state, `return { slotsCreated, studentsUpdated }` |
| 9 | 08-03 | slotId 없으면 "그룹 레슨" fallback | VERIFIED | ScheduleView.jsx:162 `slot?.name \|\| "그룹 레슨"` |
| 10 | 08-03 | 그룹 헤더 클릭과 편집 독립 동작 | VERIFIED | ScheduleView.jsx: `e.stopPropagation()` in both edit pencil and input onClick |
| 11 | 08-04 | detectLessonGroups 반환값에 slotId 포함 | VERIFIED | Attendance.jsx:359 `slotId: l.slotId \|\| null` |
| 12 | 08-05 | TimetableView.jsx default export | VERIFIED | TimetableView.jsx:113 `export default function TimetableView` |
| 13 | 08-06 | 08-RESERVATION-SPEC.md 존재 + rye-reservations 스키마 + 흐름 + 정원 체크 | VERIFIED | 파일 존재. 스키마(9개 필드), 섹션 3(포털 흐름), 섹션 4(관리자 흐름), 섹션 5(`getSlotOccupancy` + `canReserve`) 확인 |

**Score:** 13/13 must-haves verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/firebase.js` | rye-lesson-slots CRUD 3종 | VERIFIED | addLessonSlot, updateLessonSlot, deleteLessonSlot — export async function. deleteDoc import 추가됨. |
| `src/App.jsx` | lessonSlots 상태 + 리스너 + prop 배선 | VERIFIED | useState:248, slotsUnsub:480, ScheduleView prop:1362, AttendanceView prop:1275, LessonSlotsView render:1373, runLessonSlotMigration:555 |
| `src/components/admin/AdminTools.jsx` | LessonSlotsView export | VERIFIED | line 791 — export function LessonSlotsView |
| `src/components/ScheduleView.jsx` | timetable 탭 + TimetableView import + slotId 엔트리 + renderGroupName | VERIFIED | import:6, timetable branch:215, slotId push:81, renderGroupName:160, timetable buttons:247 & 432 |
| `src/components/TimetableView.jsx` | 신규 파일 — default export | VERIFIED | 파일 존재. TimetableGrid, TeacherSelectGrid, TimetableView default export |
| `src/components/attendance/Attendance.jsx` | lessonSlots prop + slotId in detectLessonGroups + 헤더 표시 | VERIFIED | 시그니처:369, slotId 초기화:359, 헤더 렌더:590-597 |
| `src/constants.jsx` | 8개 timetable CSS 클래스 | VERIFIED | lines 844-851: .timetable-wrap, .timetable-grid, .timetable-header, .timetable-time, .timetable-cell, .timetable-slot, .timetable-slot-name, .timetable-slot-sub |
| `src/components/layout/NavLayout.jsx` | lessonSlots nav 진입점 (admin 전용) | VERIFIED | Sidebar:88, MoreMenu:166, BottomNav active list:18 |
| `.planning/phases/08-group-lesson-enhancement/08-RESERVATION-SPEC.md` | 예약 시스템 설계 문서 | VERIFIED | 파일 존재. 7개 섹션 완성. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| App.jsx | Firestore `rye-lesson-slots` | `onSnapshot(collection(db, "rye-lesson-slots"), ...)` | WIRED | App.jsx:480-488 리스너 확인 |
| App.jsx | ScheduleView | `lessonSlots={lessonSlots} onUpdateSlot={...updateLessonSlot}` | WIRED | App.jsx:1362 prop 전달 확인 |
| App.jsx | AttendanceView | `lessonSlots={lessonSlots}` | WIRED | App.jsx:1275 prop 전달 확인 |
| LessonSlotsView | runLessonSlotMigration | `onRunMigration` prop | WIRED | AdminTools.jsx:808 `onRunMigration()` 호출, App.jsx:1378 전달 |
| runLessonSlotMigration | Firestore `rye-lesson-slots` | `addLessonSlot(...)` | WIRED | App.jsx:583 `addLessonSlot({...})` — docRef.id 취득 |
| runLessonSlotMigration | Firestore `rye-students` | `updateStudentDoc(updatedStudent)` | WIRED | App.jsx:610 — per-op transaction. saveStudents() 호출 없음 (throw만 존재:536) |
| ScheduleView entry.slotId | lessonSlots array | `(lessonSlots\|\|[]).find(s => s.id === entry.slotId)?.name` | WIRED | ScheduleView.jsx:161 |
| ScheduleView inline edit | Firestore rye-lesson-slots | `onUpdateSlot(entry.slotId, { name })` | WIRED | ScheduleView.jsx:178, 186 |
| TimetableView | lessonSlots prop | `slot.schedule[].day + .time → grid position` | WIRED | TimetableView.jsx:30-48 |
| TimetableView | students prop | `students.filter(s => s.lessons.some(l => l.slotId === slot.id)).length` | WIRED | TimetableView.jsx:42 |
| Attendance detectLessonGroups | slotId | `slotId: l.slotId \|\| null` in grouped[key] init | WIRED | Attendance.jsx:359 |
| Attendance group header | lessonSlots | `(lessonSlots\|\|[]).find(s => s.id === group.slotId)?.name` | WIRED | Attendance.jsx:590 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| TimetableView.jsx | `lessonSlots` | App.jsx onSnapshot → rye-lesson-slots | YES (real Firestore collection listener) | FLOWING |
| TimetableView.jsx | `students` | App.jsx state → rye-students listener | YES (existing listener) | FLOWING |
| ScheduleView.jsx `renderGroupName` | `lessonSlots` | App.jsx prop | YES | FLOWING |
| Attendance.jsx group header | `lessonSlots` | App.jsx prop | YES | FLOWING |
| LessonSlotsView | `lessonSlots` | App.jsx prop | YES (empty array until migration runs) | FLOWING — empty until migration, intentional |

### Behavioral Spot-Checks

Step 7b: SKIPPED (React SPA — no runnable entry points without dev server)

### Requirements Coverage

| Requirement | Description | Plan | Status | Evidence |
|-------------|-------------|------|--------|---------|
| GRP-01 | rye-lesson-slots 컬렉션 신설 + App.jsx 리스너 | 08-01 | SATISFIED | firebase.js CRUD 3종 + App.jsx listener + prop 배선 |
| GRP-02 | 학생 일괄 마이그레이션 AdminTools 버튼 | 08-02 | SATISFIED | LessonSlotsView + runLessonSlotMigration (idempotent) |
| GRP-03 | ScheduleView 그룹 이름 표시 + 인라인 편집 | 08-03 | SATISFIED | renderGroupName + editingSlotId state + onUpdateSlot 호출 |
| GRP-04 | Attendance 그룹 헤더 슬롯 이름 연동 | 08-04 | SATISFIED | detectLessonGroups slotId 포함 + 헤더 렌더 |
| GRP-05 | TimetableView 09:00~21:00 격자 컴포넌트 | 08-05 | SATISFIED | TimetableView.jsx 신규 파일 + CSS 8종 |
| GRP-06 | 강사 본인 시간표 뷰 | 08-05 | SATISFIED | isTeacher 분기 → selectedTeacherId = currentUser.id 고정 |
| GRP-07 | 관리자/매니저 시간표 뷰 (강사 카드 선택) | 08-05 | SATISFIED | canSeeAll → TeacherSelectGrid → TimetableGrid |
| GRP-08 | 예약 시스템 설계 문서 (구현 없음) | 08-06 | SATISFIED | 08-RESERVATION-SPEC.md 7개 섹션 완성 |

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|----------|--------|
| (없음) | window.confirm/alert 검색: 0줄 | — | CLAUDE.md 규칙 준수 |
| (없음) | saveStudents() 호출: 0줄 (throw 선언 1줄만) | — | CLAUDE.md 규칙 준수 |

No blockers found. All modified files pass anti-pattern checks.

### Human Verification Required

#### 1. 마이그레이션 버튼 실행 — Firestore 기록 생성 확인

**Test:** 관리자로 로그인 → '레슨 슬롯' nav 진입 → '레슨 슬롯 초기화 실행' 버튼 클릭 → 확인 클릭
**Expected:** rye-lesson-slots 컬렉션에 문서 N개 생성, 학생 lessons[].slotId 채워짐. 결과 카드에 "슬롯 N개 생성 · 학생 M명 업데이트" 표시. 재실행 시 "슬롯 0개 생성 · 학생 0명 업데이트" (idempotent).
**Why human:** Firestore 실제 쓰기 결과 및 idempotent 동작은 앱 실행 없이 검증 불가.

#### 2. TimetableView 격자 렌더링 시각 검증

**Test:** ScheduleView → '시간표' 탭 클릭 (관리자는 강사 카드 선택 후)
**Expected:** 09:00~21:00 × 월~일 격자가 올바르게 표시되고, 슬롯이 있는 셀에 컬러 카드(슬롯 이름+인원 수)가 정확한 위치에 배치됨. 모바일에서 가로 스크롤 동작.
**Why human:** CSS grid 렌더링, 슬롯 카드 그리드 위치 계산(dayIdx/rowIdx → gridColumn/gridRow) 정확성은 브라우저 시각 확인 필요.

#### 3. ScheduleView 인라인 그룹 이름 편집 UX

**Test:** 마이그레이션 실행 후 ScheduleView 주간 뷰 → 그룹 헤더 옆 연필(✏) 아이콘 클릭 → 이름 변경 → Enter 또는 다른 곳 클릭
**Expected:** 연필 클릭 시 input 전환, Enter/blur 시 이름 저장, 페이지 새로고침 후 새 이름 표시. 그룹 헤더 클릭(접힘/펼침)은 연필 클릭과 독립적으로 동작.
**Why human:** DOM 이벤트 (Enter key, blur, stopPropagation) 및 Firestore onSnapshot 반영은 브라우저 실행 필요.

#### 4. Attendance 슬롯 이름 표시

**Test:** 마이그레이션 실행 후 출석 뷰 → 그룹 레슨(2명 이상 동일 시간) 날짜 선택
**Expected:** 그룹 헤더에 "레슨 슬롯 이름 · 악기 · 시간 · 강사 강사 · N명" 형식으로 표시 (슬롯 이름이 bold). 마이그레이션 전에는 "악기 · 시간 · 강사 강사 · N명" fallback 표시.
**Why human:** 실제 slotId 채워진 데이터 필요. 마이그레이션 실행 후 확인 가능.

#### 5. 강사 본인 시간표 vs 관리자 강사 선택 분기

**Test:** 강사 계정으로 로그인 → ScheduleView → '시간표' 탭. 이후 관리자 계정으로 같은 과정.
**Expected:** 강사: TeacherSelectGrid 없이 본인 시간표 즉시 표시. 관리자: 강사 카드 목록 먼저 표시 → 카드 클릭 → 해당 강사 격자 → '← 강사 목록' 뒤로가기.
**Why human:** role 기반 조건 분기 및 useState 흐름은 브라우저 실행 필요.

### Gaps Summary

No gaps found. All 13 must-haves are VERIFIED and all 8 requirement IDs (GRP-01 through GRP-08) are satisfied.

The `human_needed` status reflects 5 browser-only behavioral checks that cannot be verified programmatically. All code paths, wiring, and data flows are confirmed present and substantive.

---

_Verified: 2026-06-13_
_Verifier: Claude (gsd-verifier)_
