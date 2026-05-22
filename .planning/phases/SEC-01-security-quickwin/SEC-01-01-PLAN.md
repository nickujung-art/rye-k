---
phase: SEC-01-security-quickwin
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/constants.jsx
autonomous: true
requirements:
  - SEC-1

must_haves:
  truths:
    - "constants.jsx에 하드코딩 문자열 'rye2024'가 존재하지 않는다"
    - "ADMIN.password는 환경변수 없으면 빈 문자열을 반환한다"
    - "빌드가 정상 통과한다"
  artifacts:
    - path: "src/constants.jsx"
      provides: "ADMIN object without hardcoded password fallback"
      contains: "VITE_ADMIN_PASSWORD || \"\""
  key_links:
    - from: "src/constants.jsx ADMIN.password"
      to: "import.meta.env.VITE_ADMIN_PASSWORD"
      via: "환경변수 단독 참조 (fallback 없음)"
      pattern: "VITE_ADMIN_PASSWORD \\|\\| \"\""
---

<objective>
ADMIN 객체의 하드코딩 비밀번호 fallback `"rye2024"` 제거.

Purpose: `"rye2024"` 리터럴이 클라이언트 번들에 포함되어 DevTools에서 누구나 확인 가능한 CRITICAL 취약점 제거. VITE_ 접두 환경변수는 빌드 시 번들에 인라인되는 한계는 유지되지만, 하드코딩 fallback 제거만으로도 즉각적인 위험 경감 가능.

Output: src/constants.jsx ADMIN.password 1줄 수정
</objective>

<execution_context>
@C:/Users/GIGABYTE/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/GIGABYTE/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md

<interfaces>
<!-- 수정 대상 라인 (src/constants.jsx line 10) -->
현재 코드:
```js
export const ADMIN = { id:"admin", username:"admin", password: import.meta.env.VITE_ADMIN_PASSWORD || "rye2024", role:"admin", name:"관리자" };
```

수정 후 코드:
```js
export const ADMIN = { id:"admin", username:"admin", password: import.meta.env.VITE_ADMIN_PASSWORD || "", role:"admin", name:"관리자" };
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: ADMIN 하드코딩 비밀번호 fallback 제거</name>
  <files>src/constants.jsx</files>
  <action>
src/constants.jsx line 10의 ADMIN 객체에서 `|| "rye2024"` fallback을 `|| ""`로 교체한다.

수정 전:
```js
export const ADMIN = { id:"admin", username:"admin", password: import.meta.env.VITE_ADMIN_PASSWORD || "rye2024", role:"admin", name:"관리자" };
```

수정 후:
```js
export const ADMIN = { id:"admin", username:"admin", password: import.meta.env.VITE_ADMIN_PASSWORD || "", role:"admin", name:"관리자" };
```

주의사항:
- 이 한 줄 외에 constants.jsx의 다른 코드를 수정하지 않는다
- 리팩토링, 포맷 변경, 주석 추가 일절 금지
- VITE_ADMIN_PASSWORD 자체가 번들에 인라인되는 것은 현재 아키텍처의 한계이며, SEC-02(서버사이드 마이그레이션)에서 해결할 사항 — 이 플랜에서는 fallback 제거만 수행
  </action>
  <verify>
    <automated>cd C:/Users/GIGABYTE/Coding/rye-k && grep -n "rye2024" src/constants.jsx; echo "exit:$?"</automated>
  </verify>
  <done>
- src/constants.jsx에서 `"rye2024"` 리터럴이 0건 검색됨
- ADMIN.password 값이 `import.meta.env.VITE_ADMIN_PASSWORD || ""` 형태임
- grep 결과: 매칭 0건
  </done>
</task>

<task type="auto">
  <name>Task 2: 빌드 통과 확인</name>
  <files>none — build verification only</files>
  <action>
`npm run build`를 실행하여 수정 후 빌드가 정상 통과하는지 확인한다.
빌드 성공 시 dist/ 디렉토리가 갱신된다.
빌드 실패 시 Task 1 수정 내용을 재검토한다.
  </action>
  <verify>
    <automated>cd C:/Users/GIGABYTE/Coding/rye-k && npm run build 2>&1 | tail -5</automated>
  </verify>
  <done>
- `npm run build` exit code 0
- dist/ 디렉토리 갱신됨
- 빌드 출력에 ERROR 없음
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 빌드 번들 → 브라우저 클라이언트 | VITE_ 환경변수는 빌드 시 번들에 인라인되어 DevTools에서 노출됨 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-SEC01-01 | Information Disclosure | ADMIN.password hardcoded fallback | mitigate | `"rye2024"` fallback을 `""`으로 교체 — 이 플랜에서 완료 |
| T-SEC01-02 | Information Disclosure | VITE_ADMIN_PASSWORD 번들 인라인 | accept | 현재 SPA 아키텍처의 구조적 한계. SEC-02 서버사이드 마이그레이션에서 해결 예정 |
</threat_model>

<verification>
```bash
# 하드코딩 fallback 제거 확인
grep -n "rye2024" src/constants.jsx
# 기대값: 매칭 없음 (exit code 1 또는 출력 없음)

# 수정 결과 확인
grep -n "VITE_ADMIN_PASSWORD" src/constants.jsx
# 기대값: || "" 형태

# 빌드 통과
npm run build
# 기대값: exit code 0
```
</verification>

<success_criteria>
- src/constants.jsx에 `"rye2024"` 문자열 0건
- ADMIN.password = `import.meta.env.VITE_ADMIN_PASSWORD || ""`
- `npm run build` 통과
</success_criteria>

<output>
완료 후 `.planning/phases/SEC-01-security-quickwin/SEC-01-01-SUMMARY.md` 생성.
포함 내용: 수정된 파일, 변경 내용 1줄 요약, 빌드 결과.
</output>
