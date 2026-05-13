---
phase: SHOP-01-instant-charge-shop
plan: "02"
subsystem: admin-ui
tags: [shop, admin-tools, nav, css, react-component]
dependency_graph:
  requires: [SHOP-01-01]
  provides: [ShopView, shop-nav, shop-css]
  affects: [src/constants.jsx, src/components/admin/AdminTools.jsx, src/App.jsx, src/components/layout/NavLayout.jsx]
tech_stack:
  added: []
  patterns: [CategoriesView-pattern, per-category-inline-add, dirty-flag-save]
key_files:
  created: []
  modified:
    - src/constants.jsx
    - src/components/admin/AdminTools.jsx
    - src/App.jsx
    - src/components/layout/NavLayout.jsx
decisions:
  - "ShopView는 AdminTools.jsx 파일 끝에 추가 (AiSettingsView 이전 위치 — TrashView 앞)"
  - "상품 삭제는 window.confirm 없이 즉시 처리 — dirty 플래그로 저장 전까지 되돌리기 가능"
  - "카테고리별 인라인 추가 폼 사용 — 입력 포커스 시 해당 카테고리로 newItem.category 설정"
metrics:
  duration: "~15분"
  completed: "2026-05-14"
  tasks_completed: 3
  files_changed: 4
---

# Phase SHOP-01 Plan 02: 상품관리 UI (ShopView) + 네비게이션 연결 Summary

AdminTools에 ShopView 컴포넌트 구현 및 App.jsx 라우팅·NavLayout 네비게이션 연결 완료. 관리자가 즉시청구에서 사용할 상품 카탈로그를 카테고리별로 관리하는 UI 제공.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | constants.jsx에 shop CSS 추가 | 6649486 | src/constants.jsx |
| 2 | ShopView 컴포넌트 구현 + App.jsx 라우팅 연결 | b611096 | src/components/admin/AdminTools.jsx, src/App.jsx |
| 3 | NavLayout.jsx에 shop 네비게이션 항목 추가 | dc05bf1 | src/components/layout/NavLayout.jsx |

## What Was Built

### src/constants.jsx
- shop 관련 CSS 6개 클래스 추가: `.shop-chips`, `.shop-chip`, `.shop-chip.active`, `.shop-item-grid`, `.shop-item-card`, `.shop-item-card.selected`
- 외부 CSS 파일 미생성 — constants.jsx 인라인 CSS 패턴 유지

### src/components/admin/AdminTools.jsx
- `export function ShopView({ shopItems, onSave })` 추가 (파일 끝, TrashView 앞)
- 상태: `shopCats` (카테고리 배열), `items` (상품 배열), `newCat`, `newItem`, `dirty`, `savedFlash`, `errMsg`
- 기본 카테고리 4개 초기값: 의상/공연복, 악세사리, 악기 가방, 기타
- 카테고리 추가/삭제 (카테고리 삭제 시 해당 상품도 함께 제거)
- 상품 추가 (카테고리별 인라인 폼): 상품명, 기본가격, id는 `item_${Date.now()}_${random}` 생성
- 상품 활성화 토글 (active/inactive), 상품 삭제
- dirty 플래그 기반 저장 버튼 표시, 저장 후 "저장됨 ✓" 플래시

### src/App.jsx
- AdminTools import에 `ShopView` 추가
- `topTitle` 맵에 `shop: "상품 관리"` 항목 추가
- `view === "shop" && user.role === "admin"` 렌더 블록 추가 (aiSettings 다음)
- `saveShopItems(u)` 호출 + `addLog("상품 카탈로그 수정")` 로그

### src/components/layout/NavLayout.jsx
- Sidebar nav 배열: aiSettings 다음에 `{ id: "shop", label: "상품 관리", icon: "🛍" }` (admin only)
- MoreMenu items 배열: aiSettings 다음에 `{ id: "shop", label: "상품 관리", desc: "즉시청구 상품 카탈로그", icon: "🛍" }` (admin only)
- BottomNav more-active 배열에 `"shop"` 추가

## Deviations from Plan

None — 플랜 그대로 실행.

## Threat Flags

없음. ShopView는 `user.role === "admin"` 조건으로 렌더 제한됨 (T-SHOP02-01 mitigate 적용).

## Known Stubs

없음. ShopView는 SHOP-01-01에서 구축한 `shopItems` state와 `saveShopItems` 함수에 직접 연결되어 실제 Firestore 저장이 동작함.

## Self-Check: PASSED

- [x] src/constants.jsx 수정 — shop CSS 6개 클래스 포함 (grep 1 확인)
- [x] src/components/admin/AdminTools.jsx 수정 — `export function ShopView` 1개 확인
- [x] src/App.jsx 수정 — ShopView import(2회), topTitle shop 항목, view === 'shop' 렌더 블록
- [x] src/components/layout/NavLayout.jsx 수정 — id: 'shop' 2개(Sidebar+MoreMenu), shop 총 3회
- [x] 커밋 6649486 (Task 1), b611096 (Task 2), dc05bf1 (Task 3) 존재
- [x] `npm run build` 오류 없이 통과 (✓ built in 2.67s)
