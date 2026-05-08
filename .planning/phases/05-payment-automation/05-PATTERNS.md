# Phase 5: 수납 자동화 (Payment Automation) - Pattern Map

**Mapped:** 2026-05-08
**Files analyzed:** 6 (2 new, 4 modified)
**Analogs found:** 6 / 6

---

## CRITICAL Project Rules (Apply to Every File)

| Rule | Constraint |
|------|-----------|
| `saveStudents([...])` | BANNED — throws at runtime. Use `updateStudentDoc(student)` / `batchStudentDocs(updates[])` only |
| `window.confirm` / `window.alert` | BANNED — use inline UI confirmation or custom modal |
| CSS-in-JS only | All CSS in `src/constants.jsx` as CSS string injected via `<style>` tag. Zero external CSS files |
| No arrays overwrite | Never replace full payments/students arrays without per-op transactions |

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `functions/api/payments/kakaobank-webhook.js` | worker (Cloudflare Function) | request-response | `functions/api/ai/lesson-note.js` | exact (same onRequest structure, same json() helper) |
| `docs/operations/kakaobank-webhook-setup.md` | doc | N/A | `docs/operations/auth-salt.md` (implied) | role-match |
| `src/components/payment/PaymentsView.jsx` | component | CRUD + event-driven | itself (modification) | self-analog |
| `src/components/dashboard/Dashboard.jsx` | component | CRUD | itself (modification) | self-analog |
| `src/App.jsx` | store/provider | CRUD | itself (modification) | self-analog |
| `src/constants.jsx` | config | N/A | itself (modification) | self-analog |

---

## Pattern Assignments

### `functions/api/payments/kakaobank-webhook.js` (worker, request-response)

**Analog:** `functions/api/ai/lesson-note.js` (full file, 69 lines)
**Also reference:** `functions/api/ai/_middleware.js` (lines 8-9, method guard pattern)

**Imports pattern** (`functions/api/ai/lesson-note.js` lines 1-3):
```javascript
// lesson-note.js has no imports beyond internal utils
// kakaobank-webhook.js needs NO imports — fully self-contained
```

**Core onRequest pattern** (`functions/api/ai/lesson-note.js` lines 7-68):
```javascript
export async function onRequest(context) {
  const { request, env } = context;

  // Step 1 — method guard (from _middleware.js line 8)
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // Step 2 — body parse (lesson-note.js line 11)
  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }

  // Step 3 — secret header auth (replaces verifyToken from _middleware.js)
  // Use timingSafeEqual (see Security section below), NOT simple === comparison
  const secret = request.headers.get("X-RYE-Secret");
  if (!secret || !(await timingSafeEqual(secret, env.RYE_WEBHOOK_SECRET))) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Step 4 — core logic ...

  return json({ ok: true });
}

// json() helper — copy exactly from lesson-note.js lines 63-68
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
```

**Rate limit with KV pattern** (`functions/api/ai/_utils/ratelimit.js` lines 1-11):
```javascript
// Copy this pattern for IP-based rate limiting in webhook
export async function checkRateLimit(kv, userId, limit = 20) {
  if (!kv) throw new Error("RATE_LIMIT_KV 바인딩이 없습니다 — wrangler.toml의 [[kv_namespaces]] 설정을 확인하세요");
  const bucket = Math.floor(Date.now() / 60000);
  const key = `rl:${userId}:${bucket}`;
  const val = await kv.get(key);
  const count = val ? parseInt(val, 10) : 0;
  if (count >= limit) return false;
  await kv.put(key, String(count + 1), { expirationTtl: 120 });
  return true;
}
// For webhook: use IP (request.headers.get("CF-Connecting-IP")) as userId key
// Reuse existing RATE_LIMIT_KV binding — already in wrangler.toml
```

