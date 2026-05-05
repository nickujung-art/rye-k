---
phase: 2
slug: portal-completion
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-05-05
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Project has no test runner — all automated verification is via build gate (`npm run build`).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | 없음 (no test runner — CLAUDE.md 명시) |
| **Config file** | none |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run preview` |
| **Estimated runtime** | ~30 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run preview`
- **Before `/gsd-verify-work`:** Build must pass, manual browser checks done
- **Max feedback latency:** ~30 seconds (build)

---

## Per-Task Verification Map

| Task ID | Requirement | Wave | Threat Ref | Secure Behavior | Test Type | Automated Command | Status |
|---------|-------------|------|------------|-----------------|-----------|-------------------|--------|
| 02-session-01 | POR-01 (loginAt 저장) | 1 | — | localStorage 탈취 시 HTTPS+XSS 방어로 완화 | manual | `npm run build` | ⬜ pending |
| 02-session-02 | POR-01 (30일 만료 체크) | 1 | — | N/A | manual | `npm run build` | ⬜ pending |
| 02-session-03 | POR-01 (D-3일 배너) | 1 | — | N/A | manual | `npm run build` | ⬜ pending |
| 02-schedule-01 | POR-02 (시간표 위젯 렌더) | 1 | — | N/A | manual | `npm run build` | ⬜ pending |
| 02-schedule-02 | POR-02 (다중 악기 표시) | 1 | — | N/A | manual | `npm run build` | ⬜ pending |
| 02-notes-01 | POR-03 (레슨노트 열람 검증) | 1 | — | N/A | manual | `npm run build` | ⬜ pending |
| 02-practice-01 | POR-04 (연습 가이드 플레이스홀더) | 2 | — | anonymous token 처리 주의 | manual | `npm run build` | ⬜ pending |
| 02-pay-01 | POR-05 (monthlyFee=0 empty state) | 1 | — | N/A | manual | `npm run build` | ⬜ pending |
| 02-parent-01 | POR-06 (학부모 뷰 레이아웃 폴리싱) | 2 | — | N/A | visual | `npm run build` | ⬜ pending |
| 02-enroll-01 | POR-07 (수강 신청 진입점) | 1 | — | N/A | manual | `npm run build` | ⬜ pending |
| 02-sibling-01 | POR-08 (다자녀 전환 CSS 통일) | 2 | — | N/A | visual | `npm run build` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

프로젝트에 테스트 러너가 없으므로 Wave 0 테스트 파일 생성 불필요.

*Existing infrastructure covers all phase requirements (build gate + manual browser verification).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| loginAt 저장 후 30일 만료 시 자동 로그아웃 | POR-01 D-06 | localStorage 시각 조작 필요 | DevTools → Application → localStorage → `ryekPortal` 값의 `loginAt`을 `Date.now() - 31*24*60*60*1000`으로 수동 변조 후 새로고침 → 로그인 화면 확인 |
| D-3일 배너 표시 | POR-01 D-07 | 27일 경과 상태 시뮬레이션 필요 | `loginAt`을 `Date.now() - 28*24*60*60*1000`으로 변조 후 홈 탭 확인 → 배너 표시 확인 |
| "30일 연장" 후 loginAt 갱신 | POR-01 D-08 | 클릭 후 localStorage 확인 필요 | 배너 클릭 후 DevTools에서 `loginAt` 값이 현재 시각으로 갱신됐는지 확인 |
| 시간표 위젯 — 수업 없는 학생 위젯 숨김 | POR-02 | lessons=[] 학생 필요 | lessons 배열 비어있는 학생으로 로그인 → 홈 탭에 위젯 컨테이너 미표시 확인 |
| 다중 악기 학생 — 두 카드 표시 | POR-02 D-03 | 멀티 악기 학생 데이터 필요 | 악기 2개 이상 학생으로 로그인 → 홈 탭에 `.portal-next-lesson` 카드 2개 이상 표시 확인 |
| 수납 정보 없음 empty state | POR-05 | monthlyFee=0 학생 필요 | monthlyFee=0 학생으로 로그인 → pay 탭 "수납 정보 없음" 표시 확인 |
| 수강 신청하기 → /register 이동 | POR-07 | 클릭 후 URL 확인 | 홈 탭 최하단 버튼 클릭 → URL이 /register로 변경됨 확인 |
| 다자녀 전환 모달 CSS 클래스 | POR-08 | 형제 학생 계정 필요 | 자녀 2명 있는 학부모 계정으로 로그인 후 "자녀 변경" → `.modal` `.modal-h` `.modal-b` `.modal-f` 클래스 적용 확인 |

---

## Validation Sign-Off

- [ ] All tasks have `npm run build` gate
- [ ] Manual-only list covers all non-automatable behaviors
- [ ] No window.confirm / window.alert in new code
- [ ] No external CSS files created
- [ ] saveStudents not called (Phase 2 is read-only)
- [ ] `nyquist_compliant: true` set in frontmatter after all checks

**Approval:** pending
