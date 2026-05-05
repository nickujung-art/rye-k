# Phase 3: AI 완성 — Pattern Map

**Mapped:** 2026-05-05
**Files analyzed:** 8 (신규·수정 대상)
**Analogs found:** 8 / 8

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `functions/api/ai/_utils/gemini.js` (← anthropic.js 리네임) | utility | request-response | `functions/api/ai/_utils/anthropic.js` | exact (본인) |
| `functions/api/ai/monthly-report.js` (수정) | service | request-response | `functions/api/ai/lesson-note.js` | exact |
| `functions/api/ai/churn.js` (수정) | service | request-response | `functions/api/ai/lesson-note.js` | role-match |
| `functions/api/ai/care-message.js` (신규) | service | request-response | `functions/api/ai/churn.js` | exact |
| `src/aiClient.js` (수정) | utility | request-response | 본인 (`aiChurnAnalysis` 패턴) | exact |
| `src/components/dashboard/ChurnWidget.jsx` (수정) | component | event-driven | `src/components/aireports/MonthlyReportsView.jsx` | role-match |
| `src/components/aireports/MonthlyReportsView.jsx` (수정) | component | CRUD | 본인 (`handlePublish` 패턴) | exact |
| `src/components/ai/AiAssistant.jsx` (수정) | component | request-response | 본인 (`ListResult`, `ChurnListResult` 패턴) | exact |

---

## Pattern Assignments

### `functions/api/ai/_utils/gemini.js` (utility, request-response)

**작업:** `anthropic.js` 파일 이름 변경 + `callAnthropic` → `callGemini` 함수명 변경

**Analog:** `functions/api/ai/_utils/anthropic.js` (= 본 파일)

**현재 파일 전체 구조** (lines 1-62):
```javascript
// 변경 전 (anthropic.js)
export async function callAnthropic(apiKey, { system, user, max_tokens = 400, temperature = 0.3, thinkingBudget = 0 }) { ... }
export async function callGeminiTools(apiKey, { system, user, tools, max_tokens = 200 }) { ... }

// 변경 후 (gemini.js) — 내부 로직 동일, 이름만 교체
export async function callGemini(apiKey, { system, user, max_tokens = 400, temperature = 0.3, thinkingBudget = 0 }) { ... }
export async function callGeminiTools(...) { ... }  // 이미 올바른 이름, 유지
```

**주의:** `callGeminiTools`는 이름이 이미 올바르므로 변경 불필요.

---

### `functions/api/ai/monthly-report.js` (service, request-response)

**작업:** (1) `callAnthropic` → `callGemini` import 경로 수정, (2) SEC-08 studentName 익명화 추가

**Analog:** `functions/api/ai/lesson-note.js` — 동일한 anonymize 파이프라인 패턴이 완성된 형태로 존재

**Import 패턴** (lesson-note.js lines 1-3):
```javascript
import { callAnthropic } from "./_utils/anthropic.js";  // → callGemini from "./_utils/gemini.js"
import { stripPii } from "./_utils/pii-guard.js";
import { buildNameMap, anonymize, deanonymize } from "./_utils/anonymize.js";
```

**SEC-08 익명화 적용 패턴** (lesson-note.js lines 21-22, 52-53):
```javascript
// 요청 직전: nameMap 빌드 후 텍스트/필드값 치환
const nameMap = (safeMode && studentName) ? buildNameMap([studentName]) : {};
// Phase 3에서는 항상 익명화 (safeMode 조건 제거)
const nameMap = buildNameMap([studentName]);
const anonName = nameMap[studentName] || studentName;

// 프롬프트 라인 구성 시 anonName 사용 (monthly-report.js line 69)
// 기존: `회원: ${studentName}` → 변경: `회원: ${anonName}`

// 응답 후: deanonymize (lesson-note.js line 53)
if (Object.keys(nameMap).length) result = deanonymize(result, nameMap);
```

**에러 핸들링 패턴** (lesson-note.js lines 56-60):
```javascript
} catch (e) {
  console.error("lesson-note AI error:", e);
  if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
  return json({ error: e.message }, 500);
}
```

**응답 헬퍼** (lesson-note.js lines 63-68):
```javascript
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
```