**Firestore REST write pattern** (`functions/api/auth/set-role.js` lines 39-50):
```javascript
// set-role.js shows the Firestore REST field format — appData documents use:
// { fields: { value: { arrayValue: { values: [...] } }, updatedAt: { integerValue: "..." } } }
// For KV-buffer approach (recommended), Worker writes to KV only:
await env.RATE_LIMIT_KV.put(`pending:${id}`, JSON.stringify(record), { expirationTtl: 86400 });
// Browser polls /api/payments/kakaobank-webhook (GET) to drain KV queue
```

**Error handling pattern** (`functions/api/ai/lesson-note.js` lines 44-60):
```javascript
try {
  // core logic
  return json({ ok: true, matched: true, studentId: match.id });
} catch (e) {
  console.error("webhook error:", e);
  return json({ error: e.message }, 500);
}
```

**Security — timingSafeEqual** (RESEARCH.md Pitfall 5):
```javascript
// Must use constant-time comparison to avoid timing attacks
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aB = enc.encode(a), bB = enc.encode(b);
  if (aB.length !== bB.length) return false;
  const key = await crypto.subtle.importKey("raw", aB, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [s1, s2] = await Promise.all([
    crypto.subtle.sign("HMAC", key, aB),
    crypto.subtle.sign("HMAC", key, bB),
  ]);
  // compare hex strings — equal length guaranteed above
  const h = (b) => Array.from(new Uint8Array(b)).map(x=>x.toString(16).padStart(2,"0")).join("");
  return h(s1) === h(s2);
}
```

**Levenshtein fuzzy match** (inline, no npm, RESEARCH.md Pattern 7):
```javascript
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1]===b[j-1] ? dp[i-1][j-1] : 1+Math.min(dp[i-1][j],dp[i][j-1],dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyMatchStudent(inputName, students) {
  const exact = students.filter(s => s.name === inputName);
  if (exact.length === 1) return { match: exact[0], confidence: "exact" };
  if (exact.length > 1)  return { match: null,     confidence: "duplicate_exact" };
  const close = students.map(s => ({ s, dist: levenshtein(inputName, s.name) }))
    .filter(({ dist }) => dist <= 1).sort((a,b) => a.dist - b.dist);
  if (close.length === 1) return { match: close[0].s, confidence: "fuzzy_1" };
  if (close.length > 1)  return { match: null,       confidence: "duplicate_fuzzy" };
  return { match: null, confidence: "no_match" };
}
```

---

### `src/components/payment/PaymentsView.jsx` (component, CRUD — modification)

**Analog:** itself. All patterns below are extracted from the current file.

**PAY-01 — Inline fee editing state additions** (insert after line 28, existing state block):
```javascript
// Add to existing useState declarations
const [feeEdits, setFeeEdits] = useState({});       // { studentId: newFeeValue }
const [savingFeeId, setSavingFeeId] = useState(null); // optimistic loading indicator
```

**PAY-01 — Inline fee input cell** (insert inside pay-row, after the `pay-amount` div, line ~329):
```javascript
// CRITICAL: e.stopPropagation() prevents pay-row onClick from firing (Pitfall 3)
{canManageAll(currentUser.role) && !s.isInstitution && (
  <div onClick={e => e.stopPropagation()} style={{display:"flex",alignItems:"center",gap:4}}>
    <input
      className="inp"
      inputMode="numeric"
      value={feeEdits[s.id] !== undefined
        ? (feeEdits[s.id] === 0 ? "" : feeEdits[s.id].toLocaleString("ko-KR"))
        : (s.monthlyFee ? s.monthlyFee.toLocaleString("ko-KR") : "")}
      onChange={e => setFeeEdits(f => ({
        ...f, [s.id]: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0
      }))}
      onBlur={async () => {
        if (feeEdits[s.id] === undefined || feeEdits[s.id] === s.monthlyFee) return;
        setSavingFeeId(s.id);
        // CORRECT: updateStudentDoc per-op. NEVER saveStudents([...])
        await updateStudentDoc({ ...s, monthlyFee: feeEdits[s.id] });
        setFeeEdits(f => { const n={...f}; delete n[s.id]; return n; });
        setSavingFeeId(null);
      }}
      onKeyDown={e => {
        if (e.key==="Tab" || e.key==="Enter") {
          e.preventDefault();
          const idx = visibleStudents.findIndex(st => st.id === s.id);
          const nextId = visibleStudents[idx+1]?.id;
          if (nextId) document.querySelector(`[data-fee-input="${nextId}"]`)?.focus();
        }
      }}
      data-fee-input={s.id}
      style={{width:90,height:28,padding:"3px 7px",fontSize:12,textAlign:"right",
              opacity: savingFeeId===s.id ? 0.5 : 1}}
    />
    <span style={{fontSize:11,color:"var(--ink-30)",flexShrink:0}}>원</span>
    {savingFeeId===s.id && <span style={{fontSize:10,color:"var(--ink-30)"}}>…</span>}
  </div>
)}
```

