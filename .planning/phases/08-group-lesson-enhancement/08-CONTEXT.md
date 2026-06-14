# Phase 8: 그룹 레슨 고도화 (Group Lesson Enhancement) - Context

**Gathered:** 2026-06-12
**Status:** Ready for planning
**Source:** Discuss-phase (conversation with Nick)

<domain>
## Phase Boundary

레슨 슬롯(`rye-lesson-slots`)을 명시적 Firestore 엔티티로 신설하고, 기존 학생 데이터를 일괄 마이그레이션한다. 그룹 레슨에 이름을 부여하고 스케줄/출석 화면에서 일관되게 표시한다. 강사와 관리자가 시간표 형태(09:00~21:00 격자)로 수업·공강 현황을 확인하는 TimetableView를 구현한다. 예약 시스템은 설계 문서만 작성하고 구현하지 않는다.

**이번 Phase에 포함:**
- `rye-lesson-slots` 컬렉션 + App.jsx 리스너
- AdminTools 일괄 마이그레이션 버튼 (개인+그룹 슬롯 자동 생성)
- ScheduleView 그룹 이름 인라인 편집
- Attendance 그룹 헤더 슬롯 이름 연동
- TimetableView 컴포넌트 (강사 본인 + 관리자 강사선택)
- 예약 시스템 설계 문서 (`08-RESERVATION-SPEC.md`)

**이번 Phase에서 제외:**
- 실제 예약 기능 (포털 예약 신청, 관리자 승인)
- 슬롯 정원 초과 알림
- 강사 근무 시간 범위 수동 설정 UI

</domain>

<decisions>
## Implementation Decisions

### D-01: 슬롯 엔티티 구조
`rye-lesson-slots` 컬렉션 (기존 `appData` 단일 컬렉션 패턴 밖, 독립 컬렉션):
```js
{
  id,                              // Firestore auto-id
  teacherId,                       // string
  instrument,                      // string
  type: "individual" | "group",
  name: string,                    // 그룹: "가야금 초급반", 개인: 학생 이름 미러
  capacity: number,                // 개인=1, 그룹=N
  schedule: [{ day, time }],       // 반복 요일+시간 (기존 student.lessons[].schedule 형식 동일)
  status: "active" | "paused" | "closed",
  notes: string,
  createdAt: Timestamp,
}
```
- studentIds를 슬롯에 저장하지 않음 (단방향 참조: 학생 → 슬롯)
- 슬롯 멤버십은 students에서 slotId로 역조회

### D-02: 학생 스키마 변경
`student.lessons[i]`에 `slotId?: string` 필드 추가 (기존 필드 유지, optional):
```js
student.lessons[i] = {
  instrument, teacherId, schedule: [{day, time}],
  slotId: "slot_abc123"  // NEW — 마이그레이션 후 채워짐
}
```
- `updateStudentDoc` 트랜잭션으로 업데이트
- `rye-attendance`, `rye-payments` 절대 건드리지 않음

### D-03: 마이그레이션 로직 (idempotent)
AdminTools "레슨 슬롯 초기화" 버튼:
1. 이미 slotId 있는 lesson은 스킵
2. 같은 teacherId + instrument + 정확히 같은 schedule → 그룹 슬롯 1개 생성
3. 그 외 → 개인 슬롯 1개 생성
4. 슬롯 이름 자동: 그룹="(instrument) 그룹", 개인=학생 이름
5. 각 학생 lessons[].slotId를 updateStudentDoc으로 업데이트
6. 마이그레이션 결과 카운트 표시 (생성된 슬롯 수, 업데이트된 학생 수)

### D-04: ScheduleView 그룹 이름 편집
- 그룹 헤더 클릭: 접힘/펼침 동작 유지
- 그룹 이름 텍스트 옆 연필 아이콘 → 클릭 시 인라인 input 전환
- Enter/blur 시 `updateDoc(slotRef, { name })` 저장
- `window.confirm`, `window.alert` 절대 금지 (CLAUDE.md 규칙)

### D-05: Attendance 슬롯 이름 연동
- 그룹 key: `teacherId|day|time|instrument` (기존 로직 유지)
- 슬롯 이름 조회: students 멤버의 slotId → lessonSlots[slotId].name
- fallback: slotId 없으면 기존 "그룹 레슨" 표시

