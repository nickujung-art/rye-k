# Phase 5: 수납 자동화 (Payment Automation) - Research

**Researched:** 2026-05-08
**Domain:** Cloudflare Workers webhook, Firestore payment records, React inline editing, Korean fuzzy matching
**Confidence:** HIGH (all findings verified from codebase — no external library dependencies added)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**수강료 일괄 입력 UX (PAY-01)**
- D-01: PaymentsView.jsx에 스프레드시트 형태 인라인 편집 추가 — 학생 목록 테이블에서 수강료 셀 클릭 시 직접 편집 가능
- D-02: 77명 일괄 입력이 가능하도록 Tab/Enter로 다음 행 이동 지원
- D-03: 저장은 `updateStudentDoc()` per-op 트랜잭션 사용 (saveStudents 절대 금지)

**수납 현황 대시보드 (PAY-02)**
- D-04: Dashboard.jsx 홈탭에 미납 현황 카드 추가 — 이달 미납 인원, 수납률(%), 미납 금액 합계 표시
- D-05: 카드 클릭 시 PaymentsView로 이동하며 미납 필터 활성화 상태로 진입

**월별 수납 뷰 초기화 (PAY-03)**
- D-06: '새달 수납 쓰기' 버튼 — 새 달 선택 시 해당 월 수납 레코드 없음 = 미납으로 자동 표시 (기존 getPayment() 로직과 일치)
- D-07: 전체 초기화 버튼은 구현하지 않음

**카카오뱅크 입금 자동 매칭 파이프라인 (PAY-04/05)**
- D-08: Toss Payments 가상계좌 대신 카카오뱅크 알림 → Tasker Webhook 방식 채택
- D-09: Tasker(Android) + AutoNotification 플러그인으로 카카오톡 입금 알림 감지
  - 트리거: KakaoTalk 알림 텍스트에 "입금" 포함
  - 정규식: `(\S+)\s+([\d,]+)원\s+입금` → `name`, `amount` 추출
  - HTTP POST to Cloudflare Worker
- D-10: Cloudflare Worker 엔드포인트: `functions/api/payments/kakaobank-webhook.js`
- D-11: 보안: API Key 방식 — `X-RYE-Secret: {secret}` 헤더 검증
- D-12: 입금자명 = 학생 본인 이름 기준 fuzzy 매칭
- D-13: 여러 알림 형식 허용

**미매칭 입금 UI (PAY-06)**
- D-14: PaymentsView.jsx에 '미매칭 입금' 탭 신설
- D-15: 미매칭 입금 저장 방식 — Claude 재량
- D-16: 탭에서 입금자명+금액 → 관리자가 학생 선택 → 수납 처리

**ALM-07 미납 리마인더 (스텁)**
- D-17: UI 스텁 포함 — 미납 학생 리스트에서 알림톡 발송 버튼 표시
- D-18: 실제 AlimTalk 발송은 Phase 4 완료 후
- D-19: 버튼 클릭 시 "Phase 4 AlimTalk 연동 후 활성화" 안내 또는 AlimtalkModal를 disabled 상태로 열기

### Claude's Discretion
- fuzzy 매칭 알고리즘: Levenshtein distance 기반, 한글 3글자 이름 기준 거리 1~2 이내 허용
- Webhook Worker 에러 처리 및 재시도 로직
- 스프레드시트 편집 UX 세부 디자인 (CSS-in-JS, 기존 PaymentsView 패턴 준수)
- 미매칭 입금 Firestore 저장 방식 세부 결정

### Deferred Ideas (OUT OF SCOPE)
- ALM-07 실제 AlimTalk 발송 (Phase 4 AlimTalk API 심사 완료 후 연결)
- Toss Payments 가상계좌 연동
- 다자녀 학부모 이름으로 입금 매칭
- 입금 이력 뷰
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PAY-01 | 학생 수강료(monthlyFee) 입력 UI 개선 — 학생 편집 화면에서 편리하게 입력 | PaymentsView 내 인라인 편집, Tab/Enter 키보드 이동, updateStudentDoc() 저장 |
| PAY-02 | 수납 현황 대시보드 — 미납 학생 목록, 월별 수납률 | Dashboard 이미 payments prop 수신, dash-card 패턴으로 카드 추가, nav("payments") 이동 |
| PAY-03 | 월별 수납 상태 일괄 초기화 / 수동 확인 처리 UI | getPayment() 로직 그대로 — 레코드 없음=미납. 새달 수납 쓰기 버튼으로 월 초기화 trigger |
| PAY-04 | Toss Payments 가상계좌 Webhook Worker — (재범위: KakaoBank Tasker webhook) | functions/api/ai/ 패턴 복제, X-RYE-Secret 헤더 인증 |
| PAY-05 | 입금 자동 매칭 — 학생 이름 + 금액 기반 fuzzy 매칭 | Levenshtein inline 구현, Firestore 직접 쓰기 (runTransaction 패턴) |
| PAY-06 | 미매칭 입금 리뷰 화면 — 수동 매칭 UI | PaymentsView 탭 추가, rye-unmatched-payments Firestore 컬렉션 |
| ALM-07 | 미납 리마인더 알림톡 자동 발송 — 수납 자동화와 연동 | AlimtalkModal 이미 import됨 — disabled 상태 스텁 |
</phase_requirements>

