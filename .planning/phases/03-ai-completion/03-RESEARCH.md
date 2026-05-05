# Phase 3: AI 완성 — Research

**Researched:** 2026-05-05
**Domain:** Cloudflare Pages Functions (Gemini AI), React CSS-in-JS, Firebase Firestore
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Gemini 2.5 Flash 단일 모델 (Google AI Studio 무료 티어 유지)
- anonymize.js: studentName → `student_XXXX` (ID 4자리 해시, 단방향)
- 이탈 위험 박스에 "케어 메시지 초안 생성" 버튼 추가
- 월별 리포트: 생성 + "발송 준비" 버튼 UI 구현 (실제 AlimTalk 발송은 Phase 4)
- 자연어 쿼리: 카드 형식 결과 UI
- Worker 파일명 `gemini.js`, 함수명 `callGemini`로 통일

### Claude의 재량
- anonymize.js 해시 알고리즘 선택 (단방향, 결정론적)
- 카드 UI 컴포넌트 세부 디자인 (CSS-in-JS, 기존 패턴 준수)
- Worker 파일 분리 구조

### Deferred Ideas (OUT OF SCOPE)
- 실제 AlimTalk 발송 (Phase 4 의존)
- 월별 리포트 자동 스케줄링 (Cron Worker)
- 자연어 쿼리 결과 저장/히스토리
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AI-01 | callAnthropic / callGemini 함수명 통일 및 anthropic.js 내부 정리 | anthropic.js 파일 확인 — callAnthropic 함수가 실제로 Gemini API를 호출하는 혼란 구조 확인 |
| AI-02 | 월별 리포트 강사→학부모 발송 UI — 리포트 생성 후 발송 버튼 | MonthlyReportsView.jsx 이미 리포트 생성 기능 있음. 발송 준비 버튼 추가 필요 |
| AI-03 | 이탈 위험도 → 케어 메시지 초안 생성 → AlimTalk 발송 연동 | ChurnWidget.jsx 이탈 위험 박스 확인, churn.js Worker 확인. 케어 메시지 생성 Worker 미존재 |
| AI-04 | 자연어 쿼리 응답 UI 고도화 — 텍스트 + 카드 형식 결과 | AiAssistant.jsx ListResult 컴포넌트 확인. StudentDetailModal 연결 prop 없음 |
| AI-05 | AI 어시스턴트 응답 품질 개선 — 프롬프트 튜닝 및 에러 핸들링 | churn.js, monthly-report.js 프롬프트 구조 확인. rate limit 재시도 로직 미구현 |
| SEC-08 | AI API 호출 시 studentName을 anonymize.js 통과 강제 | pii-guard.js는 phone/email 제거. studentName은 monthly-report.js에서 raw 전송 중. anonymize.js는 lesson-note.js에서만 조건부 사용 |
</phase_requirements>

---

## Summary

Phase 3의 핵심은 **기존에 존재하는 AI 기반 위에 5개 요건을 마무리하는 작업**이다. 대부분의 AI 인프라 (gemini 호출, rate limit, PII 스트리핑, monthly-report Worker, churn Worker, query Worker, AiAssistant UI, MonthlyReportsView)는 이미 코드베이스에 존재한다. 새로 만들 것은 많지 않고, 연결이 끊어진 부분을 잇고 기존 구조에 맞게 이름을 정리하는 작업이 대부분이다.

**주요 발견 3가지:**
1. `anthropic.js` 파일이 실제로 Gemini API를 호출하는 혼란 구조가 존재한다. 파일명·함수명 변경만으로 AI-01 해결 가능하다.
2. `anonymize.js`는 이미 존재하고 `lesson-note.js`에서 사용 중이다. 그러나 `monthly-report.js`, `churn.js`에는 studentName 익명화가 적용되어 있지 않다 — SEC-08의 핵심 작업.
3. `MonthlyReportsView.jsx`는 이미 리포트 생성·공개·보관 기능까지 완성되어 있다. AI-02 "발송 준비" 버튼은 기존 카드 UI에 버튼 하나 추가이며, Phase 4 AlimTalk stub 연결로 완료된다.

