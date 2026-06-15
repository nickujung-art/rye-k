# Phase 9: 스케줄 고도화 (Schedule Enhancement) — Research

**Researched:** 2026-06-15
**Domain:** React 18 컴포넌트 트리 수정 + Firebase Firestore per-op 트랜잭션 + 레슨 슬롯 자동 생성 로직
**Confidence:** HIGH (모든 핵심 파일 직접 확인, 코드베이스 기반 검증)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01: 슬롯 자동생성 — 저장 즉시 + 완전 일치 매칭**
- 트리거: `addStudentDoc` / `updateStudentDoc` 호출 직후 래퍼 함수에서 처리
- 매칭: teacherId + instrument + schedule 배열 완전 일치만 연결
- 수정 시 detach: 기존 slotId와 불일치 → slotId null + 새 슬롯 생성/연결
- 피드백: `showToast("슬롯 N개 생성됨")` 토스트
- 안전 장치: slotId 있고 스케줄 변경 없으면 스킵 (idempotent)

**D-02: TimetableView 배정 — 학생 검색 팝업 + 자동 판단**
- 빈 셀 "+" 버튼: 강사 미선택 상태면 토스트(버튼 disabled), 강사 선택 후 StudentSearchPopup
- 학생 선택 → 완전 일치 슬롯 탐색 → 있으면 기존 연결, 없으면 신규 생성
- 그룹 자동 판단: 같은 셀에 이미 1명 이상이면 그룹
- 그룹 카드 memberPopup에 "학생 추가" 버튼 추가 → 기존 슬롯에 연결
- `updateStudentDoc` per-op 트랜잭션으로 학생 업데이트

**D-03: 휴회 관리 뷰 (PauseManagementView)**
- 사이드바 독립 메뉴 (강사·admin·manager 모두 접근, 강사는 담당만)
- 대시보드 "휴회 케어 관리" 섹션 → 뷰 링크 배너로 대체
- 카드 구성: 이름/강사/악기 + 휴회 시작일 + 경과일 + 슬롯 이력 + 케어로그 + "복귀 처리" 버튼
- 복귀 처리: 인라인 확인 UI (window.confirm 절대 금지)

**D-04: pauseHistory 스키마**
```js
pauseHistory: [
  { pausedAt: number, pausedReason: string, resumedAt: number, durationDays: number, slotIds: string[] }
]
```
- Append 시점: paused→active 복귀 시 자동
- 기존 `pauseHistory` 없는 학생: 기존 `pausedAt/pausedReason`에서 entry 재구성

**D-05: slotStatus "closed" (폐강)**
- `status: "closed"` → TimetableView 자동 제거 (이미 필터 구현됨)
- 학생 `lessons[].slotId`는 DB 보존 (이력 조회용)
- 폐강 UI: TimetableView 슬롯 카드 또는 AdminTools에서 최소 구현

### Claude's Discretion
- 없음 (모든 결정 잠금)

### Deferred Ideas (OUT OF SCOPE)
- `resumeExpectedDate` + 복귀 임박 알림 + 알림톡 연동 → Phase 10
- AnalyticsView 휴회 분석 (사유별 통계, 평균 기간, 재휴회율) → Phase 10
- 수납 자동화 pausePolicy (skip/reduced/suspend) → 이후 Phase
- 예약 시스템 → RESERVATION-01
</user_constraints>

---

## Summary

Phase 9는 3개의 독립적인 기능 영역(슬롯 자동 생성, TimetableView 배정 UI, 휴회 관리 뷰)으로 구성된다. 코드베이스를 직접 확인한 결과, 핵심 패턴이 이미 `runLessonSlotMigration` (App.jsx line 555~614)에 구현되어 있어 `autoSyncStudentSlots` 함수는 이를 변형하여 재사용할 수 있다. TimetableView는 `status !== "closed"` 필터가 이미 있고(line 79), `memberPopup` 구조가 확인되어 "학생 추가" 버튼 삽입 위치가 명확하다. Dashboard의 "휴회 케어 관리" 섹션(line 456~534)은 `CareLogModal` + 정렬 로직을 포함하며 이 전체를 `PauseManagementView`로 이전한다.

가장 주의할 점은 `addStudentDoc` / `updateStudentDoc` 모두 반환값이 없다는 것 — CONTEXT.md 래퍼 패턴(`saved || student`)에서 `student`는 App.jsx에서 이미 `{ ...data, id: uid() }`로 구성되므로 래퍼 인자가 slotId를 넣을 student 객체다. `addLessonSlot`이 반환하는 `DocumentReference.id`가 slotId 확보 수단이며 React 상태 갱신을 기다릴 필요가 없다.

