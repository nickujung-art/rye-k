---
phase: "05"
plan: "02"
subsystem: payments
tags: [inline-edit, fee-editor, unmatched-payments, alimtalk-stub, tab-ui]
dependency_graph:
  requires: [05-01]
  provides: [PAY-01, PAY-03, PAY-06, ALM-07]
  affects: [src/components/payment/PaymentsView.jsx]
tech_stack:
  added: []
  patterns: [inline-spreadsheet-edit, tab-navigation, unmatched-webhook-ui]
key_files:
  created: []
  modified:
    - src/components/payment/PaymentsView.jsx
decisions:
  - "ALM-07 💬 버튼은 모든 미납+비기관 행에 표시, onSend stub은 onLog 호출 후 모달 닫기"
  - "fee-inp-cell은 기관(isInst) 가드로 가상회원에서 비활성화"
  - "인라인 fee 저장: onSaveStudents([{...s, monthlyFee}]) — batchStudentDocs 경로"
metrics:
  duration: "~20min"
  completed_date: "2026-05-09"
  tasks_completed: 1
  files_modified: 1
---

# Phase 05 Plan 02: PaymentsView 인라인 편집 + 미매칭탭 + ALM-07 stub Summary

PaymentsView에 인라인 수강료 편집(스프레드시트 스타일), initFilterUnpaid prop, 미매칭 입금 탭, ALM-07 💬 버튼 stub을 추가했습니다.

## What Was Built

### PAY-01: 인라인 수강료 편집

- `fee-inp-cell` CSS 클래스를 사용하는 인라인 input 셀을 각 pay-row에 추가
- `feeEdits` state로 편집 중 값 관리 (blur 시 저장)
- `onSaveStudents([{...s, monthlyFee: feeEdits[s.id]}])` — batchStudentDocs per-op 경로
- Tab/Enter 키로 다음 학생 input으로 포커스 이동 (`data-fee-input` 속성 활용)
- `e.stopPropagation()` 적용 — 클릭 시 행 모달 열림 방지
- `isInst` 가드 — 기관(가상회원)은 편집 불가
- `savingFeeId` 로 저장 중 opacity 0.5 표시

### PAY-03: initFilterUnpaid prop

- `initFilterUnpaid = false` 기본값 prop 추가
- `useState(initFilterUnpaid)` 로 초기값 적용
- `useEffect` 마운트 시 `onMountFilterConsumed()` 호출 (App.jsx가 상태 리셋)

### PAY-06: 미매칭 입금 탭

- 상단에 `.ftabs` 탭 UI 추가 (수납 관리 / 미매칭 입금)
- `unmatchedPayments.filter(u => !u.matchedAt).length > 0` 시 `.unmatched-badge` 배지 표시
- `UnmatchedPaymentsTab` 서브컴포넌트 (파일 말미에 추가):
  - pending/matched 입금 분리 표시
  - 학생 선택 select + "✓ 수납 처리" 버튼으로 수동 매칭
  - 매칭 완료 시 payment 레코드 생성 + unmatchedPayments 업데이트
  - 입금 내역 없을 시 empty state (Webhook 안내 문구 포함)

### ALM-07: 💬 버튼 stub

- 미납(`!isPaid`) + 비기관(`!isInst`) 행에 💬 버튼 추가
- 클릭 시 `setAlimtalkModal("unpaid_reminder")` 호출
- `AlimtalkModal.onSend` 패치: `type === "unpaid_reminder"` 시 `onLog` stub 호출 후 모달 닫기
- `title="ALM-07: Phase 4 AlimTalk 연동 후 활성화"` 으로 Phase 4 의도 명시

## Acceptance Criteria

| Criteria | Status |
|----------|--------|
| `feeEdits` 사용 ≥ 4곳 | PASS (5) |
| `data-fee-input` 정확히 2곳 | PASS (2) |
| `activeTab` 사용 ≥ 4곳 | PASS (5) |
| `unmatched` 사용 ≥ 3곳 | PASS (23) |
| `unpaid_reminder` 사용 ≥ 2곳 | PASS (3) |
| `saveStudents` 사용 = 0 | PASS (0) |
| `initFilterUnpaid` 사용 ≥ 2곳 | PASS (3) |
| `UnmatchedPaymentsTab` 사용 ≥ 2곳 | PASS (2) |
| `handleMatch` 사용 ≥ 2곳 | PASS (2) |
| `window.alert\|window.confirm` = 0 | PASS (0) |
| `npm run build` 통과 | PASS |

## Commit

- `0ec3211`: feat(05-02): PaymentsView 인라인 수강료 편집 + 미매칭탭 + ALM-07 stub (PAY-01/03/06, ALM-07)

## Deviations from Plan

None — plan executed exactly as written. All critical rules from CLAUDE.md honored:
- `saveStudents([...])` 절대 미사용
- `window.confirm` / `window.alert` 없음
- `e.stopPropagation()` 모든 fee-inp-cell에 적용
- `isInst` 가드 fee editor 및 💬 버튼 모두 적용

## Known Stubs

- ALM-07 💬 버튼: Phase 4에서 실제 AlimTalk API 연동 예정. 현재는 `onLog` stub으로 동작.
- `UnmatchedPaymentsTab`: Webhook(`rye-unmatched-payments` Firestore)이 연결되면 자동으로 pending 목록 표시됨. 현재 `unmatchedPayments = []` 기본값이므로 empty state가 표시됨.

## Self-Check: PASSED

- `src/components/payment/PaymentsView.jsx` 존재 및 수정됨
- commit `0ec3211` 존재 확인
- build exit 0 확인
