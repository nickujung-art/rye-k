# Requirements — RYE-K K-Culture Center

> Scoped to current milestone (레슨 관리 완성) + Phase 10 회계 앱 신규  
> Out of scope: SaaS/멀티테넌트(Phase 10 이후), 한복·악기 판매, 공연·이벤트, TypeScript 마이그레이션  
> Version: 1.1 | Created: 2026-05-05 | Updated: 2026-06-16

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
| GRP | Group Lesson Enhancement |
| SHOP | Instant Charge & Shop Catalog |
| ACC | Accounting App (Phase 10) |
| DIS | Discount System (Phase 11) |

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
| PAY-07 | 학생 폼에 보호자 이름(guardianName) 입력 필드 추가 | P0 | 7 |
| PAY-08 | students_cache에 guardianName + monthlyFee 포함 — sync-students.js 확장 + KV TTL 72h | P0 | 7 |
| PAY-09 | App 로드 시 students_cache 자동 갱신 — payments 탭 외 앱 마운트 시에도 sync 실행 | P0 | 7 |
| PAY-10 | webhook 매칭 알고리즘 고도화 — guardianName 매칭 + 공백 구분 이름 split + monthlyFee 보조 매칭 | P1 | 7 |
| PAY-11 | 미매칭 카드 UI 개선 — rawText 표시 + 금액 기반 추천 학생 표시 | P1 | 7 |

---

## ANL — Analytics & Dashboard

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| ANL-01 | 관리자용 매출 추이 차트 (월별, 악기별 분포) | P1 | 6 |
| ANL-02 | 강사용 담당 학생 출석률·진도 요약 뷰 | P1 | 6 |
| ANL-03 | 학부모용 자녀 월별 수업 리포트 (출석률 + 레슨노트 요약) | P2 | 6 |
| ANL-04 | Firestore 데이터 아카이빙 전략 구현 (1MB 한도 대응) | P2 | 6 |

---

## GRP — Group Lesson Enhancement

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| GRP-01 | `rye-lesson-slots` Firestore 컬렉션 신설 — type/name/capacity/schedule/status 필드, App.jsx 리스너 추가 | P0 | 8 |
| GRP-02 | 기존 학생 일괄 마이그레이션 — AdminTools 버튼으로 개인+그룹 슬롯 자동 생성 + students.lessons[].slotId 연결 (idempotent) | P0 | 8 |
| GRP-03 | ScheduleView 그룹 이름 표시 + 인라인 편집 — slotId 기반 슬롯 이름으로 "그룹 레슨" 하드코딩 대체 | P0 | 8 |
| GRP-04 | Attendance 그룹 헤더 슬롯 이름 연동 — 그룹 감지 시 슬롯 이름 표시 | P1 | 8 |
| GRP-05 | TimetableView 신규 컴포넌트 — 09:00~21:00 × 30분 격자, 슬롯 카드, 공강 표시 | P0 | 8 |
| GRP-06 | 강사 본인 시간표 뷰 — 자신의 슬롯을 요일×시간 격자로 확인 | P0 | 8 |
| GRP-07 | 매니저/관리자 시간표 뷰 — 강사 카드 목록 → 클릭 → 해당 강사 시간표 | P1 | 8 |
| GRP-08 | 예약 시스템 아키텍처 확정 (`rye-reservations` 스키마 + 포털 연동 흐름) — 구현 없음, 설계 문서만 | P2 | 8 |

---

