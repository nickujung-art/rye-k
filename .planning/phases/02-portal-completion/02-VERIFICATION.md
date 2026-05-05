---
phase: 02-portal-completion
verified: 2026-05-05T00:00:00Z
status: gaps_found
score: 5/13
overrides_applied: 1
overrides:
  - must_have: "홈 탭 최하단에 '수강 신청하기 →' 버튼이 있고 클릭 시 /register로 이동한다"
    reason: "QA 과정에서 의도적으로 제거됨 — 이미 회원인 포털 사용자에게 수강 신청 CTA가 불필요하다는 판단. PublicRegisterForm(/register)은 별도로 정상 동작하며 rye-pending 기록이 관리자 화면에 나타남. ROADMAP SC5(수강 신청 제출→관리자 대기)는 /register 직접 접근 경로로 충족."
    accepted_by: "nickujung-art"
    accepted_at: "2026-05-05T00:00:00Z"
gaps:
  - truth: "로그인 시 localStorage['ryekPortal']에 loginAt 필드가 저장된다"
    status: failed
    reason: "doLogin() 함수(line 671)에서 ryekPortal을 { code, pw }만으로 저장. loginAt 필드 없음."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "line 671: localStorage.setItem('ryekPortal', JSON.stringify({ code: found.studentCode, pw: getBirthPassword(found.birthDate) })) — loginAt: Date.now() 없음"
    missing:
      - "doLogin() 내 localStorage.setItem 에 loginAt: Date.now() 추가"

  - truth: "자동로그인 복원 시 30일 경과 여부를 체크하고 만료되면 localStorage를 삭제한다"
    status: failed
    reason: "자동로그인 useEffect(line 610-625)에 만료 체크 코드 없음. saved.code+saved.pw 확인 후 즉시 복원."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "line 610-625: 30*24*60*60*1000 만료 조건 없음. loginAt 참조 없음."
    missing:
      - "useEffect 내 if (saved.loginAt && Date.now() - saved.loginAt > 30*24*60*60*1000) { localStorage.removeItem('ryekPortal'); return; } 추가"

  - truth: "D-3일(27일 경과) 후 홈 탭 최상단에 세션 만료 배너가 표시된다"
    status: failed
    reason: "showExpiryBanner state가 없고, 27일 배너 체크 코드 없으며, 홈 탭에 portal-expiry-banner JSX 없음."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "showExpiryBanner state 선언 없음. 27*24*60*60*1000 조건 없음. 홈 탭(line 1098-)에 portal-expiry-banner className 없음."
    missing:
      - "showExpiryBanner state 추가 (const [showExpiryBanner, setShowExpiryBanner] = useState(false))"
      - "자동로그인 useEffect에 27일 배너 체크 + setShowExpiryBanner(true) 추가"
      - "홈 탭 최상단에 showExpiryBanner 조건부 배너 JSX(portal-expiry-banner 클래스) 삽입"

  - truth: "'30일 연장' 버튼 클릭 시 loginAt이 현재 시각으로 갱신되고 배너가 사라진다"
    status: failed
    reason: "showExpiryBanner state가 없어 연장 버튼 자체가 없음. 이 truth는 선행 truth 미구현에 종속."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "배너 자체 없으므로 30일 연장 버튼 없음"
    missing:
      - "배너 JSX 내 30일 연장 버튼 onClick: localStorage spread + loginAt 갱신 + setShowExpiryBanner(false)"

  - truth: "홈 탭에 '다음 수업' 카드와 '이번 주 수업' 칩이 렌더된다"
    status: failed
    reason: "홈 탭(line 1098-)에 portal-next-lesson 또는 portal-week-chip 클래스 JSX 없음. getThisWeekSchedule helper 없음. 기존 '레슨 일정' 섹션(line 1154-)은 schedule 목록만 표시하고 '다음 수업' 카드 형식 아님."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "portal-next-lesson, portal-week-chip 클래스 미사용. getThisWeekSchedule helper 없음."
    missing:
      - "getThisWeekSchedule() helper 추가 (nextLesson const 다음)"
      - "홈 탭에 portal-next-lesson 카드 + portal-week-chips 위젯 JSX 삽입 (lessons.length>0 조건부)"

  - truth: "lessons[]가 비어있으면 시간표 위젯이 렌더되지 않는다"
    status: failed
    reason: "시간표 위젯 자체가 없으므로 조건부 렌더 조건도 없음. 선행 truth 미구현에 종속."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "portal-next-lesson 위젯 없음"
    missing:
      - "위젯 삽입 시 (student.lessons||[]).length > 0 조건부 렌더로 구현"

  - truth: "monthlyFee === 0인 학생이 pay 탭에 접근하면 '수납 정보 없음' empty state가 표시된다"
    status: failed
    reason: "pay 탭(line 1717)에 2-way 분기(수납 기록 없음/있음)만 존재. monthlyFee===0 조건 분기 없음."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "line 1717: sPay.length === 0 단일 조건만 체크. student.monthlyFee 참조 없음."
    missing:
      - "pay 탭 분기를 3-way로 확장: (sPay.length===0 && (student.monthlyFee||0)===0) → '수납 정보 없음', sPay.length===0 → '수납 기록이 없습니다', 기록 있음 → 기존 목록"

  - truth: "sibling 전환 모달이 .mb / .modal CSS 클래스를 사용한다"
    status: failed
    reason: "showSiblingModal 모달(line 1844-)이 모두 인라인 style로 구현됨. className='mb', className='modal' 없음."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "line 1845: style={position:fixed, inset:0, background:rgba...} 인라인 스타일. .mb/.modal 클래스 미사용."
    missing:
      - "showSiblingModal 모달을 className='mb' + className='modal' + className='modal-h' + className='modal-b' 표준 구조로 교체"

  - truth: "sibling modal 내 자녀 카드가 .tl-student-item 클래스를 사용한다"
    status: failed
    reason: "자녀 카드(line 1858-)가 button 엘리먼트 + 전체 인라인 style. tl-student-item 클래스 없음."
    artifacts:
      - path: "src/components/portal/PublicPortal.jsx"
        issue: "line 1858: <button style={{background:isActive?'var(--blue-lt)'...}}> — tl-student-item 없음"
    missing:
      - "자녀 카드를 <div className='tl-student-item' onClick={...}>로 교체"