### D-06: TimetableView 레이아웃
```
시간축(09:00~21:00, 30분 단위) × 요일축(월화수목금토일)
각 셀: 슬롯 카드 (컬러=강사 색상, 이름+인원 표시)
빈 셀: 연한 회색 "공강" — 아무 슬롯도 없는 시간대
```
- **강사 본인 뷰**: 자신의 slotId 기반 슬롯만 표시
- **관리자/매니저 뷰**: 강사 카드 목록 → 클릭 → 해당 강사의 동일 TimetableView

### D-07: TimetableView 진입점
- ScheduleView 상단에 "시간표" 탭 추가 (기존 "주간" | "일별" 탭과 나란히)
- 강사 역할: 본인 시간표 자동 표시
- 관리자/매니저: 강사 선택 UI 먼저, 선택 후 시간표

### D-08: 예약 시스템 설계 (구현 없음)
`08-RESERVATION-SPEC.md` 문서 작성:
- `rye-reservations` 스키마 확정
- 포털 → 슬롯 열람 → 예약 신청 흐름
- 관리자 승인 흐름
- 그룹 레슨 정원 체크 로직
구현은 다음 Phase에서 진행

### D-09: Firestore 컬렉션 전략
`appData` 단일 문서 패턴 대신 `rye-lesson-slots` 독립 컬렉션 사용:
- 이유: 슬롯은 개별 CRUD가 필요하고, 향후 예약과 연결되어 문서 수가 많아질 수 있음
- App.jsx에 `onSnapshot(collection(db, 'rye-lesson-slots'), ...)` 리스너 추가
- `addDoc`, `updateDoc`, `deleteDoc` (runTransaction 불필요 — 슬롯은 독립 문서)

### D-10: 마이그레이션 안전 장치
- 기존 `saveStudents()` 절대 금지 (CLAUDE.md)
- 학생 업데이트는 `updateStudentDoc` per-op 트랜잭션만
- 마이그레이션 전 진행 확인 인라인 UI (window.confirm 금지)
- 결과 요약 표시 후 멈춤 (에러 시 부분 완료 상태 허용)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Core Architecture
- `src/App.jsx` — 라우팅 + MainApp 상태·리스너 + generateSeedData. 리스너 패턴 참고 필수
- `src/firebase.js` — Firebase 초기화·인증·runTransaction export
- `src/constants/releases.js` — 릴리즈 히스토리 (변경 시 Nick 별도 승인 필요)

### 관련 컴포넌트
- `src/components/ScheduleView.jsx` — 기존 그룹 감지 로직(line 84~107), 현재 "그룹 레슨" 하드코딩(line 218, 431)
- `src/components/attendance/Attendance.jsx` — 그룹 감지 함수(line 347~364), 그룹 헤더(line 585)
- `src/components/admin/AdminTools.jsx` — 마이그레이션 버튼 추가 위치

### 데이터 패턴
- `src/utils.js` — expandInstitutionsToMembers 포함, 순수 헬퍼 함수
- CLAUDE.md — CRITICAL 규칙: saveStudents 금지, window.confirm/alert 금지, per-op 트랜잭션

</canonical_refs>

<specifics>
## Specific Ideas

### TimetableView CSS 격자 구조 (참고)
```css
/* 30분 단위 행 높이 48px → 1시간 = 96px */
.timetable-grid {
  display: grid;
  grid-template-columns: 60px repeat(7, 1fr);  /* 시간축 + 7요일 */
  grid-template-rows: repeat(25, 48px);          /* 09:00~21:00 = 25행 */
}
```

### 슬롯 매칭 (마이그레이션 시 그룹 감지)
같은 `teacherId` + 같은 `instrument` + 정확히 동일한 schedule 배열(요일+시간 모두 일치) → 그룹
단, 기관 가상회원(`isInstitution=true`)은 마이그레이션 제외 (런타임 생성, DB에 없음)

### getTeacherColor 활용
기존 `getTeacherColor(teacherId, teachers)` 함수로 슬롯 카드 컬러 통일

</specifics>

<deferred>
## Deferred Ideas

- 실제 예약 기능 (포털 예약 신청 + 관리자 승인 + 정원 체크) → 다음 Phase (RESERVATION-01)
- 강사 근무 가능 시간 범위 설정 UI (현재는 슬롯 있는 시간만 표시, 전체 범위 설정 없음)
- 슬롯 정원 초과 알림
- 슬롯 아카이빙 (휴원/종료된 슬롯 히스토리)

</deferred>

---

*Phase: 08-group-lesson-enhancement*
*Context gathered: 2026-06-12 via discuss-phase (conversation)*
