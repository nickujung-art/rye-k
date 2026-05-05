---
plan: 01-04
phase: 01-security-foundation
status: complete
completed: 2026-05-05
commits:
  - 741d833
requirements:
  - SEC-06
---

# Plan 01-04: Firestore 보안 규칙 역할 기반 재작성

## What Was Built

`firestore.rules`를 역할 기반으로 완전히 재작성하여 익명 전체 읽기를 차단하고 Custom Claims 기반 접근 제어를 적용했다.

## Changes Made

### firestore.rules (전면 재작성)

제거:
- `isAuthed()` 함수 — 익명 전체 읽기 허용 패턴 완전 제거

추가:
- `isEmailUser()`, `isAnonymous()` — provider 구분
- `hasRole(r)`, `isAdmin()`, `isManagerOrAbove()`, `isStaff()` — Custom Claims 기반 역할 확인

컬렉션별 규칙:
- `rye-students`, `rye-teachers`: isStaff() 읽기, isManagerOrAbove() 쓰기
- `rye-payments`: isManagerOrAbove() 전용 (강사 숨김)
- `rye-attendance`: isStaff() || isAnonymous() (포털 댓글 임시 허용 — Phase 2 서브컬렉션 분리 예정)
- `rye-pending`: staff 읽기, 인증된 모든 사용자 쓰기 (/register 폼)
- `rye-activity`: isAdmin() 읽기, isStaff() 쓰기
- `rye-trash`: isAdmin() 전용

## Deployment Note

**코드 완성. 배포는 Phase 2(포털 복구)와 동시 진행 예정.**
- 이유: 현재 규칙 적용 시 /myryk 포털 학생 로그인 중단됨
- Phase 2 POR-01(Worker 기반 student lookup) 완성 후 한번에 배포

포털 복구 후 배포 시 확인 필요:
- 익명 read → PERMISSION_DENIED 확인
- 강사 로그인 후 학생 목록 정상 로드 확인
- /myryk 포털은 Phase 2 Worker를 통해 정상 동작 확인

## Verification

- `grep -c "isAuthed" firestore.rules` → 0 ✓
- isStaff(), isManagerOrAbove(), isAdmin() 함수 정의 + 사용처 포함 ✓
- rye-students, rye-teachers, rye-payments 컬렉션별 rule 존재 ✓

## Self-Check: PASSED (코드)

- isAuthed() 없음 — 익명 전체 읽기 패턴 완전 제거 ✓
- Custom Claims role 기반 gate 적용 ✓
- rye-pending 익명 write 허용 유지 ✓