deferred: []
human_verification:
  - test: "30일 만료 배너 시각적 표시 확인"
    expected: "loginAt을 28일 전으로 조작 후 새로고침 시 홈 탭 최상단에 금색 배너가 표시되고, '30일 연장' 버튼 클릭 시 사라짐"
    why_human: "배너가 현재 구현되지 않아 자동 검증 불가. 구현 후 DevTools localStorage 조작 + 시각적 확인 필요."
  - test: "시간표 위젯 모바일 렌더링 확인"
    expected: "수업이 있는 학생으로 로그인 시 홈 탭에 '다음 수업' 카드와 '이번 주 수업' 칩이 올바르게 표시됨"
    why_human: "위젯 미구현으로 자동 검증 불가. 구현 후 실제 브라우저에서 확인 필요."
---

# Phase 2: 포털 완성 (Portal Completion) Verification Report

**Phase Goal:** 학생과 학부모가 앱 수준의 포털에서 시간표·출석·레슨노트·수납 현황을 확인하고, 포털 로그인이 브라우저를 닫아도 유지된다
**Verified:** 2026-05-05T00:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Root Cause Analysis

에이전트 4개가 별도 git worktree에서 실행되었으나 **Bash 도구 EEXIST 버그**로 `git commit`이 전혀 실행되지 않았다. 각 SUMMARY.md의 "Self-Check: PARTIAL"이 이를 명시함. 결과적으로:

