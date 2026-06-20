import { useState } from "react";

// ─── 도움말 콘텐츠 ──────────────────────────────────────────────────────────────
const HELP = {
  payments: {
    title: "수납 관리",
    teacher: [
      {
        heading: "즉시 청구 요청",
        items: [
          "수납 관리 → 회원 이름 클릭",
          "모달 하단 '즉시 청구 요청' 버튼 클릭",
          "상품 유형·상품명·금액 입력 후 '요청 전송'",
          "이후 매니저/관리자가 승인 → 학부모에게 청구 안내 발송됨",
        ],
      },
      {
        heading: "수납 상태 표시 의미",
        items: [
          "초록 (납부완료): 이달 수강료 전액 납부",
          "주황 (부분납부): 수강료 납부 완료, 추가 청구 잔액 남음",
          "빨강 (미납): 이달 아직 납부 전",
        ],
      },
    ],
    manager: [
      {
        heading: "① 월초 — 수강료 확정",
        items: [
          "'📋 수강료 확정' 버튼 클릭",
          "각 회원 수강료 확인 (자동 계산값 기준)",
          "교재비 등 추가 항목은 '+ 추가'로 등록",
          "'N명 수강료 확정' 저장 → 이달 청구액 확정 (납부 처리 아님)",
        ],
      },
      {
        heading: "② 입금 확인 — 빠른 방법",
        items: [
          "목록에서 미납 회원 확인 → '✓ 입금' 버튼 클릭",
          "오늘 날짜·전액·계좌이체로 자동 저장됨",
          "금액·방법이 다르면 회원 클릭 → 상세 수정 후 저장",
        ],
      },
      {
        heading: "③ 즉시 청구 승인 처리",
        items: [
          "상단 '즉시 청구 N' 배지 또는 '즉시청구' 탭 이동",
          "요청 목록에서 '승인' 클릭 → 금액 최종 확인 후 저장",
          "승인 후 '💬 알림톡 발송' 또는 '알림 메시지 복사'로 학부모 안내",
          "학부모 입금 확인 후 '입금 확인' 버튼 → 수납 기록 자동 생성",
        ],
      },
      {
        heading: "④ 미매칭 입금 처리",
        items: [
          "'미매칭 입금' 탭 → 카카오뱅크 자동 연동 입금 목록 확인",
          "입금 항목에서 회원 선택 후 '매칭' 클릭",
          "이미 납부된 회원에 매칭 시 분할납부로 처리됨",
          "확인 불가 입금은 '삭제' (계좌에서 출금되는 것 아님, 목록에서만 제거)",
        ],
      },
      {
        heading: "⑤ 알림톡 일괄 발송",
        items: [
          "'💬 수강료 안내': 이달 청구액을 미납 회원 전체에 안내",
          "'💬 미납 독촉': 미납 회원에게 독촉 메시지 발송",
          "'💬 잔여건' 버튼으로 알림톡 포인트 잔여량 확인 가능",
        ],
      },
    ],
  },

  attendance: {
    title: "출석 체크",
    teacher: [
      {
        heading: "출석 입력",
        items: [
          "날짜 이동: 상단 날짜 입력창 또는 ◀ ▶ 화살표",
          "회원 카드에서 탭 클릭: 출석 / 결석 / 지각 / 공결",
          "이미 클릭한 상태를 다시 클릭하면 '미입력'으로 초기화됨",
          "입력 즉시 자동 저장됨 (별도 저장 버튼 없음)",
        ],
      },
      {
        heading: "레슨노트 작성",
        items: [
          "회원 카드에서 ✏ 아이콘 또는 '노트' 영역 클릭",
          "레슨 내용, 진도, 특이사항 자유 입력 후 저장",
          "저장된 내용은 My RYE-K 포털에서 학부모도 확인 가능",
          "학부모가 확인하지 않은 노트는 주황 점으로 표시됨",
        ],
      },
    ],
    manager: [
      {
        heading: "강사별 출석 조회",
        items: [
          "상단 강사 탭으로 전환하여 특정 강사 수업 출석 확인",
          "'전체' 탭에서 당일 모든 수업 현황 파악 가능",
        ],
      },
      {
        heading: "수업 취소 / 보강 처리",
        items: [
          "수업 취소: 강사 스케줄 → 해당 날짜 → 수업 취소 등록",
          "취소된 날은 출석 화면에서 회색(비활성)으로 표시됨",
          "보강 예약은 강사가 요청, 매니저가 날짜 확정 후 스케줄에 반영",
        ],
      },
    ],
  },

  lessonNotes: {
    title: "레슨노트",
    teacher: [
      {
        heading: "레슨노트 작성",
        items: [
          "회원 이름 클릭 → 해당 날짜 노트 입력",
          "레슨 내용, 진도, 과제, 특이사항 자유 입력",
          "저장하면 My RYE-K 포털에서 학부모가 바로 확인 가능",
          "학부모 미확인 노트는 주황 점(●)으로 표시됨",
        ],
      },
      {
        heading: "댓글 확인 및 답글",
        items: [
          "학부모가 노트에 댓글을 남기면 목록에 알림 표시",
          "댓글 클릭 → 답글 입력 후 저장",
          "주고받은 댓글은 학부모 포털에도 동일하게 표시됨",
        ],
      },
    ],
    manager: [
      {
        heading: "전체 레슨노트 조회",
        items: [
          "강사·회원 필터로 특정 강사 또는 회원 노트만 확인",
          "'미확인' 필터로 학부모가 아직 읽지 않은 노트 목록 확인",
        ],
      },
      {
        heading: "관리자 댓글",
        items: [
          "레슨노트에 '관리자' 명의로 댓글 작성 가능",
          "강사와 학부모 양쪽 모두에게 표시됨",
        ],
      },
    ],
  },

  pauseManagement: {
    title: "휴회 관리",
    teacher: [
      {
        heading: "카드 색상 의미",
        items: [
          "빨간 테두리: 30일 이상 케어 없음 — 즉시 연락 필요",
          "주황 테두리: 14일 이상 케어 없음 — 연락 예정",
          "테두리 없음: 최근 14일 이내 케어 완료 (정상)",
        ],
      },
      {
        heading: "케어로그 입력",
        items: [
          "카드의 '케어로그 입력' 버튼 클릭",
          "연락 방법 선택 (전화 / 문자 / 알림톡 / 기타)",
          "응답 여부 선택 후 메모 입력 → 저장",
          "저장하면 케어 기록에 누적되고 '긴급/예정' 상태가 초기화됨",
        ],
      },
      {
        heading: "복귀 처리",
        items: [
          "'복귀 처리' 버튼 클릭 → 확인창에서 [확인] 클릭",
          "자동으로 재원 상태로 전환되고 목록에서 사라짐",
          "복귀 후 수강료 납부는 수납 관리에서 별도 처리 필요",
        ],
      },
    ],
    manager: [
      {
        heading: "전체 휴회 현황",
        items: [
          "강사 구분 없이 전체 휴회 회원 목록 표시",
          "케어로그 입력·복귀 처리는 강사와 동일하게 가능",
          "회원 관리에서 휴회 사유·기간 직접 수정 가능",
        ],
      },
      {
        heading: "정렬 기준",
        items: [
          "케어 긴급 → 케어 예정 → 정상 순으로 자동 정렬",
          "같은 우선순위 안에서는 휴회 기간이 긴 회원이 위에 표시됨",
        ],
      },
    ],
  },

  schedule: {
    title: "강사 스케줄",
    teacher: [
      {
        heading: "시간표 확인",
        items: [
          "주간/월간 탭으로 전환 가능",
          "슬롯 클릭 시 해당 수업 회원 목록 확인",
          "색상: 개인 레슨(파랑) / 그룹 레슨(초록) / 취소(회색)",
        ],
      },
      {
        heading: "빠른 출석 입력",
        items: [
          "시간표 슬롯에서 직접 출석 처리 가능",
          "그룹 수업은 슬롯 클릭 → 인원 일괄 출석 처리",
          "자세한 출석 관리는 '출석 체크' 메뉴 이용",
        ],
      },
    ],
    manager: [
      {
        heading: "수업 취소 등록",
        items: [
          "해당 날짜 또는 슬롯 클릭 → '수업 취소' 선택",
          "취소 사유 입력 (강사에게도 표시됨)",
          "취소된 날은 출석 화면에서 자동으로 비활성 처리됨",
        ],
      },
      {
        heading: "전체 강사 스케줄 조회",
        items: [
          "강사 드롭다운으로 특정 강사 스케줄 확인",
          "'전체' 선택 시 모든 강사 시간표 한눈에 파악 가능",
        ],
      },
    ],
  },

  studentNotices: {
    title: "수강생 공지",
    teacher: [
      {
        heading: "공지 등록",
        items: [
          "'+ 추가' 버튼 클릭 → 제목·내용 입력",
          "대상: '전체' 또는 특정 회원만 선택 가능",
          "'중요' 체크 시 포털 상단에 고정됨",
          "저장하면 My RYE-K 포털에 즉시 표시됨",
        ],
      },
      {
        heading: "공지 수정·삭제",
        items: [
          "등록된 공지 클릭 → 수정 또는 삭제",
          "삭제된 공지는 포털에서 즉시 사라짐",
          "개인 공지는 해당 회원만, 전체 공지는 모든 회원에게 표시",
        ],
      },
    ],
    manager: [
      {
        heading: "전체 공지 관리",
        items: [
          "모든 강사가 등록한 공지를 열람·수정·삭제 가능",
          "강사 필터로 특정 강사 공지만 확인",
          "긴급 공지: '중요' 체크 + '전체' 대상 선택 권장",
        ],
      },
    ],
  },
};

