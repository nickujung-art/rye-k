---
phase: QA-02-bugfix-critical
plan: "02"
type: execute
wave: 2
depends_on:
  - QA-02-01
files_modified:
  - src/components/attendance/Attendance.jsx
  - src/components/student/StudentManagement.jsx
  - src/components/payment/PaymentsView.jsx
autonomous: true
db_risk: NONE
data_writes: false
requirements:
  - C6-virtual-member-guard
  - H8-lesson-note-error
  - H5-payments-empty-catch
  - H7-teacher-id-fix

must_haves:
  truths:
    - "isInstitution=true 가상회원에 대해 onUpdateStudent가 절대 호출되지 않는다"
    - "saveLessonNote에서 onUpdateStudent 실패 시 사용자에게 토스트 에러가 표시된다"
    - "saveLessonNote에서 onUpdateStudent 실패 시 모달은 닫히지 않는다 (성공 시만 닫힘)"
    - "BulkFeeModal handleApply에서 isInstitution 가상회원은 업데이트 대상에서 제외된다"
    - "PaymentsView 수납 저장 실패 시 에러 토스트가 표시된다"
    - "이 wave의 모든 수정은 Firestore 데이터를 읽거나 쓰지 않는다 (코드 가드만)"
  artifacts:
    - path: "src/components/attendance/Attendance.jsx"
      provides: "isInstitution guard + saveLessonNote error handling"
      contains: "theStudent.isInstitution"
    - path: "src/components/student/StudentManagement.jsx"
      provides: "BulkFeeModal isInstitution guard"
      contains: "s.isInstitution"
    - path: "src/components/payment/PaymentsView.jsx"
      provides: "수납 저장 실패 에러 토스트"
      contains: "showToast"
  key_links:
    - from: "Attendance.jsx saveLessonNote line 416"
      to: "onUpdateStudent 호출"
      via: "!theStudent.isInstitution 가드 추가"
      pattern: "isInstitution guard"
    - from: "StudentManagement.jsx BulkFeeModal handleApply"
      to: "isInstitution 필터"
      via: "map 대상에서 가상회원 제외"
      pattern: "isInstitution guard"
---

<objective>
## Wave 2: 코드 가드 추가 (DB 쓰기 없음)

⚠️ 이 wave의 모든 수정은 Firestore에 아무것도 쓰지 않는다.
  오직 잘못된 쓰기를 막는 가드와 에러 핸들링만 추가.

### 수정할 4가지

**C6: 가상회원(isInstitution) → onUpdateStudent 호출 차단**
- 기관 가상회원에 연습 가이드 공유 체크하면 Firestore에 가상회원이 영구 저장됨
- `!theStudent.isInstitution` 조건 추가로 차단

**H8: saveLessonNote try/catch 추가**
- onUpdateStudent 실패해도 모달이 그냥 닫히고 에러 피드백 없음
- try/catch로 실패 시 토스트 표시, setNoteModal(null)은 성공 시만

**BulkFeeModal isInstitution guard**
- 일괄 수강료 변경 시 가상회원 포함될 수 있음
- handleApply에서 isInstitution 필터 추가

**H5: PaymentsView 빈 catch 블록에 에러 토스트 추가**
- 수납 저장 실패 시 아무 피드백 없는 문제
</objective>

<tasks>

<task type="auto">
  <name>Task 1: Attendance.jsx — isInstitution guard + saveLessonNote error handling</name>
  <read_first>
    - src/components/attendance/Attendance.jsx (lines 402-425: saveLessonNote)
    - src/components/attendance/Attendance.jsx (lines 854-870: saveLessonNoteInView)
  </read_first>
  <files>
    src/components/attendance/Attendance.jsx
  </files>
  <action>
**[수정 1] saveLessonNote (line 402-424) — isInstitution guard + try/catch**

현재 (line 416-424):
```js
    if (sharePracticeGuide && practiceGuideText?.trim() && onUpdateStudent) {
      const theStudent = students.find(s => s.id === studentId);
      if (theStudent) {
        const instrument = (theStudent.lessons || []).map(l => l.instrument).filter(Boolean)[0] || "";
        await onUpdateStudent({ ...theStudent, practiceGuide: { body: practiceGuideText.trim(), instrument, createdAt: Date.now() } });
      }
    }
    setNoteModal(null);
```

변경 후:
```js
    if (sharePracticeGuide && practiceGuideText?.trim() && onUpdateStudent) {
      const theStudent = students.find(s => s.id === studentId);
      if (theStudent && !theStudent.isInstitution) {
        try {
          const instrument = (theStudent.lessons || []).map(l => l.instrument).filter(Boolean)[0] || "";
          await onUpdateStudent({ ...theStudent, practiceGuide: { body: practiceGuideText.trim(), instrument, createdAt: Date.now() } });
        } catch (e) {
          showToast("연습 가이드 저장에 실패했습니다. 다시 시도해주세요.", true);
          return;
        }
      }
    }
    setNoteModal(null);
```

