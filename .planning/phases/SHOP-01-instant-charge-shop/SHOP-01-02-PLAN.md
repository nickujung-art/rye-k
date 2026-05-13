---
phase: SHOP-01-instant-charge-shop
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/admin/AdminTools.jsx
  - src/App.jsx
autonomous: true
requirements:
  - SHOP-06

must_haves:
  truths:
    - "AdminTools에 '상품관리' 탭이 노출되고 탭 클릭 시 ShopView가 표시된다"
    - "ShopView에서 카테고리를 추가·삭제할 수 있다"
    - "ShopView에서 상품(이름, 기본가격)을 카테고리별로 추가·삭제·활성화 토글할 수 있다"
    - "저장 버튼 클릭 시 shopItems가 rye-shop-items 키로 Firestore에 저장된다"
    - "기본 카테고리 4개(의상/공연복, 악세사리, 악기 가방, 기타)가 초기값으로 표시된다"
  artifacts:
    - path: "src/components/admin/AdminTools.jsx"
      provides: "ShopView export 컴포넌트"
      contains: "export function ShopView"
    - path: "src/App.jsx"
      provides: "view === 'shop' 렌더 블록 + ShopView import"
      contains: "ShopView"
  key_links:
    - from: "src/App.jsx view === 'shop'"
      to: "ShopView component"
      via: "shopItems prop + onSave callback → saveShopItems"
      pattern: "view === .shop."
    - from: "ShopView onSave"
      to: "App.jsx saveShopItems"
      via: "prop callback"
      pattern: "saveShopItems"
---

<objective>
AdminTools에 "상품관리" 탭과 ShopView 컴포넌트를 구현하고, App.jsx에서 라우팅을 연결한다.

Purpose: 관리자가 즉시청구에서 사용할 상품 카탈로그를 관리하는 UI를 제공한다. (D-05, D-06 per CONTEXT.md)
Output: ShopView 컴포넌트(AdminTools.jsx), App.jsx view 라우팅 연결
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

From src/components/admin/AdminTools.jsx (CategoriesView 시그니처, line 251):
```js
export function CategoriesView({ categories, onSave, feePresets, onSaveFees, onMigrateFeeSplit }) {
  const [cats, setCats] = useState(JSON.parse(JSON.stringify(categories)));
  const [dirty, setDirty] = useState(false);
  const [savedFlash, setSavedFlash] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const showErr = (msg) => { setErrMsg(msg); setTimeout(() => setErrMsg(""), 2500); };
  const flashSaved = (msg = "저장됨 ✓") => { setSavedFlash(msg); setTimeout(() => setSavedFlash(""), 1800); };
```

From src/components/admin/AdminTools.jsx (CategoriesView 저장 버튼 + 헤더 패턴, lines 366–375):
```jsx
<div className="ph">
  <div><h1>과목 관리</h1><div className="ph-sub">관리자 전용</div></div>
  <div style={{display:"flex",alignItems:"center",gap:10}}>
    {savedFlash && <span style={{fontSize:12,color:"var(--green)",fontWeight:600}}>{savedFlash}</span>}
    {dirty && <button className="btn btn-primary btn-sm" onClick={handleSaveAll}>저장</button>}
  </div>
</div>
{errMsg && <div style={{margin:"0 0 10px",padding:"10px 14px",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,fontSize:13,color:"var(--red)",fontWeight:500}}>⚠ {errMsg}</div>}
```

From src/components/admin/AdminTools.jsx (새 카테고리 dashed 카드, lines 507–513):
```jsx
<div className="card" style={{ padding:16, borderStyle:"dashed" }}>
  <div style={{ fontFamily:"'Noto Serif KR',serif", fontSize:13, fontWeight:600, marginBottom:10 }}>새 카테고리</div>
  <div style={{ display:"flex", gap:8 }}>
    <input className="inp" style={{ flex:1 }} value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="카테고리 이름" onKeyDown={e => e.key === "Enter" && addCat()} />
    <button className="btn btn-primary btn-sm" onClick={addCat}>추가</button>
  </div>
</div>
```

From src/App.jsx (CategoriesView 렌더 패턴, lines 1050–1086):
```jsx
{view === "categories" && user.role === "admin" && <CategoriesView
  categories={categories}
  onSave={async c => { await saveCategories(c); addLog("과목 카테고리 수정"); showToast("저장되었습니다."); }}
  feePresets={feePresets}
  onSaveFees={...}
  onMigrateFeeSplit={...}
/>}
```

From src/App.jsx (AdminTools import, line 12):
```js
import { ActivityView, PendingView, TrashView, CategoriesView, AiSettingsView } from "./components/admin/AdminTools.jsx";
```

