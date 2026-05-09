---
phase: FS-fee-split
plan: 02
type: execute
wave: 2
depends_on:
  - FS-01
files_modified:
  - src/components/student/StudentManagement.jsx
autonomous: true
requirements:
  - FS-FEE-03

must_haves:
  truths:
    - "LessonEditor에서 각 과목별 수강료(fee) 입력 필드가 보인다"
    - "신규 학생 등록 시 feePresets에 의해 레슨 fee가 자동 설정된다"
    - "StudentFormModal의 '월 수강료' 합계 표시가 lessons[].fee 합산으로 계산된다"
    - "기존 fee 없는 학생 수정 시 편집 폼에 feePresets 기본값이 채워져 보인다"
  artifacts:
    - path: "src/components/student/StudentManagement.jsx"
      provides: "LessonEditor에 fee 입력 UI, StudentFormModal 합계 계산 갱신"
      contains: "lesson.fee"
  key_links:
    - from: "LessonEditor fee input"
      to: "StudentFormModal.form.lessons[].fee"
      via: "onChange 콜백으로 lessons 배열 갱신"
      pattern: "fee"
    - from: "StudentFormModal"
      to: "calcTotalFee in utils.js"
      via: "합계 표시에 calcTotalFee 사용"
      pattern: "calcTotalFee"
---

<objective>
LessonEditor에 과목별 fee 입력 UI를 추가하고, StudentFormModal의 수강료 합계 표시를 lessons[].fee 기반으로 전환한다.

Purpose: 관리자·매니저가 학생 등록/수정 시 각 과목별 수강료를 입력할 수 있게 한다. feePresets이 있으면 자동 채워진다.

Output: StudentManagement.jsx — LessonEditor에 fee 필드, StudentFormModal에 합계 표시 UI
</objective>

<execution_context>
@C:\Users\GIGABYTE\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\GIGABYTE\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\GIGABYTE\Coding\rye-k\src\components\student\StudentManagement.jsx
@C:\Users\GIGABYTE\Coding\rye-k\src\utils.js
@C:\Users\GIGABYTE\Coding\rye-k\CLAUDE.md

<interfaces>
<!-- FS-01에서 추가된 유틸 함수 -->
// src/utils.js (FS-01 완료 후)
export function calcLessonFeeWithFallback(lesson, feePresets, fallbackPerLesson = 0): number
export function calcTotalFee(student, feePresets): number

<!-- LessonEditor 현재 시그니처 -->
export function LessonEditor({ lessons, onChange, categories, teachers })
// lessons: [{ instrument: string, teacherId: string, schedule: [{day,time}] }]
// onChange: (lessons) => void

<!-- StudentFormModal 현재 시그니처 -->
export function StudentFormModal({ student, teachers, currentUser, categories, feePresets, onClose, onSave })
// feePresets: { "해금": 100000, "타악": 50000, "rental:해금": 5000, ... }

<!-- form.lessons 내 lesson 구조 (목표) -->
// { instrument: string, teacherId: string, fee: number, schedule: [{day,time}] }

<!-- toggleInst 현재 로직 (LessonEditor line 10-12) -->
const toggleInst = inst => {
  if (selectedInsts.includes(inst)) onChange(lessons.filter(l => l.instrument !== inst));
  else onChange([...lessons, { instrument: inst, teacherId: "", schedule: [{ day: "", time: "" }] }]);
};
// → fee 필드 추가 필요

<!-- StudentFormModal의 auto-fee 로직 (line 89-94) -->
if (k === "lessons" && !isEdit && feePresets) {
  const autoFee = (v || []).reduce((sum, l) => sum + (feePresets[l.instrument] || 0), 0);
  if (autoFee > 0 && f.monthlyFee === 0) {
    next.monthlyFee = autoFee;
  }
}
// → 이 로직을 lessons[].fee 기반으로 교체

<!-- '월 수강료' 입력 필드 (StudentFormModal line 157-166) -->
// canManageAll 조건 아래 monthlyFee 단일 입력 필드 → 합계 표시로 변경
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: LessonEditor에 과목별 fee 입력 필드 추가</name>
  <read_first>
    - src/components/student/StudentManagement.jsx (LessonEditor, lines 8~73)
    - src/utils.js (calcLessonFeeWithFallback 함수 시그니처 확인)
  </read_first>
  <files>src/components/student/StudentManagement.jsx</files>
  <action>
**LessonEditor 컴포넌트 수정 (3곳):**

1. **props에 feePresets 추가:**
   ```jsx
   export function LessonEditor({ lessons, onChange, categories, teachers, feePresets })
   ```

2. **toggleInst에서 신규 lesson 추가 시 fee 자동 설정:**
   ```jsx
   const toggleInst = inst => {
     if (selectedInsts.includes(inst)) onChange(lessons.filter(l => l.instrument !== inst));
     else {
       const fee = feePresets ? (feePresets[inst] || 0) : 0;
       onChange([...lessons, { instrument: inst, teacherId: "", fee, schedule: [{ day: "", time: "" }] }]);
     }
   };
   ```