**[수정 2] saveLessonNoteInView (line 854-870) — teacherId 수정**

`LessonNotesView`에서 관리자가 다른 강사 레코드 작성 시 teacherId를 관리자 ID가 아닌 실제 담당 강사 ID로 저장해야 함.

현재:
```js
    await onSaveAttendance([...attendance, { id: uid(), studentId, teacherId: currentUser.id, ...
```

변경 후:
```js
    const theStudent = students.find(x => x.id === studentId);
    const lessonTeacherId = theStudent
      ? ((theStudent.lessons || []).find(l => l.teacherId)?.teacherId || theStudent.teacherId || currentUser.id)
      : currentUser.id;
    await onSaveAttendance([...attendance, { id: uid(), studentId, teacherId: lessonTeacherId, ...
```

`teacherId: currentUser.id` → `teacherId: lessonTeacherId` 로 교체.
  </action>
  <verify>
    <automated>grep -n "isInstitution\|return;\|lessonTeacherId" src/components/attendance/Attendance.jsx | head -20</automated>
  </verify>
  <acceptance_criteria>
    - `!theStudent.isInstitution` 가드 포함
    - onUpdateStudent 실패 시 `return;`으로 setNoteModal(null) 스킵
    - saveLessonNoteInView에서 `lessonTeacherId` 변수 사용
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: StudentManagement.jsx — BulkFeeModal isInstitution guard + try/finally</name>
  <read_first>
    - src/components/student/StudentManagement.jsx (BulkFeeModal handleApply 함수)
  </read_first>
  <files>
    src/components/student/StudentManagement.jsx
  </files>
  <action>
**BulkFeeModal의 handleApply 함수에 isInstitution 가드 + try/finally 추가**

현재 (handleApply):
```js
  const handleApply = async () => {
    setApplying(true);
    const updated = allStudents.map(s => {
      if (!baseList.find(b => b.id === s.id)) return s;
      return { ...s, monthlyFee: calcNew(s.monthlyFee) };
    });
    await onApply(updated);
    setApplying(false);
    onClose();
  };
```

변경 후:
```js
  const handleApply = async () => {
    setApplying(true);
    try {
      const updated = allStudents.map(s => {
        if (s.isInstitution) return s;
        if (!baseList.find(b => b.id === s.id)) return s;
        return { ...s, monthlyFee: calcNew(s.monthlyFee) };
      });
      await onApply(updated);
      onClose();
    } catch {
      // onApply 실패 시 모달 닫지 않음 (사용자가 재시도 가능)
    } finally {
      setApplying(false);
    }
  };
```
  </action>
  <verify>
    <automated>grep -n "isInstitution\|finally" src/components/student/StudentManagement.jsx | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `s.isInstitution` 가드 포함
    - try/finally로 setApplying(false) 보장
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: PaymentsView.jsx — 빈 catch 블록에 에러 토스트 추가</name>
  <read_first>
    - src/components/payment/PaymentsView.jsx (saveEdit, confirmBulkPrep, confirmBulkInstPrep 함수들의 catch 블록)
  </read_first>
  <files>
    src/components/payment/PaymentsView.jsx
  </files>
  <action>
**PaymentsView.jsx에서 완전히 빈 catch 블록들에 최소 에러 피드백 추가**

`showToast` prop을 받는지 먼저 확인 후, 받지 않는다면 `console.error`라도 추가.
빈 `catch {}` → `catch { showToast?.("저장에 실패했습니다.", true); }` 또는 prop 구조에 맞게.

단, 기존 로직(변수 업데이트, 상태 전환)은 절대 변경하지 말 것.
빈 catch 블록에 피드백 한 줄만 추가.

**주의**: PaymentsView의 props 시그니처를 먼저 확인해서 showToast가 있는지 파악 후 적용.
  </action>
  <verify>
    <automated>grep -n "catch {" src/components/payment/PaymentsView.jsx | head -10</automated>
  </verify>
  <acceptance_criteria>
    - 완전히 빈 `catch {}` 블록이 없음
    - 최소한 에러 로깅 또는 토스트 표시
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: npm run build 통과 확인</name>
  <action>
```bash
npm run build
```
  </action>
  <acceptance_criteria>
    - 빌드 에러 없음
    - 빌드 성공
  </acceptance_criteria>
</task>

</tasks>

<verification>
npm run build 통과
grep으로 isInstitution guard 위치 확인
Firestore 데이터 변경 없음 (코드 가드만 추가)
</verification>

<success_criteria>
- C6: 가상회원 onUpdateStudent 호출 완전 차단
- H8: saveLessonNote 에러 피드백 + setNoteModal 성공시만 닫힘
- BulkFeeModal: 가상회원 수강료 변경 대상 제외
- H5: PaymentsView 빈 catch 블록 제거
- npm run build 통과
</success_criteria>
