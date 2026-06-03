---
phase: "07"
plan: "03"
subsystem: payment-matching
tags: [unmatched-payments, rawText, suggestedStudentId, amount_match, UI]
dependency_graph:
  requires: [07-01-PLAN.md]
  provides: [rawText-display, suggested-student-badge, auto-select-on-mount]
  affects: []
tech_stack:
  added: []
  patterns: [useEffect-auto-select, conditional-render]
key_files:
  created: []
  modified:
    - src/components/payment/PaymentsView.jsx
decisions:
  - "rawText 기존 타임스탬프 줄 스니펫 제거 후 별도 styled div로 교체 (plan 명세 준수)"
  - "useEffect 의존성 [pending.length] -- 불필요한 재실행 방지"
metrics:
  duration: "~8m"
  completed: "2026-06-03"
  tasks_completed: 2
  tasks_total: 2
  files_modified: 1
---

# Phase 07 Plan 03: 미매칭 카드 UI 개선 Summary

**One-liner:** 미매칭 카드에 rawText monospace 전문 표시 + amount_match confidence 시 suggestedStudentId 배지와 자동선택 구현

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | 미매칭 카드 rawText 전문 표시 | 5b13f4e | src/components/payment/PaymentsView.jsx |
| 2 | amount_match 추천 학생 자동 선택 + 배지 | 78bbbb0 | src/components/payment/PaymentsView.jsx |

## Changes Summary

### Task 1: rawText 전문 표시

- `u.rawText` truthy일 때만 별도 styled div 렌더링
- `fontFamily: "monospace"`, `fontSize: 11`, `maxHeight: 48`, `overflow: "hidden"`
- 120자 초과 시 "..." 말줄임 처리
- 기존 타임스탬프 줄의 간략 rawText 스니펫(30자) 제거 후 별도 div로 통합

### Task 2: amount_match 추천 학생 자동 선택

- `useEffect` 추가 -- `pending.length` 변경 시 `suggestedStudentId` 있는 항목을 `selectedStudentId`에 자동 설정
- `confidence === "amount_match"` + `suggestedStudentId` 있을 때 "금액 기반 추천: [이름]" 배지 렌더링
- 학생 `<option>`에 `suggestedStudentId === s.id && confidence === "amount_match"` 조건으로 "(추천)" suffix 추가

## Deviations from Plan

None -- plan executed exactly as written.

## Known Stubs

None -- rawText와 suggestedStudentId는 07-02에서 webhook이 설정하는 런타임 데이터. UI는 있을 때만 렌더링.

## Threat Flags

None -- UI only changes to existing PaymentsView component. No new endpoints, auth paths, or schema changes.

## Self-Check: PASSED

- src/components/payment/PaymentsView.jsx: FOUND
- commit 5b13f4e: FOUND
- commit 78bbbb0: FOUND
- rawText display (line 1400, 1414): FOUND
- suggestedStudentId auto-select useEffect (line 1299-1309): FOUND
- amount_match badge (line 1419-1427): FOUND
- "(추천)" suffix on option (line 1441): FOUND
- window.confirm / window.alert: NOT FOUND (correct)
- npm run build: PASSED (2.54s)
