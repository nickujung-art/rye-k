---
phase: BW-bugfix-waves
plan: "06"
type: execute
wave: 6
depends_on: [BW-05]
files_modified:
  - src/App.jsx
  - src/components/payment/PaymentsView.jsx
autonomous: true

must_haves:
  truths:
    - "미처리 입금 카드에 '삭제' 버튼이 있고, 클릭 시 unmatchedPayments에서 해당 항목이 제거된다"
    - "drainPending 처리 후 matched+unmatched 전체 입금 이력이 rye-payment-log에 append된다"
    - "PaymentsView에 '입금 내역' 탭이 있고 입금자명·금액·날짜·매칭여부가 표시된다"
  artifacts:
    - path: "src/App.jsx"
      provides: "paymentLog state, savePaymentLog, KEYS 등록, drainPending 로그 append, PaymentsView 전달"
    - path: "src/components/payment/PaymentsView.jsx"
      provides: "개별 삭제 버튼, 입금 내역 탭 + PaymentLogTab 컴포넌트"
---

<objective>
카카오뱅크 자동수납 Wave 3 — 기능 추가 2건.

1. 개별 삭제: 미처리 입금 카드에 '삭제' 버튼 추가.
   클릭 시 unmatchedPayments에서 해당 항목만 제거, Firestore 저장.

2. 입금 로그: drainPending 완료 시 matched+unmatched 전체를 rye-payment-log에 누적.
   PaymentsView에 "입금 내역" 탭 추가 — 입금자명, 금액, 날짜, 매칭여부 표시.
</objective>

## Tasks

### T1 — UnmatchedPaymentsTab: 미처리 항목 삭제 버튼

**파일**: `src/components/payment/PaymentsView.jsx`

<read_first>
- src/components/payment/PaymentsView.jsx (line 888-999 — UnmatchedPaymentsTab)
</read_first>

<action>
**Step A**: `handleMatch` 함수(line ~904) 직전에 `handleDismiss` 함수 추가.

```jsx
// 추가 (handleMatch 앞에 삽입):
const handleDismiss = async (id) => {
  const target = unmatchedPayments.find(u => u.id === id);
  const upd = unmatchedPayments.filter(u => u.id !== id);
  await onSaveUnmatched(upd);
  onLog(`미처리 입금 삭제 — ${target?.senderName || "알 수 없음"} ${(target?.amount || 0).toLocaleString()}원`);
};
```

**Step B**: pending 카드 액션 영역(line ~969-997, `<div style={{display:"flex",flexDirection:"column"...}}>`의 마지막 button 뒤)에 삭제 버튼 추가.

```jsx
// 기존 "✓ 수납 처리" 버튼 뒤에 추가:
<button
  className="btn btn-sm"
  style={{background:"var(--ink-10)",color:"var(--red)",border:"none",fontSize:11,marginTop:2}}
  disabled={!!matchingId}
  onClick={() => handleDismiss(u.id)}
>
  × 삭제
</button>
```
</action>

<acceptance_criteria>
- src/components/payment/PaymentsView.jsx에 `handleDismiss` 함수 존재
- src/components/payment/PaymentsView.jsx에 `× 삭제` 문자열 존재
</acceptance_criteria>

### T2 — App.jsx: paymentLog state + savePaymentLog + KEYS 등록

**파일**: `src/App.jsx`

<read_first>
- src/App.jsx (line 236 — unmatchedPayments state)
- src/App.jsx (line 338 — rye-unmatched-payments in KEYS)
- src/App.jsx (line 482-486 — saveUnmatchedPayments)
</read_first>

<action>
**Step A**: line 236 (`const [unmatchedPayments...`) 바로 다음에 paymentLog state 추가.

```js
// 추가 (line 237, unmatchedPayments state 다음):
const [paymentLog, setPaymentLog] = useState([]);
```

**Step B**: line 338 (`rye-unmatched-payments` KEYS 항목) 다음에 paymentLog KEYS 항목 추가.