3. **lesson-item 렌더에서 담당 강사 select 아래에 fee 입력 필드 추가:**
   LessonEditor 내 `lessons.map(l => {...})` 블록에서, 담당 강사 `<select>` 영역 (`teachers && teachers.length > 0` 조건 블록) 바로 다음에 아래 JSX를 삽입한다. `canManageAll` 체크 없이 항상 표시(LessonEditor는 이미 canManageAll일 때만 노출됨).

   ```jsx
   <div style={{ marginBottom: 8 }}>
     <div style={{ fontSize: 10.5, color: "var(--ink-30)", fontWeight: 600, letterSpacing: .5, marginBottom: 4 }}>수강료 (월)</div>
     <div style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 200 }}>
       <input
         className="inp"
         inputMode="numeric"
         value={l.fee != null && l.fee > 0 ? l.fee.toLocaleString("ko-KR") : ""}
         onChange={e => onChange(lessons.map(x => x.instrument !== l.instrument ? x : { ...x, fee: parseInt(e.target.value.replace(/[^\d]/g, "")) || 0 }))}
         placeholder={(feePresets && feePresets[l.instrument]) ? (feePresets[l.instrument]).toLocaleString("ko-KR") : "0"}
         style={{ flex: 1, paddingRight: 24 }}
       />
       <span style={{ fontSize: 12, color: "var(--ink-30)", flexShrink: 0 }}>원</span>
     </div>
   </div>
   ```

**주의사항:**
- `window.confirm` / `window.alert` 사용 금지
- 기존 schedule 관련 state(updSch, addSch, rmSch) 건드리지 않음
- lesson 객체 immutable 업데이트 (`lessons.map(x => x.instrument !== l.instrument ? x : { ...x, fee: ... })`)
  </action>
  <verify>
    <automated>cd /c/Users/GIGABYTE/Coding/rye-k && grep -n "fee" src/components/student/StudentManagement.jsx | grep -E "feePresets|l\.fee|lesson.*fee" | head -10</automated>
  </verify>
  <acceptance_criteria>
    - LessonEditor props에 `feePresets` 추가됨
    - toggleInst 함수가 새 lesson 추가 시 `fee: feePresets[inst] || 0` 포함
    - 각 lesson-item에 수강료 입력 `<input>` 렌더됨 (placeholder에 feePresets 값 표시)
    - onChange에서 lesson 객체를 immutable하게 업데이트 (`{ ...x, fee: ... }`)
    - `window.confirm`/`window.alert` 미사용
    - npm run build 통과
  </acceptance_criteria>
  <done>LessonEditor에서 각 과목별 fee 입력 UI가 노출되고 데이터 흐름이 연결됨</done>
</task>

<task type="auto">
  <name>Task 2: StudentFormModal 수강료 합계 표시를 lessons[].fee 기반으로 교체</name>
  <read_first>
    - src/components/student/StudentManagement.jsx (StudentFormModal, lines 76~260 특히 set 함수 lines 85~98, 월 수강료 입력 lines 155~167, LessonEditor 호출 line 247)
    - src/utils.js (calcTotalFee export 확인)
  </read_first>
  <files>src/components/student/StudentManagement.jsx</files>
  <action>
**StudentFormModal 4곳 수정:**

1. **import에 calcTotalFee 추가:**
   파일 상단 utils.js import 줄에 `calcTotalFee` 추가:
   ```js
   import { uid, calcAge, isMinor, getCat, fmtDate, fmtDateShort, fmtMoney, canManageAll, monthLabel, allLessonInsts, allLessonDays, getBirthPassword, formatLessonNoteSummary, compressImage, fmtPhone, computeMonthlyAttStats, calcTotalFee } from "../../utils.js";
   ```

2. **set 함수의 auto-fee 로직 교체 (lines 88-94 부근):**
   기존 `k === "lessons"` 조건 블록을 아래로 교체한다. 신규·수정 모두 lessons 변경 시 각 lesson.fee를 feePresets로 채워준다:
   ```js
   if (k === "lessons" && feePresets) {
     // 새로 추가된 lesson에 feePresets 기본값 적용 (이미 fee가 있으면 유지)
     next.lessons = (v || []).map(l => ({
       ...l,
       fee: l.fee != null && l.fee > 0 ? l.fee : (feePresets[l.instrument] || 0),
     }));
   }
   ```
   단, `next.monthlyFee` 자동계산 제거 (monthlyFee는 파생값이므로 DB에 별도 저장 불필요. 하위 호환 위해 onSave 시 계산해서 넣어줌 — 다음 항목).

