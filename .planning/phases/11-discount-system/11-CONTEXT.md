# Phase 11: 할인 시스템 — Context

**Gathered:** 2026-06-21  
**Status:** Ready for planning  
**Source:** 대화 기반 설계 확정 (Nick과 직접 논의)

---

<domain>
## Phase Boundary

이번 Phase에서 제공하는 것:
1. 할인 타입 CRUD 관리 화면 (PaymentsView 5번째 탭, admin/manager only)
2. 학생별 할인 배정 섹션 (StudentFormModal 내 새 섹션)
3. `calcTotalFee` 업데이트 — 할인 자동 반영, `{ total, original, discountAmount, discountName }` 반환
4. 수납 화면 할인 표시 — 원가 취소선 + 할인가 + 할인명 뱃지

이번 Phase에서 **제외**하는 것:
- 강사 정산(settlement)에 burden 반영 → Phase 12
- 선납(prepayment) 처리 모달 → Phase 13

</domain>

<decisions>
## Implementation Decisions

### D-01: 할인 중복 불가
학생당 활성 할인은 1개만. 여러 할인을 동시 적용하는 스태킹 없음.
새 프로모션 필요 시 새 할인 타입을 CRUD로 추가하여 적용.

### D-02: 할인 적용 범위
- 학생 단위 적용 (student.discount 단수 객체)
- 다과목 수강 할인의 경우 `lessonInstrument` 옵션 필드로 특정 과목에만 적용 가능
- `lessonInstrument` 없으면 전체 수강료에 적용

### D-03: 데이터 모델 확정

```js
// appData/rye-discounts (appData 단일 컬렉션, 문서 ID = "rye-discounts")
// value: DiscountType[]
{
  id: uid(),
  name: "지인 소개",
  type: "percent",           // "percent" | "fixed"
  value: 10,                 // 10% or 10000원
  burden: "split",           // "academy" | "teacher" | "split"
  splitRatio: { academy: 0.5, teacher: 0.5 },
  active: true,
  notes: "",
  createdAt: Date.now()
}

// student.discount (단수 객체, 배열 아님)
{
  discountId: "xxx",
  lessonInstrument: "해금",  // optional
  startDate: "2026-07-01",
  endDate: null,             // null = 무기한
  appliedBy: "admin",
  notes: "지인 소개 — 박지연님"
}
```

### D-04: calcTotalFee 시그니처 변경
```js
// 기존
calcTotalFee(student, feePresets)

// 변경
calcTotalFee(student, feePresets, discountTypes = [])
// 반환: { total, original, discountAmount, discountName }
// 기존 호출부 역호환: discountTypes 미전달 시 { total: 기존값, original: 기존값, discountAmount: 0, discountName: null }
```

### D-05: 초기 할인 타입 7개
관리자가 CRUD로 추가/수정 가능하지만, 초기 씨드는 AdminTools에서 버튼으로 1회 생성:

| 이름 | 타입 | 값 | burden | splitRatio |
|------|------|-----|--------|------------|
| 광고 프로모션 | percent | 10 | academy | - |
| 지인 소개 | percent | 10 | split | 50/50 |
| 제휴 업체/기관 | percent | 10 | academy | - |
| 다자녀 등록 | percent | 10 | split | 50/50 |
| 다과목 수강 | percent | 10 | split | 50/50 |
| 특별 프로모션 | percent | 25 | academy | - |
| 3개월 선납 할인 | percent | 5 | academy | - |

### D-06: UI 규칙
- `window.confirm` / `window.alert` 절대 금지 — 삭제 확인 등 모든 확인은 인라인 확인 버튼
- 할인 관리 탭은 admin/manager만 접근 (teacher role 미노출)
- 할인 타입 삭제 시 인라인 "정말 삭제하시겠습니까?" → [삭제] [취소] 버튼으로 확인

### D-07: Firestore 저장 방식
- `rye-discounts`는 appData 단일 컬렉션, 기존 rye-* 패턴 동일
- `runTransaction` 기반 배열 전체 교체 (학생과 달리 할인 타입은 소수 항목이므로 배열 전체 교체 안전)
- 학생 discount 필드는 `updateStudentDoc` 사용 (per-op 트랜잭션)

### D-08: 수납 표시 우선순위
- 수납 리스트 행: 할인 적용 학생은 원가(취소선) + 할인가 + 할인명 뱃지 표시
- 수납 상세 모달: 청구 합계 아래 할인 브레이크다운 섹션 표시
- 이달 입금 현황 섹션도 할인가 기준으로 표시

### Claude's Discretion
- 할인 타입 편집 UI: 인라인 폼 vs 별도 모달 — 기존 코드패턴(인라인 편집) 따름
- 할인 적용 시각적 스타일: 취소선 + 뱃지 — 기존 CSS 변수 체계 활용
- splitRatio UI: burden이 split일 때만 표시, 기본 50/50 고정 (MVP 단계)

</decisions>

<canonical_refs>
## Canonical References

- `src/utils.js` — calcTotalFee 현재 구현, 변경 시작점
- `src/App.jsx` — discountTypes state + Firestore 리스너 패턴 (rye-teachers, rye-payments 참조)
- `src/components/payment/PaymentsView.jsx` — 탭 구조, 수납 리스트/모달
- `src/components/student/StudentManagement.jsx` — StudentFormModal, updateStudentDoc 사용 패턴
- `src/firebase.js` — runTransaction, updateStudentDoc 함수
- `src/constants.jsx` — CSS 변수, IC 아이콘

</canonical_refs>

<specifics>
## Specific Requirements

### 할인 타입 CRUD UI (PaymentsView 5번째 탭)
- 탭 이름: "할인 관리"
- admin/manager만 진입 가능 (teacher role → 탭 미노출)
- 할인 타입 카드/행 리스트
- 각 행: [이름] [타입/값] [burden] [active 토글] [수정] [삭제]
- 수정: 인라인 폼 (이름, type, value, burden, notes)
- 삭제: 인라인 확인 (window.confirm 금지)
- 추가: 리스트 하단 "+" 버튼 → 인라인 새 행

### 학생 폼 할인 섹션 (StudentFormModal)
- 섹션 위치: 수강료 정보 아래, 메모 위
- 필드: 할인 타입(드롭다운), 시작일, 종료일(선택), 다과목 시 과목 선택(lessonInstrument), 메모
- 할인 없음 옵션 포함 (드롭다운 첫 항목)
- 저장 시 updateStudentDoc으로 student.discount 필드 업데이트

### 수납 리스트 표시 변경
- calcTotalFee 반환값 { total, original, discountAmount, discountName } 활용
- discountAmount > 0이면: `[원가 취소선] → [할인가]` + 할인명 뱃지
- 이미 있는 "청구 합계" 표시 로직 활용

### 수납 상세 모달 할인 섹션
- 이달 입금 현황 섹션 위 (또는 아래)에 할인 브레이크다운
- 형식: "할인 적용: [할인명] -[discountAmount]원 (원가: [original]원)"

</specifics>

<deferred>
## Deferred Ideas

- **강사 정산 burden 반영**: discountType.burden/splitRatio를 rye-settlement-records 계산에 반영 → Phase 12
- **선납(prepayment) 처리**: 3개월 선납 입금 시 3개 월별 payment 레코드 생성 → Phase 13
- **할인 이력 조회**: 학생별 할인 변경 이력 → 추후

</deferred>

---

*Phase: 11-discount-system*  
*Context gathered: 2026-06-21*
