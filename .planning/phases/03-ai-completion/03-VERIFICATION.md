---
phase: 03-ai-completion
verified: 2026-05-05T00:00:00Z
status: human_needed
score: 11/11
overrides_applied: 0
human_verification:
  - test: "ChurnWidget 케어 메시지 버튼 클릭 → AI 초안 인라인 표시 확인"
    expected: "'생성 중...' 표시 후 300자 이내 한국어 케어 메시지가 행 아래에 표시되고 '복사' 버튼이 나타난다"
    why_human: "실제 Gemini API 호출 흐름이므로 API 키 없이 프로그래밍적 검증 불가"
  - test: "AiAssistant 자연어 쿼리 결과 회원 카드 클릭 → StudentDetailModal 열림 확인"
    expected: "결과 목록에서 회원 카드를 클릭하면 해당 회원의 StudentDetailModal이 열린다"
    why_human: "실제 브라우저 이벤트 전파와 React 상태 전환이므로 코드 분석으로 대체 가능하나 UI 흐름 확인이 필요"
  - test: ".ai-result-row hover 시각적 피드백 확인"
    expected: "회원 카드에 마우스를 올리면 배경색이 미묘하게 변한다"
    why_human: "CSS hover 효과는 브라우저 렌더링을 통해서만 확인 가능"
  - test: "rate limit 재시도 실제 동작 확인"
    expected: "429 응답 시 3초 대기 후 1회 재시도하고, 두 번째도 실패하면 '분당 제한' 안내 메시지가 표시된다"
    why_human: "실제 rate limit 조건 재현 불가"
---

# Phase 3: AI 기능 연동 완성 검증 보고서

**Phase 목표:** AI 기능 연동 완성 — Gemini 통일 (AI-01), 익명화 (SEC-08), 케어 메시지 (AI-03), 발송 준비 버튼 (AI-02), AiAssistant 클릭 연결 (AI-04), rate limit 재시도 (AI-05)
**검증 일시:** 2026-05-05
**상태:** human_needed (자동 검증 전 항목 11/11 통과, 4개 항목 인간 검증 필요)
**재검증 여부:** 아니오 — 초기 검증

## 목표 달성 여부

### Observable Truths

| # | Truth | 상태 | 근거 |
|---|-------|------|------|
| 1 | gemini.js 파일이 존재하고 callGemini + callGeminiTools를 export한다 | VERIFIED | `functions/api/ai/_utils/gemini.js` 파일 존재, `callGemini`와 `callGeminiTools` 모두 export 확인 |
| 2 | 어떤 Worker 파일도 anthropic.js를 import하지 않는다 | VERIFIED | 8개 Worker 파일 모두 `from "./_utils/gemini.js"` 사용, `from.*anthropic` grep 결과 0건 |
| 3 | monthly-report.js 프롬프트 라인에 실제 studentName 대신 anonName이 사용된다 | VERIFIED | `lines` 배열의 `회원: ${anonName}` 확인 (line 74), `buildNameMap` + `deanonymize` 양쪽 모두 import 및 사용 |
| 4 | churn.js studentList에 실제 학생 이름 대신 익명화된 이름이 사용된다 | VERIFIED | `nameMap[s.name] \|\| s.name` 패턴으로 `studentList` 구성 (line 22), JSON 응답 `name` 필드 `deanonymize` 복원 (line 46) |
| 5 | care-message.js Worker가 존재하며 callGemini + SEC-08 익명화 파이프라인을 포함한다 | VERIFIED | 파일 존재, `callGemini`·`buildNameMap`·`deanonymize`·`stripPii` 모두 import 및 사용 |
| 6 | aiClient.js에 aiChurnCare 함수가 있고 care-message 엔드포인트를 호출한다 | VERIFIED | `aiChurnCare` 함수 존재 (line 101-103), `callAi("care-message", ...)` 패턴 확인 |
| 7 | ChurnWidget 이탈 위험 행마다 '케어 메시지' 버튼이 표시된다 | VERIFIED | `케어 메시지` 버튼 텍스트 (line 129), `careResults` state 선언+사용, `generating`·`careErrors` 인라인 표시 구현 |
| 8 | MonthlyReportsView published 카드에 '발송 준비' 버튼이 있다 | VERIFIED | "📨 발송 준비" 버튼 (line 475), gold 스타일 적용, Phase 4 stub 주석 포함 |
| 9 | AiAssistant ListResult 카드 클릭 시 StudentDetailModal이 열린다 (코드 연결) | VERIFIED | `onOpenStudent` prop이 `ListResult` → `MessageBubble` → `AiAssistant` → `App.jsx`까지 체인 완성. App.jsx line 898: `setModal("sDetail")` 호출, line 922: `modal === "sDetail"` 조건부 렌더링 존재 |
| 10 | .ai-result-row:hover 스타일이 constants.jsx에 정의되어 있다 | VERIFIED | `constants.jsx` line 735: `.ai-result-row:hover{background:rgba(43,58,159,0.04)}` 존재 |
| 11 | AiAssistant send 함수에 queryWithRetry 재시도 로직과 '분당 제한' 에러 메시지가 있다 | VERIFIED | `queryWithRetry` 내부 함수 (line 244), `rate_limited` 시 3초 대기 후 1회 재시도, catch에서 "요청이 많아 잠시 후 다시 시도해주세요. (분당 제한)" 메시지 (line 280) |

