# Phase 2: 포털 완성 (Portal Completion) — Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 2 (1 primary modification, 1 CSS addition)
**Analogs found:** 2 / 2 — both are the files themselves (self-analog pattern: read-the-target-file)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/components/portal/PublicPortal.jsx` | component (portal view) | event-driven + request-response | itself — all patterns already established inside this file | exact (self) |
| `src/constants.jsx` | config (CSS string) | transform (string append) | itself — all section patterns already established inside this file | exact (self) |

---

## Pattern Assignments

### `src/components/portal/PublicPortal.jsx`

**Analog:** self — the file that is being modified

---

#### State Declaration Pattern (lines 484–522)

All `useState` declarations live at the top of `PublicParentView`, grouped by concern. New state follows the same structure.

```jsx
// Existing state block pattern (lines 484–519)
const [students, setStudents] = useState([]);
const [attendance, setAttendance] = useState([]);
const [payments, setPayments] = useState([]);
const [teachers, setTeachers] = useState([]);
const [studentNotices, setStudentNotices] = useState([]);
const [aiReports, setAiReports] = useState([]);
const [loading, setLoading] = useState(true);
const [loggedIn, setLoggedIn] = useState(false);
const [student, setStudent] = useState(null);
const [tab, setTab] = useState("home");
// ...
const [showSiblingModal, setShowSiblingModal] = useState(false);
const [switchErr, setSwitchErr] = useState("");
const [textLarge, setTextLarge] = useState(() => { ... });
```

**New state to add** — insert after `switchErr` line (line 514), before `textLarge`:

```jsx
// D-07: 세션 만료 배너 표시 여부
const [showExpiryBanner, setShowExpiryBanner] = useState(false);
```

---

#### localStorage Read/Write Pattern

**doLogin() write pattern** (lines 666–669) — the ONLY place `ryekPortal` is written:

```jsx
// CURRENT (line 667):
localStorage.setItem("ryekPortal", JSON.stringify({
  code: found.studentCode,
  pw: getBirthPassword(found.birthDate)
}));

// MODIFIED (D-05 — add loginAt):
localStorage.setItem("ryekPortal", JSON.stringify({
  code: found.studentCode,
  pw: getBirthPassword(found.birthDate),
  loginAt: Date.now()
}));
```

**Auto-login useEffect read pattern** (lines 607–621) — the ONLY place `ryekPortal` is read for restore:

```jsx
// CURRENT (lines 607–621):
useEffect(() => {
  if (!loading && students.length > 0 && !loggedIn) {
    try {
      const saved = JSON.parse(localStorage.getItem("ryekPortal") || "null");
      if (saved?.code && saved?.pw) {
        const found = students.find(s => s.studentCode === saved.code);
        if (found && getBirthPassword(found.birthDate) === saved.pw
            && (found.status || "active") === "active") {
          setStudent(found);
          setLoggedIn(true);
          initReadState(found.id);
        }
      }
    } catch {}
  }
}, [loading, students]);

