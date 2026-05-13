---
phase: SHOP-01-instant-charge-shop
plan: 05
type: execute
wave: 3
depends_on:
  - SHOP-01-03
  - SHOP-01-04
files_modified:
  - src/components/payment/PaymentsView.jsx
  - src/components/dashboard/Dashboard.jsx
  - src/App.jsx
autonomous: true
requirements:
  - SHOP-05
  - SHOP-07

must_haves:
  truths:
    - "관리자가 approved 상태 즉시청구 카드에서 '입금 확인' 버튼을 클릭할 수 있다"
    - "입금 확인 처리 시 rye-instant-charges 문서의 status가 'paid'로 변경된다"
    - "동시에 rye-payments에 type: 'instant' 독립 레코드가 생성된다"
    - "대시보드 알림 카드에 즉시청구 pending 건수 배지가 표시된다"
    - "배지 클릭 시 payments 뷰로 이동한다"
  artifacts:
    - path: "src/components/payment/PaymentsView.jsx"
      provides: "입금 확인 버튼 + 처리 로직"
      contains: "입금 확인"
    - path: "src/components/dashboard/Dashboard.jsx"
      provides: "즉시청구 pending 알림 배지"
      contains: "즉시 청구 요청"
    - path: "src/App.jsx"
      provides: "Dashboard에 instantCharges prop, PaymentsView에 onConfirmInstantPayment prop"
      contains: "onConfirmInstantPayment"
  key_links:
    - from: "PaymentsView 입금 확인 버튼"
      to: "updateInstantCharge + savePayments"
      via: "onConfirmInstantPayment prop callback"
      pattern: "onConfirmInstantPayment"
    - from: "Dashboard notification"
      to: "nav('payments')"
      via: "instantCharges.filter(c => c.status === 'pending').length"
      pattern: "즉시 청구 요청"
---

<objective>
즉시청구 입금 확인 처리(status: 'paid' + rye-payments 레코드 생성)와 대시보드 pending 건수 배지를 구현한다.

Purpose: 관리자가 입금 확인 후 수납 레코드를 자동 생성하고, 대시보드에서 즉시청구 대기 건수를 한눈에 확인할 수 있게 한다. (D-09, SHOP-05, SHOP-07 per CONTEXT.md)
Output: PaymentsView 입금 확인 버튼, Dashboard 배지, App.jsx props 연결
</objective>

<execution_context>
@C:\Users\GIGABYTE\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\GIGABYTE\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\GIGABYTE\Coding\rye-k\.planning\ROADMAP.md
@C:\Users\GIGABYTE\Coding\rye-k\.planning\phases\SHOP-01-instant-charge-shop\SHOP-01-CONTEXT.md
@C:\Users\GIGABYTE\Coding\rye-k\.planning\phases\SHOP-01-instant-charge-shop\SHOP-01-PATTERNS.md

<interfaces>
<!-- 실행 전 반드시 읽어야 할 현재 코드 인터페이스 -->

From src/components/payment/PaymentsView.jsx (approved 카드 영역 — SHOP-01-04에서 추가됨):
```jsx
{isApproved && (
  <div style={{marginTop:8,padding:"8px 10px",background:"var(--blue-lt,...)",borderRadius:8,fontSize:12}}>
    <div style={{marginBottom:6,color:"var(--ink-60)"}}>
      승인 금액: <strong>{fmtMoney(charge.amount||0)}</strong>
    </div>
    <button className="btn btn-sm btn-secondary" style={{width:"100%"}} onClick={...}>
      알림 메시지 복사
    </button>
    {/* ← 여기에 "입금 확인" 버튼 추가 */}
  </div>
)}
```

From src/components/dashboard/Dashboard.jsx (notifications 배열, lines 118–128):
```js
// 4.5. 강사 비용 청구 요청 알림
if (canManageAll(currentUser.role)) {
  const pendingChargeCount = students.reduce((n, s) => n + (s.pendingOneTimeCharges||[]).length, 0);
  if (pendingChargeCount > 0) {
    notifications.push({ type: "gold", text: <><strong>💡 강사 비용 청구 요청 {pendingChargeCount}건</strong>...</>, key: "charge-req", onClick: () => nav("payments") });
  }
}
// ← 여기 다음에 즉시청구 pending 배지 추가
```

From src/components/dashboard/Dashboard.jsx (prop 시그니처, line 44):
```js
export default function Dashboard({ students, teachers, currentUser, notices, categories, attendance, payments, pending, institutions, nav, onUnpaidCardClick, feePresets = {} }) {
// instantCharges = [] prop 추가 필요
```

From src/App.jsx (payments savePayments pattern, line 483):
```js
const savePayments = async u => { setPayments(u); try { await sSet("rye-payments", u); } catch (e) { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); throw e; } };
```

