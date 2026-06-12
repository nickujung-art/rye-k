---
phase: 08-group-lesson-enhancement
plan: "06"
subsystem: database
tags: [firestore, reservations, architecture, design-doc]

# Dependency graph
requires:
  - phase: 08-group-lesson-enhancement/08-01
    provides: rye-lesson-slots 컬렉션 스키마 (예약이 참조하는 슬롯 엔티티)
provides:
  - 08-RESERVATION-SPEC.md — rye-reservations 스키마 + 포털/관리자 흐름 + 정원 체크 로직
affects: [RESERVATION-01, portal, admin]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "rye-reservations: 독립 Firestore 컬렉션 (appData 외부), status 상태머신 (pending/approved/rejected/cancelled)"
    - "정원 체크: getSlotOccupancy(linked + pending), canReserve(group: occupancy < capacity, individual: occupancy === 0)"
    - "승인 권한: admin/manager 전용 — Firestore Security Rules로 강제 (RESERVATION-01 구현 시)"

key-files:
  created:
    - .planning/phases/08-group-lesson-enhancement/08-RESERVATION-SPEC.md
  modified: []

key-decisions:
  - "rye-reservations 독립 컬렉션 — studentIds를 슬롯에 저장하지 않음 (단방향 참조 원칙 유지)"
  - "pending 예약도 정원 선점 처리 — 동시 신청 레이스 컨디션 방지"
  - "승인 권한 admin/manager 전용 — 강사는 열람만, RESERVATION-01에서 Firestore Rules 강제"
  - "예약 이력 보관 (삭제 없음) — 감사 추적 가능"

patterns-established:
  - "정원 체크 패턴: linked(lessons[].slotId) + pending(reservations) 합산으로 실시간 정원 계산"

requirements-completed:
  - GRP-08

# Metrics
duration: 2min
completed: 2026-06-12
---

# Phase 08 Plan 06: 예약 시스템 아키텍처 설계 Summary

**rye-reservations Firestore 스키마 + 포털 신청 흐름 + 관리자 승인 흐름 + getSlotOccupancy/canReserve 정원 체크 로직을 RESERVATION-01 착수 기준 문서로 확정**

## Performance

- **Duration:** 2 min
- **Started:** 2026-06-12T13:51:24Z
- **Completed:** 2026-06-12T13:53:06Z
- **Tasks:** 1
- **Files modified:** 1 (created)

## Accomplishments

- `08-RESERVATION-SPEC.md` 설계 문서 작성 — 7개 섹션 완성
- `rye-reservations` 컬렉션 스키마 정의 (9개 필드: slotId, studentId, requestedBy, requestedAt, status, approvedBy, approvedAt, rejectedReason, notes, desiredStartDate)
- 포털 신청 흐름 + 관리자 승인 흐름 + 중복 신청 방지 로직 기술
- `getSlotOccupancy` + `canReserve` 정원 체크 함수 정의 (그룹/개인 구분)
- 승인 권한 보안 요건 명시 (T-08-06-01, T-08-06-02 처리)

## Task Commits

1. **Task 1: 08-RESERVATION-SPEC.md 작성** - `c4324c5` (docs)

**Plan metadata:** (다음 커밋)

## Files Created/Modified

- `.planning/phases/08-group-lesson-enhancement/08-RESERVATION-SPEC.md` — rye-reservations 예약 시스템 아키텍처 설계 문서 (7개 섹션)

## Decisions Made

- `rye-reservations`를 독립 Firestore 컬렉션으로 설계 (appData 외부) — rye-lesson-slots 패턴 동일, 향후 예약 수 증가 대비
- pending 예약도 정원 선점에 포함 — TOCTOU 레이스 컨디션 방지 (신청 시점과 승인 시점 사이 이중 승인 방지)
- 예약 이력 삭제 없음, status 변경만 — 감사 추적 및 분석 데이터 보존
- 승인은 admin/manager 전용, RESERVATION-01 구현 시 Firestore Security Rules로 강제

## Deviations from Plan

None — 계획된 설계 문서를 그대로 작성. 추가로 승인 권한 보안 요건 섹션(4번 섹션 내 "보안: 승인 권한")을 위협 모델(T-08-06-01) 반영으로 강화 (Rule 2 — 설계 문서 수준의 보안 명세 추가).

## Issues Encountered

None.

## User Setup Required

None — 설계 문서만, 런타임 코드 없음.

## Next Phase Readiness

- `08-RESERVATION-SPEC.md`가 RESERVATION-01 팀의 착수 기준 문서로 준비됨
- 필요한 파일 변경 목록(섹션 6)과 제외 항목(섹션 7)이 명확히 정의됨
- 구현 팀은 스키마, 흐름, 정원 체크 로직 재설계 없이 즉시 착수 가능

## Self-Check

- [x] `.planning/phases/08-group-lesson-enhancement/08-RESERVATION-SPEC.md` FOUND
- [x] commit `c4324c5` exists (docs(08-06): 예약 시스템 아키텍처 설계 문서 작성)

## Self-Check: PASSED

---

*Phase: 08-group-lesson-enhancement*
*Completed: 2026-06-12*
