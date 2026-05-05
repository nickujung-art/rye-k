# UI 디자인 가이드: RYE-K K-Culture Center

## 디자인 원칙
1. **도구처럼 보여야 한다.** 마케팅 페이지가 아니라 매일 쓰는 운영 대시보드. 장식보다 정보 밀도.
2. **Apple 스타일 근모노크롬.** 배경은 무채색, 포인트는 blue + red + gold 3색만.
3. **모바일 퍼스트.** 강사가 수업 중 한 손으로 터치하는 상황을 기준으로 설계. 최소 터치 타겟 42px.
4. **고령 회원 배려.** 텍스트 크기 토글(AA 버튼) 지원. 핵심 정보는 16px 이상.

## AI 슬롭 안티패턴 — 하지 마라
| 금지 사항 | 이유 |
|-----------|------|
| `backdrop-filter: blur()` | glass morphism은 AI 템플릿의 가장 흔한 징후 |
| gradient-text (배경 그라데이션 텍스트) | AI가 만든 SaaS 랜딩의 1번 특징 |
| "Powered by AI" 배지 | 기능이 아니라 장식. 사용자에게 가치 없음 |
| box-shadow 글로우 애니메이션 | 네온 글로우 = AI 슬롭 |
| 보라/인디고 브랜드 색상 | "AI = 보라색" 클리셰 |
| 모든 카드에 동일한 rounded-2xl | 균일한 둥근 모서리는 템플릿 느낌 |
| 배경 gradient orb (blur-3xl 원형) | 모든 AI 랜딩 페이지에 있는 장식 |

## 색상 시스템 (CSS 변수)

### 브랜드 색상
| 변수 | 값 | 용도 |
|------|----|------|
| `--blue` | `#2B3A9F` | 프라이머리 액션, 활성 메뉴 |
| `--blue-dk` | `#1E2B7A` | hover 상태, 사이드바 배경 |
| `--blue-lt` | `#EEF1FF` | 강조 배경, 태그 배경 |
| `--blue-md` | `#4A5BB8` | 다크모드 아바타 색 |
| `--red` | `#E8281C` | 에러, 결석, 미납 |
| `--red-dk` | `#C0201A` | hover red |
| `--red-lt` | `#FFF0EE` | 에러 배경 |
| `--gold` | `#F5A800` | 경고, 보강, 계약 만료 임박 |
| `--gold-dk` | `#C88800` | hover gold |
| `--gold-lt` | `#FFF8E6` | 경고 배경 |
| `--green` | `#1A7A40` | 출석, 납부 완료 |
| `--green-lt` | `#EDFAEF` | 출석 배경 |

### 중립 색상 (라이트 모드)
| 변수 | 값 | 용도 |
|------|----|------|
| `--ink` | `#18181B` | 주 텍스트 |
| `--ink-60` | `#52525B` | 본문 텍스트, 보조 정보 |
| `--ink-30` | `#A1A1AA` | placeholder, 비활성 |
| `--ink-10` | `#F4F4F5` | 보조 배경, hover |
| `--paper` | `#FFFFFF` | 카드 배경 |
| `--bg` | `#F5F6FA` | 페이지 배경 |
| `--border` | `#E4E4E7` | 구분선 |

### 다크 모드 오버라이드
| 변수 | 값 |
|------|----|
| `--paper` | `#1E1F28` |
| `--bg` | `#13141A` |
| `--border` | `#2D2E3A` |
| `--ink` | `#E8E8F0` |
| `--ink-60` | `#9090A8` |
| `--ink-30` | `#52526A` |
| `--ink-10` | `#24252F` |

## 타이포그래피

### 폰트
- **헤딩·브랜드**: `Noto Serif KR` (400/500/700)
- **본문·UI**: `Noto Sans KR` (300/400/500/600/700)
- 폴백: `system-ui, sans-serif`

### 크기 체계
| 용도 | 스타일 |
|------|--------|
| 페이지 제목 (.ph h1) | `font-family: Noto Serif KR; font-size: 20px; font-weight: 600` |
| 카드 제목 (.dash-card-title) | `font-family: Noto Serif KR; font-size: 14px; font-weight: 500` |
| 회원 이름 (.det-name) | `font-family: Noto Serif KR; font-size: 18px; font-weight: 600` |
| 통계 숫자 (.stat-num) | `font-family: Noto Serif KR; font-size: 28px; font-weight: 700; color: var(--blue)` |
| 본문 | `font-size: 13-14px; color: var(--ink-60); line-height: 1.65` |
| 라벨 | `font-size: 11px; font-weight: 600; color: var(--ink-30); letter-spacing: 0.5px` |
| 배지/태그 | `font-size: 11px; font-weight: 500` |

## 컴포넌트 스타일

### 카드
```css
.card {
  background: var(--paper);
  box-shadow: 0 1px 3px rgba(0,0,0,.06);
  border: 1px solid var(--border);
  border-radius: 12px;
}
```

