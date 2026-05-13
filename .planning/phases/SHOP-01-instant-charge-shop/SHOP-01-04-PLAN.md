---
phase: SHOP-01-instant-charge-shop
plan: 04
type: execute
wave: 3
depends_on:
  - SHOP-01-01
  - SHOP-01-03
files_modified:
  - src/components/payment/PaymentsView.jsx
autonomous: true
requirements:
  - SHOP-04

must_haves:
  truths:
    - "PaymentsView에 '즉시청구' 탭이 추가되고, 탭 클릭 시 pending/approved 즉시청구 목록이 표시된다"
    - "관리자/매니저가 pending 항목을 클릭하면 승인 모달이 열린다"
    - "승인 모달에서 금액을 수정하고 승인 버튼 클릭 시 status가 'approved'로 변경된다"
    - "승인 후 알림 메시지(지정 포맷)가 자동 생성되어 '복사' 버튼이 나타난다"
    - "거절 버튼 클릭 시 인라인 거절 사유 입력 후 status가 'rejected'로 변경된다"
    - "amountPending: true인 항목은 금액 입력 없이 승인 불가 (0원 승인 차단)"
  artifacts:
    - path: "src/components/payment/PaymentsView.jsx"
      provides: "즉시청구 탭 + 관리자 승인 모달 + 알림 메시지 복사"
      contains: "즉시청구"
  key_links:
    - from: "승인 모달 승인 버튼"
      to: "updateInstantCharge firebase 함수"
      via: "onApproveInstantCharge prop"
      pattern: "onApproveInstantCharge"
    - from: "거절 버튼"
      to: "updateInstantCharge"
      via: "onRejectInstantCharge prop"
      pattern: "onRejectInstantCharge"
    - from: "알림 메시지 복사 버튼"
      to: "navigator.clipboard.writeText"
      via: "clipboard fallback 패턴"
      pattern: "clipboard"
---

<objective>
PaymentsView에 "즉시청구" 탭을 추가하고, 관리자용 승인/거절 모달과 알림 메시지 자동생성+복사 기능을 구현한다.

Purpose: 관리자가 즉시청구를 승인하고 알림 메시지를 클립보드로 복사하여 학부모에게 안내할 수 있게 한다. (D-01, D-08, D-10 per CONTEXT.md)
Output: PaymentsView 즉시청구 탭, 승인/거절 모달, 알림 메시지 복사 기능
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

From src/components/payment/PaymentsView.jsx (tabs 구조, lines 42–43):
```js
const [activeTab, setActiveTab] = useState("payments");
// 탭 렌더 위치는 수납 관리 영역 위 — 기존 "payments", "unmatched" 탭 존재
```

From src/components/payment/PaymentsView.jsx (clipboard 패턴, lines 47–49):
```js
const copyAcct = async () => {
  try { await navigator.clipboard.writeText(ACCT_MSG); } catch { const ta = document.createElement("textarea"); ta.value = ACCT_MSG; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
  setAcctToast(true); setTimeout(() => setAcctToast(false), 2500);
};
```

From src/components/payment/PaymentsView.jsx (requestsModal 승인 패턴, lines 846–893):
```jsx
{requestsModal && (
  <div className="mb" onClick={e => e.target === e.currentTarget && setRequestsModal(false)}>
    <div className="modal" style={{maxWidth:480}}>
      <div className="modal-h"><h2>강사 청구 요청</h2>...</div>
      <div className="modal-b">
        {pendingRequestStudents.map(s => (
          <div key={s.id}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{s.name}</div>
            {(s.pendingOneTimeCharges||[]).map(charge => (
              <div key={charge.id} style={{opacity:approvingId===charge.id?0.4:1}}>
                <button disabled={!!approvingId} onClick={async () => {
                  setApprovingId(charge.id);
                  // approval logic
                  setApprovingId(null);
                }}>승인</button>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  </div>
)}
```

알림 메시지 포맷 (CONTEXT.md specifics):
```
[RYE-K K-Culture Center]
{학생명} 회원님, 추가 청구 안내드립니다.

· {카테고리} — {상품명}: {금액}원

· 카카오뱅크 3333-34-5220544
  (예금주: 예케이케이컬처센터)
입금 부탁드립니다. 감사합니다.
```

rye-instant-charges 상태 머신 (D-08):
- pending → approved (금액 확정 + 관리자 승인)
- pending → rejected (거절 사유 입력 후)
- approved → paid (Wave 3 SHOP-01-05에서 구현)

