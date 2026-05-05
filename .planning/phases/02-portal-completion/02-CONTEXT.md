# Phase 2: 포털 완성 (Portal Completion) - Context

**Gathered:** 2026-05-05
**Status:** Ready for planning

<domain>
## Phase Boundary

학생·학부모가 앱 수준의 포털(`/myryk`)에서 시간표·출결·레슨노트·수납 현황을 확인하고,
포털 로그인이 브라우저를 닫아도 30일간 유지된다.

**Requirements:** POR-01 ~ POR-08 (8개)

**Success criteria (from ROADMAP.md):**
1. 학생이 포털에서 자신의 수업 요일·시간표를 모바일 화면에서 확인할 수 있다
2. 학생 또는 학부모가 포털에서 강사 작성 레슨노트를 열람할 수 있다
3. 학부모가 포털에서 자녀의 이번 달 수납 완납/미납 현황을 확인할 수 있다
4. 포털 로그인 후 브라우저를 닫았다가 30일 이내 재방문 시 자동 로그인된다
5. 학생 또는 학부모가 포털에서 수강 신청을 제출하면 관리자 화면에 승인 대기 항목이 나타난다

</domain>

<decisions>
## Implementation Decisions

### 시간표 뷰 (POR-02)

- **D-01:** 별도 탭 없이 **홈 탭 위젯**으로 통합한다. TAB_ORDER 변경 없음.
- **D-02:** 위젯은 두 섹션으로 구성:
  - **'다음 수업' 카드** — 가장 가까운 다음 수업 1건: 요일·시간·악기명·담당 강사명 표시
  - **'이번 주 수업' 리스트** — 이번 주 수업 있는 요일 전체 나열 (수업 없으면 숨김)
- **D-03:** 학생이 악기 2개 이상을 배우는 경우 **모두 표시** (lessons[] 전체 순회)
- **D-04:** 담당 강사명은 `rye-teachers` 컬렉션에서 `teacherId`로 조회하여 표시한다

### 포털 세션 만료 정책 (POR-01)

- **D-05:** 로그인 시각을 `localStorage["ryekPortal"]`에 `loginAt: Date.now()` 필드로 함께 저장한다.
  현재 구조 `{ code, pw }` → `{ code, pw, loginAt }` 으로 확장.
- **D-06:** 자동로그인 복원 시 만료 여부 체크:
  - `Date.now() - loginAt > 30 * 24 * 60 * 60 * 1000` → 만료. localStorage 삭제 후 로그인 화면.
- **D-07:** 만료 **D-3일(27일 경과)** 부터 홈 탭 최상단에 배너 표시:
  > "로그인이 3일 후 만료됩니다. [30일 연장] [로그아웃]"
- **D-08:** 연장 선택 시 `loginAt`을 `Date.now()`로 재설정 (오늘부터 30일 재시작)
- **D-09:** 배너에서 응답 없이 만료되면 다음 접속 시 자동 로그아웃 (기존 만료 체크로 처리됨)

### Claude's Discretion

다음 요구사항은 논의하지 않았으며 Claude가 기존 코드 패턴 기반으로 판단한다:

- **POR-03** (레슨노트 → 학부모 열람): "notes" 탭 이미 존재. 현재 구현 그대로 유지하거나 접근성 보완.
- **POR-04** (연습 가이드): `practice-guide.js` Worker 존재. 레슨노트 탭 내 버튼으로 연결 권장.
- **POR-05** (수납 현황): "pay" 탭 이미 존재. `monthlyFee` 가 0인 경우 "데이터 없음" 상태 표시.
- **POR-06** (학부모 통합 뷰): `PublicParentView` 이미 구현. 통합 레이아웃 개선 중심.
- **POR-07** (수강 신청 진입점): 포털 홈 탭 또는 하단 네비에 "수강 신청" 버튼 추가. `/register`로 이동.
- **POR-08** (다자녀 전환): `showSiblingModal` 로직 이미 존재. UX 폴리싱 수준.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 현재 포털 구현
- `src/components/portal/PublicPortal.jsx` — PublicParentView, PublicRegisterForm, AttendanceCalendar 전체. 포털 탭 구조·세션 로직 여기에 있음
- `src/utils.js` — `getBirthPassword()`, `computeMonthlyAttStats()`, `allLessonInsts()`, `allLessonDays()` 등 포털에서 사용하는 헬퍼