**Primary recommendation:** AI-01 리네이밍부터 시작해 모든 Worker import를 일괄 수정한 뒤, SEC-08 익명화 파이프라인을 Worker 레이어에서 강제하고, 나머지 UI 작업을 진행한다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| AI 이름 통일 (AI-01) | Cloudflare Worker (_utils/) | 없음 | 파일명·함수명은 서버 사이드 Worker 레이어 |
| 월별 리포트 발송 준비 버튼 (AI-02) | Browser (MonthlyReportsView) | Firestore | 버튼 클릭 → Firestore 상태 업데이트, Worker 호출 없음 |
| 케어 메시지 초안 생성 (AI-03) | Browser (ChurnWidget) + Cloudflare Worker (churn.js) | 없음 | 클릭 트리거는 브라우저, 실제 생성은 Worker |
| 자연어 쿼리 카드 UI (AI-04) | Browser (AiAssistant) | 없음 | 쿼리 실행은 이미 클라이언트 쪽 queryFunctions.js |
| AI 품질·에러 핸들링 (AI-05) | Cloudflare Worker (각 Worker) | Browser (aiClient.js) | 재시도 로직은 Worker 또는 aiClient 레이어 |
| PII 익명화 강제 (SEC-08) | Cloudflare Worker (_utils/anonymize.js) | 없음 | API 호출 직전 서버 사이드 강제 적용 |

---

## Standard Stack

### Core (기존 확인된 스택 — 변경 없음)

[VERIFIED: 코드베이스 직접 검사]

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Gemini 2.5 Flash | API v1beta | 텍스트 생성, function calling | 무료 티어, callAnthropic (→callGemini) 이미 사용 중 |
| Firebase JS SDK | 10.13.0 | Firestore 저장, Auth 토큰 | 프로젝트 전체 기반 |
| jose | 5.0.0 | Worker 사이드 JWT 검증 | 기존 auth.js에서 사용 중 |
| Cloudflare Pages Functions | — | AI Worker 엔드포인트 | 기존 functions/api/ai/ 하위 |

### 추가 필요 없음

Phase 3에서 신규 npm 패키지 설치는 불필요하다. 모든 의존성이 이미 존재한다. [VERIFIED: package.json 포함 전체 파일 구조 검사]

---

## Architecture Patterns

### 현재 AI 파이프라인 구조 (Phase 3 시작 전)

```
Browser (aiClient.js)
  │  POST /api/ai/{endpoint}
  │  Authorization: Bearer {Firebase ID Token}
  ▼
Cloudflare Pages Function (_middleware.js)
  │  1) POST 확인
  │  2) AI_ENABLED 플래그
  │  3) Firebase JWT 검증 (auth.js + jose)
  │  4) Rate limit (ratelimit.js + RATE_LIMIT_KV)
  ▼
각 Worker (monthly-report.js / churn.js / query.js 등)
  │  1) stripPii() — phone/email 제거
  │  2) [일부만] anonymize() — 이름 익명화
  │  3) callAnthropic() → Gemini API
  ▼
Google Generative Language API
  https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent
```

### Phase 3 완료 후 구조 변경 포인트

```
_utils/anthropic.js  →  _utils/gemini.js
callAnthropic()      →  callGemini()
callGeminiTools()    →  callGeminiTools() (이미 올바른 이름, 유지)

monthly-report.js 내부:
  stripPii(body) [기존]
  + anonymize(studentName) [신규 — SEC-08]
  → Gemini 에 전달할 때 익명 이름 사용
  ← 응답 받은 후 deanonymize()로 복원

churn.js 내부:
  현재: students[].name을 raw로 Gemini 전송
  변경: buildNameMap(names) → anonymize → Gemini → deanonymize
```

### Recommended Project Structure (변경 부분만)

