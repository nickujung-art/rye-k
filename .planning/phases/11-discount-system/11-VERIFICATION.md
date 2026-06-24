---
phase: 11-discount-system
verified: 2026-06-22T09:00:00Z
status: human_needed
score: 23/23 must-haves verified
overrides_applied: 0
deferred:
  - truth: "SettlementView 정산에서 강사 부담(burden=teacher) 및 분담(burden=split) 할인이 강사 정산액에 반영된다"
    addressed_in: "Phase 12"
    evidence: "11-CONTEXT.md Phase Boundary: '강사 정산(settlement)에 burden 반영 → Phase 12'"
human_verification:
  - test: "수납 리스트 행 할인 표시 시각 확인"
    expected: "할인이 배정된 학생의 수납 행에서 (1) 수납 레코드가 없을 때 원가 취소선 + 할인가 + 파란 할인명 뱃지가 보인다. (2) 수납 레코드 생성 후에는 금액만 표시된다 (WR-03 설계 제한)."
    why_human: "수납 레코드 유무에 따른 분기 UI는 브라우저 상호작용이 필요하다."
  - test: "수납 상세 모달 할인 브레이크다운 확인"
    expected: "할인 적용 학생의 수납 행 클릭 시 모달 내 '할인 적용' 섹션이 렌더링된다 — 원가, 할인명, 할인금액, 할인 적용가 3행 표시."
    why_human: "모달 렌더링 조건(canManageAll + discountAmount > 0)은 실제 데이터와 역할로만 확인 가능."
  - test: "StudentFormModal 할인 섹션 위치 및 표시"
    expected: "학생 수정 폼(admin/manager)에서 악기 대여 섹션 아래 '할인 적용' 드롭다운이 나타난다. teacher 계정으로 접속 시 섹션 미표시."
    why_human: "canManageAll 역할 조건과 JSX 삽입 위치는 브라우저에서만 확인 가능."
  - test: "할인 관리 탭 teacher 미노출 확인"
    expected: "teacher 계정으로 로그인 시 PaymentsView에 '할인 관리' 탭 버튼이 없다. admin/manager는 5번째 탭으로 표시."
    why_human: "역할 기반 조건부 렌더링은 실제 auth 세션 필요."
  - test: "초기 할인 타입 7개 씨드 버튼 동작"
    expected: "할인 관리 탭에서 등록된 할인 타입이 0개일 때 '초기 할인 타입 7개 생성' 버튼이 표시된다. 클릭 시 7개가 생성되고 Firestore에 저장된다."
    why_human: "Firestore 실데이터 연동 및 버튼 상태(saving disabled) 확인은 브라우저 필요."
---

# Phase 11: 할인 시스템 Verification Report

