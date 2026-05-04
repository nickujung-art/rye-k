# 프로젝트: RYE-K K-Culture Center

> **국악 교육기관 통합 관리 시스템** — 회원·강사·출석·수납·기관(B2B) 관리 올인원 PWA

## 기술 스택
- React 18 + Vite 5 (SPA, 번들 ~880KB / gzip ~220KB)
- CSS-in-JS: `src/constants.jsx` 내 CSS 문자열 → `<style>` 태그 주입 (외부 CSS 파일 없음)
- Firebase v10: Firestore 실시간 동기화 + Auth (익명·이메일 혼용)
- 배포: GitHub (`nickujung-art/rye-k`) → Cloudflare Pages 자동 빌드

## 아키텍처 규칙

### CRITICAL — 데이터 안전
- **`saveStudents([...])` 절대 금지.** 이 함수는 throw만 함. 배열 전체 덮어쓰기 영구 금지.
  - 이유: 필터된 뷰에서 전체 저장 시 보이지 않는 회원 데이터 유실 (실제 77명 손실 사고 발생).
- **학생 CRUD는 반드시 per-op 트랜잭션 함수 사용:**
  ```js
  addStudentDoc(student)           // 신규 추가
  updateStudentDoc(student)        // ID 기준 단건 수정
  deleteStudentDoc(studentId)      // ID 기준 단건 삭제
  batchStudentDocs(updates[])      // 다건 수정 (수강료 일괄 등)
  ```
  모두 `runTransaction(db, ...)` 기반 → React state 기준이 아닌 Firestore 직접 읽어 수정.

### CRITICAL — UI
- **`window.confirm` / `window.alert` 절대 사용 금지.** 모든 확인은 인라인 UI 또는 커스텀 모달로.
- 채팅창에 전체 코드 재출력 금지. 반드시 Edit/str_replace 정밀 수정.

### CRITICAL — 배포·릴리즈 (Nick 명시 요구)
- **`git push` 자동 실행 절대 금지.** Nick이 "푸시해줘", "배포해줘", "라이브 반영해줘" 같이 **명시적으로 요청한 경우에만** 푸시.
  - 이유: 라이브 서버 = 실제 운영 환경. Nick이 로컬 테스트로 충분히 검증한 뒤에만 라이브 반영하길 원함.
  - 코드 수정 → `npm run build` 통과 → **여기서 멈추고 보고**. `git commit`까지는 OK, `git push`는 명시 요청 대기.
  - "수정 후 빌드 통과했습니다. 푸시할까요?" 형태로 확인 요청.
- **시스템 소식(System News) / 업데이트 팝업 글 변경은 반드시 Nick 명시 컨펌 후 파일 반영 + 커밋.**
  - 대상 파일: `src/constants/releases.js` (RELEASES, LATEST_RELEASE, CURRENT_VERSION), `src/components/updates/UpdatePopup.jsx`, `src/components/updates/SystemNewsView.jsx`
  - 작성안을 채팅에 먼저 보여주고, Nick이 **"확인했어", "이대로 써줘", "OK"** 같이 릴리즈 노트를 명시적으로 승인한 경우에만 파일에 반영 + 커밋.
  - **"다음 단계 진행해줘", "계속해줘", "다음 진행해줘"는 릴리즈 노트 컨펌으로 인정하지 않는다.** 이 경우 releases.js 반영을 건너뛰고 다른 작업을 먼저 처리하거나 재확인 요청.
  - 이유: 로컬 `npm run dev` 실행만으로도 팝업이 뜨므로, 파일 반영 = 팝업 노출과 동일. Nick의 명시 승인 전 커밋 자체가 문제.
  - 이유: 사용자에게 보이는 공지 문구는 Nick의 톤·표현으로 통제되어야 함.

### 일반 규칙
- 수정 전 이슈/질문 먼저 보고 → 확인 후 실행 (Nick 선호사항).
- 리팩토링과 기능 추가는 동일 세션에 절대 섞지 말 것.
- 한 세션에 기능 1~2개로 제한 (도구 호출 한도 도달 방지).
- **cross-import 주의**: `LessonEditor`(StudentManagement.jsx)는 App.jsx + AdminTools에서도 import. `InstSelector`(TeacherManagement.jsx)도 App.jsx에서 import.
- 기관(isInstitution=true) 가상회원은 `StudentsView`·`Dashboard.students`에 포함 금지. 출석/수납/스케줄/레슨노트에만 주입.