```
functions/api/ai/
├── _utils/
│   ├── gemini.js          ← anthropic.js 이름 변경 (callGemini, callGeminiTools)
│   ├── anonymize.js       ← 현행 유지 (buildNameMap, anonymize, deanonymize)
│   ├── pii-guard.js       ← 현행 유지
│   ├── auth.js            ← 현행 유지
│   └── ratelimit.js       ← 현행 유지
├── monthly-report.js      ← anonymize 적용 추가
├── churn.js               ← anonymize 적용 추가
└── [기타 Worker]          ← import 경로만 anthropic → gemini 변경

src/components/
├── ai/
│   └── AiAssistant.jsx    ← ListResult에 카드 클릭 → StudentDetailModal 연결 추가
├── dashboard/
│   └── ChurnWidget.jsx    ← "케어 메시지" 버튼 + 모달 추가
└── aireports/
    └── MonthlyReportsView.jsx ← "발송 준비" 버튼 추가 (stub)

src/
└── aiClient.js            ← aiChurnCare() 함수 추가 (신규 Worker 호출)
```

### Pattern 1: studentName 익명화 파이프라인 (SEC-08)

**What:** monthly-report.js와 churn.js에서 studentName을 Gemini 전송 전 익명화

**현재 anonymize.js 동작 방식:**
```javascript
// functions/api/ai/_utils/anonymize.js — [VERIFIED: 직접 확인]
// 알파벳 순서 레이블: 학생A, 학생B, ... (최대 26명)
export function buildNameMap(names) {
  const map = {};
  names.forEach((name, i) => {
    if (name && i < LABELS.length) map[name] = `학생${LABELS[i]}`;
  });
  return map;
}
```

**주의:** CONTEXT.md에서 Nick이 원한 포맷은 `student_XXXX` (ID 4자리 해시)이나, 현재 anonymize.js는 `학생A`, `학생B` 포맷을 사용한다. 두 가지 선택지가 있다:
- **Option A (권장):** 기존 `학생A` 포맷 그대로 유지 — 코드 재사용, Gemini 출력이 한국어로 일관
- **Option B:** 새 해시 함수 추가 — `student_XXXX` 포맷 구현

Claude의 재량 영역이므로 Option A(기존 패턴 재사용)를 권장한다. [ASSUMED]

**monthly-report.js 적용 패턴:**
```javascript
// [VERIFIED: 기존 lesson-note.js 패턴 참조]
import { buildNameMap, anonymize, deanonymize } from "./_utils/anonymize.js";

// Worker 내부
const nameMap = buildNameMap([studentName]);
const anonName = anonymize(studentName, nameMap);

// Gemini 전송: anonName 사용
const result = await callGemini(env.GEMINI_API_KEY, {
  system: systemPrompt,
  user: lines.join("\n").replace(studentName, anonName),  // 또는 라인 재구성
  ...
});

// 복원: deanonymize
return json({ result: deanonymize(result, nameMap) });
```

### Pattern 2: 케어 메시지 생성 — 신규 Worker vs 기존 churn.js 확장

**현재 churn.js 동작:**
- 이탈 위험 학생 배열 수신 → Gemini에 JSON 배열 반환 요청 → `{"name":"회원명","comment":"1-2문장 조언"}` 형식

**케어 메시지 (AI-03) 요건:**
- 단일 학생에 대한 케어 메시지 초안 생성
- AlimtalkModal에 연결 (Phase 4 전까지 복사 버튼)

**설계 선택:**
- **Option A (권장):** 기존 `churn.js`에 단일 학생 케어 메시지 엔드포인트 추가 (같은 파일 내 분기 또는 새 파라미터)
- **Option B:** 별도 `care-message.js` Worker 생성

기존 Worker 파일들이 1:1 엔드포인트 구조이므로 Option B(care-message.js 신설)가 기존 패턴에 맞다. [ASSUMED]

### Pattern 3: 자연어 쿼리 카드 UI (AI-04)

**현재 AiAssistant.jsx의 결과 렌더링 구조:**
```
MessageBubble → {
  type === "list"       → ListResult (이름 + 결석횟수/출석률 텍스트)
  type === "stats"      → StatsResult
  type === "churn-list" → ChurnListResult
  type === "churn-ai"   → ChurnAiResult
  type === "text"       → 텍스트
}
```

[VERIFIED: AiAssistant.jsx 직접 확인]

**AI-04 요건:** 학생 이름 + 주요 수치 + 클릭 시 StudentDetailModal 이동