**Phase Goal:** 학생별 할인 타입 관리 + 수납 화면 할인 표시 + calcTotalFee 할인 반영 (DIS-01~DIS-08)
**Verified:** 2026-06-22T09:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | calcTotalFee(student, feePresets, discountTypes)가 { total, original, discountAmount, discountName } 객체를 반환한다 | VERIFIED | utils.js:267 시그니처, :312-317 return 객체 |
| 2 | discountTypes 미전달 시 역호환 — total === original, discountAmount === 0 | VERIFIED | utils.js:267 `discountTypes = []` 기본값, 조건 분기 `disc?.discountId && discountTypes.length > 0` |
| 3 | App.jsx에 discountTypes state가 존재하고 rye-discounts Firestore 리스너가 연결된다 | VERIFIED | App.jsx:249 state, :391 KEYS 항목 `{ key: "rye-discounts", setter: setDiscountTypes, default: [] }` |
| 4 | PaymentsView·StudentFormModal·Dashboard·SettlementView에 discountTypes props가 전달된다 | VERIFIED | App.jsx:1437, :1455, :1563, :1591 각 컴포넌트 prop |
| 5 | StudentFormModal에 할인 섹션이 표시된다 (수강료 섹션 아래, 메모 섹션 위) | VERIFIED | StudentManagement.jsx:289 `canManageAll` 조건부 할인 섹션 블록 |
| 6 | 할인 드롭다운에서 활성 DiscountType을 선택할 수 있다 (첫 항목은 '할인 없음') | VERIFIED | StudentManagement.jsx:309 `<option value="">할인 없음</option>`, :310 활성 타입 필터 |
| 7 | 할인 선택 시 시작일·종료일·메모 입력 필드가 나타난다 | VERIFIED | StudentManagement.jsx:316 `form.discount?.discountId &&` 조건부 날짜/메모 필드 |
| 8 | 다과목(2개 이상) 수강 학생에게만 특정 과목 선택 드롭다운이 표시된다 | VERIFIED | StudentManagement.jsx:340 `(form.lessons || []).length > 1` 조건 |
| 9 | 저장 시 student.discount 필드가 updateStudentDoc으로 업데이트된다 | VERIFIED | form 초기값 `discount: student?.discount ?? null`(line 103), onSave 스프레드 전달 |
| 10 | 수강료 합계 표시가 calcTotalFee().total을 사용한다 (할인 적용 시 할인가 표시) | VERIFIED | StudentManagement.jsx:235 `const fee = calcTotalFee(form, feePresets, discountTypes)`, :242 `fee.total.toLocaleString` |
| 11 | PaymentsView에 '할인 관리' 5번째 탭이 표시된다 (admin/manager만, teacher 미노출) | VERIFIED | PaymentsView.jsx:611 `{canManageAll(...) && (` 블록 내 :638-641 탭 버튼 |
| 12 | 할인 관리 탭에서 할인 타입 목록을 볼 수 있다 | VERIFIED | PaymentsView.jsx:10 DiscountTypeManager, :250-254 discountTypes.map 렌더링 |
| 13 | 각 행에서 활성/비활성 토글, 수정(인라인), 삭제(인라인 확인)가 동작한다 | VERIFIED | PaymentsView.jsx:21 handleToggleActive, :27 handleSaveEdit, :35 handleDelete, :179 deleteConfirmId 인라인 UI |
| 14 | 삭제 시 window.confirm 없이 인라인 '정말 삭제?' + [삭제][취소] 버튼으로 확인 | VERIFIED | grep `window.confirm` in PaymentsView.jsx: 0 matches; deleteConfirmId state 패턴 사용 |
| 15 | 목록 하단 '+' 버튼으로 새 할인 타입을 인라인 폼으로 추가할 수 있다 | VERIFIED | PaymentsView.jsx:47 handleAddNew, :356-414 adding 폼 JSX |
| 16 | 할인 타입이 0개일 때 '초기 할인 타입 7개 생성' 버튼이 표시된다 | VERIFIED | PaymentsView.jsx:63 `discountTypes.length === 0 && !adding` 조건, :69 "초기 할인 타입 7개 생성" 버튼 |
| 17 | AdminTools.jsx에 DEFAULT_DISCOUNT_TYPES 상수가 export된다 | VERIFIED | AdminTools.jsx:10 `export const DEFAULT_DISCOUNT_TYPES = [` 7개 항목 |
| 18 | 수납 리스트 행에서 할인 적용 학생은 원가 취소선 + 할인가 + 할인명 뱃지가 표시된다 | VERIFIED | PaymentsView.jsx:708 조건, :710 line-through, :717 discountName 뱃지 — WR-03 경고 참조 |
| 19 | 수납 상세 모달에 할인 브레이크다운 섹션이 표시된다 (원가, 할인명, 할인가) | VERIFIED | PaymentsView.jsx:1089-1108 할인 브레이크다운 섹션 |
| 20 | 자동계산 수강료(p.amount 없음)에만 할인 표시 — 관리자 수동 입력 금액에는 표시 안 함 | VERIFIED | PaymentsView.jsx:708 `!p?.amount && feeResult.discountAmount > 0` 조건 |
| 21 | Dashboard 미납 금액 계산이 할인 적용 수강료 기준으로 동작한다 | VERIFIED | Dashboard.jsx:145 `calcTotalFee(s, feePresets, discountTypes).total` |
| 22 | SettlementView 정산 계산이 할인 적용 수강료 기준으로 동작한다 | VERIFIED | SettlementView.jsx:44 `.total`, :79 `.total` — burden 분배는 Phase 12 deferred |
| 23 | autoFee(s)가 discountTypes를 반영한 total을 반환한다 (NaN 없음) | VERIFIED | PaymentsView.jsx:350 `const autoFeeResult = (s) => calcTotalFee(s, feePresets, discountTypes)`, :351 `const autoFee = (s) => autoFeeResult(s).total` |