**Primary recommendation:** `autoSyncStudentSlots`는 유틸 순수 함수가 아닌 App.jsx 내 클로저 함수로 구현 (lessonSlots state와 addLessonSlot CRUD 둘 다 접근 필요)

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 슬롯 자동 생성·detach | App.jsx (클로저) | firebase.js (CRUD) | lessonSlots state + addLessonSlot 모두 필요 |
| TimetableView 배정 UI | TimetableView.jsx | App.jsx / ScheduleView.jsx | UI는 TimetableGrid, 저장 콜백은 App.jsx 클로저 |
| StudentSearchPopup | TimetableView.jsx | — | TimetableGrid 내부 팝업 패턴 |
| PauseManagementView | 새 파일 (student 또는 pause 폴더) | App.jsx | 뷰 라우팅은 App.jsx |
| pauseHistory append | App.jsx (onStatusChange) | PauseManagementView | 복귀 처리는 두 경로 모두 App.jsx 함수 호출 |
| Dashboard 링크 배너 | Dashboard.jsx | — | 섹션 내 교체 |
| IC.pause 아이콘 | constants.jsx | — | 모든 아이콘은 IC 객체에 |
| CSS 신규 클래스 | constants.jsx (CSS 문자열) | — | 인라인 CSS 패턴 준수 |

---

## Standard Stack

### Core (기존 스택 그대로 사용)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React 18 | 18.x (기존) | UI 컴포넌트 | 프로젝트 표준 |
| Firebase Firestore v10 | 10.x (기존) | DB CRUD | `runTransaction`, `addDoc`, `updateDoc` |
| Vite 5 | 5.x (기존) | 빌드 | 기존 설정 그대로 |

신규 npm 패키지 설치 없음 — 모두 기존 코드 패턴 재사용.

---

## Architecture Patterns

### 시스템 아키텍처 다이어그램

```
[학생 저장 (sForm 모달)]
        │
        ▼
[App.jsx: isNew 분기]
   ┌────┴────┐
   │ NEW     │ EDIT
   ▼         ▼
addStudentDoc  updateStudentDoc
   └────┬────┘
        ▼
autoSyncStudentSlots(student, lessonSlots)
        │
        ├── 각 lesson 순회
        │      ├── slotId 있고 스케줄 불일치 → slotId = null (detach)
        │      ├── slotId 없음 → lessonSlots에서 완전 일치 탐색
        │      │      ├── 일치 슬롯 있음 → 기존 slotId 할당
        │      │      └── 없음 → addLessonSlot() → docRef.id → slotId 할당
        │      └── slotId 있고 일치 → 스킵 (idempotent)
        │
        ▼
updateStudentDoc(student with filled slotIds)
        │
        ▼
showToast("슬롯 N개 생성됨")


[TimetableGrid 빈 셀 "+" 클릭]
        │
        ▼
[StudentSearchPopup 렌더]
        │ (학생 선택)
        ▼
onAddStudentToSlot(student, teacherId, day, time)
        │  (App.jsx 콜백)
        ▼
autoSyncStudentSlots → updateStudentDoc


[PauseManagementView 복귀 처리]
        │ (인라인 확인 UI 표시)
        ▼
onResumeStudent(student)  ← App.jsx 콜백
        │
        ├── buildPauseHistoryEntry(student, Date.now())
        │      (pausedAt, pausedReason, resumedAt, durationDays, slotIds)
        ▼
updateStudentDoc({
  ...student,
  status: "active",
  pausedAt: null,
  pausedReason: null,
  pauseHistory: [...(student.pauseHistory||[]), entry]
})
```

### 권장 파일 구조

```
src/
├── App.jsx                    — autoSyncStudentSlots 클로저 추가, view 라우팅 추가
├── constants.jsx              — IC.pause SVG 추가, PauseManagementView CSS 추가
├── utils.js                   — slotMatchesLesson() 순수 함수 추가
└── components/
    ├── student/
    │   ├── StudentManagement.jsx    — 변경 없음 (onSave 콜백은 App.jsx 담당)
    │   └── PauseManagementView.jsx  — 신규 (CareLogModal 포함 or import)
    ├── TimetableView.jsx            — StudentSearchPopup 추가, "+" 버튼 추가,
    │                                  memberPopup "학생 추가" 버튼 추가
    ├── dashboard/Dashboard.jsx      — "휴회 케어 관리" 섹션 → 링크 배너 교체
    └── layout/NavLayout.jsx         — "pauseManagement" 메뉴 추가 (Sidebar, MoreMenu, BottomNav)
```

### Pattern 1: autoSyncStudentSlots (App.jsx 클로저)

