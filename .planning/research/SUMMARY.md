# Research Summary — RYE-K 새 기능 로드맵

**Synthesized:** 2026-05-05  
**Input:** STACK.md · FEATURES.md · ARCHITECTURE.md · PITFALLS.md  
**Purpose:** 6개 로드맵 페이즈 정의를 위한 핵심 인사이트 통합

---

## 핵심 발견 (Critical Findings)

### 선행 필수 작업 (Admin Prerequisites — 코드 외 작업)

1. **카카오 비즈니스 채널 개설** — 사업자등록증 필요, business.kakao.com에서 신청. 알림톡 개발보다 먼저 시작해야 함 (심사 1–7 영업일)
2. **알림톡 템플릿 심사 제출** — 이모지 사용 금지, 70자 이내 권장. 결석 안내·수납 안내·일정 변경 3종 우선 제출
3. **Solapi 계정 등록** — 발신 대행사 계약 (직접 Kakao API 없음)
4. **monthlyFee 데이터 입력** — 현재 전체 0원. 수납 대시보드·자동 매칭 블로킹 요인
5. **Firebase 서비스 계정 생성** — Admin SDK용 (은행 Webhook Worker에 필요)

### 기술 위험 (Technical Risks)

| 위험 | 영향 | 대응 |
|------|------|------|
| Firestore 보안 규칙 없음 | 익명 사용자 전체 읽기 가능 | Phase 1에서 Custom Claims Worker 먼저 배포 후 규칙 적용 |
| saveStudents() 기존 코드 존재 | 데이터 유실 재발 가능 | 이미 throw로 막혀 있음. Phase 1에서 removeEventListener 등 잔여 참조 검색·제거 |
| KV 바인딩 누락 | Rate limiter 완전히 비활성화 상태 | wrangler.toml에 KV namespace 추가 후 배포 |
| UID console.log 26개 이상 | PII 유출 | Phase 1 첫 작업으로 제거 |
| callAnthropic() / Gemini 네이밍 불일치 | 혼란, 잘못된 API 호출 가능 | anthropic.js 내 함수명 정리 |
| studentName Gemini 전송 | AI 데이터 동의 미고지 | anonymize.js 통과 강제 또는 consent 플래그 |

---

## 권장 페이즈 순서 (6 Phases)

### Phase 1 — 보안 기반 (Security Foundation)
**Why first:** 보안 구멍이 열려 있는 상태로 포털을 오픈하면 전체 학생 데이터가 공개됨. 모든 다른 피처보다 선행.

- UID console.log 전체 제거
- `resetSeed` / Admin 전용 버튼 프로덕션 가드 강화
- per-op 트랜잭션 감사 — saveStudents 잔여 참조 확인
- KV namespace 바인딩 → Rate limiter 활성화
- Firebase Custom Claims Worker 배포 (auth.js 토큰 검증 기반)
- Firestore 보안 규칙 배포 (익명 전체 읽기 차단)
- Auth 세션 만료 / localStorage ↔ Firebase 동기화 수리

### Phase 2 — 포털 완성 (Portal Completion)
**Why second:** 보안이 확보된 후 포털을 앱 수준으로 고도화. 학부모가 가장 자주 보는 화면.

- 세션 유지 개선 (sessionStorage + 30일 localStorage)
- 시간표(시간표) 뷰 — lessons[].schedule 기반
- 레슨노트 포털 연결 — 강사 작성 노트 → 학부모 열람
- 연습 가이드 포털 표시 — practice-guide.js Worker 연결
- 수납 현황 표시 (monthlyFee 입력 후)
- 자녀 전환 UX 개선
- 포털 Rate limiting 활성화

### Phase 3 — AI 완성 (AI Completion)
**Why third:** 포털이 안정된 후 AI 품질을 높이면 강사 업무 자동화 효과 극대화.

- callAnthropic/callGemini 네이밍 통일 + anonymize.js 강제 통과
- studentName → 익명화 파이프라인
- 월별 리포트 발송 UI — 강사→학부모 발송 버튼
- 이탈 위험도 → 케어 메시지 초안 생성 → AlimTalk 발송 연동 (Phase 4 후)
- 자연어 쿼리 UI 고도화 — 응답 카드 형식

### Phase 4 — 알림톡 통합 (KakaoTalk AlimTalk)
**Why fourth:** 선행 채널 개설 + 템플릿 심사가 완료된 시점에 코드 연결. Solapi API 연동.

- Cloudflare Worker: `functions/api/notifications/alimtalk.js`
- AlimtalkModal → 실제 Solapi API 연결
- 결석 시 학부모 자동 알림톡 (출결 기록 시 트리거)
- 수납 안내 알림톡 (월초 일괄 발송)
- 일정 변경 알림톡 (schedule-override 저장 시 트리거)
- 발송 상태 추적 (delivered/failed)

### Phase 5 — 수납 자동화 (Payment Automation)
**Why fifth:** monthlyFee 데이터가 입력되고 알림톡이 안정화된 후 은행 연동.

- 수강료 입력 UI — 학생 편집 화면에 monthlyFee 필드 강화
- 수납 현황 대시보드 — 미납 현황, 월별 수납률
- Toss Payments 가상계좌 Webhook Worker — HMAC 검증
- 입금 자동 매칭 — 학생 이름 + 금액 기반 fuzzy 매칭
- 미매칭 입금 리뷰 화면
- 미납 리마인더 자동 발송 (알림톡 연동)

### Phase 6 — 분석 대시보드 고도화 (Analytics Enhancement)
**Why last:** 데이터가 충분히 쌓이고 수납이 자동화된 후 인사이트 레이어 추가.

- 관리자용 매출 추이 차트 (월별, 악기별)
- 강사용 담당 학생 출석률·진도 요약
- 학부모용 자녀 월별 리포트 (출석률 + 레슨노트 요약)
- 데이터 아카이빙 전략 (1MB 한도 대응)

---

## 스택 추가 (New Stack Pieces)

| 모듈 | 기술 | 비고 |
|------|------|------|
| AlimTalk 발신 | Solapi REST API | 발신 대행사 계약 필요 |
| 은행 Webhook | Toss Payments 가상계좌 | HMAC-SHA256 검증 필수 |
| Firestore 보안 | Firebase Custom Claims + Rules | Admin SDK Worker 선행 |
| Rate limiting | Cloudflare KV | wrangler.toml 수정 필요 |
| 포털 세션 | sessionStorage 30일 hybrid | 기존 코드 수리 |

---

## 데이터 부채 (Data Debt)

| 항목 | 현황 | 영향 |
|------|------|------|
| monthlyFee | 전체 0원 | 수납 대시보드·자동 매칭 블로킹 |
| studentName in AI calls | anonymize.js 미통과 | AI 데이터 동의 법적 리스크 |
| console.log UID 노출 | 26개+ | PII 유출 |

---

## 우선순위 결정 근거

1. **보안 먼저** — 학생 77명 PII가 인터넷에 열려 있음. 포털 오픈 전 필수
2. **포털 둘째** — Nick의 #1 우선순위. 학부모 만족도 직결
3. **AI 셋째** — 강사 차별화 가치. 포털 안정 후 연결
4. **알림톡 넷째** — 채널 심사 시간이 길어 병렬로 시작하되 코드는 Phase 4
5. **수납 다섯째** — monthlyFee 데이터 입력 선행 필요
6. **분석 마지막** — 데이터 누적 필요, 다른 모든 것이 안정화된 후