**문제:** 현재 `AiAssistant`는 `setView`나 `onOpenStudent` prop을 받지 않는다. App.jsx에서 `<AiAssistant>` 호출 시 이 props를 전달해야 StudentDetailModal 연결 가능.

**구현 패턴:**
```jsx
// App.jsx에서 (개략적)
<AiAssistant
  students={students}
  attendance={attendance}
  payments={payments}
  teachers={teachers}
  onOpenStudent={(sid) => { setDetailStudent(students.find(s=>s.id===sid)); }}
/>

// AiAssistant.jsx — ListResult 카드
<div onClick={() => onOpenStudent?.(s.id)} style={{cursor:"pointer"}}>
  {/* 기존 이름 텍스트 → 카드 스타일 */}
</div>
```

[ASSUMED] — App.jsx의 `detailStudent` state명은 실제 코드 확인 필요.

### Pattern 4: 케어 메시지 → AlimtalkModal 연결 (AI-03)

**현재 AlimtalkModal.jsx의 진입 형태:**
```jsx
// AlimtalkModal props (현재)
type: "monthly_fee" | "unpaid_reminder" | "makeup_lesson"
students: Student[]
month: string
onClose: () => void
onSend: (type, targets, extras) => void
getPayment: (sid) => Payment | undefined
```

[VERIFIED: AlimtalkModal.jsx 직접 확인]

**케어 메시지 연결을 위해:** 새 `type: "care_message"` 추가 또는 별도 props (`initialMessage`)로 초안 텍스트 주입. Phase 4 전까지는 `onSend`가 실제 발송 없이 클립보드 복사로 동작하는 것이 간단하다. [ASSUMED]

### Anti-Patterns to Avoid

- **`callAnthropic` 함수명 혼용:** AI-01 완료 전까지 임시로 alias 두고 사용하는 것은 허용되지만, Phase 3 내에서 완전히 제거해야 한다.
- **studentName raw 전송:** SEC-08 완료 전까지 monthly-report, churn 엔드포인트에 studentName이 Gemini에 전달되는 것은 허용 안 됨.
- **window.confirm 사용 금지 (CLAUDE.md):** 케어 메시지 생성 확인도 인라인 UI로 처리.
- **CSS 외부 파일 금지 (CLAUDE.md):** 신규 카드 스타일은 src/constants.jsx CSS 문자열에 추가.
- **saveStudents() 금지 (CLAUDE.md):** AI-03 케어 메시지 생성 후 상태 저장 시 반드시 per-op 트랜잭션 사용.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| studentName 익명화 | 새 해시 유틸 | 기존 anonymize.js (buildNameMap/anonymize/deanonymize) | 이미 코드베이스에 존재, lesson-note.js에서 검증됨 |
| Firebase JWT 검증 | 자체 JWT 파서 | 기존 auth.js + jose | 이미 JWKS 기반으로 동작 중 |
| Rate limiting | 새 미들웨어 | 기존 ratelimit.js + RATE_LIMIT_KV | 기존 패턴 그대로 사용 |
| PII 필드 제거 | 수동 delete | 기존 pii-guard.js (stripPii) | 이미 모든 Worker에서 사용 |
| AI 카드 UI 컴포넌트 | 외부 라이브러리 | 기존 CSS-in-JS 패턴 (constants.jsx) | 프로젝트 패턴 준수 필수 |

**Key insight:** Phase 3의 95% 이상이 기존 코드 재사용과 연결이다. 새로 만드는 코드는 `care-message.js` Worker 하나와 ChurnWidget 버튼/모달 UI, ListResult 카드 스타일 개선이 전부다.

---

## Common Pitfalls

### Pitfall 1: anthropic.js import 경로 일괄 변경 누락

**What goes wrong:** `gemini.js`로 파일 이름만 바꾸고 import 하는 모든 Worker 파일을 수정하지 않으면 런타임에 모든 AI 기능이 `Module not found` 에러로 중단된다.

**Why it happens:** Workers 파일이 7개 (`monthly-report.js`, `churn.js`, `query.js`, `lesson-note.js`, `reply-suggest.js`, `payment-tone.js`, `practice-guide.js`, `punctuate.js`) — 모두 `import ... from "./_utils/anthropic.js"` 를 가지고 있다.

