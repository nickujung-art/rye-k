# VITE_AUTH_SALT 운영 가이드

## 개요

`VITE_AUTH_SALT`는 Firebase Auth 비밀번호를 강화하기 위한 서버 측 환경변수입니다.
설정하면 기존 레거시 비밀번호(`ryek!{username}#2024`)가 더 안전한 솔트 기반 비밀번호(`ryek2!{username}#{SALT}`)로 자동 업그레이드됩니다.

---

## ⚠️ 절대 변경/제거 금지

**VITE_AUTH_SALT 값을 한 번이라도 변경하거나 제거하면:**

1. 이미 업그레이드된 강사 계정은 새 값으로 로그인 시도 → 실패
2. 레거시 비밀번호로 fallback 시도 → 실패 (이미 SALTED로 덮어씌워짐)
3. Firebase Auth에서 `auth/invalid-credential` → 코드가 createUser 시도 → `auth/email-already-in-use` 에러
4. **결과: 모든 강사/관리자 로그인 불가. 앱 마비.**

복구 경로가 복잡하므로 설정 후에는 절대 변경하지 마세요.

---

## 신규 설정 절차

1. **솔트 생성** (강한 랜덤값):
   ```
   openssl rand -hex 32
   ```
   또는 비슷한 64자리 16진수 랜덤 문자열 사용.

2. **Cloudflare Pages 설정**:
   - Cloudflare 대시보드 → 해당 Pages 프로젝트 → Settings → Environment Variables
   - `VITE_AUTH_SALT` 변수 추가
   - Production **및** Preview 환경 모두 동일 값 설정

3. **재배포 트리거**:
   - 새 커밋 push 또는 Cloudflare Pages에서 수동 재배포
   - 빌드 시 환경변수가 번들에 포함됨

4. **동작 확인**:
   - 강사 계정으로 로그인 → 첫 로그인 시 레거시로 성공, 백그라운드에서 솔트 비밀번호로 자동 업그레이드
   - 두 번째 로그인부터 솔트 비밀번호로 즉시 성공

---

## SALT 미설정 시 동작

- `VITE_AUTH_SALT`가 비어있으면 레거시 비밀번호(`ryek!{username}#2024`)로만 동작
- 기존 동작과 완전 동일. 코드 배포 후 환경변수 설정 전까지는 아무 변화 없음.

---

## 분실/변경이 불가피한 경우 복구 절차

> 이 경우가 발생하지 않도록 솔트를 안전한 곳에 보관해두세요.

1. Firebase Console → Authentication → Users
2. 각 강사 계정 (`{username}@ryek.app`) 선택 → 비밀번호 재설정
3. 새 솔트로 재배포 후, 강사별로 임시 비밀번호로 직접 로그인 필요
4. 첫 로그인 성공 시 새 솔트로 자동 업그레이드됨

---

## 관련 파일

- `src/firebase.js` — `_SALT`, `_LEGACY_PW`, `_SALTED_PW`, `firebaseSignIn` 구현
