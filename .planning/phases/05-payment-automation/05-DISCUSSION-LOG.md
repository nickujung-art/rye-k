# Phase 5: 수납 자동화 (Payment Automation) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-08
**Phase:** 05-payment-automation
**Areas discussed:** 카카오뱅크 입금 자동화 아키텍처, 수강료 일괄 입력 UX, 미매칭 처리, ALM-07 전략, Webhook 보안, Tasker 파싱 방식

---

## Phase 선택 배경

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 4 (알림톡) 진행 | Solapi AlimTalk API 연동 | |
| Phase 5 (수납 자동화) 먼저 | AlimTalk API 아직 미수령 상태에서 수납 자동화 우선 진행 | ✓ |

**User's choice:** 알림톡 API 미수령 → 수납 자동화 먼저
**Notes:** Phase 4 Depends on 순서를 건너뛰고 Phase 5 먼저 진행. ALM-07은 스텁으로 포함.

---

## 입금 자동화 아키텍처

| Option | Description | Selected |
|--------|-------------|----------|
| Toss Payments 가상계좌 Webhook | PAY-04 원안. 학생별 가상계좌 발급, HMAC 검증 | |
| 카카오뱅크 알림 → Tasker Webhook | 업무폰 카카오뱅크 입금 알림을 Tasker가 감지해 Webhook 전송 | ✓ |

**User's choice:** 카카오뱅크 알림 → Tasker 방식 (Nick 직접 제안)
**Notes:** 업무폰에서 카카오뱅크 입금 알림이 카카오톡으로 오면, Tasker가 알림 텍스트를 파싱해 Cloudflare Worker로 전송. Toss Payments 계정 불필요. 훨씬 단순한 인프라.

---

## 업무폰 OS

| Option | Description | Selected |
|--------|-------------|----------|
| 안드로이드 | Tasker + AutoNotification 플러그인 가능 | ✓ |
| iOS | Apple Shortcuts, 제한 있음 | |

---

## 입금 자동화 방식 (세부)

| Option | Description | Selected |
|--------|-------------|----------|
| Tasker 완전 자동 | 알림 감지 → 자동 Webhook → 수납 처리 | ✓ |
| 관리자 UI 수동 입력 | 알림 확인 후 앱에서 이름+금액 수동 입력 | |

---

## 입금자명 기준

| Option | Description | Selected |
|--------|-------------|----------|
| 학생 본인 이름 | 매칭 단순 | ✓ |
| 학부모 이름 | 미성년자의 경우 이름 다를 수 있음 | |
| 섞여 있음 | 미매칭 큐 필수 | |

**Notes:** 학생 본인 이름으로 입금이 대부분. 매칭 실패 시 미매칭 큐로 이동.

---

## 미매칭 입금 UI (PAY-06)

| Option | Description | Selected |
|--------|-------------|----------|
| 수납 화면 '미매칭 입금' 탭 | PaymentsView에 탭 추가, 수동 매칭 | ✓ |
| 카카오톡/앱 푸시 알림 | 매칭 실패 시 Nick에게 알림 | |

---

## Webhook 보안

| Option | Description | Selected |
|--------|-------------|----------|
| API Key (X-RYE-Secret 헤더) | 간단, Tasker 설정 쉬움 | ✓ |
| HMAC-SHA256 서명 | 더 강력, Tasker 설정 복잡 | |

**Notes:** 엔드포인트 URL을 모르면 접근 불가 + API Key로 충분한 보안.

---

## 수강료 일괄 입력 UX (PAY-01)

| Option | Description | Selected |
|--------|-------------|----------|
| 수납 화면 스프레드시트 인라인 편집 | 수강료 열 클릭 → 직접 편집, Tab/Enter 이동 | ✓ |
| BulkFeeModal 활용 (일괄 조정) | 기존 BulkFeeModal에 전체 입력 모드 추가 | |
| CSV 업로드 | 파일로 일괄 입력 | |

---

## ALM-07 처리

| Option | Description | Selected |
|--------|-------------|----------|
| 스텁 포함 | 미납 리스트 + 발송 버튼 UI, 실제 발송은 Phase 4 후 | ✓ |
| 완전 defer | Phase 5에서 제외 | |

---

## 수납 현황 대시보드 위치 (PAY-02)

| Option | Description | Selected |
|--------|-------------|----------|
| Dashboard 홈탭에 추가 | 로그인 후 첫 화면에서 바로 확인 | ✓ |
| PaymentsView만 강화 | 수납 탭에서만 보기 | |

---

## PAY-03 월 초기화 방식

| Option | Description | Selected |
|--------|-------------|----------|
| '새달 수납 쓰기' 버튼 | 새 달 선택 시 명시적으로 수납 뷰 전환, 레코드 없음 = 미납 | ✓ |
| '전체 미납 초기화' 버튼 | 특정 달의 모든 paid=false 리셋. 이중처리 위험 | |

---

## Tasker 파싱 방식 (기술 설명)

Nick이 카카오뱅크 알림 텍스트 파싱이 어떻게 되는지 질문 → 상세 설명 제공:
- AutoNotification 플러그인: `%ANTEXT%` 변수로 알림 텍스트 접근
- 정규식: `(\S+)\s+([\d,]+)원\s+입금` → name, amount 추출
- 다양한 형식 대응 패턴 포함

---

## Claude's Discretion

- fuzzy 매칭 알고리즘 (Levenshtein distance 기반, 한글 3글자 기준 거리 1~2)
- 동명이인 처리 (점수 동점 시 미매칭 큐로)
- 미매칭 입금 Firestore 저장 방식 세부 결정
- Webhook Worker 에러 처리 및 재시도 로직
- 스프레드시트 편집 UX 세부 디자인

## Deferred Ideas

- ALM-07 실제 AlimTalk 발송 (Phase 4 API 심사 후)
- Toss Payments 가상계좌 연동 (카카오뱅크 방식으로 대체)
- 다자녀 학부모 이름 입금 매칭
