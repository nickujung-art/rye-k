---
status: complete
phase: 08-group-lesson-enhancement
source: [08-VERIFICATION.md]
started: 2026-06-13T00:00:00Z
updated: 2026-06-15T00:00:00Z
---

## Current Test

Human UAT complete (2026-06-15)

## Tests

### 1. 마이그레이션 실행
expected: AdminTools → "레슨 슬롯" 뷰에서 "레슨 슬롯 초기화 실행" 버튼 클릭 → 인라인 확인 UI → "확인" → rye-lesson-slots 문서 생성되고 학생 lessons[].slotId 채워짐. 재실행 시 새 슬롯 0개 (idempotent).
result: [pass]

### 2. TimetableView 격자 시각
expected: ScheduleView → "시간표" 탭 클릭 → 09:00~21:00 × 월~일 CSS 격자 렌더. 슬롯 카드가 정확한 요일·시간 셀에 표시되고 강사 컬러 + 이름 + 인원수 보임. 빈 셀은 빈 상태.
result: [pass]

### 3. 인라인 이름 편집 UX
expected: ScheduleView 주간/월간 → 그룹 레슨 헤더에서 연필(✏) 아이콘 클릭 → input 전환 → 이름 수정 후 Enter 또는 blur → Firestore 저장 → 페이지 새로고침 후 이름 유지. 헤더 클릭(접힘/펼침)은 편집과 독립 동작.
result: [pass]

### 4. Attendance 슬롯 이름
expected: 마이그레이션 완료 후 Attendance 그룹 헤더에 슬롯 이름이 굵게 표시됨 (예: **가야금 그룹** · 가야금 · 14:00 · ...). 마이그레이션 전/slotId 없는 경우 기존 "악기 · 시간 · 강사 강사 · N명" 형식 유지.
result: [pass]

### 5. 역할 분기 (강사 vs 관리자)
expected: 강사 계정 로그인 → ScheduleView 시간표 탭 → 본인 슬롯만 자동 표시 (강사 선택 UI 없음). 관리자/매니저 계정 → 강사 카드 그리드 먼저 표시 → 강사 카드 클릭 → 해당 강사 시간표 표시 → "← 강사 목록" 버튼으로 돌아가기.
result: [pass]

## Summary

total: 5
passed: 5
issues: 0
pending: 0
skipped: 0
blocked: 0

## Gaps
