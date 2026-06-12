---
phase: 08-group-lesson-enhancement
reviewed: 2026-06-12T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - src/App.jsx
  - src/components/admin/AdminTools.jsx
  - src/components/attendance/Attendance.jsx
  - src/components/layout/NavLayout.jsx
  - src/components/ScheduleView.jsx
  - src/components/TimetableView.jsx
  - src/constants.jsx
  - src/firebase.js
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-06-12
**Depth:** standard
**Files Reviewed:** 8
**Status:** issues_found

## Summary

8개 소스 파일을 검토했습니다. CLAUDE.md CRITICAL 규칙 2건이 위반되었으며, 데이터 안전(attendance/payments 씨드 덮어쓰기, 어드민 비밀번호 빈 문자열 폴백)에 직접적 영향을 미칩니다. 그룹 레슨노트 저장 로직에서 불필요한 필드가 Firestore에 저장되고 practice guide 공유가 무음 실패하는 WARNING이 추가로 확인되었습니다.

---

## Critical Issues

### CR-01: resetSeed()가 rye-attendance / rye-payments를 빈 배열로 덮어씀

**File:** `src/App.jsx:1050-1052`

**Issue:** `resetSeed()` 함수가 `sSet("rye-attendance", seed.seedAttendance)` 와 `sSet("rye-payments", seed.seedPayments)` 를 호출합니다. `seed.seedAttendance`와 `seed.seedPayments` 는 각각 `[]`(빈 배열)입니다. CLAUDE.md CRITICAL 규칙 — "generateSeedData()는 rye-attendance / rye-payments 절대 금지 (2026-05-14 씨드 오발동으로 출석·레슨노트 전체 삭제)" — 을 직접 위반합니다. `resetSeed`는 현재 MoreMenu UI에 노출되지 않지만 함수 자체가 코드베이스에 존재하고 있어, 실수 호출 가능성이 있습니다.

**Fix:**
```js
// resetSeed() 에서 rye-attendance / rye-payments 두 줄 제거
const resetSeed = async () => {
  const seed = generateSeedData();
  await Promise.all([
    sSet("rye-teachers",          seed.seedTeachers),
    sSet("rye-students",          seed.seedStudents),
    sSet("rye-notices",           seed.seedNotices),
    sSet("rye-activity",          seed.seedActivity),
    // ↓ 아래 두 줄 삭제 — CLAUDE.md CRITICAL 규칙
    // sSet("rye-attendance",     seed.seedAttendance),  // 절대 금지
    // sSet("rye-payments",       seed.seedPayments),    // 절대 금지
    sSet("rye-pending",           []),
    sSet("rye-trash",             []),
    sSet("rye-schedule-overrides",[]),
    sSet("rye-student-notices",   []),
    sSet("rye-fee-presets",       {}),
    sSet("rye-institutions",      []),
  ]);
  // setAttendance / setPayments 두 줄도 함께 삭제
  ...
};
```

---

### CR-02: VITE_ADMIN_PASSWORD 미설정 시 어드민 비밀번호가 빈 문자열 — 인증 우회 가능

**File:** `src/constants.jsx:10`

**Issue:**
```js
export const ADMIN = { ..., password: import.meta.env.VITE_ADMIN_PASSWORD || "", ... };
```
`VITE_ADMIN_PASSWORD` 환경변수가 설정되지 않으면 `ADMIN.password`가 `""`(빈 문자열)가 됩니다. `App.jsx:1142`의 로그인 검사:
```js
if (username === ADMIN.username && password === ADMIN.password) {
  appUser = ADMIN;
}
```
는 `username="admin"` + 빈 비밀번호로 어드민 로그인이 허용됩니다. `.env` 파일이 없거나 누락된 배포 환경에서 어드민 전체 권한이 노출됩니다.