// MODIFIED (D-05, D-06, D-07):
useEffect(() => {
  if (!loading && students.length > 0 && !loggedIn) {
    try {
      const saved = JSON.parse(localStorage.getItem("ryekPortal") || "null");
      if (saved?.code && saved?.pw) {
        // D-06: 30일 만료 체크 (loginAt 없는 기존 세션은 skip — backward compatible)
        if (saved.loginAt && Date.now() - saved.loginAt > 30 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem("ryekPortal");
          return;
        }
        const found = students.find(s => s.studentCode === saved.code);
        if (found && getBirthPassword(found.birthDate) === saved.pw
            && (found.status || "active") === "active") {
          setStudent(found);
          setLoggedIn(true);
          initReadState(found.id);
          // D-07: D-3일 배너 체크
          if (saved.loginAt && Date.now() - saved.loginAt > 27 * 24 * 60 * 60 * 1000) {
            setShowExpiryBanner(true);
          }
        }
      }
    } catch {}
  }
}, [loading, students]);
```

**Banner "30일 연장" write pattern** — read-modify-write idiom already used throughout the file:

```jsx
// Copy from initReadState/markNotesRead pattern:
const saved = JSON.parse(localStorage.getItem("ryekPortal") || "{}");
localStorage.setItem("ryekPortal", JSON.stringify({
  ...saved,
  loginAt: Date.now()
}));
setShowExpiryBanner(false);
```

---

#### Home Tab Render Block Insert Point (lines 1094–1241)

The home tab block opens at line 1094 with `{tab === "home" && (` and the first child `<div>` is at line 1095. The insertion order for new elements is:

```
{tab === "home" && (
  <div>
    {/* [INSERT HERE 1] D-07 세션 만료 배너 — tab 최상단 */}
    {showExpiryBanner && ( ... )}

    {/* [INSERT HERE 2] POR-02 시간표 위젯 — 이달 출석 heatmap 위에 */}
    {(student.lessons || []).length > 0 && ( ... )}

    {/* 이달 출석 — EXISTING (line 1097) */}
    <div style={{marginBottom:16}}>
      <MonthlyAttendanceHeatmap ... />
    </div>

    {/* 공지사항 — EXISTING (line 1100) */}
    ...

    {/* 기존 레슨 일정 섹션 — EXISTING (line 1150) — 유지 */}
    ...

    {/* [INSERT HERE 3] POR-07 수강 신청하기 버튼 — 기본 정보 섹션 이후 */}
    <div style={{marginTop:16}}>
      <button className="btn btn-secondary btn-full"
        onClick={() => { window.location.href = "/register"; }}>
        수강 신청하기 →
      </button>
    </div>
  </div>
)}
```

---

#### Section Header Pattern (lines 1100–1106, 1151–1155)

Every named section in the home tab uses this exact 3-piece header. Copy verbatim, change the gradient colors and text:

```jsx
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
  <div style={{width:3,height:14,background:"linear-gradient(180deg,var(--dancheong-blue),var(--dancheong-red))",borderRadius:2,flexShrink:0}}/>
  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>섹션명</div>
</div>
```

For the schedule widget sections use:
- "다음 수업" header: `background:"linear-gradient(180deg,var(--blue),var(--dancheong-blue))"`
- "이번 주 수업" header: `background:"linear-gradient(180deg,var(--blue),var(--dancheong-blue))"`

---

#### Expiry Banner Render Pattern

No existing banner component — copy the `showSiblingModal`/`switchErr` error rendering pattern (lines 1798–1799) for the button structure:

```jsx
{showExpiryBanner && (
  <div className="portal-expiry-banner fade-up">
    <span className="portal-expiry-text">로그인이 3일 후 만료됩니다.</span>
    <button
      type="button"
      className="portal-expiry-extend"
      onClick={() => {
        const saved = JSON.parse(localStorage.getItem("ryekPortal") || "{}");
        localStorage.setItem("ryekPortal", JSON.stringify({ ...saved, loginAt: Date.now() }));
        setShowExpiryBanner(false);
      }}
    >
      30일 연장
    </button>
    <button
      type="button"
      className="portal-expiry-logout"
      onClick={() => {
        localStorage.removeItem("ryekPortal");
        setLoggedIn(false);
        setStudent(null);
        setShowExpiryBanner(false);
      }}
    >
      로그아웃
    </button>
  </div>
)}
```

Critical: `type="button"` on both buttons. No `window.confirm`. Logout sets `setStudent(null)` in addition to `setLoggedIn(false)` — copy from the existing nav logout button at line 1007.

---

#### Schedule Widget Pattern (existing "레슨 일정" section, lines 1150–1166)

The widget is a new richer version of the pattern already established at lines 1150–1166. Copy the structural pattern:

```jsx
{/* 시간표 위젯 — POR-02 */}
{(student.lessons || []).length > 0 && (
  <div style={{marginBottom:16}}>
    {/* "다음 수업" section header (copy pattern from line 1152) */}
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
      <div style={{width:3,height:14,background:"linear-gradient(180deg,var(--blue),var(--dancheong-blue))",borderRadius:2,flexShrink:0}}/>
      <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>다음 수업</div>
    </div>

    {/* Per-instrument next-lesson card — one per lesson */}
    {/* Use .portal-next-lesson CSS class (added to constants.jsx) */}
    {nextLesson
      ? nextLesson.lessons.map((l, i) => {
          const tName = teachers.find(t => t.id === l.teacherId)?.name || "강사 미배정";
          const sc = (l.schedule || []).find(sc => sc.day === nextLesson.dayName);
          return (
            <div key={i} className="portal-next-lesson hero-card" style={{marginBottom:8}}>
              <div className="portal-next-lesson-inst">{l.instrument}</div>
              <div className="portal-next-lesson-time">
                {nextLesson.dayName}요일 {sc?.time || nextLesson.time}
              </div>
              <div className="portal-next-lesson-teacher">담당: {tName} 강사님</div>
            </div>
          );
        })
      : null
    }

    {/* "이번 주 수업" chips */}
    {/* getThisWeekSchedule() — new helper function, same file scope */}
    {/* Use .portal-week-chips / .portal-week-chip CSS classes */}
  </div>
)}
```

**getNextLessonDate() reuse** (line 938): Already computed as `nextLesson` const at line 965. Do NOT recompute — reference `nextLesson` directly. Per-instrument breakdown: `nextLesson.lessons` is already an array of all lessons on that day (line 945: `filter(l => (l.schedule||[]).some(sc => sc.day === dayName))`).

**Teacher lookup pattern** (line 966 and line 1038–1042):
```jsx
const tName = teachers.find(t => t.id === l.teacherId)?.name || "강사 미배정";
```

**getThisWeekSchedule helper** — new function, add in component scope (after `nextLesson` const, line 966):
```jsx
// DAYS 변환: JS getDay()는 일=0, DAYS["월","화",...] 기준이므로 변환 필수
// 기존 getNextLessonDate() line 944 패턴을 그대로 복사:
// const dayName = ["일","월","화","수","목","금","토"][d.getDay()];
const getThisWeekSchedule = () => {
  const result = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = ["일","월","화","수","목","금","토"][d.getDay()];
    (student.lessons || []).forEach(l => {
      (l.schedule || []).filter(sc => sc.day === dayName).forEach(sc => {
        result.push({
          dayName,
          time: sc.time || "",
          instrument: l.instrument || "",
          teacherName: teachers.find(t => t.id === l.teacherId)?.name || "강사 미배정",
          daysFromNow: i
        });
      });
    });
  }
  return result.sort((a, b) => {
    if (a.daysFromNow !== b.daysFromNow) return a.daysFromNow - b.daysFromNow;
    return (a.time || "").localeCompare(b.time || "");
  });
};
const thisWeekSchedule = getThisWeekSchedule();
```

---

#### Enrollment CTA Pattern (lines 1230–1239 "기본 정보" section)

Insert after the closing `</div>` of "기본 정보" section (line 1238), before the `</div>` that closes the home tab `<div>` at line 1240:

```jsx
{/* POR-07: 수강 신청하기 */}
<div style={{marginTop:16}}>
  <button
    className="btn btn-secondary btn-full"
    onClick={() => { window.location.href = "/register"; }}
  >
    수강 신청하기 →
  </button>
</div>
```

Copy `btn btn-secondary btn-full` from line 116–121 and line 132 in constants.jsx. No `window.confirm`.

---

#### Pay Tab Empty State Pattern (lines 1663)

Existing pattern:
```jsx
{sPay.length === 0
  ? <PortalEmptyState title="수납 기록이 없습니다" sub="수납 정보가 등록되면 이곳에서 확인하실 수 있어요." />
  : sPay.slice(0,24).map(...)
}
```

Modified condition for POR-05 (`monthlyFee === 0` case):
```jsx
{(sPay.length === 0 && (student.monthlyFee || 0) === 0)
  ? <PortalEmptyState
      title="수납 정보 없음"
      sub={"이번 달 수강료가 등록되지 않았습니다.\n담당 선생님이나 관리자에게 문의해주세요."}
    />
  : sPay.length === 0
    ? <PortalEmptyState title="수납 기록이 없습니다" sub="수납 정보가 등록되면 이곳에서 확인하실 수 있어요." />
    : sPay.slice(0,24).map(...)
}
```

`PortalEmptyState` component is defined at lines 311–336 in the same file. It accepts `title` (string) and `sub` (string, optional, supports `\n` via `lineHeight:1.75`).

---

#### Sibling Modal CSS Polish Pattern (lines 1789–1823)

Current modal uses inline styles. Target: replace with `.mb` / `.modal` / `.modal-h` / `.modal-b` / `.modal-f` classes.

Existing CSS class definitions (constants.jsx lines 201–211):
```css
.mb    — fixed backdrop overlay, z-index 500, align flex-end
.modal — white panel, max-height 95vh, border-radius top, slideUp animation
.modal-h — sticky header with title and close button
.modal-b — scrollable body, padding 20px, padding-bottom 120px
.modal-f — sticky footer, gap 8px, border-top
```

Child card pattern — use `.tl-student-item` (constants.jsx line 600):
```css
.tl-student-item — flex, padding 10px 14px, border-radius var(--radius-sm),
                   cursor pointer, transition background .12s, border, margin-bottom 6px
.tl-student-item:hover — background var(--blue-lt)
```

Error rendering — use `.form-err` (constants.jsx line 225):
```css
.form-err — background var(--red-lt), color var(--red), border-left 3px solid var(--red)
```

Existing inline error at line 1798:
```jsx
{switchErr && <div className="form-err" style={{marginBottom:14,borderRadius:10,fontSize:13}}>⚠ {switchErr}</div>}
```
This already uses `.form-err`. Keep `style` overrides minimal.

---

### `src/constants.jsx` — CSS String Addition

**Analog:** self — existing section block-comment pattern

---

#### CSS Section Pattern (constants.jsx line 71, 115, 200, 290, 469, 544, 556, 578, 599, 606, 617)

Every CSS section uses this exact block comment header format:
```css
/* ── Section Name ───────────────────────────────────────── */
```
- Leading `/* ──` then space then section name
- Then a run of `─` characters to pad to ~60 chars total
- Then ` */`

Examples:
```css
/* ── Login ─────────────────────────────────────────────── */
/* ── Buttons ───────────────────────────────────────────── */
/* ── Modal (full-screen on mobile) ─────────────────────── */
/* ── Empty state ───────────────────────────────────────── */
/* ── Parent Portal ──────────────────────────────────────── */
/* ── Heritage: 마이크로 모션 ────────────────────────────── */
```

---

#### Insert Location in CSS String

Insert the new CSS blocks **before the closing backtick** at line 740 (`\`;`), after the last existing section (`.ai-stats-row`, line 739).

