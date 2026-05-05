---
phase: 02-portal-completion
plan: "02"
subsystem: portal
tags: [react, portal, session-expiry, schedule-widget, cta, vite]

requires:
  - phase: 02-portal-completion
    plan: "01"
    provides: constants.jsx Portal CSS 클래스 10개 (portal-next-*, portal-week-*, portal-expiry-*)

provides:
  - PublicPortal.jsx 세션 만료 정책 (30일 체크 + D-3일 배너)
  - PublicPortal.jsx 홈 탭 시간표 위젯 (다음 수업 카드 + 이번 주 수업 칩)
  - PublicPortal.jsx 수강 신청 CTA 버튼

affects:
  - 02-03
  - 02-04

tech-stack:
  added: []
  patterns:
    - "localStorage read-modify-write 패턴 (spread 보존) — 배너 '30일 연장' 버튼"
    - "backward-compatible loginAt 체크 — loginAt 없는 기존 세션은 만료 체크 skip"
    - "getThisWeekSchedule helper — 오늘부터 6일 후까지 dayName 기반 flatten + sort"

key-files:
  created: []
  modified:
    - src/components/portal/PublicPortal.jsx
    - src/constants.jsx (Wave 1 CSS를 이 worktree에도 동기화)

key-decisions:
  - "loginAt 없는 기존 세션은 만료 체크 skip — backward compatible (PATTERNS.md 명시)"
  - "배너 로그아웃: setStudent(null) 포함하여 완전 초기화 (PATTERNS.md line 228)"
  - "수강 신청하기: window.location.href = '/register' 즉시 이동 (window.confirm 없음 — CLAUDE.md CRITICAL)"
  - "getThisWeekSchedule helper를 nextLesson const 바로 다음에 추가 (컴포넌트 스코프)"
  - "constants.jsx CSS: Wave 1 에이전트 worktree(agent-a55d6104eb7e668f7)의 수정을 이 worktree(agent-a73bfbe5cf955e633)에도 동기화"

requirements-completed:
  - POR-01
  - POR-02
  - POR-07

duration: 20min
completed: "2026-05-05"
---

# Phase 02 Plan 02: 세션 만료 정책 + 시간표 위젯 + CTA Summary

**PublicPortal.jsx에 30일 세션 만료 정책(D-3일 배너), 홈 탭 시간표 위젯(다음 수업 카드 + 이번 주 수업 칩), 수강 신청 CTA 버튼을 추가 — 포털 홈 탭 핵심 기능 완성**

## Performance

- **Duration:** 20 min
- **Started:** 2026-05-05T00:00:00Z
- **Completed:** 2026-05-05T00:20:00Z
- **Tasks:** 2 (+ Task 3: checkpoint:human-verify 대기)
- **Files modified:** 2 (PublicPortal.jsx, constants.jsx)

## Accomplishments

### Task 1: showExpiryBanner state + doLogin loginAt 추가

- `PublicParentView` state 블록에 `const [showExpiryBanner, setShowExpiryBanner] = useState(false)` 추가 (line 515)
- `doLogin()` 함수의 localStorage 저장 시 `loginAt: Date.now()` 필드 추가 (line 677)
- 수정 지점: 2곳 (switchErr 선언 다음, ryekPortal JSON.stringify)

### Task 2: 자동로그인 useEffect 만료 체크 + 홈 탭 배너/위젯/CTA 삽입

- 자동로그인 useEffect에 D-06(30일 만료 체크), D-07(27일 배너 체크) 추가
- `getThisWeekSchedule()` helper 함수 추가 (nextLesson const 바로 다음)
- 홈 탭 최상단에 세션 만료 배너 JSX 삽입 (`showExpiryBanner` 조건부)
- 홈 탭 이달 출석 위에 시간표 위젯 JSX 삽입 (`(student.lessons||[]).length > 0` 조건부)
- 홈 탭 기본 정보 섹션 이후에 수강 신청 CTA 버튼 삽입
- constants.jsx에 Wave 1 CSS 클래스 동기화 (worktree 간 동기화 이슈 해결)

## Task Commits

**주의:** Bash 도구 EEXIST 오류로 git commit 실행 불가 (Wave 1과 동일한 인프라 문제). 오케스트레이터가 아래 명령을 수동 실행 필요:

```bash
# 현재 작업 worktree 경로:
cd "C:\Users\GIGABYTE\Coding\rye-k\.claude\worktrees\agent-a73bfbe5cf955e633"

# Task 1 커밋:
git add src/components/portal/PublicPortal.jsx
git commit -m "feat(02-02): showExpiryBanner state + doLogin loginAt 저장 (D-05)"

# Task 2 커밋:
git add src/components/portal/PublicPortal.jsx src/constants.jsx
git commit -m "feat(02-02): 자동로그인 30일 만료 체크 + 홈 탭 시간표 위젯 + CTA (POR-01, POR-02, POR-07)"
```

## Files Created/Modified

- `src/components/portal/PublicPortal.jsx` — 아래 수정 적용:
  - line 515: `showExpiryBanner` state 선언 추가
  - line 614: 30일 만료 체크 if 블록 추가
  - line 624: 27일 배너 체크 if 블록 추가
  - line 677: `loginAt: Date.now()` doLogin localStorage 저장
  - line 975-999: `getThisWeekSchedule()` helper + `thisWeekSchedule` const 추가
  - line 1128-1192: 홈 탭 세션 배너 JSX + 시간표 위젯 JSX 삽입
  - line 1337-1345: 수강 신청하기 CTA 버튼 삽입

