---
phase: SHOP-01-instant-charge-shop
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/firebase.js
  - src/App.jsx
autonomous: true
requirements:
  - SHOP-01
  - SHOP-02

must_haves:
  truths:
    - "즉시청구 컬렉션에 문서가 추가·수정될 때 App state instantCharges가 실시간 업데이트된다"
    - "shopItems 상태가 초기 로드 시 기본 카테고리 4개와 빈 items 배열로 채워진다"
    - "addInstantCharge/updateInstantCharge 함수가 firebase.js에서 export된다"
    - "saveShopItems 함수가 App.jsx에서 rye-shop-items 키로 sSet을 호출한다"
  artifacts:
    - path: "src/firebase.js"
      provides: "addInstantCharge, updateInstantCharge export + collection/addDoc/updateDoc import"
      contains: "addInstantCharge"
    - path: "src/App.jsx"
      provides: "instantCharges state, shopItems state, rye-instant-charges onSnapshot listener, saveShopItems"
      contains: "instantCharges"
  key_links:
    - from: "src/App.jsx onSnapshot listener"
      to: "rye-instant-charges Firestore collection"
      via: "collection(db, 'rye-instant-charges')"
      pattern: "rye-instant-charges"
    - from: "src/App.jsx KEYS array"
      to: "rye-shop-items appData doc"
      via: "setShopItems setter"
      pattern: "rye-shop-items"
---

<objective>
Firebase 즉시청구 CRUD 함수를 추가하고, App.jsx에 instantCharges/shopItems 상태와 리스너를 연결한다.

Purpose: Wave 2 UI 플랜들(SHOP-01-03, SHOP-01-04)이 의존하는 데이터 레이어 기반을 구축한다.
Output: firebase.js에 addInstantCharge/updateInstantCharge, App.jsx에 instantCharges+shopItems state, onSnapshot 리스너, saveShopItems 함수
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

From src/firebase.js (현재 imports, line 2):
```js
import { getFirestore, doc, setDoc, onSnapshot, runTransaction } from "firebase/firestore";
// 현재 export (line 89):
export { db, auth, doc, setDoc, onSnapshot, runTransaction, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged };
```

From src/App.jsx (KEYS array, lines 325–343):
```js
const KEYS = [
  { key: "rye-teachers",           setter: setTeachers,          default: [] },
  { key: "rye-students",           setter: setStudents,          default: [] },
  { key: "rye-notices",            setter: setNotices,           default: [] },
  { key: "rye-categories",         setter: setCategories,        default: DEFAULT_CATEGORIES },
  { key: "rye-attendance",         setter: setAttendance,        default: [] },
  { key: "rye-payments",           setter: setPayments,          default: [] },
  { key: "rye-activity",           setter: setActivity,          default: [] },
  { key: "rye-pending",            setter: setPending,           default: [] },
  { key: "rye-fee-presets",        setter: setFeePresets,        default: {} },
  { key: "rye-schedule-overrides", setter: setScheduleOverrides, default: [] },
  { key: "rye-trash",              setter: setTrash,             default: [] },
  { key: "rye-student-notices",    setter: setStudentNotices,    default: [] },
  { key: "rye-institutions",       setter: setInstitutions,      default: [] },
  { key: "rye-unmatched-payments", setter: setUnmatchedPayments, default: [] },
  { key: "rye-payment-log",        setter: setPaymentLog,        default: [] },
  { key: "rye-ai-reports",         setter: setAiReports,         default: [] },
  { key: "rye-settings",           setter: setRyeSettings,        default: { aiEnabled: true, aiSafeMode: false } },
];
```

From src/App.jsx (state block, lines 223–240):
```js
const [teachers, setTeachers] = useState([]);
const [students, setStudents] = useState([]);
const [notices, setNotices] = useState([]);
const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
const [attendance, setAttendance] = useState([]);
const [payments, setPayments] = useState([]);
const [activity, setActivity] = useState([]);
const [pending, setPending] = useState([]);
const [feePresets, setFeePresets] = useState({});
const [scheduleOverrides, setScheduleOverrides] = useState([]);
const [trash, setTrash] = useState([]);
const [studentNotices, setStudentNotices] = useState([]);
const [institutions, setInstitutions] = useState([]);
const [unmatchedPayments, setUnmatchedPayments] = useState([]);
const [paymentLog, setPaymentLog] = useState([]);
const [paymentsInitFilter, setPaymentsInitFilter] = useState(false);
const [aiReports, setAiReports] = useState([]);
const [ryeSettings, setRyeSettings] = useState({ aiEnabled: true, aiSafeMode: false });
```

