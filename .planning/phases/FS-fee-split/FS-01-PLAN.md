---
phase: FS-fee-split
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/utils.js
autonomous: true
requirements:
  - FS-FEE-01
  - FS-FEE-02

must_haves:
  truths:
    - "calcTotalFee(student, feePresets) 함수가 lessons[].fee 합산 + 대여료를 반환한다"
    - "lesson.fee 없는 학생에 대해 feePresets fallback → monthlyFee 균등분배 순으로 처리된다"
    - "기존 코드의 s.monthlyFee 참조가 calcTotalFee(s, feePresets)로 점진 교체될 수 있다"
  artifacts:
    - path: "src/utils.js"
      provides: "calcTotalFee, calcLessonFeeWithFallback 헬퍼 export"
      contains: "export function calcTotalFee"
  key_links:
    - from: "src/utils.js"
      to: "src/components/payment/PaymentsView.jsx"
      via: "autoFee() 대체용 calcTotalFee import"
      pattern: "calcTotalFee"
    - from: "src/utils.js"
      to: "src/components/dashboard/Dashboard.jsx"
      via: "미납 금액 계산 교체"
      pattern: "calcTotalFee"
---

<objective>
utils.js에 레슨별 수강료 계산 헬퍼 함수를 추가한다.

Purpose: 이후 모든 컴포넌트가 s.monthlyFee 직접 참조 대신 calcTotalFee(s, feePresets)를 통해 일관되게 금액을 계산하게 한다. feePresets 없이도 기존 monthlyFee로 폴백되어 하위 호환성을 보장한다.

Output: src/utils.js에 calcLessonFeeWithFallback, calcTotalFee 함수 추가
</objective>

<execution_context>
@C:\Users\GIGABYTE\.claude\get-shit-done\workflows\execute-plan.md
@C:\Users\GIGABYTE\.claude\get-shit-done\templates\summary.md
</execution_context>

<context>
@C:\Users\GIGABYTE\Coding\rye-k\src\utils.js
@C:\Users\GIGABYTE\Coding\rye-k\CLAUDE.md

<interfaces>
<!-- 현재 utils.js export 중 이 플랜과 관련된 것들 -->

// 현재 fmtMoney — 참고용
export function fmtMoney(n) { return n!=null?n.toLocaleString("ko-KR")+"원":"-"; }

// 현재 allLessonInsts — lesson 순회 패턴
export function allLessonInsts(s) { return (s.lessons||[]).map(l=>l.instrument); }

// 학생 데이터 구조 (현재)
// { monthlyFee: 150000, lessons: [{ instrument: "해금", teacherId: "t1", schedule: [...] }], instrumentRental: true, rentalFee: 10000 }

// feePresets 구조 (rye-fee-presets에서 로드)
// { "해금": 100000, "타악": 50000, "rental:해금": 5000 }

// 목표 lesson 구조 (이 플랜 이후)
// { instrument: "해금", teacherId: "t1", fee: 100000, schedule: [...] }
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: utils.js에 calcLessonFeeWithFallback, calcTotalFee 함수 추가</name>
  <read_first>
    - src/utils.js (전체 — 이미 context에 있음, 특히 allLessonInsts 패턴 참고)
  </read_first>
  <files>src/utils.js</files>
  <action>
파일 끝(formatLessonNoteSummary, sendAligoMessage, computeMonthlyAttStats 등 이후)에 다음 두 함수를 추가한다.

**calcLessonFeeWithFallback(lesson, feePresets, fallbackPerLesson)**
- lesson 객체 하나에 대해 fee를 결정한다
- 우선순위: lesson.fee(양수) > feePresets[lesson.instrument](양수) > fallbackPerLesson
- 반환: number (0 이상)

```js
export function calcLessonFeeWithFallback(lesson, feePresets, fallbackPerLesson = 0) {
  if (lesson.fee != null && lesson.fee > 0) return lesson.fee;
  const preset = feePresets ? (feePresets[lesson.instrument] || 0) : 0;
  if (preset > 0) return preset;
  return fallbackPerLesson;
}
```

**calcTotalFee(student, feePresets)**
- student.lessons[] 순회하여 각 레슨 fee를 calcLessonFeeWithFallback으로 계산
- fallbackPerLesson은 student.monthlyFee를 lessons 수로 균등 분배 (lesson.fee 없고 preset도 없을 때)
- 대여료: student.instrumentRental === true 이면 student.rentalFee(|| 0) 추가
- lessons가 비어있으면 student.monthlyFee || 0 반환 (완전한 구 데이터 호환)
- 반환: number

```js
export function calcTotalFee(student, feePresets) {
  const lessons = student.lessons || [];
  const rental = student.instrumentRental ? (student.rentalFee || 0) : 0;
  if (lessons.length === 0) return (student.monthlyFee || 0) + rental;
  const legacyPerLesson = Math.round((student.monthlyFee || 0) / lessons.length);
  const lessonSum = lessons.reduce(
    (sum, l) => sum + calcLessonFeeWithFallback(l, feePresets, legacyPerLesson),
    0
  );
  return lessonSum + rental;
}
```

주의: 기관 가상회원(isInstitution=true)은 monthlyFee를 그대로 쓰므로 calcTotalFee도 정상 작동한다 (lessons[0].fee 없으면 monthlyFee로 폴백).
  </action>
  <verify>
    <automated>cd /c/Users/GIGABYTE/Coding/rye-k && grep -n "calcLessonFeeWithFallback\|calcTotalFee" src/utils.js | grep "^[0-9]*:export function"</automated>
  </verify>
  <acceptance_criteria>
    - src/utils.js에 `export function calcLessonFeeWithFallback` 존재
    - src/utils.js에 `export function calcTotalFee` 존재
    - calcTotalFee는 student.lessons가 없거나 빈 배열이면 student.monthlyFee + rental 반환
    - calcTotalFee는 lesson.fee가 있으면 해당 값 우선 사용
    - calcTotalFee는 lesson.fee 없으면 feePresets[instrument] 사용
    - calcTotalFee는 feePresets도 없으면 monthlyFee를 lesson수로 균등 분배
    - npm run build 통과
  </acceptance_criteria>
  <done>utils.js에 두 함수가 export되고 npm run build 통과</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| utils.js pure function | 외부 입력 없음, 순수 계산 함수 — 신뢰 경계 없음 |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-FS-01-01 | Tampering | calcTotalFee | accept | 순수 함수, 외부 데이터 미수신. Firestore 데이터 검증은 App.jsx 레이어에서 처리 |
</threat_model>

<verification>
npm run build 통과

다음 조건 수동 확인:
- `grep -c "export function calcTotalFee" src/utils.js` = 1
- `grep -c "export function calcLessonFeeWithFallback" src/utils.js` = 1
</verification>

<success_criteria>
- calcTotalFee, calcLessonFeeWithFallback 함수가 utils.js에 export됨
- 기존 함수 시그니처 미변경 (하위 호환)
- npm run build 통과
</success_criteria>

<output>
완료 후 `.planning/phases/FS-fee-split/FS-01-SUMMARY.md` 생성
</output>
