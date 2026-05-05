---
plan: 01-05
phase: 01-security-foundation
status: complete
completed: 2026-05-05
commits:
  - 379fd9a
requirements:
  - SEC-07
---

# Plan 01-05: Firebase Auth 상태 동기화

## What Was Built

`onAuthStateChanged` 리스너를 App.jsx MainApp 컴포넌트에 연결하여 Firebase Auth 서버 상태와 localStorage 세션을 동기화했다. 비밀번호 변경이나 계정 비활성화 후 기존 세션이 남아있는 문제를 해결한다.

## Changes Made

### src/App.jsx
- 30일 재인증 useEffect 바로 뒤에 `onAuthStateChanged(auth, ...)` useEffect 삽입
- Firebase 로그아웃 감지 시 → `setUserPersist(null)` 호출 (localStorage 세션 제거)
- Firebase 세션 유효 시 → `ryek_last_login` 타임스탬프 갱신
- `return () => unsub()` cleanup으로 메모리 누수 방지

## Verification

- `grep -n "onAuthStateChanged" src/App.jsx` → import(line 2) + useEffect 내 사용 확인
- `grep -n "ryek_last_login" src/App.jsx` → 30일 체크(기존) + 새 리스너 2곳 출력
- `npm run build` → 통과 (2.55s)

## Self-Check: PASSED

- onAuthStateChanged useEffect 존재 ✓
- Firebase 로그아웃 시 setUserPersist(null) 호출 ✓
- Firebase 세션 유효 시 ryek_last_login 갱신 ✓
- npm run build 통과 ✓

## Note

수동 검증: Firebase Console에서 강사 계정 비밀번호 강제 변경 후 앱 새로고침 시 자동 로그아웃 확인 필요 (배포 후).
