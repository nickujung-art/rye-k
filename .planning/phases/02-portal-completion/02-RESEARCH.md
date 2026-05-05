# Phase 2: 포털 완성 (Portal Completion) - Research

**Researched:** 2026-05-05
**Domain:** React SPA — PublicPortal.jsx session management, schedule widget, practice-guide Worker auth
**Confidence:** HIGH (all findings verified by direct codebase read)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** 별도 탭 없이 홈 탭 위젯으로 통합한다. TAB_ORDER 변경 없음.
**D-02:** 위젯은 두 섹션: '다음 수업' 카드 + '이번 주 수업' 리스트
**D-03:** 학생이 악기 2개 이상인 경우 모두 표시 (lessons[] 전체 순회)
**D-04:** 담당 강사명은 `rye-teachers` 컬렉션에서 `teacherId`로 조회하여 표시
**D-05:** 로그인 시각을 `localStorage["ryekPortal"]`에 `loginAt: Date.now()` 필드로 함께 저장. `{ code, pw }` → `{ code, pw, loginAt }` 확장
**D-06:** 자동로그인 복원 시 `Date.now() - loginAt > 30 * 24 * 60 * 60 * 1000` → 만료. localStorage 삭제 후 로그인 화면.
**D-07:** 만료 D-3일(27일 경과)부터 홈 탭 최상단에 배너 표시: "로그인이 3일 후 만료됩니다. [30일 연장] [로그아웃]"
**D-08:** 연장 선택 시 `loginAt`을 `Date.now()`로 재설정 (오늘부터 30일 재시작)
**D-09:** 배너에서 응답 없이 만료되면 다음 접속 시 자동 로그아웃

### Claude's Discretion

- **POR-03** (레슨노트 → 학부모 열람): "notes" 탭 이미 존재. 현재 구현 그대로 유지하거나 접근성 보완.
- **POR-04** (연습 가이드): `practice-guide.js` Worker 존재. 레슨노트 탭 내 버튼으로 연결 권장. P1 우선순위. 복잡도에 따라 Phase 2에서 플레이스홀더 처리 후 Phase 3 연결 가능.
- **POR-05** (수납 현황): "pay" 탭 이미 존재. `monthlyFee`가 0인 경우 "데이터 없음" 상태 표시.
- **POR-06** (학부모 통합 뷰): `PublicParentView` 이미 구현. 통합 레이아웃 개선 중심.
- **POR-07** (수강 신청 진입점): 포털 홈 탭 하단에 "수강 신청" 버튼 추가. `/register`로 이동.
- **POR-08** (다자녀 전환): `showSiblingModal` 로직 이미 존재. UX 폴리싱 수준.

### Deferred Ideas (OUT OF SCOPE)

- 연습 가이드 anonymous auth 문제 — 복잡도 높으면 Phase 3으로 이관 가능.
- POR-04가 Phase 2에서 처리 불가 시 플레이스홀더로 처리.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| POR-01 | 포털 세션 유지 — 브라우저 닫기 후 재방문 시 자동 로그인 (30일 만료 + D-3 배너) | `doLogin()` 함수 수정, `useEffect` 복원 로직 2곳 수정 확인 |
| POR-02 | 학생 포털: 시간표(요일·시간) 뷰 — lessons[].schedule 기반 모바일 최적화 | 홈 탭에 기존 "레슨 일정" 섹션 존재, 위젯으로 교체/보강 |
| POR-03 | 학생 포털: 강사 작성 레슨노트 → 학부모 열람 연결 | notes 탭 완전 구현됨, 검증만 필요 |
| POR-04 | 학생 포털: 연습 가이드 표시 — practice-guide.js Worker 연결 | Anonymous auth 차단 이슈 확인 — Worker 우회 방식 결정 필요 |
| POR-05 | 학생 포털: 수납 현황 표시 (이번 달 완납/미납) — monthlyFee 데이터 입력 후 | pay 탭: monthlyFee=0 시 "수납 정보 없음" empty state 추가 |
| POR-06 | 학부모 포털: 자녀 출석·레슨노트·수납 현황 통합 뷰 | PublicParentView가 단일 컴포넌트. 레이아웃 gap/radius 폴리싱 |
| POR-07 | 셀프 수강 신청 — 포털에서 학생/학부모가 신청 → 관리자 승인 흐름 | 홈 탭 최하단 btn-secondary 버튼으로 진입점 추가 |
| POR-08 | 자녀 전환 UX 개선 — 다자녀 세션 관리 | showSiblingModal 완성됨, modal CSS 클래스 통일 수준 |
</phase_requirements>

---

## Summary

Phase 2는 `src/components/portal/PublicPortal.jsx` (~1,828줄) 단일 파일에 집중된다. 이 파일이 `PublicRegisterForm`, `PublicParentView`, 그리고 내부 컴포넌트(`PortalHeatmap`, `PortalSheet`, `MonthlyAttendanceHeatmap`, `PortalEmptyState`)를 모두 포함한다.

