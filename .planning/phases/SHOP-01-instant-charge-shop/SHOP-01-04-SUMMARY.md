---
phase: SHOP-01-instant-charge-shop
plan: "04"
subsystem: payment-ui
tags: [payments, instant-charge, admin-modal, approval, clipboard, react-component]
dependency_graph:
  requires: [SHOP-01-01, SHOP-01-03]
  provides: [즉시청구-탭, 관리자-승인모달, 알림메시지-복사]
  affects: [src/components/payment/PaymentsView.jsx, src/App.jsx]
tech_stack:
  added: []
  patterns: [inline-reject-ui, clipboard-fallback, approve-modal-with-msg-gen, role-guarded-tab]
key_files:
  created: []
  modified:
    - src/components/payment/PaymentsView.jsx
    - src/App.jsx
decisions:
  - "즉시청구 탭은 canManageAll(currentUser.role) 조건으로 관리자/매니저만 접근 가능 (T-SHOP04-01)"
  - "승인 모달에서 parseInt(approveInstantAmount) 적용, 0 이하 승인 차단 (T-SHOP04-02)"
  - "알림 메시지는 승인 후 모달 내에서 즉시 표시 + 복사 가능, approved 카드에서도 재복사 가능"
  - "거절 확인은 인라인 UI (rejectInstantId state) — 별도 모달 없이 카드 내부에서 처리"
  - "approveInstantCopied 상태에 charge.id 또는 'modal' string 저장하여 복사 버튼 상태 구분"
metrics:
  duration: "~10분"
  completed: "2026-05-14"
  tasks_completed: 2
  files_changed: 2
---

# Phase SHOP-01 Plan 04: PaymentsView 즉시청구 탭 + 관리자 승인 모달 Summary

관리자가 즉시청구를 승인하고 알림 메시지를 클립보드로 복사하여 학부모에게 안내할 수 있는 탭 UI + 승인/거절 플로우 구현 완료.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | PaymentsView 즉시청구 탭 + 승인/거절 모달 구현 | 8eb806f | src/components/payment/PaymentsView.jsx |
| 2 | App.jsx에서 PaymentsView에 승인/거절 callbacks 추가 | 656eeb3 | src/App.jsx |

## What Was Built

### src/components/payment/PaymentsView.jsx

**신규 props (2개):**
- `onApproveInstantCharge` — 관리자 승인 콜백
- `onRejectInstantCharge` — 관리자 거절 콜백

**신규 state (9개):**
- `approveInstantModal` — null | chargeObj (승인 모달 대상)
- `approveInstantAmount` — 승인 금액 입력 문자열
- `approveInstantSaving` — 승인 처리 중 버튼 비활성화
- `approveInstantCopied` — null | charge.id | "modal" (복사 버튼 상태 구분)
- `approveInstantMsg` — 승인 후 자동 생성 알림 메시지
- `approveInstantErr` — 인라인 에러 메시지 (0원 승인 차단 등)
- `rejectInstantId` — 인라인 거절 확인 중인 charge id
- `rejectReason` — 거절 사유 입력값
- `rejectSaving` — 거절 처리 중 버튼 비활성화

**탭 버튼:**
- "즉시청구" 탭 추가 (기존 "수납 관리" / "미매칭 입금" / "입금 내역" 다음)
- pendingInstantCount > 0 이면 파란색 뱃지 표시

**즉시청구 탭 콘텐츠:**
- pending + approved 즉시청구를 순서대로 카드 렌더
- 빈 상태: "처리 대기 중인 즉시 청구가 없습니다." 안내
- 카드 상단: 학생명, 카테고리/상품명, 요청 강사명, 금액(또는 "금액 미정"), 재고, 메모
- 상태 뱃지: "승인 대기" (골드) / "승인됨" (초록)
- approved 카드: 승인 금액 표시 + "알림 메시지 복사" 버튼 (클립보드 fallback 포함)
- pending 카드: "승인" 버튼 (클릭 시 승인 모달 오픈) + "거절" 버튼 (클릭 시 인라인 거절 UI)
- 인라인 거절 UI: 사유 입력 input + "거절 확인" / "취소" 버튼

**즉시청구 승인 모달:**
- 학생명, 카테고리/상품명, 메모 요약 표시
- 승인 금액 입력 (amountPending=true면 "* 금액 미정 — 필수 입력" 경고)
- 승인 버튼: parseInt 적용 → 0 이하 차단 → onApproveInstantCharge 호출
- 승인 성공 후 알림 메시지 자동 생성 및 모달 내 표시
- "알림 메시지 복사" 버튼 (승인 후 나타남, clipboard fallback 포함)
- approveInstantErr 인라인 에러 (window.alert 미사용)

**알림 메시지 포맷:**
```
[RYE-K K-Culture Center]
{학생명} 회원님, 추가 청구 안내드립니다.

· {카테고리} — {상품명}: {금액}원

· 카카오뱅크 3333-34-5220544
  (예금주: 예케이케이컬처센터)
입금 부탁드립니다. 감사합니다.
```

### src/App.jsx

**onApproveInstantCharge 콜백:**
- `updateInstantCharge(id, { status: "approved", amount, amountPending: false, approvedAt: Date.now(), approvedBy })`
- addLog, showToast

**onRejectInstantCharge 콜백:**
- `updateInstantCharge(id, { status: "rejected", rejectedAt: Date.now(), rejectedReason: reason })`
- addLog, showToast

## Deviations from Plan

없음 — 플랜 그대로 실행.

## Threat Flags

없음. 플랜 threat_model T-SHOP04-01~03 모두 구현됨:
- T-SHOP04-01: canManageAll(currentUser.role) 조건으로 탭 및 콘텐츠 접근 제어
- T-SHOP04-02: parseInt(approveInstantAmount) + 0 이하 차단
- T-SHOP04-03: 알림 메시지에 계좌번호(공개)와 금액만 포함 (PII 최소화, accept)

## Known Stubs

없음. 즉시청구 approved 카드의 "입금 확인" 버튼은 SHOP-01-05(Wave 3)에서 구현 예정이며, 이 플랜의 목표(승인/거절 + 알림 메시지 복사)는 완전히 구현됨.

## Self-Check: PASSED

- [x] src/components/payment/PaymentsView.jsx — 즉시청구 탭 버튼, 콘텐츠, 승인 모달, 인라인 거절 UI 모두 구현
- [x] src/App.jsx — onApproveInstantCharge 1회, onRejectInstantCharge 1회, updateInstantCharge 3회(import+콜백2)
- [x] 커밋 8eb806f (Task 1), 656eeb3 (Task 2) 존재
- [x] npm run build 오류 없이 통과 (built in 2.60s)
- [x] 모든 acceptance criteria 통과: approveInstantModal 9회, rejectInstantId 2회, clipboard.writeText 3회, RYE-K K-Culture Center 3회