---

### `functions/api/ai/churn.js` (service, request-response)

**작업:** (1) `callAnthropic` → `callGemini` import 수정, (2) SEC-08 students[].name 익명화 추가

**Analog:** `functions/api/ai/lesson-note.js`

**현재 churn.js import** (lines 1-2):
```javascript
import { callAnthropic } from "./_utils/anthropic.js";
import { stripPii } from "./_utils/pii-guard.js";
// SEC-08 추가:
import { buildNameMap, anonymize, deanonymize } from "./_utils/anonymize.js";
```

**다건 익명화 패턴** — churn.js는 students 배열을 처리하므로 buildNameMap에 여러 이름 전달:
```javascript
const top = students.slice(0, 5);
// SEC-08: 배열 전체 이름 한 번에 nameMap 생성
const nameMap = buildNameMap(top.map(s => s.name));

// studentList 생성 시 anonymize 적용
const studentList = top.map(s => {
  const anonName = nameMap[s.name] || s.name;
  const parts = [];
  if (s.consecutive >= 2) parts.push(`연속 결석 ${s.consecutive}회`);
  if (s.rate != null) parts.push(`최근 4주 출석률 ${s.rate}%`);
  const level = s.score >= 50 ? "위험" : "주의";
  return `- ${anonName}: ${parts.join(", ")} (위험도: ${level})`;  // s.name → anonName
}).join("\n");

// 응답 후 deanonymize
let comments = [];
try {
  const match = text.match(/\[[\s\S]*\]/);
  if (match) {
    const raw = JSON.parse(match[0]);
    // name 필드 복원
    comments = raw.map(c => ({ ...c, name: deanonymize(c.name, nameMap) }));
  }
} catch {}
```

**응답 헬퍼** (churn.js lines 50-53):
```javascript
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });
const err = (status, msg) =>
  new Response(JSON.stringify({ error: msg }), { status, headers: { "content-type": "application/json" } });
```

---

### `functions/api/ai/care-message.js` (service, request-response) — 신규

**Analog:** `functions/api/ai/churn.js` (단건 처리로 단순화) + `functions/api/ai/lesson-note.js` (anonymize 패턴)

**전체 구조 패턴** — churn.js 구조를 단건으로 단순화:
```javascript
// 파일 상단 (churn.js pattern)
import { callGemini } from "./_utils/gemini.js";           // ← 신규 이름 사용
import { stripPii } from "./_utils/pii-guard.js";
import { buildNameMap, deanonymize } from "./_utils/anonymize.js";

export async function onRequest(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return err(400, "Bad Request"); }
  body = stripPii(body);

  const { name, consecutive, rate, score, teacherName } = body;
  if (!name) return err(400, "name required");

  // lesson-note.js 익명화 패턴 (단건)
  const nameMap = buildNameMap([name]);
  const anonName = nameMap[name] || name;

  // 프롬프트: churn.js system 프롬프트 패턴 참조
  const level = score >= 50 ? "위험" : "주의";
  const system = "당신은 국악 교육기관 RYE-K의 학원 관리 AI 비서입니다. 이탈 위험 회원에게 보낼 따뜻하고 진심 어린 케어 메시지 초안을 한국어로 작성합니다.";
  const lines = [
    `회원: ${anonName}`,
    consecutive >= 2 ? `연속 결석 ${consecutive}회` : null,
    rate != null ? `최근 4주 출석률 ${rate}%` : null,
    `위험도: ${level}`,
    teacherName ? `담당 강사: ${teacherName}` : null,
    `\n학부모에게 보낼 케어 메시지 1개를 300자 이내로 작성하세요.`,
  ].filter(Boolean);

  try {
    const raw = await callGemini(env.GEMINI_API_KEY, {
      system, user: lines.join("\n"), max_tokens: 400, temperature: 0.5,
    });
    return json({ result: deanonymize(raw, nameMap) });  // lesson-note.js deanonymize 패턴
  } catch (e) {
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return err(500, e.message);
  }
}

// churn.js 응답 헬퍼 패턴
const json = (d, s=200) => new Response(JSON.stringify(d), { status:s, headers:{"content-type":"application/json"} });
const err  = (s, m)     => new Response(JSON.stringify({ error: m }), { status:s, headers:{"content-type":"application/json"} });
```