## 명령어
```bash
npm run dev      # 개발 서버 (Vite)
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```
> 테스트 러너 없음. 검증은 `npm run build` 통과 + 브라우저 직접 확인.

## 파일 구조 (v13.0 리팩토링 완료 기준)
```
src/
├── App.jsx              — App 라우터 + MainApp(상태·리스너) + generateSeedData (~690줄)
├── constants.jsx        — 상수(DEFAULT_CATEGORIES, DAYS, ADMIN, ATT_STATUS, ...) + IC(SVG 아이콘) + CSS 문자열
├── constants/
│   └── releases.js      — 릴리즈 히스토리 마스터 (RELEASES, LATEST_RELEASE, CURRENT_VERSION)
├── utils.js             — 순수 헬퍼 함수 20+ (calcAge, fmtMoney, expandInstitutionsToMembers, ...)
├── firebase.js          — Firebase 초기화 + firebaseSignIn/SignInAnon/Logout + runTransaction export
├── main.jsx             — React 진입점
└── components/
    ├── shared/CommonUI.jsx          — Logo, Av, PhotoUpload, RoleBadge, DeleteConfirmFooter
    ├── layout/NavLayout.jsx         — BottomNav, Sidebar, MoreMenu, ShareButton
    ├── auth/UserAuth.jsx            — LoginScreen, ProfileView
    ├── dashboard/Dashboard.jsx
    ├── student/StudentManagement.jsx — LessonEditor★, StudentFormModal, StudentDetailModal, BulkFeeModal, StudentsView
    ├── teacher/TeacherManagement.jsx — InstSelector★, TeacherFormModal, TeacherDetailModal, TeachersView
    ├── attendance/Attendance.jsx     — AttendanceView, LessonNotesView, LessonNoteModal, NoteCommentsPanel
    ├── payment/PaymentsView.jsx
    ├── notice/NoticeManagement.jsx  — NoticeFormModal, NoticesView, StudentNoticeManager
    ├── institution/Institutions.jsx — InstClassEditor, InstitutionFormModal, InstitutionDetailModal, InstitutionsView
    ├── analytics/AnalyticsView.jsx
    ├── admin/AdminTools.jsx         — ActivityView, PendingView, TrashView, CategoriesView★
    ├── portal/PublicPortal.jsx      — PublicRegisterForm, PublicParentView
    ├── ScheduleView.jsx
    └── updates/
        ├── UpdatePopup.jsx          — 로그인 후 1회 업데이트 팝업
        └── SystemNewsView.jsx       — 시스템 소식 타임라인
```

## Firestore 컬렉션 구조
컬렉션: `appData` (단일 컬렉션, 문서 키별 분리)

| Firestore 키 | 타입 | 설명 |
|---|---|---|
| `rye-teachers` | Teacher[] | 강사 목록 |
| `rye-students` | Student[] | 회원 목록 |
| `rye-attendance` | Attendance[] | 출석 기록 |
| `rye-payments` | Payment[] | 수납 기록 |
| `rye-notices` | Notice[] | 공지사항 |
| `rye-categories` | object | 과목 카테고리 |
| `rye-fee-presets` | object | 수강료·대여료 프리셋 |
| `rye-schedule-overrides` | ScheduleOverride[] | 임시 일정 변경 |
| `rye-activity` | ActivityLog[] | 활동 로그 |
| `rye-pending` | Pending[] | 강사 등록 대기 |
| `rye-trash` | TrashItem[] | 휴지통 |
| `rye-student-notices` | StudentNotice[] | 회원 공지 |
| `rye-institutions` | Institution[] | B2B 기관 (v12.1+) |

## 권한 체계
| 역할 | 회원 관리 | 기관 관리 | 수강료 | 강사 연락처 |
|------|---------|---------|-------|-----------|
| admin | 전체 | 전체 | 열람·수정 | 열람 가능 |
| manager | 전체 | 전체 | 열람·수정 | 열람 가능 |
| teacher | 담당 회원만 | 담당 기관 열람만 | 숨김 | 숨김 |

