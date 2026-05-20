---
phase: QA-02-bugfix-critical
plan: "03"
type: execute
wave: 3
depends_on:
  - QA-02-02
files_modified:
  - src/App.jsx
  - functions/api/payments/sync-students.js
autonomous: true
db_risk: LOW
data_writes: false
requirements:
  - H4-last-login-write
  - H2-recovery-v1-safeguard
  - H6-jwt-role-fix

must_haves:
  truths:
    - "login() 성공 시 ryek_last_login이 localStorage에 기록된다"
    - "rye-recovery-v1 블록은 curStudents.length > 0 이면 절대 실행되지 않는다"
    - "sync-students.js role 검증이 JWT payload에서 읽는다"
    - "이 wave는 Firestore에 직접 데이터를 쓰거나 삭제하지 않는다"
  artifacts:
    - path: "src/App.jsx"
      provides: "ryek_last_login 기록 + recovery guard 강화"
      contains: "ryek_last_login"
    - path: "functions/api/payments/sync-students.js"
      provides: "JWT role 검증"
      contains: "payload.role"
  key_links:
    - from: "App.jsx login() line ~990"
      to: "setUserPersist(appUser)"
      via: "성공 직후 localStorage.setItem 추가"
      pattern: "last-login timestamp"
    - from: "App.jsx checkAllLoaded recovery block line ~384"
      to: "rye-recovery-v1 guard"
      via: "curStudents.length > 0 조건 추가"
      pattern: "early return guard"
---

<objective>
## Wave 3: 로직 버그 수정

⚠️ DB 직접 쓰기 없음. App.jsx 로직 수정 + Cloudflare Function 권한 검증 수정.
⚠️ H2 (rye-recovery-v1) 수정 시 기존 데이터를 삭제하거나 덮어쓰는 코드 절대 추가 금지.
   오직 실행 조건을 더 엄격하게만 만드는 것.

### 수정할 3가지

**H4: ryek_last_login 미기록 → 30일 재인증 체크 오작동**
- 현재: login() 성공해도 ryek_last_login을 쓰지 않음
- 결과: lastLogin이 항상 0 → 30일 체크가 매 마운트에 강제 로그아웃 트리거 가능
- 수정: login() 성공 후 `localStorage.setItem("ryek_last_login", String(Date.now()))` 추가

**H2: rye-recovery-v1 재발동 위험**
- 현재: localStorage 플래그가 없으면 새 브라우저/시크릿 모드에서 재실행됨
- 수정: `curStudents.length > 0`이면 즉시 skip (실제 데이터가 있으면 씨드 실행 불필요)
- ⚠️ 씨드 데이터 자체는 절대 건드리지 말 것. 조건만 추가.

**H6: sync-students.js role을 body에서 읽는 보안 취약점**
- 현재: `const role = String(body.role || "")`
- 수정: JWT payload에서 role 읽기
</objective>

<tasks>

<task type="auto">
  <name>Task 1: App.jsx — login() 성공 시 ryek_last_login 기록</name>
  <read_first>
    - src/App.jsx (lines 972-995: login 함수)
  </read_first>
  <files>
    src/App.jsx
  </files>
  <action>
**login() 함수에서 setUserPersist(appUser) 직전에 ryek_last_login 기록 추가**

현재 (line 990 근처):
```js
    setUserPersist(appUser);
    // Firebase Auth 성공 시 리스너를 이메일 권한으로 재시작 (write 오류 방지)
    if (fbUser) setListenersKey(k => k + 1);
    return true;
```

변경 후:
```js
    try { localStorage.setItem("ryek_last_login", String(Date.now())); } catch {}
    setUserPersist(appUser);
    // Firebase Auth 성공 시 리스너를 이메일 권한으로 재시작 (write 오류 방지)
    if (fbUser) setListenersKey(k => k + 1);
    return true;
```
  </action>
  <verify>
    <automated>grep -n "ryek_last_login.*setItem\|setItem.*ryek_last_login" src/App.jsx</automated>
  </verify>
  <acceptance_criteria>
    - login() 성공 분기(return true 직전)에 ryek_last_login setItem 포함
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 2: App.jsx — rye-recovery-v1 guard 강화 (curStudents.length > 0 시 skip)</name>
  <read_first>
    - src/App.jsx (lines 380-400: rye-recovery-v1 블록)
  </read_first>
  <files>
    src/App.jsx
  </files>
  <action>
