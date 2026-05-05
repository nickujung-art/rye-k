---
plan: 01-01
phase: 01-security-foundation
status: complete
completed: 2026-05-05
commits:
  - bd2a5f4
  - a48f9b7
  - d309b0c
requirements:
  - SEC-01
  - SEC-02
  - SEC-03
---

# Plan 01-01: Console PII 로그 제거 + DEV Guard + SEC-03 감사

## What Was Built

프로덕션 빌드에서 Firebase UID, 토큰 길이, 전화번호가 브라우저 DevTools에 노출되지 않도록 console.log/warn을 제거하고, resetSeed 함수를 개발 전용으로 제한했다.

## Changes Made

### src/aiClient.js (SEC-01)
- `console.log("[ai] currentUser:", ...)` 제거 — Firebase UID, isAnonymous 노출 차단
- `console.log("[ai] anon signin:", ...)` 제거 — 익명 UID 노출 차단
- `console.warn("[ai] no user after anon")` 제거 — 단순 흐름 로그
- `console.log("[ai] token len:", ...)` 제거 — token 길이 노출 차단
- `console.error` 2개(anon failed, getIdToken failed) 유지

### src/App.jsx (SEC-01, SEC-02, SEC-03)
- `console.log("Migrated studentCodes for", ...)` 제거 — 마이그레이션 로그
- `console.log("[Recovery] ${final.length}명 복구 완료 ...")` 제거 — 복구 완료 로그
- `console.warn("Firebase Auth failed, ...")` + if 블록 제거 — 불필요한 경고 제거
- `resetSeed` 함수를 `if (import.meta.env.DEV) { ... } else { throw new Error(...) }` 패턴으로 래핑 (SEC-02)
- `saveStudents` 감사: throw-guard 정의 1줄만 존재, 활성 호출 경로 없음 확인 (SEC-03)

### src/utils.js (SEC-01)
- `sendAligoMessage`: `targets` 배열과 `console.log` 제거 — 전화번호 목록 노출 차단
- 파라미터 `targetType`, `students` → `_targetType`, `_students` (Phase 4 AlimTalk 연동 보존)

## Verification

- `grep -rn "console.log|console.warn" src/aiClient.js src/App.jsx src/utils.js` → 0줄
- `grep -n "import.meta.env.DEV" src/App.jsx` → resetSeed DEV guard 포함
- `grep -n "saveStudents" src/App.jsx` → throw-guard 정의 1줄만 출력
- `npm run build` → 통과 (2.72s, 1085KB → 273KB gzip)

## Self-Check: PASSED

모든 must_haves 충족:
- 프로덕션 빌드의 DevTools Console에서 Firebase UID, 토큰 길이, 전화번호 미출력 ✓
- resetSeed DEV guard 적용 — 프로덕션 번들에서 실행 불가 ✓
- saveStudents throw-guard 정의 1줄만 존재, 다른 호출 경로 없음 ✓