**How to avoid:** AI-01 작업 시 `import.*anthropic` 전체 grep → 일괄 수정 → `npm run build` 통과 확인.

**Warning signs:** 빌드는 통과하지만 Cloudflare Pages 배포 후 모든 `/api/ai/*` 엔드포인트 503 반환.

### Pitfall 2: anonymize() 적용 후 deanonymize() 누락으로 익명 이름이 학부모에게 노출

**What goes wrong:** monthly-report.js에 익명화를 적용하면서 Gemini 응답 텍스트의 `학생A`가 복원되지 않아 학부모 리포트에 `학생A님께`가 그대로 들어간다.

**Why it happens:** anonymize()는 요청 전에, deanonymize()는 응답 후에 각각 호출해야 한다. 두 단계 중 하나라도 빠지면 리포트가 이상하게 보인다.

**How to avoid:** lesson-note.js의 `deanonymize` 패턴을 그대로 복사. `if (Object.keys(nameMap).length) result = deanonymize(result, nameMap);` 라인 필수.

**Warning signs:** 생성된 리포트 body에 `학생A`, `학생B` 문자열이 남아 있음.

### Pitfall 3: ChurnWidget에서 케어 메시지 생성 시 전체 이탈 위험 목록을 한 번에 AI 전송

**What goes wrong:** 케어 메시지 버튼이 현재 `atRisk` 배열 전체를 Worker에 보내면, 단일 학생 케어 메시지가 아닌 여러 학생 조언이 섞여서 반환된다.

**Why it happens:** 기존 `churn.js`는 배열 단위로 처리. 케어 메시지는 1:1 (학생 1명 → 메시지 1개) 이어야 AlimtalkModal에 바로 넣을 수 있다.

**How to avoid:** 케어 메시지 엔드포인트는 단일 학생 객체를 받도록 설계. ChurnWidget에서 버튼 클릭 시 `students[i]` 단건만 전달.

### Pitfall 4: 카드 UI 클릭 → StudentDetailModal 연결 시 App.jsx state 경로 오파악

**What goes wrong:** `AiAssistant`에서 학생 카드 클릭 이벤트를 처리하려면 App.jsx에서 `detailStudent` 또는 해당 역할을 하는 state와 setter를 props로 전달해야 한다. 현재 App.jsx에는 `detailStudent` 같은 state명이 검색되지 않았다.

**Why it happens:** App.jsx가 690줄 규모이며 state 이름이 다를 수 있다.

**How to avoid:** 구현 전 App.jsx에서 StudentDetailModal이 열리는 state와 setter를 실제로 grep 확인 후 진행. [ASSUMED: state명은 실제 코드 재검토 필요]

**Warning signs:** 카드 클릭 시 모달이 열리지 않거나, 다른 뷰로 navigate가 발생.

### Pitfall 5: Gemini 무료 티어 Rate Limit — 월별 리포트 일괄 생성 시

**What goes wrong:** 현재 무료 티어는 RPM(분당 요청) 15, RPD(일당 요청) 1,500 수준으로 알려져 있다. 77명 일괄 생성 시 약 5분 이상 소요되며 RPM 초과 가능.

**Current mitigation (기존 코드):** `bulkBusy` 진행 중 요청 간 1500ms 딜레이 (`await new Promise(r => setTimeout(r, 1500))`) — [VERIFIED: MonthlyReportsView.jsx 262행]

**How to avoid:** 기존 딜레이 로직 유지. 에러 핸들링에서 429 → "잠시 후 다시 시도해주세요 (분당 제한)" 메시지 이미 구현됨. 추가 재시도 1회 로직은 AI-05 요건으로 Worker 레이어에 적용. [VERIFIED: MonthlyReportsView.jsx 131-132행 기존 처리]

---

## Code Examples

### Example 1: gemini.js로 이름 변경 후 callGemini export

```javascript
// functions/api/ai/_utils/gemini.js (anthropic.js에서 리네임)
// [VERIFIED: 기존 anthropic.js 구조 확인]
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const GEMINI_API = `${GEMINI_BASE}/gemini-2.5-flash:generateContent`;

// callAnthropic → callGemini 로 이름 변경
export async function callGemini(apiKey, { system, user, max_tokens = 400, temperature = 0.3, thinkingBudget = 0 }) {
  // ... 기존 로직 동일
}

// callGeminiTools는 이미 올바른 이름 — 그대로 유지
export async function callGeminiTools(apiKey, { system, user, tools, max_tokens = 200 }) {
  // ... 기존 로직 동일
}
```