From SHOP-01-01: updateInstantCharge(id, data)가 firebase.js에서 export됨.
App.jsx에서 onApproveInstantCharge/onRejectInstantCharge props로 전달 필요.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: PaymentsView 즉시청구 탭 + 승인/거절 모달 구현</name>
  <read_first>
    - src/components/payment/PaymentsView.jsx lines 1–55 (전체 imports + 초반 state)
    - src/components/payment/PaymentsView.jsx lines 255–310 (탭 버튼 렌더 영역 확인)
    - src/components/payment/PaymentsView.jsx lines 840–896 (requestsModal 패턴)
    - src/components/payment/PaymentsView.jsx lines 895–897 (파일 끝 부분)
  </read_first>
  <files>src/components/payment/PaymentsView.jsx</files>
  <action>
    **0. fmtMoney import 추가:**

    파일 상단 import 영역에 `fmtMoney`를 추가한다 (SHOP-01-03에서 이미 추가되었으므로 있으면 건너뜀):
    ```js
    import { ..., fmtMoney } from "../../utils.js";
    ```

    **1. props에 신규 파라미터 추가** (기존 `onAddInstantCharge` 다음):
    ```js
    onApproveInstantCharge,
    onRejectInstantCharge,
    ```

    **2. 신규 state 추가** (`instantReqSaving` 다음):
    ```js
    const [approveInstantModal, setApproveInstantModal] = useState(null); // null | chargeObj
    const [approveInstantAmount, setApproveInstantAmount] = useState("");
    const [approveInstantSaving, setApproveInstantSaving] = useState(false);
    const [approveInstantCopied, setApproveInstantCopied] = useState(false);
    const [approveInstantMsg, setApproveInstantMsg] = useState("");
    const [approveInstantErr, setApproveInstantErr] = useState("");
    const [rejectInstantId, setRejectInstantId] = useState(null); // 인라인 거절 확인 중인 charge id
    const [rejectReason, setRejectReason] = useState("");
    const [rejectSaving, setRejectSaving] = useState(false);
    ```

    **3. 탭 버튼 영역에 "즉시청구" 탭 추가**:
    
    기존 탭 버튼들이 있는 영역을 찾아 "즉시청구" 탭을 추가한다. 기존 `"unmatched"` 탭 다음에:
    ```jsx
    {canManageAll(currentUser.role) && (
      <button className={`ftab${activeTab === "instantCharges" ? " active" : ""}`}
        onClick={() => setActiveTab("instantCharges")}>
        즉시청구
        {pendingInstantCount > 0 && <span style={{marginLeft:4,background:"var(--blue)",color:"#fff",borderRadius:99,padding:"0 5px",fontSize:10,fontWeight:700}}>{pendingInstantCount}</span>}
      </button>
    )}
    ```

    **4. 즉시청구 탭 콘텐츠 렌더** — `activeTab === "unmatched"` 블록 다음, `requestsModal &&` 앞에:
    ```jsx
    {activeTab === "instantCharges" && canManageAll(currentUser.role) && (
      <div>
        {(() => {
          const pending = instantCharges.filter(c => c.status === "pending");
          const approved = instantCharges.filter(c => c.status === "approved");
          const all = [...pending, ...approved];
          if (all.length === 0) return (
            <div className="empty" style={{paddingTop:40}}>
              <div className="empty-txt">처리 대기 중인 즉시 청구가 없습니다.</div>
            </div>
          );
          return all.map(charge => {
            const student = students.find(s => s.id === charge.studentId);
            const teacher = teachers.find(t => t.id === charge.teacherId);
            const isPending = charge.status === "pending";
            const isApproved = charge.status === "approved";
            return (
              <div key={charge.id} className="card" style={{marginBottom:10,padding:14}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:2}}>
                      {student?.name || "알 수 없음"}
                      <span style={{marginLeft:6,fontSize:11,color:"var(--ink-60)",fontWeight:400}}>
                        {charge.itemCategory} — {charge.itemName}
                      </span>
                    </div>
                    <div style={{fontSize:12,color:"var(--ink-60)",marginBottom:4}}>
                      요청: {teacher?.name || "알 수 없음"} ·
                      {charge.amountPending ? " 금액 미정" : ` ${fmtMoney(charge.amount||0)}`} ·
                      재고 {charge.stockAvailable ? "있음" : "없음"}
                    </div>
                    {charge.note && <div style={{fontSize:11,color:"var(--ink-30)"}}>{charge.note}</div>}
                  </div>
                  <span style={{
                    fontSize:11,fontWeight:600,padding:"2px 8px",borderRadius:99,
                    background: isPending ? "var(--gold-lt)" : "var(--green-lt,rgba(34,197,94,0.1))",
                    color: isPending ? "var(--gold-dk)" : "var(--green)"
                  }}>
                    {isPending ? "승인 대기" : "승인됨"}
                  </span>
                </div>
                {/* 승인됨 상태: 알림 메시지 복사 + 입금 확인 버튼 (입금 확인은 Wave 3) */}
                {isApproved && (
                  <div style={{marginTop:8,padding:"8px 10px",background:"var(--blue-lt,rgba(59,130,246,0.08))",borderRadius:8,fontSize:12}}>
                    <div style={{marginBottom:6,color:"var(--ink-60)"}}>
                      승인 금액: <strong>{fmtMoney(charge.amount||0)}</strong>
                    </div>
                    <button className="btn btn-sm btn-secondary" style={{width:"100%"}}
                      onClick={async () => {
                        const studentName = student?.name || "회원";
                        const msg = `[RYE-K K-Culture Center]\n${studentName} 회원님, 추가 청구 안내드립니다.\n\n· ${charge.itemCategory} — ${charge.itemName}: ${fmtMoney(charge.amount||0)}\n\n· 카카오뱅크 3333-34-5220544\n  (예금주: 예케이케이컬처센터)\n입금 부탁드립니다. 감사합니다.`;
                        try { await navigator.clipboard.writeText(msg); } catch { const ta = document.createElement("textarea"); ta.value = msg; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
                        setApproveInstantCopied(charge.id);
                        setTimeout(() => setApproveInstantCopied(null), 2500);
                      }}>
                      {approveInstantCopied === charge.id ? "✓ 복사됨" : "알림 메시지 복사"}
                    </button>
                  </div>
                )}
                {/* 승인 대기: 승인 / 거절 버튼 */}
                {isPending && (
                  <div style={{marginTop:8}}>
                    {rejectInstantId === charge.id ? (
                      <div>
                        <input className="inp" style={{marginBottom:6}} value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)} placeholder="거절 사유 입력" />
                        <div style={{display:"flex",gap:6}}>
                          <button className="btn btn-danger btn-sm" disabled={rejectSaving}
                            onClick={async () => {
                              setRejectSaving(true);
                              try {
                                await onRejectInstantCharge(charge.id, rejectReason.trim() || "사유 없음");
                              } finally {
                                setRejectSaving(false);
                                setRejectInstantId(null);
                                setRejectReason("");
                              }
                            }}>
                            {rejectSaving ? "처리 중..." : "거절 확인"}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setRejectInstantId(null); setRejectReason(""); }}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <div style={{display:"flex",gap:6}}>
                        <button className="btn btn-sm" style={{flex:1,background:"var(--green-lt)",border:"1px solid var(--green)",color:"var(--green)",fontWeight:700}}
                          onClick={() => {
                            setApproveInstantModal(charge);
                            setApproveInstantAmount(charge.amountPending ? "" : String(charge.amount || ""));
                            setApproveInstantMsg("");
                          }}>
                          승인
                        </button>
                        <button className="btn btn-danger btn-sm" style={{flex:1}}
                          onClick={() => { setRejectInstantId(charge.id); setRejectReason(""); }}>
                          거절
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          });
        })()}
      </div>
    )}
    ```

    **5. 승인 모달 추가** — `requestsModal &&` 블록 바로 다음, 즉시청구 요청 모달 앞에:
    ```jsx
    {/* ── 즉시청구 승인 모달 (관리자용) ── */}
    {approveInstantModal && (
      <div className="mb" onClick={e => e.target === e.currentTarget && !approveInstantSaving && setApproveInstantModal(null)}>
        <div className="modal" style={{maxWidth:480}}>
          <div className="modal-h">
            <h2>즉시 청구 승인</h2>
            <button className="modal-close" onClick={() => !approveInstantSaving && setApproveInstantModal(null)}>{IC.x}</button>
          </div>
          <div className="modal-b">
            {(() => {
              const student = students.find(s => s.id === approveInstantModal.studentId);
              return (
                <>
                  <div style={{marginBottom:12,padding:"10px 14px",background:"var(--blue-lt,rgba(59,130,246,0.08))",borderRadius:8,fontSize:13}}>
                    <div style={{fontWeight:600,marginBottom:2}}>{student?.name || "알 수 없음"}</div>
                    <div style={{color:"var(--ink-60)"}}>{approveInstantModal.itemCategory} — {approveInstantModal.itemName}</div>
                    {approveInstantModal.note && <div style={{fontSize:12,color:"var(--ink-30)",marginTop:4}}>{approveInstantModal.note}</div>}
                  </div>
                  <div className="fg">
                    <label className="fg-label">
                      승인 금액 (원)
                      {approveInstantModal.amountPending && <span style={{marginLeft:6,fontSize:11,color:"var(--red)"}}>* 금액 미정 — 필수 입력</span>}
                    </label>
                    <input className="inp" type="number" min="1"
                      value={approveInstantAmount}
                      onChange={e => setApproveInstantAmount(e.target.value)}
                      placeholder="금액 입력" />
                  </div>
                  {approveInstantMsg && (
                    <div style={{marginTop:12,padding:"12px 14px",background:"var(--ink-5,#F8F8F8)",borderRadius:8,fontSize:12,lineHeight:1.7,whiteSpace:"pre-wrap",color:"var(--ink)"}}>
                      {approveInstantMsg}
                    </div>
                  )}
                  {approveInstantMsg && (
                    <button className="btn btn-secondary btn-sm" style={{marginTop:8,width:"100%"}}
                      onClick={async () => {
                        try { await navigator.clipboard.writeText(approveInstantMsg); } catch { const ta = document.createElement("textarea"); ta.value = approveInstantMsg; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); }
                        setApproveInstantCopied("modal");
                        setTimeout(() => setApproveInstantCopied(null), 2500);
                      }}>
                      {approveInstantCopied === "modal" ? "✓ 복사됨" : "알림 메시지 복사"}
                    </button>
                  )}
                </>
              );
            })()}
          </div>
          <div className="modal-f">
            <button className="btn btn-secondary" onClick={() => setApproveInstantModal(null)} disabled={approveInstantSaving}>닫기</button>
            <button className="btn btn-primary" disabled={approveInstantSaving}
              onClick={async () => {
                const finalAmount = parseInt(approveInstantAmount);
                if (!finalAmount || finalAmount <= 0) {
                  setApproveInstantMsg("");
                  setApproveInstantErr("금액을 입력하세요 (0원 불가)");
                  setTimeout(() => setApproveInstantErr(""), 2500);
                  return;
                }
                setApproveInstantSaving(true);
                try {
                  await onApproveInstantCharge(approveInstantModal.id, finalAmount, currentUser.name || currentUser.id);
                  // 알림 메시지 자동 생성
                  const student = students.find(s => s.id === approveInstantModal.studentId);
                  const msg = `[RYE-K K-Culture Center]\n${student?.name || "회원"} 회원님, 추가 청구 안내드립니다.\n\n· ${approveInstantModal.itemCategory} — ${approveInstantModal.itemName}: ${fmtMoney(finalAmount)}\n\n· 카카오뱅크 3333-34-5220544\n  (예금주: 예케이케이컬처센터)\n입금 부탁드립니다. 감사합니다.`;
                  setApproveInstantMsg(msg);
                } finally {
                  setApproveInstantSaving(false);
                }
              }}>
              {approveInstantSaving ? "처리 중..." : "승인"}
            </button>
          </div>
          {approveInstantErr && (
            <div style={{padding:"0 20px 12px"}}>
              <span style={{fontSize:12,color:"var(--red)",fontWeight:500}}>⚠ {approveInstantErr}</span>
            </div>
          )}
        </div>
      </div>
    )}
    ```

    주의:
    - `window.confirm/alert` 금지. 에러는 `approveInstantErr` state로 표시 — `setApproveInstantErr("...")`로 set, JSX에서 `{approveInstantErr && <div>...</div>}` 조건부 렌더.
    - 거절 확인은 인라인 UI (state `rejectInstantId`)로 구현 — 모달 없이 카드 내부에서 처리.
    - 알림 메시지는 승인 후 모달 내에서 보여주고, 탭 뷰에서도 approved 상태 카드에서 복사 가능.
    - `approveInstantCopied` 상태는 card id 또는 "modal" string을 저장하여 각 복사 버튼의 상태를 구분.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - 즉시청구 탭: `grep -c "instantCharges.*active" src/components/payment/PaymentsView.jsx` → 최소 1
    - 승인 모달: `grep -c "approveInstantModal" src/components/payment/PaymentsView.jsx` → 최소 3
    - 거절 인라인: `grep -c "rejectInstantId" src/components/payment/PaymentsView.jsx` → 최소 2
    - 알림 메시지 포맷: `grep -c "RYE-K K-Culture Center" src/components/payment/PaymentsView.jsx` → 최소 1
    - clipboard 복사: `grep -c "clipboard.writeText" src/components/payment/PaymentsView.jsx` → 최소 2
    - onApproveInstantCharge prop: `grep -c "onApproveInstantCharge" src/components/payment/PaymentsView.jsx` → 최소 2
    - onRejectInstantCharge prop: `grep -c "onRejectInstantCharge" src/components/payment/PaymentsView.jsx` → 최소 2
    - npm run build 오류 없이 통과
  </acceptance_criteria>
  <done>PaymentsView에 즉시청구 탭, 목록 뷰, 승인 모달(금액 수정+알림 메시지 생성+복사), 인라인 거절 UI가 구현됨</done>