**PAY-01 — updateStudentDoc import** (add to line 4 utils import):
```javascript
// Add updateStudentDoc to imports from App.jsx props (passed as onSaveStudents callback)
// OR import directly via prop: the component already has onSaveStudents prop
// Use onSaveStudents(students.map(st => st.id===s.id ? {...s, monthlyFee: val} : st))
// BUT that calls batchStudentDocs which is correct — check App.jsx line 862-866
```

**PAY-06 — Tab state addition** (insert after existing state declarations):
```javascript
const [activeTab, setActiveTab] = useState("payments"); // "payments" | "unmatched"
```

**PAY-06 — Tab UI** (uses existing `ftabs`/`ftab`/`ftab.active` CSS from `src/constants.jsx` lines 177-182):
```javascript
// Insert after <div className="ph"> header block, before pay summary cards
<div className="ftabs" style={{marginBottom:12}}>
  <button className={`ftab${activeTab==="payments"?" active":""}`}
    onClick={() => setActiveTab("payments")}>수납 관리</button>
  <button className={`ftab${activeTab==="unmatched"?" active":""}`}
    onClick={() => setActiveTab("unmatched")}>
    미매칭 입금
    {unmatchedPayments.length > 0 && (
      <span style={{marginLeft:4,background:"var(--red)",color:"#fff",
        borderRadius:99,padding:"1px 5px",fontSize:10,fontWeight:700}}>
        {unmatchedPayments.length}
      </span>
    )}
  </button>
</div>
{activeTab === "payments" && <기존 수납 UI />}
{activeTab === "unmatched" && <UnmatchedPaymentsTab ... />}
```

**ALM-07 — Stub button** (insert in pay-row alongside existing quickPay button, line ~345):
```javascript
// Pattern: mirrors quickPayingId button style (lines 330-345) but blue tone
{canManageAll(currentUser.role) && !isPaid && !isInst && (
  <button
    onClick={e => {
      e.stopPropagation();
      setAlimtalkModal("unpaid_reminder"); // uses existing alimtalkModal state (line 20)
    }}
    style={{background:"var(--blue-lt)",color:"var(--blue)",border:"1px solid var(--blue)",
            borderRadius:8,padding:"5px 9px",fontSize:11,fontWeight:700,flexShrink:0,
            cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}
    title="ALM-07: Phase 4 AlimTalk 연동 후 활성화"
  >💬</button>
)}
```

**ALM-07 — stub onSend** (modify existing AlimtalkModal onSend at line ~578):
```javascript
// Existing onSend calls sendAligoMessage(type, targets) — Phase 4 이전 stub:
onSend={async () => {
  // Phase 4 AlimTalk API 심사 전 — no-op stub
  setAlimtalkModal(null);
  onLog("ALM-07 stub: Phase 4 AlimTalk 연동 후 활성화됩니다");
  // DO NOT call sendAligoMessage() here
}}
```

**Quick-pay optimistic update pattern** (lines 330-345 — copy for inline-save):
```javascript
// Template: optimistic loading state during async save
setQuickPayingId(s.id);          // show "…" state
try { await onSavePayments(upd); } catch {}
setQuickPayingId(null);          // restore
// Apply same pattern for setSavingFeeId in inline fee editor
```

