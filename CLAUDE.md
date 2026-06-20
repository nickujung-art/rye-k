# RYE-K K-Culture Center

> 국악 교육기관 통합 관리 PWA — 회원·강사·출석·수납·기관(B2B)

## 기술 스택
React 18 + Vite 5 · CSS-in-JS(`src/constants.jsx` CSS 문자열 → `<style>`) · Firebase v10 Firestore+Auth  
GitHub(`nickujung-art/rye-k`) → Cloudflare Pages 자동 배포 · 번들 ~1228KB / gzip ~311KB

## CRITICAL — 데이터 안전

**`saveStudents([...])` 절대 금지** (throw만 함). 배열 전체 덮어쓰기 → 77명 손실 사고 전례.  
학생 CRUD는 반드시 per-op 트랜잭션: `addStudentDoc` / `updateStudentDoc` / `deleteStudentDoc` / `batchStudentDocs` (모두 `runTransaction(db, ...)` 기반, React state 기준 아님)

**`generateSeedData()`는 `rye-attendance` / `rye-payments` 절대 금지** (2026-05-14 씨드 오발동으로 출석·레슨노트 전체 삭제). 씨드 대상: teachers·students·notices·activity 4개만.

**DB 백업**: Firebase PITR 7일·자동백업 14/30일·삭제보호 구축(2026-05-16). 작업 전: `npm run db:backup`. 복원: `npm run db:restore` / `db:restore:dry`.

## CRITICAL — UI
- **`window.confirm` / `window.alert` 절대 금지.** 모든 확인은 인라인 UI 또는 커스텀 모달.
- 채팅창에 전체 코드 출력 금지. Edit/str_replace 정밀 수정만.

## CRITICAL — 배포·릴리즈
- **`git push` 자동 금지.** "푸시해줘"/"배포해줘" 명시 요청 시만. 수정→`npm run build` 통과→**멈추고 보고**.
- **releases.js 변경은 Nick 명시 승인 후에만.** 초안 채팅에 먼저 보여주고 "확인했어"/"이대로 써줘"/"OK" 후 파일 반영+커밋.  
  "다음 진행해줘"/"계속해줘"는 승인 아님. 대상: `src/constants/releases.js` · `UpdatePopup.jsx` · `SystemNewsView.jsx`

## 기능 상태 레지스트리 — MUST READ FIRST

**세션 시작 시 또는 기능 개발 여부 판단 전, 반드시 `.planning/features.json` 을 먼저 읽는다.**

- `done` 상태 기능은 재개발 제안 금지.
- `deferred` 상태 기능은 명시적으로 연기된 것 — 자동 제안 금지, Nick이 재논의 요청 시만 꺼낸다.
- 기능 관련 결정이 확정되면 **즉시** features.json 업데이트:
  - 새 기능 확정 → `todo` 항목 추가
  - 개발 시작 → `in_progress`
  - 완료 + 검증 → `done` + `completedAt`
  - 의도적 연기 → `deferred` + `deferredTo` + `notes`에 이유

## 일반 규칙
- 수정 전 이슈/질문 먼저 보고 → 확인 후 실행.
- 리팩토링과 기능 추가는 동일 세션에 섞지 말 것. 한 세션 1~2 기능 제한.
- **cross-import 주의**: `LessonEditor`(StudentManagement.jsx) → App.jsx + AdminTools도 import. `InstSelector`(TeacherManagement.jsx) → App.jsx도 import.
- 기관(`isInstitution=true`) 가상회원은 `StudentsView`·`Dashboard.students` 제외. 출석/수납/스케줄/레슨노트에만 주입.

## 명령어
```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드 → dist/
npm run preview  # 빌드 결과 미리보기
```
테스트 러너 없음. 검증은 `npm run build` 통과 + 브라우저 확인.

