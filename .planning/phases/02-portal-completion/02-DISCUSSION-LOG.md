# Discussion Log — Phase 2: 포털 완성

**Date:** 2026-05-05
**Areas discussed:** 시간표 뷰 형태, 포털 세션 만료 정책

---

## Area 1: 시간표 뷰 형태 (POR-02)

### Q1. 시간표를 어디서 보여줄까요?
**Options presented:** 홈 탭 위젯 / 별도 탭 추가 / 출석 탭에 통합
**Selected:** 홈 탭 위젯
**Notes:** 별도 탭 없이 홈 탭 내 위젯. 현재 탭(6개)에서 탭 수 증가 없음.

### Q2. 이번 주 시간표 위젯에 어떤 정보를 담을까요?
**Options presented:** 다음 수업 + 주간 요약 / 주간 그리드(7일) / 주급 요일리스트만
**Selected:** 다음 수업 + 주간 요약
**Notes:** '다음 수업' 카드 + '이번 주 수업' 리스트 두 섹션 구성.

### Q3. 학생이 악기 2개를 배울 때 위젯에서 어떻게 보여줄까요?
**Options presented:** 모두 표시 / 가장 가까운 수업 1개만 / 탭별 원칙 정하기
**Selected:** 모두 표시
**Notes:** lessons[] 전체 순회. 두 수업 모두 이번 주 리스트에 표시.

### Q4. 담당 강사명을 위젯에 포함할까요?
**Options presented:** 담당 강사명 포함 / 악기+요일+시간만
**Selected:** 담당 강사명 포함
**Notes:** rye-teachers에서 teacherId로 조회. 학생 입장에서 중요한 정보.

---

## Area 2: 포털 세션 만료 정책 (POR-01)

### Q1. 포털 자동로그인이 언제까지 유지되어야 할까요?
**Options presented:** 30일 만료 / 영구 유지 / 7일 만료
**User response (freeform):** "30일 뒤 연장할까요? 팝업을 띄우는건 어때? 연장을 안하거나 선택을 안하게 되면 로그아웃"
**Decision captured:** 30일 만료 + 만료 전 연장 팝업/배너

### Q2. 30일 만료 알림을 언제 실행할까요?
**Options presented:** 만료당일 접속 시 / D-3 사전 알림 / 만료 즉시 자동로그아웃
**Selected:** D-3 사전 알림
**Notes:** 만료 27일 경과(D-3) 시점부터 홈 탭에 배너 표시.

### Q3. 연장 선택 시 세션을 얼마나 늘릴까요?
**Options presented:** 30일 추가 연장 / 접속 시마다 자동 갱신
**Selected:** 30일 추가 연장
**Notes:** 연장 버튼 클릭 시 loginAt을 Date.now()로 재설정. 오늘부터 30일 재시작.

---

## Claude's Discretion Items

다음 영역은 논의하지 않았으며 Claude가 기존 코드 패턴 기반으로 구현한다:
- POR-03: 레슨노트 탭 기존 구현 유지/보완
- POR-04: 연습 가이드 — practice-guide.js Worker 연결 (anonymous auth 이슈 주의)
- POR-05: 수납 현황 — monthlyFee=0 케이스 "데이터 없음" 상태
- POR-06: 학부모 통합 뷰 — PublicParentView 폴리싱
- POR-07: 수강 신청 — 포털 내 진입점(/register 링크) 추가
- POR-08: 다자녀 전환 — 기존 showSiblingModal UX 개선

## Deferred Ideas

- 연습 가이드 anonymous auth 처리 → Phase 3 이관 가능