**주요 발견사항:**
1. 현재 세션 복원 로직(`useEffect` at line 606)은 `loginAt` 필드가 없어도 동작한다 — 새 필드 추가는 backward compatible하다.
2. `doLogin()` 함수(line 652)가 `localStorage["ryekPortal"]`에 저장하는 유일한 지점이다. 이 함수만 수정하면 `loginAt`이 모든 로그인에 추가된다.
3. 홈 탭에 "레슨 일정" 섹션이 이미 존재한다(line 1150). D-02 스펙의 "다음 수업 카드 + 이번 주 수업 리스트" 위젯은 이 섹션을 교체하거나 위에 삽입하면 된다.
4. `getNextLessonDate()` 함수(line 938)가 이미 구현되어 있다 — 다음 레슨 계산 로직을 재사용할 수 있다.
5. `teachers` state는 `PublicParentView` 내부에서 `useState`로 관리되며 6개 Firestore 리스너로 채워진다. 스케줄 위젯에서 teacher lookup이 가능하다.
6. **POR-04 차단 이슈:** `auth.js`의 `verifyToken()`이 주석에 명시적으로 "Rejects anonymous and unauthenticated Firebase users"라고 명시되어 있다. 포털은 `firebaseSignInAnon()`만 사용하므로 현재 구조에서는 `/api/ai/practice-guide` 호출이 401을 반환한다.

**Primary recommendation:** 8개 요구사항 중 6개(POR-01, POR-02, POR-03, POR-05, POR-06, POR-07, POR-08)는 단일 파일 수정으로 처리 가능. POR-04는 anonymous auth 우회 방식을 먼저 결정해야 한다.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| 세션 만료 체크 (POR-01) | Browser / Client | — | localStorage 읽기/쓰기는 클라이언트 전용 |
| 30일 만료 배너 표시 (POR-01 D-07) | Browser / Client | — | 홈 탭 조건부 렌더링 — React state |
| 시간표 위젯 (POR-02) | Browser / Client | — | student.lessons[] + teachers[] 모두 이미 클라이언트 state에 있음 |
| 레슨노트 열람 (POR-03) | Browser / Client | Firestore (읽기) | notes 탭 이미 존재, 추가 tier 없음 |
| 연습 가이드 (POR-04) | Cloudflare Worker | Firebase Auth | Worker가 Bearer token 검증 필요 — anonymous 차단 |
| 수납 현황 (POR-05) | Browser / Client | Firestore (읽기) | pay 탭에 empty state만 추가 |
| 학부모 통합 뷰 (POR-06) | Browser / Client | — | PublicParentView 동일 컴포넌트, 레이아웃 폴리싱 |
| 수강 신청 진입점 (POR-07) | Browser / Client | — | /register로 navigate, 별도 Worker 없음 |
| 다자녀 전환 UX (POR-08) | Browser / Client | — | showSiblingModal 이미 완성, CSS 클래스 통일만 |

---

## Standard Stack

### Core (이미 사용 중)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 18.x | UI 렌더링 | 프로젝트 표준 |
| Firebase v10 | 10.x | Firestore onSnapshot, Auth | 기존 구조 |
| Vite | 5.x | 빌드 | 프로젝트 표준 |

### Supporting (이미 사용 중)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `jose` (Cloudflare Worker) | — | JWT 검증 (`auth.js`) | Worker에서 Firebase token 검증 시 |

**설치 불필요:** Phase 2는 새 패키지를 추가하지 않는다. 모든 필요 기능은 기존 스택으로 구현된다.

---

## Architecture Patterns

### System Architecture Diagram

```
[Browser: localStorage["ryekPortal"]]
        │ { code, pw, loginAt }  ← Phase 2에서 loginAt 추가
        ▼
[PublicParentView component mount]
        │
        ├─ loginAt 없음 → 기존 방식 (backward compatible)
        ├─ Date.now() - loginAt > 30d → 만료 → localStorage 삭제 → 로그인 화면
        └─ Date.now() - loginAt > 27d → showExpiryBanner = true
                │
                ▼
        [홈 탭 최상단에 만료 배너 sticky 렌더]
                │
                ├─ "30일 연장" → loginAt = Date.now() 재저장 → 배너 사라짐
                └─ "로그아웃" → localStorage 삭제 → 로그인 화면 (즉시, confirm 없음)

[Firestore: 6 onSnapshot listeners]
  rye-students → student.lessons[] → 시간표 위젯 재료
  rye-teachers → teachers[] → teacherId lookup
  rye-attendance → 출결 탭
  rye-payments → 수납 탭
  rye-student-notices → 공지 탭
  rye-ai-reports → 리포트 탭

[홈 탭 렌더 순서 (Phase 2 이후)]
  1. 만료 배너 (sticky, D-3일 이내만)   ← POR-01 D-07 신규
  2. 다음 수업 카드 + 이번 주 수업 리스트  ← POR-02 신규 위젯
  3. 이달 출석 (MonthlyAttendanceHeatmap) ← 기존
  4. 공지사항 (최대 2건)                 ← 기존
  5. 연습 가이드 (practiceGuide.body)     ← 기존 (POR-04 이슈)
  6. 월간 리포트 (published만)            ← 기존
  7. 레슨 일정                           ← 기존 (위젯 추가 후 유지 or 통합 결정 필요)
  8. 최근 레슨노트 (2건)                 ← 기존
  9. 이번 달 수납                        ← 기존
 10. 기본 정보                           ← 기존
 11. 수강 신청하기 → 버튼 (btn-secondary)  ← POR-07 신규

[Cloudflare Worker: /api/ai/practice-guide]
  _middleware.js → verifyToken(request) → 401 for anonymous users
                                         ← POR-04 차단 포인트
```

