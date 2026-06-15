# Phase 9: 스케줄 고도화 (Schedule Enhancement) — Context

**Gathered:** 2026-06-15
**Status:** Ready for planning
**Source:** Discuss-phase (conversation with Nick)

<domain>
## Phase Boundary

레슨 슬롯 자동 생성/연결을 학생 등록·수정 흐름에 통합하고, TimetableView에서 빈 셀 직접 배정 기능을 추가한다. 휴회 학생 관리를 위한 독립 뷰(사이드바 메뉴)를 신설하고, pauseHistory 스키마를 도입해 재휴회 이력을 누적 보존한다.

**이번 Phase에 포함:**
- `addStudentDoc` / `updateStudentDoc` 저장 시 슬롯 자동 생성·연결·detach
- TimetableView 빈 셀 "+" 버튼 → 학생 검색 → 슬롯 자동 생성·연결
- TimetableView 그룹 카드 memberPopup → "학생 추가" 버튼
- 새 `PauseManagementView` 컴포넌트 (사이드바 독립 메뉴)
  - 케어로그 UI 대시보드→뷰 이동
  - 슬롯 이력 표시 (lessons[].slotId 역조회)
  - "복귀 처리" 버튼 (status → active + pauseHistory append)
- `pauseHistory[]` 스키마 추가 (student 문서)
- 강사 역할: 담당 학생 파이어스토어 뷰 접근 가능

**이번 Phase에서 제외:**
- resumeExpectedDate + 복귀 임박 알림 → Phase 10
- AnalyticsView 휴회 분석 (사유별 통계, 평균 기간) → Phase 10
- 수납 자동화 (pausePolicy: skip/reduced/suspend) → 이후 Phase
- 예약 시스템 → RESERVATION-01

</domain>

<decisions>
## Implementation Decisions

### D-01: 슬롯 자동생성 — 저장 즉시 + 완전 일치 매칭

**트리거**: `addStudentDoc` / `updateStudentDoc` 호출 직후 (현재 `runLessonSlotMigration` 로직과 같은 방식)

**매칭 기준**: 강사(`teacherId`) + 악기(`instrument`) + 요일·시간 배열(`schedule`) **완전 일치**만 연결.
일치 슬롯 없으면 신규 슬롯 자동 생성.

**수정 시 detach 규칙**: 학생의 레슨 스케줄이 변경되어 기존 slotId와 불일치하면:
- 기존 slotId를 `null`로 초기화 (그룹 슬롯에서 detach)
- 새 슬롯 생성 또는 다른 완전 일치 슬롯에 연결

**피드백**: 저장 후 `showToast("슬롯 N개 생성됨")` 토스트.

**안전 장치**: 이미 slotId 있고 스케줄 변경 없으면 스킵 (idempotent).

### D-02: TimetableView 배정 — 학생 검색 팝업 + 자동 판단

**빈 셀 "+" 버튼**:
1. 관리자/매니저 뷰 — 강사 미선택 상태에서 "+" 누르면 강사 먼저 선택하라는 토스트 표시 (버튼 disabled)
2. 강사 선택 후(또는 강사 본인 뷰) — 빈 셀 "+" 클릭 → `StudentSearchPopup` (이름 검색 인풋 + 결과 리스트)
3. 학생 선택 → 해당 셀의 `teacherId + 요일 + 시간` 기준으로 완전 일치 슬롯 탐색:
   - 일치 있으면(그룹) → 기존 슬롯에 연결 + 학생 lessons[]에 slotId 기록
   - 없으면 → 신규 슬롯 생성 (개인 또는 그룹 자동 판단: 이미 같은 셀에 1명 이상이면 그룹)
4. `updateStudentDoc` per-op 트랜잭션으로 학생 업데이트

**악기 결정**: 학생이 해당 강사의 레슨을 이미 갖고 있으면 그 악기 사용. 없으면 배정 팝업에서 악기 선택 드롭다운 추가.

**그룹 카드 "인원 추가"**:
- 기존 `memberPopup` (슬롯 카드 클릭 시 표시)에 "학생 추가" 버튼 추가
- 클릭 → `StudentSearchPopup` → 선택 → 기존 슬롯에 연결 + 학생 lessons[] 업데이트

### D-03: 휴회 관리 뷰 (PauseManagementView)

**위치**: 사이드바 독립 메뉴 (강사·admin·manager 모두 접근, 강사는 담당 학생만)
**접근 역할**: 강사(담당), admin/manager(전체)
**대시보드 영향**: "휴회 케어 관리" 섹션 → 뷰 링크 배너로 대체 (케어로그 입력 UI 이동)

**뷰 구성:**
```
[휴회 학생 목록]
  각 카드:
    - 학생 이름, 강사, 악기
    - 휴회 시작일 (pausedAt), 경과일
    - 슬롯 이력: 이전 슬롯 이름 (lessons[].slotId → lessonSlots[id].name)
    - 휴회 사유 (pausedReason)
    - pauseHistory 이전 기록 (accordion)
    - 케어로그 입력 (기존 Dashboard에서 이동)
    - "복귀 처리" 버튼
```

**"복귀 처리" 버튼 동작**:
1. 인라인 확인 UI (window.confirm 금지)
2. `status → "active"` + `pauseHistory` append
3. `updateStudentDoc` per-op 트랜잭션

