---
phase: "03-ai-completion"
plan: "02"
subsystem: "AI Features — Care Message + Monthly Report UI"
tags: ["ai", "dashboard", "churn", "care-message", "monthly-report", "ai-03", "ai-02"]
dependency_graph:
  requires: ["03-01 (gemini.js + anonymize.js + SEC-08 파이프라인)"]
  provides: ["functions/api/ai/care-message.js", "aiChurnCare() in src/aiClient.js", "ChurnWidget 케어 메시지 UI", "MonthlyReportsView 발송 준비 버튼"]
  affects: ["src/components/dashboard/ChurnWidget.jsx", "src/components/dashboard/Dashboard.jsx", "src/components/aireports/MonthlyReportsView.jsx"]
tech_stack:
  added: []
  patterns: ["care-message Worker — buildNameMap→callGemini→deanonymize 단건 파이프라인", "인라인 에러·결과 표시 (window.alert 없음)", "Phase 4 stub 패턴 (AlimTalk 발송 준비 버튼)"]
key_files:
  created:
    - "functions/api/ai/care-message.js"
    - "functions/api/ai/_utils/gemini.js"
  modified:
    - "src/aiClient.js"
    - "src/components/dashboard/ChurnWidget.jsx"
    - "src/components/dashboard/Dashboard.jsx"
    - "src/components/aireports/MonthlyReportsView.jsx"
decisions:
  - "ChurnWidget의 케어 메시지/복사/생성중 상태를 단일 버튼 슬롯으로 구현 — 상태 전이가 명확하고 UI가 간결함"
  - "careResults를 Map 대신 일반 객체 {[studentId]: string}으로 — React state 업데이트 패턴과 자연스럽게 호환"
  - "발송 준비 버튼 onClick은 빈 함수 stub — Phase 4 AlimTalk Worker 연결 전까지 시각적 진입점만 제공"
  - "케어 메시지 버튼은 confirm 없이 바로 실행 — window.confirm 금지 규칙 준수 + UX 단순화"
  - "gemini.js를 이 워크트리에도 포함 — Wave 1이 다른 워크트리에서 실행됐으므로 care-message.js 의존성 충족"
metrics:
  duration: "~20분"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 6
---

# Phase 03 Plan 02: AI-02+AI-03 케어 메시지 Worker + 발송 준비 버튼 Summary

이탈 위험 회원에 대한 원클릭 케어 메시지 초안 생성 흐름 완성 (AI-03): `care-message.js` Cloudflare Worker 신규 생성, `aiChurnCare()` 클라이언트 함수 추가, ChurnWidget에 케어 메시지/생성 중/복사 버튼과 인라인 초안·에러 표시 구현. 월별 리포트 published 카드에 "발송 준비" 버튼 stub 추가 (AI-02, Phase 4 AlimTalk 연결 예정).

## Tasks Completed

### Task 1: care-message.js Worker 신규 생성 + aiClient aiChurnCare 추가

**`functions/api/ai/_utils/gemini.js` 추가 (Wave 1 의존성):**
- 이 워크트리는 Wave 1 이전 main 커밋에서 분기됐으므로 `gemini.js`가 없음
- `callGemini` + `callGeminiTools` 함수를 메인 레포 Wave 1 결과물과 동일하게 작성

**`functions/api/ai/care-message.js` 신규 생성:**
- `callGemini`, `stripPii`, `buildNameMap`, `deanonymize` 모두 import
- SEC-08 익명화 파이프라인 적용: `buildNameMap([name])` → `anonName` → Gemini 전송 → `deanonymize(raw, nameMap)` 복원
- 입력: `{ name, consecutive, rate, score, teacherName }` — `stripPii` 통과 (phone/email 제거)
- 시스템 프롬프트: 학부모 케어 메시지 초안 한국어 300자 이내
- 에러 처리: 429 → `Too Many Requests`, 기타 → err(500) — window.alert 없음

**`src/aiClient.js` 수정:**
- `aiChurnCare({ name, consecutive, rate, score, teacherName })` 함수 추가
- `callAi("care-message", payload)` 호출 → `{ result: string }` 반환

### Task 2: ChurnWidget 케어 메시지 버튼 + MonthlyReportsView 발송 준비 버튼

**`src/components/dashboard/ChurnWidget.jsx` 수정:**
- props 서명: `{ students, attendance }` → `{ students, attendance, teachers }` 추가
- `import { aiChurnCare } from "../../aiClient.js"` 추가
- state 추가: `generating` (Set), `careResults` ({[id]: string}), `careErrors` ({[id]: string})
- `handleCareMessage(student)`: 강사 조회 → `aiChurnCare()` 호출 → state 업데이트
- 각 이탈 위험 행 우측에 상태 기반 버튼 슬롯:
  - 생성 전: "케어 메시지" 버튼 (인라인 border 스타일)
  - 생성 중: "생성 중…" 텍스트
  - 생성 완료: "복사" 버튼 (`navigator.clipboard.writeText`)