### Recommended Project Structure

Phase 2는 구조 변경 없음. 단일 파일 수정:

```
src/
├── components/portal/
│   └── PublicPortal.jsx    ← 모든 Phase 2 변경사항의 유일한 대상
├── constants.jsx            ← 새 CSS 클래스 6개 추가 (UI-SPEC 명시)
└── utils.js                 ← 변경 없음
```

---

## Detailed Code Findings

### POR-01: 세션 만료 — 수정 대상 2곳

**수정 포인트 1: `doLogin()` 함수 (line 652-673)**

현재 코드 (line 666-669):
```js
localStorage.setItem("ryekPortal", JSON.stringify({
  code: found.studentCode,
  pw: getBirthPassword(found.birthDate)
}));
```

수정 후:
```js
localStorage.setItem("ryekPortal", JSON.stringify({
  code: found.studentCode,
  pw: getBirthPassword(found.birthDate),
  loginAt: Date.now()   // ← D-05 추가
}));
```

**수정 포인트 2: 자동로그인 복원 `useEffect` (line 607-621)**

현재 코드:
```js
const saved = JSON.parse(localStorage.getItem("ryekPortal") || "null");
if (saved?.code && saved?.pw) {
  const found = students.find(s => s.studentCode === saved.code);
  if (found && getBirthPassword(found.birthDate) === saved.pw
      && (found.status || "active") === "active") {
    setStudent(found);
    setLoggedIn(true);
    initReadState(found.id);
  }
}
```

수정 후: `loginAt` 체크를 조건에 추가:
```js
const saved = JSON.parse(localStorage.getItem("ryekPortal") || "null");
if (saved?.code && saved?.pw) {
  // D-06: 30일 만료 체크
  if (saved.loginAt && Date.now() - saved.loginAt > 30 * 24 * 60 * 60 * 1000) {
    localStorage.removeItem("ryekPortal");
    return; // 로그인 화면으로
  }
  const found = students.find(s => s.studentCode === saved.code);
  if (found && getBirthPassword(found.birthDate) === saved.pw
      && (found.status || "active") === "active") {
    setStudent(found);
    setLoggedIn(true);
    initReadState(found.id);
  }
}
```

**수정 포인트 3: 홈 탭 렌더 + 배너 state**

`PublicParentView`에 `showExpiryBanner` state 추가. 로그인 직후(또는 홈 탭 진입 시) `loginAt`을 읽어 27일 초과 여부 체크.

배너는 `tab === "home"` 렌더 블록 **최상단** (line 1094 `<div>` 바로 아래)에 삽입.

`loginAt`은 `localStorage["ryekPortal"]`에서 읽는다 — Firestore 요청 불필요.

**backward compatibility:** 기존 사용자의 `{ code, pw }` (loginAt 없음) → 만료 체크 skip → 정상 자동 로그인. `loginAt`이 없으면 D-07 배너도 표시하지 않는다 (안전).

---

### POR-02: 시간표 위젯 — 기존 코드 재사용 분석

**`getNextLessonDate()` 재사용 가능 (line 938-964):**

이 함수는 이미 `nextLesson` 변수로 계산되어 Quick Stats 섹션(line 1060)에서 사용 중. 위젯에서 동일 변수를 참조하면 된다 — 중복 계산 없음.

반환값 구조:
```js
{
  date: Date,         // 다음 레슨 날짜
  dDay: number,       // 0=오늘, 1=내일, ...
  dayName: string,    // "화", "목" 등
  lessons: Lesson[],  // 그날 해당하는 lesson[] 항목들
  time: string        // 가장 이른 시간 "15:00"
}
```

**이번 주 수업 리스트 계산 로직 (신규 구현 필요):**

현재 홈 탭에는 "레슨 일정" 섹션(line 1150)이 있다. 이 섹션은 `lessons[].schedule[]`을 전부 나열한다. D-02의 "이번 주 수업 리스트"는 이 섹션과 중복될 수 있다.

**결정 필요:** 기존 "레슨 일정" 섹션을 그대로 두고 위에 새 위젯을 추가할지, 또는 기존 섹션을 위젯으로 교체할지. CONTEXT.md는 기존 섹션 삭제를 명시하지 않는다.

**권장 판단:** 기존 "레슨 일정" 섹션은 유지하고, 위젯을 MonthlyAttendanceHeatmap **위에** (공지 위에) 삽입한다. 위젯은 UI-SPEC의 `.portal-next-lesson` + `.portal-week-chips` 패턴으로 구현.

**이번 주 수업 계산 패턴:**

```js
// 이번 주 = 오늘부터 6일 이내
const thisWeekLessons = [];
for (let i = 0; i <= 6; i++) {
  const d = new Date();
  d.setDate(d.getDate() + i);
  const dayName = DAYS[(d.getDay() + 6) % 7]; // 월=0 기준
  (student.lessons || []).forEach(l => {
    (l.schedule || []).filter(sc => sc.day === dayName).forEach(sc => {
      thisWeekLessons.push({
        dayName,
        time: sc.time,
        instrument: l.instrument,
        teacherId: l.teacherId,
        daysFromNow: i
      });
    });
  });
}
```

