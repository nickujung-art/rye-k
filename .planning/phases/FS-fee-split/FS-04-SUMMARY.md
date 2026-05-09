---
phase: FS-fee-split
plan: "04"
subsystem: admin-migration
tags: [migration, fee-split, categories-view, batch-update]
dependency_graph:
  requires: [FS-02, FS-03]
  provides: [fee-migration-ui, onMigrateFeeSplit-handler]
  affects: [AdminTools.jsx, App.jsx]
tech_stack:
  added: []
  patterns: [inline-confirm-ui, batchStudentDocs, calcLessonFeeWithFallback]
key_files:
  created: []
  modified:
    - src/components/admin/AdminTools.jsx
    - src/App.jsx
decisions:
  - "마이그레이션 결과 카드에 오류 메시지도 표시 (error 필드 처리 추가)"
  - "migrateConfirm 상태를 finally 블록에서 항상 초기화하여 UI 정리"
metrics:
  duration: "~15m"
  completed: "2026-05-09"
  tasks_completed: 1
  tasks_total: 2
  files_changed: 2
---

# Phase FS Plan 04: CategoriesView 마이그레이션 버튼 Summary

## One-liner

CategoriesView에 batchStudentDocs 기반 수강료 마이그레이션 버튼 추가 — 인라인 확인 UI + 결과 표시

## What Was Built

- `AdminTools.jsx` CategoriesView에 `onMigrateFeeSplit` prop 추가
- `migrateConfirm` / `migrating` / `migrateResult` state로 UI 상태 관리
- 인라인 2단계 확인 UI (window.confirm/alert 미사용): "실행" 버튼 → 경고 메시지 + "확인 — 실행" / "취소"
- 마이그레이션 완료 후 업데이트 수 / 건너뜀 수 표시, 오류 시 빨간 메시지
- `App.jsx` import에 `calcLessonFeeWithFallback` 추가
- `App.jsx` CategoriesView 렌더에 `onMigrateFeeSplit` 핸들러 연결:
  - 대상: active/paused 비기관 학생, lessons.length > 0
  - fee 우선순위: `l.fee > 0` → `feePresets[instrument]` → `monthlyFee / lessons.length`
  - 변경이 있는 학생만 `batchStudentDocs`로 일괄 업데이트
  - 완료 후 활동 로그 + 토스트 표시, `{ updated, skipped }` 반환

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | CategoriesView 마이그레이션 버튼 UI + App.jsx 연결 | c9945e4 | src/components/admin/AdminTools.jsx, src/App.jsx |

## Deviations from Plan

### Auto-added improvements

**1. [Rule 2 - Missing error handling] 오류 메시지 표시 추가**
- **Found during:** Task 1 구현
- **Issue:** 계획의 예시 코드에서 migrateResult.error 필드를 저장하지만 표시하지 않았음
- **Fix:** migrateResult.error 존재 시 빨간 오류 메시지 렌더링 추가
- **Files modified:** src/components/admin/AdminTools.jsx

"None" 외 변경: 계획 코드를 그대로 적용하되, 오류 표시 UI를 보강하여 사용성 개선.

## Known Stubs

없음 — 마이그레이션 핸들러는 실제 batchStudentDocs로 Firestore에 쓴다.

## Threat Flags

없음 — CategoriesView는 App.jsx에서 `user.role === "admin"` 조건으로 렌더되므로 접근 제한 보장됨.

## Checkpoint: human-verify (PENDING)

Task 2는 `checkpoint:human-verify`로, **자동 승인하지 않음**. Nick이 브라우저에서 직접 확인 필요.

### 확인 방법

1. `npm run dev` 실행
2. 관리자로 로그인 → 카테고리 관리
3. 화면 하단 "레슨별 수강료 마이그레이션" 카드 표시 확인
4. "수강료 마이그레이션 실행" 클릭 → 인라인 경고 + "확인 — 실행" / "취소" 버튼 표시 확인 (팝업 없음)
5. "확인 — 실행" 클릭 → 완료 메시지 (N명 업데이트, M명 건너뜀) 확인
6. 마이그레이션 후 회원 수정 → 레슨 수강료 필드에 값이 채워졌는지 확인
7. FS-01~03 기능도 함께 확인 (LessonEditor fee 입력, PaymentsView breakdown, Dashboard 미납)

문제 없으면 "approved" 입력. 이슈 발견 시 구체적인 증상 설명.

## Self-Check: PASSED

- [x] src/components/admin/AdminTools.jsx 수정됨
- [x] src/App.jsx 수정됨
- [x] 커밋 c9945e4 존재
- [x] saveStudents 미사용 (batchStudentDocs만 사용)
- [x] window.confirm/alert 미사용 (인라인 확인 UI)
- [x] npm run build 통과