## 핵심 데이터 구조
```js
// 회원 (rye-students)
{ id, name, birthDate, startDate, phone, guardianPhone, teacherId,
  lessons: [{ instrument, teacherId, schedule: [{ day, time }] }],
  photo, notes, monthlyFee, status: "active"|"paused"|"withdrawn",
  studentCode, createdAt }

// 기관 (rye-institutions)
{ id, name, type: "school"|"center"|"company"|"government"|"other",
  address, contactName, contactPhone, contactEmail, bizNumber, teacherId,
  classes: [{ id, name, instrument, teacherId, schedule, participantCount, monthlyFee, notes }],
  contractStart, contractEnd, status: "active"|"paused"|"expired",
  notes, photo, createdAt }

// 가상회원 (런타임 전용, DB 저장 안 함)
// expandInstitutionsToMembers() 가 기관 → 가상회원 배열로 변환
{ id: `inst_${instId}_${classId}`, isInstitution: true, ... }

// 출석 (rye-attendance)
{ id, studentId, teacherId, date, status: "present"|"absent"|"late"|"excused",
  lessonNote, note, comments: [...], participantCount, createdAt, updatedAt }

// 댓글 (출석 레코드 내 comments[])
{ id, text, authorType: "teacher"|"manager"|"admin"|"student",
  authorName, authorId, createdAt, deletedAt, deletedBy }
```

## localStorage / sessionStorage 키
| 키 | 용도 |
|---|---|
| `rye-session` | 강사 앱 로그인 세션 |
| `rye-theme` | 다크모드 설정 |
| `ryekSavedId` | 강사 앱 아이디 저장 |
| `ryekSavedCode` | 포털 회원코드 저장 |
| `ryekAdmin_lnr_{uid}` | 레슨노트 읽음 시각 |
| `ryekP_lnr_{sid}` | 포털 레슨노트 읽음 시각 |
| `ryekP_rni_{sid}` | 포털 읽은 공지 ID |
| `ryekPwResetV12Done` | v12 강사 비번 마이그레이션 가드 |
| `ryekPortal` | 포털 자동로그인 (sessionStorage) |
| `ryek_lastSeenVersion` | 업데이트 팝업 확인 버전 |
| `rye-recovery-v1` | 77명 복구 완료 플래그 |
| `ryek_last_login` | 30일 재인증 타임스탬프 |

## 알려진 이슈
- 회원 `monthlyFee` 전부 0 (실제 금액 미입력)
- Firebase Auth ↔ 로컬 비밀번호 동기화 깨진 상태 (로컬 fallback 동작 중)

## 개발 워크플로우
1. Nick이 요구사항 설명
2. Claude가 관련 파일 분석 → 이슈/질문 먼저 보고
3. Q&A 후 승인 받고 코딩 시작
4. `Edit` / `str_replace` 정밀 수정
5. `npm run build` 통과 확인
6. **여기서 멈춤** — Nick이 로컬에서 `npm run dev`로 검증
7. Nick의 푸시 요청("푸시해줘"/"배포") 확인 후 → `git commit && git push` → Cloudflare Pages 자동 배포
8. 시스템 소식/릴리즈 노트 변경이 포함된 경우, **푸시 전 문구 컨펌 별도로 받기**
9. 라이브 반영 후 Nick 최종 확인 + 피드백

## Firebase DB 주의사항
- 코드 배포는 Firestore 데이터에 영향 없음
- AdminTools의 **"샘플 데이터 초기화" 버튼 절대 누르지 말 것** (실제 운영 DB 전체 덮어씌움)

---

## Karpathy Tips
Behavioral guidelines to reduce common LLM coding mistakes.

1. **Think Before Coding** — 가정하지 마라. 불분명하면 물어라. 여러 해석이 있으면 침묵하지 말고 제시하라.

2. **Simplicity First** — 요청된 것만 최소한으로 구현. 추상화·유연성·에러 핸들링은 요청이 없으면 추가하지 않는다.

3. **Surgical Changes** — 변경 요청 범위 밖의 코드·포맷·주석을 손대지 마라. 내 변경이 만든 고아(orphan) import만 정리.

4. **Goal-Driven Execution** — 검증 가능한 목표로 변환. `npm run build` 통과를 최소 AC로. 다단계 작업은 계획을 먼저 제시.