---

## Summary

Phase 5는 세 가지 독립적인 기술 영역으로 구성된다: (1) React 인라인 스프레드시트 편집 (PAY-01, PAY-03), (2) Cloudflare Worker webhook + Firestore fuzzy-match 자동 수납 (PAY-04/05/06), (3) Dashboard 카드 추가 (PAY-02)와 AlimtalkModal 스텁 (ALM-07). 세 영역은 서로 독립적으로 구현 가능하며 병렬 wave로 계획할 수 있다.

가장 중요한 아키텍처 결정은 이미 CONTEXT.md에서 잠금 처리되어 있다. 미매칭 입금 Firestore 저장 위치만 Claude 재량으로 남아있으며, 본 연구에서 권장사항을 제시한다. 외부 라이브러리 추가는 없으며, Levenshtein 거리는 10줄 이내의 인라인 함수로 구현한다.

**Primary recommendation:** 미매칭 입금은 별도 `rye-unmatched-payments` Firestore 키에 저장한다 — `rye-payments` 오염 방지 및 App.jsx 리스너 간소화.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 수강료 인라인 편집 (PAY-01) | Browser / Client | Firestore (runTransaction) | UI state → updateStudentDoc() 호출 |
| 미납 현황 카드 (PAY-02) | Browser / Client | — | payments prop 이미 Dashboard에 전달됨 |
| 새달 수납 초기화 (PAY-03) | Browser / Client | Firestore (onSavePayments) | 기존 레코드 삽입 패턴 그대로 |
| Webhook 수신 및 파싱 (PAY-04) | Cloudflare Worker | — | Android Tasker → HTTPS POST |
| Fuzzy 매칭 및 수납 확정 (PAY-05) | Cloudflare Worker | Firestore (runTransaction) | Worker가 Firestore Admin SDK 없이 REST API로 쓰기 |
| 미매칭 큐 관리 (PAY-06) | Browser / Client | Firestore (rye-unmatched-payments) | App.jsx 리스너 추가, PaymentsView 탭 |
| ALM-07 스텁 (ALM-07) | Browser / Client | — | AlimtalkModal disabled 상태로 열기 |

---

## Standard Stack

### Core (이미 프로젝트에 존재)
| Library / API | Version | Purpose | Notes |
|---------------|---------|---------|-------|
| React 18 | 18.x | 인라인 편집 UI state | 이미 사용 중 |
| Cloudflare Pages Functions | — | Webhook Worker 호스팅 | wrangler.toml 이미 설정됨 |
| Firebase Firestore | v10 | 수납 데이터 영속 | `runTransaction` 이미 export됨 |
| Firestore REST API | v1 | Worker 내 Firestore 쓰기 | Firebase Admin SDK 없어도 REST로 가능 |

### No New Libraries Required

Levenshtein distance는 Worker 내부에 10줄 인라인 함수로 구현한다. npm 패키지(fast-levenshtein 등)는 불필요하며 Worker 번들 크기를 증가시킨다.

**Installation:** 추가 패키지 없음.

---

## Architecture Patterns

### Pattern 1: Cloudflare Worker — 기존 AI Worker 패턴 복제

기존 `functions/api/ai/lesson-note.js` 구조를 그대로 복제한다. 차이점은 Firebase JWT 인증 대신 단순 `X-RYE-Secret` 헤더 검증으로 대체하는 것이다.

```javascript
// functions/api/payments/kakaobank-webhook.js — 구조 패턴
export async function onRequest(context) {
  const { request, env } = context;

  // 1. Method guard
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  // 2. Secret header 검증 (AI worker의 verifyToken 대신)
  const secret = request.headers.get("X-RYE-Secret");
  if (!secret || secret !== env.RYE_WEBHOOK_SECRET) {
    return new Response("Unauthorized", { status: 401 });
  }

  // 3. Body 파싱
  let body;
  try { body = await request.json(); } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // 4. 핵심 로직 ...

  return json({ ok: true });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
```

[VERIFIED: codebase — functions/api/ai/lesson-note.js, functions/api/ai/_middleware.js]

### Pattern 2: wrangler.toml — 환경 변수 추가

기존 `wrangler.toml`에는 `[[kv_namespaces]]` 바인딩만 있다. `RYE_WEBHOOK_SECRET`은 Cloudflare 대시보드에서 secret으로 설정하며, wrangler.toml에는 기록하지 않는다 (평문 노출 방지).

