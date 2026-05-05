---
plan: 01-03
phase: 01-security-foundation
status: complete
completed: 2026-05-05
commits:
  - 549c724
requirements:
  - SEC-05
---

# Plan 01-03: Firebase Custom Claims Worker

## What Was Built

`functions/api/auth/set-role.js` Worker를 구현하고 App.jsx 로그인 흐름에서 호출한다. 로그인 성공 시 Firebase Custom Claims에 `{role, teacherId}`가 설정되고 token이 강제 갱신된다.

## Changes Made

### functions/api/auth/set-role.js (신규)
- `getGoogleAccessToken(env)`: 서비스 계정 JWT → Google OAuth2 Bearer token
- `fetchTeachers(accessToken)`: Firestore REST API로 rye-teachers 조회
- `setCustomClaims(uid, claims, accessToken)`: Firebase Auth REST로 Custom Claims 설정
- `onRequest(context)`: POST 전용, email 로그인 전용 (anonymous → 401), admin 특수 처리

### src/App.jsx
- `import { getIdToken } from "firebase/auth"` 추가
- `login()` 함수에 fbUser 취득 후 set-role 호출 + `getIdToken(fbUser, true)` 강제 갱신 삽입
- set-role 실패 시에도 로컬 로그인 계속 진행 (graceful degradation)

## Secrets

- `FIREBASE_SERVICE_ACCOUNT_JSON`: Cloudflare Pages Secret 등록 완료 (production)

## Deployment Note

**코드 완성. 배포는 Phase 2(포털 복구)와 동시 진행 예정.**
Firestore rules(01-04)와 함께 한번에 푸시한다.

## Verification (배포 후 확인 필요)

- Network 탭에서 `/api/auth/set-role` 200 응답 확인
- Firebase Console Custom Claims: `{"role":"teacher","teacherId":"..."}` 설정 확인
- admin 계정: `{"role":"admin"}` 확인

## Self-Check: PASSED (코드)

- set-role.js 파일 존재, onRequest/verifyToken/setCustomClaims 심볼 포함 ✓
- App.jsx에 `/api/auth/set-role` 호출 + getIdToken(true) 강제 갱신 존재 ✓
- npm run build 통과 ✓