**PAY-06 — UnmatchedPaymentsTab props** (new prop on PaymentsView function signature, line 9):
```javascript
// Add to existing props destructuring:
export default function PaymentsView({
  students, teachers, currentUser, payments, onSavePayments, onLog, attendance,
  onSaveStudents,
  // NEW:
  unmatchedPayments = [],
  onSaveUnmatched,
  initFilterUnpaid = false,       // PAY-02: Dashboard → PaymentsView nav with filter
}) {
  // PAY-02: honor initFilterUnpaid on mount
  const [filterUnpaid, setFilterUnpaid] = useState(initFilterUnpaid);
```

---

### `src/components/dashboard/Dashboard.jsx` (component, CRUD — modification)

**Analog:** itself. Key patterns at lines 163-194.

**PAY-02 — stat-card click pattern** (line 164 — existing pattern to copy):
```javascript
// Existing clickable stat-card:
<div className="stat-card" onClick={() => nav("payments")} style={{cursor:"pointer"}}>
  <div className="stat-num" style={{color: unpaidThisMonth > 0 ? "var(--red)" : "var(--green)"}}>
    {unpaidThisMonth}
  </div>
  <div className="stat-label">이번달 미납</div>
  <div className="stat-sub">{monthLabel(THIS_MONTH)}</div>
</div>
// PAY-02 extends this card: add unpaid amount + wire nav to paymentsInitFilter
```

**PAY-02 — Dashboard receives nav function** (line 44):
```javascript
export default function Dashboard({ students, teachers, currentUser, notices, categories,
  attendance, payments, pending, institutions, nav }) {
// nav("payments") call pattern — already exists throughout (lines 69, 98, 107, etc.)
// PAY-02: pass initFilterUnpaid state via App.jsx paymentsInitFilter
```

**PAY-02 — unpaid amount calculation** (lines 53-54 existing + extension):
```javascript
// Already computed at Dashboard.jsx lines 53-54:
const monthPayments = payments.filter(p => p.month === THIS_MONTH);
const unpaidThisMonth = students.filter(s => !monthPayments.find(p => p.studentId===s.id && p.paid)).length;

// ADD: unpaid amount sum (insert after line 54)
// IMPORTANT: students prop = visible (App.jsx line 859) — isInstitution already excluded
const unpaidAmount = students.reduce((sum, s) => {
  const p = monthPayments.find(mp => mp.studentId === s.id);
  if (p?.paid) return sum;
  return sum + (p?.amount ?? ((s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee||0) : 0)));
}, 0);
```

**PAY-02 — extended stat-card** (replace / augment existing unpaid card, line 166):
```javascript
{canManageAll(currentUser.role) && (
  <div className="stat-card" style={{cursor:"pointer"}}
    onClick={() => { nav("payments"); /* paymentsInitFilter handled by App.jsx state */ }}>
    <div className="stat-num" style={{color: unpaidThisMonth>0 ? "var(--red)" : "var(--green)"}}>
      {unpaidThisMonth}
    </div>
    <div className="stat-label">이번달 미납</div>
    <div className="stat-sub">{unpaidAmount > 0 ? fmtMoney(unpaidAmount) : monthLabel(THIS_MONTH)}</div>
  </div>
)}
```

**PAY-02 — dash-card pattern** (lines 175-194, existing "이번달 수납 현황" dash-card):
```javascript
// Copy dash-card structure if adding a separate detail card (optional):
<div className="dash-card" style={{marginBottom:12, cursor:"pointer"}} onClick={...}>
  <div className="dash-card-title">미납 현황 <span ...>...</span></div>
  <div style={{display:"flex",alignItems:"center",gap:16}}>
    <DonutChart paid={paidCount} total={students.length} />
    ...
  </div>
</div>
```

---

### `src/App.jsx` (store/provider, CRUD — modification)

**Analog:** itself.

**State addition pattern** (lines 222-237 — add after existing state declarations):
```javascript
// Existing pattern (line 228, 235):
const [payments, setPayments]         = useState([]);
const [institutions, setInstitutions] = useState([]);

// ADD (same pattern):
const [unmatchedPayments, setUnmatchedPayments] = useState([]);
const [paymentsInitFilter, setPaymentsInitFilter] = useState(false); // PAY-02 nav flag
```

