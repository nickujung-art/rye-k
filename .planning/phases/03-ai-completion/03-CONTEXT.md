# Phase 3: AI 완성 — Context

**Gathered:** 2026-05-05
**Status:** Ready for planning
**Source:** discuss-phase (chat)

<domain>
## Phase Boundary

강사가 월별 리포트를 생성·발송할 수 있고, 이탈 위험 회원에게 케어 메시지 초안을 AI가 생성하며, 자연어 질의로 학생·출결 데이터를 카드 형식으로 조회할 수 있다. AI API 호출 시 PII는 anonymize.js를 통해 익명화된다.

</domain>

<decisions>
## Implementation Decisions

### AI 모델 전략
- Gemini 2.5 Flash 단일 모델 유지 (Google AI Studio 무료 티어)
- 77명 규모: 월 ~210K 토큰 예상 → 무료 티어(1M/일) 21% 수준, 추가 모델 불필요
- 프롬프트 캐싱 적용으로 반복 호출 비용 절감

### AI 파일명·함수명 통일 (AI-01)
- 기존 `anthropic.js` → `gemini.js`로 이름 정리
- 함수명 `callGemini`로 통일
- 모든 AI Worker 엔드포인트 경로: `functions/api/ai/` 하위 유지

### PII 익명화 — SEC-08
- `anonymize.js` 유틸 생성: studentName → `student_XXXX` (ID 4자리 해시)
- Gemini로 전송되는 모든 프롬프트는 반드시 anonymize() 통과
- Nick 결정: 보안은 알아서 안전하게 구현

### 월별 리포트 발송 — AI-02
- Phase 3: 리포트 생성 + "발송 준비" 버튼 UI 구현
- Phase 4 AlimTalk Worker 완성 후 실제 발송 연결 (stub 방식)
- 리포트 저장: Firestore `rye-students[id].monthlyReports[]` 또는 별도 `rye-ai-reports` 키

### 이탈 위험 케어 메시지 — AI-03
- 진입점: 기존 대시보드 "이탈 위험 회원" 박스에 "케어 메시지 초안 생성" 버튼 추가
- 버튼 클릭 → AI가 초안 생성 → 알림톡 발송 모달(AlimtalkModal)로 연결
- Phase 4 전까지는 초안 생성 + 복사 버튼까지만 (실제 발송은 Phase 4)

### 자연어 쿼리 UI — AI-04
- 카드 형식 결과: 학생 이름 + 주요 수치 + 클릭 시 StudentDetailModal 이동
- 기존 AI 어시스턴트 텍스트 응답 위에 카드 레이어 추가
- Claude 재량: 쿼리 파싱 → 의도 분류 → 카드/텍스트 혼합 렌더링

### AI 응답 품질 — AI-05
- 프롬프트 튜닝: 한국어 출력 강제, 학생 맥락(출석률, 과목, 레슨노트) 주입
- 에러 핸들링: rate limit → 재시도 1회 + 사용자 안내 메시지

### Claude의 재량
- anonymize.js 해시 알고리즘 선택 (단방향, 결정론적)
- 카드 UI 컴포넌트 세부 디자인 (CSS-in-JS, 기존 패턴 준수)
- Worker 파일 분리 구조

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 AI 구현
- `src/App.jsx` — AI 어시스턴트 UI, naturalLanguageQuery 함수 위치
- `src/components/analytics/AnalyticsView.jsx` — 이탈 위험 회원 박스, AI 리포트 뷰
- `src/components/updates/SystemNewsView.jsx` — 참고용 (AI 무관)

### Cloudflare Workers (AI 엔드포인트)
- `functions/api/ai/` — 기존 Worker 파일 위치 (practice-guide.js 등)
- `wrangler.toml` — KV, 환경변수 바인딩 확인 필수

### 프로젝트 규칙
- `CLAUDE.md` — saveStudents 금지, window.confirm 금지, CSS-in-JS 패턴
- `src/constants.jsx` — CSS 문자열 위치 (외부 CSS 파일 없음)

### Phase 2 결과물 (참고)
- `src/firebase.js` — getPortalIdToken() (Phase 2에서 추가됨)
- `src/components/portal/PublicPortal.jsx` — practiceGuideResult 패턴 참고

</canonical_refs>

<specifics>
## Specific Ideas

- 이탈 위험 기준: 출석률 60% 미만 OR 최근 30일 레슨노트 없음 (기존 로직 있으면 재사용)
- 케어 메시지 초안: 학생명(익명화) + 결석 패턴 + 담당 강사명 기반 생성
- 자연어 예시 쿼리: "이번 달 결석 3회 이상 학생", "홍길동 출석률", "미납 학생 목록"
- 월별 리포트 포털 표시: PublicPortal.jsx home 탭에 이미 `aiReports` 렌더링 있음 (Wave 3에서 확인)

</specifics>

<deferred>
## Deferred Ideas

- 실제 AlimTalk 발송 (Phase 4 의존)
- 월별 리포트 자동 스케줄링 (Cron Worker) — Phase 4 이후
- 자연어 쿼리 결과 저장/히스토리 — Phase 6

</deferred>

---

*Phase: 03-ai-completion*
*Context gathered: 2026-05-05 via discuss-phase (chat)*
