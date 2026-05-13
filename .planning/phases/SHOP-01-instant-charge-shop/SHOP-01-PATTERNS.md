# Phase SHOP-01: 즉시 청구 & 상품 관리 시스템 — Pattern Map

**Mapped:** 2026-05-13
**Files analyzed:** 6 new/modified files
**Analogs found:** 6 / 6

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/firebase.js` | service | CRUD | `src/firebase.js` lines 441–479 (per-op transaction pattern) | exact |
| `src/App.jsx` | provider/store | event-driven (onSnapshot) | `src/App.jsx` lines 325–434 (KEYS listener loop) | exact |
| `src/constants.jsx` | config | — | `src/constants.jsx` lines 178–477 (existing CSS blocks) | exact |
| `src/components/payment/PaymentsView.jsx` | component | request-response | `src/components/payment/PaymentsView.jsx` lines 847–893 (requestsModal approval) | exact |
| `src/components/admin/AdminTools.jsx` | component | CRUD | `src/components/admin/AdminTools.jsx` lines 251–513 (CategoriesView) | exact |
| `src/components/dashboard/Dashboard.jsx` | component | request-response | `src/components/dashboard/Dashboard.jsx` lines 71–170 (notifications array) | exact |

---

## Pattern Assignments

### `src/firebase.js` — Add instant charge CRUD + shopItems load/save

**Analog:** `src/firebase.js` (self — per-op transaction pattern at lines 441–479)

The project uses NO independent Firestore collections today. ALL data goes through `appData` single-collection, keyed documents via `sSet(key, value)`. The D-02 decision says `rye-instant-charges` will be an independent collection — this is NEW territory. For `rye-shop-items`, use the existing `sSet` / KEYS pattern identical to `rye-fee-presets`.

**Existing imports pattern** (lines 1–2):
```js
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, onSnapshot, runTransaction } from "firebase/firestore";
```

For independent collection CRUD, add these imports to firebase.js:
```js
import {
  getFirestore, doc, setDoc, onSnapshot, runTransaction,
  collection, addDoc, updateDoc, deleteDoc, getDocs, query, where
} from "firebase/firestore";
```

**Per-op transaction pattern** (App.jsx lines 441–479) — copy this structure for instant charge state mutations:
```js
// App.jsx lines 441–448: addStudentDoc — template for addInstantChargeDoc
const addStudentDoc = async (student) => {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(_studentsRef);
    const cur = snap.exists() ? (snap.data().value || []) : [];
    tx.set(_studentsRef, { value: [...cur, student], updatedAt: Date.now() });
  });
  setStudents(prev => [...prev, student]);
};

// App.jsx lines 449–457: updateStudentDoc — template for updateInstantChargeDoc
const updateStudentDoc = async (student) => {
  if (!student?.id) throw new Error("updateStudentDoc: id 없음");
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(_studentsRef);
    const cur = snap.exists() ? (snap.data().value || []) : [];
    tx.set(_studentsRef, { value: cur.map(s => s.id === student.id ? student : s), updatedAt: Date.now() });
  });
  setStudents(prev => prev.map(s => s.id === student.id ? student : s));
};
```

**sSet pattern for appData-keyed docs** (App.jsx line 30):
```js
// For rye-shop-items: exact same pattern as rye-fee-presets
const COLLECTION = "appData";
async function sSet(k, v) {
  try {
    await setDoc(doc(db, COLLECTION, k), { value: v, updatedAt: Date.now() });
  } catch(e) {
    console.error("sSet error:", k, e);
    throw e;
  }
}
```

**Independent collection pattern for `rye-instant-charges`** (NEW — no analog exists):
Since `rye-instant-charges` is an independent Firestore collection (D-02), use Firestore native `collection()` + `addDoc()`/`updateDoc()`/`deleteDoc()` with `onSnapshot(query(...))`. This is unlike the appData pattern. Export helper functions from firebase.js so App.jsx stays clean:
```js
// New exports to add to firebase.js
export { db, auth, doc, setDoc, onSnapshot, runTransaction,
         collection, addDoc, updateDoc, deleteDoc, query, where,
         firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged };
```

**saveFeePresets analog for saveShopItems** (App.jsx line 1054):
```js
// App.jsx line 1054 — exact pattern to copy for saveShopItems
onSaveFees={async f => {
  setFeePresets(f);
  try {
    await sSet("rye-fee-presets", f);
    showToast("저장되었습니다.");
  } catch {
    showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true);
  }
}}
```

---

### `src/App.jsx` — Add instantCharges state + onSnapshot listener + shopItems state

**Analog:** `src/App.jsx` lines 223–434 (state declarations + KEYS listener loop)

**State declaration pattern** (lines 223–241) — add new states after existing ones:
```js
// App.jsx lines 223–241: existing state block (add after institutions/aiReports)
const [teachers, setTeachers] = useState([]);
const [students, setStudents] = useState([]);
// ... existing states ...
const [institutions, setInstitutions] = useState([]);
const [aiReports, setAiReports] = useState([]);
const [ryeSettings, setRyeSettings] = useState({ aiEnabled: true, aiSafeMode: false });

// NEW states to add — follow same useState([]) / useState({}) convention:
const [instantCharges, setInstantCharges] = useState([]);
const [shopItems, setShopItems] = useState({ categories: [], items: [] });
```

**KEYS listener entry pattern** (lines 325–343) — add new entries to KEYS array:
```js
// App.jsx lines 325–343: KEYS array — add two new entries
const KEYS = [
  { key: "rye-teachers",           setter: setTeachers,          default: [] },
  // ... all existing keys ...
  { key: "rye-settings",           setter: setRyeSettings,        default: { aiEnabled: true, aiSafeMode: false } },
  // ADD:
  { key: "rye-shop-items",         setter: setShopItems,          default: { categories: [], items: [] } },
  // NOTE: rye-instant-charges is an INDEPENDENT collection — NOT in KEYS array.
  // It needs its own onSnapshot listener (see below).
];
```

**onSnapshot listener pattern for independent collection** (lines 392–413):
```js
// App.jsx lines 392–413: existing setupListeners pattern
const setupListeners = () => {
  KEYS.forEach(({ key, setter, default: def }) => {
    const unsub = onSnapshot(doc(db, COLLECTION, key), (snap) => {
      const val = snap.exists() ? snap.data().value : def;
      setter(val ?? def);
      if (!(key in received)) {
        received[key] = val;
        checkAllLoaded();
      }
    }, (err) => {
      console.error("Firestore listener error:", key, err);
      setter(def);
      if (!(key in received)) {
        received[key] = null;
        checkAllLoaded();
      }
      setLoadError(err.message);
    });
    unsubscribes.push(unsub);
  });

  // NEW: independent collection listener for rye-instant-charges
  const chargesUnsub = onSnapshot(
    collection(db, "rye-instant-charges"),
    (snap) => {
      setInstantCharges(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    },
    (err) => {
      console.error("Firestore listener error: rye-instant-charges", err);
      setInstantCharges([]);
    }
  );
  unsubscribes.push(chargesUnsub);
};
```

**Save function pattern** (lines 480–493) — copy for saveShopItems:
```js
// App.jsx lines 481–482: saveCategories pattern — copy for saveShopItems
const saveCategories = async u => {
  setCategories(u);
  try { await sSet("rye-categories", u); }
  catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); }
};

// Copy pattern for saveShopItems:
const saveShopItems = async u => {
  setShopItems(u);
  try { await sSet("rye-shop-items", u); showToast("저장되었습니다."); }
  catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); }
};
```

**Dashboard prop pattern** (App.jsx line 1087 area) — add instantCharges prop:
```js
// Existing Dashboard call — add instantCharges prop
<Dashboard
  students={visible}
  teachers={teachers}
  currentUser={user}
  notices={notices}
  categories={categories}
  attendance={attendance}
  payments={payments}
  pending={pending}
  institutions={institutions}
  nav={navigate}
  onUnpaidCardClick={...}
  feePresets={feePresets}
  instantCharges={instantCharges}   // NEW prop
