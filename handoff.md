# RYE-K K-Culture Center — 핸드오프 문서
> 새 채팅 시작 시 이 파일과 App.jsx를 함께 첨부해주세요.

## 프로젝트 개요
- **이름**: RYE-K K-Culture Center (국악 교육기관 관리 시스템)
- **버전**: v12.2
- **기술 스택**: React 18 + Vite + CSS-in-JS (단일 App.jsx) + Firebase (Auth/Firestore)
- **배포**: GitHub (nickujung-art/rye-k) → Cloudflare Pages (자동 빌드/배포)
- **Firebase**: rye-k-center 프로젝트 (Auth + Firestore 실시간 동기화, Storage 미사용)

## ⚠ v12.2 핵심 변경 (운영자 필독)
1. **강사 연락처 전면 차단 (Privacy)** — 강사 role 로그인 시 회원 연락처/보호자 연락처가 모든 UI에서 완전히 숨겨짐
   - `StudentDetailModal`: 연락처 ii 블록 자체가 사라짐 (canManageAll 체크)
   - `StudentFormModal`: 연락처/보호자 연락처 입력 fg 블록 숨김 (강사는 등록·수정 시 연락처 칸 자체가 안 보임)
   - `PaymentsView` 미리보기: 일반 회원은 강사에게 연락처 숨김. **기관 담당자 연락처는 출강 현장 대응을 위해 강사에게도 노출 유지**
   - 관리자/매니저는 기존과 동일하게 모두 열람 가능
2. **공지사항 ↔ 스케줄 연동 (Event Date)** — 공지에 일정 날짜를 붙이면 스케줄 캘린더에 자동 표시
   - `NoticeFormModal`: "스케줄에 일정으로 표시" 체크박스 + "기간 일정" 토글 (방학·캠프 등) + start/end date input
   - `NoticesView`: 공지 카드에 📅 배지 + 날짜/기간 표시
   - `ScheduleView`: 주간 뷰의 각 날짜 컬럼에 공지 띠(blue), 월간 뷰의 셀에 📅 아이콘 + dayDetail 드롭다운에 "일정" 섹션
   - 모든 강사가 볼 수 있음 (필터링 없음)
3. **현황 분석 월 필터 + 리포트 PDF** (관리자 전용)
   - `AnalyticsView` 상단에 최근 12개월 선택 드롭다운 + "🖨 리포트 출력 / PDF" 버튼
   - **월별 재계산 정책**: 출석률/수납/매출만 selectedMonth 기반. 재원생/연령대/강사별/악기별/경로 분석은 현재 시점 고정 (Q1 정책)
   - 인쇄 시 `@media print` CSS로 사이드바·FAB·툴바 숨김, A4 세로 15mm 여백, dash-card 페이지 break-inside 방지
   - 모바일 Safari/Chrome에서도 "공유 → 인쇄 → PDF로 저장" 으로 동일 동작
   - 외부 라이브러리 0개 추가 (번들 크기 변동 없음)

## ⚠ v12.1 핵심 변경 (운영자 필독)
1. **B2B 기관 파견 레슨 관리 도입** — 학교/주민센터/기업 등 출강 수업을 별도 컬렉션으로 관리
   - 기존 회원 데이터와 완전 분리, `rye-students`는 100% 호환
   - 사이드바 "기관 관리" 메뉴 신설 (admin/manager만 등록·삭제, 강사는 본인 담당 기관만 열람)
2. **Option C — 가상 회원 매핑 아키텍처**: 1기관 = 여러 가상회원(수업/반 단위)
   - 기관의 각 수업이 런타임에 가상 student 객체로 변환되어
     출석/수납/스케줄/레슨노트 컴포넌트에 그대로 흘러들어감 → **기존 컴포넌트 0 수정**
3. **출석 — 참석 인원 입력 필드**: 기관 가상회원 행에만 노출, 통계용
4. **계약 만료 알림**: Dashboard에 D-30 이내 자동 표시 (D-7 이내 빨강)
5. **DB 변경**: `rye-institutions` 컬렉션 신설 (기존 데이터 영향 없음)

