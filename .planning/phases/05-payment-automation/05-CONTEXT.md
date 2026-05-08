# Phase 5: 수납 자동화 (Payment Automation) - Context

**Gathered:** 2026-05-08
**Status:** Ready for planning

<domain>
## Phase Boundary

수강료 데이터를 관리자가 수납 화면 스프레드시트 형태로 편리하게 입력·수정하고, 카카오뱅크 입금 알림을 Tasker Webhook을 통해 자동으로 파싱·매칭하여 수납 처리하며, 미납 현황을 Dashboard 홈탭과 수납 화면에서 실시간으로 확인할 수 있다. 미매칭 입금은 별도 탭에서 수동 처리하고, ALM-07 미납 리마인더는 UI 스텁으로 포함(실제 발송은 Phase 4 AlimTalk API 연결 후).

</domain>

<decisions>
## Implementation Decisions

### 수강료 일괄 입력 UX (PAY-01)
- **D-01:** 수납 화면(PaymentsView.jsx)에 스프레드시트 형태 인라인 편집 추가 — 학생 목록 테이블에서 수강료 셀 클릭 시 직접 편집 가능
- **D-02:** 77명 일괄 입력이 가능하도록 Tab/Enter로 다음 행 이동 지원
- **D-03:** 저장은 `updateStudentDoc()` per-op 트랜잭션 사용 (saveStudents 절대 금지)

### 수납 현황 대시보드 (PAY-02)
- **D-04:** Dashboard.jsx 홈탭에 미납 현황 카드 추가 — 이달 미납 인원, 수납률(%), 미납 금액 합계 표시
- **D-05:** 카드 클릭 시 PaymentsView로 이동하며 미납 필터 활성화 상태로 진입

### 월별 수납 뷰 초기화 (PAY-03)
- **D-06:** '새달 수납 쓰기' 버튼 — 수납 화면 상단 월 선택기에서 새 달 선택 시 해당 월 수납 레코드 없음 = 미납으로 자동 표시 (기존 getPayment() 로직과 일치)
- **D-07:** 실수 bulk reset 방지를 위해 전체 초기화 버튼은 구현하지 않음

### 카카오뱅크 입금 자동 매칭 파이프라인 (PAY-04/05)
- **D-08:** Toss Payments 가상계좌 대신 카카오뱅크 알림 → Tasker Webhook 방식 채택
- **D-09:** Tasker(Android) + AutoNotification 플러그인으로 카카오톡 입금 알림 감지
  - 트리거: KakaoTalk 알림 텍스트에 "입금" 포함
  - 정규식: `(\S+)\s+([\d,]+)원\s+입금` → `name`, `amount` 추출
  - HTTP POST to Cloudflare Worker
- **D-10:** Cloudflare Worker 엔드포인트: `functions/api/payments/kakaobank-webhook.js`
- **D-11:** 보안: API Key 방식 — `X-RYE-Secret: {secret}` 헤더 검증 (Tasker에서 헤더 설정, Cloudflare secret으로 저장)
- **D-12:** 입금자명 = 학생 본인 이름 기준 fuzzy 매칭
- **D-13:** 알림 형식 다양성 대응 — `[카카오뱅크] {name} {amount}원 입금`, `{name} {amount}원` 등 여러 패턴 허용 (Claude 재량)

### 미매칭 입금 UI (PAY-06)
- **D-14:** PaymentsView.jsx에 '미매칭 입금' 탭 신설
- **D-15:** 미매칭 입금은 Firestore `rye-unmatched-payments` 또는 `rye-payments` 내 `unmatched: true` 필드로 저장 (Claude 재량)
- **D-16:** 탭에서 입금자명+금액 표시 → 관리자가 학생 선택 → 수납 처리 완료

### ALM-07 미납 리마인더 (스텁)
- **D-17:** 이번 Phase에 UI 스텁 포함 — 미납 학생 리스트에서 알림톡 발송 버튼 표시
- **D-18:** 실제 AlimTalk 발송은 Phase 4 API 심사 완료 후 연결 (현재 AlimtalkModal 이미 import 되어 있음)
- **D-19:** 스텁 상태 표시: 버튼 클릭 시 "Phase 4 AlimTalk 연동 후 활성화" 안내 또는 AlimtalkModal를 disabled 상태로 열기

### Claude의 재량
- fuzzy 매칭 알고리즘: Levenshtein distance 기반, 한글 3글자 이름 기준 거리 1~2 이내 허용
- Webhook Worker 에러 처리 및 재시도 로직
- 스프레드시트 편집 UX 세부 디자인 (CSS-in-JS, 기존 PaymentsView 패턴 준수)
- 미매칭 입금 Firestore 저장 방식 세부 결정

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### 기존 수납 UI
- `src/components/payment/PaymentsView.jsx` — 기존 수납 화면 전체. AlimtalkModal import, BulkPrepModal, quickPayingId, filterUnpaid, getPayment(), autoFee() 포함. 스프레드시트 편집 및 미매칭 탭 추가 위치.
- `src/components/student/StudentManagement.jsx` — monthlyFee 입력 필드(line 155), BulkFeeModal 컴포넌트 패턴 참조
- `src/components/dashboard/Dashboard.jsx` — 홈탭 카드 레이아웃 패턴 (미납 현황 카드 추가 위치)