⚠️ 이 수정은 조건을 추가하는 것만. 씨드 데이터 생성/삭제 코드는 절대 건드리지 않음.

현재 (line ~384):
```js
        if (!seeded && !hasPermissionError && !localStorage.getItem("rye-recovery-v1")) {
          const curStudents = received["rye-students"] || [];
```

변경 후:
```js
        if (!seeded && !hasPermissionError && !localStorage.getItem("rye-recovery-v1")) {
          const curStudents = received["rye-students"] || [];
          if (curStudents.length > 0) {
            // 실제 학생 데이터가 있으면 복구 불필요 — 플래그만 세팅하고 스킵
            localStorage.setItem("rye-recovery-v1", "1");
          } else {
```

그리고 기존 블록 전체를 `else { ... }` 안에 넣는다.
즉, curStudents.length > 0이면 플래그만 세팅하고 복구 로직 실행 안 함.

**기존 씨드 병합 로직(merged, final, sSet 호출)은 그대로 유지.**
단지 `curStudents.length > 0`일 때는 실행 안 되게 else로 감쌀 것.
  </action>
  <verify>
    <automated>grep -n "curStudents.length\|rye-recovery-v1" src/App.jsx | head -10</automated>
  </verify>
  <acceptance_criteria>
    - `curStudents.length > 0` 체크 포함
    - 기존 씨드 병합 로직이 else 블록 내에 유지됨
    - sSet("rye-students", ...) 호출은 curStudents.length === 0 일 때만 실행됨
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 3: sync-students.js — JWT payload에서 role 읽기</name>
  <read_first>
    - functions/api/payments/sync-students.js (전체, 특히 role 검증 부분)
    - functions/api/ai/_utils/auth.js (verifyToken 반환값 구조 확인)
  </read_first>
  <files>
    functions/api/payments/sync-students.js
  </files>
  <action>
**body.role → verifyToken payload에서 role 읽기로 교체**

현재:
```js
const role = String(body.role || "").toLowerCase();
if (role !== "admin" && role !== "manager") {
  return json({ error: "Forbidden" }, 403);
}
```

변경 후 (verifyToken 이미 호출된 이후 위치에서):
```js
// JWT payload의 custom claim에서 role 읽기 (body.role 신뢰 금지)
const jwtRole = String(payload?.role || "").toLowerCase();
if (jwtRole !== "admin" && jwtRole !== "manager") {
  return json({ error: "Forbidden" }, 403);
}
```

단, `payload` 변수가 이미 선언된 위치를 확인하고, 없으면 verifyToken 반환값을 먼저 받아야 함.
  </action>
  <verify>
    <automated>grep -n "body.role\|payload.role\|jwtRole" functions/api/payments/sync-students.js</automated>
  </verify>
  <acceptance_criteria>
    - `body.role` 사용 없음
    - `payload.role` 또는 `jwtRole` 사용
  </acceptance_criteria>
</task>

<task type="auto">
  <name>Task 4: npm run build 통과 확인</name>
  <action>
```bash
npm run build
```
  </action>
  <acceptance_criteria>
    - 빌드 에러 없음
  </acceptance_criteria>
</task>

</tasks>

<verification>
npm run build 통과
grep으로 ryek_last_login setItem 위치 확인
grep으로 curStudents.length 조건 확인
sync-students.js body.role 사용 없음 확인
</verification>

<success_criteria>
- H4: 로그인 시 ryek_last_login 기록 → 30일 재인증 체크 정상화
- H2: 기존 학생 데이터 있으면 recovery 블록 완전 스킵
- H6: sync-students.js JWT role 검증 적용
- npm run build 통과
</success_criteria>