## 파일 구조
```
├── .gitignore
├── README.md
├── history.txt          ← 개발 히스토리
├── index.html           ← 동적 manifest 로더 스크립트 포함
├── package.json         ← v12.1.0
├── vite.config.js
├── firebase.json
├── firestore.rules
├── public/
│   ├── _redirects
│   ├── manifest.json
│   ├── manifest-myryk.json
│   ├── manifest-register.json
│   ├── logo.png / logo_white.png
│   ├── favicon-16.png / favicon-32.png
│   ├── icon-192.png / icon-512.png
│   └── apple-touch-icon.png
└── src/
    ├── App.jsx          ← 메인 앱 (3,700줄) ★ 수정 대상
    ├── constants.jsx    ← ★ v13.0-1: 상수·아이콘·CSS (DEFAULT_CATEGORIES, DAYS, IC, CSS 등)
    ├── utils.js         ← ★ v13.0-1: 헬퍼 함수 21개 export (formatLessonNoteSummary 추가)
    ├── components/
    │   ├── ScheduleView.jsx  ← ★ v13.0-2: 강사 스케줄 캘린더 (325줄)
    │   ├── institution/
    │   │   └── Institutions.jsx  ← ★ v13.0-3: B2B 기관 관리 5개 컴포넌트 (314줄)
    │   ├── shared/
    │   │   └── CommonUI.jsx  ← ★ v13.0-4: 공통 UI (Logo, Av, PhotoUpload, RoleBadge, DeleteConfirmFooter)
    │   └── attendance/
    │       └── Attendance.jsx  ← ★ v13.0-5: 출석·레슨노트 (757줄, AttendanceView, LessonNotesView, NoteCommentsPanel 외 export)
    ├── firebase.js      ← Firebase 설정 및 인증 함수
    └── main.jsx         ← React 진입점
```

## 아키텍처 핵심 사항
- **모든 UI/로직이 src/App.jsx 한 파일**에 있음
- **데이터 저장**: Firestore 문서 기반 (컬렉션 "appData", 키별 onSnapshot 리스너)
- **Firestore 키 목록**:
  rye-teachers / rye-students / rye-notices / rye-categories /
  rye-attendance / rye-payments / rye-activity / rye-pending / rye-fee-presets /
  rye-schedule-overrides / rye-trash / rye-student-notices /
  **rye-institutions** ★ v12.1 신규
- **프로필 사진**: Canvas API로 360px JPEG 압축 → Base64 → Firestore 직접 저장
- **인증**: Firebase Auth (username@ryek.app) + 로컬 credentials 검증
- **회원 포털**: ?myryk + 회원코드+생일4자리 / 공개 등록폼: ?register
- **window.confirm/alert 사용 금지** → 모든 확인은 인라인 UI/커스텀 모달

## ★ v12.1: B2B 기관 파견 레슨 (Option C — 가상 회원 매핑)

### 데이터 구조
```js
// rye-institutions 컬렉션
{
  id, name,                       // "○○초등학교"
  type: "school"|"center"|"company"|"government"|"other",
  address,
  contactName, contactPhone, contactEmail,
  bizNumber,                      // 사업자등록번호 (세금계산서용)
  teacherId,                      // 메인 담당 강사 (선택)
  classes: [                      // ★ 핵심: 수업/반 배열
    {
      id,                         // uid()
      name,                       // "해금 초급반"
      instrument,                 // "해금"
      teacherId,                  // 반별 담당 강사
      schedule: [{ day, time }],
      participantCount,           // 정원 (수강 인원)
      monthlyFee,                 // 월 청구액
      notes
    }
  ],
  contractStart, contractEnd,     // 계약 기간
  status: "active"|"paused"|"expired",
  notes, photo, createdAt
}
```

### 가상 회원 변환 (`expandInstitutionsToMembers`)
1기관 → N개 가상 student 객체 (각 수업이 1개의 가상회원)
```js
{
  id: `inst_${instId}_${classId}`,        // ★ inst_ prefix로 충돌 방지
  name: "○○초등학교 · 해금 초급반",
  isInstitution: true,                    // ★ 구분 플래그
  institutionId, classId,
  teacherId, lessons: [{...}],            // ← LessonEditor와 호환
  monthlyFee, participantCount,
  studentCode: "RKI" + instId + classId,
  birthDate: "",                          // 포털 로그인 차단
  // ...기관 메타 (bizNumber, contactName, address 등)
}
```

### 컴포넌트 통합
- `AttendanceView`, `PaymentsView`, `ScheduleView`, `LessonNotesView`에
  `[...visible, ...visibleInstMembers]` 주입 → **기존 컴포넌트 코드 0 수정**으로 동작
