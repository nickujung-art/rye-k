---
phase: FS-fee-split
plan: 03
type: execute
wave: 2
depends_on:
  - FS-01
files_modified:
  - src/components/payment/PaymentsView.jsx
  - src/components/dashboard/Dashboard.jsx
autonomous: true
requirements:
  - FS-FEE-04
  - FS-FEE-05

must_haves:
  truths:
    - "PaymentsView의 autoFee()가 calcTotalFee 기반으로 동작한다"
    - "PaymentsView의 인라인 수강료 입력 필드(fee-inp-cell)가 더 이상 단일 monthlyFee를 수정하지 않는다"
    - "Dashboard의 미납 금액 계산이 calcTotalFee를 사용한다"
    - "PaymentsView 수납 상세 모달에 과목별 수강료 breakdown이 표시된다"
  artifacts:
    - path: "src/components/payment/PaymentsView.jsx"
      provides: "autoFee calcTotalFee 기반 교체, 상세 모달 breakdown 표시"
      contains: "calcTotalFee"
    - path: "src/components/dashboard/Dashboard.jsx"
      provides: "미납 금액 계산에 calcTotalFee 사용"
      contains: "calcTotalFee"
  key_links:
    - from: "PaymentsView.autoFee"
      to: "utils.calcTotalFee"
      via: "직접 호출 교체"
      pattern: "calcTotalFee"
    - from: "Dashboard.unpaidAmount"
      to: "utils.calcTotalFee"
      via: "직접 호출 교체"
      pattern: "calcTotalFee"
---

<objective>
PaymentsView와 Dashboard에서 s.monthlyFee 직접 참조를 calcTotalFee 기반으로 교체하고, 수납 상세 모달에 과목별 수강료 breakdown을 추가한다. PaymentsView 인라인 fee 편집 입력창은 더 이상 필요없으므로 제거한다.

Purpose: 수납 화면에서 lessons[].fee 기반 금액이 정확하게 표시되고, 과목별 breakdown으로 수납 내역을 투명하게 보여준다.

Output: PaymentsView.jsx — autoFee 교체, 인라인 fee 입력 제거, 상세 모달 breakdown 추가. Dashboard.jsx — calcTotalFee 교체.
</objective>

<execution_context>
@C:\Users\GIGABYTE\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\GIGABYTE\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\GIGABYTE\Coding\rye-k\src\components\payment\PaymentsView.jsx
@C:\Users\GIGABYTE\Coding\rye-k\src\components\dashboard\Dashboard.jsx
@C:\Users\GIGABYTE\Coding\rye-k\src\utils.js
@C:\Users\GIGABYTE\Coding\rye-k\CLAUDE.md

<interfaces>
<!-- FS-01에서 추가된 유틸 함수 -->
// src/utils.js (FS-01 완료 후)
export function calcTotalFee(student, feePresets): number
// feePresets 없이 호출해도 됨 (null/undefined 안전)

<!-- PaymentsView 현재 시그니처 -->
export default function PaymentsView({
  students, teachers, currentUser, payments, onSavePayments, onLog,
  attendance, onSaveStudents,
  unmatchedPayments, onSaveUnmatched,
  initFilterUnpaid, onMountFilterConsumed,
})
// feePresets prop이 현재 없음 → 추가 필요

<!-- PaymentsView 핵심 현재 코드 참고 -->
// line 59: const autoFee = (s) => (s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0);
// line 395-416: 인라인 fee 입력 필드 (fee-inp-cell, feeEdits state, savingFeeId state)
//   onBlur에서 onSaveStudents([{ ...s, monthlyFee: feeEdits[s.id] }]) 호출

<!-- Dashboard 현재 코드 -->
// line 59: return sum + (p?.amount ?? ((s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0)));
// Dashboard props: { students, teachers, currentUser, notices, categories, attendance, payments, pending, institutions, nav, onUnpaidCardClick }

<!-- App.jsx PaymentsView 호출 (참고 — 수정 안함) -->
// view === "payments" && <PaymentsView students={allMembers} teachers={teachers} .../>
// feePresets을 prop으로 추가해야 함 (App.jsx 수정 필요 — 이 플랜에서 처리)

<!-- App.jsx Dashboard 호출 (참고 — 수정 안함) -->
// <Dashboard ... /> → feePresets prop 없음 — 이 플랜에서 추가

<!-- App.jsx에서 feePresets 상태 -->
// const [feePresets, setFeePresets] = useState({});
// 이미 MainApp에 존재 — prop으로 내려주기만 하면 됨
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: PaymentsView — autoFee 교체, 인라인 fee 편집 제거, 상세 모달 breakdown 추가</name>
  <read_first>
    - src/components/payment/PaymentsView.jsx (전체. 특히 lines 1-5 import, line 59 autoFee, lines 39-41 feeEdits/savingFeeId state, lines 389-419 fee-inp-cell 블록, lines 459-645 수납 상세 모달)
  </read_first>
  <files>src/components/payment/PaymentsView.jsx</files>
  <action>