## SHOP — Instant Charge & Shop Catalog

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| SHOP-01 | `rye-instant-charges` Firestore 컬렉션 CRUD 함수 + App.jsx 상태·리스너 추가 | P0 | SHOP-01 |
| SHOP-02 | `rye-shop-items` appData 키 — 카탈로그 로드/저장 함수 + shopItems 상태 | P0 | SHOP-01 |
| SHOP-03 | 강사: 즉시 청구 요청 모달 — 카탈로그 선택·직접입력, 재고여부, 금액미정 옵션 | P0 | SHOP-01 |
| SHOP-04 | 관리자: 즉시청구 승인 모달 — 금액 수정, 승인/거절, 알림 메시지 자동생성+클립보드 복사 | P0 | SHOP-01 |
| SHOP-05 | 관리자: 입금 확인 → `status:"paid"` + payment 레코드 자동 생성 | P0 | SHOP-01 |
| SHOP-06 | AdminTools "상품관리" 탭 — 카테고리(의상/공연복, 악세사리, 악기 가방, 기타) + 상품 CRUD | P1 | SHOP-01 |
| SHOP-07 | 대시보드: 즉시청구 대기 알림 배지 — 관리자/매니저에게 pending 건수 표시 | P1 | SHOP-01 |

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
| SHOP-01 | SHOP-01 | ✓ Complete |
| SHOP-02 | SHOP-01 | ✓ Complete |
| SHOP-03 | SHOP-01 | ✓ Complete |
| SHOP-04 | SHOP-01 | ✓ Complete |
| SHOP-05 | SHOP-01 | ✓ Complete |
| SHOP-06 | SHOP-01 | ✓ Complete |
| SHOP-07 | SHOP-01 | ✓ Complete |
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
| PAY-07 | Phase 7 | ✓ Complete |
| PAY-08 | Phase 7 | ✓ Complete |
| PAY-09 | Phase 7 | ✓ Complete |
| PAY-10 | Phase 7 | ✓ Complete |
| PAY-11 | Phase 7 | ✓ Complete |
| DIS-06 | Phase 11 | ✓ Complete |
| DIS-07 | Phase 11 | ✓ Complete |
| DIS-08 | Phase 11 | ✓ Complete |
| ACC-01 | Phase 10 | Pending |
| ACC-02 | Phase 10 | Pending |
| ACC-03 | Phase 10 | Pending |
| ACC-04 | Phase 10 | Pending |
| ACC-05 | Phase 10 | Pending |
| ACC-06 | Phase 10 | Pending |
| ACC-07 | Phase 10 | Pending |
| ACC-08 | Phase 10 | Pending |
| ACC-09 | Phase 10 | Pending |
| ACC-10 | Phase 10 | Pending |
| ACC-11 | Phase 10 | Pending |
| ACC-12 | Phase 10 | Pending |
| ACC-13 | Phase 10 | Pending |
| ACC-14 | Phase 10 | Pending |
| ACC-15 | Phase 10 | Pending |

---