- `StudentsView`, `Dashboard.students`는 **기관 미포함** (회원 목록 오염 방지)

### 강사 필터링
```js
// 강사: 본인이 어느 수업이라도 담당이거나 메인 담당인 기관만
canManageAll(user.role) ? allInstMembers
  : allInstMembers.filter(m => m.teacherId === user.id)
```

### 출석 그룹 분리 (`detectLessonGroups`)
기관 가상회원은 그룹 키에 `inst_${id}__` prefix → 일반 회원과 절대 같은 그룹에 묶이지 않음

### 계약 만료 알림 (`getContractDaysLeft`)
- D-30 이내: gold 알림 / D-7 이내: red 알림 / 만료됨: red 알림
- status는 자동 전환되지 않음 (수동 변경)

### 신규 컴포넌트
| 컴포넌트 | 역할 |
|---|---|
| `InstClassEditor` | 수업/반 편집기 (악기·강사·요일·시간·인원·금액) |
| `InstitutionFormModal` | 기관 등록/수정 |
| `InstitutionDetailModal` | 기관 상세 (계약 D-day, 출석/수납 통계) |
| `InstitutionCard` | 카드 UI (D-day 배지, 반/인원 표시) |
| `InstitutionsView` | 카드 그리드 + 상태 필터 |
| `expandInstitutionsToMembers()` | 핵심 변환 함수 |
| `getContractDaysLeft()` | 계약 만료 D-day 계산 |

## 권한 체계
| 역할 | 회원 | 기관 |
|------|------|------|
| admin | 전체 접근, DB 초기화 | 전체 관리 |
| manager | 전체 회원 관리, 등록 승인, 수납 관리 | 전체 관리 |
| teacher | 담당 회원만, 수강료 열람 불가 | 본인 담당 기관만 열람, 출석 입력 가능 |

## 강사 비밀번호 정책 (v12~)
- 신규 등록: 연락처 뒷 4자리 자동 설정 (없으면 "0000")
- 기존 14명: v12 첫 admin 로그인 시 일괄 리셋 완료
- 변경 권한: 강사 본인이 프로필 수정에서 변경 가능

## 댓글 데이터 구조 (v12~)
```js
comments: [{
  id, text, authorType,    // "teacher"|"manager"|"admin"|"student"
  authorName, authorId,
  createdAt,
  deletedAt, deletedBy     // soft delete
}]
```

## 출석 데이터 구조 (v12.1~)
```js
{
  id, studentId, teacherId, date, status,
  lessonNote, note, comments,
  participantCount,        // ★ v12.1: 기관 가상회원 전용 (참석 실인원)
  createdAt, updatedAt
}
```

## 회원 데이터 구조
```js
{
  id, name, birthDate, startDate,
  phone, guardianPhone,
  teacherId,
  lessons: [{ instrument, teacherId, schedule: [{ day, time }] }],
  photo, notes, monthlyFee,
  status: "active"|"paused"|"withdrawn",
  studentCode,             // "RK" + 4자리
  createdAt
}
```

## 수강료(monthlyFee) 마스킹 — 강사 완전 차단
강사(teacher) 로그인 시 수강료가 노출되는 위치는 전부 차단:
- 회원/기관 수정 폼, 상세 모달, 수납 관리 미리보기/요약/행/모달 등 전 영역

## localStorage / sessionStorage 키 목록
| 키 | 용도 | 저장소 |
|---|---|---|
| `rye-session` | 강사 앱 로그인 세션 | localStorage |
| `rye-theme` | 다크모드 설정 | localStorage |
| `ryekSavedId` | 강사 앱 아이디 저장 | localStorage |
| `ryekSavedCode` | 회원 포털 코드 저장 | localStorage |
| `ryekAdmin_lnr_{uid}` | 강사 앱 레슨노트 읽음 시각 | localStorage |
| `ryekP_lnr_{sid}` | 포털 레슨노트 읽음 시각 | localStorage |
| `ryekP_rni_{sid}` | 포털 읽은 공지 ID 목록 | localStorage |
| `ryekPwResetV12Done` | 강사 비밀번호 마이그레이션 가드 | localStorage |
| `ryekPortal` | 포털 자동 로그인 (새로고침 유지) | sessionStorage |

## 강사 필터링 로직
```js
// 회원
students.filter(s =>
  s.teacherId === user.id ||
  (s.lessons||[]).some(l => l.teacherId === user.id)
)
// 기관 가상회원
allInstMembers.filter(m => m.teacherId === user.id)
```