**5곳 수정:**

**1. import에 calcTotalFee 추가 (line 4):**
```js
import { canManageAll, monthLabel, fmtMoney, fmtDateShort, fmtDate, calcAge, isMinor, instTypeLabel, uid, sendAligoMessage, calcTotalFee } from "../../utils.js";
```

**2. props에 feePresets 추가 (line 9-16):**
```jsx
export default function PaymentsView({
  students, teachers, currentUser, payments, onSavePayments, onLog,
  attendance = [], onSaveStudents,
  unmatchedPayments = [],
  onSaveUnmatched,
  initFilterUnpaid = false,
  onMountFilterConsumed,
  feePresets = {},
})
```

**3. autoFee 함수 교체 (line 59):**
```js
// 기존:
const autoFee = (s) => (s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0);
// 변경 후:
const autoFee = (s) => calcTotalFee(s, feePresets);
```
autoFee는 이후에도 그대로 호출되므로 함수 이름은 유지한다.

**4. 인라인 fee 편집 블록 제거:**
다음 3가지를 제거한다:
- `const [feeEdits, setFeeEdits] = useState({});` state 선언
- `const [savingFeeId, setSavingFeeId] = useState(null);` state 선언
- pay-row-actions 내부의 `<div className="fee-inp-cell">...</div>` 블록 전체 (lines 389-419 부근). 단, 입금 버튼(✓ 입금)과 알림톡 버튼(💬)은 유지한다.

인라인 fee 편집을 제거하는 이유: 수강료는 이제 StudentFormModal에서 레슨별로 편집하는 것이 정석이며, 인라인 단일 monthlyFee 수정은 lessons[].fee와 충돌을 유발한다.

**5. 수납 상세 모달에 과목별 breakdown 추가:**
editingId 모달 내부 (`!isTeacher` 조건 아래 수강료 입력 필드 `<div className="fg">` 블록)에서, 수강료 금액 input 위에 과목별 breakdown 표시를 추가한다. extraSum > 0 조건 블록(기존 합계 breakdown, lines 612-625) 앞에 아래 JSX를 삽입:

```jsx
{/* 과목별 수강료 breakdown — lessons[].fee 있을 때만 표시 */}
{canManageAll(currentUser.role) && !isTeacher && s && (s.lessons || []).some(l => l.fee > 0) && (
  <div style={{ background: "var(--blue-lt)", border: "1px solid rgba(43,58,159,.15)", borderRadius: 8, padding: "8px 12px", marginBottom: 8, fontSize: 12 }}>
    <div style={{ fontWeight: 600, color: "var(--blue)", marginBottom: 4, fontSize: 11 }}>과목별 수강료</div>
    {(s.lessons || []).map(l => (
      <div key={l.instrument} style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 2 }}>
        <span>{l.instrument}</span>
        <span>{l.fee > 0 ? fmtMoney(l.fee) : <span style={{ color: "var(--ink-30)" }}>미설정</span>}</span>
      </div>
    ))}
    {s.instrumentRental && (
      <div style={{ display: "flex", justifyContent: "space-between", color: "var(--ink-60)", marginBottom: 2 }}>
        <span>악기 대여료</span>
        <span>{fmtMoney(s.rentalFee || 0)}</span>
      </div>
    )}
  </div>
)}
```

**주의사항:**
- `window.confirm` / `window.alert` 사용 금지
- UnmatchedPaymentsTab 컴포넌트는 이미 autoFee를 prop으로 받아 사용 중 → autoFee 함수 자체는 유지하므로 UnmatchedPaymentsTab 변경 불필요
- openBulkPrep, confirmBulkPrep, openEdit 등 기존 autoFee 호출은 그대로 유지 (함수 이름 변경 없음)
  </action>
  <verify>
    <automated>cd /c/Users/GIGABYTE/Coding/rye-k && grep -n "calcTotalFee\|feePresets" src/components/payment/PaymentsView.jsx | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `import { ..., calcTotalFee }` from utils.js 포함
    - `feePresets = {}` prop 추가
    - `const autoFee = (s) => calcTotalFee(s, feePresets);` 로 교체됨
    - `feeEdits` state 선언 제거됨
    - `savingFeeId` state 선언 제거됨
    - `fee-inp-cell` div 블록 제거됨
    - 수납 상세 모달에 과목별 breakdown JSX 존재 (`과목별 수강료` 텍스트 포함)
    - `window.confirm`/`window.alert` 미사용
    - npm run build 통과
  </acceptance_criteria>
  <done>PaymentsView가 calcTotalFee 기반으로 동작하고 과목별 breakdown이 상세 모달에 표시됨</done>
</task>

<task type="auto">
  <name>Task 2: Dashboard calcTotalFee 교체 + App.jsx prop 연결</name>
  <read_first>
    - src/components/dashboard/Dashboard.jsx (lines 1-65 import, unpaidAmount 계산)
    - src/App.jsx (PaymentsView 렌더 줄 ~958, Dashboard 렌더 줄 찾기 위해 grep "Dashboard" 필요)
  </read_first>
  <files>
    src/components/dashboard/Dashboard.jsx
    src/App.jsx
  </files>
  <action>
