---
phase: 09-schedule-enhancement
verified: 2026-06-16T00:00:00Z
status: human_needed
score: 10/10 must-haves verified
overrides_applied: 0
human_verification:
  - test: "학생 저장 후 슬롯 자동생성 E2E (SCH-01)"
    expected: "신규/수정 저장 직후 '슬롯 N개 생성됨' 토스트가 표시되고, rye-lesson-slots 컬렉션에 신규 슬롯 문서가 생성되며 학생 lessons[].slotId가 채워진다"
    why_human: "Firestore 실제 쓰기 결과와 토스트 타이밍은 브라우저 + Firebase Console에서만 확인 가능"
  - test: "TimetableView 빈 셀 '+' 버튼 동작 (SCH-02)"
    expected: "강사 선택 상태에서 빈 셀 '+' 클릭 → StudentSearchPopup 열림. 이름 검색 후 학생 선택 → onAddStudentToSlot 호출 → 슬롯 생성·연결. 강사 미선택 상태에서는 '+' 버튼 자체가 표시되지 않음"
    why_human: "UI 렌더 조건과 팝업 상태 전환을 실제 브라우저에서 확인해야 함"
  - test: "그룹 슬롯 memberPopup '학생 추가' 버튼 (SCH-03)"
    expected: "TimetableView 그룹 카드 '2명 ▾' 클릭 → memberPopup 열림 → '+ 학생 추가' 버튼 표시 → 클릭 시 StudentSearchPopup 열림 → 학생 선택 시 기존 슬롯 악기/요일/시간으로 onAddStudentToSlot 호출"
    why_human: "그룹 슬롯이 실제 DB에 존재해야 팝업 UI가 나타남"
  - test: "PauseManagementView 전체 UX (SCH-04)"
    expected: "사이드바 '휴회 관리' 클릭 → PauseManagementView 렌더. 휴회 학생 카드에 이름·강사·악기·경과일·슬롯 이력 표시. 케어로그 입력 모달, 복귀 처리 인라인 [확인][취소] UI 정상 동작"
    why_human: "실제 휴회 학생 데이터가 있어야 카드가 렌더됨. 모달/인라인 UI 상호작용은 브라우저 확인 필요"
  - test: "pauseHistory 누적 보존 (SCH-05)"
    expected: "'복귀 처리' → [확인] 클릭 후 Firestore Console의 해당 student 문서에 pauseHistory[] 배열에 {pausedAt, pausedReason, resumedAt, durationDays, slotIds} 항목이 append됨. status가 'active', pausedAt/pausedReason이 null로 업데이트됨"
    why_human: "Firestore 실제 쓰기 결과는 Firebase Console에서만 확인 가능"
  - test: "Dashboard pm-link-banner 네비게이션"
    expected: "Dashboard '휴회 학생이 있을 때' 섹션에 '휴회 관리' 파란색 배너가 표시되며 클릭 시 pauseManagement 뷰로 이동"
    why_human: "실제 휴회 학생이 있어야 배너가 렌더됨 (pausedStudents.length > 0 조건)"
---

# Phase 9: Schedule Enhancement Verification Report

