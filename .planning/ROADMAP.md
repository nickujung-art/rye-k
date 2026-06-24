# Roadmap: RYE-K K-Culture Center 레슨 관리 완성

## Overview

현재 운영 중인 국악 교육기관 관리 앱(회원·강사·출결·수납·포털 기본 기능)을 완전한 수준으로 끌어올리는 마일스톤. 보안 구멍 봉인을 시작으로, 학부모 포털 앱 수준 완성 → AI 강사 지원 완성 → 카카오 알림톡 자동화 → 수납 자동화 → 분석 대시보드 고도화 순으로 진행한다. 각 단계는 이전 단계의 안전성 위에 쌓인다.

## Phases

- [ ] **Phase 1: 보안 기반 (Security Foundation)** - 익명 전체 읽기 차단 + Auth 세션 정상화로 운영 데이터 보호
- [ ] **Phase 2: 포털 완성 (Portal Completion)** - 학생·학부모 포털을 앱 수준으로 고도화 (시간표·레슨노트·수납·셀프 신청)
- [ ] **Phase 3: AI 완성 (AI Completion)** - 월별 리포트·케어 메시지·자연어 쿼리 완성 및 AI 데이터 동의 강제
- [x] **Phase 4: 알림톡 통합 (KakaoTalk AlimTalk)** - Aligo API 직접 연동, 수납·보강·등록완료 알림톡 구현 ✓ 2026-06-15
- [x] **Phase 5: 수납 자동화 (Payment Automation)** - 은행 입금 자동 매칭 + 미납 현황 대시보드 + 리마인더 자동 발송 ✓ 2026-05-09
- [x] **Phase 6: 분석 대시보드 고도화 (Analytics Enhancement)** - AnalyticsView 월별 매출·악기·연령·출석·수납 현황 ✓ 2026-06-15
- [x] **Phase 7: 입금 자동매칭 고도화 (Payment Matching Enhancement)** - guardianName 필드 추가 + 보호자 이름 매칭 + students_cache 타이밍 수정 ✓ 2026-06-03
- [x] **Phase 8: 그룹 레슨 고도화 (Group Lesson Enhancement)** - rye-lesson-slots 엔티티 신설 + 마이그레이션 + 그룹 이름 편집 + TimetableView ✓ 2026-06-13
- [x] **Phase 9: 스케줄 고도화 (Schedule Enhancement)** - 슬롯 자동생성·연결 + TimetableView 직접 배정 + 휴회 관리 뷰 + pauseHistory 스키마 ✓ 2026-06-16
- [ ] **Phase 10: 회계 앱 (Accounting App)** - 별도 앱(rye-k-accounting) 신규 구축: Supabase+복식부기+RYE-K연동+은행대사+급여+B2B계산서+세무사전송
- [ ] **Phase 11: 할인 시스템 (Discount System)** - 할인 타입 CRUD·학생 배정·calcTotalFee 업데이트·수납 표시

## Phase Details

### Phase 1: 보안 기반 (Security Foundation)
**Goal**: 운영 데이터(학생 77명 PII·수납·강사 연락처)가 외부에 노출되지 않고, Auth 세션이 안정적으로 동작한다
**Depends on**: Nothing (first phase)
**Requirements**: SEC-01, SEC-02, SEC-03, SEC-04, SEC-05, SEC-06, SEC-07
**Success Criteria** (what must be TRUE):
  1. 브라우저 DevTools에서 `/register` 또는 `/myryk` 방문 시 Firestore REST 응답에 `rye-students`, `rye-payments`, `rye-teachers` 데이터가 포함되지 않는다
  2. 프로덕션 빌드의 DevTools Console에서 Firebase UID 또는 PII가 출력되지 않는다
  3. 강사가 로그인 후 AI 기능을 사용할 때 `RATE_LIMIT_KV` 바인딩 오류 없이 rate limiter가 정상 동작한다
  4. 샘플 데이터 초기화 버튼이 `NODE_ENV=production` 빌드에서 렌더링되지 않는다
  5. 강사가 로그아웃 후 재로그인 시 30일 재인증 흐름이 Firebase Auth를 통해 정상 완료된다