**KEYS array addition pattern** (lines 322-338):
```javascript
// Existing KEYS entry:
{ key: "rye-payments", setter: setPayments, default: [] },

// ADD at end of KEYS array:
{ key: "rye-unmatched-payments", setter: setUnmatchedPayments, default: [] },
```

**saveX function pattern** (line 478 — copy for unmatchedPayments):
```javascript
// Existing:
const savePayments = async u => {
  setPayments(u);
  try { await sSet("rye-payments", u); }
  catch (e) { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); throw e; }
};

// Copy for:
const saveUnmatchedPayments = async u => {
  setUnmatchedPayments(u);
  try { await sSet("rye-unmatched-payments", u); }
  catch (e) { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); throw e; }
};
```

**Dashboard nav with filter pattern** (line 859 — extend PaymentsView render):
```javascript
// Existing Dashboard render (line 859):
{view === "dashboard" && <Dashboard ... nav={navigate} />}

// The navigate function (used internally) needs to accept an options object for PAY-02:
// Option A (simpler): App.jsx sets paymentsInitFilter before navigate("payments"):
//   setPaymentsInitFilter(true); navigate("payments");
// Option B: Pass a callback to Dashboard's nav prop that sets filter.
// Recommended: Option A — add setPaymentsInitFilter to Dashboard nav callback.
```

**PaymentsView props extension** (line 862):
```javascript
// Existing (line 862):
{view === "payments" && <PaymentsView
  students={allMembers} teachers={teachers} currentUser={user}
  payments={payments} attendance={attendance}
  onSavePayments={async (upd) => { await savePayments(upd); showToast("수납 정보가 저장되었습니다."); }}
  onSaveStudents={async (upd) => {
    const realUpd = upd.filter(s => !s.isInstitution);
    await batchStudentDocs(realUpd);
  }}
  onLog={addLog}
/>}

// EXTEND with new props:
{view === "payments" && <PaymentsView
  // ... all existing props ...
  unmatchedPayments={unmatchedPayments}
  onSaveUnmatched={saveUnmatchedPayments}
  initFilterUnpaid={paymentsInitFilter}
  onMountFilterConsumed={() => setPaymentsInitFilter(false)}
/>}
```

---

### `src/constants.jsx` (config, CSS-in-JS — modification)

**Analog:** itself. CSS insertion points below.

**CSS pattern — how constants.jsx CSS works** (line 334, payment section):
```javascript
// All CSS is a single template-literal string exported as CSS.
// New rules must be appended inside the existing CSS string, in the appropriate section.
// Example: existing pay-row CSS at line 334:
`.pay-row{display:flex;align-items:center;gap:10px;padding:12px 14px;...}`

// Add new rules AFTER the existing Payments section (after line 349):
// --- Inline fee editor (PAY-01) ---
`.fee-inp-cell{display:flex;align-items:center;gap:4px}`
`.fee-inp-cell .inp{width:90px;height:28px;padding:3px 7px;font-size:12px;text-align:right;font-variant-numeric:tabular-nums}`

// --- Unmatched payments tab / card (PAY-06) ---
`.unmatched-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px}`
`.unmatched-badge{background:var(--red);color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:10px;margin-left:4px}`
```

**How to append CSS** — find the end of the CSS string and insert before the closing backtick. The CSS string is the default export used in `App.jsx` line 847 as `<style>{CSS}</style>`.

---

## Shared Patterns