### Example 2: monthly-report.js에 SEC-08 익명화 적용

```javascript
// functions/api/ai/monthly-report.js (변경 부분만)
// [VERIFIED: 기존 lesson-note.js 패턴 기반]
import { callGemini } from "./_utils/gemini.js";
import { stripPii } from "./_utils/pii-guard.js";
import { buildNameMap, anonymize, deanonymize } from "./_utils/anonymize.js";

export async function onRequest(context) {
  // ...
  body = stripPii(body);
  const { studentName, /* 나머지 */ } = body;

  // SEC-08: studentName 익명화
  const nameMap = buildNameMap([studentName]);
  const anonName = nameMap[studentName] || studentName;

  // 프롬프트 구성 시 anonName 사용
  const lines = [
    `회원: ${anonName}`,  // studentName → anonName
    // ...
  ];

  const result = await callGemini(env.GEMINI_API_KEY, {
    system: systemPrompt, user: lines.join("\n"), max_tokens: 3000,
  });

  // 응답에서 익명 이름 복원
  return json({ result: deanonymize(result, nameMap) });
}
```

### Example 3: CSS-in-JS 카드 스타일 추가 패턴 (constants.jsx)

```javascript
// src/constants.jsx의 CSS 문자열에 추가 (기존 패턴 준수)
// [VERIFIED: CSS 문자열 방식은 전체 프로젝트 표준]
// 기존 .ai-result-row 클래스를 카드화 하는 추가 스타일

`.ai-result-card {
  display: flex; align-items: center; gap: 10px;
  padding: 9px 10px; background: var(--bg);
  border-radius: 8px; border: 1px solid var(--border);
  cursor: pointer; transition: border-color .12s, box-shadow .12s;
}
.ai-result-card:hover {
  border-color: var(--blue); box-shadow: 0 0 0 2px rgba(43,58,159,.08);
}`
```

### Example 4: 케어 메시지 Worker 패턴 (care-message.js 신규)

