---
phase: QA-02-bugfix-critical
plan: "04"
type: execute
wave: 4
depends_on:
  - QA-02-03
files_modified:
  - src/constants.jsx
  - functions/api/auth/set-role.js
  - functions/api/payments/kakaobank-webhook.js
  - functions/api/ai/_utils/auth.js
autonomous: true
db_risk: NONE
data_writes: false
requirements:
  - C1-admin-password-hardcoded
  - C4-firebase-api-key-hardcoded
  - C5-timing-safe-equal-fix
  - rate-limit-fail-closed
  - set-role-role-whitelist
  - verifyToken-anon-block

must_haves:
  truths:
    - "ADMIN.password가 소스 코드에 평문으로 존재하지 않는다 (import.meta.env 사용)"
    - "set-role.js의 FIREBASE_API_KEY가 소스 코드에 하드코딩되지 않는다 (env.FIREBASE_API_KEY 사용)"
    - "timingSafeEqual이 랜덤 키 HMAC + XOR 누적으로 진짜 constant-time 비교를 수행한다"
    - "KV가 바인딩되지 않은 경우 rate limit은 fail-open이 아닌 fail-closed(false)로 동작한다"
    - "set-role.js가 Firestore에서 읽은 role 값을 화이트리스트(teacher|manager)로 검증한다"
    - "verifyToken이 anonymous sign_in_provider를 명시적으로 차단한다"
    - "이 wave는 Firestore에 직접 데이터를 쓰거나 삭제하지 않는다"
  artifacts:
    - path: "src/constants.jsx"
      provides: "ADMIN.password 환경변수화"
      contains: "import.meta.env.VITE_ADMIN_PASSWORD"
    - path: "functions/api/auth/set-role.js"
      provides: "FIREBASE_API_KEY env + role whitelist + admin 이메일 도메인 수정"
      contains: "env.FIREBASE_API_KEY"
    - path: "functions/api/payments/kakaobank-webhook.js"
      provides: "constant-time 비교 + fail-closed rate limit + GET role JWT 검증"
      contains: "diff |= v1[i] ^ v2[i]"
    - path: "functions/api/ai/_utils/auth.js"
      provides: "anonymous 사용자 차단"
      contains: "sign_in_provider"
  key_links:
    - from: "constants.jsx ADMIN.password"
      to: "import.meta.env.VITE_ADMIN_PASSWORD"
      via: "Vite 환경변수 (.env.local)"
      pattern: "secret externalization"
    - from: "set-role.js FIREBASE_API_KEY const"
      to: "env.FIREBASE_API_KEY"
      via: "Cloudflare Worker env binding"
      pattern: "secret externalization"
    - from: "timingSafeEqual string compare"
      to: "XOR accumulator constant-time"
      via: "random key HMAC + bitwise OR"
      pattern: "timing-safe comparison"
    - from: "verifyToken no anon check"
      to: "sign_in_provider === anonymous → null"
      via: "payload.firebase.sign_in_provider check"
      pattern: "anonymous block"
---

<objective>
## Wave 4: 보안 강화 (DB 쓰기 없음)

⚠️ 이 wave의 모든 수정은 Firestore에 아무것도 쓰지 않는다.
   코드 보안 취약점만 수정.

### 수정할 6가지

**C1: ADMIN.password 하드코딩 → 환경변수**
- 현재: `password:"rye2024"` 소스코드에 평문 노출
- 수정: `import.meta.env.VITE_ADMIN_PASSWORD` 사용 + `.env.local` 생성

**C4: set-role.js FIREBASE_API_KEY 하드코딩 → 환경변수**
- 현재: `const FIREBASE_API_KEY = "AIzaSyD..."` 소스코드 노출
- 수정: `env.FIREBASE_API_KEY` (Cloudflare Worker env binding)
- 추가: admin 이메일 도메인 `@ryek.app` → `@ryek2.app` (도메인 변경 반영)
- 추가: Firestore에서 읽은 role을 화이트리스트로 검증

**C5: timingSafeEqual 취약점 — 실제 constant-time 비교 아님**
- 현재: 문자열 hex 비교(`h(s1) === h(s2)`) — JS 엔진이 short-circuit 가능
- 수정: 랜덤 키로 HMAC 생성 후 XOR 누적(`diff |= v1[i] ^ v2[i]`) → 진짜 constant-time

**rate-limit fail-open → fail-closed**
- 현재: `if (!kv) return true` → KV 미바인딩 시 모든 요청 통과
- 수정: `if (!kv) return false` → KV 없으면 차단

**kakaobank GET handler: role을 query param에서 읽음**
- 현재: `const role = String(url.searchParams.get("role") || "").toLowerCase()`
- 수정: JWT payload의 custom claim에서 role 읽기

**verifyToken: anonymous 사용자 미차단**
- 현재: Firebase JWT 서명만 검증, anonymous 사용자 통과
- 수정: `payload.firebase.sign_in_provider === "anonymous"` 이면 null 반환
</objective>

<tasks>