**Plans**: 5 plans
Plans:
- [ ] 01-01-PLAN.md — console.log PII 제거 + resetSeed DEV guard + saveStudents 감사 (SEC-01, SEC-02, SEC-03)
- [ ] 01-02-PLAN.md — Cloudflare KV namespace 바인딩 + rate limiter 강화 (SEC-04)
- [ ] 01-03-PLAN.md — Firebase Custom Claims Worker 구현 및 로그인 흐름 연결 (SEC-05)
- [ ] 01-04-PLAN.md — Firestore 보안 규칙 역할 기반 재작성 (SEC-06)
- [ ] 01-05-PLAN.md — Firebase Auth ↔ localStorage 세션 동기화 (SEC-07)
**UI hint**: yes

### Phase 2: 포털 완성 (Portal Completion)
**Goal**: 학생과 학부모가 앱 수준의 포털에서 시간표·출석·레슨노트·수납 현황을 확인하고, 포털 로그인이 브라우저를 닫아도 유지된다
**Depends on**: Phase 1
**Requirements**: POR-01, POR-02, POR-03, POR-04, POR-05, POR-06, POR-07, POR-08
**Success Criteria** (what must be TRUE):
  1. 학생이 포털(`/myryk`)에서 자신의 수업 요일·시간표를 모바일 화면에서 확인할 수 있다
  2. 학생 또는 학부모가 포털에서 강사 작성 레슨노트를 열람할 수 있다
  3. 학부모가 포털에서 자녀의 이번 달 수납 완납/미납 현황을 확인할 수 있다
  4. 포털 로그인 후 브라우저를 닫았다가 30일 이내 재방문 시 자동 로그인된다
  5. 학생 또는 학부모가 포털에서 수강 신청을 제출하면 관리자 화면에 승인 대기 항목이 나타난다
**Plans**: 4 plans
Plans:
- [ ] 02-01-PLAN.md — 포털 CSS 클래스 추가 (배너 + 시간표 위젯) (POR-01, POR-02)
- [ ] 02-02-PLAN.md — 세션 만료 정책 + 시간표 위젯 + 수강 신청 CTA (POR-01, POR-02, POR-03, POR-07)
- [ ] 02-03-PLAN.md — pay 탭 empty state + sibling 모달 CSS + 학부모 뷰 gap (POR-05, POR-06, POR-08)
- [ ] 02-04-PLAN.md — 연습 가이드 Worker 연결 + firebase getPortalIdToken (POR-04)
**UI hint**: yes

### Phase 3: AI 완성 (AI Completion)
**Goal**: 강사가 한 번의 클릭으로 월별 리포트를 생성·발송할 수 있고, AI가 학생 PII를 익명화된 상태로만 처리하며, 자연어 질의로 학생·출결 데이터를 조회할 수 있다
**Depends on**: Phase 2
**Requirements**: AI-01, AI-02, AI-03, AI-04, AI-05, SEC-08
**Success Criteria** (what must be TRUE):
  1. 강사가 월별 리포트 뷰에서 학생 선택 후 "발송" 버튼을 누르면 리포트가 학부모에게 전달된다
  2. 이탈 위험도가 높은 학생의 케어 메시지 초안이 자동 생성되고, 알림톡 발송 화면으로 연결된다
  3. AI 어시스턴트에서 "이번 달 결석 3회 이상 학생"과 같은 자연어 질의에 카드 형식 결과가 반환된다
  4. `studentName`이 Gemini API로 전송될 때 `anonymize.js`를 통과한 익명화 형태로만 전송된다
  5. AI 엔드포인트 파일명과 함수명이 `callGemini` / `gemini.js`로 통일되어 있다
**Plans**: 3 plans
Plans:
- [ ] 03-01-PLAN.md — anthropic.js → gemini.js 리네임 + 8개 Worker import 수정 + monthly-report/churn 익명화 (AI-01, SEC-08)
- [ ] 03-02-PLAN.md — care-message.js Worker 신규 + ChurnWidget 케어 메시지 버튼 + MonthlyReportsView 발송 준비 버튼 (AI-02, AI-03)
- [ ] 03-03-PLAN.md — AiAssistant ListResult 클릭 → StudentDetailModal 연결 + AI-05 재시도 에러 처리 (AI-04, AI-05)