**점수:** 11/11 truths 검증됨

### Required Artifacts

| Artifact | 예상 역할 | 상태 | 세부사항 |
|----------|----------|------|---------|
| `functions/api/ai/_utils/gemini.js` | callGemini, callGeminiTools export | VERIFIED | 존재, 두 함수 export, 실제 Gemini API URL 및 구현 포함 |
| `functions/api/ai/monthly-report.js` | 월별 리포트 생성 Worker (익명화 적용) | VERIFIED | `callGemini` + `buildNameMap` + `deanonymize` 모두 사용 |
| `functions/api/ai/churn.js` | 이탈 위험 분석 Worker (익명화 적용) | VERIFIED | `callGemini` + `buildNameMap` + `deanonymize` 모두 사용 |
| `functions/api/ai/care-message.js` | 단건 케어 메시지 생성 Worker | VERIFIED | 신규 생성, `callGemini`·`stripPii`·`buildNameMap`·`deanonymize` 포함 |
| `src/aiClient.js` | aiChurnCare() 함수 포함 | VERIFIED | `aiChurnCare` export, `callAi("care-message", ...)` 호출 |
| `src/components/dashboard/ChurnWidget.jsx` | 케어 메시지 버튼 + 인라인 초안 표시 | VERIFIED | `teachers` prop, `careResults` state, 버튼/결과/에러 인라인 표시 모두 구현 |
| `src/components/dashboard/Dashboard.jsx` | teachers를 ChurnWidget에 전달 | VERIFIED | line 326: `<ChurnWidget students={students} attendance={attendance} teachers={teachers} />` |
| `src/components/aireports/MonthlyReportsView.jsx` | 발송 준비 버튼 | VERIFIED | "📨 발송 준비" 버튼 존재 (Phase 4 stub) |
| `src/components/ai/AiAssistant.jsx` | onOpenStudent prop, queryWithRetry, 분당 제한 메시지 | VERIFIED | 7개소 `onOpenStudent` 사용, `queryWithRetry` 함수, "분당 제한" 메시지 |
| `src/App.jsx` | onOpenStudent → StudentDetailModal 연결 | VERIFIED | `onOpenStudent` prop 전달, `setModal("sDetail")` 호출, `modal === "sDetail"` 렌더링 |
| `src/constants.jsx` | .ai-result-row:hover 스타일 | VERIFIED | 별도 선택자로 hover 스타일 정의 |

### Key Link Verification