<task type="auto">
  <name>Task 1: constants.jsx — ADMIN.password 환경변수화</name>
  <read_first>
    - src/constants.jsx (line 10: ADMIN 상수)
  </read_first>
  <files>
    src/constants.jsx
  </files>
  <action>
**constants.jsx line 10에서 password를 환경변수로 교체**

현재:
```js
export const ADMIN = { id:"admin", username:"admin", password:"rye2024", role:"admin", name:"관리자" };
```

변경 후:
```js
export const ADMIN = { id:"admin", username:"admin", password: import.meta.env.VITE_ADMIN_PASSWORD || "rye2024", role:"admin", name:"관리자" };
```

**그리고 `.env.local` 파일 생성 (없는 경우):**
```
VITE_ADMIN_PASSWORD=rye2024
```

⚠️ `.env.local`은 `.gitignore`에 이미 있으므로 커밋되지 않음. 확인 필요.
  </action>
  <verify>
    <automated>grep -n "VITE_ADMIN_PASSWORD\|import.meta.env" src/constants.jsx</automated>
  </verify>
  <acceptance_criteria>
    - `import.meta.env.VITE_ADMIN_PASSWORD` 포함
    - 평문 `"rye2024"`가 소스 코드에만 fallback으로만 존재 (환경변수 우선)
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: auth.js — verifyToken anonymous 사용자 차단</name>
  <read_first>
    - functions/api/ai/_utils/auth.js (전체)
  </read_first>
  <files>
    functions/api/ai/_utils/auth.js
  </files>
  <action>
**verifyToken에서 anonymous sign_in_provider 명시 차단**

현재 (line 14-24):
```js
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    if (!payload?.sub) return null;
    return payload;
  } catch {
    return null;
  }
```

변경 후:
```js
  try {
    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://securetoken.google.com/${PROJECT_ID}`,
      audience: PROJECT_ID,
    });
    if (!payload?.sub) return null;
    if (payload.firebase?.sign_in_provider === "anonymous") return null;
    return payload;
  } catch {
    return null;
  }
```
  </action>
  <verify>
    <automated>grep -n "sign_in_provider\|anonymous" functions/api/ai/_utils/auth.js</automated>
  </verify>
  <acceptance_criteria>
    - `sign_in_provider === "anonymous"` 체크 포함
    - anonymous인 경우 null 반환
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: set-role.js — API Key env화 + admin 이메일 수정 + role whitelist</name>
  <read_first>
    - functions/api/auth/set-role.js (전체)
  </read_first>
  <files>
    functions/api/auth/set-role.js
  </files>
  <action>
**수정 1: FIREBASE_API_KEY 상수 제거, env에서 읽기**

현재 (line 4-5):
```js
const FIREBASE_PROJECT_ID = "rye-k-center";
const FIREBASE_API_KEY = "AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks";
```

변경 후:
```js
const FIREBASE_PROJECT_ID = "rye-k-center";
```

그리고 `setCustomClaims` 함수(line 58)에서 URL 생성 부분:
```js
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_API_KEY}`;
```