**Phase Goal:** 레슨 슬롯 자동 생성/연결을 학생 등록·수정 흐름에 통합하고, TimetableView에서 빈 셀 직접 배정 기능을 추가. 휴회 학생 관리를 위한 독립 뷰(사이드바 메뉴)를 신설하고, pauseHistory 스키마를 도입해 재휴회 이력을 누적 보존한다.
**Verified:** 2026-06-16
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `slotMatchesLesson(slot, lesson, tid)` exported from `utils.js` with schedule sort + JSON compare | VERIFIED | `src/utils.js` line 276: `export function slotMatchesLesson(...)` with `localeCompare` sort and `JSON.stringify` compare |
| 2 | `IC.pause` SVG icon and Phase 9 CSS classes (`.tt-cell-add`, `.pm-card`, `.pm-resume-btn`, `.pm-link-banner`) defined in `constants.jsx` | VERIFIED | `constants.jsx` line 47 (IC.pause), lines 893 (.tt-cell-add), 914 (.pm-card), 951 (.pm-resume-btn), 967 (.pm-link-banner) |
| 3 | `autoSyncStudentSlots` defined in `App.jsx` and called from sForm handler after student save | VERIFIED | `App.jsx` line 620 (definition), line 1551 (sForm call: `await autoSyncStudentSlots(studentWithId).catch(() => 0)`) |
| 4 | Toast "슬롯 N개 생성됨" fires when new slots are created | VERIFIED | `App.jsx` line 1555: `if (newSlots > 0) setTimeout(() => showToast(\`슬롯 ${newSlots}개 생성됨\`), 800)`. Also line 721 (onAddStudentToSlot path) |
| 5 | `onResumeStudent` appends `pauseHistory[]` entry, sets status `active`, clears `pausedAt`/`pausedReason` | VERIFIED | `App.jsx` lines 685–706: `pauseHistory: [...(student.pauseHistory \|\| []), newEntry]`, `status: "active"`, `pausedAt: null`, `pausedReason: null` |
| 6 | TimetableGrid empty cell shows "+" button when teacher selected; `StudentSearchPopup` opens on click and calls `onAddStudentToSlot` | VERIFIED | `TimetableView.jsx` line 357 (button render condition `onAddStudentToSlot && teacherId`), line 58 (`StudentSearchPopup` function), lines 427–452 (popup renders and calls `onAddStudentToSlot`) |
| 7 | Group slot `memberPopup` has "학생 추가" button that opens `StudentSearchPopup` with slot context | VERIFIED | `TimetableView.jsx` line 402 (`tt-member-add-btn`), line 421 (`+ 학생 추가`), lines 408–420 (opens searchPopup with `slotId`) |
| 8 | `PauseManagementView.jsx` created, imported in `App.jsx`, routed under `view === 'pauseManagement'`, accessible to teacher+admin+manager | VERIFIED | File exists at `src/components/student/PauseManagementView.jsx` (line 208: `export default function PauseManagementView`). `App.jsx` line 22 (import), line 1501 (routing with role check) |
| 9 | NavLayout Sidebar, MoreMenu, and BottomNav catch list all include `pauseManagement`. Dashboard shows `pm-link-banner` navigating to pauseManagement | VERIFIED | `NavLayout.jsx` line 18 (BottomNav catch), line 81 (Sidebar), line 159 (MoreMenu). `Dashboard.jsx` line 461: `<div className="pm-link-banner" onClick={() => nav("pauseManagement")}>` |
| 10 | "복귀 처리" uses inline `confirmingResume` state (no `window.confirm`). [확인] calls `onResumeStudent` | VERIFIED | `PauseManagementView.jsx` line 89 (`const [confirmingResume, setConfirmingResume]`), line 177 (`{!confirmingResume ?`). `window.confirm` appears only as a code comment (line 176), not a call. |