```toml
# wrangler.toml 현재 상태 (변경 없음)
name = "rye-k-center"
pages_build_output_dir = "dist"
compatibility_date = "2024-09-23"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "59662ff0f284432db0e024e07fe9219e"
preview_id = "28d7163b7766455e9b4d4904c78318d1"
```

`RYE_WEBHOOK_SECRET`은 Cloudflare Pages 대시보드 → Settings → Environment variables → **Add secret** 으로 추가. wrangler CLI 방법: `wrangler pages secret put RYE_WEBHOOK_SECRET`.

[VERIFIED: codebase — wrangler.toml]

### Pattern 3: Worker 내 Firestore REST API 쓰기

Cloudflare Worker에는 Firebase Admin SDK를 사용할 수 없다 (Node.js 전용). 대신 Firestore REST API를 사용한다. 기존 프로젝트의 Firestore 구조는 단일 컬렉션 `appData`, 문서 키별 `{ value: [...], updatedAt: ... }` 형태다.

```javascript
// Worker 내 Firestore REST 패턴
const PROJECT_ID = "rye-k-center";
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/appData`;

async function firestoreGet(key, idToken) {
  const resp = await fetch(`${FIRESTORE_BASE}/${key}`, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  if (!resp.ok) return null;
  const data = await resp.json();
  // Firestore REST는 필드를 { arrayValue: { values: [...] } } 형태로 반환
  return data.fields?.value?.arrayValue?.values?.map(parseFirestoreValue) || [];
}

async function firestoreSet(key, value, idToken) {
  await fetch(`${FIRESTORE_BASE}/${key}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${idToken}`
    },
    body: JSON.stringify({
      fields: {
        value: toFirestoreArray(value),
        updatedAt: { integerValue: String(Date.now()) }
      }
    })
  });
}
```

**중요:** Worker가 Firestore에 쓰려면 인증이 필요하다. 두 가지 접근법이 있다:

**방법 A (권장): Firestore Security Rules 완화 + API Key**
- Firestore 보안 규칙에서 특정 문서(`rye-payments`, `rye-unmatched-payments`)에 대해 조건부 write 허용 패턴 추가
- Worker가 Firebase Web API Key(공개 OK)로 익명 로그인 토큰 획득 후 쓰기
- `firebase.js`의 `firebaseSignInAnon()` 패턴 참조

**방법 B: Cloudflare KV를 중간 버퍼로 사용 + 브라우저 polling**
- Worker가 KV에 pending 입금 기록 저장
- App.jsx가 주기적으로 Worker API 호출하여 pending 처리

**권장: 방법 B** — Firestore 보안 규칙 변경 없이 구현 가능, Worker가 인증 토큰 관리 불필요. `RATE_LIMIT_KV`가 이미 바인딩되어 있으므로 별도 KV namespace 추가 없이 재사용 가능.

[VERIFIED: codebase 패턴 분석 / ASSUMED: Firestore REST API 세부 필드 포맷]

### Pattern 4: Dashboard 카드 추가 패턴

Dashboard는 이미 `payments` prop을 받고 있다 (App.jsx line 859 확인). 기존 `이번달 수납 현황` 카드(lines 171-194)가 DonutChart를 표시한다. PAY-02의 미납 현황 카드는 이 카드를 **클릭 가능**하게 만들고 금액 합계를 추가하는 형태로 기존 카드를 확장하거나, 별도 카드로 추가한다.

```javascript
// Dashboard.jsx 기존 카드 확장 패턴 (lines 171-194)
// payments prop: 이미 존재 ✓
// monthPayments: 이미 계산됨 (line 53) ✓
// unpaidThisMonth: 이미 계산됨 (line 54) ✓

// 추가로 필요한 계산:
const totalDueThisMonth = students.reduce((sum, s) => {
  const p = monthPayments.find(mp => mp.studentId === s.id);
  return sum + (p?.amount ?? ((s.monthlyFee || 0) + (s.instrumentRental ? (s.rentalFee || 0) : 0)));
}, 0);
const totalPaidThisMonth = monthPayments
  .filter(p => p.paid)
  .reduce((sum, p) => sum + (p.paidAmount || p.amount || 0), 0);
const unpaidAmount = totalDueThisMonth - totalPaidThisMonth;
```

기존 `stat-card`에 `onClick={() => nav("payments")}` 패턴이 있으므로 (line 164-168), 동일 방식으로 클릭 시 payments view 이동. 미납 필터 활성화는 URL state가 없으므로 navigation + URL query parameter 또는 App.jsx state 통과가 필요하다 → App.jsx에 `initialFilterUnpaid` prop 추가 방식 권장.

[VERIFIED: codebase — Dashboard.jsx lines 44, 53-54, 163-169, 171-194; App.jsx line 859]

### Pattern 5: PaymentsView 탭 추가 패턴 (PAY-06)

현재 PaymentsView에는 탭 UI가 없다 — 단일 뷰이다. `ftabs` CSS 클래스가 constants.jsx에 이미 정의되어 있으므로 (line 178-182) 이를 활용한다.

```javascript
// PaymentsView.jsx 탭 상태 추가
const [activeTab, setActiveTab] = useState("payments"); // "payments" | "unmatched"