From src/App.jsx (topTitle map, line 1007):
```js
const topTitle = { dashboard: "RYE-K", students: "회원 관리", ..., aiSettings: "AI 설정" }[view] || "RYE-K";
```

From src/constants.jsx (기존 shop CSS가 아직 없으므로 이번 플랜에서 추가해야 함):
CSS 문자열은 src/constants.jsx의 CSS 변수 export 블록에 있다.
shop 관련 CSS 클래스:
```css
.shop-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
.shop-chip{padding:5px 12px;font-size:12px;cursor:pointer;border:1.5px solid var(--border);background:var(--paper);color:var(--ink-30);transition:all .12s;font-family:inherit;border-radius:20px;white-space:nowrap}
.shop-chip.active{background:var(--gold);border-color:var(--gold);color:#fff}
.shop-item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:12px}
.shop-item-card{border:1.5px solid var(--border);background:var(--paper);border-radius:10px;padding:10px 8px;text-align:center;cursor:pointer;transition:all .12s;font-size:12px}
.shop-item-card.selected{border-color:var(--gold);background:var(--gold-lt)}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: constants.jsx에 shop CSS 추가</name>
  <read_first>
    - src/constants.jsx: CSS 문자열 블록의 마지막 부분 (CSS export 변수가 끝나는 위치 확인)
  </read_first>
  <files>src/constants.jsx</files>
  <action>
    CSS 문자열 변수(export const CSS = ` ... `)의 닫는 백틱(`) 바로 앞에 다음 CSS를 추가한다:

    ```css
    .shop-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:12px}
    .shop-chip{padding:5px 12px;font-size:12px;cursor:pointer;border:1.5px solid var(--border);background:var(--paper);color:var(--ink-30);transition:all .12s;font-family:inherit;border-radius:20px;white-space:nowrap}
    .shop-chip.active{background:var(--gold);border-color:var(--gold);color:#fff}
    .shop-item-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:8px;margin-bottom:12px}
    .shop-item-card{border:1.5px solid var(--border);background:var(--paper);border-radius:10px;padding:10px 8px;text-align:center;cursor:pointer;transition:all .12s;font-size:12px}
    .shop-item-card.selected{border-color:var(--gold);background:var(--gold-lt,rgba(255,179,0,0.08))}
    ```

    주의: 외부 CSS 파일 생성 금지. 반드시 constants.jsx 내 CSS 문자열에만 추가.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && node -e "import('./src/constants.jsx').then(m => { console.log('shop-chips in CSS:', m.CSS.includes('shop-chips')); }).catch(e => console.log(e.message))" 2>&1 || npm run build 2>&1 | grep -i "error" | head -10</automated>
  </verify>
  <acceptance_criteria>
    - shop-chips CSS가 constants.jsx에 존재: `grep -c "shop-chips" src/constants.jsx` → 1
    - shop-item-card CSS가 constants.jsx에 존재: `grep -c "shop-item-card" src/constants.jsx` → 1
    - 외부 CSS 파일이 생성되지 않음: `ls src/*.css 2>/dev/null | wc -l` → 0
  </acceptance_criteria>
  <done>shop-chips, shop-chip, shop-item-grid, shop-item-card, shop-item-card.selected CSS가 constants.jsx CSS 문자열에 추가됨</done>
</task>