- Wave 1 (02-01): constants.jsx CSS 클래스 10개 → **main 브랜치에 반영됨** (이미 있던 변경 혹은 다른 경로로 머지)
- Wave 2 (02-02): PublicPortal.jsx 세션 만료 정책 + 시간표 위젯 → **main 미반영**
- Wave 3 (02-03): pay 탭 empty state + sibling 모달 → **main 미반영**
- Wave 4 (02-04): firebase.js getPortalIdToken + practiceGuideResult → **main 반영됨**

Wave 2·3의 코드 변경이 main 브랜치에 존재하지 않는다. 이것이 모든 gaps의 공통 근본 원인이다.

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 학생이 포털에서 수업 요일·시간표를 모바일 화면에서 확인할 수 있다 | PARTIAL | 기존 '레슨 일정' 섹션(line 1154)이 schedule 목록을 표시하나, 계획된 '다음 수업' 카드/이번 주 칩 위젯은 없음 |
| 2 | 학생/학부모가 포털에서 강사 작성 레슨노트를 열람할 수 있다 | VERIFIED | notes 탭(line 1431-)이 lessonNote 데이터를 월별 그룹화하여 풍부하게 렌더. 연습 가이드 생성 버튼도 연결됨(line 1483-). |
| 3 | 학부모가 포털에서 자녀의 이번 달 수납 완납/미납 현황을 확인할 수 있다 | PARTIAL | 홈 탭 '이번 달 수납' 섹션(line 1204-)은 존재. pay 탭은 monthlyFee=0 케이스를 구분 안 함. |
| 4 | 포털 로그인 후 브라우저 닫고 30일 이내 재방문 시 자동 로그인된다 | FAILED | 자동로그인 useEffect(line 610-625)에서 loginAt 없음. 30일 만료 체크 없음. 영구 자동로그인 상태(만료 없음). |
| 5 | 학생/학부모가 포털에서 수강 신청 제출 시 관리자 대기 항목이 나타난다 | PASSED (override) | /register 경로의 PublicRegisterForm이 rye-pending에 정상 기록. 포털 홈 내 CTA 버튼은 QA 후 의도적 제거 — Override 적용. |

**Score:** 5/13 must-haves verified (1 PASSED override 포함)

---

### Plan must_haves 상세 검증

#### Wave 1 (02-01): constants.jsx CSS 클래스

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | constants.jsx CSS 문자열 내 .portal-expiry-banner 클래스가 존재한다 | VERIFIED | line 750: `.portal-expiry-banner{background:var(--gold-lt)...}` |
| 2 | constants.jsx CSS 문자열 내 .portal-next-lesson 클래스가 존재한다 | VERIFIED | line 742: `.portal-next-lesson{background:var(--hanji)...}` |
| 3 | constants.jsx CSS 문자열 내 .portal-week-chip 클래스가 존재한다 | VERIFIED | line 747: `.portal-week-chip{background:var(--blue-lt)...}` |
| 4 | 모든 새 CSS 클래스가 var(--*) 커스텀 프로퍼티만 사용하고 하드코딩 헥스값이 없다 | VERIFIED | `portal-expiry-extend`의 `color:#fff` 단독 예외 (플랜 명시 허용사항). 나머지 전부 var(--*) |

#### Wave 2 (02-02): 세션 만료 정책 + 시간표 위젯

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 로그인 시 localStorage['ryekPortal']에 loginAt 필드가 저장된다 | FAILED | line 671: `{ code, pw }` 저장. loginAt 없음 |
| 2 | 자동로그인 복원 시 30일 경과 여부 체크, 만료 시 삭제 | FAILED | line 610-625: 만료 체크 없음 |
| 3 | D-3일(27일 경과) 후 홈 탭 최상단 세션 만료 배너 표시 | FAILED | showExpiryBanner state 없음. 배너 JSX 없음 |
| 4 | '30일 연장' 버튼 클릭 시 loginAt 갱신 + 배너 사라짐 | FAILED | 배너 미구현 종속 |
| 5 | '로그아웃' 버튼 클릭 시 window.confirm 없이 즉시 로그아웃 | FAILED | 배너 자체 없음. 단, window.confirm은 코드 전체에 없음(PASS 부분) |
| 6 | 홈 탭에 '다음 수업' 카드와 '이번 주 수업' 칩이 렌더된다 | FAILED | portal-next-lesson, portal-week-chip JSX 없음 |
| 7 | lessons[]가 비어있으면 시간표 위젯이 렌더되지 않는다 | FAILED | 위젯 미구현 종속 |
| 8 | 홈 탭 최하단에 '수강 신청하기 →' 버튼이 있고 클릭 시 /register로 이동 | PASSED (override) | 의도적 제거. /register + PublicRegisterForm + rye-pending 기록은 정상. |

