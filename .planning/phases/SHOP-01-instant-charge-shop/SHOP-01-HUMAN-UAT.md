---
status: partial
phase: SHOP-01-instant-charge-shop
source: [SHOP-01-VERIFICATION.md]
started: 2026-05-14T00:00:00+09:00
updated: 2026-05-14T00:00:00+09:00
---

## Current Test

[awaiting human testing]

## Tests

### 1. 강사 즉시청구 요청 모달
expected: 강사(isTeacher) 역할로 PaymentsView 학생 카드에서 "즉시 청구 요청" 버튼 클릭 → 모달 오픈. 카테고리 칩 선택, 카탈로그 상품 선택(이름·가격 자동 입력), 직접 입력, 금액미정 체크박스(비활성화), 재고여부 토글, 메모 입력 후 요청 전송 → rye-instant-charges에 status:"pending" 문서 생성 확인
result: [pending]

### 2. 관리자 승인 + 알림 메시지 클립보드 복사
expected: 관리자가 즉시청구 탭에서 pending 항목 승인 클릭 → 금액 수정 가능 → 승인 버튼 → status:"approved" 변경 + 알림 메시지 자동 생성 + "알림 메시지 복사" 버튼 클릭 시 클립보드에 지정 포맷 복사 확인. amountPending 항목은 금액 0원 승인 불가 확인.
result: [pending]

### 3. 입금 확인 → 수납 레코드 생성
expected: approved 상태 카드의 "입금 확인" 버튼 클릭 → rye-instant-charges status:"paid" + rye-payments에 type:"instant" 수납 레코드(instantChargeId 포함) 자동 생성 확인. 중복 클릭 차단(confirmingPaymentId) 동작 확인.
result: [pending]

### 4. 대시보드 pending 배지
expected: pending 즉시청구가 1건 이상일 때 관리자/매니저 대시보드에 파란색 "즉시 청구 요청 N건" 배지 표시 → 클릭 시 수납 관리 탭으로 이동 확인.
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
