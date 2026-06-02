# 아키텍처: RYE-K K-Culture Center

기술 스택·파일 구조·데이터 구조는 CLAUDE.md 참조.

## 라우팅 패턴
```
/              → MainApp (강사 앱)
/register      → PublicRegisterForm (공개 등록폼)
/myryk         → PublicParentView (회원 포털)
?id=username   → 강사 앱 로그인 자동 입력
?code=RKXXXX   → 회원 포털 회원코드 자동 입력
```
React Router 미사용. URL param/pathname 직접 파싱.

## 데이터 흐름
```
Firestore onSnapshot (실시간)
  → MainApp useState (teachers, students, attendance, ...)
  → props drilling → 각 컴포넌트
  → 사용자 액션 → per-op runTransaction → Firestore → onSnapshot 자동 반영
```

## B2B 기관 가상회원 흐름
```
rye-institutions (Firestore)
  → expandInstitutionsToMembers()
  → 가상회원 배열 (isInstitution: true)
  → [...students, ...instMembers] → Attendance / Payment / Schedule / LessonNotes
StudentsView / Dashboard.students — 가상회원 제외
```

## 인증 흐름
```
앱 로드 → firebaseSignInAnon() → Firestore 읽기 허용 → onSnapshot 시작

강사/관리자 로그인
  → firebaseSignIn(username@ryek.app) → Firebase Auth
  → rye-teachers/ADMIN 클라이언트 검증 → localStorage "rye-session" 저장 → 30일 재인증

회원 포털
  → 익명 Firebase Auth 유지
  → 회원코드 + 생년월일4자리 → rye-students 로컬 검증
  → sessionStorage "ryekPortal" 저장
```

## CSS 시스템
- `src/constants.jsx` CSS 문자열 → `main.jsx` `<style>{CSS}</style>` 주입
- CSS 변수(`--blue`, `--ink`, `--paper` 등) 기반 테마
- 다크모드: `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)`
- 반응형: 768px 기준 (모바일: BottomNav, 데스크톱: Sidebar)

## 이미지 / PWA
- 이미지: Canvas API 360px JPEG 75% → Base64 → Firestore (Storage 미사용)
- `public/manifest.json` (메인앱), `manifest-myryk.json` (포털), `manifest-register.json` (등록폼)