주의: `DAYS = ["월","화","수","목","금","토","일"]` (constants.jsx). JS `getDay()`는 일=0 기준이므로 변환이 필요하다.

**다중 악기 (D-03):** `lessons[]` 전체 순회 — `nextLesson.lessons` 배열에 해당 날짜의 모든 lesson이 포함된다. UI-SPEC은 "lesson per instrument card" 방식을 명시.

**강사 이름 조회 (D-04):**
```js
const teacher = teachers.find(t => t.id === l.teacherId)?.name || "강사 미배정";
```
`teachers` state는 이미 `PublicParentView` 스코프에서 사용 가능.

---

### POR-03: 레슨노트 열람 — 검증 결과

Notes 탭(line 1428-1583)은 완전히 구현되어 있다:
- 월별 그룹화
- 강사 이름/사진 표시 (`noteTeacher`)
- 컨디션 배지, 진도, 과제, 보강 안내
- `NoteCommentsPanel` 연동 (학생이 댓글 달기 가능)
- 이달 요약 헤더

**결론:** POR-03 구현 완료. 추가 작업 불필요.

---

### POR-04: 연습 가이드 — 차단 이슈 (중요)

**차단 원인 확인 (VERIFIED by codebase read):**

`functions/api/ai/_middleware.js`:
```js
const payload = await verifyToken(request);
if (!payload) {
  return new Response("Unauthorized", { status: 401 });
}
```

`functions/api/ai/_utils/auth.js` (line 10):
```
// Returns the verified JWT payload, or null if verification fails.
// Rejects anonymous and unauthenticated Firebase users.
```

`jwtVerify`는 Firebase Anonymous Auth 토큰도 유효한 JWT로 발급되지만, 이 함수는 `payload.sub`만 체크한다. **Anonymous auth의 경우 `sub` (uid)가 존재하므로 기술적으로 통과할 수 있다.**

**재검토:** `jwtVerify` 검증 시 issuer + audience + 서명이 유효하고 `payload.sub`가 있으면 통과. Firebase Anonymous Auth는 실제로 `sub` 포함된 유효한 JWT를 발급한다. 코드상 anonymous 여부를 별도로 확인하는 로직이 없다.

**결론 수정:** Anonymous Firebase token은 기술적으로 middleware를 통과할 가능성이 높다. 그러나 포털에서 Firebase Auth ID token을 가져오는 코드가 현재 존재하지 않는다 — `firebaseSignInAnon()`만 호출하고 `getIdToken()`은 호출하지 않는다.

**POR-04 구현에 필요한 추가 작업:**
1. Firebase Auth current user에서 `getIdToken()` 호출하여 Bearer token 획득
2. `practice-guide.js` Worker로 POST 요청 (progress, assignment, content, instrument 전달)
3. Worker가 `student.practiceGuide.body`를 어디에 저장하는지 확인 필요

**현재 `student.practiceGuide.body` 렌더링 (line 1121):**
```js
{student.practiceGuide?.body && (
  <div style={{marginBottom:16}}>...
    {student.practiceGuide.body}
  ...
  </div>
)}
```
`practiceGuide`는 student 객체의 필드로 되어 있다. Worker가 이를 어떻게 저장하는지는 `practice-guide.js`에 없다 — Worker는 AI 결과만 반환하고, 저장은 클라이언트 측에서 해야 한다. 현재 저장 코드가 없다.

