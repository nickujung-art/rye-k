// src/constants/releases.js

export const RELEASE_HISTORY = [
  {
    version: "15.0.1",
    date: "2026-05-02",
    title: "안정성·보안 업그레이드 — v14.3 종합 패치",
    isMajor: false,
    target: ["admin", "teacher"],
    tags: ["버그수정", "보안", "UX개선"],
    features: [
      {
        target: ["admin", "teacher"],
        text: "🔧 포털 문의 잔존 코드 제거\n폐기된 '강사에게 문의하기' 기능의 남은 UI 코드를 완전히 정리했습니다. 기존 댓글 데이터는 그대로 보존됩니다."
      },
      {
        target: ["admin", "teacher"],
        text: "👥 다강사 회원 일관성 수정\n한 학생이 과목별로 다른 강사에게 배우는 경우, 스케줄·분석·강사 상세에서 모두 정확하게 표시됩니다."
      },
      {
        target: ["admin"],
        text: "🏢 기관 계약 만료 경고 배너\n기관 관리 화면 상단에 D-30 이내 및 만료된 계약을 경고 배너로 표시합니다."
      },
      {
        target: ["admin"],
        text: "💰 기관 청구 확정 분리\n수납 관리에서 🏢 기관 청구 확정 버튼이 추가되어 B2B 기관 수납을 별도 흐름으로 처리할 수 있습니다."
      },
      {
        target: ["admin"],
        text: "🔄 복원 안전성 강화\n회원 복원 시 회원코드 충돌을 자동으로 감지·해소하고, 기관 복원 시 이번 달 결제 시드를 자동으로 재생성합니다. 영구 삭제 시 고아 레코드 수를 활동 로그에 기록합니다."
      },
      {
        target: ["admin"],
        text: "💾 전체 데이터 백업 다운로드\n활동 기록 화면에서 13개 컬렉션 전체를 JSON 파일로 즉시 다운로드할 수 있습니다."
      },
      {
        target: ["admin", "teacher"],
        text: "🔒 보안 강화\nFirestore 규칙에서 휴지통·활동로그의 익명 쓰기를 차단했습니다. 로그인 5회 실패 시 5분간 잠금이 적용됩니다. 관리자는 Cloudflare Pages에 VITE_AUTH_SALT 환경변수를 설정하면 Firebase Auth 비밀번호가 더 안전한 방식으로 자동 업그레이드됩니다."
      }
    ],
    pmComment: "운영 중 발견된 잠재적 문제점들을 선제적으로 보완했습니다. DB 안전성을 최우선으로, 모든 변경은 기존 데이터와 완벽하게 호환됩니다."
  },
  {
    version: "15.0.0",
    date: "2026-05-01",
    title: "한눈에 파악, 손가락 하나로 처리 — RYE-K v15.0",
    isMajor: true,
    target: ["admin", "teacher", "member"],
    tags: ["신규기능", "UX개선", "성능개선", "포털강화"],
    features: [
      {
        target: ["admin", "teacher"],
        text: "📊 출석 히트맵 & 학습 진도 시각화\n회원 상세에서 지난 26주 출석 이력을 색상 그래프로 한눈에 확인하세요. 컨디션 흐름과 레슨노트 진도도 타임라인으로 한 번에 파악할 수 있습니다."
      },
      {
        target: ["admin"],
        text: "⚡ 원클릭 수납 처리 + 수납률 프로그레스 바\n미납 회원 옆 '✓ 입금' 버튼 하나로 즉시 납부 처리! 수납 목록 상단에는 이달 수납률 바가 표시되어 진행 상황을 직관적으로 확인할 수 있습니다."
      },
      {
        target: ["admin", "teacher"],
        text: "✓ 출석 전체 처리 버튼\n오늘 미체크 학생이 있으면 '전체 출석 처리' 버튼 하나로 일괄 완료! 강사 카드에는 오늘 수업 인원과 이달 레슨노트 미작성 수도 바로 표시됩니다."
      },
      {
        target: ["admin", "teacher"],
        text: "🔍 레슨노트 검색 & 미작성 현황\n레슨노트 화면에서 회원 이름으로 즉시 검색하고, 이달 출석 기록은 있지만 노트를 작성하지 않은 학생을 노란 카드로 한눈에 확인하세요."
      },
      {
        target: ["admin"],
        text: "🏷️ 회원 카드 수납 뱃지 & B2B 정산서 PDF\n재원 목록에서 이달 납부/미납 여부를 카드 뱃지로 바로 확인! B2B 기관 상세에서는 월별 정산서를 PDF로 즉시 출력할 수 있습니다."
      },
      {
        target: ["member"],
        text: "📱 포털 출석 히트맵 & 강사 문의하기\n내 포털에서 지난 6개월 출석 기록을 색상 그래프로 확인하고, 홈 화면에서 강사에게 직접 문의 메시지를 보낼 수 있습니다."
      }
    ],
    pmComment: "꼭 필요한 정보를 눈에 잘 띄게, 자주 쓰는 작업을 더 빠르게. 하루하루 현장에서 쌓인 피드백을 모아 만든 업데이트입니다. 앞으로도 함께 더 좋은 RYE-K를 만들어가요! 🎵"
  },
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