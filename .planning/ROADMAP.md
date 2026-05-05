# Roadmap: RYE-K K-Culture Center 레슨 관리 완성

## Overview

현재 운영 중인 국악 교육기관 관리 앱(회원·강사·출결·수납·포털 기본 기능)을 완전한 수준으로 끌어올리는 마일스톤. 보안 구멍 봉인을 시작으로, 학부모 포털 앱 수준 완성 → AI 강사 지원 완성 → 카카오 알림톡 자동화 → 수납 자동화 → 분석 대시보드 고도화 순으로 진행한다. 각 단계는 이전 단계의 안전성 위에 쌓인다.

## Phases

- [ ] **Phase 1: 보안 기반 (Security Foundation)** - 익명 전체 읽기 차단 + Auth 세션 정상화로 운영 데이터 보호
- [ ] **Phase 2: 포털 완성 (Portal Completion)** - 학생·학부모 포털을 앱 수준으로 고도화 (시간표·레슨노트·수납·셀프 신청)
- [ ] **Phase 3: AI 완성 (AI Completion)** - 월별 리포트·케어 메시지·자연어 쿼리 완성 및 AI 데이터 동의 강제
- [ ] **Phase 4: 알림톡 통합 (KakaoTalk AlimTalk)** - Solapi 연동으로 결석·수납·일정 변경 자동 알림톡 발송
- [ ] **Phase 5: 수납 자동화 (Payment Automation)** - 은행 입금 자동 매칭 + 미납 현황 대시보드 + 리마인더 자동 발송
- [ ] **Phase 6: 분석 대시보드 고도화 (Analytics Enhancement)** - 관리자·강사·학부모용 데이터 인사이트 레이어

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
**Plans**: TBD
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
**Plans**: TBD

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
**Plans**: TBD
**Admin prerequisites**: `monthlyFee` 데이터 전체 입력 + Firebase 서비스 계정 설정 + Toss Payments 가상계좌 계정 (Nick 선행 작업)

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

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. 보안 기반 | 0/5 | Planned | - |
| 2. 포털 완성 | 0/TBD | Not started | - |
| 3. AI 완성 | 0/TBD | Not started | - |
| 4. 알림톡 통합 | 0/TBD | Not started | - |
| 5. 수납 자동화 | 0/TBD | Not started | - |
| 6. 분석 대시보드 고도화 | 0/TBD | Not started | - |

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

**Total: 38/38 requirements mapped.**
