# UI 디자인 가이드: RYE-K K-Culture Center

## 디자인 원칙
1. **도구처럼** — 운영 대시보드. 장식보다 정보 밀도.
2. **Apple 스타일 근모노크롬** — 배경 무채색, 포인트 blue+red+gold 3색만.
3. **모바일 퍼스트** — 최소 터치 타겟 42px.
4. **고령 배려** — 텍스트 크기 토글(AA), 핵심 16px 이상.

## AI 슬롭 금지
`backdrop-filter:blur` · gradient-text · 글로우 애니메이션 · 보라/인디고 색상 · 균일한 rounded-2xl · 배경 gradient orb

## 색상 시스템

### 브랜드
| 변수 | 값 | 용도 |
|------|----|------|
| `--blue` | `#2B3A9F` | 프라이머리 액션, 활성 메뉴 |
| `--blue-dk` / `--blue-lt` / `--blue-md` | `#1E2B7A` / `#EEF1FF` / `#4A5BB8` | hover / 강조배경 / 다크아바타 |
| `--red` / `--red-dk` / `--red-lt` | `#E8281C` / `#C0201A` / `#FFF0EE` | 에러·결석·미납 |
| `--gold` / `--gold-dk` / `--gold-lt` | `#F5A800` / `#C88800` / `#FFF8E6` | 경고·보강·만료 |
| `--green` / `--green-lt` | `#1A7A40` / `#EDFAEF` | 출석·납부 |

### 중립 (라이트)
| 변수 | 값 |
|------|----|
| `--ink` / `--ink-60` / `--ink-30` / `--ink-10` | `#18181B` / `#52525B` / `#A1A1AA` / `#F4F4F5` |
| `--paper` / `--bg` / `--border` | `#FFFFFF` / `#F5F6FA` / `#E4E4E7` |

### 다크 오버라이드
`--paper:#1E1F28` · `--bg:#13141A` · `--border:#2D2E3A` · `--ink:#E8E8F0` · `--ink-60:#9090A8` · `--ink-30:#52526A` · `--ink-10:#24252F`

## 타이포그래피
- 헤딩: `Noto Serif KR` (400/500/700)
- 본문/UI: `Noto Sans KR` (300/400/500/600/700)

| 용도 | 스타일 |
|------|--------|
| 페이지 제목 | Noto Serif KR 20px 600 |
| 통계 숫자 | Noto Serif KR 28px 700 `var(--blue)` |
| 회원 이름 | Noto Serif KR 18px 600 |
| 본문 | 13-14px `var(--ink-60)` line-height:1.65 |
| 라벨 | 11px 600 `var(--ink-30)` letter-spacing:0.5px |

## 컴포넌트 CSS

```css
/* 카드 */
.card { background:var(--paper); box-shadow:0 1px 3px rgba(0,0,0,.06);
        border:1px solid var(--border); border-radius:12px; }

/* 버튼 */
.btn-primary { background:var(--blue); color:#fff; border-radius:8px; padding:10px 18px; font-size:13px; }
.btn-primary:hover { background:var(--blue-dk); }
.btn-secondary { background:var(--ink-10); color:var(--ink-60); }
.btn-danger { background:var(--red-lt); color:var(--red); }
.fab { position:fixed; bottom:calc(60px + safe-area-bottom + 16px); right:16px;
       width:52px; height:52px; border-radius:50%; background:var(--blue); }

/* 입력 */
.inp { padding:11px 14px; border:1.5px solid var(--border); border-radius:8px;
       font-size:14.5px; background:var(--bg); }
.inp:focus { border-color:var(--blue); background:var(--paper); }

/* 태그 */
.tag-minor { background:var(--blue-lt); color:var(--blue); }
.tag-adult { background:var(--green-lt); color:var(--green); }
.tag-inst  { background:var(--red-lt); color:var(--red); }
.tag-gold  { background:var(--gold-lt); color:var(--gold-dk); }
.tag-mgr   { background:#F3E8FF; color:#7C3AED; }

/* 모달: 모바일 하단 슬라이드업 / 데스크톱 중앙 페이드 */
.modal { border-radius:16px 16px 0 0; }
@media (min-width:768px) { .modal { max-width:600px; border-radius:16px; } }

/* 출석 버튼 */
.att-btn.present { background:var(--green-lt); border-color:var(--green); color:var(--green); }
.att-btn.absent  { background:var(--red-lt);   border-color:var(--red);   color:var(--red); }
.att-btn.late    { background:var(--gold-lt);  border-color:var(--gold);  color:var(--gold-dk); }
.att-btn.excused { background:var(--blue-lt);  border-color:var(--blue);  color:var(--blue); }
```

## 레이아웃

| | 모바일 (<768px) | 데스크톱 (≥768px) |
|---|---|---|
| 구조 | TopBar(52px) + BottomNav(60px+safe-area) | Sidebar(220px 고정) + 메인 |
| 패딩 | 16px | 28px 36px / max-width:960px |
| 카드 그리드 | 1열 | auto-fill minmax(300px,1fr) |
| 통계 그리드 | 2열 | 4열 |

간격: 카드 내부 16px · 카드 간 gap:10px · 섹션 간 margin-bottom:20px · 폼 필드 간 14px

## 아이콘 규칙
SVG 인라인, strokeWidth:2(일반)/2.5(강조). 크기: 22px(네비)/20px(닫기)/18px(본문)/16px(인라인).  
`IC` 객체(`src/constants.jsx`): home/users/check/wallet/building/note/schedule/bell/teacher/settings

## 애니메이션
- 모달 진입: `slideUp 0.25s ease`(모바일) / `fadeScale 0.2s ease`(데스크톱)
- 토스트: `toastIn 0.25s ease`
- 카드 탭: `transform:scale(0.99)` / FAB 탭: `scale(0.92)`
- 불필요한 애니메이션 금지

## 다크모드
`localStorage["rye-theme"]`: `"dark"` | `"light"` | (없으면 시스템 따르기)
```html
<!-- data-theme="dark" | "light" → 강제 / 속성 없음 → prefers-color-scheme -->
```
