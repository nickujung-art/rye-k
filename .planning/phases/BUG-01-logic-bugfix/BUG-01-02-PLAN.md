---
id: BUG-01-02
phase: BUG-01-logic-bugfix
plan: 02
type: execute
wave: 1
depends_on: []
files_modified:
  - src/utils.js
autonomous: true
requirements:
  - BUG-3

must_haves:
  truths:
    - "fmtPhone(null) 또는 fmtPhone(undefined) 호출 시 TypeError 없이 빈 문자열을 반환한다"
    - "printQR 호출 시 팝업이 차단되어 window.open이 null을 반환해도 TypeError 없이 console.warn을 출력하고 리턴한다"
  artifacts:
    - path: "src/utils.js"
      provides: "fmtPhone null guard + printQR popup block guard"
      contains: "if (!v) return"
  key_links:
    - from: "fmtPhone"
      to: "v.replace 호출"
      via: "null guard 얼리 리턴"
      pattern: "if \\(!v\\) return"
    - from: "printQR"
      to: "w.document.write"
      via: "팝업 차단 null 체크"
      pattern: "if \\(!w\\)"
---

<objective>
BUG-3의 두 가지 null 방어 수정을 src/utils.js에 적용한다.

Purpose: null/undefined 입력 또는 팝업 차단 상황에서 TypeError 발생 방지
Output: src/utils.js에 두 개의 최소 범위 null guard 삽입
</objective>

<execution_context>
@C:\Users\GIGABYTE\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\GIGABYTE\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: BUG-3a — fmtPhone null guard 추가</name>
  <files>src/utils.js</files>
  <read_first>src/utils.js 라인 12 (fmtPhone 함수 전체)</read_first>
  <action>
라인 12의 `fmtPhone` 함수는 현재 한 줄로 되어 있다:

```js
export function fmtPhone(v){const d=v.replace(/\D/g,"");...}
```

`v.replace(...)` 호출 전에 null/undefined 방어를 추가한다. 함수 본문 맨 앞에 `if (!v) return "";` 를 삽입한다.

수정 후:
```js
export function fmtPhone(v){if(!v)return"";const d=v.replace(/\D/g,"");...}
```

주의:
- 함수 시그니처나 로직은 변경하지 않는다 (`if (!v) return "";` 삽입만)
- 한 줄 압축 형태 유지
- 이 함수 범위 밖의 코드 수정 금지
  </action>
  <verify>
    <automated>grep -n "fmtPhone" "src/utils.js" | grep "!v"</automated>
  </verify>
  <done>
    - `fmtPhone` 함수 내부에 `if(!v)return""` 또는 `if (!v) return "";` 가 `v.replace` 호출 전에 존재
    - `npm run build` 통과
  </done>
</task>

<task type="auto">
  <name>Task 2: BUG-3b — printQR 팝업 차단 null guard 추가</name>
  <files>src/utils.js</files>
  <read_first>src/utils.js 라인 99-104 (printQR 함수 전체)</read_first>
  <action>
현재 printQR 함수 (라인 99-104):

```js
export function printQR(qrImgUrl, regUrl) {
  const w = window.open("", "_blank");
  const html = "...";
  w.document.write(html);
  w.document.close();
}
```

`const w = window.open(...)` 다음 줄에 팝업 차단 null 체크를 삽입한다.

삽입할 코드:
```js
  if (!w) { console.warn('[printQR] 팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.'); return; }
```

수정 후 함수 구조:
```js
export function printQR(qrImgUrl, regUrl) {
  const w = window.open("", "_blank");
  if (!w) { console.warn('[printQR] 팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.'); return; }
  const html = "...";
  w.document.write(html);
  w.document.close();
}
```

주의:
- `window.alert(...)` 절대 사용 금지 — console.warn만 사용
- `window.confirm(...)` 절대 사용 금지
- 이 함수 범위 밖의 코드 수정 금지
  </action>
  <verify>
    <automated>grep -n "if (!w)" "src/utils.js"</automated>
  </verify>
  <done>
    - `if (!w)` 체크가 `window.open` 호출 직후, `w.document.write` 호출 전에 존재
    - null 시 `console.warn` 출력 후 return
    - `window.alert` 미사용 확인
    - `npm run build` 통과
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| 외부 입력 → fmtPhone | phone 필드가 null/undefined로 들어올 수 있음 (DB 마이그레이션 미완 데이터) |
| window.open → printQR 내부 로직 | 브라우저 팝업 차단 정책으로 null 반환 가능 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-BUG01-04 | Denial of Service | fmtPhone(null) | mitigate | null/undefined 입력 시 빈 문자열 반환으로 TypeError 차단 |
| T-BUG01-05 | Denial of Service | printQR popup block | mitigate | window.open null 반환 시 console.warn + 얼리 리턴 |
</threat_model>

<verification>
1. `grep -n "!v" src/utils.js | grep "fmtPhone\|return"` — fmtPhone null guard 확인
2. `grep -n "if (!w)" src/utils.js` — printQR null guard 확인
3. `grep -n "window.alert\|window.confirm" src/utils.js` — 금지 API 미사용 확인 (0건이어야 함)
4. `npm run build` — 빌드 통과 확인
</verification>

<success_criteria>
- fmtPhone: `if(!v)return""` 가 `v.replace` 호출 전에 존재
- printQR: `if (!w)` 체크 + `console.warn` 메시지 + `return` 이 `w.document.write` 전에 존재
- `window.alert` / `window.confirm` 미사용
- `npm run build` 정상 통과
</success_criteria>

<output>
완료 후 `.planning/phases/BUG-01-logic-bugfix/BUG-01-02-SUMMARY.md` 생성
</output>
