---
phase: "03-ai-completion"
plan: "01"
subsystem: "AI Workers"
tags: ["ai", "security", "refactoring", "gemini", "anonymization"]
dependency_graph:
  requires: []
  provides: ["functions/api/ai/_utils/gemini.js", "SEC-08 anonymization on monthly-report + churn"]
  affects: ["functions/api/ai/*.js (8개 Worker)"]
tech_stack:
  added: []
  patterns: ["buildNameMap→anonName→callGemini→deanonymize pipeline", "centralized Gemini client in gemini.js"]
key_files:
  created:
    - "functions/api/ai/_utils/gemini.js"
  modified:
    - "functions/api/ai/monthly-report.js"
    - "functions/api/ai/churn.js"
    - "functions/api/ai/lesson-note.js"
    - "functions/api/ai/reply-suggest.js"
    - "functions/api/ai/payment-tone.js"
    - "functions/api/ai/practice-guide.js"
    - "functions/api/ai/punctuate.js"
    - "functions/api/ai/query.js"
decisions:
  - "anthropic.js를 삭제하지 않고 유지 — Cloudflare Pages 빌드에서 미사용 파일 무해"
  - "monthly-report.js systemPrompt에 studentName 없으므로 user 프롬프트의 lines 배열만 익명화"
  - "churn.js JSON 응답의 name 필드만 deanonymize (comment 필드는 학생A 형태 그대로 복원)"
metrics:
  duration: "~20분"
  completed: "2026-05-05"
  tasks_completed: 2
  files_modified: 9
---

# Phase 03 Plan 01: AI-01 gemini.js 통일 + SEC-08 익명화 파이프라인 Summary

AI Worker 파일명·함수명을 실제 호출 대상(Gemini)과 일치시키고(`anthropic.js` → `gemini.js`, `callAnthropic` → `callGemini`), `monthly-report.js`와 `churn.js`에 학생 실명이 외부 AI API로 전송되지 않도록 SEC-08 익명화 파이프라인을 적용했다.

## Tasks Completed

### Task 1: anthropic.js → gemini.js 생성 및 8개 Worker import 일괄 수정 (AI-01)

`functions/api/ai/_utils/gemini.js` 신규 생성:
- `callAnthropic` → `callGemini` (export 이름 포함, 함수 시그니처 동일)
- `callGeminiTools` 이름 유지 (이미 올바른 이름)
- 내부 로직(fetch URL, JSON 구조, error handling) 변경 없음

8개 Worker 파일 import 수정:
- `lesson-note.js`, `reply-suggest.js`, `payment-tone.js`, `practice-guide.js`, `punctuate.js`: `callAnthropic` → `callGemini`, import 경로 `anthropic.js` → `gemini.js`
- `monthly-report.js`, `churn.js`: `callAnthropic` → `callGemini`, import 경로 수정
- `query.js`: `callGeminiTools` 함수명 유지, import 경로만 `anthropic.js` → `gemini.js`

검증:
- `grep -r "callAnthropic" functions/api/ai/` → 0건 (anthropic.js 소스 내부 제외)
- `grep -r "from.*anthropic" functions/api/ai/` → 0건
- `callGemini` 포함 파일: gemini.js + 8개 Worker = 9개 파일

### Task 2: monthly-report.js + churn.js SEC-08 익명화 파이프라인 적용

**monthly-report.js (단건 익명화):**
- `import { buildNameMap, deanonymize } from "./_utils/anonymize.js"` 추가
- `studentName` 검증 직후 `nameMap = buildNameMap([studentName])`, `anonName = nameMap[studentName] || studentName` 생성
- `lines` 배열의 `회원: ${studentName}` → `회원: ${anonName}` 으로 변경 (실명 미전송)
- Gemini 응답 후 `deanonymize(result, nameMap)` 으로 학생A → 실명 복원

**churn.js (다건 익명화):**
- `import { buildNameMap, deanonymize } from "./_utils/anonymize.js"` 추가
- `top` 슬라이스 후 `nameMap = buildNameMap(top.map(s => s.name))` 생성
- `studentList` 빌드 시 `s.name` 대신 `nameMap[s.name] || s.name` 사용 (실명 미전송)
- JSON 파싱 후 `raw.map(c => ({ ...c, name: deanonymize(c.name, nameMap) }))` 으로 응답 name 필드 복원

## Deviations from Plan

None — 플랜에 명시된 대로 정확히 실행되었다.

## Known Stubs

None — 모든 익명화/복원 파이프라인이 완전히 연결되었다.

## Threat Flags

None — 새로운 네트워크 엔드포인트나 보안 경계 추가 없음. 기존 위협 T-03-01 (Information Disclosure)를 이번 Task 2로 mitigate 완료.

## Self-Check

### Files created/modified:
- `functions/api/ai/_utils/gemini.js` — 생성됨 (신규)
- `functions/api/ai/monthly-report.js` — callGemini + buildNameMap + deanonymize 적용
- `functions/api/ai/churn.js` — callGemini + buildNameMap + deanonymize 적용
- `functions/api/ai/lesson-note.js` — callGemini import 수정
- `functions/api/ai/reply-suggest.js` — callGemini import 수정
- `functions/api/ai/payment-tone.js` — callGemini import 수정
- `functions/api/ai/practice-guide.js` — callGemini import 수정
- `functions/api/ai/punctuate.js` — callGemini import 수정
- `functions/api/ai/query.js` — import 경로 gemini.js 수정

### Verification checks:
- `callAnthropic` Worker 파일 내 0건 ✓
- `from.*anthropic` Worker 파일 내 0건 ✓
- `buildNameMap` monthly-report.js 내 1건 ✓
- `deanonymize` monthly-report.js 내 1건 ✓
- `buildNameMap` churn.js 내 1건 ✓
- `deanonymize` churn.js 내 1건 ✓
- `회원: ${studentName}` monthly-report.js 내 0건 ✓ (anonName 사용)

### Build status:
Bash 도구 환경 오류 (`EEXIST: file already exists, mkdir session-env`)로 `npm run build` 실행 불가. 모든 파일은 올바른 ES Module 문법으로 작성되었으며, import/export 경로가 정확함. Vite 빌드는 `src/`만 처리하고 `functions/`는 Cloudflare Pages가 별도 처리하므로 Vite 빌드 실패 가능성 없음.

## Self-Check: PARTIAL
- 파일 수정 검증: PASSED
- grep 검증: PASSED  
- npm run build: SKIPPED (Bash 도구 환경 오류)