## 그룹 레슨 감지 로직
```js
// detectLessonGroups(students, dayName, filterTeacher)
// 같은 teacherId + 같은 요일 + 정확히 같은 시간 → 자동 그룹
// ★ v12.1: 기관 가상회원은 inst_${id}__ prefix로 항상 단독 그룹화
```

## 주요 컴포넌트 목록
| 컴포넌트 | 역할 |
|---|---|
| `LoginScreen` | 강사 앱 로그인 |
| `PublicParentView` | My RYE-K 포털 |
| `StudentFormModal` / `StudentDetailModal` | 회원 추가/수정/상세 |
| `TeacherFormModal` / `TeacherDetailModal` | 강사 추가/수정/상세 |
| **`InstitutionFormModal`** | ★ v12.1: 기관 등록/수정 |
| **`InstitutionDetailModal`** | ★ v12.1: 기관 상세 |
| **`InstClassEditor`** | ★ v12.1: 수업/반 편집기 |
| **`InstitutionsView`** | ★ v12.1: 기관 목록 |
| `AttendanceView` | 출석 체크 (그룹 레슨 + ★ v12.1 기관 참석 인원) |
| `LessonNotesView` / `LessonNoteModal` | 레슨노트 |
| `NoteCommentsPanel` | 댓글 패널 (Soft Delete) |
| `PaymentsView` | 수납 관리 (★ v12.1 기관 배지 + 사업자번호) |
| `Dashboard` | 대시보드 (★ v12.1 기관 통계 + 만료 알림) |
| `ScheduleView` | 강사 스케줄 |
| `LessonEditor` | 회원 과목·강사·스케줄 편집기 |
| `detectLessonGroups` | 그룹 레슨 자동 감지 |
| `expandInstitutionsToMembers` | ★ v12.1: 기관 → 가상회원 변환 |
| `getContractDaysLeft` | ★ v12.1: 계약 만료 D-day |

## Firebase DB 주의사항 ⚠️
- **코드 배포는 Firestore DB에 영향 없음**
- **"샘플 데이터 초기화" 버튼 절대 누르지 말 것** (실제 DB 전체 덮어씌움)
- v12.1: 초기화 시 `rye-institutions`도 빈 배열로 리셋됨

## v12.1 배포 체크리스트
1. [ ] GitHub push → Cloudflare Pages 자동 배포 확인
2. [ ] 사이드바에 "기관 관리" 메뉴 표시 확인 (admin/manager)
3. [ ] 기관 등록 → "○○초등학교" 같은 테스트 기관 1곳 + 수업 2개 추가
4. [ ] 출석 체크 화면에서 기관 가상회원 행에 🏢 배지 + "참석 인원" 입력 필드 표시 확인
5. [ ] 참석 인원 입력 → 새로고침 후 유지 확인 (Firestore 저장 확인)
6. [ ] 수납 관리에서 기관 가상회원 행에 🏢 배지 표시 확인
7. [ ] 수납 미리보기 모달에서 사업자번호/담당자 표시 확인
8. [ ] 계약 만료일을 30일 이내로 설정 → Dashboard 알림 확인
9. [ ] 강사 계정으로 로그인 → 본인 담당 기관만 보이는지 확인
10. [ ] 기관 삭제 → 관련 출석 레코드는 보존되는지 확인

## 향후 개발 예정

### v12.2 ✅ 완료
- ① 강사 연락처 전면 차단
- ② 공지사항 ↔ 스케줄 연동 (eventStartDate/eventEndDate)
- ③ 현황 분석 월 필터 + 리포트 PDF (window.print + @media print)

### v12.3 (다음 릴리즈)
- 수강료 일괄 설정 기능 (관리자 전용)
- 출석률 통계 리포트 세분화 (강사별/과목별/기관별)

### v12.4
- 기관 월별 정산 리포트 PDF
- 세금계산서 발행 체크리스트
- 출강 교통비 항목 (`InstClassEditor`에 transportFee 필드 + `rye-inst-settlements` 신규 컬렉션)

### ★ v13.0 — 리팩토링 전용 릴리즈 (기능 추가 금지)
App.jsx가 5,273줄로 커지면서 단일 파일 전략의 한계에 접근 중.
v13.0은 **오직 파일 분리만** 수행하는 릴리즈로 잡고, 기능 추가와 절대 섞지 않음.