The two new sections to add:

```css
/* ── Portal Schedule Widget ─────────────────────────────── */
.portal-next-lesson{background:var(--hanji);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;box-shadow:var(--shadow)}
.portal-next-lesson-inst{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:600;color:var(--blue);margin-bottom:4px}
.portal-next-lesson-time{font-size:20px;font-family:'Noto Serif KR',serif;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1.2}
.portal-next-lesson-teacher{font-size:12px;color:var(--ink-60);margin-top:8px}
.portal-week-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.portal-week-chip{background:var(--blue-lt);color:var(--blue);font-size:12px;padding:4px 12px;border-radius:8px}

/* ── Portal Expiry Banner ────────────────────────────────── */
.portal-expiry-banner{background:var(--gold-lt);border-bottom:2px solid var(--gold);padding:12px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;position:sticky;top:0;z-index:10}
.portal-expiry-text{font-size:14px;color:var(--ink);flex:1;line-height:1.5}
.portal-expiry-extend{background:var(--blue);color:#fff;font-size:12px;font-weight:600;border-radius:var(--radius-sm);padding:8px 16px;border:none;cursor:pointer;min-height:44px;font-family:inherit}
.portal-expiry-logout{background:none;border:none;color:var(--red);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;padding:8px;min-height:44px}
```