### Phase 4: 알림톡 통합 (KakaoTalk AlimTalk)
**Goal**: 결석·수납·일정 변경 발생 시 학부모에게 카카오 알림톡이 자동 또는 일괄 발송되고, 발송 결과가 관리자 화면에서 추적된다
**Depends on**: Phase 3
**Requirements**: ALM-01, ALM-02, ALM-03, ALM-04, ALM-05, ALM-06
**Success Criteria** (what must be TRUE):
  1. 강사가 출결 기록에서 학생을 결석 처리하면 해당 학부모에게 카카오 알림톡이 자동 발송된다
  2. 관리자가 월초 수납 안내 알림톡을 전체 학생 대상으로 일괄 발송할 수 있다
  3. 스케줄 변경(보강/휴강) 저장 시 관련 학생 학부모에게 일정 변경 알림톡이 발송된다
  4. 관리자 화면에서 알림톡 발송 이력(발송일시·수신자·성공/실패)을 확인할 수 있다
**Plans**: TBD
**Admin prerequisites**: 카카오 비즈니스 채널 개설 + Solapi 계정 등록 + 알림톡 템플릿 심사 완료 (Nick 선행 작업)

### Phase 5: 수납 자동화 (Payment Automation)
**Goal**: 학생 수강료 데이터가 입력되어 있고, 은행 입금이 자동으로 수납 처리되며, 미납 현황이 대시보드에서 실시간으로 확인된다
**Depends on**: Phase 4
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05, PAY-06, ALM-07
**Success Criteria** (what must be TRUE):
  1. 관리자가 학생 편집 화면에서 수강료를 빠르게 입력하거나 수정할 수 있다
  2. 관리자 화면에서 이번 달 미납 학생 목록과 수납률을 한눈에 볼 수 있다
  3. 은행에서 입금 웹훅이 수신되면 학생 이름+금액 기반으로 자동 매칭되어 수납 처리된다
  4. 자동 매칭이 불확실한 입금은 "미매칭 입금" 큐에 올라가 관리자가 수동 처리할 수 있다
  5. 미납 리마인더 알림톡이 미납 학생 학부모에게 자동 발송됨
**Plans**: 4 plans
Plans:
- [x] 05-01-PLAN.md — App.jsx state 추가 (unmatchedPayments, paymentsInitFilter) + constants.jsx CSS (PAY-01, PAY-02, PAY-06)
- [x] 05-02-PLAN.md — PaymentsView 미매칭 탭 + ALM-07 stub (PAY-01, PAY-03, PAY-06, ALM-07)
- [x] 05-03-PLAN.md — Dashboard 미납 현황 카드 클릭 가능 + 미납 금액 표시 (PAY-02)
- [x] 05-04-PLAN.md — KakaoBank Webhook Worker + fuzzy match + KV buffer + Tasker 설정 가이드 (PAY-04, PAY-05)
- [x] 05-05-PLAN.md — students_cache KV sync 갭 해소 (PAY-04, PAY-05 gap closure)
**Admin prerequisites**: `monthlyFee` 데이터 전체 입력 (Nick 선행) + RYE_WEBHOOK_SECRET Cloudflare secret 등록 + Tasker Android 설정

### Phase 6: 분석 대시보드 고도화 (Analytics Enhancement)
**Goal**: 관리자는 매출 추이를, 강사는 담당 학생 출석률을, 학부모는 자녀 월별 리포트를 각자의 역할 화면에서 확인할 수 있으며, Firestore 1MB 한도 대응 아카이빙이 적용되어 있다
**Depends on**: Phase 5
**Requirements**: ANL-01, ANL-02, ANL-03, ANL-04
**Success Criteria** (what must be TRUE):
  1. 관리자가 월별 매출 추이 차트와 악기별 학생 분포를 Analytics 화면에서 볼 수 있다
  2. 강사가 자신의 담당 학생 출석률과 진도 요약을 역할별 뷰에서 확인할 수 있다
  3. 학부모가 포털에서 자녀의 이번 달 출석률과 레슨노트 요약 리포트를 확인할 수 있다
  4. `rye-attendance` 문서가 연도별로 아카이빙되어 1MB 한도 초과 위험이 해소된다
**Plans**: TBD
**UI hint**: yes

