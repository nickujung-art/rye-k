---
phase: 09-schedule-enhancement
type: validation
created: 2026-06-15
---

# Phase 9 Validation Plan

## Test Framework

| Property | Value |
|----------|-------|
| Framework | 없음 (CLAUDE.md: "테스트 러너 없음") |
| Config file | 없음 |
| Quick run command | `npm run build` |
| Full suite command | `npm run build` (동일) |

## Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | Manual Verification |
|--------|----------|-----------|-------------------|---------------------|
| SCH-01 | 학생 저장 시 슬롯 자동 연결·생성, 토스트 표시 | 빌드 + 브라우저 수동 | `npm run build` | 브라우저에서 학생 저장 후 슬롯 생성 확인. 슬롯 토스트 "슬롯 N개 생성됨" 표시 확인 |
| SCH-02 | TimetableView "+" 버튼 → 팝업 → 슬롯 배정 | 빌드 + 브라우저 수동 | `npm run build` | 강사 선택 후 빈 셀 "+" 클릭 → StudentSearchPopup 표시 → 학생 선택 → 슬롯 생성 확인 |
| SCH-03 | 그룹 슬롯 팝업 "학생 추가" 버튼 동작 | 빌드 + 브라우저 수동 | `npm run build` | TimetableView 그룹 카드 클릭 → memberPopup → "학생 추가" 클릭 → StudentSearchPopup 확인 |
| SCH-04 | 사이드바 "휴회 관리" 메뉴 + 전체 뷰 기능 | 빌드 + 브라우저 수동 | `npm run build` | 사이드바 "휴회 관리" 클릭 → PauseManagementView 렌더 확인. 케어로그 입력, 복귀 처리 인라인 confirm 확인 |
| SCH-05 | 복귀 처리 시 pauseHistory 항목 자동 추가 | 빌드 + Firestore 콘솔 | `npm run build` | "복귀 처리" [확인] 클릭 → Firestore 콘솔에서 student 문서의 `pauseHistory[]` 배열에 항목 추가됨 확인 |

## Sampling Rate

- **각 Wave 완료 후:** `npm run build` 통과 확인
- **페이즈 게이트:** `npm run build` 통과 + Nick 로컬 브라우저 검증 (`npm run dev`)

## Wave 0 Gaps

없음 — 기존 빌드 인프라(`npm run build`)로 충분

## Safety Checklist (모든 Wave)

- [ ] `grep -r "saveStudents" src/` 결과 0 (금지 패턴)
- [ ] `grep -r "window\.confirm\|window\.alert" src/` 결과 0 (금지 패턴)
- [ ] `npm run build` 통과 (에러 0)