rye-payments record 포맷 (기존 레코드 구조):
```js
{
  id: string,          // uid()
  studentId: string,
  month: string,       // "YYYY-MM" — 생성일 기준 KST 월
  amount: number,
  paid: true,
  paidAmount: number,
  paidDate: string,    // TODAY_STR
  method: "transfer",
  note: string,
  type: "instant",     // NEW — 즉시청구 구분 필드
  instantChargeId: string, // NEW — rye-instant-charges 참조 ID
  createdAt: number,
}
```

D-09 결정: status: "paid" 변경과 동시에 rye-payments에 type: "instant" 레코드 생성.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: PaymentsView 입금 확인 버튼 추가</name>
  <read_first>
    - src/components/payment/PaymentsView.jsx lines 1–20 (prop 시그니처 — onConfirmInstantPayment 추가 위치)
    - src/components/payment/PaymentsView.jsx: approved 카드 블록 (SHOP-01-04에서 추가된 isApproved 영역 찾기)
  </read_first>
  <files>src/components/payment/PaymentsView.jsx</files>
  <action>
    **1. props에 신규 파라미터 추가** (기존 `onRejectInstantCharge` 다음):
    ```js
    onConfirmInstantPayment,
    ```

    **2. 신규 state 추가** (`rejectSaving` 다음):
    ```js
    const [confirmingPaymentId, setConfirmingPaymentId] = useState(null);
    ```

    **3. isApproved 블록 내 "입금 확인" 버튼 추가**:
    
    기존 "알림 메시지 복사" 버튼 다음에 추가:
    ```jsx
    <button className="btn btn-sm btn-primary" style={{width:"100%",marginTop:6}}
      disabled={confirmingPaymentId === charge.id}
      onClick={async () => {
        setConfirmingPaymentId(charge.id);
        try {
          await onConfirmInstantPayment(charge, student);
        } finally {
          setConfirmingPaymentId(null);
        }
      }}>
      {confirmingPaymentId === charge.id ? "처리 중..." : "입금 확인"}
    </button>
    ```

    주의:
    - `student` 변수는 이미 즉시청구 탭 목록 렌더 로직 내부에서 `students.find(s => s.id === charge.studentId)`로 정의되어 있다 (SHOP-01-04에서 구현됨).
    - `window.confirm/alert` 금지 — 이중 클릭 차단은 `confirmingPaymentId` state로 처리.
    - `saveStudents([...])` 패턴 절대 사용 금지.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - 입금 확인 버튼: `grep -c "입금 확인" src/components/payment/PaymentsView.jsx` → 최소 1
    - onConfirmInstantPayment prop: `grep -c "onConfirmInstantPayment" src/components/payment/PaymentsView.jsx` → 최소 2
    - confirmingPaymentId state: `grep -c "confirmingPaymentId" src/components/payment/PaymentsView.jsx` → 최소 2
    - npm run build 오류 없이 통과
  </acceptance_criteria>
  <done>approved 상태 즉시청구 카드에 "입금 확인" 버튼이 추가되고, 클릭 시 onConfirmInstantPayment가 호출된다</done>
</task>