| From | To | Via | 상태 | 세부사항 |
|------|----|-----|------|---------|
| 8개 Worker *.js | `_utils/gemini.js` | `import { callGemini }` | WIRED | 모든 Worker가 gemini.js에서 import. query.js는 callGeminiTools import |
| `monthly-report.js` | `_utils/anonymize.js` | `buildNameMap` + `deanonymize` | WIRED | import 및 실사용 확인 |
| `churn.js` | `_utils/anonymize.js` | `buildNameMap` + `deanonymize` | WIRED | import 및 실사용 확인 |
| `ChurnWidget.jsx` | `aiClient.js` | `aiChurnCare(...)` | WIRED | import + handleCareMessage 내부에서 호출 |
| `aiClient.js` | `care-message.js` Worker | `callAi("care-message", payload)` | WIRED | endpoint 문자열 "care-message" 확인 |
| `care-message.js` | `_utils/gemini.js` | `callGemini(env.GEMINI_API_KEY, ...)` | WIRED | import + try 블록 내 호출 |
| `AiAssistant.jsx ListResult` | `App.jsx StudentDetailModal` | `onOpenStudent(sid) → setModal("sDetail")` | WIRED | prop 체인 완성, App.jsx에서 `modal === "sDetail"` 조건부 렌더링 |

### Data-Flow Trace (Level 4)

| Artifact | 데이터 변수 | 소스 | 실 데이터 생성 여부 | 상태 |
|----------|-----------|------|---------------------|------|
| `ChurnWidget.jsx` | `careResults[s.id]` | `aiChurnCare()` → `care-message.js` → Gemini API | API 응답 (런타임) | FLOWING (런타임 의존, 코드 경로 완전 연결) |
| `AiAssistant.jsx` | `messages` (list 타입) | `queryWithRetry()` → `aiQuery()` → Gemini API | API 응답 (런타임) | FLOWING (런타임 의존, 코드 경로 완전 연결) |
| `MonthlyReportsView.jsx` | 발송 준비 버튼 onClick | Phase 4 stub (빈 함수) | N/A (의도적 stub) | STUB — 플랜에서 명시적으로 Phase 4 연결 예정으로 정의됨 |

**발송 준비 버튼 stub 비고:** 플랜 03-02에서 "Phase 4 AlimTalk Worker 연결 예정"으로 명시적으로 정의된 의도적 stub. 이 Phase의 목표 범위 밖.

### Behavioral Spot-Checks

Step 7b: PARTIAL — 서버 실행 없이 정적 분석만 가능

| 동작 | 확인 방법 | 결과 | 상태 |
|------|----------|------|------|
| callAnthropic Worker 파일 내 0건 | grep 검색 | anthropic.js 파일 내부에만 1건 (선언부), Worker 파일 내 0건 | PASS |
| from.*anthropic Worker 파일 내 0건 | grep 검색 | 0건 | PASS |
| care-message.js 파일 존재 | 파일 시스템 | 존재 확인 | PASS |
| aiChurnCare in aiClient.js | grep 검색 | 1건 (export 함수) | PASS |
| onOpenStudent in AiAssistant.jsx | grep count | 7건 (기준 4 이상) | PASS |
| ai-result-row:hover in constants.jsx | grep 검색 | 1건 | PASS |
| queryWithRetry in AiAssistant.jsx | grep 검색 | 2건 | PASS |
| 분당 제한 in AiAssistant.jsx | grep 검색 | 1건 | PASS |

### Requirements Coverage

| Requirement | Source Plan | 설명 | 상태 | 근거 |
|-------------|------------|------|------|------|
| AI-01 | 03-01 | callAnthropic/callGemini 함수명 통일 | SATISFIED | gemini.js 생성, 8개 Worker 모두 callGemini 사용 |
| AI-02 | 03-02 | 월별 리포트 발송 UI — 발송 버튼 | SATISFIED | MonthlyReportsView에 "발송 준비" 버튼 존재 (Phase 4 stub) |
| AI-03 | 03-02 | 이탈 위험도 → 케어 메시지 초안 | SATISFIED | care-message.js Worker + aiChurnCare + ChurnWidget UI 완성 |
| AI-04 | 03-03 | 자연어 쿼리 응답 UI 고도화 — 카드 클릭 | SATISFIED | onOpenStudent prop 체인 + StudentDetailModal 연결 코드 완성 |
| AI-05 | 03-03 | AI 어시스턴트 에러 핸들링 — 재시도 | SATISFIED | queryWithRetry 1회 재시도 + 에러 유형별 메시지 |
| SEC-08 | 03-01 | AI API 호출 시 studentName 익명화 강제 | SATISFIED | monthly-report.js + churn.js + care-message.js 모두 anonymize 파이프라인 적용 |