## 파일 구조
```
src/
├── App.jsx              — 라우팅 + MainApp(상태·리스너) + generateSeedData
├── constants.jsx        — 상수 + IC(SVG 아이콘) + CSS 문자열
├── constants/releases.js — 릴리즈 히스토리 (RELEASES, LATEST_RELEASE, CURRENT_VERSION)
├── utils.js             — 순수 헬퍼 함수 (expandInstitutionsToMembers 포함)
├── firebase.js          — Firebase 초기화·인증·runTransaction export
└── components/
    ├── shared/CommonUI.jsx · HelpSystem.jsx · layout/NavLayout.jsx · auth/UserAuth.jsx
    ├── dashboard/Dashboard.jsx
    ├── student/StudentManagement.jsx — LessonEditor★, StudentFormModal, BulkFeeModal, StudentsView
    ├── teacher/TeacherManagement.jsx — InstSelector★, TeacherFormModal, TeachersView
    ├── attendance/Attendance.jsx     — AttendanceView, LessonNotesView, NoteCommentsPanel
    ├── payment/PaymentsView.jsx · notice/NoticeManagement.jsx
    ├── institution/Institutions.jsx — InstClassEditor, InstitutionFormModal, InstitutionsView
    ├── analytics/AnalyticsView.jsx · admin/AdminTools.jsx · portal/PublicPortal.jsx
    ├── ScheduleView.jsx · TimetableView.jsx
    └── updates/UpdatePopup.jsx · SystemNewsView.jsx
```

## Firestore 컬렉션
`appData` 단일 컬렉션 (문서 ID = 데이터 키):

| 키 | 타입 |
|---|---|
| `rye-teachers` / `rye-students` | Teacher[] / Student[] |
| `rye-attendance` / `rye-payments` | Attendance[] / Payment[] |
| `rye-notices` / `rye-student-notices` | Notice[] / StudentNotice[] |
| `rye-institutions` | Institution[] |
| `rye-categories` / `rye-fee-presets` | object |
| `rye-schedule-overrides` | ScheduleOverride[] |
| `rye-unmatched-payments` / `rye-payment-log` | UnmatchedPayment[] / PaymentLog[] |
| `rye-shop-items` / `rye-ai-reports` / `rye-settings` | ShopItems / AiReport[] / Settings |
| `rye-activity` / `rye-pending` / `rye-trash` | Log[] / Pending[] / TrashItem[] |
| `rye-settlement-records` | SettlementRecord[] |

별도 최상위 컬렉션 (`appData` 외부):

| 컬렉션 | 타입 |
|---|---|
| `rye-lesson-slots` | LessonSlot[] |

## 권한 체계
| 역할 | 회원 | 기관 | 수강료 | 연락처 |
|---|---|---|---|---|
| admin/manager | 전체 | 전체 | 열람·수정 | 가능 |
| teacher | 담당만 | 담당 열람만 | 숨김 | 숨김 |

## 핵심 데이터 구조
```js
// 회원
{ id, name, birthDate, startDate, phone, guardianPhone, teacherId,
  lessons: [{ instrument, teacherId, schedule: [{ day, time }], slotId }],
  photo, notes, monthlyFee, status: "active"|"paused"|"withdrawn", studentCode, createdAt }

// 강사
{ id, name, instrument, phone, email, role: "teacher"|"manager"|"admin",
  color?: string,              // TEACHER_PALETTE hex (예: "#F97316"), 자동배정
  colorAutoAssigned?: boolean, // true: 시스템 자동배정, false/undefined: 수동선택
  pwResetV12?: boolean, createdAt }

// 수납 (partial payment 지원)
{ id, studentId, month, amount, paid: boolean,
  paidAmount?: number,  // undefined/null → 완납으로 간주 (역호환), 0 → 실제 미납
  paidDate?: string, note?: string, createdAt }

// 정산 레코드 (appData/rye-settlement-records)
{ teacherId, month, confirmedAt, confirmedBy,
  result: { baseSalary, deductions, netPay, ... } }

// 레슨 슬롯 (rye-lesson-slots 별도 컬렉션)
{ id, name, teacherId, instrument, day, time, type: "individual"|"group", studentIds: [] }

// 기관
{ id, name, type: "school"|"center"|"company"|"government"|"other",
  address, contactName, contactPhone, contactEmail, bizNumber, teacherId,
  classes: [{ id, name, instrument, teacherId, schedule, participantCount, monthlyFee, notes }],
  contractStart, contractEnd, status: "active"|"paused"|"expired", notes, photo, createdAt }

// 가상회원 (런타임, DB 저장 안 함) — expandInstitutionsToMembers() 변환
{ id: `inst_${instId}_${classId}`, isInstitution: true, ... }

// 출석
{ id, studentId, teacherId, date, status: "present"|"absent"|"late"|"excused",
  lessonNote, note,
  comments: [{ id, text, authorType: "teacher"|"manager"|"admin"|"student",
               authorName, authorId, createdAt, deletedAt, deletedBy }],
  participantCount, createdAt, updatedAt }
```

