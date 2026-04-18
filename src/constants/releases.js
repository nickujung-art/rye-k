// src/constants/releases.js

export const RELEASE_HISTORY = [
  {
    version: "14.0.1",
    date: "2026-04-18",
    title: "따뜻한 배려와 똑똑한 관리, RYE-K v14.0",
    isMajor: true,
    target: ["admin", "teacher", "member"], // 👈 parent 대신 member로 설정
    tags: ["신규기능", "UX개선", "보안강화"],
    description: `
• [회원/관리자] 👨‍👩‍👧‍👦 우리 아이들 소식을 한 번에! (다자녀 통합 로그인)
연락처 하나로 등록된 모든 자녀(회원)를 관리하세요. 상단의 '자녀 변경' 버튼으로 정보를 자유롭게 확인해 보세요!

• [회원/관리자] 👵 눈이 편안한 화면 (실버 UX 최적화)
가독성을 대폭 높였습니다. 더 커진 글씨와 선명한 디자인으로 모든 회원님이 포털을 더 편안하게 이용하실 수 있습니다.

• [관리자] ✨ 엑셀보다 쉬운 과목 관리 (마스터 데이터 고도화)
과목 이름과 대여료 수정을 클릭 한 번으로! '삭제된 과목' 정리 기능으로 데이터 관리가 훨씬 깔끔해졌습니다.

• [관리자] 💳 꼼꼼한 수납 비서 (미납 알림 강화)
수강료 정산 시 지난달 결석 기록 자동 알림! 정중한 '수납 안내' 문구와 컬러로 회원님들께 한결 편안하게 다가갑니다.

• [공통] 🔒 보이지 않는 곳까지 안전하게 (보안 및 버그 수정)
회원 개인정보 보호 강화와 아이폰 화면 잘림 현상을 완벽 해결했습니다.`,
    pmComment: "모든 회원님과 관리자분들이 더 편리하게 사용할 수 있도록 준비했습니다! 🚀"
  },
  // ... 이하 v13~v10 히스토리에서도 '학부모'를 '회원'으로 수정하여 관리하시면 됩니다.
];

export const RELEASES = RELEASE_HISTORY;
export const LATEST_RELEASE = RELEASE_HISTORY[0];
export const CURRENT_VERSION = RELEASE_HISTORY[0].version;