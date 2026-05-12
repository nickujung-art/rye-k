---
phase: BW-bugfix-waves
plan: "02"
type: execute
wave: 2
depends_on: [BW-01]
files_modified:
  - src/components/attendance/Attendance.jsx
  - src/components/student/StudentManagement.jsx
  - src/components/teacher/TeacherManagement.jsx
  - src/App.jsx
autonomous: true

must_haves:
  truths:
    - "LessonNotesView missingNoteRecords가 teacherId로 필터된다"
    - "TeachersView 강사 카드 미작성 배너가 날짜(출석 레코드) 단위로 집계된다"
    - "StudentFormModal 신규 등록 시 수강료 자동계산이 수동 입력값을 덮어쓰지 않는다"
    - "강사 삭제 시 담당 학생이 있으면 삭제 확인 UI에 경고 메시지가 표시된다"
  artifacts:
    - path: "src/components/attendance/Attendance.jsx"
      provides: "LessonNotesView missingNoteRecords teacherId 필터, getStatus teacherId 조회"
    - path: "src/components/teacher/TeacherManagement.jsx"
      provides: "TeachersView 미작성 배너 날짜 단위 집계"
    - path: "src/components/student/StudentManagement.jsx"
      provides: "StudentFormModal 수강료 자동계산 덮어쓰기 방지"
    - path: "src/App.jsx"
      provides: "강사 삭제 시 담당 학생 경고"
---

<objective>
엣지케이스 Wave 2: 데이터 격리 버그 + UX 오동작 4건 수정.

배경:
- LessonNotesView 미작성 배너가 다른 강사 출석 레코드도 포함 (teacherId 미체크)
- TeachersView 강사 카드 미작성 카운트가 학생 단위라 부정확 (날짜 단위여야 함)
- 신규 학생 수강료 자동계산이 수동 입력값을 레슨 변경 시마다 덮어씀
- 강사 삭제 시 담당 학생이 dangling reference 상태가 됨 — 삭제 전 경고 필요
</objective>

## Tasks

### T1 — Attendance.jsx: LessonNotesView missingNoteRecords teacherId 필터

**파일**: `src/components/attendance/Attendance.jsx`

**찾는 코드**: `missingNoteRecords` 계산 부분 (line ~776-783).
현재: `filteredStudentIds`에 속하는 출석 레코드 중 노트 없는 것.
문제: teacherId 필터가 없어 다른 강사가 기록한 출석도 포함.

**수정 내용**: `missingNoteRecords` 필터에 `&& a.teacherId === currentTeacherId` 조건 추가.
- `currentTeacherId`는 LessonNotesView의 teacher prop 또는 currentUser.id.
- 정확한 변수명은 컴포넌트 props 확인 후 적용.

### T2 — TeacherManagement.jsx: TeachersView 미작성 배너 날짜 단위 집계

**파일**: `src/components/teacher/TeacherManagement.jsx`

**찾는 코드** (line ~186-192):
```js
const thisMonthAttIds = new Set(
  attendance.filter(a => a.teacherId === t.id && (a.date||"").startsWith(THIS_MONTH) && (a.lessonNote || a.note)).map(a => a.studentId)
);
const missingNotes = [...new Set(
  attendance.filter(a => a.teacherId === t.id && (a.date||"").startsWith(THIS_MONTH) && (a.status === "present" || a.status === "late") && !thisMonthAttIds.has(a.studentId)).map(a => a.studentId)
)].length;
```

**문제**: `thisMonthAttIds`가 "노트 있는 studentId 집합"이라 같은 학생이 이달 5번 출석 중 1번만 노트 있어도 미작성 0명 처리됨.

**수정 내용**: 날짜 단위로 집계 — 노트 없는 출석 레코드 수(건) 또는 날짜 수로 변경.
```js
const attWithNote = new Set(
  attendance.filter(a => a.teacherId === t.id && (a.date||"").startsWith(THIS_MONTH) && (a.lessonNote || a.note)).map(a => a.studentId + "_" + a.date)
);
const missingNotes = attendance.filter(
  a => a.teacherId === t.id && (a.date||"").startsWith(THIS_MONTH) && (a.status === "present" || a.status === "late") && !attWithNote.has(a.studentId + "_" + a.date)
).length;
```
- 배너 텍스트도 "미작성 N건"으로 변경 (N명 → N건).

### T3 — StudentManagement.jsx: 신규 수강료 자동계산 덮어쓰기 방지

**파일**: `src/components/student/StudentManagement.jsx`

**찾는 코드** (line ~88-95):
```js
if (k === "lessons" && !isEdit && feePresets) {
  const autoFee = (v || []).reduce((sum, l) => sum + (feePresets[l.instrument] || 0), 0);
  if (autoFee > 0 && (f.monthlyFee === 0 || f.monthlyFee === (f.lessons || []).reduce((s, l) => s + (feePresets[l.instrument] || 0), 0))) {
    next.monthlyFee = autoFee;
  }
}
```

**문제**: 조건 `f.monthlyFee === (f.lessons || []).reduce(...)` — 이전 레슨의 자동계산 합계와 동일한 경우에만 덮어쓰기를 허용하는데, 사용자가 수동 입력했어도 우연히 이전 합계와 같으면 덮어씌워짐.

**수정 내용**: 수동 입력 여부를 별도 state로 추적하거나, 단순하게 "monthlyFee === 0일 때만" 자동계산 적용.
```js
if (k === "lessons" && !isEdit && feePresets) {
  const autoFee = (v || []).reduce((sum, l) => sum + (feePresets[l.instrument] || 0), 0);
  if (autoFee > 0 && f.monthlyFee === 0) {  // 수동 입력된 값(0이 아님)은 덮어쓰지 않음
    next.monthlyFee = autoFee;
  }
}
```

### T4 — App.jsx: 강사 삭제 시 담당 학생 경고

**파일**: `src/App.jsx` + `src/components/teacher/TeacherManagement.jsx`

**찾는 코드**: `TeacherDetailModal`의 `DeleteConfirmFooter` 또는 onDelete 콜백 (App.jsx ~line 1030).

**현재**:
```jsx
onDelete={async () => { await softDeleteTeacher(selected); setModal(null); showToast(`...`); }}
```

**수정 내용**: onDelete 호출 전 담당 학생 수 체크 후 경고 메시지 포함.
- `TeacherDetailModal`의 `DeleteConfirmFooter` 영역에 담당 학생이 있을 때 경고 표시.
- `DeleteConfirmFooter` 컴포넌트에 `warningMsg` prop 추가 또는 모달 내 인라인 경고.
- 경고: "이 강사의 담당 학생 N명의 강사 정보가 미배정 상태가 됩니다."

구현 방법:
1. App.jsx onDelete 핸들러에서 담당 학생 카운트 확인
2. `TeacherDetailModal`에 `assignedCount` prop 추가 또는 이미 전달된 `students` prop 활용
3. `DeleteConfirmFooter` 렌더 시 담당 학생 있으면 경고 배너 표시 (삭제는 막지 않고 경고만)

## Verification
- `npm run build` 통과
- LessonNotesView missingNoteRecords에 teacherId 조건이 추가됐는지 grep
- TeachersView missingNotes 계산에 date가 포함됐는지 grep
- StudentFormModal 자동계산 조건이 `=== 0`만인지 확인