### Phase 7: 입금 자동매칭 고도화 (Payment Matching Enhancement)
**Goal**: 보호자 이름으로 입금해도 자동 매칭되고, students_cache가 항상 최신 상태로 유지되어 Tasker 알림 수신 즉시 정확한 매칭이 이루어진다
**Depends on**: Phase 5
**Requirements**: PAY-07, PAY-08, PAY-09, PAY-10, PAY-11
**Success Criteria** (what must be TRUE):
  1. 학생 등록/수정 화면에서 보호자 이름을 입력할 수 있다
  2. Tasker가 카카오뱅크 알림을 webhook으로 전송할 때 students_cache가 비어있지 않다 (앱 로드 시 sync)
  3. 보호자 이름으로 입금 시 해당 학생으로 자동 매칭된다 (confidence: guardian_exact)
  4. "홍길동 김개똥" 형태의 공백 포함 2명 이름이 각각 정확히 분리·매칭된다
  5. 미매칭 카드에서 실제 알림 텍스트(rawText)와 금액 기반 추천 학생이 표시된다
**Plans**: 3 plans
Plans:
- [x] 07-01-PLAN.md — guardianName 필드 + students_cache 개선 + sync 타이밍 수정 (PAY-07, PAY-08, PAY-09) ✓ 2026-06-03
- [x] 07-02-PLAN.md — fuzzyMatchStudent 알고리즘 고도화 (PAY-10) ✓ 2026-06-03
- [x] 07-03-PLAN.md — 미매칭 카드 UI 개선 (PAY-11) ✓ 2026-06-03

### Phase 8: 그룹 레슨 고도화 (Group Lesson Enhancement)
**Goal**: 레슨 슬롯이 명시적 엔티티로 관리되고, 강사와 관리자가 시간표 뷰에서 공강/수업 현황을 한눈에 확인하며, 그룹 레슨에 이름을 붙여 출석·스케줄에서 일관되게 표시된다
**Depends on**: Nothing (standalone feature)
**Requirements**: GRP-01, GRP-02, GRP-03, GRP-04, GRP-05, GRP-06, GRP-07, GRP-08
**Success Criteria** (what must be TRUE):
  1. AdminTools에서 마이그레이션 버튼 실행 후 모든 학생의 lessons[].slotId가 채워지고 rye-lesson-slots 문서가 생성된다
  2. ScheduleView에서 그룹 레슨 헤더를 클릭해 이름을 편집하면 즉시 Firestore에 저장되고 다음 로드 시 유지된다
  3. Attendance 그룹 헤더에서 "그룹 레슨" 대신 슬롯 이름이 표시된다
  4. 강사가 로그인 시 TimetableView에서 자신의 09:00~21:00 주간 시간표를 격자 형태로 볼 수 있다
  5. 관리자/매니저가 강사 카드를 클릭해 해당 강사의 시간표를 확인할 수 있다
**Plans**: 6 plans
Plans:
- [ ] 08-01-PLAN.md — rye-lesson-slots CRUD (firebase.js) + App.jsx 리스너·상태·prop 전달 (GRP-01)
- [ ] 08-02-PLAN.md — AdminTools LessonSlotsView + runLessonSlotMigration (GRP-02)
- [ ] 08-03-PLAN.md — ScheduleView 그룹 이름 표시 + 인라인 편집 (GRP-03)
- [ ] 08-04-PLAN.md — Attendance 그룹 헤더 슬롯 이름 연동 (GRP-04)
- [ ] 08-05-PLAN.md — TimetableView 신규 + ScheduleView 탭 통합 + CSS (GRP-05, GRP-06, GRP-07)
- [ ] 08-06-PLAN.md — 예약 시스템 설계 문서 (GRP-08)
- [ ] 08-02-PLAN.md — AdminTools LessonSlotsView + App.jsx 마이그레이션 함수 (GRP-02)
- [ ] 08-03-PLAN.md — ScheduleView 그룹 이름 표시 + 인라인 편집 (GRP-03)
- [ ] 08-04-PLAN.md — Attendance 그룹 헤더 슬롯 이름 연동 (GRP-04)
- [ ] 08-05-PLAN.md — TimetableView 신규 컴포넌트 + ScheduleView 탭 통합 + CSS (GRP-05, GRP-06, GRP-07)
- [ ] 08-06-PLAN.md — 예약 시스템 설계 문서 (08-RESERVATION-SPEC.md) (GRP-08)
**UI hint**: yes

