---
phase: SHOP-01-instant-charge-shop
plan: "01"
subsystem: data-layer
tags: [firebase, firestore, state-management, realtime-listener]
dependency_graph:
  requires: []
  provides: [addInstantCharge, updateInstantCharge, instantCharges-state, shopItems-state, saveShopItems]
  affects: [src/firebase.js, src/App.jsx]
tech_stack:
  added: []
  patterns: [independent-collection-listener, appdata-key-pattern]
key_files:
  created: []
  modified:
    - src/firebase.js
    - src/App.jsx
decisions:
  - "rye-instant-charges는 독립 컬렉션(addDoc 자동 ID), rye-shop-items는 appData 패턴(KEYS 루프)"
  - "독립 컬렉션 리스너는 checkAllLoaded/received에 참여하지 않아 앱 초기 로딩을 블로킹하지 않음"
  - "Date.now() 타임스탬프 사용 (serverTimestamp 대신, 기존 코드 일관성 유지)"
metrics:
  duration: "~10분"
  completed: "2026-05-14"
  tasks_completed: 2
  files_changed: 2
---

# Phase SHOP-01 Plan 01: Firebase 즉시청구 데이터 레이어 기반 구축 Summary

Wave 2 UI 플랜(SHOP-01-03, SHOP-01-04)이 의존하는 Firebase CRUD 함수와 App state/리스너를 연결 완료.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | firebase.js에 독립 컬렉션 CRUD 함수 추가 | 56fa945 | src/firebase.js |
| 2 | App.jsx에 instantCharges/shopItems 상태, 리스너, saveShopItems 추가 | 058387a | src/App.jsx |

## What Was Built

### src/firebase.js
- `collection, addDoc, updateDoc` import 추가
- `addInstantCharge(data)`: `rye-instant-charges` 컬렉션에 addDoc으로 문서 생성 (자동 ID, createdAt: Date.now())
- `updateInstantCharge(id, data)`: id 기반 단건 수정 (updatedAt: Date.now())
- `collection` re-export (App.jsx setupListeners에서 직접 사용)

### src/App.jsx
- `collection` import 추가 (firebase.js re-export)
- `instantCharges / setInstantCharges` state 선언 (초기값 `[]`)
- `shopItems / setShopItems` state 선언 (초기값: 4개 기본 카테고리 + 빈 items)
- KEYS 배열에 `rye-shop-items` 항목 추가 (KEYS 루프 자동 처리)
- `setupListeners` 내 KEYS 루프 바깥에 `rye-instant-charges` 독립 onSnapshot 리스너 추가
- `saveShopItems` 함수 추가 (`sSet("rye-shop-items", u)` 호출)
- Dashboard에 `instantCharges={instantCharges}` prop 전달

## Deviations from Plan

None - 플랜 그대로 실행.

## Threat Flags

없음. rye-instant-charges 컬렉션 읽기(클라이언트 onSnapshot)와 rye-shop-items(PII 없는 상품 카탈로그)는 플랜 threat model에서 accept 처리됨.

## Self-Check: PASSED

- [x] src/firebase.js 수정됨 — addInstantCharge, updateInstantCharge, collection re-export 포함
- [x] src/App.jsx 수정됨 — 모든 6개 acceptance criteria 통과
- [x] 커밋 56fa945 존재 (Task 1)
- [x] 커밋 058387a 존재 (Task 2)
- [x] `npm run build` 오류 없이 통과 (✓ built in 2.64s)