```js
// [VERIFIED: src/App.jsx line 555~614 runLessonSlotMigration 패턴 기반]
// App.jsx 내 클로저 함수 (lessonSlots state, addLessonSlot, updateStudentDoc에 접근)
const autoSyncStudentSlots = async (student) => {
  const lessons = student.lessons || [];
  if (lessons.length === 0) return 0;

  let newSlotCount = 0;
  const updatedLessons = [...lessons];

  for (let i = 0; i < lessons.length; i++) {
    const lesson = lessons[i];
    const tid = lesson.teacherId || student.teacherId;
    const schedFp = JSON.stringify(
      [...(lesson.schedule || [])].sort((a, b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`))
    );

    // 기존 slotId 검증 (detach 로직)
    if (lesson.slotId) {
      const existingSlot = lessonSlots.find(s => s.id === lesson.slotId);
      if (existingSlot && slotMatchesLesson(existingSlot, lesson, tid)) {
        continue; // idempotent — 변경 없음
      }
      // 불일치 또는 슬롯 없음 → detach
      updatedLessons[i] = { ...lesson, slotId: null };
    }

    // 완전 일치 슬롯 탐색
    const matched = lessonSlots.find(s =>
      s.status !== "closed" && slotMatchesLesson(s, { ...lesson, slotId: null }, tid)
    );

    if (matched) {
      updatedLessons[i] = { ...updatedLessons[i], slotId: matched.id };
    } else {
      // 신규 슬롯 생성
      const memberCount = students.filter(s =>
        s.id !== student.id && (s.lessons || []).some(l => slotMatchesLesson({ teacherId: tid, instrument: lesson.instrument, schedule: lesson.schedule }, l, l.teacherId || s.teacherId))
      ).length;
      const isGroup = memberCount >= 1;
      const docRef = await addLessonSlot({
        teacherId: tid,
        instrument: lesson.instrument,
        type: isGroup ? "group" : "individual",
        name: isGroup ? `${lesson.instrument} 그룹` : student.name,
        schedule: lesson.schedule || [],
        status: "active",
        notes: "",
      });
      updatedLessons[i] = { ...updatedLessons[i], slotId: docRef.id };
      newSlotCount++;
    }
  }

  const finalStudent = { ...student, lessons: updatedLessons };
  await updateStudentDoc(finalStudent);
  return newSlotCount;
};
```

### Pattern 2: slotMatchesLesson 순수 함수 (utils.js)

```js
// [VERIFIED: src/App.jsx CONTEXT.md D-specifics 기반 — utils.js에 추가]
export function slotMatchesLesson(slot, lesson, studentTeacherId) {
  const tid = lesson.teacherId || studentTeacherId;
  if (slot.teacherId !== tid) return false;
  if (slot.instrument !== lesson.instrument) return false;
  const sched = [...(lesson.schedule || [])].sort((a,b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`));
  const slotSched = [...(slot.schedule || [])].sort((a,b) => `${a.day}${a.time}`.localeCompare(`${b.day}${b.time}`));
  return JSON.stringify(sched) === JSON.stringify(slotSched);
}
```

### Pattern 3: sForm 저장 핸들러 교체 (App.jsx)

```js
// [VERIFIED: src/App.jsx line 1414~1438 현재 패턴]
// 현재 (line 1430~1434):
if (data.id) {
  await updateStudentDoc({ ...data, studentCode: ... });
} else {
  await addStudentDoc({ ...data, id: uid(), studentCode: ... });
}

// Phase 9 교체:
const studentWithId = data.id
  ? { ...data, studentCode: data.studentCode || students.find(s => s.id === data.id)?.studentCode }
  : { ...data, id: uid(), studentCode: generateStudentCode() };

if (studentWithId.id && students.some(s => s.id === studentWithId.id)) {
  await updateStudentDoc(studentWithId);
} else {
  await addStudentDoc(studentWithId);
}
const created = await autoSyncStudentSlots(studentWithId).catch(() => 0);
if (created > 0) showToast(`슬롯 ${created}개 생성됨`);
```

### Pattern 4: pauseHistory append (App.jsx onStatusChange)

```js
// [VERIFIED: src/App.jsx line 1439 현재 onStatusChange 패턴 기반]
// 현재 paused→active:
const upd = { ...selected, status: newStatus, pausedAt: null, pausedReason: null };

// Phase 9 교체 (paused→active 시):
const resumedAt = Date.now();
const newEntry = {
  pausedAt: selected.pausedAt || null,
  pausedReason: selected.pausedReason || "",
  resumedAt,
  durationDays: selected.pausedAt ? Math.floor((resumedAt - selected.pausedAt) / 86400000) : null,
  slotIds: (selected.lessons || []).map(l => l.slotId).filter(Boolean),
};
const upd = {
  ...selected,
  status: "active",
  pausedAt: null,
  pausedReason: null,
  pauseHistory: [...(selected.pauseHistory || []), newEntry],
};
```

### Pattern 5: TimetableView props 확장

```js
// [VERIFIED: src/components/TimetableView.jsx line 384 기존 props]
// 현재: { lessonSlots, students, teachers, currentUser, onUpdateSlot }
// Phase 9 추가:
export default function TimetableView({
  lessonSlots, students, teachers, currentUser, onUpdateSlot,
  onAddStudentToSlot,  // (student, teacherId, day, time, instrument?) => Promise<void>
}) { ... }

// TimetableGrid에도 전달:
<TimetableGrid
  ...
  onAddStudentToSlot={onAddStudentToSlot}
/>
```

### Pattern 6: PauseManagementView 기본 구조

```jsx
// [VERIFIED: src/components/dashboard/Dashboard.jsx line 456~534 이전 UI 기반]
export default function PauseManagementView({
  students,        // 전체 students (필터는 컴포넌트 내부에서)
  teachers,
  currentUser,
  lessonSlots,     // 슬롯 이력 표시용
  onUpdateStudent, // updateStudentDoc 래퍼
  onResumeStudent, // pauseHistory append + status → active
  showToast,
}) { ... }
```

### Pattern 7: NavLayout 확장

```js
// [VERIFIED: src/components/layout/NavLayout.jsx line 71~95 Sidebar nav 배열]
// Sidebar nav 배열에 추가 (schedule 다음, 또는 students 앞):
...(canManageAll(user.role) || user.role === "teacher"
  ? [{ id: "pauseManagement", label: "휴회 관리", icon: "⏸" }]
  : []),

// BottomNav (line 18) — "more" 탭 catch 목록에 추가:
// "pauseManagement" → [...existingList..., "pauseManagement"]

// MoreMenu (line 153) — items 배열에 추가:
...(canManageAll(user.role) || user.role === "teacher"
  ? [{ id: "pauseManagement", label: "휴회 관리", desc: "휴회 학생 케어·복귀 처리", icon: IC.pause }]
  : []),
```

### Anti-Patterns to Avoid

- **window.confirm 사용**: "복귀 처리" 버튼 → 절대 `window.confirm` 금지. 인라인 `[확인] [취소]` 토글 UI 구현
- **React state 기반 lessonSlots 탐색 타이밍 이슈**: `addLessonSlot` 호출 후 React state에 반영되기 전에 같은 슬롯을 다시 생성하는 경우 방지 — docRef.id를 즉시 사용하고 state 반영 대기 불필요
- **saveStudents 호출**: 어떤 경우에도 `saveStudents([...])` 호출 금지. 항상 `updateStudentDoc` per-op
- **전체 lessons 배열 교체**: `autoSyncStudentSlots`는 student 전체를 `updateStudentDoc`로 저장 (lessons만 교체 X)
- **CareLogModal 중복**: Dashboard에서 섹션 교체 시 CareLogModal을 Dashboard에서 삭제하면 안 됨 — PauseManagementView로 이전 후 Dashboard는 import하거나 링크 배너만 남김

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Firestore 배열 업데이트 | 직접 배열 조작 후 setDoc | `updateStudentDoc` (runTransaction) | 77명 손실 사례 |
| 학생 검색 UI | 커스텀 검색 엔진 | 기존 `.filter(s => s.name.includes(q))` 패턴 | 이미 App.jsx에서 사용 중 |
| 슬롯 일치 판단 | 인라인 비교 로직 | `slotMatchesLesson()` 유틸 함수 | 재사용성 + 테스트 용이 |
| 날짜 계산 | 수동 ms 계산 | `Math.floor((Date.now() - pausedAt) / 86400000)` (이미 Dashboard에서 사용) | 검증된 패턴 |

---

## Critical Data Flows

### 1. addStudentDoc 현재 구현 (VERIFIED: App.jsx line 538~544)

```js
const addStudentDoc = async (student) => {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(_studentsRef);
    const cur = snap.exists() ? (snap.data().value || []) : [];
    tx.set(_studentsRef, { value: [...cur, student], updatedAt: Date.now() });
  });
  setStudents(prev => [...prev, student]);
};
```
- **반환값 없음 (void)** — `autoSyncStudentSlots`에 전달할 student는 호출 전에 이미 `{ ...data, id: uid() }`로 구성
- 트랜잭션 완료 후 React state 동기 업데이트

### 2. updateStudentDoc 현재 구현 (VERIFIED: App.jsx line 546~554)

```js
const updateStudentDoc = async (student) => {
  if (!student?.id) throw new Error("updateStudentDoc: id 없음");
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(_studentsRef);
    const cur = snap.exists() ? (snap.data().value || []) : [];
    tx.set(_studentsRef, { value: cur.map(s => s.id === student.id ? student : s), updatedAt: Date.now() });
  });
  setStudents(prev => prev.map(s => s.id === student.id ? student : s));
};
```
- **student.id 필수** — Phase 9에서 `autoSyncStudentSlots` 호출 시 id가 채워진 student를 전달해야 함

### 3. addLessonSlot 반환값 (VERIFIED: src/firebase.js line 96~100)

```js
export async function addLessonSlot(data) {
  return addDoc(collection(db, "rye-lesson-slots"), { ...data, createdAt: Date.now() });
}
// 반환: DocumentReference — docRef.id = 새 슬롯의 Firestore 문서 ID
```
- `docRef.id`가 slotId → React state 갱신 불필요 (리스너가 비동기로 추가함)

### 4. TimetableGrid 현재 슬롯 필터 (VERIFIED: TimetableView.jsx line 79)

```js
(lessonSlots || [])
  .filter(s => s.teacherId === teacherId && s.status !== "closed")
```
- D-05 폐강은 이미 구현됨 — `updateLessonSlot(id, { status: "closed" })` 호출만 추가하면 됨

### 5. TimetableGrid memberPopup 현재 구조 (VERIFIED: TimetableView.jsx line 119~126, 301~320)

```js
// openMembers(e, slot) — 그룹 카드 "N명 ▾" 클릭 시 호출
const openMembers = (e, slot) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const members = (students || []).filter(s =>
    s.status === "active" && !s.isInstitution &&
    (s.lessons || []).some(l => l.slotId === slot.id)
  );
  setMemberPopup({ slotId: slot.id, members, top: rect.bottom + 6, left: safePopupLeft(rect.left) });
};

// 팝업 렌더 (line 301~320):
{memberPopup && !studentDetail && (
  <>
    <div style={{...overlay...}} onClick={() => setMemberPopup(null)} />
    <div className="tt-member-popup" style={{ top: memberPopup.top, left: memberPopup.left }}>
      <div className="tt-member-popup-title">수강생</div>
      {memberPopup.members.map(s => <div className="tt-member-row tt-member-row--link" ...>{s.name}</div>)}
      {/* Phase 9: 여기에 "학생 추가" 버튼 삽입 */}
    </div>
  </>
)}
```

"학생 추가" 버튼 삽입 위치: `memberPopup.members.map(...)` 블록 다음, 팝업 내부 하단.

### 6. 빈 셀 현재 렌더 (VERIFIED: TimetableView.jsx line 283)

```js
if (!cell) return <div key={`c-${li}-${di}`} className={cellCls} />;
```
Phase 9: `canSeeAll && onAddStudentToSlot && selectedTeacherId` 조건 하에 "+" 버튼 추가:
```js
if (!cell) return (
  <div key={`c-${li}-${di}`} className={cellCls}>
    {canSeeAll && onAddStudentToSlot && (
      <button className="tt-cell-add" onClick={() => handleCellAdd(di, row.rowIdx)}>+</button>
    )}
  </div>
);
```

### 7. App.jsx view 라우팅 현재 패턴 (VERIFIED: App.jsx line 1247, 1263~1393)

```js
// topTitle 오브젝트 (line 1247) — 신규 추가:
const topTitle = { ..., pauseManagement: "휴회 관리" }[view] || "RYE-K";

// 뷰 렌더 추가 위치: settlement 뷰 다음 (line 1382~1392):
{view === "pauseManagement" && (canManageAll(user.role) || user.role === "teacher") && (
  <PauseManagementView
    students={visible}
    teachers={teachers}
    currentUser={user}
    lessonSlots={lessonSlots}
    onUpdateStudent={async (s) => { await updateStudentDoc(s); }}
    onResumeStudent={async (student) => {
      const resumedAt = Date.now();
      const newEntry = {
        pausedAt: student.pausedAt || null,
        pausedReason: student.pausedReason || "",
        resumedAt,
        durationDays: student.pausedAt ? Math.floor((resumedAt - student.pausedAt) / 86400000) : null,
        slotIds: (student.lessons || []).map(l => l.slotId).filter(Boolean),
      };
      const upd = {
        ...student,
        status: "active",
        pausedAt: null,
        pausedReason: null,
        pauseHistory: [...(student.pauseHistory || []), newEntry],
      };
      await updateStudentDoc(upd);
      showToast(`${student.name} 복귀 처리되었습니다.`);
    }}
    showToast={showToast}
  />
)}
```

### 8. Dashboard 휴회 케어 관리 데이터 구조 (VERIFIED: Dashboard.jsx line 456~534)

기존 `s.careLogs[]` 구조:
```js
// 각 케어로그 항목:
{ id: string, createdAt: number, authorId: string, authorName: string,
  careType: "전화"|"문자"|"알림톡"|"기타",
  responseStatus: "응답없음"|"복귀 의향 있음"|"복귀 의향 없음"|"추후 연락",
  note: string }
```

기존 stage 판단 로직:
```js
const days = s.pausedAt ? Math.floor((Date.now() - s.pausedAt) / 86400000) : null;
const daysSinceCare = lastLog ? Math.floor((Date.now() - lastLog.createdAt) / 86400000) : null;
const needsCare = days >= 14 && (daysSinceCare === null || daysSinceCare >= 14);
const stage = !needsCare ? "ok" : days >= 30 ? "urgent" : "due";
```
→ PauseManagementView에서 그대로 재사용

### 9. IC 아이콘 현재 목록 (VERIFIED: constants.jsx line 20~47)

현재 IC 객체: home, users, check, wallet, more, x, plus, search, back, edit, cal, menu, teacher, bell, settings, logout, phone, notif, note, schedule, sun, moon, parent, building, mic, robot

**IC.pause 없음** → constants.jsx IC 객체에 pause 아이콘 SVG 추가 필요:
```jsx
pause: <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
```
Sidebar에서는 이모지 `"⏸"` 사용 가능 (MoreMenu에서는 IC.pause 사용).

### 10. lessonSlots prop 전달 경로 (VERIFIED: App.jsx line 1362)

```js
// 현재 App.jsx → ScheduleView:
{view === "schedule" && <ScheduleView
  ...
  lessonSlots={lessonSlots}
  onUpdateSlot={async (id, data) => updateLessonSlot(id, data)}
/>}
```

ScheduleView → TimetableView 전달은 ScheduleView 내부에서 이루어짐. `onAddStudentToSlot` 콜백도 같은 경로로 전달 추가.

---

## Common Pitfalls

### Pitfall 1: addStudentDoc 반환값 없음에 의한 slotId 누락
**What goes wrong:** `const saved = await addStudentDoc(student)` → `saved = undefined` → `autoSyncStudentSlots(undefined)` 호출 시 student.id 없어 updateStudentDoc throw
**Why it happens:** `addStudentDoc`은 void 함수 (반환값 없음, VERIFIED line 538~544)
**How to avoid:** 래퍼에서 `student`를 직접 사용. `addStudentDoc` 호출 전 `const studentWithId = { ...data, id: uid(), ... }` 구성 후 `autoSyncStudentSlots(studentWithId)` 전달
**Warning signs:** `updateStudentDoc: id 없음` 런타임 에러

### Pitfall 2: lessonSlots React state stale closure
**What goes wrong:** `autoSyncStudentSlots` 함수가 클로저로 이전 `lessonSlots`를 캡처 → 방금 생성한 슬롯이 탐색 목록에 없어 중복 슬롯 생성
**Why it happens:** 같은 렌더 사이클 내에서 `addLessonSlot` 후 state 갱신이 아직 일어나지 않음
**How to avoid:** `autoSyncStudentSlots` 내부에서 신규 생성된 슬롯은 docRef.id로 즉시 추적 (별도 `localCreatedSlots` 맵). 단일 학생에 대해서는 문제 없음 — 학생당 lessons를 순서대로 처리하고 이전 루프에서 생성된 슬롯을 다음 lesson이 참조할 일은 없음 (악기/스케줄이 다름).
**Warning signs:** 동일 슬롯이 복수 생성됨

### Pitfall 3: slotMatchesLesson에서 schedule 요소 순서 불일치
**What goes wrong:** `[{ day: "월", time: "09:00" }, { day: "목", time: "14:00" }]` vs `[{ day: "목", time: "14:00" }, { day: "월", time: "09:00" }]` → JSON.stringify 불일치 → 매번 새 슬롯 생성
**Why it happens:** 학생이 레슨 수정 시 schedule 배열 순서 변경 가능
**How to avoid:** 정렬 후 비교 (CONTEXT.md D-specifics 기준 구현 — `.sort((a,b)=>\`${a.day}${a.time}\`.localeCompare(\`${b.day}${b.time}\`))`)
**Warning signs:** 동일 학생 저장 시 매번 새 슬롯 생성

### Pitfall 4: window.confirm 사용
**What goes wrong:** "복귀 처리" 버튼 클릭 시 `if (window.confirm("복귀 처리하시겠습니까?"))` 사용
**Why it happens:** 개발 편의를 위한 빠른 구현
**How to avoid:** CLAUDE.md 절대 금지 규칙. 인라인 `confirmingId` state로 "정말 복귀 처리하시겠습니까?" + [확인] [취소] 버튼 렌더
**Warning signs:** CLAUDE.md 위반 — 빌드는 통과하지만 운영 정책 위반

### Pitfall 5: PauseManagementView에 visible만 전달 시 강사 필터 이중 적용
**What goes wrong:** App.jsx에서 이미 `visible = teacher ? students.filter(s => s.teacherId === user.id || lessons...)` 로 필터된 후 PauseManagementView 내부에서 또 강사 필터 → 정상 동작하지만 코드 중복
**Why it happens:** App.jsx에서 `visible`이 이미 역할 기반 필터됨 (line 1196~1198)
**How to avoid:** `visible` (이미 필터된) students 전달. PauseManagementView 내부에서 `.filter(s => s.status === "paused" && !s.isInstitution)`만 추가

### Pitfall 6: Dashboard CareLogModal import 끊김
**What goes wrong:** PauseManagementView로 이전 시 Dashboard에서 `setCareModal` → `CareLogModal` 렌더 코드를 그냥 삭제 → Dashboard 빌드 에러
**Why it happens:** Dashboard는 Phase 9에서 "휴회 케어 관리" 섹션을 링크 배너로만 교체 — CareLogModal 자체를 삭제하면 안 됨
**How to avoid:** CareLogModal을 PauseManagementView 파일에 정의하고 Dashboard가 import. 또는 Dashboard에 임시로 남겨두고 PauseManagementView에 복사 후 Dashboard의 원본 삭제. 후자가 더 안전 (cross-import 최소화)
**Warning signs:** `CareLogModal is not defined` 빌드 에러

### Pitfall 7: TimetableView에서 canSeeAll이 false인 강사의 "+" 버튼
**What goes wrong:** 강사 자신의 뷰에서 "+" 버튼이 없음 — D-02에서 강사 뷰도 빈 셀 "+"를 허용함
**Why it happens:** `canSeeAll = canManageAll(currentUser.role)` → teacher는 false
**How to avoid:** 빈 셀 "+" 조건: `(canSeeAll || isTeacher) && onAddStudentToSlot`. 강사는 `selectedTeacherId === currentUser.id` (자동 설정됨) 이므로 토스트 없이 바로 팝업 표시

---

## Code Examples

### 인라인 복귀 확인 UI 패턴 (window.confirm 대체)

```jsx
// [ASSUMED: window.confirm 금지 규칙 기반 표준 패턴 — 기존 StudentDetailModal 스타일 참고]
function PauseCard({ student, onResume, onCarelog }) {
  const [confirmingResume, setConfirmingResume] = useState(false);
  return (
    <div>
      {/* ... card content ... */}
      {!confirmingResume ? (
        <button onClick={() => setConfirmingResume(true)}
          style={{ fontSize: 12, padding: "4px 12px", borderRadius: 6, border: "1px solid var(--blue)", background: "var(--blue-lt)", color: "var(--blue)", cursor: "pointer", fontFamily: "inherit" }}>
          복귀 처리
        </button>
      ) : (
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "var(--ink-60)" }}>복귀 처리할까요?</span>
          <button onClick={() => { setConfirmingResume(false); onResume(student); }}
            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "none", background: "var(--green)", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>
            확인
          </button>
          <button onClick={() => setConfirmingResume(false)}
            style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", cursor: "pointer", fontFamily: "inherit" }}>
            취소
          </button>
        </div>
      )}
    </div>
  );
}
```

### StudentSearchPopup 기본 구조

```jsx
// [ASSUMED: 기존 AlimtalkModal 학생 선택 패턴 기반]
function StudentSearchPopup({ students, onSelect, onClose, top, left }) {
  const [q, setQ] = useState("");
  const filtered = students.filter(s =>
    s.status === "active" && !s.isInstitution && s.name.includes(q)
  ).slice(0, 20);
  return (
    <>
      <div style={{ position: "fixed", inset: 0, zIndex: 9998 }} onClick={onClose} />
      <div className="tt-member-popup" style={{ top, left, minWidth: 220, zIndex: 9999 }}>
        <input className="inp" value={q} onChange={e => setQ(e.target.value)}
          placeholder="이름 검색..." autoFocus style={{ marginBottom: 8, fontSize: 13 }} />
        {filtered.length === 0
          ? <div style={{ color: "var(--ink-30)", fontSize: 12 }}>검색 결과 없음</div>
          : filtered.map(s => (
            <div key={s.id} className="tt-member-row tt-member-row--link" onClick={() => onSelect(s)}>
              {s.name}
            </div>
          ))}
      </div>
    </>
  );
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| 슬롯 수동 생성 (AdminTools 마이그레이션만) | 학생 저장 시 자동 생성 (Phase 9) | Phase 9 | 슬롯 관리 자동화 |
| 휴회 케어 대시보드 내 인라인 | PauseManagementView 독립 뷰 (Phase 9) | Phase 9 | 케어 기능 집중화 |
| 휴회 단순 플래그 (pausedAt) | pauseHistory[] 누적 이력 (Phase 9) | Phase 9 | 재휴회 이력 추적 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | PauseManagementView 파일 위치: `src/components/student/PauseManagementView.jsx` | Architecture Patterns | 저위험 — 위치 변경만 필요 |
| A2 | 빈 셀 "+" 버튼: 강사 자신의 뷰에서도 표시 (D-02 "강사 본인 뷰" 명시) | Code Examples | 중위험 — 강사가 본인 슬롯만 수정 가능하도록 추가 검증 필요 |
| A3 | slotId 폐강(closed) UI: TimetableGrid 슬롯 카드 우클릭 또는 카드 내 버튼 | Architecture | 저위험 — D-05 "최소 구현"으로 AdminTools 또는 별도 위치 가능 |

---

## Open Questions

1. **TimetableView "+" 버튼 — 빈 셀 전체 vs 활성 시간대만**
   - What we know: 08:00~22:00 전 시간대에 빈 셀이 존재함. rowLayout에는 `type: "empty"` gap 셀도 있음
   - What's unclear: gap 셀(압축된 빈 시간대)에도 "+" 버튼이 필요한지, 아니면 실제 slot row에만 표시할지
   - Recommendation: slot row(56px)에만 "+" 표시. gap 셀은 압축 표시라 클릭 영역이 너무 작음

2. **악기 결정 — 학생이 해당 강사 레슨 없는 경우**
   - What we know: D-02에서 "악기 선택 드롭다운 추가" 명시
   - What's unclear: StudentSearchPopup에 악기 선택 드롭다운이 포함되는지, 아니면 별도 단계인지
   - Recommendation: StudentSearchPopup 내에서 학생 선택 후 악기가 모호하면 인라인으로 드롭다운 추가. 단일 악기라면 자동 선택

3. **D-05 폐강 UI 위치**
   - What we know: "TimetableView 슬롯 카드 또는 AdminTools에서 처리 (Phase 9에서 최소 구현)" (CONTEXT.md)
   - What's unclear: 플래너가 TimetableView 슬롯 카드 내 폐강 버튼을 넣을지 AdminTools에만 둘지
   - Recommendation: AdminTools `LessonSlotsView`에 폐강 버튼 추가 (canSeeAll만 접근 가능) — TimetableView UI 복잡도 증가 방지

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — 모든 변경은 기존 Firebase 스택 내 코드/컴포넌트 수정)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | 없음 (CLAUDE.md 명시: "테스트 러너 없음") |
| Config file | 없음 |
| Quick run command | `npm run build` |
| Full suite command | `npm run build` (동일) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| SCH-01 | 학생 저장 시 슬롯 자동 연결·생성, 토스트 표시 | 빌드 + 브라우저 수동 | `npm run build` | 브라우저에서 학생 저장 후 슬롯 생성 확인 |
| SCH-02 | TimetableView "+" 버튼 → 팝업 → 슬롯 배정 | 빌드 + 브라우저 수동 | `npm run build` | 브라우저에서 TimetableView 테스트 |
| SCH-03 | 그룹 슬롯 팝업 "학생 추가" 버튼 동작 | 빌드 + 브라우저 수동 | `npm run build` | 그룹 카드 팝업 확인 |
| SCH-04 | 사이드바 "휴회 관리" 메뉴 + 전체 뷰 기능 | 빌드 + 브라우저 수동 | `npm run build` | 모든 카드 기능 수동 확인 |
| SCH-05 | 복귀 처리 시 pauseHistory 항목 자동 추가 | 빌드 + Firestore 콘솔 | `npm run build` | Firestore 콘솔에서 student 문서 확인 |

### Sampling Rate

- **각 플랜 저장 후:** `npm run build` 통과 확인
- **페이즈 게이트:** `npm run build` 통과 + Nick 로컬 브라우저 검증 (`npm run dev`)

### Wave 0 Gaps

없음 — 기존 빌드 인프라로 충분

---

## Security Domain

Phase 9는 신규 외부 API/엔드포인트 없음. 기존 Firestore 보안 규칙 범위 내.

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V4 Access Control | yes | 강사 역할: `visible = students.filter(s => s.teacherId === user.id || ...)` 기존 패턴 유지 |
| V5 Input Validation | yes | `updateStudentDoc`의 id 검증 (`if (!student?.id) throw`) |
| V2 Authentication | no | 신규 인증 기능 없음 |
| V3 Session Management | no | 신규 세션 기능 없음 |

---

## Sources

### Primary (HIGH confidence — 직접 코드 확인)
- `src/App.jsx` line 538~614 — addStudentDoc, updateStudentDoc, runLessonSlotMigration 패턴
- `src/App.jsx` line 248, 481~491 — lessonSlots state 및 리스너
- `src/App.jsx` line 1414~1438 — sForm 저장 핸들러 (슬롯 자동생성 주입 위치)
- `src/App.jsx` line 1263~1393 — 전체 뷰 라우팅 패턴
- `src/firebase.js` line 96~109 — addLessonSlot, updateLessonSlot, deleteLessonSlot
- `src/components/TimetableView.jsx` line 57~358 — TimetableGrid 전체 구조
- `src/components/TimetableView.jsx` line 119~126, 283, 301~320 — memberPopup, 빈 셀, 팝업 렌더
- `src/components/layout/NavLayout.jsx` line 7~233 — Sidebar, BottomNav, MoreMenu 구조
- `src/components/dashboard/Dashboard.jsx` line 44~126, 456~534 — CareLogModal + 휴회 케어 관리 섹션
- `src/constants.jsx` line 20~47 — IC 아이콘 목록 (pause 없음 확인)
- `src/components/student/StudentManagement.jsx` line 101~149 — StudentFormModal onSave 흐름

### Secondary (MEDIUM confidence — CONTEXT.md 문서)
- `.planning/phases/09-schedule-enhancement/09-CONTEXT.md` — 확정된 구현 결정사항

---

## Metadata

**Confidence breakdown:**
- 코드 패턴 분석: HIGH — 핵심 파일 전부 직접 확인
- 신규 컴포넌트 설계: MEDIUM — 기존 패턴 기반 추론, 실제 구현 시 세부 조정 예상
- pauseHistory 스키마: HIGH — CONTEXT.md에 정확히 명시됨

**Research date:** 2026-06-15
**Valid until:** 2026-07-15 (코드베이스 변경 없으면 유효)
