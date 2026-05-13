# Phase SHOP-01: 즉시 청구 & 상품 관리 시스템 — Context

**Gathered:** 2026-05-13
**Status:** Ready for planning
**Source:** Design discussion with Nick

<domain>
## Phase Boundary

월청구와 별개인 즉시 상품 청구 시스템을 구현한다. 강사가 한복·악세사리·악기가방 등 상품을 판매 시 즉시 청구를 요청하면, 관리자가 승인 후 알림 메시지를 클립보드 복사로 발송하고, 입금 확인 후 수납 레코드가 자동 생성된다. 기존 `pendingOneTimeCharges` 월청구 번들 시스템과 공존한다.

</domain>

<decisions>
## Implementation Decisions

### D-01: 알림톡 발송 방식
클립보드 복사 방식. 관리자가 "복사" 버튼 클릭 → 카카오톡에 직접 붙여넣기. Solapi API 연동은 Phase 4 알림톡 통합 때 처리.

### D-02: 데이터 저장소
`rye-instant-charges` 별도 Firestore 컬렉션 사용. appData 단일 문서가 아니라 독립 컬렉션. onSnapshot 리스너로 실시간 동기화.

### D-03: 기존 시스템 관계
기존 `pendingOneTimeCharges` (월청구 번들)과 공존. 즉시 청구는 `rye-instant-charges` 컬렉션, 월청구 번들은 student 문서 내 `pendingOneTimeCharges` 배열로 분리 유지.

### D-04: 상품 카탈로그 저장
`rye-shop-items` 키를 appData 컬렉션에 저장 (기존 `rye-fee-presets`, `rye-categories`와 동일 패턴). 구조: `{ categories: string[], items: ShopItem[] }`.

### D-05: 상품 카탈로그 관리 위치
AdminTools 컴포넌트에 "상품관리" 탭 추가. 기존 탭(활동기록, 등록대기, 휴지통, 과목관리) 옆에 신규 탭.

### D-06: 기본 카테고리
4개 고정 기본값: `["의상/공연복", "악세사리", "악기 가방", "기타"]`. 관리자가 추가·삭제 가능.

### D-07: 즉시 청구 요청 진입점
수납 관리 탭 (`PaymentsView`) → 학생 카드 하단 `"즉시 청구 요청"` 버튼. 강사(isTeacher) 권한으로만 노출. (기존 "비용 청구 요청" 버튼은 pendingOneTimeCharges 흐름이므로 별개로 유지.)

### D-08: 즉시 청구 상태 머신
`"pending"` → `"approved"` → `"paid"` / `"rejected"`. rejected는 터미널 상태.

### D-09: 입금 확인 시 payment 레코드
`status: "paid"` 변경과 동시에 `rye-payments` 컬렉션에 독립 레코드 생성. 월 수납 레코드와 구분되는 `type: "instant"` 필드 추가.

### D-10: 금액 미정 처리
`amountPending: true` 시 관리자가 승인 모달에서 금액 필수 입력 후 승인 가능. 금액 0원으로는 승인 불가.

### D-11: CLAUDE.md 제약 준수
- `saveStudents([...])` 사용 금지 — 학생 CRUD는 per-op 트랜잭션 함수만
- `window.confirm/alert` 금지 — 모든 확인은 인라인 UI
- CSS는 `src/constants.jsx` 내 CSS 문자열 블록에 작성
- `git push` 자동 실행 금지

### Claude's Discretion
- 즉시청구 요청 모달의 정확한 레이아웃 (카탈로그 그리드 vs 드롭다운)
- 승인 모달의 거절 사유 입력 필드 포함 여부
- payment 레코드 생성 시 month 필드 값 (생성일 기준 월)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Rules
- `CLAUDE.md` — 프로젝트 규칙 (saveStudents 금지, window.confirm 금지, CSS 위치, git push 정책)

### Core Source Files
- `src/firebase.js` — Firebase 초기화, runTransaction, per-op CRUD 함수 패턴
- `src/App.jsx` — 상태 관리, Firestore 리스너 패턴, prop drilling 구조
- `src/constants.jsx` — CSS 문자열 블록 위치 및 기존 CSS 클래스 참조
- `src/components/payment/PaymentsView.jsx` — 기존 pendingOneTimeCharges 승인 패턴 (참조용)
- `src/components/admin/AdminTools.jsx` — 기존 탭 구조 및 CategoriesView 패턴 (상품관리 탭 모델)
- `src/components/dashboard/Dashboard.jsx` — 기존 알림 배지 패턴

### Data Model (확정)
```js
// rye-instant-charges 컬렉션 — 각 문서
{
  id: string,
  studentId: string,
  teacherId: string,
  itemCategory: "의상/공연복" | "악세사리" | "악기 가방" | "기타",
  itemName: string,
  amount: number,
  amountPending: boolean,
  stockAvailable: boolean,
  status: "pending" | "approved" | "rejected" | "paid",
  note: string,
  createdAt: Timestamp,
  approvedAt: Timestamp | null,
  approvedBy: string | null,
  rejectedAt: Timestamp | null,
  rejectedReason: string | null,
  paidAt: Timestamp | null,
  paymentId: string | null,
}

// rye-shop-items (appData 컬렉션 내 키)
{
  categories: string[],
  items: [{ id, category, name, defaultPrice, active }]
}
```

</canonical_refs>

<specifics>
## Specific Ideas

### 알림 메시지 자동생성 포맷
```
[RYE-K K-Culture Center]
{학생명} 회원님, 추가 청구 안내드립니다.

· {카테고리} — {상품명}: {금액}원

· 카카오뱅크 3333-34-5220544
  (예금주: 예케이케이컬처센터)
입금 부탁드립니다. 감사합니다.
```

### 즉시 청구 요청 모달 구성
1. 상품 유형 칩 선택 (의상/공연복, 악세사리, 악기 가방, 기타)
2. 카탈로그 상품 선택 OR 직접 입력 (상품명)
3. 금액 입력 + "금액 미정" 체크박스
4. 재고 여부 (재고있음 / 재고없음)
5. 메모 (선택)

### 수납 관리 탭 버튼 배치
기존: `[수강료 확정] [강사 청구 요청]`
추가 후: `[수강료 확정] [강사 청구 요청] [즉시 청구 N건]`

### Wave 편성
- Wave 1: SHOP-01 + SHOP-02 (Firebase 함수 + App 상태 + 상품관리 탭) — 기반 인프라
- Wave 2: SHOP-03 + SHOP-04 (강사 즉시청구 요청 모달 + 관리자 승인 모달)
- Wave 3: SHOP-05 + SHOP-07 (입금확인 → 수납 연동 + 대시보드 배지)

</specifics>

<deferred>
## Deferred Ideas

- Solapi 알림톡 API 실제 연동 — Phase 4 알림톡 통합 때 처리
- 상품 재고 수량 관리 (현재는 재고있음/없음 boolean만)
- 상품 사진 업로드
- 즉시청구 히스토리 별도 뷰 (현재는 수납 관리 탭 내 처리)

</deferred>

---

*Phase: SHOP-01-instant-charge-shop*
*Context gathered: 2026-05-13*
