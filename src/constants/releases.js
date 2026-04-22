// src/constants/releases.js

export const RELEASE_HISTORY = [
  {
    version: "14.1.0",
    date: "2026-04-22",
    title: "데이터 철벽 방어와 유연한 수납 관리, RYE-K v14.1",
    isMajor: true,
    target: ["admin", "teacher", "member"],
    tags: ["시스템안정화", "수납기능개선", "보안강화"],
    features: [
      { 
        target: ["admin", "teacher"], 
        text: "🛡️ 데이터 세이프티 가드 도입 (엔진 전면 개편)\n데이터 저장 엔진을 트랜잭션 방식으로 교체했습니다. 이제 필터링된 화면에서 수정하더라도 보이지 않는 다른 학생의 데이터가 유실되지 않도록 완벽하게 보호합니다." 
      },
      { 
        target: ["admin", "teacher"], 
        text: "💰 일회성 수납 항목 자유 등록\n레슨비 외에 발생하는 다양한 일회성 비용을 강사님이 직접 등록할 수 있습니다. 정기 결제 외의 특수 상황도 이제 RYE-K에서 간편하게 처리하세요!" 
      },
      { 
        target: ["admin"], 
        text: "🎻 악기 대여비 유연화 설정\n고정되어 있던 악기 대여비를 상황에 맞게 직접 수정하여 청구할 수 있습니다. 학원 운영 방침에 따른 유연한 금액 설정이 가능해졌습니다." 
      },
      { 
        target: ["admin", "teacher"], 
        text: "🔄 초정밀 개별 업데이트 기술 적용\n전체 명단을 덮어쓰지 않고 수정된 '단 한 명'의 데이터만 콕 집어 동기화합니다. 다중 접속 환경에서도 데이터 충돌 걱정 없이 안전하게 이용하세요." 
      }
    ],
    pmComment: "비 온 뒤에 땅이 굳어지듯, 더욱 단단해진 보안 엔진과 유연해진 수납 기능을 만나보세요. 원장님과 강사님들의 목소리를 담아 완성했습니다! ☔️💪✨"
  },
  
  {
    version: "14.0.1",
    date: "2026-04-18",
    title: "따뜻한 배려와 똑똑한 관리, RYE-K v14.0",
    isMajor: true,
    target: ["admin", "teacher", "member"],
    tags: ["신규기능", "UX개선", "보안강화"],
    // 🚀 항목별로 타겟을 분리했습니다!
    features: [
      { target: ["admin", "member"], text: "👨‍👩‍👧‍👦 우리 아이들 소식을 한 번에! (다자녀 통합 로그인)\n연락처 하나로 모든 자녀(회원)를 관리하세요. 상단의 '자녀 변경' 버튼으로 정보를 자유롭게 확인해 보세요!" },
      { target: ["admin", "member"], text: "👵 눈이 편안한 화면 (실버 UX 최적화)\n가독성을 대폭 높였습니다. 더 커진 글씨와 선명한 디자인으로 모든 회원님이 포털을 더 편안하게 이용하실 수 있습니다." },
      { target: ["admin"], text: "✨ 엑셀보다 쉬운 과목 관리 (마스터 데이터 고도화)\n과목 이름과 대여료 수정을 클릭 한 번으로! '삭제된 과목' 정리 기능으로 데이터 관리가 깔끔해졌습니다." },
      { target: ["admin"], text: "💳 꼼꼼한 수납 비서 (미납 알림 강화)\n수강료 정산 시 지난달 결석 기록 자동 알림! 정중한 '수납 안내' 문구와 컬러로 회원님들께 편안하게 다가갑니다." },
      { target: ["admin", "teacher", "member"], text: "🔒 보이지 않는 곳까지 안전하게 (보안 및 버그 수정)\n개인정보 보호 강화와 아이폰 화면 잘림 현상을 완벽 해결했습니다." }
    ],
    pmComment: "모든 회원님과 관리자분들이 더 편리하게 사용할 수 있도록 준비했습니다! 🚀"
  },
  {
    version: "13.0.0",
    date: "2026-04-10",
    title: "더 빠르고 단단해진 RYE-K (엔진 전면 최적화)",
    isMajor: false,
    target: ["admin", "teacher", "member"],
    tags: ["리팩토링", "성능개선"],
    features: [
      { target: ["admin", "teacher", "member"], text: "🚀 시스템 엔진 전면 교체\n화면 전환 속도가 대폭 개선되었습니다. 이제 어떤 메뉴를 눌러도 막힘없이 부드럽습니다." }
    ],
    pmComment: "보이지 않는 곳까지 수리하여 더 쾌적한 환경을 만들었습니다."
  },
  {
    version: "12.2.0",
    date: "2026-03-25",
    title: "강사님 프라이버시 보호 및 스마트 스케줄",
    isMajor: false,
    target: ["admin", "teacher"],
    tags: ["보안강화", "신규기능"],
    features: [
      { target: ["teacher"], text: "🛡️ 소중한 개인정보 보호 강화\n강사 계정 접속 시 회원 연락처 마스킹 처리를 도입하여 보안을 한층 높였습니다." },
      { target: ["teacher"], text: "📅 공지사항-스케줄 자동 연동\n공지에 입력한 일정이 내 캘린더에 자동으로 표시됩니다. 번거로운 일정 기록을 대신해 드립니다." },
      { target: ["admin"], text: "📊 월간 분석 리포트 PDF 출력\n학부모 상담 시 유용한 분석 데이터를 한 장의 PDF로 깔끔하게 출력할 수 있습니다." }
    ],
    pmComment: "강사님들의 업무 효율과 보안을 최우선으로 생각했습니다."
  },
  {
    version: "12.1.0",
    date: "2026-03-01",
    title: "학교 및 기관 파견 레슨 관리 도입",
    isMajor: false,
    target: ["admin", "teacher"],
    tags: ["신규기능", "B2B확장"],
    features: [
      { target: ["admin"], text: "🏢 기관(B2B) 관리 메뉴 신설\n학교나 주민센터 외부 출강 수업을 별도로 관리하여 일반 회원과 명확히 구분됩니다." },
      { target: ["admin"], text: "🔔 계약 만료 자동 알림\n기관 계약 종료 30일 전부터 대시보드 알림을 통해 재계약 시점을 챙겨드립니다." }
    ],
    pmComment: "RYE-K가 기관 관리의 영역까지 넓혀갑니다."
  },
  {
    version: "11.0.0",
    date: "2026-02-10",
    title: "소통의 시작, 레슨노트 댓글 및 권한 체계 정립",
    isMajor: false,
    target: ["admin", "teacher", "member"],
    tags: ["소통기능", "기능개선"],
    features: [
      { target: ["admin", "teacher", "member"], text: "💬 레슨노트 쌍방향 소통\n레슨노트 댓글 기능으로 강사, 매니저, 회원 사이의 소통을 기록할 수 있습니다." }
    ],
    pmComment: "더 긴밀한 소통과 명확한 업무 분담이 가능해집니다."
  },
  {
    version: "10.0.0",
    date: "2026-01-05",
    title: "RYE-K 국악 교육 관리 시스템의 시작",
    isMajor: false,
    target: ["admin", "teacher", "member"],
    tags: ["신규기능", "안정화"],
    features: [
      { target: ["admin", "teacher", "member"], text: "🌱 RYE-K 첫 번째 정식 버전 런칭\n학생 관리, 출석, 수납 관리의 핵심 기능을 담아 국악 교육 현장에 첫발을 내디뎠습니다." }
    ],
    pmComment: "RYE-K의 대장정이 오늘부터 시작됩니다!"
  }
];

export const RELEASES = RELEASE_HISTORY;
export const LATEST_RELEASE = RELEASE_HISTORY[0];
export const CURRENT_VERSION = RELEASE_HISTORY[0].version;