<task type="auto">
  <name>Task 2: ShopView 컴포넌트 구현 + App.jsx 라우팅 연결</name>
  <read_first>
    - src/components/admin/AdminTools.jsx lines 250–330 (CategoriesView 구조 — ShopView 모델)
    - src/components/admin/AdminTools.jsx lines 490–515 (새 카테고리 dashed 카드)
    - src/App.jsx line 12 (AdminTools import 줄)
    - src/App.jsx lines 1005–1010 (topTitle 맵)
    - src/App.jsx lines 1050–1090 (view 렌더 블록 — 추가 위치)
  </read_first>
  <files>src/components/admin/AdminTools.jsx, src/App.jsx</files>
  <action>
    **AdminTools.jsx — ShopView 컴포넌트 추가:**

    파일 맨 끝(AiSettingsView export 다음)에 ShopView를 추가한다:

    ```jsx
    // ── SHOP VIEW ─────────────────────────────────────────────────────────────────
    export function ShopView({ shopItems, onSave }) {
      const [shopCats, setShopCats] = useState([...(shopItems?.categories || ["의상/공연복","악세사리","악기 가방","기타"])]);
      const [items, setItems] = useState([...(shopItems?.items || [])]);
      const [newCat, setNewCat] = useState("");
      const [newItem, setNewItem] = useState({ category: "", name: "", defaultPrice: "" });
      const [dirty, setDirty] = useState(false);
      const [savedFlash, setSavedFlash] = useState("");
      const [errMsg, setErrMsg] = useState("");
      const showErr = (msg) => { setErrMsg(msg); setTimeout(() => setErrMsg(""), 2500); };
      const flashSaved = (msg = "저장됨 ✓") => { setSavedFlash(msg); setTimeout(() => setSavedFlash(""), 1800); };

      const addCat = () => {
        const v = newCat.trim();
        if (!v) return;
        if (shopCats.includes(v)) { showErr("이미 존재하는 카테고리입니다."); return; }
        setShopCats(c => [...c, v]); setNewCat(""); setDirty(true);
      };
      const rmCat = (cat) => {
        setShopCats(c => c.filter(x => x !== cat));
        setItems(prev => prev.filter(i => i.category !== cat));
        setDirty(true);
      };
      const addItem = () => {
        const name = newItem.name.trim();
        const category = newItem.category || shopCats[0] || "";
        if (!name) { showErr("상품명을 입력하세요."); return; }
        if (!category) { showErr("카테고리를 선택하세요."); return; }
        const price = parseInt(newItem.defaultPrice) || 0;
        const id = `item_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        setItems(prev => [...prev, { id, category, name, defaultPrice: price, active: true }]);
        setNewItem({ category, name: "", defaultPrice: "" });
        setDirty(true);
      };
      const toggleActive = (id) => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, active: !i.active } : i));
        setDirty(true);
      };
      const rmItem = (id) => { setItems(prev => prev.filter(i => i.id !== id)); setDirty(true); };
      const handleSave = async () => {
        const updated = { categories: shopCats, items };
        await onSave(updated);
        setDirty(false);
        flashSaved();
      };

      return (
        <div>
          <div className="ph">
            <div><h1>상품 관리</h1><div className="ph-sub">관리자 전용</div></div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              {savedFlash && <span style={{fontSize:12,color:"var(--green)",fontWeight:600}}>{savedFlash}</span>}
              {dirty && <button className="btn btn-primary btn-sm" onClick={handleSave}>저장</button>}
            </div>
          </div>
          {errMsg && <div style={{margin:"0 0 10px",padding:"10px 14px",background:"var(--red-lt)",border:"1px solid rgba(232,40,28,.2)",borderRadius:8,fontSize:13,color:"var(--red)",fontWeight:500}}>⚠ {errMsg}</div>}

          {/* 카테고리별 상품 목록 */}
          {shopCats.map(cat => {
            const catItems = items.filter(i => i.category === cat);
            return (
              <div key={cat} className="card" style={{marginBottom:10,padding:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:3,height:13,background:"linear-gradient(180deg,var(--blue),var(--gold))",display:"inline-block",borderRadius:2}} />
                    <span style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:600}}>{cat}</span>
                    <span className="cat-count">{catItems.length}</span>
                  </div>
                  <button className="btn btn-danger btn-xs" onClick={() => rmCat(cat)}>삭제</button>
                </div>
                {catItems.length === 0 ? (
                  <div style={{fontSize:12,color:"var(--ink-30)",paddingBottom:8}}>상품이 없습니다.</div>
                ) : (
                  <div style={{marginBottom:10}}>
                    {catItems.map(item => (
                      <div key={item.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid var(--border)"}}>
                        <span style={{flex:1,fontSize:13,fontWeight:500,color:item.active?"var(--ink)":"var(--ink-30)",textDecoration:item.active?"none":"line-through"}}>{item.name}</span>
                        <span style={{fontSize:12,color:"var(--ink-60)"}}>{item.defaultPrice > 0 ? `${item.defaultPrice.toLocaleString()}원` : "가격 미정"}</span>
                        <button className="btn btn-secondary btn-xs" onClick={() => toggleActive(item.id)}>{item.active ? "비활성" : "활성"}</button>
                        <button className="btn btn-danger btn-xs" onClick={() => rmItem(item.id)}>삭제</button>
                      </div>
                    ))}
                  </div>
                )}
                {/* 해당 카테고리에 새 상품 추가 인라인 */}
                <div style={{display:"flex",gap:6,marginTop:6}}>
                  <input className="inp" style={{flex:2}} placeholder="상품명"
                    value={newItem.category === cat ? newItem.name : ""}
                    onFocus={() => setNewItem(n => ({ ...n, category: cat }))}
                    onChange={e => setNewItem(n => ({ ...n, name: e.target.value, category: cat }))}
                    onKeyDown={e => e.key === "Enter" && newItem.category === cat && addItem()} />
                  <input className="inp" style={{flex:1}} placeholder="기본가격"
                    type="number" min="0"
                    value={newItem.category === cat ? newItem.defaultPrice : ""}
                    onFocus={() => setNewItem(n => ({ ...n, category: cat }))}
                    onChange={e => setNewItem(n => ({ ...n, defaultPrice: e.target.value, category: cat }))} />
                  <button className="btn btn-green btn-sm" onClick={() => { setNewItem(n => ({ ...n, category: cat })); addItem(); }}>추가</button>
                </div>
              </div>
            );
          })}

          {/* 새 카테고리 추가 */}
          <div className="card" style={{padding:16,borderStyle:"dashed"}}>
            <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:13,fontWeight:600,marginBottom:10}}>새 카테고리</div>
            <div style={{display:"flex",gap:8}}>
              <input className="inp" style={{flex:1}} value={newCat} onChange={e => setNewCat(e.target.value)} placeholder="카테고리 이름" onKeyDown={e => e.key === "Enter" && addCat()} />
              <button className="btn btn-primary btn-sm" onClick={addCat}>추가</button>
            </div>
          </div>
        </div>
      );
    }
    ```

    **App.jsx 수정:**

    1. Import 줄(line 12)에 `ShopView` 추가:
       ```js
       import { ActivityView, PendingView, TrashView, CategoriesView, AiSettingsView, ShopView } from "./components/admin/AdminTools.jsx";
       ```

    2. `topTitle` 맵(line 1007)에 `shop` 항목 추가:
       ```js
       const topTitle = { ..., aiSettings: "AI 설정", shop: "상품 관리" }[view] || "RYE-K";
       ```

    3. `view === "aiSettings"` 렌더 블록 바로 다음에 ShopView 렌더 추가:
       ```jsx
       {view === "shop" && user.role === "admin" && <ShopView
         shopItems={shopItems}
         onSave={async u => { await saveShopItems(u); addLog("상품 카탈로그 수정"); }}
       />}
       ```

    주의:
    - `window.confirm/alert` 사용 금지 — 삭제 확인은 버튼 클릭 즉시 처리(이 규모에서는 즉시 삭제가 UX상 적절, dirty 플래그로 되돌리기 가능).
    - `saveStudents([...])` 패턴 절대 사용 금지 (이 플랜은 학생 CRUD 없음).
    - uid() 임포트 불필요 — ShopView에서는 `Date.now() + Math.random()` 조합으로 아이템 ID 생성.
  </action>
  <verify>
    <automated>cd C:\Users\GIGABYTE\Coding\rye-k && npm run build 2>&1 | tail -20</automated>
  </verify>
  <acceptance_criteria>
    - ShopView export가 AdminTools.jsx에 존재: `grep -c "export function ShopView" src/components/admin/AdminTools.jsx` → 1
    - ShopView import가 App.jsx에 있음: `grep -c "ShopView" src/App.jsx` → 최소 2 (import + render)
    - shop topTitle이 App.jsx에 있음: `grep -c "shop.*상품 관리" src/App.jsx` → 1
    - view === "shop" 렌더 블록: `grep -c "view === .shop." src/App.jsx` → 1
    - shop-chips가 constants.jsx에 있음: `grep -c "shop-chips" src/constants.jsx` → 1
    - npm run build 오류 없이 통과
  </acceptance_criteria>
  <done>ShopView 컴포넌트가 AdminTools.jsx에 구현되고, App.jsx에서 view === "shop" 시 렌더되며, 상품 CRUD(카테고리 추가/삭제, 상품 추가/삭제/활성화토글)가 동작하고 저장 시 rye-shop-items에 저장된다</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Admin UI → saveShopItems | 관리자만 접근 가능한 상품 CRUD |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SHOP02-01 | Elevation of Privilege | ShopView | mitigate | `user.role === "admin"` 조건 체크로 렌더 제한. Firestore 규칙은 Phase 1에서 적용 예정 |
| T-SHOP02-02 | Tampering | rye-shop-items | accept | 상품 카탈로그는 운영 데이터가 아님. 가격 조작은 즉시청구 요청 시 강사가 직접 입력하므로 영향 제한적 |
</threat_model>

<verification>
```bash
cd C:\Users\GIGABYTE\Coding\rye-k
npm run build
grep -c "export function ShopView" src/components/admin/AdminTools.jsx
# → 1
grep -c "ShopView" src/App.jsx
# → 2 이상
grep -c "shop-chips" src/constants.jsx
# → 1
```
</verification>

<success_criteria>
- ShopView가 AdminTools.jsx에 export됨
- App.jsx: ShopView import, topTitle에 shop 항목, view === "shop" 렌더 블록
- constants.jsx: shop 관련 CSS 클래스 6개 추가
- npm run build 오류 없이 통과
</success_criteria>

<output>
완료 후 `.planning/phases/SHOP-01-instant-charge-shop/SHOP-01-02-SUMMARY.md` 생성
</output>
