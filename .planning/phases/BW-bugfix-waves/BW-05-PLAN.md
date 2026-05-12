---
phase: BW-bugfix-waves
plan: "05"
type: execute
wave: 5
depends_on: [BW-04]
files_modified:
  - src/constants.jsx
  - src/components/payment/PaymentsView.jsx
autonomous: true

must_haves:
  truths:
    - ".unmatched-card flex 컨테이너가 align-items: flex-start으로 상단 정렬된다"
    - "confidence === 'duplicate_exact' 또는 'duplicate_fuzzy'인 카드에 '동명이인' 배지가 표시된다"
    - "confidence === 'duplicate_paid'인 카드에 '이중입금' 배지가 표시된다"
  artifacts:
    - path: "src/constants.jsx"
      provides: ".unmatched-card align-items: flex-start"
    - path: "src/components/payment/PaymentsView.jsx"
      provides: "동명이인/이중입금 confidence 배지"
---

<objective>
카카오뱅크 자동수납 Wave 2 — UI 버그 2건 수정.

1. 이름 잘림: UnmatchedPaymentsTab 카드에서 입금자명이 상하로 잘림.
   원인: .unmatched-card의 align-items:center가 좌측 텍스트 블록을 우측 버튼 블록 높이 중앙에 배치하면서 overflow hidden 시 잘림.
   수정: align-items:flex-start으로 교체.

2. 동명이인 라벨 누락: 서버가 confidence:"duplicate_exact"|"duplicate_fuzzy"로 미매칭 처리하나
   UI에 경고 없음. 또한 BW-04에서 추가된 confidence:"duplicate_paid"(이중입금)도 표시 없음.
   수정: 미매칭 카드에 confidence 기반 배지 추가.
</objective>

## Tasks

### T1 — .unmatched-card align-items 수정

**파일**: `src/constants.jsx`

<read_first>
- src/constants.jsx (line 355 — .unmatched-card 정의)
</read_first>

<action>
line 355의 `.unmatched-card` CSS에서 `align-items:center`를 `align-items:flex-start`로 교체.

```js
// Before (line 355):
.unmatched-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:10px}

// After:
.unmatched-card{background:var(--paper);border:1px solid var(--border);border-radius:var(--radius);padding:12px 14px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px}
```
</action>

<acceptance_criteria>
- src/constants.jsx line 355에 `align-items:flex-start` 존재
- src/constants.jsx에 `.unmatched-card`의 `align-items:center` 없음
</acceptance_criteria>

### T2 — confidence 배지 추가 (동명이인 / 이중입금)

**파일**: `src/components/payment/PaymentsView.jsx`

<read_first>
- src/components/payment/PaymentsView.jsx (line 957-999 — pending 카드 렌더)
</read_first>

<action>
pending 카드의 senderName `<div>` (line 960)를 배지 포함 블록으로 교체.

```jsx
// Before (line 960):
<div style={{fontSize:13.5,fontWeight:700}}>{u.senderName || "알 수 없음"}</div>

// After:
<div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
  <span style={{fontSize:13.5,fontWeight:700}}>{u.senderName || "알 수 없음"}</span>
  {(u.confidence === "duplicate_exact" || u.confidence === "duplicate_fuzzy") && (
    <span className="unmatched-badge" style={{background:"var(--orange,#f57c00)"}}>동명이인</span>
  )}
  {u.confidence === "duplicate_paid" && (
    <span className="unmatched-badge">이중입금</span>
  )}
</div>
```
</action>

<acceptance_criteria>
- src/components/payment/PaymentsView.jsx에 `duplicate_exact` 문자열 존재
- src/components/payment/PaymentsView.jsx에 `동명이인` 문자열 존재
- src/components/payment/PaymentsView.jsx에 `duplicate_paid` 문자열 존재
- src/components/payment/PaymentsView.jsx에 `이중입금` 문자열 존재
</acceptance_criteria>

## Verification
- `npm run build` 통과
- `grep -n "align-items:flex-start" src/constants.jsx` — .unmatched-card 라인 포함
- `grep -n "duplicate_exact" src/components/payment/PaymentsView.jsx` — 결과 존재
- `grep -n "동명이인" src/components/payment/PaymentsView.jsx` — 결과 존재