---

### `src/aiClient.js` (utility, request-response)

**작업:** `aiChurnCare()` 함수 추가 (신규 Worker 호출)

**Analog:** 동일 파일 내 `aiChurnAnalysis()` 패턴 (lines 92-96)

**추가할 함수 패턴** (aiChurnAnalysis 기반):
```javascript
// 기존 aiChurnAnalysis (lines 92-96) — 복사 기준
export async function aiChurnAnalysis(students) {
  if (!students?.length) return { comments: [] };
  const payload = students.slice(0, 5).map(s => ({ name: s.name, consecutive: s.consecutive, rate: s.rate, score: s.score }));
  return callAi("churn", { students: payload });
}

// 추가: aiChurnCare — 단건, 추가 teacherName 필드
export async function aiChurnCare({ name, consecutive, rate, score, teacherName }) {
  return callAi("care-message", { name, consecutive, rate, score, teacherName });
}
```

---

### `src/components/dashboard/ChurnWidget.jsx` (component, event-driven)

**작업:** 이탈 위험 회원 행에 "케어 메시지" 버튼 추가 + 인라인 초안 표시 상태 관리

**Analog:** `src/components/aireports/MonthlyReportsView.jsx` — AI 호출 후 인라인 결과 표시 + 에러 처리 패턴

**버튼 클릭 → AI 호출 → 상태 업데이트 패턴** (MonthlyReportsView.jsx lines 104-137):
```javascript
// MonthlyReportsView의 단건 생성 패턴을 ChurnWidget 버튼에 적용
const [generating, setGenerating] = useState(new Set());  // MonthlyReportsView line 47
const [careResults, setCareResults] = useState({});        // {[studentId]: string}
const [careErrors, setCareErrors] = useState({});

// 버튼 클릭 핸들러
const handleCareMessage = async (student) => {
  setGenerating(prev => new Set([...prev, student.id]));
  setCareErrors(prev => ({ ...prev, [student.id]: null }));
  try {
    const { result } = await aiChurnCare({
      name: student.name,
      consecutive: student.consecutive,
      rate: student.rate,
      score: student.score,
      teacherName: teachers?.find(t => t.id === student.teacherId)?.name,
    });
    setCareResults(prev => ({ ...prev, [student.id]: result }));
  } catch (e) {
    // MonthlyReportsView line 132 에러 처리 패턴
    const msg = e.message === "rate_limited" ? "잠시 후 다시 시도해주세요 (분당 제한)" : "AI 오류가 발생했습니다.";
    setCareErrors(prev => ({ ...prev, [student.id]: msg }));
  } finally {
    setGenerating(prev => { const n = new Set(prev); n.delete(student.id); return n; });
  }
};
```

**버튼 인라인 UI 패턴** — ChurnWidget.jsx lines 62-87의 기존 row 구조에 추가:
```jsx
{/* 기존 행 오른쪽 끝 위험도 배지 옆에 버튼 삽입 */}
{generating.has(s.id) ? (
  <span style={{fontSize:11,color:"var(--blue)"}}>생성 중…</span>
) : careResults[s.id] ? (
  // 초안 표시: 클릭 시 복사 (window.confirm 금지 → 인라인)
  <button
    style={{fontSize:10,color:"var(--blue)",background:"none",border:"1px solid var(--blue)",
      borderRadius:4,padding:"1px 6px",cursor:"pointer",fontFamily:"inherit"}}
    onClick={() => navigator.clipboard.writeText(careResults[s.id])}
  >
    복사
  </button>
) : (
  <button
    style={{fontSize:10,color:"var(--ink-50)",background:"none",border:"1px solid var(--border)",
      borderRadius:4,padding:"1px 6px",cursor:"pointer",fontFamily:"inherit"}}
    onClick={() => handleCareMessage(s)}
  >
    케어 메시지
  </button>
)}
```

