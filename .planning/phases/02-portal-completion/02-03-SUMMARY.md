---
phase: 02-portal-completion
plan: "03"
subsystem: portal
tags: [react, portal, empty-state, modal, css-classes, vite]

requires:
  - phase: 02-portal-completion
    plan: "02"
    provides: PublicPortal.jsx 세션 만료 정책 + 시간표 위젯 + CTA

provides:
  - PublicPortal.jsx pay 탭 3-way empty state (monthlyFee=0 분기)
  - PublicPortal.jsx showSiblingModal 표준 CSS 클래스 (.mb/.modal/.modal-h/.modal-b/.tl-student-item)
  - PublicPortal.jsx 홈 탭 섹션 gap 16px 통일

affects:
  - 02-04

tech-stack:
  added: []
  patterns:
    - "pay 탭 3-way ternary — monthlyFee=0+기록없음 / 기록없음 / 기록있음 분기"
    - ".mb/.modal/.modal-h/.modal-b 표준 모달 클래스 교체 패턴"
    - "PortalEmptyState sub whiteSpace:pre-line — \\n 지원 추가"

key-files:
  created: []
  modified:
    - src/components/portal/PublicPortal.jsx

key-decisions:
  - "PortalEmptyState sub div에 whiteSpace:pre-line 추가 — \\n 문자열 줄바꿈 지원 (Rule 2: 누락 기능)"
  - "showSiblingModal 자녀 카드 button→div 교체 + .tl-student-item 클래스 적용"
  - "자녀 카드 기존 정보(insts, isActive, studentCode) 유지 — 기능 변경 없음"
  - "월간 리포트 섹션 marginBottom 12→16 통일 (POR-06 gap 16px 일관성)"

requirements-completed:
  - POR-05
  - POR-06
  - POR-08

duration: 15min
completed: "2026-05-05"
---

# Phase 02 Plan 03: pay 탭 empty state + sibling 모달 CSS 클래스 표준화 Summary

**pay 탭에 monthlyFee=0 분기 empty state 추가 및 showSiblingModal 모달을 표준 CSS 클래스(.mb/.modal/.modal-h/.modal-b/.tl-student-item)로 교체 — 포털 UI 일관성 확보**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-05T00:00:00Z
- **Completed:** 2026-05-05T00:15:00Z
- **Tasks:** 2
- **Files modified:** 1 (PublicPortal.jsx)

## Accomplishments

### Task 1: pay 탭 monthlyFee=0 empty state 추가 (POR-05)

- `PortalEmptyState` 컴포넌트 `sub` div에 `whiteSpace:"pre-line"` 추가 (line 333) — `\n` 줄바꿈 지원
- pay 탭 sPay 분기를 2-way → 3-way로 확장 (line 1663-1670):
  1. `sPay.length === 0 && monthlyFee === 0` → "수납 정보 없음" (등록 안내)
  2. `sPay.length === 0` (monthlyFee > 0) → "수납 기록이 없습니다" (기존 유지)
  3. 기록 있음 → 기존 수납 명세서 목록

### Task 2: sibling 전환 모달 CSS 클래스 표준화 (POR-08) + 홈 탭 gap (POR-06)

- showSiblingModal 모달 인라인 style → 표준 CSS 클래스로 교체:
  - backdrop: `style={fixed+overlay}` → `className="mb"` + onClick 백드롭 닫기
  - 패널: `style={background:#fff,borderRadius:24...}` → `className="modal"` + stopPropagation
  - 헤더: 중앙 정렬 div → `className="modal-h"` (제목 + ✕ 버튼)
  - 바디: `style={flexColumn,gap:12}` → `className="modal-b"`
  - 자녀 카드: `<button style={...}>` → `<div className="tl-student-item" style={{opacity,marginBottom}}>` (isActive, insts, studentCode 정보 유지)
- 홈 탭 월간 리포트 섹션 `marginBottom:12` → `marginBottom:16` 통일

## Task Commits

**주의:** Bash 도구 EEXIST 오류로 git commit 실행 불가 (02-02와 동일한 인프라 문제). 오케스트레이터가 아래 명령을 수동 실행 필요:

```bash
# 현재 작업 worktree 경로:
cd "C:\Users\GIGABYTE\Coding\rye-k\.claude\worktrees\agent-a1c5261089d19154f"

# Task 1 커밋:
git add src/components/portal/PublicPortal.jsx
git commit -m "feat(02-03): pay 탭 monthlyFee=0 empty state 3-way 분기 (POR-05)"

# Task 2 커밋:
git add src/components/portal/PublicPortal.jsx
git commit -m "feat(02-03): showSiblingModal 표준 CSS 클래스 교체 + 홈 탭 gap 16px (POR-06, POR-08)"
```

