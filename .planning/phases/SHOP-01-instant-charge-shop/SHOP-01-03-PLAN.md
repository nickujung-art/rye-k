---
phase: SHOP-01-instant-charge-shop
plan: 03
type: execute
wave: 2
depends_on:
  - SHOP-01-01
files_modified:
  - src/components/payment/PaymentsView.jsx
  - src/App.jsx
autonomous: true
requirements:
  - SHOP-03

must_haves:
  truths:
    - "강사 역할 사용자가 PaymentsView 학생 카드에서 '즉시 청구 요청' 버튼을 볼 수 있다"
    - "버튼 클릭 시 즉시청구 요청 모달이 열린다"
    - "모달에서 카테고리 칩 선택 → 카탈로그 상품 선택 또는 직접 입력 → 금액 입력 → 재고여부 선택 → 메모 입력 후 요청 전송이 가능하다"
    - "금액 미정 체크박스 선택 시 금액 입력 필드가 비활성화된다"
    - "요청 전송 시 addInstantCharge가 호출되어 rye-instant-charges에 status: 'pending' 문서가 생성된다"
    - "관리자/매니저 역할에게는 헤더에 pending 즉시청구 건수 버튼이 표시된다"
  artifacts:
    - path: "src/components/payment/PaymentsView.jsx"
      provides: "즉시 청구 요청 모달 + 헤더 건수 버튼"
      contains: "즉시 청구 요청"
    - path: "src/App.jsx"
      provides: "PaymentsView에 instantCharges/shopItems/onAddInstantCharge props 전달"
      contains: "instantCharges={instantCharges}"
  key_links:
    - from: "PaymentsView 강사 카드 버튼"
      to: "addInstantCharge firebase 함수"
      via: "onAddInstantCharge prop callback"
      pattern: "onAddInstantCharge"
    - from: "PaymentsView header"
      to: "pending count display"
      via: "instantCharges.filter(c => c.status === 'pending').length"
      pattern: "status.*pending"
---

<objective>
PaymentsView에 강사용 즉시 청구 요청 모달을 구현하고, 관리자/매니저용 pending 건수 헤더 버튼을 추가하며, App.jsx에서 필요한 props를 연결한다.

Purpose: 강사가 한복·악세사리·악기가방 등 상품 판매 시 즉시 청구를 요청하는 UI를 제공한다. (D-07, SHOP-03 per CONTEXT.md)
Output: PaymentsView 즉시청구 요청 모달, 헤더 버튼, App.jsx props 연결
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

