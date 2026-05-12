---
phase: BW-bugfix-waves
plan: "01"
type: execute
wave: 1
depends_on: []
files_modified:
  - src/App.jsx
  - src/components/student/StudentManagement.jsx
autonomous: true

must_haves:
  truths:
    - "출석 체크 dayStudents에서 withdrawn 학생이 보이지 않는다"
    - "BottomNav 미납 배지 unpaidCount가 active 학생만 기준으로 계산된다"
    - "ScheduleView에 전달하는 allMembers에서 withdrawn 학생이 제외된다"
    - "StudentFormModal 초기값이 student를 스프레드한 뒤 기본값을 덮어쓰지 않는다 (instrumentRental)"
    - "lessons:[]인 학생이 StudentsView 전체 탭 하단 '과목 미배정' 그룹에 표시된다"
  artifacts:
    - path: "src/App.jsx"
      provides: "visible 배열 status 필터, unpaidCount active 필터, ScheduleView allMembers withdrawn 제외"
    - path: "src/components/student/StudentManagement.jsx"
      provides: "StudentFormModal 초기값 스프레드 순서 수정, StudentsView '과목 미배정' 그룹"
---

<objective>
엣지케이스 Wave 1: 상태 필터 누락 + 초기값 버그 5건 수정.

배경:
- 퇴원(withdrawn)/휴원(paused) 학생이 출석 체크 목록·스케줄·BottomNav 미납 배지에 포함되어 실제 운영 데이터가 오염됨
- StudentFormModal 초기값 스프레드 순서 문제로 instrumentRental: true 학생 편집 시 false로 초기화됨
- lessons:[]인 학생이 전체 카테고리 탭에서 누락됨
</objective>

## Tasks

### T1 — App.jsx: 출석 체크 visible 배열 status 필터

**파일**: `src/App.jsx`

**찾는 코드**: `visible` 배열 생성 부분 (App.jsx에서 AttendanceView에 전달하는 학생 배열).
grep: `allMembers` 또는 `AttendanceView` 근처에서 visible 정의.

**수정 내용**: 출석 뷰용 visible 배열에 `s.status !== "withdrawn"` 필터 추가.
- paused(휴원) 학생은 출석 체크에 포함해야 할 수 있으므로 withdrawn만 제외.
- AttendanceView에 전달하는 students prop에 적용.

### T2 — App.jsx: unpaidCount 배지 active 필터

**파일**: `src/App.jsx`

**찾는 코드**: `unpaidCount` 계산 부분 (BottomNav 배지용).

**수정 내용**: unpaidCount 계산 시 `(s.status || "active") === "active"` 조건 추가.
- 휴원/퇴원 학생을 미납 배지에서 제외.

### T3 — App.jsx: ScheduleView allMembers withdrawn 제외

**파일**: `src/App.jsx`

**찾는 코드**: `ScheduleView`에 전달하는 `allMembers` 또는 students prop.

**수정 내용**: ScheduleView용 멤버 배열에서 `s.status === "withdrawn"` 학생 제외.
- paused는 스케줄에 남아도 됨 (휴원 중 스케줄 확인 필요할 수 있음).

### T4 — StudentManagement.jsx: StudentFormModal 초기값 스프레드 순서 수정

**파일**: `src/components/student/StudentManagement.jsx`

**찾는 코드** (line 77-79):
```js
const [form, setForm] = useState(student
  ? { instrumentRental: false, rentalType: "", rentalFee: 0, pendingOneTimeCharges: [], ...student }
  : { ... });
```

**수정 내용**: 기본값이 student 스프레드보다 먼저 오도록 순서 변경.
```js
const [form, setForm] = useState(student
  ? { ...student, instrumentRental: student.instrumentRental ?? false, rentalType: student.rentalType ?? "", rentalFee: student.rentalFee ?? 0, pendingOneTimeCharges: student.pendingOneTimeCharges ?? [] }
  : { ... });
```
또는 더 간단하게: 기존 student 필드는 유지하되 없는 필드만 기본값 제공.

### T5 — StudentManagement.jsx: StudentsView '과목 미배정' 그룹

**파일**: `src/components/student/StudentManagement.jsx`

**찾는 코드** (`StudentsView` 함수, filter === "전체" 분기, line 857-863):
```jsx
) : filter === "전체" ? (
  grouped.map(({ cat, items }) => ( ... ))
```

**수정 내용**: grouped 렌더링 후 lessons 없는 학생을 별도 "과목 미배정" 그룹으로 추가.
```jsx
const unassigned = statusFiltered.filter(s => !(s.lessons || []).some(l => l.instrument));
// grouped 렌더링 후:
{unassigned.length > 0 && (
  <div>
    <div className="cat-hd">...</div>
    <div className="s-grid">{unassigned.map(...)}</div>
  </div>
)}
```

## Verification
- `npm run build` 통과
- App.jsx에서 withdrawn 필터가 attendance용 visible에 적용됐는지 grep 확인
- StudentFormModal 초기값에서 `instrumentRental: false` 하드코딩이 사라졌는지 확인
