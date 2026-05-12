---
phase: BW-bugfix-waves
plan: "03"
type: execute
wave: 3
depends_on: [BW-02]
files_modified:
  - src/components/attendance/Attendance.jsx
autonomous: true

must_haves:
  truths:
    - "getStatus가 studentId+date+teacherId 조합으로 출석 레코드를 찾는다"
    - "toggleStatus가 currentUser.id가 아닌 해당 lesson의 teacherId로 레코드를 생성/수정한다"
    - "같은 날 두 과목 수업(멀티-강사) 학생의 출석이 별도 레코드로 저장된다"
    - "기존 출석 레코드(teacherId 필드 있는 것)와 하위 호환된다"
  artifacts:
    - path: "src/components/attendance/Attendance.jsx"
      provides: "getStatus(studentId, date, teacherId), toggleStatus per-teacher 레코드 분리"
---

<objective>
엣지케이스 Wave 3: 멀티-강사 학생 출석 레코드 키 분리.

배경:
- 현재 getStatus는 (studentId, date)만으로 레코드를 찾음
- 같은 날 해금+타악 수업이 있는 학생의 경우 두 강사가 각자 출석 체크할 때 한 레코드를 공유해 덮어씀
- toggleStatus는 항상 teacherId: currentUser.id를 박아서 A 강사가 B 강사 학생 출석을 A 이름으로 기록 가능

수정 방향:
- getStatus(studentId, date, teacherId): teacherId까지 포함해 레코드 검색
- toggleStatus에서 새 레코드 생성 시 teacherId를 currentUser.id가 아닌 해당 lesson의 teacherId 사용
- 기존 레코드 (teacherId 필드 있음) 호환: teacherId 없는 레코드는 studentId+date로만 매칭 (fallback)
</objective>

## Tasks

### T1 — getStatus 함수 수정

**파일**: `src/components/attendance/Attendance.jsx`

**찾는 코드** (line ~382-385):
```js
const getStatus = (studentId, date) => {
  const rec = attendance.find(a => a.studentId === studentId && a.date === date);
  return rec?.status || null;
};
```

**수정 내용**:
```js
const getStatus = (studentId, date, teacherId) => {
  const rec = attendance.find(a =>
    a.studentId === studentId && a.date === date &&
    (teacherId ? a.teacherId === teacherId : true)
  );
  return rec?.status || null;
};
```

### T2 — toggleStatus / saveLessonNote teacherId 수정

**파일**: `src/components/attendance/Attendance.jsx`

**찾는 코드**: `toggleStatus` 함수 내 새 출석 레코드 생성 부분.
현재: `teacherId: currentUser.id` 하드코딩.

**수정 내용**: dayStudents의 각 학생에 대해 `lessonTeacherId`를 계산해 사용.
```js
// 해당 학생의 lessons 중 filterTeacher 담당 과목의 teacherId 사용
const lessonTeacherId = (s.lessons || []).find(l => l.teacherId === filterTeacher)?.teacherId
  || s.teacherId  // fallback to top-level teacherId
  || currentUser.id;

// 레코드 생성 시:
teacherId: lessonTeacherId
```

단, `filterTeacher === "all"`이고 currentUser가 admin/manager인 경우 — `currentUser.id`가 아닌 `s.teacherId`를 사용하거나, admin 모드에서는 teacherId를 비워두는 방식 검토.

### T3 — AttendanceView JSX: getStatus 호출에 teacherId 전달

**파일**: `src/components/attendance/Attendance.jsx`

**찾는 코드**: AttendanceView JSX 내 `getStatus(s.id, date)` 호출 부분.

**수정 내용**: 각 학생의 담당 강사 teacherId를 함께 전달.
```js
getStatus(s.id, date, filterTeacher !== "all" ? filterTeacher : s.teacherId)
```

### T4 — 하위 호환: 기존 레코드 fallback

**파일**: `src/components/attendance/Attendance.jsx`

기존 출석 레코드 중 teacherId가 없거나 다른 형식인 경우 대응:
- `getStatus` 내에서 teacherId 매칭 실패 시 `teacherId` 없이 재검색 (fallback)
- 이렇게 하면 기존 레코드도 정상 표시됨

## Verification
- `npm run build` 통과
- getStatus 시그니처가 (studentId, date, teacherId)인지 확인
- toggleStatus 내 레코드 생성에 currentUser.id 대신 lessonTeacherId 사용하는지 확인
- 같은 날 두 과목 수업 학생에 대해 두 개의 출석 레코드가 생성될 수 있는 구조인지 확인