```js
// Before (line 338):
      { key: "rye-unmatched-payments", setter: setUnmatchedPayments, default: [] },

// After:
      { key: "rye-unmatched-payments", setter: setUnmatchedPayments, default: [] },
      { key: "rye-payment-log", setter: setPaymentLog, default: [] },
```

**Step C**: line 482-486 (`saveUnmatchedPayments`) 다음에 `savePaymentLog` 함수 추가.

```js
// 추가 (saveUnmatchedPayments 다음):
const savePaymentLog = async u => {
  setPaymentLog(u);
  try { await sSet("rye-payment-log", u); }
  catch (e) { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); throw e; }
};
```
</action>

<acceptance_criteria>
- src/App.jsx에 `paymentLog` state 선언 존재
- src/App.jsx에 `rye-payment-log` 문자열 존재 (KEYS 등록)
- src/App.jsx에 `savePaymentLog` 함수 존재
</acceptance_criteria>

### T3 — App.jsx drainPending: 입금 로그 append

**파일**: `src/App.jsx`

<read_first>
- src/App.jsx (BW-04 T4 결과: savePayments(merged) ~ allNew 블록 — line ~557-568)
</read_first>

<action>
drainPending 내 `savePayments(merged)` 직후, shortfalls 블록 앞에 로그 append 코드 삽입.

```js
// 추가 (await savePayments(merged); 바로 다음):
// 입금 로그 누적
const logEntries = [
  ...matched.map(r => ({
    id: r.id,
    senderName: r.senderName || "",
    amount: r.amount || 0,
    timestamp: r.matchedAt || r.createdAt,
    matched: true,
    studentId: r.matchedStudentId || null,
    source: "kakaobank",
    createdAt: r.createdAt,
  })),
  ...unmatched.map(r => ({
    id: r.id,
    senderName: r.senderName || "",
    amount: r.amount || 0,
    timestamp: r.createdAt,
    matched: false,
    studentId: null,
    source: "kakaobank",
    createdAt: r.createdAt,
  })),
];
if (logEntries.length > 0) {
  const updLog = [...paymentLog, ...logEntries];
  await savePaymentLog(updLog);
}
```
</action>

<acceptance_criteria>
- src/App.jsx에 `rye-payment-log` 데이터를 저장하는 `savePaymentLog` 호출 존재
- src/App.jsx drainPending에 `logEntries` 변수 존재
</acceptance_criteria>

### T4 — App.jsx: PaymentsView에 paymentLog + savePaymentLog 전달

**파일**: `src/App.jsx`

<read_first>
- src/App.jsx (line 965-975 — PaymentsView JSX)
</read_first>

<action>
PaymentsView JSX의 `onSaveUnmatched={saveUnmatchedPayments}` 다음에 두 prop 추가.

```jsx
// Before:
              onSaveUnmatched={saveUnmatchedPayments}
              initFilterUnpaid={paymentsInitFilter}

// After:
              onSaveUnmatched={saveUnmatchedPayments}
              paymentLog={paymentLog}
              onSavePaymentLog={savePaymentLog}
              initFilterUnpaid={paymentsInitFilter}
```
</action>

<acceptance_criteria>
- src/App.jsx PaymentsView JSX에 `paymentLog={paymentLog}` prop 존재
</acceptance_criteria>

### T5 — PaymentsView: 입금 내역 탭 + PaymentLogTab 컴포넌트

**파일**: `src/components/payment/PaymentsView.jsx`

<read_first>
- src/components/payment/PaymentsView.jsx (line 9-17 — props, line 40 — activeTab state)
- src/components/payment/PaymentsView.jsx (line 285-299 — ftabs 탭 버튼)
- src/components/payment/PaymentsView.jsx (line 414-427 — unmatched 탭 렌더)
</read_first>

<action>
**Step A**: PaymentsView 함수 props에 `paymentLog = [], onSavePaymentLog` 추가.