## localStorage 키
| 키 | 용도 |
|---|---|
| `rye-session` / `rye-theme` | 강사 세션 / 다크모드 |
| `ryekSavedId` / `ryekSavedCode` | 저장 아이디 / 회원코드 |
| `ryekAdmin_lnr_{uid}` / `ryekP_lnr_{sid}` | 레슨노트 읽음 시각 |
| `ryekP_rni_{sid}` | 포털 읽은 공지 |
| `ryekPortal` | 포털 자동로그인(sessionStorage) |
| `ryek_lastSeenVersion` / `ryek_last_login` | 업데이트 팝업 버전 / 30일 재인증 |
| `rye-recovery-v1` | 77명 복구 완료 플래그 |

## 알려진 이슈
`monthlyFee` 전부 0 (미입력) · Firebase Auth ↔ 로컬 비번 동기화 깨짐 (fallback 동작 중)

## 최근 배포 이력
| 날짜 | 커밋 | 내용 |
|---|---|---|
| 2026-06-20 | `b1203a1` | 안전성 패치 9건 (isPaid 역호환·정산 DB·teacher 권한·색상 fallback 등) |
| 2026-06-20 | `edbcd3a` | 강사 테마색상·정산뷰 전면 재작성·부분납부·도움말 시스템 |
| 2026-06-16 | — | Phase 9 스케줄 고도화 (슬롯 자동생성·PauseManagementView) |

## 개발 워크플로우

### 브랜치 구조
| 브랜치 | 역할 | 배포 대상 |
|--------|------|-----------|
| `main` | 프로덕션 — 강사가 실제 사용하는 라이브 서버 | `app.ryekorea.com` |
| `staging` | 스테이징 — 온라인 검수 전용 | `https://staging.rye-k.pages.dev` |

**`main` 직접 커밋 금지.** 모든 개발은 `staging`에서 하고, 검수 통과 후 `main`으로 병합.

### 표준 개발 플로우
```
1. staging 브랜치에서 코딩
           ↓
2. npm run build 통과 확인 (로컬)
           ↓
3. git push origin staging
   → Cloudflare 자동 빌드 → staging URL 생성
           ↓
4. Nick이 staging URL에서 온라인 검수
           ↓
5. 승인 → staging을 main에 병합 → git push origin main
   → 라이브 자동 반영
```

### 작업 규칙
- 이슈/질문 먼저 보고 → 승인 → Edit/str_replace 정밀수정
- `npm run build` 통과 → **멈추고 보고** → Nick 로컬검증(`npm run dev`) → staging push
- 릴리즈노트 포함 시 문구 컨펌 별도
- AdminTools "샘플 데이터 초기화" 절대 금지

---

## Karpathy Tips
1. **Think Before Coding** — 불분명하면 물어라. 여러 해석은 제시하라.
2. **Simplicity First** — 요청된 것만 최소 구현. 추상화·에러핸들링 요청 없으면 추가 안 함.
3. **Surgical Changes** — 요청 범위 밖 코드 손대지 마라.
4. **Goal-Driven** — `npm run build` 통과가 최소 AC. 다단계 작업은 계획 먼저.