**Dashboard.jsx 2곳 수정:**

1. **import에 calcTotalFee 추가 (line 3):**
```js
import { canManageAll, fmtDateTime, fmtDateShort, fmtMoney, isMinor, monthLabel, getContractDaysLeft, allLessonInsts, computeMonthlyAttStats, computeWeeklyAttRates, calcTotalFee } from "../../utils.js";
```

2. **props에 feePresets 추가 (line 44):**
```jsx
export default function Dashboard({ students, teachers, currentUser, notices, categories, attendance, payments, pending, institutions, nav, onUnpaidCardClick, feePresets = {} })
```

3. **unpaidAmount 계산 교체 (lines 56-60):**
```js
// 기존:
return sum + (p?.amount ?? ((s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0)));
// 변경 후:
return sum + (p?.amount ?? calcTotalFee(s, feePresets));
```

**App.jsx 2곳 수정 (feePresets prop 전달):**

App.jsx에서 `view === "payments"` PaymentsView 렌더 줄을 찾아 `feePresets={feePresets}` prop을 추가한다:
```jsx
{view === "payments" && <PaymentsView
  students={allMembers}
  teachers={teachers}
  currentUser={user}
  payments={payments}
  attendance={attendance}
  onSavePayments={async (upd) => { await savePayments(upd); showToast("수납 정보가 저장되었습니다."); }}
  onSaveStudents={async (upd) => { ... }}
  feePresets={feePresets}
  ...나머지 기존 props 유지...
/>}
```

App.jsx에서 Dashboard 렌더 줄을 찾아 `feePresets={feePresets}` prop을 추가한다:
```jsx
<Dashboard
  students={...}
  teachers={teachers}
  ...나머지 기존 props 유지...
  feePresets={feePresets}
/>
```

App.jsx 수정 시 주의사항:
- 기존 props 순서 및 내용 변경 금지 (feePresets만 추가)
- PaymentsView 렌더는 한 줄에 길게 작성된 JSX이므로 Edit tool의 str_replace로 정밀하게 추가
- saveStudents 금지 규칙 적수 — batchStudentDocs/updateStudentDoc 패턴 유지

**주의사항:**
- `window.confirm` / `window.alert` 사용 금지
- App.jsx의 다른 로직 건드리지 않음
  </action>
  <verify>
    <automated>cd /c/Users/GIGABYTE/Coding/rye-k && grep -n "calcTotalFee\|feePresets" src/components/dashboard/Dashboard.jsx && grep -n "feePresets" src/App.jsx | grep -v "setFeePresets\|useState\|saveFees\|sSet\|CategoriesView\|StudentFormModal"</automated>
  </verify>
  <acceptance_criteria>
    - Dashboard.jsx에 `calcTotalFee` import 및 `feePresets = {}` prop 존재
    - Dashboard.jsx unpaidAmount 계산에 `calcTotalFee(s, feePresets)` 사용
    - App.jsx PaymentsView 렌더에 `feePresets={feePresets}` prop 존재
    - App.jsx Dashboard 렌더에 `feePresets={feePresets}` prop 존재
    - `window.confirm`/`window.alert` 미사용
    - npm run build 통과
  </acceptance_criteria>
  <done>Dashboard 미납 금액이 calcTotalFee 기반으로 계산되고 App.jsx에서 feePresets이 PaymentsView, Dashboard에 전달됨</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| PaymentsView → onSavePayments | 수납 기록 Firestore 저장 |
| App.jsx → PaymentsView | feePresets 데이터 흐름 (읽기 전용 prop) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-FS-03-01 | Information Disclosure | 수강료 금액 표시 | mitigate | canManageAll 체크 유지 — 강사에게는 금액 숨김 패턴 그대로 |
| T-FS-03-02 | Tampering | autoFee 계산 | accept | calcTotalFee는 순수 함수, feePresets은 admin만 수정 가능 |
</threat_model>

<verification>
npm run build 통과

수동 확인:
- Dashboard 미납 금액 카드가 올바른 금액 표시 (lessons[].fee 합산)
- PaymentsView 수납 상세 모달에서 과목별 수강료 breakdown 확인
- 인라인 fee 입력창이 pay-row에서 제거됨
- 강사 뷰에서 금액이 여전히 숨겨짐
</verification>

<success_criteria>
- PaymentsView.autoFee가 calcTotalFee 기반으로 동작
- 인라인 단일 monthlyFee 편집 입력창 제거
- 수납 상세 모달에 과목별 breakdown 표시
- Dashboard 미납 금액 calcTotalFee 기반
- feePresets이 App.jsx에서 PaymentsView, Dashboard로 전달됨
- npm run build 통과
</success_criteria>

<output>
완료 후 `.planning/phases/FS-fee-split/FS-03-SUMMARY.md` 생성
</output>