3. **onSave 호출 시 monthlyFee 파생 계산 포함:**
   handleConfirm 내 onSave 호출 부분:
   ```js
   // 기존:
   await onSave({ ...form, createdAt: form.createdAt || Date.now() });
   // 변경 후:
   const totalFee = calcTotalFee(form, feePresets);
   await onSave({ ...form, monthlyFee: totalFee, createdAt: form.createdAt || Date.now() });
   ```
   이렇게 하면 기존 코드(PaymentsView의 s.monthlyFee 참조)가 여전히 올바른 값을 받는다.

4. **'월 수강료' UI 교체 (canManageAll 블록 lines 155~167):**
   단일 input 대신 합계 읽기 전용 표시 + 각 과목별 breakdown으로 변경:
   ```jsx
   {canManageAll(currentUser.role) && (
     <div className="fg">
       <label className="fg-label">월 수강료 (과목별 합계)</label>
       <div style={{ background: "var(--ink-5,#F8F8F8)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "10px 14px", fontSize: 13 }}>
         {(form.lessons || []).length === 0 ? (
           <span style={{ color: "var(--ink-30)" }}>과목 선택 후 수강료가 표시됩니다</span>
         ) : (
           <>
             {(form.lessons || []).map(l => (
               <div key={l.instrument} style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 4 }}>
                 <span>{l.instrument}</span>
                 <span>{l.fee != null && l.fee > 0 ? l.fee.toLocaleString("ko-KR") + "원" : <span style={{ color: "var(--ink-30)" }}>미설정</span>}</span>
               </div>
             ))}
             {form.instrumentRental && (
               <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 4 }}>
                 <span>악기 대여료</span>
                 <span>{(form.rentalFee || 0).toLocaleString("ko-KR")}원</span>
               </div>
             )}
             <div style={{ borderTop: "1px dashed var(--border)", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", fontWeight: 700, fontSize: 14 }}>
               <span>합계</span>
               <span>{calcTotalFee(form, feePresets).toLocaleString("ko-KR")}원</span>
             </div>
           </>
         )}
       </div>
       <div style={{ fontSize: 11, color: "var(--ink-30)", marginTop: 4 }}>각 과목의 수강료는 위 레슨 설정에서 입력하세요.</div>
     </div>
   )}
   ```

5. **LessonEditor 호출에 feePresets prop 전달 (line 247 부근):**
   ```jsx
   <LessonEditor
     lessons={editorLessons}
     onChange={v => set("lessons", isTeacherEdit ? [...(form.lessons || []).filter(l => l.teacherId !== currentUser.id), ...v] : v)}
     categories={categories}
     teachers={canManageAll(currentUser.role) ? teachers : []}
     feePresets={feePresets}
   />
   ```

**주의사항:**
- `window.confirm` / `window.alert` 사용 금지
- 기존 rentalFee, instrumentRental 로직 건드리지 않음
- form.monthlyFee state 변수 자체는 onSave 전에 파생 계산으로 덮어쓰기 (DB에는 파생값 저장)
  </action>
  <verify>
    <automated>cd /c/Users/GIGABYTE/Coding/rye-k && grep -n "calcTotalFee" src/components/student/StudentManagement.jsx</automated>
  </verify>
  <acceptance_criteria>
    - `import { ..., calcTotalFee }` from utils.js 포함
    - handleConfirm에서 `monthlyFee: calcTotalFee(form, feePresets)` 포함한 onSave 호출
    - LessonEditor에 `feePresets={feePresets}` prop 전달
    - '월 수강료' UI가 lessons 합계 breakdown으로 교체됨
    - `window.confirm`/`window.alert` 미사용
    - npm run build 통과
  </acceptance_criteria>
  <done>StudentFormModal에서 과목별 수강료가 표시되고 저장 시 합산값이 monthlyFee에 반영됨</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| StudentFormModal → onSave | 사용자 입력값이 Firestore에 저장됨 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-FS-02-01 | Tampering | lesson.fee input | accept | fee 값은 `parseInt(... || 0)` 처리로 NaN 방지. Firestore 접근은 canManageAll 역할 체크로 보호 |
| T-FS-02-02 | Information Disclosure | 수강료 표시 | mitigate | canManageAll(currentUser.role) 조건 하에서만 금액 표시 — 기존 패턴 유지 |
</threat_model>

<verification>
npm run build 통과

수동 확인:
- 관리자 로그인 → 회원 등록 → 과목 선택 시 fee 입력 필드 노출
- feePresets에 등록된 과목 선택 시 수강료 자동 채워짐
- '월 수강료' 섹션이 과목별 breakdown + 합계로 표시됨
- 저장 후 DB의 monthlyFee = 레슨 합산값
</verification>

<success_criteria>
- LessonEditor에 과목별 fee 입력 UI 추가
- StudentFormModal 수강료 합계가 lessons[].fee 합산으로 계산됨
- 저장 시 monthlyFee에 파생 합계 저장 (하위 호환)
- feePresets 있으면 자동 채워짐
- npm run build 통과
</success_criteria>

<output>
완료 후 `.planning/phases/FS-fee-split/FS-02-SUMMARY.md` 생성
</output>