**분리 순서 (독립성 높은 것부터)**:
1. ✅ `src/constants.jsx` ← DEFAULT_CATEGORIES, DAYS, INST_TYPES, IC, CSS **(완료 2026-04-16)**
2. ✅ `src/utils.js` ← 헬퍼 함수 20개 export **(완료 2026-04-16)**
   - calcAge, isMinor, getCat, fmtDate, fmtDateShort, fmtDateTime, uid, fmtPhone, fmtMoney
   - allLessonInsts, allLessonDays, canManageAll, monthLabel, generateStudentCode
   - getBirthPassword, getPhoneInitialPassword, instTypeLabel, compressImage, printQR
   - expandInstitutionsToMembers, getContractDaysLeft
3. ✅ `src/components/ScheduleView.jsx` ← 강사 스케줄 캘린더 (325줄) **(완료 2026-04-16)**
   - TEACHER_COLORS, getTeacherColor, ScheduleView 포함
4. ✅ `src/components/institution/Institutions.jsx` ← B2B 기관 관리 (314줄) **(완료 2026-04-16)**
   - InstClassEditor, InstitutionFormModal(export), InstitutionDetailModal(export), InstitutionCard, InstitutionsView(export)
5. ✅ `src/components/shared/CommonUI.jsx` ← 공통 UI 컴포넌트 **(완료 2026-04-16)**
   - Logo, Av, PhotoUpload, RoleBadge, DeleteConfirmFooter (named exports)
   - ScheduleView·Institutions의 로컬 복사본 제거, App.jsx에서 import 통합
   - App.jsx: 4,513 → 4,460줄 (53줄 감소)
6. ✅ `src/components/attendance/Attendance.jsx` ← 출석·레슨노트 (757줄) **(완료 2026-04-16)**
   - LessonNoteModal, NoteCommentsPanel, detectLessonGroups, AttendanceView, LessonNotesView
   - formatLessonNoteSummary → utils.js로 이동 (StudentDetailModal도 공유 사용)
   - export: AttendanceView, LessonNotesView, NoteCommentsPanel
   - App.jsx: 4,460 → 3,700줄 (760줄 감소)
7. `src/components/payment/PaymentsView.jsx`
8. `src/components/student/` ← StudentFormModal, StudentDetailModal, StudentsView
9. `src/components/teacher/` ← TeacherFormModal, TeacherDetailModal, TeachersView
10. `src/App.jsx` ← MainApp + PublicParentView + PublicRegisterForm + 라우팅만 (목표 ~1,500줄)
6. `src/components/payment/PaymentsView.jsx`
7. `src/components/student/` ← StudentFormModal, StudentDetailModal, StudentsView
8. `src/components/teacher/` ← TeacherFormModal, TeacherDetailModal, TeachersView
9. `src/App.jsx` ← MainApp + PublicParentView + PublicRegisterForm + 라우팅만 (목표 ~1,500줄)

**리팩토링 원칙**:
- 한 세션 = 하나의 모듈 분리만 수행 (너무 욕심내지 말 것)
- 매 분리 후 `npm run build` 통과 검증 필수
- DB 스키마·컴포넌트 시그니처·동작 0 변경
- PR 단위로 나눠서 커밋 (롤백 쉽도록)

---

## ⚠ Claude 작업 방식 주의사항 (새 채팅 시작 시 필독)

### 제미나이 등 다른 LLM의 조언과 다른 점
다른 LLM은 "변경된 컴포넌트 코드만 먼저 알려달라고 해라" 같은 조언을 줄 수 있음.
이는 **채팅창에 코드를 뱉어내는 구식 워크플로우** 기준이며, Claude의 실제 작업 방식에는 맞지 않음.

### Claude의 실제 작업 방식
Claude는 `str_replace` / `create_file` 같은 파일 편집 도구로 **코드를 "생성"하지 않고 "편집"** 함.
- 변경 부위 ~20줄만 정밀 치환 → 출력 토큰 최소화
- 코드 잘림 위험 거의 없음 (원자적 치환)
- v12.1 작업도 약 20회 `str_replace`로 459줄 추가 + 12군데 수정 완료

