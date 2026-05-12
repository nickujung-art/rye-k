---
phase: BW-bugfix-waves
plan: "07"
type: execute
wave: 7
depends_on: [BW-06]
files_modified:
  - functions/api/payments/kakaobank-webhook.js
autonomous: true

must_haves:
  truths:
    - "KV pending 레코드의 expirationTtl이 604800(7일)으로 설정된다"
    - "입금자명이 붙어있을 때(no_match) splitNameCandidates로 2+3/3+2/3+3 분리 후 각각 fuzzy매칭한다"
    - "두 파트가 모두 exact/fuzzy_1이면 KV에 2개의 matched 레코드를 저장하고 split:true 응답을 반환한다"
    - "split 레코드의 amount는 각 학생의 monthlyFee를 사용한다"
  artifacts:
    - path: "functions/api/payments/kakaobank-webhook.js"
      provides: "KV TTL 7일, splitNameCandidates 함수, POST handler split 처리"
---

<objective>
카카오뱅크 자동수납 Wave 4 — 엣지케이스 & 복잡 기능 2건.

1. KV TTL 만료: 앱 24시간 미진입 시 입금 기록 소실.
   수정: pending 레코드 TTL 86400(24h) → 604800(7일).

2. 복수 자녀 이름 분리: 부모가 "홍길동김개똥" 처럼 자녀 이름을 붙여 입금 시
   자동으로 2명으로 분리해 각각 자동매칭 처리.
   알고리즘: no_match 판정 시 2+3, 3+2, 3+3 분리 후 각 파트 fuzzy매칭.
   두 파트 모두 매칭되면 KV에 2개 matched 레코드 저장.
</objective>

## Tasks

### T1 — KV TTL 86400 → 604800 (7일)

**파일**: `functions/api/payments/kakaobank-webhook.js`

<read_first>
- functions/api/payments/kakaobank-webhook.js (line 108-120 — KV put 호출 2개)
</read_first>

<action>
line 111과 line 119의 `expirationTtl: 86400`을 `expirationTtl: 604800`으로 교체.

```js
// Before (line 111):
      { expirationTtl: 86400 }  // 24h TTL

// After:
      { expirationTtl: 604800 }  // 7d TTL

// Before (line 119):
      { expirationTtl: 86400 }

// After:
      { expirationTtl: 604800 }
```
</action>

<acceptance_criteria>
- functions/api/payments/kakaobank-webhook.js에 `604800` 값이 2개 존재
- functions/api/payments/kakaobank-webhook.js에 `expirationTtl: 86400`이 pending 레코드 저장 위치에 없음 (rate limit 120 제외)
</acceptance_criteria>

### T2 — splitNameCandidates 헬퍼 함수 추가

**파일**: `functions/api/payments/kakaobank-webhook.js`

<read_first>
- functions/api/payments/kakaobank-webhook.js (line 218-252 — fuzzyMatchStudent, parseRawText)
</read_first>

<action>
`fuzzyMatchStudent` 함수(line 218) 바로 위에 `splitNameCandidates` 함수 추가.

```js
// 추가 (fuzzyMatchStudent 앞에 삽입):
// Split a concatenated name "홍길동김개똥" into candidate pairs.
// Korean names are 2-4 chars; try split positions 2 and 3 (and length-2, length-3).
function splitNameCandidates(name) {
  const pairs = new Set();
  const n = name.length;
  for (let i = 2; i <= Math.min(4, n - 2); i++) {
    pairs.add(JSON.stringify([name.slice(0, i), name.slice(i)]));
  }
  return [...pairs].map(p => JSON.parse(p));
}
```
</action>

<acceptance_criteria>
- functions/api/payments/kakaobank-webhook.js에 `splitNameCandidates` 함수 선언 존재
</acceptance_criteria>

### T3 — POST handler: no_match 시 split 처리

**파일**: `functions/api/payments/kakaobank-webhook.js`

<read_first>
- functions/api/payments/kakaobank-webhook.js (line 86-122 — fuzzyMatch + KV 저장 블록)
</read_first>

<action>
line 114-122의 `else { // Unmatched` 블록을 split 시도를 포함한 코드로 교체.

```js
// Before (line 114-122):
  } else {
    // Unmatched — store for manual review
    await env.RATE_LIMIT_KV.put(
      `pending:unmatched:${id}`,
      JSON.stringify(record),
      { expirationTtl: 604800 }
    );
    return json({ ok: true, matched: false, confidence });
  }

// After:
  } else {
    // Try split-name match for concatenated multi-child names (e.g. "홍길동김개똥")
    if (confidence === "no_match" && name.length >= 4) {
      const candidates = splitNameCandidates(name);
      for (const [n1, n2] of candidates) {
        const m1 = fuzzyMatchStudent(n1, students);
        const m2 = fuzzyMatchStudent(n2, students);
        const ok1 = m1.confidence === "exact" || m1.confidence === "fuzzy_1";
        const ok2 = m2.confidence === "exact" || m2.confidence === "fuzzy_1";
        if (ok1 && ok2) {
          // Both parts matched — create 2 separate matched records
          for (const [nm, mt] of [[n1, m1], [n2, m2]]) {
            const rid = crypto.randomUUID();
            const splitRec = {
              id: rid,
              senderName: nm,
              amount: mt.match.monthlyFee || 0,
              timestamp: ts,
              source: "kakaobank",
              rawText,
              createdAt: now,
              matchedAt: now,
              matchedStudentId: mt.match.id,
              confidence: "split_name",
            };
            await env.RATE_LIMIT_KV.put(
              `pending:matched:${rid}`,
              JSON.stringify(splitRec),
              { expirationTtl: 604800 }
            );
          }
          return json({ ok: true, matched: true, split: true, names: [n1, n2] });
        }
      }
    }

    // Unmatched — store for manual review
    await env.RATE_LIMIT_KV.put(
      `pending:unmatched:${id}`,
      JSON.stringify(record),
      { expirationTtl: 604800 }
    );
    return json({ ok: true, matched: false, confidence });
  }
```
</action>

<acceptance_criteria>
- functions/api/payments/kakaobank-webhook.js에 `splitNameCandidates(name)` 호출 존재
- functions/api/payments/kakaobank-webhook.js에 `split_name` 문자열 존재
- functions/api/payments/kakaobank-webhook.js에 `split: true` JSON 응답 존재
- functions/api/payments/kakaobank-webhook.js에 `n1, n2` 분기 루프 존재
</acceptance_criteria>

## Verification
- `npm run build` 통과
- `grep -n "604800" functions/api/payments/kakaobank-webhook.js` — pending 저장 위치 3개 이상 (matched×1, split×1, unmatched×1)
- `grep -n "splitNameCandidates" functions/api/payments/kakaobank-webhook.js` — 함수 선언 + 호출 각 1개
- `grep -n "split_name" functions/api/payments/kakaobank-webhook.js` — 결과 존재