### Cloudflare Workers
- `functions/api/ai/` — Worker 파일 구조 패턴 (auth guard, KV 바인딩, CORS)
- `wrangler.toml` — Worker 바인딩 설정 (새 secret `RYE_WEBHOOK_SECRET` 추가 필요)

### 프로젝트 규칙
- `CLAUDE.md` — **saveStudents 금지**, window.confirm 금지, CSS-in-JS 패턴, per-op 트랜잭션 함수 목록
- `src/constants.jsx` — CSS 문자열 위치, 상수 (PAY_METHODS 등)
- `src/firebase.js` — `updateStudentDoc()`, `batchStudentDocs()` 트랜잭션 함수

### Phase 3 결과물 (ALM-07 스텁 참고)
- `src/components/shared/AlimtalkModal.jsx` — 이미 구현된 알림톡 발송 모달
- `src/components/ai/AiAssistant.jsx` — Gemini API 연동 패턴 참고 (Phase 3)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AlimtalkModal`: PaymentsView.jsx에 이미 import, `alimtalkModal` state `null | "monthly_fee" | "unpaid_reminder"` — ALM-07 스텁에 바로 활용 가능
- `filterUnpaid` state: PaymentsView.jsx에 이미 존재 — 미납 필터 로직 재사용
- `getPayment(studentId)`: `payments.find(p => p.studentId === studentId && p.month === month)` — 새 달 레코드 없으면 undefined = 미납
- `autoFee(s)`: `s.monthlyFee || 0) + 대여료` — 수강료 계산 함수
- `quickPayingId` 패턴: 빠른 입금 버튼의 낙관적 업데이트 패턴 참고

### Established Patterns
- CSS-in-JS: `src/constants.jsx`에 CSS 문자열로 주입 (`<style>` 태그), 외부 CSS 파일 없음
- 수납 데이터 구조: `rye-payments` → `{ studentId, month, paid, amount, paidAmount, paidDate, method, note }`
- Firestore per-op: `updateStudentDoc(student)` 사용 (saveStudents 절대 금지)
- BulkPrepModal 패턴 (PaymentsView): 일괄 처리 모달 → bulk 변경 → `batchStudentDocs()` 호출

### Integration Points
- PaymentsView.jsx: 스프레드시트 편집 + 미매칭 탭 추가
- Dashboard.jsx: 홈탭 미납 현황 카드 추가 (`students`, `payments` props 필요)
- App.jsx: Dashboard props에 `payments` 추가 필요 여부 확인 (현재 전달 여부 확인 필수)
- `wrangler.toml`: `RYE_WEBHOOK_SECRET` 환경변수 추가

</code_context>

<specifics>
## Specific Ideas

### Tasker 설정 가이드 (Webhook Worker README 또는 CLAUDE.md 별첨)
1. Tasker + AutoNotification 플러그인 설치
2. Profile 트리거: 앱=KakaoTalk, 알림 텍스트 contains "입금"
3. Task: AutoNotification → JavaScript 실행
   ```javascript
   var text = <%ANTEXT%>;
   var patterns = [
     /(\S+)\s+([\d,]+)원\s+입금/,
     /\[카카오뱅크\]\s+(\S+)\s+([\d,]+)원/
   ];
   // 추출 후 HTTP POST
   ```
4. HTTP POST: `POST https://rye-k.pages.dev/api/payments/kakaobank-webhook`
   - Header: `X-RYE-Secret: {secret_value}`
   - Body: `{"name": "홍길동", "amount": 100000, "timestamp": "..."}`

### fuzzy 매칭 로직 힌트
- 한글 이름 3글자 기준: 완전 일치 우선, Levenshtein 1 이내 2순위
- 동명이인 처리: 매칭 점수 동점 시 → 미매칭 큐로 이동
- 금액 검증: 입금 금액이 학생 월 수강료(autoFee)와 ±5% 이내면 매칭 확정, 차이 크면 미매칭

</specifics>

<deferred>
## Deferred Ideas

- ALM-07 실제 AlimTalk 발송 (Phase 4 AlimTalk API 심사 완료 후 연결)
- Toss Payments 가상계좌 연동 → 카카오뱅크 Tasker 방식으로 대체하여 불필요
- 다자녀 학부모 이름으로 입금 매칭 (현재 스코프 아님)
- 입금 이력 뷰 (PaymentsView CSV 내보내기로 현재 대응 가능)

</deferred>

---

*Phase: 05-payment-automation*
*Context gathered: 2026-05-08 via discuss-phase (chat)*