### Phase 9: 스케줄 고도화 (Schedule Enhancement)
**Goal**: 학생 등록/수정 시 슬롯이 자동 생성·연결되고, TimetableView에서 빈 셀에 직접 학생을 배정할 수 있으며, 휴회 학생 이력과 케어로그를 전용 뷰에서 관리한다
**Depends on**: Phase 8
**Success Criteria** (what must be TRUE):
  1. 학생 등록/수정 저장 시 slotId 없는 레슨에 완전 일치 슬롯이 자동 연결되거나 신규 슬롯이 생성되며 토스트로 결과가 표시된다
  2. TimetableView 빈 셀 "+"를 누르면 학생 검색 팝업이 나타나고, 선택 후 슬롯이 자동 생성·연결된다
  3. 그룹 슬롯 카드 팝업에서 "학생 추가" 버튼으로 기존 슬롯에 학생을 연결할 수 있다
  4. 사이드바에 "휴회 관리" 메뉴가 있고, 휴회 학생 목록·슬롯 이력·케어로그·복귀 처리가 가능하다
  5. 복귀(status → active) 시 pauseHistory[]에 { pausedAt, pausedReason, resumedAt, durationDays, slotIds } 엔트리가 자동 추가된다
**Plans**: 4 plans
Plans:
- [ ] 09-01-PLAN.md — slotMatchesLesson 유틸 + IC.pause + Phase 9 CSS (SCH-01, SCH-02, SCH-03)
- [ ] 09-02-PLAN.md — autoSyncStudentSlots + sForm 핸들러 + onResumeStudent + pauseManagement 라우팅 (SCH-01, SCH-04, SCH-05)
- [ ] 09-03-PLAN.md — TimetableView StudentSearchPopup + '+' 버튼 + '학생 추가' + ScheduleView 전달 (SCH-02, SCH-03)
- [ ] 09-04-PLAN.md — PauseManagementView 신규 + NavLayout + Dashboard 링크 배너 + AdminTools 폐강 (SCH-04, SCH-05)

### Phase 10: 회계 앱 (Accounting App)
**Goal**: 별도 앱(rye-k-accounting, Supabase+React+TS)을 신규 구축해 복식부기 원장·RYE-K 수납 자동 연동·은행 CSV 대사·강사 급여·B2B 계산서·세무사 이메일 전송을 제공하며, 더블체크 대시보드로 RYE-K 수납 집계와 원장을 항상 비교할 수 있다
**Depends on**: Phase 9 (독립 신규 프로젝트이지만 RYE-K Firebase 수납 데이터 참조)
**Requirements**: ACC-01, ACC-02, ACC-03, ACC-04, ACC-05, ACC-06, ACC-07, ACC-08, ACC-09, ACC-10, ACC-11, ACC-12, ACC-13, ACC-14, ACC-15
**Success Criteria** (what must be TRUE):
  1. accounting.ryekorea.com에 접속하면 Supabase Auth 로그인 화면이 나타나고 이메일/비밀번호로 로그인된다
  2. RYE-K 수납 완료 항목이 5분 이내 회계 앱 전표 목록에 draft 상태로 나타난다
  3. 은행 CSV를 업로드하면 Bank Rules가 적용되어 자동매칭/규칙적용/수동처리 3가지로 분류된다
  4. 강사 급여 입력 시 사업소득 3.3% 원천세가 자동 계산되고 급여 전표가 생성된다
  5. 월별 손익계산서(P&L)가 정확히 수입합계-지출합계=순이익 구조로 표시된다
  6. 더블체크 대시보드에서 RYE-K 수납 집계와 원장 집계가 비교되며 차이 발생 시 빨간 표시가 된다