**Score: 10/10 truths verified**

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils.js` | `slotMatchesLesson()` exported pure function | VERIFIED | Line 276 — export confirmed, contains sort+JSON compare logic |
| `src/constants.jsx` | `IC.pause` SVG + Phase 9 CSS classes | VERIFIED | IC.pause line 47; `.tt-cell-add` line 893; `.pm-card` line 914; `.pm-resume-btn` line 951; `.pm-link-banner` line 967 |
| `src/App.jsx` | `autoSyncStudentSlots`, `onResumeStudent`, `onAddStudentToSlot`, `pauseManagement` routing | VERIFIED | Lines 620, 685, 709 (functions); line 1355 (topTitle map); line 1501 (routing) |
| `src/components/TimetableView.jsx` | `StudentSearchPopup`, "+" button, "학생 추가" button | VERIFIED | `StudentSearchPopup` line 58; `.tt-cell-add` line 359; `.tt-member-add-btn` line 402 |
| `src/components/ScheduleView.jsx` | `onAddStudentToSlot` prop received and passed to TimetableView | VERIFIED | Line 15 (prop signature), line 230 (passed to TimetableView) |
| `src/components/student/PauseManagementView.jsx` | `PauseManagementView` + `PauseCard` + `CareLogModal` | VERIFIED | File created; `CareLogModal` line ~7; `PauseCard` line ~80; `PauseManagementView` line 208 |
| `src/components/layout/NavLayout.jsx` | `pauseManagement` in Sidebar, MoreMenu, BottomNav catch | VERIFIED | 3 occurrences: lines 18, 81, 159 |
| `src/components/dashboard/Dashboard.jsx` | `pm-link-banner` replaces inline care section | VERIFIED | Line 461 — `pm-link-banner` div with `nav("pauseManagement")` |
| `src/components/admin/AdminTools.jsx` | "폐강" button in LessonSlotsView (D-05) | VERIFIED | Lines 873–876 — `slot.status !== "closed"` conditional with `updateLessonSlot(slot.id, { status: "closed" })` |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `App.jsx` sForm handler | `autoSyncStudentSlots` | `await autoSyncStudentSlots(studentWithId)` | WIRED | Line 1551 — call immediately after addStudentDoc/updateStudentDoc |
| `autoSyncStudentSlots` | `slotMatchesLesson` (utils.js) | `import { ..., slotMatchesLesson } from "./utils.js"` | WIRED | App.jsx line 4 import; used at lines 635, 645, 655 |
| `autoSyncStudentSlots` | `addLessonSlot` (firebase.js) | Direct call, `docRef.id` assigned as `slotId` | WIRED | App.jsx lines 584, 663 — `addLessonSlot` imported line 2 |
| `onResumeStudent` | `updateStudentDoc` | Direct call with merged student object | WIRED | App.jsx line 703 — `await updateStudentDoc(upd)` |
| TimetableView "+" button | `StudentSearchPopup` | `handleCellAdd` sets `searchPopup` state | WIRED | `handleCellAdd` line 176; button onClick line 360; popup renders line 427 |
| `StudentSearchPopup` onSelect | `onAddStudentToSlot` | prop function call | WIRED | Lines 449–451 — `await onAddStudentToSlot(student, ...)` |
| `memberPopup` "학생 추가" | `StudentSearchPopup` | `setSearchPopup({ slotId, ... })` | WIRED | Lines 408–420 — sets searchPopup with slotId |
| `ScheduleView` | `TimetableView onAddStudentToSlot` | prop drilling | WIRED | ScheduleView line 230: `onAddStudentToSlot={onAddStudentToSlot}` |
| NavLayout `pauseManagement` | `App.jsx` view routing | `setView("pauseManagement")` | WIRED | NavLayout nav items call setView; App.jsx line 1501 renders PauseManagementView |
| `PauseCard` "복귀 처리" confirm | `onResumeStudent` | `await onResume(student)` | WIRED | PauseManagementView.jsx — `onClick={async () => { ... await onResume(student); }}` |
| Dashboard `pm-link-banner` | `pauseManagement` view | `onClick={() => nav("pauseManagement")}` | WIRED | Dashboard.jsx line 461 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `PauseManagementView` | `students` (visible, filtered) | App.jsx `visible` state from Firestore `rye-students` listener | Yes — Firestore onSnapshot listener | FLOWING |
| `TimetableView` | `lessonSlots` | App.jsx `lessonSlots` state from `rye-lesson-slots` collection | Yes — Firestore onSnapshot | FLOWING |
| `autoSyncStudentSlots` | `lessonSlots` (for matching) | App.jsx closure over `lessonSlots` React state | Yes — live Firestore data | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: No runnable server test possible without live Firebase. Spot-checks deferred to human verification.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SCH-01 | 09-01, 09-02 | 슬롯 자동생성·연결·detach를 학생 저장 흐름에 통합 | SATISFIED | `slotMatchesLesson` in utils.js; `autoSyncStudentSlots` in App.jsx; sForm integration |
| SCH-02 | 09-03 | TimetableView 빈 셀 "+" 직접 배정 | SATISFIED | `StudentSearchPopup` + `tt-cell-add` button in TimetableView; ScheduleView prop drilling |
| SCH-03 | 09-03 | 그룹 슬롯 카드 학생 추가 버튼 | SATISFIED | `tt-member-add-btn` in memberPopup; searchPopup with slotId context |
| SCH-04 | 09-04 | PauseManagementView 독립 뷰 + 사이드바 메뉴 | SATISFIED | PauseManagementView.jsx created; NavLayout updated; App routing added |
| SCH-05 | 09-02, 09-04 | pauseHistory 스키마 도입 + 복귀 시 누적 append | SATISFIED | `onResumeStudent` appends to `pauseHistory[]`; `confirmingResume` inline UI in PauseCard |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `PauseManagementView.jsx` | 176 | `window.confirm` in comment text | Info | Comment only — `{/* 복귀 처리 — window.confirm 절대 금지, 인라인 confirm UI */}` — not an actual call |

No actual `saveStudents()` calls found. No actual `window.confirm` / `window.alert` calls found. All student mutations use `updateStudentDoc` / `addStudentDoc` per-op transactions.

---

### Human Verification Required

#### 1. 학생 저장 후 슬롯 자동생성 E2E (SCH-01)

**Test:** 학생 등록 또는 수정 모달에서 레슨 정보(강사, 악기, 요일/시간)를 입력하고 저장한다.
**Expected:** 저장 완료 토스트 직후 약 800ms 뒤에 "슬롯 N개 생성됨" 토스트가 표시된다. Firebase Console → `rye-lesson-slots` 컬렉션에 신규 문서가 생성되고, 해당 학생 문서의 `lessons[].slotId`가 채워진다.
**Why human:** Firestore 실제 쓰기 결과와 토스트 타이밍은 브라우저 + Firebase Console에서만 확인 가능.

#### 2. TimetableView 빈 셀 "+" 버튼 동작 (SCH-02)

**Test:** 강사 스케줄 뷰 → TimetableView에서 강사를 선택한 후, 비어있는 시간대 셀을 클릭한다 ("+").
**Expected:** StudentSearchPopup이 열리고 이름 검색이 동작한다. 악기가 자동 결정되지 않는 경우 악기 드롭다운이 표시된다. 학생 선택 후 해당 슬롯이 생성되고 학생이 배정된다. 강사를 선택하지 않은 상태에서는 "+" 버튼 자체가 표시되지 않는다.
**Why human:** UI 렌더 조건(`onAddStudentToSlot && teacherId`)과 팝업 상태 전환을 실제 브라우저에서 확인해야 함.

#### 3. 그룹 슬롯 memberPopup "학생 추가" (SCH-03)

**Test:** TimetableView에서 학생이 2명 이상 배정된 그룹 슬롯 카드의 "N명 ▾" 버튼을 클릭한다.
**Expected:** memberPopup이 열리고 하단에 "+ 학생 추가" 버튼이 표시된다. 버튼 클릭 시 StudentSearchPopup이 열리고 학생 선택 후 기존 슬롯의 악기/강사/시간으로 onAddStudentToSlot이 호출된다.
**Why human:** 그룹 슬롯이 실제 DB에 존재해야 팝업 UI가 나타남.

#### 4. PauseManagementView 전체 UX (SCH-04)

**Test:** 사이드바(데스크톱) 또는 더보기 메뉴(모바일)에서 "휴회 관리"를 클릭한다.
**Expected:** PauseManagementView가 렌더된다. 휴회 학생 카드에 이름·강사·악기·경과일·슬롯 이력(pm-slot-tag)이 표시된다. "케어로그 입력" 클릭 시 CareLogModal이 열린다. "복귀 처리" 클릭 시 window.confirm 없이 인라인 [확인][취소] 버튼이 나타난다.
**Why human:** 실제 휴회 학생 데이터와 모달 상호작용은 브라우저 확인 필요.

#### 5. pauseHistory 누적 append (SCH-05)

**Test:** PauseManagementView에서 휴회 학생의 "복귀 처리" → [확인]을 클릭한다.
**Expected:** Firebase Console의 해당 student 문서에서 `pauseHistory[]` 배열에 `{pausedAt, pausedReason, resumedAt, durationDays, slotIds}` 항목이 append됨. `status: "active"`, `pausedAt: null`, `pausedReason: null`로 업데이트됨. "복귀 처리되었습니다." 토스트 표시.
**Why human:** Firestore 실제 쓰기 결과는 Firebase Console에서만 확인 가능.

#### 6. Dashboard pm-link-banner 네비게이션

**Test:** 휴회 학생이 1명 이상 있는 상태에서 Dashboard를 연다.
**Expected:** "휴회 관리" 파란색 배너(`pm-link-banner`)가 표시되고 "휴회 N명 · 케어로그 · 복귀 처리" 텍스트가 보인다. 클릭 시 pauseManagement 뷰로 이동한다.
**Why human:** `pausedStudents.length > 0` 조건이 실제 DB 데이터에 의존함.

---

### Gaps Summary

코드 레벨에서 모든 must-have가 확인되었다. 빌드는 에러 없이 통과한다 (2.67s). 안전 규칙 위반 없음 (`saveStudents` 호출 0건, `window.confirm`/`window.alert` 실제 호출 0건). 구조적 갭은 없으며 위 6개 항목은 실제 Firebase 데이터 및 브라우저 UI 상호작용이 필요한 UAT 단계 검증이다.

---

_Verified: 2026-06-16_
_Verifier: Claude (gsd-verifier)_
