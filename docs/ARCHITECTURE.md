# 아키텍처: RYE-K K-Culture Center

## 기술 스택
- **프론트엔드**: React 18 (JSX), Vite 5
- **스타일링**: CSS-in-JS — `src/constants.jsx`의 `CSS` 상수 문자열을 `<style>` 태그로 주입. 외부 CSS 파일, Tailwind, CSS Module 없음.
- **데이터베이스**: Firebase Firestore (단일 컬렉션 `appData` — 문서 키별 분리)
- **인증**: Firebase Auth (익명 인증 → 데이터 읽기, 이메일 인증 → 강사/관리자 로그인)
- **빌드/배포**: Vite build → GitHub → Cloudflare Pages 자동 배포

## 디렉토리 구조
```
rye-k/
├── src/
│   ├── App.jsx              — 라우팅 분기 + MainApp(전역 상태 + Firestore 리스너) + generateSeedData
│   ├── constants.jsx        — 상수 + SVG 아이콘(IC) + 전체 CSS 문자열
│   ├── constants/
│   │   └── releases.js      — 릴리즈 히스토리 Source of Truth
│   ├── utils.js             — 순수 헬퍼 함수 (부작용 없음)
│   ├── firebase.js          — Firebase 초기화·인증·Firestore 헬퍼
│   ├── main.jsx             — React.createRoot 진입점
│   └── components/
│       ├── shared/CommonUI.jsx          — 재사용 원자 컴포넌트
│       ├── layout/NavLayout.jsx         — 네비게이션 (Sidebar / BottomNav / MoreMenu)
│       ├── auth/UserAuth.jsx            — 로그인 화면 + 프로필
│       ├── dashboard/Dashboard.jsx      — 요약 대시보드
│       ├── student/StudentManagement.jsx
│       ├── teacher/TeacherManagement.jsx
│       ├── attendance/Attendance.jsx    — 출석 + 레슨노트 + 댓글
│       ├── payment/PaymentsView.jsx
│       ├── notice/NoticeManagement.jsx
│       ├── institution/Institutions.jsx — B2B 기관 관리
│       ├── analytics/AnalyticsView.jsx
│       ├── admin/AdminTools.jsx         — 관리자 전용 도구
│       ├── portal/PublicPortal.jsx      — 회원 포털 + 공개 등록폼
│       ├── ScheduleView.jsx
│       └── updates/
│           ├── UpdatePopup.jsx
│           └── SystemNewsView.jsx
├── public/                  — 정적 자산 (favicon, PWA manifest, logo)
├── docs/                    — 설계 문서 (PRD, ARCHITECTURE, ADR, UI_GUIDE)
├── scripts/
│   ├── execute.py           — Harness 자동 실행 엔진
│   └── test_execute.py
├── phases/                  — Harness 태스크 정의 (phases/index.json + phases/{task}/*)
├── firebase.json
├── firestore.rules
├── handoff.md               — 개발 히스토리 + 운영자 메모
└── history.txt              — 버전별 개발 상세 로그
```

## 라우팅 패턴
URL param 기반 SPA 라우팅 (React Router 미사용):
```
/              → MainApp (강사 앱)
/register      → PublicRegisterForm (수강 등록 공개 폼)
/myryk         → PublicParentView (회원 포털)
?id=username   → 강사 앱 로그인 아이디 자동 입력
?code=RKXXXX   → 회원 포털 회원코드 자동 입력
```

## 상태 관리 패턴
- **서버 상태**: Firestore `onSnapshot` → React `useState` 직접 주입 (단방향, 단일 소스)
- **클라이언트 상태**: `MainApp` 최상단 `useState` → props drilling으로 하위 컴포넌트 전달
- **영속 상태**: localStorage (세션, 테마, 읽음 시각) / sessionStorage (포털 자동로그인)
- **상태관리 라이브러리 없음** — Firestore onSnapshot이 실시간 단일 소스로 충분

## 데이터 흐름
```
Firebase Firestore
       ↓ onSnapshot (실시간)
MainApp (useState: teachers, students, attendance, ...)
       ↓ props
각 컴포넌트 (AttendanceView, PaymentsView, ...)
       ↓ 사용자 액션
per-op 트랜잭션 함수 (addStudentDoc, updateStudentDoc, ...)
       ↓ runTransaction
Firebase Firestore → onSnapshot → UI 자동 반영
```

## B2B 기관 가상회원 아키텍처 (Option C)
```
rye-institutions (Firestore)
       ↓ expandInstitutionsToMembers()
가상회원 배열 (isInstitution: true, id: "inst_{instId}_{classId}")
       ↓ [...visible, ...visibleInstMembers]
AttendanceView / PaymentsView / ScheduleView / LessonNotesView
       (기존 컴포넌트 코드 0 수정)

StudentsView / Dashboard.students — 기관 가상회원 제외
```

## 인증 흐름
```
앱 로드
  → firebaseSignInAnon() (익명 인증 → Firestore 읽기 허용)
  → Firestore 리스너 시작

강사/관리자 로그인
  → firebaseSignIn(username, password)
     (username@ryek.app 형식으로 변환 → Firebase Auth)
  → 성공 시 로컬 credentials(rye-teachers/ADMIN) 검증
  → localStorage "rye-session" 저장
  → 30일 재인증 체크

회원 포털
  → 익명 Firebase Auth 유지
  → 회원코드 + 생년월일 4자리 → rye-students 로컬 검증
  → sessionStorage "ryekPortal" 저장 (새로고침 유지)
```

## CSS 시스템
- 모든 스타일은 `src/constants.jsx`의 `CSS` 문자열 상수에 집중
- `main.jsx`에서 `<style>{CSS}</style>` 로 주입
- CSS 변수(`--blue`, `--ink`, `--paper` 등) 기반 테마 시스템
- 다크모드: `[data-theme="dark"]` + `@media (prefers-color-scheme: dark)` 이중 지원
- 반응형: 768px 기준 모바일(BottomNav) / 데스크톱(Sidebar) 분기

## 이미지 처리
- 외부 Storage 미사용
- Canvas API로 최대 360px, JPEG 75% 압축 (`compressImage` in utils.js)
- Base64 문자열 → Firestore 직접 저장

## PWA
- `public/manifest.json` (기본)
- `public/manifest-myryk.json` (회원 포털 홈 화면 추가 전용)
- `public/manifest-register.json` (등록 폼 전용)
- `index.html` 인라인 스크립트로 URL 파라미터 감지 → manifest 동적 교체