**Plans**: 11 plans
Plans:
- [ ] 10-01-PLAN.md — 프로젝트 스캐폴드 + Vite/TS/Tailwind 설정 (ACC-01, ACC-15)
- [ ] 10-02-PLAN.md — Supabase 스키마 마이그레이션 + DB push 체크포인트 (ACC-02, ACC-03, ACC-04)
- [ ] 10-03-PLAN.md — Supabase Auth + 레이아웃 + 공통 UI 컴포넌트 (ACC-03, ACC-14)
- [ ] 10-04-PLAN.md — 복식부기 전표 엔진 + 전표 CRUD UI (ACC-04)
- [ ] 10-05-PLAN.md — RYE-K 수납 동기화 Edge Function (Deno.cron 5분) (ACC-05)
- [ ] 10-06-PLAN.md — 비용 빠른입력 + 반복 템플릿 (ACC-06)
- [ ] 10-07-PLAN.md — 은행 CSV 파서 5종 + Bank Rules 엔진 + 대사 UI (ACC-07)
- [ ] 10-08-PLAN.md — 강사 급여 3.3% 원천세 + AR Aging 미수금 현황 (ACC-08, ACC-12)
- [ ] 10-09-PLAN.md — B2B 세금계산서 + 홈택스 연동 링크 (ACC-09)
- [ ] 10-10-PLAN.md — P&L 손익계산서 + 원장 조회 (ACC-10)
- [ ] 10-11-PLAN.md — 더블체크 대시보드 + 세무사 이메일 전송 (ACC-11, ACC-13)
**Tech Stack**: React 18 + Vite 5 + TypeScript, Supabase (PostgreSQL + Auth + Edge Functions), Cloudflare Pages
**Repo**: rye-k-accounting (별도 Git 리포지토리)
**UI hint**: yes

### Phase 11: 할인 시스템 (Discount System)
**Goal**: 학생별 할인 타입을 배정하면 calcTotalFee가 할인을 자동 반영하고, 수납 화면에서 원가 취소선과 할인명 뱃지가 표시된다
**Depends on**: Nothing (standalone feature)
**Requirements**: DIS-01, DIS-02, DIS-03, DIS-04, DIS-05, DIS-06, DIS-07, DIS-08
**Plans**: 4 plans
Plans:
- [x] 11-01-PLAN.md — calcTotalFee 확장 + saveDiscountTypes + App.jsx 배선 (DIS-01, DIS-02) ✓ 2026-06-22
- [x] 11-02-PLAN.md — StudentFormModal 할인 섹션 + calcTotalFee 호출부 업데이트 (DIS-05, DIS-08) ✓ 2026-06-22
- [x] 11-03-PLAN.md — PaymentsView 5번째 탭 + DiscountTypeManager + AdminTools 씨드 상수 (DIS-03, DIS-04) ✓ 2026-06-22
- [ ] 11-04-PLAN.md — 수납 리스트 할인 표시 + 모달 브레이크다운 + Dashboard/SettlementView 업데이트 (DIS-06, DIS-07, DIS-08)

### Phase SHOP-01: 즉시 청구 & 상품 관리 시스템 (Instant Charge & Shop)
**Goal**: 강사가 한복·악세사리·악기가방 등을 판매 시 즉시 청구를 요청하고, 관리자가 승인 후 알림 메시지를 클립보드 복사로 발송하며, 입금 확인 후 수납 레코드가 자동 생성된다. 상품 카탈로그는 AdminTools에서 관리한다.
**Depends on**: Nothing (standalone feature)
**Requirements**: SHOP-01, SHOP-02, SHOP-03, SHOP-04, SHOP-05, SHOP-06, SHOP-07
**Success Criteria** (what must be TRUE):
  1. 강사가 수납 관리 탭에서 학생 카드의 "즉시 청구 요청" 버튼으로 상품을 선택·금액 입력·재고여부 선택 후 요청을 전송할 수 있다
  2. 관리자가 즉시청구 승인 모달에서 금액을 수정하고 승인 시 알림 메시지가 자동 생성되어 클립보드 복사 버튼이 나타난다
  3. 관리자가 "입금 완료" 처리 시 `rye-instant-charges` 문서의 `status`가 `"paid"`로 변경되고 `rye-payments`에 독립 레코드가 생성된다
  4. AdminTools "상품관리" 탭에서 카테고리(의상/공연복, 악세사리, 악기 가방, 기타)와 상품(이름·기본가격)을 추가·수정·삭제할 수 있다
  5. 대시보드에 즉시청구 대기 건수 배지가 표시되어 관리자/매니저가 수납 관리 탭으로 이동할 수 있다