From src/App.jsx (setupListeners, lines 392–413):
```js
const setupListeners = () => {
  KEYS.forEach(({ key, setter, default: def }) => {
    const unsub = onSnapshot(doc(db, COLLECTION, key), (snap) => {
      const val = snap.exists() ? snap.data().value : def;
      setter(val ?? def);
      if (!(key in received)) { received[key] = val; checkAllLoaded(); }
    }, (err) => {
      console.error("Firestore listener error:", key, err);
      setter(def);
      if (!(key in received)) { received[key] = null; checkAllLoaded(); }
      setLoadError(err.message);
    });
    unsubscribes.push(unsub);
  });
  // rye-instant-charges 독립 컬렉션 리스너는 여기에 추가 (KEYS 루프 바깥)
};
```

From src/App.jsx (save function pattern, lines 481–482):
```js
const saveCategories = async u => { setCategories(u); try { await sSet("rye-categories", u); } catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); } };
```

From src/App.jsx (checkAllLoaded, line 345):
```js
const checkAllLoaded = async () => {
  if (Object.keys(received).length < KEYS.length) return; // KEYS.length 기준으로 완료 판단
  // ...
};
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: firebase.js에 독립 컬렉션 CRUD 함수 추가</name>
  <read_first>
    - src/firebase.js (전체 — 89줄, 짧음)
  </read_first>
  <files>src/firebase.js</files>
  <action>
    1. 기존 import line 2를 수정하여 `collection, addDoc, updateDoc` 3개를 추가한다:
       ```js
       import { getFirestore, doc, setDoc, onSnapshot, runTransaction, collection, addDoc, updateDoc } from "firebase/firestore";
       ```
    2. `getPortalIdToken` 함수 바로 위에 두 함수를 추가한다:
       ```js
       // ── rye-instant-charges 독립 컬렉션 CRUD ─────────────────────────────────
       export async function addInstantCharge(data) {
         return addDoc(collection(db, "rye-instant-charges"), {
           ...data,
           createdAt: Date.now(),
         });
       }
       export async function updateInstantCharge(id, data) {
         if (!id) throw new Error("updateInstantCharge: id 없음");
         return updateDoc(doc(db, "rye-instant-charges", id), { ...data, updatedAt: Date.now() });
       }
       ```
    3. 마지막 export 줄에 `collection`을 추가한다 (setupListeners에서 직접 사용):
       ```js
       export { db, auth, doc, setDoc, onSnapshot, runTransaction, collection, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged };
       ```
    
    주의:
    - `serverTimestamp()` 대신 `Date.now()` 사용 (기존 코드와 일관성).
    - `addDoc`은 자동 ID를 생성하며 반환값(DocumentReference)을 그대로 반환한다 — 호출자가 `.id`로 접근.
    - `deleteDoc`은 이번 플랜에서 추가하지 않는다 (즉시청구는 삭제 기능 없음, status로 상태 전환).
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && node -e "import('./src/firebase.js').then(m => { console.log('addInstantCharge:', typeof m.addInstantCharge); console.log('updateInstantCharge:', typeof m.updateInstantCharge); console.log('collection:', typeof m.collection); }).catch(e => console.error(e))" 2>&1 || npm run build 2>&1 | head -30</automated>
  </verify>
  <acceptance_criteria>
    - src/firebase.js에 `addInstantCharge` 함수가 export된다: `grep -c "export async function addInstantCharge" src/firebase.js` → 1
    - src/firebase.js에 `updateInstantCharge` 함수가 export된다: `grep -c "export async function updateInstantCharge" src/firebase.js` → 1
    - firebase import에 `collection, addDoc, updateDoc`이 포함된다: `grep -c "collection, addDoc, updateDoc" src/firebase.js` → 1
    - export 줄에 `collection`이 포함된다: `grep "^export {" src/firebase.js | grep -c "collection"` → 1
  </acceptance_criteria>
  <done>firebase.js에 addInstantCharge/updateInstantCharge가 export되고, collection이 re-export된다</done>
</task>

<task type="auto">
  <name>Task 2: App.jsx에 instantCharges/shopItems 상태, 리스너, saveShopItems 추가</name>
  <read_first>
    - src/App.jsx lines 1–5 (imports)
    - src/App.jsx lines 223–245 (state block)
    - src/App.jsx lines 325–435 (KEYS + setupListeners + useEffect cleanup)
    - src/App.jsx lines 480–495 (save functions)
    - src/App.jsx lines 1020–1055 (view renderer — Dashboard, PaymentsView 렌더 위치)
  </read_first>
  <files>src/App.jsx</files>
  <action>
    1. **Import 수정 (line 2)**: `collection`을 firebase.js import에 추가한다:
       ```js
       import { db, auth, doc, setDoc, onSnapshot, runTransaction, collection, firebaseSignIn, firebaseSignInAnon, firebaseLogout, onAuthStateChanged } from "./firebase.js";
       ```

    2. **State 추가**: `ryeSettings` 상태 선언 바로 다음 줄(line 240 이후)에 추가한다:
       ```js
       const [instantCharges, setInstantCharges] = useState([]);
       const [shopItems, setShopItems] = useState({ categories: ["의상/공연복", "악세사리", "악기 가방", "기타"], items: [] });
       ```

    3. **KEYS 배열 수정**: 기존 KEYS 배열 마지막 항목(`rye-settings`) 바로 다음에 추가한다:
       ```js
       { key: "rye-shop-items", setter: setShopItems, default: { categories: ["의상/공연복", "악세사리", "악기 가방", "기타"], items: [] } },
       ```
       주의: `rye-instant-charges`는 독립 컬렉션이므로 KEYS에 추가하지 않는다.

    4. **setupListeners 수정**: `KEYS.forEach(...)` 루프가 끝나는 닫는 괄호 `});` 바로 다음, `}; // setupListeners 끝` 이전에 독립 리스너를 추가한다:
       ```js
       // rye-instant-charges — 독립 컬렉션 (appData 아님)
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
       ```

    5. **saveShopItems 함수 추가**: `saveCategories` 함수 바로 다음 줄에 추가한다:
       ```js
       const saveShopItems = async u => {
         setShopItems(u);
         try { await sSet("rye-shop-items", u); showToast("저장되었습니다."); }
         catch { showToast("저장에 실패했습니다. 네트워크를 확인해주세요.", true); }
       };
       ```

    6. **Dashboard prop 추가**: `view === "dashboard"` 렌더 블록의 `<Dashboard .../>` JSX에 `instantCharges={instantCharges}` prop을 추가한다. 기존:
       ```jsx
       feePresets={feePresets}
       ```
       변경 후:
       ```jsx
       feePresets={feePresets}
       instantCharges={instantCharges}
       ```

    주의:
    - checkAllLoaded는 `KEYS.length` 기준으로 완료를 판단한다. `rye-shop-items`를 KEYS에 추가하면 checkAllLoaded가 하나 더 기다린다 — 이것은 정상이다.
    - `rye-instant-charges` 독립 리스너는 checkAllLoaded/received에 참여하지 않는다 — 데이터가 없어도 앱 로딩을 막지 않는다.
    - `saveStudents([...])` 패턴 절대 사용 금지.
    - `window.confirm/alert` 금지.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - instantCharges state가 선언됨: `grep -c "instantCharges, setInstantCharges" src/App.jsx` → 1
    - shopItems state가 선언됨: `grep -c "shopItems, setShopItems" src/App.jsx` → 1
    - rye-shop-items KEYS 항목: `grep -c "rye-shop-items" src/App.jsx` → 최소 2 (KEYS 항목 + saveShopItems sSet 호출)
    - 독립 컬렉션 리스너: `grep -c "rye-instant-charges" src/App.jsx` → 최소 1
    - saveShopItems 함수: `grep -c "saveShopItems" src/App.jsx` → 최소 2 (함수 선언 + 내부 호출)
    - Dashboard에 instantCharges prop: `grep -c "instantCharges={instantCharges}" src/App.jsx` → 1
    - npm run build가 오류 없이 통과
  </acceptance_criteria>
  <done>instantCharges와 shopItems가 App state로 존재하고, 각각 Firestore에 리얼타임 연결되며, Dashboard에 instantCharges prop이 전달된다</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| App.jsx → Firestore | onSnapshot 리스너가 외부 DB 데이터를 React state로 가져옴 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SHOP01-01 | Tampering | rye-instant-charges collection | accept | 이번 플랜은 클라이언트 읽기 only. write는 Wave 2에서 addInstantCharge 호출 시 Firestore 규칙으로 보호 (Phase 1 보안 단계에서 구현 예정) |
| T-SHOP01-02 | Information Disclosure | shopItems appData | accept | 상품 카탈로그는 PII 없음 — 가격·이름만 포함. 익명 읽기는 Phase 1에서 차단 예정 |
</threat_model>

<verification>
```bash
cd C:\Users\GIGABYTE\Coding\rye-k
npm run build
# 빌드 성공 확인
grep -c "addInstantCharge" src/firebase.js
# → 1 이상
grep -c "rye-instant-charges" src/App.jsx
# → 1 이상
grep -c "rye-shop-items" src/App.jsx
# → 2 이상
```
</verification>

<success_criteria>
- firebase.js: addInstantCharge, updateInstantCharge export, collection re-export
- App.jsx: instantCharges/shopItems state, rye-shop-items KEYS 항목, rye-instant-charges onSnapshot 독립 리스너, saveShopItems 함수, Dashboard에 instantCharges prop
- npm run build 오류 없이 통과
</success_criteria>

<output>
완료 후 `.planning/phases/SHOP-01-instant-charge-shop/SHOP-01-01-SUMMARY.md` 생성
</output>
