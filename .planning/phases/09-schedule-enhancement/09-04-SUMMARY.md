---
phase: 09-schedule-enhancement
plan: "04"
subsystem: ui
tags: [react, pause-management, care-log, navigation, admin-tools]

requires:
  - phase: 09-02
    provides: "IC.pause SVG 아이콘, .pm-card/.pm-resume-btn/.pm-link-banner 등 CSS, onResumeStudent/onAddStudentToSlot App.jsx 함수"
  - phase: 09-03
    provides: "TimetableView 배정 UI (이전 Plan)"

provides:
  - "PauseManagementView.jsx 신규 컴포넌트 (CareLogModal + PauseCard + 인라인 복귀 confirm)"
  - "NavLayout Sidebar/MoreMenu/BottomNav에 '휴회 관리' 메뉴 추가"
  - "Dashboard 인라인 케어 섹션 → pm-link-banner 교체"
  - "AdminTools LessonSlotsView 슬롯 목록 + 폐강 버튼 (D-05)"
  - "App.jsx PauseManagementView import + 라우팅 활성화"

affects: [dashboard, student-management, admin-tools, timetable]

tech-stack:
  added: []
  patterns:
    - "PauseCard confirmingResume state로 인라인 confirm UI (window.confirm 금지)"
    - "AdminTools에서 firebase.js 직접 import (updateLessonSlot) — prop drilling 없이"
    - "Dashboard 인라인 케어 섹션 → 전용 뷰 링크 배너로 대체 패턴"

key-files:
  created:
    - src/components/student/PauseManagementView.jsx
  modified:
    - src/App.jsx
    - src/components/layout/NavLayout.jsx
    - src/components/dashboard/Dashboard.jsx
    - src/components/admin/AdminTools.jsx

key-decisions:
  - "AdminTools 폐강 버튼은 App.jsx prop 추가 없이 firebase.js에서 updateLessonSlot 직접 import (접근 방식 B)"
  - "Dashboard 케어 관리 섹션 전체 제거 후 pm-link-banner 단일 배너로 대체 — 케어 기능은 PauseManagementView로 집중"
  - "LessonSlotsView에 슬롯 목록 뷰 신규 추가 (기존에는 통계 카드 + 마이그레이션 버튼만 있었음)"

requirements-completed:
  - SCH-04
  - SCH-05

duration: 5min
completed: 2026-06-16
---

# Phase 09 Plan 04: PauseManagementView + 네비게이션 통합 Summary

**PauseManagementView 신규 생성 (케어로그 + 복귀 처리 인라인 confirm), NavLayout 3곳에 '휴회 관리' 메뉴 추가, Dashboard 케어 섹션을 pm-link-banner로 교체, AdminTools 폐강 버튼 추가**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-16T02:00:06Z
- **Completed:** 2026-06-16T02:04:33Z
- **Tasks:** 2
- **Files modified:** 5 (1 created + 4 modified)

## Accomplishments

- PauseManagementView.jsx 신규 생성: CareLogModal, PauseCard(케어단계 urgent/due/ok, 슬롯이력, pauseHistory accordion, 인라인 복귀 confirm), PauseManagementView(정렬 포함) 모두 구현
- NavLayout Sidebar/MoreMenu/BottomNav 3곳에 '휴회 관리' 메뉴 추가 + App.jsx 라우팅 활성화
- Dashboard 인라인 케어 관리 섹션(~90줄) → pm-link-banner 단일 배너로 교체해 대시보드 간소화
- AdminTools LessonSlotsView에 슬롯 목록 + 폐강 버튼 추가 (firebase.js 직접 import)

## Task Commits

1. **Task 1: PauseManagementView.jsx 신규 생성** - `ded9b43` (feat)
2. **Task 2: NavLayout + Dashboard + AdminTools + App.jsx 통합** - `18ee093` (feat)

**Plan metadata:** (this SUMMARY commit)

## Files Created/Modified

- `src/components/student/PauseManagementView.jsx` - CareLogModal, PauseCard, PauseManagementView 컴포넌트 (신규)
- `src/App.jsx` - PauseManagementView import 주석 해제 + view="pauseManagement" 라우팅 활성화
- `src/components/layout/NavLayout.jsx` - Sidebar/MoreMenu/BottomNav에 pauseManagement 추가
- `src/components/dashboard/Dashboard.jsx` - 휴회 케어 관리 섹션 → pm-link-banner 교체
- `src/components/admin/AdminTools.jsx` - updateLessonSlot import + 슬롯 목록 + 폐강 버튼

## Decisions Made

- AdminTools 폐강 버튼은 App.jsx prop drilling 없이 `import { updateLessonSlot } from "../../firebase.js"` 직접 import (기존 onRunMigration 패턴과 동일)
- Dashboard CareLogModal 함수 정의와 careModal state는 빌드 무결성 유지를 위해 그대로 보존 (사실상 dead code이지만 build 안전)
- LessonSlotsView 슬롯 목록은 새로운 섹션으로 추가 (기존 마이그레이션 버튼 섹션은 유지)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing] LessonSlotsView 슬롯 목록 신규 추가**
- **Found during:** Task 2 (AdminTools 폐강 버튼 추가)
- **Issue:** 기존 LessonSlotsView에는 슬롯 목록을 렌더하는 UI가 없었음 (통계 카드 + 마이그레이션 버튼만). 폐강 버튼을 붙일 슬롯 행이 없어 목록 뷰를 신규 추가
- **Fix:** `lessonSlots.map(slot => ...)` 슬롯 목록 섹션 추가 후 각 행에 폐강 버튼 삽입
- **Files modified:** src/components/admin/AdminTools.jsx
- **Verification:** npm run build 통과, grep -c "closed" AdminTools.jsx → 4
- **Committed in:** 18ee093 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical UI for feature delivery)
**Impact on plan:** 폐강 버튼 연결을 위해 슬롯 목록 추가 필수. 범위 내 추가.

## Issues Encountered

None — 모든 PM CSS 클래스(pm-slot-tag, pm-care-log-row, pm-care-type 등)가 Wave 1에서 이미 constants.jsx에 추가되어 있었음. 빌드 1회 통과.

## Known Stubs

None — PauseManagementView는 students prop에서 실제 paused 학생 데이터를 직접 필터링하여 표시.

## Threat Flags

없음 — T-09-04-01/02/03 모두 기존 접근 제어로 처리됨:
- PauseManagementView: App.jsx의 visible(역할 필터됨) 배열 전달로 강사 격리
- AdminTools 폐강: view === "lessonSlots" && user.role === "admin" 라우팅 조건
- CareLogModal onSave: updateStudentDoc per-op 트랜잭션 (saveStudents 금지 준수)

## Next Phase Readiness

- Phase 9 Plan 05+ (있는 경우) 또는 Phase 10 진행 가능
- PauseManagementView 기능 완료: 케어로그 입력, 복귀 처리, pauseHistory 이전 기록 accordion, 슬롯 이력 표시
- TimetableView의 closed 슬롯 필터링은 기존 Phase 8 TimetableView 필터에서 처리됨 (D-05 완료)
- 미완: resumeExpectedDate + 복귀 임박 알림 → Phase 10 예정

---
*Phase: 09-schedule-enhancement*
*Completed: 2026-06-16*