**Plans**: 5 plans
Plans:
- [x] SHOP-01-01-PLAN.md — Firebase CRUD 함수 + App.jsx 상태·리스너 (SHOP-01, SHOP-02) ✓ 2026-05-14
- [x] SHOP-01-02-PLAN.md — AdminTools 상품관리 탭 (ShopView) (SHOP-06) ✓ 2026-05-14
- [x] SHOP-01-03-PLAN.md — 강사 즉시청구 요청 모달 + PaymentsView 버튼 (SHOP-03) ✓ 2026-05-14
- [x] SHOP-01-04-PLAN.md — 관리자 승인/거절 모달 + 알림 메시지 복사 (SHOP-04) ✓ 2026-05-14
- [x] SHOP-01-05-PLAN.md — 입금 확인 → payment 레코드 + 대시보드 배지 (SHOP-05, SHOP-07) ✓ 2026-05-14

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 보안 기반 | 5/5 | ✓ COMPLETE | - |
| 2. 포털 완성 | 4/4 | ✓ COMPLETE | - |
| 3. AI 완성 | 3/3 | ✓ COMPLETE | - |
| 4. 알림톡 통합 | - | ✓ COMPLETE | 2026-06-15 |
| 5. 수납 자동화 | 5/5 | ✓ COMPLETE | 2026-05-09 |
| 6. 분석 대시보드 고도화 | - | ✓ COMPLETE | 2026-06-15 |
| 9. 스케줄 고도화 | 4/4 | ✓ COMPLETE | 2026-06-16 |
| 7. 입금 자동매칭 고도화 | 3/3 | ✓ COMPLETE | 2026-06-03 |
| 8. 그룹 레슨 고도화 | 6/6 | ✓ COMPLETE | 2026-06-13 |
| SHOP-01. 즉시 청구 & 상품 관리 | 5/5 | ✓ COMPLETE | 2026-05-14 |
| 10. 회계 앱 | 0/11 | PLANNED | - |
| 11. 할인 시스템 | 2/4 | IN PROGRESS | - |

---

## Coverage

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
| PAY-07 | Phase 7 | Planned |
| PAY-08 | Phase 7 | Planned |
| PAY-09 | Phase 7 | Planned |
| PAY-10 | Phase 7 | Planned |
| PAY-11 | Phase 7 | Planned |
| GRP-01 | Phase 8 | Planned |
| GRP-02 | Phase 8 | Planned |
| GRP-03 | Phase 8 | Planned |
| GRP-04 | Phase 8 | Planned |
| GRP-05 | Phase 8 | Planned |
| GRP-06 | Phase 8 | Planned |
| GRP-07 | Phase 8 | Planned |
| GRP-08 | Phase 8 | Planned |
| SHOP-01 | SHOP-01 | Planned |
| SHOP-02 | SHOP-01 | Planned |
| SHOP-03 | SHOP-01 | Planned |
| SHOP-04 | SHOP-01 | Planned |
| SHOP-05 | SHOP-01 | Planned |
| SHOP-06 | SHOP-01 | Planned |
| SHOP-07 | SHOP-01 | Planned |

| ACC-01 | Phase 10 | Planned |
| ACC-02 | Phase 10 | Planned |
| ACC-03 | Phase 10 | Planned |
| ACC-04 | Phase 10 | Planned |
| ACC-05 | Phase 10 | Planned |
| ACC-06 | Phase 10 | Planned |
| ACC-07 | Phase 10 | Planned |
| ACC-08 | Phase 10 | Planned |
| ACC-09 | Phase 10 | Planned |
| ACC-10 | Phase 10 | Planned |
| ACC-11 | Phase 10 | Planned |
| ACC-12 | Phase 10 | Planned |
| ACC-13 | Phase 10 | Planned |
| ACC-14 | Phase 10 | Planned |
| ACC-15 | Phase 10 | Planned |

| DIS-01 | Phase 11 | Planned |
| DIS-02 | Phase 11 | Planned |
| DIS-03 | Phase 11 | Planned |
| DIS-04 | Phase 11 | Planned |
| DIS-05 | Phase 11 | Planned |
| DIS-06 | Phase 11 | Planned |
| DIS-07 | Phase 11 | Planned |
| DIS-08 | Phase 11 | Planned |

**Total: 76/76 requirements mapped.**