**Score:** 23/23 truths verified

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | 강사 부담(burden=teacher) / 분담(burden=split) 할인이 SettlementView 정산액에 반영된다 | Phase 12 | 11-CONTEXT.md: "강사 정산(settlement)에 burden 반영 → Phase 12" |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/utils.js` | calcTotalFee 3인수 + 객체 반환 | VERIFIED | line 267 시그니처, line 312-316 return 객체 |
| `src/firebase.js` | saveDiscountTypes export | VERIFIED | line 122-130 함수 정의, line 132 export |
| `src/App.jsx` | discountTypes state + KEYS + 4개 props | VERIFIED | state:249, KEYS:391, props:1437/1455/1563/1591 |
| `src/components/student/StudentManagement.jsx` | StudentFormModal 할인 섹션 + .total/.original 접근 | VERIFIED | prop:101, section:289-365, .original:132, .total:242/249 |
| `src/components/admin/AdminTools.jsx` | DEFAULT_DISCOUNT_TYPES (7개) export | VERIFIED | line 10-18 |
| `src/components/payment/PaymentsView.jsx` | DiscountTypeManager + 5번째 탭 + autoFeeResult + 할인 UI | VERIFIED | 컴포넌트:10, 탭:638, autoFeeResult:350, 리스트 할인:708, 모달:1089 |
| `src/components/dashboard/Dashboard.jsx` | discountTypes prop + .total 접근 | VERIFIED | prop:128, .total:145 |
| `src/components/settlement/SettlementView.jsx` | discountTypes + .total 두 호출부 | VERIFIED | calcResult param:28, .total:44/:79, export default props:325, 호출부:345 |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| App.jsx | firebase.js | `saveDiscountTypes` import | WIRED | App.jsx:2 import, :1457 사용 |
| App.jsx KEYS | Firestore appData/rye-discounts | onSnapshot | WIRED | App.jsx:391 KEYS 항목 |
| App.jsx | PaymentsView | `onSaveDiscountTypes` prop | WIRED | App.jsx:1456 콜백 정의 |
| PaymentsView DiscountTypeManager | onSaveDiscountTypes prop | handleSave 계열 함수 | WIRED | PaymentsView.jsx:22/30/41 각 핸들러 |
| PaymentsView.jsx | AdminTools.jsx | `import { DEFAULT_DISCOUNT_TYPES }` | WIRED | PaymentsView.jsx:8 import, :61 사용 |
| StudentFormModal | updateStudentDoc | onSave 콜백 스프레드 | WIRED | form.discount가 {...form} 스프레드로 전달됨 |
| App.jsx 수납 시딩 | calcTotalFee | discountTypes 반영 amount | WIRED | App.jsx:1043 `calcTotalFee(s, feePresets, discountTypes).total` |
| App.jsx handleFullBackup | rye-discounts | snapshot 포함 | WIRED | App.jsx:1192 `"rye-discounts": discountTypes` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| PaymentsView.jsx — 수납 행 할인 표시 | `feeResult.discountAmount` | `autoFeeResult(s)` → `calcTotalFee(s, feePresets, discountTypes)` | Firestore `rye-discounts` 리스너 → discountTypes | FLOWING |
| StudentFormModal — 수강료 합계 | `fee.total` | `calcTotalFee(form, feePresets, discountTypes)` | form.discount + discountTypes prop | FLOWING |
| Dashboard.jsx — 미납 합계 | `calcTotalFee(...).total` | `discountTypes` prop from App.jsx | Firestore rye-discounts 리스너 | FLOWING |
| SettlementView.jsx — studentTotalFee | `.total` | `calcTotalFee(student, feePresets, discountTypes).total` | discountTypes prop from App.jsx | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Build passes without errors | `npm run build` | ✓ built in 4.03s | PASS |
| calcTotalFee 시그니처 존재 | grep utils.js | `export function calcTotalFee(student, feePresets, discountTypes = [])` at line 267 | PASS |
| saveDiscountTypes export | grep firebase.js | found at line 122 | PASS |
| window.confirm 없음 (PaymentsView) | grep PaymentsView.jsx | 0 matches | PASS |
| Old calcTotalFee 패턴 제거 확인 | grep all src files | 모든 호출부에 discountTypes 3번째 인수 포함 | PASS |
| rye-discounts backup 포함 | grep App.jsx:1192 | `"rye-discounts": discountTypes` | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| DIS-01 | 11-01 | calcTotalFee 객체 반환 + 역호환 | SATISFIED | utils.js:267-316 |
| DIS-02 | 11-01 | rye-discounts 리스너 + state + saveDiscountTypes | SATISFIED | App.jsx:249/:391, firebase.js:122 |
| DIS-03 | 11-03 | DiscountTypeManager CRUD (admin/manager only) | SATISFIED | PaymentsView.jsx:10-220 |
| DIS-04 | 11-03 | DEFAULT_DISCOUNT_TYPES 7개 씨드 | SATISFIED | AdminTools.jsx:10-18 |
| DIS-05 | 11-02 | StudentFormModal 할인 배정 섹션 | SATISFIED | StudentManagement.jsx:289-365 |
| DIS-06 | 11-04 | 수납 리스트 행 할인 표시 | SATISFIED | PaymentsView.jsx:708-725 — WR-03 경고 주의 |
| DIS-07 | 11-04 | 수납 모달 할인 브레이크다운 | SATISFIED | PaymentsView.jsx:1089-1108 |
| DIS-08 | 11-04 | 전체 calcTotalFee 호출부 .total 업데이트 | SATISFIED | Dashboard:145, SettlementView:44/:79, StudentManagement:132/:235, App:1043 |

**참고:** REQUIREMENTS.md Traceability 표에 DIS-01~DIS-05 항목이 없음. DIS 섹션 정의표(line 263-267)에는 ✓ 2026-06-22 마크가 있음. Traceability 표는 문서 불일치이나 코드 구현에는 영향 없음.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| PaymentsView.jsx | 27-33 | `handleSaveEdit`: burden → "split" 변경 시 splitRatio 기본값 미설정 | Warning (WR-01) | splitRatio undefined가 DB에 저장될 수 있음. burdenLabel은 optional-chaining으로 tolerate하나 미래 코드 위험 |
| PaymentsView.jsx | 708 | `!p?.amount && feeResult.discountAmount > 0` — 수납 레코드 존재 시 할인 chip 미표시 | Warning (WR-03) | 수납 시딩 후(월 초) 할인 표시가 사라짐. 수납 금액이 이미 할인 적용되었으므로 관리자 시각적 확인 불가 |
| SettlementView.jsx | 95-104 | discount burden(teacher/split)이 정산에 미반영 | Info (WR-02 / Phase 12 deferred) | 강사 부담 할인이 정산액에서 차감되지 않음 — Phase 12 설계대로 deferred |

### Human Verification Required

#### 1. 수납 리스트 행 할인 표시 시각 확인

**Test:** 할인이 배정된 학생 계정을 생성하고, 이달 수납 레코드가 없는 상태에서 PaymentsView 수납 관리 탭을 확인.
**Expected:** 해당 학생 행에서 원가 취소선(회색, font-size 11) + 할인가(컬러) + 파란 뱃지(할인명)가 렌더링된다.
**Why human:** 수납 레코드 유무에 따른 분기 UI는 실데이터 + 브라우저 상호작용이 필요.

#### 2. 수납 상세 모달 할인 브레이크다운 확인

**Test:** 할인이 배정된 학생의 수납 행을 클릭하여 모달 오픈.
**Expected:** 모달 내 파란 배경 '할인 적용' 섹션이 표시되고, "원가 / 할인명 -N원 / 할인 적용가" 3행 구조가 보인다.
**Why human:** canManageAll + discountAmount > 0 조건은 실제 역할 + 데이터로만 확인 가능.

#### 3. StudentFormModal 할인 섹션 위치 및 권한 확인

**Test:** (a) admin 계정으로 학생 수정 폼 오픈. (b) teacher 계정으로 동일 폼 오픈.
**Expected:** (a) 악기 대여 섹션 아래 '할인 적용' 드롭다운 표시. (b) 할인 섹션 미표시.
**Why human:** JSX 위치 및 canManageAll 역할 조건은 실제 auth 세션 필요.

#### 4. 할인 관리 탭 역할 접근 통제 확인

**Test:** teacher 계정으로 PaymentsView 접속.
**Expected:** 탭 목록에 '할인 관리' 탭이 없다 (탭 바 자체가 teacher 미노출).
**Why human:** canManageAll 조건부 탭 바 렌더링은 실제 teacher 세션 필요.

#### 5. 초기 할인 타입 7개 씨드 버튼 동작 확인

**Test:** 할인 타입이 0개인 상태에서 할인 관리 탭 접속, '초기 할인 타입 7개 생성' 버튼 클릭.
**Expected:** 7개 할인 타입이 생성되어 목록에 나타난다. 버튼 클릭 중 disabled 상태 유지.
**Why human:** Firestore rye-discounts 쓰기 + 리스너 반영은 실운영 데이터 필요.

---

## Gaps Summary

**No blocking gaps found.** 모든 23개 must-have truth가 코드 수준에서 VERIFIED.

**Known warnings (non-blocking):**

1. **WR-01** (handleSaveEdit splitRatio guard 누락): burden을 "split"으로 변경하고 비율을 조정하지 않은 채 저장 시 `splitRatio: undefined` DB 기록 위험. Phase 12 이전에 간단한 guard 추가 권장.

2. **WR-03** (discount chip 가시성 제한): `!p?.amount` 조건으로 인해 수납 레코드가 존재하면 (CR-01 픽스 이후 시딩된 레코드 포함) 할인 chip이 숨겨진다. 관리자가 할인 적용 여부를 리스트에서 확인할 수 없는 UX 문제. 리스트 view에서의 할인 가시성 개선을 고려할 것.

**Deferred (Phase 12):**
- 강사 부담/분담 할인의 SettlementView 정산 반영 (WR-02)

---

_Verified: 2026-06-22T09:00:00Z_
_Verifier: Claude (gsd-verifier)_