From src/components/payment/PaymentsView.jsx (prop 시그니처, lines 9–19):
```js
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

From src/components/payment/PaymentsView.jsx (modal state, lines 31–36):
```js
const [requestsModal, setRequestsModal] = useState(false);
const [approvingId, setApprovingId] = useState(null);
const [alimtalkModal, setAlimtalkModal] = useState(null);
const [payChargeStudent, setPayChargeStudent] = useState(null);
const [quickPayingId, setQuickPayingId] = useState(null);
```

From src/components/payment/PaymentsView.jsx (isTeacher 버튼 영역, lines 629–638):
```jsx
{isTeacher && (
  <div style={{borderTop:"1px dashed var(--border)",paddingTop:10,marginTop:4}}>
    <button className="btn btn-secondary btn-sm" style={{width:"100%"}} onClick={() => setPayChargeStudent(s)}>+ 비용 청구 요청</button>
    {(s?.pendingOneTimeCharges||[]).length > 0 && (
      <div style={{fontSize:11,color:"var(--gold-dk)",background:"var(--gold-lt)",borderRadius:8,padding:"5px 10px",marginTop:6}}>
        승인 대기: {(s.pendingOneTimeCharges||[]).map(c=>`${c.title||c.type} ${(c.amount||0).toLocaleString()}원`).join(" · ")}
      </div>
    )}
  </div>
)}
```

From src/components/payment/PaymentsView.jsx (헤더 버튼 영역, 강사 청구 요청 버튼, lines 264–273):
```jsx
{canManageAll(currentUser.role) && pendingRequestStudents.length > 0 && (
  <button className="btn btn-sm" style={{background:"var(--gold-lt)",border:"1.5px solid var(--gold-dk)",color:"var(--gold-dk)",fontWeight:700,position:"relative"}} onClick={() => setRequestsModal(true)}>
    강사 청구 요청
    <span style={{marginLeft:6,background:"var(--gold-dk)",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>
      {pendingRequestStudents.reduce((n,s)=>n+(s.pendingOneTimeCharges||[]).length,0)}
    </span>
  </button>
)}
```

From src/App.jsx (PaymentsView 렌더, lines 1034–1046):
```jsx
{view === "payments" && <PaymentsView
  students={allMembers} teachers={teachers} currentUser={user} payments={payments}
  attendance={attendance}
  onSavePayments={async (upd) => { await savePayments(upd); showToast("수납 정보가 저장되었습니다."); }}
  onSaveStudents={async (upd) => {
    const realUpd = upd.filter(s => !s.isInstitution);
    await batchStudentDocs(realUpd);
  }} onLog={addLog}
  unmatchedPayments={unmatchedPayments}
  onSaveUnmatched={saveUnmatchedPayments}
  paymentLog={paymentLog}
  onSavePaymentLog={savePaymentLog}
  initFilterUnpaid={paymentsInitFilter}
  onMountFilterConsumed={() => setPaymentsInitFilter(false)}
  feePresets={feePresets}
/>}
```

From src/firebase.js (새로 추가된 함수 — SHOP-01-01에서 추가):
```js
export async function addInstantCharge(data) { ... } // rye-instant-charges에 새 문서 추가
```

Data model (CONTEXT.md 확정):
```js
// rye-instant-charges 문서
{
  id: string,           // addDoc 자동 생성 (반환값 .id)
  studentId: string,
  teacherId: string,
  itemCategory: "의상/공연복" | "악세사리" | "악기 가방" | "기타",
  itemName: string,
  amount: number,
  amountPending: boolean,
  stockAvailable: boolean,
  status: "pending",    // 생성 시 항상 pending
  note: string,
  createdAt: number,    // Date.now()
  approvedAt: null,
  approvedBy: null,
  rejectedAt: null,
  rejectedReason: null,
  paidAt: null,
  paymentId: null,
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: PaymentsView에 즉시청구 요청 모달 + 헤더 버튼 추가</name>
  <read_first>
    - src/components/payment/PaymentsView.jsx lines 1–50 (imports, prop 시그니처, state 선언, ACCT_MSG)
    - src/components/payment/PaymentsView.jsx lines 255–290 (헤더 버튼 영역)
    - src/components/payment/PaymentsView.jsx lines 625–645 (isTeacher 버튼 영역)
    - src/components/payment/PaymentsView.jsx lines 840–896 (requestsModal 패턴 — 즉시청구 승인 모달 모델)
  </read_first>
  <files>src/components/payment/PaymentsView.jsx</files>
  <action>
    **0. fmtMoney import 추가:**

    파일 상단 import 영역에 `fmtMoney`를 추가한다:
    ```js
    import { ..., fmtMoney } from "../../utils.js";
    ```
    (기존 utils.js import 줄에 fmtMoney를 추가하거나, import 줄이 없으면 새 줄로 추가)

    **1. props에 신규 파라미터 추가:**
    
    기존 `feePresets = {}` 뒤에 추가:
    ```js
    instantCharges = [],
    shopItems = { categories: ["의상/공연복","악세사리","악기 가방","기타"], items: [] },
    onAddInstantCharge,
    ```

    **2. 새 state 변수 추가** (기존 `const [quickPayingId, setQuickPayingId] = useState(null);` 다음):
    ```js
    const [instantReqModal, setInstantReqModal] = useState(null); // null | studentObj
    const [instantReqForm, setInstantReqForm] = useState({
      category: "",
      itemName: "",
      amount: "",
      amountPending: false,
      stockAvailable: true,
      note: "",
    });
    const [instantReqSaving, setInstantReqSaving] = useState(false);
    const [instantReqErr, setInstantReqErr] = useState("");
    ```

    **3. 파생 변수 추가** (기존 `const pendingRequestStudents = ...` 다음):
    ```js
    const pendingInstantCount = instantCharges.filter(c => c.status === "pending").length;
    ```

    **4. 헤더 버튼 추가** — 기존 강사 청구 요청 버튼(`setRequestsModal(true)`) 바로 다음에:
    ```jsx
    {canManageAll(currentUser.role) && pendingInstantCount > 0 && (
      <button className="btn btn-sm"
        style={{background:"var(--blue-lt)",border:"1.5px solid var(--blue)",color:"var(--blue)",fontWeight:700}}
        onClick={() => setActiveTab("instantCharges")}>
        즉시 청구
        <span style={{marginLeft:6,background:"var(--blue)",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>{pendingInstantCount}</span>
      </button>
    )}
    ```
    
    주의: 기존 `activeTab` state와 탭 버튼들이 있으므로 `setActiveTab("instantCharges")`는 Wave 2 SHOP-01-04에서 실제 처리. 이번에는 버튼만 추가한다.

    **5. 강사 카드에 즉시 청구 요청 버튼 추가** — 기존 `{isTeacher && (...)}` 블록 내 `+ 비용 청구 요청` 버튼 다음에 추가:
    ```jsx
    {isTeacher && (
      <button className="btn btn-sm" style={{width:"100%",marginTop:4,background:"var(--blue-lt)",color:"var(--blue)",border:"1px solid var(--blue)"}}
        onClick={(e) => {
          e.stopPropagation();
          setInstantReqForm({ category: shopItems?.categories?.[0] || "기타", itemName: "", amount: "", amountPending: false, stockAvailable: true, note: "" });
          setInstantReqModal(s);
        }}>
        즉시 청구 요청
      </button>
    )}
    ```

    **6. 즉시청구 요청 모달 추가** — `requestsModal &&` 블록과 같은 레벨에 추가 (파일 끝 `</div>` 직전, `requestsModal` JSX 블록 다음):

    ```jsx
    {/* ── 즉시 청구 요청 모달 (강사용) ── */}
    {instantReqModal && (
      <div className="mb" onClick={e => e.target === e.currentTarget && setInstantReqModal(null)}>
        <div className="modal" style={{maxWidth:480}}>
          <div className="modal-h">
            <h2>{instantReqModal.name} — 즉시 청구 요청</h2>
            <button className="modal-close" onClick={() => setInstantReqModal(null)}>{IC.x}</button>
          </div>
          <div className="modal-b">
            {instantReqErr && <div style={{marginBottom:10,padding:"10px 14px",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,fontSize:13,color:"var(--red)",fontWeight:500}}>⚠ {instantReqErr}</div>}

            {/* 카테고리 칩 */}
            <div className="fg-label" style={{marginBottom:6}}>상품 유형</div>
            <div className="shop-chips">
              {(shopItems?.categories || ["의상/공연복","악세사리","악기 가방","기타"]).map(cat => (
                <button key={cat} className={`shop-chip${instantReqForm.category === cat ? " active" : ""}`}
                  onClick={() => setInstantReqForm(f => ({ ...f, category: cat, itemName: "" }))}>
                  {cat}
                </button>
              ))}
            </div>

            {/* 카탈로그 상품 선택 (해당 카테고리 활성 상품) */}
            {(() => {
              const catItems = (shopItems?.items || []).filter(i => i.category === instantReqForm.category && i.active !== false);
              if (catItems.length === 0) return null;
              return (
                <>
                  <div className="fg-label" style={{marginBottom:6}}>카탈로그 선택 (선택사항)</div>
                  <div className="shop-item-grid" style={{marginBottom:12}}>
                    {catItems.map(item => (
                      <button key={item.id}
                        className={`shop-item-card${instantReqForm.itemName === item.name ? " selected" : ""}`}
                        onClick={() => setInstantReqForm(f => ({
                          ...f,
                          itemName: item.name,
                          amount: item.defaultPrice > 0 ? String(item.defaultPrice) : f.amount,
                          amountPending: item.defaultPrice <= 0,
                        }))}>
                        <div style={{fontWeight:600,marginBottom:2}}>{item.name}</div>
                        <div style={{color:"var(--ink-60)",fontSize:11}}>{item.defaultPrice > 0 ? fmtMoney(item.defaultPrice) : "가격 미정"}</div>
                      </button>
                    ))}
                  </div>
                </>
              );
            })()}

            {/* 상품명 직접 입력 */}
            <div className="fg">
              <label className="fg-label">상품명</label>
              <input className="inp" value={instantReqForm.itemName}
                onChange={e => setInstantReqForm(f => ({ ...f, itemName: e.target.value }))}
                placeholder="상품명 입력 또는 위에서 선택" />
            </div>

            {/* 금액 */}
            <div className="fg">
              <label className="fg-label">금액 (원)</label>
              <input className="inp" type="number" min="0"
                value={instantReqForm.amountPending ? "" : instantReqForm.amount}
                disabled={instantReqForm.amountPending}
                onChange={e => setInstantReqForm(f => ({ ...f, amount: e.target.value }))}
                placeholder={instantReqForm.amountPending ? "금액 미정" : "금액 입력"} />
              <label style={{display:"flex",alignItems:"center",gap:6,marginTop:6,fontSize:12,color:"var(--ink-60)",cursor:"pointer"}}>
                <input type="checkbox" checked={instantReqForm.amountPending}
                  onChange={e => setInstantReqForm(f => ({ ...f, amountPending: e.target.checked, amount: e.target.checked ? "" : f.amount }))} />
                금액 미정 (관리자가 승인 시 입력)
              </label>
            </div>

            {/* 재고 여부 */}
            <div className="fg">
              <label className="fg-label">재고 여부</label>
              <div style={{display:"flex",gap:8}}>
                <button className={`btn btn-sm${instantReqForm.stockAvailable ? " btn-primary" : " btn-secondary"}`}
                  onClick={() => setInstantReqForm(f => ({ ...f, stockAvailable: true }))}>
                  재고 있음
                </button>
                <button className={`btn btn-sm${!instantReqForm.stockAvailable ? " btn-danger" : " btn-secondary"}`}
                  onClick={() => setInstantReqForm(f => ({ ...f, stockAvailable: false }))}>
                  재고 없음
                </button>
              </div>
            </div>

            {/* 메모 */}
            <div className="fg">
              <label className="fg-label">메모 (선택)</label>
              <input className="inp" value={instantReqForm.note}
                onChange={e => setInstantReqForm(f => ({ ...f, note: e.target.value }))}
                placeholder="추가 메모" />
            </div>
          </div>
          <div className="modal-f">
            <button className="btn btn-secondary" onClick={() => setInstantReqModal(null)} disabled={instantReqSaving}>취소</button>
            <button className="btn btn-primary" disabled={instantReqSaving}
              onClick={async () => {
                const { category, itemName, amount, amountPending, stockAvailable, note } = instantReqForm;
                if (!itemName.trim()) { setInstantReqErr("상품명을 입력하세요."); setTimeout(() => setInstantReqErr(""), 2500); return; }
                if (!amountPending && (!amount || parseInt(amount) <= 0)) { setInstantReqErr("금액을 입력하거나 '금액 미정'을 선택하세요."); setTimeout(() => setInstantReqErr(""), 2500); return; }
                setInstantReqSaving(true);
                try {
                  await onAddInstantCharge({
                    studentId: instantReqModal.id,
                    teacherId: currentUser.id,
                    itemCategory: category,
                    itemName: itemName.trim(),
                    amount: amountPending ? 0 : parseInt(amount),
                    amountPending,
                    stockAvailable,
                    status: "pending",
                    note: note.trim(),
                    approvedAt: null, approvedBy: null,
                    rejectedAt: null, rejectedReason: null,
                    paidAt: null, paymentId: null,
                  });
                  setInstantReqModal(null);
                } catch {
                  setInstantReqErr("요청 전송에 실패했습니다. 다시 시도해주세요.");
                  setTimeout(() => setInstantReqErr(""), 3000);
                } finally {
                  setInstantReqSaving(false);
                }
              }}>
              {instantReqSaving ? "전송 중..." : "요청 전송"}
            </button>
          </div>
        </div>
      </div>
    )}
    ```

    주의:
    - `window.confirm/alert` 사용 금지. 에러는 모달 내 인라인 `instantReqErr` 상태로 표시.
    - `onAddInstantCharge` prop이 없으면 버튼이 에러를 표시하지 않도록 `onClick` 내부에서 함수 존재 여부 확인.
    - `stopPropagation()`으로 학생 카드 클릭 이벤트 버블링 차단.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - 즉시 청구 요청 모달: `grep -c "즉시 청구 요청" src/components/payment/PaymentsView.jsx` → 최소 2
    - instantReqModal state: `grep -c "instantReqModal" src/components/payment/PaymentsView.jsx` → 최소 3
    - instantCharges prop: `grep -c "instantCharges" src/components/payment/PaymentsView.jsx` → 최소 2
    - onAddInstantCharge prop: `grep -c "onAddInstantCharge" src/components/payment/PaymentsView.jsx` → 최소 2
    - pendingInstantCount 파생 변수: `grep -c "pendingInstantCount" src/components/payment/PaymentsView.jsx` → 최소 1
    - npm run build 오류 없이 통과
  </acceptance_criteria>
  <done>PaymentsView에 즉시청구 요청 모달(강사용)과 헤더 pending 건수 버튼(관리자/매니저용)이 구현됨</done>
</task>

<task type="auto">
  <name>Task 2: App.jsx에서 PaymentsView에 신규 props 연결</name>
  <read_first>
    - src/App.jsx lines 1034–1046 (PaymentsView 렌더 블록 — props 추가 위치)
    - src/App.jsx lines 440–480 (addInstantCharge 임포트 여부 확인 필요)
    - src/firebase.js (addInstantCharge export 확인 — SHOP-01-01에서 추가됨)
  </read_first>
  <files>src/App.jsx</files>
  <action>
    1. **firebase.js import 수정** (line 2): `addInstantCharge`를 named import로 추가한다:
       ```js
       import { db, auth, doc, setDoc, onSnapshot, runTransaction, collection, addInstantCharge, updateInstantCharge, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged } from "./firebase.js";
       ```

       주의: SHOP-01-04도 updateInstantCharge를 사용하므로 이 import가 최종 완성본이다. SHOP-01-04의 Task 2는 import 줄을 건드리지 않는다.

    2. **PaymentsView 렌더 블록 수정** — `feePresets={feePresets}` 다음에 세 props를 추가한다:
       ```jsx
       instantCharges={instantCharges}
       shopItems={shopItems}
       onAddInstantCharge={async (data) => {
         await addInstantCharge(data);
         addLog(`${data.itemCategory} — ${data.itemName} 즉시청구 요청`);
         showToast("즉시 청구 요청이 전송되었습니다.");
       }}
       ```

    주의:
    - `addInstantCharge`는 `addDoc`을 wrapping하므로 반환값은 DocumentReference. App.jsx에서는 반환값을 사용하지 않아도 됨.
    - `instantCharges` state는 SHOP-01-01에서 추가됨 (onSnapshot 리스너가 자동 업데이트).
    - `shopItems` state도 SHOP-01-01에서 추가됨.
    - `saveStudents([...])` 패턴 절대 사용 금지.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - addInstantCharge import: `grep -c "addInstantCharge" src/App.jsx` → 최소 2 (import + onAddInstantCharge 콜백)
    - PaymentsView에 instantCharges prop: `grep -c "instantCharges={instantCharges}" src/App.jsx` → 2 (Dashboard + PaymentsView)
    - PaymentsView에 shopItems prop: `grep -c "shopItems={shopItems}" src/App.jsx` → 1
    - PaymentsView에 onAddInstantCharge prop: `grep -c "onAddInstantCharge" src/App.jsx` → 1
    - npm run build 오류 없이 통과
  </acceptance_criteria>
  <done>App.jsx에서 PaymentsView에 instantCharges, shopItems, onAddInstantCharge props가 전달되어 즉시청구 요청 모달이 실제로 Firestore에 쓸 수 있게 된다</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 강사 UI → Firestore rye-instant-charges | 강사가 즉시청구 요청 생성 (write) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SHOP03-01 | Elevation of Privilege | 즉시청구 요청 버튼 | mitigate | `isTeacher` 조건으로 강사 역할만 버튼 노출. `teacherId: currentUser.id` 요청에 포함 — 관리자가 승인 시 요청자 확인 가능 |
| T-SHOP03-02 | Tampering | amount 필드 | mitigate | `parseInt(amount)` 적용으로 문자열 삽입 방지. 0원 이하 요청은 "금액 미정"으로만 가능 |
| T-SHOP03-03 | Denial of Service | 반복 요청 전송 | accept | `instantReqSaving` 플래그로 중복 클릭 차단. 학원 내부 앱이므로 외부 공격 위협 낮음 |
</threat_model>

<verification>
```bash
cd C:\Users\GIGABYTE\Coding\rye-k
npm run build
grep -c "즉시 청구 요청" src/components/payment/PaymentsView.jsx
# → 2 이상
grep -c "onAddInstantCharge" src/App.jsx
# → 1 이상
grep -c "instantCharges={instantCharges}" src/App.jsx
# → 2 이상 (Dashboard + PaymentsView)
```
</verification>

<success_criteria>
- PaymentsView: instantCharges/shopItems/onAddInstantCharge props 수신, 강사 카드에 "즉시 청구 요청" 버튼, 모달 구현(카테고리 칩, 카탈로그 선택, 직접입력, 금액미정 체크박스, 재고여부, 메모)
- App.jsx: addInstantCharge import, PaymentsView에 3개 신규 props 전달
- npm run build 오류 없이 통과
</success_criteria>

<output>
완료 후 `.planning/phases/SHOP-01-instant-charge-shop/SHOP-01-03-SUMMARY.md` 생성
</output>
