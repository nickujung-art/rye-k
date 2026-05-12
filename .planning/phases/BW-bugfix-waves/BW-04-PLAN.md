---
phase: BW-bugfix-waves
plan: "04"
type: execute
wave: 4
depends_on: []
files_modified:
  - src/App.jsx
autonomous: true

must_haves:
  truths:
    - "drainPending에서 month 계산이 UTC+9 KST 기준으로 이루어진다"
    - "자동매칭 처리 시 기존 payment record의 amount(청구금액)가 보존된다"
    - "paidAmount에 실 입금액이 저장되며, paidAmount < amount인 경우 경고 토스트가 표시된다"
    - "기존 paid:true 레코드가 있으면 새 자동매칭을 건너뛰고 unmatchedPayments에 추가한다"
  artifacts:
    - path: "src/App.jsx"
      provides: "drainPending KST month, 청구금액 보존, 이중입금 방지, 금액 부족 경고"
---

<objective>
카카오뱅크 자동수납 Wave 1 — 데이터 안전 버그 3건 수정.

1. KST month 오류: UTC 기준으로 month 계산 → KST 자정 이후 입금이 전달로 기록됨.
2. 금액 부족 덮어쓰기: matched 자동처리 시 amount(청구금액)를 입금액으로 덮어씀.
   수정: 기존 amount 유지, paidAmount에만 실 입금액 저장, 부족 시 경고 토스트.
3. 이중 입금 덮어쓰기: 같은 달 paid:true인 기존 레코드가 있어도 자동처리가 덮어씀.
   수정: paid:true면 자동처리 건너뛰고 unmatchedPayments로 이관.
</objective>

## Tasks

### T1 — drainPending: senderName newPayments에 포함

**파일**: `src/App.jsx`

<read_first>
- src/App.jsx (line 533-545 — newPayments 매핑)
</read_first>

<action>
line 533-545 `const newPayments = matched.map(record => ({` 블록에 `senderName` 필드 추가.

```js
// Before (line 533-545):
const newPayments = matched.map(record => ({
  id: record.id,
  studentId: record.matchedStudentId,
  month,
  paid: true,
  amount: record.amount,
  paidAmount: record.amount,
  paidDate: new Date(record.matchedAt || record.createdAt).toISOString().slice(0, 10),
  method: "transfer",
  note: `카카오뱅크 자동매칭 (${record.senderName})`,
  source: "kakaobank",
  createdAt: record.createdAt,
}));

// After:
const newPayments = matched.map(record => ({
  id: record.id,
  studentId: record.matchedStudentId,
  month,
  paid: true,
  amount: record.amount,
  paidAmount: record.amount,
  senderName: record.senderName,
  paidDate: new Date(record.matchedAt || record.createdAt).toISOString().slice(0, 10),
  method: "transfer",
  note: `카카오뱅크 자동매칭 (${record.senderName})`,
  source: "kakaobank",
  createdAt: record.createdAt,
}));
```
</action>

<acceptance_criteria>
- src/App.jsx newPayments 매핑에 `senderName: record.senderName` 라인 존재
</acceptance_criteria>

### T2 — drainPending: KST month 계산

**파일**: `src/App.jsx`

<read_first>
- src/App.jsx (line 532 — month 계산)
</read_first>

<action>
line 532의 `const month = new Date().toISOString().slice(0, 7);`를 KST 기준으로 교체.

```js
// Before:
const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"

// After:
const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000); // UTC+9 KST
const month = kstNow.toISOString().slice(0, 7); // "YYYY-MM"
```
</action>

<acceptance_criteria>
- src/App.jsx에 `9 * 60 * 60 * 1000` 문자열 존재 (KST 오프셋)
- src/App.jsx drainPending 내 `new Date().toISOString().slice(0, 7)` 단독 표현식이 없음
</acceptance_criteria>

### T3 — drainPending: 청구금액 보존 + 이중입금 방지

**파일**: `src/App.jsx`

<read_first>
- src/App.jsx (line 546-558 — merge 루프)
</read_first>

<action>
line 546-558의 merge 루프를 아래 코드로 교체.