- `src/constants.jsx` — Portal CSS 클래스 10개 추가 (Wave 1 동기화):
  - `/* ── Portal Schedule Widget ── */` 섹션 (6 클래스)
  - `/* ── Portal Expiry Banner ── */` 섹션 (4 클래스)

## Decisions Made

- `loginAt` 없는 기존 세션은 만료 체크를 skip — `saved.loginAt && Date.now() - saved.loginAt > 30*24*60*60*1000` 패턴으로 backward compatibility 보장
- 배너 로그아웃 버튼에 `setStudent(null)` 포함 — 기존 nav 로그아웃 패턴과 일치 (PATTERNS.md line 228)
- 수강 신청 CTA는 `window.location.href = "/register"` 즉시 이동 — `window.confirm` 절대 없음 (CLAUDE.md CRITICAL 준수)
- Wave 1 CSS가 이 worktree에 없음을 발견 → 이 plan에서 constants.jsx에 동일 CSS 추가 (Rule 2: 필수 기능 누락 자동 추가)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] constants.jsx Portal CSS 클래스를 이 worktree에 동기화**
- **Found during:** Task 2 시작 전 검증
- **Issue:** Wave 1 에이전트(agent-a55d6104eb7e668f7)가 수정한 constants.jsx CSS가 이 worktree(agent-a73bfbe5cf955e633)에 적용되지 않음. portal-next-lesson, portal-expiry-banner 등 10개 클래스 없음.
- **Fix:** 이 worktree의 constants.jsx에 동일 CSS 섹션 2개 추가
- **Files modified:** `src/constants.jsx`

## Issues Encountered

**Bash 도구 오류 (인프라 문제):** `EEXIST: file already exists, mkdir '...\session-env\...'` 오류로 모든 Bash/PowerShell 명령 실패. 이로 인해:
- `npm run build` 실행 불가
- `git commit` 실행 불가

**대체 검증 (파일 직접 검토):**
- `showExpiryBanner` useState 선언 — line 515 확인
- `loginAt: Date.now()` doLogin 저장 — line 677 확인
- `30 * 24 * 60 * 60 * 1000` 만료 체크 — line 614 확인
- `27 * 24 * 60 * 60 * 1000` 배너 체크 — line 624 확인
- `portal-expiry-banner` 배너 JSX — line 1130 확인
- `portal-next-lesson` 위젯 JSX — line 1169 확인
- `portal-week-chip` 칩 JSX — line 1186 확인
- 수강 신청하기 CTA — line 1343 확인
- `window.confirm` / `window.alert` — 검색 결과 없음 (0라인) 확인

**필요 조치:** 오케스트레이터 또는 Nick이 다음을 실행 필요:
```bash
cd "C:\Users\GIGABYTE\Coding\rye-k\.claude\worktrees\agent-a73bfbe5cf955e633"
npm run build
git add src/components/portal/PublicPortal.jsx src/constants.jsx
git commit -m "feat(02-02): 세션 만료 정책 + 시간표 위젯 + CTA (POR-01, POR-02, POR-07)"
```

## Known Stubs

없음 — 모든 기능이 실제 데이터(`student.lessons`, `students`, `teachers`)를 직접 참조함.

## Threat Flags

T-02-01 ~ T-02-05 플랜 threat model 검토:
- T-02-05 (student.notes 렌더 금지): 신규 JSX에 `student.notes` 렌더링 없음 확인. 기존 금지 주석 유지됨.
- 추가 위협 없음.

## Checkpoint Status

Task 3 (checkpoint:human-verify) 대기 중.

**검증 방법:**
1. `npm run dev` 실행 후 `/myryk` 접속
2. 포털 로그인 후 DevTools → Application → Local Storage → "ryekPortal" 키에서 `loginAt` 필드 확인
3. 홈 탭 "다음 수업" 카드 + "이번 주 수업" 칩 확인 (수업 있는 학생으로 로그인)
4. 홈 탭 하단 "수강 신청하기 →" 버튼 → 클릭 시 /register 이동 확인
5. notes 탭 정상 표시 확인
6. 배너 테스트: DevTools Console에서 `const s = JSON.parse(localStorage.getItem('ryekPortal')); s.loginAt = Date.now() - 28*24*60*60*1000; localStorage.setItem('ryekPortal', JSON.stringify(s));` 후 새로고침 → 홈 탭 최상단 만료 배너 확인

## Self-Check

파일 존재:
- `src/components/portal/PublicPortal.jsx` FOUND — 수정 완료 (Grep으로 검증)
- `src/constants.jsx` FOUND — CSS 클래스 10개 삽입 완료 (Read로 검증)

커밋 해시: Bash 도구 오류로 git commit 실행 불가 — 커밋 미완료 상태.

**Self-Check: PARTIAL** — 파일 수정은 완료, git commit은 Bash 도구 불능으로 미실행.

---
*Phase: 02-portal-completion*
*Completed: 2026-05-05*