**Fix:**
```js
// constants.jsx line 10
const _adminPw = import.meta.env.VITE_ADMIN_PASSWORD;
if (!_adminPw) throw new Error("VITE_ADMIN_PASSWORD 환경변수 미설정 — 배포 금지");
export const ADMIN = { id:"admin", username:"admin", password: _adminPw, role:"admin", name:"관리자" };

// 또는 런타임 throw 대신: login() 에서 빈 비밀번호 명시 차단
// App.jsx login() 진입부
if (!password) return false;
```

---

## Warnings

### WR-01: saveGroupLessonNote가 practiceGuideText / sharePracticeGuide를 Firestore에 그대로 저장하고 연습 가이드 공유를 무음 무시

**File:** `src/components/attendance/Attendance.jsx:475-490`

**Issue:** `saveLessonNote`(개인 레슨노트, line 409)는 `practiceGuideText`와 `sharePracticeGuide`를 destructuring으로 제거하고 `cleanNote`만 저장합니다:
```js
const { practiceGuideText, sharePracticeGuide, ...cleanNote } = noteData;
```
그러나 `saveGroupLessonNote`는 `noteData`를 그대로 `lessonNote: noteData`로 저장합니다. 결과:
1. Firestore attendance 레코드에 UI 전용 필드(`practiceGuideText`, `sharePracticeGuide`)가 저장됩니다.
2. 그룹 레슨노트에서 "회원 포털에 공유" 체크박스를 활성화해도 `onUpdateStudent`가 호출되지 않아 practice guide가 포털에 공유되지 않습니다(기능 무음 실패).

현재 `inlineMode`에서는 practice guide UI가 렌더되지 않아 `sharePracticeGuide`는 항상 `false`이므로 직접적인 데이터 오염은 제한적이지만, `inlineMode`에 해당 섹션이 추가되면 즉시 데이터 손상으로 이어집니다.

**Fix:**
```js
const saveGroupLessonNote = async (studentIds, noteData, groupTeacherId) => {
  // 개인 레슨노트와 동일하게 스트립
  const { practiceGuideText, sharePracticeGuide, ...cleanNote } = noteData;
  let updated = [...attendance];
  for (const studentId of studentIds) {
    ...
    if (existing) {
      updated = updated.map(a => a.id === existing.id
        ? { ...a, lessonNote: cleanNote, note: formatLessonNoteSummary(cleanNote), updatedAt: Date.now() }
        : a);
    } else {
      updated = [...updated, { ..., lessonNote: cleanNote, note: formatLessonNoteSummary(cleanNote), ... }];
    }
  }
  await onSaveAttendance(updated);
  // practice guide 공유 처리 (개인 레슨노트와 동일 로직 적용)
  if (sharePracticeGuide && practiceGuideText?.trim() && onUpdateStudent) {
    for (const studentId of studentIds) {
      const theStudent = students.find(s => s.id === studentId);
      if (theStudent && !theStudent.isInstitution) {
        const instrument = (theStudent.lessons || []).map(l => l.instrument).filter(Boolean)[0] || "";
        await onUpdateStudent({ ...theStudent, practiceGuide: { body: practiceGuideText.trim(), instrument, createdAt: Date.now() } });
      }
    }
  }
  setNoteModal(null);
};
```

---

### WR-02: onAddComment / onDeleteComment에서 getRecord를 teacherId 없이 호출 — 복수 담당 학생에서 잘못된 레코드에 댓글이 첨부될 수 있음

**File:** `src/components/attendance/Attendance.jsx:686, 693`

**Issue:** `LessonNoteModal`의 `onAddComment`와 `onDeleteComment` 콜백:
```js
onAddComment={async (comment) => {
  const rec = getRecord(noteModal.studentId); // teacherId 인수 없음
  ...
}}
onDeleteComment={async (commentId) => {
  const rec = getRecord(noteModal.studentId); // teacherId 인수 없음
  ...
}}
```
`getRecord(studentId)` 는 teacherId 없이 호출되므로 같은 날짜에 studentId만 일치하는 첫 번째 레코드를 반환합니다. 한 학생이 같은 날 여러 강사에게 수업을 받는 경우(실제 데이터에서 "해금 + 장구" 병행 수강자 다수 존재), `filterTeacher`로 열린 레슨노트 모달과 다른 강사의 출석 레코드에 댓글이 저장될 수 있습니다.