### 데이터 구조
- `src/constants.jsx` — CSS 인라인 문자열 패턴, `DAYS`, `THIS_MONTH`, `TODAY_STR`
- `.planning/REQUIREMENTS.md` §POR — POR-01~POR-08 전체 요구사항 목록

### Cloudflare Workers
- `functions/api/ai/practice-guide.js` — 연습 가이드 AI 엔드포인트 (POR-04 연결 대상)
- `functions/api/ai/_middleware.js` — auth guard + rate limiter (포털 연동 시 참고)

### Phase 1 보안 기반
- `.planning/phases/01-security-foundation/01-RESEARCH.md` — Firestore 규칙, Auth 세션 아키텍처 (포털 Anonymous auth → POR-01과 연동)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AttendanceCalendar` (PublicPortal.jsx) — 월별 출석 캘린더 컴포넌트. 이미 완성. 재사용.
- `PublicRegisterForm` (PublicPortal.jsx) — 수강 신청 폼. `/register` 라우트. POR-07은 포털 내 진입점만 추가.
- `localStorage["ryekPortal"]` — 현재 `{ code, pw }` 저장. D-05에서 `loginAt` 필드 추가로 확장.
- `showSiblingModal`, `childCandidates` — 다자녀 전환 UI 기반 이미 존재 (POR-08).

### Established Patterns
- CSS: `constants.jsx` 내 CSS 문자열 + `<style>` 태그 주입. **외부 CSS 파일 없음. 이 패턴 유지 필수.**
- `window.confirm` / `window.alert` **절대 금지** — 배너·팝업은 인라인 UI로.
- 탭 구조: `TAB_ORDER = ["home","notice","att","notes","report","pay"]` — D-01에 따라 탭 추가 없음.
- Firestore: `onSnapshot` 실시간 리스너. 포털은 현재 `firebaseSignInAnon()` + 6개 컬렉션 구독.

### Integration Points
- 시간표 위젯: `student.lessons[]` → `l.schedule[]` → 요일·시간 파싱. `teachers` state에서 `teacherId` 매핑.
- 세션 만료 배너: `tab === "home"` 렌더링 시 `loginAt` 체크 → D-3일 이내이면 배너 표시.
- 연습 가이드: `/api/ai/practice-guide` fetch → `Authorization: Bearer <firebase-id-token>`. **포털은 이메일 Auth 없음 → anonymous token 사용 or 별도 인증 방식 검토 필요.**

</code_context>

<specifics>
## Specific Ideas

- **시간표 위젯 와이어프레임 (Nick 확인):**
  ```
  ┌─────────────────────────┐
  │  🎵 다음 수업            │
  │  화요일 15:00 · 가야금   │
  │  담당: 김민지 선생님      │
  ├─────────────────────────┤
  │  이번 주 수업            │
  │  화 15:00 · 목 16:00    │
  └─────────────────────────┘
  ```

- **세션 만료 배너 문구 예시:**
  > "로그인이 3일 후 만료됩니다." [30일 연장] [로그아웃]

- **연장 흐름:** 배너의 "30일 연장" 버튼 클릭 → `loginAt = Date.now()` 재설정 → 배너 사라짐

</specifics>

<deferred>
## Deferred Ideas

- **연습 가이드 anonymous auth 문제** — 포털은 이메일 로그인 없어 Bearer 토큰 방식 검토 필요. 복잡도 높으면 Phase 3(AI 완성)으로 이관 가능.
- POR-04 (연습 가이드) 는 P1 우선순위. 구현 복잡도에 따라 Phase 2에서 플레이스홀더로 처리하고 Phase 3에 연결 가능.

</deferred>

---

*Phase: 02-portal-completion*
*Context gathered: 2026-05-05*