</task>

<task type="auto">
  <name>Task 2: App.jsx에서 PaymentsView에 승인/거절 callbacks 추가</name>
  <read_first>
    - src/App.jsx lines 1034–1050 (PaymentsView 렌더 블록 — props 추가 위치)
    - src/App.jsx line 2 (firebase.js import 줄 — updateInstantCharge 추가 필요)
  </read_first>
  <files>src/App.jsx</files>
  <action>
    1. **firebase.js import — 건너뜀:** `addInstantCharge` + `updateInstantCharge` import는 SHOP-01-03 Task 2에서 이미 완성됨. 이 Task에서는 import 줄을 수정하지 않는다.

    2. **PaymentsView 렌더 블록 수정** — `onAddInstantCharge` prop 다음에 추가:
       ```jsx
       onApproveInstantCharge={async (id, amount, approvedBy) => {
         await updateInstantCharge(id, {
           status: "approved",
           amount,
           amountPending: false,
           approvedAt: Date.now(),
           approvedBy,
         });
         addLog(`즉시청구 승인 — ${amount.toLocaleString()}원`);
         showToast("즉시 청구가 승인되었습니다.");
       }}
       onRejectInstantCharge={async (id, reason) => {
         await updateInstantCharge(id, {
           status: "rejected",
           rejectedAt: Date.now(),
           rejectedReason: reason,
         });
         addLog(`즉시청구 거절 — ${reason}`);
         showToast("즉시 청구가 거절되었습니다.");
       }}
       ```

    주의:
    - `updateInstantCharge`는 Firestore `updateDoc`을 호출하며 부분 업데이트(merge)를 지원한다.
    - `saveStudents([...])` 패턴 절대 사용 금지 (이 플랜은 학생 CRUD 없음).
    - `window.confirm/alert` 금지.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - updateInstantCharge import (SHOP-01-03에서 추가됨): `grep -c "updateInstantCharge" src/App.jsx` → 최소 2 (이미 import됨 + 콜백 2개)
    - onApproveInstantCharge prop: `grep -c "onApproveInstantCharge" src/App.jsx` → 1
    - onRejectInstantCharge prop: `grep -c "onRejectInstantCharge" src/App.jsx` → 1
    - npm run build 오류 없이 통과
  </acceptance_criteria>
  <done>App.jsx에서 PaymentsView에 onApproveInstantCharge/onRejectInstantCharge props가 연결되어 승인/거절 시 Firestore가 업데이트된다</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 관리자 UI → rye-instant-charges | status 변경 (approved/rejected) |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SHOP04-01 | Elevation of Privilege | 승인 버튼 | mitigate | `canManageAll(currentUser.role)` 조건으로 관리자/매니저만 탭 접근. activeTab === "instantCharges" 콘텐츠도 동일 조건 |
| T-SHOP04-02 | Tampering | amount 조작 | mitigate | `parseInt(approveInstantAmount)` 적용, 0 이하 승인 차단 |
| T-SHOP04-03 | Information Disclosure | 알림 메시지 | accept | 클립보드 내용은 계좌번호(공개 정보)와 금액만 포함. PII 최소화 |
</threat_model>

<verification>
```bash
cd C:\Users\GIGABYTE\Coding\rye-k
npm run build
grep -c "approveInstantModal" src/components/payment/PaymentsView.jsx
# → 3 이상
grep -c "onApproveInstantCharge" src/App.jsx
# → 1
grep -c "updateInstantCharge" src/App.jsx
# → 2 이상
```
</verification>

<success_criteria>
- PaymentsView: 즉시청구 탭, 목록 뷰(pending/approved), 승인 모달(금액 수정, 승인 버튼, 알림 메시지 자동생성, 복사 버튼), 인라인 거절 UI(사유 입력)
- App.jsx: updateInstantCharge import, onApproveInstantCharge/onRejectInstantCharge props 전달
- npm run build 오류 없이 통과
</success_criteria>

<output>
완료 후 `.planning/phases/SHOP-01-instant-charge-shop/SHOP-01-04-SUMMARY.md` 생성
</output>
