---
phase: "07"
plan: "01"
subsystem: payment-matching
tags: [guardianName, students-cache, sync, kv, webhook]
dependency_graph:
  requires: []
  provides: [guardianName-field, students-cache-72h, auto-sync-on-mount]
  affects: [07-02, 07-03]
tech_stack:
  added: []
  patterns: [useRef-guard, best-effort-fetch, silent-catch]
key_files:
  created: []
  modified:
    - src/components/student/StudentManagement.jsx
    - functions/api/payments/sync-students.js
    - src/App.jsx
decisions:
  - "syncedOnMount useRef로 중복 auto-sync 방지 (students.length > 0 → true 전환 시 1회만)"
  - "auto-sync는 silent catch — 실패해도 앱 UI 차단 없음"
  - "sync-students TTL 86400 → 259200 (24h → 72h) — webhook 수신 간격 고려"
metrics:
  duration: "~10m"
  completed: "2026-06-03"
  tasks_completed: 3
  tasks_total: 3
  files_modified: 3
---

# Phase 07 Plan 01: guardianName 필드 + students_cache 개선 + sync 타이밍 수정 Summary

**One-liner:** guardianName 입력 필드 추가 + students_cache TTL 72h + 앱 마운트 시 1회 자동 KV sync 구현

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | StudentFormModal guardianName 필드 추가 | f52cebe | src/components/student/StudentManagement.jsx |
| 2 | sync-students.js guardianName/monthlyFee + TTL 72h | 5594dd8 | functions/api/payments/sync-students.js |
| 3 | App.jsx sync body 갱신 + syncedOnMount auto-sync | 1ad0c21 | src/App.jsx |

## Changes Summary

### Task 1: StudentFormModal
- `form` 초기값(신규/편집 모두)에 `guardianName: ""` 추가
- 보호자 연락처 입력 필드 바로 아래에 보호자 이름 필드 추가
- `canManageAll(currentUser.role)` 조건 적용, `className="inp"`, `placeholder="홍길동"`, `maxLength={20}`

### Task 2: sync-students.js
- `map` 결과에 `guardianName: (s.guardianName || "").trim()`, `monthlyFee: typeof s.monthlyFee === "number" ? s.monthlyFee : 0` 추가
- `expirationTtl`: 86400 → 259200 (24h → 72h)

### Task 3: App.jsx
- payments 탭 진입 sync body에 `guardianName`, `monthlyFee` 추가
- `syncedOnMount` useRef 선언 (teachersRef 바로 아래)
- students 로드 후 1회 best-effort auto-sync useEffect 추가 (dependency: `user?.role`, `students.length > 0`)

## Deviations from Plan

None — plan executed exactly as written.

## Verification

```
guardianName in StudentManagement.jsx: lines 100, 101, 172, 173
expirationTtl in sync-students.js: 259200
guardianName/monthlyFee in sync-students.js map: lines 50, 51
guardianName/monthlyFee in App.jsx sync body: lines 612-613
syncedOnMount in App.jsx: lines 228, 297, 298
npm run build: PASSED (2.60s)
```

## Known Stubs

None.

## Threat Flags

None — no new network endpoints, auth paths, or schema changes at trust boundaries introduced. Existing `/api/payments/sync-students` endpoint fields extended only.

## Self-Check: PASSED

- src/components/student/StudentManagement.jsx: FOUND
- functions/api/payments/sync-students.js: FOUND
- src/App.jsx: FOUND
- commit f52cebe: FOUND
- commit 5594dd8: FOUND
- commit 1ad0c21: FOUND