<task type="auto">
  <name>Task 2: Dashboard 배지 + App.jsx 콜백 연결</name>
  <read_first>
    - src/components/dashboard/Dashboard.jsx lines 44–55 (prop 시그니처 + 초반 계산)
    - src/components/dashboard/Dashboard.jsx lines 118–130 (4.5 강사 비용 청구 요청 알림 — 추가 위치)
    - src/App.jsx lines 1023–1033 (Dashboard 렌더 블록)
    - src/App.jsx lines 1034–1055 (PaymentsView 렌더 블록)
    - src/App.jsx lines 483–493 (savePayments 함수)
  </read_first>
  <files>src/components/dashboard/Dashboard.jsx, src/App.jsx</files>
  <action>
    **Dashboard.jsx 수정:**

    1. prop 시그니처에 `instantCharges = []` 추가:
       ```js
       export default function Dashboard({
         students, teachers, currentUser, notices, categories,
         attendance, payments, pending, institutions, nav,
         onUnpaidCardClick, feePresets = {},
         instantCharges = []   // NEW — SHOP-07
       }) {
       ```

    2. 알림 배지 추가 — `// 4.5. 강사 비용 청구 요청 알림` 블록 끝 다음에 추가:
       ```js
       // 4.6. 즉시 청구 요청 배지 (SHOP-07)
       if (canManageAll(currentUser.role)) {
         const pendingInstantCount = instantCharges.filter(c => c.status === "pending").length;
         if (pendingInstantCount > 0) {
           notifications.push({
             type: "blue",
             text: <><strong>🛍 즉시 청구 요청 {pendingInstantCount}건</strong> — 수납 관리에서 승인하세요</>,
             key: "instant-charge",
             onClick: () => nav("payments")
           });
         }
       }
       ```

    **0. fmtMoney import 확인:** PaymentsView.jsx에 fmtMoney import가 SHOP-01-03에서 이미 추가되어 있어야 한다. App.jsx의 경우 addLog에서 사용하므로 별도 import 불필요.

    **App.jsx 수정:**

    1. **Dashboard 렌더 블록** — `instantCharges={instantCharges}` prop은 SHOP-01-01에서 이미 추가됨. 확인 후 없으면 추가.

    2. **PaymentsView 렌더 블록** — `onRejectInstantCharge` prop 다음에 `onConfirmInstantPayment` 추가:
       ```jsx
       onConfirmInstantPayment={async (charge, student) => {
         // 1. rye-instant-charges status → "paid"
         await updateInstantCharge(charge.id, {
           status: "paid",
           paidAt: Date.now(),
           paymentId: charge.id + "_pay",
         });

         // 2. rye-payments에 type:"instant" 독립 레코드 추가
         const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000);
         const payMonth = kstNow.toISOString().slice(0, 7); // "YYYY-MM"
         const payRecord = {
           id: charge.id + "_pay",
           studentId: charge.studentId,
           month: payMonth,
           amount: charge.amount,
           paid: true,
           paidAmount: charge.amount,
           paidDate: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10),
           method: "transfer",
           note: `즉시청구 — ${charge.itemCategory} ${charge.itemName}`,
           type: "instant",
           instantChargeId: charge.id,
           createdAt: Date.now(),
         };
         const updatedPayments = [...payments, payRecord];
         await savePayments(updatedPayments);

         addLog(`즉시청구 입금 확인 — ${student?.name || "알 수 없음"} ${fmtMoney(charge.amount||0)}`);
         showToast("입금 확인 완료. 수납 레코드가 생성되었습니다.");
       }}
       ```

    주의:
    - `savePayments`는 `rye-payments` 배열 전체를 덮어씀 — 이것은 학생 데이터가 아닌 payments 전용 함수이므로 허용됨 (saveStudents 금지와 무관).
    - payment record의 `id`는 `charge.id + "_pay"` 패턴으로 즉시청구 참조 추적 가능.
    - 중복 방지: `payments.some(p => p.instantChargeId === charge.id)`로 이미 처리된 경우 재처리 방지가 이상적이지만, instantCharges의 status === "approved" 필터가 이미 guard 역할을 함.
    - `saveStudents([...])` 패턴 절대 사용 금지.
    - `window.confirm/alert` 금지.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - Dashboard instantCharges prop: `grep -c "instantCharges" src/components/dashboard/Dashboard.jsx` → 최소 2 (prop + filter)
    - 즉시 청구 알림: `grep -c "즉시 청구 요청" src/components/dashboard/Dashboard.jsx` → 최소 1
    - App.jsx onConfirmInstantPayment: `grep -c "onConfirmInstantPayment" src/App.jsx` → 최소 1
    - type: "instant" payment: `grep -c "type.*instant" src/App.jsx` → 최소 1
    - npm run build 오류 없이 통과
  </acceptance_criteria>
  <done>Dashboard에 즉시청구 pending 배지가 표시되고, 입금 확인 시 rye-instant-charges status가 'paid'로 변경되며 rye-payments에 type:'instant' 레코드가 생성된다</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 관리자 UI → rye-payments | 즉시청구 입금 확인 시 payment 레코드 생성 |
| 관리자 UI → rye-instant-charges | status: 'paid' 변경 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SHOP05-01 | Elevation of Privilege | 입금 확인 버튼 | mitigate | `canManageAll(currentUser.role)` 조건으로 관리자/매니저만 즉시청구 탭 접근 — 강사는 입금 확인 불가 |
| T-SHOP05-02 | Tampering | payment 레코드 amount | accept | amount는 승인 시 관리자가 확정한 값을 그대로 사용. 별도 조작 경로 없음 |
| T-SHOP05-03 | Repudiation | 즉시청구 처리 이력 | mitigate | addLog()로 처리자·금액·학생명 기록. paidAt 타임스탬프 저장 |
</threat_model>

<verification>
```bash
cd C:\Users\GIGABYTE\Coding\rye-k
npm run build
grep -c "onConfirmInstantPayment" src/App.jsx
# → 1
grep -c "즉시 청구 요청" src/components/dashboard/Dashboard.jsx
# → 1
grep -c "입금 확인" src/components/payment/PaymentsView.jsx
# → 1
grep -c "type.*instant" src/App.jsx
# → 1
```

전체 Phase 검증:
```bash
# 5개 플랜 모두 완료 후:
npm run build
# 빌드 성공 = SHOP-01 Phase 완료
```
</verification>

<success_criteria>
- PaymentsView: approved 카드에 "입금 확인" 버튼, onConfirmInstantPayment prop 수신
- Dashboard: instantCharges prop 수신, pending 건수 알림 배지(type:"blue", key:"instant-charge")
- App.jsx: onConfirmInstantPayment 콜백(updateInstantCharge status→paid + savePayments type:instant 레코드)
- npm run build 오류 없이 통과
- 전체 5개 PLAN 완료 후 즉시청구 전체 흐름(요청→승인→알림→입금확인→수납레코드) 정상 동작
</success_criteria>

<output>
완료 후 `.planning/phases/SHOP-01-instant-charge-shop/SHOP-01-05-SUMMARY.md` 생성
</output>