// 탭 UI (기존 ph 헤더 아래)
<div className="ftabs" style={{marginBottom:12}}>
  <button className={`ftab${activeTab==="payments"?" active":""}`}
    onClick={() => setActiveTab("payments")}>수납 관리</button>
  <button className={`ftab${activeTab==="unmatched"?" active":""}`}
    onClick={() => setActiveTab("unmatched")}>
    미매칭 입금
    {unmatchedPayments.length > 0 && (
      <span style={{marginLeft:4,background:"var(--red)",color:"#fff",borderRadius:99,padding:"1px 5px",fontSize:10,fontWeight:700}}>
        {unmatchedPayments.length}
      </span>
    )}
  </button>
</div>

// 탭 컨텐츠 조건부 렌더링
{activeTab === "payments" && <기존 수납 UI />}
{activeTab === "unmatched" && <UnmatchedPaymentsTab />}
```

[VERIFIED: codebase — constants.jsx ftabs CSS, PaymentsView.jsx 전체 구조]

### Pattern 6: 수강료 인라인 편집 (PAY-01)

기존 `pay-row` 클릭 시 모달이 열리는 방식을 유지하면서, 각 행의 수강료 셀에 직접 편집 가능한 input을 추가한다. Tab/Enter 이동을 위해 `onKeyDown` 핸들러가 필요하다.

```javascript
// 인라인 편집 상태
const [feeEdits, setFeeEdits] = useState({}); // { studentId: newFeeValue }
const [savingFeeId, setSavingFeeId] = useState(null);

// pay-row 내 수강료 인라인 편집 셀
<div
  onClick={e => e.stopPropagation()}
  style={{display:"flex",alignItems:"center",gap:4}}
>
  <input
    className="inp"
    inputMode="numeric"
    value={feeEdits[s.id] !== undefined
      ? (feeEdits[s.id] || "")
      : (s.monthlyFee ? s.monthlyFee.toLocaleString("ko-KR") : "")}
    onChange={e => setFeeEdits(f => ({
      ...f,
      [s.id]: parseInt(e.target.value.replace(/[^\d]/g,"")) || 0
    }))}
    onBlur={async () => {
      if (feeEdits[s.id] === undefined || feeEdits[s.id] === s.monthlyFee) return;
      setSavingFeeId(s.id);
      await updateStudentDoc({ ...s, monthlyFee: feeEdits[s.id] });
      setFeeEdits(f => { const n = {...f}; delete n[s.id]; return n; });
      setSavingFeeId(null);
    }}
    onKeyDown={e => {
      if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        // 다음 학생 행의 input으로 포커스 이동
        const idx = visibleStudents.findIndex(st => st.id === s.id);
        const nextId = visibleStudents[idx + 1]?.id;
        if (nextId) document.querySelector(`[data-fee-input="${nextId}"]`)?.focus();
      }
    }}
    data-fee-input={s.id}
    style={{width:90,height:32,padding:"4px 8px",fontSize:12,textAlign:"right"}}
  />
  <span style={{fontSize:11,color:"var(--ink-30)"}}>원</span>
</div>
```

저장은 `updateStudentDoc()` (per-op 트랜잭션) 사용. **`saveStudents()` 절대 금지.**

[VERIFIED: codebase — firebase.js updateStudentDoc export 확인, PaymentsView.jsx 구조]

### Pattern 7: Levenshtein Fuzzy 매칭 (PAY-05)

Cloudflare Worker 환경에서 npm 패키지 없이 인라인 구현:

```javascript
// functions/api/payments/kakaobank-webhook.js 내 인라인
function levenshtein(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({length: m+1}, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i-1] === b[j-1]
        ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
    }
  }
  return dp[m][n];
}