/>
```

---

### `src/constants.jsx` — Add CSS for new UI elements

**Analog:** `src/constants.jsx` existing CSS blocks (lines 178–477)

**Tab CSS pattern** (lines 178–182) — instant charge uses same `.ftab` / `.ftabs` classes, no new CSS needed:
```css
/* src/constants.jsx lines 178–182: existing tab styles — reuse as-is */
.ftabs{display:flex;gap:6px;overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:4px;margin-bottom:12px;scrollbar-width:none}
.ftab{padding:7px 14px;font-size:12.5px;cursor:pointer;border:1.5px solid var(--border);background:var(--paper);color:var(--ink-30);transition:all .12s;font-family:inherit;border-radius:20px;white-space:nowrap;flex-shrink:0}
.ftab.active{background:var(--blue);border-color:var(--blue);color:#fff}
```

**Badge CSS pattern** (line 358) — reuse `.unmatched-badge` or `notif-badge` for instant charge count:
```css
/* src/constants.jsx line 358: badge pattern to copy for instant charge count button */
.unmatched-badge{background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;margin-left:4px}
```

**Modal CSS** (lines 201–210) — instant charge modals use existing `.mb` / `.modal` / `.modal-h` / `.modal-b` / `.modal-f` classes:
```css
/* src/constants.jsx lines 201–210: modal classes — no new CSS needed */
.mb{position:fixed;inset:0;background:rgba(0,0,0,.4);z-index:500;display:flex;align-items:flex-end;justify-content:center;}
.modal{background:var(--paper);width:100%;max-height:95vh;overflow-y:auto;border-radius:var(--radius-lg) var(--radius-lg) 0 0;}
.modal-h{display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--paper);z-index:2;}
.modal-b{padding:20px;padding-bottom:120px;overflow-x:hidden}
.modal-f{display:flex;gap:8px;padding:14px 20px;border-top:1px solid var(--border);position:sticky;bottom:0;background:var(--paper);padding-bottom:calc(24px + var(--safe-b));z-index:3}
```

**New CSS to add** — chip selector for category tabs (즉시 청구 요청 모달 상품 유형 칩), add at end of CSS string:
```css
/* ADD to CSS string in src/constants.jsx — shop/instant charge specific */
.shop-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.shop-chip{padding:5px 12px;font-size:12px;cursor:pointer;border:1.5px solid var(--border);background:var(--paper);color:var(--ink-30);transition:all .12s;font-family:inherit;border-radius:20px;white-space:nowrap}
.shop-chip.active{background:var(--gold);border-color:var(--gold);color:#fff}
.shop-item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:12px}
.shop-item-card{border:1.5px solid var(--border);background:var(--paper);border-radius:10px;padding:10px 8px;text-align:center;cursor:pointer;transition:all .12s;font-size:12px}
.shop-item-card.selected{border-color:var(--gold);background:var(--gold-lt)}
```

---

### `src/components/payment/PaymentsView.jsx` — Add 즉시 청구 요청 button + pending section

**Analog:** `src/components/payment/PaymentsView.jsx` (self — requestsModal pattern lines 847–893, isTeacher button lines 629–638)

**State additions** (lines 31–35) — add after existing modal states:
```js
// PaymentsView.jsx lines 31–35: existing modal state pattern
const [requestsModal, setRequestsModal] = useState(false);
const [approvingId, setApprovingId] = useState(null);
const [payChargeStudent, setPayChargeStudent] = useState(null);