- 행 아래 인라인 영역: 에러 메시지 (red) + 초안 텍스트 (hanji 배경)
- window.confirm/window.alert 완전 없음 — 버튼 클릭 즉시 실행

**`src/components/dashboard/Dashboard.jsx` 수정:**
- `<ChurnWidget ... />` → `<ChurnWidget ... teachers={teachers} />` — teachers prop 전달
- Dashboard가 이미 teachers prop을 받으므로 추가 변경 없음

**`src/components/aireports/MonthlyReportsView.jsx` 수정:**
- published 카드 버튼 영역에 "📨 발송 준비" 버튼 stub 추가
- 스타일: `gold-lt` 배경 + `gold-dk` 텍스트 + `#FCD34D` border — 구별되는 강조색
- onClick은 Phase 4 AlimTalk Worker 연결 예정 주석 포함

## Deviations from Plan

**[Rule 3 - Blocking] gemini.js 워크트리 추가**
- **발견 시점:** Task 1 실행 중
- **이슈:** 이 워크트리 브랜치는 Wave 1(03-01) 이전 main 커밋에서 분기됐으므로 `_utils/gemini.js`가 없었음. `care-message.js`가 `callGemini`를 import하므로 실행 불가.
- **수정:** Wave 1 결과물과 동일한 `gemini.js` 파일을 이 워크트리에도 추가
- **파일:** `functions/api/ai/_utils/gemini.js`

## Known Stubs

- **MonthlyReportsView "발송 준비" 버튼** (`src/components/aireports/MonthlyReportsView.jsx`): onClick이 빈 함수. Phase 4에서 AlimTalk Worker와 연결 예정. 플랜에서 의도적 stub으로 명시됨.

## Threat Flags

None — 새로운 네트워크 엔드포인트 `care-message.js`는 기존 `_middleware.js`의 Firebase Auth 검증 및 RATE_LIMIT_KV(20 req/min/user) 보호를 상속받으므로 추가 위협 표면 없음.

## Self-Check

### Files created/modified:
- `functions/api/ai/_utils/gemini.js` — 신규 생성 (Wave 1 의존성 충족)
- `functions/api/ai/care-message.js` — 신규 생성. `callGemini` 1건, `buildNameMap` + `deanonymize` 각 1건 포함
- `src/aiClient.js` — `aiChurnCare` 함수 추가, `callAi("care-message", ...)` 패턴 포함
- `src/components/dashboard/ChurnWidget.jsx` — `aiChurnCare` import + 사용, `careResults` state 선언 + 사용 다수, "케어 메시지" 버튼 텍스트 포함
- `src/components/dashboard/Dashboard.jsx` — `teachers={teachers}` prop 전달
- `src/components/aireports/MonthlyReportsView.jsx` — "발송 준비" 버튼 추가

### Verification checks:
- `callGemini` care-message.js 내 1건 ✓
- `buildNameMap` + `deanonymize` care-message.js 내 각 1건 ✓
- `aiChurnCare` aiClient.js 내 1건 ✓
- `callAi("care-message"` 패턴 aiClient.js 내 포함 ✓
- `aiChurnCare` ChurnWidget.jsx 내 import + 사용 ✓
- `careResults` ChurnWidget.jsx 내 다수 ✓
- "케어 메시지" 버튼 ChurnWidget.jsx 내 1건 ✓
- window.confirm/window.alert ChurnWidget.jsx 내 0건 ✓
- `teachers` Dashboard.jsx ChurnWidget prop 전달 ✓
- "발송 준비" MonthlyReportsView.jsx 내 1건 ✓

### Build status:
Bash 도구 환경 오류 (`EEXIST: file already exists, mkdir session-env`)로 `npm run build` 실행 불가 (Wave 1과 동일한 환경 제약). 모든 파일은 올바른 ES Module 문법으로 작성됐으며, import/export 경로가 기존 코드베이스 패턴과 일치함. `functions/`는 Cloudflare Pages 별도 처리, `src/`는 Vite 빌드. ChurnWidget의 React state/hook 사용이 모두 기존 코드베이스와 호환됨.

## Self-Check: PARTIAL
- 파일 생성/수정 검증: PASSED
- grep 패턴 검증: PASSED
- npm run build: SKIPPED (Bash 도구 환경 오류 — Wave 1과 동일한 제약)