**초안 텍스트 표시 영역** — 행 아래 인라인 (window.confirm/alert 금지):
```jsx
{careErrors[s.id] && (
  <div style={{fontSize:11,color:"var(--red)",marginTop:4}}>{careErrors[s.id]}</div>
)}
{careResults[s.id] && (
  <div style={{fontSize:12,color:"var(--ink-60)",lineHeight:1.6,marginTop:6,
    padding:"8px 10px",background:"var(--hanji)",borderRadius:6,border:"1px solid var(--border)"}}>
    {careResults[s.id]}
  </div>
)}
```

**ChurnWidget prop 추가** — 기존 `{ students, attendance }` → `{ students, attendance, teachers }` 추가 필요

---

### `src/components/aireports/MonthlyReportsView.jsx` (component, CRUD)

**작업:** published 상태 리포트 카드에 "발송 준비" 버튼 추가 (stub — Phase 4 연결 대기)

**Analog:** 동일 파일 lines 466-473의 기존 published 버튼 영역

**삽입 위치** (lines 466-473의 버튼 div에 추가):
```jsx
{/* 기존 버튼 영역 */}
<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
  <button className="btn btn-sm" onClick={() => handleEditPublished(report)} style={{background:"var(--ink-10)",color:"var(--ink)",fontSize:12}}>
    ✏️ 수정
  </button>
  <button className="btn btn-sm" onClick={() => handleArchive(report)} style={{background:"transparent",color:"var(--ink-30)",border:"1px solid var(--border)",fontSize:11}}>
    보관 처리
  </button>
  {/* Phase 3 신규 추가: 발송 준비 버튼 (stub) */}
  <button
    className="btn btn-sm"
    onClick={() => {/* Phase 4: AlimTalk Worker 연결 예정 */}}
    style={{background:"var(--gold-lt)",color:"var(--gold-dk)",border:"1px solid #FCD34D",fontSize:11}}
  >
    📨 발송 준비
  </button>
</div>
```

**버튼 상태 패턴** — MonthlyReportsView의 기존 `saving` Set 패턴 참조 (lines 49, 139-148):
```javascript
// 기존 패턴 — 발송 준비 stub은 단순 클릭 표시로 충분
const [sending, setSending] = useState(new Set());  // Phase 4에서 실제 사용
```

---

### `src/components/ai/AiAssistant.jsx` (component, request-response)

**작업:** `ListResult` 컴포넌트를 카드 스타일로 업그레이드 + `onOpenStudent` prop 추가로 클릭 시 StudentDetailModal 연결

**Analog:** 동일 파일 내 `ChurnListResult` (lines 81-124) — 클릭 가능한 카드 형태 참조

**현재 AiAssistant 컴포넌트 시그니처** (line 194):
```javascript
// 기존
export default function AiAssistant({ students, attendance, payments, teachers })
// 수정 후
export default function AiAssistant({ students, attendance, payments, teachers, onOpenStudent })
```

**App.jsx 호출부 수정** (App.jsx line 930):
```jsx
// 기존
<AiAssistant students={students} attendance={attendance} payments={payments} teachers={teachers} />
// 수정 후 — App.jsx의 modal/selected 패턴 사용 (line 241-242, line 952)
<AiAssistant
  students={students}
  attendance={attendance}
  payments={payments}
  teachers={teachers}
  onOpenStudent={(sid) => {
    setSelected(students.find(s => s.id === sid) || null);
    setModal("sDetail");
  }}
/>
```

**App.jsx의 sDetail 오픈 패턴** (App.jsx lines 906, 952):
```javascript
// StudentsView에서 학생 클릭 시 — 동일 패턴 적용
onSelect={s => { setSelected(s); setModal("sDetail"); }}
// modal === "sDetail" && selected && <StudentDetailModal ... />
```