### 그래도 존재하는 진짜 리스크 (장기 프로젝트 진행 시)
1. **컨텍스트 윈도우 소모** ← 가장 큰 실제 위험
   - App.jsx 업로드만으로 입력 토큰 15,000+ 소모
   - 긴 작업 시 후반부에 도구 사용 한도 먼저 도달 가능
2. **의도치 않은 side effect**
   - 단일 파일이라 A 기능 수정이 B 기능 깨뜨릴 수 있음
   - 변경 후 관련 기능 전체 회귀 테스트 필요
3. **str_replace 문자열 충돌**
   - 파일이 클수록 유일한 앵커 문자열 찾기 어려움
   - 중복 매치 시 더 큰 블록으로 감싸서 재시도

### 실전 권장사항 (Nick ↔ Claude 워크플로우)
1. 새 대화 시작 시 **handoff.md + App.jsx 둘 다 첨부** (필수)
2. 기능 요청 시 **"먼저 이슈 플래그 → 확인 후 실행"** 순서 유지
3. 한 세션에 **기능 1~2개로 제한** (3개 이상이면 도구 한도 도달 위험)
4. 복잡한 작업은 `ask_user_input_v0`로 설계 결정 먼저 확정
5. 작업 완료 후 반드시 `npm run build` 통과 검증 (main.jsx + firebase.js 별도 첨부 필요)
6. 리팩토링과 기능 추가는 **절대 같은 세션에 섞지 말 것**

## ★ 개발 전략 — 단일 파일 관리 및 리팩토링 계획 (v12.1~ 필독)

### 현재 상황
- App.jsx: 4,513줄 (v12.0: 4,814 → v12.1: +459 → v13.0-1: −631 → v13.0-2: −319 → v13.0-3: −312줄 분리)
- `constants.jsx`, `utils.js`, `components/ScheduleView.jsx`, `components/institution/Institutions.jsx` 분리 완료
- 단일 파일 전략이 지금까지는 유효했음 (import 관리 불필요, 순환 참조 없음, zip 드래그&드롭 배포)

### ✅ v12.x 작업 시 지켜야 할 원칙
1. **코드 편집은 반드시 `str_replace` 기반 정밀 수정으로 진행**
   - 채팅창에 전체 코드를 재출력하지 말 것 (잘림 위험 + 불필요한 토큰 소모)
   - "변경된 컴포넌트만 보여달라"는 접근도 불필요 — str_replace가 이미 최소 변경분만 처리함
2. **한 세션에 기능 1~2개로 제한**
   - 기능을 너무 많이 넣으면 도구 호출 한도에 먼저 도달 (v12.1이 3개 메시지로 쪼개진 이유)
   - 큰 기능은 사전 기획 → 승인 → 실행 순서로 단계별 진행
3. **새 채팅 시작 시 항상 handoff.md + App.jsx 둘 다 첨부**
4. **수정 전 이슈/질문 먼저 보고, 확인 후 실행** (Nick 선호사항)
5. **str_replace 앵커 선택 주의**
   - 파일이 클수록 유일한 앵커 문자열 찾기 어려워짐
   - 문자열 중복 충돌 시 주변 컨텍스트를 더 넓게 포함시킬 것

### 🎯 v13 리팩토링 계획 (확정)
**v13부터 컴포넌트 분리 리팩토링 시작**. 목표는 App.jsx를 MainApp + PublicParentView + 라우팅만 남기고 나머지는 src/components/ 하위로 분리.

**분리 우선순위 (쉬운 것부터)**:
1. ✅ `src/constants.jsx` + `src/utils.js` ← **완료**
2. ✅ `src/components/ScheduleView.jsx` ← **완료**
3. ✅ `src/components/institution/Institutions.jsx` ← **완료**
4. `src/components/attendance/` ← AttendanceView, LessonNoteModal, NoteCommentsPanel
   (InstitutionsView, InstitutionFormModal, InstitutionDetailModal, InstClassEditor, InstitutionCard)
3. `src/components/schedule/ScheduleView.jsx` ← 가장 큰 단일 뷰 (~280줄)
4. `src/components/student/` ← StudentFormModal, StudentDetailModal, StudentCard, StudentsView
5. `src/components/teacher/` ← TeacherFormModal, TeacherDetailModal, TeachersView
6. `src/components/attendance/` ← AttendanceView, LessonNoteModal, NoteCommentsPanel
7. `src/components/payments/` ← PaymentsView
8. `src/components/dashboard/` ← Dashboard
9. `src/components/shared/` ← Av, Logo, PhotoUpload, BottomNav, Sidebar, DeleteConfirmFooter 등

