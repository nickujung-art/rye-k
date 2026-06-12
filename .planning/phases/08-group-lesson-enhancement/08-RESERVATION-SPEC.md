# RYE-K 예약 시스템 아키텍처 설계 (RESERVATION-01 사전 스펙)

**Phase:** 08-group-lesson-enhancement (설계) → RESERVATION-01 (구현)
**Status:** Draft — 구현 없음, 다음 Phase 착수 기준 문서
**Date:** 2026-06-12

---

## 1. 개요

학생/학부모가 포털에서 레슨 슬롯의 빈자리를 조회하고 예약을 신청한다. 관리자/강사가 승인하면 학생 `lessons[]`에 `slotId`가 연결된다.

---

## 2. rye-reservations 컬렉션 스키마

독립 Firestore 컬렉션 (`rye-lesson-slots`와 동일하게 appData 외부):

```js
{
  id,                           // Firestore auto-id
  slotId: string,               // 참조: rye-lesson-slots 문서 ID
  studentId: string,            // 신청 학생 ID
  requestedBy: string,          // 포털 로그인 ID (studentId or parentCode)
  requestedAt: Timestamp,
  status: "pending"             // 대기
        | "approved"            // 승인 완료
        | "rejected"            // 거절
        | "cancelled",          // 학생 취소
  approvedBy: string | null,    // admin/teacher userId
  approvedAt: Timestamp | null,
  rejectedReason: string | null,
  notes: string,                // 신청 메모 (학생 입력)
  desiredStartDate: string,     // YYYY-MM-DD (희망 시작일)
}
```

### 설계 원칙

- `studentIds`를 슬롯에 저장하지 않음 (Phase 8 D-01 원칙 유지)
- 승인 시 `updateStudentDoc`으로 `student.lessons[].slotId` 연결
- 예약 자체는 이력으로 보관 (삭제하지 않음)

---

## 3. 포털 예약 신청 흐름

```
[학생/학부모 포털]
  ↓ 로그인 후 "/myryk" 접근
  ↓ "레슨 신청" 탭 또는 버튼

[슬롯 목록 열람]
  - rye-lesson-slots 중 status="active" 슬롯 조회
  - 각 슬롯: 이름, 악기, 요일/시간, 잔여 정원 표시
  - 잔여 정원 = capacity - (현재 approved 예약 수 + 현재 slotId 연결 학생 수)

[예약 신청]
  - 슬롯 선택 → 희망 시작일 + 메모 입력
  - "신청하기" 버튼 → rye-reservations에 status:"pending" 문서 생성
  - 포털에 "신청 완료, 관리자 승인 대기" 표시

[중복 신청 방지]
  - 같은 studentId + slotId 조합으로 status="pending" 또는 "approved" 예약이 이미 존재하면 재신청 불가
```

---

## 4. 관리자 승인 흐름

```
[관리자/매니저 앱]
  ↓ 대시보드 배지 또는 "예약 관리" 탭

[예약 대기 목록]
  - rye-reservations where status="pending" 목록 표시
  - 각 카드: 학생 이름, 신청 슬롯, 희망 시작일, 메모

[승인 처리]
  1. 정원 체크: slot.capacity > (현재 slotId 연결 학생 수 + 기존 approved 예약 수)
     - 정원 초과: 승인 불가 메시지 (인라인 UI)
  2. 승인 시:
     - reservation.status = "approved", approvedBy, approvedAt 업데이트
     - student.lessons에 새 lesson 추가 (instrument, teacherId, schedule, slotId)
       → updateStudentDoc 사용 (saveStudents 금지)
  3. 거절 시:
     - reservation.status = "rejected", rejectedReason 저장

[거절/취소]
  - 학생이 포털에서 pending 예약 취소 → status="cancelled"
  - 관리자가 approved 예약 취소 → status="cancelled" + student.lessons에서 slotId 제거
```

### 보안: 승인 권한

- 승인/거절은 `admin` 또는 `manager` 역할만 가능
- 강사(`teacher`)는 본인 슬롯의 예약 열람만 가능, 승인 불가
- RESERVATION-01 구현 시 Firestore Security Rules로 역할 검증 강제

---

## 5. 그룹 레슨 정원 체크 로직

```js
// 특정 슬롯의 현재 정원 사용 수 계산
function getSlotOccupancy(slotId, students, reservations) {
  // 이미 연결된 학생 수 (lessons[].slotId === slotId)
  const linked = students.filter(s =>
    !s.isInstitution &&
    s.status === "active" &&
    (s.lessons || []).some(l => l.slotId === slotId)
  ).length;

  // 승인 대기 중인 예약 수 (pending → 선점 처리)
  const pending = reservations.filter(r =>
    r.slotId === slotId && r.status === "pending"
  ).length;

  return linked + pending;
}

// 예약 가능 여부
function canReserve(slot, students, reservations) {
  const occupancy = getSlotOccupancy(slot.id, students, reservations);
  return slot.type === "group"
    ? occupancy < slot.capacity
    : occupancy === 0; // 개인 슬롯: 완전 비어있어야 예약 가능
}
```

### 정원 체크 시점

- **포털 신청 시**: 실시간 정원 표시 (onSnapshot 기반)
- **관리자 승인 시**: 승인 직전 재검증 (TOCTOU 방지)
- **승인 실패 시**: "정원이 찼습니다" 인라인 메시지 (window.alert 금지)

---

## 6. 포털 연동 변경 사항 (RESERVATION-01 구현 시 필요)

| 파일 | 변경 내용 |
|------|----------|
| `src/firebase.js` | `addReservation`, `updateReservation` CRUD 추가 |
| `src/App.jsx` | `reservations` 상태 + `rye-reservations` onSnapshot 리스너 |
| `src/components/portal/PublicPortal.jsx` | 슬롯 목록 + 예약 신청 UI |
| `src/components/admin/AdminTools.jsx` | 예약 대기 목록 + 승인/거절 UI (또는 별도 ReservationsView) |
| `src/components/dashboard/Dashboard.jsx` | 예약 대기 건수 배지 |

---

## 7. 제외 항목 (이번 Phase에서 구현 안 함)

- 실제 예약 기능 (포털 예약 신청, 관리자 승인)
- 강사 근무 가능 시간 범위 설정 UI
- 슬롯 정원 초과 알림 (알림톡 연동)
- 슬롯 아카이빙 (휴원/종료된 슬롯 히스토리)

---

*Created: 2026-06-12 | Phase 08-group-lesson-enhancement*
