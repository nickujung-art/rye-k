---
status: partial
phase: 09-schedule-enhancement
source: [09-VERIFICATION.md]
started: 2026-06-16T00:00:00Z
updated: 2026-06-16T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. 슬롯 자동생성 토스트 + Firestore 확인 (SCH-01)
expected: 학생 신규 등록 또는 수정 저장 시 "슬롯 N개 생성됨" 토스트가 표시되고, Firebase Console에서 `rye-lesson-slots` 컬렉션에 해당 슬롯 문서가 생성(또는 연결)됨. 이미 slotId 있고 스케줄 변경 없으면 토스트 없음(idempotent).
result: [pending]

### 2. TimetableView "+" 버튼 → StudentSearchPopup (SCH-02)
expected: ScheduleView → 시간표 탭에서 강사 선택 후 빈 셀 "+" 클릭 → StudentSearchPopup 오픈. 이름 검색 필터 동작, 학생 선택 시 팝업 닫히고 해당 슬롯 배정. 강사 미선택 상태에서 "+" 클릭 시 '강사를 먼저 선택해주세요' 토스트만 표시됨.
result: [pending]

### 3. 그룹 슬롯 "학생 추가" (SCH-03)
expected: TimetableView에서 그룹 슬롯 카드 클릭 → memberPopup → "학생 추가" 버튼 클릭 → StudentSearchPopup 오픈 → 학생 선택 → 기존 그룹 슬롯에 학생 연결됨.
result: [pending]

### 4. PauseManagementView 렌더 + 복귀 처리 인라인 confirm (SCH-04)
expected: 사이드바 또는 모바일 더보기 "휴회 관리" 클릭 → PauseManagementView 렌더. 휴회 학생 카드 표시(이름·강사·악기·경과일). "케어로그 입력" 버튼 → 모달 오픈 → 저장. "복귀 처리" 버튼 → window.confirm 없이 인라인 [확인][취소] 버튼 표시 → [확인] 클릭 → status active로 변경됨.
result: [pending]

### 5. pauseHistory Firestore 확인 (SCH-05)
expected: 복귀 처리 [확인] 클릭 후 Firebase Console에서 해당 student 문서 확인 → `pauseHistory[]` 배열에 항목 추가됨 (pausedAt, pausedReason, resumedAt, durationDays, slotIds 필드).
result: [pending]

### 6. Dashboard pm-link-banner 렌더 + 이동 (SCH-04)
expected: 대시보드에서 휴회 학생이 1명 이상 있을 때 "휴회 관리 ›" 배너가 표시됨. 배너 클릭 시 PauseManagementView로 이동.
result: [pending]

## Summary

total: 6
passed: 0
issues: 0
pending: 6
skipped: 0
blocked: 0

## Gaps