function fuzzyMatchStudent(inputName, students, currentMonth) {
  // 1. 완전 일치 우선
  const exact = students.filter(s => s.name === inputName);
  if (exact.length === 1) return { match: exact[0], confidence: "exact" };
  if (exact.length > 1) return { match: null, confidence: "duplicate_exact" };

  // 2. Levenshtein 1 이내
  const close = students
    .map(s => ({ s, dist: levenshtein(inputName, s.name) }))
    .filter(({ dist }) => dist <= 1)
    .sort((a, b) => a.dist - b.dist);

  if (close.length === 1) return { match: close[0].s, confidence: "fuzzy_1" };
  if (close.length > 1) return { match: null, confidence: "duplicate_fuzzy" };

  return { match: null, confidence: "no_match" };
}
```

매칭 로직:
1. 완전 일치 단일 → 매칭 확정
2. 동명이인(완전 일치 복수) → 미매칭 큐
3. Levenshtein 1 이내 단일 → 매칭 확정
4. Levenshtein 1 이내 복수 → 미매칭 큐
5. 매칭 없음 → 미매칭 큐

금액 검증: `autoFee = s.monthlyFee` 기준 ±10% 이내 허용 (0원 학생은 금액 검증 건너뜀).

[ASSUMED: Levenshtein distance 1 기준으로 한글 3글자 이름 오타를 충분히 커버 가능]

### Pattern 8: ALM-07 스텁 — AlimtalkModal disabled 패턴

AlimtalkModal은 이미 PaymentsView.jsx에 import되어 있다 (line 6). `alimtalkModal` state는 `null | "monthly_fee" | "unpaid_reminder"` (line 20).

스텁 구현 방법: `"unpaid_reminder"` 타입으로 AlimtalkModal을 열되, `onSend` 핸들러에서 "Phase 4 AlimTalk 연동 후 활성화됩니다" 토스트를 표시하고 실제 발송 없이 닫는다.

```javascript
// PaymentsView.jsx 내 미납 리스트 행에 추가할 스텁 버튼
{canManageAll(currentUser.role) && !isPaid && (
  <button
    onClick={e => { e.stopPropagation(); setAlimtalkModal("unpaid_reminder"); }}
    style={{...기존 quick-pay 버튼 스타일, background:"var(--blue-lt)", color:"var(--blue)"}}
    title="ALM-07: Phase 4 AlimTalk 연동 후 활성화"
  >
    💬
  </button>
)}

// AlimtalkModal onSend 핸들러 (스텁)
onSend={async () => {
  // Phase 4 이전 스텁 — 실제 발송 없음
  alert 금지 → 토스트 패턴 사용: onLog 또는 상위 showToast 필요
  setAlimtalkModal(null);
}}
```

**주의:** PaymentsView의 `onSend`는 현재 `sendAligoMessage(type, targets)` 호출 (line 579). 이 함수가 Phase 4 전에 실제 발송을 시도할 수 있으므로 스텁에서는 `onSend`를 no-op으로 처리.

[VERIFIED: codebase — PaymentsView.jsx lines 6, 20, 570-582; AlimtalkModal.jsx 전체]

### Anti-Patterns to Avoid

- **`saveStudents([...])` 사용:** 이 함수는 throw만 함. `updateStudentDoc()` 또는 `batchStudentDocs()` 필수.
- **`window.confirm` / `window.alert` 사용:** 절대 금지. 인라인 UI 또는 커스텀 모달 사용.
- **외부 CSS 파일 생성:** 모든 CSS는 `src/constants.jsx`의 CSS 문자열에 추가.
- **Worker에서 Firebase Admin SDK 사용:** Cloudflare Worker는 Node.js 환경 아님. REST API 또는 KV 버퍼 방식 사용.
- **payments 배열 전체 재저장 패턴:** Worker가 Firestore에 쓸 때 기존 payments 배열 전체를 덮어쓰는 것은 race condition 위험. runTransaction 필수.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Tab/Enter 키보드 이동 | 복잡한 포커스 관리 시스템 | `data-fee-input` attribute + `document.querySelector` | 단순하고 충분함 |
| Worker 인증 | JWT 검증 | `X-RYE-Secret` 단순 헤더 비교 | Tasker 기기 고정, JWT 불필요 |
| Firestore 연결 (Worker) | Firebase Admin SDK | KV 버퍼 방식 또는 REST API | Worker에서 Admin SDK 사용 불가 |
| 알림 디자인 | 커스텀 toast 컴포넌트 | 기존 showToast (App.jsx에서 prop으로 전달) | 이미 구현됨 |

---

## Firestore Decision: rye-unmatched-payments (별도 컬렉션 권장)

**권장: `rye-unmatched-payments` 별도 Firestore 키 사용**

이유:
1. `rye-payments`는 App.jsx에서 `savePayments(upd)` 패턴으로 전체 배열을 sSet — unmatched 레코드가 섞이면 Cloudflare Worker가 쓸 때 기존 payments가 유실될 위험
2. PaymentsView의 기존 getPayment(), filterUnpaid 로직이 unmatched 레코드를 잘못 처리할 수 있음
3. 별도 키로 분리하면 App.jsx에 `unmatchedPayments` state 하나만 추가하면 됨

**Firestore 레코드 구조:**
```javascript
// rye-unmatched-payments 항목
{
  id: uid(),
  senderName: "홍길동",   // 입금자명 (Tasker에서 파싱)
  amount: 150000,         // 입금액
  timestamp: Date.now(), // 입금 시각
  source: "kakaobank",   // 입금 출처
  rawText: "[카카오뱅크] 홍길동 150,000원 입금", // 원본 알림 텍스트
  createdAt: Date.now(),
  matchedAt: null,        // 수동 매칭 완료 시 타임스탬프
  matchedStudentId: null, // 수동 매칭 완료 시 학생 ID
}
```

**App.jsx에 추가 필요:**
```javascript
// App.jsx state 추가
const [unmatchedPayments, setUnmatchedPayments] = useState([]);