```javascript
// functions/api/ai/care-message.js
// [ASSUMED: 기존 churn.js + lesson-note.js 패턴 혼합]
import { callGemini } from "./_utils/gemini.js";
import { stripPii } from "./_utils/pii-guard.js";
import { buildNameMap, anonymize, deanonymize } from "./_utils/anonymize.js";

export async function onRequest(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return err(400, "Bad Request"); }
  body = stripPii(body);

  const { name, consecutive, rate, score, teacherName } = body;
  if (!name) return err(400, "name required");

  const nameMap = buildNameMap([name]);
  const anonName = nameMap[name] || name;

  const level = score >= 50 ? "위험" : "주의";
  const system = "당신은 국악 교육기관 RYE-K의 학원 관리 AI 비서입니다. 이탈 위험 회원에게 보낼 따뜻하고 진심 어린 케어 메시지 초안을 한국어로 작성합니다.";
  const user = [
    `회원: ${anonName}`,
    consecutive >= 2 ? `연속 결석 ${consecutive}회` : null,
    rate != null ? `최근 4주 출석률 ${rate}%` : null,
    `위험도: ${level}`,
    teacherName ? `담당 강사: ${teacherName}` : null,
    `\n학부모에게 보낼 케어 메시지 1개를 300자 이내로 작성하세요. 이름·날짜 등은 아래 형식으로 쓰세요.`,
  ].filter(Boolean).join("\n");

  try {
    const raw = await callGemini(env.GEMINI_API_KEY, {
      system, user, max_tokens: 400, temperature: 0.5,
    });
    return json({ result: deanonymize(raw, nameMap) });
  } catch (e) {
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return err(500, e.message);
  }
}

const json = (d, s=200) => new Response(JSON.stringify(d), { status:s, headers:{"content-type":"application/json"} });
const err = (s, m) => new Response(JSON.stringify({ error: m }), { status:s, headers:{"content-type":"application/json"} });
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| callAnthropic (Anthropic 스타일 API) | callGemini (Gemini v1beta) | Phase 3 리네이밍 대상 | Worker 혼란 제거 |
| AI_SAFE_MODE 환경변수 조건부 익명화 | 항상 익명화 강제 (SEC-08) | Phase 3 | 법적 리스크 제거 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | 기존 `학생A` 포맷 anonymize.js를 재사용하면 Nick이 원한 `student_XXXX` 포맷과 다를 수 있음 | SEC-08 패턴 | 재작업 필요 — 클라우드 결정 전 Nick 확인 권장 |
| A2 | care-message.js를 별도 Worker로 만드는 것이 기존 패턴에 맞다 | Pattern 2 | 기존 churn.js 확장을 선호할 경우 파일 구조 변경 |
| A3 | AiAssistant에 onOpenStudent prop 추가 시 App.jsx에서 해당 상태 관리 필요 | Pattern 3 | App.jsx 실제 state명 grep 필요 |
| A4 | AlimtalkModal에 care_message 타입 추가 또는 initialMessage prop 방식 | Pattern 4 | AlimtalkModal 설계 방향에 따라 다름 |

---

## Open Questions

1. **anonymize.js 포맷 확정 필요**
   - What we know: 현재 `학생A`, `학생B` 포맷. Nick의 CONTEXT.md에는 `student_XXXX` 언급.
   - What's unclear: Nick이 Gemini 출력 텍스트가 한국어로 일관되길 원하는지, 아니면 기술적 ID 포맷을 원하는지.
   - Recommendation: 기존 `학생A` 포맷 유지 제안. 플래너가 Nick에게 한 번 확인하거나 재량으로 결정.

2. **App.jsx detailStudent state 이름 확인**
   - What we know: AiAssistant에 onOpenStudent prop이 없음.
   - What's unclear: App.jsx 690줄 내에서 StudentDetailModal을 여는 state/setter 이름.
   - Recommendation: Wave 0 또는 Wave 1 시작 전 grep으로 확인.

3. **케어 메시지 AlimtalkModal 연결 방식**
   - What we know: AlimtalkModal props는 type, students[], month, onClose, onSend, getPayment.
   - What's unclear: 케어 메시지가 1명 대상 자유 텍스트이므로 기존 템플릿 구조와 다름.
   - Recommendation: Phase 4 전까지는 AlimtalkModal을 직접 연결하지 않고 "복사" 버튼으로 처리하는 간단한 방식 채택.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Gemini API (GEMINI_API_KEY) | 모든 AI Worker | ✓ | 2.5 Flash v1beta | — |
| RATE_LIMIT_KV | _middleware.js | ✓ | Cloudflare KV | 없음 (필수) |
| Firebase Auth | aiClient.js JWT | ✓ | 10.13.0 | — |
| npm run build (Vite 5) | 배포 검증 | ✓ | Vite 5.4.0 | — |

[VERIFIED: wrangler.toml에서 RATE_LIMIT_KV 바인딩 확인, firebase.js에서 SDK 버전 확인]

**모든 의존성 사용 가능. 신규 설치 불필요.**

---

## Validation Architecture

> 프로젝트에 테스트 러너 없음. `npm run build` 통과 + 브라우저 직접 확인이 표준. [VERIFIED: CLAUDE.md, STACK.md]

### Test Framework

| Property | Value |
|----------|-------|
| Framework | 없음 — Vite build 검증 방식 |
| Config file | 없음 |
| Quick run command | `npm run build` |
| Full suite command | `npm run preview` 후 브라우저 직접 확인 |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Notes |
|--------|----------|-----------|-------------------|-------|
| AI-01 | callGemini 이름 변경 후 모든 Worker 정상 동작 | build smoke | `npm run build` | build 통과 = import 오류 없음 |
| AI-02 | 월별 리포트 발송 준비 버튼 클릭 시 상태 변경 | manual | 브라우저 직접 확인 | MonthlyReportsView 카드 UI |
| AI-03 | 케어 메시지 초안 생성 → 텍스트 표시 | manual | 브라우저 직접 확인 | ChurnWidget 버튼 |
| AI-04 | 자연어 쿼리 결과 카드 클릭 시 StudentDetailModal 오픈 | manual | 브라우저 직접 확인 | AiAssistant 패널 |
| AI-05 | 429 rate limit 에러 시 재시도 1회 후 사용자 메시지 | manual | 브라우저 직접 확인 (DevTools로 429 시뮬레이션) | aiClient.js 또는 Worker |
| SEC-08 | Gemini로 전송되는 프롬프트에 실제 학생 이름 미포함 | manual (DevTools) | Cloudflare Workers 로그 확인 | Network 탭에서 request body 확인 |

### Wave 0 Gaps

- AI-01 파일 리네임 전 전체 grep 목록 확인 (`import.*anthropic` → `import.*gemini`)
- SEC-08 적용 범위 확인: lesson-note.js 외에 monthly-report.js, churn.js 두 파일만 추가 적용 필요

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Firebase ID Token + jose JWT 검증 (기존 auth.js) |
| V3 Session Management | no | AI 엔드포인트는 stateless |
| V4 Access Control | yes | 미들웨어의 역할별 접근 (AI_ENABLED 플래그, rate limit) |
| V5 Input Validation | yes | stripPii() — PII 필드 제거, body JSON parse 실패 400 반환 |
| V6 Cryptography | no | 해시/암호화 직접 사용 없음 (anonymize는 레이블 치환) |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| studentName raw 전송 to AI API | Information Disclosure | anonymize.js buildNameMap → deanonymize 패턴 (SEC-08) |
| AI API 비용 무제한 소비 | Denial of Service | RATE_LIMIT_KV (20 req/min/user), ratelimit.js |
| 미인증 AI 호출 | Elevation of Privilege | _middleware.js Firebase JWT 검증 필수 |
| AI 응답에 익명 이름 누출 | Information Disclosure | deanonymize() 누락 방지 (Pitfall 2) |

---

## Sources

### Primary (HIGH confidence)
- [VERIFIED: 코드베이스 직접 검사] — functions/api/ai/_utils/anthropic.js (callAnthropic이 Gemini 호출)
- [VERIFIED: 코드베이스 직접 검사] — functions/api/ai/_utils/anonymize.js (buildNameMap, anonymize, deanonymize)
- [VERIFIED: 코드베이스 직접 검사] — functions/api/ai/monthly-report.js (studentName raw 전송 확인)
- [VERIFIED: 코드베이스 직접 검사] — functions/api/ai/churn.js (name raw 전송 확인)
- [VERIFIED: 코드베이스 직접 검사] — src/components/ai/AiAssistant.jsx (기존 ListResult, ChurnListResult 구조)
- [VERIFIED: 코드베이스 직접 검사] — src/components/aireports/MonthlyReportsView.jsx (기존 리포트 생성/공개 기능 완성)
- [VERIFIED: 코드베이스 직접 검사] — src/components/dashboard/ChurnWidget.jsx (이탈 위험 점수 로직)
- [VERIFIED: 코드베이스 직접 검사] — src/components/shared/AlimtalkModal.jsx (props 구조)
- [VERIFIED: 코드베이스 직접 검사] — wrangler.toml (RATE_LIMIT_KV 바인딩 확인)
- [VERIFIED: 코드베이스 직접 검사] — src/aiClient.js (callAi, aiChurnAnalysis 패턴)

### Secondary (MEDIUM confidence)
- [CITED: Google AI Studio 공식 문서 / 웹 검색] — Gemini 2.5 Flash 무료 티어: RPM 15, RPD 1,500, TPM 1M (계정·지역별 변동 가능)

### Tertiary (LOW confidence)
- [ASSUMED] — 기존 `학생A` 포맷이 Nick의 `student_XXXX` 요구와 호환 가능한지
- [ASSUMED] — App.jsx의 StudentDetailModal 오픈 state명

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 전체 코드베이스 직접 검사
- Architecture: HIGH — Worker 구조, React 컴포넌트 구조 직접 확인
- Pitfalls: HIGH — 기존 PITFALLS.md와 코드 패턴 교차 검증

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (프로젝트 코드 변경이 없는 한)