**권장 (Claude's Discretion):** POR-04 구현 범위를 "레슨노트 탭에 '연습 가이드 생성' 버튼 추가 + Worker 연결 + 결과를 임시 state에 표시"로 한정하고, `student` 객체에 저장하는 것은 Phase 3으로 이관. `student.practiceGuide.body` 기존 렌더는 건드리지 않는다. 구현 복잡도에 따라 Phase 2 플레이스홀더 처리 가능.

---

### POR-05: 수납 현황 — 빈 상태 처리

현재 pay 탭(line 1659-1780):
```js
{sPay.length === 0
  ? <PortalEmptyState title="수납 기록이 없습니다" sub="수납 정보가 등록되면 이곳에서 확인하실 수 있어요." />
  : sPay.slice(0,24).map(...)
}
```

`monthlyFee === 0` 케이스가 현재 처리되지 않는다. `sPay.length > 0`이지만 `student.monthlyFee === 0`인 경우, 수납 명세서가 렌더되고 "기본 수강료: 0원"으로 표시된다.

**UI-SPEC 명시 empty state:**
- Heading: "수납 정보 없음"
- Body: "이번 달 수강료가 등록되지 않았습니다."
- Sub: "담당 선생님이나 관리자에게 문의해주세요."

기존 `PortalEmptyState` 컴포넌트 재사용 가능. 조건: `sPay.length === 0 && (student.monthlyFee || 0) === 0`.

---

### POR-06: 학부모 통합 뷰 — 현황

`PublicParentView`는 학생과 학부모 모두에게 단일 뷰를 제공한다 (별도 학부모 뷰가 없다). CONTEXT.md는 "통합 레이아웃 개선 중심"으로 정의했다.

기존 `.parent-wrap`, `.parent-section`, `.parent-section-title` 클래스는 CSS에 이미 존재한다. UI-SPEC은 "consistent 16px vertical gap and `--radius` on all cards"를 요구한다.

**작업 범위:** 홈 탭 각 섹션의 `marginBottom`을 16px로 통일, 카드 `border-radius`를 `var(--radius-lg)` 또는 `var(--radius)`로 통일. 신규 컴포넌트 없음.

---

### POR-07: 수강 신청 진입점

`PublicRegisterForm`은 `/register` 라우트에서 렌더된다. 포털 내에서는 URL 변경 또는 라우팅을 통해 이동해야 한다.

현재 App.jsx의 라우팅 구조 확인 필요. 포털이 SPA이므로 `window.location.href = "/register"` 또는 React Router 방식 중 선택.

홈 탭 최하단(line 1238 기본 정보 섹션 이후)에 버튼 추가:
```jsx
<button
  className="btn btn-secondary btn-full"
  onClick={() => window.location.href = "/register"}
>
  수강 신청하기 →
</button>
```

`window.confirm` 없음. 즉시 이동.

---

### POR-08: 다자녀 전환 UX — 현황

**로그인 전 자녀 선택 모달 (line 884-901):**
- `childCandidates.length > 0` 조건으로 표시
- `ChildCard` 컴포넌트 (인라인 스타일)
- "← 돌아가기" 버튼

**로그인 후 자녀 전환 모달 (line 1789-1823):**
- `showSiblingModal` 조건으로 표시
- 형제 목록: 동일 연락처 기준 (`siblings` 배열)
- `handleSiblingSwitch()` — password 없이 즉시 전환 (같은 보호자 신뢰 모델)

**UI-SPEC 요구사항 (POR-08 polishing):**
- 모달에 `.mb` / `.modal` / `.modal-h` / `.modal-b` / `.modal-f` 클래스 적용
- child candidate card: `tl-student-item` 패턴
- error state: `.form-err` 클래스 사용

현재 모달은 인라인 스타일을 사용하고 있어 CSS 클래스 적용이 필요하다. 기능 변경 없음, 스타일만 통일.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| 날짜 계산 (다음 레슨) | 직접 Date 연산 | 기존 `getNextLessonDate()` 재사용 | 이미 7일 순환, 당일 시간 체크, 다중 악기 처리 완성 |
| 만료 시각 계산 | 별도 타이머/interval | `Date.now()` 단순 비교 on mount | setInterval 불필요 — 탭 진입 시점에 체크로 충분 |
| 출석 통계 | 직접 필터 | 기존 `computeMonthlyAttStats()` | utils.js에 이미 present/late/absent/excused 합산 |
| Firestore 읽기 | 추가 onSnapshot | 기존 6개 리스너 재사용 | `rye-teachers` 포함, Phase 2 신규 리스너 불필요 |
| 학부모 뷰 라우팅 | 별도 컴포넌트/라우트 | `PublicParentView` 단일 컴포넌트 | 학생/학부모 공통 뷰 아키텍처 유지 |

**Key insight:** Phase 2의 모든 데이터는 이미 클라이언트 state에 있다. Firestore 추가 쿼리가 필요한 요구사항이 없다.

---

## Common Pitfalls

### Pitfall 1: `loginAt` 없는 기존 세션 처리
**What goes wrong:** 기존 사용자는 `{ code, pw }`만 저장되어 있다. `saved.loginAt`이 `undefined`이면 `Date.now() - undefined = NaN` → 만료 체크 실패로 localStorage 삭제.
**Why it happens:** `undefined > threshold`는 `false`, `NaN > threshold`도 `false`이므로 실제로 문제가 없을 수 있지만, 명시적 가드가 안전하다.
**How to avoid:** `if (saved.loginAt && Date.now() - saved.loginAt > ...)` — `loginAt` 존재 여부를 먼저 체크.
**Warning signs:** 기존 사용자가 재방문 시 자동 로그아웃.

### Pitfall 2: 홈 탭 sticky 배너 z-index 충돌
**What goes wrong:** 배너가 `position: sticky; top: 0` 이지만, 상위 sticky nav bar (`z-index: 200`) 아래에 숨겨질 수 있다.
**Why it happens:** 배너가 `.portal-body` 스크롤 컨텍스트 안에 있으므로 nav bar와 z-index 스택이 다르다.
**How to avoid:** 배너의 `top: 0`은 `.portal-body` 스크롤 컨텍스트 기준이다 — 별도 z-index 불필요. 단, sticky nav bar 높이(`--topbar-h + tab-bar height`)를 고려하여 배너가 nav 아래에 위치해야 한다.
**Warning signs:** 배너가 탭바 뒤로 숨거나 스크롤 시 사라짐.

실제 구조를 보면 `.portal-body`는 sticky nav 아래에 있는 일반 flow div이므로, 배너를 `tab === "home"` 블록의 첫 번째 자식으로 두면 된다. `position: sticky; top: 0`은 이 스크롤 컨테이너 내에서 동작한다.

### Pitfall 3: `DAYS` 배열과 JS `getDay()` 불일치
**What goes wrong:** `DAYS = ["월","화","수","목","금","토","일"]` (월=0). JS `getDay()`는 일=0, 월=1. 변환 없이 사용하면 요일 매칭 오류.
**Why it happens:** 기존 `getNextLessonDate()`는 이미 `["일","월","화","수","목","금","토"][d.getDay()]`로 올바르게 변환한다.
**How to avoid:** 이번 주 수업 리스트에서도 동일 변환 패턴 사용: `const dayName = ["일","월","화","수","목","금","토"][d.getDay()]`.
**Warning signs:** 특정 요일 수업이 표시 안 됨 / 다른 요일 수업이 표시됨.

### Pitfall 4: `window.confirm` 사용
**What goes wrong:** CLAUDE.md CRITICAL 규칙 위반 — 빌드는 통과하지만 운영 방침 위반.
**Why it happens:** 로그아웃 버튼에 "정말 로그아웃하시겠습니까?" 확인을 추가하고 싶은 충동.
**How to avoid:** 배너의 "로그아웃" 버튼은 확인 없이 즉시 실행. UI-SPEC 명시: "No `window.confirm`. Immediate action on tap."

### Pitfall 5: CSS 외부 파일 생성
**What goes wrong:** `.css` 파일을 별도 생성하면 아키텍처 규칙 위반.
**Why it happens:** 새 CSS 클래스를 추가할 때 별도 파일이 편하지만 금지.
**How to avoid:** 모든 새 CSS 클래스는 `src/constants.jsx`의 `CSS` 문자열에 추가.

### Pitfall 6: saveStudents 호출
**What goes wrong:** CLAUDE.md CRITICAL — 데이터 유실 위험.
**Why it happens:** 학생 데이터를 수정할 때 배열 전체 저장 시도.
**How to avoid:** Phase 2는 학생 데이터 수정이 없다 (read-only 뷰). `saveStudents` 호출 가능성 없음.

---

## Code Examples

### 배너 state 추가 패턴

```jsx
// [VERIFIED: PublicPortal.jsx line 484-520 state 패턴 기반]
const [showExpiryBanner, setShowExpiryBanner] = useState(false);

// 자동로그인 복원 useEffect에서 체크
useEffect(() => {
  if (!loading && students.length > 0 && !loggedIn) {
    try {
      const saved = JSON.parse(localStorage.getItem("ryekPortal") || "null");
      if (saved?.code && saved?.pw) {
        // D-06: 만료 체크 (loginAt 없는 기존 세션은 skip)
        if (saved.loginAt && Date.now() - saved.loginAt > 30 * 24 * 60 * 60 * 1000) {
          localStorage.removeItem("ryekPortal");
          return;
        }
        const found = students.find(s => s.studentCode === saved.code);
        if (found && getBirthPassword(found.birthDate) === saved.pw
            && (found.status || "active") === "active") {
          setStudent(found);
          setLoggedIn(true);
          initReadState(found.id);
          // D-07: D-3일 배너 체크
          if (saved.loginAt && Date.now() - saved.loginAt > 27 * 24 * 60 * 60 * 1000) {
            setShowExpiryBanner(true);
          }
        }
      }
    } catch {}
  }
}, [loading, students]);
```

### 배너 렌더 패턴 (홈 탭)

```jsx
// [VERIFIED: UI-SPEC 02-UI-SPEC.md Component Inventory #2]
// CSS 클래스는 constants.jsx에 추가 필요
{tab === "home" && (
  <div>
    {/* D-07: 만료 배너 */}
    {showExpiryBanner && (
      <div className="portal-expiry-banner fade-up">
        <span className="portal-expiry-text">로그인이 3일 후 만료됩니다.</span>
        <button
          type="button"
          className="portal-expiry-extend"
          onClick={() => {
            const saved = JSON.parse(localStorage.getItem("ryekPortal") || "{}");
            localStorage.setItem("ryekPortal", JSON.stringify({
              ...saved,
              loginAt: Date.now()
            }));
            setShowExpiryBanner(false);
          }}
        >
          30일 연장
        </button>
        <button
          type="button"
          className="portal-expiry-logout"
          onClick={() => {
            localStorage.removeItem("ryekPortal");
            setLoggedIn(false);
            setStudent(null);
            setShowExpiryBanner(false);
          }}
        >
          로그아웃
        </button>
      </div>
    )}
    {/* 나머지 홈 탭 콘텐츠 */}
  </div>
)}
```

### doLogin 수정 패턴

```js
// [VERIFIED: PublicPortal.jsx line 666-669 현재 코드 기반]
// loginAt 추가:
localStorage.setItem("ryekPortal", JSON.stringify({
  code: found.studentCode,
  pw: getBirthPassword(found.birthDate),
  loginAt: Date.now()  // D-05
}));
```

### 이번 주 수업 리스트 계산

```js
// [VERIFIED: DAYS, TODAY_DAY 상수 constants.jsx line 9-13 기반]
const getThisWeekSchedule = () => {
  const result = [];
  for (let i = 0; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dayName = ["일","월","화","수","목","금","토"][d.getDay()];
    (student.lessons || []).forEach(l => {
      (l.schedule || []).filter(sc => sc.day === dayName).forEach(sc => {
        result.push({
          dayName,
          time: sc.time || "",
          instrument: l.instrument || "",
          teacherName: teachers.find(t => t.id === l.teacherId)?.name || "강사 미배정",
          daysFromNow: i
        });
      });
    });
  }
  return result.sort((a, b) => {
    if (a.daysFromNow !== b.daysFromNow) return a.daysFromNow - b.daysFromNow;
    return (a.time || "").localeCompare(b.time || "");
  });
};
```

### CSS 클래스 추가 위치 (constants.jsx)

```js
// [VERIFIED: src/constants.jsx CSS 문자열 패턴]
// CSS 문자열 내 적절한 섹션에 추가:
/* ── Portal Schedule Widget ────────────────────────────────── */
.portal-next-lesson{background:var(--hanji);border:1px solid var(--border);border-radius:var(--radius-lg);padding:16px;box-shadow:var(--shadow)}
.portal-next-lesson-inst{font-family:'Noto Serif KR',serif;font-size:14px;font-weight:600;color:var(--blue);margin-bottom:4px}
.portal-next-lesson-time{font-size:20px;font-family:'Noto Serif KR',serif;font-weight:600;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1.2}
.portal-next-lesson-teacher{font-size:12px;color:var(--ink-60);margin-top:8px}
.portal-week-chips{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
.portal-week-chip{background:var(--blue-lt);color:var(--blue);font-size:12px;padding:4px 12px;border-radius:8px}

/* ── Portal Expiry Banner ──────────────────────────────────── */
.portal-expiry-banner{background:var(--gold-lt);border-bottom:2px solid var(--gold);padding:12px 16px;display:flex;align-items:center;gap:8px;flex-wrap:wrap;position:sticky;top:0;z-index:10}
.portal-expiry-text{font-size:14px;color:var(--ink);flex:1;line-height:1.5}
.portal-expiry-extend{background:var(--blue);color:#fff;font-size:12px;font-weight:600;border-radius:var(--radius-sm);padding:8px 16px;border:none;cursor:pointer;min-height:44px}
.portal-expiry-logout{background:none;border:none;color:var(--red);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;padding:8px;min-height:44px}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| sessionStorage (세션 전용) | localStorage (영구) | Phase 2 목표 | 브라우저 닫아도 유지됨 |
| `{ code, pw }` localStorage 구조 | `{ code, pw, loginAt }` | Phase 2 D-05 | 30일 만료 정책 가능 |
| 수납 현황 "기록 없음" 단일 empty state | monthlyFee=0 별도 안내 | Phase 2 POR-05 | 데이터 부재 이유 명확히 전달 |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | POR-04 Anonymous Firebase token이 `verifyToken()`을 통과한다 | POR-04 섹션 | 통과 못하면 401 — `getIdToken()` 획득 코드 필요 |
| A2 | "레슨 일정" 섹션(line 1150) 유지 + 위에 신규 위젯 삽입이 D-01/D-02와 충돌하지 않는다 | POR-02 섹션 | 중복 UI로 Nick 피드백 가능 — 플래너가 확인 요청 추가 가능 |

---

## Open Questions

1. **POR-04 구현 범위**
   - What we know: Worker는 완성됨. Anonymous token 통과 가능성은 높지만 `getIdToken()` 코드가 없다.
   - What's unclear: Phase 2에서 완전 구현할지(firebase.js에 `getIdToken` export 추가) vs. 플레이스홀더로 처리할지.
   - Recommendation: CONTEXT.md deferred 항목 참고. 복잡도 낮으면 구현, 높으면 플레이스홀더. planner가 wave별로 구분.

2. **기존 "레슨 일정" 섹션 처리**
   - What we know: 홈 탭에 이미 존재 (line 1150). D-02 위젯과 정보가 일부 중복.
   - What's unclear: 기존 섹션 제거 여부 (CONTEXT.md 미명시).
   - Recommendation: 기존 섹션 유지, 위젯을 위에 추가하는 방식으로 planner가 계획. Nick 검증 후 필요 시 제거.

3. **POR-04 `student.practiceGuide` 저장 주체**
   - What we know: Worker는 AI 결과를 JSON으로 반환만 함. 저장 코드 없음.
   - What's unclear: Phase 2에서 저장까지 구현할지.
   - Recommendation: Phase 3 이관. Phase 2에서는 "생성" 버튼 + state 표시만.

---

## Environment Availability

Step 2.6: SKIPPED — Phase 2는 외부 도구 설치 불필요. Firebase, Cloudflare Worker는 Phase 1에서 이미 배포됨.

---

## Validation Architecture

> workflow.nyquist_validation 설정 없음 → 활성화 처리.
> 프로젝트에 테스트 러너 없음 (CLAUDE.md 명시: "테스트 러너 없음. 검증은 `npm run build` 통과 + 브라우저 직접 확인.").

### Test Framework

| Property | Value |
|----------|-------|
| Framework | 없음 (no test runner) |
| Config file | 없음 |
| Quick run command | `npm run build` |
| Full suite command | `npm run build && npm run preview` |

### Phase Requirements → Verification Map

| Req ID | Behavior | Test Type | Verification Method |
|--------|----------|-----------|---------------------|
| POR-01 | loginAt 저장 후 브라우저 재방문 시 자동 로그인 | manual | DevTools → Application → localStorage → `ryekPortal` 키에 `loginAt` 확인 |
| POR-01 | 30일 경과 시 자동 로그아웃 | manual | `loginAt`을 `Date.now() - 31*24*60*60*1000` 으로 수동 변조 후 재방문 |
| POR-01 | D-3일 배너 표시 | manual | `loginAt`을 `Date.now() - 28*24*60*60*1000` 으로 변조 후 홈 탭 확인 |
| POR-01 | "30일 연장" 후 loginAt 갱신 | manual | 배너 클릭 후 localStorage 값 확인 |
| POR-02 | 시간표 위젯 렌더 (다음 수업 카드) | manual | 테스트 학생으로 포털 로그인 후 홈 탭 확인 |
| POR-02 | 다중 악기 all displayed | manual | 악기 2개 이상인 학생으로 로그인 |
| POR-02 | 강사명 표시 | manual | 담당 강사 있는 학생으로 로그인 후 위젯 강사명 확인 |
| POR-02 | 수업 없으면 위젯 숨김 | manual | lessons=[] 학생으로 로그인 후 위젯 미표시 확인 |
| POR-03 | 레슨노트 열람 가능 | manual | notes 탭 진입 후 기존 레슨노트 표시 확인 |
| POR-04 | (deferred/placeholder) | manual | 생성 버튼 또는 플레이스홀더 존재 확인 |
| POR-05 | monthlyFee=0 시 empty state | manual | monthlyFee=0 학생으로 로그인 → pay 탭 "수납 정보 없음" 확인 |
| POR-06 | 학부모 통합 뷰 레이아웃 16px gap | visual | 화면 폭 375px에서 각 섹션 간격 확인 |
| POR-07 | 수강 신청하기 버튼 표시 | manual | 홈 탭 최하단 버튼 확인 |
| POR-07 | 클릭 시 /register 이동 | manual | 버튼 클릭 후 URL /register 확인 |
| POR-08 | 다자녀 전환 모달 CSS 클래스 | visual | 자녀 2명 계정으로 로그인 후 "자녀 변경" 모달 UI 확인 |

### Build Gate

```bash
npm run build   # MUST pass before any commit
```

### Wave 0 Gaps

- 없음 — 테스트 러너 미사용, 브라우저 수동 검증으로 대체.

---

## Security Domain

> security_enforcement 설정 없음 → 기본 활성화.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | 부분적 | localStorage 기반 포털 세션 (Firebase Anonymous Auth + 생일 비밀번호) |
| V3 Session Management | yes | loginAt 30일 만료 정책 (D-05~D-09) |
| V4 Access Control | 부분적 | 포털은 read-only, 쓰기는 댓글/수강 신청만 |
| V5 Input Validation | yes | 수강 신청 폼 기존 validateStep1/2 |
| V6 Cryptography | no | 비밀번호: 생일 4자리 MMDD — 강함이 아님, 기존 방식 유지 |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| localStorage 세션 탈취 | Spoofing | HTTPS 필수 (Cloudflare Pages 기본 적용). XSS 방지는 React JSX 이스케이프로 처리됨 |
| 타 학생 데이터 접근 | Spoofing | Firestore 규칙 (Phase 1에서 구현) — 포털은 익명 Auth로 `rye-students` 전체 읽음. Phase 1 완료 후 이 위험 감소. |
| 실수로 student.notes 노출 | Information Disclosure | PublicPortal.jsx line 1024에 `⛔ student.notes 절대 렌더링 금지` 주석 이미 있음. 신규 UI도 동일 주의 |

**Phase 2 보안 위험 없음:** 새로운 쓰기 API 없음, 기존 Firestore 리스너 변경 없음, localStorage 만료 정책은 보안 개선임.

---

## Sources

### Primary (HIGH confidence)
- `src/components/portal/PublicPortal.jsx` — 전체 포털 구현 (~1,828줄) 직접 읽음
- `src/utils.js` — getBirthPassword, computeMonthlyAttStats, allLessonDays 등 확인
- `src/constants.jsx` — CSS 변수, DAYS, TODAY_STR, THIS_MONTH 확인
- `functions/api/ai/practice-guide.js` — Worker 구현 확인
- `functions/api/ai/_middleware.js` — verifyToken 미들웨어 확인
- `functions/api/ai/_utils/auth.js` — anonymous auth 처리 방식 확인

### Secondary (MEDIUM confidence)
- `.planning/phases/02-portal-completion/02-CONTEXT.md` — 확정된 결정사항 (D-01~D-09)
- `.planning/phases/02-portal-completion/02-UI-SPEC.md` — CSS 클래스 명세, 컴포넌트 스펙

### Tertiary (LOW confidence)
- 없음

---

## Metadata

**Confidence breakdown:**
- Session logic (POR-01): HIGH — 코드 직접 확인, 수정 지점 명확
- Schedule widget (POR-02): HIGH — 기존 getNextLessonDate() 재사용 가능 확인
- Lesson notes (POR-03): HIGH — 완성된 구현 확인, 추가 작업 없음
- Practice guide auth (POR-04): MEDIUM — auth.js 코드 확인했으나 anonymous token 실제 동작 미확인
- Payment empty state (POR-05): HIGH — 조건문 위치 명확
- Parent view polish (POR-06): HIGH — 기존 CSS 클래스 존재 확인
- Enrollment CTA (POR-07): HIGH — 진입점 위치와 /register 라우트 확인
- Sibling modal (POR-08): HIGH — 완성된 기능, CSS 클래스 통일만 필요

**Research date:** 2026-05-05
**Valid until:** 2026-06-05 (소스 파일 변경 없으면 유효)