**Fix:**
```js
onAddComment={async (comment) => {
  const tid = filterTeacher !== "all" ? filterTeacher : noteStudent?.teacherId;
  const rec = getRecord(noteModal.studentId, tid);
  if (rec) { ... }
}}
onDeleteComment={async (commentId) => {
  const tid = filterTeacher !== "all" ? filterTeacher : noteStudent?.teacherId;
  const rec = getRecord(noteModal.studentId, tid);
  if (rec) { ... }
}}
```

---

### WR-03: 슬롯 이름 인라인 편집 시 Enter → onKeyDown + onBlur 연속 발화로 Firestore 이중 저장

**File:** `src/components/ScheduleView.jsx:173-187`

**Issue:** `renderGroupName`의 슬롯 이름 편집 인풋에서 Enter를 누르면:
1. `onKeyDown`이 발화 → `onUpdateSlot(entry.slotId, { name: ... })` 호출 + `setEditingSlotId(null)` (line 175-178)
2. Enter로 인해 input에서 blur가 즉시 발화 → `onBlur`에서도 `onUpdateSlot(entry.slotId, { name: ... })` 재호출 (line 183-184)

`updateLessonSlot`(Firestore `updateDoc`)이 동일 내용으로 두 번 실행됩니다. 결과는 동일하지만 불필요한 Firestore 쓰기와 활동 로그 중복 가능성이 있습니다.

**Fix:**
```js
onKeyDown={e => {
  if (e.key === "Enter") {
    e.preventDefault();
    if (editingSlotName.trim() && onUpdateSlot) {
      onUpdateSlot(entry.slotId, { name: editingSlotName.trim() });
    }
    setEditingSlotId(null);
    // onBlur는 setEditingSlotId(null) 후에 발화하지만
    // editingSlotId === null이 되면 onBlur 가드로 막히지 않음 →
    // onBlur 내에서 현재 editingSlotId를 체크하거나 ref로 저장 필요
  }
  if (e.key === "Escape") setEditingSlotId(null);
}}
onBlur={() => {
  // Enter로 이미 저장된 경우 중복 방지
  if (!editingSlotId) return; // 이미 닫혔으면 스킵
  if (editingSlotName.trim() && onUpdateSlot) {
    onUpdateSlot(entry.slotId, { name: editingSlotName.trim() });
  }
  setEditingSlotId(null);
}}
```
단, `setEditingSlotId(null)` 이후 `editingSlotId` state 갱신은 비동기이므로 `onBlur` 시점에 여전히 이전 값일 수 있습니다. 더 안전한 해결책은 저장 여부를 ref로 추적하는 것입니다:
```js
const savedByEnterRef = useRef(false);
onKeyDown: if Enter → savedByEnterRef.current = true; save; setEditingSlotId(null);
onBlur: if (!savedByEnterRef.current) { save; } savedByEnterRef.current = false; setEditingSlotId(null);
```

---

### WR-04: onConfirmInstantPayment 중복 결제 체크가 stale React state 기반 — 다중 탭 동시 접근 시 중복 생성 가능

**File:** `src/App.jsx:1317`

**Issue:**
```js
const onConfirmInstantPayment = async (charge, student) => {
  if (payments.some(p => p.id === charge.id + "_pay")) return; // stale state 체크
  await updateInstantCharge(charge.id, { status: "paid", ... });
  ...
  const updatedPayments = [...payments, payRecord];
  await savePayments(updatedPayments);
};
```
`payments` React state는 다른 탭/기기에서 동시 조작 시 stale할 수 있습니다. 두 탭이 동시에 중복 체크를 통과하면 같은 `charge.id + "_pay"` ID를 가진 결제 레코드가 두 번 추가됩니다. `savePayments`는 배열 전체 덮어쓰기이므로 트랜잭션 없이 race condition이 발생합니다.

