---
id: BUG-01-01
phase: BUG-01-logic-bugfix
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/App.jsx
autonomous: true
requirements:
  - BUG-1
  - BUG-2

must_haves:
  truths:
    - "onConfirmInstantPayment 호출 시 동일 id(_pay)가 payments에 이미 있으면 savePayments를 호출하지 않는다"
    - "drainPending의 month 값이 record.matchedAt 기준으로 계산된다"
    - "record.matchedAt이 없을 때 kstNow로 폴백한다"
  artifacts:
    - path: "src/App.jsx"
      provides: "BUG-1 중복 삽입 방어 + BUG-2 month 기준 수정"
      contains: "charge.id + \"_pay\""
  key_links:
    - from: "onConfirmInstantPayment"
      to: "savePayments"
      via: "중복 id 체크 얼리 리턴"
      pattern: "already.*_pay|_pay.*already|payments\\.some.*_pay"
    - from: "drainPending"
      to: "month 변수"
      via: "record.matchedAt 기준"
      pattern: "record\\.matchedAt"
---

<objective>
BUG-1과 BUG-2를 src/App.jsx에서 수정한다.

Purpose: 즉시청구 이중 결제로 인한 데이터 불일치 방지, 월말 KV 버퍼 입금의 잘못된 월 배정 방지
Output: src/App.jsx에 두 개의 최소 범위 수정
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
  <name>Task 1: BUG-1 — onConfirmInstantPayment 이중 실행 방어</name>
  <files>src/App.jsx</files>
  <read_first>src/App.jsx 라인 1129-1159 (onConfirmInstantPayment 함수 전체)</read_first>
  <action>
라인 1129의 `onConfirmInstantPayment={async (charge, student) => {` 바로 다음 줄 (현재 라인 1130의 `// 1. rye-instant-charges ...` 주석 앞)에 중복 체크를 삽입한다.

삽입할 코드:
```js
                // 중복 실행 방어: 동일 paymentId가 이미 존재하면 얼리 리턴
                if (payments.some(p => p.id === charge.id + "_pay")) return;
```

변경 후 해당 블록은 다음과 같은 순서가 된다:
1. `if (payments.some(p => p.id === charge.id + "_pay")) return;`  ← 신규 삽입
2. `await updateInstantCharge(charge.id, { status: "paid", ... })`
3. `const payRecord = { ... }`
4. `const updatedPayments = [...payments, payRecord];`
5. `await savePayments(updatedPayments);`

주의:
- `saveStudents([...])` 절대 호출 금지
- `window.confirm` / `window.alert` 절대 사용 금지
- 이 함수 범위 밖의 코드 수정 금지
  </action>
  <verify>
    <automated>grep -n "payments.some" "src/App.jsx" | grep "_pay"</automated>
  </verify>
  <done>
    - `payments.some(p => p.id === charge.id + "_pay")` 가 onConfirmInstantPayment 함수 첫 실행 지점에 존재
    - `updateInstantCharge` 호출 이전에 위치
    - `npm run build` 통과
  </done>
</task>

<task type="auto">
  <name>Task 2: BUG-2 — drainPending month를 record.matchedAt 기준으로 수정</name>
  <files>src/App.jsx</files>
  <read_first>src/App.jsx 라인 591-607 (kstNow / month 선언 + newPayments 생성 블록)</read_first>
  <action>
라인 592-593의 `month` 선언 코드를 아래와 같이 교체한다.

현재 코드 (라인 592-593):
```js
          const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC+9 KST
          const month = kstNow.toISOString().slice(0, 7); // "YYYY-MM"
```

교체할 코드:
```js
          const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC+9 KST
```

그리고 라인 594부터 시작하는 `newPayments = matched.map(record => ({` 블록 내부에서
`month,` 라인을 삭제하고 대신 각 record에 개별 month를 계산하도록 수정한다.

구체적으로 `matched.map(record => ({` 내부의:
```js
            month,
```
를 다음으로 교체한다:
```js
            month: record.matchedAt
              ? record.matchedAt.slice(0, 7)
              : kstNow.toISOString().slice(0, 7),
```

주의:
- `month` 변수 자체(const month = ...)는 완전히 제거한다 (더 이상 사용하지 않음)
- 변경 범위: 라인 592-607 이내로 제한
- 이 함수 범위 밖의 코드 수정 금지
  </action>
  <verify>
    <automated>grep -n "record\.matchedAt" "src/App.jsx" | head -5</automated>
  </verify>
  <done>
    - `record.matchedAt` 기반 month 계산이 newPayments 맵 내부에 존재
    - 이전의 `const month = kstNow.toISOString().slice(0, 7)` 단독 선언이 제거됨
    - fallback(`kstNow.toISOString().slice(0, 7)`)이 삼항 연산자로 존재
    - `npm run build` 통과
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| payments 배열 → savePayments | React state 기반 — 새로고침/동시 탭에서 stale 가능 |
| KV 버퍼 → Firestore | 드레인 타이밍에 따라 record.matchedAt과 실행 월이 다를 수 있음 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-BUG01-01 | Tampering | onConfirmInstantPayment | mitigate | 동일 paymentId 중복 삽입 차단 (얼리 리턴) |
| T-BUG01-02 | Information Disclosure | drainPending month 계산 | mitigate | record.matchedAt 기준으로 수납 월 정확도 보장 |
| T-BUG01-03 | Denial of Service | record.matchedAt 없는 레코드 | accept | fallback으로 kstNow 사용 — 기존 동작과 동일 |
</threat_model>

<verification>
1. `grep -n "payments.some" src/App.jsx | grep "_pay"` — 중복 체크 존재 확인
2. `grep -n "record\.matchedAt" src/App.jsx` — month 기준 변경 확인
3. `grep -n "const month = kstNow" src/App.jsx` — 이전 단독 선언 제거 확인 (0건이어야 함)
4. `npm run build` — 빌드 통과 확인
</verification>

<success_criteria>
- BUG-1: `payments.some(p => p.id === charge.id + "_pay")` 가 updateInstantCharge 호출 전에 존재
- BUG-2: drainPending 내 newPayments.map에서 `record.matchedAt ? record.matchedAt.slice(0,7) : kstNow.toISOString().slice(0,7)` 패턴 존재
- `npm run build` 정상 통과
</success_criteria>

<output>
완료 후 `.planning/phases/BUG-01-logic-bugfix/BUG-01-01-SUMMARY.md` 생성
</output>