**ListResult 카드 클릭 패턴** (AiAssistant.jsx lines 31-56 수정):
```jsx
function ListResult({ data, onOpenStudent }) {  // onOpenStudent prop 추가
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? data : data.slice(0, 5);
  if (data.length === 0) {
    return <div style={{fontSize:12,color:"var(--ink-30)",marginTop:4}}>해당 조건의 회원이 없습니다.</div>;
  }
  return (
    <div className="ai-result-list">
      <div style={{fontSize:11,color:"var(--ink-30)",marginBottom:4}}>{data.length}명</div>
      {shown.map(s => (
        <div
          key={s.id}
          className="ai-result-row"
          onClick={() => onOpenStudent?.(s.id)}
          style={onOpenStudent ? {cursor:"pointer"} : undefined}  // 클릭 커서
        >
          <Av photo={s.photo} name={s.name} size="av-sm"/>
          <div style={{flex:1,minWidth:0}}>
            <span className="ai-result-name">{s.name}</span>
            {s._absenceCount != null && <span className="ai-result-sub">결석 {s._absenceCount}회</span>}
            {s._attRate != null && <span className="ai-result-sub">출석률 {s._attRate}%</span>}
          </div>
        </div>
      ))}
      ...
    </div>
  );
}
```

**MessageBubble에서 onOpenStudent 전달** (AiAssistant.jsx lines 164-178):
```jsx
// MessageBubble에 onOpenStudent prop 추가하여 ListResult까지 전달
function MessageBubble({ msg, onOpenStudent }) {
  ...
  {msg.type === "list" && <ListResult data={msg.content} onOpenStudent={onOpenStudent}/>}
  ...
}
```

**CSS-in-JS 카드 hover 스타일** — `src/constants.jsx` CSS 문자열에 추가:
```css
/* 기존 .ai-result-row에 hover 추가 (constants.jsx CSS 문자열 내) */
.ai-result-row { cursor: default; transition: background .1s; }
.ai-result-row:hover { background: var(--bg-hover, rgba(43,58,159,.04)); }
```

---

## Shared Patterns

### Worker 공통 구조 (모든 AI Worker)

**Source:** `functions/api/ai/_middleware.js` (lines 1-29)
**Apply to:** 모든 `functions/api/ai/*.js` — _middleware.js가 자동 적용되므로 각 Worker는 인증/rate limit 코드 불필요

```javascript
// _middleware.js가 처리하는 공통 관심사
// 1) POST only 검증
// 2) AI_ENABLED === "false" → 503
// 3) Firebase JWT 검증 (verifyToken → context.data.user)
// 4) Rate limit (checkRateLimit → RATE_LIMIT_KV, 20 req/min/user)
// → 각 Worker는 onRequest(context) 내에서 바로 body parsing 시작
```

### SEC-08 익명화 파이프라인

**Source:** `functions/api/ai/lesson-note.js` lines 1-3, 21-22, 52-53
**Apply to:** `monthly-report.js`, `churn.js`, `care-message.js` (신규)

```javascript
// 패턴 요약 (lesson-note.js 검증된 패턴)
import { buildNameMap, anonymize, deanonymize } from "./_utils/anonymize.js";

// 요청 전: nameMap → anonymize
const nameMap = buildNameMap([studentName]);           // 단건
// const nameMap = buildNameMap(students.map(s=>s.name)); // 다건 (churn.js)
const anonName = nameMap[studentName] || studentName;

// ... Gemini 호출 시 anonName 사용 ...

// 응답 후: deanonymize (CRITICAL — 누락 시 Pitfall 2)
if (Object.keys(nameMap).length) result = deanonymize(result, nameMap);
```

### PII 제거 (모든 Worker)

**Source:** `functions/api/ai/_utils/pii-guard.js` lines 1-15
**Apply to:** 모든 AI Worker의 body 파싱 직후

```javascript
body = stripPii(body);  // phone, guardianPhone, email, address, bizNumber 제거
```

### AI 호출 에러 핸들링 (Worker 레이어)

**Source:** `functions/api/ai/lesson-note.js` lines 56-60
**Apply to:** 모든 AI Worker의 try/catch

```javascript
} catch (e) {
  console.error("[worker-name] AI error:", e);
  if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
  return json({ error: e.message }, 500);
}
```

### AI 호출 에러 핸들링 (Client 레이어)

**Source:** `src/components/aireports/MonthlyReportsView.jsx` line 132
**Apply to:** `ChurnWidget.jsx` 케어 메시지 핸들러

```javascript
const msg = e.message === "rate_limited"
  ? "잠시 후 다시 시도해주세요 (분당 제한)"
  : e.message === "auth_required"
  ? "로그인이 필요합니다."
  : "AI 오류가 발생했습니다.";
```