### 버튼
```css
/* Primary */
.btn-primary { background: var(--blue); color: #fff; border-radius: 8px; padding: 10px 18px; font-size: 13px; }
.btn-primary:hover { background: var(--blue-dk); }

/* Secondary */
.btn-secondary { background: var(--ink-10); color: var(--ink-60); }

/* Ghost */
.btn-ghost { background: transparent; color: var(--ink-30); }

/* Danger */
.btn-danger { background: var(--red-lt); color: var(--red); }

/* FAB (모바일 플로팅) */
.fab { position: fixed; bottom: calc(60px + safe-area-bottom + 16px); right: 16px;
       width: 52px; height: 52px; border-radius: 50%; background: var(--blue); }
```

### 입력 필드
```css
.inp {
  padding: 11px 14px;
  border: 1.5px solid var(--border);
  border-radius: 8px;
  font-size: 14.5px;
  background: var(--bg);
}
.inp:focus { border-color: var(--blue); background: var(--paper); }
```

### 태그/배지
```css
.tag-minor  { background: var(--blue-lt);  color: var(--blue); }   /* 미성년 */
.tag-adult  { background: var(--green-lt); color: var(--green); }   /* 성인 */
.tag-inst   { background: var(--red-lt);   color: var(--red); }     /* 기관 */
.tag-gold   { background: var(--gold-lt);  color: var(--gold-dk); } /* 경고 */
.tag-mgr    { background: #F3E8FF;         color: #7C3AED; }        /* 매니저 */
```

### 모달
```css
/* 모바일: 하단 슬라이드업 (max-height: 95dvh) */
/* 데스크톱(768px+): 중앙 페이드 스케일 (max-width: 600px) */
.modal { border-radius: 16px 16px 0 0; }
@media (min-width: 768px) {
  .modal { max-width: 600px; border-radius: 16px; }
}
```

### 출석 버튼
```css
.att-btn.present  { background: var(--green-lt); border-color: var(--green);  color: var(--green); }
.att-btn.absent   { background: var(--red-lt);   border-color: var(--red);    color: var(--red); }
.att-btn.late     { background: var(--gold-lt);  border-color: var(--gold);   color: var(--gold-dk); }
.att-btn.excused  { background: var(--blue-lt);  border-color: var(--blue);   color: var(--blue); }
```

## 레이아웃

### 모바일 (< 768px)
- 상단 TopBar (52px) + 하단 BottomNav (60px + safe-area-bottom)
- 메인 콘텐츠: `padding: 16px`
- 카드 그리드: 1열 (`grid-template-columns: 1fr`)
- 통계 그리드: 2열 (`repeat(2, 1fr)`)

### 데스크톱 (≥ 768px)
- 좌측 Sidebar (220px, 고정) + 오른쪽 메인
- 메인 콘텐츠: `padding: 28px 36px; max-width: 960px`
- 카드 그리드: `auto-fill, minmax(300px, 1fr)`
- 통계 그리드: 4열 (`repeat(4, 1fr)`)

### 간격 규칙
- 카드 내부: `padding: 16px`
- 카드 간격: `gap: 10px`
- 섹션 간: `margin-bottom: 20px`
- 폼 필드 간: `margin-bottom: 14px`

## 네비게이션 아이콘 (IC 상수)
모두 `src/constants.jsx`의 `IC` 객체에 SVG inline 형태로 정의됨.

| 아이콘 | 키 | 용도 |
|--------|-----|------|
| 홈 | `IC.home` | 대시보드 |
| 사람들 | `IC.users` | 회원 |
| 체크 | `IC.check` | 출석 |
| 지갑 | `IC.wallet` | 수납 |
| 건물 | `IC.building` | 기관 |
| 노트 | `IC.note` | 레슨노트 |
| 캘린더 | `IC.schedule` | 스케줄 |
| 벨 | `IC.bell` | 공지 |
| 강사 | `IC.teacher` | 강사 관리 |
| 설정 | `IC.settings` | 관리자 도구 |

## 애니메이션
- 모달 진입: `slideUp 0.25s ease` (모바일) / `fadeScale 0.2s ease` (데스크톱)
- 토스트: `toastIn 0.25s ease` (위에서 슬라이드)
- 로딩 로고: `logoBreath 1.8s ease-in-out infinite`
- 카드 탭: `transform: scale(0.99)` (active 상태)
- FAB 탭: `transform: scale(0.92)` (active 상태)
- 그 외 불필요한 애니메이션 금지

## 아이콘 규칙
- SVG 인라인, `strokeWidth: 2` (일반) / `2.5` (강조)
- 크기: 22px (네비), 20px (모달 닫기), 18px (본문), 16px (인라인), 14px (작은 배지)
- 아이콘 컨테이너(둥근 배경 박스)로 감싸지 않는다

## 다크모드 토글
```html
<!-- data-theme="dark" | "light" → 강제 설정 -->
<!-- 속성 없음 → prefers-color-scheme 자동 감지 -->
```
`localStorage["rye-theme"]`: `"dark"` | `"light"` | (없으면 시스템 따르기)