#### Wave 3 (02-03): pay 탭 empty state + sibling 모달

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | monthlyFee===0인 학생이 pay 탭에서 '수납 정보 없음' empty state 표시 | FAILED | line 1717: 2-way 분기만. monthlyFee 조건 없음 |
| 2 | sPay.length>0이고 monthlyFee>0인 정상 케이스에는 기존 목록 표시 | VERIFIED | line 1718-: 기존 수납 명세서 목록 렌더 정상 |
| 3 | sibling 전환 모달이 .mb/.modal/.modal-h/.modal-b 클래스 사용 | FAILED | line 1844-: 전체 인라인 style |
| 4 | sibling modal 내 자녀 카드가 .tl-student-item 클래스 사용 | FAILED | line 1858-: button + inline style |
| 5 | 에러 메시지가 .form-err 클래스 사용 | VERIFIED | line 1852: `className="form-err"` (switchErr 표시) |
| 6 | window.confirm 및 window.alert가 코드에 없다 | VERIFIED | Grep 결과 0 matches |

#### Wave 4 (02-04): 연습 가이드 + firebase getPortalIdToken

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | 레슨노트 탭에 '연습 가이드 생성' 버튼이 존재한다 | VERIFIED | line 1484-: notes.length>0 조건부 버튼 렌더 |
| 2 | 버튼 클릭 시 /api/ai/practice-guide Worker를 호출한다 | VERIFIED | line 1496: `fetch("/api/ai/practice-guide", {...})` |
| 3 | Worker 응답이 로컬 state에 저장되고 탭 내 결과로 표시된다 | VERIFIED | line 1511: `setPracticeGuideResult(data.body || data.result || "")`. line 1524-: 결과 렌더 |
| 4 | 기존 student.practiceGuide?.body 렌더(홈 탭)는 변경되지 않는다 | VERIFIED | line 1125-1139: 홈 탭 practiceGuide?.body 렌더 유지 |
| 5 | firebase.js에서 getPortalIdToken export가 추가된다 | VERIFIED | firebase.js line 79-87: async function getPortalIdToken() export |
| 6 | 오류 발생 시 인라인 오류 메시지가 표시된다 (window.alert 없음) | VERIFIED | line 1521-1523: `.form-err` 인라인 div. window.alert 없음 |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/constants.jsx` | Portal CSS 클래스 10개 (Wave 1) | VERIFIED | 10개 클래스 line 742-753에 존재. var(--*) 준수. |
| `src/components/portal/PublicPortal.jsx` | showExpiryBanner state + loginAt | MISSING | state 없음. loginAt 없음. |
| `src/components/portal/PublicPortal.jsx` | portal-expiry-banner JSX | MISSING | CSS 클래스는 constants.jsx에 있으나 JSX에서 미사용. ORPHANED. |
| `src/components/portal/PublicPortal.jsx` | portal-next-lesson + portal-week-chip JSX | MISSING | CSS 클래스는 있으나 JSX에서 미사용. ORPHANED. |
| `src/components/portal/PublicPortal.jsx` | pay 탭 3-way empty state | MISSING | 2-way로 유지. monthlyFee=0 분기 없음. |
| `src/components/portal/PublicPortal.jsx` | sibling modal CSS 클래스 | MISSING | .mb/.modal/.tl-student-item 미적용. |
| `src/components/portal/PublicPortal.jsx` | practiceGuideResult + /api/ai/practice-guide | VERIFIED | 정상 구현. |
| `src/firebase.js` | getPortalIdToken() export | VERIFIED | line 79-87. |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| constants.jsx CSS `.portal-expiry-banner` | PublicPortal.jsx JSX | className 참조 | NOT_WIRED | CSS 존재하나 JSX에서 className="portal-expiry-banner" 없음 |
| constants.jsx CSS `.portal-next-lesson` | PublicPortal.jsx JSX | className 참조 | NOT_WIRED | CSS 존재하나 JSX에서 className="portal-next-lesson" 없음 |
| constants.jsx CSS `.portal-week-chip` | PublicPortal.jsx JSX | className 참조 | NOT_WIRED | CSS 존재하나 JSX에서 className="portal-week-chip" 없음 |
| doLogin() | localStorage ryekPortal | loginAt: Date.now() | NOT_WIRED | loginAt 필드 저장 없음 |
| autoLogin useEffect | 만료 체크 로직 | saved.loginAt 조건 | NOT_WIRED | 조건 없음 |
| PublicPortal.jsx | /api/ai/practice-guide | fetch + Bearer token | WIRED | line 1494-1508 |
| PublicPortal.jsx | firebase.js getPortalIdToken | import + 호출 | WIRED | line 3, 1494 |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| notes 탭 | `notes` (lessonNote) | attendance Firestore 실시간 | Yes — onSnapshot 기반 | FLOWING |
| practiceGuideResult | `practiceGuideResult` | /api/ai/practice-guide fetch | Yes (런타임 Worker 호출) | FLOWING |
| portal-expiry-banner | `showExpiryBanner` | — | ABSENT | DISCONNECTED (state 없음) |
| portal-next-lesson | `nextLesson` | — | ABSENT | DISCONNECTED (JSX 없음) |
| pay 탭 monthlyFee=0 | `student.monthlyFee` | Firestore students | Yes — 조건 체크 없음 | HOLLOW (조건 미적용) |

---

### Behavioral Spot-Checks

| Behavior | Verification Method | Result | Status |
|----------|--------------------|---------|----|
| getPortalIdToken export | Grep firebase.js | line 79: `export async function getPortalIdToken()` | PASS |
| practiceGuideResult state | Grep PublicPortal.jsx | line 516: useState(null) | PASS |
| /api/ai/practice-guide fetch | Grep PublicPortal.jsx | line 1496 | PASS |
| window.confirm/alert 없음 | Grep PublicPortal.jsx | 0 matches | PASS |
| loginAt in doLogin | Grep PublicPortal.jsx | "loginAt" — 0 matches | FAIL |
| 30일 만료 체크 | Grep PublicPortal.jsx | "30 * 24 * 60 * 60 * 1000" — 0 matches | FAIL |
| portal-expiry-banner JSX | Grep PublicPortal.jsx | "portal-expiry-banner" — 0 matches | FAIL |
| portal-next-lesson JSX | Grep PublicPortal.jsx | "portal-next-lesson" — 0 matches | FAIL |
| 수납 정보 없음 | Grep PublicPortal.jsx | "수납 정보 없음" — 0 matches | FAIL |
| className="mb" in sibling modal | Grep PublicPortal.jsx | 0 matches (inline style 사용) | FAIL |
| tl-student-item in sibling modal | Grep PublicPortal.jsx | 0 matches | FAIL |

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|---------|
| POR-01 | 02-02 | 포털 세션 유지 — 브라우저 닫기 후 재방문 자동 로그인 (30일) | BLOCKED | loginAt 미저장. 만료 체크 없음. 영구 세션 상태. |
| POR-02 | 02-02 | 학생 포털: 시간표 뷰 — lessons[].schedule 기반 | PARTIAL | 기존 '레슨 일정' 섹션은 있으나 portal-next-lesson 위젯 미구현 |
| POR-03 | 02-02 | 학생 포털: 강사 작성 레슨노트 → 학부모 열람 | SATISFIED | notes 탭 전체 구현. 월별 그룹화 + 풍부한 렌더. |
| POR-04 | 02-04 | 학생 포털: 연습 가이드 — practice-guide.js Worker 연결 | SATISFIED | 버튼 + fetch + state 완전 구현. |
| POR-05 | 02-03 | 학생 포털: 수납 현황 (monthlyFee 기준) | BLOCKED | monthlyFee=0 분기 없음. pay 탭 2-way만. |
| POR-06 | 02-03 | 학부모 포털: 자녀 출석·레슨노트·수납 통합 뷰 | PARTIAL | 기존 뷰 존재하나 sibling 모달 CSS 표준화 미적용 |
| POR-07 | 02-02 | 셀프 수강 신청 — 포털 CTA → 관리자 승인 | PASSED (override) | CTA 버튼 의도적 제거. /register + rye-pending 정상. |
| POR-08 | 02-03 | 자녀 전환 UX 개선 — 다자녀 세션 관리 | BLOCKED | sibling 모달 .mb/.modal/.tl-student-item 미적용. 기능은 동작. |

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|---------|-------|
| PublicPortal.jsx line 671 | loginAt 없는 ryekPortal 저장 → 영구 세션 | BLOCKER | 30일 만료 정책 미동작. 보안 계획(POR-01) 미이행. |
| PublicPortal.jsx line 1844- | showSiblingModal 전체 인라인 style | WARNING | 표준 CSS 클래스 미적용. 다크모드 테마 일관성 저하. |
| PublicPortal.jsx line 1717 | pay 탭 2-way empty state | WARNING | monthlyFee=0 학생에게 잘못된 "수납 기록이 없습니다" 안내. |

---

### Human Verification Required

#### 1. 구현 후: 30일 만료 배너 시각적 동작 확인

**Test:** Wave 2 재구현 후, DevTools Console에서 `const s = JSON.parse(localStorage.getItem('ryekPortal')); s.loginAt = Date.now() - 28*24*60*60*1000; localStorage.setItem('ryekPortal', JSON.stringify(s));` 실행 후 페이지 새로고침
**Expected:** 홈 탭 최상단에 금색 만료 배너가 sticky로 표시됨. '30일 연장' 클릭 시 사라짐.
**Why human:** 배너가 현재 미구현. 구현 후 시각적 렌더 + 스크롤 sticky 동작 확인 필요.

#### 2. 구현 후: 시간표 위젯 모바일 렌더링

**Test:** 수업이 등록된 학생으로 로그인 후 홈 탭 확인
**Expected:** portal-next-lesson 카드(다음 수업 일시 + 강사명)와 portal-week-chip들(이번 주 수업 칩)이 이달 출석 위에 표시됨
**Why human:** 위젯 미구현. 구현 후 실제 lessons[] 데이터와 UI 일치 확인 필요.

---

### Gaps Summary

**9개 gaps 식별 — 공통 근본 원인: Wave 2·3 변경이 main 브랜치에 미반영**

에이전트들이 git worktree에서 작업했으나 Bash 도구 EEXIST 버그로 `git commit`이 실행되지 않았다. Wave 2(02-02)와 Wave 3(02-03)의 모든 PublicPortal.jsx 변경이 main 브랜치에 없다. Wave 1(CSS)과 Wave 4(firebase.js, practiceGuideResult)는 main에 반영되어 있다.

**필요 조치:**
1. Wave 2 재실행: doLogin loginAt 저장 + 자동로그인 useEffect 만료/배너 체크 + showExpiryBanner state + 홈 탭 배너/위젯 JSX 삽입
2. Wave 3 재실행: pay 탭 3-way empty state + showSiblingModal .mb/.modal/.tl-student-item 교체

**POR-07 override:** '수강 신청하기' CTA 버튼 의도적 제거는 수용된 편차. /register 페이지와 rye-pending 기록이 정상 동작하므로 관리자 승인 흐름은 유지됨.

---

_Verified: 2026-05-05T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