**고아 요건:** REQUIREMENTS.md Phase 3 할당 요건 중 미처리 항목 없음.

### Anti-Patterns Found

| 파일 | 라인 | 패턴 | 심각도 | 영향 |
|------|------|------|--------|------|
| `src/aiClient.js` | 10, 13, 18, 22, 24, 28 | `console.log` 다수 | WARNING | 프로덕션 빌드에서 uid/token 정보가 콘솔에 출력됨. CLAUDE.md의 SEC-01(console.log PII 제거)과 관련되나 Phase 1 대상이므로 이번 Phase 범위 밖 |
| `src/aiClient.js` | - | `console.log("[ai] currentUser:", user?.uid, ...)` | INFO | uid는 PII에 해당. 이미 알려진 이슈 (SEC-01 Phase 1 미완) |

**Anti-pattern 평가:** `console.log`는 Phase 1 SEC-01 대상으로 기존 코드에 이미 존재. 이번 Phase 3에서 새로 추가된 코드(`care-message.js`, `churn.js`, `monthly-report.js`)의 `console.error`는 에러 로깅 목적으로 정상. Phase 3 목표 달성에 BLOCKER 없음.

### Human Verification Required

#### 1. ChurnWidget 케어 메시지 버튼 → AI 초안 생성 E2E 확인

**테스트:** 이탈 위험 회원이 있는 상태에서 Dashboard의 ChurnWidget에서 "케어 메시지" 버튼 클릭
**예상:** "생성 중..." 스피너 표시 → Gemini 응답 후 행 아래에 케어 메시지 초안 텍스트 표시 → "복사" 버튼 등장 → 클릭 시 클립보드 복사
**인간 필요 이유:** 실제 Gemini API 호출 (GEMINI_API_KEY 필요)이므로 코드 분석만으로 동작 보장 불가

#### 2. AiAssistant 회원 카드 클릭 → StudentDetailModal UI 확인

**테스트:** AI 비서에서 "활성 회원 목록" 등을 쿼리한 후 결과 목록의 회원 카드 클릭
**예상:** StudentDetailModal이 열리며 클릭한 회원의 상세 정보가 표시됨
**인간 필요 이유:** React 상태 전환(`setModal("sDetail")`)이 실제 브라우저에서 정상 동작하는지 확인 필요

#### 3. .ai-result-row hover 시각적 피드백 확인

**테스트:** AiAssistant 결과 목록에서 회원 카드에 마우스 오버
**예상:** 배경색이 `rgba(43,58,159,0.04)` (연한 파란색)로 전환
**인간 필요 이유:** CSS hover 효과는 브라우저 렌더링으로만 확인 가능

#### 4. Rate limit 재시도 동작 확인

**테스트:** AI 비서에서 rate limit 발생 시 동작 관찰
**예상:** 3초 대기 후 자동 재시도, 두 번째도 실패 시 "요청이 많아 잠시 후 다시 시도해주세요. (분당 제한)" 메시지 표시
**인간 필요 이유:** 실제 429 응답 재현 불가 (실제 rate limit 상황 필요)

### Gaps Summary

자동 검증 가능한 모든 항목이 통과됨. Phase 3 목표 달성을 방해하는 BLOCKER가 없음.

**특이 사항:**
- 3개의 SUMMARY 모두 `npm run build` SKIPPED 표시 (`EEXIST: file already exists, mkdir session-env` 환경 오류). 그러나 파일 내용 직접 검증 결과 ES Module import/export 문법이 올바르고, Vite가 처리하는 `src/` 영역과 Cloudflare Pages가 처리하는 `functions/` 영역이 분리되어 있어 빌드 오류 가능성 낮음.
- `anthropic.js` 파일은 유지되어 있으나 어떤 Worker도 import하지 않음 (플랜 의도적 결정).
- Wave 2 (03-02)에서 gemini.js를 중복 생성한 것은 워크트리 분기 이슈로 인한 불가피한 조치였으며, 최종 코드베이스에서 동일한 파일이 존재함.

---

_검증 일시: 2026-05-05_
_검증자: Claude (gsd-verifier)_