// ADD:
const [instantChargeModal, setInstantChargeModal] = useState(null); // null | studentObj
const [approveInstantId, setApproveInstantId] = useState(null);
```

**Header button pattern** (lines 264–273) — add 즉시 청구 button next to existing 강사 청구 요청 button:
```jsx
{/* PaymentsView.jsx lines 264–273: existing header buttons pattern */}
{canManageAll(currentUser.role) && pendingRequestStudents.length > 0 && (
  <button className="btn btn-sm" style={{background:"var(--gold-lt)",border:"1.5px solid var(--gold-dk)",color:"var(--gold-dk)",fontWeight:700,position:"relative"}} onClick={() => setRequestsModal(true)}>
    강사 청구 요청
    <span style={{marginLeft:6,background:"var(--gold-dk)",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>
      {pendingRequestStudents.reduce((n,s)=>n+(s.pendingOneTimeCharges||[]).length,0)}
    </span>
  </button>
)}
{/* ADD — 즉시 청구 pending count button (admin/manager only): */}
{canManageAll(currentUser.role) && instantChargesPending > 0 && (
  <button className="btn btn-sm" style={{background:"var(--blue-lt)",border:"1.5px solid var(--blue)",color:"var(--blue)",fontWeight:700,position:"relative"}} onClick={() => setInstantChargeModal("list")}>
    즉시 청구
    <span style={{marginLeft:6,background:"var(--blue)",color:"#fff",borderRadius:99,padding:"1px 7px",fontSize:11,fontWeight:700}}>{instantChargesPending}</span>
  </button>
)}
{/* ADD — teacher can request instant charge (visible per student card): */}
```

**Teacher in-card button pattern** (lines 629–638) — copy for 즉시 청구 요청:
```jsx
{/* PaymentsView.jsx lines 629–638: teacher "비용 청구 요청" button — copy pattern */}
{isTeacher && (
  <div style={{borderTop:"1px dashed var(--border)",paddingTop:10,marginTop:4}}>
    <button className="btn btn-secondary btn-sm" style={{width:"100%"}}
      onClick={() => setPayChargeStudent(s)}>
      + 비용 청구 요청
    </button>
  </div>
)}
{/* ADD alongside the existing button: */}
{isTeacher && (
  <button className="btn btn-sm" style={{width:"100%",marginTop:4,background:"var(--blue-lt)",color:"var(--blue)",border:"1px solid var(--blue)"}}
    onClick={(e) => { e.stopPropagation(); setInstantChargeModal(s); }}>
    즉시 청구 요청
  </button>
)}
```

**requestsModal approval modal pattern** (lines 847–893) — copy exact structure for instant charge admin approval modal:
```jsx
{/* PaymentsView.jsx lines 847–893: requestsModal structure — copy for instant charge approval modal */}
{requestsModal && (
  <div className="mb" onClick={e => e.target === e.currentTarget && setRequestsModal(false)}>
    <div className="modal" style={{maxWidth:480}}>
      <div className="modal-h">
        <h2>강사 청구 요청</h2>
        <button className="modal-close" onClick={() => setRequestsModal(false)}>{IC.x}</button>
      </div>
      <div className="modal-b">
        {pendingRequestStudents.map(s => (
          <div key={s.id} style={{marginBottom:16,borderBottom:"1px solid var(--border)",paddingBottom:12}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{s.name}</div>
            {(s.pendingOneTimeCharges||[]).map(charge => (
              <div key={charge.id} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 10px",background:"var(--gold-lt)",borderRadius:8,marginBottom:6,transition:"opacity .25s",opacity:approvingId===charge.id?0.4:1}}>
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:13}}>{charge.title}</div>
                  <div style={{fontSize:11,color:"var(--ink-60)"}}>요청: {charge.requestedBy} · {fmtMoney(charge.amount)}</div>
                </div>
                <button className="btn btn-sm" style={{background:"var(--green-lt)",border:"1px solid var(--green)",color:"var(--green)",fontWeight:700}}
                  disabled={!!approvingId}
                  onClick={async () => {
                    setApprovingId(charge.id);
                    // ... approval logic ...
                    setApprovingId(null);
                  }}>승인</button>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className="modal-f">
        <button className="btn btn-secondary" onClick={() => setRequestsModal(false)}>닫기</button>
      </div>
    </div>
  </div>
)}
```

---

### `src/components/admin/AdminTools.jsx` — Add 상품관리 tab

**Analog:** `src/components/admin/AdminTools.jsx` lines 251–513 (CategoriesView)

**Component signature pattern** (line 251) — new ShopView follows same prop pattern:
```js
// AdminTools.jsx line 251: CategoriesView signature
export function CategoriesView({ categories, onSave, feePresets, onSaveFees, onMigrateFeeSplit }) {

// Copy for ShopView:
export function ShopView({ shopItems, onSave }) {
```

**Local state pattern** (lines 252–272) — copy for ShopView:
```js
// AdminTools.jsx lines 252–272: CategoriesView local state
const [cats, setCats] = useState(JSON.parse(JSON.stringify(categories)));
const [newCat, setNewCat] = useState("");
const [dirty, setDirty] = useState(false);
const [savedFlash, setSavedFlash] = useState("");
const [errMsg, setErrMsg] = useState("");
const showErr = (msg) => { setErrMsg(msg); setTimeout(() => setErrMsg(""), 2500); };
const flashSaved = (msg = "저장됨 ✓") => { setSavedFlash(msg); setTimeout(() => setSavedFlash(""), 1800); };

// Copy for ShopView:
const [items, setItems] = useState([...(shopItems?.items || [])]);
const [shopCats, setShopCats] = useState([...(shopItems?.categories || ["의상/공연복","악세사리","악기 가방","기타"])]);
const [newCat, setNewCat] = useState("");
const [newItem, setNewItem] = useState({ category: "", name: "", defaultPrice: 0 });
const [dirty, setDirty] = useState(false);
const [savedFlash, setSavedFlash] = useState("");
const [errMsg, setErrMsg] = useState("");
```

**Page header with save button pattern** (lines 366–375):
```jsx
{/* AdminTools.jsx lines 366–375: CategoriesView header */}
<div className="ph">
  <div><h1>과목 관리</h1><div className="ph-sub">관리자 전용</div></div>
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    {savedFlash && <span style={{fontSize:12,color:"var(--green)",fontWeight:600}}>{savedFlash}</span>}
    {dirty && <button className="btn btn-primary btn-sm" onClick={handleSaveAll}>저장</button>}
  </div>
</div>
{errMsg && <div style={{margin:"0 0 10px",padding:"10px 14px",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,fontSize:13,color:"var(--red)",fontWeight:500}}>⚠ {errMsg}</div>}
```

**Item card pattern** (lines 378–448) — copy card structure for shop items:
```jsx
{/* AdminTools.jsx lines 378–406: category card header pattern */}
<div key={cat} className="card" style={{ marginBottom: 10, padding: 16 }}>
  <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom: 10 }}>
    <div style={{ display:"flex", alignItems:"center", gap:6, flex:1 }}>
      <span style={{ width:3, height:13, background:"linear-gradient(180deg,var(--blue),var(--gold))", display:"inline-block", borderRadius:2 }} />
      <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:600}}>{cat}</span>
      <span className="cat-count">{insts.length}</span>
    </div>
    <button className="btn btn-danger btn-xs" onClick={() => rmCat(cat)}>삭제</button>
  </div>
  {/* items list */}
  <div style={{ display:"flex", gap:8 }}>
    <input className="inp" style={{ flex:1 }} value={newInst[cat] || ""} onChange={...} placeholder="새 과목명" />
    <button className="btn btn-green btn-sm" onClick={() => addInst(cat)}>추가</button>
  </div>
</div>
```

**Add-category dashed card** (lines 507–513):
```jsx
{/* AdminTools.jsx lines 507–513: dashed new-category card */}
<div className="card" style={{ padding:16, borderStyle:"dashed" }}>
  <div style={{ fontFamily:"'Noto Serif KR',serif", fontSize:13, fontWeight:600, marginBottom:10 }}>새 카테고리</div>
  <div style={{ display:"flex", gap:8 }}>
    <input className="inp" style={{ flex:1 }} value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="카테고리 이름" onKeyDown={e => e.key === "Enter" && addCat()} />
    <button className="btn btn-primary btn-sm" onClick={addCat}>추가</button>
  </div>
</div>
```

**How App.jsx renders AdminTools views** (lines 1050–1054) — add ShopView in same style:
```jsx
{/* App.jsx line 1050: CategoriesView rendering */}
{view === "categories" && user.role === "admin" && <CategoriesView
  categories={categories}
  onSave={async c => { await saveCategories(c); addLog("과목 카테고리 수정"); showToast("저장되었습니다."); }}
  feePresets={feePresets}
  onSaveFees={async f => { setFeePresets(f); try { await sSet("rye-fee-presets", f); showToast("저장되었습니다."); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } }}
  ...
/>}

{/* ADD for ShopView: */}
{view === "shop" && user.role === "admin" && <ShopView
  shopItems={shopItems}
  onSave={async u => { await saveShopItems(u); addLog("상품 카탈로그 수정"); showToast("저장되었습니다."); }}
/>}
```

---

### `src/components/dashboard/Dashboard.jsx` — Add instant charge pending badge

**Analog:** `src/components/dashboard/Dashboard.jsx` lines 71–170 (notifications array pattern)

**Prop addition** (line 44) — add `instantCharges` to Dashboard props:
```js
// Dashboard.jsx line 44: existing props
export default function Dashboard({
  students, teachers, currentUser, notices, categories,
  attendance, payments, pending, institutions, nav,
  onUnpaidCardClick, feePresets = {}
}) {

// Add instantCharges prop:
export default function Dashboard({
  students, teachers, currentUser, notices, categories,
  attendance, payments, pending, institutions, nav,
  onUnpaidCardClick, feePresets = {},
  instantCharges = []   // NEW
}) {
```

**Notification push pattern** (lines 119–128) — copy exact pattern for instant charge pending badge:
```jsx
// Dashboard.jsx lines 119–128: 등록 대기 and 강사 비용 청구 요청 patterns
// 4. 등록 대기 알림
if (canManageAll(currentUser.role) && pending && pending.length > 0) {
  notifications.push({
    type: "blue",
    text: <><strong>등록 대기 {pending.length}건</strong> — 승인이 필요합니다</>,
    key: "pending",
    onClick: () => nav("pending")
  });
}
// 4.5. 강사 비용 청구 요청 알림
if (canManageAll(currentUser.role)) {
  const pendingChargeCount = students.reduce((n, s) => n + (s.pendingOneTimeCharges||[]).length, 0);
  if (pendingChargeCount > 0) {
    notifications.push({
      type: "gold",
      text: <><strong>💡 강사 비용 청구 요청 {pendingChargeCount}건</strong> — 수납 관리에서 확인 후 승인하세요</>,
      key: "charge-req",
      onClick: () => nav("payments")
    });
  }
}

// ADD after 4.5 — instant charge pending:
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

**Notification render pattern** (lines 154–170) — no changes needed, same `.notif-card` / `.notif-item` / `.notif-dot` classes apply:
```jsx
// Dashboard.jsx lines 154–170: notification rendering — reuse as-is
{notifications.length > 0 && (
  <div className="notif-card" style={{marginBottom:16}}>
    <div className="notif-hd">
      {IC.notif}
      <span className="notif-hd-title">알림</span>
      <span className="notif-badge">{notifications.length}</span>
    </div>
    {notifications.map(n => (
      <div key={n.key} className="notif-item" onClick={n.onClick} style={n.onClick ? {cursor:"pointer"} : {}}>
        <div className={`notif-dot ${n.type}`} />
        <div className="notif-text">{n.text}</div>
        {n.onClick && <span style={{color:"var(--ink-30)",fontSize:14}}>›</span>}
      </div>
    ))}
  </div>
)}
```

---

## Shared Patterns

### Modal pattern
**Source:** Any modal in `src/components/admin/AdminTools.jsx` (PendingView lines 157–186) and `src/components/payment/PaymentsView.jsx` (lines 847–893)
**Apply to:** 즉시 청구 요청 모달 (teacher), 관리자 승인 모달 (admin)
```jsx
{/* Standard modal shell — copy for ALL new modals */}
<div className="mb" onClick={e => e.target === e.currentTarget && setModal(null)}>
  <div className="modal" style={{maxWidth:480}}>
    <div className="modal-h">
      <h2>모달 제목</h2>
      <button className="modal-close" onClick={() => setModal(null)}>{IC.x}</button>
    </div>
    <div className="modal-b">
      {/* content */}
    </div>
    <div className="modal-f">
      <button className="btn btn-secondary" onClick={() => setModal(null)}>취소</button>
      <button className="btn btn-primary" onClick={handleSubmit}>확인</button>
    </div>
  </div>
</div>
```

### Toast pattern
**Source:** `src/App.jsx` line 436
**Apply to:** All async save operations
```js
// App.jsx line 436: showToast
const showToast = (msg, isError = false) => {
  setToast({msg, isError});
  setTimeout(() => setToast(null), 2400);
};
```

### window.confirm 금지 — inline confirm pattern
**Source:** `src/components/admin/AdminTools.jsx` lines 531–558 (마이그레이션 confirm inline)
**Apply to:** 거절(reject) 확인, 삭제 확인
```jsx
{/* Replace window.confirm with inline state toggle */}
{!rejectConfirm ? (
  <button className="btn btn-danger btn-sm" onClick={() => setRejectConfirm(true)}>거절</button>
) : (
  <div style={{display:"flex",gap:8,alignItems:"center"}}>
    <span style={{fontSize:12,color:"var(--red)",fontWeight:600}}>정말 거절하시겠습니까?</span>
    <button className="btn btn-danger btn-sm" onClick={handleReject}>예</button>
    <button className="btn btn-secondary btn-sm" onClick={() => setRejectConfirm(false)}>아니오</button>
  </div>
)}
```

### Clipboard copy pattern
**Source:** `src/components/payment/PaymentsView.jsx` lines 47–49
**Apply to:** 알림 메시지 복사 버튼 in 관리자 승인 모달
```js
// PaymentsView.jsx lines 47–49: copyAcct — copy for 알림 메시지 복사
const copyAcct = async () => {
  try {
    await navigator.clipboard.writeText(ACCT_MSG);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = ACCT_MSG;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  }
  setAcctToast(true);
  setTimeout(() => setAcctToast(false), 2500);
};
```

### uid() for new document IDs
**Source:** `src/utils.js` (imported in App.jsx line 4 via `{ uid }`)
**Apply to:** All new Firestore document creation
```js
// Usage pattern from PaymentsView.jsx line 108:
id: existing?.id || uid(),
```

### Error display pattern (no window.alert)
**Source:** `src/components/admin/AdminTools.jsx` lines 272–273, 375
**Apply to:** All validation errors in new modals
```js
// AdminTools.jsx lines 272–274: inline error with auto-clear
const showErr = (msg) => { setErrMsg(msg); setTimeout(() => setErrMsg(""), 2500); };
// Render:
{errMsg && <div style={{margin:"0 0 10px",padding:"10px 14px",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,fontSize:13,color:"var(--red)",fontWeight:500}}>⚠ {errMsg}</div>}
```

### fmtMoney formatting
**Source:** `src/utils.js` (used everywhere)
**Apply to:** All amount displays
```js
// Always use fmtMoney() from utils.js — never format manually
import { fmtMoney } from "../../utils.js";
fmtMoney(amount) // → "50,000원"
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| Independent Firestore collection listener for `rye-instant-charges` | service | event-driven | All current Firestore access is through `appData` single-collection keyed docs. Independent `collection()` + `onSnapshot(collection(...))` is new territory. Use standard Firebase SDK pattern. |
| Clipboard-triggered 알림 메시지 composing | utility | transform | Message auto-generation from template is new, but clipboard copy pattern exists (PaymentsView line 47–49). |

---

## Metadata

**Analog search scope:** `src/`, `src/components/payment/`, `src/components/admin/`, `src/components/dashboard/`, `src/firebase.js`, `src/constants.jsx`
**Files scanned:** 6 source files read in full or via targeted sections
**Pattern extraction date:** 2026-05-13