### CSS-in-JS 스타일 (모든 UI 컴포넌트)

**Source:** `src/constants.jsx` — 프로젝트 전체 CSS 문자열 보관 위치
**Apply to:** `AiAssistant.jsx` ListResult 카드 hover, `ChurnWidget.jsx` 케어 메시지 초안 박스

**규칙:** 새 CSS 클래스는 반드시 `src/constants.jsx`의 CSS 문자열에 추가. 외부 CSS 파일 생성 절대 금지.

### window.confirm/alert 금지

**Source:** `CLAUDE.md` — CRITICAL 규칙
**Apply to:** `ChurnWidget.jsx` 케어 메시지 생성, `MonthlyReportsView.jsx` 발송 준비 버튼

모든 확인 동작은 인라인 상태 토글 또는 커스텀 인라인 UI로 처리. MonthlyReportsView의 `confirmPubAll` 인라인 패턴 (lines 357-379) 참조.

---

## No Analog Found

해당 없음 — 모든 파일에 강한 아날로그 발견됨.

---

## Import 경로 일괄 변경 필요 목록 (AI-01)

`anthropic.js` → `gemini.js` 파일명 변경 시 아래 7개 Worker 파일의 import 경로를 모두 수정해야 함.

| Worker 파일 | 현재 import | 변경 후 |
|-------------|-------------|---------|
| `functions/api/ai/monthly-report.js` | `"./_utils/anthropic.js"` | `"./_utils/gemini.js"` |
| `functions/api/ai/churn.js` | `"./_utils/anthropic.js"` | `"./_utils/gemini.js"` |
| `functions/api/ai/lesson-note.js` | `"./_utils/anthropic.js"` | `"./_utils/gemini.js"` |
| `functions/api/ai/reply-suggest.js` | (확인 필요) | `"./_utils/gemini.js"` |
| `functions/api/ai/payment-tone.js` | (확인 필요) | `"./_utils/gemini.js"` |
| `functions/api/ai/practice-guide.js` | (확인 필요) | `"./_utils/gemini.js"` |
| `functions/api/ai/punctuate.js` | (확인 필요) | `"./_utils/gemini.js"` |
| `functions/api/ai/query.js` | (확인 필요) | `"./_utils/gemini.js"` |

**검증 명령:** `npm run build` — import 오류 시 즉시 빌드 실패로 감지됨.

---

## Critical Facts for Planner

1. **`sDetail` 모달 패턴** — App.jsx에서 StudentDetailModal을 여는 state는 `modal === "sDetail"` + `selected` (line 952). `onOpenStudent` prop은 `setSelected(students.find(...))` + `setModal("sDetail")` 조합으로 구현.

2. **`buildNameMap` 26명 제한** — anonymize.js의 LABELS는 알파벳 A-Z (26개). 77명 전원을 한 번에 넣으면 27번째부터 익명화 누락. churn.js는 이미 `top = students.slice(0, 5)`로 제한 중 — 이 제한을 유지할 것.

3. **anonymize.js 포맷 결정** — 현재 코드베이스의 `학생A`, `학생B` 포맷 그대로 유지. `student_XXXX` 포맷으로 변경하면 anonymize.js 자체를 재작성해야 하고, Gemini 출력이 영문 ID를 한국어 리포트에 혼용하게 되어 품질 저하. Open Question A1은 기존 포맷 유지로 결론.

4. **AlimtalkModal 연결 범위** — Phase 3에서 AlimtalkModal은 수정하지 않음. 케어 메시지는 ClipBoard 복사 버튼까지만 구현. AlimtalkModal 연결은 Phase 4.

5. **CSS 추가 위치** — `src/constants.jsx` 내부의 CSS 문자열. 파일 내에서 기존 `.ai-result-row` 클래스 정의 위치를 Grep으로 먼저 찾고 그 인근에 추가.

---

## Metadata

**Analog search scope:** `functions/api/ai/`, `src/components/`, `src/aiClient.js`, `src/App.jsx`
**Files scanned:** 14 (Worker) + 20 (components) + aiClient.js + App.jsx
**Pattern extraction date:** 2026-05-05