변경 후 (env 파라미터 추가):
```js
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${env.FIREBASE_API_KEY}`;
```

`setCustomClaims` 시그니처도 수정:
```js
async function setCustomClaims(uid, claims, accessToken, env) {
```

그리고 호출부 (line 103, 117, 126)에서 `env` 전달:
```js
await setCustomClaims(uid, { role: "admin", teacherId: "admin" }, accessToken, env);
// ... 나머지 호출에도 env 추가
```

**수정 2: admin 이메일 도메인 수정 (line 102)**

현재:
```js
    if (email === "admin@ryek.app") {
```

변경 후:
```js
    if (email === "admin@ryek2.app") {
```

**수정 3: role whitelist 추가 (line 123 이후)**

현재 (line 123):
```js
    const role = strField(teacher.role) || "teacher";
```

변경 후:
```js
    const ALLOWED_ROLES = new Set(["teacher", "manager"]);
    const rawRole = strField(teacher.role);
    const role = ALLOWED_ROLES.has(rawRole) ? rawRole : "teacher";
```
  </action>
  <verify>
    <automated>grep -n "FIREBASE_API_KEY\|env\.FIREBASE\|ALLOWED_ROLES\|ryek2\.app" functions/api/auth/set-role.js</automated>
  </verify>
  <acceptance_criteria>
    - `const FIREBASE_API_KEY = ...` 라인 없음
    - `env.FIREBASE_API_KEY` 사용
    - `admin@ryek2.app` 사용 (구 `admin@ryek.app` 없음)
    - `ALLOWED_ROLES` Set 포함
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: kakaobank-webhook.js — timingSafeEqual + fail-closed + GET role JWT</name>
  <read_first>
    - functions/api/payments/kakaobank-webhook.js (lines 162-172: GET role, lines 207-233: timingSafeEqual + checkRateLimit)
  </read_first>
  <files>
    functions/api/payments/kakaobank-webhook.js
  </files>
  <action>
**수정 1: timingSafeEqual — 진짜 constant-time 비교 (line 207-221)**

현재:
```js
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aB = enc.encode(a);
  const bB = enc.encode(b);
  if (aB.length !== bB.length) return false;
  const key = await crypto.subtle.importKey(
    "raw", aB, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const [s1, s2] = await Promise.all([
    crypto.subtle.sign("HMAC", key, aB),
    crypto.subtle.sign("HMAC", key, bB),
  ]);
  const h = (buf) => Array.from(new Uint8Array(buf)).map(x => x.toString(16).padStart(2, "0")).join("");
  return h(s1) === h(s2);
}
```

변경 후 (랜덤 키 + XOR 누적 = 진짜 constant-time):
```js
async function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aB = enc.encode(a);
  const bB = enc.encode(b);
  if (aB.length !== bB.length) return false;
  // 랜덤 키로 HMAC → JS 엔진의 string short-circuit 우회
  const key = await crypto.subtle.generateKey({ name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const [s1, s2] = await Promise.all([
    crypto.subtle.sign("HMAC", key, aB),
    crypto.subtle.sign("HMAC", key, bB),
  ]);
  const v1 = new Uint8Array(s1);
  const v2 = new Uint8Array(s2);
  let diff = 0;
  for (let i = 0; i < v1.length; i++) diff |= v1[i] ^ v2[i];
  return diff === 0;
}
```

**수정 2: checkRateLimit fail-open → fail-closed (line 225)**

현재:
```js
  if (!kv) return true; // fail open if KV not bound
```

변경 후:
```js
  if (!kv) return false; // fail closed — KV 미바인딩 시 차단
```

**수정 3: GET handler role을 query param → JWT payload에서 읽기 (line 168-172)**

현재:
```js
  const url = new URL(request.url);
  const role = String(url.searchParams.get("role") || "").toLowerCase();
  if (role !== "admin" && role !== "manager") {
    return json({ error: "Forbidden" }, 403);
  }
```

변경 후:
```js
  const jwtRole = String(payload?.role || "").toLowerCase();
  if (jwtRole !== "admin" && jwtRole !== "manager") {
    return json({ error: "Forbidden" }, 403);
  }
```

`const url = new URL(request.url);` 라인은 더 이상 불필요 → 제거.
  </action>
  <verify>
    <automated>grep -n "diff |= \|fail closed\|jwtRole\|url.searchParams\|return true.*KV\|return false.*KV" functions/api/payments/kakaobank-webhook.js</automated>
  </verify>
  <acceptance_criteria>
    - `diff |= v1[i] ^ v2[i]` 포함 (XOR accumulator)
    - `return true.*KV` 없음 (fail-open 제거)
    - `return false` fail-closed 포함
    - `url.searchParams.get("role")` 없음
    - `jwtRole` 또는 `payload?.role` 사용
  </acceptance_criteria>
</task>

<task type="human-execute">
  <name>Task 5: Cloudflare Workers — FIREBASE_API_KEY 환경변수 등록</name>
  <action>
**Cloudflare Dashboard 또는 wrangler CLI로 환경변수 추가:**

Cloudflare Pages → Settings → Environment variables → Production + Preview:
```
FIREBASE_API_KEY = AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks
```

또는 wrangler CLI로:
```bash
wrangler secret put FIREBASE_API_KEY
# 입력: AIzaSyDViGzxa0o1tqqX6fGr46Sfiews-ieGmks
```

⚠️ 이 작업은 Cloudflare Dashboard 접근이 필요하므로 Nick이 직접 수행.
⚠️ 배포 전에 이 환경변수가 등록되어 있지 않으면 set-role.js가 오작동함.
  </action>
  <verify>
    Cloudflare Dashboard → Pages → rye-k → Settings → Environment variables에서 FIREBASE_API_KEY 확인
  </verify>
  <acceptance_criteria>
    - Cloudflare Pages Production 환경에 FIREBASE_API_KEY 등록됨
    - (Optional) Preview 환경에도 등록
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 6: npm run build 통과 확인</name>
  <action>
```bash
npm run build
```
  </action>
  <acceptance_criteria>
    - 빌드 에러 없음
    - 빌드 성공
  </acceptance_criteria>
</task>

</tasks>

<verification>
npm run build 통과
grep으로 VITE_ADMIN_PASSWORD 위치 확인
grep으로 FIREBASE_API_KEY const 제거 확인
grep으로 timingSafeEqual XOR 누적 확인
grep으로 fail-closed rate limit 확인
grep으로 sign_in_provider anonymous 차단 확인
</verification>

<success_criteria>
- C1: ADMIN.password 소스코드에서 환경변수로 이동
- C4: FIREBASE_API_KEY 환경변수화 + admin 도메인 수정 + role whitelist
- C5: timingSafeEqual 진짜 constant-time 비교 + fail-closed rate limit + GET role JWT 검증
- verifyToken: anonymous 사용자 완전 차단
- npm run build 통과
</success_criteria>
