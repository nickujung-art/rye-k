# Requirements — RYE-K K-Culture Center

> Scoped to current milestone (레슨 관리 완성)  
> Out of scope: SaaS/멀티테넌트, 한복·악기 판매, 공연·이벤트, TypeScript 마이그레이션  
> Version: 1.0 | Created: 2026-05-05

---

## REQ Categories

| Prefix | Domain |
|--------|--------|
| SEC | Security & Auth |
| POR | Member Portal |
| AI | AI Features |
| ALM | AlimTalk Notifications |
| PAY | Payment Automation |
| ANL | Analytics & Dashboard |

---

## SEC — Security & Auth

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| SEC-01 | 프로덕션 빌드에서 모든 console.log UID/PII 출력 제거 | P0 | 1 |
| SEC-02 | `resetSeed` 및 샘플 데이터 초기화 버튼을 개발 환경에서만 노출 | P0 | 1 |
| SEC-03 | `saveStudents([...])` 잔여 참조 코드베이스 전체 감사 및 제거 | P0 | 1 |
| SEC-04 | Cloudflare KV namespace 바인딩 추가 → rate limiter 활성화 | P0 | 1 |
| SEC-05 | Firebase Custom Claims Worker 배포 (역할별 claim 설정) | P0 | 1 |
| SEC-06 | Firestore 보안 규칙 배포 — 익명 전체 읽기 차단, 역할별 read/write 제한 | P0 | 1 |
| SEC-07 | Firebase Auth ↔ localStorage 세션 동기화 수리 — 30일 재인증 흐름 | P1 | 1 |
| SEC-08 | AI API 호출 시 studentName을 anonymize.js 통과 강제 | P1 | 3 |

---

## POR — Member Portal

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| POR-01 | 포털 세션 유지 — 브라우저 닫기 후 재방문 시 자동 로그인 (sessionStorage hybrid) | P0 | 2 |
| POR-02 | 학생 포털: 시간표(요일·시간) 뷰 — lessons[].schedule 기반 모바일 최적화 | P0 | 2 |
| POR-03 | 학생 포털: 강사 작성 레슨노트 → 학부모 열람 연결 | P0 | 2 |
| POR-04 | 학생 포털: 연습 가이드 표시 — practice-guide.js Worker 연결 | P1 | 2 |
| POR-05 | 학생 포털: 수납 현황 표시 (이번 달 완납/미납) — monthlyFee 데이터 입력 후 | P1 | 2 |
| POR-06 | 학부모 포털: 자녀 출석·레슨노트·수납 현황 통합 뷰 | P1 | 2 |
| POR-07 | 셀프 수강 신청 — 포털에서 학생/학부모가 신청 → 관리자 승인 흐름 | P2 | 2 |
| POR-08 | 자녀 전환 UX 개선 — 다자녀 세션 관리 | P2 | 2 |

---

## AI — AI Features

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| AI-01 | callAnthropic / callGemini 함수명 통일 및 anthropic.js 내부 정리 | P1 | 3 |
| AI-02 | 월별 리포트 강사→학부모 발송 UI — 리포트 생성 후 발송 버튼 | P0 | 3 |
| AI-03 | 이탈 위험도 → 케어 메시지 초안 생성 → AlimTalk 발송 연동 | P1 | 3 |
| AI-04 | 자연어 쿼리 응답 UI 고도화 — 텍스트 + 카드 형식 결과 | P2 | 3 |
| AI-05 | AI 어시스턴트 응답 품질 개선 — 프롬프트 튜닝 및 에러 핸들링 | P2 | 3 |

---

## ALM — AlimTalk Notifications

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| ALM-01 | Solapi REST API Cloudflare Worker 래퍼 구현 (`functions/api/notifications/alimtalk.js`) | P0 | 4 |
| ALM-02 | AlimtalkModal → Solapi API 실제 연결 | P0 | 4 |
| ALM-03 | 결석 시 학부모 자동 알림톡 — 출결 기록 저장 시 트리거 | P0 | 4 |
| ALM-04 | 월초 수납 안내 알림톡 — 관리자 일괄 발송 | P1 | 4 |
| ALM-05 | 일정 변경 알림톡 — schedule-override 저장 시 관련 학생 일괄 발송 | P1 | 4 |
| ALM-06 | 알림톡 발송 상태 추적 (delivered / failed) 및 재발송 UI | P2 | 4 |
| ALM-07 | 미납 리마인더 알림톡 자동 발송 — 수납 자동화와 연동 | P1 | 5 |

