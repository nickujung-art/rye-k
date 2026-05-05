---
phase: 02-portal-completion
plan: "01"
subsystem: ui
tags: [css, portal, react, vite]

requires:
  - phase: 01-security-foundation
    provides: Firestore 보안 규칙 기반 — 포털 읽기 권한 확보됨

provides:
  - constants.jsx CSS 문자열에 Portal Schedule Widget CSS 섹션 (6 클래스)
  - constants.jsx CSS 문자열에 Portal Expiry Banner CSS 섹션 (4 클래스)
  - Wave 2 실행자가 PublicPortal.jsx JSX 추가 시 의존할 CSS 클래스 10개 선행 배포

affects:
  - 02-02 (PublicPortal.jsx 시간표 위젯 + 세션 배너 JSX 구현)
  - 02-03
  - 02-04

tech-stack:
  added: []
  patterns:
    - "CSS 섹션 블록 주석 패턴 (/* ── Section Name ──... */) — constants.jsx 내 기존 관례 그대로 유지"
    - "모든 신규 CSS는 var(--*) 커스텀 프로퍼티만 사용 — color:#fff 단독 예외 (다크모드에서도 흰색 고정)"

key-files:
  created: []
  modified:
    - src/constants.jsx

key-decisions:
  - "color:#fff 단독 예외 허용 — portal-expiry-extend 버튼의 흰색 텍스트는 다크모드에서도 고정값이어야 함"
  - "CSS 삽입 위치: .ai-stats-row strong 다음, 백틱 닫힘 바로 앞 — 기존 섹션 순서 유지"

patterns-established:
  - "Portal CSS 네임스페이스: portal-next-* (Schedule Widget), portal-week-* (주간 칩), portal-expiry-* (세션 배너)"

requirements-completed:
  - POR-01
  - POR-02

duration: 10min
completed: "2026-05-05"
---

# Phase 02 Plan 01: Portal CSS 클래스 선행 추가 Summary

**constants.jsx CSS 문자열에 포털 세션 배너(4클래스)와 시간표 위젯(6클래스) CSS 10개를 선행 추가 — Wave 2 JSX 구현의 CSS 의존성 해결**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-05T00:00:00Z
- **Completed:** 2026-05-05T00:10:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- `src/constants.jsx` CSS 문자열에 `/* ── Portal Schedule Widget ──... */` 섹션 추가 (6 클래스)
- `src/constants.jsx` CSS 문자열에 `/* ── Portal Expiry Banner ──... */` 섹션 추가 (4 클래스)
- 모든 신규 CSS 클래스가 기존 `:root` CSS 커스텀 프로퍼티(`var(--*)`)만 참조하도록 구현
- `color:#fff` 단독 예외는 플랜 명시 허용사항 (`portal-expiry-extend` 버튼)

## Task Commits

각 태스크는 원자적으로 커밋됩니다:

1. **Task 1: constants.jsx CSS 문자열에 포털 CSS 클래스 10개 추가** - 커밋 해시 미확인 (Bash 도구 오류로 git 실행 불가 — 아래 이슈 참조)

## Files Created/Modified

- `src/constants.jsx` — line 740 이후에 Portal Schedule Widget 섹션과 Portal Expiry Banner 섹션 추가 (총 +14 lines)

## Decisions Made

- `color:#fff`만 단독 예외 허용 — `portal-expiry-extend` 버튼은 다크/라이트 모드 모두에서 흰색 텍스트가 의미론적으로 필요함. 이외 모든 색상값은 `var(--*)` 토큰 사용.
- 삽입 위치는 `.ai-stats-row strong` 바로 다음, 백틱+세미콜론 바로 앞으로 확정 — 기존 CSS 섹션 순서 및 관례 유지.

## Deviations from Plan

없음 — 플랜 그대로 실행.

## Issues Encountered

**Bash 도구 오류 (인프라 문제):** 실행 환경에서 `EEXIST: file already exists, mkdir '...\session-env\...'` 오류로 모든 Bash 명령 실패. 이로 인해:
- `npm run build` 실행 불가 (파일 검토로 대체 검증)
- `git commit` 실행 불가

**대체 검증:** constants.jsx 파일을 직접 읽어 다음을 확인:
- 10개 CSS 클래스 모두 정확한 위치(line 741-753)에 삽입 완료
- 백틱 닫힘(`;`)이 line 754에 정상 위치
- `portal-expiry-extend` 외 모든 클래스에 `var(--*)` 외 하드코딩 헥스값 없음
- JS/JSX 문법 오류 없음 (CSS 문자열 내부 텍스트 변경이므로)

**필요 조치:** 오케스트레이터 또는 Nick이 다음을 수동 실행 필요:
```bash
cd "C:\Users\GIGABYTE\Coding\rye-k\.claude\worktrees\agent-a55d6104eb7e668f7"
npm run build
git add src/constants.jsx
git commit -m "feat(02-01): constants.jsx에 포털 CSS 클래스 10개 추가 (Portal Schedule Widget + Expiry Banner)"
```

## Next Phase Readiness

- Wave 2 실행자(02-02)가 PublicPortal.jsx에 JSX를 추가할 때 아래 CSS 클래스가 이미 존재:
  - `portal-next-lesson`, `portal-next-lesson-inst`, `portal-next-lesson-time`, `portal-next-lesson-teacher`
  - `portal-week-chips`, `portal-week-chip`
  - `portal-expiry-banner`, `portal-expiry-text`, `portal-expiry-extend`, `portal-expiry-logout`
- 다크모드 오버라이드는 기존 `[data-theme="dark"]` 규칙으로 자동 적용됨 (추가 CSS 불필요)

## Self-Check

파일 존재:
- `src/constants.jsx` FOUND — 10개 클래스 삽입 확인 (Read 도구로 line 741-753 검증)

커밋 해시: Bash 도구 오류로 git commit 실행 불가 — 커밋 미완료 상태.

**Self-Check: PARTIAL** — 파일 수정은 완료, git commit은 Bash 도구 불능으로 미실행.

---
*Phase: 02-portal-completion*
*Completed: 2026-05-05*