## ACC — Accounting App (Phase 10)

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| ACC-01 | 별도 Git 리포(rye-k-accounting) + Vite+React+TS 프로젝트 셋업, Cloudflare Pages 연결 (accounting.ryekorea.com) | P0 | 10 |
| ACC-02 | Supabase 프로젝트 생성 + 전체 스키마 마이그레이션(tenants, accounts, journal_entries, journal_lines, bank_imports, bank_transactions, bank_rules, payroll_records, invoices, ryek_sync_log, tax_exports, recurring_templates) + RLS 정책 적용 | P0 | 10 |
| ACC-03 | 학원 표준 계정과목 Seed 데이터 (1010~5900, 26개) 자동 삽입 + Supabase Auth (이메일/비밀번호) + 테넌트 자동 생성 온보딩 | P0 | 10 |
| ACC-04 | 복식부기 엔진: 분개 CRUD + draft→posted 전환 시 차대변 균형 DB 트리거 검증 + sourceId 중복 방지 | P0 | 10 |
| ACC-05 | RYE-K Firebase 수납 폴링 연동: Supabase Edge Function(5분 간격) → 수납완료 항목 조회 → journal_entries draft 자동 생성(source_type: ryek_payment) + 멱등성(sourceId unique) | P0 | 10 |
| ACC-06 | 지출 입력 UI: 빠른 입력(FAB → 모달, 날짜/금액/계정과목/메모/영수증) + 반복 전표 템플릿(매월 DD일 자동 초안 생성) | P0 | 10 |
| ACC-07 | 은행 CSV 업로드 & 대사: 5대 은행 파서(카카오/신한/국민/우리/기업) + Bank Rules 엔진(조건: 금액/설명/거래처, 액션: 계정과목 자동배정) + 3상태(자동매칭/규칙적용/수동처리) | P0 | 10 |
| ACC-08 | 강사 급여 명세: 지급 유형(사업소득 3.3%/근로소득) + 원천세 자동 계산 + 급여 전표 자동 생성 + 월별 원천세 집계 | P1 | 10 |
| ACC-09 | B2B 계산서 관리: RYE-K 기관 데이터 연동 + 계산서 초안 작성 + 홈택스 직접 발행 링크 제공(무료) + 발행 완료 기록 | P1 | 10 |
| ACC-10 | 손익계산서(P&L): 월별/분기별/연간 수입-지출 집계 + 계정별 원장 드릴다운 + 최근 6개월 차트 | P0 | 10 |
| ACC-11 | 더블체크 대시보드: RYE-K 수납 집계 vs 회계 원장 집계 비교 + 차이 발생 시 빨간 표시 + 월별 수납률/입금률 비교 | P0 | 10 |
| ACC-12 | AR Aging(미수금 현황): 학생별 미납 0-30/31-60/61-90/90+ 일 구간 표시 + 기관 미수금 별도 섹션 | P1 | 10 |
| ACC-13 | 세무사 이메일 자동 전송: 월별 손익 PDF 생성 + 이메일 발송(매월 N일 자동 or 수동) + 전송 이력 저장 | P1 | 10 |
| ACC-14 | 모바일 퍼스트 반응형 UI: 하단 탭바(모바일)/좌측 사이드바(데스크탑), FAB, 카드 목록, 한국식 금액 포맷, 다크모드 | P0 | 10 |
| ACC-15 | Cloudflare Pages 배포 설정: 환경변수(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_RYEK_FIREBASE_*), 빌드 명령, 커스텀 도메인 | P0 | 10 |

---

## DIS — Discount System (Phase 11)

| ID | Requirement | Priority | Phase |
|----|-------------|----------|-------|
| DIS-01 | calcTotalFee(student, feePresets, discountTypes?) 할인 반영 — 반환: { total, original, discountAmount, discountName }. discountTypes 미전달 시 역호환 | P0 | 11 | ✓ 2026-06-22 |
| DIS-02 | rye-discounts Firestore 리스너 + discountTypes state + saveDiscountTypes 함수 (App.jsx) | P0 | 11 | ✓ 2026-06-22 |
| DIS-03 | 할인 타입 CRUD UI (PaymentsView 5번째 탭, admin/manager only): 리스트·추가·수정·삭제·활성/비활성 토글 | P0 | 11 | ✓ 2026-06-22 |
| DIS-04 | 초기 할인 타입 7개 씨드 상수 (AdminTools에서 0개일 때 표시, 버튼 클릭 시 생성) | P1 | 11 | ✓ 2026-06-22 |
| DIS-05 | StudentFormModal 할인 배정 섹션 — 할인 타입 선택·시작일·종료일·다과목 과목 선택·메모 (canManageAll만) | P0 | 11 | ✓ 2026-06-22 |
| DIS-06 | 수납 리스트 행 할인 표시 — 원가 취소선 + 할인가 + 할인명 뱃지 (자동계산 수강료에만) | P0 | 11 | ✓ 2026-06-22 |
| DIS-07 | 수납 상세 모달 할인 브레이크다운 섹션 — "할인 적용: [할인명] -[할인액]원 (원가: [원가]원)" | P0 | 11 | ✓ 2026-06-22 |
| DIS-08 | 모든 calcTotalFee 호출부 역호환 업데이트: Dashboard(라인 145), SettlementView(라인 44·79), StudentManagement(라인 132·234) | P0 | 11 | ✓ 2026-06-22 |