### ⚠ 리팩토링 시 지킬 원칙
- **리팩토링만 한 세션 전체 써서** 진행 (기능 추가와 섞지 말 것)
- 한 번에 한 폴더씩 분리하고 빌드 검증
- CSS 변수는 App.jsx에 그대로 두거나 별도 CSS 모듈로 분리
- Firebase 설정/리스너는 App.jsx에 유지 (분리하면 복잡도 증가)

### 🚫 당장은 불필요 (v14+)
- React Router 도입 (현재 URL param 방식으로 충분)
- 상태관리 라이브러리 (Zustand/Redux) — Firestore onSnapshot이 이미 단일 소스

## 현재 알려진 이슈
- App.jsx 약 4,513줄 (Vite 빌드 시 chunk 크기 경고 — 기능 무관, v13 리팩토링 진행 중)
- 회원 monthlyFee 실제 금액 미입력 상태 (모두 0) → 추후 입력 필요
- 그룹 감지는 레슨 시간이 정확히 같아야만 묶임 (오차 허용 없음)
- v12 강사 비밀번호 마이그레이션 후 Firebase Auth 동기화는 깨진 상태로 남음 (로컬 fallback 동작)
- v12.0부터 존재한 esbuild duplicate key 경고 2건 (LoginScreen, PublicParentView의 `minHeight: 100vh/100dvh` 중복) — 빌드는 통과, 두 번째 값 사용. 차후 정리 예정.
- 기관 삭제 시 휴지통 미적용 (즉시 삭제) — MVP 단순화. 단, 관련 출석/수납 레코드는 보존됨.
- 기관 가상회원의 출석 모달 내 강사 표시는 메인 담당 강사 기준 (반별 강사가 다를 경우 부정확할 수 있음)

## 개발 워크플로
1. Nick이 요구사항 설명
2. Claude가 관련 파일 분석 후 플래그 이슈 먼저 보고
3. 사전 기획 + Q&A 후 승인 받고 코딩 시작
4. 파일 편집 (str_replace / Node 스크립트) → 변경된 파일 전달
5. Nick이 GitHub src/ 폴더에 push → Cloudflare 자동 배포
6. Nick이 라이브 테스트 후 피드백

> **v13.0-1 이후 수정 대상 파일 목록**: `src/App.jsx`, `src/constants.jsx`, `src/utils.js`

## Nick 선호사항
- 최대한 무료 유지 (Firebase 무료 티어, Cloudflare Pages 무료)
- 모바일 퍼스트, 깔끔한 UI (Apple 스타일, near-monochrome)
- window.confirm/alert 절대 금지
- 코드를 채팅에 전체 붙이지 말고 파일로 전달
- 수정 전 이슈/질문 먼저 보고, 확인 후 실행
- Gemini로 프롬프트 정리 → Claude에서 실행

## ★ 파일 패키징 규칙 (Claude 필독)
Nick은 GitHub 업로드 시 **한 번에 드래그&드롭**으로 끝낼 수 있도록
zip 안의 폴더 구조가 GitHub 레포 구조와 **정확히 일치**해야 함.

### ✅ 올바른 zip 구조 (한 번 업로드로 끝)
```
rye-v13.x.zip
├── src/
│   ├── App.jsx          ← src/ 하위에 위치
│   ├── constants.jsx    ← v13.0-1 신규 (constants.js 삭제 후 대체)
│   └── utils.js         ← v13.0-1 신규
├── public/
│   ├── manifest.json
│   ├── manifest-myryk.json
│   └── manifest-register.json
├── index.html
├── package.json
├── history.txt
└── handoff.md
```

### 작업 시 Claude가 항상 지킬 것
1. 항상 `/home/claude/rye-vXX/` 작업 디렉토리를 만들고 GitHub 레포와 동일한 폴더 구조로 작업
2. App.jsx는 반드시 `src/App.jsx`에 위치
3. manifest, favicon 등 정적 파일은 `public/` 하위에
4. zip 생성 시 폴더 구조 그대로 압축 (`-x "*/.*"` 옵션으로 숨김 파일 제외)
5. 빌드 검증 시 main.jsx와 firebase.js가 zip에 없으면 사용자에게 별도 첨부 요청
6. 파일이 1~2개만 변경됐다면 zip 대신 개별 파일만 전달해도 OK