**Fix:** `_paymentsRef`를 사용한 Firestore 트랜잭션으로 변환:
```js
const _paymentsRef = doc(db, "appData", "rye-payments");
await runTransaction(db, async (tx) => {
  const snap = await tx.get(_paymentsRef);
  const cur = snap.exists() ? (snap.data().value || []) : [];
  if (cur.some(p => p.id === charge.id + "_pay")) return; // 트랜잭션 내 체크
  tx.set(_paymentsRef, { value: [...cur, payRecord], updatedAt: Date.now() });
});
```

---

### WR-05: 학생 studentCode 마이그레이션 및 77명 복구 경로에서 sSet("rye-students", ...) 직접 배열 덮어쓰기

**File:** `src/App.jsx:418, 435`

**Issue:**
```js
// line 418: studentCode 마이그레이션
await sSet("rye-students", migrated);
// line 435: 77명 복구
await sSet("rye-students", final);
```
두 경로 모두 `sSet`을 통해 전체 학생 배열을 직접 덮어씁니다. CLAUDE.md는 학생 CRUD를 반드시 per-op 트랜잭션(`addStudentDoc` / `updateStudentDoc` / `batchStudentDocs`)으로 수행하도록 요구합니다. 이 경로들은 Firestore 트랜잭션 read-before-write 없이 배열 전체를 교체하므로, 마이그레이션 실행 도중 다른 클라이언트가 학생을 수정하면 변경이 덮어씌워질 수 있습니다.

플래그(`rye-recovery-v1`, `needsMigration` 조건)로 1회만 실행되지만, 실행 타이밍에서 동시성 위험이 있습니다.

**Fix:** 두 경로 모두 `batchStudentDocs(migratedOnlyStudents)` 패턴으로 교체:
```js
// studentCode 마이그레이션 (line 409-419)
const toMigrate = migrated.filter((s, i) => s.studentCode !== studentsArr[i]?.studentCode);
await batchStudentDocs(toMigrate); // 변경된 항목만 per-op 트랜잭션 업데이트

// 복구 경로 (line 429-438)
// curStudents.length > 0이면 이미 스킵하므로, 해당 else 분기에서
// final 중 추가/수정된 항목만 addStudentDoc / batchStudentDocs 사용
```

---

## Info

### IN-01: Firebase 설정 값이 소스에 하드코딩됨

**File:** `src/firebase.js:5-12`

**Issue:** Firebase Web SDK API key 및 프로젝트 식별자가 소스에 직접 포함됩니다. Firebase Web SDK 설계상 API key는 클라이언트에 노출되어야 하며 실제 보안은 Firestore Security Rules로 담당합니다. 그러나 git에 체크인되면 git 히스토리에 영구히 남습니다. 보안은 Firebase Console의 "앱 체크(App Check)" 및 Firestore Rules로 충분히 보강할 수 있습니다.

**Fix:** 추가 조치 불필요(Firebase 설계 의도). 다만 Firestore Security Rules가 강화되어 있는지 확인 권장.

---

### IN-02: onResetSeed prop이 MoreMenu에 전달되지만 MoreMenu UI에서 사용되지 않음

**File:** `src/App.jsx:1393` / `src/components/layout/NavLayout.jsx:147`

**Issue:**
```js
// App.jsx:1393
<MoreMenu ... onResetSeed={resetSeed} ... />
// NavLayout.jsx:147
export function MoreMenu({ ..., onResetSeed, ... }) { // 받지만 어디에서도 호출 안 함
```
`MoreMenu` 컴포넌트는 `onResetSeed` prop을 받지만 렌더 트리 어디에서도 호출하지 않습니다. 이 prop은 현재 dead code입니다. UI 트리거가 없어서 CR-01의 직접적 실행 경로는 막혀 있지만, 불필요한 prop 전달이 코드 명확성을 낮춥니다.

**Fix:** `App.jsx:1393`에서 `onResetSeed={resetSeed}` 제거. `resetSeed` 함수 자체는 CR-01 수정 후에도 보존하되, UI 노출 없이 개발자 전용으로 관리.

---

_Reviewed: 2026-06-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