```jsx
// Before (line 9-17):
export default function PaymentsView({
  students, teachers, currentUser, payments, onSavePayments, onLog,
  attendance = [], onSaveStudents,
  unmatchedPayments = [],
  onSaveUnmatched,
  initFilterUnpaid = false,
  onMountFilterConsumed,
  feePresets = {},
}) {

// After:
export default function PaymentsView({
  students, teachers, currentUser, payments, onSavePayments, onLog,
  attendance = [], onSaveStudents,
  unmatchedPayments = [],
  onSaveUnmatched,
  paymentLog = [],
  onSavePaymentLog,
  initFilterUnpaid = false,
  onMountFilterConsumed,
  feePresets = {},
}) {
```

**Step B**: ftabs 버튼 영역(line 285-298)에 "입금 내역" 탭 버튼 추가.

```jsx
// Before (line 289-296, 미매칭 탭 버튼 다음):
        </div>
      )}

// After (미매칭 입금 button 닫는 태그 다음에 삽입):
          <button className={`ftab${activeTab==="log"?" active":""}`}
            onClick={() => setActiveTab("log")}>
            입금 내역
            {paymentLog.length > 0 && (
              <span className="unmatched-badge" style={{background:"var(--ink-30)"}}>
                {paymentLog.length}
              </span>
            )}
          </button>
```

(정확히: 기존 미매칭 탭 `</button>` 닫힘 다음, `</div>` 닫힘 전에 삽입)

**Step C**: activeTab === "unmatched" 렌더 블록(line 414-427) 다음에 log 탭 렌더 추가.

```jsx
// 추가 (unmatched 탭 블록 다음):
      {activeTab === "log" && canManageAll(currentUser.role) && (
        <PaymentLogTab paymentLog={paymentLog} students={students} />
      )}
```

**Step D**: UnmatchedPaymentsTab 컴포넌트(파일 끝 부근) 다음에 PaymentLogTab 컴포넌트 추가.

```jsx
function PaymentLogTab({ paymentLog, students }) {
  const sorted = [...paymentLog].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  if (sorted.length === 0) {
    return (
      <div className="empty" style={{paddingTop:40}}>
        <div className="empty-txt">입금 내역이 없습니다.</div>
        <div style={{fontSize:12,color:"var(--ink-30)",marginTop:6}}>
          카카오뱅크 자동수납 처리 시 여기에 기록됩니다.
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:8,fontWeight:600}}>
        입금 이력 {sorted.length}건
      </div>
      {sorted.map(entry => {
        const s = entry.studentId ? students.find(st => st.id === entry.studentId) : null;
        return (
          <div key={entry.id} className="unmatched-card">
            <div style={{flex:1,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:13.5,fontWeight:700}}>{entry.senderName || "알 수 없음"}</span>
                <span style={{
                  fontSize:10,fontWeight:700,padding:"1px 5px",borderRadius:8,
                  background: entry.matched ? "var(--green)" : "var(--ink-20)",
                  color: entry.matched ? "#fff" : "var(--ink-60)",
                }}>
                  {entry.matched ? (s ? `→ ${s.name}` : "자동매칭") : "미매칭"}
                </span>
              </div>
              <div style={{fontSize:12,color:"var(--green)",fontWeight:600}}>
                {(entry.amount || 0).toLocaleString()}원
              </div>
              <div style={{fontSize:11,color:"var(--ink-30)"}}>
                {entry.timestamp
                  ? new Date(entry.timestamp).toLocaleString("ko-KR", {month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})
                  : ""}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```
</action>

<acceptance_criteria>
- src/components/payment/PaymentsView.jsx에 `paymentLog` prop 선언 존재
- src/components/payment/PaymentsView.jsx에 `입금 내역` 탭 버튼 문자열 존재
- src/components/payment/PaymentsView.jsx에 `PaymentLogTab` 컴포넌트 선언 존재
- src/components/payment/PaymentsView.jsx에 `activeTab === "log"` 조건 존재
</acceptance_criteria>

## Verification
- `npm run build` 통과
- `grep -n "handleDismiss" src/components/payment/PaymentsView.jsx` — 결과 존재
- `grep -n "rye-payment-log" src/App.jsx` — 결과 존재
- `grep -n "PaymentLogTab" src/components/payment/PaymentsView.jsx` — 결과 존재
- `grep -n "입금 내역" src/components/payment/PaymentsView.jsx` — 결과 존재