### D-04: pauseHistory 스키마

**스키마 추가** (`student` 문서):
```js
pauseHistory: [
  {
    pausedAt: number,       // timestamp (기존 pausedAt 스냅샷)
    pausedReason: string,   // 기존 pausedReason 스냅샷
    resumedAt: number,      // 복귀 시점 timestamp (진행중=null)
    durationDays: number,   // (resumedAt - pausedAt) / 86400000 자동 계산
    slotIds: string[],      // 휴회 시점의 lessons[].slotId 스냅샷
  }
]
```

**Append 시점**: status `paused → active` 복귀 시 자동 append (silent, 사용자 별도 입력 없음)
- `resumedAt = Date.now()`
- `durationDays = Math.floor((resumedAt - entry.pausedAt) / 86400000)`
- `slotIds = lessons.map(l => l.slotId).filter(Boolean)`

**재휴회**: 기존 pauseHistory 유지, 새 레코드 append (stack 방식). `resumedAt: null` 항목이 현재 진행 중.

**초기화 규칙**: `pauseHistory`가 없는 기존 학생이 복귀하면 이전 pausedAt/pausedReason에서 entry를 재구성하여 append.

### D-05: slotStatus "closed" (폐강)

- 슬롯 `status: "closed"` → TimetableView에서 완전 제거 (기존 Phase 8 TimetableView 필터에 추가)
- 학생의 `lessons[].slotId`는 DB 보존 (이력 조회용)
- 폐강 UI는 TimetableView 슬롯 카드 또는 AdminTools에서 처리 (Phase 9에서 최소 구현)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 핵심 파일
- `src/App.jsx` — `addStudentDoc`, `updateStudentDoc`, `runLessonSlotMigration` 패턴 (line 538~614). 새 슬롯 자동생성 로직은 여기 삽입.
- `src/firebase.js` — `addLessonSlot`, `updateLessonSlot`, `deleteLessonSlot` CRUD
- `src/components/TimetableView.jsx` — 기존 격자·슬롯 카드·memberPopup 구현. "+" 버튼은 이 파일에 추가.
- `src/components/student/StudentManagement.jsx` — StudentFormModal 저장 흐름 (line 130~148). `onSave` 콜백 → App.jsx의 `updateStudentDoc` 호출 지점 확인 필요.
- `src/components/dashboard/Dashboard.jsx` — 기존 "휴회 케어 관리" 섹션 (line 456~607). Phase 9에서 이 섹션을 링크로 대체.
- `src/components/layout/NavLayout.jsx` — 사이드바 메뉴 구조. 새 "휴회 관리" 항목 추가 위치.
- `CLAUDE.md` — CRITICAL 규칙: saveStudents 금지, window.confirm/alert 금지, per-op 트랜잭션

### 데이터 구조
- `src/utils.js` — 순수 헬퍼 함수 (expandInstitutionsToMembers 포함)
- `src/constants.jsx` — CSS 문자열 패턴, IC(SVG 아이콘), 색상 변수

</canonical_refs>

<specifics>
## Specific Notes

### 슬롯 자동생성 위치
`App.jsx`의 `addStudentDoc` / `updateStudentDoc` 내부가 아닌, 호출 직후 래퍼 함수에서 처리 권장:
```js
const saveStudentWithSlot = async (student) => {
  const saved = await (isNew ? addStudentDoc(student) : updateStudentDoc(student));
  await autoSyncStudentSlots(saved || student); // 슬롯 생성·detach 로직
  return saved;
};
```
→ `autoSyncStudentSlots(student)`: 학생의 lessons[]를 순회하여 완전 일치 슬롯 탐색 or 신규 생성

### TimetableView 검색 팝업 컴포넌트
- `StudentSearchPopup` — 이름 검색 인풋 + `students` 필터링 → 선택 시 `onSelect(student)` 콜백
- 기존 `AlimtalkModal` / 학생 선택 패턴 참고

### 휴회 관리 뷰 nav 아이콘
- IC.pause 또는 유사 아이콘 (기존 IC 객체에 있으면 활용)
- view key: `"pauseManagement"` (App.jsx view 라우팅에 추가)

### 슬롯 detach 판단 기준
```js
function slotMatchesLesson(slot, lesson) {
  if (slot.teacherId !== (lesson.teacherId || studentTeacherId)) return false;
  if (slot.instrument !== lesson.instrument) return false;
  const sched = [...(lesson.schedule || [])].sort((a,b)=>`${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`));
  const slotSched = [...(slot.schedule || [])].sort((a,b)=>`${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`));
  return JSON.stringify(sched) === JSON.stringify(slotSched);
}
```

</specifics>

<deferred>
## Deferred Ideas

- `resumeExpectedDate` + 복귀 임박 알림 + 알림톡 연동 → Phase 10
- AnalyticsView 휴회 분석 (사유별 통계, 평균 기간, 재휴회율) → Phase 10
- 수납 자동화 pausePolicy (skip/reduced/suspend) → 이후 Phase
- 예약 시스템 (포털 수강 신청 + 관리자 승인) → RESERVATION-01

</deferred>

---

*Phase: 09-schedule-enhancement*
*Context gathered: 2026-06-15 via discuss-phase (conversation)*