```js
// Before (line 546-558):
// Merge with existing payments — matched records may duplicate existing ones,
// so deduplicate by studentId+month (keep newest).
const merged = [...payments];
for (const np of newPayments) {
  const idx = merged.findIndex(p => p.studentId === np.studentId && p.month === np.month);
  if (idx >= 0) {
    merged[idx] = { ...merged[idx], ...np };
  } else {
    merged.push(np);
  }
}

// After:
const merged = [...payments];
const autoUnmatched = []; // 이중입금 → unmatched 탭으로
for (const np of newPayments) {
  const idx = merged.findIndex(p => p.studentId === np.studentId && p.month === np.month);
  if (idx >= 0) {
    if (merged[idx].paid) {
      // 이미 납부 완료 → unmatched 탭으로 이관
      autoUnmatched.push({
        id: np.id,
        senderName: np.senderName || "알 수 없음",
        amount: np.amount,
        timestamp: np.createdAt,
        source: "kakaobank",
        rawText: np.note || "",
        createdAt: np.createdAt,
        confidence: "duplicate_paid",
        matchedAt: null,
        matchedStudentId: null,
      });
    } else {
      // 청구금액 보존: 기존 amount 유지, paidAmount에 실 입금액
      const expectedAmount = merged[idx].amount || np.amount;
      merged[idx] = {
        ...merged[idx],
        ...np,
        amount: expectedAmount,
        paidAmount: np.paidAmount,
      };
    }
  } else {
    merged.push(np);
  }
}
```
</action>

<acceptance_criteria>
- src/App.jsx에 `merged[idx].paid` 분기 존재
- src/App.jsx에 `autoUnmatched` 배열 선언 존재
- src/App.jsx에 `amount: expectedAmount` 할당 존재
- src/App.jsx에 `confidence: "duplicate_paid"` 문자열 존재
</acceptance_criteria>

### T4 — drainPending: 금액 부족 경고 토스트 + autoUnmatched 처리

**파일**: `src/App.jsx`

<read_first>
- src/App.jsx (line 557-565 — savePayments 이후)
</read_first>

<action>
line 557-565를 아래 코드로 교체. (기존 `await savePayments(merged)` 다음 ~ `if (unmatched.length > 0)` 블록 전체를 교체)

```js
// Before (line 557-565):
await savePayments(merged);
showToast(`카카오뱅크 입금 ${matched.length}건 자동 처리되었습니다.`);

// After:
await savePayments(merged);

// 금액 부족 경고 토스트
const shortfalls = merged.filter(p =>
  p.source === "kakaobank" && p.paidAmount > 0 && p.paidAmount < p.amount
);
if (shortfalls.length > 0) {
  const names = shortfalls.map(p => {
    const st = students.find(s => s.id === p.studentId);
    return `${st?.name || "알 수 없음"} (${(p.paidAmount||0).toLocaleString()}원 / ${(p.amount||0).toLocaleString()}원)`;
  }).join(", ");
  showToast(`⚠ 금액 부족 입금 — ${names}`, true);
} else {
  showToast(`카카오뱅크 입금 ${matched.length}건 자동 처리되었습니다.`);
}
```

unmatched 저장 부분 (기존 `if (unmatched.length > 0)` 블록)도 autoUnmatched 포함하도록 교체:
```js
// Before:
if (unmatched.length > 0) {
  const merged = [...unmatchedPayments, ...unmatched];
  await saveUnmatchedPayments(merged);
}

// After:
const allNew = [...autoUnmatched, ...unmatched];
if (allNew.length > 0) {
  const mergedUnmatched = [...unmatchedPayments, ...allNew];
  await saveUnmatchedPayments(mergedUnmatched);
}
```
</action>

<acceptance_criteria>
- src/App.jsx에 `금액 부족 입금` 문자열 존재 (경고 토스트)
- src/App.jsx에 `shortfalls` 변수 존재
- src/App.jsx에 `autoUnmatched, ...unmatched` 또는 `allNew` 패턴 존재
</acceptance_criteria>

## Verification
- `npm run build` 통과
- `grep -n "9 \* 60 \* 60 \* 1000" src/App.jsx` 결과 존재 (KST)
- `grep -n "merged\[idx\]\.paid" src/App.jsx` 결과 존재
- `grep -n "금액 부족" src/App.jsx` 결과 존재
