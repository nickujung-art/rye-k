---
phase: "03-ai-completion"
plan: "03"
subsystem: "AI Features — ListResult 클릭 연결 + 재시도 에러 처리"
tags: ["ai", "ux", "error-handling", "ai-04", "ai-05"]
dependency_graph:
  requires: ["03-02 (AiAssistant 기본 구조, care-message Worker)"]
  provides: ["AiAssistant onOpenStudent prop", "ListResult 클릭 → StudentDetailModal", "rate_limited 재시도 1회 로직", "에러 메시지 개선"]
  affects:
    - "src/components/ai/AiAssistant.jsx"
    - "src/App.jsx"
    - "src/constants.jsx"
tech_stack:
  added: []
  patterns: ["onOpenStudent prop 패턴 — AiAssistant → App.jsx state bridge", "queryWithRetry 내부 함수 — 재시도 헬퍼를 send() 클로저 내부에 격리"]
key_files:
  created: []
  modified:
    - "src/components/ai/AiAssistant.jsx"
    - "src/App.jsx"
    - "src/constants.jsx"
decisions:
  - "ListResult의 클릭 핸들러를 onClick={onOpenStudent ? () => onOpenStudent(s.id) : undefined}로 조건부 설정 — onOpenStudent 없는 경우에도 안전"
  - "queryWithRetry를 send() 내부 함수로 선언 — 외부로 노출할 필요 없는 단순 재시도 로직이므로 클로저 격리가 적절"
  - "catch 블록에서 e.message 기반 분기 메시지 — rate_limited / ai_disabled / 기타 세 가지 경우 처리"
  - "constants.jsx의 .ai-result-row에 cursor:default + transition 추가, :hover는 별도 선택자로 신규 추가 — 기존 클래스 내부 수정 최소화"
metrics:
  duration: "~10분"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 3
---

# Phase 03 Plan 03: AI-04+AI-05 ListResult 클릭 연결 + 재시도 에러 처리 Summary

AiAssistant 자연어 쿼리 결과 카드에 클릭 인터랙션을 추가하여 StudentDetailModal로 직접 이동 가능하게 함 (AI-04). 429 rate limit 에러 시 3초 대기 후 1회 자동 재시도 + 에러 유형별 사용자 메시지 개선 (AI-05).

## Tasks Completed

### Task 1: AiAssistant onOpenStudent prop + ListResult 클릭 + AI-05 재시도 에러 처리

**`src/components/ai/AiAssistant.jsx` 수정:**

- `ListResult({ data, onOpenStudent })` — onOpenStudent prop 추가. 각 카드에 `onClick={onOpenStudent ? () => onOpenStudent(s.id) : undefined}`, `style={onOpenStudent ? {cursor:"pointer"} : undefined}` 조건부 적용
- `MessageBubble({ msg, onOpenStudent })` — onOpenStudent prop 추가. `<ListResult ... onOpenStudent={onOpenStudent}/>` 전달
- `AiAssistant({ ..., onOpenStudent })` — 컴포넌트 시그니처에 onOpenStudent 추가
- `messages.map(msg => <MessageBubble key={msg.id} msg={msg} onOpenStudent={onOpenStudent}/>)` — MessageBubble에 prop 전달
- `send()` 함수 내 `queryWithRetry` 내부 함수 추가: rate_limited 에러 시 3초 대기 후 1회 재시도, 두 번째 실패 시 에러 전파
- catch 블록: `e.message === "rate_limited"` → "요청이 많아 잠시 후 다시 시도해주세요. (분당 제한)", `e.message === "ai_disabled"` → 비활성화 안내, 기타 → 기존 메시지

### Task 2: App.jsx onOpenStudent 연결 + constants.jsx hover 스타일

**`src/App.jsx` 수정:**
- `<AiAssistant ... />` 호출에 `onOpenStudent` prop 추가:
  ```js
  onOpenStudent={(sid) => {
    const s = students.find(st => st.id === sid);
    if (s) { setSelected(s); setModal("sDetail"); }
  }}
  ```
- `students.find(st => st.id === sid)` — `s` 변수 충돌 방지를 위해 내부 변수명 `st` 사용
- `if (s)` guard — id 미발견 시 모달 비오픈

**`src/constants.jsx` 수정:**
- `.ai-result-row` 클래스에 `cursor:default;transition:background 0.1s` 추가
- `.ai-result-row:hover{background:rgba(43,58,159,0.04)}` 신규 선택자 추가

## Deviations from Plan

None — 플랜 명세 그대로 실행됨.

## Known Stubs

None — 이 플랜의 모든 기능이 완전히 구현됨.

## Threat Flags

None — 이 변경은 클라이언트 내부 이벤트 전달(onOpenStudent)과 CSS hover 스타일만 포함하며, 새로운 네트워크 엔드포인트나 신뢰 경계 변경 없음.

## Self-Check

### 파일 수정 검증:
- `src/components/ai/AiAssistant.jsx` — onOpenStudent 7개소 (ListResult prop, ListResult onClick, ListResult style, MessageBubble prop, MessageBubble ListResult 전달, AiAssistant 시그니처, messages.map MessageBubble 전달) ✓
- `src/App.jsx` — onOpenStudent 1개소 (AiAssistant prop 전달, setModal("sDetail") 포함) ✓
- `src/constants.jsx` — ai-result-row:hover 1개소 ✓

### grep 패턴 검증:
- `onOpenStudent` in AiAssistant.jsx: 7건 (기준 4 이상) ✓
- `queryWithRetry` in AiAssistant.jsx: 2건 ✓
- `rate_limited` in AiAssistant.jsx: 2건 ✓
- `분당 제한` in AiAssistant.jsx: 1건 ✓
- `onOpenStudent` in App.jsx: 1건 ✓
- `sDetail` in App.jsx AiAssistant 내부: 1건 ✓
- `ai-result-row:hover` in constants.jsx: 1건 ✓
- `window.confirm` / `window.alert` in AiAssistant.jsx: 0건 ✓

### 빌드 상태:
Bash 도구 환경 오류 (`EEXIST: file already exists, mkdir session-env`)로 `npm run build` 실행 불가 (Wave 1, Wave 2와 동일한 환경 제약). 모든 파일은 올바른 JSX/ES Module 문법으로 작성됨. import/export 경로가 기존 코드베이스 패턴과 일치. React hook/prop 사용 패턴이 기존 컴포넌트와 동일.

## Self-Check: PARTIAL
- 파일 생성/수정 검증: PASSED
- grep 패턴 검증: PASSED
- npm run build: SKIPPED (Bash 도구 환경 오류 — Wave 1, Wave 2와 동일한 제약)
- window.confirm/alert 미사용: PASSED