## Files Created/Modified

- `src/components/portal/PublicPortal.jsx` — 아래 수정 적용:
  - line 333: `PortalEmptyState` sub div에 `whiteSpace:"pre-line"` 추가
  - line 1663-1670: pay 탭 sPay 분기 3-way 확장 (monthlyFee=0 체크 추가)
  - line 1139: 월간 리포트 섹션 `marginBottom:12` → `marginBottom:16`
  - line 1797-1832: showSiblingModal 모달 인라인 style → 표준 CSS 클래스 교체

## Decisions Made

- `PortalEmptyState` sub div에 `whiteSpace:"pre-line"` 추가 — `\n` 줄바꿈이 HTML에서 무시되는 문제 해결 (Rule 2: 누락 기능)
- 자녀 카드를 `<button>`에서 `<div className="tl-student-item">`으로 교체 — 플랜 요구사항 준수, 기존 insts/isActive/studentCode 정보는 유지
- 단순화된 플랜의 자녀 카드 구조보다 기존의 풍부한 정보(인스트루먼트, 수강 상태, 회원코드)를 유지 — 기능 저하 없이 CSS 표준화만 적용

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] PortalEmptyState sub div whiteSpace:pre-line 추가**
- **Found during:** Task 1 실행 전 PortalEmptyState 컴포넌트 확인
- **Issue:** `sub` prop에 `\n`을 사용하려 했으나 `PortalEmptyState`의 sub div에 `whiteSpace` 설정이 없어 줄바꿈이 HTML에서 무시됨
- **Fix:** line 333의 sub div에 `whiteSpace:"pre-line"` 추가
- **Files modified:** `src/components/portal/PublicPortal.jsx`

## Issues Encountered

**Bash 도구 오류 (인프라 문제):** `EEXIST: file already exists, mkdir '...\session-env\...'` 오류로 모든 Bash 명령 실패. 이로 인해:
- `npm run build` 실행 불가
- `git commit` 실행 불가

**대체 검증 (Grep + Read 파일 직접 검토):**
- `수납 정보 없음` title — line 1665 확인
- `monthlyFee || 0) === 0` 조건 — line 1663 확인
- `수납 기록이 없습니다` (기존 유지) — line 1669 확인
- `className="mb"` — line 1797 확인
- `className="modal"` — line 1798 확인
- `className="modal-h"` — line 1799 확인
- `className="modal-b"` — line 1807 확인
- `className="tl-student-item"` — line 1817 확인
- `window.confirm` / `window.alert` — 검색 결과 없음 (0라인) 확인
- `.mb`, `.modal`, `.modal-h`, `.modal-b`, `.tl-student-item` CSS 클래스 — constants.jsx line 201-209, 600 확인
- 홈 탭 모든 섹션 `marginBottom:16` — Grep 결과로 확인

**필요 조치:** 오케스트레이터 또는 Nick이 다음을 실행 필요:
```bash
cd "C:\Users\GIGABYTE\Coding\rye-k\.claude\worktrees\agent-a1c5261089d19154f"
npm run build
git add src/components/portal/PublicPortal.jsx
git commit -m "feat(02-03): pay 탭 empty state + sibling 모달 CSS 표준화 (POR-05, POR-06, POR-08)"
```

## Known Stubs

없음 — 모든 기능이 실제 데이터(`student.monthlyFee`, `sPay`, `siblings`)를 직접 참조함.

## Threat Flags

T-02-03-01 ~ T-02-03-03 플랜 threat model 검토:
- T-02-03-01 (showSiblingModal spoofing): 변경 없음 — handleSiblingSwitch 로직 그대로 유지. siblings 배열은 보호자 연락처 기준 계산.
- T-02-03-02 (pay 탭 monthlyFee): 정적 조건 계산. Firestore 규칙으로 타 학생 데이터 차단.
- T-02-03-03 (PortalEmptyState XSS): 정적 한국어 문자열. React JSX 자동 이스케이프.
- 추가 위협 없음.

## Self-Check

파일 존재:
- `src/components/portal/PublicPortal.jsx` FOUND — 수정 완료 (Grep으로 검증)

커밋 해시: Bash 도구 오류로 git commit 실행 불가 — 커밋 미완료 상태.

**Self-Check: PARTIAL** — 파일 수정은 완료, git commit은 Bash 도구 불능으로 미실행.

---
*Phase: 02-portal-completion*
*Completed: 2026-05-05*