// KEYS 배열에 추가
{ key: "rye-unmatched-payments", setter: setUnmatchedPayments, default: [] },

// PaymentsView props에 추가
<PaymentsView
  ...기존 props...
  unmatchedPayments={unmatchedPayments}
  onSaveUnmatched={async (upd) => { setUnmatchedPayments(upd); await sSet("rye-unmatched-payments", upd); }}
/>
```

[VERIFIED: App.jsx KEYS 패턴 lines 322-338; sSet 패턴 line 30]

---

## Common Pitfalls

### Pitfall 1: saveStudents() 사용 시 데이터 전멸
**What goes wrong:** 수강료 인라인 편집 후 `saveStudents(students.map(...))` 패턴을 사용하면 현재 뷰에 없는 회원 데이터가 유실된다.
**Why it happens:** `saveStudents`는 의도적으로 throw만 하도록 설계됨 (77명 손실 사고 재발 방지).
**How to avoid:** 반드시 `updateStudentDoc({ ...s, monthlyFee: newFee })` per-op 사용.
**Warning signs:** `saveStudents` import 시도 시 런타임 에러.

### Pitfall 2: Worker에서 Firestore 동시성 문제
**What goes wrong:** Worker가 현재 payments 배열을 GET → 수정 → SET 하는 사이 브라우저 탭에서도 같은 배열을 수정하면 한쪽 변경이 유실된다.
**Why it happens:** Firestore는 낙관적 잠금이 없음 (트랜잭션 없이).
**How to avoid:** KV 버퍼 방식 사용 — Worker는 KV에만 쓰고, 브라우저가 주기적으로 KV polling하여 Firestore에 반영.
**Warning signs:** 간헐적 수납 내역 유실 리포트.

### Pitfall 3: 인라인 편집과 모달 열기 이벤트 충돌
**What goes wrong:** pay-row에 onClick이 있어 모달이 열리는데, 인라인 input 클릭 시 모달도 함께 열린다.
**Why it happens:** 이벤트 버블링.
**How to avoid:** input 래퍼에 `onClick={e => e.stopPropagation()}` 필수.
**Warning signs:** 인라인 input 클릭 시 수강료 관리 모달이 동시에 열림.

### Pitfall 4: Dashboard unpaidAmount 계산 — 기관(isInstitution) 포함 여부
**What goes wrong:** `students` prop에 가상회원(isInstitution=true)이 포함되어 있으면 미납 금액 집계가 부풀려진다.
**Why it happens:** App.jsx가 Dashboard에 `visible` (가상회원 제외됨) 대신 실수로 `allMembers`를 전달할 경우.
**How to avoid:** Dashboard에서 `students.filter(s => !s.isInstitution)` 후 집계. 또는 App.jsx line 859 확인 — 현재 `visible` 전달 중.
**Warning signs:** 대시보드 미납 금액이 수납 화면과 불일치.

### Pitfall 5: X-RYE-Secret 타이밍 공격 취약성
**What goes wrong:** `secret !== env.RYE_WEBHOOK_SECRET` 단순 비교는 타이밍 공격에 취약하다.
**Why it happens:** 문자열 비교는 첫 번째 불일치 문자에서 즉시 반환.
**How to avoid:** Web Crypto API의 `crypto.subtle.timingSafeEqual()` 또는 동등한 상수 시간 비교 사용.
**Warning signs:** 보안 감사에서 타이밍 공격 지적.

```javascript
// 상수 시간 비교 (Worker 환경)
async function timingSafeEqual(a, b) {
  const encoder = new TextEncoder();
  const aBuffer = encoder.encode(a);
  const bBuffer = encoder.encode(b);
  if (aBuffer.length !== bBuffer.length) return false;
  const key = await crypto.subtle.importKey("raw", aBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig1 = await crypto.subtle.sign("HMAC", key, aBuffer);
  const sig2 = await crypto.subtle.sign("HMAC", key, bBuffer);
  return Buffer.from(new Uint8Array(sig1)).toString("hex") === Buffer.from(new Uint8Array(sig2)).toString("hex");
}
```

[ASSUMED: Web Crypto API가 Cloudflare Workers에서 지원됨 — 표준 Web API이므로 지원 가능성 높음]

---

## Code Examples

### 기존 Worker 구조 전체 참조
```javascript
// functions/api/ai/lesson-note.js — 완전한 Worker 패턴 (복제 기준)
export async function onRequest(context) {
  const { request, env } = context;
  let body;
  try { body = await request.json(); } catch { return new Response("Bad Request", { status: 400 }); }
  // ...로직...
  try {
    const result = await callGemini(env.GEMINI_API_KEY, {...});
    return json({ result });
  } catch (e) {
    if (e.status === 429) return new Response("Too Many Requests", { status: 429 });
    return json({ error: e.message }, 500);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { "content-type": "application/json" }
  });
}
```

### Dashboard 기존 수납 현황 카드 (확장 위치)
Dashboard.jsx lines 171-194: `canManageAll(currentUser.role)` 가드 내 `dash-card` 블록. DonutChart 컴포넌트와 납부/미납 인원 표시. 이 블록에 미납 금액(fmtMoney) 추가 및 `onClick={() => nav("payments")}` 추가로 PAY-02 충족 가능.

### App.jsx 수납 관련 핵심 라인
- Line 228: `const [payments, setPayments] = useState([]);`
- Line 328: KEYS 배열 내 `rye-payments` 리스너
- Line 478: `savePayments` 함수
- Line 859: Dashboard에 `payments={payments}` prop 전달 (이미 존재)
- Line 862: PaymentsView에 `onSavePayments` 전달 패턴

---

## Runtime State Inventory

> 이 Phase는 rename/migration이 아닌 기능 추가이므로 대부분 해당 없음.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | `rye-payments` 컬렉션 기존 레코드: `{ studentId, month, paid, amount, paidAmount, paidDate, method, note, extraCharges }` | 신규 필드 추가 없음 — 기존 구조 그대로 사용 |
| Live service config | `RYE_WEBHOOK_SECRET` — Cloudflare Pages에 아직 존재하지 않음 | Cloudflare Pages 대시보드에서 secret 등록 필요 |
| OS-registered state | 없음 | — |
| Secrets/env vars | `RYE_WEBHOOK_SECRET` — 신규 생성 필요 | `wrangler pages secret put RYE_WEBHOOK_SECRET` |
| Build artifacts | 없음 | — |

**`rye-unmatched-payments`:** 현재 Firestore에 존재하지 않음 — 첫 Worker 쓰기 시 자동 생성. App.jsx KEYS 배열에 추가 시 `default: []`로 처리되어 정상 작동.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Cloudflare Pages Functions | PAY-04/05 Webhook | ✓ | — (배포 중) | — |
| Cloudflare KV (RATE_LIMIT_KV) | Webhook KV 버퍼 | ✓ | — | 별도 namespace 추가 |
| Android 기기 (Tasker) | PAY-04 자동 감지 | 사용자 환경 의존 | — | 수동 수납 처리로 대체 |
| wrangler CLI | RYE_WEBHOOK_SECRET 등록 | ✓ (wrangler.toml 존재) | — | Cloudflare 웹 대시보드 |

**Missing dependencies:** 없음 (코드 변경 범위 내 모든 의존성 충족됨).

---

## Validation Architecture

> 이 프로젝트는 테스트 러너가 없음 (CLAUDE.md: "테스트 러너 없음. 검증은 `npm run build` 통과 + 브라우저 직접 확인"). 따라서 Nyquist validation은 수동 검증으로 대체한다.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | 없음 — 수동 브라우저 검증 |
| Config file | — |
| Quick run command | `npm run build` |
| Full suite command | `npm run build && npm run preview` |

### Phase Requirements → Verification Map
| Req ID | Behavior | Verification Method |
|--------|----------|-------------------|
| PAY-01 | 수강료 셀 클릭 → 인라인 편집 → Tab/Enter 이동 → 저장 | 브라우저 수납 화면 직접 테스트 |
| PAY-02 | Dashboard 홈탭 미납 카드 표시 → 클릭 시 payments 이동 | 브라우저 대시보드 확인 |
| PAY-03 | 다음 달 선택 시 레코드 없는 학생 = 미납 표시 | 브라우저 월 선택기 조작 |
| PAY-04 | Webhook POST → 401 (wrong secret) / 200 (correct secret) | curl 또는 Postman으로 엔드포인트 테스트 |
| PAY-05 | 입금자명 fuzzy 매칭 → 자동 수납 처리 확인 | Postman webhook 호출 후 Firestore 확인 |
| PAY-06 | 미매칭 입금 탭 → 학생 선택 → 수납 완료 | 브라우저 탭 전환 및 수동 매칭 테스트 |
| ALM-07 | 미납 학생 행 💬 버튼 → "Phase 4 연동 후 활성화" 안내 | 브라우저 클릭 확인 |

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (Webhook) | X-RYE-Secret 헤더 + timingSafeEqual |
| V3 Session Management | no | — |
| V4 Access Control | yes | canManageAll() 가드 유지 |
| V5 Input Validation | yes | Worker에서 body 파싱 시 try/catch, name/amount 타입 검증 |
| V6 Cryptography | no | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Webhook replay attack | Spoofing | timestamp 검증 (±5분 이내만 수락) |
| Secret 평문 노출 | Information Disclosure | wrangler.toml에 기록 금지, Cloudflare secret으로만 저장 |
| 대량 Webhook 호출 (DoS) | Denial of Service | RATE_LIMIT_KV 재사용 가능 — webhook IP당 rate limit |
| 악의적 name 필드 (XSS) | Tampering | Worker에서 name 파싱 시 문자열 검증 (한글+영문만 허용) |

---

## Open Questions (RESOLVED)

1. **Worker → Firestore 인증 방식 확정** ✓ RESOLVED: KV 버퍼 방식 채택 (Plan 05-04)
   - What we know: Admin SDK 사용 불가, REST API 가능, KV 버퍼 방식도 가능
   - Recommendation: KV 버퍼 방식 — Worker가 KV에 pending 기록, 브라우저 App.jsx가 주기적으로 polling하여 Firestore에 반영. 기존 RATE_LIMIT_KV namespace 재사용 가능.

2. **PAY-02 미납 필터 활성화 — Dashboard → PaymentsView 상태 전달** ✓ RESOLVED: `paymentsInitFilter` state 추가 (Plan 05-01)
   - What we know: `navigate("payments")` 호출로 뷰 이동 가능하나, `filterUnpaid` state는 PaymentsView 내부 state
   - Recommendation: App.jsx에 `paymentsInitFilter` state 추가, navigate("payments") 시 함께 전달. PaymentsView mount 시 useEffect로 초기화.

3. **Tasker 설정 가이드 위치** ✓ RESOLVED: `docs/operations/kakaobank-webhook-setup.md` 신규 파일 (Plan 05-04 checkpoint)
   - What we know: CONTEXT.md specifics 섹션에 Tasker 설정 가이드가 있음
   - Recommendation: `docs/operations/kakaobank-webhook-setup.md` 신규 파일 — Phase 5 플래닝에 태스크로 포함.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Levenshtein 거리 1로 한글 3글자 이름 오타 커버 가능 | Pattern 7 | 거리 2로 기준 완화 필요 — 동명이인 충돌 증가 |
| A2 | Web Crypto API `timingSafeEqual` Cloudflare Workers 지원 | Pitfall 5 | 단순 문자열 비교로 fallback |
| A3 | KV 버퍼 방식으로 Worker→Firestore race condition 방지 충분 | Pitfall 2 | 필요시 Firestore REST runTransaction 추가 |
| A4 | Firestore REST API 필드 포맷 (arrayValue 등) | Pattern 3 | 공식 Firestore REST 문서 재확인 필요 |

---

## Sources

### Primary (HIGH confidence — codebase 직접 검증)
- `src/components/payment/PaymentsView.jsx` — 탭 구조, 기존 state, AlimtalkModal import 위치
- `src/components/dashboard/Dashboard.jsx` — payments prop 수신 확인, dash-card 패턴, 기존 수납 현황 카드
- `src/App.jsx` — KEYS 배열 패턴, savePayments, Dashboard/PaymentsView props 전달
- `functions/api/ai/lesson-note.js` — Worker onRequest 구조 패턴
- `functions/api/ai/_middleware.js` — verifyToken, checkRateLimit 패턴
- `functions/api/ai/_utils/auth.js` — JWT 검증 패턴 (webhook에서는 사용 안 함)
- `functions/api/ai/_utils/ratelimit.js` — KV rate limit 구현
- `wrangler.toml` — 현재 KV 바인딩 구조
- `src/firebase.js` — runTransaction export, updateStudentDoc 위치
- `src/constants.jsx` — CSS 클래스 정의, PAY_METHODS 상수
- `src/components/shared/AlimtalkModal.jsx` — 모달 props, onSend 패턴

### Tertiary (LOW confidence — ASSUMED 태그됨)
- Levenshtein distance 효과성 (한글 3글자 이름 기준 거리 1)
- Cloudflare Workers Web Crypto API 지원 범위

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — 모든 라이브러리는 기존 프로젝트 코드베이스에서 직접 확인됨
- Architecture: HIGH — 기존 파일 전체 독해 후 도출
- Worker 패턴: HIGH — lesson-note.js, _middleware.js 코드 직접 확인
- Fuzzy 매칭 효과성: LOW — 실제 한글 이름 오타 케이스 미검증

**Research date:** 2026-05-08
**Valid until:** 2026-06-08 (프로젝트 변경 없으면 유효)