### Firestore Per-Op Writes
**Source:** `src/App.jsx` lines 430-474 (addStudentDoc, updateStudentDoc, deleteStudentDoc, batchStudentDocs) and `src/firebase.js` line 89 (`runTransaction` export)
**Apply to:** All student data writes in PaymentsView (PAY-01 fee editing)
```javascript
// CORRECT — per-op transaction (App.jsx lines 440-461):
const updateStudentDoc = async (student) => {
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(_studentsRef);
    const cur = snap.exists() ? (snap.data().value || []) : [];
    const idx = cur.findIndex(s => s.id === student.id);
    if (idx === -1) throw new Error("학생을 찾을 수 없습니다");
    const upd = [...cur];
    upd[idx] = { ...cur[idx], ...student, updatedAt: Date.now() };
    tx.set(_studentsRef, { value: upd, updatedAt: Date.now() });
  });
  setStudents(prev => prev.map(s => s.id === student.id ? { ...s, ...student } : s));
};
// PaymentsView receives this as onSaveStudents callback (line 862-866)
// For single-student fee update: call onSaveStudents([{ ...s, monthlyFee: val }])
// which routes to batchStudentDocs — correct path
```

### Toast Notification
**Source:** `src/App.jsx` line 848 (`showToast` function, toast state)
**Apply to:** All async save errors in PaymentsView and Dashboard
```javascript
// showToast is passed down as onLog or can be added as a prop
// Existing: onLog(text) calls addLog which logs activity
// For error toasts: use the onLog pattern or add a showToast prop
// Pattern (App.jsx line 244): setToast({ msg: "...", isError: false })
// Timeout: setTimeout(() => setToast(null), 2200)
```

### canManageAll Role Guard
**Source:** `src/utils.js` (imported in both PaymentsView line 4 and Dashboard line 3)
**Apply to:** All new admin-only UI (PAY-01 inline edit, PAY-02 card, PAY-06 tab, ALM-07 button)
```javascript
// Pattern throughout PaymentsView and Dashboard:
{canManageAll(currentUser.role) && <admin-only-element />}
// Teachers see read-only payment amounts hidden (isTeacher checks)
```

### Cloudflare Worker json() Helper
**Source:** `functions/api/ai/lesson-note.js` lines 63-68
**Apply to:** `kakaobank-webhook.js`
```javascript
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
```

### sSet Firestore Write
**Source:** `src/App.jsx` line 30
**Apply to:** `saveUnmatchedPayments` and any new save functions
```javascript
async function sSet(k, v) {
  try {
    await setDoc(doc(db, COLLECTION, k), { value: v, updatedAt: Date.now() });
  } catch (e) { console.error("sSet error:", k, e); throw e; }
}
```

---

## No Analog Found

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `docs/operations/kakaobank-webhook-setup.md` | operational doc | N/A | First ops doc in the project. No analog in codebase — write from scratch using CONTEXT.md `<specifics>` section as content outline. Tasker setup steps already provided in CONTEXT.md lines 112-125. |

---

## Key Anti-Patterns (Planner Must Enforce)

| Anti-Pattern | Where It Could Appear | Correct Alternative |
|---|---|---|
| `saveStudents([...students.map(...)])` | PAY-01 fee save | `updateStudentDoc({ ...s, monthlyFee: val })` via `onSaveStudents` callback |
| `window.confirm("정말 삭제?")` | PAY-06 unmatched match confirmation | Inline confirm row (`isConfirming` state toggle) |
| `window.alert("저장됨")` | Any success feedback | `onLog(text)` activity log OR App.jsx `showToast` |
| `import { saveStudents }` | Any component | Import will succeed but calling it throws intentionally |
| New `.css` file creation | PAY-01/06 styles | Append to CSS string in `src/constants.jsx` |
| Worker: `import { initializeApp } from "firebase/app"` | kakaobank-webhook.js | Cloudflare Workers ≠ Node.js. Use KV buffer or Firestore REST API |
| Global payments array overwrite in Worker | PAY-05 auto-match | KV buffer approach: Worker writes pending record to KV; browser drains queue |
| Missing `e.stopPropagation()` on inline input | PAY-01 fee input in pay-row | Required — pay-row has `onClick={() => openEdit(s)}` which must not fire on input click |

---

## Metadata

**Analog search scope:** `functions/api/`, `src/components/payment/`, `src/components/dashboard/`, `src/App.jsx`, `src/constants.jsx`, `src/firebase.js`
**Files read:** 10 source files
**Pattern extraction date:** 2026-05-08
