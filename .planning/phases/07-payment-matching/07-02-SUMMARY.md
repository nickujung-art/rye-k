---
phase: "07"
plan: "02"
subsystem: payment-matching
tags: [guardianName, fuzzy-match, split-name, amount-match, webhook, kv]
dependency_graph:
  requires: [07-01-PLAN.md]
  provides: [guardian-matching, space-split-matching, amount-match-signal]
  affects: [07-03]
tech_stack:
  added: []
  patterns: [levenshtein-guardian, space-token-split, fee-amount-hint]
key_files:
  created: []
  modified:
    - functions/api/payments/kakaobank-webhook.js
decisions:
  - "guardian_exact/guardian_fuzzy도 auto-match 조건에 포함 — 보호자 이름 입금이 일반적"
  - "split_space는 guardian 매칭도 ok1/ok2에 포함 — 보호자가 2명 함께 입금하는 경우 대응"
  - "amount_match는 pending:unmatched 유지 — 이름 불일치 상태에서 자동 확정은 위험"
metrics:
  duration: "~5m"
  completed: "2026-06-03"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 1
---

# Phase 07 Plan 02: fuzzyMatchStudent 알고리즘 고도화 Summary

**One-liner:** guardianName exact/fuzzy 매칭 + 공백 분리 2토큰 split + monthlyFee amount_match 보조 신호를 webhook에 추가하여 입금 미매칭률 감소

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | fuzzyMatchStudent guardianName 매칭 추가 | 539be42 | functions/api/payments/kakaobank-webhook.js |
| 2 | 공백 포함 이름 split 처리 추가 | 1189f7e | functions/api/payments/kakaobank-webhook.js |
| 3 | amount_match 보조 신호 추가 | e7608b6 | functions/api/payments/kakaobank-webhook.js |

## Changes Summary

### Task 1: guardianName 매칭

- `fuzzyMatchStudent` 함수에 3단계(guardianName exact), 4단계(guardianName Levenshtein ≤ 1) 추가
- confidence 값: `guardian_exact`, `guardian_fuzzy`, `duplicate_guardian`, `duplicate_guardian_fuzzy`
- POST auto-match 조건(`line 144`)에 `guardian_exact`, `guardian_fuzzy` 포함
- 기존 exact/fuzzy_1 로직 변경 없음

### Task 2: 공백 포함 이름 split

- `name.includes(" ")` 조건으로 "홍길동 김개똥" 형태 처리
- 2토큰 각각 `fuzzyMatchStudent` 호출 (guardian 매칭 포함)
- ok1/ok2 판정에 `guardian_exact`, `guardian_fuzzy` 포함
- confidence: `split_space`, `pending:matched` KV 저장
- 기존 `splitNameCandidates` (공백 없는 연결 이름 "홍길동김개똥") 로직 유지

### Task 3: amount_match 보조 신호

- 이름 no_match 최종 단계에서 `amount === monthlyFee` 학생이 정확히 1명이면 `suggestedStudentId` 설정
- `record.confidence = "amount_match"` 로 변경
- `pending:unmatched` 저장 유지 — 자동 확정 안 함 (07-03 UI에서 추천 표시 예정)
- amount 0 또는 일치 2명 이상이면 기존 confidence 그대로

## Deviations from Plan

None — plan executed exactly as written.

## Verification

```
guardian checks: lines 144, 161, 162, 363-375
split_space: lines 156, 176
amount_match: lines 219-229
auto-match guardian condition: line 144 (includes guardian_exact, guardian_fuzzy)
npm run build: PASSED (2.60s)
```

## Known Stubs

None.

## Threat Flags

None — no new network endpoints introduced. Existing POST `/api/payments/kakaobank-webhook` logic extended only.

## Self-Check: PASSED

- functions/api/payments/kakaobank-webhook.js: FOUND
- commit 539be42: FOUND
- commit 1189f7e: FOUND
- commit e7608b6: FOUND
