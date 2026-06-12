# Project State

## Current Position

**Version**: v16.x (라이브)
**Last push**: `d7b3510` (2026-05-29) — alimtalk 템플릿 텍스트 정교화 + gemini function-call 파싱 수정

## Completed Phases

| Phase | Status | Notes |
|-------|--------|-------|
| 01 보안 기반 | ✓ COMPLETE | |
| 02 포털 완성 | ✓ COMPLETE | |
| 03 AI 완성 | ✓ COMPLETE | |
| 05 수납 자동화 | ✓ COMPLETE | 실제 카카오뱅크 테스트 미완 |
| 07 입금 자동매칭 고도화 | ✓ COMPLETE | |
| BACKUP-01 | ✓ COMPLETE | GitHub Actions 주간 백업 |
| BUG-01 | ✓ COMPLETE | |
| FS-fee-split | ✓ COMPLETE | 과목별 수강료 분리 |
| QA-01 / QA-02 | ✓ COMPLETE | |
| SEC-01 | ✓ COMPLETE | |
| SHOP-01 | ✓ COMPLETE | 즉시청구 & 상품관리 |

## Active Work

**Phase 7: 입금 자동매칭 고도화** — ✓ COMPLETE (2026-06-03)
- 07-01 ✓: guardianName 필드 + students_cache guardianName/monthlyFee + TTL 72h + 앱 마운트 auto-sync
- 07-02 ✓: fuzzyMatchStudent guardian_exact/guardian_fuzzy + split_space + amount_match
- 07-03 ✓: 미매칭 카드 rawText 표시 + 추천 학생 배지 + auto-select useEffect

## Active Work

**Phase 8: 그룹 레슨 고도화** — Planned (2026-06-12)
- 6 plans in 3 waves ready to execute
- Wave 1: 08-01 (rye-lesson-slots 인프라) + 08-06 (예약 설계 문서)
- Wave 2: 08-02 (마이그레이션) + 08-03 (ScheduleView) + 08-04 (Attendance)
- Wave 3: 08-05 (TimetableView)

## Pending / Blockers

- **알림톡**: makeup_lesson(UI_1527) 재승인 대기 — 완료 시 utils.js line 127 throw 제거만 하면 됨
- **카카오뱅크 webhook**: 실제 입금 테스트 미완 (Tasker 설정 대기)
- **monthlyFee**: 전원 0원 상태 — Nick이 직접 수납 관리에서 입력 필요

## Key Decisions

- `saveStudents()` 영구 비활성화 — per-op 트랜잭션만 사용 (addStudentDoc/updateStudentDoc/deleteStudentDoc/batchStudentDocs)
- 알림톡: Aligo API 직접 호출 (Worker 우회, IPv6 문제)
- Firebase Auth: anonymous→email deadlock 해소 — READ isAuthenticated(), WRITE isEmailUser()
- Gemini 2.5 Flash 사용, thinkingBudget:0 (function-call 파싱 안정성)

## DB 백업 체계

- Firebase PITR: 7일 1분 단위 (asia-northeast3)
- Firebase 자동 백업: 매일 14일 + 매주 30일 (GCS)
- GitHub Actions: 매주 월요일 KST 09:00 자동 백업
- 로컬: `npm run db:backup` / `npm run db:restore`
