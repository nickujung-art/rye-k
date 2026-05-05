---
phase: 02-portal-completion
plan: "04"
subsystem: portal-ai
tags: [ai, firebase, portal, practice-guide]
dependency_graph:
  requires: [02-03]
  provides: [getPortalIdToken, practice-guide-ui]
  affects: [src/firebase.js, src/components/portal/PublicPortal.jsx]
tech_stack:
  added: []
  patterns: [anonymous-firebase-token, inline-error-display, temporary-state]
key_files:
  created: []
  modified:
    - src/firebase.js
    - src/components/portal/PublicPortal.jsx
decisions:
  - "notes 탭 이번달 요약 헤더 아래, 레슨노트 목록 위에 버튼 배치 — 레슨노트가 있을 때만 렌더"
  - "notes[0]을 최신 레슨노트로 사용 (내림차순 정렬 기준)"
  - "catch 절에서 error 변수 미사용으로 catch 인자 생략 (ESLint-safe)"
metrics:
  duration: "15분"
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_modified: 2
---

# Phase 2 Plan 04: 포털 연습 가이드 생성 버튼 + Firebase Token 연결 Summary

Firebase anonymous token 획득 helper(`getPortalIdToken`) export와 포털 레슨노트 탭 연습 가이드 생성 UI(버튼 + 결과 state + 인라인 오류)를 `/api/ai/practice-guide` Worker와 최소 연결로 완성.

## Tasks Completed

| Task | Name | Files |
|------|------|-------|
| 1 | firebase.js getPortalIdToken export 추가 | src/firebase.js |
| 2 | PublicPortal.jsx notes 탭 연습 가이드 버튼 + 결과 state | src/components/portal/PublicPortal.jsx |

## Changes Made

### Task 1: firebase.js

`auth.currentUser`에서 `user.getIdToken()`을 호출해 anonymous Firebase 사용자의 ID token을 반환하는 `getPortalIdToken()` async 함수를 파일 끝(기존 export 블록 앞)에 추가. 기존 `auth` 인스턴스(`const auth = getAuth(app)`)를 재사용하여 추가 import 없음.

### Task 2: PublicPortal.jsx

세 가지 수정:

1. **import 확장**: `getPortalIdToken`을 firebase.js import 목록에 추가.
2. **state 3개 추가** (`showSiblingModal` 선언 직후):
   - `practiceGuideResult` (null) — AI 응답 저장
   - `practiceGuideLoading` (false) — 버튼 비활성화 제어
   - `practiceGuideErr` ("") — 인라인 오류 메시지
3. **notes 탭 버튼 삽입**: 이번달 요약 헤더 끝, 레슨노트 목록 앞에. `notes.length > 0`일 때만 렌더. 클릭 시 `getPortalIdToken()` → `POST /api/ai/practice-guide` 호출. 응답 `data.body || data.result`를 `practiceGuideResult`에 저장. 오류는 `.form-err` 클래스 인라인 div로 표시.

## Security Notes (Threat Model 반영)

- `practiceGuideResult`는 React JSX `{practiceGuideResult}` 렌더 — React 자동 이스케이프 적용 (T-02-04-03 mitigate 충족)
- `dangerouslySetInnerHTML` 미사용 확인
- `window.alert`/`window.confirm` 미사용 확인 (CLAUDE.md 규칙 충족)
- loading state로 버튼 비활성화 → 반복 호출 방지 (T-02-04-04 mitigate 충족)
- studentName/ID 미전송, instrument + lessonNote 내용만 Worker에 전달 (T-02-04-02 부분 mitigate)

## Deviations from Plan

### Auto-fixed Issues

None — 플랜 그대로 실행.

### Environment Constraint

**Bash 툴 EEXIST 버그**: 이 실행 환경에서 모든 Bash 명령이 `EEXIST: file already exists, mkdir '...\session-env\...'` 오류로 실패. `npm run build` 실행 불가. git 커밋 실행 불가.

- 파일 수정은 Edit 툴로 완전히 완료됨
- 빌드 검증 및 커밋은 Bash 툴 복구 후 또는 메인 에이전트에서 수행 필요
- 코드 구문 검증: Grep으로 모든 acceptance criteria 항목 수동 확인 완료

## Known Stubs

없음. 이 플랜의 목적은 "임시 state에 결과 표시"이며 Phase 3에서 student 객체 저장 예정 — 의도된 설계.

## Acceptance Criteria 수동 검증

| 항목 | 결과 |
|------|------|
| `grep "getPortalIdToken" src/firebase.js` → export 선언 | PASS (line 79) |
| `grep "getIdToken" src/firebase.js` → user.getIdToken() | PASS (line 83) |
| `grep "getPortalIdToken" PublicPortal.jsx` → import + onClick | PASS (line 3, 1494) |
| `grep "practiceGuideResult" PublicPortal.jsx` → state + render | PASS (line 516, 1524, 1527) |
| `grep "practice-guide" PublicPortal.jsx` → fetch URL | PASS (line 1496) |
| `grep "window.alert\|window.confirm" PublicPortal.jsx` → 없음 | PASS |
| `grep "dangerouslySetInnerHTML" PublicPortal.jsx` → 없음 | PASS |

## Self-Check: PARTIAL

- [x] 수정 파일 존재: src/firebase.js, src/components/portal/PublicPortal.jsx
- [x] 코드 내용 검증 (Grep): 모든 acceptance criteria 충족
- [ ] npm run build: Bash 툴 EEXIST 버그로 실행 불가 — 메인 에이전트에서 수행 필요
- [ ] git 커밋: Bash 툴 EEXIST 버그로 실행 불가 — 메인 에이전트에서 수행 필요