---

## PAY — Payment Automation

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| PAY-01 | 학생 수강료(monthlyFee) 입력 UI 개선 — 학생 편집 화면에서 편리하게 입력 | P0 | 5 |
| PAY-02 | 수납 현황 대시보드 — 미납 학생 목록, 월별 수납률 | P0 | 5 |
| PAY-03 | 월별 수납 상태 일괄 초기화 / 수동 확인 처리 UI | P1 | 5 |
| PAY-04 | Toss Payments 가상계좌 Webhook Worker — HMAC-SHA256 검증 | P1 | 5 |
| PAY-05 | 입금 자동 매칭 — 학생 이름 + 금액 기반 fuzzy 매칭 | P1 | 5 |
| PAY-06 | 미매칭 입금 리뷰 화면 — 수동 매칭 UI | P1 | 5 |

---

## ANL — Analytics & Dashboard

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| ANL-01 | 관리자용 매출 추이 차트 (월별, 악기별 분포) | P1 | 6 |
| ANL-02 | 강사용 담당 학생 출석률·진도 요약 뷰 | P1 | 6 |
| ANL-03 | 학부모용 자녀 월별 수업 리포트 (출석률 + 레슨노트 요약) | P2 | 6 |
| ANL-04 | Firestore 데이터 아카이빙 전략 구현 (1MB 한도 대응) | P2 | 6 |

---

## Priority Legend

| Level | Meaning |
|-------|---------|
| P0 | Must-have — milestone 블로킹. 없으면 출시 불가 |
| P1 | Should-have — 핵심 가치 전달에 중요 |
| P2 | Nice-to-have — 가능하면 포함, 빠져도 무방 |

---

## Out of Scope (이 마일스톤)

- PG 결제 연동 (토스/카카오페이 직접 결제)
- SaaS / 멀티테넌트 아키텍처
- 한복·악기 판매 마켓플레이스
- 공연·이벤트 티켓 시스템
- TypeScript 마이그레이션
- FCM 푸시 알림
- Firestore 서브컬렉션 마이그레이션

---

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SEC-01 | Phase 1 | Pending |
| SEC-02 | Phase 1 | Pending |
| SEC-03 | Phase 1 | Pending |
| SEC-04 | Phase 1 | Pending |
| SEC-05 | Phase 1 | Pending |
| SEC-06 | Phase 1 | Pending |
| SEC-07 | Phase 1 | Pending |
| POR-01 | Phase 2 | Pending |
| POR-02 | Phase 2 | Pending |
| POR-03 | Phase 2 | Pending |
| POR-04 | Phase 2 | Pending |
| POR-05 | Phase 2 | Pending |
| POR-06 | Phase 2 | Pending |
| POR-07 | Phase 2 | Pending |
| POR-08 | Phase 2 | Pending |
| AI-01 | Phase 3 | Pending |
| AI-02 | Phase 3 | Pending |
| AI-03 | Phase 3 | Pending |
| AI-04 | Phase 3 | Pending |
| AI-05 | Phase 3 | Pending |
| SEC-08 | Phase 3 | Pending |
| ALM-01 | Phase 4 | Pending |
| ALM-02 | Phase 4 | Pending |
| ALM-03 | Phase 4 | Pending |
| ALM-04 | Phase 4 | Pending |
| ALM-05 | Phase 4 | Pending |
| ALM-06 | Phase 4 | Pending |
| PAY-01 | Phase 5 | Pending |
| PAY-02 | Phase 5 | Pending |
| PAY-03 | Phase 5 | Pending |
| PAY-04 | Phase 5 | Pending |
| PAY-05 | Phase 5 | Pending |
| PAY-06 | Phase 5 | Pending |
| ALM-07 | Phase 5 | Pending |
| ANL-01 | Phase 6 | Pending |
| ANL-02 | Phase 6 | Pending |
| ANL-03 | Phase 6 | Pending |
| ANL-04 | Phase 6 | Pending |