// ─── HELP MODAL ────────────────────────────────────────────────────────────────
function HelpModal({ helpKey, onClose }) {
  const [tab, setTab] = useState("teacher");
  const content = HELP[helpKey];
  if (!content) return null;
  const sections = content[tab] || [];

  return (
    <>
      <div
        style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.45)", zIndex: 9100 }}
        onClick={onClose}
      />
      <div style={{
        position: "fixed", left: "50%", top: "50%",
        transform: "translate(-50%,-50%)",
        background: "var(--paper)", borderRadius: 14,
        width: "min(92vw, 440px)", maxHeight: "80vh",
        display: "flex", flexDirection: "column",
        zIndex: 9101, boxShadow: "0 8px 40px rgba(0,0,0,.22)",
        overflow: "hidden",
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 0" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{content.title} 도움말</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ink-30)", padding: "0 2px", lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: "flex", padding: "10px 18px 0", borderBottom: "1px solid var(--border)" }}>
          {[{ key: "teacher", label: "강사" }, { key: "manager", label: "매니저·관리자" }].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              padding: "6px 14px", fontSize: 12.5, fontWeight: tab === t.key ? 700 : 400,
              border: "none", background: "none", cursor: "pointer", fontFamily: "inherit",
              color: tab === t.key ? "var(--blue)" : "var(--ink-60)",
              borderBottom: tab === t.key ? "2px solid var(--blue)" : "2px solid transparent",
              marginBottom: -1,
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "14px 18px 18px" }}>
          {sections.length === 0
            ? <div style={{ fontSize: 13, color: "var(--ink-30)" }}>해당 역할의 도움말이 없습니다.</div>
            : sections.map((sec, i) => (
              <div key={i} style={{ marginBottom: i < sections.length - 1 ? 18 : 0 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--blue)", marginBottom: 6, letterSpacing: "0.01em" }}>
                  {sec.heading}
                </div>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {sec.items.map((item, j) => (
                    <li key={j} style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.7, marginBottom: j < sec.items.length - 1 ? 2 : 0 }}>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
            ))
          }
        </div>
      </div>
    </>
  );
}

// ─── HELP BUTTON ───────────────────────────────────────────────────────────────
export function HelpButton({ helpKey }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={e => { e.stopPropagation(); setOpen(true); }}
        title="도움말"
        style={{
          width: 22, height: 22, borderRadius: "50%",
          background: "var(--blue-lt)", color: "var(--blue)",
          border: "1.5px solid var(--blue)", fontSize: 12, fontWeight: 800,
          cursor: "pointer", flexShrink: 0, lineHeight: 1,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontFamily: "inherit",
        }}
      >?</button>
      {open && <HelpModal helpKey={helpKey} onClose={() => setOpen(false)} />}
    </>
  );
}