---

#### Token Constraints for New CSS

All new CSS MUST use CSS custom properties from `:root` (line 52–66). No hardcoded hex values. Verified tokens available:
- Backgrounds: `var(--hanji)`, `var(--gold-lt)`, `var(--blue-lt)`, `var(--paper)`, `var(--bg)`
- Borders: `var(--border)`, `var(--gold)`
- Text: `var(--ink)`, `var(--ink-60)`, `var(--blue)`, `var(--red)`
- Radius: `var(--radius-lg)`, `var(--radius-sm)`, `var(--radius)`
- Shadow: `var(--shadow)`
- Font: `'Noto Serif KR',serif` (already @import'd at line 51)

Dark mode overrides automatically apply because all tokens have `[data-theme="dark"]` overrides in the existing CSS string. No extra dark-mode rules needed for new classes.

---

## Shared Patterns

### No window.confirm / window.alert

**Source:** CLAUDE.md CRITICAL + PublicPortal.jsx logout button (line 1007)
**Apply to:** Expiry banner logout button, enrollment CTA

```jsx
// CORRECT — existing logout button pattern (line 1007):
<button onClick={() => {
  setLoggedIn(false);
  setStudent(null);
  setLoginCode("");
  setLoginPw("");
  setLoginStep("id");
  setPendingStudent(null);
  setTab("home");
  try { localStorage.removeItem("ryekPortal"); } catch {}
}}>로그아웃</button>

// Expiry banner logout — simplified version of same pattern:
onClick={() => {
  localStorage.removeItem("ryekPortal");
  setLoggedIn(false);
  setStudent(null);
  setShowExpiryBanner(false);
}}
```

### Error Display

**Source:** constants.jsx line 225 + PublicPortal.jsx line 1798
**Apply to:** Sibling modal error

```jsx
{switchErr && <div className="form-err" style={{marginBottom:14,borderRadius:10,fontSize:13}}>⚠ {switchErr}</div>}
```

### Skeleton Loading

**Source:** constants.jsx line 572 `.skel` class + PublicPortal.jsx lines 760–786
**Apply to:** Schedule widget loading state (only if needed — widget only renders when `student` is already loaded, so skeleton may be unnecessary)

```css
.skel{background:linear-gradient(90deg,var(--border) 25%,var(--ink-10) 50%,var(--border) 75%);
      background-size:800px 100%;animation:shimmer 1.4s infinite linear;border-radius:6px}
```

If schedule widget skeleton is desired:
```jsx
// Two skel divs as per UI-SPEC:
<div className="skel" style={{height:72,borderRadius:"var(--radius-lg)",marginBottom:8}}/>
<div className="skel" style={{height:32,width:"60%",borderRadius:8}}/>
```

### Section Header — Dancheong Bar Pattern

**Source:** PublicPortal.jsx lines 1103–1106, 1152–1155, 1171–1174, 1208–1211, 1226–1229
**Apply to:** Schedule widget "다음 수업" and "이번 주 수업" section headers

```jsx
<div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
  <div style={{width:3,height:14,background:"linear-gradient(180deg,VAR_A,VAR_B)",borderRadius:2,flexShrink:0}}/>
  <div style={{fontFamily:"'Noto Serif KR',serif",fontSize:14,fontWeight:500,color:"var(--ink)"}}>섹션명</div>
</div>
```

Gradient color pairs in use by section:
- 공지사항: `var(--dancheong-blue),var(--dancheong-red)`
- 이번 주 과제·연습: `var(--dancheong-yellow),var(--gold)`
- 레슨 일정: `var(--blue),var(--dancheong-blue)` ← schedule widget uses this pair
- 최근 레슨 노트: `var(--ink-60),var(--ink-30)`
- 이번 달 수납: dynamic based on `isPaid`

### fade-up Animation

**Source:** constants.jsx line 553
**Apply to:** Expiry banner (`className="portal-expiry-banner fade-up"`)

```css
.fade-up{animation:fadeUp var(--dur-base) var(--ease-out) both}
@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
```

Reduced-motion guard already in CSS (line 574):
```css
@media(prefers-reduced-motion:reduce){
  .hero-card,.hero-stripe,.hero-name,.p-stat,.fade-up,.scale-in,.skel{animation:none !important}
}
```

---

## No Analog Found

None — all files and patterns have direct analogs in the codebase.

---

## Critical Guard Rails (from CLAUDE.md)

| Rule | Impact on This Phase |
|------|---------------------|
| `saveStudents()` 절대 금지 | Phase 2 is read-only for student data — no risk |
| `window.confirm` / `window.alert` 절대 금지 | Expiry banner logout must be immediate; enrollment CTA must navigate immediately |
| 외부 CSS 파일 생성 금지 | All new classes go into `src/constants.jsx` CSS string |
| 채팅창에 전체 코드 재출력 금지 | Executor must use Edit/str_replace only |
| `git push` 자동 실행 절대 금지 | Stop at `npm run build` pass; wait for Nick |

---

## Metadata

**Analog search scope:** `src/components/portal/PublicPortal.jsx` (1,828 lines), `src/constants.jsx` (740 lines)
**Files scanned:** 2
**Pattern extraction date:** 2026-05-05
